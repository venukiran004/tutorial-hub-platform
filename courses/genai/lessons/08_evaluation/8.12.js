EC.receiveLesson({
  id: "8.12",

  lede: "One real answer, every metric computed, and a diagnosis that tells you where to fix. The worked example scores faithfulness **1.0** on an answer whose headline claim \u2014 \u201c18 vacation days per year\u201d \u2014 is **not stated in the retrieved context**; the context says 1.5 per month, and 1.5 \u00d7 12 = 18. The arithmetic is right and the claim is derived rather than quoted, so whether faithfulness is 1.0 or 0.5 depends entirely on a judge policy nobody wrote down.",

  objectives: [
    "Compute every retrieval and generation metric on one concrete answer",
    "Diagnose which pipeline stage is the weak link from the metric pattern",
    "Recognise when a faithfulness judgement depends on an unstated policy",
    "Explain why the fix follows from the diagnosis rather than from the aggregate",
    "Apply the same procedure to one of your own answers"
  ],

  prerequisites: ["8.8", "8.10"],

  blocks: [

    { t: "h2", n: "01", id: "case", text: "The case",
      sub: "A question, a gold answer, two retrieved chunks, one answer" },

    { t: "code", lang: "text", title: "the worked example", code: `Question:    "How many vacation days do employees get per year?"
Gold answer: "18 days per year (1.5/month)."
Retrieved:   [KB-1] "Employees accrue 1.5 vacation days per month..."   (relevant)
             [KB-2] "Expense reimbursement up to $60/day..."           (irrelevant)
Answer:      "Employees get 18 vacation days per year, accrued at 1.5/month [KB-1]."`,
      hl: [3, 4, 5],
      caption: "Note what KB-1 actually says, and what the answer claims. They are not the same string." },

    { t: "h2", n: "02", id: "scores", text: "Every metric, computed",
      sub: "And one of them is not what it looks like" },

    { t: "table",
      head: ["Metric", "Value", "How"],
      rows: [
        ["Recall@2", "**1.0**", "The one relevant chunk, KB-1, was retrieved"],
        ["Precision@2", "**0.5**", "1 of 2 retrieved chunks was relevant"],
        ["Context Precision", "Low-ish", "KB-2 is noise and sits at rank 2"],
        ["Faithfulness", "**1.0** \u2014 see \u00a703", "Both claims said to be supported by KB-1"],
        ["Answer Relevancy", "High", "It directly answers the question asked"],
        ["Answer Correctness", "**1.0**", "Matches the gold answer"]
      ] },

    { t: "callout", kind: "good", title: "Recall 1.0 with precision 0.5 is the signature of a precision problem",
      body: [
        { t: "p", text: "Recall@2 of 1.0 says retrieval found everything it needed. Precision@2 of 0.5 says half of what it returned was noise. That combination localises the problem precisely: the retriever is not *missing* anything, it is *adding* something." },
        { t: "p", text: "8.8 argued that the metrics answer different questions \u2014 recall is \u201cdid we get them?\u201d and precision is \u201chow much noise?\u201d \u2014 and this is the case where the distinction pays off, because the two numbers disagree and the disagreement is the diagnosis." },
        { t: "p", text: "The conclusion follows: generation is great, retrieval precision is the weak link, and the fix is better re-ranking or a metadata filter \u2014 **not prompt tweaking**. That is the whole argument for component-level evaluation in a single example." }
      ] },

    { t: "callout", kind: "note", title: "Precision@2 of 0.5 is also the floor here",
      body: [
        { t: "p", text: "8.8 measured that precision@k falls as k rises by arithmetic, and the same constraint applies downward: with exactly one relevant chunk in the corpus for this question, precision@2 **cannot exceed 0.5**. The retriever is at its ceiling." },
        { t: "p", text: "So \u201cfix retrieval precision\u201d means something specific here and it is not \u201crank better\u201d \u2014 at k=2 with one relevant chunk, no ordering achieves more than 0.5. The actual fix is to retrieve **fewer** chunks, or to filter KB-2 out before ranking." },
        { t: "p", text: "That is a useful correction to the diagnosis. Re-ranking cannot help when the second slot has nothing relevant to put in it; a metadata filter or a relevance threshold can, by declining to fill the slot at all \u2014 which is 6.7\u2019s relevance gate doing its job." }
      ] },

    { t: "h2", n: "03", id: "faithfulness", text: "The faithfulness score depends on an unwritten policy",
      sub: "The most interesting thing in the example" },

    { t: "p", text: "The answer makes two claims: **18 vacation days per year**, and **accrued at 1.5 per month**. The context says only the second. The first is the second multiplied by twelve." },

    { t: "callout", kind: "trap", title: "1.5 \u00d7 12 = 18 is correct arithmetic and not a quotation",
      body: [
        { t: "p", text: "The reference scores faithfulness 1.0 on the grounds that \u201cboth claims (18/yr, 1.5/mo) supported by KB-1\u201d. The arithmetic checks out \u2014 1.5 \u00d7 12 is exactly 18 \u2014 so the claim is *entailed* by the context. It is not *stated* in it." },
        { t: "p", text: "A strict faithfulness judge, asked \u201cis this claim supported by the context?\u201d, can reasonably answer no for the first claim, giving **0.5** rather than 1.0. A lenient judge accepting arithmetic derivation answers yes, giving 1.0. Both are defensible readings of the same answer and context." },
        { t: "p", text: "So this single example produces a faithfulness score of either 1.0 or 0.5 depending on a policy decision nobody wrote down \u2014 which is exactly what 8.8 warned about when it said the denominator is a judgement that has to be reported." }
      ] },

    { t: "callout", kind: "insight", title: "And the policy question generalises badly",
      body: [
        { t: "p", text: "Where does derivation stop being grounding? Multiplying by twelve is uncontroversial. Converting a currency at today\u2019s rate is not. Inferring an eligibility rule from two separate clauses is a different thing again, and each step is a judgement the metric cannot make for you." },
        { t: "p", text: "The practical resolution is to pick a position and state it in the judge prompt: either \u201csupported means directly stated\u201d, which is strict, reproducible and will mark useful answers unfaithful, or \u201csupported means stated or straightforwardly derivable\u201d, which is more useful and harder to apply consistently." },
        { t: "p", text: "I would choose the strict version for a regression gate, because reproducibility matters more than generosity when the number is comparing two versions. And I would track the lenient version alongside if the product genuinely wants derived answers, so you can see the two diverge." }
      ] },

    { t: "callout", kind: "good", title: "Note also that Answer Correctness is unambiguous here",
      body: [
        { t: "p", text: "Correctness scores 1.0 against the gold answer with no interpretive difficulty, because the gold answer *also* says 18 days per year. The reference-based metric is clean exactly where the reference-free one is murky." },
        { t: "p", text: "That is a useful inversion of 8.1\u2019s usual trade. Reference-free metrics are cheaper and scale further; reference-based metrics are more expensive and here are **less ambiguous**, because someone already decided what the right answer was." },
        { t: "p", text: "So the two are complementary rather than ranked. A small reference-based set resolves the policy questions a reference-free judge has to guess at, which is a second argument for the division 8.10 recommended." }
      ] },

    { t: "viz", title: "One answer, six metrics, one diagnosis", caption: "Recall 1.0 with precision 0.5 localises the fault to retrieval precision. Faithfulness depends on an unwritten policy.",
      svg: `<svg viewBox="0 0 760 290" width="100%" role="img" aria-label="Worked example metric pattern and diagnosis">
  <text x="16" y="22" class="s-label">RETRIEVAL</text>
  <text x="26" y="48" class="s-mono" style="font-size:9px">recall@2</text>
  <rect x="150" y="36" width="300" height="16" rx="2" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="458" y="48" class="s-mono" style="font-size:9px;fill:var(--good)">1.0 \u2014 found everything needed</text>
  <text x="26" y="74" class="s-mono" style="font-size:9px">precision@2</text>
  <rect x="150" y="62" width="150" height="16" rx="2" class="s-fill" style="stroke:var(--crit)" stroke-width="1.6"/>
  <text x="308" y="74" class="s-mono" style="font-size:9px;fill:var(--crit)">0.5 \u2014 half of it was noise</text>
  <text x="26" y="98" class="s-sub" style="font-size:9px">and 0.5 is the CEILING at k=2 with one relevant chunk</text>

  <line x1="16" y1="112" x2="744" y2="112" stroke="var(--line)" stroke-width="1"/>

  <text x="16" y="136" class="s-label">GENERATION</text>
  <text x="26" y="162" class="s-mono" style="font-size:9px">relevancy</text>
  <rect x="150" y="150" width="290" height="16" rx="2" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="448" y="162" class="s-mono" style="font-size:9px;fill:var(--good)">high</text>
  <text x="26" y="188" class="s-mono" style="font-size:9px">correctness</text>
  <rect x="150" y="176" width="300" height="16" rx="2" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="458" y="188" class="s-mono" style="font-size:9px;fill:var(--good)">1.0 \u2014 unambiguous vs gold</text>
  <text x="26" y="214" class="s-mono" style="font-size:9px">faithfulness</text>
  <rect x="150" y="202" width="300" height="16" rx="2" class="s-fill-bg" style="stroke:var(--warn)" stroke-width="1.8" stroke-dasharray="5 3"/>
  <text x="458" y="214" class="s-mono" style="font-size:9px;fill:var(--warn)">1.0 OR 0.5 \u2014 policy, not measurement</text>
  <text x="26" y="236" class="s-sub" style="font-size:9px">"18/year" is 1.5/month x 12 \u2014 entailed by the context, not stated in it</text>

  <line x1="16" y1="250" x2="744" y2="250" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="272" class="s-mono" style="fill:var(--accent)">diagnosis: retrieval PRECISION \u2014 fix with a filter or a relevance gate, not reranking, not the prompt</text>
  <text x="16" y="288" class="s-sub">because at k=2 with one relevant chunk, no ordering beats 0.5 \u2014 the second slot has nothing to put in it</text>
</svg>` },

    { t: "exercise", kind: "build", title: "Score one of your own answers end to end", difficulty: "advanced", minutes: 35,
      body: "Take a single real answer from your system and compute every metric on it by hand — retrieval and generation. Then write the diagnosis and the fix, and identify any metric whose value depends on a policy you have not written down.",
      requirements: [
        "Compute recall@k, precision@k and context precision with k stated",
        "Decompose the answer into atomic claims and judge each against the context",
        "Record whether any claim is derived rather than stated, and score it both ways",
        "State the diagnosis: which stage is the weak link",
        "State the fix, and why it follows from the diagnosis rather than from the overall score"
      ],
      hint: "Look for claims that are entailed by the context rather than stated in it — numbers converted, units changed, totals computed. Those are where the score depends on an unwritten policy.",
      solution: { lang: "python", title: "the full scoring, both faithfulness policies", code: `def score_answer(question, gold, retrieved, relevant_ids, answer, claims):
    """claims: [(text, 'stated'|'derived'|'unsupported')] -- the judgement to record."""
    k = len(retrieved)
    got = [r for r in retrieved if r["id"] in relevant_ids]

    strict  = sum(c[1] == "stated" for c in claims) / len(claims)
    lenient = sum(c[1] in ("stated", "derived") for c in claims) / len(claims)

    return {
        "k":              k,
        "recall_at_k":    len(got) / max(len(relevant_ids), 1),
        "precision_at_k": len(got) / k,
        "precision_ceiling": min(len(relevant_ids), k) / k,   # <- the honest bound
        "faithfulness_strict":  strict,
        "faithfulness_lenient": lenient,
        "policy_dependent": strict != lenient,
    }

CLAIMS = [("18 vacation days per year", "derived"),     # 1.5 x 12 -- entailed, not stated
          ("accrued at 1.5 per month",  "stated")]

m = score_answer(
    question="How many vacation days do employees get per year?",
    gold="18 days per year (1.5/month).",
    retrieved=[{"id": "KB-1"}, {"id": "KB-2"}],
    relevant_ids={"KB-1"},
    answer="Employees get 18 vacation days per year, accrued at 1.5/month [KB-1].",
    claims=CLAIMS)
for key, v in m.items():
    print("%-22s %s" % (key, v))`,
        out: `  k                      2
  recall_at_k            1.0
  precision_at_k         0.5
  precision_ceiling      0.5
  faithfulness_strict    0.5
  faithfulness_lenient   1.0
  policy_dependent       True`,
        notes: [
          { t: "p", text: "**`precision_ceiling` equals `precision_at_k`**, which changes the diagnosis. The retriever is already at its maximum: with one relevant chunk and k=2, no reordering beats 0.5. So \u2018improve retrieval precision\u2019 cannot mean re-ranking here \u2014 it means retrieving fewer chunks, or filtering the irrelevant one out before ranking." },
          { t: "p", text: "**`policy_dependent` is the flag worth having in the output.** Faithfulness is 0.5 under a strict reading and 1.0 under a lenient one, and both are defensible \u2014 \u201918 per year\u2019 is 1.5 \u00d7 12, which is entailed by the context rather than stated in it. A single number here would hide a decision." },
          { t: "p", text: "**Classifying claims as stated, derived or unsupported rather than supported/unsupported** is the small change that makes this visible. The binary version forces the judge to pick a policy silently; three categories let you compute both and see when they diverge." },
          { t: "p", text: "**Correctness is clean at 1.0** because the gold answer also says 18 per year \u2014 so the reference-based metric resolves the ambiguity that the reference-free one cannot. That inverts the usual trade and is a good argument for keeping a small reference-based set alongside." },
          { t: "p", text: "One honest note on the arithmetic: 1.5 \u00d7 12 = 18 assumes twelve accruing months with no cap, no pro-rating and no carry-over limit. The gold answer makes the same assumption, so correctness passes \u2014 but a real HR policy usually has a cap, which is the sort of thing a derived claim quietly swallows." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Recall 1.0 with precision 0.5 localises the fault precisely: the retriever is adding noise rather than missing content, so the fix is a filter or a relevance gate \u2014 and not re-ranking, because at k=2 with one relevant chunk 0.5 is the ceiling and the second slot has nothing to put in it." },
        { t: "p", text: "And check whether any claim is **derived** rather than stated. \u201c18 per year\u201d from \u201c1.5 per month\u201d is correct arithmetic and not a quotation, so faithfulness is 1.0 or 0.5 depending on a policy nobody wrote down. Classify claims as stated, derived or unsupported and the ambiguity becomes visible instead of silent." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cWalk me through evaluating a single RAG answer.\u201d**" },
        { t: "p", text: "I would take the question, the gold answer, the retrieved chunks and the generated answer, and score both stages. On retrieval: recall@k, precision@k with k stated, and context precision. On generation: decompose the answer into atomic claims and check each against the context, plus relevancy and correctness against gold." },
        { t: "p", text: "The pattern that tells you most is recall against precision. In the worked example recall@2 is 1.0 and precision@2 is 0.5 \u2014 retrieval found everything it needed and half of what it returned was noise. That localises the fault to precision rather than coverage, so the fix is retrieval-side and the prompt is not the problem." },
        { t: "p", text: "But I would add something the stated diagnosis misses. At k=2 with exactly one relevant chunk, precision@2 **cannot exceed 0.5** \u2014 the retriever is already at its ceiling. So \u2018improve retrieval precision\u2019 cannot mean re-ranking, because no ordering helps when the second slot has nothing relevant to fill it. The real fix is retrieving fewer chunks or filtering the irrelevant one out before ranking, which is a relevance gate." },
        { t: "p", text: "The thing I would flag hardest is the faithfulness score. The answer claims 18 days per year; the context says 1.5 per month. Those are not the same string \u2014 18 is 1.5 times twelve, so the claim is entailed by the context rather than stated in it. A strict judge scores 0.5 and a lenient one scores 1.0, and both are defensible." },
        { t: "p", text: "So I would classify claims as stated, derived or unsupported rather than just supported or not, compute faithfulness both ways, and flag when they diverge. For a regression gate I would use the strict version because reproducibility matters more than generosity when comparing two versions, and track the lenient one alongside if the product genuinely wants derived answers." },
        { t: "p", text: "One last observation from this example: answer correctness is unambiguous at 1.0 because the gold answer also says 18 per year. The reference-based metric resolves exactly the ambiguity the reference-free one cannot \u2014 which inverts the usual trade and is a good reason to keep a small gold set even when most of the suite is reference-free." }
      ] }
  ],

  takeaways: [
    "**Recall 1.0 with precision 0.5 means the retriever is adding noise, not missing content** \u2014 the two numbers disagreeing is the diagnosis.",
    "**At k=2 with one relevant chunk, precision@2 cannot exceed 0.5**, so the retriever is at its ceiling and re-ranking cannot help.",
    "**Which corrects the stated fix**: the answer is retrieving fewer chunks or filtering before ranking \u2014 a relevance gate, not a re-ranker.",
    "**The answer's headline claim is derived, not quoted**: \u201c18 per year\u201d is \u201c1.5 per month\u201d \u00d7 12, which is entailed by the context rather than stated in it.",
    "**So faithfulness is 1.0 or 0.5 depending on an unwritten policy**, and a single number hides a decision nobody made explicitly.",
    "**Classify claims as stated, derived or unsupported** rather than binary, so both scores can be computed and the divergence flagged.",
    "**Pick a policy and put it in the judge prompt** \u2014 strict for a regression gate, since reproducibility beats generosity when comparing versions.",
    "**The policy question generalises badly**: multiplying by twelve is fine, converting a currency is not, inferring a rule from two clauses is different again.",
    "**Answer correctness is unambiguous here** because the gold answer makes the same claim \u2014 the reference-based metric resolves what the reference-free one guesses at.",
    "**So the two are complementary, not ranked**, which is a second argument for keeping a small gold set beside a large reference-free suite.",
    "**The fix follows from the diagnosis, not the aggregate** \u2014 this is the whole case for component-level evaluation in one example.",
    "**Derived claims quietly swallow assumptions**: 1.5 \u00d7 12 presumes twelve accruing months with no cap, pro-rating or carry-over limit."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "An answer claims \u201c18 vacation days per year\u201d; the retrieved context says only \u201c1.5 vacation days per month\u201d. What is the faithfulness score?",
        options: [
          "1.0 \u2014 the claim is arithmetically correct, so it is supported",
          "Either 1.0 or 0.5 depending on whether the judge policy counts a derived claim as supported \u2014 and the policy is usually unwritten",
          "0.0 \u2014 the claim does not appear in the context at all",
          "Undefined, since faithfulness requires a gold answer"
        ],
        answer: 1,
        why: "The claim is *entailed* by the context (1.5 \u00d7 12 = 18) but not *stated* in it, so a strict judge asking whether it is supported can reasonably say no while a lenient one accepting derivation says yes. Both readings are defensible, which means the score reflects a policy decision as much as the answer \u2014 exactly why the claim-extraction and support policy must be written into the judge prompt. Faithfulness is reference-free and needs no gold answer." },

      { stem: "Recall@2 is 1.0 and precision@2 is 0.5, with exactly one relevant chunk in the corpus for that question. What is the correct fix?",
        options: [
          "Add a re-ranker to push the irrelevant chunk below the relevant one",
          "Retrieve fewer chunks or filter the irrelevant one out before ranking \u2014 at k=2 with one relevant chunk, 0.5 is the ceiling and no ordering beats it",
          "Improve the embedding model so the irrelevant chunk scores lower",
          "Tune the prompt to instruct the model to ignore irrelevant context"
        ],
        answer: 1,
        why: "Precision@k is bounded by the number of relevant items over k, so with one relevant chunk and k=2 the maximum achievable is 0.5 \u2014 the retriever is already at its limit. Re-ranking changes order, not membership, and the second slot has nothing relevant available to fill it. The fix is to decline to fill the slot, which is what a relevance threshold or metadata filter does. Prompt changes are ruled out because the diagnosis is retrieval-side." },

      { stem: "Why is answer correctness unambiguous in this example while faithfulness is not?",
        options: [
          "Because correctness is computed deterministically by string matching",
          "Because the gold answer also states 18 days per year, so someone already decided what the right answer was \u2014 the reference-based metric resolves what the reference-free one must guess",
          "Because correctness only considers the headline claim and ignores the rest",
          "Because faithfulness requires claim decomposition and correctness does not"
        ],
        answer: 1,
        why: "The gold answer encodes a human decision that \"18 per year\" is the correct response, which settles the question that a faithfulness judge has to resolve by policy. This inverts the usual trade \u2014 reference-free metrics are cheaper and scale further, but here the reference-based one is less ambiguous \u2014 and it is a good argument for keeping a small gold set alongside a large reference-free suite. Correctness is still judge-mediated rather than a string match." },

      { stem: "What assumption does the derived claim \u201c18 days per year\u201d quietly import?",
        options: [
          "That the employee works a full-time schedule",
          "That there are twelve accruing months with no cap, pro-rating or carry-over limit \u2014 none of which the context states",
          "That vacation days and expense days are tracked separately",
          "That accrual begins on the employee's start date"
        ],
        answer: 1,
        why: "Multiplying a monthly accrual by twelve assumes the accrual runs for all twelve months and is uncapped, which real policies frequently contradict. The gold answer makes the same assumption, so correctness passes \u2014 which is precisely how a derived claim can be scored correct and faithful while resting on something unstated. It is the general hazard of accepting derivation as grounding: each inferential step imports premises the context never supplied." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "One answer, all the way through",
    questions: [
      { level: "advanced",
        q: "Score this RAG answer and tell me what to fix.",
        strong: "A strong answer diagnoses from the metric pattern and checks the ceiling.",
        answer: [
          { t: "p", text: "I would score both stages. Retrieval: recall@2 is 1.0 since the one relevant chunk was found, precision@2 is 0.5 since one of two returned chunks was noise, and context precision is low because the noise sits at rank 2. Generation: relevancy is high, correctness is 1.0 against gold, and faithfulness needs care." },
          { t: "p", text: "The diagnosis comes from recall and precision disagreeing. Full recall with half precision means retrieval is adding noise rather than missing content, so the weak link is precision and the fix is retrieval-side \u2014 the prompt is not the problem, which is the standard trap." },
          { t: "p", text: "But I would push further than \u2018improve precision\u2019, because with exactly one relevant chunk and k=2, precision cannot exceed 0.5. The retriever is at its ceiling, so re-ranking is useless \u2014 reordering does not change membership and the second slot has nothing relevant to fill. The fix is retrieving fewer chunks or applying a relevance threshold that declines to fill it." },
          { t: "p", text: "And I would flag the faithfulness score as policy-dependent rather than reporting a number. The answer says 18 days per year; the context says 1.5 per month. That is entailed, not stated \u2014 so a strict judge gives 0.5 and a lenient one gives 1.0, and the choice has to be written into the judge prompt rather than left to the model." }
        ] },

      { level: "core",
        q: "How do you handle claims that are derived rather than quoted?",
        strong: "A strong answer picks a policy and explains the trade.",
        answer: [
          { t: "p", text: "By classifying claims into three categories rather than two \u2014 stated, derived, unsupported \u2014 and computing faithfulness both strictly and leniently. A binary supported/unsupported judgement forces the model to pick a policy silently, and then the number hides a decision." },
          { t: "p", text: "For a regression gate I would use the strict definition, where supported means directly stated. It will mark some genuinely useful answers unfaithful, and it is reproducible \u2014 which matters more when the number\u2019s job is to compare two versions of a system." },
          { t: "p", text: "If the product genuinely wants derived answers \u2014 and often it does, since \u2018how many days per year\u2019 deserves an annual figure \u2014 I would track the lenient score alongside and watch the two diverge. A widening gap means the system is doing more inference, which is a product change worth noticing deliberately." },
          { t: "p", text: "The reason to be careful is that derivation imports premises. Multiplying 1.5 by twelve assumes twelve accruing months with no cap, no pro-rating and no carry-over limit \u2014 none of which the context says, and all of which real policies often contradict. That is how an answer can be scored correct and faithful while resting on something nobody verified." }
        ] },

      { level: "core",
        q: "Why score a single answer in this much detail?",
        strong: "A strong answer connects it to actionability.",
        answer: [
          { t: "p", text: "Because an aggregate tells you something is wrong and a single scored answer tells you where. In this example the pattern \u2014 full recall, half precision, high relevancy, high correctness \u2014 points unambiguously at retrieval precision, and the fix follows from that rather than from the overall score." },
          { t: "p", text: "It is also how you discover that a metric is not measuring what you assumed. I would not have noticed the faithfulness policy problem from a suite average; it only became visible by reading one answer against one context and seeing that the headline claim was arithmetic rather than quotation." },
          { t: "p", text: "And it is how you find the ceilings. Precision@2 of 0.5 looks like a problem to fix until you notice it is the maximum achievable with one relevant chunk \u2014 at which point the obvious intervention, re-ranking, is ruled out and the correct one, a relevance gate, becomes visible." },
          { t: "p", text: "So I would do this on a handful of representative answers whenever setting up a suite, and again on any case where the metrics disagree with my judgement. The suite gives coverage; reading individual cases is what tells you the suite is measuring the right thing." }
        ] }
    ]
  }
});
