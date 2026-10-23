/* ============================================================================
   LESSON 8.6 — Record Linkage: Fellegi-Sunter, Blocking and Survivorship
   ========================================================================= */
EC.receiveLesson({
  id: "8.6",

  lede: "8.5 scored one pair of names five ways and left two questions open: how to combine several fields into one decision, and how to avoid comparing every record with every other. **Both were answered in 1969, and the answer is still what production systems implement** — a probabilistic model that turns each field agreement into a number of bits of evidence, where agreeing on a date of birth is worth +10.89 bits and agreeing on gender is worth +0.97.",

  objectives: [
    "Derive the Fellegi-Sunter match weight from m and u probabilities",
    "Explain why field disagreement can be stronger evidence than agreement",
    "Choose a blocking strategy, and quantify what it costs and saves",
    "Apply sorted-neighbourhood blocking where exact blocking keys fail",
    "Set two thresholds rather than one, and staff the middle",
    "Define survivorship rules that produce a defensible golden record"
  ],

  prerequisites: ["8.5", "8.3"],

  blocks: [

    { t: "h2", n: "01", text: "The problem with a weighted average", id: "problem" },

    {"kind": "compare", "title": "A tuned weighted average, or two probabilities you can explain", "caption": "**The weighted average works tolerably and cannot answer the question that matters: how much evidence is this?** A score of 0.8 means nothing outside the particular weights you chose, so a threshold on it is not defensible to anyone. Fellegi-Sunter replaces the tuning with two quantities per field that are each estimable from data and explainable to a reviewer — and because the weights are logarithms, evidence from different fields adds.", "columns": [{"title": "Hand-tuned weights", "tone": "warn", "items": ["One weight per field, chosen by feel", "Agreement and disagreement are mirror images", "The score has no units", "A threshold is a guess", "Retuning is undocumented judgement"]}, {"title": "m and u probabilities", "tone": "violet", "items": ["m: P(agree | match) - data quality", "u: P(agree | non-match) - discriminativeness", "The score is in bits of evidence", "Thresholds follow from error rates", "Estimable unsupervised, with EM"]}], "t": "diagram", "id": "dg-8_6-01-5"},

    { t: "p", text: "The obvious way to combine field comparisons is to score each one and average, perhaps with weights you tuned by hand. It works tolerably and it cannot answer the question that matters: **how much evidence is this?** A weighted average of 0.8 is not a quantity you can set a threshold on defensibly, because the number means nothing outside the particular weights you chose." },

    { t: "p", text: "Fellegi and Sunter's formulation replaces the tuning with two probabilities per field, each of which is a thing you can estimate from data and explain to someone." },

    { t: "dl", items: [
      ["m — P(the fields agree | the pair IS a match)", "A question about **data quality**. How often do two records that genuinely refer to the same person agree on surname? Not always: marriage, typos, transliteration. For a well-maintained date of birth, m might be 0.95; for a surname, 0.90."],
      ["u — P(the fields agree | the pair is NOT a match)", "A question about **how discriminating the field is**. How often do two randomly chosen different people share a surname? For a common surname population, perhaps 0.01. For a date of birth, around 1 in 2,000. For gender, 0.5 — two random people agree half the time."]
    ] },

    { t: "p", text: "The ratio of the two is the evidence. If agreement is 90 times more likely among matches than among non-matches, observing agreement multiplies the odds of a match by 90 — which is Bayes' rule, and taking logarithms turns the multiplication into addition so field evidence can be summed." },

    { t: "math", tex: "w_{\\text{agree}} = \\log_2 \\frac{m}{u} \\qquad w_{\\text{disagree}} = \\log_2 \\frac{1-m}{1-u}" },

    { t: "h2", n: "02", text: "The weights, computed", id: "weights" },

    {"kind": "trace", "title": "The two patterns most hand-built scorers rank backwards", "caption": "**A changed surname confirmed by birth date and postcode scores +15.49. Both names matching with no birth date scores +6.23.** Names feel more identifying than they are: two different people sharing a common name is an ordinary occurrence, while two random people sharing a date of birth and a postcode is not. The first case is a woman who married; the second is a coincidence a scorer should hesitate over — which is exactly where the middle band in section 05 is for.", "left": "agreement pattern", "codeW": 190, "vars": ["score", "reading"], "steps": [{"code": "all five agree", "state": ["+33.41", "link it"], "tone": "good"}, {"code": "all but gender", "state": ["+27.79", "still a clear match"], "changed": [0, 1], "tone": "good"}, {"code": "dob + postcode, neither name", "state": ["+15.49", "a changed surname - still strong"], "changed": [0, 1], "tone": "violet"}, {"code": "both names, no dob", "state": ["+6.23", "MARGINAL - a common name"], "changed": [0, 1], "tone": "warn"}, {"code": "only gender agrees", "state": ["-11.69", "not a match"], "changed": [0, 1], "tone": "crit"}], "t": "diagram", "id": "dg-8_6-02-1"},

    {"kind": "trace", "title": "Agreeing on a birth date is worth eleven bits; on gender, one", "caption": "**It is all in `u`.** Two random people almost never share a date of birth, so `u` is 0.0005 and agreement is worth +10.89 bits; they agree on gender half the time, so `u` is 0.5 and agreement is worth +0.97. **Now read the gender row across:** +0.97 for agreement and −4.64 for disagreement, because matching pairs disagree only 2% of the time. A reliably recorded low-cardinality field is nearly useless for confirming a match and excellent for ruling one out — and one hand-tuned weight per field cannot say that.", "left": "field", "codeW": 130, "vars": ["m", "u", "agree", "disagree"], "steps": [{"code": "dob", "state": ["0.95", "0.0005", "+10.89", "-4.32"], "tone": "violet"}, {"code": "postcode", "state": ["0.80", "0.0010", "+9.64", "-2.32"], "changed": [0, 1, 2, 3], "tone": "good"}, {"code": "surname", "state": ["0.90", "0.0100", "+6.49", "-3.31"], "changed": [0, 1, 2, 3], "tone": "good"}, {"code": "forename", "state": ["0.85", "0.0200", "+5.41", "-2.71"], "changed": [0, 1, 2, 3], "tone": "accent"}, {"code": "gender", "state": ["0.98", "0.5000", "+0.97", "-4.64"], "changed": [1, 2, 3], "tone": "crit"}], "t": "diagram", "id": "dg-8_6-02-0"},



    { t: "code", lang: "python", title: "five fields, and what each one is worth",
      code: `import math

# m = P(agree | match), u = P(agree | non-match)
FIELDS = {
    "surname":  (0.90, 0.010),
    "forename": (0.85, 0.020),
    "dob":      (0.95, 0.0005),
    "postcode": (0.80, 0.001),
    "gender":   (0.98, 0.500),
}

print("field       m       u      agree weight   disagree weight")
for f, (m, u) in FIELDS.items():
    print("  %-9s %.4f  %.4f      %+7.2f          %+7.2f"
          % (f, m, u, math.log2(m / u), math.log2((1 - m) / (1 - u))))`,
      out: `field       m       u      agree weight   disagree weight
  surname   0.9000  0.0100        +6.49            -3.31
  forename  0.8500  0.0200        +5.41            -2.71
  dob       0.9500  0.0005       +10.89            -4.32
  postcode  0.8000  0.0010        +9.64            -2.32
  gender    0.9800  0.5000        +0.97            -4.64`,
      caption: "**Read the gender row against the dob row — that contrast is the whole model.** Agreeing on date of birth is worth +10.89 bits because `u` is tiny: two random people almost never share one. Agreeing on gender is worth +0.97 because `u` is 0.5, so agreement is nearly uninformative." },

    { t: "callout", kind: "insight", title: "Gender disagreement is worth four times what agreement is",
      body: [
        { t: "p", text: "The gender row is **+0.97 for agreement and −4.64 for disagreement**, and the asymmetry is not a quirk — it falls out of the formula. Agreement is weak evidence because half of all non-matching pairs agree anyway. Disagreement is strong evidence because matching pairs almost never disagree: `m` is 0.98, so a disagreement is a 2% event among true matches and a 50% event among non-matches." },
        { t: "p", text: "**That is the thing a hand-tuned weighted average structurally cannot express**, because a single weight per field forces agreement and disagreement to be mirror images. A low-cardinality field that is reliably recorded is almost useless for confirming a match and excellent for ruling one out, and the model gets that right without being told." }
      ] },

    { t: "code", lang: "python", title: "whole agreement patterns",
      code: `def score(pattern):
    """pattern: field -> True if the pair agrees on it."""
    total = 0.0
    for f, agrees in pattern.items():
        m, u = FIELDS[f]
        total += math.log2(m / u) if agrees else math.log2((1 - m) / (1 - u))
    return total

cases = [
    ("all five agree",       dict.fromkeys(FIELDS, True)),
    ("all but gender",       {**dict.fromkeys(FIELDS, True), "gender": False}),
    ("only gender agrees",   {**dict.fromkeys(FIELDS, False), "gender": True}),
    ("dob + postcode only",  {"surname": False, "forename": False, "dob": True,
                              "postcode": True, "gender": True}),
    ("names only, no dob",   {"surname": True, "forename": True, "dob": False,
                              "postcode": False, "gender": True}),
]
for name, pat in cases:
    print("  %-22s %+8.2f bits" % (name, score(pat)))`,
      out: `  all five agree          +33.41 bits
  all but gender          +27.79 bits
  only gender agrees      -11.69 bits
  dob + postcode only     +15.49 bits
  names only, no dob       +6.23 bits`,
      caption: "**The last two rows are where the model earns its keep.** A pair agreeing on date of birth and postcode but on neither name scores +15.49 — strong, and the reading is that a woman who married and changed her surname is still the same person. A pair agreeing on both names but not the date of birth scores +6.23, which is *marginal*: two different people with the same common name is an ordinary occurrence." },

    { t: "p", text: "That the second case scores lower than the first is a result most hand-built scorers get backwards, because names feel more identifying than they are." },

    { t: "h2", n: "03", text: "Blocking: the quadratic problem", id: "blocking" },

    {"kind": "trace", "title": "Five billion pairs, cut to 0.039% of the work", "caption": "**A hundred thousand records is five billion pairs, and a hundred thousand is a small dataset** — so blocking is not an optimisation, it is what makes record linkage possible. **But every row buys that reduction with recall:** a true match whose records disagree on the blocking key is never generated as a candidate, and no amount of downstream scoring recovers it. Those are also the dirtiest records, which is why production pipelines run several passes on different keys and union the candidates rather than choosing the best key.", "left": "strategy", "codeW": 190, "vars": ["pairs compared", "share of all", "what it misses"], "steps": [{"code": "every pair", "state": ["4,999,950,000", "100%", "nothing - and never finishes"], "tone": "crit"}, {"code": "block on postcode", "state": ["1,950,000", "0.0390%", "any postcode typo"], "changed": [0, 1, 2], "tone": "good"}, {"code": "block on surname", "state": ["950,000", "0.0190%", "any name change"], "changed": [0, 1, 2], "tone": "good"}, {"code": "sorted neighbourhood, w=10", "state": ["900,000", "0.0180%", "a FIRST-letter typo"], "changed": [0, 1, 2], "tone": "accent"}, {"code": "three passes, unioned", "state": ["the sum of them", "still under 0.1%", "only what fails EVERY key"], "changed": [0, 1, 2], "tone": "violet"}], "t": "diagram", "id": "dg-8_6-03-2"},


    { t: "p", text: "Everything above costs nothing until you ask how many pairs there are. **Comparing every record with every other is quadratic**, and quadratic is not a performance concern at this scale — it is an impossibility." },

    { t: "code", lang: "python", title: "the arithmetic that forces the design",
      code: `n = 100_000
pairs = n * (n - 1) // 2
print("records   : %d" % n)
print("all pairs : %d" % pairs)

for name, blocks, per in [("block on postcode", 2500, 40),
                          ("block on surname", 5000, 20)]:
    bp = blocks * (per * (per - 1) // 2)
    print("  %-22s %10d pairs   %.4f%% of all" % (name, bp, 100.0 * bp / pairs))

sn = n * 9                      # sorted neighbourhood, window of 10, one pass
print("  %-22s %10d pairs   %.4f%% of all" % ("sorted neighbourhood", sn, 100.0 * sn / pairs))`,
      out: `records   : 100000
all pairs : 4999950000
  block on postcode         1950000 pairs   0.0390% of all
  block on surname           950000 pairs   0.0190% of all
  sorted neighbourhood       900000 pairs   0.0180% of all`,
      caption: "**A hundred thousand records is five billion pairs** — and a hundred thousand is a small dataset. Blocking on postcode brings it to 1.95 million, which is 0.039% of the work and finishes in seconds. The scale of that reduction is why blocking is not an optimisation but the thing that makes record linkage possible at all." },

    { t: "p", text: "**Blocking** means only comparing records that share a blocking key — the same postcode, the same surname, the same first three characters of a name. The cost is the obvious one: any true match whose records disagree on the blocking key is never compared, and therefore never found. A typo in the postcode and the pair does not exist as far as the pipeline is concerned." },

    { t: "dl", items: [
      ["Standard blocking", "Group by an exact key. Simple, trivially parallel, and brittle in exactly the places your data is dirty — which is the place you most need the match."],
      ["Multiple passes", "Run the whole comparison several times with different keys — once on postcode, once on surname, once on date of birth — and union the candidate pairs. A pair is missed only if it disagrees on *every* key, which is far less likely than disagreeing on one. **This is the practical answer, and it is why production pipelines run several passes rather than choosing the best key.**"],
      ["Phonetic or truncated keys", "Block on a Soundex or Metaphone code, or on the first four characters of a surname. Tolerates the typo class that defeats exact blocking, at the price of larger blocks."],
      ["Sorted neighbourhood", "Sort all records by a composite key, slide a fixed window down the sorted order, and compare only within the window. See below — it is the one to reach for when no exact key is trustworthy."]
    ] },

    { t: "h2", n: "04", text: "Sorted neighbourhood", id: "sorted" },

    {"kind": "flow", "title": "Equality replaced by adjacency - and the one thing it still cannot survive", "caption": "**Sorted neighbourhood is linear rather than quadratic** — n times (w−1), which was 900,000 comparisons against five billion — and the window size is a single dial trading recall for cost rather than a key-design problem. **But sorting is lexicographic**, so a difference in the first character of the key moves a record arbitrarily far away in the order, and a first-letter typo defeats the method exactly as it defeats exact blocking. Several passes with different field orderings is the answer, and it composes with standard blocking rather than replacing it.", "cols": 3, "nodes": [{"id": "k", "label": "Build a composite key", "sub": "most reliable field first", "tone": "accent"}, {"id": "s", "label": "Sort the whole file by it", "sub": "similar records land adjacent", "tone": "good"}, {"id": "w", "label": "Slide a window of w", "sub": "compare only within it", "tone": "good"}, {"id": "c", "label": "Cost is linear: n x (w-1)", "sub": "900,000, not 5 billion", "tone": "violet"}, {"id": "t", "label": "A first-letter typo still vanishes", "sub": "lexicographic order is unforgiving", "tone": "crit"}, {"id": "p", "label": "So run several key orderings", "sub": "and union the candidates", "tone": "violet"}], "edges": [["k", "s"], ["s", "w"], ["w", "c"], ["w", "t"], ["t", "p"]], "t": "diagram", "id": "dg-8_6-04-6"},

    { t: "p", text: "The structural weakness of exact blocking is that it is all-or-nothing: either two records share the key or they are never compared. **Sorted neighbourhood replaces equality with adjacency.** Build a key, sort the whole file by it, then slide a window of fixed size `w` down the sorted order and compare each record only with the others in its window." },

    { t: "code", lang: "python", title: "one pass, one window",
      code: `def sorted_neighbourhood(records, key, w=10):
    """Yield candidate pairs within a sliding window over the sorted order."""
    ordered = sorted(records, key=key)
    for i in range(len(ordered)):
        for j in range(i + 1, min(i + w, len(ordered))):
            yield ordered[i], ordered[j]

# A key that puts similar records next to each other. The leading characters
# matter most, because sorting is lexicographic -- so put the most reliable
# field first.
def key(r):
    return (r["surname"][:4].lower(), r["postcode"][:3].lower(), r["forename"][:2].lower())`,
      caption: "Two properties make this attractive: the cost is **linear** in the number of records — n times (w−1) comparisons, 900,000 on the hundred thousand above — and the window size is a single dial trading recall against cost, rather than a key design problem." },

    { t: "callout", kind: "trap", title: "The first characters of the key decide everything",
      body: [
        { t: "p", text: "Sorting is lexicographic, so a difference in the first character of the key moves a record arbitrarily far away in the sorted order. **A typo in the first letter of a surname defeats sorted neighbourhood completely**, exactly as it defeats exact blocking — the method is only tolerant of differences *after* the leading characters." },
        { t: "p", text: "The standard response is **several passes with different key orderings**: surname first in one pass, postcode first in another, date of birth first in a third, and union the candidates. A pair now has to be unlucky in every ordering to be missed. That is the same multi-pass argument as for standard blocking, and the two techniques combine rather than compete." }
      ] },

    { t: "h2", n: "05", text: "Two thresholds, not one", id: "thresholds" },

    {"kind": "flow", "title": "Three regions, because for some scores the evidence genuinely does not settle it", "caption": "**Collapsing to a single threshold does not remove the uncertain pairs — it only stops you knowing which they were**, since each is silently assigned to whichever side of the line it fell on. **And which error to prefer is a property of the application, not the model:** merging two patients' records is a clinical safety incident, so healthcare linkage sets a high upper threshold and staffs a large queue; a duplicate mailing is an annoyance, so marketing deduplication reverses the trade. Decide that before tuning anything.", "cols": 3, "nodes": [{"id": "s", "label": "The match weight, in bits", "sub": "summed over the fields", "tone": "accent"}, {"id": "m", "label": "Above the upper threshold: link", "sub": "risk: two people merged into one", "tone": "good"}, {"id": "p", "label": "Between: send to a human", "sub": "size this band to your review capacity", "tone": "violet"}, {"id": "n", "label": "Below the lower: do not link", "sub": "risk: a duplicate survives", "tone": "good"}, {"id": "a", "label": "Which risk is worse is the application's", "sub": "patients, or a mailing list", "tone": "crit"}], "edges": [["s", "m"], ["s", "p"], ["s", "n"], ["m", "a"], ["n", "a"]], "t": "diagram", "id": "dg-8_6-05-3"},


    { t: "p", text: "Fellegi and Sunter's other contribution is the part most reimplementations drop. **The output of the scoring is not a decision — it is a score that falls into one of three regions**, because for a band of scores in the middle the evidence genuinely does not settle the question." },

    { t: "table",
      head: ["Region", "Score", "Decision", "What it costs"],
      rows: [
        ["Match", "above the upper threshold", "Link automatically", "False positives: two people merged into one record"],
        ["Possible match", "between the thresholds", "**Send to a human**", "Review time, which is a real budget"],
        ["Non-match", "below the lower threshold", "Do not link", "False negatives: a duplicate survives"]
      ] },

    { t: "p", text: "The two thresholds are set from the error rates you are willing to accept rather than picked by eye, and the band between them is sized by how much review capacity exists. **Collapsing to a single threshold does not remove the uncertain pairs; it only stops you knowing which they were** — they get silently assigned to whichever side of the line they fell on, which is the worst available handling of the cases you most needed to look at." },

    { t: "callout", kind: "insight", title: "The asymmetry decides which errors to prefer",
      body: [
        { t: "p", text: "The two error types are almost never equally bad, and which one is worse is a property of the application rather than of the model. **Merging two different patients' records is a clinical safety incident**; leaving a duplicate is an annoyance, so healthcare linkage sets a high upper threshold and accepts a large review queue. **In marketing deduplication the asymmetry reverses** — a missed duplicate means mailing someone twice, and the review queue costs more than the mistake." },
        { t: "p", text: "Decide that before tuning, because it determines not just the thresholds but the whole shape of the pipeline: whether a review queue needs staffing, and whether an unreviewed pair defaults to linked or unlinked." }
      ] },

    { t: "h2", n: "06", text: "Survivorship: building the golden record", id: "survivorship" },

    {"kind": "tree", "title": "What the merged record says, and how to defend it later", "caption": "**This is the half that reaches the user**, and a pipeline with excellent precision and no survivorship policy produces a record whose address is whichever row was processed first. **The branch most often got wrong is the last one:** a date of birth should not change, so two different ones on records you merged is evidence the match was wrong rather than a field to pick a winner for. And keep per-field lineage with the constituent records — a destructive merge turns a recoverable linkage error into permanent data loss.", "root": {"label": "Two records disagree on a field", "sub": "what does the golden record say?", "tone": "accent", "children": [{"label": "The fact genuinely changes", "sub": "address, phone, employer", "tone": "good", "children": [{"label": "Most recent wins", "sub": "the fact's own date, not the load time", "tone": "good"}]}, {"label": "Several sources saw it independently", "sub": "and you want the consensus", "tone": "accent", "children": [{"label": "Most frequent wins", "sub": "four of five systems agree", "tone": "accent"}]}, {"label": "The sources differ in quality", "sub": "and you know the ranking", "tone": "teal", "children": [{"label": "Most trusted source wins", "sub": "a written ranking - a governance artefact", "tone": "teal"}]}, {"label": "The field should not change at all", "sub": "a date of birth", "tone": "crit", "children": [{"label": "Keep both and flag it", "sub": "the MATCH may be wrong", "tone": "crit"}]}]}, "t": "diagram", "id": "dg-8_6-06-4"},


    { t: "p", text: "Deciding two records refer to the same entity is half the job. **The other half is deciding what the merged record says**, and it is the half that reaches the user — a linkage pipeline with excellent precision and no survivorship policy produces a record whose address is whichever row happened to be processed first." },

    { t: "dl", items: [
      ["Most recent wins", "Right for anything that genuinely changes: address, phone, employer, marital status. Requires a trustworthy timestamp, and the trap is using the row's load time rather than the fact's own date."],
      ["Most frequent wins", "Right where several sources observed the same fact independently and you want the consensus — a date of birth appearing in four of five systems is probably the true one."],
      ["Most trusted source wins", "Right where sources differ in quality and you know the ranking: a verified identity document beats a self-service form, whatever the dates say. This needs an explicit, written source ranking, which is a governance artefact rather than a code change."],
      ["Longest or most complete wins", "A crude but effective tiebreak for free-text fields — a fuller address is usually the better one, and “Flat 2, 14 Mill Road” beats “14 Mill Rd”."],
      ["Keep both, and flag it", "The correct answer for a conflict that matters and cannot be resolved by rule. Two different dates of birth on records you merged is a signal the match may be wrong, not a field to pick a winner for."]
    ] },

    { t: "callout", kind: "good", title: "Keep the lineage, because the merge will be questioned",
      body: [
        { t: "p", text: "Store, per field in the golden record, **which source record supplied the value and which rule chose it** — and keep the constituent records rather than deleting them. Three things make this non-negotiable in practice. A merge will eventually be wrong and will have to be unmerged, which is impossible if the inputs are gone. Someone will ask why the address is what it is, and *“most recent wins, from CRM row 48213”* is an answer. And a regulator or a subject-access request asks what you hold and where it came from." },
        { t: "p", text: "The failure to avoid is a destructive merge that overwrites the sources, because it converts a recoverable linkage error into permanent data loss." }
      ] },

    { t: "callout", kind: "tradeoff", title: "Fellegi-Sunter, or a trained classifier?",
      body: [
        { t: "p", text: "A gradient-boosted model on the same field-comparison features will usually beat hand-set m and u values on precision and recall, if you have labelled pairs — and labelled pairs are the hard part, because labelling requires the manual review the model is meant to replace. **The probabilistic model's advantages are that it needs no labels, that the m and u values can be estimated unsupervised with expectation-maximisation, and that every decision decomposes into per-field bits you can put in front of a reviewer.**" },
        { t: "p", text: "That last property is why regulated linkage is still done this way. *“This pair scored 15.49 bits: +10.89 from the date of birth, +9.64 from the postcode, −3.31 for the surname disagreement”* is auditable in a way a tree ensemble's feature attribution is not, and the reviewer sitting in the middle band needs exactly that breakdown to do their job." }
      ] },

    { t: "exercise", kind: "practice", title: "Build the pipeline end to end", difficulty: "advanced", minutes: 34,
      prompt: "Generate 5,000 synthetic person records with a known 5% duplicate rate, corrupting duplicates with realistic damage: typos, a changed surname, a transposed date of birth, a missing postcode. Then (1) compute all pairs and record the time; (2) block on postcode and measure both the speedup and the true matches lost; (3) run three blocking passes and union them, and measure recall again; (4) score the candidate pairs with Fellegi-Sunter weights; (5) plot the score distribution and set two thresholds, reporting how many pairs land in the middle band; (6) write survivorship rules and produce golden records. Report precision and recall at each stage.",
      hints: [
        "Corrupt the blocking key specifically in some duplicates — that is the failure you are trying to measure.",
        "The score distribution should be visibly bimodal, and the middle band is the overlap.",
        "Recall is the metric blocking damages; precision is the metric thresholds control."
      ],
      solution: {
        notes: [
          { t: "p", text: "Step 2 is the one worth dwelling on, because the lost matches are not random — they are precisely the records whose postcode was corrupted, which are also the dirtiest records and often the ones a human would most want to see. Single-key blocking has a recall ceiling set by the error rate in that one field, and no amount of downstream scoring recovers a pair that was never generated as a candidate." },
          { t: "p", text: "Step 3 is where the multi-pass argument stops being theory: unioning three passes typically recovers most of what any single pass lost, because a record has to be corrupted in all three keys to vanish. The candidate count rises, and that is the trade — blocking recall is bought with comparison budget." },
          { t: "p", text: "In step 5 the bimodality is the thing to look at. Two clear peaks with a thin middle means the fields are discriminating and the thresholds can be close together; a broad overlap means the middle band will be large and someone has to staff it. That shape is the honest input to the question of whether this pipeline can run with the review capacity you actually have." }
        ]
      } }

  ],

  takeaways: [
    "**Fellegi-Sunter replaces hand-tuned weights with two estimable probabilities per field:** `m` is P(agree | match), a data-quality question, and `u` is P(agree | non-match), a discriminativeness question.",
    "**The weight is log₂(m/u) for agreement and log₂((1−m)/(1−u)) for disagreement**, so evidence is in bits and field evidence adds.",
    "**Date of birth agreement is worth +10.89 bits and gender agreement +0.97**, because `u` is 0.0005 against 0.5 — agreement on a low-cardinality field is nearly uninformative.",
    "**Gender disagreement is worth −4.64**, four times what its agreement is worth. A reliably recorded low-cardinality field is weak for confirming a match and strong for ruling one out.",
    "**A hand-tuned weighted average cannot express that asymmetry**, because one weight per field forces agreement and disagreement to be mirror images.",
    "**Agreeing on date of birth and postcode (+15.49) beats agreeing on both names (+6.23)** — names feel more identifying than they are, and this is the result hand-built scorers get backwards.",
    "**A hundred thousand records is five billion pairs.** Blocking on postcode cuts that to 1.95 million, 0.039% of the work — not an optimisation but what makes linkage possible.",
    "**Blocking's cost is recall:** a true match that disagrees on the blocking key is never compared and never found, and those are the dirtiest records.",
    "**Run several passes with different keys and union the candidates.** A pair is then missed only if it is corrupted in every key.",
    "**Sorted neighbourhood replaces equality with adjacency** — sort by a composite key, slide a window of `w`, and the cost is linear: 900,000 comparisons rather than five billion.",
    "**Its weakness is the leading characters of the key**, since sorting is lexicographic — so a first-letter typo defeats it, and multiple key orderings are the answer.",
    "**Use two thresholds, not one.** Above the upper, link; below the lower, do not; in between, send to a human — collapsing to one threshold does not remove the uncertain pairs, it only hides which ones they were.",
    "**Which error is worse is a property of the application:** merging two patients is a safety incident, while a duplicate mailing is an annoyance — and that asymmetry sets the thresholds and decides whether a review queue needs staffing.",
    "**Survivorship rules decide what the merged record says:** most recent, most frequent, most trusted source, most complete, or keep both and flag the conflict.",
    "**Keep per-field lineage and the constituent records.** A merge will eventually be wrong and need undoing, and a destructive merge turns a linkage error into permanent data loss.",
    "**The probabilistic model needs no labels and decomposes into per-field bits**, which is why regulated linkage still uses it over a classifier that would score better."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Two records agree on gender. With m = 0.98 and u = 0.50, the agreement weight is +0.97 bits. Why so little?",
        options: [
          "Because gender is recorded unreliably",
          "Because `u` is 0.5 — half of all non-matching pairs agree on gender too, so agreement barely shifts the odds",
          "Because the weight formula understates binary fields",
          "Because m is too close to 1"
        ],
        answer: 1,
        why: "The weight is log₂(m/u), and a `u` of 0.5 means agreement is only about twice as likely among matches as among non-matches. The same field's *disagreement* weight is −4.64, because matching pairs disagree only 2% of the time — so the field is weak evidence for a match and strong evidence against one."
      },
      {
        stem: "A pair agrees on both names but not the date of birth (+6.23 bits), while another agrees on date of birth and postcode but on neither name (+15.49 bits). What explains the ordering?",
        options: [
          "The weights were set incorrectly — names should dominate",
          "Names are far less discriminating than they feel: many different people share a common name, while two random people almost never share a date of birth and postcode",
          "Date of birth is weighted higher by convention",
          "The second pair agrees on more fields"
        ],
        answer: 1,
        why: "It is driven entirely by `u`. The second case is also the one that matches reality — a changed surname after marriage, with identity confirmed by date of birth and address — which a name-weighted scorer would reject."
      },
      {
        stem: "A linkage pipeline blocks on postcode and recall is disappointing. What is the most likely cause and the standard fix?",
        options: [
          "The thresholds are too high — lower them",
          "True matches whose postcode differs are never generated as candidates, so no downstream scoring can find them. Run additional passes on different keys and union the candidates",
          "The m and u estimates are wrong",
          "The window size is too small"
        ],
        answer: 1,
        why: "Blocking sets a hard recall ceiling before scoring begins, and the lost pairs are exactly the records with corrupted postcodes — the dirtiest ones. Thresholds control precision among candidates that exist; they cannot recover a pair that was never compared."
      },
      {
        stem: "Why is sorted-neighbourhood blocking still defeated by a typo in the first letter of a surname?",
        options: [
          "Because the window is too small by default",
          "Because sorting is lexicographic, so a difference in the leading characters places the record arbitrarily far away in the sorted order and outside any window",
          "Because it only works on numeric keys",
          "Because it requires an exact key like standard blocking"
        ],
        answer: 1,
        why: "It tolerates differences after the leading characters, which is a real improvement over exact blocking but not a general one. Several passes with different field orderings in the key is the usual response, and it composes with standard blocking rather than replacing it."
      },
      {
        stem: "What is lost by collapsing Fellegi-Sunter's three regions into a single threshold?",
        options: [
          "Nothing — a single threshold is equivalent and simpler",
          "The uncertain pairs do not disappear; they are silently assigned to whichever side they fell on, so the cases most needing review are the ones nobody sees",
          "The ability to compute match weights",
          "The blocking step becomes mandatory"
        ],
        answer: 1,
        why: "The middle band exists because for those scores the evidence genuinely does not settle the question. Sizing that band against actual review capacity, and deciding whether an unreviewed pair defaults to linked or unlinked, is a design decision a single threshold makes invisibly."
      },
      {
        stem: "Two merged records carry different dates of birth. What is the right survivorship rule?",
        options: [
          "Most recent wins",
          "Keep both and flag the conflict — a date of birth should not change, so a disagreement is evidence the match itself may be wrong",
          "Most complete wins",
          "Pick the one from the first-loaded source"
        ],
        answer: 1,
        why: "Most-recent-wins is right for facts that genuinely change, like an address. A conflict in an immutable field is a signal about the linkage rather than a field to pick a winner for, and silently choosing one hides a possible false positive."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "advanced",
        q: "Explain Fellegi-Sunter.",
        strong: "It is a probabilistic record-linkage model. For each comparison field you estimate m, the probability the fields agree given the pair is a match, and u, the probability they agree given it is not. The agreement weight is log₂(m/u) and the disagreement weight log₂((1−m)/(1−u)), so evidence is in bits and adds across fields. Two thresholds then split the score into match, possible match for human review, and non-match.",
        answer: [
          { t: "p", text: "Getting m and u the right way round, and naming what each one is a question about, is what the question is testing — data quality against discriminativeness." },
          { t: "p", text: "The example that demonstrates understanding is the low-cardinality field: gender agreement is worth about +1 bit and gender disagreement about −4.6, and a single hand-tuned weight per field cannot represent that." },
          { t: "p", text: "Mentioning the three regions rather than one threshold is the detail most answers miss, and it is the part with operational consequences — it decides whether the system needs a staffed review queue." }
        ]
      },
      {
        level: "advanced",
        q: "How would you deduplicate ten million customer records?",
        strong: "Blocking first, because ten million records is fifty trillion pairs. Several passes on different keys — postcode, surname, date of birth — unioned, so a pair is missed only if corrupted in every key, with sorted neighbourhood where no key is trustworthy. Then Fellegi-Sunter scoring on the candidates, two thresholds, a review queue for the middle, and survivorship rules with per-field lineage for the merge.",
        answer: [
          { t: "p", text: "Leading with the pair count is the right instinct: it is the fact that determines the architecture, and a candidate who starts with the similarity metric has not noticed the problem." },
          { t: "p", text: "Saying that blocking sets a recall ceiling before any scoring happens — and that multiple passes are how you raise it — distinguishes someone who has run such a pipeline from someone who has read about one." },
          { t: "p", text: "The strongest answers finish on survivorship and lineage, because the merge is what reaches the user and an undoable merge is what makes a linkage error recoverable. Asking which error is worse for this business, before choosing thresholds, is the senior move." }
        ]
      },
      {
        level: "advanced",
        q: "Why not just train a classifier on the field comparisons?",
        strong: "You generally would if you had labelled pairs, and it would probably score better. The difficulty is that labels come from the manual review the model is supposed to replace. Fellegi-Sunter needs none — m and u can be estimated unsupervised with EM — and every score decomposes into per-field bits, which is what an auditor and the reviewer in the middle band both need.",
        answer: [
          { t: "p", text: "Conceding that the classifier would win on the metrics is what makes the rest credible; defending the older method on accuracy would be the weaker answer." },
          { t: "p", text: "The labelling circularity is the real argument and it generalises well beyond linkage — a supervised replacement for a manual process needs the manual process to produce its training data." },
          { t: "p", text: "The explainability point lands best when made concretely: a reviewer can act on *“+10.89 from the date of birth, −3.31 for the surname”* in a way that a feature-importance plot does not support." }
        ]
      }
    ]
  }
});
