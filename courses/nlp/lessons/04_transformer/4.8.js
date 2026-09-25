/* ============================================================================
   LESSON 4.8 — Tokenization Deep Dive
   Mirrors 02_Transformers_InDepth.md · §9. BPE training is implemented from
   scratch on the reference's corpus; strict greedy merging gives a different
   order from the reference's (§03), and the reference's BERT id list is
   inconsistent with its own token list (§05) — scratchpad/nlp/n48.py.
   ========================================================================= */
EC.receiveLesson({
  id: "4.8",

  lede: "**The same Hindi sentence costs BERT 11 tokens and GPT-2 26.** Sixteen characters, and one tokenizer needs more than twice the context window of the other to hold them. Tokenisation is the least glamorous part of a transformer and it silently sets your context length, your inference bill and which languages your model is affordable in. This lesson implements BPE training from scratch on the reference's corpus, then measures what the real tokenizers actually do.",

  objectives: [
    "Implement BPE training and encoding from scratch, with the merge rules in order",
    "Explain why subword tokenisation eliminates the unknown-token problem",
    "Distinguish BPE, WordPiece, SentencePiece and Unigram",
    "Measure token cost across languages and content types",
    "Reason about the vocabulary-size trade-off"
  ],

  prerequisites: ["4.7", "1.3"],

  blocks: [

    { t: "h2", n: "01", text: "Why subwords", id: "why" },

    { t: "table",
      head: ["Level", "Vocabulary", "Sequence length", "Fatal problem"],
      rows: [
        ["Word", "500,000+", "Short", "Any unseen word becomes UNK; morphology is invisible"],
        ["Character", "~128", "Very long", "Quadratic attention on long sequences; little meaning per token"],
        ["Subword", "30,000–128,000", "Moderate", "None fatal — this is why everything uses it"]
      ] },

    { t: "p", text: "Subword tokenisation keeps common words whole and splits rare ones into pieces it has seen. *the* is one token; *unhappiness* becomes something like `un` + `happiness`. Frequent words stay short, and nothing is ever unrepresentable." },

    { t: "h2", n: "02", text: "Training BPE, worked", id: "training" },

    { t: "out", text:
"the reference's tiny corpus, characters plus an end marker\n\n  5 x  l o w </w>\n  2 x  l o w e s t </w>\n  6 x  n e w e r </w>\n  3 x  w i d e r </w>" },

    { t: "code", lang: "python", title: "scratchpad/nlp/n48.py — counting pairs and merging", code:
"def pair_counts(vocab):\n    c = collections.Counter()\n    for word, n in vocab.items():\n        for i in range(len(word) - 1):\n            c[(word[i], word[i+1])] += n      # weighted by word frequency\n    return c\n\ndef merge(vocab, pair):\n    new = {}\n    for word, n in vocab.items():\n        i, w = 0, []\n        while i < len(word):\n            if i < len(word) - 1 and (word[i], word[i+1]) == pair:\n                w.append(word[i] + word[i+1]); i += 2\n            else:\n                w.append(word[i]); i += 1\n        new[tuple(w)] = n\n    return new",
      caption: "Train by repeating: count pairs, merge the most frequent, record the rule. The **order** of the rules is part of the trained artefact." },

    { t: "out", text:
"initial pair counts\n  (e,r)        9      (l,o)        7      (n,e)        6\n  (r,</w>)     9      (o,w)        7      (w,</w>)     5\n  (w,e)        8      (e,w)        6      (w,i) (i,d) (d,e)  3\n                                          (e,s) (s,t) (t,</w>) 2\n\nreference lists (e,r)=9, (r,</w>)=9 tied for max, (w,e)=8, (l,o)=7, (o,w)=7" },

    { t: "h2", n: "03", text: "Where strict greedy diverges from the reference", id: "divergence" },

    { t: "out", text:
"always merging the most frequent pair\n\n  merge 1   (e,r)        -> 'er'          freq 9\n  merge 2   (er,</w>)    -> 'er</w>'     freq 9\n  merge 3   (l,o)        -> 'lo'         freq 7\n  merge 4   (lo,w)       -> 'low'        freq 7\n  merge 5   (e,w)        -> 'ew'         freq 6\n  merge 6   (ew,er</w>)  -> 'ewer</w>'   freq 6\n  merge 7   (n,ewer</w>) -> 'newer</w>'  freq 6\n\nthe reference's order:\n  merge 3   (n,e) -> 'ne'   [6]\n  merge 4   (ne,w) -> 'new' [6]\n  merge 5   (l,o) -> 'lo'   [7]\n  merge 6   (lo,w) -> 'low' [7]" },

    { t: "callout", kind: "warn", title: "The reference applies a frequency-6 merge before two frequency-7 merges",
      body: [{ t: "p", text: "After merge 2 the counts are `(l,o) = 7`, `(o,w) = 7`, `(n,e) = 6`, `(e,w) = 6`. BPE's rule is to take the **most frequent** pair, so merges 3 and 4 should be the frequency-7 ones. The reference takes `(n,e)` at 6 first. Its own annotations record the frequencies correctly — `[6]`, `[6]`, `[7]`, `[7]` — so the numbers are right and only the ordering is out of sequence. It matters because the rule order *is* the trained tokenizer: change it and you get different tokens for the same input, as the next section shows." }] },

    { t: "h2", n: "04", text: "Encoding applies the rules in order", id: "encoding" },

    { t: "out", text:
"'lower'   (never seen whole in training)\n  l o w e r </w>\n  apply 'er'      -> l o w er </w>\n  apply 'er</w>'  -> l o w er</w>\n  apply 'lo'      -> lo w er</w>\n  apply 'low'     -> low er</w>\n  -> 2 tokens: ['low', 'er</w>']\n\n'lowest'\n  apply 'lo', 'low'  -> low e s t </w>\n  -> 5 tokens: ['low', 'e', 's', 't', '</w>']     e, s, t never merged\n\n'widest'\n  -> 7 tokens: ['w', 'i', 'd', 'e', 's', 't', '</w>']   full character fallback" },

    { t: "callout", kind: "insight", title: "No unknown-token error in any case",
      body: [{ t: "p", text: "*widest* shares no learned merge with the corpus and still encodes — as seven single characters. That is the guarantee subword tokenisation buys: the base vocabulary contains every character, so the worst case is a long sequence, never a failure. Compare a word-level tokenizer, where an unseen word becomes `UNK` and its identity is destroyed before the model sees it. Note also how the frequency gradient shows up in the output: `lower` costs 2 tokens, `lowest` 5, `widest` 7, tracking how much of each word the training corpus supported." }] },

    { t: "callout", kind: "note", title: "Under strict greedy, 'newer' becomes one token",
      body: [{ t: "p", text: "Greedy merging built `ew`, then `ewer</w>`, then `newer</w>`, so *newer* — which appears 6 times in this four-word corpus — collapses into a **single** token. The reference reports `['new', 'er</w>']`, which follows from its ordering. Both are correct BPE runs of their own rule sets; the discrepancy is entirely the merge order. It is also an artefact of a toy corpus, where one word is 6/16 of all occurrences and so gets merged into wholeness almost immediately. On a real corpus with a 32k vocabulary this does not happen to arbitrary words." }] },

    { t: "h2", n: "05", text: "The four algorithms", id: "algorithms" },

    { t: "dl", items: [
      ["BPE — GPT, LLaMA", "Merge the most frequent adjacent pair. Bottom-up from characters. Simple, deterministic, and the most widely used."],
      ["WordPiece — BERT", "Same loop, but chooses the merge maximising likelihood gain rather than raw frequency. Marks continuations with `##`."],
      ["SentencePiece — T5, LLaMA", "Not an algorithm but a framework: treats input as a raw byte stream with no pre-tokenisation, so it works on languages without spaces. Implements both BPE and Unigram."],
      ["Unigram — SentencePiece variant", "Starts with a large vocabulary and *prunes* the tokens that least affect corpus likelihood. Top-down, the opposite direction from BPE."]
    ] },

    { t: "callout", kind: "insight", title: "Byte-level BPE makes out-of-vocabulary impossible",
      body: [{ t: "p", text: "GPT-2 onward start from the 256 raw **bytes** rather than Unicode characters. Since any input is a byte sequence, everything is encodable — every emoji, every script, every binary blob. That is why GPT-2 and RoBERTa produced **0 unknown tokens** on a string of Devanagari, an emoji and a snowman, and round-tripped it exactly, while BERT emitted 2 `[UNK]` out of 4 tokens and **failed** to round-trip. The `Ġ` you see in GPT-2's tokens is a printable stand-in for a leading space byte." }] },

    { t: "h2", n: "06", text: "The real tokenizers", id: "real" },

    { t: "out", text:
"\"I love transformer models!\"\n\nbert-base-uncased   8 ids   ['[CLS]','i','love','transform','##er','models','!','[SEP]']\ngpt2                5 ids   ['I','Ġlove','Ġtransformer','Ġmodels','!']\nroberta-base        7 ids   ['<s>','I','Ġlove','Ġtransformer','Ġmodels','!','</s>']\n\nbert input_ids: [101, 1045, 2293, 10938, 2121, 4275, 999, 102]\nreference says: [101, 1045, 2293, 19081, 4275, 999, 102]" },

    { t: "callout", kind: "warn", title: "The reference's id list contradicts its own token list",
      body: [{ t: "p", text: "The reference prints **7** ids but then shows **8** tokens including both `transform` and `##er` — those cannot both be right. Measured, BERT splits *transformer* into `transform` (10938) and `##er` (2121), giving 8 ids total. The reference's id list has a single 19081 where those two belong, which would correspond to *transformer* as one token. Its `convert_ids_to_tokens` line is the correct one. Worth noticing that GPT-2 keeps *transformer* whole in one token while BERT splits it — a direct consequence of vocabulary size, 50,257 against 30,522." }] },

    { t: "h2", n: "07", text: "What tokenisation costs", id: "cost" },

    { t: "out", text:
"tokens required, same text, no special tokens\n\ntext              chars    BERT    GPT-2   RoBERTa\nplain english      44       10      10      10\ncode               55       27      24      24\nnumbers            47       18      16      16\ngerman compound    43       16      18      18\nemoji              16        5      12      12\nhindi              16       11      26      26" },

    { t: "callout", kind: "crit", title: "Hindi costs GPT-2 more than one token per character",
      body: [{ t: "p", text: "Sixteen characters becoming **26** tokens means the byte-level BPE is spending multiple tokens per character — Devanagari is multi-byte in UTF-8 and the merge rules, trained on a mostly-English corpus, never learned to combine those byte sequences. The consequences are concrete and unfair: the same content consumes more than twice the context window, costs more than twice as much per API call, and leaves less room for the actual task. This is a well-documented equity problem with English-centric tokenizers, and it is invisible unless you measure it. If you serve non-English users, token cost per language belongs on your dashboard." }] },

    { t: "p", text: "Note also that plain English costs all three tokenizers exactly 10 tokens — the differences only appear once you leave the distribution the vocabulary was built for. Code costs BERT 27 against GPT-2's 24, and numbers 18 against 16, both cases where BERT's smaller and more English-word-oriented vocabulary has to split more." },

    { t: "h2", n: "08", text: "Choosing a vocabulary size", id: "vocab" },

    { t: "out", text:
"BERT      30,522    WordPiece\nGPT-2     50,257    byte-level BPE\nGPT-4    ~100,000   BPE (tiktoken)\nLLaMA 2   32,000    SentencePiece BPE\nLLaMA 3  128,000    BPE (tiktoken)" },

    { t: "callout", kind: "tradeoff", title: "Larger vocabulary buys shorter sequences and costs embedding parameters",
      body: [{ t: "p", text: "A bigger vocabulary means fewer tokens per sentence — cheaper inference, more content per context window, better coverage of other languages. It also means a larger embedding matrix at `vocab_size × d_model`, and each token appears less often in training so its embedding is learned from less evidence. At LLaMA 3's 128,000 by 4096, the embedding matrix alone is 524M parameters, and it is typically tied with the output projection to avoid paying twice. The trend is firmly upward — 30k in 2018, 128k now — because context windows grew and multilingual coverage became a priority, and because the embedding cost is a shrinking fraction of a model that is otherwise getting much larger." }] },

    { t: "exercise", title: "Train and measure a tokenizer",
      tasks: [
        "Implement BPE training and confirm the merge order is strictly by frequency. Encode a word not in the corpus and trace every rule application.",
        "Change the merge order deliberately and find an input whose tokenisation changes as a result.",
        "Measure tokens per character for your own corpus across three tokenizers and pick the cheapest.",
        "If you serve non-English text, compute token cost per language and translate it into money per request.",
        "Tokenise the same numbers with different tokenizers and find one that splits digits in a way that would hurt arithmetic."
      ] }
  ],

  takeaways: [
    "Subword tokenisation keeps common words whole and splits rare ones, so nothing is ever unrepresentable — the worst case is a long sequence, never UNK.",
    "BPE training is: count adjacent pairs weighted by frequency, merge the most frequent, record the rule. The ordered rule list is the trained artefact.",
    "The reference's worked example applies a frequency-6 merge before two frequency-7 merges; strict greedy gives a different order and different tokens.",
    "Under strict greedy, 'newer' collapsed to a single token while 'widest' fell back to all 7 characters — token count tracks corpus support.",
    "BPE merges by frequency, WordPiece by likelihood gain, Unigram prunes a large vocabulary downward, SentencePiece is the byte-stream framework around them.",
    "Byte-level BPE starts from the 256 bytes, so GPT-2 and RoBERTa gave 0 unknown tokens and round-tripped exactly where BERT emitted 2 UNK and failed.",
    "The reference's BERT id list has 7 entries but its token list has 8; measured, 'transformer' splits into transform (10938) and ##er (2121).",
    "The same Hindi text costs BERT 11 tokens and GPT-2 26 — more than one token per character, doubling context use and cost for non-English users.",
    "Plain English costs all three tokenizers 10 tokens; differences only appear outside the vocabulary's home distribution.",
    "Bigger vocabularies mean shorter sequences but a larger embedding matrix and less evidence per token; LLaMA 3's 128k × 4096 is 524M parameters."
  ],

  quiz: { title: "Check yourself", questions: [
    { stem: "Why does subword tokenisation eliminate the unknown-token problem?",
      options: ["It has a very large vocabulary", "The base vocabulary contains every character (or byte), so the worst case is a long sequence of small pieces", "It maps unknown words to the nearest known word", "It uses a special UNK embedding"],
      answer: 1,
      why: "'widest' shared no learned merge with the training corpus and still encoded — as seven single characters. A word-level tokenizer would have emitted UNK and destroyed the word's identity before the model saw it. Byte-level BPE strengthens this further: starting from the 256 bytes makes every possible input encodable." },
    { stem: "What is the trained artefact of BPE, and why does its order matter?",
      options: ["A vocabulary set", "The ordered list of merge rules — applying them in a different order produces different tokens for the same input", "A frequency table", "A neural network"],
      answer: 1,
      why: "Encoding replays the merges in exactly the order they were learned. The reference's example applies (n,e) at frequency 6 before two frequency-7 merges, and that ordering difference is why it reports 'newer' as two tokens where strict greedy merging produces one." },
    { stem: "Why did the Hindi text cost GPT-2 26 tokens for 16 characters?",
      options: ["A tokenizer bug", "Devanagari is multi-byte in UTF-8 and the merge rules, trained on mostly English, never learned to combine those byte sequences", "Hindi has no word boundaries", "The text contained unknown characters"],
      answer: 1,
      why: "Byte-level BPE can always encode the text — there were 0 unknown tokens — but without learned merges it falls back to near-per-byte tokens. The result is more than one token per character, so the same content uses double the context window and costs double per call. It is an equity problem that is invisible until measured." },
    { stem: "What is the cost of increasing vocabulary size?",
      options: ["Slower tokenisation", "A larger embedding matrix at vocab_size × d_model, and each token appearing less often in training", "Worse coverage of rare words", "Longer sequences"],
      answer: 1,
      why: "Larger vocabularies shorten sequences and improve multilingual coverage, which is why the trend runs from BERT's 30,522 to LLaMA 3's 128,000. The cost is parameters — 128,000 × 4096 is 524M for the embedding alone, usually tied with the output projection — and less training evidence per token." }
  ] },

  interview: { title: "Interview", sub: "Tokenization", questions: [
    { level: "Core", q: "How does BPE work?",
      strong: "Iteratively merge the most frequent adjacent pair; the ordered merge list is the tokenizer.",
      answer: [{ t: "p", text: "You start with every word split into characters plus an end-of-word marker, then repeat a loop: count every adjacent symbol pair weighted by word frequency, merge the most frequent pair into a new symbol, and record that merge as a rule. Stop when you hit your target vocabulary size. The trained artefact is the ordered list of merge rules, and the ordering matters — encoding a new word means replaying those merges in exactly the order they were learned. So the same corpus with a different merge order is a different tokenizer that produces different tokens. The property that makes this worth doing is graceful degradation: common words end up as single tokens because their merges happened early, rare words fall back to pieces, and a word sharing nothing with the training corpus still encodes as individual characters rather than becoming UNK. I implemented this on a toy corpus and saw the gradient directly — 'lower' cost 2 tokens, 'lowest' 5, 'widest' 7, tracking how much of each word the corpus supported. Byte-level BPE, from GPT-2 onward, starts from the 256 raw bytes instead of characters, which makes out-of-vocabulary structurally impossible." }] },
    { level: "Senior", q: "Why does tokenisation matter for a production system?",
      strong: "It sets context length, cost and cross-lingual fairness — and it is rarely measured.",
      answer: [{ t: "p", text: "Because it silently determines three things that show up on your bill. First, effective context length: your window is in tokens, not characters, so a tokenizer that's inefficient on your content gives you less usable context than the spec suggests. Second, cost — per-token pricing means tokenisation efficiency is directly money. Third, and the one people miss, cross-lingual fairness. I measured the same 16-character Hindi sentence costing BERT 11 tokens and GPT-2 26 — more than one token per character, because Devanagari is multi-byte in UTF-8 and the merge rules, trained on mostly English text, never learned to combine those byte sequences. So a Hindi-speaking user gets less than half the effective context and pays more than double for the same content. Nothing errors; byte-level BPE encodes it fine, with zero unknown tokens. It's simply expensive, and invisible unless you look. The practical upshot is that if you serve multiple languages I'd put tokens-per-character by language on a dashboard, and I'd treat it as a real input to model selection rather than an implementation detail. There's a related operational point too: a tokenizer is part of the model artefact. Change it and every embedding index means something different, so tokenizer and checkpoint have to be versioned together." }] },
    { level: "Senior", q: "How would you choose a vocabulary size for a new model?",
      strong: "From the corpus's language mix and the embedding budget, measuring tokens per character empirically.",
      answer: [{ t: "p", text: "I'd start by measuring rather than picking a number. Train candidate tokenizers at a few sizes — say 32k, 64k and 128k — on the actual corpus, and measure tokens per character on held-out text broken down by language and content type, because averages hide exactly the cases that matter. Then weigh that against the embedding cost: the matrix is vocab_size by d_model, so at 128,000 by 4096 you're spending 524 million parameters before any layer exists, typically tied with the output projection so you pay once rather than twice. The trade is real in both directions. A bigger vocabulary shortens every sequence, which is compounding value — cheaper inference, more content per context window, and since attention is quadratic, shorter sequences are disproportionately cheaper. A smaller vocabulary means each token is seen more often during training, so its embedding is learned from more evidence, which matters more the smaller your corpus is. The industry trend is firmly upward, from BERT's 30,522 to LLaMA 3's 128,000, driven by multilingual coverage and by the embedding being a shrinking fraction of models that are otherwise growing fast. For a multilingual model I'd lean large and check explicitly that the low-resource languages in my mix aren't landing near one token per character." }] }
  ] }
});
