EC.receiveLesson({
  id: "10.7",

  lede: "Tracing looks like magic until you write one. It is **a stack, two timestamps and a parent pointer** \u2014 the vendors add storage, a UI and sampling, not concepts. Twenty-five lines gives you the tree, the waterfall, self time, searchable attributes and errors attached to the span that raised them. And building it exposes a fragility in the token rollup that would otherwise overstate your reported cost by **63%** after a refactor that has nothing to do with billing.",

  objectives: [
    "Build a working tracer from a context manager, a stack and a clock",
    "Attach an error to the span that raised it rather than to the request",
    "Record events as timestamped points inside a span",
    "Explain why `contextvars` is needed in place of a plain stack",
    "Identify why rolling up token counts by span kind is fragile"
  ],

  prerequisites: ["10.5", "10.4"],

  blocks: [

    { t: "h2", n: "01", id: "tracer", text: "The tracer",
      sub: "Twenty-five lines" },

    { t: "code", lang: "python", title: "A tracer, complete", code: `import contextlib


class Tracer:
    """Spans, nesting and timing in 25 lines. A real exporter ships these as JSON."""

    def __init__(self, clock):
        self.clock = clock          # () -> milliseconds; time.perf_counter()*1000 in prod
        self.spans = []             # flat list, parents identified by id
        self.stack = []

    @contextlib.contextmanager
    def span(self, name, kind, **attrs):
        rec = {"id": len(self.spans), "name": name, "kind": kind,
               "parent": self.stack[-1] if self.stack else None,
               "depth": len(self.stack), "attrs": attrs,
               "start": self.clock(), "status": "OK"}
        self.spans.append(rec)
        self.stack.append(rec["id"])
        try:
            yield rec                                   # rec["attrs"] is writable inside
        except Exception as exc:                        # an error is an attribute of a span
            rec["status"] = "ERROR: %s" % type(exc).__name__
            raise
        finally:
            rec["end"] = self.clock()
            self.stack.pop()`,
      hl: [15, 16, 19, 23],
      caption: "The four highlighted lines are the whole design: parent from the stack, push, yield, pop." },

    { t: "dl", items: [
      { k: "The stack gives you parent links", v: "And parent links give you the tree. `self.stack[-1] if self.stack else None` is the entire mechanism \u2014 a root span is one whose stack was empty." },
      { k: "Two clock reads give you duration", v: "Which gives you the waterfall and self time. Nothing else is needed for either." },
      { k: "`**attrs` gives you the searchable dimensions", v: "Model, index, token counts, scores. And because the record is yielded, a caller can add attributes it only learns later \u2014 `rr[\"attrs\"][\"top_score\"] = 0.31` after the call returns." },
      { k: "The `except` clause attaches errors to the span that raised them", v: "Not to the request. That is what lets a trace say \u201cthe reranker timed out and retrieval recovered\u201d rather than \u201csomething failed\u201d." }
    ] },

    { t: "callout", kind: "insight", title: "`ScriptedClock` is why the printed trace is byte-identical every run",
      body: [
        { t: "p", text: "The usual treatment pairs the tracer with a clock that returns preset timestamps rather than reading the wall clock. That is what makes the waterfall in 10.5 reproducible \u2014 every number in it is this program\u2019s real output, and it is the same output on any machine." },
        { t: "p", text: "It is a test double with a sharp edge, though, and the exercise below walks into it: **events consume clock ticks too.** Add two `event()` calls and every timestamp after them shifts, because the tick list is positional. My first run of the extended tracer reported `llm.generate` at 79 ms instead of 2,371 because of exactly that." },
        { t: "p", text: "In production you swap it for `time.perf_counter`, add an exporter that batches spans to a collector, and use `contextvars` so the stack survives `async` and threads. The model is identical \u2014 only the clock and the transport change." }
      ] },

    { t: "h2", n: "02", id: "extend", text: "What production adds",
      sub: "Three changes, no new concepts" },

    { t: "table",
      head: ["Toy version", "Production version", "Why"],
      rows: [
        ["`self.stack` as a list attribute", "`contextvars.ContextVar`", "A plain list is shared across tasks, so two concurrent requests interleave their stacks and the tree becomes nonsense"],
        ["`ScriptedClock`", "`time.perf_counter() * 1000`", "Monotonic, unaffected by clock adjustments, and not positional"],
        ["`self.spans` as a growing list", "a batching exporter", "Spans leave the process; you do not keep a request's trace in memory after it ends"],
        ["no events", "`span.add_event(name, ts)`", "First token, retry attempted, guardrail fired \u2014 points in time that are not themselves spans"],
        ["`status` as a string", "status code plus recorded exception", "So a backend can aggregate error types without parsing prose"]
      ] },

    { t: "callout", kind: "good", title: "`contextvars` is the one that is not optional",
      body: [
        { t: "p", text: "A list attribute on the tracer works perfectly for one request at a time and fails silently the moment two coroutines are in flight. Request A pushes a span, request B pushes a span, A pops \u2014 and B\u2019s span now has A\u2019s parent. You get a tree, it is well-formed, and it is wrong." },
        { t: "p", text: "`ContextVar` gives each task its own view, and `set` returns a token you `reset` in the `finally` \u2014 which is what makes it correct under nesting as well as under concurrency. The exercise below uses it, and the change from the toy version is three lines." },
        { t: "p", text: "The same mechanism is what 10.4 called context propagation. Within a process it is `contextvars`; across a process it is a header; across a queue it is a field in the message. Same idea, three transports." }
      ] },

    { t: "h2", n: "03", id: "events", text: "Events are not spans",
      sub: "And the distinction matters for TTFT" },

    { t: "callout", kind: "insight", title: "First token is an event, which is how TTFT gets measured at all",
      body: [
        { t: "p", text: "A span has a start and an end. \u2018The first token arrived\u2019 has neither \u2014 it is a point inside the generation span, and making it a span of its own would be a lie about the structure." },
        { t: "p", text: "In the exercise run below, the `first_token` event lands at 880 ms inside a `llm.generate` span that runs to 2,848 ms. So TTFT is 880 ms and **1,968 ms of the 2,371 ms generation happened after the first token** \u2014 which is exactly the split 9.15 insists on reporting separately, and 10.5 showed reverses the whole optimisation ranking." },
        { t: "p", text: "Without the event, that span is a single 2,371 ms bar and TTFT is unmeasurable. One `add_event` call is the difference between knowing your perceived latency and guessing at it." }
      ] },

    { t: "viz", title: "The tracer, and the one place it is fragile", caption: "Everything on the left is 25 lines. The right is the trap the exercise finds.",
      svg: `<svg viewBox="0 0 760 300" width="100%" role="img" aria-label="The tracer design and the token rollup fragility">
  <text x="16" y="20" class="s-label">THE WHOLE DESIGN</text>
  <rect x="16" y="30" width="340" height="106" rx="4" class="s-fill-bg" style="stroke:var(--good)" stroke-width="1.5"/>
  <text x="28" y="50" class="s-mono" style="font-size:9px;fill:var(--good)">a stack</text>
  <text x="140" y="50" class="s-mono" style="font-size:8px">-&gt; parent links -&gt; the tree</text>
  <text x="28" y="70" class="s-mono" style="font-size:9px;fill:var(--good)">two clock reads</text>
  <text x="140" y="70" class="s-mono" style="font-size:8px">-&gt; duration -&gt; waterfall, self time</text>
  <text x="28" y="90" class="s-mono" style="font-size:9px;fill:var(--good)">**attrs</text>
  <text x="140" y="90" class="s-mono" style="font-size:8px">-&gt; searchable dimensions</text>
  <text x="28" y="110" class="s-mono" style="font-size:9px;fill:var(--good)">except clause</text>
  <text x="140" y="110" class="s-mono" style="font-size:8px">-&gt; errors on the span that raised</text>
  <text x="28" y="128" class="s-sub">vendors add storage, a UI and sampling &#8212; not concepts</text>

  <text x="380" y="20" class="s-label">AND THE FRAGILITY</text>
  <rect x="380" y="30" width="364" height="106" rx="4" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.8"/>
  <text x="392" y="50" class="s-mono" style="font-size:8px">build_prompt   INTERNAL  prompt_tokens=1842</text>
  <text x="392" y="64" class="s-mono" style="font-size:8px">llm.generate   CLIENT    prompt_tokens=1842</text>
  <text x="392" y="84" class="s-mono" style="font-size:8px;fill:var(--good)">filter kind==CLIENT  -&gt;  1842   correct</text>
  <text x="392" y="100" class="s-mono" style="font-size:8px;fill:var(--crit)">move build_prompt to a service...</text>
  <text x="392" y="114" class="s-mono" style="font-size:8px;fill:var(--crit)">filter kind==CLIENT  -&gt;  3684   +63% cost</text>
  <text x="392" y="130" class="s-sub">no error, no warning, nothing to notice</text>

  <line x1="16" y1="154" x2="744" y2="154" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="176" class="s-label">AND WHY AN EVENT IS NOT A SPAN</text>
  <text x="16" y="200" class="s-mono" style="font-size:9px">llm.generate</text>
  <rect x="120" y="190" width="560" height="16" rx="2" class="s-fill" style="stroke:var(--accent)" stroke-width="1.4"/>
  <text x="688" y="202" class="s-mono" style="font-size:8px">2371 ms</text>
  <line x1="215" y1="184" x2="215" y2="212" stroke="var(--warn)" stroke-width="2"/>
  <text x="215" y="226" text-anchor="middle" class="s-mono" style="font-size:8px;fill:var(--warn)">first_token</text>
  <text x="215" y="238" text-anchor="middle" class="s-mono" style="font-size:8px;fill:var(--warn)">880 ms</text>
  <text x="450" y="226" text-anchor="middle" class="s-sub">1,968 ms of generation happened AFTER the first token</text>
  <text x="16" y="262" class="s-sub">without the event this is one 2,371 ms bar and TTFT is unmeasurable</text>
  <text x="16" y="282" class="s-sub">a span has a start and an end &#183; an event has neither &#8212; it is a point inside one</text>
</svg>` },

    { t: "exercise", kind: "build", title: "Extend the tracer, and break the rollup", difficulty: "advanced", minutes: 35,
      body: "Take the 25-line tracer and add three things production needs: `contextvars` instead of a list, events, and an error path that attaches the exception to the raising span while letting a parent recover. Then roll up token counts by span kind, and find out what happens when prompt assembly moves to a service.",
      requirements: [
        "`contextvars.ContextVar` in place of the shared stack, with the token reset in `finally`",
        "An `event()` method recording timestamped points inside the current span",
        "A failing reranker whose error lands on its own span while `retrieve` stays OK",
        "A token rollup, and the cost it reports before and after `build_prompt` becomes a CLIENT span",
        "The clock exhausted deliberately, so you see that events consume ticks"
      ],
      hint: "Count your clock reads before writing the tick list: every span start, every span end, every event, and the exception handler all read the clock. Miss one and every timestamp after it is wrong.",
      solution: { lang: "python", title: "the tracer with contextvars, events and the rollup trap", code: `import contextlib, contextvars

_current = contextvars.ContextVar("span_id", default=None)


class Tracer:
    """The 25-line tracer, plus contextvars, events and error attribution."""

    def __init__(self, clock):
        self.clock, self.spans = clock, []

    @contextlib.contextmanager
    def span(self, name, kind, **attrs):
        rec = {"id": len(self.spans), "name": name, "kind": kind,
               "parent": _current.get(), "attrs": attrs,
               "events": [], "start": self.clock(), "status": "OK"}
        self.spans.append(rec)
        token = _current.set(rec["id"])          # survives async and threads
        try:
            yield rec
        except Exception as exc:
            rec["status"] = "ERROR: %s" % type(exc).__name__
            rec["events"].append((self.clock(), "exception", str(exc)))
            raise
        finally:
            rec["end"] = self.clock()
            _current.reset(token)

    def event(self, label, detail=""):
        sid = _current.get()
        if sid is not None:
            self.spans[sid]["events"].append((self.clock(), label, detail))

    def depth(self, rec):
        d, p = 0, rec["parent"]
        while p is not None:
            d, p = d + 1, self.spans[p]["parent"]
        return d


class ScriptedClock(object):
    def __init__(self, ticks):
        self.ticks, self.i = ticks, 0

    def __call__(self):
        self.i += 1
        if self.i > len(self.ticks):
            raise AssertionError("clock exhausted after %d reads -- events consume "
                                 "ticks too" % len(self.ticks))
        return self.ticks[self.i - 1]


# every clock read, in order, INCLUDING the two event() calls and the exception
clock = ScriptedClock([0, 3, 44, 46, 47, 131, 133, 407, 409, 461, 462, 464,
                       466, 468, 475, 477, 880, 2848, 2850, 2927, 2930])
t = Tracer(clock)

with t.span("chat_request", "SERVER", session="s-8841"):
    with t.span("guardrail.input", "INTERNAL", checks="pii,injection"):
        pass
    with t.span("retrieve", "INTERNAL", top_k=5, index="support-docs-v4") as r:
        with t.span("embed_query", "CLIENT", model="embed-v3", dims=1536):
            pass
        with t.span("vector_search", "CLIENT", returned=20):
            pass
        try:
            with t.span("rerank", "CLIENT", model="rerank-v2"):
                raise TimeoutError("rerank upstream 504")
        except TimeoutError:
            t.event("fallback", "using raw search order")
            r["attrs"]["rerank_failed"] = True
        r["attrs"]["above_threshold"] = 6
    with t.span("build_prompt", "INTERNAL", prompt_tokens=1842):
        pass
    with t.span("llm.generate", "CLIENT", model="chat-large",
                prompt_tokens=1842, completion_tokens=214):
        t.event("first_token", "ttft")
    with t.span("guardrail.output", "INTERNAL", checks="pii,groundedness"):
        pass

total = t.spans[0]["end"] - t.spans[0]["start"]
print("TRACE  duration %d ms" % total)
print("%-34s %6s %7s  %s" % ("SPAN", "ms", "%", "STATUS"))
for s in t.spans:
    dur = s["end"] - s["start"]
    print("%-34s %6d %6.1f%%  %s"
          % ("  " * t.depth(s) + s["name"], dur, 100.0 * dur / total, s["status"]))

print()
print("events, which are timestamped points INSIDE a span:")
for s in t.spans:
    for ts, label, detail in s["events"]:
        print("  %5d ms  %-18s %-12s %s" % (ts, s["name"], label, detail))
print("  -> first_token at 880 ms gives TTFT = 880, and the span ran to 2848,")
print("     so 1968 ms of the 2371 ms generation was after the first token.")

print()
print("-- the error is attached to the span that raised it, not to the request --")
print("chat_request status : %s" % t.spans[0]["status"])
print("rerank status       : %s" % [s for s in t.spans if s["name"] == "rerank"][0]["status"])
print("retrieve status     : %s  (it handled the failure, so it is honestly OK)"
      % [s for s in t.spans if s["name"] == "retrieve"][0]["status"])

print()
print("=" * 66)
print("THE TOKEN ROLLUP, AND HOW IT BREAKS")
print("=" * 66)

def rollup_by_kind(spans):
    return (sum(s["attrs"].get("prompt_tokens", 0) for s in spans if s["kind"] == "CLIENT"),
            sum(s["attrs"].get("completion_tokens", 0) for s in spans if s["kind"] == "CLIENT"))

carriers = [(s["name"], s["kind"], s["attrs"].get("prompt_tokens")) for s in t.spans
            if "prompt_tokens" in s["attrs"]]
print("spans carrying prompt_tokens: %s" % carriers)
i1, o1 = rollup_by_kind(t.spans)
naive = sum(s["attrs"].get("prompt_tokens", 0) for s in t.spans)
print("filtered on kind == CLIENT : in=%d out=%d   <- correct" % (i1, o1))
print("summed over ALL spans      : in=%d           <- double counted" % naive)
print("  build_prompt carries the same 1842 for a different reason -- what it built --")
print("  and the kind filter is the only thing keeping the two apart.")
print()
print("now move prompt assembly to a service, so build_prompt becomes CLIENT:")
for s in t.spans:
    if s["name"] == "build_prompt":
        s["kind"] = "CLIENT"
i3, o3 = rollup_by_kind(t.spans)
PRICE_IN, PRICE_OUT = 3.0, 15.0
c1 = i1 / 1e6 * PRICE_IN + o1 / 1e6 * PRICE_OUT
c3 = i3 / 1e6 * PRICE_IN + o3 / 1e6 * PRICE_OUT
print("filtered on kind == CLIENT : in=%d out=%d   <- silently WRONG" % (i3, o3))
print("reported cost $%.5f -> $%.5f (+%.0f%%), no error, no warning"
      % (c1, c3, 100.0 * (c3 - c1) / c1))
print()
print("the fix: roll up from an explicit marker set ONLY by the model call,")
print("  e.g. gen_ai.usage.input_tokens -- never from span kind.")`,
        out: `TRACE  duration 2930 ms
SPAN                                   ms       %  STATUS
chat_request                         2930  100.0%  OK
  guardrail.input                      41    1.4%  OK
  retrieve                            420   14.3%  OK
    embed_query                        84    2.9%  OK
    vector_search                     274    9.4%  OK
    rerank                             53    1.8%  ERROR: TimeoutError
  build_prompt                          7    0.2%  OK
  llm.generate                       2371   80.9%  OK
  guardrail.output                     77    2.6%  OK

events, which are timestamped points INSIDE a span:
    464 ms  retrieve           fallback     using raw search order
    461 ms  rerank             exception    rerank upstream 504
    880 ms  llm.generate       first_token  ttft
  -> first_token at 880 ms gives TTFT = 880, and the span ran to 2848,
     so 1968 ms of the 2371 ms generation was after the first token.

-- the error is attached to the span that raised it, not to the request --
chat_request status : OK
rerank status       : ERROR: TimeoutError
retrieve status     : OK  (it handled the failure, so it is honestly OK)

==================================================================
THE TOKEN ROLLUP, AND HOW IT BREAKS
==================================================================
spans carrying prompt_tokens: [('build_prompt', 'INTERNAL', 1842), ('llm.generate', 'CLIENT', 1842)]
filtered on kind == CLIENT : in=1842 out=214   <- correct
summed over ALL spans      : in=3684           <- double counted
  build_prompt carries the same 1842 for a different reason -- what it built --
  and the kind filter is the only thing keeping the two apart.

now move prompt assembly to a service, so build_prompt becomes CLIENT:
filtered on kind == CLIENT : in=3684 out=214   <- silently WRONG
reported cost $0.00874 -> $0.01426 (+63%), no error, no warning

the fix: roll up from an explicit marker set ONLY by the model call,
  e.g. gen_ai.usage.input_tokens -- never from span kind.`,
        notes: [
          { t: "p", text: "**The rollup breaks silently and overstates cost by 63%.** `build_prompt` and `llm.generate` both carry `prompt_tokens=1842` \u2014 one because it assembled the prompt, one because it sent it \u2014 and the only thing keeping them apart is a filter on span kind. Move prompt assembly to a service, which is an ordinary refactor, and your reported cost goes from $0.00874 to $0.01426 with nothing to notice." },
          { t: "p", text: "**The fix is to roll up from an explicit marker, never from span kind.** A `gen_ai.usage.input_tokens` attribute set only by the model call cannot be accidentally satisfied by another span. This is a concrete argument for 10.8\u2019s semantic conventions that is stronger than portability: a standard attribute name is also an unambiguous one." },
          { t: "p", text: "**The error attribution is the part that reads best in a real trace.** `rerank` is ERROR with the exception recorded as an event at 461 ms; `retrieve` is OK because it caught the timeout and fell back to raw search order; `chat_request` is OK because the request succeeded. That is three honest statuses describing one degradation, and a flat log would have given you one line saying something failed." },
          { t: "p", text: "**The `fallback` event at 464 ms is on `retrieve`, not on `rerank`** \u2014 because by the time it fires, `rerank`\u2019s context manager has exited and `_current` has been reset to the parent. That is `contextvars` doing exactly the right thing, and it is why the token reset belongs in `finally`." },
          { t: "p", text: "**`first_token` at 880 ms inside a span ending at 2,848 ms** gives TTFT 880 and 1,968 ms of generation after it. Without the event the span is a single 2,371 ms bar and TTFT is unmeasurable \u2014 and 10.5 showed that number inverts the entire optimisation ranking." },
          { t: "p", text: "The exhausting clock is a deliberate assertion and it caught a real mistake. My first attempt budgeted ticks for span starts and ends only, so the two `event()` calls shifted everything after them and `llm.generate` printed as 79 ms rather than 2,371. A scripted clock is positional, which makes it reproducible and makes it brittle in exactly this way." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "A tracer is a stack, two timestamps and a parent pointer. The stack gives parent links and therefore the tree; two clock reads give duration and therefore the waterfall and self time; `**attrs` gives the searchable dimensions; and the `except` clause puts errors on the span that raised them so a trace can say \u201cthe reranker timed out and retrieval recovered\u201d." },
        { t: "p", text: "Production changes three things and no concepts: `contextvars` instead of a shared stack, a monotonic clock, and a batching exporter. And do not roll up token counts by span kind \u2014 two spans legitimately carry `prompt_tokens`, and a refactor that makes prompt assembly a service overstates your cost by 63% with no error." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cHow does distributed tracing actually work? Could you implement one?\u201d**" },
        { t: "p", text: "It is a stack, two timestamps and a parent pointer, and about twenty-five lines. A context manager records a span with its start time and its parent \u2014 which is whatever is on top of the stack, or nothing if the stack is empty, and that is what makes it a root. It pushes itself, yields, and on the way out records the end time and pops." },
        { t: "p", text: "That gets you four things. The stack gives parent links, which give the tree. Two clock reads give duration, which gives the waterfall and self time. Keyword arguments give the searchable attributes \u2014 model, index, token counts. And an `except` clause attaches the error to the span that raised it rather than to the request, which is what lets a trace say \u2018the reranker timed out and retrieval fell back to raw search order\u2019 instead of \u2018something failed\u2019." },
        { t: "p", text: "Production changes three things and introduces no new ideas. The shared stack becomes a `ContextVar`, which is not optional \u2014 a list attribute works fine for one request and fails silently with two coroutines in flight, because one request pops a span and the other\u2019s span inherits the wrong parent. You get a well-formed tree that is wrong. The clock becomes `perf_counter`. And the span list becomes a batching exporter, because you do not hold a trace in memory after the request ends." },
        { t: "p", text: "I would also add events, which are not spans. \u2018The first token arrived\u2019 has no duration \u2014 it is a point inside the generation span. In the version I built, the first-token event lands at 880 milliseconds inside a span that runs to 2,848, so TTFT is 880 and 1,968 milliseconds of generation happened after it. Without that event the span is one bar and TTFT is unmeasurable, which matters because perceived latency changes which optimisation wins." },
        { t: "p", text: "The thing I would flag from actually building it is a trap in the aggregation. Rolling up token counts by filtering on span kind equal to CLIENT is correct and fragile, because two spans legitimately carry `prompt_tokens` \u2014 the one that assembled the prompt and the one that sent it. Move prompt assembly into a service, which is an ordinary refactor, and the filter now matches both: reported cost goes up 63% with no error and nothing to notice." },
        { t: "p", text: "So the rule I would take from it is to roll up from an explicit marker that only the model call sets, never from a structural property like span kind. That is also a better argument for the OpenTelemetry GenAI conventions than portability \u2014 a standard attribute name is an unambiguous one." }
      ] }
  ],

  takeaways: [
    "**A tracer is a stack, two timestamps and a parent pointer** \u2014 vendors add storage, a UI and sampling, not concepts.",
    "**The stack gives parent links and therefore the tree**; a root span is one whose stack was empty.",
    "**Yielding the record lets a caller add attributes it learns later**, such as a `top_score` known only after the call returns.",
    "**The `except` clause attaches errors to the span that raised them**, so three honest statuses can describe one degradation.",
    "**`contextvars` is not optional**: a shared stack gives two concurrent requests a well-formed tree that is wrong.",
    "**Reset the ContextVar token in `finally`**, which is what makes it correct under nesting as well as concurrency.",
    "**Events are not spans** \u2014 \u201cfirst token arrived\u201d has no duration, and without it TTFT is unmeasurable.",
    "**Measured: `first_token` at 880 ms in a span ending at 2,848** \u2014 1,968 ms of generation happened after the first token.",
    "**Do not roll up token counts by span kind**: two spans legitimately carry `prompt_tokens`, for different reasons.",
    "**Measured: making `build_prompt` a CLIENT span overstates cost by 63%** \u2014 $0.00874 to $0.01426, no error, no warning.",
    "**Roll up from an explicit marker the model call alone sets**, which is a stronger argument for semantic conventions than portability.",
    "**A scripted clock is positional, so events consume ticks** \u2014 my first run reported `llm.generate` at 79 ms instead of 2,371."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Why does a production tracer need `contextvars` rather than a list attribute for the span stack?",
        options: [
          "Because `contextvars` is faster than list operations",
          "Because a shared stack lets two concurrent requests interleave \u2014 one pops a span and the other's span inherits the wrong parent, producing a well-formed tree that is wrong",
          "Because lists cannot store span IDs safely across threads",
          "Because `contextvars` automatically propagates across HTTP boundaries"
        ],
        answer: 1,
        why: "The failure is silent, which is what makes it dangerous: the resulting tree is structurally valid and attributes work are attributed to the wrong parent, so nothing errors and the data is wrong. `ContextVar` gives each task its own view, and the token returned by `set` must be reset in `finally` so nesting also unwinds correctly. It does not cross a process boundary \u2014 that needs a header, which is a separate mechanism." },

      { stem: "Why is \u201cfirst token arrived\u201d an event rather than a span?",
        options: [
          "Because it occurs before the span's start timestamp",
          "Because it is a point in time with no duration \u2014 a span has a start and an end, and modelling it as a span would misrepresent the structure",
          "Because events are cheaper to store than spans",
          "Because the first token is produced by the provider rather than your code"
        ],
        answer: 1,
        why: "A span represents an interval of work and the first token is an instant inside the generation interval, so recording it as a span would invent a start and an end it does not have. The practical payoff is that it makes TTFT measurable at all: in the worked run the event lands at 880 ms inside a span ending at 2,848 ms, which splits 2,371 ms of generation into 880 before the first token and 1,968 after." },

      { stem: "Rolling up token counts by filtering on span kind CLIENT is correct today. Why is it fragile?",
        options: [
          "Because some providers report token counts asynchronously after the span closes",
          "Because two spans legitimately carry prompt_tokens, and moving prompt assembly to a service makes the filter match both \u2014 overstating cost by 63% with no error",
          "Because INTERNAL spans can be reclassified by the exporter",
          "Because CLIENT spans include retries, which double-count by design"
        ],
        answer: 1,
        why: "`build_prompt` records the token count of the prompt it assembled and `llm.generate` records the count it sent, so both hold 1,842 for different and valid reasons, and only the kind filter separates them. An ordinary refactor that turns prompt assembly into a service call changes the kind and silently doubles the input total \u2014 $0.00874 becomes $0.01426. The fix is to aggregate from an attribute only the model call sets." },

      { stem: "A reranker times out, retrieval falls back to raw search order, and the request succeeds. What statuses should the trace show?",
        options: [
          "ERROR on the request, because a component failed",
          "ERROR on the rerank span, OK on retrieve because it recovered, and OK on the request because it succeeded",
          "ERROR on both rerank and retrieve, since the degradation propagated",
          "OK everywhere, with the timeout recorded only as a log line"
        ],
        answer: 1,
        why: "Attaching the error to the span that raised it, and letting a parent that handled it report OK, is what allows three honest statuses to describe one degradation \u2014 the reranker failed, retrieval coped, the user got an answer. A flat log would collapse this into a single line saying something failed. It is worth pairing with an alert on the fallback rate, because a silent fallback is still a quality change." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "A tracer from scratch",
    questions: [
      { level: "advanced",
        q: "Implement a tracer.",
        strong: "A strong answer is short and names the four mechanisms.",
        answer: [
          { t: "p", text: "A context manager, a stack, and a clock. On entry, record a span with a name, a kind, the current time, and a parent taken from the top of the stack \u2014 or `None`, which makes it a root. Push its id, yield the record so the caller can add attributes, and in a `finally` record the end time and pop." },
          { t: "p", text: "That gives four things. The stack gives parent links and therefore the tree. Two clock reads give duration and therefore the waterfall and self time. Keyword arguments give the searchable attributes. And an `except` clause attaches an exception to the span that raised it rather than to the whole request." },
          { t: "p", text: "Yielding the record matters more than it looks. A reranker\u2019s top score is only known after the call returns, so the caller writes it onto the span it is already inside \u2014 which is how the attribute that names a bug gets recorded at all." },
          { t: "p", text: "For production: `contextvars` instead of the list, `perf_counter` instead of the clock argument, and a batching exporter instead of keeping spans in memory. No new concepts, just the three substitutions." }
        ] },

      { level: "advanced",
        q: "What did building one teach you that reading about it did not?",
        strong: "A strong answer has a concrete finding.",
        answer: [
          { t: "p", text: "That the token rollup is fragile in a way nothing warns you about. I aggregated input and output tokens by filtering on span kind CLIENT, which was correct \u2014 and then noticed two spans both carry `prompt_tokens`: the one that assembled the prompt and the one that sent it." },
          { t: "p", text: "So the kind filter is the only thing separating them. Move prompt assembly into its own service, which is a perfectly ordinary refactor with no billing implications, and the filter matches both: my reported cost went from $0.00874 to $0.01426, a 63% overstatement, with no error and nothing to notice." },
          { t: "p", text: "The rule I took from it is to roll up from an explicit marker that only the model call sets \u2014 something like `gen_ai.usage.input_tokens` \u2014 and never from a structural property like span kind. That is also a better argument for the semantic conventions than portability: a standard attribute name is an unambiguous one." },
          { t: "p", text: "The other thing was smaller and more embarrassing. My scripted clock is positional, and events read the clock too \u2014 so adding two event calls shifted every later timestamp and the generation span printed as 79 milliseconds instead of 2,371. Reproducible and brittle are the same property." }
        ] },

      { level: "core",
        q: "What is the difference between a span attribute and a span event?",
        strong: "A strong answer connects it to TTFT.",
        answer: [
          { t: "p", text: "An attribute is a key-value fact about the span as a whole \u2014 the model, the token counts, `top_k`. An event is a timestamped point inside the span: the first token arrived, a retry was attempted, a guardrail fired." },
          { t: "p", text: "The distinction is not pedantic, because it is what makes TTFT measurable. \u2018First token\u2019 has no duration, so it cannot honestly be a span, and as an attribute it would lose the timestamp that is the whole point." },
          { t: "p", text: "In the version I built, the first-token event landed at 880 milliseconds inside a generation span ending at 2,848 \u2014 so 1,968 milliseconds happened after the first token. Without it that span is one 2,371 millisecond bar." },
          { t: "p", text: "And that number matters beyond curiosity: with streaming, TTFT rather than total latency is what the user experiences, and optimising against it reorders which fix is worth making." }
        ] }
    ]
  }
});
