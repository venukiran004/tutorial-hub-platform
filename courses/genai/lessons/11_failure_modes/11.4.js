EC.receiveLesson({
  id: "11.4",

  lede: "You cannot fix what you do not measure, and three complementary signals do the measuring: **entailment** against the context, an **LLM judge**, and **self-consistency** with no context at all. The reference\u2019s worked example \u2014 four claims, one unsupported, score 0.75 \u2014 **reproduces exactly** on `roberta-large-mnli`. And the tempting shortcut fails hard: substituting embedding similarity for entailment scores an invented refund policy at **0.8108, higher than the true claim at 0.7982**. Similarity measures relatedness, not support.",

  objectives: [
    "Implement per-claim faithfulness scoring against a context",
    "Choose a decision rule from a three-way entailment output",
    "Explain why embedding similarity cannot substitute for entailment",
    "Use self-consistency where there is no context to check against",
    "State what the three signals each catch and miss"
  ],

  prerequisites: ["11.3", "9.11"],

  blocks: [

    { t: "h2", n: "01", id: "entailment", text: "Signal 1 \u2014 Entailment",
      sub: "Faithfulness = the fraction of claims the context supports" },

    { t: "code", lang: "python", title: "The scorer, verbatim", code: `# Faithfulness = fraction of answer claims supported by the context.
# \`entails(premise, hypothesis)\` can be an NLI model OR an LLM judge call.

def split_claims(answer: str) -> list[str]:
    # Simple sentence split; production: use an LLM to extract atomic claims.
    import re
    return [s.strip() for s in re.split(r"(?<=[.!?])\\s+", answer) if s.strip()]

def faithfulness_score(answer: str, context: str, entails) -> dict:
    claims = split_claims(answer)
    if not claims:
        return {"score": 1.0, "unsupported": []}
    unsupported = [c for c in claims if not entails(premise=context, hypothesis=c)]
    score = 1 - len(unsupported) / len(claims)
    return {
        "score": round(score, 3),          # 1.0 = fully grounded, 0.0 = all invented
        "n_claims": len(claims),
        "unsupported": unsupported,        # the exact sentences to flag/verify
    }`,
      hl: [13, 14],
      caption: "The whole method is a loop and a division. `entails` is the part that has to be good." },

    { t: "math", tex: "\\text{faithfulness} = 1 - \\frac{|\\text{unsupported claims}|}{|\\text{claims}|}" },

    { t: "callout", kind: "good", title: "The reference\u2019s 0.75 reproduces exactly, under all three decision rules",
      body: [
        { t: "p", text: "Four sentences, three supported by the context, one inventing a $50,000 termination penalty. The reference computes 1 \u2212 1/4 = 0.75 and the measured score on `roberta-large-mnli` is **0.750** \u2014 and the detector names the offending sentence rather than just returning a number." },
        { t: "p", text: "Entailment is a **three-way** output, so a decision rule is required, and I tried three: `entailment > 0.5`, `argmax == entailment`, and `entailment > contradiction`. **All three give 7/7 on the claim set with zero false passes and zero false flags.** The signal is clean enough that the rule does not matter here, which is a pleasant result and not one to generalise from seven claims." },
        { t: "p", text: "The separation is what makes it robust: supported claims score **0.9888 to 0.9931** and unsupported ones **0.0009 to 0.0221**. That is two orders of magnitude, so a threshold anywhere in the middle works." }
      ] },

    { t: "callout", kind: "insight", title: "And the three-way output classifies the hallucination for free",
      body: [
        { t: "p", text: "11.1 defines intrinsic (contradicts the source) against extrinsic (adds what the source omits). The entailment model separates them without being asked: the invented refund window reads **contradiction 0.9810**, and the fabricated citation reads **neutral 0.9857**." },
        { t: "p", text: "That is a classification the reference defines in its glossary and never connects to its own detector. It matters because the fixes differ \u2014 a contradiction means the model overrode its context, so instruct precedence and lower the temperature; a neutral means it invented where the context was silent, so the abstention path is the lever." },
        { t: "p", text: "One case is worth flagging as genuinely uncertain: \u201csupport is available 24/7 worldwide\u201d against a context saying business hours reads **neutral 0.5800, contradiction 0.3980**. It is arguably intrinsic and the model is unsure, and a rule keyed on `contradiction > 0.5` would have missed it entirely. All three of my rules catch it, because all three test for the *absence* of entailment rather than the presence of contradiction \u2014 which is the safer formulation." }
      ] },

    { t: "h2", n: "02", id: "cosine", text: "Why not just use embeddings?",
      sub: "The measurement that settles it" },

    { t: "callout", kind: "trap", title: "The invented policy scores HIGHER than the true one",
      body: [
        { t: "p", text: "Cosine similarity between context and claim is the obvious cheap substitute for `entails`. Measured on the same claim set: supported claims span **0.4679 to 0.7982** and unsupported ones span **0.0503 to 0.8108**. The ranges overlap completely, so **no threshold separates them**." },
        { t: "p", text: "And the single highest-scoring claim is a hallucination. \u201cYou have 30 days to return opened software\u201d scores **0.8108** against the true \u201c14 days, unopened\u201d claim\u2019s **0.7982** \u2014 because the two differ by a *number* and a *negation*, and an embedding is nearly blind to both. 6.4 found the same blindness from the retrieval side." },
        { t: "p", text: "The best achievable accuracy over any cosine threshold is **86% against a 57% majority-class baseline**, which sounds tolerable until you notice which case it gets wrong. It is the on-topic fabrication \u2014 the one that matters." }
      ] },

    { t: "callout", kind: "warn", title: "Similarity catches the hallucinations you would have noticed anyway",
      body: [
        { t: "p", text: "The one unsupported claim cosine flags easily is the fake citation, at **0.0503**. But it catches it for being *off-topic*, not for being unsupported \u2014 a fabricated paper in a document about refunds is lexically unrelated to everything around it." },
        { t: "p", text: "So the failure profile is exactly inverted from what you want. Similarity reliably detects a hallucination that wandered off the subject, which a human reviewer would also spot in a second, and reliably passes a hallucination that stayed on the subject and changed a number, which is the one nobody catches by eye." },
        { t: "p", text: "That is the general shape of 9.17\u2019s warning about metric choice: a metric defined over the wrong thing moves in the right direction while the product gets worse. Here the wrong thing is topical relatedness standing in for logical support." }
      ] },

    { t: "h2", n: "03", id: "judge", text: "Signal 2 \u2014 An LLM judge",
      sub: "Better calibrated, and it has to run somewhere else" },

    { t: "code", lang: "python", title: "The groundedness grader", code: `JUDGE_PROMPT = """You are a strict grader. Given CONTEXT and an ANSWER,
decide if EVERY claim in the ANSWER is supported by the CONTEXT.
Reply with JSON: {{"supported": true|false, "unsupported_claims": [...]}}.
Do not use outside knowledge.

CONTEXT:
{context}

ANSWER:
{answer}"""

def llm_groundedness(answer, context, call_llm):
    raw = call_llm(JUDGE_PROMPT.format(context=context, answer=answer))
    return json.loads(raw)   # validate with Pydantic in real code`,
      hl: [4],
      caption: "\u201cDo not use outside knowledge\u201d is the load-bearing line \u2014 without it the judge scores factuality, not faithfulness." },

    { t: "callout", kind: "tradeoff", title: "I assumed NLI would be the cheap option in the request path. Measured, it is not",
      body: [
        { t: "p", text: "Timed on CPU, `roberta-large-mnli` takes **739 ms per claim** batched, so a four-claim answer costs **2,957 ms** \u2014 and 10.11 measured an LLM judge call at about 1,100 ms. **The NLI gate is 2.7x slower than the judge it was meant to replace.**" },
        { t: "p", text: "The model is 355M parameters and every claim is a separate forward pass over the whole context, so cost scales with claims \u00d7 context length. To stay inside a 10% latency budget on a 3,134 ms request you would need 78 ms per claim; measured, we are **9x over**." },
        { t: "p", text: "So the conclusion is not \u2018use a judge instead\u2019. It is that **neither belongs in the request path at these latencies** \u2014 a blocking faithfulness gate needs a GPU or a small NLI model, and otherwise it has to run asynchronously, which is 10.11\u2019s rule for judges and applies here for the same reason. 11.5 takes that constraint seriously." }
      ] },

    { t: "h2", n: "04", id: "consistency", text: "Signal 3 \u2014 Self-consistency",
      sub: "When there is no context to check against" },

    { t: "code", lang: "python", title: "Agreement as a proxy for confidence", code: `def self_consistency(question, call_llm, n=5):
    answers = [call_llm(question, temperature=0.7) for _ in range(n)]
    from collections import Counter
    norm = [a.strip().lower() for a in answers]
    top, count = Counter(norm).most_common(1)[0]
    return {
        "agreement": count / n,            # 1.0 = all agree, 0.2 = all differ
        "consensus": top,
        "likely_hallucination": count / n < 0.6,
    }`,
      hl: [5],
      caption: "If 5 samples give 5 different \u201cfacts\u201d, the model is guessing." },

    { t: "callout", kind: "insight", title: "It is the only one of the three that works closed-book",
      body: [
        { t: "p", text: "Entailment and a judge both need a context to check against. Self-consistency needs nothing but the question, which makes it the only available signal when there is no retrieval \u2014 and 11.2\u2019s decision flow routes closed-book questions here for exactly that reason." },
        { t: "p", text: "The exact-string normalisation is its weakness and the reference says so implicitly by using `.strip().lower()`. Five answers that agree in substance and differ in wording count as five disagreements, so on free-form prose it reports spurious uncertainty. It works well on short factual answers \u2014 a number, a name, a label \u2014 and badly on paragraphs." },
        { t: "p", text: "And 2.9 already measured its cost profile: self-consistency at n = 21 with a per-sample accuracy of 0.30 gives 0.0264, eleven times *worse* than one sample. Agreement is a confidence signal, not an accuracy improvement \u2014 it tells you the model is sure, which is not the same as right." }
      ] },

    { t: "viz", title: "Three signals, and what each can see", caption: "Measured: NLI separates by two orders of magnitude; cosine does not separate at all.",
      svg: `<svg viewBox="0 0 760 320" width="100%" role="img" aria-label="NLI entailment versus cosine similarity on supported and unsupported claims">
  <text x="16" y="20" class="s-label">NLI ENTAILMENT &#8212; SEPARABLE AT 0.505</text>
  <line x1="60" y1="60" x2="700" y2="60" stroke="var(--line)" stroke-width="1.2"/>
  <text x="60" y="78" text-anchor="middle" class="s-mono" style="font-size:8px">0.0</text>
  <text x="700" y="78" text-anchor="middle" class="s-mono" style="font-size:8px">1.0</text>
  <rect x="60" y="48" width="14" height="24" rx="2" class="s-fill" style="stroke:var(--crit)" stroke-width="1.6"/>
  <text x="80" y="44" class="s-mono" style="font-size:8px;fill:var(--crit)">unsupported 0.0009-0.0221</text>
  <rect x="693" y="48" width="10" height="24" rx="2" class="s-fill" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="560" y="44" class="s-mono" style="font-size:8px;fill:var(--good)">supported 0.9888-0.9931</text>
  <line x1="383" y1="40" x2="383" y2="80" stroke="var(--accent)" stroke-width="1.4" stroke-dasharray="3 3"/>
  <text x="383" y="94" text-anchor="middle" class="s-mono" style="font-size:8px;fill:var(--accent)">any threshold here works</text>

  <text x="16" y="124" class="s-label">COSINE SIMILARITY &#8212; NOT SEPARABLE</text>
  <line x1="60" y1="164" x2="700" y2="164" stroke="var(--line)" stroke-width="1.2"/>
  <text x="60" y="182" text-anchor="middle" class="s-mono" style="font-size:8px">0.0</text>
  <text x="700" y="182" text-anchor="middle" class="s-mono" style="font-size:8px">1.0</text>
  <rect x="359" y="146" width="212" height="12" rx="2" class="s-fill" style="stroke:var(--good)" stroke-width="1.5"/>
  <text x="575" y="156" class="s-mono" style="font-size:8px;fill:var(--good)">supported 0.4679-0.7982</text>
  <rect x="92" y="162" width="427" height="12" rx="2" class="s-fill" style="stroke:var(--crit)" stroke-width="1.5"/>
  <text x="96" y="190" class="s-mono" style="font-size:8px;fill:var(--crit)">unsupported 0.0503-0.8108 &#8212; OVERLAPS THE WHOLE SUPPORTED RANGE</text>

  <rect x="16" y="202" width="728" height="46" rx="4" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.8"/>
  <text x="28" y="220" class="s-mono" style="font-size:10px;fill:var(--crit)">THE CASE THAT DECIDES IT</text>
  <text x="28" y="236" class="s-mono" style="font-size:9px">true claim  &#8220;14 days, unopened&#8221;  cosine 0.7982 &#183; INVENTED  &#8220;30 days, opened&#8221;  cosine 0.8108</text>
  <text x="520" y="220" class="s-sub">differs by a number and a negation</text>
  <text x="28" y="246" class="s-sub">an embedding is nearly blind to both &#8212; NLI gives entailment 0.0093, contradiction 0.9810</text>

  <rect x="16" y="256" width="356" height="56" rx="4" class="s-fill-bg" style="stroke:var(--warn)" stroke-width="1.4"/>
  <text x="28" y="274" class="s-mono" style="font-size:9px;fill:var(--warn)">AND THE LATENCY SURPRISE</text>
  <text x="28" y="290" class="s-mono" style="font-size:8px">NLI gate   739 ms/claim, 2,957 ms for 4</text>
  <text x="28" y="304" class="s-mono" style="font-size:8px">LLM judge  ~1,100 ms &#8212; NLI is 2.7x SLOWER</text>

  <rect x="388" y="256" width="356" height="56" rx="4" class="s-fill-bg" style="stroke:var(--violet)" stroke-width="1.4"/>
  <text x="400" y="274" class="s-mono" style="font-size:9px;fill:var(--violet)">SELF-CONSISTENCY &#8212; THE CLOSED-BOOK ONE</text>
  <text x="400" y="290" class="s-mono" style="font-size:8px">needs no context at all</text>
  <text x="400" y="304" class="s-sub">confidence, not accuracy &#8212; and exact-match normalisation</text>
</svg>` },

    { t: "exercise", kind: "build", title: "Score faithfulness with real entailment, then try to cheat", difficulty: "advanced", minutes: 40,
      body: "Run the faithfulness scorer with a real NLI model over a context and a set of claims including its own three production scenarios. Then substitute cosine similarity for entailment and check whether any threshold separates supported from unsupported. Finally reproduce the 0.75 worked example.",
      requirements: [
        "A real NLI model driving `entails`, with the three-way output recorded",
        "Three decision rules compared on the same claims",
        "The four-sentence worked example scored",
        "Cosine substituted and the two ranges compared for separability",
        "A statement of which signal catches which kind of hallucination"
      ],
      hint: "Test for the absence of entailment rather than the presence of contradiction. An extrinsic hallucination reads as neutral, so a contradiction-based rule misses the whole extrinsic category.",
      solution: { lang: "python", title: "faithfulness with NLI, against the cosine shortcut", code: `import os, re
os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification

NLI = "roberta-large-mnli"
tok = AutoTokenizer.from_pretrained(NLI)
mdl = AutoModelForSequenceClassification.from_pretrained(NLI).eval()

@torch.no_grad()
def nli(premise, hypothesis):
    x = tok(premise, hypothesis, return_tensors="pt", truncation=True, max_length=512)
    p = torch.softmax(mdl(**x).logits[0], -1).numpy()
    lab = {v.lower(): k for k, v in mdl.config.id2label.items()}
    return {"contradiction": float(p[lab["contradiction"]]),
            "neutral":       float(p[lab["neutral"]]),
            "entailment":    float(p[lab["entailment"]])}

# ---- the two functions, unchanged
def split_claims(answer):
    return [s.strip() for s in re.split(r"(?<=[.!?])\\s+", answer) if s.strip()]

def faithfulness_score(answer, context, entails):
    claims = split_claims(answer)
    if not claims:
        return {"score": 1.0, "unsupported": []}
    unsupported = [c for c in claims if not entails(premise=context, hypothesis=c)]
    return {"score": round(1 - len(unsupported) / len(claims), 3),
            "n_claims": len(claims), "unsupported": unsupported}

CONTEXT = (
    "Returns: unopened software may be returned within 14 days of purchase for a "
    "full refund. Opened software is not eligible for return. "
    "Termination: either party may terminate this agreement with 30 days written "
    "notice. No termination fee applies. "
    "Support: standard support covers business hours in the customer's region."
)

CLAIMS = [
    ("You have 14 days to return unopened software for a full refund.", True,  "supported"),
    ("Opened software cannot be returned.",                             True,  "supported"),
    ("You have 30 days to return opened software for a full refund.",   False, "SCENARIO 1 invented policy"),
    ("According to Smith et al. (2021) the effect size was 0.42.",      False, "SCENARIO 2 fake citation"),
    ("There is a termination penalty of $50,000.",                      False, "SCENARIO 3 confabulation"),
    ("Either party may terminate with 30 days written notice.",         True,  "supported"),
    ("Support is available 24/7 worldwide.",                            False, "contradicts the context"),
]

print("=" * 78)
print("A -- NLI ENTAILMENT ON EACH CLAIM")
print("=" * 78)
print("%-54s %7s %7s %7s %5s" % ("claim", "entail", "neutr", "contra", "truth"))
probs = []
for text, supported, note in CLAIMS:
    p = nli(CONTEXT, text)
    probs.append(p)
    print("%-54s %7.4f %7.4f %7.4f %5s"
          % (text[:54], p["entailment"], p["neutral"], p["contradiction"],
             "OK" if supported else "BAD"))

print()
print("-- the decision rule matters, so try three --")
RULES = {
    "entailment > 0.5":           lambda p: p["entailment"] > 0.5,
    "argmax == entailment":       lambda p: p["entailment"] == max(p.values()),
    "entailment > contradiction": lambda p: p["entailment"] > p["contradiction"],
}
for name, rule in RULES.items():
    pred = [rule(p) for p in probs]
    acc = sum(1 for q, (_, s, _) in zip(pred, CLAIMS) if q == s)
    fp = sum(1 for q, (_, s, _) in zip(pred, CLAIMS) if q and not s)
    fn = sum(1 for q, (_, s, _) in zip(pred, CLAIMS) if not q and s)
    print("  %-28s accuracy %d/%d   false-pass %d  false-flag %d"
          % (name, acc, len(CLAIMS), fp, fn))

print()
print("=" * 78)
print("B -- THE REFERENCE'S WORKED EXAMPLE, REPRODUCED WITH A REAL MODEL")
print("=" * 78)
print("the worked example: 4 sentences, 3 supported, 1 invented -> 0.75")
print()
ANSWER = (
    "Either party may terminate this agreement with 30 days written notice. "
    "Unopened software may be returned within 14 days for a full refund. "
    "Opened software is not eligible for return. "
    "There is also a termination penalty of $50,000."
)
for rule_name, rule in RULES.items():
    def entails(premise, hypothesis, _r=rule):
        return _r(nli(premise, hypothesis))
    f = faithfulness_score(ANSWER, CONTEXT, entails)
    print("rule %-28s score %.3f  (%d claims, %d unsupported)"
          % (rule_name, f["score"], f["n_claims"], len(f["unsupported"])))
    for u in f["unsupported"]:
        print("      flagged: %s" % u)

print()
print("=" * 78)
print("C -- NLI AGAINST THE COSINE SUBSTITUTE, SIDE BY SIDE")
print("=" * 78)
from sentence_transformers import SentenceTransformer
sm = SentenceTransformer("all-MiniLM-L6-v2")
vc = sm.encode([CONTEXT], normalize_embeddings=True)[0]
vcl = sm.encode([c[0] for c in CLAIMS], normalize_embeddings=True)
cos = vcl @ vc

print("%-50s %7s %7s %5s" % ("claim", "cosine", "entail", "truth"))
for (text, supported, note), c, p in zip(CLAIMS, cos, probs):
    print("%-50s %7.4f %7.4f %5s"
          % (text[:50], c, p["entailment"], "OK" if supported else "BAD"))

sup_c = [c for c, (_, s, _) in zip(cos, CLAIMS) if s]
uns_c = [c for c, (_, s, _) in zip(cos, CLAIMS) if not s]
sup_e = [p["entailment"] for p, (_, s, _) in zip(probs, CLAIMS) if s]
uns_e = [p["entailment"] for p, (_, s, _) in zip(probs, CLAIMS) if not s]

print()
print("%-12s %-22s %-22s %s" % ("signal", "supported range", "unsupported range", "separable?"))
for name, sup, uns in (("cosine", sup_c, uns_c), ("NLI entail", sup_e, uns_e)):
    sep = "YES at %.3f" % ((max(uns) + min(sup)) / 2) if max(uns) < min(sup) else "NO -- overlap"
    print("%-12s %-22s %-22s %s"
          % (name, "%.4f .. %.4f" % (min(sup), max(sup)),
             "%.4f .. %.4f" % (min(uns), max(uns)), sep))

print()
print("the case that decides it -- the invented policy:")
print("  context says  : unopened, 14 days")
print("  claim says    : opened, 30 days")
print("  cosine        : %.4f  (HIGHER than the true claim's %.4f)" % (cos[2], cos[0]))
print("  NLI entailment: %.4f  contradiction %.4f" % (probs[2]["entailment"], probs[2]["contradiction"]))
print()
print("and the one similarity gets right for the wrong reason:")
print("  fake citation : cosine %.4f -- caught only because it is OFF-TOPIC" % cos[3])
print("  NLI entailment: %.4f" % probs[3]["entailment"])
print()
print("so cosine catches the hallucinations you would have noticed anyway and")
print("misses the on-topic ones you would not. that is the wrong way round.")`,
        out: `==============================================================================
A -- NLI ENTAILMENT ON EACH CLAIM
==============================================================================

claim                                                   entail   neutr  contra truth
You have 14 days to return unopened software for a ful  0.9931  0.0044  0.0025    OK
Opened software cannot be returned.                     0.9888  0.0061  0.0051    OK
You have 30 days to return opened software for a full   0.0093  0.0097  0.9810   BAD
According to Smith et al. (2021) the effect size was 0  0.0013  0.9857  0.0130   BAD
There is a termination penalty of $50,000.              0.0009  0.0094  0.9898   BAD
Either party may terminate with 30 days written notice  0.9923  0.0069  0.0008    OK
Support is available 24/7 worldwide.                    0.0221  0.5800  0.3980   BAD

-- the decision rule matters, so try three --
  entailment > 0.5             accuracy 7/7   false-pass 0  false-flag 0
  argmax == entailment         accuracy 7/7   false-pass 0  false-flag 0
  entailment > contradiction   accuracy 7/7   false-pass 0  false-flag 0
==============================================================================
B -- THE REFERENCE'S WORKED EXAMPLE, REPRODUCED WITH A REAL MODEL
==============================================================================

the worked example: 4 sentences, 3 supported, 1 invented -> 0.75

rule entailment > 0.5             score 0.750  (4 claims, 1 unsupported)
      flagged: There is also a termination penalty of $50,000.
rule argmax == entailment         score 0.750  (4 claims, 1 unsupported)
      flagged: There is also a termination penalty of $50,000.
rule entailment > contradiction   score 0.750  (4 claims, 1 unsupported)
      flagged: There is also a termination penalty of $50,000.
==============================================================================
C -- NLI AGAINST THE COSINE SUBSTITUTE, SIDE BY SIDE
==============================================================================

Loading weights:   0%|          | 0/103 [00:00<?, ?it/s]
Loading weights:  46%|████▌     | 47/103 [00:00<00:00, 462.61it/s]Loading weights: 100%|██████████| 103/103 [00:00<00:00, 705.81it/s]

claim                                               cosine  entail truth
You have 14 days to return unopened software for a  0.7982  0.9931    OK
Opened software cannot be returned.                 0.5997  0.9888    OK
You have 30 days to return opened software for a f  0.8108  0.0093   BAD
According to Smith et al. (2021) the effect size w  0.0503  0.0013   BAD
There is a termination penalty of $50,000.          0.3973  0.0009   BAD
Either party may terminate with 30 days written no  0.4679  0.9923    OK
Support is available 24/7 worldwide.                0.3612  0.0221   BAD

signal       supported range        unsupported range      separable?
cosine       0.4679 .. 0.7982       0.0503 .. 0.8108       NO -- overlap
NLI entail   0.9888 .. 0.9931       0.0009 .. 0.0221       YES at 0.505

the case that decides it -- the invented policy:
  context says  : unopened, 14 days
  claim says    : opened, 30 days
  cosine        : 0.8108  (HIGHER than the true claim's 0.7982)
  NLI entailment: 0.0093  contradiction 0.9810

and the one similarity gets right for the wrong reason:
  fake citation : cosine 0.0503 -- caught only because it is OFF-TOPIC
  NLI entailment: 0.0013

so cosine catches the hallucinations you would have noticed anyway and
misses the on-topic ones you would not. that is the wrong way round.`,
        notes: [
          { t: "p", text: "**The reference\u2019s 0.750 reproduces exactly**, under all three decision rules, and the detector names the offending sentence. That is the whole method validated against a real model rather than asserted: four claims, one unsupported, 1 \u2212 1/4." },
          { t: "p", text: "**The NLI separation is two orders of magnitude** \u2014 supported 0.9888 to 0.9931, unsupported 0.0009 to 0.0221 \u2014 which is why all three decision rules give 7/7. I would not generalise \u2018the rule does not matter\u2019 from seven claims, but the margin here is large enough that threshold-tuning is not the interesting problem." },
          { t: "p", text: "**The cosine substitute fails, and fails in the worst direction.** The ranges overlap completely, and the single highest-scoring claim is the invented refund policy at 0.8108 against the true claim\u2019s 0.7982. The two differ by a number and a negation, and an embedding is nearly blind to both \u2014 so an on-topic fabrication is maximally similar to the truth it replaces." },
          { t: "p", text: "**The one claim cosine does catch is the fake citation at 0.0503**, and it catches it for being off-topic rather than unsupported. So the failure profile is inverted: similarity flags the hallucination a human would spot instantly and passes the one nobody notices by eye." },
          { t: "p", text: "**Watch the \u201c24/7 support\u201d claim** \u2014 neutral 0.5800, contradiction 0.3980. The model is genuinely unsure whether \u2018business hours\u2019 contradicts \u201824/7\u2019, and a rule keyed on `contradiction > 0.5` would have passed it. All three rules here test for the *absence* of entailment, which is why they catch it, and that is the safer formulation." },
          { t: "p", text: "The fake citation reading **neutral 0.9857** while the invented policy reads **contradiction 0.9810** is the intrinsic/extrinsic split falling out of the detector for free \u2014 a classification the reference defines in its glossary and never links to its own method." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "Faithfulness is the fraction of claims the context entails, scored per claim so the offending sentence is named. The reference\u2019s 0.75 reproduces exactly on a real NLI model, with supported claims near 0.99 and unsupported near 0.00 \u2014 and the three-way output classifies intrinsic against extrinsic for nothing." },
        { t: "p", text: "Do not substitute cosine similarity: the ranges overlap and the invented policy outscores the true claim, because similarity measures relatedness and hallucinations are on-topic. And test for the absence of entailment, not the presence of contradiction, because extrinsic hallucinations read as neutral." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cHow would you detect hallucination automatically?\u201d**" },
        { t: "p", text: "Three complementary signals. Entailment against the retrieved context, which is the main one for RAG; an LLM judge, which is better calibrated and more expensive; and self-consistency, which is the only one that works closed-book because it needs no context at all." },
        { t: "p", text: "For entailment the method is a loop and a division: split the answer into claims, ask whether the context entails each one, and faithfulness is one minus the unsupported fraction. I would score per claim rather than per answer, because a whole-answer verdict tells you something is wrong and the per-claim version names the sentence \u2014 which is what makes dropping or regenerating it possible. When I ran this on a real NLI model, supported claims came out between 0.9888 and 0.9931 and unsupported between 0.0009 and 0.0221, so the signal is extremely clean and threshold tuning is not the hard part." },
        { t: "p", text: "The decision rule deserves one specific piece of care. Entailment models output three classes, and the rule should test for the *absence* of entailment rather than the presence of contradiction \u2014 because an extrinsic hallucination, where the source is simply silent, reads as *neutral*. I had a case where \u201824/7 support\u2019 against a \u2018business hours\u2019 context came back neutral 0.58 and contradiction 0.40, so a contradiction-based rule would have passed it." },
        { t: "p", text: "That same three-way output gives you a free classification, which I would use. Contradiction means the model overrode its context, so the fix is prompt precedence and a lower temperature. Neutral means it invented where the context was silent, so the fix is the abstention path. Measured, an invented refund window read contradiction 0.98 and a fabricated citation read neutral 0.99." },
        { t: "p", text: "The thing I would warn hardest about is the cheap substitute. Using embedding similarity instead of entailment looks reasonable and fails in the worst possible direction: the ranges overlap entirely, and the highest-scoring claim in my set was the invented policy at 0.81, above the true claim at 0.80. They differ by a number and a negation and embeddings are nearly blind to both. The only unsupported claim cosine caught easily was the fake citation, and it caught that for being off-topic \u2014 so similarity flags what a human would spot instantly and passes what nobody notices." },
        { t: "p", text: "One practical finding that surprised me: I assumed NLI would be the cheap in-path option. Timed on CPU, a large NLI model took 739 milliseconds per claim, so a four-claim answer cost about three seconds \u2014 2.7 times slower than an LLM judge call. So neither belongs in the request path at those latencies. A blocking gate needs a GPU or a small NLI model, and otherwise the check runs asynchronously." }
      ] }
  ],

  takeaways: [
    "**Faithfulness = 1 \u2212 unsupported claims / total claims**, scored per claim so the offending sentence is named.",
    "**The 0.75 reproduces exactly** on `roberta-large-mnli`, under all three decision rules tried.",
    "**NLI separates by two orders of magnitude**: supported 0.9888\u20130.9931, unsupported 0.0009\u20130.0221.",
    "**Test for the absence of entailment, not the presence of contradiction** \u2014 extrinsic hallucinations read as neutral.",
    "**Measured: a \u201c24/7 support\u201d claim read neutral 0.5800, contradiction 0.3980**, so a contradiction rule would have passed it.",
    "**The three-way output classifies intrinsic against extrinsic for free** \u2014 contradiction 0.9810 against neutral 0.9857.",
    "**Cosine similarity cannot substitute**: supported 0.4679\u20130.7982 against unsupported 0.0503\u20130.8108, fully overlapping.",
    "**The invented policy scored 0.8108, above the true claim's 0.7982** \u2014 it differs by a number and a negation.",
    "**Similarity catches off-topic fabrication and passes on-topic fabrication**, which is the wrong way round.",
    "**Measured: the NLI gate costs 739 ms per claim on CPU**, 2.7x slower than an LLM judge call.",
    "**So neither gate belongs in the request path** without a GPU or a small model \u2014 otherwise run it async.",
    "**Self-consistency is the only closed-book signal**, and its exact-match normalisation makes it poor on prose."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Why should the entailment decision rule test for the absence of entailment rather than the presence of contradiction?",
        options: [
          "Because contradiction scores are less reliable than entailment scores",
          "Because an extrinsic hallucination reads as neutral \u2014 the source is silent rather than contradictory \u2014 so a contradiction rule misses the whole category",
          "Because entailment and contradiction always sum to one",
          "Because neutral is only produced when the model is uncertain"
        ],
        answer: 1,
        why: "Extrinsic hallucinations add claims the context never mentions, so there is nothing to contradict and the model correctly returns neutral \u2014 measured at 0.9857 for a fabricated citation. A rule keyed on contradiction above a threshold would pass every claim of that kind. The measured borderline case makes it concrete: a \"24/7 support\" claim against a \"business hours\" context came back neutral 0.5800 and contradiction 0.3980, which an absence-of-entailment rule flags and a contradiction rule does not." },

      { stem: "What happens when cosine similarity is substituted for entailment in a faithfulness score?",
        options: [
          "It works slightly worse but remains usable with a tuned threshold",
          "The supported and unsupported ranges overlap completely, and the highest-scoring claim is a hallucination",
          "It becomes more sensitive to contradictions and less to omissions",
          "It fails only on claims shorter than one sentence"
        ],
        answer: 1,
        why: "Measured, supported claims spanned 0.4679 to 0.7982 and unsupported ones 0.0503 to 0.8108, so no threshold separates them \u2014 and the invented refund policy scored 0.8108 against the true claim's 0.7982. The two differ by a number and a negation, which embeddings barely register, so an on-topic fabrication is maximally similar to the truth it displaces. Best achievable accuracy over any threshold was 86% against a 57% majority baseline, and the cases it gets wrong are exactly the ones that matter." },

      { stem: "Cosine flags the fake citation easily at 0.0503. Why is that not reassuring?",
        options: [
          "Because the score is too close to zero to be meaningful",
          "Because it catches it for being off-topic rather than unsupported \u2014 so it detects what a human would spot instantly and misses what nobody notices",
          "Because fake citations are rare in production",
          "Because the same claim scores well under entailment"
        ],
        answer: 1,
        why: "A fabricated paper in a document about refunds is lexically unrelated to everything around it, so low similarity reflects topic drift rather than any judgement about support. That makes the failure profile inverted: the detector is reliable on hallucinations that wandered off the subject and unreliable on those that stayed on it and changed a number \u2014 which is the harder, more dangerous case and the reason entailment is needed." },

      { stem: "A measured NLI gate costs 739 ms per claim on CPU against roughly 1,100 ms for an LLM judge call. What follows?",
        options: [
          "Use the judge, since it is faster and better calibrated",
          "Neither belongs in the request path at those latencies \u2014 a blocking gate needs a GPU or a small NLI model, otherwise score asynchronously",
          "Batch the NLI calls, which removes the latency problem",
          "Reduce the number of claims by scoring per paragraph instead"
        ],
        answer: 1,
        why: "A four-claim answer costs about three seconds of NLI, and staying inside a 10% budget on a 3,134 ms request would need 78 ms per claim \u2014 roughly nine times faster than measured. Batching helped only 1.25x because each claim is still a forward pass over the whole context. Scoring per paragraph would discard the per-claim granularity that makes the result actionable, so the real options are faster hardware, a smaller model, or asynchronous scoring." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Detecting hallucination from scratch",
    questions: [
      { level: "advanced",
        q: "Implement a faithfulness score.",
        strong: "A strong answer is per-claim and names the entails function as the hard part.",
        answer: [
          { t: "p", text: "Split the answer into claims, ask for each whether the context entails it, and faithfulness is one minus the unsupported fraction. That is a loop and a division \u2014 the entire difficulty is in the `entails` function." },
          { t: "p", text: "Per claim rather than per answer, because a whole-answer verdict says \u2018unsupported\u2019 and leaves you hunting, while the per-claim version names the sentence. That granularity is what makes dropping it, flagging it or regenerating just that part possible." },
          { t: "p", text: "For `entails` I would use an NLI model and test for the *absence* of entailment rather than the presence of contradiction, because extrinsic hallucinations read as neutral and a contradiction rule misses them." },
          { t: "p", text: "Sentence splitting is the weak point in the simple version. Production wants atomic claim extraction, because one sentence can carry two claims and a scorer that treats it as one unit will pass a sentence that is half true." }
        ] },

      { level: "core",
        q: "Could you use embedding similarity instead of an NLI model?",
        strong: "A strong answer says no and gives the measurement.",
        answer: [
          { t: "p", text: "No, and it fails in the worst direction. When I measured it, supported claims spanned 0.47 to 0.80 and unsupported ones 0.05 to 0.81 \u2014 fully overlapping, so no threshold separates them." },
          { t: "p", text: "The decisive case was an invented refund policy scoring 0.81, higher than the true claim at 0.80. The two differ by a number and a negation, and an embedding is nearly blind to both." },
          { t: "p", text: "The one unsupported claim cosine caught easily was a fabricated citation at 0.05 \u2014 but it caught that for being off-topic, not unsupported. So the detector is good at hallucinations a human would spot in a second and bad at the ones nobody notices." },
          { t: "p", text: "Which is the general trap: similarity measures topical relatedness, and a hallucination about the right topic is maximally related to it. Support is a logical relation and needs a model trained to judge it." }
        ] },

      { level: "core",
        q: "What do you do when there is no context to check against?",
        strong: "A strong answer reaches for self-consistency and bounds the claim.",
        answer: [
          { t: "p", text: "Self-consistency. Sample the same question several times at a non-zero temperature and look at agreement \u2014 if five samples give five different facts, the model is guessing. It is the only one of the three signals that works closed-book, because it needs nothing but the question." },
          { t: "p", text: "I would be careful about what it measures though. Agreement is a confidence signal, not an accuracy improvement \u2014 it tells you the model is sure, which is not the same as right. A confidently memorised wrong answer agrees with itself perfectly." },
          { t: "p", text: "And the usual implementation normalises by exact string match, so five answers that agree in substance and differ in wording count as five disagreements. It works on short factual answers \u2014 a number, a name, a label \u2014 and reports spurious uncertainty on prose." },
          { t: "p", text: "It is also not free: n samples cost n times the call. So I would reserve it for high-uncertainty closed-book queries rather than running it everywhere, and prefer retrieval where retrieval is possible." }
        ] }
    ]
  }
});
