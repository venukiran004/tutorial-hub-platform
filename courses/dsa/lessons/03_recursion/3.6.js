/* ============================================================================
   LESSON 3.6 — Bit Manipulation and Bitmask DP
   ========================================================================= */
EC.receiveLesson({
  id: "3.6",

  lede: "An integer is a set of up to a few dozen flags, and Python's integers make set operations on them single instructions: union is |, intersection is &, membership is a shift and a mask. **That turns \"which items have I used?\" into a number, and a number can index a DP table.** This lesson covers the bit tricks that actually come up, checks each one, and then uses masks for the classic exponential-but-feasible DP: the travelling salesman problem on 15 cities in under a fifth of a second, where trying every tour would mean 87 billion of them.",

  objectives: [
    "Use x & (x − 1), x & −x and the power-of-two test, and know what each does",
    "Count bits with int.bit_count rather than a loop or a string",
    "Represent subsets as integers and iterate over the subsets of a mask",
    "Write Held-Karp: DP over (visited set, last city)",
    "Recognise when n is small enough, about 20, for O(2ⁿ) state"
  ],

  prerequisites: ["3.1", "3.4"],

  blocks: [
    { t: "h2", n: "01", id: "tricks", text: "The tricks that come up", sub: "Checked, then timed" },
    { t: "table",
      head: ["Expression", "Does", "Used for"],
      rows: [
        ["x & (x − 1)", "clears the lowest set bit", "counting bits, power-of-two test"],
        ["x & −x", "isolates the lowest set bit", "Fenwick trees (4.1)"],
        ["x & (x − 1) == 0", "x is a power of two (x > 0)", "sizes, alignment"],
        ["x >> k & 1", "is bit k set?", "membership in a mask"],
        ["x | 1 << k, x & ~(1 << k)", "add or remove element k", "building masks"],
        ["a ^ a == 0", "XOR cancels pairs", "the element appearing once"],
        ["sub = (sub − 1) & mask", "next smaller subset of mask", "iterating subsets"]
      ] },
    { t: "code",
      lang: "python",
      title: "bits.py — the tricks checked, popcount three ways, subsets, and TSP three ways",
      code: `import itertools, math, random, time
from functools import reduce
from operator import xor

# The tricks, each checked on many values.
for x in range(1, 5_000):
    low = 1 << (len(bin(x)) - len(bin(x).rstrip("0")))                              # the lowest set bit, found the slow way
    assert x & -x == low                                                               # isolates the lowest set bit
    assert x & (x - 1) == x - low                                                      # clears the lowest set bit
    assert (x & (x - 1) == 0) == (bin(x).count("1") == 1)                              # power of two
    assert x.bit_count() == bin(x).count("1")
print("bit tricks hold for 1..4,999: x & (x-1) clears the lowest bit, x & -x isolates it, power-of-two test, bit_count")

def popcount_loop(x):
    n = 0
    while x: x &= x - 1; n += 1                   # one iteration per set bit
    return n
random.seed(36); xs = [random.getrandbits(64) for _ in range(200_000)]
for f, name in ((popcount_loop, "x &= x - 1 loop"), (lambda x: bin(x).count("1"), "bin(x).count('1')"), (int.bit_count, "int.bit_count")):
    t = time.perf_counter(); total = sum(map(f, xs)); print(f"  popcount of 200,000 64-bit ints, {name:<18} {(time.perf_counter() - t) * 1000:6.0f} ms  (total {total:,})")

nums = [random.randint(1, 10**6) for _ in range(5_000)]; lone = 424242
data = nums + nums + [lone]; random.shuffle(data)
print("the element that appears once, by XOR of everything:", reduce(xor, data))

mask = 0b10110
subs = []; sub = mask
while True:
    subs.append(sub)
    if sub == 0: break
    sub = (sub - 1) & mask                        # next smaller subset of mask
print(f"subsets of {mask:05b}: {[format(s, '05b') for s in subs]}")

def tsp_brute(d):                                 # fix city 0, try every order of the rest
    n = len(d)
    return min(sum(d[a][b] for a, b in zip((0,) + p, p + (0,))) for p in itertools.permutations(range(1, n)))

def tsp_memo(d):                                  # the same recurrence top-down: cost to finish from j having visited mask
    from functools import lru_cache
    n = len(d); FULL = (1 << n) - 1
    @lru_cache(maxsize=None)
    def go(mask, j):
        if mask == FULL: return d[j][0]
        return min(d[j][k] + go(mask | 1 << k, k) for k in range(n) if not mask >> k & 1)
    return go(1, 0)

def tsp_held_karp(d):                             # best[mask][j] = shortest path from 0 visiting exactly mask, ending at j
    n = len(d); FULL = 1 << n; INF = math.inf
    best = [[INF] * n for _ in range(FULL)]; best[1][0] = 0
    for m in range(1, FULL, 2):                   # only masks containing city 0
        row = best[m]
        for j in range(n):
            cur = row[j]
            if cur == INF: continue
            for k in range(1, n):
                if not m >> k & 1:
                    nm = m | 1 << k; c = cur + d[j][k]
                    if c < best[nm][k]: best[nm][k] = c
    return min(best[FULL - 1][j] + d[j][0] for j in range(1, n))

rnd = random.Random(36)
def cities(n): pts = [(rnd.random(), rnd.random()) for _ in range(n)]; return [[round(math.dist(p, q) * 1000) for q in pts] for p in pts]
for _ in range(30):
    d = cities(rnd.randint(2, 7)); assert tsp_brute(d) == tsp_held_karp(d) == tsp_memo(d)
print("\\n30 random city sets (2-7 cities): Held-Karp = memoised recursion = trying every tour")
print(f"{'cities':>7}{'tours tried':>18}{'brute s':>9}{'memo s':>8}{'Held-Karp s':>13}")
for n in (8, 9, 10, 13, 15):
    d = cities(n)
    t = time.perf_counter(); h = tsp_held_karp(d); th = time.perf_counter() - t
    t = time.perf_counter(); mm = tsp_memo(d); tm = time.perf_counter() - t; assert mm == h
    if n <= 10:
        t = time.perf_counter(); b = tsp_brute(d); tb = time.perf_counter() - t; assert b == h
        print(f"{n:>7}{math.factorial(n - 1):>18,}{tb:>9.2f}{tm:>8.3f}{th:>13.3f}")
    else:
        print(f"{n:>7}{math.factorial(n - 1):>18,}{'skipped':>9}{tm:>8.2f}{th:>13.2f}")`,
      out: `bit tricks hold for 1..4,999: x & (x-1) clears the lowest bit, x & -x isolates it, power-of-two test, bit_count
  popcount of 200,000 64-bit ints, x &= x - 1 loop       408 ms  (total 6,401,251)
  popcount of 200,000 64-bit ints, bin(x).count('1')      82 ms  (total 6,401,251)
  popcount of 200,000 64-bit ints, int.bit_count           4 ms  (total 6,401,251)
the element that appears once, by XOR of everything: 424242
subsets of 10110: ['10110', '10100', '10010', '10000', '00110', '00100', '00010', '00000']

30 random city sets (2-7 cities): Held-Karp = memoised recursion = trying every tour
 cities       tours tried  brute s  memo s  Held-Karp s
      8             5,040     0.00   0.001        0.000
      9            40,320     0.04   0.002        0.001
     10           362,880     0.39   0.004        0.002
     13       479,001,600  skipped    0.05         0.03
     15    87,178,291,200  skipped    0.31         0.17` },
    { t: "dl",
      items: [
        [
          "Use the built-in popcount",
          "int.bit_count (Python 3.10+) counted 200,000 64-bit integers in 4 ms; bin(x).count('1') took 82 ms and the x &= x − 1 loop 408 ms."
        ],
        [
          "XOR finds the odd one out",
          "Of 10,001 values where every other value appears twice, XOR-ing them all left exactly 424,242, the one that appears once."
        ],
        [
          "Subsets of a mask in decreasing order",
          "Repeating sub = (sub − 1) & mask listed all 8 subsets of 10110 and stopped at 0, visiting only subsets rather than all 32 masks."
        ]
      ] },
    { t: "callout",
      kind: "trap",
      title: "Python integers have no fixed width",
      body: [
        { t: "p",
          text: "~x is −x − 1, not a 32-bit complement, and x >> k on a negative number keeps the sign. Code ported from C or Java that relies on overflow or unsigned shifts, such as hash functions or bit-reversal, needs an explicit mask like & 0xFFFFFFFF to behave the same." }
      ] },
    { t: "h2", n: "02", id: "tsp", text: "Bitmask DP: the travelling salesman", sub: "From n! to 2ⁿ · n²" },
    { t: "p",
      text: "Trying every tour from a fixed start is (n − 1)! orders. Held-Karp observes that the cost of finishing a tour depends only on which cities have been visited and where you are now, not on the order you visited them in. So the state is (mask, last city): 2ⁿ · n states, each extended to n next cities, for O(2ⁿ · n²) work. That is still exponential, but at 15 cities it is 7 million steps rather than 87 billion tours." },
    { t: "viz",
      title: "Tours against Held-Karp steps",
      caption: "Bar length is the logarithm of the count, so each bar unit is ten times more work. Every-tour search grows factorially; Held-Karp grows as 2ⁿ · n². Counts are computed, not measured; the timings are in the output above.",
      svg: `<svg viewBox="0 0 760 248" width="100%" role="img">
<text x="180" y="31.0" text-anchor="end" class="s-label">10 cities, every tour</text>
<rect x="190" y="14" width="123.6" height="26" rx="4" class="s-fill" style="stroke:var(--crit);stroke-width:1.8"/>
<text x="321.6" y="31.0" class="s-sub">362,880 tours</text>
<text x="180" y="69.0" text-anchor="end" class="s-label">10 cities, Held-Karp</text>
<rect x="190" y="52" width="111.3" height="26" rx="4" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="309.3" y="69.0" class="s-sub">102,400 steps</text>
<text x="180" y="107.0" text-anchor="end" class="s-label">15 cities, every tour</text>
<rect x="190" y="90" width="243.1" height="26" rx="4" class="s-fill" style="stroke:var(--crit);stroke-width:1.8"/>
<text x="441.1" y="107.0" class="s-sub">8.7 × 10¹⁰ tours</text>
<text x="180" y="145.0" text-anchor="end" class="s-label">15 cities, Held-Karp</text>
<rect x="190" y="128" width="152.6" height="26" rx="4" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="350.6" y="145.0" class="s-sub">7,372,800 steps</text>
<text x="180" y="183.0" text-anchor="end" class="s-label">20 cities, every tour</text>
<rect x="190" y="166" width="379.7" height="26" rx="4" class="s-fill" style="stroke:var(--crit);stroke-width:1.8"/>
<text x="577.7" y="183.0" class="s-sub">1.2 × 10¹⁷ tours</text>
<text x="180" y="221.0" text-anchor="end" class="s-label">20 cities, Held-Karp</text>
<rect x="190" y="204" width="191.6" height="26" rx="4" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="389.6" y="221.0" class="s-sub">419,430,400 steps</text>
</svg>` },
    { t: "ladder",
      title: "Travelling salesman, exact",
      rungs: [
        { level: "bad",
          label: "Every permutation of the other cities",
          why: "O(n!): 0.39 s at 10 cities, and about 26 hours at 15 by the same rate.",
          code: `def tsp_brute(d):                                 # fix city 0, try every order of the rest
    n = len(d)
    return min(sum(d[a][b] for a, b in zip((0,) + p, p + (0,))) for p in itertools.permutations(range(1, n)))`,
          note: "The oracle for 2 to 7 cities." },
        { level: "ok",
          label: "Memoised recursion over (mask, city)",
          why: "O(2ⁿ · n²) with lru_cache: 0.31 s at 15 cities.",
          code: `def tsp_memo(d):                                  # the same recurrence top-down: cost to finish from j having visited mask
    from functools import lru_cache
    n = len(d); FULL = (1 << n) - 1
    @lru_cache(maxsize=None)
    def go(mask, j):
        if mask == FULL: return d[j][0]
        return min(d[j][k] + go(mask | 1 << k, k) for k in range(n) if not mask >> k & 1)
    return go(1, 0)`,
          note: "Depth is only n, so recursion is safe here; the cache's overhead is the cost." },
        { level: "best",
          label: "Iterative table over masks",
          why: "The same complexity, 0.17 s at 15 cities, because masks in increasing order are already a valid evaluation order.",
          code: `def tsp_held_karp(d):                             # best[mask][j] = shortest path from 0 visiting exactly mask, ending at j
    n = len(d); FULL = 1 << n; INF = math.inf
    best = [[INF] * n for _ in range(FULL)]; best[1][0] = 0
    for m in range(1, FULL, 2):                   # only masks containing city 0
        row = best[m]
        for j in range(n):
            cur = row[j]
            if cur == INF: continue
            for k in range(1, n):
                if not m >> k & 1:
                    nm = m | 1 << k; c = cur + d[j][k]
                    if c < best[nm][k]: best[nm][k] = c
    return min(best[FULL - 1][j] + d[j][0] for j in range(1, n))`,
          note: "Every mask is built from smaller ones by adding a bit, so increasing numeric order is topological." }
      ] },
    { t: "callout",
      kind: "insight",
      title: "When to reach for a bitmask",
      body: [
        { t: "p",
          text: "If the constraints say n ≤ 20 or so, and the problem asks about subsets, orderings or assignments, the intended solution is usually DP over masks: 2²⁰ is a million states. At n = 30 it is a billion and will not run in Python; then the problem wants something else, such as meet-in-the-middle, a greedy proof, or a heuristic." }
      ] },
    { t: "h2", n: "03", id: "assign", text: "Assignment by mask", sub: "The popcount says whose turn it is" },
    { t: "p",
      text: "Assigning n workers to n jobs is another ordering problem: the cost depends on which jobs are taken, and if workers are assigned in a fixed order, the number of jobs taken says which worker is next. So the state is only the mask, 2ⁿ entries, and mask.bit_count() recovers the worker. That is O(2ⁿ · n), against n! permutations." },
    { t: "exercise",
      kind: "Challenge",
      title: "Assign workers to jobs at minimum cost",
      difficulty: "advanced",
      minutes: 25,
      body: [
        { t: "p",
          text: "Given an n × n cost matrix, assign each worker exactly one job and each job exactly one worker, minimising total cost. Use a DP over masks of taken jobs, return the assignment as well as the cost, and check both against every permutation for small n. Then run it for n = 16." }
      ],
      requirements: [
        "State: the set of jobs already taken, as an integer",
        "The next worker is the popcount of the mask",
        "A record of the last job added to each mask, to recover the assignment",
        "Checks that the assignment is a permutation with the reported cost"
      ],
      hint: "choice[nm] = j when the transition from mask to nm = mask | 1 << j improves best[nm]; walk back by removing choice[mask] each time.",
      solution: { lang: "python",
        title: "assign.py",
        code: `import itertools, random, time

def assign(cost):
    """cost[w][j]: cost of worker w doing job j. Give each worker one job, minimising the total. O(2^n * n).
    Workers are assigned in order, so the number of jobs taken (popcount of mask) says which worker is next."""
    n = len(cost); INF = float("inf")
    best = [INF] * (1 << n); best[0] = 0; choice = [0] * (1 << n)
    for mask in range(1 << n):
        if best[mask] == INF: continue
        w = mask.bit_count()                       # the next worker to place
        if w == n: continue
        for j in range(n):
            if not mask >> j & 1:
                nm = mask | 1 << j; c = best[mask] + cost[w][j]
                if c < best[nm]: best[nm] = c; choice[nm] = j
    jobs, mask = [], (1 << n) - 1                  # walk back: the last job added to each mask
    while mask: j = choice[mask]; jobs.append(j); mask ^= 1 << j
    return best[-1], jobs[::-1]                    # jobs[w] is worker w's job

def assign_brute(cost):
    n = len(cost)
    return min(sum(cost[w][p[w]] for w in range(n)) for p in itertools.permutations(range(n)))

rnd = random.Random(37)
for _ in range(200):
    n = rnd.randint(1, 7); cost = [[rnd.randint(1, 50) for _ in range(n)] for _ in range(n)]
    total, jobs = assign(cost)
    assert total == assign_brute(cost)
    assert sorted(jobs) == list(range(n)) and sum(cost[w][jobs[w]] for w in range(n)) == total
print("200 random cost matrices: matches every permutation, and the returned assignment is a permutation with that cost")

for n in (9, 10, 16):
    cost = [[rnd.randint(1, 100) for _ in range(n)] for _ in range(n)]
    t = time.perf_counter(); a, _ = assign(cost); ta = time.perf_counter() - t
    if n <= 10:
        t = time.perf_counter(); b = assign_brute(cost); tb = time.perf_counter() - t; assert a == b
        print(f"n={n}: bitmask DP {ta * 1000:.0f} ms, all {n}! permutations {tb * 1000:.0f} ms")
    else: print(f"n={n}: bitmask DP {ta * 1000:.0f} ms ({2**n:,} masks); permutations would be {n}! = 20,922,789,888,000")`,
        out: `200 random cost matrices: matches every permutation, and the returned assignment is a permutation with that cost
n=9: bitmask DP 0 ms, all 9! permutations 283 ms
n=10: bitmask DP 1 ms, all 10! permutations 3024 ms
n=16: bitmask DP 97 ms (65,536 masks); permutations would be 16! = 20,922,789,888,000`,
        notes: [
          { t: "p",
            text: "All 200 random matrices matched brute force, and each recovered assignment was a valid permutation with the reported cost. At n = 10 the DP took 1 ms and the permutations 3 seconds; at n = 16 the DP took 97 ms, where 16! permutations would be 21 trillion." },
          { t: "p",
            text: "For real assignment problems with larger n, the Hungarian algorithm solves this in O(n³), and scipy.optimize.linear_sum_assignment implements it. The mask DP is the general technique; Hungarian is the specialised one." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: the route optimiser that never returned",
      body: [
        { t: "p",
          text: "**Symptom.** A field-service app's \"optimise my route\" button worked for technicians with eight or nine stops and spun forever for one with fourteen." },
        { t: "p",
          text: "**Mechanism.** It tried every permutation of stops: 9! is 362,880, but 14! is 87 billion. Nobody had tested above ten stops." },
        { t: "p",
          text: "**Fix.** Held-Karp for up to 15 stops, which returns in well under a second, and a nearest-neighbour tour improved by 2-opt above that, with the result labelled as approximate. A test now times the optimiser at the largest allowed number of stops." }
      ] }
  ],

  takeaways: [
    "An integer is a **set of flags**: | is union, & intersection, >> k & 1 membership.",
    "**x & (x − 1)** clears the lowest bit; **x & −x** isolates it.",
    "Use **int.bit_count**: 4 ms against 408 ms for a loop on 200,000 integers.",
    "**XOR** of everything leaves the element that appears an odd number of times.",
    "Iterate subsets with **sub = (sub − 1) & mask**.",
    "Held-Karp's state is **(visited mask, last city)**: O(2ⁿ · n²) instead of n!.",
    "Measured: 15 cities in **0.17 s**, where every tour would be 87 billion.",
    "Bitmask DP fits when **n ≤ about 20**; beyond that, look for another idea."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "What does x & (x − 1) compute?",
        options: [
          "x without its lowest set bit",
          "Only the lowest set bit of x",
          "x rounded down to a power of two",
          "The number of bits set in x"
        ],
        answer: 0,
        why: "Subtracting 1 flips the lowest set bit and every zero below it, so the AND removes exactly that bit. x & −x isolates it instead; counting needs a loop or bit_count." },
      { stem: "Why does Held-Karp's state not include the order of visited cities?",
        options: [
          "The order is stored in a heap",
          "Finishing cost ignores the order",
          "Cities are always visited in order",
          "Python sets cannot hold any order"
        ],
        answer: 1,
        why: "From a given position with a given set visited, the cheapest way to finish is the same whatever order led there. That is what collapses n! orders into 2ⁿ · n states." },
      { stem: "Why can the iterative Held-Karp loop over masks in increasing order?",
        options: [
          "Larger masks are cheaper to fill in",
          "Masks grow from smaller masks",
          "Python iterates the bits from the top",
          "The order does not matter at all"
        ],
        answer: 1,
        why: "A transition adds a bit, which makes the number larger, so every mask's predecessors come before it. Order matters; another order would read unfinished entries." },
      { stem: "n = 40 items, and the question is about subsets. Bitmask DP is…",
        options: [
          "Fine, since 2⁴⁰ is quite small",
          "Infeasible: a trillion states",
          "Fine, as long as lru_cache is used",
          "Required by the problem statement"
        ],
        answer: 1,
        why: "2⁴⁰ is about 1.1 × 10¹². Caching does not reduce the number of states. Meet-in-the-middle (2²⁰ per half) or a non-exponential idea is needed." }
    ] },

  interview: { title: "In an interview",
    sub: "Spot the small n, then name the state.",
    questions: [
      { level: "core",
        q: "Find the number that appears once when every other appears twice, in O(1) space.",
        strong: "A strong answer uses XOR and explains why it works.",
        answer: [
          { t: "p",
            text: "XOR all the numbers. XOR is associative and commutative, a ^ a = 0 and a ^ 0 = a, so every pair cancels and only the single value remains. O(n) time, O(1) space. If every other number appears three times, count each bit position modulo 3 instead." }
        ] },
      { level: "advanced",
        q: "Solve the travelling salesman problem exactly for 15 cities.",
        strong: "A strong answer gives Held-Karp's state, transition and complexity.",
        answer: [
          { t: "p",
            text: "dp[mask][j] is the shortest path that starts at city 0, visits exactly the cities in mask, and ends at j. Start with dp[{0}][0] = 0; extend each state to any unvisited k with cost d[j][k]; the answer is min over j of dp[all][j] + d[j][0]. O(2ⁿ · n²) time and O(2ⁿ · n) memory: at 15 cities about 7 million steps." }
        ] },
      { level: "core",
        q: "Generate all subsets of a set.",
        strong: "A strong answer gives the mask method and its cost.",
        answer: [
          { t: "p",
            text: "Number the elements 0 to n − 1; each integer from 0 to 2ⁿ − 1 is a subset, with bit i meaning element i is in it. Loop over the integers and collect elements whose bits are set: O(2ⁿ · n). itertools.combinations by size, or backtracking, produce the same in a different order and are often clearer." }
        ] }
    ] }
});
