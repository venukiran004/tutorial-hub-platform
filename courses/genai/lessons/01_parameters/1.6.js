EC.receiveLesson({
  id: "1.6",

  lede: "Two parameters operate on tokens rather than on the shape of the distribution. A **stop sequence** is a string that ends the response when it appears. **`logit_bias`** moves a specific token's score by an amount you choose, keyed by its id. Both are blunt, both are useful, and both behave differently from the picture most people carry: a stop sequence is enforced by the server rather than understood by the model, and a bias of −100 is a ban only by arithmetic. This lesson implements each one and measures what it actually does.",

  objectives: [
    "Implement a stop sequence and say where in the pipeline it acts",
    "Say which tokens a stop sequence bills you for, and when it saves nothing",
    "Convert a logit_bias value into the probability change it produces",
    "Say why a bias is keyed by token id, and what that costs you in practice",
    "Choose between a stop sequence, a bias, and a schema for a given constraint"
  ],

  prerequisites: ["1.1", "1.5"],

  blocks: [

    /* ============================================================ 01 */
    { t: "h2", n: "01", id: "stop", text: "A stop sequence is the server's decision, not the model's",
      sub: "The model never learns the parameter exists" },

    {"kind": "trace", "title": "The stop string is paid for and never shown", "caption": "The server checks the decoded text after every token and halts when a stop string is complete. So the token that **completed** the match was generated, is billed, and is cut from what you receive: one visible token, two billed. A two-token stop string costs two unseen tokens. The last row is the other half: a stop string the model never emits does nothing at all, and generation runs to `max_tokens`. Make the same cut in client code, on a finished response, and every row bills all 30.", "left": "stop string", "codeW": 150, "vars": ["you receive", "visible", "billed"], "steps": [{"code": "','", "state": ["' blue'", "1", "2"], "changed": [2], "tone": "good", "note": "the comma is billed"}, {"code": "' purple'", "state": ["' blue, yellow,'", "4", "5"], "tone": "accent"}, {"code": "', purple'", "state": ["' blue, yellow'", "3", "5"], "changed": [2], "tone": "warn", "note": "two unseen tokens"}, {"code": "'\\n' - never emitted", "state": ["everything", "30", "30"], "tone": "crit", "note": "ran to the cap"}], "t": "diagram", "id": "dg-1_6-01-0"},

























    { t: "p", text: "A stop sequence is not an instruction to the model. The serving loop generates a token, decodes the text so far, and checks it against each stop string; at the first match it halts and returns the text before the match. The model is not consulted and does not know the parameter exists — which is why a stop string works on any model, and why it cannot make a model *want* to stop." },

    { t: "code", lang: "python", title: "g16.py — a stop sequence, implemented", code: `ids = tok("Three colours: red, green,", return_tensors="pt").input_ids

def serve(stop, cap=30):
    """What a server does: decode after every token, halt when a stop string is complete."""
    cur, text = ids, ""
    for made in range(1, cap + 1):
        with torch.no_grad():
            nxt = model(cur).logits[0, -1].argmax()            # greedy, one token
        cur  = torch.cat([cur, nxt.view(1, 1)], dim=1)
        text = tok.decode(cur[0, ids.shape[1]:])
        if stop in text:
            return text.split(stop)[0], made, "stop"           # the stop string is cut off
    return text, cap, "length"

full, n, _ = serve("\\x00")                                     # a string that never appears
print("unstopped (%d tokens): %r" % (n, full))
print()
print("%-10s %-18s %7s %7s %9s  %s"
      % ("stop", "you receive", "visible", "billed", "finish", "client-side cut bills"))
for stop in (",", " purple", ", purple", "\\n"):
    text, made, why = serve(stop)
    seen = len(tok(text).input_ids) if text else 0
    print("%-10r %-18r %7d %7d %9s  %d"
          % (stop, text if why == "stop" else "(all of it)", seen, made, why, n))`,
      out: `unstopped (30 tokens): ' blue, yellow, purple, purple, red, green, blue, yellow, purple, red, green, blue, yellow, purple, red,'

stop       you receive        visible  billed    finish  client-side cut bills
','        ' blue'                  1       2      stop  30
' purple'  ' blue, yellow,'         4       5      stop  30
', purple' ' blue, yellow'          3       5      stop  30
'\\n'       '(all of it)'           30      30    length  30`,
      hl: [11, 12],
      caption: "The server halts one token after the text you wanted. `','` returns one token and bills two, because the comma had to be generated before it could be matched; `', purple'` is two tokens, so two are billed and never shown. The last column is the same stop applied by client code to a finished response — which is what a wrapper does when it offers a stop parameter for a model that has none." },

    { t: "callout", kind: "trap", title: "A stop that never fires is not a stop",
      body: [
        { t: "p", text: "In the measurement the server halted as soon as the match was complete, so the saving is real: two tokens generated instead of thirty. But it is a saving only for as long as the model actually emits the string. The last row is the failure — the newline never appeared, nothing halted, and generation ran to the cap." },
        { t: "p", text: "So treat a stop sequence as a **formatting** tool that happens to save tokens when it fires, and never as the thing that bounds a bill. `max_tokens` is the only hard stop (1.5), and asking for a shorter output is the only reliable saving (11.8)." },
        { t: "p", text: "Two things move the count without changing what you see. The token that completed the match is generated before it can be matched, so the usage figure can sit a token or more above the visible text. And a stop applied client-side — by your own code, or by a framework on your behalf — saves nothing at all, because the response was complete before anything was cut." }
      ] },

    { t: "p", text: "Where the parameter exists is dated information, and 1.15 has the matrix. In November 2026, Chat Completions takes `stop` with up to four strings, Claude and Gemini take `stop_sequences`, and open-weight servers take `stop`; OpenAI's Responses API has no stop parameter at all. Claude also tells you which string fired, in the response's `stop_sequence` field, where Chat Completions reports `finish_reason` `stop` for a stop string and a natural ending alike. Where the parameter is missing, the stop is yours to apply to the stream — and closing the stream when the string appears does halt generation (1.12), which a cut on a finished response does not." },

    { t: "p", text: "There is a second consequence of matching on decoded text rather than on token ids, and it is the one that produces surprising behaviour: **a stop string need not line up with token boundaries.**" },

    { t: "code", lang: "python", title: "g13b.py — stop strings against the tokeniser", code: `for s in (",", " purple", ".\\n\\n", "END"):
    t = tok(s).input_ids
    print("%-9r -> %d token(s): %s" % (s, len(t), [tok.decode([x]) for x in t]))`,
      out: `  ','       -> 1 token(s): [',']
  ' purple' -> 1 token(s): [' purple']
  '.\\n\\n'   -> 2 token(s): ['.', '\\n\\n']
  'END'     -> 1 token(s): ['END']`,
      caption: "`\".\\n\\n\"` is two tokens, so the server has to see both before it can decide. The check runs on the decoded string, which is why a stop sequence can also fire on characters that arrived in the *middle* of a token." },

    { t: "callout", kind: "good", title: "What stop sequences are actually good for",
      body: [
        { t: "p", text: "**Ending a structured block.** If you are asking for a list and will parse the first n items, `stop=[\"\\n\\n\"]` keeps the model from adding commentary after it." },
        { t: "p", text: "**Delimited formats you designed.** When the prompt says \"end your answer with `###`\", a matching stop sequence removes the delimiter from what you get back, so you do not have to strip it." },
        { t: "p", text: "**Few-shot patterns.** With examples formatted as `Q: … A: …`, a stop at `\"\\nQ:\"` prevents the model from inventing the next question and answering it too. This is the original use and still the best one." },
        { t: "p", text: "What they are not good for: enforcing structure. A stop sequence truncates; it cannot make the truncated result valid. If the model was mid-JSON when the stop fired, you have invalid JSON. 1.8 is the parameter that actually guarantees structure." }
      ] },

    /* ============================================================ 02 */
    { t: "h2", n: "02", id: "logit-bias", text: "Logit bias moves one token by a number you choose",
      sub: "Added to the logit, before the softmax, before everything else" },

    {"kind": "trace", "title": "What a bias number is worth, in odds", "caption": "A bias is added to the logit, so it multiplies the token's odds by `exp(bias)` — which makes the scale readable. **−100 is a ban** (odds × 4×10⁻⁴⁴, rank 50,257). −5 is strong discouragement that is still reachable. +5 is usually decisive and +10 is effectively forced. And +100 is indistinguishable from +10 at any precision you can observe, so reaching for a bigger number past +10 buys nothing.", "left": "logit_bias", "codeW": 130, "vars": ["odds multiplier", "p of ' blue'", "rank"], "steps": [{"code": "-100", "state": ["4e-44", "0.00000000", "50257"], "tone": "crit", "note": "a ban"}, {"code": "-5", "state": ["0.0067", "0.00036480", "259"], "tone": "warn", "note": "still possible"}, {"code": "0 - baseline", "state": ["1.0", "0.05137870", "2"], "tone": "accent"}, {"code": "+5", "state": ["148", "0.88936913", "1"], "changed": [1, 2], "tone": "good", "note": "usually decisive"}, {"code": "+10", "state": ["22026", "0.99916816", "1"], "tone": "good"}, {"code": "+100", "state": ["3e+43", "1.00000000", "1"], "tone": "violet", "note": "same as +10, observably"}], "t": "diagram", "id": "dg-1_6-02-1"},

























    { t: "p", text: "Where it exists — Chat Completions and open-weight servers, and not the Responses API, Claude or Gemini (1.15) — `logit_bias` takes a map from token id to a number in the range −100 to +100, and adds that number to the corresponding logit. It happens before temperature, before truncation, before the penalties — it is a modification of the model's raw output, so everything downstream sees the biased vector as if the model had produced it." },

    { t: "code", lang: "python", title: "g13.py — logit_bias, implemented", code: `ids = tok("My favourite colour is", return_tensors="pt").input_ids
with torch.no_grad():
    lg = model(ids).logits[0, -1]

blue = tok(" blue").input_ids[0]
for bias in (-100.0, -5.0, 0.0, 5.0, 10.0, 100.0):
    b = lg.clone()
    b[blue] += bias
    p = torch.softmax(b, dim=-1)
    print("logit_bias[' blue']=%+7.1f -> p=%.8f  rank %d  argmax=%s"
          % (bias, p[blue], int((p > p[blue]).sum()) + 1,
             repr(tok.decode([int(p.argmax())]))))`,
      out: `  baseline:  ' blue' 0.051379 (rank 2)   ' red' 0.036421 (rank 4)

  logit_bias[' blue']= -100.0 -> p=0.00000000  rank 50257  argmax=' the'
  logit_bias[' blue']=   -5.0 -> p=0.00036480  rank 259  argmax=' the'
  logit_bias[' blue']=   +0.0 -> p=0.05137870  rank 2  argmax=' the'
  logit_bias[' blue']=   +5.0 -> p=0.88936913  rank 1  argmax=' blue'
  logit_bias[' blue']=  +10.0 -> p=0.99916816  rank 1  argmax=' blue'
  logit_bias[' blue']= +100.0 -> p=1.00000000  rank 1  argmax=' blue'`,
      hl: [9, 10, 11],
      caption: "A bias of +5 takes `' blue'` from 5.1% of the mass to 88.9%, and from rank 2 to rank 1. The parameter's nominal range runs to 100, but everything past about +12 is indistinguishable from certainty." },

    { t: "p", text: "The numbers follow directly from the ratio identity in 1.2. Adding `b` to one logit multiplies that token's odds against every other token by `exp(b)`. So +5 multiplies the odds by about 148, +10 by about 22,000, and +100 by `exp(100)` ≈ 2.7×10⁴³ — which is why the top and bottom of the documented range are not meaningfully different from each other." },

    { t: "table",
      head: ["Bias", "Odds multiplier", "Effect on a token at 5% of the mass", "In practice"],
      rows: [
        ["−100", "`exp(-100)` ≈ 4×10⁻⁴⁴", "0.00000000 — rank 50,257", "A ban"],
        ["−5", "≈ 0.0067", "0.00036480 — rank 259", "Strongly discouraged, still possible"],
        ["−1", "≈ 0.37", "about 2% — a couple of ranks down", "A nudge"],
        ["+1", "≈ 2.7", "about 13%", "A nudge"],
        ["+5", "≈ 148", "0.88936913 — rank 1", "Usually decisive"],
        ["+10", "≈ 22,026", "0.99916816", "Effectively forced"],
        ["+100", "≈ 3×10⁴³", "1.00000000", "Forced, same as +10 to any precision you can observe"]
      ],
      caption: "Measured values in the third column come from the run above; the odds multipliers are `exp(bias)`. Nothing above about +12 or below about −12 is distinguishable from the extreme." },

    { t: "callout", kind: "insight", title: "Why −100 is documented as a ban",
      body: [
        { t: "p", text: "It is not a special value in the implementation — it is a subtraction like any other. But `exp(-100)` is about 4×10⁻⁴⁴, and multiplying a probability of 5% by that gives about 2×10⁻⁴⁵, far below the smallest normal float32 and down at the last representable step above zero. Measured, it came out at 1.4×10⁻⁴⁵." },
        { t: "p", text: "So −100 is a ban in practice, as top-p truncation is a deletion: the probability is one float32 step from zero, and 200,000 draws never produced the token. The measurement confirms it — rank 50,257, the last position in the vocabulary." },
        { t: "p", text: "This also means the ban is only as reliable as the arithmetic. On a hypothetical distribution where the token held almost all the mass, −100 would leave it merely very unlikely rather than impossible. In practice this never happens, but it is the reason the documentation says \"effectively\" rather than \"always\"." }
      ] },

    /* ============================================================ 03 */
    { t: "h2", n: "03", id: "token-ids", text: "The catch: bias is keyed by token id",
      sub: "You are not banning a word, you are banning a token" },

    {"kind": "trace", "title": "The id is not the word, and that is the whole disappointment", "caption": "`logit_bias` maps **ids to numbers**, and biasing `' blue'` leaves every other spelling of blue untouched. Seven forms of one word, six distinct ids, and one — `' bluish'` — that is not a single token at all, so no bias can reach it: you would have to bias `' blu'`, which also suppresses every other word starting that way. The one place the parameter is unbeatable is a single-token classifier: lift each of your labels by +100, set `max_tokens=1`, and the answer is guaranteed to be a label, with its logprob as a free confidence score.", "left": "spelling", "codeW": 130, "vars": ["token ids", "pieces"], "steps": [{"code": "'blue'", "state": ["[18789]", "1"], "tone": "accent"}, {"code": "' blue'", "state": ["[9861]", "1"], "changed": [0], "tone": "good", "note": "the one you biased"}, {"code": "'Blue'", "state": ["[15957]", "1"], "tone": "warn"}, {"code": "' Blue'", "state": ["[11942]", "1"], "tone": "warn"}, {"code": "' BLUE'", "state": ["[110151]", "1"], "tone": "warn"}, {"code": "' blues'", "state": ["[51764]", "1"], "tone": "warn"}, {"code": "' bluish'", "state": ["[55577, 1109]", "2"], "changed": [1], "tone": "crit", "note": "unreachable by bias"}], "t": "diagram", "id": "dg-1_6-03-2"},

























    { t: "p", text: "`logit_bias` maps ids to numbers, and an id is not a word. This is the source of every disappointment with the parameter, and it has three distinct forms." },

    { t: "ol", items: [
      "**A word is usually several tokens.** Biasing the first one down does not ban the word; it makes the first piece unlikely, and the model may reach the word by a different tokenisation or simply produce a synonym.",
      "**Leading spaces are part of the token.** `\"blue\"` and `\" blue\"` are different ids. Bias one and the model uses the other. This catches nearly everyone the first time.",
      "**Case and morphology multiply the work.** `blue`, `Blue`, `BLUE`, `blues`, `bluish` are separate ids, and banning a concept means enumerating them."
    ] },

    { t: "code", lang: "python", title: "ids.py — the enumeration problem", code: `import tiktoken
enc = tiktoken.get_encoding("o200k_base")

for word in ("blue", " blue", "Blue", " Blue", " BLUE", " blues", " bluish"):
    ids = enc.encode(word)
    print("%-9r -> %-16s %s" % (word, ids, [enc.decode([i]) for i in ids]))`,
      out: `'blue'    -> [18789]          ['blue']
' blue'   -> [9861]           [' blue']
'Blue'    -> [15957]          ['Blue']
' Blue'   -> [11942]          [' Blue']
' BLUE'   -> [110151]         [' BLUE']
' blues'  -> [51764]          [' blues']
' bluish' -> [55577, 1109]    [' blu', 'ish']`,
      caption: "Seven surface forms, six distinct first tokens, and one that is not a single token at all. Banning the concept \"blue\" through logit_bias means finding all of these, and the last row shows that some forms cannot be banned by a single id at all." },

    { t: "callout", kind: "tradeoff", title: "Bias, stop, or something else",
      body: [
        { t: "p", text: "**Use `logit_bias` when the target is a small, closed set of exact tokens.** Forcing a classification into `yes`/`no` by lifting those two tokens out of reach of everything else; steering a model toward one of five known category labels; suppressing a single token that is corrupting a format. These work because you can enumerate the ids." },
        { t: "p", text: "**Use a stop sequence when you want the response to end somewhere.** Not when you want it to avoid something." },
        { t: "p", text: "**Use a schema or a grammar when you want the output to be valid.** 1.8 for structured output, 3.13 for grammar-constrained decoding. Both make the invalid case unrepresentable, which is a stronger guarantee than making it unlikely — and neither requires you to enumerate token ids." },
        { t: "p", text: "**Use the prompt when the target is a concept.** \"Do not mention competitors\" cannot be expressed in token ids, and trying is how people end up with a 400-entry bias map that still does not work." }
      ] },

    { t: "p", text: "The one place `logit_bias` is genuinely unbeatable is forcing a single-token answer for cheap classification. Lift each label token by +100 — in odds, the same thing as pushing every other token down by 100, in three entries rather than a vocabulary's worth — set `max_tokens=1`, and the response is one of your labels: no parsing, no retries, and the logprob of the chosen token is a usable score." },

    { t: "code", lang: "python", title: "classify.py — the one pattern worth memorising", code: `from openai import OpenAI
from transformers import AutoTokenizer

MODEL  = "meta-llama/Llama-3.1-8B-Instruct"
client = OpenAI(base_url="http://localhost:8000/v1", api_key="unused")   # a vLLM server
tok    = AutoTokenizer.from_pretrained(MODEL)       # the SERVED model's tokeniser, no other

LABELS = ["positive", "negative", "neutral"]        # no leading space: a chat reply starts clean
ids    = [tok.encode(label, add_special_tokens=False) for label in LABELS]
assert all(len(i) == 1 for i in ids), "every label must be a single token"
allowed = {str(i[0]): 100 for i in ids}             # +100 on each label

# Every other token keeps its own score; the labels are lifted so far above
# them that nothing else can win. max_tokens=1 means exactly one is emitted.
response = client.chat.completions.create(
    model=MODEL,
    messages=[{"role": "user", "content": f"Sentiment of: {text}"}],
    logit_bias=allowed,
    max_tokens=1,
    logprobs=True,                  # the score comes free
)
label = response.choices[0].message.content`,
      hl: [6, 10],
      caption: "Each label must be a single token in the tokeniser of the model being served — the `assert` is the check, and it is why `\"positive\"` beats `\"positive sentiment\"`. Ids taken from any other tokeniser bias three unrelated tokens and raise no error. The listing targets an open-weight server because that is where the parameter reliably lives: OpenAI offers `logit_bias` on Chat Completions only, model by model, and the Responses API, Claude and Gemini have none. There the same closed set is a schema with an `enum` (1.8), which costs a few more output tokens and needs no token ids. 8.7 measures what the logprob is worth as a confidence, and 1.1 covers which distribution it is reported from." },

    /* ============================================================ exercise */
    { t: "exercise", kind: "Challenge", title: "Find the bias that flips the argmax",
      difficulty: "core", minutes: 20,
      body: [
        { t: "p", text: "The measurement showed `' blue'` becoming the argmax somewhere between a bias of 0 and +5. The exact threshold is computable rather than something to search for by hand — it is the logit gap between the token and the current leader." },
        { t: "p", text: "Compute it for several tokens, and confirm that the prediction matches what the sampler actually does." }
      ],
      requirements: [
        "Take next-token logits for \"My favourite colour is\"",
        "For five colour tokens, compute the bias that would exactly tie each one with the current argmax",
        "Verify each prediction by applying that bias plus a small epsilon and checking the argmax",
        "Report each token's baseline probability and its probability at the threshold bias",
        "Explain in one line why the probability at the tie is not 0.5"
      ],
      hint: "Adding b to a logit makes it equal to the maximum when b equals `max(logits) - logit[token]`. The gap is all you need; no search is required.",
      solution: { lang: "python", title: "g16_ex.py",
        code: `import torch
from transformers import GPT2LMHeadModel, GPT2TokenizerFast

tok = GPT2TokenizerFast.from_pretrained("gpt2")
model = GPT2LMHeadModel.from_pretrained("gpt2").eval()
ids = tok("My favourite colour is", return_tensors="pt").input_ids
with torch.no_grad():
    logits = model(ids).logits[0, -1]

top_logit = logits.max().item()
leader = tok.decode([int(logits.argmax())])
base = torch.softmax(logits, dim=-1)

print("current argmax: %r at logit %.4f" % (leader, top_logit))
print()
print("%-10s %10s %10s %12s %14s %8s"
      % ("token", "logit", "gap", "p(baseline)", "p(at threshold)", "flips?"))

for word in (" blue", " red", " green", " black", " purple"):
    ix  = tok(word).input_ids[0]
    gap = top_logit - logits[ix].item()

    b = logits.clone()
    b[ix] += gap + 1e-3                       # the predicted threshold, plus epsilon
    p = torch.softmax(b, dim=-1)
    flips = int(p.argmax()) == ix

    print("%-10s %10.4f %10.4f %12.6f %14.6f %8s"
          % (repr(word), logits[ix].item(), gap, base[ix].item(), p[ix].item(), flips))`,
        out: `current argmax: ' the' at logit -88.3952

token           logit        gap  p(baseline) p(at threshold)   flips?
' blue'      -89.1143     0.7191     0.051379       0.100140     True
' red'       -89.4584     1.0632     0.036421       0.098739     True
' green'     -89.8547     1.4595     0.024505       0.097651     True
' black'     -89.4474     1.0522     0.036824       0.098776     True
' purple'    -90.0895     1.6943     0.019377       0.097190     True`,
        notes: [
          { t: "p", text: "The prediction holds for every token, and it needed no search: the bias that ties a token with the leader is exactly the logit gap, because a bias is an addition to the logit and nothing else in the vector moves. `' blue'` needed 0.7191 and `' purple'` needed 1.6943 — and the difference between those, 0.9752, is exactly `ln(0.051379 / 0.019377)`, which is the ratio identity from 1.2 read backwards." },
          { t: "p", text: "The column that surprises people is `p(at threshold)`: every token arrives at about **0.098 to 0.100**, not 0.5. At the tie the biased token and the old leader have equal logits and therefore equal probability — but they are two tokens out of 50,257, and the rest of the distribution still holds about 80% of the mass. A tie for first place is not a two-horse race; it is two horses in front of a very large field. (The small spread across rows is because lifting a token also adds its own mass to the denominator, by slightly different amounts.)" },
          { t: "p", text: "The practical reading: if you want a token *chosen*, the threshold bias is not enough, because a tie means the sampler picks it about half the time and argmax picks it on an implementation detail. Add several units beyond the gap — the measurement in §02 showed +5 taking `' blue'` to 0.889 and +10 to 0.999. If you want it *guaranteed*, lift it by far more than any gap in the vector, which is the classification pattern's +100." }
        ] } },

    /* ============================================================ scenario */
    { t: "callout", kind: "scenario", title: "Incident: the profanity filter that banned a product name",
      body: [
        { t: "p", text: "**Symptom.** A support-reply generator began producing sentences with words missing — \"we have shipped your\" with nothing after it, or replies that referred to \"the item\" where the product name should have been. It affected roughly one account in forty, and nobody could reproduce it on demand." },
        { t: "p", text: "**Configuration.** A 600-entry `logit_bias` map at −100, assembled a year earlier from a list of words the brand did not want to appear, built by tokenising each word and taking the first id." },
        { t: "p", text: "**Mechanism.** Two of the banned words shared a first token with a legitimate product name — the tokeniser split the product name so that its opening subword was the same id as an unrelated banned word. At −100 that id was effectively zero, so the model could not begin the product name at all. It did what a model does when the token it wants is unavailable: it produced the most likely alternative, which was sometimes a pronoun and sometimes nothing coherent at all." },
        { t: "p", text: "**Fix.** The bias map was reduced to the thirty tokens that were unambiguous, and the rest moved to an output guardrail that checks the finished text (11.14) — where a word is a word rather than an id. Two durable lessons. First, a bias map is a list of *token ids*, and ids are shared between words in ways no one reviewing the word list will notice. Second, the map had been built once and never re-derived; when the team later moved from `cl100k_base` to `o200k_base`, every id in it meant something different. 12.4 is about that class of breakage." }
      ] }
  ],

  takeaways: [
    "A **stop sequence is enforced by the server, not understood by the model.** The serving loop decodes after each token, halts when a stop string is complete, and returns the text before it.",
    "Measured: a stop at the first comma returned 1 token and billed **2**, because the token that completes the match is generated before it can be matched. The same cut made client-side, on a finished response, bills all 30.",
    "A stop string the model never emits does nothing, so `max_tokens` is the only hard stop. Stop strings are matched on decoded text, not token ids — `\".\\n\\n\"` is two tokens — so a stop can fire on characters that arrived mid-token.",
    "**`logit_bias` adds a number to one logit**, before everything else. From the ratio identity, a bias of `b` multiplies that token's odds against every other token by `exp(b)`.",
    "Measured: a bias of **+5** took a token from 5.1% of the mass to **88.9%** and from rank 2 to rank 1; +10 took it to 99.9%. Anything past about +12 is indistinguishable from certainty.",
    "**−100 is a ban by arithmetic, not by special case.** `exp(-100)` ≈ 4×10⁻⁴⁴ drives the probability below float32's smallest positive value, so it rounds to zero — measured at rank 50,257.",
    "Bias is keyed by **token id, not word**. `\"blue\"` and `\" blue\"` are different ids, case and morphology are separate ids again, and some forms like `\" bluish\"` are not a single token at all.",
    "The bias that ties a token with the current leader is exactly the logit gap — no search needed. At that tie the token sits near 0.10, not 0.5, because the other 50,255 tokens still hold about 80% of the mass.",
    "The one unbeatable use of `logit_bias`: bias a small set of single-token labels to +100, set `max_tokens=1`, and get a guaranteed label with a usable logprob. Where the parameter does not exist, an `enum` in a schema is the same closed set."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A framework applies your stop string client-side, to a finished, non-streamed response. The model wrote 200 tokens and the string first appears after 12. What are you billed for?",
        options: ["12 tokens, where the stop string matched", "All 200; the cut came after generation", "13 tokens, with the matched one included", "Nothing, since the reply was truncated"],
        answer: 1,
        why: "A stop saves tokens only when the serving loop enforces it, because that is the only place generation can be halted — measured, a server-side stop at the first comma billed 2 tokens where the same cut made afterwards billed all 30. Thirteen is what a server-side stop would bill here: the twelve visible tokens plus the one that completed the match, which is generated before it can be matched and never shown. Twelve assumes the matching token is free, and it is not. Nothing is never right: the work was done. It is why a stop parameter that a wrapper emulates is a formatting feature only." },

      { stem: "You add `logit_bias={12345: 5}` for a token currently at 5% of the probability mass. Roughly where does it end up?",
        options: ["About 10%, since 5 is a modest number", "About 89%: odds multiply by exp(5)", "About 50%, as it ties for first place", "Unchanged, as 5 is far below ±100"],
        answer: 1,
        why: "A bias is added to the logit, and from the ratio identity in 1.2 that multiplies the token's odds against every other token by `exp(5)` ≈ 148 — measured at 0.88936913, up from 0.051379. The first option reads the number as if it were a percentage or a linear nudge. The third confuses a bias with a tie: the measured tie point put the token near 0.10, because two tied leaders still compete with 50,255 others. The fourth mistakes the documented range for a scale on which 5 is small — in log-odds, 5 is enormous." },

      { stem: "You want the model never to say the word \"refund\". Which approach actually works?",
        options: ["logit_bias on the token id for \" refund\" at −100", "An output guardrail that checks the finished text", "A stop sequence at \" refund\"", "logit_bias on every casing of the word at −100"],
        answer: 1,
        why: "A bias is keyed by token id, so banning the concept means enumerating every surface form — `refund`, ` refund`, `Refund`, ` REFUND`, ` refunds`, ` refunding` — and some of those are not single tokens at all, which means no single id can block them. The measured enumeration in §03 showed exactly this: seven surface forms, six distinct first tokens, and one that splits into two. The fourth option is the attempt that seems thorough and still leaks, and it also risks the incident in §04, where a banned id was shared with a legitimate word. A stop sequence would truncate the reply mid-sentence rather than avoiding the word, which is a worse outcome than saying it." },

      { stem: "Why does a token biased to exactly the logit gap reach about 0.10 rather than 0.5?",
        options: ["The softmax is not normalised at that point", "The pair still competes with 50,255 others", "logit_bias is applied after the softmax", "float32 rounding shifts the result"],
        answer: 1,
        why: "At the tie the biased token and the previous leader have identical logits and therefore identical probabilities, but a tie for first place is not a two-way contest — the remaining vocabulary still holds about 80% of the mass, and roughly 0.10 is each leader's share of it. The first option is wrong: softmax always normalises to 1. The third has the order backwards — bias is added to the logit, before the softmax, which is why the effect is multiplicative in the odds. The fourth invents a rounding effect at a magnitude where float32 has plenty of precision." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "Both parameters are simple enough that the interesting question is always about their limits rather than their definitions.",
    questions: [
      { level: "core",
        q: "How does a stop sequence work, and what does it cost?",
        strong: "A strong answer knows the match happens on decoded text in the serving loop, and separates what is billed from what is shown.",
        answer: [
          { t: "p", text: "The serving loop generates a token, decodes the text so far, and checks it against each stop string; at the first match it halts and returns the text before the match. The model is never told the parameter exists — it is the server's decision, not an instruction." },
          { t: "p", text: "On cost: you pay for everything generated up to the halt, including the token that completed the match, which you never see. I measured a stop at the first comma returning one token and billing two. So it does save the tokens that were never generated — but only when the model actually emits the string. If it never does, generation runs to the cap, which is why `max_tokens` is the only hard stop. And a stop applied client-side to a finished response saves nothing at all." },
          { t: "p", text: "The other detail worth naming is that matching on decoded text means the stop string need not align to token boundaries. `\".\\n\\n\"` is two tokens; a stop can also fire on characters that arrived in the middle of one." }
        ] },

      { level: "core",
        q: "What does logit_bias actually do, and what does −100 mean?",
        strong: "A strong answer converts the bias into an odds multiplier and explains −100 as arithmetic rather than a special case.",
        answer: [
          { t: "p", text: "It adds a number to one token's logit, before temperature and before truncation. Because a softmax ratio is `exp(gap)`, adding `b` multiplies that token's odds against every other token by `exp(b)`. That conversion is the whole thing: +5 is a factor of 148, +10 is 22,000." },
          { t: "p", text: "I measured a token at 5.1% of the mass going to 88.9% at +5 and 99.9% at +10. Which also means anything past about +12 is indistinguishable from certainty, so most of the documented ±100 range is unusable resolution." },
          { t: "p", text: "−100 is a ban for the same reason, not because of a special case: `exp(-100)` is about 4×10⁻⁴⁴, which drives the probability to the last float32 step above zero, 1.4×10⁻⁴⁵, so 200,000 draws never produced it. In the measurement the token went to rank 50,257 — last in the vocabulary." }
        ] },

      { level: "advanced",
        q: "A team has a 600-entry logit_bias map to stop the model using certain words. What concerns do you raise?",
        strong: "A strong answer identifies that ids are not words, gives the specific ways that breaks, and proposes the layer where the constraint actually belongs.",
        answer: [
          { t: "p", text: "The first concern is that a bias map is a list of token ids and they were almost certainly derived from words. A word is not a token: `\"refund\"` and `\" refund\"` are different ids, casing and plurals are different ids again, and some forms split into multiple tokens so no single id blocks them. So the map is very likely both incomplete and larger than it needs to be." },
          { t: "p", text: "The second is collisions, and this is the one that causes incidents. A banned word's first subword can be shared with a legitimate word — a product name, a customer name — and at −100 that id is effectively zero, so the model cannot begin the legitimate word either. What comes out is a sentence with a hole in it, on a small fraction of requests, which is very hard to attribute back to a config file." },
          { t: "p", text: "The third is that the map is tied to a tokenizer. Move from `cl100k_base` to `o200k_base` and every id in it means something different — silently, with no error." },
          { t: "p", text: "What I would propose: keep `logit_bias` only for the small set of unambiguous single tokens where it is genuinely the right instrument, and move the rest to an output guardrail that checks the finished text, where a word is a word. That is 11.14, and it also gives you a place to log what fired." }
        ] },

      { level: "advanced",
        q: "Give me a case where logit_bias is the best available tool.",
        strong: "Single-token classification. A strong answer explains why the guarantee is stronger than prompting and names the constraint that makes it work.",
        answer: [
          { t: "p", text: "Forcing a classification into a small closed label set. Bias each label token to +100, set `max_tokens=1`, and the response is guaranteed to be one of your labels — not \"usually\", but structurally, because everything else has been lifted out of reach and only one token is emitted." },
          { t: "p", text: "That is a stronger guarantee than asking in the prompt, which gets you a label most of the time and occasionally a sentence explaining the label. It removes the parsing step, the retry path and the \"model added a preamble\" class of bug entirely." },
          { t: "p", text: "The constraint that makes it work is that each label has to be a single token, so you check with the tokenizer and choose label words that are — `\" positive\"` rather than `\" positive sentiment\"`. And you get the logprob of the chosen token for free, which is a usable ranking signal as long as you remember from 1.1 to check which distribution your stack reports it from, and that it is not a calibrated confidence either way." }
        ] }
    ]
  }
});
