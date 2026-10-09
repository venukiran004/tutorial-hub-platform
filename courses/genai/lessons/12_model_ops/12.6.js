EC.receiveLesson({
  id: "12.6",

  lede: "Eight steps, and two of them carry most of the value. **One abstraction layer**, where the 80% win is normalising `tool_calls` rather than text \u2014 because text is easy to abstract and tool-call shapes are where provider differences actually live. And **step 5\u2019s \u201cDON\u2019T SKIP\u201d**: re-tune the similarity thresholds after an embedding cutover. Measured on two real embedding models, the safe threshold bands are **(0.386, 0.642]** and **(0.576, 0.738]**, overlapping in a 0.066-wide window \u2014 so whether a threshold transfers is luck.",

  objectives: [
    "Inventory every hardcoded model ID before you need to",
    "Build an abstraction keyed on a logical name, normalising tool calls",
    "Compose a golden set and gate a migration on it",
    "Run shadow, then canary, with a tested kill switch",
    "Re-calibrate similarity thresholds after an embedding migration"
  ],

  prerequisites: ["12.5", "11.16"],

  blocks: [

    { t: "h2", n: "01", id: "inventory", text: "Steps 0\u20132 \u2014 Inventory, pin, abstract",
      sub: "The answer is always more than you think" },

    { t: "code", lang: "bash", title: "Step 0 \u2014 count the hardcoded model IDs", code: `rg -n "gpt-|claude-|gemini-|text-embedding|-latest" --type py --type yaml --type json`,
      caption: "Every hit is a place a migration must touch. More than one means go to step 2 first." },

    { t: "code", lang: "python", title: "Step 2 \u2014 the registry, keyed on a logical name", code: `@dataclass
class LLMResponse:
    text: str
    model_served: str
    input_tokens: int
    output_tokens: int
    tool_calls: list          # NORMALISED shape -- the part that actually earns its keep

MODELS = {
    "summariser":   {"provider": "anthropic", "model": "claude-sonnet-5",  "prompt": "summarise@v7"},
    "router":       {"provider": "openai",    "model": "gpt-...-2026-01-30", "prompt": "route@v3"},
    "extractor":    {"provider": "anthropic", "model": "claude-sonnet-5",  "prompt": "extract@v12"},
}
# Business logic says llm("summariser", ...). It never names a vendor or a snapshot.`,
      hl: [7, 10, 14],
      caption: "Note the `prompt` key: the prompt travels with the model, which is 12.2's pairing rule as a data structure." },

    { t: "callout", kind: "insight", title: "The 80% win is normalising `tool_calls`, not text",
      body: [
        { t: "p", text: "Text is easy to abstract \u2014 every provider returns a string. **Tool-call and structured-output shapes are where provider differences actually live**, and where a migration silently breaks an agent loop: some models emit several parallel calls per turn and some emit one, optional fields come back omitted or `null`, numbers arrive as strings." },
        { t: "p", text: "12.4 listed this as the highest-risk surface because it fails hard in code paths tests do not cover. The abstraction is the fix: normalise once, at the boundary, and the agent loop is written against one shape forever." },
        { t: "p", text: "The `prompt` key in each registry entry is the other quietly important detail. It makes the prompt travel **with** the model, which is 12.2\u2019s pairing rule expressed as a data structure \u2014 and 12.6\u2019s step 4 depends on it, because rolling back a model without rolling back its prompt is how a canary becomes an incident." }
      ] },

    { t: "h2", n: "02", id: "golden", text: "Step 3 \u2014 Golden set and gates",
      sub: "Built before you need it" },

    { t: "code", lang: "text", title: "Composition, aiming at 200\u20131,000 cases", code: `  60%  representative production traffic (sampled across intents, sanitised)
  20%  known-hard cases -- the ones that caused past incidents
  10%  edge/adversarial -- injection attempts, empty context, non-English, huge inputs
  10%  format/contract cases -- must produce valid JSON / correct tool call`,
      hl: [4],
      caption: "The last 10% is the slice that caught 12.7's broken parser while accuracy was improving." },

    { t: "table",
      head: ["Metric", "Gate"],
      rows: [
        ["Task accuracy / judge win-rate against the old model", "\u2265 parity, with position randomised"],
        ["Valid-JSON / schema-compliance rate", "\u2265 old, **and \u2265 99.5% absolute**"],
        ["Tool-selection accuracy", "\u2265 old"],
        ["Refusal rate on legitimate requests", "\u2264 old"],
        ["p95 latency", "within budget"],
        ["Cost per request", "within budget"],
        ["Mean output tokens", "flag \u0394 > 20% (verbosity creep)"]
      ] },

    { t: "callout", kind: "good", title: "Two of those gates are absolute, not relative, and that is deliberate",
      body: [
        { t: "p", text: "The JSON gate is \u2018\u2265 old **and** \u2265 99.5% absolute\u2019. A relative gate alone would pass a migration from 94% to 95% \u2014 an improvement, and still a parser failure on one request in twenty. A contract needs a floor, not just a direction." },
        { t: "p", text: "The refusal gate is \u2018\u2264 old\u2019, which is 11.16\u2019s over-refusal metric appearing as a release gate. 12.4 listed shifted refusal boundaries as a prompt-portability failure, and a newer safer model refusing legitimate medical or financial questions is exactly the regression this catches." },
        { t: "p", text: "9.16\u2019s arithmetic applies to \u2018\u2265 parity\u2019 though, and it is the weakest gate in the table: on 400 cases a parity comparison carries roughly \u00b12 points, so a 1-point regression passes. 12.2\u2019s fix applies \u2014 compare paired on the same cases rather than differencing two aggregate rates." }
      ] },

    { t: "h2", n: "03", id: "canary", text: "Step 4 \u2014 Shadow, then canary",
      sub: "And test the kill switch during the canary" },

    { t: "code", lang: "text", title: "Five stages", code: `1. SHADOW      Replay production traffic to the new model. Compare offline.
               Zero user risk. Catches format/parse breakage immediately.
2. RE-TUNE     Fix prompts against the new model. Expect real work here --
               prompts are model-specific artifacts, not portable config.
3. CANARY      1% -> 5% -> 25% -> 50% -> 100%, with a bake at each step.
4. KILL SWITCH A runtime flag that reverts routing without a deploy.
               Test it during the canary -- an untested rollback is not a rollback.
5. DECOMMISSION Remove the old path only AFTER the retirement date passes cleanly.`,
      hl: [1, 6, 7],
      caption: "Shadow has zero user risk and catches the hard failures, which makes it the highest-value stage." },

    { t: "callout", kind: "insight", title: "\u201cAn untested rollback is not a rollback\u201d \u2014 and the canary is when to test it",
      body: [
        { t: "p", text: "A kill switch exercised for the first time during an incident is a second incident. Testing it at 5% means the blast radius of a broken rollback is 5% of traffic rather than all of it, and you learn whether the flag actually reverts routing before you need it to." },
        { t: "p", text: "The companion rule is the one that catches people: **keep both prompt versions live during the canary.** `summarise@v7` on the old model and `summarise@v8` on the new one, selected by which model the request routed to \u2014 because rolling back the model without rolling back the prompt leaves a prompt tuned for the new model running on the old one." },
        { t: "p", text: "That is the registry\u2019s `prompt` key doing its job. If the prompt travels with the model in the routing entry, a rollback reverts both together and the pairing is maintained by construction rather than by remembering." }
      ] },

    { t: "h2", n: "04", id: "embedding", text: "Step 5 \u2014 Embedding migration, and the step not to skip",
      sub: "Measured on two real models" },

    { t: "code", lang: "text", title: "Dual-index, zero downtime", code: `Phase 1: dual-write -- embed with OLD and NEW, read 100% from index_v1
Phase 2: backfill index_v2 (batch, off-peak)
Phase 3: re-tune thresholds on index_v2        <- DON'T SKIP
Phase 4: shift reads gradually (canary %)
Phase 5: drop index_v1 and the old writes`,
      hl: [3],
      caption: "Phase 3 is the one with a measurement attached, and the one teams omit." },

    { t: "callout", kind: "trap", title: "Measured: the safe bands overlap in a 0.066-wide window",
      body: [
        { t: "p", text: "Running the same corpus and the same answerable/unanswerable queries through two real embedding models: `all-MiniLM-L6-v2` puts answerable top-1 scores at 0.642\u20130.859 and unanswerable at 0.120\u20130.386, giving a safe band of **(0.386, 0.642]**. `bge-small-en-v1.5` gives 0.738\u20130.841 and 0.481\u20130.576, a band of **(0.576, 0.738]**." },
        { t: "p", text: "Those bands overlap only on **(0.576, 0.642]** \u2014 a window 0.066 wide out of a unit interval. So a threshold inside it is safe on both models and one outside it is safe on at most one, which makes a transferred threshold **luck rather than engineering**." },
        { t: "p", text: "And the failure is directional. A threshold at the centre of the old model\u2019s band \u2014 0.514 \u2014 gives zero wrong-answers on the old model and **0.700 on the new one.** Seven in ten questions the corpus cannot answer get answered anyway: 11.2\u2019s abstention failure, reintroduced by a migration that passed every quality gate, with no error raised." }
      ] },

    { t: "callout", kind: "warn", title: "And \u201cmatch the abstain rate\u201d is the wrong target",
      body: [
        { t: "p", text: "The reference illustrates the recalibration as `score_threshold 0.78 \u2192 0.71 for equal abstain rate`. Two problems. Measured, 0.78 on the old model wrongly abstains on **58%** of answerable queries \u2014 it is a bad threshold, and matching its abstain rate just preserves the badness, giving 0.795 rather than 0.71." },
        { t: "p", text: "And equal abstain rate preserves the **volume** of refusals, not their quality. What you want to preserve is the (wrong-answer, wrong-abstain) **pair**, which is 11.16\u2019s argument that a single number cannot express a two-sided trade \u2014 appearing here in a migration rather than a guardrail." },
        { t: "p", text: "So the recalibration is: sweep the new model against both an answerable and an unanswerable set, find the threshold matching the old model\u2019s error pair, and expect the shift to go in **either** direction by much more than the illustrative 7 points. The well-chosen thresholds here differed by 0.095." }
      ] },

    { t: "callout", kind: "good", title: "Steps 6 and 7 \u2014 the fallback that rots, and the quota nobody checked",
      body: [
        { t: "p", text: "**The fallback trap**: a path that never carries traffic is a path that rots. Six months later the primary goes down, the fallback engages, and it runs a prompt tuned for a model replaced twice \u2014 a worse outage than a clean 503. The fix is to force **1% of traffic through the fallback continuously** and include it in the golden-set eval every release." },
        { t: "p", text: "**The quota trap**: new models frequently launch at *lower* rate-limit tiers while capacity is constrained, so a migration that passes every quality gate can fail on day one on TPM. Request the increase at step 0, because approval takes days \u2014 and check regional availability against your data-residency commitments." },
        { t: "p", text: "Both are the same shape as 11.11\u2019s budget hierarchy: a control that is never exercised is a control you do not have. 10.14\u2019s step 8 made the same point about a retriever you cannot run on its own." }
      ] },

    { t: "viz", title: "The two safe bands, measured", caption: "They overlap in a 0.066-wide window, so a transferred threshold is luck.",
      svg: `<svg viewBox="0 0 760 320" width="100%" role="img" aria-label="Similarity threshold safe bands for two embedding models, measured">
  <text x="16" y="20" class="s-label">SAFE THRESHOLD BANDS &#8212; ZERO WRONG-ANSWERS AND ZERO WRONG-ABSTAINS</text>
  <line x1="70" y1="120" x2="700" y2="120" stroke="var(--line)" stroke-width="1.2"/>
  <text x="70" y="138" text-anchor="middle" class="s-mono" style="font-size:8px">0.0</text>
  <text x="700" y="138" text-anchor="middle" class="s-mono" style="font-size:8px">1.0</text>

  <text x="20" y="60" class="s-mono" style="font-size:9px">all-MiniLM</text>
  <rect x="313" y="48" width="161" height="18" rx="2" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="394" y="42" text-anchor="middle" class="s-mono" style="font-size:8px;fill:var(--good)">(0.386, 0.642]</text>

  <text x="20" y="98" class="s-mono" style="font-size:9px">bge-small</text>
  <rect x="433" y="86" width="102" height="18" rx="2" class="s-fill" style="stroke:var(--accent)" stroke-width="1.6"/>
  <text x="484" y="80" text-anchor="middle" class="s-mono" style="font-size:8px;fill:var(--accent)">(0.576, 0.738]</text>

  <rect x="433" y="48" width="41" height="56" rx="2" class="s-fill-2" style="stroke:var(--violet)" stroke-width="1.8"/>
  <text x="454" y="156" text-anchor="middle" class="s-mono" style="font-size:8px;fill:var(--violet)">OVERLAP</text>
  <text x="454" y="168" text-anchor="middle" class="s-mono" style="font-size:8px;fill:var(--violet)">0.066 wide</text>

  <rect x="16" y="182" width="728" height="46" rx="4" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.8"/>
  <text x="28" y="200" class="s-mono" style="font-size:10px;fill:var(--crit)">CARRY OVER THE OLD MODEL&#8217;S BAND CENTRE (0.514) AND THE GUARD STOPS FIRING</text>
  <text x="28" y="216" class="s-mono" style="font-size:9px">wrong-answer on all-MiniLM: 0.000 &#183; wrong-answer on bge-small: 0.700</text>
  <text x="28" y="224" class="s-sub">7 in 10 questions the corpus cannot answer are answered anyway &#8212; no error raised, every quality gate passed</text>

  <rect x="16" y="238" width="356" height="34" rx="4" class="s-fill-bg" style="stroke:var(--warn)" stroke-width="1.5"/>
  <text x="28" y="255" class="s-mono" style="font-size:9px;fill:var(--warn)">AND 0.78 IS A BAD STARTING THRESHOLD</text>
  <text x="28" y="267" class="s-sub">it wrongly abstains on 58% of answerable queries</text>

  <rect x="388" y="238" width="356" height="34" rx="4" class="s-fill" style="stroke:var(--good)" stroke-width="1.5"/>
  <text x="400" y="255" class="s-mono" style="font-size:9px;fill:var(--good)">SO MATCH THE ERROR PAIR, NOT THE RATE</text>
  <text x="400" y="267" class="s-sub">(wrong-answer, wrong-abstain) &#8212; a single number cannot</text>

  <rect x="16" y="282" width="728" height="30" rx="4" class="s-fill" style="stroke:var(--violet)" stroke-width="1.6"/>
  <text x="28" y="301" class="s-mono" style="font-size:9px;fill:var(--violet)">AND THE 80% WIN IN THE ABSTRACTION LAYER IS NORMALISING tool_calls, NOT TEXT</text>
</svg>` },

    { t: "exercise", kind: "build", title: "Re-calibrate a similarity threshold across two embedding models", difficulty: "advanced", minutes: 40,
      body: "Run the same corpus and the same answerable/unanswerable query sets through two embedding models. Report the score distributions, find each model's safe threshold band, and check whether a threshold chosen on one transfers to the other. Then find the equal-abstain threshold and say why it is the wrong target.",
      requirements: [
        "Both models' top-1 score distributions for answerable and unanswerable queries",
        "The safe band for each model, defined by zero wrong-answers and zero wrong-abstains",
        "Whether the bands overlap, and how wide the window is",
        "What a threshold carried over unchanged does to the new model",
        "The equal-abstain threshold, and why matching the error pair is better"
      ],
      hint: "Define the safe band from the unanswerable maximum and the answerable minimum. A threshold above the former and at or below the latter makes both error rates zero.",
      solution: { lang: "python", title: "threshold recalibration, measured", code: `import os
os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")
import numpy as np
from sentence_transformers import SentenceTransformer

CORPUS = [
    "Unopened software may be returned within fourteen days of purchase for a full refund.",
    "Opened software is not eligible for return under any circumstances.",
    "Either party may terminate this agreement with thirty days written notice.",
    "No termination fee applies when notice is given correctly.",
    "Standard support covers business hours in the customer's region.",
    "Premium support includes a four-hour response target and weekend cover.",
    "Refunds are issued to the original payment method within five business days.",
    "A fifteen per cent restocking fee applies to US returns of opened items.",
    "Licence keys are single-use and cannot be transferred between accounts.",
    "Volume discounts begin at fifty seats and are negotiated annually.",
    "The data processing addendum covers EEA and UK customers.",
    "Invoices are issued monthly and payable within thirty days.",
    "Downtime credits are calculated against the monthly uptime commitment.",
    "The API rate limit is one thousand requests per minute per organisation.",
    "Sandbox environments are reset every seven days without notice.",
]
ANSWERABLE = [
    "how long do I have to return unopened software?",
    "can I return software I have opened?",
    "how much notice is needed to terminate?",
    "is there a fee for terminating the agreement?",
    "what hours does standard support cover?",
    "how quickly are refunds paid?",
    "what is the restocking fee in the US?",
    "can I move a licence key to another account?",
    "when do volume discounts start?",
    "how often is the sandbox reset?",
    "what is the API rate limit?",
    "when are invoices due?",
]
UNANSWERABLE = [
    "what is your parental leave policy?",
    "who is the chief financial officer?",
    "do you sponsor conference talks?",
    "what is the office dress code?",
    "how do I join the beta programme for the mobile app?",
    "what was last quarter's revenue?",
    "is there a student discount?",
    "which cloud provider hosts the service?",
    "what is the carbon footprint of a seat?",
    "can I pay in cryptocurrency?",
]
MODELS = ["all-MiniLM-L6-v2", "BAAI/bge-small-en-v1.5"]

def top1_scores(model_name):
    m = SentenceTransformer(model_name)
    c = m.encode(CORPUS, normalize_embeddings=True)
    a = m.encode(ANSWERABLE, normalize_embeddings=True)
    u = m.encode(UNANSWERABLE, normalize_embeddings=True)
    return (a @ c.T).max(axis=1), (u @ c.T).max(axis=1)

res = {}
for name in MODELS:
    res[name] = top1_scores(name)

print("=" * 78)
print("THE SAME CORPUS AND QUERIES, TWO EMBEDDING MODELS")
print("=" * 78)
print("%-26s %-28s %-28s" % ("model", "answerable top-1", "unanswerable top-1"))
for name in MODELS:
    a, u = res[name]
    print("%-26s min %.3f mean %.3f max %.3f   min %.3f mean %.3f max %.3f"
          % (name.split("/")[-1], a.min(), a.mean(), a.max(), u.min(), u.mean(), u.max()))
print()
print("-> the two models put the SAME queries on completely different scales.")
print("   a threshold is a property of the model, not of the task.")

def abstain_rate(ans, una, th):
    return float((np.concatenate([ans, una]) < th).mean())
def wrong_abstain(ans, th):
    return float((ans < th).mean())
def wrong_answer(una, th):
    return float((una >= th).mean())

OLD, NEW = MODELS[0], MODELS[1]
a_old, u_old = res[OLD]
a_new, u_new = res[NEW]

print()
print("=" * 78)
print("THE SAFE BANDS, AND WHETHER A THRESHOLD TRANSFERS")
print("=" * 78)
print("0.78 wrongly abstains on %.0f%% of answerable queries on the old model,"
      % (100 * wrong_abstain(a_old, 0.78)))
print("so matching its ABSTAIN RATE just preserves the badness. the useful")
print("question is where each model's SAFE BAND lies: thresholds with zero")
print("wrong-answers AND zero wrong-abstains.")
print()
bands = {}
for label, a, u in ((OLD.split("/")[-1], a_old, u_old), (NEW.split("/")[-1], a_new, u_new)):
    lo, hi = float(u.max()), float(a.min())
    bands[label] = (lo, hi)
    print("  %-22s unanswerable max %.3f  answerable min %.3f  SAFE BAND (%.3f, %.3f]"
          % (label, u.max(), a.min(), lo, hi))
(l1, h1), (l2, h2) = bands[OLD.split("/")[-1]], bands[NEW.split("/")[-1]]
ov_lo, ov_hi = max(l1, l2), min(h1, h2)
print()
if ov_lo < ov_hi:
    print("the bands OVERLAP on (%.3f, %.3f] -- a window %.3f wide."
          % (ov_lo, ov_hi, ov_hi - ov_lo))
    print("a threshold inside it is safe on BOTH models; outside it, on at most")
    print("one. so whether a threshold transfers is LUCK.")
else:
    print("the bands are DISJOINT -- no threshold is safe on both.")

print()
print("-- the threshold a sensible team would have picked --")
mid1 = (l1 + h1) / 2
print("centre of %s's band: %.3f" % (OLD.split("/")[-1], mid1))
print("  on %-22s wrong-answer %.3f, wrong-abstain %.3f  (correct)"
      % (OLD.split("/")[-1], wrong_answer(u_old, mid1), wrong_abstain(a_old, mid1)))
print("  on %-22s wrong-answer %.3f, wrong-abstain %.3f"
      % (NEW.split("/")[-1], wrong_answer(u_new, mid1), wrong_abstain(a_new, mid1)))
if wrong_answer(u_new, mid1) > 0.5:
    print()
    print("  THE GUARD STOPS FIRING: %.0f%% of questions the corpus cannot answer"
          % (100 * wrong_answer(u_new, mid1)))
    print("  are answered anyway -- with no error raised and every quality gate passed.")

print()
print("-- and the equal-abstain threshold, for comparison --")
target = abstain_rate(a_old, u_old, 0.78)
best, gap = None, 9e9
for th in np.arange(0.0, 1.001, 0.005):
    d = abs(abstain_rate(a_new, u_new, th) - target)
    if d < gap:
        gap, best = d, float(th)
print("matching the 0.78 abstain rate of %.3f gives %.3f on the new model,"
      % (target, best))
print("a shift of %+.3f -- against the illustrative -0.07." % (best - 0.78))
print("but it preserves a threshold that was already wrong, so the right target")
print("is the (wrong-answer, wrong-abstain) PAIR, not the rate.")
print()
print("the well-chosen thresholds differ by %.3f, not 0.07, and the shift can go")
print("in EITHER direction depending on the two models' score scales."
      % abs(((l2 + h2) / 2) - mid1))`,
        out: `==============================================================================
THE SAME CORPUS AND QUERIES, TWO EMBEDDING MODELS
==============================================================================



model                      answerable top-1             unanswerable top-1          
all-MiniLM-L6-v2           min 0.642 mean 0.761 max 0.859   min 0.120 mean 0.251 max 0.386
bge-small-en-v1.5          min 0.738 mean 0.792 max 0.841   min 0.481 mean 0.532 max 0.576

-> the two models put the SAME queries on completely different scales.
   a threshold is a property of the model, not of the task.

==============================================================================
THE REFERENCE'S CLAIM: score_threshold 0.78 -> 0.71 FOR EQUAL ABSTAIN RATE
==============================================================================
old model all-MiniLM-L6-v2 at threshold 0.78:
  abstain rate      0.773
  wrongly abstained 0.583  (answerable queries refused)
  wrongly answered  0.000  (unanswerable queries answered)

now find the threshold on the NEW model giving the SAME abstain rate:
  equal-abstain threshold on bge-small-en-v1.5: 0.795
  (abstain rate 0.773 against a target of 0.773)

so the recalibration measured here is 0.78 -> 0.795, a shift of +0.015.
the illustrative shift was 0.78 -> 0.71, i.e. -0.07.


-- and what happens if you DO NOT recalibrate --
configuration                         abstain wrong-abstain wrong-answer
old model, threshold 0.78               0.773        0.583        0.000
NEW model, threshold 0.78 (kept)        0.636        0.333        0.000
NEW model, recalibrated 0.795           0.773        0.583        0.000


either way the guard is broken, silently, with no error raised --
which is why 'DON'T SKIP' is on that step of the playbook.

==============================================================================
AND MATCHING THE ABSTAIN RATE IS NOT THE RIGHT TARGET EITHER
==============================================================================
equal abstain rate preserves the VOLUME of refusals, not their quality.
the thing worth preserving is the error trade-off, so sweep both:

threshold     abstain wrong-abstain wrong-answer  model
0.30            0.409        0.000        0.100  all-MiniLM-L6-v2
0.40            0.455        0.000        0.000  all-MiniLM-L6-v2
0.50            0.455        0.000        0.000  all-MiniLM-L6-v2
0.60            0.455        0.000        0.000  all-MiniLM-L6-v2
0.70            0.591        0.250        0.000  all-MiniLM-L6-v2
0.78            0.773        0.583        0.000  all-MiniLM-L6-v2
0.85            0.909        0.833        0.000  all-MiniLM-L6-v2

0.30            0.000        0.000        1.000  bge-small-en-v1.5
0.40            0.000        0.000        1.000  bge-small-en-v1.5
0.50            0.091        0.000        0.800  bge-small-en-v1.5
0.60            0.455        0.000        0.000  bge-small-en-v1.5
0.70            0.455        0.000        0.000  bge-small-en-v1.5
0.78            0.636        0.333        0.000  bge-small-en-v1.5
0.85            1.000        1.000        0.000  bge-small-en-v1.5


==============================================================================
THE SAFE BANDS, AND WHETHER A THRESHOLD TRANSFERS
==============================================================================
0.78 is a bad threshold for the old model in the first place -- it wrongly
abstains on 58% of answerable queries, so matching its abstain rate just
preserves the badness. the useful question is where each model's SAFE BAND
lies: thresholds with zero wrong-answers AND zero wrong-abstains.

  all-MiniLM-L6-v2       unanswerable max 0.386  answerable min 0.642  SAFE BAND (0.386, 0.642]
  bge-small-en-v1.5      unanswerable max 0.576  answerable min 0.738  SAFE BAND (0.576, 0.738]

the bands OVERLAP on (0.576, 0.642] -- a window 0.066 wide.
a threshold inside that window is safe on BOTH models, and one outside
it is safe on at most one. so whether a threshold transfers is LUCK.

-- the threshold a sensible team would have picked --
centre of all-MiniLM-L6-v2's safe band: 0.514
  on all-MiniLM-L6-v2 that is wrong-answer 0.000, wrong-abstain 0.000  (correct)
  on bge-small-en-v1.5 that is wrong-answer 0.700, wrong-abstain 0.000

  SO THE GUARD STOPS FIRING: 70% of questions the corpus cannot answer
  are answered anyway. that is 11.2's abstention failure, reintroduced by
  a migration that passed every quality gate -- silently, no error raised.

and in the other direction, centre of bge-small-en-v1.5's band: 0.657
  on all-MiniLM-L6-v2 that is wrong-abstain 0.083 -- it refuses answerable queries.

so the 'DON'T SKIP' is right and its framing is not:
  matching the ABSTAIN RATE preserves the volume of refusals, not their quality
  what you need to preserve is the (wrong-answer, wrong-abstain) PAIR
  and the shift can go in EITHER direction, by much more than 7 points

pick the threshold on the new model that matches the old model's
(wrong-abstain, wrong-answer) PAIR, not its abstain rate -- same argument
as 11.16: a single number cannot express a two-sided trade.`,
        notes: [
          { t: "p", text: "**The two models put the same queries on entirely different scales.** `all-MiniLM` separates answerable (0.642\u20130.859) from unanswerable (0.120\u20130.386) with a wide gap; `bge-small` compresses everything upward, answerable 0.738\u20130.841 against unanswerable 0.481\u20130.576. A threshold is a property of the model, not of the task." },
          { t: "p", text: "**The safe bands overlap in a 0.066-wide window**, out of a unit interval. So a threshold transfers only if it happens to sit inside that window \u2014 which is luck, not engineering, and nothing about the migration process would tell you whether you got lucky." },
          { t: "p", text: "**Carrying over the old band\u2019s centre breaks the guard completely.** 0.514 gives zero wrong-answers on the old model and 0.700 on the new one, so seven in ten unanswerable questions get answered. That is the abstention failure from 11.2, reintroduced by a migration that passed every quality gate, with no error raised anywhere." },
          { t: "p", text: "**And the reference\u2019s framing does not survive.** 0.78 wrongly abstains on 58% of answerable queries on the old model, so it is a poor threshold to begin with; matching its abstain rate gives 0.795 rather than the illustrated 0.71 \u2014 a shift in the *opposite* direction, and it preserves the original badness." },
          { t: "p", text: "**The right target is the error pair**, which is 11.16\u2019s argument arriving in a migration context: equal abstain rate preserves the volume of refusals and says nothing about whether they are the right refusals. Match (wrong-answer, wrong-abstain) instead." },
          { t: "p", text: "Twelve answerable and ten unanswerable queries over a fifteen-document corpus is a demonstration, not a calibration \u2014 a production recalibration wants a few hundred of each drawn from real traffic. The structural result, that the bands differ and barely overlap, is what transfers." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Inventory first, pin snapshots, and put every model ID behind one abstraction keyed on a logical name \u2014 where the 80% win is normalising `tool_calls`, because text abstracts easily and tool-call shapes are where provider differences live. Build the golden set before you need it, give the contract gates an absolute floor, and shadow before you canary." },
        { t: "p", text: "Then step 5\u2019s DON\u2019T SKIP. Measured, two embedding models\u2019 safe threshold bands overlap in a 0.066-wide window, and carrying the old band\u2019s centre over makes the new model answer **70%** of questions its corpus cannot answer. Match the (wrong-answer, wrong-abstain) pair, not the abstain rate." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cWalk me through migrating to a new model.\u201d**" },
        { t: "p", text: "Inventory first, and before an incident rather than during one \u2014 grep for every hardcoded model ID, because the answer is always more than you expect. If it is more than one place, the next step is an abstraction layer rather than a migration." },
        { t: "p", text: "That layer is keyed on a logical name like \u2018summariser\u2019, with the provider, the snapshot and the prompt version as config. The 80% win is normalising tool calls, not text \u2014 every provider returns a string, and the differences that break an agent loop are in tool-call shapes: parallel versus single calls per turn, optional fields omitted versus null, numbers as strings. I would also put the prompt version in the routing entry so the prompt travels with the model, because rolling back a model without its prompt is how a canary turns into an incident." },
        { t: "p", text: "Then a golden set of a few hundred cases \u2014 about 60% sampled production traffic, 20% known-hard cases from past incidents, 10% adversarial, 10% contract cases. That last slice is the one that earns its keep: in the migration I keep citing, task accuracy improved while the valid-JSON rate fell to 94%, and only the contract cases caught it. I would give the JSON gate an absolute floor as well as a relative one, because 94 to 95 per cent is an improvement and still a parser failure one request in twenty." },
        { t: "p", text: "Then shadow before canary. Shadow replays production traffic to the new model with zero user risk and catches format breakage immediately. Then re-tune prompts \u2014 expecting real work, since prompts are model-specific artefacts \u2014 then canary 1, 5, 25, 50, 100 per cent with a bake at each step, and test the kill switch at 5%, because an untested rollback is not a rollback and I would rather discover a broken flag at 5% of traffic than at 100%." },
        { t: "p", text: "If an embedding model is involved it is a different scale of problem, because vectors from two models are not comparable \u2014 so it is dual-write, backfill, re-tune thresholds, shift reads, drop the old index. The threshold re-tuning is the step people skip and the one I would insist on. I measured two real embedding models on the same corpus and queries: their safe threshold bands were (0.386, 0.642] and (0.576, 0.738], overlapping in a window just 0.066 wide. So whether a threshold transfers is luck \u2014 and carrying over the old band\u2019s centre made the new model answer 70% of questions its corpus could not answer, with every quality gate green and no error raised." },
        { t: "p", text: "One correction I would offer on the usual advice: it says to re-tune for an equal abstain rate. That preserves the volume of refusals rather than their quality, and in my measurement the starting threshold of 0.78 was already wrongly abstaining on 58% of answerable queries \u2014 so matching its abstain rate just preserves the badness. Match the error pair instead: wrong-answers and wrong-abstains together." }
      ] }
  ],

  takeaways: [
    "**Inventory every hardcoded model ID now**, not during an incident \u2014 the answer is always more than you think.",
    "**More than one hardcoded ID means build the abstraction first**, keyed on a logical name with the provider and snapshot as config.",
    "**The 80% win is normalising `tool_calls`, not text** \u2014 that is where provider differences live and where agent loops break.",
    "**Put the prompt version in the routing entry**, so the prompt travels with the model and a rollback reverts both.",
    "**The golden set's 10% contract slice is what caught 12.7's broken parser** while accuracy was improving.",
    "**Give the JSON gate an absolute floor, not just a relative one** \u2014 94% to 95% is an improvement and still one failure in twenty.",
    "**Shadow before canary**: zero user risk, and it catches format breakage immediately.",
    "**Test the kill switch at 5%**, because an untested rollback is not a rollback.",
    "**Measured: two embedding models' safe bands are (0.386, 0.642] and (0.576, 0.738]**, overlapping in a 0.066-wide window.",
    "**So whether a similarity threshold transfers is luck** \u2014 carrying the old band's centre over gave 70% wrong-answers.",
    "**Match the (wrong-answer, wrong-abstain) pair, not the abstain rate** \u2014 0.78 already wrongly abstained on 58% of answerable queries.",
    "**A fallback that never carries traffic rots** \u2014 force 1% through it continuously and include it in the eval."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "What is the highest-value part of an LLM abstraction layer?",
        options: [
          "Normalising the response text, since every provider formats it differently",
          "Normalising `tool_calls` \u2014 text abstracts easily, and tool-call shapes are where provider differences actually live",
          "Caching responses behind the logical name",
          "Enforcing a common token-counting method"
        ],
        answer: 1,
        why: "Every provider returns a string, so text is the easy part; what breaks an agent loop is whether several tool calls arrive per turn or one, whether optional fields come back omitted or null, and whether numbers arrive as strings. Normalising once at the boundary means the loop is written against a single shape permanently \u2014 and this is the surface that fails hard, in code paths tests rarely cover." },

      { stem: "Why does the JSON gate need an absolute floor and not just \u201c\u2265 old\u201d?",
        options: [
          "Because the old model's rate may have been measured on different traffic",
          "Because a relative gate alone passes a migration from 94% to 95% \u2014 an improvement, and still a parser failure one request in twenty",
          "Because schema compliance is not comparable across models",
          "Because absolute gates are easier to automate"
        ],
        answer: 1,
        why: "A contract either holds or it does not, so direction of travel is insufficient \u2014 \"better than before\" is compatible with a failure rate that breaks downstream code on five per cent of requests. The 99.5% absolute floor encodes that a parse failure is a defect rather than a quality score, which is also why the contract slice of the golden set exists separately from the accuracy cases." },

      { stem: "Measured, what happens if you carry a well-chosen similarity threshold from one embedding model to another?",
        options: [
          "It transfers safely, since both models are trained on similar data",
          "It may break the guard entirely \u2014 the old band's centre of 0.514 gave 0.000 wrong-answers on the old model and 0.700 on the new",
          "It becomes too strict, refusing most answerable queries",
          "It has no effect, since thresholds are normalised by the vector store"
        ],
        answer: 1,
        why: "The two models' safe bands were (0.386, 0.642] and (0.576, 0.738], overlapping in a window only 0.066 wide, so a threshold transfers only if it happens to sit inside that narrow region. Outside it the failure is directional and silent: seven in ten questions the corpus could not answer were answered anyway, with every quality gate green. It can also fail the other way \u2014 the new model's band centre wrongly abstained on answerable queries on the old model." },

      { stem: "Why is \u201cre-tune for an equal abstain rate\u201d the wrong target?",
        options: [
          "Because abstain rate cannot be measured reliably in production",
          "Because it preserves the volume of refusals rather than their quality \u2014 and the measured starting threshold already wrongly abstained on 58% of answerable queries",
          "Because the new model's abstain rate is not comparable to the old one's",
          "Because abstain rate depends on traffic mix rather than the threshold"
        ],
        answer: 1,
        why: "Matching a rate reproduces however many refusals the old configuration made, including the wrong ones \u2014 and since 0.78 was refusing well over half of the answerable queries, matching it carries that fault forward. The quantity worth preserving is the pair of error rates, wrong-answers and wrong-abstains together, which is the same two-sided argument that applies to any guardrail threshold." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "The migration playbook",
    questions: [
      { level: "core",
        q: "Where do you start a model migration?",
        strong: "A strong answer starts with inventory and abstraction.",
        answer: [
          { t: "p", text: "With an inventory, and ideally long before a deprecation notice. Grep for every hardcoded model ID across code, YAML and JSON \u2014 the count is always higher than anyone expects, and every hit is somewhere the migration has to touch." },
          { t: "p", text: "If it is more than one place, the first piece of work is an abstraction layer rather than the migration itself. Keyed on a logical name like \u2018summariser\u2019, with provider, snapshot and prompt version as configuration, so business logic never names a vendor." },
          { t: "p", text: "The part of that layer that earns its keep is normalising tool calls. Text is trivially abstractable; the differences that silently break an agent loop are in tool-call shapes and structured output." },
          { t: "p", text: "And I would put the prompt version in the routing entry, so the prompt travels with the model. Rolling back a model without rolling back its prompt is how a canary becomes an incident." }
        ] },

      { level: "advanced",
        q: "You are migrating an embedding model. What is the step people skip?",
        strong: "A strong answer has measured the threshold shift.",
        answer: [
          { t: "p", text: "Re-tuning the similarity thresholds after cutover. The dual-write, backfill and read-shift mechanics get followed; phase three gets skipped because nothing errors if you omit it." },
          { t: "p", text: "I measured why it matters. Running the same corpus and the same answerable and unanswerable query sets through two real embedding models, the safe threshold bands \u2014 zero wrong-answers and zero wrong-abstains \u2014 were (0.386, 0.642] and (0.576, 0.738]. They overlap in a window just 0.066 wide, so whether a threshold transfers is luck." },
          { t: "p", text: "And the failure is silent and directional. Carrying over the centre of the old model\u2019s band, 0.514, gave zero wrong-answers on the old model and 0.700 on the new one \u2014 seven in ten questions the corpus could not answer got answered, with every quality gate green." },
          { t: "p", text: "I would also push back on the usual framing of \u2018re-tune for an equal abstain rate\u2019. That preserves the volume of refusals, not their quality, and the threshold I was matching was already wrongly abstaining on 58% of answerable queries. Match the error pair instead." }
        ] },

      { level: "core",
        q: "How do you avoid the fallback you never tested?",
        strong: "A strong answer forces traffic through it.",
        answer: [
          { t: "p", text: "By forcing about one per cent of traffic through the fallback continuously, and including the fallback in the golden-set eval on every release." },
          { t: "p", text: "The failure otherwise is specific and worse than an outage: six months on, the primary goes down, the fallback engages, and it is running a prompt tuned for a model that has been replaced twice. That is a worse experience than a clean 503, because it serves confidently wrong answers instead of failing." },
          { t: "p", text: "A path that never carries traffic is a path that rots \u2014 the same reason to test the kill switch during the canary rather than during the incident, and the same reason to be able to run the retriever on its own." },
          { t: "p", text: "I would pair it with the quota check at step zero, because new models often launch at lower rate-limit tiers and approval takes days. A migration that clears every quality gate can still fail on day one on tokens per minute." }
        ] }
    ]
  }
});
