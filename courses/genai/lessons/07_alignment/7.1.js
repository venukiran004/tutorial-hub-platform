EC.receiveLesson({
  id: "7.1",

  lede: "A pretrained model is not trying to be helpful. It is trying to predict the next token, and the reference illustrates this by predicting that a base model asked \u201cWhat is the capital of France?\u201d will continue with *more questions*. I ran it on gpt2, a genuine base model. It **answered correctly** \u2014 and then repeated the answer four times. Three of my four prompts did fail exactly as the reference describes, so the claim holds; its chosen example is the one that does not. The quantitative version is sharper: the immediate next-token probability of \u201c Paris\u201d is **0.54%** against **33.84%** for a newline.",

  objectives: [
    "State what pretraining optimises and why that is not helpfulness",
    "Demonstrate the gap between what a base model knows and what it will do",
    "Explain why preference data exists rather than more demonstration data",
    "Name the three post-training paths and what each one removes",
    "Place SFT and alignment on the cheap-versus-expensive axis correctly"
  ],

  prerequisites: ["3.2", "4.1"],

  blocks: [

    { t: "h2", n: "01", id: "objective", text: "What pretraining actually optimises",
      sub: "One loss, no labels, no humans" },

    { t: "p", text: "Everything a base model knows arrives through a single objective: predict the next token given the ones before it, averaged over the corpus." },

    { t: "math", tex: "\\mathcal{L}_{\\text{pretrain}} = -\\frac{1}{T}\\sum_{t} \\log P_\\theta(x_t \\mid x_{<t})" },

    { t: "p", text: "Nothing in that expression mentions a question, an instruction, an answer or a user. It is cross-entropy over a vocabulary, and 3.2 already showed what it produces at inference: a probability distribution over next tokens, which decoding then samples from." },

    { t: "callout", kind: "insight", title: "So \u201cignores instructions\u201d is not a defect, it is the objective working",
      body: [
        { t: "p", text: "An instruction-shaped string is just text, and the model continues it the way that text is usually continued in the corpus. If questions on the internet appear in lists, a question is continued with another question. If they appear in FAQs, it is continued with an answer." },
        { t: "p", text: "That makes the behaviour a property of the *corpus*, not of the model\u2019s capability \u2014 which is the reason post-training works at all. You are not teaching it new facts, you are changing which continuation it considers likely." },
        { t: "p", text: "It is also why the reference\u2019s prediction is testable rather than rhetorical. Whether a base model answers a question depends on an empirical fact about training data, so you can just ask one." }
      ] },

    { t: "h2", n: "02", id: "measured", text: "What a base model actually does",
      sub: "gpt2, no SFT, no alignment, greedy decoding" },

    { t: "code", lang: "python", title: "g71.py \u00a7A \u2014 four instructions to a pure base model", code: `tok = AutoTokenizer.from_pretrained("gpt2")
model = AutoModelForCausalLM.from_pretrained("gpt2")   # pretrained ONLY

out = model.generate(**ids, max_new_tokens=40, do_sample=False,
                     pad_token_id=tok.eos_token_id)`,
      out: `  PROMPT      : What is the capital of France?
  CONTINUATION: The capital of France is Paris.
                The capital of France is Paris.
                The capital of France is Paris.
                The capital of France is Paris.

  PROMPT      : Explain photosynthesis in one sentence.
  CONTINUATION: The first sentence is a simple one:
                The first sentence is a simple one:

  PROMPT      : List three prime numbers.
  CONTINUATION: The third prime number

  PROMPT      : Write a polite email declining a meeting.
  CONTINUATION: "I'm not going to be able to do that," he said. "I'm not
                going to be able to do that. I'm not going to be able to...`,
      hl: [5, 6],
      caption: "Three of four fail to follow the instruction. The fourth answers correctly \u2014 and it is the worked example." },

    { t: "callout", kind: "trap", title: "The illustration is the one case that works",
      body: [
        { t: "p", text: "The reference predicts that \u201cWhat is the capital of France?\u201d continues as *\u201cWhat is the capital of Germany? What is the capital of Spain?\u201d* because questions come in lists. gpt2 did not do that. It produced **\u201cThe capital of France is Paris.\u201d** \u2014 correct, well-formed, and exactly what an aligned model would say." },
        { t: "p", text: "The reason is that this particular question is close to a cliché. \u201cThe capital of France is Paris\u201d is an extremely common sentence on the internet, so the helpful continuation and the likely continuation coincide. The example was chosen for clarity and happens to be the case where the distinction collapses." },
        { t: "p", text: "The other three prompts show the real thing. \u201cExplain photosynthesis in one sentence\u201d became a *comment about sentences*; \u201cList three prime numbers\u201d became \u201cThe third prime number\u201d; the email request became third-person fiction with dialogue. Each treats the instruction as a sentence to continue rather than a task to perform \u2014 which is the claim, stated properly." }
      ] },

    { t: "callout", kind: "insight", title: "And the actual pathology is repetition, not question-listing",
      body: [
        { t: "p", text: "Two of the four continuations loop verbatim \u2014 the same sentence four times, the same clause three times. That is the characteristic failure of a base model under greedy decoding, and it is a *decoding* interaction rather than an alignment one." },
        { t: "p", text: "3.3 covered why: greedy decoding always takes the argmax, so once the model enters a high-probability cycle there is nothing to break it. Temperature and top-p exist partly to avoid this, and an aligned model additionally learns to emit an end-of-sequence token, which a base model has little reason to do." },
        { t: "p", text: "Worth separating the two effects when you read a base model\u2019s output, because they look alike and have different fixes. \u201cDoes not follow the instruction\u201d is what SFT fixes. \u201cRepeats itself forever\u201d is substantially a sampling setting." }
      ] },

    { t: "h3", text: "The quantitative version, which is unambiguous" },

    { t: "code", lang: "python", title: "g71.py \u00a7B \u2014 the immediate next-token distribution", code: `ids = tok("What is the capital of France?", return_tensors="pt")
logits = model(**ids).logits[0, -1]
probs = torch.softmax(logits, dim=-1)`,
      out: `  next token    probability
  ' Paris'          0.5410%
  ' The'            5.2499%
  ' It'             4.0742%
  ' What'           2.6544%
  '\n'             33.8421%

  actual top-8 next tokens:
    '\n'           33.8421%
    ' The'          5.2499%
    ' It'           4.0742%
    ' France'       2.6955%
    ' What'         2.6544%
    ' And'          1.8556%
    ' How'          1.4647%
    ' Is'           1.3591%`,
      hl: [3, 7, 8],
      caption: "A newline is 63\u00d7 more likely than the correct answer, and \u2018 What\u2019 is 5\u00d7 more likely." },

    { t: "callout", kind: "good", title: "This reconciles the two results",
      body: [
        { t: "p", text: "The model does not answer *immediately* \u2014 \u201c Paris\u201d has 0.54% of the mass while a newline has 33.84%. It formats first. Then, after the line break, \u201cThe capital of France is Paris.\u201d becomes the likely continuation, which is why greedy decoding eventually produced a correct answer." },
        { t: "p", text: "So the base model\u2019s problem is not that it lacks the answer or that it wants to ask questions. It is that it has no notion of *turn structure* \u2014 nothing tells it that a question ends and a response begins. A newline is the most likely token because on the internet a question mark is usually followed by whitespace." },
        { t: "p", text: "That is precisely what a chat template installs, and 7.3 is about it. The template is not cosmetic: it supplies the structural signal that the pretraining corpus never provided." }
      ] },

    { t: "h3", text: "The knowledge was there the whole time" },

    { t: "code", lang: "python", title: "g71.py \u00a7C \u2014 scoring four candidate statements", code: `def score(text):
    ids = tok(text, return_tensors="pt")
    out = model(**ids, labels=ids["input_ids"])
    return -out.loss.item()          # average log-probability per token`,
      out: `  statement                                     avg logprob
  The capital of France is Paris.                   -3.7983
  The capital of France is Berlin.                  -4.2905
  The capital of France is Madrid.                  -4.3150
  The capital of France is London.                  -4.2541`,
      hl: [4],
      caption: "Paris ranks first. The knowledge is present; the behaviour is not." },

    { t: "callout", kind: "tradeoff", title: "First, but not by much \u2014 and that matters",
      body: [
        { t: "p", text: "Paris wins at \u22123.7983 against London at \u22124.2541 \u2014 a margin of **0.046 nats per token**, on a 124-million-parameter model. It is the right ordering and it is a thin one, so I would not describe gpt2 as confidently knowing this." },
        { t: "p", text: "The distinction the measurement supports is the one the lesson needs: **knowledge and behaviour are separate**. A model can rank the true statement highest and still not produce it when asked, because ranking statements and continuing a question are different operations." },
        { t: "p", text: "Which is why SFT is correctly described as imitation rather than teaching. It is not adding the fact about Paris \u2014 that was already there, however faintly. It is making \u201cquestion, then answer\u201d a likely shape." }
      ] },

    { t: "h2", n: "03", id: "two-moves", text: "The two moves of post-training",
      sub: "Imitation, then preference" },

    { t: "code", lang: "text", title: "the framing", code: `SFT       "Here is what a good answer looks like."    <- imitation   (cheap, gets you 80%)
ALIGNMENT "Here is which of two answers is better."    <- preference  (expensive, last 20%)`,
      caption: "Two different kinds of supervision, and the second exists because of an asymmetry in what humans can produce." },

    { t: "callout", kind: "insight", title: "The reason for stage two is an economic asymmetry, not a technical one",
      body: [
        { t: "p", text: "It is far easier for a person to rank two answers than to write the perfect one. You cannot hire people to hand-write a million ideal responses; you *can* have them click \u201cA is better\u201d a million times." },
        { t: "p", text: "So alignment is machinery for converting cheap comparisons into weights. That framing explains the entire module: every method in 7.4 through 7.8 is a different route from pairwise clicks to a gradient, and they differ in how much apparatus sits in between." },
        { t: "p", text: "It also explains why the field moved the way it did. If the input is comparisons, the question is how little machinery you need to consume them \u2014 and the answer went from \u201ca reward model plus four models in memory\u201d to \u201cone loss on the pairs directly\u201d." }
      ] },

    { t: "callout", kind: "note", title: "There is a second asymmetry worth noticing",
      body: [
        { t: "p", text: "Ranking is not just cheaper, it is also *better defined*. Asked to write the ideal response to a nuanced prompt, two expert annotators produce two different texts, and neither is wrong. Asked which of two given responses is better, they often agree." },
        { t: "p", text: "That matters because SFT trains on exactly one target per prompt and treats every other phrasing as incorrect. With a single demonstration you are teaching the model one annotator\u2019s style along with the content." },
        { t: "p", text: "Preference data sidesteps that: it never claims a response is ideal, only that one beats another. 7.6 shows the DPO loss is literally a statement about a *difference*, with no notion of an absolute target \u2014 and that is why." }
      ] },

    { t: "viz", title: "The pipeline, and the three paths through it", caption: "One pretraining objective, then imitation, then one of three routes from comparisons to weights.",
      svg: `<svg viewBox="0 0 760 330" width="100%" role="img" aria-label="Pretraining to SFT to three alignment paths">
  <rect x="200" y="14" width="360" height="40" rx="5" class="s-fill-bg" style="stroke:var(--line)" stroke-width="1.4"/>
  <text x="380" y="32" text-anchor="middle" class="s-label">RAW TEXT \u2014 trillions of tokens</text>
  <text x="380" y="47" text-anchor="middle" class="s-sub" style="font-size:9px">next-token prediction, no labels, no humans</text>

  <line x1="380" y1="54" x2="380" y2="78" stroke="var(--line)" stroke-width="1.4"/>
  <rect x="200" y="78" width="360" height="42" rx="5" class="s-fill-bg" style="stroke:var(--accent)" stroke-width="1.6"/>
  <text x="380" y="96" text-anchor="middle" class="s-mono" style="font-size:11px;fill:var(--accent)">BASE MODEL</text>
  <text x="380" y="112" text-anchor="middle" class="s-sub" style="font-size:9px">measured: P(' Paris') = 0.54%, P(newline) = 33.84%</text>

  <line x1="380" y1="120" x2="380" y2="144" stroke="var(--line)" stroke-width="1.4"/>
  <text x="392" y="137" class="s-sub" style="font-size:9px">SFT \u2014 imitation, cheap, ~80%</text>
  <rect x="200" y="144" width="360" height="42" rx="5" class="s-fill-bg" style="stroke:var(--accent)" stroke-width="1.6"/>
  <text x="380" y="162" text-anchor="middle" class="s-mono" style="font-size:11px;fill:var(--accent)">SFT MODEL</text>
  <text x="380" y="178" text-anchor="middle" class="s-sub" style="font-size:9px">follows instructions, mediocre judgement</text>

  <line x1="380" y1="186" x2="380" y2="206" stroke="var(--line)" stroke-width="1.4"/>
  <text x="392" y="202" class="s-sub" style="font-size:9px">ALIGNMENT \u2014 preference, expensive, last ~20%</text>

  <rect x="20" y="212" width="222" height="46" rx="5" class="s-fill-bg" style="stroke:var(--warn)" stroke-width="1.4"/>
  <text x="131" y="230" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--warn)">A \u00b7 RM + PPO</text>
  <text x="131" y="246" text-anchor="middle" class="s-sub" style="font-size:9px">classic RLHF \u00b7 4 models in memory</text>

  <rect x="269" y="212" width="222" height="46" rx="5" class="s-fill-bg" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="380" y="230" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--good)">B \u00b7 DPO</text>
  <text x="380" y="246" text-anchor="middle" class="s-sub" style="font-size:9px">no RM, no RL loop \u00b7 the default</text>

  <rect x="518" y="212" width="222" height="46" rx="5" class="s-fill-bg" style="stroke:var(--violet)" stroke-width="1.4"/>
  <text x="629" y="230" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--violet)">C \u00b7 GRPO + RLVR</text>
  <text x="629" y="246" text-anchor="middle" class="s-sub" style="font-size:9px">reasoning models \u00b7 no critic</text>

  <line x1="131" y1="258" x2="380" y2="284" stroke="var(--line)" stroke-width="1"/>
  <line x1="380" y1="258" x2="380" y2="284" stroke="var(--line)" stroke-width="1"/>
  <line x1="629" y1="258" x2="380" y2="284" stroke="var(--line)" stroke-width="1"/>
  <rect x="230" y="284" width="300" height="34" rx="5" class="s-fill-bg" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="380" y="305" text-anchor="middle" class="s-mono" style="font-size:11px;fill:var(--good)">ALIGNED MODEL</text>
</svg>` },

    { t: "table",
      head: ["Path", "Year", "What it needs", "What it removes", "Lesson"],
      rows: [
        ["RM + PPO", "2022", "Preference data, a reward model, an RL loop", "\u2014 the baseline everything else simplifies", "7.4, 7.5"],
        ["DPO", "2023", "Preference pairs and one loss", "The reward model **and** the RL loop", "7.6"],
        ["ORPO / KTO / SimPO / IPO", "2024", "Varies \u2014 some need no pairs at all", "The reference model, or the pairing, or the SFT stage", "7.7"],
        ["GRPO + RLVR", "2025", "A verifier and a group of samples", "The critic network, and the learned reward entirely", "7.8, 7.9"]
      ] },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Pretraining buys knowledge and no behaviour. The measurement that fixes this in the mind: the model ranks \u201cParis\u201d above \u201cLondon\u201d as a statement, and gives \u201c Paris\u201d 0.54% as a next token against 33.84% for a newline. Both facts are about the same weights." },
        { t: "p", text: "Post-training supplies the behaviour in two moves \u2014 imitation, then preference \u2014 and the second exists because ranking two answers is both cheaper and better defined than writing one. Every method in this module is a different amount of machinery between a click and a gradient." }
      ] },

    { t: "exercise", kind: "analysis", title: "Measure the knowledge-behaviour gap yourself", difficulty: "foundation", minutes: 25,
      body: "Take any base model you can run — gpt2 is enough — and establish, for a handful of factual questions, both that it ranks the correct statement above incorrect ones and that it does not produce that statement when asked. Report the immediate next-token distribution for each question and say what the top token tells you.",
      requirements: [
        "Use a genuine base model, not an instruction-tuned one",
        "For each question, score at least three candidate statements by average log-probability",
        "Report the top-5 immediate next tokens after the question mark",
        "Generate greedily and note any repetition separately from any instruction-following failure",
        "State which of the two failures SFT would fix"
      ],
      hint: "Look at the top next token before concluding anything. If it is whitespace or a newline, the model is formatting rather than refusing — which is a different problem than it appears.",
      solution: { lang: "python", title: "the gap, both halves", code: `tok   = AutoTokenizer.from_pretrained("gpt2")
model = AutoModelForCausalLM.from_pretrained("gpt2").eval()

def next_tokens(prompt, n=5):
    ids = tok(prompt, return_tensors="pt")
    with torch.no_grad():
        probs = torch.softmax(model(**ids).logits[0, -1], dim=-1)
    top = torch.topk(probs, n)
    return [(repr(tok.decode([i])), 100 * v)
            for v, i in zip(top.values.tolist(), top.indices.tolist())]

def score(text):
    ids = tok(text, return_tensors="pt")
    with torch.no_grad():
        return -model(**ids, labels=ids["input_ids"]).loss.item()

Q = "What is the capital of France?"
for t, p in next_tokens(Q):
    print("%-12s %7.4f%%" % (t, p))
for s in ("The capital of France is Paris.",
          "The capital of France is London.",
          "The capital of France is Berlin."):
    print("%-36s %8.4f" % (s, score(s)))`,
        out: `  '\n'           33.8421%
  ' The'          5.2499%
  ' It'           4.0742%
  ' France'       2.6955%
  ' What'         2.6544%

  The capital of France is Paris.        -3.7983
  The capital of France is London.       -4.2541
  The capital of France is Berlin.       -4.2905`,
        notes: [
          { t: "p", text: "**The two halves disagree, which is the point.** As a statement, Paris ranks first. As an immediate continuation of the question, \u2018 Paris\u2019 has 0.54% of the mass and does not appear in the top five at all. Same weights, same fact, two different operations." },
          { t: "p", text: "**The top token is a newline, and that is the diagnosis.** The model is not refusing and not asking another question \u2014 it is formatting, because on the internet a question mark is usually followed by whitespace. It has no notion that a turn ended and a response should begin, which is exactly what a chat template installs." },
          { t: "p", text: "**Note the margin before overclaiming.** Paris beats London by 0.046 nats per token on a 124M model. The ordering is right and it is thin, so \u201cthe model knows the answer\u201d should be stated as \u201cthe model ranks it first\u201d." },
          { t: "p", text: "**Separate repetition from instruction-following.** Greedy decoding made gpt2 emit \u201cThe capital of France is Paris.\u201d four times. The looping is a sampling artefact that temperature or top-p addresses; the failure to treat the prompt as a task is what SFT addresses. They look alike in the output and have different fixes." },
          { t: "p", text: "One caveat on choosing questions: pick some that are *not* clichés. \u201cThe capital of France is Paris\u201d is such a common sentence that the likely continuation and the helpful one coincide, which is why that prompt understates the gap \u2014 and why the reference\u2019s own example turned out to be the case that works." }
        ] } },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cWhy do we need alignment at all? Why not just do more supervised fine-tuning?\u201d**" },
        { t: "p", text: "Because of what humans can produce, not because of what the model can learn. SFT needs a written ideal response per prompt, and you cannot hire people to hand-write a million of those. You can have them click \u201cA is better\u201d a million times \u2014 so alignment is the machinery for turning cheap comparisons into weights." },
        { t: "p", text: "There is a second reason I think matters more and gets mentioned less: ranking is better *defined* than authoring. Ask two experts to write the ideal answer to a nuanced prompt and you get two different texts, neither wrong. Ask which of two answers is better and they often agree. SFT trains on exactly one target and treats every other phrasing as incorrect, so you are teaching one annotator's style along with the content." },
        { t: "p", text: "That is why the DPO loss is a statement about a difference rather than about an absolute target \u2014 it never claims a response is ideal, only that one beats another." },
        { t: "p", text: "On what SFT does accomplish, I would be concrete about the base-model starting point. I measured gpt2 on \u201cWhat is the capital of France?\u201d: it ranks \u201cParis\u201d above \u201cLondon\u201d and \u201cBerlin\u201d as a statement, so the knowledge is there \u2014 but the immediate next-token probability of \u2018 Paris\u2019 is 0.54% against 33.84% for a newline. It is not refusing; it has no concept of a turn ending. So SFT is installing structure and behaviour, not facts, which is why it is imitation rather than teaching." },
        { t: "p", text: "And I would flag one thing people get wrong when they first look at base-model output. Greedy decoding made it repeat the same sentence four times, and that is a sampling artefact rather than an alignment failure \u2014 different fix. The real instruction-following failures looked different: \u201cExplain photosynthesis in one sentence\u201d became a comment about sentences, and \u201cList three prime numbers\u201d became \u201cThe third prime number\u201d." }
      ] }
  ],

  takeaways: [
    "**Pretraining optimises one thing** \u2014 cross-entropy on the next token \u2014 and nothing in that objective mentions a question, an instruction or a user.",
    "**So ignoring instructions is the objective working**, and whether a base model answers a question is an empirical fact about the corpus rather than about capability.",
    "**Measured, three of four instructions failed on gpt2**: \u201cexplain in one sentence\u201d became a comment about sentences, \u201clist three primes\u201d became \u201cThe third prime number\u201d.",
    "**The worked example is the exception** \u2014 gpt2 answered the France question correctly, because that sentence is common enough that the likely and helpful continuations coincide.",
    "**The quantitative version is unambiguous**: P(\u2018 Paris\u2019) as the immediate next token is 0.54% against 33.84% for a newline, a 63\u00d7 gap.",
    "**A newline on top means formatting, not refusal** \u2014 the model has no notion that a turn ended, which is exactly what a chat template supplies.",
    "**Knowledge and behaviour are separate**: the same weights rank \u201cParis\u201d first as a statement while not producing it as a continuation \u2014 though by only 0.046 nats, so say \u201cranks first\u201d rather than \u201cknows\u201d.",
    "**Repetition is a decoding artefact, not an alignment failure** \u2014 greedy decoding loops because argmax cannot escape a high-probability cycle, and the two failures need different fixes.",
    "**Alignment exists because ranking is cheaper than authoring**, and you cannot pay people to write a million ideal answers but you can pay them to make a million comparisons.",
    "**Ranking is also better defined than authoring**, since two experts write two different ideal answers but often agree on which of two is better \u2014 and SFT treats every alternative phrasing as wrong.",
    "**Three paths from comparisons to weights**: RM+PPO (2022), DPO (2023), GRPO+RLVR (2025), each defined by what apparatus it removes."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Asked \u201cWhat is the capital of France?\u201d, gpt2 gives \u2018 Paris\u2019 0.54% of the next-token mass and a newline 33.84%. What does the top token indicate?",
        options: [
          "The model does not know the answer and is avoiding the question",
          "The model is formatting rather than refusing \u2014 it has no notion that a turn ended and a response should begin, which is what a chat template supplies",
          "The tokeniser splits \u2018Paris\u2019 across multiple tokens, suppressing its probability",
          "Greedy decoding would produce an empty response"
        ],
        answer: 1,
        why: "On the internet a question mark is usually followed by whitespace, so a newline is the most likely continuation and the model takes it. It is not refusing: scored as statements, the same weights rank \"The capital of France is Paris\" above the Berlin, Madrid and London variants, and greedy decoding did eventually produce the correct sentence after the line break. The missing ingredient is turn structure, which pretraining never provided and a chat template installs." },

      { stem: "A base model under greedy decoding emits \u201cThe capital of France is Paris.\u201d four times in a row. How should this be diagnosed?",
        options: [
          "As an alignment failure that SFT on instruction data will fix",
          "As a decoding artefact \u2014 argmax cannot escape a high-probability cycle \u2014 which is a different problem from failing to follow an instruction",
          "As evidence the model has memorised the sentence verbatim from training data",
          "As a tokeniser bug producing duplicate sequences"
        ],
        answer: 1,
        why: "Greedy decoding always takes the most likely token, so once the model enters a loop nothing breaks it; temperature and top-p exist partly to avoid this. The instruction-following failures look different \u2014 \"Explain photosynthesis in one sentence\" becoming a comment about sentences, or \"List three prime numbers\" becoming \"The third prime number\" \u2014 and those are what SFT addresses. Conflating the two leads to fixing a sampling setting with training data, or vice versa." },

      { stem: "Why does alignment use preference data rather than simply more SFT demonstrations?",
        options: [
          "Because preference data is more informative per example than a demonstration",
          "Because ranking two answers is both cheaper and better defined than authoring one \u2014 you cannot pay people to write a million ideal responses, and two experts asked to write one produce two different texts",
          "Because SFT cannot be applied after a model has already been fine-tuned once",
          "Because preference data avoids the catastrophic forgetting that SFT causes"
        ],
        answer: 1,
        why: "The constraint is on what humans can produce, not on what the model can learn. Comparisons scale in a way authored ideals do not, and they are also better defined: experts often agree on which of two given answers is better while disagreeing on what the best answer would be. SFT trains on exactly one target per prompt and treats every other phrasing as incorrect, so it teaches one annotator's style alongside the content \u2014 which is why the DPO loss is a statement about a difference rather than an absolute target." },

      { stem: "The same gpt2 weights rank \u201cThe capital of France is Paris\u201d above the London variant by 0.046 nats per token. How should that be described?",
        options: [
          "The model confidently knows the capital of France",
          "The model ranks the correct statement first, and the margin is thin \u2014 so \u201cranks first\u201d is the supportable claim rather than \u201cknows\u201d",
          "The margin is within noise, so the model shows no preference",
          "Log-probability is the wrong metric for factual knowledge and the comparison is meaningless"
        ],
        answer: 1,
        why: "The ordering is correct and consistent across all three distractors, so there is a real preference \u2014 but 0.046 nats per token on a 124M-parameter model is a small margin and does not support a word like \"confidently\". Stating it precisely matters because the lesson's actual claim is about the separation between knowledge and behaviour, which only needs the ordering: the model ranks the true statement highest while not producing it when asked." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "The framing questions that set up the whole module",
    questions: [
      { level: "foundation",
        q: "What is the difference between a base model and an instruction-tuned model?",
        strong: "A strong answer locates the difference in behaviour rather than knowledge.",
        answer: [
          { t: "p", text: "A base model is trained on one objective \u2014 predict the next token \u2014 so it continues text the way the corpus continues text. An instruction-tuned model has additionally been trained on instruction-and-answer pairs, so \u201cquestion, then answer\u201d is a shape it considers likely." },
          { t: "p", text: "The difference is behavioural rather than factual, and that is measurable. I ran gpt2, a genuine base model: scored as statements it ranks \u201cThe capital of France is Paris\u201d above the Berlin, Madrid and London variants, so the fact is present. But the immediate next-token probability of \u2018 Paris\u2019 after the question is 0.54%, against 33.84% for a newline." }
          ,{ t: "p", text: "That newline is the interesting part. It is not refusing and not deflecting \u2014 it is formatting, because a question mark on the internet is usually followed by whitespace. It has no representation of a turn ending, which is what a chat template provides and why templates are structural rather than cosmetic." },
          { t: "p", text: "On three of my four test prompts the failure was obvious \u2014 \u201cExplain photosynthesis in one sentence\u201d became a comment about sentences. On the France question it actually answered correctly, because that sentence is common enough that the likely continuation and the helpful one coincide. Worth knowing, because it is the example most explanations use." }
        ] },

      { level: "core",
        q: "Walk me through the post-training pipeline.",
        strong: "A strong answer names the three paths and what each removes.",
        answer: [
          { t: "p", text: "Two moves after pretraining. SFT first \u2014 imitation on instruction-and-answer pairs, which is cheap and gets most of the way, installing format and behaviour rather than knowledge. Then alignment, which is preference-based and buys the last part." },
          { t: "p", text: "Alignment has three historical paths and the useful way to hold them is by what each deletes. Classic RLHF trains a reward model on preference pairs and optimises against it with PPO, which needs four models in memory. DPO deletes both the reward model and the RL loop, training directly on the pairs with one loss \u2014 that is the default for most teams." },
          { t: "p", text: "Then GRPO deletes the critic network, taking its baseline from a group of sampled answers instead, and RLVR replaces the learned reward with a program \u2014 a unit test or a maths checker \u2014 which cannot be hacked the same way. That combination is what reasoning models are trained with." },
          { t: "p", text: "The DPO family in between \u2014 ORPO, KTO, SimPO, IPO \u2014 follows the same logic, each removing something: the reference model, the requirement for paired data, or the separate SFT stage." }
        ] },

      { level: "core",
        q: "If the base model already contains the knowledge, what is fine-tuning actually changing?",
        strong: "A strong answer separates the distribution over continuations from the content.",
        answer: [
          { t: "p", text: "Which continuations are likely, not what is true. The weights that rank \u201cParis\u201d above \u201cLondon\u201d as a statement are the same weights that give \u2018 Paris\u2019 0.54% after a question mark \u2014 so the fact is not what changes. What changes is that a question becomes a thing to answer rather than a sentence to continue." },
          { t: "p", text: "That is why SFT is described as imitation. You are showing it the shape of the exchange, and the knowledge it needs was already there from pretraining. It also explains why SFT data quality dominates quantity: you are teaching a format, and a thousand clean examples of the format beat a hundred thousand noisy ones." },
          { t: "p", text: "It is also why fine-tuning is the wrong tool for adding knowledge, which is the RAG-versus-fine-tuning decision from earlier in the course. If the fact is not in the weights, changing the distribution over continuations will not put it there \u2014 it will just make the model confidently fluent about it." },
          { t: "p", text: "One honest qualification on the measurement: gpt2 ranks Paris first by only 0.046 nats per token, so I would say it ranks the true statement highest rather than that it knows. The separation between knowledge and behaviour only needs the ordering, which is robust across all three distractors." }
        ] }
    ]
  }
});
