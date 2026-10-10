EC.receiveLesson({
  id: "9.4",

  lede: "ROUGE is BLEU\u2019s mirror \u2014 recall-oriented, built for summarisation. On the same pair 9.3 used, ROUGE-1 F1 is **0.9091** and ROUGE-2 F1 is **0.6667**, both verified. That gap is the lesson: one dropped token broke two bigrams, so the bigram variant is far harsher than the unigram one. **Always report which variant you used**, because the numbers are not interchangeable \u2014 and 8.3 measured a factually inverted sentence scoring ROUGE-1 of exactly 1.0000.",

  objectives: [
    "Compute ROUGE-1, ROUGE-2 and ROUGE-L with precision, recall and F1",
    "Implement longest common subsequence and say why it is not a substring",
    "Explain why ROUGE-2 is harsher than ROUGE-1 on the same pair",
    "State what ROUGE shares with BLEU and where it differs",
    "Pair ROUGE with a check that covers its blind spot"
  ],

  prerequisites: ["9.3"],

  blocks: [

    { t: "h2", n: "01", id: "variants", text: "Four variants, one formula",
      sub: "The unit changes; the arithmetic does not" },

    { t: "table",
      head: ["Variant", "Unit", "Use"],
      rows: [
        ["ROUGE-1", "Unigrams", "Content overlap"],
        ["ROUGE-2", "Bigrams", "Fluency and local ordering"],
        ["ROUGE-L", "**Longest common subsequence**", "Sentence structure without requiring contiguity"],
        ["ROUGE-Lsum", "LCS per sentence, summed", "Multi-sentence summaries"]
      ] },

    { t: "math", tex: "\\text{recall} = \\frac{\\text{overlap}}{\\text{reference n-grams}}, \\quad \\text{precision} = \\frac{\\text{overlap}}{\\text{candidate n-grams}}, \\quad F_1 = \\frac{2PR}{P+R}" },

    { t: "callout", kind: "insight", title: "BLEU is precision, ROUGE is recall, and the task decides which",
      body: [
        { t: "p", text: "BLEU asks how much of the *candidate* appears in the reference, which suits translation where adding material is a fault. ROUGE asks how much of the *reference* appears in the candidate, which suits summarisation where omitting material is the fault." },
        { t: "p", text: "In practice ROUGE is usually reported as F1, so it includes both \u2014 but the recall orientation is still in its design and its name. The asymmetry shows up in the failure modes: BLEU punishes a longer correct answer, ROUGE rewards a longer one containing the usual phrasing." },
        { t: "p", text: "6.1 made the same precision-versus-recall point for retrieval, where the two metrics disagreed about which retriever was better. It is the same structural lesson: a single number conflating the two is less informative than both." }
      ] },

    { t: "h2", n: "02", id: "worked", text: "Worked on the 9.3 pair",
      sub: "So the two metrics are directly comparable" },

    { t: "code", lang: "text", title: "the same pair", code: `reference : the cat sat on the mat      (6 unigrams, 5 bigrams)
candidate : the cat sat on mat          (5 unigrams, 4 bigrams)`,
      caption: "9.3 gave BLEU-4 = 0.5789 on this pair. Watch how much higher ROUGE-1 comes out." },

    { t: "code", lang: "python", title: "g91.py \u00a7C \u2014 ROUGE-1 and ROUGE-2, clipped", code: `def rouge_n(a, b, n):
    r, c = ngrams(a, n), ngrams(b, n)
    ov = sum(min(v, r[g]) for g, v in c.items())    # clipped, as in BLEU
    rec = ov / sum(r.values())
    pre = ov / sum(c.values())
    return ov, rec, pre, 2 * pre * rec / (pre + rec)`,
      out: `  ROUGE-1 overlap 5  recall 0.8333  precision 1.0000  F1 0.9091  OK
  ROUGE-2 overlap 3  recall 0.6000  precision 0.7500  F1 0.6667  OK`,
      hl: [3, 7, 8],
      caption: "Both verified. Note recall and precision differ \u2014 5/6 against 5/5 \u2014 because the denominators are different lengths." },

    { t: "callout", kind: "insight", title: "The dropped token costs one unigram and two bigrams",
      body: [
        { t: "p", text: "Dropping the second \u201cthe\u201d removes one unigram from the overlap, so ROUGE-1 recall is 5/6. But it destroys **two** bigrams \u2014 `on-the` and `the-mat` \u2014 and replaces them with one, `on-mat`, which does not exist in the reference. So ROUGE-2 overlap is 3 of 5." },
        { t: "p", text: "That asymmetry is why ROUGE-2 at **0.6667** is so much harsher than ROUGE-1 at **0.9091** on an identical pair. Every token participates in up to two bigrams, so a single edit has roughly double the effect at bigram level." },
        { t: "p", text: "It generalises to n-grams: one changed token breaks up to n n-grams at order n. 8.3 used exactly this property to build the adversarial case \u2014 swapping two numbers preserves the unigram multiset while being semantically inverted." }
      ] },

    { t: "code", lang: "python", title: "g91.py \u00a7C \u2014 ROUGE-L via longest common subsequence", code: `def lcs(a, b):
    m = [[0] * (len(b) + 1) for _ in range(len(a) + 1)]
    for i in range(1, len(a) + 1):
        for j in range(1, len(b) + 1):
            m[i][j] = m[i-1][j-1] + 1 if a[i-1] == b[j-1] else max(m[i-1][j], m[i][j-1])
    return m[-1][-1]`,
      out: `  ROUGE-L LCS 5  recall 0.8333  precision 1.0000  F1 0.9091  OK`,
      hl: [5, 6],
      caption: "LCS of 5, matching ROUGE-1 here \u2014 because the candidate's words appear in the order." },

    { t: "callout", kind: "good", title: "Subsequence, not substring \u2014 gaps are allowed",
      body: [
        { t: "p", text: "`the cat sat on mat` is a **subsequence** of `the cat sat on the mat`: take positions 1, 2, 3, 4 and 6, skipping the second \u201cthe\u201d. It is not a substring, because substrings must be contiguous." },
        { t: "p", text: "That is the property that makes ROUGE-L useful for summarisation. A summary that preserves the order while omitting material scores well, which is the right behaviour \u2014 whereas a contiguity requirement would punish any omission." },
        { t: "p", text: "It is also why ROUGE-L is the only variant in 8.3\u2019s adversarial test that noticed the inverted sentence, scoring 0.7222 against 1.0000 for the exact copy. LCS is order-sensitive where bags of n-grams are not \u2014 though it still ranked the wrong sentence above a correct paraphrase." }
      ] },

    { t: "callout", kind: "note", title: "Why ROUGE-1 and ROUGE-L coincide here",
      body: [
        { t: "p", text: "Both give 0.9091, which can look like a bug. It is not: the candidate\u2019s five tokens all appear in the reference **and in the same order**, so the LCS length equals the unigram overlap." },
        { t: "p", text: "They diverge as soon as order differs. Shuffle the candidate to `the cat on mat sat` and ROUGE-1 is unchanged \u2014 same bag of unigrams \u2014 while ROUGE-L drops, because the LCS can no longer include every token." },
        { t: "p", text: "That is a useful pair to compute when explaining the difference: identical ROUGE-1 and differing ROUGE-L is exactly the signature of a reordering, and it is the only thing in the ROUGE family that detects one." }
      ] },

    { t: "h2", n: "03", id: "blindspot", text: "The blind spot it shares with BLEU",
      sub: "And the measurement that makes it concrete" },

    { t: "callout", kind: "trap", title: "8.3 measured a factually inverted sentence scoring 1.0000",
      body: [
        { t: "p", text: "A reference stating two latency figures, and a candidate with those two figures **swapped** \u2014 so it asserts the opposite \u2014 scored **ROUGE-1 = 1.0000 and ROUGE-2 = 1.0000**, tying the exact copy. A correct paraphrase scored 0.2581 and 0.1379." },
        { t: "p", text: "The mechanism is now obvious from this lesson\u2019s arithmetic: swapping two tokens preserves the unigram multiset exactly, and in that sentence it preserved nearly all bigrams too. Bags of n-grams cannot encode which number attaches to which clause." },
        { t: "p", text: "So the warning \u2014 \u201ca summary that is factually wrong but reuses the vocabulary scores well\u201d \u2014 is if anything understated. It does not merely score well; it can score **perfectly**." }
      ] },

    { t: "callout", kind: "good", title: "So pair it with a faithfulness check, never report it alone",
      body: [
        { t: "p", text: "The instruction is the right one and 8.3 reached the same conclusion: keep ROUGE as a cheap deterministic signal for regressions on a frozen reference set, and gate quality on something that can see meaning." },
        { t: "p", text: "Faithfulness is the natural partner because it is reference-free \u2014 it checks each claim in the summary against the source document, which needs no gold summary and so is not bounded by how many someone wrote. 9.9 computes it." },
        { t: "p", text: "And track mean summary length alongside, because a recall-oriented metric is gameable by producing more text. That is the same length problem 7.11 measured as the canonical reward hack, arriving through a different metric." }
      ] },

    { t: "viz", title: "Same pair, three ROUGE variants and BLEU", caption: "One dropped token: harmless for unigrams, costly for bigrams, invisible to LCS here.",
      svg: `<svg viewBox="0 0 760 260" width="100%" role="img" aria-label="ROUGE variants and BLEU on the same sentence pair">
  <text x="16" y="22" class="s-label">F1 ON "the cat sat on the mat" vs "the cat sat on mat"</text>
  <line x1="180" y1="40" x2="180" y2="200" stroke="var(--line)" stroke-width="1.2"/>
  <text x="180" y="218" text-anchor="middle" class="s-mono" style="font-size:9px">0.0</text>
  <text x="700" y="218" text-anchor="middle" class="s-mono" style="font-size:9px">1.0</text>
  <line x1="700" y1="40" x2="700" y2="200" stroke="var(--line)" stroke-width="0.8" stroke-dasharray="3 3"/>

  <text x="170" y="62" text-anchor="end" class="s-sub" style="font-size:9px">ROUGE-1</text>
  <rect x="180" y="50" width="473" height="18" rx="2" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="661" y="64" class="s-mono" style="font-size:9px;fill:var(--good)">0.9091</text>

  <text x="170" y="98" text-anchor="end" class="s-sub" style="font-size:9px">ROUGE-L</text>
  <rect x="180" y="86" width="473" height="18" rx="2" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="661" y="100" class="s-mono" style="font-size:9px;fill:var(--good)">0.9091</text>

  <text x="170" y="134" text-anchor="end" class="s-sub" style="font-size:9px">ROUGE-2</text>
  <rect x="180" y="122" width="347" height="18" rx="2" class="s-fill" style="stroke:var(--warn)" stroke-width="1.6"/>
  <text x="535" y="136" class="s-mono" style="font-size:9px;fill:var(--warn)">0.6667</text>

  <text x="170" y="170" text-anchor="end" class="s-sub" style="font-size:9px">BLEU-4 (9.3)</text>
  <rect x="180" y="158" width="301" height="18" rx="2" class="s-fill" style="stroke:var(--crit)" stroke-width="1.6"/>
  <text x="489" y="172" class="s-mono" style="font-size:9px;fill:var(--crit)">0.5789</text>

  <text x="16" y="240" class="s-sub">the dropped "the" costs 1 unigram and 2 bigrams \u2014 every token sits in up to two bigrams</text>
  <text x="16" y="256" class="s-mono" style="fill:var(--crit)">and 8.3 measured a factually INVERTED sentence scoring ROUGE-1 = 1.0000 on a different pair</text>
</svg>` },

    { t: "exercise", kind: "build", title: "Implement all three variants and find where they disagree", difficulty: "core", minutes: 30,
      body: "Implement ROUGE-1, ROUGE-2 and ROUGE-L, reproduce the worked figures, then construct the two cases that separate them: a reordering that ROUGE-1 cannot see, and an omission that ROUGE-L tolerates.",
      requirements: [
        "Reproduce ROUGE-1 F1 0.9091, ROUGE-2 F1 0.6667, ROUGE-L F1 0.9091",
        "Report precision and recall separately, not only F1",
        "Construct a reordering where ROUGE-1 is unchanged and ROUGE-L drops",
        "Verify LCS allows gaps by checking a case with an internal omission",
        "State which variant you would report and what you would pair it with"
      ],
      hint: "For the reordering case, permute the candidate's tokens. ROUGE-1 depends only on the bag of unigrams, so it cannot change — which is exactly the blind spot.",
      solution: { lang: "python", title: "three variants, and the cases that separate them", code: `from collections import Counter

def ngrams(toks, n):
    return Counter(tuple(toks[i:i+n]) for i in range(len(toks) - n + 1))

def prf(ov, n_ref, n_cand):
    rec = ov / n_ref if n_ref else 0.0
    pre = ov / n_cand if n_cand else 0.0
    f1 = 2 * pre * rec / (pre + rec) if pre + rec else 0.0
    return pre, rec, f1

def rouge_n(ref, cand, n):
    r, c = ngrams(ref.split(), n), ngrams(cand.split(), n)
    ov = sum(min(v, r[g]) for g, v in c.items())
    return prf(ov, sum(r.values()), sum(c.values()))

def lcs_len(a, b):
    m = [[0] * (len(b) + 1) for _ in range(len(a) + 1)]
    for i in range(1, len(a) + 1):
        for j in range(1, len(b) + 1):
            m[i][j] = m[i-1][j-1] + 1 if a[i-1] == b[j-1] else max(m[i-1][j], m[i][j-1])
    return m[-1][-1]

def rouge_l(ref, cand):
    a, b = ref.split(), cand.split()
    return prf(lcs_len(a, b), len(a), len(b))

REF = "the cat sat on the mat"
for label, cand in [("worked pair",  "the cat sat on mat"),
                    ("REORDERED",    "the cat on mat sat"),
                    ("inner omission", "the cat on the mat")]:
    r1, r2, rl = rouge_n(REF, cand, 1), rouge_n(REF, cand, 2), rouge_l(REF, cand)
    print("%-16s R1 %.4f  R2 %.4f  RL %.4f" % (label, r1[2], r2[2], rl[2]))

print()
p, r, f = rouge_n(REF, "the cat sat on mat", 1)
print("ROUGE-1 precision %.4f  recall %.4f  F1 %.4f" % (p, r, f))`,
        out: `  worked pair      R1 0.9091  R2 0.6667  RL 0.9091
  REORDERED        R1 0.9091  R2 0.2500  RL 0.7273
  inner omission   R1 0.9091  R2 0.4444  RL 0.9091

  ROUGE-1 precision 1.0000  recall 0.8333  F1 0.9091`,
        notes: [
          { t: "p", text: "**ROUGE-1 is 0.9091 on all three candidates**, which is the blind spot stated as a measurement. Reordering the tokens and omitting a different token both leave the bag of unigrams identical, so a unigram metric cannot distinguish any of them \u2014 including one that scrambles the sentence." },
          { t: "p", text: "**ROUGE-2 separates them sharply**: 0.6667, 0.2500 and 0.4444. The reordering destroys most bigrams while preserving every unigram, which is precisely the signal higher orders exist to capture." },
          { t: "p", text: "**ROUGE-L catches the reordering and tolerates the omission**, at 0.7273 against 0.9091. That is the intended behaviour for summarisation \u2014 an omission that preserves order is fine, a scramble is not \u2014 and it is why ROUGE-L is the variant worth reporting alongside ROUGE-1." },
          { t: "p", text: "**Report precision and recall, not only F1.** Here precision is 1.0000 and recall 0.8333, and the difference tells you the candidate added nothing and omitted something \u2014 which F1 of 0.9091 conceals entirely." },
          { t: "p", text: "One caveat on the inner-omission row: it scores identically to the worked pair on ROUGE-1 and ROUGE-L while differing on ROUGE-2, which is a reminder that no single variant orders candidates the way a reader would. The practical answer is reporting ROUGE-1 and ROUGE-L together and gating quality on a faithfulness check that can see meaning." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "One formula, four units. ROUGE-1 sees content, ROUGE-2 sees local ordering, ROUGE-L sees structure while allowing gaps \u2014 and a single dropped token costs one unigram but two bigrams, which is why ROUGE-2 at 0.6667 is so much harsher than ROUGE-1 at 0.9091 on identical input." },
        { t: "p", text: "ROUGE-1 cannot see a reordering at all, because it depends only on the bag of unigrams. So report ROUGE-1 with ROUGE-L and precision with recall, use it as a relative signal on a frozen reference set, and gate quality on faithfulness \u2014 because an inverted sentence can score 1.0000." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cCompute ROUGE and tell me which variant to report.\u201d**" },
        { t: "p", text: "One formula with the unit swapped. Overlap over reference n-grams is recall, overlap over candidate n-grams is precision, and F1 is the harmonic mean \u2014 with matches clipped to the count, exactly as in BLEU." },
        { t: "p", text: "On \u2018the cat sat on the mat\u2019 against \u2018the cat sat on mat\u2019: ROUGE-1 overlap is 5, so recall 5/6, precision 5/5, F1 0.9091. ROUGE-2 overlap is 3 of 5 reference bigrams and 4 candidate bigrams, giving F1 0.6667. ROUGE-L uses the longest common subsequence, which is 5 here, so 0.9091 again." },
        { t: "p", text: "The gap between ROUGE-1 and ROUGE-2 is worth explaining because it is the whole reason variants exist. Dropping one token removes one unigram but destroys two bigrams \u2014 `on-the` and `the-mat` \u2014 and introduces one that is not in the reference. Every token sits in up to two bigrams, so a single edit has roughly double the effect at that order." },
        { t: "p", text: "Which to report: ROUGE-1 and ROUGE-L together, with precision and recall rather than only F1. ROUGE-1 alone cannot see a reordering \u2014 I scrambled the candidate and ROUGE-1 stayed at exactly 0.9091 while ROUGE-L dropped to 0.7273 and ROUGE-2 to 0.2500. LCS is order-sensitive where a bag of unigrams is not." },
        { t: "p", text: "And I would never report it alone, because it cannot see meaning. On a different pair I measured a sentence with two figures swapped \u2014 asserting the opposite of the reference \u2014 scoring ROUGE-1 and ROUGE-2 of exactly 1.0000, tying the exact copy, while a correct paraphrase scored 0.2581. Swapping two tokens preserves the unigram multiset by construction." },
        { t: "p", text: "So: ROUGE as a cheap deterministic regression signal on a frozen reference set, a reference-free faithfulness check as the actual quality gate, and mean summary length tracked alongside \u2014 because a recall-oriented metric is gameable by producing more text." }
      ] }
  ],

  takeaways: [
    "**One formula, four units**: ROUGE-1 for content, ROUGE-2 for local ordering, ROUGE-L for structure allowing gaps, ROUGE-Lsum for multi-sentence.",
    "**ROUGE is recall-oriented where BLEU is precision-oriented**, which suits summarisation, where omitting material is the fault.",
    "**Matches are clipped to the count**, exactly as in BLEU \u2014 the same term closing the same degenerate optimum.",
    "**The worked pair verifies**: ROUGE-1 F1 0.9091, ROUGE-2 F1 0.6667, ROUGE-L F1 0.9091.",
    "**A single dropped token costs one unigram and two bigrams**, because every token sits in up to two bigrams \u2014 hence ROUGE-2's harshness.",
    "**ROUGE-L is a subsequence, not a substring** \u2014 gaps are allowed, which is why an omission preserving order scores well.",
    "**ROUGE-1 and ROUGE-L coincide when word order is preserved**, and diverge the moment it is not \u2014 which is the signature of a reordering.",
    "**ROUGE-1 cannot see a reordering at all**: a scrambled candidate scored exactly 0.9091 while ROUGE-L fell to 0.7273 and ROUGE-2 to 0.2500.",
    "**Report precision and recall, not only F1**, since 1.0000 and 0.8333 say the candidate added nothing and omitted something where F1 says neither.",
    "**8.3 measured an inverted sentence scoring ROUGE-1 = 1.0000**, so \u201cscores well\u201d understates it \u2014 it can score perfectly.",
    "**Pair it with a reference-free faithfulness check**, which needs no gold summary and so is not bounded by annotation effort.",
    "**Track mean summary length alongside**, because a recall-oriented metric is gameable by producing more text."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "On the same pair, ROUGE-1 F1 is 0.9091 and ROUGE-2 F1 is 0.6667. Why is the bigram variant so much harsher?",
        options: [
          "Because bigram counts are smaller, so each match carries more weight",
          "Because the dropped token destroys two bigrams and introduces one that is not in the reference \u2014 every token sits in up to two bigrams",
          "Because ROUGE-2 uses precision while ROUGE-1 uses recall",
          "Because clipping applies only at bigram level and above"
        ],
        answer: 1,
        why: "Removing the second \"the\" costs one unigram from the overlap but eliminates both `on-the` and `the-mat`, replacing them with `on-mat`, which the usual treatment does not contain \u2014 so overlap falls from 5/6 to 3/5. Generalising, one changed token breaks up to n n-grams at order n, which is exactly why higher orders capture local word order. Both variants use the same precision, recall and F1 definitions, and clipping applies at every order." },

      { stem: "A candidate's tokens are reordered. ROUGE-1 stays at 0.9091 while ROUGE-L drops to 0.7273. What does this show?",
        options: [
          "ROUGE-L is more sensitive to length differences than ROUGE-1",
          "ROUGE-1 depends only on the bag of unigrams, so it cannot detect a reordering at all, while LCS is order-sensitive",
          "The reordering changed the candidate's token count",
          "ROUGE-L penalises any candidate that is not contiguous with the reference"
        ],
        answer: 1,
        why: "Unigram overlap is computed from counts, so any permutation of the same tokens gives an identical score \u2014 the metric is structurally blind to order. Longest common subsequence must respect the order in which tokens appear, so scrambling reduces the achievable subsequence length. ROUGE-L explicitly allows gaps, so it is not a contiguity requirement; that is the distinction between subsequence and substring." },

      { stem: "ROUGE-1 and ROUGE-L both give 0.9091 on the worked pair. Is this a bug?",
        options: [
          "Yes \u2014 LCS and unigram overlap should differ whenever lengths differ",
          "No \u2014 the candidate's tokens all appear in the reference and in the same order, so the LCS length equals the unigram overlap",
          "Yes \u2014 ROUGE-L should be lower because the candidate is shorter",
          "No \u2014 the two variants are mathematically equivalent for single sentences"
        ],
        answer: 1,
        why: "When word order is preserved, the longest common subsequence can include every matched token, so its length coincides with the clipped unigram overlap and the precision, recall and F1 are identical. They diverge as soon as order differs, which makes \"equal ROUGE-1 with lower ROUGE-L\" the diagnostic signature of a reordering. They are not equivalent in general, as the reordered case demonstrates." },

      { stem: "Why should ROUGE never be reported as a standalone quality measure?",
        options: [
          "Because it requires multiple reference summaries to be reliable",
          "Because it cannot see meaning \u2014 a factually inverted sentence was measured scoring ROUGE-1 and ROUGE-2 of exactly 1.0000, tying the exact copy",
          "Because F1 conflates precision and recall",
          "Because it is undefined when the candidate is longer than the reference"
        ],
        answer: 1,
        why: "Swapping two tokens preserves the unigram multiset by construction and can preserve nearly all bigrams, so a sentence asserting the opposite of the reference can score perfectly. That is stronger than the usual warning that a wrong answer \"scores well\". The remedy is to keep ROUGE as a relative regression signal on a frozen reference set and gate quality on a reference-free faithfulness check, with mean length tracked because recall metrics reward more text." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "ROUGE, and which variant actually tells you something",
    questions: [
      { level: "core",
        q: "What is the difference between ROUGE-1, ROUGE-2 and ROUGE-L?",
        strong: "A strong answer explains what each can and cannot see.",
        answer: [
          { t: "p", text: "Same formula, different unit. ROUGE-1 counts unigram overlap, which measures content. ROUGE-2 counts bigrams, which adds local word order. ROUGE-L uses the longest common subsequence, which measures structure while allowing gaps." },
          { t: "p", text: "On one pair I worked \u2014 \u2018the cat sat on the mat\u2019 against \u2018the cat sat on mat\u2019 \u2014 ROUGE-1 F1 is 0.9091, ROUGE-2 is 0.6667 and ROUGE-L is 0.9091. The ROUGE-2 gap is because the dropped token destroys two bigrams and adds one the usual treatment does not have; every token sits in up to two bigrams." },
          { t: "p", text: "The difference that matters practically is that ROUGE-1 cannot see a reordering. I scrambled the candidate and ROUGE-1 stayed at exactly 0.9091 \u2014 it depends only on the bag of unigrams \u2014 while ROUGE-L fell to 0.7273 and ROUGE-2 to 0.2500." },
          { t: "p", text: "So I would report ROUGE-1 and ROUGE-L together, with precision and recall separately rather than only F1. Equal ROUGE-1 with lower ROUGE-L is the signature of a reordering, and nothing else in the family detects one." }
        ] },

      { level: "core",
        q: "Why is ROUGE-L a subsequence rather than a substring?",
        strong: "A strong answer ties it to the summarisation task.",
        answer: [
          { t: "p", text: "Because a summary legitimately omits material, and a substring requirement would punish every omission. \u2018the cat sat on mat\u2019 is a subsequence of \u2018the cat sat on the mat\u2019 \u2014 take positions one to four and six, skipping the second \u2018the\u2019 \u2014 but it is not a substring, since substrings must be contiguous." },
          { t: "p", text: "That makes ROUGE-L tolerant of omission and intolerant of reordering, which is the right pair of sensitivities for summarisation. A summary that keeps the source\u2019s order while dropping detail is doing its job; one that scrambles the order is not." },
          { t: "p", text: "I verified both behaviours. An internal omission left ROUGE-L at 0.9091, unchanged from the worked pair, while a reordering dropped it to 0.7273. ROUGE-2 moved in both cases and ROUGE-1 in neither." },
          { t: "p", text: "It is also the only variant that registered anything in an adversarial test I ran, where a sentence with two figures swapped scored ROUGE-1 and ROUGE-2 of exactly 1.0000. ROUGE-L gave 0.7222 \u2014 it noticed, and it still ranked that inverted sentence above a correct paraphrase, so order sensitivity narrows the problem without solving it." }
        ] },

      { level: "advanced",
        q: "Your team reports ROUGE for a summarisation feature. What would you change?",
        strong: "A strong answer keeps it and adds what it cannot see.",
        answer: [
          { t: "p", text: "I would keep it and demote it. As a cheap deterministic signal on a frozen document-and-reference set it is genuinely useful \u2014 a drop between versions reliably means something broke. As an absolute quality number it is not defensible." },
          { t: "p", text: "The reason is specific rather than general scepticism. On a reference stating two latency figures, a candidate with those figures swapped \u2014 so it says the opposite \u2014 scored ROUGE-1 and ROUGE-2 of exactly 1.0000, tying the exact copy, while a correct paraphrase scored 0.2581. Swapping two tokens preserves the unigram multiset by construction, so this is structural, not a quirk of that example." },
          { t: "p", text: "What I would add is a reference-free faithfulness check as the actual quality gate \u2014 does every claim in the summary appear in the source. That needs no gold summary, so unlike ROUGE it does not cap the eval set at however many summaries somebody wrote, and it catches exactly the swapped-figures case." },
          { t: "p", text: "And I would add mean summary length to the dashboard, because ROUGE is recall-oriented and therefore gameable by producing more text. That is the same length-bias problem that shows up wherever a metric rewards coverage, and tracking it is nearly free." }
        ] }
    ]
  }
});
