/* ============================================================================
   LESSON 17.3 — Beyond A/B: Bandits and Interleaving
   ========================================================================= */
EC.receiveLesson({
  id: "17.3",

  lede: "A fixed 50/50 split is the right design when you want a clean estimate and can afford to show the worse variant to half the users for the whole test. Three situations call for something else. When the goal is to earn the most while learning, a multi-armed bandit shifts traffic towards the winner as evidence arrives. When comparing rankers, interleaving shows both to the same user and asks which they preferred. When users share a resource, such as couriers in a marketplace, a user-level split contaminates control, and a switchback test alternates the whole market over time. This lesson measures what each buys and what each gives up.",

  objectives: [
    "Compare a fixed split with Thompson sampling on lost conversions and on what is learned",
    "Explain team-draft interleaving and measure its sensitivity against an A/B test",
    "Recognise interference between users and measure the bias it causes in an A/B test",
    "Design a switchback test and know its own limits"
  ],

  prerequisites: ["17.1", "17.2"],

  blocks: [
    { t: "h2",
      n: "01",
      id: "bandits",
      text: "Bandits and interleaving",
      sub: "Earning while learning; asking the same user" },
    { t: "code",
      lang: "python",
      title: "beyondab.py — Thompson sampling, and interleaving against A/B",
      code: `import numpy as np
rng = np.random.default_rng(26)

print("== 1. three model variants, 300,000 impressions: a fixed split against Thompson sampling ==")
rates = np.array([0.030, 0.033, 0.027]); N = 300_000
def fixed():
    arm = rng.integers(0, 3, N); conv = rng.random(N) < rates[arm]
    return conv.sum(), np.bincount(arm, minlength=3)
def thompson():
    a, b = np.ones(3), np.ones(3); pulls = np.zeros(3, int); total = 0
    for _ in range(N // 100):                                   # update in batches of 100, as a service would
        k = np.argmax(rng.beta(a[:, None], b[:, None], (3, 100)), 0)
        c = rng.random(100) < rates[k]
        for j in range(3):
            m = k == j; a[j] += c[m].sum(); b[j] += m.sum() - c[m].sum(); pulls[j] += m.sum()
        total += c.sum()
    return total, pulls
best = N * rates.max()
for name, fn in (("fixed 1/3 split", fixed), ("Thompson sampling", thompson)):
    conv, pulls = fn()
    se_worst = np.sqrt(rates[2] * (1 - rates[2]) / max(pulls[2], 1))
    print(f"  {name:<18} conversions {conv:,}  (lost against always-best {best - conv:,.0f})  "
          f"impressions per arm {pulls.tolist()}  s.e. on the worst arm's rate {se_worst:.4f}")

print("\\n== 2. comparing two rankers: an A/B test against team-draft interleaving ==")
EXAM = 1 / np.arange(1, 11) ** 0.7                               # chance a user looks at each position
def candidates():                                                # one user's 30 candidates, each with a true relevance
    r = rng.beta(1, 4, 30)
    return r, np.argsort(-(r + rng.normal(0, 0.30, 30)))[:10], np.argsort(-(r + rng.normal(0, 0.25, 30)))[:10]   # A noisier than B
def ab(n_users):
    score = {"A": 0, "B": 0}
    for i in range(n_users):
        r, la, lb = candidates(); shown = la if i % 2 == 0 else lb
        score["A" if i % 2 == 0 else "B"] += (rng.random(10) < EXAM * r[shown]).sum()
    return score["B"] > score["A"]
def interleave(n_users):
    margin = 0
    for _ in range(n_users):
        r, la, lb = candidates(); shown, team, ia, ib = [], [], 0, 0
        while len(shown) < 10:                                   # team draft: a coin decides who picks first each round
            for t in (("A", "B") if rng.random() < 0.5 else ("B", "A")):
                lst, idx = (la, ia) if t == "A" else (lb, ib)
                while idx < 10 and lst[idx] in shown: idx += 1
                if idx < 10 and len(shown) < 10: shown.append(lst[idx]); team.append(t); idx += 1
                if t == "A": ia = idx
                else: ib = idx
        click = rng.random(10) < EXAM * r[np.array(shown)]
        team = np.array(team); margin += np.sign(click[team == "B"].sum() - click[team == "A"].sum())
    return margin > 0
for n in (300, 1_000, 3_000):
    pa = np.mean([ab(n) for _ in range(100)]); pi = np.mean([interleave(n) for _ in range(100)])
    print(f"  {n:>6,} users: picks the better ranker  A/B {pa:.0%}   interleaving {pi:.0%}")`,
      out: `== 1. three model variants, 300,000 impressions: a fixed split against Thompson sampling ==
  fixed 1/3 split    conversions 8,964  (lost against always-best 936)  impressions per arm [100118, 100078, 99804]  s.e. on the worst arm's rate 0.0005
  Thompson sampling  conversions 9,885  (lost against always-best 15)  impressions per arm [20895, 272132, 6973]  s.e. on the worst arm's rate 0.0019

== 2. comparing two rankers: an A/B test against team-draft interleaving ==
     300 users: picks the better ranker  A/B 75%   interleaving 81%
   1,000 users: picks the better ranker  A/B 89%   interleaving 95%
   3,000 users: picks the better ranker  A/B 93%   interleaving 100%` },
    { t: "dl",
      items: [
        { term: "The bandit earned more",
          def: "Over 300,000 impressions with three variants, a fixed split lost 936 conversions against always showing the best; Thompson sampling, which samples each variant's plausible rate and shows the best draw, lost 15. It sent 272,132 impressions to the winner." },
        { term: "And learned less about the losers",
          def: "The worst variant received 6,973 impressions instead of 99,804, so its rate's standard error was four times larger (0.0019 against 0.0005). Bandits answer 'which is best' cheaply; they answer 'by how much, and is it safe on every guardrail' poorly." },
        { term: "Interleaving was more sensitive",
          def: "Two rankers scored the same 30 candidates for each user; in team-draft interleaving they take turns filling the ten slots and each click credits the ranker that placed that result. It picked the better ranker 100% of the time at 3,000 users against 93% for an A/B test, because each user compares both rankers, removing the variation between users." }
      ] },
    { t: "table",
      head: ["Design", "Use when", "Gives up"],
      rows: [
        [
          "Fixed split (A/B)",
          "You need an unbiased effect size and guardrails",
          "Revenue from showing the worse arm all test long"
        ],
        [
          "Bandit (Thompson, UCB)",
          "Many variants, short-lived content, earn while learning",
          "Precise estimates for losing arms; harder guardrails"
        ],
        ["Interleaving", "Comparing rankers on the same queries", "Only a preference, not business-metric effects"],
        [
          "Switchback",
          "Users share supply, prices or capacity",
          "Fewer independent units; carry-over between periods"
        ]
      ] },
    { t: "callout",
      kind: "trap",
      title: "A bandit for a decision that needs an effect size",
      body: [
        { t: "p",
          text: "A bandit is good at finding the best variant and bad at measuring how much better it is, or whether it harms a guardrail, because it starves the others of data. For a model launch that needs a defensible effect estimate and safety checks, run a fixed split, then let a bandit manage day-to-day allocation among already-vetted variants if that suits the product." }
      ] },
    { t: "h2",
      n: "02",
      id: "interference",
      text: "When users affect each other",
      sub: "The case for switchbacks" },
    { t: "p",
      text: "A/B tests assume one user's treatment does not change another user's outcome. In marketplaces, ads auctions and anything with shared capacity, that is false: treated users consume supply that control users would have had. The exercise builds a delivery market where a better ranking model raises demand and couriers are limited, and compares a user-level A/B test with a switchback that alternates the whole market between models every hour." },
    { t: "viz",
      title: "Measured effect on completed orders, delivery market",
      caption: "With shared couriers, treated users' extra orders came partly out of control users' capacity, so the A/B gap was nearly three times the real launch effect.",
      svg: `<svg viewBox="0 0 760 134" width="100%" role="img">
<text x="200" y="31.0" text-anchor="end" class="s-label">true effect of launching</text>
<rect x="210" y="14" width="125.0" height="26" rx="4" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="343.0" y="31.0" class="s-sub">+5.0%</text>
<text x="200" y="69.0" text-anchor="end" class="s-label">user-level A/B test</text>
<rect x="210" y="52" width="370.0" height="26" rx="4" class="s-fill" style="stroke:var(--crit);stroke-width:1.8"/>
<text x="588.0" y="69.0" class="s-sub">+14.8%</text>
<text x="200" y="107.0" text-anchor="end" class="s-label">switchback, alternate hours</text>
<rect x="210" y="90" width="125.0" height="26" rx="4" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="343.0" y="107.0" class="s-sub">+5.0%</text>
</svg>` },
    { t: "exercise",
      kind: "Challenge",
      title: "A switchback test under interference",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p",
          text: "Simulate 28 days of hourly demand in a delivery market where couriers can complete at most 1,050 orders an hour. A new model raises ordering by 15%. When demand exceeds capacity, orders are lost at random across all users. Measure the true effect of launching to everyone (all-treatment against all-control hours), the effect a 50/50 user-level A/B test reports, and the effect a switchback test that alternates the whole market each hour reports." }
      ],
      requirements: [
        "A shared capacity that both arms draw on",
        "The true launch effect as the reference",
        "A user-level split within each hour",
        "A switchback alternating whole hours"
      ],
      hint: "Compute the fill rate as capacity over total demand, and apply it to both groups in the hour; that is the interference.",
      solution: { lang: "python",
        title: "switchback.py",
        code: `import numpy as np
rng = np.random.default_rng(27)

# A delivery marketplace. Each hour, couriers can complete at most CAP orders. A new ranking model makes users order more
# (+15% demand). When demand exceeds capacity, orders are lost at random across ALL users, treated or not.
HOURS, USERS_PER_HOUR, BASE_RATE, CAP, LIFT = 24 * 28, 10_000, 0.10, 1_050, 0.15

def hour(treated_share):
    """Completed orders per user in the treated and control groups for one hour."""
    n_t = int(USERS_PER_HOUR * treated_share); n_c = USERS_PER_HOUR - n_t
    want_t = rng.binomial(n_t, BASE_RATE * (1 + LIFT)); want_c = rng.binomial(n_c, BASE_RATE)
    fill = min(1.0, CAP / max(want_t + want_c, 1))                      # shared couriers: everyone loses the same share
    return (rng.binomial(want_t, fill) / n_t if n_t else np.nan), (rng.binomial(want_c, fill) / n_c if n_c else np.nan)

truth_t = np.mean([hour(1.0)[0] for _ in range(HOURS)]); truth_c = np.mean([hour(0.0)[1] for _ in range(HOURS)])
print(f"true effect of launching to everyone: {truth_t / truth_c - 1:+.1%} completed orders per user")

ab = [hour(0.5) for _ in range(HOURS)]
t, c = np.nanmean([x[0] for x in ab]), np.nanmean([x[1] for x in ab])
print(f"user-level A/B, 50/50 split:          {t / c - 1:+.1%}   (treated users take couriers from control users)")

sw = [hour(1.0 if h % 2 == 0 else 0.0) for h in range(HOURS)]          # the whole market switches every hour
t = np.nanmean([sw[h][0] for h in range(0, HOURS, 2)]); c = np.nanmean([sw[h][1] for h in range(1, HOURS, 2)])
print(f"switchback, alternate hours:          {t / c - 1:+.1%}   (each hour is all-treatment or all-control)")`,
        out: `true effect of launching to everyone: +5.0% completed orders per user
user-level A/B, 50/50 split:          +14.8%   (treated users take couriers from control users)
switchback, alternate hours:          +5.0%   (each hour is all-treatment or all-control)`,
        notes: [
          { t: "p",
            text: "The true launch effect was +5.0%: demand rose 15%, but capacity absorbed most of it. The A/B test reported +14.8%, almost three times too high, because treated users took couriers from control users, making control look worse than a world without the model. The switchback, where each hour is entirely one model, measured +5.0%." },
          { t: "p",
            text: "Switchbacks have their own costs: far fewer independent units (hours rather than users), so wider intervals; carry-over when one period's state (a backlog of orders) spills into the next; and time-of-day effects, which randomising the schedule and balancing hours handles." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: the pricing model that won and lost",
      body: [
        { t: "p",
          text: "**Symptom.** A ride-hailing pricing model won its A/B test with a 6% increase in completed rides per rider and was launched to everyone. Completed rides rose by under 1%." },
        { t: "p",
          text: "**Mechanism.** Treated riders saw lower prices and requested more rides, taking drivers from control riders, whose wait times rose and whose completed rides fell. Most of the measured lift was rides moved from control to treatment, not new rides." },
        { t: "p",
          text: "**Fix.** Marketplace experiments moved to switchback designs by city and time window, with balanced, randomised schedules and washout periods between switches, and launch decisions use the switchback estimate." }
      ] }
  ],

  takeaways: [
    "Choose the design for the question: **fixed split** for effect sizes, **bandit** for earning while learning, **interleaving** for rankers, **switchback** for interference.",
    "Thompson sampling lost **15** conversions against **936** for a fixed split, but measured the worst arm **4×** less precisely.",
    "Team-draft interleaving picked the better ranker **100%** of the time at 3,000 users, against **93%** for A/B.",
    "Interference made an A/B test report **+14.8%** for a true launch effect of **+5.0%**; a switchback measured **+5.0%**.",
    "Switchbacks trade units for validity: fewer independent periods, carry-over and time effects to manage.",
    "Use bandits among vetted variants, not for the launch decision that needs guardrails."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "What does a bandit give up compared with a fixed split?",
        options: [
          "Conversions during the test period",
          "Precise estimates for the variants it starves",
          "The ability to find the best variant",
          "Randomisation of which user sees which variant"
        ],
        answer: 1,
        why: "It sent the worst arm 7% of the traffic, so its estimate was four times less precise. It gained conversions, found the winner and still randomises each assignment." },
      { stem: "Why is interleaving more sensitive than an A/B test for rankers?",
        options: [
          "It shows each user more results than an A/B test",
          "Each user compares both rankers directly",
          "It counts only clicks on the first position",
          "It needs no randomisation at all"
        ],
        answer: 1,
        why: "The same user sees results from both, so differences between users cancel. It shows the same number of results, counts clicks at every position and randomises which team picks first." },
      { stem: "In the delivery market, why did the A/B test overstate the effect?",
        options: [
          "The treated users were richer on average than control",
          "Treated users took couriers from control users",
          "The test ran for too few days to settle",
          "Clicks were miscounted for the control"
        ],
        answer: 1,
        why: "Shared capacity meant treatment's extra demand lowered control's fill rate, inflating the gap to +14.8% against a true +5.0%. Randomisation, duration and counting were fine." },
      { stem: "What is a main cost of a switchback test?",
        options: [
          "It cannot measure any of the business metrics",
          "Fewer independent units, so wider intervals",
          "It requires users to be randomised as well",
          "It only works for ranking models"
        ],
        answer: 1,
        why: "Hours or regions, not users, are the units, so there are far fewer of them; carry-over and time effects also need handling. It measures business metrics and works for any treatment." }
    ] },

  interview: { title: "In an interview",
    sub: "Experiment-design answers start by naming the assumption that might break.",
    questions: [
      { level: "core",
        q: "When would you use a bandit instead of an A/B test?",
        strong: "A strong answer contrasts optimisation with estimation and keeps guardrails.",
        answer: [
          { t: "p",
            text: "When the goal is to maximise outcomes during the learning period and an exact effect size is not needed: many creative variants, short-lived content, headline selection. Not for a model launch where you need an unbiased estimate and guardrail checks, because the bandit starves weaker arms of data. A common pattern is an A/B test to vet a model, then a bandit to allocate among vetted variants." }
        ] },
      { level: "advanced",
        q: "How would you test a new pricing model in a two-sided marketplace?",
        strong: "A strong answer identifies interference and proposes switchback or cluster designs.",
        answer: [
          { t: "p",
            text: "A user-level split violates independence, since treated riders compete with control riders for drivers; in the simulation it overstated the effect threefold. Use switchbacks (alternating city-wide models over randomised, balanced time windows with washout periods) or geographic clusters, accept wider intervals, and measure both sides of the market as guardrails." }
        ] },
      { level: "core",
        q: "What is interleaving and when is it the wrong tool?",
        strong: "A strong answer explains team draft and its limitation to preferences.",
        answer: [
          { t: "p",
            text: "Two rankers take turns filling a single result list for each user, and clicks are credited to the ranker that placed the result, giving a highly sensitive preference test. It is the wrong tool when the question is a business effect (revenue, retention) or when the rankers differ in things other than order, such as page layout, because a merged list measures neither system as users would really experience it." }
        ] }
    ] }
});
