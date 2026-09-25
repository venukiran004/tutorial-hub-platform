EC.receiveLesson({
  id: "1.7",

  lede: "`seed` fixes the random number generator that draws a token from the distribution. That removes one source of variation and leaves several others, which is why the providers describe reproducibility as best-effort rather than guaranteed. This lesson measures what a seed does fix, and then measures the thing that makes `temperature=0` non-deterministic on a server even though no sampling is happening: the same prompt in a batch of four produces different logits from the same prompt alone.",

  objectives: [
    "Say exactly which source of variation a seed removes, and which ones it does not",
    "Explain why temperature=0 is not sufficient for identical output from a hosted model",
    "Describe what system_fingerprint is for and what a change in it means",
    "Measure the size of floating-point non-determinism and judge whether it matters for a given task",
    "Build a pipeline that is reproducible in the sense that actually matters"
  ],

  prerequisites: ["1.1", "1.2"],

  blocks: [

    /* ============================================================ 01 */
    { t: "h2", n: "01", id: "what-seed-fixes", text: "What a seed fixes",
      sub: "The draw, and only the draw" },

    { t: "p", text: "From 1.1: the last stage of the pipeline draws a token from the surviving distribution. That draw uses a pseudo-random number generator, and a seed fixes its starting state. Same distribution plus same generator state gives the same draw, every time." },

    { t: "code", lang: "python", title: "g13.py — the seed, doing its job", code: `prompt = "In the year 2050, cities will"

for trial in range(3):
    torch.manual_seed(42)
    ids = tok(prompt, return_tensors="pt").input_ids
    g = model.generate(ids, max_new_tokens=16, do_sample=True, temperature=1.0,
                       top_p=0.95, pad_token_id=tok.eos_token_id)
    print("seed=42 run %d: %r" % (trial + 1, tok.decode(g[0][ids.shape[1]:])))

for trial in range(3):                                    # no seed set
    ids = tok(prompt, return_tensors="pt").input_ids
    g = model.generate(ids, max_new_tokens=16, do_sample=True, temperature=1.0,
                       top_p=0.95, pad_token_id=tok.eos_token_id)
    print("no seed run %d: %r" % (trial + 1, tok.decode(g[0][ids.shape[1]:])))`,
      out: `  seed=42 run 1: ' spend $17 billion on new transportation infrastructure, according to a Bloomberg News report.'
  seed=42 run 2: ' spend $17 billion on new transportation infrastructure, according to a Bloomberg News report.'
  seed=42 run 3: ' spend $17 billion on new transportation infrastructure, according to a Bloomberg News report.'

  no seed run 1: ' see a surge in new housing density, but the average new housing unit per square'
  no seed run 2: ' need to provide enough of a living space to ensure that workers will continue working as'
  no seed run 3: ' need 2.7 times the amount of new housing that is needed to replace the'`,
      hl: [4, 5],
      caption: "At temperature 1.0 with a fixed seed, three runs produce one output. Without the seed, three runs produce three. The seed is doing exactly what it claims to do — locally." },

    { t: "p", text: "The word doing the work there is *locally*. This ran in one process, on one machine, with one library version, against weights that did not move. A hosted model has none of those guarantees, and the seed cannot supply them." },

    /* ============================================================ 02 */
    { t: "h2", n: "02", id: "what-it-does-not", text: "What a seed cannot fix",
      sub: "Four sources of variation, and the seed addresses one" },

    { t: "viz", title: "Where a response can change", caption: "A seed fixes one box. Everything to its left can move without any request parameter changing, and nothing in the response tells you which one did.",
      svg: `<svg viewBox="0 0 760 232" width="100%" role="img" aria-label="Sources of non-determinism in a hosted model response">
  <rect x="14" y="40" width="168" height="66" rx="8" class="s-fill" style="stroke:var(--crit)" stroke-width="1.3"/>
  <text x="98" y="62" text-anchor="middle" class="s-label">model weights</text>
  <text x="98" y="80" text-anchor="middle" class="s-sub">a silent version update</text>
  <text x="98" y="96" text-anchor="middle" class="s-sub">changes everything</text>

  <rect x="196" y="40" width="168" height="66" rx="8" class="s-fill" style="stroke:var(--crit)" stroke-width="1.3"/>
  <text x="280" y="62" text-anchor="middle" class="s-label">hardware and kernels</text>
  <text x="280" y="80" text-anchor="middle" class="s-sub">a different GPU reorders</text>
  <text x="280" y="96" text-anchor="middle" class="s-sub">the floating-point sums</text>

  <rect x="378" y="40" width="168" height="66" rx="8" class="s-fill" style="stroke:var(--warn)" stroke-width="1.3"/>
  <text x="462" y="62" text-anchor="middle" class="s-label">batch composition</text>
  <text x="462" y="80" text-anchor="middle" class="s-sub">who else is in your batch</text>
  <text x="462" y="96" text-anchor="middle" class="s-sub">perturbs your logits</text>

  <rect x="560" y="40" width="186" height="66" rx="8" class="s-fill-2" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="653" y="62" text-anchor="middle" class="s-label" style="fill:var(--good)">the sampling draw</text>
  <text x="653" y="80" text-anchor="middle" class="s-sub">this is the one</text>
  <text x="653" y="96" text-anchor="middle" class="s-sub">a seed fixes</text>

  <line x1="14" y1="128" x2="546" y2="128" style="stroke:var(--crit)" stroke-width="1.6"/>
  <text x="280" y="148" text-anchor="middle" class="s-sub" style="fill:var(--crit)">outside your control — and temperature=0 does not help with any of it</text>

  <line x1="560" y1="128" x2="746" y2="128" style="stroke:var(--good)" stroke-width="1.6"/>
  <text x="653" y="148" text-anchor="middle" class="s-sub" style="fill:var(--good)">seed, or temperature=0</text>

  <text x="14" y="184" class="s-sub">system_fingerprint changes when the first two do — which is the only signal you get.</text>
  <text x="14" y="204" class="s-sub">Measured below: batch composition alone shifted GPT-2's logits by 1.984e-04 on identical input.</text>
</svg>` },

    { t: "p", text: "Four sources, three of which a seed has no access to." },

    { t: "dl", items: [
      ["Model weights", "Providers update models behind an alias. `gpt-4o` in March and `gpt-4o` in September are different weights, and the second one will answer differently no matter what you seed. Pinning a dated version — `gpt-4o-2024-08-06` — is the defence, and 12.4 is the lesson about what happens when that version is retired."],
      ["Hardware and kernels", "Floating-point addition is not associative, so summing the same numbers in a different order gives a slightly different result. A request routed to a different GPU generation, or served by a kernel that tiles the matmul differently, produces slightly different logits from identical input."],
      ["Batch composition", "Your request is batched with whatever else arrived at the same moment. The batch size and padding change how the matrix multiplications are shaped, which changes the summation order, which changes the logits. You have no control over who you are batched with."],
      ["The sampling draw", "The one a seed fixes. On a hosted model it is also the one you can remove entirely by setting `temperature=0`."]
    ] },

    /* ============================================================ 03 */
    { t: "h2", n: "03", id: "measured", text: "Measuring the part nobody can seed away",
      sub: "The same prompt, in a batch of one and a batch of four" },

    { t: "p", text: "The third item is the one that sounds like folklore, so it is worth measuring. Take one prompt, run it alone, then run the identical prompt padded into a batch, and compare the logits." },

    { t: "code", lang: "python", title: "g13.py — batch composition against the logits", code: `tok.pad_token   = tok.eos_token
tok.padding_side = "left"                     # so the LAST position is real text

with torch.no_grad():
    solo = model(ids).logits[0, -1]           # the prompt, alone

for bs in (1, 4, 16):
    b = tok([prompt] * bs, return_tensors="pt", padding=True)
    with torch.no_grad():
        r = model(**b).logits[0, -1]          # the identical prompt, in a batch
    print("batch of %-3d max |diff| from the solo run: %.3e   top-1 %.8f"
          % (bs, (r - solo).abs().max().item(), torch.softmax(r, -1).max()))`,
      out: `  3 greedy runs produced 1 distinct output(s)

  same prompt, alone vs left-padded in a batch of 2:
    max absolute difference across 50,257 logits: 0.000e+00
    argmax alone: ' have'   argmax batched: ' have'
    top-1 probability alone 0.20496754  batched 0.20496754

  and the same prompt at two batch sizes:
    batch of 1   max |diff| from the solo run: 0.000e+00   top-1 0.20496754
    batch of 4   max |diff| from the solo run: 1.984e-04   top-1 0.20497057
    batch of 16  max |diff| from the solo run: 1.984e-04   top-1 0.20497057`,
      hl: [11, 12, 13],
      caption: "Identical input, identical weights, one process, no sampling anywhere. A batch of 4 shifts the logits by 1.984e-04 and the top probability from 0.20496754 to 0.20497057 — purely because the matmul was shaped differently." },

    { t: "p", text: "Nothing changed except the shape of the tensor the arithmetic ran on. The difference is small — about two parts in ten thousand on a logit — and it is entirely a consequence of floating-point addition not being associative. A batched matmul accumulates in a different order, and the last bits differ." },

    { t: "callout", kind: "insight", title: "This is why temperature=0 is not deterministic on a server",
      body: [
        { t: "p", text: "Greedy decoding returns the argmax. If two logits are 1.984e-04 apart and a batching change perturbs them by that much, the argmax can flip — and once it flips, the next token is conditioned on a different history and the two responses diverge completely. A difference in the fourth decimal place of one logit becomes a different paragraph." },
        { t: "p", text: "It does not flip often, because most of the time the leader is well clear of second place. It flips exactly on the requests where the model was undecided — which, on the kind of borderline input you most want to be stable, is not a rare population." },
        { t: "p", text: "So `temperature=0` removes the *sampling* randomness completely and honestly. What it cannot remove is the arithmetic, and the arithmetic depends on traffic you do not control." }
      ] },

    { t: "callout", kind: "trap", title: "\"It is deterministic\" is a claim about your machine",
      body: [
        { t: "p", text: "Three greedy runs in the measurement above produced one distinct output, and a batch of 1 differed from the solo run by exactly 0.000e+00. Both are true and neither generalises: one process, one thread count, one batch size, one build of PyTorch." },
        { t: "p", text: "Change any of those and the guarantee goes. Even locally, `OMP_NUM_THREADS` can change a reduction order. The honest statement is that determinism is a property of a fixed computational environment, not of a parameter." }
      ] },

    /* ============================================================ 04 */
    { t: "h2", n: "04", id: "fingerprint", text: "system_fingerprint, and what it is for",
      sub: "The only signal a provider gives you that the backend moved" },

    { t: "p", text: "OpenAI returns a `system_fingerprint` on every completion. It identifies the backend configuration — weights, serving stack, and whatever else they consider part of the deployment. The contract is: **if the fingerprint changes, do not expect the same output even with the same seed**." },

    { t: "code", lang: "python", title: "reproducible.py — using the fingerprint properly", code: `def call(messages, *, seed=42):
    r = client.chat.completions.create(
        model="gpt-4o-2024-08-06",          # pin a DATED version, not an alias
        messages=messages,
        temperature=0,
        seed=seed,
    )
    return {
        "text": r.choices[0].message.content,
        "fingerprint": r.system_fingerprint,     # record it, always
        "model": r.model,                        # what actually served the request
    }

# The check that matters is not "is the output identical" -- it is
# "did the thing underneath change without us being told".
baseline = call(messages)
...
current = call(messages)
if current["fingerprint"] != baseline["fingerprint"]:
    log.warning("backend moved: %s -> %s; re-run the eval before trusting output",
                baseline["fingerprint"], current["fingerprint"])`,
      caption: "Recording the fingerprint alongside every cached or evaluated response turns a silent backend change into a logged event. Note that `r.model` can differ from the model you asked for — another thing worth storing." },

    { t: "callout", kind: "good", title: "Reproducibility that actually holds",
      body: [
        { t: "p", text: "**Pin a dated model version.** An alias is a moving target by design. This is the single largest source of drift and the easiest to remove." },
        { t: "p", text: "**Set `temperature=0`,** which removes the sampling draw entirely — a stronger guarantee than a seed at a non-zero temperature, and one that does not depend on the provider implementing seeds well." },
        { t: "p", text: "**Set a seed anyway,** for the cases where you cannot use temperature 0, and record it." },
        { t: "p", text: "**Record `system_fingerprint` and `model` with every response you keep.** These are what let you answer \"did the model change\" six months later." },
        { t: "p", text: "**Cache on `(prompt, model_version, parameters, seed)`.** This is the only approach that gives a genuine guarantee, because it does not ask the model to be deterministic — it asks it once and remembers. For anything that must be byte-identical on re-read, such as a published report or a legal summary, this is the answer rather than a seed." }
      ] },

    { t: "p", text: "That last point is the one worth internalising. If a system's correctness depends on an LLM returning the same bytes twice, the fix is not a better seed — it is to stop asking twice. Store the output the first time, key it on everything that could change it, and serve the stored copy. Everything else is an attempt to make a hosted, batched, floating-point system behave like a pure function, and it will be wrong occasionally in ways you find out about from a user." },

    /* ============================================================ exercise */
    { t: "exercise", kind: "Challenge", title: "Find out how close the top two logits have to be for batching to flip them",
      difficulty: "advanced", minutes: 30,
      body: [
        { t: "p", text: "The measurement showed a batching perturbation of 1.984e-04 on GPT-2's logits. Greedy decoding flips when that perturbation exceeds the gap between the top two candidates." },
        { t: "p", text: "Find out how often that happens on real prompts: what fraction of positions have a top-two gap small enough to be at risk." }
      ],
      requirements: [
        "Run a passage of at least 200 tokens through the model and collect the logits at every position",
        "At each position, compute the gap between the highest and second-highest logit",
        "Report the fraction of positions where that gap is below 1.984e-04, and below ten times that",
        "Report the smallest gap found, and decode the two tokens that were that close",
        "State in one line what this implies for a greedy pipeline whose output is compared against a stored baseline"
      ],
      hint: "`torch.topk(logits, 2)` per position gives you both values at once; the model returns logits for every position in one forward pass, so no loop over the sequence is needed.",
      solution: { lang: "python", title: "g17_ex.py",
        code: `import torch
from transformers import GPT2LMHeadModel, GPT2TokenizerFast

tok = GPT2TokenizerFast.from_pretrained("gpt2")
model = GPT2LMHeadModel.from_pretrained("gpt2").eval()

TEXT = ("The history of computing is usually told as a history of machines, "
        "but it is at least as much a history of notation. " * 12)

ids = tok(TEXT, return_tensors="pt").input_ids[:, :400]
with torch.no_grad():
    logits = model(ids).logits[0]              # every position at once

top2 = torch.topk(logits, 2, dim=-1)
gaps = (top2.values[:, 0] - top2.values[:, 1])

PERTURB = 1.984e-04
for threshold in (PERTURB, 10 * PERTURB, 100 * PERTURB, 1.0):
    n = int((gaps < threshold).sum().item())
    print("gap < %-10.2e : %4d of %4d positions (%.2f%%)"
          % (threshold, n, len(gaps), 100.0 * n / len(gaps)))

i = int(gaps.argmin())
print()
print("smallest gap: %.3e at position %d" % (gaps[i].item(), i))
print("  the two tokens: %r and %r"
      % (tok.decode([int(top2.indices[i, 0])]), tok.decode([int(top2.indices[i, 1])])))
print("  their logits  : %.6f and %.6f" % (top2.values[i, 0], top2.values[i, 1]))`,
        out: `gap < 1.98e-04   :    0 of  301 positions (0.00%)
gap < 1.98e-03   :    0 of  301 positions (0.00%)
gap < 1.98e-02   :    1 of  301 positions (0.33%)
gap < 1.00e+00   :   27 of  301 positions (8.97%)

smallest gap: 1.566e-02 at position 29
  the two tokens: ' a' and ' often'
  their logits  : -115.710083 and -115.725739`,
        notes: [
          { t: "p", text: "No position in 301 had a gap within a hundred-fold of the measured perturbation except one, and none was within ten-fold. So on this text a batch-shape change would not alter the greedy output at all. That is the honest result, and it is more useful than a scarier one: the mechanism is real, the margin is usually comfortable, and a greedy pipeline therefore looks perfectly deterministic — for months." },
          { t: "p", text: "The smallest gap is the instructive one: `' a'` against `' often'`, 1.566e-02 apart — about eighty times the perturbation, so safe here, but only just, and a busier server reorders more arithmetic than a change of batch shape in one process does. 8.97% of positions were within a single logit of each other, which is the more general point: the model is undecided far more often than its confident-looking output suggests, and those are the positions where a flip is invisible in a diff of quality and loud in a diff of bytes." },
          { t: "p", text: "The implication for a greedy pipeline compared against a stored baseline: byte-equality is the wrong assertion. It will fail occasionally for reasons that have nothing to do with your code, and chasing those failures wastes time that should go into a semantic check — did the answer still contain the right fields, did it still reach the right label. 8.10 is about building that check instead." }
        ] } },

    /* ============================================================ scenario */
    { t: "callout", kind: "scenario", title: "Incident: the golden-file test suite that failed once a fortnight",
      body: [
        { t: "p", text: "**Symptom.** A test suite asserted that 40 prompts produced byte-identical output to stored golden files, at `temperature=0` with a pinned model. It passed hundreds of times and then failed, roughly every two weeks, on one or two prompts, never the same ones. Re-running the failed job usually passed." },
        { t: "p", text: "**The wrong conclusion.** After the third occurrence the team added a retry, which hid the failures for two months. Then the provider shipped a genuine behaviour change and the retry hid that too — for eleven days, until a customer reported it." },
        { t: "p", text: "**Mechanism.** Batch composition. At `temperature=0` the sampling draw is gone, but the logits are not bit-stable: changing batch shape alone perturbed them by 1.984e-04 in the measurement above. Most positions sit far clear of that — in 301 positions of real text, none was within ten-fold of it — which is exactly why the suite passed hundreds of times. A production server reorders more arithmetic than a change of batch shape does, and across 40 prompts of a few hundred tokens the rare near-tie eventually gets flipped. The retry worked because the next request landed in a different batch." },
        { t: "p", text: "**Fix.** Byte-equality was replaced with assertions on what the output had to *contain* — the required fields, the extracted values, the classification label — plus a similarity floor against the golden text to catch wholesale drift. `system_fingerprint` was recorded per run and compared against the previous one, so a genuine backend change raises a distinct, loud failure that a retry cannot hide. The eleven-day gap is the part worth remembering: the retry did not just mask noise, it masked the one signal the suite existed to produce." }
      ] }
  ],

  takeaways: [
    "A seed fixes the **sampling draw** and nothing else. Measured locally, three runs at temperature 1.0 with seed 42 produced one identical output; three unseeded runs produced three different ones.",
    "Three sources of variation are outside a seed's reach: **model weights** behind a moving alias, **hardware and kernel** differences, and **batch composition**.",
    "**Batch composition is measurable.** The same prompt with identical weights in one process gave logits 1.984e-04 apart between a batch of 1 and a batch of 4, shifting the top probability from 0.20496754 to 0.20497057.",
    "That is why `temperature=0` is not deterministic on a hosted model: greedy returns the argmax, and a perturbation larger than the top-two gap flips it — after which the two responses diverge entirely.",
    "Floating-point addition is not associative, so a differently shaped matmul accumulates in a different order. Nothing about the request changed; only the tensor's shape did.",
    "Measured over 301 positions, **none** had a top-two gap within ten times the perturbation and one was within a hundred times — the margin is usually comfortable, which is why a greedy pipeline looks deterministic until it is not.",
    "**8.97% of positions had a top-two gap under 1.0 logit.** The model is undecided far more often than its confident-looking output suggests, and those are the positions at risk.",
    "**Pin a dated model version**, not an alias. This is the largest source of drift and the easiest to remove.",
    "Record `system_fingerprint` and the returned `model` with every response you keep — they are the only signal that the backend moved.",
    "For output that must be identical on re-read, **cache on `(prompt, model_version, parameters, seed)`**. Do not ask a batched floating-point system to behave like a pure function; ask it once and remember."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "You set `temperature=0`, pin a dated model version, and send the same prompt twice an hour apart. What can still differ?",
        options: ["Nothing — those two settings are sufficient", "The logits, because batch composition and hardware change the floating-point summation order", "Only the response latency", "The tokenization of the prompt"],
        answer: 1,
        why: "Greedy removes the sampling draw and a pinned version removes weight drift, but neither touches the arithmetic: the measured run showed a batch of 4 shifting the logits by 1.984e-04 against a batch of 1, with identical weights in one process. Where the top-two gap is smaller than that, the argmax flips and the responses diverge completely. The first option is the belief the lesson is against. Latency does vary but is not the interesting answer. Tokenization is deterministic given the same text and tokenizer version, so the fourth is wrong." },

      { stem: "What does a change in `system_fingerprint` tell you?",
        options: ["Your request was malformed", "The backend configuration changed, so the same seed no longer implies the same output", "The model is overloaded", "Your seed was ignored"],
        answer: 1,
        why: "The fingerprint identifies the backend configuration — weights and serving stack — and the provider's contract is that reproducibility claims hold only within a fingerprint. A change means the ground moved, which is why it belongs in your logs beside every stored response. The first and third options invent meanings the field does not carry. The fourth is closer but wrong in kind: the seed is still applied, it just no longer selects the same behaviour because what it is seeding has changed underneath it." },

      { stem: "Your greedy test suite asserts byte-identical output and fails about once a fortnight on random prompts. What should you do?",
        options: ["Add a retry, since the failures are transient", "Replace byte-equality with assertions on what the output must contain, and alert separately on fingerprint changes", "Raise the temperature so the variation is expected", "Pin a different model version"],
        answer: 1,
        why: "Byte-equality is the wrong assertion for a hosted model: the logits are not bit-stable across batch shapes, and a small fraction of positions sit close enough to a tie to be flipped by that — a failure rate that has nothing to do with your code. A retry masks the noise — and, as the incident shows, masks the genuine backend change the suite exists to catch. Raising the temperature adds variation rather than removing it. Pinning a different version does not help, because the version was already pinned and is not the source." },

      { stem: "A legal summarisation feature must produce the identical summary every time a document is re-opened. What is the right design?",
        options: ["temperature=0 with a fixed seed", "Cache the output keyed on (document, model version, parameters, seed) and serve the cached copy", "A higher top_p for stability", "Retry until two consecutive calls agree"],
        answer: 1,
        why: "Nothing in the request parameters can make a batched floating-point system behave like a pure function — the measurement shows the logits moving with batch shape alone. The only genuine guarantee is not to ask twice: generate once, store it, and key the cache on everything that could change the answer. The first option is best-effort and will be wrong occasionally, which for a legal artefact is the wrong risk profile. The third has nothing to do with stability. The fourth costs double and still gives no guarantee, since two calls can agree and a third disagree." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "A favourite question because the naive answer — \"set temperature to 0\" — is half right, and the other half is where the engineering is.",
    questions: [
      { level: "core",
        q: "How do you get reproducible outputs from an LLM?",
        strong: "A strong answer starts with the honest framing — best-effort, not guaranteed — lists the levers in order of how much they buy, and ends with caching as the only real guarantee.",
        answer: [
          { t: "p", text: "The honest answer is that you get best-effort reproducibility, not guaranteed. In order of how much each lever buys: pin a dated model version rather than an alias, because a provider moving the weights behind `gpt-4o` is the largest source of drift and the easiest to remove. Set `temperature=0`, which removes the sampling draw entirely. Set a seed for the cases where you cannot use temperature 0." },
          { t: "p", text: "Then record `system_fingerprint` and the returned `model` with every response you keep. Those are the only signals you get that the backend moved, and without them a change is invisible until someone complains." },
          { t: "p", text: "And if the requirement is genuinely that the same input produces the same bytes — a published report, a legal summary — then the answer is not a parameter at all. Cache on `(prompt, model version, parameters, seed)` and serve the stored copy. Asking a hosted, batched, floating-point system to behave like a pure function will be wrong occasionally, and you find out from a user." }
        ] },

      { level: "advanced",
        q: "Why is temperature=0 not deterministic, if no sampling is happening?",
        strong: "A strong answer names floating-point non-associativity and batch composition specifically, and explains how a tiny perturbation becomes a completely different response.",
        answer: [
          { t: "p", text: "Greedy decoding returns the argmax, which is deterministic *given the logits*. The logits are not stable. Floating-point addition is not associative, so summing the same numbers in a different order gives a slightly different result — and the order depends on how the matrix multiplication was tiled, which depends on the batch shape and the hardware." },
          { t: "p", text: "I measured this locally: the identical prompt in a batch of 4 gave logits 1.984e-04 away from the same prompt alone, same weights, same process, no sampling anywhere. Just a differently shaped tensor." },
          { t: "p", text: "Then the amplification. Where the top two logits are closer together than that perturbation, the argmax flips — and once it flips, every subsequent token is conditioned on a different history, so a difference in the fourth decimal place becomes a different paragraph. Over 301 positions of real text, none had a top-two gap within ten times that perturbation and about 9% were within a single logit — so the margin is usually comfortable, which is precisely why a greedy pipeline looks deterministic for months and then fails on the one borderline position." }
        ] },

      { level: "advanced",
        q: "A team's golden-file tests fail intermittently. They want to add a retry. What do you say?",
        strong: "A strong answer explains why the failures are real signal about the wrong assertion, and — critically — what the retry costs them.",
        answer: [
          { t: "p", text: "The failures are not flaky in the usual sense; they are the test asserting something that is not true of a hosted model. Byte-equality cannot hold when batch composition perturbs the logits and a fraction of positions are within that perturbation of a tie. The suite is measuring the provider's batching, not the team's code." },
          { t: "p", text: "The problem with the retry is what it costs, and I would lead with that rather than with the principle. A retry hides this noise — and it hides a genuine backend change identically, because that also fails on the first attempt. So the one signal the suite exists to produce is now indistinguishable from the noise it was added to suppress. I have seen that gap run to more than a week before a customer noticed." },
          { t: "p", text: "What I would put in its place: assert on what the output must contain — the fields, the extracted values, the label — with a similarity floor against the golden text to catch wholesale drift. Then compare `system_fingerprint` against the previous run as a separate, loud check, so a backend change raises a failure no retry can absorb." }
        ] },

      { level: "expert",
        q: "Your evaluation scores moved by two points and nothing in your repository changed. How do you find out what happened?",
        strong: "A strong answer separates the hypotheses, names the cheap discriminating check for each, and knows that the answer depends on instrumentation that has to already exist.",
        answer: [
          { t: "p", text: "Three hypotheses, and they are cheaply separable. The backend changed; the eval data changed; or the measurement is noisy and two points is within its error bars." },
          { t: "p", text: "I would check the last one first because it is free: what is the confidence interval on the score? Two points on a 200-example eval set is very often nothing at all — 9.16 is the lesson about the statistics nobody runs, and it is the most common explanation for a mysterious move." },
          { t: "p", text: "For the backend, the discriminating check is `system_fingerprint` and the returned `model` field, compared against the previous run. If they moved, that is the answer, and the follow-up is a paired evaluation on the old and new backends rather than a comparison against a remembered number. If nobody recorded them, that is the finding — the instrumentation was missing and this is unanswerable this time, so the first fix is to record them from now on." },
          { t: "p", text: "For the data, a hash of the eval set per run answers it in seconds. All three of these are things that have to be recorded *before* you need them, which is really the point: this question is a test of whether the pipeline was instrumented, not of how clever the investigation is. 12.5 is the lesson about instrumenting for exactly this." }
        ] }
    ]
  }
});
