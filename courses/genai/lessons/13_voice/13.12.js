EC.receiveLesson({
  id: "13.12",

  lede: "The single most consequential decision in evaluating a voice agent is what you feed it. Run the same eight cases through the same agent twice \u2014 once giving it **what the user said**, once giving it **what the recogniser heard** \u2014 and the text harness reports **100% task success** while the audio harness reports **38%**. Nothing is wrong with the agent. It acts correctly on every transcript it receives; five of eight transcripts are wrong in an entity. The failure is upstream of anything a text eval can reach, and the transcripts of those five calls read beautifully, because the response is fluent and correct **for the question it received**. A human reviewer reading transcripts rates them highly. Only the audio shows the problem.",

  objectives: [
    "Explain why a text eval cannot detect a misheard-but-well-answered turn",
    "Name the four evaluation layers and the metrics that belong to each",
    "Build an eval set from recorded audio and say what has to be stored",
    "Choose between an audio replay suite and a simulated caller",
    "State the interaction targets a voice agent should hold itself to"
  ],

  prerequisites: ["13.9", "13.1"],

  blocks: [

    { t: "h2", n: "01", id: "input", text: "The input is the whole question",
      sub: "Same agent, same cases, two harnesses" },

    { t: "p", text: "A text eval for a voice agent is built the obvious way: take the reference transcripts, feed them to the agent, score the actions. It is cheap, deterministic, fast in CI, and it measures the agent's reasoning cleanly. And it answers a question nobody asked, because the agent will never receive a reference transcript in production \u2014 it receives whatever the recogniser produced." },

    { t: "code", lang: "python", title: "The only difference between the two harnesses",
      code: '# (what the user said, what the recogniser produced, the correct action)\nCASES = [\n    ("transfer two hundred and fifty dollars to savings",\n     "transfer two hundred and fifteen dollars to savings",\n     ("transfer", "250", "savings")),\n    ("cancel my appointment on the thirtieth",\n     "cancel my appointment on the thirteenth",\n     ("cancel", "30", None)),\n    # ... six more\n]\n\n# the text eval:\nscore = sum(agent(said) == want for said, _heard, want in CASES)\n\n# the audio eval:\nscore = sum(agent(heard) == want for _said, heard, want in CASES)',
      hl: [12, 15],
      caption: "One identifier changes. The reported task success goes from 100% to 38%." },

    { t: "callout", kind: "insight", title: "The agent is not the thing being measured",
      body: [
        { t: "p", text: "This is why the gap is so easy to misread. A text eval at 100% is accurate \u2014 the agent really does the right thing with the right transcript, every time. The number is correct and it is a measurement of the wrong system: the agent in isolation rather than the agent behind a recogniser." },
        { t: "p", text: "And the failure mode it hides is specific and uniquely bad: **answering a misheard question perfectly**. There is no error, no low-confidence signal, no exception, no refusal. The response is fluent and correct for the input it got. Every automated text check passes, and the user's money went to the wrong place." }
      ] },

    { t: "viz", title: "100% and 38% on the same eight cases",
      caption: "The agent is fine. Five of eight transcripts are not, and only one harness can tell.",
      svg: '<svg viewBox="0 0 760 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Text eval compared with audio eval on the same cases">' +
        '<text x="12" y="18" class="s-label">TEXT EVAL \u2014 the agent receives what the user SAID</text>' +
        '<rect x="12" y="28" width="700" height="28" fill="var(--good)" opacity="0.28" stroke="var(--good)"/>' +
        '<text x="362" y="47" class="s-mono" text-anchor="middle" fill="var(--good)">8 / 8 = 100% task success</text>' +
        '<text x="12" y="80" class="s-label">AUDIO EVAL \u2014 the agent receives what the recogniser HEARD</text>' +
        '<rect x="12" y="90" width="700" height="28" fill="var(--crit)" opacity="0.22" stroke="var(--crit)"/>' +
        '<rect x="12" y="90" width="263" height="28" fill="var(--good)" opacity="0.28" stroke="var(--good)"/>' +
        '<text x="143" y="109" class="s-mono" text-anchor="middle" fill="var(--good)">3 / 8 = 38%</text>' +
        '<text x="500" y="109" class="s-sub" text-anchor="middle">5 turns act on a misheard entity</text>' +
        '<text x="12" y="146" class="s-label">WHAT THE FIVE FAILURES LOOK LIKE IN A TRANSCRIPT</text>' +
        '<rect x="12" y="156" width="700" height="62" rx="4" fill="var(--warn)" opacity="0.1" stroke="var(--warn)"/>' +
        '<text x="22" y="176" class="s-mono">user:  transfer two hundred and FIFTY dollars to savings</text>' +
        '<text x="22" y="194" class="s-mono">heard: transfer two hundred and FIFTEEN dollars to savings</text>' +
        '<text x="22" y="212" class="s-mono" fill="var(--good)">agent: Transferring two hundred and fifteen dollars to savings. \u2713 fluent</text>' +
        '<text x="12" y="244" class="s-sub">the response is relevant, correct, well-formed and in the right band. a human</text>' +
        '<text x="12" y="262" class="s-sub">reviewer reading transcripts scores it highly. an LLM judge scores it highly.</text>' +
        '<text x="12" y="280" class="s-sub">the only artefact that contains the defect is the audio.</text>' +
        '</svg>' },

    { t: "h2", n: "02", id: "layers", text: "Four layers",
      sub: "And three of them do not exist in a text eval" },

    { t: "table",
      head: ["Layer", "Metrics", "Targets worth holding"],
      rows: [
        ["recognition", "WER, **entity error rate**", "entity error rate under 5% on consequential slots"],
        ["interaction", "p50/p95 time to first audio, interruption rate, barge-in latency", "median under 800 ms, false interruptions under 5%, barge-in under 200 ms"],
        ["task", "success rate, turns to completion, containment", "measured on audio input, never on reference text"],
        ["experience", "MOS or CMOS, abandonment rate, talk-over rate", "abandonment tracked per turn index, not per call"]
      ] },

    { t: "p", text: "Note how little of this a text harness can touch. Recognition needs audio by definition. Interaction needs timing, and a text eval has none. Experience needs audio to rate. Only the task layer is reachable, and as the exercise shows, a text eval measures it on an input the user never produced \u2014 so it is the one layer that is both measurable and misleading." },

    { t: "callout", kind: "good", title: "Entity error rate is the recognition metric that belongs in the gate",
      body: [
        { t: "p", text: "13.9 measured 10.6% WER against 41.2% entity error rate on the same transcripts. If your release gate watches WER it will pass releases that cannot do the job, because WER's denominator is full of function words that were never at risk." },
        { t: "p", text: "The practical version: define the consequential slots per intent, and gate on entity error rate over those. It is more work to set up than WER and it is the only recognition number that tracks whether the product works." }
      ] },

    { t: "callout", kind: "trap", title: "Abandonment per call hides where people leave",
      body: [
        { t: "p", text: "A 12% abandonment rate is not actionable. The same 12% concentrated on the third turn of the authentication flow is a specific bug with a specific owner. Track abandonment by turn index and by dialogue state, because the shape tells you whether people are giving up on a slow agent, a misheard name or a confusing menu \u2014 three different fixes." },
        { t: "p", text: "The same goes for talk-over: the rate matters less than *where* it clusters. 13.5 found that interruptions concentrate on digit collection and address capture, which is what makes a per-context endpointing threshold the cheap fix rather than a global one." }
      ] },

    { t: "h2", n: "03", id: "methods", text: "Two ways to build the set",
      sub: "Replay and simulation, and they answer different questions" },

    { t: "ladder", title: "Eval harnesses, worst to best",
      rungs: [
        { level: "bad", label: "Reference transcripts into the agent",
          why: "Measures the agent in isolation, reports 100% on a set where 5 of 8 turns fail in production, and cannot see any of recognition, interaction or experience. Its worst property is that it looks like a real eval and produces green numbers.",
          code: "for said, _heard, want in CASES:\n    assert agent(said) == want       # 8/8",
          note: "Keep it as a reasoning regression test. Never call it task success." },
        { level: "ok", label: "Synthesised audio replay",
          why: "Run text through TTS, feed the audio to the pipeline. Cheap, scalable, deterministic and it exercises the whole stack. But synthesised speech is unnaturally clean \u2014 no disfluency, no overlap, no room noise, no accent variety \u2014 so recognition scores optimistically.",
          code: "audio = tts(case.text)\nresult = pipeline(audio)",
          note: "Good for interaction and latency metrics; optimistic for recognition." },
        { level: "ok", label: "Simulated caller",
          why: "A second model with a persona and a goal, speaking through TTS, conversing with your agent over several turns. This is the only method that produces multi-turn behaviour at scale: interruptions, corrections, topic changes, impatience.",
          code: "caller = Persona(goal=\"dispute a charge\", mood=\"impatient\",\n                 interrupts=True)\ntranscript = converse(caller, agent, max_turns=12)",
          note: "Essential for the state machine paths from 13.11, and it inherits the clean-audio problem." },
        { level: "best", label: "Recorded real audio, consented, with the labels you need",
          why: "Actual calls, with the reference transcript, the consequential entities and the correct outcome labelled. It is the only set that contains real disfluency, accents, noise and overlap \u2014 and the only one that would have caught all five failures in the exercise.",
          code: "for clip in EVAL_SET:               # real audio\n    heard = asr(clip.audio)\n    action = agent(heard)\n    score_entities(heard, clip.entities)\n    score_action(action, clip.want)",
          note: "Expensive to build, requires explicit consent, and nothing else substitutes for it." }
      ] },

    { t: "p", text: "The honest position is that you want all four, for different jobs. The text harness is a fast reasoning regression test in CI. Synthesised replay covers latency and interaction broadly. The simulated caller exercises multi-turn and interruption paths. And a small set of real recorded audio is the ground truth that the other three are calibrated against \u2014 the thing you check when the cheap harnesses disagree with reality." },

    { t: "exercise", kind: "analysis", title: "Score the same agent on text and on audio",
      difficulty: "core", minutes: 26,
      body: "Build a set of cases where each carries what the user said, what the recogniser produced, and the correct action. Write a small deterministic agent that extracts an action from a transcript. Score it twice \u2014 once on the reference text, once on the recognised text \u2014 and report both. Then enumerate which failures a transcript-reading reviewer would miss, and tabulate which of the four eval layers each harness can reach.",
      requirements: [
        "At least eight cases, with entity errors in the recognised versions of several",
        "A deterministic agent that produces an action tuple from a transcript",
        "Score and report task success under both harnesses",
        "Print each failing case showing said, heard, and that the answer was correct for what was heard",
        "Tabulate the four eval layers against whether audio and text harnesses can measure them"
      ],
      hint: "Make the agent genuinely competent \u2014 the finding is weaker if the agent is also buggy. It should score 100% on reference text.",
      solution: { lang: "python", title: "x1312.py \u2014 100% or 38%, same agent",
        code: '# (what the user said, what the recogniser produced, the correct action)\nCASES = [\n    ("transfer two hundred and fifty dollars to savings",\n     "transfer two hundred and fifteen dollars to savings",\n     ("transfer", "250", "savings")),\n    ("cancel my appointment on the thirtieth",\n     "cancel my appointment on the thirteenth",\n     ("cancel", "30", None)),\n    ("pay eighty dollars to northgate utilities",\n     "pay eighty dollars to north gate utilities",\n     ("pay", "80", "northgate utilities")),\n    ("send the statement to doctor nguyen",\n     "send the statement to doctor win",\n     ("send", None, "nguyen")),\n    # ... four more, two of which the recogniser got right\n]\n\ndef agent(transcript):\n    """A competent agent. It acts on the text it is given."""\n    t = transcript\n    if "transfer" in t:\n        amt = "250" if "fifty" in t else ("215" if "fifteen" in t else None)\n        return ("transfer", amt, "savings")\n    if "cancel" in t:\n        return ("cancel", "30" if "thirtieth" in t else "13", None)\n    # ... one branch per intent\n\ntext_pass = sum(agent(said) == want for said, _h, want in CASES)\naudio_pass = sum(agent(heard) == want for _s, heard, want in CASES)\nprint("text eval  %d/%d" % (text_pass, len(CASES)))\nprint("audio eval %d/%d" % (audio_pass, len(CASES)))',
        out: '================================================================================================\nThe same agent, the same cases, two eval harnesses\n================================================================================================\nthe TEXT eval feeds the agent what the user SAID.\nthe AUDIO eval feeds it what the recogniser HEARD.\n\n#    correct action                     text eval                audio eval              \n1    transfer/250/savings               PASS                     FAIL transfer/215/saving\n2    cancel/30/None                     PASS                     FAIL cancel/13/None     \n3    pay/80/northgate utilities         PASS                     FAIL pay/80/north gate u\n4    balance/None/8132                  PASS                     PASS                    \n5    identify/None/siobhan oconnell     PASS                     FAIL identify/None/shivo\n6    send/None/nguyen                   PASS                     FAIL send/None/win      \n7    claim/None/cb447alpha              PASS                     PASS                    \n8    route/None/mortgage                PASS                     PASS                    \n------------------------------------------------------------------------------------------------\n                                        8/8 = 100%               3/8 = 38%               \n\nthe text eval reports 100% task success. the agent is perfect at its job.\nthe audio eval reports 38%, because 5 of 8 turns act on a misheard entity.\n\n================================================================================================\nWhy the text eval cannot see this, ever\n================================================================================================\nthe agent is not broken. feed it the right transcript and it does the right\nthing 100% of the time. the failure is upstream of everything a text eval\ncan reach, and a text eval will report green through every one of these:\n\n   case 1: user said \'transfer two hundred and fifty dollars to savings\'\n           agent heard \'transfer two hundred and fifteen dollars to savings\'\n           -> answered the misheard question PERFECTLY\n\n   case 2: user said \'cancel my appointment on the thirtieth\'\n           agent heard \'cancel my appointment on the thirteenth\'\n           -> answered the misheard question PERFECTLY\n\n   case 3: user said \'pay eighty dollars to northgate utilities\'\n           agent heard \'pay eighty dollars to north gate utilities\'\n           -> answered the misheard question PERFECTLY\n\n   case 5: user said \'my name is siobhan oconnell\'\n           agent heard \'my name is shivon o connell\'\n           -> answered the misheard question PERFECTLY\n\n   case 6: user said \'send the statement to doctor nguyen\'\n           agent heard \'send the statement to doctor win\'\n           -> answered the misheard question PERFECTLY\n\nthe transcript of each of those calls reads well. the response is fluent,\nrelevant and correct FOR THE QUESTION IT RECEIVED. a human reviewer reading\ntranscripts rates them highly. only the audio reveals the problem.\n\n================================================================================================\nWhat each eval layer can and cannot see\n================================================================================================\nlayer          metrics                                                audio    text\nrecognition    WER, entity error rate                                   yes      no\ninteraction    p50/p95 time to first audio, interruption rate, barg     yes      no\ntask           success, turns to completion, containment                yes  partly\nexperience     MOS/CMOS, abandonment, talk-over rate                    yes      no\n\n   recognition    needs audio by definition\n   interaction    no timing exists in a text eval\n   task           text eval measures it on the WRONG INPUT\n   experience     there is no audio to rate\n\nTHE RULE: build the eval set from recorded audio. a text eval can only ever\nmeasure one of the four layers, and it measures that one on an input the user\nnever produced -- which is how an agent scores 100%% and fails 5 calls in 8.',
        notes: [
          { t: "p", text: "**100% against 38% on the same eight cases, with the same agent.** The only thing that changed is which transcript the agent received. The text harness is not broken \u2014 it accurately measures that the agent reasons correctly \u2014 it is measuring the agent in isolation rather than the agent behind a recogniser, which is not the system that exists." },
          { t: "p", text: "**The failure mode is \u201canswering a misheard question perfectly\u201d**, and it is uniquely bad because it produces no signal at all. No error, no exception, no refusal, no low-confidence flag. The response is fluent, relevant and correct for the input it received, so every automated text check passes and the money goes to the wrong account." },
          { t: "p", text: "**Which is why a human transcript review does not catch it either.** Reading the five failing cases, the agent's responses are well-formed and appropriate. A reviewer would have to compare the recognised transcript against the audio to see anything wrong \u2014 and if they are reading transcripts, they are not listening to audio. An LLM judge scoring the transcripts has exactly the same blind spot." },
          { t: "p", text: "**Three of the four eval layers are unreachable from text at all.** Recognition needs audio by definition. Interaction needs timing, and a text harness has none. Experience needs audio to rate. Only the task layer is reachable \u2014 and that is the one the exercise shows is measurable and misleading, which is the worst combination available." },
          { t: "p", text: "**Keep the text harness and rename what it reports.** It is a good, fast reasoning regression test, and it belongs in CI. It is not task success, and calling it that is how a team ends up confident in an agent that fails five calls in eight." }
        ] } },

    { t: "callout", kind: "mental", title: "Mental model: evaluate the pipeline you shipped",
      body: [
        { t: "p", text: "The general principle behind the finding: an eval is only as valid as the similarity between its input and production's input. Every component you stub out of the harness is a component you have decided not to measure, and the stubs are chosen for convenience rather than for irrelevance." },
        { t: "p", text: "In voice the stubbed component is the recogniser, and it contributes most of the errors. 10.3 made the same argument for retrieval: an eval that supplies perfect context measures a system nobody deployed." }
      ] },

    { t: "callout", kind: "scenario", title: "Scenario: 0.91 task success and poor satisfaction",
      body: [
        { t: "p", text: "A voice agent scores 0.91 task success on a 400-case suite and customer satisfaction is poor. The suite is well-built: realistic cases, careful labels, reviewed by two people. The team's hypothesis is that satisfaction is measuring something other than correctness \u2014 tone, perhaps, or voice quality." },
        { t: "p", text: "The first thing to establish is what the suite feeds the agent. If the cases are reference transcripts, 0.91 is the agent's reasoning accuracy and says almost nothing about the product, because the production input is recognised text with an entity error rate that is probably three to four times its WER. Re-running the same 400 cases through synthesised audio would move the number; re-running through real recorded audio would move it further." },
        { t: "p", text: "Then check whether any interaction metric exists at all. A text suite has no timing, so p95 time to first audio, interruption rate and barge-in latency are all unmeasured \u2014 and 13.1 showed that a perfectly good median can still put a bad moment in nine calls out of ten. Between misheard entities and an unmeasured latency distribution, there is more than enough to explain the gap without reaching for tone." }
      ] }
  ],

  takeaways: [
    "**The same agent scored 100% on reference transcripts and 38% on recognised ones**, across eight cases \u2014 the only change was which transcript it received.",
    "**The agent was not the defect**: it acts correctly on every transcript it gets, and five of eight transcripts were wrong in an entity.",
    "**\u201cAnswering a misheard question perfectly\u201d produces no signal** \u2014 no error, no exception, no low confidence, and a fluent correct-sounding response.",
    "**So a human transcript review misses it too**, and so does an LLM judge, because the defect is only in the audio.",
    "**Four layers**: recognition, interaction, task, experience \u2014 and a text harness can reach only one of them.",
    "**That one is both measurable and misleading**, which is the worst combination; it scores the task layer on an input the user never produced.",
    "**Gate on entity error rate, not WER** \u2014 13.9 measured 10.6% against 41.2% on the same data.",
    "**Interaction targets**: median time to first audio under 800 ms, false interruptions under 5%, barge-in under 200 ms.",
    "**Track abandonment by turn index and dialogue state**, not per call \u2014 12% overall is not actionable, 12% on the third authentication turn is.",
    "**Synthesised audio replay is scalable and optimistic**: no disfluency, overlap, noise or accent variety, so recognition scores high.",
    "**A simulated caller is the only scalable source of multi-turn behaviour** \u2014 interruptions, corrections, topic changes, impatience.",
    "**Recorded real audio with labelled entities is the ground truth** the other three harnesses are calibrated against, and nothing substitutes for it.",
    "**Keep the text harness and rename it**: it is a good reasoning regression test and it is not task success.",
    "**An eval is only as valid as the similarity between its input and production's** \u2014 every stubbed component is one you chose not to measure."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "The same agent scored 100% on reference transcripts and 38% on recognised ones. What does that show?",
        options: [
          "The agent has a reasoning defect that only appears on noisy input",
          "The text harness measures the agent in isolation rather than the agent behind a recogniser",
          "The recognised transcripts were drawn from harder cases",
          "Task success is not a meaningful metric for voice agents"
        ],
        answer: 1,
        why: "The agent is correct on every transcript it receives \u2014 the 100% is an accurate measurement of its reasoning. What it is not is a measurement of the deployed system, because in production the input is recognised text, and five of eight recognised transcripts contained an entity error. The number is right and it answers a question about a system nobody shipped, which is why keeping the harness and renaming what it reports is the correct response." },

      { stem: "Why does a human reviewer reading transcripts fail to catch these errors?",
        options: [
          "Transcripts are too long to review carefully at scale",
          "The agent's response is fluent and correct for the transcript it received, so nothing in the transcript looks wrong",
          "Reviewers are not given the correct action labels",
          "Entity errors are usually subtle spelling differences"
        ],
        answer: 1,
        why: "The defect is a mismatch between the audio and the transcript, and the transcript is the only artefact the reviewer has. \u201cTransferring two hundred and fifteen dollars to savings\u201d is a well-formed, relevant, appropriate response to the recognised text, so it reads as a success \u2014 and an LLM judge scoring the same transcript has exactly the same blind spot. Catching it requires comparing the transcript against the audio." },

      { stem: "Which of the four eval layers can a text harness measure?",
        options: [
          "All four, with timing estimated from token counts",
          "Only the task layer \u2014 and it measures that on an input the user never produced",
          "Recognition and task, since both operate on text",
          "None, which is why text harnesses should be removed"
        ],
        answer: 1,
        why: "Recognition needs audio by definition, interaction needs timing that a text harness does not have, and experience needs audio to rate. Task is the only reachable layer, which makes it the dangerous one \u2014 measurable and misleading together. The harness is still worth keeping as a fast reasoning regression test in CI; the error is calling its output task success." },

      { stem: "A team reports 12% call abandonment. Why is that figure not actionable?",
        options: [
          "Because abandonment is primarily driven by factors outside the agent",
          "Because the same 12% concentrated on one turn or dialogue state is a specific bug, and spread evenly it is a different problem",
          "Because 12% is within normal variation for voice products",
          "Because abandonment cannot be attributed without listening to every call"
        ],
        answer: 1,
        why: "The aggregate hides the shape, and the shape is what names the fix. Twelve per cent concentrated on the third turn of authentication points at a misheard name or a confusing prompt with a clear owner; the same twelve per cent spread evenly across turns points at latency or voice quality. Tracking by turn index and dialogue state distinguishes them, which is the same reasoning that made per-context endpointing thresholds the cheap fix in 13.5." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Evaluating a voice agent",
    questions: [
      { level: "advanced",
        q: "How would you evaluate a voice agent?",
        strong: "A strong answer insists on audio input and names four layers.",
        answer: [
          { t: "p", text: "The first decision is what the harness feeds the agent, and it dominates everything else. I ran the same eight cases through the same agent twice \u2014 once with the reference transcript, once with what the recogniser actually produced \u2014 and got 100% task success and 38%. Nothing was wrong with the agent; it acted correctly on every transcript it received, and five of the eight transcripts had an entity error. So the eval set has to be built from audio." },
          { t: "p", text: "Then four layers. Recognition: word error rate, but gated on entity error rate, because those two differed by almost four times on the same data and WER's denominator is mostly function words that were never at risk. Interaction: p50 and p95 time to first audio, interruption rate, barge-in latency \u2014 median under 800 milliseconds, false interruptions under 5%, barge-in under 200. Task: success, turns to completion, containment, measured on audio input. Experience: a listening score, abandonment and talk-over rate." },
          { t: "p", text: "In practice I would run four harnesses for four jobs. The text harness stays in CI as a fast reasoning regression test \u2014 I would just stop calling its output task success. Synthesised audio replay is cheap and scalable and covers latency and interaction, while scoring recognition optimistically because synthesised speech has no disfluency, overlap or accent variety. A simulated caller, a second model with a persona and a goal, is the only scalable way to get multi-turn behaviour: interruptions, corrections, impatience. And a small set of real recorded audio with the consequential entities labelled is the ground truth the other three get calibrated against." },
          { t: "p", text: "One thing I would set up deliberately: track abandonment by turn index and dialogue state rather than per call. A 12% abandonment rate is not actionable; 12% landing on the third turn of authentication is a specific bug with an owner." }
        ] },

      { level: "advanced",
        q: "Your suite reports 0.91 task success and customers are unhappy. What do you check?",
        strong: "A strong answer questions the harness input before the metric.",
        answer: [
          { t: "p", text: "First, what the suite feeds the agent. If the 400 cases are reference transcripts, then 0.91 is the agent's reasoning accuracy and it says very little about the product, because production input is recognised text \u2014 and the entity error rate on recognised text runs three to four times the word error rate. I would re-run the identical cases through synthesised audio, which would move the number, and then through real recorded audio, which would move it further. That is the single highest-information experiment available and it uses a suite that already exists." },
          { t: "p", text: "Second, whether any interaction metric exists at all. A text suite has no timing in it, so p95 time to first audio, interruption rate and barge-in latency are simply unmeasured. And a good median is not reassuring on its own \u2014 two agents with an identical 700 millisecond median had 1.6% and 23.6% of turns past the point where a wait reads as thinking, which over a twelve-turn call is a 17% against a 96% chance of at least one bad moment." },
          { t: "p", text: "Third, I would listen to ten calls, chosen from the dissatisfied ones rather than at random. Specifically I would be looking for the failure the suite cannot represent: the agent answering a misheard question perfectly. That produces no error, no exception, no low-confidence flag and a fluent appropriate response, so it passes every automated text check and every human transcript review, and the only artefact containing the defect is the audio." },
          { t: "p", text: "Between misheard entities and an unmeasured latency distribution there is normally more than enough to explain this kind of gap, so I would resist the hypothesis that satisfaction is measuring tone or voice quality until those two are ruled out. They are cheap to rule out and tone is expensive to chase." }
        ] },

      { level: "core",
        q: "What is a simulated caller and when would you use one?",
        strong: "A strong answer explains what it uniquely provides and what it misses.",
        answer: [
          { t: "p", text: "A second model given a persona, a goal and a disposition \u2014 disputing a charge, impatient, prone to interrupting \u2014 speaking through text-to-speech and conversing with your agent over a number of turns. You score the resulting conversation on whether the goal was achieved, how many turns it took and what went wrong." },
          { t: "p", text: "What it uniquely provides is multi-turn behaviour at scale. Recorded real calls contain that too, but you have however many you have, and you cannot ask them for more of a specific kind. A simulated caller can produce fifty conversations where the user corrects themselves mid-sentence, or changes topic, or interrupts \u2014 which is the only practical way to exercise the state machine paths from 13.11, especially the interrupt out of the thinking state that almost never happens in a scripted test." },
          { t: "p", text: "What it misses is everything about real audio. The caller's speech is synthesised, so it has no disfluency, no overlap, no room noise, no accent variety and no emotional strain. Recognition will score optimistically, which matters a lot given that recognition is where most of the errors are. So I would not use it to measure entity error rate." },
          { t: "p", text: "So I would use it for interaction and conversational-path coverage, and calibrate it against a small set of real recorded audio. The thing I would watch for is drift in what the personas represent: a simulated caller is generated by a model, and it will tend toward well-formed cooperative requests unless you specifically push it toward the awkward ones, which are the ones worth testing." }
        ] }
    ]
  }
});
