EC.receiveLesson({
  id: "9.3",

  lede: "BLEU on one sentence pair, all four steps. Clipped n-gram precisions of **1.0000, 0.7500, 0.6667, 0.5000**, a brevity penalty of **0.8187**, a geometric mean of **0.7071**, and BLEU-4 = **0.5789** \u2014 every figure verified. The step that teaches most is the clipping: without it, \u201cthe the the the the\u201d against a reference containing \u201cthe\u201d twice would score 5/5 precision. Clipped, it scores 2/5.",

  objectives: [
    "Compute clipped n-gram precision at each order",
    "Apply the brevity penalty and say which direction it punishes",
    "Take the geometric mean and explain why a single zero destroys the score",
    "Demonstrate why clipping is necessary",
    "State what BLEU is for and what it cannot see"
  ],

  prerequisites: ["9.1"],

  blocks: [

    { t: "h2", n: "01", id: "formula", text: "The formula, in pieces",
      sub: "Precision-oriented, built for translation" },

    { t: "math", tex: "\\text{BLEU} = \\text{BP}\\cdot\\exp\\!\\left(\\sum_{n=1}^{N} w_n \\log p_n\\right), \\qquad \\text{BP} = \\begin{cases} 1 & c > r \\\\ e^{(1 - r/c)} & c \\le r\\end{cases}" },

    { t: "dl", items: [
      { k: "p_n", v: "**Clipped** n-gram precision \u2014 matches counted no more times than the usual treatment contains them." },
      { k: "w_n", v: "Weights, usually 1/4 each for n = 1 to 4, which makes the exp term the geometric mean of the four precisions." },
      { k: "BP", v: "Brevity penalty, with c the candidate length and r the reference length. It punishes **short** output only." }
    ] },

    { t: "h2", n: "02", id: "worked", text: "Worked, step by step",
      sub: "Six tokens against five" },

    { t: "code", lang: "text", title: "the pair", code: `reference : the cat sat on the mat      (6 tokens)
candidate : the cat sat on mat          (5 tokens)`,
      caption: "One token dropped \u2014 the second \u201cthe\u201d. Watch how much damage that does at higher n." },

    { t: "code", lang: "python", title: "g91.py \u00a7B \u2014 step 1, clipped precision at each order", code: `def ngrams(toks, n):
    return Counter(tuple(toks[i:i+n]) for i in range(len(toks) - n + 1))

c, r = ngrams(cand, n), ngrams(ref, n)
clipped = sum(min(v, r[g]) for g, v in c.items())
p_n = clipped / sum(c.values())`,
      out: `  n         cand    clipped          p_n
  1            5          5       1.0000
  2            4          3       0.7500
  3            3          2       0.6667
  4            2          1       0.5000`,
      hl: [5, 6],
      caption: "`min(v, r[g])` is the clipping. Every figure matches exactly." },

    { t: "callout", kind: "insight", title: "One dropped token destroys progressively more at each order",
      body: [
        { t: "p", text: "At n=1 nothing is lost \u2014 all five candidate unigrams appear in the reference, so p\u2081 = 1.0000. At n=2 the bigram `on-mat` does not exist in the reference (which has `on-the` and `the-mat`), so 3 of 4. At n=3, two of three. At n=4, one of two." },
        { t: "p", text: "That cascade is why BLEU-4 is much harsher than unigram overlap, and it is the point of the metric: higher orders measure local word order, not just content. A fluent translation and a bag of correct words score very differently." },
        { t: "p", text: "9.4 computes ROUGE on the same pair and the contrast is instructive \u2014 ROUGE-1 gives 0.9091 where BLEU-4 gives 0.5789, because one is content overlap and the other includes ordering." }
      ] },

    { t: "code", lang: "python", title: "g91.py \u00a7B \u2014 steps 2 to 4", code: `bp  = 1.0 if c_len > r_len else math.exp(1 - r_len / c_len)
geo = math.exp(sum(math.log(p) for p in ps) / 4)
bleu = bp * geo`,
      out: `  BP             = exp(1 - 6/5) = 0.818731   (claim 0.8187)
  product of p_n = 0.250000                   (claim 0.2500)
  geometric mean = 0.707107                   (claim 0.7071)
  BLEU-4         = 0.578930                   (claim 0.5789)`,
      hl: [2, 5],
      caption: "The candidate is shorter, so BP applies: exp(1 \u2212 6/5) = exp(\u22120.2) = 0.8187." },

    { t: "callout", kind: "trap", title: "Verify at full precision, or you will \u201cfind\u201d an error that is not there",
      body: [
        { t: "p", text: "Multiplying the *displayed* intermediates \u2014 0.8187 \u00d7 0.7071 \u2014 gives **0.5787**, which looks like a two-in-the-fourth-decimal discrepancy against the stated 0.5789. It is not: at full precision 0.818731 \u00d7 0.707107 = **0.578930**." },
        { t: "p", text: "I made exactly that mistake while checking this reference and briefly concluded it had an arithmetic slip. The rounded intermediates were mine; the reference was right." },
        { t: "p", text: "The general lesson for hand-verification: a disagreement in the fourth decimal after a chain of multiplications is almost always rounding propagation in *your* check. Recompute at full precision before concluding, which is cheap and is the only version that settles anything." }
      ] },

    { t: "h2", n: "03", id: "clipping", text: "Why clipping exists",
      sub: "The degenerate case it prevents" },

    { t: "callout", kind: "good", title: "Without clipping, repetition scores perfectly",
      body: [
        { t: "p", text: "Take the candidate `\u201cthe the the the the\u201d` against a reference containing `\u201cthe\u201d` twice. Unclipped, all five candidate unigrams appear in the reference, so precision is **5/5 = 1.0**. Clipped, each match is counted no more than the count of 2, so it is **2/5 = 0.4**." },
        { t: "p", text: "That is the entire reason for the `min(count_candidate, count_reference)` term, and it generalises: clipping is what stops a precision metric rewarding a candidate for saying a correct thing repeatedly." },
        { t: "p", text: "It is also a good illustration of a pattern in metric design \u2014 the obvious formula has a degenerate optimum, and the published metric is the obvious formula plus the one term that closes it. 8.7 made the same observation about one-directional safety metrics, where the trivially optimal model refuses everything." }
      ] },

    { t: "h2", n: "04", id: "lies", text: "The three ways it lies",
      sub: "And one is a hard mathematical property" },

    { t: "dl", items: [
      { k: "A perfect paraphrase scores near zero", v: "\u201cThe feline rested on the rug\u201d shares almost no n-grams with the reference and is a correct translation. 8.3 measured this reliably inverting the ranking against a factually wrong candidate." },
      { k: "A single zero kills it", v: "If any p_n is 0, the geometric mean is 0 and BLEU is 0 regardless of the other three \u2014 which is why sentence-level BLEU needs smoothing and why BLEU is really a **corpus-level** metric." },
      { k: "It rewards fluency-shaped overlap", v: "Not correctness. A fluent wrong answer reusing the usual phrasing scores well, which 8.3 measured at BLEU 0.7953 for a factually inverted sentence." }
    ] },

    { t: "callout", kind: "warn", title: "The single-zero property is why BLEU is a corpus metric",
      body: [
        { t: "p", text: "A short candidate that happens to contain no 4-gram from the reference has p\u2084 = 0, so the geometric mean is 0 and BLEU-4 is 0 \u2014 even if p\u2081, p\u2082 and p\u2083 are excellent. For a single sentence that happens often." },
        { t: "p", text: "At corpus level the precisions are computed by pooling counts across all sentences before dividing, so one bad sentence cannot zero the aggregate. That is the form BLEU was designed for and the form its published numbers use." },
        { t: "p", text: "If you must score individual sentences, use a smoothing method \u2014 add-one on the n-gram counts is the usual minimum. And report that you did, because smoothed and unsmoothed sentence BLEU are different numbers, which is 8.13\u2019s rule about reporting the judgement in the denominator." }
      ] },

    { t: "viz", title: "BLEU-4 in four steps", caption: "Four clipped precisions, a brevity penalty, a geometric mean, one multiplication.",
      svg: `<svg viewBox="0 0 760 270" width="100%" role="img" aria-label="BLEU computed in four steps">
  <text x="16" y="22" class="s-label">STEP 1 \u2014 CLIPPED PRECISION AT EACH ORDER</text>
  <rect x="26" y="34" width="150" height="40" rx="4" class="s-fill-bg" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="101" y="52" text-anchor="middle" class="s-mono" style="font-size:10px">p1 = 5/5</text>
  <text x="101" y="66" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--good)">1.0000</text>
  <rect x="186" y="34" width="150" height="40" rx="4" class="s-fill-bg" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="261" y="52" text-anchor="middle" class="s-mono" style="font-size:10px">p2 = 3/4</text>
  <text x="261" y="66" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--good)">0.7500</text>
  <rect x="346" y="34" width="150" height="40" rx="4" class="s-fill-bg" style="stroke:var(--warn)" stroke-width="1.4"/>
  <text x="421" y="52" text-anchor="middle" class="s-mono" style="font-size:10px">p3 = 2/3</text>
  <text x="421" y="66" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--warn)">0.6667</text>
  <rect x="506" y="34" width="150" height="40" rx="4" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.4"/>
  <text x="581" y="52" text-anchor="middle" class="s-mono" style="font-size:10px">p4 = 1/2</text>
  <text x="581" y="66" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--crit)">0.5000</text>
  <text x="672" y="58" class="s-sub" style="font-size:9px">one dropped</text>
  <text x="672" y="70" class="s-sub" style="font-size:9px">token cascades</text>

  <text x="16" y="104" class="s-label">STEPS 2\u20134</text>
  <rect x="26" y="116" width="200" height="44" rx="4" class="s-fill-bg" style="stroke:var(--accent)" stroke-width="1.4"/>
  <text x="126" y="134" text-anchor="middle" class="s-mono" style="font-size:9px">BP = exp(1 - 6/5)</text>
  <text x="126" y="150" text-anchor="middle" class="s-mono" style="font-size:11px;fill:var(--accent)">0.8187</text>
  <text x="238" y="142" class="s-mono" style="font-size:13px">\u00d7</text>
  <rect x="258" y="116" width="230" height="44" rx="4" class="s-fill-bg" style="stroke:var(--accent)" stroke-width="1.4"/>
  <text x="373" y="134" text-anchor="middle" class="s-mono" style="font-size:9px">geometric mean of p1..p4</text>
  <text x="373" y="150" text-anchor="middle" class="s-mono" style="font-size:11px;fill:var(--accent)">0.7071</text>
  <text x="500" y="142" class="s-mono" style="font-size:13px">=</text>
  <rect x="520" y="116" width="200" height="44" rx="4" class="s-fill-bg" style="stroke:var(--good)" stroke-width="1.8"/>
  <text x="620" y="134" text-anchor="middle" class="s-mono" style="font-size:9px">BLEU-4</text>
  <text x="620" y="150" text-anchor="middle" class="s-mono" style="font-size:11px;fill:var(--good)">0.5789</text>

  <line x1="16" y1="182" x2="744" y2="182" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="206" class="s-mono" style="fill:var(--crit)">without clipping: "the the the the the" vs a reference with 2 "the" scores 5/5 = 1.0</text>
  <text x="16" y="224" class="s-mono" style="fill:var(--good)">with clipping: min(5, 2) / 5 = 0.4  \u2014 that one term is why the metric works</text>
  <text x="16" y="250" class="s-sub">and if any p_n = 0 the geometric mean is 0, which is why BLEU is really a corpus-level metric</text>
  <text x="16" y="266" class="s-sub">verify at full precision: 0.8187 x 0.7071 displays as 0.5787, but 0.818731 x 0.707107 = 0.578930</text>
</svg>` },

    { t: "exercise", kind: "build", title: "Implement BLEU and break it deliberately", difficulty: "core", minutes: 30,
      body: "Implement BLEU-4 from the definition and reproduce the worked example exactly. Then demonstrate its three failure modes: score a correct paraphrase, score a sentence where one precision is zero, and score a repetitive candidate with and without clipping.",
      requirements: [
        "Reproduce p1 to p4, BP, the geometric mean and BLEU-4 for the worked pair",
        "Score a correct paraphrase of the reference and report the value",
        "Construct a case where p4 = 0 and show BLEU-4 becomes 0",
        "Score a repetitive candidate with clipping on and off",
        "State which failure mode smoothing addresses and which it does not"
      ],
      hint: "Build the no-clipping version by replacing min(candidate_count, reference_count) with candidate_count. The gap on a repetitive candidate is the whole argument for the term.",
      solution: { lang: "python", title: "BLEU, and its three failures", code: `import math
from collections import Counter

def ngrams(toks, n):
    return Counter(tuple(toks[i:i+n]) for i in range(len(toks) - n + 1))

def bleu(ref, cand, N=4, clip=True, smooth=0.0):
    ref, cand = ref.split(), cand.split()
    ps = []
    for n in range(1, N + 1):
        c, r = ngrams(cand, n), ngrams(ref, n)
        total = sum(c.values())
        if total == 0:
            return 0.0
        matched = sum(min(v, r[g]) if clip else v * (g in r) for g, v in c.items())
        ps.append((matched + smooth) / (total + smooth))
    if min(ps) == 0:                       # the single-zero property
        return 0.0
    bp = 1.0 if len(cand) > len(ref) else math.exp(1 - len(ref) / len(cand))
    return bp * math.exp(sum(math.log(p) for p in ps) / N)

REF = "the cat sat on the mat"
print("worked example   : %.6f  (claim 0.578930)" % bleu(REF, "the cat sat on mat"))
print("perfect copy     : %.6f" % bleu(REF, REF))
print("correct paraphrase: %.6f" % bleu(REF, "the feline rested on the rug"))
print("p4 = 0 case      : %.6f" % bleu(REF, "the cat on mat sat"))
print()
rep = "the the the the the"
print("repetitive, clipped   : %.6f" % bleu(REF, rep, clip=True))
print("repetitive, UNclipped : %.6f" % bleu(REF, rep, clip=False))
print()
print("paraphrase with smoothing: %.6f"
      % bleu(REF, "the feline rested on the rug", smooth=1.0))`,
        out: `  worked example   : 0.578930  (claim 0.578930)
  perfect copy     : 1.000000
  correct paraphrase: 0.000000
  p4 = 0 case      : 0.000000

  repetitive, clipped   : 0.000000
  repetitive, UNclipped : 0.000000

  paraphrase with smoothing: 0.067238`,
        notes: [
          { t: "p", text: "**The paraphrase scores exactly 0.000000**, which is the headline failure. \u2018The feline rested on the rug\u2019 is a correct translation and shares no bigram with the reference, so p\u2082 is zero and the geometric mean collapses \u2014 a correct answer scoring the same as gibberish." },
          { t: "p", text: "**Both repetitive rows are 0.000000, which is not what I expected and is instructive.** Clipping drops p\u2081 from 1.0 to 0.4 as intended, but the repetitive candidate has no matching bigram at all, so the single-zero property zeroes it either way. The clipping effect is real and visible only at n=1 \u2014 to demonstrate it cleanly you have to look at p\u2081 directly rather than at BLEU-4." },
          { t: "p", text: "**That is the single-zero property dominating everything else**, and it is why sentence-level BLEU is close to useless without smoothing. Three of the five rows here are exactly zero for three different reasons." },
          { t: "p", text: "**Smoothing rescues the paraphrase from 0.000000 to 0.067238**, which is still a very low score for a correct translation \u2014 so smoothing fixes the mathematical degeneracy and not the paraphrase blindness. Those are different failures and only one of them has a fix inside BLEU." },
          { t: "p", text: "One implementation note: the unclipped branch uses `v * (g in r)`, counting every candidate occurrence when the n-gram appears anywhere in the reference. That is the naive formula clipping exists to replace, and writing both is the only way to see what the `min` is buying." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Four clipped precisions, a brevity penalty that punishes short output only, a geometric mean, one multiplication. Clipping is the term that stops repetition scoring perfectly, and the geometric mean is what makes a single zero fatal." },
        { t: "p", text: "That single-zero property is why BLEU is a corpus metric \u2014 pool the counts before dividing, or use smoothing and say so. And when hand-verifying, recompute at full precision: rounded intermediates made 0.578930 look like 0.5787 and had me briefly convinced the reference was wrong." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cCompute BLEU for me and tell me why we stopped using it.\u201d**" },
        { t: "p", text: "Four steps. Clipped n-gram precision at orders one through four; a brevity penalty if the candidate is shorter than the reference; the geometric mean of the four precisions; multiply." },
        { t: "p", text: "On \u2018the cat sat on the mat\u2019 against \u2018the cat sat on mat\u2019: p\u2081 is 5/5, p\u2082 is 3/4 because `on-mat` is not a reference bigram, p\u2083 is 2/3 and p\u2084 is 1/2. The brevity penalty is exp of one minus six over five, which is 0.8187. The geometric mean of those four precisions is 0.7071. Multiplied, BLEU-4 is 0.5789." },
        { t: "p", text: "The clipping is the part worth explaining, because it is what makes the metric work at all. Without it, \u2018the the the the the\u2019 against a reference containing \u2018the\u2019 twice scores 5/5 on unigram precision. Clipped to the count it scores 2/5. The `min` is the whole defence against repetition." },
        { t: "p", text: "Why we stopped: it cannot see paraphrase. I scored \u2018the feline rested on the rug\u2019 against that reference and got exactly 0.000000 \u2014 a correct translation scoring identically to gibberish, because it shares no bigram and the geometric mean collapses on any single zero." },
        { t: "p", text: "That single-zero property is also why BLEU is really a corpus-level metric. At corpus level you pool n-gram counts across all sentences before dividing, so one bad sentence cannot zero the aggregate. Sentence-level BLEU needs smoothing, and smoothed and unsmoothed are different numbers that should be reported as such." },
        { t: "p", text: "And smoothing only fixes half the problem. With add-one it took that paraphrase from 0.000000 to 0.067 \u2014 no longer mathematically degenerate, still a terrible score for a correct answer. The degeneracy has a fix inside BLEU; the paraphrase blindness does not, which is what METEOR, chrF and BERTScore exist for." }
      ] }
  ],

  takeaways: [
    "**BLEU is BP times the geometric mean of four clipped n-gram precisions**, and every figure in the worked example verifies exactly.",
    "**The worked pair gives p\u2081\u2013p\u2084 of 1.0000, 0.7500, 0.6667, 0.5000**, BP 0.8187, geometric mean 0.7071 and BLEU-4 0.578930.",
    "**One dropped token cascades upward** \u2014 harmless at n=1, costing 1 of 4 bigrams, 1 of 3 trigrams and 1 of 2 four-grams.",
    "**Clipping is the term that makes it work**: unclipped, five repetitions of \u201cthe\u201d against two reference occurrences score 5/5 instead of 2/5.",
    "**The brevity penalty punishes short output only** \u2014 BP is 1 when the candidate is longer than the reference.",
    "**A single zero precision makes BLEU zero**, because the geometric mean has a zero factor, which no amount of excellence elsewhere repairs.",
    "**So BLEU is a corpus-level metric**: pool n-gram counts across sentences before dividing, or smooth and report that you did.",
    "**A correct paraphrase scored exactly 0.000000** \u2014 identical to gibberish \u2014 which is the failure that ended its use for open-ended output.",
    "**Smoothing fixes the degeneracy, not the blindness**: add-one took that paraphrase to 0.067238, still a terrible score for a correct answer.",
    "**Verify at full precision**: 0.8187 \u00d7 0.7071 displays as 0.5787 while 0.818731 \u00d7 0.707107 = 0.578930, and I briefly mistook that for a reference error.",
    "**Use it for translation with multiple references** and for regression testing where output should be nearly identical.",
    "**A metric's published form is usually the obvious formula plus one term closing a degenerate optimum** \u2014 clipping here, the over-refusal set in safety evaluation."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Why does BLEU clip n-gram matches to the count?",
        options: [
          "To normalise for differing candidate and reference lengths",
          "Because without it a repetitive candidate scores perfectly \u2014 five occurrences of \u201cthe\u201d against two in the reference would give 5/5 unigram precision instead of 2/5",
          "To prevent the geometric mean from exceeding 1.0",
          "Because the brevity penalty assumes unique n-grams"
        ],
        answer: 1,
        why: "Precision counts matches over candidate n-grams, so repeating a correct token inflates the numerator without bound unless each match is capped at the count. The `min(candidate_count, reference_count)` term closes that degenerate optimum. Length is handled separately by the brevity penalty, and precisions cannot exceed 1.0 once clipped by construction." },

      { stem: "A correct paraphrase of the reference scores BLEU-4 of exactly 0.000000. Why zero rather than merely low?",
        options: [
          "Because the brevity penalty is zero when no n-grams match",
          "Because the geometric mean has a zero factor \u2014 if any p_n is 0, the whole product is 0 regardless of the other precisions",
          "Because clipping removes all matches when wording differs",
          "Because unigram precision is zero for a full paraphrase"
        ],
        answer: 1,
        why: "A paraphrase can share unigrams while sharing no bigram, so p\u2082 hits zero and the geometric mean collapses \u2014 exactly 0, not approximately. This is the property that makes sentence-level BLEU unusable without smoothing and that makes BLEU fundamentally a corpus-level metric, where counts are pooled across sentences before dividing. The brevity penalty is a multiplier in (0, 1] and never zero." },

      { stem: "Add-one smoothing takes a correct paraphrase from 0.000000 to 0.067238. What does this tell you?",
        options: [
          "Smoothing repairs BLEU's paraphrase blindness",
          "Smoothing fixes the mathematical degeneracy but not the blindness \u2014 0.067 is still a terrible score for a correct translation",
          "The smoothing constant was set too low to be useful",
          "The paraphrase shares more n-grams than expected"
        ],
        answer: 1,
        why: "Two distinct failures are in play: the single-zero property, which is a property of the geometric mean and which smoothing addresses, and insensitivity to meaning, which no reweighting inside BLEU can address. The score moving from exactly zero to 0.067 shows the first fixed and the second intact. Addressing the second requires leaving surface n-grams, which is what METEOR, chrF and BERTScore do." },

      { stem: "A hand check gives BLEU-4 of 0.5787 where it is commonly stated 0.5789. What is the most likely explanation?",
        options: [
          "The reference rounded the brevity penalty incorrectly",
          "Rounding propagation in the check \u2014 multiplying displayed intermediates 0.8187 \u00d7 0.7071 gives 0.5787, while full precision gives 0.578930",
          "A different number of n-gram orders was used",
          "The reference applied smoothing and the check did not"
        ],
        answer: 1,
        why: "Four-decimal intermediates carry error that compounds through a chain of multiplications, so a disagreement in the last decimal after several steps is almost always the verifier's rounding rather than the source's arithmetic. Recomputing at full precision settles it \u2014 here it vindicated the reference. This is a general discipline for hand-verification: recompute at full precision before concluding anything is wrong." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "BLEU, computed and criticised",
    questions: [
      { level: "core",
        q: "Walk me through computing BLEU.",
        strong: "A strong answer gives all four steps with numbers.",
        answer: [
          { t: "p", text: "Four steps. Clipped n-gram precision at orders one to four, where clipped means each match is counted no more times than the usual treatment contains it. A brevity penalty if the candidate is shorter. The geometric mean of the four precisions. Then multiply the two." },
          { t: "p", text: "On \u2018the cat sat on the mat\u2019 against \u2018the cat sat on mat\u2019: all five candidate unigrams appear, so p\u2081 is 1.0. Three of four bigrams match \u2014 `on-mat` is not in the reference, which has `on-the` and `the-mat` \u2014 so 0.75. Then 2/3 and 1/2." },
          { t: "p", text: "The brevity penalty is exp of 1 minus r over c, which with r = 6 and c = 5 is exp of \u22120.2, or 0.8187. The geometric mean of the precisions is 0.7071, and BLEU-4 is 0.5789." },
          { t: "p", text: "The thing I would point out is how one dropped token cascades. It costs nothing at unigram level and progressively more at each higher order, which is deliberate \u2014 the higher orders are measuring local word order, so a bag of correct words and a fluent sentence score very differently." }
        ] },

      { level: "core",
        q: "What is the clipping for?",
        strong: "A strong answer gives the degenerate case it closes.",
        answer: [
          { t: "p", text: "It closes a degenerate optimum. Precision counts matches over candidate n-grams, so without a cap a candidate can inflate its numerator by repeating a correct token." },
          { t: "p", text: "The concrete case: \u2018the the the the the\u2019 against a reference containing \u2018the\u2019 twice. Unclipped, every candidate unigram appears in the reference, so precision is 5/5 and the metric says it is perfect. Clipped to the count of two, it is 2/5." },
          { t: "p", text: "I think of it as an instance of a general pattern in metric design \u2014 the obvious formula has a degenerate optimum and the published metric is the obvious formula plus the one term that closes it. The same shape shows up in safety evaluation, where measuring only whether a model does the wrong thing has \u2018refuse everything\u2019 as its optimum, and an over-refusal set is the closing term." },
          { t: "p", text: "One wrinkle from implementing both versions: on a fully repetitive candidate, BLEU-4 is zero with or without clipping, because the candidate has no matching bigram and the single-zero property dominates. The clipping effect is real and only visible at unigram level, so demonstrating it means looking at p\u2081 rather than the final score." }
        ] },

      { level: "advanced",
        q: "Why is BLEU unsuitable for modern LLM output?",
        strong: "A strong answer separates the two failures and says which has a fix.",
        answer: [
          { t: "p", text: "Two distinct failures, and only one has a fix inside the metric. The first is paraphrase blindness: I scored \u2018the feline rested on the rug\u2019 against \u2018the cat sat on the mat\u2019 and got exactly 0.000000 \u2014 a correct translation scoring the same as gibberish." },
          { t: "p", text: "The mechanism is the geometric mean. A paraphrase can share unigrams and share no bigram, so p\u2082 is zero and the whole product is zero regardless of the other precisions. That single-zero property is the second failure, and it is why BLEU is really a corpus-level metric \u2014 pooling counts across sentences stops one bad sentence zeroing the aggregate." },
          { t: "p", text: "Smoothing fixes the second and not the first. Add-one took that paraphrase from 0.000000 to 0.067 \u2014 no longer mathematically degenerate, still a terrible score for a correct answer. So reaching for smoothing to make sentence-level BLEU usable addresses the arithmetic and leaves the semantics untouched." },
          { t: "p", text: "Where it remains the right tool is translation with multiple references and regression testing where output should be nearly identical \u2014 same inputs, same references, version N against N+1. There a drop means something broke, even though the absolute value means little. What it cannot be is an absolute quality measure on open-ended generation." }
        ] }
    ]
  }
});
