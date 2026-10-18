/* ============================================================================
   LESSON 3.5 — Production NLP Pipelines
   Latency percentiles, batching, ragged padding, dynamic quantisation,
   caching and train-serve skew are all measured on distilbert
   (scratchpad/nlp/n35.py).
   ========================================================================= */
EC.receiveLesson({
  id: "3.5",

  lede: "**One long document in a batch of 32 took inference from 58.91 ms to 2319.61 ms — a 39x blowup with no error and no warning.** Padding is per batch, so the longest row sets the width for every other row, and 31 three-token documents got padded to 158. This lesson measures the things that actually decide whether an NLP service holds up: the latency distribution rather than its mean, where the batching curve flattens, what quantisation really buys, and the preprocessing mismatch that no unit test catches.",

  objectives: [
    "Report latency as P50, P95 and P99 and explain why the mean is the wrong number",
    "Find the batch size where per-item cost stops improving",
    "Diagnose ragged-batch padding waste and fix it with length bucketing",
    "Measure what dynamic quantisation costs in accuracy and buys in speed and size",
    "Detect train-serve skew before it reaches production"
  ],

  prerequisites: ["3.3", "3.4"],

  blocks: [

    { t: "h2", n: "01", text: "Three architecture patterns", id: "patterns" },

    { t: "diagram", kind: "layers", title: "Pick the cheapest tier that meets the requirement",
      items: [
        { title: "Lightweight: TF-IDF + logistic regression", text: "Under 5 ms per request. High throughput, trivial to serve, no GPU. Correct answer far more often than people expect.", tone: "good" },
        { title: "Transformer: DistilBERT or BERT + task head", text: "20-100 ms per request. Much better accuracy on hard tasks. Needs ONNX, quantisation or a GPU to hold a tight SLO.", tone: "accent" },
        { title: "LLM: API or self-hosted", text: "500 ms to 5 s. Few-shot flexibility and reasoning, at the highest cost and the loosest latency. Needs caching and rate limiting around it.", tone: "violet" }
      ] },

    { t: "callout", kind: "tradeoff", title: "Start at the bottom and only climb when measured",
      body: [{ t: "p", text: "The instinct is to reach for the transformer first. The discipline is to build the TF-IDF baseline first, because it takes an hour, it tells you how hard the problem actually is, and it is sometimes simply good enough — in which case you have avoided a GPU bill, a model registry and an entire class of latency problem. When it is not good enough, you now have a number to beat and a fallback for the cascade. Every tier you climb costs roughly an order of magnitude in latency." }] },

    { t: "h2", n: "02", text: "Latency is a distribution", id: "latency" },

    {"kind": "trace", "title": "Twenty-one milliseconds, and one request in a hundred took 26.84", "caption": "**Reporting “about 21 ms” hides the shape: P99 is 1.25× the median even on an idle machine with four threads and nothing else running.** On a loaded server — garbage collection, thread contention, noisy neighbours — that tail stretches much further. **Which is why SLOs are written against P95 or P99: it is what users actually experience, and a service whose mean is fine and whose tail is not will read as “sometimes slow” rather than as a latency problem.**", "left": "statistic", "codeW": 150, "vars": ["ms", "relative to P50"], "steps": [{"code": "mean", "state": ["21.47", "-"], "tone": "accent"}, {"code": "P50", "state": ["21.50", "1.00x"], "changed": [0, 1], "tone": "good"}, {"code": "P95", "state": ["23.84", "1.11x"], "changed": [0, 1], "tone": "warn"}, {"code": "P99", "state": ["26.84", "1.25x"], "changed": [0, 1], "tone": "crit", "note": "and this is an idle machine"}], "t": "diagram", "id": "dg-3_5-02-0"},








    { t: "out", text:
"distilbert-base-uncased, 67.0M params, 4 CPU threads\n\nsingle request:  mean 21.47 ms   P50 21.50   P95 23.84   P99 26.84\n\nP99 is 1.25x the median" },

    { t: "p", text: "Reporting \"about 21 ms\" hides the shape. One request in a hundred took 26.84 ms here, and on a loaded server with garbage collection, thread contention and noisy neighbours that tail stretches much further. SLOs are written against P95 or P99 because that is what users actually experience — a service whose mean is fine and whose P99 is four seconds feels broken to the one request in a hundred that hits it." },

    { t: "callout", kind: "trap", title: "Benchmark after warm-up, or measure nothing",
      body: [{ t: "p", text: "The first few forward passes of any PyTorch model are dramatically slower — lazy initialisation, memory allocator warm-up, and on GPU, kernel autotuning. Include them and your mean is meaningless. Every number in this lesson discards ten warm-up iterations before timing. The production equivalent is loading the model and running a dummy inference **at startup**, not on the first real request, so that the first user does not pay for it." }] },

    { t: "h2", n: "03", text: "Where batching stops helping", id: "batching" },

    {"kind": "trace", "title": "The knee is at 16, and 32 was marginally worse", "caption": "Per-item cost falls from **21.958 ms to 7.586 ms — a 2.9× throughput gain — and then flattens.** Past 16 there is essentially nothing left: **32 was marginally *worse* and 64 gained under 1%.** So **the knee is the batch size to ship, because everything past it adds queueing latency for no throughput** — a batch of 64 makes the first request in the batch wait 480 ms to be served at the same per-item rate as a batch of 16.", "left": "batch", "codeW": 120, "vars": ["total ms", "ms per item", "items/sec"], "steps": [{"code": "1", "state": ["21.96", "21.958", "45.5"], "tone": "crit"}, {"code": "4", "state": ["41.56", "10.390", "96.2"], "changed": [0, 1, 2], "tone": "warn"}, {"code": "16", "state": ["121.38", "7.586", "131.8"], "changed": [0, 1, 2], "tone": "good", "note": "the knee - 2.9x"}, {"code": "32", "state": ["248.21", "7.757", "128.9"], "changed": [0, 1, 2], "tone": "crit", "note": "worse"}, {"code": "64", "state": ["480.88", "7.514", "133.1"], "changed": [0, 1, 2], "tone": "crit", "note": "+1%, 480ms of queueing"}], "t": "diagram", "id": "dg-3_5-03-1"},








    { t: "out", text:
"batch    total ms    ms per item    items/sec\n1        21.96       21.958         45.5\n2        31.14       15.569         64.2\n4        41.56       10.390         96.2\n8        68.19        8.523        117.3\n16      121.38        7.586        131.8\n32      248.21        7.757        128.9\n64      480.88        7.514        133.1" },

    { t: "p", text: "Per-item cost falls from 21.958 ms to 7.586 ms — a 2.9x throughput gain — and then flattens. Past 16 there is essentially nothing left: 32 was marginally *worse* and 64 gained under 1%. The knee is the batch size to ship, because everything past it adds queueing latency for no throughput." },

    { t: "callout", kind: "insight", title: "Batching trades latency for throughput, and the trade is not free",
      body: [{ t: "p", text: "A batch of 64 completes in 480.88 ms. Every request in it waits for the slowest — so the *first* request to arrive has its latency inflated from 22 ms to nearly half a second plus however long it waited for the batch to fill. That is the cost people forget. Dynamic batching with a timeout is the usual answer: collect requests for a few milliseconds or until the batch is full, whichever comes first, so a quiet period does not leave a single request waiting for companions that never arrive." }] },

    { t: "h2", n: "04", text: "Ragged batches", id: "ragged" },

    {"kind": "trace", "title": "One long document made the batch 39 times slower", "caption": "Thirty-two documents, `padding=True`: **all short pads to (32, 3) at 58.91 ms, and 31 short plus one long pads to (32, 158) at 2319.61 ms.** The 31 short documents are now 155 columns of padding each, **so the cost of a batch is set by its longest member and nothing else.** Which is why **`padding=\"max_length\"` is usually wrong in training — it pads everything to the model maximum regardless of content** — and why `DataCollatorWithPadding` plus a length-grouped sampler is the standard setup.", "left": "batch contents", "codeW": 190, "vars": ["padded shape", "time"], "steps": [{"code": "32 short documents", "state": ["(32, 3)", "58.91 ms"], "tone": "good"}, {"code": "31 short + 1 long", "state": ["(32, 158)", "2319.61 ms"], "changed": [0, 1], "tone": "crit", "note": "39x slower"}, {"code": "the cause", "state": ["155 columns of padding x 31", "the longest member sets the cost"], "changed": [0, 1], "tone": "violet"}], "t": "diagram", "id": "dg-3_5-04-2"},








    { t: "out", text:
"32 documents, padding=True\n\nall short            padded shape (32, 3)      58.91 ms\n31 short + 1 long    padded shape (32, 158)  2319.61 ms\n\n39x slower, from one document" },

    { t: "callout", kind: "crit", title: "One document set the width for all thirty-two",
      body: [{ t: "p", text: "Padding is computed per batch, so a single 158-token document forces 31 three-token documents to be padded to 158 as well. The model then does full attention over 158 positions for every row — and attention is quadratic, so the wasted work is enormous. Nothing errors, the outputs are all correct thanks to the attention mask, and throughput collapses by a factor of **39**. The fix is length bucketing: sort by token count and batch similar lengths together, so padding waste stays near zero. It costs a sort and it is the single highest-return change in most transformer serving code." }] },

    { t: "p", text: "The same logic explains why `padding=\"max_length\"` is usually wrong in training: it pads everything to the model maximum regardless of content. `DataCollatorWithPadding` pads per batch instead, which combined with a length-grouped sampler is the standard setup." },

    { t: "h2", n: "05", text: "Quantisation", id: "quantisation" },

    {"kind": "trace", "title": "1.79x faster, 48% smaller, and the logits moved by 0.0238", "caption": "int8 dynamic quantisation on CPU: **23.81 ms to 13.29 ms, 267.9 MB to 138.7 MB, and the second logit shifted from 0.0397 to 0.0635.** A max absolute difference of **0.0238** is usually harmless and is not nothing — **it is enough to flip a prediction sitting near a decision threshold, which is exactly the population a calibrated classifier cares about.** The other routes compose with this one: **ONNX Runtime for 2–5× through operator fusion, and distillation from 340M down to 14M.**", "left": "precision", "codeW": 150, "vars": ["mean latency", "P95", "size", "logits"], "steps": [{"code": "fp32", "state": ["23.81 ms", "26.41 ms", "267.9 MB", "[0.1527, 0.0397]"], "tone": "accent"}, {"code": "int8", "state": ["13.29 ms", "16.09 ms", "138.7 MB", "[0.1527, 0.0635]"], "changed": [0, 1, 2, 3], "tone": "good", "note": "1.79x, 48% smaller"}, {"code": "difference", "state": ["-10.5 ms", "-10.3 ms", "-129 MB", "max 0.0238"], "changed": [0, 1, 2, 3], "tone": "warn", "note": "enough to flip a borderline case"}], "t": "diagram", "id": "dg-3_5-05-3"},








    { t: "code", lang: "python", title: "scratchpad/nlp/n35.py — dynamic quantisation", code:
"import torch\n\nquantized = torch.quantization.quantize_dynamic(\n    model, {torch.nn.Linear}, dtype=torch.qint8)\nquantized.eval()",
      caption: "Dynamic quantisation stores Linear weights as int8 and quantises activations on the fly. One line, no calibration data, CPU only." },

    { t: "out", text:
"        latency (mean)   P95        size\nfp32    23.81 ms         26.41 ms   267.9 MB\nint8    13.29 ms         16.09 ms   138.7 MB\n\n1.79x faster, 48% smaller\n\nlogits fp32  [0.1527, 0.0397]\nlogits int8  [0.1527, 0.0635]\nmax abs difference 0.0238" },

    { t: "callout", kind: "warn", title: "The 2-4x did not fully reproduce",
      body: [{ t: "p", text: "The quoted figure is \"2-4x speedup, ~50% size reduction\" for dynamic quantisation. Size reproduced closely — **48%**, 267.9 MB to 138.7 MB. Speed came in at **1.79x**, below the quoted range, on four CPU threads with a 67M-parameter model. Quantisation speedups depend heavily on the CPU's int8 support, the thread count and the model's shape, so a range quoted without hardware is not a prediction. Measure it on your serving hardware." }] },

    { t: "callout", kind: "trap", title: "Quantisation is lossy — re-measure accuracy, never assume",
      body: [{ t: "p", text: "The logits moved: **0.0397 became 0.0635**, a difference of 0.0238 on a single example. That is small, and on most inputs it will not flip a prediction — but *most* is not *none*, and the inputs nearest the decision boundary are exactly the ones it flips. Never ship a quantised model on the unquantised model's evaluation numbers. Run the full evaluation set through the quantised artefact, and pay particular attention to the rare classes, where a handful of flipped predictions moves per-class F1 substantially while accuracy barely twitches." }] },

    { t: "p", text: "The other optimisation routes are ONNX Runtime, which exports the graph and applies operator fusion for typically 2-5x, and distillation — BERT-large at 340M down through BERT-base at 110M, DistilBERT at 66M, TinyBERT at 14M. These compose: an ONNX-exported, quantised distilled model is a different animal from the checkpoint you fine-tuned." },

    { t: "h2", n: "06", text: "Caching", id: "caching" },

    {"kind": "trace", "title": "Four lines of code absorbed 81.6% of the traffic", "caption": "**Real query traffic is not uniform — it is heavily skewed, with a small number of queries accounting for most requests — which makes caching the cheapest optimisation available and the one most often skipped.** A 1,024-entry `lru_cache` over 2,000 requests across 500 distinct queries: **1,632 hits, 81.6% hit rate, 6.78s against approximately 36.86s — a 5.4× cut in wall-clock with no model change and no hardware.** In a real service: Redis so it survives restarts and is shared across replicas, keyed on the **normalised** input.", "left": "measurement", "codeW": 180, "vars": ["value"], "steps": [{"code": "requests / distinct queries", "state": ["2000 / 500, zipfian"], "tone": "accent"}, {"code": "hits / misses", "state": ["1632 / 368"], "changed": [0], "tone": "good", "note": "81.6%"}, {"code": "wall clock", "state": ["6.78s"], "changed": [0], "tone": "good"}, {"code": "without the cache", "state": ["~36.86s"], "changed": [0], "tone": "crit", "note": "5.4x, from four lines"}], "t": "diagram", "id": "dg-3_5-06-4"},








    { t: "p", text: "Real query traffic is not uniform — it is heavily skewed, with a small number of queries accounting for most requests. That makes caching the cheapest optimisation available, and the one most often skipped." },

    { t: "out", text:
"2000 requests over a zipfian query distribution, 500 distinct queries\n\nhits 1632   misses 368   hit rate 81.6%\n\ntotal 6.78s   without the cache, approximately 36.86s" },

    { t: "p", text: "An `lru_cache` of 1,024 entries absorbed 81.6% of the traffic and cut wall-clock time by 5.4x. No model change, no hardware, four lines of code. In a real service you would use Redis so the cache survives restarts and is shared across replicas, key on the *normalised* input so trivial whitespace differences still hit, and set a TTL tied to how often the model is retrained — a cache that outlives the model it was populated from serves stale predictions indefinitely." },

    { t: "h2", n: "07", text: "Train-serve skew", id: "skew" },

    {"kind": "trace", "title": "The bug was invisible until someone swapped the checkpoint", "caption": "The probe is `\"EXCELLENT Service\"`, and on `bert-base-uncased` **both paths agree — because the tokenizer lowercases anyway, so a serving path that forgets to lowercase is indistinguishable from one that does.** Then the checkpoint changes to `bert-base-cased` and **the serve path produces `['E', '##X', '##CE', '##LL', '##EN', '##T', 'Service']`: seven subword tokens where training produced two words.** Accuracy degrades, **and every test still passes, because both paths work perfectly in isolation.**", "left": "checkpoint and path", "codeW": 200, "vars": ["tokens"], "steps": [{"code": "uncased, train path", "state": ["[CLS] excellent service [SEP]"], "tone": "good"}, {"code": "uncased, serve path", "state": ["[CLS] excellent service [SEP]"], "changed": [0], "tone": "good", "note": "identical - bug invisible"}, {"code": "cased, train path", "state": ["[CLS] excellent service [SEP]"], "tone": "good"}, {"code": "cased, serve path", "state": ["[CLS] E ##X ##CE ##LL ##EN ##T Service [SEP]"], "changed": [0], "tone": "crit", "note": "no error anywhere"}], "t": "diagram", "id": "dg-3_5-07-5"},








    { t: "p", text: "The preprocessing at training time and at serving time must be identical. When they drift apart, the model receives inputs unlike anything it was trained on, accuracy degrades, and every test still passes — because both paths work perfectly in isolation." },

    { t: "code", lang: "python", title: "The bug", code:
"def preprocess_train(s):  return s.lower().strip()\ndef preprocess_serve(s):  return s.strip()        # someone dropped .lower()",
      caption: "This diff survives code review easily. It is one method call on a line that looks fine." },

    { t: "out", text:
"probe: \"EXCELLENT Service\"\n\nbert-base-uncased (the checkpoint used in development)\n  train path: ['[CLS]', 'excellent', 'service', '[SEP]']\n  serve path: ['[CLS]', 'excellent', 'service', '[SEP]']\n  identical — the tokenizer lowercases anyway, so the bug is invisible\n\nbert-base-cased (after someone swaps the checkpoint)\n  train path: ['[CLS]', 'excellent', 'service', '[SEP]']\n  serve path: ['[CLS]', 'E', '##X', '##CE', '##LL', '##EN', '##T', 'Service', '[SEP]']" },

    { t: "callout", kind: "crit", title: "Dormant until a checkpoint change wakes it",
      body: [{ t: "p", text: "On the uncased checkpoint the missing `.lower()` does nothing, because the tokenizer lowercases regardless. The bug sits there passing every test. Then someone switches to a cased model for a legitimate accuracy reason, and the same input goes from **2 tokens to 7** — shattered into character fragments the model has essentially never seen in that configuration. Accuracy falls, and the commit that appears to have caused it is the checkpoint change, not the preprocessing bug from months earlier. The defence is structural: define preprocessing **once**, import it into both paths, and add a test that asserts the training and serving functions produce identical token ids on a fixed probe set." }] },

    { t: "h2", n: "08", text: "The checklist", id: "checklist" },

    {"kind": "layers", "title": "Four stages, and the last row is the one that changes the cost model", "caption": "Most of this is the lesson's own measurements turned into instructions — **benchmark after warm-up, enforce a max input length, bucket by length, and track percentiles rather than means.** The scaling row has the item worth noticing: **a cascade, where a cheap model runs first and the expensive one runs only when it abstains**, which turns the P99 problem into a routing problem. And **logging the prediction distribution is what catches drift**, because accuracy needs labels and the distribution does not.", "items": [{"label": "Pre-deployment", "sub": "P50/P95/P99 after warm-up; empty, long and odd-unicode inputs; a max length; load at startup", "tone": "good", "side": "measure"}, {"label": "Serving", "sub": "async, dynamic batching with a timeout, length buckets, model.eval() and no_grad()", "tone": "good", "side": "the knee"}, {"label": "Monitoring", "sub": "log the prediction distribution; percentiles not means; errors by input type", "tone": "violet", "side": "no labels"}, {"label": "Scaling", "sub": "replicas, Redis on normalised inputs, queue slow work", "tone": "good", "side": "cache"}, {"label": "...and a cascade", "sub": "cheap model first, expensive only on abstention", "tone": "teal", "side": "routing"}], "t": "diagram", "id": "dg-3_5-08-6"},








    { t: "table",
      head: ["Stage", "What to do"],
      rows: [
        ["Pre-deployment", "Benchmark P50/P95/P99 after warm-up. Test empty input, very long text, unusual unicode. Set and enforce a max input length. Load the model at startup."],
        ["Serving", "Async endpoints, dynamic batching with a timeout, length bucketing, request timeouts, `model.eval()` and `torch.no_grad()` everywhere."],
        ["Monitoring", "Log the prediction distribution to catch drift, track latency percentiles not means, break error rates down by input type, alert on anomalous confidence."],
        ["Scaling", "Horizontal replicas behind a load balancer, Redis cache on normalised inputs, queue slow work, and a cascade — cheap model first, expensive model only when it abstains."]
      ] },

    { t: "callout", kind: "insight", title: "Monitor the inputs, not just the outputs",
      body: [{ t: "p", text: "Accuracy monitoring needs labels, which arrive late or never. Input monitoring needs nothing: track tokens per document, out-of-vocabulary rate, language distribution, and the share of inputs hitting the truncation limit. When those shift, your accuracy has already shifted and you will find out weeks before the labels confirm it. The ragged-batch problem shows up here too — a sudden rise in the tail of the length distribution explains a latency regression that looks inexplicable from the model's side." }] },

    { t: "exercise", title: "Measure your own service",
      tasks: [
        "Benchmark your model after warm-up and report P50, P95 and P99. Compare the P99 with the mean you were previously quoting.",
        "Sweep batch size and find the knee. Then compute the added latency for the first request in a batch of that size.",
        "Construct a ragged batch from your own traffic distribution and measure the padding waste. Implement length bucketing and re-measure.",
        "Quantise your model and run the full evaluation set through it. Report per-class F1, not just accuracy.",
        "Write a test asserting that the training and serving preprocessing produce identical token ids on twenty probe strings, including uppercase, unicode and empty input."
      ] }
  ],

  takeaways: [
    "Report P50, P95 and P99 after warm-up; the mean hides the tail your SLO is written against.",
    "Per-item cost fell from 21.958 ms to 7.586 ms by batch 16 and then flattened — batch past the knee only adds latency.",
    "A batch of 64 takes 480.88 ms, and every request in it waits for the slowest; use dynamic batching with a timeout.",
    "One 158-token document in a batch of 32 short ones took inference from 58.91 ms to 2319.61 ms — a 39x blowup. Sort by length.",
    "Dynamic quantisation gave 1.79x speed and 48% size reduction, below the quoted 2-4x; it is hardware-dependent, so measure it.",
    "Quantisation moved a logit by 0.0238 — it is lossy, so re-run the full evaluation on the quantised artefact.",
    "An LRU cache absorbed 81.6% of zipfian traffic for a 5.4x wall-clock win, in four lines.",
    "A missing `.lower()` was invisible on an uncased checkpoint and split one input into 7 tokens instead of 2 on a cased one — share preprocessing code and assert on token ids."
  ],

  quiz: { title: "Check yourself", questions: [
    { stem: "Why did one long document make a batch of 32 take 39x longer?",
      options: ["The model reloaded", "Padding is per batch, so every row was padded to 158 tokens and attention is quadratic in length", "The long document failed and retried", "Memory swapping"],
      answer: 1,
      why: "The padded shape went from (32, 3) to (32, 158). Every short document was padded to the longest one's length, and the model ran full attention over 158 positions for all 32 rows. The attention mask keeps the outputs correct, so nothing errors — you only see it in the latency. Length bucketing fixes it." },
    { stem: "Per-item latency flattens at batch 16. Why not use batch 64 anyway?",
      options: ["Memory limits", "Because a batch of 64 takes 480.88 ms and every request in it waits for the slowest, inflating individual latency for no throughput gain", "Larger batches reduce accuracy", "The tokenizer cannot handle it"],
      answer: 1,
      why: "Throughput was 131.8 items/sec at 16 and 133.1 at 64 — under 1% better. But the batch takes 480.88 ms to complete, so every request in it waits that long plus the time spent waiting for the batch to fill. Past the knee you are trading real latency for nothing." },
    { stem: "What is the right response to quantisation moving a logit by 0.0238?",
      options: ["Ignore it, it is small", "Re-run the full evaluation on the quantised artefact, with attention to per-class metrics", "Revert to fp32", "Increase the batch size"],
      answer: 1,
      why: "Small shifts do not change most predictions, but they flip the ones nearest the decision boundary — and those are disproportionately the rare-class examples. Per-class F1 can move noticeably while accuracy barely changes. The evaluation must run on the artefact you actually deploy, not the one you fine-tuned." },
    { stem: "Why was the missing `.lower()` invisible until someone changed the checkpoint?",
      options: ["It was never a real bug", "The uncased tokenizer lowercases anyway, so both paths produced identical ids until a cased checkpoint was swapped in", "Tests were not running", "The cache masked it"],
      answer: 1,
      why: "On bert-base-uncased both paths gave ['[CLS]','excellent','service','[SEP]']. On bert-base-cased the serving path gave ['[CLS]','E','##X','##CE','##LL','##EN','##T','Service','[SEP]'] — 7 tokens instead of 2. The latent bug activates on an unrelated change, so the commit that appears responsible is not the one that introduced it." }
  ] },

  interview: { title: "Interview", sub: "Production NLP", questions: [
    { level: "Core", q: "How do you reduce transformer inference latency in production?",
      strong: "Batch to the knee, bucket by length, quantise, cache, and only then reach for bigger hardware.",
      answer: [{ t: "p", text: "In rough order of return per effort. Caching first — real query traffic is heavily skewed, and an LRU cache absorbed 81.6% of a zipfian request stream in my measurements for a 5.4x wall-clock win, in four lines of code. Then batching, but only up to the knee: per-item cost fell from 21.958 ms to 7.586 ms by batch 16 and flattened, so batching past that adds queueing latency for nothing. Then length bucketing, which is the one people miss — I measured a batch of 32 going from 58.91 ms to 2319.61 ms because one 158-token document forced every three-token document to be padded to 158. That's a 39x regression with no error, and sorting by length eliminates it. Then quantisation and ONNX: dynamic quantisation gave me 1.79x and 48% size reduction on CPU, though it's lossy so the evaluation has to be re-run on the quantised artefact. And underneath all of it, a smaller model — DistilBERT at 66M instead of BERT-base at 110M — is often the cheapest win and the first thing to try if accuracy permits." }] },
    { level: "Core", q: "Why report P99 latency rather than mean?",
      strong: "Because the mean hides the tail, and the tail is what users experience and what SLOs are written against.",
      answer: [{ t: "p", text: "Because latency is a distribution with a long right tail and the mean is not representative of it. In my benchmark the mean was 21.47 ms and P99 was 26.84 ms — modest on an idle machine, but on a loaded server with garbage collection, thread contention and noisy neighbours that tail stretches much further, while the mean barely moves. If one request in a hundred takes four seconds, the service feels broken to those users regardless of what the average says, and at scale one in a hundred is a lot of people. So SLOs get written against P95 or P99. The other half of the answer is that you have to measure it correctly: the first several forward passes of a PyTorch model are dramatically slower because of lazy initialisation and allocator warm-up, so a benchmark that includes them is measuring startup rather than steady state. I discard warm-up iterations when benchmarking, and in production I load the model and run a dummy inference at startup so no real user pays that cost." }] },
    { level: "Senior", q: "Your model's accuracy drops in production but all tests pass. How do you investigate?",
      strong: "Suspect train-serve skew and input drift before suspecting the model.",
      answer: [{ t: "p", text: "Tests passing while production degrades points at something the tests can't see, and that's usually one of two things. First, train-serve skew: preprocessing that differs between the training path and the serving path. Both paths work in isolation so unit tests pass, but the model receives inputs unlike its training distribution. I've seen the shape of this concretely — a missing `.lower()` in the serving path is completely invisible on an uncased checkpoint, then someone swaps in a cased model for good reasons and the same input goes from 2 tokens to 7, shattered into character fragments. The regression appears to be caused by the checkpoint change, but the actual bug predates it by months. So the first thing I'd do is take real production inputs, push them through both paths, and diff the token ids — not the strings, the ids. Second, input drift: the data has changed even though the code hasn't. That's why I'd want input monitoring in place beforehand — tokens per document, OOV rate, language mix, the share of inputs hitting the truncation limit — because those move before labels arrive to confirm an accuracy drop, and they're free to collect. I'd also check whether anything in the serving stack changed silently: a tokenizer version bump, a spaCy model version, a cache serving predictions from a model that's since been retrained. Then, only after those, I'd look at the model itself." }] }
  ] }
});
