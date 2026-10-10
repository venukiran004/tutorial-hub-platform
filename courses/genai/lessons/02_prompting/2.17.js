EC.receiveLesson({
  id: "2.17",

  lede: "A prompt is code that changes behaviour, is edited by people who do not ship code, and has no type checker. Production prompt management is the discipline of treating it accordingly: versioned, tested, deployed with a rollback, and logged with every response so that a quality question six weeks later has an answer. The common form gives a checklist; this lesson is about which parts of it are load-bearing and which are ceremony, and the one record that makes everything else possible.",

  objectives: [
    "Version prompts so a change is reviewable and revertible",
    "Record the prompt version on every response, and say why that is the foundational step",
    "Design a rollout that can be stopped",
    "Decide when a registry is worth building over files in git",
    "Attribute a quality change to a prompt version after the fact"
  ],

  prerequisites: ["2.12", "1.7"],

  blocks: [

    { t: "h2", n: "01", id: "the-record", text: "Record the version on every response",
      sub: "The one thing that makes everything else possible" },

    { t: "p", text: "Of the seven-item production checklist, one item is a precondition for the other six: knowing which prompt produced which output. Without it, a quality change cannot be attributed, a rollback cannot be verified, and an A/B test has no data (2.12)." },

    { t: "code", lang: "python", title: "record.py", code: `@dataclass(frozen=True)
class Prompt:
    name: str
    version: str                 # a content hash, not a hand-maintained number
    template: str

    @classmethod
    def load(cls, name):
        text = (PROMPT_DIR / f"{name}.txt").read_text()
        return cls(name, hashlib.sha256(text.encode()).hexdigest()[:12], text)

def answer(question, *, prompt_name="summarise"):
    p = Prompt.load(prompt_name)
    r = call(p.template.format(question=question))

    log.info("llm", extra={
        "prompt_name":    p.name,
        "prompt_version": p.version,      # <- the foundational field
        "model":          r.model,
        "fingerprint":    r.system_fingerprint,    # 1.7
        "tokens":         r.usage.total_tokens,
    })
    return r`,
      hl: [9, 17],
      caption: "A content hash rather than a version number, because a number has to be remembered to increment and a hash cannot be forgotten. Twelve hex characters is enough to be unique and short enough to read in a log." },

    { t: "callout", kind: "insight", title: "A hash beats a number because it cannot drift",
      body: [
        { t: "p", text: "A hand-maintained `v3` is a claim about the file, and claims go stale: someone edits the template and does not bump the number, and now two different prompts are logged as v3. Every attribution after that point is wrong in a way nothing will reveal." },
        { t: "p", text: "A content hash is derived from the file, so it is correct by construction. The cost is that it is not human-readable — which is why you keep both: a hash for correctness and a name plus a changelog entry for people." },
        { t: "p", text: "Record the model's `system_fingerprint` beside it (1.7). A quality change has two possible causes and you want to be able to rule one out without an investigation." }
      ] },

    { t: "h2", n: "02", id: "versioning", text: "Files in git, or a registry",
      sub: "The answer is files for longer than people expect" },

    { t: "table",
      head: ["", "Prompts as files in git", "A prompt registry"],
      rows: [
        ["Review", "Pull request, with a diff", "A UI, usually without one"],
        ["Rollback", "Revert and deploy", "A click"],
        ["Who can change it", "People who can ship code", "Anyone with access"],
        ["Change speed", "A deploy cycle", "Immediate"],
        ["Tied to code version", "**Yes** — the prompt and the parser that reads its output move together", "**No** — and this is the real trade"],
        ["Audit trail", "Git history, free", "Whatever the tool records"]
      ],
      caption: "The fifth row is the one that decides it. A registry decouples prompt changes from deploys, which is the feature and also the risk." },

    { t: "p", text: "The common list has LangSmith Hub, Promptflow and git, and notes that git \"works\". That is the right emphasis. Files in git give you review, history, rollback and atomicity with the code — for free, with no new system. The case for a registry arrives when **people who cannot deploy need to change prompts**, which is a real situation and is the only one that justifies it." },

    { t: "callout", kind: "trap", title: "A registry decouples the prompt from the code that parses its output",
      body: [
        { t: "p", text: "If a prompt lives in git, changing \"return three bullets\" to \"return JSON\" and updating the parser happen in one commit and deploy together. If it lives in a registry, someone can make the first change at 4pm on a Friday and the parser knows nothing about it." },
        { t: "p", text: "This is not hypothetical — it is the characteristic registry incident, and it is why a registry needs a validation step that a file does not: a changed prompt should be run against the golden set before it can be promoted, with the same gate the code path has." },
        { t: "p", text: "The honest summary: a registry is a deployment system for a thing that affects behaviour, so it needs the controls a deployment system has. Teams adopt them for the speed and inherit the obligation." }
      ] },

    { t: "h2", n: "03", id: "rollout", text: "A rollout you can stop",
      sub: "Percentage, a metric, and an automatic halt" },

    { t: "code", lang: "python", title: "rollout.py", code: `ROLLOUT = {"summarise": {"v_new": "a3f91c2b8e40", "percent": 10}}

def choose_version(name, user_id):
    r = ROLLOUT.get(name)
    if not r:
        return Prompt.load(name)
    # stable per user -- one person must not see two behaviours in a session
    bucket = int(hashlib.sha256(user_id.encode()).hexdigest(), 16) % 100
    return Prompt.load_version(name, r["v_new"]) if bucket < r["percent"] \\
           else Prompt.load(name)

# and the halt condition, evaluated continuously rather than reviewed weekly
def check_rollout(name):
    new, old = metrics_by_version(name, window="1h")
    if new.error_rate > old.error_rate * 1.5 or new.p95_latency > old.p95_latency * 2:
        halt(name)                       # back to 0% automatically
        alert("rollout halted: %s" % name)`,
      hl: [7, 8, 15, 16],
      caption: "Two things make this a rollout rather than a deploy: assignment is stable per user, and there is an automatic halt on a metric. A percentage without a halt is just a slower deploy." },

    { t: "p", text: "Note what the halt condition uses: error rate and latency, not quality. Quality takes longer to measure than an hour (2.12 measured how much longer), so the automatic halt catches the catastrophic cases and the quality decision is made deliberately, later, with enough data." },

    { t: "h2", n: "04", id: "the-checklist", text: "The checklist, rated",
      sub: "Which items are load-bearing" },

    { t: "table",
      head: ["Checklist item", "Verdict"],
      rows: [
        ["Version-controlled prompts, not hardcoded strings", "**Essential** — everything else depends on it"],
        ["A/B testing framework for new versions", "**Essential** at volume (2.12); overkill below it"],
        ["Evaluation suite, automated and human", "**Essential**, with 2.12's caveat about size"],
        ["Monitoring quality per prompt version", "**Essential** — and impossible without section 01"],
        ["Rollback capability", "**Essential**, and free if prompts are in git"],
        ["Cost tracking per prompt", "Useful — it is how you find the prompt that doubled in length"],
        ["Prompt injection defence", "Essential, and it is not in this lesson — it is 2.16, at the action boundary"],
        ["Rate limiting on prompt-heavy endpoints", "Ordinary API hygiene (1.16), not prompt management"]
      ],
      caption: "Five are load-bearing, one is useful, and two are good practice that belongs in other lessons." },

    { t: "callout", kind: "good", title: "The minimum that is worth having",
      body: [
        { t: "p", text: "**Prompts in files, loaded by name, hashed for a version.** An afternoon of work." },
        { t: "p", text: "**The version logged with every response.** One field, and it is what makes every later question answerable." },
        { t: "p", text: "**A golden set and a script that scores a version against it**, run before merge. 2.12 is the lesson about making it big enough to mean something." },
        { t: "p", text: "Everything beyond that — registry, rollout percentages, automatic halts — is justified by scale or by who needs to make changes. Starting with those three costs almost nothing and makes the rest optional rather than urgent." }
      ] },

    { t: "exercise", kind: "Challenge", title: "Attribute a quality change after the fact",
      difficulty: "core", minutes: 25,
      body: [
        { t: "p", text: "The test of prompt management is not whether it looks tidy — it is whether, six weeks after a quality complaint, you can say which change caused it." },
        { t: "p", text: "Build the attribution over a log of requests with versions attached, and find out what it takes." }
      ],
      requirements: [
        "Simulate 60 days of requests across three prompt versions and two model fingerprints, with one genuine quality drop",
        "Compute daily quality by prompt version and by fingerprint",
        "Identify the change point and attribute it to the prompt or the model",
        "Repeat the attribution with the prompt version field removed, and report what is knowable",
        "State the minimum set of logged fields for attribution to be possible"
      ],
      hint: "With both fields you can slice two ways and see which slice moves. With only one, a prompt change and a model change are indistinguishable.",
      solution: { lang: "python", title: "g217_ex.py",
        code: `import random
random.seed(11)

DAYS = 60
# prompt v2 ships on day 20 and is slightly worse; the model changes on day 40
def quality(day, pv, fp):
    base = 0.86
    if pv == "v2": base -= 0.04          # the real cause
    if fp == "fp2": base += 0.00         # the model change is neutral
    return min(1.0, max(0.0, random.gauss(base, 0.03)))

rows = []
for day in range(DAYS):
    pv = "v1" if day < 20 else "v2"
    fp = "fp1" if day < 40 else "fp2"
    for _ in range(50):
        rows.append((day, pv, fp, quality(day, pv, fp)))

def mean_by(key, value):
    xs = [q for d, pv, fp, q in rows if {"pv": pv, "fp": fp}[key] == value]
    return sum(xs) / len(xs)

print("by prompt version:   v1 %.4f   v2 %.4f"
      % (mean_by("pv", "v1"), mean_by("pv", "v2")))
print("by model fingerprint: fp1 %.4f  fp2 %.4f"
      % (mean_by("fp", "fp1"), mean_by("fp", "fp2")))
print()

# the change point, from daily means
daily = [sum(q for d, _, _, q in rows if d == day) / 50 for day in range(DAYS)]
drops = [(daily[d] - daily[d - 1], d) for d in range(1, DAYS)]
worst = min(drops)
print("largest single-day drop: %.4f at day %d" % (worst[0], worst[1]))
print()
print("without prompt_version logged, the same data gives only:")
print("  before day 40: %.4f   after: %.4f"
      % (sum(daily[:40]) / 40, sum(daily[40:]) / 20))
print("  -- which looks like a model change, and is not")`,
        out: `by prompt version:   v1 0.8607   v2 0.8199
by model fingerprint: fp1 0.8405  fp2 0.8195

largest single-day drop: -0.0468 at day 20

without prompt_version logged, the same data gives only:
  before day 40: 0.8405   after: 0.8195
  -- which looks like a model change, and is not`,
        notes: [
          { t: "p", text: "With both fields the attribution is unambiguous: slicing by prompt version shows **0.8607 against 0.8199**, a 4-point gap, while slicing by fingerprint shows 0.8405 against 0.8195 — a difference that is entirely an artefact of v2 being live for the whole fp2 period. The largest single-day drop lands at **day 20**, which is the prompt deploy, not day 40." },
          { t: "p", text: "Without `prompt_version` the last two lines are all you have, and they point at the wrong cause. The fingerprint changed on day 40, quality is lower after day 40, and the obvious conclusion — the provider changed the model — is wrong. A team would then spend a week on a migration investigation (12.4) for a regression that was their own prompt change twenty days earlier." },
          { t: "p", text: "The minimum set is therefore **prompt version, model, and `system_fingerprint`** on every response. Three fields, logged once, and the difference between an answerable question and a plausible wrong answer. Everything else in this lesson is refinement; this is the part that is not optional." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: the prompt change nobody could find",
      body: [
        { t: "p", text: "**Symptom.** A document-summarisation feature's user satisfaction fell about 12% over three weeks. No deploys had touched the summarisation code in that window, and the team spent eight days investigating the model provider — checking for a silent version update, comparing outputs, opening a support ticket." },
        { t: "p", text: "**What had happened.** A product manager had edited the summarisation prompt in the registry on day one of the window, shortening it to \"reduce verbosity\". The registry recorded who and when; the application logged neither the prompt version nor anything else that would connect a response to it." },
        { t: "p", text: "**Mechanism.** The registry's audit trail existed and was never consulted, because nothing connected a bad summary to a prompt version — the investigation started from the model because the model was the only thing anyone could see in the logs. The change was found on day eight by someone scrolling the registry's history for an unrelated reason." },
        { t: "p", text: "**Fix.** `prompt_version` and `system_fingerprint` logged on every response, which turned the next incident of this kind into a two-minute query. And a validation gate on the registry: a promoted prompt now runs against the golden set first, with the same bar the code path has. The durable lesson is that **a registry's audit trail is not attribution** — it records what changed, and attribution requires connecting that to what each response did, which only the application can do." }
      ] }
  ],

  takeaways: [
    "**Record the prompt version on every response.** It is the precondition for every other item on the checklist — attribution, rollback verification, A/B data.",
    "Use a **content hash rather than a hand-maintained number**: a number can be forgotten, after which two different prompts log as the same version and every attribution is silently wrong.",
    "Log `system_fingerprint` beside it (1.7). A quality change has two likely causes and you want to rule one out without an investigation.",
    "**Files in git work for longer than people expect** — review, history, rollback and atomicity with the parsing code, for free.",
    "The case for a registry is **people who cannot deploy needing to change prompts**. That is the only reason that justifies it, and it is a real one.",
    "**A registry decouples the prompt from the code that parses its output**, which is the feature and the risk. It therefore needs a validation gate that a file does not.",
    "A rollout needs **stable per-user assignment** and an **automatic halt on a metric**. A percentage without a halt is a slower deploy.",
    "Halt on error rate and latency, not quality — quality takes longer than an hour to measure (2.12), so the halt catches catastrophes and the quality decision is made later.",
    "Of the eight checklist items, **five are load-bearing**, one is useful, and two belong in other lessons.",
    "Measured: with prompt version logged, a 4-point regression attributes cleanly to a **day-20 prompt change** (0.8607 against 0.8199). **Without it, the same data points at a day-40 model change — the wrong cause.**",
    "The minimum is three fields — **prompt version, model, fingerprint** — and a registry's audit trail is not a substitute, because it records what changed and not what each response did."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Why use a content hash rather than a version number for a prompt?",
        options: ["It is shorter", "A number must be remembered to increment; a hash is correct by construction", "Hashes are faster to compare", "It makes rollback easier"],
        answer: 1,
        why: "A hand-maintained number is a claim about the file, and when someone edits the template without bumping it, two different prompts are logged as the same version — after which every attribution is wrong and nothing reveals it. A hash is derived from the content so it cannot drift. The cost is readability, which is why you keep a name and changelog alongside. Length and comparison speed are irrelevant at this scale, and rollback works the same either way." },

      { stem: "Quality drops 12% and nothing in the code deployed. Where do you look first?",
        options: ["The model provider, for a silent version change", "Prompt version changes — a registry lets prompts change without a deploy", "Infrastructure", "User behaviour"],
        answer: 1,
        why: "A registry decouples prompt changes from deploys, which is precisely why \"nothing deployed\" does not mean \"nothing changed\" — and the measured attribution shows how misleading the alternative is: without a prompt-version field, a regression caused by a day-20 prompt change presents as a day-40 model change. The provider is worth ruling out, which `system_fingerprint` does in seconds if it is logged. Eight days were spent on that investigation in the incident for want of one field." },

      { stem: "What should automatically halt a prompt rollout?",
        options: ["A quality score drop", "Error rate or latency exceeding a threshold", "Any user complaint", "Nothing — rollouts should be reviewed manually"],
        answer: 1,
        why: "Error rate and latency move within an hour and are unambiguous; quality takes far longer to measure at any useful resolution — 2.12 measured a 3-point difference as not significant even at n=1,000. So the automatic halt catches catastrophes and the quality decision is made deliberately with enough data. A single complaint is too noisy to automate on, and a rollout with no automatic halt is a slower deploy rather than a rollout." },

      { stem: "Your registry records who changed each prompt and when. Is that attribution?",
        options: ["Yes — it is a complete audit trail", "No — attribution needs each response connected to the version that produced it", "Only if changes are rare", "Only with a human reviewer"],
        answer: 1,
        why: "An audit trail records what changed; attribution requires knowing what each response did, which only the application can log. Without that connection an investigation starts from whatever *is* in the logs — usually the model — and in the incident the registry history was correct, complete, and not consulted for eight days because nothing linked a bad summary to it. Rarity of changes does not help: one unattributed change is enough to mislead an investigation." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "A good systems question, because the answer is mostly about one logged field rather than about tooling.",
    questions: [
      { level: "core",
        q: "How would you manage prompts in production?",
        strong: "A strong answer leads with the logged version rather than with tooling, and resists over-building.",
        answer: [
          { t: "p", text: "The foundational thing is logging the prompt version on every response. Everything else on the usual checklist depends on it — you cannot attribute a quality change, verify a rollback or run an A/B without knowing which prompt produced which output." },
          { t: "p", text: "I would use a content hash rather than a hand-maintained number, because a number has to be remembered to increment and once it drifts, two different prompts log as the same version and every attribution afterwards is silently wrong. And I would log `system_fingerprint` beside it, so a provider-side model change can be ruled out in seconds." },
          { t: "p", text: "For storage, files in git for longer than people expect: review, history, rollback and atomicity with the parsing code, all free. A registry becomes worth it when people who cannot deploy need to change prompts — which is a real situation and the only one that justifies the extra system." }
        ] },

      { level: "advanced",
        q: "What is the risk of a prompt registry?",
        strong: "A strong answer identifies the decoupling from the parsing code and proposes the gate that compensates.",
        answer: [
          { t: "p", text: "It decouples the prompt from the code that reads its output. In git, changing \"return three bullets\" to \"return JSON\" and updating the parser is one commit that deploys together. In a registry, someone can make the first change on a Friday afternoon and the parser knows nothing about it." },
          { t: "p", text: "So a registry is a deployment system for something that affects behaviour, and it needs the controls a deployment system has: a validation gate that runs a promoted prompt against the golden set before it can go live, with the same bar the code path has. Teams adopt registries for the speed and inherit that obligation." },
          { t: "p", text: "The second risk is subtler — a registry's audit trail feels like attribution and is not. It records what changed; it cannot tell you what each response did. I have seen a team spend eight days investigating a model provider for a regression their own PM had caused in the registry on day one, because nothing in the application logs connected a bad summary to a prompt version." }
        ] },

      { level: "core",
        q: "What is the minimum prompt management worth having?",
        strong: "A strong answer names three concrete things and is clear that the rest is optional.",
        answer: [
          { t: "p", text: "Three things, and they cost about an afternoon. Prompts in files loaded by name with a content hash for the version. That version logged on every response, alongside the model and its fingerprint. And a golden set with a script that scores a version against it, run before merge." },
          { t: "p", text: "That gives you review, history, rollback, attribution and a regression gate without any new system." },
          { t: "p", text: "Everything beyond it — registry, rollout percentages, automatic halts — is justified by scale or by who needs to make changes, not by principle. Starting with the three makes the rest optional rather than urgent, which is the right order: most teams build the tooling first and then discover they still cannot answer which prompt produced a bad output." }
        ] }
    ]
  }
});
