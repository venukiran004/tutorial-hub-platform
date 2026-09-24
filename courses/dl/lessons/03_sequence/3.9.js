/* ============================================================================
   LESSON 3.9 — Beam Search
   Mirrors 03_Sequence_Models.md · §10. Beam search implemented and run at
   three widths; length-normalisation arithmetic verified
   (scratchpad/dl/d39.py).
   ========================================================================= */
EC.receiveLesson({
  id: "3.9",

  lede: "**A trained model gives you a probability distribution over next tokens. Turning that into a sequence is a separate problem, and greedy decoding solves it badly.** Picking the most likely token at every step optimises each decision in isolation, which is not the same as finding the most likely sequence — and the difference is often the gap between usable output and obvious nonsense. Beam search keeps several hypotheses alive, and brings a length bias that has to be corrected for.",

  objectives: [
    "Explain why greedy decoding is not sequence-optimal",
    "Implement beam search and choose a beam width",
    "Derive why unnormalised beam search prefers short sequences",
    "Apply length normalisation and choose α",
    "Judge when beam search is the wrong choice"
  ],

  prerequisites: ["3.8"],

  blocks: [

    { t: "h2", n: "01", text: "The problem with greedy", id: "greedy" },

    { t: "out", text: `  'The cat sat' : 0.9 * 0.1 = 0.09
  'The dog ran' : 0.7 * 0.8 = 0.56   <- greedy picks 'cat' and loses` },

    { t: "p", text: "At step one, `cat` has probability 0.9 against `dog`'s 0.7, so greedy takes `cat` — and is then stuck in a branch where every continuation is poor. The sequence it commits to is six times less likely than the one it passed over. **A locally optimal choice is not a globally optimal sequence**, and greedy decoding has no mechanism for revisiting a decision." },

    { t: "h2", n: "02", text: "Beam search", id: "beam" },

    { t: "diagram", kind: "tree", title: "Keeping the top B hypotheses",
      caption: "At each step every surviving hypothesis is expanded over the whole vocabulary, then all candidates are ranked and pruned back to B.",
      root: { label: "The", children: [
        { label: "cat · 0.9", children: [
          { label: "ate · 0.27", tone: "good" },
          { label: "sat · 0.09" }
        ] },
        { label: "dog · 0.7", children: [
          { label: "ran · 0.56", tone: "good" },
          { label: "ate · 0.28" }
        ] },
        { label: "bird · 0.3", children: [
          { label: "flew · 0.24", tone: "good" }
        ] }
      ] } },

    { t: "code", lang: "python", title: "The loop",
      code: `def beam_search(model, width, max_len):
    beams, done = [([SOS], 0.0)], []
    for _ in range(max_len):
        candidates = []
        for seq, score in beams:
            if seq[-1] == EOS:
                done.append((seq, score)); continue
            log_probs = model(seq)                     # log P over the vocabulary
            for v in range(vocab_size):
                candidates.append((seq + [v], score + log_probs[v]))
        candidates.sort(key=lambda p: -p[1])
        beams = candidates[:width]                     # prune back to B
    return max(done + beams, key=lambda p: -p[1])`,
      caption: "Scores accumulate in log space — adding log-probabilities rather than multiplying probabilities, which would underflow within a few dozen tokens." },

    { t: "out", text: `  width 1: best score -3.7916  seq ['the', 'dog', 'cat', 'the', 'cat']
  width 3: best score -0.9860  seq ['the', '<eos>']
  width 5: best score -0.9860  seq ['the', '<eos>']` },

    { t: "p", text: "Width 1 is greedy by definition and finds a sequence scoring −3.79. Widths 3 and 5 find −0.99, a much better score — and they find the *same* answer, which is the usual pattern: most of the gain arrives by about width 3–5 and further widening buys little." },

    { t: "table", head: ["Beam width", "Behaviour"],
      rows: [
        ["B = 1", "Greedy decoding"],
        ["B = 3–5", "The standard choice — most of the quality, modest cost"],
        ["B = 10–20", "Diminishing returns; cost is linear in B"],
        ["B → vocabulary^length", "Exhaustive search, computationally impossible"]
      ] },

    { t: "h2", n: "03", text: "The length bias", id: "length" },

    { t: "callout", kind: "trap", title: "Look at what widths 3 and 5 actually chose",
      body: [{ t: "p", text: "They picked `['the', '<eos>']` — a two-token sequence that terminates immediately. That is not a coincidence, it is the length bias in action. Every additional token adds a negative log-probability, so a longer sequence's score is *always* worse than its own prefix. Beam search, asked to maximise total log-probability, will therefore prefer to stop as early as the model permits. In translation this produces truncated output that drops the end of the sentence; in summarisation it produces summaries of one clause. It is the single most important practical fact about beam search, and it is entirely an artefact of the scoring function rather than of the model." }] },

    { t: "out", text: `    length  3: raw log P =   -2.10   /L^0.7 = -0.973   /L^1.0 = -0.700
    length  6: raw log P =   -4.20   /L^0.7 = -1.198   /L^1.0 = -0.700
    length 12: raw log P =   -8.40   /L^0.7 = -1.475   /L^1.0 = -0.700
    length 24: raw log P =  -16.80   /L^0.7 = -1.816   /L^1.0 = -0.700` },

    { t: "math", tex: "\\text{score}(y) = \\frac{1}{|y|^{\\alpha}} \\log P(y), \\qquad \\alpha \\in [0.6, 0.8]" },

    { t: "p", text: "The raw score falls linearly with length — from −2.10 to −16.80 as the sequence goes from 3 tokens to 24, when the per-token quality is identical. Dividing by `L^1.0` gives the mean log-probability per token, a constant −0.700, which removes the bias entirely but then has **no** preference for length at all and tends to ramble. `α = 0.7` sits in between: still mildly preferring shorter output, but not catastrophically so. The empirical range of 0.6 to 0.8 is a compromise between truncation and rambling, and it is worth tuning on your own data." },

    { t: "h2", n: "04", text: "When not to use it", id: "limits" },

    { t: "callout", kind: "tradeoff", title: "For open-ended generation, beam search produces bland text",
      body: [{ t: "p", text: "Beam search finds high-probability sequences, and in open-ended generation the highest-probability text is generic — safe, repetitive, and often looping. This is the well-documented observation that maximum-likelihood decoding does not produce human-like text, because human language is not the mode of the distribution. For translation and summarisation, where there is a roughly correct answer, beam search is right. For storytelling, dialogue or anything where variety matters, sampling-based methods are the tool: top-k sampling, nucleus (top-p) sampling, or temperature scaling. Modern language model APIs default to sampling for exactly this reason." }] },

    { t: "dl", items: [
      ["Greedy", "B = 1. Fast, deterministic, frequently suboptimal."],
      ["Beam search", "Best for translation, summarisation, speech recognition — tasks with a correct answer."],
      ["Top-k sampling", "Sample from the k most likely tokens. Restores variety."],
      ["Nucleus (top-p)", "Sample from the smallest set whose cumulative probability exceeds p. Adapts k to the distribution's shape."],
      ["Temperature", "Divide logits by T before softmax: below 1 sharpens, above 1 flattens."]
    ] },

    { t: "exercise", kind: "practice", title: "Implement beam search and measure the length bias", difficulty: "advanced", minutes: 40,
      prompt: "Implement beam search with length normalisation as a parameter. On a sequence task with known targets, decode at widths 1, 3, 5, 10 and 20, and record both output quality and mean output length. Then sweep α from 0 to 1.2 at a fixed width and plot mean output length against α. Finally, compare beam search against top-k and nucleus sampling on the same model, looking at both quality and diversity across several runs.",
      hints: [
        "Accumulate log-probabilities; multiplying probabilities underflows quickly.",
        "Track finished hypotheses separately from active ones, or a sequence that ends early is lost.",
        "For diversity, decode the same input several times and measure how many distinct outputs you get."
      ],
      solution: {
        notes: [
          { t: "p", text: "The α sweep should show mean output length rising monotonically with α, which makes the parameter's job concrete: at α = 0 you get truncation, at α = 1 you get the mean log-probability per token and output that tends to ramble. Tuning α on a validation set is worthwhile because the right value depends on how your data's length distribution interacts with the model's per-token confidence." },
          { t: "p", text: "On width, expect quality to improve sharply from 1 to about 5 and then flatten — I measured widths 3 and 5 finding an identical best sequence. Since cost is linear in width, anything past 5 is usually paying for nothing. Some tasks even show quality *declining* at very large widths, which is the length bias getting worse as the search finds ever-shorter high-probability sequences the model would never have reached otherwise." },
          { t: "p", text: "The sampling comparison is the one that changes how you think about decoding. Beam search will be deterministic and give the same output every time, with better scores on any likelihood-based metric. Nucleus sampling will give varied output that most readers judge more natural. Neither is better in the abstract — they answer different questions, and which you want depends entirely on whether your task has a correct answer or many acceptable ones." }
        ]
      } }

  ],

  takeaways: [
    "Greedy decoding optimises each step in isolation: 'the cat sat' at 0.09 against 'the dog ran' at 0.56.",
    "Beam search keeps the top B hypotheses, expanding and pruning at each step, accumulating log-probabilities.",
    "Measured: width 1 scored −3.79 while widths 3 and 5 both found −0.99.",
    "Every extra token lowers the raw score, so beam search systematically truncates — measured widths 3 and 5 both chose a two-token output.",
    "Raw log P falls from −2.10 to −16.80 from length 3 to 24 at identical per-token quality.",
    "Length normalisation divides by `L^α` with α ≈ 0.6–0.8; α = 1.0 is mean log-prob per token and removes all length preference.",
    "For open-ended generation, prefer sampling — the highest-probability text is bland and repetitive."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "Why does greedy decoding produce suboptimal sequences?",
      options: ["It is too fast", "Locally optimal token choices do not compose into a globally optimal sequence", "It ignores the EOS token", "It cannot handle long sequences"],
      answer: 1,
      why: "The reference's example is exact: picking `cat` at 0.9 leads to a sequence scoring 0.09, while `dog` at 0.7 leads to 0.56. Greedy commits at each step with no mechanism to revisit, so a high-probability first token can lock it into a poor branch." },
    { stem: "Why does unnormalised beam search prefer short sequences?",
      options: ["Short sequences are more likely to be correct", "Each additional token adds a negative log-probability, so any extension scores worse than its prefix", "The beam fills up with short candidates", "EOS has unusually high probability"],
      answer: 1,
      why: "Log-probabilities are negative and accumulate, so raw score falls linearly with length — from −2.10 at 3 tokens to −16.80 at 24 with identical per-token quality. In the measured run, widths 3 and 5 both chose a two-token output that terminated immediately." },
    { stem: "What does setting α = 1.0 in length normalisation do?",
      options: ["Disables normalisation", "Scores by mean log-probability per token, removing all length preference", "Doubles the penalty for long sequences", "Makes beam search equivalent to greedy"],
      answer: 1,
      why: "Dividing by `L^1.0` gives the per-token average, which was a constant −0.700 across lengths 3 to 24 in the measurement. That removes the truncation bias entirely but leaves no preference for brevity either, so output tends to ramble. The usual compromise is α between 0.6 and 0.8." },
    { stem: "When should you use sampling instead of beam search?",
      options: ["Never — beam search is always better", "For open-ended generation, where the highest-probability text is bland and repetitive", "For machine translation", "When the sequence is short"],
      answer: 1,
      why: "Beam search finds high-probability sequences, and for open-ended tasks the mode of the distribution is generic, safe and often looping — human text is not the most probable text. Use beam search where there is a roughly correct answer (translation, summarisation, ASR) and top-k or nucleus sampling where variety matters." }
  ] },

  interview: { title: "Interview", sub: "Decoding questions", questions: [
    { level: "Core", q: "Explain beam search and how you'd choose the beam width.",
      strong: "Keep the top B partial sequences at each step; B of 3–5 captures most of the gain.",
      answer: [{ t: "p", text: "At each decoding step you expand every surviving hypothesis over the whole vocabulary, score each extension by adding its log-probability to the running total, then keep only the top B. It is a middle ground between greedy, which is B = 1 and commits irrevocably at each step, and exhaustive search, which is computationally impossible. For width, most of the benefit arrives by about 3 to 5 — in a run I did, widths 3 and 5 found the identical best sequence while greedy found one scoring nearly three log units worse. Cost is linear in B so going much beyond 5 usually buys nothing, and on some tasks quality actually declines at very large widths because the search becomes better at finding the short high-probability sequences that the length bias favours." }] },
    { level: "Senior", q: "Why does beam search need length normalisation?",
      strong: "Log-probabilities accumulate negatively, so longer sequences always score worse; α ≈ 0.7 corrects it.",
      answer: [{ t: "p", text: "Because the score is a sum of negative log-probabilities, so every additional token makes the score worse — a sequence can never outscore its own prefix. Beam search maximising that quantity therefore prefers to stop as early as the model allows, which shows up as truncated translations and one-clause summaries. I have seen this directly: at widths 3 and 5 the search chose a two-token output that terminated immediately. The fix is dividing by length raised to α. At α = 1 you get mean log-probability per token, which is constant across lengths and removes the bias entirely — but then there is no preference for brevity and output rambles. The usual range is 0.6 to 0.8, which leaves a mild preference for shorter output without the pathology, and it is worth tuning on validation data because the right value depends on your length distribution." }] },
    { level: "Senior", q: "Your beam search translations are worse than greedy ones. What is happening?",
      strong: "Almost certainly the length bias — beam search is finding short high-probability sequences.",
      answer: [{ t: "p", text: "The first thing I would check is output length. Beam search is better at *searching*, and if the scoring function rewards truncation then a better search finds more truncated output — so a wider beam can genuinely make things worse. I would compare mean output length against reference length; if beam output is systematically shorter, add length normalisation with α around 0.7 and re-measure. Second possibility is a bug in how finished hypotheses are handled: if a sequence that emits EOS is kept in the active beam rather than moved to a completed list, it blocks a slot and can crowd out better continuations. Third, I would check that scores are accumulated in log space, because multiplying raw probabilities underflows within a few dozen tokens and silently turns every long hypothesis into zero. All three produce the same symptom of beam search underperforming greedy, and all three are in the decoder rather than the model." }] }
  ] }
});
