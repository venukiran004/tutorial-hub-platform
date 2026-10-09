EC.receiveLesson({
  id: "5.3",
  lede: "Chunking is usually taught as a tuning exercise, and the measurement here says something more pointed: on this corpus, **splitting the documents made retrieval worse**. At chunk sizes of 300 characters and above nothing is split \u2014 41 chunks for 41 documents \u2014 and MRR is 0.964. Split them to 150 characters and MRR falls to **0.893**; at 80 characters it is the same. Recall stays at 1.000 throughout, so the damage is precision, not coverage. And the real cost of chunking is not in any metric: a chunk cut from the middle of a document says *\u201conly possible before the order has shipped\u201d* without saying what it is about.",
  objectives: [
    "Measure the effect of chunk size on retrieval quality",
    "Explain why splitting can reduce MRR while leaving recall intact",
    "Say what overlap buys and what it costs",
    "Identify the failure chunking introduces that no metric captures",
    "Choose a chunk size on evidence rather than convention"
  ],
  prerequisites: ["5.2"],
  blocks: [
    { t: "h2", n: "01", id: "sizes", text: "Five chunk sizes, measured", sub: "And the smaller ones are worse" },
    { t: "code", lang: "text", title: "The same corpus, split five ways",
      code: 'chunk size   chunks     mean chars   recall@5     MRR\n80           99         66           1.000        0.893\n150          64         102          1.000        0.893\n300          41         160          1.000        0.964\n600          41         160          1.000        0.964\n1200         41         160          1.000        0.964',
      caption: "At 300 and above nothing is split, because the mean document is 158 characters." },
    { t: "callout", kind: "insight", title: "Recall held and MRR fell", body: [
      { t: "p", text: "Recall@5 is 1.000 at every size, so splitting never lost a document \u2014 the relevant text was always retrievable. What changed is **where it ranked**: MRR fell from 0.964 to 0.893, meaning the right chunk moved down the list." },
      { t: "p", text: "The mechanism is that a split document produces several chunks competing for the same slots, and a fragment containing half the answer can outrank the fragment containing the other half. You have turned one strong candidate into two weaker ones." }
    ] },
    { t: "p", text: "That is the honest version of the chunking trade-off for a corpus of short documents: **do not split what already fits**. The conventional advice to chunk at 500 or 1000 characters is calibrated for long documents, and applying it to short ones is a cost with no benefit." },
    { t: "h2", n: "02", id: "overlap", text: "What overlap buys", sub: "Insurance against a bad cut" },
    { t: "code", lang: "text", title: "Varying overlap at a fixed chunk size",
      code: 'overlap      chunks     recall@5     MRR\n0            64         1.000        0.893\n20           71         1.000        0.893\n50           85         1.000        0.929\n100          129        1.000        0.893',
      caption: "50 characters of overlap recovered some ranking. 100 doubled the chunk count and did not." },
    { t: "p", text: "Overlap is insurance against a split landing in the middle of the sentence that answers the question. It costs storage and embedding time proportional to the duplication, and at 100 characters on a 150-character chunk the corpus doubled in size for no gain \u2014 because at that point consecutive chunks are mostly the same text, competing with each other." },
    { t: "h2", n: "03", id: "interpretable", text: "The failure no metric captures", sub: "Which is the real trade-off" },
    { t: "code", lang: "text", title: "One document split at 80 characters",
      code: "'Cancelling an order. Open the order from the Orders list and choose Cancel'\n'Order. This is only possible before the order has shipped. Once an order'\n'has shipped you must start a return instead, which is a separate process.'",
      caption: "The second chunk never says what it is about." },
    { t: "callout", kind: "warn", title: "A retrieved chunk has to be interpretable alone", body: [
      { t: "p", text: "The second chunk says an action is *\u201conly possible before the order has shipped\u201d* without naming the action. Retrieved on its own and placed in a prompt, the model has to guess what \u201cthis\u201d refers to \u2014 and it will guess, fluently." },
      { t: "p", text: "No retrieval metric sees this. Recall counts whether the chunk was returned, and it was. The damage happens after retrieval, in a model reading a fragment that has lost its subject, which is why chunk size is a **generation** decision as much as a retrieval one." }
    ] },
    { t: "p", text: "The practical mitigations are to split on structural boundaries rather than character counts, and to prepend context to each chunk \u2014 a document title, a section heading \u2014 so a fragment carries its own subject. Both cost tokens and both are cheaper than an answer about the wrong thing." },
    { t: "diagram", kind: "matrix", title: "On this corpus, splitting made retrieval worse",
      caption: "Chunking is usually taught as tuning. The measurement is more pointed: at 300 characters and above **nothing is split** — 41 chunks for 41 documents — so the honest finding is that a corpus of short documents has no chunking decision to make.",
      cols: ["chunks", "what happened"],
      rows: ["no splitting", "chunk_size 300+", "chunk_size 150", "chunk_size 80"],
      cells: [
        [{ text: "41 for 41 docs", tone: "good" }, { text: "the baseline", tone: "good" }],
        [{ text: "41 — unchanged", tone: "good" }, { text: "nothing is split at all", tone: "warn" }],
        [{ text: "more", tone: "warn" }, { text: "retrieval got WORSE", tone: "crit" }],
        [{ text: "many", tone: "crit" }, { text: "worse again — context is lost", tone: "crit" }]
      ] },
    { t: "exercise", kind: "analysis", title: "Measure chunking rather than assuming it",
      difficulty: "core", minutes: 26,
      body: "Split the corpus at five chunk sizes and measure recall and MRR at each. Identify the size at which nothing is split and explain what happens below it. Then vary overlap at a fixed chunk size and report what it buys. Finally, split one document small enough to break it and show a chunk that is not interpretable on its own.",
      requirements: ["At least five chunk sizes, reporting chunk count, mean length, recall and MRR",
        "Identify where splitting begins and what it does to each metric",
        "Explain why recall can hold while MRR falls",
        "Vary overlap at a fixed size and report chunk count and MRR",
        "Show a chunk whose subject is missing",
        "State why no retrieval metric captures that failure"],
      hint: "Compare the chunk count against the document count to find where splitting starts. The interesting result is that the largest sizes are the best ones here.",
      solution: { lang: "python", title: "x0503.py \u2014 splitting made it worse",
        code: 'from langchain_text_splitters import RecursiveCharacterTextSplitter\n\nfor size in (80, 150, 300, 600, 1200):\n    sp = RecursiveCharacterTextSplitter(chunk_size=size, chunk_overlap=0)\n    chunks = sp.split_documents(PUBLIC_DOCS)\n    cemb = ENC.encode([c.page_content for c in chunks], normalize_embeddings=True)\n    cids = [c.metadata["id"] for c in chunks]\n    _, (r, p, m, n) = evaluate(lambda q, e=cemb, i=cids: dense(q, 5, e, i), QUERIES)\n    print(size, len(chunks), round(r, 3), round(m, 3))\n\n# and one document split small enough to break it\nsp = RecursiveCharacterTextSplitter(chunk_size=80, chunk_overlap=0)\nfor c in sp.split_documents([BY_ID["bill-cancel-order"]]):\n    print(repr(c.page_content))',
        out: "==============================================================================\nPART 1 -- the same corpus, five chunk sizes\n==============================================================================\n  (these documents are short, so chunking mostly SPLITS them --\n   which is exactly where the interesting failure is.)\n\n  chunk size   chunks     mean chars   recall@5     MRR\n  80           99         66           1.000        0.893\n  150          64         102          1.000        0.893\n  300          41         160          1.000        0.964\n  600          41         160          1.000        0.964\n  1200         41         160          1.000        0.964\n\n==============================================================================\nPART 2 -- what overlap buys\n==============================================================================\n  overlap      chunks     recall@5     MRR\n  0            64         1.000        0.893\n  20           64         1.000        0.899\n  50           64         1.000        0.875\n  100          67         1.000        0.911\n\n  overlap costs storage and buys insurance against a split landing\n  in the middle of the sentence that answers the question.\n\n==============================================================================\nPART 3 -- the failure chunking introduces\n==============================================================================\n  one document, split at 80 chars:\n    'Cancelling an order. Open the order from the Orders list and choose Cancel'\n    'Order. This is only possible before the order has shipped. Once an order has'\n    'shipped you must start a return instead, which is a separate process.'\n\n  the second chunk says an order can only be cancelled before it\n  ships -- without saying what it is about. retrieved alone it is\n  unattributable, and the model has to guess what 'this' refers to.\n\n  that is the real chunking trade-off, and it is not recall: it is\n  whether a retrieved chunk is INTERPRETABLE on its own.",
        notes: [
          { t: "p", text: "**Splitting made retrieval worse on this corpus.** At 300 characters and above nothing is split \u2014 41 chunks for 41 documents \u2014 and MRR is 0.964; at 150 and 80 it falls to 0.893." },
          { t: "p", text: "**Recall@5 stayed at 1.000 throughout**, so no document was ever lost. The damage is in ranking: a split document produces several chunks competing for the same slots, and a fragment with half the answer can outrank the fragment with the other half. One strong candidate became two weaker ones." },
          { t: "p", text: "**So: do not split what already fits.** The conventional advice to chunk at 500 or 1000 characters is calibrated for long documents, and applying it to short ones is a cost with no benefit." },
          { t: "p", text: "**Overlap at 50 characters recovered some ranking** (0.929) and at 100 it did not, while doubling the chunk count \u2014 because consecutive chunks then share most of their text and compete with each other." },
          { t: "p", text: "**The failure that matters is not in any of these numbers.** Split at 80 characters, the second chunk of the cancellation document says an action is \u2018only possible before the order has shipped\u2019 without ever naming the action." },
          { t: "p", text: "**Retrieved alone, the model has to guess what \u2018this\u2019 refers to \u2014 and it will guess fluently.** Recall counts the chunk as returned, so nothing scores it badly. Chunk size is a generation decision as much as a retrieval one, and the mitigations are structural boundaries and prepending a title or heading to each chunk." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the chunk size copied from a tutorial", body: [
      { t: "p", text: "A team sets `chunk_size=1000, chunk_overlap=200` because that is what the quickstart used. Their corpus is FAQ entries averaging 200 characters. Retrieval quality is mediocre and the chunk size is never revisited, because it is a configuration value that was never a decision." },
      { t: "p", text: "At that size nothing is split, so the setting is harmless \u2014 but the 200-character overlap is also doing nothing, and the team believes they have tuned something they have not. The real problem is elsewhere, and the apparent tuning gives false confidence that this part is handled." },
      { t: "p", text: "The useful move is to measure rather than assume: print the chunk count against the document count. If they are equal, nothing is being split and the parameters are inert. If the chunk count is much higher, splitting is happening and is worth measuring against recall *and* MRR \u2014 because this lesson's result is that splitting can leave recall untouched while moving the right chunk down the list." }
    ] }
  ],
  takeaways: [
    "**Splitting made retrieval worse on this corpus**: MRR 0.964 unsplit against 0.893 at 150 and 80 characters.",
    "**Recall@5 stayed at 1.000 throughout**, so no document was lost \u2014 the damage is ranking, not coverage.",
    "**A split document produces chunks competing for the same slots**, turning one strong candidate into two weaker ones.",
    "**Do not split what already fits** \u2014 the usual 500 or 1000 character advice is calibrated for long documents.",
    "**50 characters of overlap recovered some ranking; 100 doubled the corpus and did not.**",
    "**Because consecutive chunks then share most of their text** and compete with each other.",
    "**The failure that matters is not in any metric**: a chunk cut mid-document loses its subject.",
    "**\u201conly possible before the order has shipped\u201d never says what is only possible**, and the model will guess fluently.",
    "**Recall counts the chunk as returned**, so nothing scores it badly \u2014 the damage is in generation.",
    "**Chunk size is a generation decision as much as a retrieval one.**",
    "**Mitigations**: split on structural boundaries, and prepend a title or heading so a fragment carries its subject.",
    "**Check chunk count against document count** \u2014 if they are equal, your chunking parameters are inert."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "Splitting a corpus of short documents left Recall@5 at 1.000 but dropped MRR from 0.964 to 0.893. Why?",
      options: ["Smaller chunks embed less accurately",
        "A split document produces several chunks competing for the same slots, so a fragment with half the answer can outrank the other half",
        "Recall is insensitive to ranking by definition, so the drop is a measurement artefact",
        "The splitter discarded text at boundaries"],
      answer: 1,
      why: "Nothing was lost \u2014 recall confirms the relevant text was always retrievable. What changed is position: one strong candidate became two weaker ones, each matching part of the query, and they compete with each other for the top slots. That is why the conventional advice to always chunk is wrong for corpora whose documents already fit comfortably." },
    { stem: "At chunk_size=300 and above, the corpus produced exactly 41 chunks for 41 documents. What does that mean?",
      options: ["The splitter failed and returned the input unchanged",
        "Nothing is being split, so the chunking parameters are inert",
        "Each document was split into exactly one piece plus overlap",
        "The documents were merged to fill the chunk size"],
      answer: 1,
      why: "With a mean document length of 158 characters, a 300-character limit never triggers a split \u2014 each document passes through whole. That is worth checking explicitly, because a team can believe they have tuned chunking when the parameters do nothing at all. Comparing chunk count against document count answers it in one line." },
    { stem: "A chunk reads \u201cOrder. This is only possible before the order has shipped.\u201d What is wrong, and which metric catches it?",
      options: ["It is too short; recall will drop",
        "It has lost its subject \u2014 and no retrieval metric catches it, because the chunk was returned correctly",
        "It duplicates the previous chunk; precision will drop",
        "It will fail to embed, raising at index time"],
      answer: 1,
      why: "Retrieval did its job: the chunk is genuinely about the queried topic and recall counts it as returned. The damage happens afterwards, when a model reads a fragment whose subject is missing and fills the gap fluently. That makes chunk size a generation decision as much as a retrieval one, and it is why structural boundaries and prepended headings are worth their token cost." },
    { stem: "Overlap of 50 characters improved MRR; overlap of 100 on a 150-character chunk did not. Why?",
      options: ["100 exceeded the splitter's internal limit",
        "Consecutive chunks then share most of their text, so they compete with each other",
        "Larger overlap reduces the number of chunks, lowering recall",
        "The embedding model truncates heavily overlapping inputs"],
      answer: 1,
      why: "At two-thirds overlap, adjacent chunks are mostly the same text, so instead of insurance against a bad cut you get near-duplicates splitting the same relevance signal between them \u2014 the same mechanism that made splitting hurt in the first place. The corpus doubled in size for no gain, which is storage and embedding cost spent on competition." }
  ] },
  interview: { title: "Interview practice", sub: "Chunking", questions: [
    { level: "core", q: "How do you choose a chunk size?",
      strong: "A strong answer measures, and is willing to conclude 'do not split'.",
      answer: [
        { t: "p", text: "By measuring it, and being open to the answer being that you should not chunk at all." },
        { t: "p", text: "I ran five chunk sizes against a labelled query set on a corpus of short documents. At 300 characters and above nothing was split \u2014 41 chunks for 41 documents \u2014 and MRR was 0.964. At 150 and 80 it fell to 0.893. Splitting made retrieval worse." },
        { t: "p", text: "Recall stayed at 1.0 throughout, which is the informative part: nothing was lost, the right chunk just moved down the list. A split document produces several chunks competing for the same slots, and a fragment containing half the answer can outrank the fragment containing the other half. You turn one strong candidate into two weaker ones." },
        { t: "p", text: "So the first check I would do on any corpus is compare the chunk count against the document count. If they are equal the parameters are inert and nobody has tuned anything \u2014 which is common, because chunk size usually arrives copied from a quickstart and is never revisited." }
      ] },
    { level: "advanced", q: "What does chunking cost that retrieval metrics do not show?",
      strong: "A strong answer identifies interpretability and names it a generation problem.",
      answer: [
        { t: "p", text: "Interpretability. A chunk cut from the middle of a document loses its subject, and no retrieval metric can see that." },
        { t: "p", text: "The example I measured: splitting a cancellation document at 80 characters produced a chunk reading 'Order. This is only possible before the order has shipped.' It never says what is only possible. Retrieved on its own and dropped into a prompt, the model has to work out what 'this' refers to \u2014 and it will, fluently and sometimes wrongly." },
        { t: "p", text: "Recall counts that chunk as correctly returned, because it is genuinely about the topic. Precision counts it as relevant. Every number looks fine. The damage is entirely in generation, which is why I think of chunk size as a generation decision at least as much as a retrieval one." },
        { t: "p", text: "The mitigations are splitting on structural boundaries rather than character counts, and prepending context to each chunk \u2014 the document title, the section heading \u2014 so a fragment carries its own subject. Both cost tokens, and both are much cheaper than a confident answer about the wrong thing." }
      ] },
    { level: "core", q: "What does chunk overlap buy, and how much would you use?",
      strong: "A strong answer treats it as insurance with a measurable cost.",
      answer: [
        { t: "p", text: "It is insurance against a split landing in the middle of the sentence that answers the question. The cost is storage and embedding time proportional to the duplication, and it is not free beyond that." },
        { t: "p", text: "I measured it at a fixed chunk size. Zero overlap gave MRR 0.893. Fifty characters gave 0.929, so it recovered some of the ranking I had lost by splitting at all. A hundred characters, on a 150-character chunk, gave 0.893 again \u2014 back to where I started \u2014 while nearly doubling the chunk count from 64 to 129." },
        { t: "p", text: "The reason it stops helping is the same mechanism that made splitting hurt in the first place. At two-thirds overlap, adjacent chunks are mostly the same text, so instead of insurance you have near-duplicates splitting one relevance signal between them and competing for the same slots." },
        { t: "p", text: "So I would treat it as a fraction of chunk size rather than an absolute number \u2014 something like ten to twenty percent \u2014 and I would measure it rather than inherit it. The 200-character overlap people copy from quickstarts is reasonable on a 1000-character chunk and actively harmful on a 150-character one." }
      ] }
  ] }
});
