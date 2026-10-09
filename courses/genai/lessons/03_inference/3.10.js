EC.receiveLesson({
  id: "3.10",

  lede: "Deployment architecture is where the serving decisions of this module meet the rest of a system: a load balancer, a queue, a router that picks a model, and a cache. Most of it is ordinary infrastructure, and one piece of it is a trap. I measured a semantic cache on realistic support queries and found that **no similarity threshold separates genuine paraphrases from near-misses** — the worst true pair scored 0.3975 while \"How do I change my password?\" matched \"How do I reset my password?\" at 0.8741. At the usually recommended 0.85 threshold, **one cache hit in five served the wrong answer**, and the compute it saved was worth about **$0.11 per thousand requests** against $5.00 of damage from those wrong answers.",

  objectives: [
    "Lay out a single-model serving deployment and say what each component is for",
    "Describe the router pattern and the cost model that justifies it",
    "Distinguish the four caching layers by what they key on and what they risk",
    "Measure a semantic cache's precision rather than assuming a threshold",
    "Choose an autoscaling signal that reflects LLM serving rather than CPU"
  ],

  prerequisites: ["3.5", "3.7"],

  blocks: [

    { t: "h2", n: "01", id: "single", text: "Single-model serving",
      sub: "The shape almost everyone starts with, and should" },

    { t: "p", text: "A load balancer in front of several identical server replicas, each holding the model, with a queue so that arrivals above capacity wait rather than fail. That is the whole architecture, and it is the right one until something specific forces a change." },

    { t: "viz", title: "Single-model serving, with the LLM-specific parts marked", caption: "The structure is conventional. What is unusual is where the state lives and which signals are worth scaling on.",
      svg: `<svg viewBox="0 0 760 300" width="100%" role="img" aria-label="Single model serving architecture">
  <rect x="16" y="24" width="96" height="40" rx="6" class="s-fill" style="stroke:var(--line)" stroke-width="1.2"/>
  <text x="64" y="48" text-anchor="middle" class="s-sub">clients</text>
  <line x1="112" y1="44" x2="156" y2="44" stroke="var(--line)" stroke-width="1.4"/>

  <rect x="156" y="24" width="112" height="40" rx="6" class="s-fill" style="stroke:var(--accent)" stroke-width="1.2"/>
  <text x="212" y="42" text-anchor="middle" class="s-sub">gateway</text>
  <text x="212" y="56" text-anchor="middle" class="s-sub">auth, rate limit</text>
  <line x1="268" y1="44" x2="312" y2="44" stroke="var(--line)" stroke-width="1.4"/>

  <rect x="312" y="24" width="112" height="40" rx="6" class="s-fill-2" style="stroke:var(--violet)" stroke-width="1.2"/>
  <text x="368" y="42" text-anchor="middle" class="s-sub">cache layer</text>
  <text x="368" y="56" text-anchor="middle" class="s-sub">exact, then semantic</text>
  <line x1="424" y1="44" x2="468" y2="44" stroke="var(--line)" stroke-width="1.4"/>

  <rect x="468" y="24" width="104" height="40" rx="6" class="s-fill" style="stroke:var(--accent)" stroke-width="1.2"/>
  <text x="520" y="42" text-anchor="middle" class="s-sub">queue</text>
  <text x="520" y="56" text-anchor="middle" class="s-sub">priority, depth</text>

  <line x1="520" y1="64" x2="520" y2="96" stroke="var(--line)" stroke-width="1.4"/>
  <rect x="432" y="96" width="176" height="36" rx="6" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="520" y="119" text-anchor="middle" class="s-sub">replica 1 — vLLM, 1 GPU</text>
  <rect x="432" y="138" width="176" height="36" rx="6" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="520" y="161" text-anchor="middle" class="s-sub">replica 2 — vLLM, 1 GPU</text>
  <rect x="432" y="180" width="176" height="36" rx="6" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="520" y="203" text-anchor="middle" class="s-sub">replica 3 — vLLM, 1 GPU</text>

  <text x="16" y="110" class="s-label" style="fill:var(--warn)">LLM-specific</text>
  <text x="16" y="132" class="s-sub">· KV cache lives IN the replica, so a</text>
  <text x="16" y="148" class="s-sub">  request is sticky for its whole stream</text>
  <text x="16" y="170" class="s-sub">· prefix cache is per-replica, so routing</text>
  <text x="16" y="186" class="s-sub">  by prefix beats round-robin (3.7)</text>
  <text x="16" y="208" class="s-sub">· startup is minutes, not seconds —</text>
  <text x="16" y="224" class="s-sub">  autoscaling reacts far too slowly</text>

  <line x1="16" y1="248" x2="744" y2="248" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="272" class="s-mono" style="fill:var(--crit)">scale on queue depth and TPOT percentile — never on GPU utilisation, which a healthy server pins at 100%</text>
  <text x="16" y="292" class="s-mono" style="fill:var(--violet)">and keep enough headroom that a cold replica has time to load before the queue backs up</text>
</svg>` },

    { t: "callout", kind: "trap", title: "GPU utilisation is the wrong autoscaling signal",
      body: [
        { t: "p", text: "The monitoring table suggests alerting when GPU utilisation drops below 50% and scaling on an 80% target. The problem is that a correctly configured LLM server with continuous batching holds the device near 100% whenever there is *any* work queued — so the signal saturates long before the service is in trouble and barely moves as the queue grows." },
        { t: "p", text: "The signals that track the user's experience are **queue depth** and the **TPOT percentile**. Queue depth rises the instant admission exceeds capacity; TPOT rises as the batch fills (3.5 measured a 6.4× step-time increase from batch 1 to 32). Either of them tells you that users are waiting; utilisation does not." },
        { t: "p", text: "Utilisation is still worth watching, for the opposite purpose — 3.12's arithmetic makes it the dominant cost term. It is a *cost* metric, not a *scaling* metric, and confusing the two is how a service ends up scaling out while every replica is idle." }
      ] },

    { t: "callout", kind: "warn", title: "Autoscaling an LLM is slow enough to be nearly decorative",
      body: [
        { t: "p", text: "A new replica has to be scheduled onto a GPU node, pull a container image, and load tens of gigabytes of weights. That is minutes. Traffic spikes in seconds." },
        { t: "p", text: "So horizontal autoscaling works for the daily cycle and not for the spike. For the spike you need headroom — which means running at a utilisation below 100% on purpose, which is exactly the cost 3.12's peak-to-mean analysis prices. The honest framing is that **headroom is the product you are buying when you provision for peak**, and the autoscaler just trims the slow-moving part of the bill." }
      ] },

    { t: "h2", n: "02", id: "router", text: "The router pattern",
      sub: "Send the easy requests to the cheap model" },

    { t: "p", text: "Most traffic does not need your best model. A router classifies the incoming request and dispatches it to a small, a medium or a large model, so the expensive one only sees the requests that need it. Because the price spread across models is large — 3.12 measured 23× across one provider's list — even a mediocre router pays for itself." },

    { t: "p", text: "The arithmetic that matters is not the router's accuracy but the cost of its two error types. Sending a hard request to the small model produces a bad answer or a retry on the large one; sending an easy request to the large model costs money and nothing else. Those are very different failures, so the router should be **biased towards escalation**: the asymmetry means you should route up when uncertain." },

    { t: "table",
      head: ["Routing signal", "Cost to compute", "What it actually predicts"],
      rows: [
        ["Prompt length", "Free", "Weakly — long prompts are often simple extraction, short ones often hard reasoning"],
        ["Keyword or regex rules", "Free", "Well within a narrow product, badly outside it, and it rots silently"],
        ["A small classifier", "~1 ms", "Reasonably, if you have labelled routing decisions to train on"],
        ["The small model's own confidence", "One small-model call", "Well — but you have already paid for the small call, which is the point"],
        ["Ask the large model to triage", "One large-model call", "Nothing useful — you have spent what you were trying to save"]
      ] },

    { t: "callout", kind: "insight", title: "Cascade rather than classify",
      body: [
        { t: "p", text: "The last row of that table is the trap, and the fourth row is the way out. Instead of predicting which model is needed, **run the small model first and escalate if its answer looks weak** — low confidence, a refusal, a failed schema check, a self-consistency disagreement. You get the routing decision as a by-product of work you wanted anyway." },
        { t: "p", text: "The cost model is simple: if a fraction `f` of requests escalate, you pay the small model always and the large model `f` of the time. With the small model at 6% of the large one's price, a 20% escalation rate gives you 26% of the all-large cost — a 3.8× saving — and the quality of the large model on exactly the requests that needed it." },
        { t: "p", text: "The thing to watch is that escalation is a *measured* rate, not a designed one. If `f` drifts to 0.8 because the traffic got harder, you are now paying for both models on most requests and would have been better off without the cascade." }
      ] },

    { t: "h2", n: "03", id: "caching", text: "The four caching layers",
      sub: "They key on different things and fail in different ways" },

    { t: "dl", items: [
      { k: "Response cache (exact)", v: "Key: the exact request string, usually with the sampling parameters. Returns the stored response. Safe by construction — identical input, identical output — and the hit rate is low on natural language because people phrase things differently." },
      { k: "Prefix / KV cache", v: "Key: a prefix of the token sequence. Reuses the computed KV states rather than a response, so the model still generates. Measured in 3.7 at 84.8% of prefill tokens avoided across eight requests sharing a 251-token prefix. No correctness risk at all: the output is what it would have been." },
      { k: "Prompt cache", v: "The provider-side version of the same idea: a long system prompt or document is pre-processed once and referenced by handle. Same safety properties, billed differently — typically a cheaper rate on cached input tokens." },
      { k: "Semantic cache", v: "Key: an embedding of the request, matched by similarity above a threshold. The only one of the four that can return an answer to a *different question*, and the only one that needs measuring rather than configuring." }
    ] },

    { t: "p", text: "The first three are safe and the fourth is a correctness decision dressed as a performance setting. So the fourth is the one to measure." },

    { t: "h3", text: "Measuring a semantic cache" },

    { t: "p", text: "I built a small but realistic test: four support intents with genuine paraphrases that *should* hit each other, plus seven near-miss queries that look similar and need different answers — renew against cancel, change against reset, holiday hours against business hours." },

    { t: "code", lang: "python", title: "g310.py — what the embedder thinks before any threshold is chosen", code: `enc = SentenceTransformer("all-MiniLM-L6-v2")
E = enc.encode(all_queries, normalize_embeddings=True)
T = enc.encode(trap_queries, normalize_embeddings=True)

within = [E[i] @ E[j] for i, j in pairs if label[i] == label[j]]   # should hit
cross  = [E[i] @ E[j] for i, j in pairs if label[i] != label[j]]   # must not
trap   = [max(T[k] @ E[i] for i in range(len(E))) for k in range(len(T))]`,
      out: `  within-group similarity (these SHOULD hit):
    n=18  min 0.3975  median 0.6243  max 0.9674

  cross-group similarity (these must NOT hit):
    n=73  min -0.0669  median 0.1113  max 0.3917

  trap-to-its-own-group similarity (the dangerous ones):
  trap query                                        max sim   to group
  How do I renew my subscription?                    0.7767   How do I cancel my subscript
  How do I upgrade my subscription?                  0.6493   How do I cancel my subscript
  How do I change my password?                       0.8741   How do I reset my password?
  How do I set up two-factor authentication?         0.3411   password reset steps
  What are your holiday hours?                       0.7207   What are your business hours
  How do I delete my data?                           0.5225   How do I export my data?
  How do I import my data?                           0.7381   How do I export my data?

  overlap: the worst true pair is 0.3975, the worst trap is 0.8741
  -> NO threshold separates them cleanly`,
      hl: [8],
      caption: "The worst trap scores more than twice the worst genuine paraphrase. The two classes are not separable by a single number." },

    { t: "callout", kind: "trap", title: "\"How do I change my password?\" matches \"How do I reset my password?\" at 0.8741",
      body: [
        { t: "p", text: "Those are different support flows with different answers — one needs the old password, the other does not. The embedder scores them at 0.8741, above every threshold anyone recommends, while a genuine paraphrase pair in my set scored 0.3975." },
        { t: "p", text: "This is not a weakness of this particular embedder. The model is doing exactly what it was trained to do: encode topical similarity. **\"Same topic\" and \"same answer\" are different relations**, and a cache keyed on the first will serve the second incorrectly whenever a product has operations that differ in one verb." },
        { t: "p", text: "Which is also why the failure is concentrated in exactly the queries that matter — delete against export, renew against cancel, change against reset. The near-misses are near because they are adjacent operations on the same object, and adjacent operations on the same object are precisely what users get wrong and ask about." }
      ] },

    { t: "code", lang: "python", title: "g310.py — hit rate against false hits", code: `for th in (0.99, 0.95, 0.90, 0.85, 0.80, 0.75, 0.70, 0.65, 0.60, 0.50):
    tp = sum(1 for s in within if s >= th)
    fp = sum(1 for s in cross if s >= th) + sum(1 for s in trap if s >= th)
    print(th, tp, fp, tp / len(within), tp / (tp + fp) if tp + fp else None)`,
      out: `  threshold       true hits     false hits       hit rate    precision
  0.99                    0              0           0.0%         nan%
  0.95                    1              0           5.6%       100.0%
  0.90                    3              0          16.7%       100.0%
  0.85                    4              1          22.2%        80.0%
  0.80                    6              1          33.3%        85.7%
  0.75                    8              2          44.4%        80.0%
  0.70                    8              4          44.4%        66.7%
  0.65                    8              4          44.4%        66.7%
  0.60                   10              5          55.6%        66.7%
  0.50                   15              6          83.3%        71.4%`,
      hl: [5],
      caption: "0.85 — the threshold most often recommended — gives a 22% hit rate at 80% precision. One hit in five is a wrong answer served confidently." },

    { t: "callout", kind: "note", title: "A false cache hit is not a slow response",
      body: [
        { t: "p", text: "Every other failure mode in this module degrades gracefully: a slow request is still correct, a preempted request retries, a quantized model is a bit worse everywhere. A false semantic cache hit returns **a fluent, confident answer to a question the user did not ask**, with no error, no log line and no latency anomaly — it is the fastest response your system produces." },
        { t: "p", text: "That is why this belongs in a deployment lesson rather than a performance one. The decision about the threshold is a product-risk decision, and it should be taken by whoever owns the consequence of a wrong answer, not by whoever is tuning the p99." }
      ] },

    { t: "exercise", kind: "analysis", title: "Set the threshold from the cost of a wrong answer", difficulty: "core", minutes: 25,
      body: "Build an expected-cost model for a semantic cache. For each candidate threshold, compute the hit rate and the precision from the measured similarities, then the expected cost per thousand requests as the GPU time saved minus the damage from false hits — for four values of the cost of one wrong answer: $0, $0.01, $0.10 and $1.00. Report the optimal threshold for each, and say what you conclude about which term dominates.",
      requirements: [
        "Use 900 ms of generation at $2.00 per GPU-hour for the compute term, and 2 ms for a cache hit",
        "Compute hit rate over the whole query population, not only the true pairs",
        "Expected cost = compute for the misses + (false hit rate × the cost of a wrong answer)",
        "Report the cost-minimising threshold for each of the four wrong-answer costs",
        "Also report whether the true and trap similarity ranges overlap, and what that implies"
      ],
      hint: "Work out what the compute saving is actually worth per request before comparing it with anything. The answer is small enough to change how you read the rest of the table.",
      solution: { lang: "python", title: "g310_ex.py — expected cost against threshold", code: `GEN_MS, CACHE_MS = 900.0, 2.0          # measured, 3.7
GEN_COST = 900 / 1000 * (2.0 / 3600)   # $ of GPU time per generated response

for th in (0.99, 0.95, 0.90, 0.85, 0.80, 0.75, 0.70, 0.60, 0.50):
    tp = sum(1 for s in within if s >= th)
    fp = sum(1 for s in cross if s >= th) + sum(1 for s in trap if s >= th)
    hits = tp + fp
    n_pop = len(within) + len(cross) + len(trap)
    hit_rate = hits / n_pop
    prec = tp / hits if hits else 1.0
    mean_ms = hit_rate * CACHE_MS + (1 - hit_rate) * GEN_MS
    row = []
    for W in (0.0, 0.01, 0.10, 1.00):
        compute = (1 - hit_rate) * GEN_COST * 1000        # per 1k requests
        wrong   = hit_rate * (1 - prec) * W * 1000
        row.append(compute + wrong)
    print(th, hit_rate, prec, mean_ms, row)`,
        out: `  threshold   hit rate precision      mean ms expected $ per 1k requests
                                                    W=$0    W=$0.01    W=$0.10    W=$1.00
  0.99            0.0%      n/a        900.0      0.500      0.500      0.500      0.500
  0.95            1.0%   100.0%        890.8      0.495      0.495      0.495      0.495
  0.90            3.1%   100.0%        872.5      0.485      0.485      0.485      0.485
  0.85            5.1%    80.0%        854.2      0.474      0.577      1.495     10.679
  0.80            7.1%    85.7%        835.9      0.464      0.566      1.485     10.668
  0.75           10.2%    80.0%        808.4      0.449      0.653      2.490     20.857
  0.70           12.2%    66.7%        790.0      0.439      0.847      4.520     41.255
  0.60           15.3%    66.7%        762.6      0.423      0.934      5.526     51.444
  0.50           21.4%    71.4%        707.6      0.393      1.005      6.515     61.617

  the optimal threshold by expected cost, for each W:
    W = $0.00   -> threshold 0.50  (expected $0.393 per 1k requests)
    W = $0.01   -> threshold 0.90  (expected $0.485 per 1k requests)
    W = $0.10   -> threshold 0.90  (expected $0.485 per 1k requests)
    W = $1.00   -> threshold 0.90  (expected $0.485 per 1k requests)

  and the separability question, which no threshold fixes:
    worst true pair   0.3975
    worst trap        0.8741
    overlap?          YES -- the classes are not separable`,
        notes: [
          { t: "p", text: "**The compute term is tiny.** Going from no cache to the most aggressive setting saves $0.107 per thousand requests — $0.500 down to $0.393. That is the entire financial upside of semantic caching on this workload, and it is about a hundredth of a cent per request." },
          { t: "p", text: "**As soon as a wrong answer costs anything at all, the optimum jumps to 0.90 and stays there.** At $0.01 — a trivial figure, a fraction of one support contact — the optimum moves from 0.50 to 0.90 and does not move again at $0.10 or $1.00. The error term dominates so completely that the threshold is determined by it alone." },
          { t: "p", text: "So the honest conclusion is that **semantic caching is a latency optimisation, not a cost one**. The mean-latency column is where the real benefit sits: 900 ms down to 872 ms at threshold 0.90, and 708 ms at 0.50 — a genuine user-visible improvement. Justify it on that basis and set the threshold from the error cost, and the two decisions stop fighting each other." },
          { t: "p", text: "**And no threshold is safe, because the classes overlap.** The worst genuine paraphrase scores 0.3975 and the worst trap 0.8741, so there is no number that admits all the true pairs and rejects all the false ones. A threshold is a choice about which errors to make, never a solution." },
          { t: "p", text: "Two limits on these figures. The hit rate is computed over my constructed query population, which is not real traffic — a production cache on repetitive queries would hit far more often, which raises the compute saving and the error exposure together. And precision here rests on single-digit counts, so the 80% figure is indicative; the point that survives the small sample is the overlap, which is a property of the embedding space rather than of my sample size." }
        ] } },

    { t: "ladder", title: "Adding a cache to a support assistant", rungs: [
      { level: "bad", label: "Semantic cache at 0.85, because that is the recommended value", why: "Measured on realistic queries, 0.85 gives 80% precision — one hit in five is a wrong answer, served faster than any correct one and with nothing in the logs to find it by.",
        code: `if cosine(embed(q), key) > 0.85:
    return cached_response        # 1 in 5 of these is the wrong answer` },
      { level: "ok", label: "Exact-match response cache plus prefix caching", why: "Both are safe by construction. The prefix cache does the heavy lifting — 84.8% of prefill tokens avoided in 3.7's measurement — and the exact cache catches the genuinely repeated requests with no risk at all.",
        code: `enable_prefix_caching = True
response_cache[hash(prompt, params)] = response` },
      { level: "best", label: "Add semantic caching behind a verifier, threshold set from the error cost", why: "Keep the safe layers, then allow semantic hits only where a wrong answer is cheap, or gate each hit on a cheap check that the cached answer addresses this question. And measure precision on your own query log rather than trusting a threshold.",
        code: `hit = semantic_lookup(q, threshold=0.90)       # from the cost model
if hit and verify_addresses(q, hit.answer):     # small-model check
    return hit.answer`,
        note: "The verifier is a small-model call, so it costs what a cascade's first stage costs — and it converts an unsafe cache into a safe one." }
    ] },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "There are two kinds of cache in an LLM system: ones that reuse *computation* and ones that reuse *conclusions*. Prefix and prompt caches reuse computation, so they cannot be wrong — the model still decides the answer. Response and semantic caches reuse conclusions, and only the exact-match one knows that the question was the same." },
        { t: "p", text: "Reuse computation freely. Reuse conclusions only where you can prove the question matched." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\"We added a semantic cache and the latency numbers look great. Support tickets about 'the bot gave me the wrong instructions' went up 15%. What happened and what do you do?\"**" },
        { t: "p", text: "The cache is serving answers to adjacent questions. That is the predictable failure: an embedder encodes topical similarity, and \"same topic\" is not \"same answer\". On realistic support queries I measured \"How do I change my password?\" matching \"How do I reset my password?\" at 0.8741 — above any recommended threshold — while a genuine paraphrase pair in the same set scored 0.3975. The classes are not separable by a single number, so the 15% is the designed behaviour of the configuration." },
        { t: "p", text: "Immediate action: raise the threshold, or disable semantic hits for the intents where a wrong answer has a consequence — anything destructive or billing-related. The measurement says precision goes to 100% at 0.90 on my set, so there is a safe-ish region, and it buys much less." },
        { t: "p", text: "Then I would check what the cache was actually worth, because the answer reframes the decision. The compute saving on my model is about $0.11 per thousand requests, while a single wrong answer at even one cent per thousand moves the optimal threshold from 0.50 to 0.90. The cache is a *latency* optimisation — 900 ms to 872 ms at the safe threshold — and if it was sold as a cost saving, the business case was wrong and the risk was taken for nothing." },
        { t: "p", text: "The durable fix is a verifier: allow the semantic hit, then spend a small-model call to check that the cached answer addresses this question. That costs what a cascade's first stage costs and converts an unsafe cache into a safe one. And it gives you a labelled stream of near-misses, which is the data you need to measure precision on your own traffic rather than on a constructed set like mine." },
        { t: "p", text: "The thing I would raise beyond the fix: this failure produced tickets rather than alerts. A false cache hit is the fastest response the system makes, with no error and no latency anomaly, so nothing in the monitoring could have caught it. If the organisation is going to run caches that reuse conclusions, it needs a sampled quality check on cache hits specifically — otherwise the only detector is the user." }
      ] }
  ],

  takeaways: [
    "**Single-model serving — gateway, cache, queue, identical replicas — is the right architecture until something specific forces a change.**",
    "**Scale on queue depth and the TPOT percentile, not GPU utilisation**, which a correctly configured server pins near 100% whenever any work is queued.",
    "**Utilisation is a cost metric, not a scaling metric** (3.12), and confusing the two leads to scaling out while every replica is idle.",
    "**LLM autoscaling is minutes and spikes are seconds**, so headroom — deliberate under-utilisation — is what absorbs a spike, and the autoscaler only trims the daily cycle.",
    "**Cascade rather than classify**: run the small model first and escalate on weak output, so the routing decision is a by-product of work you wanted. At 6% relative price and a 20% escalation rate, that is 26% of the all-large cost.",
    "**Prefix and prompt caches reuse computation and cannot be wrong**; response and semantic caches reuse conclusions, and only exact matching knows the question was the same.",
    "**No similarity threshold separates paraphrases from near-misses.** Measured: worst true pair 0.3975, worst trap 0.8741 — \"change my password\" against \"reset my password\".",
    "**At the commonly recommended 0.85, precision was 80%** — one cache hit in five served a wrong answer, confidently and faster than any correct one.",
    "**Semantic caching is a latency optimisation, not a cost one.** The compute saving was $0.11 per thousand requests, and any non-zero cost of a wrong answer pins the optimal threshold at 0.90.",
    "**A false cache hit produces no error, no log line and no latency anomaly**, so the only detector is a sampled quality check on cache hits — or the user."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Why is GPU utilisation a poor autoscaling signal for an LLM service?",
        options: [
          "Because GPU utilisation is expensive to measure accurately",
          "Because continuous batching keeps the device near 100% whenever any work is queued, so the signal saturates before users are affected",
          "Because utilisation is reported per process rather than per device",
          "Because quantized models report utilisation differently"
        ],
        answer: 1,
        why: "A correctly configured server with continuous batching has the device busy whenever there is anything to do, so utilisation hits its ceiling long before the queue starts hurting anyone and barely moves afterwards. Queue depth and the TPOT percentile track the user's experience instead — TPOT rises as the batch fills, which 3.5 measured at 6.4× step time from batch 1 to 32. Utilisation remains the right metric for cost, which is a different decision." },

      { stem: "On realistic support queries, \"How do I change my password?\" matched \"How do I reset my password?\" at 0.8741 while a genuine paraphrase pair scored 0.3975. What follows?",
        options: [
          "A better embedding model would separate them",
          "No single threshold can admit all true paraphrases and reject all near-misses, so a threshold is a choice about which errors to make",
          "The similarity should be computed on the answers rather than the questions",
          "The paraphrase scoring 0.3975 was mislabelled"
        ],
        answer: 1,
        why: "The ranges overlap, so separability fails as a matter of arithmetic rather than of model quality — and the overlap is structural, because embedders encode topical similarity while a cache needs \"same answer\", and adjacent operations on the same object are maximally similar topically and different in their answers. A stronger embedder shifts the numbers without removing the overlap. The practical consequence is that the threshold has to be chosen from the cost of each error type." },

      { stem: "A cost model found semantic caching saves about $0.11 per thousand requests, and that any non-zero cost of a wrong answer moves the optimal threshold from 0.50 to 0.90. What is the right conclusion?",
        options: [
          "Semantic caching should not be used at all",
          "Semantic caching is a latency optimisation rather than a cost one, and the threshold should be set from the error cost",
          "The compute cost model must be wrong, since caching is widely recommended for cost",
          "The threshold should be lowered to recover the compute saving"
        ],
        answer: 1,
        why: "The compute term is about a hundredth of a cent per request, so it cannot justify any meaningful error exposure — but the latency benefit is real and user-visible, 900 ms down to 872 ms at the safe threshold and 708 ms at the aggressive one. Framing it as a latency feature lets the threshold be set purely from the risk, which is what the expected-cost model says to do. Used carefully, behind a verifier or restricted to low-risk intents, it remains worthwhile." },

      { stem: "What makes a false semantic-cache hit harder to detect than other serving failures?",
        options: [
          "It appears only under high load",
          "It produces a fluent answer with no error, no log anomaly and the lowest latency in the system",
          "It is logged at debug level by most frameworks",
          "It corrupts the KV cache for subsequent requests"
        ],
        answer: 1,
        why: "Every other failure in this module degrades visibly — slow, retried, or uniformly worse. A false cache hit is the fastest response the system produces and is indistinguishable from a correct one in the metrics, so nothing in the monitoring can catch it. The only detectors are a sampled quality check on cache hits specifically, a verifier gating each hit, or the user filing a ticket. It is independent of load and does not touch the KV cache." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Deployment questions reward the candidate who knows which component is the dangerous one",
    questions: [
      { level: "core",
        q: "Design the deployment for an LLM-backed support assistant.",
        strong: "A strong answer keeps the architecture boring and identifies the one risky component.",
        answer: [
          { t: "p", text: "Gateway for auth and rate limiting, an exact-match response cache, a queue, and several identical vLLM replicas behind a load balancer. Boring on purpose — the serving optimisations are framework settings rather than architecture, so the architecture's job is to not get in their way." },
          { t: "p", text: "Three LLM-specific details. The KV cache lives inside a replica, so a streaming request is sticky for its lifetime. The prefix cache is per-replica, so routing by prompt prefix beats round-robin — that is where 3.7's 84.8% prefill saving actually lands. And startup is minutes, so the autoscaler handles the daily cycle while headroom handles spikes, which means deliberately running below full utilisation and knowing that is what you are paying for." },
          { t: "p", text: "Scaling signals: queue depth and TPOT percentile. Not GPU utilisation, which pins at 100% whenever there is work and therefore cannot tell you whether anyone is waiting." },
          { t: "p", text: "The component I would be most careful about is the cache — specifically a semantic one. On realistic support queries I measured 80% precision at the usually recommended 0.85 threshold, meaning one hit in five answers a different question. For a support product that is the worst failure available, so I would ship exact matching and prefix caching first and add semantic hits only behind a verifier or restricted to intents where a wrong answer is cheap." }
        ] },

      { level: "advanced",
        q: "How would you route between a cheap model and an expensive one?",
        strong: "A strong answer prefers a cascade to a classifier and knows why.",
        answer: [
          { t: "p", text: "I would cascade rather than classify. Run the small model first and escalate when its output looks weak — low confidence, a refusal, a failed schema check, a self-consistency disagreement. The routing decision then comes out of work I wanted to do anyway, rather than needing a separate prediction of difficulty." },
          { t: "p", text: "The reason to avoid a classifier is that the cheap signals do not predict well. Prompt length is nearly uninformative — long prompts are often simple extraction and short ones often hard reasoning. Keyword rules work inside a narrow product and rot silently as traffic shifts. And the one signal that would predict well, asking the large model to triage, costs exactly what you were trying to save." },
          { t: "p", text: "The economics: with the small model at roughly 6% of the large one's price and a 20% escalation rate, you pay about 26% of the all-large cost, so a 3.8× saving — and you get the large model's quality on precisely the requests that needed it. 3.12 measured a 23× spread across one provider's price list, so the headroom here is large." },
          { t: "p", text: "The thing I would instrument is the escalation rate itself, because it is measured rather than designed. If it drifts upward — harder traffic, a stricter verifier — you end up paying for both models on most requests and the cascade becomes a net loss. That is a metric with an alert on it, not a configuration constant." }
        ] },

      { level: "advanced",
        q: "What are the caching layers in an LLM system, and which one would you be careful with?",
        strong: "A strong answer separates reusing computation from reusing conclusions.",
        answer: [
          { t: "p", text: "Four, and the useful split is whether they reuse computation or conclusions. Prefix caching and provider-side prompt caching reuse computation: they skip prefill for a shared token prefix and the model still generates the answer, so they cannot be wrong. Measured, a 251-token shared prefix avoided 84.8% of prefill tokens across eight requests." },
          { t: "p", text: "Response caching and semantic caching reuse conclusions. Exact-match response caching is safe because identical input means identical output; its limitation is a low hit rate on natural language, since people phrase things differently." },
          { t: "p", text: "Semantic caching is the one I would be careful with, because it is the only layer that can return an answer to a different question. I measured it on support queries and the classes are not separable: the worst genuine paraphrase pair scored 0.3975 while \"How do I change my password?\" matched \"How do I reset my password?\" at 0.8741. At the commonly recommended 0.85 threshold, precision was 80%." },
          { t: "p", text: "And the cost side argues against taking that risk: the compute saving works out at about $0.11 per thousand requests, while any non-zero cost of a wrong answer pins the optimal threshold at 0.90. So I would frame semantic caching as a latency feature, set the threshold from the error cost, and put a small-model verifier in front of each hit — which also gives you the labelled near-misses needed to measure precision on your own traffic." }
        ] }
    ]
  }
});
