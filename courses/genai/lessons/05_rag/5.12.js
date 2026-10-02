EC.receiveLesson({
  id: "5.12",

  lede: "Embeddings are the wrong instrument for structured data, and the reason is sharper than \u201cSQL is better at maths\u201d. I put 2,000 order rows into a vector store and asked *\u201cHow many orders are from EMEA?\u201d*. The retriever did its job well \u2014 **all five returned rows were EMEA orders**. The answer is 687, and the model was shown **5 of the 687 rows: 0.73% of the evidence**. Retrieval returns a *similarity-ranked sample*, and no sample answers a question about a population. What retrieval is genuinely good for over a database is the **schema**, not the rows.",

  objectives: [
    "Explain why similarity retrieval cannot answer aggregate questions",
    "Distinguish questions a sample can answer from questions it cannot",
    "Use retrieval over schema descriptions to support text-to-SQL",
    "Describe the hybrid architecture and where each component's failures land",
    "Recognise the failure mode of a vector store pointed at tabular data"
  ],

  prerequisites: ["5.7"],

  blocks: [

    { t: "h2", n: "01", id: "demo", text: "The experiment",
      sub: "Two thousand rows, six questions, two mechanisms" },

    { t: "p", text: "The setup is the obvious one: render each database row as a sentence, embed it, and retrieve the top five for each question. This is what \u201cRAG over your database\u201d usually means in practice." },

    { t: "code", lang: "python", title: "g512.py \u2014 rows as text, in a vector store", code: `docs = ["Order %d: customer %s, region %s, product %s, quantity %d, "
        "unit price %.2f, date %s" % r for r in rows]
E = enc.encode(docs, normalize_embeddings=True, batch_size=256)`,
      out: `  2000 order rows, 7 columns
  as natural-language rows for embedding:
    Order 1: customer Hooli, region AMER, product Sprocket, quantity 45,
    unit price 471.51, date 2024-12-21
  embedded 2000 rows -> 3.07 MB index`,
      caption: "Nothing wrong with any of this. The index builds, the search works, the rows come back." },

    { t: "code", lang: "python", title: "g512.py \u2014 what SQL says and what retrieval returns", code: `for q, sql in QUERIES:
    print(q, db.execute(sql).fetchone()[0])          # the actual answer
    for j in RANK[i][:5]:
        print("   ", rows[j])                        # what the model sees`,
      out: `  question                                                   SQL answer
  How many orders are from EMEA?                                    687
  What is the total revenue from Acme?                       1680673.66
  Which region has the highest average order value?                AMER
  How many Widgets were sold in total?                            10402
  Which customer placed the most orders?                         Globex
  What was the largest single order by value?                   24884.5

  Q: How many orders are from EMEA?
     top-5 retrieved rows:
       order 192   Initech  EMEA  Cog  qty 20  @222.59
       order 168   Stark    EMEA  Cog  qty 28  @29.95
       order 1211  Stark    EMEA  Cog  qty 21  @290.11`,
      hl: [2],
      caption: "Every retrieved row is an EMEA order. Retrieval succeeded. The question is still unanswerable." },

    { t: "callout", kind: "insight", title: "The retriever did its job and the system still cannot answer",
      body: [
        { t: "p", text: "This is what makes the failure instructive rather than obvious. **All five retrieved rows were EMEA orders** \u2014 the embedding matched the predicate correctly. If you were grading retrieval, this is a perfect score." },
        { t: "p", text: "And the answer is 687. The model was handed **5 of 687 relevant rows, 0.73% of the evidence**, and asked how many there are. There is no reasoning step that recovers the other 682. The best possible behaviour is to refuse; the realistic behaviour is to produce a number that sounds plausible." },
        { t: "p", text: "The general statement: **retrieval returns a similarity-ranked sample, and aggregate questions are about populations.** Counting, summing, averaging, ranking, finding a maximum \u2014 all of them need every row that satisfies the predicate, and top-k is definitionally not that." },
        { t: "p", text: "Worse, the failure is silent and confident. A model given five EMEA rows will not say \u201cI have seen 0.73% of the data\u201d. It will say a number." }
      ] },

    { t: "viz", title: "What a top-5 retrieval sees of a COUNT", caption: "Every retrieved row is correct. The question is about the population, and the sample is 0.73% of it.",
      svg: `<svg viewBox="0 0 760 266" width="100%" role="img" aria-label="Sample versus population for an aggregate query">
  <text x="16" y="22" class="s-label">\u201cHow many orders are from EMEA?\u201d \u2014 the answer is 687</text>

  <text x="16" y="52" class="s-sub">the table</text>
  <rect x="110" y="40" width="620" height="22" rx="3" class="s-fill-bg" style="stroke:var(--line)" stroke-width="1.2"/>
  <text x="420" y="56" text-anchor="middle" class="s-sub">2,000 rows</text>

  <text x="16" y="94" class="s-sub">rows that match</text>
  <rect x="110" y="82" width="213" height="22" rx="3" class="s-fill" style="stroke:var(--accent)" stroke-width="1.4"/>
  <text x="216" y="98" text-anchor="middle" class="s-sub">687 EMEA rows</text>
  <text x="336" y="98" class="s-mono" style="fill:var(--accent)">this is what COUNT needs to see</text>

  <text x="16" y="136" class="s-sub">what top-5 returns</text>
  <rect x="110" y="124" width="6" height="22" rx="2" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="128" y="140" class="s-mono" style="fill:var(--good)">5 rows \u2014 all correctly EMEA</text>
  <text x="380" y="140" class="s-mono" style="fill:var(--crit)">0.73% of the evidence</text>

  <line x1="16" y1="166" x2="744" y2="166" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="192" class="s-mono" style="fill:var(--crit)">retrieval succeeded completely and the question is still unanswerable</text>
  <text x="16" y="214" class="s-sub">and the model will not say \u201cI saw 0.73% of the data\u201d \u2014 it will produce a number</text>
  <text x="16" y="244" class="s-mono" style="fill:var(--good)">SELECT COUNT(*) FROM orders WHERE region=\u2018EMEA\u2019  \u2014 sees all 687, returns 687</text>
</svg>` },

    { t: "h2", n: "02", id: "which", text: "Which questions a sample can answer",
      sub: "The dividing line is existential against universal" },

    { t: "table",
      head: ["Question", "Sample sufficient?", "Why"],
      rows: [
        ["\u201cShow me an example of an EMEA order\u201d", "**Yes**", "Existential \u2014 one matching row proves it"],
        ["\u201cWhat did Acme order most recently?\u201d", "Sometimes", "One row answers it, but only if ranking happened to surface the right one"],
        ["\u201cHow many orders are from EMEA?\u201d", "**No**", "Universal \u2014 needs every matching row, measured at 687 against a sample of 5"],
        ["\u201cWhich region has the highest average?\u201d", "**No**", "Needs every row in every group, then a comparison across groups"],
        ["\u201cWhat was the largest single order?\u201d", "**No**", "A maximum over the population; the largest row need not look like the question at all"],
        ["\u201cDescribe our returns policy\u201d", "**Yes**", "Not structured data at all \u2014 this is prose, and retrieval is the right tool"]
      ] },

    { t: "callout", kind: "trap", title: "The maximum is the clearest case",
      body: [
        { t: "p", text: "*\u201cWhat was the largest single order by value?\u201d* \u2014 the answer is 24,884.50. The top-5 retrieved rows had values like 243.79 \u00d7 7 and 80.59 \u00d7 29. None of them is close." },
        { t: "p", text: "The reason is that **similarity and magnitude are unrelated**. A row is retrieved because its text resembles the question, and \u201clargest single order by value\u201d does not resemble any particular row\u2019s text more than another\u2019s. The actual maximum is a row like any other; nothing in its sentence announces that it is the biggest." },
        { t: "p", text: "So retrieval is not merely sampling here \u2014 it is sampling on a dimension orthogonal to the question. That is worse than a random sample, because a random sample at least has no systematic bias." }
      ] },

    { t: "h2", n: "03", id: "schema", text: "What retrieval is for over a database",
      sub: "Finding the right columns, not the right rows" },

    { t: "p", text: "There is a real retrieval problem in text-to-SQL, and it is upstream of the query. A production schema may have two hundred tables and thousands of columns, which does not fit in a prompt \u2014 and even where it fits, it buries the relevant few in noise." },

    { t: "code", lang: "python", title: "g512.py \u2014 embed the column descriptions instead", code: `SCHEMA_DOCS = [
    "orders.region: the sales region of an order, one of EMEA, AMER, APAC",
    "orders.customer: the name of the customer placing the order",
    "orders.product: the product ordered, one of Widget, Gadget, Sprocket, ...",
    "customers.tier: the support tier of a customer, gold silver or bronze",
    "shipments.carrier: the shipping carrier used for a delivery",
    ...
]
SV = enc.encode(SCHEMA_DOCS, normalize_embeddings=True)`,
      out: `  question                                       top schema match
  How many orders are from EMEA?                 orders.region: the sales region of an
  What is the total revenue from Acme?           orders.unit_price: price per unit in d
  Which region has the highest average order v   orders.region: the sales region of an
  How many Widgets were sold in total?           orders.product: the product ordered, o
  Which customer placed the most orders?         orders.customer: the name of the custo
  What was the largest single order by value?    orders.quantity: how many units were o`,
      hl: [1],
      caption: "Every question routed to a relevant column. This is the job retrieval does well here." },

    { t: "callout", kind: "good", title: "Schema retrieval is a genuine use, and it is the inverse of the failed one",
      body: [
        { t: "p", text: "Rows are many, homogeneous and the question is usually about all of them \u2014 the worst case for similarity search. Column descriptions are few, heterogeneous, written in prose, and the question is about a handful of them \u2014 which is exactly what retrieval is for." },
        { t: "p", text: "So the same vector store over the same database is the wrong tool pointed at the rows and the right tool pointed at the schema. That inversion is the practical content of this lesson." },
        { t: "p", text: "One caveat on my measurement: ten column descriptions is a trivial retrieval problem and every question found a relevant one. The real test is a schema with two hundred tables and ambiguous column names \u2014 `date`, `status`, `type` repeated across a dozen tables \u2014 where the descriptions have to do real disambiguating work. I have shown the mechanism, not its difficulty at scale." }
      ] },

    { t: "h2", n: "04", id: "hybrid", text: "The architecture that works",
      sub: "Retrieve the schema, generate SQL, execute it" },

    { t: "ol", items: [
      "**Retrieve the relevant schema** \u2014 vector search over column and table descriptions, so the generator sees ten columns rather than two thousand.",
      "**Generate SQL** against that schema, with one LLM call. 3.13\u2019s grammar-constrained decoding is relevant here: a SQL grammar makes syntactically invalid output impossible.",
      "**Execute the SQL.** The database does the counting, summing and grouping \u2014 exactly, over every row, which is the thing retrieval cannot do.",
      "**Return the result**, and ideally the query alongside it so the answer is checkable."
    ] },

    { t: "callout", kind: "insight", title: "The failure modes move somewhere better",
      body: [
        { t: "p", text: "The model never sees 2,000 rows and never does arithmetic. What it produces is a query, and a wrong query usually fails *loudly*: a syntax error, a missing column, an empty result. Those are catchable and retryable." },
        { t: "p", text: "Compare the retrieval version, where the failure is a confident number derived from 0.73% of the data, indistinguishable from a correct one. Moving from a silent wrong answer to a loud wrong query is the main thing this architecture buys." },
        { t: "p", text: "The dangerous residual case is a query that is **valid and wrong** \u2014 the right syntax against the wrong column, or a join that silently drops rows. That is why returning the SQL alongside the answer matters: it is the only part of the pipeline a user can actually check." },
        { t: "p", text: "And it needs the obvious guard rails: a read-only connection, a statement timeout, and a row limit. An LLM writing SQL against a production database with write permissions is a different lesson entirely." }
      ] },

    { t: "exercise", kind: "lab", title: "Demonstrate the failure, then build the fix", difficulty: "core", minutes: 30,
      body: "Put a table of at least a thousand rows into a vector store as natural-language sentences. Ask aggregate questions \u2014 a count, a sum, a maximum, a group-wise comparison \u2014 and compare what retrieval returns against the SQL answer. Quantify the fraction of the relevant evidence a top-k retrieval actually sees. Then build schema retrieval and confirm it selects the right columns.",
      requirements: [
        "Use enough rows that a top-k sample is a small fraction of any matching group",
        "Include a count, a sum, a maximum and a group-wise comparison",
        "Report how many of the retrieved rows actually satisfy the question's predicate",
        "Compute the sample as a percentage of the rows the correct answer depends on",
        "Build schema retrieval over column descriptions and check which column each question selects"
      ],
      hint: "Check whether the retrieved rows satisfy the predicate. If they do, you have shown that retrieval working correctly is still not enough \u2014 which is a stronger result than retrieval failing.",
      solution: { lang: "python", title: "g512.py \u2014 the failure and the fix", code: `# rows as text, in a vector store
docs = ["Order %d: customer %s, region %s, product %s, quantity %d, "
        "unit price %.2f, date %s" % r for r in rows]
E = enc.encode(docs, normalize_embeddings=True, batch_size=256)
RANK = np.argsort(-(QV @ E.T), axis=1)

# how much of the evidence does top-5 actually see?
n_emea = db.execute("SELECT COUNT(*) FROM orders WHERE region='EMEA'").fetchone()[0]
print(n_emea, 5, 100 * 5 / n_emea)

# and are the retrieved rows even relevant?
hit = sum(1 for j in RANK[0][:5] if rows[j][2] == "EMEA")
print(hit, "of 5")

# the fix: retrieve the SCHEMA, not the rows
SV = enc.encode(SCHEMA_DOCS, normalize_embeddings=True)
for i, (q, _) in enumerate(QUERIES):
    print(q, SCHEMA_DOCS[int(np.argmax(QV[i] @ SV.T))])`,
        out: `  question                                                   SQL answer
  How many orders are from EMEA?                                    687
  What is the total revenue from Acme?                       1680673.66
  Which region has the highest average order value?                AMER
  What was the largest single order by value?                   24884.5

  a COUNT over EMEA must see every EMEA row:
    rows matching EMEA: 687 of 2000
    rows a top-5 retrieval sees: 5
    fraction of the evidence available to the model: 0.73%

  and how many of the top-5 retrieved rows are even EMEA?
    for 'How many orders are from EMEA?': 5 of 5

  SCHEMA RETRIEVAL
  How many orders are from EMEA?                 orders.region: the sales region...
  How many Widgets were sold in total?           orders.product: the product ordered...
  Which customer placed the most orders?         orders.customer: the name of the...`,
        notes: [
          { t: "p", text: "**Retrieval succeeded completely and the question is still unanswerable.** All five returned rows were EMEA orders \u2014 a perfect retrieval score \u2014 and the answer depends on 687 rows, of which the model saw 0.73%. That is a stronger result than retrieval failing, because it shows the problem is structural rather than a tuning issue." },
          { t: "p", text: "**The dividing line is existential against universal.** \u2018Show me an EMEA order\u2019 needs one row and a sample provides it; \u2018how many\u2019 needs every matching row and no top-k does. Counting, summing, averaging, grouping and maxima are all universal." },
          { t: "p", text: "**The maximum is the clearest case and the worst.** The largest order was 24,884.50 and the retrieved rows were in the hundreds, because similarity and magnitude are unrelated \u2014 nothing in the biggest row's sentence announces that it is the biggest. Retrieval here samples on a dimension orthogonal to the question, which is worse than sampling randomly." },
          { t: "p", text: "**Schema retrieval is the inverse case and it works.** Rows are many, homogeneous and queried in aggregate \u2014 the worst case for similarity. Column descriptions are few, heterogeneous and queried individually \u2014 the best case. Every question here selected a relevant column." },
          { t: "p", text: "One honest limit: ten column descriptions is a trivial retrieval problem. The real difficulty is a two-hundred-table schema with `date`, `status` and `type` repeated everywhere, where the descriptions must disambiguate. The mechanism is demonstrated; its difficulty at scale is not." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Retrieval answers \u201cfind me something like this\u201d. A database answers \u201ctell me about all of these\u201d. Aggregate questions are the second kind, and a top-k sample is structurally the wrong shape for them however good the ranking is." },
        { t: "p", text: "Point the vector store at the schema instead of the rows, and the same tool goes from being the wrong instrument to the right one." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cWe put our orders table into a vector database so users can ask questions about it. The answers are confidently wrong. What is happening?\u201d**" },
        { t: "p", text: "The architecture cannot answer the questions being asked, and the retrieval is probably working fine \u2014 which is what makes it confusing to debug." },
        { t: "p", text: "I measured this on 2,000 rows. Asked \u2018how many orders are from EMEA\u2019, the retriever returned five rows and all five were correctly EMEA. The answer is 687. The model saw 0.73% of the evidence and produced a number anyway. Retrieval returns a similarity-ranked sample; count, sum, average and maximum are questions about a population." },
        { t: "p", text: "The maximum case is the one I would show them, because it is unambiguous. The largest order was 24,884 and the retrieved rows were in the hundreds \u2014 similarity and magnitude are unrelated, so nothing about the biggest row's text makes it more retrievable. The sampling is not just partial, it is on a dimension orthogonal to the question." },
        { t: "p", text: "The fix is to invert what the vector store indexes: retrieve the *schema* rather than the rows. Embed column and table descriptions so a text-to-SQL step gets ten relevant columns instead of a two-hundred-table schema, generate the query, and let the database do the aggregation over every row." },
        { t: "p", text: "That also moves the failure mode somewhere better. A wrong query usually fails loudly \u2014 syntax error, missing column, empty result \u2014 and those are catchable and retryable, where a confident number from 0.73% of the data is indistinguishable from a correct one. I would return the generated SQL alongside the answer, because that is the only part a user can check, and the residual risk is a query that is valid and wrong." },
        { t: "p", text: "And the guard rails are not optional: read-only connection, statement timeout, row limit. The architecture puts an LLM in the position of writing queries against a real database, and that needs to be constrained at the connection rather than in the prompt." }
      ] }
  ],

  takeaways: [
    "**Retrieval returns a similarity-ranked sample; aggregates are questions about populations.** Counting, summing, averaging, grouping and maxima all need every matching row.",
    "**The retrieval can succeed completely and the system still fail.** All five rows returned for an EMEA count were correctly EMEA \u2014 and were 0.73% of the 687 rows the answer depends on.",
    "**The failure is silent and confident.** A model given five correct rows produces a number, not \u201cI have seen 0.73% of the data\u201d.",
    "**The dividing line is existential against universal**: \u201cshow me an example\u201d is answerable from a sample, \u201chow many\u201d is not.",
    "**Maxima are the clearest failure** \u2014 similarity and magnitude are unrelated, so the largest row (24,884) looks no more like the question than any other, and the sampling is on an orthogonal dimension.",
    "**Retrieval's real job over a database is the schema**, not the rows: find the handful of relevant columns in a two-hundred-table schema so text-to-SQL has a small prompt.",
    "**That is the exact inverse of the failing case** \u2014 rows are many, homogeneous and queried in aggregate; column descriptions are few, heterogeneous and queried individually.",
    "**The working architecture is retrieve schema, generate SQL, execute, return** \u2014 the model never sees the rows and never does arithmetic.",
    "**It moves failures from silent to loud**: a bad query raises a syntax error or returns nothing, which is catchable, where a bad aggregate looks like an answer.",
    "**Return the generated SQL with the answer**, because a query that is valid and wrong is the residual risk and the query is the only part a user can check."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A vector store over 2,000 order rows is asked \u201chow many orders are from EMEA?\u201d. All five retrieved rows are EMEA orders. Why is the system still unable to answer?",
        options: [
          "The embedding model cannot represent numeric fields accurately",
          "The answer depends on all 687 matching rows and the model saw five of them \u2014 a sample cannot answer a question about a population",
          "The rows were rendered as text, losing the column types",
          "k was set too low and should be raised to 50"
        ],
        answer: 1,
        why: "Retrieval here worked perfectly \u2014 every returned row satisfied the predicate \u2014 which is what makes the failure structural rather than a tuning problem. A count is a universal question: it needs every matching row, and top-k is definitionally a sample, 0.73% of the evidence in this case. Raising k to 50 would still be 7%, and to 687 would mean abandoning retrieval for a scan, which is what SQL does properly." },

      { stem: "Why is \u201cwhat was the largest single order?\u201d a particularly bad fit for similarity retrieval?",
        options: [
          "Because numeric comparisons require exact match rather than semantic similarity",
          "Because similarity and magnitude are unrelated \u2014 nothing in the largest row's text makes it more retrievable than any other row",
          "Because maxima require sorting, which vector indexes do not support",
          "Because the largest order is usually an outlier excluded by the index"
        ],
        answer: 1,
        why: "The retrieved rows had values in the hundreds against an actual maximum of 24,884. A row is returned because its text resembles the question, and no row's sentence announces that it is the biggest \u2014 so retrieval samples on a dimension orthogonal to what is being asked. That is worse than a random sample, which would at least be unbiased. Vector indexes do sort, but by similarity, which is the wrong ordering here." },

      { stem: "What is retrieval genuinely useful for in a text-to-SQL system?",
        options: [
          "Retrieving example rows so the model can infer the data format",
          "Retrieving the relevant schema \u2014 finding the handful of columns a question needs within a large schema",
          "Retrieving previously executed queries to reuse",
          "Retrieving the aggregate results computed in a previous run"
        ],
        answer: 1,
        view: "",
        why: "A production schema can have two hundred tables and thousands of columns, which does not fit in a prompt and buries the relevant few in noise. Column descriptions are few, heterogeneous and written in prose, and each question concerns a handful of them \u2014 the inverse of the row case and exactly what similarity search is for. Query reuse and caching are real techniques but address repetition rather than the schema-size problem." },

      { stem: "Why does the retrieve-schema-then-execute-SQL architecture have better failure modes?",
        options: [
          "Because SQL generation is more accurate than retrieval",
          "Because a bad query usually fails loudly \u2014 syntax error, missing column, empty result \u2014 where a bad aggregate is a confident number indistinguishable from a correct one",
          "Because the database validates the semantics of the question",
          "Because execution is faster than embedding the rows"
        ],
        answer: 1,
        why: "The model produces a query rather than an answer, and most wrong queries raise an error or return nothing \u2014 both catchable and retryable. The retrieval version produces a plausible number derived from a fraction of the data with nothing to distinguish it from a correct answer. The residual risk is a query that is valid and wrong, such as the right syntax against the wrong column, which is why returning the SQL alongside the answer matters: it is the only part a user can check." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Where \u201cRAG over our database\u201d is the wrong sentence",
    questions: [
      { level: "core",
        q: "Can you use RAG over a SQL database?",
        strong: "A strong answer distinguishes the row case from the schema case.",
        answer: [
          { t: "p", text: "Not over the rows, for anything aggregate. I put 2,000 order rows into a vector store and asked how many were from EMEA \u2014 the retriever returned five rows and all five were correctly EMEA, so retrieval worked perfectly. The answer is 687, and the model saw 0.73% of the evidence." },
          { t: "p", text: "The structural reason is that retrieval returns a similarity-ranked sample and aggregates are questions about populations. Counting, summing, averaging, grouping and maxima all need every matching row, and top-k is definitionally not that \u2014 no value of k fixes it short of scanning everything, which is what the database does properly." },
          { t: "p", text: "Maxima are the clearest case: the largest order was 24,884 and the retrieved rows were in the hundreds, because similarity and magnitude are unrelated. Nothing about the biggest row's text makes it more retrievable." },
          { t: "p", text: "Where retrieval *is* the right tool is the schema. A two-hundred-table schema does not fit in a prompt, so embedding column descriptions and retrieving the relevant handful is a genuine retrieval problem \u2014 and the exact inverse of the row case, because columns are few, heterogeneous and queried individually." }
        ] },

      { level: "advanced",
        q: "Design a system that answers questions over both documents and a database.",
        strong: "A strong answer routes by question shape and keeps each component's failure visible.",
        answer: [
          { t: "p", text: "Two retrieval paths with a classifier in front, and I would be explicit that the classifier is a risk \u2014 5.11 measured routing converting a soft failure into a hard one, so I would route to both sources when uncertain rather than committing." },
          { t: "p", text: "The document path is the ordinary pipeline: chunk, embed, retrieve, generate with citations. The database path is retrieve-schema, generate-SQL, execute, return \u2014 the model sees ten relevant columns rather than the whole schema, and never sees the rows or does the arithmetic." },
          { t: "p", text: "The reason to keep them separate rather than embedding the rows alongside the documents is that the two have incompatible failure modes. A missing document chunk produces an incomplete answer; a sampled set of rows produces a confident wrong number, and mixing them in one index means the second failure hides inside the first's metrics." },
          { t: "p", text: "I would return the generated SQL with any database answer, because a query that is valid and wrong is the residual risk and the query is the only checkable artefact. And the connection is read-only with a statement timeout and a row limit \u2014 those are connection-level constraints, not prompt instructions." },
          { t: "p", text: "For the genuinely multi-hop questions \u2014 \u2018what did our largest EMEA customer order\u2019 \u2014 the database answers the first part and the documents the second, and that sequencing is the one case where an agent loop earns its cost." }
        ] },

      { level: "core",
        q: "A team reports their database RAG gives confidently wrong numbers. What do you tell them?",
        strong: "A strong answer shows the retrieval succeeded and the architecture failed.",
        answer: [
          { t: "p", text: "That the retrieval is probably fine and the architecture cannot answer the question, which is why it is hard to debug by looking at retrieval quality." },
          { t: "p", text: "I would show them the measurement directly: for a count over 687 matching rows, a top-5 retrieval returned five rows that were all correctly matching \u2014 a perfect retrieval score \u2014 representing 0.73% of the evidence. The model then produced a number, because that is what a model does when given five relevant rows and a question." },
          { t: "p", text: "So no amount of chunking, embedding or re-ranking work helps. The fix is to stop asking retrieval to do a database's job: embed the schema instead of the rows, generate SQL, and execute it." },
          { t: "p", text: "The benefit beyond correctness is that the failures become visible. A wrong query errors or returns nothing \u2014 catchable, retryable, loggable \u2014 where a wrong aggregate looks exactly like a right one. That change from silent to loud is usually worth more than the accuracy improvement, because it is what lets them find the next problem." }
        ] }
    ]
  }
});
