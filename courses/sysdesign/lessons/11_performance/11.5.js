/* ============================================================================
   LESSON 11.5 — SLOs, Error Budgets and Observability
   ========================================================================= */
EC.receiveLesson({
  id: "11.5",

  lede: "\"Is the system reliable enough?\" needs a number to be answerable. Site reliability engineering supplies three: an **SLI**, a measurement of what users experience; an **SLO**, the target for it; and the **error budget**, the unreliability the target permits — which turns the argument between shipping features and stabilising into a policy both sides agreed in advance. Alerting on how fast that budget is burning catches a sharp outage in minutes and a slow leak in hours, without paging anyone for a three-minute blip. Measuring any of it requires **observability**: metrics to see that something is wrong, traces to see where, and logs to see why.",

  objectives: [
    "Tell SLI, SLO and SLA apart, and choose SLIs that reflect user experience",
    "Compute an error budget and use it as a release policy",
    "Alert on burn rate with multiple windows, and compare it with threshold alerts",
    "Use metrics, logs and traces for what each does best, with RED and USE as checklists",
    "Find a request's critical path and self time from a distributed trace"
  ],

  prerequisites: ["11.1", "7.5"],

  blocks: [

    { t: "h2", n: "01", id: "slo", text: "SLI, SLO, SLA",
      sub: "A measurement, a target, a contract" },

    { t: "diagram", kind: "layers", title: "Three terms that are often confused",
      caption: "The SLI is a ratio of good events to all events, measured where users feel it — at the load balancer or the client, not on a server's CPU. The SLO sets the target over a window. The SLA is a business contract with consequences, deliberately looser than the SLO so that the team has warning before it owes anyone money.",
      items: [
        { label: "SLI — service level indicator", sub: "good events ÷ valid events: requests served under 300 ms without a 5xx", tone: "accent" },
        { label: "SLO — service level objective", sub: "the target for an SLI over a window: 99.9% over 30 days", tone: "good" },
        { label: "SLA — service level agreement", sub: "a contract with penalties: 99.5% monthly, or service credits", tone: "warn" }
      ] },

    { t: "table", head: ["Kind of service", "Good SLIs"], rows: [
      ["Request–response API", "availability (non-5xx ratio); latency (share of requests under a threshold)"],
      ["Data pipeline", "freshness (age of the newest processed data); correctness; coverage"],
      ["Storage", "durability; availability of reads and writes; latency"],
      ["Streaming / queues", "end-to-end lag; share of messages delivered within N seconds"]
    ] },

    { t: "callout", kind: "trap", title: "100% is the wrong target",
      body: [
        { t: "p", text: "Users cannot tell 99.99% from 100% through their own Wi-Fi, phone networks and browsers, and every extra nine costs roughly ten times more — more redundancy (7.5), slower releases, more people on call. An SLO should be set by what users need and the business will pay for, and be **lower** than the reliability of what you depend on can deliver: a service built on a 99.95% database cannot honestly promise 99.99%." }
      ] },

    { t: "h2", n: "02", id: "budget", text: "The error budget",
      sub: "Unreliability you are allowed to spend" },

    { t: "p", text: "An SLO of 99.9% means 0.1% of requests may fail. That allowance is the **error budget**, and it is the useful part: while budget remains, the team ships, experiments and takes risks; when it is spent, feature releases pause and the work goes to reliability until it recovers. Both product and engineering agree to the policy before an incident, so nobody negotiates during one." },

    { t: "table", head: ["SLO", "Budget per 30 days", "Per year", "Per day"], rows: [
      ["99%", "7.2 hours", "87.6 hours", "14.4 minutes"],
      ["99.5%", "3.6 hours", "43.8 hours", "7.2 minutes"],
      ["99.9%", "43.2 minutes", "8.76 hours", "86 seconds"],
      ["99.95%", "21.6 minutes", "4.38 hours", "43 seconds"],
      ["99.99%", "4.3 minutes", "53 minutes", "8.6 seconds"],
      ["99.999%", "26 seconds", "5.3 minutes", "0.9 seconds"]
    ] },

    { t: "p", text: "The budget is measured in requests, not just minutes of total outage: 0.5% of requests failing for three days spends as much as a complete outage of about 22 minutes. A month of simulated traffic for a 99.9% service — quiet background errors, a three-minute blip, a sharp 25-minute outage and a three-day slow burn — with two ways of alerting:" },

    { t: "code", lang: "python", title: "burn.py — a threshold alert against multi-window burn-rate alerts", code: `import random

SLO = 0.999                                       # 99.9% of requests succeed, over 30 days
BUDGET = 1 - SLO
MINUTES, RPM = 30 * 24 * 60, 1000                 # one value per minute, 1,000 requests a minute

rng = random.Random(6)
err = [rng.uniform(0.0, 0.0006) for _ in range(MINUTES)]           # background: well inside the SLO
incidents = {"blip: 2% errors for 3 minutes":            (2 * 1440 + 600, 3, 0.02),
             "outage: 20% errors for 25 minutes":        (9 * 1440 + 300, 25, 0.20),
             "slow burn: 0.5% errors for 3 days":        (18 * 1440, 3 * 1440, 0.005)}
for start, length, rate in incidents.values():
    for m in range(start, start + length): err[m] = rate

def window(m, minutes):                            # error ratio over the last \`minutes\`
    lo = max(0, m - minutes + 1)
    return sum(err[lo:m + 1]) / (m + 1 - lo)

def threshold_alert(m):                            # "page if errors > 1% for 5 minutes"
    return all(err[k] > 0.01 for k in range(max(0, m - 4), m + 1))

def burn_rate_alert(m):                            # Google SRE workbook: multi-window, multi-burn-rate
    page = window(m, 60) > 14.4 * BUDGET and window(m, 5) > 14.4 * BUDGET     # 2% of the budget in 1 hour
    page |= window(m, 360) > 6 * BUDGET and window(m, 30) > 6 * BUDGET        # 5% in 6 hours
    ticket = window(m, 4320) > 1 * BUDGET and window(m, 360) > 1 * BUDGET     # 10% in 3 days
    return "page" if page else "ticket" if ticket else None

def first_fire(alert, start, length):
    for m in range(start, min(MINUTES, start + length + 360)):
        if alert(m): return m - start
    return None

spent = sum(err) * RPM / (BUDGET * MINUTES * RPM)
print(f"SLO {SLO:.1%}: budget {BUDGET * MINUTES:.1f} minutes of full outage per 30 days; this month used {spent:.0%} of it\\n")
print(f"{'incident':<36} {'budget used':>12} {'threshold alert':>17} {'burn-rate alert':>20}")
for name, (start, length, rate) in incidents.items():
    used = length * (rate - 0.0003) / (BUDGET * MINUTES)
    t, b = first_fire(threshold_alert, start, length), first_fire(burn_rate_alert, start, length)
    fmt = lambda x: "never" if x is None else f"after {x} min" if x < 120 else f"after {x / 60:.0f} h"
    kind = burn_rate_alert(start + b) if b is not None else ""
    print(f"{name:<36} {used:>12.1%} {fmt(t):>17} {fmt(b) + (' (' + kind + ')' if kind else ''):>20}")`,
      hl: [19, 22, 23, 24, 25],
      out: `SLO 99.9%: budget 43.2 minutes of full outage per 30 days; this month used 89% of it

incident                              budget used   threshold alert      burn-rate alert
blip: 2% errors for 3 minutes                0.1%             never                never
outage: 20% errors for 25 minutes           11.6%       after 4 min   after 4 min (page)
slow burn: 0.5% errors for 3 days           47.0%             never  after 11 h (ticket)` },

    { t: "viz", title: "The month's error budget",
      caption: "Budget remaining over the 30-day window, against an even spend. Background errors use it slowly; the outage on day 9 takes a visible step; the slow burn from day 18 to 21 takes almost half the budget in three days — more than the outage — and ends the month with 11% left. Only the burn-rate alert noticed it.",
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
<text x="64.0" y="232" text-anchor="middle" class="s-sub">0</text>
<text x="82.2" y="232" text-anchor="middle" class="s-sub"></text>
<text x="100.4" y="232" text-anchor="middle" class="s-sub"></text>
<text x="118.6" y="232" text-anchor="middle" class="s-sub"></text>
<text x="136.8" y="232" text-anchor="middle" class="s-sub"></text>
<text x="155.0" y="232" text-anchor="middle" class="s-sub">5</text>
<text x="173.2" y="232" text-anchor="middle" class="s-sub"></text>
<text x="191.4" y="232" text-anchor="middle" class="s-sub"></text>
<text x="209.6" y="232" text-anchor="middle" class="s-sub"></text>
<text x="227.8" y="232" text-anchor="middle" class="s-sub"></text>
<text x="246.0" y="232" text-anchor="middle" class="s-sub">10</text>
<text x="264.2" y="232" text-anchor="middle" class="s-sub"></text>
<text x="282.4" y="232" text-anchor="middle" class="s-sub"></text>
<text x="300.6" y="232" text-anchor="middle" class="s-sub"></text>
<text x="318.8" y="232" text-anchor="middle" class="s-sub"></text>
<text x="337.0" y="232" text-anchor="middle" class="s-sub">15</text>
<text x="355.2" y="232" text-anchor="middle" class="s-sub"></text>
<text x="373.4" y="232" text-anchor="middle" class="s-sub"></text>
<text x="391.6" y="232" text-anchor="middle" class="s-sub"></text>
<text x="409.8" y="232" text-anchor="middle" class="s-sub"></text>
<text x="428.0" y="232" text-anchor="middle" class="s-sub">20</text>
<text x="446.2" y="232" text-anchor="middle" class="s-sub"></text>
<text x="464.4" y="232" text-anchor="middle" class="s-sub"></text>
<text x="482.6" y="232" text-anchor="middle" class="s-sub"></text>
<text x="500.8" y="232" text-anchor="middle" class="s-sub"></text>
<text x="519.0" y="232" text-anchor="middle" class="s-sub">25</text>
<text x="537.2" y="232" text-anchor="middle" class="s-sub"></text>
<text x="555.4" y="232" text-anchor="middle" class="s-sub"></text>
<text x="573.6" y="232" text-anchor="middle" class="s-sub"></text>
<text x="591.8" y="232" text-anchor="middle" class="s-sub"></text>
<text x="610.0" y="232" text-anchor="middle" class="s-sub">30</text>
<text x="337.0" y="254" text-anchor="middle" class="s-sub">day of the 30-day window</text>
<text x="14" y="116.0" text-anchor="middle" class="s-sub" transform="rotate(-90 14 116.0)">error budget remaining</text>
<polyline points="64.0,18.0 82.2,19.9 100.4,21.9 118.6,24.2 136.8,26.1 155.0,28.1 173.2,30.0 191.4,32.0 209.6,33.9 227.8,35.9 246.0,60.6 264.2,62.5 282.4,64.4 300.6,66.5 318.8,68.4 337.0,70.3 355.2,72.3 373.4,74.3 391.6,76.3 409.8,108.9 428.0,141.6 446.2,174.3 464.4,176.2 482.6,178.2 500.8,180.1 519.0,182.0 537.2,184.0 555.4,186.0 573.6,187.9 591.8,189.9 610.0,191.9" style="fill:none;stroke:var(--good)" stroke-width="2.2"/>
<circle cx="64.0" cy="18.0" r="2" style="fill:var(--good)"/>
<circle cx="82.2" cy="19.9" r="2" style="fill:var(--good)"/>
<circle cx="100.4" cy="21.9" r="2" style="fill:var(--good)"/>
<circle cx="118.6" cy="24.2" r="2" style="fill:var(--good)"/>
<circle cx="136.8" cy="26.1" r="2" style="fill:var(--good)"/>
<circle cx="155.0" cy="28.1" r="2" style="fill:var(--good)"/>
<circle cx="173.2" cy="30.0" r="2" style="fill:var(--good)"/>
<circle cx="191.4" cy="32.0" r="2" style="fill:var(--good)"/>
<circle cx="209.6" cy="33.9" r="2" style="fill:var(--good)"/>
<circle cx="227.8" cy="35.9" r="2" style="fill:var(--good)"/>
<circle cx="246.0" cy="60.6" r="2" style="fill:var(--good)"/>
<circle cx="264.2" cy="62.5" r="2" style="fill:var(--good)"/>
<circle cx="282.4" cy="64.4" r="2" style="fill:var(--good)"/>
<circle cx="300.6" cy="66.5" r="2" style="fill:var(--good)"/>
<circle cx="318.8" cy="68.4" r="2" style="fill:var(--good)"/>
<circle cx="337.0" cy="70.3" r="2" style="fill:var(--good)"/>
<circle cx="355.2" cy="72.3" r="2" style="fill:var(--good)"/>
<circle cx="373.4" cy="74.3" r="2" style="fill:var(--good)"/>
<circle cx="391.6" cy="76.3" r="2" style="fill:var(--good)"/>
<circle cx="409.8" cy="108.9" r="2" style="fill:var(--good)"/>
<circle cx="428.0" cy="141.6" r="2" style="fill:var(--good)"/>
<circle cx="446.2" cy="174.3" r="2" style="fill:var(--good)"/>
<circle cx="464.4" cy="176.2" r="2" style="fill:var(--good)"/>
<circle cx="482.6" cy="178.2" r="2" style="fill:var(--good)"/>
<circle cx="500.8" cy="180.1" r="2" style="fill:var(--good)"/>
<circle cx="519.0" cy="182.0" r="2" style="fill:var(--good)"/>
<circle cx="537.2" cy="184.0" r="2" style="fill:var(--good)"/>
<circle cx="555.4" cy="186.0" r="2" style="fill:var(--good)"/>
<circle cx="573.6" cy="187.9" r="2" style="fill:var(--good)"/>
<circle cx="591.8" cy="189.9" r="2" style="fill:var(--good)"/>
<circle cx="610.0" cy="191.9" r="2" style="fill:var(--good)"/>
<line x1="626" y1="28" x2="644" y2="28" style="stroke:var(--good)" stroke-width="2.4"/>
<text x="650" y="32" class="s-sub" style="fill:var(--ink-2)">budget left</text>
<polyline points="64.0,18.0 82.2,24.5 100.4,31.1 118.6,37.6 136.8,44.1 155.0,50.7 173.2,57.2 191.4,63.7 209.6,70.3 227.8,76.8 246.0,83.3 264.2,89.9 282.4,96.4 300.6,102.9 318.8,109.5 337.0,116.0 355.2,122.5 373.4,129.1 391.6,135.6 409.8,142.1 428.0,148.7 446.2,155.2 464.4,161.7 482.6,168.3 500.8,174.8 519.0,181.3 537.2,187.9 555.4,194.4 573.6,200.9 591.8,207.5 610.0,214.0" style="fill:none;stroke:var(--ink-3)" stroke-width="2.2"/>
<circle cx="64.0" cy="18.0" r="2" style="fill:var(--ink-3)"/>
<circle cx="82.2" cy="24.5" r="2" style="fill:var(--ink-3)"/>
<circle cx="100.4" cy="31.1" r="2" style="fill:var(--ink-3)"/>
<circle cx="118.6" cy="37.6" r="2" style="fill:var(--ink-3)"/>
<circle cx="136.8" cy="44.1" r="2" style="fill:var(--ink-3)"/>
<circle cx="155.0" cy="50.7" r="2" style="fill:var(--ink-3)"/>
<circle cx="173.2" cy="57.2" r="2" style="fill:var(--ink-3)"/>
<circle cx="191.4" cy="63.7" r="2" style="fill:var(--ink-3)"/>
<circle cx="209.6" cy="70.3" r="2" style="fill:var(--ink-3)"/>
<circle cx="227.8" cy="76.8" r="2" style="fill:var(--ink-3)"/>
<circle cx="246.0" cy="83.3" r="2" style="fill:var(--ink-3)"/>
<circle cx="264.2" cy="89.9" r="2" style="fill:var(--ink-3)"/>
<circle cx="282.4" cy="96.4" r="2" style="fill:var(--ink-3)"/>
<circle cx="300.6" cy="102.9" r="2" style="fill:var(--ink-3)"/>
<circle cx="318.8" cy="109.5" r="2" style="fill:var(--ink-3)"/>
<circle cx="337.0" cy="116.0" r="2" style="fill:var(--ink-3)"/>
<circle cx="355.2" cy="122.5" r="2" style="fill:var(--ink-3)"/>
<circle cx="373.4" cy="129.1" r="2" style="fill:var(--ink-3)"/>
<circle cx="391.6" cy="135.6" r="2" style="fill:var(--ink-3)"/>
<circle cx="409.8" cy="142.1" r="2" style="fill:var(--ink-3)"/>
<circle cx="428.0" cy="148.7" r="2" style="fill:var(--ink-3)"/>
<circle cx="446.2" cy="155.2" r="2" style="fill:var(--ink-3)"/>
<circle cx="464.4" cy="161.7" r="2" style="fill:var(--ink-3)"/>
<circle cx="482.6" cy="168.3" r="2" style="fill:var(--ink-3)"/>
<circle cx="500.8" cy="174.8" r="2" style="fill:var(--ink-3)"/>
<circle cx="519.0" cy="181.3" r="2" style="fill:var(--ink-3)"/>
<circle cx="537.2" cy="187.9" r="2" style="fill:var(--ink-3)"/>
<circle cx="555.4" cy="194.4" r="2" style="fill:var(--ink-3)"/>
<circle cx="573.6" cy="200.9" r="2" style="fill:var(--ink-3)"/>
<circle cx="591.8" cy="207.5" r="2" style="fill:var(--ink-3)"/>
<circle cx="610.0" cy="214.0" r="2" style="fill:var(--ink-3)"/>
<line x1="626" y1="50" x2="644" y2="50" style="stroke:var(--ink-3)" stroke-width="2.4"/>
<text x="650" y="54" class="s-sub" style="fill:var(--ink-2)">even spend</text>
</svg>` },

    { t: "p", text: "The threshold alert — page if errors exceed 1% for five minutes — caught the outage but never fired for the slow burn, because 0.5% never crossed 1%, though it spent 47% of the month's budget. The burn-rate alerts measure how fast the **budget** is being consumed: 14.4 times the sustainable rate over an hour would spend 2% of the month's budget in that hour, so it pages; 1 times over three days spends 10%, so it opens a ticket. The short window paired with each long one (5 minutes with 1 hour) makes the alert stop soon after the problem does. Neither alert fired for the harmless blip." },

    { t: "callout", kind: "insight", title: "Alert on symptoms, investigate with causes",
      body: [
        { t: "p", text: "Page a human for things users feel — SLO burn — and only those. CPU at 90%, a full disk on one replica or a growing queue are causes; they belong on dashboards and in tickets, because many of them never affect users and a team paged for them learns to ignore pages. Every page should be urgent, actionable and real; review and delete the ones that are not." }
      ] },

    { t: "h2", n: "03", id: "observability", text: "Observability",
      sub: "Metrics say that, traces say where, logs say why" },

    { t: "diagram", kind: "matrix", title: "The three signals",
      cols: ["Answers", "Cost and cardinality", "Typical tools"],
      rows: ["Metrics", "Traces", "Logs"],
      cells: [
        [{ text: "is it broken? how much?", tone: "accent" }, { text: "cheap; low cardinality", tone: "good" }, { text: "Prometheus, Datadog" }],
        [{ text: "where in the call graph?", tone: "violet" }, { text: "medium; sampled", tone: "warn" }, { text: "OpenTelemetry, Jaeger" }],
        [{ text: "what exactly happened?", tone: "teal" }, { text: "expensive; high detail", tone: "crit" }, { text: "Loki, Elasticsearch" }]
      ] },

    { t: "dl", items: [
      { term: "RED, for every service", def: "Rate (requests per second), Errors (failed per second), Duration (latency histograms, 11.1). The service's view of its users." },
      { term: "USE, for every resource", def: "Utilisation (busy share), Saturation (queued work — 11.2's queue), Errors. The view of CPUs, disks, pools and connections that explains a RED symptom." },
      { term: "Structured logs with IDs", def: "JSON fields instead of free text, with the trace ID on every line, so the logs for one request can be found across every service it touched." },
      { term: "Cardinality", def: "Every distinct label value is a separate time series. Labelling metrics by user ID or request ID multiplies storage until the metrics system falls over; put those in traces and logs." }
    ] },

    { t: "p", text: "A **distributed trace** follows one request across services: each unit of work is a **span** with a start, an end and a parent, and the trace ID travels between services in request headers (W3C `traceparent`). A minimal tracer, propagating context the way OpenTelemetry does, on a checkout request:" },

    { t: "code", lang: "python", title: "trace.py — spans, context propagation and a waterfall", code: `import contextvars, time, uuid

SPANS, current = [], contextvars.ContextVar("span", default=None)

class span:
    """A minimal tracer: each span records its trace, its parent, and when it started and ended."""
    def __init__(self, service, name, headers=None):
        parent = current.get()
        self.trace = (headers or {}).get("traceparent", parent["trace"] if parent else uuid.uuid4().hex[:8])
        self.parent = (headers or {}).get("parent", parent["id"] if parent else None)
        self.rec = {"trace": self.trace, "id": uuid.uuid4().hex[:4], "parent": self.parent, "service": service, "name": name}
    def headers(self): return {"traceparent": self.trace, "parent": self.rec["id"]}   # what goes on the wire
    def __enter__(self):
        self.token = current.set(self.rec); self.rec["start"] = time.perf_counter(); return self
    def __exit__(self, *exc):
        self.rec["end"] = time.perf_counter(); current.reset(self.token); SPANS.append(self.rec)

def work(ms): time.sleep(ms / 1000)

def inventory(headers):                            # another service: context arrives in the headers
    with span("inventory", "GET /stock", headers):
        with span("inventory", "SELECT stock"): work(4)

def pricing(headers):
    with span("pricing", "GET /price", headers):
        with span("pricing", "load rules"): work(3)
        with span("pricing", "SELECT promotions"): work(58)      # the slow part nobody suspected

def checkout():
    with span("gateway", "POST /checkout") as root:
        with span("checkout", "validate cart"): work(2)
        with span("checkout", "call inventory") as s: inventory(s.headers())
        with span("checkout", "call pricing") as s: pricing(s.headers())
        with span("checkout", "INSERT order"): work(6)

checkout()
t0 = min(s["start"] for s in SPANS); total = max(s["end"] for s in SPANS) - t0
by_id = {s["id"]: s for s in SPANS}
depth = lambda s: 0 if s["parent"] is None else 1 + depth(by_id[s["parent"]])
print(f"trace {SPANS[0]['trace']}: {len(SPANS)} spans, {total * 1000:.0f} ms")
for s in sorted(SPANS, key=lambda s: s["start"]):
    a, b = (s["start"] - t0) / total, (s["end"] - t0) / total
    bar = " " * int(a * 40) + "█" * max(1, int((b - a) * 40))
    label = "  " * depth(s) + s["service"] + ": " + s["name"]
    print(f"  {label:<40} {bar:<41} {(s['end'] - s['start']) * 1000:5.1f} ms")`,
      hl: [9, 10, 12, 27, 32],
      out: `trace 3395ab26: 10 spans, 74 ms
  gateway: POST /checkout                  ████████████████████████████████████████   73.9 ms
    checkout: validate cart                █                                           2.1 ms
    checkout: call inventory                ██                                         4.1 ms
      inventory: GET /stock                 ██                                         4.1 ms
        inventory: SELECT stock             ██                                         4.1 ms
    checkout: call pricing                    █████████████████████████████████       61.3 ms
      pricing: GET /price                     █████████████████████████████████       61.3 ms
        pricing: load rules                   █                                        3.1 ms
        pricing: SELECT promotions              ███████████████████████████████       58.2 ms
    checkout: INSERT order                                                     ███     6.2 ms` },

    { t: "viz", title: "The checkout trace as a waterfall",
      caption: "Ten spans from three services, joined by one trace ID that travelled in request headers. The shape answers the question metrics could not: of 74 ms, 58 are a single promotions query inside the pricing service. Metrics would show checkout's p99 rising; only the trace shows which of the downstream calls is responsible.",
      svg: `<svg viewBox="0 0 760 284" width="100%" role="img" aria-label="Trace waterfall">
<line x1="250.0" y1="26" x2="250.0" y2="254" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="250.0" y="20" text-anchor="middle" class="s-sub">0</text>
<line x1="313.5" y1="26" x2="313.5" y2="254" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="313.5" y="20" text-anchor="middle" class="s-sub">10</text>
<line x1="377.0" y1="26" x2="377.0" y2="254" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="377.0" y="20" text-anchor="middle" class="s-sub">20</text>
<line x1="440.5" y1="26" x2="440.5" y2="254" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="440.5" y="20" text-anchor="middle" class="s-sub">30</text>
<line x1="504.1" y1="26" x2="504.1" y2="254" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="504.1" y="20" text-anchor="middle" class="s-sub">40</text>
<line x1="567.6" y1="26" x2="567.6" y2="254" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="567.6" y="20" text-anchor="middle" class="s-sub">50</text>
<line x1="631.1" y1="26" x2="631.1" y2="254" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="631.1" y="20" text-anchor="middle" class="s-sub">60</text>
<line x1="694.6" y1="26" x2="694.6" y2="254" style="stroke:var(--line);stroke-opacity:.45"/>
<text x="694.6" y="20" text-anchor="middle" class="s-sub">70</text>
<text x="14" y="48" class="s-mono" style="font-size:10.5px">gateway: POST /checkout</text>
<rect x="250.0" y="37" width="470.0" height="15" rx="3" style="fill:var(--accent);fill-opacity:.4;stroke:var(--accent)"/>
<text x="256.0" y="48" class="s-sub" style="fill:var(--ink)">74.0 ms</text>
<text x="28" y="70" class="s-mono" style="font-size:10.5px">checkout: validate cart</text>
<rect x="250.0" y="59" width="14.0" height="15" rx="3" style="fill:var(--accent);fill-opacity:.4;stroke:var(--accent)"/>
<text x="270.0" y="70" class="s-sub" text-anchor="start">2.2 ms</text>
<text x="28" y="92" class="s-mono" style="font-size:10.5px">checkout: call inventory</text>
<rect x="264.0" y="81" width="26.7" height="15" rx="3" style="fill:var(--accent);fill-opacity:.4;stroke:var(--accent)"/>
<text x="296.6" y="92" class="s-sub" text-anchor="start">4.2 ms</text>
<text x="42" y="114" class="s-mono" style="font-size:10.5px">inventory: GET /stock</text>
<rect x="264.0" y="103" width="26.7" height="15" rx="3" style="fill:var(--violet);fill-opacity:.4;stroke:var(--violet)"/>
<text x="296.6" y="114" class="s-sub" text-anchor="start">4.2 ms</text>
<text x="56" y="136" class="s-mono" style="font-size:10.5px">inventory: SELECT stock</text>
<rect x="264.6" y="125" width="26.0" height="15" rx="3" style="fill:var(--violet);fill-opacity:.4;stroke:var(--violet)"/>
<text x="296.6" y="136" class="s-sub" text-anchor="start">4.1 ms</text>
<text x="28" y="158" class="s-mono" style="font-size:10.5px">checkout: call pricing</text>
<rect x="290.6" y="147" width="390.0" height="15" rx="3" style="fill:var(--accent);fill-opacity:.4;stroke:var(--accent)"/>
<text x="686.6" y="158" class="s-sub" text-anchor="start">61.4 ms</text>
<text x="42" y="180" class="s-mono" style="font-size:10.5px">pricing: GET /price</text>
<rect x="290.6" y="169" width="390.0" height="15" rx="3" style="fill:var(--warn);fill-opacity:.4;stroke:var(--warn)"/>
<text x="686.6" y="180" class="s-sub" text-anchor="start">61.4 ms</text>
<text x="56" y="202" class="s-mono" style="font-size:10.5px">pricing: load rules</text>
<rect x="291.3" y="191" width="20.3" height="15" rx="3" style="fill:var(--warn);fill-opacity:.4;stroke:var(--warn)"/>
<text x="317.6" y="202" class="s-sub" text-anchor="start">3.2 ms</text>
<text x="56" y="224" class="s-mono" style="font-size:10.5px">pricing: SELECT promotions</text>
<rect x="311.6" y="213" width="369.0" height="15" rx="3" style="fill:var(--crit);fill-opacity:.4;stroke:var(--crit)"/>
<text x="686.6" y="224" class="s-sub" text-anchor="start">58.1 ms</text>
<text x="28" y="246" class="s-mono" style="font-size:10.5px">checkout: INSERT order</text>
<rect x="680.6" y="235" width="39.4" height="15" rx="3" style="fill:var(--accent);fill-opacity:.4;stroke:var(--accent)"/>
<text x="674.6" y="246" class="s-sub" text-anchor="end">6.2 ms</text>
<text x="485.0" y="276" text-anchor="middle" class="s-sub">ms since the request reached the gateway; one trace ID links all ten spans</text>
</svg>` },

    { t: "callout", kind: "tradeoff", title: "Sampling",
      body: [
        { t: "p", text: "Tracing every request at scale is expensive, so traces are sampled. **Head sampling** decides at the start — keep 1% — which is cheap but usually discards the rare slow or failed requests you most want. **Tail sampling** buffers whole traces and keeps them after seeing how they ended — all errors, all slow ones, a small share of the rest — at the cost of a collector that holds traces in memory. Most production setups combine a low head rate with tail sampling for errors and outliers." }
      ] },

    { t: "exercise", kind: "Challenge", title: "Find the critical path",
      difficulty: "advanced", minutes: 25,
      body: [
        { t: "p", text: "A product page's trace has ten spans, and three downstream calls run in parallel. A waterfall shows that the model inference in recommendations is the longest single span — but is it what the page waited for? Compute each span's **self time** (time not covered by its children) and the trace's **critical path** (the chain of spans whose duration determined the end-to-end latency)." }
      ],
      requirements: [
        "Self time per span: its duration minus the union of its children's intervals",
        "The critical path: from the root's end, repeatedly follow the child that finished last before the current point",
        "Print duration, self time and whether each span is on the critical path",
        "List the leaf operations the request waited on, in order"
      ],
      hint: "Walk backwards: start at the root's end time, pick the child with the latest end at or before it, recurse into that child, then continue from that child's start time.",
      solution: { lang: "python", title: "critpath_ex.py",
        code: `# A product-page trace: (span id, parent id, service: operation, start ms, end ms). Three calls run in parallel.
SPANS = [
    ("a", None, "gateway: GET /product/42",       0, 212),
    ("b", "a",  "product: render page",           3, 210),
    ("c", "b",  "catalog: GET /item",             6,  41),
    ("d", "c",  "catalog: SELECT item",          10,  36),
    ("e", "b",  "pricing: GET /price",           44, 186),     # these three start together ...
    ("f", "e",  "pricing: SELECT promotions",    49, 171),
    ("g", "b",  "reviews: GET /reviews",         44, 120),
    ("h", "b",  "recs: GET /recommendations",    44, 158),
    ("i", "h",  "recs: model inference",         50, 150),
    ("j", "b",  "product: template",            188, 207),
]
span = {s[0]: s for s in SPANS}
children = {s[0]: [c for c in SPANS if c[1] == s[0]] for s in SPANS}

def self_time(sid):
    """Time in this span not covered by any child: the work it did itself."""
    _, _, _, start, end = span[sid]
    covered, last = 0, start
    for _, _, _, cs, ce in sorted(children[sid], key=lambda c: c[3]):
        cs, ce = max(cs, last), min(ce, end)
        if ce > cs: covered += ce - cs; last = ce
    return (end - start) - covered

def critical_path(sid):
    """Walk backwards from the span's end: the child that finished last before it is what it waited on."""
    path, t = [sid], span[sid][4]
    for child in sorted(children[sid], key=lambda c: -c[4]):
        if child[4] <= t:
            path = critical_path(child[0]) + path; t = child[3]
    return path

crit = set(critical_path("a"))
print(f"{'span':<32} {'duration':>9} {'self time':>10}  critical path")
for sid, parent, name, start, end in SPANS:
    print(f"{name:<32} {end - start:>7} ms {self_time(sid):>7} ms  {'yes' if sid in crit else ''}")
print("\\nwaited on, in order:", " -> ".join(span[s][2] for s in critical_path("a") if not children[s]))`,
        out: `span                              duration  self time  critical path
gateway: GET /product/42             212 ms       5 ms  yes
product: render page                 207 ms      11 ms  yes
catalog: GET /item                    35 ms       9 ms  yes
catalog: SELECT item                  26 ms      26 ms  yes
pricing: GET /price                  142 ms      20 ms  yes
pricing: SELECT promotions           122 ms     122 ms  yes
reviews: GET /reviews                 76 ms      76 ms  
recs: GET /recommendations           114 ms      14 ms  
recs: model inference                100 ms     100 ms  
product: template                     19 ms      19 ms  yes

waited on, in order: catalog: SELECT item -> pricing: SELECT promotions -> product: template`,
        notes: [
          { t: "p", text: "Recommendations' model inference was the largest leaf span at 100 ms, but it ran in parallel with pricing and finished first, so it is **not** on the critical path: making it faster would not make the page faster at all. The page waited for the catalog query, then the pricing promotions query, then the template. The promotions query — 122 ms of self time — is where an optimisation pays." },
          { t: "p", text: "It also tells you how much it pays: shortening the promotions query helps only until the pricing call finishes before recommendations does at 158 ms, after which recommendations becomes the critical path. Tracing back-ends such as Jaeger and Tempo compute critical paths for this reason; looking only at the biggest span is a classic way to optimise the wrong thing." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: a slow leak that met every threshold",
      body: [
        { t: "p", text: "**Symptom.** At a monthly review, a team discovered their API had missed its 99.9% SLO: 0.14% of requests had failed. Nobody had been paged all month, and every dashboard was green throughout." },
        { t: "p", text: "**Mechanism.** A dependency upgrade made about 0.4% of requests from one mobile app version fail with a 502 for twelve days. Alerts fired at 1% errors for five minutes, so they never triggered; the overall error-rate graph moved from 0.05% to 0.45%, a change invisible on a chart scaled for outages. The slow burn in burn.py, at production scale." },
        { t: "p", text: "**Fix.** Alerts were replaced with multi-window burn-rate alerts on the SLO — pages for fast burns, tickets for slow ones — and the weekly review started from budget remaining rather than dashboards. The error budget policy was applied: features paused for a sprint while the team added per-client-version SLIs and a canary that compares error rates between versions before a full rollout." }
      ] }
  ],

  takeaways: [
    "An **SLI** measures user experience as good ÷ valid events; an **SLO** is its target over a window; an **SLA** is a looser contract with penalties.",
    "Choose SLOs from user need and business value; **100% is the wrong target**, and you cannot exceed what your dependencies deliver.",
    "The **error budget** = 1 − SLO: 99.9% allows **43.2 minutes** a month; spend it on releases while it lasts, and pause features when it is gone.",
    "Budgets are spent by **requests**: measured, a 0.5% slow burn for three days used **47%** of the month's budget, more than a 25-minute outage (**~12%**).",
    "A **threshold alert** caught the outage but **never fired** for the slow burn; **multi-window burn-rate alerts** paged for the outage in **4 minutes**, opened a ticket for the slow burn, and ignored the blip.",
    "Page on **symptoms** users feel; keep causes on dashboards and tickets.",
    "**Metrics** say something is wrong, **traces** say where, **logs** say why; use **RED** for services and **USE** for resources.",
    "Keep high-cardinality values out of metrics; put **trace IDs** in every log line.",
    "Propagate trace context in headers; one trace showed **58 of 74 ms** in a single query.",
    "Optimise the **critical path**, not the biggest span: the 100 ms recommendation inference was off it, and speeding it up would not help."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Which is an SLO?",
        options: ["The share of requests answered in under 300 ms without an error", "99.9% of requests answered in under 300 ms without an error, measured over 30 days", "A refund of 10% of the monthly fee if availability falls below 99.5%", "CPU utilisation below 70%"],
        answer: 1,
        why: "An SLO is a target for an SLI over a window. The first option is the SLI itself, the third is an SLA term, and CPU utilisation is a resource metric rather than a measure of user experience." },

      { stem: "A service's SLO is 99.9% over 30 days. Roughly how much complete downtime does the error budget allow?",
        options: ["4.3 minutes", "43 minutes", "7.2 hours", "3 days"],
        answer: 1,
        why: "0.1% of 30 days is 43.2 minutes. 4.3 minutes is the budget at 99.99%, 7.2 hours at 99%. In practice the budget is spent by failed requests, so partial failures over longer periods spend it too." },

      { stem: "Errors rise from 0.05% to 0.5% and stay there for three days. Which alert catches it?",
        options: ["\"Errors above 1% for 5 minutes\"", "A slow-burn rule: budget consumed at more than the sustainable rate over 3 days, confirmed over 6 hours", "A CPU alert", "None should; 0.5% is low"],
        answer: 1,
        why: "0.5% never crosses a 1% threshold, but for a 99.9% SLO it burns budget five times faster than sustainable — 47% of the month's budget in the simulation. A long-window burn-rate rule catches it, as a ticket rather than a page." },

      { stem: "A trace shows a 100 ms recommendation call running in parallel with a 142 ms pricing call. What happens to page latency if recommendations becomes twice as fast?",
        options: ["It falls by about 50 ms", "Almost nothing, because the page waits for the longer parallel branch, pricing, which is on the critical path", "It doubles", "It falls by 100 ms"],
        answer: 1,
        why: "With parallel calls the page waits for the slowest branch. Recommendations finished before pricing, so it is not on the critical path, and shortening it changes nothing; shortening pricing would help." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "Reliability questions test whether you can turn \"reliable\" into numbers and policy.",
    questions: [
      { level: "core",
        q: "Walk me through setting up SLOs for a critical API.",
        strong: "A strong answer chooses user-centred SLIs, sets realistic targets, defines the budget policy, and alerts on burn rate.",
        answer: [
          { t: "p", text: "Pick SLIs that reflect what users feel, measured at the edge: availability as the share of valid requests not returning 5xx, and latency as the share served under a threshold such as 300 ms. Set targets from user needs and what dependencies can support — say 99.9% availability and 99% under 300 ms over a rolling 30 days — and keep any SLA looser." },
          { t: "p", text: "Agree an error budget policy with product: releases continue while budget remains, and reliability work takes priority when it is spent. Alert with multi-window burn rates — page for fast burns, ticket for slow ones — and review budget consumption weekly, adjusting SLOs as you learn what users actually need." }
        ] },

      { level: "advanced",
        q: "Why alert on error budget burn rate instead of raw error rate?",
        strong: "A strong answer covers sensitivity to slow burns, resistance to blips, and the multi-window design.",
        answer: [
          { t: "p", text: "A raw threshold is either too sensitive — paging for brief blips users barely notice — or too insensitive, missing sustained low-level failure that quietly spends the budget. Burn rate expresses error rate relative to what the SLO allows, so the same rule scales with the target and asks the question that matters: at this rate, when do we break the SLO?" },
          { t: "p", text: "Using several windows — 1 hour at 14.4× and 6 hours at 6× to page, 3 days at 1× to ticket — catches both fast and slow problems, and pairing each long window with a short one makes alerts reset quickly once the problem stops." }
        ] },

      { level: "core",
        q: "What is the difference between metrics, logs and traces, and how do you use them together?",
        strong: "A strong answer gives each signal's job and cost, and a workflow that moves between them.",
        answer: [
          { t: "p", text: "Metrics are cheap aggregated numbers — RED for services, USE for resources — good for dashboards and alerts, but low-cardinality by necessity. Traces follow individual requests across services and show where time and errors occur. Logs record detailed events and explain why something happened." },
          { t: "p", text: "In an incident: a burn-rate alert from metrics says users are affected; exemplars or a trace search finds slow or failed requests and the service and span responsible; the trace ID leads to that request's logs in every service. That works only if trace context propagates through every hop and every log line carries the trace ID." }
        ] }
    ]
  }
});
