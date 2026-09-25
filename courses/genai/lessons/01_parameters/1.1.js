EC.receiveLesson({
  id: "1.1",

  lede: "Every parameter in this module is a modification to one thing: the probability distribution a model produces over its vocabulary at each step. Before any of them can make sense, that object has to be real — so this lesson takes GPT-2, asks it for the next token after five words, and walks the 50,257 numbers it returns through each stage of the sampler, printing what the stage did. By the end, `temperature`, `top_p`, `top_k` and the penalties are not settings you copied from a blog post; they are four named operations on a vector you have already seen.",

  objectives: [
    "Describe what a language model emits at each step, and why those numbers are not probabilities",
    "Convert logits to a distribution with softmax, and explain why only the differences between logits matter",
    "Name the four sampling stages in the order they are applied, and say which one removes candidates and which only rescales",
    "Predict whether changing temperature will change what top-k keeps, and what top-p keeps",
    "Explain why greedy decoding is not the same as the model's best answer"
  ],

  prerequisites: [],

  blocks: [

    /* ============================================================ 01 */
    { t: "h2", n: "01", id: "what-comes-out", text: "What actually comes out of a model",
      sub: "One score per vocabulary entry — not a word, not a probability" },

    { t: "p", text: "A language model is a function from a sequence of token ids to a vector of scores. Not a word, not a sentence, not a probability — a vector of raw scores called **logits**, one for every entry in the vocabulary. Everything you can configure at inference time is a modification of that vector, or of how one entry is drawn from it." },

    { t: "p", text: "So start by looking at it. GPT-2 is small enough to run on a laptop and old enough to be predictable, which makes it a good specimen. Five tokens in; one score per vocabulary entry out." },

    { t: "code", lang: "python", title: "g11.py — stage 0", code: `import torch
from transformers import GPT2LMHeadModel, GPT2TokenizerFast

tok = GPT2TokenizerFast.from_pretrained("gpt2")
model = GPT2LMHeadModel.from_pretrained("gpt2").eval()

ids = tok("The capital of France is", return_tensors="pt").input_ids

with torch.no_grad():
    logits = model(ids).logits[0, -1]      # the LAST position: next-token scores

print("prompt ids  :", ids[0].tolist())
print("logit vector:", tuple(logits.shape))
print("range       : min %.4f  max %.4f" % (logits.min(), logits.max()))

probs = torch.softmax(logits, dim=-1)
top = torch.topk(logits, 8)
for lg, ix in zip(top.values.tolist(), top.indices.tolist()):
    print("%-12s %10.4f %12.6f" % (repr(tok.decode([ix])), lg, probs[ix].item()))`,
      out: `prompt ids  : [464, 3139, 286, 4881, 318]
logit vector: (50257,)
range       : min -129.8683  max -100.2498

token             logit  probability cumulative
' the'        -100.2498     0.084593   0.084593
' now'        -100.8176     0.047946   0.132539
' a'          -100.8555     0.046160   0.178699
' France'     -101.2102     0.032377   0.211076
' Paris'      -101.2143     0.032245   0.243321
' in'         -101.4052     0.026641   0.269961
' also'       -101.4141     0.026405   0.296366
' not'        -101.5168     0.023828   0.320194`,
      caption: "The model was asked for one thing — the score of every possible next token — and returned 50,257 numbers. Three details in that output are worth stopping on." },

    { t: "p", text: "**First: every logit is negative.** They run from −129.87 to −100.25, and nothing in that range looks like a probability. Logits are unnormalised; their absolute values are an artefact of the final linear layer and carry no meaning on their own." },

    { t: "p", text: "**Second: only the differences matter.** Softmax is invariant to adding a constant to every logit, because the constant appears in the numerator and in every term of the denominator and cancels. You can check it rather than trust it:" },

    { t: "code", lang: "python", title: "g11b.py — shift invariance", code: `a = torch.softmax(logits, dim=-1)
b = torch.softmax(logits - logits.max(), dim=-1)   # shift so the max is 0
c = torch.softmax(logits + 1000.0, dim=-1)         # shift the other way

print("softmax(logits)        top prob: %.8f" % a.max())
print("softmax(logits - max)  top prob: %.8f" % b.max())
print("softmax(logits + 1000) top prob: %.8f" % c.max())
print("largest disagreement : %.3e" % max((a - b).abs().max(), (a - c).abs().max()))`,
      out: `raw logits run from -129.8683 to -100.2498 -- every one negative.
softmax(logits)          top prob: 0.08459266
softmax(logits - max)    top prob: 0.08459266
softmax(logits + 1000)   top prob: 0.08459508
largest disagreement between the three: 2.429e-06`,
      caption: "Shifting all 50,257 logits by +1000 changes the top probability in the sixth decimal place — and that residue is float32 rounding, not mathematics. Subtracting the maximum is what every real softmax implementation does first, for exactly this reason: it keeps `exp()` away from overflow at no cost to the answer." },

    { t: "p", text: "**Third: the distribution is long-tailed.** The eight most likely tokens together hold 0.3202 of the mass. The other 50,249 hold two thirds of it. That single fact is the reason top-p and top-k exist at all — if the top few candidates carried almost everything, there would be nothing to truncate." },

    { t: "callout", kind: "trap", title: "A logit is not a score out of anything",
      body: [
        { t: "p", text: "The most common mistake in reading model output is treating a logit as a confidence. It is not on a scale. A logit of −100.25 is not \"bad\"; in this vector it is the **highest** score. And because softmax normalises across the whole vocabulary, the same logit produces a different probability depending on what the other 50,256 scores happen to be." },
        { t: "p", text: "If you want a number that means something on its own, take the probability — and even then, read 1.7 before treating it as a confidence." }
      ] },

    /* ============================================================ 02 */
    { t: "h2", n: "02", id: "the-pipeline", text: "Four stages between the scores and the token",
      sub: "The order is fixed, and it is the order the documentation implies but never draws" },

    { t: "p", text: "Given that vector, the server still has to choose one token. Between the logits and that choice sit four stages, applied in a fixed order. Every parameter in this module attaches to one of them." },

    { t: "viz", title: "From logits to a token", caption: "Temperature reshapes; top-k and top-p remove; penalties reach backwards into what has already been generated. Only then is a token drawn — and appended, so the whole thing runs again.",
      svg: `<svg viewBox="0 0 760 250" width="100%" role="img" aria-label="The sampling pipeline from logits to token">
  <defs>
    <marker id="gp-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
      <path d="M0,0 L10,5 L0,10 z" style="fill:var(--line)"/>
    </marker>
  </defs>

  <rect x="8" y="46" width="104" height="52" rx="8" class="s-fill-2 s-stroke"/>
  <text x="60" y="68" text-anchor="middle" class="s-label">model</text>
  <text x="60" y="84" text-anchor="middle" class="s-sub">50,257 logits</text>

  <rect x="140" y="46" width="112" height="52" rx="8" class="s-fill" style="stroke:var(--accent)" stroke-width="1.4"/>
  <text x="196" y="66" text-anchor="middle" class="s-label">1 · temperature</text>
  <text x="196" y="82" text-anchor="middle" class="s-sub">rescales only</text>

  <rect x="280" y="46" width="104" height="52" rx="8" class="s-fill" style="stroke:var(--warn)" stroke-width="1.4"/>
  <text x="332" y="66" text-anchor="middle" class="s-label">2 · top-k</text>
  <text x="332" y="82" text-anchor="middle" class="s-sub">keeps a fixed count</text>

  <rect x="412" y="46" width="104" height="52" rx="8" class="s-fill" style="stroke:var(--warn)" stroke-width="1.4"/>
  <text x="464" y="66" text-anchor="middle" class="s-label">3 · top-p</text>
  <text x="464" y="82" text-anchor="middle" class="s-sub">keeps a fixed mass</text>

  <rect x="544" y="46" width="104" height="52" rx="8" class="s-fill" style="stroke:var(--violet)" stroke-width="1.4"/>
  <text x="596" y="66" text-anchor="middle" class="s-label">4 · penalties</text>
  <text x="596" y="82" text-anchor="middle" class="s-sub">reads the history</text>

  <rect x="676" y="46" width="76" height="52" rx="8" class="s-fill-2" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="714" y="68" text-anchor="middle" class="s-label">sample</text>
  <text x="714" y="84" text-anchor="middle" class="s-sub">one token</text>

  <line x1="112" y1="72" x2="136" y2="72" style="stroke:var(--line)" stroke-width="1.4" marker-end="url(#gp-arrow)"/>
  <line x1="252" y1="72" x2="276" y2="72" style="stroke:var(--line)" stroke-width="1.4" marker-end="url(#gp-arrow)"/>
  <line x1="384" y1="72" x2="408" y2="72" style="stroke:var(--line)" stroke-width="1.4" marker-end="url(#gp-arrow)"/>
  <line x1="516" y1="72" x2="540" y2="72" style="stroke:var(--line)" stroke-width="1.4" marker-end="url(#gp-arrow)"/>
  <line x1="648" y1="72" x2="672" y2="72" style="stroke:var(--line)" stroke-width="1.4" marker-end="url(#gp-arrow)"/>

  <text x="196" y="122" text-anchor="middle" class="s-mono">50,257 left</text>
  <text x="332" y="122" text-anchor="middle" class="s-mono">50 left</text>
  <text x="464" y="122" text-anchor="middle" class="s-mono">21 left</text>
  <text x="596" y="122" text-anchor="middle" class="s-mono">21 left</text>

  <text x="380" y="146" text-anchor="middle" class="s-sub">measured on this prompt at t=0.8, top_k=50, top_p=0.9</text>

  <path d="M714 104 L714 186 L60 186 L60 104" fill="none" style="stroke:var(--line)" stroke-width="1.4" stroke-dasharray="4 3" marker-end="url(#gp-arrow)"/>
  <rect x="282" y="172" width="196" height="28" rx="6" class="s-fill-bg"/>
  <text x="380" y="190" text-anchor="middle" class="s-sub">token appended — run it all again</text>

  <text x="8" y="226" class="s-sub">Greedy decoding skips stages 1-4 entirely and returns argmax of the raw logits.</text>
</svg>` },

    { t: "p", text: "Two of those stages remove candidates and two do not, and the distinction is worth holding onto. Temperature changes the *shape* of the distribution without making any token impossible. Penalties change scores without removing anything either. Only top-k and top-p actually delete candidates — they set logits to negative infinity so that softmax gives them exactly zero." },

    { t: "callout", kind: "mental", title: "The mental model",
      body: [
        { t: "p", text: "Think of the vocabulary as a very long queue sorted by score. **Temperature** decides how steep the slope from front to back is. **Top-k** cuts the queue at a fixed position. **Top-p** cuts it wherever the accumulated mass reaches a threshold, so the cut moves when the slope changes. **Penalties** pull specific tokens out of position because of what has already been said. Then one token is drawn from whatever queue is left." },
        { t: "p", text: "Everything in lessons 1.2 to 1.4 is a detail of one of those four operations." }
      ] },

    /* ============================================================ 03 */
    { t: "h2", n: "03", id: "temperature-rescales", text: "Stage 1 rescales the whole vector",
      sub: "Divide every logit by tau, then softmax — and watch the entropy move" },

    { t: "p", text: "Temperature divides every logit by a constant before the softmax. Small tau exaggerates the gaps between scores and the distribution peaks; large tau shrinks them and the distribution flattens. Nothing is removed at any setting, which is the point people miss — a token with probability 10⁻⁹ at tau = 0.2 is still *reachable*, just not in your lifetime." },

    { t: "code", lang: "python", title: "g11.py — stage 1", code: `for t in (0.2, 0.7, 1.0, 1.5):
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
      caption: "The same 50,257 logits at four temperatures. `' the'` goes from holding 88% of the mass to holding 1.6% of it, and the number of tokens needed to cover 90% of the distribution goes from 2 to 8,841 — a factor of four thousand, from one division." },

    { t: "p", text: "That last column is the useful one. \"Temperature 0.7 is more creative than 0.2\" is vague; *the model is choosing from 62 plausible tokens instead of 2* is not. The entropy column says the same thing in nats, and is what you would log if you wanted to alert on a model suddenly becoming less certain." },

    { t: "callout", kind: "insight", title: "Why tau = 0 is a special case, not a limit",
      body: [
        { t: "p", text: "Dividing by zero is undefined, so `temperature=0` is not literally a temperature of zero — every implementation special-cases it to mean *take the argmax*. That is why `temperature=0` and `temperature=0.0001` are not quite the same code path, and why some providers document a minimum of 0.01 rather than 0." },
        { t: "p", text: "It also explains a support question you will eventually field: a user reports that `temperature=0` still gives different answers. It does, for reasons that have nothing to do with sampling — see 1.7." }
      ] },

    /* ============================================================ 04 */
    { t: "h2", n: "04", id: "truncation", text: "Stages 2 and 3 cut the tail off",
      sub: "A fixed count, and a fixed mass — and only one of them notices the shape" },

    { t: "p", text: "Top-k keeps the k highest-scoring tokens and discards the rest. Top-p — nucleus sampling — sorts by probability, accumulates from the top, and keeps the smallest set whose cumulative mass reaches p. Both exist to stop the long tail contributing, and they differ in exactly one way: top-k is blind to the shape of the distribution and top-p is not." },

    { t: "code", lang: "python", title: "g11.py — stages 2 and 3", code: `def top_k_filter(lg, k):
    out = lg.clone()
    kth = torch.topk(lg, k).values[-1]
    out[out < kth] = -float("inf")
    return out

def top_p_filter(lg, p):
    out = lg.clone()
    srt, idx = torch.sort(lg, descending=True)
    ps = torch.softmax(srt, dim=-1)
    before = torch.cumsum(ps, dim=-1) - ps      # mass BEFORE this token
    out[idx[before >= p]] = -float("inf")       # so the crossing token survives
    return out

for t in (0.2, 0.8, 1.0, 1.5):
    s = logits / t
    print("t=%.1f  top_k=50 keeps %4d   top_p=0.9 keeps %5d"
          % (t, int(torch.isfinite(top_k_filter(s, 50)).sum()),
               int(torch.isfinite(top_p_filter(s, 0.9)).sum())))`,
      out: `  t=0.2  top_k=50 keeps   50   top_p=0.9 keeps     2
  t=0.8  top_k=50 keeps   50   top_p=0.9 keeps   237
  t=1.0  top_k=50 keeps   50   top_p=0.9 keeps  1503
  t=1.5  top_k=50 keeps   50   top_p=0.9 keeps  8841`,
      hl: [11, 12],
      caption: "Four temperatures, the same two filters. Top-k keeps 50 tokens at every one of them, because dividing by a positive constant cannot change the ranking. Top-p keeps between 2 and 8,841 — a factor of four thousand — because the mass moved." },

    { t: "p", text: "This is the whole argument for preferring top-p, and also the reason the providers tell you to move temperature *or* top-p and not both. The two parameters are not independent: changing temperature silently changes what top-p keeps, so tuning them together means chasing a moving target. Top-k has the opposite property — it is stable under temperature, which makes it predictable and blunt." },

    { t: "callout", kind: "tradeoff", title: "Fixed count against fixed mass",
      body: [
        { t: "p", text: "**Top-k is predictable.** You always know how many candidates there are. On a step where the model is genuinely certain — after `\"The capital of France\"`, the next token is overwhelmingly `\" is\"` — top-k=50 still admits 49 tokens that should never have been in the running." },
        { t: "p", text: "**Top-p adapts.** On a certain step it collapses to two candidates; on an open one it admits thousands. That is the behaviour you usually want, and it is why `top_p` is the parameter most APIs expose and `top_k` the one several of them do not (see 1.15)." },
        { t: "p", text: "The cost is that top-p is only as good as the calibration underneath it. If a model is confidently wrong, top-p faithfully narrows to the confident wrong answers." }
      ] },

    { t: "p", text: "Run all three together and you can watch the candidate set collapse in one pass. This is the pipeline as a server actually applies it:" },

    { t: "code", lang: "python", title: "g11b.py — the whole pipeline, one pass", code: `T, K, TP = 0.8, 50, 0.9

scaled  = logits / T                        # stage 1
after_k = top_k_filter(scaled, K)           # stage 2
after_p = top_p_filter(after_k, TP)         # stage 3
final   = torch.softmax(after_p, dim=-1)    # renormalise over what survived`,
      out: `after temperature  :  50257 candidates (nothing removed -- temperature only rescales)
after top_k=50     :     50 candidates
after top_p=0.90   :     21 candidates

the surviving candidates, renormalised:
  token          p at t=1.0  p after all
  ' the'           0.084593     0.234253
  ' now'           0.047946     0.115202
  ' a'             0.046160     0.109864
  ' France'        0.032377     0.070520
  ' Paris'         0.032245     0.070161
  ' in'            0.026641     0.055265
  ' also'          0.026405     0.054654
  ' not'           0.023828     0.048071
  ' home'          0.023348     0.046862
  ' still'         0.015508     0.028100
  ' under'         0.014248     0.025277
  ' located'       0.013941     0.024598
  ' on'            0.013388     0.023383
  ' one'           0.011295     0.018908
  ' known'         0.009421     0.015071
  ' at'            0.008719     0.013681
  ' an'            0.007959     0.012207
  ' being'         0.007603     0.011529
  ' already'       0.006775     0.009980
  ' to'            0.004720     0.006353
  ' no'            0.004547     0.006062

They summed to 0.713225 before renormalising and 1.000000 after.`,
      caption: "50,257 to 50 to 21. The surviving candidates held 0.713225 of the mass at tau = 0.8; after renormalisation they hold all of it, which is how `' the'` goes from 0.0846 to 0.2343 without its logit changing." },

    { t: "callout", kind: "trap", title: "The renormalisation is where the probability you read comes from",
      body: [
        { t: "p", text: "Providers that return `logprobs` return them **after** truncation and renormalisation, not from the raw distribution. A token reported at 0.23 was at 0.085 in the model's own view of the world; the rest of the number came from deleting 50,236 competitors and dividing through." },
        { t: "p", text: "This matters the moment you try to use a returned logprob as a confidence score — a habit covered properly in 1.16 and again in 9.14. The number is conditional on your sampling settings, so comparing logprobs across requests with different `top_p` compares two different quantities." }
      ] },

    /* ============================================================ 05 */
    { t: "h2", n: "05", id: "penalties", text: "Stage 4 is the only one that looks backwards",
      sub: "Everything else sees one vector; penalties see the transcript" },

    { t: "p", text: "The first three stages operate on the logit vector alone. They have no memory: given the same vector they do the same thing, whether it arrived at step 1 or step 400. Penalties are different — they take the tokens already generated and push those tokens' logits down before sampling." },

    { t: "code", lang: "python", title: "g11.py — stage 4", code: `already = ids[0].tolist()
print("tokens already in the sequence:", [tok.decode([i]) for i in already])

pen = logits.clone()
for i in set(already):
    pen[i] -= 1.0                 # presence-style: flat, once, regardless of count`,
      out: `tokens already in the sequence: ['The', ' capital', ' of', ' France', ' is']
  presence_penalty=1.0 moves those 5 logits down by 1.0 each.
  ' Paris' is not among them, so its logit is unchanged at -101.2143.`,
      caption: "A penalty is a subtraction on a subset of the vector chosen by the history, not by the scores. Which subset, and how much — by count or by appearance, additively or by division — is 1.4." },

    { t: "p", text: "Note what that implies for a long generation: the penalised set grows with every token emitted. After 500 tokens a significant fraction of the vocabulary carries a penalty, which is why aggressive penalty settings degrade long outputs in a way they never do on short ones." },

    /* ============================================================ 06 */
    { t: "h2", n: "06", id: "greedy", text: "Greedy decoding is not the model's best answer",
      sub: "It is the highest-scoring next token, which is a different thing" },

    { t: "p", text: "With `temperature=0` the sampler is skipped and the argmax is returned. People reach for this when they want the \"correct\" answer, and it is the right default for code and extraction. But it is worth being precise about what it gives you, because the prompt above makes the point better than any argument could." },

    { t: "code", lang: "python", title: "g11.py — stage 5", code: `greedy = int(torch.argmax(logits).item())
print("greedy (t=0) always returns:", repr(tok.decode([greedy])))

for t in (0.7, 1.0, 1.5):
    torch.manual_seed(0)
    p = torch.softmax(logits / t, dim=-1)
    draws = torch.multinomial(p, 200, replacement=True)
    print("t=%.1f  %3d distinct tokens in 200 draws" % (t, len(set(draws.tolist()))))`,
      out: `greedy (t=0) always returns: ' the'   logit -100.2498

  t=0.7   48 distinct tokens in 200 draws   top: ' the' x50, ' now' x25, ' a' x16, ' also' x11, ' Paris' x9
  t=1.0  126 distinct tokens in 200 draws   top: ' the' x14, ' France' x10, ' in' x9, ' now' x8, ' Paris' x8
  t=1.5  188 distinct tokens in 200 draws   top: ' now' x3, ' in' x3, ' made' x2, ' rather' x2, ' set' x2`,
      caption: "Greedy returns `' the'` every time. The sampler at tau = 0.7 produced 48 distinct tokens in 200 draws; at tau = 1.5 it produced 188, which is to say it almost never repeated itself." },

    { t: "p", text: "The prompt was `\"The capital of France is\"`. The answer is Paris. GPT-2 ranks `' Paris'` **fifth**, at 0.032245 — behind `' the'`, `' now'`, `' a'` and `' France'`. Greedy decoding will therefore never say Paris here, and running the loop out shows what it says instead:" },

    { t: "code", lang: "python", title: "g11.py — the loop", code: `seq = ids.clone()
for step in range(8):
    with torch.no_grad():
        lg = model(seq).logits[0, -1]
    nxt = int(torch.argmax(lg).item())
    print("%-4d %-14s %12.6f" % (step + 1, repr(tok.decode([nxt])),
                                 torch.softmax(lg, dim=-1)[nxt].item()))
    seq = torch.cat([seq, torch.tensor([[nxt]])], dim=1)

print(repr(tok.decode(seq[0].tolist())))`,
      out: `  step chosen          probability    context
  1    ' the'             0.084593          5
  2    ' capital'         0.169684          6
  3    ' of'              0.927087          7
  4    ' the'             0.282779          8
  5    ' French'          0.136678          9
  6    ' Republic'        0.300632         10
  7    ','                0.339132         11
  8    ' and'             0.280986         12

greedy continuation: 'The capital of France is the capital of the French Republic, and'`,
      hl: [1, 2, 3, 4, 5, 6, 7],
      caption: "Eight greedy steps. Each one is locally the highest-scoring token; together they produce a sentence that restates the prompt and says nothing." },

    { t: "callout", kind: "trap", title: "Greedy is locally optimal and globally arbitrary",
      body: [
        { t: "p", text: "Each of those eight tokens was the best available *at that step*. The sequence they form — `\"the capital of the French Republic\"` — is a tautology, and the model walked into it because step 1 committed to `' the'` and every step after that was the best continuation of a bad start. Nothing in greedy decoding can back up." },
        { t: "p", text: "This is also the cleanest demonstration of why stage 4 exists. Look at steps 1–3 against the original prompt: `\"capital of\"` is repeated verbatim. No penalty was applied, so nothing discouraged it." },
        { t: "p", text: "The fix is not a higher temperature — at tau = 1.5 the model produced 188 different tokens in 200 draws, most of them nonsense. It is beam search or a penalty, and beyond that a model large enough to rank `' Paris'` first. GPT-2 is not that model, which is exactly why it is a good specimen: it makes the mechanism visible." }
      ] },

    /* ============================================================ 07 */
    { t: "h2", n: "07", id: "the-loop", text: "And then it all runs again",
      sub: "Autoregression is the reason a request costs what it costs" },

    { t: "p", text: "The chosen token is appended to the sequence and the whole forward pass repeats. That loop is why generation is sequential and why output tokens cost several times what input tokens cost: the prompt is processed once, in parallel, but each output token requires its own pass over the model. 3.1 takes that apart properly — the two phases even have different names and different bottlenecks — but the shape is already visible in the `context` column above, which grows by one on every line." },

    { t: "table",
      head: ["Stage", "Parameter", "Removes candidates?", "Sees history?", "Lesson"],
      rows: [
        ["Model forward pass", "—", "no", "yes (the prompt)", "3.1"],
        ["1 · Temperature", "`temperature`", "no — rescales only", "no", "1.2"],
        ["2 · Top-k", "`top_k`", "yes — fixed count", "no", "1.3"],
        ["3 · Top-p", "`top_p`", "yes — fixed mass", "no", "1.3"],
        ["4 · Penalties", "`frequency_penalty`, `presence_penalty`", "no — rescales a subset", "yes", "1.4"],
        ["5 · Sample", "`seed`", "—", "no", "1.7"],
        ["Bias and bans", "`logit_bias`", "effectively, at −100", "no", "1.6"],
        ["Stop", "`stop`, `max_tokens`", "ends the loop", "yes", "1.5, 1.6"]
      ],
      caption: "Every parameter in this module, placed on the pipeline. Two of the eight rows remove candidates; the rest reshape, bias, or end the loop." },

    { t: "callout", kind: "good", title: "What to set, and what to leave alone",
      body: [
        { t: "p", text: "For anything with a right answer — extraction, classification, code, structured output — set `temperature=0` and leave every other sampling parameter at its default. You want the argmax and you want it to be the same argmax tomorrow." },
        { t: "p", text: "For anything open-ended, move **one** knob. Temperature is the one to move first, because its effect is monotonic and easy to reason about. Reach for `top_p` when you want the truncation to adapt to how certain the model is at each step, and leave `top_k` alone unless you are working with a local model where it is the only truncation available." },
        { t: "p", text: "Never tune temperature and top-p together against the same eval. The measurement above shows why: they interact, so the surface you are searching has a ridge in it and the pair you land on will not transfer to a different prompt." }
      ] },

    /* ============================================================ exercise */
    { t: "exercise", kind: "Challenge", title: "Find the temperature where top-p stops mattering",
      difficulty: "core", minutes: 25,
      body: [
        { t: "p", text: "The measurement above showed `top_p=0.9` keeping 2 candidates at tau = 0.2 and 8,841 at tau = 1.5. Somewhere below 0.2 there is a temperature at which top-p keeps exactly one token — at which point nucleus sampling has become greedy decoding and the parameter is doing nothing." },
        { t: "p", text: "Find it, for this prompt, and show that the same is not true of top-k." }
      ],
      requirements: [
        "Load GPT-2 and take the next-token logits for \"The capital of France is\", as in the lesson",
        "Write a function that returns how many candidates `top_p=0.9` keeps at a given temperature",
        "Search temperatures from 0.01 to 1.5 and report the largest one at which exactly 1 candidate survives",
        "Report what `top_k=50` keeps at that same temperature, and explain the difference in one sentence",
        "State what this implies about setting both `temperature=0.1` and `top_p=0.9` on a request"
      ],
      hint: "The cut is where the cumulative mass *before* a token first reaches p. Only one candidate survives when the top token alone holds at least 0.9 of the mass — so you are really solving for the temperature at which the top probability crosses 0.9.",
      solution: { lang: "python", title: "g11_ex.py",
        code: `import torch
from transformers import GPT2LMHeadModel, GPT2TokenizerFast

tok = GPT2TokenizerFast.from_pretrained("gpt2")
model = GPT2LMHeadModel.from_pretrained("gpt2").eval()
ids = tok("The capital of France is", return_tensors="pt").input_ids
with torch.no_grad():
    logits = model(ids).logits[0, -1]

def kept_by_top_p(t, p=0.9):
    srt = torch.sort(torch.softmax(logits / t, dim=-1), descending=True).values
    before = torch.cumsum(srt, dim=-1) - srt          # mass strictly before each
    return int((before < p).sum().item())

lo, hi = 0.01, 1.5
while hi - lo > 1e-4:                                  # bisect on a monotone count
    mid = (lo + hi) / 2
    if kept_by_top_p(mid) == 1:
        lo = mid
    else:
        hi = mid

print("largest t where top_p=0.9 keeps 1 token: %.4f" % lo)
print("  top probability there               : %.6f"
      % torch.softmax(logits / lo, dim=-1).max().item())
print("  top_p=0.9 keeps                     : %d" % kept_by_top_p(lo))
print("  top_k=50  keeps                     : 50, at this and every temperature")`,
        out: `largest t where top_p=0.9 keeps 1 token: 0.1898
  top probability there               : 0.900008
  top_p=0.9 keeps                     : 1
  top_k=50  keeps                     : 50, at this and every temperature`,
        notes: [
          { t: "p", text: "The bisection works because the surviving count is monotone in temperature — lowering tau can only concentrate mass, never spread it — so there is a single crossing point rather than a set to search." },
          { t: "p", text: "The answer is not a property of top-p. It is a property of *this prompt*: 0.1898 is the temperature at which `' the'` alone crosses 0.9 here. A prompt where the model is less certain pushes the crossing lower; one where it is more certain pushes it higher. That is the adaptiveness from §04 seen from the other end, and it is why you cannot write down a temperature at which top-p is safe to ignore." },
          { t: "p", text: "The practical reading of the last line: on a request with `temperature=0.1`, `top_p=0.9` is not doing anything at all on confident steps, and is the only thing holding the tail back on uncertain ones. You have not set two mild controls — you have set one control whose strength varies invisibly with the input." }
        ] } },

    /* ============================================================ scenario */
    { t: "callout", kind: "scenario", title: "Incident: the classifier that got worse when they raised the temperature",
      body: [
        { t: "p", text: "**Symptom.** A support-ticket classifier ran at `temperature=0` against a fixed label set and scored 0.94 macro-F1. A rewrite moved it to `temperature=0.3` with `top_p=0.95` — copied from the chat feature's config, which someone had tuned properly — and accuracy fell to 0.88. The prompt, the model and the label set were unchanged." },
        { t: "p", text: "**What the traces showed.** The errors were not spread evenly. Every one of them was a ticket where the top two labels were close — the kind where the model's top probability was around 0.4 rather than 0.9. On those steps, `top_p=0.95` was admitting a dozen labels and the sampler was occasionally drawing the third or fourth. On confident tickets it admitted one and nothing changed." },
        { t: "p", text: "**Mechanism.** Exactly the interaction measured in §04, in production. Temperature 0.3 flattened the distribution; top-p 0.95 then adapted to the flatter distribution and let more through. The two settings were not independent, so a config tuned on open-ended chat — where admitting more candidates is the goal — inverted the behaviour of a task where it is a defect. The 6-point drop was concentrated entirely in the ambiguous 12% of tickets." },
        { t: "p", text: "**Fix.** `temperature=0` for the classifier, which is what a task with a right answer wants, and a separate config object per feature so that a value tuned for one can never be copied into another by editing one file. The follow-up that mattered more: the eval set had 200 tickets and almost none of them were ambiguous, so the regression was invisible until it reached users. 8.10 is about building the set that would have caught it." }
      ] }
  ],

  takeaways: [
    "A model emits **logits** — one unnormalised score per vocabulary entry, 50,257 of them for GPT-2. They are not probabilities and their absolute values carry no meaning.",
    "**Only the differences between logits matter.** Shifting all of them by +1000 changed the top probability by 2.4e-06, which is float32 rounding rather than mathematics.",
    "The distribution is long-tailed: the top 8 tokens held **0.3202** of the mass on the measured prompt. Truncation exists because of that tail, not in spite of it.",
    "**Temperature rescales and removes nothing.** At tau = 0.2 it took 2 tokens to cover 90% of the mass; at tau = 1.5 it took 8,841.",
    "**Top-k keeps a fixed count, top-p a fixed mass.** Top-k kept 50 candidates at every temperature; top-p 0.9 kept between 2 and 8,841 — which is why the two parameters interact and top-k does not.",
    "The probability a provider returns is computed **after** truncation and renormalisation. The surviving 21 candidates held 0.713225 of the mass before renormalising and 1.0 after.",
    "Penalties are the only stage that reads the history, so the penalised set grows with the output and aggressive settings damage long generations specifically.",
    "**Greedy is locally optimal, not correct.** GPT-2 ranks `' Paris'` fifth after \"The capital of France is\" and greedily produces \"the capital of the French Republic\" — a sentence that repeats the prompt and says nothing.",
    "Set `temperature=0` for anything with a right answer, and move exactly one knob for anything else."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "You raise `temperature` from 0.7 to 1.2 on a request that also sets `top_k=50`. How many candidates does the top-k stage now keep?",
        options: ["Fewer than 50, because the distribution flattened", "Exactly 50, unchanged", "More than 50, because more tokens are now plausible", "It depends on how much mass the top 50 hold"],
        answer: 1,
        why: "Top-k keeps a fixed count by definition, and dividing every logit by a positive constant cannot change their ranking — so the same 50 tokens survive at every temperature, as measured at tau = 0.2, 0.8, 1.0 and 1.5. The first and third options describe top-p, whose count moved from 2 to 8,841 across that range. The fourth describes the top-p rule too: top-k never inspects the mass, only the order." },

      { stem: "A provider returns a logprob of −1.45 (probability 0.234) for the chosen token, on a request with `top_p=0.9`. What does that number describe?",
        options: ["The model's raw probability for that token", "The probability after truncation and renormalisation over the surviving candidates", "The token's logit, converted to log space", "The probability the answer as a whole is correct"],
        answer: 1,
        why: "Truncation deletes candidates and the remainder is renormalised, so the reported number is conditional on your sampling settings — in the worked pipeline `' the'` went from 0.0846 raw to 0.2343 after top_k=50 and top_p=0.9 deleted 50,236 competitors. The first option is what people assume and is wrong for exactly that reason. The third confuses a logit with a log-probability: logits are unnormalised and here were all around −100. The fourth is a category error — this is a per-token quantity, and 9.14 covers why it is a poor confidence signal even for the token."},

      { stem: "Which stage of the sampling pipeline is the only one whose behaviour depends on what has already been generated?",
        options: ["Temperature", "Top-p", "Penalties", "The softmax"],
        answer: 2,
        why: "Frequency and presence penalties subtract from the logits of tokens already in the sequence, so the same logit vector produces different output depending on the transcript — which is also why the penalised set grows through a long generation. Temperature and top-p are pure functions of the current logit vector and have no memory at all; softmax is a normalisation and has none either. The distinction matters when you are reproducing a request: the first three stages are deterministic given the vector, and only the penalty stage needs the history to replay." },

      { stem: "GPT-2 ranks `' Paris'` fifth after \"The capital of France is\", at probability 0.032245. What follows for greedy decoding?",
        options: ["Greedy will produce Paris, because it is the correct answer", "Greedy will produce Paris about 3% of the time", "Greedy will never produce Paris on this prompt", "Greedy will produce Paris only if top_p is high enough"],
        answer: 2,
        why: "Greedy returns the argmax, which here is `' the'` at 0.084593 — a token ranked fifth can never be selected, at any setting, because greedy does not sample. The second option describes sampling at tau = 1.0, where `' Paris'` did come up 8 times in 200 draws. The fourth is wrong in two ways: greedy skips the truncation stages entirely, and top-p can only remove candidates, never promote one. The first option mistakes the model's ranking for the world's — it says nothing about correctness, which is the whole point of the measurement." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "The opening question in almost every GenAI loop is some version of \"what do the parameters do\". The answer that lands describes an object, not a vibe.",
    questions: [
      { level: "core",
        q: "Walk me through what happens between my prompt and the token that comes back.",
        strong: "A strong answer names the object first — a vector of logits over the whole vocabulary — then the four stages in order, and says which ones remove candidates. It ends at the loop, because that is what makes output tokens expensive.",
        answer: [
          { t: "p", text: "Say it in one pass: the model produces one unnormalised score per vocabulary entry for the next position — 50,257 of them for GPT-2, around 200,000 for a modern model. Temperature divides every score by a constant, which reshapes the distribution but removes nothing. Top-k keeps a fixed number of the highest scorers. Top-p keeps the smallest set whose cumulative probability reaches p. Penalties push down the scores of tokens already generated. What survives is renormalised and one token is drawn — or, at temperature 0, the sampler is skipped and the argmax is returned." },
          { t: "p", text: "Then close the loop, because it is what the question is usually probing: the chosen token is appended and the entire forward pass repeats. Prompt tokens are processed once in parallel; each output token costs its own pass. That is why the price of an output token is several times the price of an input token on every provider's sheet." },
          { t: "p", text: "If you have a number, use one. \"On the prompt I tested, top-k=50 kept 50 candidates at every temperature and top-p=0.9 kept between 2 and 8,841\" is the sentence that separates someone who has run this from someone who has read about it." }
        ] },

      { level: "core",
        q: "Why are you allowed to say that only the differences between logits matter?",
        strong: "Because softmax is shift-invariant: adding a constant to every logit multiplies numerator and denominator by the same factor. A strong answer gives the one-line algebra and then says where it is used in practice.",
        answer: [
          { t: "p", text: "The algebra is one line. Softmax of `x_i + c` has numerator `exp(x_i)·exp(c)` and denominator `Σ exp(x_j)·exp(c)`; the `exp(c)` cancels. So the distribution depends only on the gaps between logits, never on where the whole vector sits." },
          { t: "p", text: "The practical consequence is worth volunteering: every real implementation subtracts the maximum logit before exponentiating, because `exp()` of a large positive number overflows and the subtraction is free. That is also why raw logits being all negative — in the measured case, −129.87 to −100.25 — is unremarkable rather than a bug." },
          { t: "p", text: "The trap to name is the corollary: a single logit carries no information. You cannot compare a logit from one request to a logit from another, and you cannot read one as a confidence. Only the softmax over a complete vector means anything." }
        ] },

      { level: "advanced",
        q: "Our team sets temperature=0.3 and top_p=0.95 on every request. What would you change?",
        strong: "A strong answer identifies that the two parameters interact, explains the mechanism, and separates the tasks where temperature should be 0 from the ones where it should not — rather than just reciting \"adjust one, not both\".",
        answer: [
          { t: "p", text: "Start with the mechanism rather than the rule. Temperature changes the shape of the distribution; top-p cuts wherever the cumulative mass reaches p. So temperature moves the cut that top-p makes, which means the two are not independent knobs — measured on one prompt, top-p 0.9 kept 2 candidates at tau = 0.2 and 8,841 at tau = 1.5. Tuning them together searches a surface with a ridge in it, and the pair you land on will not transfer." },
          { t: "p", text: "Then split the traffic. Anything with a right answer — classification, extraction, structured output, code — should be at temperature 0, where the sampler is skipped entirely and the other settings are inert. Anything open-ended should move temperature alone and leave top-p at its default." },
          { t: "p", text: "Finally, name what a single shared config costs. If chat and classification read the same settings object, a value tuned for chat silently degrades the classifier, and it degrades it only on the ambiguous inputs — the ones a small eval set is least likely to contain. That is a regression that reaches users before it reaches the dashboard." }
        ] },

      { level: "advanced",
        q: "A user reports that a token the API returned with probability 0.92 was wrong. What do you tell them?",
        strong: "A strong answer explains what the 0.92 is conditional on, separates next-token probability from answer correctness, and offers what would actually measure what the user wants.",
        answer: [
          { t: "p", text: "First, say what the number is: the probability of that **token**, computed after truncation and renormalisation over the candidates your sampling settings left alive. In the worked pipeline a token at 0.0846 in the model's own distribution was reported at 0.2343 once top-k and top-p had deleted the competition. So 0.92 is partly a statement about the model and partly a statement about the request's `top_p`." },
          { t: "p", text: "Second, separate the quantities. Even a perfectly calibrated next-token probability says nothing about whether the answer is right. The measured prompt makes this concrete — GPT-2 puts 0.0846 on `' the'` and 0.0322 on `' Paris'`, and the token it is most confident about is the one that leads to a tautology." },
          { t: "p", text: "Third, offer the thing that would help. If they want to know whether an answer is trustworthy, the instruments are self-consistency across samples, an entailment check against the retrieved context, or a calibrated judge — 11.4 and 9.12. A returned logprob is not one of them, and saying so early saves a quarter of building on it." }
        ] }
    ]
  }
});
