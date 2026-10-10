EC.receiveLesson({
  id: "5.10",

  lede: "The advanced patterns all attack the same tension: the chunk size that *retrieves* best is smaller than the chunk size that *answers* best. 5.4 found that tension empirically \u2014 small chunks embed precisely and hold incomplete answers. Small-to-big resolves it by indexing small and returning large, and on the shared corpus it reached **95% recall@1 against the flat baseline\u2019s 75%**. The measurement also turned up something the pattern\u2019s advocates do not mention: searching the small chunks **and returning them unchanged** scored **90% at a tenth of the token cost** \u2014 103 tokens against 1,283.",

  objectives: [
    "Explain the tension between retrieval granularity and answering granularity",
    "Implement small-to-big retrieval and measure what it costs in context tokens",
    "Decide when the extra context is worth more than ten times the tokens",
    "Describe Self-RAG and corrective RAG as control flow rather than retrieval",
    "Choose a pattern from the failure you actually have"
  ],

  prerequisites: ["5.4", "5.7"],

  blocks: [

    { t: "h2", n: "01", id: "tension", text: "The tension these patterns exist for",
      sub: "Retrieval wants small; answering wants large" },

    { t: "p", text: "5.4 measured both halves. A 128-character chunk embeds cleanly \u2014 the vector genuinely represents that fragment \u2014 and recall@1 was the worst in the sweep at 60%, because the fragment often did not contain enough of the answer. A 2,000-character chunk contains plenty and recall@5 fell to 75%, because one vector averaging four topics is close to nothing in particular." },

    { t: "p", text: "Those are not two settings of one dial. They are two different jobs: **matching** wants a vector that means one specific thing, and **answering** wants enough surrounding text to be useful. Small-to-big does both by decoupling the unit that is indexed from the unit that is returned." },

    { t: "code", lang: "python", title: "g510.py \u2014 index children, return parents", code: `def build_parent(parent_size=2000, child_size=256):
    parents, children, child_parent, meta = [], [], [], []
    for name, text in corpus:
        for p in H.chunk_recursive(text, size=parent_size, overlap=0):
            pi = len(parents)
            parents.append(p)
            for c in H.chunk_recursive(p, size=child_size, overlap=0):
                children.append(c)
                child_parent.append(pi)      # remember where it came from
                meta.append(name)
    return parents, children, child_parent, meta

# search the children, then de-duplicate their parents
for idx in CRANK[i]:
    pi = c2p[idx]
    if pi not in seen:
        seen.append(pi)`,
      out: `  259 parents (2000 chars), 1979 children (256 chars)

  retrieval unit                          r@1      r@3      r@5  tokens at k=3
  flat 500-char chunks                    75%      90%      95%            230
  small children only (256)               90%      90%     100%            103
  small-to-big (return parents)           95%      95%     100%           1283`,
      hl: [3, 4],
      caption: "Small-to-big is the best on recall and costs 12\u00d7 the context of returning the children directly." },

    { t: "callout", kind: "insight", title: "Two separate effects, and only one of them is the pattern",
      body: [
        { t: "p", text: "**Searching small chunks is worth 15 points on its own.** Children-only at 256 characters scored 90% recall@1 against the flat 500-character baseline\u2019s 75% \u2014 and at *less than half* the context cost, 103 tokens against 230, because the retrieved units are smaller." },
        { t: "p", text: "**Returning the parents adds another 5 points** \u2014 95% at k=1 \u2014 and costs 1,283 tokens, a 12\u00d7 increase over returning the children. That is the pattern proper, and it is a much worse deal than the first effect." },
        { t: "p", text: "Separating those two is what the measurement is for. Most descriptions of small-to-big present it as one technique and attribute the whole gain to the parent lookup. Here three quarters of the gain came from simply indexing smaller chunks, which 5.4 would also have told you, and the parent machinery bought the last quarter at ten times the price." },
        { t: "p", text: "With twenty questions, 90% to 95% is one question. I would not claim the parent step is worthless \u2014 the argument for it is about *answer* quality rather than retrieval, which recall cannot see \u2014 but I would want that claim measured on answers before paying 1,283 tokens per query for it." }
      ] },

    { t: "viz", title: "Three retrieval units", caption: "Recall against context cost. The cheapest configuration is also the second best on recall.",
      svg: `<svg viewBox="0 0 760 276" width="100%" role="img" aria-label="Recall and token cost for three retrieval units">
  <text x="16" y="22" class="s-label">RECALL@1</text>
  <text x="16" y="52" class="s-sub">flat 500</text>
  <rect x="150" y="40" width="375" height="18" rx="3" class="s-fill" style="stroke:var(--line)" stroke-width="1.4"/>
  <text x="535" y="54" class="s-mono">75%</text>
  <text x="16" y="84" class="s-sub">children 256</text>
  <rect x="150" y="72" width="450" height="18" rx="3" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="610" y="86" class="s-mono" style="fill:var(--good)">90%</text>
  <text x="16" y="116" class="s-sub">small-to-big</text>
  <rect x="150" y="104" width="475" height="18" rx="3" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="635" y="118" class="s-mono" style="fill:var(--good)">95%</text>

  <line x1="16" y1="140" x2="744" y2="140" stroke="var(--line)" stroke-width="1"/>

  <text x="16" y="166" class="s-label" style="fill:var(--warn)">CONTEXT TOKENS AT k=3</text>
  <text x="16" y="196" class="s-sub">children 256</text>
  <rect x="150" y="184" width="40" height="18" rx="3" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="200" y="198" class="s-mono" style="fill:var(--good)">103</text>
  <text x="16" y="228" class="s-sub">flat 500</text>
  <rect x="150" y="216" width="90" height="18" rx="3" class="s-fill" style="stroke:var(--line)" stroke-width="1.2"/>
  <text x="250" y="230" class="s-mono">230</text>
  <text x="16" y="260" class="s-sub">small-to-big</text>
  <rect x="150" y="248" width="500" height="18" rx="3" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.6"/>
  <text x="660" y="262" class="s-mono" style="fill:var(--crit)">1,283 \u2014 12\u00d7</text>
</svg>` },

    { t: "callout", kind: "tradeoff", title: "When the parent lookup earns its tokens",
      body: [
        { t: "p", text: "The argument for returning the parent is not about recall \u2014 it is that a 256-character fragment may be the right *match* and an insufficient *answer*. A sentence saying \u201cthis is set to 2\u00d7 the rank\u201d matches a question about alpha perfectly and tells a reader nothing without the paragraph around it." },
        { t: "p", text: "Recall@k cannot see that, because my scorer only asks whether the answer text was present. So the honest position is that the measurement above captures the retrieval half and not the answering half, and the answering half is where the pattern's case actually lives." },
        { t: "p", text: "Which gives a concrete decision rule: **if your chunks are small enough that a human reading one would ask \u201cwhat is this about?\u201d, return parents. If a retrieved chunk stands on its own, do not.** And measure the answers, not the retrieval, to settle it." },
        { t: "p", text: "The sentence-window variant is the cheap middle: return the matched chunk plus the one before and after it, rather than a whole 2,000-character parent. Same mechanism, a fraction of the tokens." }
      ] },

    { t: "h2", n: "02", id: "selfrag", text: "Self-RAG and corrective RAG",
      sub: "Control flow, not retrieval" },

    { t: "p", text: "The remaining patterns in the list are different in kind. Small-to-big changes *what* is retrieved; Self-RAG and corrective RAG change *what happens next* \u2014 they add a grading step and a branch." },

    { t: "dl", items: [
      { k: "Self-RAG", v: "After retrieving, the model grades whether each passage is relevant and whether its own draft answer is supported by them. Low grades trigger re-retrieval or abstention. The mechanism is a critique loop, and its cost is one or more extra model calls per query." },
      { k: "Corrective RAG (CRAG)", v: "Grade the retrieved set; if it is judged poor, fall back to a different source \u2014 commonly a web search \u2014 rather than answering from bad context. It is Self-RAG with an escape hatch to another retriever." },
      { k: "Adaptive RAG", v: "Decide *before* retrieving whether retrieval is needed at all. A question about general knowledge skips the index entirely, which saves the tokens and the latency." }
    ] },

    { t: "callout", kind: "note", title: "What these are worth is a function of your retrieval failure rate",
      body: [
        { t: "p", text: "All three spend model calls to detect and recover from bad retrieval. Their value therefore scales with how often retrieval is bad \u2014 and 5.7 measured that at **5% of queries at k=5** on this corpus after the index-time work in 5.3 to 5.6." },
        { t: "p", text: "Spending an extra generation on every query to improve 5% of them is a poor trade. Spending it when retrieval fails 30% of the time is a good one. So the order is: fix retrieval first with the cheap index-time levers, measure what is left, and add a grading loop only if the residual failure rate justifies a per-query model call." },
        { t: "p", text: "I have not measured these patterns here, because grading requires an instruct model this environment does not have. That is a genuine gap in this lesson rather than a judgement about the techniques \u2014 what I can say is what they cost in calls and what failure rate they would need to pay for themselves." }
      ] },

    { t: "table",
      head: ["Pattern", "Changes", "Extra cost per query", "Worth it when"],
      rows: [
        ["**Small chunks, flat**", "Index granularity", "None \u2014 *fewer* tokens", "Almost always: measured 90% r@1 at 103 tokens against 75% at 230"],
        ["**Small-to-big**", "What is returned", "12\u00d7 context tokens", "Chunks are too small to stand alone as answers"],
        ["**Sentence window**", "What is returned", "~3\u00d7 context tokens", "Same reason, cheaper \u2014 return neighbours instead of whole parents"],
        ["**Self-RAG**", "Control flow", "1+ model calls", "Retrieval failure rate is high enough to justify grading every query"],
        ["**Corrective RAG**", "Control flow + source", "1+ calls, plus a fallback", "A second source exists that covers what the index misses"],
        ["**Adaptive RAG**", "Whether to retrieve", "1 classification call", "A large share of traffic needs no retrieval at all"]
      ] },

    { t: "exercise", kind: "lab", title: "Measure small-to-big against its own components", difficulty: "advanced", minutes: 35,
      body: "Build a parent-child index over your corpus: large parents, small children, with a mapping from each child back to its parent. Measure recall three ways \u2014 flat chunks at a middling size, the children alone, and small-to-big with parent lookup \u2014 and report the context tokens each configuration costs at the same k. Then decide which of the two effects the pattern bundles is doing the work.",
      requirements: [
        "Use a child size well below and a parent size well above your flat baseline",
        "De-duplicate parents when several retrieved children share one",
        "Report context tokens at the same k for all three configurations",
        "Separate the gain from indexing smaller chunks from the gain from returning parents",
        "State what recall@k cannot tell you about this pattern"
      ],
      hint: "Measure the children alone as a configuration in its own right. It is the control that tells you how much of the pattern's gain is just a smaller index unit.",
      solution: { lang: "python", title: "g510.py \u2014 three retrieval units on one corpus", code: `parents, children, c2p, cmeta = build_parent(parent_size=2000, child_size=256)
CE = enc.encode(children, normalize_embeddings=True, batch_size=128)
CRANK = np.argsort(-(QV @ CE.T), axis=1)

def parent_recall(k):
    """De-duplicate the parents of the top-k children, then check parent text."""
    out = []
    for i, (q, doc, must) in enumerate(QS):
        seen, ok = [], 0
        for idx in CRANK[i]:
            pi = c2p[idx]
            if pi in seen:
                continue
            seen.append(pi)
            if cmeta[idx] in H._docs(doc) and H.hits(parents[pi], must):
                ok = 1
                break
            if len(seen) >= k:
                break
        out.append(ok)
    return np.mean(out)

# the control that isolates the two effects
print("flat 500 ", flat_recall(1), tokens(flat, FRANK, 3))
print("children ", child_recall(1), tokens(children, CRANK, 3))
print("small2big", parent_recall(1), parent_tokens(3))`,
        out: `  259 parents (2000 chars), 1979 children (256 chars)

  retrieval unit                          r@1      r@3      r@5  tokens at k=3
  flat 500-char chunks                    75%      90%      95%            230
  small children only (256)               90%      90%     100%            103
  small-to-big (return parents)           95%      95%     100%           1283`,
        notes: [
          { t: "p", text: "**Three quarters of the gain comes from indexing smaller chunks, not from the parent lookup.** Children alone went from the flat baseline's 75% to 90% recall@1 \u2014 and did it at *less than half* the context cost, 103 tokens against 230. That is a free improvement in both dimensions." },
          { t: "p", text: "**The parent lookup adds five points and 12\u00d7 the tokens**: 95% at 1,283 tokens. With twenty questions that is one question, so the recall case for the parent step is weak on this evidence." },
          { t: "p", text: "**But recall@k is the wrong instrument for the parent step's actual claim.** Its argument is that a 256-character fragment can be the right match and an insufficient answer \u2014 and my scorer only asks whether the answer text was present, not whether a reader could use it. The answering half is unmeasured here, and that is where the case lives." },
          { t: "p", text: "**The decision rule that follows**: if a human reading one retrieved chunk would ask \u201cwhat is this about?\u201d, return parents; if the chunk stands alone, do not. And settle it by evaluating answers rather than retrieval." },
          { t: "p", text: "**The sentence-window variant is the cheap middle** \u2014 return the matched chunk plus its immediate neighbours rather than a whole 2,000-character parent. Same mechanism at roughly 3\u00d7 the base tokens instead of 12\u00d7." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Indexing and answering are different jobs with different ideal units, and most of these patterns are ways of refusing to pick one. Small-to-big does it by storing the link between the two." },
        { t: "p", text: "The control-flow patterns are a different family entirely: they do not improve retrieval, they detect when it failed. Which means their value is set by how often it fails \u2014 so fix retrieval first and measure the remainder before paying a model call per query." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cWe implemented small-to-big retrieval and recall barely moved, but our token bill went up 40%. What went wrong?\u201d**" },
        { t: "p", text: "Probably nothing went wrong \u2014 they may have paid for the half of the pattern that costs and skipped the half that pays." },
        { t: "p", text: "Small-to-big bundles two separate changes: indexing smaller chunks, and returning larger ones. When I measured them apart, indexing 256-character children took recall@1 from 75% to 90% at *less than half* the context cost. Returning the 2,000-character parents added five more points and twelve times the tokens. So if their flat baseline was already small \u2014 say 256 or 300 characters \u2014 the first effect was already banked, and all the parent lookup could add was the cost." },
        { t: "p", text: "The diagnostic is to run the children alone as a third configuration. If children-only matches small-to-big on recall, the parent step is buying nothing measurable and should be dropped or narrowed." },
        { t: "p", text: "The caveat I would attach is that recall is the wrong instrument for what the parent step actually claims. Its argument is about answer quality \u2014 a fragment can be the right match and useless to read \u2014 and recall only asks whether the answer text was present. So before dropping it I would check a sample of answers, not just the retrieval metric." },
        { t: "p", text: "And if the answers do need more context, the sentence-window variant gets most of it for a fraction of the cost: return the matched chunk plus its immediate neighbours rather than a whole parent. That is roughly 3\u00d7 the base tokens against the 12\u00d7 I measured for full parents." }
      ] }
  ],

  takeaways: [
    "**Retrieval and answering want different chunk sizes** \u2014 5.4 measured small chunks embedding precisely and holding incomplete answers, and large ones the reverse.",
    "**Small-to-big decouples them**: index small children, return their larger parents, with a mapping between the two.",
    "**Measured 95% recall@1 against a flat baseline's 75%** \u2014 the best configuration tested in this lesson.",
    "**But three quarters of that gain is from indexing smaller chunks, not the parent lookup.** Children alone scored 90% at 103 context tokens against the baseline's 75% at 230.",
    "**The parent step adds five points and 12\u00d7 the tokens** \u2014 1,283 against 103 at k=3, which on twenty questions is one question's worth of recall.",
    "**Recall@k cannot see the parent step's real claim**, which is that a fragment can be the right match and an insufficient answer \u2014 that needs answer evaluation.",
    "**The decision rule: return parents when a retrieved chunk would leave a reader asking \u201cwhat is this about?\u201d** and not otherwise.",
    "**Sentence-window is the cheap middle** \u2014 the matched chunk plus its neighbours, at roughly 3\u00d7 the base tokens instead of 12\u00d7.",
    "**Self-RAG, corrective RAG and adaptive RAG are control flow, not retrieval** \u2014 they grade and branch rather than changing what is indexed.",
    "**Their value scales with the retrieval failure rate**, measured at 5% at k=5 here \u2014 so fix retrieval with cheap index-time levers first, then decide whether a per-query model call is justified."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Small-to-big reached 95% recall@1 against a flat baseline's 75%. Measuring the children alone gave 90%. What does that decomposition show?",
        options: [
          "The parent lookup is responsible for the entire improvement",
          "Most of the gain comes from indexing smaller chunks; the parent lookup adds five points at 12\u00d7 the context cost",
          "The flat baseline was misconfigured",
          "Parent de-duplication is reducing the effective k"
        ],
        answer: 1,
        why: "Running the children as a configuration in their own right is the control that separates the two effects the pattern bundles. Indexing 256-character chunks took recall from 75% to 90% and *reduced* context tokens from 230 to 103; returning parents added five points and raised tokens to 1,283. That matters because most descriptions attribute the whole gain to the parent step, and on this evidence three quarters of it comes from a change 5.4 would also have suggested." },

      { stem: "Why can recall@k not settle whether the parent lookup is worth its tokens?",
        options: [
          "Because recall@k is too noisy at any sample size",
          "Because the parent step's claim is about answer sufficiency \u2014 whether a reader can use the passage \u2014 which recall does not measure",
          "Because parents and children cannot be scored on the same scale",
          "Because de-duplication changes the meaning of k"
        ],
        answer: 1,
        why: "The scorer asks only whether the answer text was present in a retrieved unit. The argument for returning parents is that a 256-character fragment can match perfectly and still leave a reader without enough context to use it \u2014 a property of the answer, not of retrieval. Settling it requires evaluating generated answers rather than retrieval, which is why the lesson states the measurement captures one half of the question and not the other." },

      { stem: "Self-RAG and corrective RAG add a grading step after retrieval. What determines whether they are worth their cost?",
        options: [
          "The size of the corpus being indexed",
          "The retrieval failure rate \u2014 spending a model call per query to improve 5% of them is a poor trade, and a good one at 30%",
          "Whether the embedding model supports instruction tuning",
          "The number of documents in the fallback source"
        ],
        answer: 1,
        why: "These patterns do not improve retrieval; they detect and recover from bad retrieval, so their value is proportional to how often it is bad. Measured on this corpus after the index-time work, retrieval failed about 5% of queries at k=5 \u2014 and a per-query extra generation to address that is expensive. The right order is to exhaust the cheap index-time levers first, measure the residual failure rate, and then decide whether grading pays for itself." },

      { stem: "A team's flat chunks are already 256 characters and they add small-to-big retrieval. What should they expect?",
        options: [
          "The same gain measured in the lesson, since the pattern is independent of baseline",
          "Little recall gain \u2014 the small-chunk effect is already banked, so they are paying the parent cost without the larger of the two benefits",
          "A recall regression, since parents dilute the embeddings",
          "No change at all, since parent lookup does not affect ranking"
        ],
        answer: 1,
        why: "The pattern bundles two effects, and the larger one \u2014 indexing smaller chunks, worth 15 points here \u2014 is already present if the baseline is small. What remains is the parent lookup, measured at five points and 12\u00d7 the context tokens. The parents do not affect ranking at all, since search happens over the children; they change only what is returned, which is why the cost appears in the token bill rather than in recall." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Where a named pattern bundles two changes and only one of them pays",
    questions: [
      { level: "core",
        q: "Explain small-to-big retrieval.",
        strong: "A strong answer names the tension it resolves and separates the two effects.",
        answer: [
          { t: "p", text: "Index small chunks for matching and return the larger passage each one came from, keeping a mapping between them. It exists because retrieval and answering want different granularities \u2014 a small chunk gives a vector that means one specific thing, and a larger one gives a reader enough context to use." },
          { t: "p", text: "Measured on a real corpus it was the best configuration I tried: 95% recall@1 against a flat 500-character baseline's 75%." },
          { t: "p", text: "The part I would add is that it bundles two changes and they are worth very different amounts. Running the small children alone, with no parent lookup, scored 90% \u2014 at less than half the context cost, 103 tokens against the baseline's 230. The parent step added the last five points and took tokens to 1,283, a twelve-fold increase." },
          { t: "p", text: "So on retrieval evidence most of the value is in indexing smaller chunks. The parent step's real argument is about answer sufficiency rather than recall, and recall cannot see it \u2014 which means settling it needs answer evaluation, and the sentence-window variant is a cheaper way to get most of the same thing." }
        ] },

      { level: "advanced",
        q: "When would you add Self-RAG or corrective RAG?",
        strong: "A strong answer ties their value to a measured failure rate.",
        answer: [
          { t: "p", text: "When the retrieval failure rate is high enough to justify a model call on every query, and not before. These patterns do not improve retrieval \u2014 they grade it and branch \u2014 so their value is proportional to how often there is something to catch." },
          { t: "p", text: "On my corpus, after the index-time work, retrieval missed about 5% of queries at k=5. Adding a generation to every query to improve one in twenty is a poor trade; at 30% it would be an obvious one. So the first move is always to exhaust the cheap index-time levers \u2014 chunking was worth 25 points, the embedding model 30 \u2014 and then measure what is left." },
          { t: "p", text: "Corrective RAG specifically needs a second source that covers what the index misses, usually web search. If the gap is that the corpus genuinely does not contain the answer, falling back is the right behaviour; if the gap is that retrieval failed to find text that is present, a better retriever is cheaper than a fallback." },
          { t: "p", text: "Adaptive RAG is the one I would reach for soonest, because it saves rather than spends: classify whether a question needs retrieval at all, and skip the index for the ones that do not. On traffic with a lot of general-knowledge questions that removes tokens and latency rather than adding them." }
        ] },

      { level: "core",
        q: "How do you choose between these patterns?",
        strong: "A strong answer picks from the observed failure rather than from the list.",
        answer: [
          { t: "p", text: "From the failure I actually have, which means looking at the questions that went wrong rather than at the catalogue of patterns." },
          { t: "p", text: "If the right document was retrieved and the wrong passage of it \u2014 which I track as the gap between document recall and chunk recall \u2014 that is a granularity problem, and small chunks plus either parents or sentence windows is the answer." },
          { t: "p", text: "If retrieval returns plausible-but-wrong passages and the model answers from them anyway, that is a grading problem and Self-RAG's critique loop is the shape that helps." },
          { t: "p", text: "If the corpus simply does not contain the answer, no retrieval pattern helps and the right behaviour is to say so \u2014 which is a prompt instruction (5.7) long before it is corrective RAG with a web fallback." },
          { t: "p", text: "The failure mode I would warn against is adopting a named pattern because it is named. Small-to-big bundles two changes with very different returns, and a team whose chunks are already small pays the expensive half for none of the cheap half's benefit." }
        ] }
    ]
  }
});
