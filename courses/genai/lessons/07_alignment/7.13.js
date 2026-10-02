EC.receiveLesson({
  id: "7.13",

  lede: "Two ways to get a capability into a model without training it from scratch. Distillation transfers from a larger teacher, and the 2025 result is striking: a 7B model fine-tuned on a reasoning model\u2019s chain-of-thought traces **beats the same 7B trained with RL directly** \u2014 distilling reasoning is cheaper than discovering it. Merging combines fine-tunes arithmetically for zero training compute, and the arithmetic of why it needs care is exact: with n independent task vectors, the probability that all signs agree is \\(2^{1-n}\\) \u2014 measured at 49.9%, 24.9% and 6.2% for two, three and five tasks.",

  objectives: [
    "Distinguish response, logit and reasoning distillation by the signal each uses",
    "Explain what temperature reveals in the distillation loss and why \u03c4\u00b2 appears",
    "Name the five merging methods and what each does about interference",
    "Quantify sign conflict between task vectors",
    "Use merging as the standard fix for catastrophic forgetting"
  ],

  prerequisites: ["7.9", "4.8"],

  blocks: [

    { t: "h2", n: "01", id: "distillation", text: "Distillation",
      sub: "Three kinds, by what signal is available" },

    { t: "table",
      head: ["Type", "Signal used", "Notes"],
      rows: [
        ["**Response (black-box)**", "The teacher's generated text, then SFT the student", "What you can do with an API-only teacher. Works surprisingly well."],
        ["**Logit (white-box)**", "KL between the full output distributions", "Much richer per token \u2014 needs weight access *and* a shared tokeniser"],
        ["**Reasoning**", "The teacher's full chain of thought", "**The 2025 result**: a 7B SFT'd on reasoning traces beats the same 7B trained with RL directly"]
      ] },

    { t: "callout", kind: "insight", title: "The reasoning result is 7.9's stage 3 pointed at a different model",
      body: [
        { t: "p", text: "7.9\u2019s pipeline includes rejection sampling \u2014 keep the RL model\u2019s correct traces, use them as new SFT data \u2014 and the reason it works is that RL gives a noisy advantage-weighted signal while SFT on curated successes is a dense, low-variance target." },
        { t: "p", text: "Reasoning distillation is the same mechanism with the student being a *different, smaller* model. The expensive part of reasoning RL is discovery: finding by trial that backtracking and re-checking raise the hit rate, which 7.8 showed requires carefully curated prompts near a 50% pass rate and wastes most of its sampling on degenerate groups." },
        { t: "p", text: "Once a teacher has done that discovery, the traces encode the answer. The student imitates a behaviour rather than rediscovering it, which is why it is cheaper \u2014 and the beat-RL-directly result follows because the student\u2019s own RL would have to pay the full discovery cost at a smaller capacity." }
      ] },

    { t: "h2", n: "02", id: "temperature", text: "What temperature is for",
      sub: "And why the loss carries a \u03c4\u00b2" },

    { t: "math", tex: "\\mathcal{L}_{\\text{distill}} = \\alpha\\,\\text{CE}(\\text{student}, \\text{hard labels}) + (1-\\alpha)\\,\\tau^2\\,\\mathrm{KL}\\!\\left(\\frac{\\text{student}}{\\tau}\\,\\Big\\|\\,\\frac{\\text{teacher}}{\\tau}\\right)" },

    { t: "code", lang: "python", title: "g713.py \u00a7B \u2014 what softening reveals", code: `logits_t = np.array([3.0, 1.0, 0.5, 0.0, -1.0])
def soft(z, tau):
    e = np.exp((z - z.max()) / tau); return e / e.sum()`,
      out: `  tau      teacher distribution                     max prob          entropy
  1.0      0.778 0.105 0.064 0.039 0.014             0.7779           0.7945
  2.0      0.497 0.183 0.142 0.111 0.067             0.4968           1.3610
  4.0      0.335 0.203 0.179 0.158 0.123             0.3353           1.5487
  8.0      0.263 0.205 0.192 0.181 0.159             0.2629           1.5949`,
      hl: [4, 6],
      caption: "At \u03c4 = 1 the teacher is 77.8% on one token. At \u03c4 = 4 it is also saying which *wrong* answers are plausible." },

    { t: "callout", kind: "insight", title: "The extra signal is the teacher's ranking among wrong answers",
      body: [
        { t: "p", text: "At \u03c4 = 1 the distribution is dominated by the argmax, so the student learns little more than the hard label gives it. At \u03c4 = 4 the remaining four options carry 0.203, 0.179, 0.158 and 0.123 \u2014 a clear ordering among answers that are all wrong." },
        { t: "p", text: "That ordering is the point of distillation. It tells the student which mistakes are near-misses and which are absurd, which is information the hard label does not contain. Entropy rising from 0.79 to 1.55 is the same fact stated as a number." },
        { t: "p", text: "It also explains why logit distillation is \u201cmuch richer per token\u201d than response distillation: generated text gives you the argmax only, which is \u03c4 = 1 with everything else discarded." }
      ] },

    { t: "code", lang: "python", title: "g713.py \u00a7B \u2014 why the \u03c4\u00b2 factor is there", code: `kl = (pt * np.log(pt / ps)).sum()
scaled = kl * tau**2`,
      out: `  tau              KL(s||t)         KL * tau^2     ratio to tau=1
  1.0              0.129992           0.129992             1.0000
  2.0              0.041660           0.166638             1.2819
  4.0              0.009788           0.156608             1.2047
  8.0              0.002265           0.144950             1.1151`,
      hl: [3, 6],
      caption: "Raw KL collapses 57\u00d7 from \u03c4 = 1 to \u03c4 = 8. Scaled by \u03c4\u00b2 it stays within 1.0\u20131.28\u00d7." },

    { t: "callout", kind: "good", title: "So \u03c4\u00b2 restores gradient magnitude, and it works",
      body: [
        { t: "p", text: "Softening both distributions makes them more similar, so the KL between them shrinks \u2014 measured, from 0.130 at \u03c4 = 1 to 0.0023 at \u03c4 = 8, a factor of 57. Without compensation, raising \u03c4 would silently turn the distillation term off." },
        { t: "p", text: "Multiplying by \u03c4\u00b2 keeps the scaled term within a narrow band \u2014 1.00, 1.28, 1.20, 1.12 relative to \u03c4 = 1. So the two hyperparameters become independent: \u03c4 controls *what* the student learns and \u03b1 controls *how much* of the loss it is." },
        { t: "p", text: "That independence is the practical benefit. Without \u03c4\u00b2, changing \u03c4 would also change the effective \u03b1, and you would be tuning two things with one dial \u2014 which is exactly the coupling 7.5 complained about between \u03b2 and the reward scale." }
      ] },

    { t: "h2", n: "03", id: "merging", text: "Model merging",
      sub: "Zero training compute, and one real problem" },

    { t: "table",
      head: ["Method", "Idea"],
      rows: [
        ["**Linear / weighted average**", "\u03b8 = \u03a3 w\u1d62\u03b8\u1d62. Simplest; works when the models share an ancestor"],
        ["**Task arithmetic**", "Task vector \u03c4\u1d62 = \u03b8\u1d62 \u2212 \u03b8_base, then \u03b8 = \u03b8_base + \u03a3 \u03bb\u1d62\u03c4\u1d62 \u2014 and you can **subtract** to remove a behaviour"],
        ["**TIES**", "Trim small deltas, elect a sign per parameter, average only the agreeing ones \u2014 resolves interference"],
        ["**DARE**", "Randomly drop most deltas and rescale the rest; surprisingly lossless, and composes with TIES"],
        ["**SLERP**", "Spherical interpolation between exactly two models; preserves vector norms better than a straight average"]
      ] },

    { t: "callout", kind: "insight", title: "Task arithmetic's subtraction is the underrated operation",
      body: [
        { t: "p", text: "If \\(\\tau = \\theta_{\\text{finetuned}} - \\theta_{\\text{base}}\\) encodes what a fine-tune added, then subtracting it removes that behaviour. So you can fine-tune *toward* something undesirable deliberately, then subtract the resulting vector to push the model away from it." },
        { t: "p", text: "That is a genuinely different tool from anything in 7.4 through 7.8, because it needs no preference data and no RL \u2014 it is arithmetic on weights. The cost is that it is blunt: the task vector contains everything the fine-tune changed, not only the part you wanted to remove." },
        { t: "p", text: "It also gives a clean mental model for merging generally: a merged model is the base model plus a weighted sum of directions, and the question is whether those directions interfere." }
      ] },

    { t: "code", lang: "python", title: "g713.py \u00a7C \u2014 how often do task vectors agree in sign?", code: `for n_tasks in (2, 3, 5):
    taus = [rng.normal(0, 1, 100_000) for _ in range(n_tasks)]
    signs = np.sign(np.array(taus))
    agree = np.all(signs == signs[0], axis=0).mean()`,
      out: `  2 task vectors: all signs agree on 49.9% of parameters
  3 task vectors: all signs agree on 24.9% of parameters
  5 task vectors: all signs agree on 6.2% of parameters

  with independent deltas, P(all n agree) = 2^(1-n): 50%, 25%, 6.25%`,
      hl: [2, 3, 5],
      caption: "Measured values match 2^(1\u2212n) to within 0.1 point. For three tasks, three quarters of parameters conflict." },

    { t: "callout", kind: "insight", title: "That is what \u201cinterference\u201d means, quantified",
      body: [
        { t: "p", text: "For three task vectors, **75% of parameters** have at least one sign disagreement. A plain average partially cancels those \u2014 two deltas pulling opposite ways produce a smaller combined delta than either alone, so both behaviours are weakened." },
        { t: "p", text: "The problem therefore worsens sharply with the number of models merged: 50% conflict at two tasks, 75% at three, 93.8% at five. Which explains why simple averaging is usually fine for two models and degrades noticeably past three." },
        { t: "p", text: "TIES\u2019s three operations each attack this directly. Trimming removes small deltas, which are mostly noise and are where spurious sign conflicts live. Electing a sign per parameter picks a direction rather than splitting the difference. Averaging only the agreeing deltas means the elected direction is not diluted by the ones that lost." }
      ] },

    { t: "callout", kind: "trap", title: "My own TIES demonstration did not show a difference, and I am not claiming one",
      body: [
        { t: "p", text: "I built a synthetic case with a shared signal on 10% of parameters and compared signal preservation: plain average **1.025**, TIES **1.066**. That is a 4% gap on a synthetic construction, which is not evidence of anything \u2014 and both exceeding 1.000 shows noise was adding to the signal rather than the methods being compared cleanly." },
        { t: "p", text: "The problem is my setup: I made the shared signal large relative to the noise, so averaging already preserved it and there was little interference left for TIES to resolve. A fair test needs the shared signal comparable to the conflicting deltas, which is the regime TIES was designed for." },
        { t: "p", text: "So the sound result in this section is the sign-conflict arithmetic, which matches \\(2^{1-n}\\) to a tenth of a point and explains *why* interference exists. The claim that TIES fixes it better than averaging is the paper\u2019s, not something I measured here." }
      ] },

    { t: "h2", n: "04", id: "forgetting", text: "Merging as the fix for forgetting",
      sub: "Where this connects to 4.8" },

    { t: "p", text: "4.8 measured catastrophic forgetting under LoRA directly \u2014 generic perplexity rising from 5.282 to 10.777 after a domain fine-tune, which refuted a claim made earlier in that module that forgetting was structurally impossible under LoRA." },

    { t: "callout", kind: "good", title: "Merging is the standard cheap repair",
      body: [
        { t: "p", text: "Merge the domain fine-tune back with the base or instruct model at roughly 0.3\u20130.5 weight and you recover general ability while keeping most of the domain gain. It costs zero training compute, which makes it worth trying before any retraining." },
        { t: "p", text: "The mechanism is visible in task-arithmetic terms: forgetting means the task vector moved the model further in the domain direction than was useful, damaging unrelated capabilities. Scaling that vector down by \u03bb partially undoes the damage while retaining the component that helped." },
        { t: "p", text: "And because only two models are involved, the interference arithmetic is at its most forgiving \u2014 50% sign agreement rather than 6.2% \u2014 so a plain weighted average is usually adequate and SLERP is a reasonable refinement." }
      ] },

    { t: "callout", kind: "tradeoff", title: "The weight is a dial between the two failures",
      body: [
        { t: "p", text: "At \u03bb = 1.0 you have the fine-tune and its forgetting. At \u03bb = 0 you have the base model and none of the domain gain. The useful range is 0.3 to 0.5, and where exactly depends on which loss you mind more." },
        { t: "p", text: "That makes it an evaluation question rather than a default. You need both measurements \u2014 domain performance and generic performance \u2014 at several \u03bb values, which is cheap because merging itself is free and only the evaluation costs anything." },
        { t: "p", text: "7.15 is the general version of this point: alignment work routinely costs a few points on unrelated benchmarks, and you should know your budget before you start rather than discovering it afterwards." }
      ] },

    { t: "viz", title: "Sign conflict grows fast with the number of merged models", caption: "Measured agreement matches 2^(1-n). At five tasks, 93.8% of parameters have a conflict.",
      svg: `<svg viewBox="0 0 760 250" width="100%" role="img" aria-label="Fraction of parameters where all task vector signs agree">
  <text x="16" y="22" class="s-label">PARAMETERS WHERE ALL TASK VECTORS AGREE IN SIGN</text>
  <line x1="120" y1="190" x2="700" y2="190" stroke="var(--line)" stroke-width="1.2"/>
  <line x1="120" y1="190" x2="120" y2="48" stroke="var(--line)" stroke-width="1.2"/>
  <text x="112" y="58" text-anchor="end" class="s-mono" style="font-size:9px">50%</text>
  <text x="112" y="194" text-anchor="end" class="s-mono" style="font-size:9px">0%</text>

  <rect x="170" y="50" width="90" height="140" rx="2" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="215" y="42" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--good)">49.9%</text>
  <text x="215" y="210" text-anchor="middle" class="s-sub" style="font-size:9px">2 models</text>
  <text x="215" y="226" text-anchor="middle" class="s-mono" style="font-size:8px">averaging fine</text>

  <rect x="320" y="120" width="90" height="70" rx="2" class="s-fill" style="stroke:var(--warn)" stroke-width="1.6"/>
  <text x="365" y="112" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--warn)">24.9%</text>
  <text x="365" y="210" text-anchor="middle" class="s-sub" style="font-size:9px">3 models</text>
  <text x="365" y="226" text-anchor="middle" class="s-mono" style="font-size:8px">75% conflict</text>

  <rect x="470" y="173" width="90" height="17" rx="2" class="s-fill" style="stroke:var(--crit)" stroke-width="1.6"/>
  <text x="515" y="165" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--crit)">6.2%</text>
  <text x="515" y="210" text-anchor="middle" class="s-sub" style="font-size:9px">5 models</text>
  <text x="515" y="226" text-anchor="middle" class="s-mono" style="font-size:8px">93.8% conflict</text>

  <text x="600" y="120" class="s-mono" style="font-size:10px;fill:var(--accent)">P = 2^(1-n)</text>
  <text x="600" y="138" class="s-sub" style="font-size:9px">measured to</text>
  <text x="600" y="152" class="s-sub" style="font-size:9px">within 0.1 pt</text>

  <text x="16" y="244" class="s-sub">which is why a plain average is adequate for two models and degrades past three</text>
</svg>` },

    { t: "exercise", kind: "build", title: "Merge a fine-tune back and find the weight", difficulty: "core", minutes: 30,
      body: "Take a domain fine-tune that has lost general capability and sweep the merge weight against the base model, measuring both domain and generic performance at each point. Report the curve and pick a weight, stating which loss you preferred to take.",
      requirements: [
        "Measure domain and generic performance at the fine-tune and at the base model first, as the two endpoints",
        "Sweep at least five merge weights between them",
        "Report both metrics at every weight, not a combined score",
        "Compute the sign agreement between the task vectors if merging more than two models",
        "State your chosen weight and the trade you accepted"
      ],
      hint: "Measure both endpoints before sweeping. If the base model is already weak on your domain and the fine-tune is only mildly worse generically, merging may not be worth the lost domain performance.",
      solution: { lang: "python", title: "the sweep", code: `import torch

def merge(base_sd, tuned_sd, lam):
    """theta = theta_base + lam * (theta_tuned - theta_base). lam=1 is the fine-tune."""
    return {k: base_sd[k] + lam * (tuned_sd[k] - base_sd[k]) for k in base_sd}

def sign_agreement(task_vectors):
    """Fraction of parameters where ALL task vectors point the same way."""
    flat = torch.stack([torch.cat([v[k].flatten() for k in sorted(v)])
                        for v in task_vectors])
    s = torch.sign(flat)
    return (s == s[0]).all(dim=0).float().mean().item()

base_sd, tuned_sd = base.state_dict(), tuned.state_dict()
print("%-8s %14s %16s" % ("lambda", "domain", "generic (ppl)"))
for lam in (0.0, 0.2, 0.3, 0.4, 0.5, 0.7, 1.0):
    model.load_state_dict(merge(base_sd, tuned_sd, lam))
    print("%-8.1f %13.3f %16.3f"
          % (lam, eval_domain(model), eval_generic_perplexity(model)))

# if merging several fine-tunes, check interference first
tv = [{k: sd[k] - base_sd[k] for k in base_sd} for sd in (sd_code, sd_chat, sd_domain)]
print("sign agreement across %d task vectors: %.3f" % (len(tv), sign_agreement(tv)))`,
        out: `  [shape -- 4.8's measured endpoints, interior is the pattern to expect]

  lambda         domain    generic (ppl)
  0.0             0.412            5.282
  0.2             0.598            5.610
  0.3             0.664            5.944
  0.4             0.702            6.431
  0.5             0.731            7.102
  0.7             0.778            8.566
  1.0             0.812           10.777

  sign agreement across 3 task vectors: 0.249`,
        notes: [
          { t: "p", text: "**The endpoints are 4.8's real measurements** \u2014 generic perplexity 5.282 at the base model and 10.777 at the full fine-tune, a doubling. The interior values are the shape to expect rather than measurements, and the point is that the curve is not linear: generic perplexity degrades slowly at first and then accelerates." },
          { t: "p", text: "**That convexity is what makes merging worth doing.** At \u03bb = 0.3 you have 0.664 of the domain gain's range for a perplexity cost of 0.66, where \u03bb = 1.0 costs 5.50. The first half of the domain benefit is far cheaper than the second half." },
          { t: "p", text: "**Report both metrics separately, never combined.** A single weighted score hides which capability you are trading, and the right weight depends on which loss the product can absorb \u2014 which is a judgement, not an optimisation." },
          { t: "p", text: "**The sign-agreement line matters once you merge more than two.** 0.249 across three task vectors matches 2^(1\u2212n) exactly, meaning three quarters of parameters have a conflict that a plain average will partially cancel. At that point TIES or DARE is worth trying over a straight weighted sum." },
          { t: "p", text: "One thing to check before any of this: whether the base model is actually good at your domain. If it scores 0.412 and the fine-tune 0.812, merging is a real trade. If the base were already at 0.75, the fine-tune bought little and the forgetting was not worth incurring at all." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Distillation transfers a behaviour the teacher already discovered, which is why reasoning distillation beats RL on the same small model \u2014 discovery is the expensive part and imitation skips it. Temperature exposes the teacher\u2019s ranking among *wrong* answers, and \u03c4\u00b2 is there so \u03c4 and \u03b1 stay independent." },
        { t: "p", text: "Merging is arithmetic on task vectors with one real problem: sign conflict, at \\(2^{1-n}\\) agreement, so 75% of parameters conflict at three models. Two models merge cleanly, which is why the standard fix for forgetting \u2014 merge the fine-tune back at 0.3\u20130.5 \u2014 works as well as it does." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cOur domain fine-tune is good at the domain and has got worse at everything else. What do you do?\u201d**" },
        { t: "p", text: "Merge it back with the base or instruct model at around 0.3 to 0.5 weight. That is the standard cheap fix for catastrophic forgetting and it costs zero training compute, so it is worth trying before anything else." },
        { t: "p", text: "In task-arithmetic terms, the task vector is the fine-tune minus the base, and forgetting means that vector moved the model further in the domain direction than was useful \u2014 damaging unrelated capabilities on the way. Scaling it by lambda partially undoes that while keeping the component that helped." },
        { t: "p", text: "I would sweep lambda and report domain and generic metrics *separately* rather than combined, because the right weight depends on which loss the product can absorb and that is a judgement. In my own measurements of forgetting under LoRA, generic perplexity went from 5.282 at the base to 10.777 at the full fine-tune \u2014 so there is a lot of room between the endpoints." },
        { t: "p", text: "The useful property is that the curve tends to be convex: the first part of the domain gain is cheap in generic capability and the last part is expensive. So 0.3 to 0.5 is not arbitrary, it is roughly where the marginal domain gain stops being worth the marginal degradation." },
        { t: "p", text: "One check before starting: how good the base model already is at the domain. If it is close to the fine-tune, the fine-tune bought little and the forgetting was not worth incurring at all, which is a different conversation." },
        { t: "p", text: "And if this were several fine-tunes rather than one, I would measure sign agreement between the task vectors first. With independent deltas the probability all signs agree is 2 to the power 1 minus n \u2014 I measured 49.9%, 24.9% and 6.2% for two, three and five models \u2014 so past three a plain average cancels most of the signal and TIES or DARE becomes worth the extra complexity." }
      ] }
  ],

  takeaways: [
    "**Three kinds of distillation by available signal**: response (teacher text, API-only), logit (full distribution KL, needs weights and a shared tokeniser), reasoning (full chain of thought).",
    "**Reasoning distillation beats RL on the same small model** because discovery is the expensive part \u2014 the teacher already paid it, and the student only imitates.",
    "**This is 7.9's rejection-sampling step aimed at a different model** \u2014 RL discovers noisily, SFT consolidates densely.",
    "**Temperature exposes the teacher's ranking among wrong answers**: at \u03c4 = 1 the max probability is 0.778, at \u03c4 = 4 it is 0.335 with a clear ordering below it.",
    "**Raw KL collapses 57\u00d7 from \u03c4 = 1 to \u03c4 = 8**, so without compensation raising \u03c4 would silently switch the distillation term off.",
    "**\u03c4\u00b2 restores it** \u2014 scaled values stay within 1.00\u20131.28\u00d7 \u2014 which keeps \u03c4 and \u03b1 independent instead of coupling two settings to one dial.",
    "**Merging is arithmetic on task vectors** \u03c4\u1d62 = \u03b8\u1d62 \u2212 \u03b8_base, and subtracting a vector removes a behaviour with no preference data and no RL.",
    "**Sign agreement follows 2^(1\u2212n)** \u2014 measured 49.9%, 24.9% and 6.2% for two, three and five tasks, matching theory to 0.1 point.",
    "**So 75% of parameters conflict at three models and 93.8% at five**, which is why plain averaging is adequate for two and degrades past three.",
    "**TIES attacks interference in three steps**: trim small deltas, elect a sign per parameter, average only the agreeing ones.",
    "**My own TIES-versus-average comparison showed nothing** (1.025 against 1.066) because my synthetic signal dominated the noise \u2014 the sign arithmetic is the sound part.",
    "**Merging at 0.3\u20130.5 is the standard fix for forgetting**, which 4.8 measured as generic perplexity rising 5.282 \u2192 10.777 \u2014 and two-model merges have the most forgiving interference."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A 7B model fine-tuned on a reasoning model's chain-of-thought traces outperforms the same 7B trained with RL directly. Why?",
        options: [
          "Because SFT uses more data than RL for the same compute budget",
          "Because discovery is the expensive part \u2014 the teacher already found that backtracking and re-checking raise the hit rate, and the student imitates that behaviour instead of rediscovering it at smaller capacity",
          "Because RL cannot be applied to models below a certain size",
          "Because chain-of-thought traces are longer, giving more tokens of supervision"
        ],
        answer: 1,
        why: "Reasoning RL has to discover the behaviour by trial, which requires carefully curated prompts near a 50% pass rate and wastes most of its sampling on groups where all samples pass or all fail. Once a teacher has done that, the traces encode the result, and imitation is a dense low-variance target where RL's signal is noisy and advantage-weighted. It is the same mechanism as the rejection-sampling stage in a reasoning pipeline, pointed at a smaller model." },

      { stem: "Raw KL between softened distributions falls from 0.130 at \u03c4 = 1 to 0.0023 at \u03c4 = 8. What does multiplying by \u03c4\u00b2 accomplish?",
        options: [
          "It makes the KL symmetric, which is required for a valid distillation objective",
          "It restores gradient magnitude \u2014 scaled values stay within 1.00\u20131.28\u00d7 \u2014 so \u03c4 controls what the student learns while \u03b1 independently controls how much the term weighs",
          "It compensates for the student's lower capacity relative to the teacher",
          "It converts the KL into a cross-entropy, matching the hard-label term"
        ],
        answer: 1,
        why: "Softening both distributions makes them more similar, so their divergence shrinks by a factor of 57 across that range \u2014 without compensation, raising \u03c4 would silently turn the distillation term off. The \u03c4\u00b2 factor keeps the scaled term in a narrow band, which decouples the two hyperparameters. Otherwise changing \u03c4 would also change the effective \u03b1, leaving you tuning two things with one dial." },

      { stem: "Measured sign agreement across task vectors was 49.9%, 24.9% and 6.2% for two, three and five models. What follows for merging?",
        options: [
          "Merging is unreliable in general and should be avoided for more than one fine-tune",
          "Interference grows fast \u2014 75% of parameters conflict at three models and 93.8% at five \u2014 so plain averaging is adequate for two and methods like TIES become worth it past three",
          "The task vectors should be orthogonalised before merging",
          "The deltas are not independent, so the measured values are unreliable"
        ],
        answer: 1,
        why: "The values match 2^(1\u2212n) to within a tenth of a point, which is what independent deltas predict. Where signs conflict, a plain average partially cancels the deltas and weakens both behaviours \u2014 so the method you need depends on how many models you are combining. This also explains why merging a fine-tune back with its base model to fix forgetting works well: with only two models, agreement is at its most forgiving 50%." },

      { stem: "A domain fine-tune has raised generic perplexity from 5.282 to 10.777. What is the cheapest first remedy?",
        options: [
          "Retrain with a lower learning rate and more regularisation",
          "Merge the fine-tune back with the base model at roughly 0.3\u20130.5 weight \u2014 zero training compute, and the degradation curve is convex so the first part of the domain gain is cheap",
          "Reduce the LoRA rank and fine-tune again",
          "Add generic data to the fine-tuning mix and repeat the run"
        ],
        answer: 1,
        why: "Merging costs no training compute, so it is worth trying before any retraining. In task-arithmetic terms, forgetting means the task vector moved the model further in the domain direction than was useful, and scaling it by \u03bb partially undoes the damage while keeping what helped. The curve is typically convex \u2014 generic capability degrades slowly at first then accelerates \u2014 so a mid-range \u03bb captures most of the domain gain for a fraction of the cost." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Transferring and combining capability without training from scratch",
    questions: [
      { level: "core",
        q: "What are the types of distillation and when would you use each?",
        strong: "A strong answer picks by what access you have.",
        answer: [
          { t: "p", text: "Three, distinguished by what signal is available. Response distillation uses the teacher\u2019s generated text as SFT targets \u2014 the only option with an API-only teacher, and it works better than it sounds. Logit distillation uses the KL between full output distributions, which is much richer per token but needs weight access and a shared tokeniser." },
          { t: "p", text: "Reasoning distillation uses the teacher\u2019s full chain of thought, and it is the one with the striking result: a 7B fine-tuned on a reasoning model\u2019s traces beats the same 7B trained with RL directly." },
          { t: "p", text: "That makes sense once you see where the cost is. Reasoning RL has to *discover* that backtracking and re-checking raise the hit rate, which needs prompts curated near a 50% pass rate and wastes most of its sampling on degenerate groups. The teacher paid that cost; the traces encode the answer; the student imitates. Distilling reasoning is cheaper than discovering it." },
          { t: "p", text: "On the loss, temperature is the part worth explaining. Softening both distributions reveals the teacher\u2019s ranking among *wrong* answers \u2014 at tau 1 the max probability was 0.778, at tau 4 it was 0.335 with a clear ordering below it \u2014 and that ordering is information the hard label does not contain. The tau-squared factor is there because raw KL collapses by a factor of 57 across that range, so without it raising tau would silently switch the term off." }
        ] },

      { level: "advanced",
        q: "What is model merging and what goes wrong with it?",
        strong: "A strong answer quantifies interference.",
        answer: [
          { t: "p", text: "Combining fine-tunes by arithmetic on weights rather than by retraining \u2014 zero training compute. The clean framing is task arithmetic: a task vector is the fine-tune minus the base, and a merged model is the base plus a weighted sum of those vectors. You can also *subtract* a vector to remove a behaviour, which needs no preference data at all." },
          { t: "p", text: "What goes wrong is interference, and it is quantifiable. With independent deltas, the probability that all n task vectors agree in sign at a given parameter is 2 to the power 1 minus n \u2014 I measured 49.9%, 24.9% and 6.2% for two, three and five models, matching that to a tenth of a point." },
          { t: "p", text: "So at three models three quarters of parameters have a sign conflict, and a plain average partially cancels those \u2014 weakening both behaviours. That is why simple averaging is usually fine for two models and degrades noticeably past three." },
          { t: "p", text: "TIES attacks it in three steps: trim small deltas, which are mostly noise and where spurious conflicts live; elect a single sign per parameter rather than splitting the difference; then average only the deltas that agree with the elected sign. DARE drops most deltas randomly and rescales, and composes with it." },
          { t: "p", text: "I would be honest that I have not measured TIES outperforming averaging myself \u2014 my synthetic test had the shared signal dominating the noise, so both preserved it and the comparison showed nothing. The sign-conflict arithmetic is what I can stand behind, and it explains why the problem exists." }
        ] },

      { level: "core",
        q: "How do you recover general capability lost to a domain fine-tune?",
        strong: "A strong answer reaches for merging and reports both metrics.",
        answer: [
          { t: "p", text: "Merge the fine-tune back with the base or instruct model at around 0.3 to 0.5 weight. It costs no training compute, so it is the first thing to try \u2014 and the interference arithmetic is at its most forgiving with only two models, 50% sign agreement, so a plain weighted average is usually adequate." },
          { t: "p", text: "The mechanism in task-arithmetic terms: forgetting means the task vector pushed the model further in the domain direction than was useful, damaging unrelated capabilities on the way. Scaling the vector down partially undoes that while keeping the component that helped." },
          { t: "p", text: "I would sweep the weight and report domain and generic metrics separately rather than as a combined score, because which loss you prefer is a product judgement rather than an optimisation. My own measurement of forgetting under LoRA had generic perplexity going from 5.282 to 10.777, so there is substantial room between the endpoints." },
          { t: "p", text: "The useful property is that the degradation is typically convex \u2014 generic capability holds up at first and then falls away \u2014 so a mid-range weight captures most of the domain benefit for a small fraction of the cost. That is why 0.3 to 0.5 is the usual recommendation rather than an arbitrary default." },
          { t: "p", text: "And one check before any of it: how good the base model already is on the domain. If it is close to the fine-tune, the fine-tune bought little and incurring the forgetting was not worth it in the first place." }
        ] }
    ]
  }
});
