EC.receiveLesson({
  id: "3.14",

  lede: "The Chatbot Arena asks people to pick the better of two anonymous responses and fits a Bradley\u2013Terry model to the votes. It is the most informative public evaluation there is, and the thing it is worst at is the thing everyone uses it for: ordering models that are close together. I simulated it with known ground truth and the arithmetic is unforgiving. A **10-Elo gap is a 51.44% win rate**, which needs about **4,600 head-to-head votes** to distinguish from a coin flip. My fit ordered a true 10-Elo pair **wrongly at 200, 1,000 and 20,000 votes** and correctly at 5,000 and 100,000 \u2014 non-monotonically, which is what luck looks like. And a genuine rock-paper-scissors cycle came back as **1202, 1200, 1199**: Bradley\u2013Terry cannot represent non-transitivity, so it reports a cycle as a tie.",

  objectives: [
    "Explain what the Bradley\u2013Terry model estimates and why its scale has an arbitrary origin",
    "Convert an Elo gap into a win probability and into the votes needed to detect it",
    "Judge whether two leaderboard neighbours are actually distinguishable",
    "Say what non-transitive preferences do to a single-number rating",
    "Combine Arena with static benchmarks and explain what each one cannot see"
  ],

  prerequisites: ["3.11"],

  blocks: [

    { t: "h2", n: "01", id: "what", text: "What the Arena measures",
      sub: "Pairwise preference, fitted to a single strength per model" },

    { t: "p", text: "A user sends a prompt, receives two responses from anonymous models, and votes for one. That vote is a comparison, not a score \u2014 nobody ever rates a model in isolation. The Bradley\u2013Terry model turns a pile of such comparisons into one strength parameter per model, by assuming the probability that A beats B depends only on the difference of their strengths." },

    { t: "math", tex: "P(A \\text{ beats } B) \\;=\\; \\frac{1}{1 + 10^{(R_B - R_A)/400}}" },

    { t: "p", text: "That is the same functional form as chess Elo, which is why the numbers are reported on the familiar 400-point scale. The difference is in the fitting: Elo updates incrementally after each game, while the Arena fits all votes at once by maximum likelihood, which is more statistically efficient and gives honest confidence intervals." },

    { t: "code", lang: "python", title: "g314.py \u2014 fitting Bradley\u2013Terry by gradient ascent", code: `def fit_bt(votes, iters=4000, lr=2.0):
    """Maximum-likelihood Bradley-Terry, in logit units."""
    th = np.zeros(len(NAMES))
    A = np.array([idx[a] for a, b, y in votes])
    B = np.array([idx[b] for a, b, y in votes])
    Y = np.array([y for a, b, y in votes], dtype=float)
    for _ in range(iters):
        d = th[A] - th[B]
        p = 1.0 / (1.0 + np.exp(-d))
        g = np.zeros(len(NAMES))
        np.add.at(g, A, Y - p)                 # gradient of the log-likelihood
        np.add.at(g, B, -(Y - p))
        th += lr * g / len(votes)
    th -= th.mean()                            # identifiable only up to a constant
    return {n: th[idx[n]] for n in NAMES}`,
      out: `  fitted logit strengths (mean-centred), and the same mapped to Elo:
  model               theta     Elo@1200     Elo@1500         true
  model-A            0.7612       1332.2       1632.2       1300.0
  model-B            0.4935       1285.7       1585.7       1250.0
  model-C            0.4123       1271.6       1571.6       1240.0
  model-D           -0.4266       1125.9       1425.9       1100.0
  model-E           -1.2403        984.5       1284.5        950.0

  recovery error against the centred truth: mean 2.6 Elo, max 6.1 Elo`,
      hl: [12],
      caption: "With 20,000 votes over five models the fit recovers the true strengths to within 6 Elo \u2014 and the absolute level is whatever you anchor it to." },

    { t: "callout", kind: "insight", title: "The score has no meaning on its own",
      body: [
        { t: "p", text: "The two Elo columns are the same fit, anchored at 1200 and at 1500. Both are equally correct, because the likelihood depends only on *differences* of strengths \u2014 adding a constant to every model changes nothing it can observe. The mean-centring step in the code is a convention, not a result." },
        { t: "p", text: "So \u201cmodel X scored 1271\u201d is not a statement about model X. \u201cModel X is 60 Elo behind model A on this vote population\u201d is. This matters practically when leaderboards re-anchor or add models: an absolute number can move without any model changing." },
        { t: "p", text: "It also means you cannot compare Elo across leaderboards, or across time if the anchor or the voter population has shifted. The gap between two models measured in the same fit is the only durable quantity." }
      ] },

    { t: "h2", n: "02", id: "gaps", text: "What a small gap is worth",
      sub: "A 10-Elo difference is a 51.44% win rate" },

    { t: "p", text: "Leaderboards are read as rankings, so the interesting question is what a gap of a few points means. Invert the Bradley\u2013Terry formula and the answer is sobering." },

    { t: "code", lang: "python", title: "g314.py \u2014 Elo gap to win probability to votes required", code: `for gap in (5, 10, 25, 50, 100, 200, 400):
    p = 1.0 / (1.0 + 10 ** (-gap / 400))
    # votes for the 95% CI on p to exclude 0.5
    need = (1.96 ** 2) * p * (1 - p) / ((p - 0.5) ** 2)
    print(gap, p, need)`,
      out: `  Elo gap           win probability votes to see it at 95%
  5                          0.5072                  18548
  10                         0.5144                   4636
  25                         0.5359                    741
  50                         0.5715                    184
  100                        0.6401                     45
  200                        0.7597                     10
  400                        0.9091                      2`,
      hl: [2],
      caption: "The votes column is for one pair. A 10-Elo gap needs about 4,600 head-to-head comparisons before it is distinguishable from no difference at all." },

    { t: "callout", kind: "trap", title: "Leaderboard neighbours are usually tied, not ranked",
      body: [
        { t: "p", text: "A 10-point gap means one model wins 51.44% of comparisons. That is a real preference and it is nearly invisible: **about 4,600 head-to-head votes** to establish at 95% confidence, and **18,500** for a 5-point gap. With a hundred models in the pool, no individual pair receives that many votes until the leaderboard is very mature." },
        { t: "p", text: "Which is why the Arena publishes confidence intervals and why the ordering within an interval carries no information. Two models three points apart are tied, and reading them as first and second is reading noise." },
        { t: "p", text: "The flip side is the reassuring half: a 100-point gap is a 64% win rate and needs only about **45 votes**. Large differences are easy to establish. The leaderboard is reliable about what it says loudly and unreliable about what it says quietly, which is the opposite of how it tends to be quoted." }
      ] },

    { t: "code", lang: "python", title: "g314.py \u2014 bootstrap interval width against vote count", code: `for n_votes in (200, 1000, 5000, 20000, 100000):
    base = simulate(n_votes)
    widths = {n: [] for n in NAMES}
    for _ in range(20):                                  # bootstrap resamples
        boot = [base[random.randrange(len(base))] for _ in range(len(base))]
        e = to_elo(fit_bt(boot, iters=1500))
        for n in NAMES:
            widths[n].append(e[n])
    print(n_votes, [np.percentile(widths[n], 97.5) - np.percentile(widths[n], 2.5)
                    for n in NAMES])`,
      out: `  bootstrap 95%% interval width for each model's Elo, by vote count
  votes           model-A      model-B      model-C      model-D      model-E
  200                  78          120           96           95          140
  1000                 48           46           44           46           50
  5000                 24           21           22           15           29
  20000                12           12           11           10           11
  100000                4            6            4            6            6`,
      caption: "The interval narrows roughly as the square root of the votes. The true B\u2013C gap is 10 Elo, so only the last row has intervals tight enough to resolve it." },

    { t: "h2", n: "03", id: "ordering", text: "My fit got the close pair wrong three times out of five",
      sub: "Including at 20,000 votes, after getting it right at 5,000" },

    { t: "p", text: "Models B and C have true strengths 1250 and 1240 \u2014 a 10-Elo gap. I asked the fit to order them at five different vote counts." },

    { t: "code", lang: "python", title: "g314.py \u2014 can the fit tell B from C?", code: `for n_votes in (200, 1000, 5000, 20000, 100000):
    e = to_elo(fit_bt(simulate(n_votes)))
    gap = e["model-B"] - e["model-C"]
    print(n_votes, gap, TRUE["model-B"] - TRUE["model-C"], gap > 0)`,
      out: `  votes      B - C (fitted)       true gap   ordered right?
  200                -108.5           10.0               NO
  1000                 -5.5           10.0               NO
  5000                 19.1           10.0              yes
  20000                -0.2           10.0               NO
  100000                4.5           10.0              yes`,
      hl: [4],
      caption: "Wrong, wrong, right, wrong, right. The 5,000-vote run got the ordering right and the magnitude wrong by 2\u00d7; the 20,000-vote run got the ordering wrong." },

    { t: "callout", kind: "warn", title: "A correct ordering at one sample size is not evidence",
      body: [
        { t: "p", text: "The sequence is **not monotonic**: right at 5,000 votes, wrong at 20,000, right at 100,000. That is exactly what you expect when the signal is smaller than the noise \u2014 the ordering is a coin flip weighted slightly towards the truth, so it will agree with reality sometimes and disagree sometimes, and neither outcome tells you anything." },
        { t: "p", text: "At 200 votes the fit put C **108.5 Elo ahead** of B when B is truly 10 ahead \u2014 an error ten times the size of the effect, and confidently signed. A leaderboard screenshot from that moment would look authoritative." },
        { t: "p", text: "The practical reading: treat the interval, not the order. If two models' intervals overlap, the leaderboard is telling you it cannot separate them, and running the comparison again on more votes is the only thing that changes that \u2014 not re-reading the same table more carefully." },
        { t: "p", text: "And note that even the 100,000-vote fit put the gap at 4.5 Elo against a true 10. It got the order right and the size less than half. Ordering and magnitude converge at different rates, and magnitude is the one people quote." }
      ] },

    { t: "viz", title: "Why a close pair cannot be ordered", caption: "The intervals at 5,000 votes are twice the width of the gap they are meant to resolve. At 100,000 they finally fit inside it.",
      svg: `<svg viewBox="0 0 760 268" width="100%" role="img" aria-label="Confidence intervals against the true gap">
  <text x="16" y="22" class="s-label">TRUE gap between model-B and model-C: 10 Elo</text>
  <line x1="300" y1="30" x2="300" y2="214" stroke="var(--good)" stroke-width="1.6"/>
  <line x1="330" y1="30" x2="330" y2="214" stroke="var(--good)" stroke-width="1.6"/>
  <text x="336" y="42" class="s-mono" style="fill:var(--good)">10 Elo</text>

  <text x="16" y="72" class="s-sub">200 votes</text>
  <rect x="120" y="60" width="390" height="14" rx="3" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.4"/>
  <text x="520" y="72" class="s-mono" style="fill:var(--crit)">\u00b1 interval ~120 Elo wide</text>

  <text x="16" y="104" class="s-sub">1,000 votes</text>
  <rect x="240" y="92" width="150" height="14" rx="3" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.4"/>
  <text x="520" y="104" class="s-mono" style="fill:var(--crit)">~46 Elo</text>

  <text x="16" y="136" class="s-sub">5,000 votes</text>
  <rect x="280" y="124" width="70" height="14" rx="3" class="s-fill-bg" style="stroke:var(--warn)" stroke-width="1.4"/>
  <text x="520" y="136" class="s-mono" style="fill:var(--warn)">~21 Elo \u2014 still 2\u00d7 the gap</text>

  <text x="16" y="168" class="s-sub">20,000 votes</text>
  <rect x="296" y="156" width="38" height="14" rx="3" class="s-fill-bg" style="stroke:var(--warn)" stroke-width="1.4"/>
  <text x="520" y="168" class="s-mono" style="fill:var(--warn)">~12 Elo \u2014 borderline</text>

  <text x="16" y="200" class="s-sub">100,000 votes</text>
  <rect x="306" y="188" width="18" height="14" rx="3" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="520" y="200" class="s-mono" style="fill:var(--good)">~5 Elo \u2014 resolvable</text>

  <line x1="16" y1="228" x2="744" y2="228" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="250" class="s-mono" style="fill:var(--crit)">measured orderings: wrong at 200, wrong at 1k, right at 5k, WRONG at 20k, right at 100k</text>
  <text x="16" y="264" class="s-sub">non-monotonic, which is the signature of noise rather than of insufficient data alone</text>
</svg>` },

    { t: "h2", n: "04", id: "cycles", text: "What a single number cannot express",
      sub: "Preferences can cycle; a rating cannot" },

    { t: "p", text: "Bradley\u2013Terry assumes a single strength per model, which forces transitivity: if A is stronger than B and B than C, the model cannot represent C beating A. Real preferences need not cooperate \u2014 one model may be better at code, another at prose, a third at brevity, and a voter population that mixes those tasks can produce a genuine cycle." },

    { t: "code", lang: "python", title: "g314.py \u2014 fit a rock-paper-scissors preference", code: `# A beats B 60%, B beats C 60%, C beats A 60%
cyc = []
for _ in range(30000):
    pair = random.choice([("model-A", "model-B"), ("model-B", "model-C"),
                          ("model-C", "model-A")])
    cyc.append((pair[0], pair[1], 1 if random.random() < 0.60 else 0))
print(to_elo(fit_bt(cyc)))`,
      out: `  suppose A beats B 60%, B beats C 60%, and C beats A 60% (rock-paper-scissors)
  fitted Elo: model-A 1202, model-B 1200, model-C 1199`,
      hl: [1],
      caption: "Three models, each beating the next 60% of the time, 30,000 votes \u2014 and the fit reports them as tied within 3 Elo." },

    { t: "callout", kind: "insight", title: "A cycle is reported as a tie, with no warning",
      body: [
        { t: "p", text: "This is the most important structural limitation of the method and the least discussed. A real, strong, consistent cyclic preference \u2014 60% each way, which is a 70-Elo-equivalent edge \u2014 comes out as **1202, 1200, 1199**. The fit does not fail, does not warn, and does not look unusual. It looks like three equivalent models." },
        { t: "p", text: "Which means a tie on the leaderboard has two possible explanations that look identical: the models really are equivalent, or they are differently good in ways the aggregate cannot see. Those have opposite implications for whether you should care about the choice." },
        { t: "p", text: "The diagnostic is to look at the pairwise win-rate matrix rather than the ratings, which the Arena does publish. A cycle is obvious there and invisible in the fitted scores. If you are choosing between two tied models, the win rate *between those two* is the number to read, and category breakdowns are how you find out why." }
      ] },

    { t: "h2", n: "05", id: "combining", text: "What to use alongside it",
      sub: "Each benchmark is blind to something specific" },

    { t: "table",
      head: ["Benchmark", "Measures", "Blind to"],
      rows: [
        ["**Chatbot Arena**", "Open-ended human preference at scale", "Correctness \u2014 voters reward fluency and format, and cannot check facts they do not know"],
        ["**Arena Hard**", "An automated proxy on hard Arena prompts", "Whatever the judge model is bad at, plus its stylistic preferences"],
        ["**MMLU**", "Breadth of knowledge, multiple choice", "Generation quality entirely; a model can score well and write badly"],
        ["**HumanEval / MBPP**", "Code that passes tests", "Everything outside code, and code style or security"],
        ["**MT-Bench**", "Multi-turn quality, judged by a model", "Judge bias, especially towards verbosity and its own family"],
        ["**GPQA**", "Hard graduate-level reasoning", "Almost everything a product does"],
        ["**Your own eval set**", "Your task, your data, your definition of good", "Nothing that matters to you \u2014 which is why it outranks all of the above"]
      ] },

    { t: "callout", kind: "tradeoff", title: "Human preference is not human judgement of correctness",
      body: [
        { t: "p", text: "An Arena voter sees two responses, often to a question they do not know the answer to, and picks the one that reads better. That selects for fluency, confident tone, structure and length as much as for accuracy \u2014 and a confidently wrong answer frequently reads better than a hedged correct one." },
        { t: "p", text: "So Arena position is a good measure of whether people *like* a model's output and a weak measure of whether that output is right. It pairs naturally with a benchmark that checks correctness mechanically, which is why the reference's advice to combine MMLU, HumanEval and Arena is sound \u2014 each covers a different blind spot." },
        { t: "p", text: "The reference's own framing of this is the part worth keeping: a model topping MMLU and ranking poorly on Arena is good at test-taking and poor at instruction-following; the reverse is fluent and factually unreliable. Neither diagnosis is available from one number." }
      ] },

    { t: "exercise", kind: "analysis", title: "Decide whether you can order two models", difficulty: "core", minutes: 25,
      body: "Simulate an Arena with known model strengths, fit Bradley\u2013Terry at several vote counts, and determine the vote count at which a 10-Elo pair becomes reliably orderable. Report bootstrap interval widths alongside the fitted gap, convert the gap to a win probability and a required vote count analytically, and check whether the two agree. Then fit a deliberately cyclic preference and report what the model does with it.",
      requirements: [
        "Simulate votes from known Elo strengths using the Bradley\u2013Terry win probability",
        "Fit by maximum likelihood and mean-centre the result, then map to Elo with an explicit anchor",
        "Bootstrap at least 20 resamples per vote count to get 95% interval widths",
        "Report the fitted B\u2212C gap against the true gap at each vote count, and whether the ordering is right",
        "Separately fit a 60% three-way cycle and report the resulting ratings"
      ],
      hint: "Report both anchors for the same fit, at least once. Seeing two different sets of \u201cElo scores\u201d from one likelihood is the fastest way to internalise what the number is.",
      solution: { lang: "python", title: "g314.py \u2014 simulate, fit, bootstrap, and break it", code: `SCALE = 400 / math.log(10)
TRUE = {"model-A": 1300, "model-B": 1250, "model-C": 1240,
        "model-D": 1100, "model-E": 950}

def p_win(a, b, ratings):
    return 1.0 / (1.0 + 10 ** ((ratings[b] - ratings[a]) / 400))

def simulate(n_votes, ratings=TRUE):
    votes = []
    for _ in range(n_votes):
        a, b = random.sample(NAMES, 2)
        votes.append((a, b, 1 if random.random() < p_win(a, b, ratings) else 0))
    return votes

def to_elo(theta, anchor=1200.0):
    mean = sum(theta.values()) / len(theta)
    return {n: anchor + (t - mean) * SCALE for n, t in theta.items()}

# 1. recovery, and the arbitrary anchor
th = fit_bt(simulate(20000))
print(to_elo(th, 1200.0), to_elo(th, 1500.0))

# 2. can it order the 10-Elo pair?
for n_votes in (200, 1000, 5000, 20000, 100000):
    e = to_elo(fit_bt(simulate(n_votes)))
    print(n_votes, e["model-B"] - e["model-C"], (e["model-B"] - e["model-C"]) > 0)

# 3. the analytic requirement, for comparison
for gap in (5, 10, 25, 50, 100):
    p = 1.0 / (1.0 + 10 ** (-gap / 400))
    print(gap, p, (1.96 ** 2) * p * (1 - p) / ((p - 0.5) ** 2))

# 4. a cycle it cannot represent
cyc = [(a, b, 1 if random.random() < 0.60 else 0)
       for a, b in (random.choice([("model-A", "model-B"), ("model-B", "model-C"),
                                   ("model-C", "model-A")]) for _ in range(30000))]
print(to_elo(fit_bt(cyc)))`,
        out: `  fitted logit strengths (mean-centred), and the same mapped to Elo:
  model               theta     Elo@1200     Elo@1500         true
  model-A            0.7612       1332.2       1632.2       1300.0
  model-B            0.4935       1285.7       1585.7       1250.0
  model-C            0.4123       1271.6       1571.6       1240.0
  model-D           -0.4266       1125.9       1425.9       1100.0
  model-E           -1.2403        984.5       1284.5        950.0

  recovery error against the centred truth: mean 2.6 Elo, max 6.1 Elo

  bootstrap 95%% interval width for each model's Elo, by vote count
  votes           model-A      model-B      model-C      model-D      model-E
  200                  78          120           96           95          140
  1000                 48           46           44           46           50
  5000                 24           21           22           15           29
  20000                12           12           11           10           11
  100000                4            6            4            6            6

  votes      B - C (fitted)       true gap   ordered right?
  200                -108.5           10.0               NO
  1000                 -5.5           10.0               NO
  5000                 19.1           10.0              yes
  20000                -0.2           10.0               NO
  100000                4.5           10.0              yes

  Elo gap           win probability votes to see it at 95%
  5                          0.5072                  18548
  10                         0.5144                   4636
  25                         0.5359                    741
  50                         0.5715                    184
  100                        0.6401                     45

  fitted Elo: model-A 1202, model-B 1200, model-C 1199`,
        notes: [
          { t: "p", text: "**The analytic and empirical answers agree.** The formula says a 10-Elo gap needs about 4,600 head-to-head votes; the bootstrap says the interval is still 21 Elo wide at 5,000 total votes. Those are consistent once you account for the difference: with five models, a given pair receives only about a tenth of the total votes, so 5,000 total is roughly 500 for the pair \u2014 an order of magnitude short of 4,600." },
          { t: "p", text: "**That factor is the one people miss on real leaderboards.** With a hundred models the dilution is far worse, so a leaderboard's total vote count tells you almost nothing about whether any specific pair is resolved. The per-pair count is the number that matters, and it is the one not usually displayed." },
          { t: "p", text: "**The ordering sequence is non-monotonic** \u2014 wrong, wrong, right, wrong, right. At 200 votes the fit put C 108.5 Elo *ahead* of B, an error ten times the true effect and confidently signed. A correct ordering at one vote count is not evidence of anything, which is why the interval and not the rank is the thing to read." },
          { t: "p", text: "**Magnitude converges more slowly than order.** Even at 100,000 votes the fitted gap is 4.5 Elo against a true 10 \u2014 right sign, less than half the size. So quoting \u201cmodel B is 5 points ahead\u201d from a mature leaderboard is quoting a number with large relative error even when the ranking is sound." },
          { t: "p", text: "**And the cycle comes out as a tie: 1202, 1200, 1199.** Three models each beating the next 60% of the time over 30,000 votes, reported as equivalent, with no diagnostic. The only way to see it is the pairwise win-rate matrix, which makes that table \u2014 not the ratings \u2014 the thing to read when choosing between models the leaderboard says are tied." },
          { t: "p", text: "One honest limitation: five models voting uniformly at random is a far kinder design than the real Arena, which has heavily unequal match-ups and a drifting model pool. The effects here are therefore lower bounds on the real uncertainty rather than estimates of it." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "A leaderboard is a measuring instrument with a resolution. Ask what the resolution is before reading a difference off it: around 100 Elo it is sharp, around 10 Elo it is reading noise, and it cannot see a cycle at all." },
        { t: "p", text: "And remember what it is pointed at \u2014 what people prefer, which overlaps with what is correct without being it." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cA stakeholder wants us to switch models because the new one is 8 Elo higher on the Arena leaderboard. What do you say?\u201d**" },
        { t: "p", text: "That 8 Elo is not a difference the leaderboard can see. It corresponds to a 51.2% win rate, and distinguishing that from a coin flip takes roughly 7,000 head-to-head votes \u2014 so unless those two models have been matched against each other that many times specifically, the ordering is noise. In my own simulation a true 10-Elo pair was ordered *wrongly* at 20,000 total votes after being ordered correctly at 5,000." },
        { t: "p", text: "I would ask for the confidence intervals rather than the ranks, because the Arena publishes them. If the intervals overlap, the leaderboard is explicitly saying it cannot separate the models, and no amount of re-reading the table changes that." },
        { t: "p", text: "Then I would reframe the question. Even if the 8 points were real, Arena position measures what voters prefer on their prompts, not what works on ours. The decision should rest on our own evaluation set \u2014 and a switch has costs the leaderboard knows nothing about: prompts tuned to the old model, different refusal behaviour, a different price, and a migration." },
        { t: "p", text: "What would change my mind is a large gap. A 100-Elo difference is a 64% win rate and needs only about 45 votes to establish \u2014 that is a real signal and worth acting on. The leaderboard is trustworthy about what it says loudly." },
        { t: "p", text: "The thing I would add, because it affects how we read ties generally: Bradley\u2013Terry cannot represent a cycle. I fitted three models each beating the next 60% of the time and got 1202, 1200, 1199 \u2014 reported as tied, with no warning. So when two models look equivalent, that can mean genuinely equivalent or differently good in ways the aggregate hides, and the pairwise win rate and category breakdown are where the difference shows up. For a model switch, that breakdown on our own categories is the evidence I would want." }
      ] }
  ],

  takeaways: [
    "**The Arena fits one strength per model to pairwise votes**, using the Elo functional form but a maximum-likelihood fit over all votes rather than incremental updates.",
    "**The scale has an arbitrary origin.** The same fit anchored at 1200 and 1500 is equally correct, so only differences within one fit mean anything \u2014 never across leaderboards or across re-anchorings.",
    "**A 10-Elo gap is a 51.44% win rate** and needs about 4,600 head-to-head votes to distinguish from no difference; a 5-Elo gap needs 18,500.",
    "**A 100-Elo gap needs about 45 votes.** The leaderboard is reliable about large differences and unreliable about small ones, which is the reverse of how it is usually quoted.",
    "**Total votes overstate the evidence for any pair.** With five models a pair gets a tenth of the votes; with a hundred models, far less \u2014 so the per-pair count is the number that matters and it is rarely shown.",
    "**My fit ordered a true 10-Elo pair wrongly at 200, 1,000 and 20,000 votes** and correctly at 5,000 and 100,000. Non-monotonic, which is the signature of reading noise.",
    "**At 200 votes the fit put the weaker model 108.5 Elo ahead** \u2014 an error ten times the true effect, confidently signed and perfectly presentable.",
    "**Magnitude converges slower than order**: at 100,000 votes the fitted gap was 4.5 Elo against a true 10.",
    "**Bradley\u2013Terry cannot represent non-transitivity.** A genuine 60% three-way cycle fitted to 1202, 1200, 1199 \u2014 a cycle is reported as a tie, with no warning.",
    "**So read the pairwise win-rate matrix when models look tied**, and pair Arena with a correctness benchmark, because voters reward fluency and cannot check facts they do not know."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "The same Bradley\u2013Terry fit reports model-C at 1271.6 or 1571.6 depending on the anchor. Why?",
        options: [
          "Because the two anchors correspond to different vote subsets",
          "Because the likelihood depends only on differences of strengths, so the absolute level is a convention",
          "Because the Elo conversion is approximate above 1500",
          "Because mean-centring introduces a bias that grows with the anchor"
        ],
        answer: 1,
        why: "Adding a constant to every model's strength leaves every predicted win probability unchanged, so the data cannot identify the absolute level \u2014 only differences. Mean-centring and anchoring are conventions applied after fitting. The practical consequence is that an absolute Elo can move when a leaderboard re-anchors or adds models, without any model changing, and that scores from different fits are not comparable." },

      { stem: "Two models are 8 Elo apart on a leaderboard. What is the right interpretation?",
        options: [
          "A small but real ranking that is safe to act on",
          "A 51.2% win rate, requiring thousands of head-to-head votes to distinguish from a tie",
          "A difference that will grow as more votes arrive",
          "Evidence that the models differ on some categories but not others"
        ],
        answer: 1,
        why: "Inverting the Bradley\u2013Terry formula, 8 Elo is about a 51.2% win rate, which needs roughly 7,000 head-to-head comparisons to separate from 50% at 95% confidence. In simulation a true 10-Elo pair was ordered wrongly at 20,000 total votes after being ordered correctly at 5,000 \u2014 non-monotonically, which is what reading noise looks like. The gap does not systematically grow with more votes; the interval shrinks around whatever the truth is, which may be smaller still." },

      { stem: "Three models each beat the next 60% of the time in a cycle. What does a Bradley\u2013Terry fit report?",
        options: [
          "A warning that the model does not fit the data",
          "Three near-identical ratings \u2014 1202, 1200, 1199 \u2014 with no indication of the cycle",
          "The cycle broken arbitrarily into a strict ordering with large gaps",
          "Wide confidence intervals reflecting the inconsistency"
        ],
        answer: 1,
        why: "A single strength per model forces transitivity, so the fit has no parameter that can express a cycle; the maximum-likelihood solution for symmetric cyclic data is near-equal strengths. Measured over 30,000 votes, 1202 / 1200 / 1199 \u2014 no warning, no unusual intervals, indistinguishable from three genuinely equivalent models. The only way to detect it is the pairwise win-rate matrix, which is why that table matters when a leaderboard reports a tie." },

      { stem: "Why should Arena position be paired with a benchmark like MMLU or HumanEval?",
        options: [
          "Because Arena uses too few prompts to be statistically valid",
          "Because voters reward fluency and format and often cannot verify facts, so preference and correctness diverge",
          "Because Arena excludes code and reasoning prompts",
          "Because Arena ratings are not comparable between models"
        ],
        answer: 1,
        why: "An Arena voter frequently does not know the answer to the question they asked, so the vote selects on readability, confidence, structure and length as much as on accuracy \u2014 and a confidently wrong answer often reads better than a hedged correct one. Mechanically checked benchmarks cover that blind spot, and the two together support the diagnosis the reference describes: strong MMLU with weak Arena is test-taking ability without instruction-following, and the reverse is fluency without reliability. Arena has over a million votes and includes all prompt types." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "A question that rewards knowing what a leaderboard cannot resolve",
    questions: [
      { level: "core",
        q: "How does the Chatbot Arena produce its ratings, and what are their limits?",
        strong: "A strong answer explains pairwise fitting and quantifies the resolution.",
        answer: [
          { t: "p", text: "Users compare two anonymous responses and vote, and a Bradley\u2013Terry model fits one strength per model to all those pairwise outcomes by maximum likelihood. It uses the Elo functional form \u2014 win probability as a logistic in the strength difference on a 400-point scale \u2014 but it is a batch fit rather than Elo's incremental update, which is more efficient and yields proper confidence intervals." },
          { t: "p", text: "The first limit is that the scale has no origin: the likelihood sees only differences, so the absolute number is a convention and cannot be compared across leaderboards or across re-anchorings. The second is resolution. A 10-Elo gap is a 51.44% win rate and needs roughly 4,600 head-to-head votes to establish; a 100-Elo gap is 64% and needs about 45. So the instrument is sharp about large differences and blind to small ones." },
          { t: "p", text: "The subtlety there is dilution: total leaderboard votes are spread across pairs, so with many models a given pair may have a small fraction of them. A headline count of a million votes does not mean any specific pair is resolved, and the per-pair count is usually not displayed." },
          { t: "p", text: "The third limit is structural \u2014 one strength per model forces transitivity. I fitted a 60% three-way cycle and got 1202, 1200, 1199. A cycle is reported as a tie, with no warning, so when two models look equivalent I read the pairwise win-rate matrix and the category breakdown rather than the ratings." }
        ] },

      { level: "advanced",
        q: "A stakeholder wants to switch models for an 8-Elo leaderboard improvement. How do you handle it?",
        strong: "A strong answer quantifies the resolution, asks for intervals, and redirects to the right evidence.",
        answer: [
          { t: "p", text: "I would start with the arithmetic rather than with an opinion. Eight Elo is a 51.2% win rate, and separating that from a coin flip takes something like 7,000 head-to-head votes between those two models specifically. In a simulation with known ground truth, a true 10-Elo pair came out ordered wrongly at 20,000 total votes after being ordered correctly at 5,000 \u2014 so a small gap is not a small amount of evidence, it is usually no evidence." },
          { t: "p", text: "Then I would ask for the confidence intervals, which the Arena publishes. Overlapping intervals are the leaderboard stating that it cannot separate the models, and that is the end of the ranking argument." },
          { t: "p", text: "Then I would reframe. Even a real 8-point edge is on voters' prompts, not ours, and preference measures readability as much as correctness. The decision belongs to our own evaluation set \u2014 and a switch carries costs the leaderboard cannot see: prompts tuned to the current model, different refusal behaviour, a different price, a migration." },
          { t: "p", text: "I would say clearly what would change my mind: a gap around 100 Elo, which needs only about 45 votes to establish and is a 64% preference. The instrument is trustworthy at that scale and I would act on it \u2014 after checking it on our own categories, because a cycle or a category-specific weakness is invisible in the aggregate." }
        ] },

      { level: "core",
        q: "Which evaluations would you combine, and why?",
        strong: "A strong answer pairs each benchmark against a specific blind spot and puts the internal eval first.",
        answer: [
          { t: "p", text: "The internal evaluation set first, because it is the only one measuring the task we are paid for. Everything public is a prior, useful for shortlisting and not for deciding." },
          { t: "p", text: "Then Arena or MT-Bench for open-ended quality, since they capture instruction-following and helpfulness that multiple-choice cannot. Their blind spot is correctness: a voter often cannot check the facts, so fluency and confident tone score well \u2014 which is exactly why they need a partner." },
          { t: "p", text: "Then a mechanically checked benchmark for the relevant capability \u2014 HumanEval or MBPP if we generate code, MMLU for breadth of knowledge, GPQA if the work is genuinely hard reasoning. Those cannot be gamed by writing style, which is the property that makes them complementary rather than redundant." },
          { t: "p", text: "The diagnostic value is in the disagreement, and this is the framing I find most useful: a model strong on MMLU and weak on Arena is good at test-taking and poor at following instructions; strong on Arena and weak on MMLU is fluent and factually unreliable. Neither diagnosis exists if you only look at one number, and both change what you would do next." }
        ] }
    ]
  }
});
