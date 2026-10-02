EC.receiveLesson({
  id: "8.2",

  lede: "Perplexity is the exponential of average per-token cross-entropy, and the reference warns that it \u201cisn\u2019t comparable across tokenizers\u201d. That warning understates the size of the problem. Holding the model, the text and the **total measured surprise** fixed at 245.05 nats, perplexity would read **86.10** under T5\u2019s tokenisation and **183.80** under BERT\u2019s \u2014 a 2.13\u00d7 range produced by nothing but how the text was split. Bits-per-byte removes it, because its denominator is bytes rather than tokens.",

  objectives: [
    "Compute perplexity from token log-probabilities",
    "Interpret a perplexity value as an effective branching factor",
    "Quantify how much tokenisation alone moves perplexity",
    "Compute bits-per-byte and explain why it is tokenizer-independent",
    "State what perplexity is and is not valid for"
  ],

  prerequisites: ["8.1", "7.2"],

  blocks: [

    { t: "h2", n: "01", id: "definition", text: "The definition, computed",
      sub: "Cross-entropy, exponentiated" },

    { t: "math", tex: "\\text{PPL}(X) = \\exp\\!\\left(-\\frac{1}{N}\\sum_{i=1}^{N}\\log p(x_i \\mid x_{<i})\\right) = e^{H}" },

    { t: "p", text: "This is 7.2\u2019s pretraining loss with an exponential on the front. \\(H\\) is the mean negative log-probability per token \u2014 in nats if you use natural log \u2014 and perplexity is \\(e^H\\), or \\(2^H\\) if you measured in bits." },

    { t: "code", lang: "python", title: "g82.py \u00a7A \u2014 on real text with gpt2", code: `ids = tok(TEXT, return_tensors="pt")
out = model(**ids, labels=ids["input_ids"])
H = out.loss.item()                 # mean NLL per token, nats
ppl = math.exp(H)`,
      out: `  text: 244 characters, 244 bytes, 48 gpt2 tokens
  cross-entropy H : 5.1052 nats/token
  perplexity e^H  : 164.8829

  reading: the model is choosing among ~165 equally-likely options per token.`,
      hl: [4, 6],
      caption: "The intuition in the last line is the useful one \u2014 perplexity is an effective branching factor." },

    { t: "callout", kind: "insight", title: "165 is high, and the reason is informative",
      body: [
        { t: "p", text: "My test text is about retrieval-augmented generation and cross-encoder latency. gpt2 is from 2019 and has never seen that vocabulary in that arrangement, so it is genuinely surprised \u2014 a perplexity of 165 means it is effectively choosing among 165 options per token." },
        { t: "p", text: "That is the metric working correctly, and it illustrates the dependence nobody mentions alongside the tokenizer one: perplexity is a property of a **model and a corpus together**. The same model on 2019 news text would score far lower, and reporting a perplexity without saying on what is reporting half a number." },
        { t: "p", text: "The reference\u2019s valid use \u2014 comparing checkpoints on the *same* tokenizer and dataset \u2014 holds both of those fixed, which is exactly why it is the valid use." }
      ] },

    { t: "code", lang: "python", title: "the reference's one-liner, which is the whole metric", code: `import math
def perplexity(token_logprobs):     # logprobs of the actual next tokens, natural log
    return math.exp(-sum(token_logprobs) / len(token_logprobs))`,
      caption: "Note it takes log-probabilities of the *realised* tokens. Everything hard is in producing that list." },

    { t: "h2", n: "02", id: "tokenizer", text: "The tokenizer problem, measured",
      sub: "A bigger effect than most model differences" },

    { t: "p", text: "The denominator in perplexity is a token count, and token count is a property of the tokenizer rather than of the text. So the same text splits differently and the average is taken over a different number of items." },

    { t: "code", lang: "python", title: "g82.py \u00a7B \u2014 the same text under five tokenizers", code: `for name in ("gpt2", "bert-base-uncased", "t5-small",
             "distilbert-base-uncased", "roberta-base"):
    n = len(AutoTokenizer.from_pretrained(name)(TEXT)["input_ids"])`,
      out: `  tokenizer                              tokens    chars/token
  gpt2                                       48           5.08
  bert-base-uncased                          47           5.19
  t5-small                                   55           4.44
  distilbert-base-uncased                    47           5.19
  roberta-base                               50           4.88

  token count ranges 47 to 55 -- a 17.0% spread on identical text.`,
      hl: [4, 8],
      caption: "17% variation in the denominator before any model has been compared." },

    { t: "callout", kind: "insight", title: "Total surprise is fixed by the text; the average is not",
      body: [
        { t: "p", text: "The information content of a passage is a property of the passage and the model, not of how you chop it up. gpt2 assigns this text **245.05 nats** in total \u2014 that is the measured quantity and it does not change if you rename the pieces." },
        { t: "p", text: "Perplexity divides that fixed total by a token count that varies by 17%. So a model that encodes text *equally well* reports a **higher** perplexity when it uses fewer tokens, because the same surprise is spread over fewer items." },
        { t: "p", text: "Which inverts the naive reading in a way worth holding on to: an efficient tokenizer that uses fewer tokens per character makes a model look *worse* on perplexity while being strictly better at serving, since 7.2\u2019s inference cost is per token." }
      ] },

    { t: "code", lang: "python", title: "g82.py \u00a7B \u2014 one measured total NLL, five tokenisations", code: `total_nll = H * n_tok          # 245.0513 nats, measured from gpt2
for name, n in counts.items():
    print(name, n, math.exp(total_nll / n))`,
      out: `  gpt2 total NLL for this text: 245.0513 nats (measured)

  if tokenised as                        tokens   PPL would read
  bert-base-uncased                          47         183.8017
  distilbert-base-uncased                    47         183.8017
  gpt2                                       48         164.8829
  roberta-base                               50         134.4277
  t5-small                                   55          86.0973

  SAME model, SAME text, SAME total surprise -- PPL from 86.10 to 183.80`,
      hl: [5, 9, 11],
      caption: "A 2.13\u00d7 range on one model and one text. Published perplexity differences between models are routinely smaller than this." },

    { t: "callout", kind: "trap", title: "Be clear about what is measured here and what is arithmetic",
      body: [
        { t: "p", text: "The 245.05 nats is measured \u2014 gpt2\u2019s actual total negative log-probability for that passage. The five token counts are measured \u2014 real tokenizers on the same string. The PPL column is then **arithmetic**: what perplexity would read if that fixed total were averaged over each count." },
        { t: "p", text: "What it is *not* is five models evaluated. A different tokenizer usually comes with a different model, which would also change the total NLL \u2014 so a real cross-tokenizer comparison confounds the two effects rather than isolating this one." },
        { t: "p", text: "Isolating it is the point. The comparison shows that **before any model difference**, the reporting convention alone spans 2.13\u00d7, which is why the two effects cannot be untangled from a perplexity number and why the metric is not comparable across tokenizers." }
      ] },

    { t: "h2", n: "03", id: "bpb", text: "Bits-per-byte",
      sub: "The same quantity with a denominator that does not move" },

    { t: "math", tex: "\\text{BPB} = \\frac{\\text{total negative log-probability in bits}}{\\text{number of bytes of text}}" },

    { t: "code", lang: "python", title: "g82.py \u00a7C \u2014 computed, and reconciled against \u00a7A", code: `bpb = total_nll / math.log(2) / n_bytes`,
      out: `  total NLL  : 245.0513 nats = 353.5343 bits
  bytes      : 244
  bits-per-byte: 1.4489

  Reconstructed PPL at gpt2's tokenisation: 164.8829 (matches A: 164.8829)`,
      hl: [3, 5],
      caption: "The round-trip check matters \u2014 it confirms BPB carries the same information, differently normalised." },

    { t: "callout", kind: "good", title: "Why this fixes the comparison",
      body: [
        { t: "p", text: "The numerator is total information content and the denominator is bytes of text. Neither depends on tokenisation \u2014 bytes are a property of the string and the total surprise is a property of the model-and-string pair. So BPB is comparable between models with different vocabularies." },
        { t: "p", text: "The reconciliation line is the check worth doing: recovering 164.8829 from BPB confirms nothing was lost, only renormalised. BPB and perplexity are the same measurement with different units, and only one of them has a stable denominator." }
        ,{ t: "p", text: "A reading for 1.4489 bits per byte: gpt2 needs about 1.45 bits to encode each byte of this text, against 8 bits if it knew nothing \u2014 so it compresses it about 5.5\u00d7. That framing also explains why language modelling and compression are the same problem." }
      ] },

    { t: "viz", title: "Same model, same text, same surprise \u2014 five perplexities", caption: "245.05 nats divided by a token count that varies 17% gives a 2.13x range in reported PPL.",
      svg: `<svg viewBox="0 0 760 280" width="100%" role="img" aria-label="Perplexity varies with tokenisation while bits per byte does not">
  <text x="16" y="22" class="s-label">ONE MEASURED TOTAL: 245.05 NATS \u2014 REPORTED AS PERPLEXITY</text>
  <line x1="130" y1="180" x2="700" y2="180" stroke="var(--line)" stroke-width="1.2"/>
  <text x="122" y="56" text-anchor="end" class="s-mono" style="font-size:9px">190</text>
  <text x="122" y="184" text-anchor="end" class="s-mono" style="font-size:9px">80</text>

  <rect x="166" y="52" width="76" height="128" rx="2" class="s-fill" style="stroke:var(--crit)" stroke-width="1.6"/>
  <text x="204" y="44" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--crit)">183.80</text>
  <text x="204" y="198" text-anchor="middle" class="s-sub" style="font-size:9px">bert</text>
  <text x="204" y="211" text-anchor="middle" class="s-mono" style="font-size:8px">47 tok</text>

  <rect x="276" y="74" width="76" height="106" rx="2" class="s-fill" style="stroke:var(--warn)" stroke-width="1.4"/>
  <text x="314" y="66" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--warn)">164.88</text>
  <text x="314" y="198" text-anchor="middle" class="s-sub" style="font-size:9px">gpt2</text>
  <text x="314" y="211" text-anchor="middle" class="s-mono" style="font-size:8px">48 tok</text>

  <rect x="386" y="109" width="76" height="71" rx="2" class="s-fill" style="stroke:var(--warn)" stroke-width="1.4"/>
  <text x="424" y="101" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--warn)">134.43</text>
  <text x="424" y="198" text-anchor="middle" class="s-sub" style="font-size:9px">roberta</text>
  <text x="424" y="211" text-anchor="middle" class="s-mono" style="font-size:8px">50 tok</text>

  <rect x="496" y="157" width="76" height="23" rx="2" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="534" y="149" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--good)">86.10</text>
  <text x="534" y="198" text-anchor="middle" class="s-sub" style="font-size:9px">t5</text>
  <text x="534" y="211" text-anchor="middle" class="s-mono" style="font-size:8px">55 tok</text>

  <line x1="608" y1="40" x2="608" y2="190" stroke="var(--line)" stroke-width="1" stroke-dasharray="3 3"/>
  <rect x="620" y="90" width="90" height="50" rx="4" class="s-fill-bg" style="stroke:var(--good)" stroke-width="1.8"/>
  <text x="665" y="110" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--good)">BPB</text>
  <text x="665" y="126" text-anchor="middle" class="s-mono" style="font-size:11px;fill:var(--good)">1.4489</text>
  <text x="665" y="156" text-anchor="middle" class="s-sub" style="font-size:9px">one value</text>
  <text x="665" y="169" text-anchor="middle" class="s-sub" style="font-size:9px">for all five</text>

  <text x="16" y="240" class="s-mono" style="fill:var(--crit)">2.13x range from tokenisation alone \u2014 larger than most published model gaps</text>
  <text x="16" y="262" class="s-sub">an efficient tokenizer uses fewer tokens, so it reports WORSE perplexity while being cheaper to serve</text>
</svg>` },

    { t: "h2", n: "04", id: "validity", text: "What perplexity is for",
      sub: "A narrow but real use" },

    { t: "table",
      head: ["Use", "Valid?", "Why"],
      rows: [
        ["Comparing checkpoints of one training run", "**Yes**", "Same tokenizer, same held-out set \u2014 both confounds held fixed"],
        ["Comparing two models with the same tokenizer on the same data", "**Yes**", "The intended use"],
        ["Comparing models with different tokenizers", "**No**", "Measured above: 2.13\u00d7 range from tokenisation alone"],
        ["Comparing the same model on different corpora", "**No**", "Perplexity is a model-and-corpus property; 165 here reflects unfamiliar vocabulary"],
        ["Judging an instruction-tuned chat model", "**No**", "Low perplexity is not helpfulness, safety or correctness"],
        ["Tokenizer-independent comparison", "Use **BPB**", "Denominator is bytes, which nothing can game"]
      ] },

    { t: "callout", kind: "warn", title: "The chat-model exclusion is the one that matters commercially",
      body: [
        { t: "p", text: "Instruction tuning generally *raises* perplexity on generic text, because it concentrates probability mass on assistant-style continuations rather than on whatever the corpus does next. 7.1 measured the mechanism from the other side \u2014 a base model put 33.84% on a newline after a question, which is good perplexity and useless behaviour." },
        { t: "p", text: "So a chat model with worse perplexity than its base model is the expected outcome, not a regression. Using perplexity to choose between instruction-tuned models will systematically prefer the least aligned one." },
        { t: "p", text: "What perplexity cannot see is the whole of what 8.4 through 8.7 measure: whether answers are correct, helpful, safe or well-calibrated. It is a fluency and fit measure, and fluency stopped being the bottleneck years ago." }
      ] },

    { t: "exercise", kind: "build", title: "Compute perplexity and bits-per-byte on your own data", difficulty: "core", minutes: 30,
      body: "Compute perplexity and bits-per-byte for a model on a held-out sample of your own text, then quantify the tokenisation sensitivity by counting tokens for the same text under several tokenizers and reporting what perplexity would read under each.",
      requirements: [
        "Compute cross-entropy and perplexity from the definition, not from a library helper",
        "Report token count, byte count and characters per token",
        "Compute bits-per-byte and reconcile it back to perplexity",
        "Count tokens under at least three tokenizers and report the implied PPL range",
        "State which comparisons your numbers support and which they do not"
      ],
      hint: "Reconcile BPB back to perplexity as a check. If the round trip does not land on your original figure, something is wrong with a log base or a token count.",
      solution: { lang: "python", title: "both metrics, and the sensitivity check", code: `import math, torch
from transformers import AutoModelForCausalLM, AutoTokenizer

def ppl_and_bpb(model, tok, text):
    ids = tok(text, return_tensors="pt")
    with torch.no_grad():
        out = model(**ids, labels=ids["input_ids"])
    n_tok   = ids["input_ids"].shape[1]
    H       = out.loss.item()                   # mean NLL per token, nats
    total   = H * n_tok                         # total nats -- the invariant
    n_bytes = len(text.encode("utf8"))
    return {
        "tokens": n_tok, "bytes": n_bytes,
        "H_nats_per_token": H,
        "perplexity": math.exp(H),
        "total_nats": total,
        "bits_per_byte": total / math.log(2) / n_bytes,
    }

m = ppl_and_bpb(model, tok, TEXT)
# the round-trip check: BPB -> total bits -> total nats -> per-token -> PPL
recovered = math.exp(m["bits_per_byte"] * math.log(2) * m["bytes"] / m["tokens"])
print("perplexity %.4f, recovered from BPB %.4f" % (m["perplexity"], recovered))
print("bits per byte %.4f  (compresses %.1fx vs 8 bits/byte)"
      % (m["bits_per_byte"], 8 / m["bits_per_byte"]))

# how much is the reporting convention worth?
for name in ("gpt2", "bert-base-uncased", "t5-small"):
    n = len(AutoTokenizer.from_pretrained(name)(TEXT)["input_ids"])
    print("%-22s %3d tokens -> PPL would read %8.4f"
          % (name, n, math.exp(m["total_nats"] / n)))`,
        out: `  perplexity 164.8829, recovered from BPB 164.8829
  bits per byte 1.4489  (compresses 5.5x vs 8 bits/byte)
  gpt2                    48 tokens -> PPL would read 164.8829
  bert-base-uncased       47 tokens -> PPL would read 183.8017
  t5-small                55 tokens -> PPL would read  86.0973`,
        notes: [
          { t: "p", text: "**`total_nats` is the quantity to think in.** It is a property of the model and the text, and everything else in the dictionary is that number renormalised \u2014 per token for perplexity, per byte for BPB. Once you hold that, the tokenizer problem is obvious rather than a rule to remember." },
          { t: "p", text: "**The round-trip check earns its place.** Recovering 164.8829 exactly confirms the log base and the token count are consistent; a mismatch there is the most common bug in hand-rolled perplexity code, usually a stray factor of ln 2." },
          { t: "p", text: "**The compression framing is worth reporting.** 1.45 bits per byte against 8 is a 5.5\u00d7 compression, which makes it concrete that a language model is a compressor and that better modelling *is* better compression." },
          { t: "p", text: "**The last three lines are the finding to show anyone quoting cross-model perplexity.** A 2.13\u00d7 spread arises before any model difference, from the reporting convention alone \u2014 and published perplexity gaps between models are routinely smaller than that." },
          { t: "p", text: "One caveat on the last block, stated in the lesson too: those are *arithmetic*, not five models evaluated. A different tokenizer normally comes with a different model, which would change the total nats as well \u2014 so a real comparison confounds the two effects, which is exactly the reason the metric does not transfer." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Think in **total nats**, not perplexity. Total surprise is a property of a model and a text; perplexity divides it by a token count and bits-per-byte divides it by a byte count. Only the second denominator is a property of the text." },
        { t: "p", text: "So perplexity is valid for comparing checkpoints on a fixed tokenizer and dataset, and invalid for almost everything else \u2014 including chat models, where instruction tuning *raises* it and preferring low perplexity would select the least aligned model." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cModel A has perplexity 8.2 and model B has 11.4. Is A better?\u201d**" },
        { t: "p", text: "Not necessarily, and I would want three things before answering: the same tokenizer, the same held-out dataset, and confirmation that neither is instruction-tuned." },
        { t: "p", text: "The tokenizer is the one that usually invalidates the comparison, and the size of the effect surprised me when I measured it. I took one model, one passage, and its real total surprise of 245.05 nats, then divided by the token counts five real tokenizers produce for that same string. Perplexity would read 86.10 under T5\u2019s tokenisation and 183.80 under BERT\u2019s \u2014 a 2.13\u00d7 range with no model difference at all, which is larger than most published gaps between models." },
        { t: "p", text: "And it inverts in a way people do not expect: an efficient tokenizer uses fewer tokens, so the same total surprise is spread over fewer items and perplexity looks *worse* \u2014 while the model is cheaper to serve, since inference cost is per token." },
        { t: "p", text: "The fix for a cross-tokenizer comparison is bits-per-byte: total negative log-probability in bits divided by bytes of text. The denominator is a property of the string, so nothing can game it. On my example that was 1.4489 bits per byte, and I would check it round-trips back to the perplexity figure to make sure no log base went astray." },
        { t: "p", text: "The dataset matters too, because perplexity is a model-and-corpus property. My figure of 165 on that passage was high because the text was about retrieval and cross-encoders and gpt2 is from 2019 \u2014 genuine surprise, correctly measured, and meaningless against a number from a different corpus." },
        { t: "p", text: "If either model is instruction-tuned I would drop perplexity entirely. Instruction tuning concentrates mass on assistant-style continuations and so usually raises perplexity on generic text \u2014 I measured a base model putting 33.84% on a newline after a question, which is excellent perplexity and useless behaviour. Choosing on perplexity there systematically prefers the least aligned model." }
      ] }
  ],

  takeaways: [
    "**Perplexity is e to the mean per-token cross-entropy** \u2014 7.2's pretraining loss with an exponential on it.",
    "**Read it as an effective branching factor**: 164.88 means the model is choosing among about 165 equally-likely options per token.",
    "**Think in total nats instead.** Total surprise is a property of a model and a text; perplexity and BPB are that number with different denominators.",
    "**Tokenisation alone spans 2.13\u00d7**: a measured 245.05 nats reads as PPL 86.10 under T5's split and 183.80 under BERT's.",
    "**Token counts varied 17% on identical text** across five real tokenizers, before any model was compared.",
    "**So an efficient tokenizer reports worse perplexity while being cheaper to serve**, since inference cost is per token.",
    "**That column is arithmetic, not five models evaluated** \u2014 a real cross-tokenizer comparison also changes the total nats, which is why the two effects cannot be separated.",
    "**Bits-per-byte fixes it**: total bits over bytes of text, with a denominator nothing can game \u2014 1.4489 here, a 5.5\u00d7 compression against 8 bits.",
    "**Reconcile BPB back to perplexity as a check**, since a stray factor of ln 2 is the usual bug in hand-rolled code.",
    "**Perplexity is also a corpus property** \u2014 165 was high because gpt2 has never seen this vocabulary, which is the metric working correctly.",
    "**Never use it to judge a chat model**: instruction tuning raises perplexity, so preferring low perplexity selects the least aligned model.",
    "**Valid use is narrow** \u2014 checkpoints or models sharing a tokenizer and a held-out set, where both confounds are held fixed."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Holding one model, one text and a measured total of 245.05 nats fixed, perplexity reads 86.10 under T5's tokenisation and 183.80 under BERT's. What causes this?",
        options: [
          "T5 models the text better, producing lower surprise per token",
          "Perplexity divides a fixed total surprise by a token count that varies with the tokenizer \u2014 fewer tokens means the same surprise spread over fewer items, so higher perplexity",
          "The tokenizers produce different text after decoding, changing what is measured",
          "BERT is bidirectional, so its perplexity is not comparable in principle"
        ],
        answer: 1,
        why: "Total information content is a property of the model and the string, not of how it is chopped up \u2014 and the five real tokenizers varied by 17% in token count on identical text. T5's 55 tokens spread 245.05 nats more thinly than BERT's 47, so T5's split reports a lower average. No model difference is involved: this is one model's measured total, renormalised five ways, which is why the metric cannot transfer across tokenizers." },

      { stem: "Why is bits-per-byte comparable across models with different vocabularies?",
        options: [
          "Because it uses base-2 logarithms, which are tokenizer-independent",
          "Because its denominator is bytes of text \u2014 a property of the string that no tokenizer choice can change",
          "Because it averages over a larger number of units, reducing variance",
          "Because it normalises by model size as well as text length"
        ],
        answer: 1,
        why: "The numerator is total negative log-probability, a property of the model and the text, and the denominator is the byte length of the text, which is fixed. Neither depends on tokenisation, so the ratio is stable where perplexity is not. The log base only changes units \u2014 converting nats to bits \u2014 and reconciling BPB back to perplexity is worth doing as a check, since a stray factor of ln 2 is the usual bug." },

      { stem: "An instruction-tuned chat model has higher perplexity on generic text than the base model it was tuned from. What does this indicate?",
        options: [
          "A regression \u2014 the fine-tuning damaged the model's language modelling",
          "The expected outcome \u2014 instruction tuning concentrates probability on assistant-style continuations rather than on whatever the corpus does next",
          "A tokenizer mismatch introduced during fine-tuning",
          "Overfitting to the instruction dataset"
        ],
        answer: 1,
        why: "Perplexity measures fit to the evaluation corpus, and an aligned model is deliberately no longer trying to continue arbitrary text the way the internet would. A base model placing 33.84% of its mass on a newline after a question has excellent perplexity and useless behaviour, which is the same fact from the other direction. Consequently, choosing between instruction-tuned models on perplexity systematically prefers the least aligned one." },

      { stem: "A model scores perplexity 165 on a passage about retrieval-augmented generation. What should you conclude?",
        options: [
          "The model is poor, since competent models score in single digits",
          "Little without knowing the corpus \u2014 perplexity is a model-and-corpus property, and 165 reflects genuinely unfamiliar vocabulary for a 2019-era model",
          "The tokenizer is splitting technical terms inefficiently",
          "The text is too short for a reliable estimate"
        ],
        answer: 1,
        why: "Single-digit perplexities are quoted on standard corpora that models were trained to fit; a 2019-era model on 2025 technical vocabulary is legitimately surprised, and the metric is reporting that correctly. This is the second confound alongside tokenisation, and it is why the valid use holds both fixed \u2014 comparing checkpoints or models on the same tokenizer *and* the same held-out set. A perplexity quoted without its corpus is half a number." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "The intrinsic metric and its two confounds",
    questions: [
      { level: "core",
        q: "What is perplexity and what is it good for?",
        strong: "A strong answer gives the definition, the intuition and the narrow valid use.",
        answer: [
          { t: "p", text: "It is the exponential of the average per-token cross-entropy on held-out text \u2014 the same loss used for pretraining, with an exponential on the front. Lower is better." },
          { t: "p", text: "The useful intuition is an effective branching factor: perplexity is roughly how many equally-likely options the model is choosing among at each token. I measured gpt2 at 164.88 on a passage about retrieval systems, which means it is effectively picking among 165 options \u2014 genuinely surprised, because it is a 2019 model seeing 2025 vocabulary." },
          { t: "p", text: "What it is good for is narrow: comparing checkpoints within a training run, or two models that share a tokenizer, on the same held-out set. Both of those hold the two confounds fixed \u2014 tokenisation and corpus." },
          { t: "p", text: "What it is not good for is judging an instruction-tuned model, because alignment raises perplexity on generic text. A base model that puts 33.84% of its mass on a newline after a question has great perplexity and will not answer you, so selecting on low perplexity picks the least aligned model." }
        ] },

      { level: "advanced",
        q: "Why can't you compare perplexity across tokenizers, and what would you use instead?",
        strong: "A strong answer quantifies the effect and notes the inversion.",
        answer: [
          { t: "p", text: "Because the denominator is a token count, which is a property of the tokenizer rather than of the text. Total surprise is fixed by the model and the string; dividing it by a different number of pieces gives a different average." },
          { t: "p", text: "The size of the effect is the part worth knowing. I took one model\u2019s measured total of 245.05 nats for a passage and divided by the token counts five real tokenizers produce for that same string \u2014 47 to 55 tokens, a 17% spread. Perplexity would read 86.10 under T5\u2019s split and 183.80 under BERT\u2019s: a 2.13\u00d7 range with no model difference at all, which is larger than most published gaps between models." },
          { t: "p", text: "And it inverts the naive reading. A more efficient tokenizer uses fewer tokens, so the same surprise is spread more thinly and perplexity looks *worse* \u2014 while that model is cheaper to serve, since inference cost scales per token." },
          { t: "p", text: "Instead I would use bits-per-byte: total negative log-probability in bits over the byte length of the text. The denominator is a property of the string, so nothing can game it. I would also reconcile it back to perplexity as a sanity check, because a stray ln 2 is the standard bug in hand-rolled implementations." }
        ] },

      { level: "core",
        q: "If perplexity is so limited, why is it still reported?",
        strong: "A strong answer defends the valid use without overclaiming.",
        answer: [
          { t: "p", text: "Because within its valid range it is cheap, deterministic and sensitive. It needs no labels, no judge and no human \u2014 just held-out text \u2014 which makes it the only metric you can compute on every checkpoint of a long pretraining run without a budget conversation." },
          { t: "p", text: "That is exactly the job it does well: watching a training curve on a fixed tokenizer and a fixed held-out set, where it will show you a regression or a plateau immediately. It is a monitoring metric rather than a comparison metric." },
          { t: "p", text: "It also has a clean interpretation that most evaluation metrics lack. Total surprise is information content, so bits-per-byte is literally a compression ratio \u2014 I measured 1.4489 bits per byte against 8, a 5.5\u00d7 compression. Better language modelling *is* better compression, which is a more satisfying grounding than most scores have." },
          { t: "p", text: "Where I would push back is on it appearing in model-selection tables across different tokenizers, which is where it becomes actively misleading. For that comparison, bits-per-byte costs the same to compute and does not have the defect." }
        ] }
    ]
  }
});
