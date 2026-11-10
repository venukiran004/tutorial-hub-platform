/* ============================================================================
   LESSON 2.6 — Tries and String Search
   ========================================================================= */
EC.receiveLesson({
  id: "2.6",

  lede: "Strings get their own structures because their questions are about prefixes and substrings. **A trie answers prefix questions in time proportional to the prefix, not the dictionary.** KMP and rolling hashes find a pattern in a text in linear time, where the obvious double loop is quadratic. And in Python both are often beaten by something simpler: a sorted list with bisect, a set of prefixes, or str.find running in C. This lesson measures all of them, including the cases where the textbook structure loses.",

  objectives: [
    "Build a trie of dicts with per-node counts, and know its memory cost",
    "Answer prefix queries with bisect on a sorted list instead",
    "Explain KMP's failure table and why it never re-reads the text",
    "Use a rolling hash, and confirm matches so collisions cannot cause errors",
    "Know when str.find, startswith and in are already the answer"
  ],

  prerequisites: ["1.2", "2.2"],

  blocks: [
    { t: "h2", n: "01", id: "trie", text: "Tries", sub: "A tree of characters" },
    { t: "p",
      text: "Each node of a trie is a dict from the next character to a child node. Inserting a word walks or creates one node per character; looking up a prefix walks one node per character and stops. Storing at each node how many words pass through it turns \"how many words start with this prefix\" into a walk of len(prefix) steps. The figure is drawn from a trie built by the lesson's own code." },
    { t: "viz",
      title: "A trie of car, cart, cat and dog",
      caption: "Green nodes end a word. Each node stores how many inserted words pass through it, so the count for the prefix \"ca\" is read directly from the a node: 3.",
      svg: `<svg viewBox="0 0 620 340" width="100%" role="img">
<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-2)"/></marker></defs>
<line x1="56.0" y1="260.0" x2="56.0" y2="274.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="101.5" y1="194.0" x2="85.5" y2="208.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="160.5" y1="194.0" x2="176.5" y2="208.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="131.0" y1="128.0" x2="131.0" y2="142.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="356.0" y1="194.0" x2="356.0" y2="208.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="356.0" y1="128.0" x2="356.0" y2="142.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="199.2" y1="62.0" x2="175.3" y2="76.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="287.8" y1="62.0" x2="311.7" y2="76.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<rect x="10" y="274" width="92" height="52" rx="8" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="56.0" y="296" text-anchor="middle" class="s-label" style="fill:var(--good)">t</text>
<text x="56.0" y="314" text-anchor="middle" class="s-sub">count 1 · word</text>
<rect x="10.0" y="208" width="92" height="52" rx="8" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="56.0" y="230" text-anchor="middle" class="s-label" style="fill:var(--good)">r</text>
<text x="56.0" y="248" text-anchor="middle" class="s-sub">count 2 · word</text>
<rect x="160" y="208" width="92" height="52" rx="8" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="206.0" y="230" text-anchor="middle" class="s-label" style="fill:var(--good)">t</text>
<text x="206.0" y="248" text-anchor="middle" class="s-sub">count 1 · word</text>
<rect x="85.0" y="142" width="92" height="52" rx="8" class="s-fill" style="stroke:var(--ink-2);stroke-width:1.8"/>
<text x="131.0" y="164" text-anchor="middle" class="s-label" style="fill:var(--ink-2)">a</text>
<text x="131.0" y="182" text-anchor="middle" class="s-sub">count 3</text>
<rect x="85.0" y="76" width="92" height="52" rx="8" class="s-fill" style="stroke:var(--ink-2);stroke-width:1.8"/>
<text x="131.0" y="98" text-anchor="middle" class="s-label" style="fill:var(--ink-2)">c</text>
<text x="131.0" y="116" text-anchor="middle" class="s-sub">count 3</text>
<rect x="310" y="208" width="92" height="52" rx="8" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="356.0" y="230" text-anchor="middle" class="s-label" style="fill:var(--good)">g</text>
<text x="356.0" y="248" text-anchor="middle" class="s-sub">count 1 · word</text>
<rect x="310.0" y="142" width="92" height="52" rx="8" class="s-fill" style="stroke:var(--ink-2);stroke-width:1.8"/>
<text x="356.0" y="164" text-anchor="middle" class="s-label" style="fill:var(--ink-2)">o</text>
<text x="356.0" y="182" text-anchor="middle" class="s-sub">count 1</text>
<rect x="310.0" y="76" width="92" height="52" rx="8" class="s-fill" style="stroke:var(--ink-2);stroke-width:1.8"/>
<text x="356.0" y="98" text-anchor="middle" class="s-label" style="fill:var(--ink-2)">d</text>
<text x="356.0" y="116" text-anchor="middle" class="s-sub">count 1</text>
<rect x="197.5" y="10" width="92" height="52" rx="8" class="s-fill" style="stroke:var(--accent);stroke-width:1.8"/>
<text x="243.5" y="32" text-anchor="middle" class="s-label" style="fill:var(--accent)">root</text>
</svg>` },
    { t: "code",
      lang: "python",
      title: "strs.py — prefix counting four ways, then substring search four ways",
      code: `import bisect, random, string, time

class Trie:
    def __init__(self): self.root = {}; self.END = "$"
    def insert(self, word):
        node = self.root
        for ch in word:
            node = node.setdefault(ch, {})
            node["#"] = node.get("#", 0) + 1        # how many words pass through this node
        node[self.END] = node.get(self.END, 0) + 1
    def count_prefix(self, prefix):                 # O(len(prefix)): read the count stored at the prefix node
        node = self.root
        for ch in prefix:
            if ch not in node: return 0
            node = node[ch]
        return node.get("#", 0)
    def count_prefix_walk(self, prefix):            # without stored counts: walk to the prefix node, then visit the whole subtree
        node = self.root
        for ch in prefix:
            if ch not in node: return 0
            node = node[ch]
        total, stack = 0, [node]
        while stack:
            n = stack.pop()
            for k, v in n.items():
                if k == self.END: total += v
                elif k != "#": stack.append(v)
        return total

def count_prefix_scan(words, prefix): return sum(w.startswith(prefix) for w in words)

def count_prefix_bisect(sorted_words, prefix):      # all words with the prefix are contiguous in sorted order
    lo = bisect.bisect_left(sorted_words, prefix)
    hi = bisect.bisect_left(sorted_words, prefix + "\\U0010ffff")   # just past every string that starts with prefix
    return hi - lo

def find_naive(text, pat):
    for i in range(len(text) - len(pat) + 1):
        j = 0
        while j < len(pat) and text[i + j] == pat[j]: j += 1
        if j == len(pat): return i
    return -1

def kmp_table(pat):                                 # fail[i] = length of the longest proper prefix of pat[:i+1] that is also a suffix
    fail, k = [0] * len(pat), 0
    for i in range(1, len(pat)):
        while k and pat[i] != pat[k]: k = fail[k - 1]
        if pat[i] == pat[k]: k += 1
        fail[i] = k
    return fail

def find_kmp(text, pat):
    fail, k = kmp_table(pat), 0
    for i, ch in enumerate(text):
        while k and ch != pat[k]: k = fail[k - 1]   # fall back without moving i: no character is read twice
        if ch == pat[k]: k += 1
        if k == len(pat): return i - k + 1
    return -1

def find_rabin_karp(text, pat, base=256, mod=(1 << 61) - 1):
    m = len(pat)
    if m > len(text): return -1
    hp = ht = 0; high = pow(base, m - 1, mod)
    for i in range(m): hp = (hp * base + ord(pat[i])) % mod; ht = (ht * base + ord(text[i])) % mod
    for i in range(len(text) - m + 1):
        if hp == ht and text[i:i + m] == pat: return i      # confirm, so a hash collision cannot give a wrong answer
        if i + m < len(text): ht = ((ht - ord(text[i]) * high) * base + ord(text[i + m])) % mod
    return -1

rnd = random.Random(26)
words = ["".join(rnd.choices("abcdefgh", k=rnd.randint(3, 10))) for _ in range(200_000)]
trie = Trie(); [trie.insert(w) for w in words]; sw = sorted(words)
prefixes = ["".join(rnd.choices("abcdefgh", k=rnd.randint(1, 4))) for _ in range(300)]
for p in prefixes[:50]:
    assert trie.count_prefix(p) == trie.count_prefix_walk(p) == count_prefix_scan(words, p) == count_prefix_bisect(sw, p)
t = time.perf_counter(); [count_prefix_scan(words, p) for p in prefixes]; ts = time.perf_counter() - t
t = time.perf_counter(); [trie.count_prefix_walk(p) for p in prefixes]; tw = time.perf_counter() - t
t = time.perf_counter(); [trie.count_prefix(p) for p in prefixes]; tt = time.perf_counter() - t
t = time.perf_counter(); [count_prefix_bisect(sw, p) for p in prefixes]; tb = time.perf_counter() - t
print(f"300 prefix counts over 200,000 words: scan {ts * 1000:.0f} ms, trie walking the subtree {tw * 1000:.0f} ms, "
      f"trie with stored counts {tt * 1000:.2f} ms, sorted list + bisect {tb * 1000:.2f} ms")
import tracemalloc
tracemalloc.start(); t2 = Trie(); [t2.insert(w) for w in words]; trie_mem = tracemalloc.get_traced_memory()[0]; tracemalloc.stop(); del t2
tracemalloc.start(); s2 = sorted(words); list_mem = tracemalloc.get_traced_memory()[0]; tracemalloc.stop()
print(f"memory: trie {trie_mem / 2**20:.0f} MiB, sorted list {list_mem / 2**20:.1f} MiB (the strings themselves are shared and not counted)")

for _ in range(500):                                # substring search: all four agree, including absent patterns
    text = "".join(rnd.choices("ab", k=rnd.randint(0, 40))); pat = "".join(rnd.choices("ab", k=rnd.randint(1, 6)))
    assert find_naive(text, pat) == find_kmp(text, pat) == find_rabin_karp(text, pat) == text.find(pat)
print("500 random searches: naive, KMP, Rabin-Karp and str.find return the same index\\n")

print(f"{'text':>9}{'pattern':>9}{'naive ms':>10}{'KMP ms':>9}{'RK ms':>8}{'str.find ms':>13}   worst case: 'aaa...a' searched for 'a...ab'")
for n, m in ((100_000, 100), (100_000, 1_000), (200_000, 1_000)):
    text, pat = "a" * n, "a" * (m - 1) + "b"
    row = []
    for f in (find_naive, find_kmp, find_rabin_karp, str.find):
        t = time.perf_counter(); r = f(text, pat); row.append((time.perf_counter() - t) * 1000); assert r == -1
    print(f"{n:>9,}{m:>9,}{row[0]:>10.0f}{row[1]:>9.0f}{row[2]:>8.0f}{row[3]:>13.3f}")`,
      out: `300 prefix counts over 200,000 words: scan 4961 ms, trie walking the subtree 1161 ms, trie with stored counts 0.13 ms, sorted list + bisect 0.56 ms
memory: trie 68 MiB, sorted list 1.5 MiB (the strings themselves are shared and not counted)
500 random searches: naive, KMP, Rabin-Karp and str.find return the same index

     text  pattern  naive ms   KMP ms   RK ms  str.find ms   worst case: 'aaa...a' searched for 'a...ab'
  100,000      100       672       15      33        0.296
  100,000    1,000      7674       17      29        0.285
  200,000    1,000     15746       33      59        0.579` },
    { t: "dl",
      items: [
        [
          "Stored counts are what make the trie fast",
          "Walking the subtree under each prefix took 1,161 ms for 300 queries; reading a count stored at the prefix node took 0.13 ms."
        ],
        [
          "A sorted list was nearly as fast",
          "bisect on a sorted list answered the same 300 queries in 0.56 ms, because all words with a prefix are contiguous in sorted order."
        ],
        ["And far smaller", "The trie of 200,000 words took 68 MiB of dicts; the sorted list 1.5 MiB of pointers."]
      ] },
    { t: "callout",
      kind: "trap",
      title: "A trie of dicts is expensive in Python",
      body: [
        { t: "p",
          text: "Every node is a dict, about a hundred bytes or more even when it holds one child. For static prefix queries, a sorted list with bisect is simpler and used 45× less memory here. Reach for a trie when you need to walk character by character, as in autocomplete with ranking, word search on a grid, or matching many patterns at once." }
      ] },
    { t: "h2",
      n: "02",
      id: "search",
      text: "Finding a pattern in a text",
      sub: "Naive, KMP, rolling hash, and str.find" },
    { t: "p",
      text: "The naive search compares the pattern at every position and can re-read m characters each time: O(n·m) when the text and pattern almost match, as in searching \"aaa…ab\" in \"aaa…a\". KMP precomputes, for each prefix of the pattern, the longest proper prefix that is also a suffix; on a mismatch it falls back to that length instead of moving the text pointer back, so each text character is read once. Rabin-Karp compares hashes of each window, updated in O(1) as the window slides, and checks the characters only when hashes match." },
    { t: "ladder",
      title: "Find a pattern in a text",
      rungs: [
        { level: "bad",
          label: "Compare at every position",
          why: "O(n·m) on near-matches: 15.7 seconds for a 1,000-character pattern in 200,000 characters.",
          code: `def find_naive(text, pat):
    for i in range(len(text) - len(pat) + 1):
        j = 0
        while j < len(pat) and text[i + j] == pat[j]: j += 1
        if j == len(pat): return i
    return -1`,
          note: "Fine on typical text, where mismatches come early." },
        { level: "ok",
          label: "KMP",
          why: "O(n + m) in Python: 33 ms on the same input, by never moving backwards in the text.",
          code: `def kmp_table(pat):                                 # fail[i] = length of the longest proper prefix of pat[:i+1] that is also a suffix
    fail, k = [0] * len(pat), 0
    for i in range(1, len(pat)):
        while k and pat[i] != pat[k]: k = fail[k - 1]
        if pat[i] == pat[k]: k += 1
        fail[i] = k
    return fail

def find_kmp(text, pat):
    fail, k = kmp_table(pat), 0
    for i, ch in enumerate(text):
        while k and ch != pat[k]: k = fail[k - 1]   # fall back without moving i: no character is read twice
        if ch == pat[k]: k += 1
        if k == len(pat): return i - k + 1
    return -1`,
          note: "The failure table is the reusable idea: it also finds the shortest period of a string." },
        { level: "best",
          label: "str.find",
          why: "Implemented in C with a linear-time worst case: 0.58 ms on the same input, about 50× faster than KMP in Python.",
          code: `text.find(pat)          # index or -1
pat in text             # bool
text.startswith(pat)    # prefix test, O(len(pat))`,
          note: "Write KMP in an interview when asked; use str.find in code." }
      ] },
    { t: "callout",
      kind: "insight",
      title: "Rolling hashes are about many windows, not one search",
      body: [
        { t: "p",
          text: "Rabin-Karp was slower than KMP here (59 ms against 33). Its strength is comparing many windows at once: finding any repeated substring of length k, or checking many patterns of the same length against a set of hashes. Always confirm a hash match by comparing the characters, as the code does, so a collision costs time rather than correctness." }
      ] },
    { t: "h2", n: "03", id: "choose", text: "Choosing in Python", sub: "The C built-ins first" },
    { t: "table",
      head: ["Question", "First choice in Python", "When to build a structure"],
      rows: [
        ["Is pat in text? Where?", "in, str.find, re", "Never for a single search"],
        ["How many words start with p?", "bisect on a sorted list", "A trie with counts, if words are added often"],
        ["Autocomplete with ranking", "A trie storing top suggestions per node", "From the start"],
        [
          "Shortest dictionary root of a word",
          "A set of roots, try each prefix length",
          "A trie, when roots are long"
        ],
        ["Many patterns in one text", "One compiled regex alternation", "Aho-Corasick (a trie with failure links)"],
        ["Repeated substring of length k", "A set of slices for small inputs", "A rolling hash"]
      ] },
    { t: "exercise",
      kind: "Challenge",
      title: "Replace words with their shortest root",
      difficulty: "core",
      minutes: 25,
      body: [
        { t: "p",
          text: "Given a list of roots and a sentence, replace every word that starts with some root by the shortest such root. Implement it with a trie and with a set of roots tried at each prefix length, check that they agree, and measure lookups and the trie build separately for short and long roots." }
      ],
      requirements: [
        "A trie that stops at the first node marking a complete root",
        "A set-based version that tries prefix lengths in increasing order",
        "Agreement on 500 random cases",
        "Build and lookup times reported separately"
      ],
      hint: "The trie walk can stop as soon as a character is missing; the set version must keep slicing up to the longest root.",
      solution: { lang: "python",
        title: "replace_words.py",
        code: `import random, time

def build_trie(roots):
    trie = {}
    for r in roots:
        node = trie
        for ch in r: node = node.setdefault(ch, {})
        node["$"] = True
    return trie

def shortest_root_trie(trie, word):                 # walk the word down the trie; stop at the first complete root
    node = trie
    for i, ch in enumerate(word):
        if ch not in node: return word
        node = node[ch]
        if "$" in node: return word[:i + 1]
    return word

def shortest_root_set(roots_set, max_len, word):    # try each prefix length in increasing order
    for k in range(1, min(len(word), max_len) + 1):
        if word[:k] in roots_set: return word[:k]
    return word

def replace_words(roots, sentence, use_trie=True):
    if use_trie:
        trie = build_trie(roots); return " ".join(shortest_root_trie(trie, w) for w in sentence.split())
    s, m = set(roots), max(map(len, roots), default=0)
    return " ".join(shortest_root_set(s, m, w) for w in sentence.split())

print(replace_words(["cat", "bat", "rat", "ca"], "the cattle was rattled by the battery"))

rnd = random.Random(27)
for _ in range(500):
    roots = ["".join(rnd.choices("abc", k=rnd.randint(1, 4))) for _ in range(rnd.randint(0, 8))]
    sentence = " ".join("".join(rnd.choices("abc", k=rnd.randint(1, 7))) for _ in range(rnd.randint(1, 8)))
    assert replace_words(roots, sentence, True) == replace_words(roots, sentence, False)
print("500 random cases: trie and set-of-prefixes agree")

print("20,000 roots, 20,000 words of 150-250 characters:")
for lo, hi in ((2, 5), (2, 40), (150, 200)):
    roots = ["".join(rnd.choices("abcdefghij", k=rnd.randint(lo, hi))) for _ in range(20_000)]
    sentence = " ".join("".join(rnd.choices("abcdefghij", k=rnd.randint(150, 250))) for _ in range(20_000))
    t = time.perf_counter(); trie = build_trie(roots); tb = time.perf_counter() - t
    t = time.perf_counter(); a = [shortest_root_trie(trie, w) for w in sentence.split()]; tt = time.perf_counter() - t
    s, m = set(roots), max(map(len, roots))
    t = time.perf_counter(); b = [shortest_root_set(s, m, w) for w in sentence.split()]; ts = time.perf_counter() - t
    assert a == b
    print(f"roots of {lo:>3}-{hi:<3} chars: trie build {tb * 1000:5.0f} ms, trie lookups {tt * 1000:4.0f} ms, set-of-prefix lookups {ts * 1000:4.0f} ms")`,
        out: `the ca was rat by the bat
500 random cases: trie and set-of-prefixes agree
20,000 roots, 20,000 words of 150-250 characters:
roots of   2-5   chars: trie build     6 ms, trie lookups   10 ms, set-of-prefix lookups   14 ms
roots of   2-40  chars: trie build    97 ms, trie lookups   10 ms, set-of-prefix lookups   15 ms
roots of 150-200 chars: trie build  1373 ms, trie lookups   19 ms, set-of-prefix lookups  396 ms`,
        notes: [
          { t: "p",
            text: "With short roots, both were about equally fast. With long roots, trie lookups took 19 ms against 396 ms for the set, whose slices of up to 200 characters make each word O(L²). But building that trie took 1,373 ms, so for a single sentence the set wins; the trie pays off when the roots are fixed and the lookups keep coming." },
          { t: "p",
            text: "A first version timed build and lookups together and made the trie look 3× slower; measuring the phases separately is what showed where its cost actually is." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: the search box that used 2 GB",
      body: [
        { t: "p",
          text: "**Symptom.** An autocomplete service for a product catalogue of three million names was restarted several times a day by the memory limit." },
        { t: "p",
          text: "**Mechanism.** It held a trie of Python dicts, one dict per character node, about 40 million nodes in all. Queries only ever asked for names starting with a prefix, ranked by popularity." },
        { t: "p",
          text: "**Fix.** A sorted list of names with bisect for the prefix range, and a precomputed top-10 for the 50,000 most common prefixes. Memory fell by over 90%, and latency was unchanged." }
      ] }
  ],

  takeaways: [
    "A trie answers prefix questions in **O(len(prefix))** once nodes store counts.",
    "Without stored counts, prefix counting walked the subtree: **1,161 ms** against **0.13 ms**.",
    "A **sorted list with bisect** answered the same queries in 0.56 ms using 45× less memory.",
    "Naive search is **O(n·m)** on near-matches: 15.7 s for a 1,000-character pattern.",
    "**KMP** never moves backwards in the text: 33 ms on the same input.",
    "**str.find** runs in C: 0.58 ms. Use it in code, and KMP when asked to implement search.",
    "Rolling hashes suit **many windows or many patterns**; always confirm hash matches.",
    "Measure a trie's **build and lookups separately**; the build can dominate."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "How does a trie count words with a prefix in O(len(prefix))?",
        options: [
          "It sorts its children at every node",
          "It stores a count at each node",
          "It hashes the whole prefix",
          "It caches previous answers"
        ],
        answer: 1,
        why: "Each node records how many words pass through it, so the answer is read at the prefix node. Without the count, the subtree must be walked, which took 1,161 ms against 0.13 ms." },
      { stem: "Why can bisect count words with a prefix?",
        options: [
          "Same-prefix words are adjacent",
          "bisect understands string prefixes",
          "Sorting removes the duplicate words",
          "It walks a trie hidden inside the list"
        ],
        answer: 0,
        why: "In sorted order every word with prefix p lies in one contiguous block, so two binary searches find its ends. bisect itself knows only ordering." },
      { stem: "What does KMP avoid that the naive search does?",
        options: [
          "Building any table at all",
          "Moving back in the text",
          "Reading the whole pattern",
          "Comparing single characters"
        ],
        answer: 1,
        why: "On a mismatch KMP falls back in the pattern using the failure table and keeps the text position, so each text character is processed once." },
      { stem: "Rabin-Karp's hashes match at a position. What next?",
        options: [
          "Report the match immediately",
          "Compare the characters",
          "Rehash with a second, larger base",
          "Skip ahead by m characters at once"
        ],
        answer: 1,
        why: "Different strings can share a hash, so a match must be confirmed by comparing characters. Reporting directly risks wrong answers; skipping ahead would miss overlapping matches." }
    ] },

  interview: { title: "In an interview",
    sub: "Know the textbook structure and the Python shortcut.",
    questions: [
      { level: "core",
        q: "Implement autocomplete for a dictionary of words.",
        strong: "A strong answer gives a trie, ranking, and the cost trade-offs.",
        answer: [
          { t: "p",
            text: "A trie where each node stores its children and, for ranking, the top k completions below it, updated on insert. A query walks the prefix in O(len(prefix)) and returns the stored list. For a static list without ranking, a sorted array with two binary searches is simpler and much smaller. At scale, the top-k lists are precomputed offline and served from memory, and the trie is often compressed into a radix tree." }
        ] },
      { level: "advanced",
        q: "Explain the KMP failure function.",
        strong: "A strong answer defines it precisely and explains how it is used on a mismatch.",
        answer: [
          { t: "p",
            text: "fail[i] is the length of the longest proper prefix of pat[:i+1] that is also its suffix. When the text character mismatches pat[k], the last k characters read equal pat[:k], so the next candidate alignment that could still match is the longest border of pat[:k], of length fail[k−1]. The text pointer never moves back, giving O(n + m). The table is built by running the same algorithm on the pattern against itself." }
        ] },
      { level: "core",
        q: "How would you search for a substring in production Python code?",
        strong: "A strong answer uses the built-ins and knows when they are not enough.",
        answer: [
          { t: "p",
            text: "in, str.find or a compiled regular expression: they run in C and handle the worst case well. Hand-written search is worth it only for something the built-ins do not do, such as many patterns at once (Aho-Corasick, or a regex alternation), approximate matching, or rolling hashes over many windows for deduplication." }
        ] }
    ] }
});
