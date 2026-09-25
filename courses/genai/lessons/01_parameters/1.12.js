EC.receiveLesson({
  id: "1.12",

  lede: "Streaming does not make a response faster. It costs the same, takes the same total time, and produces the same tokens — what it changes is *when the user sees the first one*, and on a long answer that is the difference between 50 milliseconds and five and a half seconds. This lesson measures both numbers, shows which one moves with the prompt and which with the output, and works through the parts of a streaming client that are easy to get wrong: usage accounting, error handling mid-stream, and aborting.",

  objectives: [
    "Distinguish time-to-first-token from total generation time, and say what each depends on",
    "Explain why streaming changes perceived latency without changing total latency",
    "Read usage from a stream, and say why it arrives where it does",
    "Handle an error that occurs after the response has already started",
    "Identify the one case where streaming genuinely saves money"
  ],

  prerequisites: ["1.1", "1.5"],

  blocks: [

    /* ============================================================ 01 */
    { t: "h2", n: "01", id: "two-numbers", text: "Two latencies, and only one of them is the wait",
      sub: "TTFT is a property of the prompt; total time is a property of the output" },

    { t: "p", text: "Generation is sequential: the prompt is processed in one pass and then each output token requires its own forward pass (1.1). So the time until the first token appears and the time until the last one does are governed by completely different things — and streaming exposes the first." },

    { t: "code", lang: "python", title: "g112.py — both numbers, on the same generation", code: `for n_new in (20, 60, 120, 240):
    t0 = time.perf_counter()
    model.generate(ids, max_new_tokens=n_new, do_sample=False,
                   pad_token_id=tok.eos_token_id)
    whole = time.perf_counter() - t0                 # what a non-streaming caller waits

    seq = ids.clone()                                # and what a streaming caller waits
    t0 = time.perf_counter()
    with torch.no_grad():
        lg = model(seq).logits[0, -1]
    ttft = time.perf_counter() - t0                  # the first token is ready here
    ...
    print("%3d tokens: whole-response wait %7.1f ms   TTFT %6.1f ms   ratio %5.1fx"
          % (n_new, whole * 1000, ttft * 1000, whole / ttft))`,
      out: `   20 tokens: whole-response wait   535.1 ms   TTFT   38.6 ms   ratio  13.9x
   60 tokens: whole-response wait  1370.1 ms   TTFT   45.3 ms   ratio  30.2x
  120 tokens: whole-response wait  2761.4 ms   TTFT   43.9 ms   ratio  62.8x
  240 tokens: whole-response wait  5621.5 ms   TTFT   50.7 ms   ratio 110.9x`,
      hl: [9, 10],
      caption: "Time-to-first-token barely moves — 38.6 ms to 50.7 ms across a twelvefold change in output length. The whole-response wait grows in step with the output, reaching 110.9× the TTFT at 240 tokens." },

    { t: "p", text: "That flat TTFT column is the whole argument for streaming. The user's first evidence that anything is happening arrives at a time that does not depend on how long the answer will be. Without streaming, asking for a longer answer means a longer silence." },

    { t: "p", text: "What TTFT *does* depend on is the prompt, because the prompt has to be processed before any token can be produced:" },

    { t: "code", lang: "python", title: "g112.py — TTFT against prompt length", code: `for plen in (8, 64, 256, 512):
    pids = tok("word " * plen, return_tensors="pt").input_ids
    with torch.no_grad():
        model(pids)                    # warm
    t0 = time.perf_counter()
    with torch.no_grad():
        model(pids)                    # this single pass IS the prefill
    print("prompt %4d tokens -> prefill %7.1f ms" % (pids.shape[1], (time.perf_counter() - t0) * 1000))`,
      out: `  prompt    9 tokens -> prefill    46.1 ms (this IS the time to first token)
  prompt   65 tokens -> prefill    99.9 ms (this IS the time to first token)
  prompt  257 tokens -> prefill   404.1 ms (this IS the time to first token)
  prompt  513 tokens -> prefill   936.5 ms (this IS the time to first token)`,
      caption: "A 513-token prompt takes 936.5 ms before the first token can exist — twenty times the 46.1 ms of a 9-token prompt. This is the cost 1.5 warned about when it said a large window is not a target." },

    { t: "viz", title: "Where the time goes", caption: "Measured on GPT-2 for a 240-token answer. Streaming does not move the right-hand edge; it moves where the user starts receiving something.",
      svg: `<svg viewBox="0 0 760 220" width="100%" role="img" aria-label="Streaming against non-streaming latency">
  <text x="20" y="26" class="s-label">non-streaming</text>
  <rect x="20" y="36" width="42" height="30" rx="4" style="fill:var(--violet)" opacity="0.8"/>
  <rect x="62" y="36" width="618" height="30" rx="0" class="s-fill-2 s-stroke"/>
  <rect x="680" y="36" width="60" height="30" rx="4" style="fill:var(--good)" opacity="0.85"/>
  <text x="41" y="56" text-anchor="middle" class="s-sub" style="fill:var(--ink)">prefill</text>
  <text x="371" y="56" text-anchor="middle" class="s-sub">user sees nothing for 5,621 ms</text>
  <text x="710" y="56" text-anchor="middle" class="s-sub" style="fill:var(--ink)">all of it</text>

  <text x="20" y="104" class="s-label">streaming</text>
  <rect x="20" y="114" width="42" height="30" rx="4" style="fill:var(--violet)" opacity="0.8"/>
  <rect x="62" y="114" width="678" height="30" rx="4" style="fill:var(--good)" opacity="0.45"/>
  <text x="41" y="134" text-anchor="middle" class="s-sub" style="fill:var(--ink)">prefill</text>
  <text x="401" y="134" text-anchor="middle" class="s-sub" style="fill:var(--ink)">tokens arrive steadily from 50.7 ms onward</text>

  <line x1="62" y1="160" x2="62" y2="178" style="stroke:var(--accent)" stroke-width="1.4"/>
  <text x="62" y="194" text-anchor="middle" class="s-mono" style="fill:var(--accent)">50.7 ms</text>
  <line x1="740" y1="160" x2="740" y2="178" style="stroke:var(--line)" stroke-width="1.4"/>
  <text x="726" y="194" text-anchor="end" class="s-mono">5,621 ms</text>
  <text x="380" y="214" text-anchor="middle" class="s-sub">same tokens, same cost, same total time — a 110.9x difference in when the first one lands</text>
</svg>` },

    /* ============================================================ 02 */
    { t: "h2", n: "02", id: "the-client", text: "Reading a stream properly",
      sub: "Three details, and usage is the one people miss" },

    { t: "code", lang: "python", title: "stream.py", code: `stream = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Tell me a story"}],
    stream=True,
    stream_options={"include_usage": True},    # without this, usage never arrives
)

parts, usage, finish = [], None, None
for chunk in stream:
    if chunk.choices:                          # the usage chunk has NO choices
        delta = chunk.choices[0].delta
        if delta.content:
            parts.append(delta.content)
            emit(delta.content)                # to the UI, immediately
        if chunk.choices[0].finish_reason:
            finish = chunk.choices[0].finish_reason
    if chunk.usage:                            # arrives in the LAST chunk only
        usage = chunk.usage

text = "".join(parts)
if finish == "length":                         # 1.5 -- still applies to streams
    raise Truncated(text)`,
      hl: [6, 10, 17],
      caption: "Three things that bite. `include_usage` is off by default. The final usage chunk carries no `choices`, so indexing `chunk.choices[0]` unguarded raises on the last chunk. And `finish_reason` arrives on its own chunk, after the content." },

    { t: "callout", kind: "trap", title: "Usage arrives at the end, which is too late for a budget check",
      body: [
        { t: "p", text: "You cannot learn a request's token count from a stream until the stream has finished — the totals come in the final chunk. So a per-user budget enforced from `usage` is always enforced one request late." },
        { t: "p", text: "For hard limits, count the input yourself before sending (1.14) and bound the output with `max_tokens`. Those two are known in advance; `usage` is an audit record, not a control." },
        { t: "p", text: "There is a subtler version of the same problem: if the connection drops mid-stream, no usage chunk ever arrives — but the server generated and billed for the tokens it produced. Reconciling an LLM bill against your own logs will show this gap, and the explanation is almost always abandoned streams." }
      ] },

    /* ============================================================ 03 */
    { t: "h2", n: "03", id: "errors", text: "An error after the response has started",
      sub: "HTTP 200, and then something goes wrong at token 400" },

    { t: "p", text: "A non-streaming request either succeeds or fails, and you find out before you have anything. A stream returns HTTP 200 as soon as the first chunk is ready — so an error at token 400 arrives *after* you have already shown the user 399 tokens." },

    { t: "ul", items: [
      "**Content filtering mid-stream.** Some providers stream a partial response and then terminate it with `finish_reason: \"content_filter\"`. The user has already read the part that was allowed through.",
      "**Connection drops.** A network failure at token 400 is indistinguishable, from the client's side, from a response that simply ended — unless you check that a `finish_reason` arrived. Without that check, a truncated stream is silently treated as a complete answer.",
      "**Rate limits on the follow-up.** In an agent loop, a stream can complete and the *next* request can be rate-limited, leaving a half-finished interaction on screen.",
      "**Provider-side errors** can appear as an error object in the stream body rather than as an HTTP status, which is a case client libraries handle inconsistently."
    ] },

    { t: "code", lang: "python", title: "stream_safe.py — the check that catches a dropped stream", code: `parts, finish = [], None
try:
    for chunk in stream:
        ...
except (httpx.ReadError, httpx.RemoteProtocolError) as e:
    log.warning("stream broke after %d chars: %s", sum(map(len, parts)), e)
    finish = "interrupted"

if finish is None:
    # The loop ended without a finish_reason: the connection closed cleanly
    # but the response never completed. This is NOT a finished answer.
    finish = "interrupted"

if finish in ("interrupted", "length"):
    mark_partial(text)          # the UI must be able to say so`,
      hl: [8, 9, 10, 11],
      caption: "`finish is None` after the loop is the tell. It is the only way to distinguish a response that ended from a connection that stopped, and it is the check most streaming clients omit." },

    { t: "callout", kind: "warn", title: "Design the UI for partial answers before you need to",
      body: [
        { t: "p", text: "Streaming means the user can be reading an answer that turns out to be incomplete or blocked. If the interface has no way to say \"this was cut off\", the only options at failure time are to leave a truncated answer looking complete or to delete text the user was mid-way through reading." },
        { t: "p", text: "Both are bad, and both are avoidable with a state the component already needs: the answer is *streaming*, *complete*, or *interrupted*. Deciding that at design time costs nothing; retrofitting it costs a redesign." }
      ] },

    /* ============================================================ 04 */
    { t: "h2", n: "04", id: "cost", text: "The one case where streaming saves money",
      sub: "Aborting, and only aborting" },

    { t: "p", text: "Streaming and non-streaming cost the same for the same tokens. The exception is that a stream can be abandoned: if you stop reading and close the connection, the server stops generating, and the tokens that were never produced are never billed." },

    { t: "code", lang: "python", title: "abort.py", code: `stream = client.chat.completions.create(..., stream=True)

parts = []
for chunk in stream:
    if not chunk.choices:
        continue
    piece = chunk.choices[0].delta.content or ""
    parts.append(piece)

    if is_going_wrong("".join(parts)):      # a guardrail, a length cap, a user cancel
        stream.close()                      # stops generation server-side
        break`,
      caption: "The abort has to actually close the connection. Breaking out of the loop without closing leaves the server generating into a buffer nobody reads — and billing for it." },

    { t: "p", text: "Three situations make this worth building. A **user navigating away** from a long answer — in a chat UI this is common, and closing the stream on unmount is a small change with a real saving. An **output guardrail** that can act on a partial response (11.14) and stop it before completion. And a **repetition detector** catching a model that has entered a loop (1.4) rather than paying for four hundred more tokens of it." },

    /* ============================================================ exercise */
    { t: "exercise", kind: "Challenge", title: "Work out when streaming stops being worth the complexity",
      difficulty: "core", minutes: 20,
      body: [
        { t: "p", text: "Streaming adds real complexity: partial-state UI, mid-stream error handling, usage that arrives late. For a short answer it buys almost nothing, because the whole response arrives quickly either way." },
        { t: "p", text: "Find the crossover for a given perceived-latency budget." }
      ],
      requirements: [
        "Model TTFT as a function of prompt length using the measured prefill figures",
        "Model total time as TTFT plus a per-output-token cost derived from the 240-token measurement",
        "For prompts of 100, 500 and 2,000 tokens, find the output length at which the non-streaming wait exceeds 1 second",
        "Report the same for a 3-second threshold",
        "State one reason to stream even below the crossover"
      ],
      hint: "From the measurements: prefill is roughly linear in prompt length, and per-output-token time is `(5621.5 - 50.7) / 239` ms. Solve for the output length where `prefill + n × per_token` crosses the threshold.",
      solution: { lang: "python", title: "g112_ex.py",
        code: `# Measured on GPT-2 in g112.py
PREFILL = {9: 46.1, 65: 99.9, 257: 404.1, 513: 936.5}      # ms
PER_TOKEN = (5621.5 - 50.7) / 239                          # ms per output token

# prefill is close to linear: fit a line through the measured points
xs = list(PREFILL); ys = [PREFILL[x] for x in xs]
n  = len(xs)
slope = (n * sum(x * y for x, y in zip(xs, ys)) - sum(xs) * sum(ys)) \\
        / (n * sum(x * x for x in xs) - sum(xs) ** 2)
icpt  = (sum(ys) - slope * sum(xs)) / n

print("per output token : %.2f ms" % PER_TOKEN)
print("prefill fit      : %.3f ms/token + %.1f ms" % (slope, icpt))
print()

def prefill(p):  return slope * p + icpt
def total(p, o): return prefill(p) + o * PER_TOKEN

for threshold in (1000, 3000):
    print("threshold %d ms -- output length at which the silent wait exceeds it:" % threshold)
    for p in (100, 500, 2000):
        n_out = next((o for o in range(1, 5000) if total(p, o) > threshold), None)
        print("  prompt %4d tokens: prefill %6.1f ms, crosses at %s output tokens"
              % (p, prefill(p), n_out if n_out else "never"))
    print()`,
        out: `per output token : 23.31 ms
prefill fit      : 1.785 ms/token + -5.1 ms

threshold 1000 ms -- output length at which the silent wait exceeds it:
  prompt  100 tokens: prefill  173.5 ms, crosses at 36 output tokens
  prompt  500 tokens: prefill  887.6 ms, crosses at 5 output tokens
  prompt 2000 tokens: prefill 3565.6 ms, crosses at 1 output tokens

threshold 3000 ms -- output length at which the silent wait exceeds it:
  prompt  100 tokens: prefill  173.5 ms, crosses at 122 output tokens
  prompt  500 tokens: prefill  887.6 ms, crosses at 91 output tokens
  prompt 2000 tokens: prefill 3565.6 ms, crosses at 1 output tokens`,
        notes: [
          { t: "p", text: "At a one-second budget and a 100-token prompt, the crossover is 36 output tokens — about a sentence. Almost any real answer is longer than that, which is why streaming is the default for anything a person reads: the threshold is crossed before the answer has said anything." },
          { t: "p", text: "The 2,000-token prompt row is the interesting one. Prefill alone is 3,566 ms, so the wait exceeds both thresholds before a single output token exists — and **streaming does not help at all**, because there is nothing to stream until prefill finishes. On a long-prompt request the user stares at a spinner regardless, and the lever is prompt length (11.8) or prompt caching (1.13), not streaming." },
          { t: "p", text: "The reason to stream below the crossover is that the crossover is about *this* request. Load, a longer-than-usual answer, or a provider having a slow minute all push the real number past it, and a client that only streams sometimes has two code paths, two sets of bugs, and a partial-state UI that is exercised rarely enough to be broken when it is needed." }
        ] } },

    /* ============================================================ scenario */
    { t: "callout", kind: "scenario", title: "Incident: the chat feature whose token bill was 30% higher than its logs",
      body: [
        { t: "p", text: "**Symptom.** Monthly reconciliation showed the provider's invoice consistently about 30% above the sum of `completion_tokens` recorded in the application's own logs. The gap was stable month to month, which ruled out a pricing error and made it look like a metering dispute." },
        { t: "p", text: "**What was happening.** The chat UI streamed responses. When a user navigated away or asked a follow-up question before the answer finished, the front end simply dropped the component — and the HTTP connection stayed open until it timed out. The server kept generating to completion. The client, having stopped reading, never received the final usage chunk, so nothing was logged for those requests at all." },
        { t: "p", text: "**Mechanism.** Two things compounding. Usage arrives only in the last chunk, so an abandoned stream logs nothing — the request became invisible rather than partially counted. And abandoning a stream without closing it does not stop generation; the server produces every token the request asked for and bills for all of them. About one response in four was being abandoned, each one billed in full and logged as zero." },
        { t: "p", text: "**Fix.** `stream.close()` on component unmount, which both stopped the generation and cut the real cost. Then a server-side record written at request time — model, prompt tokens, `max_tokens` — so that a request is logged even when its response never completes. That second change is the durable one: any metric derived only from a successful response is blind to exactly the failures you most want to see, which is 10.6's argument about what every span must carry." }
      ] }
  ],

  takeaways: [
    "Streaming does not make a response faster. Same tokens, same cost, same total time — it changes **when the first token arrives**.",
    "**TTFT is a property of the prompt; total time is a property of the output.** Measured, TTFT moved only 38.6 → 50.7 ms across a twelvefold change in output length, while the whole-response wait grew to **110.9×** the TTFT.",
    "Prefill is what you are waiting for: a 513-token prompt took **936.5 ms** against 46.1 ms for a 9-token one. Streaming cannot help before prefill finishes.",
    "`stream_options={\"include_usage\": True}` is off by default, and the usage chunk carries **no `choices`** — indexing `chunk.choices[0]` unguarded raises on the last chunk.",
    "**Usage arrives at the end**, so it is an audit record rather than a control. Enforce budgets by counting input yourself and bounding output with `max_tokens`.",
    "A stream returns HTTP 200 before the response is complete, so errors arrive **after** the user has read part of the answer — content filtering, dropped connections, provider errors in the body.",
    "**`finish_reason is None` after the loop means the stream was interrupted**, not that the answer ended. It is the only way to tell, and it is the check most clients omit.",
    "The one case where streaming saves money is **aborting** — and the abort must close the connection, or the server generates and bills for tokens nobody reads.",
    "At a one-second perceived-latency budget with a 100-token prompt, the crossover is **36 output tokens** — about a sentence, which is why streaming is the default for anything a person reads.",
    "On a 2,000-token prompt, prefill alone is about 3,566 ms and **streaming does not help at all**. The lever there is prompt length or prompt caching."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "You switch a 240-token response from non-streaming to streaming. What changes?",
        options: ["The response completes faster", "The user sees the first token about 110 times sooner; the total time and cost are unchanged", "The cost falls by about half", "The model generates fewer tokens"],
        answer: 1,
        why: "Measured, TTFT was 50.7 ms against a whole-response wait of 5,621.5 ms — a 110.9× difference in when the first token lands, with the last token arriving at the same moment either way. Streaming redistributes the waiting; it does not reduce it. Cost is identical per token, and the only way streaming saves money is aborting, which is a separate decision. The model generates exactly the same tokens." },

      { stem: "Your streaming client crashes with an IndexError on the last chunk. Why?",
        options: ["The stream was interrupted", "The final usage chunk has an empty `choices` array", "`finish_reason` was not set", "max_tokens was exceeded"],
        answer: 1,
        why: "When `include_usage` is enabled, the last chunk carries the totals and no choices at all, so `chunk.choices[0]` raises — the fix is to guard with `if chunk.choices:` before indexing. An interrupted stream ends without raising, which is precisely why it needs the separate `finish is None` check. A missing `finish_reason` and exceeding `max_tokens` both produce quiet wrong behaviour rather than an IndexError." },

      { stem: "A user navigates away mid-stream and your client just stops reading. What happens?",
        options: ["The server stops generating and you are billed for what was produced", "The server keeps generating and bills for every token, and you log nothing because the usage chunk never arrives", "The request is cancelled automatically", "The tokens are refunded"],
        answer: 1,
        why: "Abandoning a stream without closing the connection leaves the server generating to completion, and because usage arrives only in the final chunk the client records nothing at all — the request becomes invisible rather than partially counted, which is exactly the 30% gap in §04. Calling `stream.close()` is what actually stops generation. Nothing is cancelled automatically and nothing is refunded; the work was done." },

      { stem: "Your prompt is 2,000 tokens and users complain about a slow spinner. Does streaming help?",
        options: ["Yes — streaming always reduces perceived latency", "No — prefill alone is several seconds and there is nothing to stream until it finishes", "Yes, if you also raise max_tokens", "Only if the answer is short"],
        answer: 1,
        why: "The first token cannot exist until the prompt has been processed, and the measured prefill was 936.5 ms at 513 tokens, and the fitted line puts 2,000 tokens at about 3,566 ms — so the spinner is showing during prefill, which streaming has no access to. The levers there are cutting the prompt or caching its static prefix so the prefill is not repeated. Raising `max_tokens` would lengthen the response and make the total wait worse. Answer length is irrelevant to a delay that occurs before generation starts." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "Streaming questions usually start easy and then move to the client, where the real engineering is.",
    questions: [
      { level: "core",
        q: "What does streaming actually buy you?",
        strong: "A strong answer separates perceived from total latency and has numbers for both.",
        answer: [
          { t: "p", text: "Perceived latency, not real latency. The same tokens are generated in the same total time at the same cost — what changes is that the user sees the first one almost immediately instead of after the whole response." },
          { t: "p", text: "The numbers make it concrete. On a 240-token answer I measured TTFT at 50.7 ms and the whole-response wait at 5,621 ms — a factor of 110. And TTFT barely moved as the output grew from 20 to 240 tokens, because it is a property of the prompt rather than the answer." },
          { t: "p", text: "Which leads to the caveat worth volunteering: if the prompt is long, streaming does not help, because nothing can stream until prefill finishes. At 2,000 prompt tokens that is over three seconds of spinner and the lever is prompt length or caching, not streaming." }
        ] },

      { level: "core",
        q: "What do you have to get right in a streaming client?",
        strong: "A strong answer names usage accounting, the empty-choices chunk, and the interrupted-stream check.",
        answer: [
          { t: "p", text: "Three things. `stream_options={\"include_usage\": True}` is off by default, so without it you never learn the token counts at all. The final usage chunk has an empty `choices` array, so unguarded `chunk.choices[0]` raises on the last chunk of every stream — a bug that only appears once the first one is fixed." },
          { t: "p", text: "Third and most important: checking that a `finish_reason` actually arrived. If the loop ends without one, the connection closed before the response completed — and that is indistinguishable from a finished answer unless you look. Most clients do not, so a truncated stream is silently presented as a complete answer." },
          { t: "p", text: "And a design point rather than a code one: the UI needs three states — streaming, complete, interrupted. Without the third, the failure case leaves you choosing between showing a truncated answer as if it were whole and deleting text the user is reading." }
        ] },

      { level: "advanced",
        q: "Our invoice is consistently 30% above the completion tokens in our logs. Where would you look?",
        strong: "A strong answer reaches abandoned streams quickly and identifies both halves of the failure.",
        answer: [
          { t: "p", text: "Abandoned streams would be my first hypothesis, and it explains a stable gap rather than a noisy one. Two things compound. Usage arrives only in the final chunk, so a stream the client stops reading logs nothing at all — the request becomes invisible rather than partially counted." },
          { t: "p", text: "And abandoning a stream does not stop generation. Unless the connection is explicitly closed, the server produces every token the request asked for and bills for all of them. So each abandoned response is billed in full and logged as zero, which is exactly the shape of a persistent one-directional gap." },
          { t: "p", text: "Checking it is easy: count streams that ended without a `finish_reason`, or compare request counts against completed-response counts. In a chat UI a quarter of responses being abandoned is entirely normal, because users ask follow-ups before the answer finishes." },
          { t: "p", text: "Two fixes. `stream.close()` on unmount, which cuts the real cost. And a server-side record written at request time rather than at response time, so a request is logged even when the response never completes — otherwise every metric you have is blind to exactly the failures you most want to see." }
        ] },

      { level: "advanced",
        q: "Would you stream a response that is being parsed as JSON?",
        strong: "A strong answer notes that partial JSON is not parseable and weighs what streaming is for.",
        answer: [
          { t: "p", text: "Usually not, and the reason is that a partial JSON document is not valid JSON — you cannot do anything with the stream until it is complete, so the perceived-latency benefit that justifies the complexity is not available." },
          { t: "p", text: "The exception is when a human is watching something being built: a form filling in field by field, a table growing a row at a time. Then an incremental parser that tolerates truncation is worth it, and there are good ones. But that is a UI decision, not a latency one." },
          { t: "p", text: "For a machine consumer, I would not stream. You get the complexity — partial state, mid-stream errors, usage arriving late — and none of the benefit, because your code cannot act on half an object anyway. I would spend the effort on the guarantee instead: a schema under structured output (1.8), so that when it does arrive it is correct by construction." }
        ] }
    ]
  }
});
