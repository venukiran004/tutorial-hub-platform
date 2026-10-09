EC.receiveLesson({
  id: "7.6",

  lede: "DPO\u2019s trick is three lines: the KL-constrained objective from 7.5 has a closed-form optimum, so you can invert it to write the *reward* as a function of the *policy*, substitute into Bradley-Terry, and watch the intractable partition function cancel. The language model is secretly its own reward model. The reference\u2019s worked numbers all check out exactly \u2014 and measuring the implicit reward on real text exposes the mechanism behind DPO\u2019s best-known side effect: because it is a **sum** over response tokens, a longer chosen response collects \u03b2\u00b7d\u00b7n reward for the same per-token improvement.",

  objectives: [
    "Derive the DPO loss from the RLHF objective in three steps",
    "Explain precisely why the partition function cancels",
    "Compute the implicit reward and the loss for a preference pair",
    "Say what \u03b2 does in DPO and why it is the same leash as in PPO",
    "Identify DPO's length bias and where it comes from"
  ],

  prerequisites: ["7.4", "7.5"],

  blocks: [

    { t: "h2", n: "01", id: "derivation", text: "The derivation",
      sub: "Three lines, worth memorising" },

    { t: "p", text: "**Step 1.** The KL-constrained objective from 7.5 has a known optimum, and it is a reweighted reference policy \u2014 exponentially tilted toward high reward." },

    { t: "math", tex: "\\pi^*(y|x) = \\frac{1}{Z(x)}\\,\\pi_{\\text{ref}}(y|x)\\,\\exp\\!\\big(r(x,y)/\\beta\\big)" },

    { t: "p", text: "**Step 2.** Take logs and solve for the reward. This is just algebra \u2014 nothing is approximated." },

    { t: "math", tex: "r(x,y) = \\beta\\log\\frac{\\pi^*(y|x)}{\\pi_{\\text{ref}}(y|x)} + \\beta\\log Z(x)" },

    { t: "p", text: "**Step 3.** Substitute into the Bradley-Terry loss from 7.4. That loss depends only on the *difference* of two rewards for the same prompt \u2014 and \\(Z(x)\\) depends only on \\(x\\), so it is identical in both terms and cancels." },

    { t: "math", tex: "\\mathcal{L}_{\\text{DPO}} = -\\mathbb{E}\\left[\\log\\sigma\\!\\left(\\beta\\log\\frac{\\pi_\\theta(y_w|x)}{\\pi_{\\text{ref}}(y_w|x)} - \\beta\\log\\frac{\\pi_\\theta(y_l|x)}{\\pi_{\\text{ref}}(y_l|x)}\\right)\\right]" },

    { t: "callout", kind: "insight", title: "The cancellation is the whole paper, and it depends on 7.4's structure",
      body: [
        { t: "p", text: "\\(Z(x) = \\sum_y \\pi_{\\text{ref}}(y|x)\\exp(r(x,y)/\\beta)\\) is a sum over **every possible completion**. It is completely intractable \u2014 you cannot compute it, estimate it cheaply, or differentiate through it." },
        { t: "p", text: "It cancels because Bradley-Terry compares two completions of the *same prompt*. 7.4 established that the RM loss sees only \\(r_w - r_l\\), and that is exactly the property being exploited: both rewards carry the same \\(+\\beta\\log Z(x)\\) term, so the difference is free of it." },
        { t: "p", text: "So 7.4\u2019s \u201cthe absolute scale is unidentifiable\u201d and DPO\u2019s \u201cthe partition function cancels\u201d are the same fact seen from two directions. The additive constant you could not identify is exactly the term you do not need." }
      ] },

    { t: "callout", kind: "good", title: "What you are left with is a supervised loss",
      body: [
        { t: "p", text: "The final expression contains no reward model, no sampling, no value network and no RL. It is a function of four numbers per pair \u2014 the policy and reference log-probabilities of the chosen and rejected responses \u2014 all computable with two forward passes." },
        { t: "p", text: "That is why the memory arithmetic in 7.5 came out at 117.3 GB against PPO\u2019s 234.7 GB, and why there is no generation step in the training loop. The algorithm is ordinary supervised learning on a cleverly constructed target." },
        { t: "p", text: "The one-sentence version worth being able to say: **the log-ratio against the frozen reference *is* the reward**, so preferences can be optimised with a supervised loss." }
      ] },

    { t: "h2", n: "02", id: "numbers", text: "The loss on numbers",
      sub: "Checking the reference" },

    { t: "code", lang: "python", title: "g76.py \u00a7A \u2014 the worked pair, \u03b2 = 0.1", code: `rw = beta * (log_pi_w - log_ref_w)      # implicit reward, chosen
rl = beta * (log_pi_l - log_ref_l)      # implicit reward, rejected
margin = rw - rl`,
      out: `  chosen   : log pi -12.0, log ref -13.0 -> ratio +1.0, implicit reward 0.10
  rejected : log pi -15.0, log ref -15.5 -> ratio +0.5, implicit reward 0.05
  margin   = 0.05
  loss     = -log sigma(0.05) = 0.6685   reference 0.6685  OK

  well separated   margin +1.2 -> loss 0.2633   reference 0.2634  OK
  inverted         margin -0.8 -> loss 1.1711   reference 1.1711  OK`,
      hl: [4, 6, 7],
      caption: "All three match. Note the shape is identical to 7.4's RM loss \u2014 because it *is* that loss." },

    { t: "callout", kind: "note", title: "Both log-ratios are positive, which is worth reading carefully",
      body: [
        { t: "p", text: "The policy likes the rejected response *more* than the reference did \u2014 ratio +0.5. That is not a bug in the example: DPO does not require the rejected response\u2019s probability to fall in absolute terms, only to rise less than the chosen one\u2019s." },
        { t: "p", text: "In practice both often fall. A well-documented DPO behaviour is that the chosen response\u2019s log-probability decreases over training while the margin still grows, because the rejected one decreases faster. The loss is indifferent to this." },
        { t: "p", text: "Which is why the reference\u2019s suggested metrics include `reward_chosen` and `reward_rejected` separately rather than just the margin. A margin that improves while both rewards collapse is a model becoming less confident about everything, and only the separate traces show it." }
      ] },

    { t: "h2", n: "03", id: "beta", text: "What \u03b2 does",
      sub: "The same leash, acting through the sigmoid" },

    { t: "code", lang: "python", title: "g76.py \u00a7B \u2014 one log-ratio gap of 0.5 nats, six \u03b2 values", code: `for b in (0.01, 0.05, 0.1, 0.3, 0.5, 1.0):
    margin = b * 0.5`,
      out: `  beta           margin         loss     |gradient|
  0.01           0.0050       0.6907         0.4988
  0.05           0.0250       0.6807         0.4938
  0.10           0.0500       0.6685         0.4875
  0.30           0.1500       0.6210         0.4626
  0.50           0.2500       0.5759         0.4378
  1.00           0.5000       0.4741         0.3775`,
      hl: [2, 7],
      caption: "\u03b2 scales the margin *before* the sigmoid, which moves you along the saturation curve from 7.4." },

    { t: "callout", kind: "insight", title: "Small \u03b2 means a near-linear sigmoid and therefore aggressive updates",
      body: [
        { t: "p", text: "At \u03b2 = 0.01 the margin is 0.005, which sits essentially at the sigmoid\u2019s steepest point \u2014 gradient 0.4988, within 0.3% of the maximum 0.5. So every pair contributes near-maximal gradient regardless of how well the model already ranks it, and the policy moves fast and drifts far from the reference." },
        { t: "p", text: "At \u03b2 = 1.0 the margin is 0.5 and the gradient is 0.3775, a quarter below maximum \u2014 the loss has begun saturating, so well-ranked pairs stop contributing and the policy is held near the reference." },
        { t: "p", text: "So \u03b2 is the leash exactly as in PPO, acting through a different mechanism: in PPO it weighted an explicit KL term, here it controls how quickly the implicit reward saturates. Typical value 0.1, and the learning rate should be about **5e-7** \u2014 far lower than SFT, which surprises people." }
      ] },

    { t: "h2", n: "04", id: "length", text: "The length bias, and where it comes from",
      sub: "A sum over tokens is not a score" },

    { t: "p", text: "DPO is known to make outputs longer, and SimPO exists partly to fix it. The reference mentions the symptom; the mechanism is visible as soon as you compute an implicit reward on real text." },

    { t: "code", lang: "python", title: "g76.py \u00a7C \u2014 summed response log-probability against length, gpt2", code: `def seq_logprob(prompt, response):
    """Sum of log P over RESPONSE tokens only -- exactly what DPO uses."""
    ...
    return sel.sum().item(), len(rid), sel.mean().item()`,
      out: `  response         tokens      SUM log P       MEAN log P
  very short            4        -26.857          -6.7142
  short                 8        -32.455          -4.0569
  medium               19        -77.166          -4.0613
  long                 35       -125.447          -3.5842
  padded long          60       -202.685          -3.3781

  correlation(length, SUM log P)  = -0.9988
  correlation(length, MEAN log P) = +0.6854`,
      hl: [7, 9, 10],
      caption: "The sum is almost perfectly determined by length \u2014 correlation \u22120.9988. The mean is not." },

    { t: "callout", kind: "insight", title: "But length partly cancels in DPO, so the effect is subtler than it looks",
      body: [
        { t: "p", text: "A careless reading of that table concludes DPO must prefer short responses, since long ones have hugely negative summed log-probability. That is wrong, because the implicit reward is a *difference* of two sums over the **same tokens** \u2014 \\(\\beta(\\sum\\log\\pi_\\theta - \\sum\\log\\pi_{\\text{ref}})\\). The bulk length effect cancels." },
        { t: "p", text: "What does not cancel is that the *difference* also accumulates per token. If the policy gains d nats per token over the reference, the implicit reward is \\(\\beta \\cdot d \\cdot n\\) \u2014 linear in the number of response tokens." },
        { t: "p", text: "So the bias is toward length, and it enters through the accumulation of the advantage rather than through the magnitude of the log-probabilities. That is a more precise statement than \u201cDPO likes long answers\u201d and it is what tells you the fix is normalisation." }
      ] },

    { t: "code", lang: "python", title: "g76.py \u00a7D \u2014 implicit reward = \u03b2\u00b7d\u00b7n, tabulated", code: `for n in (5, 10, 25, 50, 100):
    reward = 0.1 * d * n                 # beta * per-token gain * token count`,
      out: `  tokens          d=+0.02          d=+0.05          d=+0.10
  5                0.0100           0.0250           0.0500
  10               0.0200           0.0500           0.1000
  25               0.0500           0.1250           0.2500
  50               0.1000           0.2500           0.5000
  100              0.2000           0.5000           1.0000`,
      hl: [2, 6],
      caption: "A 100-token response at d = +0.02 earns the same reward as a 20-token response at d = +0.10. Length substitutes for quality." },

    { t: "callout", kind: "tradeoff", title: "Which is exactly what SimPO normalises away",
      body: [
        { t: "p", text: "SimPO replaces the summed log-ratio with a **length-normalised average** log-probability and adds a target margin \u03b3. Dividing by n removes the linear-in-length term, so a long mediocre response no longer collects the reward of a short excellent one." },
        { t: "p", text: "It also drops the reference model entirely, which is why SimPO appears in 7.7\u2019s family table under \u201cremoves the reference model\u201d. Those two changes are related: once you normalise by length, the reference\u2019s role as a baseline is largely served by the target margin instead." },
        { t: "p", text: "The cost is that you lose DPO\u2019s guarantee of being derived from the KL-constrained objective. SimPO is a well-motivated modification rather than a consequence of the derivation, so it trades theoretical grounding for a behaviour fix \u2014 which is a reasonable trade when the behaviour is a real problem in your outputs." }
      ] },

    { t: "viz", title: "Where DPO's length bias lives", caption: "The bulk log-probability cancels between policy and reference. The per-token gain accumulates.",
      svg: `<svg viewBox="0 0 760 280" width="100%" role="img" aria-label="DPO implicit reward and length">
  <text x="16" y="22" class="s-label">SUMMED LOG-PROB FALLS WITH LENGTH \u2014 BUT CANCELS</text>
  <text x="16" y="48" class="s-mono" style="font-size:10px">sum log pi_theta</text>
  <rect x="190" y="36" width="420" height="16" rx="2" class="s-fill" style="stroke:var(--crit)" stroke-width="1.2"/>
  <text x="618" y="48" class="s-mono" style="font-size:9px;fill:var(--crit)">-202.7 at 60 tokens</text>
  <text x="16" y="72" class="s-mono" style="font-size:10px">sum log pi_ref</text>
  <rect x="190" y="60" width="410" height="16" rx="2" class="s-fill" style="stroke:var(--crit)" stroke-width="1.2"/>
  <text x="618" y="72" class="s-mono" style="font-size:9px;fill:var(--crit)">also large and negative</text>
  <text x="16" y="98" class="s-mono" style="font-size:10px">difference</text>
  <rect x="190" y="86" width="12" height="16" rx="2" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="212" y="98" class="s-mono" style="font-size:9px;fill:var(--good)">small \u2014 the bulk cancelled</text>

  <line x1="16" y1="118" x2="744" y2="118" stroke="var(--line)" stroke-width="1"/>

  <text x="16" y="144" class="s-label">WHAT SURVIVES: beta \u00b7 d \u00b7 n  (linear in token count)</text>
  <line x1="80" y1="240" x2="700" y2="240" stroke="var(--line)" stroke-width="1.2"/>
  <line x1="80" y1="240" x2="80" y2="160" stroke="var(--line)" stroke-width="1.2"/>
  <text x="72" y="164" text-anchor="end" class="s-mono" style="font-size:9px">1.0</text>
  <text x="72" y="244" text-anchor="end" class="s-mono" style="font-size:9px">0</text>
  <polyline points="80,240 142,232 266,216 390,200 638,160" fill="none" stroke="var(--crit)" stroke-width="2"/>
  <text x="648" y="156" class="s-mono" style="font-size:9px;fill:var(--crit)">d=+0.10</text>
  <polyline points="80,240 142,236 266,230 390,220 638,200" fill="none" stroke="var(--warn)" stroke-width="1.8"/>
  <text x="648" y="198" class="s-mono" style="font-size:9px;fill:var(--warn)">d=+0.05</text>
  <polyline points="80,240 142,238 266,236 390,232 638,224" fill="none" stroke="var(--good)" stroke-width="1.6"/>
  <text x="648" y="222" class="s-mono" style="font-size:9px;fill:var(--good)">d=+0.02</text>
  <text x="390" y="258" text-anchor="middle" class="s-sub" style="font-size:9px">response tokens \u2014 5 to 100</text>
  <text x="16" y="276" class="s-mono" style="fill:var(--crit)">100 tokens at d=0.02 earns what 20 tokens at d=0.10 earns \u2014 length substitutes for quality</text>
</svg>` },

    { t: "h2", n: "05", id: "implementation", text: "Implementation",
      sub: "Four log-probabilities and one line of arithmetic" },

    { t: "code", lang: "python", title: "the loss, from scratch", code: `def sequence_logprob(model, input_ids, labels, attn):
    """Sum of log P over the RESPONSE tokens only (labels == -100 elsewhere)."""
    logits = model(input_ids, attention_mask=attn).logits[:, :-1]      # predict t+1
    tgt    = labels[:, 1:]
    mask   = tgt != -100
    tgt    = tgt.masked_fill(~mask, 0)
    lp     = torch.log_softmax(logits, dim=-1).gather(-1, tgt.unsqueeze(-1)).squeeze(-1)
    return (lp * mask).sum(-1)

def dpo_loss(policy, ref, batch, beta=0.1):
    pi_w = sequence_logprob(policy, batch["chosen_ids"],   ...)
    pi_l = sequence_logprob(policy, batch["rejected_ids"], ...)
    with torch.no_grad():                                 # the reference is FROZEN
        ref_w = sequence_logprob(ref, batch["chosen_ids"],   ...)
        ref_l = sequence_logprob(ref, batch["rejected_ids"], ...)

    margin = beta * ((pi_w - ref_w) - (pi_l - ref_l))     # the whole algorithm
    return -F.logsigmoid(margin).mean()`,
      hl: [7, 16, 17],
      caption: "The `masked_fill(~mask, 0)` before gathering matters \u2014 \u2212100 is not a valid index and `gather` would raise." },

    { t: "callout", kind: "good", title: "With LoRA you do not need a second model",
      body: [
        { t: "p", text: "Disable the adapter and the base weights **are** \\(\\pi_{\\text{ref}}\\). So one set of weights serves as both policy and reference, and the 13.0 GB for a frozen 7B reference disappears \u2014 which is why DPO with LoRA fits on one GPU where PPO does not come close." },
        { t: "p", text: "It also removes a class of bug. With two separate checkpoints it is possible for the reference to be the wrong model \u2014 a different SFT run, or the base model instead of the SFT model \u2014 and nothing errors. The adapter-disabled approach makes that impossible by construction." },
        { t: "p", text: "In TRL this is `ref_model=None` with a LoRA-wrapped policy. Worth knowing because the memory saving is what makes DPO accessible rather than merely cheaper." }
      ] },

    { t: "table",
      head: ["", "PPO (RLHF)", "DPO"],
      rows: [
        ["Models in memory", "4 \u2014 **234.7 GB** at 7B", "2, or 1 with LoRA \u2014 **117.3 GB**"],
        ["Needs a reward model", "Yes", "**No**"],
        ["Needs online sampling", "Yes, and it dominates the wall clock", "**No** \u2014 offline pairs"],
        ["Hyperparameter sensitivity", "High, and \u03b2 couples to the reward scale", "Low"],
        ["Learning rate", "~1e-6", "**~5e-7** \u2014 much lower than SFT"],
        ["Can exceed its data", "**Yes** \u2014 explores beyond the preference set", "No \u2014 bounded by the pairs you have"],
        ["Typical use", "Frontier labs, reasoning RL", "**The default for everyone else**"]
      ] },

    { t: "callout", kind: "warn", title: "\u201cBounded by the pairs you have\u201d is the real limitation",
      body: [
        { t: "p", text: "DPO can only re-rank behaviours already latent in the model. If no response in your dataset exhibits the behaviour you want, DPO cannot discover it \u2014 there is no sampling step in which something new could appear." },
        { t: "p", text: "PPO can, because it generates fresh completions and scores them, so the policy can find an answer better than anything a human wrote down. That is a genuine capability difference rather than an efficiency one." },
        { t: "p", text: "The modern compromise is **iterative or online DPO**: generate fresh completions from the current policy, label them with a reward model or a judge, run DPO, repeat. You get DPO\u2019s stability with some of PPO\u2019s exploration, at the cost of reintroducing a scorer and a generation step." }
      ] },

    { t: "exercise", kind: "build", title: "Compute implicit rewards and find your own length bias", difficulty: "advanced", minutes: 40,
      body: "Implement sequence_logprob and the DPO margin, then use them to measure the length bias on your own preference data: plot the implicit reward of the chosen response against its token count, and report the correlation. Also report whether your chosen responses are systematically longer than your rejected ones.",
      requirements: [
        "Sum log-probabilities over response tokens only, masking the prompt",
        "Compute the implicit reward as beta * (policy - reference) for both responses",
        "Report correlation between chosen-response length and its implicit reward",
        "Report mean chosen length against mean rejected length in your dataset",
        "State whether a length-normalised variant is warranted and why"
      ],
      hint: "Check the length statistics of your dataset first. If chosen responses are systematically longer, DPO will learn length as a proxy for quality and you will not be able to tell the two apart afterwards.",
      solution: { lang: "python", title: "the margin, and the length diagnostic", code: `def sequence_logprob(model, ids, labels, attn):
    logits = model(ids, attention_mask=attn).logits[:, :-1]
    tgt  = labels[:, 1:]
    mask = tgt != -100
    tgt  = tgt.masked_fill(~mask, 0)          # -100 is not a valid gather index
    lp   = torch.log_softmax(logits, -1).gather(-1, tgt.unsqueeze(-1)).squeeze(-1)
    return (lp * mask).sum(-1), mask.sum(-1)  # summed logprob AND token count

def dpo_margin(policy, ref, batch, beta=0.1):
    pi_w,  n_w = sequence_logprob(policy, batch["chosen_ids"],   ...)
    pi_l,  n_l = sequence_logprob(policy, batch["rejected_ids"], ...)
    with torch.no_grad():
        ref_w, _ = sequence_logprob(ref, batch["chosen_ids"],   ...)
        ref_l, _ = sequence_logprob(ref, batch["rejected_ids"], ...)
    rew_w = beta * (pi_w - ref_w)
    rew_l = beta * (pi_l - ref_l)
    return rew_w - rew_l, rew_w, rew_l, n_w, n_l

# the diagnostic that matters
margins, rew_w, n_w, n_l = [], [], [], []
for batch in loader:
    m, rw, rl, nw, nl = dpo_margin(policy, ref, batch)
    margins += m.tolist(); rew_w += rw.tolist()
    n_w += nw.tolist();    n_l += nl.tolist()

print("corr(chosen length, chosen implicit reward) = %+.4f"
      % np.corrcoef(n_w, rew_w)[0, 1])
print("mean chosen length %.1f vs rejected %.1f" % (np.mean(n_w), np.mean(n_l)))
print("reward accuracy (margin > 0): %.3f" % np.mean(np.array(margins) > 0))`,
        out: `  [shape -- run against your own pairs]

  corr(chosen length, chosen implicit reward) = +0.61
  mean chosen length 148.3 vs rejected 96.7
  reward accuracy (margin > 0): 0.712`,
        notes: [
          { t: "p", text: "**The second line is the one that decides things.** If chosen responses are systematically longer than rejected ones \u2014 148 against 97 here \u2014 then length and quality are confounded in your labels, and DPO will happily learn length because it is the easier signal." },
          { t: "p", text: "**The correlation is the mechanism showing up.** The implicit reward is \u03b2\u00b7d\u00b7n, linear in token count, so a positive correlation between length and reward is expected even without a labelling bias. Measured on gpt2, summed log-probability correlated \u22120.9988 with length while the mean correlated only +0.6854 \u2014 the sum is essentially a length measurement." },
          { t: "p", text: "**Reward accuracy around 0.65\u20130.80 is the healthy band.** Much higher on training data means you are overfitting the pairs; much lower means the margin is not separating them and \u03b2 or the learning rate needs attention." },
          { t: "p", text: "**Return the token counts from `sequence_logprob`.** You need them for this diagnostic and for any length-normalised variant, and computing them separately risks a mismatch with the mask actually used in the loss." },
          { t: "p", text: "One implementation note that bites: `labels.masked_fill(~mask, 0)` before `gather` is required, because \u2212100 is not a valid index and `gather` raises rather than ignoring it. The multiply-by-mask afterwards is what actually removes those positions from the sum." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "The KL-constrained optimum is an exponentially tilted reference policy; invert it and the reward is \u03b2 times a log-ratio. Bradley-Terry only sees differences, so the intractable partition function cancels, and what remains is a supervised loss over four log-probabilities." },
        { t: "p", text: "Hold the length consequence too: the implicit reward is a sum over response tokens, so it equals \u03b2\u00b7d\u00b7n and a long mediocre answer can match a short excellent one. That is the mechanism behind DPO\u2019s drift toward length and the reason SimPO normalises." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cDerive DPO and tell me what it buys you.\u201d**" },
        { t: "p", text: "Three steps. The KL-constrained RLHF objective has a closed-form optimum \u2014 the reference policy reweighted by exp of reward over beta, divided by a partition function. Invert that to get the reward as beta times the log-ratio of the optimal policy to the reference, plus beta log Z. Substitute into Bradley-Terry, and because that loss sees only the difference of two rewards for the same prompt, the log Z terms are identical and cancel." },
        { t: "p", text: "The cancellation is the whole result. Z is a sum over every possible completion, so it is utterly intractable \u2014 and it is also exactly the additive constant that makes a reward model\u2019s absolute scale unidentifiable. The term you could never compute is the term you never needed." },
        { t: "p", text: "What you buy is that the language model is secretly its own reward model: the log-ratio against the frozen reference *is* the reward, so preference optimisation becomes a supervised loss on four log-probabilities. No reward model, no critic, no sampling in the loop. For a 7B policy that is 117.3 GB against PPO\u2019s 234.7 GB, and with LoRA the reference is just the adapter-disabled base weights, so it fits on one GPU." },
        { t: "p", text: "Two practical things I would mention unprompted. The learning rate is about 5e-7, far lower than SFT, which catches people out. And log the chosen and rejected implicit rewards separately rather than just the margin \u2014 a margin that improves while both rewards collapse is a model becoming less confident about everything, and the margin alone hides it." },
        { t: "p", text: "The limitation is that DPO is offline and can only re-rank behaviours already latent in the model. If no response in the dataset shows the behaviour you want, there is no sampling step in which it could appear. That is what iterative DPO addresses \u2014 generate from the current policy, label with a judge, repeat." },
        { t: "p", text: "And I would flag the length bias, because it has a clean mechanism rather than being folklore. The implicit reward is a sum over response tokens, so if the policy gains d nats per token over the reference it collects beta times d times n \u2014 linear in length. A hundred-token response at d = 0.02 earns exactly what a twenty-token response at d = 0.10 earns, so length substitutes for quality. That is what SimPO removes by normalising by length." }
      ] }
  ],

  takeaways: [
    "**The KL-constrained optimum is an exponentially tilted reference policy**, and inverting it gives the reward as \u03b2 times a log-ratio plus \u03b2 log Z.",
    "**Z cancels because Bradley-Terry sees only differences** \u2014 and that is the same fact as 7.4's unidentifiable additive constant, seen from the other side.",
    "**What remains is supervised learning on four log-probabilities**, with no reward model, no critic and no sampling in the loop.",
    "**The worked numbers check out exactly**: margin 0.05 \u2192 0.6685, margin 1.2 \u2192 0.2633, margin \u22120.8 \u2192 1.1711.",
    "**DPO does not require the rejected probability to fall** \u2014 only to rise less than the chosen one's, and in practice both often fall.",
    "**So log chosen and rejected rewards separately**: a growing margin with both rewards collapsing is a model losing confidence in everything.",
    "**\u03b2 scales the margin before the sigmoid**, so small \u03b2 sits at near-maximal gradient (0.4988 at \u03b2 = 0.01) and drifts far; large \u03b2 saturates and holds tight.",
    "**The learning rate is ~5e-7**, much lower than SFT \u2014 a common source of ruined runs.",
    "**Summed log-probability is essentially a length measurement** \u2014 correlation \u22120.9988 with token count against +0.6854 for the mean.",
    "**But the bulk cancels between policy and reference**; what survives is \u03b2\u00b7d\u00b7n, linear in response length, which is the real length bias.",
    "**So a 100-token response at d = 0.02 earns what a 20-token one at d = 0.10 earns** \u2014 length substitutes for quality, which is what SimPO normalises away.",
    "**With LoRA the adapter-disabled base weights are the reference**, which both saves 13 GB and makes a wrong-reference bug impossible.",
    "**DPO is bounded by its pairs** and cannot discover a behaviour absent from the data \u2014 the gap iterative DPO exists to close."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Why does the partition function Z(x) cancel in the DPO derivation?",
        options: [
          "Because it is approximately constant across prompts and can be absorbed into \u03b2",
          "Because Bradley-Terry depends only on the difference of two rewards for the same prompt, and Z(x) depends only on x, so it appears identically in both terms",
          "Because the reference policy is normalised, making Z(x) equal to 1",
          "Because it is estimated by sampling and the estimates cancel in expectation"
        ],
        answer: 1,
        why: "Z(x) is a sum over every possible completion and is completely intractable \u2014 it is not near 1, not constant across prompts, and not estimated. The cancellation is exact and structural: both the chosen and rejected rewards carry the same +\u03b2 log Z(x) term, so the difference is free of it. This is the same property that makes a reward model's absolute scale unidentifiable, which means the uncomputable term is precisely the one that was never needed." },

      { stem: "In the worked example, the policy assigns the rejected response a higher log-probability than the reference does (ratio +0.5). Is this a problem?",
        options: [
          "Yes \u2014 the rejected response's probability must decrease for DPO to be working",
          "No \u2014 DPO requires only that the chosen response's log-ratio rise more than the rejected one's; both can rise, and in practice both often fall",
          "Yes \u2014 it indicates the reference model was initialised from the wrong checkpoint",
          "No \u2014 the sign is irrelevant because \u03b2 rescales both terms equally"
        ],
        answer: 1,
        why: "The loss depends only on the margin between the two implicit rewards, so their individual signs and directions are unconstrained. A well-documented DPO behaviour is the chosen response's log-probability falling over training while the margin still grows, because the rejected one falls faster. This is why chosen and rejected rewards should be logged separately: a margin that improves while both collapse is a model becoming less confident about everything, and the margin alone cannot show it." },

      { stem: "DPO's implicit reward is \u03b2(\u2211log \u03c0_\u03b8 \u2212 \u2211log \u03c0_ref) over response tokens. Where does the length bias come from?",
        options: [
          "From longer responses having more negative summed log-probability, which DPO penalises",
          "From the per-token gain accumulating: if the policy gains d nats per token, the reward is \u03b2\u00b7d\u00b7n, linear in response length",
          "From the tokeniser producing more tokens for verbose phrasing, inflating the vocabulary distribution",
          "From the KL penalty scaling with sequence length"
        ],
        answer: 1,
        why: "The large negative summed log-probabilities largely cancel, because both terms sum over the same tokens \u2014 so the first option has the mechanism backwards. What survives is that the difference accumulates per token, making the reward proportional to length. A 100-token response at d = 0.02 earns the same as a 20-token one at d = 0.10, so length substitutes for quality. SimPO removes this by using a length-normalised average log-probability instead of a sum." },

      { stem: "What is DPO's fundamental limitation relative to PPO?",
        options: [
          "Its memory footprint grows faster with model size",
          "It is offline and bounded by its preference pairs \u2014 with no sampling step, it cannot discover a behaviour absent from the data, only re-rank behaviours already latent",
          "It cannot be combined with LoRA, so it requires a full fine-tune",
          "Its loss is non-convex, so convergence is not guaranteed"
        ],
        answer: 1,
        why: "PPO generates fresh completions and scores them, so the policy can find answers better than anything in the dataset; DPO's training data is fixed, so nothing new can appear. This is a capability difference rather than an efficiency one, and it is why iterative or online DPO exists \u2014 generate from the current policy, label with a reward model or judge, run DPO, repeat. DPO combines particularly well with LoRA, where the adapter-disabled base weights serve as the reference." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "The derivation everyone is asked for",
    questions: [
      { level: "advanced",
        q: "Derive the DPO loss.",
        strong: "A strong answer gets the three steps and explains the cancellation.",
        answer: [
          { t: "p", text: "Start from the KL-constrained RLHF objective. Its optimum is known in closed form: the reference policy reweighted by the exponential of reward over beta, normalised by a partition function Z of x." },
          { t: "p", text: "Second step is pure algebra \u2014 take logs and solve for the reward. You get r equals beta times the log-ratio of the optimal policy to the reference, plus beta log Z of x." },
          { t: "p", text: "Third step, substitute into Bradley-Terry. That loss is negative log-sigmoid of the difference between the chosen and rejected rewards, and because Z depends only on the prompt, both rewards carry the identical beta log Z term \u2014 so it cancels exactly. You are left with log-sigmoid of beta times the difference of two log-ratios." },
          { t: "p", text: "The cancellation is the entire contribution. Z is a sum over every possible completion, so it is intractable \u2014 and it is also exactly the additive constant that makes a reward model's absolute scale unidentifiable. The term you cannot compute is the term you do not need, which is a nice way to remember why it works." },
          { t: "p", text: "One sentence version: the log-ratio against the frozen reference *is* the reward, so the language model is secretly its own reward model and preferences become a supervised loss." }
        ] },

      { level: "core",
        q: "What does \u03b2 control in DPO, and how does it compare to PPO's \u03b2?",
        strong: "A strong answer identifies it as the same leash by a different mechanism.",
        answer: [
          { t: "p", text: "It is the same leash, acting differently. In PPO beta weighted an explicit KL term added to the reward. In DPO it scales the margin before the sigmoid, which decides where you sit on the saturation curve." },
          { t: "p", text: "Concretely, for a log-ratio gap of 0.5 nats: at beta 0.01 the margin is 0.005 and the gradient is 0.4988, within a fraction of a percent of the maximum \u2014 so every pair contributes near-maximal gradient regardless of how well it is already ranked, and the policy moves fast and drifts far. At beta 1.0 the margin is 0.5 and the gradient is 0.3775, already saturating, so well-ranked pairs stop contributing and the policy is held near the reference." },
          { t: "p", text: "Typical value is 0.1. And the learning rate matters as much \u2014 about 5e-7, which is far lower than SFT and is a common way to ruin a DPO run by reusing SFT hyperparameters." },
          { t: "p", text: "One difference worth noting: in PPO beta is coupled to the reward model's output scale, which is mathematically arbitrary, so retraining the RM silently changes the leash. DPO has no reward model, so beta means the same thing across runs \u2014 which is part of why it is less hyperparameter-sensitive." }
        ] },

      { level: "advanced",
        q: "DPO training has made our outputs noticeably longer. Why, and what would you do?",
        strong: "A strong answer gives the mechanism, not just the remedy.",
        answer: [
          { t: "p", text: "Because the implicit reward is a sum over response tokens rather than an average. If the policy gains d nats per token over the reference, the reward is beta times d times n \u2014 linear in the number of response tokens. So a hundred-token response at a small per-token gain earns the same as a twenty-token response at a five-times-larger gain, and length substitutes for quality." },
          { t: "p", text: "Worth being precise about what does *not* cause it. Longer responses have hugely more negative summed log-probability \u2014 I measured a correlation of \u22120.9988 between token count and summed log-probability on gpt2 \u2014 but that bulk term cancels between policy and reference, since both sum over the same tokens. It is the accumulation of the difference that survives." },
          { t: "p", text: "First thing I would check is the data, because the bias may not be the algorithm\u2019s. If the chosen responses in the preference set are systematically longer than the rejected ones, then length and quality are confounded in the labels and DPO is learning the easier signal. That is fixable by rebalancing rather than by changing the loss." },
          { t: "p", text: "If the data is clean, SimPO is the targeted fix \u2014 it replaces the summed log-ratio with a length-normalised average plus a target margin, which removes the linear-in-length term directly. The cost is that you lose the derivation from the KL-constrained objective, so it is a motivated modification rather than a consequence, which I think is a reasonable trade when the behaviour is a real problem." }
        ] }
    ]
  }
});
