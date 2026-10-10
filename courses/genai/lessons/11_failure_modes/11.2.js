EC.receiveLesson({
  id: "11.2",

  lede: "The most common production surprise: **RAG only helps if the right context reaches the model and the model is forced to use it.** Six causes account for almost all of it, and the first \u2014 a retrieval miss \u2014 is the most common by a wide margin. Which gives the key insight: \u201challucination despite RAG\u201d is usually a **retrieval problem or a prompting problem, not a model problem.** Verify the right chunk was retrieved before blaming the LLM.",

  objectives: [
    "Name the six ways a RAG answer departs from its context",
    "Diagnose which cause applies from span attributes rather than from the answer",
    "Explain why a missing abstention path is a top cause rather than a nicety",
    "Recognise the context-versus-parametric conflict and its fix",
    "Order the six by how often they occur and how cheap the fix is"
  ],

  prerequisites: ["11.1", "10.13"],

  blocks: [

    { t: "h2", n: "01", id: "six", text: "Six causes",
      sub: "And the first one dominates" },

    { t: "table",
      head: ["Cause", "What is happening", "Fix"],
      rows: [
        ["**Retrieval miss**", "The relevant chunk was never retrieved, so the model fills the gap from parametric memory. *Most common cause.*", "Fix retrieval first \u2014 hybrid search, a reranker"],
        ["**Ungrounded prompt**", "Context is present but the prompt never says \u201canswer **only** from this\u201d", "Add grounding and abstention instructions"],
        ["**No abstention path**", "The model is never *allowed* to say \u201cnot in the docs\u201d, so it guesses", "Give it an explicit \u201cI do not know\u201d out"],
        ["**Lost in the middle**", "The right chunk is buried in a huge context and ignored", "Rerank; put key context at the start and end; trim bloat"],
        ["**Stale / wrong index**", "The retrieved doc is itself outdated or incorrect", "Fix the source data; track index freshness"],
        ["**Context vs parametric conflict**", "The model \u201cknows\u201d something different and overrides the context", "Instruct it to prefer context; lower temperature"]
      ] },

    { t: "callout", kind: "insight", title: "Five of the six are not the model",
      body: [
        { t: "p", text: "Retrieval miss, lost in the middle and a stale index are **retrieval** problems. An ungrounded prompt and a missing abstention path are **prompting** problems. Only the last \u2014 the model overriding its context \u2014 is arguably about the model, and even that is mostly fixed with an instruction and a temperature setting." },
        { t: "p", text: "Which is why the reflex matters so much: **verify the right chunk was retrieved before blaming the LLM.** 10.13 is the worked case \u2014 faithfulness flat at 0.95 while context recall halved \u2014 and the hours that would have gone into prompt tuning were saved by one query against the index." },
        { t: "p", text: "The practical version is 10.14\u2019s step 8, and it is ten minutes: run the retriever with no model on the failing questions, then run the generator with hand-picked perfect context. The first experiment settles retrieval miss, lost-in-the-middle and stale index; the second settles the prompting causes." }
      ] },

    { t: "h2", n: "02", id: "abstention", text: "Why a missing abstention path is a *top* cause",
      sub: "Not a nicety" },

    { t: "callout", kind: "good", title: "A model with no permission to abstain must guess",
      body: [
        { t: "p", text: "This follows directly from 11.1\u2019s mechanism. The objective rewards a plausible continuation, and if the instruction set contains no acceptable \u2018I cannot answer from this\u2019 output, then every continuation that satisfies the instruction is a claim. Abstention is not the model declining to work \u2014 it is the only honest output available when the context is insufficient, and it has to be in the instruction set." },
        { t: "p", text: "It is worth being blunt about the size of this: adding an explicit abstention path *\u201cremoves a large fraction of RAG hallucinations, because the model now has permission to say I do not know.\u201d* It is one paragraph in a system prompt." },
        { t: "p", text: "And it pairs with an operational metric. 11.6 tracks **abstention rate** in both directions: too low means the model is overconfident, too high means retrieval is weak. A system with a 0% abstention rate is not a confident system, it is an uninstrumented one." }
      ] },

    { t: "callout", kind: "trap", title: "An abstention path without a retrieval fix converts one failure into another",
      body: [
        { t: "p", text: "If the dominant cause is a retrieval miss, adding abstention changes a confident wrong answer into \u201cI do not have that information\u201d \u2014 which is strictly better and still a failure. The user asked a question your corpus can answer and did not get an answer." },
        { t: "p", text: "That is the right first move in an incident, because an honest refusal beats a confident error, and 10.13\u2019s hour-zero mitigation is exactly this. But it is mitigation, not a fix, and the abstention-rate metric is what stops it being mistaken for one \u2014 a spike there is a retrieval alarm." },
        { t: "p", text: "So the ordering is: abstention first because it is cheap and stops the bleeding, retrieval second because it is the actual cause, and the abstention rate is the signal that tells you the second job is not done." }
      ] },

    { t: "h2", n: "03", id: "conflict", text: "The conflict case",
      sub: "When the model prefers what it already believes" },

    { t: "callout", kind: "warn", title: "Context and parametric memory disagree, and the model does not know which to trust",
      body: [
        { t: "p", text: "If a document says a price changed in April and the model has strongly memorised March, the two signals compete. Nothing in the architecture privileges the context \u2014 it is just more tokens in the prompt \u2014 so the outcome depends on the relative strength of the evidence, and a widely-repeated training fact is strong evidence." },
        { t: "p", text: "The fix is an instruction plus a decoding setting: tell the model explicitly that the context takes precedence over anything it believes, and lower the temperature so the sampling does not wander towards the more familiar continuation. Both are cheap and neither is a guarantee." },
        { t: "p", text: "A related and nastier version is a **conflict inside the context**: an old policy document and its replacement both retrieved, both relevant. Retrieval looks perfect, precision and recall are fine, and the model picks one \u2014 sometimes the wrong one. Only recency metadata or a supersede step at ingest fixes that, which is a corpus problem rather than a prompting one." }
      ] },

    { t: "viz", title: "Six causes, two layers", caption: "Five of the six are retrieval or prompting. Check the chunk before the model.",
      svg: `<svg viewBox="0 0 760 300" width="100%" role="img" aria-label="Six causes of RAG hallucination split across retrieval and prompting layers">
  <text x="16" y="20" class="s-label">RETRIEVAL LAYER &#8212; check this FIRST</text>
  <rect x="16" y="30" width="728" height="30" rx="3" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.8"/>
  <text x="28" y="44" class="s-mono" style="font-size:9px;fill:var(--crit)">1 &#183; RETRIEVAL MISS &#8212; most common cause by a wide margin</text>
  <text x="28" y="56" class="s-sub">the chunk never arrived, so the model filled the gap from parametric memory &#183; span: above_threshold = 0</text>

  <rect x="16" y="64" width="728" height="30" rx="3" class="s-fill-bg" style="stroke:var(--warn)" stroke-width="1.4"/>
  <text x="28" y="78" class="s-mono" style="font-size:9px;fill:var(--warn)">4 &#183; LOST IN THE MIDDLE</text>
  <text x="28" y="90" class="s-sub">the right chunk is present at rank 8 and ignored &#183; span: gold chunk id present, top_k raised recently</text>

  <rect x="16" y="98" width="728" height="30" rx="3" class="s-fill-bg" style="stroke:var(--warn)" stroke-width="1.4"/>
  <text x="28" y="112" class="s-mono" style="font-size:9px;fill:var(--warn)">5 &#183; STALE OR WRONG INDEX</text>
  <text x="28" y="124" class="s-sub">the document itself is outdated &#8212; a FACTUALITY failure with perfect faithfulness &#183; span: index_version</text>

  <line x1="16" y1="138" x2="744" y2="138" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="158" class="s-label">PROMPTING LAYER</text>
  <rect x="16" y="166" width="356" height="30" rx="3" class="s-fill-bg" style="stroke:var(--accent)" stroke-width="1.4"/>
  <text x="28" y="180" class="s-mono" style="font-size:9px;fill:var(--accent)">2 &#183; UNGROUNDED PROMPT</text>
  <text x="28" y="192" class="s-sub">never says &#8220;answer only from this&#8221;</text>
  <rect x="388" y="166" width="356" height="30" rx="3" class="s-fill-bg" style="stroke:var(--accent)" stroke-width="1.4"/>
  <text x="400" y="180" class="s-mono" style="font-size:9px;fill:var(--accent)">3 &#183; NO ABSTENTION PATH</text>
  <text x="400" y="192" class="s-sub">not allowed to say &#8220;not in the docs&#8221;</text>

  <line x1="16" y1="208" x2="744" y2="208" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="228" class="s-label">AND ONE THAT IS ACTUALLY THE MODEL</text>
  <rect x="16" y="236" width="728" height="30" rx="3" class="s-fill-bg" style="stroke:var(--violet)" stroke-width="1.4"/>
  <text x="28" y="250" class="s-mono" style="font-size:9px;fill:var(--violet)">6 &#183; CONTEXT vs PARAMETRIC CONFLICT</text>
  <text x="28" y="262" class="s-sub">nothing privileges the context &#8212; it is just more tokens &#183; fix: instruct precedence, lower temperature</text>

  <rect x="16" y="272" width="728" height="24" rx="4" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="28" y="288" class="s-mono" style="font-size:9px;fill:var(--good)">VERIFY THE RIGHT CHUNK WAS RETRIEVED BEFORE BLAMING THE LLM</text>
</svg>` },

    { t: "exercise", kind: "analyse", title: "Diagnose the cause from span attributes alone", difficulty: "core", minutes: 30,
      body: "Write a diagnostic that reads the retriever and generation span attributes and names which of the six causes applies \u2014 without looking at the answer text. Run it over a set of failing traces and check how many it can classify unambiguously.",
      requirements: [
        "A rule per cause, keyed on span attributes rather than on the answer",
        "Run over several failing traces, reporting the cause for each",
        "Cases the attributes cannot distinguish, named as such",
        "The one cause that needs the answer text and not just attributes",
        "A statement of which attribute would resolve the ambiguous cases"
      ],
      hint: "A retrieval miss and lost-in-the-middle are distinguished by whether the gold chunk id appears in `chunk_ids` at all. Without a known gold chunk you cannot tell them apart, which is an argument for a labelled set.",
      solution: { lang: "python", title: "a span-attribute diagnostic", code: `TRACES = [
    # above_thr, top_score, gold_in_chunks, prompt_has_grounding, prompt_has_abstention,
    # index_age_days, temperature, n_chunks
    {"id": "t1", "above_thr": 0, "top_score": 0.31, "gold_in_chunks": False,
     "grounding": True,  "abstention": True,  "index_age": 2,  "temp": 0.0, "n_chunks": 5},
    {"id": "t2", "above_thr": 6, "top_score": 0.81, "gold_in_chunks": True,
     "grounding": False, "abstention": False, "index_age": 2,  "temp": 0.0, "n_chunks": 5},
    {"id": "t3", "above_thr": 9, "top_score": 0.79, "gold_in_chunks": True,
     "grounding": True,  "abstention": False, "index_age": 2,  "temp": 0.0, "n_chunks": 20},
    {"id": "t4", "above_thr": 6, "top_score": 0.83, "gold_in_chunks": True,
     "grounding": True,  "abstention": True,  "index_age": 412, "temp": 0.0, "n_chunks": 5},
    {"id": "t5", "above_thr": 6, "top_score": 0.80, "gold_in_chunks": True,
     "grounding": True,  "abstention": True,  "index_age": 2,  "temp": 0.9, "n_chunks": 5},
    {"id": "t6", "above_thr": 5, "top_score": 0.77, "gold_in_chunks": True,
     "grounding": True,  "abstention": True,  "index_age": 2,  "temp": 0.0, "n_chunks": 5},
]

def diagnose(t):
    """Order matters: check the data layer before the prompt layer."""
    if t["above_thr"] == 0 or not t["gold_in_chunks"]:
        return "1 retrieval miss", "above_thr=%d gold_present=%s" % (t["above_thr"], t["gold_in_chunks"])
    if t["index_age"] > 180:
        return "5 stale index", "newest doc is %d days old" % t["index_age"]
    if t["n_chunks"] > 10:
        return "4 lost in the middle", "%d chunks in the prompt" % t["n_chunks"]
    if not t["grounding"]:
        return "2 ungrounded prompt", "prompt lacks 'answer only from context'"
    if not t["abstention"]:
        return "3 no abstention path", "prompt lacks an 'I do not know' option"
    if t["temp"] > 0.3:
        return "6 context vs parametric", "temperature %.1f on a factual task" % t["temp"]
    return "UNRESOLVED", "attributes look healthy -- needs the answer text"

print("%-5s %-24s %s" % ("trace", "cause", "evidence"))
unresolved = []
for t in TRACES:
    cause, why = diagnose(t)
    if cause == "UNRESOLVED":
        unresolved.append(t["id"])
    print("%-5s %-24s %s" % (t["id"], cause, why))

print()
print("classified %d of %d from attributes alone"
      % (len(TRACES) - len(unresolved), len(TRACES)))
print("unresolved: %s" % (unresolved or "none"))

print()
print("-- what the unresolved case needs --")
print("t6 has the gold chunk, 5 chunks, a grounded prompt with abstention,")
print("temperature 0 and a fresh index. every attribute is healthy.")
print("so the remaining possibility is cause 6 WITHOUT a temperature signal:")
print("the model overrode its context at temp 0. that needs the answer text")
print("and an entailment check -- a CONTRADICTION against the retrieved chunk.")

print()
print("-- the ambiguity the attributes cannot remove --")
print("cause 1 (retrieval miss) and cause 4 (lost in the middle) both look like")
print("'the answer was not used'. they are separated ONLY by gold_in_chunks,")
print("which requires knowing the right answer's chunk id -- i.e. a labelled set.")
print("without one, every lost-in-the-middle case is misdiagnosed as a miss,")
print("and you tune retrieval that was already working.")`,
        out: `trace cause                    evidence
t1    1 retrieval miss         above_thr=0 gold_present=False
t2    2 ungrounded prompt      prompt lacks 'answer only from context'
t3    4 lost in the middle     20 chunks in the prompt
t4    5 stale index            newest doc is 412 days old
t5    6 context vs parametric  temperature 0.9 on a factual task
t6    UNRESOLVED               attributes look healthy -- needs the answer text

classified 5 of 6 from attributes alone
unresolved: ['t6']

-- what the unresolved case needs --
t6 has the gold chunk, 5 chunks, a grounded prompt with abstention,
temperature 0 and a fresh index. every attribute is healthy.
so the remaining possibility is cause 6 WITHOUT a temperature signal:
the model overrode its context at temp 0. that needs the answer text
and an entailment check -- a CONTRADICTION against the retrieved chunk.

-- the ambiguity the attributes cannot remove --
cause 1 (retrieval miss) and cause 4 (lost in the middle) both look like
'the answer was not used'. they are separated ONLY by gold_in_chunks,
which requires knowing the right answer's chunk id -- i.e. a labelled set.
without one, every lost-in-the-middle case is misdiagnosed as a miss,
and you tune retrieval that was already working.`,
        notes: [
          { t: "p", text: "**Five of six classify from attributes alone**, which is the useful result: a diagnostic that never reads the answer text still names the cause in most cases, so it can run on 100% of traffic as one of 10.11’s free tier-one checks." },
          { t: "p", text: "**The unresolved case is the genuinely model-side one.** `t6` has the gold chunk, five chunks, a grounded prompt with abstention, temperature 0 and a fresh index — every attribute healthy, and the answer still wrong. That is the model overriding its context at temperature 0, and it needs an entailment check on the answer text, which is 11.4." },
          { t: "p", text: "**`t3` has two causes and my diagnostic reports one.** It has 20 chunks *and* no abstention path, and the rule order returns lost-in-the-middle because the data layer is checked first. That ordering is deliberate and the limitation is real: a first-match diagnostic understates how many prompting problems exist, so I would report all matching rules rather than the first in production." },
          { t: "p", text: "**The ambiguity that attributes cannot remove is the important caveat.** A retrieval miss and lost-in-the-middle both present as ‘the answer was not used’, and only `gold_in_chunks` separates them — which requires knowing which chunk holds the answer. Without a labelled set every lost-in-the-middle case reads as a miss." },
          { t: "p", text: "That misdiagnosis has a specific and common consequence: you respond to an apparent miss by raising `top_k`, which improves recall and makes lost-in-the-middle worse. So the two causes are not merely confusable — confusing them pushes you towards the wrong fix." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "RAG only helps if the right context reaches the model **and** the model is forced to use it. Six causes cover almost all of it, and five are retrieval or prompting rather than the model: a retrieval miss (most common), an ungrounded prompt, no abstention path, lost in the middle, a stale index, and the model overriding its context." },
        { t: "p", text: "So verify the chunk before blaming the LLM \u2014 ten minutes with the retriever alone settles half the list. Add the abstention path first because it is cheap and converts a confident error into an honest refusal, then fix retrieval, and watch the abstention rate to know the second job is not finished." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cWe added RAG and it still hallucinates. What now?\u201d**" },
        { t: "p", text: "RAG only helps if the right context reaches the model and the model is forced to use it, so I would check those two things in that order rather than reaching for the prompt. In practice almost all of it falls into six causes, and five of them are retrieval or prompting rather than the model." },
        { t: "p", text: "The most common by a wide margin is a retrieval miss \u2014 the relevant chunk was never retrieved, so the model filled the gap from parametric memory. That is why I would start with the retriever on its own, with no model involved: run the failing questions and look at what comes back. If nothing clears the similarity threshold, the prompt is irrelevant." },
        { t: "p", text: "Then the two prompting causes, which are nearly free. An ungrounded prompt never says \u2018answer only from this context\u2019, and a missing abstention path never lets the model say \u2018that is not in the documents\u2019. The second is the one people treat as a nicety and it is a top cause \u2014 because of what the objective rewards, a model with no permission to abstain *must* guess. One paragraph in the system prompt removes a large fraction of RAG hallucinations." },
        { t: "p", text: "But I would be careful not to let abstention be mistaken for a fix. If the real cause is a retrieval miss, abstention converts a confident wrong answer into \u2018I do not have that information\u2019, which is better and still a failure \u2014 the user asked something the corpus could answer. That is why abstention rate is a metric in both directions: too low means overconfidence, too high means retrieval is weak." },
        { t: "p", text: "The remaining three: lost in the middle, where the right chunk is at rank eight in a huge prompt and gets ignored \u2014 and notably this often follows someone *raising* `top_k` to fix a miss. A stale index, where the document is itself wrong, which produces perfect faithfulness and false answers. And the context-versus-parametric conflict, where the model has strongly memorised something else; nothing in the architecture privileges the context, it is just more tokens, so you instruct precedence explicitly and lower the temperature." },
        { t: "p", text: "One thing I would flag as a measurement limitation: a retrieval miss and lost-in-the-middle both look like \u2018the answer was not used\u2019 from the span attributes, and they are separated only by whether the gold chunk id appears in the retrieved set at all. That requires a labelled set. Without one you misdiagnose every lost-in-the-middle case as a miss and tune retrieval that was already working." }
      ] }
  ],

  takeaways: [
    "**RAG only helps if the right context reaches the model and the model is forced to use it** \u2014 both halves fail independently.",
    "**A retrieval miss is the most common cause by a wide margin**, and the model then fills the gap from parametric memory.",
    "**Five of the six causes are retrieval or prompting**, not the model.",
    "**Verify the right chunk was retrieved before blaming the LLM** \u2014 ten minutes with the retriever alone settles half the list.",
    "**A model with no permission to abstain must guess**, because every continuation satisfying the instruction is a claim.",
    "**Adding an abstention path is one paragraph** and removes a large fraction of RAG hallucinations.",
    "**But abstention without a retrieval fix converts one failure into another** \u2014 an honest refusal to an answerable question.",
    "**Abstention rate is a two-sided metric**: too low means overconfidence, too high means retrieval is weak.",
    "**Lost in the middle often follows raising `top_k`** to fix a miss \u2014 more context is not better context.",
    "**A stale index produces perfect faithfulness and false answers**, which is a factuality failure owned by the corpus.",
    "**Nothing in the architecture privileges the context** \u2014 it is just more tokens, so precedence must be instructed.",
    "**A conflict *inside* the context is worse**: retrieval looks perfect, both documents are returned, and the model picks one."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "What is the most common cause of hallucination in a RAG system?",
        options: [
          "The model overriding its context with memorised knowledge",
          "A retrieval miss \u2014 the relevant chunk was never retrieved, so the model filled the gap from parametric memory",
          "An ungrounded prompt that fails to say \u201canswer only from this context\u201d",
          "Lost in the middle, where the right chunk is present but ignored"
        ],
        answer: 1,
        why: "The chunk never arriving is by a wide margin the dominant cause, which is why the first diagnostic step is running the retriever with no model on the failing questions \u2014 if nothing clears the similarity threshold, no amount of prompt work is relevant. The other three are real and less frequent, and the key consequence is that \u201challucination despite RAG\u201d is usually a retrieval or prompting problem rather than a model problem." },

      { stem: "Why is a missing abstention path a top cause rather than a minor omission?",
        options: [
          "Because users prefer an explicit refusal to a hedged answer",
          "Because the objective rewards a plausible continuation, so if no \u201cI cannot answer\u201d output is permitted, every allowed continuation is a claim",
          "Because abstention reduces output tokens and therefore cost",
          "Because providers penalise models that do not abstain"
        ],
        answer: 1,
        why: "This follows directly from the mechanism: the model has no state representing \u201cI do not know\u201d, so the only way it can decline is if declining is in the instruction set as an acceptable output. Without that, guessing is the only behaviour consistent with the instruction, and adding one paragraph of permission removes a large fraction of RAG hallucinations at essentially no cost." },

      { stem: "You add an abstention path and the abstention rate jumps to 30%. What does that tell you?",
        options: [
          "The abstention instruction is too aggressive and should be softened",
          "Retrieval is weak \u2014 abstention converted confident wrong answers into honest refusals, but the underlying cause is unfixed",
          "The model is now correctly calibrated and the work is done",
          "The faithfulness gate threshold is set too high"
        ],
        answer: 1,
        why: "Abstention is mitigation rather than a fix: when the dominant cause is a retrieval miss, giving the model permission to decline changes the failure mode without removing the failure, because the user asked something the corpus could answer. That is why abstention rate is tracked in both directions \u2014 a rate near zero suggests overconfidence, and a spike is a retrieval alarm pointing at recall rather than at the prompt." },

      { stem: "Why can span attributes alone fail to distinguish a retrieval miss from lost-in-the-middle?",
        options: [
          "Because both produce an above-threshold count of zero",
          "Because they are separated only by whether the gold chunk id is in the retrieved set, which requires a labelled set",
          "Because chunk ids are not recorded on the retriever span",
          "Because lost-in-the-middle only occurs with top_k above 20"
        ],
        answer: 1,
        why: "Both present as \u201cthe answer was not used,\u201d and the distinguishing fact is whether the correct chunk was retrieved at all \u2014 which you cannot know without knowing which chunk holds the answer. The practical consequence is that teams without a labelled set misdiagnose lost-in-the-middle as a miss and then tune retrieval that was already working, often by raising top_k, which makes lost-in-the-middle worse." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Why RAG still hallucinates",
    questions: [
      { level: "core",
        q: "Your RAG system hallucinates. Is that a model problem?",
        strong: "A strong answer says almost never, and gives the split.",
        answer: [
          { t: "p", text: "Almost never. Of the six causes that account for nearly all of it, three are retrieval \u2014 a miss, lost in the middle, a stale index \u2014 and two are prompting: an ungrounded prompt and no abstention path. Only the sixth, the model overriding its context, is arguably the model, and that is mostly fixed with an instruction and a temperature setting." },
          { t: "p", text: "So the reflex is to verify the chunk before blaming the LLM. Running the retriever on its own against the failing questions takes ten minutes and settles half the list \u2014 if nothing cleared the similarity threshold, the prompt was never the issue." },
          { t: "p", text: "The most common single cause is a retrieval miss, where the chunk never arrived and the model filled the gap from parametric memory. That is a recall problem." },
          { t: "p", text: "And I would check for the self-inflicted version: someone raising `top_k` to fix a miss, which fixes recall and introduces lost-in-the-middle. More context is not better context." }
        ] },

      { level: "core",
        q: "What single change reduces RAG hallucination most for the least work?",
        strong: "A strong answer picks abstention and then qualifies it.",
        answer: [
          { t: "p", text: "An explicit abstention path in the system prompt \u2014 permission to reply \u2018I do not have that information in the provided documents\u2019. It is one paragraph and it removes a large fraction of RAG hallucinations." },
          { t: "p", text: "The reason it works is mechanical rather than motivational. The objective rewards a plausible continuation, so if no \u2018I cannot answer\u2019 output is permitted, every continuation that satisfies the instruction is a claim. Abstention has to be in the instruction set to be available at all." },
          { t: "p", text: "The qualification matters though: if the dominant cause is a retrieval miss, abstention converts a confident wrong answer into an honest refusal to a question the corpus could answer. Better, and still a failure." },
          { t: "p", text: "So I would ship it first because it stops the bleeding, and watch the abstention rate as a retrieval alarm. A rate near zero means overconfidence; a spike means recall is weak." }
        ] },

      { level: "advanced",
        q: "Both an old policy document and its replacement are retrieved. What happens?",
        strong: "A strong answer notes that every retrieval metric looks fine.",
        answer: [
          { t: "p", text: "Retrieval works flawlessly and that is the problem. Both documents are genuinely relevant, so precision and recall both look healthy, and the model is handed two contradictory contexts and picks one \u2014 sometimes the wrong one." },
          { t: "p", text: "It is the subtlest of the six because no metric fires. Context recall is high, context precision is high, faithfulness may well be high too since the answer is faithful to *one* of the retrieved documents." },
          { t: "p", text: "So it cannot be fixed in the prompt or by tuning the retriever. It needs recency metadata and a filter on it, or a supersede step at ingest that removes the old version rather than adding the new one beside it." },
          { t: "p", text: "Which makes it a corpus problem, and corpus problems are where most \u2018the AI got worse\u2019 incidents actually live \u2014 the data layer is the one to verify before looking at the model at all." }
        ] }
    ]
  }
});
