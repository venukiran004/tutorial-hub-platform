/* ============================================================================
   LESSON 4.5 — Storage Engines: B-Trees, LSM-Trees and the WAL
   ========================================================================= */
EC.receiveLesson({
  id: "4.5",

  lede: "Underneath every database is one of two designs. A **B-tree** keeps data sorted in fixed pages and updates them in place — fast to read, and every random write rewrites a page. An **LSM-tree** never updates in place: it buffers writes in memory, flushes them as sorted immutable files, and merges those files in the background — fast to write, and a read may have to look in several places. Neither is better; they sit at different points of one trade between **read, write and space amplification**. Both survive crashes the same way: by writing every change to an append-only **write-ahead log** before acknowledging it.",

  objectives: [
    "Explain how a B-tree and an LSM-tree each handle a write and a read",
    "Define read, write and space amplification and measure them on a working LSM",
    "Explain how Bloom filters and compaction keep LSM reads fast",
    "Describe how a write-ahead log makes a commit durable and how recovery replays it",
    "Choose a storage engine for a workload from its read/write mix and access pattern"
  ],

  prerequisites: ["2.4", "3.4"],

  blocks: [

    { t: "h2", n: "01", id: "two", text: "Two ways to store sorted data",
      sub: "Update in place, or append and merge" },

    { t: "viz", title: "A write's path through each engine",
      caption: "B-tree: find the leaf page, change it in memory, write the page back eventually — random writes to wherever the key lives. LSM: append to the log, insert into an in-memory sorted table, and when it fills, write it out sequentially as a new immutable file; background compaction later merges files and drops overwritten values.",
      svg: `<svg viewBox="0 0 760 286" width="100%" role="img" aria-label="B-tree and LSM write paths">
  <defs><marker id="se-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--line)"/></marker></defs>
  <text x="16" y="22" class="s-label" style="fill:var(--accent)">B-TREE — PostgreSQL, MySQL InnoDB, SQLite</text>
  <rect x="16" y="36" width="110" height="40" rx="8" class="s-fill s-stroke"/><text x="71" y="60" text-anchor="middle" class="s-label">write k=42</text>
  <line x1="126" y1="56" x2="168" y2="56" style="stroke:var(--line)" stroke-width="1.4" marker-end="url(#se-a)"/>
  <rect x="170" y="36" width="110" height="40" rx="8" class="s-fill" style="stroke:var(--violet)" stroke-width="1.4"/><text x="225" y="54" text-anchor="middle" class="s-label">WAL append</text><text x="225" y="69" text-anchor="middle" class="s-sub">sequential</text>
  <line x1="280" y1="56" x2="322" y2="56" style="stroke:var(--line)" stroke-width="1.4" marker-end="url(#se-a)"/>
  <rect x="324" y="36" width="150" height="40" rx="8" class="s-fill s-stroke"/><text x="399" y="54" text-anchor="middle" class="s-label">find leaf page</text><text x="399" y="69" text-anchor="middle" class="s-sub">root → … → leaf</text>
  <line x1="474" y1="56" x2="516" y2="56" style="stroke:var(--line)" stroke-width="1.4" marker-end="url(#se-a)"/>
  <rect x="518" y="36" width="226" height="40" rx="8" class="s-fill" style="stroke:var(--warn)" stroke-width="1.4"/><text x="631" y="54" text-anchor="middle" class="s-label">modify page in place</text><text x="631" y="69" text-anchor="middle" class="s-sub">4 KB page rewritten — random I/O</text>
  <text x="16" y="104" class="s-sub">reads: one path down the tree · writes: a whole page per changed row · space: pages part-empty after splits</text>

  <line x1="16" y1="122" x2="744" y2="122" style="stroke:var(--line);stroke-dasharray:4 4"/>

  <text x="16" y="146" class="s-label" style="fill:var(--good)">LSM-TREE — RocksDB, Cassandra, ScyllaDB, LevelDB, HBase</text>
  <rect x="16" y="160" width="110" height="40" rx="8" class="s-fill s-stroke"/><text x="71" y="184" text-anchor="middle" class="s-label">write k=42</text>
  <line x1="126" y1="180" x2="168" y2="180" style="stroke:var(--line)" stroke-width="1.4" marker-end="url(#se-a)"/>
  <rect x="170" y="160" width="110" height="40" rx="8" class="s-fill" style="stroke:var(--violet)" stroke-width="1.4"/><text x="225" y="178" text-anchor="middle" class="s-label">WAL append</text><text x="225" y="193" text-anchor="middle" class="s-sub">sequential</text>
  <line x1="280" y1="180" x2="322" y2="180" style="stroke:var(--line)" stroke-width="1.4" marker-end="url(#se-a)"/>
  <rect x="324" y="160" width="110" height="40" rx="8" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/><text x="379" y="178" text-anchor="middle" class="s-label">memtable</text><text x="379" y="193" text-anchor="middle" class="s-sub">sorted, in RAM</text>
  <line x1="434" y1="180" x2="476" y2="180" style="stroke:var(--line)" stroke-width="1.4" marker-end="url(#se-a)"/>
  <text x="455" y="172" text-anchor="middle" class="s-sub">full</text>
  <rect x="478" y="160" width="110" height="40" rx="8" class="s-fill s-stroke"/><text x="533" y="178" text-anchor="middle" class="s-label">SSTable</text><text x="533" y="193" text-anchor="middle" class="s-sub">sorted, immutable</text>
  <line x1="588" y1="180" x2="630" y2="180" style="stroke:var(--line)" stroke-width="1.4" marker-end="url(#se-a)"/>
  <rect x="632" y="160" width="112" height="40" rx="8" class="s-fill" style="stroke:var(--warn)" stroke-width="1.4"/><text x="688" y="178" text-anchor="middle" class="s-label">compaction</text><text x="688" y="193" text-anchor="middle" class="s-sub">merge, drop old</text>
  <text x="16" y="228" class="s-sub">reads: memtable, then newest file to oldest — Bloom filters skip files that cannot hold the key</text>
  <text x="16" y="248" class="s-sub">writes: sequential, batched · cost moved to background compaction · space: old versions until merged</text>
  <text x="16" y="276" class="s-mono" style="fill:var(--violet)">both engines: the change is durable once the WAL is fsynced — before any page or file is written</text>
</svg>` },

    { t: "h2", n: "02", id: "amplification", text: "Read, write and space amplification",
      sub: "The three costs every engine trades" },

    { t: "dl", items: [
      ["Write amplification", "Bytes written to disk per byte the application wrote. A B-tree rewrites a whole page for one changed row; an LSM writes each value once when flushing and again in every compaction that merges it."],
      ["Read amplification", "Places a read must look. A B-tree reads one path down the tree; an LSM may check the memtable and several files, which Bloom filters and compaction keep small."],
      ["Space amplification", "Bytes stored per byte of live data. B-tree pages are partly empty after splits; an LSM holds overwritten and deleted values until compaction removes them."]
    ] },

    { t: "p", text: "A working LSM in fifty lines — memtable, immutable sorted runs, size-tiered compaction — under 400,000 writes to 50,000 keys, then 20,000 reads with and without per-file Bloom filters (3.4):" },

    { t: "code", lang: "python", title: "mini_lsm.py — a small LSM-tree, measured", code: `import bisect, random

class LSM:
    """A memtable, immutable sorted runs (SSTables), size-tiered compaction."""
    def __init__(self, memtable_max=2_000, fanin=4, bloom=True):
        self.mem, self.max, self.fanin, self.bloom = {}, memtable_max, fanin, bloom
        self.tiers = [[]]                     # tiers[i] = list of runs; a run = (keys, vals, keyset)
        self.written = 0                      # entries written to "disk", flushes + compactions
        self.probes = 0
    def put(self, k, v):
        self.mem[k] = v                       # (the WAL append would happen here)
        if len(self.mem) >= self.max: self._flush()
    def _flush(self):
        keys = sorted(self.mem); run = (keys, [self.mem[k] for k in keys], set(keys))
        self.written += len(keys); self.mem = {}
        self._add(0, run)
    def _add(self, tier, run):
        while len(self.tiers) <= tier: self.tiers.append([])
        self.tiers[tier].append(run)
        if len(self.tiers[tier]) >= self.fanin:                 # merge the tier into one bigger run
            merged = {}
            for keys, vals, _ in self.tiers[tier]:              # oldest first, so newer wins
                merged.update(zip(keys, vals))
            ks = sorted(merged); self.written += len(ks)
            self.tiers[tier] = []
            self._add(tier + 1, (ks, [merged[k] for k in ks], set(ks)))
    def get(self, k):
        if k in self.mem: return self.mem[k]
        for tier in self.tiers:                                  # newest data first
            for keys, vals, keyset in reversed(tier):
                if self.bloom and k not in keyset: continue      # filter says definitely absent
                self.probes += 1
                i = bisect.bisect_left(keys, k)
                if i < len(keys) and keys[i] == k: return vals[i]
        return None
    def runs(self): return sum(len(t) for t in self.tiers)
    def stored(self): return len(self.mem) + sum(len(r[0]) for t in self.tiers for r in t)

rng = random.Random(1)
KEYS, WRITES = 50_000, 400_000                                   # many updates to the same keys
for bloom in (False, True):
    db = LSM(bloom=bloom)
    for _ in range(WRITES): db.put(rng.randrange(KEYS), rng.random())
    db.probes = 0
    for _ in range(20_000): db.get(rng.randrange(KEYS))
    if not bloom:
        print("writes: %s puts, %s entries written by flush+compaction -> write amplification %.1fx"
              % ("{:,}".format(WRITES), "{:,}".format(db.written), db.written / WRITES))
        print("space:  %s entries stored for %s live keys -> space amplification %.1fx (until compaction)"
              % ("{:,}".format(db.stored()), "{:,}".format(KEYS), db.stored() / KEYS))
        print("runs on disk: %d" % db.runs())
    print("reads:  %.2f runs searched per get %s" % (db.probes / 20_000, "with Bloom filters" if bloom else "without filters"))

PAGE, ROW = 4096, 100
print("\\nB-tree, same random updates: each dirties one %d-byte page for a %d-byte row"
      " -> up to %.0fx write amplification if each page is flushed per update" % (PAGE, ROW, PAGE / ROW))`,
      out: `writes: 400,000 puts, 1,178,642 entries written by flush+compaction -> write amplification 2.9x
space:  146,984 entries stored for 50,000 live keys -> space amplification 2.9x (until compaction)
runs on disk: 6
reads:  3.69 runs searched per get without filters
reads:  0.96 runs searched per get with Bloom filters

B-tree, same random updates: each dirties one 4096-byte page for a 100-byte row -> up to 41x write amplification if each page is flushed per update`,
      hl: [11, 12, 20, 23, 31],
      caption: "Every value was written about three times — once at flush, then in each compaction that merged it. Overwritten versions occupied nearly three times the live data until compaction caught up. Without filters, a read searched several runs; with a Bloom filter per run, about one, because the filter rules out every run that cannot hold the key. The B-tree line is arithmetic, not a measurement: an engine that flushed a 4 KB page for every 100-byte update would amplify writes forty-fold; real B-trees batch dirty pages in memory, which is why their actual number is lower and depends on how random the writes are." },

    { t: "diagram", kind: "compare", title: "B-tree or LSM-tree",
      caption: "The pattern in practice: transactional databases with read-heavy, update-in-place workloads are B-trees; systems that ingest at very high rates — time series, logs, messages, wide-column stores — are LSMs. Several databases offer both (MySQL's MyRocks, MongoDB's engine choice).",
      columns: [
        { title: "B-tree", tone: "accent", items: [
          "reads: predictable, one tree walk",
          "range scans: excellent, data is in order",
          "random writes: a page rewritten each time",
          "no background merge work",
          "fits: OLTP, read-heavy, updates in place"
        ] },
        { title: "LSM-tree", tone: "good", items: [
          "writes: sequential and batched",
          "high ingest: logs, metrics, events, messages",
          "reads: filters plus compaction keep them cheap",
          "compaction competes for disk I/O",
          "fits: write-heavy, append-mostly, time-ordered"
        ] }
      ] },

    { t: "callout", kind: "trap", title: "Deletes in an LSM are writes, and they can make reads slower",
      body: [
        { t: "p", text: "An LSM cannot erase a value inside an immutable file, so a delete writes a **tombstone** — a marker saying \"this key is gone\" — that must be kept until compaction has merged it past every older copy. A queue-like table where rows are inserted and deleted constantly accumulates tombstones faster than compaction removes them, and a read for \"the oldest pending items\" must step over thousands of them." },
        { t: "p", text: "Cassandra users meet this as reads timing out with tombstone warnings. The fixes are to model the data so that whole partitions expire together (time-bucketed tables with TTLs, dropped as a unit), tune compaction for the delete pattern, or not use an LSM store as a queue — a log or a real queue fits better (6.1)." }
      ] },

    { t: "h2", n: "03", id: "wal", text: "The write-ahead log",
      sub: "Durable before visible, in both engines" },

    { t: "diagram", kind: "steps", title: "What happens when a database says COMMIT succeeded",
      caption: "The data pages or files can be written lazily because the log already holds every change. Checkpoints bound how much log must be replayed on recovery. The same log is what replication ships to replicas (4.1) and what change data capture reads (6.4).",
      items: [
        { label: "Append the change to the log", desc: "sequential write to the end of one file", code: "WAL record", tone: "violet" },
        { label: "fsync the log", desc: "the operating system confirms the bytes are on stable storage", code: "durable", tone: "crit" },
        { label: "Acknowledge the commit", desc: "only now is the client told it succeeded", code: "COMMIT ok", tone: "good" },
        { label: "Apply to pages or memtable", desc: "in memory; written to data files later, in batches", code: "lazy", tone: "accent" },
        { label: "Checkpoint", desc: "flush dirty data, record that the log before this point is no longer needed", code: "truncate", tone: "warn" },
        { label: "After a crash: replay", desc: "load the last checkpoint, re-apply every log record after it", code: "recover", tone: "teal" }
      ] },

    { t: "code", lang: "python", title: "wal.py — recovery with and without a log, and the price of fsync", code: `import json, os, tempfile, time

class Store:
    """State in memory, a checkpoint file, and an optional write-ahead log."""
    def __init__(self, d, wal=True, group=1):
        self.d, self.wal_on, self.group = d, wal, group
        self.state, self.pending = {}, 0
        self.log = open(os.path.join(d, "wal.log"), "a")
    def commit(self, k, v):
        if self.wal_on:
            self.log.write(json.dumps([k, v]) + "\\n")       # 1. append the change to the log
            self.pending += 1
            if self.pending >= self.group:                    # 2. make it durable (group commit)
                self.log.flush(); os.fsync(self.log.fileno()); self.pending = 0
        self.state[k] = v                                     # 3. only then apply it in memory
    def checkpoint(self):
        with open(os.path.join(self.d, "ckpt.json"), "w") as f:
            json.dump(self.state, f); f.flush(); os.fsync(f.fileno())
        self.log.close(); open(os.path.join(self.d, "wal.log"), "w").close()    # truncate the log
        self.log = open(os.path.join(self.d, "wal.log"), "a")

def recover(d):
    p = os.path.join(d, "ckpt.json")
    state = json.load(open(p)) if os.path.exists(p) else {}
    for line in open(os.path.join(d, "wal.log")):            # replay everything after the checkpoint
        k, v = json.loads(line); state[k] = v
    return state

for wal in (False, True):
    with tempfile.TemporaryDirectory(dir=".") as d:
        s = Store(d, wal=wal)
        for i in range(1, 1001):
            s.commit(f"order:{i}", "paid")
            if i % 300 == 0: s.checkpoint()
        del s                                               # crash: memory gone, files remain
        print("%-12s committed 1000, recovered %d" % ("with WAL" if wal else "without WAL", len(recover(d))))

for group in (1, 10, 100):
    with tempfile.TemporaryDirectory(dir=".") as d:
        s = Store(d, group=group); t = time.perf_counter()
        for i in range(2_000): s.commit(f"k{i}", i)
        print("fsync every %3d commit(s): %8.0f commits/s" % (group, 2_000 / (time.perf_counter() - t)))`,
      out: `without WAL  committed 1000, recovered 900
with WAL     committed 1000, recovered 1000
fsync every   1 commit(s):     5743 commits/s
fsync every  10 commit(s):    36006 commits/s
fsync every 100 commit(s):   114755 commits/s`,
      hl: [11, 14, 15, 25, 26],
      caption: "Without a log, a crash keeps only what the last checkpoint wrote: 100 committed orders vanished. With the log, replay restores all 1,000. The second table is why databases batch: one fsync per commit caps throughput at the device's fsync rate, and **group commit** — one fsync for every commit waiting at that moment — multiplies it. The absolute numbers depend on the storage device; the ratio is the point." },

    { t: "exercise", kind: "Challenge", title: "Tune a size-tiered LSM",
      difficulty: "advanced", minutes: 25,
      body: [
        { t: "p", text: "The memtable size and the compaction fan-in (how many runs merge at once) are an LSM's two main knobs. Measure what each does to write, read and space amplification, with no Bloom filters so read cost is visible." }
      ],
      requirements: [
        "Run 300,000 writes over 50,000 keys for memtables of 1,000, 5,000 and 20,000 entries and fan-ins of 4 and 10",
        "Report write amplification, number of runs, runs searched per read, and space amplification",
        "Explain why a larger fan-in lowers write amplification and raises the other two",
        "Explain why a larger memtable helps writes, and what it costs"
      ],
      hint: "Write amplification is roughly the number of times a value is rewritten on its way to the largest run. How many merge steps does it take with fan-in 4 versus 10?",
      solution: { lang: "python", title: "lsm_tune_ex.py",
        code: `import bisect, random

def run(memtable_max, fanin, keys=50_000, writes=300_000, reads=10_000, seed=1):
    rng = random.Random(seed)
    mem, tiers, written = {}, [[]], 0
    def add(t, run):
        nonlocal written
        while len(tiers) <= t: tiers.append([])
        tiers[t].append(run)
        if len(tiers[t]) >= fanin:
            merged = {}
            for r in tiers[t]: merged.update(r)
            written += len(merged); tiers[t] = []
            add(t + 1, dict(sorted(merged.items())))
    for _ in range(writes):
        mem[rng.randrange(keys)] = 1
        if len(mem) >= memtable_max:
            written += len(mem); add(0, dict(sorted(mem.items()))); mem = {}
    runs = [r for t in tiers for r in reversed(t)]
    probes = 0
    for _ in range(reads):                       # no Bloom filters: count runs searched
        k = rng.randrange(keys)
        if k in mem: continue
        for r in runs:
            probes += 1
            if k in r: break
    stored = len(mem) + sum(len(r) for r in runs)
    return written / writes, len(runs), probes / reads, stored / keys

print("%9s %6s %12s %8s %14s %12s" % ("memtable", "fanin", "write amp", "runs", "runs/read", "space amp"))
for mt, f in ((1_000, 4), (1_000, 10), (5_000, 4), (5_000, 10), (20_000, 4)):
    w, n, p, s = run(mt, f)
    print("%9s %6d %11.1fx %8d %14.2f %11.1fx" % ("{:,}".format(mt), f, w, n, p, s))`,
        out: ` memtable  fanin    write amp     runs      runs/read    space amp
    1,000      4         3.4x        6           4.75         1.7x
    1,000     10         2.2x       18          10.70         3.5x
    5,000      4         2.1x        5           1.96         3.2x
    5,000     10         1.5x       11           4.94         4.0x
   20,000      4         1.0x        5           1.48         3.3x`,
        notes: [
          { t: "p", text: "A larger **fan-in** means fewer, larger merges, so each value is rewritten fewer times — lower write amplification — but more runs pile up at each tier before merging, so reads search more of them and more stale versions are kept. That is the RUM trade-off (read, update, memory) made concrete: one knob, moving cost between the three." },
          { t: "p", text: "A larger **memtable** absorbs repeated updates to the same key in memory, so fewer distinct values ever reach disk, and flushes are rarer — write amplification fell to about 1×. The costs are RAM, and a longer WAL to replay after a crash, because the memtable is exactly the data not yet in any file." },
          { t: "p", text: "Real engines layer more on top: Bloom filters to cut read probes, leveled compaction (RocksDB's default) to cap the number of runs per read at the cost of more rewriting, and per-workload tuning. The value of the exercise is that each of those is now a move along a trade-off you have measured, not a configuration folklore." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: the time-series database that fell behind on compaction",
      body: [
        { t: "p", text: "**Symptom.** A metrics platform on an LSM store ingested 400,000 points a second comfortably for months. After a new team doubled the cardinality of its metrics, write latency stayed fine for a week, then read latency for dashboards climbed from 50 ms to 9 seconds, disk usage grew 40% in four days, and finally writes began stalling for seconds at a time." },
        { t: "p", text: "**Mechanism.** Ingest is cheap in an LSM; the cost is deferred to compaction. The new load produced files faster than compaction could merge them, so runs accumulated: reads had to search dozens of files (read amplification), old versions were not being dropped (space amplification), and when level-0 file counts hit the engine's safety limit, it **throttled writes** to let compaction catch up — the stall. The write path had looked healthy right up to that moment." },
        { t: "p", text: "**Fix.** More disk I/O and compaction threads per node, the high-cardinality series moved to their own cluster, and alerts on **pending compaction bytes and level-0 file count**, not just write latency. The lesson: on an LSM, compaction debt is the leading indicator, and write latency is the lagging one." }
      ] }
  ],

  takeaways: [
    "A **B-tree** updates sorted pages in place: predictable reads and range scans, a page rewritten per random write.",
    "An **LSM-tree** appends: WAL + in-memory memtable → sorted immutable files → background compaction. Fast sequential writes; reads check several places.",
    "Every engine trades **read, write and space amplification** — measured on a small LSM: ~3× write and ~3× space amplification before compaction.",
    "**Bloom filters** per file cut LSM reads from several runs searched to about one.",
    "LSM deletes are **tombstones**: delete-heavy, queue-like workloads accumulate them and slow reads.",
    "The **write-ahead log** makes a commit durable: append, **fsync**, acknowledge, apply lazily, checkpoint, and replay after a crash. Measured, a crash without it lost every commit since the last checkpoint.",
    "**Group commit** shares one fsync among many commits and multiplies throughput.",
    "The same log feeds **replication** (4.1) and **change data capture** (6.4).",
    "LSM tuning moves cost between the three amplifications: a larger fan-in writes less and reads more; a larger memtable writes less and uses more RAM.",
    "On an LSM, watch **compaction debt** — pending bytes and level-0 files — because write latency looks fine until the engine throttles."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Why can an LSM-tree sustain higher write throughput than a B-tree on random keys?",
        options: ["It does not write to disk", "It buffers writes in memory and writes them out sequentially in sorted batches, instead of rewriting a random page per write", "It skips the write-ahead log", "It stores less data"],
        answer: 1,
        why: "The memtable absorbs writes and is flushed as one sequential sorted file, so random writes become sequential I/O, and repeated updates to a key collapse in memory. LSMs certainly write to disk, they rely on a WAL exactly as B-trees do, and they typically store more, not less, until compaction removes old versions." },

      { stem: "What does a Bloom filter per SSTable do for LSM reads?",
        options: ["Compresses the file", "Lets a read skip files that definitely do not contain the key", "Sorts the keys", "Removes tombstones"],
        answer: 1,
        why: "A Bloom filter answers \"definitely not here\" or \"possibly here\", so a read only searches files whose filter says possibly — about one run per read in the measurement instead of several. Compression, sorting and tombstone removal are separate mechanisms: files are sorted at flush, and tombstones go in compaction." },

      { stem: "A database acknowledges a commit after appending it to the WAL and calling fsync, but before writing the data page. It then crashes. What happens to the commit?",
        options: ["It is lost because the page was never written", "It survives: recovery replays the log record and re-applies the change", "It is half applied", "It must be re-sent by the client"],
        answer: 1,
        why: "That ordering is the entire point of a write-ahead log: once the record is fsynced, the change is durable, and recovery replays every log record after the last checkpoint to rebuild the pages. The page write is deliberately lazy. Nothing is half applied, because replay is idempotent at the record level, and the client was correctly told it succeeded." },

      { stem: "An LSM-based table is used as a work queue: rows are inserted, processed and deleted constantly. Reads of the oldest pending rows become slow. Why?",
        options: ["The memtable is too small", "Each delete leaves a tombstone that reads must step over until compaction removes it", "LSMs cannot sort keys", "The WAL grows too large"],
        answer: 1,
        why: "Deletes in an LSM are tombstone writes kept until compaction merges them past older copies; a queue pattern creates them faster than they are removed, so a scan for the oldest live row walks through thousands of tombstones. Memtable size and WAL length do not cause that read cost, and LSMs keep keys sorted in every file." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "Storage-engine questions test whether you can connect a workload to an amplification.",
    questions: [
      { level: "advanced",
        q: "Explain B-tree versus LSM-tree. When would you choose each?",
        strong: "A strong answer describes both write paths and frames the choice as amplification trade-offs tied to the workload.",
        answer: [
          { t: "p", text: "A B-tree keeps keys sorted in fixed-size pages and updates the relevant page in place, so a read is one path down a shallow tree and range scans are sequential, but each random write dirties a page. An LSM appends: writes go to a WAL and an in-memory memtable, which is flushed as an immutable sorted file; background compaction merges files and discards old versions. Writes are sequential and batched; reads check the memtable and several files, made cheap by Bloom filters." },
          { t: "p", text: "So: B-tree for read-heavy transactional workloads with updates in place and range queries — the classic OLTP database. LSM for write-heavy, append-mostly data — events, metrics, messages, wide-column stores — where ingest rate matters most, accepting compaction I/O and some read and space amplification. And I would watch compaction debt on an LSM, because it fails late and suddenly." }
        ] },

      { level: "core",
        q: "How does a database guarantee a committed transaction survives a crash?",
        strong: "A strong answer gives the WAL ordering, fsync, checkpoints and replay.",
        answer: [
          { t: "p", text: "With a write-ahead log. Before acknowledging a commit, the database appends a record of the change to a sequential log and fsyncs it to stable storage. Data pages are updated in memory and written to disk later. On a crash, recovery loads the state from the last checkpoint and replays every log record after it, so every acknowledged commit is restored." },
          { t: "p", text: "Checkpoints periodically flush dirty pages so the log can be truncated and recovery stays short, and group commit lets one fsync cover many concurrent commits. The same log is what streams to replicas and what CDC tools read." }
        ] },

      { level: "core",
        q: "What is write amplification and why does it matter?",
        strong: "A strong answer defines it, gives sources in both engines, and names the operational consequences.",
        answer: [
          { t: "p", text: "The ratio of bytes written to storage to bytes the application wrote. In a B-tree, changing a 100-byte row can mean writing a 4 KB page, plus the WAL record. In an LSM, each value is written at flush and again in each compaction that merges it." },
          { t: "p", text: "It matters because storage bandwidth is finite and shared with reads, and because flash wears out with writes — high amplification means lower sustainable throughput and shorter SSD life. It is also tunable in an LSM, at the cost of read or space amplification." }
        ] }
    ]
  }
});
