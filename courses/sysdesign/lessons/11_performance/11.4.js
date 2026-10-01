/* ============================================================================
   LESSON 11.4 — Auto-Scaling and Load Testing
   ========================================================================= */
EC.receiveLesson({
  id: "11.4",

  lede: "Auto-scaling adds and removes capacity as demand changes, and load testing tells you how much capacity a unit of your system really has. Both are easy to get subtly wrong. An autoscaler reacts to a **lagging signal** and then waits for instances to **boot**, so a sudden spike outruns it; CPU, the default signal, cannot report demand above 100%, so it under-scales exactly when it matters. A load test that measures the wrong thing — the saturation point instead of the point where latency breaks its objective, or a closed loop that hides stalls — produces a capacity number you cannot use. This lesson simulates both and turns them into rules.",

  objectives: [
    "Compare reactive, scheduled and predictive scaling against a spike",
    "Choose a scaling signal, and explain why CPU under-reports overload",
    "Explain how boot time, evaluation interval and cooldowns shape what an autoscaler can do",
    "Plan load, stress, spike and soak tests, and know what each answers",
    "Find capacity at an SLO with a stepped open-loop test, and set scaling targets from it"
  ],

  prerequisites: ["11.1", "11.2", "2.1"],

  blocks: [

    { t: "h2", n: "01", id: "autoscaling", text: "How an autoscaler sees the world",
      sub: "A lagging signal, a delay, and a decision once a minute" },

    { t: "p", text: "A target-tracking autoscaler — the default in every cloud and in Kubernetes' Horizontal Pod Autoscaler — periodically compares a metric with a target and sets the instance count to bring it back: if 20 instances run at 90% CPU against a 60% target, it wants 30. Three delays stand between a spike and new capacity: the **metric window** (averaged over a minute or more), the **evaluation interval**, and the **boot time** before a new instance can take traffic. Simulated, with 17 instances serving 1,000 req/s when a sale ramps traffic to 4,000 req/s within a minute:" },

    { t: "code", lang: "python", title: "autoscale.py — four ways to meet a spike", code: `import math, random

PER_INSTANCE, TARGET = 100, 0.60                    # rps one instance can serve; scale to keep it 60% busy

def demand(t, rng):
    """1,000 req/s, a sale ramps it to 4,000 between t = 600 s and 660 s, back down after t = 1,800 s."""
    if t < 600: base = 1000
    elif t < 660: base = 1000 + 3000 * (t - 600) / 60
    elif t < 1800: base = 4000
    elif t < 1920: base = 4000 - 3000 * (t - 1800) / 120
    else: base = 1000
    return base * rng.uniform(0.95, 1.05)

def simulate(boot_s, metric="cpu", scheduled=None, seconds=2400, seed=1):
    rng = random.Random(seed)
    ready, booting, history, rps = 17, [], [], []   # start sized for 1,000 req/s at 60%
    lost = instance_seconds = 0.0
    trace = []
    for t in range(seconds):
        d = demand(t, rng)
        ready += sum(1 for b in booting if b == t); booting = [b for b in booting if b > t]
        cap = ready * PER_INSTANCE
        lost += max(0.0, d - cap)                     # requests beyond capacity: queued, timed out or shed
        history.append(min(1.0, d / cap))             # CPU utilisation: it cannot show more than 100%
        rps.append(d)                                 # request rate: it can
        instance_seconds += ready + len(booting)      # booting instances cost money too
        if t % 60 == 0 and t > 0:                     # the autoscaler evaluates once a minute ...
            if metric == "cpu":                       # ... on a one-minute average: a lagging signal
                desired = math.ceil(ready * (sum(history[-60:]) / 60) / TARGET)
            else:
                desired = math.ceil((sum(rps[-60:]) / 60) / (PER_INSTANCE * TARGET))
            if scheduled and scheduled[0] <= t < scheduled[1]: desired = max(desired, scheduled[2])
            total = ready + len(booting)
            if desired > total: booting += [t + boot_s] * (desired - total)
            elif desired < ready and t % 300 == 0: ready = max(desired, 2)   # scale in slowly
        trace.append((t, d, cap))
    return lost, instance_seconds / 3600, trace

plans = [("CPU target, 3-minute boot (VM image)", 180, "cpu", None),
         ("CPU target, 30-second boot (container)", 30, "cpu", None),
         ("request-rate target, 30-second boot", 30, "rps", None),
         ("schedule 70 instances from t = 360 s", 180, "cpu", (360, 1800, 70))]
for label, boot, metric, sched in plans:
    lost, hours, _ = simulate(boot, metric, sched)
    print(f"{label:<40} requests over capacity {lost:>9,.0f}   cost {hours:5.1f} instance-hours")`,
      hl: [24, 28, 29, 31, 32, 34, 35],
      out: `CPU target, 3-minute boot (VM image)     requests over capacity   673,484   cost  32.5 instance-hours
CPU target, 30-second boot (container)   requests over capacity   192,233   cost  31.3 instance-hours
request-rate target, 30-second boot      requests over capacity   119,638   cost  31.1 instance-hours
schedule 70 instances from t = 360 s     requests over capacity         0   cost  36.7 instance-hours` },

    { t: "viz", title: "Demand and capacity through a sale",
      caption: "Demand, and capacity under two plans. Reacting on CPU with three-minute boots, capacity climbs in steps several minutes behind demand — every request above the red line was queued, timed out or shed, about 670,000 of them — and then overshoots to more than twice what is needed, because instances ordered during the shortage keep arriving after it ends. Scheduling 70 instances to be ready before the known start time carried the whole sale with no loss, then handed back to the reactive policy. Capacity falls slowly afterwards by design.",
      svg: `<svg viewBox="0 0 760 270" width="100%" role="img">
<line x1="64" y1="224.0" x2="610" y2="224.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="228.0" text-anchor="end" class="s-sub">0k</text>
<line x1="64" y1="172.5" x2="610" y2="172.5" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="176.5" text-anchor="end" class="s-sub">3k</text>
<line x1="64" y1="121.0" x2="610" y2="121.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="125.0" text-anchor="end" class="s-sub">6k</text>
<line x1="64" y1="69.5" x2="610" y2="69.5" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="73.5" text-anchor="end" class="s-sub">9k</text>
<line x1="64" y1="18.0" x2="610" y2="18.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="22.0" text-anchor="end" class="s-sub">12k</text>
<text x="64.0" y="242" text-anchor="middle" class="s-sub">0</text>
<text x="78.0" y="242" text-anchor="middle" class="s-sub"></text>
<text x="92.0" y="242" text-anchor="middle" class="s-sub"></text>
<text x="106.0" y="242" text-anchor="middle" class="s-sub"></text>
<text x="120.0" y="242" text-anchor="middle" class="s-sub"></text>
<text x="134.0" y="242" text-anchor="middle" class="s-sub">5</text>
<text x="148.0" y="242" text-anchor="middle" class="s-sub"></text>
<text x="162.0" y="242" text-anchor="middle" class="s-sub"></text>
<text x="176.0" y="242" text-anchor="middle" class="s-sub"></text>
<text x="190.0" y="242" text-anchor="middle" class="s-sub"></text>
<text x="204.0" y="242" text-anchor="middle" class="s-sub">10</text>
<text x="218.0" y="242" text-anchor="middle" class="s-sub"></text>
<text x="232.0" y="242" text-anchor="middle" class="s-sub"></text>
<text x="246.0" y="242" text-anchor="middle" class="s-sub"></text>
<text x="260.0" y="242" text-anchor="middle" class="s-sub"></text>
<text x="274.0" y="242" text-anchor="middle" class="s-sub">15</text>
<text x="288.0" y="242" text-anchor="middle" class="s-sub"></text>
<text x="302.0" y="242" text-anchor="middle" class="s-sub"></text>
<text x="316.0" y="242" text-anchor="middle" class="s-sub"></text>
<text x="330.0" y="242" text-anchor="middle" class="s-sub"></text>
<text x="344.0" y="242" text-anchor="middle" class="s-sub">20</text>
<text x="358.0" y="242" text-anchor="middle" class="s-sub"></text>
<text x="372.0" y="242" text-anchor="middle" class="s-sub"></text>
<text x="386.0" y="242" text-anchor="middle" class="s-sub"></text>
<text x="400.0" y="242" text-anchor="middle" class="s-sub"></text>
<text x="414.0" y="242" text-anchor="middle" class="s-sub">25</text>
<text x="428.0" y="242" text-anchor="middle" class="s-sub"></text>
<text x="442.0" y="242" text-anchor="middle" class="s-sub"></text>
<text x="456.0" y="242" text-anchor="middle" class="s-sub"></text>
<text x="470.0" y="242" text-anchor="middle" class="s-sub"></text>
<text x="484.0" y="242" text-anchor="middle" class="s-sub">30</text>
<text x="498.0" y="242" text-anchor="middle" class="s-sub"></text>
<text x="512.0" y="242" text-anchor="middle" class="s-sub"></text>
<text x="526.0" y="242" text-anchor="middle" class="s-sub"></text>
<text x="540.0" y="242" text-anchor="middle" class="s-sub"></text>
<text x="554.0" y="242" text-anchor="middle" class="s-sub">35</text>
<text x="568.0" y="242" text-anchor="middle" class="s-sub"></text>
<text x="582.0" y="242" text-anchor="middle" class="s-sub"></text>
<text x="596.0" y="242" text-anchor="middle" class="s-sub"></text>
<text x="610.0" y="242" text-anchor="middle" class="s-sub"></text>
<text x="337.0" y="264" text-anchor="middle" class="s-sub">minutes</text>
<text x="14" y="121.0" text-anchor="middle" class="s-sub" transform="rotate(-90 14 121.0)">requests per second (thousands)</text>
<polyline points="64.0,206.9 78.0,206.8 92.0,207.0 106.0,206.8 120.0,206.8 134.0,206.8 148.0,206.8 162.0,206.8 176.0,206.8 190.0,206.8 204.0,181.6 218.0,155.3 232.0,155.4 246.0,155.1 260.0,154.7 274.0,155.2 288.0,155.2 302.0,155.9 316.0,155.2 330.0,155.2 344.0,154.9 358.0,155.6 372.0,155.4 386.0,155.0 400.0,155.3 414.0,155.6 428.0,155.1 442.0,155.4 456.0,156.1 470.0,155.2 484.0,168.1 498.0,193.9 512.0,206.8 526.0,206.9 540.0,206.8 554.0,206.9 568.0,206.9 582.0,206.9 596.0,206.8 610.0,206.7" style="fill:none;stroke:var(--ink-2)" stroke-width="2.2"/>
<circle cx="64.0" cy="206.9" r="1.8" style="fill:var(--ink-2)"/>
<circle cx="78.0" cy="206.8" r="1.8" style="fill:var(--ink-2)"/>
<circle cx="92.0" cy="207.0" r="1.8" style="fill:var(--ink-2)"/>
<circle cx="106.0" cy="206.8" r="1.8" style="fill:var(--ink-2)"/>
<circle cx="120.0" cy="206.8" r="1.8" style="fill:var(--ink-2)"/>
<circle cx="134.0" cy="206.8" r="1.8" style="fill:var(--ink-2)"/>
<circle cx="148.0" cy="206.8" r="1.8" style="fill:var(--ink-2)"/>
<circle cx="162.0" cy="206.8" r="1.8" style="fill:var(--ink-2)"/>
<circle cx="176.0" cy="206.8" r="1.8" style="fill:var(--ink-2)"/>
<circle cx="190.0" cy="206.8" r="1.8" style="fill:var(--ink-2)"/>
<circle cx="204.0" cy="181.6" r="1.8" style="fill:var(--ink-2)"/>
<circle cx="218.0" cy="155.3" r="1.8" style="fill:var(--ink-2)"/>
<circle cx="232.0" cy="155.4" r="1.8" style="fill:var(--ink-2)"/>
<circle cx="246.0" cy="155.1" r="1.8" style="fill:var(--ink-2)"/>
<circle cx="260.0" cy="154.7" r="1.8" style="fill:var(--ink-2)"/>
<circle cx="274.0" cy="155.2" r="1.8" style="fill:var(--ink-2)"/>
<circle cx="288.0" cy="155.2" r="1.8" style="fill:var(--ink-2)"/>
<circle cx="302.0" cy="155.9" r="1.8" style="fill:var(--ink-2)"/>
<circle cx="316.0" cy="155.2" r="1.8" style="fill:var(--ink-2)"/>
<circle cx="330.0" cy="155.2" r="1.8" style="fill:var(--ink-2)"/>
<circle cx="344.0" cy="154.9" r="1.8" style="fill:var(--ink-2)"/>
<circle cx="358.0" cy="155.6" r="1.8" style="fill:var(--ink-2)"/>
<circle cx="372.0" cy="155.4" r="1.8" style="fill:var(--ink-2)"/>
<circle cx="386.0" cy="155.0" r="1.8" style="fill:var(--ink-2)"/>
<circle cx="400.0" cy="155.3" r="1.8" style="fill:var(--ink-2)"/>
<circle cx="414.0" cy="155.6" r="1.8" style="fill:var(--ink-2)"/>
<circle cx="428.0" cy="155.1" r="1.8" style="fill:var(--ink-2)"/>
<circle cx="442.0" cy="155.4" r="1.8" style="fill:var(--ink-2)"/>
<circle cx="456.0" cy="156.1" r="1.8" style="fill:var(--ink-2)"/>
<circle cx="470.0" cy="155.2" r="1.8" style="fill:var(--ink-2)"/>
<circle cx="484.0" cy="168.1" r="1.8" style="fill:var(--ink-2)"/>
<circle cx="498.0" cy="193.9" r="1.8" style="fill:var(--ink-2)"/>
<circle cx="512.0" cy="206.8" r="1.8" style="fill:var(--ink-2)"/>
<circle cx="526.0" cy="206.9" r="1.8" style="fill:var(--ink-2)"/>
<circle cx="540.0" cy="206.8" r="1.8" style="fill:var(--ink-2)"/>
<circle cx="554.0" cy="206.9" r="1.8" style="fill:var(--ink-2)"/>
<circle cx="568.0" cy="206.9" r="1.8" style="fill:var(--ink-2)"/>
<circle cx="582.0" cy="206.9" r="1.8" style="fill:var(--ink-2)"/>
<circle cx="596.0" cy="206.8" r="1.8" style="fill:var(--ink-2)"/>
<circle cx="610.0" cy="206.7" r="1.8" style="fill:var(--ink-2)"/>
<line x1="626" y1="28" x2="644" y2="28" style="stroke:var(--ink-2)" stroke-width="2.4"/>
<text x="650" y="32" class="s-sub" style="fill:var(--ink-2)">demand</text>
<polyline points="64.0,194.8 78.0,194.8 92.0,194.8 106.0,194.8 120.0,194.8 134.0,194.8 148.0,194.8 162.0,194.8 176.0,194.8 190.0,194.8 204.0,194.8 218.0,194.8 232.0,194.8 246.0,194.8 260.0,175.9 274.0,174.2 288.0,174.2 302.0,143.3 316.0,139.9 330.0,139.9 344.0,88.4 358.0,88.4 372.0,88.4 386.0,38.6 400.0,38.6 414.0,109.0 428.0,109.0 442.0,109.0 456.0,109.0 470.0,109.0 484.0,109.0 498.0,109.0 512.0,109.0 526.0,109.0 540.0,109.0 554.0,194.8 568.0,194.8 582.0,194.8 596.0,194.8 610.0,194.8" style="fill:none;stroke:var(--crit)" stroke-width="2.2"/>
<circle cx="64.0" cy="194.8" r="1.8" style="fill:var(--crit)"/>
<circle cx="78.0" cy="194.8" r="1.8" style="fill:var(--crit)"/>
<circle cx="92.0" cy="194.8" r="1.8" style="fill:var(--crit)"/>
<circle cx="106.0" cy="194.8" r="1.8" style="fill:var(--crit)"/>
<circle cx="120.0" cy="194.8" r="1.8" style="fill:var(--crit)"/>
<circle cx="134.0" cy="194.8" r="1.8" style="fill:var(--crit)"/>
<circle cx="148.0" cy="194.8" r="1.8" style="fill:var(--crit)"/>
<circle cx="162.0" cy="194.8" r="1.8" style="fill:var(--crit)"/>
<circle cx="176.0" cy="194.8" r="1.8" style="fill:var(--crit)"/>
<circle cx="190.0" cy="194.8" r="1.8" style="fill:var(--crit)"/>
<circle cx="204.0" cy="194.8" r="1.8" style="fill:var(--crit)"/>
<circle cx="218.0" cy="194.8" r="1.8" style="fill:var(--crit)"/>
<circle cx="232.0" cy="194.8" r="1.8" style="fill:var(--crit)"/>
<circle cx="246.0" cy="194.8" r="1.8" style="fill:var(--crit)"/>
<circle cx="260.0" cy="175.9" r="1.8" style="fill:var(--crit)"/>
<circle cx="274.0" cy="174.2" r="1.8" style="fill:var(--crit)"/>
<circle cx="288.0" cy="174.2" r="1.8" style="fill:var(--crit)"/>
<circle cx="302.0" cy="143.3" r="1.8" style="fill:var(--crit)"/>
<circle cx="316.0" cy="139.9" r="1.8" style="fill:var(--crit)"/>
<circle cx="330.0" cy="139.9" r="1.8" style="fill:var(--crit)"/>
<circle cx="344.0" cy="88.4" r="1.8" style="fill:var(--crit)"/>
<circle cx="358.0" cy="88.4" r="1.8" style="fill:var(--crit)"/>
<circle cx="372.0" cy="88.4" r="1.8" style="fill:var(--crit)"/>
<circle cx="386.0" cy="38.6" r="1.8" style="fill:var(--crit)"/>
<circle cx="400.0" cy="38.6" r="1.8" style="fill:var(--crit)"/>
<circle cx="414.0" cy="109.0" r="1.8" style="fill:var(--crit)"/>
<circle cx="428.0" cy="109.0" r="1.8" style="fill:var(--crit)"/>
<circle cx="442.0" cy="109.0" r="1.8" style="fill:var(--crit)"/>
<circle cx="456.0" cy="109.0" r="1.8" style="fill:var(--crit)"/>
<circle cx="470.0" cy="109.0" r="1.8" style="fill:var(--crit)"/>
<circle cx="484.0" cy="109.0" r="1.8" style="fill:var(--crit)"/>
<circle cx="498.0" cy="109.0" r="1.8" style="fill:var(--crit)"/>
<circle cx="512.0" cy="109.0" r="1.8" style="fill:var(--crit)"/>
<circle cx="526.0" cy="109.0" r="1.8" style="fill:var(--crit)"/>
<circle cx="540.0" cy="109.0" r="1.8" style="fill:var(--crit)"/>
<circle cx="554.0" cy="194.8" r="1.8" style="fill:var(--crit)"/>
<circle cx="568.0" cy="194.8" r="1.8" style="fill:var(--crit)"/>
<circle cx="582.0" cy="194.8" r="1.8" style="fill:var(--crit)"/>
<circle cx="596.0" cy="194.8" r="1.8" style="fill:var(--crit)"/>
<circle cx="610.0" cy="194.8" r="1.8" style="fill:var(--crit)"/>
<line x1="626" y1="50" x2="644" y2="50" style="stroke:var(--crit)" stroke-width="2.4"/>
<text x="650" y="54" class="s-sub" style="fill:var(--ink-2)">CPU, slow boot</text>
<polyline points="64.0,194.8 78.0,194.8 92.0,194.8 106.0,194.8 120.0,194.8 134.0,194.8 148.0,194.8 162.0,194.8 176.0,194.8 190.0,103.8 204.0,103.8 218.0,103.8 232.0,103.8 246.0,103.8 260.0,103.8 274.0,103.8 288.0,103.8 302.0,103.8 316.0,103.8 330.0,103.8 344.0,103.8 358.0,103.8 372.0,103.8 386.0,103.8 400.0,103.8 414.0,103.8 428.0,103.8 442.0,103.8 456.0,103.8 470.0,103.8 484.0,109.0 498.0,109.0 512.0,109.0 526.0,109.0 540.0,109.0 554.0,194.8 568.0,194.8 582.0,194.8 596.0,194.8 610.0,194.8" style="fill:none;stroke:var(--good)" stroke-width="2.2"/>
<circle cx="64.0" cy="194.8" r="1.8" style="fill:var(--good)"/>
<circle cx="78.0" cy="194.8" r="1.8" style="fill:var(--good)"/>
<circle cx="92.0" cy="194.8" r="1.8" style="fill:var(--good)"/>
<circle cx="106.0" cy="194.8" r="1.8" style="fill:var(--good)"/>
<circle cx="120.0" cy="194.8" r="1.8" style="fill:var(--good)"/>
<circle cx="134.0" cy="194.8" r="1.8" style="fill:var(--good)"/>
<circle cx="148.0" cy="194.8" r="1.8" style="fill:var(--good)"/>
<circle cx="162.0" cy="194.8" r="1.8" style="fill:var(--good)"/>
<circle cx="176.0" cy="194.8" r="1.8" style="fill:var(--good)"/>
<circle cx="190.0" cy="103.8" r="1.8" style="fill:var(--good)"/>
<circle cx="204.0" cy="103.8" r="1.8" style="fill:var(--good)"/>
<circle cx="218.0" cy="103.8" r="1.8" style="fill:var(--good)"/>
<circle cx="232.0" cy="103.8" r="1.8" style="fill:var(--good)"/>
<circle cx="246.0" cy="103.8" r="1.8" style="fill:var(--good)"/>
<circle cx="260.0" cy="103.8" r="1.8" style="fill:var(--good)"/>
<circle cx="274.0" cy="103.8" r="1.8" style="fill:var(--good)"/>
<circle cx="288.0" cy="103.8" r="1.8" style="fill:var(--good)"/>
<circle cx="302.0" cy="103.8" r="1.8" style="fill:var(--good)"/>
<circle cx="316.0" cy="103.8" r="1.8" style="fill:var(--good)"/>
<circle cx="330.0" cy="103.8" r="1.8" style="fill:var(--good)"/>
<circle cx="344.0" cy="103.8" r="1.8" style="fill:var(--good)"/>
<circle cx="358.0" cy="103.8" r="1.8" style="fill:var(--good)"/>
<circle cx="372.0" cy="103.8" r="1.8" style="fill:var(--good)"/>
<circle cx="386.0" cy="103.8" r="1.8" style="fill:var(--good)"/>
<circle cx="400.0" cy="103.8" r="1.8" style="fill:var(--good)"/>
<circle cx="414.0" cy="103.8" r="1.8" style="fill:var(--good)"/>
<circle cx="428.0" cy="103.8" r="1.8" style="fill:var(--good)"/>
<circle cx="442.0" cy="103.8" r="1.8" style="fill:var(--good)"/>
<circle cx="456.0" cy="103.8" r="1.8" style="fill:var(--good)"/>
<circle cx="470.0" cy="103.8" r="1.8" style="fill:var(--good)"/>
<circle cx="484.0" cy="109.0" r="1.8" style="fill:var(--good)"/>
<circle cx="498.0" cy="109.0" r="1.8" style="fill:var(--good)"/>
<circle cx="512.0" cy="109.0" r="1.8" style="fill:var(--good)"/>
<circle cx="526.0" cy="109.0" r="1.8" style="fill:var(--good)"/>
<circle cx="540.0" cy="109.0" r="1.8" style="fill:var(--good)"/>
<circle cx="554.0" cy="194.8" r="1.8" style="fill:var(--good)"/>
<circle cx="568.0" cy="194.8" r="1.8" style="fill:var(--good)"/>
<circle cx="582.0" cy="194.8" r="1.8" style="fill:var(--good)"/>
<circle cx="596.0" cy="194.8" r="1.8" style="fill:var(--good)"/>
<circle cx="610.0" cy="194.8" r="1.8" style="fill:var(--good)"/>
<line x1="626" y1="72" x2="644" y2="72" style="stroke:var(--good)" stroke-width="2.4"/>
<text x="650" y="76" class="s-sub" style="fill:var(--ink-2)">scheduled</text>
</svg>` },

    { t: "dl", items: [
      { term: "CPU cannot see past 100%", def: "When demand is three times capacity, CPU reads 100%, not 300%, so a CPU-target scaler adds only a fraction of what is needed each round and climbs in steps. A request-rate or queue-length target measures demand directly; in the simulation it cut lost requests from about 192,000 to 120,000 with the same boot time." },
      { term: "Boot time is the biggest lever", def: "Moving from a three-minute VM boot to a thirty-second container start cut lost requests by more than two-thirds. Pre-baked images, smaller start-up work, warm pools of stopped instances and fast readiness checks all shorten it." },
      { term: "Known events are not a scaling problem", def: "A sale, a broadcast, a Monday-morning login wave: schedule the capacity before it arrives. It cost a few more instance-hours here and avoided all of the loss. Predictive scaling automates the same idea for recurring daily and weekly patterns." },
      { term: "Scale out fast, scale in slowly", def: "Removing capacity too eagerly makes it oscillate — flapping — and leaves no room for the next burst. Long scale-in cooldowns and minimum instance counts trade a little cost for stability." }
    ] },

    { t: "callout", kind: "trap", title: "The autoscaler cannot save you from a spike faster than it",
      body: [
        { t: "p", text: "If traffic can triple faster than your metric window plus evaluation interval plus boot time, reactive scaling will always be late, and what happens in the gap is decided by 7.4: shed load, degrade features, and protect the dependencies — databases cannot autoscale in minutes, and fifty new instances each opening a connection pool can take a database down (11.3). Capacity planning sets the minimum; autoscaling handles the rest." }
      ] },

    { t: "table", head: ["Workload", "Scale on", "Why"], rows: [
      ["Stateless web or API", "request rate per instance, or concurrency", "measures demand directly, does not saturate"],
      ["CPU-bound workers", "CPU, as a secondary signal", "fine while below 100%; pair with a demand metric"],
      ["Queue consumers", "queue depth or consumer lag (KEDA)", "the backlog is the demand"],
      ["Latency-sensitive services", "p95 latency, cautiously", "late signal, noisy; better as a guardrail"],
      ["Known daily or event peaks", "a schedule, or predictive scaling", "capacity ready before the traffic"]
    ] },

    { t: "h2", n: "02", id: "load-testing", text: "Load testing",
      sub: "Four shapes, four questions" },

    { t: "viz", title: "Load test shapes",
      caption: "A load test runs expected traffic for long enough to see steady behaviour. A stress or breakpoint test ramps load until something fails, to find the limit and how the system fails at it. A spike test checks the sudden burst — autoscaling, queues, shedding. A soak test runs normal load for hours to find leaks: memory, connections, file handles, growing queues.",
      svg: `<svg viewBox="0 0 760 170" width="100%" role="img" aria-label="Load test shapes">
<rect x="10" y="34" width="168" height="90" rx="8" class="s-fill s-stroke"/>
<polyline points="20.0,100.0 34.8,72.0 153.2,72.0 168.0,100.0" style="fill:none;stroke:var(--accent)" stroke-width="2.4"/>
<text x="94.0" y="22" text-anchor="middle" class="s-label" style="fill:var(--accent)">Load</text>
<text x="94.0" y="146" text-anchor="middle" class="s-sub">expected traffic, sustained</text>
<rect x="198" y="34" width="168" height="90" rx="8" class="s-fill s-stroke"/>
<polyline points="208.0,107.0 356.0,44.0" style="fill:none;stroke:var(--crit)" stroke-width="2.4"/>
<text x="350" y="56" text-anchor="end" class="s-sub" style="fill:var(--crit)">✕ breaks</text>
<text x="282.0" y="22" text-anchor="middle" class="s-label" style="fill:var(--crit)">Stress / breakpoint</text>
<text x="282.0" y="146" text-anchor="middle" class="s-sub">ramp until it breaks</text>
<rect x="386" y="34" width="168" height="90" rx="8" class="s-fill s-stroke"/>
<polyline points="396.0,96.5 455.2,96.5 462.6,47.5 484.8,47.5 492.2,96.5 544.0,96.5" style="fill:none;stroke:var(--warn)" stroke-width="2.4"/>
<text x="470.0" y="22" text-anchor="middle" class="s-label" style="fill:var(--warn)">Spike</text>
<text x="470.0" y="146" text-anchor="middle" class="s-sub">sudden burst, then back</text>
<rect x="574" y="34" width="168" height="90" rx="8" class="s-fill s-stroke"/>
<polyline points="584.0,79.0 732.0,79.0" style="fill:none;stroke:var(--violet)" stroke-width="2.4"/>
<text x="658.0" y="64" text-anchor="middle" class="s-sub" style="fill:var(--violet)">leaks? exhaustion?</text>
<text x="658.0" y="22" text-anchor="middle" class="s-label" style="fill:var(--violet)">Soak</text>
<text x="658.0" y="146" text-anchor="middle" class="s-sub">normal load for hours</text>

</svg>` },

    { t: "p", text: "The number a load test should produce is not \"the most requests per second it can do\" but **capacity at the SLO**: the highest load at which latency and errors still meet their objectives. Those are very different numbers, because of 11.2's utilisation curve. The exercise measures both." },

    { t: "callout", kind: "insight", title: "Load test like production, or learn little",
      body: [
        { t: "p", text: "Use an **open-loop** generator with a constant arrival rate (11.1's coordinated omission). Use production-like data volumes and distributions — 11.3's skewed customers — and realistic request mixes including writes. Warm up first, run long enough for caches, pools and garbage collection to reach steady state, and watch the dependencies, not just the service under test. Run it in CI against a baseline so regressions appear in the change that caused them." }
      ] },

    { t: "exercise", kind: "Challenge", title: "Capacity at the SLO",
      difficulty: "core", minutes: 25,
      body: [
        { t: "p", text: "A service instance has 8 workers, each request taking 10 ms on average. Its SLO is a p99 of at most 50 ms with no errors. Step a constant-arrival-rate test from 300 to 1,000 req/s, one minute per step, with clients that give up after a second. Report throughput, p99 and errors at each step, the capacity at the SLO, and a per-instance load target for the autoscaler." }
      ],
      requirements: [
        "Open-loop arrivals at each offered rate",
        "Requests that wait longer than the client timeout count as errors",
        "A table of offered load, served load, p99 and error rate",
        "Capacity at the SLO, compared with the raw ceiling"
      ],
      hint: "Reuse 11.2's shared-queue simulator. The raw ceiling is workers ÷ mean service time = 800 req/s; the SLO will be broken well before it.",
      solution: { lang: "python", title: "capacity_ex.py",
        code: `import random

def run_step(rate, workers=8, mean_ms=10.0, seconds=60, timeout_ms=1000, seed=7):
    """One step of a constant-arrival-rate (open-loop) test against an 8-worker service.
    Returns achieved throughput, p99 latency and error rate (requests that waited past the timeout)."""
    rng = random.Random(seed); free_at = [0.0] * workers; t = 0.0; lat, errors = [], 0
    while t < seconds * 1000:
        t += rng.expovariate(rate / 1000)
        w = min(range(workers), key=free_at.__getitem__)
        start = max(t, free_at[w])
        if start - t > timeout_ms: errors += 1; continue          # the client gave up; the server never ran it
        free_at[w] = start + rng.expovariate(1 / mean_ms); lat.append(free_at[w] - t)
    lat.sort()
    return len(lat) / seconds, lat[int(len(lat) * 0.99)], errors / (len(lat) + errors)

SLO_P99_MS = 50
print(f"{'offered':>8} {'served':>8} {'p99':>9} {'errors':>7}")
capacity = None
for rate in range(300, 1001, 50):
    served, p99, err = run_step(rate)
    ok = p99 <= SLO_P99_MS and err == 0
    if ok: capacity = rate
    print(f"{rate:>8} {served:>8.0f} {p99:>7.0f}ms {err:>7.1%}{'' if ok else '   over the SLO'}")
print(f"\\ncapacity at the SLO (p99 <= {SLO_P99_MS} ms, no errors): {capacity} req/s;  raw ceiling: 8 workers x 100 req/s = 800 req/s")
print(f"autoscale so each instance sees at most ~{int(capacity * 0.8)} req/s (80% of capacity at the SLO)")`,
        out: ` offered   served       p99  errors
     300      302      46ms    0.0%
     350      350      46ms    0.0%
     400      402      46ms    0.0%
     450      454      46ms    0.0%
     500      504      46ms    0.0%
     550      554      47ms    0.0%
     600      605      49ms    0.0%
     650      655      54ms    0.0%   over the SLO
     700      704      75ms    0.0%   over the SLO
     750      755     220ms    0.0%   over the SLO
     800      805     553ms    0.0%   over the SLO
     850      818    1031ms    4.0%   over the SLO
     900      818    1037ms    9.3%   over the SLO
     950      817    1040ms   14.2%   over the SLO
    1000      818    1041ms   18.5%   over the SLO

capacity at the SLO (p99 <= 50 ms, no errors): 600 req/s;  raw ceiling: 8 workers x 100 req/s = 800 req/s
autoscale so each instance sees at most ~480 req/s (80% of capacity at the SLO)`,
        notes: [
          { t: "p", text: "Up to 600 req/s the p99 held under 50 ms. At 650 it crossed the SLO, at 750 it was over 200 ms, and from 850 throughput stopped rising at about 818 req/s while errors climbed: the saturation point. Capacity at the SLO was **600 req/s — 75% of the 800 req/s ceiling** — and that is the number capacity planning and autoscaling should use." },
          { t: "p", text: "Setting the autoscaler's target at about 80% of capacity at the SLO, around 480 req/s per instance, leaves headroom for bursts and for the time it takes new instances to arrive. A capacity figure taken from the saturation point would have run every instance far past its latency objective at the scaling target." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: a sale that the autoscaler watched happen",
      body: [
        { t: "p", text: "**Symptom.** A retailer's flash sale started at noon. Checkout error rates passed 30% within two minutes and stayed high for twelve; the autoscaler's activity log showed it adding instances the whole time, and by 12:15 the fleet was large enough — after most buyers had given up." },
        { t: "p", text: "**Mechanism.** The group scaled on average CPU over five minutes, evaluated every minute, and new instances took four minutes to install dependencies and warm caches. CPU pinned at 100% within seconds, so each round added only a modest step. Three delays and a saturated metric added up to a quarter of an hour, exactly autoscale.py's slow-boot line." },
        { t: "p", text: "**Fix.** Scheduled scaling now brings capacity up thirty minutes before any planned event. Instances boot from pre-baked images with warm caches loaded from a snapshot in under forty seconds. The policy scales on request rate per instance with a one-minute window, CPU is a secondary signal, and a spike test against a staging copy runs before every major sale." }
      ] }
  ],

  takeaways: [
    "An autoscaler acts on a **lagging metric**, once per **evaluation interval**, and then waits for **boot time** — a fast spike outruns all three.",
    "Measured: with a 3-minute boot, a CPU target lost **~670,000 requests** in a sale; a 30-second boot cut that by more than two-thirds.",
    "**CPU saturates at 100%** and under-reports overload; scale on **request rate, concurrency or queue depth** where you can.",
    "**Schedule** capacity for known events: measured, pre-scaling lost **zero requests** for a few more instance-hours.",
    "Scale out fast and in slowly; keep minimums; protect dependencies that cannot scale in minutes.",
    "Use load, **stress**, **spike** and **soak** tests for different questions: steady behaviour, limits, bursts, leaks.",
    "Load test with **open-loop** arrivals, realistic data and mixes, warm-up, and dependencies watched.",
    "Measure **capacity at the SLO**, not saturation: measured, **600 req/s** met a 50 ms p99 against an **800 req/s** ceiling.",
    "Set scaling targets below capacity at the SLO — about **80%** — to leave room for bursts and scaling delay."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Demand triples within a minute and instances take three minutes to boot. What does a reactive CPU-target autoscaler do?",
        options: ["Adds exactly the right capacity within a minute", "Adds capacity in steps several minutes late, because CPU caps at 100% and new instances take minutes to become ready", "Scales in", "Nothing, because CPU is already at its target"],
        answer: 1,
        why: "Reactive scaling waits for the metric window, the evaluation, and the boot. CPU pinned at 100% understates a demand that is three times capacity, so each round adds too little. The simulation lost about 670,000 requests this way." },

      { stem: "Why is request rate per instance often a better scaling signal than CPU for a web service?",
        options: ["It is cheaper to collect", "It measures demand directly and does not saturate, so the scaler can compute the capacity actually needed", "CPU is always inaccurate", "Request rate never changes"],
        answer: 1,
        why: "CPU tops out at 100% however overloaded the service is; request rate keeps rising with demand, so the desired instance count can be computed in one step. CPU is accurate below saturation and remains a useful secondary signal." },

      { stem: "A load test finds the service saturates at 800 req/s per instance. The SLO is p99 ≤ 50 ms, met up to 600 req/s. What capacity should autoscaling and planning use?",
        options: ["800 req/s", "600 req/s, with the scaling target below it — about 480 req/s", "1,000 req/s", "400 req/s exactly"],
        answer: 1,
        why: "Capacity at the SLO is the useful number; at 800 req/s latency is ten times the objective. Targeting about 80% of it leaves headroom for bursts and for scaling delay." },

      { stem: "Which test would find a slow memory leak in a service?",
        options: ["A spike test", "A soak test: normal load for many hours", "A stress test", "A unit test"],
        answer: 1,
        why: "Leaks of memory, connections or file handles show up as gradual growth over hours under normal load. Spike and stress tests are too short and focus on peaks and limits." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "Expect to be asked how your design behaves at ten times today's traffic, and how you would know.",
    questions: [
      { level: "core",
        q: "How would you configure auto-scaling for a web service with daily peaks and occasional marketing spikes?",
        strong: "A strong answer combines scheduled, predictive and reactive policies, chooses a good signal, and addresses boot time and dependencies.",
        answer: [
          { t: "p", text: "A floor sized from capacity planning, scheduled or predictive scaling for the daily curve and announced events, and reactive target tracking for everything else. The reactive signal would be request rate or concurrency per instance, with a target at about 80% of capacity at the SLO from load tests, and CPU as a secondary signal. Scale out quickly, scale in slowly with cooldowns." },
          { t: "p", text: "I would minimise boot time — pre-baked images, fast start-up, readiness checks that wait for warm caches — and protect dependencies: cap the maximum fleet by what the database and downstream services can take, and have load shedding and degradation ready for spikes faster than any scaler." }
        ] },

      { level: "core",
        q: "How do you run a meaningful load test?",
        strong: "A strong answer covers arrival models, data realism, duration, metrics, and the number it produces.",
        answer: [
          { t: "p", text: "Define the question first — expected load, limits, spikes or leaks — and the SLO. Use an open-loop, constant-arrival-rate generator so stalls are not hidden; production-like data volume and distributions; a realistic mix of endpoints including writes; warm-up; and enough duration for steady state." },
          { t: "p", text: "Measure percentiles, errors and throughput from the client side, and resource use on the service and its dependencies. Step the load to find capacity at the SLO rather than the saturation point, compare with a baseline, and automate it so regressions are caught per change." }
        ] },

      { level: "advanced",
        q: "Why might adding instances during an incident make things worse?",
        strong: "A strong answer names shared dependencies, connection storms and cold starts.",
        answer: [
          { t: "p", text: "Because the bottleneck is often a shared dependency, not the stateless tier. New instances each open connection pools to the database, so fifty new instances can add a thousand connections and push the database past its efficient concurrency; they also start with cold caches, sending more traffic to the database, and may retry failed work." },
          { t: "p", text: "The fix is to cap scale by downstream capacity, use a connection pooler, warm caches before taking traffic, and shed load or degrade features while the real bottleneck is addressed." }
        ] }
    ]
  }
});
