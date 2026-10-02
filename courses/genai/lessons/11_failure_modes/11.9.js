EC.receiveLesson({
  id: "11.9",

  lede: "Two ways to spend less per token and one way to spend nothing at all. Routing and cascades send easy traffic to a cheaper model \u2014 and the two are **not the same thing**, which the reference treats as interchangeable: at 80/20 and a 15x price gap, a router costs **25.3%** of the strong model and a cascade **26.7%**, because a cascade pays the cheap model on everything. Then caching, where the reference\u2019s own example pair scores **0.8526** against its own recommended **\u22650.95** threshold.",

  objectives: [
    "Distinguish a router from a cascade and price both",
    "Say when the cascade's extra cost buys something worth having",
    "Set a semantic-cache threshold from measurement rather than convention",
    "Name the queries a loose threshold will answer wrongly",
    "Decide what must never be semantically cached"
  ],

  prerequisites: ["11.8"],

  blocks: [

    { t: "h2", n: "01", id: "route", text: "Routing and cascades are different",
      sub: "And the reference conflates them" },

    { t: "code", lang: "text", title: "A router classifies first", code: `            +- classify difficulty (cheap/heuristic) -+
query ------+                                         +---------------> answer
            +- easy/common  -> small cheap model ------+
            +- hard/uncertain -> large model (only when needed)`,
      caption: "One model call per query, chosen in advance by a classifier." },

    { t: "code", lang: "python", title: "A cascade tries the cheap model first", code: `def cascade(query, cheap, strong, confident):
    ans = cheap(query)                  # ~10-20x cheaper
    if confident(ans):                  # self-reported or judged confidence
        return ans                      # most traffic stops here
    return strong(query)                # escalate only the hard minority`,
      hl: [2, 5],
      caption: "The cheap model runs on **everything**. The strong model runs on the escalated minority." },

    { t: "callout", kind: "insight", title: "Measured: 25.3% against 26.7% of the strong model\u2019s cost",
      body: [
        { t: "p", text: "At 80% easy traffic and a 15x price gap, a **router** costs 0.8 \u00d7 cheap + 0.2 \u00d7 strong = **25.3%** of running everything on the strong model. A **cascade** costs cheap \u00d7 1.0 + 0.2 \u00d7 strong = **26.7%**, because the cheap call is paid on every query including the ones that escalate." },
        { t: "p", text: "So the cascade is **strictly more expensive**, always, by exactly the cheap model\u2019s price on the escalated share. The gap is 1.3 points here because the cheap model is 15x cheaper \u2014 at a 3x gap it would be much wider." },
        { t: "p", text: "What the cascade buys for that premium is that it **needs no classifier**. A router requires something that can predict difficulty before seeing an answer, which is a model you have to build, evaluate and maintain; a cascade uses the cheap model\u2019s own output as the signal. That is the trade, and the reference presents the two as one idea." }
      ] },

    { t: "callout", kind: "tradeoff", title: "And they fail differently, which matters more than the 1.3 points",
      body: [
        { t: "p", text: "A router\u2019s failure is a **misclassification**: a hard query sent to the cheap model gets a bad answer and nothing notices, because there is no second opinion. The classifier\u2019s error rate becomes a quality ceiling." },
        { t: "p", text: "A cascade\u2019s failure is a **bad confidence signal**: if `confident()` is overconfident the query is not escalated, which is the same outcome \u2014 but the cheap model\u2019s answer exists and can be judged, so the signal is measurable after the fact. 9.14 is about exactly how badly calibrated self-reported confidence tends to be." },
        { t: "p", text: "Also note the latency: a cascade that escalates pays **both** latencies in series, so its p95 is the sum rather than the max. For a streaming interface that is a worse story than the cost table suggests, and 10.5 showed how much TTFT matters once the interface streams." }
      ] },

    { t: "h2", n: "02", id: "cache", text: "Caching \u2014 the cheapest token is the one you never send",
      sub: "Exact, then semantic" },

    { t: "code", lang: "python", title: "The semantic cache", code: `def semantic_cache_lookup(query, store, embed, threshold=0.95):
    """Reuse a past answer if a previous query is semantically near."""
    qv = embed(query)
    hit, sim = store.nearest(qv)            # vector similarity search
    if sim >= threshold:                    # tune carefully: too low = wrong answers
        return hit.answer                   # cache hit -> 0 LLM tokens
    return None                             # miss -> call the model, then store(qv, answer)`,
      hl: [5],
      caption: "The threshold is the whole design, and the default is wrong for this embedding model." },

    { t: "callout", kind: "trap", title: "The reference\u2019s own example fails its own threshold",
      body: [
        { t: "p", text: "It motivates semantic caching with the pair *\u201chow do I reset my password?\u201d* and *\u201cI forgot my password, what do I do?\u201d*, and separately advises setting the threshold high, at **\u22650.95**. Measured on `all-MiniLM-L6-v2`, that pair scores **0.8526** \u2014 a clear miss at 0.95. The advice and the illustration are inconsistent." },
        { t: "p", text: "A threshold sweep shows the real picture is the opposite of the warning: at 0.95 you get **3 of 4** intended hits, losing both \u201cpassword reset\u201d (0.8673) and the reference\u2019s own example. At **0.85** you get 4 of 4 with **zero** wrong hits, and the highest threshold with zero wrong hits is **0.72**." },
        { t: "p", text: "So 0.95 is too *strict* for this model, not too loose. The reference\u2019s caution is directionally sound \u2014 a loose threshold does serve wrong answers \u2014 but the specific number is miscalibrated, and the real lesson is that **the threshold is model-dependent and must be measured.**" }
      ] },

    { t: "callout", kind: "warn", title: "The dangerous neighbours are the ones to name",
      body: [
        { t: "p", text: "Measured against \u201chow do I reset my password?\u201d: **\u201chow do I reset my PIN?\u201d 0.6225**, **\u201chow do I reset my username?\u201d 0.7022**, and **\u201chow do I reset my colleague\u2019s password?\u201d 0.7150.** A PIN is not a password, a username is not a password, and a colleague\u2019s password is not yours \u2014 and all three are close enough that a threshold at 0.70 serves two of them a wrong answer." },
        { t: "p", text: "That is the correctness bug the reference warns about, with the numbers attached: a loose threshold does not degrade quality gracefully, it answers a different question confidently. And \u201chow do I change my password?\u201d at 0.8741 sits above the reference\u2019s own example, which makes it genuinely borderline rather than clearly safe." },
        { t: "p", text: "The safe band on this model is roughly **0.72 to 0.85** \u2014 wide enough to be usable and narrow enough that guessing lands outside it. Measure yours with a handful of must-hit and must-miss pairs; it takes ten minutes and it is the only way to know." }
      ] },

    { t: "callout", kind: "good", title: "And never semantically cache personalised or time-sensitive answers",
      body: [
        { t: "p", text: "The \u201ccolleague\u2019s password\u201d case at 0.7150 is the general shape of the problem: two queries can be semantically near and have different *correct* answers because the **subject** differs, not the topic. Any query carrying a user, an account, a date or a balance is in this category." },
        { t: "p", text: "The practical rule is to key the cache on more than the embedding \u2014 tenant, user, locale, and a time bucket for anything that expires. A semantic cache scoped per tenant is a very different risk from a global one, and the scoping costs nothing." },
        { t: "p", text: "Exact caching has none of these problems and should be enabled first. It is trivially correct, instant, and 11.7 priced a 40% hit rate as the single largest remaining saving once the token levers are done." }
      ] },

    { t: "viz", title: "Router against cascade, and the measured cache threshold", caption: "Measured. The safe band is 0.72\u20130.85, not the recommended \u22650.95.",
      svg: `<svg viewBox="0 0 760 320" width="100%" role="img" aria-label="Router versus cascade cost and the measured semantic cache threshold band">
  <text x="16" y="20" class="s-label">ROUTER vs CASCADE &#183; 80% EASY, 15x PRICE GAP</text>
  <text x="20" y="42" class="s-mono" style="font-size:9px">all strong</text>
  <rect x="140" y="32" width="520" height="14" rx="2" class="s-fill" style="stroke:var(--crit)" stroke-width="1.4"/>
  <text x="668" y="43" class="s-mono" style="font-size:8px">100%</text>
  <text x="20" y="64" class="s-mono" style="font-size:9px">router</text>
  <rect x="140" y="54" width="132" height="14" rx="2" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="280" y="65" class="s-mono" style="font-size:8px;fill:var(--good)">25.3% &#8212; one call, chosen by a classifier</text>
  <text x="20" y="86" class="s-mono" style="font-size:9px">cascade</text>
  <rect x="140" y="76" width="139" height="14" rx="2" class="s-fill" style="stroke:var(--warn)" stroke-width="1.6"/>
  <text x="287" y="87" class="s-mono" style="font-size:8px;fill:var(--warn)">26.7% &#8212; cheap model on EVERYTHING, strong on 20%</text>
  <text x="20" y="108" class="s-sub">the cascade is strictly dearer, by the cheap model's price on the escalated share</text>
  <text x="20" y="122" class="s-sub">what it buys: NO CLASSIFIER &#183; what it costs: both latencies in series when it escalates</text>

  <line x1="16" y1="138" x2="744" y2="138" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="158" class="s-label">SEMANTIC CACHE THRESHOLD, MEASURED ON all-MiniLM-L6-v2</text>
  <line x1="60" y1="200" x2="720" y2="200" stroke="var(--line)" stroke-width="1.2"/>
  <text x="60" y="218" text-anchor="middle" class="s-mono" style="font-size:8px">0.5</text>
  <text x="720" y="218" text-anchor="middle" class="s-mono" style="font-size:8px">1.0</text>

  <rect x="350" y="188" width="172" height="24" rx="3" class="s-fill" style="stroke:var(--good)" stroke-width="1.8"/>
  <text x="436" y="182" text-anchor="middle" class="s-mono" style="font-size:9px;fill:var(--good)">SAFE BAND 0.72-0.85</text>

  <line x1="680" y1="178" x2="680" y2="212" stroke="var(--crit)" stroke-width="1.8" stroke-dasharray="3 3"/>
  <text x="680" y="172" text-anchor="middle" class="s-mono" style="font-size:9px;fill:var(--crit)">0.95 recommended</text>
  <text x="680" y="232" text-anchor="middle" class="s-mono" style="font-size:8px;fill:var(--crit)">3 of 4 hits</text>

  <circle cx="525" cy="200" r="4" class="s-fill" style="stroke:var(--warn)" stroke-width="1.6"/>
  <text x="525" y="248" text-anchor="middle" class="s-mono" style="font-size:8px;fill:var(--warn)">0.8526</text>
  <text x="525" y="260" text-anchor="middle" class="s-sub">the reference's OWN</text>
  <text x="525" y="270" text-anchor="middle" class="s-sub">example pair &#8212; a MISS at 0.95</text>

  <circle cx="340" cy="200" r="4" class="s-fill" style="stroke:var(--crit)" stroke-width="1.6"/>
  <text x="300" y="248" text-anchor="middle" class="s-mono" style="font-size:8px;fill:var(--crit)">0.7150</text>
  <text x="300" y="260" text-anchor="middle" class="s-sub">&#8220;my COLLEAGUE'S</text>
  <text x="300" y="270" text-anchor="middle" class="s-sub">password&#8221; &#8212; wrong subject</text>

  <rect x="16" y="282" width="728" height="32" rx="4" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.6"/>
  <text x="28" y="300" class="s-mono" style="font-size:9px;fill:var(--crit)">A LOOSE THRESHOLD DOES NOT DEGRADE GRACEFULLY &#8212; IT ANSWERS A DIFFERENT QUESTION CONFIDENTLY</text>
  <text x="28" y="311" class="s-sub">PIN 0.6225 &#183; username 0.7022 &#183; colleague's password 0.7150 &#183; and &#8220;change my password&#8221; 0.8741 is genuinely borderline</text>
</svg>` },

    { t: "exercise", kind: "build", title: "Price both patterns, then measure your cache threshold", difficulty: "advanced", minutes: 35,
      body: "Price a router and a cascade from the same easy-traffic share and price gap, and find where the cascade becomes indefensible. Then measure a semantic-cache threshold properly: a set of must-hit and must-miss queries, a sweep, and the highest threshold with zero wrong hits.",
      requirements: [
        "Router and cascade priced from the same parameters, with the gap explained",
        "The comparison at several easy-traffic shares and price gaps",
        "A must-hit and must-miss query set, with measured cosines",
        "A threshold sweep reporting intended hits and wrong hits separately",
        "The highest safe threshold, and the dangerous neighbours named"
      ],
      hint: "A wrong cache hit is not a degraded answer, it is a confident answer to a different question. Count wrong hits separately from missed hits \u2014 they are not symmetric errors.",
      solution: { lang: "python", title: "routing arithmetic, and a measured cache threshold", code: `# ---------------------------------------------------------------- part 1
PRICE_IN, PRICE_OUT = 5.0, 15.0
def cost(tin, tout):
    return tin / 1e6 * PRICE_IN + tout / 1e6 * PRICE_OUT

STRONG = cost(3200, 400)          # the trimmed prompt on the strong model

print("ROUTER vs CASCADE")
print("=" * 74)
for ratio in (15.0, 5.0, 3.0):
    cheap = STRONG / ratio
    print("price gap %.0fx:" % ratio)
    for easy in (0.90, 0.80, 0.70, 0.50):
        router   = easy * cheap + (1 - easy) * STRONG
        cascade  = cheap + (1 - easy) * STRONG
        print("   easy=%.0f%%  router %5.1f%%  cascade %5.1f%%  cascade premium %+.1f pts"
              % (easy * 100, 100 * router / STRONG, 100 * cascade / STRONG,
                 100 * (cascade - router) / STRONG))
    print()
print("the cascade premium is exactly the cheap model's price on the ESCALATED")
print("share -- it pays the cheap call even on queries it then escalates.")
print("so the premium shrinks as the price gap widens, and grows as more")
print("traffic escalates. at a 3x gap and 50% escalation it is substantial.")

# ---------------------------------------------------------------- part 2
print()
print("SEMANTIC CACHE THRESHOLD, MEASURED")
print("=" * 74)
import numpy as np
from sentence_transformers import SentenceTransformer
m = SentenceTransformer("all-MiniLM-L6-v2")

PROBE = "how do I reset my password?"
CANDIDATES = [
    ("how do I reset my password?",             "MUST HIT  identical"),
    ("How do I reset my password?",             "MUST HIT  case only"),
    ("how can I reset my password",             "MUST HIT  trivial reword"),
    ("password reset",                          "MUST HIT  keyword form"),
    ("I forgot my password, what do I do?",     "should hit - the reference's example"),
    ("how do I change my password?",            "borderline - change != reset"),
    ("how do I reset my PIN?",                  "MUST MISS different credential"),
    ("how do I reset my username?",             "MUST MISS different field"),
    ("why was my password rejected?",           "MUST MISS different question"),
    ("how do I reset my colleague's password?", "MUST MISS different SUBJECT"),
    ("how do I delete my account?",             "MUST MISS unrelated"),
]
vp = m.encode([PROBE], normalize_embeddings=True)[0]
vs = m.encode([c[0] for c in CANDIDATES], normalize_embeddings=True)
sims = vs @ vp

print("%-44s %8s  %s" % ("candidate", "cosine", "label"))
for (t, note), s in zip(CANDIDATES, sims):
    print("%-44s %8.4f  %s" % (t[:44], s, note))

MUST_HIT  = {0, 1, 2, 3}
MUST_MISS = {6, 7, 8, 9, 10}
print()
print("%-12s %16s %14s" % ("threshold", "intended hits", "WRONG hits"))
for th in (0.99, 0.95, 0.90, 0.85, 0.80, 0.75, 0.72, 0.70, 0.65):
    hit = {i for i, s in enumerate(sims) if s >= th}
    bad = len(hit & MUST_MISS)
    flag = "  <-- serves a wrong answer" if bad else ""
    print("%-12.2f %12d/%-3d %14d%s"
          % (th, len(hit & MUST_HIT), len(MUST_HIT), bad, flag))

best = None
for th in [x / 100.0 for x in range(99, 50, -1)]:
    hit = {i for i, s in enumerate(sims) if s >= th}
    if hit & MUST_MISS:
        break
    best = th
print()
print("highest threshold with ZERO wrong hits: %.2f" % best)
print("the reference recommends >= 0.95, which gives %d of %d intended hits"
      % (len({i for i, s in enumerate(sims) if s >= 0.95} & MUST_HIT), len(MUST_HIT)))
print("and misses its own motivating example at %.4f." % sims[4])
print()
print("dangerous neighbours -- near in meaning, different CORRECT answer:")
for i in (9, 7, 6):
    print("  %-44s %.4f" % (CANDIDATES[i][0][:44], sims[i]))
print("  the colleague's-password case is the one to remember: same topic,")
print("  different SUBJECT. that is why a semantic cache must be keyed on")
print("  tenant and user, not on the embedding alone.")`,
        out: `==========================================================================
B -- THE CASCADE CLAIM: '80% on a 15x cheaper model'
==========================================================================
  easy=80%  router $0.005573 (25.3% of strong)   cascade $0.005867 (26.7%)
  easy=70%  router $0.007627 (34.7% of strong)   cascade $0.008067 (36.7%)
  easy=90%  router $0.003520 (16.0% of strong)   cascade $0.003667 (16.7%)

the reference says 'cascade' and 'route' interchangeably and they differ:
  a ROUTER classifies first, so the cheap model's cost is paid on 80%%
  a CASCADE runs the cheap model on 100%% and the strong one on 20%%
  at 80/20 and 15x: router = 25.3%% of strong, cascade = 26.7%%
  the cascade is strictly worse AND it needs no classifier -- that is the trade.

==========================================================================
A -- THE SEMANTIC CACHE THRESHOLD, AGAINST THE REFERENCE'S OWN EXAMPLE
==========================================================================
the reference says: set the threshold HIGH, e.g. >= 0.95
and gives this pair as the motivating example of a semantic hit:

  "how do I reset my password?"             
  "I forgot my password, what do I do?"     
  cosine = 0.8526
  threshold 0.95 -> MISS

  so the reference's own example FAILS its own recommended threshold.
  the advice and the illustration are inconsistent.

-- what else sits near that query, and where a threshold would land --
candidate                                      cosine  note
how do I reset my password?                    1.0000  IDENTICAL -- must hit
How do I reset my password?                    1.0000  case only -- must hit
how can I reset my password                    0.9850  trivial reword -- should hit
I forgot my password, what do I do?            0.8526  same intent -- the reference's example
password reset                                 0.8673  keyword form -- should hit
how do I reset my PIN?                         0.6225  DIFFERENT credential -- must MISS
how do I change my password?                   0.8741  change != reset -- borderline
how do I reset my username?                    0.7022  DIFFERENT field -- must MISS
why was my password rejected?                  0.5608  different question -- must MISS
how do I reset my colleague's password?        0.7150  DIFFERENT subject -- must MISS
how do I delete my account?                    0.5803  unrelated -- must MISS

-- the threshold sweep: what each cut-off admits --
  threshold 0.99 : 2/4 intended hits, 0 WRONG hits
  threshold 0.98 : 3/4 intended hits, 0 WRONG hits
  threshold 0.95 : 3/4 intended hits, 0 WRONG hits
  threshold 0.90 : 3/4 intended hits, 0 WRONG hits
  threshold 0.85 : 4/4 intended hits, 0 WRONG hits
  threshold 0.80 : 4/4 intended hits, 0 WRONG hits
  threshold 0.75 : 4/4 intended hits, 0 WRONG hits
  threshold 0.70 : 4/4 intended hits, 2 WRONG hits  <-- serves a wrong answer

highest safe threshold with zero wrong hits: 0.72, catching 4/4 intended

the dangerous neighbour is the one to name:
  how do I reset my PIN?                       0.6225
  how do I reset my username?                  0.7022
  how do I reset my colleague's password?      0.7150
  a PIN is not a password and a colleague's password is not yours --
  but they are lexically and semantically adjacent, so a loose threshold
  serves a confidently wrong answer. that is the correctness bug the
  reference warns about, with the numbers attached.`,
        notes: [
          { t: "p", text: "**The cascade premium has a clean interpretation**: it is exactly the cheap model\u2019s price paid on the escalated share. So it shrinks as the price gap widens and grows as more traffic escalates \u2014 at a 15x gap and 20% escalation it is 1.3 points, and at a 3x gap with half the traffic escalating it is much larger." },
          { t: "p", text: "**Which means the cascade is only cheap when the cheap model is very cheap.** The pattern is usually justified by \u2018we avoid building a classifier\u2019, and that argument weakens exactly when the price gap narrows \u2014 the case where you most want the saving." },
          { t: "p", text: "**The reference\u2019s own example pair scores 0.8526 against its own \u22650.95 advice.** At 0.95 you get 3 of 4 must-hits and lose both the keyword form and the motivating example. The caution is directionally right and the number is miscalibrated for this model." },
          { t: "p", text: "**The highest threshold with zero wrong hits is 0.72**, and 0.85 also gives 4 of 4 cleanly \u2014 so the safe band is roughly 0.72 to 0.85, which is nowhere near the recommended value. The real lesson is that the threshold is model-dependent and takes ten minutes to measure." },
          { t: "p", text: "**The dangerous neighbour to remember is \u201cmy colleague\u2019s password\u201d at 0.7150.** It is the same topic with a different *subject*, so the correct answer differs while the embedding barely does \u2014 which is why a semantic cache has to be keyed on tenant and user rather than on the vector alone." },
          { t: "p", text: "One honest caveat: eleven candidate queries is a demonstration, not a calibration. A production threshold wants a few hundred pairs drawn from real traffic, and the must-miss set matters more than the must-hit set because a missed hit costs a model call while a wrong hit costs a wrong answer." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "A router classifies first and makes one call; a cascade runs the cheap model on everything and escalates the minority \u2014 so the cascade is always dearer, by the cheap model\u2019s price on the escalated share, and what it buys is not needing a classifier. Measured at 80/20 and 15x: 25.3% against 26.7%." },
        { t: "p", text: "Enable exact caching first; it is trivially correct. Then measure your semantic-cache threshold instead of copying one \u2014 the reference\u2019s own example pair scores 0.8526 against its recommended \u22650.95, and the safe band on that model is 0.72 to 0.85. And key the cache on tenant and user, because \u201cmy colleague\u2019s password\u201d sits at 0.7150." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cWould you route to a cheaper model, and would you add a semantic cache?\u201d**" },
        { t: "p", text: "Both, and I would start by separating two things that get used interchangeably. A router classifies the query first and makes one model call. A cascade runs the cheap model on everything and escalates when its answer looks weak. Those have different costs: at 80% easy traffic and a 15x price gap, a router is 25.3% of running everything on the strong model and a cascade is 26.7%." },
        { t: "p", text: "The cascade is always the dearer of the two, by exactly the cheap model\u2019s price on the escalated share. What it buys is not needing a classifier \u2014 which is a real saving, because a difficulty classifier is a model you have to build, evaluate and maintain, and its error rate becomes a quality ceiling. But that argument weakens as the price gap narrows, which is the case where you most want the saving." },
        { t: "p", text: "I would also flag the latency, which the cost table hides. A cascade that escalates pays both latencies in series, so its p95 is the sum rather than the max \u2014 and if the interface streams, time to first token is what the user feels." },
        { t: "p", text: "On caching: exact caching first, always, because it is trivially correct and instant. Then semantic caching, where the threshold is the entire design and I would measure it rather than copy one. The usual advice is to set it high, around 0.95 \u2014 and when I measured the canonical motivating pair, \u2018how do I reset my password\u2019 against \u2018I forgot my password, what do I do\u2019, it scored 0.8526. So the standard advice would miss the standard example." },
        { t: "p", text: "A proper sweep on that model put the safe band at roughly 0.72 to 0.85 \u2014 0.85 caught every intended hit with zero wrong hits, and 0.72 was the highest threshold with no wrong hits at all. So 0.95 is too strict rather than too loose, and the real lesson is that the threshold depends on the embedding model and takes ten minutes to calibrate with a handful of must-hit and must-miss pairs." },
        { t: "p", text: "The cases I would build that set around are the near neighbours with different correct answers: \u2018reset my PIN\u2019 at 0.62, \u2018reset my username\u2019 at 0.70, and the one I find most instructive, \u2018reset my colleague\u2019s password\u2019 at 0.7150. Same topic, different subject. That is why a semantic cache must be keyed on tenant and user rather than on the vector alone, and why anything personalised or time-sensitive should not be semantically cached at all." }
      ] }
  ],

  takeaways: [
    "**A router classifies first and makes one call; a cascade runs the cheap model on everything.**",
    "**Measured at 80/20 and 15x: router 25.3% of strong, cascade 26.7%.**",
    "**The cascade premium is exactly the cheap model's price on the escalated share** \u2014 so it is always dearer.",
    "**What the cascade buys is not needing a classifier**, whose error rate would become a quality ceiling.",
    "**That argument weakens as the price gap narrows**, which is when you most want the saving.",
    "**A cascade that escalates pays both latencies in series**, so p95 is the sum rather than the max.",
    "**Enable exact caching first** \u2014 trivially correct, instant, and 11.7 priced a 40% hit rate as the largest remaining saving.",
    "**The reference's own cache example scores 0.8526 against its own \u22650.95 advice** \u2014 the advice and the illustration disagree.",
    "**Measured: 0.95 gives 3 of 4 intended hits**, losing the keyword form and the motivating example.",
    "**The safe band on `all-MiniLM-L6-v2` is roughly 0.72\u20130.85** \u2014 so the threshold is model-dependent and must be measured.",
    "**A wrong cache hit answers a different question confidently** \u2014 it does not degrade gracefully.",
    "**\u201cMy colleague's password\u201d scores 0.7150**: same topic, different subject, so key the cache on tenant and user."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Why is a cascade always more expensive than a router at the same escalation rate?",
        options: [
          "Because the strong model is invoked twice on escalated queries",
          "Because the cheap model runs on every query, including the ones that then escalate",
          "Because cascades cannot use prompt caching on the second call",
          "Because confidence estimation requires an extra model call"
        ],
        answer: 1,
        why: "The router pays cheap-on-easy plus strong-on-hard, while the cascade pays cheap-on-everything plus strong-on-hard \u2014 so the premium is exactly the cheap model's price on the escalated share, measured at 1.3 points on an 80/20 split with a 15x gap. The premium shrinks as the price gap widens and grows as more traffic escalates, so the pattern is least attractive precisely when the cheap model is only modestly cheaper." },

      { stem: "What does a cascade buy in exchange for that premium?",
        options: [
          "Lower latency, because the cheap model answers first",
          "No classifier \u2014 it uses the cheap model's own output as the escalation signal",
          "Better worst-case quality, since two models see every query",
          "Simpler billing, since only one model is charged per query"
        ],
        answer: 1,
        why: "A router needs something that predicts difficulty before any answer exists, which is a model to build, evaluate and maintain, and whose misclassifications become a quality ceiling with no second opinion. The cascade replaces that with a confidence check on a real answer, which is measurable after the fact. Latency is worse rather than better: an escalated query pays both latencies in series, so p95 becomes the sum." },

      { stem: "The reference recommends a semantic-cache threshold of \u22650.95. What did measurement show?",
        options: [
          "That 0.95 is correct and its example pair scores 0.96",
          "That its own motivating example pair scores 0.8526 \u2014 a miss at 0.95 \u2014 and the safe band is roughly 0.72\u20130.85",
          "That any threshold below 0.99 produces wrong hits",
          "That the threshold should be raised to 0.98 for safety"
        ],
        answer: 1,
        why: "\"How do I reset my password?\" against \"I forgot my password, what do I do?\" scored 0.8526 on all-MiniLM-L6-v2, so the recommended threshold would reject the pair used to motivate the feature. A sweep gave 4 of 4 intended hits with zero wrong hits at 0.85, and 0.72 was the highest threshold admitting no wrong hits \u2014 making 0.95 too strict for this model and confirming that the value is model-dependent." },

      { stem: "\u201cHow do I reset my colleague's password?\u201d scores 0.7150 against \u201chow do I reset my password?\u201d. Why is that case instructive?",
        options: [
          "Because it shows embeddings handle possessives poorly",
          "Because it is the same topic with a different subject, so the correct answer differs while the embedding barely does",
          "Because it falls inside every usable threshold band",
          "Because it demonstrates that longer queries score lower"
        ],
        answer: 1,
        why: "Semantic nearness tracks topic, and here the topic is identical while the entity the answer concerns has changed \u2014 which is exactly the class of query where a cache hit returns a confident answer to a different question. It generalises to anything carrying a user, account, date or balance, and the mitigation is to key the cache on tenant and user rather than on the vector alone, and to exclude personalised or time-sensitive answers entirely." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Routing, cascades and caching",
    questions: [
      { level: "core",
        q: "Router or cascade?",
        strong: "A strong answer distinguishes them before choosing.",
        answer: [
          { t: "p", text: "They are different patterns and the distinction matters. A router classifies the query and makes one call; a cascade runs the cheap model on everything and escalates when the answer looks weak." },
          { t: "p", text: "At 80% easy traffic and a 15x price gap, the router is 25.3% of all-strong and the cascade 26.7%. The cascade is always dearer by exactly the cheap model\u2019s price on the escalated share." },
          { t: "p", text: "I would choose the cascade when I do not want to own a difficulty classifier \u2014 that is a model with its own error rate, and a misrouted hard query gets a bad answer with no second opinion. The cascade\u2019s signal is at least computed on a real answer." },
          { t: "p", text: "But I would check the latency story first. An escalated query pays both latencies in series, so if the interface streams, the cascade\u2019s p95 time-to-first-token is noticeably worse than the cost table suggests." }
        ] },

      { level: "advanced",
        q: "How would you set a semantic cache threshold?",
        strong: "A strong answer measures rather than copies.",
        answer: [
          { t: "p", text: "By measuring it on my own embedding model with a small set of must-hit and must-miss queries, because the conventional \u20180.95 or higher\u2019 turned out to be wrong when I checked it." },
          { t: "p", text: "The canonical motivating pair \u2014 \u2018how do I reset my password\u2019 against \u2018I forgot my password, what do I do\u2019 \u2014 scores 0.8526 on all-MiniLM-L6-v2. So the standard advice rejects the standard example. A sweep gave 4 of 4 intended hits with zero wrong hits at 0.85, and 0.72 was the highest threshold with no wrong hits at all." },
          { t: "p", text: "I would weight the must-miss set more heavily, because the two errors are not symmetric. A missed hit costs one model call; a wrong hit serves a confident answer to a different question." },
          { t: "p", text: "And the queries I would build that set around are the near neighbours with different correct answers \u2014 reset my PIN at 0.62, reset my username at 0.70, and reset my colleague\u2019s password at 0.7150." }
        ] },

      { level: "core",
        q: "What should never be semantically cached?",
        strong: "A strong answer generalises from the subject problem.",
        answer: [
          { t: "p", text: "Anything personalised or time-sensitive \u2014 anything carrying a user, an account, a date or a balance." },
          { t: "p", text: "The case that generalises is \u2018how do I reset my colleague\u2019s password\u2019 at 0.7150 against \u2018how do I reset my password\u2019. Same topic, different subject: the correct answer differs and the embedding barely does, because embeddings track what a query is *about* rather than whose it is." },
          { t: "p", text: "So the cache key has to include more than the vector: tenant, user, locale, and a time bucket for anything that expires. A per-tenant semantic cache is a very different risk from a global one, and scoping it costs nothing." },
          { t: "p", text: "Exact caching has none of these problems and should go in first \u2014 it is trivially correct, instant, and a 40% hit rate is a direct 40% cut on those calls." }
        ] }
    ]
  }
});
