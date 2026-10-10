EC.receiveLesson({
  id: "3.11",

  lede: "A load test produces numbers; a useful load test produces numbers that mean something. I built a real scheduling loop over GPT-2 — arrivals, slots, prefill, per-token timing — and the same run yielded **12.6 tokens per second of capacity and 3.7 as experienced by a user**, a 3.4× gap depending on which definition you pick. The p99 TPOT came out as **1,121 ms, 703 ms or 405 ms** from identical data, depending on how the percentile was aggregated. And TTFT, the metric everyone reads as a prefill cost, was **64% to 99% queueing**. Every one of those is a way to ship a confident wrong number.",

  objectives: [
    "Define TTFT, TPOT and throughput precisely enough to compute them two ways and notice the difference",
    "Explain why pooling inter-token gaps and averaging per-request percentiles give different p99s",
    "Recognise that TTFT under load is dominated by queueing rather than prefill",
    "Choose monitoring signals and alert thresholds that track the user's experience",
    "Read a concurrency sweep and say which failure the curve is showing"
  ],

  prerequisites: ["3.1", "3.5"],

  blocks: [

    { t: "h2", n: "01", id: "metrics", text: "The four numbers, and what each one hides",
      sub: "Two latencies, one rate, one queue" },

    { t: "dl", items: [
      { k: "TTFT — time to first token", v: "From the request arriving to the first token reaching the client. It contains the queue wait, the prefill, and any scheduling delay. At low load it is mostly prefill; under load it is mostly queueing, which is the single most misread thing about it." },
      { k: "TPOT — time per output token", v: "The gap between consecutive tokens, after the first. It is what makes a stream feel smooth or stuttery, and it rises as the batch fills (3.5 measured 6.4× from batch 1 to 32). A *distribution*, not a number — one request's gaps vary enormously." },
      { k: "Throughput", v: "Tokens per second. Which tokens and per whose second is the whole question: the system's total output over wall clock is capacity, and the rate a single stream sees is an experience. They are different numbers and both are called throughput." },
      { k: "Queue depth", v: "How many requests are admitted but not yet running. The only one of the four that is a leading indicator — it rises before latency does, which makes it the right thing to scale on (3.10)." }
    ] },

    { t: "p", text: "To measure these honestly I wrote a scheduling loop rather than a formula: 24 requests arriving on a Poisson process, a fixed number of slots, a real prefill pass for each admission and a real decode step per active row, with every inter-token gap recorded." },

    { t: "code", lang: "python", title: "g311.py — the measurement loop", code: `while pending or active:
    now = time.perf_counter() - t0
    while len(active) < slots and pending and pending[0].arrive <= now:
        r = pending.pop(0)
        with torch.no_grad():                      # PREFILL — this is the TTFT cost
            o = m(r.ids, use_cache=True)
        r.past, r.cur = o.past_key_values, o.logits[:, -1:].argmax(-1)
        r.ttft = (time.perf_counter() - t0) - r.arrive      # from ARRIVAL, not from start
        r.last = time.perf_counter()
        active.append(r)

    for r in active:                               # one decode step each
        with torch.no_grad():
            o = m(r.cur, past_key_values=r.past, use_cache=True)
        r.past, r.cur = o.past_key_values, o.logits[:, -1:].argmax(-1)
        now2 = time.perf_counter()
        r.tok_times.append((now2 - r.last) * 1000) # every gap, not an average
        r.last = now2
        r.produced += 1`,
      hl: [7],
      caption: "Two details decide whether the numbers are usable: TTFT measured from arrival rather than from admission, and every gap recorded rather than a running mean." },

    { t: "code", lang: "python", title: "g311.py — the resulting distributions", code: `ttft = [r.ttft * 1000 for r in done]
tpot = [x for r in done for x in r.tok_times]
for name, xs in (("TTFT ms", ttft), ("TPOT ms", tpot)):
    print(name, mean(xs), pct(xs, .5), pct(xs, .9), pct(xs, .99), max(xs))`,
      out: `  24 requests, 356 tokens, wall 12.22 s

  metric               mean        p50        p90        p99        max
  TTFT ms            4722.2     4854.3     9223.2     9813.3     9813.3
  TPOT ms             124.0      107.0      163.6      432.5      678.5`,
      caption: "The TPOT mean is 124 ms and the max is 678 ms — a 5.5× spread inside one short run. Any single number for TPOT is a choice about which users to describe." },

    { t: "callout", kind: "insight", title: "The mean sits above the median on both rows, and that is the whole story",
      body: [
        { t: "p", text: "TPOT: mean 124 ms, median 107 ms, p99 432 ms. The mean is pulled up by a tail it cannot describe, and the p99 is **4.0× the median**. A dashboard showing mean TPOT would report 124 ms while one user in a hundred is seeing four times that." },
        { t: "p", text: "This is not a quirk of my small run — it is structural. Latency distributions in a queueing system are right-skewed by construction, because a request can be delayed arbitrarily and cannot be served faster than the hardware allows. There is a floor and no ceiling." },
        { t: "p", text: "Which is why every serving metric should be reported as percentiles, and why the mean is only useful for cost arithmetic, where it is exactly the right statistic." }
      ] },

    { t: "h2", n: "02", id: "throughput", text: "Throughput, three ways, differing by 3.4×",
      sub: "Capacity and experience are both called tokens per second" },

    { t: "p", text: "Total tokens divided by wall clock tells you what the system can produce. The rate a single stream experiences tells you what a user feels. On the same run these were 12.6 and 3.7 tokens per second — because four streams were sharing the device, so each received roughly a quarter of the output." },

    { t: "code", lang: "python", title: "g311_ex.py — three definitions on identical records", code: `all_gaps = [g for r in reqs for g in r["gaps_ms"]]
total_tok = sum(r["produced"] for r in reqs)

per_req = [len(r["gaps_ms"]) / (sum(r["gaps_ms"]) / 1000) for r in reqs if r["gaps_ms"]]
print(total_tok / wall)                    # capacity
print(statistics.mean(per_req))            # mean experience
print(statistics.median(per_req))           # median experience`,
      out: `  24 requests, 356 tokens, wall 28.20 s, 332 inter-token gaps

  THROUGHPUT, three definitions
  definition                                        tok/s
  total tokens / wall clock                          12.6
  mean of per-request token rates                     3.7
  median of per-request token rates                   3.8

  the first is capacity. the others are what a user feels. a capacity plan
  built on the per-user figure under-provisions by 3.4x.`,
      hl: [4],
      caption: "Both figures are correct and they answer different questions. Using the per-user number for capacity planning under-provisions by 3.4× here." },

    { t: "callout", kind: "trap", title: "Which number a vendor benchmark reports is usually the flattering one",
      body: [
        { t: "p", text: "A framework comparison quoting \"2,500 tokens/sec\" is almost always the capacity figure at high concurrency — the number that makes batching look best. A latency comparison quoting \"45 ms TPOT\" is almost always measured at batch 1, where there is no contention. Both are honest in isolation and they cannot both describe the same deployment." },
        { t: "p", text: "The question that resolves it: **at what concurrency was this measured?** A throughput figure without a concurrency and a TPOT figure without a concurrency are both unusable, and a benchmark that reports them from different runs is comparing two different machines." }
      ] },

    { t: "h2", n: "03", id: "percentiles", text: "The same p99, three times, differing by 2.8×",
      sub: "Aggregation order changes the answer more than the system does" },

    { t: "p", text: "TPOT is a distribution over gaps, and gaps are grouped inside requests. So \"the p99 TPOT\" is ambiguous: you can pool every gap in the run and take the 99th percentile, take each request's p99 and average those, or take each request's *mean* and take the p99 of those. All three get called p99 TPOT." },

    { t: "code", lang: "python", title: "g311_ex.py — three aggregations of one dataset", code: `print(pct(all_gaps, .99))                                          # pool, then percentile
print(statistics.mean([pct(r["gaps_ms"], .99) for r in reqs]))      # percentile, then mean
print(pct([statistics.mean(r["gaps_ms"]) for r in reqs], .99))      # mean, then percentile`,
      out: `  TPOT PERCENTILES, two ways of aggregating
  method                                           p50       p90       p99
  pool every gap, then take percentiles          227.6     357.2    1120.9
  per-request percentile, then mean of those     227.5     390.9     702.9
  per-request MEAN, then percentiles of those    263.2     327.4     404.8`,
      hl: [1],
      caption: "1,121 ms, 703 ms and 405 ms — all labelled p99 TPOT, all computed from the same 332 measurements." },

    { t: "callout", kind: "trap", title: "The third row is the common dashboard implementation, and it is the one that hides the tail",
      body: [
        { t: "p", text: "Averaging within a request before taking percentiles across requests is what you get almost by accident: the client reports one TPOT number per request, the metrics system computes percentiles over those reports. It is the natural pipeline and it reports **405 ms where the pooled figure is 1,121 ms** — it understates the tail by 2.8×." },
        { t: "p", text: "The reason is that a stall is one gap inside a request with dozens of normal gaps, so averaging inside the request dilutes it before the percentile ever sees it. The user, however, experienced the stall." },
        { t: "p", text: "The p50 column is almost identical across all three methods (227.6, 227.5, 263.2), which is why this goes unnoticed: the medians agree, the tails disagree, and the tail is the part you built the dashboard for." }
      ] },

    { t: "code", lang: "python", title: "g311_ex.py — who owns the tail", code: `worst = sorted(((g, r["rid"], r["kind"]) for r in reqs for g in r["gaps_ms"]), reverse=True)
owners = {rid for _, rid, _ in worst[:int(0.01 * len(all_gaps)) + 1]}`,
      out: `  WHO OWNS THE TAIL? the 5 worst gaps, and which request they belong to
      1959.0 ms   request 0   (long)
      1226.3 ms   request 12  (medium)
      1218.0 ms   request 11  (medium)
      1120.9 ms   request 0   (long)
      1118.1 ms   request 2   (long)
    the worst 1% of gaps belong to 3 distinct requests out of 24`,
      caption: "The tail is concentrated, not spread. Three requests out of 24 own the worst 1% of gaps." },

    { t: "callout", kind: "insight", title: "A bad p99 usually means a few bad requests, not a uniformly bad service",
      body: [
        { t: "p", text: "Because the worst gaps cluster inside a handful of requests, improving the p99 is usually about finding what those requests had in common rather than making the whole system faster. In this run the worst gaps belong to the long-prompt requests — consistent with 3.5's finding that a long prefill stalls every active stream." },
        { t: "p", text: "The diagnostic that follows: **group your tail by request attribute** — prompt length, tenant, endpoint, model, cache hit or miss. A p99 that is flat across every grouping is a capacity problem; a p99 concentrated in one group is a scheduling or admission problem, and those have different fixes." }
      ] },

    { t: "h2", n: "04", id: "ttft", text: "TTFT under load is a queueing metric",
      sub: "And my own measurement came out backwards, which is the proof" },

    { t: "p", text: "I split TTFT by prompt length expecting it to track prefill cost, since a longer prompt is more work. It came out inverted — the 192-word prompts had the *lowest* mean TTFT and the 64-word prompts the highest." },

    { t: "code", lang: "python", title: "g311_ex.py — TTFT against prompt length, decomposed", code: `for kind, words in (("short", 12), ("medium", 64), ("long", 192)):
    g = [r for r in reqs if r["kind"] == kind]
    est_prefill = words * 1.33 * 8.41        # 3.7's measured 8.41 ms per prefill token
    mt = statistics.mean(r["ttft_ms"] for r in g)
    print(kind, len(g), mt, est_prefill, mt - est_prefill)`,
      out: `  prompt           count    mean TTFT mean prefill   mean queue
  short (12 w)        10      12414.9        134.2      12280.6
  medium (64 w)        8      16928.8        715.9      16212.9
  long (192 w)         6       6020.5       2147.6       3873.0

  queueing is 64.3% to 98.9% of TTFT here, so TTFT under load is a
  queueing metric that happens to include prefill -- not a prefill metric.`,
      hl: [4],
      caption: "A 12-word prompt's TTFT is 12.4 seconds, of which 134 ms is prefill. The remaining 99% is waiting." },

    { t: "callout", kind: "warn", title: "I expected this table to show the opposite, and the inversion is the finding",
      body: [
        { t: "p", text: "The script I wrote even printed the claim I expected — *\"TTFT tracks prompt length\"* — and the data contradicts it. **Prefill is 1.1% of a short request's TTFT and 35.7% of a long one's.** Everything else is queue." },
        { t: "p", text: "The ordering is inverted because which requests queued longest is set by *when they arrived relative to a free slot*, not by their size. With six long requests out of 24 that is substantially luck, so I would not claim long prompts are systematically faster — the transferable result is the decomposition, not the ordering." },
        { t: "p", text: "The practical consequence is large: **optimising prefill to improve TTFT is addressing 1% of the problem** on a loaded service. Chunked prefill, FlashAttention and prefix caching all attack the small term. What moves TTFT under load is admission — more slots, more replicas, or fewer admitted requests." },
        { t: "p", text: "And it inverts the usual debugging order. If TTFT is bad, check queue depth before you look at the model at all. If queue depth is near zero and TTFT is still bad, *then* it is prefill, and then the prefill optimisations are the right ones." }
      ] },

    { t: "viz", title: "What TTFT is made of, at low load and under load", caption: "The same prefill cost, a queue term that grows without bound. Prefill optimisations act on the striped segment only.",
      svg: `<svg viewBox="0 0 760 236" width="100%" role="img" aria-label="TTFT composition at low and high load">
  <text x="16" y="22" class="s-label" style="fill:var(--good)">LOW LOAD — a free slot is waiting</text>
  <rect x="16" y="32" width="18" height="26" rx="3" class="s-fill-bg" style="stroke:var(--line)" stroke-width="1.2"/>
  <rect x="34" y="32" width="120" height="26" rx="3" class="s-fill" style="stroke:var(--accent)" stroke-width="1.4"/>
  <text x="94" y="50" text-anchor="middle" class="s-sub">prefill 134 ms</text>
  <text x="166" y="50" class="s-mono" style="fill:var(--good)">TTFT ≈ prefill — the prefill optimisations work here</text>

  <text x="16" y="100" class="s-label" style="fill:var(--crit)">UNDER LOAD — the queue is the metric</text>
  <rect x="16" y="110" width="580" height="26" rx="3" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.4" stroke-dasharray="5 3"/>
  <text x="306" y="128" text-anchor="middle" class="s-sub" style="fill:var(--crit)">queue wait 12,281 ms  (98.9%)</text>
  <rect x="596" y="110" width="18" height="26" rx="3" class="s-fill" style="stroke:var(--accent)" stroke-width="1.4"/>
  <text x="624" y="128" class="s-mono" style="fill:var(--accent)">prefill 134 ms</text>

  <line x1="16" y1="162" x2="744" y2="162" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="186" class="s-sub">measured: prefill is 1.1% of a 12-word request's TTFT, 35.7% of a 192-word request's</text>
  <text x="16" y="208" class="s-sub">so chunked prefill, FlashAttention and prefix caching all act on the small term</text>
  <text x="16" y="230" class="s-mono" style="fill:var(--crit)">if TTFT is bad, read queue depth before you look at the model</text>
</svg>` },

    { t: "h2", n: "05", id: "sweep", text: "The concurrency sweep",
      sub: "What the curve looks like, including when it goes the wrong way" },

    { t: "p", text: "The point of a load test is a curve, not a number: hold the arrival pattern fixed and vary the concurrency limit, then read throughput and the latency percentiles together. Here is mine, and it has a result I have to be careful about." },

    { t: "code", lang: "python", title: "g311.py — the same load at 1, 2, 4 and 8 slots", code: `for slots in (1, 2, 4, 8):
    d, w = run(slots=slots)
    tt = [r.ttft * 1000 for r in d]
    tp = [x for r in d for x in r.tok_times]
    print(slots, w, sum(r.produced for r in d) / w,
          pct(tt, .5), pct(tt, .99), pct(tp, .5))`,
      out: `  slots        wall s        tok/s     p50 TTFT     p99 TTFT     p50 TPOT
  1             12.00         31.3       4403.4       9366.8         26.6
  2             11.53         29.5       5049.4       9015.1         53.5
  4             16.53         23.5       4896.9      12439.7        110.9
  8             28.50         12.1       9896.9      20887.9        483.4`,
      hl: [2],
      caption: "Throughput falls as concurrency rises — the opposite of 3.5's batching curve. That is because of a limitation in my loop, and the limitation is instructive." },

    { t: "callout", kind: "trap", title: "My loop time-slices rather than batches, and this is exactly what that looks like",
      body: [
        { t: "p", text: "The decode step in my loop runs a separate forward pass per active row, in a Python loop. That is **not** batching — it is round-robin time-slicing. So adding a slot adds a full forward pass per step with none of the weight-loading saving that made 3.5's batching curve rise to 5.22×." },
        { t: "p", text: "Which is why throughput *falls*: 31.3 tokens per second at one slot down to 12.1 at eight, while p50 TPOT rises 18× from 26.6 ms to 483.4 ms. Every row pays for every other row's forward pass and nobody shares anything." },
        { t: "p", text: "I am keeping the table because it is the signature of a real and common failure. **If your throughput falls as concurrency rises, your server is time-slicing, not batching.** That happens when requests use incompatible sampling parameters, when LoRA adapters differ per request, when a framework falls back from a fused path, or when concurrency is implemented with threads around a single-request API. The curve above is what you would see, and 3.5's curve is what a working batcher looks like." },
        { t: "p", text: "One further caveat on absolute values: the 4-slot configuration measured 12.22 s wall in one run and 28.20 s in another with identical inputs — a 2.3× spread from machine contention. Only ratios computed within a single run are meaningful here." }
      ] },

    { t: "h2", n: "06", id: "monitoring", text: "What to put on the dashboard",
      sub: "And what the thresholds get wrong" },

    { t: "table",
      head: ["Signal", "Alert on", "Why this one"],
      rows: [
        ["**Queue depth**", "Sustained above a few seconds of work", "The only leading indicator — it rises before any latency does (3.10)"],
        ["**TPOT p99**", "Above the budget that makes a stream feel smooth", "What a reading user actually experiences; the p50 hides the stalls"],
        ["**TTFT p99**", "Above the SLA", "But read it as queueing: 64–99% of it was queue in my measurement"],
        ["**KV cache utilisation**", "Above ~90%", "Preemption and recompute start here, and they are invisible in the latency until they are not"],
        ["**Preemption count**", "Any sustained non-zero value", "Means the memory ceiling binds before the compute ceiling (3.2, 3.5)"],
        ["**Error and truncation rate**", "Above a fraction of a percent", "Truncation is a silent quality failure that no latency metric shows"],
        ["GPU utilisation", "**Do not alert on this**", "A healthy continuous-batching server pins it near 100%; it is a cost metric (3.12)"]
      ] },

    { t: "callout", kind: "warn", title: "The usual suggestion is alerting when GPU utilisation drops below 50%",
      body: [
        { t: "p", text: "Its monitoring table lists \"GPU utilization < 50% sustained → scale down / consolidate\" and an 80% target for the autoscaler. As a *cost* signal that is reasonable: 3.12's arithmetic makes utilisation the dominant term in cost per token, and sustained 40% utilisation genuinely means you are paying for idle hardware." },
        { t: "p", text: "As a *health* signal it is misleading in both directions. Low utilisation with a bad tail is the signature of a scheduling problem, not of spare capacity — 3.5's scenario is exactly that — and scaling down in response would make it worse. And high utilisation tells you nothing, because a correctly configured server is at 100% whenever anything is queued." },
        { t: "p", text: "The fix is small: keep the metric, move it from the alerting dashboard to the cost dashboard, and put queue depth in its place." }
      ] },

    { t: "exercise", kind: "lab", title: "Aggregate a load test four ways and say which to publish", difficulty: "core", minutes: 30,
      body: "Starting from raw per-request records — arrival time, TTFT, and every inter-token gap — compute throughput three ways and the TPOT p99 three ways. Then decompose TTFT into queue wait and prefill using a measured per-token prefill cost, and identify which requests own the worst 1% of gaps. Finish by stating which figures you would publish in a capacity plan and which in an SLA, and why they differ.",
      requirements: [
        "Throughput: total tokens over wall clock, mean of per-request rates, median of per-request rates",
        "TPOT p99: pool all gaps; per-request p99 then mean; per-request mean then p99",
        "Decompose TTFT per prompt-length group using 8.41 ms per prefill token (3.7's measurement)",
        "Report how many distinct requests own the worst 1% of inter-token gaps",
        "State explicitly which number belongs in a capacity plan and which in an SLA"
      ],
      hint: "Compute the p50 as well as the p99 for all three aggregations. The p50s will agree closely and the p99s will not, which tells you where the disagreement comes from.",
      solution: { lang: "python", title: "g311_ex.py — the four aggregations", code: `rec = json.load(open("g311_records.json"))
reqs, wall = rec["requests"], rec["wall_s"]
all_gaps = [g for r in reqs for g in r["gaps_ms"]]
total_tok = sum(r["produced"] for r in reqs)

def pct(xs, q):
    xs = sorted(xs)
    return xs[min(len(xs) - 1, int(q * len(xs)))]

# throughput, three ways
per_req = [len(r["gaps_ms"]) / (sum(r["gaps_ms"]) / 1000) for r in reqs if r["gaps_ms"]]
print(total_tok / wall, statistics.mean(per_req), statistics.median(per_req))

# TPOT percentiles, three aggregations
print(pct(all_gaps, .99))
print(statistics.mean([pct(r["gaps_ms"], .99) for r in reqs if r["gaps_ms"]]))
print(pct([statistics.mean(r["gaps_ms"]) for r in reqs if r["gaps_ms"]], .99))

# TTFT decomposed
for kind, words in (("short", 12), ("medium", 64), ("long", 192)):
    g = [r for r in reqs if r["kind"] == kind]
    est_prefill = words * 1.33 * 8.41
    mt = statistics.mean(r["ttft_ms"] for r in g)
    print(kind, mt, est_prefill, mt - est_prefill)

# who owns the tail
worst = sorted(((g, r["rid"]) for r in reqs for g in r["gaps_ms"]), reverse=True)
print(len({rid for _, rid in worst[:int(0.01 * len(all_gaps)) + 1]}), len(reqs))`,
        out: `  24 requests, 356 tokens, wall 28.20 s, 332 inter-token gaps

  THROUGHPUT, three definitions
  definition                                        tok/s
  total tokens / wall clock                          12.6
  mean of per-request token rates                     3.7
  median of per-request token rates                   3.8

  TPOT PERCENTILES, two ways of aggregating
  method                                           p50       p90       p99
  pool every gap, then take percentiles          227.6     357.2    1120.9
  per-request percentile, then mean of those     227.5     390.9     702.9
  per-request MEAN, then percentiles of those    263.2     327.4     404.8

  WHO OWNS THE TAIL? the 5 worst gaps, and which request they belong to
      1959.0 ms   request 0   (long)
      1226.3 ms   request 12  (medium)
      1218.0 ms   request 11  (medium)
      1120.9 ms   request 0   (long)
      1118.1 ms   request 2   (long)
    the worst 1% of gaps belong to 3 distinct requests out of 24

  TTFT, and what it is actually measuring here
  prompt           count    mean TTFT mean prefill   mean queue
  short (12 w)        10      12414.9        134.2      12280.6
  medium (64 w)        8      16928.8        715.9      16212.9
  long (192 w)         6       6020.5       2147.6       3873.0

  queueing is 64.3% to 98.9% of TTFT here, so TTFT under load is a
  queueing metric that happens to include prefill -- not a prefill metric.`,
        notes: [
          { t: "p", text: "**Capacity plan: 12.6 tokens per second.** That is what the hardware produced, and it is the number that divides into a traffic forecast to give a GPU count. Using the per-user 3.7 would over-provision by 3.4× — the mirror image of the usual mistake, and just as expensive." },
          { t: "p", text: "**SLA: the pooled p99, 1,121 ms.** It is the most pessimistic of the three and it is the only one that describes a gap a user actually waited through. The per-request-mean aggregation reports 405 ms for the same data, which would let you sign an SLA your users experience you breaching." },
          { t: "p", text: "**The p50s agree and the p99s do not** — 227.6, 227.5, 263.2 against 1,121, 703, 405. That pattern is diagnostic: when medians match and tails diverge, the aggregation is diluting outliers, which means averaging is happening inside a group before the percentile is taken." },
          { t: "p", text: "**TTFT is 98.9% queue for short prompts.** The decomposition is the most actionable thing in this exercise, because it says prefill optimisations have 1.1% of a short request's TTFT to work on under this load. The lever is admission, not the model." },
          { t: "p", text: "**The tail belongs to three requests out of 24**, and they are the long-prompt ones — consistent with 3.5's finding that a long prefill stalls active streams. So the right next step is not \"make everything faster\" but chunked prefill, which targets exactly that mechanism." },
          { t: "p", text: "Two limits. Twenty-four requests is far too few for a stable p99 — the figure is a demonstration of the aggregation effect, not an estimate of the system's tail. And the same configuration measured 12.22 s and 28.20 s of wall clock on two runs, so the absolute numbers here carry a 2.3× uncertainty and only within-run ratios should be read." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "A load test is not a measurement of the server; it is a measurement of the server *at a concurrency*. Every number it produces has an implied \"when N requests were in flight\" attached, and a figure quoted without that is not a result." },
        { t: "p", text: "And every aggregate has an implied \"over which population\" — all gaps, or all requests? Those are different populations and they give different answers. Decide which question you are asking before you compute the percentile, because the percentile will not tell you afterwards." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\"Our dashboard says p99 TPOT is 180 ms, comfortably inside our 250 ms budget. Users keep complaining that the stream stutters. Who is wrong?\"**" },
        { t: "p", text: "Probably neither — the dashboard is likely computing a different p99 from the one the users are experiencing. The common pipeline has each client report one TPOT figure per request and the metrics system take percentiles over those reports, which averages inside the request before the percentile sees anything. On my own data that aggregation reported 405 ms where the pooled gaps gave 1,121 ms, understating the tail by 2.8×." },
        { t: "p", text: "A stutter is one long gap among dozens of normal ones, so it is exactly the signal that per-request averaging destroys. The check is quick: compute the p99 over *every* inter-token gap and compare. If that number is much larger than the dashboard's, the dashboard is the thing that is wrong." },
        { t: "p", text: "Then I would group the worst gaps by request attribute, because tails concentrate. In my measurement the worst 1% of gaps belonged to three requests out of 24, all of them long-prompt — which points at long prefills stalling active streams, and therefore at chunked prefill as the fix rather than at more capacity." },
        { t: "p", text: "The other thing I would check is what concurrency the 250 ms budget was set at. TPOT rises as the batch fills — 3.5 measured 6.4× step time from batch 1 to 32 — so a budget derived from a low-concurrency benchmark is not a budget for production. If the budget and the measurement come from different concurrencies, the disagreement is in the arithmetic rather than in the system." },
        { t: "p", text: "And I would fix the metric before fixing the server. Publishing a tail you have diluted means every future decision is made against a number that cannot show the problem you are trying to solve." }
      ] }
  ],

  takeaways: [
    "**Measure TTFT from arrival, not from admission**, and record every inter-token gap rather than a running mean — otherwise the metrics cannot show queueing or stalls.",
    "**Throughput means two different things**: total tokens over wall clock is capacity, a single stream's rate is experience. Measured, 12.6 against 3.7 tokens per second — a 3.4× gap.",
    "**A throughput or TPOT figure without a concurrency is not a result**, which is why vendor benchmarks that report them from different runs are comparing two machines.",
    "**\"The p99 TPOT\" is ambiguous and the ambiguity is worth 2.8×**: pooled gaps gave 1,121 ms, per-request p99 averaged gave 703 ms, per-request mean then p99 gave 405 ms.",
    "**The third of those is the common dashboard implementation and it hides the tail**, because averaging inside a request dilutes a stall before the percentile sees it. The p50s agree, which is why nobody notices.",
    "**Tails concentrate.** The worst 1% of gaps belonged to 3 requests out of 24, so group the tail by request attribute before trying to make the whole system faster.",
    "**TTFT under load is a queueing metric** — 64% to 99% queue in my measurement, with prefill at 1.1% of a short request's TTFT. Read queue depth before looking at the model.",
    "**Which means prefill optimisations act on the small term** when the service is loaded; what moves TTFT is admission — more slots, more replicas, or fewer admitted requests.",
    "**If throughput falls as concurrency rises, the server is time-slicing rather than batching.** My loop does exactly that, and the resulting curve is the signature to look for.",
    "**Alert on queue depth, TPOT p99, cache utilisation and preemption count — not GPU utilisation**, which a healthy continuous-batching server pins near 100%."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "One run produced 12.6 tokens/sec by total output over wall clock and 3.7 tokens/sec as the mean per-request rate. Which belongs in a capacity plan?",
        options: [
          "3.7, because it reflects what users actually experience",
          "12.6, because it is what the hardware produced and divides into a traffic forecast",
          "Their geometric mean, as a compromise",
          "Neither — capacity must be measured at batch 1"
        ],
        answer: 1,
        why: "Capacity planning divides a forecast token volume by what the hardware can produce, which is the wall-clock figure. The per-request rate answers a different question — what one stream feels — and belongs in an SLA or a product discussion. Using it for capacity over-provisions by 3.4× here. Measuring at batch 1 would give the least representative figure of all, since it excludes the contention production actually has." },

      { stem: "Three aggregations of the same 332 inter-token gaps gave p99 TPOT as 1,121 ms, 703 ms and 405 ms, while their p50s were 227.6, 227.5 and 263.2 ms. What does the pattern of agreement indicate?",
        options: [
          "The dataset is too small for any percentile to be stable",
          "An aggregation is averaging within requests before taking percentiles, which dilutes outliers but leaves the median intact",
          "The clock resolution is insufficient for sub-second gaps",
          "The three methods measure different time intervals"
        ],
        answer: 1,
        why: "Medians agreeing while tails diverge is the signature of dilution: taking each request's mean first absorbs a single long stall among dozens of normal gaps, so the outlier never reaches the percentile, while the central tendency is barely affected. That third method — one TPOT number per request, percentiles over requests — is the natural metrics pipeline and understates the tail by 2.8× here. Sample size makes all three noisy but would not produce this specific pattern." },

      { stem: "A loaded service shows mean TTFT of 12.4 seconds for 12-word prompts, of which roughly 134 ms is prefill. What should be optimised?",
        options: [
          "Prefill — enable chunked prefill and FlashAttention",
          "Admission and capacity, since 98.9% of the TTFT is queue wait",
          "The tokenizer, which dominates short-prompt handling",
          "Output length limits, to free capacity sooner"
        ],
        answer: 1,
        why: "Prefill is 1.1% of that TTFT, so even eliminating it entirely would be unnoticeable — the request spent its time waiting for a slot. What moves TTFT under load is admission: more concurrent slots, more replicas, or admitting fewer requests so the queue drains. Chunked prefill remains valuable for a different metric, the TPOT of streams that a long prefill would otherwise stall. Output limits do free capacity, but indirectly and far more slowly than changing admission." },

      { stem: "A load sweep shows throughput falling from 31.3 to 12.1 tokens/sec as the concurrency limit rises from 1 to 8 slots. What does this indicate?",
        options: [
          "The device has run out of memory and is swapping",
          "The server is time-slicing between requests rather than batching them, so each added row costs a full forward pass",
          "The arrival rate was too low to fill the extra slots",
          "Throughput is expected to fall with concurrency; only latency improves"
        ],
        answer: 1,
        why: "Real batching shares one weight load across the rows, which is why 3.5 measured throughput rising to 5.22× at batch 32. Throughput falling as rows are added means each row is getting its own forward pass with nothing shared — time-slicing. In production this happens when requests have incompatible sampling parameters or adapters, when a framework falls back from a fused path, or when concurrency is threads around a single-request API. An unfilled slot would leave throughput flat, not reduce it." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Benchmarking questions reward precision about definitions more than knowledge of tools",
    questions: [
      { level: "core",
        q: "How would you benchmark an LLM serving deployment?",
        strong: "A strong answer produces a curve rather than a number and says what concurrency every figure was taken at.",
        answer: [
          { t: "p", text: "A sweep, not a run. Hold the arrival pattern fixed, vary the concurrency limit, and record throughput together with the TTFT and TPOT percentiles at each point. A single number is unusable because every one of these metrics is a function of concurrency — TPOT rises 6.4× from batch 1 to 32 on the hardware I measured, so a figure without a concurrency attached does not describe anything." },
          { t: "p", text: "On the recording side, two details decide whether the data is usable. TTFT measured from the request's *arrival*, not from when it started running, because the gap between those is the queue and the queue is most of the metric. And every inter-token gap kept, not a per-request average, because a stutter is one bad gap among dozens of good ones and averaging destroys it before you can see it." },
          { t: "p", text: "Then I would report percentiles rather than means, since latency in a queueing system is right-skewed by construction — there is a floor and no ceiling. On my own run the TPOT mean was 124 ms, the median 107 and the p99 432." },
          { t: "p", text: "And I would be explicit about which throughput I am quoting. Total output over wall clock is capacity; a single stream's rate is experience. I measured 12.6 against 3.7 tokens per second in the same run, so confusing them is a 3.4× planning error in whichever direction you make it." }
        ] },

      { level: "advanced",
        q: "Your p99 TPOT dashboard looks healthy and users report stuttering. Where do you look?",
        strong: "A strong answer suspects the aggregation first and knows which one is wrong.",
        answer: [
          { t: "p", text: "At how the p99 is computed, before anything in the server. The usual pipeline has each client report one TPOT number per request and the metrics system take percentiles over those reports — which averages inside the request first. On my data that gave 405 ms where the p99 over every individual gap was 1,121 ms, so it understated the tail by 2.8×." },
          { t: "p", text: "A stutter is precisely the signal that averaging destroys: one long gap among dozens of normal ones, diluted to nothing before the percentile sees it. The tell in the data is that all the aggregation methods agree closely on the median — 227.6, 227.5, 263.2 — and disagree wildly on the tail, which is why nobody notices." },
          { t: "p", text: "Having fixed the metric, I would group the worst gaps by request attribute, because tails concentrate rather than spread — the worst 1% of gaps in my run belonged to three requests out of 24, and all three had long prompts. That points at long prefills stalling active streams, so chunked prefill rather than more capacity." },
          { t: "p", text: "I would also check what concurrency the budget was set at. A 250 ms TPOT budget derived from a batch-1 benchmark is not a production budget, and a mismatch there makes the disagreement arithmetic rather than operational." }
        ] },

      { level: "core",
        q: "What would you monitor and alert on for an LLM endpoint?",
        strong: "A strong answer picks leading indicators and explains why utilisation is not one.",
        answer: [
          { t: "p", text: "Queue depth first, because it is the only leading indicator in the set — it rises the moment admission exceeds capacity, before any latency metric moves. Then TPOT p99 against the budget that makes a stream feel smooth, and TTFT p99 against the SLA." },
          { t: "p", text: "Then two that are specific to this workload and routinely missing: KV cache utilisation, because preemption and recompute begin when it fills and neither is visible in latency until it is severe; and the preemption counter itself, where any sustained non-zero value means the memory ceiling binds before the compute ceiling." },
          { t: "p", text: "And truncation rate, which no latency metric shows at all. A response cut off at the token limit is a quality failure that looks perfectly healthy in every performance dashboard." },
          { t: "p", text: "The one I would deliberately not alert on is GPU utilisation. A correctly configured continuous-batching server pins it near 100% whenever anything is queued, so it saturates before the service is in trouble; and low utilisation with a bad tail is a scheduling problem where scaling down would make things worse. It belongs on the cost dashboard, where 3.12's arithmetic makes it the dominant term, rather than the alerting one." },
          { t: "p", text: "When reading TTFT I would also keep in mind what it is made of. I measured 64% to 99% of it as queue wait, with prefill at 1.1% for short prompts — so a TTFT alert is usually telling you about admission, and only tells you about the model once queue depth is near zero." }
        ] }
    ]
  }
});
