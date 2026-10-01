EC.receiveLesson({
  id: "5.4",

  lede: "Chunking is the decision with the widest measured consequences in this module and the one made most carelessly \u2014 usually by copying a tutorial\u2019s `chunk_size=1000, overlap=200`. On the shared corpus, chunk size alone moved recall@5 from **100% to 75%**, and switching from fixed-size splitting to structure-aware splitting moved recall@1 from **65% to 85%**. Overlap, which every tutorial insists on, showed **no reliable effect at all** \u2014 its numbers swung non-monotonically in a way that is indistinguishable from noise at this sample size. Three parameters, three completely different kinds of answer.",

  objectives: [
    "Explain why chunk size has an optimum rather than a direction",
    "Choose a chunking strategy from the structure of your documents",
    "Measure a chunking change rather than assuming it helped",
    "Judge whether an observed difference is larger than your evaluation's resolution",
    "Say what chunking cannot fix, and what has to fix it instead"
  ],

  prerequisites: ["5.1", "5.3"],

  blocks: [

    { t: "h2", n: "01", id: "why", text: "Why this is the decision that matters",
      sub: "It is upstream of everything and it is baked into the index" },

    { t: "p", text: "5.1 split a RAG system into two phases on different clocks. Chunking sits at the start of the slow one: the text is cut, each piece is embedded, and from that moment the retriever can only return pieces of that shape. A query-time improvement \u2014 a better metric, a re-ranker, a rewritten query \u2014 reorders what chunking produced. It cannot reassemble a sentence that was cut in half." },

    { t: "p", text: "There is also a representational argument, and it is the one that explains the measurements below. A chunk becomes **one vector**. Everything in that chunk \u2014 every topic, every digression, every code block \u2014 is averaged into a single point in 384-dimensional space. Make the chunk too large and that point represents nothing in particular; make it too small and it represents something true but incomplete." },

    { t: "h2", n: "02", id: "size", text: "Size: an optimum, not a direction",
      sub: "And the collapse at the top is sharper than the one at the bottom" },

    { t: "code", lang: "python", title: "g54.py \u2014 fixed-size chunking, no overlap", code: `for size in (128, 256, 500, 800, 1200, 2000):
    chunks, meta = H.build(H.chunk_fixed, size=size, overlap=0)
    E = enc.encode(chunks, normalize_embeddings=True)
    RANK = np.argsort(-(QV @ E.T), axis=1)`,
      out: `  size         chunks   mean len      r@1      r@3      r@5     r@10   index MB
  128            2811        128      60%      80%      85%      95%       4.32
  256            1409        255      80%     100%     100%     100%       2.16
  500             724        497      80%      85%      95%     100%       1.11
  800             455        790      85%      95%     100%     100%       0.70
  1200            306       1175      85%      95%     100%     100%       0.47
  2000            186       1933      60%      70%      75%      85%       0.29`,
      hl: [3, 7],
      caption: "An inverted U. 256 to 1200 all reach 95\u2013100% at k=5; 128 and 2000 do not." },

    { t: "callout", kind: "insight", title: "Both ends fail, and they fail for opposite reasons",
      body: [
        { t: "p", text: "**At 128 characters** a chunk is a sentence fragment. It embeds cleanly \u2014 the vector genuinely represents that fragment \u2014 but the fragment often does not contain enough of the answer to count, and the context around it has been severed. Recall@1 is 60%, the worst in the sweep." },
        { t: "p", text: "**At 2000 characters** a chunk spans several topics. The embedding averages them, and a vector that is the mean of four subjects is close to nothing in particular. Recall@5 is **75%** \u2014 a quarter of questions fail even with five chances. That is the sharper collapse, and it is the one people walk into, because larger chunks feel safer." },
        { t: "p", text: "The middle is broad and forgiving: anything from 256 to 1200 reaches 95% or better at k=5. So the practical advice is not to find the optimum but to **stay off both edges** \u2014 and the edge that matters is the top one." },
        { t: "p", text: "Note the index size column moving in the opposite direction: 4.32 MB at 128 characters against 0.29 MB at 2000, a factor of 15. The cheapest index is also the worst one here, which is a useful reminder that storage is not the constraint worth optimising." }
      ] },

    { t: "viz", title: "Chunk size against recall and index size", caption: "Recall@5 across the sweep. The broad middle is the working range; the right-hand collapse is the one teams walk into.",
      svg: `<svg viewBox="0 0 760 290" width="100%" role="img" aria-label="Recall at 5 against chunk size">
  <text x="16" y="22" class="s-label">RECALL@5 BY CHUNK SIZE</text>

  <text x="16" y="52" class="s-sub">128</text>
  <rect x="80" y="40" width="340" height="16" rx="3" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.4"/>
  <text x="430" y="52" class="s-mono" style="fill:var(--crit)">85%</text>
  <text x="486" y="52" class="s-sub">fragments \u2014 clean vector, incomplete answer</text>

  <text x="16" y="82" class="s-sub">256</text>
  <rect x="80" y="70" width="400" height="16" rx="3" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="490" y="82" class="s-mono" style="fill:var(--good)">100%</text>

  <text x="16" y="112" class="s-sub">500</text>
  <rect x="80" y="100" width="380" height="16" rx="3" class="s-fill" style="stroke:var(--good)" stroke-width="1.2"/>
  <text x="470" y="112" class="s-mono" style="fill:var(--good)">95%</text>

  <text x="16" y="142" class="s-sub">800</text>
  <rect x="80" y="130" width="400" height="16" rx="3" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="490" y="142" class="s-mono" style="fill:var(--good)">100%</text>

  <text x="16" y="172" class="s-sub">1200</text>
  <rect x="80" y="160" width="400" height="16" rx="3" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="490" y="172" class="s-mono" style="fill:var(--good)">100%</text>

  <text x="16" y="202" class="s-sub">2000</text>
  <rect x="80" y="190" width="300" height="16" rx="3" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.6"/>
  <text x="390" y="202" class="s-mono" style="fill:var(--crit)">75%</text>
  <text x="446" y="202" class="s-sub">several topics averaged into one vector</text>

  <line x1="16" y1="226" x2="744" y2="226" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="250" class="s-mono" style="fill:var(--accent)">index size runs the other way: 4.32 MB at 128 chars, 0.29 MB at 2000 \u2014 15\u00d7</text>
  <text x="16" y="272" class="s-sub">so the cheapest index in this sweep is also the worst; storage is not the constraint to optimise</text>
</svg>` },

    { t: "h2", n: "03", id: "overlap", text: "Overlap: no measurable effect",
      sub: "Which is not the result I expected to report" },

    { t: "code", lang: "python", title: "g54.py \u2014 overlap at a fixed 500-character size", code: `for ov in (0, 25, 50, 100, 200, 250):
    chunks, meta = H.build(H.chunk_fixed, size=500, overlap=ov)`,
      out: `  overlap      chunks      r@1      r@3      r@5     r@10     index MB
  0               724      80%      85%      95%     100%         1.11
  25              762      80%      85%      95%     100%         1.17
  50              804      65%      85%      90%     100%         1.23
  100             904      85%      90%     100%     100%         1.39
  200            1204      70%      90%     100%     100%         1.85
  250            1441      90%      95%      95%     100%         2.21

  at 250 of 500 the index holds 2.0x the chunks of no overlap`,
      hl: [4],
      caption: "Read the r@1 column: 80, 80, 65, 85, 70, 90. That is not a curve, it is noise." },

    { t: "callout", kind: "trap", title: "Twenty questions cannot resolve a five-point effect",
      body: [
        { t: "p", text: "Every question is worth five percentage points in a twenty-question set. So the r@1 column \u2014 80, 80, 65, 85, 70, 90 \u2014 is a swing of **one to five questions**, moving non-monotonically. There is no reading of that as a trend." },
        { t: "p", text: "That is a real finding about the *measurement*, not about overlap. The same evaluation set detected chunk size cleanly, because chunk size moved recall by 25 points, which is five questions moving in the same direction. **The instrument resolves 25-point effects and not 5-point ones.**" },
        { t: "p", text: "Which means the honest statement is: *on this corpus, at this sample size, overlap showed no effect I can distinguish from noise.* Not \u201coverlap does not help\u201d \u2014 I cannot support that \u2014 and not \u201coverlap helps\u201d either, which is what the tutorials assert without evidence." },
        { t: "p", text: "The cost side is measurable and is not noise: 250-character overlap on 500-character chunks **doubles the index**, from 724 chunks to 1,441. So the decision is a known cost against an unmeasured benefit, and a reader who wants to settle it needs a few hundred questions rather than twenty." }
      ] },

    { t: "callout", kind: "note", title: "What overlap is actually for",
      body: [
        { t: "p", text: "The argument for overlap is specific: it stops a fact being severed by a boundary that happens to fall through the middle of it. That is a real failure, and it is *rare* \u2014 it needs the boundary to land inside the one sentence that answers a question." },
        { t: "p", text: "Rare failures need large evaluation sets to detect, which is exactly why this sweep cannot see it. A corpus of long unstructured prose with no natural boundaries is where it would matter most; this corpus is structured markdown, where the recursive and markdown splitters are already cutting at places a human would cut." },
        { t: "p", text: "So I would keep a modest overlap \u2014 10\u201320% is the conventional range and the index cost is proportionate \u2014 on the grounds that the mechanism is sound, while being clear that I have not measured it working." }
      ] },

    { t: "h2", n: "04", id: "strategy", text: "Strategy: the cleanest win in the module",
      sub: "Cut where the document already has seams" },

    { t: "p", text: "Fixed-size splitting cuts every N characters regardless of what is there \u2014 mid-sentence, mid-table, mid-code-block. Recursive splitting tries a list of separators in order, preferring paragraph breaks over line breaks over spaces, so it cuts at the largest natural boundary that fits. Structure-aware splitting goes further and uses the document\u2019s own markup." },

    { t: "code", lang: "python", title: "g54.py \u2014 markdown-aware chunking with heading context", code: `def chunk_markdown(text, size=500, overlap=50):
    parts = re.split(r"\n(?=#{1,4} )", text)          # split at headings
    out = []
    for p in parts:
        head = p.split("\n", 1)[0][:90] if p.startswith("#") else ""
        for c in H.chunk_recursive(p, size=size, overlap=overlap):
            # prepend the section heading so the chunk knows where it came from
            out.append((head + "\n" + c) if head and not c.startswith("#") else c)
    return out`,
      out: `  strategy                     chunks   mean len      r@1      r@3      r@5    doc r@5
  fixed                           804        496      65%      85%      90%       100%
  recursive                      1187        347      75%      90%      95%       100%
  markdown + heading             1241        338      85%      90%     100%       100%`,
      hl: [7],
      caption: "Monotone across all three, at the same nominal size and overlap: 65% \u2192 75% \u2192 85% at k=1." },

    { t: "callout", kind: "insight", title: "Twenty points at k=1 from respecting the document's own structure",
      body: [
        { t: "p", text: "Fixed to recursive is worth 10 points at k=1, and recursive to markdown-aware another 10. Unlike the overlap column this is monotone across three conditions and consistent at k=3 and k=5, which is what a real effect looks like at this sample size." },
        { t: "p", text: "Two mechanisms are at work and they are worth separating. **Cutting at boundaries** keeps a thought intact, so the chunk embeds as one thing rather than as the tail of one idea plus the head of another. **Prepending the heading** gives the chunk words it would not otherwise contain \u2014 a passage under \u201c## Quantization for Inference\u201d now carries those words even if the body never repeats them." },
        { t: "p", text: "That second mechanism is the more interesting one, because it is a form of context injection rather than of better cutting. It is the cheap, deterministic version of what the reference calls *contextual retrieval* \u2014 prepending a generated description of where a chunk came from \u2014 at none of the cost, because the heading is already in the document." },
        { t: "p", text: "The generalisation: **use whatever structure the document already has.** Markdown headings, HTML tags, code function boundaries, legal section numbers. The structure was put there by an author to mark where topics change, which is exactly the judgement a chunker is trying to make." }
      ] },

    { t: "table",
      head: ["Document type", "Chunk on", "Why"],
      rows: [
        ["Markdown / technical docs", "Headings, then recursive within", "Measured here: 85% r@1 against 65% for fixed, and headings carry topic words"],
        ["HTML", "Heading tags, then recursive", "Same argument; the markup is the author's own topic map"],
        ["Source code", "Function and class boundaries", "A function is the natural unit of meaning, and splitting one produces chunks that parse as nothing"],
        ["Long unstructured prose", "Recursive, with overlap", "No seams to use, so boundaries are guesses \u2014 the case where overlap's argument is strongest"],
        ["PDFs / scanned documents", "Layout-aware extraction first", "Chunking is downstream of extraction; a bad text layer makes every later decision moot"],
        ["Tables and records", "Do not chunk \u2014 query them", "5.12 measures this: embeddings are the wrong instrument for structured data"]
      ] },

    { t: "h2", n: "05", id: "cannot", text: "What chunking cannot fix",
      sub: "The failure this module has been carrying since 5.1" },

    { t: "p", text: "One question has failed at every configuration in this sweep: *\u201cWhy divide alpha by r?\u201d*, which 5.1 found at rank 15. The passage that answers it calls the term a **\u201cvolume knob\u201d** and never uses the word \u201cdivide\u201d." },

    { t: "callout", kind: "warn", title: "No chunk boundary makes a metaphor match a literal question",
      body: [
        { t: "p", text: "The answer is intact, correctly cut, in the right document, with its heading attached. Every chunking improvement in this lesson leaves it at a bad rank, because the problem is not where the text was cut \u2014 it is that the question and the answer share no vocabulary and the embedding model does not bridge the metaphor." },
        { t: "p", text: "That is the boundary of what index-time work can do. Fixing it needs query-time machinery: rewriting the question into words closer to the answer (5.8), or a keyword retriever that at least matches *alpha* and *r* exactly (5.9)." },
        { t: "p", text: "Keeping one known-hard question visible through a module is worth doing deliberately. It stops a sweep that improves the easy questions from reading as a solved problem." }
      ] },

    { t: "exercise", kind: "lab", title: "Sweep chunking against your own corpus", difficulty: "core", minutes: 35,
      body: "Using a labelled question set, sweep chunk size, overlap and strategy independently and measure recall at several k. Report index size alongside recall. Then determine which of your observed differences are larger than your evaluation's resolution, and say what you can and cannot conclude from each.",
      requirements: [
        "Vary one parameter at a time, holding the others fixed",
        "Include at least one size below 256 and one above 1500, so both failure modes appear",
        "Compare fixed, recursive and a structure-aware splitter for your document type",
        "Report the index size or chunk count alongside every recall figure",
        "State your evaluation's resolution \u2014 100 divided by the number of questions \u2014 and mark any difference smaller than that as unresolved"
      ],
      hint: "Before interpreting a column, work out what one question is worth. If the column swings by less than two questions and does not move monotonically, you are reading noise.",
      solution: { lang: "python", title: "g54.py \u2014 the three sweeps", code: `def evaluate(chunks, meta, ks=(1, 3, 5, 10)):
    E = enc.encode(chunks, normalize_embeddings=True, batch_size=128)
    RANK = np.argsort(-(QV @ E.T), axis=1)
    return {k: np.mean([H.recall_at_k(RANK[i], chunks, meta, *QS[i], k)
                        for i in range(len(QS))]) for k in ks}, E.nbytes

# size, holding overlap at 0
for size in (128, 256, 500, 800, 1200, 2000):
    chunks, meta = H.build(H.chunk_fixed, size=size, overlap=0)
    print(size, len(chunks), evaluate(chunks, meta))

# overlap, holding size at 500
for ov in (0, 25, 50, 100, 200, 250):
    chunks, meta = H.build(H.chunk_fixed, size=500, overlap=ov)
    print(ov, len(chunks), evaluate(chunks, meta))

# strategy, holding size and overlap fixed
def chunk_markdown(text, size=500, overlap=50):
    parts = re.split(r"\n(?=#{1,4} )", text)
    out = []
    for p in parts:
        head = p.split("\n", 1)[0][:90] if p.startswith("#") else ""
        for c in H.chunk_recursive(p, size=size, overlap=overlap):
            out.append((head + "\n" + c) if head and not c.startswith("#") else c)
    return out

for fn in (H.chunk_fixed, H.chunk_recursive, chunk_markdown):
    chunks, meta = H.build(fn, size=500, overlap=50)
    print(fn.__name__, len(chunks), evaluate(chunks, meta))`,
        out: `  SIZE (overlap 0)
  size         chunks      r@1      r@3      r@5     r@10   index MB
  128            2811      60%      80%      85%      95%       4.32
  256            1409      80%     100%     100%     100%       2.16
  500             724      80%      85%      95%     100%       1.11
  800             455      85%      95%     100%     100%       0.70
  1200            306      85%      95%     100%     100%       0.47
  2000            186      60%      70%      75%      85%       0.29

  OVERLAP (size 500)
  overlap      chunks      r@1      r@3      r@5     index MB
  0               724      80%      85%      95%         1.11
  50              804      65%      85%      90%         1.23
  100             904      85%      90%     100%         1.39
  200            1204      70%      90%     100%         1.85
  250            1441      90%      95%      95%         2.21

  STRATEGY (size 500, overlap 50)
  strategy                     chunks      r@1      r@3      r@5
  fixed                           804      65%      85%      90%
  recursive                      1187      75%      90%      95%
  markdown + heading             1241      85%      90%     100%`,
        notes: [
          { t: "p", text: "**Size is an inverted U and the top edge is the dangerous one.** 256 through 1200 all reach 95\u2013100% at k=5; 128 drops to 85% and 2000 to 75%. Too-small chunks embed cleanly but hold incomplete answers; too-large chunks average several topics into one vector that is close to nothing in particular. Large chunks feel safer, which is why that edge is the one teams walk into." },
          { t: "p", text: "**Strategy is the cleanest win: 65% \u2192 75% \u2192 85% at k=1**, monotone across three conditions and consistent at k=3 and k=5. Two mechanisms \u2014 cutting at real boundaries so a chunk is one thought, and prepending the heading so the chunk carries topic words its body never repeats. The second is a cheap deterministic form of contextual retrieval." },
          { t: "p", text: "**Overlap produced nothing I can interpret.** The r@1 column reads 80, 80, 65, 85, 70, 90 \u2014 a one-to-five-question swing with no monotone trend. With twenty questions each worth five points, this instrument resolves the 25-point size effect and cannot resolve a 5-point overlap effect. The honest conclusion is \u2018unmeasured\u2019, not \u2018ineffective\u2019." },
          { t: "p", text: "**The cost side of overlap is not noise**: 250-character overlap doubles the index, 724 chunks to 1,441. So it is a known cost against an unmeasured benefit, and I would keep a modest 10\u201320% because the mechanism is sound rather than because this sweep supports it." },
          { t: "p", text: "**Index size runs opposite to quality here** \u2014 4.32 MB at the worst-performing 128-character setting against 0.29 MB at the worst-performing 2000. Chunk count is a cost to be aware of and not a thing to optimise; the quality difference across this sweep is worth far more than the storage." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "A chunk becomes one point in space. Ask what that point should mean. A sentence fragment means something true and too small; two thousand characters of four different topics means nothing in particular. Somewhere in between a chunk is one idea, and that is what you are cutting for." },
        { t: "p", text: "And when the author already marked where the ideas change \u2014 a heading, a function, a section number \u2014 use their marks. They were made by someone who knew what the document was about." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cOur RAG system retrieves the right document but the wrong passage. What do you change?\u201d**" },
        { t: "p", text: "That symptom is specific and useful \u2014 it means the search is working and the chunking is not, so I would not touch the embedding model or the index. On my own corpus I track those as two separate numbers for exactly this reason: document recall hit 100% at k=5 while chunk recall was 95%, and that gap is this failure." },
        { t: "p", text: "First I would check the chunk size against both failure modes. Measured on a real corpus, 2000-character chunks dropped recall@5 to 75% because one vector has to represent several topics and ends up close to nothing in particular \u2014 and oversized chunks are the common case, because they feel safer. Anything from 256 to 1200 was fine, so the fix is often just coming down off the top edge." },
        { t: "p", text: "Then the splitter. Moving from fixed-size to recursive to markdown-aware with headings prepended took recall@1 from 65% to 75% to 85% at identical size and overlap. If they are cutting every N characters through the middle of tables and code blocks, that is the cheapest 20 points available." },
        { t: "p", text: "The heading part is worth calling out separately because it is not really chunking \u2014 it is context injection. A passage under \u2018Quantization for Inference\u2019 carries those words even if its body never repeats them, which is the deterministic, free version of what contextual retrieval does with a generated summary per chunk." },
        { t: "p", text: "What I would warn them off is tuning overlap. On my sweep it produced a non-monotonic swing I could not distinguish from noise, while doubling the index at the top of the range \u2014 a known cost against an unmeasured benefit. And I would ask how many questions are in their evaluation set, because with twenty, each one is worth five points and most of the differences people argue about are not resolvable at all." }
      ] }
  ],

  takeaways: [
    "**Chunking is upstream of everything and baked into the index.** Query-time work reorders what chunking produced; it cannot reassemble a severed sentence.",
    "**A chunk becomes one vector**, so everything in it is averaged into a single point \u2014 which is why both too-small and too-large fail, for opposite reasons.",
    "**Size is an inverted U**: 256\u20131200 characters all reached 95\u2013100% recall@5, while 128 dropped to 85% and 2000 to **75%**.",
    "**The top edge is the dangerous one**, because large chunks feel safer and a 2000-character chunk spanning four topics embeds as nothing in particular.",
    "**Strategy was the cleanest win: 65% \u2192 75% \u2192 85% at k=1** across fixed, recursive and markdown-aware splitting at identical size and overlap.",
    "**Prepending the heading is context injection, not chunking** \u2014 the free deterministic version of contextual retrieval, since the structure is already in the document.",
    "**Overlap showed no effect I could distinguish from noise**: r@1 read 80, 80, 65, 85, 70, 90 across the sweep, moving non-monotonically.",
    "**Twenty questions resolve a 25-point effect and not a 5-point one.** Each question is worth five points, so most differences people argue about are below the instrument's resolution.",
    "**Overlap's cost is real even though its benefit is unmeasured** \u2014 250 of 500 doubled the index from 724 chunks to 1,441.",
    "**Chunking cannot fix a vocabulary mismatch.** The one question that failed everywhere asks \u201cwhy divide alpha by r\u201d against a passage calling it a \u201cvolume knob\u201d \u2014 that needs 5.8 or 5.9."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Recall@5 is 100% at a 256-character chunk size and 75% at 2000. Why do large chunks fail?",
        options: [
          "They exceed the embedding model's token limit and get truncated",
          "One vector has to represent several topics at once, so it is close to nothing in particular",
          "Larger chunks produce a smaller index, which reduces search quality",
          "The retrieved context exceeds the model's window"
        ],
        answer: 1,
        why: "A chunk becomes a single point in embedding space, so a 2000-character passage spanning several subjects is averaged into a vector that matches no specific question well. Truncation is a separate real hazard worth checking \u2014 many embedding models cap at 512 tokens \u2014 but the measured collapse here is representational, and it appears gradually rather than at a hard limit. Index size shrinks with larger chunks, which is a cost saving that happens to coincide with the worst quality." },

      { stem: "An overlap sweep gives recall@1 of 80, 80, 65, 85, 70, 90 percent across six settings. What should you conclude?",
        options: [
          "Overlap helps, since the highest value is at the largest overlap",
          "Nothing \u2014 with twenty questions each worth five points, this is a non-monotonic swing indistinguishable from noise",
          "Overlap hurts, since the middle values are lower than the baseline",
          "The evaluation set is broken and should be rebuilt"
        ],
        answer: 1,
        why: "Each question is worth 100/20 = 5 percentage points, so the column swings by one to five questions with no consistent direction. The same instrument measured chunk size cleanly because that effect was 25 points \u2014 five questions moving together. The honest statement is that overlap's effect is unresolved at this sample size, which is different from saying it does not help; settling it needs a few hundred questions. The set is fine, it is simply low-powered." },

      { stem: "Switching from fixed-size to markdown-aware chunking with headings prepended raised recall@1 from 65% to 85%. What are the two mechanisms?",
        options: [
          "Smaller chunks and a larger index",
          "Cutting at real boundaries so a chunk is one coherent thought, and adding heading words the chunk body never contains",
          "Removing code blocks and normalising whitespace",
          "Deduplicating overlapping text across chunks"
        ],
        answer: 1,
        why: "Boundary-respecting cuts mean a chunk embeds as a single idea rather than the tail of one plus the head of another. Separately, prepending the section heading injects topic vocabulary a passage may never repeat \u2014 a chunk under \"Quantization for Inference\" now carries those words. The second mechanism is context injection rather than chunking, and is the free deterministic version of contextual retrieval, which generates a description per chunk at an LLM call each." },

      { stem: "A question fails at every chunk size and strategy tried. The answer is intact in the right document, but the passage uses a metaphor the question does not.",
        options: [
          "Reduce the chunk size further so the metaphor is isolated",
          "This is a vocabulary mismatch that index-time work cannot fix \u2014 it needs query rewriting or keyword retrieval",
          "Increase overlap so the passage appears in more chunks",
          "Re-embed with a higher-dimensional model"
        ],
        answer: 1,
        why: "The text is correctly cut, in the right document, with its heading attached \u2014 nothing about where it was split is wrong. The failure is that the query and the answer share no vocabulary and the embedding model does not bridge the metaphor, which is a query-side problem. Rewriting the question towards the answer's language (5.8) or adding a sparse retriever that matches the literal symbols (5.9) are the fixes. More chunks or dimensions do not create shared vocabulary." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "The parameter everyone copies from a tutorial and nobody measures",
    questions: [
      { level: "core",
        q: "How do you choose a chunk size?",
        strong: "A strong answer knows it is an optimum, names both failure modes, and has measured it.",
        answer: [
          { t: "p", text: "By measuring it on my own corpus, because it is an optimum rather than a direction. On a real 360,000-character corpus I swept 128 to 2000 characters: everything from 256 to 1200 reached 95\u2013100% recall@5, 128 dropped to 85%, and 2000 dropped to 75%." },
          { t: "p", text: "The two edges fail for opposite reasons. Too small and the chunk is a fragment \u2014 the vector is clean but the text does not contain enough of the answer. Too large and the chunk spans several topics, which get averaged into one vector that is close to nothing in particular." },
          { t: "p", text: "The top edge is the one to watch, because bigger chunks feel safer and more complete, so that is the direction people drift. A quarter of my questions failed at 2000 characters even with five chances." },
          { t: "p", text: "The practical advice is therefore not to find the optimum but to stay off both edges \u2014 the middle is broad and forgiving. And I would check the embedding model's token limit separately, since many cap at 512 tokens and will silently truncate anything longer." }
        ] },

      { level: "advanced",
        q: "What chunking strategy would you use, and why?",
        strong: "A strong answer picks from document structure and separates the two mechanisms at work.",
        answer: [
          { t: "p", text: "Whatever structure the document already has. For markdown or technical documentation that means splitting at headings and then recursively within each section \u2014 measured, that took recall@1 from 65% with fixed-size splitting to 75% recursive to 85% markdown-aware, at identical size and overlap, monotone across all three." },
          { t: "p", text: "Two separate things are happening there. Cutting at real boundaries means a chunk is one coherent thought rather than the tail of one idea plus the head of the next, so it embeds as something specific. And prepending the section heading gives the chunk vocabulary its body may never contain \u2014 a passage under \u2018Quantization for Inference\u2019 carries those words regardless." },
          { t: "p", text: "That second mechanism is worth naming because it is not chunking at all, it is context injection. It is the free deterministic version of contextual retrieval, which prepends an LLM-generated description to every chunk \u2014 same idea, no per-chunk model call, because the author already wrote the heading." },
          { t: "p", text: "For code I would split at function and class boundaries, for HTML at heading tags, and for long unstructured prose recursive with overlap \u2014 that last case is where there are no seams to use and boundaries really are guesses, which is where overlap's argument is strongest." }
        ] },

      { level: "advanced",
        q: "How much overlap do you use?",
        strong: "A strong answer is honest that the common advice is not well evidenced, and separates cost from benefit.",
        answer: [
          { t: "p", text: "A modest amount, around 10 to 20%, and I would be straightforward that I am doing it on mechanism rather than on evidence. When I swept it, recall@1 read 80, 80, 65, 85, 70, 90 across six settings \u2014 a non-monotonic swing I could not distinguish from noise." },
          { t: "p", text: "The reason it is hard to measure is that the failure overlap prevents is rare: it needs a chunk boundary to land inside the specific sentence that answers a question. Rare failures need large evaluation sets, and with twenty questions each worth five points, the instrument simply cannot resolve it." },
          { t: "p", text: "The cost side is not noise and is worth stating: 250-character overlap on 500-character chunks doubled my index, 724 chunks to 1,441. So it is a measured cost against an unmeasured benefit, which is a reasonable trade at 10\u201320% and a poor one at 50%." },
          { t: "p", text: "I would also expect it to matter more on long unstructured prose than on structured documents, because a recursive or heading-aware splitter is already cutting where a human would \u2014 so the boundaries are less likely to fall through the middle of anything." }
        ] }
    ]
  }
});
