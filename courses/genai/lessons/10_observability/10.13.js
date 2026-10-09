EC.receiveLesson({
  id: "10.13",

  lede: "*\u201cOur RAG chatbot was at 95% accuracy. It is now at 60%. Nobody deployed anything.\u201d* A 35-point drop is almost always a breakdown in one of two layers, and the four metrics that split them give an immediate answer here: **faithfulness unchanged at 0.95 while context recall halved from 0.93 to 0.48.** The generator is doing its job perfectly \u2014 faithfully summarising context that no longer contains the answer. Every hour spent on the prompt would have been wasted.",

  objectives: [
    "Decide between retrieval and generation failure before touching a prompt",
    "Slice a headline metric before theorising about it",
    "Decompose a drop into contributions, and state the order-dependence of doing so",
    "Walk the stack bottom-up from data to retrieval to generation",
    "Mitigate in three horizons and close the incident with a detector"
  ],

  prerequisites: ["10.12", "10.5"],

  blocks: [

    { t: "h2", n: "01", id: "isolate", text: "Step 1 \u2014 Isolate",
      sub: "Retrieval failure or generation failure?" },

    { t: "code", lang: "text", title: "Two layers, and the numbers pick a branch", code: `                        +--- RETRIEVAL failure: the right chunk never reached the prompt
      95% -> 60%  ------+
                        +--- GENERATION failure: the right chunk was there and was ignored`,
      caption: "Do not theorise. Decouple the two layers and let four metrics choose." },

    { t: "table",
      head: ["Context recall", "Faithfulness", "Verdict"],
      rows: [
        ["**low**", "high", "**Retrieval failure.** The model was faithful to context that did not contain the answer."],
        ["high", "**low**", "**Generation failure.** The answer was there and the model invented something else."],
        ["high", "high", "Neither \u2014 the **ground truth or the judge** moved. Re-check the eval set and the judge prompt."],
        ["low", "low", "Both, or something systemic (index empty, wrong tenant, truncated prompt). Look at one trace."]
      ] },

    { t: "table",
      head: ["Metric", "Four weeks ago", "Today", "Read"],
      rows: [
        ["Answer accuracy", "0.95", "0.60", "the symptom"],
        ["**Context recall**", "0.93", "**0.48**", "**collapsed**"],
        ["Context precision", "0.71", "0.44", "fell with it"],
        ["**Faithfulness**", "0.96", "**0.95**", "**unchanged**"],
        ["Answer relevancy", "0.94", "0.91", "broadly fine"],
        ["Mean top-1 similarity", "0.78", "0.41", "the mechanism"],
        ["Empty-retrieval rate", "0.4%", "11.2%", "the alarm nobody had set"]
      ] },

    { t: "callout", kind: "insight", title: "Faithfulness unchanged is the whole diagnosis",
      body: [
        { t: "p", text: "Faithfulness at 0.95 says every claim in the answer is supported by the context it was given. Context recall at 0.48 says the context was missing half of what the answer needed. Together they say: **the generator is working perfectly and the retriever is not.**" },
        { t: "p", text: "This is why the pair matters more than either number. Accuracy at 0.60 alone is compatible with a prompt regression, a model roll, a guardrail over-blocking, or a retrieval collapse. The pair eliminates three of those in one query." },
        { t: "p", text: "And it is the reason not to touch the prompt. The prompt is the most visible knob in the system and in a RAG pipeline it is usually the wrong one \u2014 a point 10.14 lists as a pitfall precisely because the instinct is so strong." }
      ] },

    { t: "h2", n: "02", id: "slice", text: "Step 2a \u2014 Slice before you theorise",
      sub: "An average is a mix of populations" },

    { t: "table",
      head: ["Cohort", "Share of traffic", "Accuracy", "Was"],
      rows: [
        ["Questions about existing product docs (**A**)", "60%", "0.86", "0.96"],
        ["Questions about the new product line (**B**)", "40%", "**0.21**", "0.86"]
      ] },

    { t: "callout", kind: "good", title: "That one table reframes the incident",
      body: [
        { t: "p", text: "\u201cThe bot got worse\u201d becomes \u201cthe bot cannot answer anything about the product we launched three weeks ago, and it got slightly worse at everything else.\u201d Those are two different bugs with two different fixes and two different owners." },
        { t: "p", text: "It also reveals something the headline cannot: cohort B was **10%** of traffic four weeks ago and is 40% now. So part of the drop is not a regression at all \u2014 traffic shifted towards a harder cohort, and the same system scores worse on a harder mix." },
        { t: "p", text: "Which raises the obvious next question: how much of the 35 points is the mix shift and how much is the collapse? The reference answers it with a sequential decomposition, and \u00a703 is about why that answer is less definite than it looks." }
      ] },

    { t: "h2", n: "03", id: "decompose", text: "Step 2b \u2014 Decompose, and the order problem",
      sub: "The finding this module contributes" },

    { t: "code", lang: "text", title: "Verified \u2014 the reference\u2019s decomposition, one order", code: `baseline 95.0%   today 60.0%   drop 35.0 points
  traffic mix 90/10 -> 60/40, accuracy unchanged 92.0%  (-3.0 pts)
  cohort A accuracy 96% -> 86%                  86.0%  (-6.0 pts)
  cohort B accuracy 86% -> 21%                  60.0%  (-26.0 pts)
  total                                         -35.0 pts`,
      hl: [2, 4],
      caption: "Reproduces exactly. The reference concludes \u201c3 points are not a regression at all\u201d." },

    { t: "callout", kind: "trap", title: "But that is one of six orderings, and the most favourable one",
      body: [
        { t: "p", text: "A sequential decomposition changes one factor at a time, so the **interaction between factors is assigned entirely to whichever moves last.** Measured across all six orderings, the traffic-mix contribution ranges from **+0.0 to \u221222.5 points**, and the Shapley attribution \u2014 the mean over every order \u2014 is **\u221211.3**, not \u22123.0." },
        { t: "p", text: "The reason is intuitive once stated. Moving 30% of traffic from a 96% cohort to an 86% one costs 3 points; moving 30% from an 86% cohort to a 21% one costs 19.5. Both are true counterfactuals, answering *\u201cwhat did the shift cost had nothing else changed?\u201d* and *\u201cwhat is the shift costing now, given B is broken?\u201d* respectively." },
        { t: "p", text: "The cleanest demonstration is the ordering that moves cohort A first: the mix contribution comes out at **exactly zero**, because once both cohorts have the same accuracy the mix cannot matter at all. So the \u2018mix effect\u2019 is **entirely** an interaction with the accuracy gap, which is why no single number for it is privileged." }
      ] },

    { t: "callout", kind: "warn", title: "And \u201ccohort B is the incident\u201d is also order-dependent",
      body: [
        { t: "p", text: "I expected the headline conclusion to survive and it only partly does. Cohort B is the largest single contributor in **3 of the 6 orderings**; in the other three the traffic mix is larger. Under Shapley cohort B does come out largest \u2014 \u221216.3 against the mix\u2019s \u221211.3 \u2014 so the conclusion is defensible, but not from the reference\u2019s single ordering alone." },
        { t: "p", text: "What is not order-dependent is the measured fact underneath: **cohort B\u2019s accuracy fell from 0.86 to 0.21**, a 65-point collapse in a directly observed number. That needs no decomposition and no attribution argument." },
        { t: "p", text: "So the lesson for reporting is to lead with the measured facts and treat the decomposition as supporting detail. \u2018Cohort B fell from 86% to 21% and its share of traffic grew from 10% to 40%\u2019 is unimpeachable; \u2018only 3 of the 35 points are the traffic mix\u2019 is one reading of six." }
      ] },

    { t: "callout", kind: "good", title: "The confidence intervals settle the noise question before anyone asks",
      body: [
        { t: "p", text: "Verified: at 200 samples a day the baseline carries \u00b13.0 points and today\u2019s 0.60 carries \u00b16.8, and **the 35-point drop is 22.7 standard errors from baseline.** It is not noise, and saying so with a number ends that conversation in one line." },
        { t: "p", text: "Cohort B\u2019s 21% rests on only 80 samples, so it carries \u00b18.9 points \u2014 somewhere between 12% and 30%. That is **precise enough to act on and not precise enough to quote**, which is a distinction worth making explicitly in an incident channel." },
        { t: "p", text: "Note that 80 samples is a consequence of cohort B being 40% of 200. Four weeks earlier it was 10% of 200, so 20 samples \u2014 and 10.12\u2019s arithmetic says a 15-point fall in that cohort would have been undetectable then. The cohort got easier to monitor by getting bigger." }
      ] },

    { t: "h2", n: "04", id: "stack", text: "Step 3 \u2014 Walk the stack bottom-up",
      sub: "Every layer's input is the layer below's output" },

    { t: "code", lang: "text", title: "The order to search in", code: `  Stage 1  DATA         did the right content get in, intact and current?
     |                  (verify this BEFORE you look at the AI at all)
     v
  Stage 2  RETRIEVAL    given that it is in, does the right chunk come back, and rank high?
     |
     v
  Stage 3  GENERATION   given that the chunk arrived, does the model use it properly?`,
      hl: [1, 2],
      caption: "Debugging retrieval while ingestion is broken is how teams lose a week." },

    { t: "table",
      head: ["Span attribute", "Healthy trace", "Failing trace"],
      rows: [
        ["`retrieve.index`", "`support-docs-v4`", "`support-docs-v4` \u2014 same index"],
        ["`retrieve.returned`", "20", "20 \u2014 the search itself worked"],
        ["`retrieve.above_threshold`", "6", "**0** \u2014 nothing cleared the cut-off"],
        ["`rerank.top_score`", "0.78", "**0.31** \u2014 the best chunk was weakly related"],
        ["`retrieve.chunk_ids`", "mixed doc IDs", "all from the **old** product manual"],
        ["`llm.generate.model`", "pinned version", "same pinned version"],
        ["`build_prompt.prompt_tokens`", "1842", "1799 \u2014 no truncation"]
      ] },

    { t: "callout", kind: "insight", title: "The retriever is not misranking the new documents \u2014 it has never seen them",
      body: [
        { t: "p", text: "Not one chunk from the new product documentation appears in any failing trace, at any rank. That is an ID-level observation, and it rules out every ranking explanation at once: a reranker cannot demote a document that is not in the candidate set." },
        { t: "p", text: "One query closes it. `SELECT count(*) WHERE source LIKE 'new-product%'` returns **0**. And the indexer log from the day the new docs landed reads: *processed 4,102 files, indexed 2,818, skipped 1,284: unsupported content-type application/pdf.*" },
        { t: "p", text: "The new documentation shipped as scanned PDFs. The ingestion pipeline silently skipped every one of them \u2014 **logged at `INFO`, alerted on by nothing.** This is Stage 1, and Stages 2 and 3 would have been a week of tuning something that was never broken." }
      ] },

    { t: "h2", n: "05", id: "mitigate", text: "Step 4 \u2014 Mitigate in three horizons",
      sub: "And the incident is not closed until the detector exists" },

    { t: "table",
      head: ["When", "Action", "Why"],
      rows: [
        ["**Hour 0\u20131**", "Re-index the new PDFs through the OCR path. Add a \u201cwe do not have docs on X yet\u201d fallback.", "Restores cohort B, and an honest refusal beats a confident wrong answer."],
        ["**Hour 1\u20134**", "Fail the ingest job on any skipped file. Alert on empty-retrieval rate above 2% and on index count deltas.", "The bug was invisible for three weeks because nothing watched the ingest."],
        ["**Day 1\u20132**", "Add cohort B queries to the regression set. Add a reranker for cohort A\u2019s dilution. Re-run the four RAG metrics per cohort.", "Fixes the smaller half of the drop and proves the larger one."],
        ["**Week 1**", "Eval gate in CI: no deploy, prompt change or re-index ships without the retrieval suite passing. Per-cohort dashboards. Tail-sampled traces on every low-score answer.", "Turns a three-week incident into a same-day alert."]
      ] },

    { t: "callout", kind: "mental", title: "What to say to a stakeholder",
      body: [
        { t: "p", text: "*\u201cTwo things happened. Traffic shifted towards a new product, and the documentation for that product never made it into the index because it arrived as scanned PDFs. Cohort B\u2019s accuracy fell from 86% to 21% while its share of traffic grew from 10% to 40%. The docs are re-indexing now and the bot will say it does not know rather than guess in the meantime. We are adding an alert that would have caught this on day one.\u201d*" },
        { t: "p", text: "Note what that version does not do: it does not split the 35 points into \u20183 from the mix, 26 from the collapse\u2019. Those shares are order-dependent, and a stakeholder who hears \u2018only 3 points were the traffic mix\u2019 has been given a precision that does not exist." },
        { t: "p", text: "The measured facts carry the whole message anyway. 86% to 21%, 10% to 40%, 1,284 PDFs skipped, logged at INFO, nothing watching. None of that requires an attribution argument." }
      ] },

    { t: "viz", title: "The decomposition, all six ways", caption: "Verified. The reference reports the first row; the mix ranges from +0.0 to \u221222.5.",
      svg: `<svg viewBox="0 0 760 330" width="100%" role="img" aria-label="The incident decomposition under all six orderings showing order dependence">
  <text x="16" y="20" class="s-label">ORDER</text>
  <text x="140" y="20" class="s-label">MIX</text>
  <text x="300" y="20" class="s-label">COHORT A</text>
  <text x="450" y="20" class="s-label">COHORT B</text>
  <text x="640" y="20" class="s-label">LARGEST</text>

  <text x="16" y="44" class="s-mono" style="font-size:9px">MAB</text>
  <rect x="140" y="34" width="20" height="13" rx="2" class="s-fill" style="stroke:var(--accent)" stroke-width="1.2"/>
  <text x="166" y="44" class="s-mono" style="font-size:8px">-3.0</text>
  <rect x="300" y="34" width="40" height="13" rx="2" class="s-fill" style="stroke:var(--accent)" stroke-width="1.2"/>
  <text x="346" y="44" class="s-mono" style="font-size:8px">-6.0</text>
  <rect x="450" y="34" width="173" height="13" rx="2" class="s-fill" style="stroke:var(--crit)" stroke-width="1.4"/>
  <text x="629" y="44" class="s-mono" style="font-size:8px">-26.0</text>
  <text x="640" y="58" class="s-mono" style="font-size:8px;fill:var(--crit)">cohortB</text>
  <text x="16" y="58" class="s-sub">&#8592; the reference</text>

  <text x="16" y="80" class="s-mono" style="font-size:9px">MBA</text>
  <rect x="140" y="70" width="20" height="13" rx="2" class="s-fill" style="stroke:var(--accent)" stroke-width="1.2"/>
  <rect x="300" y="70" width="40" height="13" rx="2" class="s-fill" style="stroke:var(--accent)" stroke-width="1.2"/>
  <rect x="450" y="70" width="173" height="13" rx="2" class="s-fill" style="stroke:var(--crit)" stroke-width="1.4"/>
  <text x="640" y="80" class="s-mono" style="font-size:8px;fill:var(--crit)">cohortB</text>

  <text x="16" y="102" class="s-mono" style="font-size:9px">AMB</text>
  <text x="142" y="102" class="s-mono" style="font-size:8px;fill:var(--good)">+0.0 &#8212; exactly zero</text>
  <rect x="300" y="92" width="60" height="13" rx="2" class="s-fill" style="stroke:var(--warn)" stroke-width="1.2"/>
  <rect x="450" y="92" width="173" height="13" rx="2" class="s-fill" style="stroke:var(--crit)" stroke-width="1.4"/>
  <text x="640" y="102" class="s-mono" style="font-size:8px;fill:var(--crit)">cohortB</text>

  <text x="16" y="124" class="s-mono" style="font-size:9px">ABM</text>
  <rect x="140" y="114" width="130" height="13" rx="2" class="s-fill" style="stroke:var(--crit)" stroke-width="1.4"/>
  <text x="276" y="124" class="s-mono" style="font-size:8px">-19.5</text>
  <rect x="300" y="114" width="60" height="13" rx="2" class="s-fill" style="stroke:var(--warn)" stroke-width="1.2"/>
  <rect x="450" y="114" width="43" height="13" rx="2" class="s-fill" style="stroke:var(--accent)" stroke-width="1.2"/>
  <text x="499" y="124" class="s-mono" style="font-size:8px">-6.5</text>
  <text x="640" y="124" class="s-mono" style="font-size:8px;fill:var(--crit)">mix</text>

  <text x="16" y="146" class="s-mono" style="font-size:9px">BMA</text>
  <rect x="140" y="136" width="150" height="13" rx="2" class="s-fill" style="stroke:var(--crit)" stroke-width="1.5"/>
  <text x="296" y="146" class="s-mono" style="font-size:8px">-22.5</text>
  <rect x="300" y="136" width="40" height="13" rx="2" class="s-fill" style="stroke:var(--accent)" stroke-width="1.2"/>
  <rect x="450" y="136" width="43" height="13" rx="2" class="s-fill" style="stroke:var(--accent)" stroke-width="1.2"/>
  <text x="640" y="146" class="s-mono" style="font-size:8px;fill:var(--crit)">mix</text>

  <text x="16" y="168" class="s-mono" style="font-size:9px">BAM</text>
  <rect x="140" y="158" width="130" height="13" rx="2" class="s-fill" style="stroke:var(--crit)" stroke-width="1.4"/>
  <rect x="300" y="158" width="60" height="13" rx="2" class="s-fill" style="stroke:var(--warn)" stroke-width="1.2"/>
  <rect x="450" y="158" width="43" height="13" rx="2" class="s-fill" style="stroke:var(--accent)" stroke-width="1.2"/>
  <text x="640" y="168" class="s-mono" style="font-size:8px;fill:var(--crit)">mix</text>

  <line x1="16" y1="180" x2="744" y2="180" stroke="var(--line)" stroke-width="1.2"/>
  <text x="16" y="200" class="s-mono" style="font-size:9px;fill:var(--violet)">SHAPLEY</text>
  <rect x="140" y="190" width="75" height="13" rx="2" class="s-fill-2" style="stroke:var(--violet)" stroke-width="1.5"/>
  <text x="221" y="200" class="s-mono" style="font-size:8px;fill:var(--violet)">-11.3</text>
  <rect x="300" y="190" width="50" height="13" rx="2" class="s-fill-2" style="stroke:var(--violet)" stroke-width="1.5"/>
  <text x="356" y="200" class="s-mono" style="font-size:8px;fill:var(--violet)">-7.5</text>
  <rect x="450" y="190" width="108" height="13" rx="2" class="s-fill-2" style="stroke:var(--violet)" stroke-width="1.5"/>
  <text x="564" y="200" class="s-mono" style="font-size:8px;fill:var(--violet)">-16.3</text>
  <text x="640" y="200" class="s-mono" style="font-size:8px;fill:var(--violet)">cohortB</text>

  <rect x="16" y="216" width="728" height="46" rx="4" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.6"/>
  <text x="28" y="235" class="s-mono" style="font-size:10px;fill:var(--crit)">THE MIX CONTRIBUTION RANGES FROM +0.0 TO -22.5 POINTS</text>
  <text x="28" y="253" class="s-sub">the interaction goes entirely to whichever factor moves LAST &#183; the reference reports the most favourable reading</text>

  <rect x="16" y="272" width="728" height="46" rx="4" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="28" y="291" class="s-mono" style="font-size:10px;fill:var(--good)">WHAT NEEDS NO DECOMPOSITION AT ALL</text>
  <text x="28" y="309" class="s-mono" style="font-size:9px">cohort B fell 0.86 -&gt; 0.21 &#183; its share grew 10% -&gt; 40% &#183; 1,284 PDFs skipped, logged at INFO</text>
</svg>` },

    { t: "exercise", kind: "analyse", title: "Decompose the drop, then test whether your conclusion survives", difficulty: "advanced", minutes: 40,
      body: "Reproduce the decomposition, then compute it under all six orderings and the Shapley attribution. Decide which of the conclusions survive the order-dependence and which do not, and write the version you would actually put in an incident report.",
      requirements: [
        "The sequential decomposition, reproducing the reference",
        "All six orderings, with each factor's contribution",
        "The Shapley attribution as the mean over orderings",
        "The interaction term computed explicitly, and where it gets assigned",
        "A statement of which conclusions survive and how you would report it"
      ],
      hint: "Compute which factor is largest in each ordering, not just the Shapley mean \u2014 that is where the surprise is, and it is easy to assume the headline conclusion is safe.",
      solution: { lang: "python", title: "the decomposition, six ways", code: `import itertools, math

BASE_MIX, BASE_ACC = (0.90, 0.10), (0.96, 0.86)
NOW_MIX,  NOW_ACC  = (0.60, 0.40), (0.86, 0.21)

def overall(mix, acc):
    return mix[0] * acc[0] + mix[1] * acc[1]

def state(S):
    """S = the set of factors moved to today's value. M=mix, A=cohort A, B=cohort B."""
    mix = NOW_MIX if "M" in S else BASE_MIX
    acc = (NOW_ACC[0] if "A" in S else BASE_ACC[0],
           NOW_ACC[1] if "B" in S else BASE_ACC[1])
    return overall(mix, acc)

base, now = state(""), state("MAB")
print("baseline %.1f%%   today %.1f%%   drop %.1f points"
      % (base * 100, now * 100, (base - now) * 100))

print()
print("THE REFERENCE'S DECOMPOSITION -- ONE ORDER")
print("=" * 70)
prev = base
for label, S in (("traffic mix 90/10 -> 60/40", "M"),
                 ("cohort A accuracy 96% -> 86%", "MA"),
                 ("cohort B accuracy 86% -> 21%", "MAB")):
    cur = state(S)
    print("  %-34s %.1f%%  (%+.1f pts)" % (label, cur * 100, (cur - prev) * 100))
    prev = cur
print("  %-34s %+.1f pts" % ("total", (prev - base) * 100))

print()
print("BUT THE DECOMPOSITION IS ORDER-DEPENDENT")
print("=" * 70)
print("%-10s %9s %9s %9s  %s" % ("order", "mix", "cohortA", "cohortB", "largest"))
contrib = {"M": [], "A": [], "B": []}
largest = {"M": 0, "A": 0, "B": 0}
for order in itertools.permutations("MAB"):
    cur, row, prev = "", {}, base
    for f in order:
        cur += f
        v = state(cur)
        row[f] = (v - prev) * 100
        contrib[f].append(v - prev)
        prev = v
    big = min(row, key=lambda f: row[f])
    largest[big] += 1
    print("%-10s %+9.1f %+9.1f %+9.1f  %s"
          % ("".join(order), row["M"], row["A"], row["B"],
             {"M": "mix", "A": "cohortA", "B": "cohortB"}[big]))
print()
sh = {f: 100 * sum(v) / 6 for f, v in contrib.items()}
print("%-10s %+9.1f %+9.1f %+9.1f   <- Shapley (mean over all 6 orders)"
      % ("MEAN", sh["M"], sh["A"], sh["B"]))
print("%-10s %9s %9s %9s"
      % ("range",
         "%.1f..%.1f" % (100 * min(contrib["M"]), 100 * max(contrib["M"])),
         "%.1f..%.1f" % (100 * min(contrib["A"]), 100 * max(contrib["A"])),
         "%.1f..%.1f" % (100 * min(contrib["B"]), 100 * max(contrib["B"]))))

print()
print("the reference reports -3.0 / -6.0 / -26.0 and concludes")
print("  '3 points are not a regression at all -- traffic shifted'.")
print("that is the MOST FAVOURABLE of six readings. measured LAST, the same")
print("mix shift is worth %.1f points." % (100 * min(contrib["M"])))

print()
print("WHY: THE INTERACTION TERM")
print("=" * 70)
print("  moving 30%% of traffic from a 96%% cohort to an 86%% one costs %+.1f pts"
      % (100 * 0.30 * (0.86 - 0.96)))
print("  moving 30%% of traffic from an 86%% cohort to a 21%% one costs %+.1f pts"
      % (100 * 0.30 * (0.21 - 0.86)))
inter = (state("MB") - state("M")) - (state("B") - state(""))
print("  interaction(mix, cohortB) = %+.1f pts" % (inter * 100))
print("  -> assigned entirely to whichever factor is measured LAST.")
print()
print("both are true counterfactuals answering different questions:")
print("  'what did the mix shift cost, had nothing else changed?'    -3.0")
print("  'what is the mix shift costing now, given B is broken?'    -19.5")
print()
print("note AMB gives the mix exactly +0.0 -- when both cohorts have the same")
print("accuracy the mix cannot matter at all, which shows the 'mix effect' is")
print("ENTIRELY an interaction with the accuracy gap.")

print()
print("WHICH FACTOR IS THE BIGGEST? IT DEPENDS ON THE ORDER.")
print("=" * 70)
for f, name in (("M", "traffic mix"), ("A", "cohort A"), ("B", "cohort B")):
    print("  %-14s is the largest contributor in %d of 6 orderings" % (name, largest[f]))
print()
print("  so even 'cohort B IS the incident' is order-dependent: it is largest")
print("  in %d of 6, and the mix is largest in the other %d."
      % (largest["B"], largest["M"]))
print("  what DOES hold: cohort B is largest under Shapley (%.1f vs %.1f),"
      % (sh["B"], sh["M"]))
print("  and cohort B's own accuracy fell 65 points, which is not a")
print("  decomposition artefact at all -- it is a directly measured fact.")

print()
print("THE DEFENSIBLE WAY TO REPORT IT")
print("=" * 70)
print("  NOT: 'only 3 points are the traffic mix'")
print("  NOT: 'cohort B is 26 of the 35 points'")
print("  DO : 'cohort B's accuracy fell from 86% to 21% and its share of")
print("        traffic grew from 10% to 40%. attribution between those two")
print("        is order-dependent; Shapley gives mix %.1f, A %.1f, B %.1f.'"
      % (sh["M"], sh["A"], sh["B"]))
print("  -> lead with the measured facts, not the decomposed shares.")

print()
print("IS ANY OF IT NOISE?")
print("=" * 70)
for label, N, p in (("baseline, 200/day", 200, 0.95), ("today, 200/day", 200, 0.60),
                    ("cohort B only, 80 samples", 80, 0.21)):
    se = math.sqrt(p * (1 - p) / N)
    print("%-28s p=%.2f  95%% CI = +/-%.1f pts" % (label, p, 1.96 * se * 100))
se = math.sqrt(0.95 * 0.05 / 200)
print("the 35-point drop is %.1f standard errors: not noise" % (0.35 / se))
print()
print("cohort B at 21% +/- 8.9 pts = [12.1%, 29.9%] --")
print("  precise enough to act on, not precise enough to quote.")`,
        out: `baseline 95.0%   today 60.0%   drop 35.0 points

THE REFERENCE'S DECOMPOSITION -- ONE ORDER
======================================================================
  traffic mix 90/10 -> 60/40         92.0%  (-3.0 pts)
  cohort A accuracy 96% -> 86%       86.0%  (-6.0 pts)
  cohort B accuracy 86% -> 21%       60.0%  (-26.0 pts)
  total                              -35.0 pts

BUT THE DECOMPOSITION IS ORDER-DEPENDENT
======================================================================
order            mix   cohortA   cohortB  largest
MAB             -3.0      -6.0     -26.0  cohortB
MBA             -3.0      -6.0     -26.0  cohortB
AMB             +0.0      -9.0     -26.0  cohortB
ABM            -19.5      -9.0      -6.5  mix
BMA            -22.5      -6.0      -6.5  mix
BAM            -19.5      -9.0      -6.5  mix

MEAN           -11.3      -7.5     -16.3   <- Shapley (mean over all 6 orders)
range      -22.5..0.0 -9.0..-6.0 -26.0..-6.5

the reference reports -3.0 / -6.0 / -26.0 and concludes
  '3 points are not a regression at all -- traffic shifted'.
that is the MOST FAVOURABLE of six readings. measured LAST, the same
mix shift is worth -22.5 points.

WHY: THE INTERACTION TERM
======================================================================
  moving 30% of traffic from a 96% cohort to an 86% one costs -3.0 pts
  moving 30% of traffic from an 86% cohort to a 21% one costs -19.5 pts
  interaction(mix, cohortB) = -19.5 pts
  -> assigned entirely to whichever factor is measured LAST.

both are true counterfactuals answering different questions:
  'what did the mix shift cost, had nothing else changed?'    -3.0
  'what is the mix shift costing now, given B is broken?'    -19.5

note AMB gives the mix exactly +0.0 -- when both cohorts have the same
accuracy the mix cannot matter at all, which shows the 'mix effect' is
ENTIRELY an interaction with the accuracy gap.

WHICH FACTOR IS THE BIGGEST? IT DEPENDS ON THE ORDER.
======================================================================
  traffic mix    is the largest contributor in 3 of 6 orderings
  cohort A       is the largest contributor in 0 of 6 orderings
  cohort B       is the largest contributor in 3 of 6 orderings

  so even 'cohort B IS the incident' is order-dependent: it is largest
  in 3 of 6, and the mix is largest in the other 3.
  what DOES hold: cohort B is largest under Shapley (-16.3 vs -11.3),
  and cohort B's own accuracy fell 65 points, which is not a
  decomposition artefact at all -- it is a directly measured fact.

THE DEFENSIBLE WAY TO REPORT IT
======================================================================
  NOT: 'only 3 points are the traffic mix'
  NOT: 'cohort B is 26 of the 35 points'
  DO : 'cohort B's accuracy fell from 86% to 21% and its share of
        traffic grew from 10% to 40%. attribution between those two
        is order-dependent; Shapley gives mix -11.3, A -7.5, B -16.3.'
  -> lead with the measured facts, not the decomposed shares.

IS ANY OF IT NOISE?
======================================================================
baseline, 200/day            p=0.95  95% CI = +/-3.0 pts
today, 200/day               p=0.60  95% CI = +/-6.8 pts
cohort B only, 80 samples    p=0.21  95% CI = +/-8.9 pts
the 35-point drop is 22.7 standard errors: not noise

cohort B at 21% +/- 8.9 pts = [12.1%, 29.9%] --
  precise enough to act on, not precise enough to quote.`,
        notes: [
          { t: "p", text: "**The reference\u2019s arithmetic reproduces exactly**, and then the six-ordering run shows what it leaves out. The mix contribution is \u22123.0 in the reported order and ranges to \u221222.5; the Shapley attribution is \u221211.3. So \u2018only 3 of the 35 points are the traffic mix\u2019 is the most favourable of six true readings." },
          { t: "p", text: "**The `AMB` ordering is the clearest proof.** Move cohort A first, so both cohorts sit at 86%, and the mix contribution is *exactly zero* \u2014 because when two cohorts have the same accuracy, their mix cannot affect the average at all. The \u2018mix effect\u2019 is therefore entirely an interaction with the accuracy gap, which is why no single number for it is privileged." },
          { t: "p", text: "**I expected the headline conclusion to survive and it only half does.** Cohort B is the largest contributor in 3 of 6 orderings; in the other 3 the mix is larger. Shapley does put cohort B first \u2014 \u221216.3 against \u221211.3 \u2014 so the conclusion holds, but it needs the Shapley calculation to support it rather than the single ordering the reference shows." },
          { t: "p", text: "**What survives untouched is the measured fact.** Cohort B\u2019s accuracy fell from 0.86 to 0.21, a 65-point collapse in a directly observed number, and its share grew from 10% to 40%. Neither requires a decomposition, which is why an incident report should lead with those and treat the shares as supporting detail." },
          { t: "p", text: "**The noise question is settled in one line**: the 35-point drop is 22.7 standard errors from a 0.95 baseline at 200 samples a day. Cohort B\u2019s 21% rests on 80 samples and carries \u00b18.9 points \u2014 [12.1%, 29.9%], which is precise enough to act on and not precise enough to quote." },
          { t: "p", text: "A detail worth noticing in that last number: cohort B has 80 samples *because* it grew to 40% of traffic. At its old 10% share it had 20, where a 15-point fall would have been undetectable. The cohort became monitorable by becoming important." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Check it is real, slice before theorising, then split the blame with context recall against faithfulness. Here faithfulness was unchanged at 0.95 while context recall halved to 0.48 \u2014 a retrieval failure, so the prompt was never the problem. Then walk the stack bottom-up, because every layer\u2019s input is the layer below\u2019s output, and this one lived in Stage 1." },
        { t: "p", text: "And be careful with decomposition. A sequential split assigns the whole interaction to whatever moves last, so the mix contribution ranges from 0.0 to \u221222.5 points across orderings. Lead with the measured facts \u2014 0.86 to 0.21, 10% to 40%, 1,284 PDFs skipped at INFO \u2014 and the incident is not closed until the detector exists." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cOur RAG chatbot was at 95% accuracy. It is now at 60%. Nobody deployed anything. How do you find out what happened?\u201d**" },
        { t: "p", text: "First, is it real? With a 200-sample daily eval the band is about three points, and a 35-point drop is 22.7 standard errors from baseline \u2014 so it is real, and saying that with a number ends the conversation in one line rather than three meetings." },
        { t: "p", text: "Then slice before theorising, because an average is a mix of populations. By document type, tenant, intent, language and query date against document date. Here that showed one cohort at 86% and another at 21%, which converts \u2018the bot got worse\u2019 into \u2018the bot cannot answer anything about the product we launched three weeks ago\u2019. It also showed the second cohort had grown from 10% of traffic to 40%, so some of the drop is a harder mix rather than a regression." },
        { t: "p", text: "Then decouple retrieval from generation, because a RAG answer can fail in two completely different places that look identical from outside. Faithfulness was flat at 0.95 while context recall halved from 0.93 to 0.48 \u2014 the model was faithfully summarising context that did not contain the answer. That is a retrieval failure, and it means the prompt is not the problem, which matters because the prompt is the most visible knob and the instinct to turn it is strong." },
        { t: "p", text: "Then traces, reading the retriever span rather than the answer. Twenty failing requests all showed zero chunks above the similarity threshold and a top score of 0.31 against a normal 0.78, and every chunk ID came from the old manual. Not one chunk from the new documentation appeared at any rank, which rules out every ranking explanation at once \u2014 a reranker cannot demote a document that is not in the candidate set. A count against the index confirmed nothing from the new product was in it, and the indexer log said 1,284 PDFs skipped as an unsupported content type, logged at INFO with nothing watching it." },
        { t: "p", text: "One thing I would be careful about in reporting it. If you decompose the 35 points into \u2018three from the traffic mix, six from cohort A, twenty-six from cohort B\u2019, that is one of six possible orderings and the most favourable one. A sequential decomposition assigns the whole interaction to whichever factor moves last \u2014 measured last, the same mix shift is worth 22.5 points, and the Shapley attribution over all orderings is 11.3 rather than 3. In one ordering the mix contribution is exactly zero, because when both cohorts have the same accuracy the mix cannot matter at all." },
        { t: "p", text: "So I would lead with the facts that need no attribution: cohort B fell from 86% to 21%, its share of traffic grew from 10% to 40%, and 1,284 PDFs were skipped at ingest. Short term, re-index through the OCR path and make the bot say it does not know rather than guess. Medium term, fail the ingest on skipped files and alert on empty-retrieval rate and index-count deltas \u2014 both free off the retriever span. Long term, an eval gate so a re-index cannot ship without the retrieval suite passing. And the incident is not closed until that detector exists, because without it the next one is also invisible for three weeks." }
      ] }
  ],

  takeaways: [
    "**Check it is real first**: verified, the 35-point drop is 22.7 standard errors from a 0.95 baseline at 200/day.",
    "**Slice before theorising** \u2014 one cohort at 0.86 and another at 0.21 is a different bug from \u201cthe bot got worse\u201d.",
    "**Context recall against faithfulness splits the blame**: low recall with high faithfulness is a retrieval failure.",
    "**Faithfulness was unchanged at 0.95 while context recall halved to 0.48**, so the generator was working perfectly.",
    "**Which means the prompt was never the problem**, and the prompt is the knob everyone reaches for first.",
    "**A sequential decomposition is order-dependent**: the mix contribution ranges from +0.0 to \u221222.5 points.",
    "**The Shapley attribution is \u221211.3 / \u22127.5 / \u221216.3**, not the \u22123.0 / \u22126.0 / \u221226.0.",
    "**In one ordering the mix contributes exactly zero** \u2014 proof that the mix effect is entirely an interaction with the accuracy gap.",
    "**Even \u201ccohort B is the incident\u201d is order-dependent**: largest in 3 of 6 orderings, though Shapley supports it.",
    "**So lead with the measured facts**: 0.86 \u2192 0.21, 10% \u2192 40%, 1,284 PDFs skipped \u2014 none of those need attribution.",
    "**Walk the stack bottom-up** \u2014 data, then retrieval, then generation \u2014 because every layer's input is the layer below's output.",
    "**The incident is not closed until the detector exists**, which here was a free integer off the retriever span."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Faithfulness is 0.95 and context recall has halved to 0.48. What does that tell you?",
        options: [
          "Both layers are degraded and something systemic has changed",
          "Generation is healthy and retrieval is not \u2014 the model is faithfully summarising context that is missing the answer",
          "The judge has drifted, since the two metrics should move together",
          "The prompt is truncating the context before the model sees it"
        ],
        answer: 1,
        why: "Faithfulness measures whether the answer's claims are supported by the context supplied, so a high score means the generator did its job on whatever it was given; context recall measures whether that context contained what the answer needed. The pair therefore locates the fault in one query, and in particular rules out the prompt \u2014 which matters because the prompt is the most visible knob and in a RAG system usually the wrong one. Both metrics low would point at something systemic." },

      { stem: "A 35-point drop is decomposed as \u22123.0 (traffic mix), \u22126.0 (cohort A), \u221226.0 (cohort B). What is the problem with quoting those shares?",
        options: [
          "The three numbers do not sum to 35, so the decomposition is incomplete",
          "A sequential decomposition assigns the interaction to whichever factor moves last \u2014 the mix contribution ranges from +0.0 to \u221222.5 across the six orderings",
          "The shares are correct but the confidence intervals are too wide to quote",
          "Cohort A should have been measured before the traffic mix"
        ],
        answer: 1,
        why: "The numbers do sum correctly and reproduce exactly; the issue is that they are one of six equally valid orderings, and the reported one is the most favourable to the \"it is only a mix shift\" reading. Shapley \u2014 the mean over all orderings \u2014 gives \u221211.3 for the mix rather than \u22123.0. The cleanest demonstration is the ordering that moves cohort A first, where the mix contributes exactly zero because equal cohort accuracies make the mix irrelevant." },

      { stem: "Why does walking the stack bottom-up matter?",
        options: [
          "Because data problems are cheaper to fix than model problems",
          "Because every layer's input is the layer below's output \u2014 debugging retrieval over a corpus missing a third of its documents means tuning something that was never broken",
          "Because ingestion logs have longer retention than traces",
          "Because the data layer is where most latency is spent"
        ],
        answer: 1,
        why: "In this incident the retriever, embeddings, reranker, prompt and model were all behaving exactly as designed \u2014 over a corpus that was missing 1,284 documents \u2014 so any amount of Stage 2 or Stage 3 investigation would have found healthy components and wasted a week. Verifying that the right content got in, intact and current, is a ten-minute check that happens before any model is examined at all." },

      { stem: "Which statements about this incident are not order-dependent?",
        options: [
          "That the traffic mix accounts for 3 points and cohort B for 26",
          "That cohort B's accuracy fell from 0.86 to 0.21, its share grew from 10% to 40%, and 1,284 PDFs were skipped at ingest",
          "That cohort B is the largest single contributor to the drop",
          "That the mix shift is not a regression at all"
        ],
        answer: 1,
        why: "Those are directly measured facts requiring no attribution model, which is exactly why an incident report should lead with them. The decomposed shares vary with ordering, and even \"cohort B is the largest contributor\" holds in only three of six orderings \u2014 though the Shapley attribution does support it at \u221216.3 against the mix's \u221211.3. Calling the mix shift \"not a regression\" depends entirely on measuring it first." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "When accuracy fell from 95% to 60%",
    questions: [
      { level: "advanced",
        q: "Accuracy dropped 35 points overnight. First three things you check?",
        strong: "A strong answer does not open a trace first.",
        answer: [
          { t: "p", text: "Whether it is statistically real, given the eval sample size. At 200 a day the band is about three points, and 35 points is 22.7 standard errors \u2014 so it is real, and a number ends that conversation immediately." },
          { t: "p", text: "When exactly it started, lined up against the change log \u2014 deploys, prompt edits, index rebuilds, provider notices, config, traffic mix. And I would assume something changed rather than accepting \u2018nobody deployed anything\u2019, because the change log does not cover the provider\u2019s weights, a nightly re-index, or a prompt edited in a dashboard." },
          { t: "p", text: "Then context recall against faithfulness, to decide whether it is a retrieval or a generation failure. That one pair eliminates most hypotheses in a single query." },
          { t: "p", text: "Only then traces. They are the signal I have least of, so I want the slice to tell me which twenty to open." }
        ] },

      { level: "advanced",
        q: "You decompose a drop into per-factor contributions. What should you be careful about?",
        strong: "A strong answer raises order-dependence unprompted.",
        answer: [
          { t: "p", text: "That a sequential decomposition is order-dependent, because changing one factor at a time assigns the whole interaction to whichever factor moves last." },
          { t: "p", text: "In the case I worked through, the traffic-mix contribution was 3 points measured first and 22.5 points measured last, with a Shapley attribution of 11.3 over all six orderings. So \u2018only 3 of the 35 points were the traffic mix\u2019 was the most favourable of six true readings." },
          { t: "p", text: "The clearest way to see why is the ordering that moves cohort accuracy first: once both cohorts sit at the same accuracy, the mix contributes exactly zero, because a mix of equal numbers cannot move an average. So the mix effect is entirely an interaction with the accuracy gap." },
          { t: "p", text: "Which means I would lead a report with facts that need no attribution \u2014 this cohort fell from 86% to 21% and grew from 10% of traffic to 40% \u2014 and present the decomposition as supporting detail with its ordering stated." }
        ] },

      { level: "core",
        q: "What would you change so this does not recur?",
        strong: "A strong answer closes with the detector.",
        answer: [
          { t: "p", text: "Short term, re-index the skipped documents through the OCR path and add an honest \u2018we do not have documentation on that yet\u2019 fallback, because a refusal beats a confident wrong answer." },
          { t: "p", text: "Then fail the ingest job on any skipped file. The whole incident existed because 1,284 PDFs were skipped and the pipeline logged it at INFO and exited zero \u2014 a job that exits successfully is not proof that documents landed." },
          { t: "p", text: "Then the two free alerts: empty-retrieval rate above two per cent, and mean top-1 similarity falling more than 0.10 day over day. Both come off the retriever span and both moved three weeks before anyone noticed the accuracy drop \u2014 0.4% to 11.2% and 0.78 to 0.41." },
          { t: "p", text: "And an eval gate in CI so a re-index cannot ship without the retrieval suite passing, plus per-cohort dashboards so an average never hides a cohort again. The incident is not closed until the detector exists." }
        ] }
    ]
  }
});
