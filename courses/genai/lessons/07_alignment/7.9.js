EC.receiveLesson({
  id: "7.9",

  lede: "RLVR replaces the learned reward model with a **program** \u2014 a unit test, a maths checker, a schema validator. The consequence the reference identifies is the right one: a verifier cannot be flattered, so the overoptimisation ceiling in 7.11 largely disappears and you can run RL far longer before the reward becomes a lie. The consequence it does not draw out is that binary rewards make 7.8\u2019s degenerate case **acute** rather than incidental \u2014 with a 0/1 verifier, every prompt the model always passes or always fails contributes exactly zero gradient, and that is most prompts.",

  objectives: [
    "State what changes when the reward is a program rather than a model",
    "Name the domains where RLVR applies and why it stops there",
    "Trace the four stages of the DeepSeek-R1 training shape",
    "Explain why response length grew without being asked for",
    "Distinguish an outcome reward model from a process reward model"
  ],

  prerequisites: ["7.8"],

  blocks: [

    { t: "h2", n: "01", id: "shift", text: "The reward becomes code",
      sub: "And code cannot be flattered" },

    { t: "code", lang: "python", title: "the whole idea", code: `def reward(problem, completion):
    if problem.type == "math":
        return 1.0 if extract_boxed(completion) == problem.gold else 0.0
    if problem.type == "code":
        return fraction_of_unit_tests_passing(completion, problem.tests)
    if problem.type == "format":
        return 1.0 if re.search(r"<think>.*?</think>.*", completion, re.S) else 0.0`,
      hl: [3, 5],
      caption: "No neural network, no preference data, no annotation cost. A function from completion to scalar." },

    { t: "callout", kind: "insight", title: "This removes the failure mode 7.4 and 7.5 were working around",
      body: [
        { t: "p", text: "7.4 measured why a learned reward model is exploitable: the Bradley-Terry gradient is \\(1-\\sigma(g)\\), so it vanishes once a gap is large and **nothing constrains how big a correct gap becomes**. There are regions where the RM confidently assigns enormous scores for no good reason, and 7.5\u2019s KL leash exists to stop the policy finding them." },
        { t: "p", text: "A verifier has no such regions. `extract_boxed(completion) == problem.gold` is either true or it is not, and no amount of length, confidence, flattery or formatting changes the answer. The model cannot write a longer proof to make a unit test pass." },
        { t: "p", text: "So you can optimise against it much harder. The practical consequence is that the KL leash becomes a mild regulariser preventing degeneration rather than the load-bearing defence it is in RLHF \u2014 and training runs can be far longer before the reward stops correlating with what you wanted." }
      ] },

    { t: "callout", kind: "warn", title: "The honest limitation, which is the interview answer",
      body: [
        { t: "p", text: "RLVR works only where correctness is **checkable**: mathematics, code, formal logic, structured extraction, tool-call validity, schema compliance. That is a real and growing set and it is not everything." },
        { t: "p", text: "For \u201cwrite a warm apology email\u201d there is no verifier. There is no program that returns 1.0 for a good apology, and any proxy you write \u2014 length, sentiment score, keyword presence \u2014 is a learned-reward-model problem wearing a verifier\u2019s clothing, with all the hackability back." },
        { t: "p", text: "So real pipelines use both: RLVR on verifiable domains, preference methods on subjective ones. Claiming RLVR replaces DPO is the error to avoid \u2014 they cover disjoint territory." }
      ] },

    { t: "callout", kind: "trap", title: "And a verifier can still be gamed, just not flattered",
      body: [
        { t: "p", text: "\u201cCannot be hacked\u201d overstates it. A weak verifier is exploitable in a different way: if `fraction_of_unit_tests_passing` is the reward and the tests are shallow, the model learns to pass shallow tests \u2014 special-casing the inputs it has seen rather than solving the problem." },
        { t: "p", text: "The classic failure is a reward that checks the final answer only. A model can reach a correct answer through invalid reasoning, and an outcome-only verifier rewards it identically \u2014 which is exactly the credit-assignment weakness \u00a705 covers." }
        ,{ t: "p", text: "So the resistance to hacking is a property of the *verifier\u2019s* strength, not of verification as a concept. The gain over a learned RM is that a verifier\u2019s weaknesses are legible: you can read the tests. You cannot read a reward model." }
      ] },

    { t: "h2", n: "02", id: "degenerate", text: "Binary rewards make 7.8's degenerate case acute",
      sub: "The interaction the reference does not mention" },

    { t: "p", text: "7.8 measured that GRPO produces exactly zero advantage when all G samples in a group receive the same reward. With a learned reward model, continuous scores make exact ties rare. With a 0/1 verifier they are the common case." },

    { t: "code", lang: "text", title: "7.8's measurement, re-read for RLVR", code: `rewards                        std        advantages
all correct (6/6)           0.0000   +0.000 x6     <- no gradient
all wrong   (0/6)           0.0000   +0.000 x6     <- no gradient
half and half (3/6)         0.5477   +0.913 x3, -0.913 x3

mean |advantage|: 0.000 at 0/6, 0.6802 at 1/6, 0.9127 at 3/6, 0.000 at 6/6`,
      hl: [2, 3, 6],
      caption: "Binary rewards mean a group is all-pass or all-fail far more often than a continuous score would tie." },

    { t: "callout", kind: "insight", title: "So prompt difficulty curation is not optional in RLVR, it is the main lever",
      body: [
        { t: "p", text: "A problem set your model already solves gives all-pass groups and no gradient. A set far beyond it gives all-fail groups and no gradient. 7.8 measured signal peaking at half-correct, so the useful problems are the ones at roughly a 50% pass rate for the *current* policy." },
        { t: "p", text: "And that target moves. As the model improves, problems migrate from half-correct to all-correct and stop contributing, which means the curriculum has to be re-derived during training rather than chosen once. This is why reasoning-RL pipelines spend real effort on problem-set construction and filtering." },
        { t: "p", text: "The monitor from 7.8 applies directly and matters more here: log the zero-variance fraction split into all-pass and all-fail. Generation dominates the wall clock, so a high zero-variance fraction means paying full sampling cost for no learning \u2014 with no error and a normal-looking loss." }
      ] },

    { t: "h2", n: "03", id: "r1", text: "How a reasoning model is trained",
      sub: "The DeepSeek-R1 shape, in four stages" },

    { t: "ol", items: [
      "**(Optional) cold-start SFT** on a few thousand long chain-of-thought examples \u2014 gives a readable reasoning format to build on",
      "**GRPO with verifiable rewards** on maths and code \u2014 this is where the model learns to think longer",
      "**Rejection sampling**: keep the RL model\u2019s *correct* traces, use them as new SFT data \u2014 consolidate what RL found",
      "**A final preference or safety pass** with DPO or RLHF \u2014 helpfulness and harmlessness, which no verifier can supply"
    ] },

    { t: "callout", kind: "insight", title: "Stage 3 is the one that looks redundant and is not",
      body: [
        { t: "p", text: "RL has already improved the policy, so re-training on its own correct outputs sounds circular. It is not, because RL and SFT move weights differently: RL gives a noisy, high-variance signal weighted by advantages, while SFT on a curated set of successes is a dense, low-variance target." },
        { t: "p", text: "So stage 3 *consolidates*. It takes the behaviour RL discovered stochastically and makes it the model\u2019s default through ordinary imitation \u2014 which is cheaper and more stable than continuing to run RL to the same point." },
        { t: "p", text: "It also connects to \u00a704 of 7.13: distilling a reasoning model\u2019s traces into a smaller model beats training that smaller model with RL directly. Stage 3 is the same mechanism applied to the model itself rather than to a student." }
      ] },

    { t: "callout", kind: "good", title: "Stage 4 exists because verifiers do not cover helpfulness",
      body: [
        { t: "p", text: "A model optimised purely against maths and code verifiers is good at maths and code and says nothing about whether it is pleasant, safe or appropriately cautious. Those are exactly the properties with no programmatic check, so they need the preference machinery of 7.6." },
        { t: "p", text: "Which is why the pipeline ends where it does. The two reward sources are complementary rather than competing, and a production reasoning model needs both passes \u2014 verifiable for capability, preference-based for behaviour." },
        { t: "p", text: "Worth noting the ordering, too. Doing the safety pass last means it is the most recent thing in the weights, which matters because 4.8 measured how readily later training overwrites earlier behaviour." }
      ] },

    { t: "h2", n: "04", id: "emergent", text: "Nobody told it to think longer",
      sub: "The result that made this approach famous" },

    { t: "p", text: "Given only \u201ccorrect answer = 1\u201d as a signal, response length **grew on its own** over training. No part of the reward mentions length, reasoning steps, backtracking or verification \u2014 and behaviours like \u201cWait, let me reconsider\u2026\u201d appeared without ever being demonstrated." },

    { t: "callout", kind: "insight", title: "Why this is less mysterious than it sounds, and still remarkable",
      body: [
        { t: "p", text: "The mechanism is straightforward: longer reasoning raises the hit rate on hard problems, and the reward is the hit rate. So gradient ascent on correctness finds length because length *works* \u2014 backtracking, re-checking and enumerating cases genuinely increase the chance of a correct final answer." },
        { t: "p", text: "What makes it notable is the contrast with 7.11\u2019s length bias. There, length is a **hack**: annotators mistake length for effort, so the RM rewards it and quality does not improve. Here length is a **discovery**: the verifier is indifferent to length and rewards only correctness, so the length gain is real capability." },
        { t: "p", text: "Same observable symptom, opposite meaning, distinguished entirely by what the reward measures. That is the sharpest illustration in this module of why the reward\u2019s nature matters more than the optimiser\u2019s." }
      ] },

    { t: "callout", kind: "tradeoff", title: "And it hands you a bill at inference",
      body: [
        { t: "p", text: "Longer reasoning is longer generation, which M3 established is the bandwidth-bound, sequential part of serving. So the capability gained in training is paid for on every request afterwards \u2014 7.10 is about managing exactly this trade." },
        { t: "p", text: "It also interacts with 7.2\u2019s argument in an interesting way. Over-training buys a smaller model so inference is cheaper per token; reasoning training buys accuracy by generating more tokens. The two push in opposite directions on the same cost line." },
        { t: "p", text: "Which is why reasoning models typically expose an effort dial. The right amount of thinking is a per-request decision rather than a model property, and 7.10 argues it belongs on the hard tail of traffic rather than on everything." }
      ] },

    { t: "h2", n: "05", id: "orm-prm", text: "Outcome rewards and process rewards",
      sub: "Where the credit assignment problem comes back" },

    { t: "table",
      head: ["", "Outcome RM", "Process RM"],
      rows: [
        ["Grades", "The final answer only", "**Every reasoning step**"],
        ["Label cost", "Cheap \u2014 check the answer", "Expensive \u2014 annotate steps"],
        ["Credit assignment", "Weak \u2014 a lucky right answer from bad reasoning scores full marks", "Strong \u2014 identifies the exact wrong step"],
        ["Used for", "GRPO and RLVR training signal", "Guiding search at inference; step-level verification"]
      ] },

    { t: "callout", kind: "insight", title: "This is 7.5's sparse-reward problem in a new costume",
      body: [
        { t: "p", text: "7.5 noted that the RM score lands once on the final token, so nothing says which token earned it \u2014 and a critic plus GAE exists to smear that single number across the sequence. An outcome reward has exactly the same shape: one scalar for a thousand reasoning tokens." },
        { t: "p", text: "A process reward model turns the sparse signal dense by grading each step, which largely dissolves the credit assignment problem \u2014 you know *which* step was wrong rather than only that the answer was. That is a genuinely better learning signal." },
        { t: "p", text: "The reason outcome rewards still dominate training is cost. Checking a final answer is free and automatic; annotating the correctness of each step in a long derivation is expensive human work, and it is work that has to be redone as the model\u2019s reasoning style changes." }
      ] },

    { t: "callout", kind: "good", title: "So PRMs find their use at inference instead",
      body: [
        { t: "p", text: "A process reward model is most valuable where you need to prune: beam search over reasoning steps, expanding promising partial derivations and dropping bad ones. That needs a step-level score and an outcome score cannot provide it." },
        { t: "p", text: "7.10 lists this as a test-time compute technique, and the pairing is natural \u2014 a PRM is expensive to train once and then usable on every hard request, rather than consumed in a single training run." },
        { t: "p", text: "The weakness of outcome rewards is worth stating plainly because it bounds what RLVR can teach: a model that reaches the right answer by invalid reasoning is reinforced exactly as much as one that reasons correctly. Over many steps that selects for lucky-looking reasoning, which is a real and documented problem." }
      ] },

    { t: "viz", title: "Two reward sources, disjoint territory", caption: "A verifier cannot be flattered and cannot grade an apology. Real pipelines use both.",
      svg: `<svg viewBox="0 0 760 270" width="100%" role="img" aria-label="RLVR and preference methods cover different domains">
  <text x="16" y="22" class="s-label">WHAT THE REWARD IS</text>

  <rect x="26" y="40" width="330" height="130" rx="6" class="s-fill-bg" style="stroke:var(--good)" stroke-width="1.8"/>
  <text x="191" y="62" text-anchor="middle" class="s-mono" style="font-size:11px;fill:var(--good)">RLVR \u2014 a PROGRAM</text>
  <text x="42" y="86" class="s-mono" style="font-size:9px">maths: answer == gold</text>
  <text x="42" y="102" class="s-mono" style="font-size:9px">code: unit tests passing</text>
  <text x="42" y="118" class="s-mono" style="font-size:9px">schema: validates or not</text>
  <text x="42" y="134" class="s-mono" style="font-size:9px">tool call: well-formed</text>
  <text x="191" y="158" text-anchor="middle" class="s-sub" style="font-size:9px">cannot be flattered \u00b7 run RL far longer</text>

  <rect x="404" y="40" width="330" height="130" rx="6" class="s-fill-bg" style="stroke:var(--violet)" stroke-width="1.8"/>
  <text x="569" y="62" text-anchor="middle" class="s-mono" style="font-size:11px;fill:var(--violet)">PREFERENCE \u2014 a MODEL</text>
  <text x="420" y="86" class="s-mono" style="font-size:9px">is this apology warm?</text>
  <text x="420" y="102" class="s-mono" style="font-size:9px">is this tone appropriate?</text>
  <text x="420" y="118" class="s-mono" style="font-size:9px">is this refusal justified?</text>
  <text x="420" y="134" class="s-mono" style="font-size:9px">is this explanation clear?</text>
  <text x="569" y="158" text-anchor="middle" class="s-sub" style="font-size:9px">hackable \u00b7 needs the KL leash</text>

  <line x1="16" y1="192" x2="744" y2="192" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="216" class="s-mono" style="fill:var(--good)">length grows under RLVR = real capability (verifier ignores length)</text>
  <text x="16" y="236" class="s-mono" style="fill:var(--crit)">length grows under an RM = a hack (annotators mistake length for effort)</text>
  <text x="16" y="258" class="s-sub">same symptom, opposite meaning \u2014 distinguished only by what the reward measures</text>
</svg>` },

    { t: "exercise", kind: "build", title: "Write a verifier and find its holes", difficulty: "advanced", minutes: 35,
      body: "For a task you care about, write a programmatic verifier and then attack it: construct completions that score 1.0 without actually solving the problem. Report what you found and how you tightened the verifier. Then estimate what fraction of your problem set would give all-pass or all-fail groups under it.",
      requirements: [
        "Write the verifier as a pure function from completion to scalar",
        "Construct at least two completions that pass without solving the task",
        "Tighten the verifier and show the attacks now fail",
        "Estimate the all-pass and all-fail fractions for your current model",
        "State which problems you would keep for training and why"
      ],
      hint: "Attack the extraction step first. Most verifier holes are in how the answer is parsed out of the completion, not in the comparison itself.",
      solution: { lang: "python", title: "a verifier, its holes, and the curriculum check", code: `import re

def verify_v1(completion, gold):
    """Naive: does the gold answer appear anywhere in the text?"""
    return 1.0 if str(gold) in completion else 0.0

GOLD = 42
ATTACKS = [
    "The answer could be 1, 2, 3, ... 41, 42, 43, ...",   # enumerate everything
    "I am not sure. Possibly 42, possibly 17.",            # hedge over both
    "42 is wrong; the answer is 17.",                      # states it to deny it
]
print("v1 -- substring match")
for a in ATTACKS:
    print("  %.1f  %s" % (verify_v1(a, GOLD), a[:52]))

def verify_v2(completion, gold):
    """Require a single boxed answer, and exactly one."""
    boxed = re.findall(r"\\\\boxed\{([^}]*)\}", completion)
    if len(boxed) != 1:
        return 0.0
    try:
        return 1.0 if abs(float(boxed[0]) - float(gold)) < 1e-6 else 0.0
    except ValueError:
        return 0.0

print("\\nv2 -- exactly one boxed answer, numerically compared")
for a in ATTACKS + [r"Therefore \\boxed{42}.", r"\\boxed{42} or \\boxed{17}"]:
    print("  %.1f  %s" % (verify_v2(a, GOLD), a[:52]))

# the curriculum check -- which problems can even teach?
def group_usable(pass_rates, G=6):
    """Under a binary verifier, a group teaches only if it is not all-pass/all-fail."""
    import numpy as np
    p = np.asarray(pass_rates)
    all_pass = p ** G
    all_fail = (1 - p) ** G
    return 1.0 - all_pass - all_fail

for pr in (0.02, 0.1, 0.3, 0.5, 0.8, 0.95, 0.99):
    print("pass rate %.2f -> P(group teaches) = %.3f" % (pr, group_usable(pr)))`,
        out: `  v1 -- substring match
    1.0  The answer could be 1, 2, 3, ... 41, 42, 43, ...
    1.0  I am not sure. Possibly 42, possibly 17.
    1.0  42 is wrong; the answer is 17.

  v2 -- exactly one boxed answer, numerically compared
    0.0  The answer could be 1, 2, 3, ... 41, 42, 43, ...
    0.0  I am not sure. Possibly 42, possibly 17.
    0.0  42 is wrong; the answer is 17.
    1.0  Therefore \\boxed{42}.
    0.0  \\boxed{42} or \\boxed{17}

  pass rate 0.02 -> P(group teaches) = 0.114
  pass rate 0.10 -> P(group teaches) = 0.469
  pass rate 0.30 -> P(group teaches) = 0.882
  pass rate 0.50 -> P(group teaches) = 0.969
  pass rate 0.80 -> P(group teaches) = 0.738
  pass rate 0.95 -> P(group teaches) = 0.265
  pass rate 0.99 -> P(group teaches) = 0.059`,
        notes: [
          { t: "p", text: "**All three attacks beat v1, and all three are things models actually do.** Enumerating candidates, hedging across two answers, and mentioning a value in order to reject it are natural behaviours \u2014 so a substring verifier does not merely have a hole, it rewards a strategy the model will find quickly." },
          { t: "p", text: "**`len(boxed) != 1` is the load-bearing line in v2.** Requiring exactly one boxed answer kills enumeration and hedging together, which is more than the numeric comparison achieves. Most verifier holes are in extraction rather than comparison." },
          { t: "p", text: "**The second table is the curriculum arithmetic and it is harsher than intuition.** At a 2% pass rate only 11% of groups teach anything; at 99% only 6% do. You pay full generation cost for all of them, and generation dominates GRPO's wall clock." },
          { t: "p", text: "**Usable range is roughly a 20\u201380% pass rate**, peaking near 50% where 96.9% of groups carry signal. Combined with 7.8's finding that mean advantage magnitude also peaks at half-correct, that is two independent reasons to target the same band." },
          { t: "p", text: "One caveat on this model: it assumes samples are independent with a fixed per-problem pass rate, which is optimistic. Real samples from one prompt are correlated \u2014 they share a prefix distribution \u2014 so all-pass and all-fail are *more* likely than this predicts and the usable fraction is lower. Treat these as upper bounds." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "A verifier cannot be flattered, so the overoptimisation ceiling lifts and RL can run far longer. But it only exists where correctness is checkable, so RLVR and preference methods cover disjoint territory and real pipelines use both \u2014 verifiable for capability, preference for behaviour." },
        { t: "p", text: "And binary rewards make the zero-variance problem the dominant practical constraint: groups that all pass or all fail teach nothing, so difficulty curation is the main lever and it has to move as the model improves. Length growing under a verifier is capability; length growing under a reward model is a hack." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cWhat is RLVR and why is it a big deal?\u201d**" },
        { t: "p", text: "The reward is a program rather than a learned model \u2014 a unit test, a maths checker, a schema validator. The significance is that a verifier cannot be flattered: the model cannot write a longer or more confident answer to make a test pass." },
        { t: "p", text: "That removes the specific weakness I would point to in a learned reward model. Bradley-Terry\u2019s gradient vanishes once a reward gap is large, so nothing in RM training constrains how big a correct gap becomes \u2014 there are regions where the RM confidently assigns huge scores for no good reason, and the KL leash exists to stop the policy finding them. With a verifier those regions do not exist, so you can optimise much harder and for much longer." },
        { t: "p", text: "The limitation is the honest part of the answer: it only works where correctness is checkable. Maths, code, formal logic, structured extraction, tool-call validity. For \u2018write a warm apology email\u2019 there is no verifier, and any proxy you write is a learned reward model in disguise with all the hackability back. So real pipelines use both \u2014 RLVR for capability, preference methods for behaviour." }
          ,{ t: "p", text: "I would also push back on \u2018cannot be hacked\u2019. A weak verifier is exploitable in a different way: shallow tests teach the model to pass shallow tests, and an outcome-only check rewards a right answer reached by invalid reasoning exactly as much as correct reasoning. The gain over a learned RM is that a verifier\u2019s weaknesses are *legible* \u2014 you can read the tests." },
        { t: "p", text: "The practical thing I would raise unprompted is the interaction with GRPO. Binary rewards make the zero-variance case common rather than rare: if all G samples pass or all fail, the group standard deviation is zero and every advantage is exactly zero. At a 2% pass rate only about 11% of groups teach anything; at 99% only 6%. So problem-set curation targeting a 20 to 80% pass rate is the main lever, and it has to be redone during training as problems migrate to all-pass." },
        { t: "p", text: "And the famous result is worth understanding rather than just citing. Given only correct-answer-equals-one, response length grew on its own, because longer reasoning genuinely raises the hit rate and the hit rate is the reward. Contrast that with length growth under a reward model, which is a hack because annotators mistake length for effort. Same symptom, opposite meaning \u2014 and what distinguishes them is only what the reward measures." }
      ] }
  ],

  takeaways: [
    "**RLVR makes the reward a program** \u2014 a unit test, a maths checker, a validator \u2014 with no neural network, no preference data and no annotation cost.",
    "**A verifier cannot be flattered**, which removes the exploitable regions 7.4 identified in a learned RM, so the KL leash becomes a mild regulariser rather than the load-bearing defence.",
    "**But it only applies where correctness is checkable** \u2014 maths, code, formal logic, structured extraction, tool validity \u2014 so RLVR and preference methods cover disjoint territory.",
    "**\u201cCannot be hacked\u201d overstates it**: shallow tests teach shallow passing, and the gain is that a verifier's weaknesses are legible where a reward model's are not.",
    "**Binary rewards make 7.8's zero-variance case acute** \u2014 at a 2% pass rate only ~11% of groups carry signal, at 99% only ~6%.",
    "**So difficulty curation is the main lever in RLVR**, targeting roughly a 20\u201380% pass rate, and it must be redone as problems migrate toward all-pass.",
    "**The R1 shape is four stages**: cold-start CoT SFT, GRPO with verifiable rewards, rejection sampling into new SFT data, then a preference or safety pass.",
    "**Stage 3 is consolidation, not circularity** \u2014 RL gives a noisy advantage-weighted signal, SFT on curated successes gives a dense low-variance target.",
    "**Stage 4 exists because verifiers cannot grade helpfulness**, and doing it last matters because later training overwrites earlier behaviour.",
    "**Length grew without being asked for** because longer reasoning genuinely raises the hit rate, and the hit rate was the reward.",
    "**Length growth means opposite things under the two reward types** \u2014 real capability under a verifier, a hack under a reward model.",
    "**Outcome rewards are 7.5's sparse-reward problem again** \u2014 one scalar for a thousand tokens \u2014 and PRMs fix the credit assignment at an annotation cost that pushes them to inference-time use."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Why does RLVR allow much longer RL training than RLHF with a learned reward model?",
        options: [
          "Because programmatic rewards are computed faster, allowing more steps per hour",
          "Because a verifier has no regions of confidently-wrong high scores \u2014 Bradley-Terry's vanishing gradient leaves RM magnitudes unconstrained, and a verifier's output cannot be influenced by length or confidence",
          "Because RLVR uses GRPO, which is more stable than PPO",
          "Because verifiable rewards are dense per token rather than sparse at the end"
        ],
        answer: 1,
        why: "The RM is exploitable because its gradient vanishes once a reward gap is large, so nothing constrains how big a correct gap becomes \u2014 leaving regions where it assigns huge scores for no good reason, which the KL leash exists to keep the policy away from. A verifier's answer is a function of correctness alone. Note that verifiable rewards are typically outcome-only and therefore sparse, which is a separate weakness that process reward models address." },

      { stem: "A GRPO+RLVR run uses problems with a 95% pass rate for the current policy. What fraction of groups of 6 contribute gradient, and what should change?",
        options: [
          "About 95%, since most samples pass \u2014 the problem set is well matched",
          "About 27% \u2014 most groups are all-pass and give exactly zero advantage \u2014 so the problem set should be re-curated toward a 20\u201380% pass rate",
          "About 50%, since the advantage normalisation is symmetric around the mean",
          "All of them, because the eps guard ensures non-zero advantages"
        ],
        answer: 1,
        why: "With independent samples at a 95% pass rate, 1 \u2212 0.95\u2076 \u2212 0.05\u2076 is about 0.265, so roughly three quarters of groups are all-pass and produce exactly zero advantage \u2014 while still costing full generation time, which dominates the wall clock. Signal peaks near a 50% pass rate where about 96.9% of groups teach something. Real samples are correlated rather than independent, which makes all-pass even likelier, so this figure is an upper bound." },

      { stem: "Response length grew during RLVR training with only a correct/incorrect reward. How does this differ from the length bias that afflicts RLHF?",
        options: [
          "It does not differ \u2014 both are instances of the model exploiting the reward",
          "Under a verifier, length is a genuine discovery because longer reasoning raises the hit rate and the verifier ignores length; under an RM, length is a hack because annotators mistake length for effort",
          "RLVR length growth is bounded by the context window while RLHF length growth is not",
          "RLVR length growth happens only during the cold-start SFT stage"
        ],
        answer: 1,
        why: "The verifier scores only correctness, so any length gain must have been selected for because it improved correctness \u2014 backtracking, re-checking and case enumeration genuinely increase the chance of a right answer. Under a learned reward model, length correlates with higher scores because human annotators conflate length with effort, so the model gains reward without gaining quality. Identical symptom, opposite meaning, distinguished entirely by what the reward measures." },

      { stem: "Why are process reward models used mainly at inference rather than as the training signal?",
        options: [
          "Because they are too slow to evaluate during training",
          "Because annotating step-level correctness is expensive human work that must be redone as reasoning style changes, while checking a final answer is free and automatic",
          "Because they produce dense rewards, which destabilise GRPO's group normalisation",
          "Because they cannot be applied to code or mathematics, only to natural language"
        ],
        answer: 1,
        why: "An outcome check is a program and costs nothing per example; grading each step of a long derivation requires annotation that does not transfer well as the model's reasoning style evolves. PRMs give strictly better credit assignment \u2014 identifying which step was wrong rather than only that the answer was \u2014 and their natural use is guiding search, such as beam search over reasoning steps, where a step-level score is required and an outcome score cannot substitute." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Verifiable rewards and reasoning models",
    questions: [
      { level: "advanced",
        q: "How would you train a reasoning model?",
        strong: "A strong answer gives the four stages and says what each buys.",
        answer: [
          { t: "p", text: "Four stages, following the shape DeepSeek-R1 established. Optionally cold-start with SFT on a few thousand long chain-of-thought examples to install a readable reasoning format. Then GRPO with verifiable rewards on maths and code \u2014 this is the stage where the model learns to think longer." },
          { t: "p", text: "Third, rejection sampling: take the RL model\u2019s correct traces and use them as new SFT data. That sounds circular and is not \u2014 RL gives a noisy, advantage-weighted signal while SFT on curated successes is a dense, low-variance target, so this consolidates what RL discovered more cheaply than continuing to run RL." },
          { t: "p", text: "Fourth, a preference or safety pass with DPO or RLHF, because no verifier can grade helpfulness or harmlessness. Doing it last matters, since later training tends to overwrite earlier behaviour." },
          { t: "p", text: "The part I would spend most effort on in practice is the problem set, because binary rewards interact badly with GRPO. If all samples in a group pass or all fail, the advantage is exactly zero and the prompt teaches nothing \u2014 at a 95% pass rate only about a quarter of groups carry signal. So I would target a 20 to 80% pass rate and re-derive the curriculum during training as problems migrate to all-pass." }
        ] },

      { level: "core",
        q: "Does RLVR mean we no longer need preference-based alignment?",
        strong: "A strong answer identifies the domains as disjoint.",
        answer: [
          { t: "p", text: "No \u2014 they cover disjoint territory. RLVR works where correctness is checkable: maths, code, formal logic, structured extraction, schema and tool-call validity. That is a real and growing set and it does not include most of what makes a model pleasant to use." },
          { t: "p", text: "For something like \u2018write a warm apology email\u2019 there is no program that returns 1.0 for a good apology. Any proxy you write \u2014 sentiment score, length, keyword presence \u2014 is a learned reward model wearing a verifier\u2019s clothing, and you get all the hackability back along with a worse signal." },
          { t: "p", text: "So production pipelines use both, which is exactly why the R1-shaped recipe ends with a preference pass after the verifiable-reward stage. Verifiable rewards for capability, preference methods for behaviour." },
          { t: "p", text: "Where RLVR genuinely changes things is the ceiling. Against a learned reward model you have to stop training before overoptimisation sets in, and that bound is quite tight. Against a verifier you can push much further, which is why reasoning capability moved so quickly once the signal changed." }
        ] },

      { level: "advanced",
        q: "Can a programmatic verifier be gamed?",
        strong: "A strong answer separates flattery from exploitation.",
        answer: [
          { t: "p", text: "Not by flattery, which is the important part \u2014 no amount of length, confidence or formatting changes whether a unit test passes. But yes by exploitation, and the vulnerability is almost always in the verifier\u2019s strength rather than in verification as a concept." },
          { t: "p", text: "The holes are usually in extraction rather than comparison. A verifier that checks whether the gold answer appears anywhere in the completion is beaten by enumerating candidates, by hedging across two answers, or by mentioning the value in order to reject it \u2014 and all three are things models actually do. Requiring exactly one boxed answer kills all three at once, which is more than tightening the numeric comparison achieves." },
          { t: "p", text: "The deeper limitation is outcome-only grading. A model that reaches the correct answer through invalid reasoning is reinforced exactly as much as one that reasons correctly, so over many steps you select for lucky-looking reasoning. That is the credit assignment weakness a process reward model fixes, at an annotation cost that usually pushes PRMs to inference-time use instead." },
          { t: "p", text: "The real advantage over a learned reward model is legibility. A verifier\u2019s weaknesses can be read \u2014 you can look at the tests and reason about what passes. A reward model\u2019s weaknesses are distributed across weights and only discoverable by watching the policy find them." }
        ] }
    ]
  }
});
