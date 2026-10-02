EC.receiveLesson({
  id: "11.3",

  lede: "Three real production hallucinations, each with what the user saw and what actually caused it. The pattern across all three is worth noticing before the details: **none of them was a model that lied.** One was a chunking failure, one was a leading instruction, one was a length target the content could not fill. And all three are **detectable by an entailment check** \u2014 measured in 11.4 at contradiction 0.9810, neutral 0.9857 and contradiction 0.9898 respectively.",

  objectives: [
    "Trace each scenario from symptom to root cause",
    "Identify which of the six causes from 11.2 applies to each",
    "Explain why a citation that looks valid can still be fabricated",
    "Recognise the length-driven drift into confabulation",
    "Name the cheapest fix for each, and what it costs"
  ],

  prerequisites: ["11.2"],

  blocks: [

    { t: "h2", n: "01", id: "policy", text: "Scenario 1 \u2014 The invented policy",
      sub: "A generalisation from the wrong chunk" },

    { t: "code", lang: "text", title: "What the user saw", code: `Customer-support bot, grounded on a help-center KB.
User: "What's your refund window for opened software?"
Bot:  "You have 30 days to return opened software for a full refund."
Reality: The KB says 14 days, and only for UNopened software.`,
      hl: [3, 4],
      caption: "Two errors in one sentence: the window and the eligibility." },

    { t: "callout", kind: "insight", title: "The root cause is chunking, and the model behaved reasonably",
      body: [
        { t: "p", text: "Retrieval returned a *generic* refund chunk. The specific \u201copened software\u201d clause was in a different chunk that was not retrieved, so the model had a general refund policy in front of it and a question about a special case \u2014 and it generalised. That is cause 1 from 11.2, a retrieval miss, with chunking as the mechanism." },
        { t: "p", text: "Notice what the model did *not* do: it did not invent a number from nothing. It took a real policy from a real retrieved chunk and extended it to a case the chunk did not cover. That is a very human failure mode and it is why the answer reads so convincingly." },
        { t: "p", text: "The fix has two halves. Better chunking plus a reranker so the specific clause is retrievable, and a prompt instruction: *\u201cif the documents do not cover the exact case, say you are not certain and offer to escalate.\u201d* The second half is free and catches the next instance of this shape." }
      ] },

    { t: "callout", kind: "good", title: "An entailment check catches it decisively, and says why",
      body: [
        { t: "p", text: "Measured in 11.4 against a context stating \u201cunopened software may be returned within 14 days; opened software is not eligible\u201d, the claim \u201cyou have 30 days to return opened software for a full refund\u201d scores **contradiction 0.9810, entailment 0.0093**." },
        { t: "p", text: "So this is an **intrinsic** hallucination in 11.1\u2019s terms \u2014 it contradicts the source rather than adding to it \u2014 and the detector says so without being told. The contradiction reading is the signal that the model overrode or over-extended its context, as against merely inventing beside it." },
        { t: "p", text: "The same measurement shows why you cannot use embedding similarity here: the invented claim scored **cosine 0.8108**, *higher* than the true supported claim at 0.7982. It is maximally on-topic and completely wrong, which is the combination similarity cannot see." }
      ] },

    { t: "h2", n: "02", id: "citation", text: "Scenario 2 \u2014 The fake citation",
      sub: "Citation-shaped text" },

    { t: "code", lang: "text", title: "What the user saw", code: `Research-assistant LLM.
"According to Smith et al. (2021), the effect size was 0.42 (p < 0.001)."
Reality: No such paper exists. The author, year, and statistics were all fabricated.`,
      hl: [2, 3],
      caption: "Author, year, effect size and p-value \u2014 four fabricated details in one citation." },

    { t: "callout", kind: "trap", title: "A leading instruction plus a closed-book question produces citation-shaped text",
      body: [
        { t: "p", text: "The root cause is the combination. A closed-book factual question means the model has no context to ground in; a \u201ccite your sources\u201d instruction means the output must contain citations. Both instructions are satisfiable only by producing text in the *shape* of a citation, which is exactly what training data rewards." },
        { t: "p", text: "This is 11.1\u2019s leading-prompt trigger, and it is our instruction rather than the model\u2019s failing. Asking for citations from a model with no retrieved documents is asking for fabrication \u2014 there is no honest way to satisfy it." },
        { t: "p", text: "The fix is structural rather than persuasive: **only allow citations that map to retrieved documents**, and post-validate every citation id against the retrieved set. An answer citing a chunk that was not retrieved is a fabricated source, and rejecting it is a four-line check." }
      ] },

    { t: "callout", kind: "insight", title: "This one reads as *neutral*, not contradiction \u2014 and that is the extrinsic signature",
      body: [
        { t: "p", text: "Measured: the fake citation scores **neutral 0.9857**, with entailment 0.0013 and contradiction only 0.0130. The context does not contradict it; the context is simply silent about it. That is 11.1\u2019s **extrinsic** hallucination appearing directly in the detector output." },
        { t: "p", text: "The distinction is operationally useful. A contradiction means check the prompt and the precedence instruction; a neutral means check whether the model was asked for something the context could not supply. Different fixes, and the detector hands you the classification." },
        { t: "p", text: "There is one more measured oddity worth knowing: this is the single case where **embedding similarity does catch it** \u2014 cosine 0.0503, far below everything else. But it catches it for the wrong reason, because the citation is off-topic rather than because it is unsupported. 11.4 draws that out." }
      ] },

    { t: "h2", n: "03", id: "drift", text: "Scenario 3 \u2014 Silent drift into confabulation",
      sub: "The last paragraph" },

    { t: "code", lang: "text", title: "What the user saw", code: `Summarization of a 20-page contract.
First 3 paragraphs: accurate.
Last paragraph: invents a "termination penalty of $50,000" not in the contract.`,
      hl: [2, 3],
      caption: "Accuracy that degrades with position \u2014 the most dangerous shape, because the opening builds trust." },

    { t: "callout", kind: "warn", title: "The model ran out of supported content and kept generating",
      body: [
        { t: "p", text: "A summary target longer than the supported content is an instruction to invent the difference. The model does not stop when it runs out of real material, because stopping early is not what the instruction asked for \u2014 so it continues in the same register, and the register is what makes the invented paragraph indistinguishable from the accurate ones." },
        { t: "p", text: "This is the failure shape that most erodes trust, because the first three paragraphs are correct. A reader who spot-checks the opening concludes the whole output is reliable, which is precisely backwards \u2014 confabulation is **positionally biased towards the end**." },
        { t: "p", text: "Three fixes, all cheap: cap `max_tokens` so it cannot run past the content, instruct \u201conly summarise what is present\u201d, and run a faithfulness check **per sentence** rather than on the answer as a whole \u2014 which is what makes the final paragraph visible at all." }
      ] },

    { t: "callout", kind: "good", title: "Per-sentence scoring is what turns a 0.75 into an actionable finding",
      body: [
        { t: "p", text: "11.4 runs this exact case: a four-sentence answer where three sentences are supported and the fourth invents the penalty. The score is **0.750**, reproduced with a real entailment model, and the detector names the offending sentence \u2014 *\u201cThere is also a termination penalty of $50,000.\u201d*" },
        { t: "p", text: "A whole-answer groundedness verdict would have returned \u2018unsupported\u2019 and left you to find which part. The per-claim decomposition returns the sentence, which can be dropped, flagged or regenerated \u2014 and 11.5\u2019s mitigation options all depend on having that granularity." },
        { t: "p", text: "Measured, this claim reads **contradiction 0.9898** \u2014 because the contract says *no termination fee applies*. So it is intrinsic, despite feeling like an invention: the context did address the topic and said the opposite." }
      ] },

    { t: "viz", title: "Three scenarios, three signatures", caption: "All three verified with roberta-large-mnli in 11.4.",
      svg: `<svg viewBox="0 0 760 310" width="100%" role="img" aria-label="Three production hallucination scenarios with their entailment signatures">
  <rect x="16" y="26" width="728" height="78" rx="4" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.6"/>
  <text x="28" y="44" class="s-mono" style="font-size:10px;fill:var(--crit)">1 &#183; THE INVENTED POLICY</text>
  <text x="28" y="60" class="s-mono" style="font-size:8px">said: 30 days, opened software &#183; KB: 14 days, unopened only</text>
  <text x="28" y="74" class="s-sub">cause: chunking &#8212; the specific clause was never retrieved, so the model generalised a real policy</text>
  <text x="28" y="92" class="s-mono" style="font-size:9px;fill:var(--crit)">contradiction 0.9810</text>
  <text x="190" y="92" class="s-mono" style="font-size:9px">INTRINSIC</text>
  <text x="300" y="92" class="s-mono" style="font-size:9px;fill:var(--warn)">cosine 0.8108 &#8212; HIGHER than the true claim</text>

  <rect x="16" y="112" width="728" height="78" rx="4" class="s-fill-bg" style="stroke:var(--warn)" stroke-width="1.6"/>
  <text x="28" y="130" class="s-mono" style="font-size:10px;fill:var(--warn)">2 &#183; THE FAKE CITATION</text>
  <text x="28" y="146" class="s-mono" style="font-size:8px">said: Smith et al. (2021), d=0.42, p&lt;0.001 &#183; reality: no such paper</text>
  <text x="28" y="160" class="s-sub">cause: a closed-book question plus a &#8220;cite sources&#8221; instruction &#8212; satisfiable only by citation-SHAPED text</text>
  <text x="28" y="178" class="s-mono" style="font-size:9px;fill:var(--warn)">neutral 0.9857</text>
  <text x="190" y="178" class="s-mono" style="font-size:9px">EXTRINSIC</text>
  <text x="300" y="178" class="s-mono" style="font-size:9px;fill:var(--good)">cosine 0.0503 &#8212; caught, but only for being off-topic</text>

  <rect x="16" y="198" width="728" height="78" rx="4" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.6"/>
  <text x="28" y="216" class="s-mono" style="font-size:10px;fill:var(--crit)">3 &#183; SILENT DRIFT INTO CONFABULATION</text>
  <text x="28" y="232" class="s-mono" style="font-size:8px">3 accurate paragraphs, then a $50,000 termination penalty &#183; contract: no termination fee applies</text>
  <text x="28" y="246" class="s-sub">cause: a length target longer than the supported content &#8212; so it kept generating in the same register</text>
  <text x="28" y="264" class="s-mono" style="font-size:9px;fill:var(--crit)">contradiction 0.9898</text>
  <text x="190" y="264" class="s-mono" style="font-size:9px">INTRINSIC</text>
  <text x="300" y="264" class="s-mono" style="font-size:9px">per-sentence score 0.750 &#8212; names the offending sentence</text>

  <rect x="16" y="282" width="728" height="24" rx="4" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="28" y="298" class="s-mono" style="font-size:9px;fill:var(--good)">NONE OF THE THREE IS A MODEL THAT LIED &#8212; CHUNKING, AN INSTRUCTION, AND A LENGTH TARGET</text>
</svg>` },

    { t: "exercise", kind: "analyse", title: "Validate citations against the retrieved set", difficulty: "core", minutes: 25,
      body: "Implement the reference's citation validator and run it against answers containing valid citations, fabricated ids, and the awkward middle cases \u2014 an answer with no citations at all, and one citing a real chunk that does not support the claim. Report what the validator can and cannot catch.",
      requirements: [
        "Citations extracted and checked as a subset of the retrieved ids",
        "An answer with a fabricated id rejected",
        "An answer with no citations handled explicitly",
        "A case where the citation is real but does not support the claim",
        "A statement of what the check cannot establish"
      ],
      hint: "A subset check proves the cited chunk was retrieved. It cannot prove the chunk says what the sentence claims \u2014 that needs entailment, which is a different check on a different pair of inputs.",
      solution: { lang: "python", title: "citation validation, and its limit", code: `import re

def validate_citations(answer, retrieved_ids):
    """Every citation must map to an actually-retrieved chunk."""
    cited = set(re.findall(r"\\[(\\w+)\\]", answer))
    return cited.issubset(retrieved_ids) and len(cited) > 0

RETRIEVED = {"c12", "c13", "c88"}

CASES = [
    ("valid",            "Unopened software returns within 14 days [c12]. "
                         "Opened software is not eligible [c13]."),
    ("fabricated id",    "The refund window is 30 days [c99]."),
    ("no citations",     "The refund window is 14 days."),
    ("mixed",            "Returns are 14 days [c12] and the penalty is $50,000 [c77]."),
    ("real id, wrong claim",
                         "Opened software can be returned within 30 days [c12]."),
    ("malformed",        "See the policy document [refund-policy]."),
]

print("%-22s %-8s %s" % ("case", "passes", "why"))
for name, answer in CASES:
    ok = validate_citations(answer, RETRIEVED)
    cited = set(re.findall(r"\\[(\\w+)\\]", answer))
    if not cited:
        why = "no citations at all -- rejected by the len() > 0 clause"
    elif not cited.issubset(RETRIEVED):
        why = "cites %s, not in the retrieved set" % sorted(cited - RETRIEVED)
    else:
        why = "all of %s were retrieved" % sorted(cited)
    print("%-22s %-8s %s" % (name, "yes" if ok else "NO", why))

print()
print("-- what the check establishes --")
print("  that every cited chunk was actually retrieved.")
print("  that is enough to reject a FABRICATED source, which is scenario 2.")
print()
print("-- what it cannot establish --")
print("  'real id, wrong claim' PASSES: it cites c12, which was retrieved,")
print("  and claims the opposite of what c12 says. the subset check is")
print("  satisfied and the answer is still a hallucination.")
print()
CHUNKS = {"c12": "Unopened software may be returned within 14 days for a full refund.",
          "c13": "Opened software is not eligible for return.",
          "c88": "Either party may terminate with 30 days written notice."}
claim = "Opened software can be returned within 30 days"
print("  chunk c12 says : %s" % CHUNKS["c12"])
print("  the claim says : %s" % claim)
print("  -> a citation is a POINTER, not a proof. checking that the pointer")
print("     resolves is necessary and nowhere near sufficient.")
print()
print("so citation accuracy needs TWO checks, and the reference's metric table")
print("says exactly this: 'validate cited ids AND entailment'.")
print("  check 1: cited id in retrieved set        <- this function")
print("  check 2: cited chunk entails the claim    <- 11.4, per sentence")
print()
print("note the malformed case also fails, because [refund-policy] contains a")
print("hyphen and \\\\w does not match it -- so a human-readable citation style")
print("silently fails a validator written for opaque ids.")`,
        out: `case                   passes   why
valid                  yes      all of ['c12', 'c13'] were retrieved
fabricated id          NO       cites ['c99'], not in the retrieved set
no citations           NO       no citations at all -- rejected by the len() > 0 clause
mixed                  NO       cites ['c77'], not in the retrieved set
real id, wrong claim   yes      all of ['c12'] were retrieved
malformed              NO       no citations at all -- rejected by the len() > 0 clause

-- what the check establishes --
  that every cited chunk was actually retrieved.
  that is enough to reject a FABRICATED source, which is scenario 2.

-- what it cannot establish --
  'real id, wrong claim' PASSES: it cites c12, which was retrieved,
  and claims the opposite of what c12 says. the subset check is
  satisfied and the answer is still a hallucination.

  chunk c12 says : Unopened software may be returned within 14 days for a full refund.
  the claim says : Opened software can be returned within 30 days
  -> a citation is a POINTER, not a proof. checking that the pointer
     resolves is necessary and nowhere near sufficient.

so citation accuracy needs TWO checks, and the reference's metric table
says exactly this: 'validate cited ids AND entailment'.
  check 1: cited id in retrieved set        <- this function
  check 2: cited chunk entails the claim    <- 11.4, per sentence

note the malformed case also fails, because [refund-policy] contains a
hyphen and \w does not match it -- so a human-readable citation style
silently fails a validator written for opaque ids.`,
        notes: [
          { t: "p", text: "**The check does one job well**: a fabricated id and a mixed answer citing one real and one invented chunk are both rejected. That is scenario 2 caught, and it is four lines of code with no model call." },
          { t: "p", text: "**And ‘real id, wrong claim’ passes cleanly**, which is the limit worth internalising. The answer cites `c12`, `c12` was retrieved, the subset check is satisfied — and the claim says opened software can be returned in 30 days while `c12` says unopened within 14. A citation is a pointer, and checking that a pointer resolves says nothing about what it points at." },
          { t: "p", text: "**So citation accuracy needs two checks**, which is exactly what the reference’s own metric table says: validate the cited ids *and* run entailment. The first is free and structural; the second is 11.4 and costs a model call per claim." },
          { t: "p", text: "**The malformed case fails for the wrong reason, and the message is misleading.** `[refund-policy]` contains a hyphen, `\w` does not match it, so the regex finds no citations at all — and the validator reports ‘no citations’ rather than ‘unparseable citation’. A human-readable citation style silently looks like an uncited answer." },
          { t: "p", text: "That last one is worth testing against your actual citation format before trusting the metric. A validator that reports zero citations on every answer because the id pattern is wrong will look like a model that never cites, and the fix is one character in a regex." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "None of the three scenarios is a model that lied. One is a chunking failure where the model generalised a real policy to a case the retrieved chunk did not cover; one is a closed-book question plus a cite-your-sources instruction, which is satisfiable only by citation-shaped text; one is a length target longer than the supported content." },
        { t: "p", text: "All three are detectable by entailment, and the three-way output classifies them: contradiction 0.9810 and 0.9898 for the two that contradict their source, neutral 0.9857 for the one the source is silent about. And confabulation is positionally biased towards the end, which is why spot-checking the opening is exactly backwards." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cGive me a real hallucination you have seen and how you would have caught it.\u201d**" },
        { t: "p", text: "The one I find most instructive is a support bot telling a customer they had 30 days to return opened software, when the knowledge base said 14 days and only for unopened. Two errors in one sentence, delivered in exactly the tone of a correct answer." },
        { t: "p", text: "The root cause was chunking rather than the model. Retrieval returned a generic refund chunk; the specific \u2018opened software\u2019 clause lived in a different chunk that was never retrieved. So the model had a real policy in front of it and a question about a special case, and it generalised \u2014 which is a very human failure and is why the answer reads so convincingly. It did not invent a number from nothing." },
        { t: "p", text: "I would have caught it with a per-claim entailment check. Measured against that context, the claim scores contradiction 0.98 and entailment 0.009 \u2014 decisive. And the three-way output tells me it is an intrinsic hallucination, contradicting the source rather than adding beside it, which points the fix at retrieval and precedence rather than at the abstention path." },
        { t: "p", text: "What I would warn against is the tempting cheap version of that check. If you substitute embedding similarity for entailment, this exact case scores 0.81 \u2014 *higher* than the true supported claim at 0.80 \u2014 because an invented fact about the right topic is maximally similar to it. Similarity measures relatedness, not support, so it passes precisely the hallucinations that matter." },
        { t: "p", text: "The fixes were two halves. Better chunking plus a reranker so the specific clause becomes retrievable, and one free prompt line: if the documents do not cover the exact case, say you are not certain and offer to escalate. The second catches the next instance of this shape before the first is deployed." },
        { t: "p", text: "The other scenario worth naming for contrast is a summariser that produced three accurate paragraphs and then invented a fifty-thousand-dollar termination penalty in the fourth. That is a length target longer than the supported content, and it taught me to score **per sentence** rather than per answer \u2014 the whole-answer verdict says \u2018unsupported\u2019 and leaves you hunting, while the per-sentence score of 0.75 names the offending sentence so it can be dropped or regenerated." }
      ] }
  ],

  takeaways: [
    "**None of the three scenarios is a model that lied** \u2014 chunking, an instruction, and a length target.",
    "**The invented policy was a generalisation from a real chunk**, not an invention from nothing, which is why it reads convincingly.",
    "**Measured: contradiction 0.9810** for the invented refund window \u2014 an intrinsic hallucination.",
    "**Cosine scored that same invented claim at 0.8108, higher than the true claim's 0.7982** \u2014 similarity cannot substitute for entailment.",
    "**A closed-book question plus \u201ccite your sources\u201d is satisfiable only by citation-shaped text** \u2014 fabrication is the honest response to an impossible instruction.",
    "**Measured: the fake citation reads neutral 0.9857** \u2014 the extrinsic signature, where the context is silent rather than contradictory.",
    "**Only allow citations that map to retrieved documents**, and post-validate every id against the retrieved set.",
    "**But a citation is a pointer, not a proof** \u2014 a real id attached to an unsupported claim passes the subset check.",
    "**Confabulation is positionally biased towards the end**, so spot-checking the opening is exactly backwards.",
    "**Measured: contradiction 0.9898** for the invented termination penalty \u2014 intrinsic, because the contract said no fee applies.",
    "**Score per sentence, not per answer** \u2014 0.750 with the offending sentence named is actionable; \u201cunsupported\u201d is not.",
    "**Cap `max_tokens` so the model cannot run past its supported content**, which is the cheapest of the three fixes."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A bot says \u201c30 days to return opened software\u201d when the KB says 14 days, unopened only. What was the root cause?",
        options: [
          "The model fabricated a number it had memorised from other companies' policies",
          "Chunking \u2014 a generic refund chunk was retrieved and the specific \u201copened software\u201d clause was not, so the model generalised a real policy",
          "Temperature was too high, producing a random number",
          "The citation validator was not enabled"
        ],
        answer: 1,
        why: "The model did not invent from nothing: it had a genuine refund policy in front of it and a question about a special case the retrieved chunk did not cover, so it extended the policy \u2014 which is why the answer reads so convincingly. That makes it a retrieval miss with chunking as the mechanism, and the fix is a reranker plus a free prompt line about escalating when the documents do not cover the exact case." },

      { stem: "Why does a fake citation score as \u201cneutral\u201d rather than \u201ccontradiction\u201d on an entailment check?",
        options: [
          "Because entailment models are unreliable on proper nouns and numbers",
          "Because the context is silent about the citation rather than contradicting it \u2014 which is the extrinsic signature",
          "Because the citation is formatted correctly and so appears plausible to the model",
          "Because neutral is the default label when confidence is low"
        ],
        answer: 1,
        why: "Extrinsic hallucination adds claims the source never mentions, so there is nothing in the context to contradict \u2014 measured at neutral 0.9857 with contradiction only 0.0130. That distinction is operationally useful: a contradiction points at prompt precedence and the model overriding its context, while a neutral points at the model being asked for something the context could not supply." },

      { stem: "An answer cites chunk c12, which was retrieved, but claims the opposite of what c12 says. What happens?",
        options: [
          "The citation validator rejects it, since the claim does not match the chunk",
          "It passes the subset check \u2014 a citation is a pointer, not a proof, so a second entailment check is required",
          "The entailment check is unnecessary because the id resolves correctly",
          "It is caught by the no-citations clause"
        ],
        answer: 1,
        why: "Validating that every cited id appears in the retrieved set is enough to reject a fabricated source, which is a real and common failure, but it establishes only that the pointer resolves. Whether the pointed-to chunk supports the sentence is a separate question about a different pair of inputs, which is why citation accuracy needs both checks \u2014 id membership and per-claim entailment." },

      { stem: "A summariser produces three accurate paragraphs then invents a penalty in the fourth. What does this imply for measurement?",
        options: [
          "That the whole output should be discarded when any claim fails",
          "That faithfulness must be scored per sentence, because confabulation is positionally biased towards the end and a whole-answer verdict does not locate it",
          "That summarisation is unsuitable for grounded applications",
          "That the context window was exceeded mid-generation"
        ],
        answer: 1,
        why: "The cause is a length target exceeding the supported content, so the model continues in the same register after the real material runs out \u2014 which makes the ending the risky part while the trustworthy opening invites exactly the wrong spot-check. Per-sentence scoring gives 0.750 *and* names the offending sentence, which is what makes dropping, flagging or regenerating it possible; a whole-answer \u201cunsupported\u201d leaves you hunting." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Hallucination in production",
    questions: [
      { level: "core",
        q: "Walk me through a hallucination from symptom to root cause.",
        strong: "A strong answer resists blaming the model.",
        answer: [
          { t: "p", text: "A support bot told a customer they had 30 days to return opened software. The knowledge base said 14 days, and only for unopened \u2014 so two errors in one sentence, in the tone of a correct answer." },
          { t: "p", text: "The cause was chunking. Retrieval returned a generic refund chunk and the specific \u2018opened software\u2019 clause was in a chunk that was never retrieved, so the model generalised a real policy to a case it did not cover. It did not invent a number; it over-extended a true one, which is why it was so convincing." },
          { t: "p", text: "An entailment check settles it: contradiction 0.98 against that context, which also classifies it as intrinsic and therefore points at retrieval and precedence rather than at abstention." },
          { t: "p", text: "The fix was a reranker so the specific clause becomes retrievable, plus one free prompt line \u2014 if the documents do not cover the exact case, say you are not certain and offer to escalate." }
        ] },

      { level: "core",
        q: "How do you stop fabricated citations?",
        strong: "A strong answer makes it structural, not persuasive.",
        answer: [
          { t: "p", text: "Structurally rather than by asking nicely. Only allow citations that map to retrieved documents, and post-validate every citation id against the retrieved set \u2014 an answer citing a chunk that was not retrieved is a fabricated source and gets rejected or regenerated." },
          { t: "p", text: "Before that, I would remove the cause. A closed-book question plus a \u2018cite your sources\u2019 instruction is satisfiable only by producing citation-shaped text; there is no honest output. So either retrieve, or do not ask for citations." },
          { t: "p", text: "But I would be clear about the limit of the validator. It proves the pointer resolves, not that the chunk says what the sentence claims \u2014 a real chunk id attached to a contradicting claim passes the subset check cleanly. Citation accuracy needs both the id check and a per-claim entailment check." },
          { t: "p", text: "A small practical trap: a validator written for opaque ids like `c12` silently fails on human-readable ones like `refund-policy`, because the word-character class does not match a hyphen. Worth testing with your actual citation style." }
        ] },

      { level: "advanced",
        q: "Why is the end of a long output the dangerous part?",
        strong: "A strong answer connects the length target to the register.",
        answer: [
          { t: "p", text: "Because a length target longer than the supported content is an instruction to invent the difference, and the model does not stop when the real material runs out \u2014 stopping early is not what was asked." },
          { t: "p", text: "What makes it dangerous rather than merely wrong is that it continues in the same register. The invented paragraph has the same tone, structure and confidence as the accurate ones, so nothing marks the transition." },
          { t: "p", text: "Which inverts the natural review habit. A reader who spot-checks the opening finds it accurate and extends that trust to the whole output, when accuracy is actually degrading with position." },
          { t: "p", text: "So: cap `max_tokens` so it cannot run past the content, instruct it to summarise only what is present, and score faithfulness per sentence \u2014 which is what makes the final paragraph visible instead of averaged away." }
        ] }
    ]
  }
});
