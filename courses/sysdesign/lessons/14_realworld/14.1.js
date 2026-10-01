/* ============================================================================
   LESSON 14.1 — Netflix, YouTube and Amazon
   ========================================================================= */
EC.receiveLesson({
  id: "14.1",

  lede: "Famous architectures are useful as evidence, not as templates: each decision was right for a particular company at a particular moment, and the interesting part is what in its situation made it right. Netflix put everything that happens before you press play into the cloud and everything after it into boxes inside internet providers' networks. YouTube turned an unending river of uploads into a parallel encoding problem. Amazon reorganised a company around service interfaces — and then one of its own teams publicly moved a system back into a single process and cut its cost by 90%. This lesson works through each with the numbers behind the decision: a cache holding 5% of a catalogue serving 85% of viewing, upload volume that would keep a million cores busy, and an orchestration bill over twenty times the cost of the work.",

  objectives: [
    "Explain Netflix's split between a cloud control plane and an ISP-embedded data plane, and why it works",
    "Estimate the cost of video processing at upload scale, and the techniques that tame it",
    "Describe Amazon's service-oriented organisation, and the conditions under which a team reversed it",
    "Separate the decision a company made from the context that made it right",
    "Use a famous system as evidence in a design discussion without copying it blindly"
  ],

  prerequisites: ["10.1", "3.5", "11.6"],

  blocks: [

    { t: "h2", n: "01", id: "netflix", text: "Netflix: two planes",
      sub: "Before play is a software problem; after play is a bandwidth problem" },

    { t: "viz", title: "Netflix's control plane and data plane",
      caption: "Everything up to pressing play — sign-in, browsing, personalised rows and artwork, licences, choosing which servers will stream the video — runs as hundreds of microservices on AWS behind an API gateway. The video itself never touches AWS at play time: it streams from Open Connect appliances, Netflix's own caches placed inside internet providers' networks and at exchange points, which are filled overnight from origin storage. The steering service tells each device which nearby, healthy appliances to use.",
      svg: `<svg viewBox="0 0 760 320" width="100%" role="img" aria-label="Netflix control plane on AWS and data plane in Open Connect">
<defs><marker id="nf-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--ink-3)"/></marker></defs>
<rect x="14" y="14" width="420" height="292" rx="14" style="fill:var(--accent);fill-opacity:.04;stroke:var(--accent);stroke-dasharray:5 4"/>
<text x="28" y="36" class="s-label" style="fill:var(--accent)">control plane: AWS, several regions</text>
<rect x="456" y="14" width="290" height="292" rx="14" style="fill:var(--good);fill-opacity:.04;stroke:var(--good);stroke-dasharray:5 4"/>
<text x="470" y="36" class="s-label" style="fill:var(--good)">data plane: Open Connect</text>
<rect x="28" y="56" width="120" height="50" rx="8" class="s-fill" style="stroke:var(--accent);stroke-width:1.5"/><text x="88.0" y="76" text-anchor="middle" class="s-label">API gateway</text><text x="88.0" y="93" text-anchor="middle" class="s-sub">Zuul: auth, routing</text>
<rect x="170" y="56" width="120" height="50" rx="8" class="s-fill" style="stroke:var(--accent);stroke-width:1.5"/><text x="230.0" y="76" text-anchor="middle" class="s-label">microservices</text><text x="230.0" y="93" text-anchor="middle" class="s-sub">hundreds of them</text>
<rect x="306" y="56" width="116" height="50" rx="8" class="s-fill" style="stroke:var(--violet);stroke-width:1.5"/><text x="364.0" y="76" text-anchor="middle" class="s-label">personalise</text><text x="364.0" y="93" text-anchor="middle" class="s-sub">rows, artwork</text>
<rect x="170" y="130" width="120" height="50" rx="8" class="s-fill" style="stroke:var(--accent);stroke-width:1.5"/><text x="230.0" y="150" text-anchor="middle" class="s-label">playback</text><text x="230.0" y="167" text-anchor="middle" class="s-sub">licence, manifest</text>
<rect x="306" y="130" width="116" height="50" rx="8" class="s-fill" style="stroke:var(--warn);stroke-width:1.5"/><text x="364.0" y="150" text-anchor="middle" class="s-label">steering</text><text x="364.0" y="167" text-anchor="middle" class="s-sub">which OCAs to use</text>
<rect x="170" y="220" width="252" height="50" rx="8" class="s-fill" style="stroke:var(--teal);stroke-width:1.5"/><text x="296.0" y="240" text-anchor="middle" class="s-label">origin storage and encoding</text><text x="296.0" y="257" text-anchor="middle" class="s-sub">every title, every encode (S3)</text>
<rect x="470" y="56" width="128" height="52" rx="8" class="s-fill" style="stroke:var(--good);stroke-width:1.5"/><text x="534.0" y="76" text-anchor="middle" class="s-label">OCAs in ISPs</text><text x="534.0" y="93" text-anchor="middle" class="s-sub">most of the traffic</text>
<rect x="608" y="56" width="128" height="52" rx="8" class="s-fill" style="stroke:var(--good);stroke-width:1.5"/><text x="672.0" y="76" text-anchor="middle" class="s-label">OCAs at IXPs</text><text x="672.0" y="93" text-anchor="middle" class="s-sub">exchange points, fill</text>
<rect x="470" y="236" width="266" height="50" rx="8" class="s-fill" style="stroke:var(--crit);stroke-width:1.5"/><text x="603.0" y="256" text-anchor="middle" class="s-label">TV, phone, laptop</text><text x="603.0" y="273" text-anchor="middle" class="s-sub">streams from the nearest healthy OCA</text>
<line x1="148" y1="81" x2="168" y2="81" style="stroke:var(--ink-3)" stroke-width="1.5" marker-end="url(#nf-a)"/>
<line x1="290" y1="81" x2="304" y2="81" style="stroke:var(--ink-3)" stroke-width="1.5" marker-end="url(#nf-a)"/>
<line x1="230" y1="106" x2="230" y2="128" style="stroke:var(--ink-3)" stroke-width="1.5" marker-end="url(#nf-a)"/>
<line x1="290" y1="155" x2="304" y2="155" style="stroke:var(--ink-3)" stroke-width="1.5" marker-end="url(#nf-a)"/>
<line x1="534" y1="108" x2="534" y2="234" style="stroke:var(--good)" stroke-width="1.5" marker-end="url(#nf-a)"/>
<line x1="672" y1="108" x2="672" y2="234" style="stroke:var(--good);stroke-dasharray:4 3" stroke-width="1.5" marker-end="url(#nf-a)"/>
<text x="603" y="176" text-anchor="middle" class="s-sub" style="fill:var(--good)">video bytes</text>
<path d="M422 245 H451 V82 H468" style="fill:none;stroke:var(--teal);stroke-dasharray:4 3" stroke-width="1.5" marker-end="url(#nf-a)"/>
<text x="443" y="200" text-anchor="middle" class="s-sub" style="fill:var(--teal)" transform="rotate(-90 443 200)">fill overnight</text>
<path d="M470 276 H88 V108" style="fill:none;stroke:var(--crit)" stroke-width="1.4" marker-end="url(#nf-a)"/>
<text x="96" y="294" class="s-sub" style="fill:var(--crit)">browse, press play: API calls; the reply names the OCAs</text>
</svg>` },

    { t: "p", text: "The split follows the shape of the work. The control plane is complex, changes daily, and carries little data, so it lives in a public cloud where hundreds of teams can deploy independently; Netflix moved there after a database corruption in 2008 stopped DVD shipments for three days, and finished the migration in 2016. The data plane is simple and enormous — Netflix has accounted for more than a tenth of the world's downstream internet traffic in industry measurements — so it lives in purpose-built appliances that Netflix gives to providers, because serving video from inside the provider's network is cheaper for both of them than carrying it across the internet. Whether that works depends on how much of the viewing a box of limited size can hold:" },

    { t: "code", lang: "python", title: "opencache.py — how much of an ISP's evening peak an embedded cache can absorb",
      code: `import random
random.seed(41)
TITLES, SUBSCRIBERS = 20_000, 2_000_000              # a catalogue, and one mid-sized ISP's Netflix households
PEAK_SHARE, MBPS = 0.25, 6                           # share streaming in the evening peak; average bitrate

# popularity is heavily skewed: a power law over titles, sizes vary with length and encodes
weights = [1 / (rank + 1) ** 1.15 for rank in range(TITLES)]
total = sum(weights)
sizes_gb = [random.uniform(5, 40) for _ in range(TITLES)]        # all encodes of a title together

peak_gbps = SUBSCRIBERS * PEAK_SHARE * MBPS / 1000
print(f"evening peak for this ISP: {peak_gbps:,.0f} Gbit/s of video\\n")
print(f"{'appliance holds':>16}{'storage':>10}{'share of viewing':>18}{'peak leaving the ISP':>22}")
for share in (0.01, 0.05, 0.10, 0.25):
    n = int(TITLES * share)                          # filled overnight with the titles predicted to be watched
    hit = sum(weights[:n]) / total
    print(f"{share:>15.0%} {sum(sizes_gb[:n]) / 1000:>7.0f} TB{hit:>18.0%}{peak_gbps * (1 - hit):>17,.0f} Gbit/s")`,
      hl: [7, 15, 16],
      out: `evening peak for this ISP: 3,000 Gbit/s of video

 appliance holds   storage  share of viewing  peak leaving the ISP
             1%       5 TB               74%              784 Gbit/s
             5%      23 TB               85%              447 Gbit/s
            10%      45 TB               89%              325 Gbit/s
            25%     112 TB               94%              182 Gbit/s` },

    { t: "p", text: "Popularity is so skewed that an appliance holding 1% of the catalogue serves about three-quarters of viewing, and 10% serves almost nine-tenths — cutting this ISP's evening peak across its external links from 3,000 to a few hundred Gbit/s. Two Netflix choices push the real figure higher. Filling happens overnight, in a window when links are idle, using forecasts of what each region will watch tomorrow — including a new release that has no viewing history yet. And per-title encoding chooses bitrates for each title's complexity (a cartoon needs far fewer bits than a war film), so more titles fit and fewer bits cross every link." },

    { t: "callout", kind: "insight", title: "The rest of Netflix's playbook, briefly",
      body: [
        { t: "p", text: "Netflix popularised much of what earlier modules describe: an API gateway (Zuul) and client-side service discovery (Eureka) (10.5); circuit breakers and fallbacks, from Hystrix onwards (7.2); chaos engineering, from Chaos Monkey terminating instances to Chaos Kong evacuating a whole region (11.6); and experimentation on almost every product change (13.4). The common thread is that a failure in any one of hundreds of services must degrade a feature, never stop playback." }
      ] },

    { t: "h2", n: "02", id: "youtube", text: "YouTube: processing at upload scale",
      sub: "Every minute brings hundreds of hours of video, each needing many encodes" },

    { t: "diagram", kind: "steps", title: "From upload to playable",
      items: [
        { label: "Upload", desc: "Resumable chunked upload to the nearest front end; the original is stored durably first.", tone: "accent" },
        { label: "Check", desc: "Malware scanning, policy classifiers, and Content ID matching against rights holders' reference files.", tone: "warn" },
        { label: "Split", desc: "Cut into short segments so many machines can encode one video at once.", tone: "violet" },
        { label: "Encode", desc: "Each segment into many resolutions and codecs, cheap ones first and expensive ones for popular videos.", tone: "violet" },
        { label: "Publish", desc: "Thumbnails, captions, a manifest for adaptive streaming, and the CDN takes over.", tone: "good" }
      ] },

    { t: "p", text: "YouTube has said that more than 500 hours of video are uploaded every minute. The numbers below are illustrative assumptions — encoding cost varies with content, preset and hardware — but the shape is what matters:" },

    { t: "code", lang: "python", title: "youtube_math.py — encoding and storage at upload scale, and splitting one upload",
      code: `UPLOAD_HOURS_PER_MIN = 500                      # the figure YouTube has published
RENDITIONS = {                                  # codec: (resolutions, CPU-seconds per second of video, Mbit/s)
    "H.264": (8, 0.6, 12),                      # cheap to encode, plays everywhere
    "VP9":   (8, 4.0, 7),                       # ~30-40% smaller files, far more work to encode
}
video_s_per_day = UPLOAD_HOURS_PER_MIN * 60 * 24 * 3600
cpu = sum(n * cost for n, cost, _ in RENDITIONS.values())          # CPU-s per second of uploaded video
cores = video_s_per_day * cpu / 86_400
storage_pb = video_s_per_day * sum(mbps for *_, mbps in RENDITIONS.values()) / 8 / 1e9
print(f"uploads: {video_s_per_day / 3600:,.0f} hours of video a day")
print(f"encoding: {cpu:.0f} CPU-seconds per second of video -> {cores:,.0f} cores busy around the clock")
print(f"new storage: {storage_pb:.1f} PB a day for the encoded renditions alone")

# one upload: a 60-minute video, encoded whole on one machine or as 10-second segments in parallel
segment, length = 10, 3600
whole = length * cpu / 16                       # one 16-core machine does every rendition
parallel = segment * cpu / 16 + 20              # every segment at once on its own machine, plus stitching
print(f"\\na one-hour upload: {whole / 60:.0f} min on one 16-core machine, "
      f"{parallel:.0f} s split into {length // segment} segments on {length // segment} machines")`,
      hl: [2, 7, 17],
      out: `uploads: 720,000 hours of video a day
encoding: 37 CPU-seconds per second of video -> 1,104,000 cores busy around the clock
new storage: 6.2 PB a day for the encoded renditions alone

a one-hour upload: 138 min on one 16-core machine, 43 s split into 360 segments on 360 machines` },

    { t: "p", text: "Encoding every upload into every format would occupy on the order of a million CPU cores continuously and add petabytes a day. Three design responses follow. **Encode lazily by popularity**: every video gets cheap, universally playable formats at once, and the expensive, more efficient codecs only once it is watched enough to repay them — most uploads are watched rarely. **Split and parallelise**: a one-hour upload encoded whole takes over two hours; cut into 360 ten-second segments it is ready in under a minute, which is why uploads become available quickly. **Build hardware**: Google designed its own video-encoding chips (the Argos VCU, announced in 2021) because at this volume a specialised chip beats general-purpose CPUs on cost and power." },

    { t: "callout", kind: "note", title: "Elsewhere at YouTube",
      body: [
        { t: "p", text: "Vitess, now a widely used open-source project, was built at YouTube to shard MySQL behind a proxy layer so applications could keep speaking SQL (4.2). And YouTube's two-stage recommender — a candidate-generation network narrowing millions of videos to hundreds, then a ranking network — is the funnel of 13.5, published in 2016." }
      ] },

    { t: "h2", n: "03", id: "amazon", text: "Amazon: services as an organisation",
      sub: "An architecture chosen to let thousands of teams move independently" },

    { t: "dl", items: [
      { term: "Teams own services", def: "Small \"two-pizza\" teams each own services end to end, from code to on-call. Around 2002, by widely reported accounts, every team was required to expose its data and functions only through service interfaces, with no shared databases and no back doors." },
      { term: "Availability over consistency where it pays", def: "The Dynamo paper (2007) described a shopping cart that always accepts writes, even during failures, and reconciles conflicting versions later — the quorum and versioning ideas of 5.3, chosen because a refused \"add to cart\" loses a sale." },
      { term: "Limit the blast radius", def: "AWS builds services from independent cells and assigns customers to cells with shuffle sharding, so one bad customer or deployment harms few others (10.6)." },
      { term: "Write down what worked", def: "The Amazon Builders' Library publishes the practices behind this: timeouts and jittered retries (7.1), load shedding (7.4), avoiding fallback paths that are never exercised." }
    ] },

    { t: "p", text: "Services were the right answer to an organisational problem: one codebase and one database could not absorb thousands of engineers' changes. They are not free, and Amazon's own engineers have said so. In 2023 the Prime Video team described a stream-monitoring system built as serverless functions orchestrated per video frame, with frames passed through object storage between steps. It worked, but at full scale the per-frame orchestration and storage requests dominated the bill. With illustrative per-frame assumptions and list prices:" },

    { t: "code", lang: "python", title: "prime_video.py — per-frame orchestration against one process",
      code: `STREAMS, FRAMES_PER_S = 1_000, 1                 # live streams monitored; frames analysed per second each
frames = STREAMS * FRAMES_PER_S * 86_400 * 30    # per month

# distributed: each frame passes through three serverless steps, orchestrated, with frames stored between them
STATE_TRANSITION, S3_PUT, S3_GET = 0.025 / 1000, 0.005 / 1000, 0.0004 / 1000      # list prices, dollars
LAMBDA_REQUEST, LAMBDA_GB_S = 0.20 / 1e6, 0.0000166667
distributed = {
    "orchestration (3 state transitions)": 3 * frames * STATE_TRANSITION,
    "object storage (1 write, 2 reads)":   frames * (S3_PUT + 2 * S3_GET),
    "functions (3 calls, 0.1 GB-s each)":  3 * frames * (LAMBDA_REQUEST + 0.1 * LAMBDA_GB_S),
}
# one process: the same three steps as function calls, frames passed in memory, 50 streams per instance
INSTANCE_HOUR = 0.68
monolith = (STREAMS / 50) * INSTANCE_HOUR * 730

print(f"{frames / 1e9:.1f} billion frames a month")
for item, cost in distributed.items(): print(f"  {item:<38}\${cost:>10,.0f}")
total = sum(distributed.values())
print(f"  {'distributed total':<38}\${total:>10,.0f}")
print(f"  {'one process on 20 instances':<38}\${monolith:>10,.0f}   ({1 - monolith / total:.0%} less)")`,
      hl: [7, 14],
      out: `2.6 billion frames a month
  orchestration (3 state transitions)   $   194,400
  object storage (1 write, 2 reads)     $    15,034
  functions (3 calls, 0.1 GB-s each)    $    14,515
  distributed total                     $   223,949
  one process on 20 instances           $     9,928   (96% less)` },

    { t: "p", text: "Almost all of the distributed cost is coordination — state transitions and storage requests — rather than the analysis itself. The team moved the components into one process on container instances, passing frames in memory, and reported cutting infrastructure cost by more than 90%. The lesson is not that microservices were a mistake; it is that the right granularity depends on the unit of work. Orchestrating each video frame as a distributed workflow pays per-call prices billions of times; orchestrating each stream, or each customer order, does not (10.1)." },

    { t: "h2", n: "04", id: "lessons", text: "Decisions and the context that made them right",
      sub: "What to cite, and what to check before you copy it" },

    { t: "table", head: ["Decision", "Why it was right there", "When it would be wrong for you"],
      rows: [
        ["Netflix: own CDN inside ISPs", "over a tenth of the internet's traffic, predictable popularity, global reach", "anything below CDN-contract scale: buy a CDN (3.5)"],
        ["Netflix: chaos engineering in production", "hundreds of services, a mature fallback culture, strong observability", "without fallbacks and dashboards it is just an outage"],
        ["YouTube: lazy encoding by popularity", "most uploads are rarely watched; encoding is the dominant cost", "a small catalogue that is all watched: encode everything once"],
        ["Amazon: service per team", "thousands of engineers needing to deploy independently", "a small team: a modular monolith is faster (10.1)"],
        ["Prime Video: back to one process", "per-frame orchestration costs; one team owns all the steps", "steps owned by different teams or scaling very differently"]
      ] },

    { t: "callout", kind: "trap", title: "\"Netflix does it\" is not an argument",
      body: [
        { t: "p", text: "Citing a famous system is useful in a design discussion only together with the condition that made it work: \"Netflix embeds caches because its traffic is large and its popularity predictable — our traffic is a thousandth of that, so a commercial CDN wins.\" Copying the decision without the condition imports the cost without the benefit." }
      ] },

    { t: "exercise", kind: "Challenge", title: "Fill tonight's appliance",
      difficulty: "core", minutes: 20,
      body: [
        { t: "p", text: "An Open Connect-style appliance has 20 TB of storage. You have tomorrow's forecast for every title in the catalogue — expected views and the size of all its encodes — including a 4K new release that launches tomorrow with no history and a large forecast. Choose what to store tonight to serve as many of tomorrow's views as possible from the appliance, and compare filling by most-viewed first with filling by views per gigabyte." }
      ],
      requirements: [
        "Generate a forecast of 15,000 titles with realistic size differences (episodes, films, 4K films) and skewed views",
        "Fill greedily under the capacity limit with two orderings",
        "Report titles stored, space used, share of views served locally, and whether the new release made it",
        "Explain why the better ordering wins"
      ],
      hint: "This is a knapsack problem; ordering by value per unit of size is the classic greedy approximation.",
      solution: { lang: "python", title: "fill_ex.py",
        code: `import random
random.seed(43)
CAPACITY_TB = 20

# tomorrow's forecast for one appliance: expected views and size of every title's encodes
titles = []
for rank in range(15_000):
    kind = random.choices(["series episode", "film", "4K film"], [6, 3, 1])[0]
    size = {"series episode": random.uniform(1, 4), "film": random.uniform(5, 15), "4K film": random.uniform(20, 45)}[kind]
    views = 1e6 / (rank + 1) ** 1.15 * random.uniform(0.5, 1.5)
    titles.append((f"t{rank}", kind, size, views))
titles.append(("new-release", "4K film", 40.0, 120_000.0))     # launches tomorrow: no history, a big forecast

def fill(order):                    # take titles in this order while they fit
    used, chosen = 0.0, []
    for t in order:
        if used + t[2] <= CAPACITY_TB * 1000: chosen.append(t); used += t[2]
    return chosen, used

total_views = sum(t[3] for t in titles)
for name, key in [("most viewed first", lambda t: -t[3]), ("most views per GB first", lambda t: -t[3] / t[2])]:
    chosen, used = fill(sorted(titles, key=key))
    has_new = any(t[0] == "new-release" for t in chosen)
    print(f"{name:<26} {len(chosen):>6,} titles, {used / 1000:5.1f} TB, "
          f"{sum(t[3] for t in chosen) / total_views:.1%} of views served locally, new release cached: {has_new}")`,
        out: `most viewed first           2,502 titles,  20.0 TB, 91.8% of views served locally, new release cached: True
most views per GB first     5,518 titles,  20.0 TB, 94.1% of views served locally, new release cached: True`,
        notes: [
          { t: "p", text: "Filling by views per gigabyte stored twice as many titles and served over two points more of the day's viewing — two points of a provider's peak is a lot of traffic kept off its external links. Most-viewed-first wastes space on large 4K films whose views per gigabyte are modest, crowding out many small, popular episodes." },
          { t: "p", text: "The new release was stored either way because its forecast was large; the real system's difficulty is that forecasts are uncertain for exactly such titles. Production fill also respects the link's off-peak window (how many terabytes can be moved tonight), shares popular content across appliances in the same location, and keeps the most popular titles on several appliances for redundancy." }
        ] } },

    { t: "callout", kind: "scenario", title: "Case: Christmas Eve, 2012",
      body: [
        { t: "p", text: "**Symptom.** On 24 December 2012, many Netflix customers in the Americas could not start streaming for hours on one of the busiest viewing evenings of the year." },
        { t: "p", text: "**Mechanism.** AWS's Elastic Load Balancing service had a problem in its US-East-1 region, caused by an operational error during maintenance. Netflix's control plane depended on load balancers in that one region, so although the video caches were fine, devices could not complete the API calls needed to press play — the control plane was the single point of failure for the data plane." },
        { t: "p", text: "**Response.** Netflix invested in running the control plane active-active across several AWS regions, with traffic steered away from an unhealthy region (7.5), and began rehearsing whole-region evacuations with Chaos Kong. The general lesson: a data plane is only as available as the control plane it needs at the moment of use — so make that dependency as small, cached and redundant as possible." }
      ] }
  ],

  takeaways: [
    "Read famous architectures as **decisions plus context**, and cite both.",
    "Netflix splits a **cloud control plane** (before play) from an **ISP-embedded data plane** (after play).",
    "Skewed popularity makes embedding work: **1% of the catalogue served ~74%** of viewing, **10% ~89%**, cutting the ISP's external peak several-fold.",
    "Overnight **predictive fill** and **per-title encoding** push local serving higher still.",
    "YouTube: 500+ hours a minute would occupy **about a million cores** if every upload got every encode; encode **lazily by popularity**, **split into segments**, build hardware.",
    "Segmenting a one-hour upload took encoding from **over two hours to under a minute**.",
    "Amazon organised around **services owned by small teams**, availability-first stores like **Dynamo**, and **cells with shuffle sharding**.",
    "Granularity follows the unit of work: per-frame orchestration cost **over twenty times** a single process; Prime Video reported **over 90%** savings moving back.",
    "A data plane is only as available as the **control plane** it needs at the moment of use — Netflix's 2012 lesson."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Why can a cache holding a small fraction of Netflix's catalogue serve most of an ISP's Netflix traffic?",
        options: ["Netflix compresses video more than others", "Viewing is heavily concentrated on a small share of titles, and caches are filled overnight with what each region is predicted to watch", "ISPs block uncached titles", "The catalogue is small"],
        answer: 1,
        why: "With power-law popularity, opencache.py's 1% of titles served about three-quarters of viewing. Predictive overnight fill puts the right titles there before the evening peak." },

      { stem: "Netflix's appliances were healthy, yet on Christmas Eve 2012 many users could not start videos. Why?",
        options: ["The appliances ran out of storage", "Pressing play needs control-plane API calls, and those depended on load balancers in one failing AWS region", "ISPs throttled Netflix", "A codec bug"],
        answer: 1,
        why: "The data plane needed the control plane at the moment of use. Netflix responded with active-active multi-region control-plane deployments and region-evacuation drills." },

      { stem: "Why does YouTube not encode every upload into every codec straight away?",
        options: ["Codecs are patented", "Most uploads are rarely watched, so expensive efficient encodes only pay for themselves on popular videos; cheap universal formats come first", "Uploads are too short", "Viewers prefer low quality"],
        answer: 1,
        why: "Encoding everything would occupy on the order of a million cores. Encoding cost is paid once per video, savings are earned per view — so the expensive codec is worth it only above a view threshold." },

      { stem: "What does the Prime Video monitoring case teach about microservices?",
        options: ["Microservices are always wrong", "Granularity should follow the unit of work: orchestrating every frame as a distributed workflow paid per-call costs billions of times, while one process did the same work far cheaper", "Serverless is always cheaper", "Monoliths cannot scale"],
        answer: 1,
        why: "In prime_video.py coordination, not computation, dominated the distributed bill. The same company built its retail business on services; the right boundary depends on what is being coordinated and who owns it." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "Use real systems as evidence: the decision, the condition, and whether the condition holds for you.",
    questions: [
      { level: "advanced",
        q: "Design a video streaming service like Netflix.",
        strong: "A strong answer separates the control plane from the data plane and sizes the data plane.",
        answer: [
          { t: "p", text: "Control plane: an API gateway with authentication, then services for catalogue, profiles, personalisation, licences and playback; playback returns a manifest of encodes and a ranked list of nearby, healthy cache servers. Deploy it across several regions, active-active, with fallbacks so a failing personalisation service degrades rows rather than blocking play. Ingest: encode each title once per bitrate ladder chosen for its content, package for adaptive streaming, store in origin object storage." },
          { t: "p", text: "Data plane: a CDN — commercial at first, embedded caches inside ISPs at very large scale — filled ahead of demand during off-peak hours from popularity forecasts. Size it: concurrent viewers times average bitrate gives peak egress; skewed popularity means a small cache fraction serves most of it. Clients use adaptive bitrate and fail over between cache servers mid-stream." }
        ] },

      { level: "core",
        q: "What can a smaller company learn from Netflix's chaos engineering?",
        strong: "A strong answer adapts the principle to the company's maturity rather than copying the tool.",
        answer: [
          { t: "p", text: "The principle — prove resilience by injecting failure deliberately — applies at any size; the method should match maturity. Start with game days in staging: kill an instance, add latency to a dependency, fail over the database, with a hypothesis and abort conditions (11.6). Fix what breaks, add fallbacks and dashboards." },
          { t: "p", text: "Only then move to small, controlled production experiments during working hours. Without timeouts, fallbacks and good observability, chaos in production is just an outage." }
        ] },

      { level: "core",
        q: "Amazon is built on services, yet a Prime Video team moved a system back into one process. How do you reconcile those?",
        strong: "A strong answer distinguishes organisational boundaries from the granularity of runtime coordination.",
        answer: [
          { t: "p", text: "Services solve an organisational problem — letting many teams deploy independently — and their cost is network calls, orchestration and operational overhead per interaction. That cost is negligible when interactions are coarse (an order, a request) and dominant when they are fine (every video frame)." },
          { t: "p", text: "The Prime Video components were owned by one team, scaled together and exchanged data per frame, so one process removed the coordination cost without losing independence that mattered. Boundaries should follow team ownership and the unit of work, and can move in either direction as those change." }
        ] }
    ]
  }
});
