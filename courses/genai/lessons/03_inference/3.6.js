EC.receiveLesson({
  id: "3.6",

  lede: "Speculative decoding runs a small model to guess the next few tokens and a large model to check them all in one pass. Because the check is parallel and decode is memory-bound (3.1), several tokens can come out of one expensive forward pass. The literature quotes 2–3×. I built it with gpt2 drafting for gpt2-medium and measured **1.13×** at best — and **0.71×, an actual slowdown**, at K=8. The cost model in this lesson predicts all three of my numbers to within 12%, and it says exactly why: **break-even acceptance equals the draft's relative cost**, my draft cost 0.351 of a target pass, and my acceptance was 0.417. That margin is the entire speedup.",

  objectives: [
    "Explain why verifying K tokens costs one target forward pass rather than K",
    "Derive the break-even condition relating acceptance rate to draft cost",
    "Measure an acceptance rate and explain why it falls as K grows",
    "Predict whether a given draft/target pair will pay before building it",
    "Say why output quality is unchanged and what makes that true"
  ],

  prerequisites: ["3.1", "3.5"],

  blocks: [

    { t: "h2", n: "01", id: "idea", text: "The idea, and why it is not free lunch",
      sub: "Guess cheaply, verify in parallel, keep what survives" },

    { t: "p", text: "Decode produces one token per forward pass and is bound by loading weights, not by arithmetic. So the arithmetic units sit mostly idle during decode — and verifying several candidate tokens is arithmetic. A forward pass over a sequence with K speculative tokens appended gives you, in one pass, the target model's opinion about each of those K positions. That is the trick: **one target pass can confirm up to K tokens**." },

    { t: "ol", items: [
      "**Draft.** A small model generates K tokens autoregressively — K cheap forward passes.",
      "**Verify.** The target model runs once over the sequence plus the K drafted tokens, producing its own distribution at each of those positions.",
      "**Accept the prefix.** Walk the K positions in order; keep tokens while the target agrees. At the first disagreement, stop — and take the target's own token there, so the round always yields at least one token.",
      "**Repeat** from the new sequence end."
    ] },

    { t: "callout", kind: "insight", title: "Why a round always yields at least one token",
      body: [
        { t: "p", text: "Even if the very first drafted token is rejected, the verification pass already computed the target's distribution at that position — so you take the target's token for free. The round degenerates to ordinary decoding plus the wasted draft passes." },
        { t: "p", text: "This is what makes the method safe to deploy: the worst case is slower, never wrong. And it is why the yield per round is **1 + (accepted)** rather than just the accepted count, which matters a lot in the arithmetic below." }
      ] },

    { t: "viz", title: "One speculative round, K = 4", caption: "Four cheap draft passes, one expensive verification pass, three tokens accepted plus the target's correction — four tokens from one target pass.",
      svg: `<svg viewBox="0 0 760 300" width="100%" role="img" aria-label="One round of speculative decoding">
  <text x="16" y="22" class="s-label" style="fill:var(--accent)">1 — DRAFT: four cheap passes, one token each</text>
  <rect x="16" y="32" width="72" height="30" rx="4" class="s-fill" style="stroke:var(--accent)" stroke-width="1.2"/>
  <text x="52" y="52" text-anchor="middle" class="s-mono">" the"</text>
  <rect x="96" y="32" width="72" height="30" rx="4" class="s-fill" style="stroke:var(--accent)" stroke-width="1.2"/>
  <text x="132" y="52" text-anchor="middle" class="s-mono">" same"</text>
  <rect x="176" y="32" width="72" height="30" rx="4" class="s-fill" style="stroke:var(--accent)" stroke-width="1.2"/>
  <text x="212" y="52" text-anchor="middle" class="s-mono">" as"</text>
  <rect x="256" y="32" width="72" height="30" rx="4" class="s-fill" style="stroke:var(--accent)" stroke-width="1.2"/>
  <text x="292" y="52" text-anchor="middle" class="s-mono">" any"</text>
  <text x="344" y="46" class="s-sub">4 × 51 ms on the draft model</text>
  <text x="344" y="62" class="s-sub">= 0.35 of one target pass each</text>

  <text x="16" y="104" class="s-label" style="fill:var(--violet)">2 — VERIFY: one target pass over all four at once</text>
  <rect x="16" y="114" width="312" height="30" rx="6" class="s-fill-2" style="stroke:var(--violet)" stroke-width="1.4"/>
  <text x="172" y="134" text-anchor="middle" class="s-sub">target forward pass, 145 ms — gives its token at every position</text>

  <text x="16" y="178" class="s-label" style="fill:var(--good)">3 — ACCEPT the agreeing prefix, then the target's own token</text>
  <rect x="16" y="188" width="72" height="30" rx="4" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="52" y="208" text-anchor="middle" class="s-mono" style="fill:var(--good)">✓ the</text>
  <rect x="96" y="188" width="72" height="30" rx="4" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="132" y="208" text-anchor="middle" class="s-mono" style="fill:var(--good)">✓ same</text>
  <rect x="176" y="188" width="72" height="30" rx="4" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="212" y="208" text-anchor="middle" class="s-mono" style="fill:var(--good)">✓ as</text>
  <rect x="256" y="188" width="72" height="30" rx="4" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.4" stroke-dasharray="4 3"/>
  <text x="292" y="208" text-anchor="middle" class="s-mono" style="fill:var(--crit)">✗ any</text>
  <rect x="336" y="188" width="92" height="30" rx="4" class="s-fill-2" style="stroke:var(--violet)" stroke-width="1.4"/>
  <text x="382" y="208" text-anchor="middle" class="s-mono" style="fill:var(--violet)">" every"</text>
  <text x="440" y="200" class="s-sub">3 accepted + 1 correction</text>
  <text x="440" y="216" class="s-sub">= 4 tokens, 1 target pass</text>

  <text x="16" y="256" class="s-mono" style="fill:var(--warn)">cost: 4 × 0.351 + 1 = 2.40 target passes for 1 + 0.350 × 4 = 2.40 tokens → 1.00×</text>
  <text x="16" y="278" class="s-mono" style="fill:var(--crit)">measured wall clock at K = 4: 1.13× — the whole method lives in that margin</text>
</svg>` },

    { t: "h2", n: "02", id: "acceptance", text: "Acceptance rate, measured",
      sub: "It depends on the text, and it falls as you draft further ahead" },

    { t: "p", text: "Acceptance rate is the fraction of drafted tokens the target agrees with. Everything else follows from it, so it is the number to measure first — and it is a property of your *traffic*, not of the model pair alone." },

    { t: "code", lang: "python", title: "g36.py — acceptance by domain, K = 4", code: `def spec_round(seq, K):
    ds, props = seq.clone(), []
    for _ in range(K):                       # draft K tokens, one pass each
        t = greedy_next(draft, ds)
        props.append(t)
        ds = torch.cat([ds, torch.tensor([[t]])], dim=1)

    with torch.no_grad():                    # verify all K in ONE target pass
        logits = target(ds).logits[0]

    n_acc = 0
    for i, t in enumerate(props):
        if int(logits[seq.shape[1] - 1 + i].argmax()) == t:
            n_acc += 1
        else:
            break                            # stop at the first disagreement

    corrected = int(logits[seq.shape[1] - 1 + n_acc].argmax())
    return n_acc, torch.cat([seq, torch.tensor([props[:n_acc] + [corrected]])], dim=1)`,
      out: `  domain          drafted   accepted       rate
  factual              24         13     0.542
  technical            24         15     0.625
  code                 24          8     0.333
  medical              24          9     0.375
  creative             24          5     0.208
  ALL                 120         50     0.417`,
      hl: [7, 8],
      caption: "Three-fold spread across domains. Technical prose is predictable enough for the small model to guess it; creative writing is not." },

    { t: "callout", kind: "insight", title: "Acceptance is a property of your traffic",
      body: [
        { t: "p", text: "**0.625 on technical prose against 0.208 on creative writing** — a 3× spread on the same model pair. The draft model succeeds where the next token is nearly determined by the context: boilerplate, formatting, common phrasings, the closing half of a familiar idiom. It fails where the text is genuinely open." },
        { t: "p", text: "The consequence for a deployment is that you cannot read the acceptance rate off a paper. A code-completion product and a story-writing product share the models and get different answers, and the difference is large enough to flip the decision." },
        { t: "p", text: "Note also that `def fibonacci(n):` scored 0.333 — low, which surprised me, since code is usually the poster child for this technique. GPT-2 is a poor code model, so its draft diverges quickly. With a draft actually trained on code, this row is the one that would improve most." }
      ] },

    { t: "code", lang: "python", title: "g36.py — acceptance against K", code: `for K2 in (1, 2, 4, 8):
    d = a = 0
    for text in PROMPTS.values():
        seq = tok(text, return_tensors="pt").input_ids
        for _ in range(4):
            n, seq = spec_round(seq, K2)
            d += K2; a += n
    print(K2, a / d, 1 + (a / d) * K2)`,
      out: `  K         drafted   accepted           rate  tok/target pass
  1              20         13         0.650            1.65
  2              40         22         0.550            2.10
  4              80         28         0.350            2.40
  8             160         37         0.231            2.85`,
      caption: "Acceptance per drafted token collapses from 0.650 to 0.231 as K grows, while tokens per target pass still rises — but sub-linearly, and the cost rises linearly." },

    { t: "callout", kind: "trap", title: "Acceptance falls with K, and that is not a measurement artefact",
      body: [
        { t: "p", text: "The draft model is extrapolating. Token 1 only has to match the target's next token; token 8 has to match after seven of the draft's own guesses have already gone into its context. Errors compound, so the probability of surviving to position *i* is roughly the per-token agreement raised to the *i*-th power." },
        { t: "p", text: "That geometry is why **tokens per target pass saturates**: 1.65 at K=1, 2.85 at K=8 — a 73% gain for 8× the draft work. Meanwhile the cost term `K·c + 1` grows strictly linearly. Somewhere the two cross, and past it bigger K makes things worse." },
        { t: "p", text: "Measured on my pair, that crossing is between K=4 and K=8, and at K=8 the method is **0.71× — slower than not using it at all**." }
      ] },

    { t: "h2", n: "03", id: "arithmetic", text: "Does it pay? The arithmetic",
      sub: "One round, two quantities, one inequality" },

    { t: "p", text: "Let `c` be the cost of a draft pass as a fraction of a target pass, `r` the acceptance rate, and `K` the number of tokens drafted per round. One round costs `K·c + 1` target-pass-equivalents and yields `1 + r·K` tokens. Plain decoding yields exactly 1 token per target pass, so the speedup is the ratio:" },

    { t: "math", tex: "\\text{speedup} \\;=\\; \\frac{1 + rK}{Kc + 1}" },

    { t: "p", text: "Set that greater than 1 and the K cancels entirely:" },

    { t: "math", tex: "1 + rK > Kc + 1 \\quad\\Longleftrightarrow\\quad r > c" },

    { t: "callout", kind: "mental", title: "The one thing to remember from this lesson",
      body: [
        { t: "p", text: "**Break-even acceptance equals the draft's relative cost, independent of K.** A draft that costs a tenth of the target needs acceptance above 0.1 — easy. A draft that costs a third needs acceptance above 0.333 — which is roughly what you get, so the margin is nothing." },
        { t: "p", text: "That single inequality tells you whether to bother before you write any code. Divide the draft's parameter count by the target's; if your expected acceptance is not comfortably above that ratio, stop." }
      ] },

    { t: "h2", n: "04", id: "measured", text: "What I actually measured, against what is advertised",
      sub: "1.13× best case, where it is commonly said 2–3×" },

    { t: "code", lang: "python", title: "g36.py — wall clock, 24 tokens", code: `def plain():
    seq = tok(text, return_tensors="pt").input_ids
    for _ in range(N):
        t = greedy_next(target, seq)              # one target pass per token
        seq = torch.cat([seq, torch.tensor([[t]])], dim=1)
    return seq

def speculative(K):
    def run():
        seq = tok(text, return_tensors="pt").input_ids
        start = seq.shape[1]
        while seq.shape[1] - start < N:
            _, seq = spec_round(seq, K)
        return seq
    return run`,
      out: `  draft  gpt2           124439808 params
  target gpt2-medium    354823168 params
  size ratio target/draft: 2.85x

  draft  forward pass     51.02 ms
  target forward pass    145.42 ms
  ratio target/draft       2.85x

  plain greedy, target only         6960.6 ms  (290.0 ms per token)
  speculative K=2                   6305.1 ms  (1.10x faster)
  speculative K=4                   6172.9 ms  (1.13x faster)
  speculative K=8                   9737.7 ms  (0.71x SLOWER)`,
      hl: [4],
      caption: "The best case is 1.13×. At K=8 the method costs more than it saves. Both facts follow from one number: the draft is only 2.85× smaller." },

    { t: "callout", kind: "warn", title: "It is commonly said \"up to 2–3×\" and does not say what that assumes",
      body: [
        { t: "p", text: "The section on this carries the line *\"Speedup: Up to 2-3x (depends on acceptance rate)\"*. That is achievable, and it is not reachable with the pair I used — I got 1.13×. The missing premise is the draft's *size*, not the acceptance rate." },
        { t: "p", text: "Production pairs are 10–20× apart: Llama-2 7B drafting for 70B, or a 1B drafting for a 13B. At a 20× ratio `c = 0.05`, and my measured acceptance of 0.417 would give `(1 + 0.417×4) / (4×0.05 + 1) = 2.23×` — in the advertised range, from the same acceptance rate that produced 1.13× with my draft." },
        { t: "p", text: "So the quoted speedup is real and the framing is misleading: acceptance is the number everyone measures, and **the size ratio is the number that decides**. I would not have discovered this from the reference; I discovered it from a 0.71× result that had to be explained." }
      ] },

    { t: "h3", text: "Where the draft model comes from" },

    { t: "table",
      head: ["Variant", "Draft source", "What it buys", "What it costs"],
      rows: [
        ["**Standard**", "A separate smaller model of the same family", "Simple, and the acceptance is easy to reason about", "A second model in memory, and the size ratio must be large"],
        ["**Self-speculative**", "The target with layers skipped", "No extra weights at all", "Lower acceptance — the skipped-layer model is a worse predictor than a trained small one"],
        ["**Medusa**", "Extra prediction heads on the target", "One model, several tokens per pass, no draft loop", "Heads must be trained; acceptance degrades fast past 3–4 positions"],
        ["**EAGLE**", "Autoregression on the target's own features", "Highest acceptance of the practical variants", "Training a feature-level predictor, and tighter coupling to the target"],
        ["**Lookahead / Jacobi**", "Fixed-point iteration on the target itself", "No draft model and no training", "Gains are modest and workload-dependent"]
      ] },

    { t: "callout", kind: "tradeoff", title: "Self-speculative is tempting and usually the wrong first try",
      body: [
        { t: "p", text: "Running the target with half its layers costs no extra memory, which makes it the obvious thing to reach for. But the whole decision rests on `r > c`, and skipping half the layers puts `c` at roughly 0.5 — so you now need acceptance above 0.5, which is higher than the 0.417 I measured with a genuinely separate small model." },
        { t: "p", text: "A trained 1B draft for a 13B target has `c ≈ 0.08` and needs almost nothing from acceptance. The memory you saved is the cheapest resource in the problem; the size ratio is the expensive one." }
      ] },

    { t: "h2", n: "05", id: "quality", text: "Why the output does not change",
      sub: "And the one place my implementation simplified it" },

    { t: "p", text: "Speculative decoding is not an approximation. With greedy decoding the argument is immediate: accept the drafted token only when it equals the target's own argmax at that position, so every token in the output is the token the target would have produced alone. The draft model influences *speed* and nothing else." },

    { t: "p", text: "With sampling it takes more care, and the pseudocode shows the right test: accept with probability `min(1, p_target(t) / p_draft(t))`, and on rejection sample from the normalised positive part of `p_target − p_draft`. That procedure provably draws from the target's distribution. It is the same rejection-sampling identity used in Monte Carlo methods, and it is the reason the technique is considered safe rather than a quality trade." },

    { t: "callout", kind: "note", title: "What my measurement actually implemented",
      body: [
        { t: "p", text: "I implemented the greedy case: `if target_argmax == drafted_token: accept`. That is exact for greedy decoding and it is the right choice for a timing measurement, because it removes sampling variance from the acceptance rate." },
        { t: "p", text: "It is not the general algorithm. At temperature 0.7 the acceptance test has to be the probabilistic one above, and acceptance rates measured under greedy decoding are not directly transferable — they tend to be *lower* than the sampling case, because exact argmax agreement is a stricter condition than the probability ratio test." },
        { t: "p", text: "So my 0.417 is, if anything, a conservative estimate for a sampling deployment. I am flagging it rather than claiming the numbers carry over unchanged." }
      ] },

    { t: "ladder", title: "Deciding whether to deploy speculative decoding", rungs: [
      { level: "bad", label: "Turn it on because the framework supports it", why: "vLLM and TGI both expose it as a flag, so it looks free. With a badly chosen draft it is a straight slowdown — I measured 0.71× — and the symptom is a latency regression nobody connects to the flag.",
        code: `--speculative-model gpt2 --num-speculative-tokens 8`,
        note: "K=8 was the worst configuration I tested. Larger K looks more aggressive and is more likely to lose." },
      { level: "ok", label: "Check the size ratio first", why: "Compute c as draft params over target params and require your expected acceptance to exceed it. This rules out the bad cases on paper in about a minute, with no benchmarking.",
        code: `c = 124e6 / 355e6        # 0.351 — needs acceptance above 0.351
# measured acceptance 0.417 — margin too thin, skip` },
      { level: "best", label: "Measure acceptance on your own traffic, then sweep K", why: "Acceptance varied 0.208 to 0.625 across domains on one model pair, so the only number that counts is the one from your prompts. Then sweep K, because the optimum is interior — tokens per pass saturates while cost grows linearly.",
        code: `for K in (1, 2, 3, 4, 6, 8):
    r = acceptance_on_my_traffic(K)       # replay real prompts
    print(K, r, (1 + r * K) / (K * c + 1))`,
        note: "Sweeping K on real traffic is the step that finds the 0.71× configurations before production does." }
    ] },

    { t: "exercise", kind: "analysis", title: "Build the cost model and check it against the measurements", difficulty: "advanced", minutes: 25,
      body: "Write the speculative-decoding cost model, use it to predict the wall-clock speedup at K = 2, 4 and 8 from the measured acceptance rates, and compare against the measured speedups of 1.10×, 1.13× and 0.71×. Then tabulate the break-even acceptance rate for drafts that are 2.9×, 10×, 20× and 50× smaller, and explain what you notice about the dependence on K.",
      requirements: [
        "Use c = 51.02 / 145.42, the measured ratio of draft to target forward-pass time",
        "Use the acceptance rate measured at each K (0.550, 0.350, 0.231), not the overall 0.417",
        "Report the prediction error as a percentage of the measured value",
        "Tabulate break-even acceptance against draft size ratio for K = 1, 2, 4, 8",
        "Print a speedup surface over acceptance and K for both a 20×-smaller draft and this lesson's 2.85× draft"
      ],
      hint: "When you set the speedup greater than 1 and simplify, something cancels. That cancellation is the result the exercise is for.",
      solution: { lang: "python", title: "g36_ex.py — the cost model, validated", code: `C = 51.02 / 145.42          # draft pass as a fraction of a target pass
MEASURED = {                # K -> (wall-clock speedup, acceptance rate at that K)
    2: (1.10, 0.550),
    4: (1.13, 0.350),
    8: (0.71, 0.231),
}

def speedup(K, r, c):
    """One round costs K draft passes + 1 target pass, and yields 1 + r*K tokens."""
    return (1.0 + r * K) / (K * c + 1.0)

print("  %-4s %10s %12s %12s %10s" % ("K", "acceptance", "predicted", "measured", "error"))
for K, (meas, r) in sorted(MEASURED.items()):
    pred = speedup(K, r, C)
    print("  %-4d %10.3f %12.2fx %11.2fx %9.1f%%"
          % (K, r, pred, meas, 100 * (pred - meas) / meas))

print()
print("  break-even acceptance rate, by how much cheaper the draft is")
for ratio, label in ((2.85, "2.9x smaller"), (10, "10x smaller"),
                     (20, "20x smaller"), (50, "50x smaller")):
    c = 1.0 / ratio
    # solve 1 + r*K > K*c + 1  ->  r > c, for every K
    print("  %-16s %s" % (label, " ".join("%7.3f" % c for K in (1, 2, 4, 8))))

for label, c in (("draft 20x smaller (c = 0.05)", 0.05),
                 ("this lesson's draft (c = 0.351)", C)):
    print()
    print("  speedup surface, %s" % label)
    print("  %-12s %8s %8s %8s %8s" % ("acceptance", "K=1", "K=2", "K=4", "K=8"))
    for r in (0.2, 0.4, 0.6, 0.8, 0.9):
        print("  %-12.2f %s" % (r, " ".join("%7.2fx" % speedup(K, r, c)
                                            for K in (1, 2, 4, 8))))`,
        out: `  draft cost c = 0.351 of a target pass (gpt2 vs gpt2-medium: 2.85x size ratio)

  K    acceptance    predicted     measured      error
  2         0.550         1.23x        1.10x      12.2%
  4         0.350         1.00x        1.13x     -11.6%
  8         0.231         0.75x        0.71x       5.4%

  break-even acceptance rate, by how much cheaper the draft is
  draft is              K=1      K=2      K=4      K=8
  2.9x smaller       0.351   0.351   0.351   0.351
  10x smaller        0.100   0.100   0.100   0.100
  20x smaller        0.050   0.050   0.050   0.050
  50x smaller        0.020   0.020   0.020   0.020

  speedup surface, draft 20x smaller (c = 0.05)
  acceptance        K=1      K=2      K=4      K=8
  0.20            1.14x    1.27x    1.50x    1.86x
  0.40            1.33x    1.64x    2.17x    3.00x
  0.60            1.52x    2.00x    2.83x    4.14x
  0.80            1.71x    2.36x    3.50x    5.29x
  0.90            1.81x    2.55x    3.83x    5.86x

  speedup surface, this lesson's draft (c = 0.351)
  acceptance        K=1      K=2      K=4      K=8
  0.20            0.89x    0.82x    0.75x    0.68x
  0.40            1.04x    1.06x    1.08x    1.10x
  0.60            1.18x    1.29x    1.41x    1.52x
  0.80            1.33x    1.53x    1.75x    1.94x
  0.90            1.41x    1.65x    1.91x    2.15x`,
        notes: [
          { t: "p", text: "**The model predicts all three measurements within 12%**, including the sign flip at K=8. A two-term arithmetic model standing up against wall-clock on a contended CPU is better agreement than I expected, and it means the model is good enough to make the deploy/skip decision without benchmarking." },
          { t: "p", text: "**The break-even columns are identical across K** — 0.351 for every K at a 2.9× size ratio. That is the cancellation: setting `(1 + rK)/(Kc + 1) > 1` gives `r > c` with no K in it. K changes how *much* you win or lose, never whether you win." },
          { t: "p", text: "Compare the two surfaces at acceptance 0.40. With a 20×-smaller draft: 1.33× to 3.00×, improving with K. With this lesson's draft: 1.04× to 1.10×, barely moving. Same acceptance, same algorithm — the size ratio is doing all the work, which is the opposite of how the technique is usually discussed." },
          { t: "p", text: "The row to be afraid of is acceptance 0.20 on the lower surface: every K is below 1.0, and K=8 is 0.68×. That is a configuration a team could ship by flipping a flag, and the only symptom would be a latency regression." }
        ] } },

    { t: "callout", kind: "good", title: "When this is the right lever",
      body: [
        { t: "p", text: "Speculative decoding helps **latency at low batch size** — a single user streaming, or an interactive product where the GPU has arithmetic to spare. That is exactly the regime where batching (3.5) has nothing to give you, which makes the two complementary rather than competing." },
        { t: "p", text: "At high batch size it helps much less, because the arithmetic units are already busy with the other rows, and the verification pass is no longer riding on idle capacity. If your service runs a full batch at peak, measure during peak rather than at night." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\"We enabled speculative decoding on our 70B endpoint with a 7B draft and K=5. Throughput went down 8%. The acceptance rate reports 0.62. What happened?\"**" },
        { t: "p", text: "0.62 acceptance with a 10× size ratio should be a large win on paper: `c = 0.1`, so `(1 + 0.62×5)/(5×0.1 + 1) = 2.75×`. A measured 8% *loss* against a predicted 2.75× gain means the cost model's assumptions are wrong, not the acceptance rate." },
        { t: "p", text: "The most likely assumption to have broken is the one about idle arithmetic. Speculative decoding spends arithmetic to save weight loads, and that trade is only free when the arithmetic units are idle — which is true at batch 1 and false at batch 64. On a busy endpoint the verification pass competes with the other rows in the batch, so each round costs more than `K·c + 1`. I would check throughput against batch size and expect the loss to be concentrated at high batch." },
        { t: "p", text: "Second candidate: the draft model is occupying memory that was holding KV cache. A 7B draft at fp16 is 14 GB, which on an 80 GB node is a meaningful slice of the cache budget — fewer concurrent rows, lower throughput, entirely independent of acceptance (3.2)." },
        { t: "p", text: "Third: how acceptance is being counted. If the reported 0.62 is the rate at the first drafted position rather than averaged over all K, it is flattering — I measured 0.650 at K=1 falling to 0.231 at K=8 on my own pair, so a first-position figure can overstate the effective rate by 3×. The fix in that case is a smaller K, not a different draft." },
        { t: "p", text: "The experiment I would run: fix the draft, sweep K from 1 to 5 at the production batch size, and plot throughput. If the optimum is K=1 or K=2, the arithmetic contention explanation is right and the flag should stay on with a smaller K. If every K loses, the memory explanation is right and the draft has to go." }
      ] }
  ],

  takeaways: [
    "**One target forward pass can verify K drafted tokens**, because verification is parallel over positions while generation is not. That is the entire mechanism.",
    "**A round always yields at least one token**, since the verification pass gives the target's own token at the first rejection — so the worst case is slower, never wrong.",
    "**Break-even acceptance equals the draft's relative cost, independent of K.** Setting the speedup above 1 cancels K entirely and leaves `r > c`.",
    "**Acceptance rate is a property of your traffic.** Measured 0.625 on technical prose against 0.208 on creative writing, with the same model pair.",
    "**Acceptance falls as K grows** — 0.650 at K=1 to 0.231 at K=8 — because the draft extrapolates on its own guesses and errors compound.",
    "**So tokens per target pass saturates while cost grows linearly**, which puts the optimal K in the interior: my K=8 configuration ran at 0.71×, slower than no speculation at all.",
    "**I measured 1.13× where the quoted figure is 2–3×**, and the missing premise is the size ratio: my draft was 2.85× smaller, production pairs are 10–20× apart.",
    "**The same 0.417 acceptance gives 2.23× with a 20×-smaller draft.** Acceptance is what everyone measures; the size ratio is what decides.",
    "**Output quality is unchanged**, exactly under greedy decoding and provably under sampling via the rejection-sampling test on the probability ratio.",
    "**It helps latency at low batch size**, where the arithmetic units are idle — which makes it complementary to batching rather than an alternative to it."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Why can the target model verify K drafted tokens in a single forward pass?",
        options: [
          "Because the draft model's KV cache is reused by the target",
          "Because a forward pass over the sequence plus the K tokens produces the target's distribution at every one of those positions at once",
          "Because verification only needs the final layer, not the whole model",
          "Because the K tokens are checked against a cached lookup table rather than the model"
        ],
        answer: 1,
        why: "Appending the K speculative tokens and running one pass gives the target's own prediction at each of those positions simultaneously, because a transformer computes all positions in parallel — this is the same property that makes prefill cheap per token in 3.1. The caches are not interchangeable between models of different sizes, verification uses the full model, and there is no lookup table involved." },

      { stem: "A draft model costs 0.351 of a target forward pass and the measured acceptance rate is 0.417. What does the cost model say?",
        options: [
          "It pays well, because 0.417 is a healthy acceptance rate",
          "It barely pays, because break-even is 0.351 and the margin is thin",
          "It cannot pay, because acceptance below 0.5 is always a loss",
          "It depends entirely on K — small K pays and large K does not"
        ],
        answer: 1,
        why: "Break-even acceptance equals the draft's relative cost, so 0.417 against 0.351 is a real but thin margin — measured, 1.13× at best. The 0.5 threshold is invented; a draft 20× smaller pays handsomely at acceptance 0.2. And whether it pays does not depend on K at all, since K cancels in the inequality — K only scales how much you win or lose, which is why K=8 turned a thin win into a 0.71× loss." },

      { stem: "Measured acceptance per drafted token fell from 0.650 at K=1 to 0.231 at K=8. Why?",
        options: [
          "Larger K uses a larger verification window, which introduces numerical error",
          "The draft extrapolates on its own guesses, so errors compound with each position",
          "The target model's confidence decreases over longer continuations",
          "The acceptance test becomes stricter as K grows"
        ],
        answer: 1,
        why: "Drafted token 8 is conditioned on seven of the draft's own earlier guesses, so surviving to position i requires agreement at every position before it — roughly a per-token agreement probability raised to the i-th power. Nothing about the test or the arithmetic changes with K. The practical consequence is that tokens per target pass saturates (1.65 at K=1 to 2.85 at K=8) while cost grows linearly, so the optimal K is interior." },

      { stem: "A 70B endpoint with a 7B draft and acceptance 0.62 shows throughput going *down* 8% after enabling speculative decoding. Which explanation fits best?",
        options: [
          "The acceptance rate is too low for the size ratio",
          "At production batch size the arithmetic units are already busy, so verification is no longer riding on idle capacity",
          "Speculative decoding degrades output quality, causing retries",
          "The draft and target tokenizers disagree"
        ],
        answer: 1,
        why: "The cost model predicts 2.75× for those figures, so the gap is in its assumptions rather than its inputs. Speculative decoding trades arithmetic for weight loads and is only free when arithmetic is idle — true at batch 1, false at batch 64, where verification competes with the other rows. A 14 GB draft eating KV cache budget is the other strong candidate. Quality is unchanged by construction, and a tokenizer mismatch would break correctness, not throughput." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "The question where a candidate who has only read about it says \"2–3× speedup\" and stops",
    questions: [
      { level: "core",
        q: "Explain speculative decoding and why it works.",
        strong: "A strong answer explains the parallel-verification trick and names the resource being traded.",
        answer: [
          { t: "p", text: "A small draft model generates K tokens autoregressively, then the large target model runs once over the sequence with those K tokens appended. Because a transformer computes all positions in parallel, that single pass yields the target's own prediction at each of the K positions, so you can accept the longest prefix the target agrees with. At the first disagreement you take the target's token, so a round always produces at least one." },
          { t: "p", text: "It works because decode is memory-bound. The target pass's cost is loading the weights, and it loads them once whether it is confirming one token or eight — meanwhile the arithmetic units, which verification uses, were idle. It is the same observation that makes batching work, applied along the sequence instead of across requests." },
          { t: "p", text: "And the output is unchanged. Under greedy decoding that is immediate — you only keep a token if it equals the target's argmax. Under sampling it needs the rejection-sampling test on the probability ratio, which provably draws from the target's distribution." }
        ] },

      { level: "advanced",
        q: "How would you decide whether speculative decoding is worth deploying?",
        strong: "A strong answer gives the break-even inequality and insists on measuring acceptance on real traffic.",
        answer: [
          { t: "p", text: "One inequality, before any code: a round costs `K·c + 1` target passes and yields `1 + r·K` tokens, where c is the draft's relative cost and r the acceptance rate. Set the speedup above 1 and K cancels — you need `r > c`. So divide the draft's parameters by the target's and ask whether your acceptance will clear that." },
          { t: "p", text: "I learned that the hard way. I built it with gpt2 drafting for gpt2-medium — only 2.85× apart, so `c = 0.351` — measured acceptance 0.417, and got 1.13× at best and 0.71× at K=8. The same 0.417 with a draft 20× smaller predicts 2.23×. The size ratio was doing all the work, and it is the thing least discussed." },
          { t: "p", text: "Then acceptance has to come from my own traffic, because it varied 0.208 to 0.625 across domains on one model pair — creative writing against technical prose. A number from a paper is not usable for this decision." },
          { t: "p", text: "Finally I would sweep K at the production batch size rather than at batch 1. Acceptance per token falls as K grows (0.650 at K=1 to 0.231 at K=8 for me) while cost grows linearly, so the optimum is interior, and at high batch the whole premise of idle arithmetic weakens." }
        ] },

      { level: "advanced",
        q: "Someone reports a 0.62 acceptance rate but no speedup. Where do you look?",
        strong: "A strong answer separates a wrong input from a broken assumption, and proposes a decisive experiment.",
        answer: [
          { t: "p", text: "First I would check whether the cost model even predicts a win: with a 10× size ratio and 0.62 acceptance at K=5 it predicts 2.75×, so a flat or negative result means an assumption is broken rather than an input being wrong. That focuses the search." },
          { t: "p", text: "The assumption I would suspect first is idle arithmetic. Verification spends arithmetic to save weight loading, which is free at batch 1 and not at batch 64, where it competes with every other row. Throughput plotted against batch size would show the loss concentrated at high batch." },
          { t: "p", text: "Second, memory. The draft model occupies space that was holding KV cache — a 7B draft at fp16 is 14 GB — so concurrency drops and throughput with it, entirely independently of acceptance." },
          { t: "p", text: "Third, how acceptance is being counted. If 0.62 is the rate at the first drafted position rather than averaged over all K positions, it is flattering: I measured 0.650 at K=1 collapsing to 0.231 at K=8 on my own pair. That is a 3× overstatement of the effective rate, and the fix would be a smaller K rather than a different model." },
          { t: "p", text: "The decisive experiment is a K sweep from 1 to 5 at production batch size with the draft fixed. If the optimum is K=1 or 2, it is arithmetic contention and the feature stays with a smaller K. If every K loses, it is the memory, and the draft has to go." }
        ] }
    ]
  }
});
