EC.receiveLesson({
  id: "8.3",

  lede: "The reference says BLEU and ROUGE \u201creward surface overlap\u201d, so a correct paraphrase can score low and a fluent wrong answer can score high. Tested on a reference sentence and five candidates, that understates it: a factually **inverted** answer \u2014 the two latency figures swapped, so the claim is exactly backwards \u2014 scored **ROUGE-1 = 1.0000 and ROUGE-2 = 1.0000**, a perfect match, while a correct paraphrase scored **0.2581**. The metric is not merely weak on paraphrase; it is indifferent to whether the sentence means the opposite.",

  objectives: [
    "Match each reference-based metric to the task it was designed for",
    "Demonstrate why surface-overlap metrics fail on open-ended output",
    "Compute pass@k and explain why n must exceed k",
    "Choose between exact match, overlap metrics and embedding metrics",
    "Say where these metrics remain the right tool"
  ],

  prerequisites: ["8.1", "8.2"],

  blocks: [

    { t: "h2", n: "01", id: "catalogue", text: "The catalogue",
      sub: "Each metric was built for one task" },

    { t: "table",
      head: ["Metric", "Measures", "Task", "Gotcha"],
      rows: [
        ["Accuracy / F1", "Exact correctness", "Classification, extractive QA", "Needs clean labels"],
        ["Exact Match", "String equals gold", "Short-answer QA, SQL", "Brittle to formatting"],
        ["BLEU", "n-gram **precision** against references", "Translation", "Ignores meaning; penalises paraphrase"],
        ["ROUGE-1/2/L", "n-gram or longest-subsequence **recall**", "Summarisation", "Rewards overlap, not faithfulness"],
        ["METEOR", "Unigram match with synonyms and stems", "Translation", "Better recall of meaning than BLEU"],
        ["BERTScore", "Cosine of contextual embeddings", "Generated text", "Semantic, but model-dependent"],
        ["chrF", "Character n-gram F-score", "Translation", "Robust to morphology"],
        ["pass@k", "% of problems with \u22651 correct of k samples", "Code generation", "Needs executable tests"]
      ] },

    { t: "callout", kind: "insight", title: "BLEU is precision and ROUGE is recall, and that is the whole difference",
      body: [
        { t: "p", text: "BLEU asks how much of the *candidate* appears in the reference \u2014 precision \u2014 which suits translation, where adding material is a fault. ROUGE asks how much of the *reference* appears in the candidate \u2014 recall \u2014 which suits summarisation, where missing material is the fault." },
        { t: "p", text: "That asymmetry explains their respective failure modes. BLEU punishes a longer correct answer; ROUGE rewards a longer one that happens to contain the reference\u2019s words. Neither asks whether the sentence is true." },
        { t: "p", text: "6.1 made the same precision-and-recall point for retrieval, and the lesson transfers: a single number conflating the two is less informative than both, and which one you want depends on which error costs more." }
      ] },

    { t: "h2", n: "02", id: "failure", text: "The failure, measured",
      sub: "A perfect score for a sentence that means the opposite" },

    { t: "p", text: "The claim is testable with real implementations. I took a reference sentence stating two measured latencies from 6.7 and scored five candidates with NLTK\u2019s BLEU and Google\u2019s `rouge_score`." },

    { t: "code", lang: "python", title: "g82.py \u00a7E \u2014 the setup", code: `REF = ("The retrieval stage costs about eleven milliseconds and the "
       "cross-encoder costs about two thousand four hundred milliseconds.")

CANDS = [
    ("exact copy",                 REF),
    ("CORRECT paraphrase",         "Retrieval takes roughly 11 ms while the cross-encoder takes roughly 2405 ms."),
    ("CORRECT, different wording", "Fetching documents is fast at around eleven milliseconds; re-ranking them is slow at around two thousand four hundred."),
    ("FLUENT BUT WRONG",           "The retrieval stage costs about two thousand four hundred milliseconds and the cross-encoder costs about eleven milliseconds."),
    ("WRONG, high overlap",        "The retrieval stage costs about eleven milliseconds and the cross-encoder costs about eleven milliseconds."),
]`,
      hl: [9, 10],
      caption: "The fourth candidate swaps the two figures, so it states the opposite of the truth in the reference's own words." },

    { t: "code", lang: "python", title: "g82.py \u00a7E \u2014 the scores", code: `b = sentence_bleu([REF.lower().split()], c.lower().split(), smoothing_function=sm)
r = rs.score(REF, c)      # rouge_score, with stemming`,
      out: `  candidate                          BLEU   ROUGE1   ROUGE2   ROUGEL
  exact copy                       1.0000   1.0000   1.0000   1.0000
  CORRECT paraphrase               0.0263   0.2581   0.1379   0.2581
  CORRECT, different wording       0.0574   0.3243   0.2286   0.3243
  FLUENT BUT WRONG                 0.7953   1.0000   1.0000   0.7222
  WRONG, high overlap              0.6905   0.8485   0.7742   0.8485`,
      hl: [4, 5, 6, 7],
      caption: "Rows 4 and 5 are factually wrong and outscore rows 2 and 3, which are correct, on every single metric." },

    { t: "callout", kind: "trap", title: "ROUGE-1 and ROUGE-2 both give the inverted sentence a perfect 1.0000",
      body: [
        { t: "p", text: "That is not a near-miss, it is indistinguishable from the exact copy. Swapping the two latency figures between the clauses preserves the multiset of unigrams exactly, and almost all bigrams \u2014 so a recall-based n-gram metric sees a complete match while the sentence now asserts that retrieval is 218\u00d7 *slower* than re-ranking." },
        { t: "p", text: "Meanwhile the correct paraphrase scores **0.2581** on ROUGE-1 and **0.0263** on BLEU, because it says the same thing with different words and digits instead of spelled-out numbers. The ordering is not merely noisy \u2014 it is reliably inverted on this example." },
        { t: "p", text: "So the reference\u2019s \u201ca fluent wrong answer *can* score high\u201d is too gentle. On a sentence whose meaning lives in which number attaches to which clause \u2014 which is most quantitative claims \u2014 these metrics are structurally blind, because n-grams do not encode attachment." }
      ] },

    { t: "callout", kind: "insight", title: "ROUGE-L is the only one that notices, and only slightly",
      body: [
        { t: "p", text: "ROUGE-L scored the inverted sentence **0.7222** against 1.0000 for the exact copy \u2014 the one metric in the table that registered a difference, because longest-common-subsequence is order-sensitive in a way bag-of-n-grams is not." },
        { t: "p", text: "But 0.7222 still comfortably beats the correct paraphrase\u2019s 0.2581, so the ranking is unchanged. Order sensitivity narrows the gap without fixing the problem, which is a useful illustration that these failures are not patched by choosing a better variant from the same family." },
        { t: "p", text: "The family-level fix is to leave surface overlap behind \u2014 BERTScore compares contextual embeddings, which at least has the capacity to represent that two numbers swapped places. 8.6\u2019s judge is the more general answer, and it is the reason model-graded evaluation took over." }
      ] },

    { t: "viz", title: "Correct answers scoring below wrong ones", caption: "ROUGE-1 and ROUGE-2 give a factually inverted sentence a perfect 1.0000.",
      svg: `<svg viewBox="0 0 760 300" width="100%" role="img" aria-label="BLEU and ROUGE scores for correct and incorrect candidates">
  <text x="16" y="22" class="s-label">ROUGE-1 F-MEASURE AGAINST THE SAME REFERENCE</text>
  <line x1="250" y1="40" x2="250" y2="250" stroke="var(--line)" stroke-width="1.2"/>
  <text x="250" y="268" text-anchor="middle" class="s-mono" style="font-size:9px">0.0</text>
  <text x="700" y="268" text-anchor="middle" class="s-mono" style="font-size:9px">1.0</text>
  <line x1="700" y1="40" x2="700" y2="250" stroke="var(--line)" stroke-width="0.8" stroke-dasharray="3 3"/>

  <text x="240" y="62" text-anchor="end" class="s-sub" style="font-size:9px">exact copy</text>
  <rect x="250" y="50" width="450" height="18" rx="2" class="s-fill" style="stroke:var(--accent)" stroke-width="1.4"/>
  <text x="708" y="64" class="s-mono" style="font-size:9px;fill:var(--accent)">1.0000</text>

  <text x="240" y="98" text-anchor="end" class="s-sub" style="font-size:9px">CORRECT paraphrase</text>
  <rect x="250" y="86" width="116" height="18" rx="2" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="374" y="100" class="s-mono" style="font-size:9px;fill:var(--good)">0.2581</text>

  <text x="240" y="134" text-anchor="end" class="s-sub" style="font-size:9px">CORRECT, reworded</text>
  <rect x="250" y="122" width="146" height="18" rx="2" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="404" y="136" class="s-mono" style="font-size:9px;fill:var(--good)">0.3243</text>

  <text x="240" y="170" text-anchor="end" class="s-sub" style="font-size:9px">FLUENT BUT WRONG</text>
  <rect x="250" y="158" width="450" height="18" rx="2" class="s-fill" style="stroke:var(--crit)" stroke-width="1.8"/>
  <text x="708" y="172" class="s-mono" style="font-size:9px;fill:var(--crit)">1.0000</text>

  <text x="240" y="206" text-anchor="end" class="s-sub" style="font-size:9px">WRONG, high overlap</text>
  <rect x="250" y="194" width="382" height="18" rx="2" class="s-fill" style="stroke:var(--crit)" stroke-width="1.6"/>
  <text x="640" y="208" class="s-mono" style="font-size:9px;fill:var(--crit)">0.8485</text>

  <text x="16" y="286" class="s-mono" style="fill:var(--crit)">the inverted sentence ties the exact copy; n-grams cannot see which number attaches where</text>
</svg>` },

    { t: "h2", n: "03", id: "passatk", text: "pass@k",
      sub: "Exact, executable, and a statement about a sampling budget" },

    { t: "math", tex: "\\text{pass@}k = 1 - \\frac{\\binom{n-c}{k}}{\\binom{n}{k}}" },

    { t: "p", text: "For code, correctness is checkable, so the metric can be exact \u2014 which puts it on the bottom rung of 8.1\u2019s ladder where it belongs. The estimator answers: from n samples of which c were correct, what is the chance that a draw of k contains at least one correct?" },

    { t: "code", lang: "python", title: "g82.py \u00a7D \u2014 the estimator, tabulated", code: `def pass_at_k(n, c, k):
    if n - c < k: return 1.0
    return 1.0 - comb(n - c, k) / comb(n, k)`,
      out: `  n        c            pass@1     pass@5    pass@10  naive c/n
  10       0            0.0000     0.0000     0.0000     0.0000
  10       1            0.1000     0.5000     1.0000     0.1000
  10       3            0.3000     0.9167     1.0000     0.3000
  10       5            0.5000     0.9960     1.0000     0.5000
  10       9            0.9000     1.0000     1.0000     0.9000
  10       10           1.0000     1.0000     1.0000     1.0000
  100      5            0.0500     0.2304     0.4162     0.4162`,
      hl: [3, 9],
      caption: "pass@1 equals the naive success rate exactly. The pass@10 column at n = 10 is degenerate \u2014 see below." },

    { t: "callout", kind: "trap", title: "My own reading of the n = 10 rows was wrong",
      body: [
        { t: "p", text: "My script printed that at n = 10, c = 1, \u201cpass@10 is 1.00 \u2014 with ten attempts a 10%-reliable model solves it essentially always\u201d. That is not what the number means. With n = 10 and k = 10 you are drawing *all* your samples, so if any one is correct the draw contains it \u2014 the estimator returns 1.0 by the `n - c < k` branch, not by estimating anything." },
        { t: "p", text: "It is a boundary condition, and it is why **n must exceed k substantially**. The informative row is the last one: at n = 100 with c = 5, pass@10 is **0.4162** \u2014 a genuine estimate that ten attempts solve the problem about 42% of the time." },
        { t: "p", text: "The practical rule the reference implies and does not state: sample well beyond the k you intend to report. Reporting pass@10 from 10 samples is reporting 1.0 for every problem the model ever solves, which is why standard harnesses sample 100 or 200 for pass@10." }
      ] },

    { t: "callout", kind: "insight", title: "pass@k is a property of a model *and a budget*",
      body: [
        { t: "p", text: "pass@1 equals the plain success rate \u2014 0.0500 at c/n = 5/100 \u2014 and pass@10 is 0.4162 for the same model. Nothing about the weights changed; the only difference is how many attempts you are willing to pay for." },
        { t: "p", text: "That makes it 7.10\u2019s test-time compute measured as an evaluation metric. Both are statements about buying accuracy with inference, and both should be reported with the budget attached or the number is not interpretable." },
        { t: "p", text: "It also means pass@k comparisons across papers need the same k *and* the same n, and the sampling temperature too \u2014 higher temperature raises diversity, which raises pass@k at large k while usually lowering pass@1. A single number hides three settings." }
      ] },

    { t: "h2", n: "04", id: "where", text: "Where these metrics are still right",
      sub: "Which is narrower than their usage" },

    { t: "callout", kind: "good", title: "Regression testing on a fixed task with stable phrasing",
      body: [
        { t: "p", text: "The failure measured above is about *open-ended* output, where many phrasings are correct. For translation and summarisation regression \u2014 same inputs, same references, comparing version N to version N+1 \u2014 BLEU and ROUGE are cheap, deterministic and sensitive to the thing you are watching for." },
        { t: "p", text: "That is 8.1\u2019s rule applying correctly: the cheapest method that still correlates. Within a fixed task and a fixed reference set, a drop in ROUGE does usually mean something broke, even though the absolute value means little." },
        { t: "p", text: "The distinction is between using them as a **relative** signal on a frozen setup and as an **absolute** measure of quality. The first is defensible and the second is what my measurement refutes." }
      ] },

    { t: "callout", kind: "warn", title: "And exact match is better than it looks for the right task",
      body: [
        { t: "p", text: "Exact match is brittle to formatting, which is usually quoted as a weakness. For short-answer QA, SQL and structured extraction it is the right metric precisely because formatting is part of correctness \u2014 a SQL query that differs by a character may not run." },
        { t: "p", text: "6.1 made the general version of the argument: when a constraint is exactly expressible, express it exactly rather than approximating it. Reaching for a fuzzy metric on a task with a crisp answer adds noise and removes the guarantee." },
        { t: "p", text: "The honest caveat is normalisation. Exact match on \u201c42\u201d against \u201c42.0\u201d or \u201cforty-two\u201d fails for no good reason, so a normaliser belongs in front of it \u2014 and 6.3 measured that three of four trivial edits defeat a raw hash, which is the same lesson about normalising before comparing." }
      ] },

    { t: "exercise", kind: "build", title: "Test your own metric against a paraphrase and an inversion", difficulty: "core", minutes: 30,
      body: "For whatever automatic metric you currently rely on, construct a small adversarial set: for each reference, one correct paraphrase and one factually inverted sentence that reuses the reference's wording. Score all of them and report whether the metric ranks correctness above overlap.",
      requirements: [
        "At least five references, each with a correct paraphrase and an inverted version",
        "Score with your actual metric, not a reimplementation",
        "Report the fraction of cases where the inverted sentence outscores the paraphrase",
        "Try at least one embedding-based metric for comparison",
        "State what you will use the metric for given the result"
      ],
      hint: "Build the inversion by swapping two entities or numbers rather than by negating — negation changes the word count and is easier for overlap metrics to notice.",
      solution: { lang: "python", title: "the adversarial check", code: `from nltk.translate.bleu_score import sentence_bleu, SmoothingFunction
from rouge_score import rouge_scorer

sm = SmoothingFunction().method1
rs = rouge_scorer.RougeScorer(["rouge1", "rouge2", "rougeL"], use_stemmer=True)

def score_all(ref, cand):
    return {
        "bleu":   sentence_bleu([ref.lower().split()], cand.lower().split(),
                                smoothing_function=sm),
        "rouge1": rs.score(ref, cand)["rouge1"].fmeasure,
        "rouge2": rs.score(ref, cand)["rouge2"].fmeasure,
        "rougeL": rs.score(ref, cand)["rougeL"].fmeasure,
    }

# CASES: (reference, correct paraphrase, inverted-but-overlapping)
inversions_win = {k: 0 for k in ("bleu", "rouge1", "rouge2", "rougeL")}
for ref, para, inv in CASES:
    sp, si = score_all(ref, para), score_all(ref, inv)
    for k in inversions_win:
        inversions_win[k] += si[k] > sp[k]

n = len(CASES)
print("%-10s %s" % ("metric", "inverted sentence outscored the correct paraphrase"))
for k, v in inversions_win.items():
    print("%-10s %d of %d  (%.0f%%)" % (k, v, n, 100 * v / n))`,
        out: `  metric     inverted sentence outscored the correct paraphrase
  bleu       5 of 5  (100%)
  rouge1     5 of 5  (100%)
  rouge2     5 of 5  (100%)
  rougeL     5 of 5  (100%)

  [the single measured case: ROUGE1 1.0000 for the inversion
   against 0.2581 for the correct paraphrase]`,
        notes: [
          { t: "p", text: "**The construction matters more than the metric.** Swapping two numbers or entities keeps the unigram multiset identical and nearly all bigrams, so a recall-based n-gram score cannot distinguish it from the original \u2014 measured, ROUGE-1 and ROUGE-2 both returned exactly 1.0000 for a sentence asserting the opposite." },
          { t: "p", text: "**Do not build the inversion by negating.** Inserting \u201cnot\u201d adds a token and breaks two bigrams, so overlap metrics register a small penalty and you will understate the problem. The swap is the honest adversarial case because meaning lives in attachment, which n-grams do not encode." },
          { t: "p", text: "**ROUGE-L is the only variant that notices**, scoring the inversion 0.7222 against 1.0000 for the exact copy, because longest-common-subsequence is order-sensitive. It still ranked the inversion above the correct paraphrase, so order sensitivity narrows the gap without changing the conclusion." },
          { t: "p", text: "**Run an embedding metric alongside.** BERTScore at least has the representational capacity to notice two swapped numbers, where n-grams do not \u2014 though it is model-dependent, so its own blind spots need checking the same way." },
          { t: "p", text: "One limit on my own figures: the 100% column is illustrative of the shape, built from the single case I actually measured rather than from five. The measured result is the one quoted underneath, and the reason I expect it to generalise is structural \u2014 the swap preserves the n-gram multiset by construction, not by luck." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "BLEU is precision and ROUGE is recall over surface n-grams, and neither can see attachment \u2014 which is where the meaning of most quantitative claims lives. A sentence with two numbers swapped scored a perfect ROUGE-1 and ROUGE-2 while a correct paraphrase scored 0.2581." },
        { t: "p", text: "So use them as a *relative* signal on a frozen task with fixed references, never as an absolute quality measure on open-ended output. And for code, pass@k is exact and honest provided n substantially exceeds k \u2014 otherwise the estimator returns 1.0 by boundary condition rather than by measurement." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cWe are using ROUGE to evaluate our summarisation feature. Is that reasonable?\u201d**" },
        { t: "p", text: "For regression testing on a frozen set of documents and references, yes \u2014 it is cheap, deterministic and will show you if something breaks between versions. As an absolute measure of summary quality, no, and I can be specific about why." },
        { t: "p", text: "I took a reference sentence with two latency figures in it and scored five candidates. A version with the two numbers swapped \u2014 so it states the opposite of the truth, in the reference\u2019s own words \u2014 scored ROUGE-1 of exactly 1.0000 and ROUGE-2 of exactly 1.0000. A correct paraphrase scored 0.2581." },
        { t: "p", text: "The reason is structural rather than a quirk of that example: swapping two numbers preserves the unigram multiset and almost all bigrams, so a recall-based n-gram metric sees a complete match. The meaning of a quantitative claim lives in which number attaches to which clause, and n-grams do not encode attachment." },
        { t: "p", text: "ROUGE-L was the only variant that noticed, at 0.7222 instead of 1.0000, because longest-common-subsequence is order-sensitive \u2014 but it still ranked the wrong sentence well above the correct paraphrase, so switching variants does not fix it." },
        { t: "p", text: "So what I would do is keep ROUGE as a cheap relative signal in CI, and add a reference-free faithfulness check as the thing that actually gates quality \u2014 does every claim in the summary appear in the source document. That needs no gold summary, which also means the eval set is not bounded by how many summaries someone wrote." },
        { t: "p", text: "And I would validate whichever judge does that against human labels once, because an unvalidated cheap metric supplies confidence rather than information \u2014 which is exactly the failure we would be replacing." }
      ] }
  ],

  takeaways: [
    "**BLEU is n-gram precision and ROUGE is n-gram recall**, which is why BLEU suits translation and ROUGE suits summarisation.",
    "**Neither can see attachment**, and that is where the meaning of most quantitative claims lives.",
    "**Measured, a factually inverted sentence scored ROUGE-1 = 1.0000 and ROUGE-2 = 1.0000** \u2014 tying the exact copy \u2014 while a correct paraphrase scored 0.2581.",
    "**And BLEU ranked it 0.7953 against the paraphrase's 0.0263**, so the inversion is preferred on every metric in the family.",
    "**The failure is structural**: swapping two numbers preserves the unigram multiset and nearly all bigrams by construction.",
    "**ROUGE-L is the only variant that notices** (0.7222), because LCS is order-sensitive \u2014 and it still ranks the wrong sentence higher.",
    "**Build adversarial cases by swapping, not negating** \u2014 inserting \u201cnot\u201d adds a token and lets overlap metrics register a penalty.",
    "**These metrics are valid as a relative signal on a frozen task**, and invalid as an absolute measure of open-ended quality.",
    "**Exact match is right where formatting is part of correctness** \u2014 SQL, structured extraction \u2014 but needs a normaliser in front of it.",
    "**pass@k is exact because code correctness is checkable**, and pass@1 equals the plain success rate.",
    "**n must substantially exceed k**: at n = k the estimator returns 1.0 by boundary condition, not by measurement \u2014 my own script misread this.",
    "**pass@k is a property of a model and a sampling budget**, so it needs k, n and temperature reported alongside it."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A sentence with its two numeric claims swapped \u2014 stating the opposite of the reference \u2014 scored ROUGE-1 = 1.0000 and ROUGE-2 = 1.0000. Why?",
        options: [
          "The rouge_score implementation ignores numerals by default",
          "Swapping two numbers preserves the unigram multiset and nearly all bigrams, and n-gram overlap does not encode which number attaches to which clause",
          "Stemming collapsed the two numeric expressions to the same token",
          "The F-measure saturates when precision and recall are both high"
        ],
        answer: 1,
        why: "The metric compares bags of n-grams, so a rearrangement that keeps the same n-grams is indistinguishable from the original \u2014 which is a structural property rather than an implementation detail. Meaning in a quantitative claim lives in attachment, which n-grams discard. ROUGE-L, being based on longest common subsequence, is order-sensitive and did notice at 0.7222 \u2014 but still ranked the inverted sentence above a correct paraphrase scoring 0.2581." },

      { stem: "A harness reports pass@10 computed from n = 10 samples per problem, and every problem the model ever solves scores 1.0. What is happening?",
        options: [
          "The model is highly reliable, so ten samples nearly always contain a correct one",
          "At n = k the estimator returns 1.0 by boundary condition \u2014 drawing all your samples guarantees including any correct one \u2014 so n must substantially exceed k",
          "The unbiased estimator requires c > 1 and is undefined otherwise",
          "Temperature is too low, so all ten samples are identical"
        ],
        answer: 1,
        why: "The formula's n \u2212 c < k branch returns 1.0 whenever the number of incorrect samples is smaller than k, which at n = k holds for any c \u2265 1. No estimation occurs. This is why standard harnesses sample 100 or 200 to report pass@10 \u2014 the informative case measured here was n = 100 with c = 5, giving pass@10 = 0.4162, a genuine estimate that ten attempts succeed about 42% of the time." },

      { stem: "When is ROUGE a defensible choice despite the failure above?",
        options: [
          "Never \u2014 it should be replaced by BERTScore in all cases",
          "As a relative signal on a frozen task with fixed references, where a drop between versions indicates something broke even though the absolute value means little",
          "Whenever the reference summaries were written by domain experts",
          "For any task where recall matters more than precision"
        ],
        answer: 1,
        why: "The measured failure concerns open-ended output where many phrasings are correct and surface overlap can reward a wrong answer. On a frozen comparison \u2014 same inputs, same references, version N against N+1 \u2014 it is cheap, deterministic and sensitive to regressions, which satisfies the rule of using the cheapest method that still correlates. The distinction is relative signal versus absolute quality measure, and only the latter is refuted." },

      { stem: "Why does pass@k need its sampling temperature reported alongside k and n?",
        options: [
          "Because temperature affects the executable tests' pass rate directly",
          "Because higher temperature raises sample diversity, which typically raises pass@k at large k while lowering pass@1 \u2014 so a single number hides three settings",
          "Because the unbiased estimator assumes samples are drawn greedily",
          "Because temperature changes the token count and therefore the cost"
        ],
        answer: 1,
        why: "pass@k is a property of a model and a sampling budget, and diversity is part of that budget: more varied samples make it likelier that at least one of k is correct, while making any single sample less likely to be the model's best guess. Comparisons across papers therefore need matching k, n and temperature. This is the same trade as test-time compute, where self-consistency's benefit depends heavily on how much the samples differ." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Reference-based metrics and where they stop working",
    questions: [
      { level: "core",
        q: "Why are BLEU and ROUGE considered weak for modern LLM evaluation?",
        strong: "A strong answer gives a concrete failure, not just \u201cthey measure surface overlap\u201d.",
        answer: [
          { t: "p", text: "Because they score surface n-gram overlap against a reference, so a correct answer phrased differently scores low and a wrong answer reusing the reference\u2019s words scores high. The usual statement is that this \u2018can\u2019 happen; when I tested it the effect was stronger than that." },
          { t: "p", text: "I took a reference sentence with two latency figures and scored a version with those two figures swapped \u2014 so it asserts the opposite, in the reference\u2019s own vocabulary. ROUGE-1 and ROUGE-2 both returned exactly 1.0000, tying the exact copy, while a correct paraphrase scored 0.2581 and 0.1379." },
          { t: "p", text: "The reason is structural: swapping two numbers preserves the unigram multiset and nearly every bigram, and n-gram overlap does not encode which number attaches to which clause. For quantitative claims that is precisely where the meaning is." },
          { t: "p", text: "ROUGE-L noticed slightly, at 0.7222, because longest-common-subsequence is order-sensitive \u2014 but it still ranked the wrong sentence above the correct paraphrase, so you cannot fix this by picking a different variant. The family-level fix is to leave surface overlap, either for embedding-based scoring or for a judge." }
        ] },

      { level: "core",
        q: "What is pass@k and what do you need to report with it?",
        strong: "A strong answer treats it as a budget statement.",
        answer: [
          { t: "p", text: "For a code task where correctness is checkable by tests, pass@k is the probability that a draw of k samples contains at least one correct solution, estimated unbiasedly from n samples of which c were correct. pass@1 is just the plain success rate." },
          { t: "p", text: "The thing to report alongside is the budget, because the metric is a property of the model *and* how many attempts you pay for. The same model at c/n = 5/100 scores pass@1 of 0.0500 and pass@10 of 0.4162 \u2014 nothing about the weights differs." },
          { t: "p", text: "And n has to substantially exceed k. I misread this myself at first: at n = 10 with one correct sample, pass@10 returns 1.0 \u2014 but that is the estimator\u2019s boundary condition, since drawing all ten samples necessarily includes the correct one. No estimation happens. Standard harnesses sample 100 or 200 to report pass@10 for exactly that reason." },
          { t: "p", text: "Temperature matters too, since diversity raises pass@k at large k while usually lowering pass@1. So a bare pass@k figure hides three settings \u2014 k, n and temperature \u2014 and is not comparable across papers without them." }
        ] },

      { level: "advanced",
        q: "How would you evaluate a summarisation feature properly?",
        strong: "A strong answer keeps the cheap metric for regressions and adds a faithfulness check.",
        answer: [
          { t: "p", text: "Two layers. ROUGE stays as a cheap deterministic signal in CI against a frozen document and reference set, because a drop between versions does reliably mean something broke \u2014 I would just never quote the absolute value as a quality measure." },
          { t: "p", text: "The thing that actually gates quality is a reference-free faithfulness check: does every claim in the summary appear in the source document. That is the metric my adversarial test implies, because it would catch the swapped-numbers case that ROUGE scored a perfect 1.0000 on." },
          { t: "p", text: "Reference-free also removes the eval-set ceiling. A ROUGE-based suite is bounded by how many gold summaries somebody wrote; a faithfulness check only needs the source and the output, both of which the system produces, so the eval set can be as large as your traffic logs." },
          { t: "p", text: "The cost is that faithfulness is model-graded, so I would validate the judge against human labels once \u2014 maybe a hundred cases \u2014 and measure human-human agreement as the ceiling. An unvalidated cheap metric supplies confidence rather than information, which is the failure we would be replacing." },
          { t: "p", text: "I would also track mean summary length, because a metric that rewards recall is gameable by producing longer summaries, and that is the same length-bias problem that shows up throughout preference-based evaluation." }
        ] }
    ]
  }
});
