EC.receiveLesson({
  id: "6.3",
  lede: "BM25 scores a document by summing, over the query's terms, an IDF weight times a saturating term-frequency factor. Implemented term by term it correlates **0.9999** with `rank_bm25`, and the measurement throws up three things worth more than the formula: a sweep of `k1` and `b` that produces **six identical rows** (and the algebra that predicts it), an IDF variant difference that weights the stopword *\u201cthe\u201d* **4.5\u00d7 higher** in the library than in my implementation, and a two-document corpus where the library's IDF is **exactly zero** so both documents score 0.0 and the query is unanswerable. BM25 is not one formula \u2014 it is a family, and the part that differs is the part that misbehaves on the tiny corpora you write tests on.",
  objectives: [
    "Implement the BM25 scoring formula term by term",
    "Verify it against a library without being fooled by tied scores",
    "Explain what k1 and b control and predict when they do nothing",
    "Compare IDF variants and say where they diverge",
    "State what BM25 fixes and the one failure it cannot reach"
  ],
  prerequisites: ["6.2"],
  blocks: [
    { t: "h2", n: "01", id: "formula", text: "The formula", sub: "Term by term" },

    {"kind": "matrix", "title": "Three things worth more than the formula", "caption": "Implemented term by term it correlates **0.9999** with `rank_bm25`. The surprise is the stopword handling: BM25Okapi does **not** floor a negative IDF to zero — it substitutes `epsilon × average_idf`, so *“the”* scores **0.7621** where a floor-to-zero variant gives 0.1681.", "cols": ["my implementation", "rank_bm25"], "rows": ["correlation overall", "IDF of a stopword", "score for “the”", "what k₁ and b control"], "cells": [[{"text": "0.9999", "tone": "good"}, {"text": "the baseline", "tone": "good"}], [{"text": "floored to 0", "tone": "warn"}, {"text": "epsilon x average_idf", "tone": "crit"}], [{"text": "0.1681", "tone": "warn"}, {"text": "0.7621", "tone": "crit"}], ["saturation and length", {"text": "the same — not the surprise", "tone": "good"}]], "t": "diagram", "id": "dg-6_3-01-0"},




    { t: "math", tex: "\\mathrm{score}(q,d) = \\sum_{t \\in q} \\mathrm{IDF}(t) \\cdot \\frac{f(t,d)\\,(k_1+1)}{f(t,d) + k_1\\left(1 - b + b\\,\\frac{|d|}{\\mathrm{avgdl}}\\right)}" },
    { t: "code", lang: "python", title: "The implementation",
      code: 'def idf(self, t):\n    n = self.df.get(t, 0)\n    return math.log((self.N - n + 0.5) / (n + 0.5) + 1.0)\n\ndef score(self, query, i):\n    d = self.docs[i]\n    total = 0.0\n    for t in tok(query):\n        f = d.count(t)\n        if f == 0:\n            continue\n        num = f * (self.k1 + 1)\n        den = f + self.k1 * (1 - self.b + self.b * self.dl[i] / self.avgdl)\n        total += self.idf(t) * num / den\n    return total',
      out: "  corpus: N=41 documents, avgdl=25.5 tokens\n  query : 'Idempotency-Key header'\n\n  the contribution of each query term to api-idempotency:\n    idempotency-key    df=1   idf=3.332  f=1  ->  3.0849\n    header             df=4   idf=2.234  f=1  ->  2.0678\n    TOTAL              5.1527",
      caption: "The rare term contributes more than the common one, which is the whole mechanism." },
    { t: "h2", n: "02", id: "ties", text: "Verifying it without fooling yourself", sub: "A tied tail makes an equality check meaningless" },
    { t: "p", text: "Only **4 of 41** documents score above zero for that two-term query \u2014 most contain neither term. So ranks 5 through 41 are all tied at 0.0000, and their order is whatever the sort happened to produce." },
    { t: "callout", kind: "trap", title: "Comparing two rankings over a tied tail tells you nothing", body: [
      { t: "p", text: "Two orderings derived from the **same scores** can differ, purely because one sorted `(score, index)` descending and the other used `argsort` ascending by index. A `mine[:5] == ref[:5]` check will pass or fail depending on which tie-break each path happened to use." },
      { t: "p", text: "That is a measurement bug, not a retrieval one, and it cuts both ways: it will have you debugging a correct implementation, or quietly reassure you about a broken one. Compare only down to the last non-zero score, or use a rank correlation \u2014 which here is **0.9999**." }
    ] },
    { t: "h2", n: "03", id: "idf", text: "Two IDF variants", sub: "And the surprise is where they differ" },
    { t: "table", head: ["", "Formula", "Sign"], rows: [
      ["mine (Lucene-style)", "`log((N - df + 0.5) / (df + 0.5) + 1)`", "always positive"],
      ["`BM25Okapi`", "`log((N - df + 0.5) / (df + 0.5))`", "**crosses zero at df = N/2**"]
    ] },
    { t: "code", lang: "text", title: "The same three terms under both",
      code: "term              df     mine     rank_bm25\nidempotency-key   1      3.3322   3.2958\nheader            4      2.2336   2.1203\nthe               35     0.1681   0.7621",
      caption: "They agree closely on rare terms and diverge by 4.5\u00d7 on the commonest one." },
    { t: "callout", kind: "insight", title: "The floor over-weights the most common terms", body: [
      { t: "p", text: "`the` appears in 35 of 41 documents, so `BM25Okapi`'s raw IDF for it is **\u22121.6977** \u2014 negative. `rank_bm25` does not use that; it substitutes `epsilon \u00d7 average_idf`, which here is `0.25 \u00d7 3.0485 = 0.7621`." },
      { t: "p", text: "So the guard that exists to prevent negative scores ends up weighting a stopword at 0.7621 where my variant gives it 0.1681 \u2014 about **4.5\u00d7 higher**. Neither is wrong; they are different variants of the same family. But the difference is concentrated exactly where it is least welcome, and 6.4 shows what that does to a real query." }
    ] },
    { t: "h2", n: "04", id: "tiny", text: "Where the Okapi variant breaks down", sub: "On the corpus size you write tests on" },
    { t: "code", lang: "text", title: "Two documents, one query term",
      code: "term in 1 of 2  ('sat')\n  raw Okapi idf       : 0.0000\n  rank_bm25 idf used  : 0.0000\n  rank_bm25 get_scores: [0.0, 0.0]\n  my idf              : 0.6931\n\nterm in 2 of 2  ('sat')\n  raw Okapi idf       : -1.6094\n  rank_bm25 idf used  : -0.1006\n  rank_bm25 get_scores: [-0.1006, -0.1006]\n  my idf              : 0.1823",
      caption: "In the first case one document plainly contains the word and both score zero." },
    { t: "p", text: "With the term in 1 of 2 documents, the Okapi IDF is exactly `log(1.5 / 1.5) = log(1) = 0`, so both documents score 0.0 and the query is unanswerable. With it in 2 of 2, the IDF is negative and the epsilon floor is computed from the average IDF \u2014 which is itself negative here \u2014 so the \u201cfloor\u201d is negative too and both documents score below zero." },
    { t: "callout", kind: "warn", title: "Which is exactly where your unit tests live", body: [
      { t: "p", text: "The lesson is not that `rank_bm25` is buggy \u2014 it implements a published variant faithfully. It is that BM25's IDF term is the part that differs between variants, and it misbehaves on corpora of two or three documents." },
      { t: "p", text: "So a BM25 unit test built on a toy corpus can assert the wrong thing, pass, and tell you nothing about production. Test the scoring arithmetic on a fixed corpus of realistic size, and test the ranking behaviour separately." }
    ] },
    { t: "h2", n: "05", id: "k1b", text: "What k1 and b control", sub: "And why they do nothing here" },
    { t: "code", lang: "text", title: "Six settings, six identical rows",
      code: "k1    b      MRR (exact terms)   MRR (natural)\n0.0   0.75   1.000               0.286\n0.5   0.75   1.000               0.286\n1.5   0.75   1.000               0.286\n3.0   0.75   1.000               0.286\n1.5   0.00   1.000               0.286\n1.5   1.00   1.000               0.286",
      caption: "Not a broken sweep \u2014 what the algebra predicts on this corpus." },
    { t: "dl", items: [
      ["`k1` does nothing because every matched term appears exactly once", "The term-frequency distribution over all matches is `{1: 13}`. With `f = 1`, the factor multiplies every term in every document by the same amount, so the **order** is untouched. `k1` only reorders when documents differ in how often they repeat a term."],
      ["`b` does nothing because the documents are the same length", "Lengths are min 17, mean 25.5, max 39 tokens, with a standard deviation of 4.5. `b` normalises by `|d| / avgdl`, so with little variation there is nothing to correct."]
    ] },
    { t: "code", lang: "text", title: "A constructed corpus where k1 does reorder",
      code: "k1=0.0    doc0 (alpha x1)=0.1823  doc1 (alpha x5)=0.1823  ratio 1.00\nk1=1.5    doc0 (alpha x1)=0.1823  doc1 (alpha x5)=0.3506  ratio 1.92\nk1=100.0  doc0 (alpha x1)=0.1823  doc1 (alpha x5)=0.8769  ratio 4.81",
      caption: "At `k1=0` repetition is worth nothing; as `k1` grows it saturates toward 5\u00d7." },
    { t: "callout", kind: "mental", title: "A flat sweep is a result, not a failure", body: [
      { t: "p", text: "It is tempting to widen the grid when every row comes back the same. The better move is to work out what the parameter does and check whether the corpus exercises it \u2014 here, both parameters were provably inert for structural reasons, and no grid would have found otherwise." },
      { t: "p", text: "That is worth generalising: before tuning anything, confirm the data varies along the axis the parameter controls. A flat sweep on a corpus of uniform-length documents with no repeated terms is the expected outcome, and reading it as \u201cBM25 tuning does not matter\u201d would be the wrong conclusion to carry to a different corpus." }
    ] },
    { t: "h2", n: "06", id: "limits", text: "What BM25 fixes and what it cannot", sub: "The mirror image of 6.2" },
    { t: "code", lang: "text", title: "Both query classes",
      code: "exact terms   : R@5 1.000  MRR 1.000   (dense was 0.875 / 0.781)\nnatural       : R@5 0.357  MRR 0.286   (dense was 1.000 / 0.964)",
      caption: "Perfect on the class dense missed; far worse on the class dense handled." },
    { t: "p", text: "The worst single case is `I forgot my password`, which scores above zero on **0 of 41** documents. The relevant document says *\u201cCredential recovery \u2026 signed recovery link\u201d* and contains neither *forgot* nor *password*. No value of `k1` or `b` reaches that, because the term is not in the document at all \u2014 it is the one failure lexical tuning cannot touch, and 6.4 shows what BM25 returns anyway." },
    { t: "exercise", kind: "build", title: "Implement BM25 from the formula",
      difficulty: "advanced", minutes: 36,
      body: "Implement BM25 scoring term by term and show each query term's contribution to one document. Verify against rank_bm25, being careful about tied scores. Compare the two IDF variants on rare and common terms, and find the corpus size where the library's variant breaks down. Sweep k1 and b, explain the result algebraically, and construct a corpus where k1 does reorder. Finally, measure both query classes.",
      requirements: ["Implement the formula and show per-term contributions with df, idf and f",
        "Verify against rank_bm25 and explain why an equality check over tied scores is meaningless",
        "Compare both IDF variants on a rare term and a stopword",
        "Show the two-document cases where the Okapi variant returns zero and negative",
        "Sweep k1 and b, and explain algebraically why the rows are identical",
        "Construct a corpus where k1 reorders documents",
        "Measure both query classes and identify the failure tuning cannot reach"],
      hint: "When the k1/b sweep comes back flat, do not widen the grid. Work out what each parameter multiplies and check whether the corpus varies along that axis.",
      solution: { lang: "python", title: "x0603.py \u2014 six identical rows, and why",
        code: 'class MyBM25(object):\n    def __init__(self, docs, k1=1.5, b=0.75):\n        self.k1, self.b = k1, b\n        self.docs = [tok(d) for d in docs]\n        self.N = len(self.docs)\n        self.dl = [len(d) for d in self.docs]\n        self.avgdl = sum(self.dl) / float(self.N)\n        self.df = {}\n        for d in self.docs:\n            for t in set(d):\n                self.df[t] = self.df.get(t, 0) + 1\n\n    def idf(self, t):\n        n = self.df.get(t, 0)\n        return math.log((self.N - n + 0.5) / (n + 0.5) + 1.0)\n\n    def score(self, query, i):\n        d, total = self.docs[i], 0.0\n        for t in tok(query):\n            f = d.count(t)\n            if f == 0:\n                continue\n            num = f * (self.k1 + 1)\n            den = f + self.k1 * (1 - self.b + self.b * self.dl[i] / self.avgdl)\n            total += self.idf(t) * num / den\n        return total',
        out: "==============================================================================\nPART 1 -- the formula, implemented term by term\n==============================================================================\n  score(q,d) = sum over terms t in q of\n      IDF(t) * ( f(t,d) * (k1+1) ) / ( f(t,d) + k1*(1-b + b*|d|/avgdl) )\n\n  corpus: N=41 documents, avgdl=25.5 tokens\n  query : 'Idempotency-Key header'\n\n  the contribution of each query term to api-idempotency:\n    idempotency-key    df=1   idf=3.332  f=1  ->  3.0849\n    header             df=4   idf=2.234  f=1  ->  2.0678\n    TOTAL              5.1527\n==============================================================================\nPART 2 -- checked against rank_bm25 -- and how to compare two rankings\n==============================================================================\n  mine                        rank_bm25\n   1. api-idempotency      5.1527  api-idempotency      5.0141\n   2. api-versioning       2.2929  api-versioning       2.1766\n   3. api-auth             2.0678  api-auth             1.9629\n   4. api-limits           2.0023  api-limits           1.9007\n   5. auth-signin-fail     0.0000  auth-signin-fail     0.0000\n   6. bill-cancel-order    0.0000  bill-cancel-order    0.0000\n\n  only 4 of 41 documents score above zero -- the query has 2 terms and\n  most documents contain neither.\n\n  comparing the two rankings as lists of ids:\n    argsort(mine)[:5] == argsort(ref)[:5] : True\n    my own rank() method, same scores     : ['api-idempotency', 'api-versioning', 'api-auth', 'api-limits', 'ops-backup']\n    argsort on the same scores            : ['api-idempotency', 'api-versioning', 'api-auth', 'api-limits', 'auth-signin-fail']\n    identical                             : False\n\n  those two lists come from the SAME scores and differ only in how the\n  sort broke ties -- rank() sorts (score, index) descending, argsort\n  ascending by index. whichever way the comparison happens to land, it\n  is telling you nothing about the scoring, because ranks 5 to 41 are\n  all tied at 0.0000.\n\n  so: compare rankings only down to the last non-zero score, or compare\n  with a rank correlation. correlation over all 41: 0.9999\n  an equality check over a tied tail is a measurement bug, not a\n  retrieval one, and it will have you debugging a correct implementation\n  -- or trusting a broken one, since it can just as easily pass.\n==============================================================================\nPART 3 -- the two IDF variants, and the surprise\n==============================================================================\n  mine (Lucene-style) : log( (N - df + 0.5) / (df + 0.5) + 1 )   always > 0\n  BM25Okapi           : log( (N - df + 0.5) / (df + 0.5) )       crosses 0 at df = N/2\n\n  term              df     mine     rank_bm25\n  idempotency-key   1      3.3322   3.2958\n  header            4      2.2336   2.1203\n  the               35     0.1681   0.7621\n\n  'the' appears in 35 of 41 documents, so BM25Okapi's raw IDF for it is\n  -1.6977 -- NEGATIVE. rank_bm25 does not use that; it substitutes\n  epsilon * average_idf = 0.25 * 3.0485 = 0.7621.\n\n  so rank_bm25 weights the stopword 'the' at 0.7621 where my variant gives\n  it 0.1681 -- about 4.5x HIGHER. the floor that exists to prevent\n  negative scores ends up over-weighting the most common terms.\n  neither is wrong; they are different variants, and the difference is\n  concentrated exactly where it is least welcome.\n==============================================================================\nPART 4 -- where the Okapi variant breaks down entirely\n==============================================================================\n  term in 1 of 2  ('sat')\n    raw Okapi idf       : 0.0000\n    rank_bm25 idf used  : 0.0000\n    rank_bm25 get_scores: [0.0, 0.0]\n    my idf              : 0.6931\n\n  term in 2 of 2  ('sat')\n    raw Okapi idf       : -1.6094\n    rank_bm25 idf used  : -0.1006\n    rank_bm25 get_scores: [-0.1006, -0.1006]\n    my idf              : 0.1823\n\n  in 1 of 2, the Okapi IDF is EXACTLY zero -- log(1.5/1.5) = log(1) = 0 --\n  so both documents score 0.0 and the query is unanswerable even though\n  one document plainly contains the word.\n\n  in 2 of 2 it is negative, and the epsilon floor is computed from the\n  average IDF, which is itself negative here, so the 'floor' is negative\n  too and both documents score below zero.\n\n  the lesson is not that rank_bm25 is buggy. it is that BM25 is a family\n  of formulas, the IDF variant is the part that differs, and it misbehaves\n  on tiny corpora -- which is exactly where you write your unit tests.\n==============================================================================\nPART 5 -- what k1 and b actually do -- and why not here\n==============================================================================\n  k1    b      MRR (exact terms)   MRR (natural)\n  0.0   0.75   1.000               0.286\n  0.5   0.75   1.000               0.286\n  1.5   0.75   1.000               0.286\n  3.0   0.75   1.000               0.286\n  1.5   0.00   1.000               0.286\n  1.5   1.00   1.000               0.286\n\n  every row is identical. that is not a broken sweep -- it is what the\n  algebra predicts on THIS corpus, for two separate reasons.\n\n  reason 1: every matched term appears exactly once.\n    term-frequency distribution over all matches: {1: 13}\n    with f=1 the factor is (k1+1)/(1 + k1*L) where L = |d|/avgdl.\n    when L is near 1 that is (k1+1)/(1+k1) ... which still varies,\n    but it multiplies EVERY term in EVERY document by the same amount,\n    so the ORDER is untouched. k1 only reorders when documents differ\n    in how often they repeat a term -- and none of them do.\n\n  reason 2: the documents are all about the same length.\n    length: min 17  mean 25.5  max 39 tokens, stdev 4.5\n    b normalises by |d|/avgdl, so with little length variation there is\n    nothing for it to correct.\n\n  constructed counter-example -- k1 reordering when term frequency varies:\n    k1=0.0    doc0 (alpha x1)=0.1823  doc1 (alpha x5)=0.1823  ratio 1.00\n    k1=1.5    doc0 (alpha x1)=0.1823  doc1 (alpha x5)=0.3506  ratio 1.92\n    k1=100.0  doc0 (alpha x1)=0.1823  doc1 (alpha x5)=0.8769  ratio 4.81\n    at k1=0 repetition is worth nothing; as k1 grows the repeated term\n    saturates toward 5x. that is the dial, and this corpus never\n    turns it.\n==============================================================================\nPART 6 -- what BM25 fixes and what it cannot\n==============================================================================\n  exact terms   : R@5 1.000  MRR 1.000   (dense was 0.875 / 0.781)\n  natural       : R@5 0.357  MRR 0.286   (dense was 1.000 / 0.964)\n\n  perfect on the class dense missed, and far worse on the class dense\n  handled. the worst single case:\n    'I forgot my password' scores > 0 on 0 of 41 documents\n    the relevant document says 'Credential recovery ... signed recovery link'\n    and contains neither 'forgot' nor 'password'. no value of k1 or b\n    helps, because the term is not in the document at all -- which is\n    the one failure no amount of lexical tuning can reach.",
        notes: [
          { t: "p", text: "**The rare term contributes more than the common one** \u2014 `idempotency-key` at df=1 gives 3.0849 and `header` at df=4 gives 2.0678. That is the whole mechanism." },
          { t: "p", text: "**Only 4 of 41 documents score above zero**, so an equality check on the top 5 is comparing tie-break artefacts. Two orderings from the SAME scores differ by how the sort broke ties \u2014 compare down to the last non-zero score, or use rank correlation (0.9999)." },
          { t: "p", text: "**The two IDF variants agree on rare terms and diverge 4.5x on the commonest one.** `BM25Okapi`'s raw IDF for `the` (df=35) is -1.6977, so rank_bm25 substitutes epsilon x average_idf = 0.7621 against my 0.1681 \u2014 the guard against negative scores over-weights stopwords." },
          { t: "p", text: "**On two documents the Okapi variant breaks down.** Term in 1 of 2: IDF is exactly log(1) = 0, so both documents score 0.0 and the query is unanswerable. Term in 2 of 2: IDF is negative and the epsilon floor is computed from an average that is also negative, so both score -0.1006." },
          { t: "p", text: "**Which is exactly where unit tests live**, so a BM25 test on a toy corpus can assert the wrong thing and pass." },
          { t: "p", text: "**The k1/b sweep produced six identical rows, as the algebra predicts.** Every matched term appears exactly once ({1: 13}), so with f=1 the factor scales every term equally and leaves the order untouched; and lengths are uniform (stdev 4.5 on a mean of 25.5), so b has nothing to normalise." },
          { t: "p", text: "**A flat sweep is a result, not a failure** \u2014 confirm the data varies along the axis a parameter controls before tuning it. On a constructed corpus with a term repeated five times, k1 reorders: ratio 1.00 at k1=0, 1.92 at k1=1.5, 4.81 at k1=100." },
          { t: "p", text: "**BM25 is the mirror image of dense**: perfect on exact terms (1.000/1.000) and far worse on natural queries (0.357/0.286). And `I forgot my password` scores above zero on 0 of 41 documents \u2014 the one failure no lexical tuning can reach." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the BM25 unit test that passed on a lie", body: [
      { t: "p", text: "A team writes a BM25 test with two documents: one containing the search term, one not. They assert the first ranks above the second. The test fails, both documents scoring exactly 0.0, and they conclude the library is broken and write their own." },
      { t: "p", text: "The library is correct. With the term in 1 of 2 documents, the Okapi IDF is `log(1.5/1.5)`, which is exactly zero \u2014 a term appearing in half the corpus carries no information by that formula, which is the right answer to a question nobody meant to ask." },
      { t: "p", text: "The structural issue is that IDF is a function of corpus statistics, so any test whose corpus is unrealistically small is testing a different regime from production. The fix is to separate the two concerns: assert the scoring arithmetic against hand-computed values on a fixed corpus of realistic size, and assert ranking behaviour separately where the IDF term is not degenerate." }
    ] }
  ],
  takeaways: [
    "**BM25 sums, over query terms, IDF times a saturating term-frequency factor.**",
    "**The rare term dominates**: `idempotency-key` (df=1) contributed 3.08 against `header` (df=4) at 2.07.",
    "**Only 4 of 41 documents scored above zero**, so the rest are tied at 0.0000.",
    "**Comparing two rankings over a tied tail tells you nothing** \u2014 the result depends on the sort's tie-break.",
    "**Use rank correlation instead** \u2014 0.9999 against `rank_bm25` here.",
    "**BM25 is a family of formulas and the IDF term is what differs.**",
    "**`BM25Okapi`'s IDF crosses zero at df = N/2 and goes negative**; the Lucene-style variant is always positive.",
    "**rank_bm25 substitutes `epsilon x average_idf`**, weighting the stopword \u2018the\u2019 4.5x higher than my variant.",
    "**On two documents with the term in one, the Okapi IDF is exactly zero** \u2014 both score 0.0 and the query is unanswerable.",
    "**Which is exactly the corpus size unit tests use**, so a BM25 test can assert the wrong thing and pass.",
    "**The k1/b sweep gave six identical rows**, because every matched term appears once and lengths are uniform.",
    "**A flat sweep is a result** \u2014 check the data varies along the parameter's axis before tuning.",
    "**BM25 is dense's mirror image**: 1.000 MRR on exact terms, 0.286 on natural queries.",
    "**`I forgot my password` scores above zero on 0 of 41 documents** \u2014 the failure no lexical tuning can reach."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "A k1 and b sweep produces six identical rows. What is the right next step?",
      options: ["Widen the grid and try more extreme values",
        "Work out what each parameter multiplies and check whether the corpus varies along that axis",
        "Conclude that BM25 tuning does not matter",
        "Switch to a different BM25 implementation"],
      answer: 1,
      why: "Here both parameters were provably inert: every matched term appeared exactly once, so with f=1 the k1 factor scales every term equally and cannot reorder, and document lengths had a standard deviation of 4.5 on a mean of 25.5, leaving b nothing to normalise. No grid would have found otherwise, and concluding that tuning never matters would be the wrong lesson to carry to a corpus with long documents and repeated terms." },
    { stem: "Why can comparing two BM25 rankings with a list equality check mislead you?",
      options: ["Floating-point scores never compare exactly",
        "Most documents score exactly 0.0 for a short query, so the tail is tied and its order is a sort artefact",
        "The two implementations return different numbers of results",
        "Document ids are not stable between runs"],
      answer: 1,
      why: "Only 4 of 41 documents scored above zero for a two-term query. Ranks 5 onward are all tied at 0.0000, so two orderings derived from identical scores can differ purely by tie-break \u2014 one sorting (score, index) descending, the other using argsort. The check passes or fails for reasons unrelated to correctness, which can hide a real bug as easily as invent one." },
    { stem: "rank_bm25 gives the stopword \u201cthe\u201d an IDF of 0.7621 where a Lucene-style variant gives 0.1681. Why?",
      options: ["rank_bm25 does not remove stopwords",
        "Okapi IDF goes negative for df above N/2, so rank_bm25 substitutes epsilon x average_idf \u2014 and that floor exceeds the true weight",
        "The two use different logarithm bases",
        "rank_bm25 counts document frequency differently"],
      answer: 1,
      why: "With df=35 of N=41 the raw Okapi IDF is \u22121.6977. Rather than let a term contribute negatively, rank_bm25 replaces it with 0.25 times the average IDF, which here is 0.7621 \u2014 higher than the Lucene-style variant's always-positive 0.1681. The guard against negative scores ends up over-weighting the commonest terms, which is precisely where the difference is least welcome." },
    { stem: "On a two-document corpus with the search term in one document, rank_bm25 scores both 0.0. What is happening?",
      options: ["The tokeniser dropped the term",
        "Okapi IDF is log((2-1+0.5)/(1+0.5)) = log(1) = exactly zero, so the term carries no weight",
        "The library requires at least three documents",
        "Term frequency saturation zeroed the contribution"],
      answer: 1,
      why: "A term in exactly half the corpus is uninformative by that formula, and with N=2 and df=1 the ratio is exactly 1, whose logarithm is 0. The library is correct; the test corpus is in a degenerate regime. Since IDF depends on corpus statistics, any assertion made on a two-document corpus is testing different behaviour from production." }
  ] },
  interview: { title: "Interview practice", sub: "BM25", questions: [
    { level: "core", q: "Explain BM25 and what its parameters do.",
      strong: "A strong answer explains the saturation and length normalisation concretely.",
      answer: [
        { t: "p", text: "For each query term you take an IDF weight \u2014 how rare the term is in the corpus \u2014 times a term-frequency factor that saturates, and sum over the query's terms." },
        { t: "p", text: "k1 controls that saturation. At k1 equals zero, a term appearing five times counts the same as once, so only presence matters. As k1 grows, repetition counts for more but with diminishing returns \u2014 on a constructed example I measured the ratio between a document with the term once and one with it five times going from 1.0 at k1=0, to 1.9 at 1.5, to 4.8 at k1=100." },
        { t: "p", text: "b controls length normalisation, dividing by document length over average length. At b=0 a long document is not penalised for being long; at b=1 it fully is." },
        { t: "p", text: "Worth knowing that both can be inert. On a corpus I measured, a six-point sweep gave six identical results \u2014 every matched term appeared exactly once, so k1 scaled everything equally and could not reorder, and the documents were all about the same length, so b had nothing to normalise. That is a result rather than a broken experiment, and the right response is to check whether the data varies along the axis before tuning it." }
      ] },
    { level: "advanced", q: "Have you hit a surprise with a BM25 implementation?",
      strong: "A strong answer knows IDF is where variants differ.",
      answer: [
        { t: "p", text: "Yes \u2014 BM25 is a family of formulas rather than one, and the IDF term is the part that differs between them. That caught me in two places." },
        { t: "p", text: "The first was on a tiny corpus. With two documents and the search term in exactly one of them, the Okapi IDF is log of 1.5 over 1.5, which is exactly zero, so both documents score 0.0 and the query is unanswerable even though one plainly contains the word. That is correct by the formula \u2014 a term in half the corpus is uninformative \u2014 and it is a terrible surprise in a unit test, which is exactly the corpus size unit tests use. I now test the scoring arithmetic against hand-computed values on a realistic corpus and test ranking behaviour separately." },
        { t: "p", text: "The second was the fix for negative IDF. Okapi IDF goes negative once a term is in more than half the corpus, and rank_bm25 substitutes epsilon times the average IDF rather than allowing that. On a 41-document corpus that gave the stopword 'the' an IDF of 0.76 where the Lucene-style variant gives 0.17 \u2014 about four and a half times higher. So the guard against negative scores ends up over-weighting the most common terms, which is the worst possible place for the two variants to disagree." },
        { t: "p", text: "The practical consequence is that I do not treat a BM25 score as portable between implementations, and I compare rankings with a rank correlation rather than list equality \u2014 especially since most documents score exactly zero for a short query, so the tail is tied and its order is a sort artefact." }
      ] },
    { level: "core", q: "When would you reach for BM25 rather than a dense retriever?",
      strong: "A strong answer is about the signal, with numbers.",
      answer: [
        { t: "p", text: "When the decisive signal is that a document literally contains a rare string \u2014 product names, error codes, header names, identifiers, anything a user types because they already know it." },
        { t: "p", text: "On the corpus I measured, BM25 scored a perfect 1.000 recall and 1.000 MRR on rare exact terms where dense managed 0.875 and 0.781. One query, an HTTP header name, dense did not retrieve at all in its top five and BM25 put it first. That is the whole case for keeping a lexical retriever." },
        { t: "p", text: "The mirror image is the reason not to use it alone. On natural-language queries BM25 got 0.357 recall and 0.286 MRR against dense's 1.000 and 0.964. And one query \u2014 'I forgot my password' \u2014 scored above zero on zero of 41 documents, because not one of its terms appears anywhere in the corpus." },
        { t: "p", text: "That last case is the one worth internalising, because it is not a tuning problem. No value of k1 or b reaches a term that is absent. It is also why BM25's output needs a sanity check before you use it: with every document at zero it still returned a confident-looking top three, which was just the sort's tie order." }
      ] }
  ] }
});
