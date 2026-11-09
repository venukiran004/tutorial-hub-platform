/* ============================================================================
   LESSON 9.3 — The Comparison, Measured
   ========================================================================= */
EC.receiveLesson({
  id: "9.3",

  lede: "'gRPC is seven times faster than REST' is quoted far more often than it is measured, and the number depends on what is being compared. This lesson encodes the same prediction payloads both ways and measures bytes, encode and decode time to a NumPy array, end-to-end latency and throughput under load, across five payload sizes and two payload shapes. Some results match the folklore. Others do not: in Python, a fast JSON library beat protobuf's repeated float field, and under load a single server process erased most of the difference. The lesson ends with the decision checklist, including the cases where REST is the correct engineering answer.",

  objectives: [
    "Measure payload size and encode-plus-decode time for JSON, orjson and protobuf across payload sizes",
    "Explain why protobuf's repeated float can be slower than a fast JSON parser, and when to use a bytes field",
    "Measure end-to-end latency and throughput, and separate protocol cost from server capacity",
    "Choose a protocol from the caller, the payload and the operational context"
  ],

  prerequisites: ["9.1", "9.2"],

  blocks: [
    { t: "h2", n: "01", id: "encoding", text: "Bytes and parse time", sub: "The same vectors, four ways" },
    { t: "p",
      text: "Each path below ends where the server needs the data: a float32 NumPy array. The raw variant is a protobuf message with a single `bytes` field holding the array's memory, which is what TensorFlow Serving's `tensor_content` and the KServe v2 protocol's `raw_input_contents` do. The record test uses a 20-field customer record of the kind tabular models receive." },
    { t: "code",
      lang: "python",
      title: "compare.py — size, time and compression by payload size and shape",
      code: `import gzip, json, timeit
import numpy as np, orjson
from google.protobuf import descriptor_pb2, descriptor_pool, message_factory
from infer_pb import PredictRequest

def t_us(f, n=50): return min(timeit.repeat(f, number=n, repeat=5)) / n * 1e6
rng = np.random.default_rng(0)

F = descriptor_pb2.FieldDescriptorProto
fd = descriptor_pb2.FileDescriptorProto(name="customer.proto", package="demo", syntax="proto3")
m = fd.message_type.add(name="Customer")
names = ["country", "device", "plan", "channel", "segment"] + [f"spend_{i}" for i in range(15)]
for i, nm in enumerate(names, 1):
    m.field.add(name=nm, number=i, type=F.TYPE_STRING if i <= 5 else F.TYPE_FLOAT, label=F.LABEL_OPTIONAL)
r = fd.message_type.add(name="RawRequest")          # a tensor as raw bytes, like KServe v2 raw_input_contents
r.field.add(name="raw", number=1, type=F.TYPE_BYTES, label=F.LABEL_OPTIONAL)
pool = descriptor_pool.DescriptorPool(); pool.Add(fd)
Customer = message_factory.GetMessageClass(pool.FindMessageTypeByName("demo.Customer"))
RawRequest = message_factory.GetMessageClass(pool.FindMessageTypeByName("demo.RawRequest"))

print("== dense float vectors: bytes and encode+decode time ==")
print(f"{'values':>7} | {'JSON':>9} {'orjson':>9} {'proto':>9} {'raw':>9} | {'JSON µs':>8} {'orjson µs':>9} {'proto µs':>9} {'raw µs':>7} | {'JSON gz':>8} {'proto gz':>8}")
for n in (16, 128, 1024, 8192, 65536):
    v = rng.normal(0, 1, n).astype(np.float32)
    js = json.dumps({"features": [float(x) for x in v]}).encode()
    oj = orjson.dumps({"features": v}, option=orjson.OPT_SERIALIZE_NUMPY)
    pb = PredictRequest(model="churn", features=v).SerializeToString()
    rb = RawRequest(raw=v.tobytes()).SerializeToString()
    k = max(1, 2000 // n)
    # each path ends where the model needs it: a float32 numpy array on the server
    tj = t_us(lambda: np.asarray(json.loads(json.dumps({"features": [float(x) for x in v]}))["features"], np.float32), k)
    to = t_us(lambda: np.asarray(orjson.loads(orjson.dumps({"features": v}, option=orjson.OPT_SERIALIZE_NUMPY))["features"], np.float32), k)
    tp = t_us(lambda: np.asarray(PredictRequest.FromString(PredictRequest(model="churn", features=v).SerializeToString()).features, np.float32), k)
    tr = t_us(lambda: np.frombuffer(RawRequest.FromString(RawRequest(raw=v.tobytes()).SerializeToString()).raw, np.float32), k)
    print(f"{n:>7,} | {len(js):>9,} {len(oj):>9,} {len(pb):>9,} {len(rb):>9,} | {tj:>8,.0f} {to:>9,.0f} {tp:>9,.0f} {tr:>7,.0f} | {len(gzip.compress(js)):>8,} {len(gzip.compress(pb)):>8,}")

# A record-shaped request: named categorical and numeric fields, the other common inference payload.

rec = {"country": "GB", "device": "ios", "plan": "annual", "channel": "organic", "segment": "smb",
       **{f"spend_{i}": round(float(x), 2) for i, x in enumerate(rng.gamma(2, 30, 15))}}
js = json.dumps(rec).encode(); pb = Customer(**rec).SerializeToString()
print("\\n== one record with 5 categorical and 15 numeric named fields ==")
print(f"  JSON {len(js)} bytes (gzip {len(gzip.compress(js))}), protobuf {len(pb)} bytes (gzip {len(gzip.compress(pb))})")
def record():
    return {"country": str(rng.choice(["GB", "US", "DE", "IN", "BR"])), "device": str(rng.choice(["ios", "android", "web"])),
            "plan": str(rng.choice(["monthly", "annual"])), "channel": str(rng.choice(["organic", "paid", "referral"])),
            "segment": str(rng.choice(["smb", "mid", "ent"])), **{f"spend_{i}": round(float(x), 2) for i, x in enumerate(rng.gamma(2, 30, 15))}}
recs = [record() for _ in range(200)]
batch_js = json.dumps(recs).encode(); batch_pb = b"".join(Customer(**r).SerializeToString() for r in recs)
print(f"  200 different records: JSON {len(batch_js):,} bytes, gzip {len(gzip.compress(batch_js)):,}; "
      f"protobuf {len(batch_pb):,}, gzip {len(gzip.compress(batch_pb)):,}")`,
      out: `== dense float vectors: bytes and encode+decode time ==
 values |      JSON    orjson     proto       raw |  JSON µs orjson µs  proto µs  raw µs |  JSON gz proto gz
     16 |       343       189        73        66 |       14         2         6       1 |      219       96
    128 |     2,645     1,389       522       515 |       88         9        27       2 |    1,323      545
  1,024 |    21,179    11,211     4,106     4,099 |      709        60       178       3 |   10,067    3,854
  8,192 |   168,919    89,214    32,779    32,772 |    5,873       590     1,499      50 |   75,617   30,335
 65,536 | 1,352,136   714,987   262,155   262,148 |   49,841     5,000    11,714     293 |  597,117  242,854

== one record with 5 categorical and 15 numeric named fields ==
  JSON 367 bytes (gzip 197), protobuf 111 bytes (gzip 134)
  200 different records: JSON 74,040 bytes, gzip 13,003; protobuf 22,424, gzip 11,994` },
    { t: "viz",
      title: "Encode and decode 1,024 floats to a NumPy array",
      caption: "Measured in Python. The repeated float field is compact on the wire but slow to turn into an array; a bytes field is compact and nearly free to decode.",
      svg: `<svg viewBox="0 0 760 172" width="100%" role="img">
<text x="220" y="31.0" text-anchor="end" class="s-label">JSON (standard library)</text>
<rect x="230" y="14" width="420.0" height="26" rx="4" class="s-fill" style="stroke:var(--crit);stroke-width:1.8"/>
<text x="658.0" y="31.0" class="s-sub">709 µs</text>
<text x="220" y="69.0" text-anchor="end" class="s-label">protobuf, repeated float</text>
<rect x="230" y="52" width="105.4" height="26" rx="4" class="s-fill" style="stroke:var(--warn);stroke-width:1.8"/>
<text x="343.4" y="69.0" class="s-sub">178 µs</text>
<text x="220" y="107.0" text-anchor="end" class="s-label">orjson</text>
<rect x="230" y="90" width="35.5" height="26" rx="4" class="s-fill" style="stroke:var(--accent);stroke-width:1.8"/>
<text x="273.5" y="107.0" class="s-sub">60 µs</text>
<text x="220" y="145.0" text-anchor="end" class="s-label">protobuf, raw bytes field</text>
<rect x="230" y="128" width="2.0" height="26" rx="4" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="240.0" y="145.0" class="s-sub">3 µs</text>
</svg>` },
    { t: "dl",
      items: [
        { term: "Size follows the folklore",
          def: "Protobuf was about a fifth of standard-library JSON and 37% of orjson at every size. Gzip narrowed it but did not close it for floats (10 KB against 3.9 KB at 1,024 values), because random float digits compress poorly." },
        { term: "Speed does not, in Python",
          def: "orjson to NumPy took 60 µs for 1,024 values; protobuf's repeated float took 178 µs, because each value becomes a Python float on the way into the array. A bytes field took 3 µs." },
        { term: "Shape matters",
          def: "For a 20-field record, protobuf was 111 bytes against 367, mostly because field numbers replace key names. Across 200 varied records, gzip brought JSON to 13.0 KB against protobuf's 12.0 KB: compression removes most of the key-name overhead." }
      ] },
    { t: "callout",
      kind: "trap",
      title: "Benchmarks that compare different work",
      body: [
        { t: "p",
          text: "A first version of this script timed JSON up to a Python list and protobuf up to a NumPy array, and protobuf looked slow for the wrong reason. Compare paths that end in the same place. Benchmarks published by a library's authors often compare their best path with someone else's default one." }
      ] },
    { t: "h2", n: "02", id: "e2e", text: "End to end", sub: "Latency over loopback" },
    { t: "p",
      text: "The same trivial model behind FastAPI with orjson and behind gRPC with the repeated-float message, called sequentially from one client. The model does almost nothing, so the numbers are the protocol stack: HTTP framing, routing, parsing and the Python server around them." },
    { t: "code",
      lang: "python",
      title: "e2e.py — median latency by payload size",
      code: `import threading, time
from concurrent import futures
import grpc, httpx, numpy as np, uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import ORJSONResponse
import orjson
from infer_pb import PredictRequest, PredictResponse, SERVICE

# The same trivial model behind both protocols, so the difference is the protocol and its encoding.
def model(x): return float(x[:16].sum())

app = FastAPI()
@app.post("/predict")
async def predict_rest(request: Request):
    x = np.asarray(orjson.loads(await request.body())["features"], np.float32)
    return ORJSONResponse({"score": model(x)})
srv = uvicorn.Server(uvicorn.Config(app, host="127.0.0.1", port=8741, log_level="error"))
threading.Thread(target=srv.run, daemon=True).start()

ser = lambda m: m.SerializeToString()
def predict_grpc(req, ctx): return PredictResponse(score=model(np.asarray(req.features, np.float32)))
gs = grpc.server(futures.ThreadPoolExecutor(4), options=[("grpc.max_receive_message_length", 64 << 20)])
gs.add_generic_rpc_handlers((grpc.method_handlers_generic_handler(SERVICE, {
    "Predict": grpc.unary_unary_rpc_method_handler(predict_grpc, PredictRequest.FromString, ser)}),))
gs.add_insecure_port("127.0.0.1:50091"); gs.start()
while not srv.started: time.sleep(0.05)

call = grpc.insecure_channel("127.0.0.1:50091", options=[("grpc.max_send_message_length", 64 << 20)]).unary_unary(
    f"/{SERVICE}/Predict", ser, PredictResponse.FromString)
http = httpx.Client(base_url="http://127.0.0.1:8741")
rng = np.random.default_rng(0)

def p50(f, n):
    for _ in range(20): f()
    ts = []
    for _ in range(n): t = time.perf_counter(); f(); ts.append(time.perf_counter() - t)
    return np.percentile(ts, 50) * 1000

print(f"{'values':>7} | {'REST + orjson p50':>18} | {'gRPC p50':>9} | ratio")
for n in (16, 1024, 8192, 65536):
    v = rng.normal(0, 1, n).astype(np.float32)
    body = orjson.dumps({"features": v}, option=orjson.OPT_SERIALIZE_NUMPY)
    req = PredictRequest(model="churn", features=v)
    reps = 400 if n <= 8192 else 100
    r = p50(lambda: http.post("/predict", content=body, headers={"content-type": "application/json"}), reps)
    g = p50(lambda: call(req, timeout=5.0), reps)
    print(f"{n:>7,} | {r:>15.2f} ms | {g:>6.2f} ms | {r / g:.1f}x")
srv.should_exit = True; gs.stop(0)`,
      out: ` values |  REST + orjson p50 |  gRPC p50 | ratio
     16 |            0.73 ms |   0.31 ms | 2.4x
  1,024 |            0.81 ms |   0.35 ms | 2.3x
  8,192 |            1.32 ms |   0.77 ms | 1.7x
 65,536 |            5.20 ms |   3.88 ms | 1.3x` },
    { t: "dl",
      items: [
        { term: "Small payloads: the stack dominates",
          def: "At 16 values gRPC answered in 0.31 ms against 0.73 ms. The payload is irrelevant there; the difference is the HTTP/1.1 server and client stack against gRPC's." },
        { term: "Large payloads: decoding dominates",
          def: "At 65,536 values the ratio fell to 1.3×, because both sides spent their time turning numbers into arrays, and the repeated field is the slower decoder." },
        { term: "What loopback hides",
          def: "On a real network, smaller payloads also save transfer time, and TLS, proxies and connection reuse change the picture. Measure in your own environment before committing." }
      ] },
    { t: "h2", n: "03", id: "decision", text: "The decision", sub: "Choose by caller, payload and operations" },
    { t: "table",
      head: ["Situation", "Choose", "Why"],
      rows: [
        ["Browsers, partners, public API", "REST", "Universal tooling, caching, no generated clients needed"],
        ["Internal calls, many per second, small payloads", "gRPC", "Lower per-call overhead, typed contracts"],
        ["Large tensors", "gRPC with a bytes field, or binary REST", "Avoid per-value parsing entirely"],
        ["Token streaming to a browser", "REST with SSE", "Browsers cannot speak native gRPC"],
        ["Bidirectional streams between services", "gRPC", "Native, with flow control"],
        ["Team without HTTP/2-aware load balancing", "REST, until it exists", "gRPC pins connections (lesson 9.2)"],
        ["Latency dominated by the model or feature fetch", "Either", "The protocol is not the bottleneck"]
      ] },
    { t: "callout",
      kind: "insight",
      title: "Measure the share before you migrate",
      body: [
        { t: "p",
          text: "If the protocol accounts for 0.4 ms of a 40 ms request, the best possible protocol change saves 1%. Profile a real request into network, parsing, feature lookup and model time first. Protocol migrations pay off for many small internal calls and for large tensors, and rarely anywhere else." }
      ] },
    { t: "exercise",
      kind: "Challenge",
      title: "Throughput under load",
      difficulty: "advanced",
      minutes: 35,
      body: [
        { t: "p",
          text: "Run one FastAPI server and one gRPC server in a separate process, with the same trivial model, and drive each with 1 and then 8 client processes for 3 seconds, sending 1,024 floats per request. Report requests per second, p50 and p99. Keep clients and servers in different processes so they do not share a GIL." }
      ],
      requirements: [
        "Servers in their own process; each client in its own process",
        "A warm-up before measuring",
        "Throughput, p50 and p99 for both protocols at 1 and 8 clients",
        "An explanation of what limits throughput at 8 clients"
      ],
      hint: "multiprocessing.Pool.map with one task per client process returns each client's list of latencies; on Windows, guard the entry point with if __name__ == '__main__'.",
      solution: { lang: "python",
        title: "throughput.py",
        code: `import multiprocessing as mp, socket, threading, time
import numpy as np

# Servers run in their own process; each client runs in its own process, so nobody shares a GIL with anybody else.
def serve():
    from concurrent import futures
    import grpc, orjson, uvicorn
    from fastapi import FastAPI, Request
    from fastapi.responses import ORJSONResponse
    from infer_pb import PredictRequest, PredictResponse, SERVICE
    def model(x): return float(x[:16].sum())
    app = FastAPI()
    @app.post("/predict")
    async def predict_rest(request: Request):
        return ORJSONResponse({"score": model(np.asarray(orjson.loads(await request.body())["features"], np.float32))})
    ser = lambda m: m.SerializeToString()
    gs = grpc.server(futures.ThreadPoolExecutor(8))
    gs.add_generic_rpc_handlers((grpc.method_handlers_generic_handler(SERVICE, {"Predict": grpc.unary_unary_rpc_method_handler(
        lambda req, ctx: PredictResponse(score=model(np.asarray(req.features, np.float32))), PredictRequest.FromString, ser)}),))
    gs.add_insecure_port("127.0.0.1:50095"); gs.start()
    uvicorn.run(app, host="127.0.0.1", port=8751, log_level="error")

def client(args):
    proto, seconds = args
    import grpc, httpx, orjson
    from infer_pb import PredictRequest, PredictResponse, SERVICE
    v = np.random.default_rng(0).normal(0, 1, 1024).astype(np.float32)
    if proto == "REST":
        c = httpx.Client(base_url="http://127.0.0.1:8751"); body = orjson.dumps({"features": v}, option=orjson.OPT_SERIALIZE_NUMPY)
        call = lambda: c.post("/predict", content=body, headers={"content-type": "application/json"})
    else:
        stub = grpc.insecure_channel("127.0.0.1:50095").unary_unary(
            f"/{SERVICE}/Predict", lambda m: m.SerializeToString(), PredictResponse.FromString)
        req = PredictRequest(model="m", features=v); call = lambda: stub(req, timeout=5.0)
    for _ in range(50): call()
    lat, stop = [], time.perf_counter() + seconds
    while time.perf_counter() < stop:
        t = time.perf_counter(); call(); lat.append(time.perf_counter() - t)
    return lat

def wait_for(port):
    while True:
        try: socket.create_connection(("127.0.0.1", port), 0.2).close(); return
        except OSError: time.sleep(0.1)

if __name__ == "__main__":
    srv = mp.Process(target=serve, daemon=True); srv.start()
    wait_for(8751); wait_for(50095)
    print(f"{'protocol':<8}{'clients':>8}{'req/s':>9}{'p50 ms':>8}{'p99 ms':>8}")
    for proto in ("REST", "gRPC"):
        for clients in (1, 8):
            with mp.Pool(clients) as pool: lats = pool.map(client, [(proto, 3.0)] * clients)
            allv = np.concatenate([np.array(l) for l in lats])
            print(f"{proto:<8}{clients:>8}{len(allv) / 3.0:>9,.0f}{np.percentile(allv, 50) * 1000:>8.2f}{np.percentile(allv, 99) * 1000:>8.2f}")
    srv.terminate()`,
        out: `protocol clients    req/s  p50 ms  p99 ms
REST           1    1,282    0.71    1.44
REST           8    3,766    2.08    3.35
gRPC           1    2,587    0.36    0.69
gRPC           8    4,050    1.95    2.61`,
        notes: [
          { t: "p",
            text: "With one client, gRPC served about twice the requests (2,587 against 1,282 per second) at half the latency. With eight, both converged near 4,000 per second, and gRPC's advantage shrank to 8%: the bottleneck had moved to the single Python server process. Past that point, more server processes or replicas matter far more than the protocol." },
          { t: "p",
            text: "A first version ran clients and servers as threads in one process, and gRPC's p99 came out at 90 ms because every thread competed for one GIL. The setup of a benchmark can produce larger effects than the thing being measured; isolate the parts before trusting a number." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: the migration that bought nothing",
      body: [
        { t: "p",
          text: "**Symptom.** A team spent a quarter moving its recommendation service from REST to gRPC, expecting a large latency win from a widely quoted benchmark. p50 improved by under 2% and p99 not at all." },
        { t: "p",
          text: "**Mechanism.** Per-request profiling, done afterwards, showed 31 ms of feature-store lookups, 9 ms of model time and under 1 ms of serialisation and HTTP. The protocol had never been the bottleneck, and its p99 came from feature-store tail latency." },
        { t: "p",
          text: "**Fix.** The team batched feature lookups and added a local cache for slow-changing features, cutting p50 by 40%, and adopted a rule: no protocol or framework change without a per-request breakdown showing that the target is more than 20% of latency." }
      ] }
  ],

  takeaways: [
    "Protobuf payloads were about **a fifth** of standard-library JSON at every size; gzip narrows but does not close it for floats.",
    "In Python, **orjson** decoded 1,024 floats to NumPy in **60 µs**, protobuf's repeated float in **178 µs**.",
    "A protobuf **bytes field** holding the raw array took **3 µs**: the pattern behind TF Serving and KServe v2 raw contents.",
    "For named-field records, gzip brought 200 JSON records to **13.0 KB** against protobuf's **12.0 KB**.",
    "Sequentially over loopback, gRPC was **2.4×** faster at 16 values and only **1.3×** at 65,536.",
    "Under 8 concurrent clients, one server process capped both near **4,000 req/s**; the gap fell to **8%**.",
    "Benchmarks must compare paths that end in the same place, with clients and servers isolated.",
    "Choose REST for browsers, partners and caching; gRPC for many internal calls, streams and tensors.",
    "Profile a request first: a protocol change cannot save more than the protocol's share."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "Why was protobuf's repeated float field slower to decode into NumPy than orjson in Python?",
        options: [
          "Protobuf compresses the floats, which costs extra time",
          "Each value becomes a Python float before the array",
          "Protobuf stores floats as text, like JSON does",
          "The repeated field adds a type tag to every value"
        ],
        answer: 1,
        why: "The repeated field is exposed as a sequence of Python floats, which np.asarray must convert one by one. Protobuf does not compress or use text, and packed repeated floats have one tag for the whole field." },
      { stem: "What does a single bytes field holding the raw array buy?",
        options: [
          "Smaller payloads than packed repeated floats",
          "Decoding by reinterpreting memory, not per value",
          "Automatic compression of the tensor's contents",
          "Readability in logs and in the usual debugging tools"
        ],
        answer: 1,
        why: "np.frombuffer views the bytes as float32 with no per-value work (3 µs against 178 µs). It is the same size as packed floats, not compressed, and no more readable." },
      { stem: "With 8 clients, REST and gRPC both reached about 4,000 req/s. What limited them?",
        options: [
          "The loopback network interface ran out of bandwidth",
          "The single Python server process handling requests",
          "The client processes could not send any faster",
          "The 1,024-float payload size was the real limit"
        ],
        answer: 1,
        why: "One server process, bound by one GIL, saturated; the protocol gap shrank to 8%. Loopback bandwidth was far from used, clients were separate processes, and the same payload ran 2.6K req/s from one gRPC client." },
      { stem: "A request spends 31 ms on feature lookups, 9 ms in the model and 1 ms in HTTP and JSON. Best next step?",
        options: [
          "Move to gRPC to remove the HTTP overhead",
          "Batch or cache the feature lookups first",
          "Switch the JSON encoder to orjson right away",
          "Quantise the model to cut its 9 ms in half"
        ],
        answer: 1,
        why: "The feature lookups are three quarters of the time; protocol and encoder changes can save at most 1 ms of 41, and quantising saves less than fixing the lookups." }
    ] },

  interview: { title: "In an interview",
    sub: "Protocol comparisons are judged on method as much as on the answer.",
    questions: [
      { level: "core",
        q: "Someone says gRPC is seven times faster than REST. How do you respond?",
        strong: "A strong answer asks what was measured and names the conditions under which the claim holds or fails.",
        answer: [
          { t: "p",
            text: "Faster at what: payload size, parse time, per-call latency or throughput, in which language and with which JSON library? Protobuf payloads are reliably smaller. Per-call overhead is lower for small payloads. But in Python a fast JSON parser beat protobuf's repeated float field, and under load a single server process capped both protocols at the same throughput." },
          { t: "p",
            text: "So I would measure the real payload end to end, and look at the protocol's share of request latency, before deciding." }
        ] },
      { level: "advanced",
        q: "How would you send large tensors between services?",
        strong: "A strong answer avoids per-value encoding and covers dtype, shape, byte order and limits.",
        answer: [
          { t: "p",
            text: "As raw bytes with shape and dtype metadata: a protobuf bytes field, as in KServe v2 or TF Serving, or a binary HTTP body with headers describing the tensor. Decoding is then a memory view. I would fix byte order (little-endian), validate the byte length against the shape, raise message-size limits deliberately (gRPC defaults to 4 MB on receive) and stream or chunk anything larger than a few megabytes." }
        ] },
      { level: "core",
        q: "When is REST the right choice for a model endpoint?",
        strong: "A strong answer gives concrete cases rather than treating REST as legacy.",
        answer: [
          { t: "p",
            text: "Public and partner APIs, browser clients, anything that benefits from HTTP caches and standard tooling, teams without HTTP/2-aware load balancing, and services where model or feature time dominates so the protocol's share is small. Token streaming to browsers uses server-sent events over HTTP. Many systems use both: REST at the edge, gRPC between internal services." }
        ] }
    ] }
});
