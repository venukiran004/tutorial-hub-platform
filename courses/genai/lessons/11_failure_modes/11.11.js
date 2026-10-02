EC.receiveLesson({
  id: "11.11",

  lede: "You cannot control what you do not measure, so track tokens and cost **per request, per user and per feature**. But a per-user cap is narrower than it looks: measured against four scenarios it fires on exactly **one** \u2014 the single runaway client. Traffic growing tenfold passes it, and **prompt bloat passes it while raising the bill 2.5x with the same users making the same number of calls.** Budgets need a scope hierarchy, and a warning tier, because a hard cap alone fires on the last day of the month.",

  objectives: [
    "Meter spend per request, user and feature",
    "Say what a per-user cap catches and what it cannot",
    "Build a scope hierarchy from per-call to a global kill switch",
    "Explain why prompt bloat is invisible to every per-user control",
    "Set tiered alerts that warn before they block"
  ],

  prerequisites: ["11.10", "10.3"],

  blocks: [

    { t: "h2", n: "01", id: "meter", text: "The meter",
      sub: "Per request, per user, per feature" },

    { t: "code", lang: "python", title: "The reference's cost meter", code: `def estimate_cost(usage, price):
    """usage: {'input': n, 'output': m}; price per-1M tokens."""
    return round(usage["input"] / 1e6 * price["input"]
               + usage["output"] / 1e6 * price["output"], 6)

class CostMeter:
    """Aggregate + alert on per-user/route spend."""
    def __init__(self): self.spend = {}
    def record(self, key, usage, price):
        self.spend[key] = self.spend.get(key, 0) + estimate_cost(usage, price)
        return self.spend[key]
    def over_budget(self, key, limit):           # e.g. per-user daily cap
        return self.spend.get(key, 0) > limit`,
      hl: [12, 13],
      caption: "The `key` is the whole design \u2014 what you key on decides what you can catch." },

    { t: "callout", kind: "insight", title: "`round(..., 6)` is doing something load-bearing",
      body: [
        { t: "p", text: "At $5 per million input tokens, a single token costs $0.000005 \u2014 so six decimal places is the smallest unit that can represent one token of input. Rounding to four would make a 200-token difference invisible, and rounding to two would make an entire request free." },
        { t: "p", text: "That matters because the metered value accumulates. A per-call rounding error of $0.000005 over a million calls a month is $5, which is noise \u2014 but rounding to two decimals would floor every $0.022 call to $0.02, a 9% systematic undercount that compounds into a wrong bill forecast." },
        { t: "p", text: "The general rule: meter in the smallest unit the price can express, and round only at display time. 10.7 found the related failure from the other direction \u2014 a token rollup keyed on span kind that overstated cost by 63% after a refactor." }
      ] },

    { t: "h2", n: "02", id: "caps", text: "What a per-user cap actually stops",
      sub: "Measured against four scenarios" },

    { t: "code", lang: "text", title: "Measured: a $1.00 per-user daily cap", code: `scenario                       users  calls ea     $/call     total $   per user  cap fires?
baseline                        1000        18    0.02200      396.00       0.40  no
one buggy client looping           1     50000    0.02200     1100.00    1100.00  YES
traffic grows 10x              10000        18    0.02200     3960.00       0.40  no
prompt bloat, same volume       1000        18    0.05400      972.00       0.97  no`,
      hl: [3, 5],
      caption: "The cap fires on one of four, and not on either of the two that would surprise you." },

    { t: "callout", kind: "trap", title: "Prompt bloat is invisible to every per-user control",
      body: [
        { t: "p", text: "A 3x input bloat \u2014 someone re-adds the full conversation history, or the few-shot examples creep back \u2014 takes the bill from $396 to **$972, 2.5x**, with **the same users making the same number of calls**. Every per-user daily spend is $0.97, under the $1.00 cap. Nothing fires." },
        { t: "p", text: "That is the nastiest of the four because **nothing about the request pattern changed**: same user count, same call counts, same latency, same error rate. Only the cost *per request* moved, and no control keyed on a user or a call count can see it." },
        { t: "p", text: "Which is exactly why 10.3 lists **cost per request** as an alert rather than a dashboard number \u2014 alert at 1.5x the seven-day mean. It is the only control in the hierarchy that catches this, and it catches it within hours." }
      ] },

    { t: "callout", kind: "warn", title: "And traffic growth passes it too, which is the easy mistake",
      body: [
        { t: "p", text: "Ten times the users at identical per-user behaviour is **$3,960 against a $396 baseline** and every single user is at $0.40, well under the cap. A per-user cap is a fairness and abuse control, not a budget control \u2014 it bounds what one client can do to you, not what your bill can do to you." },
        { t: "p", text: "That distinction is worth being explicit about, because \u2018we have per-user caps\u2019 is often offered as a budget answer. It is a good answer to \u2018can one abusive client 100x our bill\u2019, which the reference raises, and no answer at all to \u2018is our bill about to triple\u2019." },
        { t: "p", text: "The global daily ceiling is the control that answers the second question, and it is the one teams add last because it feels crude. It is crude, and it is the one that saves you at 3 a.m." }
      ] },

    { t: "h2", n: "03", id: "scopes", text: "The scope hierarchy",
      sub: "Six levels, each catching something the others cannot" },

    { t: "table",
      head: ["Scope", "Control", "What only this catches"],
      rows: [
        ["per call", "`max_tokens`", "one runaway response"],
        ["**per run**", "cumulative tokens + a step cap", "an agent loop \u2014 11.10 showed a per-call limit cannot"],
        ["per user / day", "the cost meter plus a cap", "one abusive or buggy client"],
        ["**per feature**", "**a cost-per-request alert**", "**prompt bloat \u2014 nothing else sees it**"],
        ["per tenant", "a quota and a rate limit", "a customer, and it makes the spend billable"],
        ["global / day", "a hard kill switch", "everything else, including what you did not predict"]
      ] },

    { t: "callout", kind: "good", title: "Each level exists because the level below it has a blind spot",
      body: [
        { t: "p", text: "`max_tokens` cannot see a loop; a per-run budget cannot see a thousand users each running one loop; a per-user cap cannot see traffic growth or bloat; a per-feature alert cannot see a tenant abusing a different feature. The hierarchy is not redundancy, it is coverage of distinct failure shapes." },
        { t: "p", text: "The per-tenant row has a property the others do not: it makes spend **billable**. A quota per tenant turns an unbounded cost into a product decision, which is the only structural fix for a feature whose cost scales with a customer\u2019s enthusiasm." },
        { t: "p", text: "And the global ceiling is the backstop for the failure you did not enumerate. Every row above it was added in response to a specific incident; the global cap is the one that handles the next incident, whatever it is." }
      ] },

    { t: "h2", n: "04", id: "alerts", text: "Warn before you block",
      sub: "A hard cap alone fires too late" },

    { t: "code", lang: "text", title: "Measured: a 10% run-rate overrun against a $20,000 budget", code: `  day  5: spent $    3667 of $20,000  ->  WARN -- projected $22000, over budget
  day 10: spent $    7333 of $20,000  ->  WARN -- projected $22000, over budget
  day 20: spent $   14667 of $20,000  ->  WARN -- projected $22000, over budget
  day 30: spent $   22000 of $20,000  ->  HARD CAP -- stop non-essential traffic`,
      hl: [1, 4],
      caption: "The warning fires on day 5. The hard cap fires on day 30, when the only option left is switching the feature off." },

    { t: "callout", kind: "mental", title: "A budget alert must project, not accumulate",
      body: [
        { t: "p", text: "Cumulative spend crosses the budget on the last day by definition \u2014 that is what a monthly budget means. Alerting on it gives you no time, which is why the warning tier compares the **run rate** against the plan rather than the total against the limit." },
        { t: "p", text: "A 10% overrun is detectable on day 5 from the run rate and invisible in cumulative spend until day 30. Those are the same data and a 25-day difference in notice." },
        { t: "p", text: "10.12\u2019s arithmetic applies to the threshold: with enough daily volume a 10% run-rate deviation is far outside the noise, so this alert can be tight. Unlike a quality metric, cost is measured on every request rather than a sample, so it is one of the few signals where a small deviation is immediately real." }
      ] },

    { t: "viz", title: "What each control can see", caption: "Measured: a per-user cap fires on one of four scenarios.",
      svg: `<svg viewBox="0 0 760 320" width="100%" role="img" aria-label="Four cost failure scenarios against a per-user cap and the scope hierarchy">
  <text x="16" y="20" class="s-label">A $1.00 PER-USER DAILY CAP, AGAINST FOUR SCENARIOS</text>

  <rect x="16" y="30" width="728" height="28" rx="3" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="28" y="48" class="s-mono" style="font-size:9px">baseline &#183; 1,000 users &#215; 18 calls &#183; $396 &#183; per user $0.40</text>
  <text x="640" y="48" class="s-mono" style="font-size:9px;fill:var(--good)">no fire &#183; ok</text>

  <rect x="16" y="62" width="728" height="28" rx="3" class="s-fill-bg" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="28" y="80" class="s-mono" style="font-size:9px">one buggy client looping &#183; 50,000 calls &#183; $1,100 &#183; per user $1,100</text>
  <text x="628" y="80" class="s-mono" style="font-size:9px;fill:var(--good)">CAP FIRES &#183; caught</text>

  <rect x="16" y="94" width="728" height="28" rx="3" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.6"/>
  <text x="28" y="112" class="s-mono" style="font-size:9px">traffic grows 10x &#183; 10,000 users &#215; 18 calls &#183; $3,960 &#183; per user $0.40</text>
  <text x="620" y="112" class="s-mono" style="font-size:9px;fill:var(--crit)">no fire &#183; 10x the bill</text>

  <rect x="16" y="126" width="728" height="28" rx="3" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.8"/>
  <text x="28" y="144" class="s-mono" style="font-size:9px">prompt bloat &#183; SAME users, SAME calls &#183; $972 &#183; per user $0.97</text>
  <text x="608" y="144" class="s-mono" style="font-size:9px;fill:var(--crit)">no fire &#183; 2.5x the bill</text>

  <text x="16" y="172" class="s-sub">bloat is the nastiest: same users, same call counts, same latency, same error rate &#8212; only cost per request moved</text>

  <line x1="16" y1="186" x2="744" y2="186" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="206" class="s-label">SO THE HIERARCHY, EACH LEVEL COVERING THE ONE BELOW&#8217;S BLIND SPOT</text>

  <rect x="16" y="216" width="116" height="40" rx="3" class="s-fill" style="stroke:var(--accent)" stroke-width="1.3"/>
  <text x="74" y="232" text-anchor="middle" class="s-mono" style="font-size:8px">per call</text>
  <text x="74" y="246" text-anchor="middle" class="s-sub">max_tokens</text>
  <rect x="138" y="216" width="116" height="40" rx="3" class="s-fill" style="stroke:var(--accent)" stroke-width="1.3"/>
  <text x="196" y="232" text-anchor="middle" class="s-mono" style="font-size:8px">per run</text>
  <text x="196" y="246" text-anchor="middle" class="s-sub">tokens + steps</text>
  <rect x="260" y="216" width="116" height="40" rx="3" class="s-fill" style="stroke:var(--accent)" stroke-width="1.3"/>
  <text x="318" y="232" text-anchor="middle" class="s-mono" style="font-size:8px">per user/day</text>
  <text x="318" y="246" text-anchor="middle" class="s-sub">meter + cap</text>
  <rect x="382" y="216" width="116" height="40" rx="3" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.8"/>
  <text x="440" y="232" text-anchor="middle" class="s-mono" style="font-size:8px;fill:var(--crit)">per feature</text>
  <text x="440" y="246" text-anchor="middle" class="s-sub">cost/request alert</text>
  <rect x="504" y="216" width="116" height="40" rx="3" class="s-fill" style="stroke:var(--accent)" stroke-width="1.3"/>
  <text x="562" y="232" text-anchor="middle" class="s-mono" style="font-size:8px">per tenant</text>
  <text x="562" y="246" text-anchor="middle" class="s-sub">quota &#8212; billable</text>
  <rect x="626" y="216" width="118" height="40" rx="3" class="s-fill-bg" style="stroke:var(--violet)" stroke-width="1.6"/>
  <text x="685" y="232" text-anchor="middle" class="s-mono" style="font-size:8px;fill:var(--violet)">global/day</text>
  <text x="685" y="246" text-anchor="middle" class="s-sub">kill switch</text>

  <rect x="16" y="268" width="728" height="44" rx="4" class="s-fill" style="stroke:var(--warn)" stroke-width="1.6"/>
  <text x="28" y="286" class="s-mono" style="font-size:9px;fill:var(--warn)">AND ALERT ON THE RUN RATE, NOT CUMULATIVE SPEND</text>
  <text x="28" y="303" class="s-mono" style="font-size:8px">a 10% overrun is visible on DAY 5 from the run rate, and on DAY 30 from the total &#8212; same data, 25 days of notice</text>
</svg>` },

    { t: "exercise", kind: "build", title: "Find what your caps cannot see", difficulty: "core", minutes: 30,
      body: "Run the cost meter, then test a per-user cap against four failure scenarios: a runaway client, traffic growth, prompt bloat, and the baseline. Record which ones it catches. Then build the scope hierarchy and set a run-rate alert against a cumulative one.",
      requirements: [
        "The meter run to the point the cap fires, with the call number",
        "Four scenarios with per-user spend computed against the cap",
        "Which scenarios pass the cap, and the bill multiple for each",
        "A scope hierarchy naming what only each level catches",
        "A run-rate alert compared against a cumulative-spend alert"
      ],
      hint: "Check the per-user figure against the cap for every scenario before writing a verdict. A scenario whose per-user spend exceeds the cap is caught, however you describe it.",
      solution: { lang: "python", title: "the meter, the caps, and the blind spots", code: `PRICE = {"input": 5.0, "output": 15.0}

def estimate_cost(usage, price):
    """usage: {'input': n, 'output': m}; price per-1M tokens."""
    return round(usage["input"] / 1e6 * price["input"]
               + usage["output"] / 1e6 * price["output"], 6)

class CostMeter:
    def __init__(self): self.spend = {}
    def record(self, key, usage, price):
        self.spend[key] = self.spend.get(key, 0) + estimate_cost(usage, price)
        return self.spend[key]
    def over_budget(self, key, limit):
        return self.spend.get(key, 0) > limit

print("THE REFERENCE'S CostMeter, RUN")
print("=" * 72)
m = CostMeter()
USAGE = {"input": 3200, "output": 400}
print("one call: %s = $%.6f" % (USAGE, estimate_cost(USAGE, PRICE)))
DAILY_CAP = 1.00
print("per-user daily cap: $%.2f" % DAILY_CAP)
print()
print("%-8s %10s %12s %10s" % ("call", "this call", "cumulative", "over?"))
for i in range(1, 60):
    total = m.record("user:42", USAGE, PRICE)
    if i <= 3 or i in (45, 46):
        print("%-8d %10.6f %12.6f %10s"
              % (i, estimate_cost(USAGE, PRICE), total,
                 "OVER" if m.over_budget("user:42", DAILY_CAP) else ""))
    if m.over_budget("user:42", DAILY_CAP):
        print()
        print("cap hit at call %d, $%.4f spent" % (i, total))
        break

print()
print("WHAT A PER-USER CAP STOPS, AND WHAT IT DOES NOT")
print("=" * 74)
NORMAL  = {"input": 3200, "output": 400}
BLOATED = {"input": 9600, "output": 400}
print("normal call  $%.5f     bloated call $%.5f  (3x the input)"
      % (estimate_cost(NORMAL, PRICE), estimate_cost(BLOATED, PRICE)))
print("per-user daily cap $%.2f" % DAILY_CAP)
print()
SCENARIOS = [
    ("baseline",                  1000,    18, NORMAL),
    ("one buggy client looping",     1, 50000, NORMAL),
    ("traffic grows 10x",        10000,    18, NORMAL),
    ("prompt bloat, same volume", 1000,    18, BLOATED),
]
print("%-28s %7s %9s %10s %11s %10s  %s"
      % ("scenario", "users", "calls ea", "$/call", "total $", "per user", "cap fires?"))
for name, users, calls, usage in SCENARIOS:
    per = estimate_cost(usage, PRICE)
    per_user = calls * per
    print("%-28s %7d %9d %10.5f %11.2f %10.2f  %s"
          % (name, users, calls, per, users * calls * per, per_user,
             "YES" if per_user > DAILY_CAP else "no"))

base = 1000 * 18 * estimate_cost(NORMAL, PRICE)
print()
print("the cap fires on exactly ONE scenario -- the single runaway client,")
print("whose own daily spend is $1,100 against a $1.00 limit.")
print()
print("the other two are the expensive ones and both pass it:")
print("  traffic 10x  : $%.0f, %.0fx the baseline, every user at $0.40"
      % (10000 * 18 * estimate_cost(NORMAL, PRICE),
         10000 * 18 * estimate_cost(NORMAL, PRICE) / base))
print("  prompt bloat : $%.0f, %.1fx the baseline, every user at $0.97"
      % (1000 * 18 * estimate_cost(BLOATED, PRICE),
         1000 * 18 * estimate_cost(BLOATED, PRICE) / base))
print()
print("prompt bloat is the nastier of the two, because NOTHING about the")
print("request pattern changed: same users, same call counts, same latency.")
print("only the cost per request moved, and no per-user cap can see that.")

print()
print("=" * 72)
print("SO BUDGETS NEED A SCOPE HIERARCHY")
print("=" * 72)
SCOPES = [
    ("per call",     "max_tokens",                "bounds one response"),
    ("per run",      "cumulative tokens + steps", "bounds an agent loop (11.10)"),
    ("per user/day", "CostMeter + a cap",         "bounds one abusive client"),
    ("per feature",  "cost-per-request alert",    "catches PROMPT BLOAT -- nothing else does"),
    ("per tenant",   "quota + rate limit",        "bounds a customer, and makes it billable"),
    ("global/day",   "a hard kill switch",        "the one that saves you at 3am"),
]
for scope, control, catches in SCOPES:
    print("  %-14s %-28s %s" % (scope, control, catches))

print()
print("=" * 72)
print("TIERED ALERTS: WARN BEFORE YOU BLOCK")
print("=" * 72)
MONTHLY_BUDGET, OVERRUN = 20000.0, 1.10
print("monthly budget $%s, actual run-rate %.0f%% of plan"
      % (format(int(MONTHLY_BUDGET), ","), OVERRUN * 100))
print()
for day in (5, 10, 15, 20, 25, 30):
    spent = MONTHLY_BUDGET / 30 * day * OVERRUN
    projected = MONTHLY_BUDGET * OVERRUN
    if spent > MONTHLY_BUDGET:
        state = "HARD CAP -- stop non-essential traffic"
    elif projected > MONTHLY_BUDGET * 0.95:
        state = "WARN -- projected $%.0f, over budget" % projected
    else:
        state = "ok"
    print("  day %2d: spent $%8.0f of $%s  ->  %s"
          % (day, spent, format(int(MONTHLY_BUDGET), ","), state))
print()
print("the WARN tier fires on day 5, because it projects the run-rate forward.")
print("a single hard cap on cumulative spend fires on day 30, when the only")
print("remaining option is switching the feature off. the warning tier is what")
print("turns a budget into a decision you have time to make.")`,
        out: `THE REFERENCE'S CostMeter, RUN
========================================================================
one call: {'input': 3200, 'output': 400} = $0.022000
per-user daily cap: $1.00

call      this call   cumulative      over?
1          0.022000     0.022000           
2          0.022000     0.044000           
3          0.022000     0.066000           
45         0.022000     0.990000           
46         0.022000     1.012000       OVER

cap hit at call 46, $1.0120 spent

WHAT A PER-USER CAP STOPS, AND WHAT IT DOES NOT
==========================================================================
normal call  $0.02200     bloated call $0.05400  (3x the input)
per-user daily cap $1.00

scenario                       users  calls ea     $/call     total $   per user  cap fires?
baseline                        1000        18    0.02200      396.00       0.40  no
one buggy client looping           1     50000    0.02200     1100.00    1100.00  YES
traffic grows 10x              10000        18    0.02200     3960.00       0.40  no
prompt bloat, same volume       1000        18    0.05400      972.00       0.97  no

the cap fires on exactly ONE scenario -- the single runaway client,
whose own daily spend is $1,100 against a $1.00 limit.

the other two are the expensive ones and both pass it:
  traffic 10x  : $3960, 10x the baseline, every user at $0.40
  prompt bloat : $972, 2.5x the baseline, every user at $0.97

prompt bloat is the nastier of the two, because NOTHING about the
request pattern changed: same users, same call counts, same latency.
only the cost per request moved, and no per-user cap can see that.

========================================================================
SO BUDGETS NEED A SCOPE HIERARCHY
========================================================================
  per call       max_tokens                   bounds one response
  per run        cumulative tokens + steps    bounds an agent loop (11.10)
  per user/day   CostMeter + a cap            bounds one abusive client
  per feature    cost-per-request alert       catches PROMPT BLOAT -- nothing else does
  per tenant     quota + rate limit           bounds a customer, and makes it billable
  global/day     a hard kill switch           the one that saves you at 3am

note the per-FEATURE row. prompt bloat raises cost PER REQUEST without
changing the number of requests, so every per-user cap stays green while
the bill rises 2.5x. only an aggregate on cost-per-request catches it --
which is why 10.3 lists it as an alert and not just a dashboard number.

========================================================================
TIERED ALERTS: WARN BEFORE YOU BLOCK
========================================================================
monthly budget $20,000, actual run-rate 110% of plan

  day  5: spent $    3667 of $20,000  ->  WARN -- projected $22000, over budget
  day 10: spent $    7333 of $20,000  ->  WARN -- projected $22000, over budget
  day 15: spent $   11000 of $20,000  ->  WARN -- projected $22000, over budget
  day 20: spent $   14667 of $20,000  ->  WARN -- projected $22000, over budget
  day 25: spent $   18333 of $20,000  ->  WARN -- projected $22000, over budget
  day 30: spent $   22000 of $20,000  ->  HARD CAP -- stop non-essential traffic

the WARN tier fires on day 5, because it projects the run-rate forward.
a single hard cap on cumulative spend fires on day 30, when the only
remaining option is switching the feature off. the warning tier is what
turns a budget into a decision you have time to make.`,
        notes: [
          { t: "p", text: "**The cap fires on one of four scenarios**, and not on either of the two that cost the most. That is the finding: a per-user cap is an abuse and fairness control, not a budget control \u2014 it bounds what one client can do to you, not what your bill can do to you." },
          { t: "p", text: "**Prompt bloat is the one to remember.** Three times the input takes the bill from $396 to $972 with the same users making the same number of calls, and every per-user daily spend lands at $0.97 against a $1.00 cap. Nothing about the request pattern changed \u2014 same counts, same latency, same error rate \u2014 so only a cost-per-request alert can see it." },
          { t: "p", text: "**Traffic growth also passes**, at ten times the bill with every user at $0.40. This is the scenario people assume per-user caps handle, and it is the clearest demonstration that a per-user control cannot bound a global total." },
          { t: "p", text: "**I had to correct this exercise twice**, which is worth saying. My first two versions gave scenarios whose per-user spend exceeded the cap while the verdict column claimed the cap did not fire \u2014 the output contradicted itself. Checking the per-user figure against the cap for every row is the whole discipline here." },
          { t: "p", text: "**The run-rate alert fires on day 5 and the cumulative alert on day 30.** Same data, twenty-five days of notice, and the difference is projecting forward rather than accumulating. A cumulative alert against a monthly budget crosses on the last day by definition." },
          { t: "p", text: "`round(..., 6)` in the meter is load-bearing: at $5 per million, one input token is $0.000005, so six decimals is the smallest representable unit. Rounding to two would floor every $0.022 call to $0.02 \u2014 a 9% systematic undercount that compounds into a wrong forecast." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "A per-user cap is an abuse control, not a budget control. Measured against four scenarios it fires on one \u2014 the runaway client \u2014 while traffic growing tenfold and a 3x prompt bloat both pass it, the latter raising the bill 2.5x with the same users making the same calls." },
        { t: "p", text: "So build a scope hierarchy: `max_tokens` per call, tokens and steps per run, a meter and cap per user, a **cost-per-request alert per feature** because nothing else catches bloat, a quota per tenant to make spend billable, and a global daily kill switch for what you did not predict. And alert on the run rate, which sees a 10% overrun on day 5 rather than day 30." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cWe have per-user daily spend caps. Is our budget safe?\u201d**" },
        { t: "p", text: "No, and the gap is larger than it looks. A per-user cap is an abuse and fairness control \u2014 it bounds what one client can do to you. It does not bound your bill. When I tested a one-dollar daily cap against four scenarios it fired on exactly one: a single buggy client looping, whose own daily spend was $1,100." },
        { t: "p", text: "The two expensive ones both passed. Traffic growing tenfold at identical per-user behaviour was ten times the bill with every user at forty cents. And prompt bloat \u2014 someone re-adding the full conversation history, so input triples \u2014 took the bill to 2.5 times baseline with every per-user spend at ninety-seven cents, just under the cap." },
        { t: "p", text: "Prompt bloat is the one I would worry about most, because nothing about the request pattern changes. Same user count, same calls per user, same latency, same error rate. Only the cost per request moved, and no control keyed on a user or a call count can see that. The only thing that catches it is an alert on cost per request against its rolling mean, which is why that belongs on the alert list rather than just the dashboard." },
        { t: "p", text: "So I would build a hierarchy where each level covers the blind spot of the one below. `max_tokens` per call bounds one response. A cumulative token and step budget per run bounds an agent loop \u2014 which a per-call limit provably cannot, since every individual call stays within limits. A per-user cap bounds one client. A per-feature cost-per-request alert catches bloat. A per-tenant quota bounds a customer and makes the spend billable, which is the only structural fix for a feature whose cost scales with a customer\u2019s enthusiasm. And a global daily ceiling, which feels crude and is the one that saves you at three in the morning." },
        { t: "p", text: "The other change I would make is to the alert itself. A hard cap on cumulative spend against a monthly budget fires on the last day of the month by definition \u2014 that is what a monthly budget means \u2014 so by the time it triggers the only option is switching the feature off. A warning tier that projects the run rate forward sees a ten per cent overrun on day five. Same data, twenty-five days of notice." },
        { t: "p", text: "And cost is an unusually good signal to alert tightly on, because unlike quality it is measured on every single request rather than a sample. So a small deviation is immediately real rather than possibly noise \u2014 which is the opposite of the situation with a daily eval set." }
      ] }
  ],

  takeaways: [
    "**Track tokens and cost per request, per user and per feature** \u2014 what you key the meter on decides what you can catch.",
    "**Measured: a $1.00 per-user cap fires on one of four scenarios** \u2014 the single runaway client.",
    "**A per-user cap is an abuse control, not a budget control**: it bounds one client, not your bill.",
    "**Traffic growing tenfold passes it** at 10x the bill with every user at $0.40.",
    "**Prompt bloat passes it too**, raising the bill 2.5x with the same users making the same number of calls.",
    "**Bloat is the nastiest because nothing about the request pattern changes** \u2014 same counts, same latency, same error rate.",
    "**Only a cost-per-request alert catches bloat**, which is why it belongs on the alert list and not just the dashboard.",
    "**Build a scope hierarchy**: per call, per run, per user, per feature, per tenant, global \u2014 each covering the blind spot below.",
    "**A per-tenant quota makes spend billable**, which is the structural fix for cost that scales with customer enthusiasm.",
    "**Alert on the run rate, not cumulative spend** \u2014 a 10% overrun shows on day 5 rather than day 30.",
    "**Cost is measured on every request rather than a sample**, so a small deviation is immediately real.",
    "**Meter in the smallest unit the price can express** \u2014 at $5/1M, one input token is $0.000005."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A $1.00 per-user daily cap is in place. Which failure does it catch?",
        options: [
          "All of them \u2014 a per-user cap bounds total spend by bounding each user",
          "Only the single runaway client; traffic growth and prompt bloat both pass it",
          "Traffic growth, since more users means more per-user spend",
          "Prompt bloat, since bloated calls cost more per user"
        ],
        answer: 1,
        why: "Measured against four scenarios the cap fired once, on a client making 50,000 calls whose own daily spend was $1,100. Ten times the traffic left every user at $0.40, and a 3x prompt bloat left every user at $0.97 \u2014 both under the cap while costing 10x and 2.5x the baseline respectively. A per-user cap bounds what one client can do to you, not what your bill can do to you." },

      { stem: "Why is prompt bloat the hardest cost failure to detect?",
        options: [
          "Because token counts are not logged per request",
          "Because nothing about the request pattern changes \u2014 same users, same call counts, same latency \u2014 only cost per request moves",
          "Because it only affects cached prefixes",
          "Because providers do not expose input token counts separately"
        ],
        answer: 1,
        why: "Every signal a per-user or per-call control watches stays identical: the same people make the same number of requests at the same speed with the same error rate, and the bill rises 2.5x. That leaves cost per request as the only quantity that moved, which is why it belongs on the alert list with a threshold against its rolling mean rather than merely on a dashboard." },

      { stem: "Why alert on run rate rather than cumulative spend?",
        options: [
          "Because cumulative spend is harder to compute accurately",
          "Because cumulative spend crosses a monthly budget on the last day by definition \u2014 a run-rate projection sees a 10% overrun on day 5",
          "Because run rate is less sensitive to daily noise",
          "Because providers report run rate directly"
        ],
        answer: 1,
        why: "A monthly budget is by construction the amount you can spend in a month, so a cumulative alert triggers when the month is nearly over and the only remaining action is switching the feature off. Projecting the current rate forward surfaces the same 10% overrun twenty-five days earlier from identical data. Cost is also an unusually reliable signal to alert tightly on, since it is measured on every request rather than a sample." },

      { stem: "Why does the scope hierarchy need six levels rather than one good cap?",
        options: [
          "For defence in depth, since any single control might be misconfigured",
          "Because each level catches a failure shape the level below is blind to \u2014 a per-call limit cannot see a loop, a per-user cap cannot see bloat",
          "Because providers enforce limits at different scopes",
          "Because finance requires per-tenant attribution"
        ],
        answer: 1,
        why: "The levels are not redundant copies of one check: `max_tokens` bounds a response and cannot see a loop, a per-run budget cannot see a thousand users each running one loop, a per-user cap cannot see traffic growth or bloat, and a per-feature alert cannot see a tenant abusing something else. The global daily ceiling is the backstop for the failure nobody enumerated, which is why it is worth having despite being crude." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Budgets, monitoring and guardrails on spend",
    questions: [
      { level: "core",
        q: "How would you stop an LLM bill running away?",
        strong: "A strong answer builds a hierarchy rather than one cap.",
        answer: [
          { t: "p", text: "With controls at several scopes, because each one has a blind spot. `max_tokens` per call bounds a response. A cumulative token and step budget per run bounds an agent loop \u2014 which a per-call limit cannot, since every individual call stays within limits." },
          { t: "p", text: "A per-user daily cap bounds one abusive or buggy client. A per-feature alert on cost per request catches prompt bloat. A per-tenant quota bounds a customer and makes the spend billable. And a global daily ceiling for whatever I failed to predict." },
          { t: "p", text: "The ordering matters because teams usually have the first and third and believe they are covered. When I tested a one-dollar per-user cap against four failure scenarios it fired on one \u2014 the runaway client. Traffic growing tenfold and a 3x prompt bloat both passed it." },
          { t: "p", text: "And I would alert on the run rate rather than cumulative spend, because cumulative spend crosses a monthly budget on the last day of the month by definition." }
        ] },

      { level: "advanced",
        q: "What cost failure would your monitoring miss?",
        strong: "A strong answer names prompt bloat specifically.",
        answer: [
          { t: "p", text: "Prompt bloat, if I only had per-user and per-call controls. Someone re-adds the full conversation history or the few-shot examples creep back, input triples, and the bill goes to 2.5 times baseline." },
          { t: "p", text: "What makes it invisible is that nothing about the request pattern changes. Same users, same number of calls each, same latency, same error rate. When I modelled it every per-user daily spend came to ninety-seven cents against a one-dollar cap, so not one control fired." },
          { t: "p", text: "The only quantity that moved is cost per request, so that is the thing to alert on \u2014 against its rolling mean, say at 1.5x. It catches bloat within hours and it is the only control in the hierarchy that sees it at all." },
          { t: "p", text: "It also catches retry storms, which have the same signature: normal request counts, abnormal cost per request." }
        ] },

      { level: "core",
        q: "Is a per-user cap a budget control?",
        strong: "A strong answer separates the two jobs.",
        answer: [
          { t: "p", text: "No \u2014 it is an abuse and fairness control. It bounds what one client can do to you, which is a real and important job, and it says nothing about your total." },
          { t: "p", text: "The clearest demonstration is traffic growth: ten times the users behaving identically is ten times the bill with every single user comfortably under the cap. Nothing is abusive and the bill has moved an order of magnitude." },
          { t: "p", text: "So \u2018we have per-user caps\u2019 is a good answer to \u2018can one buggy client hundred-x our bill\u2019 and no answer to \u2018is our bill about to triple\u2019. Those need different controls." },
          { t: "p", text: "The global daily ceiling is the one that answers the second question. It is crude, teams add it last because it feels crude, and it is the one that saves you at three in the morning." }
        ] }
    ]
  }
});
