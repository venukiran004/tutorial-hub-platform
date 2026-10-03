EC.receiveLesson({
  id: "13.11",

  lede: "A voice turn moves through five states \u2014 listening, user speaking, thinking, speaking, interrupted \u2014 and the diagram of it appears in every design document. The diagram is not the useful artefact. Writing the machine down as a **table of transitions you can validate** finds three defects in the version everyone draws, and the most important one is not a missing state or an unreachable path: it is a **missing action on an edge**. The INTERRUPTED to LISTENING transition has to truncate the conversation history to what was actually played, and a drawing cannot show you that it does not. Replaying a realistic call through both machines, the buggy one loses history correctness silently at step 5 and then breaks four steps later on an event nobody considered.",

  objectives: [
    "Name the five states of a voice turn and the events that move between them",
    "Write the machine as a transition table rather than a diagram",
    "Validate reachability, dead ends, unhandled events and action invariants",
    "Identify the transition that must truncate conversation history",
    "Explain why the window between endpointing and the first token needs its own interrupt path"
  ],

  prerequisites: ["13.6", "13.5"],

  blocks: [

    { t: "h2", n: "01", id: "states", text: "The five states",
      sub: "And the events that move between them" },

    { t: "p", text: "A turn is not a function call, it is a small concurrent system: audio is arriving while audio is leaving, a model is generating, a tool may be running, and the user can speak at any moment. Making that explicit as a state machine is what stops the implementation becoming a nest of booleans that each handle one situation someone encountered in testing." },

    { t: "dl", items: [
      { k: "LISTENING", v: "Idle, microphone open, nothing in flight. The resting state between turns, and the only place it is safe to commit history." },
      { k: "USER_SPEAKING", v: "Voiced audio is arriving and partial transcripts are accumulating. Speculative prefill happens here. Further voice activity is a no-op, not an event." },
      { k: "THINKING", v: "The endpointer has committed; the transcript is being finalised and the model is prefilling and generating. No audio is leaving. This is the state people forget can be interrupted." },
      { k: "SPEAKING", v: "Audio is streaming out, clause by clause. Barge-in detection is live, and the count of words actually played is being tracked." },
      { k: "INTERRUPTED", v: "A transient cleanup state: cancel generation, stop synthesis, flush the buffer, truncate the history. It exists so the cleanup is a named step rather than something scattered through a handler." }
    ] },

    { t: "viz", title: "The turn, as a machine",
      caption: "The edge everyone forgets is the one back from INTERRUPTED, and what it must do on the way.",
      svg: '<svg viewBox="0 0 760 340" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="State machine for a voice turn">' +
        '<defs><marker id="a1311" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">' +
        '<path d="M0 0 L9 4.5 L0 9 z" fill="var(--line)"/></marker>' +
        '<marker id="c1311" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">' +
        '<path d="M0 0 L9 4.5 L0 9 z" fill="var(--crit)"/></marker></defs>' +
        '<rect x="20" y="30" width="130" height="46" rx="6" fill="var(--accent)" opacity="0.18" stroke="var(--accent)"/>' +
        '<text x="85" y="52" class="s-label" text-anchor="middle">LISTENING</text>' +
        '<text x="85" y="68" class="s-sub" text-anchor="middle">mic open, idle</text>' +
        '<rect x="215" y="30" width="130" height="46" rx="6" fill="var(--violet)" opacity="0.18" stroke="var(--violet)"/>' +
        '<text x="280" y="52" class="s-label" text-anchor="middle">USER SPEAKING</text>' +
        '<text x="280" y="68" class="s-sub" text-anchor="middle">partials, prefill</text>' +
        '<rect x="410" y="30" width="130" height="46" rx="6" fill="var(--warn)" opacity="0.18" stroke="var(--warn)"/>' +
        '<text x="475" y="52" class="s-label" text-anchor="middle">THINKING</text>' +
        '<text x="475" y="68" class="s-sub" text-anchor="middle">950 ms of silence</text>' +
        '<rect x="605" y="30" width="130" height="46" rx="6" fill="var(--good)" opacity="0.18" stroke="var(--good)"/>' +
        '<text x="670" y="52" class="s-label" text-anchor="middle">SPEAKING</text>' +
        '<text x="670" y="68" class="s-sub" text-anchor="middle">audio out</text>' +
        '<path d="M150 53 L211 53" class="s-stroke" marker-end="url(#a1311)"/>' +
        '<text x="180" y="46" class="s-mono s-sub" text-anchor="middle">speech</text>' +
        '<path d="M345 53 L406 53" class="s-stroke" marker-end="url(#a1311)"/>' +
        '<text x="375" y="46" class="s-mono s-sub" text-anchor="middle">endpoint</text>' +
        '<path d="M540 53 L601 53" class="s-stroke" marker-end="url(#a1311)"/>' +
        '<text x="570" y="46" class="s-mono s-sub" text-anchor="middle">1st tok</text>' +
        '<path d="M670 76 L670 110 L85 110 L85 80" class="s-stroke" fill="none" marker-end="url(#a1311)"/>' +
        '<text x="378" y="126" class="s-mono s-sub" text-anchor="middle">response_done \u2192 commit history</text>' +
        '<rect x="300" y="190" width="160" height="46" rx="6" fill="var(--crit)" opacity="0.2" stroke="var(--crit)"/>' +
        '<text x="380" y="212" class="s-label" text-anchor="middle">INTERRUPTED</text>' +
        '<text x="380" y="228" class="s-sub" text-anchor="middle">transient cleanup</text>' +
        '<path d="M660 80 L470 188" stroke="var(--crit)" fill="none" marker-end="url(#c1311)"/>' +
        '<text x="585" y="150" class="s-mono s-sub" text-anchor="middle" fill="var(--crit)">user_interrupts</text>' +
        '<path d="M470 80 L420 186" stroke="var(--crit)" fill="none" stroke-dasharray="4 3" marker-end="url(#c1311)"/>' +
        '<text x="400" y="150" class="s-mono s-sub" text-anchor="middle" fill="var(--crit)">user_interrupts</text>' +
        '<text x="400" y="166" class="s-mono s-sub" text-anchor="middle" fill="var(--crit)">(the one omitted)</text>' +
        '<path d="M300 208 L120 208 L105 80" stroke="var(--crit)" fill="none" marker-end="url(#c1311)"/>' +
        '<rect x="90" y="246" width="580" height="30" rx="4" fill="var(--crit)" opacity="0.12" stroke="var(--crit)"/>' +
        '<text x="380" y="266" class="s-mono" text-anchor="middle" fill="var(--crit)">cleanup_done \u2192 truncate_history_to_played</text>' +
        '<text x="12" y="300" class="s-sub">a diagram can show you a missing STATE or a missing EDGE. it cannot show you a</text>' +
        '<text x="12" y="318" class="s-sub">missing ACTION on an edge that exists \u2014 which is where the real bug lives</text>' +
        '<text x="12" y="336" class="s-sub">and why the machine belongs in a table you can run assertions over</text>' +
        '</svg>' },

    { t: "h2", n: "02", id: "table", text: "The machine as a table",
      sub: "Because a table can be checked and a drawing cannot" },

    { t: "p", text: "The point of writing transitions as data rather than as control flow is that you can then assert things about them. Four checks catch most of what goes wrong, and all four are a few lines each." },

    { t: "code", lang: "python", title: "Transitions as data, and four validators",
      code: 'STATES = ["LISTENING", "USER_SPEAKING", "THINKING", "SPEAKING", "INTERRUPTED"]\n\n# (state, event) -> (next_state, [actions])\nTABLE = {\n    ("LISTENING",     "speech_start"):    ("USER_SPEAKING", []),\n    ("USER_SPEAKING", "endpoint"):        ("THINKING",      ["finalise_asr"]),\n    ("USER_SPEAKING", "user_interrupts"): ("USER_SPEAKING", []),          # already talking\n    ("THINKING",      "first_token"):     ("SPEAKING",      ["start_tts"]),\n    ("THINKING",      "user_interrupts"): ("INTERRUPTED",   ["cancel_generation"]),\n    ("SPEAKING",      "response_done"):   ("LISTENING",     ["commit_history"]),\n    ("SPEAKING",      "user_interrupts"): ("INTERRUPTED",   ["stop_tts", "flush_buffer"]),\n    ("INTERRUPTED",   "cleanup_done"):    ("LISTENING",     ["truncate_history_to_played"]),\n}\n\ndef reachable(table):\n    seen, stack = set(["LISTENING"]), ["LISTENING"]\n    while stack:\n        s = stack.pop()\n        for (st, _ev), (nx, _a) in table.items():\n            if st == s and nx not in seen:\n                seen.add(nx); stack.append(nx)\n    return seen\n\ndef dead_ends(table):\n    has_exit = set(st for (st, _ev) in table)\n    return [s for s in STATES if s not in has_exit]\n\ndef history_safe(table):\n    """Every INTERRUPTED -> LISTENING edge must truncate the history."""\n    return [(st, ev) for (st, ev), (nx, acts) in table.items()\n            if st == "INTERRUPTED" and nx == "LISTENING"\n            and not any("truncate" in a for a in acts)]\n\ndef unhandled(table, plausible):\n    return [(s, ev) for s, evs in plausible.items() for ev in evs\n            if (s, ev) not in table]',
      hl: [11, 31, 32, 33, 34, 35],
      caption: "history_safe is the one that matters. It is an assertion about an action, not about a shape." },

    { t: "callout", kind: "insight", title: "A drawing cannot express the bug",
      body: [
        { t: "p", text: "This is the argument of the whole lesson. A diagram shows states and edges, so it can reveal a missing state or an edge that goes nowhere. The defect that actually breaks conversations is a **present edge missing an action** \u2014 INTERRUPTED returns to LISTENING, which is correct, and it fails to truncate the history on the way, which is not visible in any box-and-arrow picture." },
        { t: "p", text: "Writing the machine as a table makes that assertable in four lines. It turns 13.6's behavioural bug into a unit test." }
      ] },

    { t: "h2", n: "03", id: "defects", text: "Three defects in the usual version",
      sub: "What validation finds, and what each one costs" },

    { t: "ol", items: [
      "**INTERRUPTED to LISTENING with no truncation.** The headline bug from 13.6: the model keeps the words it generated but the user never heard, so it refers back to information that was never delivered. Over a ten-turn call with three interruptions that was 17.5% of everything the agent believed it had said \u2014 and here it appears as a missing action on an edge, which is a far easier thing to catch than a behaviour.",
      "**No interrupt path from THINKING.** The window between the endpointer committing and the first token arriving is 950 ms of the turn, and the user can absolutely speak in it \u2014 most often to correct themselves (\u201cno, sorry, the other account\u201d). An unhandled event there means the correction is swallowed and the agent confidently answers the superseded question.",
      "**No interrupt path from USER_SPEAKING.** This one looks harmless and is worth having explicitly, because \u201cthe user is already talking\u201d must be an intentional no-op rather than an event that falls through to a default which throws or silently resets the turn."
    ] },

    { t: "callout", kind: "trap", title: "The THINKING interrupt is the one that surprises people",
      body: [
        { t: "p", text: "It is easy to assume interruption only matters while the agent is speaking \u2014 that is what the word suggests. But 950 of the turn's 1,650 ms is spent in THINKING, and it is silent, which is exactly the condition that makes a user start talking. A caller who realises mid-pause that they gave the wrong account number will say so during THINKING, not during SPEAKING." },
        { t: "p", text: "The handling differs from the SPEAKING case: there is no audio to stop and no buffer to flush, but there **is** generation to cancel, and the cancelled turn's user message has to be superseded rather than appended \u2014 otherwise the history contains two questions and the model answers the first." }
      ] },

    { t: "h2", n: "04", id: "replay", text: "Replaying a call",
      sub: "The buggy machine does not crash where it goes wrong" },

    { t: "p", text: "The most instructive part of validating the table is replaying a realistic event sequence through both versions. The buggy machine handles the interruption without complaint, loses history correctness silently, and then breaks four steps later on an event nobody considered \u2014 so the crash and the defect are nowhere near each other." },

    { t: "exercise", kind: "build", title: "Validate the turn state machine",
      difficulty: "advanced", minutes: 26,
      body: "Write the voice turn as a transition table mapping (state, event) to (next state, actions). Build four validators: all states reachable, no dead ends, no unhandled plausible events, and the invariant that every path from INTERRUPTED back to LISTENING truncates the conversation history. Run them against the version everyone draws and a corrected one, then replay an event trace through both.",
      requirements: [
        "Five states and at least six events, as a dict keyed by (state, event)",
        "Reachability from LISTENING, and a dead-end check over all states",
        "An unhandled-event check against a list of events plausible in each state",
        "An invariant check that INTERRUPTED to LISTENING performs a history truncation",
        "Run all four against a buggy table and a fixed one and report pass or fail",
        "Replay a trace containing an interruption from SPEAKING and one from THINKING"
      ],
      hint: "The trace should interrupt from SPEAKING first (which the buggy table handles) and from THINKING later (which it does not). That ordering is what shows the crash and the defect are in different places.",
      solution: { lang: "python", title: "x1311.py \u2014 validate it, do not draw it",
        code: 'STATES = ["LISTENING", "USER_SPEAKING", "THINKING", "SPEAKING", "INTERRUPTED"]\n\nBUGGY = {\n    ("LISTENING",     "speech_start"):    ("USER_SPEAKING", []),\n    ("USER_SPEAKING", "endpoint"):        ("THINKING",      ["finalise_asr"]),\n    ("THINKING",      "first_token"):     ("SPEAKING",      ["start_tts"]),\n    ("SPEAKING",      "response_done"):   ("LISTENING",     ["commit_history"]),\n    ("SPEAKING",      "user_interrupts"): ("INTERRUPTED",   ["stop_tts", "flush_buffer"]),\n    ("INTERRUPTED",   "cleanup_done"):    ("LISTENING",     []),\n}\nFIXED = dict(BUGGY)\nFIXED[("INTERRUPTED", "cleanup_done")] = ("LISTENING", ["truncate_history_to_played"])\nFIXED[("THINKING", "user_interrupts")] = ("INTERRUPTED", ["cancel_generation"])\nFIXED[("USER_SPEAKING", "user_interrupts")] = ("USER_SPEAKING", [])\n\nPLAUSIBLE = {\n    "LISTENING":     ["speech_start"],\n    "USER_SPEAKING": ["endpoint", "user_interrupts"],\n    "THINKING":      ["first_token", "user_interrupts"],\n    "SPEAKING":      ["response_done", "user_interrupts"],\n    "INTERRUPTED":   ["cleanup_done"],\n}\n\ndef history_safe(table):\n    return [(st, ev) for (st, ev), (nx, acts) in table.items()\n            if st == "INTERRUPTED" and nx == "LISTENING"\n            and not any("truncate" in a for a in acts)]\n\ndef unhandled(table):\n    return [(s, ev) for s, evs in PLAUSIBLE.items() for ev in evs if (s, ev) not in table]\n\nTRACE = [("LISTENING", "speech_start"), ("USER_SPEAKING", "endpoint"),\n         ("THINKING", "first_token"), ("SPEAKING", "user_interrupts"),\n         ("INTERRUPTED", "cleanup_done"), ("LISTENING", "speech_start"),\n         ("USER_SPEAKING", "endpoint"), ("THINKING", "user_interrupts")]\n\nfor name, table in (("BUGGY", BUGGY), ("FIXED", FIXED)):\n    state, actions, ok = "LISTENING", [], True\n    for i, (_e, ev) in enumerate(TRACE, 1):\n        if (state, ev) not in table:\n            print("%s step %d: %s --%s--> UNHANDLED" % (name, i, state, ev))\n            ok = False\n            break\n        state, acts = table[(state, ev)]\n        actions += acts\n    print("%-6s completed %-4s  truncation performed %s"\n          % (name, "yes" if ok else "NO",\n             "yes" if any("truncate" in a for a in actions) else "NO"))',
        out: '==============================================================================================\nVALIDATING: the state machine everyone draws\n==============================================================================================\n   all states reachable                   ok\n   no dead-end states                     ok\n   no unhandled plausible events          FAIL user_interrupts on USER_SPEAKING, user_interrupts on THINKING\n   history truncated on interruption      FAIL INTERRUPTED --cleanup_done--> LISTENING\n\n==============================================================================================\nVALIDATING: the state machine that works\n==============================================================================================\n   all states reachable                   ok\n   no dead-end states                     ok\n   no unhandled plausible events          ok\n   history truncated on interruption      ok\n\n==============================================================================================\nWhat the three failures actually cost\n==============================================================================================\n1. INTERRUPTED -> LISTENING with no truncation. the headline bug: the model\n   keeps the words it generated but the user never heard, so it refers back to\n   information that was never delivered. this is 13.6\'s finding, and here it is\n   visible as a MISSING ACTION ON AN EDGE rather than as a behaviour -- which is\n   the argument for writing the machine down as a table you can check.\n\n2. no user_interrupts from THINKING. the window between the endpointer firing\n   and the first token is 950 ms of the turn, and the user can absolutely speak\n   in it -- most often to correct themselves. an unhandled event there means the\n   correction is swallowed and the agent answers the superseded question.\n\n3. no user_interrupts from USER_SPEAKING. harmless-looking and worth having\n   explicitly, because \'the user is already talking\' must be a no-op rather than\n   an unhandled event that throws or silently resets.\n\n==============================================================================================\nReplaying a call through both machines\n==============================================================================================\nBUGGY:\n   step 1  LISTENING      --speech_start    -> USER_SPEAKING  \n   step 2  USER_SPEAKING  --endpoint        -> THINKING       [finalise_asr]\n   step 3  THINKING       --first_token     -> SPEAKING       [start_tts]\n   step 4  SPEAKING       --user_interrupts -> INTERRUPTED    [stop_tts, flush_buffer]\n   step 5  INTERRUPTED    --cleanup_done    -> LISTENING      \n   step 6  LISTENING      --speech_start    -> USER_SPEAKING  \n   step 7  USER_SPEAKING  --endpoint        -> THINKING       [finalise_asr]\n   step 8  THINKING       --user_interrupts -> UNHANDLED EVENT, call breaks here\n   completed: NO\n   history truncation performed: NO\n\nFIXED:\n   step 1  LISTENING      --speech_start    -> USER_SPEAKING  \n   step 2  USER_SPEAKING  --endpoint        -> THINKING       [finalise_asr]\n   step 3  THINKING       --first_token     -> SPEAKING       [start_tts]\n   step 4  SPEAKING       --user_interrupts -> INTERRUPTED    [stop_tts, flush_buffer]\n   step 5  INTERRUPTED    --cleanup_done    -> LISTENING      [truncate_history_to_played]\n   step 6  LISTENING      --speech_start    -> USER_SPEAKING  \n   step 7  USER_SPEAKING  --endpoint        -> THINKING       [finalise_asr]\n   step 8  THINKING       --user_interrupts -> INTERRUPTED    [cancel_generation]\n   completed: yes\n   history truncation performed: yes\n\nthe buggy machine does not crash at the interruption -- it handles it, loses the\nhistory correctness silently, and then breaks four steps later on an event it\nnever considered. both failures are invisible in the drawing and obvious in the\ntable, which is the whole reason to keep the table.',
        notes: [
          { t: "p", text: "**All five states are reachable and there are no dead ends in either version**, which is exactly why a diagram passes review. Both of the checks a drawing can express are satisfied by the broken machine." },
          { t: "p", text: "**The history invariant is the one that fires**, and it is an assertion about an *action* rather than about a shape: INTERRUPTED returns to LISTENING, which is correct, without truncating the history, which is not. That turns 13.6's behavioural bug \u2014 the model referring to words nobody heard \u2014 into four lines of unit test." },
          { t: "p", text: "**The unhandled-event check finds the THINKING interrupt**, which is the defect I would least expect a reviewer to catch. 950 of the turn's 1,650 ms is spent in THINKING and it is silent, which is precisely the condition that makes a user speak \u2014 usually to correct themselves. Without that edge, the correction is swallowed and the agent answers the superseded question." },
          { t: "p", text: "**The replay shows the crash and the defect are in different places.** The buggy machine handles the step-4 interruption without complaint, loses history correctness silently at step 5, and then dies at step 8 on an event nobody considered. So the stack trace points at THINKING while the conversation was already corrupted three steps earlier \u2014 which is the normal relationship between a state-machine bug and its symptom." },
          { t: "p", text: "**The USER_SPEAKING self-transition is the one that looks like noise and is not.** \u201cThe user is already talking\u201d has to be an intentional no-op recorded in the table, rather than an event that falls through to a default. A default that throws takes the call down; a default that resets silently loses the turn. Writing it down costs one line and removes a whole class of ambiguity." }
        ] } },

    { t: "callout", kind: "mental", title: "Mental model: states are where the invariants live",
      body: [
        { t: "p", text: "The reason this structure pays off beyond catching bugs is that each state has invariants you can assert at runtime. In LISTENING, nothing should be in flight and the history should be committed. In SPEAKING, the played-word counter must be advancing. In THINKING, no audio should be leaving. In INTERRUPTED, the state is transient and must not persist beyond a few hundred milliseconds." },
        { t: "p", text: "A single assertion per state, checked on entry, catches a surprising amount: a leaked generation task, a buffer that was not flushed, an interrupted state that never completed cleanup. 13.13's span tree is the observability counterpart \u2014 the same structure, instrumented instead of asserted." }
      ] },

    { t: "callout", kind: "scenario", title: "Scenario: \u201cthe agent answered a question I'd already corrected\u201d",
      body: [
        { t: "p", text: "A caller says \u201cwhat's the balance on my savings \u2014 no, sorry, the current account\u201d, and the agent reads out the savings balance. The correction came during the pause, the transcript shows both utterances, and the engineer's first hypothesis is a prompt problem: the model should have noticed the correction." },
        { t: "p", text: "It is a state machine problem. The correction arrived while the turn was in THINKING, which is 950 of the 1,650 ms and silent \u2014 the state most likely to provoke a user into speaking. If there is no interrupt transition out of THINKING, the voice activity event has nowhere to go, the generation already underway is never cancelled, and the agent completes an answer to a question that has been withdrawn." },
        { t: "p", text: "The fix is an edge and an action: THINKING plus user_interrupts goes to INTERRUPTED with cancel_generation, and the superseded user message is replaced rather than appended \u2014 otherwise the history holds two questions and the model may well answer the first anyway. The general lesson is that \u201cthe model should have noticed\u201d is the wrong diagnosis whenever the information never reached the model, and the validator would have found this before any caller did." }
      ] }
  ],

  takeaways: [
    "**A turn is a small concurrent system**, not a function call: audio arriving, audio leaving, a model generating, a tool running, the user able to speak at any moment.",
    "**Five states**: LISTENING, USER_SPEAKING, THINKING, SPEAKING, INTERRUPTED \u2014 the last being a transient cleanup state so cleanup is a named step.",
    "**Write it as a transition table, not a diagram**, because a table can be asserted over and a drawing cannot.",
    "**Four validators**: reachability, dead ends, unhandled plausible events, and action invariants.",
    "**Both versions pass reachability and dead-end checks** \u2014 which is exactly why the broken machine survives design review.",
    "**The defect is a missing ACTION on an edge that exists**: INTERRUPTED returns to LISTENING without truncating history, which no diagram can express.",
    "**That turns 13.6's behavioural bug into four lines of unit test** \u2014 the 17.5% phantom context becomes a failing assertion.",
    "**THINKING needs its own interrupt path**: it is 950 of the turn's 1,650 ms, it is silent, and silence is what makes users speak \u2014 usually to correct themselves.",
    "**Interrupting from THINKING differs from SPEAKING**: no audio to stop, but generation to cancel, and the superseded user message must be replaced rather than appended.",
    "**\u201cThe user is already talking\u201d must be an explicit no-op**, not an event falling through to a default that throws or silently resets.",
    "**In the replay, the crash and the defect were three steps apart** \u2014 history corrupted at step 5, exception at step 8, which is the normal relationship.",
    "**Each state carries runtime invariants worth asserting on entry** \u2014 nothing in flight in LISTENING, the played-word counter advancing in SPEAKING, no audio leaving in THINKING.",
    "**\u201cThe model should have noticed\u201d is the wrong diagnosis** when the information never reached the model."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Both the buggy and corrected state machines pass reachability and dead-end checks. What does that tell you?",
        options: [
          "The buggy machine is acceptable, since structural validation passes",
          "The checks a diagram can express are satisfied by the broken machine, which is why it survives review",
          "Reachability analysis is not applicable to state machines with transient states",
          "The dead-end check is implemented incorrectly"
        ],
        answer: 1,
        why: "A drawing shows states and edges, so it can reveal a missing state or an edge going nowhere \u2014 and the broken machine has neither problem. The defect is a present edge missing an action: INTERRUPTED correctly returns to LISTENING and fails to truncate the conversation history on the way. That is invisible in any box-and-arrow picture and is four lines of assertion over a transition table, which is the entire argument for keeping the table." },

      { stem: "Why does the THINKING state need its own interrupt transition?",
        options: [
          "Because tool calls happen there and may need cancelling",
          "Because it is 950 of the turn's 1,650 ms and it is silent, which is exactly when users speak \u2014 usually to correct themselves",
          "Because the ASR is still producing partials that could trigger barge-in",
          "It does not \u2014 interruption only matters while the agent is producing audio"
        ],
        answer: 1,
        why: "The word \u201cinterruption\u201d suggests it only applies while the agent is talking, but most of the turn is spent in THINKING and that state is silent \u2014 the condition that provokes a caller into speaking, most often to correct something they just said. Without the edge, the voice event has nowhere to go, the generation underway is never cancelled, and the agent confidently answers a question that has been withdrawn." },

      { stem: "In the replay, the buggy machine threw at step 8 but the real defect occurred at step 5. Why is that typical?",
        options: [
          "Because the trace was constructed to produce that ordering",
          "A missing action corrupts state silently while a missing edge throws, so the symptom and the defect are usually in different places",
          "Because exceptions in state machines are always deferred to the next transition",
          "Because the history truncation is lazy and only evaluated when needed"
        ],
        answer: 1,
        why: "The two defect kinds fail differently: an unhandled event raises immediately and loudly, while an edge that exists but omits an action proceeds normally and leaves the system in a wrong state. So the stack trace pointed at THINKING while the conversation history had already been corrupted three steps earlier \u2014 which is why validating the table beats debugging the symptom, and why the silent class of defect needs an explicit invariant." },

      { stem: "A caller says \u201cmy savings balance \u2014 no, sorry, the current account\u201d and the agent reads the savings balance. What is the diagnosis?",
        options: [
          "The prompt needs to instruct the model to watch for self-corrections",
          "No interrupt transition out of THINKING, so the correction never reached the model and generation was never cancelled",
          "The endpointer committed too early, truncating the user's utterance",
          "The ASR failed to transcribe the correction"
        ],
        answer: 1,
        why: "The correction arrived during the silent THINKING state, and with no transition for it the voice event has nowhere to go: the in-flight generation is never cancelled and an answer to the withdrawn question completes. The fix is an edge plus an action \u2014 THINKING on user_interrupts goes to INTERRUPTED with cancel_generation, and the superseded user message is replaced rather than appended, or the history holds two questions. \u201cThe model should have noticed\u201d is the wrong diagnosis when the information never reached it." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "The conversation state machine",
    questions: [
      { level: "core",
        q: "Describe the states a voice turn moves through.",
        strong: "A strong answer names five and says what each one is for.",
        answer: [
          { t: "p", text: "Five. LISTENING is idle with the microphone open and nothing in flight \u2014 the resting state between turns and the only place it is safe to commit history. USER_SPEAKING is voiced audio arriving and partial transcripts accumulating, which is where speculative prefill happens. THINKING is after the endpointer commits: the transcript is finalising, the model is prefilling and generating, and no audio is leaving. SPEAKING is audio streaming out clause by clause with barge-in detection live. And INTERRUPTED is a transient cleanup state." },
          { t: "p", text: "INTERRUPTED existing as a named state rather than as a cleanup function is the design decision worth defending. It makes the cleanup a step with a defined entry and exit rather than something scattered through a handler, and that is what lets you assert things about it \u2014 that it performed the truncation, that it did not persist for more than a few hundred milliseconds." },
          { t: "p", text: "The reason to make any of this explicit is that a turn is not a function call. It is a small concurrent system: audio arriving while audio is leaving, a model generating, maybe a tool running, and the user able to speak at any moment. Without a state machine that becomes a nest of booleans where each one was added to handle a specific thing someone hit in testing." },
          { t: "p", text: "I would also say that each state carries invariants worth asserting on entry. Nothing in flight in LISTENING. The played-word counter advancing in SPEAKING. No audio leaving in THINKING. One assertion per state catches leaked generation tasks, unflushed buffers and cleanups that never completed." }
        ] },

      { level: "advanced",
        q: "Which transition do teams get wrong, and how would you catch it?",
        strong: "A strong answer names the missing action and the validator that finds it.",
        answer: [
          { t: "p", text: "The one from INTERRUPTED back to LISTENING, and specifically what it has to do on the way: truncate the conversation history to the words that were actually played. Without it the model keeps the words it generated but the user never heard, so it refers back to information that was never delivered. When I modelled a ten-turn call with three interruptions, 17.5% of what the agent believed it had said had never reached the caller." },
          { t: "p", text: "The reason it is so hard to catch in review is that the edge is there and it is correct \u2014 INTERRUPTED does go back to LISTENING. What is missing is an action on it. A diagram can show you a missing state or an edge that goes nowhere, and this is neither. So the broken machine passes every check a drawing can express." }
          ,
          { t: "p", text: "Which is why I would write the machine as a transition table rather than as control flow: a dict from state and event to next state and a list of actions. Then the check is four lines \u2014 for every edge from INTERRUPTED to LISTENING, assert that some action truncates history. That converts a behavioural bug that surfaces as the model sounding arrogant in a customer complaint into a failing unit test." },
          { t: "p", text: "I would add three more validators while I was there: all states reachable from LISTENING, no state without an exit, and no unhandled event that is plausible in a given state. The third one found the other defect I care about, which is that there is usually no interrupt path out of THINKING." }
        ] },

      { level: "advanced",
        q: "A caller corrects themselves during the pause and the agent answers the original question. What happened?",
        strong: "A strong answer locates it in THINKING rather than in the prompt.",
        answer: [
          { t: "p", text: "The correction arrived while the turn was in THINKING, and there is probably no transition for it. That state is 950 of the turn's 1,650 milliseconds and it is completely silent, which makes it the single most likely moment for a caller to speak \u2014 they hear nothing, they realise they said the wrong account, and they say so. If the state machine has no interrupt edge out of THINKING, the voice activity event has nowhere to go, the generation already running is never cancelled, and an answer to the withdrawn question completes normally." },
          { t: "p", text: "The usual first hypothesis is that the model should have noticed the correction, and I would push back on that specifically. The model cannot notice something that never reached it. Whenever the diagnosis is \u2018the model should have handled this\u2019, the first thing to check is whether the information was in the prompt at all." },
          { t: "p", text: "The fix is an edge and an action: THINKING on user_interrupts goes to INTERRUPTED with cancel_generation. And then a detail that is easy to miss \u2014 the superseded user message has to be replaced rather than appended, because otherwise the history contains two questions and the model may answer the first one anyway, which looks like exactly the same bug and has a different cause." },
          { t: "p", text: "The handling genuinely differs from interrupting during SPEAKING, which is why it needs its own edge rather than sharing one. There is no audio to stop and no playout buffer to flush, so two of the four barge-in steps do not apply; what does apply is cancelling generation, which in the SPEAKING case you also want but for a different reason." }
        ] }
    ]
  }
});
