EC.receiveLesson({
  id: "13.6",

  lede: "Barge-in is the ability to interrupt the agent mid-sentence, and it is non-negotiable \u2014 on a phone line it is the difference between a product and a recording. It is also almost always filed as an audio problem and budgeted in milliseconds: detect speech, stop synthesis, fade out, flush the buffer, **160 ms against a limit of about 200**. That half is plumbing and genuinely easy. The half that corrupts conversations is one line of state management \u2014 **truncate the assistant turn to the words that were actually played** \u2014 and it is invisible in every latency metric you have. Without it the model believes it said things the user never heard, and over a ten-turn call that was 17.5% of everything it thinks it has said. A call can pass the barge-in budget perfectly and still go wrong.",

  objectives: [
    "List the four stages of stopping and their millisecond budget",
    "Explain why flushing the playout buffer is separate from stopping synthesis",
    "State why conversation history must be truncated to what was played",
    "Distinguish a backchannel from a real interruption",
    "Explain why acoustic echo cancellation is a precondition for all of it"
  ],

  prerequisites: ["13.5"],

  blocks: [

    { t: "h2", n: "01", id: "aec", text: "First, echo cancellation",
      sub: "The bug every first prototype has" },

    { t: "p", text: "Before any of the rest works, the agent must not hear itself. If the microphone picks up the speaker output \u2014 which it does, on a laptop, a phone handset, a speakerphone and a car \u2014 then the voice activity detector sees speech the entire time the agent is talking, and barge-in fires immediately and continuously. The agent interrupts itself, stops, hears the tail of its own audio in the buffer, interrupts again, and the call collapses into stuttering." },

    { t: "callout", kind: "warn", title: "The symptom is unmistakable once you have seen it",
      body: [
        { t: "p", text: "The agent speaks two or three words, cuts out, starts again, cuts out. Nobody is talking to it. On headphones everything works perfectly, which is why it survives development and dies in the first real demo \u2014 the developer wore headphones and the demo room did not." },
        { t: "p", text: "Acoustic echo cancellation solves it by subtracting a filtered copy of the known output signal from the microphone input. You do not implement this yourself; it lives in WebRTC, in the telephony stack, in the OS audio layer and in the device firmware. What you must do is make sure it is **enabled and correctly fed the reference signal**, which is the part that gets missed when audio is routed through a custom pipeline." }
      ] },

    { t: "h2", n: "02", id: "budget", text: "How fast must it stop?",
      sub: "Four stages, 160 milliseconds" },

    { t: "p", text: "Once the agent can hear the user over itself, the question is latency again. The user starts speaking; how long until the agent is silent? Past roughly 200 ms the user concludes they were not heard and repeats themselves, which restarts the whole cycle." },

    { t: "code", lang: "python", title: "The barge-in budget",
      code: 'BARGE = [("VAD detects speech",        30, "first frame of voiced audio above threshold"),\n         ("stop the TTS stream",       20, "cancel the synthesis request"),\n         ("fade out the audio",        50, "a hard cut is heard as a glitch"),\n         ("flush the playout buffer",  60, "audio already queued must be discarded")]\n\nfor n, ms, why in BARGE:\n    print("   %-28s %4d ms   %s" % (n, ms, why))\nprint("   %-28s %4d ms" % ("TOTAL", sum(ms for _n, ms, _w in BARGE)))',
      out: '   VAD detects speech             30 ms   first frame of voiced audio above threshold\n   stop the TTS stream            20 ms   cancel the synthesis request\n   fade out the audio             50 ms   a hard cut is heard as a glitch\n   flush the playout buffer       60 ms   audio already queued must be discarded\n   TOTAL                         160 ms',
      caption: "160 ms against a ~200 ms limit. 40 ms of margin, which a deep jitter buffer destroys." },

    { t: "p", text: "Two rows are routinely forgotten and each produces a distinct, recognisable bug." },

    { t: "dl", items: [
      { k: "The fade (50 ms)", v: "Cutting audio to zero on a sample boundary produces a click, because the waveform jumps discontinuously. Users read the click as a technical fault rather than as the agent yielding. A 50 ms ramp costs 50 ms and sounds like a person stopping politely." },
      { k: "The flush (60 ms)", v: "This is the one that catches people. If you stop the synthesis request but leave the playout buffer alone, the audio already queued keeps playing \u2014 so the user hears the agent carry on for 60 ms or more after interrupting, which reads exactly like being ignored. You must discard queued audio, not merely stop producing more." }
    ] },

    { t: "callout", kind: "tradeoff", title: "The jitter buffer appears on both sides of the ledger",
      body: [
        { t: "p", text: "13.3 listed shrinking the playout buffer as a 30 ms latency win with a robustness cost. Here it shows up again, and worse: the buffer depth is a direct term in the barge-in budget, because everything in it has to be thrown away. A 200 ms buffer \u2014 which is a perfectly reasonable choice for audio quality on a bad network \u2014 makes the 200 ms barge-in limit unreachable by construction." },
        { t: "p", text: "So the jitter buffer is not a free insurance policy. It costs latency on the way out, latency on the interrupt, and it is the one parameter in the pipeline that trades directly against interactivity. On a wired connection, keep it small." }
      ] },

    { t: "viz", title: "What happens when the user cuts in",
      caption: "The audio half is 160 ms of plumbing. The history half is where conversations break.",
      svg: '<svg viewBox="0 0 760 330" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Barge-in sequence showing audio stop and history truncation">' +
        '<text x="12" y="18" class="s-label">AGENT SPEAKING</text>' +
        '<rect x="12" y="26" width="300" height="30" rx="3" fill="var(--violet)" opacity="0.22" stroke="var(--violet)"/>' +
        '<text x="162" y="46" class="s-sub" text-anchor="middle">\u201cYour balance is four hundred and twelve</text>' +
        '<rect x="312" y="26" width="300" height="30" rx="3" fill="var(--line)" opacity="0.12" stroke="var(--line)" stroke-dasharray="3 3"/>' +
        '<text x="462" y="46" class="s-sub" text-anchor="middle">dollars and sixty cents, and your next\u2026\u201d</text>' +
        '<line x1="312" y1="18" x2="312" y2="70" stroke="var(--crit)" stroke-width="2"/>' +
        '<text x="318" y="68" class="s-mono" fill="var(--crit)">user starts talking</text>' +
        '<text x="470" y="68" class="s-mono s-sub">generated, never played</text>' +
        '<text x="12" y="104" class="s-label">THE 160 ms OF PLUMBING</text>' +
        '<rect x="312" y="112" width="30" height="20" fill="var(--warn)" opacity="0.35" stroke="var(--warn)"/>' +
        '<rect x="342" y="112" width="20" height="20" fill="var(--warn)" opacity="0.25" stroke="var(--warn)"/>' +
        '<rect x="362" y="112" width="50" height="20" fill="var(--good)" opacity="0.3" stroke="var(--good)"/>' +
        '<rect x="412" y="112" width="60" height="20" fill="var(--accent)" opacity="0.3" stroke="var(--accent)"/>' +
        '<text x="327" y="148" class="s-mono s-sub" text-anchor="middle">30</text>' +
        '<text x="352" y="148" class="s-mono s-sub" text-anchor="middle">20</text>' +
        '<text x="387" y="148" class="s-mono s-sub" text-anchor="middle">50</text>' +
        '<text x="442" y="148" class="s-mono s-sub" text-anchor="middle">60</text>' +
        '<text x="480" y="126" class="s-sub">VAD, cancel TTS, fade, flush = 160 ms</text>' +
        '<line x1="12" y1="166" x2="748" y2="166" class="s-stroke" opacity="0.4"/>' +
        '<text x="12" y="192" class="s-label">THE ONE LINE THAT MATTERS MORE</text>' +
        '<rect x="12" y="202" width="356" height="56" rx="4" fill="var(--crit)" opacity="0.1" stroke="var(--crit)"/>' +
        '<text x="22" y="220" class="s-mono" fill="var(--crit)">BROKEN  history[-1] = full generated text</text>' +
        '<text x="22" y="238" class="s-sub">next turn: \u201cas I already mentioned, the 14th\u201d</text>' +
        '<text x="22" y="252" class="s-sub">\u2014 referring to words nobody heard</text>' +
        '<rect x="392" y="202" width="356" height="56" rx="4" fill="var(--good)" opacity="0.1" stroke="var(--good)"/>' +
        '<text x="402" y="220" class="s-mono" fill="var(--good)">CORRECT history[-1] = words actually played</text>' +
        '<text x="402" y="238" class="s-sub">next turn: \u201cthe 14th of March\u201d</text>' +
        '<text x="402" y="252" class="s-sub">\u2014 the model and the user agree</text>' +
        '<text x="12" y="286" class="s-sub">over a 10-turn call with 3 interruptions, the broken version accumulates 42 words</text>' +
        '<text x="12" y="304" class="s-sub">of shared context that does not exist \u2014 17.5% of everything the agent believes it</text>' +
        '<text x="12" y="322" class="s-sub">has said, and not visible in any latency metric</text>' +
        '</svg>' },

    { t: "h2", n: "03", id: "four", text: "The four things barge-in requires",
      sub: "Only the first two are about audio" },

    { t: "ol", items: [
      "**Cancel the generation.** The model is probably still streaming tokens for a response that is no longer wanted. Cancel it \u2014 both to stop paying for the tokens and because a late-arriving chunk hitting the synthesiser after the interrupt produces a baffling fragment of audio.",
      "**Stop the audio and flush the buffer.** Cancel synthesis, fade over 50 ms, discard everything queued. Stopping production without discarding the queue is the single most common implementation bug here.",
      "**Truncate the conversation history to what was actually spoken.** The assistant turn in the history must contain the words that reached the user's ear, not the words that were generated. This is the one that corrupts conversations, and it is the subject of the exercise.",
      "**Distinguish a backchannel from an interruption.** \u201cmm-hm\u201d, \u201cright\u201d, \u201cokay\u201d and \u201cyeah\u201d are the listener signalling attention, not a request to stop. An agent that halts on every \u201cmm-hm\u201d cannot deliver a sentence to an engaged listener."
    ] },

    { t: "callout", kind: "insight", title: "Why the history bug is so hard to see",
      body: [
        { t: "p", text: "The model is not hallucinating when it says \u201cas I already mentioned\u201d. It is reading its own transcript correctly \u2014 the transcript genuinely contains that sentence, because the transcript records what was **generated**. The user's experience is of what was **played**. After an interruption those two diverge, and nothing in the system notices." },
        { t: "p", text: "That is what makes it a state-management bug rather than a model-quality bug, and why no amount of prompting fixes it. It also means the failure is attributed wrongly in almost every bug report: it looks like the model being arrogant or confused, and it is one line of missing truncation." }
      ] },

    { t: "h2", n: "04", id: "backchannel", text: "Backchannels",
      sub: "Not everything the user says is a request to stop" },

    { t: "p", text: "Human listeners make noise. \u201cmm-hm\u201d, \u201cuh-huh\u201d, \u201cright\u201d, \u201cokay\u201d, \u201csure\u201d, a short laugh \u2014 these are continuers, and the speaker is meant to keep going. An agent that treats every voiced frame as an interruption becomes impossible to listen to, because the more engaged the user is, the more often they stop it." },

    { t: "ladder", title: "Telling a backchannel from an interruption",
      rungs: [
        { level: "bad", label: "Any speech stops the agent",
          why: "The naive implementation. It is correct for genuine interruptions and catastrophic for engaged listeners, who are punished for signalling attention. Also fires on coughs, door noise and a second person in the room.",
          code: "if vad.is_speech(frame):\n    stop_everything()",
          note: "The agent becomes unusable in direct proportion to how interested the user is." },
        { level: "ok", label: "Require a minimum duration",
          why: "Wait 150 to 300 ms of continuous speech before treating it as an interruption. Most backchannels are shorter than that, so this filters the majority of them for almost no code. The cost is that it adds directly to the 160 ms budget.",
          code: "if vad.speech_duration_ms() > 200:\n    stop_everything()",
          note: "Cheap and effective. But 200 ms of duration gate plus 160 ms of stopping is 360 ms, over the limit." },
        { level: "ok", label: "Duration plus energy",
          why: "A real interruption is usually louder and more sustained than a continuer. Combining a short duration gate with an energy threshold catches more backchannels without spending as much time waiting.",
          code: "if dur > 120 and rms > 1.8 * backchannel_rms:\n    stop_everything()",
          note: "Better margin, and it still misclassifies an emphatic \u201cright!\u201d from an agreeing listener." },
        { level: "best", label: "Classify the partial transcript, and keep listening either way",
          why: "Run the first partial transcript against a small backchannel list. If it is a continuer, keep speaking and log it. If it is anything else, stop. Crucially, keep the recognised audio either way \u2014 so if the classification was wrong, the user's words are already captured and the turn is not lost.",
          code: "partial = asr.partial()\nif partial.strip().lower() in BACKCHANNELS:\n    note_engagement()        # keep talking\nelse:\n    stop_everything()\nbuffer_user_audio(frame)      # ALWAYS",
          note: "The last line is the real insight: make the failure recoverable rather than trying to make the decision perfect." }
      ] },

    { t: "exercise", kind: "analysis", title: "Budget the stop, then find the bug the budget hides",
      difficulty: "advanced", minutes: 26,
      body: "Build the four-stage barge-in budget and check it against the ~200 ms limit. Then simulate the history bug: an agent is interrupted part-way through a sentence, and you compare storing the full generated text against storing only what was played. Show what the agent says on the next turn in each case, and quantify how much phantom shared context accumulates over a ten-turn call.",
      requirements: [
        "Report the four barge-in stages, the total, and the remaining margin against 200 ms",
        "Explain what the user hears if the playout buffer is not flushed",
        "Take a generated sentence, cut it at a word boundary, and show spoken against unspoken",
        "Show the next-turn behaviour under both history policies",
        "Over a 10-turn call with 3 interruptions, compute cumulative unheard words as a percentage"
      ],
      hint: "The next-turn divergence is easiest to show with a concrete follow-up question whose answer sits in the unspoken part of the previous response.",
      solution: { lang: "python", title: "x1306.py \u2014 160 ms of plumbing, and the real bug",
        code: 'BARGE = [("VAD detects speech",        30, "first frame of voiced audio above threshold"),\n         ("stop the TTS stream",       20, "cancel the synthesis request"),\n         ("fade out the audio",        50, "a hard cut is heard as a glitch"),\n         ("flush the playout buffer",  60, "audio already queued must be discarded")]\ntotal = sum(ms for _n, ms, _w in BARGE)\nprint("barge-in total %d ms, margin against 200 ms: %d ms" % (total, 200 - total))\n\nGENERATED = ("Your balance is four hundred and twelve dollars and sixty cents, "\n             "and your next payment of eighty dollars is due on the fourteenth "\n             "of March.")\nWORDS = GENERATED.split()\nCUT = 7\nspoken, unspoken = " ".join(WORDS[:CUT]), " ".join(WORDS[CUT:])\n\ndef next_turn(history_assistant):\n    """Does the agent believe it already gave the payment information?"""\n    return "payment" in history_assistant\n\nfor label, hist in (("BROKEN  - full generated text", GENERATED),\n                    ("CORRECT - truncate to played", spoken)):\n    if next_turn(hist):\n        said = "\\"As I already mentioned, the 14th\\"  <- never heard"\n    else:\n        said = "\\"The 14th of March.\\"  <- correct"\n    print("%-32s %s" % (label, said))\n\n# accumulation over a call\nINTERRUPTED = [False, True, False, False, True, False, False, False, True, False]\nWORDS_PER_TURN, HEARD = 24, 0.40\ncum = sum(int(WORDS_PER_TURN * (1 - HEARD)) for w in INTERRUPTED if w)\nprint("phantom context: %d of %d words (%.1f%%)"\n      % (cum, WORDS_PER_TURN * len(INTERRUPTED),\n         100.0 * cum / (WORDS_PER_TURN * len(INTERRUPTED))))',
        out: '============================================================================================\nPart 1: how fast must the agent shut up?\n============================================================================================\n   VAD detects speech             30 ms   first frame of voiced audio above threshold\n   stop the TTS stream            20 ms   cancel the synthesis request\n   fade out the audio             50 ms   a hard cut is heard as a glitch\n   flush the playout buffer       60 ms   audio already queued must be discarded\n   TOTAL                         160 ms\n\nabove roughly 200 ms the user concludes they were not heard and repeats\nthemselves, which starts the whole cycle again. 160 ms leaves 40 ms of margin.\n\nthe flush is the row people forget. if the jitter buffer holds 60 ms of audio\nand you only stop the SYNTHESIS, the user hears 60 ms of speech after\ninterrupting -- enough to sound like the agent ignored them.\n\n============================================================================================\nPart 2: the bug the budget hides -- history after an interruption\n============================================================================================\nthe agent generated 25 words:\n   Your balance is four hundred and twelve dollars and sixty cents, and your next payment of eighty dollars is due on the fourteenth of March.\n\nthe user interrupted after 7 words. so the user HEARD:\n   "Your balance is four hundred and twelve"\nand never heard:\n   "dollars and sixty cents, and your next payment of eighty dollars is due on the fourteenth of March."\n\nnext turn, the user asks: "and when is that due?"\n\n   history stored for the assistant turn      what the agent then says\n   BROKEN  - store the full generated text    "As I already mentioned, the 14th"  <- never heard\n   CORRECT - truncate to what was played      "The 14th of March."  <- correct\n\nthe broken version is worse than it looks, because the model is not wrong\nabout its own history -- it IS what the transcript says. the failure is that\nthe transcript records what was GENERATED and the user experienced what was\nPLAYED, and after an interruption those two differ.\n\n--------------------------------------------------------------------------------------------\nhow much divergence accumulates over a call\n--------------------------------------------------------------------------------------------\na 10-turn call in which 3 agent turns are interrupted (30%), each cut off\nafter about 40% of the response had played.\n\n   turn     interrupted?    words unheard cumulative unheard\n   1                  no                0                  0\n   2                 yes               14                 14\n   3                  no                0                 14\n   4                  no                0                 14\n   5                 yes               14                 28\n   6                  no                0                 28\n   7                  no                0                 28\n   8                  no                0                 28\n   9                 yes               14                 42\n   10                 no                0                 42\n\nover 10 turns the agent generated 240 words and the user heard 198.\nwithout truncation the history claims 42 words of shared context that do not\nexist -- 17.5% of everything the agent believes it has said.\n\nTHE POINT: barge-in is usually filed as an audio problem and budgeted in\nmilliseconds. the audio half is 160 ms of plumbing and genuinely easy. the half\nthat corrupts the conversation is one line of state management -- truncate the\nassistant turn to the words actually played -- and it is invisible in every\nlatency metric you have. a call can pass the barge-in SLO and still go wrong.',
        notes: [
          { t: "p", text: "**160 ms against a ~200 ms limit leaves 40 ms of margin**, which is thin. Note that two of the four stages \u2014 the 50 ms fade and the 60 ms flush \u2014 are the ones most often omitted, and omitting them is what produces the two recognisable bugs: a click that reads as a fault, and the agent apparently continuing to talk over the user." },
          { t: "p", text: "**The interruption lands mid-number**, which is the detail that makes the example realistic. The user heard \u201cfour hundred and twelve\u201d and never heard \u201cdollars and sixty cents\u201d, so they may well believe their balance is $412 rather than $412.60 \u2014 a comprehension failure created entirely by where the cut fell." },
          { t: "p", text: "**The broken history policy makes the agent refer to words nobody heard.** And it is not a hallucination: the transcript genuinely contains that sentence, because the transcript records what was *generated* while the user experienced what was *played*. After an interruption those diverge and nothing notices \u2014 which is why it reads in bug reports as the model being arrogant, and is actually one missing line of truncation." },
          { t: "p", text: "**Over a 10-turn call with 3 interruptions, 42 of 240 words were never heard \u2014 17.5% of everything the agent believes it has said.** That is the phantom shared context the model is reasoning over, and it grows with the interruption rate, so the better your barge-in detection the worse this bug gets." },
          { t: "p", text: "**The ordering lesson.** Barge-in is filed as an audio problem and budgeted in milliseconds, so the 160 ms gets measured, alerted on and reviewed. The history truncation appears in no metric at all, costs one line, and is the half that corrupts conversations. A call can pass the barge-in SLO perfectly and still go wrong." }
        ] } },

    { t: "callout", kind: "mental", title: "Mental model: generated versus played",
      body: [
        { t: "p", text: "Keep these as two separate quantities everywhere in the system, not one. The model generates words; the speaker plays words; after any interruption the second is a prefix of the first. Every place that currently assumes they are equal is a latent bug: the conversation history, the transcript you store for QA, the token count you bill against, and the evaluation set you build from recordings." },
        { t: "p", text: "13.13 makes this the signature attribute of a voice span \u2014 words generated against words actually played \u2014 precisely because it is the one thing a text pipeline never has to track and a voice pipeline cannot work without." }
      ] },

    { t: "callout", kind: "scenario", title: "Scenario: the stuttering demo",
      body: [
        { t: "p", text: "Your voice agent works flawlessly at your desk. In the demo room it speaks three words, stops, starts, stops, and becomes unusable within ten seconds. Nobody has said anything." },
        { t: "p", text: "This is acoustic echo cancellation, essentially always. At your desk you wore headphones, so the microphone never heard the output. On the demo room's speakerphone the microphone hears the agent, the voice activity detector sees continuous speech, and barge-in fires on the agent's own voice \u2014 then fires again on the audio still in the buffer, forever." },
        { t: "p", text: "The fix is not to write an echo canceller. It is to check that the one already present in WebRTC, the telephony stack or the OS audio layer is enabled and is being fed the reference signal \u2014 the known output \u2014 which is exactly what gets lost when audio is routed through a custom pipeline for recording or processing. Then test on a speakerphone before every demo, because headphones hide this completely and it is the most embarrassing failure in the module." }
      ] }
  ],

  takeaways: [
    "**Acoustic echo cancellation is a precondition**, not a refinement \u2014 without it the agent hears itself, barge-in fires on its own voice, and the call collapses into stuttering.",
    "**Headphones hide it completely**, which is why it survives development and dies on the first speakerphone demo.",
    "**The barge-in budget is 160 ms** \u2014 VAD 30, stop TTS 20, fade 50, flush 60 \u2014 against a limit of about 200 ms.",
    "**The 50 ms fade exists because a hard cut clicks**, and users read a click as a fault rather than as the agent yielding.",
    "**The 60 ms flush is the most-missed row**: stopping synthesis without discarding queued audio means the user hears the agent continue after interrupting.",
    "**The jitter buffer depth is a direct term in the barge-in budget**, so a 200 ms buffer makes the 200 ms limit unreachable by construction.",
    "**Barge-in needs four things** and only two are audio: cancel generation, stop and flush audio, truncate history, classify backchannels.",
    "**Truncate the assistant turn to the words actually played** \u2014 the transcript records what was generated and the user experienced what was played.",
    "**It is not a hallucination when the model says \u201cas I already mentioned\u201d** \u2014 it is reading its own history correctly, which is why prompting cannot fix it.",
    "**Over a 10-turn call with 3 interruptions, 17.5% of what the agent believes it said was never heard**, and the figure grows as barge-in detection improves.",
    "**Backchannels are not interruptions**: \u201cmm-hm\u201d and \u201cright\u201d are continuers, and an agent that stops for them punishes engaged listeners.",
    "**Always buffer the user's audio while deciding** \u2014 making the misclassification recoverable beats trying to make the classification perfect.",
    "**The audio half is measured and alerted on; the history half appears in no metric** \u2014 so a call can pass the barge-in SLO and still go wrong."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A voice agent speaks a few words, cuts out, restarts and cuts out again, with nobody speaking to it. What is the cause?",
        options: [
          "The endpointing threshold is set too low, so silence is detected mid-utterance",
          "The microphone is picking up the speaker output, so barge-in fires on the agent's own voice",
          "The playout buffer is too shallow for the network conditions",
          "The TTS stream is being cancelled by a timeout in the synthesis request"
        ],
        answer: 1,
        why: "Without acoustic echo cancellation the voice activity detector sees speech for as long as the agent is talking, so the interrupt fires on the agent's own output, then fires again on the audio still queued, indefinitely. It survives development because headphones prevent the microphone from hearing the output, and it appears on the first speakerphone. The fix is enabling the canceller already present in WebRTC, the telephony stack or the OS layer and feeding it the reference signal \u2014 not writing one." },

      { stem: "An implementation cancels the TTS request on interruption but the user still hears the agent for a moment. What is missing?",
        options: [
          "A longer fade-out ramp, since 50 ms is audible",
          "The playout buffer flush \u2014 audio already queued must be discarded, not just left to drain",
          "A faster VAD, since detection is taking too long",
          "Cancellation of the model's token stream, which is still feeding the synthesiser"
        ],
        answer: 1,
        why: "Stopping production is not the same as discarding the queue: whatever is already in the jitter buffer continues to play, so the user hears the agent carry on for the buffer's depth after interrupting, which reads exactly like being ignored. This is the most commonly omitted of the four stages, and it also explains why buffer depth is a direct term in the barge-in budget \u2014 a 200 ms buffer makes a 200 ms target unreachable." },

      { stem: "After an interruption, an agent says \u201cas I already mentioned, the 14th\u201d about information the user never heard. What is the defect?",
        options: [
          "The model is hallucinating prior context and needs a stronger system prompt",
          "The conversation history stored the generated text rather than the words actually played",
          "The ASR mis-transcribed the user's follow-up question",
          "The interruption was a backchannel that should not have stopped the response"
        ],
        answer: 1,
        why: "The model is reading its own transcript correctly \u2014 that sentence really is in the history, because the history recorded what was generated while the user experienced what was played. After an interruption those two diverge and nothing in the system notices, which makes it a state-management bug that no prompting can fix. Over a 10-turn call with 3 interruptions it accumulated 42 of 240 words, 17.5% of the agent's believed context." },

      { stem: "Why does a well-built barge-in implementation buffer the user's audio even while it is still deciding whether the speech was a backchannel?",
        options: [
          "To improve ASR accuracy by providing more acoustic context",
          "Because a misclassified continuer would otherwise lose the user's actual words and cost a turn",
          "To measure engagement for quality metrics",
          "Because the echo canceller requires a continuous input signal"
        ],
        answer: 1,
        why: "Distinguishing \u201cmm-hm\u201d from a real interruption is a judgement that will sometimes be wrong, and the asymmetry matters: if you classify a genuine interruption as a continuer and discarded the audio, the user has to say it all again. Buffering regardless makes the error recoverable, which is a better engineering posture than trying to make the classifier perfect \u2014 and it costs almost nothing." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Barge-in",
    questions: [
      { level: "advanced",
        q: "Walk me through implementing barge-in.",
        strong: "A strong answer covers echo cancellation, the four stages, and history truncation.",
        answer: [
          { t: "p", text: "I would start before barge-in itself, with acoustic echo cancellation, because nothing else works without it. If the microphone hears the speaker, the voice activity detector sees speech the whole time the agent is talking, so the interrupt fires on the agent's own voice and then on the audio still in the buffer, and the call turns into stuttering. I would not write a canceller \u2014 WebRTC, the telephony stack and the OS audio layer all have one. I would verify it is enabled and being fed the reference signal, which is what gets lost when audio is routed through a custom pipeline, and I would test on a speakerphone rather than headphones, because headphones hide the problem entirely." },
          { t: "p", text: "Then the stopping itself, which is four stages and about 160 milliseconds: 30 to detect voiced speech, 20 to cancel the synthesis request, 50 to fade the audio out, and 60 to flush the playout buffer. The limit is around 200 milliseconds, past which the user decides they were not heard and repeats themselves. The fade matters because cutting to zero on a sample boundary clicks, and users hear a click as a fault rather than as the agent yielding politely. The flush matters more, and it is the one people miss \u2014 cancelling synthesis stops production but does not empty the queue, so the agent keeps talking for the buffer depth after being interrupted." },
          { t: "p", text: "I would also cancel the model's generation, both to stop paying for tokens nobody will hear and because a late chunk arriving at the synthesiser after the interrupt produces a strange fragment of audio." },
          { t: "p", text: "But the thing I would actually flag as the highest risk is not in the audio path at all. The conversation history has to be truncated to the words that were played, not the words that were generated. Otherwise the model believes it said things the user never heard, and it will say \u2018as I already mentioned\u2019 about information that never arrived. When I modelled a ten-turn call with three interruptions, 17.5% of what the agent believed it had said had never been heard. That is one line of code, it appears in no metric, and it is the half of barge-in that corrupts conversations while the 160 milliseconds is the half that gets measured." }
        ] },

      { level: "core",
        q: "How do you stop the agent halting every time someone says \u201cmm-hm\u201d?",
        strong: "A strong answer separates the classification from the recovery.",
        answer: [
          { t: "p", text: "Backchannels \u2014 \u2018mm-hm\u2019, \u2018right\u2019, \u2018okay\u2019, \u2018sure\u2019, a short laugh \u2014 are continuers. The listener is signalling attention and expects you to keep going. An agent that stops for all of them gets less usable the more engaged the user is, which is a perverse incentive to build in." },
          { t: "p", text: "The cheapest filter is a minimum duration: require 150 to 300 milliseconds of continuous speech before treating it as an interruption, since most continuers are shorter. That catches the majority for almost no code. The cost is that it adds directly to the stopping budget, and a 200 millisecond duration gate on top of 160 milliseconds of stopping is 360, which is over the limit. So I would combine a shorter duration gate with an energy threshold, because a real interruption tends to be louder and more sustained than an acknowledgement." },
          { t: "p", text: "The better version uses the first partial transcript and checks it against a small list of continuers. That is more accurate than acoustics alone, and it is cheap because the recogniser is already running." },
          { t: "p", text: "The part I would emphasise is that none of these will be perfect, so I would design for the error rather than against it. Keep buffering the user's audio while deciding, always. If the classification was wrong and that \u2018right\u2019 was actually the start of a real interruption, the words are already captured and the turn is not lost. Making the failure recoverable is worth more than making the decision correct, and it is much less work." }
        ] },

      { level: "advanced",
        q: "Why is the playout buffer depth a design decision rather than a default?",
        strong: "A strong answer shows it appears three times in the system.",
        answer: [
          { t: "p", text: "Because it appears in three places and only one of them is obvious. It is insurance: audio is held briefly so a network hiccup produces a late packet rather than a gap mid-word, and on a poor mobile connection that insurance is worth having." },
          { t: "p", text: "First cost: it is a direct term in time to first audio. The 60 milliseconds in the budget is latency bought deliberately, and in the optimisation search shrinking it was a 30 millisecond win available for about a week of work." },
          { t: "p", text: "Second cost, and this is the one that surprises people: it is a direct term in the barge-in budget, because everything in the buffer has to be discarded when the user interrupts. So the deeper it is, the longer the agent keeps talking after being told to stop. A 200 millisecond buffer, which is a perfectly reasonable choice for audio quality, makes the 200 millisecond barge-in limit unreachable by construction \u2014 you cannot stop inside the time it takes to drain what you have already committed to." },
          { t: "p", text: "So it is the one parameter that trades directly against interactivity on both sides of the turn, and the right value depends on where your users are rather than on your code. On a wired desk phone or a good connection I would keep it small. On mobile or a bad network I would keep it deeper and accept that barge-in will be less crisp, and I would say so explicitly rather than discover it in a bug report. What I would not do is leave it at whatever the library ships with, which is how it usually gets set." }
        ] }
    ]
  }
});
