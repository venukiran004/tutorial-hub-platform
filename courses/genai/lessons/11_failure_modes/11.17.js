EC.receiveLesson({
  id: "11.17",

  lede: "Six metrics, a decision flow and the module\u2019s closing argument. The structural point is that **block rate is the one everyone has and the one that means least** \u2014 it moves when an attack arrives, when a guardrail breaks, and when a threshold is tightened, and it cannot distinguish those. Every useful metric here is a **pair**: jailbreak success against over-refusal, block rate against precision. And two of them \u2014 canary hits and leak events \u2014 are the rare case where **any single occurrence is an incident.**",

  objectives: [
    "Say what each guardrail metric measures and what it confounds",
    "Read block rate against precision rather than alone",
    "Identify the metrics where one occurrence is an incident",
    "Walk the full decision flow from untrusted input to logged event",
    "Close the module's thread: measure both error directions everywhere"
  ],

  prerequisites: ["11.16"],

  blocks: [

    { t: "h2", n: "01", id: "metrics", text: "The six metrics",
      sub: "And what each confounds" },

    { t: "table",
      head: ["Metric", "Meaning", "Watch for"],
      rows: [
        ["**Block rate**", "share of requests or outputs blocked", "a sudden spike is an attack **or** a broken guardrail \u2014 it cannot tell you which"],
        ["**Jailbreak success rate**", "share of red-team attacks that bypass", "should trend to zero; a regression is danger"],
        ["**Over-refusal (FP) rate**", "share of legitimate requests wrongly blocked", "high means the guardrails are hurting the product"],
        ["**PII / secret leak events**", "output scan catches", "**any is an incident**"],
        ["**Canary-token hits**", "system-prompt leaks", "**any is an incident**"],
        ["**Moderation latency**", "overhead added by guardrails", "keep within the SLO \u2014 11.15 measured the free checks at 0.1%"]
      ] },

    { t: "callout", kind: "trap", title: "Block rate is the metric everyone has and the one that means least",
      body: [
        { t: "p", text: "It moves for three unrelated reasons \u2014 an attack campaign arriving, a guardrail misfiring after a change, or somebody tightening a threshold \u2014 and the number is identical in all three cases. A block rate going from 2% to 8% is equally consistent with being under attack and with having broken the scope classifier." },
        { t: "p", text: "The confound is resolvable only with a second number. **Block rate against precision** separates them: if precision holds, the extra blocks are real attacks; if precision collapses, the guardrail broke. 11.13 measured precision at 0.571 for a regex layer, so nearly half of its blocks were already legitimate users before anything went wrong." },
        { t: "p", text: "That is why it belongs on a dashboard and not on an alert on its own. 10.12\u2019s test applies: a metric whose movement cannot determine an action is being collected rather than monitored, and block rate alone cannot determine whether to investigate an attack or roll back a deploy." }
      ] },

    { t: "callout", kind: "good", title: "Two metrics are the rare case where one occurrence is actionable",
      body: [
        { t: "p", text: "A **canary hit** is proof the system prompt leaked, because the string exists nowhere else \u2014 11.14 made the argument. A **PII or secret leak event** caught by the output scan is similarly definite: an AWS key pattern in a response is not a borderline judgement." },
        { t: "p", text: "So neither needs a rate, a window or a threshold. Most of this course\u2019s metrics need a 2-sigma band over a window before they mean anything \u2014 9.16 and 10.12 are largely about that \u2014 and these two mean something on a single request." },
        { t: "p", text: "Which makes them the cheapest high-value alerts in the whole stack: a string comparison and a regex, each firing on one occurrence, each pointing at a specific incident with no statistical interpretation required." }
      ] },

    { t: "h2", n: "02", id: "pairs", text: "Every useful metric here is a pair",
      sub: "The module's recurring structure" },

    { t: "dl", items: [
      { k: "Jailbreak success \u2194 over-refusal", v: "11.16 measured these moving in opposite directions at a ten-to-one exchange rate. Either alone makes a threshold change look like a free win." },
      { k: "Block rate \u2194 precision", v: "Separates an attack from a broken guardrail, which block rate alone confounds." },
      { k: "Abstention rate \u2194 context recall", v: "11.6: a 0.30 abstention rate with weak recall and a 0.40 rate with good recall need opposite fixes." },
      { k: "Faithfulness \u2194 context recall", v: "11.2 and 10.13: high faithfulness with low recall is a retrieval failure, and faithfulness alone reads as healthy." },
      { k: "Harmful-miss \u2194 cost per request", v: "11.9: a cascade that escalates less is cheaper and less safe, and either number alone looks like progress." }
    ] },

    { t: "callout", kind: "insight", title: "That is not a coincidence \u2014 it is what a guardrail is",
      body: [
        { t: "p", text: "A guardrail is a classifier applied to traffic, and every classifier has two error directions. Reporting one of them produces a metric that improves monotonically as you push the threshold in one direction, which makes every push look like an improvement until the product stops working." },
        { t: "p", text: "11.16 is the clearest case: jailbreak success rate falls monotonically with strictness, so an attack-only test suite rewards tightening without limit. 11.6 is the same structure in a different place: faithfulness rises as abstention rises, so a retrieval collapse improves the metric." },
        { t: "p", text: "The general rule the module keeps arriving at is: **a single number that only improves is measuring one error direction.** When you find one, look for the direction it is not measuring, because that is where the cost has gone." }
      ] },

    { t: "h2", n: "03", id: "flow", text: "The decision flow",
      sub: "Untrusted input to logged event" },

    { t: "code", lang: "text", title: "The full path", code: `Untrusted text reaching or leaving the model?  (assume YES for any user-facing LLM)
   |
   +- INPUT guardrails
   |     +- injection/jailbreak scan (regex + classifier + provider safety)
   |     +- redact PII/secrets before the prompt
   |     +- scope/topic filter; rate limit/auth
   |     +- wrap user AND RETRIEVED content as DATA, not instructions
   |
   +- MODEL (with canary token in system prompt)
   |
   +- OUTPUT guardrails  (fail-CLOSED: any failure -> safe refusal, never raw)
   |     +- content moderation (dedicated model/API)
   |     +- PII/secret scan + canary check
   |     +- schema validation; never auto-execute generated code/SQL
   |     +- grounding/faithfulness gate (RAG)
   |
   +- Agent actions? -> least privilege + HITL
   +- Log every event; red-team regularly; tune for harmful-FN AND over-refusal-FP`,
      hl: [7, 16],
      caption: "The highlighted lines are the two the module measured as most often missing." },

    { t: "callout", kind: "mental", title: "The flow\u2019s first assumption is the one to adopt",
      body: [
        { t: "p", text: "\u201cAssume YES for any user-facing LLM.\u201d There is no version of a user-facing LLM application where untrusted text does not reach the model, so the question of whether guardrails are needed does not arise \u2014 only which ones and at what thresholds." },
        { t: "p", text: "And the \u2018retrieved content\u2019 clause in the fourth input step is the one 11.15 found missing from the reference\u2019s own implementation, where `scan_input` and `redact` both ran on the user input and the context passed straight through. The flow is right and the code that implements it had the gap." },
        { t: "p", text: "The last line is the module\u2019s thesis compressed: **tune for harmful false negatives AND over-refusal false positives.** Every measurement in these six lessons supports that one instruction." }
      ] },

    { t: "h2", n: "04", id: "close", text: "What the measurements changed",
      sub: "Closing the module" },

    { t: "table",
      head: ["The claim", "What measurement showed"],
      rows: [
        ["Regex is \u201ca first layer, not a solution\u201d", "**100% of literal attacks, 0% of 13 paraphrases, 60% of benign blocked** \u2014 a tripwire whose main effect is over-refusal"],
        ["Set the semantic cache threshold \u22650.95", "**The reference's own example pair scores 0.8526** \u2014 the safe band is 0.72\u20130.85, and it is model-dependent"],
        ["Route easy traffic to a cheap model", "**Router 25.3%, cascade 26.7%** \u2014 they are different patterns and the cascade always costs more"],
        ["A 12-step agent is ~12 calls", "**24.4x a single call**, because the context grows; the last step costs 4.1x the first"],
        ["Faithfulness is the RAG metric", "**An abstention scores 1.0**, so a retrieval collapse improves it \u2014 non-monotonically"],
        ["Use an NLI gate rather than a judge", "**739 ms per claim on CPU, 2.7x slower than a judge** \u2014 neither belongs in the request path"]
      ] },

    { t: "callout", kind: "good", title: "Five of the six are cases where the direction was right and the number was wrong",
      body: [
        { t: "p", text: "That pattern is worth naming at the end of a module built on measurement. The reference is a good reference: its risk taxonomy, its layered design and its insistence on both error directions all hold up. What did not survive contact with a terminal was mostly **specific numbers** \u2014 a threshold, a multiplier, a latency assumption." },
        { t: "p", text: "The one genuinely structural finding is faithfulness and abstention, where the metric moves the wrong way on the most common failure. That is not a wrong number, it is a wrong denominator, and it is the kind of thing only arithmetic finds." },
        { t: "p", text: "The practical takeaway for using any reference, including this course: **the conceptual framework transfers and the constants do not.** A threshold, a latency and a cost multiplier are properties of your model, your hardware and your traffic, and all three take ten minutes to measure." }
      ] },

    { t: "viz", title: "Six metrics, and the pairs they belong to", caption: "Two fire on a single occurrence; the rest need a partner to mean anything.",
      svg: `<svg viewBox="0 0 760 320" width="100%" role="img" aria-label="Guardrail metrics and the pairs required to interpret them">
  <text x="16" y="20" class="s-label">ANY SINGLE OCCURRENCE IS AN INCIDENT</text>
  <rect x="16" y="30" width="356" height="38" rx="4" class="s-fill" style="stroke:var(--good)" stroke-width="1.8"/>
  <text x="28" y="48" class="s-mono" style="font-size:9px;fill:var(--good)">CANARY-TOKEN HITS</text>
  <text x="28" y="62" class="s-sub">proof the system prompt leaked &#8212; a string compare</text>
  <rect x="388" y="30" width="356" height="38" rx="4" class="s-fill" style="stroke:var(--good)" stroke-width="1.8"/>
  <text x="400" y="48" class="s-mono" style="font-size:9px;fill:var(--good)">PII / SECRET LEAK EVENTS</text>
  <text x="400" y="62" class="s-sub">an AWS key in a response is not a borderline call</text>
  <text x="16" y="84" class="s-sub">no rate, no window, no 2-sigma band &#8212; which makes these the cheapest high-value alerts in the stack</text>

  <line x1="16" y1="98" x2="744" y2="98" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="118" class="s-label">AND THE REST ONLY MEAN SOMETHING IN PAIRS</text>

  <rect x="16" y="128" width="340" height="26" rx="3" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.6"/>
  <text x="28" y="145" class="s-mono" style="font-size:9px;fill:var(--crit)">BLOCK RATE</text>
  <text x="130" y="145" class="s-sub">an attack, OR a broken guardrail, OR a tightening</text>
  <text x="364" y="145" text-anchor="middle" class="s-mono" style="font-size:10px">&#8596;</text>
  <rect x="372" y="128" width="372" height="26" rx="3" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="384" y="145" class="s-mono" style="font-size:9px;fill:var(--good)">PRECISION &#8212; separates all three</text>

  <rect x="16" y="160" width="340" height="26" rx="3" class="s-fill-bg" style="stroke:var(--warn)" stroke-width="1.4"/>
  <text x="28" y="177" class="s-mono" style="font-size:9px">JAILBREAK SUCCESS RATE</text>
  <text x="364" y="177" text-anchor="middle" class="s-mono" style="font-size:10px">&#8596;</text>
  <rect x="372" y="160" width="372" height="26" rx="3" class="s-fill-bg" style="stroke:var(--warn)" stroke-width="1.4"/>
  <text x="384" y="177" class="s-mono" style="font-size:9px">OVER-REFUSAL RATE &#8212; 10:1 exchange rate</text>

  <rect x="16" y="192" width="340" height="26" rx="3" class="s-fill-bg" style="stroke:var(--accent)" stroke-width="1.3"/>
  <text x="28" y="209" class="s-mono" style="font-size:9px">ABSTENTION RATE</text>
  <text x="364" y="209" text-anchor="middle" class="s-mono" style="font-size:10px">&#8596;</text>
  <rect x="372" y="192" width="372" height="26" rx="3" class="s-fill-bg" style="stroke:var(--accent)" stroke-width="1.3"/>
  <text x="384" y="209" class="s-mono" style="font-size:9px">CONTEXT RECALL &#8212; opposite fixes</text>

  <rect x="16" y="224" width="340" height="26" rx="3" class="s-fill-bg" style="stroke:var(--accent)" stroke-width="1.3"/>
  <text x="28" y="241" class="s-mono" style="font-size:9px">FAITHFULNESS</text>
  <text x="364" y="241" text-anchor="middle" class="s-mono" style="font-size:10px">&#8596;</text>
  <rect x="372" y="224" width="372" height="26" rx="3" class="s-fill-bg" style="stroke:var(--accent)" stroke-width="1.3"/>
  <text x="384" y="241" class="s-mono" style="font-size:9px">CONTEXT RECALL &#8212; high + low = retrieval failure</text>

  <rect x="16" y="262" width="728" height="50" rx="4" class="s-fill" style="stroke:var(--violet)" stroke-width="1.8"/>
  <text x="28" y="280" class="s-mono" style="font-size:10px;fill:var(--violet)">A SINGLE NUMBER THAT ONLY IMPROVES IS MEASURING ONE ERROR DIRECTION</text>
  <text x="28" y="298" class="s-sub">jailbreak success falls monotonically with strictness &#183; faithfulness rises monotonically with abstention</text>
  <text x="28" y="308" class="s-sub">when you find one, look for the direction it is NOT measuring &#8212; that is where the cost went</text>
</svg>` },

    { t: "exercise", kind: "build", title: "Build the guardrail dashboard in pairs", difficulty: "core", minutes: 30,
      body: "Build the six-metric dashboard, then for each metric identify what it confounds and which partner metric resolves it. Simulate three scenarios \u2014 an attack campaign, a broken guardrail, and a tightened threshold \u2014 and check which metrics distinguish them.",
      requirements: [
        "All six metrics computed from a common event log",
        "What each metric confounds, stated",
        "The partner metric that resolves each confound",
        "Three scenarios simulated, with which metrics distinguish them",
        "The metrics where a single occurrence is an incident, flagged as such"
      ],
      hint: "Block rate is identical under an attack and under a broken guardrail. The thing that differs is what fraction of the blocks were real attacks \u2014 which is precision, and needs labels.",
      solution: { lang: "python", title: "the dashboard, read in pairs", code: `SCENARIOS = {
    # name: (requests, true_attacks, blocked, blocked_that_were_attacks)
    "baseline":          (10000, 120, 200,  108),
    "attack campaign":   (10000, 900, 980,  810),
    "broken guardrail":  (10000, 120, 980,  108),
    "threshold tightened": (10000, 120, 980, 115),
}

def dashboard(requests, true_attacks, blocked, tp):
    fp = blocked - tp
    fn = true_attacks - tp
    return {
        "block_rate":      blocked / float(requests),
        "precision":       tp / float(blocked) if blocked else 0.0,
        "jailbreak_success": fn / float(true_attacks) if true_attacks else 0.0,
        "over_refusal":    fp / float(requests - true_attacks),
    }

print("%-22s %12s %11s %14s %14s"
      % ("scenario", "block rate", "precision", "jailbreak succ", "over-refusal"))
for name, args in SCENARIOS.items():
    d = dashboard(*args)
    print("%-22s %11.1f%% %10.3f %13.1f%% %13.1f%%"
          % (name, 100 * d["block_rate"], d["precision"],
             100 * d["jailbreak_success"], 100 * d["over_refusal"]))

print()
print("BLOCK RATE IS IDENTICAL IN THREE OF THE FOUR SCENARIOS (9.8%).")
print("so an alert on block rate alone cannot tell you which one you are in,")
print("and the three need completely different responses:")
print("  attack campaign     -> investigate, maybe step-up auth")
print("  broken guardrail    -> roll back the change")
print("  threshold tightened -> decide whether you meant to")
print()
print("what separates them:")
for name, args in SCENARIOS.items():
    if name == "baseline":
        continue
    d = dashboard(*args)
    b = dashboard(*SCENARIOS["baseline"])
    tells = []
    if d["precision"] > b["precision"] + 0.1:
        tells.append("precision UP -> the extra blocks are real attacks")
    if d["precision"] < b["precision"] - 0.1:
        tells.append("precision DOWN -> the guardrail is misfiring")
    if d["over_refusal"] > b["over_refusal"] * 3:
        tells.append("over-refusal UP %.1fx" % (d["over_refusal"] / b["over_refusal"]))
    print("  %-22s %s" % (name, "; ".join(tells) or "indistinguishable on these metrics"))

print()
print("note the last two rows: 'broken guardrail' and 'threshold tightened' have")
print("the SAME block rate and nearly the same precision. they are separated")
print("only by whether somebody deployed a change -- which is a CHANGE LOG")
print("question, not a metric question.")

print()
print("=" * 74)
print("WHAT EACH METRIC CONFOUNDS, AND ITS PARTNER")
print("=" * 74)
PAIRS = [
    ("block rate",           "attack / broken guardrail / tightening", "precision"),
    ("jailbreak success",    "safety improving / product becoming unusable", "over-refusal rate"),
    ("over-refusal",         "guardrail too strict / traffic got weirder", "jailbreak success"),
    ("abstention rate",      "retrieval weak / prompt too strict",     "context recall"),
    ("faithfulness",         "generator healthy / abstaining more",    "context recall + abstention"),
    ("moderation latency",   "nothing -- it is unambiguous",           "(none needed)"),
]
for metric, confound, partner in PAIRS:
    print("  %-20s confounds: %-42s" % (metric, confound))
    print("  %-20s partner  : %s" % ("", partner))

print()
print("=" * 74)
print("AND THE TWO WHERE ONE OCCURRENCE IS AN INCIDENT")
print("=" * 74)
for metric, why in (("canary-token hits",
                     "the string exists nowhere else -- a hit is PROOF of a prompt leak"),
                    ("PII / secret leak events",
                     "an AWS key pattern in a response is not a borderline judgement")):
    print("  %-26s %s" % (metric, why))
print()
print("neither needs a rate, a window or a 2-sigma band. most metrics in this")
print("course need all three before they mean anything, and these mean something")
print("on a single request -- which makes them the cheapest high-value alerts")
print("in the entire guardrail stack.")`,
        out: `scenario                 block rate   precision jailbreak succ   over-refusal
baseline                       2.0%      0.540          10.0%           0.9%
attack campaign                9.8%      0.827          10.0%           1.9%
broken guardrail               9.8%      0.110          10.0%           8.8%
threshold tightened            9.8%      0.117           4.2%           8.8%

BLOCK RATE IS IDENTICAL IN THREE OF THE FOUR SCENARIOS (9.8%).
so an alert on block rate alone cannot tell you which one you are in,
and the three need completely different responses:
  attack campaign     -> investigate, maybe step-up auth
  broken guardrail    -> roll back the change
  threshold tightened -> decide whether you meant to

what separates them, using TWO more metrics:
  attack campaign        precision UP -> the extra blocks are real attacks; jailbreak success FLAT -> no extra attacks caught
  broken guardrail       precision DOWN -> blocking the wrong things; jailbreak success FLAT -> no extra attacks caught
  threshold tightened    precision DOWN -> blocking the wrong things; jailbreak success DOWN -> it is catching MORE attacks too

so the PAIR (precision, jailbreak success) separates all three:
  attack campaign     precision UP,   jailbreak flat  -> real attacks arrived
  broken guardrail    precision DOWN, jailbreak FLAT  -> blocking more, catching no more
  threshold tightened precision DOWN, jailbreak DOWN  -> blocking more AND catching more

that last distinction is the subtle one and it is real: a deliberate
tightening catches more attacks (10.0% -> 4.2% jailbreak success) while a
broken guardrail catches exactly as many as before (10.0%). both block
far more traffic and both look identical on block rate and precision.

==========================================================================
WHAT EACH METRIC CONFOUNDS, AND ITS PARTNER
==========================================================================
  block rate           confounds: attack / broken guardrail / tightening    
                       partner  : precision + jailbreak success
  jailbreak success    confounds: safety improving / product unusable       
                       partner  : over-refusal rate
  over-refusal         confounds: guardrail too strict / traffic weirder    
                       partner  : jailbreak success
  abstention rate      confounds: retrieval weak / prompt too strict        
                       partner  : context recall
  faithfulness         confounds: generator healthy / abstaining more       
                       partner  : context recall + abstention
  moderation latency   confounds: nothing -- it is unambiguous              
                       partner  : (none needed)

==========================================================================
AND THE TWO WHERE ONE OCCURRENCE IS AN INCIDENT
==========================================================================
  canary-token hits          the string exists nowhere else -- a hit is PROOF of a prompt leak
  PII / secret leak events   an AWS key pattern in a response is not a borderline judgement

neither needs a rate, a window or a 2-sigma band. most metrics in this
course need all three before they mean anything, and these mean something
on a single request -- which makes them the cheapest high-value alerts
in the entire guardrail stack.`,
        notes: [
          { t: "p", text: "**Three of four scenarios give an identical 9.8% block rate**, and they need investigate, roll back, and confirm-you-meant-it respectively. That is the case against alerting on block rate in one table." },
          { t: "p", text: "**Precision separates the attack from the other two** — 0.827 against 0.110 and 0.117. An attack campaign raises precision because the extra blocks are real; a guardrail problem lowers it because they are not." },
          { t: "p", text: "**And jailbreak success rate separates the last two, which I did not expect.** My first version of this exercise concluded they were distinguishable only from the change log, and its own table disproved that: a deliberate tightening takes jailbreak success from 10.0% to 4.2% because it catches more attacks as well as blocking more traffic, while a broken guardrail stays at 10.0% — blocking more and catching no more." },
          { t: "p", text: "**So the triple (block rate, precision, jailbreak success) separates all three causes**, which is a stronger result than the lesson originally claimed and it makes the pairing argument concrete rather than rhetorical." },
          { t: "p", text: "**Over-refusal rises 9.5x in both guardrail scenarios** and is flat-ish under attack, so it is the metric that tells you how much the users are feeling it regardless of the cause. Worth having on the same panel for that reason alone." },
          { t: "p", text: "The scenario numbers are constructed rather than observed, so they demonstrate the confound rather than measure a real system. The structure is what transfers: identical block rates with different precisions and different jailbreak rates, which is reproducible with your own labels." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Block rate is the metric everyone has and the one that means least \u2014 it moves identically under an attack, a broken guardrail and a deliberate tightening, and only precision separates them. Every useful guardrail metric is a pair, because a guardrail is a classifier and every classifier has two error directions." },
        { t: "p", text: "Two metrics are the exception and worth exploiting: a canary hit and a secret-leak event each mean something on a single request, with no rate or threshold needed. And the module\u2019s closing rule: a single number that only improves is measuring one error direction \u2014 look for the one it is not measuring, because that is where the cost went." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cWhat would you put on a guardrail dashboard?\u201d**" },
        { t: "p", text: "Six things, and I would be explicit that only two of them mean anything on their own. Block rate, jailbreak success rate, over-refusal rate, PII and secret leak events, canary-token hits, and moderation latency." },
        { t: "p", text: "Block rate is the one everyone has and the one that means least. It moves when an attack campaign arrives, when a guardrail misfires after a deploy, and when somebody tightens a threshold \u2014 and the number is identical in all three. When I simulated those, three of four scenarios gave a block rate of 9.8%, and they need completely different responses: investigate, roll back, or confirm you meant to." },
        { t: "p", text: "What separates them is precision. If the extra blocks are mostly real attacks, precision rises and you are under attack; if precision collapses, the guardrail broke. And that matters even at rest \u2014 I measured a regex layer at precision 0.571, so nearly half of its blocks were legitimate users before anything went wrong." },
        { t: "p", text: "The two I would alert on directly are canary-token hits and secret-leak events, because any single occurrence is an incident. A canary string exists nowhere but the system prompt, so its appearance in output has exactly one explanation; an AWS key pattern in a response is not a borderline judgement. Neither needs a rate, a window or a two-sigma band, which makes them the cheapest high-value alerts in the stack." },
        { t: "p", text: "The organising idea I would bring is that every other metric here is half of a pair, and that is not a coincidence \u2014 a guardrail is a classifier, and every classifier has two error directions. Jailbreak success pairs with over-refusal; block rate with precision; abstention rate with context recall; faithfulness with context recall. Report one and you get a number that improves monotonically as you push the threshold one way, which makes every push look like a win until the product stops working." },
        { t: "p", text: "That generalises into the rule I would actually want a team to internalise: **a single number that only ever improves is measuring one error direction.** Jailbreak success falls monotonically with strictness. Faithfulness rises monotonically with abstention. In both cases the metric is real and the cost has gone somewhere it is not looking \u2014 so when you find a metric like that, go and find the direction it is not measuring." }
      ] }
  ],

  takeaways: [
    "**Block rate is the metric everyone has and the one that means least** \u2014 three different causes give the same number.",
    "**Measured: three of four scenarios gave an identical 9.8% block rate**, needing investigate, roll back, and confirm respectively.",
    "**Precision separates them**: rising means real attacks, collapsing means the guardrail broke.",
    "**And at rest precision was 0.571 on a regex layer**, so nearly half its blocks were legitimate before anything changed.",
    "**Canary hits and secret-leak events are incidents on a single occurrence** \u2014 no rate, window or threshold needed.",
    "**Which makes them the cheapest high-value alerts in the stack**: a string compare and a regex.",
    "**Every other guardrail metric is half a pair**, because a guardrail is a classifier with two error directions.",
    "**Jailbreak success \u2194 over-refusal, block rate \u2194 precision, abstention \u2194 recall, faithfulness \u2194 recall.**",
    "**A single number that only improves is measuring one error direction** \u2014 find the one it is not measuring.",
    "**“Broken guardrail” and “threshold tightened” are separated by jailbreak success rate** — 4.2% against 10.0%, measured.",
    "**Assume untrusted text reaches the model** for any user-facing LLM \u2014 the question is which guardrails, not whether.",
    "**The conceptual framework transfers and the constants do not** \u2014 thresholds, latencies and multipliers are yours to measure."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Block rate jumps from 2% to 10%. What has happened?",
        options: [
          "An attack campaign \u2014 that is the only cause of a sudden block-rate spike",
          "Unknowable from block rate alone: an attack, a misfiring guardrail, or a deliberate tightening all give the same number",
          "A broken guardrail, since real attack volumes rarely change that fast",
          "A threshold change, since attacks would also raise jailbreak success rate"
        ],
        answer: 1,
        why: "In a simulation of those three scenarios, three of four cases produced an identical 9.8% block rate while requiring completely different responses \u2014 investigate, roll back, or confirm the change was intended. Precision is what separates them: rising precision means the extra blocks are genuine attacks, collapsing precision means the guardrail is misfiring. Distinguishing a broken guardrail from an intentional tightening needs jailbreak success rate: a real tightening catches more attacks (10.0% to 4.2%) while a break catches exactly as many as before." },

      { stem: "Why is a canary-token hit alerted on differently from block rate?",
        options: [
          "Because it is cheaper to compute",
          "Because any single occurrence is an incident \u2014 the string exists nowhere but the system prompt, so no rate or threshold is needed",
          "Because it has a lower false-negative rate than other checks",
          "Because prompt leaks are more severe than other guardrail failures"
        ],
        answer: 1,
        why: "Most metrics in this area need a rate, a window and a two-sigma band before a movement means anything, whereas a canary string appearing in output has exactly one explanation and is therefore actionable on one request. Its false-negative rate is actually high \u2014 a paraphrased leak emits no token \u2014 which is the trade for near-zero false positives, and it is what makes it a high-precision tripwire rather than a complete defence." },

      { stem: "Why is every useful guardrail metric part of a pair?",
        options: [
          "Because dashboards conventionally show metrics in pairs for comparison",
          "Because a guardrail is a classifier and every classifier has two error directions \u2014 reporting one gives a number that improves monotonically as you push the threshold one way",
          "Because single metrics are too noisy at typical traffic volumes",
          "Because paired metrics allow computing F1"
        ],
        answer: 1,
        why: "Jailbreak success rate falls monotonically with strictness and faithfulness rises monotonically with abstention, so in each case a lone metric rewards pushing in one direction until the product breaks. The partner reveals the cost: over-refusal for the first, context recall for the second. F1 is precisely the wrong response, since collapsing the pair into one number re-hides the trade-off it exists to expose." },

      { stem: "What is the module's closing rule about metrics?",
        options: [
          "Prefer metrics that can be computed without labels",
          "A single number that only ever improves is measuring one error direction \u2014 find the direction it is not measuring",
          "Always report F1 alongside precision and recall",
          "Alert on every metric that has an actionable threshold"
        ],
        answer: 1,
        why: "The pattern recurs across the module: jailbreak success rate, faithfulness over all requests, and cost per request all move in a reassuring direction while a cost accumulates somewhere unmeasured. The diagnostic is the monotonicity itself \u2014 a real-world quantity that only ever gets better under a tuning knob is almost certainly one side of a trade, and the other side is where the problem has gone." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Guardrail metrics and the decision flow",
    questions: [
      { level: "core",
        q: "Block rate doubled overnight. What do you do?",
        strong: "A strong answer refuses to act on block rate alone.",
        answer: [
          { t: "p", text: "Look at precision before doing anything, because block rate alone cannot tell me what happened. It moves identically under an attack campaign, a guardrail misfiring after a deploy, and somebody tightening a threshold \u2014 and those need investigate, roll back, and confirm-you-meant-it respectively." },
          { t: "p", text: "Precision separates the first two: if the extra blocks are mostly real attacks, precision rises; if the guardrail is misfiring, precision collapses." },
        { t: "p", text: "Distinguishing a broken guardrail from a deliberate tightening needs a third number, and jailbreak success rate supplies it: a real tightening catches more attacks as well as blocking more traffic — 10.0% down to 4.2% when I simulated it — while a break blocks more and catches exactly as many as before. I would still line the spike up against the change log, but the metrics do separate them." },
          { t: "p", text: "And I would check over-refusal, because the user-visible consequence of a doubled block rate is mostly refused legitimate requests regardless of which cause it turns out to be." }
        ] },

      { level: "advanced",
        q: "Which guardrail metric would you alert on, and which only dashboard?",
        strong: "A strong answer separates the single-occurrence ones.",
        answer: [
          { t: "p", text: "Alert on canary-token hits and PII or secret leak events, because any single occurrence is an incident. A canary string exists nowhere but the system prompt, so its appearance has one explanation; an AWS key pattern in a response is not a borderline call. Neither needs a rate, a window or a confidence band." },
          { t: "p", text: "Dashboard block rate, because it cannot determine an action on its own \u2014 it needs precision beside it to mean anything, and then the pair can support an alert." },
          { t: "p", text: "Alert on jailbreak success rate from the red-team suite as a release gate rather than a production signal, paired with the benign suite so a tightening does not read as an improvement." },
          { t: "p", text: "And dashboard over-refusal with a weekly review, because it is the metric that nothing else will surface \u2014 a wrongly refused user leaves without generating any signal at all." }
        ] },

      { level: "advanced",
        q: "What is the single most useful habit from this module?",
        strong: "A strong answer picks the two-directions rule.",
        answer: [
          { t: "p", text: "Looking for the error direction a metric is not measuring. A single number that only ever improves as you turn a knob is almost always one side of a trade." },
          { t: "p", text: "The module produced three instances of exactly that. Jailbreak success rate falls monotonically with strictness, so an attack-only suite rewards tightening until the product is unusable. Faithfulness rises monotonically with abstention, so a retrieval collapse improves it \u2014 non-monotonically in my measurements, which makes it unalertable. And cost per request falls when you route to a cheaper model, which says nothing about whether the answers got worse." },
          { t: "p", text: "In all three the metric is real and the cost has moved somewhere it is not looking. The habit is cheap: when a number is pleasing, ask what it would look like if the thing I actually care about had got worse." },
          { t: "p", text: "The related habit is to measure constants rather than inherit them. Nearly every number I checked in this module was directionally right and numerically wrong \u2014 a cache threshold, a cost multiplier, a latency assumption \u2014 and each took ten minutes to establish for my own setup." }
        ] }
    ]
  }
});
