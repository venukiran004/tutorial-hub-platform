/* ============================================================================
   LESSON 6.5 — CTC, Worked
   Mirrors 08_Audio_Speech_Processing.md · §8, §9. The reference's entire
   worked example is reproduced three ways — brute force, forward lattice,
   and torch.nn.CTCLoss — and all three agree (scratchpad/dl/d65.py).
   ========================================================================= */
EC.receiveLesson({
  id: "6.5",

  lede: "**This is the most completely verifiable example in the module, and everything in it checks out.** The reference works a three-frame CTC problem by hand, enumerating five alignments to get P = 0.5100, then builds a forward lattice that arrives at the same number. I computed both, plus `torch.nn.CTCLoss` on the same inputs: brute force and lattice agree to machine precision, and PyTorch agrees to **1.11e-16**. Every cell of the published lattice reproduces exactly.",

  objectives: [
    "Enumerate the alignments that collapse to a target and sum their probabilities",
    "Build the forward lattice over a blank-extended target",
    "State the three transition rules and why the skip rule exists",
    "Verify a hand computation against `torch.nn.CTCLoss`",
    "Explain why the lattice is exact rather than approximate"
  ],

  prerequisites: ["6.4", "3.10"],

  blocks: [

    { t: "h2", n: "01", text: "The problem", id: "problem" },

    { t: "p", text: "The audio is 300 frames, the transcript is 8 characters, and nobody labelled which frame belongs to which character. CTC's answer: introduce a **blank** symbol, define a collapse rule, and sum the probability of every frame-to-label alignment that collapses to the target." },

    { t: "out", text: `  collapse rule:  squeeze repeated symbols, THEN remove blanks
      a a - b b  ->  a b          "-" is blank, not silence
      a - a b    ->  a a b        the blank is what lets you spell "aa"` },

    { t: "table", head: ["frame", "p(blank)", "p(a)", "p(b)"],
      rows: [
        ["1", "0.2", "0.7", "0.1"],
        ["2", "0.3", "0.2", "0.5"],
        ["3", "0.4", "0.1", "0.5"]
      ],
      caption: "Three frames over the alphabet `{a, b, blank}`, target `ab`." },

    { t: "h2", n: "02", text: "Brute force", id: "brute" },

    { t: "out", text: `   - a b   0.2 x 0.2 x 0.5 = 0.0200
   a - b   0.7 x 0.3 x 0.5 = 0.1050
   a a b   0.7 x 0.2 x 0.5 = 0.0700
   a b -   0.7 x 0.5 x 0.4 = 0.1400
   a b b   0.7 x 0.5 x 0.5 = 0.1750
  ----------------------------------
   P(target) = 0.5100   (reference says 0.5100)
   matches: True` },

    { t: "p", text: "Of the 27 possible three-frame paths, exactly five collapse to `ab`. Their probabilities sum to 0.5100, matching the reference. Note that all five are counted — CTC does not pick the best alignment, it credits every valid one in proportion to its probability." },

    { t: "h2", n: "03", text: "The forward lattice", id: "lattice" },

    { t: "p", text: "Brute force is `3^T` and useless past a handful of frames. The real implementation runs a forward algorithm over the target padded with blanks — `- a - b -`:" },

    { t: "out", text: `                        -        a        -        b        -
  frame 1       0.2000   0.7000   0.0000   0.0000   0.0000
  frame 2       0.0600   0.1800   0.2100   0.3500   0.0000
  frame 3       0.0240   0.0240   0.1560   0.3700   0.1400

  P(target) = 0.1400 + 0.3700 = 0.5100
  CTC loss  = -ln(0.5100) = 0.6733   (reference says 0.6733)
  brute force and lattice agree exactly: True` },

    { t: "callout", kind: "insight", title: "Every published cell reproduces exactly",
      body: [{ t: "p", text: "All fifteen lattice values match the reference to four decimal places, and the two totals agree to machine precision. That is the point of the exercise: **the lattice is not an approximation**, it is the same sum computed in `O(T · S)` instead of `O(3^T)`. The dynamic program works because the probability of reaching a given state at a given frame depends only on the states reachable at the previous frame — so you accumulate column by column, reusing the summed probability of every path that reached each state rather than re-walking them." }] },

    { t: "h2", n: "04", text: "The three rules", id: "rules" },

    { t: "diagram", kind: "steps", title: "The whole algorithm",
      caption: "Three transition rules over the blank-extended target. Everything else is bookkeeping.",
      items: [
        { label: "Stay or step", sub: "from state s you may remain at s or move to s+1", tone: "accent" },
        { label: "Skip, conditionally", sub: "s → s+2 only if s+2 is a real label differing from the one at s", tone: "violet" },
        { label: "Sum the last two", sub: "a valid path may or may not end on a blank", tone: "good" }
      ] },

    { t: "out", text: `  target 'ab' -> extended - a - b -
    skip into state 3 ('b'): allowed  (two back is 'a')
  target 'aa' -> extended - a - a -
    skip into state 3 ('a'): BLOCKED  (two back is 'a')` },

    { t: "callout", kind: "mental", title: "The skip rule is what forces a blank between doubled letters",
      body: [{ t: "p", text: "For `ab`, a path may skip the blank between `a` and `b`, because collapsing `ab` still gives `ab`. For `aa` the skip is forbidden, so every valid path **must** pass through the intervening blank state — which is exactly what makes `a - a` the only way to spell a double letter, since `a a` would collapse to a single `a`. Lesson 3.10 showed this from the collapse side, where the frame sequence `hello` gives `helo`; this is the same constraint expressed as a transition rule in the lattice. Recognising that they are the same fact from two directions is worth the minute it takes." }] },

    { t: "h2", n: "05", text: "Against PyTorch", id: "pytorch" },

    { t: "out", text: `  torch CTCLoss = 0.6733
  hand lattice  = 0.6733
  agree to 1.11e-16` },

    { t: "p", text: "`nn.CTCLoss(blank=0, reduction='none')` on the same log-probabilities gives the identical value to float64 round-off. If you implement the lattice yourself, this is the check to run — it confirms not only your arithmetic but also your blank index, your tensor layout, and your understanding of what the loss returns." },

    { t: "h2", n: "05b", text: "The backward pass, and where gradients go", id: "backward" },

    { t: "p", text: "The forward variables give the probability of reaching each state; a symmetric **backward** pass gives the probability of completing the target from each state. Their product at a given state and frame is the total probability of all paths through that state." },

    { t: "math", tex: "\\frac{\\partial \\mathcal{L}}{\\partial y_t^k} = -\\frac{1}{P(\\text{target})}\\sum_{s \\,:\\, \\text{ext}(s)=k} \\alpha_t(s)\\,\\beta_t(s)" },

    { t: "callout", kind: "mental", title: "The gradient is a soft alignment",
      body: [{ t: "p", text: "That expression says the gradient pushing frame `t` towards symbol `k` is proportional to how much of the total path probability flows through states emitting `k` at that frame. In other words, CTC does not commit to an alignment and then train against it — it computes a *distribution* over alignments and trains against the expected one, updating itself each step as the model's own probabilities shift. This is why CTC training has its characteristic trajectory: early on the distribution is diffuse and the model learns to emit blanks everywhere, which is the safest high-probability behaviour, and only once some frames become confident does the alignment sharpen and real symbols appear. A loss that falls steadily while greedy decoding produces nothing is the expected shape, not a failure." }] },

    { t: "h2", n: "06", text: "Why the dynamic program is necessary", id: "complexity" },

    { t: "out", text: `  T=  3: brute force 3^T = 2.700e+01   lattice O(T x S) = 15
  T= 10: brute force 3^T = 5.905e+04   lattice O(T x S) = 50
  T=300: brute force 3^T = 1.369e+143  lattice O(T x S) = 1500` },

    { t: "p", text: "At a realistic 300 frames the enumeration is **1.4 × 10¹⁴³ paths** — more than the number of atoms in the observable universe by a vast margin — while the lattice needs 1,500 cells. And the vocabulary here is three symbols; a real character set makes the exponential base far larger. This is why CTC was a practical contribution and not merely a formulation." },

    { t: "exercise", kind: "practice", title: "Implement the lattice", difficulty: "advanced", minutes: 45,
      prompt: "Implement the CTC forward algorithm from the three rules and verify it against brute-force enumeration on small examples, then against `torch.nn.CTCLoss` on larger ones. Test the doubled-letter case explicitly — target `aa` should give a different probability than target `ab` for the same emissions, and you should be able to explain why from the skip rule. Then convert your implementation to log space and confirm it still matches at sequence lengths where the probability-space version underflows.",
      hints: [
        "Extend the target with blanks: `- a - b -` for target `ab`.",
        "The skip is allowed only into a real label that differs from the label two states back.",
        "In log space, use `logsumexp` for the additions."
      ],
      solution: {
        notes: [
          { t: "p", text: "The doubled-letter test is the one that exercises the rule most people get wrong. For target `aa` the skip into the second `a` is blocked, so fewer paths are valid and the probability is lower than for `ab` with identical emissions. If your implementation gives the same answer for both, your skip condition is checking only that the state is a real label and not that it differs from the one two back." },
          { t: "p", text: "The log-space conversion is not optional for real use. In probability space the alpha values are products of hundreds of numbers below 1, so they underflow float32 within perhaps forty frames and float64 within a few hundred — and the failure is silent, giving zero probability and infinite loss. Working in log space with `logsumexp` for the additions is what every production implementation does, and comparing the two at a length where the direct version still works is a good way to confirm your log version is right before you rely on it." },
          { t: "p", text: "Verifying against `torch.nn.CTCLoss` catches more than arithmetic. It confirms your blank index matches, your tensor layout is `(T, B, C)` rather than batch-first, and that you understand the reduction being applied. I matched it to 1.11e-16, which is float64 round-off — anything much larger than that indicates a real discrepancy rather than numerical noise." }
        ]
      } }

  ],

  takeaways: [
    "Collapse rule: squeeze repeated symbols, then remove blanks.",
    "Five of 27 three-frame paths collapse to `ab`, summing to 0.5100 — matching the reference exactly.",
    "The forward lattice over `- a - b -` reproduces all fifteen published cells and gives the same 0.5100.",
    "CTC loss = −ln(0.5100) = 0.6733, and `torch.nn.CTCLoss` agrees to 1.11e-16.",
    "Three rules: stay or step; skip only into a real label differing from two back; sum the final two states.",
    "The skip rule is what forces a blank between doubled letters.",
    "At 300 frames brute force is 1.4e+143 paths against the lattice's 1,500 cells.",
    "Implement in log space — probability space underflows within a few hundred frames, silently."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "How many of the 27 three-frame paths collapse to the target `ab`?",
      options: ["One — the best alignment", "Five, summing to 0.5100", "Three", "All that contain both symbols"],
      answer: 1,
      why: "`-ab`, `a-b`, `aab`, `ab-` and `abb` all collapse to `ab`, and their probabilities sum to 0.5100. CTC does not select the best alignment — it credits every valid one in proportion to its probability, which is what makes the loss differentiable with respect to an unknown alignment." },
    { stem: "Why can a path skip from state s to s+2 for target `ab` but not for `aa`?",
      options: ["The lattice is shorter for `aa`", "Skipping the blank between two identical labels would collapse them into one", "Skips are never allowed for repeated letters in any position", "It is an implementation detail"],
      answer: 1,
      why: "The skip is permitted only into a real label that differs from the label two states back. For `aa` the skip is blocked, so every valid path must pass through the intervening blank — which is the same fact as `a a` collapsing to `a` while `a - a` gives `aa`, expressed as a transition rule." },
    { stem: "Is the forward lattice an approximation to the true sum over alignments?",
      options: ["Yes — it prunes unlikely paths", "No — it computes the same sum exactly, in O(T·S) instead of O(C^T)", "Yes, within about 1 %", "Only for short sequences"],
      answer: 1,
      why: "Brute force and lattice agreed exactly on the worked example, both giving 0.5100. The dynamic program reuses the accumulated probability of all paths reaching each state rather than re-walking them, which is a reorganisation of the same computation — at 300 frames, 1,500 cells instead of 1.4e+143 paths." },
    { stem: "Why must a production CTC implementation work in log space?",
      options: ["It is faster", "Alpha values are products of many sub-1 probabilities and underflow silently", "Log space is more accurate for addition", "PyTorch requires it"],
      answer: 1,
      why: "The forward values are products of hundreds of probabilities below 1, so they underflow float32 within roughly forty frames — giving zero probability and infinite loss, with no error raised. Log space with `logsumexp` for the additions is what every real implementation uses." }
  ] },

  interview: { title: "Interview", sub: "CTC internals", questions: [
    { level: "Core", q: "Explain how the CTC forward algorithm works.",
      strong: "A dynamic program over the blank-extended target with three transition rules; exact, not approximate.",
      answer: [{ t: "p", text: "You extend the target with blanks between every label and at both ends, so `ab` becomes `- a - b -`, and run a forward pass accumulating the probability of reaching each state at each frame. Three rules govern the transitions: from a state you may stay or step forward one; you may skip forward two, but only into a real label that differs from the label two states back; and the answer is the sum of the final two states, because a valid path may or may not end on a blank. The skip restriction is what forces a blank between doubled letters — for `aa` the skip is blocked, so every path must go through the intervening blank, which is why `hello` needs one between the two `l`s. The important property is that this is exact, not a pruned approximation: it computes the same sum over all alignments that brute force would, in `O(T·S)` instead of exponential time. I have verified that both ways on a worked example, and against `torch.nn.CTCLoss`, agreeing to 1e-16." }] },
    { level: "Senior", q: "How do you get alignments out of a CTC model?",
      strong: "Viterbi through the same lattice — the best path rather than the sum over paths.",
      answer: [{ t: "p", text: "The forward algorithm sums over all alignments to get the loss; for an alignment you run the same lattice with max instead of sum and backtrace the best path, which is Viterbi. That gives a frame-to-label assignment, and since each frame has a known time from the hop size, it gives timings directly. This is the basis of forced alignment, which is how subtitle timings and phoneme boundaries are produced in practice — you have the transcript already and you want to know when each word was said. It is worth contrasting with an attention model, where the alignment is implicit in the cross-attention and is not constrained to be monotonic, so it can be extracted but is much less reliable as a timing. That is precisely why the recommended recipe for word-level timestamps is to transcribe with an accurate attention model like Whisper and then force-align that transcript with a CTC model, rather than trusting Whisper's own predicted timestamp tokens. One caveat: the greedy Viterbi path is not necessarily the most probable *labelling*, since many paths collapse to the same text, so the best path and the best transcript can differ." }] },
    { level: "Senior", q: "What would you check in someone's CTC implementation?",
      strong: "Log space, the skip condition, the blank index, and the tensor layout.",
      answer: [{ t: "p", text: "Four things, all of which fail quietly. First, whether it works in log space with `logsumexp` — the forward values are products of hundreds of sub-1 probabilities and underflow float32 within about forty frames, giving zero probability and infinite loss with no error. Second, the skip condition, which must check both that the destination is a real label and that it differs from the label two states back; checking only the first gives the same probability for `aa` and `ab` on identical emissions, which is the test I would run. Third, the blank index, since PyTorch defaults to 0 and many vocabularies put blank last. Fourth, the tensor layout: `nn.CTCLoss` wants `(T, B, C)` with time first and offers no `batch_first` option, and passing `(B, T, C)` with compatible sizes computes a meaningless loss while appearing to train. I would also verify against `torch.nn.CTCLoss` on a small case rather than only on shapes, since that single comparison catches all four at once." }] }
  ] }
});
