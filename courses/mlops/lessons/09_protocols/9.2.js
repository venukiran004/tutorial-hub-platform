/* ============================================================================
   LESSON 9.2 — gRPC: Contracts and Streaming
   ========================================================================= */
EC.receiveLesson({
  id: "9.2",

  lede: "gRPC replaces REST's loose conventions with a contract. You write the messages and methods in a `.proto` file, a compiler generates client and server code in each language, and calls travel as compact protobuf over HTTP/2. The contract buys a binary encoding, typed stubs, streaming in both directions, deadlines and a fixed set of status codes. It also brings a problem REST rarely has: one long-lived connection carries every call, so a load balancer that balances connections stops balancing requests. This lesson runs a real gRPC server and measures each of these.",

  objectives: [
    "Write a proto contract and explain how field numbers make it evolvable",
    "Use the four call types, and choose streaming where it changes what is possible",
    "Set deadlines and propagate them so abandoned work stops",
    "Map failures to gRPC status codes",
    "Explain why gRPC needs client-side or L7 load balancing, and demonstrate the difference"
  ],

  prerequisites: ["9.1"],

  blocks: [
    { t: "h2", n: "01", id: "contract", text: "The contract", sub: "Messages, methods and field numbers" },
    { t: "p",
      text: "A proto file declares messages and a service. Each field has a **number**, and the number, not the name, is what goes on the wire. That is what makes the contract evolvable: you can add a field with a new number and old clients skip it; you must never reuse a number for a different meaning. `repeated float` is packed, four bytes per value with a short header." },
    { t: "code",
      lang: "text",
      title: "inference.proto — the contract",
      code: `syntax = "proto3";
package inference.v1;

message PredictRequest {
  string model = 1;
  repeated float features = 2;      // packed: 4 bytes per value
}
message PredictResponse {
  float score = 1;
  string model_version = 2;
}
message Token {
  string text = 1;
  int32 index = 2;
}

service Predictor {
  rpc Predict(PredictRequest) returns (PredictResponse);                // unary
  rpc Generate(PredictRequest) returns (stream Token);                  // server streaming
  rpc PredictStream(stream PredictRequest) returns (stream PredictResponse);  // bidirectional
}` },
    { t: "p",
      text: "`protoc` normally generates `inference_pb2.py` and `inference_pb2_grpc.py` from this file. The scripts in this lesson build the same message classes from a descriptor at runtime and register handlers generically, so they run with only `grpcio` and `protobuf` installed. The wire format and behaviour are identical." },
    { t: "code",
      lang: "python",
      title: "infer_pb.py — the same messages, built from a descriptor",
      code: `"""The messages of inference.proto, built from a descriptor at runtime. \`protoc\` would generate equivalent
classes (inference_pb2.py); building them here keeps the scripts runnable with only grpcio and protobuf."""
from google.protobuf import descriptor_pb2, descriptor_pool, message_factory

F = descriptor_pb2.FieldDescriptorProto
fd = descriptor_pb2.FileDescriptorProto(name="inference.proto", package="inference.v1", syntax="proto3")
def message(name, *fields):
    m = fd.message_type.add(name=name)
    for num, fname, ftype, repeated in fields:
        m.field.add(name=fname, number=num, type=ftype,
                    label=F.LABEL_REPEATED if repeated else F.LABEL_OPTIONAL)
message("PredictRequest", (1, "model", F.TYPE_STRING, False), (2, "features", F.TYPE_FLOAT, True))
message("PredictResponse", (1, "score", F.TYPE_FLOAT, False), (2, "model_version", F.TYPE_STRING, False))
message("Token", (1, "text", F.TYPE_STRING, False), (2, "index", F.TYPE_INT32, False))
pool = descriptor_pool.DescriptorPool(); pool.Add(fd)
PredictRequest = message_factory.GetMessageClass(pool.FindMessageTypeByName("inference.v1.PredictRequest"))
PredictResponse = message_factory.GetMessageClass(pool.FindMessageTypeByName("inference.v1.PredictResponse"))
Token = message_factory.GetMessageClass(pool.FindMessageTypeByName("inference.v1.Token"))
SERVICE = "inference.v1.Predictor"` },
    { t: "h2",
      n: "02",
      id: "calls",
      text: "Four call types, codes and deadlines",
      sub: "A real server, measured" },
    { t: "p",
      text: "Unary is one request and one response. Server streaming returns a sequence, which is how token-by-token LLM output is sent. Client streaming sends a sequence and gets one answer. Bidirectional streaming does both on one stream, independently. Every call carries a deadline, and a failure arrives as one of 17 status codes rather than a free-form HTTP status." },
    { t: "code",
      lang: "python",
      title: "grpcdemo.py — unary, streaming, status codes and the wire size",
      code: `import time
from concurrent import futures
import grpc, numpy as np
from infer_pb import PredictRequest, PredictResponse, Token, SERVICE

W = np.random.default_rng(1).normal(0, 0.05, 512).astype(np.float32)

def predict(req, ctx):
    if len(req.features) != 512:
        ctx.abort(grpc.StatusCode.INVALID_ARGUMENT, f"expected 512 features, got {len(req.features)}")
    if req.model == "slow": time.sleep(0.3)                       # a model that takes 300 ms
    x = np.asarray(req.features, dtype=np.float32)
    return PredictResponse(score=float(1 / (1 + np.exp(-x @ W))), model_version="churn-2024-06-01")

def generate(req, ctx):                                            # server streaming: tokens as they are produced
    for i, word in enumerate("the customer is likely to renew next month".split()):
        time.sleep(0.04); yield Token(text=word, index=i)

def predict_stream(reqs, ctx):                                     # bidirectional: one response per request, same stream
    for r in reqs: yield predict(r, ctx)

ser = lambda m: m.SerializeToString()
handlers = grpc.method_handlers_generic_handler(SERVICE, {
    "Predict": grpc.unary_unary_rpc_method_handler(predict, PredictRequest.FromString, ser),
    "Generate": grpc.unary_stream_rpc_method_handler(generate, PredictRequest.FromString, ser),
    "PredictStream": grpc.stream_stream_rpc_method_handler(predict_stream, PredictRequest.FromString, ser)})
server = grpc.server(futures.ThreadPoolExecutor(8)); server.add_generic_rpc_handlers((handlers,))
server.add_insecure_port("127.0.0.1:50061"); server.start()

ch = grpc.insecure_channel("127.0.0.1:50061")
Predict = ch.unary_unary(f"/{SERVICE}/Predict", ser, PredictResponse.FromString)
Generate = ch.unary_stream(f"/{SERVICE}/Generate", ser, Token.FromString)
PredictStream = ch.stream_stream(f"/{SERVICE}/PredictStream", ser, PredictResponse.FromString)

vec = np.random.default_rng(0).normal(0, 1, 512).astype(np.float32)
req = PredictRequest(model="churn", features=vec)
print(f"== the message on the wire ==\\n  PredictRequest with 512 floats: {len(req.SerializeToString()):,} bytes")
back = PredictRequest.FromString(req.SerializeToString())
print(f"  decodes to the same float32 values: {np.array_equal(np.asarray(back.features, np.float32), vec)}")

print("\\n== unary ==")
r = Predict(req, timeout=1.0); print(f"  score {r.score:.4f}, version {r.model_version}")

print("\\n== status codes ==")
for label, call in [("511 features", lambda: Predict(PredictRequest(model="churn", features=vec[:511]), timeout=1.0)),
                    ("deadline 100 ms, model takes 300", lambda: Predict(PredictRequest(model="slow", features=vec), timeout=0.1))]:
    try: call()
    except grpc.RpcError as e: print(f"  {label:<34} {e.code().name}: {e.details()}")

print("\\n== server streaming ==")
t = time.perf_counter(); first = None; words = []
for tok in Generate(req, timeout=2.0):
    first = first or time.perf_counter() - t; words.append(tok.text)
print(f"  first token after {first * 1000:.0f} ms, all {len(words)} after {(time.perf_counter() - t) * 1000:.0f} ms: '{' '.join(words)}'")

print("\\n== bidirectional streaming: 1,000 predictions on one stream ==")
t = time.perf_counter(); n = sum(1 for _ in PredictStream(iter([req] * 1000), timeout=10.0)); el = time.perf_counter() - t
t = time.perf_counter()
for _ in range(1000): Predict(req, timeout=1.0)
el_unary = time.perf_counter() - t
print(f"  stream: {n} responses in {el * 1000:.0f} ms; 1,000 unary calls: {el_unary * 1000:.0f} ms")
server.stop(0)`,
      out: `== the message on the wire ==
  PredictRequest with 512 floats: 2,058 bytes
  decodes to the same float32 values: True

== unary ==
  score 0.4751, version churn-2024-06-01

== status codes ==
  511 features                       INVALID_ARGUMENT: expected 512 features, got 511
  deadline 100 ms, model takes 300   DEADLINE_EXCEEDED: Deadline Exceeded

== server streaming ==
  first token after 42 ms, all 8 after 327 ms: 'the customer is likely to renew next month'

== bidirectional streaming: 1,000 predictions on one stream ==
  stream: 1000 responses in 416 ms; 1,000 unary calls: 661 ms` },
    { t: "dl",
      items: [
        { term: "Compact and exact",
          def: "The request with 512 floats was 2,058 bytes: 2,048 of data and 10 of framing, and it decoded to the same float32 values. JSON from the standard library needed 10,588 bytes for the same vector (lesson 9.1)." },
        { term: "Streaming changes the experience",
          def: "The first of eight tokens arrived after 42 ms and the last after 327 ms. With a unary call the user would wait the full 327 ms to see anything." },
        { term: "One stream, many messages",
          def: "1,000 predictions on one bidirectional stream took 416 ms against 661 ms for 1,000 unary calls, because per-call setup is paid once." },
        { term: "Codes carry intent",
          def: "A 511-feature request returned INVALID_ARGUMENT (do not retry) and a call over its 100 ms deadline returned DEADLINE_EXCEEDED. UNAVAILABLE is the code that means retry." }
      ] },
    { t: "callout",
      kind: "trap",
      title: "No deadline means waiting forever",
      body: [
        { t: "p",
          text: "A gRPC call without a timeout has no deadline. When a server hangs, the client's threads wait indefinitely, and the caller's caller times out instead, with nothing pointing at the cause. Set a deadline on every call, from the latency budget, and pass the remaining time down to every call you make while serving it. The exercise measures what happens when you do not." }
      ] },
    { t: "h2", n: "03", id: "lb", text: "The load-balancing problem", sub: "One connection carries everything" },
    { t: "p",
      text: "HTTP/2 multiplexes every call over one long-lived TCP connection. A layer-4 load balancer balances **connections**, so once the connection is made, every call from that client goes to the same replica, however busy it is. The script starts three replicas and sends 3,000 calls from one channel, first with gRPC's default policy and then with round robin across all three addresses." },
    { t: "code",
      lang: "python",
      title: "lb.py — three replicas, two client policies",
      code: `import json
from collections import Counter
from concurrent import futures
import grpc, numpy as np
from infer_pb import PredictRequest, PredictResponse, SERVICE

# Three replicas of the same model server; each reports which replica answered.
ser = lambda m: m.SerializeToString()
servers, ports = [], [50071, 50072, 50073]
for port in ports:
    def predict(req, ctx, port=port): return PredictResponse(score=0.5, model_version=f"replica-{port}")
    s = grpc.server(futures.ThreadPoolExecutor(4))
    s.add_generic_rpc_handlers((grpc.method_handlers_generic_handler(SERVICE, {
        "Predict": grpc.unary_unary_rpc_method_handler(predict, PredictRequest.FromString, ser)}),))
    s.add_insecure_port(f"127.0.0.1:{port}"); s.start(); servers.append(s)

target = "ipv4:" + ",".join(f"127.0.0.1:{p}" for p in ports)       # what DNS would return for a headless service
req = PredictRequest(model="churn", features=np.zeros(512, np.float32))

def spread(options):
    ch = grpc.insecure_channel(target, options=options)
    call = ch.unary_unary(f"/{SERVICE}/Predict", ser, PredictResponse.FromString)
    c = Counter(call(req, timeout=2.0).model_version for _ in range(3_000)); ch.close(); return c

print("3,000 calls from one client channel to three replicas:")
print(f"  default (pick_first):   {dict(spread([]))}")
rr = json.dumps({"loadBalancingConfig": [{"round_robin": {}}]})
print(f"  round_robin policy:     {dict(spread([('grpc.service_config', rr)]))}")
for s in servers: s.stop(0)`,
      out: `3,000 calls from one client channel to three replicas:
  default (pick_first):   {'replica-50071': 3000}
  round_robin policy:     {'replica-50073': 1001, 'replica-50071': 1000, 'replica-50072': 999}` },
    { t: "viz",
      title: "Where 3,000 calls from one client landed",
      caption: "With pick_first, the client connected to the first address and sent everything there. With round_robin over all resolved addresses, each replica took a third.",
      svg: `<svg viewBox="0 0 760 248" width="100%" role="img">
<text x="200" y="31.0" text-anchor="end" class="s-label">pick_first: replica 1</text>
<rect x="210" y="14" width="375.0" height="26" rx="4" class="s-fill" style="stroke:var(--crit);stroke-width:1.8"/>
<text x="593.0" y="31.0" class="s-sub">3,000 calls</text>
<text x="200" y="69.0" text-anchor="end" class="s-label">pick_first: replica 2</text>
<rect x="210" y="52" width="2.0" height="26" rx="4" class="s-fill" style="stroke:var(--crit);stroke-width:1.8"/>
<text x="220.0" y="69.0" class="s-sub">0</text>
<text x="200" y="107.0" text-anchor="end" class="s-label">pick_first: replica 3</text>
<rect x="210" y="90" width="2.0" height="26" rx="4" class="s-fill" style="stroke:var(--crit);stroke-width:1.8"/>
<text x="220.0" y="107.0" class="s-sub">0</text>
<text x="200" y="145.0" text-anchor="end" class="s-label">round_robin: replica 1</text>
<rect x="210" y="128" width="125.0" height="26" rx="4" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="343.0" y="145.0" class="s-sub">1,000</text>
<text x="200" y="183.0" text-anchor="end" class="s-label">round_robin: replica 2</text>
<rect x="210" y="166" width="124.9" height="26" rx="4" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="342.9" y="183.0" class="s-sub">999</text>
<text x="200" y="221.0" text-anchor="end" class="s-label">round_robin: replica 3</text>
<rect x="210" y="204" width="125.1" height="26" rx="4" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="343.1" y="221.0" class="s-sub">1,001</text>
</svg>` },
    { t: "dl",
      items: [
        { term: "Client-side balancing",
          def: "The client resolves every replica (in Kubernetes, through a headless Service that returns pod IPs) and spreads calls with round_robin. It needs the client to re-resolve when pods change." },
        { term: "Proxy balancing",
          def: "An L7 proxy that understands HTTP/2, such as Envoy or a service mesh sidecar, balances individual calls. Clients stay simple; every call takes an extra hop." },
        { term: "Connection age",
          def: "Servers can set a maximum connection age so clients reconnect periodically and new replicas receive traffic after a scale-up." }
      ] },
    { t: "exercise",
      kind: "Challenge",
      title: "Propagate the deadline",
      difficulty: "core",
      minutes: 25,
      body: [
        { t: "p",
          text: "Build a frontend gRPC service that calls a feature service before answering. The feature service does 15 steps of 10 ms and stops early if its caller has gone. A client calls the frontend 40 times with an 80 ms deadline, so every call fails. Compare a frontend that calls downstream with its own fixed 1-second timeout against one that passes on the time remaining from its own deadline, counting the feature-service work actually done." }
      ],
      requirements: [
        "A feature service that checks context.is_active() between steps",
        "Two frontends: fixed timeout, and context.time_remaining()",
        "The status the client sees in each case",
        "Total downstream steps executed, and work per request"
      ],
      hint: "context.time_remaining() returns the seconds left before the incoming call's deadline; use it as the timeout of the outgoing call.",
      solution: { lang: "python",
        title: "deadline_propagation.py",
        code: `import threading, time
from concurrent import futures
import grpc, numpy as np
from infer_pb import PredictRequest, PredictResponse, SERVICE

ser = lambda m: m.SerializeToString()
wasted = {"steps": 0}; lock = threading.Lock()

# The feature service: 15 steps of 10 ms. It stops early if its caller has gone away.
def features(req, ctx):
    for _ in range(15):
        if not ctx.is_active(): return PredictResponse()
        time.sleep(0.01)
        with lock: wasted["steps"] += 1
    return PredictResponse(score=1.0)

def serve(port, method):
    s = grpc.server(futures.ThreadPoolExecutor(16))
    s.add_generic_rpc_handlers((grpc.method_handlers_generic_handler(SERVICE, {
        "Predict": grpc.unary_unary_rpc_method_handler(method, PredictRequest.FromString, ser)}),))
    s.add_insecure_port(f"127.0.0.1:{port}"); s.start(); return s

feat_srv = serve(50081, features)
feat = grpc.insecure_channel("127.0.0.1:50081").unary_unary(f"/{SERVICE}/Predict", ser, PredictResponse.FromString)

def make_frontend(propagate):
    def predict(req, ctx):
        # Without propagation the frontend uses its own fixed 1 s timeout for the downstream call.
        timeout = ctx.time_remaining() if propagate else 1.0
        try: feat(req, timeout=timeout)
        except grpc.RpcError as e: ctx.abort(e.code(), f"feature service: {e.code().name}")
        return PredictResponse(score=0.5)
    return predict

req = PredictRequest(model="churn", features=np.zeros(512, np.float32))
for port, propagate in ((50082, False), (50083, True)):
    srv = serve(port, make_frontend(propagate))
    call = grpc.insecure_channel(f"127.0.0.1:{port}").unary_unary(f"/{SERVICE}/Predict", ser, PredictResponse.FromString)
    with lock: wasted["steps"] = 0
    codes = []
    for _ in range(40):
        try: call(req, timeout=0.08); codes.append("OK")       # the client allows 80 ms; the work needs 150 ms
        except grpc.RpcError as e: codes.append(e.code().name)
    time.sleep(0.3)                                               # let any orphaned work finish
    done = wasted["steps"]
    print(f"{'with' if propagate else 'without'} deadline propagation: client saw {set(codes)}; "
          f"feature service ran {done} of {40 * 15} steps ({done / 40 * 10:.0f} ms of work per request)")
    srv.stop(0)
feat_srv.stop(0)`,
        out: `without deadline propagation: client saw {'DEADLINE_EXCEEDED'}; feature service ran 600 of 600 steps (150 ms of work per request)
with deadline propagation: client saw {'DEADLINE_EXCEEDED'}; feature service ran 354 of 600 steps (88 ms of work per request)`,
        notes: [
          { t: "p",
            text: "The client saw DEADLINE_EXCEEDED either way: it gave up at 80 ms. The difference was behind it. Without propagation the feature service ran all 600 steps, 150 ms of work per request, for answers nobody would read. With the remaining time passed down, the downstream call was cancelled at the deadline and the service stopped after about 9 steps." },
          { t: "p",
            text: "Under load this is the difference between recovering and collapsing. When a system slows down, clients time out and retry, and every orphaned call keeps consuming capacity, which slows the system further. Propagated deadlines make abandoned work stop at every hop." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: one replica at 100% CPU, two idle",
      body: [
        { t: "p",
          text: "**Symptom.** After moving the ranking service from REST to gRPC, p99 latency doubled. One of three replicas ran at full CPU while the others were nearly idle. Adding replicas did not help." },
        { t: "p",
          text: "**Mechanism.** The callers connected through a Kubernetes ClusterIP Service, which balances TCP connections. Each caller opened one HTTP/2 connection at startup and sent every call over it, and most of the traffic came from two large callers that happened to land on the same replica. New replicas received no connections at all." },
        { t: "p",
          text: "**Fix.** The service moved to a headless Service with client-side round_robin, and the server set a maximum connection age of five minutes, so clients reconnect and spread across replicas added by the autoscaler. Per-replica request rate became a dashboard panel." }
      ] }
  ],

  takeaways: [
    "A proto contract fixes types and **field numbers**; add new numbers, never reuse old ones.",
    "Measured: 512 floats as protobuf were **2,058 bytes**, exact, against 10,588 as standard-library JSON.",
    "Server streaming delivered the first token at **42 ms** instead of waiting **327 ms** for the whole answer.",
    "1,000 predictions on one bidirectional stream: **416 ms**, against **661 ms** as unary calls.",
    "Status codes carry intent: INVALID_ARGUMENT means fix it, UNAVAILABLE means retry, DEADLINE_EXCEEDED means you ran out of time.",
    "Always set a deadline, and propagate the remaining time: it cut orphaned downstream work from **150 ms** to about **88 ms** per request.",
    "With the default **pick_first** policy, **all 3,000** calls went to one replica; **round_robin** split them evenly.",
    "Balance gRPC with client-side policies over a headless Service, or an L7 proxy; L4 balancing pins connections."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "What goes on the wire to identify a protobuf field?",
        options: [
          "The field's name, as written in the proto",
          "The field's number, declared in the contract",
          "The field's position in the class definition",
          "A hash of the field's name and its type"
        ],
        answer: 1,
        why: "Only the number and a wire type are encoded. That is why renaming a field is safe and reusing a number is not; names never travel, and order and hashes play no part." },
      { stem: "Three gRPC replicas sit behind a TCP (L4) load balancer. Why can one get all the traffic?",
        options: [
          "gRPC refuses to open more than one stream per server",
          "Calls share one long-lived connection pinned to a replica",
          "Protobuf messages are far too large to be balanced cheaply",
          "TCP balancers cannot route any HTTP/2 traffic at all"
        ],
        answer: 1,
        why: "HTTP/2 multiplexes all calls on one connection, and an L4 balancer only chooses where connections go. gRPC uses many streams per connection, and L4 balancers do carry HTTP/2." },
      { stem: "A frontend has 80 ms left on its incoming call. What timeout should it give its downstream call?",
        options: [
          "A fixed second, so the downstream call never fails",
          "The remaining time, so abandoned work is cancelled",
          "No timeout, since the client already has one set",
          "Twice the remaining time, to allow for one retry"
        ],
        answer: 1,
        why: "Passing the remaining time cancels downstream work when the client gives up; in the exercise a fixed 1 s timeout let the feature service do all 150 ms of work for every abandoned call." },
      { stem: "Which status code tells a client that retrying the same call might succeed?",
        options: [
          "INVALID_ARGUMENT, since the input was rejected",
          "UNAVAILABLE, since the server could not serve it",
          "NOT_FOUND, since the model may appear later",
          "PERMISSION_DENIED, since its tokens may refresh later"
        ],
        answer: 1,
        why: "UNAVAILABLE means a transient condition such as overload or restart. INVALID_ARGUMENT and NOT_FOUND will fail again unchanged, and PERMISSION_DENIED needs new credentials, not a retry." }
    ] },

  interview: { title: "In an interview",
    sub: "Show you know what gRPC buys, and what it costs in operations.",
    questions: [
      { level: "core",
        q: "When would you choose gRPC over REST for model serving?",
        strong: "A strong answer names the callers, the payload and streaming, and the operational costs.",
        answer: [
          { t: "p",
            text: "For internal service-to-service calls with large numeric payloads, many calls per second, or streaming, such as token streaming or a long-lived bidirectional feed. The proto gives typed clients in every language and a contract that evolves safely by field number." },
          { t: "p",
            text: "REST stays right for browsers, public APIs, third parties and anything that benefits from curl and HTTP caches. gRPC needs L7 or client-side load balancing, and its binary payloads are harder to inspect, so I would budget for both." }
        ] },
      { level: "core",
        q: "How do you evolve a proto contract without breaking clients?",
        strong: "A strong answer covers adding, removing and renaming fields, and reserved numbers.",
        answer: [
          { t: "p",
            text: "Add fields with new numbers; old readers ignore unknown fields and new readers see defaults when old writers omit them. Never change a field's type or reuse its number; when removing one, mark its number and name `reserved` so nobody reuses them. Renaming is safe on the wire but breaks generated code, so treat it as a breaking change for source. Breaking changes go into a new package version, inference.v2, served alongside v1." }
        ] },
      { level: "advanced",
        q: "Your gRPC service is slow and clients retry. Why does the slowdown get worse, and how do you stop it?",
        strong: "A strong answer explains orphaned work and retry amplification, with deadlines, budgets and backoff.",
        answer: [
          { t: "p",
            text: "Clients time out but the server keeps working on their calls, and each retry adds a new call, so load rises exactly when capacity falls. Fixes: deadlines on every call, propagated downstream so cancelled calls stop at every hop; retries only on UNAVAILABLE with exponential backoff and jitter, under a retry budget such as 10% of calls; and load shedding at the server, rejecting early with UNAVAILABLE when queues are long rather than accepting work it cannot finish in time." }
        ] }
    ] }
});
