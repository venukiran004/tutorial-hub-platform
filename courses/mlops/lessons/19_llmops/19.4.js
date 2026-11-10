/* ============================================================================
   LESSON 19.4 — Cost, Latency and Reliability
   ========================================================================= */
EC.receiveLesson({
  id: "19.4",

  lede: "An LLM feature's running cost is counted in tokens, its latency comes in two kinds, and its availability depends on a provider you do not operate. Tokens make cost a per-request quantity that moves with every prompt and retrieval change. Latency splits into time to first token, which grows with the prompt, and time per output token, which grows with the answer. Availability needs the same planning as any critical dependency: rate limits, outages, a fallback. This lesson counts tokens with a real tokenizer, measures both latencies on a real model, simulates a provider's month, and builds the budget alert that fires before the invoice.",

  objectives: [
    "Account for cost per request in input and output tokens, and project it to a month",
    "Measure time to first token and time per output token, and know what drives each",
    "Set SLIs for tokens, TTFT and TPOT alongside error rates",
    "Plan for provider outages and rate limits with fallbacks",
    "Alert on projected spend, not month-to-date spend"
  ],

  prerequisites: ["19.1", "12.2", "10.5"],

  blocks: [
    { t: "h2",
      n: "01",
      id: "measure",
      text: "Tokens, two latencies, one provider",
      sub: "Measured and simulated" },
    { t: "p",
      text: "The script counts tokens for a support prompt with 2 and 8 retrieved chunks using GPT-2's tokenizer, and prices them at illustrative rates of $3 per million input tokens and $15 per million output tokens. It then streams 40 tokens from GPT-2 on the CPU at three prompt lengths, recording when the first token and each later token arrive, and finally simulates a month of a provider with six outages and occasional rate limits, with and without a second provider." },
    { t: "code",
      lang: "python",
      title: "llmcost.py — token cost, TTFT and TPOT, and a provider's month",
      code: `import threading, time
import numpy as np, torch
from transformers import AutoModelForCausalLM, AutoTokenizer, TextIteratorStreamer

tok = AutoTokenizer.from_pretrained("gpt2"); model = AutoModelForCausalLM.from_pretrained("gpt2").eval()
torch.set_num_threads(4)

print("== 1. token accounting (prices are illustrative: $3 per 1M input tokens, $15 per 1M output tokens) ==")
system = "You are a support assistant. Answer only from the context. If the context does not contain the answer, say so. " * 3
chunk = "Orders can be returned within 14 days of delivery. Refunds are issued to the original payment method. " * 6
for k in (2, 8):
    n_in = len(tok(system + chunk * k + "Question: can I return a gift?").input_ids); n_out = 150
    cost = n_in * 3 / 1e6 + n_out * 15 / 1e6
    print(f"  {k} retrieved chunks: {n_in:>5} input + {n_out} output tokens = \${cost * 1000:.2f} per 1,000 requests; "
          f"\${cost * 50_000 * 30:,.0f} a month at 50,000 requests a day")

print("\\n== 2. time to first token and time per output token, measured on GPT-2 (CPU) ==")
def stream(prompt, new=40):
    ids = tok(prompt, return_tensors="pt").input_ids
    st = TextIteratorStreamer(tok, skip_prompt=True, timeout=120)        # fail instead of waiting forever
    th = threading.Thread(target=model.generate, kwargs=dict(input_ids=ids, max_new_tokens=new, do_sample=False,
                                                             streamer=st, pad_token_id=tok.eos_token_id))
    t0 = time.perf_counter(); th.start(); times = []
    for _ in st: times.append(time.perf_counter() - t0)
    th.join()
    return ids.shape[1], times[0] * 1000, (times[-1] - times[0]) / max(len(times) - 1, 1) * 1000
for k in (0, 3, 6):                                                  # GPT-2 has a 1,024-token context
    n, ttft, tpot = stream(system + chunk * k + "Question: can I return a gift? Answer:")
    print(f"  prompt {n:>4} tokens: TTFT {ttft:6.0f} ms, TPOT {tpot:5.1f} ms per token")

print("\\n== 3. a provider with outages: fallback or not (simulated month, one request a second) ==")
rng = np.random.default_rng(37)
T = 30 * 24 * 3600
down_a = np.zeros(T, bool)
for start in rng.choice(T - 3600, 6, replace=False): down_a[start:start + rng.integers(300, 2400)] = True   # six outages
limited = rng.random(T) < 0.004                                                                           # 429 rate limits
fail_a = down_a | limited
down_b = np.zeros(T, bool)
for start in rng.choice(T - 3600, 6, replace=False): down_b[start:start + rng.integers(300, 2400)] = True
print(f"  primary only: {1 - fail_a.mean():.3%} of requests served ({fail_a.sum():,} failed)")
both = fail_a & down_b
print(f"  with a fallback provider: {1 - both.mean():.4%} served ({both.sum():,} failed, when both were down together)")`,
      out: `== 1. token accounting (prices are illustrative: $3 per 1M input tokens, $15 per 1M output tokens) ==
  2 retrieved chunks:   332 input + 150 output tokens = $3.25 per 1,000 requests; $4,869 a month at 50,000 requests a day
  8 retrieved chunks:  1088 input + 150 output tokens = $5.51 per 1,000 requests; $8,271 a month at 50,000 requests a day

== 2. time to first token and time per output token, measured on GPT-2 (CPU) ==
  prompt   82 tokens: TTFT    151 ms, TPOT  23.7 ms per token
  prompt  460 tokens: TTFT    529 ms, TPOT  24.5 ms per token
  prompt  838 tokens: TTFT    975 ms, TPOT  28.4 ms per token

== 3. a provider with outages: fallback or not (simulated month, one request a second) ==
  primary only: 99.316% of requests served (17,722 failed)
  with a fallback provider: 99.9987% served (34 failed, when both were down together)` },
    { t: "viz",
      title: "Time to first token by prompt length, GPT-2 on CPU",
      caption: "The prompt is processed in full before the first token appears, so TTFT grew sixfold with prompt length; the time per later token barely moved.",
      svg: `<svg viewBox="0 0 760 134" width="100%" role="img">
<text x="190" y="31.0" text-anchor="end" class="s-label">prompt 82 tokens: TTFT</text>
<rect x="200" y="14" width="59.6" height="26" rx="4" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="267.6" y="31.0" class="s-sub">151 ms  (TPOT 23.7 ms)</text>
<text x="190" y="69.0" text-anchor="end" class="s-label">prompt 460 tokens: TTFT</text>
<rect x="200" y="52" width="208.9" height="26" rx="4" class="s-fill" style="stroke:var(--warn);stroke-width:1.8"/>
<text x="416.9" y="69.0" class="s-sub">529 ms  (TPOT 24.5 ms)</text>
<text x="190" y="107.0" text-anchor="end" class="s-label">prompt 838 tokens: TTFT</text>
<rect x="200" y="90" width="385.0" height="26" rx="4" class="s-fill" style="stroke:var(--crit);stroke-width:1.8"/>
<text x="593.0" y="107.0" class="s-sub">975 ms  (TPOT 28.4 ms)</text>
</svg>` },
    { t: "dl",
      items: [
        { term: "Retrieval sets the bill",
          def: "Going from 2 to 8 retrieved chunks took input from 332 to 1,088 tokens and the illustrative monthly cost from $4,869 to $8,271 at 50,000 requests a day, with no change in traffic. Every retrieval or prompt change is a cost change." },
        { term: "TTFT follows the prompt",
          def: "151 ms at 82 tokens, 529 ms at 460, 975 ms at 838: prefill processes the whole prompt before the first token. Long contexts make streaming start late." },
        { term: "TPOT follows decoding",
          def: "24 to 28 ms per token at every prompt length; a 300-token answer adds about 7 seconds. Shorter answers, smaller models or faster hardware move this one." },
        { term: "Fallbacks buy nines",
          def: "One provider served 99.316% of requests over the simulated month; failing over to a second served 99.9987%, failing only when both were down together." }
      ] },
    { t: "callout",
      kind: "trap",
      title: "Average latency for a streaming feature",
      body: [
        { t: "p",
          text: "Total response time averages TTFT and decoding together and hides which one users feel. Track TTFT (when the answer starts) and TPOT (how fast it flows) separately, at p50 and p95, and set SLOs on each. A prompt change can double TTFT while leaving the average almost unchanged." }
      ] },
    { t: "h2",
      n: "02",
      id: "reliability",
      text: "The provider as a dependency",
      sub: "Limits, outages, deprecations" },
    { t: "table",
      head: ["Failure", "Signal", "Response"],
      rows: [
        [
          "Rate limit (429)",
          "Errors under bursts",
          "Backoff with jitter, request queueing, higher tier or second key"
        ],
        [
          "Outage or high latency",
          "Errors, TTFT p95 jump",
          "Fail over to another snapshot or provider, circuit breaker (14.3)"
        ],
        ["Silent model update", "Eval drift, output length change", "Pin snapshots (19.1); canary new ones"],
        ["Deprecation", "Provider notice", "Track dates; migrate through the eval gate (19.3)"],
        ["Cost spike", "Tokens per request up", "Projected-spend alert; cap context and output length"]
      ] },
    { t: "exercise",
      kind: "Challenge",
      title: "An alert before the invoice",
      difficulty: "core",
      minutes: 20,
      body: [
        { t: "p",
          text: "Simulate a month of hourly LLM spend with daily traffic cycles and a $9,000 budget. At 14:00 on day 12 a prompt change doubles the cost per request. Compare two alerts: month-to-date spend passing the budget, and a projection (spend so far plus the last 24 hours' spend extended to the end of the month) passing it. Report when each fires and how much had been spent by then." }
      ],
      requirements: [
        "Hourly spend with a daily cycle and noise",
        "A step change in cost per request",
        "Both alert rules evaluated hourly",
        "Firing time and spend at firing for each"
      ],
      hint: "Use a full 24-hour window for the projection so the daily cycle cancels out; a shorter window would alert every afternoon.",
      solution: { lang: "python",
        title: "budget_alert.py",
        code: `import numpy as np
rng = np.random.default_rng(38)

# Hourly LLM spend for a month. Traffic follows the day; at 14:00 on day 12 a prompt change doubles retrieved context,
# which doubles input tokens per request. Budget: $9,000 for the month.
BUDGET, HOURS = 9_000.0, 30 * 24
hour_of_day = np.arange(HOURS) % 24
traffic = 6_000 * (0.4 + 0.6 * np.exp(-((hour_of_day - 14) / 5) ** 2)) * rng.lognormal(0, 0.08, HOURS)   # requests/hour
cost_per_req = np.where(np.arange(HOURS) >= 11 * 24 + 14, 0.0052, 0.0026)                                 # $ per request
spend = traffic * cost_per_req

def first_alert(rule):
    for h in range(24, HOURS):
        if rule(h): return h
    return None
# Rule A: alert when month-to-date spend passes the budget.
a = first_alert(lambda h: spend[:h + 1].sum() > BUDGET)
# Rule B: project the month from the last 24 hours and alert when the projection exceeds the budget.
b = first_alert(lambda h: spend[:h + 1].sum() + spend[h - 23:h + 1].sum() * (HOURS - h - 1) / 24 > BUDGET)
fmt = lambda h: "never" if h is None else f"day {h // 24 + 1}, {h % 24:02d}:00"
print(f"change shipped:                            day 12, 14:00")
print(f"alert when month-to-date passes budget:    {fmt(a)}  (spent \${spend[:a + 1].sum():,.0f} by then)" if a else "never")
print(f"alert when the 24-hour projection does:    {fmt(b)}  (spent \${spend[:b + 1].sum():,.0f} by then)")
print(f"month total if nothing is done: \${spend.sum():,.0f} against a \${BUDGET:,.0f} budget")`,
        out: `change shipped:                            day 12, 14:00
alert when month-to-date passes budget:    day 26, 03:00  (spent $9,013 by then)
alert when the 24-hour projection does:    day 12, 23:00  (spent $2,898 by then)
month total if nothing is done: $11,282 against a $9,000 budget`,
        notes: [
          { t: "p",
            text: "The projection alert fired at 23:00 on day 12, nine hours after the change, with $2,898 spent. The month-to-date alert fired on day 26, when the budget was already gone. Left alone, the month would have cost $11,282 against $9,000." },
          { t: "p",
            text: "The 24-hour window matters: it covers one full daily cycle, so normal afternoon peaks do not trigger the alert, while a change in cost per request does within a day. Pair it with a direct metric, tokens per request by feature and prompt version, so the alert also says why." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: the retrieval change that tripled the bill",
      body: [
        { t: "p",
          text: "**Symptom.** An assistant's monthly LLM invoice came in at three times the previous month, with flat traffic. Latency complaints had also risen." },
        { t: "p",
          text: "**Mechanism.** A retrieval improvement raised the number of chunks per request from 3 to 10 to improve recall. Input tokens per request tripled, and TTFT rose with them. Nobody tracked tokens per request, and the only cost alert fired at 100% of the monthly budget, in the last week." },
        { t: "p",
          text: "**Fix.** Tokens in and out per request by feature and prompt version became SLIs, retrieval changes go through the eval gate with a cost and TTFT check, context is capped by a token budget rather than a chunk count, and a projected-spend alert fires within a day of any change." }
      ] }
  ],

  takeaways: [
    "Cost is **tokens in × price + tokens out × price**: 2 → 8 chunks took input from **332** to **1,088** tokens and the illustrative month from **$4,869** to **$8,271**.",
    "**TTFT** grows with the prompt (**151 → 975 ms** from 82 to 838 tokens); **TPOT** stays about **24–28 ms**.",
    "Set SLOs on TTFT and TPOT separately, at p50 and p95.",
    "A fallback provider took simulated availability from **99.316%** to **99.9987%**.",
    "Treat the provider as a dependency: rate limits, outages, silent updates, deprecations.",
    "A 24-hour projected-spend alert fired **9 hours** after a cost change; month-to-date fired on **day 26**.",
    "Track tokens per request by feature and prompt version, so cost alerts say why."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "Doubling the retrieved context mostly increases which latency?",
        options: [
          "Time per output token, as each token costs more",
          "Time to first token, as the prompt is processed first",
          "Network latency to the provider, per byte that is sent",
          "Neither, since retrieval happens before the call"
        ],
        answer: 1,
        why: "TTFT rose from 151 to 975 ms with prompt length, while TPOT stayed near 24–28 ms. Network time and retrieval are separate and small by comparison." },
      { stem: "Why alert on projected spend rather than month-to-date spend?",
        options: [
          "Projections are much cheaper to compute",
          "Month-to-date fires after the money is gone",
          "Providers never report spend to date",
          "Projections never produce any false alarms at all"
        ],
        answer: 1,
        why: "Month-to-date crossed the budget on day 26; the projection fired nine hours after the change. Projections can false-alarm if the window is wrong, which the 24-hour window prevents." },
      { stem: "Why use a 24-hour window for the spend projection?",
        options: [
          "Providers bill in 24-hour increments",
          "It spans a full daily cycle, so peaks cancel out",
          "Shorter windows cannot be computed every hour",
          "It is the default window in every monitoring tool"
        ],
        answer: 1,
        why: "Traffic peaks each afternoon; a shorter window would project the peak across the month and alert daily. Billing increments and tool defaults are not the reason." },
      { stem: "How much did a second provider improve simulated availability?",
        options: [
          "Not at all, since outages are correlated",
          "From 99.316% to 99.9987%",
          "From 99.316% to exactly 100%",
          "From 99% to 99.5% at best"
        ],
        answer: 1,
        why: "Requests failed only when both providers were down at once, 34 in a month. Outages were independent in the simulation; correlated outages would reduce the gain." }
    ] },

  interview: { title: "In an interview",
    sub: "LLM operations answers should be in tokens and milliseconds.",
    questions: [
      { level: "core",
        q: "What SLIs would you track for an LLM feature?",
        strong: "A strong answer covers both latencies, tokens, cost, errors and quality.",
        answer: [
          { t: "p",
            text: "Time to first token and time per output token at p50 and p95; input and output tokens per request and cost per request, split by feature, prompt version and model snapshot; error and rate-limit rates by provider; fallback rate; and quality signals such as eval pass rates on sampled traffic, guardrail hits and user feedback (19.5). Each gets an owner and an alert tuned to its noise." }
        ] },
      { level: "advanced",
        q: "How do you reduce the cost of an LLM feature without hurting quality?",
        strong: "A strong answer ranks levers and gates each through evaluation.",
        answer: [
          { t: "p",
            text: "Measure where tokens go first. Then: cap retrieved context by a token budget and improve ranking so fewer chunks suffice; shorten system prompts; cache responses or prefixes where inputs repeat; route easy requests to a smaller model; cap output length where long answers add little. Every change goes through the eval gate (19.3) with cost and TTFT recorded beside quality, so savings are not bought with regressions." }
        ] },
      { level: "core",
        q: "Your provider returns 429s at peak. What do you do?",
        strong: "A strong answer handles the burst and the capacity.",
        answer: [
          { t: "p",
            text: "Retry with exponential backoff and jitter within a retry budget, queue non-interactive work, and smooth bursts. Then fix capacity: a higher rate-limit tier, spreading load across keys or regions, a second provider or smaller model for overflow, and shorter prompts, since limits are usually on tokens per minute as well as requests." }
        ] }
    ] }
});
