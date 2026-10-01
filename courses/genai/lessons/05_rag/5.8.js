EC.receiveLesson({
  id: "5.8",

  lede: "Every failure so far has been fixed at index time \u2014 better chunks, a better model, a better index. Query transformation fixes the other end: rewrite the question before searching. On the shared corpus **HyDE took recall@1 from 75% to 90%**, the largest query-time gain in the module, and finally moved the question that had been stuck since 5.1 from **rank 15 to rank 1**. The same sweep also contains a technique that made things substantially worse \u2014 step-back prompting dropped recall@1 to **40%** \u2014 which is the more useful half of the result.",

  objectives: [
    "Explain why a question and its answer often share little vocabulary",
    "Describe HyDE and say what it is actually exploiting",
    "Recognise that a transformation can degrade retrieval, and measure before adopting",
    "Fuse several query formulations rather than choosing one",
    "Price the extra model call that every transformation puts on the critical path"
  ],

  prerequisites: ["5.7"],

  blocks: [

    { t: "h2", n: "01", id: "gap", text: "The asymmetry",
      sub: "A question does not look like its answer" },

    { t: "p", text: "Retrieval compares a question to a passage, but questions and answers are different kinds of text. A question is short, interrogative and often uses the vocabulary of someone who does *not* know the answer. The passage is declarative, longer, and uses the vocabulary of someone who does." },

    { t: "p", text: "The module has carried one example of this since 5.1. *\u201cWhy divide alpha by r?\u201d* sat at rank 15, and no chunking configuration in 5.4 moved it, because the passage that answers it calls the term a **\u201cvolume knob\u201d** and never uses the word \u201cdivide\u201d. The text is correctly cut, correctly embedded and correctly indexed. The query simply does not look like it." },

    { t: "callout", kind: "note", title: "How these transformations were generated",
      body: [
        { t: "p", text: "Every technique below normally uses an LLM to rewrite the query. No instruct model is available in this environment, so the hypothetical answers and step-back questions were **written by hand to the same specification an LLM would be given**." },
        { t: "p", text: "That makes these numbers an *upper bound*: generation quality is held at a human ceiling rather than at whatever a 7B model would produce. The comparison between techniques is still fair, because all of them got the same treatment \u2014 but a production HyDE with a small generator would do worse than 90%." },
        { t: "p", text: "It also creates a specific risk, which section 03 tests directly rather than waving away." }
      ] },

    { t: "h2", n: "02", id: "techniques", text: "Four formulations, measured",
      sub: "One large win, one large loss" },

    { t: "code", lang: "python", title: "g58.py \u2014 the same questions, four ways to phrase the search", code: `BASE   = ranks_from([q for q, _, _ in QS])                      # the question
HYDE_R = ranks_from([HYDE[q] for q in qs_text])                 # a hypothetical answer
SB_R   = ranks_from([STEPBACK[q] for q in qs_text])             # a more general question
CAT_R  = ranks_from(["%s %s" % (q, HYDE[q]) for q in qs_text])  # both concatenated`,
      out: `  query used for retrieval            r@1      r@3      r@5     r@10
  the question itself                 75%      90%      95%      95%
  HyDE (hypothetical answer)          90%      95%      95%     100%
  step-back (general form)            40%      65%      75%      80%
  question + HyDE together            85%     100%     100%     100%`,
      hl: [3, 4],
      caption: "HyDE gains 15 points at k=1. Step-back loses 35. Concatenating question and hypothetical answer reaches 100% from k=3." },

    { t: "callout", kind: "insight", title: "HyDE works by making the query look like the answer",
      body: [
        { t: "p", text: "The idea is counterintuitive and the mechanism is simple. Ask the model to *answer* the question without any retrieval, then embed that hypothetical answer and use it as the search query. The generated answer will contain factual errors \u2014 it is unretrieved \u2014 and that does not matter, because you are not using it as an answer. You are using it as a **query that is shaped like a document**." },
        { t: "p", text: "Declarative prose about the right topic sits much closer in embedding space to declarative prose about the right topic than a short interrogative does. The hypothetical answer is a better *probe* than the question even when its content is wrong." },
        { t: "p", text: "Measured: 90% recall@1 against 75%, and 100% at k=10 against 95%. That is the largest query-time improvement in this module, and it comes from a technique that deliberately generates something false." }
      ] },

    { t: "callout", kind: "trap", title: "Step-back prompting lost 35 points",
      body: [
        { t: "p", text: "Step-back asks a more general version of the question \u2014 *\u201cHow do sampling parameters control LLM output?\u201d* instead of *\u201cWhat does top_p do?\u201d* \u2014 on the theory that broader context retrieves better. On this corpus it was a disaster: **40% recall@1** against the baseline\u2019s 75%, and 75% at k=5 against 95%." },
        { t: "p", text: "The reason is that generalising throws away exactly the signal retrieval runs on. `top_p` is a rare, highly discriminative token; \u201csampling parameters\u201d matches every page about sampling. The transformation moves the query *away* from the specific passage that answers it." },
        { t: "p", text: "Step-back is a real technique with published results, and those results are mostly on reasoning benchmarks where the step-back question guides a *reasoning* step rather than a retrieval. Borrowing it as a retrieval transformation is where it fails \u2014 which is a good illustration of why a technique's provenance matters as much as its description." },
        { t: "p", text: "The practical lesson is the one this module keeps arriving at: **a plausible transformation can make retrieval substantially worse**, and the only way to know which you have is to measure against the baseline." }
      ] },

    { t: "h2", n: "03", id: "leak", text: "Testing my own hypothetical answers for leakage",
      sub: "Because I wrote them, and I have read the corpus" },

    { t: "p", text: "The HyDE result has an obvious objection. I wrote the hypothetical answers by hand, and I have read these documents closely \u2014 so if I unconsciously used the corpus\u2019s own phrasing, I would be measuring my knowledge of the answer rather than the technique." },

    { t: "p", text: "The clearest case is the stuck question. My hypothetical answer for *\u201cWhy divide alpha by r?\u201d* contained the words **\u201cvolume knob\u201d** \u2014 the corpus\u2019s own idiosyncratic metaphor, which no model generating blind would be likely to produce. So I tested it." },

    { t: "code", lang: "python", title: "the leakage test \u2014 strip the corpus phrase and re-measure", code: `VARIANTS = [
 ("the question as asked", "Why divide alpha by r?"),
 ("HyDE WITH the corpus phrase",
  "Dividing alpha by the rank acts as a volume knob: it keeps the strength of "
  "the adapter independent of its rank, so capacity and strength can be tuned "
  "separately."),
 ("HyDE WITHOUT that phrase",
  "The alpha over rank term scales the magnitude of the low-rank update so that "
  "changing the rank does not alter how strongly the adapter influences the "
  "output. It lets rank and strength be chosen independently."),
 ("HyDE, plainer still",
  "Alpha is divided by r so the adapter strength stays the same when you change "
  "the rank."),
]`,
      out: `  query used                             rank
  the question as asked                    15
  HyDE WITH the corpus phrase               2
  HyDE WITHOUT that phrase                  1
  HyDE, plainer still                       3`,
      hl: [3],
      caption: "Removing the borrowed phrase made it better, not worse \u2014 rank 1 against rank 2." },

    { t: "callout", kind: "good", title: "The result survives the test, and is stronger without the leak",
      body: [
        { t: "p", text: "If the gain had depended on my borrowed phrase, removing it would have collapsed the rank back towards 15. Instead the clean hypothetical answer reached **rank 1** \u2014 better than the contaminated one at rank 2 \u2014 and even a deliberately plain one-sentence version reached rank 3." },
        { t: "p", text: "So the mechanism is not phrase-matching. A hypothetical answer helps because it is *declarative prose on the right topic at roughly the right length*, which is what the indexed chunks are. Any competent generated answer has that shape." },
        { t: "p", text: "This is the test I would want anyone to run before trusting a hand-authored evaluation. It took two minutes, and the alternative was publishing a 15-to-1 improvement that might have been nothing but my own familiarity with the text." }
      ] },

    { t: "code", lang: "python", title: "g58.py \u2014 the stuck question under every formulation", code: `for label, R in (("as asked", BASE), ("HyDE", HYDE_R), ("step-back", SB_R),
                 ("question + HyDE", CAT_R), ("RRF of all three", rrf([...]))):`,
      out: `  Why divide alpha by r?
  (5.1 found this at rank 15 -- the passage calls it a 'volume knob')

    as asked                 rank 15
    HyDE                     rank 2
    step-back                rank 7
    question + HyDE          rank 2
    RRF of all three         rank 2`,
      caption: "Even step-back helps this one \u2014 it is the questions that were already working that step-back damages." },

    { t: "h2", n: "04", id: "multiquery", text: "Multi-query: fuse rather than choose",
      sub: "Which also contains the warning" },

    { t: "p", text: "If several formulations each retrieve something useful, fuse their rankings with RRF (5.9) instead of picking one. That way a transformation that helps some questions cannot destroy the ones it hurts \u2014 in principle." },

    { t: "code", lang: "python", title: "g58.py \u2014 RRF over query variants", code: `for label, lists in (("question only",                [BASE]),
                     ("question + HyDE",              [BASE, HYDE_R]),
                     ("question + step-back",         [BASE, SB_R]),
                     ("question + HyDE + step-back",  [BASE, HYDE_R, SB_R])):
    s = score(rrf(lists))`,
      out: `  variants fused with RRF                       r@1      r@3      r@5
  question only                                 75%      90%      95%
  question + HyDE                               85%      95%      95%
  question + step-back                          65%      85%      90%
  question + HyDE + step-back                   80%     100%     100%`,
      hl: [3],
      caption: "Fusing the bad variant with the good one still costs: question + step-back is worse than the question alone." },

    { t: "callout", kind: "trap", title: "Fusion dilutes a bad variant \u2014 it does not neutralise it",
      body: [
        { t: "p", text: "Adding step-back to the baseline took recall@1 from 75% down to **65%**. The fusion is a vote, and a confidently wrong voter still shifts the outcome \u2014 RRF has no notion of which retriever to trust." },
        { t: "p", text: "The three-way fusion recovers to 80% at k=1 and reaches 100% at k=3 and k=5, because HyDE\u2019s strength outweighs step-back\u2019s weakness. But *question + HyDE concatenated* reached 100% at k=3 too, with **one search instead of three**." },
        { t: "p", text: "So on this corpus the simplest good option beats the elaborate one. Concatenation costs one generation and one search; three-way RRF costs one generation and three searches, and ends up in the same place." }
      ] },

    { t: "viz", title: "Four query formulations", caption: "The largest query-time gain in the module, and the largest query-time loss, from the same family of techniques.",
      svg: `<svg viewBox="0 0 760 290" width="100%" role="img" aria-label="Recall at 1 for four query formulations">
  <text x="16" y="22" class="s-label">RECALL@1 BY QUERY FORMULATION</text>

  <text x="16" y="54" class="s-sub">step-back</text>
  <rect x="150" y="42" width="200" height="18" rx="3" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.6"/>
  <text x="360" y="56" class="s-mono" style="fill:var(--crit)">40%  \u2014 35 points WORSE</text>

  <text x="16" y="88" class="s-sub">the question</text>
  <rect x="150" y="76" width="375" height="18" rx="3" class="s-fill" style="stroke:var(--line)" stroke-width="1.4"/>
  <text x="535" y="90" class="s-mono">75%  baseline</text>

  <text x="16" y="122" class="s-sub">q + HyDE</text>
  <rect x="150" y="110" width="425" height="18" rx="3" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="585" y="124" class="s-mono" style="fill:var(--good)">85%</text>

  <text x="16" y="156" class="s-sub">HyDE alone</text>
  <rect x="150" y="144" width="450" height="18" rx="3" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="610" y="158" class="s-mono" style="fill:var(--good)">90%  \u2014 15 points better</text>

  <line x1="16" y1="182" x2="744" y2="182" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="206" class="s-label" style="fill:var(--violet)">THE QUESTION STUCK SINCE 5.1</text>
  <text x="16" y="230" class="s-sub">\u201cWhy divide alpha by r?\u201d \u2014 the passage calls it a \u201cvolume knob\u201d</text>
  <rect x="150" y="240" width="500" height="16" rx="3" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.4"/>
  <text x="166" y="253" class="s-mono" style="fill:var(--crit)">as asked: rank 15 \u2014 unmoved by every chunking change in 5.4</text>
  <rect x="150" y="262" width="34" height="16" rx="3" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="196" y="275" class="s-mono" style="fill:var(--good)">HyDE: rank 1 \u2014 and rank 1 again with the corpus phrase removed</text>
</svg>` },

    { t: "h2", n: "05", id: "cost", text: "What it costs",
      sub: "A generation on the critical path of every query" },

    { t: "code", lang: "python", title: "g58.py \u2014 calls per query", code: `#  the search is 11 ms (5.1). The generation is not.`,
      out: `  approach                                LLM calls         searches
  plain retrieval                                 0                1
  HyDE                                            1                1
  step-back                                       1                1
  multi-query (3 variants)                        1                3`,
      caption: "Retrieval was 11 ms. A generation is hundreds of milliseconds, so the transformation dominates the retrieval budget entirely." },

    { t: "callout", kind: "tradeoff", title: "The latency is the real objection, not the token cost",
      body: [
        { t: "p", text: "HyDE needs a complete generated answer *before the search can start*. That is a full generation \u2014 prefill plus decode (3.1) \u2014 added in series to every query, and it is the single largest latency addition of any technique in this module." },
        { t: "p", text: "Two mitigations are worth knowing. The hypothetical answer can be generated by a **much smaller model** than the one answering, since it only needs the right shape and topic rather than correctness \u2014 which is precisely what the leakage test above demonstrated, where even a plain one-sentence version reached rank 3. And it can be **cached**, because many queries repeat." },
        { t: "p", text: "The honest framing for an interview: HyDE buys recall with latency. On a corpus where recall is the binding constraint it is the best query-time option measured here; on a latency-sensitive product it may be unaffordable, and the index-time work in 5.4 is free at query time." }
      ] },

    { t: "exercise", kind: "lab", title: "Test query transformations against your baseline", difficulty: "advanced", minutes: 35,
      body: "Take your labelled question set and measure retrieval using the question itself, a hypothetical answer, a more general step-back question, and the question concatenated with the hypothetical answer. Fuse combinations with RRF. Then, if you wrote any of the transformed queries by hand, test them for leakage by rewriting one to remove any phrasing borrowed from the corpus.",
      requirements: [
        "Hold the index, chunking and k identical across all formulations",
        "Report recall at several k for each formulation, against the unmodified question as baseline",
        "Track at least one individually hard question across all formulations, not just aggregates",
        "Fuse variants with RRF and compare against the best single variant",
        "Test hand-written hypothetical answers for borrowed corpus vocabulary"
      ],
      hint: "If you wrote the hypothetical answers yourself, rewrite one in deliberately different words and re-measure. If the gain disappears, you measured your own familiarity with the corpus.",
      solution: { lang: "python", title: "g58.py \u2014 four formulations and the leakage test", code: `def ranks_from(texts):
    V = enc.encode(texts, normalize_embeddings=True)
    return np.argsort(-(V @ E.T), axis=1)

BASE   = ranks_from(qs_text)
HYDE_R = ranks_from([HYDE[q] for q in qs_text])
SB_R   = ranks_from([STEPBACK[q] for q in qs_text])
CAT_R  = ranks_from(["%s %s" % (q, HYDE[q]) for q in qs_text])

for label, R in (("question", BASE), ("HyDE", HYDE_R),
                 ("step-back", SB_R), ("question + HyDE", CAT_R)):
    print(label, score(R))

for label, lists in (("q + HyDE", [BASE, HYDE_R]),
                     ("q + step-back", [BASE, SB_R]),
                     ("all three", [BASE, HYDE_R, SB_R])):
    print(label, score(rrf(lists)))

# did I leak the corpus's own phrasing into the hypothetical answer?
for label, text in VARIANTS:
    order = np.argsort(-(enc.encode([text], normalize_embeddings=True) @ E.T)[0])
    rank = next((r + 1 for r, idx in enumerate(order[:300])
                 if meta[idx] in H._docs(doc) and H.hits(chunks[idx], must)), None)
    print(label, rank)`,
        out: `  query used for retrieval            r@1      r@3      r@5     r@10
  the question itself                 75%      90%      95%      95%
  HyDE (hypothetical answer)          90%      95%      95%     100%
  step-back (general form)            40%      65%      75%      80%
  question + HyDE together            85%     100%     100%     100%

  variants fused with RRF                       r@1      r@3      r@5
  question only                                 75%      90%      95%
  question + HyDE                               85%      95%      95%
  question + step-back                          65%      85%      90%
  question + HyDE + step-back                   80%     100%     100%

  "Why divide alpha by r?"  (stuck at rank 15 since 5.1)
    as asked                 rank 15
    HyDE                     rank 2
    step-back                rank 7
    question + HyDE          rank 2

  LEAKAGE TEST
  the question as asked                    15
  HyDE WITH the corpus phrase               2
  HyDE WITHOUT that phrase                  1
  HyDE, plainer still                       3`,
        notes: [
          { t: "p", text: "**HyDE is the largest query-time gain in the module: 75% \u2192 90% at k=1.** It works by making the query look like a document \u2014 declarative prose on the right topic at roughly the right length, which is the shape of the indexed chunks. The generated answer's factual correctness is irrelevant, because it is a probe rather than an answer." },
          { t: "p", text: "**Step-back lost 35 points**, taking recall@1 to 40%. Generalising a question discards the rare discriminative tokens retrieval runs on \u2014 `top_p` becomes \u2018sampling parameters\u2019, which matches everything. It is a real technique whose published results are mostly about guiding reasoning rather than retrieval, and borrowing it across contexts is where it fails." },
          { t: "p", text: "**The leakage test is the part I would not skip.** My hand-written hypothetical answer for the stuck question contained the corpus's own phrase \u2018volume knob\u2019. Rewriting it without that phrase gave rank 1 \u2014 better than the contaminated version's rank 2 \u2014 and a deliberately plain version still gave rank 3. The mechanism is shape, not phrase-matching, and now that is demonstrated rather than assumed." },
          { t: "p", text: "**Fusion dilutes a bad variant rather than neutralising it**: question + step-back scored 65% at k=1, worse than the question alone at 75%. RRF is a vote with no notion of which voter to trust. And the three-way fusion reached the same 100% at k=3 that simple concatenation reached, with three searches instead of one." },
          { t: "p", text: "**The cost is a full generation before the search starts** \u2014 hundreds of milliseconds added in series to an 11 ms retrieval. Mitigations: generate the hypothetical with a much smaller model, since only its shape matters, and cache it, since queries repeat." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Retrieval compares a question to an answer, and those are different genres of text. HyDE closes the gap by converting the question into the genre of the thing being searched \u2014 a fake answer is a better probe than a real question." },
        { t: "p", text: "And making a query more general moves it away from the specific passage that answers it. Specificity is the signal; broadening the query spends it." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cWe read that HyDE and step-back prompting improve RAG. Should we implement both?\u201d**" },
        { t: "p", text: "Implement a measurement first, because on my own corpus one of those gained fifteen points and the other lost thirty-five." },
        { t: "p", text: "HyDE took recall@1 from 75% to 90% \u2014 the largest query-time gain I measured. The mechanism is that it converts the query into the genre of the indexed text: a short interrogative becomes declarative prose about the right topic at roughly the right length, which is what the chunks are. The generated answer being factually wrong does not matter, because it is a probe." },
        { t: "p", text: "Step-back took recall@1 to 40%. Generalising a question throws away the rare tokens that make retrieval work \u2014 `top_p` becomes \u2018sampling parameters\u2019, which matches every page about sampling. Its published results are mostly about guiding a reasoning step rather than a retrieval, and the technique does not transfer across that boundary." },
        { t: "p", text: "So the answer is HyDE yes, step-back no, on this corpus \u2014 and the reason I would insist on their own measurement is that both of those are plausible-sounding techniques from reputable work, and the sign of the effect was not predictable from the description." },
        { t: "p", text: "The cost to weigh against the gain is latency, not tokens. HyDE needs a complete generation before the search can start, which is hundreds of milliseconds in series with an 11 ms retrieval. Two mitigations: the hypothetical can come from a much smaller model, since only its shape matters \u2014 I measured a deliberately plain one-sentence version still working \u2014 and it caches well because queries repeat." },
        { t: "p", text: "And I would try concatenating the question with the hypothetical answer rather than replacing it. That reached 100% at k=3 in my sweep, matched the three-way RRF fusion, and costs one search instead of three." }
      ] }
  ],

  takeaways: [
    "**A question and its answer are different genres of text** \u2014 short and interrogative against long and declarative \u2014 and that gap is what query transformation attacks.",
    "**HyDE generates a hypothetical answer and searches with that**, taking recall@1 from 75% to **90%**: the largest query-time gain in this module.",
    "**Its factual correctness is irrelevant.** The generated answer is a probe shaped like a document, not an answer \u2014 which is why a small model can produce it.",
    "**It finally moved the question stuck since 5.1**: \u201cWhy divide alpha by r?\u201d from rank 15 to rank 1, where no chunking change in 5.4 had helped.",
    "**I tested my own hand-written hypotheticals for leakage.** Removing the corpus's own phrase \u201cvolume knob\u201d made the result *better* \u2014 rank 1 against rank 2 \u2014 so the mechanism is shape, not phrase-matching.",
    "**Step-back prompting lost 35 points**, dropping recall@1 to 40%, because generalising discards the rare discriminative tokens retrieval runs on.",
    "**Its published results are about guiding reasoning, not retrieval** \u2014 a reminder that a technique's provenance matters as much as its description.",
    "**Fusion dilutes a bad variant rather than neutralising it**: question + step-back scored 65% at k=1, below the question alone at 75%.",
    "**Concatenating question and hypothetical matched three-way RRF** \u2014 100% at k=3 \u2014 with one search instead of three.",
    "**The cost is a full generation in series before the search starts**, hundreds of milliseconds against an 11 ms retrieval; mitigate with a smaller generator and a cache."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "HyDE embeds a generated hypothetical answer instead of the question. Why does it work even though the generated answer contains errors?",
        options: [
          "Because the errors are corrected by the retrieved documents",
          "Because the hypothetical is used as a probe shaped like a document, not as an answer \u2014 declarative prose on the right topic matches declarative prose",
          "Because generating the answer gives the model time to reason about the question",
          "Because the embedding model ignores factual content and encodes only style"
        ],
        answer: 1,
        why: "Retrieval compares a short interrogative query against long declarative chunks, which are different genres of text. A hypothetical answer converts the query into the genre being searched, so it lands closer in embedding space regardless of whether its facts are right \u2014 it is never shown to anyone. Measured: recall@1 rose from 75% to 90%. That also means a much smaller model can generate it, since only the shape matters." },

      { stem: "Step-back prompting dropped recall@1 from 75% to 40%. What is the mechanism?",
        options: [
          "The general question exceeds the embedding model's sequence limit",
          "Generalising discards the rare discriminative tokens retrieval depends on \u2014 `top_p` becomes \u201csampling parameters\u201d, which matches everything",
          "Step-back requires a larger k to be effective",
          "The step-back questions were poorly written"
        ],
        answer: 1,
        why: "Retrieval ranks by distinctiveness, and a specific identifier is the strongest signal a query can carry. Broadening the question deliberately removes that, moving the query away from the one passage that answers it and towards every passage on the general topic. Step-back is a real technique whose published results concern guiding a reasoning step rather than a retrieval \u2014 borrowing it across that boundary is where it fails, which is why provenance matters as much as description." },

      { stem: "Why test a hand-written hypothetical answer by rewriting it without the corpus's own phrasing?",
        options: [
          "To check that the embedding model is not overfitting to the corpus",
          "Because an author who has read the corpus may unconsciously borrow its vocabulary, making the result measure familiarity rather than the technique",
          "To confirm the chunking preserved the original phrasing",
          "Because shorter hypothetical answers generally retrieve better"
        ],
        answer: 1,
        why: "The hypothetical answer for the stuck question contained the corpus's idiosyncratic metaphor \u201cvolume knob\u201d, which a model generating blind would be unlikely to produce \u2014 so the 15-to-2 improvement might have been phrase-matching rather than the technique working. Rewriting without it gave rank 1, better than the contaminated version, which establishes that the mechanism is genre and shape rather than borrowed vocabulary. The test took two minutes and the alternative was publishing an unsupported claim." },

      { stem: "Fusing the baseline question with step-back variants gave 65% recall@1, below the question alone at 75%. What does this show about RRF?",
        options: [
          "RRF requires at least three retrievers to be effective",
          "Fusion is a vote with no notion of which variant to trust, so a bad variant dilutes rather than being neutralised",
          "The RRF constant k was set too low",
          "Rank fusion cannot combine results from the same retriever"
        ],
        answer: 1,
        why: "RRF sums 1/(k + rank) across sources and weights them equally by construction \u2014 a confidently wrong source still shifts the outcome. That is the price of the property that makes RRF robust elsewhere, namely needing no calibration. The three-way fusion recovered because HyDE's strength outweighed step-back's weakness, but simple concatenation of question and hypothetical reached the same 100% at k=3 with one search instead of three." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Two reputable techniques, opposite signs, on the same corpus",
    questions: [
      { level: "core",
        q: "What is HyDE and why would it help?",
        strong: "A strong answer explains the genre mismatch and that correctness is irrelevant.",
        answer: [
          { t: "p", text: "Generate a hypothetical answer to the question without retrieving anything, embed that, and use it as the search query instead of the question." },
          { t: "p", text: "It works because a question and an answer are different genres of text. The query is short and interrogative, in the vocabulary of someone who does not know; the chunks are long and declarative, in the vocabulary of someone who does. A hypothetical answer converts the query into the genre being searched." },
          { t: "p", text: "The counterintuitive part is that the hypothetical does not need to be correct \u2014 it is never shown to anyone, it is a probe. Which also means a much smaller, faster model can generate it, since only its shape and topic matter." },
          { t: "p", text: "Measured on a real corpus it took recall@1 from 75% to 90%, the largest query-time gain I found, and it moved a question that had been stuck at rank 15 through every index-time change to rank 1." }
        ] },

      { level: "advanced",
        q: "How would you evaluate a query transformation before adopting it?",
        strong: "A strong answer measures against baseline and checks for leakage in hand-authored data.",
        answer: [
          { t: "p", text: "Against the untransformed question as the baseline, on the same index with the same chunking and k \u2014 because the sign of the effect is not predictable from the description. On my corpus, HyDE gained fifteen points at k=1 and step-back lost thirty-five, and both are reputable published techniques." },
          { t: "p", text: "I would look at the per-question ranks and not just the aggregate, because that is where the mechanism shows. Step-back actually helped the one hard question in my set while damaging all the easy ones \u2014 the aggregate alone would not have told me why." },
          { t: "p", text: "And if any of the transformed queries are hand-written \u2014 which they often are when prototyping before wiring up a generator \u2014 I would test them for leakage. My hypothetical answer for the hard question contained the corpus's own phrase \u2018volume knob\u2019, so I rewrote it without that phrase: it scored rank 1 rather than rank 2, which established the mechanism was genre rather than borrowed vocabulary. If the gain had vanished, I would have been measuring my own familiarity with the text." },
          { t: "p", text: "Then I would price it. These transformations put a full generation in series before the search, which is hundreds of milliseconds against an 11 ms retrieval \u2014 so the question is whether recall is the binding constraint, and whether a smaller generator or a cache makes it affordable." }
        ] },

      { level: "core",
        q: "Should you use multi-query fusion?",
        strong: "A strong answer knows fusion does not protect against a bad variant.",
        answer: [
          { t: "p", text: "Sometimes, and not as a safety net \u2014 which is how it is usually described. Fusing several formulations with RRF is a vote, and RRF weights every source equally because it has no way to know which to trust." },
          { t: "p", text: "I measured that directly: fusing the baseline question with a step-back variant gave 65% recall@1, below the question alone at 75%. The bad variant was diluted rather than neutralised. So fusion does not make it safe to include a transformation you have not measured." },
          { t: "p", text: "The three-way fusion of question, HyDE and step-back did recover \u2014 80% at k=1 and 100% at k=3 \u2014 because HyDE's strength outweighed step-back's weakness. But simply concatenating the question with the hypothetical answer reached the same 100% at k=3, with one search instead of three." },
          { t: "p", text: "So my order would be: measure each variant alone, keep the ones that beat baseline, and prefer the cheapest combination that reaches the ceiling. On this corpus that was concatenation rather than fusion." }
        ] }
    ]
  }
});
