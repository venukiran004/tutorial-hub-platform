/* ============================================================================
   LESSON 19.1 — MLOps and LLMOps, Side by Side
   ========================================================================= */
EC.receiveLesson({
  id: "19.1",

  lede: "Most of what this course built carries over to systems built on large language models: versioning, lineage, monitoring, rollback, experiments. Some of it changes shape: the 'model' is often someone else's, the 'feature pipeline' is a prompt and a retrieval index, and accuracy is replaced by evaluations of open-ended text. And some is new: per-token cost, a provider that can change or retire the model under you, and outputs that need guarding at run time. This lesson lays LLMOps against the lifecycle of Phase 1, then demonstrates the defining new risk with two real local models: the same application code giving different answers because a model alias moved.",

  objectives: [
    "Map LLMOps onto the MLOps lifecycle: what carries over, what changes shape, what is new",
    "Treat a hosted model as a third-party dependency with versions, deprecations and outages",
    "Show why floating model aliases are a release you did not make",
    "Declare and check each LLM feature's dependencies: pinned snapshot, fallback, evaluation suite"
  ],

  prerequisites: ["15.1", "16.1", "13.3"],

  blocks: [
    { t: "h2", n: "01", id: "map", text: "The lifecycle, side by side", sub: "Carries over, changes shape, new" },
    { t: "table",
      head: ["Lifecycle step", "MLOps", "LLMOps"],
      rows: [
        ["Data", "Training data, feature pipelines", "Prompts, retrieval corpus and index, examples"],
        ["Model", "Trained and owned by you", "Often a provider's snapshot; sometimes fine-tuned or self-hosted"],
        [
          "Versioning",
          "Model artefact, data snapshot",
          "Model snapshot, prompt version, index version, together (19.2)"
        ],
        ["Evaluation", "Accuracy, AUC on labels", "Golden sets, judges, pass rates with intervals (19.3)"],
        ["Serving cost", "Instance hours", "Tokens in and out, per request (19.4)"],
        ["Latency", "Inference time", "Time to first token and time per output token (19.4)"],
        ["Monitoring", "Drift, outcomes", "Traces per call, guardrail hits, feedback (19.5)"],
        ["Release risk", "Your own deploys", "Also the provider's: aliases, updates, deprecations"]
      ] },
    { t: "callout",
      kind: "insight",
      title: "The model as a dependency",
      body: [
        { t: "p",
          text: "A hosted model behaves like any third-party library or API: it has versions, release notes, deprecation dates, rate limits and outages. Everything you do for a critical dependency applies: pin the version, test before upgrading, plan for it failing, and track when it will be retired." }
      ] },
    { t: "h2",
      n: "02",
      id: "alias",
      text: "A release you did not make",
      sub: "Two real models behind one alias" },
    { t: "p",
      text: "Providers commonly offer both dated snapshots and floating aliases that point at the newest one. The script stands two local models in for two provider snapshots: GPT-2 as the earlier one and GPT-2 Medium as the later. The application calls 'text-model-latest' with greedy decoding, the provider moves the alias, and the application calls it again with the same prompts. A third run calls the pinned earlier snapshot." },
    { t: "viz",
      title: "A floating alias",
      caption: "The application's request never changes; what answers it does, whenever the provider moves the pointer.",
      svg: `<svg viewBox="0 0 760 230" width="100%" role="img">
<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-2)"/></marker></defs>
<line x1="160.0" y1="116.0" x2="230.0" y2="116.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="410.0" y1="96.5" x2="500.0" y2="77.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<text x="455.0" y="80.8" text-anchor="middle" class="s-sub">before</text>
<line x1="410.0" y1="135.5" x2="500.0" y2="155.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<text x="455.0" y="139.2" text-anchor="middle" class="s-sub">after</text>
<rect x="10" y="90" width="150" height="52" rx="8" class="s-fill" style="stroke:var(--ink-2);stroke-width:1.8"/>
<text x="85.0" y="112" text-anchor="middle" class="s-label" style="fill:var(--ink-2)">Application</text>
<text x="85.0" y="130" text-anchor="middle" class="s-sub">unchanged code</text>
<rect x="230" y="90" width="180" height="52" rx="8" class="s-fill" style="stroke:var(--warn);stroke-width:1.8"/>
<text x="320.0" y="112" text-anchor="middle" class="s-label" style="fill:var(--warn)">'text-model-latest'</text>
<text x="320.0" y="130" text-anchor="middle" class="s-sub">a pointer the provider moves</text>
<rect x="500" y="25" width="240" height="52" rx="8" class="s-fill" style="stroke:var(--accent);stroke-width:1.8"/>
<text x="620.0" y="47" text-anchor="middle" class="s-label" style="fill:var(--accent)">Snapshot 2024-01</text>
<text x="620.0" y="65" text-anchor="middle" class="s-sub">GPT-2 here: 265 ms</text>
<rect x="500" y="155" width="240" height="52" rx="8" class="s-fill" style="stroke:var(--violet);stroke-width:1.8"/>
<text x="620.0" y="177" text-anchor="middle" class="s-label" style="fill:var(--violet)">Snapshot 2024-06</text>
<text x="620.0" y="195" text-anchor="middle" class="s-sub">GPT-2 Medium here: 671 ms</text>
</svg>` },
    { t: "code",
      lang: "python",
      title: "alias.py — the same prompts before and after the alias moves",
      code: `import time
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

# Two real local models stand in for a provider's snapshots. The application asks for "latest"; the provider moves it.
PROVIDER = {"text-model-2024-01": "gpt2", "text-model-2024-06": "gpt2-medium"}
alias = {"text-model-latest": "text-model-2024-01"}
loaded = {}
def complete(model_name, prompt, max_new_tokens=12):
    snapshot = alias.get(model_name, model_name); repo = PROVIDER[snapshot]
    if repo not in loaded:                                   # the GPT-2 family shares one tokenizer (same BPE vocabulary)
        loaded[repo] = (AutoTokenizer.from_pretrained("gpt2"), AutoModelForCausalLM.from_pretrained(repo).eval())
    tok, m = loaded[repo]
    ids = tok(prompt, return_tensors="pt").input_ids
    t = time.perf_counter()
    with torch.inference_mode():
        out = m.generate(ids, max_new_tokens=max_new_tokens, do_sample=False, pad_token_id=tok.eos_token_id)
    return tok.decode(out[0, ids.shape[1]:]).strip().replace("\\n", " "), (time.perf_counter() - t) * 1000, snapshot

prompts = ["The capital of France is", "To reset your password, first", "Our refund policy allows customers to",
           "The order status is shipped, which means", "Error 404 means that the page"]
before = {p: complete("text-model-latest", p) for p in prompts}
alias["text-model-latest"] = "text-model-2024-06"                                   # the provider moves the alias
after = {p: complete("text-model-latest", p) for p in prompts}
pinned = {p: complete("text-model-2024-01", p) for p in prompts}

changed = 0
for p in prompts:
    same = before[p][0] == after[p][0]; changed += not same
    print(f"{'same   ' if same else 'CHANGED'} '{p}'\\n          before: {before[p][0][:60]}\\n          after:  {after[p][0][:60]}")
print(f"\\nsame application code, alias moved: {changed} of {len(prompts)} outputs changed; "
      f"median latency {sorted(v[1] for v in before.values())[2]:.0f} ms -> {sorted(v[1] for v in after.values())[2]:.0f} ms")
print(f"pinned to text-model-2024-01: identical to before for {sum(pinned[p][0] == before[p][0] for p in prompts)} of {len(prompts)}")`,
      out: `CHANGED 'The capital of France is'
          before: the capital of the French Republic, and the capital of the
          after:  Paris, and the capital of France is Paris.
CHANGED 'To reset your password, first'
          before: log in to your account and then click the "reset password
          after:  log in to your account.  Click on the "
CHANGED 'Our refund policy allows customers to'
          before: cancel their account at any time without penalty.  If
          after:  return any item within 30 days of receipt for a full refund
CHANGED 'The order status is shipped, which means'
          before: that you can order it from any of our online stores.
          after:  that the order status is shipped.  The order status
CHANGED 'Error 404 means that the page'
          before: is not being displayed.  The following example shows how
          after:  you are trying to access does not exist.  If

same application code, alias moved: 5 of 5 outputs changed; median latency 265 ms -> 671 ms
pinned to text-model-2024-01: identical to before for 5 of 5` },
    { t: "dl",
      items: [
        { term: "Every output changed",
          def: "All five completions differed after the alias moved, some for the better ('Paris'), some not. No code, prompt or configuration changed in the application." },
        { term: "Latency changed too",
          def: "Median latency went from 265 ms to 671 ms, because the newer snapshot is a larger model. A latency SLO can break from the provider's side." },
        { term: "Pinning made it a decision",
          def: "Calls to the dated snapshot reproduced the earlier outputs exactly. The upgrade then happens when you choose, after your evaluation suite passes." }
      ] },
    { t: "callout",
      kind: "trap",
      title: "Pinning and forgetting",
      body: [
        { t: "p",
          text: "Dated snapshots are retired on published schedules. A pinned model that is never upgraded becomes an emergency migration with a deadline. Track deprecation dates for every pinned snapshot, and upgrade through the evaluation gate (19.3) well before them." }
      ] },
    { t: "exercise",
      kind: "Challenge",
      title: "Check each feature's model dependencies",
      difficulty: "core",
      minutes: 20,
      body: [
        { t: "p",
          text: "For three LLM features, declare the provider, model, fallback, evaluation suite and cost limit. Write a checker that flags floating aliases, pinned snapshots retiring within 90 days (from a table of published deprecation dates), features without a fallback, and features without an evaluation suite to gate a model change." }
      ],
      requirements: [
        "A declared dependency per feature",
        "Alias detection",
        "Deprecation within 90 days of a fixed date",
        "Missing fallback and evaluation suite"
      ],
      hint: "Use a fixed 'today' in the script so its output is reproducible; in CI, use the real date.",
      solution: { lang: "python",
        title: "llm_dependencies.py",
        code: `from datetime import date

TODAY = date(2026, 3, 1)                         # fixed so the check is reproducible; use date.today() in CI
# What each LLM feature depends on, as the application declares it (provider and model names are illustrative).
features = {
    "support-reply-draft": {"provider": "provider-a", "model": "chat-large-latest", "fallback": None,
                            "eval_suite": "golden-support-v4", "max_cost_per_1k_requests": 4.0},
    "ticket-classifier": {"provider": "provider-b", "model": "small-2025-06-12", "fallback": "self-hosted-classifier-v3",
                          "eval_suite": "golden-tickets-v2", "max_cost_per_1k_requests": 0.3},
    "summary-email": {"provider": "provider-a", "model": "chat-medium-2024-08-06", "fallback": "chat-small-2025-01-15",
                      "eval_suite": None, "max_cost_per_1k_requests": 1.2},
}
# Published deprecation dates for pinned snapshots, from the providers' notices.
deprecations = {"chat-medium-2024-08-06": date(2026, 4, 15), "small-2025-06-12": date(2027, 1, 31)}

def check(name, f):
    issues = []
    if "latest" in f["model"] or not any(ch.isdigit() for ch in f["model"]):
        issues.append(f"floating alias '{f['model']}': behaviour can change without a release")
    end = deprecations.get(f["model"])
    if end and (end - TODAY).days < 90: issues.append(f"'{f['model']}' retires on {end} ({(end - TODAY).days} days)")
    if not f["fallback"]: issues.append("no fallback model or degraded mode")
    if not f["eval_suite"]: issues.append("no evaluation suite to gate a model change")
    return issues

for name, f in features.items():
    issues = check(name, f)
    print(f"{name:<22} {'OK' if not issues else ''}")
    for i in issues: print(f"   - {i}")`,
        out: `support-reply-draft    
   - floating alias 'chat-large-latest': behaviour can change without a release
   - no fallback model or degraded mode
ticket-classifier      OK
summary-email          
   - 'chat-medium-2024-08-06' retires on 2026-04-15 (45 days)
   - no evaluation suite to gate a model change`,
        notes: [
          { t: "p",
            text: "The support-reply feature used a floating alias with no fallback: the exact situation the main script demonstrated, plus no plan for the provider being down. The summary feature was pinned, which is right, but its snapshot retired in 45 days and it had no evaluation suite, so there was no safe way to move to its successor. Only the ticket classifier was ready." },
          { t: "p",
            text: "This check belongs in CI and in a weekly report: it turns the provider's release schedule into tasks with dates, rather than incidents." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: the summaries that changed on a Tuesday",
      body: [
        { t: "p",
          text: "**Symptom.** Customer-facing email summaries became noticeably longer and started including a closing pleasantry; complaints rose and some summaries exceeded the email template's length limit." },
        { t: "p",
          text: "**Mechanism.** The feature called a provider's 'latest' alias. The provider moved it to a new snapshot that tended to write longer replies. Nothing in the application had changed, so the team spent a day looking for a bad deploy of their own." },
        { t: "p",
          text: "**Fix.** Every feature now pins a dated snapshot, recorded in a dependency manifest with deprecation dates; upgrades go through the evaluation gate with length and format checks; and traces record the snapshot each response came from." }
      ] }
  ],

  takeaways: [
    "Versioning, lineage, monitoring, rollback and experiments **carry over** to LLM systems.",
    "Data becomes **prompts and indexes**; evaluation becomes **golden sets and judges**; cost becomes **tokens**.",
    "A hosted model is a **third-party dependency** with versions, deprecations, limits and outages.",
    "Measured: moving an alias changed **5 of 5** outputs and raised median latency **265 → 671 ms** with no application change.",
    "**Pin dated snapshots**; upgrade deliberately through an evaluation gate.",
    "Track deprecation dates: a pinned snapshot retiring in **45 days** is a deadline, not a detail.",
    "Declare every feature's model, fallback and evaluation suite, and check them in CI."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "An application calls a provider's 'latest' alias. What can change without a release on your side?",
        options: [
          "Only the price per token for each request",
          "Outputs, latency and cost, whenever the alias moves",
          "Nothing at all, because aliases are stable by design",
          "Only the formatting of the response JSON"
        ],
        answer: 1,
        why: "The alias moving changed every output and more than doubled latency in the demo. Aliases exist precisely so the target can change." },
      { stem: "Why is pinning a dated snapshot not the end of the story?",
        options: [
          "Pinned snapshots cost more per token",
          "Snapshots are retired on published schedules",
          "Pinned snapshots cannot be used with streaming",
          "Providers forbid pinning in production use"
        ],
        answer: 1,
        why: "Retirement dates turn an unplanned pin into an emergency migration; track them and upgrade through the gate. Cost, streaming and permission are not the issue." },
      { stem: "Which MLOps practice carries over to LLM systems unchanged in purpose?",
        options: [
          "Training a model on your own labelled data",
          "Recording which version produced each output",
          "Computing AUC on held-out labels each week",
          "Retraining on drifted data every single month"
        ],
        answer: 1,
        why: "Version traceability matters exactly as before, now covering model snapshot, prompt and index. Training, AUC and retraining often do not apply to a hosted model." },
      { stem: "What is the first thing an LLM feature needs before upgrading its model snapshot?",
        options: [
          "A larger budget for the new model's tokens",
          "An evaluation suite that can gate the change",
          "A rewrite of its prompts for the new model",
          "Approval from the model provider's support team"
        ],
        answer: 1,
        why: "Without an evaluation suite there is no way to know whether the upgrade is safe; the checker flagged its absence. Budget, prompt rewrites and provider approval may or may not be needed." }
    ] },

  interview: { title: "In an interview",
    sub: "LLMOps answers should start from what is the same.",
    questions: [
      { level: "core",
        q: "How is LLMOps different from MLOps?",
        strong: "A strong answer separates what carries over, what changes shape and what is new.",
        answer: [
          { t: "p",
            text: "Carries over: versioning, lineage, monitoring, rollback, experiments, ownership. Changes shape: the data is prompts, retrieved context and examples; evaluation is golden sets and judges rather than accuracy on labels; the artefact is a combination of model snapshot, prompt and index. New: the model is often a third party's, with aliases and deprecations; cost is per token; latency splits into time to first token and per token; and outputs need run-time guardrails." }
        ] },
      { level: "advanced",
        q: "How do you manage a hosted model as a dependency?",
        strong: "A strong answer covers pinning, deprecation tracking, evaluation-gated upgrades and fallbacks.",
        answer: [
          { t: "p",
            text: "Pin dated snapshots and record them per feature in a manifest, never use floating aliases in production, track each snapshot's deprecation date with alerts well ahead, and upgrade through the evaluation gate as for any model change. Plan for outages and rate limits with fallbacks to another snapshot, provider or degraded mode (19.4), and record the snapshot in every trace so incidents can be attributed." }
        ] },
      { level: "core",
        q: "Your LLM feature's behaviour changed overnight with no deploy. What do you check?",
        strong: "A strong answer checks the provider side before the application.",
        answer: [
          { t: "p",
            text: "Whether the feature calls an alias, and whether the provider moved it or updated the snapshot; the traces should show which snapshot served each response. Then the other inputs that change without a deploy: the retrieval index (new or stale documents), prompt versions loaded from a registry at run time, and upstream data in the context." }
        ] }
    ] }
});
