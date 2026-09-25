EC.receiveLesson({
  id: "2.6",

  lede: "\"You are a senior machine learning engineer\" is the most-copied line in prompt engineering and the one most often dismissed as superstition. It is neither magic nor nothing, and the size of the effect is measurable: on GPT-2-medium, an expert persona moves the next-token distribution by 0.1354 nats — about three and a half times what a 10% change in temperature does. This lesson measures what a persona actually changes, and is specific about the two things it does not.",

  objectives: [
    "State what a persona changes in the model's output and what it does not",
    "Quantify the effect of a persona against a known baseline",
    "Write a role prompt that carries information rather than flattery",
    "Use multi-perspective prompting where a single role is too narrow",
    "Recognise when a persona is substituting for a specification"
  ],

  prerequisites: ["2.1", "1.2"],

  blocks: [

    /* ============================================================ 01 */
    { t: "h2", n: "01", id: "what-it-does", text: "A persona is context, compressed",
      sub: "It shifts the distribution toward a region of the training data" },

    { t: "p", text: "A language model has been trained on text written by many kinds of writer. \"You are a senior database engineer\" is a conditioning signal: it makes the continuations that follow such a preamble in the training data more likely — technical vocabulary, particular concerns, a register. It is not instruction-following in the sense that \"return three bullets\" is; it is a prior." },

    { t: "code", lang: "python", title: "g25.py — measuring the shift", code: `QUESTION = "The most important consideration when designing a database index is"

PERSONAS = {
    "none":    "",
    "expert":  "You are a senior database engineer with 15 years of experience.\\n\\n",
    "teacher": "You are a patient professor explaining to first-year students.\\n\\n",
    "child":   "You are explaining this to a ten-year-old.\\n\\n",
}

for label, prefix in PERSONAS.items():
    p = dist(prefix + QUESTION)
    top2 = torch.topk(p, 2)
    kl = float((p * (p / base).log()).sum())      # KL from the no-persona case
    print("%-10s %-16s %-16s %10.4f" % (label, ..., ..., kl))`,
      out: `  persona    top token        2nd token        KL from none
  none       ' to'            ' that'              0.0000
  expert     ' the'           ' to'                0.1354
  teacher    ' that'          ' to'                0.0731
  child      ' that'          ' to'                0.0585

  KL divergence in nats. For scale, the same question at temperature 1.0
  against temperature 0.9 differs by 0.0390 nats.`,
      hl: [14, 15, 16],
      caption: "The expert persona shifts the distribution by **0.1354 nats**, against 0.0390 for a 10% temperature change — about 3.5× the effect. The persona also changes which token is most likely, which a temperature change never does." },

    { t: "p", text: "Two things in that measurement are worth separating. The **magnitude** is real and not small — a persona is doing more to the distribution than a parameter change people take seriously. And the **argmax moved**, from `' to'` to `' the'`, which temperature cannot do at all (1.2): temperature rescales without reordering, and a persona reorders." },

    { t: "callout", kind: "insight", title: "The comparison is what makes the number mean something",
      body: [
        { t: "p", text: "A KL divergence of 0.1354 nats is meaningless on its own — nobody has an intuition for nats. It becomes interpretable against a baseline everyone does have an intuition for, which is why the measurement includes the temperature comparison." },
        { t: "p", text: "This is a general habit worth forming for any prompt measurement: report the effect **relative to something the reader already has a feel for**. \"The persona changed the distribution\" is unfalsifiable; \"the persona changed it more than a 10% temperature move\" is a claim." },
        { t: "p", text: "The same argument applies in reverse. Effects that sound impressive in isolation — \"adding this line changed 8% of outputs\" — often turn out to be smaller than the run-to-run variation you already tolerate (1.7)." }
      ] },

    /* ============================================================ 02 */
    { t: "h2", n: "02", id: "information", text: "A persona that carries information",
      sub: "The difference between flattery and constraints" },

    { t: "p", text: "\"You are a world-class expert\" does almost nothing, because it says nothing the model can act on — there is no such thing as the world-class-expert register. A persona earns its tokens when it implies *specific* behaviour." },

    { t: "code", lang: "python", title: "roles.py — the reference's examples", code: `# Expert role: the useful parts are the four bullets, not the first sentence
system = """You are a senior machine learning engineer at Google
with 10 years of experience. You specialize in recommendation systems
and have published papers at NeurIPS and ICML.

When answering questions:
- Be precise and technically accurate
- Include complexity analysis where relevant
- Mention production considerations
- Cite relevant papers or techniques by name"""

# Audience-adapted role: the persona IS the constraint here
system = """You are a patient CS professor explaining concepts
to undergraduate students. Use analogies, simple language,
and build up from basics. Avoid jargon unless you define it first."""`,
      hl: [6, 7, 8, 9, 10],
      caption: "From 04_Prompt_Engineering.md §6. In the first example the persona sentence is scene-setting and the four bullets are the instruction — and the bullets would work without the persona, while the persona would not work without the bullets." },

    { t: "ladder", title: "From flattery to specification", rungs: [
      { level: "bad", label: "Pure flattery",
        why: "Nothing the model can act on",
        code: `system = "You are a world-class expert. Give an excellent answer."`,
        note: "There is no register called world-class. This costs tokens and shifts nothing in particular." },
      { level: "ok", label: "A specific role",
        why: "Implies a register and a set of concerns",
        code: `system = """You are a senior database engineer.
Answer from the perspective of someone who operates
these systems in production."""`,
        note: "Now there is something to condition on: the concerns of an operator rather than a designer." },
      { level: "best", label: "A role plus the behaviour it implies",
        why: "The role sets the register; the rules are checkable",
        code: `system = """You are a senior database engineer who operates
these systems in production.

- Give the operational consequence before the theory
- Name the failure mode each recommendation prevents
- Quantify where you can; say "it depends on X" where you cannot
- Flag anything that needs a maintenance window"""`,
        note: "Each rule is something you can check an answer against, which means the prompt can be evaluated (2.12). The persona is now doing the job it is good at — register — and the rules are doing the job it is bad at." }
    ] },

    /* ============================================================ 03 */
    { t: "h2", n: "03", id: "what-it-does-not", text: "Two things a persona does not do",
      sub: "And both are things people expect it to" },

    { t: "dl", items: [
      ["It does not add knowledge", "Telling a model it is a cardiologist does not give it medical knowledge it lacks. It shifts the register toward text written by cardiologists, which can make a wrong answer *sound* more authoritative — which is worse than the plain version, because confidence is the signal readers use. This is the mechanism behind a particular kind of hallucination (11.1)."],
      ["It does not add capability", "A persona cannot make a model reason better than it can. If the task requires multi-step reasoning the model cannot do, \"you are a brilliant mathematician\" does not supply it — chain-of-thought (2.3) buys computation, and a persona buys register. They are different resources."]
    ] },

    { t: "callout", kind: "trap", title: "An authoritative register makes errors harder to catch",
      body: [
        { t: "p", text: "The measurement above shows a persona reordering the distribution toward a particular kind of text. That text is confident, technical and specific — and it is equally confident whether the underlying answer is right or wrong." },
        { t: "p", text: "So in domains where you cannot verify the answer, a persona actively raises risk: it removes the hedging that might have prompted a reader to check. \"I think it's probably around 40%\" invites scepticism in a way that \"the standard figure is 38.5%\" does not, and a model will produce either depending on the register you asked for." },
        { t: "p", text: "Where correctness matters and verification is hard, prefer a persona that asks for calibration — \"state your confidence and what would change your answer\" — over one that asks for authority. 8.7 is the lesson about whether that stated confidence means anything." }
      ] },

    /* ============================================================ 04 */
    { t: "h2", n: "04", id: "multi", text: "Multi-perspective prompting",
      sub: "When one role is too narrow for the question" },

    { t: "code", lang: "python", title: "multi.py — the reference's pattern", code: `prompt = """Evaluate this ML architecture from three perspectives:
1. As a ML researcher: theoretical soundness and novelty
2. As a ML engineer: implementation complexity and scalability
3. As a product manager: business impact and timeline"""`,
      caption: "From 04_Prompt_Engineering.md §6. Three conditioning signals in one call, each labelled — which also makes the output naturally structured." },

    { t: "p", text: "This works for a reason worth naming: it forces the model to produce considerations it would otherwise have to choose between. A single call asked for \"an evaluation\" will pick a register and stay in it, and the concerns of the other two roles simply will not appear. Asking for all three makes the omission impossible." },

    { t: "callout", kind: "tradeoff", title: "One call with three roles, or three calls",
      body: [
        { t: "p", text: "**One call** is cheaper, faster, and the perspectives can reference each other — the engineer's section can respond to the researcher's. It is also shorter per perspective, because the output budget is shared." },
        { t: "p", text: "**Three calls** give each perspective the full attention of a fresh context, and they parallelise. They also cannot be contaminated by each other, which is the point if you want genuinely independent assessments rather than a coherent document." },
        { t: "p", text: "The deciding question is whether you want a *debate* or a *survey*. A debate wants one call, because the positions have to engage. A survey wants three, because the whole value is that they did not." },
        { t: "p", text: "Three calls that are then combined by a fourth is the critique-and-refine pattern, which is 2.8." }
      ] },

    /* ============================================================ 05 */
    { t: "h2", n: "05", id: "substituting", text: "When a persona is hiding a missing specification",
      sub: "The failure mode this technique enables" },

    { t: "p", text: "The four-component check from 2.1 is the guard here. A persona is *context* — one of the four — and it is seductive because it is easy to write and feels like it covers a lot. It routinely gets used in place of the instruction and format components, which it cannot substitute for." },

    { t: "code", lang: "python", title: "substituting.py", code: `# Persona doing work it cannot do: no instruction, no format.
weak = """You are an expert financial analyst with 20 years of experience
at a top investment bank. You have deep expertise in equity research.

{document}"""

# The persona is one line; the other three components are present.
good = """You are an equity analyst writing for a portfolio manager.

Extract from the document below: the revenue figure, the year-on-year
change, and any guidance for the next quarter. Return JSON matching the
schema. If a figure is absent, use null rather than estimating.

<document>
{document}
</document>"""`,
      hl: [2, 3, 4],
      caption: "The first version has three sentences of persona and no task. It will produce something analyst-shaped, and what it produces is not specified anywhere." },

    { t: "p", text: "The test: delete the persona and ask whether the prompt still says what you want. If it does not, the persona was carrying the specification, and it was carrying it badly — because a register is not a requirement and cannot be checked against one." },

    /* ============================================================ exercise */
    { t: "exercise", kind: "Challenge", title: "Measure whether your persona is doing anything",
      difficulty: "core", minutes: 25,
      body: [
        { t: "p", text: "The lesson measured a persona's effect as a KL divergence against no persona, calibrated against a temperature change. That method generalises: it is a cheap way to tell whether a prompt fragment is doing anything at all before you spend time tuning it." },
        { t: "p", text: "Build the measurement and apply it to several prompt fragments, including one you expect to do nothing." }
      ],
      requirements: [
        "Take a question and compute the next-token distribution with no prefix",
        "For at least five prefixes — including a vacuous one like \"Please answer well.\" — compute the KL from the baseline",
        "Compute the KL of a 10% temperature change as a calibration point",
        "Rank the prefixes by effect size and report which fall below the calibration",
        "State the limitation of measuring only the first token"
      ],
      hint: "KL(p‖q) = Σ p·log(p/q). Clamp before the log. The calibration is the KL between softmax(logits) and softmax(logits/0.9).",
      solution: { lang: "python", title: "g26_ex.py",
        code: `import torch
from transformers import GPT2LMHeadModel, GPT2TokenizerFast

tok = GPT2TokenizerFast.from_pretrained("gpt2")
model = GPT2LMHeadModel.from_pretrained("gpt2-medium").eval()

def dist(text, t=1.0):
    ids = tok(text, return_tensors="pt").input_ids
    with torch.no_grad():
        return torch.softmax(model(ids).logits[0, -1] / t, dim=-1)

def kl(p, q):
    return float((p * (p.clamp_min(1e-12) / q.clamp_min(1e-12)).log()).sum())

Q = "The most important consideration when designing a database index is"
base = dist(Q)
calib = kl(dist(Q, t=0.9), base)          # a 10% temperature move

PREFIXES = {
    "vacuous":       "Please answer well.\\n\\n",
    "polite":        "Could you kindly help me with this question?\\n\\n",
    "expert":        "You are a senior database engineer with 15 years of experience.\\n\\n",
    "operator":      "You are an on-call SRE who has been paged for a slow query.\\n\\n",
    "child":         "You are explaining this to a ten-year-old.\\n\\n",
    "with rules":    ("You are a senior database engineer.\\n"
                      "- Give the operational consequence before the theory\\n"
                      "- Name the failure mode each recommendation prevents\\n\\n"),
}

rows = sorted(((k, kl(dist(p + Q), base)) for k, p in PREFIXES.items()),
              key=lambda r: -r[1])

print("calibration: a 10%% temperature change = %.4f nats" % calib)
print()
print("%-12s %10s %10s" % ("prefix", "KL (nats)", "vs calib"))
for name, v in rows:
    print("%-12s %10.4f %9.1fx %s"
          % (name, v, v / calib, "" if v > calib else "  <- below the noise floor"))`,
        out: `calibration: a 10% temperature change = 0.0390 nats

prefix        KL (nats)   vs calib
expert           0.1354       3.5x
with rules       0.1089       2.8x
operator         0.0843       2.2x
child            0.0585       1.5x
vacuous          0.0371       1.0x   <- below the noise floor
polite           0.0328       0.8x   <- below the noise floor`,
        notes: [
          { t: "p", text: "Both vacuous prefixes measure **at or below the calibration point** — 0.0371 and 0.0328 against 0.0390 for a 10% temperature change, which is to say they perturb the distribution less than variation you already tolerate. They are tokens for nothing, and the measurement says so in ten seconds rather than after a week of A/B testing. That is what this method is for." },
          { t: "p", text: "The ordering among the four that *do* something is the surprise, and it runs against §02's argument rather than for it: the bare credential moved the distribution most (0.1354), adding behavioural rules **reduced** the shift to 0.1089, and the specific on-call framing came third at 0.0843. I expected the opposite ordering and the measurement did not give it." },
          { t: "p", text: "Which is the limitation, stated properly: this measures only the **first token**, and the first token of an answer is where register shows and where behavioural rules have not yet had anything to act on. A rule like `name the failure mode each recommendation prevents` governs the third sentence, not the first word, so of course it moves position one less than a register cue does — and the longer prefix also puts more tokens between the cue and the measured position. So the honest reading is that **this method separates doing nothing from doing something, and does not rank the things that do something.** Use it to reject fragments cheaply; use 2.12's test set to choose between the survivors." },
        ] } },

    /* ============================================================ scenario */
    { t: "callout", kind: "scenario", title: "Incident: the medical-summary tool that got more confident and less correct",
      body: [
        { t: "p", text: "**Symptom.** A tool summarising clinical notes for non-clinical staff was updated with a stronger persona — \"You are an experienced consultant physician\" replaced \"You are a medical summarisation assistant\" — after user feedback that summaries read as hedging and unhelpful. User satisfaction rose. Six weeks later a review found the error rate had risen slightly and, more seriously, that errors were no longer being caught by the staff reading them." },
        { t: "p", text: "**Mechanism.** The persona did what a persona does: it shifted the register toward confident clinical prose. Uncertainty that had previously surfaced as \"the notes suggest\" or \"it is unclear whether\" became flat assertions, because that is how the text the persona conditions on is written. The underlying accuracy barely changed — the model knew no more medicine than before — but the *hedging had been carrying information*, and the readers had been using it to decide what to verify." },
        { t: "p", text: "**What made it hard to spot.** Satisfaction went up, which is exactly what you would expect from clearer prose, and the accuracy change was within noise. The metric that moved was one nobody was tracking: the rate at which staff checked a summary against the source note, which fell by about a third." },
        { t: "p", text: "**Fix.** The persona now explicitly asks for calibration — state what the notes support, flag what is inferred, and name anything the notes do not address — which restored the hedging as a deliberate output rather than an accident of register. The durable lesson is that a persona is a register control, and register carries information to a human reader independently of content. Changing it changes what readers do, which is an effect no accuracy metric will show. 8.11 is about measuring the behaviour of the people downstream, not only the output." }
      ] }
  ],

  takeaways: [
    "**A persona is compressed context**: it conditions the model toward a region of its training data. It is a prior, not an instruction.",
    "The effect is measurable and not small. Measured on GPT-2-medium, an expert persona shifted the distribution by **0.1354 nats** against **0.0390** for a 10% temperature change — about 3.5×.",
    "A persona **reorders** the distribution, changing which token is most likely. Temperature never does that (1.2) — it rescales without reordering.",
    "**Report effects relative to a baseline the reader has intuition for.** \"It changed the distribution\" is unfalsifiable; \"more than a 10% temperature move\" is a claim.",
    "Measured across six prefixes, **both vacuous ones fell at or below the calibration point** (0.0371 and 0.0328 against 0.0390) — a first-token KL is a reliable screen for a fragment that does nothing. It is **not** a ranking: the bare credential scored highest (0.1354) and adding behavioural rules lowered it to 0.1089, because rules govern later sentences than the one measured.",
    "**A persona does not add knowledge.** Telling a model it is a cardiologist shifts the register toward text written by cardiologists, which can make a wrong answer sound more authoritative.",
    "**A persona does not add capability.** Chain-of-thought buys computation; a persona buys register. They are different resources and neither substitutes for the other.",
    "An authoritative register **makes errors harder to catch**, because it removes the hedging readers use to decide what to verify.",
    "Multi-perspective prompting forces considerations the model would otherwise choose between. **One call for a debate, several for a survey.**",
    "**Delete the persona and see whether the prompt still says what you want.** If not, the persona was carrying the specification, and a register cannot be checked against a requirement."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A persona shifts the next-token distribution by 0.1354 nats. Why is the temperature comparison included?",
        options: ["To show the persona is equivalent to a temperature change", "Because a KL in nats has no intuitive scale without a baseline the reader already understands", "Because temperature and persona interact", "To prove the persona is unnecessary"],
        answer: 1,
        why: "Nobody has an intuition for nats, so 0.1354 on its own is unfalsifiable — against 0.0390 for a 10% temperature change it becomes a claim, roughly 3.5× an effect people already take seriously. The two are not equivalent: a persona reorders the distribution and temperature never does. They do not meaningfully interact in the way top-p and temperature do. And the comparison establishes the persona matters rather than that it does not." },

      { stem: "A first-token KL measurement ranks four personas by effect size. What can you conclude?",
        options: ["The highest-scoring persona is the best one", "Only that all four do something — the ordering among them is not meaningful from this measurement", "The lowest-scoring one should be deleted", "Nothing at all"],
        answer: 1,
        why: "The measurement separates prefixes that perturb the distribution from those that do not — both vacuous prefixes landed at or below the 0.0390 calibration point — but the first token is where register shows and where behavioural rules have not yet had anything to act on. Measured, adding rules to a persona *lowered* the score from 0.1354 to 0.1089, which would rank it worse and is not a claim the data supports. Choosing between fragments that both do something needs a test set (2.12). A low-but-above-calibration score is not grounds for deletion for the same reason, and the screen is plainly informative, so the last option is too strong." },

      { stem: "Your medical summariser becomes more readable after a stronger persona. What is the risk?",
        options: ["Higher token cost", "Confident prose removes the hedging readers were using to decide what to verify", "The model becomes slower", "The persona overrides the safety training"],
        answer: 1,
        why: "A persona shifts register, and confident clinical prose is equally confident whether the content is right or wrong — measured in the incident, accuracy barely changed while the rate at which staff verified against source notes fell by about a third. Register carries information to a human reader independently of content, so changing it changes downstream behaviour in a way no accuracy metric shows. Cost and latency are negligible for a few tokens, and a persona does not override safety training." },

      { stem: "How do you tell whether a persona is carrying the specification?",
        options: ["Count the tokens it uses", "Delete it and check whether the prompt still states the task and the output shape", "Ask the model", "Compare output length"],
        answer: 1,
        why: "A persona is the context component of the four in 2.1, and it cannot substitute for instruction or output format — so if removing it leaves a prompt that no longer says what you want, those components were being implied by a register rather than stated. That matters because a register cannot be checked against a requirement and therefore cannot be evaluated (2.12). Token count says nothing about what a fragment is doing; asking the model produces a plausible answer about itself; length is unrelated." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "Persona prompting is a good question because the confident answers in both directions — \"it's essential\" and \"it's superstition\" — are both wrong.",
    questions: [
      { level: "core",
        q: "Does role prompting actually do anything?",
        strong: "A strong answer says yes, quantifies it, and is precise about what it changes.",
        answer: [
          { t: "p", text: "Yes, and it is measurable. On GPT-2-medium an expert persona shifted the next-token distribution by 0.1354 nats against a baseline of 0.0390 for a 10% temperature change — about three and a half times. It also reordered the distribution, changing which token was most likely, which temperature cannot do at all." },
          { t: "p", text: "What it changes is the register: it conditions the model toward text written by that kind of person. It is a prior, not an instruction." },
          { t: "p", text: "What it does not change is knowledge or capability. Telling a model it is a cardiologist does not supply medical knowledge — it makes a wrong answer sound like a cardiologist wrote it, which is worse than the plain version, because readers use confidence to decide what to check." }
        ] },

      { level: "core",
        q: "What makes one persona better than another?",
        strong: "Specificity, and a strong answer has evidence for it rather than an assertion.",
        answer: [
          { t: "p", text: "Specificity, in principle — but I would be careful about claiming to have measured it. A first-token KL screen separates prefixes that do something from prefixes that do not: two vacuous ones landed at or below the effect of a 10% temperature change. What it did **not** do was rank the ones that work. The bare credential scored highest at 0.1354 and adding behavioural rules lowered it to 0.1089, which is the opposite of what I expected." },
          { t: "p", text: "So seniority claims are the least useful part. \"Senior engineer with 15 years of experience\" does less than \"someone who operates these systems in production\", because the second implies concerns and the first implies a CV." },
          { t: "p", text: "And the rules matter more than the role. The role sets register, which the model is good at; the rules state requirements, which is the part you can actually evaluate against." }
        ] },

      { level: "advanced",
        q: "When would you avoid a persona?",
        strong: "A strong answer names the confidence problem and the specification-substitution problem.",
        answer: [
          { t: "p", text: "Where correctness matters and verification is hard. A persona shifts toward confident domain prose, which removes the hedging that prompts a reader to check — and the hedging was carrying information about uncertainty." },
          { t: "p", text: "I have seen this bite: a clinical summarisation tool got a stronger persona, readability and satisfaction went up, accuracy barely moved, and the rate at which staff verified summaries against source notes fell by about a third. That is a real safety regression with no accuracy metric showing anything." },
          { t: "p", text: "The other case is when the persona is substituting for a specification. The test is to delete it and see whether the prompt still states the task and the output shape. If it does not, a register was carrying requirements — and a register cannot be checked against a requirement, so the prompt cannot be evaluated." },
          { t: "p", text: "Where I do want confidence handled explicitly, I would put it in the persona deliberately: state what the source supports, flag what is inferred, name what it does not address. That is a persona doing the job it is good at." }
        ] }
    ]
  }
});
