EC.receiveLesson({
  id: "7.12",

  lede: "Human preference labels cost $1\u20135 each and take weeks. RLAIF replaces the labeller with a model, and the arithmetic is a flat **3,000\u00d7** \u2014 which does not improve with scale, because both options are linear. What scale changes is whether the human option exists at all: a million pairs is **$3,000,000** of annotation, which is not a line item. Constitutional AI adds the part that matters beyond cost \u2014 the alignment target becomes a **document you can read, version and argue about** rather than the implicit average taste of a labelling vendor.",

  objectives: [
    "Compute the cost difference between human and AI preference labelling",
    "Design a hybrid labelling strategy and say what the human labels are for",
    "Describe both phases of Constitutional AI",
    "Explain why a written constitution is an auditability property, not just a safety one",
    "Distinguish alignment from runtime guardrails"
  ],

  prerequisites: ["7.4", "7.6"],

  blocks: [

    { t: "h2", n: "01", id: "economics", text: "The economics",
      sub: "A flat ratio, and a threshold" },

    { t: "code", lang: "text", title: "g713.py \u00a7A \u2014 dataset cost, human against AI", code: `dataset size                  human @$3     AI @$0.001            ratio
1,000 pairs                      $3,000             $1            3000x
10,000 pairs                    $30,000            $10            3000x
100,000 pairs                  $300,000           $100            3000x
1,000,000 pairs              $3,000,000         $1,000            3000x`,
      hl: [5, 6],
      caption: "The ratio never moves. What moves is whether the left column is a number anyone will approve." },

    { t: "callout", kind: "insight", title: "The flat ratio is the point, not a disappointment",
      body: [
        { t: "p", text: "Both costs are linear in dataset size, so the 3,000\u00d7 advantage is constant \u2014 there is no scale at which AI labelling becomes *relatively* better. What changes with scale is the absolute figure crossing the threshold of what an organisation can authorise." },
        { t: "p", text: "At a thousand pairs, $3,000 of human labelling is trivially affordable and you should probably just do it \u2014 the quality is higher and the cost is noise. At a million pairs, $3,000,000 means the dataset does not get built, so RLAIF is not cheaper than the alternative, it *is* the alternative." },
        { t: "p", text: "That reframes the decision. RLAIF is not a cost optimisation applied to an existing plan; it is what makes a particular size of dataset possible at all. Which is also why its quality cost is usually acceptable \u2014 you are comparing it against nothing, not against human labels." }
      ] },

    { t: "code", lang: "text", title: "g713.py \u00a7A \u2014 the hybrid shape", code: `100,000 pairs,  2.0% human-labelled: $    6,100  (49x cheaper than all-human)
1,000,000 pairs, 0.5% human-labelled: $   16,000  (188x cheaper than all-human)`,
      hl: [1, 2],
      caption: "A small human fraction barely moves the bill and gives you something the AI labels cannot provide." },

    { t: "callout", kind: "good", title: "What the human slice is actually for",
      body: [
        { t: "p", text: "Not for volume \u2014 2% of 100,000 pairs is 2,000 labels, which would be a thin dataset on its own. It is for **calibration**: measuring whether the AI labeller agrees with humans, and on which slices it does not." },
        { t: "p", text: "7.4 established why that measurement is the one that matters. A reward model\u2019s preference accuracy is uninterpretable without knowing the agreement ceiling, and if your labels come from a model you now have two agreement questions \u2014 model-to-human, and human-to-human. The human slice gives you both." },
        { t: "p", text: "The second use is the safety-critical slice, where the cost of a wrong label is asymmetric. There the 3,000\u00d7 saving is irrelevant against the cost of training a model to be confidently wrong about something that matters, so those pairs get human labels regardless of volume." }
      ] },

    { t: "callout", kind: "warn", title: "And the AI labeller has its own preferences, which become yours",
      body: [
        { t: "p", text: "A model asked \u201cwhich of these is better\u201d brings its own biases \u2014 toward length, toward its own style, toward confident phrasing. 7.11 catalogued those as reward-hacking targets; here they enter one step earlier, in the labels themselves." },
        { t: "p", text: "Length is the one to check first, because 7.6 showed the implicit reward is linear in response length and 7.11 showed a 0.01-per-token weight equals the entire quality signal at 100 tokens. An AI labeller with a mild length preference writes that weight into your dataset." },
        { t: "p", text: "So measure the length distribution of chosen against rejected in the generated pairs, as 7.6\u2019s exercise does. If the chosen responses are systematically longer, you have inherited the labeller\u2019s bias and no loss function will separate it from quality afterwards." }
      ] },

    { t: "h2", n: "02", id: "constitutional", text: "Constitutional AI",
      sub: "Two phases, and an explicit document" },

    { t: "p", text: "RLAIF replaces the labeller. Constitutional AI additionally replaces the *criterion* with something written down \u2014 the model critiques its own output against an explicit set of principles." },

    { t: "code", lang: "text", title: "the two phases", code: `1. SUPERVISED PHASE
   response -> "Critique this against principle: 'do not assist with harm'" -> revision
   -> SFT on the (prompt, revised response) pairs

2. RL PHASE
   sample pairs -> an AI judge picks the more constitution-compliant one
   -> preference model -> RL`,
      hl: [2, 3, 6],
      caption: "Phase 1 is 7.3's SFT with self-generated targets. Phase 2 is 7.4 and 7.6 with an AI labeller and a written rubric." },

    { t: "callout", kind: "insight", title: "Phase 1 is a data-generation trick worth recognising",
      body: [
        { t: "p", text: "The critique-and-revise loop produces `(prompt, revised response)` pairs, which are exactly SFT data. So the model is generating its own demonstrations \u2014 and 7.1\u2019s second asymmetry explains why this can work: critiquing against a stated principle is an easier task than writing an ideal response from scratch." },
        { t: "p", text: "It is the same insight as 7.9\u2019s stage 3, where a reasoning model\u2019s correct traces become new SFT data. Generate with one process, consolidate with imitation \u2014 because SFT is a dense, low-variance target and generation is not." },
        { t: "p", text: "The failure mode is also the same: if the critique is wrong, you SFT on a wrong revision with full confidence. 7.3 measured that a few hundred bad examples can undo thousands of good ones, because cross-entropy has no notion of an example being incorrect." }
      ] },

    { t: "callout", kind: "good", title: "The auditability argument is the one to lead with",
      body: [
        { t: "p", text: "The usual framing is safety, and the more interesting consequence is governance: the alignment target becomes a **document**. You can read it, diff it, version it, review it, and argue about a specific clause \u2014 none of which is possible with the implicit average taste of a labelling vendor." },
        { t: "p", text: "That is the answer when an interviewer asks how you would govern model behaviour. \u201cWe collected preference data from annotators\u201d cannot be audited; a constitution can be put in front of a lawyer, a domain expert or a regulator, and a behaviour change can be traced to a clause change." },
        { t: "p", text: "It also makes disagreement productive. Two engineers can argue about whether a principle is correctly worded, which is a tractable conversation; arguing about whether a labelling vendor\u2019s aggregate taste is correct is not." }
      ] },

    { t: "callout", kind: "note", title: "Alignment and guardrails are different mechanisms",
      body: [
        { t: "p", text: "Alignment shapes the model\u2019s *tendencies*; a guardrail is a *runtime filter*. You need both, because alignment is probabilistic and guardrails are deterministic \u2014 which is 6.7\u2019s point about relevance gates arriving from the other side." },
        { t: "p", text: "6.7 measured exactly why a probabilistic mechanism cannot be a boundary: a relevance threshold let 4 of 10 unanswerable queries through, and no threshold separated the populations. The same logic applies here \u2014 an aligned model is *more likely* to refuse appropriately, which is not the same as a guarantee." },
        { t: "p", text: "So a constitution is not a substitute for an output filter, and an output filter is not a substitute for alignment. The filter catches what the tendency misses; the tendency means the filter is not constantly firing." }
      ] },

    { t: "exercise", kind: "build", title: "Audit AI-generated preference labels against human ones", difficulty: "core", minutes: 30,
      body: "Generate preference labels for a sample of pairs with a model judge, have humans label the same sample, and measure agreement — overall and by slice. Then measure whether the AI judge has a length preference, by comparing chosen and rejected token counts in the labels it produced.",
      requirements: [
        "Label the same sample with both a model judge and humans",
        "Report AI-human agreement overall and for at least three slices",
        "Report human-human agreement on a doubly-labelled subset, as the ceiling",
        "Compare mean chosen against mean rejected length in the AI labels",
        "State which slices you would send to human labelling and why"
      ],
      hint: "Measure human-human agreement too, or the AI-human number has no ceiling to be read against — the same problem as judging a reward model's accuracy in isolation.",
      solution: { lang: "python", title: "the audit", code: `def audit_judge(ai_labels, human_labels, lengths, slices):
    """ai_labels/human_labels: dicts pair_id -> 'chosen_a' or 'chosen_b'."""
    shared = set(ai_labels) & set(human_labels)
    agree = np.mean([ai_labels[i] == human_labels[i] for i in shared])

    # the length bias check -- inherited straight into your dataset
    chosen_len   = np.mean([lengths[i][ai_labels[i]]  for i in ai_labels])
    rejected_len = np.mean([lengths[i][other(ai_labels[i])] for i in ai_labels])

    out = {"ai_human_agreement": agree,
           "chosen_len": chosen_len, "rejected_len": rejected_len,
           "length_ratio": chosen_len / rejected_len}
    for name, ids in slices.items():
        sub = [i for i in ids if i in shared]
        out["agree_" + name] = np.mean([ai_labels[i] == human_labels[i] for i in sub])
    return out

m = audit_judge(AI, HUMAN, LENGTHS, SLICES)
print("AI-human agreement   : %.3f" % m["ai_human_agreement"])
print("human-human (ceiling): %.3f" % HUMAN_HUMAN)
print("chosen/rejected length ratio: %.2f" % m["length_ratio"])
for k, v in m.items():
    if k.startswith("agree_"):
        print("  %-22s %.3f" % (k[6:], v))`,
        out: `  [shape -- run on your own pairs]

  AI-human agreement   : 0.761
  human-human (ceiling): 0.804
  chosen/rejected length ratio: 1.34

    general_qa             0.812
    code                   0.779
    safety_sensitive       0.588`,
        notes: [
          { t: "p", text: "**Read 0.761 against the 0.804 ceiling, not against 1.0.** The AI judge is within 4 points of how often two humans agree with each other, which is close to as good as the labels can be \u2014 and 7.4 established that the ceiling is set by annotator consistency rather than by perfection." },
          { t: "p", text: "**The length ratio of 1.34 is the finding to act on.** The AI judge is systematically choosing longer responses, and 7.11's arithmetic says that becomes an unbounded exploit: a per-token weight equals the whole quality signal at 100 tokens. This is a data problem and no loss function fixes it downstream." },
          { t: "p", text: "**The slice table is why aggregate agreement is insufficient.** Safety-sensitive pairs at 0.588 are barely above chance while general QA is at 0.812 \u2014 so the one slice where a wrong label is most costly is the one the judge handles worst. That slice goes to humans regardless of volume." },
          { t: "p", text: "**The hybrid arithmetic makes that affordable.** Human-labelling 2% of 100,000 pairs costs $6,100 against $300,000 for all of them \u2014 and if you spend that 2% on the safety slice rather than uniformly, you get the calibration and the coverage where it matters." },
          { t: "p", text: "One thing to avoid: using the same model family as both judge and policy. The judge's stylistic preferences then correlate with the policy's natural output, which inflates agreement in a way that looks like quality and is really self-preference." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "The 3,000\u00d7 cost ratio is flat, so RLAIF is not an optimisation of an existing plan \u2014 it is what makes a million-pair dataset exist at all. Spend a small human fraction on calibration and on the safety-critical slice, because that is what AI labels cannot supply." },
        { t: "p", text: "And Constitutional AI\u2019s real contribution is that the target becomes a document you can version and argue about. Alignment shapes tendencies, guardrails are deterministic filters, and you need both because a probabilistic mechanism is not a boundary." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cWe cannot afford human preference labelling. Is AI labelling good enough?\u201d**" },
        { t: "p", text: "Usually yes, and I would reframe the question first. At $3 a human label against about $0.001 for an AI label the ratio is 3,000\u00d7 and it is flat \u2014 both scale linearly, so there is no size at which AI labelling becomes relatively better. What changes is whether the human option exists: a million pairs is $3,000,000, which is not a line item, so RLAIF is not cheaper than the plan, it *is* the plan." },
        { t: "p", text: "What I would insist on is a small human slice. Two percent of a hundred thousand pairs costs about $6,100 against $300,000 for all of them, and it buys the thing AI labels cannot \u2014 calibration. You measure whether the judge agrees with humans, and crucially you measure human-human agreement too, because otherwise the AI-human number has no ceiling to be read against." },
        { t: "p", text: "I would spend that slice unevenly rather than uniformly. Agreement is usually worst exactly where a wrong label costs most \u2014 safety-sensitive pairs \u2014 so those go to humans regardless of volume, and the easy slices go to the model." },
        { t: "p", text: "The specific thing I would check in the generated labels is length. An AI judge with a mild preference for longer answers writes that preference into your dataset, and the DPO implicit reward is linear in response length \u2014 so a per-token weight of 0.01 equals the entire quality signal at a hundred tokens. If chosen responses are systematically longer than rejected ones, that is a data problem and no loss function separates it from quality afterwards." },
        { t: "p", text: "And I would not use the same model family as judge and as policy, because then the judge\u2019s stylistic preferences correlate with the policy\u2019s natural output. Agreement goes up, and what you are measuring is self-preference rather than quality." },
        { t: "p", text: "If governance matters, Constitutional AI is worth the extra structure. The alignment target becomes a document you can read, version and put in front of a reviewer \u2014 which is auditable in a way that \u2018we collected preference data from annotators\u2019 is not, and it makes disagreements about behaviour into tractable arguments about a clause." }
      ] }
  ],

  takeaways: [
    "**Human labels cost $1\u20135 each, AI labels about $0.001** \u2014 a flat 3,000\u00d7 ratio that does not improve with scale because both are linear.",
    "**What scale changes is feasibility**: $3,000 for a thousand pairs is noise, $3,000,000 for a million means the dataset is not built.",
    "**So RLAIF is not a cost optimisation**, it is what makes a large preference dataset exist \u2014 which is why its quality cost is usually acceptable.",
    "**The human slice is for calibration, not volume** \u2014 2% of 100,000 pairs costs $6,100 against $300,000 and tells you where the judge disagrees.",
    "**Measure human-human agreement too**, because an AI-human agreement figure has no meaning without the ceiling, exactly as in 7.4.",
    "**Spend the human slice unevenly**, on the safety-critical cases where a wrong label is asymmetrically costly.",
    "**An AI judge brings its own biases**, and length is the one to check first because 7.6's reward is linear in length and 7.11 showed a small weight is unbounded.",
    "**Do not use the same model family as judge and policy**, or the judge's style preferences correlate with the policy's output and inflate agreement.",
    "**Constitutional AI phase 1 is self-generated SFT data** via critique-and-revise \u2014 the same consolidation pattern as 7.9's rejection sampling.",
    "**Its real contribution is auditability**: the alignment target becomes a document you can read, version and argue about clause by clause.",
    "**Alignment shapes tendencies; guardrails are deterministic filters** \u2014 and 6.7 measured why a probabilistic mechanism cannot be a boundary."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Human preference labels cost $3 and AI labels $0.001, a 3,000\u00d7 ratio that is identical at 1,000 pairs and at 1,000,000. What is the practical significance?",
        options: [
          "None \u2014 a constant ratio means the choice can be made on quality alone",
          "The ratio is flat but the absolute cost crosses a feasibility threshold: $3,000 is affordable and $3,000,000 means the dataset is never built, so RLAIF is the alternative to nothing rather than to human labels",
          "AI labelling becomes relatively more attractive as datasets grow, since fixed costs amortise",
          "The ratio understates the saving because human labelling also takes weeks"
        ],
        answer: 1,
        why: "Both costs are linear, so there is no scale at which AI labelling is relatively better \u2014 the advantage is constant. What changes is whether a human-labelled dataset of that size can be authorised at all. That reframes the quality comparison: at small scale you should probably pay for human labels since the cost is noise, and at large scale the comparison is against not having the data, which is why a quality cost is usually acceptable." },

      { stem: "An AI judge shows 0.761 agreement with humans. Humans agree with each other 0.804 of the time. How should the 0.761 be read?",
        options: [
          "Poorly \u2014 it is 24% away from perfect agreement and needs improvement",
          "Well \u2014 it is within 4 points of the ceiling set by human-human agreement, which is as close to correct as the labels can be",
          "It cannot be interpreted without knowing the model's parameter count",
          "It indicates the humans were poorly trained, since 0.804 is low"
        ],
        answer: 1,
        why: "Preference labels are stochastic, so human-human agreement is the ceiling and perfection is not available \u2014 the same point 7.4 established when a reward model matched a Bayes-optimal 78.6% rather than 100%. Reading 0.761 against 1.0 would suggest a large deficit; reading it against 0.804 shows the judge is near the limit of what the labels contain. This is why the human slice must include a doubly-labelled subset." },

      { stem: "Why is an AI judge's length preference a particularly serious problem?",
        options: [
          "Because longer responses cost more to generate during training",
          "Because the implicit reward is linear in response length with nothing bounding it, so even a small learned length weight becomes an unbounded exploit \u2014 at 100 tokens a 0.01 weight equals the entire quality signal",
          "Because it makes the preference pairs harder for the reward model to fit",
          "Because length correlates with the judge's own training distribution"
        ],
        answer: 1,
        why: "The DPO implicit reward sums over response tokens, so a per-token preference accumulates without limit \u2014 which is why length is the canonical reward hack. A judge with a mild length preference writes that weight into the dataset, and no loss function can afterwards separate length from quality when the labels have confounded them. The check is to compare mean chosen against mean rejected token counts in the generated pairs." },

      { stem: "What does Constitutional AI add beyond replacing human labellers with a model?",
        options: [
          "A deterministic guarantee that the model will refuse harmful requests",
          "An explicit written criterion \u2014 so the alignment target becomes a document that can be read, versioned, reviewed and argued about clause by clause",
          "A reduction in labelling cost beyond what RLAIF achieves",
          "The ability to train without any SFT stage"
        ],
        answer: 1,
        why: "RLAIF changes who labels; Constitutional AI changes what the criterion is, making it auditable. That is a governance property: a constitution can be put in front of a lawyer or a regulator and a behaviour change traced to a clause change, which the implicit aggregate taste of a labelling vendor cannot be. It is explicitly not a guarantee \u2014 alignment shapes tendencies while guardrails are the deterministic runtime filter, and both are needed." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "AI feedback and written criteria",
    questions: [
      { level: "core",
        q: "What is RLAIF and when would you use it?",
        strong: "A strong answer reframes the cost question as a feasibility one.",
        answer: [
          { t: "p", text: "Replacing the human labeller with a model: sample two responses, ask a strong model which is better and why, and use the result as a preference pair for DPO or a reward model." },
          { t: "p", text: "The economics are a flat 3,000\u00d7 \u2014 about $3 a human label against $0.001 \u2014 and flat matters, because both are linear so there is no scale at which AI labelling becomes relatively better. What scale changes is feasibility: $3,000 for a thousand pairs is affordable and you should probably just pay it, while $3,000,000 for a million means the dataset never exists." },
          { t: "p", text: "So I would not describe it as a cost optimisation. At the sizes where it matters, RLAIF is the alternative to having no data, which is also why a modest quality cost is usually acceptable." },
          { t: "p", text: "In practice I would use a hybrid: AI labels for volume, a small human slice for calibration, and human labels unconditionally on the safety-critical slice. Two percent of a hundred thousand pairs is about $6,100 against $300,000, so the calibration is nearly free." }
        ] },

      { level: "advanced",
        q: "What would you check before trusting AI-generated preference labels?",
        strong: "A strong answer names the ceiling and the length bias.",
        answer: [
          { t: "p", text: "Three things. First, agreement with humans on a shared sample \u2014 and human-human agreement on a doubly-labelled subset, because without that ceiling the agreement figure is uninterpretable. A judge at 0.761 against a 0.804 human ceiling is close to the limit of the labels; against a 0.95 ceiling it would be poor." },
          { t: "p", text: "Second, agreement by slice rather than in aggregate. In my experience the pattern is that agreement is worst exactly where a wrong label costs most \u2014 safety-sensitive cases \u2014 while general question answering looks fine. An aggregate figure hides that completely, and those slices are where the human budget should go." },
          { t: "p", text: "Third, the length distribution of chosen against rejected responses. An AI judge with a mild length preference writes that into the dataset, and the DPO implicit reward is linear in response length \u2014 a per-token weight of 0.01 equals the entire quality signal at a hundred tokens. That is a data problem and nothing downstream separates it from quality." },
          { t: "p", text: "And one structural thing: I would not use the same model family as judge and as policy. The judge\u2019s stylistic preferences then correlate with the policy\u2019s natural output, so agreement rises and what you are measuring is self-preference." }
        ] },

      { level: "core",
        q: "How would you govern what behaviours a model has?",
        strong: "A strong answer reaches for auditability and distinguishes guardrails.",
        answer: [
          { t: "p", text: "With an explicit written constitution, because it makes the alignment target auditable. You can read it, diff it, version it, and put it in front of a lawyer, a domain expert or a regulator \u2014 and when behaviour changes you can trace it to a clause change." },
          { t: "p", text: "The alternative is the implicit aggregate taste of whoever labelled your preference data, which cannot be audited and cannot be argued about productively. Two engineers can have a tractable disagreement about how a principle is worded; they cannot have one about whether a vendor\u2019s average judgement was right." },
          { t: "p", text: "Mechanically it is two phases. A supervised phase where the model critiques its own responses against a principle and revises them, which produces SFT data \u2014 the same consolidate-by-imitation pattern as rejection sampling in a reasoning pipeline. Then an RL phase where an AI judge picks the more constitution-compliant response, giving preference pairs." },
          { t: "p", text: "The thing I would be explicit about is that this is not a guarantee. Alignment shapes tendencies and is probabilistic; guardrails are deterministic runtime filters. You need both \u2014 and I have measured the reason directly in a retrieval context, where a probabilistic relevance threshold let four of ten unanswerable queries through and no threshold separated the populations at all. A tendency is not a boundary." }
        ] }
    ]
  }
});
