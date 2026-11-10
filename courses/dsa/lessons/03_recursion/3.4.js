/* ============================================================================
   LESSON 3.4 — Knapsack and Subset Problems
   ========================================================================= */
EC.receiveLesson({
  id: "3.4",

  lede: "Knapsack, subset sum and coin change are one family: choose items to hit or approach a target. **The state is (items considered, capacity left), and the only real decision is whether each item can be used once or many times**, which in the one-row version is nothing more than the direction of the inner loop. This lesson checks every variant against brute force, shows the loop-direction bug and the loop-order bug, the coin system where greedy fails, and a Python-specific trick that makes subset sum two thousand times faster.",

  objectives: [
    "Write 0/1 knapsack as a table and reduce it to one row",
    "Explain why the inner loop runs downward for 0/1 and upward for unbounded",
    "Count combinations versus ordered sequences by choosing the loop order",
    "Show when greedy coin change fails, and solve it with DP",
    "Use a Python integer as a bitset for subset sums"
  ],

  prerequisites: ["3.1", "3.3"],

  blocks: [
    { t: "h2", n: "01", id: "zero-one", text: "0/1 knapsack", sub: "From a table to one row" },
    { t: "p",
      text: "dp[i][c] is the best value using the first i items within capacity c: either skip item i, or take it and add its value to the best for the remaining capacity without it. Each row depends only on the row above, so one list suffices, if it is updated from high capacity to low. Going downward, dp[c − w] still holds the previous row's value when it is read, so each item is counted once. The figure shows the row after each item for three items and capacity 6." },
    { t: "viz",
      title: "One row, updated right to left",
      caption: "Each row is the dp list after one more item. Updating from capacity 6 down to the item's weight means every read of dp[c − w] sees the value from before this item, so no item is used twice. The answer, 9, is (4, 6) plus (2, 3).",
      svg: `<svg viewBox="0 0 596 216" width="100%" role="img">
<text x="76" y="32.0" text-anchor="end" class="s-sub">capacity</text>
<rect x="86" y="12" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="104.0" y="32.0" text-anchor="middle" class="s-label">0</text>
<rect x="126" y="12" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="144.0" y="32.0" text-anchor="middle" class="s-label">1</text>
<rect x="166" y="12" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="184.0" y="32.0" text-anchor="middle" class="s-label">2</text>
<rect x="206" y="12" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="224.0" y="32.0" text-anchor="middle" class="s-label">3</text>
<rect x="246" y="12" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="264.0" y="32.0" text-anchor="middle" class="s-label">4</text>
<rect x="286" y="12" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="304.0" y="32.0" text-anchor="middle" class="s-label">5</text>
<rect x="326" y="12" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="344.0" y="32.0" text-anchor="middle" class="s-label">6</text>
<text x="76" y="72.0" text-anchor="end" class="s-sub">start</text>
<rect x="86" y="52" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="104.0" y="72.0" text-anchor="middle" class="s-label">0</text>
<rect x="126" y="52" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="144.0" y="72.0" text-anchor="middle" class="s-label">0</text>
<rect x="166" y="52" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="184.0" y="72.0" text-anchor="middle" class="s-label">0</text>
<rect x="206" y="52" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="224.0" y="72.0" text-anchor="middle" class="s-label">0</text>
<rect x="246" y="52" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="264.0" y="72.0" text-anchor="middle" class="s-label">0</text>
<rect x="286" y="52" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="304.0" y="72.0" text-anchor="middle" class="s-label">0</text>
<rect x="326" y="52" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="344.0" y="72.0" text-anchor="middle" class="s-label">0</text>
<text x="76" y="112.0" text-anchor="end" class="s-sub">+(3, 5)</text>
<rect x="86" y="92" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="104.0" y="112.0" text-anchor="middle" class="s-label">0</text>
<rect x="126" y="92" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="144.0" y="112.0" text-anchor="middle" class="s-label">0</text>
<rect x="166" y="92" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="184.0" y="112.0" text-anchor="middle" class="s-label">0</text>
<rect x="206" y="92" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--accent);stroke-width:2"/>
<text x="224.0" y="112.0" text-anchor="middle" class="s-label" style="fill:var(--accent)">5</text>
<rect x="246" y="92" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--accent);stroke-width:2"/>
<text x="264.0" y="112.0" text-anchor="middle" class="s-label" style="fill:var(--accent)">5</text>
<rect x="286" y="92" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--accent);stroke-width:2"/>
<text x="304.0" y="112.0" text-anchor="middle" class="s-label" style="fill:var(--accent)">5</text>
<rect x="326" y="92" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--accent);stroke-width:2"/>
<text x="344.0" y="112.0" text-anchor="middle" class="s-label" style="fill:var(--accent)">5</text>
<text x="376" y="112.0" class="s-sub">cells 3..6 updated, right to left</text>
<text x="76" y="152.0" text-anchor="end" class="s-sub">+(4, 6)</text>
<rect x="86" y="132" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="104.0" y="152.0" text-anchor="middle" class="s-label">0</text>
<rect x="126" y="132" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="144.0" y="152.0" text-anchor="middle" class="s-label">0</text>
<rect x="166" y="132" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="184.0" y="152.0" text-anchor="middle" class="s-label">0</text>
<rect x="206" y="132" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="224.0" y="152.0" text-anchor="middle" class="s-label">5</text>
<rect x="246" y="132" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--accent);stroke-width:2"/>
<text x="264.0" y="152.0" text-anchor="middle" class="s-label" style="fill:var(--accent)">6</text>
<rect x="286" y="132" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--accent);stroke-width:2"/>
<text x="304.0" y="152.0" text-anchor="middle" class="s-label" style="fill:var(--accent)">6</text>
<rect x="326" y="132" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--accent);stroke-width:2"/>
<text x="344.0" y="152.0" text-anchor="middle" class="s-label" style="fill:var(--accent)">6</text>
<text x="376" y="152.0" class="s-sub">cells 4..6 updated, right to left</text>
<text x="76" y="192.0" text-anchor="end" class="s-sub">+(2, 3)</text>
<rect x="86" y="172" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="104.0" y="192.0" text-anchor="middle" class="s-label">0</text>
<rect x="126" y="172" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="144.0" y="192.0" text-anchor="middle" class="s-label">0</text>
<rect x="166" y="172" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="184.0" y="192.0" text-anchor="middle" class="s-label">3</text>
<rect x="206" y="172" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="224.0" y="192.0" text-anchor="middle" class="s-label">5</text>
<rect x="246" y="172" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="264.0" y="192.0" text-anchor="middle" class="s-label">6</text>
<rect x="286" y="172" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--line);stroke-width:1"/>
<text x="304.0" y="192.0" text-anchor="middle" class="s-label">8</text>
<rect x="326" y="172" width="36" height="30" rx="5" class="s-fill" style="stroke:var(--good);stroke-width:2"/>
<text x="344.0" y="192.0" text-anchor="middle" class="s-label" style="fill:var(--good)">9</text>
<text x="376" y="192.0" class="s-sub">best value 9</text>
</svg>` },
    { t: "code",
      lang: "python",
      title: "knap.py — every variant against brute force, the two loop bugs, greedy coins, and timings",
      code: `import itertools, random, time

def knap_brute(items, cap):                       # every subset
    return max((sum(v for w, v in s) for k in range(len(items) + 1) for s in itertools.combinations(items, k)
                if sum(w for w, v in s) <= cap), default=0)

def knap_table(items, cap):                       # dp[i][c] = best value from the first i items within capacity c
    dp = [[0] * (cap + 1) for _ in range(len(items) + 1)]
    for i, (w, v) in enumerate(items, 1):
        for c in range(cap + 1):
            dp[i][c] = dp[i - 1][c]
            if w <= c: dp[i][c] = max(dp[i][c], dp[i - 1][c - w] + v)
    return dp[-1][-1]

def knap_row(items, cap):                         # one row, capacities DOWNWARD so each item is used at most once
    dp = [0] * (cap + 1)
    for w, v in items:
        for c in range(cap, w - 1, -1): dp[c] = max(dp[c], dp[c - w] + v)
    return dp[cap]

def knap_row_wrong(items, cap):                   # the same loop upward: an item can be reused, which is unbounded knapsack
    dp = [0] * (cap + 1)
    for w, v in items:
        for c in range(w, cap + 1): dp[c] = max(dp[c], dp[c - w] + v)
    return dp[cap]

def min_coins_greedy(coins, amount):
    n = 0
    for c in sorted(coins, reverse=True): n += amount // c; amount %= c
    return n if amount == 0 else None

def min_coins(coins, amount):                     # unbounded: capacities upward is exactly right here
    INF = float("inf"); dp = [0] + [INF] * amount
    for a in range(1, amount + 1):
        dp[a] = min((dp[a - c] + 1 for c in coins if c <= a), default=INF)
    return dp[amount] if dp[amount] < INF else None

def ways_combinations(coins, amount):             # coins outer: each multiset counted once
    dp = [1] + [0] * amount
    for c in coins:
        for a in range(c, amount + 1): dp[a] += dp[a - c]
    return dp[amount]

def ways_sequences(coins, amount):                # amount outer: every order counted separately
    dp = [1] + [0] * amount
    for a in range(1, amount + 1): dp[a] = sum(dp[a - c] for c in coins if c <= a)
    return dp[amount]

def subset_sums_list(nums, limit):                # which sums are reachable, as a list of booleans
    ok = [True] + [False] * limit
    for x in nums:
        for s in range(limit, x - 1, -1):
            if ok[s - x]: ok[s] = True
    return ok

def subset_sums_bits(nums):                       # bit s of the integer is set when sum s is reachable
    bits = 1
    for x in nums: bits |= bits << x              # every reachable sum, plus x
    return bits

rnd = random.Random(34)
for _ in range(300):
    items = [(rnd.randint(1, 10), rnd.randint(1, 20)) for _ in range(rnd.randint(0, 10))]; cap = rnd.randint(0, 30)
    assert knap_brute(items, cap) == knap_table(items, cap) == knap_row(items, cap)
    nums = [rnd.randint(1, 15) for _ in range(rnd.randint(0, 10))]; lim = sum(nums)
    reach = {sum(s) for k in range(len(nums) + 1) for s in itertools.combinations(nums, k)}
    assert [s for s in range(lim + 1) if subset_sums_list(nums, lim)[s]] == sorted(reach) == [s for s in range(lim + 1) if subset_sums_bits(nums) >> s & 1]
print("300 random cases: knapsack brute force = table = one row; subset sums by list and by bits = brute force")
items = [(3, 5), (4, 6), (2, 3)]
print(f"items (weight, value) {items}, capacity 6: 0/1 answer {knap_row(items, 6)}, upward loop gives {knap_row_wrong(items, 6)} (item (3, 5) taken twice: weight 6, value 10)")
print(f"coins [1, 3, 4], amount 6: greedy {min_coins_greedy([1, 3, 4], 6)} coins, DP {min_coins([1, 3, 4], 6)} coins")
print(f"ways to make 5 from [1, 2, 5]: combinations {ways_combinations([1, 2, 5], 5)}, ordered sequences {ways_sequences([1, 2, 5], 5)}")

print(f"\\n{'items':>6}{'brute ms':>10}{'table ms':>10}{'row ms':>8}   knapsack, capacity 1,000")
for n in (16, 18, 20, 200):
    items = [(rnd.randint(1, 100), rnd.randint(1, 100)) for _ in range(n)]
    t = time.perf_counter(); r = knap_row(items, 1_000); tr = time.perf_counter() - t
    t = time.perf_counter(); tb_ = knap_table(items, 1_000); tt = time.perf_counter() - t
    if n <= 20:
        t = time.perf_counter(); b = knap_brute(items, 1_000); tb = time.perf_counter() - t; assert b == r == tb_
        print(f"{n:>6}{tb * 1000:>10.0f}{tt * 1000:>10.1f}{tr * 1000:>8.1f}")
    else: print(f"{n:>6}{'skipped':>10}{tt * 1000:>10.0f}{tr * 1000:>8.0f}")

nums = [rnd.randint(1, 1_000) for _ in range(2_000)]; lim = sum(nums)
t = time.perf_counter(); a = subset_sums_list(nums, lim); tl = time.perf_counter() - t
t = time.perf_counter(); b = subset_sums_bits(nums); tb = time.perf_counter() - t
assert all(a[s] == bool(b >> s & 1) for s in range(0, lim + 1, 997))
print(f"\\nreachable sums of 2,000 numbers up to 1,000 (total {lim:,}): list of booleans {tl:.1f} s, Python int as a bitset {tb * 1000:.0f} ms")`,
      out: `300 random cases: knapsack brute force = table = one row; subset sums by list and by bits = brute force
items (weight, value) [(3, 5), (4, 6), (2, 3)], capacity 6: 0/1 answer 9, upward loop gives 10 (item (3, 5) taken twice: weight 6, value 10)
coins [1, 3, 4], amount 6: greedy 3 coins, DP 2 coins
ways to make 5 from [1, 2, 5]: combinations 4, ordered sequences 9

 items  brute ms  table ms  row ms   knapsack, capacity 1,000
    16        70       2.9     1.9
    18       304       3.4     2.2
    20      1346       3.6     2.4
   200   skipped        39      25

reachable sums of 2,000 numbers up to 1,000 (total 1,002,553): list of booleans 72.9 s, Python int as a bitset 33 ms` },
    { t: "callout",
      kind: "trap",
      title: "Loop direction changes the problem",
      body: [
        { t: "p",
          text: "The same one-row loop running upward let item (3, 5) be taken twice, answering 10 for a problem whose answer is 9. Upward is exactly right for unbounded knapsack and coin change, where reuse is allowed, and wrong for 0/1. No error is raised either way; only a test against a brute force, as here, catches it." }
      ] },
    { t: "ladder",
      title: "0/1 knapsack",
      rungs: [
        { level: "bad",
          label: "Every subset",
          why: "O(2ⁿ): 1,346 ms for 20 items, roughly quadrupling every two items.",
          code: `def knap_brute(items, cap):                       # every subset
    return max((sum(v for w, v in s) for k in range(len(items) + 1) for s in itertools.combinations(items, k)
                if sum(w for w, v in s) <= cap), default=0)`,
          note: "The oracle the others are tested against on 300 random cases." },
        { level: "ok",
          label: "The full table",
          why: "O(n·C) time and memory: 39 ms for 200 items and capacity 1,000.",
          code: `def knap_table(items, cap):                       # dp[i][c] = best value from the first i items within capacity c
    dp = [[0] * (cap + 1) for _ in range(len(items) + 1)]
    for i, (w, v) in enumerate(items, 1):
        for c in range(cap + 1):
            dp[i][c] = dp[i - 1][c]
            if w <= c: dp[i][c] = max(dp[i][c], dp[i - 1][c - w] + v)
    return dp[-1][-1]`,
          note: "Keep the table when you need to recover which items were chosen." },
        { level: "best",
          label: "One row, capacities downward",
          why: "O(n·C) time, O(C) memory: 25 ms on the same input.",
          code: `def knap_row(items, cap):                         # one row, capacities DOWNWARD so each item is used at most once
    dp = [0] * (cap + 1)
    for w, v in items:
        for c in range(cap, w - 1, -1): dp[c] = max(dp[c], dp[c - w] + v)
    return dp[cap]`,
          note: "Pseudo-polynomial: the cost grows with the capacity's value, not its number of digits." }
      ] },
    { t: "h2", n: "02", id: "coins", text: "Coin change, twice", sub: "Fewest coins, and number of ways" },
    { t: "p",
      text: "Fewest coins is unbounded knapsack with a minimum instead of a maximum. Greedy (largest coin first) is optimal for coin systems like 1, 2, 5, 10, but not in general: with coins 1, 3 and 4, greedy makes 6 as 4 + 1 + 1, three coins, where 3 + 3 uses two. Counting ways has its own trap: with coins in the outer loop each multiset is counted once (4 ways to make 5 from 1, 2, 5); with the amount in the outer loop every ordering is counted (9 ways)." },
    { t: "table",
      head: ["Variant", "Each item", "Inner loop", "Combine"],
      rows: [
        ["0/1 knapsack", "at most once", "capacity downward", "max"],
        ["Unbounded knapsack", "any number of times", "capacity upward", "max"],
        ["Fewest coins", "any number of times", "amount upward", "min, +1 per coin"],
        ["Ways, as combinations", "any number of times", "coins outer, amount inner", "sum"],
        ["Ways, as ordered sequences", "any number of times", "amount outer, coins inner", "sum"],
        ["Subset sum (reachable?)", "at most once", "downward, or a bitset", "or"]
      ] },
    { t: "callout",
      kind: "insight",
      title: "Pseudo-polynomial is not polynomial",
      body: [
        { t: "p",
          text: "O(n·C) looks polynomial, but C is a number, and its size in the input is its number of digits. Doubling the number of digits squares C. That is why knapsack is NP-hard yet solvable in practice when capacities are small integers, and why weights in cents rather than dollars can make the table a hundred times larger." }
      ] },
    { t: "h2",
      n: "03",
      id: "bitset",
      text: "Subset sum with a bitset",
      sub: "Python integers do the inner loop in C" },
    { t: "p",
      text: "For \"which sums are reachable?\", a Python int can hold one bit per sum. bits | (bits << x) adds x to every reachable sum at once, and Python performs the shift and OR on the whole integer in C. On 2,000 numbers with a total over a million, the list of booleans took 72.9 seconds and the bitset 33 ms." },
    { t: "exercise",
      kind: "Challenge",
      title: "Split into two groups as evenly as possible",
      difficulty: "core",
      minutes: 25,
      body: [
        { t: "p",
          text: "Given positive integers, split them into two groups whose sums differ as little as possible, and return the difference and the indices of one group. Check the difference against brute force and check that the returned group, used at most once per index, really produces it." }
      ],
      requirements: [
        "Reachable sums with a record of how each was first reached",
        "Each item used at most once in any recorded chain",
        "The sum closest to half the total, from below",
        "Agreement with brute force on 500 random lists, and a valid group"
      ],
      hint: "Iterate over a snapshot of the sums reachable before item i, so item i can only extend sums that do not already use it.",
      solution: { lang: "python",
        title: "best_split.py",
        code: `import itertools, random, time

def best_split(nums):
    """Split nums into two groups with sums as close as possible. Returns (difference, indices of one group).
    first[s] = (item index, previous sum) for the first way sum s was reached, so each index is used at most once."""
    total = sum(nums); first = {0: None}
    for i, x in enumerate(nums):
        for s in list(first):                      # snapshot: sums reachable WITHOUT item i
            if s + x not in first: first[s + x] = (i, s)
    s = max(t for t in first if t <= total // 2)   # the reachable sum closest to half from below
    group, cur = [], s
    while first[cur] is not None: i, cur = first[cur]; group.append(i)
    return total - 2 * s, sorted(group)

def best_split_brute(nums):
    total = sum(nums)
    return min(abs(total - 2 * sum(c)) for k in range(len(nums) + 1) for c in itertools.combinations(nums, k))

rnd = random.Random(35)
for _ in range(500):
    nums = [rnd.randint(1, 30) for _ in range(rnd.randint(1, 12))]
    diff, group = best_split(nums)
    assert diff == best_split_brute(nums)
    assert len(set(group)) == len(group)                                         # no item used twice
    assert sum(nums) - 2 * sum(nums[i] for i in group) == diff                    # the group really gives that difference
print("500 random lists: the difference matches brute force, and the returned group really achieves it")
print(best_split([3, 1, 4, 2, 2, 1]), best_split([10, 20, 15, 5, 25]))

for n in (20, 22, 200):
    nums = [rnd.randint(1, 1_000) for _ in range(n)]
    t = time.perf_counter(); d, g = best_split(nums); td = time.perf_counter() - t
    if n <= 22:
        t = time.perf_counter(); b = best_split_brute(nums); tb = time.perf_counter() - t; assert b == d
        print(f"{n} numbers: DP {td * 1000:.0f} ms, brute force {tb * 1000:.0f} ms, difference {d}")
    else: print(f"{n} numbers: DP {td * 1000:.0f} ms, difference {d}, group of {len(g)}")`,
        out: `500 random lists: the difference matches brute force, and the returned group really achieves it
(1, [0, 1, 3]) (5, [1, 2])
20 numbers: DP 4 ms, brute force 201 ms, difference 0
22 numbers: DP 4 ms, brute force 843 ms, difference 0
200 numbers: DP 467 ms, difference 0, group of 102`,
        notes: [
          { t: "p",
            text: "All 500 random lists matched brute force, and every returned group was a real set of distinct indices with the reported difference. Iterating over list(first) is the snapshot that keeps it 0/1; iterating over the live dict would let an item extend sums it had just created." },
          { t: "p",
            text: "At 22 numbers the DP took 4 ms and brute force 843 ms. The dict version is slower than a bitset for the yes-or-no question but can recover the group, which a bitset alone cannot." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: the batch packer that overfilled trucks",
      body: [
        { t: "p",
          text: "**Symptom.** A load planner occasionally assigned the same pallet to a truck twice, overfilling it on paper by one pallet's weight." },
        { t: "p",
          text: "**Mechanism.** A refactor from a two-dimensional table to a single row kept the inner loop running upward over capacity, turning 0/1 knapsack into unbounded knapsack. Unit tests used one pallet of each type, where the bug cannot show." },
        { t: "p",
          text: "**Fix.** The loop runs downward, the plan is validated so that no pallet appears twice, and a property test compares the planner with brute force on random small loads." }
      ] }
  ],

  takeaways: [
    "Knapsack-family state: **(items considered, capacity left)**.",
    "One row, **downward** for 0/1; **upward** when items can be reused. The wrong direction answered 10 instead of 9.",
    "Brute force took **1,346 ms** at 20 items; one row took **25 ms** for 200.",
    "Greedy coins fail for **1, 3, 4**: three coins where two suffice.",
    "Coins outer counts **combinations** (4); amount outer counts **orderings** (9).",
    "Knapsack is **pseudo-polynomial**: cost grows with the capacity's value.",
    "Subset sum with a **Python int bitset**: 33 ms against 72.9 s for a list of booleans.",
    "Keep enough information to **recover the chosen items**, and verify them."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "In one-row 0/1 knapsack, why must capacity go downward?",
        options: [
          "It is faster than looping upward",
          "So dp[c − w] predates the item",
          "To keep all of the values non-negative",
          "Python ranges must always count down"
        ],
        answer: 1,
        why: "Going downward, dp[c − w] has not yet been updated for this item, so the item is used at most once. Upward lets it be reused, which is unbounded knapsack." },
      { stem: "Coins 1, 3, 4 and amount 6. Greedy gives three coins. The optimum is…",
        options: ["Three coins: 4 + 1 + 1", "Two coins: 3 + 3", "One coin", "Four coins: 3 + 1 + 1 + 1"],
        answer: 1,
        why: "3 + 3 uses two coins. Greedy takes the 4 first and is left with 2, which needs two 1s. No single coin is worth 6." },
      { stem: "Amount in the outer loop, coins inner, summing ways. This counts…",
        options: [
          "Each multiset of coins exactly once",
          "Each ordering separately",
          "Only the ways that use distinct coins",
          "Only the ways with the fewest coins"
        ],
        answer: 1,
        why: "For each amount it adds every coin as the last one, so 1 + 2 and 2 + 1 are counted separately: 9 ways for 5 from 1, 2, 5, against 4 combinations." },
      { stem: "Why was the integer bitset so much faster for subset sums?",
        options: [
          "It needs much less arithmetic overall",
          "Its shifts and ORs run in C",
          "It skips all of the unreachable sums",
          "It runs in parallel across CPU cores"
        ],
        answer: 1,
        why: "bits | (bits << x) updates every sum at once inside CPython's integer code, many bits per machine word, instead of a Python-level loop per sum. It is single-threaded and touches all sums." }
    ] },

  interview: { title: "In an interview",
    sub: "Name the variant first; the loop follows.",
    questions: [
      { level: "core",
        q: "Solve 0/1 knapsack.",
        strong: "A strong answer gives the recurrence, the space reduction, the loop direction and the complexity caveat.",
        answer: [
          { t: "p",
            text: "dp[i][c] = max(dp[i−1][c], dp[i−1][c−w_i] + v_i). Reduce to one row iterated over capacity from high to low so each item is used once. O(n·C) time and O(C) space, which is pseudo-polynomial: fine for capacities up to a few million, hopeless for capacities with many digits, where branch and bound or approximation is used instead." }
        ] },
      { level: "core",
        q: "Fewest coins to make an amount.",
        strong: "A strong answer shows greedy fails and gives the DP.",
        answer: [
          { t: "p",
            text: "Greedy works for canonical systems like 1, 2, 5, 10, but not in general: coins 1, 3, 4 make 6 greedily with three coins instead of two. DP: dp[0] = 0, dp[a] = 1 + min(dp[a − c]) over coins c ≤ a, iterating amounts upward. O(amount × coins). Return −1 or None when dp[amount] stays infinite." }
        ] },
      { level: "advanced",
        q: "Can a list be split into two halves with equal sums?",
        strong: "A strong answer reduces to subset sum and mentions the bitset.",
        answer: [
          { t: "p",
            text: "Only if the total is even, and then exactly when some subset sums to half of it. Subset sum over reachable totals, boolean DP downward, O(n · total/2). In Python, an integer bitset, bits |= bits << x, then check bit total/2, is simple and orders of magnitude faster. To return the split, record how each sum was first reached." }
        ] }
    ] }
});
