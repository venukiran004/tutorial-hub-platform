EC.receiveLesson({
  id: "1.4",

  lede: "Temperature and truncation see one logit vector and have no memory. The penalties are the only parameters that read the transcript: they push down the scores of tokens that have already appeared, so the same distribution produces a different token depending on what came before it. There are three of them, they are not interchangeable, and one of them is a different arithmetic operation from the other two — which matters because on a vector of negative logits the naive implementation turns the penalty into a reward.",

  objectives: [
    "State the formula for frequency, presence and repetition penalty, and say which one scales with the count",
    "Predict which of them fixes a loop and which fixes a monotonous topic",
    "Explain why HuggingFace's repetition penalty must branch on the sign of the logit",
    "Measure repetition with a metric rather than by reading output",
    "Choose penalty settings from the failure you have, and say what they cost"
  ],

  prerequisites: ["1.1", "1.2"],

  blocks: [

    /* ============================================================ 01 */
    { t: "h2", n: "01", id: "three-penalties", text: "Three penalties, two arithmetics",
      sub: "Subtract by count, subtract once, or divide" },

    { t: "p", text: "All three penalties do the same kind of thing — modify the logits of tokens that have already been generated — and they differ in how much and how. The reference gives all three; here they are side by side." },

    { t: "dl", items: [
      ["Frequency penalty", "`logit -= frequency_penalty × count(token)`. Scales with how many times the token has appeared. OpenAI's range is −2.0 to 2.0."],
      ["Presence penalty", "`logit -= presence_penalty × (1 if the token has appeared else 0)`. Flat, applied once, regardless of count. Same range."],
      ["Repetition penalty", "`logit /= repetition_penalty` (HuggingFace). Multiplicative rather than additive. Typically 1.0 to 2.0, where 1.0 means no penalty."]
    ] },

    { t: "p", text: "The first two are additive and the third is not, and that difference is not cosmetic. An additive penalty moves every affected logit by the same amount, so its effect on a probability *ratio* is constant — from 1.2, subtracting 0.5 from one logit divides its odds against everything else by `exp(0.5)`, whatever the logits happened to be. A multiplicative penalty moves large logits more than small ones, which is why it needs a sign branch." },

    { t: "callout", kind: "trap", title: "Dividing a negative logit is a reward",
      body: [
        { t: "p", text: "`logit / 1.2` reduces a positive logit — 3.0 becomes 2.5. On a negative logit it does the opposite: −100.0 becomes −83.3, which is *higher*, so the token you meant to discourage just became more likely." },
        { t: "p", text: "Real logit vectors are routinely all-negative — the ones measured in 1.1 ran from −129.87 to −100.25 — so this is not an edge case. HuggingFace's implementation branches: multiply if the logit is negative, divide if it is positive. Any hand-rolled repetition penalty that omits the branch is broken on exactly the models where it matters." },
        { t: "p", text: "The additive penalties have no such problem, which is one honest argument for preferring them when you are writing the sampler yourself." }
      ] },

    { t: "code", lang: "python", title: "g12.py — the three penalties on one vector", code: `text = "the cat sat on the mat the cat sat on the"
ids = tok(text, return_tensors="pt").input_ids
with torch.no_grad():
    lg = model(ids).logits[0, -1]

counts = {}
for i in ids[0].tolist():
    counts[i] = counts.get(i, 0) + 1

for name, ix in ((" the", the), (" cat", cat), (" mat", mat)):
    c    = counts.get(ix, 0)
    base = lg[ix].item()
    freq = base - 0.5 * c                            # scales with count
    pres = base - 0.5 * (1 if c else 0)              # flat
    rep  = base * 1.2 if base < 0 else base / 1.2    # the sign branch
    print("%-8s %2d %10.4f %12.4f %12.4f %12.4f"
          % (repr(name), c, base, freq, pres, rep))`,
      out: `context: 'the cat sat on the mat the cat sat on the'
token counts: {' the': 3, ' cat': 2, ' sat': 2, ' on': 2}

  token       count      logit freq pen 0.5 pres pen 0.5  rep pen 1.2
  ' the'          3   -70.7417     -72.2417     -71.2417     -84.8901
  ' cat'          2   -66.5577     -67.5577     -67.0577     -79.8692
  ' mat'          1   -63.3768     -63.8768     -63.8768     -76.0522`,
      hl: [16],
      caption: "`' the'` has appeared three times, `' mat'` once. The frequency column separates them by 1.5 and 0.5; the presence column gives both the same 0.5. That is the entire difference between the two parameters." },

    { t: "p", text: "Read the last column carefully. The repetition penalty moved `' the'` by 14.1 and `' mat'` by 12.7 — proportionally the same, absolutely very different, and both far larger than the additive penalties at a setting people would call comparable. A `repetition_penalty` of 1.2 is not a mild version of `frequency_penalty=0.5`; on this vector it is roughly twenty-five times stronger." },

    /* ============================================================ 02 */
    { t: "h2", n: "02", id: "which-failure", text: "Two different failures",
      sub: "A loop is not the same thing as a monotonous topic" },

    { t: "p", text: "The reason there are two additive penalties is that there are two distinct failures, and each parameter targets one." },

    { t: "viz", title: "What each penalty is for", caption: "Frequency penalty scales with the count, so it attacks the token used forty times. Presence penalty is flat, so it attacks the fact of having been used at all — which pushes the model toward vocabulary it has not touched.",
      svg: `<svg viewBox="0 0 760 230" width="100%" role="img" aria-label="Frequency penalty against presence penalty">
  <rect x="20" y="30" width="350" height="172" rx="10" class="s-fill" style="stroke:var(--warn)" stroke-width="1.3"/>
  <text x="40" y="56" class="s-label" style="fill:var(--warn)">frequency_penalty</text>
  <text x="40" y="76" class="s-sub">the failure: one word over and over</text>
  <text x="40" y="100" class="s-mono">"the system uses the system's system"</text>
  <text x="40" y="126" class="s-sub">penalty = rate x count, so a token used</text>
  <text x="40" y="142" class="s-sub">10 times is penalised 10x as hard as one</text>
  <text x="40" y="158" class="s-sub">used once. Scales with the offence.</text>
  <text x="40" y="186" class="s-mono" style="fill:var(--warn)">long essays: 0.5</text>

  <rect x="390" y="30" width="350" height="172" rx="10" class="s-fill" style="stroke:var(--violet)" stroke-width="1.3"/>
  <text x="410" y="56" class="s-label" style="fill:var(--violet)">presence_penalty</text>
  <text x="410" y="76" class="s-sub">the failure: it never changes subject</text>
  <text x="410" y="100" class="s-mono">five paragraphs, all about latency</text>
  <text x="410" y="126" class="s-sub">penalty = rate x (has appeared at all),</text>
  <text x="410" y="142" class="s-sub">so the first use costs as much as the</text>
  <text x="410" y="158" class="s-sub">fortieth. Pushes toward new vocabulary.</text>
  <text x="410" y="186" class="s-mono" style="fill:var(--violet)">long essays: 0.3</text>

  <text x="20" y="222" class="s-sub">Both are zero for code and factual work, where repeating an identifier is correct.</text>
</svg>` },

    { t: "p", text: "The reference's guideline table follows from that split:" },

    { t: "table",
      head: ["Task", "frequency_penalty", "presence_penalty", "Why"],
      rows: [
        ["Factual, code", "0", "0", "Repeating a variable name is correct, not a defect"],
        ["Long essays", "0.5", "0.3", "Enough to break loops without forcing synonyms"],
        ["Creative", "0.8", "0.6", "You want the model to leave its first vocabulary"]
      ],
      caption: "From 01_LLM_Parameters.md §4. Note that both are zero for anything a machine will parse — a penalty that discourages repeating `user_id` is a penalty that corrupts your JSON." },

    { t: "callout", kind: "warn", title: "Never penalise structured output",
      body: [
        { t: "p", text: "A JSON response repeats the same tokens constantly — `\"`, `:`, `,`, and every key name that appears in more than one object. A frequency penalty makes each of those progressively less likely as the response grows, which in a long array means the model becomes measurably less willing to emit a closing brace the longer it has been producing braces." },
        { t: "p", text: "The failure is not a parse error on token one; it is a truncated or malformed object two thirds of the way through a long list, which is much harder to attribute. If you are using JSON mode or a schema (1.8), leave both penalties at zero and control repetition with the prompt." }
      ] },

    /* ============================================================ 03 */
    { t: "h2", n: "03", id: "measured", text: "What a penalty is worth, measured",
      sub: "Unique-token ratio is the metric; reading the output is not" },

    { t: "p", text: "\"It repeats less\" is not a measurement. The cheapest useful metric is the ratio of distinct tokens to total tokens in the generated span — it is one line, it has no free parameters, and it moves in the right direction." },

    { t: "code", lang: "python", title: "g13.py — greedy, with the penalty swept", code: `prompt = "The best way to learn a language is"

for rp in (1.0, 1.1, 1.2, 1.5, 2.0):
    ids = tok(prompt, return_tensors="pt").input_ids
    gen = model.generate(ids, max_new_tokens=40, do_sample=False,
                         repetition_penalty=rp, pad_token_id=tok.eos_token_id)
    new  = gen[0][ids.shape[1]:].tolist()
    uniq = len(set(new)) / len(new)
    print("rp=%.1f  unique %.2f  %s" % (rp, uniq, repr(tok.decode(new)[:96])))`,
      out: `  rp=1.0  unique 0.40  ' to learn it from a teacher.\\n\\nThe best way to learn a language is to learn it from a teacher. Le'
  rp=1.1  unique 0.97  " by doing it yourself.\\nI've been learning Spanish for about two years now, and I'm still trying "
  rp=1.2  unique 1.00  " by doing it yourself.\\nI've been learning Spanish for about two years now, and I'm still trying "
  rp=1.5  unique 1.00  " by doing it yourself.\\nI've been learning Spanish for about two years now, and I'm still trying "
  rp=2.0  unique 1.00  " by doing it yourself.\\nI've been learning Spanish for about two years now, and I'm still trying "`,
      hl: [9, 10],
      caption: "At no penalty the greedy output repeats the prompt and then repeats itself — 0.40 unique. A penalty of 1.1 takes it to 0.97, and everything above 1.2 is identical because the penalty is already large enough to dominate every tie it was going to break." },

    { t: "p", text: "That flat top is worth pausing on. Going from 1.2 to 2.0 changed nothing, which is the shape you should expect: a penalty only matters where it reorders the argmax, and once it is large enough to do that everywhere it was going to, more of it does nothing. The absence of a visible difference is not evidence that the setting is safe — it is evidence that greedy decoding has run out of ties to break." },

    { t: "p", text: "Sampling gives the penalty more to do, because it is competing against a distribution rather than against a single argmax:" },

    { t: "code", lang: "python", title: "g13.py — sampled at tau = 0.8, top_p = 0.95", code: `for rp in (1.0, 1.2, 1.6):
    torch.manual_seed(11)
    ids = tok(prompt, return_tensors="pt").input_ids
    gen = model.generate(ids, max_new_tokens=40, do_sample=True, temperature=0.8,
                         top_p=0.95, repetition_penalty=rp,
                         pad_token_id=tok.eos_token_id)
    new = gen[0][ids.shape[1]:].tolist()
    print("rp=%.1f  unique %.2f  %s"
          % (rp, len(set(new)) / len(new), repr(tok.decode(new)[:96])))`,
      out: `  rp=1.0  unique 0.68  ' to learn a foreign language. I remember when I was young there was a small language school ther'
  rp=1.2  unique 0.95  ' with languages. Language learning can be as simple or complicated as your imagination tells you'
  rp=1.6  unique 1.00  ' with languages. Language learning can be as simple or complicated, but there are many important'`,
      caption: "Same seed, three penalties. 0.68 → 0.95 → 1.00 unique. Note that 1.2 and 1.6 diverge only at the end of the span, where enough history has accumulated for the stronger penalty to change a choice." },

    /* ============================================================ 04 */
    { t: "h2", n: "04", id: "what-it-costs", text: "What the penalty costs you",
      sub: "The penalised set is small, and it is made of the words you need" },

    { t: "p", text: "A penalty is not free, and the usual way of describing the cost — \"it degrades long outputs\" — is vague enough to be unhelpful. Here is the specific version. As a generation runs, the set of penalised tokens grows:" },

    { t: "code", lang: "python", title: "g13.py — how the penalised set grows", code: `gen = model.generate(ids, max_new_tokens=400, do_sample=True, temperature=0.9,
                     top_p=0.95, pad_token_id=tok.eos_token_id)
seq = gen[0].tolist()

for n in (10, 50, 100, 200, 400):
    print("after %3d tokens: %4d distinct tokens penalised (%.3f%% of the vocabulary)"
          % (n, len(set(seq[:n])), 100.0 * len(set(seq[:n])) / 50257))`,
      out: `  after  10 tokens:    9 distinct tokens penalised (0.018% of the 50,257-token vocabulary)
  after  50 tokens:   36 distinct tokens penalised (0.072% of the 50,257-token vocabulary)
  after 100 tokens:   57 distinct tokens penalised (0.113% of the 50,257-token vocabulary)
  after 200 tokens:   95 distinct tokens penalised (0.189% of the 50,257-token vocabulary)
  after 400 tokens:  165 distinct tokens penalised (0.328% of the 50,257-token vocabulary)`,
      caption: "After 400 tokens only 0.328% of the vocabulary carries a penalty. The fraction is tiny — and the damage is not proportional to the fraction." },

    { t: "callout", kind: "insight", title: "0.328% of the vocabulary is most of the sentence",
      body: [
        { t: "p", text: "The number looks reassuring and is not. The 165 penalised tokens are not a random sample of the vocabulary — they are the tokens this text has actually used, which means they are `the`, `a`, `of`, `to`, `and`, the comma and the full stop. Those tokens carry a large share of the probability mass at almost every position in English." },
        { t: "p", text: "So a frequency penalty at 400 tokens is pressing down on the function words hardest, because they have the highest counts. That is why aggressive settings produce text that reads as though someone has been paid per unusual word — the model is being pushed off `the` and onto whatever is second." },
        { t: "p", text: "This is also why the recommended ranges top out around 0.5–0.8 rather than at OpenAI's maximum of 2.0. The maximum is there for people who know what they are doing, and what it does is break English." }
      ] },

    { t: "callout", kind: "good", title: "Diagnose first, then pick the parameter",
      body: [
        { t: "p", text: "**The same phrase, repeated verbatim.** That is a loop, and the fix is a modest `frequency_penalty` around 0.3–0.5, or `repetition_penalty` around 1.1–1.2 if you are on a local stack. Measured above: 1.1 took the unique ratio from 0.40 to 0.97." },
        { t: "p", text: "**Different sentences, all about the same thing.** That is topic stickiness, and frequency penalty barely touches it because the repeated tokens are spread thin. `presence_penalty` is the parameter, because it charges for the first use." },
        { t: "p", text: "**Repetition across turns rather than within one response.** Neither penalty helps at all — they only see the current response. That is a prompt and context problem, and 2.19 has it." },
        { t: "p", text: "In all three cases, measure the unique-token ratio before and after. It takes one line and it turns \"seems better\" into a number you can put in a pull request." }
      ] },

    /* ============================================================ exercise */
    { t: "exercise", kind: "Challenge", title: "Show that frequency and presence penalties are not interchangeable",
      difficulty: "core", minutes: 25,
      body: [
        { t: "p", text: "The two additive penalties are often described as \"basically the same\", and at a single occurrence they are — the formulas coincide when every count is 1. They come apart as counts rise." },
        { t: "p", text: "Build the demonstration: find the setting of each that produces the same penalty on a token seen once, then show how far apart they are on a token seen many times." }
      ],
      requirements: [
        "Generate 200 tokens from a prompt of your choice and count how often each token appears",
        "For a frequency penalty of 0.5, compute the total logit reduction for the most common token and for a token seen once",
        "Find the presence penalty that matches the frequency penalty on the once-seen token",
        "Report the ratio between the two penalties on the most common token",
        "Convert both reductions into a probability ratio using exp(), and say which failure each setting targets"
      ],
      hint: "An additive change of d to one logit multiplies that token's odds against every other token by exp(-d). That is the conversion from \"logit reduction\" to \"how much less likely\".",
      solution: { lang: "python", title: "g14_ex.py",
        code: `import math, torch
from transformers import GPT2LMHeadModel, GPT2TokenizerFast

tok = GPT2TokenizerFast.from_pretrained("gpt2")
model = GPT2LMHeadModel.from_pretrained("gpt2").eval()

torch.manual_seed(5)
ids = tok("Explain why distributed systems are hard.", return_tensors="pt").input_ids
gen = model.generate(ids, max_new_tokens=200, do_sample=True, temperature=0.9,
                     top_p=0.95, pad_token_id=tok.eos_token_id)
new = gen[0][ids.shape[1]:].tolist()

counts = {}
for t in new:
    counts[t] = counts.get(t, 0) + 1
ranked = sorted(counts.items(), key=lambda kv: -kv[1])

top_tok, top_n = ranked[0]
once = [t for t, c in counts.items() if c == 1][0]

FP = 0.5
print("most common token %-10s seen %d times" % (repr(tok.decode([top_tok])), top_n))
print("a once-seen token %-10s seen 1 time"   % repr(tok.decode([once])))
print()
print("frequency_penalty=%.1f reduces logits by:" % FP)
print("  most common : %.2f   -> odds x %.4f" % (FP * top_n, math.exp(-FP * top_n)))
print("  once-seen   : %.2f   -> odds x %.4f" % (FP * 1,     math.exp(-FP)))
print()
print("presence_penalty=%.1f (matched on the once-seen token) reduces logits by:" % FP)
print("  most common : %.2f   -> odds x %.4f" % (FP, math.exp(-FP)))
print("  once-seen   : %.2f   -> odds x %.4f" % (FP, math.exp(-FP)))
print()
print("ratio of the two penalties on the most common token: %.1fx" % float(top_n))`,
        out: `most common token '\n'       seen 16 times
a once-seen token 'What'     seen 1 time

frequency_penalty=0.5 reduces logits by:
  most common : 8.00   -> odds x 0.0003
  once-seen   : 0.50   -> odds x 0.6065

presence_penalty=0.5 (matched on the once-seen token) reduces logits by:
  most common : 0.50   -> odds x 0.6065
  once-seen   : 0.50   -> odds x 0.6065

ratio of the two penalties on the most common token: 16.0x

(frequency_penalty=2.0 on the most common token would be 32.00 -> odds x 1.27e-14)`,
        notes: [
          { t: "p", text: "On the once-seen token the two are identical by construction — that is the coincidence that makes people call them interchangeable. On the newline token, which the sample used 16 times, frequency penalty has subtracted 8.0 from the logit and presence penalty has subtracted 0.5. In odds terms that is a factor of 0.0003 against a factor of 0.6065: the frequency penalty has made the paragraph break roughly three thousand times less likely, and the presence penalty has made it about a third less likely. That the most-repeated token turned out to be a newline rather than a word is itself the point — the penalty does not know which repetitions are structure." },
          { t: "p", text: "That is the whole argument for using them for different things. A penalty that compounds with count is a loop-breaker — it grows without bound as a token is reused, so it eventually wins. A flat penalty cannot break a loop, because after the second occurrence it stops getting stronger; what it does instead is make every *unused* token slightly more attractive, which is what moves a model off a topic." },
          { t: "p", text: "It also shows why the ranges differ in practice. A frequency penalty of 2.0 — OpenAI's maximum — would subtract 32.0 from that newline in this sample, a factor of 1.27e-14. The token would be gone from the output entirely, and with it every paragraph break after the sixteenth." }
        ] } },

    /* ============================================================ scenario */
    { t: "callout", kind: "scenario", title: "Incident: the product-description generator that stopped using product names",
      body: [
        { t: "p", text: "**Symptom.** A catalogue tool generated 300-word product descriptions. Editors complained that descriptions of the same item would name the product in the first sentence and then never again — \"it\", \"this piece\", \"the item\" for the remaining four paragraphs. On short descriptions it did not happen." },
        { t: "p", text: "**Configuration.** `frequency_penalty=1.2`, added six months earlier to fix genuine looping, and never revisited. Temperature 0.7, no other changes." },
        { t: "p", text: "**Mechanism.** The product name is a token the description *must* repeat. At 1.2, the third mention carries a logit reduction of 3.6 — a factor of `exp(-3.6)` ≈ 0.027 against every alternative — and by the fifth it is 6.0, or 0.0025. The model was not avoiding the name stylistically; the name had been priced out of the distribution. Short descriptions were fine because the count never got high enough for the penalty to compound, which is exactly the behaviour the measurement in the exercise predicts." },
        { t: "p", text: "**Fix.** `frequency_penalty` down to 0.4, `presence_penalty` up to 0.3 — the split the reference recommends for long-form, and the split that matters here because the original complaint was topic monotony rather than looping. The durable change: the unique-token ratio is now computed on every generated description and logged, with a floor and a ceiling. A ratio near 1.0 on a 300-word product description is not a healthy signal — it means the model is being pushed off vocabulary it should be reusing, and it was sitting at 0.98 the whole time." }
      ] }
  ],

  takeaways: [
    "Penalties are the only sampling stage that reads the transcript. Temperature and truncation are pure functions of the current logit vector.",
    "**Frequency penalty scales with count** (`rate × count`); **presence penalty is flat** (`rate`, once). They coincide on a token seen once and diverge from the second occurrence onward.",
    "**Repetition penalty divides rather than subtracts**, so it must branch on the sign: dividing a negative logit *raises* it, turning the penalty into a reward. Real logit vectors are routinely all-negative.",
    "Measured on GPT-2, `repetition_penalty=1.2` moved the logits by 12.7 to 14.1 — roughly twenty-five times what `frequency_penalty=0.5` did on the same vector. The two scales are not comparable.",
    "The unique-token ratio is the cheap metric: greedy output went from **0.40** unique at no penalty to **0.97** at `repetition_penalty=1.1`, and flat at 1.00 for everything above 1.2.",
    "A penalty stops mattering once it is large enough to reorder every argmax it was going to. No visible change between 1.2 and 2.0 is not evidence of safety.",
    "After 400 generated tokens only **0.328%** of the vocabulary is penalised — but those 165 tokens are `the`, `a`, `of` and the punctuation, which carry most of the mass at most positions.",
    "Both penalties belong at **zero** for code, extraction and structured output, where repeating an identifier is correct and penalising a closing brace is a parse failure waiting to happen.",
    "A loop wants frequency penalty; a monotonous topic wants presence penalty; repetition across turns wants neither, because penalties only see the current response."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A token has appeared 6 times. With `frequency_penalty=0.5` and `presence_penalty=0.5`, what are the two logit reductions?",
        options: ["3.0 and 3.0", "3.0 and 0.5", "0.5 and 3.0", "6.0 and 0.5"],
        answer: 1,
        why: "Frequency penalty is rate × count = 0.5 × 6 = 3.0; presence penalty is flat at 0.5 regardless of the count. The first option applies the count to both and erases the only difference between the parameters. The third has them the wrong way round. The fourth ignores the rate on the frequency side. In odds terms the gap is large: `exp(-3.0)` ≈ 0.050 against `exp(-0.5)` ≈ 0.607, so one has made the token twenty times less likely and the other about a third." },

      { stem: "Why must a repetition penalty implemented as division branch on the sign of the logit?",
        options: ["Because negative logits are invalid input to softmax", "Because dividing a negative logit increases it, rewarding the token instead of penalising it", "Because float division is undefined for negatives", "Because the penalty must be between 1.0 and 2.0"],
        answer: 1,
        why: "−100.0 divided by 1.2 is −83.3, which is a higher score — so the token you meant to discourage becomes more likely, and real logit vectors are routinely all-negative (the one measured in 1.1 ran from −129.87 to −100.25). The first option is wrong: softmax is defined for any real input and is shift-invariant, which is why all-negative vectors are unremarkable. The third is simply false. The fourth describes the parameter's conventional range and has nothing to do with the sign problem." },

      { stem: "Output loops at `repetition_penalty=1.0`, is clean at 1.2, and looks identical at 1.2, 1.5 and 2.0. What do you conclude?",
        options: ["Anything at or above 1.2 is equally safe", "The penalty has already reordered every argmax it was going to; the higher settings are untested, not proven safe", "The penalty stops working above 1.2", "The model ignores values above 1.2"],
        answer: 1,
        why: "Under greedy decoding a penalty only changes the output where it flips which token is largest, so once it is strong enough to flip all the ties it was going to, further increases produce no visible change — the measured sweep showed exactly this flat top from 1.2 to 2.0. That is an absence of evidence, not evidence of safety: on a different prompt, or with sampling, 2.0 will behave very differently from 1.2. The third and fourth options invent a ceiling in the implementation that does not exist; the penalty is applied at every setting, it just has nothing left to change on this input." },

      { stem: "A 300-word product description mentions the product name once and then says \"it\" for four paragraphs. Which setting is the likely cause?",
        options: ["Temperature too low", "A high frequency penalty compounding on the repeated name", "top_p too high", "A presence penalty, which charges for the first use"],
        answer: 1,
        why: "Frequency penalty scales with count, so a name the description must repeat is penalised harder every time it appears — at 1.2 the fifth mention carries a reduction of 6.0, a factor of `exp(-6)` ≈ 0.0025 against every alternative. The fourth option is close but wrong on the mechanism: a presence penalty is flat, so it charges once and then stops getting stronger, which cannot produce the escalating avoidance described. Low temperature would produce more repetition, not less. A high top_p widens the candidate set but does nothing to specifically suppress a token that has already been used." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "Penalties are the parameters candidates are least likely to have looked at closely, which makes them a good discriminator.",
    questions: [
      { level: "core",
        q: "What is the difference between frequency penalty and presence penalty?",
        strong: "A strong answer gives both formulas, notes that they coincide at a single occurrence, and then says which failure each one targets.",
        answer: [
          { t: "p", text: "Both subtract from the logits of tokens already generated. Frequency penalty subtracts `rate × count`, so it compounds; presence penalty subtracts `rate` once, however many times the token has appeared. They are identical on a token seen once, which is why they get conflated." },
          { t: "p", text: "The consequence is that they fix different things. Frequency penalty breaks loops, because it grows without bound as a token is reused and eventually wins. Presence penalty cannot break a loop — after the second occurrence it stops getting stronger — but it makes every unused token slightly more attractive, which is what moves a model off a topic." },
          { t: "p", text: "If you want a number: in a 200-token sample I measured, the most repeated token appeared 16 times. Frequency penalty at 0.5 had subtracted 8.0 from its logit, a factor of about 0.0003 in odds; presence penalty at 0.5 had subtracted 0.5, a factor of 0.61. Same setting, three orders of magnitude apart." }
        ] },

      { level: "core",
        q: "Where should both penalties be zero?",
        strong: "Anywhere a machine parses the output. A strong answer explains the mechanism rather than just stating the rule.",
        answer: [
          { t: "p", text: "Anything with structure: JSON, code, SQL, anything with a schema. The reason is that structured output is *supposed* to repeat — the same key names across objects, the same brackets, the same commas, the same identifiers." },
          { t: "p", text: "A frequency penalty makes each of those progressively less likely as the response grows. In a long JSON array that means the model becomes measurably less willing to emit a closing brace the more braces it has already emitted, and the failure appears two thirds of the way through rather than at the start, which makes it much harder to attribute." },
          { t: "p", text: "The same applies to code, where penalising a repeated variable name is penalising correctness. If repetition in a structured response is a problem, it is a prompt problem or a schema problem, not a sampling one — and 3.13's grammar-constrained decoding is the real answer, because it makes malformed output unrepresentable rather than unlikely." }
        ] },

      { level: "advanced",
        q: "You are writing a sampler and implementing repetition penalty as a division. What do you have to watch for?",
        strong: "The sign branch, and why it matters on real models rather than in principle.",
        answer: [
          { t: "p", text: "Division only penalises a positive logit. On a negative one it does the opposite — −100 divided by 1.2 is −83.3, which is higher, so the token you meant to suppress becomes more likely. That inverts the parameter exactly where you need it." },
          { t: "p", text: "And this is not hypothetical. Real next-token logit vectors are frequently all-negative; the GPT-2 vector I measured ran from −129.87 to −100.25. So a naive implementation would be silently rewarding repetition on every step of every generation." },
          { t: "p", text: "HuggingFace handles it by branching: multiply when the logit is negative, divide when it is positive. If I were writing it fresh I would use the additive form instead, because subtraction has no sign problem and its effect on the odds is a clean `exp(-d)` regardless of where the logits sit — which also makes it far easier to reason about what a given setting is worth." }
        ] },

      { level: "advanced",
        q: "How would you demonstrate to a sceptical colleague that a penalty change is an improvement?",
        strong: "A strong answer proposes a metric rather than a reading of sample outputs, and names what the metric misses.",
        answer: [
          { t: "p", text: "The cheapest useful metric is the ratio of distinct tokens to total tokens in the generated span. It has no free parameters, it is one line, and it moves in the right direction: on a greedy generation I measured it went from 0.40 at no penalty to 0.97 at `repetition_penalty=1.1`. Compute it over a set of real inputs, not one, and report the distribution rather than the mean." },
          { t: "p", text: "Then say what it misses, because a colleague who is right to be sceptical will ask. A unique ratio near 1.0 is not automatically good — on a product description that must repeat a product name, a ratio of 0.98 is the *symptom*, not the goal. So the metric needs a floor and a ceiling for the task, not just a floor." },
          { t: "p", text: "Finally, pair it with a quality score, because these penalties trade one against the other. The change is an improvement if repetition fell and task quality did not — which is the same two-curve argument as the temperature sweep in 1.2, and the same reason not to move two parameters at once." }
        ] }
    ]
  }
});
