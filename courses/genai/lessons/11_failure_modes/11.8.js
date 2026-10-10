EC.receiveLesson({
  id: "11.8",

  lede: "Input is the larger and more wasteful half, so attack it first \u2014 and then notice that the same output cap is worth **22.1% of the bill after the input work and 10.1% before it**, because the input levers shrink the denominator. The ordering is not arbitrary. And one lever has no trade-off at all: prompt caching on the fixed prefix, which is 45% of the trimmed input and byte-identical on every call.",

  objectives: [
    "Price each input and output lever from the same baseline",
    "Explain why the output lever is worth more applied last",
    "Name what each lever breaks and the measurement that catches it",
    "Identify the one lever with no quality trade-off",
    "Decide when to stop trimming input"
  ],

  prerequisites: ["11.7"],

  blocks: [

    { t: "h2", n: "01", id: "input", text: "Lever 1 \u2014 Cut input tokens",
      sub: "Usually the biggest win" },

    { t: "dl", items: [
      { k: "Trim few-shot examples", v: "Two or three good examples often match the quality of ten. 2.6 measured gpt2-medium going 0/6 to 6/6 on an opposites task at **two** shots, so the marginal value of the tenth example is close to zero \u2014 and one wrong label in four halved it, which matters more than the count." },
      { k: "Rerank, do not dump, RAG context", v: "Retrieve 50, rerank, pass the top 3\u20135. Also fixes lost in the middle, so it improves quality while cutting cost \u2014 the only input lever that does both." },
      { k: "Summarise or window conversation history", v: "Replace old turns with a short running summary rather than resending the whole transcript every turn. The transcript grows linearly and is charged every turn, so this is the lever whose value grows with session length." },
      { k: "Drop redundant boilerplate", v: "Reference, do not repeat. Small, free and the easiest to let drift back." },
      { k: "Prompt caching for the fixed prefix", v: "The system prompt plus stable few-shot examples are identical on every call, so providers cache the prefix \u2014 cheaper and faster, with **no quality risk whatsoever** because the tokens do not change." }
    ] },

    { t: "code", lang: "python", title: "The trim, as it is commonly written it", code: `def trim_context(history, retrieved, summarize, max_history_tokens=400, top_k=4):
    # 1) compress history to a budget
    if count_tokens(history) > max_history_tokens:
        history = summarize(history)            # running summary, not full transcript
    # 2) only the most relevant retrieved chunks (assume already reranked)
    retrieved = retrieved[:top_k]
    return history, retrieved`,
      hl: [4, 6],
      caption: "Two lines doing most of the work. Note `assume already reranked` \u2014 truncating an unranked list is a different and worse operation." },

    { t: "callout", kind: "insight", title: "Prompt caching is the only lever here with no trade-off",
      body: [
        { t: "p", text: "Every other lever on this page trades something. Trimming examples risks format drift; reranking risks a retrieval miss; summarising risks losing a pronoun\u2019s referent; capping output risks truncation. Prompt caching risks **nothing**, because the cached tokens are byte-identical to the uncached ones." },
        { t: "p", text: "Measured on the trimmed prompt, the fixed prefix \u2014 600 tokens of system prompt plus 750 of stable few-shot \u2014 is **1,350 of 3,000 input tokens, 45%.** At a 90% prefix discount that is $10,275 a month against $13,200, with the model seeing exactly the same prompt." },
        { t: "p", text: "The one requirement is that the prefix is genuinely stable and genuinely a *prefix*. Interleaving a timestamp or a user id before the few-shot examples destroys the cache, which is why the ordering of a prompt becomes a cost decision once caching is in play." }
      ] },

    { t: "h2", n: "02", id: "output", text: "Lever 2 \u2014 Cut output tokens",
      sub: "Priced higher, and worth more applied last" },

    { t: "table",
      head: ["Change", "Why it works"],
      rows: [
        ["**Cap `max_tokens`**", "To what the task actually needs \u2014 do not let a yes/no answer ramble. Also bounds hallucination (11.3)"],
        ["**Ask for structure**", "JSON, a number or a label instead of prose. Shorter *and* more parseable"],
        ["**\u201cBe concise\u201d**", "In the instruction; it genuinely reduces tokens"],
        ["**Stop sequences**", "To end generation early rather than trimming afterwards \u2014 you are billed for what is generated, not what you keep"]
      ] },

    { t: "callout", kind: "tradeoff", title: "The same cap is worth 2.2x more after the input work",
      body: [
        { t: "p", text: "Measured: cutting output from 400 to 90 tokens is **10.1% of the original bill** and **22.1% of the post-input bill**. Nothing about the change differs \u2014 only the denominator, because the input levers removed 5,000 tokens of input and left output a larger share of what remains." },
        { t: "p", text: "This is the same order-dependence 10.13 found in an incident decomposition, appearing in a cost context: a sequential set of improvements attributes a different share to each depending on the order you apply them. The total is the same either way." },
        { t: "p", text: "The practical consequence is about **reporting** rather than sequencing. If you apply input levers first and then report \u2018the output cap saved 22%\u2019, that figure is true of the system you had after step three and not of the system you started with. Say which baseline." }
      ] },

    { t: "callout", kind: "good", title: "And capping output is the one change that serves quality and cost together",
      body: [
        { t: "p", text: "11.3\u2019s third scenario was a summariser inventing a $50,000 termination penalty in its final paragraph, caused by a length target longer than the supported content. Capping `max_tokens` is the direct fix for that *and* a cost lever, which is a rare combination." },
        { t: "p", text: "The failure it introduces is visible rather than silent: `finish_reason` becomes `length` and the answer stops mid-sentence. 10.6 put that attribute on the generation span precisely so this is monitorable \u2014 alert on the rate and you can cap aggressively without guessing." },
        { t: "p", text: "So the sequence is: cap, watch the `finish_reason` rate, and raise the cap only for the task types where it actually fires. That is far better than setting a generous cap everywhere because one task occasionally needs it." }
      ] },

    { t: "h2", n: "03", id: "breaks", text: "What each lever breaks",
      sub: "And the measurement that catches it" },

    { t: "table",
      head: ["Lever", "What it breaks", "The measurement that catches it"],
      rows: [
        ["Trim few-shot", "Format drift on edge cases", "A golden set, not a visual check"],
        ["**Rerank to top-k**", "**A retrieval miss \u2014 the top cause of hallucination**", "**Recall@k before and after**"],
        ["Summarise history", "The summary drops the referent of a pronoun", "Keep the last two turns verbatim plus a summary"],
        ["Cap `max_tokens`", "`finish_reason = length`, answers stop mid-sentence", "Alert on the `finish_reason` rate"],
        ["Ask for JSON", "Schema violations become a new error class", "Validate and retry once"]
      ] },

    { t: "callout", kind: "warn", title: "Reranking is both the biggest saving and the most dangerous lever",
      body: [
        { t: "p", text: "It removes 2,000 tokens, more than any other single change, and it is the lever that buys a **retrieval miss** if you cut too far \u2014 which 11.2 identified as the most common cause of hallucination by a wide margin." },
        { t: "p", text: "So it is the one lever that needs a quality measurement attached rather than a token count. Recall@k before and after, on a labelled set, and the honest version of the change is \u2018we cut to top-3 and recall@3 is 0.94 against recall@8 of 0.96\u2019 rather than \u2018we cut 2,000 tokens\u2019." },
        { t: "p", text: "Note also what `retrieved[:top_k]` assumes. Truncating a list that has **not** been reranked discards by retrieval order, which is a much worse operation than discarding by relevance \u2014 the published code comment says \u2018assume already reranked\u2019 and that assumption is load-bearing." }
      ] },

    { t: "viz", title: "Each lever, priced and risked", caption: "Measured from the baseline in 11.7. Only one lever has no trade-off.",
      svg: `<svg viewBox="0 0 760 320" width="100%" role="img" aria-label="Input and output cost levers with their savings and risks">
  <text x="16" y="20" class="s-label">INPUT LEVERS &#183; 8,000 -&gt; 3,000 TOKENS</text>
  <text x="20" y="42" class="s-mono" style="font-size:9px">trim few-shot 10-&gt;3</text>
  <rect x="180" y="32" width="140" height="14" rx="2" class="s-fill" style="stroke:var(--accent)" stroke-width="1.3"/>
  <text x="328" y="43" class="s-mono" style="font-size:8px">-1,750 tok</text>
  <text x="420" y="43" class="s-sub">risk: format drift &#8212; check a golden set</text>
  <text x="20" y="64" class="s-mono" style="font-size:9px">rerank chunks 8-&gt;3</text>
  <rect x="180" y="54" width="160" height="14" rx="2" class="s-fill" style="stroke:var(--crit)" stroke-width="1.6"/>
  <text x="348" y="65" class="s-mono" style="font-size:8px">-2,000 tok</text>
  <text x="420" y="65" class="s-mono" style="font-size:8px;fill:var(--crit)">risk: RETRIEVAL MISS &#8212; measure recall@k</text>
  <text x="20" y="86" class="s-mono" style="font-size:9px">summarise history</text>
  <rect x="180" y="76" width="84" height="14" rx="2" class="s-fill" style="stroke:var(--accent)" stroke-width="1.3"/>
  <text x="272" y="87" class="s-mono" style="font-size:8px">-1,050 tok</text>
  <text x="420" y="87" class="s-sub">risk: a pronoun loses its referent</text>
  <text x="20" y="108" class="s-mono" style="font-size:9px">drop boilerplate</text>
  <rect x="180" y="98" width="16" height="14" rx="2" class="s-fill" style="stroke:var(--accent)" stroke-width="1.3"/>
  <text x="204" y="109" class="s-mono" style="font-size:8px">-200 tok</text>
  <text x="420" y="109" class="s-sub">risk: it drifts back in</text>

  <rect x="16" y="120" width="728" height="30" rx="3" class="s-fill" style="stroke:var(--good)" stroke-width="1.8"/>
  <text x="28" y="132" class="s-mono" style="font-size:9px;fill:var(--good)">prompt-cache the fixed prefix &#8212; 1,350 of 3,000 tokens (45%)</text>
  <text x="28" y="144" class="s-mono" style="font-size:8px;fill:var(--good)">NO TRADE-OFF: the cached tokens are byte-identical &#183; $13,200 -&gt; $10,275/mo at a 90% discount</text>

  <line x1="16" y1="162" x2="744" y2="162" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="182" class="s-label">OUTPUT LEVERS &#183; AND THE ORDER-DEPENDENCE</text>
  <text x="20" y="204" class="s-mono" style="font-size:9px">cap 400 -&gt; 90 out</text>
  <rect x="180" y="194" width="100" height="14" rx="2" class="s-fill" style="stroke:var(--warn)" stroke-width="1.4"/>
  <text x="288" y="205" class="s-mono" style="font-size:8px;fill:var(--warn)">10.1% of the ORIGINAL bill</text>
  <rect x="180" y="212" width="219" height="14" rx="2" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="407" y="223" class="s-mono" style="font-size:8px;fill:var(--good)">22.1% of the POST-INPUT bill &#8212; 2.2x more</text>
  <text x="20" y="244" class="s-sub">the same change, two denominators &#8212; the input levers shrank what output is a share of</text>

  <rect x="16" y="256" width="356" height="56" rx="4" class="s-fill-bg" style="stroke:var(--good)" stroke-width="1.5"/>
  <text x="28" y="274" class="s-mono" style="font-size:9px;fill:var(--good)">CAPPING OUTPUT SERVES BOTH GOALS</text>
  <text x="28" y="290" class="s-sub">it is also the direct fix for 11.3's confabulation</text>
  <text x="28" y="303" class="s-sub">and the failure it causes is VISIBLE: finish_reason = length</text>

  <rect x="388" y="256" width="356" height="56" rx="4" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.5"/>
  <text x="400" y="274" class="s-mono" style="font-size:9px;fill:var(--crit)">retrieved[:top_k] ASSUMES RERANKED</text>
  <text x="400" y="290" class="s-sub">truncating an UNRANKED list discards by retrieval order,</text>
  <text x="400" y="303" class="s-sub">not by relevance &#8212; a much worse operation</text>
</svg>` },

    { t: "exercise", kind: "build", title: "Price every lever from one baseline, and attach its risk", difficulty: "core", minutes: 30,
      body: "Price each input and output lever from the same baseline, then compute the output lever both before and after the input work to see the order-dependence. Finish by naming what each lever breaks and the measurement that would catch it.",
      requirements: [
        "Each input lever's token delta and resulting monthly cost",
        "The output levers priced from the post-input baseline",
        "The same output cap priced against both baselines, with the ratio",
        "A risk and a measurement for every lever",
        "The fixed-prefix share computed, and the cached cost"
      ],
      hint: "The output lever's value depends on which baseline you measure from, because the input levers change the denominator. State the baseline whenever you quote a saving.",
      solution: { lang: "python", title: "every lever, priced and risked", code: `PRICE_IN, PRICE_OUT = 5.0, 15.0
CALLS = 1_000_000

def cost(tin, tout):
    return tin / 1e6 * PRICE_IN + tout / 1e6 * PRICE_OUT

print("INPUT LEVERS, EACH PRICED FROM THE SAME BASELINE")
print("=" * 74)
BASE_IN, BASE_OUT = 8000, 400
base = cost(BASE_IN, BASE_OUT)
print("baseline: %d in / %d out = $%.5f/call, $%s/month"
      % (BASE_IN, BASE_OUT, base, format(int(base * CALLS), ",")))
print()
LEVERS_IN = [
    ("trim few-shot 10->3",      -1750, "2-3 examples usually match 10"),
    ("rerank chunks 8->3",       -2000, "also fixes lost-in-the-middle"),
    ("summarise history",        -1050, "a running summary, not a transcript"),
    ("drop boilerplate",          -200, "reference, do not repeat"),
]
print("%-24s %8s %10s %12s %10s" % ("lever", "delta", "new in", "monthly", "saving"))
cum = BASE_IN
for name, d, why in LEVERS_IN:
    cum += d
    m = cost(cum, BASE_OUT) * CALLS
    print("%-24s %8d %10d %12s %9.1f%%"
          % (name, d, cum, format(int(m), ","),
             100.0 * (base * CALLS - m) / (base * CALLS)))
print()
print("all four input levers: %d -> %d tokens, saving %.1f%%"
      % (BASE_IN, cum,
         100.0 * (base * CALLS - cost(cum, BASE_OUT) * CALLS) / (base * CALLS)))

print()
print("OUTPUT LEVERS, FROM THE POST-INPUT BASELINE")
print("=" * 74)
print("after the input work: %d in / %d out, and output is now %.1f%% of cost"
      % (cum, BASE_OUT, 100.0 * (BASE_OUT / 1e6 * PRICE_OUT) / cost(cum, BASE_OUT)))
print()
LEVERS_OUT = [
    ("cap max_tokens 400->150", 150, "a yes/no answer should not ramble"),
    ("ask for JSON, not prose", 90,  "shorter AND more parseable"),
    ("add 'be concise'",        70,  "genuinely reduces tokens"),
]
print("%-26s %8s %12s %10s %12s" % ("lever", "new out", "monthly", "saving", "vs baseline"))
for name, o, why in LEVERS_OUT:
    m = cost(cum, o) * CALLS
    print("%-26s %8d %12s %9.1f%% %11.1f%%"
          % (name, o, format(int(m), ","),
             100.0 * (cost(cum, BASE_OUT) * CALLS - m) / (cost(cum, BASE_OUT) * CALLS),
             100.0 * (base * CALLS - m) / (base * CALLS)))

print()
print("so capping output 400 -> 90 is worth %.1f%% of the POST-INPUT bill"
      % (100.0 * (cost(cum, 400) - cost(cum, 90)) / cost(cum, 400)))
print("and only %.1f%% of the ORIGINAL bill. the order of operations matters:"
      % (100.0 * (cost(BASE_IN, 400) - cost(BASE_IN, 90)) / cost(BASE_IN, 400)))
print("  output lever applied FIRST  : %.1f%% of the bill"
      % (100.0 * (cost(BASE_IN, 400) - cost(BASE_IN, 90)) / cost(BASE_IN, 400)))
print("  output lever applied LAST   : %.1f%% of the bill"
      % (100.0 * (cost(cum, 400) - cost(cum, 90)) / cost(cum, 400)))
print("  -> the SAME change is worth 2.2x more after the input work.")
print("     this is the same order-dependence as any sequential decomposition.")

print()
print("WHERE EACH LEVER BREAKS")
print("=" * 74)
RISKS = [
    ("trim few-shot",     "format drift on edge cases",
                          "measure on a golden set, not by eye"),
    ("rerank to top-k",   "RETRIEVAL MISS -- the top cause of hallucination",
                          "measure recall@k before and after"),
    ("summarise history", "the summary drops the referent of a pronoun",
                          "keep the last 2 turns verbatim plus a summary"),
    ("cap max_tokens",    "finish_reason = length, answer stops mid-sentence",
                          "alert on the finish_reason rate"),
    ("ask for JSON",      "schema violations become a new error class",
                          "validate and retry once"),
]
for lever, risk, mitigation in RISKS:
    print("  %-18s %s" % (lever, risk))
    print("  %-18s -> %s" % ("", mitigation))
print()
print("note the second one. reranking is the biggest single input saving AND the")
print("lever that buys a retrieval miss if you cut too far -- so it is the one")
print("that needs a recall measurement attached, not just a token count.")

print()
print("AND THE ONE LEVER THAT COSTS NOTHING AND RISKS NOTHING")
print("=" * 74)
PREFIX = 600 + 750    # system prompt + the trimmed few-shot, both fixed
print("prompt caching applies to the FIXED PREFIX: system prompt + stable few-shot")
print("  fixed prefix: %d tokens of the %d input (%.0f%%)"
      % (PREFIX, cum, 100.0 * PREFIX / cum))
for discount in (0.90, 0.75, 0.50):
    m = cost(cum - PREFIX * discount, 90) * CALLS
    print("  at a %.0f%% prefix discount: $%s/month" % (discount * 100, format(int(m), ",")))
print("  -> no quality risk at all, because the tokens are identical every call.")
print("     it is the only lever on this page with no trade-off.")`,
        out: `INPUT LEVERS, EACH PRICED FROM THE SAME BASELINE
==========================================================================
baseline: 8000 in / 400 out = $0.04600/call, $46,000/month

lever                       delta     new in      monthly     saving
trim few-shot 10->3         -1750       6250       37,250      19.0%
rerank chunks 8->3          -2000       4250       27,250      40.8%
summarise history           -1050       3200       22,000      52.2%
drop boilerplate             -200       3000       20,999      54.3%

all four input levers: 8000 -> 3000 tokens, saving 54.3%

OUTPUT LEVERS, FROM THE POST-INPUT BASELINE
==========================================================================
after the input work: 3000 in / 400 out, and output is now 28.6% of cost

lever                       new out      monthly     saving  vs baseline
cap max_tokens 400->150         150       17,249      17.9%        62.5%
ask for JSON, not prose          90       16,350      22.1%        64.5%
add 'be concise'                 70       16,049      23.6%        65.1%

so capping output 400 -> 90 is worth 22.1% of the POST-INPUT bill
and only 10.1% of the ORIGINAL bill. the order of operations matters:
  output lever applied FIRST  : 10.1% of the bill
  output lever applied LAST   : 22.1% of the bill
  -> the SAME change is worth 2.2x more after the input work.
     this is the same order-dependence as any sequential decomposition.

WHERE EACH LEVER BREAKS
==========================================================================
  trim few-shot      format drift on edge cases
                     -> measure on a golden set, not by eye
  rerank to top-k    RETRIEVAL MISS -- the top cause of hallucination
                     -> measure recall@k before and after
  summarise history  the summary drops the referent of a pronoun
                     -> keep the last 2 turns verbatim plus a summary
  cap max_tokens     finish_reason = length, answer stops mid-sentence
                     -> alert on the finish_reason rate
  ask for JSON       schema violations become a new error class
                     -> validate and retry once

note the second one. reranking is the biggest single input saving AND the
lever that buys a retrieval miss if you cut too far -- so it is the one
that needs a recall measurement attached, not just a token count.

AND THE ONE LEVER THAT COSTS NOTHING AND RISKS NOTHING
==========================================================================
prompt caching applies to the FIXED PREFIX: system prompt + stable few-shot
  fixed prefix: 1350 tokens of the 3000 input (45%)
  at a 90% prefix discount: $10,275/month
  at a 75% prefix discount: $11,287/month
  at a 50% prefix discount: $12,975/month
  -> no quality risk at all, because the tokens are identical every call.
     it is the only lever on this page with no trade-off.`,
        notes: [
          { t: "p", text: "**The order-dependence is the finding.** Capping output from 400 to 90 tokens is 10.1% of the original bill and 22.1% of the post-input bill \u2014 the same change, 2.2x the apparent value, purely because the input levers shrank the denominator it is a share of." },
          { t: "p", text: "**So always state the baseline when quoting a saving.** \u2018The output cap saved 22%\u2019 is true of the system after three input levers and false of the system you started with, and a reader has no way to tell which you meant. This is the same structure as 10.13\u2019s incident decomposition, in a cost setting." },
          { t: "p", text: "**The fixed prefix is 45% of the trimmed input**, which is higher than it looks because the input levers removed variable tokens and left the fixed ones. So prompt caching gets *more* valuable as a proportion after the other input work \u2014 another order effect, and this one in your favour." },
          { t: "p", text: "**Prompt caching is the only lever with no trade-off**, which is worth stating plainly because every other row has a risk column. The cached tokens are byte-identical, so there is no quality question to measure \u2014 only a requirement that the prefix stays a genuine stable prefix." },
          { t: "p", text: "**Reranking is the largest saving and the most dangerous lever**, at 2,000 tokens and a retrieval miss if cut too far. It is the one that needs recall@k attached rather than a token count, and the honest report is \u2018recall@3 is 0.94 against recall@8 of 0.96\u2019 rather than \u2018we cut 2,000 tokens\u2019." },
          { t: "p", text: "One thing the table cannot show: `retrieved[:top_k]` assumes the list was already reranked. Truncating an unranked list discards by retrieval order rather than relevance, which is a different and much worse operation \u2014 the code comment carries that assumption and it is load-bearing." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Attack input first because it is the larger and more wasteful half, but quote savings against a stated baseline \u2014 the same output cap is 10.1% of the original bill and 22.1% after the input work, because the denominator moved. Reranking is the biggest single saving and the one that buys a retrieval miss, so it needs recall@k attached rather than a token count." },
        { t: "p", text: "Capping output is the rare lever that serves quality and cost together, and the failure it causes is visible as `finish_reason = length`. And prompt-cache the fixed prefix: 45% of the trimmed input, byte-identical every call, the only lever on the page with no trade-off at all." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cWhich cost levers would you pull, and in what order?\u201d**" },
        { t: "p", text: "Input first, because it is normally the larger half and most of it is waste rather than substance. Trim few-shot examples from ten to three \u2014 two or three usually match ten, and I have seen a model go from zero to full marks at two shots, so the tenth example buys very little. Rerank retrieved context to the top three rather than dumping eight. Replace the full conversation transcript with a running summary. And drop boilerplate from the system prompt." },
        { t: "p", text: "Then prompt-cache the fixed prefix, and I would single this one out because it is the only lever with no trade-off at all. The system prompt plus stable few-shot examples are byte-identical on every call, so there is no quality question to measure \u2014 and after the other input work that prefix is 45% of the remaining input, so it gets proportionally more valuable rather than less." },
        { t: "p", text: "Then output, which is priced higher per token. Cap `max_tokens` to what the task needs, ask for structured output rather than prose, and use stop sequences \u2014 you are billed for what is generated, not what you keep." },
        { t: "p", text: "There is an arithmetic point about the ordering worth making explicit. Capping output from 400 to 90 tokens is 10.1% of the original bill and 22.1% of the bill after the input levers \u2014 the same change, 2.2 times the apparent value, because the input work shrank the denominator. So whenever I quote a saving I would say which baseline it is against, or the number is uninterpretable." },
        { t: "p", text: "Each lever breaks something and I would attach the measurement rather than the token count. Trimming examples risks format drift \u2014 check a golden set. Summarising history can drop the referent of a pronoun \u2014 keep the last two turns verbatim. Capping output causes truncation \u2014 alert on the `finish_reason` rate, which makes it safe to cap aggressively. JSON mode turns prose problems into schema violations \u2014 validate and retry once." },
        { t: "p", text: "The one I would be most careful with is reranking, because it is simultaneously the biggest saving at 2,000 tokens and the lever that buys a retrieval miss \u2014 which is the most common cause of hallucination. So the honest report for that change is \u2018recall@3 is 0.94 against recall@8 of 0.96\u2019, not \u2018we removed 2,000 tokens\u2019. And truncating a list that has not actually been reranked discards by retrieval order rather than relevance, which is a much worse operation than it looks." }
      ] }
  ],

  takeaways: [
    "**Attack input first** \u2014 it is the larger half and mostly boilerplate rather than substance.",
    "**Two or three few-shot examples often match ten**, and label quality matters more than count.",
    "**Reranking is the biggest single input saving at 2,000 tokens** \u2014 and it also fixes lost in the middle.",
    "**It is also the most dangerous lever**, because cutting too far buys a retrieval miss.",
    "**So attach recall@k to that change, not a token count** \u2014 \u201crecall@3 0.94 against recall@8 0.96\u201d.",
    "**`retrieved[:top_k]` assumes the list was reranked** \u2014 truncating an unranked list discards by retrieval order.",
    "**Measured: the same output cap is 10.1% of the original bill and 22.1% after the input work.**",
    "**So state the baseline whenever you quote a saving**, or the figure is uninterpretable.",
    "**Capping `max_tokens` serves quality and cost together**, and is the direct fix for length-driven confabulation.",
    "**Its failure is visible as `finish_reason = length`**, so alert on that rate and cap aggressively.",
    "**Prompt caching is the only lever with no trade-off** \u2014 the cached tokens are byte-identical.",
    "**Measured: the fixed prefix is 45% of the trimmed input**, so caching gets proportionally more valuable after the other levers."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Why is capping output from 400 to 90 tokens worth 22.1% in one calculation and 10.1% in another?",
        options: [
          "Because output pricing differs between providers",
          "Because the input levers shrank the denominator \u2014 the same change is a larger share of a smaller bill",
          "Because the first figure includes cache savings and the second does not",
          "Because 90 tokens triggers a different pricing tier"
        ],
        answer: 1,
        why: "Nothing about the change differs; only the baseline it is measured against. Applied to the original 8,000-token prompt it is 10.1% of the bill, and applied after three input levers have removed 5,000 input tokens it is 22.1% \u2014 2.2x the apparent value. This is the same order-dependence that affects any sequential decomposition, and the practical rule is to state which baseline a quoted saving refers to." },

      { stem: "Which cost lever has no quality trade-off?",
        options: [
          "Capping max_tokens, since the failure is visible in finish_reason",
          "Prompt caching the fixed prefix, because the cached tokens are byte-identical to the uncached ones",
          "Trimming few-shot examples, since two or three match ten",
          "Asking for JSON output, since it is both shorter and more parseable"
        ],
        answer: 1,
        why: "Every other lever changes what the model sees or produces and therefore has a risk column \u2014 format drift, a retrieval miss, a lost pronoun referent, truncation, schema violations. Caching changes only how the provider processes an identical prefix, so there is no quality question to measure, and after the other input levers that prefix is 45% of the remaining input. Its only requirement is that the prefix stays genuinely stable and genuinely first." },

      { stem: "Which lever needs a quality measurement attached rather than a token count?",
        options: [
          "Dropping boilerplate, since it is easy to let drift back",
          "Reranking to top-k, because cutting too far buys a retrieval miss \u2014 the most common cause of hallucination",
          "Adding \u201cbe concise\u201d, since its effect on length is unpredictable",
          "Summarising history, since summary quality varies"
        ],
        answer: 1,
        why: "It is simultaneously the largest single input saving at 2,000 tokens and the change that can remove the chunk containing the answer, so a token count alone cannot tell you whether it was safe. The honest report pairs the saving with recall at the new k against recall at the old one. Summarising history also carries a real risk \u2014 a dropped pronoun referent \u2014 mitigated by keeping the last couple of turns verbatim." },

      { stem: "What does `retrieved[:top_k]` assume, and why does it matter?",
        options: [
          "That top_k is smaller than the number retrieved, or it is a no-op",
          "That the list was already reranked \u2014 otherwise it discards by retrieval order rather than by relevance",
          "That each chunk is the same length, so the token saving is predictable",
          "That the chunks are deduplicated"
        ],
        answer: 1,
        why: "Slicing keeps the first k items, so the operation is only \"keep the most relevant\" if relevance determined the order. Applied to a raw similarity-ordered list it is far weaker, and applied to an unordered one it is arbitrary \u2014 which is why the comment flags the assumption. The whole point of retrieving 50 and reranking is that the reranker, not the retriever, decides which three survive." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Cutting input and output tokens",
    questions: [
      { level: "core",
        q: "Which lever would you pull first, and which is riskiest?",
        strong: "A strong answer separates the two.",
        answer: [
          { t: "p", text: "First, prompt-cache the fixed prefix, because it is the only lever with no quality trade-off \u2014 the cached tokens are byte-identical, so there is nothing to measure. On a trimmed prompt that prefix is about 45% of the input." },
          { t: "p", text: "Then the input trims: few-shot from ten to three, a running summary instead of the full transcript, and boilerplate out of the system prompt. Those are low-risk and large." },
          { t: "p", text: "The riskiest is reranking to top-k, and it is also the biggest single saving at 2,000 tokens. Cut too far and you buy a retrieval miss, which is the most common cause of hallucination \u2014 so that change gets recall@k attached rather than a token count." },
          { t: "p", text: "And I would watch for the subtlety that slicing a list only means \u2018keep the most relevant\u2019 if a reranker set the order. On a raw similarity list it is much weaker." }
        ] },

      { level: "core",
        q: "How do you cut output tokens without breaking answers?",
        strong: "A strong answer makes the failure observable.",
        answer: [
          { t: "p", text: "Cap `max_tokens`, ask for structure rather than prose, add a concision instruction, and use stop sequences \u2014 you are billed for what is generated, not for what you keep." },
          { t: "p", text: "The reason this is safe to do aggressively is that the failure it causes is visible rather than silent. A truncated answer sets `finish_reason` to `length`, so I would alert on that rate and raise the cap only for the task types where it actually fires." },
          { t: "p", text: "That is much better than setting a generous cap everywhere because one task occasionally needs a long answer." },
          { t: "p", text: "And capping is one of very few changes that serves quality and cost together \u2014 a length target longer than the supported content is exactly what causes a model to confabulate at the end of a summary." }
        ] },

      { level: "advanced",
        q: "You report that a change saved 22% of the bill. What should a reviewer ask?",
        strong: "A strong answer volunteers the baseline problem.",
        answer: [
          { t: "p", text: "Which baseline. A sequential set of improvements attributes a different share to each depending on the order applied, so the figure is only interpretable against a stated starting point." },
          { t: "p", text: "Concretely, capping output from 400 to 90 tokens is 10.1% of the original bill and 22.1% of the bill after three input levers. Same change, 2.2 times the apparent value, because the input work shrank what output is a share of." },
          { t: "p", text: "So a saving quoted without a baseline is not wrong exactly \u2014 it is unverifiable, and it can be inflated honestly by applying the cheap levers first and reporting the last one." },
          { t: "p", text: "It is the same order-dependence that shows up when decomposing an incident into contributing factors, and the fix is the same: say what you held fixed, or report the total rather than the shares." }
        ] }
    ]
  }
});
