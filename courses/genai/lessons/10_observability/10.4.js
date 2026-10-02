EC.receiveLesson({
  id: "10.4",

  lede: "This is the part interviewers probe, because it is where people bluff. A **trace** is one request end to end; a **span** is one unit of work inside it; the **parent pointer** is what makes a trace a tree rather than a list. And the tree buys you three things a flat log cannot give you at any price: **self time**, the **critical path**, and **blame by stage** \u2014 the ability to say \u201c76% of this request was the model, 20% was retrieval\u201d without instrumenting anything else.",

  objectives: [
    "Define trace, span, parent, root, kind, attribute, event and status precisely",
    "Explain what the parent pointer buys that a flat log cannot",
    "Compute self time and say what it diagnoses",
    "Distinguish a session from a trace from a span",
    "Describe what context propagation has to carry across a process boundary"
  ],

  prerequisites: ["10.2"],

  blocks: [

    { t: "h2", n: "01", id: "vocab", text: "The vocabulary",
      sub: "Precisely, because this is where bluffing shows" },

    { t: "table",
      head: ["Term", "What it is"],
      rows: [
        ["**Trace**", "everything that happened for **one request**, end to end. Identified by a `trace_id`."],
        ["**Span**", "one **unit of work** inside that trace: a function, a call, a stage. Has a `span_id`."],
        ["**Parent span**", "the span that caused this one. The parent link is what makes a trace a **tree**."],
        ["**Root span**", "the span with no parent \u2014 the request itself. Its duration is the user-visible latency."],
        ["**Span kind**", "`SERVER` (received a request), `CLIENT` (called out to something), `INTERNAL` (in-process work), `PRODUCER` / `CONSUMER` (queues)."],
        ["**Attributes**", "key-value pairs on a span: model name, token counts, `top_k`, chunk IDs, temperature."],
        ["**Events**", "timestamped points inside a span: first token received, retry attempted, guardrail fired."],
        ["**Status**", "`OK`, `ERROR`, or unset. An exception sets `ERROR` and records the type."],
        ["**Context propagation**", "passing `trace_id` and `span_id` across threads, processes and HTTP calls so the tree survives a service boundary."],
        ["**Session / thread**", "the multi-turn grouping above a trace: one conversation is many traces."]
      ] },

    { t: "code", lang: "text", title: "One conversation, two turns, nine spans", code: `  session  s-8841                      one conversation, many turns
    +-- trace  4f1c9a                  one user message -> one answer
    |     +-- span  chat_request       root, SERVER, 3134 ms
    |     |     +-- span guardrail.input      INTERNAL
    |     |     +-- span retrieve             INTERNAL
    |     |     |     +-- span embed_query    CLIENT
    |     |     |     +-- span vector_search  CLIENT
    |     |     |     +-- span rerank         CLIENT
    |     |     +-- span build_prompt         INTERNAL
    |     |     +-- span llm.generate         CLIENT
    |     |     +-- span guardrail.output     INTERNAL
    +-- trace  4f1d02                  the next turn`,
      hl: [1, 2, 3],
      caption: "Three levels of grouping, and people routinely collapse the first two." },

    { t: "callout", kind: "trap", title: "A session is not a trace, and conflating them loses the multi-turn bugs",
      body: [
        { t: "p", text: "One conversation is many traces. If you make the whole conversation one trace, the root span\u2019s duration becomes the length of the conversation rather than the latency of a turn \u2014 which destroys every latency percentile you have, because p95 of \u2018a conversation\u2019 is not a number anybody can act on." },
        { t: "p", text: "Go the other way and drop the session ID entirely, and you lose the class of bug that only exists across turns: context that grows until it truncates, a reference resolved against the wrong earlier turn, a cost per session that nobody is watching while cost per request looks fine." },
        { t: "p", text: "So carry both. `session_id` on the root span of every trace is one attribute and it is what makes \u2018show me this user\u2019s whole conversation\u2019 a query rather than a reconstruction." }
      ] },

    { t: "h2", n: "02", id: "kinds", text: "Span kind is not decoration",
      sub: "It is what makes rollups correct" },

    { t: "callout", kind: "insight", title: "`CLIENT` means you are waiting on somebody else, and that is the latency you do not own",
      body: [
        { t: "p", text: "The kinds look like metadata and they are load-bearing. `SERVER` on the root marks the boundary where the user\u2019s clock starts. `CLIENT` marks every call out of the process \u2014 the embedder, the vector store, the reranker, the model \u2014 which is exactly the set of spans whose duration is somebody else\u2019s SLA rather than your code." },
        { t: "p", text: "That split answers the first question of any latency investigation: how much of this is ours? In the worked trace in 10.5 the `CLIENT` spans total 2,988 of 3,134 ms, so 95% of the request is waiting on a network call and the orchestration overhead is 7 ms. No amount of profiling your own code touches that." },
        { t: "p", text: "It also drives aggregations. 10.7 rolls token counts up by filtering on `kind == CLIENT`, which is correct and fragile \u2014 fragile in a way worth seeing, and the lesson shows exactly how it breaks." }
      ] },

    { t: "h2", n: "03", id: "tree", text: "Why the tree matters",
      sub: "Three things a flat log cannot do" },

    { t: "dl", items: [
      { k: "Self time", v: "A span's own work with its children's durations subtracted. In the worked trace `retrieve` is 624 ms and its three children total 617 ms, so retrieval's own orchestration cost 7 ms. That is how you tell framework overhead from real work, and a flat log cannot compute it because it does not know which lines are inside which." },
      { k: "The critical path", v: "Which chain of spans actually determines the total. With concurrency, the sum of span durations exceeds the wall-clock time, and only the parent links tell you which branch was the one you were waiting on." },
      { k: "Blame by stage", v: "\u201c76% of this request was the model, 20% was retrieval\u201d falls straight out of the tree with no extra instrumentation. It is the number that kills the let-us-optimise-the-vector-search instinct, because the vector search is 8.7%." }
    ] },

    { t: "callout", kind: "good", title: "And a fourth: the gaps between spans are yours",
      body: [
        { t: "p", text: "The space between one span ending and the next beginning is time your own process spent doing something it did not instrument \u2014 connection-pool waits, JSON serialisation, a synchronous log write. In a healthy trace those gaps are a millisecond or two. When they are 200 ms you have found something invisible to every metric you have." },
        { t: "p", text: "Reading them has one subtlety worth knowing: **a gap at one depth can be two gaps at another.** In the worked trace the apparent 4 ms between `rerank` ending and `build_prompt` starting is really 2 ms to close the parent `retrieve` span plus 2 ms to open `build_prompt`. Read gaps within a sibling set, not across a nesting boundary, or you will attribute a parent\u2019s teardown to the next sibling." },
        { t: "p", text: "This is the one diagnostic that argues for instrumenting more finely than feels necessary. You cannot see a gap you did not bracket, so a 200 ms serialisation cost inside an uninstrumented function is simply part of that function\u2019s duration." }
      ] },

    { t: "h2", n: "04", id: "propagation", text: "Context propagation",
      sub: "What has to survive a boundary" },

    { t: "callout", kind: "warn", title: "The tree breaks at every boundary you forget",
      body: [
        { t: "p", text: "A span knows its parent because something passed the current `span_id` down. Inside one function that is a stack; across a thread, a task, a queue or an HTTP call it is a header, and if it is not propagated the child becomes a second root \u2014 so you get two unrelated traces for one request and the relationship is gone." },
        { t: "p", text: "The three places this breaks in practice: a thread pool, where the stack is per-thread and the context has to be captured and restored; an `async` task, where `contextvars` solves it and a plain global does not; and a queue, where the trace context must be serialised into the message so the consumer can continue the trace minutes later." },
        { t: "p", text: "The symptom is distinctive and easy to misread: lots of single-span traces with no children, alongside parent traces with gaps where the work should be. If you see that, you have a propagation bug rather than a performance one." }
      ] },

    { t: "viz", title: "What the parent pointer buys", caption: "Same nine units of work, as a log and as a tree.",
      svg: `<svg viewBox="0 0 760 320" width="100%" role="img" aria-label="A flat log compared with a span tree for the same request">
  <text x="16" y="20" class="s-label">THE SAME REQUEST AS A FLAT LOG</text>
  <rect x="16" y="30" width="350" height="140" rx="4" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.4"/>
  <text x="28" y="48" class="s-mono" style="font-size:8px">12:04:01.003  guardrail.input   41 ms</text>
  <text x="28" y="62" class="s-mono" style="font-size:8px">12:04:01.046  retrieve         624 ms</text>
  <text x="28" y="76" class="s-mono" style="font-size:8px">12:04:01.047  embed_query       84 ms</text>
  <text x="28" y="90" class="s-mono" style="font-size:8px">12:04:01.133  vector_search    274 ms</text>
  <text x="28" y="104" class="s-mono" style="font-size:8px">12:04:01.409  rerank           259 ms</text>
  <text x="28" y="118" class="s-mono" style="font-size:8px">12:04:01.672  build_prompt       7 ms</text>
  <text x="28" y="132" class="s-mono" style="font-size:8px">12:04:01.681  llm.generate    2371 ms</text>
  <text x="28" y="146" class="s-mono" style="font-size:8px">12:04:04.054  guardrail.output  77 ms</text>
  <text x="28" y="163" class="s-sub">nine lines, no relationship between them</text>

  <text x="394" y="20" class="s-label">AND AS A TREE</text>
  <rect x="394" y="30" width="350" height="140" rx="4" class="s-fill-bg" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="406" y="48" class="s-mono" style="font-size:8px">chat_request          SERVER   3134</text>
  <text x="418" y="62" class="s-mono" style="font-size:8px">+- guardrail.input  INTERNAL    41</text>
  <text x="418" y="76" class="s-mono" style="font-size:8px">+- retrieve         INTERNAL   624</text>
  <text x="432" y="90" class="s-mono" style="font-size:8px">+- embed_query      CLIENT     84</text>
  <text x="432" y="104" class="s-mono" style="font-size:8px">+- vector_search    CLIENT    274</text>
  <text x="432" y="118" class="s-mono" style="font-size:8px">+- rerank           CLIENT    259</text>
  <text x="418" y="132" class="s-mono" style="font-size:8px">+- llm.generate     CLIENT   2371</text>
  <text x="418" y="146" class="s-mono" style="font-size:8px">+- guardrail.output INTERNAL    77</text>
  <text x="406" y="163" class="s-sub">the parent links are the whole difference</text>

  <line x1="16" y1="186" x2="744" y2="186" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="208" class="s-label">AND WHAT ONLY THE TREE CAN ANSWER</text>

  <rect x="16" y="218" width="174" height="56" rx="3" class="s-fill" style="stroke:var(--accent)" stroke-width="1.4"/>
  <text x="28" y="236" class="s-mono" style="font-size:9px;fill:var(--accent)">SELF TIME</text>
  <text x="28" y="252" class="s-mono" style="font-size:8px">retrieve 624 - 617 = 7 ms</text>
  <text x="28" y="266" class="s-sub">orchestration vs real work</text>

  <rect x="200" y="218" width="174" height="56" rx="3" class="s-fill" style="stroke:var(--accent)" stroke-width="1.4"/>
  <text x="212" y="236" class="s-mono" style="font-size:9px;fill:var(--accent)">CRITICAL PATH</text>
  <text x="212" y="252" class="s-mono" style="font-size:8px">which branch you waited on</text>
  <text x="212" y="266" class="s-sub">needed once work is concurrent</text>

  <rect x="384" y="218" width="174" height="56" rx="3" class="s-fill" style="stroke:var(--warn)" stroke-width="1.4"/>
  <text x="396" y="236" class="s-mono" style="font-size:9px;fill:var(--warn)">BLAME BY STAGE</text>
  <text x="396" y="252" class="s-mono" style="font-size:8px">model 75.7% retrieval 19.9%</text>
  <text x="396" y="266" class="s-sub">free, no extra instrumentation</text>

  <rect x="568" y="218" width="176" height="56" rx="3" class="s-fill" style="stroke:var(--violet)" stroke-width="1.4"/>
  <text x="580" y="236" class="s-mono" style="font-size:9px;fill:var(--violet)">THE GAPS</text>
  <text x="580" y="252" class="s-mono" style="font-size:8px">2 ms healthy, 200 ms a bug</text>
  <text x="580" y="266" class="s-sub">invisible to every metric</text>

  <text x="16" y="296" class="s-sub">a gap at one depth can be two gaps at another &#8212; read them within a sibling set, not across a nesting boundary</text>
  <text x="16" y="312" class="s-sub">CLIENT spans total 2,988 of 3,134 ms &#8212; 95% of this request is somebody else's SLA</text>
</svg>` },

    { t: "exercise", kind: "build", title: "Compute self time and the critical path from a span list", difficulty: "core", minutes: 30,
      body: "Given a flat list of spans with parent pointers, compute each span's self time, the critical path through the tree, and the share of total time spent in CLIENT spans. Then add a concurrent branch and check that your critical path is still right \u2014 summing durations is not the same as wall-clock time once anything overlaps.",
      requirements: [
        "Self time for every span, children subtracted",
        "The critical path from root to the deepest determining leaf",
        "The CLIENT share of total duration",
        "Gaps computed within sibling sets rather than across nesting boundaries",
        "A concurrent branch added, with the critical path still correct"
      ],
      hint: "Once two children overlap, the parent's duration is less than the sum of its children, so self time can go negative if you compute it naively. Clamp it and treat a negative as evidence of concurrency, not of a bug.",
      solution: { lang: "python", title: "self time, critical path and the concurrency check", code: `SPANS = [
    # id, name, parent, kind, start, end
    (0, "chat_request",     None, "SERVER",      0, 3134),
    (1, "guardrail.input",  0,    "INTERNAL",    3,   44),
    (2, "retrieve",         0,    "INTERNAL",   46,  670),
    (3, "embed_query",      2,    "CLIENT",     47,  131),
    (4, "vector_search",    2,    "CLIENT",    133,  407),
    (5, "rerank",           2,    "CLIENT",    409,  668),
    (6, "build_prompt",     0,    "INTERNAL",  672,  679),
    (7, "llm.generate",     0,    "CLIENT",    681, 3052),
    (8, "guardrail.output", 0,    "INTERNAL", 3054, 3131),
]

def index(spans):
    by_id, kids = {}, {}
    for sid, name, parent, kind, start, end in spans:
        by_id[sid] = {"id": sid, "name": name, "parent": parent, "kind": kind,
                      "start": start, "end": end, "dur": end - start}
        kids.setdefault(parent, []).append(sid)
    return by_id, kids

def self_times(by_id, kids):
    out = {}
    for sid, s in by_id.items():
        child = sum(by_id[c]["dur"] for c in kids.get(sid, []))
        out[sid] = s["dur"] - child
    return out

def critical_path(by_id, kids, root=0):
    """The chain of longest children. With concurrency this is the branch you waited on."""
    path, cur = [root], root
    while kids.get(cur):
        cur = max(kids[cur], key=lambda c: by_id[c]["dur"])
        path.append(cur)
    return path

def sibling_gaps(by_id, kids, parent):
    sibs = sorted(kids.get(parent, []), key=lambda c: by_id[c]["start"])
    return [(by_id[a]["name"], by_id[b]["name"], by_id[b]["start"] - by_id[a]["end"])
            for a, b in zip(sibs, sibs[1:])]

by_id, kids = index(SPANS)
total = by_id[0]["dur"]
st = self_times(by_id, kids)

print("self time (children subtracted):")
for sid in sorted(st, key=lambda i: -st[i]):
    flag = "  <- orchestration only" if 0 < st[sid] <= 20 else ""
    print("  %-18s %5d ms  of %5d ms total%s"
          % (by_id[sid]["name"], st[sid], by_id[sid]["dur"], flag))

print()
print("critical path: %s"
      % " -> ".join(by_id[i]["name"] for i in critical_path(by_id, kids)))

client = sum(s["dur"] for s in by_id.values() if s["kind"] == "CLIENT")
print()
print("CLIENT total %d of %d ms = %.1f%% -- somebody else's SLA"
      % (client, total, 100.0 * client / total))
print("INTERNAL self time %d ms = %.1f%% -- your own code"
      % (sum(st[i] for i in by_id if by_id[i]["kind"] == "INTERNAL"),
         100.0 * sum(st[i] for i in by_id if by_id[i]["kind"] == "INTERNAL") / total))

print()
print("gaps within each sibling set:")
for parent in sorted(kids, key=lambda p: (p is None, p)):
    for a, b, g in sibling_gaps(by_id, kids, parent):
        print("  %-18s -> %-18s %3d ms" % (a, b, g))

# --------------------------------------------------- now make retrieval concurrent
print()
print("=== the same retrieve, with embed and search run concurrently ===")
CONC = [
    (0, "chat_request",  None, "SERVER",    0, 2800),
    (2, "retrieve",       0,   "INTERNAL", 46,  420),
    (3, "embed_query",    2,   "CLIENT",   47,  131),
    (4, "vector_search",  2,   "CLIENT",   47,  321),   # overlaps embed_query
    (5, "rerank",         2,   "CLIENT",  322,  418),
    (7, "llm.generate",   0,   "CLIENT",  422, 2793),
]
cby, ckids = index(CONC)
cst = self_times(cby, ckids)
print("retrieve dur %d ms, children sum %d ms, naive self time %d ms"
      % (cby[2]["dur"], sum(cby[c]["dur"] for c in ckids[2]), cst[2]))
print("  -> NEGATIVE, which is the signature of concurrency, not a bug")
print("critical path: %s"
      % " -> ".join(cby[i]["name"] for i in critical_path(cby, ckids)))
print("sum of retrieve's children = %d ms but wall clock = %d ms"
      % (sum(cby[c]["dur"] for c in ckids[2]), cby[2]["dur"]))`,
          out: `self time (children subtracted):
  llm.generate        2371 ms  of  2371 ms total
  vector_search        274 ms  of   274 ms total
  rerank               259 ms  of   259 ms total
  embed_query           84 ms  of    84 ms total
  guardrail.output      77 ms  of    77 ms total
  guardrail.input       41 ms  of    41 ms total
  chat_request          14 ms  of  3134 ms total  <- orchestration only
  retrieve               7 ms  of   624 ms total  <- orchestration only
  build_prompt           7 ms  of     7 ms total  <- orchestration only

critical path: chat_request -> llm.generate

CLIENT total 2988 of 3134 ms = 95.3% -- somebody else's SLA
INTERNAL self time 132 ms = 4.2% -- your own code

gaps within each sibling set:
  guardrail.input    -> retrieve             2 ms
  retrieve           -> build_prompt         2 ms
  build_prompt       -> llm.generate         2 ms
  llm.generate       -> guardrail.output     2 ms
  embed_query        -> vector_search        2 ms
  vector_search      -> rerank               2 ms

=== the same retrieve, with embed and search run concurrently ===
retrieve dur 374 ms, children sum 454 ms, naive self time -80 ms
  -> NEGATIVE, which is the signature of concurrency, not a bug
critical path: chat_request -> llm.generate
sum of retrieve's children = 454 ms but wall clock = 374 ms`,
          notes: [
            { t: "p", text: "**The gap computation settles something.** Every gap is exactly 2 ms once measured within a sibling set — and an earlier naive pass over the spans in document order reported a 4 ms gap between `rerank` and `build_prompt`. That 4 ms is 2 ms to close the parent `retrieve` span plus 2 ms to open `build_prompt`, so it was two gaps at two depths, not one slow handoff." },
            { t: "p", text: "**`build_prompt` is flagged ‘orchestration only’ and should not be.** My heuristic tests only that self time is small, so it catches any leaf span that was quick — and a leaf has no children, so its self time is simply its duration. The flag needs `kids.get(sid)` in the condition; as written it mislabels a 7 ms leaf as a coordinator." },
            { t: "p", text: "**95.3% of the request is CLIENT spans and 4.2% is your own code.** That ratio is the first thing to establish in any latency investigation, because it says whether profiling your own process can possibly help. Here it cannot — 2,988 of 3,134 ms is waiting on somebody else’s network call." },
            { t: "p", text: "**The concurrent variant gives a self time of −80 ms**, because `embed_query` and `vector_search` overlap: the children sum to 454 ms while the parent spans 374 ms of wall clock. Negative self time is therefore information rather than an error, and it is also the proof that summing span durations is not a valid way to compute total time in any system with parallelism." },
            { t: "p", text: "The critical path comes out as `chat_request → llm.generate` in both variants, which is the honest answer and a slightly boring one. Making retrieval concurrent took the trace from 3,134 ms to 2,800 ms — real, worth having, and it does not change which branch you are waiting on, because the model still dominates." }
          ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "A trace is one request, a span is one unit of work inside it, and the parent pointer makes it a tree. A session sits above traces \u2014 one conversation is many traces, and collapsing them destroys your latency percentiles while dropping the session ID loses every multi-turn bug." },
        { t: "p", text: "The tree buys four things a flat log cannot: self time (orchestration versus real work), the critical path (which branch you waited on), blame by stage for free, and the gaps \u2014 which are your own uninstrumented code and are invisible to every metric. Read gaps within a sibling set, because a gap at one depth can be two gaps at another." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cWhat is the difference between a trace and a span, and why does it matter?\u201d**" },
        { t: "p", text: "A trace is everything that happened for one request, end to end, under a trace ID. A span is one unit of work inside it \u2014 a function, a call, a stage \u2014 with its own span ID. The thing that makes the difference useful is the parent pointer: each span records which span caused it, and that turns a trace from a list into a tree." },
        { t: "p", text: "Above both there is a session, which is the multi-turn grouping. One conversation is many traces, and that distinction is load-bearing in both directions. If you make a whole conversation one trace, the root span\u2019s duration becomes the length of the conversation and every latency percentile you have becomes meaningless. If you drop the session ID, you lose the bugs that only exist across turns \u2014 context growing until it truncates, a pronoun resolved against the wrong earlier turn, cost per session drifting while cost per request looks fine." },
        { t: "p", text: "The tree specifically buys three things a flat log cannot give you at any price. Self time, which is a span\u2019s duration with its children subtracted \u2014 in a trace I know well, retrieval was 624 milliseconds and its three children totalled 617, so the orchestration cost 7 milliseconds and the rest was real work. The critical path, which matters as soon as anything is concurrent, because then the sum of span durations exceeds the wall clock and only the parent links tell you which branch you were actually waiting on. And blame by stage, which falls out for free: 76% of that request was the model and 20% was retrieval, which is the number that stops someone optimising the vector search at 8.7%." },
        { t: "p", text: "I would add a fourth that people miss: the gaps between spans. The space between one span ending and the next beginning is your own process doing something it did not instrument \u2014 a connection-pool wait, JSON serialisation, a synchronous log write. A couple of milliseconds is healthy; 200 milliseconds is a finding, and it is invisible to every metric you have because no span covers it." },
        { t: "p", text: "One subtlety on reading those gaps: a gap at one depth can be two gaps at another. An apparent 4 milliseconds between a reranker finishing and prompt assembly starting can be 2 milliseconds to close the parent retrieval span plus 2 to open the next sibling. So compare within a sibling set rather than across a nesting boundary." },
        { t: "p", text: "And span kind is not decoration. CLIENT marks every call out of the process, which is exactly the set whose duration is somebody else\u2019s SLA. In that trace the CLIENT spans were 2,988 of 3,134 milliseconds, so 95% of the request was waiting on a network call and profiling my own code would have been pointless." }
      ] }
  ],

  takeaways: [
    "**A trace is one request; a span is one unit of work inside it**; the parent pointer is what makes it a tree.",
    "**A session sits above traces** \u2014 one conversation is many traces, and the two must not be collapsed.",
    "**Collapsing a conversation into one trace destroys your latency percentiles**, because the root duration becomes the conversation length.",
    "**Dropping the session ID loses every multi-turn bug**: growing context, cross-turn reference errors, cost per session.",
    "**Span kind is load-bearing**: `CLIENT` marks the spans whose duration is somebody else's SLA rather than your code.",
    "**Self time is duration minus children** \u2014 624 minus 617 gives 7 ms of orchestration, which separates framework overhead from real work.",
    "**The critical path matters as soon as anything is concurrent**, because then the sum of durations exceeds the wall clock.",
    "**Blame by stage is free from the tree**: 76% model, 20% retrieval, with no extra instrumentation.",
    "**The gaps between spans are your own uninstrumented code** \u2014 2 ms is healthy, 200 ms is a finding, and no metric shows it.",
    "**A gap at one depth can be two gaps at another**, so read gaps within a sibling set and not across a nesting boundary.",
    "**Negative self time is the signature of concurrency**, not a bug \u2014 overlapping children sum to more than their parent.",
    "**Context propagation is what makes the tree survive a boundary**; forget it and a child becomes a second root."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Why should a multi-turn conversation be many traces rather than one?",
        options: [
          "Because trace storage limits the number of spans per trace",
          "Because the root span's duration is the user-visible latency \u2014 making a conversation one trace turns that into the conversation length and destroys every latency percentile",
          "Because each turn uses a different model version",
          "Because sessions cannot carry attributes"
        ],
        answer: 1,
        why: "The root span's duration is what every latency percentile is computed from, so if the root covers a whole conversation then p95 describes conversation length rather than response time and nobody can act on it. The correct structure is a session ID carried as an attribute on the root span of each per-turn trace, which keeps turn latency meaningful while still allowing the whole conversation to be queried \u2014 and the multi-turn bugs like context growth need exactly that grouping." },

      { stem: "A span's duration is 624 ms and its children total 617 ms. What does the 7 ms tell you?",
        options: [
          "That 7 ms of the span's work was not instrumented and is probably a bug",
          "That the span's own orchestration cost 7 ms, so essentially all of its time was real work in its children",
          "That the children overlapped by 7 ms",
          "That the clock resolution is 7 ms"
        ],
        answer: 1,
        why: "Self time is the span's duration with its children subtracted, and a small positive self time means the parent is doing almost nothing but coordinating \u2014 which is exactly what you want from a retrieval wrapper. It is the diagnostic that separates framework overhead from real work: a parent with large self time is spending real time on something that is not in any child span, and that is worth instrumenting more finely." },

      { stem: "You compute self time and get a negative number. What happened?",
        options: [
          "The span list is corrupt and the parent pointers are wrong",
          "The children overlapped \u2014 concurrency means their durations sum to more than the parent's wall-clock time",
          "A child span outlived its parent, which is always an instrumentation bug",
          "The clock went backwards between the two reads"
        ],
        answer: 1,
        why: "Once two children run concurrently their durations sum to more than the parent spans in wall-clock terms, so naive subtraction goes negative \u2014 which is information rather than an error, and the right response is to treat it as evidence of concurrency and switch to the critical path. This is also why summing span durations is not a valid way to compute total time in any system with parallelism; only the parent links tell you which branch determined the total." },

      { stem: "What is the symptom of a context-propagation bug?",
        options: [
          "Spans with ERROR status and no exception type recorded",
          "Many single-span traces with no children, alongside parent traces with unexplained gaps where the work should be",
          "Duplicate span IDs within one trace",
          "Attributes missing from CLIENT spans only"
        ],
        answer: 1,
        why: "When the current span ID is not passed across a thread, async task, queue or HTTP boundary, the child cannot find its parent and becomes a root of its own \u2014 so one request produces several unrelated traces. The parent trace then shows a gap covering work that did happen but was recorded elsewhere, which reads like a performance problem and is actually a wiring problem. Thread pools, `contextvars` in async code, and serialising context into queue messages are the three places it usually breaks." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Traces and spans",
    questions: [
      { level: "foundation",
        q: "Define trace, span and session.",
        strong: "A strong answer is precise and gets the parent pointer in.",
        answer: [
          { t: "p", text: "A trace is everything that happened for one request, end to end, identified by a trace ID. A span is one unit of work inside that trace \u2014 a function, a call, a stage \u2014 with its own span ID. A session is the grouping above a trace: one conversation is many traces, one per turn." },
          { t: "p", text: "The piece that makes it work is the parent pointer on each span. That is what turns a trace from a list of timed events into a tree, and the tree is where all the useful properties come from." },
          { t: "p", text: "The root span is the one with no parent \u2014 the request itself \u2014 and its duration is the user-visible latency, which is why the session must not be the root. Span kind marks whether the work was received, called out, or in-process." }
        ] },

      { level: "core",
        q: "What can you compute from a tree that you cannot from a log?",
        strong: "A strong answer names self time and the critical path.",
        answer: [
          { t: "p", text: "Self time first: a span\u2019s duration with its children subtracted. That separates orchestration overhead from real work, and a flat log cannot compute it because it has no idea which lines are nested inside which." },
          { t: "p", text: "Then the critical path \u2014 which chain of spans actually determined the total. This is the one that becomes essential rather than nice as soon as anything is concurrent, because then the durations sum to more than the wall clock and you need the parent links to know which branch you were waiting on." },
          { t: "p", text: "And blame by stage, which is free: the share of a request spent in the model versus retrieval versus guardrails, with no instrumentation beyond the spans you already have. That number is usually what redirects an optimisation effort." },
          { t: "p", text: "The one I would add is the gaps. The time between one span closing and the next opening is your own code doing something uninstrumented, and 200 milliseconds of JSON serialisation hides there with no metric showing it." }
        ] },

      { level: "advanced",
        q: "Where does context propagation break?",
        strong: "A strong answer names three concrete boundaries.",
        answer: [
          { t: "p", text: "Anywhere the implicit stack does not follow the work. Three places in practice: a thread pool, where the stack is per-thread so the context has to be captured on submit and restored in the worker; an async task, where `contextvars` carries it correctly and a module-level global does not; and a queue, where the trace context has to be serialised into the message so the consumer can continue the same trace minutes later." },
          { t: "p", text: "The failure is not loud. A child that cannot find its parent becomes a root, so one request silently becomes several unrelated traces." },
          { t: "p", text: "The symptom is distinctive once you know it: a population of single-span traces with no children, and parent traces with gaps covering work that definitely happened. People read that as a performance problem and it is a wiring problem." },
          { t: "p", text: "Across an HTTP boundary it is a header, and the standard defines the format, which is one of the practical reasons to use the standard rather than roll your own \u2014 a vendor SDK on the other side will read it." }
        ] }
    ]
  }
});
