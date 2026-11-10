/* ============================================================================
   LESSON 1.6 — Linked Lists
   ========================================================================= */
EC.receiveLesson({
  id: "1.6",

  lede: "A linked list is a chain of nodes, each holding a value and a reference to the next. Python programs rarely need one, because list and deque cover almost every use faster, but **the pointer techniques are the point**: reversing in place, a dummy head that removes special cases, slow and fast pointers that find the middle or a cycle in O(1) space, and the doubly linked list inside every LRU cache. This lesson builds them, measures what they cost in Python, and says plainly when to use the built-ins instead.",

  objectives: [
    "Reverse a list in place with three pointers, and know why the recursive version fails at depth",
    "Use a dummy head to remove first-node special cases",
    "Find the middle and detect a cycle with slow and fast pointers in O(1) space",
    "Build an O(1) LRU cache from a dict and a doubly linked list",
    "Compare linked nodes with list and deque on time and memory, measured"
  ],

  prerequisites: ["1.1", "1.3"],

  blocks: [
    { t: "h2", n: "01", id: "reverse", text: "Pointers, not positions", sub: "Reverse, merge, find the middle" },
    { t: "p",
      text: "A node has no index, only a next reference, so every operation is written in terms of which references change. Reversal is the canonical example: walk the list once, and point each node at the one before it. The figure shows a list before reversal and halfway through: the nodes behind prev already point backwards, the nodes from head on are untouched." },
    { t: "viz",
      title: "Reversal, halfway",
      caption: "Top: the original list. Bottom: after two steps of the loop. Nodes 1 and 2 now point backwards, prev is the new front of the reversed part, and head is the rest of the list still to be processed.",
      svg: `<svg viewBox="0 0 760 220" width="100%" role="img">
<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-2)"/></marker></defs>
<line x1="120.0" y1="46.0" x2="160.0" y2="46.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="260.0" y1="46.0" x2="300.0" y2="46.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="400.0" y1="46.0" x2="440.0" y2="46.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="540.0" y1="46.0" x2="580.0" y2="46.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="160.0" y1="176.0" x2="120.0" y2="176.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="300.0" y1="176.0" x2="260.0" y2="176.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="540.0" y1="176.0" x2="580.0" y2="176.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<rect x="20" y="20" width="100" height="52" rx="8" class="s-fill" style="stroke:var(--accent);stroke-width:1.8"/>
<text x="70.0" y="42" text-anchor="middle" class="s-label" style="fill:var(--accent)">1</text>
<text x="70.0" y="60" text-anchor="middle" class="s-sub">head</text>
<rect x="160" y="20" width="100" height="52" rx="8" class="s-fill" style="stroke:var(--ink-2);stroke-width:1.8"/>
<text x="210.0" y="42" text-anchor="middle" class="s-label" style="fill:var(--ink-2)">2</text>
<rect x="300" y="20" width="100" height="52" rx="8" class="s-fill" style="stroke:var(--ink-2);stroke-width:1.8"/>
<text x="350.0" y="42" text-anchor="middle" class="s-label" style="fill:var(--ink-2)">3</text>
<rect x="440" y="20" width="100" height="52" rx="8" class="s-fill" style="stroke:var(--ink-2);stroke-width:1.8"/>
<text x="490.0" y="42" text-anchor="middle" class="s-label" style="fill:var(--ink-2)">4</text>
<rect x="580" y="20" width="100" height="52" rx="8" class="s-fill" style="stroke:var(--ink-2);stroke-width:1.8"/>
<text x="630.0" y="42" text-anchor="middle" class="s-label" style="fill:var(--ink-2)">None</text>
<rect x="20" y="150" width="100" height="52" rx="8" class="s-fill" style="stroke:var(--ink-2);stroke-width:1.8"/>
<text x="70.0" y="172" text-anchor="middle" class="s-label" style="fill:var(--ink-2)">None</text>
<rect x="160" y="150" width="100" height="52" rx="8" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="210.0" y="172" text-anchor="middle" class="s-label" style="fill:var(--good)">1</text>
<rect x="300" y="150" width="100" height="52" rx="8" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="350.0" y="172" text-anchor="middle" class="s-label" style="fill:var(--good)">2</text>
<text x="350.0" y="190" text-anchor="middle" class="s-sub">prev</text>
<rect x="440" y="150" width="100" height="52" rx="8" class="s-fill" style="stroke:var(--accent);stroke-width:1.8"/>
<text x="490.0" y="172" text-anchor="middle" class="s-label" style="fill:var(--accent)">3</text>
<text x="490.0" y="190" text-anchor="middle" class="s-sub">head</text>
<rect x="580" y="150" width="100" height="52" rx="8" class="s-fill" style="stroke:var(--ink-2);stroke-width:1.8"/>
<text x="630.0" y="172" text-anchor="middle" class="s-label" style="fill:var(--ink-2)">4</text>
</svg>` },
    { t: "code",
      lang: "python",
      title: "linked.py — reversal, merge, middle, three cycle checks, and linked nodes against list and deque",
      code: `import sys, time, tracemalloc
from collections import deque

class Node:
    __slots__ = ("val", "next")               # no per-instance __dict__: about half the memory of a plain class
    def __init__(self, val, next=None): self.val, self.next = val, next

def build(values):
    head = None
    for v in reversed(values): head = Node(v, head)
    return head

def to_list(head):
    out = []
    while head: out.append(head.val); head = head.next
    return out

def reverse(head):                            # three pointers, O(n) time, O(1) space
    prev = None
    while head:
        head.next, prev, head = prev, head, head.next
    return prev

def reverse_recursive(head):
    if head is None or head.next is None: return head
    new_head = reverse_recursive(head.next)
    head.next.next = head; head.next = None
    return new_head

def merge(a, b):                              # a dummy head removes the "which list starts?" special case
    dummy = tail = Node(0)
    while a and b:
        if a.val <= b.val: tail.next, a = a, a.next
        else: tail.next, b = b, b.next
        tail = tail.next
    tail.next = a or b
    return dummy.next

def middle(head):                             # fast moves two steps per slow step
    slow = fast = head
    while fast and fast.next: slow, fast = slow.next, fast.next.next
    return slow

def has_cycle_list(head):
    seen = []
    while head:
        if any(n is head for n in seen): return True
        seen.append(head); head = head.next
    return False

def has_cycle_set(head):
    seen = set()
    while head:
        if id(head) in seen: return True
        seen.add(id(head)); head = head.next
    return False

def has_cycle_floyd(head):                    # tortoise and hare: they meet inside a cycle, or the hare falls off the end
    slow = fast = head
    while fast and fast.next:
        slow, fast = slow.next, fast.next.next
        if slow is fast: return True
    return False

print("reverse:", to_list(reverse(build([1, 2, 3, 4, 5]))), " merge:", to_list(merge(build([1, 4, 9]), build([2, 3, 10]))),
      " middle of 1..6:", middle(build([1, 2, 3, 4, 5, 6])).val)
print(f"recursion limit {sys.getrecursionlimit()}: ", end="")
for n in (500, 5_000):
    try: reverse_recursive(build(list(range(n)))); print(f"recursive reverse of {n:,} ok; ", end="")
    except RecursionError: print(f"recursive reverse of {n:,} -> RecursionError", end="")
print()

def with_cycle(n):
    head = build(list(range(n))); tail = head
    while tail.next: tail = tail.next
    tail.next = head.next                     # the last node points back to the second
    return head
print(f"\\n{'n':>7}{'list ms':>10}{'set ms':>9}{'floyd ms':>10}{'set KiB':>10}{'floyd KiB':>11}")
for n in (2_000, 4_000, 100_000):
    h = with_cycle(n); row = [n]
    for f in (has_cycle_list, has_cycle_set, has_cycle_floyd):
        if f is has_cycle_list and n > 10_000: row.append(None); continue
        t = time.perf_counter(); assert f(h); row.append((time.perf_counter() - t) * 1000)
    mem = []
    for f in (has_cycle_set, has_cycle_floyd):
        tracemalloc.start(); f(h); mem.append(tracemalloc.get_traced_memory()[1] / 1024); tracemalloc.stop()
    lst = "skipped" if row[1] is None else f"{row[1]:.0f}"
    print(f"{n:>7}{lst:>10}{row[2]:>9.1f}{row[3]:>10.1f}{mem[0]:>10.0f}{mem[1]:>11.1f}")

n = 100_000
t = time.perf_counter(); L = []
for i in range(n): L.insert(0, i)
t_list = time.perf_counter() - t
t = time.perf_counter(); D = deque()
for i in range(n): D.appendleft(i)
t_deque = time.perf_counter() - t
t = time.perf_counter(); head = None
for i in range(n): head = Node(i, head)
t_node = time.perf_counter() - t
print(f"\\n{n:,} inserts at the front: list {t_list * 1000:.0f} ms, deque {t_deque * 1000:.1f} ms, linked nodes {t_node * 1000:.1f} ms")
t = time.perf_counter(); s1 = sum(L); t_sum_list = time.perf_counter() - t
t = time.perf_counter(); s2 = 0; p = head
while p: s2 += p.val; p = p.next
t_sum_node = time.perf_counter() - t
assert s1 == s2
print(f"summing {n:,} values: list {t_sum_list * 1000:.1f} ms, walking the linked list {t_sum_node * 1000:.1f} ms")
tracemalloc.start(); xs = build(list(range(n, 2 * n))); node_mem = tracemalloc.get_traced_memory()[0]; tracemalloc.stop(); del xs
tracemalloc.start(); ys = list(range(n, 2 * n)); list_mem = tracemalloc.get_traced_memory()[0]; tracemalloc.stop()
print(f"memory per value (each includes its int): as a Node with __slots__ {node_mem / n:.0f} bytes, in a plain list {list_mem / n:.0f} bytes")`,
      out: `reverse: [5, 4, 3, 2, 1]  merge: [1, 2, 3, 4, 9, 10]  middle of 1..6: 4
recursion limit 1000: recursive reverse of 500 ok; recursive reverse of 5,000 -> RecursionError

      n   list ms   set ms  floyd ms   set KiB  floyd KiB
   2000        76      0.5       0.2       199        0.0
   4000       296      0.8       0.3       253        0.0
 100000   skipped     32.9       8.5      8602        0.0

100,000 inserts at the front: list 1516 ms, deque 6.1 ms, linked nodes 43.4 ms
summing 100,000 values: list 1.6 ms, walking the linked list 8.0 ms
memory per value (each includes its int): as a Node with __slots__ 80 bytes, in a plain list 40 bytes` },
    { t: "callout",
      kind: "trap",
      title: "Recursive list code fails on ordinary inputs",
      body: [
        { t: "p",
          text: "The recursive reversal is shorter and appears in many answers, and it raised RecursionError on a 5,000-node list, because Python's default recursion limit is 1,000 and it does not optimise tail calls. Raising the limit risks crashing the interpreter. In Python, write list traversals as loops." }
      ] },
    { t: "h2",
      n: "02",
      id: "fast-slow",
      text: "Slow and fast pointers",
      sub: "O(1) space where a set needs O(n)" },
    { t: "p",
      text: "Move one pointer one step and another two steps. When the fast one reaches the end, the slow one is in the middle. If there is a cycle, the fast one never reaches the end; it laps the slow one and they meet inside the cycle, within one traversal of the cycle after the slow pointer enters it." },
    { t: "ladder",
      title: "Detect a cycle in a linked list",
      rungs: [
        { level: "bad",
          label: "Remember visited nodes in a list",
          why: "Checking membership in a list is O(n), so the whole walk is O(n²): 296 ms at 4,000 nodes, quadrupling with each doubling.",
          code: `def has_cycle_list(head):
    seen = []
    while head:
        if any(n is head for n in seen): return True
        seen.append(head); head = head.next
    return False`,
          note: "Uses identity (is) rather than ==, which is right for nodes, but the structure is wrong." },
        { level: "ok",
          label: "Remember visited node ids in a set",
          why: "O(n) time, O(n) memory: 32.9 ms and 8.6 MB for 100,000 nodes.",
          code: `def has_cycle_set(head):
    seen = set()
    while head:
        if id(head) in seen: return True
        seen.add(id(head)); head = head.next
    return False`,
          note: "Clear and correct. In production code this is often the right answer." },
        { level: "best",
          label: "Floyd's tortoise and hare",
          why: "O(n) time, O(1) memory: 8.5 ms and no measurable allocation for 100,000 nodes.",
          code: `def has_cycle_floyd(head):                    # tortoise and hare: they meet inside a cycle, or the hare falls off the end
    slow = fast = head
    while fast and fast.next:
        slow, fast = slow.next, fast.next.next
        if slow is fast: return True
    return False`,
          note: "Comparing with is, not ==, matters: two different nodes can hold equal values." }
      ] },
    { t: "dl",
      items: [
        [
          "Inserting at the front",
          "100,000 inserts took 1,516 ms with list.insert(0, x), 6.1 ms with deque.appendleft and 43.4 ms by creating linked nodes. A deque beats a hand-built list because it is written in C."
        ],
        [
          "Walking the values",
          "Summing 100,000 values took 1.6 ms over a list and 8.0 ms by following next references in a Python loop."
        ],
        [
          "Memory",
          "80 bytes per value as a Node with __slots__, 40 bytes in a plain list, both including the int itself."
        ]
      ] },
    { t: "callout",
      kind: "insight",
      title: "When a linked list is the right choice in Python",
      body: [
        { t: "p",
          text: "When you hold a reference to a node and need to remove it or move it in O(1): an LRU cache, a scheduler's run queue, an undo history with splicing. Without that handle, finding the node is O(n) and a list or deque is faster in every measurement above." }
      ] },
    { t: "h2",
      n: "03",
      id: "lru",
      text: "The doubly linked list behind an LRU cache",
      sub: "A dict to find, a list to order" },
    { t: "p",
      text: "An LRU cache must find an entry by key in O(1), and move it to the front, or evict the oldest, in O(1). A dict alone cannot order entries by recency cheaply; a list can order them but removing from the middle is O(n). Together, the dict maps keys to nodes and the doubly linked list keeps recency order, with sentinels at both ends so unlinking never checks for None." },
    { t: "table",
      head: ["Need", "Use in Python"],
      rows: [
        ["Stack", "list: append and pop"],
        ["Queue, or both ends", "collections.deque"],
        ["LRU cache in an application", "functools.lru_cache, or OrderedDict with move_to_end"],
        ["O(1) removal given a node handle", "A doubly linked list with sentinels"],
        ["Interview linked-list problems", "Node with __slots__, loops not recursion, a dummy head"]
      ] },
    { t: "exercise",
      kind: "Challenge",
      title: "An O(1) LRU cache",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p",
          text: "Implement get and put for a least-recently-used cache with a fixed capacity, both in O(1). Check it against an OrderedDict reference on random operation sequences, and time it against a naive version that keeps recency in a Python list." }
      ],
      requirements: [
        "A dict from key to node and a doubly linked list in recency order",
        "Sentinel head and tail nodes so unlinking has no special cases",
        "get moves the node to the front; put evicts from the back when full",
        "Exact agreement with an OrderedDict reference on random sequences"
      ],
      hint: "The evicted node must also be deleted from the dict, which is why each node stores its key as well as its value.",
      solution: { lang: "python",
        title: "lru.py",
        code: `import random, time
from collections import OrderedDict

class _N:
    __slots__ = ("key", "val", "prev", "next")
    def __init__(self, key=None, val=None): self.key, self.val, self.prev, self.next = key, val, None, None

class LRUCache:
    """get and put in O(1): a dict finds the node, a doubly linked list keeps recency order."""
    def __init__(self, capacity):
        self.cap, self.map = capacity, {}
        self.head, self.tail = _N(), _N()                 # sentinels: no None checks when unlinking
        self.head.next, self.tail.prev = self.tail, self.head
    def _unlink(self, n): n.prev.next, n.next.prev = n.next, n.prev
    def _push_front(self, n):
        n.prev, n.next = self.head, self.head.next
        self.head.next.prev = n; self.head.next = n
    def get(self, key):
        n = self.map.get(key)
        if n is None: return -1
        self._unlink(n); self._push_front(n)              # touched: now most recent
        return n.val
    def put(self, key, val):
        n = self.map.get(key)
        if n: n.val = val; self._unlink(n); self._push_front(n); return
        if len(self.map) == self.cap:
            lru = self.tail.prev; self._unlink(lru); del self.map[lru.key]   # evict the least recent
        n = _N(key, val); self.map[key] = n; self._push_front(n)

class LRUList:                                            # the naive version: a list in recency order
    def __init__(self, capacity): self.cap, self.map, self.order = capacity, {}, []
    def get(self, key):
        if key not in self.map: return -1
        self.order.remove(key); self.order.append(key); return self.map[key]   # remove is O(capacity)
    def put(self, key, val):
        if key in self.map: self.order.remove(key)
        elif len(self.map) == self.cap: del self.map[self.order.pop(0)]
        self.map[key] = val; self.order.append(key)

class LRURef:                                             # reference behaviour from the standard library
    def __init__(self, capacity): self.cap, self.d = capacity, OrderedDict()
    def get(self, key):
        if key not in self.d: return -1
        self.d.move_to_end(key); return self.d[key]
    def put(self, key, val):
        self.d[key] = val; self.d.move_to_end(key)
        if len(self.d) > self.cap: self.d.popitem(last=False)

random.seed(6)
for trial in range(200):
    cap = random.randint(1, 6); a, b = LRUCache(cap), LRURef(cap)
    for _ in range(200):
        k = random.randint(0, 9)
        if random.random() < 0.5: assert a.get(k) == b.get(k)
        else: v = random.randint(0, 99); a.put(k, v); b.put(k, v)
print("200 random sequences of 200 operations match OrderedDict exactly")

ops = [(random.random() < 0.7, random.randint(0, 30_000)) for _ in range(100_000)]
for cap in (1_000, 10_000):
    for cls in (LRUList, LRUCache, LRURef):
        c = cls(cap); t = time.perf_counter()
        for is_get, k in ops:
            if is_get: c.get(k)
            else: c.put(k, k)
        print(f"capacity {cap:>6,}: {cls.__name__:<9} {(time.perf_counter() - t) * 1000:7.0f} ms for 100,000 operations")`,
        out: `200 random sequences of 200 operations match OrderedDict exactly
capacity  1,000: LRUList        42 ms for 100,000 operations
capacity  1,000: LRUCache       34 ms for 100,000 operations
capacity  1,000: LRURef         28 ms for 100,000 operations
capacity 10,000: LRUList      1546 ms for 100,000 operations
capacity 10,000: LRUCache       41 ms for 100,000 operations
capacity 10,000: LRURef         33 ms for 100,000 operations`,
        notes: [
          { t: "p",
            text: "The linked version matched OrderedDict on 200 random sequences. At capacity 10,000 it took 41 ms for 100,000 operations against 1,546 ms for the list-based version, whose remove and pop(0) are O(capacity)." },
          { t: "p",
            text: "At capacity 1,000 the naive version was about as fast, because list.remove runs in C and the cache hit only a few percent of keys. And OrderedDict was fastest in both cases, as it is the same design implemented in C: write the linked list to understand it or in an interview, and use OrderedDict or lru_cache in real code." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: the cache that got slower as it got bigger",
      body: [
        { t: "p",
          text: "**Symptom.** After the session cache's capacity was raised from 2,000 to 50,000 entries to improve its hit rate, p99 latency on the login path rose from 8 ms to 140 ms." },
        { t: "p",
          text: "**Mechanism.** The cache tracked recency in a Python list and called list.remove on every hit and list.pop(0) on every eviction, both O(capacity). At 2,000 entries that was invisible; at 50,000 it dominated the request." },
        { t: "p",
          text: "**Fix.** Replaced with an OrderedDict using move_to_end and popitem(last=False), O(1) for both, and added a benchmark at the configured capacity to the test suite so the next resize is measured before it ships." }
      ] }
  ],

  takeaways: [
    "Linked-list code is about **which references change**; draw the before and after.",
    "Reverse with **three pointers in a loop**; the recursive version hit RecursionError at 5,000 nodes.",
    "A **dummy head** removes the special case for the first node in merges and deletions.",
    "**Slow and fast pointers** find the middle and detect cycles in O(1) space.",
    "Floyd used **no measurable memory** where a set of ids used 8.6 MB for 100,000 nodes.",
    "Compare nodes with **is**, not ==; different nodes can hold equal values.",
    "In Python, **deque beat hand-built nodes** 6.1 ms to 43.4 ms for 100,000 front inserts.",
    "Use a linked list when you **hold a node handle** and need O(1) removal, as in an LRU cache.",
    "Measured: the naive list LRU took **1,546 ms** at capacity 10,000; the linked version **41 ms**."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "Why did the recursive reversal fail on 5,000 nodes?",
        options: [
          "It reverses each of the nodes twice over",
          "Python's recursion limit is 1,000",
          "It leaks a node on every call",
          "It runs in O(n²) time overall"
        ],
        answer: 1,
        why: "Each node adds a stack frame and Python stops at about 1,000 frames by default, with no tail-call optimisation. The algorithm is O(n) and correct; it simply runs out of stack." },
      { stem: "What does Floyd's algorithm save compared with a set of visited nodes?",
        options: [
          "Time: it is asymptotically faster",
          "Memory: O(1) instead of O(n)",
          "Correctness on lists with duplicates",
          "It also finds the list's length"
        ],
        answer: 1,
        why: "Both are O(n) time; Floyd uses two pointers instead of a set holding every node. Duplicates are fine for both when comparing identities, and length is a separate question." },
      { stem: "Why does each LRU node store its key?",
        options: [
          "To keep the nodes sorted by their key",
          "To drop the evicted dict entry",
          "To make hashing the nodes much faster",
          "So that nodes can be compared with =="
        ],
        answer: 1,
        why: "Eviction starts from the tail node; without its key there is no O(1) way to remove the matching dict entry. Nodes are ordered by recency, not key, and are never hashed or compared by value." },
      { stem: "When is a hand-built linked list a good choice in Python?",
        options: [
          "For a first-in, first-out queue of tasks",
          "For O(1) removal of a held node",
          "For fast iteration over all the values",
          "To save memory on every element stored"
        ],
        answer: 1,
        why: "deque is the queue, a list iterates faster and uses half the memory, as measured. The linked list's one advantage is splicing a node you already hold in O(1)." }
    ] },

  interview: { title: "In an interview",
    sub: "Draw the pointers, then write the loop.",
    questions: [
      { level: "core",
        q: "Reverse a singly linked list.",
        strong: "A strong answer gives the iterative version and mentions the recursion limit.",
        answer: [
          { t: "p",
            text: "Keep prev = None, then for each node save next, point the node at prev, and advance prev and head. Return prev. O(n) time and O(1) space. A recursive version is shorter but uses O(n) stack, and in Python it raises RecursionError past about a thousand nodes, so I would write the loop." }
        ] },
      { level: "core",
        q: "Detect a cycle, and find where it starts.",
        strong: "A strong answer gives Floyd and the reset step for the start.",
        answer: [
          { t: "p",
            text: "Slow moves one step, fast two; if they meet there is a cycle. To find the start, move one pointer back to the head and advance both one step at a time; they meet at the cycle's first node, because the distance from the head to the start equals the distance from the meeting point to the start, modulo the cycle length. O(n) time, O(1) space." }
        ] },
      { level: "advanced",
        q: "Design an LRU cache with O(1) get and put.",
        strong: "A strong answer names both structures, sentinels and eviction, and the library alternative.",
        answer: [
          { t: "p",
            text: "A dict from key to node, and a doubly linked list ordered by recency with sentinel head and tail. get unlinks the node and pushes it to the front; put updates or inserts at the front and, when over capacity, unlinks the tail's previous node and deletes its key from the dict. In real Python code, OrderedDict.move_to_end and popitem(last=False) do the same in C, and functools.lru_cache does it for function calls. For concurrency, guard it with a lock." }
        ] }
    ] }
});
