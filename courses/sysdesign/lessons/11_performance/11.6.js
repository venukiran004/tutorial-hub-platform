/* ============================================================================
   LESSON 11.6 — Chaos Engineering and Cost
   ========================================================================= */
EC.receiveLesson({
  id: "11.6",

  lede: "Two disciplines close this module, and they pull against each other. **Chaos engineering** spends effort and a little risk to find out whether the resilience you designed actually works — by injecting a failure on purpose, with a hypothesis, a measured steady state and a stop button. **Cost engineering** removes spend that does not buy reliability or speed, without removing the spend that does. Both reward the same habit: measure first. Here a chaos experiment disproves a plausible design three times before a fourth version passes, and a cost model shows where the large savings are — and which \"saving\" is really a bet against your own peak.",

  objectives: [
    "Run a chaos experiment: steady state, hypothesis, injected fault, blast radius and a stop button",
    "Explain why a stop button limits damage but does not erase it",
    "Show that timeouts alone may not survive a slow dependency, and what a circuit breaker adds",
    "Combine on-demand, reserved and spot capacity for a realistic workload",
    "Find savings — right-sizing, scheduling, deleting — with guardrails that protect reliability"
  ],

  prerequisites: ["11.5", "7.1", "7.2"],

  blocks: [

    { t: "h2", n: "01", id: "chaos", text: "Chaos engineering",
      sub: "An experiment, not random breakage" },

    { t: "diagram", kind: "cycle", title: "The chaos experiment loop",
      caption: "From Netflix's Principles of Chaos Engineering. The output of an experiment is not an outage but a confirmed or disproved hypothesis — and when it is disproved, a weakness found on your schedule rather than at 3 a.m. Start in staging, with small blast radii, and graduate to production once the stop button and the observability are trusted.",
      centre: "small blast radius, a stop button",
      nodes: [
        { label: "Steady state", sub: "the SLIs that mean normal", tone: "good", edge: "assume it holds" },
        { label: "Hypothesis", sub: "it holds when X fails", tone: "accent", edge: "inject X" },
        { label: "Inject the fault", sub: "kill, slow, partition", tone: "warn", edge: "watch the SLIs" },
        { label: "Observe", sub: "held? or disproved?", tone: "violet", edge: "fix what broke" }
      ] },

    { t: "p", text: "A checkout service has 20 worker threads, serves 400 requests a second, and calls a recommendations service on every request. The hypothesis: **if recommendations becomes slow (~800 ms), checkout keeps 99.9% success and a p99 under 300 ms**, because recommendations is optional. Four versions of the design face the same fault:" },

    { t: "code", lang: "python", title: "chaos.py — one hypothesis, one fault, four designs", code: `import heapq, random

def run(timeout_ms=None, breaker=False, abort_below=None, seconds=60, fault=(20, 60), rate=400, threads=20, seed=3):
    """A checkout service: 20 worker threads, 400 req/s. Each request does 5 ms of work and calls
    recommendations (normally ~10 ms). During the fault, recommendations take 600-1,000 ms.
    Clients give up after 1 s. Returns per-second (success rate, p99) and when the experiment was aborted."""
    rng = random.Random(seed); free = [0.0] * threads
    t, per_sec, aborted = 0.0, {}, None
    timeouts_in_a_row, open_until = 0, -1.0
    while t < seconds * 1000:
        t += rng.expovariate(rate / 1000)
        sec = int(t // 1000)
        faulty = fault[0] <= sec < fault[1] and aborted is None
        start = max(t, heapq.heappop(free))
        if breaker and start < open_until:
            dep = 0                                                         # breaker open: fallback at once
        else:
            dep = rng.uniform(600, 1000) if faulty else rng.uniform(5, 15)
            if timeout_ms is not None and dep > timeout_ms:
                dep = timeout_ms; timeouts_in_a_row += 1                    # timed out: fallback
                if breaker and timeouts_in_a_row >= 10: open_until = start + 5000   # trip for 5 s (7.2)
            else: timeouts_in_a_row = 0
        end = start + 5 + dep
        heapq.heappush(free, end)
        per_sec.setdefault(sec, []).append(end - t if end - t <= 1000 else None)
        if abort_below and aborted is None and sec >= 1:                    # the stop button watches the SLI
            prev = per_sec.get(sec - 1, [])
            if prev and sum(x is not None for x in prev) / len(prev) < abort_below: aborted = sec
    def stats(xs):
        good = sorted(x for x in xs if x is not None)
        return len(good) / len(xs), (good[int(len(good) * 0.99)] if good else 1000.0)
    return [stats(per_sec[s]) for s in range(seconds)], aborted

if __name__ == "__main__":
    print("hypothesis: if recommendations slows to ~800 ms, checkout keeps 99.9% success and p99 under 300 ms\\n")
    for label, kw in (("no timeout", {}),
                      ("no timeout, abort if success < 99%", {"abort_below": 0.99}),
                      ("80 ms timeout + fallback", {"timeout_ms": 80, "abort_below": 0.99}),
                      ("80 ms timeout + circuit breaker", {"timeout_ms": 80, "breaker": True, "abort_below": 0.99})):
        secs, aborted = run(**kw)
        worst_ok = min(s[0] for s in secs[20:]); worst_p99 = max(s[1] for s in secs[20:])
        failed = sum(1 - s[0] for s in secs) * 400
        verdict = "holds" if worst_ok >= 0.999 and worst_p99 <= 300 else "disproved"
        print(f"{label:<36} worst second {worst_ok:6.1%} ok, p99 {worst_p99:5.0f} ms, ~{failed:>6,.0f} failed:"
              f" {verdict}{f' (aborted at t = {aborted} s)' if aborted else ''}")`,
      hl: [15, 19, 21, 26, 28],
      out: `hypothesis: if recommendations slows to ~800 ms, checkout keeps 99.9% success and p99 under 300 ms

no timeout                           worst second   0.0% ok, p99  1000 ms, ~15,981 failed: disproved
no timeout, abort if success < 99%   worst second   0.0% ok, p99  1000 ms, ~ 8,794 failed: disproved (aborted at t = 21 s)
80 ms timeout + fallback             worst second  26.2% ok, p99   999 ms, ~   568 failed: disproved (aborted at t = 22 s)
80 ms timeout + circuit breaker      worst second 100.0% ok, p99    85 ms, ~     0 failed: holds` },

    { t: "viz", title: "Checkout success, second by second, during the experiment",
      caption: "With no timeout, every worker thread soon waits on the slow dependency and checkout fails completely for the rest of the run. The stop button ends the fault at 21 s, but the queue built up in that one second takes about twenty seconds to drain, so failures continue long after the fault is gone. With an 80 ms timeout and a circuit breaker, checkout never notices: after ten timeouts the breaker opens and requests skip recommendations entirely.",
      svg: `<svg viewBox="0 0 760 260" width="100%" role="img">
<line x1="64" y1="214.0" x2="610" y2="214.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="218.0" text-anchor="end" class="s-sub">0%</text>
<line x1="64" y1="165.0" x2="610" y2="165.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="169.0" text-anchor="end" class="s-sub">25%</text>
<line x1="64" y1="116.0" x2="610" y2="116.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="120.0" text-anchor="end" class="s-sub">50%</text>
<line x1="64" y1="67.0" x2="610" y2="67.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="71.0" text-anchor="end" class="s-sub">75%</text>
<line x1="64" y1="18.0" x2="610" y2="18.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="22.0" text-anchor="end" class="s-sub">100%</text>
<text x="64.0" y="232" text-anchor="middle" class="s-sub">10</text>
<text x="75.1" y="232" text-anchor="middle" class="s-sub"></text>
<text x="86.3" y="232" text-anchor="middle" class="s-sub"></text>
<text x="97.4" y="232" text-anchor="middle" class="s-sub"></text>
<text x="108.6" y="232" text-anchor="middle" class="s-sub"></text>
<text x="119.7" y="232" text-anchor="middle" class="s-sub">15</text>
<text x="130.9" y="232" text-anchor="middle" class="s-sub"></text>
<text x="142.0" y="232" text-anchor="middle" class="s-sub"></text>
<text x="153.1" y="232" text-anchor="middle" class="s-sub"></text>
<text x="164.3" y="232" text-anchor="middle" class="s-sub"></text>
<text x="175.4" y="232" text-anchor="middle" class="s-sub">20</text>
<text x="186.6" y="232" text-anchor="middle" class="s-sub"></text>
<text x="197.7" y="232" text-anchor="middle" class="s-sub"></text>
<text x="208.9" y="232" text-anchor="middle" class="s-sub"></text>
<text x="220.0" y="232" text-anchor="middle" class="s-sub"></text>
<text x="231.1" y="232" text-anchor="middle" class="s-sub">25</text>
<text x="242.3" y="232" text-anchor="middle" class="s-sub"></text>
<text x="253.4" y="232" text-anchor="middle" class="s-sub"></text>
<text x="264.6" y="232" text-anchor="middle" class="s-sub"></text>
<text x="275.7" y="232" text-anchor="middle" class="s-sub"></text>
<text x="286.9" y="232" text-anchor="middle" class="s-sub">30</text>
<text x="298.0" y="232" text-anchor="middle" class="s-sub"></text>
<text x="309.1" y="232" text-anchor="middle" class="s-sub"></text>
<text x="320.3" y="232" text-anchor="middle" class="s-sub"></text>
<text x="331.4" y="232" text-anchor="middle" class="s-sub"></text>
<text x="342.6" y="232" text-anchor="middle" class="s-sub">35</text>
<text x="353.7" y="232" text-anchor="middle" class="s-sub"></text>
<text x="364.9" y="232" text-anchor="middle" class="s-sub"></text>
<text x="376.0" y="232" text-anchor="middle" class="s-sub"></text>
<text x="387.1" y="232" text-anchor="middle" class="s-sub"></text>
<text x="398.3" y="232" text-anchor="middle" class="s-sub">40</text>
<text x="409.4" y="232" text-anchor="middle" class="s-sub"></text>
<text x="420.6" y="232" text-anchor="middle" class="s-sub"></text>
<text x="431.7" y="232" text-anchor="middle" class="s-sub"></text>
<text x="442.9" y="232" text-anchor="middle" class="s-sub"></text>
<text x="454.0" y="232" text-anchor="middle" class="s-sub">45</text>
<text x="465.1" y="232" text-anchor="middle" class="s-sub"></text>
<text x="476.3" y="232" text-anchor="middle" class="s-sub"></text>
<text x="487.4" y="232" text-anchor="middle" class="s-sub"></text>
<text x="498.6" y="232" text-anchor="middle" class="s-sub"></text>
<text x="509.7" y="232" text-anchor="middle" class="s-sub">50</text>
<text x="520.9" y="232" text-anchor="middle" class="s-sub"></text>
<text x="532.0" y="232" text-anchor="middle" class="s-sub"></text>
<text x="543.1" y="232" text-anchor="middle" class="s-sub"></text>
<text x="554.3" y="232" text-anchor="middle" class="s-sub"></text>
<text x="565.4" y="232" text-anchor="middle" class="s-sub">55</text>
<text x="576.6" y="232" text-anchor="middle" class="s-sub"></text>
<text x="587.7" y="232" text-anchor="middle" class="s-sub"></text>
<text x="598.9" y="232" text-anchor="middle" class="s-sub"></text>
<text x="610.0" y="232" text-anchor="middle" class="s-sub"></text>
<text x="337.0" y="254" text-anchor="middle" class="s-sub">seconds; the fault starts at t = 20 s</text>
<text x="14" y="116.0" text-anchor="middle" class="s-sub" transform="rotate(-90 14 116.0)">requests succeeding, per second</text>
<polyline points="64.0,18.0 75.1,18.0 86.3,18.0 97.4,18.0 108.6,18.0 119.7,18.0 130.9,18.0 142.0,18.0 153.1,18.0 164.3,18.0 175.4,204.6 186.6,214.0 197.7,214.0 208.9,214.0 220.0,214.0 231.1,214.0 242.3,214.0 253.4,214.0 264.6,214.0 275.7,214.0 286.9,214.0 298.0,214.0 309.1,214.0 320.3,214.0 331.4,214.0 342.6,214.0 353.7,214.0 364.9,214.0 376.0,214.0 387.1,214.0 398.3,214.0 409.4,214.0 420.6,214.0 431.7,214.0 442.9,214.0 454.0,214.0 465.1,214.0 476.3,214.0 487.4,214.0 498.6,214.0 509.7,214.0 520.9,214.0 532.0,214.0 543.1,214.0 554.3,214.0 565.4,214.0 576.6,214.0 587.7,214.0 598.9,214.0 610.0,214.0" style="fill:none;stroke:var(--crit)" stroke-width="2.2"/>
<circle cx="64.0" cy="18.0" r="1.8" style="fill:var(--crit)"/>
<circle cx="75.1" cy="18.0" r="1.8" style="fill:var(--crit)"/>
<circle cx="86.3" cy="18.0" r="1.8" style="fill:var(--crit)"/>
<circle cx="97.4" cy="18.0" r="1.8" style="fill:var(--crit)"/>
<circle cx="108.6" cy="18.0" r="1.8" style="fill:var(--crit)"/>
<circle cx="119.7" cy="18.0" r="1.8" style="fill:var(--crit)"/>
<circle cx="130.9" cy="18.0" r="1.8" style="fill:var(--crit)"/>
<circle cx="142.0" cy="18.0" r="1.8" style="fill:var(--crit)"/>
<circle cx="153.1" cy="18.0" r="1.8" style="fill:var(--crit)"/>
<circle cx="164.3" cy="18.0" r="1.8" style="fill:var(--crit)"/>
<circle cx="175.4" cy="204.6" r="1.8" style="fill:var(--crit)"/>
<circle cx="186.6" cy="214.0" r="1.8" style="fill:var(--crit)"/>
<circle cx="197.7" cy="214.0" r="1.8" style="fill:var(--crit)"/>
<circle cx="208.9" cy="214.0" r="1.8" style="fill:var(--crit)"/>
<circle cx="220.0" cy="214.0" r="1.8" style="fill:var(--crit)"/>
<circle cx="231.1" cy="214.0" r="1.8" style="fill:var(--crit)"/>
<circle cx="242.3" cy="214.0" r="1.8" style="fill:var(--crit)"/>
<circle cx="253.4" cy="214.0" r="1.8" style="fill:var(--crit)"/>
<circle cx="264.6" cy="214.0" r="1.8" style="fill:var(--crit)"/>
<circle cx="275.7" cy="214.0" r="1.8" style="fill:var(--crit)"/>
<circle cx="286.9" cy="214.0" r="1.8" style="fill:var(--crit)"/>
<circle cx="298.0" cy="214.0" r="1.8" style="fill:var(--crit)"/>
<circle cx="309.1" cy="214.0" r="1.8" style="fill:var(--crit)"/>
<circle cx="320.3" cy="214.0" r="1.8" style="fill:var(--crit)"/>
<circle cx="331.4" cy="214.0" r="1.8" style="fill:var(--crit)"/>
<circle cx="342.6" cy="214.0" r="1.8" style="fill:var(--crit)"/>
<circle cx="353.7" cy="214.0" r="1.8" style="fill:var(--crit)"/>
<circle cx="364.9" cy="214.0" r="1.8" style="fill:var(--crit)"/>
<circle cx="376.0" cy="214.0" r="1.8" style="fill:var(--crit)"/>
<circle cx="387.1" cy="214.0" r="1.8" style="fill:var(--crit)"/>
<circle cx="398.3" cy="214.0" r="1.8" style="fill:var(--crit)"/>
<circle cx="409.4" cy="214.0" r="1.8" style="fill:var(--crit)"/>
<circle cx="420.6" cy="214.0" r="1.8" style="fill:var(--crit)"/>
<circle cx="431.7" cy="214.0" r="1.8" style="fill:var(--crit)"/>
<circle cx="442.9" cy="214.0" r="1.8" style="fill:var(--crit)"/>
<circle cx="454.0" cy="214.0" r="1.8" style="fill:var(--crit)"/>
<circle cx="465.1" cy="214.0" r="1.8" style="fill:var(--crit)"/>
<circle cx="476.3" cy="214.0" r="1.8" style="fill:var(--crit)"/>
<circle cx="487.4" cy="214.0" r="1.8" style="fill:var(--crit)"/>
<circle cx="498.6" cy="214.0" r="1.8" style="fill:var(--crit)"/>
<circle cx="509.7" cy="214.0" r="1.8" style="fill:var(--crit)"/>
<circle cx="520.9" cy="214.0" r="1.8" style="fill:var(--crit)"/>
<circle cx="532.0" cy="214.0" r="1.8" style="fill:var(--crit)"/>
<circle cx="543.1" cy="214.0" r="1.8" style="fill:var(--crit)"/>
<circle cx="554.3" cy="214.0" r="1.8" style="fill:var(--crit)"/>
<circle cx="565.4" cy="214.0" r="1.8" style="fill:var(--crit)"/>
<circle cx="576.6" cy="214.0" r="1.8" style="fill:var(--crit)"/>
<circle cx="587.7" cy="214.0" r="1.8" style="fill:var(--crit)"/>
<circle cx="598.9" cy="214.0" r="1.8" style="fill:var(--crit)"/>
<circle cx="610.0" cy="214.0" r="1.8" style="fill:var(--crit)"/>
<line x1="626" y1="28" x2="644" y2="28" style="stroke:var(--crit)" stroke-width="2.4"/>
<text x="650" y="32" class="s-sub" style="fill:var(--ink-2)">no timeout</text>
<polyline points="64.0,18.0 75.1,18.0 86.3,18.0 97.4,18.0 108.6,18.0 119.7,18.0 130.9,18.0 142.0,18.0 153.1,18.0 164.3,18.0 175.4,204.6 186.6,214.0 197.7,214.0 208.9,214.0 220.0,214.0 231.1,214.0 242.3,214.0 253.4,214.0 264.6,214.0 275.7,214.0 286.9,214.0 298.0,214.0 309.1,214.0 320.3,214.0 331.4,214.0 342.6,214.0 353.7,214.0 364.9,214.0 376.0,214.0 387.1,214.0 398.3,214.0 409.4,214.0 420.6,24.6 431.7,18.0 442.9,18.0 454.0,18.0 465.1,18.0 476.3,18.0 487.4,18.0 498.6,18.0 509.7,18.0 520.9,18.0 532.0,18.0 543.1,18.0 554.3,18.0 565.4,18.0 576.6,18.0 587.7,18.0 598.9,18.0 610.0,18.0" style="fill:none;stroke:var(--warn)" stroke-width="2.2"/>
<circle cx="64.0" cy="18.0" r="1.8" style="fill:var(--warn)"/>
<circle cx="75.1" cy="18.0" r="1.8" style="fill:var(--warn)"/>
<circle cx="86.3" cy="18.0" r="1.8" style="fill:var(--warn)"/>
<circle cx="97.4" cy="18.0" r="1.8" style="fill:var(--warn)"/>
<circle cx="108.6" cy="18.0" r="1.8" style="fill:var(--warn)"/>
<circle cx="119.7" cy="18.0" r="1.8" style="fill:var(--warn)"/>
<circle cx="130.9" cy="18.0" r="1.8" style="fill:var(--warn)"/>
<circle cx="142.0" cy="18.0" r="1.8" style="fill:var(--warn)"/>
<circle cx="153.1" cy="18.0" r="1.8" style="fill:var(--warn)"/>
<circle cx="164.3" cy="18.0" r="1.8" style="fill:var(--warn)"/>
<circle cx="175.4" cy="204.6" r="1.8" style="fill:var(--warn)"/>
<circle cx="186.6" cy="214.0" r="1.8" style="fill:var(--warn)"/>
<circle cx="197.7" cy="214.0" r="1.8" style="fill:var(--warn)"/>
<circle cx="208.9" cy="214.0" r="1.8" style="fill:var(--warn)"/>
<circle cx="220.0" cy="214.0" r="1.8" style="fill:var(--warn)"/>
<circle cx="231.1" cy="214.0" r="1.8" style="fill:var(--warn)"/>
<circle cx="242.3" cy="214.0" r="1.8" style="fill:var(--warn)"/>
<circle cx="253.4" cy="214.0" r="1.8" style="fill:var(--warn)"/>
<circle cx="264.6" cy="214.0" r="1.8" style="fill:var(--warn)"/>
<circle cx="275.7" cy="214.0" r="1.8" style="fill:var(--warn)"/>
<circle cx="286.9" cy="214.0" r="1.8" style="fill:var(--warn)"/>
<circle cx="298.0" cy="214.0" r="1.8" style="fill:var(--warn)"/>
<circle cx="309.1" cy="214.0" r="1.8" style="fill:var(--warn)"/>
<circle cx="320.3" cy="214.0" r="1.8" style="fill:var(--warn)"/>
<circle cx="331.4" cy="214.0" r="1.8" style="fill:var(--warn)"/>
<circle cx="342.6" cy="214.0" r="1.8" style="fill:var(--warn)"/>
<circle cx="353.7" cy="214.0" r="1.8" style="fill:var(--warn)"/>
<circle cx="364.9" cy="214.0" r="1.8" style="fill:var(--warn)"/>
<circle cx="376.0" cy="214.0" r="1.8" style="fill:var(--warn)"/>
<circle cx="387.1" cy="214.0" r="1.8" style="fill:var(--warn)"/>
<circle cx="398.3" cy="214.0" r="1.8" style="fill:var(--warn)"/>
<circle cx="409.4" cy="214.0" r="1.8" style="fill:var(--warn)"/>
<circle cx="420.6" cy="24.6" r="1.8" style="fill:var(--warn)"/>
<circle cx="431.7" cy="18.0" r="1.8" style="fill:var(--warn)"/>
<circle cx="442.9" cy="18.0" r="1.8" style="fill:var(--warn)"/>
<circle cx="454.0" cy="18.0" r="1.8" style="fill:var(--warn)"/>
<circle cx="465.1" cy="18.0" r="1.8" style="fill:var(--warn)"/>
<circle cx="476.3" cy="18.0" r="1.8" style="fill:var(--warn)"/>
<circle cx="487.4" cy="18.0" r="1.8" style="fill:var(--warn)"/>
<circle cx="498.6" cy="18.0" r="1.8" style="fill:var(--warn)"/>
<circle cx="509.7" cy="18.0" r="1.8" style="fill:var(--warn)"/>
<circle cx="520.9" cy="18.0" r="1.8" style="fill:var(--warn)"/>
<circle cx="532.0" cy="18.0" r="1.8" style="fill:var(--warn)"/>
<circle cx="543.1" cy="18.0" r="1.8" style="fill:var(--warn)"/>
<circle cx="554.3" cy="18.0" r="1.8" style="fill:var(--warn)"/>
<circle cx="565.4" cy="18.0" r="1.8" style="fill:var(--warn)"/>
<circle cx="576.6" cy="18.0" r="1.8" style="fill:var(--warn)"/>
<circle cx="587.7" cy="18.0" r="1.8" style="fill:var(--warn)"/>
<circle cx="598.9" cy="18.0" r="1.8" style="fill:var(--warn)"/>
<circle cx="610.0" cy="18.0" r="1.8" style="fill:var(--warn)"/>
<line x1="626" y1="50" x2="644" y2="50" style="stroke:var(--warn)" stroke-width="2.4"/>
<text x="650" y="54" class="s-sub" style="fill:var(--ink-2)">stop button only</text>
<polyline points="64.0,18.0 75.1,18.0 86.3,18.0 97.4,18.0 108.6,18.0 119.7,18.0 130.9,18.0 142.0,18.0 153.1,18.0 164.3,18.0 175.4,18.0 186.6,18.0 197.7,18.0 208.9,18.0 220.0,18.0 231.1,18.0 242.3,18.0 253.4,18.0 264.6,18.0 275.7,18.0 286.9,18.0 298.0,18.0 309.1,18.0 320.3,18.0 331.4,18.0 342.6,18.0 353.7,18.0 364.9,18.0 376.0,18.0 387.1,18.0 398.3,18.0 409.4,18.0 420.6,18.0 431.7,18.0 442.9,18.0 454.0,18.0 465.1,18.0 476.3,18.0 487.4,18.0 498.6,18.0 509.7,18.0 520.9,18.0 532.0,18.0 543.1,18.0 554.3,18.0 565.4,18.0 576.6,18.0 587.7,18.0 598.9,18.0 610.0,18.0" style="fill:none;stroke:var(--good)" stroke-width="2.2"/>
<circle cx="64.0" cy="18.0" r="1.8" style="fill:var(--good)"/>
<circle cx="75.1" cy="18.0" r="1.8" style="fill:var(--good)"/>
<circle cx="86.3" cy="18.0" r="1.8" style="fill:var(--good)"/>
<circle cx="97.4" cy="18.0" r="1.8" style="fill:var(--good)"/>
<circle cx="108.6" cy="18.0" r="1.8" style="fill:var(--good)"/>
<circle cx="119.7" cy="18.0" r="1.8" style="fill:var(--good)"/>
<circle cx="130.9" cy="18.0" r="1.8" style="fill:var(--good)"/>
<circle cx="142.0" cy="18.0" r="1.8" style="fill:var(--good)"/>
<circle cx="153.1" cy="18.0" r="1.8" style="fill:var(--good)"/>
<circle cx="164.3" cy="18.0" r="1.8" style="fill:var(--good)"/>
<circle cx="175.4" cy="18.0" r="1.8" style="fill:var(--good)"/>
<circle cx="186.6" cy="18.0" r="1.8" style="fill:var(--good)"/>
<circle cx="197.7" cy="18.0" r="1.8" style="fill:var(--good)"/>
<circle cx="208.9" cy="18.0" r="1.8" style="fill:var(--good)"/>
<circle cx="220.0" cy="18.0" r="1.8" style="fill:var(--good)"/>
<circle cx="231.1" cy="18.0" r="1.8" style="fill:var(--good)"/>
<circle cx="242.3" cy="18.0" r="1.8" style="fill:var(--good)"/>
<circle cx="253.4" cy="18.0" r="1.8" style="fill:var(--good)"/>
<circle cx="264.6" cy="18.0" r="1.8" style="fill:var(--good)"/>
<circle cx="275.7" cy="18.0" r="1.8" style="fill:var(--good)"/>
<circle cx="286.9" cy="18.0" r="1.8" style="fill:var(--good)"/>
<circle cx="298.0" cy="18.0" r="1.8" style="fill:var(--good)"/>
<circle cx="309.1" cy="18.0" r="1.8" style="fill:var(--good)"/>
<circle cx="320.3" cy="18.0" r="1.8" style="fill:var(--good)"/>
<circle cx="331.4" cy="18.0" r="1.8" style="fill:var(--good)"/>
<circle cx="342.6" cy="18.0" r="1.8" style="fill:var(--good)"/>
<circle cx="353.7" cy="18.0" r="1.8" style="fill:var(--good)"/>
<circle cx="364.9" cy="18.0" r="1.8" style="fill:var(--good)"/>
<circle cx="376.0" cy="18.0" r="1.8" style="fill:var(--good)"/>
<circle cx="387.1" cy="18.0" r="1.8" style="fill:var(--good)"/>
<circle cx="398.3" cy="18.0" r="1.8" style="fill:var(--good)"/>
<circle cx="409.4" cy="18.0" r="1.8" style="fill:var(--good)"/>
<circle cx="420.6" cy="18.0" r="1.8" style="fill:var(--good)"/>
<circle cx="431.7" cy="18.0" r="1.8" style="fill:var(--good)"/>
<circle cx="442.9" cy="18.0" r="1.8" style="fill:var(--good)"/>
<circle cx="454.0" cy="18.0" r="1.8" style="fill:var(--good)"/>
<circle cx="465.1" cy="18.0" r="1.8" style="fill:var(--good)"/>
<circle cx="476.3" cy="18.0" r="1.8" style="fill:var(--good)"/>
<circle cx="487.4" cy="18.0" r="1.8" style="fill:var(--good)"/>
<circle cx="498.6" cy="18.0" r="1.8" style="fill:var(--good)"/>
<circle cx="509.7" cy="18.0" r="1.8" style="fill:var(--good)"/>
<circle cx="520.9" cy="18.0" r="1.8" style="fill:var(--good)"/>
<circle cx="532.0" cy="18.0" r="1.8" style="fill:var(--good)"/>
<circle cx="543.1" cy="18.0" r="1.8" style="fill:var(--good)"/>
<circle cx="554.3" cy="18.0" r="1.8" style="fill:var(--good)"/>
<circle cx="565.4" cy="18.0" r="1.8" style="fill:var(--good)"/>
<circle cx="576.6" cy="18.0" r="1.8" style="fill:var(--good)"/>
<circle cx="587.7" cy="18.0" r="1.8" style="fill:var(--good)"/>
<circle cx="598.9" cy="18.0" r="1.8" style="fill:var(--good)"/>
<circle cx="610.0" cy="18.0" r="1.8" style="fill:var(--good)"/>
<line x1="626" y1="72" x2="644" y2="72" style="stroke:var(--good)" stroke-width="2.4"/>
<text x="650" y="76" class="s-sub" style="fill:var(--ink-2)">timeout + breaker</text>
</svg>` },

    { t: "p", text: "The hypothesis was disproved three times, and each failure taught something specific. **No timeout**: one slow optional dependency took down a critical path, because waiting threads are a shared resource (7.2's bulkheads). **The stop button**: it limited the failure to about 8,800 requests instead of 16,000, but did not prevent it, because queued work outlives the fault — so the stop condition must be tight and the blast radius small. **A timeout alone**: 80 ms of waiting per request still exceeded the pool's capacity (11.2's Little's law: 20 threads ÷ 85 ms ≈ 235 req/s, against 400 arriving). Only **timeout plus circuit breaker** — stop calling a dependency that keeps timing out — held the steady state." },

    { t: "table", head: ["Fault to inject", "What it tests", "Tools"], rows: [
      ["Kill instances or pods", "self-healing, load balancer health checks, autoscaling", "Chaos Monkey, kubectl, AWS FIS"],
      ["Add latency to a dependency", "timeouts, circuit breakers, bulkheads, fallbacks", "Toxiproxy, tc netem, service mesh fault injection"],
      ["Drop or partition traffic", "retries, split brain, quorum behaviour (8.5)", "tc, iptables, Chaos Mesh"],
      ["Fail a zone or region", "failover and capacity in the survivors (7.5)", "AWS FIS, game days"],
      ["Fill a disk, exhaust memory", "alerts, back-pressure, log rotation", "stress-ng, Litmus"],
      ["Skew a clock", "leases, tokens, ordering (8.2, 8.4)", "libfaketime, chrony manipulation"]
    ] },

    { t: "callout", kind: "trap", title: "Chaos without observability is just an outage",
      body: [
        { t: "p", text: "An experiment needs an SLI-based steady state (11.5) visible in real time, an automatic stop condition, a small and known blast radius — one instance, one cell (10.6), a percentage of traffic — and people ready to act. Without those, injecting faults in production is not engineering. Game days, where a team rehearses a failure together with everything watched, are a good way to start." }
      ] },

    { t: "h2", n: "02", id: "cost", text: "Cost engineering",
      sub: "Spend that buys nothing, and spend that buys reliability" },

    { t: "p", text: "Cloud bills are dominated by a few decisions: how capacity is **purchased**, how well it is **sized**, whether it runs when **nobody needs it**, how data is **stored**, and how much crosses **zone and region boundaries**. A workload of 20 always-on instances, 30 more for a ten-hour daily peak, and 3,000 instance-hours a month of batch jobs, priced with illustrative ratios — reserved capacity about 40% cheaper than on-demand, spot about 70% cheaper but reclaimable at short notice:" },

    { t: "code", lang: "python", title: "cost.py — one workload, five ways to buy it", code: `HOURS = 730                                        # hours in a month
ON_DEMAND = 0.20                                   # $ per instance-hour, illustrative
RESERVED = ON_DEMAND * 0.60                        # a 1-year commitment: ~40% off, paid whether used or not
SPOT = ON_DEMAND * 0.30                            # spare capacity: ~70% off, can be reclaimed at short notice

# The workload: 20 instances around the clock, 30 more for a 10-hour daily peak, 3,000 batch instance-hours a month
base, peak, peak_hours, batch = 20, 30, 10 * 30, 3000

plans = {
    "everything on demand, sized for peak":     {"on_demand": (base + peak) * HOURS + batch},
    "on demand, autoscaled to the peak":        {"on_demand": base * HOURS + peak * peak_hours + batch},
    "+ reserve the always-on baseline":         {"reserved": base * HOURS, "on_demand": peak * peak_hours + batch},
    "+ batch jobs on spot":                     {"reserved": base * HOURS, "on_demand": peak * peak_hours, "spot": batch},
    "reserve for the peak too (over-commit)":   {"reserved": (base + peak) * HOURS, "spot": batch},
}
price = {"on_demand": ON_DEMAND, "reserved": RESERVED, "spot": SPOT}
first = None
for name, hours in plans.items():
    cost = sum(h * price[k] for k, h in hours.items())
    first = first or cost
    mix = ", ".join(f"{k.replace('_', '-')} {h:,.0f} h" for k, h in hours.items())
    print(f"{name:<40} \${cost:>8,.0f}/month  {cost / first:>4.0%}   [{mix}]")`,
      out: `everything on demand, sized for peak     $   7,900/month  100%   [on-demand 39,500 h]
on demand, autoscaled to the peak        $   5,320/month   67%   [on-demand 26,600 h]
+ reserve the always-on baseline         $   4,152/month   53%   [reserved 14,600 h, on-demand 12,000 h]
+ batch jobs on spot                     $   3,732/month   47%   [reserved 14,600 h, on-demand 9,000 h, spot 3,000 h]
reserve for the peak too (over-commit)   $   4,560/month   58%   [reserved 36,500 h, spot 3,000 h]` },

    { t: "viz", title: "Monthly cost by purchasing strategy",
      caption: "Autoscaling instead of sizing for the peak saved a third. Reserving only the always-on baseline, and putting interruptible batch work on spot, brought the bill to 47% of the starting point. Reserving for the peak as well cost more than that, because reserved hours are paid whether used or not: 30 peak instances reserved around the clock are idle fourteen hours a day.",
      svg: `<svg viewBox="0 0 760 246" width="100%" role="img" aria-label="Monthly cost by purchasing strategy">
<text x="190" y="35" text-anchor="end" class="s-label">on demand, sized for peak</text>
<rect x="200.0" y="16" width="483.9" height="28" rx="4" style="fill:var(--accent);fill-opacity:.35;stroke:var(--accent)"/>
<text x="691.9" y="35" class="s-mono">$7,900</text>
<text x="190" y="75" text-anchor="end" class="s-label">on demand, autoscaled</text>
<rect x="200.0" y="56" width="325.8" height="28" rx="4" style="fill:var(--accent);fill-opacity:.35;stroke:var(--accent)"/>
<text x="533.8" y="75" class="s-mono">$5,320</text>
<text x="190" y="115" text-anchor="end" class="s-label">+ reserved baseline</text>
<rect x="200.0" y="96" width="107.3" height="28" rx="4" style="fill:var(--good);fill-opacity:.35;stroke:var(--good)"/>
<rect x="307.3" y="96" width="147.0" height="28" rx="4" style="fill:var(--accent);fill-opacity:.35;stroke:var(--accent)"/>
<text x="462.3" y="115" class="s-mono">$4,152</text>
<text x="190" y="155" text-anchor="end" class="s-label">+ spot for batch</text>
<rect x="200.0" y="136" width="107.3" height="28" rx="4" style="fill:var(--good);fill-opacity:.35;stroke:var(--good)"/>
<rect x="307.3" y="136" width="110.2" height="28" rx="4" style="fill:var(--accent);fill-opacity:.35;stroke:var(--accent)"/>
<rect x="417.6" y="136" width="11.0" height="28" rx="4" style="fill:var(--violet);fill-opacity:.35;stroke:var(--violet)"/>
<text x="436.6" y="155" class="s-mono">$3,732</text>
<text x="190" y="195" text-anchor="end" class="s-label">reserve for peak too</text>
<rect x="200.0" y="176" width="268.3" height="28" rx="4" style="fill:var(--good);fill-opacity:.35;stroke:var(--good)"/>
<rect x="468.3" y="176" width="11.0" height="28" rx="4" style="fill:var(--violet);fill-opacity:.35;stroke:var(--violet)"/>
<text x="487.3" y="195" class="s-mono">$4,560</text>
<rect x="200" y="222" width="14" height="14" rx="3" style="fill:var(--accent);fill-opacity:.35;stroke:var(--accent)"/><text x="220" y="233" class="s-sub">on-demand</text>
<rect x="320" y="222" width="14" height="14" rx="3" style="fill:var(--good);fill-opacity:.35;stroke:var(--good)"/><text x="340" y="233" class="s-sub">reserved</text>
<rect x="440" y="222" width="14" height="14" rx="3" style="fill:var(--violet);fill-opacity:.35;stroke:var(--violet)"/><text x="460" y="233" class="s-sub">spot</text>
</svg>` },

    { t: "diagram", kind: "matrix", title: "Cost levers and their reliability risk",
      cols: ["Typical saving", "Reliability risk", "Guardrail"],
      rows: ["Autoscale, not peak-size", "Reserve the baseline", "Spot for batch work", "Right-size", "Schedule non-production", "Storage tiering", "Keep traffic in-zone"],
      cells: [
        [{ text: "large", tone: "good" }, { text: "scaling lag (11.4)", tone: "warn" }, { text: "minimum fleet, schedules" }],
        [{ text: "30–60% on it", tone: "good" }, { text: "none", tone: "good" }, { text: "reserve only the floor" }],
        [{ text: "60–90% on it", tone: "good" }, { text: "reclaimed instances", tone: "crit" }, { text: "only stateless, retryable" }],
        [{ text: "often 30–50%", tone: "good" }, { text: "less headroom", tone: "warn" }, { text: "keep p95 below ~60%" }],
        [{ text: "~70% off-hours", tone: "good" }, { text: "none in production", tone: "good" }, { text: "never prod" }],
        [{ text: "large for old data", tone: "good" }, { text: "slow retrieval", tone: "warn" }, { text: "tier by access age" }],
        [{ text: "per-GB transfer", tone: "accent" }, { text: "zone-failure exposure", tone: "warn" }, { text: "keep zones redundant" }]
      ] },

    { t: "callout", kind: "tradeoff", title: "The savings not to take",
      body: [
        { t: "p", text: "Cutting a second availability zone, running production at 90% utilisation, putting a database on spot instances, reserving so much capacity that autoscaling cannot add any more, or dropping retention on the logs you need for incidents — each lowers the bill and raises the expected cost of the next incident. Write the reasoning down (10.6's ADRs), and measure cost per request or per customer rather than total spend, so growth does not look like waste." }
      ] },

    { t: "callout", kind: "insight", title: "Make cost visible to the people who create it",
      body: [
        { t: "p", text: "Tag every resource with team, service and environment; show each team its own cost per unit of work next to its latency and error dashboards; set budgets and anomaly alerts; and review the biggest line items weekly. Most waste is not bad decisions but forgotten ones: a test cluster from last quarter, an unattached disk, a snapshot policy that never deletes." }
      ] },

    { t: "exercise", kind: "Challenge", title: "Right-size a fleet without hurting it",
      difficulty: "core", minutes: 25,
      body: [
        { t: "p", text: "Seven groups of instances, with their size, count, 14-day p95 CPU, traffic and whether they must run outside office hours. Produce a plan: downsize where the p95 would stay under 60% on the smaller size (each size step halves capacity), schedule non-production environments for office hours only, flag groups with no traffic for deletion after confirming with the owner — and leave busy services alone. Report the monthly cost before and after." }
      ],
      requirements: [
        "Downsize step by step only while p95 CPU × 2 ≤ 60%",
        "Office-hours schedule for dev and staging only",
        "Zero-traffic groups are candidates, not automatic deletions",
        "Per-group cost before and after, and the total"
      ],
      hint: "Each step down halves capacity, so it doubles utilisation. Office hours of 12 hours on 22 weekdays is 264 of the month's 730 hours.",
      solution: { lang: "python", title: "rightsize_ex.py",
        code: `SIZES = {"xlarge": 0.40, "large": 0.20, "medium": 0.10, "small": 0.05}      # $ per hour, each half the one above
SMALLER = {"xlarge": "large", "large": "medium", "medium": "small"}
HOURS = 730

FLEET = [  # name, env, size, count, p95 CPU over 14 days, requests in 14 days, needed out of office hours?
    ("checkout-api",     "prod",    "xlarge", 6,  0.71, 9_400_000, True),
    ("search-api",       "prod",    "xlarge", 4,  0.22, 3_100_000, True),
    ("admin-portal",     "prod",    "large",  2,  0.08,    40_000, True),
    ("report-worker",    "prod",    "large",  3,  0.12,   200_000, True),
    ("legacy-export",    "prod",    "medium", 2,  0.01,         0, True),
    ("staging-full",     "staging", "xlarge", 8,  0.15,   300_000, False),
    ("dev-sandboxes",    "dev",     "large",  12, 0.05,    20_000, False),
]

def plan(name, env, size, count, cpu, requests, always_on):
    actions, new_size, hours = [], size, HOURS
    if requests == 0:
        return f"delete candidate: no traffic in 14 days (confirm with the owner first)", 0, None
    # downsize while the p95 would stay under 60% on the smaller size (each step halves capacity)
    while new_size in SMALLER and cpu * 2 <= 0.60:
        new_size, cpu = SMALLER[new_size], cpu * 2
    if new_size != size: actions.append(f"{size} -> {new_size} (p95 then {cpu:.0%})")
    if env == "prod" and count < 2: actions.append("keep 2 instances minimum")
    if not always_on:
        hours = 12 * 22                                                      # weekdays, 12 hours
        actions.append("run office hours only")
    return "; ".join(actions) or "leave as is (busy)", SIZES[new_size] * count * hours, new_size

before = after = 0
for row in FLEET:
    name, env, size, count = row[:4]
    cost_now = SIZES[size] * count * HOURS
    action, cost_new, _ = plan(*row)
    before += cost_now; after += cost_new
    print(f"{name:<14} {env:<8} \${cost_now:>7,.0f} -> \${cost_new:>7,.0f}  {action}")
print(f"\\nmonthly: \${before:,.0f} -> \${after:,.0f}  ({1 - after / before:.0%} less), without touching the busy service")`,
        out: `checkout-api   prod     $  1,752 -> $  1,752  leave as is (busy)
search-api     prod     $  1,168 -> $    584  xlarge -> large (p95 then 44%)
admin-portal   prod     $    292 -> $     73  large -> small (p95 then 32%)
report-worker  prod     $    438 -> $    110  large -> small (p95 then 48%)
legacy-export  prod     $    146 -> $      0  delete candidate: no traffic in 14 days (confirm with the owner first)
staging-full   staging  $  2,336 -> $    211  xlarge -> medium (p95 then 60%); run office hours only
dev-sandboxes  dev      $  1,752 -> $    158  large -> small (p95 then 20%); run office hours only

monthly: $7,884 -> $2,888  (63% less), without touching the busy service`,
        notes: [
          { t: "p", text: "The plan cut the bill by about 63% without touching checkout, the one service that was actually busy. The biggest saving was not production at all: an always-on, full-size staging environment, which became a medium-sized office-hours environment — a pattern common enough that many teams find non-production costing as much as production." },
          { t: "p", text: "The guardrails are the important part. The 60% p95 ceiling after resizing keeps headroom for bursts (11.2); non-production scheduling never touches production; and the zero-traffic export job is a candidate to confirm, because \"no traffic for 14 days\" can describe a quarterly job that matters very much on the day it runs." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: an optional widget that took checkout down",
      body: [
        { t: "p", text: "**Symptom.** During a regional network degradation, the recommendations service's latency rose to about a second. Within two minutes the checkout service, which only displayed a \"you may also like\" strip, was failing almost every request, and revenue stopped for 25 minutes." },
        { t: "p", text: "**Mechanism.** Checkout called recommendations synchronously with the HTTP client's default timeout of 30 seconds. Every worker thread ended up waiting on the optional call, and checkout's own requests queued until clients gave up — chaos.py's first line. A chaos experiment had been on the roadmap for two quarters." },
        { t: "p", text: "**Fix.** Every downstream call got an explicit timeout derived from its latency budget, optional calls got circuit breakers and fallbacks (the page renders without recommendations), and calls to optional services moved to a separate small pool (bulkhead). The team now runs a monthly game day that injects latency into each dependency in turn, with a stop condition at 99% checkout success." }
      ] }
  ],

  takeaways: [
    "A chaos experiment has a **steady state**, a **hypothesis**, an injected **fault**, a small **blast radius** and an automatic **stop**.",
    "Measured: with no timeout, a slow **optional** dependency took checkout to **0% success**.",
    "A **stop button** limited the failures from ~16,000 to ~8,800 but not to zero: **queued work outlives the fault**.",
    "A **timeout alone** still failed: 20 threads ÷ 85 ms ≈ 235 req/s against 400 arriving (Little's law).",
    "**Timeout + circuit breaker** held the steady state: **100% success, p99 85 ms** with the fault active.",
    "Chaos without real-time SLIs and a stop condition is just an outage; start with game days and staging.",
    "Buy capacity in layers: **reserve the floor**, **autoscale on demand** for the peaks, **spot** for interruptible work — measured, **47%** of the peak-sized on-demand bill.",
    "Reserving for the peak cost **more** than that: reserved hours are paid whether used or not.",
    "Right-size with **headroom guardrails**, schedule **non-production**, and confirm before deleting: a sample fleet cost **63% less** without touching the busy service.",
    "Never buy savings with reliability: zones, headroom and stateful workloads on stable capacity stay."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "What makes fault injection a chaos experiment rather than just breaking things?",
        options: ["Running it in production", "A defined steady state, a hypothesis, a limited blast radius and an automatic stop condition, with the results measured", "Using a commercial tool", "Running it without telling anyone"],
        answer: 1,
        why: "The method is what matters: measured normal behaviour, a prediction, a bounded fault and a way to stop. Production is a later stage, not the definition; tools are optional; and surprise without preparation is just an incident." },

      { stem: "Checkout calls an optional service with an 80 ms timeout. That service becomes slow. With 20 threads at 400 req/s and 5 ms of local work, why does checkout still fail?",
        options: ["80 ms is too long for users", "Each request now holds a thread for about 85 ms, so 20 threads can serve only about 235 req/s — less than the 400 arriving", "Timeouts do not work in Python", "The optional service is still being called correctly"],
        answer: 1,
        why: "Little's law: capacity = threads ÷ time per request = 20 ÷ 0.085 s ≈ 235 req/s. The timeout bounds each wait but every request still waits it out. A circuit breaker stops calling the dependency, so requests take only 5 ms." },

      { stem: "A workload has a constant baseline, a daily peak and nightly batch jobs. Which purchase plan is usually cheapest without risking reliability?",
        options: ["Reserve capacity for the peak around the clock", "Reserve the baseline, autoscale on-demand capacity for the peak, and run interruptible batch jobs on spot", "Everything on spot", "Everything on demand, sized for the peak"],
        answer: 1,
        why: "Reserved capacity is cheapest only when it is used all the time, so it fits the baseline; on-demand autoscaling fits the peak; spot fits work that can be interrupted and retried. Reserving the peak pays for idle hours, all-spot risks reclamation of critical capacity, and peak-sized on-demand is the most expensive." },

      { stem: "A right-sizing tool suggests halving an instance whose p95 CPU is 45%. What happens to its p95 utilisation, and should you do it?",
        options: ["It stays at 45%; yes", "It roughly doubles to about 90%; no — that removes the headroom bursts and failures need", "It halves; yes", "It cannot be predicted"],
        answer: 1,
        why: "Half the capacity for the same load doubles utilisation, to around 90% at p95 — where 11.2's queueing curve makes latency explode. A sensible guardrail keeps p95 under about 60% after resizing." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "Both topics test whether you trade risk and money deliberately.",
    questions: [
      { level: "advanced",
        q: "Describe how you would introduce chaos engineering to a team.",
        strong: "A strong answer starts with prerequisites and small experiments, and connects results to engineering work.",
        answer: [
          { t: "p", text: "Prerequisites first: SLO-based dashboards that show steady state in real time, and timeouts, retries and breakers that we believe work. Then a game day in staging: pick one dependency, write the hypothesis — checkout keeps 99.9% success if recommendations adds 800 ms — inject the fault with a stop condition, and watch together." },
          { t: "p", text: "Each disproved hypothesis becomes a backlog item with a clear fix, and the experiment is re-run to confirm it. Once experiments are routine and safe, move to production with a small blast radius — one instance, one cell, a percentage of traffic — automated stop conditions, and eventually scheduled, continuous experiments." }
        ] },

      { level: "core",
        q: "How do you reduce cloud costs without sacrificing reliability?",
        strong: "A strong answer names the big levers, the guardrails, and the savings to refuse.",
        answer: [
          { t: "p", text: "Purchase in layers — reserve the always-on floor, autoscale on-demand capacity for peaks, run interruptible work on spot. Right-size with guardrails, keeping p95 utilisation below about 60% after changes; schedule non-production environments; tier and expire storage; cache at the edge; keep chatty traffic within a zone; and delete orphaned resources after confirming with owners." },
          { t: "p", text: "I would refuse savings that buy cost with reliability: removing zone redundancy, running at very high utilisation, stateful systems on spot, or cutting observability retention. And I track cost per request or per customer with tags and per-team dashboards, so cost is a visible design trade-off rather than a quarterly surprise." }
        ] },

      { level: "core",
        q: "What would you do if a chaos experiment caused real customer impact?",
        strong: "A strong answer covers the immediate response, the blameless review and the fixes to both the system and the experiment process.",
        answer: [
          { t: "p", text: "Stop the experiment immediately — the stop condition should already have done so — and handle it as an incident: mitigate, communicate, confirm recovery. The experiment found a real weakness at a time when the team was watching, which is the point, but the impact means the blast radius or stop condition was wrong." },
          { t: "p", text: "In the blameless review I would separate the two findings: the system weakness, fixed and verified by re-running the experiment, and the experiment design — tighter stop conditions, a smaller blast radius, better pre-checks — before running anything similar again." }
        ] }
    ]
  }
});
