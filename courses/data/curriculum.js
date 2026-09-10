/* ============================================================================
   DATA HANDLING — CURRICULUM
   ----------------------------------------------------------------------------
   Eight modules, in the order the work actually happens: the array, the frame,
   getting real files in, finding out what is wrong with them, building
   features, and not leaking.

   Every lesson works on data that is broken in a specific, named way. Clean
   data teaches nothing, because the decisions that matter are all made in
   the presence of a problem.
   ========================================================================= */
(function () {
  EC.defineCourse({
    id: "data",
    title: "Data Handling",
    short: "DH",
    blurb: "NumPy, pandas and SQL, then cleaning and feature engineering — with the leakage that quietly invalidates the lot.",

    published: ["1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "2.1", "2.2", "2.3", "2.4", "2.5", "2.6", "3.1", "3.2", "3.3"],

    modules: [

      /* ================================================================
         PHASE 1 · THE ARRAY — foundations
         ================================================================ */
      {
        id: "numpy",
        short: "M1",
        dir: "01_numpy",
        phase: "Phase 1 · The array",
        title: "NumPy and the Array Model",
        blurb: "The memory model underneath every data library you will use, and the three behaviours that surprise people.",
        outcome: "You can predict an array's shape, dtype and whether an operation copied — before running it.",
        lessons: [
          { id: "1.1", title: "The ndarray: dtype, shape and strides", difficulty: "foundation", minutes: 34, tier: "must",
            summary: "One contiguous block of memory plus a description of how to walk it — which is what makes reshape free and a Python list slow.",
            keywords: ["ndarray", "dtype", "shape", "strides", "contiguous", "memory"] },
          { id: "1.2", title: "Vectorisation and Broadcasting", difficulty: "core", minutes: 38, tier: "must",
            summary: "Why the loop you removed was the whole speedup, and the shape rules that decide whether two arrays combine or raise.",
            keywords: ["vectorisation", "broadcasting", "ufunc", "shape rules", "performance"] },
          { id: "1.3", title: "Indexing, Views and Copies", difficulty: "core", minutes: 36, tier: "must",
            summary: "Basic indexing gives a view and fancy indexing gives a copy — a distinction that silently decides whether your write lands.",
            keywords: ["view", "copy", "fancy indexing", "boolean mask", "base", "aliasing"] },
          { id: "1.4", title: "Axes, Reductions and Keepdims", difficulty: "core", minutes: 32, tier: "must",
            summary: "What `axis=0` actually means, why it is the axis that disappears, and when keepdims saves you from a broadcast bug.",
            keywords: ["axis", "reduction", "keepdims", "aggregation", "nan handling"] },
          { id: "1.5", title: "Random Numbers and Reproducibility", difficulty: "core", minutes: 30, tier: "should",
            summary: "Generators against the legacy global state, why a seed is not enough, and where reproducibility genuinely breaks.",
            keywords: ["rng", "seed", "default_rng", "reproducibility", "sampling"] },
          { id: "1.6", title: "Where NumPy Is the Wrong Tool", difficulty: "advanced", minutes: 30, tier: "should",
            summary: "Ragged data, strings, growing arrays and out-of-core sizes — four cases where reaching for NumPy makes things worse.",
            keywords: ["object dtype", "ragged", "memory", "out of core", "alternatives"] }
        ]
      },

      /* ================================================================
         PHASE 1 · THE ARRAY — everything else NumPy does
         ================================================================ */
      {
        id: "arrays",
        short: "M2",
        dir: "02_arrays",
        phase: "Phase 1 · The array",
        title: "NumPy for Real Work",
        blurb: "The operations you reach for once the basics are automatic — combining, ordering, linear algebra, and writing your own vectorised kernel.",
        outcome: "You can express most array work without a Python loop, and know which routine to reach for.",
        lessons: [
          { id: "2.1", title: "Combining and Splitting Arrays", difficulty: "core", minutes: 32, tier: "must",
            summary: "concatenate, stack, hstack and the axis argument that decides between them — plus why one of them is almost always the wrong call.",
            keywords: ["concatenate", "stack", "vstack", "hstack", "split", "tile", "repeat"] },
          { id: "2.2", title: "Sorting, Searching and Set Operations", difficulty: "core", minutes: 34, tier: "must",
            summary: "argsort as the workhorse, searchsorted for binary search on sorted data, and the set operations that replace a loop over membership.",
            keywords: ["sort", "argsort", "searchsorted", "unique", "intersect1d", "isin", "partition"] },
          { id: "2.3", title: "Linear Algebra and einsum", difficulty: "advanced", minutes: 38, tier: "must",
            summary: "matmul against multiply, solve against inverse, and the notation that expresses any contraction in one readable line.",
            keywords: ["matmul", "linalg", "solve", "svd", "eig", "einsum", "condition number"] },
          { id: "2.4", title: "Structured Arrays, Records and Masks", difficulty: "advanced", minutes: 32, tier: "should",
            summary: "Heterogeneous rows without a DataFrame, masked arrays for missing values, and when either is genuinely the right choice.",
            keywords: ["structured array", "record array", "compound dtype", "masked array", "fields"] },
          { id: "2.5", title: "Writing Your Own Vectorised Operation", difficulty: "advanced", minutes: 34, tier: "should",
            summary: "ufunc methods, `out=` and `where=`, frompyfunc, and where numba is the honest answer instead.",
            keywords: ["ufunc", "reduce", "accumulate", "outer", "out parameter", "frompyfunc", "numba"] },
          { id: "2.6", title: "Convolution, Windows and Numerical Methods", difficulty: "advanced", minutes: 34, tier: "should",
            summary: "Moving averages, gradients, integration and the FFT — array operations from signal processing that end up in feature code.",
            keywords: ["convolve", "gradient", "trapezoid", "fft", "sliding window", "polyfit"] }
        ]
      },

      /* ================================================================
         PHASE 2 · THE FRAME — pandas core
         ================================================================ */
      {
        id: "pandas",
        short: "M3",
        dir: "03_pandas",
        phase: "Phase 2 · The frame",
        title: "Pandas and the Frame",
        blurb: "The index is the whole library. Understanding it turns most pandas confusion into something predictable.",
        outcome: "You can select, reshape and join without guessing, and explain why a warning appeared.",
        lessons: [
          { id: "3.1", title: "Series, DataFrame and the Index", difficulty: "foundation", minutes: 34, tier: "must",
            summary: "The index is not row numbers — it is a label set that aligns every operation, and alignment explains most surprising results.",
            keywords: ["series", "dataframe", "index", "alignment", "multiindex"] },
          { id: "3.2", title: "Selection: loc, iloc and the Traps", difficulty: "core", minutes: 36, tier: "must",
            summary: "Label against position, why chained indexing is a coin flip, and what SettingWithCopyWarning is actually telling you.",
            keywords: ["loc", "iloc", "chained indexing", "SettingWithCopyWarning", "view"] },
          { id: "3.3", title: "dtypes, Memory and Categoricals", difficulty: "core", minutes: 34, tier: "must",
            summary: "Why a column of ten distinct strings costs 65 MB, and the three dtype changes that usually cut a frame by 90%.",
            keywords: ["dtype", "category", "memory usage", "downcast", "nullable", "object"] },
          { id: "3.4", title: "Missing Data and the Three Representations", difficulty: "core", minutes: 34, tier: "must",
            summary: "NaN, None and NaT behave differently, propagate differently and compare differently — including to themselves.",
            keywords: ["nan", "none", "nat", "pd.NA", "isna", "propagation"] },
          { id: "3.5", title: "Reshaping: pivot, melt and stack", difficulty: "core", minutes: 34, tier: "must",
            summary: "Long against wide, which operations need which, and how to get back without losing a column to the index.",
            keywords: ["pivot", "melt", "stack", "unstack", "crosstab", "explode", "long", "wide"] },
          { id: "3.6", title: "Joins and Merges", difficulty: "core", minutes: 38, tier: "must",
            summary: "The five join types, the row-count check that catches a duplicated key, and why your frame grew after an inner join.",
            keywords: ["merge", "join", "concat", "cardinality", "validate", "indicator", "suffixes"] },
          { id: "3.7", title: "Duplicates, Ranking and Counting", difficulty: "core", minutes: 30, tier: "should",
            summary: "value_counts, rank, nunique and drop_duplicates — the four operations every profiling script is built from, and their edges.",
            keywords: ["value_counts", "duplicated", "rank", "nunique", "cumulative", "normalize"] }
        ]
      },

      /* ================================================================
         PHASE 2 · THE FRAME — aggregation and time
         ================================================================ */
      {
        id: "groupby",
        short: "M4",
        dir: "04_groupby",
        phase: "Phase 2 · The frame",
        title: "Grouping, Windows and Time",
        blurb: "Where pandas earns its keep, and where a single `apply` turns a two-second job into a twenty-minute one.",
        outcome: "You can express any aggregation without a loop and say what shape it will return.",
        lessons: [
          { id: "4.1", title: "GroupBy: Split, Apply, Combine", difficulty: "core", minutes: 38, tier: "must",
            summary: "The three-step model, what the group keys do to your index, and the observed= argument that decides whether the result explodes.",
            keywords: ["groupby", "split apply combine", "as_index", "observed", "dropna", "grouper"] },
          { id: "4.2", title: "agg, transform, filter and apply", difficulty: "core", minutes: 36, tier: "must",
            summary: "Four verbs with four output shapes — and why `apply` is the slowest and most reached-for of them.",
            keywords: ["agg", "transform", "filter", "apply", "named aggregation", "broadcast"] },
          { id: "4.3", title: "Rolling, Expanding and Window Functions", difficulty: "advanced", minutes: 36, tier: "must",
            summary: "Moving statistics that do not peek at the future, time-based windows, and the shift that separates a feature from a leak.",
            keywords: ["rolling", "expanding", "ewm", "shift", "window", "min_periods", "closed"] },
          { id: "4.4", title: "Time Series: Resampling and Offsets", difficulty: "advanced", minutes: 38, tier: "must",
            summary: "DatetimeIndex, frequency strings, resampling up and down, and the timezone handling that decides whether a daily total is right.",
            keywords: ["datetimeindex", "resample", "asfreq", "offset", "timezone", "period", "business day"] },
          { id: "4.5", title: "String Operations at Scale", difficulty: "core", minutes: 32, tier: "should",
            summary: "The `.str` accessor, regex extraction, and why the same operation is 30× faster on one dtype than another.",
            keywords: ["str accessor", "regex", "extract", "split", "normalisation", "fuzzy"] },
          { id: "4.6", title: "Method Chaining and Readable Pipelines", difficulty: "core", minutes: 30, tier: "should",
            summary: "assign, pipe and query — building a transformation you can read top to bottom without naming eleven intermediate frames.",
            keywords: ["assign", "pipe", "query", "eval", "chaining", "debugging"] }
        ]
      },

      /* ================================================================
         PHASE 3 · GETTING DATA IN, AND TRUSTING IT — ingestion
         ================================================================ */
      {
        id: "ingest",
        short: "M5",
        dir: "05_ingest",
        phase: "Phase 3 · Getting data in, and trusting it",
        title: "Reading Data As It Arrives",
        blurb: "Real files are badly encoded, inconsistently typed and larger than memory. Every default in a reader is a decision someone made for you.",
        outcome: "You can load an unfamiliar source correctly, and say what each reader option changed.",
        lessons: [
          { id: "5.1", title: "CSV and the Parsing Decisions", difficulty: "core", minutes: 36, tier: "must",
            summary: "Type inference, thousands separators, dates and the leading-zero column that becomes an integer — with the options that fix each.",
            keywords: ["read_csv", "dtype", "parse_dates", "na_values", "type inference", "chunksize"] },
          { id: "5.2", title: "Encoding, Line Endings and Files That Break", difficulty: "core", minutes: 32, tier: "must",
            summary: "Mojibake, BOMs, embedded newlines and the Excel export that quietly corrupted every identifier.",
            keywords: ["encoding", "utf-8", "bom", "mojibake", "excel", "line endings", "quoting"] },
          { id: "5.3", title: "JSON and Nested Data", difficulty: "core", minutes: 34, tier: "should",
            summary: "Flattening nested records without losing the ones shaped differently, and when a relational split beats a wide frame.",
            keywords: ["json", "json_normalize", "nested", "explode", "jsonl", "schema drift"] },
          { id: "5.4", title: "Parquet, Arrow and Columnar Formats", difficulty: "core", minutes: 34, tier: "must",
            summary: "Why columnar storage reads one column in a tenth the time, and what a row-group and a predicate pushdown actually do.",
            keywords: ["parquet", "arrow", "columnar", "compression", "row group", "predicate pushdown", "partitioning"] },
          { id: "5.5", title: "SQL: The Queries a Pipeline Is Built On", difficulty: "core", minutes: 38, tier: "must",
            summary: "Execution order, join semantics, NULL three-valued logic and the GROUP BY rules — the SQL that decides whether your extract is right.",
            keywords: ["sql", "join", "null", "group by", "having", "execution order", "distinct"] },
          { id: "5.6", title: "Window Functions and Analytical SQL", difficulty: "advanced", minutes: 38, tier: "must",
            summary: "OVER, PARTITION BY and frames — the deduplication, ranking and running-total patterns that belong in the database, not in pandas.",
            keywords: ["window function", "over", "partition by", "row_number", "lag", "cte", "frame clause"] },
          { id: "5.7", title: "Databases, Chunking and Pushing Work Down", difficulty: "advanced", minutes: 34, tier: "should",
            summary: "Pulling a table that does not fit in memory, why `SELECT *` into pandas is usually the wrong move, and how to know what the engine did.",
            keywords: ["read_sql", "chunksize", "server side cursor", "pushdown", "explain", "index", "parameterised"] }
        ]
      },

      /* ================================================================
         PHASE 3 · GETTING DATA IN, AND TRUSTING IT — quality
         ================================================================ */
      {
        id: "quality",
        short: "M6",
        dir: "06_quality",
        phase: "Phase 3 · Getting data in, and trusting it",
        title: "Cleaning and Quality",
        blurb: "Finding what is wrong before it reaches a model, and deciding what to do about it in a way you can defend.",
        outcome: "You can profile an unfamiliar dataset, name its problems, and justify each fix.",
        lessons: [
          { id: "6.1", title: "Profiling a Dataset You Have Not Seen", difficulty: "core", minutes: 36, tier: "must",
            summary: "The first fifteen minutes: shape, dtypes, missingness, cardinality, ranges and the checks that catch a broken export.",
            keywords: ["profiling", "eda", "describe", "cardinality", "sanity checks", "univariate"] },
          { id: "6.2", title: "Bivariate and Multivariate Analysis", difficulty: "core", minutes: 34, tier: "should",
            summary: "Correlation and its three flavours, association measures for categorical pairs, and the structure a pairwise view cannot show.",
            keywords: ["correlation", "spearman", "cramers v", "mutual information", "collinearity", "vif"] },
          { id: "6.3", title: "Data Quality Dimensions", difficulty: "core", minutes: 32, tier: "should",
            summary: "Completeness, validity, consistency, uniqueness, timeliness and accuracy — each with a test you can automate.",
            keywords: ["completeness", "validity", "consistency", "uniqueness", "accuracy", "assertions"] },
          { id: "6.4", title: "Duplicates: Exact, Fuzzy and Semantic", difficulty: "core", minutes: 34, tier: "must",
            summary: "Three kinds, three detection methods, and why deduplicating on a hash quietly drops legitimate rows.",
            keywords: ["duplicates", "drop_duplicates", "fuzzy matching", "record linkage", "blocking", "levenshtein"] },
          { id: "6.5", title: "Missing Data: MCAR, MAR and MNAR", difficulty: "advanced", minutes: 36, tier: "must",
            summary: "The mechanism decides whether dropping rows is harmless or introduces the bias you were trying to avoid.",
            keywords: ["mcar", "mar", "mnar", "missingness", "mechanism", "bias"] },
          { id: "6.6", title: "Imputation and What It Costs", difficulty: "advanced", minutes: 36, tier: "must",
            summary: "Mean, median, model-based and indicator approaches — and the variance every one of them destroys.",
            keywords: ["imputation", "simpleimputer", "knn", "iterative", "missing indicator", "variance"] },
          { id: "6.7", title: "Outliers: Finding Them", difficulty: "core", minutes: 34, tier: "must",
            summary: "IQR, z-scores, robust z-scores and Mahalanobis distance — with the multivariate case a univariate check cannot see.",
            keywords: ["outlier", "iqr", "z score", "mahalanobis", "isolation forest", "multivariate"] },
          { id: "6.8", title: "Outliers: What To Do About Them", difficulty: "advanced", minutes: 32, tier: "must",
            summary: "Remove, cap, transform or keep — a decision about whether the point is wrong, not whether it is unusual.",
            keywords: ["winsorize", "clipping", "removal", "robust models", "documentation"] }
        ]
      },

      /* ================================================================
         PHASE 4 · TURNING DATA INTO FEATURES — engineering
         ================================================================ */
      {
        id: "features",
        short: "M7",
        dir: "07_features",
        phase: "Phase 4 · Turning data into features",
        title: "Feature Engineering",
        blurb: "The part that moves a model more than the algorithm does, and the part where leakage is easiest to introduce.",
        outcome: "You can encode, scale and derive features that survive contact with unseen data.",
        lessons: [
          { id: "7.1", title: "Categorical Encoding: The Full Map", difficulty: "core", minutes: 40, tier: "must",
            summary: "One-hot, ordinal, frequency, binary, hashing and rare-label — with the cardinality and model type that decide between them.",
            keywords: ["one hot", "ordinal", "frequency encoding", "hashing", "binary encoding", "rare label", "cardinality"] },
          { id: "7.2", title: "Target Encoding Without Leaking", difficulty: "expert", minutes: 38, tier: "must",
            summary: "The most powerful encoding and the easiest to get catastrophically wrong — with out-of-fold, leave-one-out and smoothing done properly.",
            keywords: ["target encoding", "mean encoding", "smoothing", "out of fold", "leave one out", "catboost", "leakage"] },
          { id: "7.3", title: "Weight of Evidence and Information Value", difficulty: "advanced", minutes: 34, tier: "should",
            summary: "The credit-scoring encoding that makes a logistic model monotonic, and the IV table that ranks features before you fit anything.",
            keywords: ["weight of evidence", "woe", "information value", "iv", "monotonic binning", "scorecard"] },
          { id: "7.4", title: "Scaling and Normalisation", difficulty: "core", minutes: 34, tier: "must",
            summary: "Standard, min-max, robust, max-abs and quantile — which models need scaling at all, and which are unaffected.",
            keywords: ["standardscaler", "minmax", "robustscaler", "quantile", "normalisation", "l2 norm"] },
          { id: "7.5", title: "Transforms for Skew", difficulty: "core", minutes: 32, tier: "should",
            summary: "Log, square root, Box-Cox and Yeo-Johnson — and the retransformation bias that makes every forecast too low.",
            keywords: ["log transform", "box cox", "yeo johnson", "skew", "retransformation", "kurtosis"] },
          { id: "7.6", title: "Binning, Discretisation and Binarisation", difficulty: "core", minutes: 32, tier: "should",
            summary: "Equal-width, equal-frequency and supervised binning — what it buys, and the information it throws away.",
            keywords: ["binning", "discretisation", "quantile bins", "kbins", "monotonic binning", "binarizer"] },
          { id: "7.7", title: "Mixed and Messy Variables", difficulty: "core", minutes: 30, tier: "should",
            summary: "The column holding \"A21\", \"3 bed flat\" or a free-text amount — splitting one field into the two features it actually contains.",
            keywords: ["mixed variables", "extraction", "regex", "parsing", "units", "cleaning"] },
          { id: "7.8", title: "Datetime Features and Cyclical Encoding", difficulty: "core", minutes: 34, tier: "must",
            summary: "Components, elapsed time and the sine/cosine trick that stops December and January being eleven months apart.",
            keywords: ["datetime", "cyclical encoding", "elapsed time", "timezone", "seasonality", "holidays"] },
          { id: "7.9", title: "Interactions, Ratios and Aggregations", difficulty: "advanced", minutes: 36, tier: "should",
            summary: "The derived features that carry real signal, and the group-level aggregation that leaks the target if you are careless.",
            keywords: ["interaction", "polynomial", "ratio", "aggregation", "group features", "window features"] },
          { id: "7.10", title: "Text, Embeddings and High-Cardinality Features", difficulty: "advanced", minutes: 36, tier: "should",
            summary: "Bag of words, TF-IDF, hashing and entity embeddings — with the vocabulary decisions that silently overfit.",
            keywords: ["tfidf", "bag of words", "hashing", "embeddings", "vocabulary", "entity embedding", "high cardinality"] }
        ]
      },

      /* ================================================================
         PHASE 4 · TURNING DATA INTO FEATURES — discipline
         ================================================================ */
      {
        id: "discipline",
        short: "M8",
        dir: "08_discipline",
        phase: "Phase 4 · Turning data into features",
        title: "Selection, Leakage and Pipelines",
        blurb: "The discipline that decides whether your measured score means anything at all.",
        outcome: "You can build a pipeline that cannot leak, and detect the leakage in one that already did.",
        lessons: [
          { id: "8.1", title: "Feature Selection: Filter, Wrapper, Embedded", difficulty: "advanced", minutes: 36, tier: "must",
            summary: "Three families, what each costs, and why filtering on correlation discards the features a non-linear model wanted.",
            keywords: ["feature selection", "filter", "wrapper", "embedded", "mutual information", "rfe", "lasso"] },
          { id: "8.2", title: "Dimensionality Reduction", difficulty: "advanced", minutes: 36, tier: "should",
            summary: "PCA and what it actually does to your features, plus the cases where reducing dimensions destroys the signal you needed.",
            keywords: ["pca", "explained variance", "svd", "t-sne", "umap", "scaling", "interpretability"] },
          { id: "8.3", title: "Data Leakage: The Three Kinds", difficulty: "expert", minutes: 40, tier: "must",
            summary: "Target leakage, train-test contamination and temporal leakage — each with the symptom that gives it away.",
            keywords: ["leakage", "target leakage", "contamination", "temporal", "proxy", "detection"] },
          { id: "8.4", title: "Splitting Data Honestly", difficulty: "advanced", minutes: 36, tier: "must",
            summary: "Random, stratified, grouped and time-based splits — and why the wrong one flatters a model that will fail.",
            keywords: ["train test split", "stratified", "group split", "time series split", "cross validation", "nested cv"] },
          { id: "8.5", title: "Pipelines That Cannot Leak", difficulty: "advanced", minutes: 36, tier: "must",
            summary: "Fit on train, transform everywhere — enforced by construction rather than by remembering.",
            keywords: ["pipeline", "columntransformer", "fit transform", "custom transformer", "sklearn", "set_output"] },
          { id: "8.6", title: "Imbalanced Data", difficulty: "advanced", minutes: 34, tier: "should",
            summary: "Resampling, class weights and threshold choice — and why oversampling before the split invalidates everything.",
            keywords: ["imbalance", "smote", "class weight", "threshold", "resampling", "stratify", "pr curve"] },
          { id: "8.7", title: "The Data Mistakes That Ship", difficulty: "expert", minutes: 36, tier: "must",
            summary: "Every failure in this course as a shape you can recognise in someone else's notebook, with the one-line check for each.",
            keywords: ["checklist", "review", "leakage", "drift", "reproducibility", "audit", "model by model"] }
        ]
      }

    ]
  });
})();
