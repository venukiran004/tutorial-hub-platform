/* ============================================================================
   LESSON 1.7 — Intervals and the Sweep Line
   ========================================================================= */
EC.receiveLesson({
  id: "1.7",

  lede: "Interval problems look like geometry and are really about order. **Sort by start, and most of them become one pass**: merge overlapping blocks, insert a new one, intersect two schedules. The ones that ask \"how many at once?\" become a sweep: turn each interval into a +1 and a −1 event, sort the events, and keep a running count. This lesson builds both, measures three ways of counting meeting rooms, and shows the one-character tie-break that decides whether back-to-back meetings share a room.",

  objectives: [
    "Merge overlapping intervals after sorting by start",
    "Count peak overlap with a sweep of +1 and −1 events",
    "Choose and justify the tie-break for events at the same time",
    "Use a heap of end times when you need to know which resource is free",
    "Merge many sorted schedules with heapq.merge in O(N log k)"
  ],

  prerequisites: ["1.3", "1.5"],

  blocks: [
    { t: "h2", n: "01", id: "merge", text: "Sort by start, then one pass", sub: "Merge, insert, intersect" },
    { t: "p",
      text: "After sorting by start, an interval either overlaps the last merged block, in which case it extends that block's end, or starts after it, in which case it opens a new block. One pass, O(n log n) for the sort. Inserting a new interval into a sorted, merged list is the same pass. Intersecting two sorted lists is two pointers (1.1): take the overlap of the current pair, then advance whichever ends first." },
    { t: "callout",
      kind: "insight",
      title: "Decide open or closed ends before writing a comparison",
      body: [
        { t: "p",
          text: "Calendars are half-open: a meeting [9, 10) ends exactly when [10, 11) starts, and they do not overlap. Whether the merge test is s < end or s <= end, and how events tie in a sweep, both follow from that one decision. Write it down first." }
      ] },
    { t: "h2", n: "02", id: "sweep", text: "The sweep line", sub: "Events, a running count, and a tie-break" },
    { t: "p",
      text: "To find the most intervals active at once, the number of meeting rooms, turn each interval into a start event (+1) and an end event (−1), sort all events by time, and walk them with a running count. The peak of the count is the answer. The figure is drawn from the sweep's own output on six meetings." },
    { t: "viz",
      title: "Six meetings and the live count",
      caption: "Top: meetings as half-open intervals. Bottom: the running count after each event. It peaks at 3 at time 2, when [0, 4), [1, 3) and [2, 7) are all in progress. At time 8, one meeting ends as another starts, and the count does not rise.",
      svg: `<svg viewBox="0 0 760 300" width="100%" role="img">
<rect x="90" y="12" width="256" height="18" rx="4" class="s-fill" style="stroke:var(--accent);stroke-width:1.8"/>
<text x="80" y="25" text-anchor="end" class="s-sub">[0, 4)</text>
<rect x="155" y="38" width="126" height="18" rx="4" class="s-fill" style="stroke:var(--accent);stroke-width:1.8"/>
<text x="80" y="51" text-anchor="end" class="s-sub">[1, 3)</text>
<rect x="220" y="64" width="321" height="18" rx="4" class="s-fill" style="stroke:var(--accent);stroke-width:1.8"/>
<text x="80" y="77" text-anchor="end" class="s-sub">[2, 7)</text>
<rect x="415" y="90" width="191" height="18" rx="4" class="s-fill" style="stroke:var(--accent);stroke-width:1.8"/>
<text x="80" y="103" text-anchor="end" class="s-sub">[5, 8)</text>
<rect x="545" y="116" width="126" height="18" rx="4" class="s-fill" style="stroke:var(--accent);stroke-width:1.8"/>
<text x="80" y="129" text-anchor="end" class="s-sub">[7, 9)</text>
<rect x="610" y="142" width="126" height="18" rx="4" class="s-fill" style="stroke:var(--accent);stroke-width:1.8"/>
<text x="80" y="155" text-anchor="end" class="s-sub">[8, 10)</text>
<path d="M90,280 L90,280 L90,250 L155,250 L155,220 L220,220 L220,190 L285,190 L285,220 L350,220 L350,250 L415,250 L415,220 L545,220 L545,220 L610,220 L610,220 L675,220 L675,250 L740,250 L740,280 L740,280" fill="none" style="stroke:var(--good)" stroke-width="2.2"/>
<text x="80" y="168" text-anchor="end" class="s-sub">live</text>
<text x="80" y="254" text-anchor="end" class="s-sub">1</text>
<text x="80" y="224" text-anchor="end" class="s-sub">2</text>
<text x="80" y="194" text-anchor="end" class="s-sub">3</text>
<line x1="90" y1="280" x2="740" y2="280" style="stroke:var(--line)"/>
<text x="90" y="296" text-anchor="middle" class="s-sub">0</text>
<text x="155" y="296" text-anchor="middle" class="s-sub">1</text>
<text x="220" y="296" text-anchor="middle" class="s-sub">2</text>
<text x="285" y="296" text-anchor="middle" class="s-sub">3</text>
<text x="350" y="296" text-anchor="middle" class="s-sub">4</text>
<text x="415" y="296" text-anchor="middle" class="s-sub">5</text>
<text x="480" y="296" text-anchor="middle" class="s-sub">6</text>
<text x="545" y="296" text-anchor="middle" class="s-sub">7</text>
<text x="610" y="296" text-anchor="middle" class="s-sub">8</text>
<text x="675" y="296" text-anchor="middle" class="s-sub">9</text>
<text x="740" y="296" text-anchor="middle" class="s-sub">10</text>
<text x="226" y="182" class="s-label" style="fill:var(--good)">peak 3</text>
</svg>` },
    { t: "code",
      lang: "python",
      title: "intervals.py — merge, three room counters, and the tie-break",
      code: `import heapq, random, time

def merge(intervals):                          # half-open [start, end); sort by start, extend or open a new block
    out = []
    for s, e in sorted(intervals):
        if out and s <= out[-1][1]: out[-1][1] = max(out[-1][1], e)
        else: out.append([s, e])
    return out

def rooms_pairwise(meetings):                  # the peak overlap happens at some start: count meetings live at each start
    return max((sum(s2 <= s < e2 for s2, e2 in meetings) for s, _ in meetings), default=0)

def rooms_heap(meetings):                      # end times of meetings in progress; reuse a room whose meeting has ended
    ends = []
    for s, e in sorted(meetings):
        if ends and ends[0] <= s: heapq.heapreplace(ends, e)
        else: heapq.heappush(ends, e)
    return len(ends)

def rooms_sweep(meetings):                     # +1 at each start, -1 at each end; ends sort before starts at the same time
    events = sorted([(s, 1) for s, _ in meetings] + [(e, -1) for _, e in meetings])
    live = peak = 0
    for _, d in events:
        live += d; peak = max(peak, live)
    return peak

def rooms_sweep_wrong(meetings):               # the same, with starts sorted before ends at equal times
    events = sorted([(s, -1) for s, _ in meetings] + [(e, 1) for _, e in meetings])
    live = peak = 0
    for _, d in events:
        live -= d; peak = max(peak, live)
    return peak

print("merge:", merge([[1, 3], [8, 10], [2, 6], [15, 18], [6, 7]]))
back_to_back = [(9, 10), (10, 11), (11, 12)]
print(f"three back-to-back meetings: sweep {rooms_sweep(back_to_back)} room, starts-first tie-break {rooms_sweep_wrong(back_to_back)} rooms")

random.seed(7)
for _ in range(500):                           # check against minute-by-minute counting
    ms = [(s, s + random.randint(1, 30)) for s in (random.randint(0, 100) for _ in range(random.randint(1, 20)))]
    truth = max(sum(s <= t < e for s, e in ms) for t in range(0, 131))
    assert rooms_pairwise(ms) == rooms_heap(ms) == rooms_sweep(ms) == truth
    covered = {t for s, e in ms for t in range(s, e)}
    assert {t for s, e in merge(ms) for t in range(s, e)} == covered
print("500 random calendars: three room counts and the merge agree with minute-by-minute counting\\n")

print(f"{'meetings':>9}{'pairwise ms':>13}{'heap ms':>9}{'sweep ms':>10}")
for n in (1_000, 2_000, 4_000, 100_000):
    ms = [(s, s + random.randint(15, 120)) for s in (random.randint(0, 10 * n) for _ in range(n))]
    t = time.perf_counter(); a = rooms_pairwise(ms) if n <= 4_000 else None; tp = time.perf_counter() - t
    t = time.perf_counter(); b = rooms_heap(ms); th = time.perf_counter() - t
    t = time.perf_counter(); c = rooms_sweep(ms); ts = time.perf_counter() - t
    assert b == c and a in (None, b)
    print(f"{n:>9,}{('skipped' if a is None else f'{tp * 1000:.0f}'):>13}{th * 1000:>9.1f}{ts * 1000:>10.1f}   peak {b}")`,
      out: `merge: [[1, 7], [8, 10], [15, 18]]
three back-to-back meetings: sweep 1 room, starts-first tie-break 2 rooms
500 random calendars: three room counts and the merge agree with minute-by-minute counting

 meetings  pairwise ms  heap ms  sweep ms
    1,000           61      0.3       0.8   peak 16
    2,000          251      0.5       1.4   peak 16
    4,000          991      1.1       2.9   peak 18
  100,000      skipped     67.7     185.0   peak 22` },
    { t: "callout",
      kind: "trap",
      title: "The tie-break at equal times",
      body: [
        { t: "p",
          text: "When one meeting ends at 10 and another starts at 10, the end must be processed first or the count briefly includes both. With (time, +1) and (time, −1) tuples, Python sorts −1 before +1 at the same time, which is correct for half-open intervals. Flipping the signs, or sorting starts first, turned three back-to-back meetings into a claimed need for two rooms. For closed intervals, where touching ones do overlap, the opposite tie-break is right." }
      ] },
    { t: "ladder",
      title: "Minimum number of meeting rooms",
      rungs: [
        { level: "bad",
          label: "Count overlaps at every start",
          why: "The peak occurs at some start time, so checking each start against every meeting is correct, and O(n²): 991 ms for 4,000 meetings.",
          code: `def rooms_pairwise(meetings):                  # the peak overlap happens at some start: count meetings live at each start
    return max((sum(s2 <= s < e2 for s2, e2 in meetings) for s, _ in meetings), default=0)`,
          note: "Correct, which makes it a good reference for testing." },
        { level: "ok",
          label: "Sweep over +1 and −1 events",
          why: "O(n log n). The simplest to prove, and it generalises: weighted intervals, peak memory, concurrent sessions.",
          code: `def rooms_sweep(meetings):                     # +1 at each start, -1 at each end; ends sort before starts at the same time
    events = sorted([(s, 1) for s, _ in meetings] + [(e, -1) for _, e in meetings])
    live = peak = 0
    for _, d in events:
        live += d; peak = max(peak, live)
    return peak`,
          note: "185 ms for 100,000 meetings: it sorts 2n tuples." },
        { level: "best",
          label: "A heap of end times",
          why: "O(n log n), and 2.7× faster here (67.7 ms) because it sorts n items and keeps a heap only as big as the answer.",
          code: `def rooms_heap(meetings):                      # end times of meetings in progress; reuse a room whose meeting has ended
    ends = []
    for s, e in sorted(meetings):
        if ends and ends[0] <= s: heapq.heapreplace(ends, e)
        else: heapq.heappush(ends, e)
    return len(ends)`,
          note: "The heap also says which room frees up next, which an allocation system needs." }
      ] },
    { t: "table",
      head: ["Question", "Technique"],
      rows: [
        ["Combine overlapping intervals", "Sort by start, extend or open a block"],
        ["Insert one interval into a sorted list", "One pass: before, overlapping, after"],
        ["Overlap of two sorted schedules", "Two pointers, advance the one ending first"],
        ["Most intervals at once", "Sweep of +1/−1 events, or a heap of ends"],
        ["Which resource is free next", "Heap of (end, resource)"],
        ["Remove fewest to make them disjoint", "Greedy by earliest end (3.7)"]
      ] },
    { t: "h2", n: "03", id: "many", text: "Many sorted schedules", sub: "Merge without re-sorting" },
    { t: "p",
      text: "Free time shared by k people is the gaps in the union of their busy intervals. Each calendar is already sorted, so instead of concatenating and sorting N meetings, heapq.merge produces them in order from k sorted inputs in O(N log k), lazily. One pass then tracks the latest end seen so far and records the gaps." },
    { t: "exercise",
      kind: "Challenge",
      title: "Free time across calendars",
      difficulty: "core",
      minutes: 25,
      body: [
        { t: "p",
          text: "Given k calendars, each a sorted list of half-open busy intervals, return the slots inside the working day when everyone is free. Use the fact that the inputs are sorted, and check the result against a unit-by-unit brute force." }
      ],
      requirements: [
        "heapq.merge over the k calendars, not a full sort",
        "A cursor holding the latest busy end seen so far",
        "Slots clipped to the working day, with empty slots dropped",
        "Agreement with a brute force on 500 random sets of calendars"
      ],
      hint: "A gap exists when the next meeting starts after the cursor; the cursor is the maximum end so far, not the previous meeting's end.",
      solution: { lang: "python",
        title: "common_free.py",
        code: `import heapq, random, time

def common_free(calendars, day_start, day_end):
    """Free slots shared by everyone. Each calendar is a sorted list of half-open busy [start, end).
    k-way merge with a heap, so the cost is O(N log k) for N meetings across k people."""
    merged = heapq.merge(*calendars)                     # already-sorted inputs: no full re-sort
    free, cursor = [], day_start
    for s, e in merged:
        if s > cursor: free.append((cursor, min(s, day_end)))
        cursor = max(cursor, e)
        if cursor >= day_end: break
    if cursor < day_end: free.append((cursor, day_end))
    return [(a, b) for a, b in free if a < b]

def common_free_brute(calendars, day_start, day_end):   # minute by minute
    busy = {t for cal in calendars for s, e in cal for t in range(s, e)}
    free, run = [], None
    for t in range(day_start, day_end + 1):
        if t < day_end and t not in busy:
            if run is None: run = t
        elif run is not None: free.append((run, t)); run = None
    return free

def random_calendar(n, lo, hi, unit=1):
    starts = sorted(random.sample(range(lo, hi), n))
    cal, end = [], lo
    for s in starts:
        s = max(s, end); e = s + random.randint(10, 60) * unit
        if s < hi: cal.append((s, e)); end = e
    return cal

random.seed(8)
for _ in range(500):
    cals = [random_calendar(random.randint(0, 6), 480, 1080) for _ in range(random.randint(1, 5))]
    assert common_free(cals, 540, 1020) == common_free_brute(cals, 540, 1020), cals
print("500 random sets of calendars agree with minute-by-minute checking")
cals = [[(540, 600), (720, 780)], [(570, 630), (900, 960)], [(600, 615), (990, 1020)]]
print("free for all three, 09:00-17:00:", [f"{a // 60:02d}:{a % 60:02d}-{b // 60:02d}:{b % 60:02d}" for a, b in common_free(cals, 540, 1020)])

WEEK = 5 * 9 * 3600                                                    # a working week in seconds
big = [random_calendar(10, 0, WEEK, unit=60) for _ in range(8)]         # 8 people, 10 meetings each, times in seconds
t = time.perf_counter(); f1 = common_free(big, 0, WEEK); tm = time.perf_counter() - t
t = time.perf_counter(); f2 = common_free_brute(big, 0, WEEK); tb = time.perf_counter() - t
assert f1 == f2
print(f"8 calendars, {sum(map(len, big))} meetings, times in seconds: heap merge {tm * 1e6:.0f} µs, unit-by-unit {tb * 1000:.0f} ms, {len(f1)} free slots")`,
        out: `500 random sets of calendars agree with minute-by-minute checking
free for all three, 09:00-17:00: ['10:30-12:00', '13:00-15:00', '16:00-16:30']
8 calendars, 80 meetings, times in seconds: heap merge 48 µs, unit-by-unit 12 ms, 28 free slots`,
        notes: [
          { t: "p",
            text: "The merge agreed with the brute force on 500 random cases. On a working week in seconds it took 48 µs against 12 ms, and the brute force grows with the length of the day, not the number of meetings, which is why it is only usable as a test." },
          { t: "p",
            text: "The cursor must be the maximum end seen so far. Using the previous meeting's end reports a false gap when a short meeting sits inside a long one." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: the room booking system that double-booked at the hour",
      body: [
        { t: "p",
          text: "**Symptom.** After a refactor, the booking service began refusing back-to-back bookings in popular rooms, saying a room was occupied when its previous meeting had already ended, and offices reported rooms empty while the app showed them full." },
        { t: "p",
          text: "**Mechanism.** The availability check was rewritten as a sweep, and events were sorted with starts before ends at equal times. Every meeting starting on the hour was counted as overlapping the one ending then." },
        { t: "p",
          text: "**Fix.** Ends sort before starts, since bookings are half-open. A property test now generates back-to-back bookings and compares the sweep with a minute-by-minute count." }
      ] }
  ],

  takeaways: [
    "**Sort by start** and most interval problems become one pass.",
    "Decide **half-open or closed** first; the comparisons and tie-breaks follow from it.",
    "Peak overlap is a **sweep**: +1 at starts, −1 at ends, a running count.",
    "For half-open intervals, **ends before starts** at equal times; the wrong order claimed 2 rooms for back-to-back meetings.",
    "Measured at 4,000 meetings: pairwise **991 ms**, heap **1.1 ms**.",
    "A heap of end times was **2.7× faster** than the sweep and tells you which room frees next.",
    "Merge k sorted schedules with **heapq.merge** in O(N log k), without re-sorting.",
    "Gaps come from a cursor holding the **maximum end so far**."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "Meetings [9, 10) and [10, 11) in a sweep. Which event goes first at 10?",
        options: [
          "The start, so the room stays held",
          "The end, so the count never hits 2",
          "Either; the peak is unaffected",
          "Whichever of the two was booked first"
        ],
        answer: 1,
        why: "Half-open meetings that touch do not overlap, so the end must be processed first. Starting first briefly counts both, which is the wrong-tie-break bug; booking order is irrelevant." },
      { stem: "Why is merging intervals O(n log n) rather than O(n)?",
        options: [
          "The merge pass itself is quadratic",
          "The intervals must be sorted first",
          "Each merge needs a binary search",
          "Appending to a Python list costs O(log n)"
        ],
        answer: 1,
        why: "Sorting dominates; the merge pass is linear. There is no binary search, and append is amortised O(1)." },
      { stem: "What is the advantage of a heap of end times over the sweep?",
        options: [
          "A lower worst-case complexity class",
          "It shows which room frees next",
          "It handles closed intervals correctly",
          "It needs no sorting step at all"
        ],
        answer: 1,
        why: "Both are O(n log n) and both sort; the heap holds live meetings, so its top is the room that frees next. Closed intervals only change the tie-break." },
      { stem: "Free time across k sorted calendars. Why use heapq.merge?",
        options: [
          "It removes all of the overlapping meetings",
          "It merges sorted inputs in O(N log k)",
          "It returns the free gaps directly",
          "It orders meetings by end, not start"
        ],
        answer: 1,
        why: "The inputs are already sorted, so a k-way merge avoids the O(N log N) sort. It neither removes overlaps nor finds gaps, and it orders by the tuples, so by start." }
    ] },

  interview: { title: "In an interview",
    sub: "State the interval convention before the algorithm.",
    questions: [
      { level: "core",
        q: "Merge overlapping intervals.",
        strong: "A strong answer sorts, states the overlap test with its convention, and gives the cost.",
        answer: [
          { t: "p",
            text: "Sort by start; for each interval, if it starts at or before the last merged block's end, extend that end to the maximum of the two, otherwise start a new block. Whether touching intervals merge depends on whether they are closed; I would ask. O(n log n) for the sort and O(n) extra space for the output." }
        ] },
      { level: "core",
        q: "What is the minimum number of meeting rooms?",
        strong: "A strong answer gives a sweep or a heap and the tie-break.",
        answer: [
          { t: "p",
            text: "Sort meetings by start and keep a min-heap of end times for rooms in use; if the earliest end is at or before the new start, reuse that room, otherwise add one. The heap's final size is the answer. Equivalently, sweep +1/−1 events with ends before starts at equal times. Both are O(n log n); the heap also tells you which room to assign." }
        ] },
      { level: "advanced",
        q: "Design a service that finds a common free slot for a group across their calendars.",
        strong: "A strong answer covers the algorithm, data access and practical constraints.",
        answer: [
          { t: "p",
            text: "Fetch each person's busy intervals in the window, already sorted, from the calendar store; merge them with a k-way heap merge and scan for gaps of at least the meeting length, clipped to everyone's working hours in their time zones. Cache free/busy summaries per person, as calendar systems do, and recheck with a conditional write when booking, since calendars change between the search and the booking." }
        ] }
    ] }
});
