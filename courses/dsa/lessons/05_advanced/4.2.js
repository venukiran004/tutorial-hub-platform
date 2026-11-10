/* ============================================================================
   LESSON 4.2 — Python's Constant Factors
   ========================================================================= */
EC.receiveLesson({
  id: "4.2",

  lede: "Big-O says how cost grows; it says nothing about the constant in front, and in Python the constants vary by a factor of a thousand. **The rule that follows is simple: work done by a built-in, in C, is cheap; work done by a Python-level loop, one bytecode at a time, is not.** This lesson times the differences that actually change programs, from data structure choice to loop micro-optimisations, so you know which ones are worth caring about and which are noise.",

  objectives: [
    "Rank Python costs: wrong structure, Python loop, call overhead, name lookup",
    "Replace Python-level loops with built-ins, comprehensions or NumPy",
    "Choose set, dict and deque for the operations they make O(1)",
    "Use key functions rather than comparison functions for sorting",
    "Measure with timeit, taking the best of several runs"
  ],

  prerequisites: ["1.2", "1.3"],

  blocks: [
    { t: "h2", n: "01", id: "measure", text: "Seven measurements", sub: "Best of several runs, one machine" },
    { t: "p",
      text: "Each comparison below does the same work two or more ways and reports the best of several runs with timeit, which removes most scheduler noise. The ratios matter more than the absolute numbers, which depend on the machine." },
    { t: "code",
      lang: "python",
      title: "const.py — the same work done different ways, timed",
      code: `import random, sys, timeit
from collections import deque
from functools import cmp_to_key
import numpy as np

def ms(stmt, setup="pass", number=1, repeat=5, g=None):     # best of several runs, in milliseconds per run
    return min(timeit.repeat(stmt, setup, number=number, repeat=repeat, globals=g or globals())) / number * 1000

random.seed(42)
N = 1_000_000
data = [random.randint(0, 10**6) for _ in range(N)]
arr = np.array(data, dtype=np.int64)

def squares_loop(xs):
    out = []
    for x in xs: out.append(x * x)
    return sum(out)
def squares_comp(xs): return sum([x * x for x in xs])
def squares_gen(xs): return sum(x * x for x in xs)
def squares_numpy(a): return int((a * a).sum())
assert squares_loop(data) == squares_comp(data) == squares_gen(data) == squares_numpy(arr)

print("1. sum of squares of 1,000,000 ints")
for name, stmt in (("for loop + append", "squares_loop(data)"), ("list comprehension", "squares_comp(data)"),
                   ("generator expression", "squares_gen(data)"), ("NumPy vectorised", "squares_numpy(arr)")):
    print(f"   {name:<22} {ms(stmt, repeat=3):8.1f} ms")

probe = random.sample(range(2 * 10**6), 1_000); small = data[:10_000]; sset = set(small)
print("\\n2. 1,000 membership tests in a 10,000-element collection")
print(f"   list   {ms('[p in small for p in probe]', repeat=3):8.1f} ms")
print(f"   set    {ms('[p in sset for p in probe]'):8.3f} ms")

print("\\n3. removing 50,000 items from the front")
print(f"   list.pop(0)      {ms('while q: q.pop(0)', 'q = list(range(50_000))', repeat=3):7.1f} ms")
print(f"   deque.popleft()  {ms('while q: q.popleft()', 'q = deque(range(50_000))', repeat=3):7.1f} ms")

words = [random.choice(["alpha", "beta", "gamma", "delta"]) for _ in range(200_000)]
def concat_plus(ws):
    s = ""
    for w in ws: s += w
    return s
print("\\n4. joining 200,000 short strings")
print(f"   s += w in a loop  {ms('concat_plus(words)'):6.1f} ms   (CPython resizes in place when it can; other Pythons may not)")
print(f"   ''.join(words)    {ms(chr(39) * 2 + '.join(words)'):6.1f} ms")

G = 3
def use_global(n):
    t = 0
    for i in range(n): t += i * G
    return t
def use_local(n, k=G):
    t = 0
    for i in range(n): t += i * k
    return t
def add(a, b): return a + b
def with_calls(n):
    t = 0
    for i in range(n): t = add(t, i)
    return t
def inline(n):
    t = 0
    for i in range(n): t = t + i
    return t
print("\\n5. 1,000,000 loop iterations")
print(f"   global name in the loop   {ms('use_global(N)', repeat=3):6.0f} ms")
print(f"   local name in the loop    {ms('use_local(N)', repeat=3):6.0f} ms")
print(f"   a function call per step  {ms('with_calls(N)', repeat=3):6.0f} ms")
print(f"   the same work inline      {ms('inline(N)', repeat=3):6.0f} ms")
print(f"   built-in sum(range(N))    {ms('sum(range(N))', repeat=3):6.0f} ms")

pairs = [(random.random(), random.random()) for _ in range(200_000)]
def cmp(a, b): return (a[1] > b[1]) - (a[1] < b[1])
print("\\n6. sorting 200,000 pairs by their second field")
print(f"   key=lambda p: p[1]      {ms('sorted(pairs, key=lambda p: p[1])', repeat=3):6.0f} ms")
print(f"   key=cmp_to_key(cmp)     {ms('sorted(pairs, key=cmp_to_key(cmp))', repeat=3):6.0f} ms")

print(f"\\n7. memory: a list of 1,000,000 ints {sys.getsizeof(data) / 2**20 + sum(map(sys.getsizeof, data[:1000])) * N / 1000 / 2**20:.0f} MiB "
      f"(pointers plus int objects); a NumPy int64 array {arr.nbytes / 2**20:.0f} MiB")`,
      out: `1. sum of squares of 1,000,000 ints
   for loop + append          84.0 ms
   list comprehension         70.6 ms
   generator expression       68.2 ms
   NumPy vectorised            2.8 ms

2. 1,000 membership tests in a 10,000-element collection
   list       52.8 ms
   set       0.036 ms

3. removing 50,000 items from the front
   list.pop(0)       2734.8 ms
   deque.popleft()      2.0 ms

4. joining 200,000 short strings
   s += w in a loop    19.6 ms   (CPython resizes in place when it can; other Pythons may not)
   ''.join(words)       1.6 ms

5. 1,000,000 loop iterations
   global name in the loop       50 ms
   local name in the loop        46 ms
   a function call per step      65 ms
   the same work inline          39 ms
   built-in sum(range(N))        24 ms

6. sorting 200,000 pairs by their second field
   key=lambda p: p[1]          54 ms
   key=cmp_to_key(cmp)        672 ms

7. memory: a list of 1,000,000 ints 35 MiB (pointers plus int objects); a NumPy int64 array 8 MiB` },
    { t: "viz",
      title: "How much each choice cost",
      caption: "Bar length is the logarithm of the slowdown, computed from the output above. The wrong data structure costs a factor of a thousand; a global lookup or a function call per step costs between 9% and 67%.",
      svg: `<svg viewBox="0 0 760 286" width="100%" role="img">
<text x="190" y="31.0" text-anchor="end" class="s-label">list.pop(0) vs deque</text>
<rect x="200" y="14" width="409.6" height="26" rx="4" class="s-fill" style="stroke:var(--crit);stroke-width:1.8"/>
<text x="617.6" y="31.0" class="s-sub">1,367×</text>
<text x="190" y="69.0" text-anchor="end" class="s-label">in list vs in set</text>
<rect x="200" y="52" width="413.5" height="26" rx="4" class="s-fill" style="stroke:var(--crit);stroke-width:1.8"/>
<text x="621.5" y="69.0" class="s-sub">1,467×</text>
<text x="190" y="107.0" text-anchor="end" class="s-label">Python loop vs NumPy</text>
<rect x="200" y="90" width="196.3" height="26" rx="4" class="s-fill" style="stroke:var(--warn);stroke-width:1.8"/>
<text x="404.3" y="107.0" class="s-sub">30×</text>
<text x="190" y="145.0" text-anchor="end" class="s-label">cmp_to_key vs key=</text>
<rect x="200" y="128" width="147.2" height="26" rx="4" class="s-fill" style="stroke:var(--warn);stroke-width:1.8"/>
<text x="355.2" y="145.0" class="s-sub">12×</text>
<text x="190" y="183.0" text-anchor="end" class="s-label">s += w vs join</text>
<rect x="200" y="166" width="146.3" height="26" rx="4" class="s-fill" style="stroke:var(--warn);stroke-width:1.8"/>
<text x="354.3" y="183.0" class="s-sub">12×</text>
<text x="190" y="221.0" text-anchor="end" class="s-label">call per step vs inline</text>
<rect x="200" y="204" width="35.0" height="26" rx="4" class="s-fill" style="stroke:var(--ink-2);stroke-width:1.8"/>
<text x="243.0" y="221.0" class="s-sub">1.67×</text>
<text x="190" y="259.0" text-anchor="end" class="s-label">global vs local name</text>
<rect x="200" y="242" width="11.1" height="26" rx="4" class="s-fill" style="stroke:var(--ink-2);stroke-width:1.8"/>
<text x="219.1" y="259.0" class="s-sub">1.09×</text>
</svg>` },
    { t: "callout",
      kind: "insight",
      title: "The order to optimise in",
      body: [
        { t: "p",
          text: "First the algorithm and the data structure: a list where a set belongs, or pop(0) on a list, cost three orders of magnitude. Then move loops into C: built-ins, comprehensions, join, NumPy, a key function. Only then consider micro-optimisations such as local names, which here saved under 10%." }
      ] },
    { t: "h2", n: "02", id: "c-vs-python", text: "Built-ins run in C", sub: "And a Python loop runs bytecode" },
    { t: "dl",
      items: [
        [
          "Data structure first",
          "Membership in a list took 1,467× longer than in a set; pop(0) on a list 1,367× longer than popleft on a deque. Both are O(n) against O(1)."
        ],
        [
          "Vectorise heavy numeric loops",
          "Summing a million squares took 84 ms in a Python loop and 2.8 ms in NumPy: 30×. A comprehension or generator saved only about 18%."
        ],
        [
          "Key functions, not comparisons",
          "cmp_to_key called a Python function for every comparison, about n log n calls, and was 12× slower than a key called once per element."
        ],
        [
          "join, not +=",
          "Repeated += was 12× slower than ''.join here, even with CPython's in-place resize; on other interpreters it can be quadratic."
        ]
      ] },
    { t: "callout",
      kind: "trap",
      title: "Micro-optimising the wrong thing",
      body: [
        { t: "p",
          text: "Making a global name local saved 8% in a tight loop of a million iterations; inlining a function call saved 40%. Both are real, and both are dwarfed by choosing a set over a list. Profile first (cProfile, or timeit on the suspect), and only hand-tune the loop that the profile names." }
      ] },
    { t: "ladder",
      title: "Sum of squares of a million integers",
      rungs: [
        { level: "bad",
          label: "Loop and append, then sum",
          why: "84 ms: a bytecode dispatch, a method lookup and a call per element.",
          code: `def squares_loop(xs):
    out = []
    for x in xs: out.append(x * x)
    return sum(out)`,
          note: "Correct and readable; slow only when n is large and the loop is hot." },
        { level: "ok",
          label: "Generator expression",
          why: "68 ms: no list, no append, but still one Python-level multiplication per element.",
          code: `def squares_gen(xs): return sum(x * x for x in xs)`,
          note: "The idiomatic default." },
        { level: "best",
          label: "NumPy",
          why: "2.8 ms: the loop runs in C over a contiguous int64 array.",
          code: `def squares_numpy(a): return int((a * a).sum())`,
          note: "Only when the data is already numeric and fixed-width; int64 overflows silently where Python ints do not." }
      ] },
    { t: "h2", n: "03", id: "memory", text: "Memory and the rest", sub: "Python ints are objects" },
    { t: "p",
      text: "A list of a million ints holds a million pointers to a million int objects, about 35 MiB here; a NumPy int64 array of the same values is 8 MiB, contiguous. That density is also why NumPy is fast: the CPU streams through memory instead of chasing pointers." },
    { t: "table",
      head: ["Instead of", "Use", "Measured or why"],
      rows: [
        ["x in list (repeatedly)", "a set", "about 1,500× here"],
        ["list.pop(0)", "collections.deque", "about 1,400× here"],
        ["a Python loop over numbers", "a built-in, or NumPy", "sum, max, sorted, map; 30× for NumPy"],
        ["cmp_to_key", "a key function, or a tuple key", "12× here"],
        ["s += piece in a loop", "''.join(pieces)", "12× here, worse elsewhere"],
        ["deep recursion", "a loop with an explicit stack", "recursion limit and frame cost (2.5, 3.5)"],
        ["counting with a dict loop", "collections.Counter", "about 2× in the exercise"]
      ] },
    { t: "exercise",
      kind: "Challenge",
      title: "Make the word counter fast",
      difficulty: "core",
      minutes: 20,
      body: [
        { t: "p",
          text: "A function returns the ten most frequent words, ties broken alphabetically. As first written it builds a list of distinct words with membership tests on a list and counts each with list.count. Rewrite it twice, with a dict and with Counter, keep the output identical, and time all three on 20,000 to 2,000,000 words." }
      ],
      requirements: [
        "Identical output, including tie-breaking, checked by assertion",
        "One pass to count, not one scan per distinct word",
        "heapq.nsmallest for the top k rather than sorting every word",
        "Timings across two orders of magnitude of input"
      ],
      hint: "words.count(w) is a full scan, and doing it for each distinct word makes the whole thing O(n × distinct).",
      solution: { lang: "python",
        title: "top_words.py",
        code: `import heapq, random, time
from collections import Counter

def top_words_slow(words, k):                    # as first written: count each distinct word with list.count, sort everything
    distinct = []
    for w in words:
        if w not in distinct: distinct.append(w)  # list membership: O(distinct) per word
    counts = [(w, words.count(w)) for w in distinct]   # a full scan per distinct word
    counts.sort(key=lambda p: (-p[1], p[0]))
    return counts[:k]

def top_words_dict(words, k):                     # one pass with a dict, then a heap for the top k
    counts = {}
    for w in words: counts[w] = counts.get(w, 0) + 1
    return heapq.nsmallest(k, counts.items(), key=lambda p: (-p[1], p[0]))

def top_words_counter(words, k):                  # Counter counts in C; ties broken by word for a stable answer
    return heapq.nsmallest(k, Counter(words).items(), key=lambda p: (-p[1], p[0]))

rnd = random.Random(43)
vocab = ["".join(rnd.choices("abcdefghijklmnop", k=rnd.randint(2, 7))) for _ in range(3_000)]
weights = [1 / (r + 1) for r in range(len(vocab))]              # Zipf-like: a few words are very common
for n in (20_000, 200_000, 2_000_000):
    words = rnd.choices(vocab, weights, k=n)
    t = time.perf_counter(); c = top_words_counter(words, 10); tc = time.perf_counter() - t
    t = time.perf_counter(); d = top_words_dict(words, 10); td = time.perf_counter() - t
    assert c == d
    line = f"{n:>9,} words: Counter {tc * 1000:6.1f} ms, dict loop {td * 1000:6.1f} ms"
    if n <= 200_000:
        t = time.perf_counter(); s = top_words_slow(words, 10); ts = time.perf_counter() - t
        assert s == c; line += f", list.count version {ts * 1000:7.0f} ms"
    print(line)
print("top 3:", top_words_counter(words, 3))`,
        out: `   20,000 words: Counter    1.1 ms, dict loop    1.4 ms, list.count version     535 ms
  200,000 words: Counter    8.1 ms, dict loop   14.6 ms, list.count version    6361 ms
2,000,000 words: Counter   75.6 ms, dict loop  145.5 ms
top 3: [('em', 233748), ('flbjj', 116264), ('gfnimg', 77601)]`,
        notes: [
          { t: "p",
            text: "At 200,000 words the original took 6.4 seconds, the dict loop 14.6 ms and Counter 8.1 ms: the first gain, about 400×, came from the algorithm (one pass instead of one scan per distinct word), the second, about 2×, from counting in C." },
          { t: "p",
            text: "The tie-break key (−count, word) is what keeps the three versions' outputs identical; without it, words with equal counts could come out in different orders and the assertion would fail for reasons that have nothing to do with speed." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: the nightly job that took 9 hours",
      body: [
        { t: "p",
          text: "**Symptom.** A deduplication job over customer records grew from 20 minutes to 9 hours over a year, roughly with the square of the number of records." },
        { t: "p",
          text: "**Mechanism.** It kept seen email addresses in a list and checked each record with `if email in seen`. Every check scanned the list, so the job was quadratic, and it had looked fine while the list was short." },
        { t: "p",
          text: "**Fix.** A set of seen addresses. The job dropped to under two minutes. Profiling with cProfile pointed straight at the list's __contains__, which is the step that should have come first." }
      ] }
  ],

  takeaways: [
    "In Python, **C-level work is cheap** and Python-level loops are not.",
    "Fix the **data structure** first: list membership and pop(0) cost about **1,000×** here.",
    "Move loops into C: **built-ins, comprehensions, join, Counter, NumPy**.",
    "NumPy summed a million squares **30× faster** than a Python loop.",
    "Use **key functions**: cmp_to_key was 12× slower.",
    "A local name saved **8%** and inlining a call **40%**: worth it only in a profiled hot loop.",
    "A list of a million ints used **35 MiB**; an int64 array 8 MiB.",
    "Measure with **timeit**, best of several runs, and profile before optimising."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "Which change gave the largest speedup in the measurements?",
        options: [
          "Making a global name into a local",
          "A set in place of a list",
          "Inlining a small function call",
          "A generator in place of a list"
        ],
        answer: 1,
        why: "Set membership is O(1) against O(n): about 1,500×. The local name and inlining saved a few to tens of percent; the generator about 3% over the comprehension." },
      { stem: "Why was sorting with cmp_to_key 12× slower than with key=?",
        options: [
          "It sorts the items in a different order",
          "It calls Python per comparison",
          "It copies the whole list before sorting",
          "Timsort is disabled when it is used"
        ],
        answer: 1,
        why: "A key is computed once per element; a comparison function is called on every comparison, about n log n Python calls. The algorithm, Timsort, is the same." },
      { stem: "When is NumPy not a drop-in replacement for Python ints?",
        options: [
          "When the arrays are very large",
          "When values can exceed int64",
          "When all of the data is numeric",
          "When you need the sum of a column"
        ],
        answer: 1,
        why: "NumPy's int64 wraps around silently on overflow, while Python ints grow without limit. Large numeric arrays and sums are exactly where NumPy is best." },
      { stem: "What should come first when a Python program is too slow?",
        options: [
          "Make every single name a local",
          "Profile to find the hot spot",
          "Rewrite all of it in NumPy",
          "Raise the recursion limit a lot"
        ],
        answer: 1,
        why: "Profiling shows where time goes, which is usually one wrong structure or loop. Blanket micro-optimisation or rewriting wastes effort on code that is not slow." }
    ] },

  interview: { title: "In an interview",
    sub: "Know which constants matter in Python.",
    questions: [
      { level: "core",
        q: "Why is a list comprehension faster than a loop with append?",
        strong: "A strong answer explains the bytecode-level difference and keeps the gain in proportion.",
        answer: [
          { t: "p",
            text: "The comprehension uses a specialised bytecode to add each element and avoids looking up and calling the append method every iteration. The gain is modest, about 15–20% here, because each element still runs Python bytecode. Bigger gains come from removing the Python-level loop entirely, with a built-in or NumPy." }
        ] },
      { level: "core",
        q: "Your Python code is quadratic and slow. What do you look for?",
        strong: "A strong answer names the usual hidden O(n) operations.",
        answer: [
          { t: "p",
            text: "Hidden linear operations inside a loop: x in list, list.index, list.remove, list.pop(0), list.insert(0, x), string += on some interpreters, slicing a large list, or sum(nums[:i]) inside a loop. Each has an O(1) or amortised O(1) replacement: a set or dict, a deque, join, or a running total. Profiling with cProfile confirms which one it is." }
        ] },
      { level: "advanced",
        q: "When would you reach for NumPy, and when not?",
        strong: "A strong answer covers vectorisation, dtypes and the cases it does not help.",
        answer: [
          { t: "p",
            text: "When the work is numeric, on fixed-width types, and expressible as whole-array operations: it runs in C over contiguous memory, tens to hundreds of times faster, and uses a fraction of the memory. Not when the logic is inherently sequential with branches per element, when values can overflow int64, or for small arrays, where converting to and from NumPy costs more than it saves." }
        ] }
    ] }
});
