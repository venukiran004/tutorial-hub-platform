EC.receiveLesson({
  id: "3.12",

  lede: "Every cost conversation about LLM serving reduces to one number you do not control and one you do: the price of a GPU-hour, and how busy you keep it. I worked the self-hosting figures and found them **1.30× the naive arithmetic** — consistent with an unstated ~77% utilisation assumption, which is the single most important variable in the calculation and the one it does not mention. Taking it seriously changes the conclusion: with a realistic 3:1 peak-to-mean traffic ratio, self-hosting a 70B asymptotes at **$1.13 per million tokens** and never beats a hosted small model's $0.26 at any volume. The \"self-host above 10M tokens a day\" threshold is **7.7% utilisation of one GPU**, where self-hosting costs $4.80 per million and beats nothing.",

  objectives: [
    "Compute the cost per million tokens of your own hardware from first principles",
    "Explain why utilisation dominates every other cost lever",
    "Convert an API price list into a blended rate for your traffic mix",
    "Derive a self-host break-even volume rather than quoting a rule of thumb",
    "Name the reasons to self-host that have nothing to do with cost"
  ],

  prerequisites: ["3.3", "3.5"],

  blocks: [

    { t: "h2", n: "01", id: "arithmetic", text: "The arithmetic, and a missing premise",
      sub: "Dollars per hour over tokens per hour — that is the whole formula" },

    { t: "p", text: "Self-hosted cost per token is a division: what the hardware costs per hour, divided by how many tokens it produced in that hour. Everything else — quantization, batching, a better scheduler — enters only through the denominator. So the formula is trivial and the inputs are where the argument lives." },

    { t: "code", lang: "python", title: "g312.py — the self-hosted figures, recomputed", code: `for label, tps, ref in (("70B INT4", 1500, 0.48), ("7B FP16", 3000, 0.24)):
    per_hour = tps * 3600
    cost = 2.0 / (per_hour / 1e6)        # $2/hr over millions of tokens per hour
    print(label, tps, per_hour / 1e6, cost, ref)`,
      out: `  reference: 'A100-80GB @ $2/hr'
    LLaMA-2 70B INT4: ~1500 tokens/sec -> ~$0.48 per 1M tokens
    LLaMA-2 7B  FP16: ~3000 tokens/sec -> ~$0.24 per 1M tokens

  config                        tok/s   tok per hour     $/1M naive    reference
  70B INT4                       1500           5.40M        0.3704         0.48
  7B FP16                        3000          10.80M        0.1852         0.24

  the naive figures are 0.370 and 0.185. The are 1.30x higher,
  both of them by the same factor -- which is what an unstated utilisation
  assumption looks like: 0.370 / 0.77 = 0.48, 0.185 / 0.77 = 0.24.`,
      hl: [3],
      caption: "Both of the figures are exactly 1.30× the naive arithmetic, which means the discrepancy is a deliberate assumption rather than a slip." },

    { t: "callout", kind: "insight", title: "The reference is not wrong — it is quiet about the thing that matters",
      body: [
        { t: "p", text: "A uniform 1.30× factor across two independent rows is not an arithmetic error. It is a utilisation assumption: at 77% busy, 1,500 tokens per second of capacity delivers 1,155 on average, and $0.370 becomes $0.481." },
        { t: "p", text: "That is a defensible number for a well-run service. The problem is that it is invisible, and it is the variable with the most leverage in the entire calculation — more than quantization, more than batching, more than the choice of model. A reader who takes $0.48 as *the* cost of self-hosting a 70B has absorbed an assumption they cannot see and almost certainly will not meet." },
        { t: "p", text: "I would write the figure as a function rather than a number, which is what the next section does." }
      ] },

    { t: "code", lang: "python", title: "g312.py — the same cost, against utilisation", code: `for u in (1.0, 0.77, 0.50, 0.30, 0.20, 0.10, 0.05):
    eff = 1500 * u
    print(u, eff, 2.0 / (eff * 3600 / 1e6))`,
      out: `  70B INT4 on one A100-80GB at $2/hr, 1500 tok/s at full load
  utilisation     effective tok/s  $ per 1M tokens
  100%                      1500            0.370
  77%                       1155            0.481
  50%                        750            0.741
  30%                        450            1.235
  20%                        300            1.852
  10%                        150            3.704
  5%                          75            7.407`,
      caption: "A 20× cost range from one variable. Quantization at best buys 4×; nothing else on the usual list of optimisations is in this league." },

    { t: "viz", title: "Where the cost per token actually comes from", caption: "The optimisations everyone discusses move the denominator by factors of 2–4. Utilisation moves it by 20×.",
      svg: `<svg viewBox="0 0 760 268" width="100%" role="img" aria-label="Relative leverage of cost levers">
  <text x="16" y="22" class="s-label">COST PER TOKEN = $ per GPU-hour ÷ tokens actually produced per hour</text>

  <text x="16" y="58" class="s-sub">utilisation 5% → 100%</text>
  <rect x="200" y="46" width="500" height="18" rx="3" class="s-fill" style="stroke:var(--crit)" stroke-width="1.4"/>
  <text x="708" y="60" class="s-mono" style="fill:var(--crit)">20×</text>

  <text x="16" y="90" class="s-sub">quantization fp16 → int4</text>
  <rect x="200" y="78" width="100" height="18" rx="3" class="s-fill" style="stroke:var(--accent)" stroke-width="1.2"/>
  <text x="308" y="92" class="s-mono" style="fill:var(--accent)">4×</text>

  <text x="16" y="122" class="s-sub">batching 1 → 32</text>
  <rect x="200" y="110" width="130" height="18" rx="3" class="s-fill" style="stroke:var(--accent)" stroke-width="1.2"/>
  <text x="338" y="124" class="s-mono" style="fill:var(--accent)">5.2× (measured, 3.5)</text>

  <text x="16" y="154" class="s-sub">reserved / spot pricing</text>
  <rect x="200" y="142" width="83" height="18" rx="3" class="s-fill-2" style="stroke:var(--violet)" stroke-width="1.2"/>
  <text x="291" y="156" class="s-mono" style="fill:var(--violet)">3.3×</text>

  <text x="16" y="186" class="s-sub">prefix caching on RAG traffic</text>
  <rect x="200" y="174" width="70" height="18" rx="3" class="s-fill-2" style="stroke:var(--violet)" stroke-width="1.2"/>
  <text x="278" y="188" class="s-mono" style="fill:var(--violet)">up to 2.8× (measured, 3.7)</text>

  <text x="16" y="218" class="s-sub">speculative decoding</text>
  <rect x="200" y="206" width="28" height="18" rx="3" class="s-fill-bg" style="stroke:var(--warn)" stroke-width="1.2"/>
  <text x="236" y="220" class="s-mono" style="fill:var(--warn)">1.13× (measured, 3.6)</text>

  <line x1="200" y1="236" x2="700" y2="236" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="258" class="s-mono" style="fill:var(--crit)">tune the top bar first — and it is an admission and traffic-shaping problem, not a model one</text>
</svg>` },

    { t: "h2", n: "02", id: "api", text: "What the API side actually costs you",
      sub: "A price list is two numbers; your bill is one" },

    { t: "p", text: "Providers price input and output separately, usually with output 4–5× the input price, because output tokens are produced one forward pass at a time while input tokens are prefilled in parallel (3.1). So your effective rate depends on your traffic's shape. A RAG service sending 3,000 tokens of context for a 150-token answer pays almost entirely the input rate; a brainstorming tool pays mostly the output rate." },

    { t: "code", lang: "python", title: "g312.py — blended price at 3 input tokens per output", code: `for name, p_in, p_out in APIS:
    blended = (3 * p_in + 1 * p_out) / 4
    print(name, p_in, p_out, blended)`,
      out: `  blended API price assuming 3 input tokens per output token:
  provider                    $/1M in   $/1M out   blended $/1M
  GPT-4o                         2.50      10.00          4.375
  GPT-4o-mini                    0.15       0.60          0.262
  Claude Sonnet                  3.00      15.00          6.000
  Llama 3.1 70B hosted           0.50       0.70          0.550`,
      caption: "A 23× spread between the cheapest and the dearest of these, for the same token count. Model choice is a larger cost lever than any serving optimisation." },

    { t: "callout", kind: "trap", title: "The ratio you assume changes the answer by more than you expect",
      body: [
        { t: "p", text: "At 3 input tokens per output, GPT-4o blends to $4.375. At 20:1 — ordinary for RAG — it blends to $2.86, and at 1:3, a chat assistant writing long replies, to $8.13. **A factor of 2.8× purely from traffic shape**, before any engineering." },
        { t: "p", text: "Which means the first thing to measure is not latency or throughput but your own input-to-output ratio, from the logs. It decides which price in the list you are actually paying and therefore which model is cheapest for you, and that decision dominates everything in this module." }
      ] },

    { t: "h2", n: "03", id: "breakeven", text: "The break-even volume, derived",
      sub: "And why \"10M tokens a day\" is the wrong threshold" },

    { t: "p", text: "The reference offers a rule: self-host above 10 million tokens a day. It is worth checking against the capacity figure rather than accepting, because one A100 at 1,500 tokens per second, flat out for 24 hours, is 129.6 million tokens." },

    { t: "code", lang: "python", title: "g312.py — what 10M tokens a day actually implies", code: `cap = 1500 * 86400                        # one A100's daily capacity, flat out
util = 10e6 / cap                         # the threshold as utilisation
cost = 2.0 / (1500 * util * 3600 / 1e6)   # $ per 1M tokens at that utilisation

for name, blended in blended_prices.items():
    tok_day = 48.0 / blended * 1e6         # $48/day for the GPU
    print(name, tok_day / 1e6, 100 * tok_day / cap)`,
      out: `  one A100 at 1500 tok/s, if it were 100% busy, would serve:
    129.6M tokens/day

  so 10M tokens/day is 7.7% utilisation of ONE GPU.
  at that utilisation self-hosting costs $4.80 per 1M tokens --
  which is more than GPT-4o-mini's blended $0.26.

  find the volume where self-hosting actually breaks even with each API:
  provider                 break-even tok/day    as % of 1 GPU
  GPT-4o                                 11.0M               8%
  GPT-4o-mini                           182.9M             141%
  Claude Sonnet                           8.0M               6%
  Llama 3.1 70B hosted                   87.3M              67%`,
      hl: [3],
      caption: "The rule is accidentally right against a frontier model and wrong by 18× against a cheap one — GPT-4o-mini's break-even exceeds one GPU's entire daily capacity." },

    { t: "callout", kind: "warn", title: "The rule of thumb is right about the wrong comparison",
      body: [
        { t: "p", text: "Against GPT-4o the threshold really is around 11 million tokens a day, so the 10M is a good number — for that comparison. Against GPT-4o-mini the break-even is **182.9 million tokens a day, which is 141% of one GPU's capacity**: you cannot get there on one device at all, and adding devices adds cost in lockstep." },
        { t: "p", text: "So the rule has a hidden premise just like the $0.48 did: it assumes you are replacing a frontier model. If the realistic alternative is a small hosted model that is good enough for your task, self-hosting is unlikely to be the cheaper option at any volume you can reach." },
        { t: "p", text: "This is the single most useful thing in this lesson, because the decision is usually made the other way round — a team decides to self-host and then looks for the volume that justifies it." }
      ] },

    { t: "h2", n: "04", id: "peak", text: "Peak-to-mean, which is what actually kills the economics",
      sub: "You buy for the peak and you utilise at the mean" },

    { t: "p", text: "The break-even figures above assume you can run a GPU at whatever utilisation the volume implies. In production you cannot: you must provision for peak traffic, and you pay for that provisioning around the clock. A service with a 3:1 peak-to-mean ratio — a mild business-hours pattern — is paying for three times the hardware its average load needs." },

    { t: "code", lang: "python", title: "g312_ex.py — provision for peak, utilise at mean", code: `def self_host_cost(tokens_day, peak_to_mean, gpu_hr=2.0, tps=1500):
    mean_tps = tokens_day / 86400
    peak_tps = mean_tps * peak_to_mean
    gpus = max(1, -(-int(peak_tps) // tps) if peak_tps > tps else 1)
    cost_day = gpus * gpu_hr * 24
    util = mean_tps / (gpus * tps)
    return gpus, cost_day, cost_day / (tokens_day / 1e6), util`,
      out: `  tokens/day        p:m   GPUs      $/day       $/1M       util
  10M                 1      1         48      4.800       7.7%
  10M                 3      1         48      4.800       7.7%
  10M                10      1         48      4.800       7.7%

  100M                1      1         48      0.480      77.2%
  100M                3      3        144      1.440      25.7%
  100M               10      8        384      3.840       9.6%

  500M                1      4        192      0.384      96.5%
  500M                3     12        576      1.152      32.2%
  500M               10     39       1872      3.744       9.9%

  2000M               1     16        768      0.384      96.5%
  2000M               3     47       2256      1.128      32.8%
  2000M              10    155       7440      3.720      10.0%`,
      hl: [4],
      caption: "At a 3:1 peak-to-mean ratio the cost per million tokens stops falling at about $1.13 however large the volume gets. Scale does not fix a spiky load." },

    { t: "callout", kind: "insight", title: "Volume does not help; shape does",
      body: [
        { t: "p", text: "Read the `$/1M` column down each peak-to-mean group. At p:m = 1 the cost falls from $4.80 to $0.384 as volume grows — the familiar economy of scale. At p:m = 3 it falls to **$1.128 and stops**. At p:m = 10 it stops at $3.72, which is worse than most APIs at any volume." },
        { t: "p", text: "The reason is that both the numerator and the denominator scale together once you are provisioning per peak: ten times the traffic needs ten times the GPUs, so the ratio is fixed by your traffic *shape*, not its size." },
        { t: "p", text: "Which reframes the whole exercise. The lever is not buying more volume — it is flattening the peak: queue the batch work into the troughs, autoscale if your platform can do it fast enough to matter, or sell the trough capacity to another workload. All of those are scheduling problems, and none of them is a model optimisation." }
      ] },

    { t: "table",
      head: ["Lever", "Measured or derived effect", "Where it applies"],
      rows: [
        ["Keep the GPU busy", "**Up to 20×** on cost per token", "Everywhere, and it is the largest lever in this list"],
        ["Flatten the peak-to-mean ratio", "3:1 → 1:1 takes $1.13 to $0.38 at scale", "Any service with a traffic pattern, which is all of them"],
        ["Reserved or spot pricing", "$2.00/hr → $0.60/hr, so **3.3×**", "Predictable baseline load; spot needs interruption tolerance"],
        ["Choose a smaller model", "23× spread across the API price list", "Whenever a smaller model passes your evaluation (3.3, M8)"],
        ["Quantization", "4× memory, which converts to batch size", "Memory-bound decode, at the quality cost 3.3 measures"],
        ["Batching", "**5.2× measured** (3.5)", "Already on by default in every serious framework"],
        ["Prefix caching", "Up to **2.8×** on RAG traffic (3.7)", "Repeated prompt prefixes, which is agent and RAG traffic"],
        ["Output length limits", "Linear in the tokens not generated", "Anywhere verbosity is not the product"],
        ["Speculative decoding", "**1.13× measured** (3.6)", "Low batch size, large draft/target size ratio"]
      ] },

    { t: "callout", kind: "tradeoff", title: "Spot instances for inference are not the obvious win they are for training",
      body: [
        { t: "p", text: "Spot pricing takes $2.00 an hour to around $0.60 — a 3.3× cost reduction, which is real money and bigger than most of this module's optimisations. Training tolerates preemption well, because you checkpoint and resume." },
        { t: "p", text: "Inference does not. A preempted serving node drops every in-flight request and takes minutes to reload a 35 GB model, during which its share of traffic has nowhere to go. The usual structure is a reserved baseline that can carry the floor plus spot capacity for the peak, so a preemption degrades throughput rather than availability — which, note, is also the configuration that flattens the effective peak-to-mean ratio." }
      ] },

    { t: "h2", n: "05", id: "notcost", text: "The reasons to self-host that are not about cost",
      sub: "Which is usually why people actually do it" },

    { t: "ul", items: [
      "**Data cannot leave.** A regulatory or contractual constraint is not a number you trade off — it either applies or it does not, and if it applies the cost comparison is irrelevant.",
      "**You need a fine-tuned model.** M4's methods produce a model only you have, which no API offers. The serving cost is then the price of a capability rather than a cheaper version of a commodity.",
      "**Latency determinism.** An API's p99 includes their queueing, their other customers and their incidents. Your own hardware gives you a tail you can actually investigate — and, note, probably a worse median.",
      "**No deprecation risk.** A model you host does not get retired on someone else's schedule (3.14 and M12 take this seriously). The weights on your disk behave the same next year.",
      "**Volume at a flat rate.** Above the break-even, which the arithmetic above says is high against cheap models and modest against frontier ones."
    ] },

    { t: "exercise", kind: "analysis", title: "Build the self-host versus API model for a real traffic profile", difficulty: "core", minutes: 30,
      body: "Build a cost model that takes tokens per day, an input-to-output ratio and a peak-to-mean ratio, provisions GPUs for the peak, and reports cost per million tokens against three API options. Then find the volume at which self-hosting wins for a realistic 3:1 peak, and show what reserved and spot pricing do to the answer.",
      requirements: [
        "Self-host: 70B INT4 at 1,500 tokens/sec per A100, $2.00/hr on demand",
        "Provision ceil(peak_tps / 1500) GPUs, minimum 1, and charge for them 24 hours a day",
        "Report the resulting utilisation alongside the cost, since the two are the same fact",
        "API: blend the input and output prices by the input-to-output ratio",
        "Repeat the 100M tokens/day case at $2.00, $1.20, $0.80 and $0.60 per GPU-hour"
      ],
      hint: "Provision from the peak and divide by the mean. If your utilisation column does not fall as the peak-to-mean ratio rises, you have provisioned from the mean by mistake.",
      solution: { lang: "python", title: "g312_ex.py — the full model", code: `GPU_HR, TPS, DAY_S = 2.0, 1500, 86400

def self_host_cost(tokens_day, peak_to_mean, gpu_hr=GPU_HR, tps=TPS):
    """You buy for peak and you utilise at mean."""
    mean_tps = tokens_day / DAY_S
    peak_tps = mean_tps * peak_to_mean
    gpus = max(1, -(-int(peak_tps) // tps) if peak_tps > tps else 1)
    cost_day = gpus * gpu_hr * 24
    util = mean_tps / (gpus * tps)
    return gpus, cost_day, cost_day / (tokens_day / 1e6), util

def api_cost(tokens_day, in_per_out, price_in, price_out):
    out_tok = tokens_day / (in_per_out + 1)
    in_tok = tokens_day - out_tok
    return (in_tok * price_in + out_tok * price_out) / 1e6

APIS = [("GPT-4o", 2.50, 10.00), ("GPT-4o-mini", 0.15, 0.60),
        ("Llama 3.1 70B hosted", 0.50, 0.70)]
RATIO = 3

for tokens_day in (1e6, 10e6, 50e6, 100e6, 500e6, 2000e6):
    gpus, cday, per_m, util = self_host_cost(tokens_day, 3.0)
    beaten = [n for (n, i, o) in APIS
              if per_m < api_cost(tokens_day, RATIO, i, o) / (tokens_day / 1e6)]
    print("%.0fM self-host $%.3f/1M at %.0f%% util -- cheaper than: %s"
          % (tokens_day / 1e6, per_m, 100 * util,
             ", ".join(beaten) if beaten else "nothing"))

for label, hr in (("on demand $2.00", 2.00), ("1-yr reserved $1.20", 1.20),
                  ("3-yr reserved $0.80", 0.80), ("spot $0.60", 0.60)):
    g, cday, per_m, u = self_host_cost(100e6, 3.0, gpu_hr=hr)
    print("  %-22s $%.3f per 1M tokens" % (label, per_m))`,
        out: `  against the APIs, at the same volumes (3 input tokens per output):
  tokens/day           GPT-4o      4o-mini   70B hosted self-host p:m=3
  1M                    4.375        0.263        0.550         48.000
  10M                   4.375        0.263        0.550          4.800
  50M                   4.375        0.263        0.550          1.920
  100M                  4.375        0.263        0.550          1.440
  500M                  4.375        0.263        0.550          1.152
  2000M                 4.375        0.263        0.550          1.128

  the same table as a verdict:
  1M       self-host $48.000/1M at 1% util -- cheaper than: nothing
  10M      self-host $4.800/1M at 8% util -- cheaper than: nothing
  50M      self-host $1.920/1M at 19% util -- cheaper than: GPT-4o
  100M     self-host $1.440/1M at 26% util -- cheaper than: GPT-4o
  500M     self-host $1.152/1M at 32% util -- cheaper than: GPT-4o
  2000M    self-host $1.128/1M at 33% util -- cheaper than: GPT-4o

  and what reserved pricing or spot does to the same decision at 100M/day:
    on demand $2.00        $1.440 per 1M tokens
    1-yr reserved $1.20    $0.864 per 1M tokens
    3-yr reserved $0.80    $0.576 per 1M tokens
    spot $0.60             $0.432 per 1M tokens`,
        notes: [
          { t: "p", text: "**At a 3:1 peak-to-mean ratio, self-hosting a 70B never beats GPT-4o-mini or a hosted Llama endpoint — at any volume.** It converges to $1.128 per million while they sit at $0.263 and $0.550. The only comparison it wins is against the frontier model, from about 50M tokens a day." },
          { t: "p", text: "The utilisation column explains it: 33% at two billion tokens a day, because provisioning for a 3× peak caps utilisation at 1/3 by construction. Volume cannot fix that; only flattening the peak can." },
          { t: "p", text: "**Reserved and spot pricing change the verdict more than any technique in this module.** $2.00 to $0.60 an hour takes the 100M-tokens-a-day case from $1.440 to $0.432, which now beats the hosted Llama endpoint. A procurement decision outperformed quantization, batching and speculative decoding combined — and the model-side ceiling on all three of those is about 4×, 5.2× and 1.13× respectively." },
          { t: "p", text: "Two honest limits. This counts GPU-hours only: no engineering time, no on-call, no load balancer, no idle standby capacity, no model-storage or egress costs — all of which favour the API side, and some of which are larger than the compute. And the 1,500 tokens/sec figure is the reference's; 3.5 showed that throughput numbers are hardware- and traffic-specific, so a real decision needs that measured on the real workload." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "A GPU is a hotel room, not a taxi. You pay for the night whether you sleep in it or not, so the cost per guest is set by occupancy. Every optimisation in this module makes the room hold more guests; utilisation decides how many nights it sits empty, and that is the larger number by an order of magnitude." },
        { t: "p", text: "Which is why the cost conversation belongs with the people who shape traffic — batch windows, admission policy, rate limits — and not only with the people who tune the server." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\"Our GPT-4o bill is $40,000 a month. Leadership wants us to self-host to cut it. Walk me through your analysis.\"**" },
        { t: "p", text: "First, convert the bill to volume, because every later number depends on it. $40,000 a month at GPT-4o's blended $4.375 per million is 9,143 million tokens a month — **about 305 million tokens a day**. That is well past the ~11 million break-even against GPT-4o, so self-hosting genuinely is cheaper here, and I would say so before complicating it." },
        { t: "p", text: "How much cheaper depends on the peak-to-mean ratio. At a 3:1 pattern this needs 8 GPUs provisioned, costs **$11,520 a month at 29.4% utilisation**, and saves 71%. At a flat load it would be 3 GPUs and $4,320. At 10:1 it would be 24 GPUs and $34,560 — a 14% saving, which would not be worth the project. So the first thing I would pull from the logs is the traffic shape, because it spans the whole range from obviously-do-it to obviously-do-not." },
        { t: "p", text: "But the number that should end the meeting is the other one: **GPT-4o-mini at the same volume is $2,400 a month**, a 94% cut, available this week with no infrastructure — and 4.8× cheaper than the self-hosted plan. A hosted Llama 70B endpoint is $5,029. So the serious question is not whether to self-host, it is whether a smaller model passes their evaluation, which is an evaluation project rather than an infrastructure one. The 23× spread across the price list is a bigger lever than anything on the serving side." },
        { t: "p", text: "If the smaller model does not pass and they want to proceed, I would price it honestly, because GPU-hours are the smallest line: engineering time to build and operate it, on-call, idle standby, and the fact that my 1,500 tokens/sec figure is somebody else's benchmark rather than our measurement. And I would get the procurement right before touching the model — reserved at $0.80 an hour takes the same plan to **$4,608 a month** and spot to $3,456, which is 2.5× to 3.3× and beats quantization, batching and speculative decoding put together." },
        { t: "p", text: "The one thing I would push back on is the framing. If the real driver is data residency or a fine-tuned model, that is a sound reason to self-host and the cost analysis is a budget exercise, not a justification. Pretending it is about cost is how a project ends up judged against a number it cannot hit." }
      ] }
  ],

  takeaways: [
    "**Cost per token is dollars per GPU-hour over tokens produced per hour.** Every optimisation enters through the denominator, and utilisation is part of the denominator too.",
    "**The self-hosted figures are 1.30× the naive arithmetic**, consistent with an unstated ~77% utilisation assumption — defensible, invisible, and the variable with the most leverage.",
    "**Utilisation spans a 20× cost range** from 5% to 100%, against 4× for quantization, 5.2× for batching and 1.13× for speculative decoding.",
    "**Blend the API price list by your own input-to-output ratio.** The same provider ranges 2.8× across plausible ratios, and the list itself spans 23×.",
    "**\"Self-host above 10M tokens a day\" assumes you are replacing a frontier model.** That is 7.7% utilisation of one GPU, costing $4.80 per million — break-even is 11.0M against GPT-4o and 182.9M against GPT-4o-mini.",
    "**You provision for peak and utilise at mean**, so a 3:1 peak-to-mean ratio caps utilisation at a third regardless of volume.",
    "**Scale does not fix a spiky load.** At 3:1 the cost converges to $1.13 per million and never beats a cheap hosted model; flattening the peak is the lever, not growing the volume.",
    "**Reserved or spot pricing is 3.3×**, which outperforms every model-side optimisation in this module combined.",
    "**Spot is riskier for inference than for training**, because a preemption drops in-flight requests and reloading takes minutes — so use it for peak on top of a reserved baseline.",
    "**The strongest reasons to self-host are not cost**: data residency, a fine-tuned model, a tail you can investigate, and freedom from someone else's deprecation schedule."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "The reference puts a self-hosted 70B INT4 at $0.48 per million tokens, but the naive arithmetic gives $0.370. Both of its figures are 1.30× the naive value. What does that indicate?",
        options: [
          "An arithmetic slip repeated in both rows",
          "An unstated utilisation assumption of about 77%",
          "Inclusion of networking and storage costs",
          "A different GPU price than the one quoted"
        ],
        answer: 1,
        why: "A uniform factor across two independent rows is an assumption rather than an error: 0.370/0.77 = 0.48 and 0.185/0.77 = 0.24. Seventy-seven percent utilisation is reasonable for a well-run service, but it is the single highest-leverage variable in the calculation — the cost spans 20× between 5% and 100% — so leaving it implicit means a reader absorbs a premise they are unlikely to meet. Networking and storage would not scale both rows identically, and the GPU price is stated." },

      { stem: "A service runs at 2 billion tokens a day with a 3:1 peak-to-mean traffic ratio. What is the self-hosted cost per million tokens, and why?",
        options: [
          "About $0.38, since at that volume the hardware is nearly fully utilised",
          "About $1.13, because provisioning for a 3× peak caps utilisation at a third however large the volume",
          "About $4.80, the same as at 10M tokens a day",
          "It cannot be computed without knowing the input-to-output ratio"
        ],
        answer: 1,
        why: "Provisioning from the peak means both the GPU count and the traffic scale together, so the ratio is fixed by the traffic's shape rather than its size — measured in the model, utilisation is 32.8% at 2 billion tokens a day and the cost converges to $1.128. Volume does not rescue a spiky load; flattening the peak does. The input-to-output ratio affects the API comparison, not the self-hosted cost per token." },

      { stem: "A team spends $40,000 a month on GPT-4o and wants to cut it. Which lever is largest?",
        options: [
          "Quantizing a self-hosted replacement to INT4",
          "Evaluating whether a smaller model passes, since the price list spans 23×",
          "Enabling speculative decoding",
          "Switching to continuous batching"
        ],
        answer: 1,
        why: "GPT-4o blends to $4.375 per million and GPT-4o-mini to $0.263 — a 94% reduction available this week with no infrastructure, if the task tolerates the smaller model. That dwarfs quantization's 4×, batching's measured 5.2× and speculative decoding's measured 1.13×, and continuous batching is on by default in every serious framework. Whether the smaller model passes is an evaluation question, which is what makes evaluation a cost discipline as much as a quality one." },

      { stem: "Why are spot instances a weaker fit for inference than for training?",
        options: [
          "Spot GPUs are slower than on-demand GPUs",
          "A preemption drops in-flight requests and the model takes minutes to reload, so availability suffers rather than throughput",
          "Spot capacity cannot run quantized models",
          "Inference needs more memory than spot instances provide"
        ],
        answer: 1,
        why: "Training checkpoints and resumes, so a preemption costs some recomputation. A serving node that is reclaimed drops every active request and then needs minutes to load tens of gigabytes of weights, during which its share of traffic has nowhere to go. The usual structure is a reserved baseline carrying the floor plus spot for the peak, so preemption degrades throughput instead of availability — which also flattens the effective peak-to-mean ratio. The hardware itself is identical." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Cost questions are where engineers either quote a rule of thumb or do the arithmetic in front of you",
    questions: [
      { level: "core",
        q: "How do you decide between self-hosting and an API?",
        strong: "A strong answer derives a break-even rather than quoting a volume threshold, and separates cost from the other reasons.",
        answer: [
          { t: "p", text: "I would derive the break-even rather than quote one, because the usual threshold hides its premise. One A100 at 1,500 tokens a second is 129.6 million tokens a day flat out, costing $48 — so $0.37 per million at full utilisation. The break-even against GPT-4o's blended $4.375 is about 11 million tokens a day; against GPT-4o-mini's $0.263 it is 183 million, which exceeds one GPU's entire capacity." },
          { t: "p", text: "So the answer depends on which API you are actually replacing, and the common rule — self-host above 10 million a day — is right for a frontier model and wrong by about 18× for a cheap one." },
          { t: "p", text: "Then the number that usually decides it in practice: peak-to-mean. You provision for peak and utilise at mean, so a 3:1 pattern caps utilisation at a third and takes the cost from $0.38 to $1.13 per million at any volume. That is still cheaper than a frontier model and more expensive than a small hosted one." },
          { t: "p", text: "And I would separate the cost case from the real case. Data residency, a fine-tuned model, an investigable tail, no exposure to someone else's deprecation schedule — those are good reasons to self-host, and if one of them applies, the arithmetic is a budget exercise rather than a justification." }
        ] },

      { level: "advanced",
        q: "Rank the cost levers available on a self-hosted deployment.",
        strong: "A strong answer puts utilisation and procurement above the model optimisations, with numbers.",
        answer: [
          { t: "p", text: "Utilisation first, by a wide margin: the cost per token spans 20× between 5% and 100% busy. That makes it larger than every technique in this module put together, and it is an admission-and-traffic-shaping problem rather than a model one — batch windows, queueing, selling the trough to another workload." },
          { t: "p", text: "Then model choice, which spans 23× across the API price list and a similar range across self-hosted sizes. Whether you can take it is an evaluation question, which is why evaluation work is a cost discipline." },
          { t: "p", text: "Then procurement: reserved or spot takes $2.00 an hour to around $0.60, a 3.3× reduction. At 100 million tokens a day that is $1.44 down to $0.43 per million, which changes which APIs you beat." },
          { t: "p", text: "Only then the serving optimisations, and they are smaller than their prominence suggests. Quantization is up to 4× on memory, which converts into batch size. Batching I measured at 5.2×, and it is on by default anyway. Prefix caching was up to 2.8× on RAG traffic. Speculative decoding I measured at 1.13×, and 0.71× when configured badly." },
          { t: "p", text: "The thing I would add is that the GPU-hour line is not the whole bill. Engineering time, on-call, standby capacity and the throughput figure you assumed but did not measure all push the real number up, and all of them favour the API side." }
        ] },

      { level: "core",
        q: "What would you measure before any cost optimisation work?",
        strong: "A strong answer names the traffic properties that determine which lever applies.",
        answer: [
          { t: "p", text: "Three things from the logs, none of which require touching the server. The input-to-output token ratio, because it sets your blended API rate — the same provider ranges 2.8× between a RAG shape and a long-form chat shape — and tells you whether your requests are prefill- or decode-dominated, which decides whether prefix caching or quantization is the relevant lever." },
          { t: "p", text: "The peak-to-mean ratio, because it caps achievable utilisation and therefore the self-hosted cost floor. At 3:1 the floor is $1.13 per million no matter how much volume you add." },
          { t: "p", text: "And actual utilisation now, which is usually the shock. Teams tend to know their throughput capacity and not their occupancy, and occupancy is the 20× term." },
          { t: "p", text: "Then one measurement on the server: tokens per second at the concurrency you actually run, not at batch 1. Published throughput figures are specific to hardware and traffic — I have had the same benchmark give 12.92× and 5.22× depending on how carefully I ran it — so a capacity plan built on somebody else's number is a plan built on a 2.5× error." }
        ] }
    ]
  }
});
