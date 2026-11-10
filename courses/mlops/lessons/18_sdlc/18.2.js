/* ============================================================================
   LESSON 18.2 — Waterfall, Agile and the Honest Comparison
   ========================================================================= */
EC.receiveLesson({
  id: "18.2",

  lede: "Process models differ mainly in when they let new information change the plan. Waterfall and the V-model fix requirements up front and verify against them at the end; iterative and spiral models revisit the plan each cycle; Scrum fixes a short time-box and lets the backlog change between sprints. None is right everywhere. This lesson measures two things that decide the fit: how much work a fixed plan wastes when requirements move, and how badly research tasks, whose duration is genuinely uncertain, fit a two-week sprint. Then it forecasts a delivery date from velocity honestly, as a range.",

  objectives: [
    "Describe waterfall, V-model, iterative, spiral and Scrum by when the plan can change",
    "Measure the waste a fixed plan causes when requirements change",
    "Explain why research tasks fit poorly into fixed sprints, with numbers",
    "Use Scrum's ceremonies, stories and velocity without misreading them",
    "Forecast completion from velocity history as a probability range"
  ],

  prerequisites: ["18.1"],

  blocks: [
    { t: "h2", n: "01", id: "models", text: "When the plan can change", sub: "The models side by side" },
    { t: "table",
      head: ["Model", "Plan changes", "Fits", "Fails when"],
      rows: [
        [
          "Waterfall",
          "Rarely; phases in sequence",
          "Fixed, well-understood requirements; regulated hand-offs",
          "Requirements move during the build"
        ],
        [
          "V-model",
          "Rarely; each phase paired with a test level",
          "Safety-critical systems needing traceable verification",
          "Learning happens late"
        ],
        [
          "Iterative / spiral",
          "Every cycle, spiral driven by risk",
          "Large systems with uncertain parts",
          "Cycles are too long to give feedback"
        ],
        [
          "Scrum",
          "Between sprints of 1–4 weeks",
          "Product work with frequent feedback",
          "Work cannot be sliced or estimated, such as research"
        ]
      ] },
    { t: "p",
      text: "Scrum concretely: a product owner orders a backlog of user stories ('as a support agent, I want suggested replies, so that I answer faster'), the team plans a sprint, meets daily for fifteen minutes, reviews the result with stakeholders and holds a retrospective on how it worked. Stories are estimated in relative points; velocity is the points completed per sprint, a planning input for that team, not a productivity score." },
    { t: "h2", n: "02", id: "measure", text: "What the choice costs", sub: "Two measurements" },
    { t: "code",
      lang: "python",
      title: "process.py — sprint fit for research, and waste under changing requirements",
      code: `import numpy as np
rng = np.random.default_rng(30)

print("== 1. does the task fit in a two-week sprint (10 working days)? ==")
for name, median, sigma in (("engineering task, estimated 6 days", 6, 0.3), ("research task, estimated 6 days", 6, 0.9)):
    d = rng.lognormal(np.log(median), sigma, 100_000)
    print(f"  {name:<36} fits {np.mean(d <= 10):5.0%}; 90th percentile {np.percentile(d, 90):5.1f} days")

print("\\n== 2. requirements change while you build: a fixed plan against short iterations ==")
# 24 weeks of work on 12 features. Each week, every not-yet-built feature has a 4% chance its requirement changes;
# a feature built to an old requirement must be rebuilt (or is waste).
def project(iteration_weeks, weeks=24, features=12, p_change=0.04, trials=4_000):
    wasted = []
    for _ in range(trials):
        spec_version = np.zeros(features); built_to = -np.ones(features)
        per_iter = features * iteration_weeks / weeks
        for start in range(0, weeks, iteration_weeks):
            for _ in range(iteration_weeks):
                spec_version += rng.random(features) < p_change
            # features finished this iteration were specified at the iteration's start (in a fixed plan, at week 0)
            done = slice(int(start / iteration_weeks * per_iter), int((start / iteration_weeks + 1) * per_iter))
            built_to[done] = spec_version[done] if iteration_weeks < weeks else 0
        wasted.append(np.mean(built_to != spec_version))
    return np.mean(wasted)
for name, it in (("fixed plan, built to the week-0 spec", 24), ("4-week iterations", 4), ("2-week iterations", 2)):
    print(f"  {name:<36} features out of date at the end: {project(it):5.0%}")`,
      out: `== 1. does the task fit in a two-week sprint (10 working days)? ==
  engineering task, estimated 6 days   fits   96%; 90th percentile   8.8 days
  research task, estimated 6 days      fits   72%; 90th percentile  19.1 days

== 2. requirements change while you build: a fixed plan against short iterations ==
  fixed plan, built to the week-0 spec features out of date at the end:   62%
  4-week iterations                    features out of date at the end:   31%
  2-week iterations                    features out of date at the end:   34%` },
    { t: "viz",
      title: "Features built to an out-of-date requirement by the end of 24 weeks",
      caption: "Each week, each requirement had a 4% chance of changing. Building in iterations halved the waste; shorter iterations than four weeks changed little.",
      svg: `<svg viewBox="0 0 760 134" width="100%" role="img">
<text x="190" y="31.0" text-anchor="end" class="s-label">fixed plan (week-0 spec)</text>
<rect x="200" y="14" width="367.2" height="26" rx="4" class="s-fill" style="stroke:var(--crit);stroke-width:1.8"/>
<text x="575.2" y="31.0" class="s-sub">62% out of date</text>
<text x="190" y="69.0" text-anchor="end" class="s-label">4-week iterations</text>
<rect x="200" y="52" width="183.6" height="26" rx="4" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="391.6" y="69.0" class="s-sub">31%</text>
<text x="190" y="107.0" text-anchor="end" class="s-label">2-week iterations</text>
<rect x="200" y="90" width="201.4" height="26" rx="4" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="409.4" y="107.0" class="s-sub">34%</text>
</svg>` },
    { t: "dl",
      items: [
        { term: "Fixed plans waste work when requirements move",
          def: "Built to the week-0 specification, 62% of features were out of date at the end. With 4-week iterations, 31%; with 2-week, 34%. Most of the gain came from iterating at all; what remained were changes after a feature was delivered, which no process prevents." },
        { term: "Research does not fit a sprint",
          def: "Two tasks both estimated at 6 days: the engineering one finished within a 10-day sprint 96% of the time, the research one 72%, with a 90th percentile of 19 days. Forcing research into sprint commitments produces carried-over stories and pressure to stop exploring too early." },
        { term: "What works for ML",
          def: "Time-boxed spikes with a question and a decision at the end ('can we reach AUC 0.8 with these features in two weeks?'), engineering work in normal sprints, and the two kept separate on the board." }
      ] },
    { t: "callout",
      kind: "trap",
      title: "Velocity as a performance measure",
      body: [
        { t: "p",
          text: "Velocity measures how many of this team's own points it completes per sprint. Comparing it across teams, or setting targets for it, leads to inflated estimates and no more output. Use it only to forecast the same team's work, and as a range." }
      ] },
    { t: "exercise",
      kind: "Challenge",
      title: "Forecast with velocity, honestly",
      difficulty: "core",
      minutes: 20,
      body: [
        { t: "p",
          text: "A team's last ten sprint velocities were 21, 34, 18, 29, 25, 13, 31, 27, 22 and 26 points, and 180 points remain. Compare the naive forecast (backlog divided by average velocity) with a Monte Carlo forecast that resamples past sprints, reporting the 50th, 85th and 95th percentiles, with fixed scope and with scope growing by 3% of the backlog each sprint." }
      ],
      requirements: [
        "The naive forecast for comparison",
        "Resampling of real past sprints, not a fitted distribution",
        "Percentiles of sprints needed",
        "A scenario with scope growth"
      ],
      hint: "Each simulated sprint draws one velocity from the history with replacement; count sprints until the remaining points reach zero.",
      solution: { lang: "python",
        title: "velocity_forecast.py",
        code: `import numpy as np
rng = np.random.default_rng(31)

velocity_history = [21, 34, 18, 29, 25, 13, 31, 27, 22, 26]        # story points completed in each of the last 10 sprints
backlog = 180                                                       # points left
print(f"average velocity {np.mean(velocity_history):.1f}; naive plan: {backlog / np.mean(velocity_history):.1f} sprints")

def sprints_needed(trials=20_000, scope_growth=0.0):
    out = np.empty(trials, int)
    for t in range(trials):
        left, n = backlog, 0
        while left > 0:
            n += 1; left += backlog * scope_growth; left -= rng.choice(velocity_history)   # resample a past sprint
        out[t] = n
    return out
for growth, label in ((0.0, "fixed scope"), (0.03, "scope grows 3% of the backlog each sprint")):
    s = sprints_needed(scope_growth=growth)
    print(f"{label:<44} 50%: {np.percentile(s, 50):.0f} sprints, 85%: {np.percentile(s, 85):.0f}, 95%: {np.percentile(s, 95):.0f}")`,
        out: `average velocity 24.6; naive plan: 7.3 sprints
fixed scope                                  50%: 8 sprints, 85%: 9, 95%: 9
scope grows 3% of the backlog each sprint    50%: 10 sprints, 85%: 11, 95%: 12`,
        notes: [
          { t: "p",
            text: "The average gave 7.3 sprints, which is the date a plan usually promises. The simulation gave a median of 8 and an 85% confidence of 9: the naive figure is closer to the optimistic end, because a remainder after the last full sprint still costs a whole sprint and slow sprints happen." },
          { t: "p",
            text: "With scope growing 3% of the backlog per sprint, which is modest, the 85% forecast moved to 11 sprints. Quote forecasts as a range with a confidence level, and re-run them every sprint as the history and the backlog change." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: the research story carried over six sprints",
      body: [
        { t: "p",
          text: "**Symptom.** A story 'improve churn model AUC to 0.82' was committed in six consecutive sprints and never closed, while stakeholders lost confidence in the team's estimates." },
        { t: "p",
          text: "**Mechanism.** The story was research: nobody knew whether 0.82 was reachable with the available data, so it had no reliable estimate and no point at which it was done. Each sprint the team made progress, learned something and carried it over." },
        { t: "p",
          text: "**Fix.** Research moved to time-boxed spikes, each with a question and a decision at the end, such as 'two weeks to test three feature families; ship, continue or stop'. Engineering stories followed once an approach was chosen, and forecasting improved." }
      ] }
  ],

  takeaways: [
    "Process models differ in **when the plan can change**: waterfall rarely, iterative each cycle, Scrum between sprints.",
    "Measured: a fixed plan left **62%** of features out of date under changing requirements; iterations cut it to **31–34%**.",
    "Iterating at all mattered more than the exact iteration length.",
    "A research task estimated at 6 days fitted a 10-day sprint only **72%** of the time (90th percentile **19 days**).",
    "Use **time-boxed spikes** with a decision for research, sprints for engineering.",
    "Velocity is a planning input for one team, not a performance score.",
    "Forecast from velocity with **Monte Carlo**: 7.3 sprints naive, **9** at 85% confidence, **11** with modest scope growth."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "Where does waterfall fit best?",
        options: [
          "Product discovery with weekly user feedback",
          "Fixed, well-understood requirements",
          "Research on whether a model is feasible",
          "Teams that need to change direction weekly"
        ],
        answer: 1,
        why: "Waterfall assumes requirements will not move, which holds for stable, well-understood or contractually fixed work. The other three need frequent changes of plan." },
      { stem: "Two tasks are estimated at 6 days. Why is the research one riskier in a 10-day sprint?",
        options: [
          "Research tasks are always underestimated by half",
          "Its duration has a far longer tail",
          "Research cannot be broken into user stories at all",
          "Sprints forbid any work without a user story"
        ],
        answer: 1,
        why: "With the same median, its spread gave 72% on-time against 96%, and a 90th percentile of 19 days. It is not always underestimated by a fixed amount, and research can be time-boxed." },
      { stem: "What does a team's velocity measure?",
        options: [
          "Productivity relative to other teams",
          "Points it completes per sprint",
          "Hours worked by each developer",
          "Business value delivered each sprint"
        ],
        answer: 1,
        why: "Points are relative to that team's own estimates, so cross-team comparison and productivity targets are meaningless. It is not hours or value." },
      { stem: "Why did the Monte Carlo forecast exceed backlog divided by average velocity?",
        options: [
          "The simulation assumed the team would get slower",
          "Slow sprints occur; a partial one counts",
          "The average velocity was computed incorrectly",
          "Monte Carlo methods always add a safety margin on top"
        ],
        answer: 1,
        why: "Resampling real sprints includes slow ones, and finishing mid-sprint still takes the sprint. No slowdown was assumed, the average was correct, and Monte Carlo adds no margin by itself." }
    ] },

  interview: { title: "In an interview",
    sub: "Process answers are stronger when they admit where a method fails.",
    questions: [
      { level: "core",
        q: "Waterfall or agile for an ML project?",
        strong: "A strong answer splits research from engineering and matches the process to each.",
        answer: [
          { t: "p",
            text: "Neither wholesale. Exploration (is the problem learnable, which data and features) is research with uncertain duration, so time-boxed spikes with a decision at the end. Building the pipeline, serving and monitoring is engineering that fits sprints. Regulated parts, such as model validation documentation, may need the traceability of a V-model style verification. Iteration matters most: in the simulation, iterating at all halved work built to stale requirements." }
        ] },
      { level: "core",
        q: "How do you estimate a delivery date for a team?",
        strong: "A strong answer forecasts from history as a range and updates it.",
        answer: [
          { t: "p",
            text: "From the team's own throughput history, by Monte Carlo over past sprints or past cycle times, reported as percentiles (for example 50% and 85%), with scope growth included if it has historically happened. Re-run every sprint. A single date from backlog over average velocity is the optimistic end of the range." }
        ] },
      { level: "advanced",
        q: "How would you run Scrum for a team that does both research and production ML?",
        strong: "A strong answer separates work types on the board and in commitments.",
        answer: [
          { t: "p",
            text: "Keep research as time-boxed spikes with an explicit question, a fixed budget and a decision at the end; do not estimate them in points or count them in velocity. Engineering stories follow decided approaches and use normal sprint commitments. Reviews show spike outcomes, including negative ones, as results. That keeps forecasts meaningful and stops research being judged by delivery metrics." }
        ] }
    ] }
});
