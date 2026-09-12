/* ============================================================================
   LESSON 4.5 — JSON and Arrays in SQL
   ========================================================================= */
EC.receiveLesson({
  id: "4.5",

  lede: "**A JSON column is a table you have not designed yet.** It is the right choice for attributes that vary by row, for payloads you store before you understand them, and for the last mile of an API — and the wrong choice the moment a field inside it is filtered on, joined on or aggregated by a query that matters. The engines give you operators to reach inside, functions to explode arrays into rows, and indexes that make a JSON predicate as fast as a column. This lesson is those tools, and the line past which the field should have been a column.",

  objectives: [
    "Extract scalars and nested values from JSON with `->`, `->>` and path functions, and cast the result",
    "Explode a JSON array or a SQL array into rows with UNNEST, and aggregate rows back into arrays",
    "Index a JSON field with an expression index or a GIN index and know which predicates each serves",
    "Decide when a JSON column should become a table"
  ],

  prerequisites: ["4.1"],

  blocks: [

    { t: "h2", n: "01", text: "Reaching inside a document", id: "operators" },

    { t: "p", text: "PostgreSQL has two JSON types: `json`, which stores the text verbatim, and `jsonb`, which stores a parsed binary form that is indexable and faster to query — use `jsonb`. **`->` returns a JSON value (still JSON), `->>` returns text, and a path of `->` steps ending in `->>` reaches a nested scalar as a string you then cast.** A missing key is NULL, not an error, which is convenient and also how a typo in a key name goes unnoticed." },

    { t: "code", lang: "sql", title: "Order metadata as JSON: scalars, nested objects, arrays",
      hl: [7, 8, 9, 13],
      code: `WITH meta(order_id, doc) AS (VALUES
  (100, '{"channel": "web",   "coupon": {"code": "SPRING",  "pct": 10}, "tags": ["gift", "rush"]}'::jsonb),
  (101, '{"channel": "app",   "tags": []}'::jsonb),
  (102, '{"channel": "web",   "coupon": {"code": "WELCOME", "pct": 15}, "tags": ["rush"]}'::jsonb),
  (104, '{"channel": "store"}'::jsonb)
)
SELECT order_id,
       doc->>'channel'                     AS channel,      -- ->> : text
       doc->'coupon'->>'code'              AS coupon,       -- -> into the object, ->> out of it
       (doc->'coupon'->>'pct')::INTEGER    AS pct,          -- text, then cast
       jsonb_array_length(doc->'tags')     AS n_tags
FROM   meta ORDER BY order_id;
-- order_id | channel | coupon  | pct  | n_tags
-- 100      | web     | SPRING  | 10   | 2
-- 101      | app     | NULL    | NULL | 0
-- 102      | web     | WELCOME | 15   | 1
-- 104      | store   | NULL    | NULL | NULL          <- no tags key at all: NULL, not 0. A typo'd key gives the same NULL.

SELECT order_id FROM meta WHERE doc->>'channel' = 'web';                    -- 100, 102: a predicate on a field
SELECT order_id FROM meta WHERE doc @> '{"channel": "web"}';                -- the same, as containment -- the form a GIN index serves
SELECT order_id FROM meta WHERE doc #>> '{coupon,code}' = 'SPRING';         -- #>> : a path as an array of keys
SELECT order_id FROM meta WHERE jsonb_path_exists(doc, '$.tags[*] ? (@ == "rush")');   -- SQL/JSON path: 100, 102`,
      caption: "Every extraction returns text or JSON, never a typed column, so the cast is on you — and a value that fails the cast raises, which is why `(doc->>'pct')::INTEGER` is a landmine on data other people write. `jsonb_typeof(doc->'pct')` before the cast, or a CASE, is the defensive form."
    },

    { t: "dl", items: [
      ["`jsonb`", "PostgreSQL's parsed, binary JSON: deduplicated keys, no whitespace, indexable, fast to query. `json` keeps the exact text and is only for archival."],
      ["`->` / `->>`", "Get a field or array element as JSON / as text. `doc->'a'->'b'->>'c'` walks two objects and returns the leaf as text."],
      ["`#>` / `#>>`", "The same, with the path given as a text array: `doc #>> '{a,b,c}'`."],
      ["`@>`", "Containment: does the left document contain the right one. The predicate form that a GIN index accelerates."],
      ["SQL/JSON path", "`jsonb_path_exists`, `jsonb_path_query`: a query language over the document — filters inside arrays, wildcards — standardised in SQL:2016 and shared in spirit with MySQL's `JSON_EXTRACT` and BigQuery's `JSON_VALUE`."],
      ["`UNNEST` / `jsonb_array_elements`", "Turn an array into rows — one per element — so the elements can be filtered, joined and counted like anything else."]
    ]},

    { t: "h2", n: "02", text: "Arrays into rows, rows into arrays", id: "unnest" },

    { t: "p", text: "An array inside a document is a one-to-many relationship that has not been given a table. `jsonb_array_elements` (or `UNNEST` over a SQL array) produces one row per element, cross-joined to the row that held it, and at that point it is ordinary SQL: filter the tags, count them, join them to a lookup. **The reverse — `ARRAY_AGG` and `jsonb_agg` — folds rows back into an array or a document**, which is how a query returns a nested structure to an API in one round trip." },

    { t: "code", lang: "sql", title: "Tags as rows, orders as an array, and a document built from a query",
      hl: [2, 3, 9, 15, 16],
      code: `-- explode: one row per tag, LATERAL so each row's own array is expanded
SELECT m.order_id, t.tag
FROM   meta m CROSS JOIN LATERAL jsonb_array_elements_text(m.doc->'tags') AS t(tag)     -- DuckDB: UNNEST(CAST(doc->'tags' AS VARCHAR[]))
ORDER  BY 1, 2;
-- 100 gift · 100 rush · 102 rush        (order 101 has an empty array: no rows. 104 has no tags key: NULL array, no rows)
-- LEFT JOIN LATERAL ... ON TRUE keeps 101 and 104 with a NULL tag, if every order must appear

-- fold: each customer's order ids as an array, in order
SELECT c.customer_id, ARRAY_AGG(o.order_id ORDER BY o.placed_at) AS order_ids, COUNT(*) AS n
FROM   customers c JOIN orders o ON o.customer_id = c.customer_id
GROUP  BY 1 ORDER BY 1 LIMIT 3;
-- 1 | {100,102,108} | 3        2 | {101,105} | 2        3 | {103,110} | 2      (PostgreSQL prints arrays in braces)

-- a document per customer, with a nested array of orders: one query, one round trip, for an API
SELECT jsonb_build_object('name', c.name, 'tier', c.tier,
         'orders', COALESCE(jsonb_agg(jsonb_build_object('id', o.order_id, 'status', o.status) ORDER BY o.placed_at)
                            FILTER (WHERE o.order_id IS NOT NULL), '[]'::jsonb)) AS doc
FROM   customers c LEFT JOIN orders o ON o.customer_id = c.customer_id
GROUP  BY c.customer_id, c.name, c.tier ORDER BY c.customer_id LIMIT 2;
-- {"name": "Asha", "tier": "plus", "orders": [{"id": 100, "status": "paid"}, {"id": 102, "status": "paid"}, {"id": 108, "status": "paid"}]}
-- {"name": "Bruno", "tier": "standard", "orders": [{"id": 101, "status": "paid"}, {"id": 105, "status": "paid"}]}
-- the FILTER and COALESCE are for Mara: without them her orders array would be [null] rather than []`,
      caption: "Explode with a LATERAL, fold with an aggregate: the two directions of the same relationship. The `[null]` trap in the fold is the outer-join padding of 2.2 appearing inside a document — `FILTER (WHERE key IS NOT NULL)` is the `COUNT(column)` of JSON aggregation."
    },

    { t: "viz",
      title: "A document is a table folded up",
      caption: "The order's tags array is a child table with no name. jsonb_array_elements unfolds it into rows joined to their parent; ARRAY_AGG and jsonb_agg fold rows back. The relational form is what queries want; the document form is what the API and the storage of variable attributes want.",
      svg: `<svg viewBox="0 0 880 250" role="img" aria-label="Left: a JSON document for order 100 with a tags array of gift and rush. Middle arrows labelled jsonb_array_elements and jsonb_agg pointing right and left. Right: two relational rows, order 100 gift and order 100 rush, plus a parent row.">
  <defs>
    <marker id="js-ah-45" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-3)"/>
    </marker>
  </defs>
  <g class="s-label" style="font-weight:600">
    <text x="30" y="36">document</text><text x="600" y="36">relations</text>
  </g>
  <rect x="30" y="50" width="330" height="130" rx="8" style="fill:var(--accent);fill-opacity:.08;stroke:var(--accent)" stroke-width="1.2"/>
  <g class="s-mono">
    <text x="44" y="76">{ "order_id": 100,</text>
    <text x="44" y="96">  "channel": "web",</text>
    <text x="44" y="116">  "coupon": {"code": "SPRING", "pct": 10},</text>
    <text x="44" y="136" style="fill:var(--warn)">  "tags": ["gift", "rush"] }</text>
  </g>
  <g style="stroke:var(--ink-3)" stroke-width="1.2" fill="none">
    <line x1="370" y1="100" x2="590" y2="100" marker-end="url(#js-ah-45)"/>
    <line x1="590" y1="140" x2="370" y2="140" marker-end="url(#js-ah-45)"/>
  </g>
  <text x="480" y="92" class="s-sub" text-anchor="middle">jsonb_array_elements · UNNEST</text>
  <text x="480" y="158" class="s-sub" text-anchor="middle">jsonb_agg · ARRAY_AGG</text>
  <rect x="600" y="50" width="250" height="56" rx="8" style="fill:var(--good);fill-opacity:.08;stroke:var(--good)" stroke-width="1.2"/>
  <g class="s-mono">
    <text x="612" y="72">orders: 100 | web | SPRING | 10</text>
    <text x="612" y="92" class="s-sub">coupon flattened to columns</text>
  </g>
  <rect x="600" y="120" width="250" height="60" rx="8" style="fill:var(--warn);fill-opacity:.08;stroke:var(--warn)" stroke-width="1.2"/>
  <g class="s-mono">
    <text x="612" y="142">order_tags: 100 | gift</text>
    <text x="612" y="162">            100 | rush</text>
  </g>
  <text x="30" y="222" class="s-sub">Nested objects become columns; arrays become child tables. If a query ever filters, joins or groups by a field, the relational side is where it belongs.</text>
</svg>`
    },

    { t: "h2", n: "03", text: "Indexing a field inside JSON", id: "indexing" },

    { t: "p", text: "`WHERE doc->>'channel' = 'web'` extracts the field from every row and compares — a full scan, however small the answer. Two indexes fix it. **An expression index on `(doc->>'channel')` serves equality and range predicates on that one field**, exactly like an index on a column, and is the right choice for a field you always filter the same way. **A GIN index on the whole `jsonb` column serves containment (`@>`), key-existence (`?`) and path predicates across any field**, at the cost of a larger index and slower writes. Neither helps a predicate written in a form the index does not recognise — `->>` with a B-tree, `@>` with GIN, and not the other way round." },

    { t: "code", lang: "sql", title: "Two indexes, two predicate shapes",
      hl: [2, 4, 8, 10],
      code: `-- one field, one shape of predicate: an expression index (B-tree), used by ->> equality and ranges
CREATE INDEX orders_meta_channel ON orders_meta ((doc->>'channel'));
SELECT order_id FROM orders_meta WHERE doc->>'channel' = 'web';                 -- Index Scan
-- the expression in the query must match the index expression exactly: doc->'channel' (JSON, not text) would not use it

-- any field, containment or existence: a GIN index on the document
CREATE INDEX orders_meta_gin ON orders_meta USING GIN (doc);                    -- or (doc jsonb_path_ops): smaller, @> only
SELECT order_id FROM orders_meta WHERE doc @> '{"channel": "web"}';             -- Bitmap Index Scan on the GIN
SELECT order_id FROM orders_meta WHERE doc @> '{"tags": ["rush"]}';             -- containment reaches inside arrays: 100, 102
SELECT order_id FROM orders_meta WHERE doc ? 'coupon';                          -- key exists: 100, 102
SELECT order_id FROM orders_meta WHERE doc->>'channel' = 'web';                 -- NOT served by the GIN: this is ->>, not @>

-- MySQL: a generated column plus an ordinary index -- channel VARCHAR(20) AS (doc->>'$.channel') STORED, then INDEX (channel)
-- BigQuery, Snowflake: no index -- columnar scans and clustering on an extracted column instead`,
      caption: "The predicate must be written in the shape the index was built for. An expression index is a B-tree on the extracted text; a GIN index is an inverted index over keys and values that answers 'does this document contain that'. Write `@>` for GIN and `->>` for the expression index, and EXPLAIN (5.2) tells you which one you hit."
    },

    { t: "h2", n: "04", text: "When it should have been a table", id: "table" },

    { t: "p", text: "The case for a JSON column is real: attributes that differ by product type, an event payload whose schema the producer owns, a record kept exactly as received. The case against it appears the first time someone writes `WHERE (doc->>'pct')::INTEGER > 10` in a report — an unindexed cast on every row, no constraint stopping `pct` from being `'ten'`, no foreign key, no statistics for the planner, and a NULL that could mean 'no coupon' or 'misspelt key'. **A field that is queried is a column. A repeated structure that is queried is a child table.** JSON is for the rest." },

    { t: "table",
      head: ["Keep it in JSON when", "Move it to columns / a table when"],
      rows: [
        ["Attributes vary by row and most rows have a different set", "The same few fields are present on nearly every row"],
        ["The payload is stored as received and read back whole", "Queries filter, join, group or sort on a field inside it"],
        ["The schema is owned by another system and changes without notice", "The value needs a type, a NOT NULL, a CHECK or a foreign key"],
        ["Reads are by primary key, then the client parses", "The planner needs statistics on the field to choose a plan"],
        ["An array is displayed, never joined", "An array's elements are counted, filtered or joined — it is a child table"]
      ]
    },

    { t: "callout", kind: "tradeoff", title: "The hybrid", body: [
      { t: "p", text: "Most schemas land in between: **the fields every query uses as real columns, the long tail in a `jsonb` column beside them.** Promote a field when a query on it appears in production — `ALTER TABLE ADD COLUMN`, backfill from the document, index the column, and stop reading it from the JSON. PostgreSQL's generated columns (`channel TEXT GENERATED ALWAYS AS (doc->>'channel') STORED`) do the promotion without changing the writers." }
    ]},

    { t: "code", lang: "sql", title: "Arrays as a native type, where the engine has them",
      code: `-- PostgreSQL and DuckDB arrays: a typed list in a column, indexable with GIN, unnested like JSON arrays
SELECT ARRAY[1, 2, 3] AS arr, (ARRAY[1, 2, 3])[2] AS second, 2 = ANY(ARRAY[1, 2, 3]) AS has_two;
-- {1,2,3} | 2 | true                   (PostgreSQL arrays are 1-based; DuckDB lists are 1-based too; BigQuery arrays are 0-based via OFFSET)

-- membership across a column of arrays, and the explode
SELECT customer_id FROM customer_orders WHERE 108 = ANY(order_ids);           -- which customer's array holds order 108
SELECT customer_id, o FROM customer_orders, UNNEST(order_ids) AS u(o);        -- one row per (customer, order)

-- the same judgement applies: an array that is joined or aggregated across rows is a child table with a foreign key.
-- an array that is read whole -- tags on a post, coordinates of a path -- is fine as it is.`,
      caption: "A typed array is stricter than a JSON array — the elements share a type and `= ANY` is indexable with GIN — and it carries the same modelling question. `UNNEST` is the escape hatch in both directions; a foreign key is the alternative it should make you consider."
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "From a payload to a report, and back to a document",
      difficulty: "advanced",
      minutes: 28,
      body: [
        { t: "p", text: "Using the `meta` documents from section 01 joined to `orders`: **(1)** revenue per channel for paid orders, with orders lacking a channel key reported as `'unknown'`. **(2)** The most-used tag across paid orders, counting each tag once per order. **(3)** For each order, a document containing the order id, the customer name, the channel, and an array of `{product, qty}` objects — with an empty array, not `[null]`, for any order without items. **(4)** State which two indexes you would create for a table of these documents if the two hot queries were 'orders by channel' and 'orders with tag X'." }
      ],
      requirements: [
        "`->>` with COALESCE for (1); `jsonb_array_elements_text` (or UNNEST) with COUNT DISTINCT for (2).",
        "`jsonb_build_object` and `jsonb_agg … FILTER` with COALESCE to `'[]'` for (3).",
        "The index DDL and the predicate shape each serves for (4).",
        "Verified output for (1)–(3) on the four meta documents."
      ],
      hint: "Orders 100, 101, 102 and 104 have documents; join them to order_items for revenue and products for names. Order 101's tags array is empty and 104 has no tags key — both should contribute nothing to (2). For (3), the [null] trap is the padding of a LEFT JOIN inside jsonb_agg.",
      solution: {
        lang: "sql",
        title: "json_report.sql",
        code: `WITH meta(order_id, doc) AS (VALUES
  (100, '{"channel": "web", "coupon": {"code": "SPRING", "pct": 10}, "tags": ["gift", "rush"]}'::jsonb),
  (101, '{"channel": "app", "tags": []}'::jsonb),
  (102, '{"channel": "web", "coupon": {"code": "WELCOME", "pct": 15}, "tags": ["rush"]}'::jsonb),
  (104, '{"channel": "store"}'::jsonb)
)
-- (1) revenue per channel
SELECT COALESCE(m.doc->>'channel', 'unknown') AS channel, SUM(oi.qty * oi.unit_price) AS revenue
FROM   orders o JOIN order_items oi ON oi.order_id = o.order_id LEFT JOIN meta m ON m.order_id = o.order_id
WHERE  o.status = 'paid'
GROUP  BY 1 ORDER BY revenue DESC;
-- unknown 409.50 (the six orders with no document) · web 118.00 (100 + 102) · app 85.00 · store 85.40

-- (2) the most-used tag, once per order
SELECT t.tag, COUNT(DISTINCT m.order_id) AS orders
FROM   meta m JOIN orders o ON o.order_id = m.order_id AND o.status = 'paid'
CROSS  JOIN LATERAL jsonb_array_elements_text(m.doc->'tags') AS t(tag)
GROUP  BY t.tag ORDER BY orders DESC, t.tag LIMIT 1;
-- rush | 2

-- (3) a document per order with a nested items array
SELECT jsonb_build_object(
         'order_id', o.order_id, 'customer', c.name, 'channel', m.doc->>'channel',
         'items', COALESCE(jsonb_agg(jsonb_build_object('product', p.name, 'qty', oi.qty) ORDER BY p.name)
                           FILTER (WHERE oi.product_id IS NOT NULL), '[]'::jsonb)) AS doc
FROM   orders o JOIN customers c ON c.customer_id = o.customer_id
LEFT   JOIN meta m ON m.order_id = o.order_id
LEFT   JOIN order_items oi ON oi.order_id = o.order_id LEFT JOIN products p ON p.product_id = oi.product_id
WHERE  o.order_id IN (100, 104)
GROUP  BY o.order_id, c.name, m.doc ORDER BY o.order_id;
-- {"order_id": 100, "customer": "Asha",  "channel": "web",   "items": [{"product": "Kettle", "qty": 1}, {"product": "Notebook", "qty": 3}]}
-- {"order_id": 104, "customer": "Emeka", "channel": "store", "items": [{"product": "Kettle", "qty": 1}, {"product": "Notebook", "qty": 2}, {"product": "Toaster", "qty": 1}]}

-- (4) the two indexes
CREATE INDEX orders_meta_channel ON orders_meta ((doc->>'channel'));      -- serves WHERE doc->>'channel' = 'web'
CREATE INDEX orders_meta_gin ON orders_meta USING GIN (doc jsonb_path_ops); -- serves WHERE doc @> '{"tags": ["rush"]}'
-- the tag query must be written as containment to use the GIN; a LIKE on doc::text would use neither`,
        notes: [
          { t: "p", text: "**(1) LEFT JOINs the documents to the orders**, not the other way round, so the six orders without metadata are counted as `'unknown'` rather than dropped — the report's total still reconciles to 697.90." },
          { t: "p", text: "**(2) counts DISTINCT order ids per tag**, which does nothing on this data and would matter the day a document listed the same tag twice. Orders 101 and 104 produce no rows from the LATERAL — an empty array and a missing key both unfold to nothing." },
          { t: "p", text: "**(3) uses FILTER on the aggregate and COALESCE to `'[]'`** so an order with no items would get an empty array. Without FILTER, the LEFT JOIN's padded row becomes `[{\"product\": null, \"qty\": null}]` — the same padding problem as COUNT(*) in 2.2, inside a document." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "`SELECT (doc->>'pct')::INTEGER FROM orders_meta` fails on one row. What is the likely cause, and what is the defensive form?",
          options: [
            "The column is json rather than jsonb",
            "Some document holds a non-numeric value under pct — JSON has no schema, so nothing stopped it; test with jsonb_typeof or a regex CASE before casting, or promote pct to a typed column",
            "->> cannot be cast",
            "The key is missing, which raises an error"
          ],
          answer: 1,
          why: "A missing key gives NULL, which casts fine. A present key with the wrong kind of value is the failure — and it is exactly the class of error a typed column with a CHECK constraint would have refused at write time."
        }
      ]
    }
  ],

  takeaways: [
    "**Use `jsonb`, not `json`**: parsed, indexable, deduplicated keys.",
    "**`->` returns JSON, `->>` returns text; walk objects with `->` and finish with `->>`, then cast.** A missing key is NULL, not an error.",
    "**`@>` is containment and the predicate shape a GIN index serves**; `->>` equality is served by an expression index and not by GIN.",
    "**Explode arrays with `jsonb_array_elements` / `UNNEST` in a LATERAL**; fold rows with `jsonb_agg` / `ARRAY_AGG`.",
    "**`jsonb_agg` over a LEFT JOIN produces `[null]` for the padded row** — FILTER on the key and COALESCE to `'[]'`.",
    "**An expression index on one field is a B-tree; a GIN index on the document answers containment and existence on any field.**",
    "**The query's predicate must match the index's shape exactly** — same expression for the B-tree, containment for GIN.",
    "**A field that is filtered, joined, grouped or constrained is a column**; a queried array is a child table.",
    "**The hybrid is normal**: hot fields as columns, the long tail in `jsonb`, generated columns to promote without touching writers.",
    "**Typed arrays are stricter than JSON arrays and raise the same modelling question**; `= ANY` and `UNNEST` are the tools, a foreign key the alternative."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A GIN index exists on `doc`, yet `WHERE doc->>'channel' = 'web'` does a sequential scan. Why?",
        options: [
          "GIN indexes are read-only",
          "GIN serves containment and existence operators (`@>`, `?`), not text extraction; write `doc @> '{\"channel\": \"web\"}'`, or add an expression index on `(doc->>'channel')`",
          "The index needs ANALYZE",
          "->> is not indexable at all"
        ],
        answer: 1,
        why: "An index answers the operators it was built for. The inverted index over keys and values knows nothing about the text a `->>` expression produces; a B-tree on that expression does."
      },
      {
        stem: "What does `jsonb_agg(jsonb_build_object('id', o.order_id))` return for a customer with no orders after a LEFT JOIN?",
        options: [
          "`[]`",
          "`[{\"id\": null}]` — the outer join's padded row is aggregated like any other; add FILTER (WHERE o.order_id IS NOT NULL) and COALESCE to '[]'",
          "NULL",
          "An error"
        ],
        answer: 1,
        why: "The padded row exists and has NULL columns; the aggregate faithfully builds an object from it. The fix is the JSON form of COUNT(column) rather than COUNT(*)."
      },
      {
        stem: "When should a JSON field become a real column?",
        options: [
          "Never — JSON is more flexible",
          "When queries filter, join, group or sort on it, or it needs a type or a constraint: then it wants an index, statistics and a NOT NULL that JSON cannot give",
          "Only if it is numeric",
          "When the document exceeds 1 KB"
        ],
        answer: 1,
        why: "JSON is for attributes that vary and payloads read whole. A field with a stable meaning that queries depend on is a column in disguise; a generated column promotes it without changing the writers."
      },
      {
        stem: "Order 101's `tags` is `[]` and order 104 has no `tags` key. What does `jsonb_array_elements_text(doc->'tags')` produce for each in a CROSS JOIN LATERAL?",
        options: [
          "One row each with NULL",
          "No rows for either — an empty array has no elements and a NULL array unfolds to nothing; use LEFT JOIN LATERAL … ON TRUE if every order must appear",
          "One row for 101, an error for 104",
          "An error for both"
        ],
        answer: 1,
        why: "A CROSS JOIN LATERAL drops parent rows whose subquery yields nothing, like an inner join. The LEFT form keeps them with a NULL element."
      },
      {
        stem: "Why prefer `jsonb` over `json` in PostgreSQL?",
        options: [
          "json is deprecated",
          "jsonb is stored parsed: querying it does not re-parse text, duplicate keys are resolved, and GIN indexes can be built on it; json preserves the exact original text, which matters only for archival",
          "jsonb supports larger documents",
          "They are identical"
        ],
        answer: 1,
        why: "The binary form trades exact text fidelity for speed and indexability. Unless you must reproduce the bytes you received, jsonb is the type."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "How do you query a field inside a JSON column, and how do you make it fast?",
        strong: "In PostgreSQL, doc->>'field' extracts it as text and doc->'a'->>'b' walks into a nested object; the result is text, so I cast it, defensively if others write the data. Arrays unfold with jsonb_array_elements in a LATERAL join. To make a predicate fast I match the index to the predicate's shape: an expression index on (doc->>'field') for equality and ranges on one field, or a GIN index on the whole document for containment with @> and key-existence with ? across any field. A ->> predicate will not use the GIN and an @> predicate will not use the B-tree, so I EXPLAIN to check. And if the field is queried often enough to need an index, it is usually a column in disguise.",
        answer: [
          { t: "p", text: "Matching predicate shape to index type is the practical knowledge; the closing point shows judgement about the schema." }
        ]
      },
      {
        level: "core",
        q: "When would you store data as JSON rather than in normalised tables?",
        strong: "When the attributes genuinely vary by row and most rows have different ones; when I am storing a payload as received before I know how it will be used; when a client reads the record whole by key and does the parsing. I would not when queries filter, join, group or sort on a field, when a value needs a type, a NOT NULL or a foreign key, or when the planner needs statistics on it. The usual answer is a hybrid: the fields every query touches as columns, the long tail in a jsonb column next to them, and a generated column to promote a field the moment a production query starts using it.",
        answer: [
          { t: "p", text: "The hybrid, and the promotion path, are what turn a preference into an engineering answer." }
        ]
      },
      {
        level: "advanced",
        q: "An API returns each customer with a nested list of their orders. How do you produce that in one query, and what goes wrong?",
        strong: "jsonb_build_object for the customer with a jsonb_agg of jsonb_build_object per order, grouped by customer, ordered inside the aggregate so the array is deterministic. Two things go wrong. A LEFT JOIN to keep customers without orders pads a row of NULLs, and jsonb_agg turns it into an array containing one null object — FILTER (WHERE order_id IS NOT NULL) on the aggregate and COALESCE to an empty array fix it. And a second one-to-many — items per order — cannot be aggregated in the same GROUP BY without fan-out; it has to be aggregated to one document per order in a subquery or CTE first, then aggregated again per customer, the same rule as 2.2 applied to documents.",
        answer: [
          { t: "p", text: "Recognising the [null] padding and the nested fan-out as the same two outer-join traps from the joins module is the sign of transferred understanding." }
        ]
      }
    ]
  }
});
