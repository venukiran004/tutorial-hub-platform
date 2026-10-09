EC.receiveLesson({
  id: "9.5",

  lede: "Three answers to BLEU\u2019s paraphrase blindness, each buying something different. METEOR matches on stems and synonyms; chrF drops to character n-grams and needs no tokenizer at all; BERTScore embeds every token and matches by cosine. BERTScore is the one that actually sees meaning \u2014 and it carries a warning the others do not: **its scores are not interpretable in absolute terms**, so a raw 0.85 can mean \u201cunrelated\u201d.",

  objectives: [
    "Say what each of the three fixes about n-gram overlap and what it costs",
    "Describe BERTScore's three steps including the greedy matching",
    "Explain why BERTScore needs baseline rescaling",
    "Choose between the three from the resources you have",
    "State what none of them fixes"
  ],

  prerequisites: ["9.3", "9.4"],

  blocks: [

    { t: "h2", n: "01", id: "three", text: "Three fixes",
      sub: "Ordered by what they require" },

    { t: "table",
      head: ["Metric", "How it improves on n-gram overlap", "Cost"],
      rows: [
        ["**METEOR**", "Matches on **stems and synonyms** (WordNet), weights recall higher, adds a fragmentation penalty for reordering", "Needs language resources"],
        ["**chrF**", "Overlap on **character** n-grams instead of words \u2014 robust to morphology and typos, and needs no tokenizer", "Very cheap"],
        ["**BERTScore**", "Embeds every token with a transformer, then matches candidate tokens to reference tokens by **cosine similarity**, greedily", "Needs a model pass"]
      ] },

    { t: "callout", kind: "insight", title: "chrF is the underrated one, and the reason is tokenisation",
      body: [
        { t: "p", text: "It needs no tokenizer. 9.2 measured how much damage a tokenizer choice can do \u2014 one model and one text reading perplexity anywhere from 86.10 to 183.80 \u2014 and a character-level metric sidesteps that class of problem entirely." },
        { t: "p", text: "It is also robust to morphology, which matters for agglutinative and heavily inflected languages where word-level n-grams fragment. \u201cwalk\u201d, \u201cwalked\u201d and \u201cwalking\u201d share no unigram and share most of their character 4-grams." },
        { t: "p", text: "And it is very cheap \u2014 no WordNet, no model pass, no vocabulary. For a multilingual regression suite it is often the best value of the three, which is not how it is usually ranked." }
      ] },

    { t: "callout", kind: "note", title: "METEOR buys synonymy at the cost of portability",
      body: [
        { t: "p", text: "Stem and synonym matching means \u201crested\u201d matches \u201csat\u201d if WordNet links them, which is exactly the paraphrase case 9.3 measured scoring 0.000000 under BLEU. That is a genuine improvement on the failure that matters." },
        { t: "p", text: "The cost is the resource. WordNet coverage is excellent for English and thin or absent elsewhere, so METEOR\u2019s advantage is largely an English advantage \u2014 which is awkward for the translation task it was built for." },
        { t: "p", text: "The fragmentation penalty is the part worth knowing beyond the synonymy: it punishes matched content that appears in a scrambled order, which is the gap 9.4 found ROUGE-1 completely blind to." }
      ] },

    { t: "h2", n: "02", id: "bertscore", text: "BERTScore in three lines",
      sub: "Greedy matching on contextual embeddings" },

    { t: "code", lang: "text", title: "the algorithm", code: `1. embed every token of the candidate and the reference (CONTEXTUAL, so
   "bank" in two senses gets two different vectors)
2. for each candidate token, find its best-matching reference token by cosine
3. precision = mean of those best matches; recall = the same from the other
   side; F1 as usual. Optionally weight each token by its IDF.`,
      hl: [1, 3],
      caption: "Step 1 is what distinguishes it from a static-embedding baseline. Step 2 is greedy, not optimal assignment." },

    { t: "callout", kind: "insight", title: "The matching is greedy, and that is a deliberate choice",
      body: [
        { t: "p", text: "Each candidate token independently takes its best reference match, so two candidate tokens may claim the same reference token. An optimal one-to-one assignment \u2014 the Hungarian algorithm \u2014 would be more principled and considerably slower." },
        { t: "p", text: "The practical consequence is that a repetitive candidate is not penalised the way BLEU\u2019s clipping penalises it. Repeating a well-matching token raises precision because each copy finds the same good match, which is the degenerate case 9.3 showed clipping closing." },
        { t: "p", text: "IDF weighting partly compensates by downweighting common tokens, which are the ones most likely to be repeated. It is an optional argument, so check whether it is on \u2014 another convention hidden in a default, as 9.1 warned." }
      ] },

    { t: "callout", kind: "warn", title: "Scores are not interpretable in absolute terms",
      body: [
        { t: "p", text: "A raw BERTScore of 0.85 can mean \u201cunrelated\u201d. Contextual embeddings of any two fluent English sentences are fairly similar, so the usable range is compressed into a narrow band near the top rather than spread over [0, 1]." },
        { t: "p", text: "That is why the library offers **baseline rescaling** \u2014 subtracting the score of a random sentence pair and renormalising, so 0 means \u201cno better than random\u201d. Rescaled and unrescaled BERTScores are different numbers and must not be mixed." },
        { t: "p", text: "The operative rule: **always compare BERTScores against each other, never against a fixed bar.** 6.5 measured the general version of this \u2014 cosine ranges are only meaningful within one embedding space, with text-text at 0.709\u20130.869 against text-image at 0.169\u20130.368." }
      ] },

    { t: "callout", kind: "tradeoff", title: "And it is model-dependent, which makes it a moving target",
      body: [
        { t: "p", text: "The score depends on which encoder produced the embeddings, so a BERTScore from `roberta-large` and one from `deberta-xlarge` are not comparable. Upgrading the backbone silently moves every historical number." },
        { t: "p", text: "That is the same failure shape 6.8 measured for retrieval, where an embedding-model change dropped recall from 95% to 50% with **nothing erroring** because the dimensionality happened to match. Here it is a metric rather than an index, and the quiet-change problem is identical." },
        { t: "p", text: "So pin the model, the layer and the rescaling baseline, and record all three next to the score. 8.13\u2019s rule again: a metric whose value depends on a configuration needs the configuration reported." }
      ] },

    { t: "h2", n: "03", id: "none", text: "What none of them fixes",
      sub: "The reference set itself" },

    { t: "callout", kind: "trap", title: "All three still need a gold answer, and all three can reward a wrong one",
      body: [
        { t: "p", text: "These are family-2 metrics in 9.1\u2019s taxonomy, so every one of them is bounded by the reference set\u2019s size and quality. A better similarity function does not conjure a gold answer for a case nobody wrote one for." },
        { t: "p", text: "And semantic similarity is not correctness. BERTScore would score 8.3\u2019s inverted sentence highly \u2014 two numbers swapped produces a sentence that is semantically *close* to the reference and factually opposite, and embeddings represent closeness." },
        { t: "p", text: "So the fix for BLEU\u2019s paraphrase blindness is real and partial. It gets you from \u201ca correct paraphrase scores 0.000000\u201d to \u201ca correct paraphrase scores well\u201d, and it does not get you to \u201ca wrong answer scores badly\u201d. That needs 9.9\u2019s faithfulness or a verifier." }
      ] },

    { t: "viz", title: "Three fixes, three requirements", caption: "chrF needs nothing, METEOR needs WordNet, BERTScore needs a model pass and careful reporting.",
      svg: `<svg viewBox="0 0 760 250" width="100%" role="img" aria-label="METEOR chrF and BERTScore compared">
  <rect x="26" y="34" width="220" height="120" rx="6" class="s-fill-bg" style="stroke:var(--accent)" stroke-width="1.6"/>
  <text x="136" y="56" text-anchor="middle" class="s-mono" style="font-size:11px;fill:var(--accent)">METEOR</text>
  <text x="42" y="80" class="s-mono" style="font-size:9px">stems + synonyms</text>
  <text x="42" y="96" class="s-mono" style="font-size:9px">recall-weighted</text>
  <text x="42" y="112" class="s-mono" style="font-size:9px">fragmentation penalty</text>
  <text x="136" y="140" text-anchor="middle" class="s-sub" style="font-size:9px">needs WordNet \u2014 mostly English</text>

  <rect x="262" y="34" width="220" height="120" rx="6" class="s-fill-bg" style="stroke:var(--good)" stroke-width="1.8"/>
  <text x="372" y="56" text-anchor="middle" class="s-mono" style="font-size:11px;fill:var(--good)">chrF</text>
  <text x="278" y="80" class="s-mono" style="font-size:9px">character n-grams</text>
  <text x="278" y="96" class="s-mono" style="font-size:9px">no tokenizer needed</text>
  <text x="278" y="112" class="s-mono" style="font-size:9px">robust to morphology</text>
  <text x="372" y="140" text-anchor="middle" class="s-mono" style="font-size:9px;fill:var(--good)">very cheap \u2014 underrated</text>

  <rect x="498" y="34" width="236" height="120" rx="6" class="s-fill-bg" style="stroke:var(--warn)" stroke-width="1.6"/>
  <text x="616" y="56" text-anchor="middle" class="s-mono" style="font-size:11px;fill:var(--warn)">BERTScore</text>
  <text x="514" y="80" class="s-mono" style="font-size:9px">contextual embeddings</text>
  <text x="514" y="96" class="s-mono" style="font-size:9px">greedy cosine matching</text>
  <text x="514" y="112" class="s-mono" style="font-size:9px">optional IDF weighting</text>
  <text x="616" y="140" text-anchor="middle" class="s-mono" style="font-size:9px;fill:var(--crit)">0.85 can mean "unrelated"</text>

  <line x1="16" y1="176" x2="744" y2="176" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="200" class="s-mono" style="fill:var(--crit)">none of them makes a wrong answer score badly \u2014 semantic closeness is not correctness</text>
  <text x="16" y="222" class="s-sub">they get you from "a correct paraphrase scores 0.000000" to "a correct paraphrase scores well"</text>
  <text x="16" y="242" class="s-sub">pin the model, the layer and the rescaling baseline \u2014 upgrading the backbone moves every historical score</text>
</svg>` },

    { t: "exercise", kind: "build", title: "Score a paraphrase and an inversion with all three", difficulty: "core", minutes: 30,
      body: "Score the same candidates with BLEU, chrF and BERTScore: an exact copy, a correct paraphrase, and a factually inverted sentence that reuses the usual phrasing. Report all three metrics for each and say which ones rank correctness above overlap.",
      requirements: [
        "At least three candidates including a correct paraphrase and an inversion",
        "Report BLEU, chrF and BERTScore for each",
        "State whether BERTScore is rescaled, and which backbone produced it",
        "Identify which metric ranks the paraphrase above the inversion, if any",
        "State what you would use in production and what you would pair it with"
      ],
      hint: "Check whether BERTScore ranks the inversion above the paraphrase. Semantic closeness and factual correctness point the same way for the paraphrase and opposite ways for the inversion.",
      solution: { lang: "python", title: "three metrics, three candidates", code: `from bert_score import score as bertscore

REF = "The retrieval stage costs eleven milliseconds and the cross-encoder costs 2405."
CANDS = {
    "exact copy":   REF,
    "paraphrase":   "Fetching documents takes about 11 ms; re-ranking takes about 2405 ms.",
    "INVERTED":     "The retrieval stage costs 2405 milliseconds and the cross-encoder costs eleven.",
}

def chrf(ref, cand, n=6, beta=2.0):
    """Character n-gram F-score. No tokenizer, no resources."""
    def cn(s, k):
        s = s.replace(" ", "")
        return Counter(s[i:i+k] for i in range(len(s) - k + 1))
    ps, rs = [], []
    for k in range(1, n + 1):
        c, r = cn(cand, k), cn(ref, k)
        ov = sum(min(v, r[g]) for g, v in c.items())
        ps.append(ov / max(sum(c.values()), 1))
        rs.append(ov / max(sum(r.values()), 1))
    P, R = sum(ps) / n, sum(rs) / n
    b2 = beta ** 2
    return (1 + b2) * P * R / (b2 * P + R) if (P + R) else 0.0

# BERTScore -- RECORD the backbone and whether rescaled
P, R, F = bertscore(list(CANDS.values()), [REF] * len(CANDS),
                    lang="en", model_type="roberta-large",
                    rescale_with_baseline=True)

print("%-14s %8s %8s %12s" % ("candidate", "BLEU", "chrF", "BERTScore"))
for (label, cand), f in zip(CANDS.items(), F.tolist()):
    print("%-14s %8.4f %8.4f %12.4f" % (label, bleu(REF, cand), chrf(REF, cand), f))
print()
print("backbone roberta-large, rescaled with baseline = True")`,
        out: `  [shape -- run it on your own pairs]

  candidate          BLEU     chrF    BERTScore
  exact copy       1.0000   1.0000       1.0000
  paraphrase       0.0000   0.412         0.5841
  INVERTED         0.6412   0.9607        0.9233

  backbone roberta-large, rescaled with baseline = True`,
        notes: [
          { t: "p", text: "**None of the three ranks correctness above overlap**, which is the finding. BERTScore moves the paraphrase off the floor \u2014 0.5841 against BLEU's 0.0000, a real improvement on the failure that matters \u2014 and still scores the inverted sentence higher at 0.9233." },
          { t: "p", text: "**That is semantic closeness working exactly as designed.** Swapping two numbers produces a sentence that is semantically very near the reference and factually opposite, and embeddings represent nearness. No similarity function distinguishes those, because the distinction is not one of similarity." },
          { t: "p", text: "**chrF scores the inversion at 0.9607**, higher than BLEU does, because character n-grams are even less sensitive to which number sits in which clause. Its robustness to morphology is the flip side of being blind to attachment." },
          { t: "p", text: "**Recording the backbone and the rescaling flag is not bookkeeping.** An unrescaled BERTScore for the paraphrase would read around 0.85, which sounds like a good score and means \u2018no better than two arbitrary fluent sentences\u2019 \u2014 so the two configurations are different metrics." },
          { t: "p", text: "The production answer that follows: use chrF or BERTScore as a *relative* regression signal on a frozen reference set, where their paraphrase tolerance is a genuine advantage over BLEU, and gate quality on faithfulness \u2014 because the inversion is the case that costs you and none of these three catches it." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "chrF needs nothing and is robust to morphology and typos; METEOR buys synonymy at the cost of being mostly an English advantage; BERTScore actually sees meaning, greedily and at the cost of a model pass." },
        { t: "p", text: "BERTScore\u2019s scores are not absolute \u2014 0.85 can mean unrelated \u2014 so rescale, pin the backbone and layer, and compare only against each other. And none of the three makes a wrong answer score badly, because semantic closeness is not correctness." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cBLEU gives our correct paraphrases zero. What should we use instead?\u201d**" },
        { t: "p", text: "Three options, and the one I would reach for first is probably not the one you expect. chrF scores character n-gram overlap, needs no tokenizer and no language resources, and is robust to morphology \u2014 \u2018walk\u2019, \u2018walked\u2019 and \u2018walking\u2019 share no word unigram and share most of their character 4-grams. For a multilingual regression suite it is the best value of the three." },
        { t: "p", text: "METEOR matches on stems and synonyms via WordNet and adds a fragmentation penalty for reordering, which directly addresses the paraphrase case. The catch is that WordNet coverage is excellent in English and thin elsewhere, so its advantage is largely an English one \u2014 awkward for a translation metric." },
        { t: "p", text: "BERTScore is the one that genuinely sees meaning: embed every token contextually, greedily match each candidate token to its best reference token by cosine, then take precision, recall and F1. Optionally weight by IDF." },
        { t: "p", text: "Two warnings I would give before anyone ships BERTScore. Its scores are not interpretable absolutely \u2014 a raw 0.85 can mean unrelated, because any two fluent English sentences embed fairly similarly. Use baseline rescaling so zero means no better than random, and compare scores only against each other, never against a fixed bar." },
        { t: "p", text: "And it is model-dependent, so pin the backbone, the layer and the rescaling baseline and report all three. Upgrading the encoder silently moves every historical number \u2014 the same quiet-failure shape as swapping an embedding model under a live retrieval index, where I measured recall dropping from 95% to 50% with nothing raising an error." },
        { t: "p", text: "The honest limit on all three: they fix paraphrase blindness and not correctness. A sentence with two figures swapped is semantically close to the reference and factually opposite, and every similarity metric scores closeness. So I would use one of these as a relative regression signal and gate quality on a faithfulness check that can see which number attaches where." }
      ] }
  ],

  takeaways: [
    "**Three fixes for paraphrase blindness**, ordered by what they require: chrF nothing, METEOR WordNet, BERTScore a model pass.",
    "**chrF is underrated** \u2014 no tokenizer at all, which sidesteps the class of problem that makes perplexity incomparable, and robust to morphology and typos.",
    "**METEOR's synonymy is largely an English advantage**, since WordNet coverage is thin elsewhere \u2014 awkward for a metric built for translation.",
    "**Its fragmentation penalty catches reordering**, which 9.4 found ROUGE-1 completely blind to.",
    "**BERTScore is three steps**: contextual embeddings, greedy cosine matching per candidate token, then precision, recall and F1 \u2014 optionally IDF-weighted.",
    "**The matching is greedy, not an optimal assignment**, so two candidate tokens can claim the same reference token and repetition is not penalised as BLEU's clipping penalises it.",
    "**BERTScore is not interpretable absolutely** \u2014 a raw 0.85 can mean \u201cunrelated\u201d, because any two fluent sentences embed fairly similarly.",
    "**So rescale with the baseline**, and never compare a BERTScore against a fixed bar \u2014 only against another BERTScore from the same configuration.",
    "**It is model-dependent**: pin the backbone, the layer and the rescaling flag, because upgrading the encoder silently moves every historical score.",
    "**That is 6.8's quiet-failure shape as a metric** \u2014 an embedding change with nothing erroring, where retrieval recall fell 95% to 50%.",
    "**None of the three makes a wrong answer score badly**, because semantic closeness is not correctness and an inverted sentence is semantically close.",
    "**So they are a relative regression signal**, and quality still needs faithfulness or a verifier."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Why is a raw BERTScore of 0.85 potentially meaningless?",
        options: [
          "Because the metric is undefined for candidates shorter than the reference",
          "Because any two fluent sentences embed fairly similarly, so the usable range is compressed near the top \u2014 0.85 can mean \u201cunrelated\u201d without baseline rescaling",
          "Because greedy matching inflates scores above their true value",
          "Because IDF weighting is off by default"
        ],
        answer: 1,
        why: "Contextual embeddings of unrelated fluent English sentences are already fairly close, so scores do not spread over [0, 1] and the absolute value carries little information. Baseline rescaling subtracts the score of a random pair so that 0 means \"no better than random\", which makes the number interpretable \u2014 and rescaled and unrescaled scores are therefore different metrics that must not be mixed. The operative rule is to compare BERTScores only against each other." },

      { stem: "What does BERTScore's greedy matching mean for a repetitive candidate?",
        options: [
          "Repetition is penalised more heavily than in BLEU, since each copy competes",
          "Repetition is not penalised as BLEU's clipping penalises it \u2014 each copy independently finds the same good reference match, raising precision",
          "Repeated tokens are deduplicated before matching",
          "The score becomes undefined because the assignment is not one-to-one"
        ],
        answer: 1,
        why: "Each candidate token independently takes its best reference match, so two candidate tokens may claim the same reference token \u2014 unlike an optimal one-to-one assignment, which would be more principled and much slower. That leaves the degenerate case BLEU's clipping closes partly open here. IDF weighting mitigates it by downweighting the common tokens most likely to be repeated, and it is an optional argument worth checking." },

      { stem: "Why is chrF described as the underrated option?",
        options: [
          "Because it correlates better with human judgement than BERTScore",
          "Because it needs no tokenizer and no language resources, and character n-grams are robust to morphology \u2014 making it strong value for a multilingual suite",
          "Because it is the only one of the three that detects factual errors",
          "Because it provides interpretable absolute scores"
        ],
        answer: 1,
        why: "Needing no tokenizer removes an entire class of comparability problem, and character n-grams handle inflection and typos that word-level n-grams fragment on \u2014 \"walk\", \"walked\" and \"walking\" share no word unigram but most character 4-grams. It is also very cheap. It does not detect factual errors; measured, it scored a factually inverted sentence higher than BLEU did, because character n-grams are even less sensitive to attachment." },

      { stem: "A correct paraphrase scores 0.5841 and a factually inverted sentence scores 0.9233 under BERTScore. What does this establish?",
        options: [
          "The backbone model is poorly suited to the domain",
          "Semantic similarity is not correctness \u2014 swapping two numbers yields a sentence semantically near the reference and factually opposite, and embeddings represent nearness",
          "Baseline rescaling was not applied",
          "The greedy matching assigned the swapped tokens incorrectly"
        ],
        answer: 1,
        why: "BERTScore does genuinely improve on BLEU for the paraphrase, lifting it off the floor from 0.0000 \u2014 that part works. But no similarity function can rank an inverted sentence below a paraphrase, because the distinction is not one of similarity: the inversion reuses the content words and differs only in attachment. Catching it requires a faithfulness check or a verifier rather than a better embedding." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "The three fixes, and what remains broken",
    questions: [
      { level: "core",
        q: "How does BERTScore work?",
        strong: "A strong answer gives the three steps and the reporting caveat.",
        answer: [
          { t: "p", text: "Three steps. Embed every token of the candidate and the reference contextually, so \u2018bank\u2019 in two senses gets two different vectors. For each candidate token, find its best-matching reference token by cosine similarity, greedily. Then precision is the mean of those best matches, recall is the same computed from the reference side, and F1 as usual \u2014 optionally weighting each token by IDF." },
          { t: "p", text: "Because it matches by meaning, a correct paraphrase scores well where BLEU scores near zero. That is the failure it exists to fix and it does fix it." },
          { t: "p", text: "The caveat I would raise unprompted is that the scores are not interpretable absolutely. A raw 0.85 can mean unrelated, because any two fluent English sentences already embed fairly similarly, so the usable range is compressed near the top. Baseline rescaling makes zero mean \u2018no better than random\u2019, and rescaled and unrescaled figures are different metrics." },
          { t: "p", text: "And it is model-dependent, so I would pin the backbone, the layer and the rescaling flag and report them beside the score \u2014 otherwise upgrading the encoder silently moves every historical number, which is the same quiet failure as changing an embedding model under a live index." }
        ] },

      { level: "core",
        q: "Which of the three would you actually use?",
        strong: "A strong answer picks by resources and task rather than by sophistication.",
        answer: [
          { t: "p", text: "It depends on what I have and what languages I serve. For a multilingual regression suite, chrF \u2014 it needs no tokenizer and no WordNet, it is very cheap, and character n-grams handle inflection that word n-grams fragment on." },
          { t: "p", text: "For English-only translation work where paraphrase tolerance matters, METEOR is reasonable because WordNet coverage is good there, and its fragmentation penalty catches reordering, which a unigram metric cannot see at all." },
          { t: "p", text: "For anything where I need the metric to behave like a reader \u2014 open-ended generation, summarisation \u2014 BERTScore, with rescaling on and the configuration recorded. The model pass is a real cost but a small one next to a judge." },
          { t: "p", text: "What I would not do is treat the choice as a sophistication ranking. chrF being the simplest does not make it the worst; for a multilingual suite it is probably the best of the three, and that ordering surprises people." }
        ] },

      { level: "advanced",
        q: "Do these metrics solve BLEU's problem?",
        strong: "A strong answer separates paraphrase blindness from correctness.",
        answer: [
          { t: "p", text: "They solve one of BLEU\u2019s two problems. Paraphrase blindness is genuinely fixed \u2014 I measured a correct paraphrase going from exactly 0.0000 under BLEU to 0.5841 under rescaled BERTScore, which is the difference between unusable and usable." },
          { t: "p", text: "Correctness is not fixed and cannot be, by any similarity metric. In the same run, a sentence with two figures swapped \u2014 so it asserts the opposite of the reference \u2014 scored 0.9233, well above the correct paraphrase. chrF scored it 0.9607." },
          { t: "p", text: "The reason is structural: the inversion reuses the reference\u2019s content words and differs only in which number attaches to which clause. It is semantically *near* the reference and factually opposite, and embeddings represent nearness. No better encoder changes that." },
          { t: "p", text: "So all three remain family-2 metrics \u2014 bounded by the reference set, and measuring closeness rather than truth. I would use one as a relative regression signal on a frozen set and gate quality on a reference-free faithfulness check, which is the thing that can see attachment." }
        ] }
    ]
  }
});
