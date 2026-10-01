EC.receiveLesson({
  id: "3.8",

  lede: "A 70B model at fp16 is 140 GB and does not fit on an 80 GB device (3.2 found this the hard way), so it has to be split. There are three ways to split it and they have different communication costs. The received wisdom is that tensor parallelism needs a high-bandwidth interconnect — and the arithmetic says that is the wrong half of the story for decode. A 70B at TP=8 moves **4.59 MB per token**, which NVLink crosses in 0.005 ms, while the **160 synchronisation points** cost 1.28 ms. **Latency is 251× the bandwidth term.** What tensor parallelism needs during decode is a *low-latency* interconnect; bandwidth is what it needs during prefill, and the crossover is around 250 tokens.",

  objectives: [
    "Distinguish tensor, pipeline and expert parallelism by what each one splits",
    "Compute the bytes a tensor-parallel layer puts on the wire per token",
    "Explain why the latency term dominates during decode and the bandwidth term during prefill",
    "Compute a pipeline bubble and say why pipeline parallelism suits training more than decode",
    "Choose a parallelism strategy from the model size and the interconnect you have"
  ],

  prerequisites: ["3.1", "3.2"],

  blocks: [

    { t: "h2", n: "01", id: "three", text: "Three ways to cut a model",
      sub: "Across the layer, along the stack, or by expert" },

    { t: "dl", items: [
      { k: "Tensor parallelism (TP)", v: "Split each layer across devices — half the attention heads and half the feed-forward width on each. Every device works on every layer, so they must exchange partial results twice per layer: once after attention, once after the FFN. Low latency per token, high synchronisation frequency." },
      { k: "Pipeline parallelism (PP)", v: "Split the stack — layers 0–39 on one device, 40–79 on the next. A token flows through them in sequence. Communication is only the activations at each boundary, which is tiny, but the devices wait for each other unless there is enough work in flight to fill the pipeline." },
      { k: "Expert parallelism (EP)", v: "Only for mixture-of-experts models: put different experts on different devices and route each token to whichever device holds its chosen experts. Per-device compute falls because each token activates a few experts, but routing is a dynamic all-to-all and the load across devices is not balanced by construction." }
    ] },

    { t: "viz", title: "The same two layers, split three ways", caption: "TP splits each layer and synchronises twice per layer. PP splits the stack and synchronises once per boundary. EP splits the experts and routes dynamically.",
      svg: `<svg viewBox="0 0 760 300" width="100%" role="img" aria-label="Tensor, pipeline and expert parallelism">
  <text x="16" y="20" class="s-label" style="fill:var(--accent)">TENSOR — every device holds a slice of every layer</text>
  <rect x="16" y="30" width="150" height="26" rx="4" class="s-fill" style="stroke:var(--accent)" stroke-width="1.2"/>
  <text x="91" y="47" text-anchor="middle" class="s-sub">GPU 0 · heads 0–15</text>
  <rect x="172" y="30" width="150" height="26" rx="4" class="s-fill" style="stroke:var(--accent)" stroke-width="1.2"/>
  <text x="247" y="47" text-anchor="middle" class="s-sub">GPU 1 · heads 16–31</text>
  <text x="336" y="47" class="s-mono" style="fill:var(--crit)">all-reduce</text>
  <rect x="16" y="62" width="150" height="26" rx="4" class="s-fill" style="stroke:var(--accent)" stroke-width="1.2"/>
  <text x="91" y="79" text-anchor="middle" class="s-sub">GPU 0 · FFN half</text>
  <rect x="172" y="62" width="150" height="26" rx="4" class="s-fill" style="stroke:var(--accent)" stroke-width="1.2"/>
  <text x="247" y="79" text-anchor="middle" class="s-sub">GPU 1 · FFN half</text>
  <text x="336" y="79" class="s-mono" style="fill:var(--crit)">all-reduce</text>
  <text x="430" y="63" class="s-sub">2 collectives × 80 layers</text>
  <text x="430" y="79" class="s-sub">= 160 sync points per token</text>

  <text x="16" y="124" class="s-label" style="fill:var(--violet)">PIPELINE — each device holds whole layers</text>
  <rect x="16" y="134" width="150" height="40" rx="4" class="s-fill-2" style="stroke:var(--violet)" stroke-width="1.2"/>
  <text x="91" y="151" text-anchor="middle" class="s-sub">GPU 0</text>
  <text x="91" y="167" text-anchor="middle" class="s-sub">layers 0–39</text>
  <text x="178" y="158" class="s-mono" style="fill:var(--good)">→ send</text>
  <rect x="236" y="134" width="150" height="40" rx="4" class="s-fill-2" style="stroke:var(--violet)" stroke-width="1.2"/>
  <text x="311" y="151" text-anchor="middle" class="s-sub">GPU 1</text>
  <text x="311" y="167" text-anchor="middle" class="s-sub">layers 40–79</text>
  <text x="400" y="151" class="s-sub">1 send per boundary — tiny</text>
  <text x="400" y="167" class="s-sub">but GPU 0 idles while GPU 1 works</text>

  <text x="16" y="212" class="s-label" style="fill:var(--good)">EXPERT — devices hold different experts, tokens are routed</text>
  <rect x="16" y="222" width="110" height="26" rx="4" class="s-fill" style="stroke:var(--good)" stroke-width="1.2"/>
  <text x="71" y="239" text-anchor="middle" class="s-sub">experts 0–3</text>
  <rect x="132" y="222" width="110" height="26" rx="4" class="s-fill" style="stroke:var(--good)" stroke-width="1.2"/>
  <text x="187" y="239" text-anchor="middle" class="s-sub">experts 4–7</text>
  <text x="256" y="239" class="s-mono" style="fill:var(--warn)">all-to-all route</text>
  <text x="400" y="232" class="s-sub">compute per device falls…</text>
  <text x="400" y="248" class="s-sub">…but the load is not balanced</text>

  <text x="16" y="286" class="s-mono" style="fill:var(--warn)">TP within a node, PP across nodes — because TP's 160 sync points per token need microseconds, not milliseconds</text>
</svg>` },

    { t: "h2", n: "02", id: "tpwire", text: "What tensor parallelism puts on the wire",
      sub: "2.62 MB per token, which is almost nothing" },

    { t: "p", text: "After the attention block each device holds a partial sum over its own heads, and the layer's output is the sum across devices — so they all-reduce a vector of `hidden_size` per token. The same happens after the feed-forward block. On Llama-2 70B that is hidden 8192, fp16, 80 layers:" },

    { t: "code", lang: "python", title: "g38_run.py — bytes per token under TP", code: `H_DIM, LAYERS, BYTES = 8192, 80, 2            # Llama-2 70B, fp16
per_tok = 2 * LAYERS * H_DIM * BYTES          # 2 all-reduces per layer

for name, gbs in (("NVLink 4", 900), ("PCIe 5 x16", 64), ("100 GbE", 12.5)):
    ms = per_tok / (gbs * 1e9) * 1000
    print(name, ms, 1000 / ms)                # ms per token, tok/s ceiling

for N in (2, 4, 8):                           # ring all-reduce moves 2(N-1)/N
    print(N, per_tok * 2 * (N - 1) / N / 1e6)`,
      out: `  Llama-2 70B: hidden 8192, 80 layers, fp16
  TP does 2 all-reduces per layer (after attention, after the FFN)
  per token: 2 x 80 x 8192 x 2 bytes = 2.62 MB

  interconnect                   GB/s   ms per token  tok/s ceiling
  NVLink 4 (900 GB/s)           900.0         0.0029         343323
  NVLink 3 (600 GB/s)           600.0         0.0044         228882
  PCIe 5 x16 (64 GB/s)           64.0         0.0410          24414
  PCIe 4 x16 (32 GB/s)           32.0         0.0819          12207
  100 GbE (12.5 GB/s)            12.5         0.2097           4768

  a ring all-reduce moves 2(N-1)/N of the payload, so:
    TP=2 ring factor 1.00x -> 2.62 MB per token on the wire
    TP=4 ring factor 1.50x -> 3.93 MB per token on the wire
    TP=8 ring factor 1.75x -> 4.59 MB per token on the wire`,
      caption: "On bandwidth alone even 100 GbE would support 4,768 tokens per second of communication. Bandwidth is not what stops you." },

    { t: "callout", kind: "trap", title: "\"Tensor parallelism needs NVLink\" is true for the wrong reason",
      body: [
        { t: "p", text: "The usual explanation is bandwidth, and the bandwidth figure is trivially small: **0.0029 ms per token on NVLink 4**, or 343,000 tokens per second of headroom. No real deployment is anywhere near that." },
        { t: "p", text: "What costs is that there are **160 collectives per token**, and each one is a synchronisation: every device stops, exchanges, and waits for the slowest. That fixed per-collective cost is a few microseconds on NVLink and tens of microseconds over PCIe or Ethernet — and multiplied by 160, it becomes milliseconds." },
        { t: "p", text: "So the requirement is **low latency**, which NVLink also happens to provide. The distinction matters the moment you consider a cheaper high-bandwidth option: a link with great throughput and poor round-trip latency will serve prefill well and decode badly." }
      ] },

    { t: "h3", text: "A real measurement of the two terms" },

    { t: "p", text: "I wanted to measure a collective rather than reason about it. `torch.distributed` with the gloo backend refused to initialise on this Windows build — `makeDeviceForHostname(): unsupported gloo device` — so there is no NCCL or gloo number in this lesson. What I could do is measure an actual exchange between two processes over loopback TCP, which is not NVLink but does have the same two terms, and shows their shape." },

    { t: "code", lang: "python", title: "g38_sock.py — round trip between two processes against message size", code: `def once():
    conn.sendall(struct.pack("!q", n) + payload)       # send n bytes
    hdr = b""
    while len(hdr) < 8: hdr += conn.recv(8 - len(hdr))
    need = struct.unpack("!q", hdr)[0]
    got = 0
    while got < need:
        got += len(conn.recv(min(1 << 20, need - got)))  # read the echo back

for _ in range(5): once()                              # warm
ts = [timed(once) for _ in range(21)]`,
      out: `  round trip between two processes, loopback TCP (median of 21)
  bytes         round trip ms   GB/s effective   vs 64-byte RTT
  64                   0.0918            0.001            1.00x
  1024                 0.0496            0.041            0.54x
  16384                0.0607            0.540            0.66x
  262144               0.5324            0.985            5.80x
  1048576              3.0872            0.679           33.63x
  4194304             13.4618            0.623          146.64x
  16777216            76.8595            0.437          837.25x

  per-MB slope: 4.5757 ms/MB
  crossover: a message is latency-dominated below about 20062 bytes here`,
      caption: "A 1 KB exchange costs 0.0496 ms and a 16 KB one 0.0607 ms — essentially the same. Below ~20 KB you are paying latency, not bandwidth." },

    { t: "callout", kind: "note", title: "Two honest notes on that table",
      body: [
        { t: "p", text: "The 64-byte row (0.0918 ms) is **slower than the 1 KB row** (0.0496 ms), which cannot be real — a smaller message cannot cost more. It is the first size measured and it carries residual warm-up despite five warm-up iterations. The floor is better estimated from the 1 KB and 16 KB rows, at roughly 0.05 ms." },
        { t: "p", text: "And loopback TCP is not an interconnect. Its ~50 µs floor is an order of magnitude worse than NVLink's few microseconds, and its 0.6–1.0 GB/s is two orders below. The transferable content is the *shape*: a fixed cost per exchange plus a per-byte cost, with a crossover between them. The GPU numbers in this lesson are arithmetic from published bandwidths, and I am labelling them as such." }
      ] },

    { t: "h2", n: "03", id: "decode", text: "Why the latency term owns decode",
      sub: "The payload scales with tokens in the batch; the synchronisation count does not" },

    { t: "p", text: "The all-reduce payload is `hidden_size` per *token*. During decode there is one token per request, so the message is a few kilobytes — firmly in the latency-dominated regime found above. During prefill there are hundreds or thousands of tokens at once, so the message is megabytes and bandwidth starts to matter." },

    { t: "math", tex: "t_{\\text{comm}} \\;=\\; \\underbrace{160 \\cdot \\ell}_{\\text{fixed, per token}} \\;+\\; \\underbrace{160 \\cdot \\frac{n \\cdot h \\cdot 2 \\cdot \\frac{2(N-1)}{N}}{B}}_{\\text{scales with } n \\text{ tokens}}" },

    { t: "table",
      head: ["Phase", "Tokens per collective", "Message size", "Dominant term"],
      rows: [
        ["Decode, batch 1", "1", "16 KB at hidden 8192", "**Latency** — 251× the bandwidth term on NVLink 4"],
        ["Decode, batch 32", "32", "512 KB", "Still latency, by about 8×"],
        ["Prefill, 256 tokens", "256", "4 MB", "Roughly balanced — the crossover"],
        ["Prefill, 2048 tokens", "2048", "32 MB", "**Bandwidth** — 8× the latency term"],
        ["Training, large batch", "Tens of thousands", "Hundreds of MB", "**Bandwidth**, overwhelmingly"]
      ] },

    { t: "callout", kind: "insight", title: "This is why the interconnect advice differs by workload",
      body: [
        { t: "p", text: "A training cluster is bandwidth-bound on its collectives, which is why training guidance is about aggregate interconnect throughput. A decode-heavy serving deployment is latency-bound on the *same collectives* — identical code, opposite constraint." },
        { t: "p", text: "The practical form of this: **TP within a node, PP across nodes**. Inside a node you have NVLink's microseconds, which 160 collectives per token can afford. Between nodes you have tens to hundreds of microseconds, which they cannot — but pipeline parallelism only synchronises once per stage boundary, so it survives the slower link." }
      ] },

    { t: "h2", n: "04", id: "bubble", text: "Pipeline parallelism and the bubble",
      sub: "Cheap communication, expensive idleness" },

    { t: "p", text: "A pipeline with P stages needs P steps to fill and P−1 to drain. With M units of work in flight the fraction of device-time spent idle is `(P−1)/(M+P−1)`. In training M is the number of micro-batches and can be large, so the bubble is small. In decode there is **one token in flight per step**, so M = 1." },

    { t: "code", lang: "python", title: "g38_run.py — the bubble fraction", code: `# bubble = (P - 1) / (M + P - 1), P stages, M micro-batches
for Pn in (2, 4, 8, 16):
    print(Pn, [100 * (Pn - 1) / (M + Pn - 1) for M in (1, 4, 16, 64)])`,
      out: `  bubble fraction = (P - 1) / (M + P - 1), P stages, M micro-batches
  stages          M=1        M=4       M=16       M=64
  2             50.0%      20.0%       5.9%       1.5%
  4             75.0%      42.9%      15.8%       4.5%
  8             87.5%      63.6%      30.4%       9.9%
  16            93.8%      78.9%      48.4%      19.0%

  decode has M = 1 per step: one token in flight. So PP's bubble during
  decode is (P-1)/P -- 50% at 2 stages, 87.5% at 8.`,
      hl: [2],
      caption: "The M=1 column is the decode case: at 8 stages, 87.5% of the devices are idle at any instant." },

    { t: "callout", kind: "tradeoff", title: "Pipeline parallelism is a capacity technique, not a speed technique",
      body: [
        { t: "p", text: "At 8 stages and one token in flight, **87.5% of your devices are idle**. The reason to use PP anyway is that it is the only way to hold a model that does not fit in one node, and holding it badly beats not holding it." },
        { t: "p", text: "The fix is to put more work in flight — which for serving means *more concurrent requests*, each contributing its own token. At M=16 the 8-stage bubble falls from 87.5% to 30.4%. So PP and high concurrency go together: a pipeline-parallel deployment serving one user at a time is wasting almost all of its hardware, and the same deployment at batch 32 is reasonable." },
        { t: "p", text: "That is the opposite of speculative decoding (3.6), which works best at low batch. Neither is universally right; they are tools for different points on the concurrency axis." }
      ] },

    { t: "h2", n: "05", id: "moe", text: "Expert parallelism and the balance problem",
      sub: "Routing is dynamic, so the load is not yours to choose" },

    { t: "p", text: "A mixture-of-experts layer has, say, 8 experts and activates 2 per token. Compute per token falls by 4× relative to a dense layer of the same total width — that is the point of the architecture. Put the experts on different devices and each device holds a quarter of the weights." },

    { t: "p", text: "What this introduces is an **all-to-all**: every token has to reach the devices holding its chosen experts, and the results have to come back. Unlike TP's all-reduce, the volume is not fixed in advance — it depends on how the router assigned this particular batch." },

    { t: "ul", items: [
      "**Load imbalance.** If a disproportionate share of a batch routes to expert 3, that device becomes the critical path and the others wait. Training uses an auxiliary loss to encourage balance; at inference the router is fixed and the imbalance is whatever your traffic produces.",
      "**Capacity factor.** Implementations cap how many tokens one expert may accept per batch. Beyond the cap tokens are *dropped* — passed through unchanged — which is a silent quality loss that shows up as occasional nonsense rather than an error.",
      "**Two collectives instead of one.** Dispatch and combine, both all-to-all, both with volume set by the routing. That is harder to overlap with compute than a predictable all-reduce.",
      "**It composes with TP.** Large MoE deployments shard each expert across devices as well as placing experts on different devices, so both communication patterns are live at once."
    ] },

    { t: "exercise", kind: "analysis", title: "Find where tensor parallelism stops paying", difficulty: "advanced", minutes: 30,
      body: "Build a per-token decode cost model for a 70B at fp16 under tensor parallelism. Account for the weight loading each device does (its shard, against HBM bandwidth), the all-reduce bandwidth term, and the all-reduce latency term — 160 collectives per token. Then show how the communication share grows with TP degree on a fast interconnect and a slow one, and find the point during prefill where bandwidth overtakes latency.",
      requirements: [
        "Weight loading per device: 140 GB divided by the TP degree, against 2,000 GB/s of HBM",
        "Bandwidth term: 160 collectives × hidden 8192 × 2 bytes × the ring factor 2(N−1)/N",
        "Latency term: 160 collectives × a per-collective latency of 8 µs (NVLink 4) to 50 µs (100 GbE)",
        "Report the communication share and the speedup against TP=1 for TP up to 32",
        "Then scale the payload by the number of tokens in the collective and find the prefill crossover"
      ],
      hint: "The latency term does not depend on the TP degree at all — it depends only on the number of collectives, which is set by the layer count. That is why its share grows as you add devices.",
      solution: { lang: "python", title: "g38_ex.py — the TP decode cost model", code: `H_DIM, LAYERS, BYTES = 8192, 80, 2        # Llama-2 70B, fp16
WEIGHTS_GB = 140.0                        # 70B at fp16
COLLECTIVES = 2 * LAYERS                  # one after attention, one after the FFN
MEM_BW = 2000.0                           # HBM per GPU, GB/s

def decode_ms(N, bw_gbs, lat_us, mem_bw_gbs):
    compute   = (WEIGHTS_GB / N) / mem_bw_gbs * 1000        # each GPU loads its shard
    payload   = H_DIM * BYTES * (2 * (N - 1) / N)           # ring all-reduce bytes
    bandwidth = COLLECTIVES * payload / (bw_gbs * 1e9) * 1000
    latency   = COLLECTIVES * lat_us / 1000.0               # fixed cost per collective
    return compute, bandwidth, latency

base = WEIGHTS_GB / MEM_BW * 1000
for label, bw, lat in (("NVLink 4", 900.0, 8.0), ("PCIe 4", 32.0, 30.0)):
    print("  %s" % label)
    for N in (2, 4, 8, 16, 32):
        c, b, l = decode_ms(N, bw, lat, MEM_BW)
        comm = b + l
        print("  %-6d %12.2f %12.3f %11.1f%% %13.2fx"
              % (N, c, comm, 100 * comm / (c + comm), base / (c + comm)))

# and the prefill crossover: payload scales with tokens, latency does not
for n in (1, 8, 128, 512, 2048, 8192):
    c, b, l = decode_ms(8, 900.0, 8.0, MEM_BW)
    print(n, b * n, l, "bandwidth" if b * n > l else "latency")`,
        out: `  which term dominates, as TP grows (NVLink 4):
  TP       weights ms      comm ms   comm share speedup vs TP=1
  2             35.00        1.283         3.5%          1.93x
  4             17.50        1.284         6.8%          3.73x
  8              8.75        1.285        12.8%          6.98x
  16             4.38        1.285        22.7%         12.37x
  32             2.19        1.286        37.0%         20.15x

  and on PCIe 4, where the per-collective latency is 30 us:
  TP       weights ms      comm ms   comm share speedup vs TP=1
  2             35.00        4.882        12.2%          1.76x
  4             17.50        4.923        22.0%          3.12x
  8              8.75        4.943        36.1%          5.11x
  16             4.38        4.954        53.1%          7.50x
  32             2.19        4.959        69.4%          9.80x

  bandwidth vs latency, per token, at TP=8:
    NVLink 4     bandwidth  0.0051 ms, latency  1.280 ms -> latency is 251.1x the bandwidth term
    NVLink 3     bandwidth  0.0076 ms, latency  1.600 ms -> latency is 209.3x the bandwidth term
    PCIe 5 x16   bandwidth  0.0717 ms, latency  4.000 ms -> latency is  55.8x the bandwidth term
    PCIe 4 x16   bandwidth  0.1434 ms, latency  4.800 ms -> latency is  33.5x the bandwidth term
    100 GbE      bandwidth  0.3670 ms, latency  8.000 ms -> latency is  21.8x the bandwidth term

  the same collectives during PREFILL, where payload scales with tokens:
  tokens       bandwidth ms     latency ms  which dominates
  1                   0.005          1.280          latency
  8                   0.041          1.280          latency
  128                 0.652          1.280          latency
  512                 2.610          1.280        bandwidth
  2048              10.439          1.280        bandwidth
  8192              41.757          1.280        bandwidth`,
        notes: [
          { t: "p", text: "**The communication column barely changes with TP degree** — 1.283 ms at TP=2 and 1.286 ms at TP=32 — because it is almost entirely the latency term, and the latency term depends on the collective *count*, which is set by the 80 layers, not by how many devices share them. The weight-loading column halves each time. So the communication *share* rises from 3.5% to 37% while the absolute cost stands still." },
          { t: "p", text: "**Latency is 251× the bandwidth term at TP=8 on NVLink 4.** That is the number that reframes the usual advice. Even on 100 GbE — 72× less bandwidth than NVLink — latency is still 21.8× the bandwidth term. There is no decode regime in this table where bandwidth is the binding constraint." },
          { t: "p", text: "The two interconnects give **6.98× against 5.11× at TP=8** — PCIe 4 loses about a quarter of the available speedup, not all of it. So TP over PCIe is bad rather than impossible, and the penalty grows with TP degree: at TP=32 it is 20.15× against 9.80×, a factor of two." },
          { t: "p", text: "**The prefill crossover is between 128 and 512 tokens**, around 250. Above it the same collectives are bandwidth-bound. That single fact explains why training guidance (huge batches) and serving guidance (one token per request) give opposite advice about interconnects, and why a deployment can be fine on TTFT and poor on TPOT purely because of its network." },
          { t: "p", text: "Two caveats. The 8 µs per-collective latency is a plausible published figure, not something I measured — gloo would not initialise on this platform, so there is no NCCL number here. And the model ignores overlap: real implementations hide some communication behind compute, which reduces the communication share without changing which term dominates." }
        ] } },

    { t: "ladder", title: "Choosing a parallelism strategy for a 70B", rungs: [
      { level: "bad", label: "Pipeline parallelism across 2 nodes because the model does not fit", why: "It fits, and it works, and at low concurrency most of the hardware is idle — 50% at two stages with one token in flight. The throughput number then gets attributed to the model size.",
        code: `pipeline_parallel_size = 2     # 2 nodes, 1 GPU each used at a time`,
        note: "This is the configuration that produces \"a 70B just is slow\". It is the schedule that is slow." },
      { level: "ok", label: "Tensor parallelism across 4 GPUs in one node", why: "140 GB of weights across 4×80 GB fits with room for KV cache, all collectives stay on NVLink, and the measured communication share is 6.8%. The standard answer, and right most of the time.",
        code: `tensor_parallel_size = 4       # within one NVLink domain` },
      { level: "best", label: "TP within the node, PP across nodes, sized to the concurrency", why: "Use TP where latency is cheap and PP where it is not, then make sure concurrency is high enough to fill the pipeline — the bubble falls from 87.5% to 30.4% between M=1 and M=16.",
        code: `tensor_parallel_size   = 8     # inside each node, over NVLink
pipeline_parallel_size = 2     # between nodes, 1 sync per boundary
max_num_seqs           = 32    # enough in flight to fill the pipeline`,
        note: "The third line is the one people omit, and it is what turns a correct topology into a fast one." }
    ] },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Tensor parallelism is a committee that votes 160 times per token: the votes are tiny, but every member must attend every one. Pipeline parallelism is an assembly line: almost no communication, and everyone upstream waits unless you keep feeding it. Expert parallelism is a mail room: cheap per item, and the queue length depends on who happens to be popular today." },
        { t: "p", text: "So TP needs a short walk to the meeting room — latency. PP needs a full conveyor — concurrency. EP needs the mail to be evenly addressed — balance." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\"We moved our 70B from TP=8 on one node to TP=4 plus PP=2 across two nodes, expecting more headroom. TTFT improved slightly. TPOT got 40% worse. Why?\"**" },
        { t: "p", text: "Two things changed at once and they pull in opposite directions, which is why only one metric moved the expected way." },
        { t: "p", text: "TTFT improved because prefill is bandwidth-bound on these collectives — the crossover is around 250 tokens, so a real prompt is well past it — and halving the TP degree halves the ring factor's reach while the extra node adds compute. Prefill also fills a pipeline naturally, because a prompt has hundreds of tokens in flight, so PP's bubble is small during prefill." },
        { t: "p", text: "TPOT got worse because decode is the opposite case on both counts. It is latency-bound — 160 collectives per token, and latency is 251× the bandwidth term on NVLink — so nothing about the extra bandwidth helps. And decode has one token in flight per request, so the pipeline bubble is `(P−1)/P` = 50% at two stages unless concurrency is high enough to fill it. If they are running at modest batch size, half the pipeline is idle at every step." },
        { t: "p", text: "What I would check to confirm: TPOT against batch size. If the regression vanishes at high concurrency, it is the pipeline bubble and the fix is admission policy rather than topology. If it persists at every batch size, the cross-node hop is in the critical path of the decode collectives — which would mean the TP group is accidentally spanning nodes, and the fix is to pin TP inside a node." },
        { t: "p", text: "The thing I would say about the original decision: TP=8 on one node was already the right answer for a decode-heavy service. The second node adds capacity for concurrent requests, not speed for individual ones, and that distinction is exactly what the two metrics just told them." }
      ] }
  ],

  takeaways: [
    "**TP splits every layer, PP splits the stack, EP splits the experts.** The difference that matters operationally is how often they synchronise.",
    "**TP on a 70B puts 2.62 MB per token on the wire** — 4.59 MB at TP=8 after the ring factor — which even 100 GbE could carry at 4,768 tokens per second.",
    "**But it synchronises 160 times per token**, and that fixed cost is what binds: latency is 251× the bandwidth term at TP=8 on NVLink 4.",
    "**So \"TP needs NVLink\" is about latency, not bandwidth.** A high-bandwidth, high-latency link serves prefill well and decode badly.",
    "**The communication cost barely changes with TP degree** (1.283 ms at TP=2, 1.286 ms at TP=32) because the collective count is set by the layer count — so its *share* rises from 3.5% to 37%.",
    "**Prefill crosses over to bandwidth-bound around 250 tokens**, which is why training and serving give opposite interconnect advice about identical collectives.",
    "**A pipeline bubble is `(P−1)/(M+P−1)`**, and decode has M=1 — so 87.5% of an 8-stage pipeline is idle at any instant unless concurrency fills it.",
    "**PP is a capacity technique, not a speed technique.** It holds a model that will not fit; raising concurrency is what makes it efficient (87.5% → 30.4% from M=1 to M=16).",
    "**TP within a node, PP across nodes** follows directly: NVLink's microseconds can afford 160 collectives per token, an inter-node hop cannot.",
    "**MoE routing is dynamic, so expert load is not yours to choose** — imbalance makes one device the critical path, and the capacity factor silently drops tokens past the cap."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A 70B under TP=8 moves 4.59 MB per token, which NVLink 4 carries in 0.005 ms. Why does tensor parallelism still require a fast interconnect?",
        options: [
          "Because the figure understates the real volume by about two orders of magnitude",
          "Because the 160 collectives per token each pay a fixed synchronisation cost, totalling 1.28 ms",
          "Because the KV cache also has to be replicated across the devices",
          "Because gradient synchronisation happens on every forward pass"
        ],
        answer: 1,
        why: "The bandwidth term is genuinely tiny — the constraint is the count of synchronisation points. Two all-reduces per layer across 80 layers is 160 per token, and at ~8 µs each that is 1.28 ms, which is 251× the bandwidth term. The requirement is therefore low latency rather than high throughput. The KV cache is sharded along with the heads rather than replicated, and there are no gradients at inference." },

      { stem: "A pipeline-parallel deployment with 8 stages serves one user at a time. What fraction of the devices is idle at any instant?",
        options: [
          "About 12.5%, since one stage of eight is working",
          "About 87.5%, since seven stages of eight are waiting",
          "None — the stages overlap automatically",
          "It depends on the interconnect latency"
        ],
        answer: 1,
        why: "The bubble fraction is (P−1)/(M+P−1), and decode has one token in flight per step, so M=1 and the bubble is (P−1)/P = 7/8. This is why pipeline parallelism is a capacity technique rather than a speed one: it lets you hold a model that does not fit, and raising concurrency is what makes it efficient — at M=16 the same 8-stage pipeline drops to 30.4% idle. Interconnect latency affects PP very little, since it synchronises once per boundary rather than 160 times per token." },

      { stem: "Why do training guidance and serving guidance give opposite advice about interconnects, for the same all-reduce operations?",
        options: [
          "Training uses a different collective algorithm than inference",
          "The payload scales with tokens per collective, so training's large batches are bandwidth-bound while decode's single tokens are latency-bound",
          "Training runs in fp32 and inference in fp16",
          "Inference overlaps communication with compute and training does not"
        ],
        answer: 1,
        why: "The message size is hidden_size per token, so the bandwidth term scales with how many tokens are in the collective while the latency term does not. Measured by the model: the crossover is around 250 tokens — below it latency dominates, above it bandwidth does. Training batches are tens of thousands of tokens, decode is one per request, and the same code therefore has opposite constraints. Precision changes the payload by a factor of two, nowhere near enough to explain the reversal." },

      { stem: "What silently degrades quality in an expert-parallel MoE deployment?",
        options: [
          "The all-to-all collective reorders tokens",
          "Tokens beyond an expert's capacity factor are dropped and passed through unchanged",
          "Experts on different devices drift out of sync",
          "The router runs in lower precision than the experts"
        ],
        answer: 1,
        why: "Implementations cap how many tokens one expert accepts per batch so the all-to-all volume stays bounded. Tokens past the cap skip the expert entirely — no error is raised, and the symptom is occasional degraded output on batches with skewed routing, which is very hard to attribute. Routing is dynamic, so which batches hit the cap depends on traffic. The collective preserves token identity, and inference involves no weight updates for experts to drift with." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Distributed inference separates candidates who have read the diagram from those who have costed it",
    questions: [
      { level: "core",
        q: "How would you serve a 70B model, and why that way?",
        strong: "A strong answer starts from the memory arithmetic and then justifies the parallelism from the interconnect.",
        answer: [
          { t: "p", text: "First the arithmetic: 70B at fp16 is 140 GB of weights, so it does not fit on an 80 GB device, and the KV cache still needs room on top. That rules out a single GPU and makes it a parallelism question rather than a configuration one." },
          { t: "p", text: "Default answer: tensor parallelism across 4 or 8 GPUs inside one node. TP splits every layer, so each device loads only its shard per token, which is what decode is bound by — and all the collectives stay inside the NVLink domain. At TP=4 the communication share works out at about 7% of the per-token cost." },
          { t: "p", text: "If it has to span nodes, TP inside each node and pipeline parallelism between them, because TP synchronises 160 times per token on an 80-layer model and an inter-node hop cannot absorb that, while PP synchronises once per stage boundary. And then I would make sure concurrency is high enough to fill the pipeline — the bubble is 50% at two stages with one token in flight and falls to about 6% at 16 micro-batches." },
          { t: "p", text: "The cheaper alternative worth pricing first: quantize to int4, which puts the same model at 35 GB on one 80 GB device with room for cache. That removes the distributed problem entirely, at the quality cost 3.3 insists on measuring." }
        ] },

      { level: "advanced",
        q: "Why does tensor parallelism need a fast interconnect?",
        strong: "A strong answer corrects the bandwidth framing and gives the latency arithmetic.",
        answer: [
          { t: "p", text: "The usual answer is bandwidth, and the bandwidth figure is almost nothing: a 70B at TP=8 moves 4.59 MB per token, which NVLink 4 carries in 0.005 ms. Even 100 GbE would support nearly 5,000 tokens per second on volume alone." },
          { t: "p", text: "What actually costs is the number of synchronisation points. Two all-reduces per layer across 80 layers is 160 per token, each a point where every device stops and waits for the slowest. At a few microseconds each that is 1.28 ms per token — 251× the bandwidth term. So the requirement is low latency, which NVLink happens to provide alongside its bandwidth." },
          { t: "p", text: "The reason to be precise about this is that it changes a purchasing or topology decision. A link with excellent throughput and mediocre latency will give you good TTFT and poor TPOT, because prefill is bandwidth-bound — the crossover is around 250 tokens per collective — and decode is not." },
          { t: "p", text: "It also explains something counterintuitive in the arithmetic: the absolute communication cost barely changes as you add TP degree, 1.283 ms at TP=2 against 1.286 ms at TP=32, because the collective count is fixed by the layer count. The weight loading halves each time, so communication's *share* climbs from 3.5% to 37% — which is what eventually limits how far TP scales." }
        ] },

      { level: "advanced",
        q: "A team reports that moving from TP=8 in one node to TP=4 + PP=2 across two nodes improved TTFT but made TPOT 40% worse. Diagnose it.",
        strong: "A strong answer separates the prefill and decode cases and proposes a discriminating measurement.",
        answer: [
          { t: "p", text: "Those two metrics live on opposite sides of both changes, which is why only one moved as expected." },
          { t: "p", text: "TTFT improved because prefill has hundreds of tokens per collective, well past the ~250-token crossover where these all-reduces become bandwidth-bound, and because a long prompt fills a pipeline naturally — PP's bubble is small when there is plenty in flight." },
          { t: "p", text: "TPOT got worse for two independent reasons. Decode is latency-bound on the collectives, so the extra node's bandwidth buys nothing; and decode has one token in flight per request, so the pipeline bubble is (P−1)/P — 50% at two stages — unless concurrency is high. At modest batch size half the pipeline is idle every step." },
          { t: "p", text: "The discriminating measurement is TPOT against batch size. If the regression disappears at high concurrency, it is the bubble, and the fix is admission policy rather than topology. If it persists at every batch size, the cross-node hop is in the critical path of the decode collectives, which would mean a TP group has been placed spanning nodes — and the fix is to pin TP inside a node." },
          { t: "p", text: "I would also point out what the second node actually bought: capacity for more concurrent requests, not speed for individual ones. The two metrics they just measured are precisely the two sides of that distinction, so the configuration may be right and the expectation wrong." }
        ] }
    ]
  }
});
