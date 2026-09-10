/* ============================================================================
   LESSON 2.2 — Sorting, Searching and Set Operations
   ========================================================================= */
EC.receiveLesson({
  id: "2.2",

  lede: "**`argsort` is the workhorse, not `sort`.** Sorting values discards which row they came from; sorting indices lets you reorder every other array the same way — and almost every real sorting task is really a reordering task.",

  objectives: [
    "Use `argsort` to reorder related arrays consistently",
    "Choose a sort kind, and know when stability matters",
    "Use `searchsorted` for binary search, bucketing and interval lookup",
    "Apply the set operations and know which one is O(n) and which is O(n log n)",
    "Find top-k without a full sort"
  ],

  prerequisites: ["1.3", "2.1"],

  blocks: [

    { t: "h2", n: "01", text: "Sorting values against sorting positions", id: "argsort" },

    { t: "p", text: "**`np.sort` returns sorted values; `np.argsort` returns the indices that would sort them.** The second is more useful, because indices can be applied to any array of the same length — which is how you keep a feature matrix and its labels together." },

    { t: "dl", items: [
      ["`np.sort(a)`", "A sorted **copy** of the values. `a.sort()` sorts in place and returns `None`."],
      ["`np.argsort(a)`", "The **indices** that would sort `a`, so `a[np.argsort(a)]` equals `np.sort(a)`. This is the form that generalises."],
      ["Stability", "A stable sort preserves the original relative order of equal elements. `kind=\"stable\"` guarantees it; the default `\"quicksort\"` does not."],
      ["`np.lexsort`", "Sorts by multiple keys. **The last key in the tuple is the primary one**, which is the reverse of what most people expect."],
      ["`np.searchsorted`", "Binary search on a sorted array: where would each value be inserted to keep it sorted? O(log n) per query."],
      ["`np.argpartition`", "Puts the k smallest elements before position k without fully sorting. O(n) rather than O(n log n) — the right tool for top-k."]
    ]},

    { t: "viz",
      title: "argsort gives you a reordering you can apply anywhere",
      caption: "The index array is the reusable part. Applying it to values, labels and identifiers keeps every row's fields together — which sorting each array separately would destroy.",
      svg: `<svg viewBox="0 0 880 270" role="img" aria-label="An unsorted score array, its argsort index array, and the same permutation applied to a parallel name array">
  <text x="30" y="26" class="s-label" style="fill:var(--ink-2)">scores</text>
  <g stroke-width="1.5" style="fill:var(--acc);fill-opacity:.18;stroke:var(--acc)">
    <rect x="120" y="10" width="56" height="26"/><rect x="176" y="10" width="56" height="26"/>
    <rect x="232" y="10" width="56" height="26"/><rect x="288" y="10" width="56" height="26"/>
  </g>
  <text x="140" y="28" class="s-sub" style="fill:var(--ink-2)">30</text>
  <text x="196" y="28" class="s-sub" style="fill:var(--ink-2)">10</text>
  <text x="252" y="28" class="s-sub" style="fill:var(--ink-2)">40</text>
  <text x="308" y="28" class="s-sub" style="fill:var(--ink-2)">20</text>

  <text x="30" y="82" class="s-label" style="fill:var(--good)">argsort</text>
  <g stroke-width="1.5" style="fill:var(--good);fill-opacity:.22;stroke:var(--good)">
    <rect x="120" y="64" width="56" height="26"/><rect x="176" y="64" width="56" height="26"/>
    <rect x="232" y="64" width="56" height="26"/><rect x="288" y="64" width="56" height="26"/>
  </g>
  <text x="144" y="82" class="s-sub" style="fill:var(--ink-2)">1</text>
  <text x="200" y="82" class="s-sub" style="fill:var(--ink-2)">3</text>
  <text x="256" y="82" class="s-sub" style="fill:var(--ink-2)">0</text>
  <text x="312" y="82" class="s-sub" style="fill:var(--ink-2)">2</text>
  <text x="370" y="82" class="s-sub" style="fill:var(--good)">← "take element 1, then 3, then 0, then 2"</text>

  <line x1="30" y1="106" x2="850" y2="106" style="stroke:var(--line);stroke-dasharray:3 3"/>
  <text x="30" y="132" class="s-sub" style="fill:var(--ink-3)">apply the SAME index array to every parallel array:</text>

  <text x="30" y="176" class="s-label" style="fill:var(--ink-2)">scores[idx]</text>
  <g stroke-width="1.5" style="fill:var(--acc);fill-opacity:.18;stroke:var(--acc)">
    <rect x="180" y="158" width="56" height="26"/><rect x="236" y="158" width="56" height="26"/>
    <rect x="292" y="158" width="56" height="26"/><rect x="348" y="158" width="56" height="26"/>
  </g>
  <text x="200" y="176" class="s-sub" style="fill:var(--ink-2)">10</text>
  <text x="256" y="176" class="s-sub" style="fill:var(--ink-2)">20</text>
  <text x="312" y="176" class="s-sub" style="fill:var(--ink-2)">30</text>
  <text x="368" y="176" class="s-sub" style="fill:var(--ink-2)">40</text>

  <text x="30" y="226" class="s-label" style="fill:var(--ink-2)">names[idx]</text>
  <g stroke-width="1.5" style="fill:var(--warn);fill-opacity:.18;stroke:var(--warn)">
    <rect x="180" y="208" width="56" height="26"/><rect x="236" y="208" width="56" height="26"/>
    <rect x="292" y="208" width="56" height="26"/><rect x="348" y="208" width="56" height="26"/>
  </g>
  <text x="196" y="226" class="s-sub" style="fill:var(--ink-2)">bea</text>
  <text x="252" y="226" class="s-sub" style="fill:var(--ink-2)">dev</text>
  <text x="308" y="226" class="s-sub" style="fill:var(--ink-2)">ali</text>
  <text x="364" y="226" class="s-sub" style="fill:var(--ink-2)">cam</text>
  <text x="430" y="226" class="s-sub" style="fill:var(--good)">still paired with the right score</text>
  <text x="430" y="176" class="s-sub" style="fill:var(--ink-3)">sorting names separately would break this</text>
</svg>`
    },

    { t: "code", lang: "python", title: "sorting that keeps rows together", code: `
import numpy as np

scores = np.array([30, 10, 40, 20])
names = np.array(["ali", "bea", "cam", "dev"])

np.sort(scores)               # array([10, 20, 30, 40]) -- values only
np.argsort(scores)            # array([1, 3, 0, 2]) -- the reordering

idx = np.argsort(scores)
scores[idx]                   # array([10, 20, 30, 40])
names[idx]                    # array(['bea','dev','ali','cam']) -- paired
#
# SORTING EACH ARRAY SEPARATELY IS THE BUG:
np.sort(scores), np.sort(names)      # both sorted, correspondence GONE
#
# On a feature matrix this silently pairs every row's features with a
# different row's label, and the model trains on noise while every
# shape check passes.

# DESCENDING -- NumPy has no reverse= parameter:
np.argsort(-scores)           # negate: works for numbers
np.argsort(scores)[::-1]      # reverse: works for anything
#
# THESE DIFFER ON TIES. Negating keeps ties in original order;
# reversing puts them in the opposite order. For a leaderboard that
# is the difference between stable and jittery rankings.

# IN-PLACE sort RETURNS None -- a routine mistake:
a = np.array([3, 1, 2])
b = a.sort()                  # b is None; a is now sorted
#
# a = a.sort() silently replaces the array with None.

# SORT KIND, and when it matters:
np.argsort(scores, kind="quicksort")   # default, NOT stable, fastest
np.argsort(scores, kind="stable")      # ties keep their original order
np.argsort(scores, kind="mergesort")   # an alias for stable

# STABILITY DECIDES CORRECTNESS when you sort by one key at a time:
dept = np.array(["b", "a", "b", "a"])
salary = np.array([100, 200, 150, 50])

# Sort by salary, then by dept, expecting dept-major, salary-minor:
i = np.argsort(salary, kind="stable")
i = i[np.argsort(dept[i], kind="stable")]
list(zip(dept[i], salary[i]))         # [('a',50),('a',200),('b',100),('b',150)]
#
# WITHOUT kind="stable" on the second sort, the salary ordering within
# each department is destroyed and the result is silently wrong.

# lexsort DOES IT IN ONE CALL -- note the argument order:
i = np.lexsort((salary, dept))        # LAST key is PRIMARY
list(zip(dept[i], salary[i]))         # same result
#
# The reversed order is genuinely surprising and worth a comment every
# time you write it.

# SORTING A 2-D ARRAY BY A COLUMN:
X = np.array([[3, 100], [1, 200], [2, 150]])
X[np.argsort(X[:, 0])]        # rows reordered by column 0
#
# np.sort(X, axis=0) SORTS EACH COLUMN INDEPENDENTLY and scrambles
# every row -- almost never what anyone wants on tabular data:
np.sort(X, axis=0)            # [[1,100],[2,150],[3,200]] -- rows destroyed

# TOP-K WITHOUT A FULL SORT:
big = np.random.default_rng(0).normal(size=1_000_000)

# %timeit np.sort(big)[-10:]                    -> ~60 ms  O(n log n)
# %timeit np.argpartition(big, -10)[-10:]       -> ~4 ms   O(n)
#
top10 = np.argpartition(big, -10)[-10:]         # UNORDERED
top10 = top10[np.argsort(big[top10])[::-1]]     # order just those ten
#
# argpartition only guarantees that everything after position -10 is
# larger than everything before it. Sorting the ten survivors costs
# nothing.
`,
      hl: [14, 25, 42, 68],
      caption: "**`np.sort(X, axis=0)` sorts each column independently and destroys every row.** On tabular data the operation you want is `X[np.argsort(X[:, k])]`."
    },

    { t: "callout", kind: "trap", title: "Sorting two arrays separately breaks the pairing", body: [
      { t: "p", text: "`np.sort(X)` and `np.sort(y)` both succeed, both produce sorted output, and every shape assertion passes. **Each row's features are now paired with a different row's label.**" },
      { t: "p", text: "The model trains, the loss decreases slowly, and the validation score is around chance — which looks like an underfitting problem rather than a data problem." },
      { t: "p", text: "**Compute one index array and apply it to everything.** `idx = np.argsort(key); X[idx], y[idx]` is the only form that cannot go wrong." }
    ]},

    { t: "h2", n: "02", text: "searchsorted: binary search as a vectorised primitive", id: "searchsorted" },

    { t: "p", text: "**`searchsorted` answers \"where would this value go?\" in O(log n)**, for a whole array of queries at once. It is the primitive behind bucketing, interval joins and merging sorted data — and it replaces a great many loops." },

    { t: "code", lang: "python", title: "the four things searchsorted is actually for", code: `
sorted_vals = np.array([10, 20, 30, 40, 50])

np.searchsorted(sorted_vals, 25)          # 2 -- insert before index 2
np.searchsorted(sorted_vals, [5, 25, 55]) # array([0, 2, 5]) -- vectorised

# side= DECIDES WHAT HAPPENS ON AN EXACT MATCH:
np.searchsorted(sorted_vals, 30, side="left")    # 2 -- before the 30
np.searchsorted(sorted_vals, 30, side="right")   # 3 -- after the 30
#
# THE ARRAY MUST BE SORTED. searchsorted does not check, and on
# unsorted input it returns confident nonsense:
np.searchsorted(np.array([3, 1, 2]), 2)   # 1 -- meaningless

# 1. BUCKETING -- assign values to bins in one pass:
edges = np.array([0, 18, 35, 65, 200])
ages = np.array([5, 22, 40, 70, 17])
np.searchsorted(edges, ages, side="right") - 1    # array([0,1,2,3,0])
#
# This is what np.digitize does, and what pd.cut does underneath.
# O(n log b) for n values and b bins, with no Python loop.

# 2. MEMBERSHIP ON SORTED DATA, faster than isin for large lookups:
def sorted_isin(values, lookup_sorted):
    pos = np.searchsorted(lookup_sorted, values)
    pos = np.clip(pos, 0, len(lookup_sorted) - 1)
    return lookup_sorted[pos] == values

sorted_isin(np.array([15, 20, 45]), sorted_vals)  # [False, True, False]

# 3. INTERVAL JOIN -- "which period does each event fall in?"
period_starts = np.array([0, 100, 200, 300])      # sorted
events = np.array([50, 150, 350, 99])
np.searchsorted(period_starts, events, side="right") - 1   # [0,1,3,0]
#
# THIS IS AS-OF JOIN. pandas calls it merge_asof, and it is the
# correct way to attach the most recent price to a trade, or the
# active config to a log line. The alternative -- a nested loop over
# periods -- is O(n x p) and the standard reason a backfill job takes
# hours.

# 4. RANK WITHOUT SORTING THE WHOLE ARRAY:
reference = np.sort(np.random.default_rng(0).normal(size=100_000))
new_values = np.array([-1.5, 0.0, 1.5])
np.searchsorted(reference, new_values) / len(reference)
# array([0.066, 0.500, 0.933]) -- the percentile of each new value
#
# Sort the reference ONCE, then every subsequent query is O(log n).
# This is how a monitoring system reports "today's latency is at the
# 97th percentile of the last 30 days" without re-sorting.

# THE COST MODEL, which is the reason to care:
#   np.isin(a, b)          -> sorts b, then searches. O((n+m) log m)
#   searchsorted, pre-sorted b -> O(n log m), sort done ONCE
#
# If b is a fixed lookup table used many times, sorting it once and
# calling searchsorted repeatedly is the difference between a job that
# scales and one that does not.
`,
      hl: [13, 24, 37, 54],
      caption: "**`searchsorted` on sorted period starts is an as-of join** — the correct way to attach the most recent price to a trade, and O(n log p) rather than the nested loop's O(n × p)."
    },

    { t: "h2", n: "03", text: "Set operations", id: "sets" },

    { t: "p", text: "NumPy's set operations work on sorted unique values, which makes them fast and gives them **one property that surprises people: they sort the output**, so the input order is not preserved." },

    { t: "table",
      head: ["Operation", "Returns", "Cost", "Note"],
      rows: [
        ["`np.unique(a)`", "Sorted distinct values", "O(n log n)", "`return_counts`, `return_index`, `return_inverse` are the useful part"],
        ["`np.isin(a, b)`", "Boolean mask the shape of `a`", "O((n+m) log m)", "Preserves `a`'s order — the only one that does"],
        ["`np.intersect1d(a, b)`", "Sorted values in both", "O(n log n)", "`assume_unique=True` skips the dedupe and is much faster"],
        ["`np.union1d(a, b)`", "Sorted values in either", "O(n log n)", "Equivalent to `unique(concatenate(...))`"],
        ["`np.setdiff1d(a, b)`", "Sorted values in `a` not `b`", "O(n log n)", "Not symmetric — order of arguments matters"],
        ["`np.setxor1d(a, b)`", "Sorted values in exactly one", "O(n log n)", "Rarely what you want; usually you mean setdiff"]
      ],
      caption: "**Only `isin` preserves input order.** Every other set operation returns sorted unique values, which is why using `intersect1d` to filter a dataset silently reorders it."
    },

    { t: "code", lang: "python", title: "unique and its three return values", code: `
labels = np.array(["b", "a", "c", "a", "b", "a"])

np.unique(labels)                         # ['a','b','c'] -- SORTED

vals, counts = np.unique(labels, return_counts=True)
dict(zip(vals, counts))                   # {'a': 3, 'b': 2, 'c': 1}
#
# This is value_counts, in one call, without pandas.

vals, first = np.unique(labels, return_index=True)
first                                     # [1, 0, 2] -- FIRST occurrence

vals, inverse = np.unique(labels, return_inverse=True)
inverse                                   # [1, 0, 2, 0, 1, 0]
vals[inverse]                             # reconstructs the original
#
# return_inverse IS LABEL ENCODING. The inverse array is the integer
# code for each row, and vals is the lookup table -- which is exactly
# what a categorical dtype stores.

# COMBINING THEM GIVES GROUPED AGGREGATION WITHOUT A LOOP:
values = np.array([10, 20, 30, 40, 50, 60])
groups, inverse = np.unique(labels, return_inverse=True)
totals = np.bincount(inverse, weights=values)
dict(zip(groups, totals))                 # {'a': 110.0, 'b': 60.0, 'c': 30.0}

# unique ON ROWS, not elements:
X = np.array([[1, 2], [3, 4], [1, 2], [5, 6]])
np.unique(X, axis=0)                      # three distinct rows
#
# WITHOUT axis=0 it flattens and returns unique SCALARS -- a routine
# mistake when deduplicating a feature matrix:
np.unique(X)                              # [1,2,3,4,5,6] -- not rows

# isin PRESERVES ORDER; intersect1d DOES NOT:
a = np.array([50, 10, 30, 20])
b = np.array([10, 30])

a[np.isin(a, b)]                          # [10, 30] -- a's order
np.intersect1d(a, b)                      # [10, 30] -- sorted order
#
# They agree here by coincidence. On a = [30, 10] they do not, and
# using intersect1d to filter a dataset silently reorders it -- which
# breaks anything relying on row order matching a parallel array.

# assume_unique IS A REAL SPEEDUP AND A REAL FOOTGUN:
big_a = np.arange(1_000_000)
big_b = np.arange(500_000, 1_500_000)

# %timeit np.intersect1d(big_a, big_b)                      -> ~180 ms
# %timeit np.intersect1d(big_a, big_b, assume_unique=True)  -> ~40 ms
#
# It skips the deduplication step. If the inputs are NOT unique the
# result is wrong, with no error -- so only pass it where uniqueness
# is guaranteed by construction, not by inspection.

# THE isin ALTERNATIVE for a small lookup set is a Python set:
lookup = {10, 30}
# For fewer than ~50 values a set membership test in a comprehension
# can beat np.isin. Above that, isin wins clearly. Measure rather than
# assume, because the crossover moves with dtype.
`,
      hl: [19, 33, 44, 55],
      caption: "**`np.unique(X)` without `axis=0` flattens and returns unique scalars.** Deduplicating a feature matrix needs the axis argument, and forgetting it produces a 1-D array that fails much later."
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "Attach the most recent price to each trade",
      difficulty: "advanced",
      minutes: 28,
      body: [
        { t: "p", text: "You have a price feed and a trade log. Each trade needs the most recent price at or before its timestamp — an as-of join. The current implementation loops and takes eleven minutes on a day's data." },
        { t: "code", lang: "python", numbered: false, title: "the current version", code: `
def attach_prices(trade_times, price_times, prices):
    out = np.empty(len(trade_times))
    for i, t in enumerate(trade_times):
        valid = price_times[price_times <= t]
        out[i] = prices[len(valid) - 1] if len(valid) else np.nan
    return out`},
        { t: "p", text: "Rewrite it without a loop, handle the edge cases the original gets wrong, and say what the complexity was and now is." }
      ],
      requirements: [
        "Vectorise with searchsorted; no Python loop over trades.",
        "Handle trades before the first price.",
        "Handle exact timestamp matches deliberately and say which side you chose.",
        "Add a staleness limit — a price from six hours ago is not a price.",
        "State the complexity before and after.",
        "Include tests covering every edge case."
      ],
      hint: "`side` decides what happens when a trade lands exactly on a price tick. Both choices are defensible; only one is right for this problem.",
      solution: {
        lang: "python",
        title: "asof.py",
        code: `import numpy as np


# =========================================================================
# WHY THE ORIGINAL IS SLOW
# =========================================================================
#
# price_times[price_times <= t] scans the ENTIRE price array for every
# trade, and allocates a new array each time.
#
#   n trades x m prices  ->  O(n x m), plus n allocations of size m
#
# A day of equity data: 500,000 trades, 2,000,000 price ticks.
#   500,000 x 2,000,000 = 10**12 comparisons.
#
# searchsorted does a binary search per trade:
#   O(n log m) = 500,000 x 21 = ~10 million.
#
# That is a factor of 100,000 -- the difference between eleven minutes
# and a few milliseconds.
#
# IT IS ALSO WRONG in three ways, which the rewrite fixes.


def asof(trade_times, price_times, prices, *, max_staleness=None,
         inclusive=True):
    """Most recent price at or before each trade time.

    price_times must be sorted ascending.

    inclusive=True   a price stamped exactly at the trade time counts
    max_staleness    prices older than this are treated as unavailable
    """
    trade_times = np.asarray(trade_times)
    price_times = np.asarray(price_times)
    prices = np.asarray(prices, dtype=float)

    if len(price_times) != len(prices):
        raise ValueError(
            f"price_times ({len(price_times)}) and prices ({len(prices)}) "
            "must be the same length"
        )

    # searchsorted GIVES NO WARNING ON UNSORTED INPUT -- it returns
    # confident nonsense. Since the whole result depends on this, it
    # is worth the O(m) check.
    if len(price_times) and not np.all(np.diff(price_times) >= 0):
        raise ValueError("price_times must be sorted ascending")

    if len(price_times) == 0:
        return np.full(len(trade_times), np.nan)

    # side="right" -> a price stamped exactly at t IS used.
    # side="left"  -> only strictly earlier prices are used.
    #
    # WHICH IS CORRECT DEPENDS ON THE DOMAIN. For a trade executing
    # against a quote published in the same instant, "right" is
    # correct. For a FEATURE fed to a model predicting that instant,
    # "left" is correct -- using the same-timestamp value is temporal
    # leakage. This is why it is a parameter and not a constant.
    side = "right" if inclusive else "left"
    pos = np.searchsorted(price_times, trade_times, side=side) - 1

    # BUG 1 IN THE ORIGINAL: a trade before every price gives
    # len(valid) - 1 == -1, and prices[-1] is the LAST price -- a
    # price from the far future, silently.
    before_any = pos < 0
    pos = np.maximum(pos, 0)

    out = prices[pos]
    out[before_any] = np.nan

    # BUG 2: no staleness limit. After a halt or a feed outage, the
    # last known price can be hours old, and a stale price used as a
    # current one is worse than a missing one -- it flows through
    # every downstream calculation as a real number.
    if max_staleness is not None:
        age = trade_times - price_times[pos]
        out[~before_any & (age > max_staleness)] = np.nan

    return out


# BUG 3 was the loop's use of prices[len(valid) - 1]: it assumed
# price_times and prices were in the same order AND that the count of
# valid times equals the index. Both hold only if price_times is
# sorted -- which the original never checked.


# =========================================================================
# THE COVERAGE REPORT -- an as-of join should not fail silently
# =========================================================================

def asof_with_report(trade_times, price_times, prices, **kw):
    out = asof(trade_times, price_times, prices, **kw)

    n = len(out)
    missing = int(np.isnan(out).sum())
    report = {
        "trades": n,
        "matched": n - missing,
        "unmatched": missing,
        "coverage": round(1 - missing / n, 4) if n else 1.0,
    }
    if len(price_times) and n:
        pos = np.maximum(
            np.searchsorted(price_times, trade_times, side="right") - 1, 0)
        age = trade_times - price_times[pos]
        report["median_staleness"] = float(np.median(age))
        report["max_staleness"] = float(age.max())

    return out, report


# =========================================================================
# USING IT
# =========================================================================

rng = np.random.default_rng(0)
price_times = np.sort(rng.uniform(0, 86_400, 2_000_000))
prices = 100 + np.cumsum(rng.normal(0, 0.01, 2_000_000))
trade_times = np.sort(rng.uniform(0, 86_400, 500_000))

filled, rep = asof_with_report(trade_times, price_times, prices,
                               max_staleness=300)
rep["coverage"]                     # ~1.0
rep["median_staleness"]             # ~0.02 seconds

# %timeit asof(trade_times, price_times, prices)     -> ~40 ms
# the original                                       -> ~11 minutes


# =========================================================================
# TESTS
# =========================================================================

def _simple():
    price_times = np.array([10.0, 20.0, 30.0, 40.0])
    prices = np.array([1.0, 2.0, 3.0, 4.0])
    return price_times, prices


def test_basic_lookup():
    pt, p = _simple()
    trades = np.array([15.0, 25.0, 35.0, 45.0])

    assert np.array_equal(asof(trades, pt, p), [1.0, 2.0, 3.0, 4.0])


def test_trade_before_any_price_is_nan_not_the_last_price():
    """The original returned prices[-1] here -- a future price."""
    pt, p = _simple()
    trades = np.array([5.0, 15.0])

    out = asof(trades, pt, p)
    assert np.isnan(out[0])
    assert out[1] == 1.0


def test_exact_match_inclusive():
    pt, p = _simple()

    assert asof(np.array([20.0]), pt, p, inclusive=True)[0] == 2.0


def test_exact_match_exclusive_avoids_leakage():
    pt, p = _simple()

    assert asof(np.array([20.0]), pt, p, inclusive=False)[0] == 1.0


def test_staleness_limit():
    pt, p = _simple()
    trades = np.array([41.0, 100.0])

    out = asof(trades, pt, p, max_staleness=5.0)
    assert out[0] == 4.0                  # 1 second old
    assert np.isnan(out[1])               # 60 seconds old


def test_trade_after_all_prices_uses_the_last_one():
    pt, p = _simple()

    assert asof(np.array([1000.0]), pt, p)[0] == 4.0


def test_unsorted_prices_raise_rather_than_returning_nonsense():
    pt = np.array([30.0, 10.0, 20.0])
    p = np.array([3.0, 1.0, 2.0])

    try:
        asof(np.array([15.0]), pt, p)
        assert False, "should have raised"
    except ValueError as e:
        assert "sorted" in str(e)


def test_duplicate_price_timestamps():
    """Two ticks at the same instant: the last one wins."""
    pt = np.array([10.0, 20.0, 20.0, 30.0])
    p = np.array([1.0, 2.0, 2.5, 3.0])

    assert asof(np.array([20.0]), pt, p, inclusive=True)[0] == 2.5
    assert asof(np.array([25.0]), pt, p)[0] == 2.5


def test_empty_prices():
    out = asof(np.array([1.0, 2.0]), np.array([]), np.array([]))

    assert np.isnan(out).all()


def test_empty_trades():
    pt, p = _simple()

    assert len(asof(np.array([]), pt, p)) == 0


def test_mismatched_price_arrays_raise():
    try:
        asof(np.array([1.0]), np.array([1.0, 2.0]), np.array([1.0]))
        assert False, "should have raised"
    except ValueError as e:
        assert "same length" in str(e)


def test_matches_a_naive_implementation():
    """Correctness against the slow version, on small data."""
    rng = np.random.default_rng(3)
    pt = np.sort(rng.uniform(0, 100, 50))
    p = rng.normal(size=50)
    trades = rng.uniform(-10, 110, 200)

    fast = asof(trades, pt, p)
    slow = np.array([
        p[np.flatnonzero(pt <= t)[-1]] if (pt <= t).any() else np.nan
        for t in trades
    ])

    assert np.allclose(fast, slow, equal_nan=True)`,
        notes: [
          { t: "p", text: "**O(n × m) becomes O(n log m).** On 500,000 trades and 2,000,000 ticks that is 10¹² comparisons against 10 million — the difference between eleven minutes and forty milliseconds." },
          { t: "callout", kind: "trap", title: "prices[-1] is a price from the future", body: [
            { t: "p", text: "For a trade earlier than every price tick, the original computes `len(valid) - 1 == -1`, and Python's negative indexing silently returns the **last** price of the day." },
            { t: "p", text: "That is not a missing value — it is a value from the future, flowing into a backtest as though it were known at the time. It is the exact shape of temporal leakage, produced by an off-by-one." }
          ]},
          { t: "p", text: "**`side` is a parameter because both answers are correct in different contexts.** For a trade executing against a quote published in the same instant, `\"right\"` is right. For a feature fed to a model predicting that instant, using the same-timestamp value is leakage and `\"left\"` is required." },
          { t: "p", text: "**A stale price is worse than a missing one.** After a halt or a feed outage the last known price can be hours old, and without a staleness limit it flows through every downstream calculation as a real number rather than announcing itself." },
          { t: "p", text: "**`searchsorted` gives no warning on unsorted input** — it returns confident nonsense. Since the entire result depends on the ordering, the O(m) check is worth paying for once." },
          { t: "p", text: "**The naive implementation is kept as a test oracle.** Correctness against the slow version on small data is the cheapest possible guard when replacing an algorithm, and it catches exactly the boundary conditions that reasoning misses." }
        ]
      }
    },

    { t: "callout", kind: "insight", title: "Sort once, query many times", body: [
      { t: "p", text: "Every `isin`, `intersect1d` and `setdiff1d` call sorts its arguments internally. **If the same lookup table is used repeatedly, that sort is being paid for every call.**" },
      { t: "p", text: "Sorting once and using `searchsorted` turns repeated O((n+m) log m) work into a one-off O(m log m) plus O(n log m) per query — which is what makes the difference at pipeline scale." },
      { t: "p", text: "The same reasoning drives `assume_unique=True`: it skips a deduplication step, is roughly four times faster, and produces silently wrong results if the promise is false. Pass it only where uniqueness is guaranteed by construction." }
    ]}
  ],

  takeaways: [
    "**`argsort` returns a reordering you can apply to any parallel array** — `sort` returns values and discards the correspondence.",
    "**Sorting two related arrays separately silently breaks the pairing**, and every shape check still passes.",
    "**NumPy has no `reverse=`**: negate for numbers or reverse the index array, and note that the two differ on ties.",
    "**`a.sort()` returns `None`** — `a = a.sort()` replaces the array with nothing.",
    "**Stability decides correctness when sorting by keys one at a time**; `np.lexsort` does it in one call, with the **last** key as primary.",
    "**`np.sort(X, axis=0)` sorts each column independently and destroys every row** — tabular data needs `X[np.argsort(X[:, k])]`.",
    "**`argpartition` gives top-k in O(n)** instead of a full O(n log n) sort, then sort just the k survivors.",
    "**`searchsorted` is a vectorised binary search** and the primitive behind bucketing, as-of joins and percentile lookup.",
    "**`searchsorted` does not check that its input is sorted** — it returns confident nonsense on unsorted data.",
    "**Only `isin` preserves input order**; every other set operation returns sorted unique values.",
    "**`np.unique(..., return_inverse=True)` is label encoding**, and with `bincount` it gives grouped aggregation without a loop.",
    "**`np.unique(X)` flattens** — deduplicating rows needs `axis=0`."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "You need to sort a feature matrix and its labels together. What is the correct approach?",
        options: [
          "`np.sort(X)` and `np.sort(y)`",
          "`idx = np.argsort(key); X[idx]; y[idx]` — one index array applied to both",
          "`X.sort(axis=0)` then `y.sort()`",
          "`np.lexsort([X, y])`"
        ],
        answer: 1,
        why: "Sorting each array separately pairs every row's features with a different row's label — no error, all shape checks pass, and the model trains on noise. One index array applied to everything is the only form that cannot go wrong."
      },
      {
        stem: "Why does `np.searchsorted` sometimes return nonsense?",
        options: [
          "It cannot handle floats",
          "It assumes the input is sorted and does not check — on unsorted data the binary search is meaningless",
          "It requires unique values",
          "The side parameter is required"
        ],
        answer: 1,
        why: "Binary search is only defined on ordered data. There is no error and no warning, so when a whole result depends on it — an as-of join, a bucketing step — an explicit `np.diff(a) >= 0` check is worth the one linear pass."
      },
      {
        stem: "You need the 10 largest values from a million-element array. What is the efficient approach?",
        options: [
          "`np.sort(a)[-10:]`",
          "`np.argpartition(a, -10)[-10:]`, then sort just those ten",
          "`a.max()` ten times",
          "`np.unique(a)[-10:]`"
        ],
        answer: 1,
        why: "`argpartition` is O(n) and only guarantees that everything past position −10 is larger than everything before it. A full sort is O(n log n) and about fifteen times slower here — ordering the ten survivors afterwards costs nothing."
      },
      {
        stem: "`np.intersect1d(a, b)` is used to filter a dataset. What is the risk?",
        options: [
          "It is slower than isin",
          "It returns sorted unique values, so the output order no longer matches any parallel array",
          "It cannot handle strings",
          "It drops NaN values"
        ],
        answer: 1,
        why: "Every set operation except `isin` sorts and deduplicates its output. If row order matters — because a labels array or an ID array is being filtered alongside — the correspondence is silently destroyed. `a[np.isin(a, b)]` preserves `a`'s order."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Why would you use `argsort` rather than `sort`?",
        strong: "Because the index array can be applied to every parallel array, keeping rows together. Sorting values alone discards which row they came from, so sorting a feature matrix and its labels separately pairs each row's features with a different row's label — and nothing errors.",
        answer: [
          { t: "p", text: "Framing it around the pairing failure rather than as an API preference is what makes this answer land." },
          { t: "p", text: "Adding that `np.sort(X, axis=0)` sorts columns independently and scrambles rows shows you have hit the related trap." }
        ]
      },
      {
        level: "advanced",
        q: "How would you attach the most recent price to each of half a million trades?",
        strong: "Sort the price feed once, then `np.searchsorted(price_times, trade_times, side=...) - 1` for the whole trade array at once. That is O(n log m) rather than the loop's O(n × m). Then handle trades before the first tick — the naive `-1` index silently returns the last price of the day — and apply a staleness limit, because an hours-old price is worse than a missing one.",
        answer: [
          { t: "p", text: "Naming it as an as-of join and giving the complexity improvement in one breath is the efficient version of this answer." },
          { t: "p", text: "The `prices[-1]` off-by-one is worth calling out specifically: it is a leakage bug wearing an indexing bug's clothes." }
        ]
      },
      {
        level: "advanced",
        q: "When is `np.isin` the wrong choice?",
        strong: "When the lookup table is reused many times — `isin` sorts its second argument internally on every call, so sorting once and using `searchsorted` amortises that away. It is also the choice you want when order matters, though, because every other set operation returns sorted unique values and silently reorders your data.",
        answer: [
          { t: "p", text: "Recognising `isin` as both the slow choice for repeated lookups and the *only* order-preserving one shows real familiarity." },
          { t: "p", text: "Mentioning `assume_unique=True` — four times faster, silently wrong if the promise is false — is a good closing detail." }
        ]
      }
    ]
  }
});
