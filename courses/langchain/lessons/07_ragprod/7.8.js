EC.receiveLesson({
  id: "7.8",
  lede: "A table is the worst case for text extraction, because the extracted text is syntactically fine and semantically destroyed. *\u201cWhat is the rate limit on Growth\u201d* needs the **association** between `Growth` and `2400/min`, and row-major extraction puts those tokens next to the wrong neighbours. The chunk still retrieves \u2014 it is genuinely about rate limits and plans \u2014 so the model answers confidently from scrambled input, which is 5.2's invisible failure with numbers in it. Of the three architectures for this, the production default is **summarise-then-embed**, and the reason is not accuracy: it keeps the retrieval index textual, so everything measured in modules 5 to 7 still applies.",
  objectives: [
    "Explain why table extraction destroys the association that answers the question",
    "Compare the three multimodal RAG architectures on their trade-offs",
    "Justify the production default on grounds other than accuracy",
    "Explain why the summary sets the ceiling of the whole system",
    "Write a summarisation instruction that preserves retrievability"
  ],
  prerequisites: ["5.2", "6.3"],
  blocks: [
    { t: "h2", n: "01", id: "table", text: "Why extraction loses the answer", sub: "The worst case is a table" },
    { t: "code", lang: "text", title: "The source",
      code: "Plan        Seats   Rate limit   Price\nStarter     5       600/min      $49\nGrowth      25      2400/min     $199\nEnterprise  custom  custom       custom",
      caption: "Four columns, and the meaning is entirely in the alignment." },
    { t: "code", lang: "text", title: "Row-major extraction with whitespace collapsed",
      code: "'Plan Seats Rate limit Price Starter 5 600/min $49 Growth 25\n 2400/min $199 Enterprise custom custom custom'",
      caption: "Syntactically fine. The column structure is gone." },
    { t: "callout", kind: "warn", title: "And it still retrieves", body: [
      { t: "p", text: "*\u201cWhat is the rate limit on Growth\u201d* needs the association between `Growth` and `2400/min`. In the extracted text those tokens are adjacent to the wrong neighbours, and an embedding of that string carries no column structure at all." },
      { t: "p", text: "Worse, the chunk scores well \u2014 it is genuinely about rate limits and plans \u2014 so retrieval returns it, the metrics look healthy, and the model answers confidently from scrambled input. This is 5.2's invisible failure, and the presence of numbers makes it more dangerous rather than less, because a wrong number reads exactly like a right one." }
    ] },
    { t: "h2", n: "02", id: "three", text: "The three architectures", sub: "No vision model here, so this is the design comparison" },
    { t: "h3", text: "A. Shared-space embeddings (CLIP-style)" },
    { t: "p", text: "Embed images and text into one vector space and search both at once." },
    { t: "ul", items: [
      "**+** one index, one query path",
      "**\u2212** trained on captions, so weak on dense text, tables and charts",
      "**\u2212** cannot be inspected \u2014 you get a vector, not a readable chunk"
    ] },
    { t: "h3", text: "B. Summarise-then-embed (`MultiVectorRetriever`)" },
    { t: "p", text: "A vision model writes a text description of each image or table; you embed the **description**, store the original, and return the original." },
    { t: "ul", items: [
      "**+** the retrieval index stays pure text \u2014 all of modules 5 to 7 apply",
      "**+** the description is human-readable, so failures are debuggable",
      "**+** the summary is written once, offline, at ingest",
      "**\u2212** quality is capped by the summary; what it omits is unretrievable"
    ] },
    { t: "h3", text: "C. Page-as-image (ColPali-style)" },
    { t: "p", text: "Skip extraction entirely: embed the rendered page, and feed the page image to a vision model at generation time." },
    { t: "ul", items: [
      "**+** nothing is lost, because nothing is extracted",
      "**\u2212** every query pays vision-model inference over images",
      "**\u2212** citations are a page, not a passage"
    ] },
    { t: "h2", n: "03", id: "default", text: "Why B is the default", sub: "And the reason is not accuracy" },
    { t: "callout", kind: "insight", title: "It keeps the retrieval index textual", body: [
      { t: "p", text: "Everything measured in modules 5 to 7 still applies to a text index: BM25 over the summaries, rank fusion, MMR, cross-encoder reranking, metadata filters. A and C give all of that up for a different embedding space, which is a large sacrifice for a capability most corpora need on a minority of their content." },
      { t: "p", text: "And it is **debuggable**. When a table is not retrieved you can read its summary and see that it says *\u201ca pricing table\u201d* and never mentions rate limits \u2014 a fixable ingestion bug with a visible cause. With A you have a vector and a shrug." }
    ] },
    { t: "p", text: "The cost structure favours it too: the vision model runs **once per asset at ingest**, not once per query. C inverts that, which is the same precompute argument 6.1 made about bi-encoders \u2014 work that does not depend on the query belongs before the query arrives." },
    { t: "h2", n: "04", id: "summary", text: "The summary is a prompt-engineering problem", sub: "And it sets the system's ceiling" },
    { t: "p", text: "Since what the summary omits is **permanently unretrievable**, the summarisation instruction decides the ceiling of the whole system. That makes it the highest-leverage prompt in a multimodal pipeline, and it is usually an afterthought." },
    { t: "ladder", title: "Summarising a pricing table", rungs: [
      { level: "bad", label: "Describe the asset", why: "Retrievable by nothing a user would ask.",
        code: "A table showing pricing information.",
        note: "A query for 'rate limit on Growth' has nothing to match. The table is in the index and is effectively invisible." },
      { level: "ok", label: "Describe the structure", why: "Better, and still missing the values.",
        code: "A pricing table with columns for plan, seats, rate limit and price,\ncovering the Starter, Growth and Enterprise plans.",
        note: "Now retrievable by 'pricing plans' and by 'rate limit', but a query naming a specific plan and asking for a specific number still cannot match the figure." },
      { level: "best", label: "State the values", why: "Retrievable by the questions people actually ask.",
        code: "Pricing table. Starter: 5 seats, 600 requests/min, $49.\nGrowth: 25 seats, 2400 requests/min, $199.\nEnterprise: custom seats, limits and price.",
        note: "'Rate limit on Growth' now matches directly, and the association between the plan name and the number is preserved in prose \u2014 which is exactly what the extraction destroyed." }
    ] },
    { t: "callout", kind: "mental", title: "Ask for the values, not a description of the asset", body: [
      { t: "p", text: "The instinct when prompting for a summary is to ask what the thing *is*. What retrieval needs is what the thing *says* \u2014 the entities, the numbers, and the associations between them, written as prose that a query can match." },
      { t: "p", text: "And read a sample of the generated summaries before indexing them. That is 5.2's rule applied one layer up: a summariser that \u201cworks\u201d can produce fluent descriptions that are useless for retrieval, and nothing downstream will tell you, because the asset will simply never be returned." }
    ] },
    { t: "exercise", kind: "analysis", title: "Compare the multimodal architectures",
      difficulty: "advanced", minutes: 32,
      body: "Take a table and show what naive row-major extraction does to it, identifying the specific association a question needs and explaining why the extracted text cannot carry it. Then compare the three multimodal RAG architectures on their trade-offs, and justify a production default on grounds other than accuracy. Finally show how the summarisation instruction changes retrievability, from a description of the asset to a statement of its values.",
      requirements: ["Show a table and its naive extraction",
        "Identify the association a question needs and why extraction destroys it",
        "Explain why the failure is invisible to retrieval metrics",
        "Compare three architectures with at least two trade-offs each",
        "Justify the default on grounds other than accuracy",
        "Explain why the summary sets the system's ceiling",
        "Contrast a weak and a strong summarisation instruction"],
      hint: "Pick a question that needs two cells of the table to be associated. That association is what the extraction destroys and what no embedding can recover.",
      solution: { lang: "python", title: "x0708.py \u2014 the summary sets the ceiling",
        code: '# the association a question needs\nTABLE = [("Starter", 5, "600/min", "$49"),\n         ("Growth", 25, "2400/min", "$199"),\n         ("Enterprise", "custom", "custom", "custom")]\n\n# naive row-major extraction destroys the column alignment\nflat = " ".join(str(c) for row in TABLE for c in row)\n\n# summarise-then-embed: state the VALUES, not a description\nsummary = ". ".join("%s: %s seats, %s, %s" % r for r in TABLE)\n\nq = "what is the rate limit on Growth"\nfor name, text in (("flat extraction", flat), ("value summary", summary)):\n    e = ENC.encode([q, text], normalize_embeddings=True)\n    print("%-16s %.4f" % (name, float(e[0] @ e[1])))',
        out: "==============================================================================\nPART 1 -- why text extraction loses the answer\n==============================================================================\n  5.2 showed loaders losing structure silently. a table is the worst\n  case, because extraction produces text that is syntactically fine\n  and semantically destroyed.\n\n  the source table:\n    Plan        Seats   Rate limit   Price\n    Starter     5       600/min      $49\n    Growth      25      2400/min     $199\n    Enterprise  custom  custom       custom\n\n  naive extraction, row-major with whitespace collapsed:\n    'Plan Seats Rate limit Price Starter 5 600/min $49 Growth 25\n     2400/min $199 Enterprise custom custom custom'\n\n  the question 'what is the rate limit on Growth' needs the\n  ASSOCIATION between 'Growth' and '2400/min'. in the extracted text\n  those tokens are adjacent to the wrong neighbours, and an embedding\n  of that string carries no column structure at all.\n\n  worse, it will still retrieve. the chunk is genuinely about rate\n  limits and plans, so it scores well and the model answers from\n  scrambled input -- 5.2's invisible failure, with numbers in it.\n==============================================================================\nPART 2 -- the three architectures\n==============================================================================\n  no vision model is installed here, so this part is the design\n  comparison rather than a measurement. the trade-offs are what\n  decide the choice.\n\n  A. shared-space embeddings (CLIP-style)\n     embed images and text into one vector space; search both at once.\n     + one index, one query path\n     - trained on captions, so weak on dense text, tables and charts\n     - cannot be inspected: you get a vector, not a readable chunk\n\n  B. summarise-then-embed (MultiVectorRetriever)\n     a VLM writes a text description of each image or table; embed the\n     DESCRIPTION, store the original, return the original.\n     + the retrieval index stays pure text -- all of modules 5-7 apply\n     + the description is human-readable, so failures are debuggable\n     + the summary is written once, offline, at ingest\n     - quality is capped by the summary; what it omits is unretrievable\n\n  C. page-as-image (ColPali-style)\n     skip extraction entirely; embed the rendered page, feed the page\n     image to a VLM at generation time.\n     + nothing is lost, because nothing is extracted\n     - every query pays VLM inference over images\n     - citations are a page, not a passage\n==============================================================================\nPART 3 -- which is the production default, and why\n==============================================================================\n  B, summarise-then-embed, and the reason is not accuracy.\n\n  it keeps the retrieval index textual, which means every technique\n  measured in modules 5 to 7 still applies -- BM25 over the summaries,\n  rank fusion, MMR, cross-encoder reranking, metadata filters. A and C\n  give all of that up for a different embedding space.\n\n  and it is DEBUGGABLE. when a table is not retrieved you can read the\n  summary and see that it says 'a pricing table' and never mentions\n  rate limits -- which is a fixable ingestion bug with a visible cause.\n  with A you have a vector and a shrug.\n\n  the cost structure also favours it: the VLM runs once per asset at\n  ingest, not once per query. C inverts that, which is the same\n  precompute argument 6.1 made about bi-encoders.\n==============================================================================\nPART 4 -- the summary is a prompt-engineering problem\n==============================================================================\n  since what the summary omits is permanently unretrievable, the\n  summarisation prompt decides the ceiling of the whole system.\n\n  a bad summary : 'A table showing pricing information.'\n  a good summary: 'Pricing table. Starter: 5 seats, 600 requests/min,\n                   $49. Growth: 25 seats, 2400 requests/min, $199.\n                   Enterprise: custom seats, limits and price.'\n\n  the second is retrievable by 'rate limit on Growth' and the first is\n  not, and the difference is entirely in the instruction given to the\n  VLM. so: ask for the VALUES, not a description of the asset -- and\n  read a sample of the generated summaries before indexing them,\n  which is 5.2's rule applied one layer up.",
        notes: [
          { t: "p", text: "**A table's meaning is in its alignment**, and row-major extraction puts each token next to the wrong neighbours \u2014 the association between `Growth` and `2400/min` is destroyed." },
          { t: "p", text: "**And the chunk still retrieves**, because it is genuinely about rate limits and plans. The metrics look healthy and the model answers confidently from scrambled input \u2014 5.2's invisible failure, with numbers in it." },
          { t: "p", text: "**Three architectures**: shared-space embeddings (one index, weak on dense text, uninspectable), summarise-then-embed (text index, debuggable, capped by the summary), and page-as-image (nothing lost, vision inference per query, page-level citations)." },
          { t: "p", text: "**Summarise-then-embed is the default, and not because it is most accurate** \u2014 it keeps the retrieval index textual, so BM25, rank fusion, MMR, reranking and metadata filters all still apply." },
          { t: "p", text: "**And it is debuggable.** A table that is not retrieved has a readable summary you can inspect; with a shared embedding space you have a vector and a shrug." },
          { t: "p", text: "**The cost structure favours it too**: the vision model runs once per asset at ingest, not once per query \u2014 6.1's precompute argument again." },
          { t: "p", text: "**The summary sets the system's ceiling**, because what it omits is permanently unretrievable. That makes the summarisation instruction the highest-leverage prompt in the pipeline." },
          { t: "p", text: "**Ask for the values, not a description of the asset.** \u2018A table showing pricing information\u2019 is retrievable by nothing a user would ask; the plan names with their numbers is retrievable directly." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the charts nobody could find", body: [
      { t: "p", text: "A team indexes a library of reports with charts using summarise-then-embed. Retrieval quality on text is good and no chart is ever returned for a question about the data it shows." },
      { t: "p", text: "The summarisation prompt asked the model to describe each image, so the summaries read *\u201ca bar chart showing quarterly revenue\u201d*. That matches a query about bar charts and matches nothing about revenue figures, growth rates or specific quarters \u2014 which is what users ask about. The information is in the index and unreachable." },
      { t: "p", text: "The fix is in the instruction, not the architecture: ask for the values and the trend in prose \u2014 the axes, the series names, the notable figures, the direction of change. And verify by sampling: embed a handful of realistic questions against the generated summaries before indexing the whole library. Both are ingestion-time checks, which is the only time they are cheap, because what the summary omits cannot be recovered without re-running the vision model over every asset." }
    ] }
  ],
  takeaways: [
    "**A table's meaning is in its alignment**, which row-major extraction destroys.",
    "**The question needs an association** between a plan name and a number; extraction puts them next to wrong neighbours.",
    "**And the chunk still retrieves**, so the metrics look healthy and the model answers from scrambled input.",
    "**Three architectures**: shared-space embeddings, summarise-then-embed, page-as-image.",
    "**Shared-space is one index and uninspectable**, and weak on dense text, tables and charts.",
    "**Page-as-image loses nothing and pays vision inference per query**, with page-level citations.",
    "**Summarise-then-embed is the default, and not because it is most accurate.**",
    "**It keeps the retrieval index textual**, so BM25, fusion, MMR, reranking and filters all still apply.",
    "**And it is debuggable** \u2014 a readable summary against a vector and a shrug.",
    "**The vision model runs once per asset at ingest**, not once per query (6.1's precompute argument).",
    "**The summary sets the system's ceiling**, because what it omits is permanently unretrievable.",
    "**Ask for the values, not a description of the asset.**",
    "**Sample the generated summaries before indexing** \u2014 5.2's rule, one layer up."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "Why does naive table extraction defeat a question like \u201cwhat is the rate limit on Growth\u201d?",
      options: ["The numbers are tokenised inconsistently",
        "The question needs the association between two cells, and row-major extraction places each token next to the wrong neighbours",
        "Tables are usually too long for one chunk",
        "The embedding model cannot represent numbers"],
      answer: 1,
      why: "A table's meaning lives in its column alignment, and flattening it row-major puts 'Growth' adjacent to '25' and '2400/min' adjacent to '$199' in a single stream with no structure. The association that answers the question is simply absent from the text, and no embedding of that text can recover it. The chunk still scores well because it is genuinely about plans and limits." },
    { stem: "Why is summarise-then-embed the usual production default?",
      options: ["It is the most accurate of the three",
        "It keeps the retrieval index textual, so BM25, fusion, diversity, reranking and metadata filters all still apply",
        "It requires no vision model",
        "It produces the smallest index"],
      answer: 1,
      why: "A shared embedding space or a page-image index gives up the entire text-retrieval toolkit built across modules 5 to 7, which is a large sacrifice for a capability most corpora need on a minority of their content. Summaries also happen to be human-readable, so an unretrievable asset has a visible cause, and the vision model runs once per asset at ingest rather than per query." },
    { stem: "Why does the summarisation instruction set the whole system's ceiling?",
      options: ["Longer summaries always retrieve better",
        "What the summary omits is permanently unretrievable, since the summary is what gets embedded",
        "The summary is what the model sees at generation time",
        "Summaries determine the chunk size"],
      answer: 1,
      why: "The index contains the summary's embedding, not the asset's, so a fact the summary does not mention cannot be matched by any query. Recovering it means re-running the vision model over every asset, which is why reading a sample of generated summaries before indexing is the cheap moment to catch the problem \u2014 5.2's rule applied one layer up." },
    { stem: "A chart library is indexed with summaries like \u201ca bar chart showing quarterly revenue\u201d, and no chart is ever retrieved. What is the fix?",
      options: ["Switch to a shared-space embedding model",
        "Change the instruction to state the values and the trend in prose, then sample realistic questions against the summaries",
        "Increase the chunk overlap on the summaries",
        "Index the chart images directly alongside the summaries"],
      answer: 1,
      why: "The summaries describe what the asset is, which matches queries about bar charts and nothing about revenue figures, growth rates or specific quarters. The architecture is fine; the prompt is asking the wrong question. Verifying by embedding a few realistic queries against the generated summaries catches this at ingest, which is the only point at which it is cheap to fix." }
  ] },
  interview: { title: "Interview practice", sub: "Multimodal RAG", questions: [
    { level: "core", q: "How would you handle PDFs full of tables and charts?",
      strong: "A strong answer picks summarise-then-embed and justifies it structurally.",
      answer: [
        { t: "p", text: "Summarise-then-embed. A vision model writes a text description of each table or chart at ingest, I embed the description, store the original, and return the original at query time." },
        { t: "p", text: "The reason is not that it is the most accurate option \u2014 page-as-image loses nothing because it extracts nothing. It is that summarise-then-embed keeps the retrieval index textual, so everything I have built stays applicable: BM25 for exact terms, rank fusion, diversity selection, cross-encoder reranking, metadata filters for access control. A shared embedding space or a page-image index gives all of that up." },
        { t: "p", text: "It is also debuggable, which matters more than it sounds. If a table is never retrieved I can read its summary and see that it says 'a pricing table' and never mentions rate limits. That is a fixable ingestion bug with a visible cause. With a shared-space model I would have a vector and no way to inspect it." },
        { t: "p", text: "And the cost sits in the right place: the vision model runs once per asset at ingest, not once per query. That is the same precompute argument that makes bi-encoders usable for retrieval in the first place." }
      ] },
    { level: "advanced", q: "What is the main risk with that approach?",
      strong: "A strong answer identifies the summary as the ceiling and makes it verifiable.",
      answer: [
        { t: "p", text: "The summary is the ceiling. What it omits is permanently unretrievable, because the summary is what gets embedded \u2014 not the asset." },
        { t: "p", text: "So the summarisation prompt is the highest-leverage prompt in the whole pipeline, and it is usually written as an afterthought. The failure I would expect is asking the model to describe the asset: you get 'a bar chart showing quarterly revenue', which matches queries about bar charts and nothing about revenue figures or specific quarters. The data is in the index and unreachable." },
        { t: "p", text: "The instruction has to ask for the values rather than a description \u2014 the series names, the axes, the notable figures, the direction of change, written as prose a query can match. For a table, that means stating each row with its values so the association between a plan name and its rate limit survives in text, which is exactly what flat extraction destroys." },
        { t: "p", text: "And I would verify it before indexing the whole corpus: generate summaries for a sample, write the questions users will actually ask, and embed those against the summaries. That costs an hour and it is the only cheap moment to catch it, because recovering an omission later means re-running the vision model over every asset." },
        { t: "p", text: "It is the same discipline as reading loaded documents before building on them, one layer up. A summariser that produces fluent, useless descriptions looks like it is working, and nothing downstream reports the problem because the asset simply never comes back." }
      ] },
    { level: "core", q: "How would you know whether your multimodal ingestion is working?",
      strong: "A strong answer checks at ingest, because later is expensive.",
      answer: [
        { t: "p", text: "By embedding realistic questions against the generated summaries, at ingest time, before indexing the corpus \u2014 because what the summary omits cannot be recovered without re-running the vision model over every asset." },
        { t: "p", text: "Concretely: take a sample of tables and charts, generate their summaries, write the questions users will actually ask about them, and check that the summary retrieves for those questions. If a pricing table's summary does not match 'rate limit on Growth', the ingestion is broken and no amount of retrieval tuning will fix it." },
        { t: "p", text: "The failure I would be looking for is a summariser that produces fluent descriptions rather than values \u2014 'a bar chart showing quarterly revenue' matches queries about bar charts and nothing about revenue figures. It looks like it is working, and the asset is simply never returned." },
        { t: "p", text: "And I would read the summaries, not just measure them. That is the same rule as reading loaded documents before building on them \u2014 ten minutes catches most of it, and nothing downstream reports the problem because retrieval and generation both behave correctly on content that is merely absent." },
        { t: "p", text: "The reason this all has to happen at ingest is the cost asymmetry. Fixing a summarisation prompt before indexing is a prompt change; fixing it afterwards is a full re-ingestion of every image and table in the corpus." }
      ] }
  ] }
});
