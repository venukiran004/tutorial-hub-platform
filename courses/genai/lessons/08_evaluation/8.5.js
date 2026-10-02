EC.receiveLesson({
  id: "8.5",

  lede: "Elo converts blind pairwise votes into a rating, and the update rule is three lines of arithmetic. The part that decides whether a leaderboard ranking means anything is the sample size, and it is larger than people assume: two models **20 Elo apart** win against each other 52.88% of the time, so separating them with a 95% interval narrower than the gap takes about **1,163 comparisons**. At 100 comparisons the interval is \u00b168 Elo \u2014 wide enough to swallow most of a leaderboard\u2019s top ten.",

  objectives: [
    "Compute the Elo expected score and update for a pair of ratings",
    "Interpret a 400-point gap in terms of win probability",
    "Compute the confidence interval on a win rate and convert it to Elo",
    "Say how many comparisons are needed to resolve a given gap",
    "State what preference measures and what it does not"
  ],

  prerequisites: ["8.1", "7.4"],

  blocks: [

    { t: "h2", n: "01", id: "update", text: "The update rule",
      sub: "Chess arithmetic applied to model outputs" },

    { t: "p", text: "LMSYS Chatbot Arena collects blind pairwise human votes \u2014 \u201cwhich answer is better?\u201d \u2014 and converts them to Elo ratings." },

    { t: "math", tex: "E_A = \\frac{1}{1 + 10^{(R_B - R_A)/400}}, \\qquad R_A \\leftarrow R_A + K\\,(S_A - E_A)" },

    { t: "p", text: "\\(S_A\\) is 1 for a win, 0 for a loss and 0.5 for a tie. The 400 in the exponent is the scale\u2019s defining constant, and K controls how fast ratings move." },

    { t: "callout", kind: "insight", title: "It is logistic regression on rating differences \u2014 the same shape as 7.4",
      body: [
        { t: "p", text: "Compare \\(E_A = \\sigma\\big((R_A - R_B)\\ln 10 / 400\\big)\\) with 7.4\u2019s Bradley-Terry model \\(P(A \\succ B) = \\sigma(r_A - r_B)\\). They are the same model with a different scale factor \u2014 Elo is Bradley-Terry with ratings measured in units of 400/ln 10 \u2248 174 per logit." },
        { t: "p", text: "Which means 7.4\u2019s central result transfers directly: **only differences are identified**. I fitted the same comparisons from an initialisation of 0 and of 100 and got scores 100 apart with every pairwise difference identical to six decimal places. An Elo number alone carries no information; the gap does." },
        { t: "p", text: "That is why the arena anchors the scale by convention rather than by measurement, and why comparing an Elo figure across leaderboards with different anchors is meaningless in exactly the way comparing raw reward-model scores is." }
      ] },

    { t: "code", lang: "python", title: "g85.py \u00a7A \u2014 what a rating gap means, and what a win is worth", code: `def expected(ra, rb):
    return 1.0 / (1.0 + 10 ** ((rb - ra) / 400))`,
      out: `  rating gap             P(A wins)   Elo move on a win (K=32)
  +0                        0.5000              16.00
  +25                       0.5359              14.85
  +50                       0.5715              13.71
  +100                      0.6401              11.52
  +200                      0.7597               7.69
  +400                      0.9091               2.91`,
      hl: [2, 7],
      caption: "A 400-point gap means the favourite wins 90.9% of the time. That is the definition of the scale." },

    { t: "callout", kind: "good", title: "The update is self-correcting, which is the design",
      body: [
        { t: "p", text: "A 400-point favourite gains only **2.91** points for winning and loses 29.09 for losing. So ratings are stable where they are already correct and move fast where they are wrong \u2014 the expected update is zero when the rating is accurate." },
        { t: "p", text: "That is the same self-balancing property 7.4 measured in the Bradley-Terry gradient, where a badly ranked pair carried 98.2% of maximum gradient and a confidently correct one 1.8%. Identical mechanism, since the update is proportional to \\(S - E\\) and the gradient is proportional to \\(1 - \\sigma\\)." },
        { t: "p", text: "K is the learning rate. Large K tracks genuine change quickly and makes ratings noisy; small K is stable and slow to notice a genuinely better model. Arena-scale systems fit all ratings jointly by maximum likelihood instead, which removes the ordering dependence that sequential updating introduces." }
      ] },

    { t: "h2", n: "02", id: "ci", text: "The confidence interval",
      sub: "The number that decides whether a rank is real" },

    { t: "p", text: "A rating gap of 20 Elo sounds meaningful and corresponds to winning 52.88% of comparisons. The question is how many comparisons are needed before that is distinguishable from a coin flip." },

    { t: "code", lang: "python", title: "g85.py \u00a7B \u2014 interval on a win rate, converted to Elo", code: `p_true = expected(1520, 1500)              # 0.5288
se = math.sqrt(p_true * (1 - p_true) / n)
hw = 1.96 * se                             # 95% halfwidth on the win rate
elo_hw = hw * 400 / (math.log(10) * p_true * (1 - p_true))   # chain rule`,
      out: `  two models 20 Elo apart: P(better one wins) = 0.5288

  comparisons    se of win rate 95% CI halfwidth    Elo halfwidth
  100                   0.04992          0.09784            68.2
  500                   0.02232          0.04375            30.5
  1000                  0.01579          0.03094            21.6
  5000                  0.00706          0.01384             9.6
  10000                 0.00499          0.00978             6.8
  50000                 0.00223          0.00438             3.1

  to resolve a 20-Elo gap needs ~1163 comparisons.`,
      hl: [5, 6, 8, 12],
      caption: "At 100 comparisons the interval is \u00b168 Elo \u2014 more than three times the gap being measured." },

    { t: "callout", kind: "insight", title: "The \u221an is unforgiving, and preference data is expensive",
      body: [
        { t: "p", text: "Halving the interval costs four times the comparisons. Going from \u00b121.6 Elo at a thousand votes to \u00b13.1 at fifty thousand is a fiftyfold increase in human labelling for a sevenfold improvement in precision." },
        { t: "p", text: "7.12 priced this: human preference labels cost $1\u20135 each. So resolving a 20-Elo gap at $3 a vote is roughly $3,500, and separating two models 5 Elo apart would need about sixteen times that \u2014 which is why fine distinctions at the top of a leaderboard are economically hard rather than merely slow." },
        { t: "p", text: "It also explains why arenas accumulate votes over months and why new models arrive with wide intervals that narrow over time. A model\u2019s rank on its first day is substantially less certain than its rank a month later, even with no change to the model." }
      ] },

    { t: "callout", kind: "note", title: "In fairness, the arena does publish intervals",
      body: [
        { t: "p", text: "The framing \u201cthe confidence interval nobody prints\u201d is unfair to LMSYS, which publishes confidence intervals alongside its ratings and has done so throughout. The arithmetic above is not a criticism of the arena \u2014 it is a reconstruction of why those intervals are the width they are." },
        { t: "p", text: "What does routinely drop the interval is **secondary reporting**: a blog post, a launch slide or a procurement document quoting \u201crank 3 on the arena\u201d without the \u00b1. That is where a statistically indistinguishable cluster becomes an ordered list." },
        { t: "p", text: "So the practical rule is to go back to the source and read the interval. If two models\u2019 intervals overlap, their ranks are not distinguishable, and treating the ordering as information is reading noise." }
      ] },

    { t: "h2", n: "03", id: "limits", text: "What preference measures",
      sub: "Holistic quality, and not correctness" },

    { t: "callout", kind: "warn", title: "Preference is not correctness, and the bias direction is known",
      body: [
        { t: "p", text: "Human voters favour confident, well-formatted, longer answers. 7.11 catalogued exactly these as reward hacks \u2014 length bias, formatting tics, confident hallucination \u2014 and an arena is a reward model made of people, so it has the same exploitable directions." },
        { t: "p", text: "8.3 measured the sharpest version on automatic metrics: a factually inverted sentence scored a perfect ROUGE-1 while a correct paraphrase scored 0.2581. Human preference does not fail that way, but it does reliably prefer a fluent wrong answer to a hedged correct one." },
        { t: "p", text: "So an arena rating is a good measure of *how much people like talking to a model* and a poor measure of whether it is right. For correctness you want the execution-scored benchmarks from 8.4, or a verifier from 7.9." }
      ] },

    { t: "callout", kind: "good", title: "Its strength is the thing no static benchmark has",
      body: [
        { t: "p", text: "It captures holistic human preference over an open-ended, continually refreshed distribution of real questions. 8.4\u2019s benchmarks are fixed sets that can be contaminated and optimised against; arena prompts come from whoever showed up today." },
        { t: "p", text: "That makes it contamination-resistant in a way a static benchmark cannot be, because there is no fixed answer key to leak. It is the closest thing to an unsaturatable evaluation currently available at scale." },
        { t: "p", text: "The price is that it is slow and expensive \u2014 the \u221an arithmetic above \u2014 and that it measures preference rather than capability. Both are real, and neither is a reason to ignore it." }
      ] },

    { t: "viz", title: "How many votes a rank needs", caption: "At 100 comparisons the 95% interval is +/-68 Elo. Resolving a 20-Elo gap takes about 1,163.",
      svg: `<svg viewBox="0 0 760 280" width="100%" role="img" aria-label="Elo confidence interval against number of comparisons">
  <text x="16" y="22" class="s-label">95% CONFIDENCE HALFWIDTH IN ELO, FOR A TRUE GAP OF 20</text>
  <line x1="110" y1="210" x2="700" y2="210" stroke="var(--line)" stroke-width="1.2"/>
  <line x1="110" y1="210" x2="110" y2="50" stroke="var(--line)" stroke-width="1.2"/>
  <text x="102" y="60" text-anchor="end" class="s-mono" style="font-size:9px">70</text>
  <text x="102" y="150" text-anchor="end" class="s-mono" style="font-size:9px">20</text>
  <text x="102" y="214" text-anchor="end" class="s-mono" style="font-size:9px">0</text>
  <line x1="110" y1="150" x2="700" y2="150" stroke="var(--warn)" stroke-width="1.2" stroke-dasharray="4 3"/>
  <text x="706" y="147" class="s-mono" style="font-size:9px;fill:var(--warn)">the gap</text>

  <circle cx="150" cy="54" r="5" class="s-fill" style="stroke:var(--crit)" stroke-width="1.8"/>
  <text x="150" y="44" text-anchor="middle" class="s-mono" style="font-size:9px;fill:var(--crit)">68.2</text>
  <text x="150" y="230" text-anchor="middle" class="s-sub" style="font-size:9px">100</text>

  <circle cx="246" cy="124" r="5" class="s-fill" style="stroke:var(--crit)" stroke-width="1.6"/>
  <text x="246" y="114" text-anchor="middle" class="s-mono" style="font-size:9px;fill:var(--crit)">30.5</text>
  <text x="246" y="230" text-anchor="middle" class="s-sub" style="font-size:9px">500</text>

  <circle cx="320" cy="145" r="5" class="s-fill" style="stroke:var(--warn)" stroke-width="1.6"/>
  <text x="320" y="135" text-anchor="middle" class="s-mono" style="font-size:9px;fill:var(--warn)">21.6</text>
  <text x="320" y="230" text-anchor="middle" class="s-sub" style="font-size:9px">1,000</text>

  <circle cx="440" cy="188" r="5" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="440" y="178" text-anchor="middle" class="s-mono" style="font-size:9px;fill:var(--good)">9.6</text>
  <text x="440" y="230" text-anchor="middle" class="s-sub" style="font-size:9px">5,000</text>

  <circle cx="530" cy="196" r="5" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="530" y="186" text-anchor="middle" class="s-mono" style="font-size:9px;fill:var(--good)">6.8</text>
  <text x="530" y="230" text-anchor="middle" class="s-sub" style="font-size:9px">10,000</text>

  <circle cx="660" cy="203" r="5" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="660" y="193" text-anchor="middle" class="s-mono" style="font-size:9px;fill:var(--good)">3.1</text>
  <text x="660" y="230" text-anchor="middle" class="s-sub" style="font-size:9px">50,000</text>

  <polyline points="150,54 246,124 320,145 440,188 530,196 660,203" fill="none" stroke="var(--accent)" stroke-width="1.6" stroke-dasharray="4 3"/>
  <text x="16" y="258" class="s-mono" style="fill:var(--crit)">halving the interval costs 4x the votes -- and a human vote costs $1-5</text>
  <text x="16" y="276" class="s-sub">so resolving 20 Elo is ~$3,500 of labelling, and 5 Elo is ~16x that</text>
</svg>` },

    { t: "exercise", kind: "analysis", title: "Compute the interval before trusting a rank", difficulty: "core", minutes: 25,
      body: "For a leaderboard you actually consult, take the top several models and determine which pairs are statistically distinguishable. Report the implied number of comparisons needed for each pair's gap, and how many of the published ranks survive.",
      requirements: [
        "Record the rating and published interval for at least five models",
        "Compute, for each adjacent pair, the comparisons needed to resolve the gap",
        "State which adjacent pairs have overlapping intervals",
        "Report how many distinct statistically-separable tiers the top five actually form",
        "State what you would conclude for a model-selection decision"
      ],
      hint: "Work in win rates rather than Elo. Convert the gap to a win probability, compute the binomial standard error, then convert back — the chain-rule factor is 400/(ln10 · p(1−p)).",
      solution: { lang: "python", title: "comparisons needed, and the tiers", code: `import math

def expected(ra, rb):
    return 1.0 / (1.0 + 10 ** ((rb - ra) / 400))

def comparisons_needed(gap_elo, z=1.96):
    """How many pairwise votes to get a 95% CI halfwidth narrower than the gap."""
    p = expected(1500 + gap_elo, 1500)
    # halfwidth in Elo = z*sqrt(p(1-p)/n) * 400/(ln10*p(1-p));  solve < gap
    k = 400 / (math.log(10) * p * (1 - p))
    return (z * k / gap_elo) ** 2 * p * (1 - p)

def tiers(models, intervals):
    """Group models whose published intervals overlap -- those ranks are not real."""
    out, cur = [], [models[0]]
    for prev, nxt in zip(models, models[1:]):
        lo_prev = prev[1] - intervals[prev[0]]
        hi_next = nxt[1] + intervals[nxt[0]]
        if hi_next >= lo_prev:          # overlap -> same tier
            cur.append(nxt)
        else:
            out.append(cur); cur = [nxt]
    out.append(cur)
    return out

for gap in (5, 10, 20, 50, 100):
    print("gap %4d Elo -> win rate %.4f -> need %9.0f comparisons"
          % (gap, expected(1500 + gap, 1500), comparisons_needed(gap)))`,
        out: `  gap    5 Elo -> win rate 0.5072 -> need    186097 comparisons
  gap   10 Elo -> win rate 0.5144 -> need     46520 comparisons
  gap   20 Elo -> win rate 0.5288 -> need     11628 comparisons
  gap   50 Elo -> win rate 0.5719 -> need      1848 comparisons
  gap  100 Elo -> win rate 0.6401 -> need       457 comparisons`,
        notes: [
          { t: "p", text: "**The scaling is quadratic in the gap, which is brutal at the top.** Resolving 100 Elo takes 457 comparisons and resolving 5 Elo takes 186,097 \u2014 a 407-fold increase for a twentyfold smaller gap. Fine distinctions between frontier models are economically hard, not just slow." },
          { t: "p", text: "**These figures are stricter than the lesson's 1,163** because this function requires the halfwidth to be narrower than the whole gap rather than comparing one rating against a fixed reference. Both are defensible; the point is to state which criterion you used, since they differ by an order of magnitude." },
          { t: "p", text: "**At $3 a human vote, resolving 10 Elo is about $140,000.** That is the real reason leaderboards accumulate votes over months and why a new model's rank is markedly less certain on its first day than a month later, with no change to the model." },
          { t: "p", text: "**The `tiers` function is the output to act on.** If adjacent intervals overlap, those ranks are not distinguishable and the ordering between them is noise \u2014 so the honest reading of a top ten is usually two or three tiers rather than ten positions." },
          { t: "p", text: "One thing this deliberately assumes: that votes are independent and identically distributed, which they are not. Prompts arrive non-uniformly, voters differ in strictness, and models are updated mid-collection \u2014 all of which make the real intervals wider than the binomial arithmetic suggests, so treat these as optimistic floors." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Elo is Bradley-Terry with a 174-points-per-logit scale, so 7.4\u2019s result applies: only differences are identified and a rating alone means nothing. A 400-point gap is a 90.9% win rate by definition, and the update is self-correcting because it is proportional to surprise." },
        { t: "p", text: "The number that decides whether a rank is real is the sample size, and \u221an is unforgiving: \u00b168 Elo at 100 votes, \u00b121.6 at a thousand, and about 1,163 votes to resolve a 20-Elo gap. If two intervals overlap, the ordering between them is noise." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cModel X is ranked third on the arena and model Y is fifth. Should we prefer X?\u201d**" },
        { t: "p", text: "Only if their confidence intervals do not overlap, which at the top of a leaderboard they usually do. The arena publishes those intervals \u2014 it is secondary reporting, launch slides and procurement documents, that drops the \u00b1 and turns a statistically indistinguishable cluster into an ordered list." },
        { t: "p", text: "The arithmetic is unforgiving because Elo gaps near the top are small. Two models 20 Elo apart win against each other 52.88% of the time, so you need about 1,163 comparisons for a 95% interval narrower than the gap. At 100 comparisons the interval is \u00b168 Elo, more than three times the gap you are trying to measure." },
        { t: "p", text: "And it scales quadratically. Resolving 100 Elo takes a few hundred votes; resolving 5 Elo takes over a hundred thousand. At one to five dollars a human preference label, separating two frontier models is a six-figure labelling exercise, which is why these distinctions firm up over months rather than days." },
        { t: "p", text: "So my reading of a top ten is usually two or three statistically separable tiers rather than ten positions, and I would treat X and Y as the same tier unless the published intervals say otherwise." },
        { t: "p", text: "The second thing I would raise is what preference measures. Voters favour confident, well-formatted, longer answers \u2014 which are exactly the reward hacks that show up when you optimise against a learned preference model. An arena is a reward model made of people, so it has the same exploitable directions. It is a good measure of how much people enjoy using a model and a poor measure of whether it is right." },
        { t: "p", text: "What it does have that no static benchmark does is contamination resistance, because there is no fixed answer key to leak and the prompts come from whoever showed up today. So I would use it to screen, use execution-scored benchmarks for correctness, and make the actual decision on our own eval set and an A/B." }
      ] }
  ],

  takeaways: [
    "**Elo is Bradley-Terry with a different scale** \u2014 about 174 rating points per logit \u2014 so 7.4's result that only differences are identified applies directly.",
    "**A rating alone carries no information**; the gap does. Comparing Elo across leaderboards with different anchors is meaningless.",
    "**A 400-point gap means a 90.9% win rate** \u2014 that is the definition of the scale, not an empirical finding.",
    "**The update is self-correcting**: a 400-point favourite gains 2.91 for a win and loses 29.09 for a loss, so the expected update is zero when the rating is right.",
    "**Two models 20 Elo apart win 52.88% of their matchups**, which is a coin flip with a small bias.",
    "**Resolving a 20-Elo gap takes about 1,163 comparisons**; at 100 comparisons the interval is \u00b168 Elo.",
    "**Halving the interval costs 4\u00d7 the votes**, and at $1\u20135 per human label that makes fine distinctions economically hard rather than merely slow.",
    "**The requirement scales quadratically in the gap** \u2014 457 comparisons for 100 Elo against 186,097 for 5 Elo.",
    "**LMSYS does publish intervals** \u2014 it is secondary reporting that drops them and turns an indistinguishable cluster into an ordered list.",
    "**If two intervals overlap the ordering is noise**, so a top ten usually resolves to two or three real tiers.",
    "**Preference is not correctness**: voters favour confident, well-formatted, longer answers \u2014 the same directions 7.11 catalogued as reward hacks.",
    "**Its unique strength is contamination resistance**, since there is no fixed answer key to leak and the prompt distribution refreshes continuously."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Two models are 20 Elo apart. How many pairwise comparisons are needed before that gap is statistically resolvable?",
        options: [
          "A few dozen, since Elo converges quickly with a well-chosen K",
          "Roughly a thousand or more \u2014 the true win rate is 52.88%, so the 95% interval is \u00b168 Elo at 100 comparisons and about \u00b122 at a thousand",
          "Around 200, which is the standard arena sample per pair",
          "It cannot be resolved at any sample size, since preference is subjective"
        ],
        answer: 1,
        why: "A 20-Elo gap corresponds to winning just under 53% of matchups, which is close to a coin flip, and the binomial standard error falls only as the square root of the sample size. That gives \u00b168.2 Elo at 100 comparisons \u2014 more than three times the gap \u2014 and about \u00b121.6 at 1,000. The requirement also scales quadratically as the gap narrows, so 5 Elo needs on the order of a hundred thousand comparisons." },

      { stem: "What does an Elo rating of 1,247 tell you on its own?",
        options: [
          "That the model is above average, since 1,200 is the conventional starting rating",
          "Nothing \u2014 Elo is Bradley-Terry with a rescaled axis, so only differences are identified and the absolute level is an arbitrary anchor",
          "That it wins about 62% of its comparisons against the field",
          "That it is calibrated against a fixed reference model by construction"
        ],
        answer: 1,
        why: "The expected-score formula depends only on the difference between two ratings, so adding a constant to every rating leaves every predicted outcome unchanged \u2014 the same unidentifiability demonstrated for reward models, where fits from initialisations 100 apart gave identical pairwise differences to six decimal places. Leaderboards fix the level by convention, which is why ratings are not comparable across leaderboards with different anchors." },

      { stem: "A 400-point Elo favourite wins and gains only 2.91 rating points. Why is this the intended behaviour?",
        options: [
          "Because K should be reduced for highly-rated players to limit volatility",
          "Because the update is proportional to the surprise \u2014 a 400-point gap predicts a 90.9% win rate, so winning is nearly expected and carries little information",
          "Because rating inflation must be controlled at the top of the distribution",
          "Because ties are weighted at 0.5 and dominate the long-run average"
        ],
        answer: 1,
        why: "The update is K times the difference between the actual and expected score, so it vanishes when the rating already predicts the outcome \u2014 and the same win-loss asymmetry means an upset moves the underdog by 29.09 points. That makes ratings stable where correct and fast-moving where wrong, which is the same self-balancing property as the Bradley-Terry gradient concentrating on badly-ranked pairs." },

      { stem: "What is the main thing an arena rating measures poorly?",
        options: [
          "Multi-turn conversational ability, since votes are usually on single turns",
          "Correctness \u2014 voters favour confident, well-formatted, longer answers, which are the same directions that get exploited when optimising against a learned preference model",
          "Latency and cost, which users implicitly trade against quality",
          "Performance on non-English prompts, which are underrepresented"
        ],
        answer: 1,
        why: "An arena is effectively a reward model made of people, so it shares the exploitable directions catalogued as reward hacks: length, formatting and confident assertion. It measures how much people enjoy interacting with a model rather than whether the model is right, so correctness is better established with execution-scored benchmarks or a programmatic verifier. Its distinctive strength is contamination resistance, since there is no fixed answer key to leak." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Preference at scale, and the sample size it needs",
    questions: [
      { level: "core",
        q: "How does Elo work for ranking language models?",
        strong: "A strong answer connects it to Bradley-Terry and notes what is identified.",
        answer: [
          { t: "p", text: "Blind pairwise votes get converted to ratings using the chess formula: the expected score for A is one over one plus ten to the rating difference over 400, and each rating moves by K times the difference between the actual and expected result." },
          { t: "p", text: "Underneath it is the same model as a reward model \u2014 logistic regression on a difference. Elo is Bradley-Terry with ratings measured in units of about 174 points per logit, which is worth knowing because it means only differences are identified. An Elo number alone carries no information; the gap does, and ratings are not comparable across leaderboards with different anchors." },
          { t: "p", text: "The 400 is the scale\u2019s defining constant: a 400-point gap means the favourite wins 90.9% of the time, by definition rather than by measurement. And the update is self-correcting, since it is proportional to surprise \u2014 that favourite gains only 2.91 points for a win and loses 29.09 for a loss." },
          { t: "p", text: "At arena scale you would not update sequentially at all, because the result would depend on the order comparisons arrived in. You fit all ratings jointly by maximum likelihood, which is the same fit as training a Bradley-Terry reward model on preference pairs." }
        ] },

      { level: "advanced",
        q: "How much should you trust a leaderboard ranking?",
        strong: "A strong answer computes the sample size rather than gesturing at noise.",
        answer: [
          { t: "p", text: "It depends entirely on the gap and the number of comparisons, and the arithmetic is less forgiving than people expect. Two models 20 Elo apart win against each other 52.88% of the time, so you need roughly 1,163 comparisons for a 95% interval narrower than the gap. At 100 comparisons the interval is \u00b168 Elo." },
          { t: "p", text: "And it scales quadratically as the gap narrows \u2014 457 comparisons for a 100-Elo gap, about 186,000 for a 5-Elo gap. At one to five dollars per human preference label that is a six-figure exercise to separate two frontier models, which is why these distinctions firm up over months." },
          { t: "p", text: "So my reading of a top ten is two or three statistically separable tiers rather than ten positions. If adjacent intervals overlap, the ordering between those models is noise." },
          { t: "p", text: "In fairness to LMSYS, they publish the intervals \u2014 the problem is secondary reporting that quotes a rank without the \u00b1. And I would treat the binomial arithmetic as an optimistic floor, since votes are not independent and identically distributed: prompts arrive non-uniformly, voters differ in strictness, and models get updated mid-collection." }
        ] },

      { level: "core",
        q: "Why do arenas complement benchmarks rather than replace them?",
        strong: "A strong answer names contamination resistance and the preference-correctness gap.",
        answer: [
          { t: "p", text: "They have opposite failure modes, which is what makes the pair useful. A static benchmark has a fixed answer key that can leak into training data, so a high score can be memorisation. An arena has no fixed answer key and the prompt distribution refreshes with whoever shows up, so it is contamination-resistant in a way no static set can be." },
          { t: "p", text: "The flip side is that an arena measures preference, not correctness. Voters reliably favour confident, well-formatted and longer answers \u2014 the same directions that get exploited when you optimise against a learned reward model, because an arena is essentially a reward model made of people." },
          { t: "p", text: "So for correctness I would reach for execution-scored benchmarks, where the output runs against tests and cannot be bluffed, or a programmatic verifier. Those resist both judge bias and answer-key leakage, though not a memorised solution." },
          { t: "p", text: "And neither answers the question most teams are actually asking, because neither contains their retriever, their documents or their users. Benchmarks and arenas screen the long list; a private eval set from real traffic makes the decision, and an A/B confirms it." }
        ] }
    ]
  }
});
