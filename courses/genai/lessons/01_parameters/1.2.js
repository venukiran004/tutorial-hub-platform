EC.receiveLesson({
  id: "1.2",

  lede: "Temperature is one division. Every logit is divided by a constant before the softmax, and that single operation is responsible for the entire span between a model that answers the same way every time and one that produces nonsense. This lesson derives what the division does — the ratio between any two tokens becomes `exp(gap/tau)`, which is the whole mechanism — then measures it on four logits you can check by hand, on a real distribution, and on the same prompt generated at five settings.",

  objectives: [
    "State the temperature formula and say which part of the softmax it modifies",
    "Predict the effect on the ratio between two tokens' probabilities from the gap between their logits",
    "Read an entropy figure as a statement about how many tokens the model is really choosing between",
    "Choose a temperature from the task rather than from a table, and justify the choice",
    "Explain why temperature=0 is a special case in the code rather than a limit of the formula"
  ],

  prerequisites: ["1.1"],

  blocks: [

    /* ============================================================ 01 */
    { t: "h2", n: "01", id: "the-formula", text: "One division, before the softmax",
      sub: "P(token_i) = exp(logit_i / tau) / sum_j exp(logit_j / tau)" },

    { t: "p", text: "The formula is the ordinary softmax with tau inserted in one place:" },

    { t: "math", tex: "P(x_i) = \\frac{\\exp(z_i / \\tau)}{\\sum_j \\exp(z_j / \\tau)}" },

    { t: "p", text: "Setting tau = 1 recovers the model's own distribution, unchanged. Below 1 the logits are magnified and the distribution sharpens; above 1 they are compressed and it flattens. That much is in every explanation of temperature. What is usually left out is the *mechanism*, and the mechanism is a single line of algebra." },

    { t: "p", text: "Take any two tokens with logits `z_a` and `z_b`. Their probability ratio is:" },

    { t: "math", tex: "\\frac{P(x_a)}{P(x_b)} = \\frac{\\exp(z_a/\\tau)}{\\exp(z_b/\\tau)} = \\exp\\!\\left(\\frac{z_a - z_b}{\\tau}\\right)" },

    { t: "p", text: "The normalising sum cancels, and what is left depends on only two things: the **gap** between the two logits, and tau. So temperature does not act on probabilities at all — it acts on the exponent of the gap. A gap of 1.0 becomes a ratio of `exp(4)` at tau = 0.25 and `exp(0.25)` at tau = 4. That is the whole of it, and it predicts every number in this lesson." },

    { t: "code", lang: "python", title: "g12.py — four logits you can check by hand", code: `import torch

raw = torch.tensor([2.0, 1.0, 0.5, -1.0])      # A, B, C, D

for t in (0.25, 0.5, 1.0, 2.0, 4.0):
    p = torch.softmax(raw / t, dim=-1)
    print("tau=%-5.2f %9.6f %9.6f %9.6f %9.6f" % (t, *p.tolist()))

# the gap A-B is 1.0, so the ratio should be exp(1/tau) at every setting
for t in (0.25, 0.5, 1.0, 2.0, 4.0):
    p = torch.softmax(raw / t, dim=-1)
    print("tau=%.2f  ratio %8.4f   exp(1/tau) = %8.4f"
          % (t, p[0] / p[1], torch.exp(torch.tensor(1.0 / t))))`,
      out: `  tau       A(2.0)    B(1.0)    C(0.5)   D(-1.0)
  0.25    0.979623  0.017942  0.002428  0.000006
  0.50    0.842034  0.113957  0.041922  0.002087
  1.00    0.609460  0.224208  0.135989  0.030343
  2.00    0.434400  0.263477  0.205196  0.096928
  4.00    0.340315  0.265037  0.233895  0.160753

  tau=0.25  ratio  54.5981   exp(1/tau) =  54.5981
  tau=0.50  ratio   7.3891   exp(1/tau) =   7.3891
  tau=1.00  ratio   2.7183   exp(1/tau) =   2.7183
  tau=2.00  ratio   1.6487   exp(1/tau) =   1.6487
  tau=4.00  ratio   1.2840   exp(1/tau) =   1.2840`,
      caption: "Four logits, five temperatures. The ratio column matches `exp(1/tau)` to every printed digit, because the gap between A and B is exactly 1.0 and the normaliser cancels. Token D — a full 3.0 below A — goes from 6 in a million at tau = 0.25 to 16% of the mass at tau = 4." },

    { t: "callout", kind: "mental", title: "Temperature is a gain control on the gaps",
      body: [
        { t: "p", text: "Not a randomness dial, not a creativity slider. Every difference between two logits is multiplied by `1/tau` before it is exponentiated. Halving tau squares every ratio; doubling tau takes the square root of every ratio." },
        { t: "p", text: "That is why the effect is so violent at the low end and so gentle at the high end. Going from tau = 1.0 to tau = 0.5 squares the A:B ratio — 2.72 becomes 7.39. Going from 1.0 to 2.0 only takes its square root — 2.72 becomes 1.65. The scale is multiplicative in `1/tau`, which is not what a slider from 0 to 2 in the playground suggests." }
      ] },

    /* ============================================================ 02 */
    { t: "h2", n: "02", id: "on-a-real-distribution", text: "The same division on 50,257 logits",
      sub: "Where entropy becomes the useful reading" },

    { t: "p", text: "Four numbers make the algebra visible. A real distribution makes the consequence visible, and the consequence is best read as *how many tokens the model is actually choosing between*." },

    { t: "code", lang: "python", title: "g11.py — GPT-2 after \"The capital of France is\"", code: `for t in (0.2, 0.7, 1.0, 1.5):
    p = torch.softmax(logits / t, dim=-1)
    ent = -(p * torch.log(p.clamp_min(1e-12))).sum().item()
    srt = torch.sort(p, descending=True).values
    n90 = int((torch.cumsum(srt, 0) < 0.9).sum().item()) + 1
    print("t=%.1f  entropy %7.4f nats   tokens to reach 90%% of the mass: %d"
          % (t, ent, n90))`,
      out: `  token             t=0.2      t=0.7      t=1.0      t=1.5
  ' the'         0.882437   0.227430   0.084593   0.016138
  ' now'         0.051615   0.101063   0.047946   0.011052
  ' a'           0.042694   0.095729   0.046160   0.010776
  ' France'      0.007248   0.057677   0.032377   0.008507
  ' Paris'       0.007101   0.057340   0.032245   0.008484
  ' in'          0.002734   0.043653   0.026641   0.007470

  t=0.2  entropy  0.5253 nats   tokens to reach 90% of the mass: 2
  t=0.7  entropy  3.5521 nats   tokens to reach 90% of the mass: 62
  t=1.0  entropy  5.9985 nats   tokens to reach 90% of the mass: 1503
  t=1.5  entropy  8.4797 nats   tokens to reach 90% of the mass: 8841`,
      caption: "`' the'` holds 88% of the mass at tau = 0.2 and 1.6% at tau = 1.5. The last column is the one to quote in a design discussion: the model is choosing between 2 tokens, or between 8,841." },

    { t: "viz", title: "What tau does to the same 50,257 logits", caption: "Each bar is the mass held by the top token, and the figure beneath is how many tokens are needed to reach 90% of the distribution. Both are measured on GPT-2 after \"The capital of France is\".",
      svg: `<svg viewBox="0 0 760 240" width="100%" role="img" aria-label="Temperature against top-token mass and candidate count">
  <line x1="60" y1="170" x2="720" y2="170" style="stroke:var(--line)" stroke-width="1.2"/>
  <text x="46" y="60" text-anchor="end" class="s-sub">100%</text>
  <text x="46" y="174" text-anchor="end" class="s-sub">0%</text>
  <line x1="52" y1="56" x2="720" y2="56" style="stroke:var(--line)" stroke-width="0.8" stroke-dasharray="3 4"/>

  <rect x="96" y="46" width="72" height="124" rx="4" style="fill:var(--accent)" opacity="0.85"/>
  <text x="132" y="38" text-anchor="middle" class="s-mono">0.8824</text>
  <text x="132" y="188" text-anchor="middle" class="s-label">tau 0.2</text>
  <text x="132" y="204" text-anchor="middle" class="s-sub">2 tokens to 90%</text>
  <text x="132" y="220" text-anchor="middle" class="s-sub">entropy 0.53</text>

  <rect x="256" y="138" width="72" height="32" rx="4" style="fill:var(--good)" opacity="0.85"/>
  <text x="292" y="130" text-anchor="middle" class="s-mono">0.2274</text>
  <text x="292" y="188" text-anchor="middle" class="s-label">tau 0.7</text>
  <text x="292" y="204" text-anchor="middle" class="s-sub">62 tokens to 90%</text>
  <text x="292" y="220" text-anchor="middle" class="s-sub">entropy 3.55</text>

  <rect x="416" y="158" width="72" height="12" rx="3" style="fill:var(--warn)" opacity="0.85"/>
  <text x="452" y="150" text-anchor="middle" class="s-mono">0.0846</text>
  <text x="452" y="188" text-anchor="middle" class="s-label">tau 1.0</text>
  <text x="452" y="204" text-anchor="middle" class="s-sub">1,503 tokens to 90%</text>
  <text x="452" y="220" text-anchor="middle" class="s-sub">entropy 6.00</text>

  <rect x="576" y="167" width="72" height="3" rx="1.5" style="fill:var(--crit)" opacity="0.85"/>
  <text x="612" y="158" text-anchor="middle" class="s-mono">0.0161</text>
  <text x="612" y="188" text-anchor="middle" class="s-label">tau 1.5</text>
  <text x="612" y="204" text-anchor="middle" class="s-sub">8,841 tokens to 90%</text>
  <text x="612" y="220" text-anchor="middle" class="s-sub">entropy 8.48</text>

  <text x="60" y="26" class="s-sub">mass held by the single most likely token</text>
</svg>` },

    { t: "p", text: "Entropy is the compact version of the same reading, in nats. It is worth logging in production for exactly this reason: a sudden drop means the model has become more certain than it was yesterday, which after a provider-side model update is a signal worth an alert. 10.3 puts it among the model-layer metrics." },

    { t: "callout", kind: "insight", title: "Certainty is a property of the step, not the model",
      body: [
        { t: "p", text: "The entropy figures above belong to one prompt at one position. A different prompt at tau = 1.0 gives a different number, and the same prompt gives a different number at every step of a generation." },
        { t: "p", text: "Measured here on GPT-2: `\"The capital of France is\"` has entropy 5.9985, and `\"The Eiffel Tower is located in the city of\"` — a prompt that looks far more constrained — has entropy **6.0774**, which is *higher*. GPT-2 ranks `' Paris'` first there at 0.063779, then `' London'`, `' Amsterdam'`, `' New'`, `' Berlin'`. It knows the shape of the answer (a city) without being confident about which one." },
        { t: "p", text: "This is why a single temperature cannot be right for a whole document. It is also the argument for top-p over top-k from 1.3, which adapts step by step where temperature cannot." }
      ] },

    /* ============================================================ 03 */
    { t: "h2", n: "03", id: "generated", text: "What it looks like as text",
      sub: "The same prompt at five settings, nothing else changed" },

    { t: "p", text: "Distributions are the mechanism; text is what anyone actually judges. Here is the same prompt at five temperatures, with top-k and top-p disabled so that temperature is the only thing acting." },

    { t: "code", lang: "python", title: "g12.py — one prompt, five temperatures", code: `prompt = "The best way to learn a language is"

for t in (0.0, 0.3, 0.7, 1.0, 1.4):
    torch.manual_seed(7)
    ids = tok(prompt, return_tensors="pt").input_ids
    if t == 0.0:
        gen = model.generate(ids, max_new_tokens=24, do_sample=False,
                             pad_token_id=tok.eos_token_id)
    else:
        gen = model.generate(ids, max_new_tokens=24, do_sample=True, temperature=t,
                             top_k=0, top_p=1.0,           # nothing else acting
                             pad_token_id=tok.eos_token_id)
    print("t=%.1f  %s" % (t, repr(tok.decode(gen[0][ids.shape[1]:]))))`,
      out: `  t=0.0  ' to learn it from a teacher.\\n\\nThe best way to learn a language is to learn it from a teacher.'
  t=0.3  ' to learn it in a language that is not your own.\\n\\nThe best way to learn a language is to learn'
  t=0.7  ' to speak it."\\n\\n\\nEverett\\n\\nWhen Everett, a writer and musician, learned to speak English in August'
  t=1.0  ' only when it is already existing and existing people are willing to help it. It comes with a little bag of tricks that'
  t=1.4  ' only when some other good existing crank sticks with all their toll. For EQ everywhere comes of 1900 speakers. This scale belonged'`,
      hl: [9, 10],
      caption: "One seed, five temperatures. At 0.0 the model loops — it restates the prompt verbatim and then repeats its own sentence. At 1.4 the grammar survives and the meaning does not." },

    { t: "p", text: "Read that ladder carefully, because it contains the honest version of the advice. At **0.0** the output is a loop: the model restates the prompt and then says the same thing again. At **0.3** it is still looping, just more slowly. At **0.7** it is coherent and has wandered into a story. At **1.0** the sentence is grammatical and means nothing. At **1.4** words like `crank`, `toll` and `EQ` appear because tokens that were at `exp(-3)` odds are now at `exp(-2.1)` odds." },

    { t: "callout", kind: "trap", title: "Low temperature does not mean accurate",
      body: [
        { t: "p", text: "The tau = 0.0 output above is the most deterministic thing the model can produce and it is also the least useful: a verbatim restatement of the prompt followed by a copy of itself. Nothing about low temperature makes an answer correct — it makes it *repeatable*, which is a different property." },
        { t: "p", text: "The two get conflated because for extraction and classification they coincide: there is one right answer, the model usually ranks it first, and greedy returns it every time. For anything generative they come apart immediately, and the repetition in the tau = 0.0 and tau = 0.3 rows is what that looks like." },
        { t: "p", text: "1.4 is the lesson about the parameter that exists specifically to fix this, and it fixes it without raising temperature at all." }
      ] },

    /* ============================================================ 04 */
    { t: "h2", n: "04", id: "choosing", text: "Choosing a number",
      sub: "The reference's table, and what to do when your task is not in it" },

    { t: "p", text: "The reference gives ranges by task, and they are a reasonable starting point — they encode what people have converged on rather than anything derived:" },

    { t: "table",
      head: ["Task", "Reference range", "What the range is really saying"],
      rows: [
        ["Code generation", "0.0 – 0.2", "There is one right answer and you want it every time"],
        ["Factual Q&A", "0.0 – 0.3", "Same, with a little room where several phrasings are equally correct"],
        ["General chat", "0.5 – 0.7", "Repetition across turns is the failure mode to avoid"],
        ["Creative writing", "0.7 – 1.0", "You want the model to leave the most obvious continuation"],
        ["Brainstorming", "0.8 – 1.2", "You want variety across *samples*, and will filter afterwards"]
      ],
      caption: "From 01_LLM_Parameters.md §2. The third column is what the numbers are for, which is the part worth carrying to a task the table does not list." },

    { t: "p", text: "For a task that is not in the table, the question to ask is not \"how creative should this be\". It is: **do I want variety across repeated calls with the same input?** If no — extraction, classification, routing, structured output, anything a downstream system parses — the answer is 0. If yes, start at 0.7 and move it on evidence." },

    { t: "callout", kind: "good", title: "How to actually pick it",
      body: [
        { t: "p", text: "Take 20 real inputs. Run each at tau = 0, 0.5, 0.7 and 1.0, three samples per setting. Score the output on whatever your task's metric is, and also count how many of the three samples are meaningfully different. You now have two curves: quality against tau, and diversity against tau." },
        { t: "p", text: "Pick the largest tau at which quality has not yet dropped. That is the standard answer and it takes an afternoon. What it buys you is the ability to say *why* the number is what it is when someone changes it six months later." },
        { t: "p", text: "Do not do this with top-p also in play. 1.3 measures why: the two interact, so the curve you fit at one top-p does not hold at another." }
      ] },

    /* ============================================================ 05 */
    { t: "h2", n: "05", id: "zero", text: "Why zero is a special case",
      sub: "Division by zero is undefined, so somebody wrote an `if`" },

    { t: "p", text: "`temperature=0` cannot mean what the formula says, because the formula divides by tau. What every implementation does instead is branch: if tau is zero, skip the sampler and return the argmax. It is worth knowing that this is a branch in code rather than a limit of the mathematics, for three reasons." },

    { t: "ol", items: [
      "**The limit does exist**, and it is the argmax — as tau goes to zero the mass concentrates entirely on the largest logit. So the branch is *consistent* with the formula; it is just not computed by it. Ties are the exception: the limit of a tie is a uniform distribution over the tied tokens, while argmax picks the lowest index.",
      "**`temperature=0` and `temperature=0.0001` are different code paths.** The second one actually divides, and with logits in the hundreds that overflows `exp()` before the max-subtraction saves it. This is why several providers document a minimum of 0.01 rather than 0, and why a config that works on one provider can fail on another.",
      "**It does not guarantee reproducibility.** The sampler is skipped, so the randomness of sampling is gone — but the logits themselves are not bit-identical from one server call to the next, for reasons measured in 1.7."
    ] },

    { t: "code", lang: "python", title: "g11.py — the branch, made explicit", code: `def sample_next(logits, temperature):
    if temperature == 0:                   # the branch every provider has
        return int(torch.argmax(logits))
    p = torch.softmax(logits / temperature, dim=-1)
    return int(torch.multinomial(p, 1))

# and what the branch costs you in variety, measured over 200 draws:
for t in (0.7, 1.0, 1.5):
    torch.manual_seed(0)
    p = torch.softmax(logits / t, dim=-1)
    draws = torch.multinomial(p, 200, replacement=True)
    print("t=%.1f  %3d distinct tokens in 200 draws" % (t, len(set(draws.tolist()))))`,
      out: `greedy (t=0) always returns: ' the'   logit -100.2498

  t=0.7   48 distinct tokens in 200 draws   top: ' the' x50, ' now' x25, ' a' x16, ' also' x11, ' Paris' x9
  t=1.0  126 distinct tokens in 200 draws   top: ' the' x14, ' France' x10, ' in' x9, ' now' x8, ' Paris' x8
  t=1.5  188 distinct tokens in 200 draws   top: ' now' x3, ' in' x3, ' made' x2, ' rather' x2, ' set' x2`,
      caption: "Greedy returns one token, always. At tau = 0.7 the sampler still lands on `' the'` a quarter of the time; at tau = 1.5 the most common token appears three times in two hundred draws, which is to say the distribution has stopped having a mode worth naming." },

    /* ============================================================ exercise */
    { t: "exercise", kind: "Challenge", title: "Find the temperature that doubles the model's uncertainty",
      difficulty: "core", minutes: 20,
      body: [
        { t: "p", text: "Entropy is the compact way to say how many tokens a model is choosing between. On the measured prompt it was 0.5253 nats at tau = 0.2 and 5.9985 nats at tau = 1.0." },
        { t: "p", text: "Find the temperature at which entropy is exactly double its value at tau = 0.5, and then show that the answer is not 1.0 — that is, that entropy is not linear in tau." }
      ],
      requirements: [
        "Load GPT-2 and take the next-token logits for \"The capital of France is\"",
        "Write `entropy(t)` returning the Shannon entropy in nats of the distribution at temperature t",
        "Report entropy at tau = 0.5, then bisect for the tau where entropy is twice that",
        "Report the ratio of that tau to 0.5, and say in one line why it is not 2.0",
        "Report how many tokens are needed to cover 90% of the mass at both temperatures"
      ],
      hint: "Entropy rises monotonically with tau — spreading mass can only increase it — so bisection works. Do the doubling on the entropy, not on tau.",
      solution: { lang: "python", title: "g12_ex.py",
        code: `import torch
from transformers import GPT2LMHeadModel, GPT2TokenizerFast

tok = GPT2TokenizerFast.from_pretrained("gpt2")
model = GPT2LMHeadModel.from_pretrained("gpt2").eval()
ids = tok("The capital of France is", return_tensors="pt").input_ids
with torch.no_grad():
    logits = model(ids).logits[0, -1]

def entropy(t):
    p = torch.softmax(logits / t, dim=-1)
    return -(p * torch.log(p.clamp_min(1e-12))).sum().item()

def n90(t):
    srt = torch.sort(torch.softmax(logits / t, dim=-1), descending=True).values
    return int((torch.cumsum(srt, 0) < 0.9).sum().item()) + 1

base = entropy(0.5)
target = 2 * base

lo, hi = 0.5, 8.0
while hi - lo > 1e-4:
    mid = (lo + hi) / 2
    if entropy(mid) < target: lo = mid
    else:                     hi = mid

print("entropy at tau=0.5      : %.4f nats  (%d tokens to 90%%)" % (base, n90(0.5)))
print("target (twice that)     : %.4f nats" % target)
print("reached at tau          : %.4f  (%d tokens to 90%%)" % (lo, n90(lo)))
print("tau ratio               : %.4f" % (lo / 0.5))`,
        out: `entropy at tau=0.5      : 2.2773 nats  (10 tokens to 90%)
target (twice that)     : 4.5546 nats
reached at tau          : 0.8234  (310 tokens to 90%)
tau ratio               : 1.6468`,
        notes: [
          { t: "p", text: "Doubling the entropy took a temperature increase of only 1.65×, not 2×. Entropy is not proportional to tau, and the reason is the exponent: from §01, every logit gap is scaled by `1/tau`, so what changes linearly is the *inverse* temperature. Reading a temperature slider as if it were linear in uncertainty is the mistake this measurement is for." },
          { t: "p", text: "The `n90` column is the number that makes it concrete: doubling entropy took the candidate set from 10 tokens to 310, a factor of thirty-one. Entropy is a log-scale quantity, so a modest-looking move in nats is a large move in candidates — which is exactly why entropy is the right thing to *alert* on and the wrong thing to quote to a product manager." },
          { t: "p", text: "The bisection is safe because entropy is monotone in tau. That is not an assumption about this model: raising tau always moves mass from the peak toward the tail, and any such move increases Shannon entropy." }
        ] } },

    /* ============================================================ scenario */
    { t: "callout", kind: "scenario", title: "Incident: the summariser that got repetitive after a model upgrade",
      body: [
        { t: "p", text: "**Symptom.** A document summariser ran at `temperature=0.2` for a year without complaint. After the provider moved the default model to a newer version, support tickets started arriving about summaries that repeated the same sentence two or three times. The prompt had not changed and neither had the temperature." },
        { t: "p", text: "**What the logs showed.** The team had been recording per-request entropy since a previous incident. The median dropped from 3.1 nats to 1.4 on the day of the switch. The new model was simply more confident — better calibrated, arguably — and at tau = 0.2 that extra confidence pushed the top token from around 60% of the mass to over 90%." },
        { t: "p", text: "**Mechanism.** Temperature is not an absolute setting; it is a scaling applied to whatever gaps the model produces. A model with wider logit gaps at tau = 0.2 behaves like the old model at a much lower temperature — and the measured ladder in §03 shows exactly what happens at the bottom of that range, which is looping. The setting was tuned against a distribution that no longer existed." },
        { t: "p", text: "**Fix.** Temperature raised to 0.5, chosen by re-running the 20-input sweep from §04 against the new model, and a `repetition_penalty` added as the mechanism that actually targets the symptom (1.4). The durable change was the alert: entropy is now compared against a 7-day baseline, and a shift of more than 40% pages someone. 12.5 is about instrumenting for exactly this, and 12.4 is about the deprecation that caused it." }
      ] }
  ],

  takeaways: [
    "Temperature divides every logit by tau before the softmax. It changes no logit's rank and removes no token — it only changes how far apart their probabilities end up.",
    "The mechanism is one line: `P(a)/P(b) = exp((z_a - z_b)/tau)`. Temperature acts on the **gap** between logits, exponentially.",
    "Because the ratio is exponential in `1/tau`, the scale is multiplicative: halving tau squares every ratio, doubling tau takes its square root. A slider from 0 to 2 is not linear in anything you care about.",
    "Measured on four logits with a gap of 1.0, the ratio was 54.60 at tau = 0.25 and 1.28 at tau = 4 — matching `exp(1/tau)` to every printed digit.",
    "**Entropy is the useful reading.** On GPT-2 the same prompt went from 0.5253 nats at tau = 0.2 to 8.4797 at tau = 1.5, and the tokens needed to cover 90% of the mass went from 2 to 8,841.",
    "Entropy is not linear in tau: doubling it on the measured prompt took a temperature increase of 1.65×, and moved the candidate set from 10 tokens to 310.",
    "**Certainty is a property of the step.** \"The Eiffel Tower is located in the city of\" measured *higher* entropy (6.0774) than \"The capital of France is\" (5.9985), because GPT-2 knows the answer is a city without knowing which one.",
    "Low temperature is repeatable, not accurate. At tau = 0.0 and 0.3 the measured generations looped; the parameter that fixes repetition is in 1.4, not this lesson.",
    "`temperature=0` is a branch in the code, not a limit of the formula — which is why some providers document a minimum of 0.01, and why it still does not guarantee identical output (1.7)."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Two tokens have logits 4.0 and 2.0. At tau = 0.5, what is the ratio of their probabilities?",
        options: ["2.0", "e² ≈ 7.39", "e⁴ ≈ 54.60", "4.0"],
        answer: 2,
        why: "The ratio is `exp((z_a − z_b)/tau)` = `exp(2.0/0.5)` = `exp(4)` ≈ 54.60. The second option is the ratio at tau = 1.0 and shows the mistake of forgetting the division. The first and fourth treat the relationship as linear in either the gap or the temperature, and the measurement in §01 rules both out — a gap of 1.0 gave ratios of 54.60, 7.39, 2.72, 1.65 and 1.28 across tau = 0.25 to 4, which is `exp(1/tau)` and nothing simpler." },

      { stem: "You raise temperature from 1.0 to 1.5. Which token is affected most, in relative terms?",
        options: ["The most likely token, which loses the most mass", "The least likely tokens, whose probabilities rise by the largest factor", "All tokens equally, since every logit is divided by the same number", "Only tokens above the top-p threshold"],
        answer: 1,
        why: "Dividing by a larger tau compresses every gap, and the tokens with the largest gaps from the top are the ones whose relative position improves most — in §01 token D rose from 0.000006 to 0.160753 across the sweep, a factor of about 26,000, while token A fell by less than a factor of two. The first option confuses absolute loss with relative change: the top token does lose the most mass, but that is not what the question asks. The third mistakes an identical operation on the logits for an identical effect on the probabilities. The fourth confuses temperature with truncation, which does not happen at this stage at all." },

      { stem: "Your summariser at temperature=0.2 starts repeating itself after a model upgrade. What is the most likely cause?",
        options: ["The new model has a bug in its sampler", "The new model produces wider logit gaps, so 0.2 now behaves like a much lower temperature", "The temperature parameter changed meaning between model versions", "Repetition is unrelated to temperature"],
        answer: 1,
        why: "Temperature scales whatever gaps the model produces, so it is relative rather than absolute — a better-calibrated model with wider gaps at tau = 0.2 concentrates more mass on the top token, and the measured ladder in §03 shows that the bottom of the temperature range is exactly where looping appears. The third option is wrong because the formula is fixed across versions; it is the distribution it operates on that moved. The first blames the sampler for a change in the model. The fourth is contradicted by the same ladder, where tau = 0.0 and 0.3 both looped and tau = 0.7 did not." },

      { stem: "What does an entropy of 0.5253 nats tell you that \"temperature is 0.2\" does not?",
        options: ["How accurate the next token will be", "How many tokens the model is effectively choosing between at this step", "How long the response will be", "Which token will be selected"],
        answer: 1,
        why: "Entropy is a measure of the spread of the distribution, and at 0.5253 nats the measured prompt needed just 2 tokens to cover 90% of the mass — a statement about this step that the temperature alone cannot make, since the same tau gives different entropies on different prompts (5.9985 against 6.0774 for the two prompts measured in §02). The first option is the confusion the whole lesson is against: a confident distribution can be confidently wrong. The third is unrelated — length is `max_tokens` and the stop conditions, in 1.5 and 1.6. The fourth would require the argmax, which entropy does not carry." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "Temperature is the first thing anyone is asked about and the easiest place to sound like you have only read the docs. The separator is whether you can state the mechanism.",
    questions: [
      { level: "core",
        q: "What does temperature actually do?",
        strong: "A strong answer gives the formula, then the consequence for the ratio between two tokens, and resists calling it a creativity dial. Naming what it does *not* do — remove tokens, change ranks — is what shows it has been thought about.",
        answer: [
          { t: "p", text: "Say it as an operation: every logit is divided by tau before the softmax. Then give the consequence, which is the part that shows understanding — the ratio between any two tokens' probabilities becomes `exp((z_a − z_b)/tau)`, so temperature scales the gaps between logits exponentially." },
          { t: "p", text: "Then say what it does not do. It does not remove any token from consideration — that is top-k and top-p. It does not change any token's rank, because dividing by a positive constant is order-preserving. So a token the model ranked fourth is still fourth at every temperature; it is only the distance that changes." },
          { t: "p", text: "If they want a number, entropy is the one that lands: on a prompt I measured, GPT-2 needed 2 tokens to cover 90% of the mass at tau = 0.2 and 8,841 at tau = 1.5." }
        ] },

      { level: "core",
        q: "Why is temperature=0 not the same as temperature=0.0001?",
        strong: "A strong answer knows that zero is a branch in the code rather than a value in the formula, and can say what the limit would be and where it differs.",
        answer: [
          { t: "p", text: "The formula divides by tau, so zero is undefined. Implementations branch: if tau is zero, skip the sampler and return the argmax. 0.0001 takes the other path and actually divides, which with logits in the hundreds would overflow `exp()` if the max-subtraction did not come first." },
          { t: "p", text: "The limit as tau goes to zero *is* the argmax, so the branch is consistent — except on ties, where the limit is uniform over the tied tokens and argmax returns the lowest index. That is a rare case but it is the honest caveat." },
          { t: "p", text: "The point worth volunteering is that neither guarantees a reproducible response from a server. Skipping the sampler removes sampling randomness; it does not make the logits bit-identical across calls, and 1.7 has the measurement showing batch composition alone shifting them." }
        ] },

      { level: "advanced",
        q: "A team tuned temperature=0.2 a year ago. The provider upgraded the model and output got repetitive. Walk me through your diagnosis.",
        strong: "A strong answer identifies that temperature is relative to the model's own gaps, proposes a measurement rather than a guess, and separates the fix for the symptom from the fix for the process.",
        answer: [
          { t: "p", text: "Start from what temperature is: a scaling on the gaps the model produces, not an absolute setting. A newer model with wider logit gaps at tau = 0.2 concentrates more mass on the top token than the old one did, which puts you at the bottom of the temperature range — and the bottom of the range is where looping lives. I would expect the failure to be exactly that, and it is checkable." },
          { t: "p", text: "The measurement is per-request entropy before and after the switch. If the median dropped sharply, the diagnosis is confirmed without touching the prompt. If it did not, the cause is elsewhere and I would look at the chat template next, since those change between model versions too." },
          { t: "p", text: "Two fixes, and they are different. The symptom fix is a repetition penalty, which targets repeats directly rather than by adding randomness everywhere. The process fix is that the temperature was tuned against a distribution that stopped existing and nobody noticed — so entropy goes on a baseline with an alert, and the tuning sweep becomes something that reruns when the model changes. That second one is what keeps it from happening again." }
        ] },

      { level: "advanced",
        q: "Someone proposes exposing temperature as a \"creativity\" slider from 0 to 2 in the product UI. What do you say?",
        strong: "A strong answer objects on the grounds that the scale is not perceptually linear, gives the reason, and offers something better than simply refusing.",
        answer: [
          { t: "p", text: "The objection is that the mapping is not linear in anything a user perceives. Because the ratio between tokens goes as `exp(1/tau)`, the interval from 0 to 0.5 contains almost the whole usable range of behaviour and the interval from 1.0 to 2.0 is mostly degradation. A user dragging to the middle of the slider gets output that is grammatical and meaningless, which reads to them as the product being broken." },
          { t: "p", text: "There is a measurement to back this up rather than an opinion: doubling the entropy of the distribution took a temperature increase of only 1.65×, and moved the candidate set from 10 tokens to 310. The perceptual scale is roughly logarithmic, so a linear slider spends most of its travel in a region nobody wants." },
          { t: "p", text: "What I would offer instead is three named presets — precise, balanced, exploratory — mapped to values chosen by the sweep in §04 against real inputs, with a repetition penalty tied to the same preset. Users understand intent; they do not understand tau, and exposing it transfers a tuning problem onto someone with no way to evaluate it." }
        ] }
    ]
  }
});
