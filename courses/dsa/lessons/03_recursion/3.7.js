/* ============================================================================
   LESSON 3.7 — Greedy, with Proof
   ========================================================================= */
EC.receiveLesson({
  id: "3.7",

  lede: "A greedy algorithm makes the locally best choice and never revisits it. When it is right it is usually the simplest and fastest solution; when it is wrong it is wrong silently, on inputs nobody tried. **So a greedy solution needs either a proof or a counterexample search, and this lesson does both**: it tests three plausible rules for scheduling against brute force, finds concrete counterexamples to two of them, proves the third with an exchange argument, and shows where greedy stops working altogether.",

  objectives: [
    "Prove a greedy choice with an exchange argument",
    "Search for counterexamples to a greedy rule with a brute-force oracle",
    "Schedule the most non-overlapping intervals by earliest end",
    "Recognise when values or 0/1 choices break greedy and DP is needed",
    "Solve the gas-station problem with a one-pass greedy and justify it"
  ],

  prerequisites: ["3.2", "1.7"],

  blocks: [
    { t: "h2",
      n: "01",
      id: "test",
      text: "Three plausible rules, tested",
      sub: "Let brute force find the counterexamples" },
    { t: "p",
      text: "To choose the most meetings that do not overlap, three rules sound reasonable: earliest start, shortest first, and earliest end. Rather than argue about them, the script runs each against a brute force over every subset on 3,000 random small inputs and keeps the first input where a rule is wrong. Earliest start and shortest first both fail; earliest end never does." },
    { t: "code",
      lang: "python",
      title: "greedy.py — rules against brute force, weighted intervals, fractional knapsack, and timings",
      code: `import bisect, itertools, random, time

def most_meetings_brute(iv):                      # the largest set of pairwise non-overlapping intervals, by trying subsets
    for k in range(len(iv), 0, -1):
        for c in itertools.combinations(sorted(iv), k):
            if all(c[i][1] <= c[i + 1][0] for i in range(k - 1)): return k
    return 0

def greedy_by(iv, key):                           # take intervals in key order, keeping each that fits
    taken = []
    for s, e in sorted(iv, key=key):
        if all(e <= ts or s >= te for ts, te in taken): taken.append((s, e))
    return len(taken)

def earliest_end(iv):                             # the proven rule, in O(n log n)
    count, end = 0, float("-inf")
    for s, e in sorted(iv, key=lambda x: x[1]):
        if s >= end: count += 1; end = e
    return count

def weighted_schedule(iv):                        # DP when intervals have values: best[i] over the first i by end time
    iv = sorted(iv, key=lambda x: x[1]); ends = [e for _, e, _ in iv]; best = [0] * (len(iv) + 1)
    for i, (s, e, v) in enumerate(iv, 1):
        j = bisect.bisect_right(ends, s, 0, i - 1)   # intervals ending at or before s
        best[i] = max(best[i - 1], best[j] + v)
    return best[-1]

def weighted_brute(iv):
    best = 0
    for k in range(len(iv) + 1):
        for c in itertools.combinations(sorted(iv), k):
            if all(c[i][1] <= c[i + 1][0] for i in range(k - 1)): best = max(best, sum(x[2] for x in c))
    return best

rnd = random.Random(38)
def rand_iv(n): return [(s, s + rnd.randint(1, 10)) for s in (rnd.randint(0, 30) for _ in range(n))]

# 1. Test four plausible greedy rules against brute force; keep the first counterexample for each wrong one.
rules = {"earliest end": lambda x: x[1], "earliest start": lambda x: x[0], "shortest first": lambda x: x[1] - x[0]}
found = {}
for _ in range(3_000):
    iv = rand_iv(rnd.randint(1, 8)); truth = most_meetings_brute(iv)
    assert earliest_end(iv) == truth
    for name, key in rules.items():
        if greedy_by(iv, key) != truth and name not in found: found[name] = (iv, greedy_by(iv, key), truth)
print("3,000 random cases: 'earliest end' always matched brute force")
for name in rules:
    if name in found:
        iv, got, truth = found[name]; print(f"  '{name}' fails, e.g. {sorted(iv)}: picks {got}, best is {truth}")
    else: print(f"  '{name}': no counterexample found")

# 2. With values, no greedy order works; DP does.
for _ in range(500):
    iv = [(s, e, rnd.randint(1, 20)) for s, e in rand_iv(rnd.randint(0, 8))]
    assert weighted_schedule(iv) == weighted_brute(iv)
for long_value in (10, 15):
    w = [(0, 10, long_value), (0, 5, 6), (5, 10, 6)]
    print(f"weighted {w}: earliest end takes the two short ones, worth 12; DP finds {weighted_schedule(w)}")
print("500 random weighted cases: DP matched brute force")

# 3. Fractional knapsack: greedy by value/weight is optimal; for 0/1 it is not.
def frac_greedy(items, cap):
    total = 0.0
    for w, v in sorted(items, key=lambda x: -x[1] / x[0]):
        take = min(w, cap); total += v * take / w; cap -= take
        if cap == 0: break
    return total
def zero_one_greedy(items, cap):
    total = 0
    for w, v in sorted(items, key=lambda x: -x[1] / x[0]):
        if w <= cap: total += v; cap -= w
    return total
def zero_one_best(items, cap):
    return max(sum(v for _, v in c) for k in range(len(items) + 1) for c in itertools.combinations(items, k) if sum(w for w, _ in c) <= cap)
items = [(10, 60), (20, 100), (30, 120)]
print(f"\\nitems (weight, value) {items}, capacity 50: fractional greedy {frac_greedy(items, 50):.0f}; "
      f"0/1 greedy by ratio {zero_one_greedy(items, 50)}, 0/1 optimum {zero_one_best(items, 50)}")

print(f"\\n{'n':>7}{'brute ms':>10}{'greedy ms':>11}   interval scheduling")
for n in (14, 16, 18, 1_000_000):
    iv = [(s, s + rnd.randint(1, 50)) for s in (rnd.randint(0, (3 if n <= 18 else 40) * n) for _ in range(n))]   # dense when small, so brute force must search
    t = time.perf_counter(); g = earliest_end(iv); tg = time.perf_counter() - t
    if n <= 18:
        t = time.perf_counter(); b = most_meetings_brute(iv); tb = time.perf_counter() - t; assert b == g
        print(f"{n:>7,}{tb * 1000:>10.0f}{tg * 1000:>11.3f}")
    else: print(f"{n:>7,}{'skipped':>10}{tg * 1000:>11.0f}   ({g:,} meetings)")`,
      out: `3,000 random cases: 'earliest end' always matched brute force
  'earliest end': no counterexample found
  'earliest start' fails, e.g. [(2, 8), (10, 15), (11, 12), (13, 15), (18, 24), (19, 22), (22, 30)]: picks 3, best is 5
  'shortest first' fails, e.g. [(3, 6), (7, 17), (11, 16), (15, 19), (18, 23), (27, 36), (30, 34)]: picks 3, best is 4
weighted [(0, 10, 10), (0, 5, 6), (5, 10, 6)]: earliest end takes the two short ones, worth 12; DP finds 12
weighted [(0, 10, 15), (0, 5, 6), (5, 10, 6)]: earliest end takes the two short ones, worth 12; DP finds 15
500 random weighted cases: DP matched brute force

items (weight, value) [(10, 60), (20, 100), (30, 120)], capacity 50: fractional greedy 240; 0/1 greedy by ratio 160, 0/1 optimum 220

      n  brute ms  greedy ms   interval scheduling
     14         8      0.006
     16        35      0.003
     18       136      0.007
1,000,000   skipped        548   (638,383 meetings)` },
    { t: "viz",
      title: "A counterexample found by the search",
      caption: "The seven intervals on which earliest start fails. Taking [2, 8), then the earliest start that fits, [10, 15), blocks [11, 12) and [13, 15): three meetings. Earliest end keeps five.",
      svg: `<svg viewBox="0 0 760 236" width="100%" role="img">
<text x="110" y="25" text-anchor="end" class="s-sub">[2, 8)</text>
<rect x="160" y="10" width="117" height="20" rx="4" class="s-fill" style="stroke:var(--line);stroke-width:1.2"/>
<rect x="160" y="13" width="117" height="6" rx="2" style="fill:var(--good)"/>
<rect x="160" y="21" width="117" height="6" rx="2" style="fill:var(--crit)"/>
<text x="110" y="55" text-anchor="end" class="s-sub">[10, 15)</text>
<rect x="320" y="40" width="97" height="20" rx="4" class="s-fill" style="stroke:var(--line);stroke-width:1.2"/>
<rect x="320" y="51" width="97" height="6" rx="2" style="fill:var(--crit)"/>
<text x="110" y="85" text-anchor="end" class="s-sub">[11, 12)</text>
<rect x="340" y="70" width="17" height="20" rx="4" class="s-fill" style="stroke:var(--line);stroke-width:1.2"/>
<rect x="340" y="73" width="17" height="6" rx="2" style="fill:var(--good)"/>
<text x="110" y="115" text-anchor="end" class="s-sub">[13, 15)</text>
<rect x="380" y="100" width="37" height="20" rx="4" class="s-fill" style="stroke:var(--line);stroke-width:1.2"/>
<rect x="380" y="103" width="37" height="6" rx="2" style="fill:var(--good)"/>
<text x="110" y="145" text-anchor="end" class="s-sub">[18, 24)</text>
<rect x="480" y="130" width="117" height="20" rx="4" class="s-fill" style="stroke:var(--line);stroke-width:1.2"/>
<rect x="480" y="141" width="117" height="6" rx="2" style="fill:var(--crit)"/>
<text x="110" y="175" text-anchor="end" class="s-sub">[19, 22)</text>
<rect x="500" y="160" width="57" height="20" rx="4" class="s-fill" style="stroke:var(--line);stroke-width:1.2"/>
<rect x="500" y="163" width="57" height="6" rx="2" style="fill:var(--good)"/>
<text x="110" y="205" text-anchor="end" class="s-sub">[22, 30)</text>
<rect x="560" y="190" width="157" height="20" rx="4" class="s-fill" style="stroke:var(--line);stroke-width:1.2"/>
<rect x="560" y="193" width="157" height="6" rx="2" style="fill:var(--good)"/>
<text x="160" y="228" class="s-sub" style="fill:var(--good)">green: earliest end, 5 meetings</text>
<text x="460" y="228" class="s-sub" style="fill:var(--crit)">red: earliest start, 3</text>
</svg>` },
    { t: "callout",
      kind: "trap",
      title: "A plausible greedy rule with no proof is a guess",
      body: [
        { t: "p",
          text: "Shortest first sounds safe, since short meetings leave the most room, and it was wrong on a seven-interval input that random search found within a few thousand tries. When a greedy idea comes to mind, write the brute force too and compare them on random small cases before trusting it. It takes minutes and has caught every wrong rule in this lesson." }
      ] },
    { t: "h2", n: "02", id: "proof", text: "Why earliest end is right", sub: "The exchange argument" },
    { t: "p",
      text: "Let g₁ be the interval that ends first. Take any optimal schedule and its first interval o₁. Since g₁ ends no later than o₁, replacing o₁ with g₁ cannot create an overlap with the rest of the schedule, and the count is unchanged. So some optimal schedule starts with g₁. Remove every interval that overlaps g₁ and apply the same argument to what remains. By induction, the greedy schedule is as large as an optimal one." },
    { t: "callout",
      kind: "insight",
      title: "The template for every exchange argument",
      body: [
        { t: "p",
          text: "Take an optimal solution that differs from the greedy one at the first choice. Show that swapping its choice for the greedy one keeps it feasible and no worse. Repeat. The same argument proves Kruskal's cut property (2.7), Huffman coding and scheduling by deadline. If the swap can make things worse, as with values attached to intervals, greedy is not safe." }
      ] },
    { t: "ladder",
      title: "Most non-overlapping meetings",
      rungs: [
        { level: "bad",
          label: "Try every subset",
          why: "O(2ⁿ · n): 136 ms at 18 dense intervals, doubling per interval. Used here as the oracle.",
          code: `def most_meetings_brute(iv):                      # the largest set of pairwise non-overlapping intervals, by trying subsets
    for k in range(len(iv), 0, -1):
        for c in itertools.combinations(sorted(iv), k):
            if all(c[i][1] <= c[i + 1][0] for i in range(k - 1)): return k
    return 0`,
          note: "Starting from the largest size returns at the first feasible set." },
        { level: "ok",
          label: "DP over intervals sorted by end",
          why: "O(n log n), and it handles values: the right tool when meetings have weights.",
          code: `def weighted_schedule(iv):                        # DP when intervals have values: best[i] over the first i by end time
    iv = sorted(iv, key=lambda x: x[1]); ends = [e for _, e, _ in iv]; best = [0] * (len(iv) + 1)
    for i, (s, e, v) in enumerate(iv, 1):
        j = bisect.bisect_right(ends, s, 0, i - 1)   # intervals ending at or before s
        best[i] = max(best[i - 1], best[j] + v)
    return best[-1]`,
          note: "With all values equal it gives the same count as the greedy, at more cost and code." },
        { level: "best",
          label: "Earliest end first",
          why: "O(n log n): a million intervals in 548 ms, and proven optimal for counting.",
          code: `def earliest_end(iv):                             # the proven rule, in O(n log n)
    count, end = 0, float("-inf")
    for s, e in sorted(iv, key=lambda x: x[1]):
        if s >= end: count += 1; end = e
    return count`,
          note: "Valid only when every interval is worth the same." }
      ] },
    { t: "h2",
      n: "03",
      id: "limits",
      text: "Where greedy stops working",
      sub: "Values, and all-or-nothing choices" },
    { t: "dl",
      items: [
        [
          "Weighted intervals",
          "One long meeting worth 15 against two short ones worth 6 each: earliest end takes the two short ones, 12, and the DP finds 15. The exchange argument breaks because swapping can lose value."
        ],
        [
          "Fractional against 0/1 knapsack",
          "Greedy by value per unit weight is optimal when items can be split: 240 on the classic example. When they cannot, the same order gives 160 against an optimum of 220."
        ],
        [
          "Coins",
          "Largest coin first is optimal for 1, 2, 5, 10 and wrong for 1, 3, 4 (3.4). The coin system decides, not the algorithm."
        ]
      ] },
    { t: "table",
      head: ["Problem", "Greedy rule", "Status"],
      rows: [
        ["Most non-overlapping intervals", "earliest end", "proven by exchange"],
        ["Fewest rooms for all meetings", "sweep, or heap of ends (1.7)", "proven"],
        ["Minimum spanning tree", "cheapest safe edge (2.7)", "proven by the cut property"],
        ["Fractional knapsack", "highest value per weight", "proven"],
        ["0/1 knapsack, weighted intervals", "any order", "fails: use DP"],
        ["Gas station", "restart after any deficit", "proven: see the exercise"]
      ] },
    { t: "exercise",
      kind: "Challenge",
      title: "Where to start the loop",
      difficulty: "core",
      minutes: 20,
      body: [
        { t: "p",
          text: "Stations on a circular route give gas[i] fuel, and driving from station i to the next costs cost[i]. Find a starting station from which you can complete the loop with an initially empty tank, or −1 if none exists, in one pass. Argue why the greedy restart is safe, and check it against simulating every start." }
      ],
      requirements: [
        "−1 exactly when total gas is less than total cost",
        "One pass: on a negative tank, restart at the next station",
        "Verified by simulating the loop from the returned start",
        "A sentence of proof for why the skipped stations cannot be starts"
      ],
      hint: "If you start at s and first run dry reaching i + 1, then starting anywhere between s and i arrives at i + 1 with even less fuel.",
      solution: { lang: "python",
        title: "gas_station.py",
        code: `import random, time

def start_station(gas, cost):
    """Circular route: station i gives gas[i], driving to i+1 costs cost[i]. Return the one start that completes the loop, or -1.
    Greedy: if the tank goes negative on the way to i+1, no station from start..i can be the start, so restart at i+1."""
    if sum(gas) < sum(cost): return -1                 # not enough fuel in total: impossible from anywhere
    start, tank = 0, 0
    for i in range(len(gas)):
        tank += gas[i] - cost[i]
        if tank < 0: start, tank = i + 1, 0             # every station from the old start to i is ruled out
    return start

def start_station_brute(gas, cost):                    # simulate from every start
    n = len(gas)
    for s in range(n):
        tank = 0
        for k in range(n):
            i = (s + k) % n; tank += gas[i] - cost[i]
            if tank < 0: break
        else: return s
    return -1

rnd = random.Random(39)
agree = feasible = 0
for _ in range(5_000):
    n = rnd.randint(1, 10)
    gas, cost = [rnd.randint(0, 9) for _ in range(n)], [rnd.randint(0, 9) for _ in range(n)]
    b = start_station_brute(gas, cost); g = start_station(gas, cost)
    if b == -1: assert g == -1
    else:                                               # several starts can work when the margin is zero; check g is one of them
        assert g != -1 and start_station_brute(gas[g:] + gas[:g], cost[g:] + cost[:g]) == 0; feasible += 1
    agree += 1
print(f"{agree:,} random routes ({feasible:,} feasible): the greedy start always completes the loop, and -1 exactly when no start does")
print(start_station([1, 2, 3, 4, 5], [3, 4, 5, 1, 2]), start_station([2, 3, 4], [3, 4, 3]))

for n in (2_000, 4_000, 1_000_000):
    gas = [rnd.randint(0, 100) for _ in range(n)]; cost = [rnd.randint(0, 100) for _ in range(n)]
    gas[-1] += max(0, sum(cost) - sum(gas))             # exactly enough fuel in total: feasible, and the start tends to be late
    t = time.perf_counter(); g = start_station(gas, cost); tg = time.perf_counter() - t
    if n <= 4_000:
        t = time.perf_counter(); b = start_station_brute(gas, cost); tb = time.perf_counter() - t
        assert g == b; print(f"n={n:>9,}: greedy {tg * 1000:.2f} ms, every start {tb * 1000:.0f} ms, start {g:,}")
    else: print(f"n={n:>9,}: greedy {tg * 1000:.0f} ms, start {g:,}")`,
        out: `5,000 random routes (2,567 feasible): the greedy start always completes the loop, and -1 exactly when no start does
3 -1
n=    2,000: greedy 0.12 ms, every start 2 ms, start 1,099
n=    4,000: greedy 0.24 ms, every start 9 ms, start 3,987
n=1,000,000: greedy 59 ms, start 534,738`,
        notes: [
          { t: "p",
            text: "Proof: starting at s, every prefix of the trip up to i had a non-negative tank, so starting at a later station k ≤ i drops a non-negative prefix and reaches i + 1 with no more fuel, still negative. So none of s..i can work. And if the total is non-negative, the station after the last deficit completes the loop, because the deficits before it are covered by the surplus after it." },
          { t: "p",
            text: "On 5,000 random routes, the greedy start always completed the loop when one existed, and returned −1 exactly when none did. Simulating every start was only 9 ms at 4,000 stations, because most starts fail within a few steps, but it is O(n²) in the worst case; the greedy is O(n) always." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: the ad scheduler that left money on the table",
      body: [
        { t: "p",
          text: "**Symptom.** A revenue review found that the slot scheduler for a video service was filling breaks with many short ads while rejecting longer, higher-paying ones, earning about 8% less than a hand-built schedule on the same inventory." },
        { t: "p",
          text: "**Mechanism.** It used earliest-end greedy, which maximises the number of ads placed, not their value. With prices attached, that is weighted interval scheduling, where the greedy has no proof." },
        { t: "p",
          text: "**Fix.** A DP over ads sorted by end time, with a binary search for the last compatible ad: O(n log n), and the 8% returned. A regression test now compares the scheduler's revenue with brute force on small random breaks." }
      ] }
  ],

  takeaways: [
    "A greedy rule needs a **proof or a counterexample search**.",
    "Random search against brute force found counterexamples to **earliest start** and **shortest first**.",
    "**Earliest end** is optimal for counting intervals, by an **exchange argument**.",
    "Exchange: swap the optimal solution's first choice for the greedy one; **feasible and no worse**.",
    "With **values**, greedy fails: 12 against 15 in the weighted example; use DP.",
    "Fractional knapsack is greedy (240); **0/1** is not (160 against 220).",
    "Earliest end handled **a million intervals in 548 ms**.",
    "Gas station: **restart after any deficit**, and −1 exactly when total fuel is short."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "How did the lesson establish that 'shortest first' is wrong?",
        options: [
          "By writing out an exchange argument",
          "A random-search counterexample",
          "By measuring its running time closely",
          "By comparing it with the weighted DP"
        ],
        answer: 1,
        why: "Random inputs were compared with brute force and the first disagreement kept: picks 3 where 4 are possible. One counterexample disproves a rule; an exchange argument proves one." },
      { stem: "In the exchange argument, why can the earliest-ending interval replace the optimum's first?",
        options: [
          "It is the shortest of the intervals",
          "It ends no later than o₁",
          "It starts earliest of all of them",
          "It has the highest value attached"
        ],
        answer: 1,
        why: "Ending no later than o₁ means it cannot overlap anything that came after o₁. Length, start time and value are not what the argument uses." },
      { stem: "Intervals have different values. Earliest end is…",
        options: ["Still optimal", "Not safe: use a DP", "Optimal if sorted by value", "Optimal for unit lengths"],
        answer: 1,
        why: "Swapping in the earliest-ending interval can lose value, so the exchange argument fails: 12 against 15 in the example. Weighted interval scheduling is solved by DP." },
      { stem: "Gas station: the tank goes negative reaching i + 1 from start s. Why skip s..i?",
        options: [
          "They all hold less gas than s",
          "Each arrives with less fuel",
          "The total fuel is negative",
          "They were all visited already"
        ],
        answer: 1,
        why: "Starting later drops a prefix whose running total was non-negative, so the tank at i + 1 can only be lower. The total being negative is a separate check." }
    ] },

  interview: { title: "In an interview",
    sub: "When you say greedy, say why it is safe.",
    questions: [
      { level: "core",
        q: "Schedule the maximum number of non-overlapping meetings.",
        strong: "A strong answer gives earliest end and a one-paragraph exchange argument.",
        answer: [
          { t: "p",
            text: "Sort by end time; take a meeting if it starts at or after the last taken one ends. O(n log n). It is optimal because the first meeting to end can replace the first meeting of any optimal schedule without creating an overlap, and the same argument repeats on what is left. If meetings had values, I would switch to a DP over meetings sorted by end time." }
        ] },
      { level: "advanced",
        q: "How do you know whether a greedy algorithm is correct?",
        strong: "A strong answer names exchange arguments, matroid structure loosely, and testing against brute force.",
        answer: [
          { t: "p",
            text: "Prove it, usually with an exchange argument, or show it keeps an invariant such as 'greedy stays ahead'. Problems with matroid structure, such as spanning trees, are greedy-solvable. In practice I also write the brute force and compare them on thousands of small random cases; a counterexample from that is decisive and fast to find, as it was for earliest-start and shortest-first here." }
        ] },
      { level: "core",
        q: "Jump game: can you reach the last index?",
        strong: "A strong answer gives the furthest-reach greedy and its invariant.",
        answer: [
          { t: "p",
            text: "Track the furthest index reachable so far; for each i up to it, update furthest = max(furthest, i + nums[i]). If i ever exceeds furthest, return False; if furthest reaches the end, True. O(n). It is correct because every index up to furthest is reachable, an invariant the loop maintains, and nothing beyond it can be reached by any path." }
        ] }
    ] }
});
