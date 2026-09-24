/* ============================================================================
   LESSON 10.1 — Async and the Event Loop
   The 0.41s versus 0.83s measurement is executed output from
   scratchpad/adk/n1.py on google-adk 2.9.2, after a warm-up run.
   ========================================================================= */
EC.receiveLesson({
  id: "10.1",

  lede: "**ADK is async all the way down, and the one thing that breaks it is a tool that blocks.** Every method you have met in this course — `run_async`, `get_session`, `save_artifact`, a tool's `run_async` — is a coroutine, because an agent spends almost all of its wall-clock time waiting: on the model, on an HTTP call, on a database. Get that right and two half-second tools take half a second. Get it wrong with one synchronous `requests.get` and you stall the loop for every concurrent conversation in the process, not just your own.",

  objectives: [
    "Explain why an agent framework is async and what it is waiting for",
    "Measure concurrent tool execution and say what makes it concurrent",
    "Write async tools, and handle blocking libraries correctly",
    "Recognise the symptoms of a blocked event loop",
    "Choose between `run_async`, `run` and `run_live`"
  ],

  prerequisites: ["4.3", "1.5"],

  blocks: [

    { t: "h2", n: "01", text: "What an agent is waiting for", id: "waiting" },

    { t: "p", text: "A turn that takes four seconds spends perhaps twenty milliseconds of that executing your Python. The rest is waiting: two or three model calls at a second or more each, a database query, an HTTP request to an upstream service. An agent is close to pure IO, which is exactly the workload asynchronous code exists for — one process can hold hundreds of conversations that are all waiting at once, because waiting costs nothing but a suspended coroutine." },

    { t: "diagram", kind: "timeline", title: "Where a four-second turn actually goes",
      caption: "Your code is the sliver. Everything else is a suspension point where another conversation's work can proceed — unless something blocks the loop.",
      span: 4, tick: 1,
      lanes: [
        { label: "Model call 1", bars: [[0, 1.2, "waiting on the provider", "accent"]] },
        { label: "Tool", bars: [[1.2, 1.9, "waiting on an API", "good"]] },
        { label: "Model call 2", bars: [[1.9, 3.9, "waiting on the provider", "accent"]] },
        { label: "Your code", bars: [[0, 0.05, "", "warn"], [1.2, 1.25, "", "warn"], [3.9, 3.95, "", "warn"]] }
      ] },

    { t: "h2", n: "02", text: "Concurrency, measured", id: "measured" },

    {"kind": "timeline", "title": "The same two tools, two shapes of turn", "caption": "Measured: 0.41s against 0.83s. The model decides which shape you get by emitting one function call or two in a single response — which is an argument for tools the model can ask for all at once.", "span": 1, "tick": 0.2, "lanes": [{"label": "One response", "bars": [[0, 0.4, "slow_a", "good"], [0, 0.4, "slow_b", "good"], [0.4, 0.41, "", "accent"]]}, {"label": "Sequential", "bars": [[0, 0.4, "slow_a", "warn"], [0.4, 0.42, "model", "accent"], [0.42, 0.82, "slow_b", "warn"]]}], "t": "diagram", "id": "dg-10_1-02-0"},



    { t: "p", text: "Two tools that each sleep for 0.4 seconds. In the first run, the model asks for both in a single response; in the second, it asks for one, gets the answer, and asks for the other." },

    { t: "code", lang: "python", title: "n1.py — the two shapes",
      code: `async def slow_a(city: str) -> dict:
    """Looks up the weather (slow)."""
    await asyncio.sleep(0.4)
    return {"city": city, "temp": 14}

# One model response containing two function calls:
both = LlmResponse(content=types.Content(role="model", parts=[
    types.Part(function_call=types.FunctionCall(name="slow_a", args={"city": "London"})),
    types.Part(function_call=types.FunctionCall(name="slow_b", args={"city": "London"})),
]))` },

    { t: "out", text: `  two async tools, one response: 0.41s
  same two tools, sequential calls: 0.83s` },

    { t: "p", text: "0.41 seconds for two 0.4-second tools — they ran at the same time. The sequential version is 0.83s, which is the two sleeps plus an extra model round trip. **Concurrency is decided by the model**, not by you: several function calls in one response are dispatched together, and one call per response is a chain. That is a strong argument for tool designs and instructions that let the model ask for everything at once, and it is why a tool taking a list often beats one the model has to call four times." },

    { t: "callout", kind: "insight", title: "Parallel tools versus ParallelAgent",
      body: [{ t: "p", text: "These are different mechanisms for the same idea at different levels. `ParallelAgent` (lesson 2.3) runs whole agents concurrently because you wired it that way. Parallel tool calls happen inside one agent because the model emitted several at once. You control the first and influence the second — through the instruction and through how you shape the tools." }] },

    { t: "h2", n: "03", text: "Writing tools that do not block", id: "tools" },

    { t: "table", head: ["Doing", "Wrong", "Right"],
      rows: [
        ["HTTP", "`requests.get(url)`", "`await client.get(url)` with `httpx.AsyncClient`"],
        ["Sleeping", "`time.sleep(1)`", "`await asyncio.sleep(1)`"],
        ["Database", "A synchronous driver", "asyncpg, aiomysql, aiosqlite (lesson 5.3)"],
        ["CPU work", "Inline in the tool", "`await asyncio.to_thread(fn, …)`, or a worker service"],
        ["A library with no async version", "Calling it directly", "`await asyncio.to_thread(legacy_call, …)`"]
      ] },

    { t: "code", lang: "python", title: "Wrapping a blocking library",
      code: `import asyncio

async def render_chart(rows: list[dict], tool_context) -> dict:
    """Renders a chart from rows and saves it as an artifact."""
    # matplotlib is synchronous and CPU-bound: keep it off the event loop.
    png = await asyncio.to_thread(_render_png, rows)
    part = types.Part.from_bytes(data=png, mime_type="image/png")
    version = await tool_context.save_artifact("chart.png", part)
    return {"saved": "chart.png", "version": version}`,
      caption: "`asyncio.to_thread` moves the work to a thread pool so the loop stays free. It is the right answer for a blocking library and a stopgap for genuinely heavy CPU work, which belongs in another service." },

    { t: "callout", kind: "trap", title: "A blocking tool stalls everyone",
      body: [{ t: "p", text: "One synchronous `requests.get` taking two seconds does not delay your conversation by two seconds — it freezes the entire event loop for two seconds, so every other conversation in the process stops too, including ones nowhere near that tool. The symptom is latency that gets worse with traffic in a way no single trace explains, and the cause is invisible in the trace of the request that suffered. Audit tools for synchronous IO the way you would audit them for credentials." }] },

    { t: "h2", n: "04", text: "Sync tools are allowed — and then wrapped", id: "sync" },

    { t: "p", text: "ADK accepts an ordinary `def` tool, which is right for anything that does not wait: arithmetic, formatting, a dictionary lookup, a quick validation. The rule is not \"always write `async def`\" — it is **anything that waits must await**. A synchronous function that never does IO is fine and simpler to read; a synchronous function that opens a socket is a production incident waiting for enough traffic." },

    { t: "h2", n: "05", text: "The three entry points", id: "entry" },

    { t: "table", head: ["Method", "Shape", "Use"],
      rows: [
        ["`run_async`", "`async for event in …`", "The real one. Every server should use it"],
        ["`run`", "A synchronous generator", "Scripts and notebooks. It drives a loop internally, so never call it from async code"],
        ["`run_live`", "Takes a `LiveRequestQueue`", "Bidirectional streaming — audio and video (lesson 10.2)"]
      ] },

    { t: "callout", kind: "warn", title: "Never call run() from async code",
      body: [{ t: "p", text: "It manages its own event loop, so calling it from inside a coroutine either raises or deadlocks depending on how your framework set things up. In a FastAPI handler, an ADK plugin or any async context, `run_async` is the only correct choice. `run` exists so a notebook cell does not need `asyncio.run`, and that is the whole of its purpose." }] },

    { t: "h2", n: "06", text: "Concurrency inside one conversation", id: "one" },

    { t: "p", text: "Two turns of the same session must not run at once. They read the same state and append to the same event list, and interleaving them produces a transcript where the deltas are applied in an order nobody intended. ADK does not prevent it — nothing stops two HTTP handlers calling `run_async` with the same session id simultaneously." },

    { t: "callout", kind: "good", title: "Serialise per session, concurrent across sessions",
      body: [{ t: "p", text: "The rule is one in-flight turn per session id. Most interfaces get it for free, because a user cannot send a second message while the first is still streaming — but an API, a retry, an impatient double-click or a reconnecting websocket can all break it. A lock keyed by session id, or a queue per conversation, is a small amount of code that prevents a confusing class of corruption. Different sessions should of course run concurrently; that is the whole point of the async design." }] },

    { t: "exercise", kind: "practice", title: "Measure it yourself", difficulty: "core", minutes: 22,
      prompt: "Write two async tools that each sleep 0.4s and time a turn where the model requests both in one response, then one where it requests them in sequence. Do a warm-up run first and explain why the number changes if you do not. Then replace one tool's `await asyncio.sleep` with `time.sleep`, run ten conversations concurrently with asyncio.gather, and compare total wall-clock time against the async version.",
      hints: [
        "Build the two-call response by hand as an LlmResponse with two function_call parts.",
        "Import and construction cost lands on the first measured run — warm up.",
        "The blocking version's total time should be roughly the sum, not the max."
      ],
      solution: {
        notes: [
          { t: "p", text: "The single-response version lands at about 0.41s and the sequential one at about 0.83s, and the gap is one sleep plus a model round trip. Without a warm-up the first measurement is dominated by imports and construction — mine read 2.75s — which is a good reminder that microbenchmarks measure whatever you forgot to exclude." },
          { t: "p", text: "The ten-concurrent-conversations test is the one that changes behaviour. With async tools the total is roughly the time of one conversation; with `time.sleep` it is roughly ten times that, because every conversation queues behind a frozen loop. That is the production failure mode in miniature: no single request looks slow in isolation, and throughput collapses as soon as there is traffic." }
        ]
      } }

  ],

  takeaways: [
    "An agent is almost pure IO — async is what lets one process hold many waiting conversations.",
    "Two 0.4s tools in one model response took 0.41s; requested sequentially they took 0.83s.",
    "The model decides what runs concurrently by emitting several calls in one response.",
    "Any tool that waits must `await`; wrap blocking libraries in `asyncio.to_thread`.",
    "One blocking call freezes the loop for every conversation in the process, not just its own.",
    "`run_async` in servers, `run` only in scripts, `run_live` for bidirectional streaming."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "Two async tools each take 0.4s and the model requests both in one response. How long does the tool phase take?",
      options: ["0.8s", "0.4s", "1.2s", "It depends on the thread pool"],
      answer: 1,
      why: "Function calls arriving in a single model response are dispatched together, so the two sleeps overlap — measured at 0.41s against 0.83s for the same tools requested one per response. The extra time in the sequential case is the second sleep plus another model round trip." },
    { stem: "A tool uses `requests.get`, which takes two seconds. What is the effect on other conversations in the same process?",
      options: ["None — they run on other threads", "They all stall for two seconds", "They are queued but unaffected", "Only conversations using that tool stall"],
      answer: 1,
      why: "Synchronous IO blocks the event loop, and the loop is what every other coroutine in the process is waiting on. The symptom is throughput collapsing under load with no single slow trace to explain it, which is why auditing tools for blocking calls is worth doing deliberately." },
    { stem: "You are writing a FastAPI handler that runs an agent. Which method?",
      options: ["`run`", "`run_async`", "`run_live`", "Either run or run_async"],
      answer: 1,
      why: "`run` drives its own event loop, so calling it from inside a coroutine raises or deadlocks. `run_async` is the real entry point and the only correct one in any async context; `run` exists so a notebook cell does not need `asyncio.run` around it." },
    { stem: "Two requests arrive for the same session id at the same time. What should happen?",
      options: ["Both run — ADK serialises them", "One should wait; serialise per session id", "Both run on separate event loops", "The second should be rejected as a duplicate"],
      answer: 1,
      why: "ADK does not serialise them, and two concurrent turns read the same state and append to the same event list, producing an interleaved transcript with deltas applied in an unintended order. A lock or queue keyed by session id is the fix; different sessions should still run concurrently." }
  ] },

  interview: { title: "Interview", sub: "Async questions", questions: [
    { level: "Core", q: "Why is ADK async?",
      strong: "Because an agent is almost entirely waiting — on models, APIs and databases — so one process can hold many concurrent conversations.",
      answer: [{ t: "p", text: "A four-second turn is maybe twenty milliseconds of Python and the rest is IO: two or three model calls, a database read, an HTTP request. Async lets all of that waiting overlap, so a single process serves hundreds of conversations that are suspended rather than blocked. It also enables concurrency inside a turn: when the model emits two function calls in one response, ADK dispatches them together, which I have measured at 0.41 seconds for two 0.4-second tools against 0.83 for the same tools called one per response." }] },
    { level: "Core", q: "What happens if a tool does synchronous IO?",
      strong: "It blocks the event loop, so every concurrent conversation in that process stalls too.",
      answer: [{ t: "p", text: "The loop is single-threaded, so a `requests.get` or a `time.sleep` inside a tool freezes everything the process is doing, not just that conversation. The nasty part is how it presents: no individual request looks pathological, and latency degrades with traffic in a way the trace of any one request cannot explain. The fixes are boring — an async HTTP client, an async database driver, and `asyncio.to_thread` for a library with no async version or for CPU work. Synchronous tools are fine when they never wait; the rule is about waiting, not about the keyword." }] },
    { level: "Senior", q: "How do you handle concurrency within a single conversation?",
      strong: "Serialise per session id — ADK does not, and two concurrent turns corrupt the transcript.",
      answer: [{ t: "p", text: "Nothing in ADK stops two handlers calling `run_async` with the same session id at once, and if they do, both read the same state and both append events, so deltas land in an order nobody designed and the transcript interleaves two turns. Most chat interfaces avoid it accidentally because the user cannot send while a response is streaming, but an API client, a retry, a double-click or a reconnecting websocket will all produce it. I use a lock or a small queue keyed by session id so a conversation has at most one turn in flight, while different conversations run concurrently — which is the whole point of the async design and should not be given up to fix this. The related decision is what the second request should experience: queued behind the first, or rejected with a clear message, and that depends on whether it is a retry or a genuine second question." }] }
  ] }
});
