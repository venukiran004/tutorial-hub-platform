/* ============================================================================
   LESSON 13.6 — LLM Systems at Scale
   ========================================================================= */
EC.receiveLesson({
  id: "13.6",

  lede: "LLM systems reuse everything in this module and add three new constraints. Each request is expensive, because a large model processes every prompt token and generates the answer one token at a time. Answers can be wrong in fluent language, so grounding and checking become part of the architecture. And workflows chain several model calls, so their failure rates multiply. This lesson designs a RAG system over millions of documents, sizes a fleet for 10,000 requests a second, tests whether a semantic cache is safe, and measures how a multi-agent workflow fails.",

  objectives: [
    "Design a RAG system for millions of documents: ingestion, hybrid retrieval, reranking, permissions and citations",
    "Estimate the GPU fleet for an LLM workload, separating prefill from decode",
    "Choose the levers that cut serving cost: prefix caching, model routing, quantisation",
    "Judge when a semantic cache is safe, using measured hit and error rates",
    "Design a support assistant and a multi-agent workflow with guardrails, retries and escalation"
  ],

  prerequisites: ["13.3", "13.4", "13.5"],

  blocks: [
    { t: "h2",
      n: "01",
      id: "rag",
      text: "RAG over millions of documents",
      sub: "Retrieval quality decides answer quality" },
    { t: "p",
      text: "Ingestion splits each document into chunks of a few hundred tokens, embeds them, and stores the vector, the text and the document's access-control list. At query time, a hybrid retriever combines keyword search (exact names, codes, error messages) with vector search (paraphrases), a cross-encoder reranks the top 50 to the best 8, and the model answers from those chunks with citations. Output checks confirm that the claims are supported by the cited chunks and that nothing leaks across permissions." },
    { t: "viz",
      title: "A RAG system",
      caption: "The online path from user to cited answer runs along the top; ingestion feeds the index from below. Permissions are enforced at retrieval, never left to the model.",
      svg: `<svg viewBox="0 0 760 275" width="100%" role="img">
<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-2)"/></marker></defs>
<line x1="120.0" y1="46.0" x2="160.0" y2="46.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="290.0" y1="46.0" x2="330.0" y2="46.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="460.0" y1="46.0" x2="500.0" y2="46.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="595.1" y1="72.0" x2="659.9" y2="120.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="640.0" y1="146.0" x2="590.0" y2="146.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="130.0" y1="166.0" x2="170.0" y2="166.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="297.6" y1="192.0" x2="337.4" y2="210.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="395.0" y1="210.0" x2="395.0" y2="72.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<rect x="10" y="20" width="110" height="52" rx="8" class="s-fill" style="stroke:var(--ink-2);stroke-width:1.8"/>
<text x="65.0" y="42" text-anchor="middle" class="s-label" style="fill:var(--ink-2)">User</text>
<text x="65.0" y="60" text-anchor="middle" class="s-sub">question</text>
<rect x="160" y="20" width="130" height="52" rx="8" class="s-fill" style="stroke:var(--warn);stroke-width:1.8"/>
<text x="225.0" y="42" text-anchor="middle" class="s-label" style="fill:var(--warn)">Gateway</text>
<text x="225.0" y="60" text-anchor="middle" class="s-sub">auth, limits</text>
<rect x="330" y="20" width="130" height="52" rx="8" class="s-fill" style="stroke:var(--accent);stroke-width:1.8"/>
<text x="395.0" y="42" text-anchor="middle" class="s-label" style="fill:var(--accent)">Retrieve</text>
<text x="395.0" y="60" text-anchor="middle" class="s-sub">BM25 + ANN, 50</text>
<rect x="500" y="20" width="120" height="52" rx="8" class="s-fill" style="stroke:var(--accent);stroke-width:1.8"/>
<text x="560.0" y="42" text-anchor="middle" class="s-label" style="fill:var(--accent)">Rerank</text>
<text x="560.0" y="60" text-anchor="middle" class="s-sub">cross-encoder, 8</text>
<rect x="640" y="120" width="110" height="52" rx="8" class="s-fill" style="stroke:var(--violet);stroke-width:1.8"/>
<text x="695.0" y="142" text-anchor="middle" class="s-label" style="fill:var(--violet)">LLM</text>
<text x="695.0" y="160" text-anchor="middle" class="s-sub">cited answer</text>
<rect x="450" y="120" width="140" height="52" rx="8" class="s-fill" style="stroke:var(--crit);stroke-width:1.8"/>
<text x="520.0" y="142" text-anchor="middle" class="s-label" style="fill:var(--crit)">Output checks</text>
<text x="520.0" y="160" text-anchor="middle" class="s-sub">grounding, PII</text>
<rect x="10" y="140" width="120" height="52" rx="8" class="s-fill" style="stroke:var(--ink-2);stroke-width:1.8"/>
<text x="70.0" y="162" text-anchor="middle" class="s-label" style="fill:var(--ink-2)">Documents</text>
<text x="70.0" y="180" text-anchor="middle" class="s-sub">10M, ACLs</text>
<rect x="170" y="140" width="140" height="52" rx="8" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="240.0" y="162" text-anchor="middle" class="s-label" style="fill:var(--good)">Ingest</text>
<text x="240.0" y="180" text-anchor="middle" class="s-sub">chunk, embed</text>
<rect x="330" y="210" width="130" height="52" rx="8" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="395.0" y="232" text-anchor="middle" class="s-label" style="fill:var(--good)">Index</text>
<text x="395.0" y="250" text-anchor="middle" class="s-sub">vectors + text</text>
</svg>` },
    { t: "dl",
      items: [
        { term: "Index size",
          def: "10 million documents of 10 chunks each is 100 million vectors. At 768 dimensions in 32-bit floats that is 307 GB; product quantisation to 96 bytes per vector is 9.6 GB, at some loss of recall that the reranker partly recovers." },
        { term: "Permissions at retrieval",
          def: "Filter by the user's groups inside the search, not after it. Post-filtering can leave too few results, and asking the model to ignore forbidden text is not a security control." },
        { term: "Freshness",
          def: "Incremental ingestion from change events, with document versions, so an edited policy replaces its old chunks instead of sitting next to them." },
        { term: "Evaluation",
          def: "Retrieval recall on a labelled question set, answer faithfulness to the cited chunks, and the share of questions answered 'I don't know' correctly, tracked per release." }
      ] },
    { t: "h2",
      n: "02",
      id: "serving",
      text: "Serving at 10,000 requests a second",
      sub: "Prefill and decode are different problems" },
    { t: "p",
      text: "Generation has two phases. **Prefill** processes the whole prompt in parallel and is limited by compute. **Decode** produces one token per step for every sequence in the batch and is limited by memory bandwidth, because each step reads all the weights and every sequence's KV cache. The script sizes a fleet from stated hardware figures; change the constants and the method still holds." },
    { t: "code",
      lang: "python",
      title: "llmserve.py — a fleet estimate for 10K QPS",
      code: `import math
# Capacity estimate for 10,000 requests/s with 1,500 prompt tokens and 250 output tokens each.
# Stated assumptions: 8-GPU nodes; per GPU 80 GB, 3.35 TB/s memory bandwidth, 989 TFLOP/s dense 16-bit;
# real kernels reach 60% of bandwidth and 50% of peak FLOPs. The method, not the constants, is the point.
QPS, PROMPT, OUTPUT = 10_000, 1_500, 250
GPU_MEM, GPU_BW, GPU_FLOPS, G = 80e9, 3.35e12, 989e12, 8
MBU, MFU = 0.6, 0.5

def fleet(params, layers, kv_heads, bytes_per=2, uncached_prompt=PROMPT, share=1.0, quiet=False):
    """Nodes needed for \`share\` of the traffic on one model. Decode: memory- or compute-bound per step."""
    weights = params * bytes_per
    kv_tok = 2 * layers * kv_heads * 128 * bytes_per
    ctx = PROMPT + OUTPUT
    batch = int((GPU_MEM * G * 0.9 - weights) // (kv_tok * ctx))
    t_mem = (weights + batch * kv_tok * (PROMPT + OUTPUT / 2)) / (GPU_BW * G * MBU)
    t_cmp = batch * 2 * params / (GPU_FLOPS * G * MFU)
    step = max(t_mem, t_cmp)
    decode_nodes = QPS * share * OUTPUT / (batch / step)
    prefill_nodes = QPS * share * uncached_prompt * 2 * params / (GPU_FLOPS * G * MFU)
    if not quiet:
        print(f"  KV cache {kv_tok / 1e6:.2f} MB/token; batch {batch} per node; decode step {1000 * step:.0f} ms "
              f"({'memory' if t_mem >= t_cmp else 'compute'}-bound); {OUTPUT} tokens in {OUTPUT * step:.1f} s")
    return decode_nodes, prefill_nodes

print("70B model, 16-bit:")
d, p = fleet(70e9, 80, 8)
print(f"  decode {math.ceil(d)} nodes + prefill {math.ceil(p)} nodes = {math.ceil(d + p)} nodes ({8 * math.ceil(d + p):,} GPUs)\\n")

def total(*parts): return math.ceil(sum(a + b for a, b in parts))
base = total(fleet(70e9, 80, 8, quiet=True))
prefix = total(fleet(70e9, 80, 8, uncached_prompt=500, quiet=True))
routed = total(fleet(70e9, 80, 8, uncached_prompt=500, share=0.4, quiet=True),
               fleet(8e9, 32, 8, uncached_prompt=500, share=0.6, quiet=True))
fp8 = total(fleet(70e9, 80, 8, bytes_per=1, uncached_prompt=500, share=0.4, quiet=True),
            fleet(8e9, 32, 8, bytes_per=1, uncached_prompt=500, share=0.6, quiet=True))
print(f"{'baseline':<52}{base:>5} nodes")
print(f"{'+ prefix cache for a shared 1,000-token system prompt':<52}{prefix:>5} nodes")
print(f"{'+ route 60% of requests to an 8B model':<52}{routed:>5} nodes")
print(f"{'+ 8-bit weights and KV cache':<52}{fp8:>5} nodes")`,
      out: `70B model, 16-bit:
  KV cache 0.33 MB/token; batch 760 per node; decode step 34 ms (memory-bound); 250 tokens in 8.5 s
  decode 112 nodes + prefill 531 nodes = 643 nodes (5,144 GPUs)

baseline                                              643 nodes
+ prefix cache for a shared 1,000-token system prompt  289 nodes
+ route 60% of requests to an 8B model                148 nodes
+ 8-bit weights and KV cache                          129 nodes` },
    { t: "dl",
      items: [
        { term: "Prefill dominated",
          def: "With 1,500 prompt tokens and 250 output tokens, prefill needed 531 nodes and decode 112. Long prompts (RAG context, system prompts, history) are where the money goes." },
        { term: "Prefix caching",
          def: "When most requests share a 1,000-token system prompt, its KV cache is computed once and reused, and the fleet fell from 643 to 289 nodes." },
        { term: "Routing",
          def: "Sending 60% of requests, the easy ones, to an 8B model halved the fleet again to 148 nodes. A router is a classifier with its own evaluation." },
        { term: "Quantisation",
          def: "8-bit weights and KV cache doubled the batch per node; here it saved only 19 more nodes because the estimate keeps prefill at 16-bit throughput." }
      ] },
    { t: "callout",
      kind: "trap",
      title: "Latency is part of the design",
      body: [
        { t: "p",
          text: "At a 34 ms decode step, 250 tokens take 8.5 seconds. Streaming makes the first token the user-visible latency, so prefill time and queueing set the experience; large batches raise throughput and lengthen every step. Serving systems separate prefill and decode onto different GPUs, or interleave them in chunks, to protect both." }
      ] },
    { t: "h2", n: "03", id: "cache", text: "Is a semantic cache safe?", sub: "Measured on support questions" },
    { t: "p",
      text: "A semantic cache returns a stored answer when a new question's embedding is close enough to a cached one. It promises to skip the model for repeated questions. The test: 20 cached support questions, a paraphrase of each that should hit, and a near-miss of each that needs a different answer and must not." },
    { t: "code",
      lang: "python",
      title: "semcache.py — paraphrase hits against wrong answers",
      code: `import numpy as np
from sentence_transformers import SentenceTransformer

# Cached questions, a paraphrase of each (should hit), and a near-miss that needs a different answer (must not hit).
rows = [
 ("How do I reset my password?", "I forgot my password, how can I change it?", "How do I reset my two-factor authentication?"),
 ("How do I cancel my order?", "Can I cancel an order I just placed?", "How do I cancel my subscription?"),
 ("What is your refund policy?", "Can I get my money back after buying?", "What is your shipping policy?"),
 ("How long does delivery take?", "When will my package arrive?", "How long does a refund take?"),
 ("Do you ship to Canada?", "Can I order from Canada?", "Do you ship to Mexico?"),
 ("How do I change my email address?", "I want to update the email on my account", "How do I change my delivery address?"),
 ("Is there a student discount?", "Do students get a discount?", "Is there a military discount?"),
 ("How do I delete my account?", "I want to close my account permanently", "How do I deactivate my account temporarily?"),
 ("What payment methods do you accept?", "Can I pay with PayPal or a card?", "What currencies do you accept?"),
 ("How do I track my order?", "Where can I see my order status?", "How do I return my order?"),
 ("Can I change the size after ordering?", "I ordered the wrong size, can I swap it?", "Can I change the colour after ordering?"),
 ("How do I contact support?", "What is the customer service phone number?", "How do I contact the sales team?"),
 ("Why was my card declined?", "My payment failed, why?", "Why was my account suspended?"),
 ("How do I apply a promo code?", "Where do I enter a discount code?", "How do I get a promo code?"),
 ("Is my data shared with third parties?", "Do you sell my personal information?", "Is my data encrypted at rest?"),
 ("Can I upgrade my plan mid-month?", "How do I move to a bigger plan now?", "Can I downgrade my plan mid-month?"),
 ("Do you offer gift cards?", "Can I buy a gift card?", "Do gift cards expire?"),
 ("How do I add a user to my team?", "How can I invite a colleague?", "How do I remove a user from my team?"),
 ("What are your opening hours?", "When is the store open?", "What are your holiday opening hours?"),
 ("How do I export my data?", "Can I download all my information?", "How do I import my data?"),
]
m = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
cached = m.encode([r[0] for r in rows], normalize_embeddings=True)
para = m.encode([r[1] for r in rows], normalize_embeddings=True)
near = m.encode([r[2] for r in rows], normalize_embeddings=True)

def lookup(q):  # best cached match and its similarity
    s = q @ cached.T; return s.argmax(1), s.max(1)
pi, ps = lookup(para); ni, ns = lookup(near)
print(f"{'threshold':>9}  {'paraphrases served from cache':>30}  {'near-misses given a wrong cached answer':>40}")
for th in (0.70, 0.80, 0.85, 0.90, 0.95):
    hit = ((ps >= th) & (pi == np.arange(len(rows)))).mean()
    wrong = (ns >= th).mean()
    print(f"{th:>9.2f}  {hit:>30.0%}  {wrong:>40.0%}")
worst = np.argsort(-ns)[:3]
print("\\nmost similar near-misses:")
for i in worst: print(f"  {ns[i]:.2f}  '{rows[i][2]}'  ->  '{rows[ni[i]][0]}'")`,
      out: `threshold   paraphrases served from cache   near-misses given a wrong cached answer
     0.70                             35%                                       40%
     0.80                             20%                                       10%
     0.85                             10%                                       10%
     0.90                              0%                                        5%
     0.95                              0%                                        0%

most similar near-misses:
  0.92  'How do I get a promo code?'  ->  'How do I apply a promo code?'
  0.88  'What are your holiday opening hours?'  ->  'What are your opening hours?'
  0.77  'Can I downgrade my plan mid-month?'  ->  'Can I upgrade my plan mid-month?'` },
    { t: "callout",
      kind: "insight",
      title: "No threshold was both useful and safe",
      body: [
        { t: "p",
          text: "At 0.80, only 20% of paraphrases hit while 10% of near-misses got a wrong answer; 'How do I get a promo code?' matched 'How do I apply a promo code?' at 0.92, higher than most true paraphrases. Short questions that differ in one word are exactly what embeddings blur. Safer options: exact-match caching after normalisation, caching retrieval results rather than answers, prefix (KV) caching, or a semantic cache restricted to long, specific questions and checked by a reranker." }
      ] },
    { t: "h2",
      n: "04",
      id: "agents",
      text: "Support assistants and agent workflows",
      sub: "Every call can fail" },
    { t: "p",
      text: "A customer-support assistant is RAG plus actions: it reads the help centre and the customer's orders, and can issue refunds or change addresses through tools. The design questions are about control. Which actions need confirmation, which have limits (a refund cap), when to hand over to a human, and how every tool call is logged and attributable. Multi-agent workflows (a planner, specialists, a reviewer) chain many such calls, and the exercise measures what chaining does to reliability." },
    { t: "table",
      head: ["Control", "What it prevents"],
      rows: [
        ["Tool permissions per user and scope", "The model acting outside the customer's account"],
        ["Limits and confirmation on actions", "A wrong refund of any size, or a repeated one"],
        ["Escalation on low confidence or anger", "Loops where the assistant cannot resolve the issue"],
        ["Step and cost budgets per task", "Runaway agent loops that burn tokens"],
        ["Full trace of prompts, retrieval and tool calls", "Incidents that cannot be explained afterwards"]
      ] },
    { t: "exercise",
      kind: "Challenge",
      title: "Reliability of a multi-agent workflow",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p",
          text: "Simulate a workflow of LLM calls where each call succeeds with probability 0.95, takes a lognormal time around 2 seconds and costs $0.01, and a failure is detected and can be retried. Compare end-to-end success, mean cost and p50/p95 latency for ten sequential steps with 0, 1 and 2 retries, a four-step design, and ten steps arranged in four stages that run in parallel." }
      ],
      requirements: [
        "100,000 simulated runs per design, vectorised",
        "Retries that cost time and money only when needed",
        "A parallel stage whose time is the slowest of its steps",
        "A table of success, cost, p50 and p95 per design"
      ],
      hint: "Keep a boolean 'still alive' array across steps; a run that fails a step after all retries stops there and adds no more cost.",
      solution: { lang: "python",
        title: "agent_reliability.py",
        code: `import numpy as np
rng = np.random.default_rng(7)

# A multi-agent workflow: a planner, then specialist steps, then a reviewer. Each LLM call succeeds with
# probability p, takes a lognormal time around 2 s and costs $0.01. A failed step can be detected and retried.
RUNS = 100_000
def run(steps, p, retries, parallel_groups=None):
    ok = np.ones(RUNS, bool); cost = np.zeros(RUNS); groups = parallel_groups or [[i] for i in range(steps)]
    latency = np.zeros(RUNS)
    for g in groups:
        g_time = np.zeros(RUNS)
        for _ in g:
            done = np.zeros(RUNS, bool); t = np.zeros(RUNS)
            for _ in range(retries + 1):
                todo = ok & ~done
                t += np.where(todo, rng.lognormal(np.log(2), 0.5, RUNS), 0); cost += todo * 0.01
                done |= todo & (rng.random(RUNS) < p)
            ok &= done; g_time = np.maximum(g_time, t)
        latency += g_time
    return ok.mean(), cost.mean(), np.percentile(latency, 50), np.percentile(latency, 95)

print(f"{'design':<44}{'success':>8}{'cost':>8}{'p50 s':>7}{'p95 s':>7}")
for name, kw in [("10 sequential steps, p=0.95, no retries", dict(steps=10, p=0.95, retries=0)),
                 ("10 sequential steps, p=0.95, 1 retry", dict(steps=10, p=0.95, retries=1)),
                 ("10 sequential steps, p=0.95, 2 retries", dict(steps=10, p=0.95, retries=2)),
                 ("4 steps, p=0.95, 1 retry", dict(steps=4, p=0.95, retries=1)),
                 ("10 steps in 4 parallel stages, 1 retry", dict(steps=10, p=0.95, retries=1,
                                                                   parallel_groups=[[0], [1, 2, 3, 4], [5, 6, 7, 8], [9]]))]:
    s, c, p50, p95 = run(**kw)
    print(f"{name:<44}{s:>8.1%}{'$' + format(c, '.3f'):>8}{p50:>7.1f}{p95:>7.1f}")`,
        out: `design                                       success    cost  p50 s  p95 s
10 sequential steps, p=0.95, no retries        60.4%  $0.081   20.1   28.3
10 sequential steps, p=0.95, 1 retry           97.5%  $0.104   23.3   31.2
10 sequential steps, p=0.95, 2 retries         99.9%  $0.105   23.4   31.4
4 steps, p=0.95, 1 retry                       99.0%  $0.042    9.1   14.4
10 steps in 4 parallel stages, 1 retry         97.5%  $0.104   11.9   17.4`,
        notes: [
          { t: "p",
            text: "Ten steps at 95% each succeeded end to end only 60.4% of the time (0.95¹⁰). One retry per step raised it to 97.5% for 28% more cost, and a second retry added little. Fewer steps was the strongest lever: four steps with one retry reached 99.0% at under half the cost and latency." },
          { t: "p",
            text: "Running the eight specialist steps as two parallel stages kept the same success and cost but cut p50 latency from 23.3 to 11.9 seconds. Real failures are not all detectable, so these are upper bounds: an undetected wrong answer passes every retry. That is why the reviewer step and the evaluation set matter more than adding agents." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: the assistant that refunded twice",
      body: [
        { t: "p",
          text: "**Symptom.** Finance found a cluster of orders refunded two or three times, all handled by the support assistant during an afternoon of high latency on the payments API." },
        { t: "p",
          text: "**Mechanism.** The refund tool timed out after the payment provider had accepted the request. The agent saw an error, retried, and the second call succeeded too. Nothing in the tool made the call idempotent, and the agent had no way to check what had already happened." },
        { t: "p",
          text: "**Fix.** Every side-effecting tool takes an idempotency key derived from the conversation and the action, as payment APIs do. Tools return the current state after a timeout instead of a bare error, refunds above a small amount need human confirmation, and a per-conversation limit caps the total refunded." }
      ] }
  ],

  takeaways: [
    "LLM systems add three constraints: **expensive tokens**, **fluent wrong answers** and **compounding failures** across calls.",
    "RAG at scale: hybrid retrieval, a reranker, **permissions enforced at retrieval**, citations and faithfulness checks.",
    "100M chunks at 768 dimensions is **307 GB** of float vectors; product quantisation brings it near **10 GB**.",
    "Prefill is compute-bound, decode memory-bound. For 1,500-token prompts at 10K QPS, prefill was **531 of 643** nodes.",
    "Prefix caching (643 → **289** nodes) and routing to a small model (→ **148**) beat quantisation (→ **129**).",
    "A semantic cache was unsafe on short questions: at 0.80, **20%** paraphrase hits against **10%** wrong answers.",
    "Ten steps at 95% each succeed **60%** of the time; one retry gives **97.5%**; fewer steps beat more retries.",
    "Parallel stages halve latency (p50 **23.3 → 11.9 s**) without changing success or cost.",
    "Side-effecting tools need **idempotency keys**, limits, confirmation and full traces."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "Where should document permissions be enforced in an enterprise RAG system?",
        options: [
          "In the system prompt, by telling the model what to skip over",
          "In the retrieval query, filtering by the user's groups",
          "After generation, by scanning the answer for leaks",
          "During ingestion, by storing one index per user"
        ],
        answer: 1,
        why: "Filtering inside retrieval guarantees forbidden text never reaches the model. Prompts are not security controls, post-scanning misses paraphrased leaks, and one index per user does not scale." },
      { stem: "For long prompts and short answers, which phase dominates the serving fleet?",
        options: [
          "Decode, because it is memory-bound",
          "Prefill, because it is compute-bound",
          "Tokenisation, run on the CPU side",
          "Network transfer of the final answer"
        ],
        answer: 1,
        why: "Prefill does about 2 × parameters FLOPs per prompt token; with 1,500 prompt tokens it took 531 of 643 nodes. Prefix caching attacks exactly that cost." },
      { stem: "What did the semantic-cache test show for a 0.80 similarity threshold?",
        options: [
          "Most paraphrases hit, and no near-miss got a wrong answer",
          "Few paraphrases hit; some near-misses got wrong answers",
          "Every near-miss was rejected, and most paraphrases hit",
          "The threshold changed nothing for either kind of question"
        ],
        answer: 1,
        why: "20% of paraphrases hit, while 10% of near-misses such as 'get' against 'apply' a promo code received the other question's answer. One-word differences are what embeddings blur." },
      { stem: "A ten-step agent workflow succeeds 60% of the time. Which change helped most in the simulation?",
        options: [
          "Running the steps in parallel stages instead",
          "Fewer steps, with a retry on each one",
          "A second retry added on top of the first",
          "Giving each agent a longer system prompt"
        ],
        answer: 1,
        why: "Four steps with one retry reached 99.0% at under half the cost; parallel stages changed latency only, and a second retry added 2.4 points. Fewer calls means fewer chances to fail." }
    ] },

  interview: { title: "In an interview",
    sub: "LLM design questions are cost, quality and control questions.",
    questions: [
      { level: "core",
        q: "Design a question-answering system over a company's 10 million internal documents.",
        strong: "A strong answer covers ingestion, hybrid retrieval, permissions, reranking, citations, evaluation and freshness.",
        answer: [
          { t: "p",
            text: "Ingestion from each source with change events: parse, chunk to a few hundred tokens with headings kept, embed, and store vectors, text and ACLs. Retrieval combines BM25 and vector search filtered by the user's groups, a cross-encoder reranks to the top few chunks, and the model answers with citations or says it does not know." },
          { t: "p",
            text: "Evaluation is a labelled question set measuring retrieval recall and answer faithfulness, run on every change to chunking, embeddings or prompts. Online, I track citation clicks, thumbs-down and escalations. The index is about 307 GB in float32 for 100M chunks, so I would quantise it and shard by tenant or source." }
        ] },
      { level: "advanced",
        q: "Serve an LLM feature at 10K QPS. Where does the cost go and how do you cut it?",
        strong: "A strong answer separates prefill from decode, estimates both, and ranks the levers by measured effect.",
        answer: [
          { t: "p",
            text: "Estimate tokens first: 10K QPS × 1,500 prompt tokens is 15M prompt tokens a second, which is a compute problem; 2.5M output tokens a second is a memory-bandwidth problem. With stated hardware figures that came to about 640 nodes, most of it prefill." },
          { t: "p",
            text: "Levers in order of effect: prefix caching of shared system prompts and context, routing easy traffic to a small model, shorter prompts through better retrieval, then quantisation and disaggregated prefill and decode. Latency targets limit the batch size, so I would set a time-to-first-token and tokens-per-second SLO and size against them." }
        ] },
      { level: "advanced",
        q: "How would you make a support assistant that can issue refunds safe?",
        strong: "A strong answer treats tools as an API with permissions, limits, idempotency, confirmation, escalation and audit.",
        answer: [
          { t: "p",
            text: "The model proposes actions; the tools enforce policy. Each tool is scoped to the authenticated customer, takes an idempotency key, has amount and frequency limits, and returns state rather than bare errors. Refunds above a threshold need human confirmation, and low confidence or repeated failure hands the conversation to an agent with the full trace." },
          { t: "p",
            text: "Before launch, a red-team set of conversations tries to trigger wrong or repeated refunds, and in production I would monitor refund rate and amount per conversation against the human baseline." }
        ] }
    ] }
});
