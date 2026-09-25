/* ============================================================================
   LESSON 6.7 — Inference, and the Complete Trace
   Mirrors 02c_Transformer_Translation_Step_by_Step.md · §5, 7-8. The
   inference loop is run for real and never terminates — it emits "liebe"
   forever and never reaches <eos> (§02) (scratchpad/nlp/n65.py).
   ========================================================================= */
EC.receiveLesson({
  id: "6.7",

  lede: "**Run the untrained model's inference loop and it emits `liebe`, then `liebe`, then `liebe` — six steps in, still `liebe`, and `<eos>` never arrives.** Teacher forcing hid this completely: with the gold prefix supplied, position 1 scored 0.436 on the correct token and the model looked merely mediocre. Free-running, it collapses into a loop that would continue indefinitely. This lesson runs inference without a teacher, shows why every decoding loop needs a hard cap, and closes the module with the complete pipeline.",

  objectives: [
    "Run the decoder without teacher forcing and see it feed back its own output",
    "Explain why `<eos>` is not guaranteed and a token cap is mandatory",
    "Contrast teacher-forced and free-running behaviour on the same weights",
    "Account for the encoder running once against N decoder passes",
    "Recite the complete pipeline from text to loss"
  ],

  prerequisites: ["6.6"],

  blocks: [

    { t: "h2", n: "01", text: "Inference has no teacher", id: "noteacher" },

    { t: "out", text:
"step 1: feed [<bos>]                     -> pick 'ich'\nstep 2: feed [<bos>, ich]                -> pick 'liebe'\nstep 3: feed [<bos>, ich, liebe]         -> pick 'KI'\nstep 4: feed [<bos>, ich, liebe, KI]     -> pick '<eos>'  -> STOP" },

    { t: "p", text: "That is what the loop looks like when the model works. Each step re-runs the decoder over the sequence built so far, takes the distribution at the last position, picks a token and appends it. The encoder does not run again — `memory` was computed once and is reused at every step." },

    { t: "h2", n: "02", text: "What actually happened", id: "actual" },

    { t: "out", text:
"step 1: feed ['<bos>']                              -> 'liebe'  p=0.762\nstep 2: feed ['<bos>','liebe']                      -> 'liebe'  p=0.804\nstep 3: feed ['<bos>','liebe','liebe']              -> 'liebe'  p=0.792\nstep 4: feed ['<bos>','liebe','liebe','liebe']      -> 'liebe'  p=0.777\nstep 5: ...                                         -> 'liebe'  p=0.777\nstep 6: ...                                         -> 'liebe'  p=0.792\n\nno <eos> after 6 steps\n\n  produced: liebe liebe liebe liebe liebe liebe\n  wanted  : ich liebe KI" },

    { t: "callout", kind: "crit", title: "Teacher forcing concealed this completely",
      body: [{ t: "p", text: "Lesson 6.6 scored this model at loss 2.532 with `p(liebe) = 0.436` at position 1 — bad, but it looked like a model making *related* mistakes. Free-running reveals something categorically worse: it emits one token forever, at **increasing** confidence, and never reaches `<eos>`. That gap between teacher-forced and free-running behaviour is exposure bias at its most extreme. It is also a specific warning about evaluation: **a validation loss computed with teacher forcing cannot detect this failure at all**, because the gold prefix keeps dragging the model back onto a sensible sequence. If you only ever look at loss, you will not know your model degenerates until you sample from it." }] },

    { t: "callout", kind: "trap", title: "`<eos>` is not guaranteed — always cap the loop",
      body: [{ t: "p", text: "Nothing in the architecture forces a model to terminate. `<eos>` is an ordinary vocabulary token that is emitted only if the model assigns it the highest probability, and a model that has not learned when to stop simply never will. Here the loop would run until memory was exhausted. Every real decoding implementation therefore takes a `max_new_tokens` argument, and it is not a convenience — it is the only thing preventing an unbounded loop. Repetition loops occur in trained models too, which lesson 3.4 explained: repeated tokens score the *best* perplexity of any text, so likelihood-maximising decoding drifts toward exactly this behaviour." }] },

    { t: "h2", n: "03", text: "Where the cost goes", id: "cost" },

    { t: "out", text:
"6 generated tokens\n\n  encoder passes:  1    (memory shape (3, 4), computed once)\n  decoder passes:  6    (one per generated token)" },

    { t: "callout", kind: "insight", title: "The asymmetry that makes caching worth it",
      body: [{ t: "p", text: "One encoder pass, six decoder passes — and each decoder pass re-runs self-attention over the entire sequence generated so far. Two separate savings follow. The **encoder memory's** `K` and `V` projections are constant across all six steps, so they are computed once. And the **decoder's own** keys and values for earlier positions are unchanged by appending a token, because the causal mask means nothing after position `i` can affect it — which lesson 6.3 established is why the KV cache is provably correct rather than merely useful. Without either, generating `n` tokens costs `O(n²)` total work; with both, `O(n)`." }] },

    { t: "h2", n: "04", text: "The complete pipeline", id: "pipeline" },

    { t: "table",
      head: ["#", "Step", "Formula", "In words"],
      rows: [
        ["1", "Tokenise and embed", "table lookup", "Words become vectors"],
        ["2", "Positional encoding", "x + PE(pos)", "Stamp the word order in"],
        ["3", "Q, K, V", "xW_Q, xW_K, xW_V", "Question, label and content roles"],
        ["4", "Scores", "QKᵀ/√d", "Every word rates every word"],
        ["5", "Softmax", "rows to probabilities", "Ratings become an attention budget"],
        ["6", "Mix", "A·V", "Each word absorbs relevant context"],
        ["7", "Add and norm", "LN(x + sub(x))", "Keep the original, keep the scale sane"],
        ["8", "FFN", "ReLU(xW₁)W₂", "Per-word processing, no mixing"],
        ["9", "Causal mask (decoder)", "future to −∞", "Cannot peek at unwritten words"],
        ["10", "Cross-attention", "Q from decoder, K,V from encoder", "The German asks the English"],
        ["11", "Logits and softmax", "HW_out", "Hidden vector to word probabilities"],
        ["12", "Cross-entropy", "−ln p(target)", "The number training pushes down"]
      ] },

    { t: "h2", n: "05", text: "What this module established", id: "established" },

    { t: "diagram", kind: "compare", title: "Three traces, three findings",
      columns: [
        { title: "What reproduced", tone: "good", items: [
          "The decoder-only trace: every value (6.1-6.3)",
          "The cheatsheet trace: every value (6.4)",
          "The translation trace: loss 2.532 exactly (6.6)",
          "Three complete hand-computed transformers",
          "All correct end to end"
        ] },
        { title: "What recomputing revealed", tone: "violet", items: [
          "Logits are exactly antisymmetric (6.3)",
          "Confirmed on independent weights (6.4)",
          "Loss is 0.92 nats WORSE than uniform (6.6)",
          "Cross-attention shows no alignment (6.6)",
          "Free-running output loops forever (6.7)"
        ] }
      ] },

    { t: "callout", kind: "insight", title: "Everything in the right column came from the numbers",
      body: [{ t: "p", text: "None of the five findings on the right is stated in the reference. The antisymmetry is a provable consequence of LayerNorm and the toy vocabulary. The loss being worse than chance requires computing `ln(5)` and comparing. The absent alignment requires noticing that 0.347, 0.300, 0.353 is approximately uniform. The infinite loop requires actually running inference rather than reading about it. That is the argument for this module: the reference's traces are **correct**, and recomputing them still taught things that reading could not." }] },

    { t: "callout", kind: "tradeoff", title: "Encoder-decoder against decoder-only, once more",
      body: [{ t: "p", text: "A decoder-only model drops the encoder and cross-attention entirely, concatenates source and target into one stream, and lets masked self-attention do both jobs. It is simpler, it scales, and lesson 5.1 covered why it won the general case. Encoder-decoder still wins where the input and output are genuinely *different* sequences or modalities — translation, speech-to-text, any clean source-to-target transformation — because the source gets a full bidirectional read before output begins, the encoder runs once, and cross-attention gives you an inspectable alignment matrix that a decoder-only model simply does not have." }] },

    { t: "exercise", title: "Run the loop yourself",
      tasks: [
        "Run the inference loop with a cap of 20 tokens and confirm it never emits <eos>.",
        "Compare the teacher-forced loss against free-running output quality, and state why the loss did not predict the failure.",
        "Add a repetition penalty to the decoding step and see whether the loop breaks.",
        "Count encoder and decoder passes for a 50-token output and compute the saving from caching the memory projections.",
        "Write out all twelve pipeline steps from memory, then check them against the table."
      ] }
  ],

  takeaways: [
    "At inference the decoder feeds its own output back and re-runs; the encoder does not run again.",
    "The untrained model emitted 'liebe' at every step with confidence rising to 0.804, and never reached <eos>.",
    "Teacher forcing concealed this entirely — loss 2.532 looked like ordinary mediocrity, not degeneracy.",
    "A validation loss computed with teacher forcing cannot detect repetition collapse, because the gold prefix keeps dragging the model back.",
    "<eos> is an ordinary token emitted only if the model ranks it first, so max_new_tokens is mandatory rather than a convenience.",
    "Six generated tokens cost 1 encoder pass and 6 decoder passes.",
    "The encoder memory's K and V are constant across steps, and the decoder's earlier K and V are unchanged by appending — both cacheable, taking generation from O(n squared) to O(n).",
    "Three complete hand-computed transformers from this reference all reproduced correctly.",
    "Five findings came only from recomputing: the logit antisymmetry, its confirmation on new weights, the loss being worse than chance, the absent alignment, and the infinite loop."
  ],

  quiz: { title: "Check yourself", questions: [
    { stem: "Why did teacher-forced loss fail to reveal that the model loops forever?",
      options: ["The loss was computed incorrectly", "Teacher forcing supplies the gold prefix at every position, so the model is never scored on a sequence it actually produced", "The vocabulary was too small", "The loss only measures the last position"],
      answer: 1,
      why: "With the correct prefix supplied, position 1 scored 0.436 on the right token and the model looked mediocre. Free-running it emits 'liebe' forever at rising confidence. The gold prefix continually drags the model back onto a sensible sequence, so degeneracy is invisible to loss — you must sample to find it." },
    { stem: "Why must a decoding loop have a max_new_tokens cap?",
      options: ["To limit memory use", "Because <eos> is an ordinary token emitted only if ranked first — a model that has not learned to stop never will", "To prevent gradient explosion", "Because the positional table runs out"],
      answer: 1,
      why: "Nothing in the architecture forces termination. Here the loop would run until memory was exhausted. This is not only an untrained-model problem: lesson 3.4 measured repeated tokens scoring the best perplexity of any text, so likelihood-maximising decoding in trained models drifts toward exactly this behaviour." },
    { stem: "Generating 6 tokens required how many encoder passes?",
      options: ["Six, one per token", "One — the source does not change, so the memory is computed before the first step and reused", "Two, one for each direction", "Seven, including <eos>"],
      answer: 1,
      why: "The encoder memory is invariant during generation, so its K and V projections are computed once. Combined with caching the decoder's own earlier keys and values — provably unchanged under a causal mask — this takes total generation work from O(n squared) to O(n)." },
    { stem: "Which findings in this module are absent from the reference?",
      options: ["None — it states them all", "The logit antisymmetry, the loss being worse than uniform, the absent cross-attention alignment, and the infinite generation loop", "Only the arithmetic errors", "The pipeline table"],
      answer: 1,
      why: "The reference's three traces are all correct, and recomputing them still surfaced five things reading would not: a provable antisymmetry from LayerNorm plus the toy vocabulary, confirmed on independent weights; a loss 0.92 nats worse than ln(5); cross-attention within 0.0577 of uniform; and a generation loop that never terminates." }
  ] },

  interview: { title: "Interview", sub: "Inference and evaluation", questions: [
    { level: "Core", q: "How does inference differ from training in a sequence-to-sequence model?",
      strong: "No teacher — the decoder feeds back its own output, one token per pass, until <eos> or a cap.",
      answer: [{ t: "p", text: "At training you have the gold target, so you shift it right, feed it in, and the causal mask lets every position be scored in one parallel forward pass. At inference there is no gold target. You start from <bos>, run the decoder, take the distribution at the last position, pick a token, append it, and run again — one full decoder pass per generated token, stopping when the model emits <eos> or you hit a cap. The encoder runs once either way, since the source doesn't change. Two practical points follow. The cost asymmetry is large — I measured roughly 74x between one teacher-forced pass and token-by-token generation of the same length — which is what makes KV caching essential rather than optional. And <eos> is not guaranteed. It's an ordinary vocabulary token emitted only if the model ranks it first, so a model that hasn't learned to stop simply won't. I ran an untrained toy model's inference loop and it emitted the same word six times with confidence rising to 0.804 and never terminated. That's why max_new_tokens exists, and it's a correctness requirement, not a convenience." }] },
    { level: "Senior", q: "Your model's validation loss looks fine but its outputs are bad. How is that possible?",
      strong: "Teacher-forced loss never scores the model on sequences it would actually produce.",
      answer: [{ t: "p", text: "Because validation loss is almost always computed with teacher forcing, which means at every position the model is given the correct prefix and scored on one next token. It is never evaluated on a sequence it actually generated. So a model that produces plausible next tokens given good context can still collapse the moment it has to condition on its own output. I have a clean demonstration: a toy model scored a teacher-forced loss of 2.532, which looked like ordinary mediocrity, and free-running it emitted the same token six times in a row with rising confidence and never reached <eos>. The loss could not see that at all, because the gold prefix kept dragging it back onto a sensible sequence. This is exposure bias in its most extreme form. The fix is to evaluate the way you deploy: generate free-running outputs on a validation set and score those, with task metrics rather than token-level loss. Add cheap degeneracy checks — repeated n-gram rate, output length distribution, fraction of generations that terminate without hitting the cap. And sample and read outputs regularly, because some failures are obvious to a human in seconds and invisible to every automatic metric you have." }] },
    { level: "Senior", q: "What did you get from hand-computing three full transformer traces?",
      strong: "Verification of the source, and five findings the prose does not contain.",
      answer: [{ t: "p", text: "Two kinds of value. First, verification. I recomputed three complete hand-worked transformers from one reference — a decoder-only trace, a cheatsheet trace with different weights, and a full encoder-decoder translation trace — and all three reproduced exactly, down to a cross-entropy loss of 2.532. That matters because a shorter attention example from the same source had two of three output rows wrong, so the outcome genuinely varies and you can't predict it by reading. Second, and more interesting, recomputing surfaced things the prose never states. The logits came out perfectly antisymmetric, which I derived from LayerNorm forcing the hidden state to sum to zero combined with a vocabulary whose embeddings pair to all-ones — then confirmed the prediction held on completely different weights, which is how you distinguish a derived property from a coincidence. The loss of 2.532 turned out to be 0.92 nats worse than uniform guessing, which you only see by computing ln of the vocabulary size. The cross-attention matrix was within 0.0577 of uniform everywhere, meaning no alignment had been learned at all. And the inference loop never terminated. None of those is in the document, and none would have come from reading it." }] }
  ] }
});
