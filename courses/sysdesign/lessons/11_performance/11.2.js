/* ============================================================================
   LESSON 11.2 — Little's Law, Queuing and Amdahl
   ========================================================================= */
EC.receiveLesson({
  id: "11.2",

  lede: "Three small pieces of mathematics explain most performance surprises. **Little's law** — L = λW — relates how many requests are in a system to how fast they arrive and how long each stays, and sizes every pool, thread count and connection limit. **Queueing** explains why latency does not grow steadily with load but explodes as utilisation nears 100%, and why variability and separate queues make it worse. **Amdahl's law** says the part of a job that cannot be parallelised caps the speed-up, however many machines you add. Each is checked here against a simulation or a real measurement, so the formulas earn their place.",

  objectives: [
    "Apply Little's law to size pools and estimate concurrency, and verify it in a simulation",
    "Explain the utilisation curve and why services are run well below 100%",
    "Show how variability and separate queues increase waiting, and how pooling reduces it",
    "Measure Amdahl's law on real cores and find the serial bottlenecks in a distributed system",
    "Size a worker pool against a queueing-time target"
  ],

  prerequisites: ["11.1", "2.2"],

  blocks: [

    { t: "h2", n: "01", id: "little", text: "Little's law",
      sub: "In-flight equals arrival rate times time in system" },

    { t: "viz", title: "L = λ × W",
      caption: "Requests arrive at rate λ, stay for W seconds on average, and while they are inside they occupy something — a thread, a connection, memory. On average there are L of them. John Little proved in 1961 that this holds for any stable system, whatever the distribution of arrivals or service times, which is what makes it so useful.",
      svg: `<svg viewBox="0 0 760 170" width="100%" role="img" aria-label="Little's law">
<defs><marker id="ll-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--ink-3)"/></marker></defs>
<circle cx="40" cy="80" r="7" style="fill:var(--accent);fill-opacity:.6"/>
<circle cx="66" cy="80" r="7" style="fill:var(--accent);fill-opacity:.6"/>
<circle cx="92" cy="80" r="7" style="fill:var(--accent);fill-opacity:.6"/>
<circle cx="118" cy="80" r="7" style="fill:var(--accent);fill-opacity:.6"/>
<circle cx="144" cy="80" r="7" style="fill:var(--accent);fill-opacity:.6"/>
<text x="92" y="118" text-anchor="middle" class="s-label" style="fill:var(--accent)">λ arrivals per second</text>
<line x1="178" y1="80" x2="248" y2="80" style="stroke:var(--ink-3)" stroke-width="1.6" marker-end="url(#ll-a)"/>
<rect x="250" y="34" width="260" height="92" rx="14" class="s-fill" style="stroke:var(--violet)" stroke-width="1.8"/>
<circle cx="280" cy="72" r="8" style="fill:var(--violet);fill-opacity:.5"/>
<circle cx="312" cy="72" r="8" style="fill:var(--violet);fill-opacity:.5"/>
<circle cx="344" cy="72" r="8" style="fill:var(--violet);fill-opacity:.5"/>
<circle cx="376" cy="72" r="8" style="fill:var(--violet);fill-opacity:.5"/>
<circle cx="408" cy="72" r="8" style="fill:var(--violet);fill-opacity:.5"/>
<circle cx="440" cy="72" r="8" style="fill:var(--violet);fill-opacity:.5"/>
<circle cx="472" cy="72" r="8" style="fill:var(--violet);fill-opacity:.5"/>
<text x="380" y="106" text-anchor="middle" class="s-label">L requests inside, on average</text>
<line x1="512" y1="80" x2="582" y2="80" style="stroke:var(--ink-3)" stroke-width="1.6" marker-end="url(#ll-a)"/>
<circle cx="608" cy="80" r="7" style="fill:var(--good);fill-opacity:.6"/>
<circle cx="634" cy="80" r="7" style="fill:var(--good);fill-opacity:.6"/>
<circle cx="660" cy="80" r="7" style="fill:var(--good);fill-opacity:.6"/>
<text x="634" y="118" text-anchor="middle" class="s-label" style="fill:var(--good)">done</text>
<line x1="262" y1="146" x2="498" y2="146" style="stroke:var(--warn)" stroke-width="1.5" marker-end="url(#ll-a)"/>
<text x="380" y="140" text-anchor="middle" class="s-sub" style="fill:var(--warn)">each stays W seconds</text>
<text x="380" y="22" text-anchor="middle" class="s-label">L = λ × W, for any stable system — whatever the distributions</text>
</svg>` },

    { t: "p", text: "Rearranged, it answers everyday questions. A service receiving **1,000 req/s** whose requests each hold a database connection for **50 ms** keeps **50 connections busy** on average. A queue consumer that must process **200 messages/s** taking **0.5 s** each needs at least **100** messages in flight. A page whose requests take 200 ms at 5,000 req/s has 1,000 requests in progress — each holding memory. The law is exact for averages, which the simulation below confirms before using it:" },

    { t: "code", lang: "python", title: "queueing.py — Little's law checked, then the utilisation curve", code: `import heapq, random

def simulate(arrival_rate, service, servers=1, n=200_000, seed=1):
    """Requests arrive at random (Poisson); each needs \`service()\` seconds from one of \`servers\` workers.
    Returns (mean time in system, p99 time in system, average number in system)."""
    rng = random.Random(seed)
    free_at = [0.0] * servers                          # when each worker next becomes free
    t, times, busy_area = 0.0, [], 0.0
    for _ in range(n):
        t += rng.expovariate(arrival_rate)
        w = min(range(servers), key=free_at.__getitem__)  # one shared queue: the first free worker takes it
        start = max(t, free_at[w]); s = service(rng)
        free_at[w] = start + s
        times.append(free_at[w] - t)
    times.sort()
    mean_w = sum(times) / n
    return mean_w, times[int(n * 0.99)], arrival_rate * mean_w            # L = λW, checked below

S = 0.010                                              # 10 ms of work per request
exp_service = lambda rng: rng.expovariate(1 / S)       # variable work, mean 10 ms
fixed_service = lambda rng: S                          # identical work every time

# Little's law, checked: measure L directly by sampling the queue length, compare with λ × W
def measured_L(arrival_rate, n=100_000, seed=2):
    rng = random.Random(seed); t, events = 0.0, []
    free_at = 0.0
    for _ in range(n):
        t += rng.expovariate(arrival_rate); start = max(t, free_at); free_at = start + rng.expovariate(1 / S)
        events += [(t, +1), (free_at, -1)]
    events.sort(); area, inside, last = 0.0, 0, 0.0
    for when, d in events: area += inside * (when - last); inside += d; last = when
    return area / last
lam = 70
w, _, little = simulate(lam, exp_service, seed=2, n=100_000)
print(f"Little's law at 70 req/s: λ × W = {lam} × {w * 1000:.1f} ms = {little:.2f};  time-averaged count in system = {measured_L(lam):.2f}")

print(f"\\n{'utilisation':>11} {'variable work':>22} {'fixed work':>22} {'4 workers, one queue':>22}")
print(f"{'':>11} {'mean':>10} {'p99':>11} {'mean':>10} {'p99':>11} {'mean':>10} {'p99':>11}")
for rho in (0.5, 0.7, 0.8, 0.9, 0.95):
    a = simulate(rho / S, exp_service); b = simulate(rho / S, fixed_service); c = simulate(4 * rho / S, exp_service, servers=4)
    print(f"{rho:>11.0%}" + "".join(f"{m * 1000:>8.1f}ms {p * 1000:>8.1f}ms" + " " for m, p, _ in (a, b, c)).rstrip())`,
      hl: [11, 12, 17, 24],
      out: `Little's law at 70 req/s: λ × W = 70 × 32.6 ms = 2.28;  time-averaged count in system = 2.28

utilisation          variable work             fixed work   4 workers, one queue
                  mean         p99       mean         p99       mean         p99
        50%    20.0ms     91.8ms     15.0ms     43.3ms     10.9ms     47.5ms
        70%    33.1ms    151.7ms     21.5ms     73.7ms     13.5ms     55.1ms
        80%    49.7ms    236.0ms     29.8ms    111.2ms     17.3ms     70.2ms
        90%    98.6ms    485.8ms     55.0ms    216.3ms     29.2ms    127.0ms
        95%   220.4ms   1194.3ms    102.6ms    402.9ms     59.6ms    304.0ms` },

    { t: "p", text: "λ × W gave 2.28 and the time-averaged count of requests actually in the system was 2.28. Little's law tells you the **average** demand; it says nothing about the peaks, which is why it gives a pool's minimum size, not its right size." },

    { t: "h2", n: "02", id: "utilisation", text: "The utilisation curve",
      sub: "Why 90% busy is not 10% spare" },

    { t: "viz", title: "Mean time in system as utilisation rises",
      caption: "Measured from the simulation above, for 10 ms of work per request. With variable work on one worker, time in system follows 10 ms ÷ (1 − utilisation): 20 ms at 50%, 100 ms at 90%, 220 ms at 95%. Identical work per request queues about half as much. Four workers sharing one queue at the same per-worker utilisation queue far less — at 90% busy, 29 ms instead of 99.",
      svg: `<svg viewBox="0 0 760 280" width="100%" role="img">
<line x1="64" y1="234.0" x2="610" y2="234.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="238.0" text-anchor="end" class="s-sub">0 ms</text>
<line x1="64" y1="180.0" x2="610" y2="180.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="184.0" text-anchor="end" class="s-sub">60 ms</text>
<line x1="64" y1="126.0" x2="610" y2="126.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="130.0" text-anchor="end" class="s-sub">120 ms</text>
<line x1="64" y1="72.0" x2="610" y2="72.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="76.0" text-anchor="end" class="s-sub">180 ms</text>
<line x1="64" y1="18.0" x2="610" y2="18.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="22.0" text-anchor="end" class="s-sub">240 ms</text>
<text x="64.0" y="252" text-anchor="middle" class="s-sub">50%</text>
<text x="200.5" y="252" text-anchor="middle" class="s-sub">70%</text>
<text x="337.0" y="252" text-anchor="middle" class="s-sub">80%</text>
<text x="473.5" y="252" text-anchor="middle" class="s-sub">90%</text>
<text x="610.0" y="252" text-anchor="middle" class="s-sub">95%</text>
<text x="337.0" y="274" text-anchor="middle" class="s-sub">utilisation</text>
<text x="14" y="126.0" text-anchor="middle" class="s-sub" transform="rotate(-90 14 126.0)">mean time in system (10 ms of work)</text>
<polyline points="64.0,216.0 200.5,204.2 337.0,189.3 473.5,145.3 610.0,35.6" style="fill:none;stroke:var(--crit)" stroke-width="2.2"/>
<circle cx="64.0" cy="216.0" r="3.6" style="fill:var(--crit)"/>
<circle cx="200.5" cy="204.2" r="3.6" style="fill:var(--crit)"/>
<circle cx="337.0" cy="189.3" r="3.6" style="fill:var(--crit)"/>
<circle cx="473.5" cy="145.3" r="3.6" style="fill:var(--crit)"/>
<circle cx="610.0" cy="35.6" r="3.6" style="fill:var(--crit)"/>
<line x1="626" y1="28" x2="644" y2="28" style="stroke:var(--crit)" stroke-width="2.4"/>
<text x="650" y="32" class="s-sub" style="fill:var(--ink-2)">1 worker, variable</text>
<polyline points="64.0,220.5 200.5,214.7 337.0,207.2 473.5,184.5 610.0,141.7" style="fill:none;stroke:var(--warn)" stroke-width="2.2"/>
<circle cx="64.0" cy="220.5" r="3.6" style="fill:var(--warn)"/>
<circle cx="200.5" cy="214.7" r="3.6" style="fill:var(--warn)"/>
<circle cx="337.0" cy="207.2" r="3.6" style="fill:var(--warn)"/>
<circle cx="473.5" cy="184.5" r="3.6" style="fill:var(--warn)"/>
<circle cx="610.0" cy="141.7" r="3.6" style="fill:var(--warn)"/>
<line x1="626" y1="50" x2="644" y2="50" style="stroke:var(--warn)" stroke-width="2.4"/>
<text x="650" y="54" class="s-sub" style="fill:var(--ink-2)">1 worker, fixed</text>
<polyline points="64.0,224.2 200.5,221.8 337.0,218.4 473.5,207.7 610.0,180.4" style="fill:none;stroke:var(--good)" stroke-width="2.2"/>
<circle cx="64.0" cy="224.2" r="3.6" style="fill:var(--good)"/>
<circle cx="200.5" cy="221.8" r="3.6" style="fill:var(--good)"/>
<circle cx="337.0" cy="218.4" r="3.6" style="fill:var(--good)"/>
<circle cx="473.5" cy="207.7" r="3.6" style="fill:var(--good)"/>
<circle cx="610.0" cy="180.4" r="3.6" style="fill:var(--good)"/>
<line x1="626" y1="72" x2="644" y2="72" style="stroke:var(--good)" stroke-width="2.4"/>
<text x="650" y="76" class="s-sub" style="fill:var(--ink-2)">4 workers, 1 queue</text>
</svg>` },

    { t: "p", text: "Requests arrive in clumps even when the average rate is steady, and work varies, so some arrive while a worker is busy and wait. As utilisation rises, the chance of waiting and the length of the queue both grow, and near 100% they grow without bound: for a single queue with random arrivals and service, time in system is the service time divided by (1 − ρ). The p99 columns grow faster still — **1.2 seconds** at 95% for 10 ms of work. This is why capacity targets are set around **60–80%** at peak, not 95%." },

    { t: "dl", items: [
      { term: "Variability costs latency", def: "The same load with constant work per request queued about half as much as with exponentially variable work. Reducing variance — splitting large requests, separating slow request types into their own pool (7.2) — is as effective as adding capacity." },
      { term: "Pooling saves latency", def: "Four workers fed from one shared queue waited far less than four workers with a queue each would, because a request never waits behind a busy worker while another is idle. Per-worker queues with random assignment behave like the single-worker column. This is why least-loaded balancing (2.2) and a shared work queue beat random assignment." },
      { term: "Overload is not a slower steady state", def: "Above 100% the queue grows without limit until something breaks — memory, timeouts, retries (7.1). Bound queues and shed load (7.4) rather than letting them grow." }
    ] },

    { t: "h2", n: "03", id: "amdahl", text: "Amdahl's law",
      sub: "The serial part sets the ceiling" },

    { t: "p", text: "If a fraction S of a job must run serially, the best speed-up from N workers is 1 ÷ (S + (1 − S) ÷ N), and no number of workers beats 1 ÷ S. Measured on this machine's four cores with a job that is 10% serial:" },

    { t: "code", lang: "python", title: "amdahl.py — a job with a 10% serial part, on 1, 2 and 4 processes", code: `import multiprocessing as mp, time

def work(units):                                    # CPU-bound busy work
    x = 0
    for i in range(units): x = (x * 31 + i) % 1_000_003
    return x

TOTAL, SERIAL = 16_000_000, 0.10                    # 10% of the job cannot be split

def job(pool, procs):
    work(int(TOTAL * SERIAL))                        # e.g. reading input, merging results, a global lock
    share = int(TOTAL * (1 - SERIAL) / procs)
    pool.map(work, [share] * procs)

def timed(fn):
    start = time.perf_counter(); fn(); return time.perf_counter() - start

if __name__ == "__main__":
    results = {}
    for procs in (1, 2, 4):
        with mp.get_context("fork").Pool(procs) as pool:
            pool.map(work, [1] * procs)              # warm the pool up
            best = min(timed(lambda: job(pool, procs)) for _ in range(3))
        results[procs] = best
    amdahl = lambda n: 1 / (SERIAL + (1 - SERIAL) / n)
    print(f"{'processes':>9} {'time':>8} {'measured speed-up':>18} {'Amdahl predicts':>16}")
    for n, t in results.items():
        print(f"{n:>9} {t:>7.2f}s {results[1] / t:>18.2f} {amdahl(n):>16.2f}")
    for n in (16, 64, 1024):
        print(f"{n:>9} {'':>8} {'':>18} {amdahl(n):>16.2f}")
    print(f"{'∞':>9} {'':>8} {'':>18} {1 / SERIAL:>16.2f}")`,
      hl: [11, 13],
      out: `processes     time  measured speed-up  Amdahl predicts
        1    0.69s               1.00             1.00
        2    0.39s               1.76             1.82
        4    0.23s               3.01             3.08
       16                                         6.40
       64                                         8.77
     1024                                         9.91
        ∞                                        10.00` },

    { t: "viz", title: "Speed-up against the number of workers, by serial fraction",
      caption: "Amdahl's law for serial fractions of 1%, 5%, 10% and 25%. The measured run tracked its 10% curve closely — 1.8× on two processes, about 2.9× on four against 3.1 predicted. With 10% serial work, 128 workers give under 9.3× and infinitely many give 10×. The flattening curves are why profiling the serial part beats adding servers.",
      svg: `<svg viewBox="0 0 760 280" width="100%" role="img">
<line x1="64" y1="234.0" x2="610" y2="234.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="238.0" text-anchor="end" class="s-sub">0×</text>
<line x1="64" y1="180.0" x2="610" y2="180.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="184.0" text-anchor="end" class="s-sub">15×</text>
<line x1="64" y1="126.0" x2="610" y2="126.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="130.0" text-anchor="end" class="s-sub">30×</text>
<line x1="64" y1="72.0" x2="610" y2="72.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="76.0" text-anchor="end" class="s-sub">45×</text>
<line x1="64" y1="18.0" x2="610" y2="18.0" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="56" y="22.0" text-anchor="end" class="s-sub">60×</text>
<text x="64.0" y="252" text-anchor="middle" class="s-sub">1</text>
<text x="142.0" y="252" text-anchor="middle" class="s-sub">2</text>
<text x="220.0" y="252" text-anchor="middle" class="s-sub">4</text>
<text x="298.0" y="252" text-anchor="middle" class="s-sub">8</text>
<text x="376.0" y="252" text-anchor="middle" class="s-sub">16</text>
<text x="454.0" y="252" text-anchor="middle" class="s-sub">32</text>
<text x="532.0" y="252" text-anchor="middle" class="s-sub">64</text>
<text x="610.0" y="252" text-anchor="middle" class="s-sub">128</text>
<text x="337.0" y="274" text-anchor="middle" class="s-sub">processors or servers</text>
<text x="14" y="126.0" text-anchor="middle" class="s-sub" transform="rotate(-90 14 126.0)">speed-up</text>
<polyline points="64.0,230.4 142.0,226.9 220.0,220.0 298.0,207.1 376.0,183.9 454.0,146.1 532.0,92.7 610.0,31.0" style="fill:none;stroke:var(--good)" stroke-width="2.2"/>
<circle cx="64.0" cy="230.4" r="3.6" style="fill:var(--good)"/>
<circle cx="142.0" cy="226.9" r="3.6" style="fill:var(--good)"/>
<circle cx="220.0" cy="220.0" r="3.6" style="fill:var(--good)"/>
<circle cx="298.0" cy="207.1" r="3.6" style="fill:var(--good)"/>
<circle cx="376.0" cy="183.9" r="3.6" style="fill:var(--good)"/>
<circle cx="454.0" cy="146.1" r="3.6" style="fill:var(--good)"/>
<circle cx="532.0" cy="92.7" r="3.6" style="fill:var(--good)"/>
<circle cx="610.0" cy="31.0" r="3.6" style="fill:var(--good)"/>
<line x1="626" y1="28" x2="644" y2="28" style="stroke:var(--good)" stroke-width="2.4"/>
<text x="650" y="32" class="s-sub" style="fill:var(--ink-2)">serial 1%</text>
<polyline points="64.0,230.4 142.0,227.1 220.0,221.5 298.0,212.7 376.0,201.1 454.0,188.8 532.0,178.5 610.0,171.3" style="fill:none;stroke:var(--accent)" stroke-width="2.2"/>
<circle cx="64.0" cy="230.4" r="3.6" style="fill:var(--accent)"/>
<circle cx="142.0" cy="227.1" r="3.6" style="fill:var(--accent)"/>
<circle cx="220.0" cy="221.5" r="3.6" style="fill:var(--accent)"/>
<circle cx="298.0" cy="212.7" r="3.6" style="fill:var(--accent)"/>
<circle cx="376.0" cy="201.1" r="3.6" style="fill:var(--accent)"/>
<circle cx="454.0" cy="188.8" r="3.6" style="fill:var(--accent)"/>
<circle cx="532.0" cy="178.5" r="3.6" style="fill:var(--accent)"/>
<circle cx="610.0" cy="171.3" r="3.6" style="fill:var(--accent)"/>
<line x1="626" y1="50" x2="644" y2="50" style="stroke:var(--accent)" stroke-width="2.4"/>
<text x="650" y="54" class="s-sub" style="fill:var(--ink-2)">serial 5%</text>
<polyline points="64.0,230.4 142.0,227.5 220.0,222.9 298.0,217.1 376.0,211.0 454.0,205.9 532.0,202.4 610.0,200.4" style="fill:none;stroke:var(--warn)" stroke-width="2.2"/>
<circle cx="64.0" cy="230.4" r="3.6" style="fill:var(--warn)"/>
<circle cx="142.0" cy="227.5" r="3.6" style="fill:var(--warn)"/>
<circle cx="220.0" cy="222.9" r="3.6" style="fill:var(--warn)"/>
<circle cx="298.0" cy="217.1" r="3.6" style="fill:var(--warn)"/>
<circle cx="376.0" cy="211.0" r="3.6" style="fill:var(--warn)"/>
<circle cx="454.0" cy="205.9" r="3.6" style="fill:var(--warn)"/>
<circle cx="532.0" cy="202.4" r="3.6" style="fill:var(--warn)"/>
<circle cx="610.0" cy="200.4" r="3.6" style="fill:var(--warn)"/>
<line x1="626" y1="72" x2="644" y2="72" style="stroke:var(--warn)" stroke-width="2.4"/>
<text x="650" y="76" class="s-sub" style="fill:var(--ink-2)">serial 10%</text>
<polyline points="64.0,230.4 142.0,228.2 220.0,225.8 298.0,223.5 376.0,221.9 454.0,220.8 532.0,220.2 610.0,219.9" style="fill:none;stroke:var(--crit)" stroke-width="2.2"/>
<circle cx="64.0" cy="230.4" r="3.6" style="fill:var(--crit)"/>
<circle cx="142.0" cy="228.2" r="3.6" style="fill:var(--crit)"/>
<circle cx="220.0" cy="225.8" r="3.6" style="fill:var(--crit)"/>
<circle cx="298.0" cy="223.5" r="3.6" style="fill:var(--crit)"/>
<circle cx="376.0" cy="221.9" r="3.6" style="fill:var(--crit)"/>
<circle cx="454.0" cy="220.8" r="3.6" style="fill:var(--crit)"/>
<circle cx="532.0" cy="220.2" r="3.6" style="fill:var(--crit)"/>
<circle cx="610.0" cy="219.9" r="3.6" style="fill:var(--crit)"/>
<line x1="626" y1="94" x2="644" y2="94" style="stroke:var(--crit)" stroke-width="2.4"/>
<text x="650" y="98" class="s-sub" style="fill:var(--ink-2)">serial 25%</text>
</svg>` },

    { t: "table", head: ["Serial point in a distributed system", "How to remove or shrink it"], rows: [
      ["A single database primary for all writes", "shard by key (4.2); move reads to replicas (4.1)"],
      ["A hot row or a global counter", "split the counter, batch updates, CRDT counters (8.6)"],
      ["A global lock or leader", "partition the lock's scope; one leader per shard"],
      ["A single-threaded consumer", "partition the stream; one consumer per partition (6.3)"],
      ["Aggregating fan-out results at one node", "tree aggregation; partial results (11.1)"],
      ["Sequential ID generation", "per-node ranges, Snowflake-style IDs, UUIDv7"]
    ] },

    { t: "callout", kind: "insight", title: "Beyond Amdahl: when adding nodes makes it slower",
      body: [
        { t: "p", text: "Neil Gunther's **Universal Scalability Law** adds a second cost: coherency, the work nodes spend keeping each other consistent — cache invalidation, distributed locks, consensus, cross-shard queries. It grows with the number of pairs of nodes, so throughput rises, peaks and then **falls** as nodes are added. A system that got slower after scaling out usually has a coherency cost, and the fix is to reduce cross-node coordination, not to add more nodes." }
      ] },

    { t: "callout", kind: "trap", title: "\"Pick two of throughput, latency and cost\"",
      body: [
        { t: "p", text: "A common slogan says you can optimise only two of the three. The curves above show what is actually true: at a fixed amount of hardware, pushing throughput towards capacity raises latency non-linearly, and batching trades latency for throughput. But removing a serial bottleneck, reducing variance or pooling queues improves latency and throughput at the same cost. Treat it as a curve to locate yourself on, not a law that forbids improvement." }
      ] },

    { t: "exercise", kind: "Challenge", title: "Size a worker pool",
      difficulty: "core", minutes: 25,
      body: [
        { t: "p", text: "A service receives 400 requests per second; each needs 50 ms of a worker on average, varying randomly. Use Little's law for the minimum pool size, then simulate pools of increasing size to find the smallest that keeps the **p99 time spent queued** below 10 ms. Report the p99 total latency too, and explain why it stops improving." }
      ],
      requirements: [
        "Little's law for the average number of busy workers",
        "A shared-queue simulation with Poisson arrivals and exponential service times",
        "For each pool size: utilisation, p99 queued time, p99 total time",
        "Identify the smallest pool that meets the target"
      ],
      hint: "Track for each request the time it waited before a worker started it separately from the total time. Utilisation is λ × mean service time ÷ workers.",
      solution: { lang: "python", title: "poolsize_ex.py",
        code: `import random

def simulate(rate, mean_service, workers, n=200_000, seed=4):
    """M/M/c: Poisson arrivals, exponential service, one shared queue.
    Returns p99 of time spent QUEUED, p99 of total time, and utilisation."""
    rng = random.Random(seed); free_at = [0.0] * workers; t = 0.0; waits, totals = [], []
    for _ in range(n):
        t += rng.expovariate(rate)
        w = min(range(workers), key=free_at.__getitem__)
        start = max(t, free_at[w]); free_at[w] = start + rng.expovariate(1 / mean_service)
        waits.append(start - t); totals.append(free_at[w] - t)
    waits.sort(); totals.sort()
    return waits[int(n * 0.99)], totals[int(n * 0.99)], rate * mean_service / workers

RATE, SERVICE, TARGET_WAIT = 400, 0.050, 0.010       # 400 req/s, 50 ms of work each, p99 queueing under 10 ms
print(f"Little's law: {RATE} req/s × {SERVICE * 1000:.0f} ms = {RATE * SERVICE:.0f} workers busy on average\\n")
print(f"{'workers':>8} {'utilisation':>12} {'p99 queued':>11} {'p99 total':>10}")
chosen = None
for workers in (21, 22, 24, 26, 28, 30, 35):
    wait, total, util = simulate(RATE, SERVICE, workers)
    mark = ""
    if chosen is None and wait <= TARGET_WAIT: chosen, mark = workers, "   <- smallest pool meeting the target"
    print(f"{workers:>8} {util:>12.0%} {wait * 1000:>9.1f}ms {total * 1000:>8.0f}ms{mark}")`,
        out: `Little's law: 400 req/s × 50 ms = 20 workers busy on average

 workers  utilisation  p99 queued  p99 total
      21          95%     208.4ms      309ms
      22          91%     101.0ms      250ms
      24          83%      39.8ms      233ms
      26          77%      20.0ms      230ms
      28          71%      10.5ms      229ms
      30          67%       3.9ms      229ms   <- smallest pool meeting the target
      35          57%       0.0ms      229ms`,
        notes: [
          { t: "p", text: "Little's law says 20 workers are busy on average, so 20 is the floor — at exactly 20 the system would be at 100% and the queue unbounded. With 21 workers, at 95% utilisation, the p99 request queued for over 200 ms. Each extra worker cut queueing sharply, and 30 workers, at 67% utilisation, met the 10 ms target: a 50% margin above the average, bought for the tail." },
          { t: "p", text: "The p99 total time stopped improving at about 230 ms, because that is the p99 of the work itself: for exponentially distributed 50 ms work, the slowest 1% take over 230 ms however many workers wait to run them. More capacity removes queueing; it cannot make slow work fast. That needs the work itself to change — 11.3's queries, 11.1's hedging." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: a pool sized for the average",
      body: [
        { t: "p", text: "**Symptom.** An order service with a database pool of 25 connections ran fine for months, then began timing out every afternoon peak, although database CPU stayed under 40% and the app servers were mostly idle." },
        { t: "p", text: "**Mechanism.** The pool had been sized with Little's law on average traffic: 500 queries/s × 40 ms = 20, plus a margin. At the afternoon peak traffic reached 600 queries/s, and a new report query held connections for 300 ms. Busy connections averaged about 24 of 25 — over 95% utilisation — so requests queued for a connection, timed out, and retried, adding load. Neither CPU graph showed it, because the bottleneck was the pool." },
        { t: "p", text: "**Fix.** The report query moved to a read replica with its own pool (7.2's bulkheads), the main pool was sized from peak traffic and p99 query time with utilisation kept under 75%, and pool wait time and pool utilisation became dashboard metrics with alerts. 11.3 takes connection pools further." }
      ] }
  ],

  takeaways: [
    "**Little's law**, L = λW, holds for any stable system: measured, λ × W = **2.28** and the time-averaged count was **2.28**.",
    "Use it for the **minimum** size of pools, threads and in-flight limits — 1,000 req/s × 50 ms = 50 busy connections — then add headroom for peaks.",
    "Latency grows non-linearly with **utilisation**: measured, 10 ms of work took **20 ms at 50%**, **99 ms at 90%** and **220 ms at 95%**, with p99 over **1.2 s**.",
    "Run at **60–80% at peak**; bound queues and shed load beyond it.",
    "**Variability** costs latency: constant work queued about half as much; **pooling** saves it: four workers on one queue waited far less than separate queues.",
    "**Amdahl's law** caps speed-up at 1 ÷ serial fraction: measured, a 10%-serial job ran **2.9× faster on 4 cores** (3.1 predicted) and can never exceed 10×.",
    "Find and shrink the **serial points**: a single primary, hot rows, global locks, single consumers, central aggregation.",
    "Coherency costs can make throughput **fall** as nodes are added (the Universal Scalability Law).",
    "Measured: a 400 req/s, 50 ms service needed **30 workers** — 50% above Little's minimum of 20 — to keep p99 queueing under 10 ms; more capacity cannot shorten slow work."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A service handles 2,000 requests per second, and each holds a database connection for 25 ms. On average, how many connections are in use?",
        options: ["25", "50", "80", "2,000"],
        answer: 1,
        why: "L = λ × W = 2,000/s × 0.025 s = 50. This is the average; the pool needs headroom above it for bursts and slow queries." },

      { stem: "A single-worker queue with random arrivals and work has a mean service time of 10 ms. Roughly what is the mean time in system at 90% utilisation?",
        options: ["11 ms", "19 ms", "100 ms", "900 ms"],
        answer: 2,
        why: "Time in system ≈ service time ÷ (1 − ρ) = 10 ms ÷ 0.1 = 100 ms; the simulation measured 98.6 ms. Latency does not rise in proportion to load: the last 10% of utilisation costs far more than the first 50%." },

      { stem: "A job is 5% serial. What is the most speed-up you can get from adding processors?",
        options: ["5×", "20×", "95×", "Unlimited"],
        answer: 1,
        why: "Amdahl's ceiling is 1 ÷ S = 1 ÷ 0.05 = 20×, approached only as processors go to infinity. The serial part takes the same time however many processors run the rest." },

      { stem: "Four workers can serve requests either from one shared queue or from a queue each, with requests assigned at random. Which waits less, and why?",
        options: ["Separate queues, because each queue is shorter", "The shared queue, because a request never waits behind a busy worker while another worker is idle", "They are identical", "Separate queues, because of less locking"],
        answer: 1,
        why: "With separate queues, one can back up while another worker sits idle; a shared queue hands each request to the first free worker. At 90% utilisation the simulation's shared queue averaged 29 ms against about 99 ms for a single-worker queue." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "These laws turn hand-waving into numbers; use them out loud.",
    questions: [
      { level: "core",
        q: "Explain Little's law and how you would use it to size a connection pool.",
        strong: "A strong answer applies the formula, adds headroom from queueing, and considers the database side.",
        answer: [
          { t: "p", text: "L = λW: the average number in the system equals the arrival rate times the average time each spends there. For a pool, λ is queries per second needing a connection and W is how long each holds it, including round trips. At 1,000 queries/s and 50 ms that is 50 connections busy on average across the fleet." },
          { t: "p", text: "That is the floor. Because latency explodes near full utilisation, I size for peak traffic and p99 hold time, keeping utilisation around 70–75%, and divide by the number of app instances. Then I check the database can take the total — often with a pooler such as PgBouncer in front — and validate with a load test, watching pool wait time." }
        ] },

      { level: "advanced",
        q: "Why should a service not run at 95% utilisation?",
        strong: "A strong answer explains the queueing curve, variance, and what happens under bursts and overload.",
        answer: [
          { t: "p", text: "Because waiting time grows like 1 ÷ (1 − utilisation): at 50% a request spends about twice its service time in the system, at 90% ten times, at 95% twenty times, and the p99 much more. Real traffic is bursty and work is variable, so at 95% the bursts have nowhere to go." },
          { t: "p", text: "There is also no headroom for a node failing, a deploy draining instances or a retry wave — any of which pushes utilisation past 100%, where queues grow without limit. So I target 60–80% at peak, keep queues bounded, and shed load deliberately beyond that." }
        ] },

      { level: "advanced",
        q: "Adding servers stopped improving throughput. How do you investigate?",
        strong: "A strong answer uses Amdahl and the Universal Scalability Law to direct the investigation.",
        answer: [
          { t: "p", text: "That is the signature of a serial bottleneck or a coherency cost. I would look for the shared resource every request touches: a single database primary, a hot row or counter, a global lock, a single-partition topic, a central aggregator, a sequence generator. Profiling and per-resource utilisation usually point at one." },
          { t: "p", text: "If throughput actually fell with more nodes, coordination between nodes is growing — cache invalidations, distributed locks, cross-shard queries, gossip. Then I would partition the hot resource, batch or remove coordination, and only then scale out again." }
        ] }
    ]
  }
});
