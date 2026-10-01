/* ============================================================================
   LESSON 11.1 — Percentiles and Tail Latency
   ========================================================================= */
EC.receiveLesson({
  id: "11.1",

  lede: "\"Average response time 29 ms\" describes almost nobody's experience. Latency distributions are skewed: most requests are fast, and a small fraction — the **tail** — are many times slower, because of garbage-collection pauses, cold caches, retries, queueing and noisy neighbours. **Percentiles** describe that shape: p50 is the typical request, p99 the one-in-a-hundred. The tail matters more than it looks, because a page that **fans out** to a hundred backend calls waits for the slowest of them, so one backend's p99 becomes most users' everyday experience. This lesson measures it, and the techniques — hedging above all — that cut it without making everything faster.",

  objectives: [
    "Describe a latency distribution with percentiles, and say why the mean misleads",
    "Combine percentiles across servers correctly, from samples or histograms rather than averages",
    "Compute how fan-out turns a backend's tail into the user's median",
    "Cut the tail with hedged requests and measure what they cost",
    "Load-test without coordinated omission"
  ],

  prerequisites: ["1.1", "7.2"],

  blocks: [

    { t: "h2", n: "01", id: "percentiles", text: "Percentiles, not averages",
      sub: "The shape of the distribution is the story" },

    { t: "p", text: "Ten servers, each answering in about 20 ms, except that 1% of requests hit a pause of 150 to 400 ms — and server 9 is three times slower across the board, the way one degraded machine is in any real fleet:" },

    { t: "code", lang: "python", title: "tail.py — mean, percentiles and max, per server and for the fleet", code: `import random, statistics

def pct(sorted_ms, p): return sorted_ms[min(len(sorted_ms) - 1, int(len(sorted_ms) * p / 100))]

def request_ms(rng, slow_server=False):
    ms = rng.lognormvariate(3.0, 0.35)                     # typical requests: ~20 ms
    if rng.random() < 0.01: ms += rng.uniform(150, 400)    # 1%: a GC pause, a cold cache, a retry
    return ms * (3 if slow_server else 1)

rng = random.Random(11)
per_server = {s: sorted(request_ms(rng, slow_server=(s == 9)) for _ in range(20_000)) for s in range(10)}
fleet = sorted(ms for samples in per_server.values() for ms in samples)

print(f"{'':>14}" + "".join(f"{h:>9}" for h in ("mean", "p50", "p90", "p99", "p99.9", "max")))
row = lambda name, s: print(f"{name:>14}" + f"{statistics.fmean(s):>9.1f}" + "".join(f"{pct(s, p):>9.1f}" for p in (50, 90, 99, 99.9)) + f"{s[-1]:>9.1f}")
row("server 0", per_server[0]); row("server 9 (slow)", per_server[9]); row("whole fleet", fleet)

avg_p99 = statistics.fmean(pct(s, 99) for s in per_server.values())
print(f"\\naverage of the ten servers' p99s: {avg_p99:6.1f} ms   true fleet p99: {pct(fleet, 99):6.1f} ms")`,
      hl: [7, 18],
      out: `                   mean      p50      p90      p99    p99.9      max
      server 0     24.3     20.2     32.2    178.4    403.1    438.1
server 9 (slow)     72.4     60.5     96.4    533.4   1159.0   1310.2
   whole fleet     29.0     21.2     44.5    174.5    533.4   1310.2

average of the ten servers' p99s:  161.3 ms   true fleet p99:  174.5 ms` },

    { t: "viz", title: "One server's latency distribution, with its summary statistics",
      caption: "Request counts on a log scale, because otherwise the tail is invisible. The bulk sits around 20 ms; a separate hump between about 150 and 420 ms is the 1% that hit a pause. The mean lands between the median and p90 and describes no actual request; p99 falls inside the pause hump, so it is sensitive to exactly the problem worth knowing about.",
      svg: `<svg viewBox="0 0 760 270" width="100%" role="img" aria-label="Latency histogram with percentiles">
<line x1="60" y1="220.0" x2="740" y2="220.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="52" y="224.0" text-anchor="end" class="s-sub">1</text>
<line x1="60" y1="170.0" x2="740" y2="170.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="52" y="174.0" text-anchor="end" class="s-sub">10</text>
<line x1="60" y1="120.0" x2="740" y2="120.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="52" y="124.0" text-anchor="end" class="s-sub">100</text>
<line x1="60" y1="70.0" x2="740" y2="70.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="52" y="74.0" text-anchor="end" class="s-sub">1,000</text>
<line x1="60" y1="20.0" x2="740" y2="20.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="52" y="24.0" text-anchor="end" class="s-sub">10,000</text>
<rect x="60.5" y="220.0" width="6.6" height="0.0" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="68.1" y="88.0" width="6.6" height="132.0" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="75.6" y="42.2" width="6.6" height="177.8" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="83.2" y="31.9" width="6.6" height="188.1" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="90.7" y="36.4" width="6.6" height="183.6" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="98.3" y="48.2" width="6.6" height="171.8" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="105.8" y="62.3" width="6.6" height="157.7" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="113.4" y="79.6" width="6.6" height="140.4" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="120.9" y="99.2" width="6.6" height="120.8" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="128.5" y="117.7" width="6.6" height="102.3" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="136.1" y="129.0" width="6.6" height="91.0" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="143.6" y="151.0" width="6.6" height="69.0" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="151.2" y="161.2" width="6.6" height="58.8" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="158.7" y="189.9" width="6.6" height="30.1" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="166.3" y="185.1" width="6.6" height="34.9" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="302.3" y="220.0" width="6.6" height="0.0" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="309.8" y="220.0" width="6.6" height="0.0" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="317.4" y="196.1" width="6.6" height="23.9" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="324.9" y="196.1" width="6.6" height="23.9" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="332.5" y="189.9" width="6.6" height="30.1" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="340.1" y="196.1" width="6.6" height="23.9" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="347.6" y="220.0" width="6.6" height="0.0" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="355.2" y="189.9" width="6.6" height="30.1" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="362.7" y="196.1" width="6.6" height="23.9" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="370.3" y="196.1" width="6.6" height="23.9" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="377.8" y="189.9" width="6.6" height="30.1" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="385.4" y="204.9" width="6.6" height="15.1" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="392.9" y="185.1" width="6.6" height="34.9" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="400.5" y="204.9" width="6.6" height="15.1" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="408.1" y="185.1" width="6.6" height="34.9" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="415.6" y="172.3" width="6.6" height="47.7" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="423.2" y="204.9" width="6.6" height="15.1" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="430.7" y="220.0" width="6.6" height="0.0" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="438.3" y="196.1" width="6.6" height="23.9" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="453.4" y="177.7" width="6.6" height="42.3" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="460.9" y="204.9" width="6.6" height="15.1" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="468.5" y="189.9" width="6.6" height="30.1" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="476.1" y="189.9" width="6.6" height="30.1" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="483.6" y="196.1" width="6.6" height="23.9" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="491.2" y="189.9" width="6.6" height="30.1" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="498.7" y="189.9" width="6.6" height="30.1" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="506.3" y="189.9" width="6.6" height="30.1" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="513.8" y="181.1" width="6.6" height="38.9" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="521.4" y="181.1" width="6.6" height="38.9" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="528.9" y="172.3" width="6.6" height="47.7" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="536.5" y="196.1" width="6.6" height="23.9" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="544.1" y="196.1" width="6.6" height="23.9" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="551.6" y="166.0" width="6.6" height="54.0" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="559.2" y="220.0" width="6.6" height="0.0" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="566.7" y="196.1" width="6.6" height="23.9" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="574.3" y="189.9" width="6.6" height="30.1" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="581.8" y="189.9" width="6.6" height="30.1" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="589.4" y="185.1" width="6.6" height="34.9" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="596.9" y="181.1" width="6.6" height="38.9" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="604.5" y="189.9" width="6.6" height="30.1" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="612.1" y="177.7" width="6.6" height="42.3" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="619.6" y="204.9" width="6.6" height="15.1" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="627.2" y="177.7" width="6.6" height="42.3" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="634.7" y="204.9" width="6.6" height="15.1" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="642.3" y="189.9" width="6.6" height="30.1" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="649.8" y="189.9" width="6.6" height="30.1" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="657.4" y="196.1" width="6.6" height="23.9" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="664.9" y="181.1" width="6.6" height="38.9" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="672.5" y="189.9" width="6.6" height="30.1" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="680.1" y="204.9" width="6.6" height="15.1" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="687.6" y="204.9" width="6.6" height="15.1" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="695.2" y="185.1" width="6.6" height="34.9" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="702.7" y="220.0" width="6.6" height="0.0" style="fill:var(--accent);fill-opacity:.55"/>
<rect x="717.8" y="220.0" width="6.6" height="0.0" style="fill:var(--accent);fill-opacity:.55"/>
<text x="60.0" y="236" text-anchor="middle" class="s-sub">0</text>
<text x="135.6" y="236" text-anchor="middle" class="s-sub">50</text>
<text x="211.1" y="236" text-anchor="middle" class="s-sub">100</text>
<text x="286.7" y="236" text-anchor="middle" class="s-sub">150</text>
<text x="362.2" y="236" text-anchor="middle" class="s-sub">200</text>
<text x="437.8" y="236" text-anchor="middle" class="s-sub">250</text>
<text x="513.3" y="236" text-anchor="middle" class="s-sub">300</text>
<text x="588.9" y="236" text-anchor="middle" class="s-sub">350</text>
<text x="664.4" y="236" text-anchor="middle" class="s-sub">400</text>
<text x="740.0" y="236" text-anchor="middle" class="s-sub">450</text>
<text x="400.0" y="262" text-anchor="middle" class="s-sub">latency, ms (one server, 20,000 requests; request counts on a log scale)</text>
<line x1="96.7" y1="20" x2="96.7" y2="220" style="stroke:var(--warn);stroke-dasharray:4 3" stroke-width="1.6"/>

<line x1="90.5" y1="20" x2="90.5" y2="220" style="stroke:var(--good);stroke-dasharray:4 3" stroke-width="1.6"/>

<line x1="108.6" y1="20" x2="108.6" y2="220" style="stroke:var(--teal);stroke-dasharray:4 3" stroke-width="1.6"/>

<line x1="329.7" y1="20" x2="329.7" y2="220" style="stroke:var(--crit);stroke-dasharray:4 3" stroke-width="1.6"/>
<text x="333.7" y="32" text-anchor="start" class="s-sub" style="fill:var(--crit)">p99 178</text>
<line x1="669.1" y1="20" x2="669.1" y2="220" style="stroke:var(--violet);stroke-dasharray:4 3" stroke-width="1.6"/>
<text x="673.1" y="32" text-anchor="start" class="s-sub" style="fill:var(--violet)">p99.9 403</text>
<text x="513.3" y="110.0" text-anchor="middle" class="s-sub" style="fill:var(--crit)">the 1% that hit a pause</text>
<text x="200" y="40" class="s-sub" style="fill:var(--good)">p50 20 ms</text><text x="200" y="56" class="s-sub" style="fill:var(--warn)">mean 24 ms</text><text x="200" y="72" class="s-sub" style="fill:var(--teal)">p90 32 ms</text><line x1="196" y1="52" x2="150" y2="52" style="stroke:var(--ink-3)" stroke-width="1"/></svg>` },

    { t: "dl", items: [
      { term: "p50 (median)", def: "Half of requests are faster. The typical experience, insensitive to the tail." },
      { term: "p90, p95", def: "One in ten, one in twenty is slower. Good for spotting general degradation." },
      { term: "p99, p99.9", def: "One in a hundred, one in a thousand. Where pauses, retries and queueing show up — and for busy users and fan-out pages, not rare at all." },
      { term: "Mean", def: "Useful for capacity arithmetic (11.2), useless as an experience measure: one 10-second request moves it as much as a thousand 10 ms ones." }
    ] },

    { t: "callout", kind: "trap", title: "Percentiles do not average",
      body: [
        { t: "p", text: "Averaging the ten servers' p99s gave 161 ms; the true p99 of all requests was 175 ms. Close here, but there is no guarantee of being close or even on the same side — an average of percentiles is not a percentile of anything. The same applies to averaging per-minute p99s into an hourly one. Compute percentiles from all the samples, or record **histograms** (Prometheus histograms, HDR histograms, t-digests) that can be merged across servers and time and queried for any percentile afterwards." }
      ] },

    { t: "h2", n: "02", id: "fanout", text: "Fan-out turns the tail into the median",
      sub: "The user waits for the slowest call" },

    { t: "p", text: "A search page queries a hundred index shards in parallel; a social feed reads from dozens of services; a dashboard calls ten APIs. The response is ready only when the **slowest** call returns. If each call has a small chance of being slow, the chance that at least one of N is slow is 1 − (1 − p)ᴺ — and Jeff Dean and Luiz Barroso's \"The Tail at Scale\" (2013) made this the defining problem of large systems. Simulated with each backend stalling on 2% of calls:" },

    { t: "code", lang: "python", title: "fanout.py — the slowest of N calls, and hedged requests", code: `import random

def pct(xs, p): xs = sorted(xs); return xs[min(len(xs) - 1, int(len(xs) * p / 100))]

def backend_ms(rng):                                       # one leaf call: ~20 ms, 2% hit a 150-400 ms stall
    ms = rng.lognormvariate(3.0, 0.35)
    return ms + rng.uniform(150, 400) if rng.random() < 0.02 else ms

rng = random.Random(3)
print("a user request waits for the SLOWEST of N parallel backend calls:")
print(f"{'N':>6} {'p50':>8} {'p99':>8}   share of user requests that hit a stall")
for n in (1, 10, 100):
    users = [max(backend_ms(rng) for _ in range(n)) for _ in range(20_000)]
    print(f"{n:>6} {pct(users, 50):>6.0f}ms {pct(users, 99):>6.0f}ms   {sum(u > 150 for u in users) / len(users):>6.1%}")

def hedged(rng, hedge_after):
    """Send to one replica; if no reply within \`hedge_after\` ms, send to a second and take the first answer."""
    first = backend_ms(rng)
    if first <= hedge_after: return first, 1
    return min(first, hedge_after + backend_ms(rng)), 2

leaf = [backend_ms(rng) for _ in range(100_000)]
p95 = pct(leaf, 95)
results = [hedged(rng, p95) for _ in range(100_000)]
lat = [ms for ms, _ in results]; extra = sum(n - 1 for _, n in results) / len(results)
print(f"\\n{'one call, plain:':<26} p50 {pct(leaf, 50):5.1f} ms  p99 {pct(leaf, 99):6.1f} ms  p99.9 {pct(leaf, 99.9):6.1f} ms")
print(f"{'hedged after p95 (%.0f ms):' % p95:<26} p50 {pct(lat, 50):5.1f} ms  p99 {pct(lat, 99):6.1f} ms  p99.9 {pct(lat, 99.9):6.1f} ms"
      f"  extra load {extra:.1%}")`,
      hl: [16, 19, 20],
      out: `a user request waits for the SLOWEST of N parallel backend calls:
     N      p50      p99   share of user requests that hit a stall
     1     20ms    297ms     2.1%
    10     36ms    408ms    18.8%
   100    335ms    427ms    86.4%

one call, plain:           p50  20.2 ms  p99  294.5 ms  p99.9  409.5 ms
hedged after p95 (39 ms):  p50  20.3 ms  p99   59.7 ms  p99.9   76.8 ms  extra load 5.1%` },

    { t: "viz", title: "How often a user request waits for a stall",
      caption: "1 − (1 − p)ᴺ, for backends that stall on 2%, 1% and 0.1% of calls. The simulation agrees: with 2% stalls, 18.8% of requests fanning out to 10 calls and 86% of those fanning out to 100 hit one. At a fan-out of 100, a backend's p99 behaviour is no longer the tail of the user's experience — it is the median.",
      svg: `<svg viewBox="0 0 760 280" width="100%" role="img">
<line x1="64" y1="234.0" x2="610" y2="234.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="238.0" text-anchor="end" class="s-sub">0%</text>
<line x1="64" y1="180.0" x2="610" y2="180.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="184.0" text-anchor="end" class="s-sub">25%</text>
<line x1="64" y1="126.0" x2="610" y2="126.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="130.0" text-anchor="end" class="s-sub">50%</text>
<line x1="64" y1="72.0" x2="610" y2="72.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="76.0" text-anchor="end" class="s-sub">75%</text>
<line x1="64" y1="18.0" x2="610" y2="18.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="22.0" text-anchor="end" class="s-sub">100%</text>
<text x="64.0" y="252" text-anchor="middle" class="s-sub">1</text>
<text x="155.0" y="252" text-anchor="middle" class="s-sub">5</text>
<text x="246.0" y="252" text-anchor="middle" class="s-sub">10</text>
<text x="337.0" y="252" text-anchor="middle" class="s-sub">20</text>
<text x="428.0" y="252" text-anchor="middle" class="s-sub">50</text>
<text x="519.0" y="252" text-anchor="middle" class="s-sub">100</text>
<text x="610.0" y="252" text-anchor="middle" class="s-sub">200</text>
<text x="337.0" y="274" text-anchor="middle" class="s-sub">backend calls per user request (fan-out)</text>
<text x="14" y="126.0" text-anchor="middle" class="s-sub" transform="rotate(-90 14 126.0)">user requests that hit a stall</text>
<polyline points="64.0,229.7 155.0,213.2 246.0,194.5 337.0,162.2 428.0,96.7 519.0,46.6 610.0,21.8" style="fill:none;stroke:var(--crit)" stroke-width="2.2"/>
<circle cx="64.0" cy="229.7" r="3.6" style="fill:var(--crit)"/>
<circle cx="155.0" cy="213.2" r="3.6" style="fill:var(--crit)"/>
<circle cx="246.0" cy="194.5" r="3.6" style="fill:var(--crit)"/>
<circle cx="337.0" cy="162.2" r="3.6" style="fill:var(--crit)"/>
<circle cx="428.0" cy="96.7" r="3.6" style="fill:var(--crit)"/>
<circle cx="519.0" cy="46.6" r="3.6" style="fill:var(--crit)"/>
<circle cx="610.0" cy="21.8" r="3.6" style="fill:var(--crit)"/>
<line x1="626" y1="28" x2="644" y2="28" style="stroke:var(--crit)" stroke-width="2.4"/>
<text x="650" y="32" class="s-sub" style="fill:var(--ink-2)">2% of calls stall</text>
<polyline points="64.0,231.8 155.0,223.4 246.0,213.3 337.0,194.7 428.0,148.7 519.0,97.1 610.0,46.9" style="fill:none;stroke:var(--warn)" stroke-width="2.2"/>
<circle cx="64.0" cy="231.8" r="3.6" style="fill:var(--warn)"/>
<circle cx="155.0" cy="223.4" r="3.6" style="fill:var(--warn)"/>
<circle cx="246.0" cy="213.3" r="3.6" style="fill:var(--warn)"/>
<circle cx="337.0" cy="194.7" r="3.6" style="fill:var(--warn)"/>
<circle cx="428.0" cy="148.7" r="3.6" style="fill:var(--warn)"/>
<circle cx="519.0" cy="97.1" r="3.6" style="fill:var(--warn)"/>
<circle cx="610.0" cy="46.9" r="3.6" style="fill:var(--warn)"/>
<line x1="626" y1="50" x2="644" y2="50" style="stroke:var(--warn)" stroke-width="2.4"/>
<text x="650" y="54" class="s-sub" style="fill:var(--ink-2)">1% of calls stall</text>
<polyline points="64.0,233.8 155.0,232.9 246.0,231.8 337.0,229.7 428.0,223.5 519.0,213.4 610.0,194.8" style="fill:none;stroke:var(--good)" stroke-width="2.2"/>
<circle cx="64.0" cy="233.8" r="3.6" style="fill:var(--good)"/>
<circle cx="155.0" cy="232.9" r="3.6" style="fill:var(--good)"/>
<circle cx="246.0" cy="231.8" r="3.6" style="fill:var(--good)"/>
<circle cx="337.0" cy="229.7" r="3.6" style="fill:var(--good)"/>
<circle cx="428.0" cy="223.5" r="3.6" style="fill:var(--good)"/>
<circle cx="519.0" cy="213.4" r="3.6" style="fill:var(--good)"/>
<circle cx="610.0" cy="194.8" r="3.6" style="fill:var(--good)"/>
<line x1="626" y1="72" x2="644" y2="72" style="stroke:var(--good)" stroke-width="2.4"/>
<text x="650" y="76" class="s-sub" style="fill:var(--ink-2)">0.1% of calls stall</text>
</svg>` },

    { t: "h2", n: "03", id: "hedging", text: "Cutting the tail",
      sub: "Hedge, bound, and remove the causes" },

    { t: "p", text: "The output's second half is the most effective single technique. A **hedged request** sends the call to one replica and, if no answer has arrived by about the p95 latency, sends it again to a second replica and uses whichever answers first. Since a stall on one replica is rarely a stall on another, the second request usually answers quickly. Measured: p99 fell from **295 ms to 60 ms** and p99.9 from **410 ms to 77 ms**, for **5% more** backend load — the hedge fires only on the slowest 5%. Dean and Barroso reported the same effect in Bigtable, with p99.9 falling from 1,800 ms to 74 ms for 2% extra requests." },

    { t: "diagram", kind: "timeline", title: "One hedged request",
      caption: "Replica A has stalled. At 39 ms — this backend's p95 — no answer has arrived, so the client sends the same request to replica B, which answers 20 ms later. The client uses B's answer and cancels A's request. Hedging is safe only for idempotent reads (7.1), and the cancellation matters so the stalled replica does not finish useless work.",
      span: 320, tick: 40, unit: "milliseconds",
      lanes: [
        { label: "Replica A", bars: [[0, 59, "stalled", "crit"], [59, 300, "cancelled at 59 ms (would have run to ~300)", "warn"]] },
        { label: "Replica B", bars: [[39, 59, "", "good"]] },
        { label: "Client", bars: [[0, 39, "waiting", "accent"], [39, 59, "", "warn"]] }
      ] },

    { t: "table", head: ["Cause of tail latency", "Mitigation"], rows: [
      ["Garbage-collection pauses", "tune or change the collector; hedge across replicas"],
      ["Queueing behind slow requests", "separate pools per request class (7.2); limit concurrency"],
      ["Cold caches after a deploy or failover", "warm before taking traffic"],
      ["Retries after timeouts", "tight timeouts with budgets (7.1); deadlines (10.5)"],
      ["Noisy neighbours, background compaction", "dedicated capacity; schedule background work off-peak"],
      ["One slow replica or shard", "outlier ejection (10.5); hedging; least-time balancing (2.2)"],
      ["Fan-out width", "fewer calls per request; tolerate partial results"]
    ] },

    { t: "callout", kind: "tradeoff", title: "Tolerate partial answers",
      body: [
        { t: "p", text: "Fan-out systems can also stop waiting. A search page that has answers from 98 of 100 shards at its deadline can return those 98 — slightly incomplete results now beat complete results late. Recommendation and feed systems commonly do this, with the missing shards' contribution simply absent from that response. It is a product decision, not just an engineering one." }
      ] },

    { t: "exercise", kind: "Challenge", title: "The load test that could not see the outage",
      difficulty: "advanced", minutes: 25,
      body: [
        { t: "p", text: "A service answers in 2 ms, but freezes for two seconds once during a one-minute load test intended to send a request every 10 ms. Most load generators send a request, **wait** for the reply, then send the next. Simulate that closed-loop tester and an open-loop one that sends on schedule regardless, and compare the latency percentiles each reports. Gil Tene named the difference **coordinated omission**." }
      ],
      requirements: [
        "Simulate the server in virtual time: 2 ms per request, with a 2 s freeze at t = 30 s",
        "Closed loop: one request outstanding at a time",
        "Open loop: requests sent every 10 ms, queueing behind each other on one server",
        "Report sample counts, p50, p99, p99.9 and max for both"
      ],
      hint: "In the open loop, a request sent at time s starts at max(s, the time the server became free) and its latency is its finish time minus s, not minus its start.",
      solution: { lang: "python", title: "co_ex.py",
        code: `def pct(xs, p): xs = sorted(xs); return xs[min(len(xs) - 1, int(len(xs) * p / 100))]

def service_time(t):
    """The server answers in 2 ms, except for a 2-second freeze starting at t = 30 s (a GC pause, a failover)."""
    return 2 + max(0, 32_000 - t) if 30_000 <= t < 32_000 else 2

RATE_MS, DURATION = 10, 60_000                   # the test intends one request every 10 ms for 60 s

def closed_loop():
    """The common load tester: send, wait for the reply, then send the next one."""
    t, samples = 0, []
    while t < DURATION:
        took = service_time(t); samples.append(took)
        t += max(RATE_MS, took)                  # it could not send while it was waiting
    return samples

def open_loop():
    """Requests go out on schedule whether or not earlier ones have returned; each waits its turn."""
    samples, free_at = [], 0
    for sent in range(0, DURATION, RATE_MS):
        start = max(sent, free_at)               # a single server: queued behind earlier requests
        free_at = start + service_time(start)
        samples.append(free_at - sent)           # latency as the user would see it
    return samples

for name, run in (("closed loop (waits for each reply)", closed_loop), ("open loop (sends on schedule)", open_loop)):
    s = run()
    print(f"{name:<36} {len(s):>5} samples  p50 {pct(s, 50):>5} ms  p99 {pct(s, 99):>5} ms  p99.9 {pct(s, 99.9):>5} ms  max {max(s):>5} ms")`,
        out: `closed loop (waits for each reply)    5801 samples  p50     2 ms  p99     2 ms  p99.9     2 ms  max  2002 ms
open loop (sends on schedule)         6000 samples  p50     2 ms  p99  1530 ms  p99.9  1962 ms  max  2002 ms`,
        notes: [
          { t: "p", text: "The closed-loop tester reported a p99 and p99.9 of **2 ms** for a service that froze for two seconds. It recorded only one slow sample, because while it waited it sent nothing, so the 200 requests that real users would have sent during the freeze were never made — the tester coordinated with the server to omit them. The open-loop tester recorded those requests, queued behind the freeze, and reported a p99 of **1,530 ms**." },
          { t: "p", text: "Real users do not wait for each other. Use load generators with a constant arrival rate (wrk2, k6's constant-arrival-rate executor, Gatling's open models), or correct the latencies for the intended schedule (HdrHistogram's recordValueWithExpectedInterval). 11.4 builds on this for load testing." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: a fast backend and a slow product page",
      body: [
        { t: "p", text: "**Symptom.** Product pages had a p50 of 900 ms, yet every backend team's dashboard showed a healthy p50 under 30 ms and p99 under 300 ms. Each team concluded the problem was elsewhere." },
        { t: "p", text: "**Mechanism.** The page fanned out to about 60 backend calls — pricing per variant, stock per warehouse, recommendations, reviews — and waited for all of them. Each backend's 1–2% of slow calls, invisible in its own p50, meant that most pages hit at least one: 1 − 0.985⁶⁰ is about 60%. The page's median was the backends' tail. Dashboards averaging per-instance percentiles hid it further." },
        { t: "p", text: "**Fix.** Calls were batched (one pricing call for all variants), reducing fan-out to 12; idempotent reads were hedged at p95; recommendations and reviews got a deadline after which the page renders without them; and dashboards switched to merged histograms with the page's end-to-end percentiles shown next to each backend's. The page's p50 fell to 180 ms." }
      ] }
  ],

  takeaways: [
    "Describe latency with **percentiles**: p50 for the typical request, p99 and p99.9 for the tail — the **mean** describes nobody.",
    "Measured: a healthy server's p99 was **almost 9× its median** because 1% of requests hit a pause.",
    "**Percentiles do not average**: compute them from all samples or from **mergeable histograms**.",
    "With **fan-out**, the user waits for the slowest call: P(at least one slow) = 1 − (1 − p)ᴺ — measured, **86%** of requests over 100 calls hit a 2% stall.",
    "At large fan-out, a backend's **tail becomes the user's median**.",
    "**Hedged requests** — a second request after ~p95 — cut p99 from **295 to 60 ms** for **5% extra load**; only for idempotent calls, with cancellation.",
    "Remove tail causes too: GC, queueing, cold caches, retries, noisy neighbours, and fan-out width itself.",
    "Consider **partial results** at a deadline instead of waiting for every call.",
    "Load-test with a **constant arrival rate**: a closed-loop tester reported a **2 ms p99** for a server that froze for **2 s** (coordinated omission)."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A service's mean latency is 29 ms and its p99 is 175 ms. Which statement is correct?",
        options: ["Most requests take about 29 ms", "One request in a hundred takes 175 ms or more, and the mean is pulled up by that tail rather than describing a typical request", "The p99 must be a measurement error", "The median must also be about 29 ms"],
        answer: 1,
        why: "p99 = 175 ms means 1% of requests are at least that slow. The mean is the average of a skewed distribution, so it sits above the median (21 ms here) and below the tail, describing no actual request. Skewed tails are normal, not errors." },

      { stem: "You have the p99 of each of ten servers. How do you get the fleet's p99?",
        options: ["Average the ten values", "Take the maximum of the ten", "Compute it from all the underlying samples, or merge the servers' histograms and read the p99", "Take the median of the ten"],
        answer: 2,
        why: "Percentiles are not additive: averages, maxima or medians of per-server p99s are not the p99 of the combined requests. Merging the raw data or mergeable histograms gives the right answer." },

      { stem: "Each backend call has a 1% chance of being slow, and a page makes 100 calls in parallel. About what fraction of pages wait for at least one slow call?",
        options: ["1%", "10%", "63%", "100%"],
        answer: 2,
        why: "1 − 0.99¹⁰⁰ ≈ 0.63. Each call is very likely fast, but with 100 independent chances, most pages hit at least one slow call. 1% would be true for a single call, and it never quite reaches 100%." },

      { stem: "A load generator waits for each response before sending the next request. During a 2-second server freeze, what does it record?",
        options: ["Every request users would have sent during the freeze, each with its full delay", "Only one slow sample, because it stopped sending while waiting — so the tail is badly understated", "Nothing, because it times out", "The same results as an open-loop generator"],
        answer: 1,
        why: "This is coordinated omission: the tester pauses with the server, so the requests that real users would have queued are never sent or measured. The simulation's closed-loop p99 was 2 ms against 1,530 ms on schedule." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "Tail latency questions separate people who have operated systems at scale.",
    questions: [
      { level: "core",
        q: "Why do we use percentiles instead of averages for latency?",
        strong: "A strong answer explains skew, what each percentile tells you, and how to aggregate them.",
        answer: [
          { t: "p", text: "Latency distributions are skewed: most requests are fast and a few are much slower, so the mean sits between the typical and the slow and describes neither. p50 gives the typical experience, p99 and p99.9 show the tail, where pauses, retries and queueing appear and where busy users and fan-out pages spend much of their time." },
          { t: "p", text: "They must be aggregated properly: you cannot average per-server or per-minute percentiles. I record mergeable histograms and compute fleet-wide and end-to-end percentiles from them, and I set SLOs on percentiles rather than means." }
        ] },

      { level: "advanced",
        q: "How do you handle tail latency at scale?",
        strong: "A strong answer quantifies fan-out amplification and gives several layered techniques with their costs.",
        answer: [
          { t: "p", text: "First, quantify it: with fan-out N, the chance a request hits at least one slow call is 1 − (1 − p)ᴺ, so at 100 calls a 1% backend tail affects 63% of requests. Then reduce fan-out where possible — batch calls, denormalise — and remove causes: GC tuning, separate pools so slow requests do not queue fast ones, cache warming, tight timeouts with retry budgets." },
          { t: "p", text: "For what remains, hedged requests: re-send idempotent reads to another replica after about the p95, take the first answer and cancel the other; it costs a few percent extra load and cuts the deep tail dramatically. Add deadlines and, where the product allows, return partial results rather than waiting for the last shard." }
        ] },

      { level: "core",
        q: "What is coordinated omission?",
        strong: "A strong answer explains the mechanism and how to avoid it.",
        answer: [
          { t: "p", text: "A load tester that sends the next request only after the previous reply stops sending while the system is slow, so it never measures the requests real users would have sent during the stall. It reports one slow sample instead of hundreds and dramatically understates the tail." },
          { t: "p", text: "Avoid it with an open-loop, constant-arrival-rate generator, or correct each sample against its intended send time. Also be careful with production metrics measured after a request reaches a server, since queueing before it is invisible there too." }
        ] }
    ]
  }
});
