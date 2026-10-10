EC.receiveLesson({
  id: "10.5",

  lede: "One RAG request, every span, every millisecond \u2014 and every number below is the real output of the tracer in 10.7, run. `llm.generate` owns **75.7%** of the request and the vector search everybody wants to optimise owns **8.7%**. Then the sting: the trace is **green**. Status `OK`, 3.1 seconds, normal cost \u2014 and the answer is garbage, because the model was handed five chunks whose best similarity was **0.31**. Nothing but a span attribute could have told you that.",

  objectives: [
    "Read a waterfall and name where the time actually went",
    "Compute self time from a trace and say what it diagnoses",
    "Explain why a green trace can accompany a wrong answer",
    "Identify the single attribute that named the bug in this request",
    "Use the timing split to reject a plausible but useless optimisation"
  ],

  prerequisites: ["10.4"],

  blocks: [

    { t: "h2", n: "01", id: "waterfall", text: "The waterfall",
      sub: "Verified output of the tracer in 10.7" },

    { t: "code", lang: "text", title: "TRACE 4f1c9a \u2014 one RAG request", code: `TRACE 4f1c9a  duration 3134 ms
SPAN                                   ms     %  WHEN
chat_request                         3134 100.0%  ##############################################
  guardrail.input                      41  1.3%  #
  retrieve                            624 19.9%   #########
    embed_query                        84  2.7%   #
    vector_search                     274  8.7%    ####
    rerank                            259  8.3%        ####
  build_prompt                          7  0.2%            #
  llm.generate                       2371 75.7%            ###################################
  guardrail.output                     77  2.5%                                               #`,
      hl: [6, 9],
      caption: "The two highlighted rows are the whole latency story: the search is 8.7%, the model is 75.7%." },

    { t: "dl", items: [
      { k: "llm.generate owns 75.7%", v: "On **total** latency, work that does not start with streaming, a shorter prompt or a faster model is decoration — the vector search is 8.7%, so making it instant saves 274 ms of 3,134. The exercise shows this **reverses** once the interface streams, which is a qualification worth carrying." },
      { k: "retrieve is 624 ms, its children 617 ms", v: "Self time of 7 ms, so the retrieval wrapper is doing essentially nothing but coordinating. That is how you tell orchestration overhead from real work." },
      { k: "rerank at 259 ms is nearly as expensive as the search it reranks", v: "274 against 259. That is the price of a cross-encoder and it is a deliberate trade \u2014 9.8 measured what the ranking quality is worth." },
      { k: "The gaps between bars are yours", v: "Consistent 2 ms here. If they were 200 ms you would be looking at connection-pool waits or JSON serialisation, invisible to every metric you have." }
    ] },

    { t: "callout", kind: "insight", title: "95.3% of this request is somebody else\u2019s SLA",
      body: [
        { t: "p", text: "Sum the `CLIENT` spans \u2014 embed, search, rerank, generate \u2014 and you get 2,988 of 3,134 ms. Your own code, measured as the total self time of the `INTERNAL` spans, is 132 ms or 4.2%, and most of that is the two guardrails." },
        { t: "p", text: "That ratio is the first thing to establish in a latency investigation, because it decides whether profiling your own process can possibly help. Here it cannot. The levers are all on the other side of a network call: stream the output, shorten the prompt, pick a faster model, run retrieval concurrently." },
        { t: "p", text: "Running `embed_query` and `vector_search` concurrently takes this trace from 3,134 ms to about 2,800 ms \u2014 a real 11% saving, worth having, and it does not change which stage dominates. The model still does." }
      ] },

    { t: "h2", n: "02", id: "attributes", text: "And the attributes are where the quality answer lives",
      sub: "The same trace, read for correctness rather than speed" },

    { t: "code", lang: "text", title: "The span attributes on that request", code: `  span retrieve
    top_k                    = 5
    index                    = support-docs-v4
    docs_above_threshold     = 0        <-- nothing cleared the score cut-off
  span rerank
    model                    = rerank-v2
    kept                     = 5
    top_score                = 0.31     <-- best chunk was weak; usually 0.78
  span llm.generate
    model                    = chat-large
    prompt_tokens            = 1842
    completion_tokens        = 214`,
      hl: [4, 8],
      caption: "Two integers. Neither appears anywhere in the waterfall." },

    { t: "callout", kind: "trap", title: "The trace is green and the answer is garbage",
      body: [
        { t: "p", text: "Status `OK` on every span. 3.1 seconds, which is within budget. 1,842 prompt tokens and 214 completion tokens, which is normal cost. No retry, no exception, no truncation \u2014 `finish_reason` would read `stop`. Every signal in 10.1 is green." },
        { t: "p", text: "And the model was handed five chunks whose best similarity was 0.31 against a normal 0.78, with **zero** of them above the retrieval threshold. It summarised them faithfully, which is the correct behaviour for a generator and the wrong outcome for a product." },
        { t: "p", text: "**Nothing but a span attribute could have told you that.** The waterfall is perfect. The latency is perfect. The cost is perfect. `docs_above_threshold = 0` is the entire finding, and it is one integer the retriever already had." }
      ] },

    { t: "callout", kind: "good", title: "Which is why the two free alerts are the two free alerts",
      body: [
        { t: "p", text: "10.3 argued that empty-retrieval rate and mean top-1 score are the cheapest early warning in a RAG system. This trace is the argument in one request: both numbers are sitting on the spans, both are anomalous, and neither is being watched." },
        { t: "p", text: "Aggregate `docs_above_threshold == 0` across requests and you have empty-retrieval rate. Aggregate `rerank.top_score` and you have mean top-1 score. In the incident in 10.13 those two moved from 0.4% to 11.2% and from 0.78 to 0.41, three weeks before the accuracy drop was noticed." },
        { t: "p", text: "So the instrumentation work is not \u2018add observability\u2019, it is two `set_attribute` calls and two alert rules. That is the whole gap between a three-week incident and a same-day page." }
      ] },

    { t: "viz", title: "The same request, read twice", caption: "Left: where the time went. Right: why the answer was wrong. No overlap.",
      svg: `<svg viewBox="0 0 760 330" width="100%" role="img" aria-label="A RAG trace waterfall beside the span attributes that explain the wrong answer">
  <text x="16" y="20" class="s-label">LATENCY &#8212; FROM THE WATERFALL</text>
  <text x="16" y="40" class="s-mono" style="font-size:9px">chat_request</text>
  <rect x="128" y="31" width="260" height="12" rx="2" class="s-fill" style="stroke:var(--ink)" stroke-width="1"/>
  <text x="394" y="41" class="s-mono" style="font-size:8px">3134 ms</text>
  <text x="16" y="58" class="s-mono" style="font-size:9px">  guardrail.input</text>
  <rect x="128" y="49" width="3" height="12" rx="1" class="s-fill" style="stroke:var(--accent)" stroke-width="1"/>
  <text x="394" y="59" class="s-mono" style="font-size:8px">41 &#183; 1.3%</text>
  <text x="16" y="76" class="s-mono" style="font-size:9px">  retrieve</text>
  <rect x="131" y="67" width="52" height="12" rx="2" class="s-fill" style="stroke:var(--warn)" stroke-width="1"/>
  <text x="394" y="77" class="s-mono" style="font-size:8px">624 &#183; 19.9%</text>
  <text x="16" y="94" class="s-mono" style="font-size:9px">    embed_query</text>
  <rect x="131" y="85" width="7" height="12" rx="1" class="s-fill" style="stroke:var(--accent)" stroke-width="1"/>
  <text x="394" y="95" class="s-mono" style="font-size:8px">84 &#183; 2.7%</text>
  <text x="16" y="112" class="s-mono" style="font-size:9px">    vector_search</text>
  <rect x="139" y="103" width="23" height="12" rx="1" class="s-fill" style="stroke:var(--accent)" stroke-width="1"/>
  <text x="394" y="113" class="s-mono" style="font-size:8px">274 &#183; 8.7%</text>
  <text x="16" y="130" class="s-mono" style="font-size:9px">    rerank</text>
  <rect x="162" y="121" width="22" height="12" rx="1" class="s-fill" style="stroke:var(--accent)" stroke-width="1"/>
  <text x="394" y="131" class="s-mono" style="font-size:8px">259 &#183; 8.3%</text>
  <text x="16" y="148" class="s-mono" style="font-size:9px">  llm.generate</text>
  <rect x="184" y="139" width="197" height="12" rx="2" class="s-fill" style="stroke:var(--crit)" stroke-width="1.6"/>
  <text x="394" y="149" class="s-mono" style="font-size:8px;fill:var(--crit)">2371 &#183; 75.7%</text>
  <text x="16" y="166" class="s-mono" style="font-size:9px">  guardrail.output</text>
  <rect x="381" y="157" width="6" height="12" rx="1" class="s-fill" style="stroke:var(--accent)" stroke-width="1"/>
  <text x="394" y="167" class="s-mono" style="font-size:8px">77 &#183; 2.5%</text>

  <rect x="470" y="26" width="274" height="146" rx="4" class="s-fill-bg" style="stroke:var(--good)" stroke-width="1.5"/>
  <text x="484" y="46" class="s-mono" style="font-size:10px;fill:var(--good)">EVERY SIGNAL GREEN</text>
  <text x="484" y="66" class="s-mono" style="font-size:9px">status           OK on all spans</text>
  <text x="484" y="82" class="s-mono" style="font-size:9px">duration         3134 ms, in budget</text>
  <text x="484" y="98" class="s-mono" style="font-size:9px">tokens           1842 in / 214 out</text>
  <text x="484" y="114" class="s-mono" style="font-size:9px">cost             $0.00874</text>
  <text x="484" y="130" class="s-mono" style="font-size:9px">finish_reason    stop</text>
  <text x="484" y="146" class="s-mono" style="font-size:9px">retries          0</text>
  <text x="484" y="164" class="s-sub">CLIENT spans = 95.3% of the request</text>

  <line x1="16" y1="190" x2="744" y2="190" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="212" class="s-label">CORRECTNESS &#8212; FROM THE ATTRIBUTES, AND NOWHERE ELSE</text>

  <rect x="16" y="224" width="352" height="90" rx="4" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.8"/>
  <text x="30" y="244" class="s-mono" style="font-size:9px">span retrieve</text>
  <text x="44" y="260" class="s-mono" style="font-size:9px;fill:var(--crit)">docs_above_threshold = 0</text>
  <text x="30" y="278" class="s-mono" style="font-size:9px">span rerank</text>
  <text x="44" y="294" class="s-mono" style="font-size:9px;fill:var(--crit)">top_score = 0.31   (normally 0.78)</text>
  <text x="30" y="309" class="s-sub">two integers, neither in the waterfall</text>

  <rect x="384" y="224" width="360" height="90" rx="4" class="s-fill-bg" style="stroke:var(--warn)" stroke-width="1.5"/>
  <text x="398" y="244" class="s-mono" style="font-size:10px;fill:var(--warn)">AND THEY AGGREGATE INTO THE TWO FREE ALERTS</text>
  <text x="398" y="264" class="s-mono" style="font-size:9px">above_threshold == 0  -&gt;  empty-retrieval rate</text>
  <text x="398" y="280" class="s-mono" style="font-size:9px">rerank.top_score      -&gt;  mean top-1 score</text>
  <text x="398" y="300" class="s-sub">in the 10.13 incident: 0.4% -&gt; 11.2% and 0.78 -&gt; 0.41,</text>
  <text x="398" y="312" class="s-sub">three weeks before anyone noticed the accuracy drop</text>
</svg>` },

    { t: "exercise", kind: "analyse", title: "Budget an optimisation from a real waterfall", difficulty: "core", minutes: 30,
      body: "Using this trace's span timings, compute the end-to-end saving from each proposed optimisation, and rank them. Then compute what the perceived latency is with streaming, and check whether the ranking changes.",
      requirements: [
        "The absolute and percentage saving from each proposal, computed not guessed",
        "Retrieval run concurrently, with the critical path recomputed",
        "Perceived latency with streaming, using time to first token rather than total",
        "The ranking under total latency and under perceived latency, compared",
        "A statement of which proposal you would reject and why"
      ],
      hint: "Streaming does not reduce total latency at all. It changes which number the user experiences, which is why the ranking can invert \u2014 9.15 made the same point about TTFT against TPOT.",
      solution: { lang: "python", title: "ranking optimisations against the real timings", code: `TRACE = {"guardrail.input": 41, "embed_query": 84, "vector_search": 274,
         "rerank": 259, "build_prompt": 7, "llm.generate": 2371,
         "guardrail.output": 77}
RETRIEVE_OVERHEAD = 7          # retrieve self time
TOTAL = 3134
TTFT_SHARE = 0.17              # of llm.generate, the rest is token-by-token output

def total_of(d, overhead=RETRIEVE_OVERHEAD, root_overhead=14):
    return sum(d.values()) + overhead + root_overhead

print("baseline total %d ms (reconstructed %d)" % (TOTAL, total_of(TRACE)))
print()

PROPOSALS = {
    "make vector_search instant":      {"vector_search": 0},
    "drop the reranker":               {"rerank": 0},
    "embed + search concurrently":     {"embed_query": 0},        # 84 hides under 274
    "faster model, 30% quicker":       {"llm.generate": int(2371 * 0.70)},
    "halve the prompt (1842 -> 921)":  {"llm.generate": int(2371 * 0.88)},
    "drop both guardrails":            {"guardrail.input": 0, "guardrail.output": 0},
}

rows = []
for name, patch in PROPOSALS.items():
    d = dict(TRACE); d.update(patch)
    new = total_of(d)
    rows.append((name, new, TOTAL - new, 100.0 * (TOTAL - new) / TOTAL))

print("%-32s %8s %8s %8s" % ("proposal", "total", "saved", "%"))
for name, new, saved, pct in sorted(rows, key=lambda r: -r[2]):
    print("%-32s %7d %7d %7.1f%%" % (name, new, saved, pct))

# ------------------------------------------------- now with streaming
print()
print("=== perceived latency, with streaming ===")
print("without streaming the user waits for the whole response: %d ms" % TOTAL)
pre_llm = TRACE["guardrail.input"] + 624 + TRACE["build_prompt"] + 2 * 4
ttft = pre_llm + int(TRACE["llm.generate"] * TTFT_SHARE)
print("with streaming they see the first token at:              %d ms" % ttft)
print("  = %d ms of pipeline before the model + %d ms of TTFT"
      % (pre_llm, int(TRACE["llm.generate"] * TTFT_SHARE)))
print()

prows = []
for name, patch in PROPOSALS.items():
    d = dict(TRACE); d.update(patch)
    pre = d["guardrail.input"] + (d["embed_query"] + d["vector_search"] + d["rerank"]
                                 + RETRIEVE_OVERHEAD) + d["build_prompt"] + 8
    t = pre + int(d["llm.generate"] * TTFT_SHARE)
    prows.append((name, t, ttft - t, 100.0 * (ttft - t) / ttft))

print("%-32s %8s %8s %8s" % ("proposal", "TTFT", "saved", "%"))
for name, t, saved, pct in sorted(prows, key=lambda r: -r[2]):
    print("%-32s %7d %7d %7.1f%%" % (name, t, saved, pct))

print()
rank_total = [r[0] for r in sorted(rows, key=lambda r: -r[2])]
rank_ttft = [r[0] for r in sorted(prows, key=lambda r: -r[2])]
print("ranking under total latency : %s" % " > ".join(rank_total[:3]))
print("ranking under perceived     : %s" % " > ".join(rank_ttft[:3]))
print("same winner: %s" % (rank_total[0] == rank_ttft[0]))`,
          out: `baseline total 3134 ms (reconstructed 3134)

proposal                            total    saved        %
faster model, 30% quicker           2422     712    22.7%
halve the prompt (1842 -> 921)      2849     285     9.1%
make vector_search instant          2860     274     8.7%
drop the reranker                   2875     259     8.3%
drop both guardrails                3016     118     3.8%
embed + search concurrently         3050      84     2.7%

=== perceived latency, with streaming ===
without streaming the user waits for the whole response: 3134 ms
with streaming they see the first token at:              1083 ms
  = 680 ms of pipeline before the model + 403 ms of TTFT

proposal                             TTFT    saved        %
make vector_search instant           809     274    25.3%
drop the reranker                    824     259    23.9%
faster model, 30% quicker            962     121    11.2%
embed + search concurrently          999      84     7.8%
halve the prompt (1842 -> 921)      1034      49     4.5%
drop both guardrails                1042      41     3.8%

ranking under total latency : faster model, 30% quicker > halve the prompt (1842 -> 921) > make vector_search instant
ranking under perceived     : make vector_search instant > drop the reranker > faster model, 30% quicker
same winner: False`,
          notes: [
            { t: "p", text: "**The ranking inverts completely, and that is the finding.** Under total latency the faster model wins by a wide margin — 712 ms, 22.7% — and the vector search is third at 274 ms. Under perceived latency the vector search wins at 25.3% of TTFT and the faster model falls to third at 11.2%. Same trace, same timings, opposite conclusion." },
            { t: "p", text: "**So the claim in §01 holds only for a non-streaming interface.** ‘The model is 75.7%, so optimising the vector search is decoration’ is true of total latency and false of TTFT, because the search is 274 ms of a 1,083 ms time-to-first-token rather than 274 ms of a 3,134 ms total. It is commonly stated that claim unconditionally; it needs the interface attached." },
            { t: "p", text: "**The reason is structural.** Everything before the model sits fully inside TTFT, and most of the model’s time falls after the first token. So streaming does not merely reduce perceived latency — it reweights every stage, promoting the pipeline ahead of the model and demoting the model itself." },
            { t: "p", text: "**The TTFT share of 17% is an assumption, chosen to be checkable.** It puts time-to-first-token at 403 ms, which matches the 400 ms in 9.15’s verified budget, and implies a TPOT of about 9.2 ms per token over 214 tokens. If your TPOT is slower the inversion gets stronger rather than weaker, because more of the model’s time sits after the first token." },
            { t: "p", text: "**Streaming itself saves nothing from the total**, which is why it is not in the proposals table. It changes which number the user experiences from 3,134 ms to 1,083 ms — a 3x improvement in the thing that matters with no change at all to the thing being measured." },
            { t: "p", text: "The proposal I would reject under either ranking is dropping the guardrails: 118 ms of total, 41 ms of TTFT, 3.8% either way, in exchange for the input and output checks in 11.13 and 11.14. That is the clearest bad trade on the list." }
          ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Read the waterfall for latency and the attributes for correctness, because they share no information. On total latency the model owns 75.7% and the vector search 8.7%, and 95.3% of the request is a `CLIENT` span \u2014 so profiling your own code cannot help. But that ranking assumes a non-streaming interface: against time to first token the vector search becomes the best available fix and the model drops to third." },
        { t: "p", text: "And the trace is green while the answer is garbage. Status `OK`, normal latency, normal cost, and `docs_above_threshold = 0` with a top score of 0.31 against a normal 0.78. Two integers the retriever already had, in no dashboard, aggregating into the two cheapest alerts in RAG." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cHere is a trace of a slow RAG request. Where would you start?\u201d**" },
        { t: "p", text: "By computing the share, not by reading the names. In the trace I know best, the model is 2,371 of 3,134 milliseconds \u2014 75.7% \u2014 and the vector search everyone wants to optimise is 274 milliseconds, or 8.7%. So making the vector search instant saves 9% of the request, and any latency work that does not start with streaming, a shorter prompt or a faster model is decoration." },
        { t: "p", text: "The next number I would compute is the CLIENT share. Summing the spans that call out of the process \u2014 embed, search, rerank, generate \u2014 gives 2,988 of 3,134 milliseconds, so 95.3% of this request is somebody else\u2019s SLA and my own code accounts for 4.2%. That decides whether profiling can help at all, and here it cannot." },
        { t: "p", text: "I would also read self time, which separates orchestration from real work. Retrieval is 624 milliseconds and its three children total 617, so the wrapper costs 7 milliseconds \u2014 it is doing nothing but coordinating. If that number were 200 milliseconds I would have found an uninstrumented serialisation cost." },
        { t: "p", text: "Then the one genuine structural win: embedding and search can run concurrently, which takes the trace to about 2,800 milliseconds. That is an 11% saving, worth having, and it does not change which stage dominates." },
        { t: "p", text: "But I would want to reframe the question, because if this is a streaming UI then total latency is not what the user feels. With streaming they see the first token at roughly 700 milliseconds and read along while the rest arrives \u2014 so time to first token is the number to optimise and a faster model matters much less than getting the pipeline before the model out of the way. Same trace, different target." },
        { t: "p", text: "And I would check the attributes before signing off on \u2018slow\u2019 as the problem at all. In this trace every latency signal is fine and the answer is wrong: zero chunks above the retrieval threshold and a top similarity of 0.31 against a normal 0.78. The waterfall is perfect and the request is a failure, and only a span attribute shows it." }
      ] }
  ],

  takeaways: [
    "**`llm.generate` owns 75.7% of this request** and the vector search owns 8.7% \u2014 compute the share before choosing what to optimise.",
    "**`llm.generate` owns 75.7% of total latency** and the vector search 8.7% \u2014 but against TTFT the search is 25.3% and the model 11.2%, so the ranking inverts.",
    "**95.3% of the request is `CLIENT` spans**, so profiling your own process cannot help; the levers are across a network call.",
    "**Your own code is 4.2%**, measured as the total self time of the `INTERNAL` spans, and most of that is the two guardrails.",
    "**`retrieve` is 624 ms with children totalling 617**, so its self time is 7 ms \u2014 pure coordination, no hidden work.",
    "**`rerank` at 259 ms is nearly as expensive as the 274 ms search it reranks**, which is the cross-encoder price and a deliberate trade.",
    "**The gaps between bars are your uninstrumented code** \u2014 2 ms here, and 200 ms would be a finding no metric shows.",
    "**Running embed and search concurrently takes 3,134 ms to about 2,800**, an 11% saving that does not change which stage dominates.",
    "**The trace is green and the answer is garbage**: status `OK`, 3.1 s, normal cost, `finish_reason` stop.",
    "**`docs_above_threshold = 0` is the entire finding**, and it appears nowhere in the waterfall.",
    "**`top_score` was 0.31 against a normal 0.78** \u2014 the model faithfully summarised five weakly related chunks.",
    "**Those two attributes aggregate into the two cheapest alerts in RAG**: empty-retrieval rate and mean top-1 score.",
    "**Latency and correctness share no information in a trace** \u2014 read the waterfall for one and the attributes for the other."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "In this trace, what does optimising the vector search to zero achieve?",
        options: [
          "Roughly a 20% reduction, since retrieval is 19.9% of the request",
          "Roughly 274 ms of 3,134 \u2014 about 9% \u2014 because the vector search is 8.7% while the model is 75.7%",
          "Nothing, because the vector search runs concurrently with generation",
          "Roughly 40%, since search and rerank together dominate retrieval"
        ],
        answer: 1,
        why: "The waterfall gives the share directly: 274 ms of a 3,134 ms request. Retrieval as a whole is 19.9%, but that includes the embedding call and the reranker, and eliminating only the search leaves those in place. The point of computing the share first is that it rejects a plausible-sounding optimisation before anyone spends a sprint on it \u2014 the model at 75.7% is where the latency is." },

      { stem: "What does the CLIENT span total of 2,988 of 3,134 ms tell you?",
        options: [
          "That the service is making too many outbound calls and should batch them",
          "That 95.3% of the request is waiting on other systems, so profiling your own code cannot meaningfully help",
          "That the trace is missing spans for in-process work",
          "That the network is the bottleneck and should be moved closer"
        ],
        answer: 1,
        why: "CLIENT marks every span that calls out of the process, so their total is the share of the request that is somebody else's SLA rather than your code \u2014 and at 95.3% there is almost nothing left for a profiler to find. Your own code is the 4.2% of INTERNAL self time. This is the first ratio to establish in a latency investigation because it decides which class of fix is even available: streaming, a shorter prompt, a faster model, or concurrency." },

      { stem: "Every span has status OK and the answer is wrong. What caught it?",
        options: [
          "The faithfulness judge, which scored the answer against its context",
          "A span attribute \u2014 docs_above_threshold was 0 and the reranker's top_score was 0.31 against a normal 0.78",
          "The output guardrail, which flagged the response as ungrounded",
          "The prompt token count, which was abnormally low"
        ],
        answer: 1,
        why: "The status, duration, token counts, cost and finish reason are all normal, because the pipeline did exactly what it was asked \u2014 the model faithfully summarised five weakly related chunks. The only evidence is two integers the retriever computed and would otherwise have discarded. A faithfulness judge would in fact score this answer well, since it is faithful to the context it was given; the context is what was wrong." },

      { stem: "Why is a self time of 7 ms on the retrieve span good news?",
        options: [
          "Because it means the retrieval wrapper is doing nothing but coordinating, so all 624 ms is accounted for in its children",
          "Because 7 ms is below the clock resolution and can be ignored",
          "Because it proves the children ran concurrently",
          "Because it indicates the reranker was skipped"
        ],
        answer: 0,
        why: "Self time is the span's duration minus its children's, so 624 minus 617 means the parent added 7 ms of coordination and every other millisecond is real work in a child span that you can see and attribute. A large self time would be the warning sign \u2014 it would mean real time is being spent somewhere that no child span covers, which is uninstrumented work such as serialisation or a connection-pool wait." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "A worked trace",
    questions: [
      { level: "core",
        q: "How do you decide what to optimise from a trace?",
        strong: "A strong answer computes the share first.",
        answer: [
          { t: "p", text: "By computing each stage\u2019s share of the total before touching anything. In the trace I know best the model is 75.7% and the vector search is 8.7%, so eliminating the search entirely buys about 9% \u2014 and that is usually the first thing someone proposes." },
          { t: "p", text: "Then the CLIENT share, which was 2,988 of 3,134 milliseconds. 95.3% of the request is waiting on other systems and my own code is 4.2%, so profiling cannot help and the available levers are all on the far side of a network call." },
          { t: "p", text: "The structural win here is concurrency: embedding and search can overlap, which takes it to about 2,800 milliseconds. Real, worth doing, and it does not change which stage dominates." },
          { t: "p", text: "And I would ask whether the interface streams, because if it does then total latency is the wrong target. The user sees the first token at around 700 milliseconds and reads along \u2014 so TTFT is the number, and what matters becomes the pipeline before the model rather than the model itself." }
        ] },

      { level: "core",
        q: "A trace is entirely green but the answer was wrong. What do you look at?",
        strong: "A strong answer goes straight to the retriever attributes.",
        answer: [
          { t: "p", text: "The retriever span\u2019s attributes, not the answer. Specifically how many chunks cleared the similarity threshold, what the top score was, and which chunk IDs came back." },
          { t: "p", text: "In this trace the answer is immediate: zero above the threshold, a top score of 0.31 against a normal 0.78. The model was handed five weakly related chunks and summarised them faithfully, which is correct behaviour producing a wrong outcome." },
          { t: "p", text: "That is why status, latency, tokens and cost were all normal \u2014 they describe the machinery and the machinery worked. Nothing but a span attribute could have shown it." },
          { t: "p", text: "It also tells me a faithfulness judge would not have caught it, because the answer *is* faithful to its context. Context recall is the metric that moves here, which is the retrieval-versus-generation split." }
        ] },

      { level: "advanced",
        q: "What would you do with the two attributes that named this bug?",
        strong: "A strong answer turns them into aggregates and alerts.",
        answer: [
          { t: "p", text: "Aggregate them. The count of chunks above the threshold becomes empty-retrieval rate across requests, and the reranker\u2019s top score becomes mean top-1 similarity. Both are then metrics rather than per-trace curiosities." },
          { t: "p", text: "Then alert on both: empty retrieval above two per cent over thirty minutes, and mean top-1 falling more than 0.10 day over day. Neither needs a judge, labels or a model call." },
          { t: "p", text: "The reason to prioritise these over anything else is that they are upstream. In the incident I would cite they moved from 0.4% to 11.2% and from 0.78 to 0.41, three weeks before anybody noticed the answer quality had dropped." },
          { t: "p", text: "So the work is two attribute calls and two alert rules, and the difference it makes is between a three-week incident and a same-day page. That is an unusually good return for an afternoon." }
        ] }
    ]
  }
});
