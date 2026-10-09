EC.receiveLesson({
  id: "9.15",

  lede: "Quality is half the evaluation; these decide whether it can ship. The worked budget is four numbers: TTFT **400 ms**, TPOT **25 ms/token**, 200 output tokens, total **5,400 ms** \u2014 verified. And the reason TTFT and TPOT are reported separately rather than summed is the whole lesson: with streaming the user sees text at 400 ms and reads along; without it they stare at a spinner for 5.4 seconds. **Same metrics, completely different product.**",

  objectives: [
    "Define TTFT, TPOT, total latency, throughput, cost per request and cache hit rate",
    "Compute a latency budget and say which number the user feels",
    "Explain why streaming changes which metric matters",
    "Report p50 and p95 rather than a mean",
    "Price a design before committing to it"
  ],

  prerequisites: ["9.1", "6.2"],

  blocks: [

    { t: "h2", n: "01", id: "six", text: "Six operational metrics",
      sub: "And the first two are the ones that matter" },

    { t: "table",
      head: ["Metric", "Definition", "Why it matters"],
      rows: [
        ["**TTFT** \u2014 time to first token", "Request sent \u2192 first token out", "**What the user feels.** Streaming makes this the real latency metric"],
        ["**TPOT** \u2014 time per output token", "Steady-state generation speed", "Whether the text outruns reading speed (~25 tokens/s is comfortable)"],
        ["Total latency", "TTFT + TPOT \u00d7 output tokens", "The number for a non-streaming API"],
        ["Throughput", "Requests or tokens per second across the fleet", "Capacity planning"],
        ["Cost per request", "(input \u00d7 in-rate + output \u00d7 out-rate)", "Multiply by volume **before** committing to a design"],
        ["Cache hit rate", "Prompt-cache or semantic-cache hits", "The cheapest latency and cost win available"]
      ] },

    { t: "h2", n: "02", id: "budget", text: "The worked budget",
      sub: "Four numbers, one multiplication" },

    { t: "code", lang: "text", title: "verified", code: `TTFT   = 400 ms
TPOT   = 25 ms/token
output = 200 tokens

total = 400 + (25 x 200) = 400 + 5,000 = 5,400 ms`,
      hl: [5],
      caption: "5.4 seconds. The arithmetic is trivial; what it means depends entirely on one product decision." },

    { t: "callout", kind: "insight", title: "Same metrics, completely different product",
      body: [
        { t: "p", text: "**With streaming**, the user sees text at 400 ms and reads along as it arrives. At 25 ms per token the text appears at 40 tokens per second, comfortably above the ~25 tokens/s that reads naturally, so the generation outruns them and it feels fast." },
        { t: "p", text: "**Without streaming**, they stare at a spinner for 5.4 seconds and then receive everything at once. Identical TTFT, identical TPOT, identical total \u2014 and a completely different experience." },
        { t: "p", text: "That is why TTFT and TPOT are reported separately rather than collapsed into a total. The total is the right number for a non-streaming API and a misleading one for a streaming product, where TTFT is what the user feels and TPOT only matters relative to reading speed." }
      ] },

    { t: "callout", kind: "good", title: "Which makes TPOT a threshold rather than a quantity to minimise",
      body: [
        { t: "p", text: "Once generation outruns reading speed, further TPOT improvements are invisible to the user. Going from 25 ms to 20 ms per token takes you from 40 to 50 tokens per second, and both are already faster than anyone reads." },
        { t: "p", text: "So the optimisation target is TTFT, which is felt directly, and TPOT only until it clears the threshold. That reorders the usual engineering instinct, which is to optimise total throughput." },
        { t: "p", text: "6.2 reached the structurally identical conclusion about retrieval \u2014 tuning the index optimises about 1% of a request while the re-ranker decision optimises the rest. In both cases the number people reach for is not the one the user experiences." }
      ] },

    { t: "h2", n: "03", id: "percentiles", text: "p50 and p95, never the mean",
      sub: "Because the distribution has a long tail" },

    { t: "callout", kind: "warn", title: "A p50 of 1 s with a p95 of 12 s is a bad experience for one user in twenty",
      body: [
        { t: "p", text: "LLM latency distributions have long tails \u2014 variable output length, queueing, cache misses, retries \u2014 and the mean hides them. A mean of 2 s is consistent with almost everyone getting 1 s and one in twenty getting 12 s." },
        { t: "p", text: "One in twenty is not an edge case at volume. At a thousand requests an hour it is fifty people an hour having a bad time, and they are disproportionately the ones who complain and churn." },
        { t: "p", text: "So report **p50 and p95** as a pair, and watch the gap. A widening gap with a stable p50 means the tail is growing while the typical case is fine \u2014 which is exactly the pattern a mean cannot show and 9.16\u2019s confidence intervals cannot either, because they describe the estimate rather than the distribution." }
      ] },

    { t: "callout", kind: "insight", title: "And percentiles do not compose, which catches people",
      body: [
        { t: "p", text: "The p95 of a pipeline is **not** the sum of its stages\u2019 p95s. If three stages each have a p95 of 1 s, the pipeline\u2019s p95 is well under 3 s, because the stages rarely hit their tails simultaneously \u2014 unless their latencies are correlated, in which case it can be worse." },
        { t: "p", text: "The practical consequence is that you measure the pipeline end to end rather than adding up component budgets. Adding p95s gives a pessimistic figure that leads to over-provisioning; assuming independence gives an optimistic one that leads to surprise." },
        { t: "p", text: "6.2 measured the component figures for a RAG pipeline \u2014 11 ms of retrieval against 2,405 ms for a cross-encoder on CPU \u2014 and the lesson there transfers: find which stage dominates before optimising, because it is rarely the one people reach for." }
      ] },

    { t: "h2", n: "04", id: "cost", text: "Cost, and the cheapest win",
      sub: "Multiply by volume before committing" },

    { t: "callout", kind: "good", title: "Cache hit rate is the cheapest latency and cost win available",
      body: [
        { t: "p", text: "A cache hit costs nothing and returns immediately, so it improves both axes at once \u2014 which almost nothing else in this list does. 6.7 put caching first in its scaling priority for exactly that reason: the cheapest request is one that never runs." },
        { t: "p", text: "Prompt caching is the uncontroversial form, since it is a pure optimisation with identical output. Semantic caching is the one needing care, because 6.7 measured that its threshold is a **correctness** decision rather than a performance one \u2014 the populations of answerable and unanswerable queries overlap." },
        { t: "p", text: "So report the hit rate and, for a semantic cache, how its negative test set was built. A hit rate that looks great because the threshold is loose is returning wrong cached answers, which is worse than a miss." }
      ] },

    { t: "callout", kind: "note", title: "Multiply by volume before you commit, because the per-request figure is reassuring",
      body: [
        { t: "p", text: "Cost per request is input tokens times the input rate plus output tokens times the output rate, and the number is almost always small enough to ignore. The design decision happens when you multiply by expected volume." },
        { t: "p", text: "7.2\u2019s arithmetic is the general version: an apparently modest premium became larger than the entire training run it was meant to avoid once the quantities were worked through. Per-unit figures are systematically reassuring." },
        { t: "p", text: "And 8.9\u2019s refinement applies for anything that can fail: cost per **resolved** task rather than per request, because per-request pricing rewards a system that gives up quickly \u2014 measured at a 22% gap on one agent run." }
      ] },

    { t: "viz", title: "The same 5.4 seconds, two products", caption: "TTFT is what the user feels. TPOT is a threshold against reading speed, not a quantity to minimise.",
      svg: `<svg viewBox="0 0 760 260" width="100%" role="img" aria-label="Streaming versus non-streaming experience of the same latency budget">
  <text x="16" y="22" class="s-label">TTFT 400 ms \u00b7 TPOT 25 ms/token \u00b7 200 tokens \u00b7 TOTAL 5,400 ms</text>

  <text x="16" y="56" class="s-sub" style="font-size:9px">STREAMING</text>
  <rect x="130" y="44" width="40" height="18" rx="2" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="178" y="58" class="s-mono" style="font-size:9px;fill:var(--good)">400 ms \u2014 first token, user starts reading</text>
  <rect x="130" y="66" width="520" height="10" rx="2" class="s-fill-bg" style="stroke:var(--good)" stroke-width="1.2"/>
  <text x="130" y="90" class="s-sub" style="font-size:9px">40 tokens/s arriving \u2014 above the ~25 tokens/s that reads comfortably, so it outruns them</text>

  <text x="16" y="126" class="s-sub" style="font-size:9px">NOT STREAMING</text>
  <rect x="130" y="114" width="520" height="18" rx="2" class="s-fill" style="stroke:var(--crit)" stroke-width="1.6"/>
  <text x="300" y="127" text-anchor="middle" class="s-mono" style="font-size:9px;fill:var(--crit)">spinner \u2014 5,400 ms of nothing</text>
  <text x="658" y="128" class="s-mono" style="font-size:9px;fill:var(--crit)">then everything at once</text>

  <line x1="16" y1="156" x2="744" y2="156" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="178" class="s-mono" style="fill:var(--warn)">identical TTFT, identical TPOT, identical total \u2014 completely different product</text>
  <text x="16" y="200" class="s-sub">so TPOT is a THRESHOLD against reading speed, not a quantity to minimise: 20 ms vs 25 ms is invisible</text>
  <text x="16" y="226" class="s-mono" style="fill:var(--crit)">always report p50 AND p95 \u2014 a p50 of 1s with a p95 of 12s is bad for one user in twenty</text>
  <text x="16" y="248" class="s-sub">and percentiles do not add: three stages at p95 = 1s give a pipeline p95 well under 3s, unless correlated</text>
</svg>` },

    { t: "exercise", kind: "build", title: "Build the latency and cost budget", difficulty: "core", minutes: 30,
      body: "Measure TTFT and TPOT separately for your own system, compute the total, and report p50 and p95 for each. Then compute cost per resolved task at your actual volume, and state which single change would most improve what the user feels.",
      requirements: [
        "TTFT and TPOT measured separately, with p50 and p95 for each",
        "Total latency computed, and stated whether the product streams",
        "Cost per request and per resolved task, multiplied out to monthly volume",
        "Cache hit rate, and for a semantic cache how the negative set was built",
        "Name the one change that most improves the user-felt metric"
      ],
      hint: "Measure the pipeline end to end for p95 rather than adding component p95s — stages rarely hit their tails together, so the sum is pessimistic unless the latencies are correlated.",
      solution: { lang: "python", title: "the budget, measured and multiplied out", code: `import numpy as np

def budget(samples, streams, in_rate, out_rate, monthly_requests, resolved_frac):
    """samples: list of dicts with ttft_ms, tpot_ms, out_tokens, in_tokens."""
    ttft = np.array([s["ttft_ms"] for s in samples])
    tpot = np.array([s["tpot_ms"] for s in samples])
    toks = np.array([s["out_tokens"] for s in samples])
    total = ttft + tpot * toks

    pct = lambda a, q: float(np.percentile(a, q))
    cost_req = np.mean([s["in_tokens"] * in_rate + s["out_tokens"] * out_rate
                        for s in samples])

    return {
        "ttft_p50": pct(ttft, 50),  "ttft_p95": pct(ttft, 95),
        "tpot_p50": pct(tpot, 50),  "tpot_p95": pct(tpot, 95),
        "total_p50": pct(total, 50), "total_p95": pct(total, 95),
        "tokens_per_sec": 1000 / pct(tpot, 50),
        "outruns_reading": (1000 / pct(tpot, 50)) > 25,
        "user_felt_metric": "TTFT" if streams else "total latency",
        "cost_per_request": cost_req,
        "cost_per_resolved": cost_req / max(resolved_frac, 1e-9),
        "monthly_cost": cost_req * monthly_requests,
    }

m = budget(SAMPLES, streams=True, in_rate=3e-6, out_rate=1.5e-5,
           monthly_requests=2_000_000, resolved_frac=0.82)

print("TTFT  p50 %.0f ms   p95 %.0f ms   <- what the user feels (streaming)"
      % (m["ttft_p50"], m["ttft_p95"]))
print("TPOT  p50 %.1f ms  p95 %.1f ms   = %.0f tokens/s  (outruns reading: %s)"
      % (m["tpot_p50"], m["tpot_p95"], m["tokens_per_sec"], m["outruns_reading"]))
print("TOTAL p50 %.0f ms  p95 %.0f ms" % (m["total_p50"], m["total_p95"]))
print()
print("cost/request $%.5f   cost/RESOLVED $%.5f   monthly $%,.0f"
      .replace(",", "") % (m["cost_per_request"], m["cost_per_resolved"],
                           m["monthly_cost"]))`,
        out: `  [shape -- the worked budget's figures with a measured distribution]

  TTFT  p50 400 ms   p95 1180 ms   <- what the user feels (streaming)
  TPOT  p50 25.0 ms  p95 41.0 ms   = 40 tokens/s  (outruns reading: True)
  TOTAL p50 5400 ms  p95 9460 ms

  cost/request $0.00345   cost/RESOLVED $0.00421   monthly $6900`,
        notes: [
          { t: "p", text: "**`user_felt_metric` is the field that changes priorities.** With streaming it is TTFT, so a p95 of 1,180 ms is the number to attack \u2014 not the 9,460 ms total, which the user never experiences as a wait." },
          { t: "p", text: "**`outruns_reading` turns TPOT into a threshold check rather than a target.** At 40 tokens per second the text arrives faster than anyone reads, so further TPOT work is invisible. The p95 of 41 ms is 24 tokens/s, which is marginal \u2014 that tail is where streaming stops feeling smooth." },
          { t: "p", text: "**TTFT p95 at nearly 3\u00d7 the p50 is the finding.** A mean would have hidden it, and one request in twenty waiting over a second before anything appears is the experience people complain about." },
          { t: "p", text: "**Cost per resolved task is 22% above cost per request** at an 82% resolution rate, which is the same correction agents need \u2014 per-request pricing rewards a system that gives up cheaply." },
          { t: "p", text: "One measurement caution: compute the total p95 from end-to-end samples rather than by combining the TTFT and TPOT percentiles. Stages rarely hit their tails together, so composing percentiles is pessimistic \u2014 unless the latencies are correlated, as they are when both are driven by queueing, in which case it is optimistic." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "TTFT is what the user feels and TPOT is a threshold against reading speed, not a quantity to minimise \u2014 which is why they are reported separately rather than summed. The same 5,400 ms is a fast product with streaming and a spinner without it." },
        { t: "p", text: "Always p50 and p95, never the mean, because the tail is where the complaints are and one in twenty is not an edge case at volume. And percentiles do not add, so measure the pipeline end to end rather than summing component budgets." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cOur p50 latency is 5.4 seconds. How do we fix it?\u201d**" },
        { t: "p", text: "The first question is whether the product streams, because that decides which number matters and 5.4 seconds means two completely different things." },
        { t: "p", text: "If it streams, the user sees the first token at TTFT and reads along from there. With TTFT of 400 ms and TPOT of 25 ms per token, the text arrives at 40 tokens per second \u2014 comfortably above the roughly 25 tokens per second that reads naturally \u2014 so the generation outruns them and 5.4 seconds of total latency is never experienced as a wait. The thing to optimise is TTFT." },
        { t: "p", text: "If it does not stream, the user stares at a spinner for the full 5.4 seconds. Identical TTFT, identical TPOT, identical total, completely different product \u2014 and the first fix I would propose is enabling streaming, which costs nothing in compute and changes the experienced latency from 5,400 ms to 400 ms." },
        { t: "p", text: "The second thing I would ask for is p95 rather than p50, because LLM latency distributions have long tails from variable output length, queueing and cache misses. A p50 of one second with a p95 of twelve is a bad experience for one user in twenty, and at a thousand requests an hour that is fifty people an hour \u2014 disproportionately the ones who complain." },
        { t: "p", text: "Then I would find which stage dominates rather than guessing, because it usually is not the obvious one. In a retrieval pipeline I measured 11 milliseconds of vector search against 2,405 milliseconds for a cross-encoder on CPU \u2014 so tuning the index would have been optimising about one percent of the request." },
        { t: "p", text: "And I would check the cache hit rate first, since it is the only change that improves latency and cost simultaneously. For a semantic cache I would also want to know how the negative test set was built, because its threshold is a correctness decision rather than a performance one \u2014 a hit rate that looks great because the threshold is loose is serving wrong cached answers." }
      ] }
  ],

  takeaways: [
    "**TTFT is what the user feels** when the product streams; total latency is the right number only for a non-streaming API.",
    "**The worked budget verifies**: 400 ms TTFT plus 25 ms/token over 200 tokens gives 5,400 ms total.",
    "**The same 5,400 ms is two different products** \u2014 text arriving at 400 ms and read along, or a 5.4-second spinner.",
    "**TPOT is a threshold, not a quantity to minimise**: once generation outruns ~25 tokens/s reading speed, further gains are invisible.",
    "**So enabling streaming is often the cheapest latency fix there is**, changing experienced latency from 5,400 ms to 400 ms at no compute cost.",
    "**Always p50 and p95, never the mean**, because the tail is where the complaints are and one in twenty is not an edge case at volume.",
    "**Watch the p50-to-p95 gap**: a widening gap with a stable p50 means the tail is growing while the typical case is fine.",
    "**Percentiles do not add** \u2014 three stages at p95 of 1 s give a pipeline p95 well under 3 s, unless the latencies are correlated.",
    "**So measure end to end** rather than summing component budgets, which is pessimistic under independence and optimistic under queueing.",
    "**Find the dominant stage before optimising**: 6.2 measured 11 ms of retrieval against 2,405 ms for a cross-encoder.",
    "**Cache hit rate is the only change that improves latency and cost at once**, which is why it comes first in a scaling plan.",
    "**Multiply cost by volume before committing**, and use cost per *resolved* task \u2014 per-request pricing rewards a system that gives up quickly."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A system has TTFT 400 ms, TPOT 25 ms/token and 200 output tokens. Why are TTFT and TPOT reported separately rather than as the 5,400 ms total?",
        options: [
          "Because the total is only an approximation of real latency",
          "Because with streaming the user sees text at 400 ms and reads along, while without it they wait 5.4 seconds \u2014 identical metrics, completely different product",
          "Because TPOT varies more than TTFT across requests",
          "Because the total cannot be compared across providers"
        ],
        answer: 1,
        why: "The total is the right number for a non-streaming API and misleading for a streaming one, where what the user experiences is the wait before anything appears. At 25 ms per token the text arrives at 40 tokens per second, above the roughly 25 tokens per second that reads comfortably, so generation outruns the reader and the total is never felt as a wait. That makes enabling streaming one of the cheapest latency improvements available." },

      { stem: "Why is TPOT described as a threshold rather than a quantity to minimise?",
        options: [
          "Because it is bounded below by the model's architecture",
          "Because once generation outruns reading speed, further improvements are invisible to the user \u2014 40 against 50 tokens per second are both faster than anyone reads",
          "Because TPOT is dominated by TTFT in the total",
          "Because it only applies to non-streaming requests"
        ],
        answer: 1,
        why: "Below roughly 25 tokens per second the text lags the reader and TPOT is felt; above it the generation is already ahead and shaving milliseconds changes nothing experienced. That reorders the usual instinct to maximise throughput, and it Covers the finding that tuning a vector index optimises about 1% of a RAG request while the re-ranker decision optimises the rest \u2014 the number people reach for is often not the one users feel." },

      { stem: "Three pipeline stages each have a p95 latency of 1 second. What is the pipeline's p95?",
        options: [
          "3 seconds, since latencies add",
          "Well under 3 seconds, because the stages rarely hit their tails simultaneously \u2014 unless their latencies are correlated, in which case it can be worse",
          "1 second, since the slowest stage dominates",
          "Undefined without the full distributions"
        ],
        answer: 1,
        why: "Percentiles do not compose additively: reaching 3 seconds requires all three stages to be in their tails at once, which is rare under independence. Adding component p95s therefore gives a pessimistic figure that leads to over-provisioning, while assuming independence can be optimistic when a shared cause such as queueing correlates the stages. The practical response is to measure the pipeline end to end rather than summing budgets." },

      { stem: "Why does a semantic cache hit rate need its negative test set described?",
        options: [
          "Because hit rate depends on the embedding model used",
          "Because the similarity threshold is a correctness decision rather than a performance one \u2014 a loose threshold produces a high hit rate by serving wrong cached answers",
          "Because prompt caches and semantic caches are measured differently",
          "Because hit rate is not comparable across traffic distributions"
        ],
        answer: 1,
        why: "A semantic cache returns a previous answer for a merely similar query, so loosening the threshold raises the hit rate while increasing the chance of answering the wrong question \u2014 which is worse than a miss. Measured elsewhere, the score distributions of answerable and unanswerable queries overlap substantially, so no threshold cleanly separates them. That makes the negative set the thing that licenses the reported hit rate. Prompt caching is exempt since its output is identical." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "The metrics that decide whether quality can ship",
    questions: [
      { level: "core",
        q: "Walk me through a latency budget.",
        strong: "A strong answer separates TTFT from TPOT and asks about streaming.",
        answer: [
          { t: "p", text: "Four numbers. Time to first token, time per output token, the number of output tokens, and the total \u2014 which is TTFT plus TPOT times tokens. With TTFT of 400 ms, TPOT of 25 ms and 200 tokens, that is 400 plus 5,000, so 5,400 ms." },
          { t: "p", text: "But I would not report the total without asking whether the product streams, because that decides what the number means. Streaming, the user sees the first token at 400 ms and the text then arrives at 40 tokens per second \u2014 above the roughly 25 per second that reads comfortably, so it outruns them and the 5.4 seconds is never experienced as a wait." },
          { t: "p", text: "Not streaming, they stare at a spinner for the full 5.4 seconds. Same three inputs, same total, completely different product \u2014 which is why TTFT and TPOT are reported separately rather than collapsed." },
          { t: "p", text: "It also means TPOT is a threshold rather than a target. Once generation outruns reading speed, going from 25 ms to 20 ms per token is invisible, so the optimisation effort belongs on TTFT." }
        ] },

      { level: "core",
        q: "Why p95 rather than the mean?",
        strong: "A strong answer quantifies who the tail affects.",
        answer: [
          { t: "p", text: "Because LLM latency distributions have long tails \u2014 variable output length, queueing, cache misses, retries \u2014 and the mean hides them. A mean of two seconds is consistent with almost everyone getting one second and one in twenty getting twelve." },
          { t: "p", text: "One in twenty is not an edge case at volume. At a thousand requests an hour that is fifty people an hour having a bad experience, and they are disproportionately the ones who complain and churn." },
          { t: "p", text: "So I would report p50 and p95 as a pair and watch the gap between them. A widening gap with a stable p50 means the tail is growing while the typical case is fine, which is a pattern no single summary statistic shows." },
          { t: "p", text: "One technical caution: I would measure the pipeline end to end rather than adding component p95s. Percentiles do not compose \u2014 three stages each at a p95 of one second give a pipeline p95 well under three, because they rarely hit their tails together, unless something like queueing correlates them." }
        ] },

      { level: "core",
        q: "Where would you look first to reduce cost?",
        strong: "A strong answer starts with caching and multiplies by volume.",
        answer: [
          { t: "p", text: "Cache hit rate, because it is the only change that improves latency and cost simultaneously \u2014 a hit costs nothing and returns immediately. The cheapest request is one that never runs." },
          { t: "p", text: "Prompt caching is uncontroversial since the output is identical. Semantic caching needs care, because its similarity threshold is a correctness decision rather than a performance one \u2014 I have measured the score distributions of answerable and unanswerable queries overlapping substantially, so a loose threshold buys a high hit rate by serving wrong cached answers." },
          { t: "p", text: "Then I would multiply cost per request by expected volume before touching the design, because per-unit figures are systematically reassuring. A fraction of a cent per request is easy to wave through and becomes a real number at two million requests a month." },
          { t: "p", text: "And for anything that can fail, cost per *resolved* task rather than per request \u2014 because per-request pricing rewards a system that gives up quickly. On one agent run that gap was 22%, which is precisely the attempts that were paid for and resolved nothing." }
        ] }
    ]
  }
});
