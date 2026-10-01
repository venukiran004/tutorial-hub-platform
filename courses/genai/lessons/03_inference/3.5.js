EC.receiveLesson({
  id: "3.5",

  lede: "Batching is the one optimisation that costs nothing to try and changes the economics of serving outright. Because a decode step is bound by loading weights rather than by arithmetic (3.1), running 32 requests through it costs far less than 32× one request — I measured 32 rows at **6.4× the step time of one**, so **5.22× the tokens per second**. But *how* you batch matters more than whether: a static batch wasted **68.2%** of its slots on padding in my run, and switching the same arrival stream to continuous batching cut mean latency by **4.87×**. The throughput story is the famous one; the latency story is the bigger number.",

  objectives: [
    "Explain why one decode step costs almost the same for 1 request as for 32",
    "Compute the padding waste a static batch incurs on a long-tailed length mix",
    "Describe continuous batching as iteration-level scheduling rather than bigger batches",
    "Say what chunked prefill fixes and which metric it protects",
    "Choose a batch size from a latency budget instead of from available memory"
  ],

  prerequisites: ["3.1", "3.2"],

  blocks: [

    { t: "h2", n: "01", id: "free", text: "Why batching is nearly free",
      sub: "The weights get loaded once however many rows ride along" },

    { t: "p", text: "A decode step loads every weight in the model to produce one token. That load is the cost, and it does not change when you add a second request to the step — the same weights, read once, now serve two tokens. This is the whole of the argument, and it follows directly from 3.1: decode is memory-bound, so the resource being consumed is bytes moved, and batching moves the same bytes for more output." },

    { t: "p", text: "The arithmetic does grow with the batch. On a GPU that scarcely matters until the batch is large, because the arithmetic units were idle anyway. On the 4-thread CPU I measured on it matters much sooner, and the curve below shows that honestly — it is a weaker version of the GPU story, not a different one." },

    { t: "code", lang: "python", title: "g35b.py — decode step time against batch size", code: `for bs in (1, 2, 4, 8, 16, 32):
    b = tok(["word " * 64] * bs, return_tensors="pt", padding=True)
    with torch.no_grad():
        o = m(**b, use_cache=True)
    past, cur = o.past_key_values, o.logits[:, -1:].argmax(-1)

    def step():
        with torch.no_grad():
            m(cur, past_key_values=past, use_cache=True)

    print(bs, med(step), bs / (med(step) / 1000))   # ms, tokens/sec`,
      out: `  decode step ms, three independent passes (median of 9 each)
  batch       pass 1     pass 2     pass 3       spread
  1            24.92      38.96      46.12        1.85x
  2            28.61      40.97      48.17        1.68x
  4            46.65      49.20      49.97        1.07x
  8            67.25      61.03      65.27        1.10x
  16           93.31      86.53     107.31        1.24x
  32          175.66     152.74     158.90        1.15x

  batch     tokens/sec   vs batch 1
  1               40.1        1.00x
  2               69.9        1.74x
  4               85.7        2.14x
  8              131.1        3.27x
  16             184.9        4.61x
  32             209.5        5.22x`,
      caption: "Batch 32 costs 6.4× the step time of batch 1 and produces 32× the tokens — 5.22× the throughput. The spread column is why I ran it three times." },

    { t: "callout", kind: "trap", title: "My first pass at this measurement reported 12.92×",
      body: [
        { t: "p", text: "An earlier run of the same code with one warm-up and three repetitions gave **12.92× at batch 32**, which I nearly wrote into this lesson. The spread column above is the reason it was wrong: at batch 1 the step time varied by **1.85×** between passes, so an unluckily slow batch-1 baseline inflates every ratio above it." },
        { t: "p", text: "The fix was not more statistics on one pass — a median of nine inside a contended window is still contended. It was three independent passes, taking the best from each, which is the right estimator when the noise is additive interference from other processes." },
        { t: "p", text: "The sign of the effect was never in doubt. The magnitude was off by 2.5×, and the magnitude is what a capacity plan is built on." }
      ] },

    { t: "p", text: "Note what did *not* happen: per-request latency barely moved for small batches and then grew. One request waiting inside a batch of 32 sees a **6.4× slower step**, so its tokens arrive 6.4× further apart. On a GPU this factor is closer to 1.1× for the same batch; on my CPU the arithmetic saturates early and the trade is much worse. Either way the shape is the same — **batching buys throughput and spends TPOT**, and how much it spends is a hardware question you have to answer on your own hardware." },

    { t: "h2", n: "02", id: "static", text: "Static batching and the padding it wastes",
      sub: "Every row runs until the longest row finishes" },

    { t: "p", text: "The naive scheduler collects requests until the batch is full, runs them together, and starts the next batch when the last row finishes. Because the rows are processed in lockstep, a request that wanted 12 tokens occupies a slot for as long as the request that wanted 320. The slots in between produce nothing." },

    { t: "p", text: "On a uniform workload this costs nothing. On chat traffic it costs most of the machine, because chat output lengths are long-tailed: many short answers and a few very long ones, which is exactly the distribution that maximises the gap between the mean and the maximum." },

    { t: "code", lang: "python", title: "g35.py — padded slots in a static batch", code: `LENS = [random.choice([12, 18, 24, 30, 40, 55, 90, 160, 320]) for _ in range(64)]

for bs in (1, 4, 8, 16, 32, 64):
    slots = useful = 0
    for i in range(0, len(LENS), bs):
        grp = LENS[i:i + bs]
        slots += max(grp) * len(grp)      # every row runs until the longest finishes
        useful += sum(grp)
    print(bs, slots, useful, 100 * (slots - useful) / slots)`,
      out: `  64 requests, output lengths sampled from a long-tailed chat mix
  shortest 12, median 55, longest 320, total useful tokens 6514

  batch size      batches   slots used       useful      waste
  1                    64         6514         6514       0.0%
  4                    16        16100         6514      59.5%
  8                     8        19200         6514      66.1%
  16                    4        20480         6514      68.2%
  32                    2        20480         6514      68.2%
  64                    1        20480         6514      68.2%`,
      hl: [6],
      caption: "Waste climbs fast and then plateaus at 68.2% — once a batch is large enough to contain one 320-token request, every row in it pays for 320." },

    { t: "callout", kind: "insight", title: "The waste plateaus, which is worse than it sounds",
      body: [
        { t: "p", text: "Between batch 16 and batch 64 the waste does not grow: **68.2% at all three sizes**. The plateau is set by the *tail of the length distribution*, not by the batch size — once a batch is big enough to probably contain the longest request, its cost per row is the longest request." },
        { t: "p", text: "So you cannot tune your way out of it by choosing a smaller batch. Batch 4 is still 59.5% waste, and it has given up most of the throughput you batched for in the first place. The only fix is a scheduler that releases a finished row." }
      ] },

    { t: "h2", n: "03", id: "continuous", text: "Continuous batching",
      sub: "Decide which requests are in the batch at every step, not once per batch" },

    { t: "p", text: "Continuous batching — also called dynamic batching, and implemented as **iteration-level scheduling** — makes the membership decision before every decode step rather than once per batch. A request that finished at step 40 leaves; a request that arrived at step 41 joins. There is no notion of a batch that must complete." },

    { t: "p", text: "The name is slightly misleading. It is not a bigger batch, and it does not change the arithmetic of a step at all. It changes *occupancy*: the slots stay full of work that someone is waiting for, instead of full of padding." },

    { t: "viz", title: "Static against continuous, same four requests", caption: "Static holds every row until the longest finishes. Continuous releases a row the step it completes and admits the next arrival immediately.",
      svg: `<svg viewBox="0 0 760 290" width="100%" role="img" aria-label="Static versus continuous batching timelines">
  <text x="16" y="22" class="s-label" style="fill:var(--crit)">STATIC — batch completes together</text>
  <text x="16" y="48" class="s-sub">req 1</text>
  <rect x="60" y="36" width="90" height="16" rx="3" class="s-fill" style="stroke:var(--crit)" stroke-width="1.2"/>
  <rect x="150" y="36" width="230" height="16" rx="3" class="s-fill-bg" style="stroke:var(--line)" stroke-width="1" stroke-dasharray="3 3"/>
  <text x="390" y="48" class="s-sub" style="fill:var(--crit)">idle, slot held</text>

  <text x="16" y="72" class="s-sub">req 2</text>
  <rect x="60" y="60" width="320" height="16" rx="3" class="s-fill" style="stroke:var(--crit)" stroke-width="1.2"/>
  <text x="390" y="72" class="s-sub">the longest — sets the batch</text>

  <text x="16" y="96" class="s-sub">req 3</text>
  <rect x="60" y="84" width="160" height="16" rx="3" class="s-fill" style="stroke:var(--crit)" stroke-width="1.2"/>
  <rect x="220" y="84" width="160" height="16" rx="3" class="s-fill-bg" style="stroke:var(--line)" stroke-width="1" stroke-dasharray="3 3"/>

  <text x="16" y="120" class="s-sub">req 4</text>
  <rect x="60" y="108" width="40" height="16" rx="3" class="s-fill" style="stroke:var(--crit)" stroke-width="1.2"/>
  <rect x="100" y="108" width="280" height="16" rx="3" class="s-fill-bg" style="stroke:var(--line)" stroke-width="1" stroke-dasharray="3 3"/>

  <line x1="380" y1="30" x2="380" y2="130" stroke="var(--crit)" stroke-width="1.4"/>
  <text x="386" y="128" class="s-mono" style="fill:var(--crit)">next batch starts here</text>

  <text x="16" y="178" class="s-label" style="fill:var(--good)">CONTINUOUS — rows leave and join every step</text>
  <text x="16" y="204" class="s-sub">slot A</text>
  <rect x="60" y="192" width="90" height="16" rx="3" class="s-fill" style="stroke:var(--good)" stroke-width="1.2"/>
  <rect x="152" y="192" width="70" height="16" rx="3" class="s-fill-2" style="stroke:var(--good)" stroke-width="1.2"/>
  <rect x="224" y="192" width="110" height="16" rx="3" class="s-fill" style="stroke:var(--good)" stroke-width="1.2"/>
  <text x="344" y="204" class="s-sub">req 5, 6, 7 admitted as slots free</text>

  <text x="16" y="228" class="s-sub">slot B</text>
  <rect x="60" y="216" width="320" height="16" rx="3" class="s-fill" style="stroke:var(--good)" stroke-width="1.2"/>

  <text x="16" y="252" class="s-sub">slot C</text>
  <rect x="60" y="240" width="160" height="16" rx="3" class="s-fill" style="stroke:var(--good)" stroke-width="1.2"/>
  <rect x="222" y="240" width="112" height="16" rx="3" class="s-fill-2" style="stroke:var(--good)" stroke-width="1.2"/>

  <text x="16" y="282" class="s-mono" style="fill:var(--good)">measured on a 40-request stream: 2.03× the throughput, 4.87× lower mean latency</text>
</svg>` },

    { t: "p", text: "The two numbers in that caption come from the exercise below, and they are not the same size. Continuous batching is sold as a throughput optimisation — and it did give **2.03×** more tokens per second on my simulated stream. But mean latency improved by **4.87×**, because a short request no longer waits for a long one to finish. The bigger win is the one nobody advertises." },

    { t: "h3", text: "What the scheduler decides at each step" },

    { t: "ol", items: [
      "**Which requests run this iteration.** Normally everything admitted, but memory sets a ceiling — the KV cache of all active rows has to fit (3.2), and a request with 8,000 tokens of context occupies far more of that budget than one with 100.",
      "**Whether to preempt.** If the cache is full and a long-running request is holding much of it, the scheduler may evict that request — recomputing its prefill later, or swapping its cache to host memory. vLLM does this, and it is why you can admit more requests than will strictly fit.",
      "**Whether to admit new arrivals.** A queued request can start at the next step boundary rather than the next batch boundary, which is where most of the latency win comes from.",
      "**How to mix prefill and decode.** A new arrival needs a prefill pass, which is much more expensive than a decode step. Interleaving the two is the subject of the next section."
    ] },

    { t: "callout", kind: "note", title: "You do not implement this",
      body: [
        { t: "p", text: "Continuous batching is the default in vLLM, TGI, TensorRT-LLM and SGLang. The reason to understand it is not to build it — it is to read your own metrics correctly. If your p50 is fine and your p99 is terrible, the question \"is a long request blocking short ones\" has a different answer under each scheduler, and the fix is a different setting." }
      ] },

    { t: "h2", n: "04", id: "chunked", text: "Chunked prefill",
      sub: "A long prompt stalls everybody else's tokens unless you break it up" },

    { t: "p", text: "Prefill and decode compete for the same device. A decode step on my setup takes about 39 ms; prefilling a 512-token prompt takes 1,315 ms. While that prefill runs, no other request receives a token — so every active stream pauses for the equivalent of **33.9 decode steps**." },

    { t: "code", lang: "python", title: "g35.py — how long a prefill blocks decode", code: `d_ms = timed(dstep)[0]                       # one decode step, batch 1
for n in (256, 512):
    s = ids[:, :n]
    p_ms = timed(lambda: m(s), warm=1, reps=3)[0]
    print(n, p_ms, p_ms / d_ms)                 # prefill ms, decode steps stalled`,
      out: `  work                median ms
  1 decode step           38.76
  prefill 256 tok        798.86   = 20.6 decode steps stalled
  prefill 512 tok       1315.39   = 33.9 decode steps stalled`,
      caption: "The ratio, not the absolute times, is what transfers to a GPU: a prefill is worth tens of decode steps, and it is serialised against them." },

    { t: "p", text: "Chunked prefill splits the long prompt into pieces — 512 tokens becomes four chunks of 128 — and runs a decode step between them. The prefill finishes slightly later; everybody else's tokens keep flowing. It is a **TPOT optimisation paid for with TTFT**, which is the right trade on a service with many active streams and the wrong one on a service with a single user." },

    { t: "callout", kind: "warn", title: "I could not measure the cost of chunking, and I am not going to pretend otherwise",
      body: [
        { t: "p", text: "I ran the chunked version against the unchunked one and got **0.87× and 0.91×** — chunking apparently *faster* than not chunking, which is backwards, since chunking adds per-chunk overhead and cannot reduce total work." },
        { t: "p", text: "The explanation is in the same script: the unchunked 512-token prefill measured **1,315 ms** in one block and **1,495 ms** in another, a 14% drift inside one process. The chunking overhead on this model is smaller than that drift, so the comparison measures my machine's scheduler rather than the algorithm." },
        { t: "p", text: "What I can state is the part that survives the noise by an order of magnitude: a prefill costs tens of decode steps, and it is serialised against them. The published figure for chunking overhead is a few percent; I have not verified it, and I am flagging it as unverified rather than quoting it as measured." }
      ] },

    { t: "h2", n: "05", id: "choosing", text: "Choosing a batch size",
      sub: "From the latency budget down, not from the memory ceiling up" },

    { t: "ladder", title: "Setting the batch limit on a chat service with a 50 ms TPOT budget", rungs: [
      { level: "bad", label: "As large as memory allows", why: "The usual default: compute how many KV caches fit and set the limit there. It maximises throughput and routinely blows the latency budget, because step time grows with the batch and nothing in the configuration mentions that.",
        code: `max_num_seqs = 256     # "we have 80 GB, so…"`,
        note: "This is the configuration that produces the ticket \"it was fast last week\" — it is fast until traffic fills the batch." },
      { level: "ok", label: "A fixed number from a benchmark", why: "Measure step time against batch size, pick the largest batch that stays inside the TPOT budget, hard-code it. Correct for the traffic you measured and wrong as soon as context lengths shift, because step time depends on total tokens in the batch rather than on the number of rows.",
        code: `max_num_seqs = 32      # measured: 48 ms step at 1k context` },
      { level: "best", label: "A token budget plus a latency-aware ceiling", why: "Cap the total tokens in flight, which is what actually determines step time, and keep a row cap as a safety net. Then watch the TPOT percentile and let the scheduler queue rather than degrade everyone at once.",
        code: `max_num_batched_tokens = 8192   # what step time really tracks
max_num_seqs           = 64     # ceiling, rarely the binding one`,
        note: "vLLM exposes both because both matter: 64 rows of 128 tokens and 8 rows of 8,000 tokens are not the same step." }
    ] },

    { t: "table",
      head: ["Workload", "What to batch for", "Why"],
      rows: [
        ["Interactive chat", "Moderate batch, continuous, chunked prefill on", "TPOT is visible to a human reading the stream; throughput is a cost line"],
        ["Offline bulk scoring", "Largest batch that fits, static is fine", "Nothing is waiting, so padding is the only loss — and you can sort by length to remove it"],
        ["Embedding or classification", "Very large batch, sorted by length", "One forward pass per item, no decode loop, so the padding argument is the whole argument"],
        ["Agentic tool loops", "Small batch, prefix caching on", "Each turn re-sends a growing context; the win is in not re-prefilling it (3.2), not in batch size"],
        ["Mixed tenants, one endpoint", "Token budget plus per-tenant rate limit", "One tenant's 32k-context requests can consume the whole batch's token budget and starve the rest"]
      ] },

    { t: "callout", kind: "tradeoff", title: "Sorting by length is free throughput — and it is not always allowed",
      body: [
        { t: "p", text: "The 68.2% padding waste above assumes requests arrive in random length order. Sort the 64 requests by length before batching and the waste nearly vanishes, because each batch then holds rows of similar length. For offline work this is the cheapest optimisation in this lesson." },
        { t: "p", text: "Online you cannot do it. Sorting requires knowing the output length before generating it, which you do not, and it reorders requests, which breaks first-come-first-served and lets a stream of short requests starve a long one indefinitely. Continuous batching is the online answer precisely because it needs no knowledge of length at all." }
      ] },

    { t: "exercise", kind: "lab", title: "Simulate both schedulers on one arrival stream", difficulty: "core", minutes: 25,
      body: "You have measured that a decode step costs about 25 ms regardless of batch size, and that the device holds 8 rows. Build a simulator that runs the same 40-request arrival stream through a static batcher and a continuous one, and report wall-clock time, mean latency, p95 latency and tokens per second for each. Then explain which of the two headline metrics improves more, and why.",
      requirements: [
        "Generate 40 requests with exponential inter-arrival times (mean 120 ms) and output lengths drawn from a long-tailed mix",
        "Static: fill 8 slots, wait for the whole group to arrive, run until the longest member finishes, then start the next group",
        "Continuous: advance all active rows by one token per step, release finished rows at the step boundary, admit waiting arrivals immediately",
        "Report wall-clock, mean and p95 latency measured from each request's own arrival time",
        "Also report the padding percentage the static scheduler incurred"
      ],
      hint: "The subtle part is the clock in the static case: a group cannot start before its last member has arrived, so the start time is the later of the current clock and that arrival. Getting it wrong makes static look better than it is.",
      solution: { lang: "python", title: "g35_ex.py — static against continuous on one stream", code: `import random

STEP_MS = 25.0          # one decode step for the whole batch, flat in batch
SLOTS = 8               # how many rows the device can hold

random.seed(7)
N = 40
reqs = []
t = 0.0
for i in range(N):
    t += random.expovariate(1 / 120.0)
    reqs.append((round(t, 1), random.choice([8, 12, 16, 24, 32, 48, 96, 240])))

def static_batching(reqs, slots, step):
    done, i, clock = [], 0, 0.0
    while i < len(reqs):
        grp = reqs[i:i + slots]
        start = max(clock, grp[-1][0])        # wait for the whole group to arrive
        run = max(n for _, n in grp) * step   # every row runs until the longest ends
        for arr, n in grp:
            done.append((arr, n, start + run))
        clock = start + run
        i += len(grp)
    return done, clock

def continuous_batching(reqs, slots, step):
    pending, active, done, clock = list(reqs), [], [], 0.0
    while pending or active:
        while len(active) < slots and pending and pending[0][0] <= clock:
            arr, n = pending.pop(0)
            active.append([n, arr])
        if not active:
            clock = pending[0][0]
            continue
        clock += step
        for row in active:
            row[0] -= 1
        still = []
        for row in active:
            if row[0] == 0:
                done.append((row[1], 0, clock))
            else:
                still.append(row)
        active = still
    return done, clock

def report(name, done, wall):
    lat = sorted(fin - arr for arr, _, fin in done)
    toks = sum(n for _, n in reqs)
    print("  %-22s %9.0f %10.0f %10.0f %10.1f"
          % (name, wall, sum(lat) / len(lat), lat[int(0.95 * len(lat))],
             toks / (wall / 1000)))

print("  %-22s %9s %10s %10s %10s"
      % ("scheduler", "wall ms", "mean lat", "p95 lat", "tok/sec"))
s_done, s_wall = static_batching(reqs, SLOTS, STEP_MS)
c_done, c_wall = continuous_batching(reqs, SLOTS, STEP_MS)
report("static", s_done, s_wall)
report("continuous", c_done, c_wall)`,
        out: `  40 requests, 2580 output tokens total, 8 slots, 25 ms per decode step

  scheduler                wall ms   mean lat    p95 lat    tok/sec
  static                     23340      10399      20596      110.5
  continuous                 11484       2134       7700      224.7

  wall-clock ratio      2.03x
  mean latency ratio    4.87x

  where does static lose it? padded slots:
  slots consumed 7296, useful 2580, padding 64.6%`,
        notes: [
          { t: "p", text: "**Latency improves more than throughput: 4.87× against 2.03×.** Throughput is bounded by the work that genuinely has to be done, so releasing padding can at best recover the padding — 64.6% wasted slots is a 2.8× ceiling, and 2.03× of it was realised. Latency has no such bound: an 8-token request that was waiting behind a 240-token one stops waiting entirely, and its latency falls by a factor set by the length ratio rather than by the padding fraction." },
          { t: "p", text: "The p95 tells the same story more sharply — 20,596 ms down to 7,700 ms. Under static batching a short request's latency is determined by whichever long request happened to share its batch, which is a lottery, and lotteries live in the tail." },
          { t: "p", text: "The padding figure here (64.6%) differs from the 68.2% earlier in the lesson because this stream uses a different length mix and only 40 requests. Both are the same phenomenon measured on different traffic, which is worth internalising: the number is a property of your length distribution, so it is one you compute from your own logs rather than quote from a lesson." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "A decode step is a bus, not a taxi. The cost is driving the route — loading every weight — and it barely changes with how many passengers ride. Static batching makes the bus wait at the terminus until the last passenger has finished their whole journey. Continuous batching lets people get off at their stop and lets the next person on. Same bus, same route, same fuel." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\"Our p50 latency is 800 ms and our p99 is 14 seconds. GPU utilisation sits at 40%. We serve a chat product on vLLM. Where do you look?\"**" },
        { t: "p", text: "The combination is the clue: 40% utilisation with a bad tail means the device is idle while requests wait, so the problem is scheduling or admission rather than capacity. vLLM already does continuous batching, so I would not be looking for padding waste." },
        { t: "p", text: "First hypothesis: long prefills blocking decode. A chat product with document context has prompts in the thousands of tokens, each worth tens of decode steps — measured, 1,315 ms of prefill against a 39 ms step. A request that arrives mid-stream stalls every active stream while it prefills, and that lands in the p99 of the *other* requests. Check whether chunked prefill is enabled and plot TTFT against prompt length." },
        { t: "p", text: "Second: preemption. If the KV cache fills, vLLM evicts and later recomputes, and a recomputed request pays its prefill twice. The scheduler exposes a preemption counter — a non-zero one at 40% utilisation means the memory ceiling is binding before the compute ceiling, which points at the cache fraction, cache quantization, or GQA (3.2)." },
        { t: "p", text: "Third, and the one I would check before either if the product allows it: the maximum context admitted. One tenant sending 32k-token prompts can consume the whole token budget, and the symptom is exactly this — low utilisation, fine median, catastrophic tail. The fix is a per-tenant token limit rather than a bigger GPU." }
      ] }
  ],

  takeaways: [
    "**A decode step costs almost the same for 1 request as for 32**, because it is bound by loading weights. Measured: 6.4× the step time for 32× the tokens, so 5.22× the throughput.",
    "**Batching spends TPOT to buy throughput.** The exchange rate is hardware-specific — small on a GPU, large on a saturated CPU — so it is a number you measure rather than assume.",
    "**Static batching wastes the gap between the mean and the maximum output length.** On a long-tailed chat mix I measured 68.2% of slots producing nothing.",
    "**That waste plateaus and cannot be tuned away** by choosing a smaller batch — it is set by the tail of the length distribution, and batch 4 still wasted 59.5% while giving up most of the throughput.",
    "**Continuous batching is iteration-level scheduling**, not a bigger batch: membership is decided before every step, so finished rows leave and arrivals join immediately.",
    "**Its latency win exceeds its throughput win** — 4.87× mean latency against 2.03× throughput on the same stream — because throughput can only recover the padding while latency is freed from the length lottery.",
    "**A prefill is worth tens of decode steps** (measured: 33.9 for a 512-token prompt) and is serialised against them, which is what chunked prefill exists to fix.",
    "**Chunked prefill trades TTFT for TPOT.** Right on a service with many concurrent streams, wrong on one with a single user.",
    "**Cap total tokens in flight, not row count.** Step time tracks tokens in the batch, so 8 rows of 8,000 tokens is a slower step than 64 rows of 128.",
    "**Sorting by length removes padding waste for free offline**, and is unavailable online because you do not know the output length and reordering starves long requests."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Why does one decode step cost roughly the same for a batch of 1 as for a batch of 8?",
        options: [
          "Because the GPU pads small batches up to a fixed size anyway",
          "Because the step is bound by loading every weight once, and that load is shared across the rows",
          "Because the KV cache is shared between requests in a batch",
          "Because small batches are scheduled at a lower clock speed"
        ],
        answer: 1,
        why: "Decode is memory-bandwidth-bound: the dominant cost is reading every weight to produce one token, and that read serves every row in the batch. Adding rows adds arithmetic, which was not the constraint. Measured on CPU, batch 8 cost 2.6× the step time of batch 1 while producing 8× the tokens; on a GPU the factor is smaller still. The KV cache is emphatically not shared — each row has its own, which is what limits batch size in the first place." },

      { stem: "A static batcher on a workload with output lengths from 12 to 320 tokens wastes 68.2% of its slots. What reduces that waste most on an online chat service?",
        options: [
          "Reducing the batch size to 4",
          "Sorting requests by expected output length before batching",
          "Switching to iteration-level scheduling so finished rows are replaced",
          "Increasing the KV cache allocation so more rows fit"
        ],
        answer: 2,
        why: "Continuous batching replaces a finished row at the next step boundary, so slots hold work rather than padding — measured 2.03× throughput and 4.87× lower mean latency on the same stream. Reducing the batch to 4 still wasted 59.5% and gives up most of the throughput. Sorting by length works offline but not online, since the output length is unknown before generation and reordering starves long requests. More cache raises the ceiling on rows without changing the fraction of them that is padding." },

      { stem: "A service shows good median latency, a terrible p99, and 40% device utilisation. Which explanation fits best?",
        options: [
          "The batch size is too small, so the device is starved",
          "Long prefills are serialised against decode, stalling every active stream while they run",
          "Quantization has degraded the model, so requests retry",
          "The model is too large for the device and is swapping weights"
        ],
        answer: 1,
        why: "Idle capacity alongside a bad tail points at scheduling rather than at capacity. A 512-token prefill measured 1,315 ms against a 39 ms decode step — 33.9 steps during which no other stream receives a token, which lands in the tail latency of the requests that were already running rather than in the one that caused it. Chunked prefill is the targeted fix. A starved device would show a poor median too, and weight swapping would hurt every request uniformly." },

      { stem: "Why does vLLM expose a cap on batched tokens as well as a cap on the number of sequences?",
        options: [
          "One limits prefill and the other limits decode",
          "Because step time tracks total tokens in the batch, while the row count is a separate safety ceiling",
          "The sequence cap applies to streaming requests and the token budget to non-streaming ones",
          "They are aliases kept for backward compatibility"
        ],
        answer: 1,
        why: "What determines the cost of a step is how many tokens are in flight, not how many requests they belong to: 8 rows of 8,000 tokens is a far heavier step than 64 rows of 128, so a row cap alone cannot hold a latency budget. The token budget binds the actual cost and the row cap stops pathological fan-out. Both apply to prefill and decode, and both apply whatever the response mode." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Batching is the question where candidates recite \"continuous batching is better\" without being able to say what it changes",
    questions: [
      { level: "core",
        q: "Why is batching so effective for LLM inference?",
        strong: "A strong answer derives it from the memory-bound character of decode and names the price paid in latency.",
        answer: [
          { t: "p", text: "Because a decode step's cost is loading the weights, and that load is shared. Producing one token requires reading every parameter, so a step for 32 requests reads the same bytes as a step for one and yields 32 tokens. I measured 6.4× the step time for 32× the output — 5.22× the throughput — on a CPU, and the factor is better on a GPU where the arithmetic units have more headroom." },
          { t: "p", text: "The price is per-request latency. A request inside a batch of 32 sees a 6.4× slower step on that hardware, so its tokens arrive 6.4× further apart. Throughput and TPOT move in opposite directions, and which one you are allowed to spend is a product decision rather than an infrastructure one." },
          { t: "p", text: "The thing I would add is that it is the *scheduler*, not the batch size, that determines whether you actually get the win. A static batch on chat traffic wasted 68.2% of its slots on padding in my measurement — the batch was large, and most of it was producing nothing." }
        ] },

      { level: "advanced",
        q: "Explain continuous batching to someone who already knows what a batch is.",
        strong: "A strong answer frames it as per-iteration membership and quantifies both effects, not just throughput.",
        answer: [
          { t: "p", text: "It decides which requests are in the batch before every decode step instead of once per batch. Nothing about the step itself changes — same kernels, same arithmetic. What changes is that a request which finished at step 40 leaves at step 40 instead of holding a slot until the longest member of its batch is done, and a request that arrives at step 41 starts at step 41." },
          { t: "p", text: "The effect people quote is throughput, and it is real: 2.03× on a 40-request stream I simulated. But the larger effect is latency — 4.87× on the mean, and 20.6 s to 7.7 s on the p95. The two differ because throughput can only recover the padding, which caps it, while latency is freed from the length lottery, which has no cap: a short request that was stuck behind a 240-token one stops waiting at all." },
          { t: "p", text: "And it needs no knowledge of output length, which is what makes it the online answer. Sorting by length achieves similar occupancy offline and is unusable online, because you cannot know the length in advance and reordering starves the long requests." }
        ] },

      { level: "advanced",
        q: "What is chunked prefill, and when would you turn it off?",
        strong: "A strong answer names the metric it protects and the one it spends, and has a case for disabling it.",
        answer: [
          { t: "p", text: "A long prompt's prefill is serialised against the decode steps of everything already running — I measured a 512-token prefill at 1,315 ms against a 39 ms decode step, so 33.9 steps during which no active stream receives a token. Chunked prefill splits the prompt into pieces and runs decode steps between them, so the ongoing streams keep flowing." },
          { t: "p", text: "It protects TPOT and spends TTFT: the arriving request's first token comes slightly later because its prefill is interleaved rather than run flat out. On a service with many concurrent streams that is clearly right — one request's TTFT against every other request's smoothness." },
          { t: "p", text: "I would turn it off when concurrency is low and TTFT is the headline metric. A single-user deployment, a batch job, or a latency-sensitive endpoint with one request in flight has nobody to protect, so chunking only adds overhead. Also on very short prompts, where the prefill is already comparable to a decode step and there is nothing worth breaking up." },
          { t: "p", text: "One honest caveat: I tried to measure the overhead chunking adds and could not. My unchunked baseline drifted 14% between runs inside one process, which is larger than the effect, so the chunked version came out apparently faster — 0.87×. The blocking ratio survives that noise by an order of magnitude; the overhead figure does not, and I would not quote a number for it that I had not measured on the target hardware." }
        ] }
    ]
  }
});
