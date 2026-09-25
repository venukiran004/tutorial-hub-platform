EC.receiveLesson({
  id: "1.14",

  lede: "Token counting is the arithmetic underneath every other lesson in this module — the budget in 1.5, the cache saving in 1.13, the bill in 11.7. It is also where a small, systematic error compounds: the chat envelope nobody counts, the tokenizer that is right for the wrong model, and a reference figure that contradicts the reference's own price table by a factor of two. This lesson counts everything properly and builds the estimator you would actually put in a codebase.",

  objectives: [
    "Count tokens exactly with the right encoding for a given model",
    "Account for the chat-format overhead that plain text counting misses",
    "Convert a token count into a cost, and a cost into an annual figure",
    "Say what changes when the same text is counted for a different provider",
    "Verify a cost claim rather than repeating it"
  ],

  prerequisites: ["1.5"],

  blocks: [

    /* ============================================================ 01 */
    { t: "h2", n: "01", id: "the-encoding", text: "The encoding is part of the answer",
      sub: "Same text, different model, different count" },

    { t: "p", text: "`tiktoken` is a family of encodings, not one. `cl100k_base` is GPT-4 and GPT-3.5; `o200k_base` is GPT-4o and later. They give different answers, and the difference is not uniform — it depends on the language." },

    { t: "code", lang: "python", title: "g13.py — two encodings, six samples", code: `enc  = tiktoken.get_encoding("cl100k_base")
o200 = tiktoken.get_encoding("o200k_base")

for name, s in samples:
    print("%-14s %6d %8d %8d %9.2f %9.2f"
          % (name, len(s), len(enc.encode(s)), len(o200.encode(s)),
             len(s) / len(enc.encode(s)), len(s.split()) / len(enc.encode(s))))`,
      out: `  sample          chars   cl100k    o200k chars/tok words/tok
  english prose     270       61       61      4.43      0.89
  hello world        13        4        4      3.25      0.50
  python code       100       32       32      3.12      0.50
  json               72       26       27      2.77      0.31
  uuids             148       76       76      1.95      0.05
  french            236       73       57      3.23      0.49`,
      hl: [7],
      caption: "English is identical between the two encodings. French is **73 tokens in `cl100k_base` and 57 in `o200k_base`** — a 22% reduction for the same characters, because the newer vocabulary carries more non-English subwords." },

    { t: "callout", kind: "insight", title: "The tokenizer is a cost decision for non-English traffic",
      body: [
        { t: "p", text: "A 22% token reduction is a 22% cost reduction on the input side, for changing nothing but the model family. For a product serving mostly French, German or Spanish text, that is a larger saving than most prompt engineering will produce." },
        { t: "p", text: "It gets more dramatic further from English. Languages written in non-Latin scripts — Japanese, Arabic, Hindi — historically tokenised extremely inefficiently, sometimes at more than one token per character, and newer vocabularies have improved this substantially. If your traffic is not English, measure it on your own text before assuming the English figures transfer." },
        { t: "p", text: "The same argument applies to model choice across providers. Two models quoted at the same price per million tokens are not the same price per *document* if one tokenises your language better." }
      ] },

    { t: "p", text: "For a non-OpenAI model there is no `tiktoken` encoding at all, and the answer comes from the model's own tokenizer:" },

    { t: "code", lang: "python", title: "count.py — one function, several providers", code: `from functools import lru_cache
import tiktoken
from transformers import AutoTokenizer

@lru_cache(maxsize=None)                  # loading a tokenizer is not cheap
def _tok(model):
    if model.startswith(("gpt-4o", "o1", "o3", "o4")):
        return ("tiktoken", tiktoken.get_encoding("o200k_base"))
    if model.startswith(("gpt-4", "gpt-3.5")):
        return ("tiktoken", tiktoken.get_encoding("cl100k_base"))
    return ("hf", AutoTokenizer.from_pretrained(HF_NAME[model]))

def count(text, model):
    kind, t = _tok(model)
    return len(t.encode(text)) if kind == "tiktoken" else len(t.encode(text))

# Anthropic exposes a count endpoint instead of publishing a tokenizer:
#   client.messages.count_tokens(model=..., messages=[...])
# It is a network call, so cache aggressively or estimate and verify.`,
      caption: "The `lru_cache` matters: constructing a HuggingFace tokenizer takes tens of milliseconds, which is fine once and catastrophic per request in a loop." },

    /* ============================================================ 02 */
    { t: "h2", n: "02", id: "the-envelope", text: "The chat envelope nobody counts",
      sub: "Messages cost more than the text inside them" },

    { t: "p", text: "Counting `len(enc.encode(content))` for each message undercounts, because the chat format wraps every message in special tokens marking the role and the boundaries. The wrapper is small per message and not small across a long conversation." },

    { t: "code", lang: "python", title: "g18.py — the envelope, measured", code: `msgs = [{"role": "system", "content": "You are a helpful assistant."},
        {"role": "user",   "content": "What is the capital of France?"}]

text_only = sum(n(m["content"]) for m in msgs)
print("content tokens only            : %d" % text_only)
print("+ per-message overhead (3 each): %d" % (text_only + 3 * len(msgs)))
print("+ reply priming (3)            : %d" % (text_only + 3 * len(msgs) + 3))`,
      out: `  content tokens only            : 13
  + per-message overhead (3 each): 19
  + reply priming (3)            : 22

the envelope is 9 tokens on a 13-token conversation -- 69% overhead.
on a 50-turn conversation of 20-token messages it is 153 of 1153 tokens.`,
      hl: [4, 5, 6],
      caption: "Three tokens per message plus three to prime the reply. On two short messages that is a 69% overhead; on a 50-turn conversation it is 153 tokens — 13%, and no longer the dominant term." },

    { t: "p", text: "The per-message constant is a property of the chat template, not a universal — it has been 3 for OpenAI's recent chat models and has differed on older ones, and other providers have their own. What matters is that it is not zero and that it scales with the *number* of messages rather than their length, so it hurts most on conversations made of many short turns." },

    { t: "callout", kind: "good", title: "Reconcile your counter against the provider's once",
      body: [
        { t: "p", text: "After the first response, compare your computed count against `usage.prompt_tokens`. If they differ, the gap is your envelope constant and you can correct for it — permanently, with one measurement." },
        { t: "p", text: "Do the same check whenever you change model family, because the chat template can change. A counter that was exactly right on one model and is three tokens per message wrong on the next will quietly drift your budgets, and the error grows with conversation length." },
        { t: "p", text: "This is the cheapest test in the module: one request, one comparison, and a class of silent arithmetic error is closed." }
      ] },

    /* ============================================================ 03 */
    { t: "h2", n: "03", id: "cost", text: "From tokens to money",
      sub: "The arithmetic is trivial; getting the rates right is not" },

    { t: "code", lang: "python", title: "g18.py — a cost table", code: `PRICES = {"gpt-4o":        (2.50, 10.00),        # $ per 1M (input, output)
          "gpt-4o-mini":   (0.15,  0.60),
          "claude-sonnet": (3.00, 15.00),
          "o3":           (10.00, 40.00)}

for m, (i, o) in PRICES.items():
    print("%-15s %10.2f %10.2f %12.6f" % (m, i, o, (1000 * i + 500 * o) / 1e6))`,
      out: `  model              $/1M in   $/1M out    this call
  gpt-4o                2.50      10.00     0.007500
  gpt-4o-mini           0.15       0.60     0.000450
  claude-sonnet         3.00      15.00     0.010500
  o3                   10.00      40.00     0.030000`,
      caption: "Rates as quoted in 01_LLM_Parameters.md §14 and §16.1, which date them to 2024–2025. A 1,000-in / 500-out call ranges from $0.00045 to $0.03 — a factor of 67 across four models for identical work." },

    { t: "p", text: "The reference's own worked example checks out: `(1000 × 2.50 + 500 × 10.00) / 1,000,000` = $0.0075, which is what it prints. One of its *claims*, however, does not:" },

    { t: "code", lang: "python", title: "g18.py — checking a claim against its own table", code: `print("the reference claims GPT-4o-mini is '30x cheaper' than GPT-4o.")
print("  from its own price table: input %.2f/%.2f = %.1fx, output %.2f/%.2f = %.1fx"
      % (2.50, 0.15, 2.50 / 0.15, 10.00, 0.60, 10.00 / 0.60))`,
      out: `the reference claims GPT-4o-mini is '30x cheaper' than GPT-4o.
  from its own price table: input 2.50/0.15 = 16.7x, output 10.00/0.60 = 16.7x
  so the factor is 16.7x on both, not 30x.`,
      hl: [1, 2, 3],
      caption: "01_LLM_Parameters.md says \"GPT-4o-mini is 30x cheaper than GPT-4o\" in both §13 and §17, and lists the prices that make it 16.7× in §16.1. The ratio is the same on input and output, so there is no mix of the two that produces 30." },

    { t: "callout", kind: "trap", title: "Model prices go stale faster than the documents that quote them",
      body: [
        { t: "p", text: "Every price in this lesson is quoted from the reference and dated there. They will be wrong by the time you read this — provider pricing moves, and it has moved downward consistently." },
        { t: "p", text: "So do not hardcode rates in application code. Put them in configuration with the date they were checked, and fail loudly on a model you have no rate for rather than silently defaulting to one. A cost dashboard built on a rate table that is a year old reports confident fiction." },
        { t: "p", text: "And verify a ratio before repeating it. The 30× figure above has been quoted widely enough that it reads as common knowledge; the number from the table is 16.7×, and both cannot be true." }
      ] },

    /* ============================================================ 04 */
    { t: "h2", n: "04", id: "in-practice", text: "The counter you actually ship",
      sub: "Cheap, cached, and honest about what it does not know" },

    { t: "code", lang: "python", title: "tokens.py", code: `from dataclasses import dataclass

@dataclass(frozen=True)
class Rate:
    input_per_m: float
    output_per_m: float
    checked: str                      # the date you verified it -- not optional

RATES = {
    "gpt-4o":      Rate(2.50, 10.00, "2024-08-06"),
    "gpt-4o-mini": Rate(0.15,  0.60, "2024-08-06"),
}

PER_MESSAGE, PER_REPLY = 3, 3         # reconcile against usage.prompt_tokens

def count_messages(messages, model):
    total = PER_REPLY
    for m in messages:
        total += PER_MESSAGE + count(m["content"], model)
        if m.get("name"):
            total += 1
    return total

def estimate(messages, model, *, max_output):
    if model not in RATES:
        raise UnknownModel(model)     # never default a price
    r = RATES[model]
    in_tok = count_messages(messages, model)
    return {
        "input_tokens": in_tok,
        "max_cost": (in_tok * r.input_per_m + max_output * r.output_per_m) / 1e6,
        "rate_checked": r.checked,
    }`,
      hl: [19, 20],
      caption: "Two decisions do the work. `max_cost` uses `max_output` rather than an expected value, so the number is a bound rather than a guess. And an unknown model raises instead of defaulting, so a new model cannot silently be priced as an old one." },

    { t: "p", text: "Where to call it: before sending, to enforce a budget (1.5); in an admission check, to reject a request that cannot fit; and in logging, so that every request carries its own estimated cost and the bill is reconcilable without waiting for an invoice. 10.6 makes the case that this belongs on every span." },

    /* ============================================================ exercise */
    { t: "exercise", kind: "Challenge", title: "Find out what your envelope constant actually is",
      difficulty: "foundation", minutes: 20,
      body: [
        { t: "p", text: "The 3-tokens-per-message figure is a convention, and conventions drift. If you have access to any chat model's `usage.prompt_tokens`, you can derive the real constant from two requests without guessing." },
        { t: "p", text: "Build the derivation, using a local chat template as the stand-in for a provider you can call." }
      ],
      requirements: [
        "Take a chat-template-bearing tokenizer and a set of message lists of varying lengths",
        "For each, compute the content-only token count and the templated count",
        "Fit the per-message and fixed overheads from the difference",
        "Report the fitted constants and the residual error",
        "State how you would perform the same derivation against a hosted provider"
      ],
      hint: "The relationship is `templated = content + a × n_messages + b`. Two message lists of different lengths give two equations; more give a least-squares fit and a residual worth reading.",
      solution: { lang: "python", title: "g114_ex.py",
        code: `from transformers import AutoTokenizer

tok = AutoTokenizer.from_pretrained("gpt2")     # stand-in: a simple template
tok.chat_template = (
    "{% for m in messages %}<|im_start|>{{ m.role }}\\n{{ m.content }}<|im_end|>\\n"
    "{% endfor %}<|im_start|>assistant\\n")

CONVOS = [
    [{"role": "user", "content": "Hello"}],
    [{"role": "system", "content": "You are helpful."},
     {"role": "user", "content": "What is the capital of France?"}],
    [{"role": "system", "content": "You are helpful."},
     {"role": "user", "content": "Explain gradient descent."},
     {"role": "assistant", "content": "It follows the negative gradient."},
     {"role": "user", "content": "Why negative?"}],
]

rows = []
for msgs in CONVOS:
    content = sum(len(tok.encode(m["content"])) for m in msgs)
    full    = len(tok.encode(tok.apply_chat_template(msgs, tokenize=False)))
    rows.append((len(msgs), content, full, full - content))
    print("%d messages: content %3d  templated %3d  overhead %3d"
          % rows[-1])

# fit overhead = a * n_messages + b by least squares
n  = len(rows)
xs = [r[0] for r in rows]; ys = [r[3] for r in rows]
a  = (n * sum(x * y for x, y in zip(xs, ys)) - sum(xs) * sum(ys)) \\
     / (n * sum(x * x for x in xs) - sum(xs) ** 2)
b  = (sum(ys) - a * sum(xs)) / n

print()
print("fitted: %.2f tokens per message + %.2f fixed" % (a, b))
print("residuals: %s" % [round(y - (a * x + b), 2) for x, y in zip(xs, ys)])`,
        out: `1 messages: content   1  templated  27  overhead  26
2 messages: content  11  templated  53  overhead  42
4 messages: content  18  templated  93  overhead  75

fitted: 16.36 tokens per message + 9.50 fixed
residuals: [0.14, -0.21, 0.07]`,
        notes: [
          { t: "p", text: "The fit is 16.36 tokens per message plus 9.50 fixed, with residuals under 0.25 — so the linear model is an excellent description and the constants are recoverable from three conversations. They are nowhere near 3 and 3, and the reason is instructive: GPT-2's tokenizer has never seen `<|im_start|>` as a special token, so it shatters into about seven ordinary pieces per occurrence. On a real chat model those markers are single tokens, which is the entire difference between 16 and 3." },
          { t: "p", text: "That is the real lesson rather than a defect of the exercise. The constant is a property of the **template and the tokenizer together**, not of either alone — which this exercise demonstrates at an extreme, since pairing a real chat template with a tokenizer that lacks its special tokens inflates the overhead fivefold. Any figure you read, including the 3 in §02, is specific to one model family and must be re-derived when you change." },
          { t: "p", text: "Against a hosted provider the derivation is the same and easier: send two short requests with different message counts, read `usage.prompt_tokens` from each, and solve the two equations. It costs a fraction of a penny and closes a class of silent budgeting error permanently. Do it once per model family and store the constants beside the rates." }
        ] } },

    /* ============================================================ scenario */
    { t: "callout", kind: "scenario", title: "Incident: the per-customer quota that let one tenant use four times their allowance",
      body: [
        { t: "p", text: "**Symptom.** A platform sold tiers by monthly token allowance and enforced them in code. Reconciliation against the provider's invoice found one large customer had consumed roughly four times their metered allowance without the quota ever triggering." },
        { t: "p", text: "**What the counter did.** It summed `len(enc.encode(content))` across the messages, with `cl100k_base`. The product had moved to GPT-4o eighteen months earlier." },
        { t: "p", text: "**Mechanism.** Three errors compounding, all in the same direction. The encoding was wrong for the model, though for this customer's mostly-English text that was a small error. The chat envelope was never counted, which on their workload — long conversations of many short turns — was around 13%. And the counter ignored tool definitions entirely, which at roughly 85 tokens each (1.9) across a dozen tools was the largest term by far. Every one of these undercounts, so the meter always read low and never high." },
        { t: "p", text: "**Fix.** The counter now counts the full serialised request — messages, envelope, tools, schema — and is reconciled against `usage.prompt_tokens` on the first response of every deploy, failing the deploy if the gap exceeds 1%. The durable lesson is the direction of the errors: everything a naive counter forgets is something that adds tokens, so estimation error in metering is systematically optimistic. If you bill on it, you have to reconcile it against the provider's own number rather than trusting your arithmetic." }
      ] }
  ],

  takeaways: [
    "**The encoding is part of the answer.** `cl100k_base` is GPT-4 and GPT-3.5; `o200k_base` is GPT-4o and later, and they disagree.",
    "English is identical between them. **French measured 73 tokens under `cl100k_base` and 57 under `o200k_base`** — a 22% reduction for the same characters, which is a 22% input-cost reduction for non-English traffic.",
    "Two models at the same price per million tokens are **not the same price per document** if one tokenises your language better.",
    "Non-OpenAI models need their own tokenizer, and Anthropic exposes a count endpoint rather than publishing one. Cache tokenizer construction — it is tens of milliseconds.",
    "**The chat envelope is not free**: roughly 3 tokens per message plus 3 to prime the reply on recent OpenAI chat models. That was 69% overhead on two short messages and 13% on a 50-turn conversation.",
    "The envelope scales with the **number** of messages, not their length, so it hurts most on conversations made of many short turns.",
    "Reconcile your counter against `usage.prompt_tokens` once per model family. It is one request and it closes a class of silent arithmetic error.",
    "The envelope constant is a property of the **template and the tokenizer together** — pairing a chat template with a tokenizer that lacks its special tokens fitted at 16.36 per message plus 9.50 fixed, not 3 and 3.",
    "**The reference's \"30× cheaper\" claim contradicts its own price table**, which gives 2.50/0.15 = 16.7× on input and 10.00/0.60 = 16.7× on output. Verify a ratio before repeating it.",
    "Estimation errors in metering are **systematically optimistic** — the envelope, the tools and the schema are all things a naive counter forgets, and all of them add tokens."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "You count a French document with `cl100k_base` and get 73 tokens. What does `o200k_base` give?",
        options: ["The same 73 — encodings agree on the same text", "About 57 — the newer vocabulary carries more non-English subwords", "About 90 — newer encodings are more granular", "It depends on the length only"],
        answer: 1,
        why: "Measured, the same French sentence was 73 tokens under `cl100k_base` and 57 under `o200k_base` — a 22% reduction, because the newer vocabulary includes more non-English subword units so fewer pieces are needed. English was identical between the two in the same measurement, which is why the difference surprises people working only in English. The third option has the direction backwards. Length alone cannot determine a count when the vocabularies differ." },

      { stem: "Your counter sums `len(enc.encode(content))` per message. What does it miss?",
        options: ["Nothing, if the encoding is right", "The per-message and reply-priming envelope, plus tool definitions and any schema", "Only the system message", "The output tokens"],
        answer: 1,
        why: "The chat format wraps each message in role and boundary tokens — about 3 per message plus 3 to prime the reply on recent OpenAI models — and tool definitions and schemas are sent as input too, at roughly 85 tokens per tool. All of these are additions, which is why a naive counter is systematically optimistic and a quota built on one lets tenants over-consume. The third option names one message where the problem is per-message. Output tokens are a separate figure that no input counter is expected to produce." },

      { stem: "The reference says GPT-4o-mini is \"30× cheaper\" than GPT-4o. Its price table lists $2.50 and $0.15 per million input tokens. What is the real ratio?",
        options: ["30×, as stated", "16.7×, on both input and output", "It cannot be computed from those figures", "About 8×"],
        answer: 1,
        why: "2.50 ÷ 0.15 = 16.7 on input, and 10.00 ÷ 0.60 = 16.7 on output, so the factor is the same on both and no mix of the two produces 30. The claim and the table are in the same document and cannot both be right — which is the reason to check a ratio against the numbers before repeating it. The figures are sufficient to compute the answer, so the third option is wrong, and 8× matches nothing in the table." },

      { stem: "Where should model prices live in your codebase?",
        options: ["Hardcoded constants, since they rarely change", "Configuration, with the date each was checked, raising on an unknown model", "Fetched from the provider at startup", "Derived from the invoice each month"],
        answer: 1,
        why: "Prices move, mostly downward, so a rate table needs a checked-on date to be auditable and must fail loudly on a model it has no rate for — silently defaulting to another model's price turns a cost dashboard into confident fiction. Hardcoding makes the staleness invisible. Providers do not generally expose a pricing endpoint to fetch at startup. Deriving from the invoice is a useful reconciliation but far too slow to price a request you are about to send." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "A question that sounds like trivia and is really about whether you have ever had to bill someone for this.",
    questions: [
      { level: "core",
        q: "How do you count tokens for a chat request?",
        strong: "A strong answer names the encoding per model family, includes the envelope, and mentions reconciling against the provider.",
        answer: [
          { t: "p", text: "With the right encoding for the model — `o200k_base` for GPT-4o and later, `cl100k_base` for GPT-4 and 3.5, and the model's own tokenizer for anything non-OpenAI. Anthropic exposes a count endpoint rather than publishing a tokenizer, so that is a network call and wants caching." },
          { t: "p", text: "And I would count the envelope, not just the content. The chat format wraps each message in role and boundary tokens — about three per message plus three to prime the reply on recent OpenAI models. On two short messages I measured that at 69% overhead; on a fifty-turn conversation it is 13%. It scales with the number of messages rather than their length, so many short turns is the worst case." },
          { t: "p", text: "Then I would reconcile once against `usage.prompt_tokens`. One request tells you your envelope constant exactly, and it closes a class of silent error permanently. The constant is a property of the template and tokenizer together, so it gets re-derived when the model family changes." }
        ] },

      { level: "core",
        q: "When is it acceptable to estimate rather than count?",
        strong: "A strong answer draws the line at whether the number changes a decision, and knows how wrong the rule gets.",
        answer: [
          { t: "p", text: "When being wrong by a third does not change anything: capacity planning, a design document, a rough monthly forecast. Not when the number decides whether a request is sent — truncating a prompt to fit, choosing how many retrieved chunks to include, enforcing a quota." },
          { t: "p", text: "The rules of thumb are calibrated on English prose. I measured 4.43 characters per token on prose, which is close to the usual 4, but 2.77 on JSON and 1.95 on a string of UUIDs. That last is wrong by more than a factor of two and it errs optimistically — it tells you a payload fits when it does not." },
          { t: "p", text: "And `tiktoken` runs locally in microseconds, so on the request path there is no cost argument for estimating. The only real reason is a model whose tokenizer you do not have, and then the honest answer is to estimate generously and reconcile against the provider's count afterwards." }
        ] },

      { level: "advanced",
        q: "A customer used four times their metered token allowance without the quota firing. What went wrong?",
        strong: "A strong answer identifies that estimation errors here are one-directional, and lists what a naive counter forgets.",
        answer: [
          { t: "p", text: "Almost certainly the counter was undercounting, and the useful observation is that it can only undercount. Every component a naive counter forgets is something that *adds* tokens, so the error is systematically optimistic rather than noisy." },
          { t: "p", text: "What gets forgotten, roughly in order of size: tool definitions, which at about 85 tokens each across a dozen tools is usually the largest term; any JSON schema for structured output, which I measured at 137 to 252 tokens; the chat envelope, around 13% on a conversation of many short turns; and the encoding, if the product moved model families and the counter did not." },
          { t: "p", text: "The fix is to count the full serialised request rather than the message contents, and then to reconcile against `usage.prompt_tokens` automatically — I would fail a deploy if the gap exceeded a percent. If you are billing a customer on a number, that number has to be checked against the provider's own, not trusted because the arithmetic looked right." }
        ] },

      { level: "advanced",
        q: "How would you build cost observability for an LLM product?",
        strong: "A strong answer separates estimate from actual, names the dimensions worth slicing by, and puts rates in configuration with a date.",
        answer: [
          { t: "p", text: "Two numbers per request, and keep them distinct. An *estimate* computed before sending, from the full serialised request, which is what a budget check and an admission control can act on. And the *actual* from `usage` afterwards, which is the audit record. The gap between them is itself a metric — a widening gap means your counter has drifted from the model." },
          { t: "p", text: "Then the dimensions, because a total is not actionable. Model, feature, customer, and prompt version at minimum. Most cost investigations end with one feature or one tenant, and without those labels you are reduced to guessing. 10.6 is the general version of this argument." },
          { t: "p", text: "Rates go in configuration with the date each was checked, and an unknown model raises rather than defaulting — a dashboard built on a year-old rate table reports confident fiction, and silently pricing a new model as an old one is how that happens." },
          { t: "p", text: "The one thing I would add that people skip: record the request even when the response never completes. Streams get abandoned, connections drop, and usage only arrives at the end — so a metric derived purely from successful responses is blind to exactly the requests you most want to see. I have seen that produce a stable 30% gap between logs and invoice." }
        ] }
    ]
  }
});
