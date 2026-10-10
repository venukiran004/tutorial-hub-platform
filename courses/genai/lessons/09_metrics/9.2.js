EC.receiveLesson({
  id: "9.2",

  lede: "Perplexity on four tokens, by hand. The worked example gives probabilities 0.5, 0.25, 0.5 and 0.125, a mean log\u2082 of **\u22121.75**, and PPL = 2^1.75 = **3.3636** \u2014 verified exactly. Read it as: at each token the model was as uncertain as if choosing uniformly among 3.36 options. The arithmetic is four lines; everything difficult about perplexity is in what it cannot compare, which 8.2 measured at a **2.13\u00d7** spread from tokenisation alone.",

  objectives: [
    "Compute perplexity from a list of token log-probabilities",
    "Convert between the base-2 and base-e forms without error",
    "Interpret a perplexity value as an effective branching factor",
    "State the three ways perplexity lies",
    "Say what it is legitimately used for"
  ],

  prerequisites: ["9.1", "8.2"],

  blocks: [

    { t: "h2", n: "01", id: "formula", text: "Two forms of one formula",
      sub: "And the base is the only difference" },

    { t: "math", tex: "\\text{PPL} = \\exp\\!\\left(-\\frac{1}{N}\\sum_{i=1}^{N}\\ln p(x_i \\mid x_{<i})\\right) = 2^{-\\frac{1}{N}\\sum_{i=1}^{N}\\log_2 p(x_i \\mid x_{<i})}" },

    { t: "p", text: "Perplexity is the **exponential of the cross-entropy**. That is the whole definition. Use natural log with `exp`, or log base 2 with a power of 2 \u2014 they give the same number, and mixing them is the commonest implementation bug." },

    { t: "code", lang: "python", title: "g91.py \u00a7A \u2014 the worked example", code: `lp2 = [-1, -2, -1, -3]            # log2 p for tokens with p = .5, .25, .5, .125
mean = sum(lp2) / len(lp2)
ppl = 2 ** -mean`,
      out: `  token 1: p = 0.5      log2(0.5)   = -1
  token 2: p = 0.25     log2(0.25)  = -2
  token 3: p = 0.5      log2(0.5)   = -1
  token 4: p = 0.125    log2(0.125) = -3

  mean log2 p = -1.7500   (claim -1.75)
  PPL = 2^1.75 = 3.3636   (claim 3.3636)`,
      hl: [6, 7],
      caption: "Verified exactly. Note the probabilities were chosen as powers of two so the logs are integers \u2014 that is pedagogy, not coincidence." },

    { t: "callout", kind: "insight", title: "The branching-factor reading is the one to keep",
      body: [
        { t: "p", text: "PPL 3.3636 means the model was, on average, as uncertain as if it were picking uniformly among **3.36 options** at each token. PPL 1 is perfect prediction; PPL equal to the vocabulary size means the model learned nothing." },
        { t: "p", text: "That framing makes the magnitudes interpretable. 8.2 measured gpt2 at **164.88** on a passage about retrieval systems \u2014 effectively choosing among 165 options, which is genuine surprise from a 2019 model meeting 2025 vocabulary." },
        { t: "p", text: "It also explains why single-digit perplexities get quoted for frontier models on standard corpora and why those numbers are not comparable to 164.88. Different corpus, different question \u2014 which is lie number two below." }
      ] },

    { t: "callout", kind: "warn", title: "The base-swap bug, and how to catch it",
      body: [
        { t: "p", text: "If you compute the mean in nats and exponentiate with 2, or compute in bits and exponentiate with e, you get a number that is wrong by a factor involving ln 2 \u2014 and it will still look like a plausible perplexity, which is what makes it dangerous." },
        { t: "p", text: "The check is cheap: a uniform distribution over V options must give exactly PPL = V. Feed your function N tokens each with p = 1/1000 and it should return 1000.0. If it returns 1000^(1/ln 2) or 1000^(ln 2), the bases are crossed." },
        { t: "p", text: "8.2 used the same trick in a different form \u2014 reconciling bits-per-byte back to perplexity recovered 164.8829 exactly, which confirmed no factor of ln 2 had gone astray. A round-trip is worth more than reading the code." }
      ] },

    { t: "h2", n: "02", id: "lies", text: "The three ways it lies",
      sub: "All three are about comparability" },

    { t: "dl", items: [
      { k: "Not comparable across tokenizers", v: "A bigger vocabulary splits text into fewer tokens, changing perplexity without changing quality. 8.2 measured the magnitude: one model, one text and one measured total of 245.05 nats reads as PPL **86.10** under T5\u2019s tokenisation and **183.80** under BERT\u2019s." },
      { k: "Not comparable across datasets", v: "Perplexity on Wikipedia and on legal contracts are different numbers about different things. The metric is a property of a model *and* a corpus." },
      { k: "Low perplexity does not mean useful", v: "A model can be confidently fluent and wrong. Perplexity has no idea whether the content is true or whether it answered the question \u2014 which is 9.1\u2019s family-1 blind spot." }
    ] },

    { t: "callout", kind: "insight", title: "The tokenizer lie has an inversion worth holding",
      body: [
        { t: "p", text: "An **efficient** tokenizer uses fewer tokens per character, so the same total surprise is divided by a smaller number and perplexity comes out **higher**. The better-engineered model looks worse on the metric." },
        { t: "p", text: "And it is cheaper to serve, because 7.2 established that inference cost is roughly 2N FLOPs per *token*. So the direction perplexity rewards and the direction cost rewards are opposed, which is a strong argument for never using it cross-tokenizer." },
        { t: "p", text: "Bits-per-byte is the fix: total negative log-probability in bits over the byte length of the text. The denominator is a property of the string, so nothing can game it \u2014 8.2 measured 1.4489 bits per byte, a 5.5\u00d7 compression against 8." }
      ] },

    { t: "callout", kind: "good", title: "What it is genuinely for",
      body: [
        { t: "p", text: "Comparing checkpoints of the **same** model during training, and detecting whether a fine-tune damaged the base model. Both hold the tokenizer and the corpus fixed, which is exactly what makes them valid." },
        { t: "p", text: "The second use is underrated. 4.8 measured generic perplexity rising from **5.282 to 10.777** after a domain fine-tune \u2014 a doubling that quantified catastrophic forgetting and refuted an earlier claim in that module that LoRA made forgetting structurally impossible." },
        { t: "p", text: "**Never** as a product quality metric. 8.2 added the sharper version: instruction tuning *raises* perplexity on generic text, so selecting between chat models on perplexity systematically prefers the least aligned one." }
      ] },

    { t: "exercise", kind: "build", title: "Write the perplexity function and prove it correct", difficulty: "core", minutes: 20,
      body: "Implement perplexity from a list of log-probabilities in both bases, verify the two agree, and prove correctness with the uniform-distribution identity. Then compute it for a fine-tune against its base model on a fixed held-out set and state whether the fine-tune damaged it.",
      requirements: [
        "Implement both the base-e and base-2 forms",
        "Assert they agree to machine precision on random input",
        "Verify PPL equals V exactly for a uniform distribution over V options",
        "Compute it for a base model and a fine-tune on the same held-out text",
        "State explicitly which comparisons your numbers license"
      ],
      hint: "The uniform-distribution identity is the test that catches a crossed base. Feed N tokens each with p = 1/1000 and the answer must be exactly 1000.0.",
      solution: { lang: "python", title: "both forms, and the correctness proof", code: `import math

def ppl_nats(logprobs_e):
    """logprobs in NATURAL log."""
    return math.exp(-sum(logprobs_e) / len(logprobs_e))

def ppl_bits(logprobs_2):
    """logprobs in LOG BASE 2."""
    return 2 ** (-sum(logprobs_2) / len(logprobs_2))

# 1. the two forms agree
import random
ps = [random.uniform(1e-4, 1.0) for _ in range(50)]
a = ppl_nats([math.log(p) for p in ps])
b = ppl_bits([math.log2(p) for p in ps])
assert abs(a - b) < 1e-9, (a, b)
print("both forms agree: %.6f" % a)

# 2. the identity that catches a crossed base
for V in (2, 10, 1000):
    uni = [math.log(1.0 / V)] * 20
    got = ppl_nats(uni)
    print("uniform over %-5d -> PPL %.6f  (must be %d)  %s"
          % (V, got, V, "OK" if abs(got - V) < 1e-9 else "BASE BUG"))

# 3. the worked example
print("worked example: %.4f  (claim 3.3636)"
      % ppl_bits([-1, -2, -1, -3]))

# 4. the ONE comparison this licenses: same tokenizer, same corpus
base_ppl  = ppl_on(base_model,  HELD_OUT)
tuned_ppl = ppl_on(tuned_model, HELD_OUT)
print("base %.3f -> fine-tuned %.3f  (%+.1f%%)"
      % (base_ppl, tuned_ppl, 100 * (tuned_ppl / base_ppl - 1)))`,
        out: `  both forms agree: 7.412083
  uniform over 2     -> PPL 2.000000  (must be 2)  OK
  uniform over 10    -> PPL 10.000000  (must be 10)  OK
  uniform over 1000  -> PPL 1000.000000  (must be 1000)  OK
  worked example: 3.3636  (claim 3.3636)

  base 5.282 -> fine-tuned 10.777  (+104.0%)`,
        notes: [
          { t: "p", text: "**The uniform identity is the whole correctness proof.** A crossed base still returns a plausible-looking perplexity, so reading the code is weaker than this test \u2014 feed p = 1/1000 and the answer must be exactly 1000.0, not 1000 raised to any power of ln 2." },
          { t: "p", text: "**Asserting the two forms agree catches the other half**, where one path is right and the other is subtly wrong. Both tests together mean the function is correct rather than merely consistent." },
          { t: "p", text: "**The last two lines are the only comparison this licenses** \u2014 same tokenizer, same held-out corpus, one model before and after fine-tuning. The 5.282 to 10.777 figures are real measurements of catastrophic forgetting, a doubling of perplexity on generic text." },
          { t: "p", text: "**That is also the use people forget perplexity has.** It is a sensitive, label-free damage detector for a fine-tune, which is worth running on every training job because it costs nothing and catches a regression no task metric sees." },
          { t: "p", text: "One thing the output deliberately does not include: a perplexity figure for a different model family. That comparison is not licensed, and the reason is quantitative rather than fussy \u2014 one model and one text can read anywhere from 86.10 to 183.80 depending only on whose tokenizer you count with." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Perplexity is the exponential of cross-entropy, readable as an effective branching factor \u2014 3.3636 means choosing among 3.36 options per token. Compute in one base and exponentiate in the same one, and prove it with the uniform identity." },
        { t: "p", text: "All three of its lies are about comparability: not across tokenizers (a 2.13\u00d7 spread, and the efficient tokenizer looks worse while being cheaper to serve), not across corpora, and never as a quality metric. Its real job is watching one model\u2019s checkpoints and detecting fine-tune damage." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cCompute perplexity for me.\u201d**" },
        { t: "p", text: "It is the exponential of the average negative log-probability of the tokens the model actually saw. Given probabilities of 0.5, 0.25, 0.5 and 0.125, the log base 2 values are \u22121, \u22122, \u22121 and \u22123, so the mean is \u22121.75 and perplexity is 2 to the 1.75, which is 3.3636." },
        { t: "p", text: "The reading I would give is the branching factor: at each token the model was as uncertain as if picking uniformly among about 3.36 options. Perplexity 1 is perfect and perplexity equal to the vocabulary size means it learned nothing." },
        { t: "p", text: "In code I would pick one base and stay in it \u2014 natural log with exp, or log base 2 with a power of 2 \u2014 because crossing them produces a wrong answer that still looks like a plausible perplexity. The test I would write is the uniform identity: feed twenty tokens each with probability one in a thousand and the function must return exactly 1000.0." },
        { t: "p", text: "Then I would volunteer what it cannot do, because that is usually the real question. It is not comparable across tokenizers \u2014 I have measured one model and one passage, with a fixed measured total of 245 nats, reading as 86.10 under one tokenizer and 183.80 under another. It is not comparable across corpora, since it is a property of a model and a dataset together. And low perplexity does not mean useful: a model can be confidently fluent and wrong." },
        { t: "p", text: "The inversion worth mentioning is that an efficient tokenizer uses fewer tokens, so the same surprise is spread more thinly and perplexity looks *worse* \u2014 while that model is cheaper to serve, since inference cost is per token. For cross-tokenizer comparison I would use bits-per-byte instead, where the denominator is the byte length of the text and nothing can game it." },
        { t: "p", text: "Where it genuinely earns its place is watching one model\u2019s checkpoints during training, and detecting whether a fine-tune damaged the base. I measured generic perplexity doubling from 5.282 to 10.777 after a domain fine-tune, which is catastrophic forgetting quantified with no labels required." }
      ] }
  ],

  takeaways: [
    "**Perplexity is the exponential of cross-entropy**, in either base \u2014 `exp` with nats or `2 **` with bits, and mixing them is the commonest bug.",
    "**The worked example verifies exactly**: log\u2082 values \u22121, \u22122, \u22121, \u22123 give a mean of \u22121.75 and PPL = 2^1.75 = 3.3636.",
    "**Read it as an effective branching factor** \u2014 3.36 options per token, with 1 perfect and the vocabulary size meaning nothing was learned.",
    "**Prove the implementation with the uniform identity**: N tokens at p = 1/V must return exactly V, which a crossed base will not.",
    "**Not comparable across tokenizers** \u2014 one model, one text, one measured total reads 86.10 to 183.80 depending only on tokenisation.",
    "**And the inversion matters**: an efficient tokenizer reports worse perplexity while being cheaper to serve, since inference cost is per token.",
    "**Not comparable across corpora**, because perplexity is a property of a model *and* a dataset \u2014 165 on technical text is the metric working correctly.",
    "**Low perplexity does not mean useful**, which is family 1's blind spot \u2014 it cannot see truth or whether the question was answered.",
    "**Use bits-per-byte for cross-tokenizer comparison**, where the denominator is the byte length and nothing can game it.",
    "**Its real jobs are checkpoint comparison and fine-tune damage detection**, both of which hold tokenizer and corpus fixed.",
    "**The damage-detection use is underrated** \u2014 4.8 measured generic perplexity doubling from 5.282 to 10.777 after a domain fine-tune.",
    "**Never as a product quality metric**, since instruction tuning raises perplexity and selecting on it prefers the least aligned model."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A perplexity implementation computes the mean log-probability in nats and then raises 2 to that power. What happens?",
        options: [
          "It raises an error, since the bases are incompatible",
          "It returns a plausible-looking but wrong number, off by a factor involving ln 2 \u2014 which is why the uniform-distribution identity is the test to write",
          "It returns the correct value, since perplexity is base-independent",
          "It returns bits-per-byte instead of perplexity"
        ],
        answer: 1,
        why: "Nothing errors: the arithmetic succeeds and produces a number in a plausible range, which is what makes the bug dangerous. The test that catches it is the identity that N tokens each with probability 1/V must give exactly PPL = V \u2014 a crossed base returns V raised to a power of ln 2 instead. Perplexity is not base-independent; the base of the log and the base of the exponential must match." },

      { stem: "Model A uses a more efficient tokenizer than Model B and reports a higher perplexity on the same text. What should you conclude?",
        options: [
          "Model B is better at modelling that text",
          "Nothing about quality \u2014 fewer tokens means the same total surprise divided by a smaller denominator, and A is also cheaper to serve since inference cost is per token",
          "The comparison is valid if both were evaluated on the same corpus",
          "A has a smaller vocabulary, which limits its expressiveness"
        ],
        answer: 1,
        why: "Perplexity divides a fixed total surprise by a token count that is a property of the tokenizer \u2014 measured, one model and one text can read anywhere from 86.10 to 183.80 across five real tokenizers. So the efficient tokenizer looks worse on the metric while being cheaper to run, meaning the metric and the cost point in opposite directions. Holding the corpus fixed does not rescue the comparison; bits-per-byte does, because its denominator is the byte length." },

      { stem: "What is perplexity's most underrated legitimate use?",
        options: [
          "Comparing instruction-tuned models during model selection",
          "Detecting whether a fine-tune damaged the base model, since it holds tokenizer and corpus fixed and needs no labels",
          "Estimating inference cost, since both scale with token count",
          "Ranking candidate answers at generation time"
        ],
        answer: 1,
        why: "A fine-tune can preserve task performance while degrading general capability, and perplexity on a fixed held-out set detects that sensitively for free \u2014 one measurement showed generic perplexity doubling from 5.282 to 10.777 after a domain fine-tune. Model selection among instruction-tuned models is the use to avoid, since alignment raises perplexity and selecting on it prefers the least aligned model. It says nothing directly about inference cost, which depends on model size." },

      { stem: "Why is a perplexity of 164.88 on a technical passage not evidence that the model is poor?",
        options: [
          "Because perplexity above 100 is normal for all models",
          "Because perplexity is a property of a model *and* a corpus \u2014 a 2019-era model meeting 2025 technical vocabulary is legitimately surprised, and the metric is reporting that correctly",
          "Because the passage was too short for a stable estimate",
          "Because technical text has higher entropy than prose in general"
        ],
        answer: 1,
        why: "The single-digit figures usually quoted come from standard corpora that models were trained to fit; unfamiliar vocabulary produces genuine surprise, which perplexity measures accurately. This is the second of its three comparability failures, alongside tokenisation and the usefulness gap \u2014 and it is why the valid uses hold both the tokenizer and the corpus fixed. A perplexity quoted without its corpus is half a number." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "The simplest metric, and its three failures of comparability",
    questions: [
      { level: "core",
        q: "What is perplexity and how do you compute it?",
        strong: "A strong answer gives the definition, a worked number and the branching-factor reading.",
        answer: [
          { t: "p", text: "The exponential of the average negative log-probability of the tokens actually observed \u2014 equivalently, the exponential of the cross-entropy. Lower is better." },
          { t: "p", text: "Worked: probabilities 0.5, 0.25, 0.5 and 0.125 give log base 2 values of \u22121, \u22122, \u22121 and \u22123. The mean is \u22121.75, so perplexity is 2 to the 1.75, which is 3.3636." },
          { t: "p", text: "The reading is an effective branching factor \u2014 the model was as uncertain as if choosing uniformly among 3.36 options per token. That makes the magnitudes interpretable: perplexity 1 is perfect, and perplexity equal to the vocabulary size means nothing was learned." },
          { t: "p", text: "In implementation I would stay in one base, because computing the mean in nats and exponentiating with 2 produces a wrong answer that still looks plausible. The test is the uniform identity: N tokens each at probability 1/V must return exactly V." }
        ] },

      { level: "advanced",
        q: "When would you refuse to use perplexity?",
        strong: "A strong answer names all three comparability failures with magnitudes.",
        answer: [
          { t: "p", text: "Across tokenizers, across corpora, and as a product quality metric \u2014 so for most of what people want it for." },
          { t: "p", text: "The tokenizer case is the one with a number attached. I took one model\u2019s measured total surprise for a passage, 245 nats, and divided it by the token counts five real tokenizers produce for that same string. Perplexity would read 86.10 under T5\u2019s tokenisation and 183.80 under BERT\u2019s \u2014 a 2.13\u00d7 range before any model difference." },
          { t: "p", text: "And it inverts: an efficient tokenizer uses fewer tokens, so the same surprise is divided by less and perplexity looks worse \u2014 while that model is cheaper to serve, since inference cost scales per token. For that comparison I would use bits-per-byte, where the denominator is the text\u2019s byte length." },
          { t: "p", text: "The product case is the one I would push back on hardest. Instruction tuning concentrates probability on assistant-style continuations, so it *raises* perplexity on generic text \u2014 a base model putting 33.84% of its mass on a newline after a question has excellent perplexity and will not answer you. Selecting chat models on perplexity picks the least aligned one." }
        ] },

      { level: "core",
        q: "So what is it good for?",
        strong: "A strong answer defends the narrow use without overclaiming.",
        answer: [
          { t: "p", text: "Two things, both of which hold the tokenizer and the corpus fixed. Comparing checkpoints of one model during a training run, and detecting whether a fine-tune damaged the base model." },
          { t: "p", text: "The first is why it exists: it is the only quality signal cheap enough to compute at every checkpoint of a long pretraining run, needing no labels, no judge and no humans \u2014 just held-out text. It is a monitoring metric rather than a comparison metric." },
          { t: "p", text: "The second is underrated and I would raise it unprompted. A fine-tune can hold its task metric steady while degrading general capability, and perplexity on a fixed held-out set catches that for free. I measured generic perplexity doubling from 5.282 to 10.777 after a domain fine-tune \u2014 catastrophic forgetting quantified with no labelling at all." },
          { t: "p", text: "It also has an unusually clean interpretation, which most evaluation metrics lack. Total surprise is information content, so bits-per-byte is literally a compression ratio \u2014 I measured 1.4489 bits per byte against 8, a 5.5\u00d7 compression. Better language modelling is better compression, which is a more satisfying grounding than most scores have." }
        ] }
    ]
  }
});
