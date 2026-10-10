EC.receiveLesson({
  id: "11.5",

  lede: "No single fix works \u2014 layer them, cheapest first. And \u201ccheapest\u201d has to mean cheap in **latency and refusals**, not just in tokens: 11.4 measured the faithfulness gate everybody reaches for at **739 ms per claim**, which is 9x over a 10% latency budget. So the layers that actually ship are the three that cost nothing: a grounded prompt with an abstention path, citation validation, and decoding settings. The gate is the fourth layer, and it is the one with a bill.",

  objectives: [
    "Order the mitigations by what each costs in latency and refusals",
    "Write a grounded system prompt with an explicit abstention path",
    "Decide what a faithfulness gate should do when it fires",
    "Recognise when a blocking gate is affordable and when it must be async",
    "Place human review where it earns its cost"
  ],

  prerequisites: ["11.4"],

  blocks: [

    { t: "h2", n: "01", id: "layer1", text: "Layer 1 \u2014 Ground the prompt, and allow abstention",
      sub: "Free, and the largest single win" },

    { t: "code", lang: "text", title: "The grounded system prompt", code: `Answer the question using ONLY the provided context.
Rules:
1. If the answer is not in the context, reply exactly:
   "I don't have that information in the provided documents."
2. Do not use outside knowledge or assumptions.
3. Cite the chunk id [n] after each claim.
4. Prefer a short, exact answer over a long, padded one.`,
      hl: [3, 4],
      caption: "Rule 1 is the abstention path. 11.2 argued it is a top cause, not a nicety." },

    { t: "callout", kind: "good", title: "Four rules, four different failures",
      body: [
        { t: "p", text: "Each line targets a specific cause from 11.2. \u201cONLY the provided context\u201d fixes the ungrounded prompt. Rule 1 supplies the abstention path. Rule 2 addresses the context-versus-parametric conflict by instructing precedence. Rule 3 makes citation validation possible at all, and rule 4 caps the length-driven confabulation from 11.3\u2019s third scenario." },
        { t: "p", text: "That is four of the six causes addressed in seven lines of prompt, at zero latency and zero marginal cost. The remaining two \u2014 a retrieval miss and a stale index \u2014 are not prompting problems and cannot be fixed here." },
        { t: "p", text: "Note the exact wording requirement in rule 1. Specifying the precise abstention string is what makes abstention **measurable** \u2014 11.6 counts it with a substring match, and a model that abstains in freely varying prose cannot be counted." }
      ] },

    { t: "h2", n: "02", id: "layer2", text: "Layer 2 \u2014 Require and verify citations",
      sub: "Free, and it only proves half of what you want" },

    { t: "code", lang: "python", title: "Citation validation", code: `def validate_citations(answer: str, retrieved_ids: set[str]) -> bool:
    import re
    cited = set(re.findall(r"\\[(\\w+)\\]", answer))
    # every citation must map to an actually-retrieved chunk
    return cited.issubset(retrieved_ids) and len(cited) > 0`,
      caption: "Reject or regenerate any answer citing a chunk that was not retrieved \u2014 that is a fabricated source." },

    { t: "callout", kind: "insight", title: "A citation is a pointer, not a proof",
      body: [
        { t: "p", text: "11.3 measured this directly: an answer citing a real, retrieved chunk while claiming the opposite of what the chunk says **passes the subset check cleanly**. The check establishes that the pointer resolves, which is enough to reject a fabricated source and nothing more." },
        { t: "p", text: "So citation accuracy needs two checks, and the metric table says so \u2014 validate the cited ids *and* run entailment. The first is free and structural; the second is layer 4 and has a latency bill." },
        { t: "p", text: "One practical trap from the same measurement: a validator written for opaque ids like `c12` finds **zero citations** in `[refund-policy]`, because `\\w` does not match a hyphen \u2014 and then reports \u2018no citations\u2019 rather than \u2018unparseable\u2019. Test the regex against your actual citation style before trusting the metric." }
      ] },

    { t: "h2", n: "03", id: "layer3", text: "Layer 3 \u2014 Decode for faithfulness, not creativity",
      sub: "Free, and it bounds two failures at once" },

    { t: "dl", items: [
      { k: "Lower temperature (0\u20130.3) for factual tasks", v: "Less random invention, and it addresses the context-versus-parametric conflict \u2014 1.1 measured how much the sampling distribution widens with temperature, and a factual task wants none of that width." },
      { k: "Cap `max_tokens`", v: "So the model cannot run past supported content and confabulate. This is the direct fix for 11.3\u2019s third scenario, and 11.8 shows it is also the second-largest cost lever \u2014 the same setting serves both goals." },
      { k: "Structured output / JSON mode", v: "So it cannot free-text its way into claims. A schema with a nullable field is also an abstention path that cannot be ignored, which is stronger than a prose instruction." }
    ] },

    { t: "callout", kind: "good", title: "Capping output is the rare setting that improves quality *and* cost",
      body: [
        { t: "p", text: "Most mitigations trade something. This one does not: 11.3\u2019s confabulation was caused by a length target longer than the supported content, and 11.8 measures output tokens at 13% of the baseline bill rising to 27% once the input levers are applied. Capping serves faithfulness and the budget together." },
        { t: "p", text: "The structured-output point deserves emphasis because it is stronger than it looks. A prose instruction to abstain can be overridden by the pull of a plausible continuation; a JSON schema where `answer` is nullable and `unsupported: true` is a valid response makes abstention a **structurally available** output rather than a request." },
        { t: "p", text: "That is the same reasoning as 11.1\u2019s mechanism. The model emits what the instruction space permits, so the reliable way to make abstention happen is to make it the easiest valid output rather than a discouraged one." }
      ] },

    { t: "h2", n: "04", id: "layer4", text: "Layer 4 \u2014 The faithfulness gate",
      sub: "The first layer with a bill" },

    { t: "code", lang: "python", title: "Verify-then-serve", code: `def answer_with_gate(question, retrieve, generate, entails, threshold=0.9):
    chunks = retrieve(question)
    context = "\\n".join(c.text for c in chunks)
    answer = generate(question, context)

    f = faithfulness_score(answer, context, entails)
    if f["score"] < threshold:
        # Don't serve a hallucination. Options, in order of preference:
        #  (a) regenerate with stricter prompt, (b) drop unsupported claims,
        #  (c) abstain and escalate to a human.
        return {"answer": "I'm not fully certain - let me connect you to a specialist.",
                "blocked": True, "faithfulness": f["score"]}
    return {"answer": answer, "blocked": False, "faithfulness": f["score"]}`,
      hl: [7, 8, 9],
      caption: "Three responses to a low score, and the choice between them is a product decision." },

    { t: "callout", kind: "tradeoff", title: "This is where the measured latency bites",
      body: [
        { t: "p", text: "11.4 timed `roberta-large-mnli` at **739 ms per claim** on CPU, so a four-claim answer costs **2,957 ms** against a 3,134 ms request \u2014 a 94% latency increase. An LLM judge instead is about 1,100 ms, still 35%. Neither fits a blocking path without a GPU or a small model." },
        { t: "p", text: "Which means verify-then-serve as written is not deployable on commodity hardware, and the honest options are: a small NLI model, a GPU, gating only the high-stakes subset, or **restructuring it as async with retraction** \u2014 serve the answer, score it afterwards, and correct or escalate if it fails." },
        { t: "p", text: "The threshold of 0.9 also deserves a look. With a four-sentence answer, claims are scored in quarters \u2014 0.75 or 1.0, nothing between \u2014 so a 0.9 threshold is exactly \u2018zero unsupported claims\u2019. On a ten-claim answer it means \u2018at most one\u2019. The threshold\u2019s meaning depends on the answer length, which is worth knowing before tuning it." }
      ] },

    { t: "callout", kind: "warn", title: "And the three remedies have very different costs",
      body: [
        { t: "p", text: "**Regenerating** doubles the generation cost and latency and may fail again, which on a retrieval miss it certainly will \u2014 the context is still missing the answer. **Dropping unsupported claims** is cheap and leaves a possibly incoherent answer with a hole in it. **Abstaining and escalating** is honest, costs a human, and is the only one that works when the cause is upstream." },
        { t: "p", text: "The common list has them in order of preference and I would reverse that for a retrieval miss specifically. Regenerating against the same insufficient context is the one option that cannot work, and it is listed first." },
        { t: "p", text: "So the useful rule is to pick the remedy from the **cause**, which 11.2\u2019s diagnostic gives you from span attributes: regenerate on an ungrounded prompt, drop claims on a long-output confabulation, and abstain when `above_threshold` is zero." }
      ] },

    { t: "h2", n: "05", id: "layer5", text: "Layer 5 \u2014 Humans, where they earn it",
      sub: "High-stakes only" },

    { t: "callout", kind: "mental", title: "Sample for review; require approval only before acting",
      body: [
        { t: "p", text: "Medical, legal and financial outputs want expert review, and the distinction that keeps it affordable is between **reviewing a sample** and **approving every action**. Sampling catches drift and calibrates the automated signals; approval blocks a specific irreversible step." },
        { t: "p", text: "10.11 priced the sampling side: human review on the worst twenty a day, selected by the automated scores, is the tier that makes everything above it trustworthy \u2014 and it is the tier teams drop first." },
        { t: "p", text: "Approval is different and belongs on the action, not the answer. An LLM producing a payment amount does not need a human to read it; the payment needs a human to authorise it. That is a least-privilege question rather than a hallucination question." }
      ] },

    { t: "viz", title: "Five layers, ordered by what each costs", caption: "Three are free. The gate costs 94% of request latency as measured.",
      svg: `<svg viewBox="0 0 760 320" width="100%" role="img" aria-label="Five hallucination mitigation layers ordered by cost">
  <rect x="16" y="26" width="728" height="40" rx="4" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="28" y="44" class="s-mono" style="font-size:10px;fill:var(--good)">1 &#183; GROUNDED PROMPT + ABSTENTION PATH</text>
  <text x="430" y="44" class="s-mono" style="font-size:9px;fill:var(--good)">FREE &#183; 0 ms</text>
  <text x="28" y="59" class="s-sub">fixes 4 of the 6 causes in 7 lines &#8212; ungrounded prompt, no abstention, precedence, length</text>

  <rect x="16" y="72" width="728" height="40" rx="4" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="28" y="90" class="s-mono" style="font-size:10px;fill:var(--good)">2 &#183; REQUIRE + VERIFY CITATIONS</text>
  <text x="430" y="90" class="s-mono" style="font-size:9px;fill:var(--good)">FREE &#183; &lt;1 ms</text>
  <text x="28" y="105" class="s-sub">rejects a FABRICATED source &#183; a real id on a wrong claim still passes &#8212; a pointer, not a proof</text>

  <rect x="16" y="118" width="728" height="40" rx="4" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="28" y="136" class="s-mono" style="font-size:10px;fill:var(--good)">3 &#183; DECODE FOR FAITHFULNESS</text>
  <text x="430" y="136" class="s-mono" style="font-size:9px;fill:var(--good)">FREE &#183; saves cost</text>
  <text x="28" y="151" class="s-sub">temp 0-0.3 &#183; cap max_tokens &#183; JSON mode makes abstention STRUCTURALLY available</text>

  <rect x="16" y="164" width="728" height="54" rx="4" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.8"/>
  <text x="28" y="182" class="s-mono" style="font-size:10px;fill:var(--crit)">4 &#183; FAITHFULNESS GATE (verify-then-serve)</text>
  <text x="430" y="182" class="s-mono" style="font-size:9px;fill:var(--crit)">MEASURED +2,957 ms = +94%</text>
  <text x="28" y="198" class="s-mono" style="font-size:8px">739 ms per claim on CPU &#183; an LLM judge instead is ~1,100 ms = +35%</text>
  <text x="28" y="211" class="s-sub">not deployable blocking without a GPU or a small model &#8212; otherwise async with retraction</text>

  <rect x="16" y="224" width="728" height="40" rx="4" class="s-fill-bg" style="stroke:var(--violet)" stroke-width="1.5"/>
  <text x="28" y="242" class="s-mono" style="font-size:10px;fill:var(--violet)">5 &#183; HUMAN IN THE LOOP</text>
  <text x="430" y="242" class="s-mono" style="font-size:9px;fill:var(--violet)">a person's time</text>
  <text x="28" y="257" class="s-sub">SAMPLE for review (calibrates everything above) &#183; APPROVE only before an irreversible action</text>

  <rect x="16" y="274" width="728" height="40" rx="4" class="s-fill-bg" style="stroke:var(--warn)" stroke-width="1.5"/>
  <text x="28" y="292" class="s-mono" style="font-size:9px;fill:var(--warn)">AND PICK THE REMEDY FROM THE CAUSE, NOT FROM A PREFERENCE ORDER</text>
  <text x="28" y="307" class="s-mono" style="font-size:8px">regenerate on an ungrounded prompt &#183; drop claims on a long-output drift &#183; ABSTAIN when above_threshold = 0</text>
</svg>` },

    { t: "exercise", kind: "build", title: "Order the layers by measured cost, and pick remedies by cause", difficulty: "advanced", minutes: 35,
      body: "Build the layered pipeline, attach the measured cost of each layer, and compute what fraction of hallucinations each layer catches on your own classified set. Then implement remedy selection driven by the diagnosed cause rather than by a fixed preference order.",
      requirements: [
        "Each layer with its latency cost, measured or cited",
        "The share of a classified hallucination set each layer addresses",
        "A faithfulness gate with its threshold interpreted against answer length",
        "Remedy selection keyed on the diagnosed cause",
        "A statement of which layers you would ship blocking and which async"
      ],
      hint: "The gate's threshold is quantised by the number of claims. On a four-claim answer the only achievable scores are 0, 0.25, 0.5, 0.75 and 1.0, so a 0.9 threshold means exactly \u201czero unsupported\u201d.",
      solution: { lang: "python", title: "the layered pipeline, costed", code: `LAYERS = [
    # name, latency_ms, causes addressed (from 11.2), blocking?
    ("grounded prompt + abstention", 0.0,    {"ungrounded", "no_abstention",
                                              "parametric_conflict", "long_output"}, True),
    ("citation validation",          0.4,    {"fabricated_source"},                  True),
    ("decode settings",              0.0,    {"long_output", "parametric_conflict"}, True),
    ("faithfulness gate (NLI)",      2957.0, {"ungrounded", "long_output",
                                              "parametric_conflict", "retrieval_miss"}, False),
    ("human review (sampled)",       0.0,    {"all"},                                False),
]

# a classified set of 20 real hallucinations
CAUSES = {"retrieval_miss": 9, "ungrounded": 3, "no_abstention": 3,
          "long_output": 2, "parametric_conflict": 2, "fabricated_source": 1}
TOTAL = sum(CAUSES.values())

print("%-32s %10s %10s  %s" % ("layer", "latency", "catches", "blocking?"))
cum = set()
for name, ms, causes, blocking in LAYERS:
    if "all" in causes:
        catches = TOTAL
    else:
        catches = sum(n for c, n in CAUSES.items() if c in causes)
        cum |= causes
    print("%-32s %9.1fms %9d%%  %s"
          % (name, ms, round(100.0 * catches / TOTAL), "yes" if blocking else "NO"))

free = [l for l in LAYERS if l[1] < 1.0 and l[3]]
free_causes = set()
for _, _, c, _ in free:
    free_causes |= c
free_catch = sum(n for c, n in CAUSES.items() if c in free_causes)
print()
print("the three FREE blocking layers together address %d of %d (%.0f%%)"
      % (free_catch, TOTAL, 100.0 * free_catch / TOTAL))
print("at a combined latency of %.1f ms" % sum(l[1] for l in free))
print()
print("what they CANNOT address: retrieval_miss (%d of %d = %.0f%%)"
      % (CAUSES["retrieval_miss"], TOTAL, 100.0 * CAUSES["retrieval_miss"] / TOTAL))
print("  -> the largest single cause is not a prompting problem at all.")

# ---------------------------------------------------- the threshold is quantised
print()
print("=" * 70)
print("THE GATE THRESHOLD IS QUANTISED BY CLAIM COUNT")
print("=" * 70)
for n_claims in (2, 4, 8, 20):
    scores = [round(1 - k / n_claims, 3) for k in range(n_claims + 1)]
    shown = scores[:5] + (["..."] if len(scores) > 5 else [])
    allowed = sum(1 for s in scores if s >= 0.9)
    print("  %2d claims: achievable scores %s" % (n_claims, shown))
    print("             a 0.9 threshold permits %d unsupported claim(s)"
          % (allowed - 1))
print()
print("so 'threshold 0.9' means 'zero unsupported' on a 4-claim answer and")
print("'at most two' on a 20-claim one. the threshold's MEANING depends on")
print("answer length, which is an argument for an absolute count instead.")

# ---------------------------------------------------- remedy by cause
print()
print("=" * 70)
print("REMEDY BY CAUSE, NOT BY PREFERENCE ORDER")
print("=" * 70)
REMEDY = {
    "retrieval_miss":      ("abstain + escalate", "regenerating cannot help -- the context is still missing the answer"),
    "ungrounded":          ("regenerate stricter", "the context HAS the answer; the prompt failed to force its use"),
    "no_abstention":       ("regenerate stricter", "same -- add the abstention path and retry"),
    "long_output":         ("drop unsupported claims", "the early claims are good; only the tail is invented"),
    "parametric_conflict": ("regenerate at temp 0", "instruct precedence and remove sampling width"),
    "fabricated_source":   ("regenerate stricter", "citations must map to retrieved ids"),
}
for cause, n in sorted(CAUSES.items(), key=lambda kv: -kv[1]):
    remedy, why = REMEDY[cause]
    print("  %-20s n=%-2d -> %-24s %s" % (cause, n, remedy, why))

print()
print("the common list has remedies in a FIXED preference order:")
print("  (a) regenerate  (b) drop unsupported claims  (c) abstain and escalate")
print("and for the largest cause that order is exactly wrong -- regenerating")
print("against the same insufficient context is the one option that cannot work,")
print("and it is listed first. %d of %d cases (%.0f%%) need (c)."
      % (CAUSES["retrieval_miss"], TOTAL, 100.0 * CAUSES["retrieval_miss"] / TOTAL))`,
        out: `layer                               latency    catches  blocking?
grounded prompt + abstention           0.0ms        50%  yes
citation validation                    0.4ms         5%  yes
decode settings                        0.0ms        20%  yes
faithfulness gate (NLI)             2957.0ms        80%  NO
human review (sampled)                 0.0ms       100%  NO

the three FREE blocking layers together address 11 of 20 (55%)
at a combined latency of 0.4 ms

what they CANNOT address: retrieval_miss (9 of 20 = 45%)
  -> the largest single cause is not a prompting problem at all.

======================================================================
THE GATE THRESHOLD IS QUANTISED BY CLAIM COUNT
======================================================================
   2 claims: achievable scores [1.0, 0.5, 0.0]
             a 0.9 threshold permits 0 unsupported claim(s)
   4 claims: achievable scores [1.0, 0.75, 0.5, 0.25, 0.0]
             a 0.9 threshold permits 0 unsupported claim(s)
   8 claims: achievable scores [1.0, 0.875, 0.75, 0.625, 0.5, '...']
             a 0.9 threshold permits 0 unsupported claim(s)
  20 claims: achievable scores [1.0, 0.95, 0.9, 0.85, 0.8, '...']
             a 0.9 threshold permits 2 unsupported claim(s)

so 'threshold 0.9' means 'zero unsupported' on a 4-claim answer and
'at most two' on a 20-claim one. the threshold's MEANING depends on
answer length, which is an argument for an absolute count instead.

======================================================================
REMEDY BY CAUSE, NOT BY PREFERENCE ORDER
======================================================================
  retrieval_miss       n=9  -> abstain + escalate       regenerating cannot help -- the context is still missing the answer
  ungrounded           n=3  -> regenerate stricter      the context HAS the answer; the prompt failed to force its use
  no_abstention        n=3  -> regenerate stricter      same -- add the abstention path and retry
  long_output          n=2  -> drop unsupported claims  the early claims are good; only the tail is invented
  parametric_conflict  n=2  -> regenerate at temp 0     instruct precedence and remove sampling width
  fabricated_source    n=1  -> regenerate stricter      citations must map to retrieved ids

the common list has remedies in a FIXED preference order:
  (a) regenerate  (b) drop unsupported claims  (c) abstain and escalate
and for the largest cause that order is exactly wrong -- regenerating
against the same insufficient context is the one option that cannot work,
and it is listed first. 9 of 20 cases (45%) need (c).`,
        notes: [
          { t: "p", text: "**The three free blocking layers address 55% of the set at 0.4 ms combined.** That is the headline: more than half the hallucinations in a classified sample are reachable without a model call, a judge or a GPU — and the latency is a rounding error against a three-second request." },
          { t: "p", text: "**And what they cannot reach is the largest single cause.** Retrieval misses are 45% of the set and no prompt fixes them: the context does not contain the answer, so grounding, citations and decoding settings all have nothing to work with. The best the free layers can do there is convert a wrong answer into an abstention." },
          { t: "p", text: "**The threshold quantisation is sharper than I expected.** A 0.9 gate permits zero unsupported claims at 2, 4 *and* 8 claims — the first length at which it permits any is 20. So the threshold is effectively zero-tolerance across every realistic answer length and only loosens on very long outputs, which is the opposite of what a reader would assume from the number." },
          { t: "p", text: "**The remedy table is where the ordering goes wrong.** Its preference order puts regeneration first, and 45% of cases need the option listed last. Regenerating against the same insufficient context either reproduces the hallucination or abstains after paying twice for generation." },
          { t: "p", text: "**The gate catches 80% and cannot be deployed blocking**, which is the tension this lesson is really about. The highest-coverage layer is the one with a 94% latency cost, so the design question is not whether to have it but where to run it — async, on a subset, or on faster hardware." },
          { t: "p", text: "One limit of the arithmetic: I assigned each cause to layers by hand, so ‘catches’ means ‘is the kind of failure this layer targets’ rather than a measured detection rate. A grounded prompt addresses the ungrounded-prompt cause by construction and will not fix every instance of it." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Layer the mitigations cheapest first, where cheap means latency and refusals rather than tokens. Three layers are free: a grounded prompt with an abstention path (which addresses four of the six causes in seven lines), citation validation, and decoding settings \u2014 and capping output improves faithfulness and cost together." },
        { t: "p", text: "The faithfulness gate is the first layer with a bill, measured at +94% request latency, so it needs a GPU, a small model, a high-stakes subset, or an async-with-retraction design. And pick the remedy from the diagnosed cause: regenerating against the same insufficient context cannot work, which is the most common case and the first-listed option." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cHow would you reduce hallucination in a system that is already live?\u201d**" },
        { t: "p", text: "Layered, cheapest first \u2014 and I would define cheap as latency and refusals rather than tokens, because the obvious intervention is the expensive one." },
        { t: "p", text: "The first layer is a grounded system prompt with an explicit abstention path, and it is remarkable value: seven lines addressing four of the six causes. \u2018Answer only from the provided context\u2019 fixes the ungrounded prompt, an exact abstention string supplies the missing out, \u2018do not use outside knowledge\u2019 instructs precedence over parametric memory, and \u2018prefer a short exact answer\u2019 caps the length-driven drift. Zero latency, zero marginal cost. I would specify the abstention wording exactly, because that is what makes abstention rate countable later." },
        { t: "p", text: "Second, require citations and validate that every cited id was actually retrieved. That rejects a fabricated source for four lines of code \u2014 but I would be clear it is a pointer check, not a proof. An answer citing a real chunk while claiming the opposite passes cleanly, which I have measured." },
        { t: "p", text: "Third, the decoding settings: temperature at or near zero for factual work, a cap on `max_tokens`, and structured output where possible. The cap is the rare change that improves quality and cost together, and JSON mode is stronger than a prose instruction because a nullable answer field makes abstention structurally available rather than merely requested." },
        { t: "p", text: "The faithfulness gate comes fourth, and this is where I would push back on the usual design. I measured a large NLI model at 739 milliseconds per claim on CPU \u2014 about three seconds for a four-claim answer, a 94% latency increase, and roughly 2.7 times slower than an LLM judge call. So verify-then-serve as normally written is not deployable on commodity hardware. The honest options are a small NLI model, a GPU, gating only the high-stakes subset, or restructuring as async with retraction: serve, score afterwards, and correct or escalate." },
        { t: "p", text: "And I would choose the remedy from the diagnosed cause rather than a fixed preference order. The usual list is regenerate, then drop unsupported claims, then abstain \u2014 and for the most common cause, a retrieval miss, regenerating against the same insufficient context is the one thing that cannot work. If the retriever returned nothing above threshold, abstain and escalate; if the context had the answer and the prompt failed, regenerate; if a long output drifted at the end, drop the tail." }
      ] }
  ],

  takeaways: [
    "**Layer the mitigations cheapest first**, where cheap means latency and refusals, not tokens.",
    "**A grounded prompt with an abstention path addresses four of the six causes in seven lines**, at zero cost.",
    "**Specify the abstention wording exactly**, because that is what makes abstention rate countable.",
    "**Citation validation rejects a fabricated source for four lines** \u2014 and a real id on a wrong claim still passes.",
    "**Capping `max_tokens` improves faithfulness and cost together**, which is rare among mitigations.",
    "**JSON mode makes abstention structurally available**, which is stronger than a prose instruction that can be overridden.",
    "**The faithfulness gate is the first layer with a bill**: measured +2,957 ms, a 94% latency increase.",
    "**An LLM judge gate is +35%** \u2014 cheaper than NLI on CPU, and still not free.",
    "**So verify-then-serve needs a GPU, a small model, a high-stakes subset, or an async-with-retraction design.**",
    "**A 0.9 threshold means \u201czero unsupported\u201d on a four-claim answer** and \u201cat most two\u201d on a twenty-claim one \u2014 the meaning depends on length.",
    "**Pick the remedy from the diagnosed cause**, not a fixed preference order.",
    "**Regenerating against the same insufficient context cannot work**, and it is the first option in the usual list."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Which single mitigation addresses the most causes for the least cost?",
        options: [
          "The faithfulness gate, because it catches any unsupported claim regardless of cause",
          "A grounded system prompt with an explicit abstention path \u2014 four of the six causes in seven lines, at zero latency",
          "Citation validation, because fabricated sources are the most common failure",
          "Lowering temperature to zero, because it removes sampling randomness"
        ],
        answer: 1,
        why: "The four rules each target a distinct cause: answering only from context fixes the ungrounded prompt, an exact abstention string supplies the missing option, forbidding outside knowledge instructs precedence over parametric memory, and preferring a short exact answer caps length-driven drift. The gate catches more kinds of failure but costs a measured 94% latency increase, and fabricated sources are among the rarer causes." },

      { stem: "Why is a 0.9 faithfulness threshold ambiguous?",
        options: [
          "Because different entailment models calibrate differently",
          "Because the score is quantised by claim count \u2014 on a four-claim answer it means \u201czero unsupported\u201d, on a twenty-claim answer \u201cat most two\u201d",
          "Because claims of different lengths should be weighted differently",
          "Because 0.9 is below the typical supported-claim entailment score"
        ],
        answer: 1,
        why: "With n claims the only achievable scores are multiples of 1/n, so the threshold's practical meaning shifts with answer length: a four-sentence answer can only score 0, 0.25, 0.5, 0.75 or 1.0, making 0.9 equivalent to a zero-tolerance rule. A longer answer silently becomes more permissive under the same threshold, which is an argument for expressing the gate as an absolute count of unsupported claims." },

      { stem: "A faithfulness gate fires on an answer where the retriever returned nothing above threshold. What remedy?",
        options: [
          "Regenerate with a stricter prompt, as the usual preference order suggests",
          "Abstain and escalate \u2014 regenerating against the same insufficient context cannot succeed",
          "Drop the unsupported claims and serve what remains",
          "Lower the gate threshold, since the context is weak"
        ],
        answer: 1,
        why: "The cause is upstream: the context does not contain the answer, so a stricter prompt produces either the same hallucination or an abstention after paying twice for generation. The standard list puts regeneration first, which is exactly wrong for the single most common cause \u2014 which is why the remedy should be selected from the diagnosed cause, available for free from the retriever span attributes." },

      { stem: "Why is JSON mode a stronger abstention mechanism than a prose instruction?",
        options: [
          "Because structured output uses fewer tokens",
          "Because a nullable answer field makes abstention a structurally available output rather than a discouraged one",
          "Because JSON cannot contain fabricated facts",
          "Because schema validation runs before the model generates"
        ],
        answer: 1,
        why: "The model emits what the instruction space permits, so a prose request to abstain competes against the pull of a plausible continuation, while a schema in which `answer: null` with `unsupported: true` is valid makes declining the easiest well-formed response. It also composes with validation: a response that does not fit the schema is rejected mechanically rather than judged. JSON still carries fabricated field values perfectly well." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Mitigation in depth",
    questions: [
      { level: "core",
        q: "What do you do first to reduce hallucination?",
        strong: "A strong answer picks the free layer and explains the four rules.",
        answer: [
          { t: "p", text: "A grounded system prompt with an explicit abstention path, because it addresses four of the six causes in about seven lines at zero latency and zero marginal cost." },
          { t: "p", text: "Each rule does a job. \u2018Answer only from the provided context\u2019 fixes the ungrounded prompt. An exact abstention string supplies the out the model otherwise does not have. \u2018Do not use outside knowledge\u2019 instructs precedence over parametric memory. And \u2018prefer a short exact answer\u2019 caps the length-driven drift." },
          { t: "p", text: "I would insist on the abstention wording being exact rather than paraphrasable, because that is what makes abstention rate measurable \u2014 and abstention rate is the metric that tells you whether retrieval is the real problem." },
          { t: "p", text: "Then citations with validation, and the decoding settings. All three layers are free, and the two causes they cannot touch \u2014 a retrieval miss and a stale index \u2014 are not prompting problems." }
        ] },

      { level: "advanced",
        q: "Would you put a faithfulness gate in the request path?",
        strong: "A strong answer has a latency number.",
        answer: [
          { t: "p", text: "Not without checking what it costs, and when I measured it the answer was no. A large NLI model took 739 milliseconds per claim on CPU, so a four-claim answer added about three seconds to a three-second request \u2014 a 94% increase." },
          { t: "p", text: "What surprised me is that an LLM judge was cheaper at roughly 1,100 milliseconds, so the NLI gate was 2.7 times slower than the thing it was supposed to replace. Neither fits a blocking path." },
          { t: "p", text: "So the realistic options are a small NLI model, a GPU, gating only a high-stakes subset, or restructuring it as async with retraction \u2014 serve the answer, score it from the stored trace, and correct or escalate if it fails." },
          { t: "p", text: "Async is also the rule for judges generally, for the same two reasons: a check in the request path adds latency and introduces a second failure mode, where you have to decide what the user gets when the check times out." }
        ] },

      { level: "core",
        q: "The gate fires. What do you serve?",
        strong: "A strong answer chooses by cause.",
        answer: [
          { t: "p", text: "It depends on the cause, and the span attributes tell you which. If the retriever returned nothing above threshold, abstain and escalate \u2014 regenerating against the same insufficient context cannot work." },
          { t: "p", text: "If the context did contain the answer and the prompt failed to force its use, regenerate with a stricter prompt. That is the case where regeneration is genuinely the right call." },
          { t: "p", text: "If a long output drifted at the end, drop the unsupported claims \u2014 the early ones are good and the tail is invented, so there is a coherent answer to keep." },
          { t: "p", text: "I mention this because the usual list is a fixed preference order with regeneration first, and for the most common cause that order is exactly wrong. The remedy should follow the diagnosis, and the diagnosis is free." }
        ] }
    ]
  }
});
