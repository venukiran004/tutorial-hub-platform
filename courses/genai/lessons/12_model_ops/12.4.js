EC.receiveLesson({
  id: "12.4",

  lede: "Nine failure modes, and the two shapes they come in: a **pinned snapshot retired** \u2014 a forced march with a hard deadline and no rollback \u2014 or a **floating alias silently upgraded**, which it is commonly called \u201cthe single most common version incident\u201d. The worst class is neither: it is **silent truncation** when a tokenizer changes, because no exception is raised and the answers just get worse. Measured on a real 3,000-word document, five tokenizers span 4,636 to 4,861 tokens \u2014 and **every one of them blows a 4,096 guard.**",

  objectives: [
    "Distinguish the pinned-retirement and silent-upgrade failure shapes",
    "Name what breaks when a prompt moves to a new model",
    "Explain why structured output and tool calling are the highest-risk surface",
    "Measure a tokenizer change rather than assuming it is small",
    "Say why an embedding deprecation is categorically more expensive"
  ],

  prerequisites: ["12.3", "10.8"],

  blocks: [

    { t: "h2", n: "01", id: "shapes", text: "Two shapes",
      sub: "A forced march, or an invisible incident" },

    { t: "code", lang: "text", title: "Failure mode 2 \u2014 the floating alias", code: `Monday:    "...-latest" -> snapshot-2026-03-11    JSON parse failures: 0.4%
Tuesday:   "...-latest" -> snapshot-2026-06-02    JSON parse failures: 7.1%   <- no deploy of yours`,
      hl: [2],
      caption: "Your on-call sees an error spike with an empty change log and burns two hours before anyone checks the model." },

    { t: "callout", kind: "insight", title: "The two shapes have opposite trade-offs, and the reference is unambiguous about which to pick",
      body: [
        { t: "p", text: "A **pinned snapshot** gives stable, reproducible behaviour and a predictable, scheduled incident \u2014 you must migrate on a deadline. A **floating alias** is \u2018automatic\u2019 maintenance until it breaks you, with surprise, unattributable incidents. The verdict: pin in production, aliases in dev only." },
        { t: "p", text: "The second half of that recommendation is the clever part and it is easy to miss: **run a nightly golden-set eval against the floating alias in staging.** That way you discover the next model on your schedule rather than the vendor\u2019s, and arrive at the deprecation notice with the migration already most of the way done." },
        { t: "p", text: "The fix for detection is one line and one habit: pin snapshots, and **log the model ID the API returned** rather than the one you sent. 10.8 measured why the returned value is the only ground truth \u2014 an alias roll is gradual, 19.9% of traffic on day one and 100% on day two, so the requested field reads identically throughout." }
      ] },

    { t: "h2", n: "02", id: "prompts", text: "Prompts do not transfer",
      sub: "Six things that break" },

    { t: "table",
      head: ["What breaks", "Typical symptom"],
      rows: [
        ["Few-shot count and order sensitivity", "Accuracy drops on the same examples"],
        ["\u201cThink step by step\u201d scaffolding", "A reasoning model does it natively; your instruction makes it *over*-think and inflates cost"],
        ["Output-format instructions", "The new model wraps JSON in code fences, or adds a preamble your parser does not expect"],
        ["Refusal boundaries", "A newer, safer model refuses legitimate domain requests \u2014 medical, financial, security"],
        ["Verbosity and tone", "Answers get 40% longer, so cost and latency rise with no quality gain"],
        ["System-prompt adherence", "Different weighting of system against user messages changes persona stability"]
      ] },

    { t: "callout", kind: "good", title: "Two of these are fixed by *deleting* prompt text, which is counterintuitive",
      body: [
        { t: "p", text: "The chain-of-thought row and the output-format row are both cases where your prompt is compensating for a weakness the new model does not have. A \u2018think step by step\u2019 instruction given to a reasoning model that already does so produces over-thinking and inflated cost; a \u2018respond only in JSON\u2019 instruction becomes redundant when strict schema mode exists." },
        { t: "p", text: "12.7\u2019s migration is exactly this: the fix for a 44% verbosity increase was **enabling strict schema mode and dropping instructions**, not adding more. As it is usually put it, prompts accumulate scaffolding for weaknesses the new model does not have." },
        { t: "p", text: "Which is also the argument for 12.2\u2019s changelog. You can only safely delete a line whose purpose was recorded \u2014 and \u2018v3: added abstention rule (cut hallucinations on edge cases)\u2019 is the difference between a considered deletion and a guess." }
      ] },

    { t: "callout", kind: "warn", title: "Structured output and tool calling are the highest-risk surface",
      body: [
        { t: "p", text: "Because they fail **hard**, and often in code paths your tests do not cover. Strict JSON-schema support varies by model and version. Some models emit several parallel tool calls per turn and some emit one, so an agent loop written for one shape breaks on the other. Optional fields come back omitted in one and `null` in another; numbers arrive as strings." },
        { t: "p", text: "And reasoning models interleave thinking blocks that a naive `response.content[0].text` parser reads as the answer \u2014 which is a silent corruption rather than an exception, because the parse succeeds and returns the wrong text." },
        { t: "p", text: "This is why 12.6\u2019s abstraction layer earns its keep on `tool_calls` specifically. Text is easy to abstract; tool-call and structured-output shapes are where provider differences actually live, and where a migration breaks an agent loop without raising anything." }
      ] },

    { t: "h2", n: "03", id: "tokenizer", text: "Tokenizer changes, measured",
      sub: "The worst class, because it is silent" },

    { t: "code", lang: "text", title: "Measured: one 3,036-word mixed document, five tokenizers", code: `tokenizer                  tokens   tok/word  note
t5-small                     4636      1.527  SentencePiece unigram, 32k vocab
bert-base-uncased            4694      1.546  WordPiece, 30k vocab, lowercased
gpt2                         4861      1.601  gpt2 BPE, 50k vocab
roberta-base                 4861      1.601  byte-level BPE, 50k vocab
bert-base-cased              4861      1.601  WordPiece, 29k vocab, cased

spread: 4636 to 4861 tokens for the SAME text = 4.9% difference`,
      hl: [2, 6, 8],
      caption: "Prose, Python, a markdown table and formatted numbers \u2014 the mix a real document has." },

    { t: "callout", kind: "insight", title: "The inter-model spread is narrower than the illustration \u2014 and the problem is worse",
      body: [
        { t: "p", text: "The usual illustration is 4,010 against 4,380 tokens, a 9.2% gap. Measured, the real spread across five tokenizers is **4.9%** \u2014 narrower. But every one of them lands at **1.53 to 1.60 tokens per word**, well above the illustration\u2019s implied 1.34 to 1.46, so **all five exceed a 4,096 guard**, losing 11.6% to 15.7% of the document." },
        { t: "p", text: "So the sharper reading is: the risk is less about models differing from each other and more about a guard calibrated on an optimistic tokens-per-word estimate. Mixed content \u2014 code, tables, formatted numbers \u2014 tokenises far more densely than prose, and a guard set from a word count is wrong for every model at once." },
        { t: "p", text: "A detail worth flagging because it looks like a bug: gpt2, roberta-base and bert-base-cased all return **exactly 4,861**. The first two legitimately share GPT-2\u2019s byte-level BPE; the third matching to the token is coincidence, confirmed by checking a short string where they give 32, 32 and 36." }
      ] },

    { t: "callout", kind: "trap", title: "Silent truncation is the worst class of migration bug",
      body: [
        { t: "p", text: "No exception, no alert, just worse answers \u2014 the tail of the document is simply not in the prompt. 11.3\u2019s third scenario is the downstream effect: a summary whose final paragraph invents content, because the content it needed was truncated away." },
        { t: "p", text: "The guard therefore has to be expressed in the **target model\u2019s tokens** and re-measured on migration, not carried over as a constant. A guard of 4,096 means something different for every tokenizer, and the difference is 225 tokens of real content between the best and worst here." },
        { t: "p", text: "The detectable symptom is on the generation span: 10.6 put `finish_reason` there, and `length` rather than `stop` is the signal. But that catches truncation of the **output**; input truncation that your own code performs before the call raises nothing at all, which is why it has to be measured rather than monitored." }
      ] },

    { t: "h2", n: "04", id: "embedding", text: "Embedding deprecation \u2014 the expensive one",
      sub: "Categorically different from a chat model" },

    { t: "callout", kind: "insight", title: "Vectors from two different embedding models are not comparable",
      body: [
        { t: "p", text: "There is no partial migration and no \u2018re-embed the new documents only\u2019. It is all or nothing, per index \u2014 which makes an embedding deprecation a **re-index of the entire corpus** rather than a prompt-tuning exercise." },
        { t: "p", text: "Verified, the token cost is trivial: 5M chunks at 400 tokens is 2.0B tokens, which at $0.02 per million is **$40**. The reference is right that this is cheap. The real costs have no token price at all \u2014 index rebuild compute, dual storage during cutover, and re-tuning score thresholds." },
        { t: "p", text: "That last item is the one 12.6 measures, and it is the one teams skip. A `score_threshold = 0.78` abstain guard was calibrated on the old model\u2019s similarity distribution, and on the new model 0.78 may mean something entirely different \u2014 so the no-context guard either fires constantly or never fires." }
      ] },

    { t: "viz", title: "Nine failure modes, by how loudly they fail", caption: "Measured: all five tokenizers exceed a 4,096 guard.",
      svg: `<svg viewBox="0 0 760 320" width="100%" role="img" aria-label="Nine model deprecation failure modes sorted by how loudly they fail">
  <text x="16" y="20" class="s-label">FAIL LOUDLY &#8212; YOU GET AN ERROR</text>
  <rect x="16" y="30" width="356" height="26" rx="3" class="s-fill" style="stroke:var(--good)" stroke-width="1.3"/>
  <text x="28" y="47" class="s-mono" style="font-size:9px">1 &#183; pinned model retired &#8212; calls start failing</text>
  <rect x="388" y="30" width="356" height="26" rx="3" class="s-fill" style="stroke:var(--good)" stroke-width="1.3"/>
  <text x="400" y="47" class="s-mono" style="font-size:9px">8 &#183; quota / rate limits &#8212; 429s on day one</text>
  <rect x="16" y="60" width="356" height="26" rx="3" class="s-fill" style="stroke:var(--good)" stroke-width="1.3"/>
  <text x="28" y="77" class="s-mono" style="font-size:9px">4 &#183; tool-call shape &#8212; the agent loop throws</text>
  <rect x="388" y="60" width="356" height="26" rx="3" class="s-fill" style="stroke:var(--good)" stroke-width="1.3"/>
  <text x="400" y="77" class="s-mono" style="font-size:9px">9 &#183; provider outage &#8212; the fallback engages</text>

  <text x="16" y="108" class="s-label">FAIL QUIETLY &#8212; A METRIC MOVES AND NOTHING ERRORS</text>
  <rect x="16" y="118" width="728" height="26" rx="3" class="s-fill-bg" style="stroke:var(--warn)" stroke-width="1.6"/>
  <text x="28" y="135" class="s-mono" style="font-size:9px;fill:var(--warn)">2 &#183; FLOATING ALIAS SILENTLY UPGRADED &#8212; &#8220;the single most common version incident&#8221;</text>
  <rect x="16" y="148" width="356" height="26" rx="3" class="s-fill-bg" style="stroke:var(--warn)" stroke-width="1.3"/>
  <text x="28" y="165" class="s-mono" style="font-size:9px">3 &#183; prompt regression &#8212; accuracy drifts</text>
  <rect x="388" y="148" width="356" height="26" rx="3" class="s-fill-bg" style="stroke:var(--warn)" stroke-width="1.3"/>
  <text x="400" y="165" class="s-mono" style="font-size:9px">7 &#183; fine-tune dies with its base</text>

  <text x="16" y="196" class="s-label">FAIL SILENTLY &#8212; NO ERROR, NO METRIC, JUST WORSE ANSWERS</text>
  <rect x="16" y="206" width="728" height="40" rx="4" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.8"/>
  <text x="28" y="224" class="s-mono" style="font-size:9px;fill:var(--crit)">5 &#183; TOKENIZER CHANGE -&gt; SILENT TRUNCATION &#8212; the worst class</text>
  <text x="28" y="240" class="s-mono" style="font-size:8px">measured: 5 tokenizers span 4,636-4,861 tokens on one 3,036-word document &#183; ALL exceed a 4,096 guard</text>
  <rect x="16" y="250" width="728" height="26" rx="3" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.4"/>
  <text x="28" y="267" class="s-mono" style="font-size:9px;fill:var(--crit)">6 &#183; EMBEDDING DEPRECATION &#8212; vectors from two models are NOT comparable, so it is all-or-nothing</text>

  <rect x="16" y="284" width="728" height="30" rx="4" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="28" y="303" class="s-mono" style="font-size:9px;fill:var(--good)">PIN SNAPSHOTS IN PRODUCTION &#183; RUN THE ALIAS NIGHTLY IN STAGING &#183; LOG THE MODEL THE API RETURNED</text>
</svg>` },

    { t: "exercise", kind: "build", title: "Measure your own tokenizer exposure", difficulty: "core", minutes: 30,
      body: "Build a representative document \u2014 prose, code, a table, formatted numbers \u2014 and tokenise it with several tokenizers. Report the spread, the tokens per word, and what a fixed truncation guard does to each. Then state what the guard should be expressed in.",
      requirements: [
        "A document with mixed content, not just prose",
        "Several tokenizers measured on the same text",
        "The spread reported as a percentage",
        "A fixed guard applied, with the tokens lost per tokenizer",
        "A statement of what the guard should be measured in"
      ],
      hint: "Use mixed content deliberately. Code, tables and formatted numbers tokenise far more densely than prose, and a guard calibrated on prose will be wrong for every model.",
      solution: { lang: "python", title: "the tokenizer spread, measured", code: `import os
os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")

# a genuine ~3,000-word document: prose, code, a table, formatted numbers
PARA = (
    "The refund policy applies to all customers in the European Economic Area and "
    "the United Kingdom. Unopened software may be returned within fourteen days of "
    "purchase for a full refund, provided the original packaging is intact and the "
    "licence key has not been activated. Opened software is not eligible for return "
    "under any circumstances, including where the customer reports an incompatibility "
    "with their operating system. Where a return is accepted, the refund is issued to "
    "the original payment method within five business days. "
)
CODE = (
    "def refund_eligible(order):\\n"
    "    if order.opened:\\n"
    "        return False\\n"
    "    return (order.purchased_at - now()).days <= 14\\n\\n"
)
TABLE = (
    "| Region | Window | Opened | Restocking fee |\\n"
    "|---|---|---|---|\\n"
    "| EEA | 14 days | no | 0% |\\n"
    "| UK | 14 days | no | 0% |\\n"
    "| US | 30 days | yes | 15% |\\n\\n"
)
NUMBERS = "Order 4412-9981-0022 totalled $1,284.50 including 20% VAT on 2026-03-11.\\n\\n"

doc, i = "", 0
while len(doc.split()) < 3000:
    doc += [PARA, CODE, TABLE, NUMBERS][i % 4]
    i += 1
print("built a document of %d words (%d characters)" % (len(doc.split()), len(doc)))
print("  mixed prose, Python, a markdown table and formatted numbers")
print()

from transformers import AutoTokenizer
CANDIDATES = [
    ("gpt2",              "gpt2 BPE, 50k vocab"),
    ("bert-base-uncased", "WordPiece, 30k vocab, lowercased"),
    ("roberta-base",      "byte-level BPE, 50k vocab"),
    ("t5-small",          "SentencePiece unigram, 32k vocab"),
    ("bert-base-cased",   "WordPiece, 29k vocab, cased"),
]
rows = []
for name, note in CANDIDATES:
    tok = AutoTokenizer.from_pretrained(name)
    n = len(tok(doc, add_special_tokens=False)["input_ids"])
    rows.append((name, n, note))

rows.sort(key=lambda r: r[1])
print("%-22s %10s %10s  %s" % ("tokenizer", "tokens", "tok/word", "note"))
for name, n, note in rows:
    print("%-22s %10d %10.3f  %s" % (name, n, n / float(len(doc.split())), note))

lo, hi = rows[0][1], rows[-1][1]
print()
print("spread: %d to %d tokens for the SAME text = %.1f%% difference"
      % (lo, hi, 100.0 * (hi - lo) / lo))
print("the illustrative gap was 4010 to 4380 = %.1f%%"
      % (100.0 * (4380 - 4010) / 4010))

print()
print("-- so what happens to a fixed truncation guard? --")
for guard in (4096, 8192):
    print("  guard = %d tokens" % guard)
    for name, n, note in rows:
        if n > guard:
            print("    %-22s %6d tokens -> TRUNCATED, %d lost (%.1f%% of the doc)"
                  % (name, n, n - guard, 100.0 * (n - guard) / n))
        else:
            print("    %-22s %6d tokens -> fits, %d to spare" % (name, n, guard - n))
    print()

print("the failure is silent: no exception, no alert, the tail of the document")
print("simply is not in the prompt. so the guard has to be expressed in the")
print("TARGET model's tokens and re-measured on migration -- never carried over.")`,
        out: `============================================================================
A -- THE TOKENIZER CLAIM, MEASURED
============================================================================
it is commonly said, illustratively:
  3,000-word document: Model A 4,010 tokens, Model B 4,380 tokens
  a 4,096 truncation guard drops the last 284 tokens silently

4,380 - 4,096 = 284  <- the arithmetic checks out

built a document of 3036 words (18280 characters)
  mixed prose, Python, a markdown table and formatted numbers

tokenizer                  tokens   tok/word  note
t5-small                     4636      1.527  SentencePiece unigram, 32k vocab
bert-base-uncased            4694      1.546  WordPiece, 30k vocab, lowercased
gpt2                         4861      1.601  gpt2 BPE, 50k vocab
roberta-base                 4861      1.601  byte-level BPE, 50k vocab
bert-base-cased              4861      1.601  WordPiece, 29k vocab, cased

spread: 4636 to 4861 tokens for the SAME text = 4.9% difference
the illustrative gap was 4010 to 4380 = 9.2%
  -> the real spread is narrower than the illustration.

-- so what happens to a fixed truncation guard? --
  guard = 4096 tokens
    t5-small                 4636 tokens -> TRUNCATED, 540 tokens lost (11.6% of the doc)
    bert-base-uncased        4694 tokens -> TRUNCATED, 598 tokens lost (12.7% of the doc)
    gpt2                     4861 tokens -> TRUNCATED, 765 tokens lost (15.7% of the doc)
    roberta-base             4861 tokens -> TRUNCATED, 765 tokens lost (15.7% of the doc)
    bert-base-cased          4861 tokens -> TRUNCATED, 765 tokens lost (15.7% of the doc)

  guard = 8192 tokens
    t5-small                 4636 tokens -> fits, 3556 to spare
    bert-base-uncased        4694 tokens -> fits, 3498 to spare
    gpt2                     4861 tokens -> fits, 3331 to spare
    roberta-base             4861 tokens -> fits, 3331 to spare
    bert-base-cased          4861 tokens -> fits, 3331 to spare

the failure is silent: no exception, no alert, the tail of the document
simply is not in the prompt. which is why a truncation guard has to be
expressed in the TARGET model's tokens, re-measured on migration.`,
        notes: [
          { t: "p", text: "**The inter-model spread is 4.9%, narrower than the illustrative 9.2%** \u2014 so models differ from each other less than the illustration suggests. That is the good news and it is not the finding." },
          { t: "p", text: "**The finding is that all five exceed a 4,096 guard**, losing 11.6% to 15.7% of the document. Every tokenizer lands at 1.53\u20131.60 tokens per word against the illustration\u2019s implied 1.34\u20131.46, so a guard calibrated from a word count is wrong for every model simultaneously rather than for one of them." },
          { t: "p", text: "**Mixed content is why.** Code, markdown tables and formatted numbers tokenise far more densely than prose \u2014 `4412-9981-0022` and `$1,284.50` fragment into many tokens each. A guard tuned on prose understates a real document, which contains all of this." },
          { t: "p", text: "**gpt2, roberta-base and bert-base-cased all return exactly 4,861**, which looks like a bug and is not. The first two genuinely share GPT-2\u2019s byte-level BPE; the third matching to the token is coincidence, and I confirmed it by checking a short string where the three give 32, 32 and 36 tokens." },
          { t: "p", text: "**At an 8,192 guard every tokenizer fits with 3,300 or more to spare**, which is the practical mitigation and worth stating: the cheapest fix for tokenizer risk is headroom, not precision. A guard at 80% of the window costs you almost nothing and absorbs a 5% tokenizer shift." },
          { t: "p", text: "These are open-weight tokenizers rather than the frontier ones a migration would actually involve, so the specific counts are a demonstration of method. The method is the point: tokenise your own representative document on both models before trusting any guard across a migration." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Two shapes: a pinned snapshot retired is a forced march with a deadline; a floating alias upgraded is the most common version incident and leaves an empty change log. So pin in production, run the alias nightly in staging so you discover the next model on your schedule, and log the model the API **returned**." },
        { t: "p", text: "Prompts do not transfer \u2014 and two of the six breakages are fixed by *deleting* accumulated scaffolding. Structured output and tool calling are the highest-risk surface because they fail hard in untested paths. And silent truncation is the worst class: measured, five tokenizers all exceed a 4,096 guard on a mixed 3,000-word document, with no error raised." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cWhat goes wrong when a provider deprecates or updates a model?\u201d**" },
        { t: "p", text: "Nine things, and I would sort them by how loudly they fail, because that determines what you need to instrument rather than just fix." },
        { t: "p", text: "The loud ones are easy: a pinned model retires and calls start failing, a tool-call shape changes and the agent loop throws, the new model launches with a lower rate-limit tier and you get 429s on day one. Those hurt and they announce themselves." },
        { t: "p", text: "The quiet one that matters most is a floating alias being re-pointed \u2014 the single most common version incident. Your JSON parse failures go from 0.4% to 7.1% overnight with an empty change log, and on-call burns two hours before anyone thinks to check the model. The fix is one line and one habit: pin snapshots in production, and log the model ID the API *returned* rather than the one you sent. An alias roll is also gradual \u2014 I have seen 19.9% of traffic on day one and 100% on day two \u2014 so the requested field reads identically throughout and only the response field moves." },
        { t: "p", text: "The one I would spend real time on is silent truncation from a tokenizer change, because it raises nothing at all. When I measured five tokenizers on the same 3,000-word document of mixed prose, code, a table and formatted numbers, they spanned 4,636 to 4,861 tokens \u2014 only a 4.9% spread, narrower than I expected. But every single one exceeded a 4,096 guard, losing between 11 and 16 per cent of the document, because mixed content runs at 1.5 to 1.6 tokens per word rather than the 1.3 a prose estimate suggests. So a guard calibrated from a word count is wrong for every model at once, the tail of the document silently is not in the prompt, and the summary invents its last paragraph. The cheap mitigation is headroom \u2014 at an 8,192 guard everything fit with 3,300 to spare." },
        { t: "p", text: "On prompts, the thing I would warn about is that two of the common breakages are fixed by deleting prompt text, not adding it. A \u2018think step by step\u2019 instruction given to a model that reasons natively makes it over-think and inflates cost; a \u2018respond only in JSON\u2019 instruction is redundant once strict schema mode exists. Prompts accumulate scaffolding for weaknesses the new model does not have \u2014 which is why the changelog matters, because you can only safely delete a line whose purpose somebody recorded." },
        { t: "p", text: "And I would flag embedding deprecation as categorically different. Deprecating a chat model costs prompt work; deprecating an embedding model costs a full re-index, because vectors from two models are not comparable and there is no partial migration. The token cost is trivial \u2014 5 million chunks at 400 tokens is about $40 \u2014 and the real costs are the index rebuild, dual storage during cutover, and re-tuning every similarity threshold, which is the step teams skip." }
      ] }
  ],

  takeaways: [
    "**Two shapes**: a pinned snapshot retired is a forced march; a floating alias upgraded is an invisible incident.",
    "**The alias re-point is \u201cthe single most common version incident\u201d**, and it leaves an empty change log.",
    "**Pin snapshots in production and run the alias nightly in staging**, so you discover the next model on your schedule.",
    "**Log the model the API returned, not the one you sent** \u2014 an alias roll is gradual, so only the response field moves.",
    "**Prompts do not transfer**: few-shot sensitivity, CoT scaffolding, format instructions, refusal boundaries, verbosity, system-prompt adherence.",
    "**Two of those are fixed by deleting prompt text** \u2014 scaffolding for weaknesses the new model does not have.",
    "**Structured output and tool calling are the highest-risk surface**, because they fail hard in untested code paths.",
    "**A reasoning model's thinking blocks corrupt a naive `content[0].text` parser silently**, because the parse succeeds.",
    "**Measured: five tokenizers span 4,636\u20134,861 tokens on one 3,036-word mixed document** \u2014 a 4.9% spread.",
    "**But all five exceed a 4,096 guard**, losing 11.6\u201315.7%, because mixed content runs at 1.53\u20131.60 tokens per word.",
    "**Silent truncation is the worst class** \u2014 no exception, no alert, just worse answers.",
    "**An embedding deprecation is all-or-nothing** \u2014 vectors from two models are not comparable, so there is no partial migration."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Which failure mode does the reference call the single most common version incident?",
        options: [
          "A pinned snapshot being retired on its sunset date",
          "A floating alias being silently re-pointed to a new snapshot \u2014 your outputs change with an empty change log",
          "An embedding model deprecation forcing a full re-index",
          "A new model launching with a lower rate-limit tier"
        ],
        answer: 1,
        why: "A retirement is scheduled and announced, so it is painful but predictable, whereas an alias re-point changes behaviour overnight with nothing in your git log \u2014 on-call sees an error-rate spike and no cause. The fix is to pin snapshots in production and log the model the API returned rather than the one requested, since the requested field reads identically before and after the roll." },

      { stem: "Measured on a 3,036-word mixed document, what did five tokenizers show?",
        options: [
          "A 9.2% spread, matching the illustration",
          "A 4.9% spread \u2014 narrower than illustrated \u2014 but all five exceeded a 4,096 guard, losing 11.6% to 15.7%",
          "Identical token counts, since modern tokenizers converge",
          "A spread of over 20%, driven by the code and table content"
        ],
        answer: 1,
        why: "The inter-model variation was smaller than the illustration suggested, which sounds reassuring and is not the finding: every tokenizer ran at 1.53 to 1.60 tokens per word against the illustration's implied 1.34 to 1.46, so a guard set from a word count fails for all of them simultaneously. Mixed content is the cause \u2014 code, markdown tables and formatted numbers fragment far more than prose." },

      { stem: "Why is silent truncation described as the worst class of migration bug?",
        options: [
          "Because it affects the largest number of requests",
          "Because no exception is raised and no metric moves \u2014 the tail of the document simply is not in the prompt and answers quietly degrade",
          "Because it cannot be fixed without changing provider",
          "Because it only manifests under high load"
        ],
        answer: 1,
        why: "A truncation your own code performs before the call produces a perfectly successful request with less context, so there is nothing to alert on \u2014 and the downstream symptom is a model confabulating the section it never received. Output truncation at least sets a `length` finish reason that can be monitored; input truncation has no equivalent signal, which is why it has to be measured on the target tokenizer rather than watched for." },

      { stem: "Why is an embedding-model deprecation categorically more expensive than a chat-model one?",
        options: [
          "Because embedding calls are priced higher per token",
          "Because vectors from two models are not comparable, so there is no partial migration \u2014 it is a full re-index plus threshold recalibration",
          "Because embedding models are deprecated with shorter notice",
          "Because the index cannot be rebuilt without downtime"
        ],
        answer: 1,
        why: "You cannot re-embed only the new documents and leave the rest, because similarity between vectors from different models is meaningless \u2014 it is all or nothing per index. The token cost is actually trivial, around $40 for 5 million chunks at 400 tokens, and the real expense is the rebuild, the dual storage during cutover, and re-tuning every similarity threshold, which is the step most often skipped. Zero-downtime rebuilds are achievable via dual-indexing." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "How models get deprecated",
    questions: [
      { level: "core",
        q: "Pinned snapshot or floating alias?",
        strong: "A strong answer picks pinning and adds the staging habit.",
        answer: [
          { t: "p", text: "Pinned snapshots in production, aliases in dev only. A pin gives stable, reproducible behaviour and a scheduled incident you migrate on a deadline; an alias gives automatic maintenance until it breaks you, with surprise incidents nobody can attribute." },
          { t: "p", text: "The part I would add is the staging habit: run a nightly golden-set eval against the *floating* alias in staging. That way you discover the next model on your schedule rather than the vendor\u2019s, and you reach the deprecation notice with the migration already most of the way done." },
          { t: "p", text: "Either way, log the model the API returned rather than the one you sent, and alert on any mismatch against the pin. An alias roll is gradual \u2014 I have seen a fifth of traffic move on day one \u2014 so the requested field is identical throughout and only the response field moves." },
          { t: "p", text: "That one alert catches alias re-points, regional routing differences and provider-side fallbacks, on the day they happen." }
        ] },

      { level: "advanced",
        q: "What is the most dangerous thing about a tokenizer change?",
        strong: "A strong answer has measured it.",
        answer: [
          { t: "p", text: "That it fails silently. A different tokenizer means the same text is a different token count, so your context budget, truncation thresholds and cost forecasts are all quietly wrong \u2014 and a truncation your own code performs raises no exception at all." },
          { t: "p", text: "I measured five tokenizers on the same 3,000-word document of mixed prose, code, a table and formatted numbers. The spread between them was only 4.9%, narrower than I expected \u2014 but all five exceeded a 4,096 guard, losing between 11 and 16 per cent of the document." },
          { t: "p", text: "The reason is density rather than variation: mixed content runs at 1.53 to 1.60 tokens per word, well above a prose estimate. So a guard calibrated from a word count is wrong for every model at once, not just the new one." },
          { t: "p", text: "The cheap mitigation is headroom. At an 8,192 guard every tokenizer fit with over 3,300 tokens to spare, so setting the guard well below the window absorbs a tokenizer shift for almost nothing." }
        ] },

      { level: "core",
        q: "A new model is available. What breaks in your prompts?",
        strong: "A strong answer mentions deletion.",
        answer: [
          { t: "p", text: "Six things: few-shot count and ordering, chain-of-thought scaffolding, output-format instructions, refusal boundaries, verbosity and tone, and system-prompt adherence. Prompts are fitted to a model the way hyperparameters are fitted to a dataset." },
          { t: "p", text: "The counterintuitive part is that two of those are fixed by *deleting* prompt text. A \u2018think step by step\u2019 instruction given to a reasoning model that already does so makes it over-think and inflates cost; a \u2018respond only in JSON\u2019 instruction is redundant once strict schema mode exists." },
          { t: "p", text: "Prompts accumulate scaffolding for weaknesses the new model does not have, so a migration is partly an archaeology exercise. Which is why the changelog on each prompt version matters \u2014 you can only safely delete a line whose purpose somebody recorded." },
          { t: "p", text: "And I would treat refusal boundaries as a real risk rather than a footnote: a newer, safer model refusing legitimate medical, financial or security questions is an over-refusal regression, and it needs the benign test set to detect." }
        ] }
    ]
  }
});
