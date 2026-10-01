EC.receiveLesson({
  id: "3.7",

  lede: "Nothing in this module is something you implement. PagedAttention, continuous batching, chunked prefill, speculative decoding and prefix caching all arrive as settings on a serving framework, and the engineering decision is which framework and which settings. This lesson is about making that choice from the properties that matter rather than from a feature matrix — and the properties that matter are **scheduling and memory**, because I measured the per-request Python overhead at **0.01% of request time**. The one feature with arithmetic worth doing is prefix caching: on a realistic agent prompt it removed **84.8%** of prefill tokens across eight requests, and **96.2%** across 128.",

  objectives: [
    "Name what each major serving framework is actually optimised for",
    "Compute the prefill saving from a shared prefix and say when it dominates",
    "Explain why per-request framework overhead is almost never the deciding factor",
    "Choose a framework from the deployment constraint rather than the benchmark",
    "Recognise a feature matrix as a dated document and know what to re-check"
  ],

  prerequisites: ["3.2", "3.5"],

  blocks: [

    { t: "h2", n: "01", id: "overhead", text: "First, a thing that is not the problem",
      sub: "Framework overhead per request, measured against model time" },

    { t: "p", text: "Framework comparisons often open with request-handling overhead — Python versus Rust, async versus threads. It is worth knowing how small that term is before weighing it, so I measured every non-model stage of a short request." },

    { t: "code", lang: "python", title: "g37.py — where the time goes on a 20-token answer", code: `tok_ms = med(lambda: tok(prompt, return_tensors="pt"))
pre_ms = med(lambda: m(ids), warm=1, reps=5)
dec_ms = med(step)                                 # one decode step, cached
det_ms = med(lambda: tok.decode(out_ids[0]))

total = tok_ms + pre_ms + 20 * dec_ms + det_ms
print("model     ", pre_ms + 20 * dec_ms, 100 * (pre_ms + 20 * dec_ms) / total)
print("tokenizer ", tok_ms + det_ms,      100 * (tok_ms + det_ms) / total)`,
      out: `  stage                         median ms
  tokenize prompt                   0.090
  prefill (9 tok)                  75.698
  one decode step                  42.334
  detokenize                        0.029

  a 20-token answer: 922.5 ms total, of which
    model work       922.4 ms  (99.99%)
    tokenizer work   0.118 ms  (0.01%)`,
      hl: [6, 7],
      caption: "Tokenization and detokenization together are 118 microseconds against 922 milliseconds of model work." },

    { t: "callout", kind: "insight", title: "A framework would have to be catastrophically slow for its overhead to register",
      body: [
        { t: "p", text: "At **0.01%** of request time, the non-model work could get 100× slower and still be under 1% of the request. HTTP parsing, validation and streaming add to this, but they are the same order of magnitude — hundreds of microseconds, not hundreds of milliseconds." },
        { t: "p", text: "So the argument between frameworks is not about request handling. It is about **how many requests fit in memory** and **which request runs next** — the KV cache management of 3.2 and the scheduling of 3.5. Those change throughput by factors, not by percentages." },
        { t: "p", text: "The exception is a service whose responses are a handful of tokens — a classifier, a router, a guard model. There the model work falls to tens of milliseconds and the fixed costs start to matter, which is why those services are usually not served by an LLM framework at all." }
      ] },

    { t: "h2", n: "02", id: "prefix", text: "Prefix caching, which is worth real arithmetic",
      sub: "The same 251 tokens prefilled once instead of 128 times" },

    { t: "p", text: "A production prompt is mostly constant. A system instruction, a few-shot block, a tool schema, a retrieved document — all identical across requests, with a short user turn at the end. Prefill is quadratic-ish in prompt length and the constant part dominates, so caching the KV of the shared prefix and reusing it is the single largest win available on agent and RAG traffic." },

    { t: "code", lang: "python", title: "g37.py — prefill avoided by a shared prefix", code: `shared = SYSTEM + FEWSHOT                       # the constant part of every prompt
n_shared = len(tok(shared).input_ids)

tot = sum(len(tok(shared + u).input_ids) for u in USERS)   # no sharing
uniq = sum(len(tok(u).input_ids) for u in USERS)
print(n_shared, tot, n_shared + uniq, 100 * (tot - n_shared - uniq) / tot)`,
      out: `  shared prefix (system + 2 few-shot): 251 tokens
  8 requests, prefill tokens with no sharing: 2082
  with the prefix cached once:              317
  prefill tokens avoided:                   1765  (84.8%)

  the same, as a function of how many requests share the prefix:
  requests       no sharing         shared      saved
  1                     259            259       0.0%
  2                     518            267      48.5%
  4                    1036            283      72.7%
  8                    2072            315      84.8%
  32                   8288            507      93.9%
  128                 33152           1275      96.2%`,
      hl: [4, 5],
      caption: "The saving is the ratio of shared to unique tokens, so it rises towards 100% as traffic volume grows and the prefix is amortised further." },

    { t: "callout", kind: "insight", title: "Prefix caching gets better with scale, which almost nothing else does",
      body: [
        { t: "p", text: "Most optimisations have a fixed ceiling — quantization halves bytes, GQA divides the cache by the group size. Prefix caching saves **48.5% at two requests and 96.2% at 128**, because the denominator keeps growing while the cached prefix is paid for once." },
        { t: "p", text: "It also compounds with context length rather than fighting it. A long system prompt is usually a liability; with prefix caching it is a liability you pay once per cache lifetime instead of per request." },
        { t: "p", text: "The practical consequence: **put the variable part last**. A prompt that interpolates the user's name into the system instruction, or puts a timestamp at the top, has no shared prefix at all and gets none of this. That is the most common way teams lose the feature without knowing they had it." }
      ] },

    { t: "viz", title: "Why prefix order decides whether caching works", caption: "The cache matches on an exact token prefix. One variable token at the front invalidates everything after it.",
      svg: `<svg viewBox="0 0 760 236" width="100%" role="img" aria-label="Prompt ordering and prefix cache hits">
  <text x="16" y="22" class="s-label" style="fill:var(--good)">CACHEABLE — constant first, variable last</text>
  <rect x="16" y="32" width="300" height="28" rx="4" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="166" y="51" text-anchor="middle" class="s-sub">system + few-shot + tool schema — 251 tokens</text>
  <rect x="318" y="32" width="110" height="28" rx="4" class="s-fill-2" style="stroke:var(--violet)" stroke-width="1.2"/>
  <text x="373" y="51" text-anchor="middle" class="s-sub">user turn</text>
  <text x="440" y="51" class="s-mono" style="fill:var(--good)">251 tokens hit the cache</text>

  <text x="16" y="100" class="s-label" style="fill:var(--crit)">NOT CACHEABLE — a timestamp at the top</text>
  <rect x="16" y="110" width="76" height="28" rx="4" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.4"/>
  <text x="54" y="129" text-anchor="middle" class="s-mono" style="fill:var(--crit)">14:02:17</text>
  <rect x="94" y="110" width="222" height="28" rx="4" class="s-fill-bg" style="stroke:var(--line)" stroke-width="1" stroke-dasharray="4 3"/>
  <text x="205" y="129" text-anchor="middle" class="s-sub">the same 251 tokens — now unreachable</text>
  <rect x="318" y="110" width="110" height="28" rx="4" class="s-fill-bg" style="stroke:var(--line)" stroke-width="1" stroke-dasharray="4 3"/>
  <text x="373" y="129" text-anchor="middle" class="s-sub">user turn</text>
  <text x="440" y="129" class="s-mono" style="fill:var(--crit)">0 tokens hit the cache</text>

  <line x1="16" y1="162" x2="744" y2="162" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="186" class="s-sub">measured: 8 requests sharing a 251-token prefix avoid 1,765 of 2,082 prefill tokens (84.8%)</text>
  <text x="16" y="208" class="s-sub">at 128 requests, 96.2% — the prefix is paid once and amortised over everything after it</text>
  <text x="16" y="230" class="s-mono" style="fill:var(--warn)">the cache matches a token prefix, so the first differing token ends the match</text>
</svg>` },

    { t: "p", text: "**SGLang's RadixAttention** generalises this from a single prefix to a tree. If one conversation forks into three branches, or an agent explores several tool-call continuations from the same state, a radix tree over the token sequences shares every common segment rather than only the leading one. That is why its advantage shows up on branching programs specifically and not on plain chat — on plain chat, ordinary prefix caching already gets the shared part." },

    { t: "h2", n: "03", id: "frameworks", text: "The frameworks, and what each is for",
      sub: "Pick from the constraint, not from the throughput chart" },

    { t: "dl", items: [
      { k: "vLLM", v: "The default for GPU serving. It originated PagedAttention (3.2) and continuous batching (3.5), has prefix caching, tensor parallelism and an OpenAI-compatible API, and supports the common quantization formats. Choose it unless you have a specific reason not to." },
      { k: "TGI (Hugging Face)", v: "Comparable capability, a Rust server, and tighter integration with the Hub and the Inference Endpoints product. The reason to pick it is usually operational — you are already in that ecosystem — rather than a performance argument." },
      { k: "TensorRT-LLM", v: "Highest throughput on NVIDIA hardware, obtained by compiling the model into an engine for a specific GPU, precision and batch shape. The cost is that the engine is a build artefact: changing model, GPU or max batch means rebuilding, which is a real constraint on a team that ships weekly." },
      { k: "SGLang", v: "Built for programs rather than requests — branching, loops, multi-turn structure — with RadixAttention sharing cache across forks. Its advantage is largest exactly where the request graph has shared structure." },
      { k: "llama.cpp", v: "C++ with no Python runtime, GGUF quantization, and genuinely good CPU and Apple-silicon performance. The reference implementation for running a model where there is no GPU." },
      { k: "Ollama", v: "A packaging layer over llama.cpp: model pulls, a local daemon, an OpenAI-compatible endpoint. It optimises developer experience rather than throughput, which makes it the right local-development tool and the wrong production server." }
    ] },

    { t: "table",
      head: ["Constraint", "Choose", "Why that one"],
      rows: [
        ["GPU, production, ships often", "vLLM", "Best capability-per-configuration-effort, and no build step between a new model and serving it"],
        ["GPU, fixed model, maximum throughput", "TensorRT-LLM", "Engine compilation buys the last 20–40%, and a fixed model makes the rebuild cost irrelevant"],
        ["Agent or multi-branch workloads", "SGLang", "RadixAttention shares cache across forks, which is where the prefill saving lives in those workloads"],
        ["No GPU at all", "llama.cpp", "The only one of these designed for CPU rather than tolerating it"],
        ["Laptop, development loop", "Ollama", "One command to a working endpoint; throughput is not the metric you are optimising"],
        ["Already standardised on the HF stack", "TGI", "The integration is the feature; the performance difference is not the deciding one"]
      ] },

    { t: "callout", kind: "warn", title: "The reference's feature matrix is a snapshot, and I cannot verify it here",
      body: [
        { t: "p", text: "The reference carries a tick-box table across vLLM, TGI, TensorRT-LLM, Ollama and llama.cpp — PagedAttention, continuous batching, tensor parallelism, speculative decoding, CPU inference. The structure is the right way to think, and the specific ticks are the part that rots." },
        { t: "p", text: "Two of its rows I would already question: it marks CPU inference unavailable for vLLM, and continuous batching unavailable for llama.cpp. Both have moved — vLLM has a CPU backend and llama.cpp's server does batch concurrent requests. I am stating that as something to check rather than as a measurement, because this environment has no GPU and I could not install and run these servers to verify either claim." },
        { t: "p", text: "The durable advice is the habit: a framework feature matrix in any document more than a few months old should be re-read against the project's own changelog before a decision rests on it. What does not rot is the list of *properties worth asking about*, which is what the table is actually for." }
      ] },

    { t: "h2", n: "04", id: "settings", text: "The settings that matter more than the choice",
      sub: "Most disappointing deployments are a default away from fine" },

    { t: "ladder", title: "Bringing up a 7B model on one 80 GB GPU", rungs: [
      { level: "bad", label: "Defaults, then conclude the framework is slow", why: "A default configuration leaves memory on the table, prefix caching off in older versions, and no quantization. The resulting throughput is then attributed to the framework rather than to the configuration.",
        code: `llm = LLM(model="meta-llama/Llama-2-7b-chat-hf")`,
        note: "This is the configuration behind most \"we benchmarked vLLM and it was disappointing\" claims." },
      { level: "ok", label: "Raise the memory fraction and cap the context", why: "The two settings with the largest effect: give the cache more of the device, and stop one request from reserving space for a context nobody sends. Already most of the available win.",
        code: `llm = LLM(model="meta-llama/Llama-2-7b-chat-hf",
          gpu_memory_utilization=0.90,
          max_model_len=4096)` },
      { level: "best", label: "Add quantization, prefix caching and a token budget", why: "Quantization halves the weights and frees that space for cache (3.3); prefix caching removes most of the prefill on repeated prompts; the token budget holds the latency target (3.5). Each addresses a different bottleneck, so they compose.",
        code: `llm = LLM(model="meta-llama/Llama-2-7b-chat-hf",
          quantization="awq",
          gpu_memory_utilization=0.90,
          max_model_len=4096,
          enable_prefix_caching=True,
          max_num_batched_tokens=8192)`,
        note: "Four settings, four different bottlenecks: bytes per weight, cache size, repeated prefill, step latency." }
    ] },

    { t: "callout", kind: "tradeoff", title: "gpu_memory_utilization is the setting people are most afraid of",
      body: [
        { t: "p", text: "It reserves a fraction of the device for weights plus KV cache. The default is conservative because an out-of-memory kill is a worse failure than low throughput, and raising it is the single largest throughput lever on a memory-bound deployment — more cache means more concurrent rows." },
        { t: "p", text: "What it trades against is headroom for activation spikes, which scale with the largest batch and longest sequence you admit. So raise it *together with* capping `max_model_len` and the token budget: the three are one decision, and raising the first alone is how you get an OOM three days later under an unusual traffic mix." }
      ] },

    { t: "exercise", kind: "analysis", title: "Work out when prefix caching stops mattering", difficulty: "core", minutes: 20,
      body: "Prefix caching saved 84.8% of prefill tokens on eight requests sharing a 251-token prefix. But prefill is only part of a request: the decode phase is untouched by it. Work out the saving as a share of total request cost, for a short answer and a long one, and find the point where prefix caching stops being the lever worth pulling.",
      requirements: [
        "Use the measured per-token costs: prefill 8.41 ms per token (75.698 ms for 9 tokens) and 42.33 ms per decode step",
        "Model a request as shared_prefix + user_turn prefill, then N decode steps",
        "Report total request time with and without prefix caching for answer lengths of 5, 20, 100 and 500 tokens",
        "Give the saving as a percentage of the whole request, not of prefill",
        "State the condition under which prefix caching is worth more than, say, quantization's 1.7× on decode"
      ],
      hint: "Prefix caching removes a fixed amount of work. Decode adds a variable amount. So the interesting quantity is a ratio, and it has a crossover.",
      solution: { lang: "python", title: "g37_ex.py — prefix caching as a share of the whole request", code: `PREFILL_MS_PER_TOK = 75.698 / 9        # measured
DECODE_MS_PER_TOK  = 42.334            # measured
SHARED = 251                           # tokens in the constant prefix
USER   = 8                             # tokens in the user turn

print("  %-10s %12s %12s %10s %12s"
      % ("answer", "no cache ms", "cached ms", "saved", "decode share"))
for n in (5, 20, 100, 500):
    prefill_cold = (SHARED + USER) * PREFILL_MS_PER_TOK
    prefill_warm = USER * PREFILL_MS_PER_TOK
    decode = n * DECODE_MS_PER_TOK
    cold, warm = prefill_cold + decode, prefill_warm + decode
    print("  %-10d %12.0f %12.0f %9.1f%% %11.1f%%"
          % (n, cold, warm, 100 * (cold - warm) / cold, 100 * decode / cold))

print()
print("  quantization at 1.69x on decode only, for comparison:")
for n in (5, 20, 100, 500):
    prefill_cold = (SHARED + USER) * PREFILL_MS_PER_TOK
    decode = n * DECODE_MS_PER_TOK
    cold = prefill_cold + decode
    quant = prefill_cold + decode / 1.69
    cached = USER * PREFILL_MS_PER_TOK + decode
    print("  n=%-4d  prefix caching %5.1f%%   quantization %5.1f%%   winner: %s"
          % (n, 100 * (cold - cached) / cold, 100 * (cold - quant) / cold,
             "prefix caching" if cached < quant else "quantization"))`,
        out: `  answer      no cache ms    cached ms      saved decode share
  5                  2390          279      88.3%         8.9%
  20                 3025          914      69.8%        28.0%
  100                6412         4301      32.9%        66.0%
  500               23345        21234       9.0%        90.7%

  quantization at 1.69x on decode only, for comparison:
  n=5     prefix caching  88.3%   quantization   3.6%   winner: prefix caching
  n=20    prefix caching  69.8%   quantization  11.4%   winner: prefix caching
  n=100   prefix caching  32.9%   quantization  27.0%   winner: prefix caching
  n=500   prefix caching   9.0%   quantization  37.0%   winner: quantization`,
        notes: [
          { t: "p", text: "**The crossover is between 100 and 500 output tokens.** Prefix caching removes a fixed cost, so its share of the request shrinks as the answer grows: 88.3% on a five-token answer down to 9.0% on a 500-token one. Quantization works on decode, so its share grows in exactly the opposite direction." },
          { t: "p", text: "That makes the two complementary rather than competing, and it tells you which to reach for first from one property of your traffic: the **ratio of prompt tokens to output tokens**. A classification or extraction service with huge prompts and three-token answers is almost entirely prefill, and prefix caching is close to the only thing that matters. A long-form writing assistant is the reverse." },
          { t: "p", text: "The decode-share column is the number to internalise. Below about 30% decode share, decode optimisations are rounding errors on your request; above about 70%, prefill optimisations are. Most teams have one of these workloads and tune for the other, because the advice they read was written for the other." },
          { t: "p", text: "Two caveats on the arithmetic. Prefill cost per token is not really constant — it has a quadratic term from attention, which I am ignoring because it is small at 259 tokens (3.4 puts attention at 25% of the work at 512 tokens). And the 1.69× quantization figure comes from 3.3's CPU measurement, which is noisy; the structure of the conclusion survives a different multiplier, the exact crossover point does not." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "A serving framework is a memory allocator with a scheduler attached. Everything it competes on reduces to those two: how finely it can pack KV cache into the device, and how it decides which request gets the next step. The HTTP layer is plumbing — measured, 0.01% of a request." },
        { t: "p", text: "So when a framework disappoints, look at the cache and the queue before anything else. The answer is almost always a number in the configuration rather than a property of the code." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\"We serve a RAG product on vLLM. Prompts are about 3,000 tokens of retrieved context; answers average 150 tokens. Throughput is half what we budgeted. What do you check, in order?\"**" },
        { t: "p", text: "The shape of the workload decides the order. 3,000 prompt tokens against 150 output tokens is prefill-dominated, so I would ignore the decode optimisations that usually come first. From my own arithmetic, at a 20:1 prompt-to-output ratio prefill is the majority of the request." },
        { t: "p", text: "First: is prefix caching enabled, and does the prompt actually have a shared prefix? A RAG prompt usually has a constant system block and a variable retrieved section — and if the retrieved documents are interpolated *before* the instructions, the shared prefix is zero tokens long and the feature is doing nothing. Reordering the template to put everything constant first is a one-line change that I measured at 84.8% of prefill tokens avoided across eight requests." },
        { t: "p", text: "Second: chunked prefill. 3,000-token prefills serialise against everyone else's decode steps — measured, a 512-token prefill is worth 33.9 decode steps, so a 3,000-token one is worth several hundred. Without chunking, one arrival stalls every active stream, which shows up as a throughput number nobody can attribute." },
        { t: "p", text: "Third: the memory settings, because they bound concurrency. The default memory fraction plus an uncapped `max_model_len` means each admitted request reserves cache for a context it will not use, so the batch is smaller than the device can hold (3.2)." },
        { t: "p", text: "What I would *not* do first is reach for quantization, even though it is the famous lever. On this workload it only touches the 30% of the request that is decode — and my own numbers put prefix caching ahead of it until the answers get past roughly 100 tokens." }
      ] }
  ],

  takeaways: [
    "**Framework overhead is not the deciding factor.** Measured, tokenization and detokenization are 0.01% of a 20-token request; the competition is over memory management and scheduling.",
    "**Prefix caching is the one feature with arithmetic worth doing.** A 251-token shared prefix removed 84.8% of prefill tokens across eight requests and 96.2% across 128.",
    "**Its saving improves with scale**, unlike quantization or GQA, because the cached prefix is paid for once and amortised over everything after it.",
    "**Put the constant part of the prompt first.** The cache matches an exact token prefix, so one timestamp or interpolated name at the top reduces the hit to zero tokens.",
    "**RadixAttention generalises a prefix to a tree**, which is why SGLang's advantage appears on branching agent programs and not on plain chat.",
    "**vLLM is the default for GPU serving**; TensorRT-LLM buys the last 20–40% at the cost of a per-GPU, per-shape build artefact; llama.cpp is the one designed for CPU; Ollama optimises the development loop rather than throughput.",
    "**Treat any feature matrix as dated.** The reference's table already has entries worth re-checking, and the durable part of it is the list of properties to ask about.",
    "**Four settings cover four different bottlenecks**: quantization for bytes per weight, memory fraction for cache size, prefix caching for repeated prefill, token budget for step latency.",
    "**Raise the memory fraction together with the context cap**, since activation headroom scales with the largest batch and longest sequence you admit.",
    "**Choose your optimisation from the prompt-to-output ratio.** Prefix caching beat quantization on everything up to about 100 output tokens in my arithmetic, and lost beyond roughly 500."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Tokenization and detokenization measured 0.118 ms against 922 ms of model work. What follows for framework choice?",
        options: [
          "Python-based frameworks are unsuitable for production serving",
          "The decision should rest on KV cache management and scheduling, not on request-handling speed",
          "Framework choice barely matters, since the model dominates either way",
          "Detokenization should be moved to a background thread"
        ],
        answer: 1,
        why: "At 0.01% of a request, the non-model path could get 100× slower and still be under 1% — so it cannot explain a throughput difference. What does differ by factors between frameworks is how finely KV cache is packed into the device and which request gets the next step, which is exactly the subject of 3.2 and 3.5. Framework choice matters a great deal; it just does not matter for the reason the overhead argument suggests." },

      { stem: "A team adds the current timestamp to the top of their system prompt for audit purposes. What happens to prefix caching?",
        options: [
          "Nothing — the cache matches on content hash, so a small change is tolerated",
          "The hit rate falls to zero, because the cache matches an exact token prefix and the first token now differs",
          "It still caches everything after the timestamp, losing only those few tokens",
          "The cache is invalidated once per day when the date rolls over"
        ],
        answer: 1,
        why: "The cache is keyed on a prefix of the token sequence, so matching stops at the first differing token — a variable first token makes the 251 tokens behind it unreachable even though they are byte-identical. Measured, that is the difference between avoiding 84.8% of prefill tokens and avoiding none. The fix is ordering: everything constant first, everything variable last, timestamps at the end of the prompt or out of it entirely." },

      { stem: "A service has 3,000-token prompts and 150-token answers and is below its throughput budget. Which lever should be checked first?",
        options: [
          "Quantizing the weights to int4",
          "Prefix caching and prompt ordering",
          "Speculative decoding with a small draft model",
          "Increasing the maximum batch size"
        ],
        answer: 1,
        why: "A 20:1 prompt-to-output ratio makes the request prefill-dominated, and prefix caching is the only optimisation that attacks repeated prefill directly — measured, it beat quantization's share of the request on everything up to about 100 output tokens. Quantization and speculative decoding both act on decode, which is the minority of this request. A bigger batch helps throughput but does nothing about the fact that most of the work is re-prefilling identical tokens." },

      { stem: "Why is TensorRT-LLM's engine compilation a real constraint rather than a one-off setup cost?",
        options: [
          "Compilation requires a licence that must be renewed",
          "The engine is built for a specific model, GPU, precision and batch shape, so any of those changing means rebuilding",
          "Compiled engines cannot serve an OpenAI-compatible API",
          "The compiled engine loses support for continuous batching"
        ],
        answer: 1,
        why: "The engine is a build artefact tied to the model weights, the GPU architecture, the precision and the maximum shapes — so swapping a model, moving to different hardware, or raising the batch limit all require a rebuild and a re-validation. On a team that ships model changes weekly that is a meaningful pipeline cost, which is why it suits fixed, high-volume deployments and is a poor fit for fast-moving ones. It serves an OpenAI-compatible API and does in-flight batching perfectly well." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "This is the question where a candidate either lists frameworks or explains a decision",
    questions: [
      { level: "core",
        q: "How would you choose a serving framework?",
        strong: "A strong answer chooses from a constraint and knows which properties actually differentiate.",
        answer: [
          { t: "p", text: "From the constraint rather than the benchmark. On a GPU, shipping model changes regularly: vLLM, because it has PagedAttention, continuous batching and prefix caching with no build step between a new model and serving it. Fixed model and throughput is the whole game: TensorRT-LLM, where engine compilation buys the last 20–40% and the rebuild cost does not bite. No GPU: llama.cpp. A laptop development loop: Ollama. Branching agent programs: SGLang, for RadixAttention." },
          { t: "p", text: "What I would not weigh heavily is per-request overhead. I measured the tokenizer path at 0.118 ms against 922 ms of model work — 0.01% — so the Python-versus-Rust argument cannot explain a throughput difference. The things that differ by factors are KV cache packing and scheduling." },
          { t: "p", text: "And I would treat any feature matrix as dated. The one in our own reference has entries I would re-check against the projects' changelogs before deciding. The durable value of such a table is the list of properties worth asking about, not the ticks." }
        ] },

      { level: "advanced",
        q: "What is prefix caching worth, and how do teams lose it?",
        strong: "A strong answer quantifies it, notes that it improves with scale, and names the ordering mistake.",
        answer: [
          { t: "p", text: "On a realistic agent prompt — a system instruction plus two few-shot examples, 251 tokens — eight requests sharing that prefix avoided 1,765 of 2,082 prefill tokens, which is 84.8%. At 128 requests it is 96.2%. It is unusual among optimisations in that the saving *improves* with volume, because the prefix is paid for once and amortised over everything after it." },
          { t: "p", text: "Teams lose it by ordering the prompt badly. The cache matches an exact token prefix, so the first differing token ends the match — a timestamp at the top, or the user's name interpolated into the system instruction, takes the hit rate to zero while the prompt still looks identical to a human. The fix is to put everything constant first and everything variable last." },
          { t: "p", text: "It is also worth knowing when it stops mattering. It removes a fixed cost, so its share of the request falls as answers get longer: in my arithmetic 88.3% of a five-token answer's time, 9.0% of a 500-token answer's. That makes it the first lever on extraction and classification workloads and roughly the last on long-form generation — the deciding property is the prompt-to-output token ratio." }
        ] },

      { level: "core",
        q: "A team says they benchmarked vLLM and found it disappointing. What do you ask?",
        strong: "A strong answer goes to the configuration and names the specific settings.",
        answer: [
          { t: "p", text: "What the configuration was, because the default is deliberately conservative. The two settings with the largest effect are the memory fraction, which decides how much of the device holds KV cache, and the maximum context length, which decides how much cache each admitted request reserves. A default run leaves a lot of both on the table, and the resulting number gets attributed to the framework." },
          { t: "p", text: "Then whether prefix caching was on and whether the prompt template could use it, which on agent or RAG traffic is the largest single win — 84.8% of prefill tokens avoided in my measurement. And whether chunked prefill was enabled, because long prompts otherwise serialise against everyone's decode steps." },
          { t: "p", text: "Then what they measured. Throughput at batch 1 is not a serving benchmark; it measures the model. The interesting numbers are throughput at the concurrency they actually expect, and the TPOT percentile at that concurrency, because those are the two the scheduler trades off." },
          { t: "p", text: "I would raise the memory fraction and cap the context together rather than separately, since activation headroom scales with the largest batch and longest sequence admitted — raising the fraction alone is how you get an out-of-memory failure some days later on an unusual traffic mix." }
        ] }
    ]
  }
});
