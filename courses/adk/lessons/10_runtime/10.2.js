/* ============================================================================
   LESSON 10.2 — Streaming
   The partial events, the final event and the two-event session are executed
   output from scratchpad/adk/n1.py on google-adk 2.9.2, with a model that
   yields fragments the way a streaming provider does.
   ========================================================================= */
EC.receiveLesson({
  id: "10.2",

  lede: "**Streaming does not make an agent faster; it makes waiting tolerable.** The same four seconds feels completely different when text appears after four hundred milliseconds and keeps coming than when a spinner sits there and then everything arrives at once. ADK gives you three modes — none, server-sent events, and bidirectional — and the thing worth understanding before you use any of them is which events are for showing and which are for storing, because the answer is not the same and getting it wrong produces a UI that renders every answer twice.",

  objectives: [
    "Choose between the three streaming modes",
    "Distinguish partial events from final ones and render each correctly",
    "Explain which events are persisted to the session and which are not",
    "Stream an agent's output to a browser over SSE",
    "Say what bidirectional streaming adds and what it costs"
  ],

  prerequisites: ["10.1", "1.5"],

  blocks: [

    { t: "h2", n: "01", text: "Three modes", id: "modes" },

    { t: "code", lang: "python", title: "From the enum",
      code: `from google.adk.agents.run_config import RunConfig, StreamingMode
print([m.value for m in StreamingMode])
print(RunConfig().streaming_mode)` },

    { t: "out", text: `[None, 'sse', 'bidi']
StreamingMode.NONE` },

    { t: "dl", items: [
      ["NONE (the default)", "Events arrive as they are produced, but the model's text arrives whole. You still see tool calls happen in real time — that is not what streaming mode controls."],
      ["SSE", "The model's text arrives in fragments as it is generated. One direction, text-shaped, and what almost every chat interface wants."],
      ["BIDI", "A live session where audio, video and text flow both ways at once, and the user can interrupt. A different protocol and a different model requirement."]
    ] },

    { t: "callout", kind: "note", title: "Events already stream without SSE",
      body: [{ t: "p", text: "`run_async` is an async generator in every mode, so a tool call appears the moment the model asks for it and the result appears the moment the tool returns. That alone is enough to show \"checking stock…\" while work happens. `StreamingMode.SSE` adds one thing: the model's *text* arriving in pieces instead of in one event." }] },

    { t: "h2", n: "02", text: "Partial events, traced", id: "partials" },

    {"kind": "trace", "title": "Four text events, two of them stored", "caption": "Executed with StreamingMode.SSE. A client that appends every text event renders the answer twice — append on partials, replace on the final one.", "left": "event", "codeW": 300, "vars": ["partial", "final", "persisted"], "steps": [{"code": "text 'The weather '", "state": ["True", "False", "no"]}, {"code": "text 'in London '", "state": ["True", "False", "no"]}, {"code": "text 'is mild.'", "state": ["True", "False", "no"]}, {"code": "text 'The weather in London is mild.'", "state": ["None", "True", "yes"], "changed": [2], "tone": "good", "note": "the record"}], "t": "diagram", "id": "dg-10_2-02-0"},



    { t: "code", lang: "python", title: "n1.py — running with SSE",
      code: `async for e in runner.run_async(
        user_id="u1", session_id=sid,
        new_message=msg,
        run_config=RunConfig(streaming_mode=StreamingMode.SSE)):
    print(f"partial={e.partial} final={e.is_final_response()} text={e.content.parts[0].text!r}")` },

    { t: "out", text: `    partial=True  final=False text='The weather '
    partial=True  final=False text='in London '
    partial=True  final=False text='is mild.'
    partial=None  final=True  text='The weather in London is mild.'
  events persisted to the session: 2` },

    { t: "p", text: "Four text events for one answer: three fragments and then the whole thing. Two facts follow directly, and between them they determine how you write the client." },

    { t: "diagram", kind: "compare", title: "Fragments are for the screen; the final event is the record",
      caption: "A client that appends every text event it sees renders the answer twice — three fragments and then the complete sentence again.",
      columns: [
        { title: "Partial events", tone: "accent", items: ["`partial=True`", "`is_final_response()` false", "Fragments to append as they arrive", "**Not persisted to the session**"] },
        { title: "The final event", tone: "good", items: ["`partial` unset", "`is_final_response()` true", "The complete text", "Persisted — this is the transcript"] }
      ] },

    { t: "callout", kind: "insight", title: "Two events in the session, not five",
      body: [{ t: "p", text: "The executed run persisted exactly two events — the user's message and the final answer. The fragments were never written, which is exactly right: a transcript full of three-word slivers would be replayed into every subsequent request, multiplying the token cost of the conversation for no benefit. Streaming is a presentation concern, and ADK keeps it out of the record." }] },

    { t: "h2", n: "03", text: "Rendering it correctly", id: "rendering" },

    { t: "code", lang: "python", title: "The client logic that does not double-render",
      code: `buffer = ""
async for event in runner.run_async(..., run_config=RunConfig(streaming_mode=StreamingMode.SSE)):
    part = event.content.parts[0] if event.content and event.content.parts else None

    if part and part.function_call:
        yield sse("status", f"Checking {part.function_call.name}…")

    elif part and part.text:
        if event.partial:
            buffer += part.text
            yield sse("delta", part.text)          # append in the UI
        elif event.is_final_response():
            yield sse("done", part.text)           # replace the buffer, do not append`,
      caption: "The final event carries the whole answer, so the client replaces rather than appends. Treating it as another delta is the bug that shows the answer twice — and it is what the naive loop produces." },

    { t: "callout", kind: "good", title: "Stream the tool calls too",
      body: [{ t: "p", text: "The biggest perceived-latency win in an agent is usually not token streaming — it is telling the user that something is happening. \"Searching the policy documents…\" during a two-second retrieval turns dead air into visible progress, and it comes from an event you are already receiving. Do this before you do anything clever with partial text." }] },

    { t: "h2", n: "04", text: "Over the wire", id: "wire" },

    { t: "code", lang: "python", title: "A FastAPI endpoint",
      code: `from fastapi.responses import StreamingResponse

@app.post("/chat")
async def chat(req: ChatRequest, user_id: str = Depends(authenticated_user)):
    async def events():
        async for event in runner.run_async(
                user_id=user_id,                      # derived server-side (lesson 9.1)
                session_id=await session_for(user_id, req.conversation_id),
                new_message=types.Content(role="user", parts=[types.Part(text=req.text)]),
                run_config=RunConfig(streaming_mode=StreamingMode.SSE)):
            yield to_sse(event)
    return StreamingResponse(events(), media_type="text/event-stream")`,
      caption: "`run_async` is an async generator, so it maps onto an SSE response with no buffering in between. Note the user id: streaming does not change who you are allowed to be." },

    { t: "callout", kind: "trap", title: "Things between you and the browser buffer",
      body: [{ t: "p", text: "A reverse proxy with response buffering on, a compression layer, or a serverless platform that waits for the complete body will collect your whole stream and deliver it in one piece — and the agent will look exactly as slow as it did before you implemented streaming, with no error anywhere. Test through the real deployment path, not against the local server, and check for `X-Accel-Buffering` or the equivalent in whatever sits in front." }] },

    { t: "h2", n: "05", text: "Bidirectional", id: "bidi" },

    { t: "code", lang: "python", title: "run_live and the request queue",
      code: `from google.adk.agents.live_request_queue import LiveRequestQueue

queue = LiveRequestQueue()
async for event in runner.run_live(user_id="u1", session_id=sid,
                                   live_request_queue=queue,
                                   run_config=RunConfig(streaming_mode=StreamingMode.BIDI)):
    ...

# From your transport, as the user speaks:
queue.send_realtime(audio_chunk)
queue.send_activity_start()
queue.send_content(types.Content(...))
queue.close()`,
      caption: "The queue is the upward channel: audio, activity signals and content pushed while the agent is already responding. `run_live` yields the downward one." },

    { t: "table", head: ["BIDI gives you", "And requires"],
      rows: [
        ["Audio in and audio out", "A model with a live API — not every model supports it"],
        ["The user can interrupt mid-answer", "Handling activity signals and partial state on your side"],
        ["Video frames as input", "Bandwidth, and a transport that suits it"],
        ["A genuinely conversational feel", "A websocket, session resumption, and considerably more client code"]
      ] },

    { t: "callout", kind: "tradeoff", title: "BIDI is a product decision, not an upgrade",
      body: [{ t: "p", text: "It is the right choice for a voice assistant or anything where interruption is natural, and the wrong one for a text interface that would work perfectly with SSE. The costs are real: a live model, a websocket with reconnection and session resumption, audio handling on the client, and a debugging story much harder than reading an event log. Reach for it when the interaction is genuinely spoken, not because it is the most advanced mode available." }] },

    { t: "exercise", kind: "practice", title: "Stream a turn without rendering it twice", difficulty: "core", minutes: 24,
      prompt: "Run a tool-using turn with StreamingMode.SSE and print every event with its partial flag, finality and text. Deliberately write the naive client that appends every text event, and observe the duplicated answer. Fix it by appending only partials and replacing on the final event. Then fetch the session and count the persisted events, and explain the difference between what you rendered and what was stored.",
      hints: [
        "A model that emits fragments is needed — one response per call will not show partials.",
        "Print `event.partial` explicitly; it is None rather than False on the final event.",
        "The session will hold far fewer events than you rendered."
      ],
      solution: {
        notes: [
          { t: "p", text: "The duplication is worth producing on purpose, because it is the single most common streaming bug and it looks like a framework problem when you meet it in the wild. The final event is not another delta — it is the complete text, and the client replaces with it. Once you have seen the flags printed side by side it stops being confusing forever." },
          { t: "p", text: "The persisted count is the other half: my run rendered four text events and stored two, the user message and the final answer. Partials are presentation only. If they were persisted, every subsequent turn would replay a transcript full of fragments and the conversation would cost several times more than it does." }
        ]
      } }

  ],

  takeaways: [
    "Three modes: NONE, SSE for streaming text, BIDI for live audio and video both ways.",
    "Events already arrive as they happen in every mode — SSE adds fragmented *text*.",
    "Partial events carry `partial=True` and are not final; the final event carries the complete text.",
    "Partials are never persisted — the executed run rendered four text events and stored two.",
    "Append on partials and replace on the final event, or the answer renders twice.",
    "Streaming tool-call status is usually a bigger perceived-latency win than streaming tokens."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "With SSE streaming, how many text events does one answer produce?",
      options: ["One", "One per fragment", "One per fragment, plus a final one with the whole text", "Two — a start and an end"],
      answer: 2,
      why: "The executed run shows three partial events and then a final event carrying the complete sentence. That final event is the one persisted and the one a client should replace its buffer with, rather than appending as though it were another fragment." },
    { stem: "How many of those events are stored in the session?",
      options: ["All of them", "Only the final one (plus the user message)", "None", "The first and last"],
      answer: 1,
      why: "The run persisted two events in total. Storing fragments would mean replaying a transcript full of slivers into every later request, multiplying the conversation's token cost for no benefit — so ADK treats streaming as presentation and keeps it out of the record." },
    { stem: "You implemented SSE but the browser still receives everything at once. What is the most likely cause?",
      options: ["The wrong streaming mode", "Something between you and the browser is buffering the response", "The model does not support streaming", "Events are not final"],
      answer: 1,
      why: "A reverse proxy with buffering on, a compression layer, or a platform that waits for the full body will collect the stream and deliver it in one piece, with no error anywhere. It is why streaming must be tested through the real deployment path rather than against the local server." },
    { stem: "When is BIDI the right mode?",
      options: ["Whenever you want streaming", "For voice or video interaction where interruption is natural", "For any agent using tools", "When latency matters"],
      answer: 1,
      why: "It costs a live-capable model, a websocket with resumption, audio handling and a much harder debugging story. That is worth paying for a spoken assistant where the user talks over the agent, and pure overhead for a text interface that SSE would serve perfectly." }
  ] },

  interview: { title: "Interview", sub: "Streaming questions", questions: [
    { level: "Core", q: "What is the difference between a partial event and a final one?",
      strong: "Partials are text fragments for the screen; the final event carries the complete text and is what gets persisted.",
      answer: [{ t: "p", text: "With SSE streaming the model's text arrives as several events with `partial=True` and `is_final_response()` false, followed by one event with the whole answer. The distinction matters in two places. In the client, you append partials and *replace* on the final event — treating it as another delta is what makes an answer appear twice, and it is the most common streaming bug I see. In storage, only the final event is written to the session, which I have verified by counting: four text events rendered, two events persisted. Fragments in the transcript would be replayed into every later request for no benefit." }] },
    { level: "Core", q: "Does streaming make an agent faster?",
      strong: "No — it changes perceived latency, and the biggest win is usually showing tool activity rather than tokens.",
      answer: [{ t: "p", text: "The turn takes exactly as long. What changes is that the user sees something at four hundred milliseconds instead of at four seconds, and that difference is large in how a product feels. The part people skip is that events already stream in every mode: a tool call appears the moment the model requests it, so you can show 'searching the policy documents…' during a retrieval without enabling SSE at all. I would build that first, because dead air during a tool call is usually a bigger share of the wait than the text generation is." }] },
    { level: "Senior", q: "Design the streaming path from an ADK agent to a browser.",
      strong: "run_async as an async generator into an SSE response, with a typed event protocol, buffering disabled end to end, and identity derived server-side.",
      answer: [{ t: "p", text: "`run_async` is an async generator, so it maps directly onto a streaming response with nothing buffering in between — in FastAPI that is a `StreamingResponse` over an async generator that translates events into SSE frames. I would not send raw events: the client wants a small typed protocol — status for tool calls, delta for partial text, done for the final answer, error for a failure — so the rendering logic stays simple and the wire format does not change every time an ADK version adds a field. Then the operational details that actually decide whether it works. Buffering must be off through every hop, because a proxy that collects the stream produces an agent that looks exactly as slow as before with no error to find, so I test through the real deployment path. Reconnection needs a story, since an SSE connection dropping mid-answer should not lose the turn — the final event is in the session, so a reconnecting client can fetch it. And the user id comes from the authenticated request, not from the body, because none of this changes who the caller is allowed to be." }] }
  ] }
});
