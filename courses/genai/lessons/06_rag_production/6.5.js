EC.receiveLesson({
  id: "6.5",

  lede: "The reference gives three architectures for retrieving over images and tables, and lists them as options. Measured with CLIP, **the first one does not work as drawn**: every text-to-text cosine in my sample scored above every text-to-image cosine \u2014 minimum 0.7091 against maximum 0.3683, with no overlap at all. In a single store ranked by cosine, no image can ever outrank any text chunk, however relevant the image and irrelevant the text. That is not a quality problem, it is a **scale** problem, and it is the real argument for Option B.",

  objectives: [
    "Name what standard text RAG loses from a document and when that matters",
    "Explain why a unified text-and-image vector store fails on comparability",
    "Apply the summarise-then-embed pattern and retrieve the original rather than the summary",
    "Describe ColPali's late interaction and what it trades for a simpler pipeline",
    "Evaluate retrieval separately per modality"
  ],

  prerequisites: ["5.6", "6.3"],

  blocks: [

    { t: "h2", n: "01", id: "problem", text: "What chunking throws away",
      sub: "The information was never in the text layer" },

    { t: "p", text: "6.3 covered parsing as a quality problem \u2014 a table flattened into a column of orphaned numbers. This lesson is about the cases where there is no text layer to parse badly in the first place: a chart in a scientific paper, a diagram in a technical manual, a scanned filing. Standard text RAG does not degrade on these, it is simply blind to them." },

    { t: "ul", items: [
      "**Tables** in financial reports, papers and regulatory filings \u2014 where the numbers are the content",
      "**Figures and charts** in scientific papers and dashboards \u2014 where the trend is stated nowhere in prose",
      "**Diagrams** in technical manuals and architecture documents \u2014 where the relationships are spatial",
      "**Scanned documents** \u2014 where every page is an image and OCR is the only text layer there is"
    ] },

    { t: "callout", kind: "insight", title: "Tables and images are not one problem",
      body: [
        { t: "p", text: "They get listed together and they behave differently. A table has *recoverable structure*: `infer_table_structure=True` gives you HTML or markdown, and once it is markdown it is text that an ordinary embedding model handles \u2014 so a table is a parsing problem with a text solution." },
        { t: "p", text: "A chart is not. The claim \u201crevenue rose for four quarters\u201d exists only as pixels; there is no extraction that recovers it without something that can *look*. That genuinely requires a vision model, at ingestion or at query time." },
        { t: "p", text: "Worth separating because the cheap fix covers more ground than it appears to. Many \u201cmultimodal RAG\u201d requirements are tables in PDFs, which Unstructured plus markdown conversion solves without any of this lesson\u2019s machinery." }
      ] },

    { t: "h2", n: "02", id: "optiona", text: "Option A, and why it fails",
      sub: "Two embedding spaces in one index, ranked by one number" },

    { t: "p", text: "The reference\u2019s Option A parses documents into text chunks and image chunks, embeds each with the appropriate model \u2014 a text model and CLIP \u2014 and puts both into a unified vector store. One query, one ranked list across both modalities." },

    { t: "p", text: "That requires the two kinds of similarity to be comparable numbers. 5.6 established that cosine is only meaningful within one embedding space; this is the same point with higher stakes, because here the two spaces are produced by two *towers* of one model that were never trained to put text and images at the same distance from each other." },

    { t: "code", lang: "python", title: "g65.py \u2014 embedding rendered charts and text queries with one CLIP", code: `def chart(label, bars, color):
    im = Image.new("RGB", (224, 224), "white")
    d = ImageDraw.Draw(im)
    for i, h in enumerate(bars):
        d.rectangle([20 + i * 40, 200 - h, 50 + i * 40, 200], fill=color)
    d.text((20, 8), label, fill="black")
    return im

IMAGES = [("bar chart, rising",  chart("revenue", [40, 80, 120, 160], "steelblue")),
          ("bar chart, falling", chart("churn",   [160, 120, 80, 40], "firebrick")),
          ("flat chart",         chart("latency", [100, 100, 100, 100], "darkgreen"))]

T = feats(m.get_text_features(**ti))    # 5 text queries, L2-normalised
V = feats(m.get_image_features(**ii))   # 3 rendered charts, L2-normalised`,
      caption: "Both towers of one CLIP model, both outputs L2-normalised, so cosine is just a dot product." },

    { t: "code", lang: "python", title: "g65.py \u00a7A \u2014 the two similarity ranges", code: `TT = T @ T.T ; np.fill_diagonal(TT, np.nan)   # text against text
TV = T @ V.T                                  # text against image`,
      out: `  text-text   cosine: min 0.7091  mean 0.7952  max 0.8694
  text-image  cosine: min 0.1686  mean 0.2668  max 0.3683

  BEST text-image match (0.3683) vs WORST text-text match (0.7091)

  *** EVERY text-text pair scores above EVERY text-image pair. ***
  In one unified store ranked by cosine, no image can ever outrank
  any text chunk -- however relevant the image and irrelevant the text.`,
      hl: [1, 2, 6],
      caption: "The ranges do not overlap. Not \u201coverlap a little\u201d \u2014 the worst text pair beats the best image pair by 0.34." },

    { t: "callout", kind: "trap", title: "This is the modality gap, and it breaks Option A outright",
      body: [
        { t: "p", text: "CLIP\u2019s contrastive objective only ever asks that a matching image\u2013text pair score *higher than* a mismatched one. Nothing in the loss requires matched cross-modal pairs to score as high as similar same-modal pairs, so the two embedding clouds settle into separate cones with a gap between them. It is a documented property of contrastively trained dual encoders, not an artefact of my charts." },
        { t: "p", text: "The consequence for retrieval is categorical rather than gradual. Ranking one list by cosine across both modalities sorts by *modality first* and relevance second. Every text chunk comes above every image, so a perfectly relevant chart is unreachable at any k while the index contains more than k text chunks \u2014 and 6.1 measured this corpus at 1,187." },
        { t: "p", text: "So Option A as the reference draws it \u2014 one unified store, one ranked list \u2014 cannot work. The architecture diagram is not wrong about the components, it is wrong about the merge." }
      ] },

    { t: "callout", kind: "good", title: "What rescues Option A, if you want it",
      body: [
        { t: "p", text: "Retrieve each modality separately and fuse the *ranks*. Reciprocal rank fusion from 5.9 never compares raw scores \u2014 it only uses positions \u2014 so it is immune to a scale difference between retrievers by construction. That is exactly the property needed here, and it is why RRF was the right tool for BM25 beside vectors too." },
        { t: "p", text: "Equivalently: run top-k over the text index, top-j over the image index, and merge. You have to decide `j` \u2014 how many images are worth a slot \u2014 which is a product decision rather than a similarity one, and that is honest. There is no single cosine threshold that makes it automatic." },
        { t: "p", text: "What you must not do is normalise the scores into a shared range and pretend they are comparable. Rescaling 0.17\u20130.37 onto 0.71\u20130.87 produces a number that looks like a similarity and means nothing \u2014 it would make the *least* similar image outrank well-matched text." }
      ] },

    { t: "viz", title: "The modality gap, measured", caption: "Two non-overlapping ranges. One ranked list across both sorts by modality, not relevance.",
      svg: `<svg viewBox="0 0 760 250" width="100%" role="img" aria-label="Text-text and text-image cosine ranges do not overlap">
  <text x="16" y="22" class="s-label">COSINE RANGES FROM ONE CLIP MODEL</text>
  <line x1="60" y1="190" x2="710" y2="190" stroke="var(--line)" stroke-width="1.2"/>
  <text x="60" y="210" text-anchor="middle" class="s-mono" style="font-size:10px">0.0</text>
  <text x="222" y="210" text-anchor="middle" class="s-mono" style="font-size:10px">0.25</text>
  <text x="385" y="210" text-anchor="middle" class="s-mono" style="font-size:10px">0.50</text>
  <text x="547" y="210" text-anchor="middle" class="s-mono" style="font-size:10px">0.75</text>
  <text x="710" y="210" text-anchor="middle" class="s-mono" style="font-size:10px">1.0</text>

  <rect x="169" y="60" width="130" height="30" rx="4" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.8"/>
  <text x="16" y="80" class="s-sub">text\u2013image</text>
  <text x="234" y="80" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--crit)">0.169 \u2013 0.368</text>

  <rect x="521" y="120" width="104" height="30" rx="4" class="s-fill-bg" style="stroke:var(--good)" stroke-width="1.8"/>
  <text x="16" y="140" class="s-sub">text\u2013text</text>
  <text x="573" y="140" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--good)">0.709 \u2013 0.869</text>

  <line x1="299" y1="75" x2="521" y2="135" stroke="var(--warn)" stroke-width="1.4" stroke-dasharray="4 3"/>
  <text x="410" y="100" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--warn)">a gap of 0.34</text>
  <text x="410" y="116" text-anchor="middle" class="s-sub" style="font-size:9px">no overlap whatsoever</text>

  <text x="16" y="238" class="s-mono" style="fill:var(--crit)">so one list ranked by cosine puts every text chunk above every image</text>
</svg>` },

    { t: "h3", text: "Two things my own script overstated" },

    { t: "code", lang: "python", title: "g65.py \u00a7B \u2014 within-modality ranking, which I claimed worked", code: `for i, t in enumerate(TEXTS):
    j = int(TV[i].argmax())`,
      out: `  query                                                best image
  a bar chart showing revenue rising over four quart   bar chart, rising      0.3465
  a bar chart showing churn falling over time          bar chart, falling     0.3683
  a chart where the value stays flat                   bar chart, rising      0.2702
  the quarterly revenue table from the annual report   bar chart, rising      0.3069
  a transformer architecture diagram                   flat chart             0.2156`,
      hl: [5],
      caption: "Row three is wrong: \u201cstays flat\u201d should match the flat chart and matched the rising one." },

    { t: "callout", kind: "trap", title: "\u201cCLIP is doing its job\u201d was too generous, and §C has an artefact",
      body: [
        { t: "p", text: "My script printed \u201cwithin the image set the ordering is meaningful \u2014 CLIP is doing its job\u201d. On the three chart queries it got **two of three**: \u201cstays flat\u201d picked the rising chart. My images are 224-pixel PIL rectangles with a one-word label, which is a weak test \u2014 so this says more about my synthetic charts than about CLIP." },
        { t: "p", text: "The second problem is worse because I built it in. In \u00a7C I used the *same strings* as the image summaries and as the queries, so the reported max of **1.0000** is a string matching itself. That number is meaningless and I should have paraphrased the summaries." },
        { t: "p", text: "What survives both flaws is the finding the lesson rests on. The modality gap is about the *range* of the two comparisons, not about any ranking: text-summary similarities sit at 0.709 and above, text-image at 0.368 and below. Weak images cannot move a 0.34 gap, and the 1.0000 artefact inflates only \u00a7C\u2019s maximum, not its minimum. The claim about scale holds; my claim about ranking quality does not." }
      ] },

    { t: "h2", n: "03", id: "optionb", text: "Option B, summarise then embed",
      sub: "The one that works, for a reason the reference does not give" },

    { t: "p", text: "Option B sends each image or table to a vision model, gets a text description, and embeds *that* with the same text model as everything else. The reference presents it as a pragmatic choice. The measurement shows it is the structurally correct one: once every stored vector comes from one text model, every comparison is text-to-text and a single ranked list means something again." },

    { t: "code", lang: "python", title: "describe at ingestion, embed the description", code: `def describe_image(image_path: str) -> str:
    with open(image_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()
    response = ChatOpenAI(model="gpt-4o").invoke([
        {"type": "text", "text": "Describe this image in detail for search indexing."},
        {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}},
    ])
    return response.content

# store: description (for retrieval) + original image ref (for generation)`,
      hl: [5],
      caption: "\u201cfor search indexing\u201d is doing work \u2014 it asks for a description optimised for matching queries, not for prose." },

    { t: "callout", kind: "insight", title: "Embed the summary, retrieve the original",
      body: [
        { t: "p", text: "This is the reference\u2019s first best practice and it is the one people get wrong. The summary exists to be *matched*; the original exists to be *reasoned over*. Passing the summary to the generator throws away the data \u2014 a chart summary says \u201crevenue rose across four quarters\u201d and cannot answer \u201cwhat was Q3?\u201d" },
        { t: "p", text: "The same applies to tables with more force, because a table summary loses every number. Embed a description of what the table covers, then put the original HTML or markdown in the context, and the model can read values out of it." },
        { t: "p", text: "It is the parent-document pattern from 5.10 in different clothing: retrieve on a small representation, generate on the large one. Worth noticing that the same shape keeps recurring \u2014 the thing that ranks well and the thing that answers well are rarely the same object." }
      ] },

    { t: "callout", kind: "warn", title: "The summary is a generated artefact, so it can be wrong",
      body: [
        { t: "p", text: "6.4 made this point about community summaries and it applies identically here. A vision model that misreads an axis produces a confident description that is then embedded, retrieved and cited \u2014 a hallucination frozen into the index at ingestion time." },
        { t: "p", text: "Retrieving the original limits the damage, since the generator sees the real chart and can contradict a bad description. That is a second reason for the practice beyond answer quality: the original is a check on the summary." },
        { t: "p", text: "It does not limit all of it. A description that misses the chart\u2019s topic entirely means the chart is never retrieved, and nothing downstream can fix a retrieval that did not happen. So sample the descriptions during ingestion, exactly as 6.3 argued for sampling chunks." }
      ] },

    { t: "h2", n: "04", id: "colpali", text: "Option C, ColPali",
      sub: "Delete the parsing stage instead of improving it" },

    { t: "p", text: "ColPali takes a different line: stop extracting anything. Treat each page as an image, embed it with a vision-language model into *many* vectors rather than one, and at query time compute late interaction between query token embeddings and page patch embeddings \u2014 MaxSim, the mechanism 5.9 introduced for ColBERT." },

    { t: "dl", items: [
      { k: "No OCR", v: "Nothing to get wrong on a scanned page, and no OCR noise embedded as plausible nonsense." },
      { k: "No chunking", v: "Which 5.4 identified as the highest-leverage and most fiddly decision in the pipeline. Here it does not exist." },
      { k: "No parsing", v: "No table extraction, no boilerplate stripping, no running-header bug from 6.3." },
      { k: "Layout is a feature", v: "The model sees a table *as* a table, and a figure beside its caption. Spatial relationships survive because nothing linearised them." }
    ] },

    { t: "callout", kind: "tradeoff", title: "What it costs: granularity and index size",
      body: [
        { t: "p", text: "Retrieval is page-level. A page holding one relevant paragraph is retrieved whole, so the context carries everything else on it \u2014 which inflates tokens and, per 5.7, gives the generator more to be distracted by. There is no \u201csmall-to-big\u201d available because the small unit does not exist." },
        { t: "p", text: "And multi-vector embeddings are not cheap to store. One vector per patch per page instead of one per chunk multiplies the index by the patch count, which collides directly with 6.2\u2019s finding that memory is the first binding constraint \u2014 a million single vectors was already 1.5 GB." },
        { t: "p", text: "Late interaction also costs more per query than a dot product, for the same reason ColBERT does: MaxSim over every query token against every page patch rather than one similarity per candidate." }
      ] },

    { t: "callout", kind: "note", title: "Which makes it a good fit for a narrow, common case",
      body: [
        { t: "p", text: "Document-heavy corpora with complex layouts and page counts in the thousands rather than millions: financial filings, technical manuals, regulatory submissions. There the parsing pipeline is the dominant source of bugs and the index size is manageable, so deleting the pipeline is a clear win." },
        { t: "p", text: "For a large text corpus with occasional figures it is the wrong trade \u2014 you would pay multi-vector storage over every page to handle the few that need it, when Option B handles those at the cost of one vision call each at ingestion." },
        { t: "p", text: "The two compose, which is the practical answer. Option B for a mostly-text corpus with figures; ColPali for the subset of sources that are genuinely page-shaped." }
      ] },

    { t: "h2", n: "05", id: "evaluate", text: "Evaluate per modality",
      sub: "An aggregate number hides the modality that does not work" },

    { t: "p", text: "The reference\u2019s last best practice is the one that makes the rest testable: measure retrieval quality for text, table and image queries *independently*. Given the modality gap, an aggregate score is actively misleading \u2014 a system where images are never retrieved at all can post a respectable overall recall, because most queries are text queries and they work." },

    { t: "code", lang: "python", title: "the evaluation shape", code: `for modality in ("text", "table", "image"):
    qs = [q for q in golden if q.expects == modality]
    m = evaluate([retrieve(q.text) for q in qs], [q.relevant for q in qs], k=5)
    print("%-8s n=%-4d Hit@5 %.2f  MRR %.2f  nDCG@5 %.2f"
          % (modality, len(qs), m["hit"], m["mrr"], m["ndcg"]))`,
      out: `  [shape -- build this golden set from your own documents]

  text     n=40   Hit@5 0.95  MRR 0.84  nDCG@5 0.63
  table    n=15   Hit@5 0.73  MRR 0.61  nDCG@5 0.48
  image    n=12   Hit@5 0.00  MRR 0.00  nDCG@5 0.00
  ---
  overall  n=67   Hit@5 0.76  MRR 0.67  nDCG@5 0.52`,
      hl: [6, 8],
      caption: "The text and overall rows are 6.1's real measurements; the per-modality split is the shape to expect. A zero row is invisible in the aggregate." },

    { t: "callout", kind: "insight", title: "A zero row is the thing to look for",
      body: [
        { t: "p", text: "The image row above is **0.00** across every metric, and the overall row still reads 0.76 \u2014 which would pass most review. That is precisely the failure the modality gap produces: not degraded image retrieval, absent image retrieval, because no image can outrank enough text to reach the top 5." },
        { t: "p", text: "It is also the easiest bug in this module to detect once you look for it. One golden query per modality, checked at every deploy, and a modality that silently stops being retrievable cannot stay silent." },
        { t: "p", text: "6.1\u2019s point applies here too: these metrics are deterministic arithmetic over a label set, so this is a CI gate rather than a judgement call. The hard part is the label set, which is a morning\u2019s work per modality and the only part nobody can do for you." }
      ] },

    { t: "exercise", kind: "build", title: "Measure your own modality gap", difficulty: "advanced", minutes: 35,
      body: "Take any dual-encoder you retrieve with across modalities \u2014 CLIP or similar \u2014 and compute the distribution of same-modality and cross-modality cosine similarities over your own content. Report whether the ranges overlap. Then decide, from the measurement, whether your system can rank one list across both modalities or needs rank fusion.",
      requirements: [
        "Use your own images and queries, not synthetic shapes",
        "Report min, mean and max for text-text and text-image separately",
        "State whether the ranges overlap, and by how much",
        "If they do not overlap, compute how many text chunks sit above the best image at k=5",
        "Decide between rank fusion, separate indexes or summarise-then-embed, with the numbers as the reason"
      ],
      hint: "Normalise both sides to unit length first so cosine is a dot product, and check your framework actually returned projected features \u2014 see the note below, this is where the measurement most easily goes wrong.",
      solution: { lang: "python", title: "the gap, and the version trap underneath it", code: `def feats(out):
    """transformers 5.x returns BaseModelOutputWithPooling from
    get_text_features / get_image_features, NOT a tensor. pooler_output is
    the projected 512-dim feature -- visual_projection is 768->512, so a 512
    image output confirms the projection was applied."""
    t = out.pooler_output if hasattr(out, "pooler_output") else out
    return (t / t.norm(dim=-1, keepdim=True)).numpy()

with torch.no_grad():
    T = feats(m.get_text_features(**pr(text=QUERIES, return_tensors="pt",
                                       padding=True, truncation=True)))
    V = feats(m.get_image_features(**pr(images=IMAGES, return_tensors="pt")))

TT = T @ T.T ; np.fill_diagonal(TT, np.nan)
TV = T @ V.T
print("text-text  min %.4f mean %.4f max %.4f"
      % (np.nanmin(TT), np.nanmean(TT), np.nanmax(TT)))
print("text-image min %.4f mean %.4f max %.4f" % (TV.min(), TV.mean(), TV.max()))
print("overlap    : %s" % ("yes" if TV.max() > np.nanmin(TT) else "NONE"))`,
        out: `  text-text  min 0.7091 mean 0.7952 max 0.8694
  text-image min 0.1686 mean 0.2668 max 0.3683
  overlap    : NONE`,
        notes: [
          { t: "p", text: "**The `feats` helper is not boilerplate, it is the measurement.** In transformers 5.x, `get_text_features` returns a `BaseModelOutputWithPooling` rather than a tensor, so the 4.x idiom `out / out.norm(dim=-1, keepdim=True)` raises `AttributeError: 'BaseModelOutputWithPooling' object has no attribute 'norm'`. That is how I hit it." },
          { t: "p", text: "**And that is the good kind of break.** Compare 3.9, where `head_mask` was silently dropped by the same library and every masked configuration returned perplexity 5.941 \u2014 identical numbers that looked like a finding. Here the API change crashes instead of lying, so the measurement could not quietly become meaningless." },
          { t: "p", text: "**Check the dimension to confirm you have projected features.** CLIP ViT-B/32 has a 768-dimension vision hidden state and a 512-dimension joint space, so a 512-wide image output proves `visual_projection` ran. The text tower is 512 either way, which means the text side alone cannot tell you \u2014 verify on the image side." },
          { t: "p", text: "**Then act on the overlap, not on the means.** The means differ by 0.53 here, but the decisive quantity is whether the best cross-modal score clears the worst same-modal one. It does not, by 0.34 \u2014 so ranking one list by cosine sorts by modality, and rank fusion or separate retrieval is mandatory rather than preferable." },
          { t: "p", text: "One limit on my own run: five queries and three synthetic 224-pixel charts. A gap this wide will not close with better images \u2014 it is a property of the contrastive objective \u2014 but the exact numbers are specific to this sample, which is why the exercise asks you to run it on your own content." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Cosine is only comparable within one embedding space, and CLIP\u2019s two towers are two spaces with a measured gap of 0.34 between them. So the question is never \u201cis this image relevant enough\u201d \u2014 it is \u201cwhich index did this score come from\u201d, and scores from different indexes are merged by rank, never by value." },
        { t: "p", text: "Everything else follows. Summarise into one shared text space when you want one list; keep the original for generation because what ranks well is not what answers well; and measure each modality on its own, because a modality that is never retrieved is invisible in an aggregate." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cOur documents are full of charts and tables. How would you build retrieval over them?\u201d**" },
        { t: "p", text: "First I would check how much of it is actually tables, because that is the cheap half. Tables have recoverable structure \u2014 `infer_table_structure` gives HTML, and once it is markdown it is text that an ordinary embedding model handles. Charts are the genuinely hard case, since \u201crevenue rose for four quarters\u201d exists only as pixels." },
        { t: "p", text: "For the charts I would summarise with a vision model at ingestion and embed the summary with the same text model as the chunks \u2014 and the reason is comparability rather than convenience. I measured CLIP\u2019s modality gap on rendered charts: text-to-text cosines ran 0.709 to 0.869, text-to-image 0.169 to 0.368. No overlap at all. So a unified store ranked by cosine puts every text chunk above every image, and a relevant chart is unreachable at any k." },
        { t: "p", text: "If someone wanted CLIP embeddings in the index anyway, that is fine as long as the merge is by rank rather than by score \u2014 RRF never compares raw values, which is exactly why it worked for BM25 beside vectors. What I would refuse is rescaling the two ranges into one, which produces a number that looks like a similarity and would make the least similar image outrank well-matched text." },
        { t: "p", text: "Either way I would embed the summary and retrieve the *original*. A chart summary cannot answer \u201cwhat was Q3\u201d and a table summary loses every number \u2014 it is the parent-document pattern again, where the thing that ranks well is not the thing that answers well." },
        { t: "p", text: "And I would evaluate per modality from the start. An aggregate hides this failure completely: a system where images are never retrieved can post 0.76 overall while the image row is 0.00, because most queries are text queries and they work. One golden query per modality in CI makes that impossible to miss." },
        { t: "p", text: "If the corpus were mostly page-shaped \u2014 filings, manuals \u2014 I would also price ColPali, which deletes parsing and chunking entirely by embedding pages as images. It buys layout understanding and costs granularity and index size, and page-level retrieval plus multi-vector storage runs straight into memory being the first constraint that binds." }
      ] }
  ],

  takeaways: [
    "**Tables and charts are not one problem** \u2014 a table has recoverable structure and a text solution; a chart's claim exists only as pixels and needs a vision model.",
    "**The modality gap is total, measured**: text-text cosine 0.709\u20130.869 against text-image 0.169\u20130.368, with no overlap and a 0.34 margin.",
    "**So the reference's Option A cannot work as drawn** \u2014 one list ranked by cosine sorts by modality first, and no image outranks any text chunk at any k.",
    "**Fuse by rank, never by score.** RRF uses only positions, so it is immune to a scale difference between retrievers by construction; rescaling the ranges produces a meaningless number.",
    "**Option B is structurally correct, not merely pragmatic** \u2014 one text model for every stored vector makes every comparison text-to-text, so one ranked list means something.",
    "**Embed the summary, retrieve the original.** A chart summary cannot answer \u201cwhat was Q3\u201d and a table summary loses every number \u2014 5.10's parent-document pattern again.",
    "**A generated summary is a hallucination risk frozen into the index**, and retrieving the original is a partial check on it \u2014 but a description that misses the topic means the image is never retrieved at all.",
    "**ColPali deletes OCR, chunking and parsing** by embedding pages as images with late interaction, and pays in page-level granularity and multi-vector index size.",
    "**Evaluate each modality separately** \u2014 an image row of 0.00 is invisible behind an overall 0.76, because most queries are text queries and they work.",
    "**In transformers 5.x, `get_text_features` returns an output object, not a tensor**, and the 4.x idiom crashes \u2014 which is the good kind of break, unlike 3.9's silently ignored `head_mask`."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Measured with one CLIP model, text-text cosine ranged 0.709\u20130.869 and text-image 0.169\u20130.368. What does this mean for a unified text-and-image vector store?",
        options: [
          "Image retrieval will be somewhat worse than text retrieval and should be compensated with a boost factor",
          "Ranking one list by cosine sorts by modality before relevance, so no image reaches the top k while the index holds more than k text chunks",
          "The images were embedded without normalisation, so their cosines are compressed",
          "CLIP is the wrong model and a stronger vision encoder would close the gap"
        ],
        answer: 1,
        why: "The ranges do not overlap: the worst text-text pair beats the best text-image pair by 0.34, so modality dominates the ordering entirely and the failure is categorical rather than gradual. This is the modality gap \u2014 CLIP's contrastive loss only requires matched pairs to beat mismatched ones, never requiring cross-modal scores to reach same-modal ones, so the two clouds occupy separate cones. A boost factor or rescaling produces a number that looks like a similarity and means nothing; the fix is to fuse by rank, as RRF does." },

      { stem: "Why does the summarise-then-embed architecture solve the problem rather than merely working around it?",
        options: [
          "Vision model summaries are more accurate than CLIP embeddings",
          "Every stored vector then comes from one text model, so every comparison is text-to-text and a single ranked list is meaningful again",
          "Text embeddings are smaller, which reduces the index memory",
          "It allows the original image to be discarded after ingestion"
        ],
        answer: 1,
        why: "The failure in Option A is comparability, not quality \u2014 two embedding spaces ranked by one number. Replacing images with text descriptions embedded by the same model as the chunks collapses everything into one space, which is a structural fix rather than a tuning one. The original must be kept, not discarded: the summary exists to be matched and the original to be reasoned over, since a chart summary cannot answer \"what was Q3?\" and a table summary loses every number." },

      { stem: "A multimodal RAG system reports Hit@5 of 0.76 overall. Per modality it is 0.95 for text, 0.73 for tables and 0.00 for images. What is the lesson about evaluation?",
        options: [
          "0.76 is acceptable and the image queries are too few to matter",
          "An aggregate hides a modality that is never retrieved at all, so each modality needs its own measurement \u2014 and a zero row is exactly what the modality gap produces",
          "The image golden set must be mislabelled, since 0.00 is implausible",
          "Hit@5 is the wrong metric and nDCG would reveal the problem"
        ],
        answer: 1,
        why: "A respectable aggregate is compatible with one modality being completely unreachable, because most queries are text queries and those work. 0.00 is exactly the signature of the modality gap \u2014 not degraded image retrieval but absent image retrieval, since no image can outrank enough text to enter the top 5. nDCG would also read 0.00 and reveal nothing extra; what reveals it is splitting by modality, which is deterministic arithmetic and therefore a CI gate." },

      { stem: "What does ColPali trade for removing OCR, chunking and parsing from the pipeline?",
        options: [
          "Accuracy on text-heavy pages, since it cannot read small print",
          "Granularity and index size \u2014 retrieval is page-level, and multi-vector embeddings per page multiply storage",
          "The ability to cite sources, since pages have no chunk ids",
          "Query latency only, as indexing is unchanged"
        ],
        answer: 1,
        why: "Embedding whole pages means a page holding one relevant paragraph is retrieved whole, inflating context and leaving no small unit for a small-to-big pattern. Multi-vector embeddings store one vector per patch rather than one per chunk, which collides with memory being the first constraint that binds as a corpus grows. Late interaction also costs more per query than a dot product. The trade suits page-shaped corpora in the thousands \u2014 filings, manuals \u2014 rather than large text corpora with occasional figures." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Where one measurement settles an architecture choice",
    questions: [
      { level: "advanced",
        q: "How would you build RAG over documents containing images and tables?",
        strong: "A strong answer separates tables from images and justifies the architecture on comparability.",
        answer: [
          { t: "p", text: "I would split the problem first, because tables and charts are not the same difficulty. Tables have recoverable structure \u2014 extract with `infer_table_structure`, convert to markdown, and it is text an ordinary embedding model handles. A chart is different: \u201crevenue rose for four quarters\u201d is nowhere in the text layer and only a vision model recovers it." },
          { t: "p", text: "For the visual content I would summarise with a vision model at ingestion and embed the summary with the same text model as the chunks. The reason is comparability. I measured CLIP\u2019s two towers on rendered charts and the ranges do not overlap at all \u2014 text-to-text 0.709 to 0.869, text-to-image 0.169 to 0.368. So a unified store ranked by cosine sorts by modality, and a relevant chart is unreachable at any k." },
          { t: "p", text: "That is a property of the contrastive objective rather than of my test: the loss only asks that matched pairs beat mismatched ones, never that cross-modal scores reach same-modal ones. If someone wanted CLIP vectors in the index anyway, the merge has to be by rank \u2014 RRF uses positions only \u2014 and never by rescaled score." },
          { t: "p", text: "Then embed the summary and retrieve the original, which is the parent-document pattern again. And evaluate per modality, because an image row of zero hides completely behind a reasonable aggregate." }
        ] },

      { level: "core",
        q: "What is ColPali and when would you use it?",
        strong: "A strong answer names what it deletes and what it costs.",
        answer: [
          { t: "p", text: "It treats each document page as an image, embeds it with a vision-language model into many vectors rather than one, and matches query token embeddings against page patch embeddings by late interaction \u2014 MaxSim, the same mechanism as ColBERT." },
          { t: "p", text: "What it buys is deletion. No OCR, so no OCR noise embedded as plausible nonsense. No chunking, which is otherwise the highest-leverage and fiddliest decision in the pipeline. No parsing, so no running-header bug and no flattened tables. The model sees a table as a table and a figure beside its caption, because nothing linearised the page." },
          { t: "p", text: "What it costs is granularity and memory. Retrieval is page-level, so a page with one relevant paragraph arrives whole and the rest is context to be distracted by, with no small unit available for small-to-big. And one vector per patch per page multiplies the index, which runs straight into memory being the first constraint that binds \u2014 a million ordinary vectors was already 1.5 GB." },
          { t: "p", text: "So I would reach for it on page-shaped corpora in the thousands \u2014 filings, technical manuals, regulatory submissions \u2014 where the parsing pipeline is the main source of bugs. For a large text corpus with occasional figures, summarise-then-embed handles those far more cheaply, and the two compose if some sources are page-shaped and others are not." }
        ] },

      { level: "core",
        q: "Why evaluate multimodal retrieval per modality rather than overall?",
        strong: "A strong answer connects it to the specific failure the gap produces.",
        answer: [
          { t: "p", text: "Because the characteristic failure is total rather than partial, and an aggregate cannot show it. If images are never retrieved \u2014 which is exactly what the modality gap produces, since no image outranks enough text to enter the top 5 \u2014 the image metrics are 0.00 while the overall number stays respectable, because most queries are text queries and those work." },
          { t: "p", text: "So a split by modality turns an invisible failure into an obvious one. A zero row is unmissable; a 0.76 aggregate reads as acceptable and would pass most reviews." },
          { t: "p", text: "It is cheap to do properly, too. The IR metrics are deterministic arithmetic over a label set, so once the golden set exists this runs in CI on every ingest as a gate rather than a judgement call. The labelling is a morning per modality and it is the only part that cannot be automated." },
          { t: "p", text: "I would also keep at least one golden query per modality as a smoke test, specifically to catch the case where a model or library upgrade silently changes an embedding space \u2014 which is the same class of regression as changing the embedding model under a live index." }
        ] }
    ]
  }
});
