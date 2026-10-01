/* ============================================================================
   LESSON 7.1 — Timeouts, Retries and Backoff with Jitter
   ========================================================================= */
EC.receiveLesson({
  id: "7.1",

  lede: "The dependency that hurts most is not the one that is down — it answers fast with an error — but the one that is **slow**. Without a timeout, every caller waits, its threads and connections pile up, and the slowness spreads upward until the whole system is stuck. Timeouts stop the waiting; retries recover from blips. But retries are load, and done naively they **synchronise**: ten thousand clients failing together retry together, in waves, at exactly the moment the dependency is trying to recover. Exponential backoff spreads the waves out; **jitter** breaks them up; a **retry budget** caps how much extra load retries may ever add.",

  objectives: [
    "Explain why a slow dependency is more dangerous than a failed one, and set a timeout from its latency distribution",
    "Measure how fixed, exponential and jittered backoff load a recovering service",
    "Compute retry amplification across layers and decide where retries belong",
    "Limit retries with a retry budget",
    "Retry only what is safe to retry"
  ],

  prerequisites: ["1.2", "1.4", "6.3"],

  blocks: [

    { t: "h2", n: "01", id: "timeouts", text: "Every remote call needs a timeout",
      sub: "Slow is worse than down" },

    { t: "p", text: "A service handles requests with a pool of 200 threads and calls a dependency that normally answers in 20 ms. The dependency degrades and starts taking 30 seconds. By Little's Law (11.2), at 100 requests a second each holding a thread for 30 s, the service needs 3,000 threads; it has 200, so it is **saturated within two seconds** — and every request to it, including ones that never touch the slow dependency, now queues. Its callers then saturate the same way. A timeout of a few hundred milliseconds turns that cascade into fast, contained errors." },

    { t: "diagram", kind: "steps", title: "Setting a timeout",
      caption: "Many client libraries default to no timeout or to minutes. Every outbound call — HTTP, database, cache, queue — needs an explicit one, and the request as a whole needs a deadline that its downstream calls inherit.",
      items: [
        { label: "Measure the dependency's latency distribution", desc: "p99 and p99.9 over a normal week, not the average (11.1)", code: "p99.9 = 180 ms", tone: "accent" },
        { label: "Set the timeout a little above the tail", desc: "high enough not to cut off healthy slow requests; low enough to free threads fast", code: "~250 ms", tone: "good" },
        { label: "Set connect and read timeouts separately", desc: "connection establishment should fail in tens of milliseconds inside a data centre", code: "connect 50 ms", tone: "violet" },
        { label: "Propagate a deadline", desc: "a request with 300 ms left must not start a 250 ms call that then retries", code: "deadline header", tone: "warn" },
        { label: "Alert on timeout rate", desc: "a rising rate is the earliest sign a dependency is degrading", code: "per dependency", tone: "teal" }
      ] },

    { t: "h2", n: "02", id: "storms", text: "Retries, and the storms they cause",
      sub: "Fixed delays synchronise; jitter does not" },

    { t: "p", text: "Ten thousand clients all fail at once when a dependency goes down. It recovers ten seconds later with capacity for 2,000 requests a second. Each client retries up to twelve times:" },

    { t: "code", lang: "python", title: "backoff.py — the recovery, under three retry policies", code: `import random
from collections import Counter

CLIENTS, OUTAGE_END, CAP = 10_000, 10.0, 2_000   # server recovers at t=10 s and serves 2,000 req/s
BASE, MAX_DELAY, MAX_TRIES = 0.1, 20.0, 12

def delay(policy, attempt, rng):
    exp = min(MAX_DELAY, BASE * 2 ** attempt)
    if policy == "fixed 1 s":        return 1.0
    if policy == "exponential":      return exp
    if policy == "exp + full jitter": return rng.uniform(0, exp)

def simulate(policy, seed=1):
    rng = random.Random(seed)
    pending = [(0.0, c, 0) for c in range(CLIENTS)]          # everyone's first call fails at t=0
    per_second, done_at = Counter(), {}
    while pending:
        nxt = []
        pending.sort()
        served = Counter()
        for t, c, attempt in pending:
            sec = int(t)
            per_second[sec] += 1
            ok = t >= OUTAGE_END and served[sec] < CAP          # up, and not over capacity this second
            if ok:
                served[sec] += 1; done_at[c] = t
            elif attempt + 1 < MAX_TRIES:
                nxt.append((t + delay(policy, attempt, rng), c, attempt + 1))
        pending = nxt
    after = [per_second[s] for s in range(10, 40)]
    total = sum(per_second.values())
    simulate.series = per_second
    return max(after), total, len(done_at), max(done_at.values()) if done_at else 0

print("10,000 clients fail together at t=0; the server is back at t=10 s with capacity 2,000 req/s")
print("%-18s %22s %16s %12s %16s" % ("retry policy", "peak load after t=10", "total attempts", "succeeded", "last success"))
for p in ("fixed 1 s", "exponential", "exp + full jitter"):
    peak, total, ok, last = simulate(p)
    print("%-18s %16s req/s %16s %12s %14.1f s" % (p, "{:,}".format(peak), "{:,}".format(total), "{:,}".format(ok), last))`,
      out: `10,000 clients fail together at t=0; the server is back at t=10 s with capacity 2,000 req/s
retry policy         peak load after t=10   total attempts    succeeded     last success
fixed 1 s                    10,000 req/s          118,000        4,000           11.0 s
exponential                  10,000 req/s          100,000       10,000           85.5 s
exp + full jitter             1,270 req/s           92,797        9,999           29.8 s`,
      hl: [9, 10, 11],
      caption: "With a **fixed one-second** delay every client retries in the same second, ten thousand at a time against a capacity of two thousand; most run out of attempts and fail permanently even though the server is up. **Exponential** backoff without jitter keeps the clients in lockstep — every wave is still all ten thousand, just further apart — so recovery takes over a minute. **Full jitter** spreads each wave across its whole delay interval: the peak stays below capacity and almost everyone succeeds within twenty seconds of recovery." },

    { t: "viz", title: "Attempts per second around the recovery",
      caption: "Red: all ten thousand clients retry every second; the server serves 2,000 a second from t = 10, and by t = 12 the remaining clients have used up their attempts and given up. Amber: exponential backoff without jitter — the same full-size waves, at t = 12 and t = 25. Green: jitter turns the waves into a stream below the server's capacity.",
      svg: `<svg viewBox="0 0 760 280" width="100%" role="img">
<line x1="64" y1="234.0" x2="610" y2="234.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="238.0" text-anchor="end" class="s-sub">0k</text>
<line x1="64" y1="198.0" x2="610" y2="198.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="202.0" text-anchor="end" class="s-sub">2k</text>
<line x1="64" y1="162.0" x2="610" y2="162.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="166.0" text-anchor="end" class="s-sub">4k</text>
<line x1="64" y1="126.0" x2="610" y2="126.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="130.0" text-anchor="end" class="s-sub">6k</text>
<line x1="64" y1="90.0" x2="610" y2="90.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="94.0" text-anchor="end" class="s-sub">8k</text>
<line x1="64" y1="54.0" x2="610" y2="54.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="58.0" text-anchor="end" class="s-sub">10k</text>
<line x1="64" y1="18.0" x2="610" y2="18.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="22.0" text-anchor="end" class="s-sub">12k</text>
<text x="64.0" y="252" text-anchor="middle" class="s-sub">8</text>
<text x="81.1" y="252" text-anchor="middle" class="s-sub"></text>
<text x="98.1" y="252" text-anchor="middle" class="s-sub"></text>
<text x="115.2" y="252" text-anchor="middle" class="s-sub"></text>
<text x="132.2" y="252" text-anchor="middle" class="s-sub">12</text>
<text x="149.3" y="252" text-anchor="middle" class="s-sub"></text>
<text x="166.4" y="252" text-anchor="middle" class="s-sub"></text>
<text x="183.4" y="252" text-anchor="middle" class="s-sub"></text>
<text x="200.5" y="252" text-anchor="middle" class="s-sub">16</text>
<text x="217.6" y="252" text-anchor="middle" class="s-sub"></text>
<text x="234.6" y="252" text-anchor="middle" class="s-sub"></text>
<text x="251.7" y="252" text-anchor="middle" class="s-sub"></text>
<text x="268.8" y="252" text-anchor="middle" class="s-sub">20</text>
<text x="285.8" y="252" text-anchor="middle" class="s-sub"></text>
<text x="302.9" y="252" text-anchor="middle" class="s-sub"></text>
<text x="319.9" y="252" text-anchor="middle" class="s-sub"></text>
<text x="337.0" y="252" text-anchor="middle" class="s-sub">24</text>
<text x="354.1" y="252" text-anchor="middle" class="s-sub"></text>
<text x="371.1" y="252" text-anchor="middle" class="s-sub"></text>
<text x="388.2" y="252" text-anchor="middle" class="s-sub"></text>
<text x="405.2" y="252" text-anchor="middle" class="s-sub">28</text>
<text x="422.3" y="252" text-anchor="middle" class="s-sub"></text>
<text x="439.4" y="252" text-anchor="middle" class="s-sub"></text>
<text x="456.4" y="252" text-anchor="middle" class="s-sub"></text>
<text x="473.5" y="252" text-anchor="middle" class="s-sub">32</text>
<text x="490.6" y="252" text-anchor="middle" class="s-sub"></text>
<text x="507.6" y="252" text-anchor="middle" class="s-sub"></text>
<text x="524.7" y="252" text-anchor="middle" class="s-sub"></text>
<text x="541.8" y="252" text-anchor="middle" class="s-sub">36</text>
<text x="558.8" y="252" text-anchor="middle" class="s-sub"></text>
<text x="575.9" y="252" text-anchor="middle" class="s-sub"></text>
<text x="592.9" y="252" text-anchor="middle" class="s-sub"></text>
<text x="610.0" y="252" text-anchor="middle" class="s-sub">40</text>
<text x="337.0" y="274" text-anchor="middle" class="s-sub">seconds — the server recovers at t = 10 and serves 2k/s</text>
<text x="14" y="126.0" text-anchor="middle" class="s-sub" transform="rotate(-90 14 126.0)">attempts per second</text>
<polyline points="64.0,54.0 81.1,54.0 98.1,54.0 115.2,90.0 132.2,234.0 149.3,234.0 166.4,234.0 183.4,234.0 200.5,234.0 217.6,234.0 234.6,234.0 251.7,234.0 268.8,234.0 285.8,234.0 302.9,234.0 319.9,234.0 337.0,234.0 354.1,234.0 371.1,234.0 388.2,234.0 405.2,234.0 422.3,234.0 439.4,234.0 456.4,234.0 473.5,234.0 490.6,234.0 507.6,234.0 524.7,234.0 541.8,234.0 558.8,234.0 575.9,234.0 592.9,234.0 610.0,234.0" style="fill:none;stroke:var(--crit)" stroke-width="2.2"/>
<circle cx="64.0" cy="54.0" r="3.6" style="fill:var(--crit)"/>
<circle cx="81.1" cy="54.0" r="3.6" style="fill:var(--crit)"/>
<circle cx="98.1" cy="54.0" r="3.6" style="fill:var(--crit)"/>
<circle cx="115.2" cy="90.0" r="3.6" style="fill:var(--crit)"/>
<circle cx="132.2" cy="234.0" r="3.6" style="fill:var(--crit)"/>
<circle cx="149.3" cy="234.0" r="3.6" style="fill:var(--crit)"/>
<circle cx="166.4" cy="234.0" r="3.6" style="fill:var(--crit)"/>
<circle cx="183.4" cy="234.0" r="3.6" style="fill:var(--crit)"/>
<circle cx="200.5" cy="234.0" r="3.6" style="fill:var(--crit)"/>
<circle cx="217.6" cy="234.0" r="3.6" style="fill:var(--crit)"/>
<circle cx="234.6" cy="234.0" r="3.6" style="fill:var(--crit)"/>
<circle cx="251.7" cy="234.0" r="3.6" style="fill:var(--crit)"/>
<circle cx="268.8" cy="234.0" r="3.6" style="fill:var(--crit)"/>
<circle cx="285.8" cy="234.0" r="3.6" style="fill:var(--crit)"/>
<circle cx="302.9" cy="234.0" r="3.6" style="fill:var(--crit)"/>
<circle cx="319.9" cy="234.0" r="3.6" style="fill:var(--crit)"/>
<circle cx="337.0" cy="234.0" r="3.6" style="fill:var(--crit)"/>
<circle cx="354.1" cy="234.0" r="3.6" style="fill:var(--crit)"/>
<circle cx="371.1" cy="234.0" r="3.6" style="fill:var(--crit)"/>
<circle cx="388.2" cy="234.0" r="3.6" style="fill:var(--crit)"/>
<circle cx="405.2" cy="234.0" r="3.6" style="fill:var(--crit)"/>
<circle cx="422.3" cy="234.0" r="3.6" style="fill:var(--crit)"/>
<circle cx="439.4" cy="234.0" r="3.6" style="fill:var(--crit)"/>
<circle cx="456.4" cy="234.0" r="3.6" style="fill:var(--crit)"/>
<circle cx="473.5" cy="234.0" r="3.6" style="fill:var(--crit)"/>
<circle cx="490.6" cy="234.0" r="3.6" style="fill:var(--crit)"/>
<circle cx="507.6" cy="234.0" r="3.6" style="fill:var(--crit)"/>
<circle cx="524.7" cy="234.0" r="3.6" style="fill:var(--crit)"/>
<circle cx="541.8" cy="234.0" r="3.6" style="fill:var(--crit)"/>
<circle cx="558.8" cy="234.0" r="3.6" style="fill:var(--crit)"/>
<circle cx="575.9" cy="234.0" r="3.6" style="fill:var(--crit)"/>
<circle cx="592.9" cy="234.0" r="3.6" style="fill:var(--crit)"/>
<circle cx="610.0" cy="234.0" r="3.6" style="fill:var(--crit)"/>
<line x1="626" y1="28" x2="644" y2="28" style="stroke:var(--crit)" stroke-width="2.4"/>
<text x="650" y="32" class="s-sub" style="fill:var(--ink-2)">fixed 1 s</text>
<polyline points="64.0,234.0 81.1,234.0 98.1,234.0 115.2,234.0 132.2,54.0 149.3,234.0 166.4,234.0 183.4,234.0 200.5,234.0 217.6,234.0 234.6,234.0 251.7,234.0 268.8,234.0 285.8,234.0 302.9,234.0 319.9,234.0 337.0,234.0 354.1,90.0 371.1,234.0 388.2,234.0 405.2,234.0 422.3,234.0 439.4,234.0 456.4,234.0 473.5,234.0 490.6,234.0 507.6,234.0 524.7,234.0 541.8,234.0 558.8,234.0 575.9,234.0 592.9,234.0 610.0,234.0" style="fill:none;stroke:var(--warn)" stroke-width="2.2"/>
<circle cx="64.0" cy="234.0" r="3.6" style="fill:var(--warn)"/>
<circle cx="81.1" cy="234.0" r="3.6" style="fill:var(--warn)"/>
<circle cx="98.1" cy="234.0" r="3.6" style="fill:var(--warn)"/>
<circle cx="115.2" cy="234.0" r="3.6" style="fill:var(--warn)"/>
<circle cx="132.2" cy="54.0" r="3.6" style="fill:var(--warn)"/>
<circle cx="149.3" cy="234.0" r="3.6" style="fill:var(--warn)"/>
<circle cx="166.4" cy="234.0" r="3.6" style="fill:var(--warn)"/>
<circle cx="183.4" cy="234.0" r="3.6" style="fill:var(--warn)"/>
<circle cx="200.5" cy="234.0" r="3.6" style="fill:var(--warn)"/>
<circle cx="217.6" cy="234.0" r="3.6" style="fill:var(--warn)"/>
<circle cx="234.6" cy="234.0" r="3.6" style="fill:var(--warn)"/>
<circle cx="251.7" cy="234.0" r="3.6" style="fill:var(--warn)"/>
<circle cx="268.8" cy="234.0" r="3.6" style="fill:var(--warn)"/>
<circle cx="285.8" cy="234.0" r="3.6" style="fill:var(--warn)"/>
<circle cx="302.9" cy="234.0" r="3.6" style="fill:var(--warn)"/>
<circle cx="319.9" cy="234.0" r="3.6" style="fill:var(--warn)"/>
<circle cx="337.0" cy="234.0" r="3.6" style="fill:var(--warn)"/>
<circle cx="354.1" cy="90.0" r="3.6" style="fill:var(--warn)"/>
<circle cx="371.1" cy="234.0" r="3.6" style="fill:var(--warn)"/>
<circle cx="388.2" cy="234.0" r="3.6" style="fill:var(--warn)"/>
<circle cx="405.2" cy="234.0" r="3.6" style="fill:var(--warn)"/>
<circle cx="422.3" cy="234.0" r="3.6" style="fill:var(--warn)"/>
<circle cx="439.4" cy="234.0" r="3.6" style="fill:var(--warn)"/>
<circle cx="456.4" cy="234.0" r="3.6" style="fill:var(--warn)"/>
<circle cx="473.5" cy="234.0" r="3.6" style="fill:var(--warn)"/>
<circle cx="490.6" cy="234.0" r="3.6" style="fill:var(--warn)"/>
<circle cx="507.6" cy="234.0" r="3.6" style="fill:var(--warn)"/>
<circle cx="524.7" cy="234.0" r="3.6" style="fill:var(--warn)"/>
<circle cx="541.8" cy="234.0" r="3.6" style="fill:var(--warn)"/>
<circle cx="558.8" cy="234.0" r="3.6" style="fill:var(--warn)"/>
<circle cx="575.9" cy="234.0" r="3.6" style="fill:var(--warn)"/>
<circle cx="592.9" cy="234.0" r="3.6" style="fill:var(--warn)"/>
<circle cx="610.0" cy="234.0" r="3.6" style="fill:var(--warn)"/>
<line x1="626" y1="50" x2="644" y2="50" style="stroke:var(--warn)" stroke-width="2.4"/>
<text x="650" y="54" class="s-sub" style="fill:var(--ink-2)">exponential</text>
<polyline points="64.0,198.1 81.1,203.5 98.1,211.1 115.2,216.2 132.2,217.7 149.3,217.3 166.4,218.0 183.4,218.2 200.5,219.3 217.6,221.1 234.6,222.8 251.7,225.6 268.8,227.9 285.8,229.2 302.9,230.6 319.9,231.6 337.0,231.0 354.1,231.5 371.1,231.8 388.2,232.6 405.2,232.9 422.3,233.7 439.4,234.0 456.4,234.0 473.5,234.0 490.6,234.0 507.6,234.0 524.7,234.0 541.8,234.0 558.8,234.0 575.9,234.0 592.9,234.0 610.0,234.0" style="fill:none;stroke:var(--good)" stroke-width="2.2"/>
<circle cx="64.0" cy="198.1" r="3.6" style="fill:var(--good)"/>
<circle cx="81.1" cy="203.5" r="3.6" style="fill:var(--good)"/>
<circle cx="98.1" cy="211.1" r="3.6" style="fill:var(--good)"/>
<circle cx="115.2" cy="216.2" r="3.6" style="fill:var(--good)"/>
<circle cx="132.2" cy="217.7" r="3.6" style="fill:var(--good)"/>
<circle cx="149.3" cy="217.3" r="3.6" style="fill:var(--good)"/>
<circle cx="166.4" cy="218.0" r="3.6" style="fill:var(--good)"/>
<circle cx="183.4" cy="218.2" r="3.6" style="fill:var(--good)"/>
<circle cx="200.5" cy="219.3" r="3.6" style="fill:var(--good)"/>
<circle cx="217.6" cy="221.1" r="3.6" style="fill:var(--good)"/>
<circle cx="234.6" cy="222.8" r="3.6" style="fill:var(--good)"/>
<circle cx="251.7" cy="225.6" r="3.6" style="fill:var(--good)"/>
<circle cx="268.8" cy="227.9" r="3.6" style="fill:var(--good)"/>
<circle cx="285.8" cy="229.2" r="3.6" style="fill:var(--good)"/>
<circle cx="302.9" cy="230.6" r="3.6" style="fill:var(--good)"/>
<circle cx="319.9" cy="231.6" r="3.6" style="fill:var(--good)"/>
<circle cx="337.0" cy="231.0" r="3.6" style="fill:var(--good)"/>
<circle cx="354.1" cy="231.5" r="3.6" style="fill:var(--good)"/>
<circle cx="371.1" cy="231.8" r="3.6" style="fill:var(--good)"/>
<circle cx="388.2" cy="232.6" r="3.6" style="fill:var(--good)"/>
<circle cx="405.2" cy="232.9" r="3.6" style="fill:var(--good)"/>
<circle cx="422.3" cy="233.7" r="3.6" style="fill:var(--good)"/>
<circle cx="439.4" cy="234.0" r="3.6" style="fill:var(--good)"/>
<circle cx="456.4" cy="234.0" r="3.6" style="fill:var(--good)"/>
<circle cx="473.5" cy="234.0" r="3.6" style="fill:var(--good)"/>
<circle cx="490.6" cy="234.0" r="3.6" style="fill:var(--good)"/>
<circle cx="507.6" cy="234.0" r="3.6" style="fill:var(--good)"/>
<circle cx="524.7" cy="234.0" r="3.6" style="fill:var(--good)"/>
<circle cx="541.8" cy="234.0" r="3.6" style="fill:var(--good)"/>
<circle cx="558.8" cy="234.0" r="3.6" style="fill:var(--good)"/>
<circle cx="575.9" cy="234.0" r="3.6" style="fill:var(--good)"/>
<circle cx="592.9" cy="234.0" r="3.6" style="fill:var(--good)"/>
<circle cx="610.0" cy="234.0" r="3.6" style="fill:var(--good)"/>
<line x1="626" y1="72" x2="644" y2="72" style="stroke:var(--good)" stroke-width="2.4"/>
<text x="650" y="76" class="s-sub" style="fill:var(--ink-2)">exp + full jitter</text>
</svg>` },

    { t: "code", lang: "python", title: "the policy, in four lines", code: `import random

def backoff(attempt: int, base: float = 0.1, cap: float = 20.0) -> float:
    """Exponential backoff with full jitter: uniform between 0 and the exponential ceiling."""
    return random.uniform(0, min(cap, base * 2 ** attempt))`,
      caption: "\"Full jitter\" — a uniform delay between zero and the exponential ceiling — is the variant AWS's analysis found to spread load best. The cap keeps a long outage from producing hour-long sleeps." },

    { t: "h2", n: "03", id: "amplification", text: "Retry amplification",
      sub: "Retries multiply through layers" },

    { t: "code", lang: "python", title: "amplification.py — one user request, four layers, the bottom one down", code: `# A request passes through edge -> API -> orders -> inventory DB. Each layer retries a failed call.
# When the bottom layer is down, how many calls does ONE user request generate at the bottom?
LAYERS = ["edge", "api", "orders", "inventory"]

def attempts_at_bottom(tries_per_layer):
    total = 1
    for t in tries_per_layer: total *= t
    return total

print("%-44s %22s" % ("retry policy per layer (tries = 1 + retries)", "calls hitting the DB"))
for label, tries in (("no retries anywhere", [1, 1, 1, 1]),
                     ("3 tries at every layer", [3, 3, 3, 3]),
                     ("3 tries at the edge only", [3, 1, 1, 1]),
                     ("3 tries only where the call is made", [1, 1, 1, 3])):
    print("%-44s %22d" % (label, attempts_at_bottom(tries)))`,
      out: `retry policy per layer (tries = 1 + retries)   calls hitting the DB
no retries anywhere                                               1
3 tries at every layer                                           81
3 tries at the edge only                                          3
3 tries only where the call is made                               3`,
      caption: "Three tries at each of four layers sends **81 calls** to a database that is already failing, for every user request. Each team added retries to its own client for good reasons, and together they built a load multiplier that triggers exactly when the database can least afford it." },

    { t: "callout", kind: "trap", title: "Retrying at every layer",
      body: [
        { t: "p", text: "Retries belong in **one** place in a call chain — usually the layer closest to the failing call, which knows whether the error is transient — or at the edge, where the user's request enters. Every other layer should fail fast and propagate the error. Service meshes make this easy to get wrong in a new way: a mesh retry policy stacked on an application's own retry loop quietly squares the number of attempts." },
        { t: "p", text: "And retry only what is safe to repeat: idempotent methods (1.4), or requests carrying an idempotency key (6.3). Retry transient errors — connection resets, 503, 504, 429 with its `Retry-After` — never 400s, never 401s, and never a timeout on a non-idempotent call without a key." }
      ] },

    { t: "exercise", kind: "Challenge", title: "A retry budget",
      difficulty: "core", minutes: 25,
      body: [
        { t: "p", text: "A client sends 1,000 requests a second and retries failures up to three times. Its dependency is fully down for thirty seconds, and otherwise fails 1% of calls transiently. Add a retry budget so retries can never exceed about 10% of first attempts, and compare the load on the dependency and the success rate with and without it." }
      ],
      requirements: [
        "Implement the budget as a token bucket: each first attempt adds 0.1 tokens, plus a small floor per second",
        "A retry is allowed only if a token is available",
        "Measure the dependency's load when healthy and during the outage, with and without the budget",
        "Show that the budget does not reduce successes"
      ],
      hint: "When healthy, 1% of requests need a retry, well inside a 10% budget. During the outage every request wants three retries — the budget is what stops that.",
      solution: { lang: "python", title: "retry_budget_ex.py",
        code: `import random

class RetryBudget:
    """Allow retries only up to a fraction of recent first attempts (a token bucket)."""
    def __init__(self, ratio=0.1, min_per_s=10):
        self.ratio, self.tokens, self.cap, self.min_per_s = ratio, 0.0, 100.0, min_per_s
    def on_request(self): self.tokens = min(self.cap, self.tokens + self.ratio)
    def tick(self): self.tokens = min(self.cap, self.tokens + self.min_per_s)
    def try_spend(self):
        if self.tokens >= 1: self.tokens -= 1; return True
        return False

def simulate(use_budget, rps=1_000, seconds=60, down=(10, 40), max_tries=4, seed=3):
    rng = random.Random(seed); budget = RetryBudget()
    load, ok, failed = [0] * seconds, 0, 0
    for s in range(seconds):
        budget.tick()
        for _ in range(rps):
            budget.on_request()
            for attempt in range(max_tries):
                load[s] += 1
                if not (down[0] <= s < down[1]) and rng.random() > 0.01:   # healthy: 1% blips
                    ok += 1; break
                if attempt + 1 == max_tries or (use_budget and not budget.try_spend()):
                    failed += 1; break
    outage = load[down[0]:down[1]]
    return max(outage), sum(outage) / len(outage), ok, failed, sum(load[:down[0]]) / down[0]

print("1,000 requests/s; the dependency is down from t=10 to t=40 s; up to 3 retries per request")
print("%-16s %18s %18s %16s %12s" % ("", "load when healthy", "load during outage", "succeeded", "failed"))
for use in (False, True):
    peak, avg, ok, failed, healthy = simulate(use)
    print("%-16s %14.0f /s %14.0f /s %16s %12s" % ("with budget" if use else "no budget", healthy, avg,
          "{:,}".format(ok), "{:,}".format(failed)))`,
        out: `1,000 requests/s; the dependency is down from t=10 to t=40 s; up to 3 retries per request
                  load when healthy load during outage        succeeded       failed
no budget                  1011 /s           4000 /s           30,000       30,000
with budget                1011 /s           1113 /s           30,000       30,000`,
        notes: [
          { t: "p", text: "When healthy, the two are indistinguishable: occasional blips are retried and succeed, well within budget. During the outage, without the budget the client **quadruples** its load on the dead dependency — four attempts per request — and gains nothing, because every attempt fails. With the budget the load stays near the normal rate, and success is identical." },
          { t: "p", text: "That is the point of a budget: retries are valuable when failures are rare and harmful when failures are universal, and a ratio cap distinguishes the two automatically. gRPC and Finagle ship this as configuration; the token bucket is the same structure as the rate limiter of 7.3." },
          { t: "p", text: "During a full outage the right behaviour goes further still — stop calling altogether for a while and fail immediately. That is the circuit breaker (7.2), which pairs with the budget: the budget caps retry load, the breaker caps first-attempt load." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: the authentication service that could not come back",
      body: [
        { t: "p", text: "**Symptom.** An authentication service restarted after a two-minute database failover. Every attempt to bring it back failed: within seconds of starting, it was overwhelmed, its health checks failed, and the load balancer removed it again. The outage lasted forty minutes after the database had recovered." },
        { t: "p", text: "**Mechanism.** Around eighty services called auth, each with retries on a fixed 500 ms delay, and the mobile apps retried login every two seconds. During the failover every caller accumulated failed requests and retried them in lockstep; when auth came back, it received the synchronised retry waves of every client at once — many times its capacity — and fell over, which made every client retry again. The red line in section 02's chart, at company scale." },
        { t: "p", text: "**Fix.** That day: shed load at the gateway, admitting auth traffic gradually. After: exponential backoff with full jitter in the shared client library, a retry budget, a circuit breaker per dependency (7.2), and server-side load shedding so an overloaded auth rejects cheaply instead of collapsing (7.4). The next database failover produced a dip in logins and nothing else." }
      ] }
  ],

  takeaways: [
    "A **slow** dependency is worse than a failed one: callers hold threads waiting, saturate, and spread the slowness upward.",
    "Every remote call needs an explicit **timeout** set a little above the dependency's p99.9, and requests need a **deadline** that downstream calls inherit.",
    "Measured: after an outage, **fixed-delay retries** hit the recovering server in synchronised waves and most clients ran out of attempts.",
    "**Exponential backoff without jitter** keeps clients in lockstep; recovery took over a minute.",
    "**Full jitter** — uniform between zero and the exponential ceiling — kept the peak below capacity and recovered almost everyone within twenty seconds.",
    "Retries **multiply through layers**: three tries at four layers is **81 calls** to the failing component.",
    "Retry in **one place** in the chain, only **transient** errors, only **idempotent** or keyed requests.",
    "A **retry budget** caps retries at a fraction of traffic — measured, it removed a fourfold load increase during an outage with no loss of successes.",
    "Pair the retry budget with a **circuit breaker** (7.2) and **load shedding** (7.4)."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Why does a dependency that takes 30 seconds to respond do more damage than one that fails immediately?",
        options: ["Slow responses use more bandwidth", "Callers hold threads and connections while waiting, saturate, and then fail their own callers", "Errors are logged more", "Slow responses are not retried"],
        answer: 1,
        why: "Every waiting call occupies a thread or connection; at a modest request rate a 30-second wait exhausts a pool in seconds, after which even unrelated requests queue — and the caller's callers saturate the same way. An immediate error frees resources at once. Bandwidth and logging are not the mechanism, and slow responses are retried once they time out." },

      { stem: "Ten thousand clients use exponential backoff without jitter after a shared failure. What happens when the server recovers?",
        options: ["Load is smooth", "The clients retry in synchronised waves, each the full ten thousand, further apart each time", "Every client succeeds on the first retry", "The clients stop retrying"],
        answer: 1,
        why: "Identical backoff schedules starting at the same moment keep the clients in lockstep, so each wave arrives together and exceeds capacity — recovery took over a minute in the simulation. Jitter randomises the delay within each interval, which is what smooths the load." },

      { stem: "A request passes through four services, each retrying a failed downstream call twice (three tries). The bottom service is down. How many calls reach it per user request?",
        options: ["3", "12", "81", "4"],
        answer: 2,
        why: "Each layer multiplies the attempts of the layer above: 3 × 3 × 3 × 3 = 81. Twelve would be additive, which is not how nested retries behave; three is what you get with retries in one place only; four counts layers, not attempts." },

      { stem: "Which request is safe for a client library to retry automatically after a timeout?",
        options: ["POST /payments with no idempotency key", "GET /orders/42", "POST /emails/send", "Any request that returned 400"],
        answer: 1,
        why: "GET is idempotent, so repeating it after an ambiguous timeout cannot cause a second effect. A POST without a key may have succeeded before the timeout, so retrying risks a double charge or a duplicate email; a 400 means the request itself is wrong and will fail again however often it is sent." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "\"Add retries\" is the start; jitter, budgets and placement are the answer.",
    questions: [
      { level: "core",
        q: "How do you make calls to an unreliable dependency safe?",
        strong: "A strong answer covers timeouts, backoff with jitter, idempotency, a budget, a breaker and a fallback.",
        answer: [
          { t: "p", text: "An explicit timeout on every call, set from the dependency's p99.9, and a request deadline passed downstream so a nearly expired request does not start new work. Retries only for transient errors and only for idempotent or keyed requests, with exponential backoff and full jitter so clients do not synchronise." },
          { t: "p", text: "Then limits: a retry budget so retries cannot exceed a small fraction of traffic, and a circuit breaker so that during a real outage I fail fast instead of calling at all. And a fallback where the product allows one — cached data, a default — so the dependency's failure degrades the feature rather than the page." }
        ] },

      { level: "advanced",
        q: "Explain why jitter matters in exponential backoff.",
        strong: "A strong answer describes synchronisation and the load shape it produces on recovery.",
        answer: [
          { t: "p", text: "Clients that failed at the same moment and follow the same deterministic schedule retry at the same moments, so each retry wave is the whole population at once — and the waves are largest exactly when the dependency is recovering and has the least headroom. Exponential spacing alone only spaces the waves out; it does not shrink them." },
          { t: "p", text: "Jitter randomises each delay — full jitter picks uniformly between zero and the exponential ceiling — so the population's retries spread across the interval and arrive as a stream the server can absorb. In a simulation of ten thousand clients, the peak after recovery fell from ten thousand a second to well under the server's capacity." }
        ] },

      { level: "advanced",
        q: "Where in a call chain should retries happen?",
        strong: "A strong answer explains amplification and picks one layer, with the mesh caveat.",
        answer: [
          { t: "p", text: "In one place. Retries compound multiplicatively through layers — three tries at four layers is 81 calls to the failing component — so if every team adds retries, an outage at the bottom becomes a load multiplier aimed at it. I would retry at the layer that makes the failing call and knows whether the error is transient, and have every other layer fail fast and propagate." },
          { t: "p", text: "With a service mesh I would configure retries in the mesh or in the application, not both, and set a retry budget in whichever owns them. The edge may retry once for the user's benefit if the whole request is idempotent." }
        ] }
    ]
  }
});
