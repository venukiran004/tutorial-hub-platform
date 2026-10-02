EC.receiveLesson({
  id: "10.10",

  lede: "Tracing every request with full payloads is how observability bills reach the size of the inference bill. The split that works is **metadata on 100%, payloads tail-sampled** \u2014 and the measured argument for tail over head sampling is sharper than the usual one: at 100,000 requests a day, tail sampling costs **1.3x** more payload storage than head sampling at 5% and keeps **20x** more of the traces you will actually want. Head sampling\u2019s problem is not that it is stingy. It is that it is random.",

  objectives: [
    "Set sensible sampling, retention and truncation defaults",
    "Distinguish head from tail sampling and choose on what each keeps",
    "Size an observability budget from span payload sizes",
    "Redact PII with an allowlist rather than a blocklist, and say why",
    "Keep traces joinable while hashing user identifiers"
  ],

  prerequisites: ["10.6", "10.9"],

  blocks: [

    { t: "h2", n: "01", id: "defaults", text: "The defaults",
      sub: "Five decisions" },

    { t: "table",
      head: ["Decision", "Sensible default", "Why"],
      rows: [
        ["**Trace sampling**", "100% of metadata, 100% of errors and thumbs-down, 5\u201310% of full payloads", "metadata is small; prompts and chunk text are not"],
        ["**Retention**", "payloads 14\u201330 days, aggregated metrics forever", "incidents are found in weeks, trends in months"],
        ["**Payload truncation**", "first 2 KB of each chunk, always the full prompt template ID", "you rarely need chunk 5 in full, you always need to know which chunk it was"],
        ["**PII**", "redact before export, not in the UI", "once it is in the vendor's store, it is in their backups"],
        ["**Tail sampling**", "keep 100% of slow, errored or low-scored traces", "the interesting traces are exactly the unrepresentative ones"]
      ] },

    { t: "callout", kind: "insight", title: "Metadata and payload differ by a factor of nine, which is what makes the split work",
      body: [
        { t: "p", text: "Measured on the trace from 10.5: metadata \u2014 roughly forty attributes, numbers and short strings \u2014 is about 2 KB. The payload \u2014 the prompt and completion text plus five chunks at 2 KB each \u2014 is **18,224 bytes**, about nine times larger." },
        { t: "p", text: "So dropping payloads to 5% while keeping all metadata cuts total volume **6.9x** and costs you nothing in the dimensions you query on: model version, index version, token counts, `above_threshold`, `top_score`, chunk IDs, latency. All of that is metadata." },
        { t: "p", text: "That ratio is the whole design. You keep the thing you aggregate and alert on for everybody, and the thing you read during an investigation for a chosen few \u2014 which turns the sampling question into \u2018which few\u2019 rather than \u2018how few\u2019." }
      ] },

    { t: "h2", n: "02", id: "headtail", text: "Head versus tail sampling",
      sub: "Decide before the request, or after" },

    { t: "callout", kind: "trap", title: "Head sampling at 5% keeps 5% of your failures",
      body: [
        { t: "p", text: "**Head sampling** decides at the start of a request \u2014 \u2018keep 5%\u2019. It is cheap and trivially implemented, and because the decision is made before anything has happened, it is uncorrelated with whether the request turned out to be interesting. So you keep 5% of the successes and 5% of the failures." },
        { t: "p", text: "**Tail sampling** decides after the request finishes, once you know it was slow, errored, or scored badly. It needs a buffer and a little more infrastructure, and it keeps every trace you will actually want." },
        { t: "p", text: "The measured comparison in the exercise is the argument. With errors, slow requests and low-scored answers at 6.7% of traffic combined, tail sampling costs **1.3x** the payload storage of head sampling at 5% \u2014 0.122 GB/day against 0.091 \u2014 and keeps **100% of the failures against 5%**. That is a twentyfold difference in what you can investigate, for a third more storage." }
      ] },

    { t: "callout", kind: "good", title: "And the cheap tier is what makes tail sampling possible",
      body: [
        { t: "p", text: "Tail sampling needs a signal to sample on, and the deterministic checks from 10.3 provide it for free: `above_threshold == 0`, `top_score` below a floor, a refusal pattern, malformed output, latency above the SLO. Those are all available the moment the request ends, with no judge." },
        { t: "p", text: "So the sequencing is: run the free checks on 100%, use their verdicts to decide which payloads to keep, and only then run a judge on a subset of what you kept. 10.11 prices that last step." },
        { t: "p", text: "Which means the three ideas in this module compose. Cheap attributes make cheap checks possible; cheap checks make tail sampling possible; tail sampling makes a judge affordable. Skip the first and the rest get expensive." }
      ] },

    { t: "h2", n: "03", id: "pii", text: "PII, and the direction a list fails in",
      sub: "Redact at export, allowlist not blocklist" },

    { t: "dl", items: [
      { k: "Redact before export, not in the UI", v: "Hiding a field in the vendor\u2019s interface does nothing \u2014 the value is in their store and therefore in their backups. Redaction has to happen in your process, on the way out." },
      { k: "Hash user IDs with a per-tenant salt", v: "So traces stay joinable \u2014 you can still group a user\u2019s requests and follow a session \u2014 without the identifier itself leaving. Per-tenant salt because a global one lets one tenant\u2019s hashes be matched against another\u2019s." },
      { k: "Allowlist the attributes that may leave", v: "Not a blocklist of ones that may not. An allowlist **fails closed**: an attribute nobody has classified is withheld. A blocklist **fails open**: the same attribute is exported." },
      { k: "Run the same PII detector you use in the input guardrail", v: "Over the span payloads at export time. One implementation, two uses, and the second one is the easier sell because nothing is blocked \u2014 only redacted." }
    ] },

    { t: "callout", kind: "warn", title: "The two attributes that carry the PII are also the two that are large",
      body: [
        { t: "p", text: "In the exercise\u2019s allowlist run, the blocked attributes are `user_id`, `query` and `chunk_text`. The query is the user\u2019s own words; the chunk text is whatever your corpus holds, which for a support corpus is names, account numbers and transaction details." },
        { t: "p", text: "And those are exactly the fields that make the payload nine times the size of the metadata. So the allowlist and the truncation policy are solving the same problem from two directions \u2014 which is a pleasant result rather than a coincidence, because size and sensitivity both track \u2018free text written by or about a person\u2019." },
        { t: "p", text: "The corollary is that chunk **IDs** do double duty, as 10.6 argued: tiny, no PII, and sufficient to answer which documents the model saw. They stay on the allowlist and the text does not." }
      ] },

    { t: "viz", title: "Head versus tail, on what each keeps", caption: "Measured at 100,000 requests/day. The cost difference is 1.3x; the coverage difference is 20x.",
      svg: `<svg viewBox="0 0 760 310" width="100%" role="img" aria-label="Head sampling keeps 5 percent of failures while tail sampling keeps all of them">
  <text x="16" y="20" class="s-label">100,000 REQUESTS/DAY &#183; 6,700 ARE INTERESTING (ERROR, SLOW OR LOW-SCORED)</text>

  <text x="16" y="48" class="s-mono" style="font-size:9px">HEAD 5%</text>
  <rect x="110" y="36" width="560" height="22" rx="2" class="s-fill-bg" style="stroke:var(--line)" stroke-width="1"/>
  <rect x="110" y="36" width="28" height="22" rx="2" class="s-fill" style="stroke:var(--accent)" stroke-width="1.4"/>
  <text x="678" y="52" class="s-mono" style="font-size:8px">0.091 GB/d</text>
  <text x="124" y="76" class="s-mono" style="font-size:8px;fill:var(--crit)">keeps 335 of 6,700 failures &#8212; 5.0%</text>

  <text x="16" y="110" class="s-mono" style="font-size:9px">TAIL 6.7%</text>
  <rect x="110" y="98" width="560" height="22" rx="2" class="s-fill-bg" style="stroke:var(--line)" stroke-width="1"/>
  <rect x="110" y="98" width="38" height="22" rx="2" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="678" y="114" class="s-mono" style="font-size:8px">0.122 GB/d</text>
  <text x="124" y="138" class="s-mono" style="font-size:8px;fill:var(--good)">keeps 6,700 of 6,700 failures &#8212; 100%</text>

  <rect x="16" y="154" width="728" height="34" rx="4" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="28" y="175" class="s-mono" style="font-size:10px;fill:var(--good)">1.3x THE STORAGE &#183; 20x THE COVERAGE OF WHAT MATTERS</text>
  <text x="470" y="175" class="s-sub">head sampling is not stingy &#8212; it is random</text>

  <line x1="16" y1="204" x2="744" y2="204" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="226" class="s-label">AND WHY THE SPLIT WORKS AT ALL</text>
  <text x="16" y="248" class="s-mono" style="font-size:9px">metadata</text>
  <rect x="110" y="238" width="30" height="16" rx="2" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="150" y="250" class="s-mono" style="font-size:8px">2,000 B &#8212; model version, index version, tokens, above_threshold, chunk_ids</text>
  <text x="16" y="274" class="s-mono" style="font-size:9px">payload</text>
  <rect x="110" y="264" width="273" height="16" rx="2" class="s-fill" style="stroke:var(--crit)" stroke-width="1.4"/>
  <text x="393" y="276" class="s-mono" style="font-size:8px">18,224 B &#8212; prompt + completion text + 5 chunks</text>
  <text x="16" y="300" class="s-sub">9x larger, and it holds the PII &#8212; so one policy solves size and sensitivity together</text>
</svg>` },

    { t: "exercise", kind: "build", title: "Size the budget, then compare on coverage not cost", difficulty: "core", minutes: 35,
      body: "Compute observability volume and storage cost for five sampling plans, then re-rank them by what fraction of the interesting traces each one keeps. Finally implement the PII allowlist and check which attributes it withholds.",
      requirements: [
        "Volume and monthly storage cost per plan, from real span sizes",
        "The same plans re-ranked by the share of errors, slow requests and low-scored answers retained",
        "The head-versus-tail comparison stated as both a cost ratio and a coverage ratio",
        "An allowlist applied to a candidate attribute set, showing what is withheld",
        "A statement of which direction an allowlist and a blocklist each fail in"
      ],
      hint: "Treat the interesting population as the union of errors, slow requests and low-scored answers. A head sample keeps its sampling fraction of that population; a tail sample keeps all of it.",
      solution: { lang: "python", title: "budget, coverage and the allowlist", code: `REQ_DAY = 100_000
META_B = 2_000
PAYLOAD_B = (1842 + 214) * 4 + 5 * 2000      # prompt+completion text + 5 chunks at 2 KB
RETENTION_D = 30
GB_MONTH_USD = 0.25                           # typical hot-storage price

# the population we actually care about
FAILURE_RATE = 0.012      # errors
SLOW_RATE = 0.020         # above the p95 SLO
LOWSCORE_RATE = 0.035     # judge or deterministic check flagged it
INTERESTING = FAILURE_RATE + SLOW_RATE + LOWSCORE_RATE   # treat as disjoint

print("volume, at %s requests/day" % format(REQ_DAY, ","))
print("=" * 72)
print("metadata per trace      %6d B" % META_B)
print("full payload per trace  %6d B" % PAYLOAD_B)
print()

PLANS = [
    ("everything, no sampling",            1.00, 1.00),
    ("100% metadata, 10% payload",         1.00, 0.10),
    ("100% metadata, 5% payload",          1.00, 0.05),
    ("head sampling 5% (metadata too)",    0.05, 0.05),
    ("100% metadata + tail-sampled 6.7%",  1.00, INTERESTING),
]
print("%-36s %10s %10s %9s" % ("plan", "GB/day", "GB stored", "USD/mo"))
for label, m, p in PLANS:
    per_day = REQ_DAY * (META_B * m + PAYLOAD_B * p)
    stored = per_day * RETENTION_D / 1e9
    print("%-36s %10.3f %10.2f %9.2f"
          % (label, per_day / 1e9, stored, stored * GB_MONTH_USD))

print()
print("=" * 72)
print("BUT COST IS THE WRONG COMPARISON. ASK WHAT EACH PLAN KEEPS.")
print("=" * 72)
interesting_per_day = REQ_DAY * INTERESTING
print("interesting traces/day: %s (%.1f%% of traffic)"
      % (format(int(interesting_per_day), ","), 100 * INTERESTING))
print()
print("%-36s %12s %12s %10s" % ("plan", "payload GB/d", "failures kept", "% kept"))
for label, m, p in PLANS:
    per_day = REQ_DAY * PAYLOAD_B * p / 1e9
    if "tail" in label:
        kept = interesting_per_day            # tail: keeps all of it
    else:
        kept = interesting_per_day * p        # random: keeps p of everything
    print("%-36s %12.3f %12s %9.1f%%"
          % (label, per_day, format(int(kept), ","), 100.0 * kept / interesting_per_day))

print()
head = REQ_DAY * PAYLOAD_B * 0.05 / 1e9
tail = REQ_DAY * PAYLOAD_B * INTERESTING / 1e9
print("head 5%% keeps 5%% of failures for %.3f GB/day" % head)
print("tail 6.7%% keeps 100%% of failures for %.3f GB/day" % tail)
print("  -> tail costs %.1fx more payload storage and keeps %.0fx more of what matters"
      % (tail / head, 1.0 / 0.05))

print()
print("=" * 72)
print("PII: WHAT LEAVES THE BOUNDARY")
print("=" * 72)
ALLOWLIST = ["trace_id", "session_id", "user_id_hashed", "route", "app_version",
             "model_version", "index_version", "prompt_template_id", "top_k",
             "returned", "above_threshold", "chunk_ids", "scores",
             "prompt_tokens", "completion_tokens", "finish_reason", "latency_ms"]
CANDIDATES = {
    "trace_id":        "4f1c9a",
    "user_id":         "venu@example.com",
    "user_id_hashed":  "sha256:9ad1...",
    "query":           "why was my card declined on the 14th",
    "chunk_ids":       "[c-8812, c-8813]",
    "chunk_text:      "Cardholder VENU K, last four 4412, declined ...",
    "above_threshold": 6,
    "model_version":   "chat-large-2026-03-11",
}
print("%-18s %-10s %s" % ("attribute", "exported", "value"))
for k, v in CANDIDATES.items():
    ok = k in ALLOWLIST
    print("%-18s %-10s %s" % (k, "yes" if ok else "NO", v if ok else "[withheld]"))
print()
blocked = [k for k in CANDIDATES if k not in ALLOWLIST]
print("blocked by the allowlist: %s" % ", ".join(blocked))
print("note query and chunk_text are the two that carry the PII, and they are")
print("also the two that are large -- the allowlist solves both problems at once.")
print()
print("an allowlist fails CLOSED: a new attribute nobody classified is withheld.")
print("a blocklist fails OPEN: a new attribute nobody classified is exported.")`,
        out: `volume, at 100,000 requests/day
========================================================================
metadata per trace        2000 B
full payload per trace   18224 B

plan                                     GB/day  GB stored    USD/mo
everything, no sampling                   2.022      60.67     15.17
100% metadata, 10% payload                0.382      11.47      2.87
100% metadata, 5% payload                 0.291       8.73      2.18
head sampling 5% (metadata too)           0.101       3.03      0.76
100% metadata + tail-sampled 6.7%         0.322       9.66      2.42

========================================================================
BUT COST IS THE WRONG COMPARISON. ASK WHAT EACH PLAN KEEPS.
========================================================================
interesting traces/day: 6,700 (6.7% of traffic)

plan                                 payload GB/d failures kept     % kept
everything, no sampling                     1.822        6,700     100.0%
100% metadata, 10% payload                  0.182          670      10.0%
100% metadata, 5% payload                   0.091          335       5.0%
head sampling 5% (metadata too)             0.091          335       5.0%
100% metadata + tail-sampled 6.7%           0.122        6,700     100.0%

head 5% keeps 5% of failures for 0.091 GB/day
tail 6.7% keeps 100% of failures for 0.122 GB/day
  -> tail costs 1.3x more payload storage and keeps 20x more of what matters

========================================================================
PII: WHAT LEAVES THE BOUNDARY
========================================================================
attribute          exported   value
trace_id           yes        4f1c9a
user_id            NO         [withheld]
user_id_hashed     yes        sha256:9ad1...
query              NO         [withheld]
chunk_ids          yes        [c-8812, c-8813]
chunk_text         NO         [withheld]
above_threshold    yes        6
model_version      yes        chat-large-2026-03-11

blocked by the allowlist: user_id, query, chunk_text
note query and chunk_text are the two that carry the PII, and they are
also the two that are large -- the allowlist solves both problems at once.

an allowlist fails CLOSED: a new attribute nobody classified is withheld.
a blocklist fails OPEN: a new attribute nobody classified is exported.`,
        notes: [
          { t: "p", text: "**The storage costs are all small, and that is worth saying plainly.** Even tracing everything with no sampling is about $15 a month at this volume, against an inference bill of roughly $874 a *day*. So the honest framing is not that observability is expensive \u2014 it is that it grows with traffic while the useful information does not, and at ten or a hundred times this volume the ratios start to matter." },
          { t: "p", text: "**The second table is the one that changes the decision.** Head sampling at 5% and \u2018100% metadata, 5% payload\u2019 both keep 5% of failures, and both cost about 0.09 GB a day of payload. Tail sampling costs 0.122 \u2014 1.3x \u2014 and keeps all 6,700. A third more storage for twenty times the coverage is not a close call." },
          { t: "p", text: "**Head sampling\u2019s flaw is not stinginess, it is randomness.** The decision is made before anything has happened, so it cannot be correlated with whether the request turned out to be interesting. Tail sampling is the same budget spent on the right traces." },
          { t: "p", text: "**I treated the three interesting populations as disjoint, which overstates the tail sample slightly.** In reality a slow request is more likely to also be low-scored, so the real union is below 6.7% and tail sampling is cheaper than shown. The comparison moves in tail sampling\u2019s favour, so the conclusion is safe." },
          { t: "p", text: "**The allowlist withholds `user_id`, `query` and `chunk_text`** \u2014 and those are also the three largest fields. Size and sensitivity both track \u2018free text written by or about a person\u2019, so the truncation policy and the privacy policy are solving the same problem from two directions." },
          { t: "p", text: "The failure direction is the part worth remembering. An allowlist withholds an attribute nobody has classified; a blocklist exports it. Since new attributes get added by whoever is instrumenting a new feature, the blocklist leaks by default." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Metadata on 100% and payloads tail-sampled. Metadata is 2 KB and payload is 18 KB, so dropping payloads to 5% cuts volume 6.9x and costs nothing in the dimensions you query on. Retention follows the question: payloads two to four weeks, aggregated metrics forever." },
        { t: "p", text: "Choose head against tail on coverage, not cost: tail costs 1.3x more and keeps 20x more of the failures, because head sampling decides before it can know whether the request mattered. And redact at export with an allowlist \u2014 it fails closed, where a blocklist exports anything nobody has classified." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cOur observability bill is growing faster than our traffic. What do you change?\u201d**" },
        { t: "p", text: "First I would split metadata from payload, because they differ by about a factor of nine. On the traces I have measured, metadata \u2014 forty-odd attributes, numbers and short strings \u2014 is around 2 KB, and the payload with prompt text, completion text and five chunks is about 18 KB. Dropping payloads to 5% while keeping all metadata cuts volume nearly sevenfold and costs you nothing in the dimensions you actually query on: model version, index version, token counts, chunks above threshold, top score, chunk IDs, latency. All of that is metadata." },
        { t: "p", text: "Then I would make the remaining payload sample a tail sample rather than a head sample, and I would argue for it on coverage rather than cost. Head sampling decides at the start of the request, so it is uncorrelated with whether the request turned out to be interesting \u2014 at 5% you keep 5% of your failures. Tail sampling decides afterwards, once you know the request was slow, errored or scored badly." },
        { t: "p", text: "The numbers make it an easy call. With errors, slow requests and low scores at about 6.7% of traffic, tail sampling costs 1.3 times the payload storage of a 5% head sample and keeps 100% of the failures instead of 5%. A third more storage for twenty times the coverage." },
        { t: "p", text: "Tail sampling needs a signal to sample on, and that is where the cheap deterministic checks earn their place a second time: chunks above threshold, top score below a floor, a refusal pattern, malformed output, latency over the SLO. All available the instant the request ends, no judge needed. So the three ideas compose \u2014 cheap attributes make cheap checks possible, cheap checks make tail sampling possible, and tail sampling makes a judge affordable." },
        { t: "p", text: "On retention, payloads for two to four weeks and aggregated metrics forever, because you investigate an incident within weeks and you compare against a baseline from months ago. And truncate chunk text to a couple of kilobytes while always keeping the chunk IDs and the prompt template ID in full \u2014 you rarely need chunk five verbatim and you always need to know which chunk it was." },
        { t: "p", text: "I would also take the opportunity to fix the PII story, because the same change touches it. Redact at export in your own process, not in the vendor\u2019s UI \u2014 once a value is in their store it is in their backups. Hash user IDs with a per-tenant salt so traces stay joinable without the identifier leaving. And use an allowlist of attributes that may leave rather than a blocklist of ones that may not, because an allowlist fails closed: an attribute nobody has classified is withheld, where a blocklist exports it. Given that new attributes get added by whoever is instrumenting the next feature, the blocklist leaks by default." }
      ] }
  ],

  takeaways: [
    "**Metadata on 100%, payloads tail-sampled** \u2014 that split is the whole design.",
    "**Measured: metadata is 2 KB and payload is 18,224 B**, about nine times larger.",
    "**Dropping payloads to 5% cuts volume 6.9x** and costs nothing in the dimensions you query on.",
    "**Retention matches the question**: payloads 14\u201330 days, aggregated metrics forever.",
    "**Head sampling at 5% keeps 5% of your failures**, because the decision is made before it can know.",
    "**Measured: tail sampling costs 1.3x more payload storage and keeps 20x more of the failures.**",
    "**So choose on coverage, not cost** \u2014 head sampling is not stingy, it is random.",
    "**Tail sampling needs a signal, and the free deterministic checks provide it** the instant a request ends.",
    "**The three ideas compose**: cheap attributes \u2192 cheap checks \u2192 tail sampling \u2192 an affordable judge.",
    "**Redact at export, not in the UI** \u2014 once a value is in the vendor's store it is in their backups.",
    "**Hash user IDs with a per-tenant salt**, so traces stay joinable without the identifier leaving.",
    "**An allowlist fails closed and a blocklist fails open**, and new attributes are added by whoever instruments the next feature."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Why prefer tail sampling over head sampling?",
        options: [
          "Because tail sampling is cheaper at equivalent retention",
          "Because head sampling decides before it can know whether the request mattered \u2014 at 5% it keeps 5% of failures, while tail keeps all of them for about 1.3x the storage",
          "Because head sampling cannot be applied per-tenant",
          "Because tail sampling compresses better once outcomes are known"
        ],
        answer: 1,
        why: "The decision point is the whole difference: head sampling is uncorrelated with outcome by construction, so its sample contains failures in the same proportion as traffic does. Measured at 100,000 requests a day with errors, slow requests and low scores at 6.7% combined, tail sampling cost 0.122 GB/day against head's 0.091 and retained 6,700 interesting traces against 335 \u2014 a third more storage for twenty times the coverage." },

      { stem: "What makes the \u201c100% metadata, sampled payloads\u201d split work?",
        options: [
          "That metadata is queried more often than payloads",
          "That metadata is roughly 2 KB against an 18 KB payload, and every dimension you aggregate or alert on is metadata",
          "That payloads can be reconstructed from metadata if needed",
          "That vendors charge separately for the two"
        ],
        answer: 1,
        why: "The nine-to-one size ratio means payload sampling is where all the savings are, and the attributes you actually query \u2014 model version, index version, token counts, chunks above threshold, top score, chunk IDs, latency \u2014 are all small. So you keep what you aggregate on for everybody and what you read during an investigation for a chosen few, which turns the question from \u201chow few\u201d into \u201cwhich few.\u201d Payloads cannot be reconstructed, which is exactly why the choice matters." },

      { stem: "Why use an allowlist of exportable attributes rather than a blocklist?",
        options: [
          "Because allowlists are shorter and easier to maintain",
          "Because an allowlist fails closed \u2014 an attribute nobody classified is withheld, where a blocklist exports it",
          "Because blocklists cannot express pattern matches",
          "Because regulators require allowlists specifically"
        ],
        answer: 1,
        why: "New attributes are added by whoever is instrumenting the next feature, who is usually not thinking about data export, so the default behaviour for an unclassified attribute determines whether the system leaks over time. An allowlist withholds it and someone notices a missing field; a blocklist ships it and nobody notices anything. Allowlists are typically longer to maintain, which is the cost of failing in the safe direction." },

      { stem: "Which attributes did the worked allowlist withhold, and what is notable about them?",
        options: [
          "The token counts and latency, because they reveal usage patterns",
          "user_id, query and chunk_text \u2014 which are also the three largest fields, so size and sensitivity track together",
          "The model and index versions, because they are commercially sensitive",
          "The trace and session IDs, because they are linkable"
        ],
        answer: 1,
        why: "Both the user's own words and the retrieved corpus text are free text written by or about a person, which is simultaneously what makes them sensitive and what makes them large \u2014 so the truncation policy and the privacy policy address the same fields from two directions. Chunk IDs stay on the allowlist and do the investigative work instead: tiny, no personal data, and sufficient to establish which documents the model actually saw." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Sampling, PII and cost",
    questions: [
      { level: "core",
        q: "How do you keep observability from costing more than inference?",
        strong: "A strong answer splits metadata from payload first.",
        answer: [
          { t: "p", text: "Metadata on 100% of requests, payloads tail-sampled. The two differ by about nine times \u2014 2 KB against 18 KB on the traces I have measured \u2014 so all the savings are in the payload, and none of the dimensions you aggregate or alert on are in it." },
          { t: "p", text: "Dropping payloads to five per cent while keeping all metadata cuts volume nearly sevenfold, and you still have every model version, index version, token count, chunk ID and `above_threshold` reading." },
          { t: "p", text: "Then truncate: a couple of kilobytes of each chunk, and always the full prompt template ID. You rarely need chunk five verbatim and you always need to know which chunk it was." },
          { t: "p", text: "And retention by question: payloads two to four weeks because incidents are found in weeks, aggregated metrics forever because trends are found in months." }
        ] },

      { level: "advanced",
        q: "Head or tail sampling, and why?",
        strong: "A strong answer argues on coverage with numbers.",
        answer: [
          { t: "p", text: "Tail, and I would argue it on coverage rather than cost. Head sampling decides at the start of the request, so the decision cannot be correlated with whether the request turned out to be interesting \u2014 at five per cent you keep five per cent of your failures." },
          { t: "p", text: "When I sized it at a hundred thousand requests a day, with errors, slow requests and low-scored answers at about 6.7% combined, tail sampling cost 1.3 times the payload storage of a five per cent head sample and kept a hundred per cent of the failures rather than five. A third more storage for twenty times the coverage." },
          { t: "p", text: "Tail sampling needs something to sample on, and the free deterministic checks supply it: chunks above threshold, top score below a floor, a refusal regex, malformed output, latency over the SLO. All known the instant the request ends." },
          { t: "p", text: "So the pieces compose \u2014 cheap span attributes make cheap checks possible, cheap checks make tail sampling possible, and tail sampling makes a judge affordable because you are only judging traces you kept for a reason." }
        ] },

      { level: "core",
        q: "How do you handle PII in traces?",
        strong: "A strong answer gets the failure direction right.",
        answer: [
          { t: "p", text: "Redact at export, in my own process, not in the vendor\u2019s UI. Hiding a field in their interface does nothing \u2014 the value is in their store and therefore in their backups." },
          { t: "p", text: "I would run the same PII detector I use in the input guardrail over the span payloads on the way out. One implementation, two uses, and the export side is the easier sell because nothing gets blocked, only redacted." },
          { t: "p", text: "User IDs get hashed with a per-tenant salt, so traces stay joinable \u2014 I can still group a user\u2019s requests and follow a session \u2014 without the identifier leaving. Per-tenant rather than global, so one tenant\u2019s hashes cannot be matched against another\u2019s." },
          { t: "p", text: "And an allowlist of attributes that may leave, not a blocklist of ones that may not. The allowlist fails closed: an attribute nobody has classified is withheld. A blocklist fails open, and since new attributes get added by whoever instruments the next feature, that leaks by default." }
        ] }
    ]
  }
});
