EC.receiveLesson({
  id: "1.3",

  lede: "Top-k and top-p both delete the tail of the distribution before a token is drawn, and they are the only two parameters in this module that make a token *impossible* rather than merely unlikely. They differ in one respect, and that one respect determines which of them you should be using: top-k cuts at a fixed position and cannot see the shape of the distribution, while top-p cuts wherever the mass runs out and therefore adapts to every step. This lesson works the reference's small example by hand, then measures the cut on three real prompts.",

  objectives: [
    "Compute by hand which tokens a given top-p keeps, and identify the off-by-one that catches everyone",
    "Explain why top-k is invariant to temperature and top-p is not",
    "Read a candidate count as a statement about how certain the model is at that step",
    "Say what top_k=1, top_p=1.0 and top_p=0 each mean, and which of them is greedy",
    "Justify moving one truncation parameter rather than two"
  ],

  prerequisites: ["1.1", "1.2"],

  blocks: [

    /* ============================================================ 01 */
    { t: "h2", n: "01", id: "top-k", text: "Top-k keeps a fixed count",
      sub: "Sort, take the first k, set everything else to negative infinity" },

    { t: "p", text: "Top-k is the simpler of the two and the easier to reason about. Sort the logits, keep the k largest, set the rest to negative infinity so that softmax gives them exactly zero, and renormalise over what is left. Four lines:" },

    { t: "code", lang: "python", title: "g11.py — top-k", code: `def top_k_filter(lg, k):
    out = lg.clone()
    kth = torch.topk(lg, k).values[-1]       # the k-th largest score
    out[out < kth] = -float("inf")           # everything below it is gone
    return out`,
      caption: "Note the comparison is on the raw logits, not on probabilities — the ranking is identical either way, and comparing logits avoids a softmax you do not need." },

    { t: "p", text: "Two special values are worth naming immediately. **`top_k=1`** keeps exactly one token, which is the argmax, which is greedy decoding — so `top_k=1` and `temperature=0` are the same behaviour arrived at from two different directions. **`top_k=0`** is the convention for *no filtering*, which reads backwards until you remember that zero means \"unset\" rather than \"keep zero tokens\"." },

    /* ============================================================ 02 */
    { t: "h2", n: "02", id: "top-p", text: "Top-p keeps a fixed mass",
      sub: "The smallest set whose cumulative probability reaches p" },

    { t: "p", text: "Top-p — nucleus sampling — sorts by probability, accumulates from the top, and keeps tokens until the running total reaches p. The reference's worked example is small enough to check in your head, and it contains the detail that everyone gets wrong on the first attempt:" },

    { t: "code", lang: "python", title: "g12.py — the reference's example, checked", code: `ex = torch.tensor([0.50, 0.25, 0.15, 0.05, 0.05])
cum = 0.0
for n, v in zip("ABCDE", ex.tolist()):
    before = cum
    cum += v
    print("%s  p=%.2f  mass before=%.2f  cumulative=%.2f  %s"
          % (n, v, before, cum, "keep" if before < 0.9 else "drop"))`,
      out: `  A  p=0.50  mass before=0.00  cumulative=0.50  keep
  B  p=0.25  mass before=0.50  cumulative=0.75  keep
  C  p=0.15  mass before=0.75  cumulative=0.90  keep
  D  p=0.05  mass before=0.90  cumulative=0.95  drop
  E  p=0.05  mass before=0.95  cumulative=1.00  drop
top_p=0.9 keeps A, B, C -- cumulative 0.90 exactly at C.`,
      hl: [5, 6],
      caption: "Three tokens survive. The test is on the mass *before* each token, not the mass including it — which is why C is kept even though its cumulative total is exactly 0.90." },

    { t: "callout", kind: "trap", title: "The comparison is on the mass before the token",
      body: [
        { t: "p", text: "Write the condition as `cumulative >= p → drop` and you delete token C, because its cumulative total is exactly 0.90. Then `top_p=0.9` on this distribution keeps 0.75 of the mass, not 0.90, and the token that carried the threshold is gone." },
        { t: "p", text: "The correct condition is `mass_before >= p → drop`, which keeps the token that *crosses* the threshold. That is what \"the smallest set whose cumulative probability reaches p\" means, and it is the difference between top-p keeping at least p of the mass and keeping less than p." },
        { t: "p", text: "It matters most at the extreme. With the correct condition, `top_p` can never keep zero tokens — the first token always has mass 0.0 before it — so even `top_p=0.01` leaves the argmax alive. With the wrong condition, a confident step where the top token holds 0.99 would delete everything." }
      ] },

    { t: "code", lang: "python", title: "g11.py — top-p, written correctly", code: `def top_p_filter(lg, p):
    out = lg.clone()
    srt, idx = torch.sort(lg, descending=True)
    ps = torch.softmax(srt, dim=-1)
    before = torch.cumsum(ps, dim=-1) - ps     # mass strictly BEFORE this token
    out[idx[before >= p]] = -float("inf")      # so the crossing token survives
    return out`,
      hl: [5, 6],
      caption: "`cumsum - ps` is the exclusive prefix sum: the mass held by everything ranked above this token. Comparing that against p is the whole rule." },

    /* ============================================================ 03 */
    { t: "h2", n: "03", id: "the-difference", text: "The difference, measured",
      sub: "One of them notices how certain the model is; the other does not" },

    { t: "p", text: "Everything above is definition. The reason to prefer one over the other is behavioural, and it shows up the moment you apply both to the same distribution at several temperatures." },

    { t: "code", lang: "python", title: "g11.py — the same two filters at four temperatures", code: `for t in (0.2, 0.8, 1.0, 1.5):
    s = logits / t
    print("t=%.1f  top_k=50 keeps %4d   top_p=0.9 keeps %5d"
          % (t, int(torch.isfinite(top_k_filter(s, 50)).sum()),
               int(torch.isfinite(top_p_filter(s, 0.9)).sum())))`,
      out: `  t=0.2  top_k=50 keeps   50   top_p=0.9 keeps     2
  t=0.8  top_k=50 keeps   50   top_p=0.9 keeps   237
  t=1.0  top_k=50 keeps   50   top_p=0.9 keeps  1503
  t=1.5  top_k=50 keeps   50   top_p=0.9 keeps  8841`,
      caption: "Top-k keeps 50 candidates at every temperature. Top-p keeps between 2 and 8,841 — a factor of more than four thousand across the same sweep." },

    { t: "p", text: "Top-k is invariant to temperature because dividing by a positive constant is order-preserving: the ranking never changes, so the 50 tokens that were the top 50 are still the top 50. Top-p is not invariant because it reads the *mass*, and temperature is the parameter that moves mass around. This is the precise sense in which temperature and top-p interact and temperature and top-k do not." },

    { t: "viz", title: "The same cut, two rules", caption: "Measured on GPT-2 after \"The capital of France is\". The top-k bar is the same width at every temperature; the top-p bar tracks how spread out the distribution has become.",
      svg: `<svg viewBox="0 0 760 250" width="100%" role="img" aria-label="Top-k and top-p candidate counts against temperature">
  <text x="20" y="24" class="s-label">top_k = 50</text>
  <text x="20" y="128" class="s-label">top_p = 0.9</text>
  <text x="640" y="24" class="s-sub" text-anchor="end">candidates kept</text>

  <rect x="120" y="36" width="60" height="20" rx="4" style="fill:var(--warn)" opacity="0.85"/>
  <text x="190" y="51" class="s-mono">50</text>
  <rect x="270" y="36" width="60" height="20" rx="4" style="fill:var(--warn)" opacity="0.85"/>
  <text x="340" y="51" class="s-mono">50</text>
  <rect x="420" y="36" width="60" height="20" rx="4" style="fill:var(--warn)" opacity="0.85"/>
  <text x="490" y="51" class="s-mono">50</text>
  <rect x="570" y="36" width="60" height="20" rx="4" style="fill:var(--warn)" opacity="0.85"/>
  <text x="640" y="51" class="s-mono">50</text>
  <text x="20" y="78" class="s-sub">identical at every temperature —</text>
  <text x="20" y="92" class="s-sub">dividing logits cannot reorder them</text>

  <rect x="120" y="140" width="4" height="20" rx="2" style="fill:var(--accent)" opacity="0.9"/>
  <text x="134" y="155" class="s-mono">2</text>
  <rect x="270" y="140" width="24" height="20" rx="3" style="fill:var(--accent)" opacity="0.9"/>
  <text x="304" y="155" class="s-mono">237</text>
  <rect x="420" y="140" width="78" height="20" rx="4" style="fill:var(--accent)" opacity="0.9"/>
  <text x="508" y="155" class="s-mono">1,503</text>
  <rect x="570" y="140" width="130" height="20" rx="4" style="fill:var(--accent)" opacity="0.9"/>
  <text x="640" y="155" text-anchor="middle" class="s-mono" style="fill:var(--ink)">8,841</text>

  <text x="150" y="196" text-anchor="middle" class="s-label">tau 0.2</text>
  <text x="300" y="196" text-anchor="middle" class="s-label">tau 0.8</text>
  <text x="450" y="196" text-anchor="middle" class="s-label">tau 1.0</text>
  <text x="600" y="196" text-anchor="middle" class="s-label">tau 1.5</text>

  <text x="20" y="228" class="s-sub">Bars are on a square-root scale so the 2 is visible beside the 8,841; the numbers are exact.</text>
</svg>` },

    { t: "p", text: "The same property shows up across prompts rather than across temperatures, which is the form it takes in production — you are not sweeping temperature at inference time, but every request is a different prompt." },

    { t: "code", lang: "python", title: "g12.py — three prompts, tau = 1.0 throughout", code: `for text in ("The capital of France is",
             "The Eiffel Tower is located in the city of",
             "She opened the door and"):
    lg, _ = next_logits(text)
    srt = torch.sort(torch.softmax(lg, dim=-1), descending=True).values
    before = torch.cumsum(srt, 0) - srt
    for tp in (0.5, 0.9, 0.95, 0.99):
        print("  top_p=%.2f keeps %6d   top_k=50 keeps 50   top-1 prob %.6f"
              % (tp, int((before < tp).sum().item()), srt[0].item()))`,
      out: `  prompt: 'The capital of France is'
    top_p=0.50 keeps     32   top_k=50 keeps 50   top-1 prob 0.084593
    top_p=0.90 keeps   1503   top_k=50 keeps 50   top-1 prob 0.084593
    top_p=0.95 keeps   3119   top_k=50 keeps 50   top-1 prob 0.084593
    top_p=0.99 keeps   9144   top_k=50 keeps 50   top-1 prob 0.084593

  prompt: 'The Eiffel Tower is located in the city of'
    top_p=0.50 keeps     52   top_k=50 keeps 50   top-1 prob 0.063779
    top_p=0.90 keeps    953   top_k=50 keeps 50   top-1 prob 0.063779
    top_p=0.95 keeps   1759   top_k=50 keeps 50   top-1 prob 0.063779
    top_p=0.99 keeps   4859   top_k=50 keeps 50   top-1 prob 0.063779

  prompt: 'She opened the door and'
    top_p=0.50 keeps     25   top_k=50 keeps 50   top-1 prob 0.115628
    top_p=0.90 keeps    435   top_k=50 keeps 50   top-1 prob 0.115628
    top_p=0.95 keeps   1027   top_k=50 keeps 50   top-1 prob 0.115628`,
      caption: "Three prompts at one temperature. Top-p 0.9 keeps 1,503, 953 and 435 candidates — top-k keeps 50 on all three, including the one where the model is most certain and 50 is far too many." },

    { t: "callout", kind: "tradeoff", title: "Which one to reach for",
      body: [
        { t: "p", text: "**Top-p, almost always.** The adaptiveness is the point: on the confident prompt above it narrowed to 435 candidates and on the vague one it opened to 1,503, and no fixed k can do that. It is also the parameter every major provider exposes, while several of them do not expose top-k at all (1.15)." },
        { t: "p", text: "**Top-k when you need a bound.** If you are writing a sampler yourself, top-k gives you a fixed amount of work per step — sort, take 50, done — where top-p's cost depends on the distribution. It is also the only truncation available on some local inference stacks." },
        { t: "p", text: "**Both, occasionally, in that order.** `top_k=50` then `top_p=0.9` is a common default in local serving: top-k puts a hard ceiling on how wide things can get, and top-p tightens it further on confident steps. That is what the pipeline in 1.1 measured — 50,257 to 50 to 21." },
        { t: "p", text: "What is never a good idea is tuning top-p and temperature together against the same eval. The measurement in §03 is the reason: top-p's effect is a function of temperature, so the pair you find does not transfer to a different prompt distribution." }
      ] },

    /* ============================================================ 04 */
    { t: "h2", n: "04", id: "edges", text: "The edge values, and what they really mean",
      sub: "top_p=1.0 does not keep everything, and top_p=0 does not keep nothing" },

    { t: "p", text: "Both parameters have edge values that behave slightly differently from what the documentation implies, and both are easy to check." },

    { t: "code", lang: "python", title: "g11.py — the edges", code: `for pp in (0.9, 0.95, 0.99, 1.0):
    kept = int(torch.isfinite(top_p_filter(scaled, pp)).sum().item())
    print("  top_p=%-4.2f keeps %6d of %d tokens" % (pp, kept, V))`,
      out: `  top_p=0.90 keeps   1503 of 50257 tokens
  top_p=0.95 keeps   3119 of 50257 tokens
  top_p=0.99 keeps   9144 of 50257 tokens
  top_p=1.00 keeps  38597 of 50257 tokens`,
      caption: "`top_p=1.0` keeps 38,597 tokens, not 50,257. The missing 11,660 are not removed by the rule — they are removed by float32." },

    { t: "p", text: "At `top_p=1.0` the exclusive prefix sum reaches 1.0 in float32 long before the tail is exhausted, because the remaining tokens hold masses far below the precision of a number that is already close to 1. Every token after that point is compared against a prefix sum that has saturated, and is dropped. The effect is harmless — those 11,660 tokens held less than 10⁻⁷ of the mass between them — but it is a good reminder that \"keep everything\" is implemented as arithmetic and arithmetic has a floor." },

    { t: "table",
      head: ["Setting", "What it means", "Equivalent to"],
      rows: [
        ["`top_k=0`", "No top-k filtering — the convention for \"unset\"", "Not filtering at all"],
        ["`top_k=1`", "Keep the single highest-scoring token", "`temperature=0`, greedy"],
        ["`top_p=1.0`", "Keep everything with representable mass", "No truncation, in practice"],
        ["`top_p` ≤ top-1 prob", "Keep exactly one token", "Greedy, but only on this step"],
        ["`top_p=0`", "Keep one token — the first has zero mass before it", "Greedy, on every step"]
      ],
      caption: "Three different routes to greedy decoding. `top_p=0` reaching greedy rather than keeping nothing is a direct consequence of the before-the-token comparison in §02." },

    { t: "callout", kind: "insight", title: "The parameter a provider does not expose is a decision they made for you",
      body: [
        { t: "p", text: "OpenAI's chat completions do not accept `top_k`. Anthropic and Google do. HuggingFace's `generate()` accepts both and defaults `top_k` to **50**, which surprises people who assume an unset parameter means no filtering — it means 50 unless you pass `top_k=0`." },
        { t: "p", text: "That default is why the temperature ladder in 1.2 had to pass `top_k=0, top_p=1.0` explicitly. Without them, the tau = 1.4 row would have been measuring temperature *and* a 50-token truncation, and the point of the ladder would have been lost." },
        { t: "p", text: "Whenever you compare behaviour across providers or across libraries, the first thing to check is what each one does with the parameters you did not set. 1.15 has the full table." }
      ] },

    /* ============================================================ exercise */
    { t: "exercise", kind: "Challenge", title: "Find the k that matches top-p on average",
      difficulty: "core", minutes: 25,
      body: [
        { t: "p", text: "Teams migrating from a provider that exposes `top_k` to one that only exposes `top_p` ask the obvious question: what p is my k? There is no exact answer, because the two rules differ on every step — but there is a useful approximate one for a given workload." },
        { t: "p", text: "Compute it for a set of prompts, and then show how badly the approximation holds." }
      ],
      requirements: [
        "Take next-token logits for at least six varied prompts — some where the model is certain, some where it is not",
        "For each prompt, find the top_p value that keeps exactly 50 candidates",
        "Report the mean of those p values, and the minimum and maximum",
        "Report, at that mean p, how many candidates are actually kept on each prompt",
        "State in one line what this says about migrating a top_k setting to top_p"
      ],
      hint: "For a given prompt the candidate count is monotone in p, so you can bisect. Getting exactly 50 may be impossible where two tokens carry identical mass — take the smallest p that keeps at least 50.",
      solution: { lang: "python", title: "g13_ex.py",
        code: `import torch
from transformers import GPT2LMHeadModel, GPT2TokenizerFast

tok = GPT2TokenizerFast.from_pretrained("gpt2")
model = GPT2LMHeadModel.from_pretrained("gpt2").eval()

PROMPTS = ["The capital of France is",
           "The Eiffel Tower is located in the city of",
           "She opened the door and",
           "def fibonacci(n):",
           "2 + 2 =",
           "Dear Sir or Madam,"]

def kept(logits, p):
    srt = torch.sort(torch.softmax(logits, dim=-1), descending=True).values
    return int(((torch.cumsum(srt, 0) - srt) < p).sum().item())

rows = []
for text in PROMPTS:
    ids = tok(text, return_tensors="pt").input_ids
    with torch.no_grad():
        lg = model(ids).logits[0, -1]
    lo, hi = 0.0, 1.0
    while hi - lo > 1e-6:                      # smallest p keeping >= 50
        mid = (lo + hi) / 2
        if kept(lg, mid) < 50: lo = mid
        else:                  hi = mid
    rows.append((text, hi, lg))

ps = [r[1] for r in rows]
mean_p = sum(ps) / len(ps)
print("p that keeps 50 candidates, per prompt:")
for text, p, _ in rows:
    print("  %-46s p=%.4f" % (repr(text), p))
print("mean %.4f   min %.4f   max %.4f" % (mean_p, min(ps), max(ps)))
print()
print("at the mean p=%.4f, candidates actually kept:" % mean_p)
for text, _, lg in rows:
    print("  %-46s %5d" % (repr(text), kept(lg, mean_p)))`,
        out: `p that keeps 50 candidates, per prompt:
  'The capital of France is'                     p=0.5474
  'The Eiffel Tower is located in the city of'   p=0.4920
  'She opened the door and'                      p=0.6281
  'def fibonacci(n):'                            p=0.6410
  '2 + 2 ='                                      p=0.7033
  'Dear Sir or Madam,'                           p=0.7392
mean 0.6252   min 0.4920   max 0.7392

at the mean p=0.6252, candidates actually kept:
  'The capital of France is'                       102
  'The Eiffel Tower is located in the city of'     121
  'She opened the door and'                         49
  'def fibonacci(n):'                               42
  '2 + 2 ='                                         21
  'Dear Sir or Madam,'                              20`,
        notes: [
          { t: "p", text: "The p that matches k = 50 ranges from 0.4920 to 0.7392 across six prompts — a spread of nearly 0.25 on a parameter whose entire useful range is about 0.5 wide. There is no single p that is equivalent to k = 50; the question the migrating team asked does not have an answer." },
          { t: "p", text: "The second table is the more useful half. At the mean p, the candidate count runs from 20 to 121 — a factor of six. And the direction is the one you want: the prompts where the model is most constrained (`'2 + 2 ='`, `'Dear Sir or Madam,'`) get 21 and 20 candidates, while the vague ones get 102 and 121. Top-k would have given all six of them 50, which is too many for the arithmetic and too few for the open-ended continuation." },
          { t: "p", text: "So the honest advice for the migration is not to find an equivalent p. It is to say that top-p is a better rule, pick a value in the 0.9–0.95 range that the providers default to, and re-run the eval — because the behaviour will change, and it will change for the better on exactly the inputs where top-k was worst." }
        ] } },

    /* ============================================================ scenario */
    { t: "callout", kind: "scenario", title: "Incident: the SQL generator that started inventing column names",
      body: [
        { t: "p", text: "**Symptom.** A text-to-SQL feature generated valid queries against the right tables for months. After a change to \"improve variety in the explanation text\", roughly 4% of generated queries began referencing columns that did not exist. The failures were not reproducible on retry." },
        { t: "p", text: "**What changed.** One line: `top_p` went from 0.9 to 0.98, on the request that produced both the SQL and its natural-language explanation. Temperature was untouched at 0.2." },
        { t: "p", text: "**Mechanism.** At a column-name position the model is normally very certain — the schema is in the prompt and one token dominates. At `top_p=0.9` that step admits a handful of candidates, all of them real column names. At 0.98 the same step admits the plausible-looking tail: tokens that complete to column names from *other* tables in the schema, or to grammatically valid identifiers that were never in it. The measurement in §03 is this effect exactly — raising p from 0.90 to 0.99 took one prompt from 1,503 candidates to 9,144, and the tokens you add are by construction the ones the model thought were wrong." },
        { t: "p", text: "**Fix.** Two requests instead of one: the SQL at `top_p=0.9`, the explanation at 0.98. The generalisable lesson is that a sampling setting applies to every position in a response, so a response that mixes a machine-checked part with a human-read part cannot be tuned as one thing. The sturdier fix, which they also took, is grammar-constrained decoding — 3.13 — where an invalid column name is not merely unlikely but unrepresentable." }
      ] }
  ],

  takeaways: [
    "Top-k and top-p are the only sampling parameters that make a token **impossible** — they set logits to negative infinity, so softmax gives those tokens exactly zero.",
    "**Top-k keeps a fixed count.** Because dividing by a positive temperature preserves order, top-k keeps the same 50 tokens at every temperature — measured at tau = 0.2, 0.8, 1.0 and 1.5.",
    "**Top-p keeps a fixed mass**, so its count tracks the shape of the distribution: 2 candidates at tau = 0.2 and 8,841 at tau = 1.5 on the same logits.",
    "The comparison is on the mass **before** each token, not including it — which is why the token that crosses the threshold survives, and why `top_p=0` gives greedy rather than nothing.",
    "Across three prompts at one temperature, top-p 0.9 kept 1,503, 953 and 435 candidates while top-k 50 kept 50 on all three — adapting where a fixed count cannot.",
    "`top_p=1.0` keeps 38,597 of 50,257 tokens, not all of them: the exclusive prefix sum saturates in float32 and the remaining tail holds under 10⁻⁷ of the mass.",
    "There are three routes to greedy: `temperature=0`, `top_k=1`, and any `top_p` at or below the top token's probability.",
    "HuggingFace's `generate()` defaults `top_k=50`. An unset parameter is not an inactive one, and comparisons across libraries have to account for that.",
    "There is no p equivalent to a given k. Measured across six prompts, the p matching k = 50 ranged from 0.4920 to 0.7392."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A distribution is [0.50, 0.25, 0.15, 0.05, 0.05]. How many tokens does `top_p=0.9` keep?",
        options: ["2", "3", "4", "5"],
        answer: 1,
        why: "The mass before each token is 0.00, 0.50, 0.75, 0.90, 0.95; the rule drops tokens whose prefix mass has already reached p, so the first three survive and the last two do not. Answering 2 is the off-by-one from testing the cumulative total *including* the token — that would drop C at exactly 0.90 and keep only 0.75 of the mass. Answering 4 or 5 tests against a cumulative that has not yet exceeded p, which keeps more mass than requested." },

      { stem: "You raise temperature from 0.8 to 1.5 on a request with both `top_k=50` and `top_p=0.9`. What happens to the number of candidates the sampler draws from?",
        options: ["It rises, because top-p now admits more", "It stays at 50, because top-k runs first and caps it", "It falls, because the distribution flattened", "It cannot be determined without the logits"],
        answer: 1,
        why: "Top-k runs first and leaves exactly 50 tokens; top-p then operates on that 50-token set, so however much the distribution flattens the count cannot exceed 50. At tau = 1.5 the flattening means top-p is unlikely to remove any of the 50, so the answer is 50 rather than fewer. The first option is what top-p would do alone — 8,841 candidates at that temperature — and forgets that top-k has already capped the set. The third confuses flattening with narrowing. The fourth is over-cautious: the cap holds regardless of the logits." },

      { stem: "Why is `top_k` unaffected by temperature while `top_p` is?",
        options: ["Because top-k is applied before temperature", "Because dividing logits by a positive constant preserves their order, and top-k reads only the order", "Because top-k operates on logits and top-p on probabilities", "Because top-k is a provider-side setting and top-p is client-side"],
        answer: 1,
        why: "Temperature divides every logit by the same positive number, which cannot reorder them — so the top 50 before the division are the top 50 after it, which is what the measurement of 50 candidates at four temperatures shows. Top-p reads cumulative mass, and mass is exactly what temperature redistributes. The first option has the order wrong: temperature is applied first, and it would not matter if it were not. The third is superficially true of typical implementations but is not the reason — you could implement top-k on probabilities and get the identical answer. The fourth is invented; both are request parameters." },

      { stem: "Your team is migrating from a provider that exposes `top_k=50` to one that only exposes `top_p`. What do you tell them?",
        options: ["Use top_p=0.5, which keeps about 50 tokens", "There is no equivalent value; pick a standard top_p and re-run the eval", "Set top_p=0.9, which is mathematically equivalent to top_k=50", "Keep top_k=50 and ignore top_p, since the provider will apply its default"],
        answer: 1,
        why: "Measured across six prompts, the p that keeps exactly 50 candidates ranged from 0.4920 to 0.7392 — the two rules disagree on every step, so no fixed p reproduces a fixed k. The first and third options both assert an equivalence that the measurement rules out, and 0.9 in particular kept between 435 and 1,503 candidates on the prompts tested. The fourth misunderstands the migration: a parameter the provider does not accept is either ignored or an error, and in neither case does the old behaviour survive." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "This is the reference's own first interview question, and the one most often answered with a definition rather than a difference.",
    questions: [
      { level: "core",
        q: "Explain temperature versus top-p. When do you use each?",
        strong: "A strong answer separates them by what they operate on — the shape against the candidate set — and says why they should not be tuned together. Reciting both definitions without naming the interaction is the average answer.",
        answer: [
          { t: "p", text: "They act at different stages on different things. Temperature divides every logit before the softmax, which changes how much probability separates the candidates but removes none of them. Top-p truncates: it keeps the smallest set of tokens whose cumulative mass reaches p, and everything else becomes impossible rather than unlikely." },
          { t: "p", text: "So the division of labour is: temperature for overall randomness, top-p for the tail. And the reason the providers say to adjust one and not both is that they are not independent — temperature moves mass, and mass is what top-p reads. On one prompt I measured, `top_p=0.9` kept 2 candidates at tau = 0.2 and 8,841 at tau = 1.5. Tuning them jointly is fitting a surface with a ridge in it." },
          { t: "p", text: "For the concrete recommendation: temperature 0 for anything with a right answer, where top-p is inert anyway because the sampler is skipped. For open-ended work, move temperature and leave top-p at the provider's default of 0.9 or 0.95." }
        ] },

      { level: "core",
        q: "What is the difference between top-k and top-p?",
        strong: "Fixed count against fixed mass, and then the consequence: only one of them adapts to how certain the model is at that step.",
        answer: [
          { t: "p", text: "Top-k keeps the k highest-scoring tokens. Top-p keeps the smallest set whose cumulative probability reaches p. That is the definition, and the interesting part is what follows from it." },
          { t: "p", text: "Top-k is blind to the shape of the distribution. On a step where one token holds 90% of the mass, `top_k=50` still admits 49 tokens that the model thinks are wrong. Top-p on the same step collapses to one or two. Measured across three prompts at the same temperature, top-p 0.9 kept 1,503, 953 and 435 candidates — top-k kept 50 on all three." },
          { t: "p", text: "The corollary worth adding is that there is no conversion between them. I tried to find the p matching k = 50 across six prompts and got values from 0.4920 to 0.7392, so a team migrating between providers cannot translate their setting; they have to re-evaluate." }
        ] },

      { level: "advanced",
        q: "Someone raises top_p from 0.9 to 0.98 and a downstream parser starts failing. Explain what happened.",
        strong: "A strong answer connects the parameter change to the specific positions where it does damage, and separates the immediate fix from the structural one.",
        answer: [
          { t: "p", text: "Raising p admits exactly the tokens the model ranked lowest — by construction, the ones it was least confident in. On positions where the model is normally very certain, such as a column name that appears in the schema in the prompt, `top_p=0.9` admits a handful of correct candidates and 0.98 admits the plausible-looking tail: identifiers from other tables, or grammatically valid names that were never there." },
          { t: "p", text: "The measurement that makes this concrete: on one prompt, raising p from 0.90 to 0.99 took the candidate set from 1,503 to 9,144. Every one of the 7,641 added tokens is a token the model had already ranked below everything it kept." },
          { t: "p", text: "The immediate fix is to stop tuning one sampling setting for a response that contains both machine-parsed and human-read content — split it into two requests with different settings. The structural fix is grammar-constrained decoding, where an invalid identifier is not low-probability but unrepresentable, which is 3.13. I would name both, because the first ships today and the second removes the class of bug." }
        ] },

      { level: "advanced",
        q: "You are implementing top-p yourself. What is the detail you have to get right?",
        strong: "The comparison is on the exclusive prefix sum. A strong answer also says what breaks if you get it wrong, at both ends of the range.",
        answer: [
          { t: "p", text: "The test has to be on the mass held by everything ranked *above* the token — the exclusive prefix sum — not on the cumulative total including it. Written as `cumsum - probs >= p → drop`, the token that crosses the threshold survives, which is what \"the smallest set whose cumulative probability reaches p\" means." },
          { t: "p", text: "Get it wrong and two things break. On the reference's example of [0.50, 0.25, 0.15, 0.05, 0.05], testing the inclusive sum drops the third token at exactly 0.90, so `top_p=0.9` keeps 0.75 of the mass instead of 0.90. Worse, at the confident end, a step where the top token holds 0.99 would have every token dropped and the sampler would have nothing to draw from." },
          { t: "p", text: "The other detail I would mention is the edge at `top_p=1.0`. It does not keep the whole vocabulary — the prefix sum saturates in float32 and the far tail is dropped. On GPT-2 that was 38,597 of 50,257 tokens kept, with the missing ones holding under 10⁻⁷ of the mass between them. Harmless, but worth knowing before you spend a morning on it." }
        ] }
    ]
  }
});
