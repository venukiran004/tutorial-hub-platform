/* ============================================================================
   LESSON 15.2 — Capacity Estimation
   ========================================================================= */
EC.receiveLesson({
  id: "15.2",

  lede: "Capacity estimation is the step that turns 'fifty million users' into a design. Done well it takes five minutes and changes decisions: it shows that one table needs sharding and another fits on one machine, that reads outnumber writes a hundredfold, and that storage is dominated by something that is easy to forget, such as images or replicas. Done badly it becomes arithmetic theatre with four significant figures and no conclusion. This lesson gives the few numbers worth memorising, a model that turns users into QPS, storage and bandwidth, and the habit that matters most: finding which input dominates and saying what it changes.",

  objectives: [
    "Convert daily active users and per-user actions into average and peak requests per second",
    "Estimate storage over several years, including media and replication",
    "Estimate peak bandwidth and say whether it is a CDN or an origin problem",
    "Find which assumption dominates an estimate by varying one input at a time",
    "Turn loads into node counts with headroom, and name the estimate that changes the design"
  ],

  prerequisites: ["15.1", "1.2", "3.5"],

  blocks: [
    { t: "h2",
      n: "01",
      id: "numbers",
      text: "The numbers worth memorising",
      sub: "Few, rounded, and good to a factor of two" },
    { t: "p",
      text: "An interview estimate needs about a dozen numbers, rounded to powers of ten. Precision beyond one significant figure is wasted, because the inputs (users, actions per day, peak factor) are guesses to within a factor of two. What matters is getting the order of magnitude right and showing the steps." },
    { t: "table",
      head: ["Quantity", "Rounded value", "Use it for"],
      rows: [
        ["Seconds in a day", "86,400 ≈ 10⁵", "1 million per day ≈ 12 per second"],
        ["Peak to average", "2–3× typical, 10×+ for events", "Size for the peak, not the average"],
        ["A short text record", "~1 KB", "Posts, messages, metadata rows"],
        ["A photo", "~200 KB compressed to a few MB original", "Media dominates storage almost always"],
        ["One minute of HD video", "~50–100 MB", "Why video is a CDN and transcoding problem"],
        ["Replication", "3× (or ~1.5× with erasure coding)", "Durable storage multiplies raw size"],
        ["One server, simple API calls", "10³–10⁴ req/s", "Order of magnitude for a stateless tier"],
        ["One relational primary, simple writes", "10³–10⁴ writes/s", "When writes need sharding"],
        ["One in-memory cache node", "~10⁵ ops/s", "Why caches absorb read storms"]
      ] },
    { t: "callout",
      kind: "trap",
      title: "Precision theatre",
      body: [
        { t: "p",
          text: "Writing 1,157.4 writes per second implies a precision the inputs do not have. Say 'about a thousand writes a second, a few thousand at peak'. Interviewers care whether you know which numbers matter and what they imply, not whether you can multiply in your head. Round early, keep the units, and spend the saved time on the conclusion." }
      ] },
    { t: "h2",
      n: "02",
      id: "model",
      text: "From users to load, storage and bandwidth",
      sub: "One small model, then vary its inputs" },
    { t: "p",
      text: "Every estimate follows the same chain: users times actions per day gives events per day; divide by 10⁵ for per second and multiply by the peak factor; multiply by bytes per event for ingest, then by days, years and replication for storage; and multiply reads by bytes per read for bandwidth. The script runs that chain for a short-text social app with 10% of posts carrying an image, then doubles each input on its own to see which ones matter." },
    { t: "code",
      lang: "python",
      title: "estimate.py — users to load, storage and bandwidth",
      code: `SECONDS_PER_DAY = 86_400            # call it 1e5 in your head: 1M/day is about 12/s

def human(n, unit=""):
    for div, suf in ((1e15, "P"), (1e12, "T"), (1e9, "G"), (1e6, "M"), (1e3, "k")):
        if abs(n) >= div: return f"{n / div:.1f} {suf}{unit}"
    return f"{n:.0f} {unit}"

def estimate(dau, writes_per_user, reads_per_write, bytes_per_write, media_bytes, media_share,
             peak=3.0, years=5, replication=3):
    writes_s = dau * writes_per_user / SECONDS_PER_DAY
    reads_s = writes_s * reads_per_write
    per_day = dau * writes_per_user * (bytes_per_write + media_share * media_bytes)
    stored = per_day * 365 * years * replication
    egress = reads_s * peak * (bytes_per_write + media_share * media_bytes)
    return dict(writes_avg=writes_s, writes_peak=writes_s * peak, reads_peak=reads_s * peak,
                ingest_day=per_day, storage=stored, egress_peak=egress)

# A short-text social app: 50M DAU, 2 posts a day, 100 reads per post, 1 KB per post, 10% carry a 200 KB image.
e = estimate(dau=50e6, writes_per_user=2, reads_per_write=100, bytes_per_write=1_000, media_bytes=200_000, media_share=0.1)
print(f"writes   {e['writes_avg']:>9,.0f}/s average, {e['writes_peak']:>9,.0f}/s peak")
print(f"reads    {e['reads_peak']:>9,.0f}/s peak")
print(f"ingest   {human(e['ingest_day'], 'B')}/day; 5-year storage with 3 replicas {human(e['storage'], 'B')}")
print(f"egress   {human(e['egress_peak'] * 8, 'bit')}/s at peak")

# Which assumption matters? Double each input on its own and see what moves storage.
print("\\ndouble one input, 5-year storage becomes:")
base = e["storage"]
for k, v in dict(dau=50e6, writes_per_user=2, bytes_per_write=1_000, media_bytes=200_000, media_share=0.1).items():
    args = dict(dau=50e6, writes_per_user=2, reads_per_write=100, bytes_per_write=1_000, media_bytes=200_000, media_share=0.1)
    args[k] = v * 2
    print(f"  {k:<16} x2 -> {human(estimate(**args)['storage'], 'B'):>9}  ({estimate(**args)['storage'] / base:.2f}x)")`,
      out: `writes       1,157/s average,     3,472/s peak
reads      347,222/s peak
ingest   2.1 TB/day; 5-year storage with 3 replicas 11.5 PB
egress   58.3 Gbit/s at peak

double one input, 5-year storage becomes:
  dau              x2 ->   23.0 PB  (2.00x)
  writes_per_user  x2 ->   23.0 PB  (2.00x)
  bytes_per_write  x2 ->   12.0 PB  (1.05x)
  media_bytes      x2 ->   22.4 PB  (1.95x)
  media_share      x2 ->   22.4 PB  (1.95x)` },
    { t: "viz",
      title: "Five-year storage for the same app",
      caption: "Text alone stays under 0.2 PB after five years. Adding a 200 KB image to one post in ten multiplies storage twentyfold, and three-way replication triples that again to 11.5 PB. The text records were never the storage problem. The sensitivity table in the output says the same: doubling the size of a text record changes storage by 5%, while doubling image size or image share almost doubles it.",
      svg: `<svg viewBox="0 0 760 270" width="100%" role="img">
<line x1="64" y1="224.0" x2="610" y2="224.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="228.0" text-anchor="end" class="s-sub">0</text>
<line x1="64" y1="172.5" x2="610" y2="172.5" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="176.5" text-anchor="end" class="s-sub">3</text>
<line x1="64" y1="121.0" x2="610" y2="121.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="125.0" text-anchor="end" class="s-sub">6</text>
<line x1="64" y1="69.5" x2="610" y2="69.5" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="73.5" text-anchor="end" class="s-sub">9</text>
<line x1="64" y1="18.0" x2="610" y2="18.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="22.0" text-anchor="end" class="s-sub">12</text>
<text x="64.0" y="242" text-anchor="middle" class="s-sub">year 1</text>
<text x="200.5" y="242" text-anchor="middle" class="s-sub">year 2</text>
<text x="337.0" y="242" text-anchor="middle" class="s-sub">year 3</text>
<text x="473.5" y="242" text-anchor="middle" class="s-sub">year 4</text>
<text x="610.0" y="242" text-anchor="middle" class="s-sub">year 5</text>
<text x="337.0" y="264" text-anchor="middle" class="s-sub">cumulative</text>
<text x="14" y="121.0" text-anchor="middle" class="s-sub" transform="rotate(-90 14 121.0)">storage (PB)</text>
<polyline points="64.0,223.4 200.5,222.7 337.0,222.1 473.5,221.5 610.0,220.9" style="fill:none;stroke:var(--good)" stroke-width="2.2"/>
<circle cx="64.0" cy="223.4" r="2" style="fill:var(--good)"/>
<circle cx="200.5" cy="222.7" r="2" style="fill:var(--good)"/>
<circle cx="337.0" cy="222.1" r="2" style="fill:var(--good)"/>
<circle cx="473.5" cy="221.5" r="2" style="fill:var(--good)"/>
<circle cx="610.0" cy="220.9" r="2" style="fill:var(--good)"/>
<line x1="626" y1="28" x2="644" y2="28" style="stroke:var(--good)" stroke-width="2.4"/>
<text x="650" y="32" class="s-sub" style="fill:var(--ink-2)">text only</text>
<polyline points="64.0,210.8 200.5,197.7 337.0,184.5 473.5,171.3 610.0,158.3" style="fill:none;stroke:var(--warn)" stroke-width="2.2"/>
<circle cx="64.0" cy="210.8" r="2" style="fill:var(--warn)"/>
<circle cx="200.5" cy="197.7" r="2" style="fill:var(--warn)"/>
<circle cx="337.0" cy="184.5" r="2" style="fill:var(--warn)"/>
<circle cx="473.5" cy="171.3" r="2" style="fill:var(--warn)"/>
<circle cx="610.0" cy="158.3" r="2" style="fill:var(--warn)"/>
<line x1="626" y1="50" x2="644" y2="50" style="stroke:var(--warn)" stroke-width="2.4"/>
<text x="650" y="54" class="s-sub" style="fill:var(--ink-2)">with images</text>
<polyline points="64.0,184.5 200.5,145.0 337.0,105.5 473.5,66.1 610.0,26.6" style="fill:none;stroke:var(--crit)" stroke-width="2.2"/>
<circle cx="64.0" cy="184.5" r="2" style="fill:var(--crit)"/>
<circle cx="200.5" cy="145.0" r="2" style="fill:var(--crit)"/>
<circle cx="337.0" cy="105.5" r="2" style="fill:var(--crit)"/>
<circle cx="473.5" cy="66.1" r="2" style="fill:var(--crit)"/>
<circle cx="610.0" cy="26.6" r="2" style="fill:var(--crit)"/>
<line x1="626" y1="72" x2="644" y2="72" style="stroke:var(--crit)" stroke-width="2.4"/>
<text x="650" y="76" class="s-sub" style="fill:var(--ink-2)">images, 3 replicas</text>
</svg>` },
    { t: "dl",
      items: [
        { term: "Reads dominate the request count",
          def: "At 100 reads per write, 3,500 peak writes per second become 350,000 peak reads. The read path decides the caching, replication and CDN design." },
        { term: "Media dominates the bytes",
          def: "A text record is a thousand bytes and an image hundreds of thousands. Find the largest object type before estimating anything else." },
        { term: "Bandwidth decides where content is served from",
          def: "58 Gbit/s of peak egress is a CDN problem. The origin should see only cache misses." },
        { term: "Vary one input at a time",
          def: "Doubling each assumption shows which ones the answer depends on. Those are the ones to ask the interviewer about." }
      ] },
    { t: "h2",
      n: "03",
      id: "fleet",
      text: "The estimate that changes the design",
      sub: "Loads into nodes, with headroom" },
    { t: "p",
      text: "Loads become designs when divided by what one node can carry. The figures below are orders of magnitude, not benchmarks, and the point is the comparison, not the exact count. Run each node at about 60% so one can fail and bursts still fit." },
    { t: "code",
      lang: "python",
      title: "fleet.py — node counts and the effect of a cache",
      code: `import math

# Rough per-node capacities to reason with. They are orders of magnitude, not benchmarks: measure your own (lesson 11.4).
CAP = {"stateless API server": 5_000, "Postgres primary (one per shard)": 5_000, "Postgres read replica": 20_000,
       "Redis node": 100_000, "Kafka broker (1 KB msgs)": 200_000}
HEADROOM = 0.6          # run each node at 60% of its capacity, so a node can fail and bursts fit

def nodes(load, per_node): return max(1, math.ceil(load / (per_node * HEADROOM)))

print("peak load                     component                         nodes at 60% headroom")
for load, comp in ((347_222, "stateless API server"), (3_472, "Postgres primary (one per shard)"),
                   (347_222, "Postgres read replica"), (347_222, "Redis node"), (3_472, "Kafka broker (1 KB msgs)")):
    print(f"{load:>10,}/s   {comp:<34} {nodes(load, CAP[comp]):>4}")

# The estimate that changes the design: one primary takes the writes; 99% cache hits change the read fleet.
print()
for hit in (0.0, 0.9, 0.99):
    db = 347_222 * (1 - hit)
    n = nodes(db, CAP["Postgres read replica"])
    print(f"cache hit rate {hit:4.0%}: {db:>9,.0f} reads/s reach the database -> {n:>3} read replica{'s' if n != 1 else ''}")`,
      out: `peak load                     component                         nodes at 60% headroom
   347,222/s   stateless API server                116
     3,472/s   Postgres primary (one per shard)      2
   347,222/s   Postgres read replica                29
   347,222/s   Redis node                            6
     3,472/s   Kafka broker (1 KB msgs)              1

cache hit rate   0%:   347,222 reads/s reach the database ->  29 read replicas
cache hit rate  90%:    34,722 reads/s reach the database ->   3 read replicas
cache hit rate  99%:     3,472 reads/s reach the database ->   1 read replica` },
    { t: "callout",
      kind: "insight",
      title: "Look for the number that crosses a threshold",
      body: [
        { t: "p",
          text: "Most estimates end in 'it fits' or 'it does not fit on one node'. Here the writes (3,500 per second at peak) are close to what a single relational primary handles, so sharding the write path is a decision to make now, not later. The reads (350,000 per second) need 29 replicas without a cache and one with a 99% hit rate, so the cache is a requirement, not an optimisation. Say those two sentences and the high-level design is half drawn." }
      ] },
    { t: "exercise",
      kind: "Challenge",
      title: "Estimate a photo-sharing service",
      difficulty: "core",
      minutes: 25,
      body: [
        { t: "p",
          text: "A photo-sharing app has 100 million daily users. Each uploads 0.1 photos a day and views 50. Originals average 2.5 MB, and three resized variants of 150, 40 and 10 KB are stored too. Estimate the upload and view rates, five-year storage, metadata size and peak egress, and say what each number decides." }
      ],
      requirements: [
        "Average and peak uploads and views per second, and the read-to-write ratio",
        "Bytes stored per photo, new media per day, and five-year storage with replication",
        "Metadata size after five years at about 500 bytes per photo",
        "Peak egress for views, and the origin's share behind a CDN with a 95% hit rate",
        "One design decision for each of storage, metadata and egress"
      ],
      hint: "Keep media and metadata apart from the start: they differ by four orders of magnitude and end up in different stores.",
      solution: { lang: "python",
        title: "photo_estimate.py",
        code: `import math
DAY = 86_400

# A photo-sharing app.
dau, uploads_per_user, views_per_user = 100e6, 0.1, 50
original, thumbs = 2.5e6, [150e3, 40e3, 10e3]        # bytes: original and three resized variants
meta_row, peak = 500, 3.0                              # bytes of metadata per photo; peak-to-average

uploads = dau * uploads_per_user / DAY
views = dau * views_per_user / DAY
print(f"uploads {uploads:,.0f}/s average, {uploads * peak:,.0f}/s peak")
print(f"views   {views:,.0f}/s average, {views * peak:,.0f}/s peak  (read:write {views / uploads:,.0f}:1)")

per_photo = original + sum(thumbs)
daily = dau * uploads_per_user * per_photo
print(f"\\nper photo stored: {per_photo / 1e6:.2f} MB (thumbnails add {sum(thumbs) / original:.0%})")
print(f"new media per day: {daily / 1e12:.1f} TB; per year {daily * 365 / 1e15:.2f} PB before replication")
print(f"5 years, object store with 3x replication: {daily * 365 * 5 * 3 / 1e15:.1f} PB "
      f"(erasure coding at 1.5x would be {daily * 365 * 5 * 1.5 / 1e15:.1f} PB)")
print(f"metadata after 5 years: {dau * uploads_per_user * 365 * 5 * meta_row / 1e12:.1f} TB -> fits a sharded relational store")

# Views mostly fetch the medium thumbnail; the CDN carries them.
egress = views * peak * thumbs[0] * 8
print(f"\\npeak view egress: {egress / 1e9:,.0f} Gbit/s  -> a CDN problem, not an origin problem")
print(f"origin load with a 95% CDN hit rate: {egress * 0.05 / 1e9:,.0f} Gbit/s")`,
        out: `uploads 116/s average, 347/s peak
views   57,870/s average, 173,611/s peak  (read:write 500:1)

per photo stored: 2.70 MB (thumbnails add 8%)
new media per day: 27.0 TB; per year 9.86 PB before replication
5 years, object store with 3x replication: 147.8 PB (erasure coding at 1.5x would be 73.9 PB)
metadata after 5 years: 9.1 TB -> fits a sharded relational store

peak view egress: 208 Gbit/s  -> a CDN problem, not an origin problem
origin load with a 95% CDN hit rate: 10 Gbit/s`,
        notes: [
          { t: "p",
            text: "Uploads are only about 350 per second at peak, but views reach 170,000 per second, a 500:1 ratio. The service is a read system with a small write path. Media grows by 27 TB a day, about 10 PB a year, and 148 PB over five years with three replicas. That makes the storage decision a cost decision: erasure coding at about 1.5× halves it to 74 PB." },
          { t: "p",
            text: "Metadata after five years is about 9 TB, small enough for a sharded relational store, and it holds the relationships and queries. Images belong in an object store. Peak egress of about 200 Gbit/s means the CDN carries the read path; with a 95% hit rate the origin serves about 10 Gbit/s. Those three numbers are the outline of the design: object store with erasure coding, sharded metadata, CDN in front." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: the storage estimate that forgot the thumbnails",
      body: [
        { t: "p",
          text: "**Symptom.** Eight months after launch, a document-sharing product's object store bill passed its annual budget, and the storage team was asked to explain a 4× overrun against the launch estimate." },
        { t: "p",
          text: "**Mechanism.** The estimate counted uploaded files once. The product stored each file three times for durability, generated five preview images per page for multi-page documents, and kept every version on edit. The original model had one line for bytes per upload, and every multiplier sat outside it." },
        { t: "p",
          text: "**Fix.** The capacity model now has separate lines for originals, derived artefacts, versions and replication, and each is checked monthly against the storage metrics. Previews moved to an erasure-coded tier and are regenerated on demand after 90 days. Version retention is now a product decision with a stated cost." }
      ] }
  ],

  takeaways: [
    "**86,400 s ≈ 10⁵**: one million events a day is about **12 a second**. Size for the **peak**, two to three times the average.",
    "Round to **one significant figure**; the inputs are guesses to within a factor of two.",
    "The chain: users × actions → events/s × peak; × bytes → ingest; × days × years × **replication** → storage; reads × bytes → egress.",
    "Measured in the model: **media** multiplied five-year storage **twentyfold**; replication tripled it again to **11.5 PB**.",
    "Double one input at a time to find the assumptions the answer **depends on**, and ask the interviewer about those.",
    "Divide loads by per-node capacity at about **60%** to get node counts that survive a failure.",
    "**3,500 writes/s** is near one relational primary's limit, so write sharding is a decision for now.",
    "A **99%** cache hit rate cut read replicas from **29 to 1**: in that case the cache is a requirement, not an optimisation.",
    "In the photo exercise, egress of about **200 Gbit/s** made the read path a **CDN** problem; the origin served about **10 Gbit/s**."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "A service has 20 million daily users who each perform 5 actions a day. Roughly how many actions per second is that on average?",
        options: ["About 12 per second", "About 1,200 per second", "About 100,000 per second", "About 120,000 per second"],
        answer: 1,
        why: "20M × 5 = 10⁸ a day, and 10⁸ ÷ 10⁵ s ≈ 1,000 a second (1,157 precisely). 12 per second is the figure for one million a day, and the larger options forget to divide by the day." },
      { stem: "In the social-app model, which assumption changed five-year storage least when doubled?",
        options: ["Daily active users", "Bytes per text post", "Size of each image", "Share of posts with an image"],
        answer: 1,
        why: "Text records are a few percent of the bytes once images are present, so doubling them moved storage by about 5%. Users, image size and image share each nearly doubled it." },
      { stem: "Peak reads are 350,000 per second and a read replica handles about 20,000 at your chosen headroom. What does a 99% cache hit rate change?",
        options: [
          "Nothing; replicas are sized from the write rate",
          "Database reads fall to ~3,500/s: one replica",
          "It halves the number of replicas needed",
          "It removes the need for any database at all"
        ],
        answer: 1,
        why: "Only misses reach the database: 1% of 350,000 is 3,500 a second, which one replica handles. Halving would need a 50% hit rate, and the database still holds the data and serves misses." },
      { stem: "Peak egress for image views is estimated at about 200 Gbit/s. What does that number decide?",
        options: [
          "That the origin needs 200 Gbit/s of network capacity",
          "That a CDN serves reads; the origin only misses",
          "That images must be stored at a much lower quality",
          "That the read path must be sharded by user from day one"
        ],
        answer: 1,
        why: "Bandwidth at that scale belongs at the edge, close to users, and the origin sizes for the miss rate: about 10 Gbit/s at 95% hits. Compression and sharding may help, but neither is what the number decides." }
    ] },

  interview: { title: "In an interview",
    sub: "Expect to estimate out loud, and to be asked which of your assumptions matters most.",
    questions: [
      { level: "core",
        q: "Estimate the QPS and storage for a messaging app with 100 million daily users.",
        strong: "A strong answer states assumptions, rounds, separates average from peak and text from media, and ends with what the numbers decide.",
        answer: [
          { t: "p",
            text: "Assume 40 messages per user per day: 4×10⁹ messages a day, about 46,000 a second on average and perhaps 150,000 at peak. At about 200 bytes of text plus metadata that is 0.8 TB a day, roughly 300 TB a year, or about 1 PB a year with three replicas. If one message in twenty carries a 200 KB image, media adds about 40 TB a day and dominates by fifty times." },
          { t: "p",
            text: "So the message store is a write-heavy, append-mostly, sharded store, and media goes to an object store behind a CDN. The peak write rate is far beyond one primary, so the design partitions by conversation from the start." }
        ] },
      { level: "core",
        q: "Your estimate depends on a peak-to-average ratio you guessed. How do you handle that?",
        strong: "A strong answer treats the ratio as a sensitivity, asks about it, and designs for the burst explicitly.",
        answer: [
          { t: "p",
            text: "I would say the assumption out loud, show the answer at two or three values (3×, 10×), and ask the interviewer whether there are known events such as sales, launches or broadcasts. If bursts can be an order of magnitude above normal, I size the steady fleet for ordinary peaks and plan explicitly for the burst: scheduled scaling, a queue, or a waiting room (lesson 11.4), rather than provisioning for the worst case all year." }
        ] },
      { level: "advanced",
        q: "How do you know when an estimate should change the architecture rather than just the number of servers?",
        strong: "A strong answer looks for thresholds: single-node limits, consistency boundaries and cost cliffs.",
        answer: [
          { t: "p",
            text: "When a number crosses a boundary that adding servers does not move. Writes beyond a single primary force partitioning and change what transactions can span. Reads beyond what replicas can absorb make a cache mandatory, and with it an invalidation strategy. Egress beyond what an origin can serve requires a CDN. Storage beyond a cost budget changes durability strategy, for example erasure coding or tiering. Below those thresholds, more of the same is fine; above them, the shape of the design changes." }
        ] }
    ] }
});
