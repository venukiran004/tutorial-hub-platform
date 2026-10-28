EC.receiveLesson({
  id: "3.3",

  lede: "Canary sizing is argued about by preference — *start at one percent*, *five is standard* — and it is arithmetic. The arithmetic contains a result that almost nobody expects: **the number of users harmed before you can detect a bad model does not depend on the canary share at all.** Detecting a five-point move in the approval rate needs 2,282 canary observations, and every one of them is a bad prediction, so the exposure is **2,282 whether the canary is 1% or 50%**. What the share buys is time — **3.2 hours against 3.8 minutes** — and the second-order consequence of that is the real argument.",

  objectives: [
    "Compute a canary's time to detect from the share, the traffic rate and the required sample size",
    "Explain why exposure before detection is invariant to the canary share, and when that stops being true",
    "Say which signals a canary can gate on given a realistic label delay",
    "Choose between blue-green, canary, shadow and a feature flag from the failure each contains"
  ],

  prerequisites: ["3.2"],

  blocks: [

    { t: "h2", n: "01", id: "four", text: "Four strategies, four containments",
      sub: "Each one contains a different failure" },

    { t: "p", text: "The four rollout strategies are often presented as a progression from crude to sophisticated. They are not — they contain different failures, and choosing by sophistication gets you the wrong one." },

    { t: "code", lang: "python", title: "m33.py — the four, on what they contain",
      out: `== the four strategies, on what they contain ==
  strategy       contains               rollback               exposure
  blue-green     a bad binary           instant: flip back     100% at the moment of flip
  canary         a bad model            stop promoting         share x rate x window
  shadow         an unmeasured model    nothing to roll back   zero users
  feature flag   a bad decision         flip per user/segment  whatever the flag covers` },

    { t: "p", text: "**Blue-green** keeps the previous version running and switches traffic atomically. It gives you an instant rollback — the old environment is still warm — and contains a deployment that does not start, a missing dependency, a broken migration. It does **not** contain a bad model, because the switch is all-or-nothing: at the moment of the flip, every user is on the new version." },

    { t: "p", text: "**Canary** sends a fraction of traffic to the new version and compares. This is the one that contains a bad *model*, because a model's failure is statistical rather than binary — it does not crash, it is just wrong more often, and you need a sample to see that." },

    { t: "p", text: "**Shadow** runs the new model on real traffic and discards its answers. Nothing to roll back because nothing was served. This is the only strategy that can wait for labels, which the arithmetic below makes decisive." },

    { t: "p", text: "**A feature flag** is a business-logic switch rather than a deployment mechanism: the model is deployed and the decision to *use* its output is toggleable per user or segment. It contains a bad decision rather than a bad artifact." },

    { t: "h2", n: "02", id: "arithmetic", text: "Time to detect",
      sub: "Three numbers and a division" },

    { t: "p", text: "A canary cannot be evaluated until it has produced enough observations to distinguish a real change from noise — the same sample-size question as lesson 2.2 and lesson 3.2's noise floor. The canary only receives its share of traffic, so:" },

    { t: "p", text: "**time to detect = n / (share × rate)**, where n is the sample size the signal needs." },

    { t: "code", lang: "python", title: "m33.py — three signals, four canary shares",
      out: `== canary share against time to detect, at 20 rps overall ==
  signal                       n needed         1%         5%        25%        50%
  error rate 0.1% -> 2%             671   55.9 min   11.2 min    2.2 min       67 s
  approval rate 0.45 -> 0.40       2282      3.2 h   38.0 min    7.6 min    3.8 min
  accuracy 0.7667 -> 0.7167        1789     45.1 d     45.0 d     45.0 d     45.0 d` },

    { t: "p", text: "The third row is the one that settles a design question. **The accuracy row barely moves with the canary share** — 45.1 days at 1% against 45.0 days at 50% — because the sample size is reached in minutes and the *labels* take forty-five days. Increasing the canary to half of all traffic buys six minutes off a forty-five-day wait." },

    { t: "callout", kind: "insight", title: "A canary cannot gate on model quality",
      body: [
        { t: "p", text: "This is the operational consequence of lesson 2.2's label delay, and it is usually discovered the wrong way round — a team sets up a canary intending to compare accuracy, and finds there is nothing to compare for six weeks." },
        { t: "p", text: "A canary gates on **infrastructure and the prediction distribution**: error rate in 11 minutes, approval rate in 38, both at a 5% share. For model quality you need **shadow mode**, which serves no users and can therefore run for as long as the labels take. The two are complements, not alternatives." }
      ] },

    { t: "h2", n: "03", id: "invariant", text: "The exposure is invariant",
      sub: "The result nobody expects" },

    { t: "p", text: "Now the arithmetic that changes how you think about canary sizing. Detection requires n canary observations. Every canary request is served by the bad model. So the number of bad predictions served before detection is possible is... n." },

    { t: "code", lang: "python", title: "m33.py — exposure against share",
      out: `== the result nobody expects: exposure is INVARIANT ==
  share        canary rps   time to detect  bad predictions
  1%                 0.20            3.2 h             2282
  5%                 1.00         38.0 min             2282
  10%                2.00         19.0 min             2282
  25%                5.00          7.6 min             2282
  50%               10.00          3.8 min             2282
  100%              20.00          1.9 min             2282

  the last column is constant at 2282. A 1% canary does not harm fewer
  users than a 50% canary -- it takes 50x longer to find out.` },

    { t: "p", text: "**2,282 in every row.** The intuition that a small canary protects users is wrong when the canary runs until it reaches significance: the share sets the *rate* at which bad predictions are served, and the duration adjusts to compensate exactly. A 1% canary harms the same number of users as a 50% one, fifty times more slowly." },

    { t: "diagram", kind: "compare", id: "dg-3_3-03-0",
      title: "The same 2,282 bad predictions, two ways",
      caption: "The product share × duration is pinned by the sample size, so **the only free variable is how long you spend accumulating it.** The intuition that a small canary is safer comes from imagining a fixed-duration window, which is the next section.",
      columns: [
        { title: "1% canary", items: [
          "0.20 predictions/second to the new model",
          "3.2 hours to reach significance",
          "2,282 bad predictions served",
          "3.2 hours of calendar risk",
          "slow feedback: the next change waits",
          "cannot finish inside a 30-minute window"
        ] },
        { title: "50% canary", items: [
          "10.0 predictions/second to the new model",
          "3.8 minutes to reach significance",
          "2,282 bad predictions served",
          "3.8 minutes of calendar risk",
          "fast feedback: iterate within the hour",
          "finishes comfortably inside any window"
        ] }
      ] },

    { t: "h2", n: "04", id: "timer", text: "Where the intuition is right",
      sub: "A fixed timer changes everything" },

    { t: "p", text: "The invariant holds when the canary runs *until significance*. Most canaries in practice run for a fixed period — *half an hour, then promote* — and under a timer the arithmetic inverts completely." },

    { t: "code", lang: "python", title: "m33.py — a fixed 30-minute canary",
      out: `  2. Blast radius IF you cap the window by TIME instead of by
     observations. At a fixed 30-minute canary:
          1% ->    360 predictions exposed, detection is NOT within the window
          5% ->   1800 predictions exposed, detection is NOT within the window
         25% ->   9000 predictions exposed, detection IS within the window
         50% ->  18000 predictions exposed, detection IS within the window
     which is the real trade: a small canary on a fixed timer cannot
     reach significance before the timer expires.` },

    { t: "p", text: "Under a timer, exposure scales linearly with the share — 360 predictions at 1%, 18,000 at 50% — so the small canary genuinely does protect more users. But look at the middle column: **at 1% and 5% the detection never happens**, because thirty minutes at those rates yields 360 and 1,800 observations against the 2,282 required." },

    { t: "callout", kind: "trap", title: "A small canary on a short timer is a ceremony",
      body: [
        { t: "p", text: "A 1% canary for thirty minutes exposes 360 predictions and then promotes on a comparison that had no power to detect the thing it was looking for. It feels careful and it is theatre: the promotion decision carries no information, and the subsequent full rollout exposes everyone." },
        { t: "p", text: "This is lesson 2.2's power problem in a different costume. The fix is to pick the share **from** the sample size and the window you are willing to wait: with 2,282 observations needed and thirty minutes available at 20 rps, the share has to be at least about 6.3%." }
      ] },

    { t: "diagram", kind: "steps", id: "dg-3_3-04-0",
      title: "Sizing a canary from the arithmetic",
      caption: "Four steps, and the third is the one that is usually skipped. **A share chosen before the sample size is a guess**, and under a timer it is a guess that can make the whole exercise uninformative.",
      items: [
        { label: "Pick the signal the canary will gate on", desc: "Error rate or prediction distribution. Not accuracy: at a 45-day label delay it is 45.0 days at any share." },
        { label: "Compute n for that signal's detectable change", desc: "671 for error rate 0.1% to 2%; 2,282 for a 5-point approval-rate move, at alpha 0.01 and 80% power." },
        { label: "Decide the window you will actually wait", desc: "This is the business constraint. Thirty minutes is typical and it is what makes the share non-negotiable." },
        { label: "Solve for the share: n / (rate x window)", desc: "2,282 over 20 rps over 1,800 s gives at least 6.3%. A 1% canary cannot conclude anything in that window." }
      ] },

    { t: "h2", n: "05", id: "shadow", text: "Shadow, and the three-stage rollout",
      sub: "What each stage is allowed to decide" },

    { t: "p", text: "The strategies compose, and the composition follows from what each can measure. Shadow answers *is the model right*, over however long the labels take. Canary answers *does it behave*, in minutes. Blue-green answers *does it deploy*, instantly." },

    { t: "p", text: "Which yields a sequence where each stage decides exactly what it is able to decide:" },

    { t: "table",
      head: ["Stage", "Duration", "Decides", "Measured here"],
      rows: [
        ["Shadow", "as long as labels take — 45 days", "Is the new model more accurate than the incumbent?", "The only stage where the accuracy comparison is available at all"],
        ["Canary", "minutes to an hour", "Does it behave — errors, latency, output distribution?", "Error rate 11.2 min, approval rate 38.0 min at a 5% share"],
        ["Blue-green flip", "seconds", "Does it serve at full traffic, with an instant way back?", "100% exposure at the moment of the flip, and that is the point"],
        ["Feature flag", "indefinite", "Should we act on it for this segment?", "Independent of the deployment; the only per-user control"]
      ] },

    { t: "callout", kind: "good", title: "Shadow mode is also how you get a labelled comparison for free",
      body: [
        { t: "p", text: "Because shadow serves nobody, both models score every request and both sets of predictions can be logged against the same inputs. When the labels arrive forty-five days later they join to *both*, which gives a paired comparison on identical traffic — exactly the pairing that made lesson 3.2's bootstrap interval usable." },
        { t: "p", text: "That is a better comparison than a canary could ever provide, because a canary splits traffic and the two models never see the same request. The cost is a second inference per request, which lesson 2.1 priced at 0.58 ms of model time." }
      ] },

    { t: "p", text: "Two caveats on the arithmetic before leaving it. Every figure assumes independent observations, and traffic is rarely independent — a hundred predictions in one user's session is closer to one observation, which inflates every detection time. And *bad predictions* counts predictions, not cost: two thousand wrongly declined loan applications is not two thousand times the harm of one, in either direction. The arithmetic bounds the volume; the business decides what the volume is worth." },

    { t: "exercise", kind: "practice", title: "Size your own canary", difficulty: "core", minutes: 30,
      prompt: "For a model you deploy, work out the share rather than inheriting it. Take your real request rate and the signal you would actually gate on — almost certainly error rate or the prediction distribution, not accuracy. Compute the sample size for a change you would want to catch, then solve for the minimum share that reaches it inside the window your team is willing to wait. Compare that to the share you currently use. Then check the uncomfortable one: if your canary runs on a fixed timer, compute how many observations it actually accumulates and whether that reaches significance at all.",
      hints: [
        "If your canary gates on accuracy, find out when your labels arrive before anything else — it may make the canary decorative.",
        "Count independent observations: predictions within one user session are close to one observation, not many.",
        "A share that cannot reach significance inside your window is the finding. Either raise the share or lengthen the window."
      ],
      solution: {
        body: [
          { t: "p", text: "The common discovery is a 1% or 5% canary on a fixed timer that cannot reach significance — the promotion decision carries no information, and the subsequent full rollout is where the risk actually lands. Raising the share usually feels wrong and is correct." },
          { t: "p", text: "The other discovery is that the canary was nominally gating on model quality, which the label delay makes impossible. That is not a reason to remove the canary; it is a reason to add shadow mode for the quality question and let the canary do the job it can do in minutes." }
        ]
      } }

  ],

  takeaways: [
    "**Four strategies contain four different failures**: blue-green a bad binary, canary a bad model, shadow an unmeasured one, a feature flag a bad decision.",
    "**Blue-green cannot contain a bad model** — the flip is atomic, so at that moment every user is on the new version.",
    "**time to detect = n / (share × rate)**: error rate 11.2 min and approval rate 38.0 min at a 5% share and 20 rps.",
    "**A canary cannot gate on accuracy.** With a 45-day label delay it is 45.1 days at 1% and 45.0 days at 50% — raising the share buys six minutes off six weeks.",
    "**Exposure before detection is invariant to the share**: 2,282 bad predictions at 1%, 5%, 10%, 25%, 50% and 100%. Only the time changes, from 3.2 hours to 1.9 minutes.",
    "**So a small canary does not protect fewer users** when it runs until significance; it just takes fifty times longer to find out.",
    "**Under a fixed timer the arithmetic inverts**: exposure scales with the share (360 at 1%, 18,000 at 50%) — but at 1% and 5% detection never happens inside thirty minutes.",
    "**A 1% canary on a 30-minute timer is a ceremony**: 360 observations against the 2,282 needed, so the promotion decision carries no information.",
    "**Size the share from the arithmetic**: n / (rate × window). 2,282 over 20 rps over 1,800 s requires at least 6.3%.",
    "**Shadow mode is the only stage that can wait for labels**, because it serves nobody — and it scores both models on identical requests, giving the paired comparison a canary structurally cannot.",
    "**Shadow costs a second inference per request**, which lesson 2.1 priced at 0.58 ms of model time.",
    "**The arithmetic assumes independent observations.** A hundred predictions in one session is nearer one observation, which inflates every detection time above."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "You run a canary until it reaches statistical significance. How does reducing the share from 10% to 1% change the number of bad predictions served before detection?",
        options: [
          "It reduces it tenfold, which is the point of a small canary",
          "It does not change it — detection needs a fixed number of canary observations and every one is a bad prediction, so exposure is 2,282 either way; only the time changes, from 19 minutes to 3.2 hours",
          "It increases it, because the longer window serves more total traffic"
        ],
        answer: 1,
        why: "Share sets the rate and the duration compensates exactly, so the product is pinned by the sample size. The intuition behind the first option is right only for a fixed-duration canary — and at 1% a fixed window usually cannot reach significance at all."
      },
      {
        stem: "Your labels arrive 45 days after the prediction. What can a canary gate on?",
        options: [
          "Accuracy, provided the canary runs for 45 days",
          "Infrastructure signals and the prediction distribution — error rate in about 11 minutes and approval rate in 38 at a 5% share; model quality needs shadow mode, which serves no users",
          "Nothing useful; a canary is pointless with delayed labels"
        ],
        answer: 1,
        why: "A 45-day canary is a 45-day partial rollout, which is not a canary. The division of labour is that the canary answers 'does it behave' in minutes and shadow answers 'is it right' over however long the labels take, serving nobody while it waits."
      },
      {
        stem: "A team runs a 1% canary for 30 minutes at 20 requests per second, then promotes. What is wrong?",
        options: [
          "Nothing — 30 minutes is a reasonable soak and 1% is appropriately cautious",
          "The canary accumulates only 360 observations against the ~2,282 needed, so the comparison has no power and the promotion decision carries no information",
          "The canary share is too high for a 30-minute window"
        ],
        answer: 1,
        why: "It is lesson 2.2's power problem in a rollout costume: the process feels careful and is uninformative, with the real risk arriving at the subsequent full rollout. Solving n / (rate × window) gives a minimum share near 6.3% for that window."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "mid",
        q: "Walk me through how you would roll out a new model.",
        strong: "In three stages that each decide what they are able to decide. Shadow first: the new model scores real traffic and its answers are discarded, which is the only way to compare accuracy when labels take weeks — and because it serves nobody, both models score identical requests, so the comparison is paired. Then a canary on a share sized from the arithmetic, gating on error rate and the prediction distribution, which are detectable in minutes. Then the full flip, blue-green so the previous version is still warm and rollback is instant. I would size the canary rather than inherit a number: n over rate over window. With 2,282 observations needed, 20 requests a second and a thirty-minute window, the share has to be at least about 6.3%, so a 1% canary would conclude nothing.",
        answer: [
          { t: "p", text: "Stating what each stage can decide, rather than listing the stages, is the difference between a recited answer and an engineered one. Shadow-first is the ordering most candidates get backwards." },
          { t: "p", text: "Sizing the canary from the sample size is the detail that will be remembered, because almost everyone treats the percentage as a convention." }
        ]
      },
      {
        level: "senior",
        q: "Is a 1% canary safer than a 10% one?",
        strong: "Not in the way people mean. If the canary runs until it reaches significance, the number of bad predictions served before detection is fixed by the sample size — I measured 2,282 at every share from 1% to 100% — because a smaller share serves them more slowly over a proportionally longer window. So a 1% canary does not harm fewer users; it takes fifty times longer to find out, which is fifty times more calendar exposure to something else going wrong and much slower iteration. Where the intuition is right is a fixed-duration canary: then exposure does scale with the share. But at 1% for thirty minutes you accumulate 360 observations against 2,282 needed, so you promote on a comparison with no power, which is worse than a larger canary that actually concludes.",
        answer: [
          { t: "p", text: "The invariant is a genuinely counterintuitive result and stating it with the number is memorable. The key move is distinguishing run-to-significance from run-to-a-timer, because the answer reverses between them." },
          { t: "p", text: "Calling an underpowered canary worse than a bigger one is the conclusion that demonstrates the reasoning rather than the slogan." }
        ]
      },
      {
        level: "senior",
        q: "What is shadow mode for, and what does it cost?",
        strong: "It is for the comparison nothing else can make. The new model scores real production traffic and its output is logged and discarded, so no user is exposed and it can run for as long as the labels take — which in a lending case I measured was forty-five days, making an accuracy comparison impossible in any canary. It also gives a better comparison than a canary can: both models see every request, so when labels arrive they join to both prediction sets and you get a paired comparison on identical traffic, which is exactly the pairing that makes a bootstrap interval tight enough to be useful. The cost is a second inference per request plus the logging volume — in my measurement the model was 0.58 ms of a 1.94 ms request, so shadowing added about thirty percent of a request, not double.",
        answer: [
          { t: "p", text: "The paired-comparison benefit is the part that distinguishes someone who has used shadow mode from someone who has read about it, and it connects directly to the gate's statistics." },
          { t: "p", text: "Pricing the cost from a real latency breakdown rather than saying 'it doubles the work' is the kind of precision that makes the rest of the answer credible." }
        ]
      }
    ]
  }
});
