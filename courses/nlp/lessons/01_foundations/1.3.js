/* ============================================================================
   LESSON 1.3 — Tokenization In Depth
   Mirrors 01_NLP_Notes.md · §3. The reference's BPE training trace is
   recomputed round by round and reproduces exactly; the WordPiece scoring
   difference is demonstrated on the same corpus; and the real BERT and GPT-2
   tokenizers are run (scratchpad/nlp/n13.py).
   ========================================================================= */
EC.receiveLesson({
  id: "1.3",

  lede: "**Tokenization is the one decision every later stage inherits, and BPE is simple enough to run by hand.** Count every adjacent pair of symbols in the corpus, glue the most frequent one together, repeat. The number of times you repeat *is* your vocabulary size, and the ordered list of merges is the entire model. This lesson recomputes the reference's training trace merge by merge — it reproduces exactly — then shows the one-line change that turns BPE into WordPiece, and runs the real tokenizers.",

  objectives: [
    "Compare word, character and subword tokenization on vocabulary and OOV behaviour",
    "Train BPE by hand and apply the merges to an unseen word",
    "Explain why byte-level BPE can never produce an unknown token",
    "State how WordPiece's merge criterion differs from BPE's and what it changes",
    "Read a real tokenizer's output, including the leading-space marker"
  ],

  prerequisites: ["1.2"],

  blocks: [

    { t: "h2", n: "01", text: "The methods", id: "methods" },

    { t: "out", text: `  scheme                 vocab        OOV handling
  word-level             large        poor - [UNK]
  character-level        ~256         none needed
  BPE                    30K-50K      good - subword
  WordPiece              ~30K         good - subword
  Unigram/SentencePiece  32K-64K      good - subword
  byte-level BPE         50K-100K     perfect - never UNK` },

    { t: "callout", kind: "mental", title: "Vocabulary size and sequence length trade against each other",
      body: [{ t: "p", text: "Word-level tokenization gives short sequences and an enormous vocabulary with an unavoidable `[UNK]` problem — any word you did not see in training is lost entirely. Character-level gives a tiny vocabulary and no OOV at all, but sequences become five to ten times longer, and since attention is quadratic in length that is expensive. Subword schemes sit in between deliberately: common words stay whole so sequences stay short, and rare words degrade into pieces rather than disappearing. The vocabulary size is the dial between those extremes, and 30,000 to 50,000 is where the field settled for English." }] },

    { t: "h2", n: "02", text: "Training BPE by hand", id: "training" },

    { t: "p", text: "Start with every word as a sequence of characters, count adjacent pairs weighted by word frequency, merge the winner, repeat. The reference's corpus is five words:" },

    { t: "out", text: `  corpus: {'hug': 10, 'pug': 5, 'pun': 12, 'bun': 4, 'hugs': 5}
  base vocab = ['b', 'g', 'h', 'n', 'p', 's', 'u']

  ROUND 1  pair counts: (u,g)=20  (p,u)=17  (u,n)=16  (h,u)=15
           MERGE 1: u + g -> 'ug'
           splits: h·ug(10)  p·ug(5)  p·u·n(12)  b·u·n(4)  h·ug·s(5)
  ROUND 2  pair counts: (u,n)=16  (h,ug)=15  (p,u)=12  (p,ug)=5
           MERGE 2: u + n -> 'un'
           splits: h·ug(10)  p·ug(5)  p·un(12)  b·un(4)  h·ug·s(5)
  ROUND 3  pair counts: (h,ug)=15  (p,un)=12  (p,ug)=5  (ug,s)=5
           MERGE 3: h + ug -> 'hug'
           splits: hug(10)  p·ug(5)  p·un(12)  b·un(4)  hug·s(5)` },

    { t: "callout", kind: "insight", title: "Every count reproduces the reference exactly",
      body: [{ t: "p", text: "`(u,g)` scores 20 because it appears in `hug` (10), `pug` (5) and `hugs` (5) — the counts are weighted by how often each word occurs, not by how many distinct words contain the pair. After merging, the counts are recomputed from scratch, which is why `(h,u)` at 15 in round 1 becomes `(h,ug)` at 15 in round 2: the pair is still there, it is just spelled differently now. Watching `pun` and `bun` stay split as `p·un` and `b·un` while `hug` becomes a single token is the whole algorithm in one picture — **frequency decides what gets to be a word**." }] },

    { t: "out", text: `  learned merges: [('u', 'g'), ('u', 'n'), ('h', 'ug')]
  reference says: [('u','g'), ('u','n'), ('h','ug')]
  match: True
  vocab = ['b', 'g', 'h', 'hug', 'n', 'p', 's', 'u', 'ug', 'un']` },

    { t: "code", lang: "python", title: "Train and encode",
      code: `def bpe_train(corpus, num_merges):
    vocab = {tuple(word): freq for word, freq in corpus.items()}
    merges = []
    for _ in range(num_merges):
        pairs = Counter()
        for symbols, freq in vocab.items():
            for a, b in zip(symbols, symbols[1:]):
                pairs[(a, b)] += freq        # weighted by word frequency
        if not pairs: break
        best = max(pairs, key=pairs.get)
        merges.append(best)
        ...                                   # rewrite every word with the pair glued
    return merges

def bpe_encode(word, merges):
    symbols = list(word)
    for a, b in merges:                       # apply each rule in LEARNED ORDER
        i = 0
        while i < len(symbols) - 1:
            if symbols[i] == a and symbols[i+1] == b:
                symbols[i:i+2] = [a + b]      # glue, then re-check the same position
            else:
                i += 1
    return symbols`,
      caption: "The order of the merge list is the model. Apply the rules in a different order and you get different tokens for the same word." },

    { t: "h2", n: "03", text: "Encoding an unseen word", id: "encoding" },

    { t: "out", text: `  hugs   -> ['hug', 's']   reference: ['hug', 's']   match=True
  bug    -> ['b', 'ug']   reference: ['b', 'ug']   match=True
  pun    -> ['p', 'un']   reference: ['p', 'un']   match=True
  mug    -> ['m', 'ug']   <- 'm' was never in the corpus: an OOV character` },

    { t: "p", text: "`bug` never appeared in training, and it still encodes cleanly as `b` + `ug` because both pieces are in the vocabulary. That is the property that makes subword tokenization work: **a word you have never seen is represented by pieces you have.** But `mug` exposes the limit — `m` was never in the corpus, so there is no symbol for it at all." },

    { t: "h2", n: "04", text: "Byte-level BPE", id: "byte-level" },

    { t: "out", text: `  a character-level base vocab cannot represent text outside its training alphabet
  as raw bytes that same text is a sequence of values, every one of them in 0..255:
    [109, 195, 188, 108, 108, 101, 114, 32, 240, 159, 152, 128] ...` },

    { t: "callout", kind: "insight", title: "Start from the 256 bytes and `[UNK]` becomes impossible",
      body: [{ t: "p", text: "Any text, in any script, is a sequence of bytes, and there are only 256 possible bytes. Start BPE from those instead of from characters and every conceivable input — an emoji, an alphabet you never trained on, a corrupted file — is already representable. That is why GPT-2 onwards, LLaMA and Claude all use byte-level BPE: there is **no unknown token in the vocabulary because there is no way to produce one**. The cost appears in the next section." }] },

    { t: "h2", n: "05", text: "WordPiece and Unigram", id: "variants" },

    { t: "math", tex: "\\text{BPE: } \\arg\\max_{(a,b)} \\; \\text{freq}(a,b) \\qquad\\qquad \\text{WordPiece: } \\arg\\max_{(a,b)} \\; \\frac{\\text{freq}(a,b)}{\\text{freq}(a)\\cdot\\text{freq}(b)}" },

    { t: "out", text: `  pair     freq   freq(a)*freq(b)        wordpiece score
  (u,g)    20     720                    0.027778
  (p,u)    17     612                    0.027778
  (u,n)    16     576                    0.027778
  (h,u)    15     540                    0.027778
  (g,s)    5      100                    0.050000
  BPE would merge (u,g) (highest count)
  WordPiece would merge (g,s) (highest score)` },

    { t: "callout", kind: "insight", title: "Same corpus, different first merge",
      body: [{ t: "p", text: "BPE asks which pair is **most frequent**; WordPiece asks which pair is **most surprisingly frequent relative to its parts**. On this corpus that produces genuinely different answers: BPE merges `(u,g)` at a count of 20, while WordPiece merges `(g,s)` at a count of only 5, because `g` and `s` are individually rare and their co-occurrence is therefore informative. The tie at 0.027778 among the top four is an artefact of this tiny corpus, where several pairs happen to share a ratio — on real text the scores separate cleanly. The memory hook: BPE is *merge the most common pair*, WordPiece is *merge the pair that is common relative to its parts*, and Unigram runs in the opposite direction entirely — start with a huge vocabulary and prune the tokens that cost the least likelihood." }] },

    { t: "table", head: ["Scheme", "Merge criterion", "Continuation marker", "Used by"],
      rows: [
        ["**BPE**", "The most frequent adjacent pair", "None (space-prefix in byte-level)", "GPT-2/3/4, RoBERTa, LLaMA"],
        ["**WordPiece**", "Highest `freq(a,b) / (freq(a)·freq(b))`", "`##` means glued to previous", "BERT, DistilBERT, ELECTRA"],
        ["**Unigram**", "Start huge, prune what hurts likelihood least", "—", "T5, ALBERT, XLNet"]
      ] },

    { t: "h2", n: "06", text: "The real tokenizers", id: "real" },

    { t: "out", text: `  BERT (WordPiece)         ['un', '##bel', '##ie', '##va', '##bly', 'transform', '##ative']
                           vocab 30522
  GPT-2 (byte-level BPE)   ['un', 'bel', 'iev', 'ably', 'Ġtransformative']
                           vocab 50257

  BERT encode = [101, 7592, 1010, 2088, 999, 102]
  tokens      = ['[CLS]', 'hello', ',', 'world', '!', '[SEP]']
  decode      = '[CLS] hello, world! [SEP]'` },

    { t: "p", text: "BERT's split matches the reference exactly, with `##` marking each continuation, and so does the encode to `[101, 7592, 1010, 2088, 999, 102]`. GPT-2 differs from what the reference prints: the real tokenizer produces **`Ġtransformative` as a single token**, not ` transform` plus `ative`. The `Ġ` is how byte-level BPE renders a leading space — the space is part of the token." },

    { t: "out", text: `  gpt2 'Hello world'    -> ['Hello', 'Ġworld']
  gpt2 ' Hello world'   -> ['ĠHello', 'Ġworld']
  gpt2 'muller <emoji> <2 CJK chars>' -> 10 tokens for 9 characters` },

    { t: "callout", kind: "trap", title: "A leading space changes the token, and non-Latin text costs several times more",
      body: [{ t: "p", text: "`Hello` and `ĠHello` are **different token IDs** in GPT-2. That is why prompts are sensitive to whitespace in ways that look superstitious until you see the tokenization, and why a trailing space before a completion can measurably change the output. The second line is the byte-level cost: a nine-character string containing one emoji and two CJK characters became **ten tokens**, because each of those characters is several bytes and none of those byte sequences was frequent enough in training to merge. English averages well under one token per word; text in an underrepresented script can cost three or four times more, which is a direct and often-unnoticed cost in both context window and API billing." }] },

    { t: "h2", n: "07", text: "Special tokens", id: "special" },

    { t: "table", head: ["Token", "Model", "Purpose"],
      rows: [
        ["`[CLS]`", "BERT", "Classification token, first position — its final hidden state is the sentence representation"],
        ["`[SEP]`", "BERT", "Separator between sentences, and end of input"],
        ["`[MASK]`", "BERT", "The masked token that the pretraining objective predicts"],
        ["`[PAD]`", "All", "Padding for batch alignment — must be masked out, or attention spends weight on it"],
        ["`[UNK]`", "All", "Unknown token. Byte-level BPE never needs it"],
        ["`<|endoftext|>`", "GPT-2/3", "Document boundary"],
        ["`<s>`, `</s>`", "T5, LLaMA", "Start and end of sequence"]
      ] },

    { t: "exercise", kind: "practice", title: "Train a tokenizer and probe it", difficulty: "core", minutes: 40,
      prompt: "Implement BPE training and encoding, and reproduce the reference's three-merge trace exactly. Then train it on a real corpus at vocabulary sizes of 500, 2,000 and 10,000, and for each record the mean number of tokens per word and the fraction of words that stay whole. Plot both against vocabulary size. Finally, tokenize the same paragraph with a real BERT and GPT-2 tokenizer, and tokenize the same content in two different languages to compare token counts.",
      hints: [
        "Weight the pair counts by word frequency, not by document count.",
        "Apply merges in learned order when encoding, and re-check the same position after a glue.",
        "Mean tokens per word falls steeply at first and then flattens — find the knee."
      ],
      solution: {
        notes: [
          { t: "p", text: "The tokens-per-word curve has a clear knee, and that is how vocabulary size is actually chosen: below it you pay a lot of sequence length for a small vocabulary, above it you pay a lot of embedding parameters for diminishing reductions in length. The knee's position depends on the language — morphologically rich languages like Finnish or Turkish need a larger vocabulary to reach the same tokens-per-word as English, which is one concrete way multilingual models are harder." },
          { t: "p", text: "Comparing real tokenizers, the thing to notice is that GPT-2 attaches the leading space to the token, so `Hello` and `ĠHello` are different IDs, while BERT lowercases and uses `##` to mark continuation. Both are reasonable and they are not interchangeable, which is why a model and its tokenizer must always travel together. Loading the wrong tokenizer produces valid-looking token IDs that mean something else, and nothing errors." },
          { t: "p", text: "The cross-language comparison is the one with practical consequences. I measured a nine-character string with an emoji and two CJK characters costing ten tokens. The same content in English would be two or three. That ratio is a direct consequence of what the training corpus contained, and it shows up as a smaller effective context window and a higher bill for exactly the users whose languages were underrepresented." }
        ]
      } }

  ],

  takeaways: [
    "Word-level gives short sequences and an `[UNK]` problem; character-level has no OOV but long sequences; subword sits between by design.",
    "BPE: count adjacent pairs weighted by word frequency, merge the winner, repeat. The merge count is the vocabulary size.",
    "The reference's trace reproduces exactly: merges `[(u,g), (u,n), (h,ug)]`, and `hugs → ['hug','s']`, `bug → ['b','ug']`.",
    "An unseen word encodes from known pieces; a character never seen has no symbol at all.",
    "Byte-level BPE starts from the 256 bytes, so `[UNK]` cannot occur.",
    "WordPiece divides pair frequency by the product of the parts, which picked a different first merge on the same corpus.",
    "BERT's real output matches the reference; GPT-2's does not — it gives `Ġtransformative` as one token.",
    "`Hello` and `ĠHello` are different tokens, and non-Latin text can cost three to four times more tokens."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "In BPE training, how are adjacent pairs counted?",
      options: ["Once per distinct word containing them", "Weighted by how often each word occurs in the corpus", "Once per document", "By character position"],
      answer: 1,
      why: "`(u,g)` scored 20 because it appears in `hug` (frequency 10), `pug` (5) and `hugs` (5). Weighting by word frequency is what makes BPE reflect the corpus rather than the dictionary — a rare word containing a pair contributes little, which is why frequent words end up as single tokens." },
    { stem: "Why can byte-level BPE never produce an `[UNK]` token?",
      options: ["It has a very large vocabulary", "Its base vocabulary is the 256 possible bytes, and all text is bytes", "It falls back to character level", "It uses a special unknown handler"],
      answer: 1,
      why: "Any text in any script is a sequence of bytes and there are only 256 of them, so every possible input is representable from the base vocabulary up. The cost is that text in scripts underrepresented in training tokenizes into many more pieces — measured at ten tokens for a nine-character string." },
    { stem: "How does WordPiece's merge criterion differ from BPE's?",
      options: ["It merges the least frequent pair", "It divides pair frequency by the product of the parts' frequencies", "It merges alphabetically", "It uses a neural scorer"],
      answer: 1,
      why: "BPE takes `argmax freq(a,b)`; WordPiece takes `argmax freq(a,b)/(freq(a)·freq(b))`, favouring pairs that are common *relative to how common their parts are*. On the reference's corpus BPE merged `(u,g)` at count 20 while WordPiece merged `(g,s)` at count 5, because `g` and `s` are individually rare." },
    { stem: "In GPT-2, are `Hello` and ` Hello` the same token?",
      options: ["Yes — whitespace is stripped", "No — the leading space is part of the token, rendered as `Ġ`", "Only when lowercased", "Yes, but with different IDs"],
      answer: 1,
      why: "Byte-level BPE keeps the space, so `Hello` and `ĠHello` are distinct token IDs. That is why prompt behaviour is sensitive to trailing whitespace in ways that look superstitious until you look at the tokenization — a space before a completion genuinely changes which tokens the model sees." }
  ] },

  interview: { title: "Interview", sub: "Tokenization", questions: [
    { level: "Core", q: "Explain how BPE works.",
      strong: "Count adjacent pairs weighted by frequency, merge the most common, repeat; the ordered merge list is the model.",
      answer: [{ t: "p", text: "You start with every word split into characters. Then you count every adjacent pair of symbols across the corpus, weighted by how often each word occurs, glue the most frequent pair into a single new symbol, and repeat. The number of merges is your vocabulary size, and the ordered list of merges is the entire model — encoding a new word means splitting into characters and applying those rules in the same order. I have run the standard worked example: on a corpus of hug, pug, pun, bun and hugs, the first three merges are `u+g`, then `u+n`, then `h+ug`, after which `hugs` encodes as `hug` plus `s` while `bug`, which never appeared, encodes as `b` plus `ug`. That last part is the value: an unseen word is represented by pieces you do have, so there is no `[UNK]`. It is purely frequency-driven with no linguistic knowledge, which is also why it transfers to any language." }] },
    { level: "Core", q: "BPE, WordPiece or Unigram — what is the difference?",
      strong: "Which pair to merge: most frequent, most surprising, or prune from a large vocabulary instead.",
      answer: [{ t: "p", text: "All three produce subwords and differ only in how they choose. BPE merges the most frequent adjacent pair. WordPiece divides that frequency by the product of the two parts' individual frequencies, so it favours pairs that are common relative to how common their pieces are — on a small corpus I tested, that picked a completely different first merge, `(g,s)` at a count of five rather than `(u,g)` at twenty, because `g` and `s` were individually rare. Unigram goes the other direction: start with a very large candidate vocabulary and iteratively prune the tokens whose removal costs the least corpus likelihood. The practical differences are small; what matters more is byte-level versus character-level base vocabulary, since byte-level makes unknown tokens structurally impossible. The hook I use is: BPE merges the most common pair, WordPiece the surprisingly common pair, Unigram starts big and prunes down." }] },
    { level: "Senior", q: "Why must a model and its tokenizer always travel together?",
      strong: "Token IDs are arbitrary indices into one specific vocabulary — the wrong tokenizer produces valid-looking nonsense.",
      answer: [{ t: "p", text: "Because a token ID means nothing on its own. It is an index into one particular learned vocabulary, and the same integer maps to a different string in a different tokenizer. Loading the right model with the wrong tokenizer produces IDs in a valid range, so nothing errors — the model just receives a sequence that means something else and outputs fluent-looking rubbish. Beyond identity there are conventions that differ: GPT-2 attaches the leading space to the token, so `Hello` and `ĠHello` are distinct, while BERT lowercases and marks continuation with `##`. Special tokens differ too, and their positions matter — BERT's `[CLS]` has to be first because its final hidden state is the sentence representation. So I would always load both from the same checkpoint with `from_pretrained`, and if I saw a model producing confident nonsense I would check the tokenizer before looking at the weights." }] }
  ] }
});
