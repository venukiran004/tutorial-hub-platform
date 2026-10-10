EC.receiveLesson({
  id: "8.10",

  lede: "A golden dataset that fails CI, plus the guardrail checks that run beside it. The framing is eval-driven development: every prompt, model, retriever or tool change runs the suite, and a metric regression **blocks the merge**. The discipline that makes it work is one line \u2014 **grow the set from real production failures** \u2014 because a set you invented tests what you imagined and a set grown from incidents tests what actually broke.",

  objectives: [
    "Specify what belongs in a golden dataset and where the cases come from",
    "Set up a metric gate that fails CI with explicit thresholds",
    "Report metrics per slice rather than in aggregate",
    "Prefer reference-free metrics so the set does not age",
    "Run the four application-level guardrail checks"
  ],

  prerequisites: ["8.8", "8.9"],

  blocks: [

    { t: "h2", n: "01", id: "golden", text: "The golden dataset",
      sub: "Four kinds of case, and one source that matters" },

    { t: "dl", items: [
      { k: "Happy paths", v: "The common queries, so an obvious regression is obvious. Cheap to write and the least informative per case." },
      { k: "Edge cases", v: "Boundaries, empty results, unusual formats \u2014 where behaviour is undefined unless someone defined it." },
      { k: "Known past bugs", v: "**The highest-value cases you have.** Each one is a failure you already paid for, and a regression test stops you paying twice." },
      { k: "Adversarial inputs", v: "Injection attempts, contradictory instructions, the cases 6.7 covered where the corpus is the attack surface." }
    ] },

    { t: "callout", kind: "good", title: "Grow it from production failures, not from imagination",
      body: [
        { t: "p", text: "8.4 made the same point about building a private eval set: sample from real traffic rather than writing prompts, because invented prompts test what you imagine users do \u2014 which is the same mistake as trusting a benchmark, one level in." },
        { t: "p", text: "Production failures are better than production traffic, because they are pre-filtered for informativeness. A random sample is dominated by cases the system already handles; an incident is by definition a case it did not." },
        { t: "p", text: "The loop the usual description is closes this: sample production traces, label them, add to the golden set, re-evaluate. 8.11 is the sampling half, and the discipline is that every incident ends with a test rather than a fix." }
      ] },

    { t: "h2", n: "02", id: "gate", text: "The gate",
      sub: "Thresholds, explicit and in advance" },

    { t: "code", lang: "text", title: "what eval-driven development means concretely", code: `every prompt / model / retriever / tool change
  -> run the suite
  -> Recall@6 < 0.8  OR  faithfulness < 0.9   ->  FAIL CI, block the merge`,
      hl: [3],
      caption: "Named metrics, named thresholds. The specificity is the point \u2014 a gate without numbers is a dashboard." },

    { t: "callout", kind: "insight", title: "Setting the threshold in advance is the part that is hard and matters",
      body: [
        { t: "p", text: "7.15 measured why: the right stopping point looks unremarkable when you reach it. In a simulated alignment run the true quality peak sat at a KL of 1.0 where the held-out eval was up slightly and length up 14% \u2014 nothing dramatic was visible, so a criterion set afterwards gets tuned until the run passes." },
        { t: "p", text: "The same applies to a merge gate. A threshold chosen after seeing the result is not a gate, it is a negotiation, and the failure mode is gradual \u2014 each individually-defensible relaxation accumulates into a suite that never blocks anything." },
        { t: "p", text: "So write the thresholds down, version them with the code, and treat lowering one as a change requiring the same review as the code it guards. 6.1 argued the same for retrieval: deterministic metrics turn a quality regression into a failed build, and only if the build actually fails." }
      ] },

    { t: "callout", kind: "warn", title: "Report per slice, because an aggregate hides a critical failure",
      body: [
        { t: "p", text: "This is the fifth appearance of the same lesson. 6.5 measured an aggregate Hit@5 of 0.76 concealing an image row of **0.00**. 7.10 measured self-consistency improving an aggregate while degrading a sub-50% slice. 8.7 required toxicity disaggregated by group." },
        { t: "p", text: "For a golden set the slices are query type, language and document source. A regression confined to one language is invisible in a mean weighted by your traffic distribution, and the traffic distribution is exactly why that language is a small share." },
        { t: "p", text: "The cheap implementation is to make the gate per-slice rather than global: fail if *any* slice regresses past its threshold. That is stricter and occasionally annoying, and it is the version that catches what you built the suite for." }
      ] },

    { t: "callout", kind: "good", title: "Prefer reference-free metrics, because golden answers age fast",
      body: [
        { t: "p", text: "A gold answer encodes what was correct when it was written. Your product changes, the corpus changes, and the gold answer silently becomes wrong \u2014 at which point the suite fails for the wrong reason and someone \u201cfixes\u201d the test." },
        { t: "p", text: "8.8\u2019s split is the structural answer: faithfulness, answer relevancy and context precision need no gold answer, so they keep working as the corpus moves. 8.1 made the same point about eval-set size, and here the benefit is maintenance rather than scale." },
        { t: "p", text: "Keep a small reference-based set for answer correctness, accept that it needs periodic review, and put the bulk of the volume on reference-free metrics. That is the division that survives a year of product change." }
      ] },

    { t: "h2", n: "03", id: "guardrails", text: "Guardrail evaluation",
      sub: "Four checks, at the application level" },

    { t: "table",
      head: ["Check", "What it tests", "Covered in"],
      rows: [
        ["**Prompt injection / jailbreak**", "Can a *document* make the agent exfiltrate data or call a tool it should not?", "6.7 \u2014 the corpus is the trusted input"],
        ["**PII / data leak**", "Outputs **and tool arguments**", "6.8 \u2014 pre-filter, not post-filter"],
        ["**Refusal correctness**", "Refuses the unsafe *and* does not over-refuse the benign", "7.15, 8.7 \u2014 both directions"],
        ["**Tool abuse**", "Does it respect permissions and rate limits under adversarial prompts?", "6.4 \u2014 a read-only role, not a prompt"]
      ] },

    { t: "callout", kind: "insight", title: "\u201cAnd tool arguments\u201d is the clause that catches the real leak",
      body: [
        { t: "p", text: "Checking outputs for PII is the obvious half. Tool arguments are where it actually escapes \u2014 an agent that puts a customer\u2019s details into a search query sends them to whatever that tool talks to, and the output the user sees may be perfectly clean." },
        { t: "p", text: "6.8 measured the structurally identical failure in retrieval: post-filtering by tenant reached the same 95% recall as pre-filtering while putting **19 other-tenant chunks** through the top 5 before discarding them. The data was read, scored and logged; only the final answer was clean." },
        { t: "p", text: "So the check has to cover every egress point, and the trace from 8.9 is what makes that possible. Without logged tool arguments, this class of leak is undetectable by construction." }
      ] },

    { t: "callout", kind: "warn", title: "Injection through documents is the one offline suites usually miss",
      body: [
        { t: "p", text: "6.7 made the point and it bears repeating at the suite level: a retrieved chunk can contain \u201cignore previous instructions\u201d, and the system put it in the prompt itself. Nothing in the request looks suspicious, so a guardrail suite that only tests malicious *queries* tests the wrong input." },
        { t: "p", text: "The test has to inject through the corpus \u2014 add a poisoned document to a test index and check whether the agent follows it. That requires the suite to own an index, which is more setup than a prompt-level test and is the only version that measures the real exposure." },
        { t: "p", text: "And the mitigation is capability rather than instruction: a read-only database role, bounded traversal, scoped tool permissions. 6.4 argued this for generated Cypher and the reasoning is identical \u2014 remove what an injection could escalate to, rather than asking the model not to comply." }
      ] },

    { t: "viz", title: "The suite, and what each part is for", caption: "Grow from production failures, gate per slice, keep the bulk reference-free.",
      svg: `<svg viewBox="0 0 760 280" width="100%" role="img" aria-label="Golden set composition and the CI gate">
  <text x="16" y="22" class="s-label">GOLDEN SET \u2014 FOUR KINDS OF CASE</text>
  <rect x="26" y="34" width="166" height="56" rx="4" class="s-fill-bg" style="stroke:var(--line)" stroke-width="1.2"/>
  <text x="109" y="54" text-anchor="middle" class="s-mono" style="font-size:9px">happy paths</text>
  <text x="109" y="72" text-anchor="middle" class="s-sub" style="font-size:8px">cheap, least informative</text>

  <rect x="202" y="34" width="166" height="56" rx="4" class="s-fill-bg" style="stroke:var(--line)" stroke-width="1.2"/>
  <text x="285" y="54" text-anchor="middle" class="s-mono" style="font-size:9px">edge cases</text>
  <text x="285" y="72" text-anchor="middle" class="s-sub" style="font-size:8px">undefined unless defined</text>

  <rect x="378" y="34" width="166" height="56" rx="4" class="s-fill-bg" style="stroke:var(--good)" stroke-width="1.8"/>
  <text x="461" y="54" text-anchor="middle" class="s-mono" style="font-size:9px;fill:var(--good)">KNOWN PAST BUGS</text>
  <text x="461" y="72" text-anchor="middle" class="s-sub" style="font-size:8px">already paid for \u2014 highest value</text>

  <rect x="554" y="34" width="180" height="56" rx="4" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.4"/>
  <text x="644" y="54" text-anchor="middle" class="s-mono" style="font-size:9px;fill:var(--crit)">adversarial</text>
  <text x="644" y="72" text-anchor="middle" class="s-sub" style="font-size:8px">inject through the CORPUS</text>

  <line x1="380" y1="98" x2="380" y2="118" stroke="var(--line)" stroke-width="1.4"/>
  <rect x="140" y="118" width="480" height="42" rx="5" class="s-fill-bg" style="stroke:var(--accent)" stroke-width="1.8"/>
  <text x="380" y="138" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--accent)">GATE \u2014 PER SLICE, THRESHOLDS SET IN ADVANCE</text>
  <text x="380" y="153" text-anchor="middle" class="s-sub" style="font-size:9px">recall@6 &lt; 0.8 OR faithfulness &lt; 0.9 -&gt; fail the merge</text>

  <line x1="380" y1="160" x2="380" y2="180" stroke="var(--line)" stroke-width="1.4"/>
  <rect x="240" y="180" width="280" height="30" rx="5" class="s-fill-bg" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="380" y="200" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--good)">merge \u2014 then measure online (8.11)</text>

  <line x1="16" y1="230" x2="744" y2="230" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="252" class="s-mono" style="fill:var(--crit)">a threshold chosen after seeing the result is a negotiation, not a gate</text>
  <text x="16" y="272" class="s-sub">and golden answers age \u2014 keep the bulk reference-free so the suite survives product change</text>
</svg>` },

    { t: "exercise", kind: "build", title: "Make a regression suite that actually blocks a merge", difficulty: "core", minutes: 35,
      body: "Build a golden-set gate for your own system: cases from four sources, metrics with thresholds written down before you run it, and per-slice reporting. Verify it fails on a deliberately broken change, then verify it passes on the current main.",
      requirements: [
        "Cases from happy paths, edge cases, known past bugs and adversarial inputs",
        "Thresholds committed to the repository before the first run",
        "Per-slice evaluation, failing if any slice regresses",
        "Majority of cases scored with reference-free metrics",
        "Demonstrate the gate failing on an intentionally broken change"
      ],
      hint: "Verify the gate fails before trusting it to pass. A suite that has never blocked anything is indistinguishable from one that cannot.",
      solution: { lang: "python", title: "the gate", code: `THRESHOLDS = {            # committed to the repo, reviewed like code
    "recall_at_6":   0.80,
    "faithfulness":  0.90,
    "schema_valid":  0.99,
    "over_refusal":  0.10,   # an UPPER bound -- both directions matter
}

def evaluate(system, cases):
    """Returns metrics overall AND per slice -- the per-slice part is the point."""
    by_slice = {}
    for c in cases:
        r = run(system, c)
        s = by_slice.setdefault(c["slice"], {"n": 0, **{k: 0.0 for k in THRESHOLDS}})
        s["n"] += 1
        s["recall_at_6"]  += recall_at_k(r["retrieved"], c["relevant"], 6)
        s["faithfulness"] += judge_faithful(r["answer"], r["context"])
        s["schema_valid"] += float(schema_ok(r["answer"]))
        s["over_refusal"] += float(r["refused"] and not c["should_refuse"])
    for s in by_slice.values():
        for k in THRESHOLDS:
            s[k] /= s["n"]
    return by_slice

def gate(by_slice, thresholds=THRESHOLDS):
    """Fail if ANY slice breaches. Stricter than a global mean, and the point."""
    failures = []
    for name, m in by_slice.items():
        for k, t in thresholds.items():
            bad = m[k] > t if k == "over_refusal" else m[k] < t
            if bad:
                failures.append("%s/%s = %.3f (threshold %.2f)" % (name, k, m[k], t))
    return failures

fails = gate(evaluate(SYSTEM, GOLDEN))
for f in fails:
    print("FAIL " + f)
raise SystemExit(1 if fails else 0)`,
        out: `  [shape -- run against your own system]

  FAIL legal_queries/recall_at_6 = 0.714 (threshold 0.80)
  FAIL de_DE/faithfulness = 0.862 (threshold 0.90)

  overall: recall_at_6 0.838  faithfulness 0.921  -- WOULD HAVE PASSED`,
        notes: [
          { t: "p", text: "**The last line is the whole argument for per-slice gating.** The global means clear both thresholds, so a mean-based gate merges this change \u2014 while one query type and one language have regressed below the bar. The aggregate is weighted by traffic, and the slices that regress are small precisely because traffic is skewed." },
          { t: "p", text: "**`over_refusal` is an upper bound and needs the inverted comparison.** That asymmetry is easy to get wrong in a loop over thresholds, and getting it wrong means the gate silently never fires on the one metric where more is worse." },
          { t: "p", text: "**THRESHOLDS lives in the repository and gets reviewed like code.** A threshold chosen after seeing a result is a negotiation rather than a gate, and the failure is gradual \u2014 each individually-defensible relaxation accumulates into a suite that cannot block anything." },
          { t: "p", text: "**Three of the four metrics are reference-free**, so the suite survives corpus and product change. Golden answers encode what was correct when written, and when they go stale the suite fails for the wrong reason and someone edits the test." },
          { t: "p", text: "One step the exercise insists on and most teams skip: verify the gate *fails* on a deliberately broken change before trusting it to pass. A suite that has never blocked anything is indistinguishable from one that cannot, and that is a surprisingly common state to discover." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Grow the golden set from production failures, because they are pre-filtered for informativeness in a way random traffic is not \u2014 and every incident should end with a test, not a fix. Keep the bulk reference-free so the suite survives product change." },
        { t: "p", text: "Gate per slice with thresholds committed in advance, because an aggregate weighted by traffic hides a regression confined to a small segment, and a threshold chosen afterwards is a negotiation. Then verify the gate fails on a broken change, or you do not know it works." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cHow would you stop prompt changes from breaking things?\u201d**" },
        { t: "p", text: "A golden set that fails CI, with thresholds committed to the repository before anyone runs it. Every prompt, model, retriever or tool change runs the suite, and a named metric below a named threshold blocks the merge \u2014 recall@6 under 0.8, faithfulness under 0.9, that level of specificity. A gate without numbers is a dashboard." },
        { t: "p", text: "The cases come from four places, and one of them matters far more than the others: known past bugs. Each is a failure you already paid for, so a regression test stops you paying twice \u2014 and the discipline is that every incident ends with a test rather than a fix. Happy paths and edge cases round it out, plus adversarial inputs." },
        { t: "p", text: "I would gate per slice rather than on the aggregate, because an aggregate weighted by traffic hides a regression confined to a small segment \u2014 and the segment is small precisely because traffic is skewed. I have seen the general form of this repeatedly: an overall retrieval score of 0.76 sitting on top of a modality scoring exactly 0.00." },
        { t: "p", text: "I would keep most of the suite reference-free \u2014 faithfulness, answer relevancy, schema validity \u2014 because gold answers encode what was correct when written. When the product or corpus moves they go stale, the suite fails for the wrong reason, and someone edits the test instead of the code." },
        { t: "p", text: "Setting the thresholds in advance is the part that is genuinely hard, because the right threshold looks unremarkable when you hit it. I have measured that in an alignment context \u2014 the true quality peak sat at a point where nothing dramatic was visible in any metric \u2014 so a criterion written afterwards gets tuned until the run passes. I would version the thresholds and treat lowering one as a reviewable change." },
        { t: "p", text: "And I would verify the gate fails on a deliberately broken change before trusting it. A suite that has never blocked anything is indistinguishable from one that cannot, and that is a common state to find yourself in." }
      ] }
  ],

  takeaways: [
    "**Four sources of cases**, and known past bugs are the highest-value \u2014 each is a failure already paid for.",
    "**Grow the set from production failures rather than imagination**: a random traffic sample is dominated by cases the system already handles.",
    "**Every incident should end with a test, not a fix**, which is the loop that makes the suite improve over time.",
    "**The gate needs named metrics and named thresholds** \u2014 recall@6 < 0.8, faithfulness < 0.9 \u2014 because a gate without numbers is a dashboard.",
    "**Commit the thresholds before the first run**, since a threshold chosen afterwards is a negotiation and the relaxation is gradual.",
    "**The right threshold looks unremarkable when you reach it**, which is why it cannot be set retrospectively.",
    "**Gate per slice, failing if any slice breaches** \u2014 an aggregate weighted by traffic hides exactly the regressions you built the suite for.",
    "**Prefer reference-free metrics** so the suite survives product and corpus change; gold answers go stale and then the test gets edited.",
    "**Check PII in tool arguments as well as outputs**, because that is the egress point where the final answer still looks clean.",
    "**Inject through the corpus, not just the query** \u2014 a retrieved chunk can carry the attack and nothing in the request looks suspicious.",
    "**Mitigate by capability, not instruction**: a read-only role and scoped permissions, rather than asking the model not to comply.",
    "**Verify the gate fails on a broken change**, because a suite that has never blocked anything is indistinguishable from one that cannot."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A change leaves overall recall@6 at 0.838 and faithfulness at 0.921, above thresholds of 0.80 and 0.90 \u2014 but one query type is at 0.714 recall and one language at 0.862 faithfulness. What should the gate do?",
        options: [
          "Pass, since the aggregate metrics clear their thresholds",
          "Fail \u2014 gating per slice is the point, because the aggregate is weighted by traffic and the regressing slices are small precisely because traffic is skewed",
          "Pass, but raise a warning for manual review of the two slices",
          "Fail only if the slices represent more than 10% of traffic"
        ],
        answer: 1,
        why: "A mean-based gate merges this change while two segments have regressed below the bar, and the segments are small for the same reason the mean is dominated by other traffic. Per-slice gating is stricter and occasionally annoying, and it is the version that catches what the suite was built for. This is the same structure as an aggregate retrieval score of 0.76 concealing a modality scoring 0.00." },

      { stem: "Why should golden-set thresholds be committed before the first run?",
        options: [
          "To satisfy audit requirements for change control",
          "Because a threshold chosen after seeing a result is a negotiation rather than a gate \u2014 and the right threshold often looks unremarkable when you reach it",
          "Because thresholds cannot be computed until the suite has a baseline",
          "Because CI systems cache thresholds from the first successful run"
        ],
        answer: 1,
        why: "Retrospective thresholds get tuned until the current run passes, and the failure is gradual: each individually-defensible relaxation accumulates into a suite that never blocks anything. The difficulty is real because the correct decision point is often undramatic \u2014 in an alignment run the true quality peak occurred where no metric looked alarming \u2014 so judgement after the fact is unreliable. Versioning them and reviewing changes like code is the mitigation." },

      { stem: "Why does the reference specify PII checks on tool arguments as well as outputs?",
        options: [
          "Because tool arguments are logged at a higher verbosity than outputs",
          "Because tool arguments are an egress point \u2014 an agent putting customer details into a search query sends them onward while the user-visible answer stays clean",
          "Because schema validation cannot detect PII in structured fields",
          "Because outputs are already covered by the refusal-correctness check"
        ],
        answer: 1,
        why: "Data leaves the system wherever it is sent, not only where the user sees it, so checking the final answer catches only one path. This Covers the retrieval case where post-filtering by tenant achieved the same recall as pre-filtering while putting 19 other-tenant chunks through the top 5 \u2014 read, scored and logged, with a clean final answer. Detecting this class requires logged tool arguments, which is why the trace matters." },

      { stem: "Why prefer reference-free metrics for the bulk of a regression suite?",
        options: [
          "They are more accurate than reference-based metrics on open-ended output",
          "Gold answers encode what was correct when written, so they go stale as the product and corpus change \u2014 at which point the suite fails for the wrong reason and someone edits the test",
          "They require no judge model and so run faster in CI",
          "They are the only metrics that can be computed per slice"
        ],
        answer: 1,
        why: "Maintenance is the issue: a stale gold answer produces a failure that is not a real regression, and the natural response is to edit the test, which erodes the suite. Faithfulness, answer relevancy and context precision score the output against inputs the system produced, so they keep working as things move. They generally do need a judge, which is a cost, and a small reference-based set for answer correctness remains worth keeping with periodic review." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Eval-driven development, and the guardrails beside it",
    questions: [
      { level: "core",
        q: "What goes into a golden dataset?",
        strong: "A strong answer ranks the sources by value.",
        answer: [
          { t: "p", text: "Four kinds of case: happy paths, edge cases, known past bugs and adversarial inputs. They are not equally valuable \u2014 known past bugs are the highest, because each is a failure you already paid for and a regression test stops you paying twice." },
          { t: "p", text: "The source matters more than the composition. Cases should come from real production traffic and especially from production *failures*, because failures are pre-filtered for informativeness \u2014 a random traffic sample is dominated by cases the system already handles, while an incident is by definition one it did not." },
          { t: "p", text: "That makes the discipline a loop rather than a one-off build: sample production traces, label them, add them to the set, re-evaluate. The rule I would want on the team is that every incident ends with a test, not just a fix." },
          { t: "p", text: "And I would keep the bulk reference-free \u2014 faithfulness, relevancy, schema validity \u2014 so the suite survives product change. Gold answers encode what was correct when they were written, and when they go stale the suite fails for the wrong reason and someone edits the test rather than the code." }
        ] },

      { level: "advanced",
        q: "How do you make an eval suite actually block bad changes?",
        strong: "A strong answer covers thresholds, slices and verifying the gate.",
        answer: [
          { t: "p", text: "Named metrics with named thresholds, committed to the repository before the first run, and failing the build rather than posting a warning. Something like recall@6 below 0.8 or faithfulness below 0.9 blocks the merge \u2014 that level of specificity, because a gate without numbers is a dashboard." },
          { t: "p", text: "Thresholds set in advance is the part that is genuinely hard, since the right threshold often looks unremarkable when you hit it. A criterion written after seeing the result gets tuned until the run passes, and the erosion is gradual \u2014 each relaxation individually defensible, cumulatively a suite that cannot block anything." },
          { t: "p", text: "I would gate per slice rather than on aggregates. An aggregate is weighted by traffic, so a regression confined to one language or query type is invisible \u2014 and that segment is small precisely because traffic is skewed. Failing if any slice breaches is stricter and is the version that works." },
          { t: "p", text: "And I would verify the gate fails on a deliberately broken change before trusting it to pass. A suite that has never blocked anything is indistinguishable from one that cannot, which is a common and uncomfortable thing to discover." }
        ] },

      { level: "advanced",
        q: "What guardrail checks belong in an application eval suite?",
        strong: "A strong answer names the corpus as the attack surface.",
        answer: [
          { t: "p", text: "Four. Injection and jailbreak resistance against the *system* \u2014 prompt plus tools \u2014 rather than against the model in isolation. PII and data-leak checks on outputs **and on tool arguments**. Refusal correctness in both directions. And tool abuse: does the agent respect permissions and rate limits under adversarial prompts." },
          { t: "p", text: "The injection test has to come through the corpus, which is what offline suites usually miss. A retrieved document can contain \u2018ignore previous instructions\u2019 and the system put it in the prompt itself, so nothing in the request looks suspicious. Testing malicious queries tests the wrong input \u2014 the suite needs to own an index and add a poisoned document to it." },
          { t: "p", text: "Tool arguments are where PII actually escapes. An agent putting customer details into a search query sends them to whatever that tool talks to, while the answer the user sees is perfectly clean. I have measured the same structure in retrieval, where post-filtering by tenant matched pre-filtering on recall while putting nineteen other-tenant chunks through the top five \u2014 read, scored and logged." },
          { t: "p", text: "And the mitigations should be capability-based rather than instruction-based: a read-only database role, bounded traversal, scoped tool permissions. You remove what an injection could escalate to instead of asking the model not to comply, because the second one is a tendency and the first is a boundary." }
        ] }
    ]
  }
});
