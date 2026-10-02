EC.receiveLesson({
  id: "7.14",

  lede: "The decision guide, keyed on the data you have rather than the paper you read. The first branch is the one that filters interviews: **if you need the model to know new facts, do not fine-tune** \u2014 fine-tuning teaches behaviour, and 7.1 measured why, since gpt2 already ranked \u201cParis\u201d above the alternatives while giving it 0.54% as a next token. The knowledge was there; the behaviour was not. Everything below that branch is a question about what feedback you can actually collect.",

  objectives: [
    "Apply the decision tree from the top, and say why the first branch filters",
    "Choose an alignment method from the shape of your feedback data",
    "Recognise when to stop at SFT",
    "Describe a realistic two-GPU-day pipeline for a product team",
    "Say what each method costs in memory, using the module's measured figures"
  ],

  prerequisites: ["7.7", "7.9", "7.13"],

  blocks: [

    { t: "h2", n: "01", id: "first", text: "The first branch",
      sub: "New facts are not a fine-tuning problem" },

    { t: "code", lang: "text", title: "the top of the tree", code: `Do you need the model to know NEW FACTS?
  -> No fine-tuning. Use RAG.
     (Fine-tuning teaches behaviour, not facts. This is the #1 interview filter.)`,
      hl: [2, 3],
      caption: "The most common expensive mistake in this whole area, and the cheapest to avoid." },

    { t: "callout", kind: "insight", title: "7.1 measured the distinction rather than asserting it",
      body: [
        { t: "p", text: "Scored as statements, gpt2 ranks \u201cThe capital of France is Paris\u201d above the Berlin, Madrid and London variants \u2014 the fact is in the weights. Asked the question directly, it gives \u201c Paris\u201d **0.54%** of the next-token mass against **33.84%** for a newline. Same weights, same fact, two different operations." },
        { t: "p", text: "So fine-tuning changes which continuations are likely, not what is true. If a fact is absent from the weights, changing the distribution over continuations will not put it there \u2014 it will make the model confidently fluent about something it does not know, which is worse than a refusal." },
        { t: "p", text: "That is why the answer is retrieval. M5 and M6 are about putting the fact in the context where the model can read it, and 6.8 measured the failure mode when it is not: the right answer exists in the corpus and is not retrieved, so the model fills the gap by inventing." }
      ] },

    { t: "h2", n: "02", id: "tree", text: "The rest of the tree",
      sub: "Each branch is a data question" },

    { t: "code", lang: "text", title: "the decision guide", code: `Do you need a specific FORMAT / TONE / TASK behaviour?
  -> SFT (+ LoRA). 1k-10k examples. Stop here -- most projects should.

Is the behaviour "correct but not preferred" -- too verbose, wrong register,
unsafe edge cases, does not pick the answer humans like?
  |- PAIRWISE data ...................... DPO   (beta=0.1, lr~5e-7, 1 epoch)
  |- THUMBS UP/DOWN only ................ KTO
  |- ONE stage from a base model ........ ORPO
  \\- Outputs keep getting longer ........ SimPO

Do you have a PROGRAMMATIC verifier (tests, exact answer, schema)?
  -> GRPO + RLVR. This is how you build a reasoning/agentic model.

Do you have a labelling budget, an RM, GPUs for 4 models, and a team?
  -> PPO/RLHF. Highest ceiling, highest cost. Rarely the right first move.`,
      hl: [2, 7, 8, 9, 10],
      caption: "Note the second line: \u201cstop here \u2014 most projects should\u201d is the advice most often ignored." },

    { t: "callout", kind: "good", title: "\u201cStop at SFT\u201d is the recommendation to take seriously",
      body: [
        { t: "p", text: "7.1\u2019s framing explains why: SFT is imitation and gets you about 80% of the way, while alignment is preference-based and buys the last 20% at considerably more cost and complexity. If the problem is format, tone or task behaviour, the cheap stage already solves it." },
        { t: "p", text: "And 7.3 measured that SFT quality dominates quantity \u2014 LIMA-style, a thousand curated examples competitive with far larger noisy sets \u2014 because you are teaching a shape rather than facts. So the effort is better spent curating 1,000 examples than collecting preference pairs." },
        { t: "p", text: "The signal that you genuinely need alignment is specific: the model produces *correct* output that humans do not prefer. If it is producing wrong output, that is an SFT or a retrieval problem, and preference optimisation will teach it to be wrong in a more appealing way." }
      ] },

    { t: "table",
      head: ["Your data", "Method", "Why", "Memory at 7B"],
      rows: [
        ["Instruction\u2013answer pairs", "SFT (+ LoRA)", "Teaches format and behaviour; 1k\u201310k examples", "One trained model"],
        ["Pairwise preferences + an SFT model", "**DPO**", "The default \u2014 one loss, no RM, no RL loop", "**117.3 GB**"],
        ["Thumbs up/down from production", "**KTO**", "The only one that needs no pairs", "Same as DPO"],
        ["Pairs but no SFT run, tight memory", "**ORPO**", "One stage, base straight to aligned, no reference", "Less than DPO \u2014 no reference model"],
        ["Pairs, and outputs drifting long", "**SimPO**", "Length-normalises the implicit reward", "Same as ORPO"],
        ["Noisy, contradictory labels", "**IPO**", "Bounded target margin stops chasing contradictions", "Same as DPO"],
        ["A programmatic verifier", "**GRPO + RLVR**", "Cannot be flattered; the reasoning-model route", "**117.3 GB** under RLVR"],
        ["Budget, RM, 4 models, a team", "PPO/RLHF", "Highest ceiling, and online exploration", "**234.7 GB**"]
      ] },

    { t: "callout", kind: "insight", title: "Two rows deserve more weight than they usually get",
      body: [
        { t: "p", text: "**KTO**, because production feedback is thumbs-up and thumbs-down, which is not pair-shaped and is often orders of magnitude larger than any commissioned pair set. 7.7 made this point and it is the most commonly wasted asset in this area \u2014 a dataset sitting unused because the tooling expects pairs." },
        { t: "p", text: "**GRPO + RLVR**, because 7.8 measured it reaching DPO\u2019s 117.3 GB footprint while remaining *online*. That combination \u2014 DPO\u2019s memory profile with the ability to explore beyond your data \u2014 is why it displaced both for verifiable domains, and it is cheaper than most people assume." },
        { t: "p", text: "The row to be most sceptical of is PPO. At 234.7 GB for a 7B policy, with autoregressive generation inside the training loop and \u03b2 coupled to an arbitrary reward scale, it is rarely the right first move \u2014 which the guide says and is worth repeating." }
      ] },

    { t: "h2", n: "03", id: "pipeline", text: "The realistic pipeline",
      sub: "Two GPU-days, not a research programme" },

    { t: "code", lang: "text", title: "what a product team actually does", code: `open instruct model
  -> LoRA SFT (5k curated examples)
  -> LoRA DPO (2k preference pairs harvested from production thumbs-down
               plus LLM-judge labels)
  -> merge
  -> eval-gated deploy`,
      hl: [2, 3, 5, 6],
      caption: "Every stage here is chosen to be cheap, and each one draws on a measured fact from this module." },

    { t: "callout", kind: "good", title: "Why each stage is the cheap option",
      body: [
        { t: "p", text: "**Open instruct model** rather than a base model \u2014 you inherit someone else\u2019s SFT and alignment, and 7.2 showed you also inherit their over-training bet, which is exactly the right inheritance since they paid the training premium and you pay only inference." },
        { t: "p", text: "**LoRA for both stages**, which 7.6 noted collapses the reference-model requirement: disable the adapter and the base weights *are* \\(\\pi_{\\text{ref}}\\). That removes 13.0 GB and a whole class of wrong-reference bug at once, and is why DPO plus LoRA fits on one GPU where PPO does not come close." },
        { t: "p", text: "**Harvested pairs plus judge labels**, which is 7.12\u2019s hybrid: AI labels for volume at roughly 3,000\u00d7 less than human labelling, with a human slice for calibration. 2,000 pairs is small enough that the human fraction is nearly free." },
        { t: "p", text: "**Merge**, which 7.13 established as the zero-compute fix for the forgetting a domain fine-tune causes \u2014 and with only two models the sign-conflict arithmetic is at its most forgiving." }
      ] },

    { t: "callout", kind: "warn", title: "The eval gate is the stage people skip",
      body: [
        { t: "p", text: "7.15 is about this in detail, and the short version is that the metrics you optimised prove nothing. A DPO reward accuracy of 0.82 says the loss went down, which you already knew." },
        { t: "p", text: "The gate needs a win rate against the *pre-alignment* model on held-out prompts, a capability-regression check, and a length measurement \u2014 because 7.11 showed length is the canonical hack and a 40% creep means you bought length rather than quality." },
        { t: "p", text: "6.1 made the same argument for retrieval: deterministic metrics over a labelled set are cheap enough to run in CI, which turns a quality regression into a failed build rather than a user complaint. The alignment equivalent is the same idea with a judge in the loop." }
      ] },

    { t: "viz", title: "The decision tree, with measured costs", caption: "Each branch is a question about data. The memory figures are from 7.5 and 7.8.",
      svg: `<svg viewBox="0 0 760 320" width="100%" role="img" aria-label="Alignment method decision tree">
  <rect x="200" y="12" width="360" height="34" rx="5" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.8"/>
  <text x="380" y="27" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--crit)">need NEW FACTS?</text>
  <text x="380" y="40" text-anchor="middle" class="s-sub" style="font-size:9px">yes -&gt; RAG, not fine-tuning</text>

  <line x1="380" y1="46" x2="380" y2="64" stroke="var(--line)" stroke-width="1.2"/>
  <rect x="200" y="64" width="360" height="34" rx="5" class="s-fill-bg" style="stroke:var(--good)" stroke-width="1.8"/>
  <text x="380" y="79" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--good)">need FORMAT / TONE / TASK?</text>
  <text x="380" y="92" text-anchor="middle" class="s-sub" style="font-size:9px">yes -&gt; SFT + LoRA, 1k-10k examples. STOP HERE.</text>

  <line x1="380" y1="98" x2="380" y2="116" stroke="var(--line)" stroke-width="1.2"/>
  <rect x="200" y="116" width="360" height="30" rx="5" class="s-fill-bg" style="stroke:var(--accent)" stroke-width="1.6"/>
  <text x="380" y="135" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--accent)">correct but NOT PREFERRED?</text>

  <line x1="380" y1="146" x2="380" y2="162" stroke="var(--line)" stroke-width="1.2"/>
  <line x1="92" y1="162" x2="668" y2="162" stroke="var(--line)" stroke-width="1.2"/>
  <line x1="92" y1="162" x2="92" y2="178" stroke="var(--line)" stroke-width="1.2"/>
  <line x1="284" y1="162" x2="284" y2="178" stroke="var(--line)" stroke-width="1.2"/>
  <line x1="476" y1="162" x2="476" y2="178" stroke="var(--line)" stroke-width="1.2"/>
  <line x1="668" y1="162" x2="668" y2="178" stroke="var(--line)" stroke-width="1.2"/>

  <rect x="22" y="178" width="140" height="48" rx="4" class="s-fill-bg" style="stroke:var(--accent)" stroke-width="1.4"/>
  <text x="92" y="196" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--accent)">DPO</text>
  <text x="92" y="210" text-anchor="middle" class="s-sub" style="font-size:8px">pairs + SFT model</text>
  <text x="92" y="221" text-anchor="middle" class="s-mono" style="font-size:8px">117.3 GB</text>

  <rect x="214" y="178" width="140" height="48" rx="4" class="s-fill-bg" style="stroke:var(--violet)" stroke-width="1.6"/>
  <text x="284" y="196" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--violet)">KTO</text>
  <text x="284" y="210" text-anchor="middle" class="s-sub" style="font-size:8px">thumbs up/down</text>
  <text x="284" y="221" text-anchor="middle" class="s-mono" style="font-size:8px">no pairs needed</text>

  <rect x="406" y="178" width="140" height="48" rx="4" class="s-fill-bg" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="476" y="196" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--good)">ORPO</text>
  <text x="476" y="210" text-anchor="middle" class="s-sub" style="font-size:8px">no SFT run</text>
  <text x="476" y="221" text-anchor="middle" class="s-mono" style="font-size:8px">1 stage, no ref</text>

  <rect x="598" y="178" width="140" height="48" rx="4" class="s-fill-bg" style="stroke:var(--warn)" stroke-width="1.4"/>
  <text x="668" y="196" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--warn)">SimPO</text>
  <text x="668" y="210" text-anchor="middle" class="s-sub" style="font-size:8px">drifting long</text>
  <text x="668" y="221" text-anchor="middle" class="s-mono" style="font-size:8px">length-normalised</text>

  <line x1="16" y1="244" x2="744" y2="244" stroke="var(--line)" stroke-width="1"/>
  <rect x="100" y="256" width="250" height="40" rx="5" class="s-fill-bg" style="stroke:var(--violet)" stroke-width="1.6"/>
  <text x="225" y="272" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--violet)">have a VERIFIER?</text>
  <text x="225" y="288" text-anchor="middle" class="s-sub" style="font-size:9px">GRPO + RLVR \u00b7 117.3 GB \u00b7 online</text>

  <rect x="410" y="256" width="250" height="40" rx="5" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.4"/>
  <text x="535" y="272" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--crit)">budget + RM + a team?</text>
  <text x="535" y="288" text-anchor="middle" class="s-sub" style="font-size:9px">PPO \u00b7 234.7 GB \u00b7 rarely the first move</text>
</svg>` },

    { t: "exercise", kind: "analysis", title: "Pick your method and justify it from measurements", difficulty: "core", minutes: 30,
      body: "Walk the decision tree for a project you actually have. At each branch, state the measurement or observation that sends you down one path, and finish with the method, the hyperparameters and the memory footprint. Then state what you would need to collect to use the next method up, and whether it is worth it.",
      requirements: [
        "Start at the facts-versus-behaviour branch and justify your answer with evidence",
        "State your feedback data's shape and volume",
        "Name the method, its key hyperparameters and its memory footprint",
        "State the single measurement that would change your choice",
        "Estimate the total compute in GPU-hours"
      ],
      hint: "Be honest at the first branch. If the real problem is that the model does not know something, no amount of alignment work will help and the whole tree below is irrelevant.",
      solution: { lang: "python", title: "the walk, made explicit", code: `def choose(needs_new_facts, needs_format_only, behaviour_is_correct,
           pairs, unpaired, have_verifier, have_sft_model, agreement):
    if needs_new_facts:
        return ("RAG", "fine-tuning teaches behaviour, not facts", None)
    if needs_format_only:
        return ("SFT + LoRA", "1k-10k curated examples; stop here", "1 trained model")
    if not behaviour_is_correct:
        return ("SFT or RAG first",
                "preference optimisation on wrong output teaches appealing wrongness", None)

    if have_verifier:
        return ("GRPO + RLVR", "verifier cannot be flattered; online", "117.3 GB at 7B")
    if unpaired > 10 * max(pairs, 1):
        return ("KTO", "unpaired production feedback dominates", "~117.3 GB")
    if agreement < 0.70:
        return ("IPO", "labels contradict; bounded target margin", "~117.3 GB")
    if not have_sft_model:
        return ("ORPO", "one stage base->aligned, no reference model", "< DPO")
    return ("DPO", "beta=0.1, lr~5e-7, 1 epoch", "117.3 GB at 7B")

CASES = [
    dict(needs_new_facts=True,  needs_format_only=False, behaviour_is_correct=True,
         pairs=0, unpaired=0, have_verifier=False, have_sft_model=True, agreement=0.8),
    dict(needs_new_facts=False, needs_format_only=False, behaviour_is_correct=True,
         pairs=300, unpaired=150_000, have_verifier=False, have_sft_model=True,
         agreement=0.79),
    dict(needs_new_facts=False, needs_format_only=False, behaviour_is_correct=True,
         pairs=5_000, unpaired=0, have_verifier=True, have_sft_model=True,
         agreement=0.81),
]
for c in CASES:
    m, why, mem = choose(**c)
    print("%-16s %-52s %s" % (m, why, mem or "-"))`,
        out: `  RAG              fine-tuning teaches behaviour, not facts              -
  KTO              unpaired production feedback dominates                ~117.3 GB
  GRPO + RLVR      verifier cannot be flattered; online                  117.3 GB at 7B`,
        notes: [
          { t: "p", text: "**The verifier check comes before the data-shape checks**, and that ordering is deliberate. A programmatic verifier is a better signal than any preference data \u2014 it cannot be flattered, so the overoptimisation ceiling lifts \u2014 and 7.8 measured GRPO under RLVR at DPO's footprint while remaining online. If you have one, use it." },
          { t: "p", text: "**Case two is the common real situation.** 300 commissioned pairs against 150,000 production labels, and the instinct is to use the 300 because the tooling wants pairs. KTO uses the larger set directly, which is a different order of magnitude of signal." },
          { t: "p", text: "**The `behaviour_is_correct` guard matters more than it looks.** If the model is producing *wrong* output, preference optimisation teaches it to be wrong more appealingly. That is an SFT or retrieval problem, and sending it to DPO is how teams spend a month making things worse." },
          { t: "p", text: "**None of the branches depends on a benchmark comparison between methods.** The published differences are small relative to the difference made by having the right data shape, and a method that cannot consume your data is not improved by winning a leaderboard." },
          { t: "p", text: "One honest limit on this function: it returns a single answer where the constraints are often independent and compatible. Low agreement and no SFT model both hold sometimes, and then IPO and ORPO are both reasonable \u2014 the tree gives a starting point, not a proof." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Facts go to retrieval, behaviour goes to SFT, and preference goes to alignment \u2014 and most projects should stop at SFT, because imitation buys about 80% and costs a fraction. The signal that you genuinely need alignment is that the output is *correct* and not preferred." },
        { t: "p", text: "Below that, every branch is a question about your data rather than the literature: a verifier beats preference data, unpaired production feedback beats a small commissioned pair set, and PPO at 234.7 GB is rarely the first move when DPO and GRPO both sit at 117.3 GB." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cWe want to fine-tune a model on our internal documentation so it can answer questions about our product. How would you approach it?\u201d**" },
        { t: "p", text: "I would push back on the premise first, because as stated this is a retrieval problem rather than a fine-tuning one. Fine-tuning teaches behaviour, not facts \u2014 and if the facts are not in the weights, changing the distribution over continuations does not put them there, it makes the model confidently fluent about things it does not know." },
        { t: "p", text: "I can make that concrete rather than assert it. I measured gpt2 on \u2018What is the capital of France?\u2019: scored as statements it ranks \u2018Paris\u2019 above Berlin, Madrid and London, so the fact is present \u2014 but the immediate next-token probability of \u2018 Paris\u2019 is 0.54% against 33.84% for a newline. Same weights, same fact, two different operations. Fine-tuning moves the second number, not the first." },
        { t: "p", text: "So documentation goes in a retrieval system, which also gets you freshness for free: a changed document is a re-embed rather than a retraining run, and a content hash makes that nearly free." },
        { t: "p", text: "Where fine-tuning *would* help is if the complaint is really about behaviour \u2014 the answers are factually fine but the register is wrong, or they do not follow the output format, or they are too verbose. That is SFT with a thousand to ten thousand curated examples, and I would stop there for most projects, because SFT is imitation and buys about 80% while alignment buys the last 20% at considerably more cost." },
        { t: "p", text: "If after that the outputs are correct and still not what people prefer, then alignment \u2014 and I would pick by data shape. Pairwise preferences and an SFT model means DPO at beta 0.1 and a learning rate around 5e-7. Thumbs-up and thumbs-down from production means KTO, which is usually the overlooked option because that dataset is often far larger than any commissioned pair set and sits unused." },
        { t: "p", text: "Realistically the whole thing is an open instruct model, LoRA SFT on five thousand curated examples, LoRA DPO on two thousand pairs harvested from production feedback with judge labels, a merge to recover anything the fine-tune cost, and an eval-gated deploy. That is about two GPU-days, and with LoRA the adapter-disabled base weights serve as the DPO reference, so it fits on one GPU." }
      ] }
  ],

  takeaways: [
    "**The first branch filters interviews**: new facts go to retrieval, because fine-tuning changes which continuations are likely, not what is true.",
    "**7.1 measured that distinction** \u2014 gpt2 ranks \u201cParis\u201d above the alternatives as a statement while giving it 0.54% as a next token against 33.84% for a newline.",
    "**Format, tone and task behaviour go to SFT with 1k\u201310k examples, and most projects should stop there** \u2014 imitation buys ~80% at a fraction of the cost.",
    "**The signal that alignment is genuinely needed is output that is *correct* and not preferred.** Wrong output is an SFT or retrieval problem.",
    "**Preference optimisation on wrong output teaches appealing wrongness**, which is how a month gets spent making things worse.",
    "**A verifier beats preference data when you have one** \u2014 GRPO+RLVR is 117.3 GB at 7B and remains online, so it is cheaper than usually assumed.",
    "**KTO is the most commonly wasted option**, because production thumbs-up/down is not pair-shaped and is often orders of magnitude larger than commissioned pairs.",
    "**PPO at 234.7 GB is rarely the first move**, with generation inside the training loop and \u03b2 coupled to an arbitrary reward scale.",
    "**The realistic pipeline is two GPU-days**: open instruct model, LoRA SFT on 5k curated examples, LoRA DPO on 2k harvested pairs, merge, eval-gated deploy.",
    "**LoRA collapses the reference-model requirement** \u2014 the adapter-disabled base weights *are* \u03c0_ref, removing 13 GB and a class of wrong-reference bug.",
    "**Start from an open instruct model**, inheriting someone else's SFT, alignment and over-training bet \u2014 they paid the training premium, you pay only inference.",
    "**The eval gate is the stage people skip**, and the metrics you optimised prove nothing \u2014 a DPO reward accuracy of 0.82 says only that the loss went down."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A team wants to fine-tune so the model knows their internal product documentation. What is the right response and the evidence for it?",
        options: [
          "Fine-tune with SFT on documentation-derived question-answer pairs",
          "Use retrieval \u2014 fine-tuning changes which continuations are likely rather than what is true, as shown by gpt2 ranking \u201cParis\u201d highest as a statement while giving it 0.54% as a next token",
          "Fine-tune with DPO on preference pairs where the chosen answer cites the documentation",
          "Continue pretraining on the documentation corpus instead of fine-tuning"
        ],
        answer: 1,
        why: "The measurement separates knowledge from behaviour cleanly: the same weights that rank the true statement above false ones give the correct answer almost no probability as an immediate continuation. Fine-tuning moves the second quantity, so if a fact is absent it produces confident fluency about something unknown rather than knowledge. Retrieval also gets freshness for free, since a changed document is a re-embed rather than a retraining run." },

      { stem: "Under what circumstance is alignment genuinely the right next step after SFT?",
        options: [
          "When SFT has plateaued and the loss has stopped improving",
          "When the output is factually correct but not what humans prefer \u2014 too verbose, wrong register, unsafe edge cases",
          "When you have accumulated enough preference pairs to justify the effort",
          "When the model needs to handle inputs outside its SFT distribution"
        ],
        answer: 1,
        why: "Alignment converts comparisons into weights, so it can only shift which of several acceptable outputs is preferred. If the output is wrong, preference optimisation will teach the model to be wrong more appealingly \u2014 the fix there is better SFT data or retrieval. Having the data is a prerequisite rather than a reason, and SFT loss plateauing says nothing about whether the remaining gap is a preference gap." },

      { stem: "Why does the decision tree check for a programmatic verifier before checking the shape of your preference data?",
        options: [
          "Because verifiers are cheaper to build than preference datasets are to collect",
          "Because a verifier cannot be flattered, so the overoptimisation ceiling lifts \u2014 and GRPO+RLVR sits at DPO's 117.3 GB footprint while remaining online",
          "Because GRPO is more sample-efficient than DPO on the same data",
          "Because verifiable rewards are dense rather than sparse, improving credit assignment"
        ],
        answer: 1,
        why: "A verifier is a better signal than any learned reward: length, confidence and formatting cannot change whether a unit test passes, so optimisation can run far longer before the reward stops correlating with the goal. And the cost objection does not hold \u2014 removing the critic takes PPO's 234.7 GB to 130.4 GB, and replacing the reward model with a program reaches 117.3 GB, the same as DPO, while keeping the ability to explore beyond existing data." },

      { stem: "In a realistic product pipeline, why is LoRA used for the DPO stage specifically?",
        options: [
          "Because DPO requires fewer trainable parameters than SFT to converge",
          "Because the adapter-disabled base weights serve as the frozen reference, removing a second model copy and a class of wrong-reference bug",
          "Because LoRA prevents the length bias that DPO otherwise exhibits",
          "Because DPO's learning rate is too low for full fine-tuning to be stable"
        ],
        answer: 1,
        why: "DPO needs a frozen reference policy, and with LoRA you get it for free by disabling the adapter \u2014 saving 13.0 GB at 7B and making it impossible to load the wrong checkpoint as the reference, which otherwise fails silently. That is a large part of why DPO plus LoRA fits on a single GPU where PPO does not come close. LoRA does nothing about the length bias, which comes from the implicit reward being a sum over tokens." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "The decision, keyed on data",
    questions: [
      { level: "core",
        q: "How do you decide between RAG, SFT and alignment?",
        strong: "A strong answer separates facts, behaviour and preference.",
        answer: [
          { t: "p", text: "Facts to retrieval, behaviour to SFT, preference to alignment \u2014 and the first branch is the one that matters most because getting it wrong is expensive. Fine-tuning teaches behaviour, not facts." },
          { t: "p", text: "I would make that concrete rather than assert it. On gpt2, scored as statements the model ranks \u2018The capital of France is Paris\u2019 above the Berlin and London variants, so the fact is in the weights \u2014 but asked the question directly it gives \u2018 Paris\u2019 0.54% of the next-token mass against 33.84% for a newline. Fine-tuning moves the second number. If the fact is not there at all, it just produces confident fluency about something unknown." },
          { t: "p", text: "Then SFT for format, tone and task behaviour \u2014 a thousand to ten thousand curated examples \u2014 and I would genuinely stop there for most projects. SFT is imitation and gets about 80% of the way; alignment is preference-based and buys the last 20% at considerably more cost and operational complexity." },
          { t: "p", text: "The specific signal that alignment is needed is output that is *correct* and not preferred: too verbose, wrong register, unsafe edge cases. If the output is wrong, that is an SFT or retrieval problem, and running DPO on it teaches the model to be wrong more appealingly." }
        ] },

      { level: "advanced",
        q: "Describe a realistic alignment pipeline for a product team.",
        strong: "A strong answer is specific about cost and justifies each stage.",
        answer: [
          { t: "p", text: "Open instruct model, LoRA SFT on about five thousand curated examples, LoRA DPO on about two thousand preference pairs harvested from production thumbs-down plus judge labels, merge, then an eval-gated deploy. Roughly two GPU-days." },
          { t: "p", text: "Starting from an instruct model rather than a base one means inheriting someone else\u2019s SFT and alignment \u2014 and their over-training bet, which is the right inheritance since they paid the training premium and you only pay inference. I measured that premium: over-training an 8B to 15T tokens costs more training compute than training a 70B Chinchilla-optimally." },
          { t: "p", text: "LoRA for both stages, and for DPO specifically it collapses the reference-model requirement \u2014 disable the adapter and the base weights *are* the reference. That removes 13 GB at 7B and a whole class of silent wrong-reference bug, and it is why DPO plus LoRA fits on one GPU where PPO at 234.7 GB does not come close." },
          { t: "p", text: "The pairs come from production feedback with AI labels for volume and a small human slice for calibration \u2014 about 3,000\u00d7 cheaper per label, with the human fraction nearly free at two thousand pairs. And the merge is the zero-compute fix for whatever general capability the fine-tune cost." },
          { t: "p", text: "The stage I would defend hardest is the eval gate, because the metrics you optimised prove nothing. A DPO reward accuracy of 0.82 tells you the loss went down. What is needed is a win rate against the pre-alignment model on held-out prompts, a capability-regression check, and mean output length \u2014 since length is the canonical reward hack." }
        ] },

      { level: "core",
        q: "When is PPO the right choice?",
        strong: "A strong answer names online exploration and prices the alternative.",
        answer: [
          { t: "p", text: "Rarely as a first move, and specifically when you need the policy to explore against a reward signal you can query online. That is the one thing DPO structurally cannot do \u2014 it is offline, so it can only re-rank behaviours already latent in the model and cannot discover something absent from its pairs." },
          { t: "p", text: "The cost is the reason to be reluctant. For a 7B policy PPO needs four models resident at 234.7 GB, because the policy and critic are trained and each costs about 16 bytes per parameter once you count gradients, the fp32 master copy and Adam\u2019s moments. DPO is 117.3 GB, exactly half, at every model size." },
          { t: "p", text: "It also has autoregressive generation inside the training loop, which is sequential and bandwidth-bound, so sampling dominates the wall clock and you need real infrastructure for it. And beta is coupled to the reward model\u2019s output scale, which is mathematically unidentifiable \u2014 so retraining the RM silently changes your leash length." },
          { t: "p", text: "If what I actually wanted was online exploration, I would reach for GRPO rather than PPO. It deletes the critic, which is 44% less memory, and under verifiable rewards it reaches DPO\u2019s 117.3 GB while staying online \u2014 which is most of PPO\u2019s advantage at DPO\u2019s cost." }
        ] }
    ]
  }
});
