/* ============================================================================
   LESSON 14.3 — Rollback, Fallback and Degradation
   ========================================================================= */
EC.receiveLesson({
  id: "14.3",

  lede: "Every model service will one day get a wrong model, a hung model or no model at all. What happens then is decided by preparation, not by the engineer on call. A rollback should be a pointer change that takes seconds, which requires the previous version to still exist and be deployable. A fallback should answer from the previous model or a simple heuristic when the current one fails. A circuit breaker should stop waiting for a model that is not answering. And for the case where nothing is available, the product must already know what to do. This lesson measures how a timeout and a breaker change a three-minute outage, and tests the breaker's state machine.",

  objectives: [
    "Make rollback a fast, rehearsed pointer change",
    "Design a fallback chain: current model, previous model, heuristic, safe default",
    "Show why fallback after a timeout still fails users, and how a circuit breaker fixes it",
    "Implement and test a circuit breaker's state machine",
    "Decide in advance how each product surface degrades"
  ],

  prerequisites: ["3.3", "14.2"],

  blocks: [
    { t: "h2",
      n: "01",
      id: "rollback",
      text: "Rollback is a pointer, not a rebuild",
      sub: "And it must be rehearsed" },
    { t: "p",
      text: "If production serves 'whatever version the registry marks as production' (lesson 15.1), rollback is changing that mark back and letting servers reload, or switching traffic to a deployment of the previous version that is still running. Seconds, not the hour it takes to rebuild an image from an old commit. That needs three things in place before the incident: the previous artefact kept, its environment still buildable or its image still in the registry, and a rollback that has been run in a drill, not just documented." },
    { t: "callout",
      kind: "trap",
      title: "Rolling back the model but not the features",
      body: [
        { t: "p",
          text: "A new model often ships with a new feature or a changed transform. Rolling back only the model sends the old model inputs it was never trained on: skew by rollback (module 13). Version the model, its feature definitions and its preprocessing together, and roll them back together." }
      ] },
    { t: "h2",
      n: "02",
      id: "fallback",
      text: "Fallback and the circuit breaker",
      sub: "A three-minute outage, three ways" },
    { t: "viz",
      title: "A fallback chain",
      caption: "The breaker decides whether to try the current model at all. When it is open, requests go straight to the previous model, and to a heuristic or safe default if that fails too.",
      svg: `<svg viewBox="0 0 760 275" width="100%" role="img">
<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-2)"/></marker></defs>
<line x1="120.0" y1="126.0" x2="170.0" y2="126.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="316.5" y1="100.0" x2="393.5" y2="72.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<text x="355.0" y="80.0" text-anchor="middle" class="s-sub">closed</text>
<line x1="320.0" y1="126.0" x2="380.0" y2="126.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<text x="350.0" y="120.0" text-anchor="middle" class="s-sub">open</text>
<line x1="465.0" y1="152.0" x2="465.0" y2="210.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<rect x="10" y="100" width="110" height="52" rx="8" class="s-fill" style="stroke:var(--ink-2);stroke-width:1.8"/>
<text x="65.0" y="122" text-anchor="middle" class="s-label" style="fill:var(--ink-2)">Request</text>
<rect x="170" y="100" width="150" height="52" rx="8" class="s-fill" style="stroke:var(--warn);stroke-width:1.8"/>
<text x="245.0" y="122" text-anchor="middle" class="s-label" style="fill:var(--warn)">Circuit breaker</text>
<text x="245.0" y="140" text-anchor="middle" class="s-sub">closed / open</text>
<rect x="380" y="20" width="170" height="52" rx="8" class="s-fill" style="stroke:var(--accent);stroke-width:1.8"/>
<text x="465.0" y="42" text-anchor="middle" class="s-label" style="fill:var(--accent)">Current model</text>
<text x="465.0" y="60" text-anchor="middle" class="s-sub">registry: prod</text>
<rect x="380" y="100" width="170" height="52" rx="8" class="s-fill" style="stroke:var(--violet);stroke-width:1.8"/>
<text x="465.0" y="122" text-anchor="middle" class="s-label" style="fill:var(--violet)">Previous model</text>
<text x="465.0" y="140" text-anchor="middle" class="s-sub">kept loaded</text>
<rect x="380" y="210" width="170" height="52" rx="8" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="465.0" y="232" text-anchor="middle" class="s-label" style="fill:var(--good)">Heuristic / default</text>
<text x="465.0" y="250" text-anchor="middle" class="s-sub">no model at all</text>
</svg>` },
    { t: "p",
      text: "Ten minutes of traffic at 50 requests a second; for three minutes the current model hangs, so calls run until the caller's 500 ms timeout. The script compares no fallback, falling back to the previous model after the timeout, and a circuit breaker that opens after five failures in ten seconds and sends one trial request every thirty seconds." },
    { t: "code",
      lang: "python",
      title: "fallback.py — the same outage under three policies",
      code: `import numpy as np
rng = np.random.default_rng(16)

# Ten minutes at 50 requests/s. The primary model normally answers in ~20 ms. From minute 3 to minute 6 it hangs:
# every call runs until the caller's 500 ms timeout. The fallback, the previous model, answers in 15 ms.
T, RATE, TIMEOUT = 600, 50, 500.0
arrivals = np.sort(rng.uniform(0, T, T * RATE))
def primary_up(t): return not (180 <= t < 360)

class Breaker:
    """Open after 5 failures in 10 s; after 30 s let one trial request through (half-open)."""
    def __init__(self): self.state, self.fails, self.opened_at = "closed", [], -1e9
    def allow(self, t):
        if self.state == "open" and t - self.opened_at >= 30: self.state = "half-open"; return True
        return self.state != "open"
    def record(self, t, ok):
        if ok: self.state, self.fails = "closed", []; return
        self.fails = [f for f in self.fails if t - f < 10] + [t]
        if self.state == "half-open" or len(self.fails) >= 5: self.state, self.opened_at = "open", t

def run(policy):
    lat, served, errors = [], {"primary": 0, "previous model": 0, "error": 0}, 0
    br = Breaker()
    for t in arrivals:
        use_primary = policy != "breaker" or br.allow(t)
        if use_primary:
            if primary_up(t):
                lat.append(rng.lognormal(np.log(20), 0.3)); served["primary"] += 1
                if policy == "breaker": br.record(t, True)
                continue
            if policy == "breaker": br.record(t, False)
            if policy == "none": lat.append(TIMEOUT); served["error"] += 1; continue
            lat.append(TIMEOUT + 15); served["previous model"] += 1; continue      # waited for the timeout, then fell back
        lat.append(15.0); served["previous model"] += 1                             # breaker open: fall back at once
    n = len(arrivals); outage = (arrivals >= 180) & (arrivals < 360); lat = np.array(lat)
    return served["error"] / n, np.percentile(lat[outage], 50), np.percentile(lat, 99), {k: v / n for k, v in served.items()}

print(f"{'policy':<34}{'errors':>8}{'p50 in outage':>15}{'p99 overall':>13}   served by")
for name, pol in (("no fallback", "none"), ("fallback after the timeout", "timeout"), ("fallback with a circuit breaker", "breaker")):
    err, p50o, p99, s = run(pol)
    print(f"{name:<34}{err:>8.1%}{p50o:>12.0f} ms{p99:>10.0f} ms   " + ", ".join(f"{k} {v:.0%}" for k, v in s.items() if v))`,
      out: `policy                              errors  p50 in outage  p99 overall   served by
no fallback                          29.9%         500 ms       500 ms   primary 70%, error 30%
fallback after the timeout            0.0%         515 ms       515 ms   primary 70%, previous model 30%
fallback with a circuit breaker       0.0%          15 ms        39 ms   primary 70%, previous model 30%` },
    { t: "dl",
      items: [
        { term: "No fallback: 30% errors",
          def: "Every request during the outage failed after waiting the full 500 ms." },
        { term: "Fallback after timeout: no errors, still slow",
          def: "Every outage request was answered, but only after waiting 500 ms for the hung model first: the outage moved from the error rate to the latency, and p99 for the whole ten minutes was 515 ms." },
        { term: "Circuit breaker: no errors, fast",
          def: "Five failures opened the breaker; from then on requests went straight to the previous model in 15 ms. p99 over the ten minutes was 39 ms, and the breaker's trial requests found the recovery within 30 seconds." }
      ] },
    { t: "table",
      head: ["Surface", "If no model is available", "Why"],
      rows: [
        ["Recommendations", "Popular items for the user's region", "Some relevance beats an empty page"],
        ["Search ranking", "Lexical ranking (BM25) without the model", "Results stay correct, just less tuned"],
        [
          "Fraud scoring",
          "Rules only, with lower limits and more step-up checks",
          "Never 'approve everything' or 'block everything'"
        ],
        ["Credit decision", "Refer to a human; do not decide", "A wrong automated decision is worse than a delay"],
        ["Spam filter", "Deliver with a warning banner", "Losing mail is worse than letting some spam through"]
      ] },
    { t: "callout",
      kind: "insight",
      title: "Degradation is a product decision",
      body: [
        { t: "p",
          text: "What the service does with no model differs by surface, and engineers should not decide it during an outage. Write it down per endpoint, implement it as the last link of the fallback chain, and test it by turning the model off in a staging drill." }
      ] },
    { t: "exercise",
      kind: "Challenge",
      title: "Test the circuit breaker",
      difficulty: "core",
      minutes: 25,
      body: [
        { t: "p",
          text: "Implement a circuit breaker with three states. Closed: allow calls; open after a threshold of failures within a sliding window. Open: reject calls at once until a cooldown passes. Half-open: allow exactly one trial; close on success, reopen on failure. Take the time as an argument so tests can control it, and write tests for each transition, including failures spread too thinly to open it and a second concurrent trial." }
      ],
      requirements: [
        "Three states and their transitions",
        "A sliding failure window, not a lifetime count",
        "Only one trial request in half-open",
        "Tests that drive time explicitly"
      ],
      hint: "Passing `now` into allow() and record() instead of calling time.time() inside makes every transition testable without sleeping.",
      solution: { lang: "python",
        title: "circuit_breaker.py",
        code: `class CircuitBreaker:
    """closed -> open after \`threshold\` failures within \`window\` s; open -> half-open after \`cooldown\` s;
    half-open -> closed on one success, -> open again on one failure. The clock is passed in, so tests control time."""
    def __init__(self, threshold=5, window=10.0, cooldown=30.0):
        self.threshold, self.window, self.cooldown = threshold, window, cooldown
        self.state, self.failures, self.opened_at, self.trial_out = "closed", [], None, False

    def allow(self, now: float) -> bool:
        if self.state == "open" and now - self.opened_at >= self.cooldown:
            self.state, self.trial_out = "half-open", False
        if self.state == "half-open":
            if self.trial_out: return False                      # only one trial request at a time
            self.trial_out = True; return True
        return self.state == "closed"

    def record(self, now: float, ok: bool):
        if self.state == "half-open":
            self.trial_out = False
            if ok: self.state, self.failures = "closed", []
            else: self.state, self.opened_at = "open", now
            return
        if ok: return
        self.failures = [t for t in self.failures if now - t < self.window] + [now]
        if len(self.failures) >= self.threshold: self.state, self.opened_at = "open", now

def test(name, cond):
    print(f"{'PASS' if cond else 'FAIL'}  {name}"); assert cond

b = CircuitBreaker()
for t in range(4): b.record(float(t), ok=False)
test("4 failures in 10 s keep it closed", b.state == "closed" and b.allow(4.0))
b.record(4.0, ok=False)
test("the 5th failure opens it", b.state == "open")
test("open rejects calls at once", not b.allow(10.0))

b2 = CircuitBreaker()
for t in (0, 11, 22, 33, 44): b2.record(float(t), ok=False)
test("5 failures spread over 44 s do not open it", b2.state == "closed")

test("after the 30 s cooldown one trial is allowed", b.allow(34.0) and b.state == "half-open")
test("a second concurrent trial is not", not b.allow(34.1))
b.record(34.2, ok=False)
test("a failed trial reopens it", b.state == "open" and not b.allow(40.0))
test("after another cooldown a trial again", b.allow(64.3))
b.record(64.4, ok=True)
test("a successful trial closes it", b.state == "closed" and b.allow(64.5))`,
        out: `PASS  4 failures in 10 s keep it closed
PASS  the 5th failure opens it
PASS  open rejects calls at once
PASS  5 failures spread over 44 s do not open it
PASS  after the 30 s cooldown one trial is allowed
PASS  a second concurrent trial is not
PASS  a failed trial reopens it
PASS  after another cooldown a trial again
PASS  a successful trial closes it`,
        notes: [
          { t: "p",
            text: "All nine transitions passed. Two of the tests guard the commonest bugs: five failures spread over 44 seconds must not open it, which a lifetime counter would get wrong and so trip on normal background errors; and only one trial may run in half-open, or a recovering model receives the whole backlog at once and fails again." },
          { t: "p",
            text: "Injecting the clock is what makes this testable in milliseconds. Breakers are infrastructure that runs only during incidents, so untested ones are common; a test suite like this, plus a staging drill that turns the model off, is the evidence it works." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: the fallback that waited",
      body: [
        { t: "p",
          text: "**Symptom.** During a GPU node failure, the recommendation service returned results the whole time, but page load times rose to over 3 seconds and conversion fell sharply for 40 minutes." },
        { t: "p",
          text: "**Mechanism.** The service did have a fallback to popular items, but only after the model call timed out at 2.5 seconds. Every request paid the full timeout before falling back. Availability dashboards stayed green because no request failed." },
        { t: "p",
          text: "**Fix.** A circuit breaker now skips the model after repeated timeouts, the timeout was cut to the latency budget's share for the model (300 ms), and the dashboard shows the share of responses served by each fallback tier, which made the incident visible in the first minute." }
      ] }
  ],

  takeaways: [
    "Rollback should be a **pointer change** to a version that is kept, deployable and rehearsed.",
    "Roll back model, features and preprocessing **together**, or rollback itself causes skew.",
    "Fallback chain: **current model → previous model → heuristic → safe default**.",
    "Measured: no fallback gave **30%** errors in the outage; fallback after the timeout gave none, but **515 ms** p99.",
    "A **circuit breaker** cut outage requests to **15 ms** and overall p99 to **39 ms**, and found recovery within 30 s.",
    "Breakers need a sliding failure window and a single half-open trial; test them with an injected clock.",
    "What each surface does with no model is a **product decision**, made before the incident.",
    "Dashboard the share of traffic served by each fallback tier."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "Fallback after a timeout gave zero errors during the outage. What was still wrong?",
        options: [
          "The fallback model's predictions were never logged",
          "Every request waited the full 500 ms timeout first",
          "The breaker opened too early and stayed open",
          "Requests were sent to both models at once"
        ],
        answer: 1,
        why: "Each request hit the hung model, waited 500 ms, then fell back, so latency carried the outage. Logging, breakers and duplicate calls were not part of that policy." },
      { stem: "Why must a circuit breaker allow only one trial request when half-open?",
        options: [
          "So that the logs stay readable during recovery",
          "So a recovering model is not flooded again",
          "Because two trials would double the cost of inference",
          "Because the half-open state lasts only one request"
        ],
        answer: 1,
        why: "Letting the whole backlog through at once can overload a model that has just recovered. Logs and cost are minor, and half-open lasts until the trial's result is recorded." },
      { stem: "A new model shipped with a new feature. What must rollback include?",
        options: [
          "Only the model artefact, which is the part that changed",
          "The model with its feature definitions and preprocessing",
          "Only the container image tag of the serving service in use",
          "The training data snapshot the model was trained on"
        ],
        answer: 1,
        why: "The old model needs the inputs it was trained on; rolling back only the model creates skew. An image tag may not include feature logic, and training data is not needed to serve." },
      { stem: "No model is available for a credit decision. What is the safest degradation?",
        options: [
          "Approve every application until the model returns",
          "Refer applications to a human reviewer",
          "Decline every application until it returns",
          "Use the last prediction made for anyone"
        ],
        answer: 1,
        why: "Automated approvals or declines without a model cause harm either way, and reusing another person's score is wrong. Referral delays the decision without making a wrong one." }
    ] },

  interview: { title: "In an interview",
    sub: "Resilience answers should be decided before the incident.",
    questions: [
      { level: "core",
        q: "A model you deployed an hour ago is making bad predictions. What do you do?",
        strong: "A strong answer rolls back first and investigates after, with prepared mechanisms.",
        answer: [
          { t: "p",
            text: "Roll back to the previous version, model plus features and preprocessing, by moving the production pointer or shifting traffic to the still-running previous deployment, and confirm the metrics recover. Then investigate with the bad version's prediction logs. This only works if the previous version is kept, deployable and rehearsed, and if every prediction carries its model version so the bad period can be identified." }
        ] },
      { level: "advanced",
        q: "Design the failure behaviour of a recommendation service.",
        strong: "A strong answer covers timeouts, breakers, a fallback chain, a safe default and visibility.",
        answer: [
          { t: "p",
            text: "A latency budget gives the model call a timeout well under the page budget. A circuit breaker skips the model after repeated failures and tests recovery with single trials. Fallbacks: the previous model, then cached recommendations for the user, then popular items for their region, never an empty slot. Each response records which tier served it, and dashboards and alerts track the tier shares, since availability alone stays green during a degraded outage." }
        ] },
      { level: "core",
        q: "What is a circuit breaker and why use one in front of a model?",
        strong: "A strong answer explains the states and the latency problem it solves.",
        answer: [
          { t: "p",
            text: "A wrapper that tracks failures: after enough in a short window it opens and fails fast, sending requests to a fallback without calling the model; after a cooldown it lets one trial through and closes if it succeeds. It stops every request paying a full timeout to a model that is down, which kept p99 at 39 ms instead of 515 ms in the simulation, and it gives the failing model room to recover." }
        ] }
    ] }
});
