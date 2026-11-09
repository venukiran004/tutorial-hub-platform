/* ============================================================================
   LESSON 9.1 — REST, and What It Costs
   ========================================================================= */
EC.receiveLesson({
  id: "9.1",

  lede: "Most model endpoints are REST over HTTP with JSON bodies, and for good reasons: every language, proxy, browser and debugging tool speaks it. The costs are specific to what a model receives. A feature vector is hundreds of floating-point numbers, and as JSON text each one weighs five times its binary size and must be parsed digit by digit. There is no schema at runtime unless you add one. This lesson measures those costs on a real 512-value feature vector and a real FastAPI service: what each encoding weighs, what rounding does to the values, and what the bytes cost in latency.",

  objectives: [
    "Design a prediction endpoint with resources, verbs and status codes that callers can act on",
    "Measure what a float array weighs as JSON text, and how encoders differ",
    "Know when rounding floats changes model inputs, and why 64-bit integers break in JSON",
    "Validate requests at the boundary so bad input fails with a 4xx, not a wrong prediction",
    "Use batch endpoints with per-item errors to amortise request overhead"
  ],

  prerequisites: ["1.5", "2.1"],

  blocks: [
    { t: "h2", n: "01", id: "contract", text: "The contract", sub: "Resources, verbs and status codes" },
    { t: "p",
      text: "REST models the service as resources addressed by URLs and acted on by HTTP verbs. A model is a resource (`/v1/models/churn`); a prediction is a custom method on it, written `POST /v1/models/churn:predict` in Google's API style, because it computes something rather than creating a stored object. POST, because the input is a body that is too large and too sensitive for a query string." },
    { t: "table",
      head: ["Status", "Meaning for a prediction endpoint", "What the caller should do"],
      rows: [
        ["200", "Prediction returned", "Use it"],
        ["400 / 422", "The request is malformed or fails validation", "Fix the request; never retry unchanged"],
        ["404", "No such model or version", "Check the name; do not retry"],
        ["413", "Batch or body too large", "Split the request"],
        ["429", "Rate limited", "Retry after the Retry-After header"],
        ["503", "Overloaded or model still loading", "Retry with backoff"],
        ["504", "The model did not answer in time", "Retry if the deadline allows"]
      ] },
    { t: "callout",
      kind: "trap",
      title: "A 200 with an error inside",
      body: [
        { t: "p",
          text: "Returning `200 {\"error\": \"bad input\"}` breaks every client, proxy and dashboard that counts errors by status code. Your error rate reads zero during an outage, and retries happen on the wrong cases. The status code is the machine-readable part of the contract; the body explains it to a person." }
      ] },
    { t: "h2",
      n: "02",
      id: "weight",
      text: "What a float weighs as text",
      sub: "Measured on a 512-value feature vector" },
    { t: "p",
      text: "A float32 holds about 7.2 significant decimal digits, and the shortest text that reproduces any float32 exactly can need 9. Python's `json` module widens each value to a 64-bit float first and writes the shortest text for *that*, which is up to 17 digits of noise beyond what the model will use. The script encodes the same vector five ways and checks that it decodes to exactly the same float32 values." },
    { t: "code",
      lang: "python",
      title: "wire.py — five encodings of one feature vector",
      code: `import base64, json, timeit
import numpy as np, orjson

# A 512-dimensional float32 feature vector, as a model actually receives it.
rng = np.random.default_rng(0)
vec = rng.normal(0, 1, 512).astype(np.float32)

encodings = {
    "JSON, full precision":  lambda v: json.dumps({"features": [float(x) for x in v]}).encode(),
    "JSON, 6 significant":   lambda v: json.dumps({"features": [float(f"{x:.6g}") for x in v]}).encode(),
    "orjson (numpy aware)":  lambda v: orjson.dumps({"features": v}, option=orjson.OPT_SERIALIZE_NUMPY),
    "JSON + base64 float32": lambda v: json.dumps({"features_b64": base64.b64encode(v.tobytes()).decode()}).encode(),
    "raw float32 bytes":     lambda v: v.tobytes(),
}
decoders = {
    "JSON, full precision":  lambda b: np.array(json.loads(b)["features"], dtype=np.float32),
    "JSON, 6 significant":   lambda b: np.array(json.loads(b)["features"], dtype=np.float32),
    "orjson (numpy aware)":  lambda b: np.array(orjson.loads(b)["features"], dtype=np.float32),
    "JSON + base64 float32": lambda b: np.frombuffer(base64.b64decode(json.loads(b)["features_b64"]), dtype=np.float32),
    "raw float32 bytes":     lambda b: np.frombuffer(b, dtype=np.float32),
}
print(f"{'encoding':<24}{'bytes':>7}{'per value':>10}{'encode µs':>11}{'decode µs':>11}{'exact?':>8}")
for name, enc in encodings.items():
    b = enc(vec); dec = decoders[name]
    te = min(timeit.repeat(lambda: enc(vec), number=200, repeat=5)) / 200 * 1e6
    td = min(timeit.repeat(lambda: dec(b), number=200, repeat=5)) / 200 * 1e6
    back = dec(b)
    exact = np.array_equal(back, vec)
    print(f"{name:<24}{len(b):>7,}{len(b) / 512:>10.1f}{te:>11.1f}{td:>11.1f}{'yes' if exact else 'NO':>8}")

# What rounding to 6 significant digits did to the values.
back = decoders["JSON, 6 significant"](encodings["JSON, 6 significant"](vec))
changed = back != vec
print(f"\\n6 significant digits: {changed.mean():.0%} of values changed, max relative error {np.max(np.abs(back - vec) / np.abs(vec)):.1e}")
print(f"float32 has about 7.2 significant decimal digits; shortest exact text for a float32 value needs up to 9")
print(f"example: {vec[0]!r} as float32 -> json {json.dumps(float(vec[0]))} ({len(json.dumps(float(vec[0])))} chars)")`,
      out: `encoding                  bytes per value  encode µs  decode µs  exact?
JSON, full precision     10,588      20.7      269.8      167.7     yes
JSON, 6 significant       5,201      10.2      448.8       74.3      NO
orjson (numpy aware)      5,597      10.9       16.9       19.7     yes
JSON + base64 float32     2,752       5.4       13.3        9.4     yes
raw float32 bytes         2,048       4.0        0.2        0.4     yes

6 significant digits: 97% of values changed, max relative error 4.6e-06
float32 has about 7.2 significant decimal digits; shortest exact text for a float32 value needs up to 9
example: np.float32(0.12573022) as float32 -> json 0.1257302165031433 (18 chars)` },
    { t: "viz",
      title: "Bytes per value on the wire",
      caption: "Standard-library JSON spent 20.7 bytes on each 4-byte float. orjson writes float32 values at their own shortest exact length, halving the size while staying exact.",
      svg: `<svg viewBox="0 0 760 210" width="100%" role="img">
<text x="190" y="31.0" text-anchor="end" class="s-label">JSON, full precision</text>
<rect x="200" y="14" width="379.5" height="26" rx="4" class="s-fill" style="stroke:var(--crit);stroke-width:1.8"/>
<text x="587.5" y="31.0" class="s-sub">20.7 bytes per value</text>
<text x="190" y="69.0" text-anchor="end" class="s-label">JSON, 6 significant</text>
<rect x="200" y="52" width="187.0" height="26" rx="4" class="s-fill" style="stroke:var(--warn);stroke-width:1.8"/>
<text x="395.0" y="69.0" class="s-sub">10.2 (and inexact)</text>
<text x="190" y="107.0" text-anchor="end" class="s-label">orjson</text>
<rect x="200" y="90" width="199.8" height="26" rx="4" class="s-fill" style="stroke:var(--accent);stroke-width:1.8"/>
<text x="407.8" y="107.0" class="s-sub">10.9</text>
<text x="190" y="145.0" text-anchor="end" class="s-label">JSON + base64</text>
<rect x="200" y="128" width="99.0" height="26" rx="4" class="s-fill" style="stroke:var(--violet);stroke-width:1.8"/>
<text x="307.0" y="145.0" class="s-sub">5.4</text>
<text x="190" y="183.0" text-anchor="end" class="s-label">raw float32</text>
<rect x="200" y="166" width="73.3" height="26" rx="4" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="281.3" y="183.0" class="s-sub">4.0</text>
</svg>` },
    { t: "dl",
      items: [
        { term: "The encoder matters as much as the format",
          def: "orjson produced exact JSON at 10.9 bytes per value and decoded in 20 µs, against 168 µs for the standard library: the same format, eight times faster to parse." },
        { term: "Rounding is a model change",
          def: "Rounding to 6 significant digits halved the size and changed 97% of the values, by up to 4.6 parts per million. That may not matter for your model, but it is a change to the inputs that must be tested, not a free compression." },
        { term: "Binary inside JSON",
          def: "Base64 of the raw float32 bytes kept a JSON envelope (and its tooling) at 5.4 bytes per value, exact, with the fastest JSON decode. The cost is that a person can no longer read the body." }
      ] },
    { t: "h2",
      n: "03",
      id: "service",
      text: "A real service, measured",
      sub: "FastAPI, pydantic validation and loopback latency" },
    { t: "p",
      text: "Validation belongs at the boundary (lesson 1.5). A pydantic model with a length constraint turns a short vector or a string inside the array into a 422 with the field's location, before the model sees it. The same script then times 500 sequential requests with a JSON body and with a raw binary body." },
    { t: "code",
      lang: "python",
      title: "service.py — the contract and the cost, over HTTP",
      code: `import threading, time
import httpx, numpy as np, uvicorn
from fastapi import FastAPI, HTTPException, Request, Response
from pydantic import BaseModel, Field

app = FastAPI()
W = np.random.default_rng(1).normal(0, 0.05, 512).astype(np.float32)   # stands in for a trained model
MODELS = {"churn": W}

class PredictRequest(BaseModel):
    features: list[float] = Field(min_length=512, max_length=512)

@app.post("/v1/models/{name}:predict")
def predict(name: str, req: PredictRequest):
    if name not in MODELS: raise HTTPException(404, f"model '{name}' not found")
    x = np.asarray(req.features, dtype=np.float32)
    return {"model": name, "score": float(1 / (1 + np.exp(-x @ MODELS[name])))}

@app.post("/v1/models/{name}:predict-binary")
async def predict_binary(name: str, request: Request):
    body = await request.body()
    if len(body) != 512 * 4: raise HTTPException(400, "expected 512 float32 values")
    x = np.frombuffer(body, dtype=np.float32)
    return {"model": name, "score": float(1 / (1 + np.exp(-x @ MODELS[name])))}

server = uvicorn.Server(uvicorn.Config(app, host="127.0.0.1", port=8731, log_level="error"))
threading.Thread(target=server.run, daemon=True).start()
while not server.started: time.sleep(0.05)

vec = np.random.default_rng(0).normal(0, 1, 512).astype(np.float32)
with httpx.Client(base_url="http://127.0.0.1:8731") as c:
    print("== status codes the contract returns ==")
    for label, call in [
        ("valid request", lambda: c.post("/v1/models/churn:predict", json={"features": vec.tolist()})),
        ("511 values", lambda: c.post("/v1/models/churn:predict", json={"features": vec.tolist()[:511]})),
        ("a string inside", lambda: c.post("/v1/models/churn:predict", json={"features": ["x"] + vec.tolist()[1:]})),
        ("unknown model", lambda: c.post("/v1/models/fraud:predict", json={"features": vec.tolist()})),
        ("GET instead of POST", lambda: c.get("/v1/models/churn:predict")),
    ]:
        r = call(); detail = r.json().get("detail", r.json())
        if isinstance(detail, list): detail = f"{detail[0]['type']} at {detail[0]['loc']}"
        print(f"  {label:<20} {r.status_code}  {str(detail)[:70]}")

    print("\\n== latency over loopback, 500 sequential requests ==")
    for label, call in [("JSON body", lambda: c.post("/v1/models/churn:predict", json={"features": vec.tolist()})),
                        ("binary body", lambda: c.post("/v1/models/churn:predict-binary", content=vec.tobytes(),
                                                       headers={"content-type": "application/octet-stream"}))]:
        for _ in range(50): call()
        ts = []
        for _ in range(500):
            t = time.perf_counter(); r = call(); ts.append((time.perf_counter() - t) * 1000)
        print(f"  {label:<12} request {len(r.request.content):>6,} bytes  p50 {np.percentile(ts, 50):.2f} ms  p99 {np.percentile(ts, 99):.2f} ms")
server.should_exit = True`,
      out: `== status codes the contract returns ==
  valid request        200  {'model': 'churn', 'score': 0.4750851094722748}
  511 values           422  too_short at ['body', 'features']
  a string inside      422  float_parsing at ['body', 'features', 0]
  unknown model        404  model 'fraud' not found
  GET instead of POST  405  Method Not Allowed

== latency over loopback, 500 sequential requests ==
  JSON body    request 10,076 bytes  p50 1.74 ms  p99 2.47 ms
  binary body  request  2,048 bytes  p50 0.93 ms  p99 1.66 ms` },
    { t: "dl",
      items: [
        { term: "Validation errors name the field",
          def: "A 511-value vector returned `too_short` at `body.features`, and a string returned `float_parsing` at index 0. Without the constraint, the first would have crashed inside the model with a 500, and a missing feature might have been silently zero-filled." },
        { term: "The bytes cost latency",
          def: "Over loopback, the JSON request (10 KB) took 1.74 ms at the median and the binary one (2 KB) 0.93 ms. Most of the difference is parsing, not transfer, so it stays when the network is fast." },
        { term: "Loopback is a floor",
          def: "These numbers exclude the network, TLS and the model itself. They show what the protocol adds, which is the part you control by choosing an encoding." }
      ] },
    { t: "callout",
      kind: "insight",
      title: "JSON numbers are not 64-bit integers",
      body: [
        { t: "p",
          text: "JSON has one number type, and JavaScript parses it into a 64-bit float, which holds integers exactly only up to 2⁵³. A 64-bit user or tweet ID above that is silently rounded by a browser client. Twitter's API added string `id_str` fields for this reason. Send large IDs as strings." }
      ] },
    { t: "exercise",
      kind: "Challenge",
      title: "A batch endpoint with per-item errors",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p",
          text: "Add `POST /v1/models/churn:batchPredict` to a FastAPI service. It accepts up to 256 instances, validates each one separately, scores the valid ones in one matrix product, and returns a result or an error for every instance in order. Compare the time for 256 single requests with one batch request, check the scores agree, send a batch with two malformed rows, and send 300 instances." }
      ],
      requirements: [
        "Per-instance validation, so one bad row fails only that row",
        "413 when the batch exceeds the limit",
        "Scores identical to the single-instance endpoint",
        "Timing of 256 single requests against one batch"
      ],
      hint: "Accept the body as a plain dict and call Instance.model_validate on each item inside a try block; if you declare the whole body as a pydantic model, one bad row fails the request with a 422.",
      solution: { lang: "python",
        title: "batch_endpoint.py",
        code: `import threading, time
import httpx, numpy as np, uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, ValidationError

app = FastAPI()
W = np.random.default_rng(1).normal(0, 0.05, 512).astype(np.float32)
MAX_BATCH = 256

class Instance(BaseModel):
    features: list[float] = Field(min_length=512, max_length=512)

def score(X: np.ndarray) -> np.ndarray: return 1 / (1 + np.exp(-X @ W))

@app.post("/v1/models/churn:predict")
def predict(inst: Instance): return {"score": float(score(np.asarray(inst.features, np.float32)[None])[0])}

@app.post("/v1/models/churn:batchPredict")
def batch_predict(body: dict):
    raw = body.get("instances")
    if not isinstance(raw, list): raise HTTPException(400, "'instances' must be a list")
    if len(raw) > MAX_BATCH: raise HTTPException(413, f"at most {MAX_BATCH} instances per request, got {len(raw)}")
    results, good, rows = [None] * len(raw), [], []
    for i, item in enumerate(raw):                       # validate each item on its own: one bad row fails one row
        try: rows.append(Instance.model_validate(item).features); good.append(i)
        except ValidationError as e: results[i] = {"error": {"code": 400, "reason": e.errors()[0]["type"]}}
    if rows:
        for i, s in zip(good, score(np.asarray(rows, np.float32))): results[i] = {"score": float(s)}
    return {"results": results}

server = uvicorn.Server(uvicorn.Config(app, host="127.0.0.1", port=8732, log_level="error"))
threading.Thread(target=server.run, daemon=True).start()
while not server.started: time.sleep(0.05)

X = np.random.default_rng(0).normal(0, 1, (256, 512)).astype(np.float32)
with httpx.Client(base_url="http://127.0.0.1:8732") as c:
    c.post("/v1/models/churn:predict", json={"features": X[0].tolist()})       # warm up
    t = time.perf_counter(); singles = [c.post("/v1/models/churn:predict", json={"features": x.tolist()}).json()["score"] for x in X]
    t_single = time.perf_counter() - t
    t = time.perf_counter(); batch = c.post("/v1/models/churn:batchPredict", json={"instances": [{"features": x.tolist()} for x in X]}).json()
    t_batch = time.perf_counter() - t
    same = np.allclose(singles, [r["score"] for r in batch["results"]])
    print(f"256 predictions: 256 requests {t_single * 1000:.0f} ms, one batch request {t_batch * 1000:.0f} ms "
          f"({t_single / t_batch:.1f}x), same scores: {same}")

    mixed = [{"features": X[0].tolist()}, {"features": X[1].tolist()[:100]}, {"feature": X[2].tolist()}, {"features": X[3].tolist()}]
    r = c.post("/v1/models/churn:batchPredict", json={"instances": mixed})
    print(f"batch with two bad rows: HTTP {r.status_code}")
    for i, item in enumerate(r.json()["results"]): print(f"  instance {i}: {item}")
    r = c.post("/v1/models/churn:batchPredict", json={"instances": [{"features": X[0].tolist()}] * 300})
    print(f"300 instances: HTTP {r.status_code} {r.json()['detail']}")
server.should_exit = True`,
        out: `256 predictions: 256 requests 462 ms, one batch request 162 ms (2.9x), same scores: True
batch with two bad rows: HTTP 200
  instance 0: {'score': 0.47508504986763}
  instance 1: {'error': {'code': 400, 'reason': 'too_short'}}
  instance 2: {'error': {'code': 400, 'reason': 'missing'}}
  instance 3: {'score': 0.837927520275116}
300 instances: HTTP 413 at most 256 instances per request, got 300`,
        notes: [
          { t: "p",
            text: "The batch took 162 ms against 462 ms for 256 separate requests, 2.9 times faster, with identical scores. The saving is the per-request work: connection handling, routing and response framing. The batch still parsed 131,072 numbers from JSON, which is why it was not faster still; a binary or orjson body is the next step." },
          { t: "p",
            text: "Per-item validation returned HTTP 200 with errors for rows 1 and 2 and scores for rows 0 and 3. A caller scoring a large nightly batch does not want one malformed row to fail the other 255. A batch that is too large is different: it is the whole request that is wrong, so it gets a 413 and nothing is scored." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: predictions for the wrong customer",
      body: [
        { t: "p",
          text: "**Symptom.** A web dashboard showed churn scores that did not match the batch reports, for a scattered minority of customers." },
        { t: "p",
          text: "**Mechanism.** Customer IDs were 64-bit integers sent as JSON numbers. The browser parsed them as doubles, so IDs above 2⁵³ were rounded to a neighbouring value, and the dashboard requested predictions for a different customer. The backend tests, written in Python, never saw it, because Python's integers are exact." },
        { t: "p",
          text: "**Fix.** IDs became strings in every API response and request, the schema declared them as strings, and a contract test parses responses with a JavaScript client to catch any number above 2⁵³." }
      ] }
  ],

  takeaways: [
    "Model a prediction as `POST /v1/models/{name}:predict`; status codes tell callers whether to retry, fix or give up.",
    "Never return **200** with an error body: monitoring and retries depend on the status code.",
    "As standard-library JSON, a float32 weighed **20.7 bytes**, five times its binary size.",
    "**orjson** wrote the same values exactly at **10.9 bytes** and decoded **8×** faster: the encoder matters.",
    "Rounding to 6 digits changed **97%** of values; treat it as a model change and test it.",
    "Validate at the boundary: pydantic returned **422** naming the exact field instead of a 500 or a wrong prediction.",
    "Over loopback, a binary body cut median latency from **1.74 ms to 0.93 ms**, mostly parsing.",
    "JSON numbers above **2⁵³** are rounded by JavaScript clients; send 64-bit IDs as strings.",
    "A batch endpoint with per-item errors was **2.9×** faster for 256 predictions."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "Why did standard-library JSON spend about 20 bytes on each float32 value?",
        options: [
          "JSON stores every number as a fixed 8-byte value",
          "It widened each value to float64 and wrote that in full",
          "Python's json module pads all numbers out to a fixed width",
          "It adds type information beside each number it writes"
        ],
        answer: 1,
        why: "Each float32 was converted to a Python float (64-bit) and written at the shortest text for that, up to 17 digits. JSON has no fixed width, padding or type tags; orjson writes float32 at its own shortest length." },
      { stem: "A client wants to round features to 3 decimals to shrink requests. What is the right response?",
        options: [
          "Accept it, since JSON parsing will round them anyway",
          "Treat it as a change to model inputs and test it",
          "Refuse it, since any rounding breaks every model",
          "Accept it, since the model was trained in float32"
        ],
        answer: 1,
        why: "Rounding changes the inputs (6 digits changed 97% of values); whether predictions change depends on the model and the features' scale. JSON parsing at full precision was exact, so it does not round anything." },
      { stem: "A request has 511 values instead of 512. What should the endpoint return?",
        options: [
          "500, because the model raised an exception on it",
          "422 naming the field and the failed constraint",
          "200 with the missing value filled in as zero",
          "404, because no model accepts 511 values"
        ],
        answer: 1,
        why: "It is the caller's error, so 4xx, and the response should say which field failed. A 500 blames the server, zero-filling returns a wrong prediction silently, and 404 is for a missing resource." },
      { stem: "Why can a browser client corrupt a 64-bit customer ID sent as a JSON number?",
        options: [
          "Browsers truncate any JSON number to 32 bits",
          "JavaScript parses numbers as doubles, exact only to 2⁵³",
          "JSON forbids integers that are larger than 2³¹",
          "HTTP compression rounds off the long strings of digits it sees"
        ],
        answer: 1,
        why: "A double has a 53-bit mantissa, so larger integers round to a neighbour. JSON itself sets no limit, browsers do not truncate to 32 bits, and compression is lossless." }
    ] },

  interview: { title: "In an interview",
    sub: "Protocol questions are about the caller, the payload and the failure modes.",
    questions: [
      { level: "core",
        q: "Design the API for a model-serving endpoint.",
        strong: "A strong answer covers resource naming, versioning, validation, status codes, batching and payload encoding.",
        answer: [
          { t: "p",
            text: "`POST /v1/models/{name}:predict` with an optional version in the path or a header, a request schema that validates lengths and types, and a response with the score, the model version that produced it and a request ID. Status codes carry the retry semantics: 4xx for the caller's errors, 429 and 503 with Retry-After for capacity, 504 for timeouts." },
          { t: "p",
            text: "A batch method with per-item errors for offline callers, and a size limit with 413. For large numeric payloads, a faster JSON encoder or a binary content type, decided by measuring the share of latency spent parsing." }
        ] },
      { level: "core",
        q: "Your endpoint's p50 is dominated by JSON parsing. What do you do?",
        strong: "A strong answer measures first, then ranks the options by cost to callers.",
        answer: [
          { t: "p",
            text: "Confirm with a profile or by timing parse separately. Then, in order of disruption: a faster encoder and decoder such as orjson, which kept the format and decoded eight times faster here; float32 at its shortest length instead of float64; base64 or a binary content type for the vector; and gRPC with protobuf for internal callers (lessons 9.2 and 9.3). Rounding is a model change, not an encoding choice." }
        ] },
      { level: "advanced",
        q: "Is a prediction POST safe to retry?",
        strong: "A strong answer separates HTTP semantics from the endpoint's actual behaviour and covers side effects.",
        answer: [
          { t: "p",
            text: "HTTP does not treat POST as idempotent, so proxies and clients will not retry it automatically. A pure prediction has no side effects, so retrying is safe in practice, and you can document that. It stops being safe when the endpoint logs a decision that triggers an action, charges per call or updates state; then it needs an idempotency key (System Design lesson 14.3) and deduplication of the side effect." }
        ] }
    ] }
});
