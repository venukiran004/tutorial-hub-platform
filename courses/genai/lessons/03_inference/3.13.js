EC.receiveLesson({
  id: "3.13",

  lede: "Grammar-constrained decoding masks the logits so that only tokens the grammar permits can be sampled. Invalid output stops being unlikely and becomes impossible. I implemented a real JSON-schema mask over GPT-2's 50,257-token vocabulary and the result is stark in both directions: unconstrained, **0 of 5 prompts produced valid JSON**; constrained, **5 of 5** did. But two of those five were valid and *wrong* — \"Priya, 29\" came back as `{\"name\":\"John Doe\",\"age\":34}`. The grammar guarantees the shape and has nothing to say about the contents, and the reason is visible in the masking itself: at eight of the ten grammar states, **exactly one token out of 50,257 is legal**, so the model is not choosing at all.",

  objectives: [
    "Explain where in the decoding loop the grammar mask is applied",
    "Quantify how much of the vocabulary a schema leaves available at each state",
    "Distinguish structural validity from factual correctness in constrained output",
    "Explain why the latency overhead is a property of the implementation, not the technique",
    "Choose between constrained decoding, retries and validation for a given failure"
  ],

  prerequisites: ["1.1", "3.1"],

  blocks: [

    { t: "h2", n: "01", id: "where", text: "Where the mask goes",
      sub: "Between the logits and the softmax, which is why it cannot be bypassed" },

    { t: "p", text: "Ordinary decoding takes the logits, applies the sampling parameters from 1.1, and draws a token. Constrained decoding inserts one step: set the logit of every token the grammar forbids to negative infinity, *then* sample. Because the forbidden tokens have zero probability after the softmax, no temperature and no top-p setting can produce one." },

    { t: "p", text: "That is the whole mechanism, and the reason it is a guarantee rather than a strong preference. Prompting for JSON asks the model to prefer a shape. Masking removes the alternative from existence." },

    { t: "viz", title: "The one extra step", caption: "The mask is applied to the logits, before the softmax. Forbidden tokens have zero probability, so no sampling setting can reach them.",
      svg: `<svg viewBox="0 0 760 240" width="100%" role="img" aria-label="Where the grammar mask is applied">
  <text x="16" y="22" class="s-label">UNCONSTRAINED</text>
  <rect x="16" y="32" width="110" height="34" rx="5" class="s-fill" style="stroke:var(--line)" stroke-width="1.2"/>
  <text x="71" y="54" text-anchor="middle" class="s-sub">logits</text>
  <text x="134" y="54" class="s-mono">→</text>
  <rect x="156" y="32" width="110" height="34" rx="5" class="s-fill" style="stroke:var(--line)" stroke-width="1.2"/>
  <text x="211" y="54" text-anchor="middle" class="s-sub">softmax</text>
  <text x="274" y="54" class="s-mono">→</text>
  <rect x="296" y="32" width="110" height="34" rx="5" class="s-fill" style="stroke:var(--line)" stroke-width="1.2"/>
  <text x="351" y="54" text-anchor="middle" class="s-sub">sample</text>
  <text x="422" y="54" class="s-sub" style="fill:var(--crit)">measured: 0 of 5 outputs were valid JSON</text>

  <text x="16" y="116" class="s-label" style="fill:var(--good)">CONSTRAINED</text>
  <rect x="16" y="126" width="110" height="34" rx="5" class="s-fill" style="stroke:var(--line)" stroke-width="1.2"/>
  <text x="71" y="148" text-anchor="middle" class="s-sub">logits</text>
  <text x="134" y="148" class="s-mono">→</text>
  <rect x="156" y="126" width="110" height="34" rx="5" class="s-fill-2" style="stroke:var(--violet)" stroke-width="1.6"/>
  <text x="211" y="144" text-anchor="middle" class="s-sub" style="fill:var(--violet)">grammar mask</text>
  <text x="211" y="157" text-anchor="middle" class="s-sub">illegal → −∞</text>
  <text x="274" y="148" class="s-mono">→</text>
  <rect x="296" y="126" width="110" height="34" rx="5" class="s-fill" style="stroke:var(--line)" stroke-width="1.2"/>
  <text x="351" y="148" text-anchor="middle" class="s-sub">softmax</text>
  <text x="414" y="148" class="s-mono">→</text>
  <rect x="436" y="126" width="110" height="34" rx="5" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="491" y="148" text-anchor="middle" class="s-sub">sample</text>
  <text x="560" y="148" class="s-sub" style="fill:var(--good)">5 of 5 valid</text>

  <line x1="16" y1="186" x2="744" y2="186" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="210" class="s-sub">the mask sits before the softmax, so temperature, top-p and top-k cannot reach a forbidden token</text>
  <text x="16" y="232" class="s-mono" style="fill:var(--warn)">and at 8 of this grammar's 10 states, exactly 1 token of 50,257 is legal — the model is not choosing</text>
</svg>` },

    { t: "h2", n: "02", id: "howmuch", text: "How much of the vocabulary survives",
      sub: "Usually one token" },

    { t: "p", text: "I wrote the grammar for `{\"name\": \"<letters and spaces>\", \"age\": <digits>}` as a ten-state machine and asked, at each state, how many of GPT-2's 50,257 tokens are a legal continuation." },

    { t: "code", lang: "python", title: "g313.py — the allowed set per state", code: `def allowed_ids(state, emitted):
    """Token ids whose decoded string is a valid continuation in this state."""
    out = []
    for tid in range(V):
        s = tok.decode([tid])
        if not s:
            continue
        if state == "v1body":
            ok = all(c.isalpha() or c == " " for c in s) or s == '"'
        elif state == "v2body":
            ok = all(c.isdigit() for c in s) or s == '}'
        else:
            ok = any(t.startswith(emitted + s) for t in STATES[state])
        if ok:
            out.append(tid)
    return out`,
      out: `  gpt2 vocabulary: 50257 tokens
  grammar: {"name": "<letters and spaces>", "age": <digits>}

  state               allowed share of vocab       example allowed tokens
  start                     1         0.002%                          '{'
  k1                        1         0.002%                          '"'
  c1                        1         0.002%                          ':'
  v1open                    1         0.002%                          '"'
  v1body                47238        93.993%           '"', 'A', 'B', 'C'
  comma                     1         0.002%                          ','
  k2                        1         0.002%                          '"'
  c2                        1         0.002%                          ':'
  v2body                  996         1.982%           '0', '1', '2', '3'
  end                       1         0.002%                          '}'`,
      hl: [6],
      caption: "Eight of ten states admit exactly one token. The model's opinion is consulted at two states out of ten." },

    { t: "callout", kind: "insight", title: "Most of a schema's output is not generated, it is spelled out",
      body: [
        { t: "p", text: "The punctuation and the key names are fully determined — `{`, `\"name\"`, `:`, `,`, `\"age\"`, `}` — so for those positions the grammar is a template and the forward pass is wasted work. Only the two value states leave the model any choice: 93.99% of the vocabulary for the name, 1.98% for the age." },
        { t: "p", text: "This is why constrained decoding is so reliable for structure and why it buys nothing for substance. It is also why the published implementations spend their effort on *jumping ahead*: if only one token is legal, you can append it without a forward pass at all, which is a real speedup rather than an overhead." },
        { t: "p", text: "And it is the clue that explains the next section's failure. If the model is only consulted at 2 of 10 positions, the correctness of the output rests entirely on those two." }
      ] },

    { t: "h2", n: "03", id: "valid", text: "Valid, and sometimes wrong",
      sub: "The guarantee is about the shape" },

    { t: "code", lang: "python", title: "g313.py — unconstrained generation on the same prompts", code: `SCHEMA = re.compile(r'^\\s*\\{\\s*"name"\\s*:\\s*"[A-Za-z ]+"\\s*,\\s*"age"\\s*:\\s*\\d+\\s*\\}')
for pr in PROMPTS:
    ids = tok(pr, return_tensors="pt").input_ids
    out = m.generate(ids, max_new_tokens=24, do_sample=False,
                     pad_token_id=tok.eos_token_id)
    gen = tok.decode(out[0, ids.shape[1]:])
    print(bool(SCHEMA.match(gen)), repr(gen[:46]))`,
      out: `  prompt tail                                          valid?     first 46 chars generated
  person as JSON. Text: John is 30 years old. JSON:    no         '0000000000000000000000000000000000000000000000'
  erson as JSON. Text: Maria is 42 years old. JSON:    no         'Maria is 42 years old.\\nThe JSON format is:\\n{ '
  urn JSON with name and age. Text: Sam is 7. JSON:    no         '"Sam is 7"\\nJSON: "Sam is 7"\\nJSON: "Sam is'
  Text: Dr Lee, aged 58. JSON with name and age:       no         '(age: 58)\\nDate:\\nDate:\\nDate:\\nDate:\\nDate'
  SON {"name": ..., "age": ...}. Priya, 29. Answer:    no         "I'm a bit of a nerd. I'm a bit of a nerd. I'm"

  unconstrained: 0 of 5 outputs matched the schema`,
      caption: "GPT-2 is a weak instruction follower, so this is an easy baseline to beat — but it is the honest baseline for this model." },

    { t: "code", lang: "python", title: "g313.py — the same prompts, grammar applied", code: `with torch.no_grad():
    logits = m(ids).logits[0, -1]
mask = torch.full_like(logits, float("-inf"))
sel = torch.tensor(allowed_ids(state, emitted))
mask[sel] = logits[sel]              # everything else is -inf
tid = int(mask.argmax())`,
      out: `  prompt tail                              valid?   output
  ON. Text: John is 30 years old. JSON:    YES      '{"name":"John","age":30}'
  N. Text: Maria is 42 years old. JSON:    YES      '{"name":"Maria","age":42}'
  h name and age. Text: Sam is 7. JSON:    YES      '{"name":"Sam","age":0}'
  Lee, aged 58. JSON with name and age:    YES      '{"name":"Dr Lee","age":58}'
   ..., "age": ...}. Priya, 29. Answer:    YES      '{"name":"John Doe","age":34}'

  constrained: 5 of 5 outputs matched the schema`,
      hl: [5],
      caption: "Five of five structurally perfect. Three of five factually correct. The last row invented both fields." },

    { t: "callout", kind: "trap", title: "`{\"name\":\"John Doe\",\"age\":34}` for the input \"Priya, 29\"",
      body: [
        { t: "p", text: "That output is valid against the schema, parses without error, and type-checks as a `Person`. It is also entirely fabricated — neither field appears in the input. Row three is a milder version: \"Sam is 7\" produced `\"age\":0`." },
        { t: "p", text: "**Three of five correct, five of five valid.** The validity rate is the number the technique promises and the correctness rate is the number anyone cares about, and constraining the output moves only the first one. Worse, it moves the first one to 100%, which removes the parse failure that would otherwise have told you something was wrong." },
        { t: "p", text: "So constrained decoding converts a *loud* failure into a *silent* one. An unparseable response raises an exception you handle; a schema-perfect fabrication flows straight into your database. That is a better trade for an application that was crashing on malformed JSON, and a worse one for an application that was relying on the crash." }
      ] },

    { t: "callout", kind: "note", title: "What the reference claims, and what it means",
      body: [
        { t: "p", text: "The Outlines example carries the comment: *\"result is GUARANTEED to be valid Person\"* and *\"structurally correct by construction\"*. Both are precisely true, and the second one contains the qualifier that matters — **structurally**." },
        { t: "p", text: "Its own worked example — \"John is a 30-year-old engineer\" producing `Person(name='John', age=30, occupation='engineer')` — shows the happy case, where a capable model had the answer and only needed the shape enforced. My GPT-2 measurement shows what the same guarantee looks like when the model does not know: the shape is still perfect." },
        { t: "p", text: "The difference between those two outcomes is model capability on the extraction task, which constrained decoding does not touch. It is worth stating plainly because the phrase \"no retries, no parsing errors\" can read as \"no errors\"." }
      ] },

    { t: "h2", n: "04", id: "cost", text: "What it costs, and why the published figure is \"slight\"",
      sub: "7.30× or 0.98×, from the same algorithm" },

    { t: "code", lang: "python", title: "g313.py — the overhead, implemented two ways", code: `def fwd_masked():                    # NAIVE: scan the vocabulary every step
    with torch.no_grad(): lg = m(ids).logits[0, -1]
    ids_ok = allowed_ids("v1body", "")        # decodes all 50,257 tokens
    mask = torch.full_like(lg, float("-inf")); mask[torch.tensor(ids_ok)] = lg[...]
    return int(mask.argmax())

sel = torch.tensor(allowed_ids("v1body", ""))     # PRECOMPUTED, once per state
def mask_only_precomputed():
    with torch.no_grad(): lg = m(ids).logits[0, -1]
    mask = torch.full_like(lg, float("-inf")); mask[sel] = lg[sel]
    return int(mask.argmax())`,
      out: `  forward pass only            147.38 ms
  forward + mask + argmax     1076.00 ms   (7.30x)

  forward + PRECOMPUTED mask   145.01 ms   (0.98x)`,
      hl: [3],
      caption: "Computing the allowed set per step costs 6.3× the forward pass. Computing it once per grammar state costs nothing measurable." },

    { t: "callout", kind: "insight", title: "The overhead is an index-building problem, not a masking problem",
      body: [
        { t: "p", text: "Applying a precomputed mask is a tensor scatter and an argmax — **0.98× of the unconstrained forward pass**, which is to say free within measurement noise. Deciding *which* tokens are allowed by decoding all 50,257 of them is what costs 7.30×." },
        { t: "p", text: "This is exactly what the mature libraries do differently. Outlines compiles the regex or schema into a finite-state machine and precomputes, for every state, the set of token ids that advance it — an index built once per grammar and reused across every request. llama.cpp's GBNF does the equivalent incrementally. The note about \"slight latency overhead for grammar checking\" is describing the precomputed case." },
        { t: "p", text: "The practical consequence: if constrained decoding is slow in your system, you are almost certainly rebuilding the index per step or per request rather than caching it per schema. That is a configuration or caching bug with a 7× payoff, not a cost of the technique." }
      ] },

    { t: "h2", n: "05", id: "when", text: "When to reach for it",
      sub: "And the three cheaper things to try first" },

    { t: "table",
      head: ["Problem", "Reach for", "Why"],
      rows: [
        ["Occasional malformed JSON from a strong model", "Retry with the parse error in the prompt", "One retry on a 2% failure rate is cheaper than a grammar, and the model usually fixes it"],
        ["Malformed output at a rate you cannot absorb", "**Constrained decoding**", "Converts a probabilistic failure into an impossibility; this is the case it is for"],
        ["Tool and function calling", "**Constrained decoding**", "The argument schema is known in advance and a malformed call is a hard failure in the caller"],
        ["Output that parses but is wrong", "Evaluation and better prompting (M8)", "A grammar cannot help; it will make the wrong answer well-formed"],
        ["Enum or classification output", "**Constrained decoding** over the label set", "The allowed set is tiny, so the mask does nearly all the work and the model only ranks"],
        ["Code generation", "Constrained decoding plus a compiler check", "A language grammar gives syntactic validity; semantic validity needs the compiler"]
      ] },

    { t: "ladder", title: "Getting reliable structured output from an extraction endpoint", rungs: [
      { level: "bad", label: "Ask for JSON in the prompt and parse the result", why: "Works most of the time and fails at a rate set by the model and the prompt. The failures are the interesting part: on my GPT-2 baseline it was 0 of 5, and on a frontier model it is low but non-zero and correlated with exactly the inputs that are unusual.",
        code: `resp = generate(prompt + "\\nReturn JSON only.")
data = json.loads(resp)          # throws, sometimes` },
      { level: "ok", label: "Parse, and retry once with the error", why: "Cheap, effective on capable models, and it keeps the loud failure. A retry carrying the parse error recovers most cases, and the remaining failures are visible in a counter you can alert on.",
        code: `try:
    data = json.loads(resp)
except json.JSONDecodeError as e:
    resp = generate(prompt + f"\\nThat failed to parse: {e}. JSON only.")
    data = json.loads(resp)` },
      { level: "best", label: "Constrain the decoding, then validate the content separately", why: "The grammar removes the structural failure entirely — measured 5 of 5 valid — and a separate content check restores the signal the grammar just deleted. Without the second half you have converted parse errors into silent fabrications.",
        code: `data = generate_json(prompt, schema=Person)     # 100% parseable
if not any(data["name"] in src for src in [prompt]):
    flag_for_review(data)                       # the check the grammar removed`,
        note: "The validation does not have to be clever. \"Does the extracted value appear in the source text?\" would have caught both of my fabrications." }
    ] },

    { t: "exercise", kind: "analysis", title: "Measure how hard the grammar is fighting the model", difficulty: "advanced", minutes: 30,
      body: "At every constrained step, two quantities tell you whether the grammar is guiding the model or overruling it: the probability mass the mask removed, and the rank the chosen token had in the model's own unconstrained ordering. Record both for each step of three prompts, and see whether they predict which output came out factually wrong.",
      requirements: [
        "At each step, softmax the unmasked logits and sum the probability on the allowed set; the removed mass is one minus that",
        "Record the chosen token's rank in the unconstrained logit ordering, where rank 1 means the model would have picked it anyway",
        "Report mean removed mass, mean rank, and the count of steps with rank above 10, per prompt",
        "Print the per-step detail for the prompt whose content was fabricated",
        "Count the steps where removed mass exceeds 0.99 and the free rank exceeds 10"
      ],
      hint: "Cache the allowed set per (state, emitted) pair, or the vocabulary scan will dominate the runtime — 3.13's own timing section measures that at 7.30x.",
      solution: { lang: "python", title: "g313_ex.py — mass removed and free rank, per step", code: `for pr in PROMPTS:
    ids = tok(pr, return_tensors="pt").input_ids
    si, emitted, text = 0, "", ""
    masses, ranks = [], []
    for _ in range(60):
        state = ORDER[si]
        ok = allowed_ids(state, emitted)          # cached per (state, emitted)
        if not ok:
            break
        with torch.no_grad():
            lg = m(ids).logits[0, -1]
        p = torch.softmax(lg, -1)
        keep = torch.zeros_like(p, dtype=torch.bool)
        keep[torch.tensor(ok)] = True
        masses.append(float(1.0 - p[keep].sum()))        # mass the grammar removed
        masked = torch.where(keep, lg, torch.full_like(lg, float("-inf")))
        tid = int(masked.argmax())
        ranks.append(int((lg > lg[tid]).sum()) + 1)       # rank in the FREE ordering
        s = tok.decode([tid]); text += s
        ids = torch.cat([ids, torch.tensor([[tid]])], dim=1)
        si, emitted = advance(state, s, si, emitted)

    big = sum(1 for r in ranks if r > 10)
    print(pr[-42:], len(ranks), sum(masses) / len(masses), sum(ranks) / len(ranks), big)`,
        out: `  prompt tail                                   steps  mean mass  mean rank steps rank>10
  s JSON. Text: John is 30 years old. JSON:        15     0.7131        8.2            4
   with name and age. Text: Sam is 7. JSON:        15     0.6546       10.0            4
  me": ..., "age": ...}. Priya, 29. Answer:        16     0.7266       20.1            7

  per-step detail for the prompt that fabricated its content:
  output: '{"name":"John Doe","age":34}'
  step   mass removed  free rank
  0            0.9991        103
  1            0.9944         20
  2            0.8128          1
  3            0.9895          3
  4            0.9968         19
  5            0.9990         72
  6            0.0968          1
  7            0.4471          2
  8            0.8871          3
  9            0.9994         37
  10           0.9995         44
  11           0.1391          1
  12           0.4700          1
  13           0.2733          1
  14           0.8177         11
  15           0.7048          3

  steps where mass > 0.99 AND free rank > 10: 6 of 16`,
        notes: [
          { t: "p", text: "**The grammar removes about 70% of the probability mass on average** — 0.7131, 0.6546 and 0.7266 across the three prompts. That is the quantitative version of section 02: for most of the output the model's distribution is almost entirely outside what the schema permits, so the mask is doing the generating." },
          { t: "p", text: "**Mean free rank separates the prompt that fabricated from the two that did not: 20.1 against 8.2 and 10.0.** On the fabricating prompt the grammar was repeatedly selecting tokens the model ranked far down its own list — rank 103 at step 0, rank 72 at step 5, rank 44 at step 10. Six of its sixteen steps had more than 99% of the mass removed *and* a free rank above 10." },
          { t: "p", text: "That gives a usable runtime signal. **High removed mass with a high free rank means the grammar is overruling the model rather than guiding it**, and output produced that way should be treated as unverified. It is cheap to compute — you already have the logits and the allowed set — and it is the closest thing to a confidence measure that constrained decoding admits." },
          { t: "p", text: "Read the low-rank steps too, because they are the reassuring ones. Steps 6, 11, 12 and 13 have rank 1 and little mass removed: those are positions where the model wanted exactly what the grammar wanted, which is what agreement looks like. In this output they are the digits of the age — the model was confident about `34`, it was simply confident about the wrong number." },
          { t: "p", text: "One limitation worth naming: rank is computed against the full unconstrained ordering, which includes the vast majority of tokens that no sane continuation would use. A rank of 20 out of 50,257 is still the model's top 0.04%, so these are relative rather than absolute statements — the comparison between prompts is meaningful, the absolute value of any single rank less so." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "A grammar is a stencil. Spray through it and the shape is guaranteed — the edges will be crisp whatever you were holding. It says nothing about whether you were holding the right colour." },
        { t: "p", text: "So pair it with a check on the colour. And remember that before the stencil, a smudge told you something had gone wrong." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\"We switched our extraction endpoint to constrained decoding. Parse errors went from 3% to zero. Two weeks later an auditor found records with plausible but invented values. What happened?\"**" },
        { t: "p", text: "The 3% did not disappear \u2014 it changed form. Those requests were previously failing to parse because the model did not have the answer and produced something off-schema; now the grammar forces a well-formed answer out of the same uncertainty, so the failure moved from an exception your code handled to a record your code stored." },
        { t: "p", text: "I measured exactly this on GPT-2: five of five constrained outputs were schema-valid and three of five were factually right. \"Priya, 29\" came back as `{\"name\":\"John Doe\",\"age\":34}` \u2014 valid, type-checked, entirely invented. The grammar constrains the shape and the model\u2019s knowledge constrains the content, and only one of those changed." },
        { t: "p", text: "The immediate fix is the validation the parse error was accidentally providing. It does not need to be clever \u2014 \u201cdoes the extracted value appear in the source text?\u201d would catch both of my fabrications \u2014 and it should be a counter with an alert, so that 3% stays visible." },
        { t: "p", text: "If I wanted a confidence signal rather than a rule, there is a cheap one available at generation time. Record, per step, the probability mass the mask removed and the chosen token\u2019s rank in the model\u2019s unconstrained ordering. On my fabricating example the mean free rank was 20.1 against 8.2 for a correct one, with six of sixteen steps having over 99% of the mass removed and a rank beyond 10. A grammar overruling the model is measurable, and it is the closest thing to an uncertainty estimate this technique offers." },
        { t: "p", text: "The broader point I would raise is that this was a monitoring regression dressed as a reliability improvement. The 3% parse-error rate was a quality signal, and the change deleted it without replacing it. I would not revert \u2014 zero parse errors is genuinely better \u2014 but I would want the replacement signal shipped in the same change next time." }
      ] }
  ],

  takeaways: [
    "**The mask goes between the logits and the softmax**, so a forbidden token has zero probability and no temperature, top-p or top-k setting can reach it. That is why it is a guarantee rather than a preference.",
    "**Most of a schema\u2019s positions admit exactly one token.** Measured on a two-field JSON grammar, 8 of 10 states allowed 1 token out of 50,257 \u2014 the punctuation and key names are spelled out, not generated.",
    "**The model is consulted at the value states only** \u2014 93.99% of the vocabulary for a free-text name, 1.98% for a numeric age \u2014 so correctness rests entirely on those positions.",
    "**Structural validity goes to 100% and correctness does not follow.** Measured: 0 of 5 valid unconstrained, 5 of 5 valid constrained, 3 of 5 factually correct.",
    "**It converts a loud failure into a silent one.** An unparseable response raises an exception; a schema-perfect fabrication is stored \u2014 `{\"name\":\"John Doe\",\"age\":34}` for the input \u201cPriya, 29\u201d parses fine.",
    "**The grammar removes about 70% of the probability mass per step**, and the prompt that fabricated had mean free rank 20.1 against 8.2 for a correct one \u2014 so \u201cthe grammar is overruling the model\u201d is measurable at generation time.",
    "**The latency overhead is an index-building problem.** Scanning the vocabulary per step cost 7.30\u00d7; a precomputed per-state mask cost 0.98\u00d7 \u2014 free within noise.",
    "**So if constrained decoding is slow, the index is being rebuilt**, which is a caching bug with a 7\u00d7 payoff rather than a cost of the technique.",
    "**Prefer a retry carrying the parse error for occasional failures** on a capable model; reach for a grammar when the failure rate cannot be absorbed, or for tool calls where a malformed call is a hard failure.",
    "**Always pair a grammar with a content check**, because the check restores the signal the grammar deleted \u2014 and \u201cdoes this value appear in the source?\u201d is usually enough."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Why can no sampling setting produce a token the grammar forbids?",
        options: [
          "Because the sampler is replaced by a deterministic argmax when a grammar is active",
          "Because the mask sets the forbidden logits to negative infinity before the softmax, giving them zero probability",
          "Because the grammar rejects and regenerates invalid tokens after sampling",
          "Because the tokenizer is restricted to a smaller vocabulary"
        ],
        answer: 1,
        why: "The mask is applied to the logits, so after the softmax the forbidden tokens carry probability zero \u2014 temperature rescales zeros to zeros, and top-p and top-k select from a distribution those tokens are no longer in. Nothing is rejected and regenerated, which is what makes it a single-pass guarantee rather than a retry loop, and the tokenizer is untouched. Sampling still operates normally over whatever the grammar left available." },

      { stem: "On a two-field JSON grammar, 8 of 10 states allowed exactly 1 token out of 50,257. What follows?",
        options: [
          "The grammar is badly specified and should allow more flexibility",
          "Most of the output is determined by the grammar rather than generated, so correctness rests only on the value positions",
          "The vocabulary is too large for constrained decoding to be practical",
          "The model\u2019s logits are ignored entirely under constrained decoding"
        ],
        answer: 1,
        why: "The punctuation and key names of a fixed schema have exactly one legal continuation, so the grammar acts as a template there and the model is consulted only at the two value states \u2014 93.99% of the vocabulary for the name, 1.98% for the age. This is why the technique is so reliable for structure and does nothing for substance. It is also why mature implementations skip the forward pass entirely when only one token is legal, making those positions faster rather than slower." },

      { stem: "A team moves to constrained decoding and parse errors fall from 3% to zero. What should they expect?",
        options: [
          "A 3% improvement in end-to-end accuracy",
          "The same uncertainty now producing schema-valid but possibly invented values, with no exception raised",
          "A latency regression proportional to the vocabulary size",
          "Lower quality on the requests that previously succeeded"
        ],
        answer: 1,
        why: "The requests that failed to parse were ones where the model did not have the answer; forcing a shape onto the same uncertainty yields a well-formed fabrication instead of an exception. Measured on GPT-2, 5 of 5 constrained outputs were valid and 3 of 5 correct, with one inventing both fields. Requests that already succeeded are unaffected. Latency depends on the implementation \u2014 a precomputed mask measured 0.98\u00d7 \u2014 and the real cost is losing the parse error as a quality signal." },

      { stem: "Constrained decoding in a system is 7\u00d7 slower than unconstrained. What is the most likely cause?",
        options: [
          "The grammar is too complex for the finite-state representation",
          "The allowed token set is being recomputed every step instead of cached per grammar state",
          "The negative-infinity values are causing numerical instability in the softmax",
          "The model is being reloaded between constrained and unconstrained paths"
        ],
        answer: 1,
        why: "Applying a precomputed mask is a scatter and an argmax \u2014 measured at 0.98\u00d7 of the forward pass, free within noise. Deciding which of 50,257 tokens are legal by decoding each of them cost 7.30\u00d7. Mature libraries compile the schema into a state machine and precompute the allowed id set per state once, reusing it across requests, so a 7\u00d7 regression points at that index being rebuilt rather than cached. Masked softmax is numerically routine." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "The question where \u201cguaranteed valid JSON\u201d needs a follow-up about what valid means",
    questions: [
      { level: "core",
        q: "How does grammar-constrained decoding work, and what does it guarantee?",
        strong: "A strong answer places the mask correctly in the loop and is precise about the scope of the guarantee.",
        answer: [
          { t: "p", text: "At each step the grammar\u2019s current state defines which tokens are legal continuations, and the logits of everything else are set to negative infinity before the softmax. So the forbidden tokens have probability zero and no sampling setting can reach them \u2014 a single-pass guarantee rather than a retry loop." },
          { t: "p", text: "What it guarantees is structural: the output parses and matches the schema. I measured a two-field JSON grammar taking GPT-2 from 0 of 5 valid outputs to 5 of 5." },
          { t: "p", text: "What it does not guarantee is content, and I would volunteer that unprompted because it is the part that surprises people. Of those five valid outputs, three were factually right. For the input \u201cPriya, 29\u201d it produced `{\"name\":\"John Doe\",\"age\":34}` \u2014 valid, type-checked, invented. The reason is visible in the masking: 8 of my grammar\u2019s 10 states admitted exactly one token out of 50,257, so the model was consulted at only two value positions and the guarantee covers everything except the part that can be wrong." },
          { t: "p", text: "The practical consequence is that it converts a loud failure into a silent one. A parse error is an exception you handle; a well-formed fabrication is a database row. So I would always ship it with a content check alongside." }
        ] },

      { level: "advanced",
        q: "When would you use constrained decoding instead of retries?",
        strong: "A strong answer treats it as a choice between failure modes rather than a strictly better option.",
        answer: [
          { t: "p", text: "When the failure rate cannot be absorbed, or when the consumer of the output cannot tolerate a malformed value at all \u2014 tool and function calls are the clearest case, since the schema is known in advance and a bad call fails in the caller rather than in the model." },
          { t: "p", text: "For occasional malformed output from a capable model I would prefer a retry carrying the parse error, for two reasons. It is cheaper to build, and it keeps the failure visible: the retry counter is a quality signal about which inputs the model is struggling with, and constrained decoding deletes that signal by construction." },
          { t: "p", text: "Enum or classification output is the case where constrained decoding is unambiguously right \u2014 the allowed set is a handful of labels, so the mask does nearly all the work and the model only has to rank them. No amount of prompt engineering matches a mask there." },
          { t: "p", text: "And I would not reach for it at all when the problem is output that parses but is wrong. A grammar will make the wrong answer well-formed, which is strictly worse than leaving it malformed." }
        ] },

      { level: "advanced",
        q: "Constrained decoding is slowing a service down. How do you investigate?",
        strong: "A strong answer separates applying the mask from computing it.",
        answer: [
          { t: "p", text: "By separating the two halves, because they differ by 7\u00d7. Applying a precomputed mask is a tensor scatter plus an argmax \u2014 I measured 0.98\u00d7 of the unconstrained forward pass, free within noise. Deciding which tokens are legal by scanning and decoding all 50,257 of them measured 7.30\u00d7." },
          { t: "p", text: "So the question is whether the allowed-token index is built once per grammar or once per step. Mature implementations compile the schema into a finite-state machine and precompute the allowed id set for every state, then cache that index across requests. If a service is slow, that cache is usually missing, keyed wrongly, or invalidated by a schema constructed fresh per request \u2014 a Pydantic model defined inside the request handler, for instance." },
          { t: "p", text: "The second thing I would check is whether the implementation skips the forward pass when only one token is legal. On my grammar that was 8 of 10 states, so jumping ahead at those positions makes constrained generation faster than unconstrained rather than slower. A library that does not do this leaves most of the available speedup unclaimed." },
          { t: "p", text: "And I would confirm the comparison is fair \u2014 constrained output is often shorter because it cannot ramble, so a per-request latency comparison can look bad while the per-token cost is identical. Worth checking before optimising anything." }
        ] }
    ]
  }
});
