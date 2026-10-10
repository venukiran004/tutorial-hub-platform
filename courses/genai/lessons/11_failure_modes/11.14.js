EC.receiveLesson({
  id: "11.14",

  lede: "The last line of defence: **never serve raw model output in a sensitive app.** Four checks, and one of them is unusual in being a near-perfect detector rather than a probabilistic one \u2014 a **canary token** in the system prompt that appears in the output is *proof* the prompt leaked, not evidence of it. Which makes it the highest-signal check in the whole module, at the cost of one string comparison. And the fourth check is the faithfulness gate, which 11.4 measured at 739 ms per claim.",

  objectives: [
    "Implement the four output checks and order them by cost",
    "Explain why a canary token is proof rather than evidence",
    "Say why moderation needs a dedicated model rather than regex",
    "Handle a streamed response, where the output does not exist all at once",
    "Decide what to serve when a check fires"
  ],

  prerequisites: ["11.13"],

  blocks: [

    { t: "h2", n: "01", id: "moderation", text: "Check 1 \u2014 Content moderation",
      sub: "Use a dedicated model, not regex" },

    { t: "code", lang: "python", title: "Moderation against categories", code: `SAFETY_CATEGORIES = ["hate", "harassment", "violence", "self_harm", "sexual", "illegal"]

def moderate(text: str, classify) -> dict:
    """\`classify\` = a moderation model/API returning per-category scores 0-1."""
    scores = classify(text)
    violations = [c for c in SAFETY_CATEGORIES if scores.get(c, 0) > 0.5]
    return {"safe": not violations, "violations": violations, "scores": scores}`,
      hl: [5],
      caption: "The 0.5 threshold is a policy decision, and 11.16 measures what it costs in both directions." },

    { t: "callout", kind: "insight", title: "This is the one place it is commonly said *not* to hand-roll, and 11.13 shows why",
      body: [
        { t: "p", text: "It recommends a dedicated moderation model \u2014 OpenAI Moderation, Llama Guard, Perspective \u2014 \u201crather than hand-rolled regex for toxicity\u201d. 11.13 measured exactly what hand-rolled patterns are worth on a related task: 0% of thirteen paraphrases, 60% of benign inputs wrongly blocked." },
        { t: "p", text: "Toxicity is harder than injection for a pattern list, not easier, because the surface forms are even more open-ended and the benign collisions more common. A list of slurs catches slurs and misses every circumlocution, while blocking medical and historical discussion." },
        { t: "p", text: "The per-category structure matters too. A single \u2018unsafe\u2019 score cannot support different thresholds for self-harm and illegal-activity content, and those genuinely want different thresholds \u2014 which is a policy requirement the data model has to allow." }
      ] },

    { t: "h2", n: "02", id: "canary", text: "Check 2 \u2014 PII, secrets and the canary",
      sub: "The one near-certain detector in the module" },

    { t: "code", lang: "python", title: "The output scan", code: `SECRETS = [r"(?:api[_-]?key|secret|password|token)\\s*[:=]\\s*\\S+",
           r"sk-[A-Za-z0-9]{20,}", r"AKIA[0-9A-Z]{16}"]  # AWS key pattern

def output_safe(text: str, canary: str) -> dict:
    if canary and canary in text:
        return {"safe": False, "reason": "system_prompt_leak"}   # canary escaped -> prompt leaked
    for pat in SECRETS + list(PII.values()):
        if re.search(pat, text, re.I):
            return {"safe": False, "reason": "pii_or_secret_leak"}
    return {"safe": True}`,
      hl: [5, 6],
      caption: "The canary check is two lines and it is the highest-signal check anywhere in this module." },

    { t: "callout", kind: "good", title: "A canary hit is proof, not evidence",
      body: [
        { t: "p", text: "Plant a unique secret string in the system prompt. If it appears in the output, the model reproduced part of its system prompt \u2014 there is no other way for that string to exist in the response, because nothing else in the universe contains it. That is a **near-zero false-positive rate by construction**, which nothing else in this module can claim." },
        { t: "p", text: "Compare it with every other check here. Moderation has a threshold and a precision/recall trade-off. PII regexes have the false positives 11.13 measured. The faithfulness gate has a decision rule and a 739 ms bill. The canary has a string comparison and a definitionally sound inference." },
        { t: "p", text: "Its limitation is the mirror image: **near-zero false positives and a high false-negative rate.** A model that paraphrases its instructions rather than quoting them leaks the content without emitting the token. So the canary catches verbatim extraction and misses summarised extraction \u2014 which makes it a high-precision tripwire rather than a complete defence." }
      ] },

    { t: "callout", kind: "insight", title: "Which makes it the ideal alert, as against the ideal filter",
      body: [
        { t: "p", text: "10.12 argued for alerts whose movement triggers an action and which are not sample-size limited. A canary hit is both: **any** hit is an incident, no threshold, no confidence interval, no baseline to compare against. One occurrence is actionable." },
        { t: "p", text: "That is rare and worth exploiting. Most quality signals need a rate, a window and a 2-sigma threshold before they mean anything \u2014 this one means something on a single request, which makes it the cheapest high-value alert in the guardrail stack." },
        { t: "p", text: "The common list has canary-token hits in its metrics table with \u2018any is an incident\u2019, alongside PII-leak events. Both deserve that treatment and only the canary deserves the confidence." }
      ] },

    { t: "h2", n: "03", id: "schema", text: "Checks 3 and 4 \u2014 Schema and grounding",
      sub: "And never auto-execute" },

    { t: "dl", items: [
      { k: "Schema / format validation", v: "Validate structured output against a schema and **never blindly execute generated commands, SQL or code.** The validation is cheap and local; the non-execution rule is architectural \u2014 11.12\u2019s point that a guardrail protects the output and least privilege protects the world." },
      { k: "Grounding / faithfulness gate", v: "Gate on a faithfulness score so ungrounded claims are blocked or regenerated \u2014 11.4 and 11.5. This is the expensive one: 739 ms per claim measured on CPU, which is why 11.15\u2019s latency budget is dominated by it." }
    ] },

    { t: "callout", kind: "warn", title: "Streaming breaks the output stage, and the usual treatment does not address it",
      body: [
        { t: "p", text: "Every check here assumes a complete response to inspect. With streaming, tokens reach the user as they are produced \u2014 so by the time a moderation check could run on the full text, the user has already read it. The last line of defence has no line to stand on." },
        { t: "p", text: "There are three workable designs and each gives something up. **Buffer** the whole response, check it, then stream it \u2014 which discards the entire latency benefit and returns you to 9.15\u2019s spinner. **Chunk-check** on a sliding window, which catches a slur mid-stream and cannot catch an ungrounded claim that needs the whole answer. **Stream optimistically and retract**, which is honest about the exposure and needs a UI that can withdraw text." },
        { t: "p", text: "The split that makes this tractable: the **local** checks \u2014 canary, secrets, PII \u2014 can run per chunk cheaply and meaningfully, because a leaked key is leaked in one chunk. The **semantic** checks \u2014 moderation of tone, faithfulness \u2014 need the whole answer. So stream with per-chunk local checks and run the semantic ones asynchronously, accepting that they detect rather than prevent." }
      ] },

    { t: "callout", kind: "good", title: "And what you serve when a check fires is not the raw output",
      body: [
        { t: "p", text: "The reference is explicit: return a safe refusal, **not the raw text**. That sounds obvious and the failure mode is common \u2014 a guardrail that logs a violation and serves the response anyway, because blocking felt too aggressive during implementation." },
        { t: "p", text: "The refusal should also not explain which check fired. \u2018I cannot help with that\u2019 is correct; \u2018your request was blocked by the injection detector\u2019 is a free oracle for anyone probing the boundary, letting them binary-search the filter." },
        { t: "p", text: "And log the event with references to the input and output rather than the content itself, which is 10.10\u2019s allowlist argument \u2014 you want the guardrail event queryable without exporting the payload that triggered it." }
      ] },

    { t: "viz", title: "Four output checks, by cost and certainty", caption: "The canary is the only near-certain detector, and it is two lines.",
      svg: `<svg viewBox="0 0 760 320" width="100%" role="img" aria-label="Four output guardrails ordered by cost with the canary token highlighted">
  <text x="16" y="20" class="s-label">OUTPUT CHECKS, CHEAPEST FIRST</text>

  <rect x="16" y="30" width="728" height="40" rx="4" class="s-fill" style="stroke:var(--good)" stroke-width="1.8"/>
  <text x="28" y="48" class="s-mono" style="font-size:10px;fill:var(--good)">CANARY CHECK &#183; 0.1 ms &#183; a string comparison</text>
  <text x="28" y="63" class="s-mono" style="font-size:8px">a hit is PROOF the system prompt leaked &#8212; near-zero false positives BY CONSTRUCTION</text>
  <text x="600" y="48" class="s-mono" style="font-size:9px;fill:var(--good)">any hit = incident</text>

  <rect x="16" y="76" width="728" height="34" rx="3" class="s-fill" style="stroke:var(--accent)" stroke-width="1.4"/>
  <text x="28" y="94" class="s-mono" style="font-size:9px">PII / SECRET SCAN &#183; 0.4 ms &#183; regex</text>
  <text x="28" y="106" class="s-sub">AWS keys, sk- tokens, key=value pairs &#183; and the false positives 11.13 measured</text>

  <rect x="16" y="116" width="728" height="34" rx="3" class="s-fill" style="stroke:var(--accent)" stroke-width="1.4"/>
  <text x="28" y="134" class="s-mono" style="font-size:9px">SCHEMA VALIDATION &#183; 1.2 ms &#183; local</text>
  <text x="28" y="146" class="s-sub">and NEVER auto-execute generated SQL, commands or code &#8212; that is architecture, not a check</text>

  <rect x="16" y="156" width="728" height="34" rx="3" class="s-fill-bg" style="stroke:var(--warn)" stroke-width="1.6"/>
  <text x="28" y="174" class="s-mono" style="font-size:9px;fill:var(--warn)">CONTENT MODERATION &#183; ~42 ms &#183; a dedicated model, NOT regex</text>
  <text x="28" y="186" class="s-sub">per-category scores, so self-harm and illegal can have different thresholds</text>

  <rect x="16" y="196" width="728" height="34" rx="3" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.8"/>
  <text x="28" y="214" class="s-mono" style="font-size:9px;fill:var(--crit)">FAITHFULNESS GATE &#183; MEASURED 739 ms PER CLAIM &#183; 2,957 ms for four</text>
  <text x="28" y="226" class="s-sub">dominates the whole latency budget &#8212; see 11.15</text>

  <line x1="16" y1="242" x2="744" y2="242" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="262" class="s-label">AND STREAMING BREAKS ALL OF IT</text>
  <rect x="16" y="270" width="236" height="44" rx="3" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.4"/>
  <text x="28" y="286" class="s-mono" style="font-size:8px;fill:var(--crit)">BUFFER, CHECK, THEN STREAM</text>
  <text x="28" y="300" class="s-sub">loses the whole latency benefit &#8212;</text>
  <text x="28" y="310" class="s-sub">back to the spinner</text>
  <rect x="262" y="270" width="236" height="44" rx="3" class="s-fill-bg" style="stroke:var(--warn)" stroke-width="1.4"/>
  <text x="274" y="286" class="s-mono" style="font-size:8px;fill:var(--warn)">CHUNK-CHECK ON A WINDOW</text>
  <text x="274" y="300" class="s-sub">catches a leaked key in one chunk;</text>
  <text x="274" y="310" class="s-sub">cannot judge a whole-answer claim</text>
  <rect x="508" y="270" width="236" height="44" rx="3" class="s-fill" style="stroke:var(--good)" stroke-width="1.5"/>
  <text x="520" y="286" class="s-mono" style="font-size:8px;fill:var(--good)">LOCAL PER CHUNK, SEMANTIC ASYNC</text>
  <text x="520" y="300" class="s-sub">a leaked key is leaked in one chunk;</text>
  <text x="520" y="310" class="s-sub">faithfulness needs the whole answer</text>
</svg>` },

    { t: "exercise", kind: "build", title: "Build the output stage, including the streaming case", difficulty: "advanced", minutes: 35,
      body: "Implement the four output checks with a canary, run them against a set of responses including a leaked prompt and a leaked key, then adapt the stage for streaming by deciding which checks can run per chunk and which cannot.",
      requirements: [
        "All four checks, ordered by cost, with a fail-fast path",
        "A canary hit detected and distinguished from a PII hit",
        "A safe refusal returned rather than the raw text, with no detail about which check fired",
        "Each check classified as chunk-safe or whole-answer-only",
        "A statement of what the streaming design gives up"
      ],
      hint: "Ask of each check: could this fire on a single chunk and still be correct? A leaked API key appears in one chunk. An ungrounded claim may need the sentence after the one you are looking at.",
      solution: { lang: "python", title: "the output stage, and the streaming split", code: `import re

PII = {
    "email": r"\\b[\\w.%+-]+@[\\w.-]+\\.\\w{2,}\\b",
    "phone": r"\\b\\d{3}[-.]?\\d{3}[-.]?\\d{4}\\b",
    "ssn":   r"\\b\\d{3}-\\d{2}-\\d{4}\\b",
    "card":  r"\\b\\d{4}[-\\s]?\\d{4}[-\\s]?\\d{4}[-\\s]?\\d{4}\\b",
}
SECRETS = [r"(?:api[_-]?key|secret|password|token)\\s*[:=]\\s*\\S+",
           r"sk-[A-Za-z0-9]{20,}", r"AKIA[0-9A-Z]{16}"]
SAFETY_CATEGORIES = ["hate", "harassment", "violence", "self_harm", "sexual", "illegal"]
CANARY = "zx7Qv-canary-8841"

def check_canary(text, canary=CANARY):
    return {"safe": canary not in text, "reason": "system_prompt_leak", "cost_ms": 0.1}

def check_secrets(text):
    for pat in SECRETS + list(PII.values()):
        if re.search(pat, text, re.I):
            return {"safe": False, "reason": "pii_or_secret_leak", "cost_ms": 0.4}
    return {"safe": True, "reason": None, "cost_ms": 0.4}

def check_schema(text, needs_json=False):
    if not needs_json:
        return {"safe": True, "reason": None, "cost_ms": 1.2}
    import json
    try:
        json.loads(text)
        return {"safe": True, "reason": None, "cost_ms": 1.2}
    except Exception:
        return {"safe": False, "reason": "schema_invalid", "cost_ms": 1.2}

def check_moderation(text, scores):
    bad = [c for c in SAFETY_CATEGORIES if scores.get(c, 0) > 0.5]
    return {"safe": not bad, "reason": "moderation:%s" % ",".join(bad) if bad else None,
            "cost_ms": 42.0}

PIPELINE = [("canary", check_canary), ("secrets", check_secrets),
            ("schema", check_schema), ("moderation", check_moderation)]

def output_stage(text, scores=None, needs_json=False):
    """Fail fast: a canary hit makes the moderation call pointless."""
    spent = 0.0
    for name, fn in PIPELINE:
        if name == "moderation":
            r = fn(text, scores or {})
        elif name == "schema":
            r = fn(text, needs_json)
        else:
            r = fn(text)
        spent += r["cost_ms"]
        if not r["safe"]:
            return {"serve": "I can't help with that.", "blocked": True,
                    "reason": r["reason"], "ms": spent, "stopped_at": name}
    return {"serve": text, "blocked": False, "reason": None, "ms": spent,
            "stopped_at": None}

RESPONSES = [
    ("clean answer",   "Unopened software may be returned within 14 days.", {}),
    ("prompt leaked",  "My instructions say zx7Qv-canary-8841 and to be helpful.", {}),
    ("key leaked",     "Use api_key=sk-abcdefghijklmnopqrstuvwxyz123 to authenticate.", {}),
    ("pii leaked",     "I'll email venu.k@example.com with the details.", {}),
    ("toxic",          "A perfectly fluent but hateful paragraph.", {"hate": 0.91}),
]
print("%-16s %-10s %-26s %8s  %s" % ("response", "blocked", "reason", "ms", "stopped at"))
for name, text, scores in RESPONSES:
    r = output_stage(text, scores)
    print("%-16s %-10s %-26s %8.1f  %s"
          % (name, "YES" if r["blocked"] else "no", r["reason"] or "-", r["ms"],
             r["stopped_at"] or "-"))

print()
print("note the FAIL-FAST saving: the leaked-prompt case stopped at 0.1 ms,")
print("because a canary hit makes the 42 ms moderation call pointless.")
print("the clean answer paid the full %.1f ms." % output_stage(RESPONSES[0][1], {})["ms"])
print()
print("and note what is served: a generic refusal, never the raw text, and")
print("with NO indication of which check fired -- that would be a free oracle")
print("for anyone probing the boundary.")

print()
print("=" * 72)
print("WHICH CHECKS SURVIVE STREAMING?")
print("=" * 72)
STREAM = [
    ("canary",      True,  "the token appears in ONE chunk -- chunk-safe"),
    ("secrets/PII", True,  "a key is leaked in one chunk -- chunk-safe, with a sliding window"),
    ("schema",      False, "JSON is only valid once complete"),
    ("moderation",  False, "tone is a property of the passage, not a chunk"),
    ("faithfulness", False, "a claim may need the sentence after the one you are reading"),
]
for name, chunk_safe, why in STREAM:
    print("  %-14s %-12s %s" % (name, "CHUNK-SAFE" if chunk_safe else "whole answer", why))
print()
n_safe = sum(1 for _, c, _ in STREAM if c)
print("%d of %d checks can run per chunk." % (n_safe, len(STREAM)))
print()
print("so the streaming design is: run the LOCAL checks per chunk (cheap, and")
print("meaningful because a leak happens in one chunk), and run the SEMANTIC")
print("checks asynchronously on the complete answer -- accepting that they")
print("DETECT rather than PREVENT.")
print()
print("the alternative is to buffer, check, then stream -- which is correct and")
print("discards the entire latency benefit. that is the real trade, and it is")
print("a product decision rather than a technical one.")`,
        out: `response         blocked    reason                           ms  stopped at
clean answer     no         -                              43.7  -
prompt leaked    YES        system_prompt_leak              0.1  canary
key leaked       YES        pii_or_secret_leak              0.5  secrets
pii leaked       YES        pii_or_secret_leak              0.5  secrets
toxic            YES        moderation:hate                43.7  moderation

note the FAIL-FAST saving: the leaked-prompt case stopped at 0.1 ms,
because a canary hit makes the 42 ms moderation call pointless.
the clean answer paid the full 43.7 ms.

and note what is served: a generic refusal, never the raw text, and
with NO indication of which check fired -- that would be a free oracle
for anyone probing the boundary.

========================================================================
WHICH CHECKS SURVIVE STREAMING?
========================================================================
  canary         CHUNK-SAFE     the token appears in ONE chunk -- chunk-safe
  secrets/PII    CHUNK-SAFE     a key is leaked in one chunk -- chunk-safe, with a sliding window
  schema         whole answer   JSON is only valid once complete
  moderation     whole answer   tone is a property of the passage, not a chunk
  faithfulness   whole answer   a claim may need the sentence after the one you are reading

2 of 5 checks can run per chunk.

so the streaming design is: run the LOCAL checks per chunk (cheap, and
meaningful because a leak happens in one chunk), and run the SEMANTIC
checks asynchronously on the complete answer -- accepting that they
DETECT rather than PREVENT.

the alternative is to buffer, check, then stream -- which is correct and
discards the entire latency benefit. that is the real trade, and it is
a product decision rather than a technical one.`,
        notes: [
          { t: "p", text: "**Fail-fast saves 437x on the leaked-prompt case** — 0.1 ms against the 43.7 ms a clean answer pays. The canary hit makes every later check pointless, so ordering cheapest-first is not a micro-optimisation: it is the difference between one string compare and a network round trip." },
          { t: "p", text: "**The clean path pays everything**, which is the honest limit of fail-fast. It only helps on blocked responses, and blocked responses should be the minority — so the 43.7 ms is the real steady-state cost of the output stage, and 11.15 is about whether that can be parallelised." },
          { t: "p", text: "**Two of five checks survive streaming.** The canary and the secrets scan are chunk-safe because a leak happens in one chunk; schema, moderation and faithfulness all need the complete answer. That ratio is the whole streaming design in one number." },
          { t: "p", text: "**The pipeline deliberately reveals nothing in the refusal.** Every blocked case returns the same string, and the `reason` is logged rather than served — because ‘blocked by the injection detector’ lets anyone probing the boundary binary-search the filter." },
          { t: "p", text: "One structural thing the output table shows: the key-leak and PII-leak cases return the same reason, `pii_or_secret_leak`, because the function returns on the first match without saying which pattern hit. For incident response you want the pattern name, so I would widen that return value — an API key leaking and an email address leaking are very different incidents." },
          { t: "p", text: "And the schema check is a no-op here because none of the responses requested JSON. It is in the pipeline at the right position — local, cheap, before the remote call — and on a structured-output endpoint it would be the second most likely check to fire after moderation." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Never serve raw model output in a sensitive app. Four checks, cheapest first: the canary, which is **proof** of a prompt leak rather than evidence and therefore the only near-certain detector in the module; PII and secrets; schema validation plus never auto-executing generated code; and the faithfulness gate, which dominates the latency budget." },
        { t: "p", text: "Fail fast, because a canary hit makes a moderation call pointless. Serve a generic refusal with no indication of which check fired. And for streaming, split the checks: local ones per chunk because a leak happens in one chunk, semantic ones asynchronously \u2014 accepting they detect rather than prevent." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cWhat do you check before a response reaches the user?\u201d**" },
        { t: "p", text: "Four things, ordered by cost so the cheap ones can fail fast. A canary check, a PII and secrets scan, schema validation, and content moderation \u2014 plus a faithfulness gate if it is a RAG answer." },
        { t: "p", text: "The canary is the one I would highlight, because it is unlike everything else in the stack. You plant a unique secret string in the system prompt, and if it appears in the output the model reproduced part of its instructions \u2014 there is no other way that string could exist in the response. So it has a near-zero false-positive rate **by construction**, where every other check here has a threshold and a precision/recall trade-off." },
        { t: "p", text: "That makes it the ideal alert rather than just a filter: any single hit is an incident, with no threshold, no window and no baseline needed. Most quality signals need a rate and a two-sigma band before they mean anything. Its mirror-image limitation is a high false-negative rate \u2014 a model that paraphrases its instructions leaks the content without emitting the token, so it catches verbatim extraction and misses summarised extraction." },
        { t: "p", text: "On moderation I would use a dedicated model rather than regex, and I would justify that with a measurement rather than a preference: I tested hand-rolled patterns on the related injection task and they caught zero of thirteen paraphrases while wrongly blocking six of ten benign inputs. Toxicity has even more open-ended surface forms and more benign collisions, so patterns do worse there, not better." },
        { t: "p", text: "I would order the pipeline to fail fast. A canary hit at 0.1 milliseconds makes the 42-millisecond moderation call pointless, so the cheap local checks go first \u2014 which happens to be both the latency-optimal and the correctness-optimal ordering." },
        { t: "p", text: "The case I would raise unprompted is streaming, because every check here assumes a complete response and streaming does not have one. The split that makes it tractable is local against semantic: a canary token or a leaked API key appears in one chunk, so those can run per chunk meaningfully. Tone and faithfulness are properties of the whole passage, so they cannot. So you stream with per-chunk local checks and run the semantic ones asynchronously, accepting they detect rather than prevent \u2014 or you buffer, check and then stream, which is correct and throws away the entire latency benefit. That is a product decision, not a technical one." }
      ] }
  ],

  takeaways: [
    "**Never serve raw model output in a sensitive app** \u2014 the output stage is the last line of defence.",
    "**A canary token in the system prompt is proof of a leak, not evidence** \u2014 near-zero false positives by construction.",
    "**Which makes it the only near-certain detector in the module**, at the cost of one string comparison.",
    "**And the ideal alert**: any single hit is an incident, with no threshold, window or baseline needed.",
    "**Its mirror-image weakness is a high false-negative rate** \u2014 a paraphrased leak emits no token.",
    "**Use a dedicated moderation model, not regex** \u2014 measured, hand-rolled patterns caught 0 of 13 paraphrases on a related task.",
    "**Per-category scores matter**, because self-harm and illegal-activity content want different thresholds.",
    "**Validate schemas and never auto-execute generated SQL, commands or code** \u2014 the second is architecture, not a check.",
    "**Order the checks cheapest first and fail fast**: a canary hit at 0.1 ms makes a 42 ms moderation call pointless.",
    "**Serve a generic refusal with no indication of which check fired**, or you give an attacker a free oracle.",
    "**Streaming breaks the output stage** \u2014 every check assumes a complete response that does not exist yet.",
    "**So split local from semantic**: a leak happens in one chunk, while tone and faithfulness need the whole answer."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Why is a canary token hit described as proof rather than evidence?",
        options: [
          "Because moderation models confirm it independently",
          "Because the string exists nowhere but the system prompt, so its appearance in output has only one explanation \u2014 a near-zero false-positive rate by construction",
          "Because it is checked before any other guardrail",
          "Because canary tokens are cryptographically signed"
        ],
        answer: 1,
        why: "A unique secret planted in the system prompt cannot reach the output by any route other than the model reproducing its instructions, so the inference is definitional rather than probabilistic \u2014 unlike moderation, PII regexes or a faithfulness gate, all of which have thresholds and measured false-positive rates. The mirror-image limitation is a high false-negative rate: a model that paraphrases its instructions leaks the content without emitting the token." },

      { stem: "Why does the usual advice is a dedicated moderation model over hand-rolled regex?",
        options: [
          "Because regex cannot express per-category scores",
          "Because patterns lose to open-ended surface forms \u2014 measured on the related injection task, they caught 0 of 13 paraphrases and wrongly blocked 6 of 10 benign inputs",
          "Because moderation APIs are faster than local regex",
          "Because regex cannot be updated without a deploy"
        ],
        answer: 1,
        why: "Toxicity has even more varied phrasings than injection and more benign collisions \u2014 a slur list catches slurs, misses every circumlocution, and blocks legitimate medical or historical discussion. A moderation API is also considerably slower than local regex at around 42 ms, so speed is an argument against it rather than for it; the case rests entirely on accuracy in both error directions." },

      { stem: "Why order the output checks cheapest first?",
        options: [
          "To keep the total latency within the SLO",
          "Because it allows failing fast \u2014 a canary hit at 0.1 ms makes a 42 ms moderation call pointless",
          "Because expensive checks are less reliable",
          "Because the schema check must run before moderation can parse the output"
        ],
        answer: 1,
        why: "If an earlier check has already determined the response cannot be served, every later check is wasted work \u2014 and since the cheap checks are also the local ones that cannot fail due to a network problem, the ordering is simultaneously latency-optimal and correctness-optimal. The total latency does matter, but fail-fast is what makes the ordering more than cosmetic, since the clean path still pays for everything." },

      { stem: "Which output checks can meaningfully run on a single chunk of a streamed response?",
        options: [
          "All of them, on a sufficiently large sliding window",
          "The local ones \u2014 canary and secrets/PII \u2014 because a leak occurs within one chunk; moderation and faithfulness need the whole answer",
          "Only schema validation, since JSON can be parsed incrementally",
          "None, which is why streaming must always be buffered"
        ],
        answer: 1,
        why: "An API key or a canary token appears in some specific chunk, so a per-chunk scan with a sliding window catches it at the moment it is emitted. Tone is a property of a passage and a faithfulness judgement may require the sentence after the one being read, so neither is decidable on a fragment \u2014 and JSON is only valid once complete. The resulting design runs local checks inline and semantic ones asynchronously, which detects rather than prevents." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Output guardrails",
    questions: [
      { level: "core",
        q: "What is a canary token and why is it valuable?",
        strong: "A strong answer stresses that it is proof.",
        answer: [
          { t: "p", text: "A unique secret string planted in the system prompt. If it appears in the output, the model reproduced part of its instructions \u2014 and there is no other route by which that string could exist in the response." },
          { t: "p", text: "So the inference is definitional rather than statistical. It has a near-zero false-positive rate by construction, which nothing else in the guardrail stack can claim \u2014 moderation has a threshold, PII regexes have measured false positives, a faithfulness gate has a decision rule." },
          { t: "p", text: "That makes it an unusually good alert as well as a filter: any single hit is an incident, with no rate, window or baseline required. Most quality signals need a two-sigma threshold over a window before they mean anything." },
          { t: "p", text: "Its weakness is the mirror image \u2014 a high false-negative rate. A model that paraphrases its instructions leaks the content without emitting the token, so it catches verbatim extraction and misses summarised extraction." }
        ] },

      { level: "advanced",
        q: "How do output guardrails work with streaming?",
        strong: "A strong answer splits local from semantic.",
        answer: [
          { t: "p", text: "Badly, if you keep the design unchanged \u2014 every check assumes a complete response, and with streaming the user has already read the text by the time there is a complete response to check." },
          { t: "p", text: "The split that makes it tractable is local against semantic. A canary token or a leaked API key appears in one specific chunk, so a per-chunk scan with a sliding window catches it as it is emitted. Tone is a property of a passage and a faithfulness judgement may need the next sentence, so neither is decidable on a fragment." },
          { t: "p", text: "So: local checks inline per chunk, semantic checks asynchronously on the complete answer \u2014 accepting that those detect rather than prevent, and wiring them to an alert and a retraction path rather than a block." },
          { t: "p", text: "The alternative is to buffer, check and then stream, which is correct and discards the entire latency benefit. That is a product decision about which risk you prefer, not a technical one." }
        ] },

      { level: "core",
        q: "What do you return when an output check fires?",
        strong: "A strong answer covers the oracle problem.",
        answer: [
          { t: "p", text: "A generic safe refusal \u2014 never the raw text. The common failure is a guardrail that logs the violation and serves the response anyway, because blocking felt too aggressive when it was built." },
          { t: "p", text: "And the refusal should not say which check fired. \u2018I cannot help with that\u2019 is right; \u2018blocked by the injection detector\u2019 hands anyone probing the boundary a free oracle to binary-search the filter with." },
          { t: "p", text: "I would log the event with references to the input and output rather than the content itself, so the guardrail event is queryable without exporting the payload that triggered it \u2014 which is the same allowlist logic that applies to trace payloads generally." },
          { t: "p", text: "And I would track the block rate per check, because a rate that spikes is either an attack or a broken guardrail, and those need different responses." }
        ] }
    ]
  }
});
