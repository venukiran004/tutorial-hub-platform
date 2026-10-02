EC.receiveLesson({
  id: "7.3",

  lede: "SFT is the same loss as pretraining on different data, with one detail that decides whether it works: compute the loss **only on the response tokens**. Measured on gpt2 over four instruction pairs, the prompt accounts for **54% to 89% of the total loss** \u2014 so an unmasked run spends most of its gradient learning to write the user\u2019s turn. I expected the unmasked loss to come out *lower*, on the theory that prompt tokens are formulaic. It came out **higher** \u2014 4.1217 against 2.8448 \u2014 because a base model has never seen the chat template, which makes the mistake worse than I predicted rather than better.",

  objectives: [
    "Implement loss masking and say exactly what the IGNORE index does",
    "Quantify how much of an unmasked SFT loss is prompt loss",
    "Diagnose the classic symptom of a missing mask",
    "Use a chat template correctly and explain why hand-formatting degrades quality silently",
    "Choose an SFT dataset size from the goal, and weigh quality against quantity"
  ],

  prerequisites: ["7.1", "4.1"],

  blocks: [

    { t: "h2", n: "01", id: "same-loss", text: "The same loss, different data",
      sub: "Which is why the masking detail is the whole lesson" },

    { t: "p", text: "SFT trains on `(prompt, response)` pairs with ordinary cross-entropy \u2014 the identical objective from 7.2. There is no new mathematics. What changes is that the data now has *structure*: part of each sequence is input the model should condition on, and part is output it should learn to produce." },

    { t: "p", text: "Cross-entropy does not know the difference. If you hand it the concatenated sequence it supervises every position, which means it trains the model to generate the prompt as well as the response \u2014 and generating prompts is not the job." },

    { t: "code", lang: "python", title: "the mask, from scratch", code: `IGNORE = -100                      # PyTorch cross-entropy ignores this index

prompt_ids   = tok("<|user|>\nSummarise this email.\n<|assistant|>\n").input_ids
response_ids = tok("Here is the summary: ...<|end|>").input_ids

input_ids = prompt_ids + response_ids
labels    = [IGNORE] * len(prompt_ids) + response_ids   # only the answer is supervised

loss = F.cross_entropy(
    logits[:, :-1].reshape(-1, V),                      # shift: predict token t+1
    torch.tensor(labels[1:]).reshape(-1),
    ignore_index=IGNORE,
)`,
      hl: [7, 12],
      caption: "The input is the whole sequence; the labels are masked. Note the shift \u2014 position t predicts token t+1, so labels are offset by one." },

    { t: "callout", kind: "insight", title: "What IGNORE actually does, precisely",
      body: [
        { t: "p", text: "`ignore_index=-100` removes those positions from **both the numerator and the denominator** of the mean. So masked tokens contribute no gradient *and* do not dilute the average \u2014 the reported loss is the mean over response tokens only." },
        { t: "p", text: "That second half matters for interpreting training curves. A masked and an unmasked run produce losses that are not comparable, because they are averages over different token sets, so you cannot read one against the other to decide whether masking helped." },
        { t: "p", text: "The value \u2212100 is not magic, it is just PyTorch\u2019s default for `ignore_index`. Any value works if you pass it explicitly, and the reason for a negative sentinel is that it can never collide with a real vocabulary index." }
      ] },

    { t: "code", lang: "python", title: "g73.py \u00a7C \u2014 the mask, token by token", code: `for i, t in enumerate(prompt_ids + response_ids):
    label = labels[i]`,
      out: `  pos  token          label      supervised?
  0    'User'         IGNORE     no
  1    ':'            IGNORE     no
  2    ' What'        IGNORE     no
  ...
  9    '\n'           IGNORE     no
  10   'Assistant'    IGNORE     no
  11   ':'            IGNORE     no
  12   ' The'         383        YES
  13   ' capital'     3139       YES
  14   ' of'          286        YES
  15   ' France'      4881       YES
  16   ' is'          318        YES
  17   ' Paris'       6342       YES
  18   '.'            13         YES`,
      hl: [9, 10, 11],
      caption: "The boundary is at \u2018Assistant:\u2019. Everything before it conditions; everything after it is supervised." },

    { t: "h2", n: "02", id: "measured", text: "How much of the loss is prompt",
      sub: "The claim is about where the gradient goes, so measure it" },

    { t: "code", lang: "python", title: "g73.py \u00a7A \u2014 masked loss, full loss, and the prompt's share", code: `lab = torch.tensor([IGNORE] * len(pid) + rid)[1:]
l_mask   = F.cross_entropy(lg, lab, ignore_index=IGNORE).item()
l_full   = F.cross_entropy(lg, tgt_full).item()
l_prompt = F.cross_entropy(lg[:n_p], tgt_full[:n_p]).item()
share    = 100 * (n_p * l_prompt) / (n_p * l_prompt + n_r * l_mask)`,
      out: `  example                             p_toks  r_toks   masked L     full L  % prompt
  ummarise this email in one line.        14      12     4.8048     5.0125     54.0%
  hat is the capital of France?           12       7     0.9287     3.3418     89.2%
  rite a one-sentence apology for a       17      14     2.7295     3.8031     66.5%
  onvert 25 degrees Celsius to Fahr       12       8     2.9160     4.3292     71.6%

  totals: 51 prompt tokens vs 41 response tokens`,
      hl: [7, 10],
      caption: "Prompt tokens are 55% of the sequence and 54\u201389% of the loss \u2014 so they dominate the gradient by more than their count." },

    { t: "callout", kind: "trap", title: "I predicted the unmasked loss would be lower. It was higher.",
      body: [
        { t: "p", text: "My script printed \u201cthe unmasked loss is LOWER here, which is the trap: it looks like a better run\u201d, reasoning that prompt tokens are formulaic and therefore easy. The measurement says the opposite \u2014 mean masked loss **2.8448**, mean unmasked loss **4.1217**." },
        { t: "p", text: "The reason is specific to the situation SFT is actually in. A base model has **never seen this chat template**. \u201cUser:\u201d, the newline, \u201cAssistant:\u201d \u2014 none of that scaffolding is familiar, so those tokens are *hard* to predict and carry high loss. My intuition was imported from an already-instruction-tuned model, where the template is routine." },
        { t: "p", text: "Which makes the error worse than I claimed rather than more subtle. An unmasked run does not merely dilute the signal \u2014 the prompt is the *largest* term in the objective, so the model is predominantly being trained to emit user turns and template scaffolding." }
      ] },

    { t: "callout", kind: "insight", title: "And it explains the 89% row",
      body: [
        { t: "p", text: "\u201cWhat is the capital of France?\u201d has the lowest response loss of the four at **0.9287** \u2014 7.1 showed why, since that sentence is near-cliché for gpt2. So the response is easy and the template is not, and the prompt\u2019s share of the loss reaches **89.2%**." },
        { t: "p", text: "That is the worst case for an unmasked run: the thing you want to teach is already known, and essentially all of the gradient goes to the thing you do not want to teach. Nine tenths of the update is about producing \u201cUser:\u201d and a question." },
        { t: "p", text: "The general pattern follows: the better the model already is at the response, the larger the fraction of an unmasked gradient that is actively harmful. So the bug gets *more* damaging as your base model gets stronger, which is the opposite of how most bugs behave." }
      ] },

    { t: "code", lang: "python", title: "g73.py \u00a7B \u2014 the two losses are not comparable", code: `print("mean masked   loss (response only):", sum(ms) / len(ms))
print("mean unmasked loss (everything)   :", sum(fs) / len(fs))`,
      out: `  mean masked   loss (response only): 2.8448
  mean unmasked loss (everything)   : 4.1217`,
      hl: [1, 2],
      caption: "Averages over different token sets. Neither number is wrong; comparing them directly would be." },

    { t: "callout", kind: "warn", title: "The interview trap, and its exact symptom",
      body: [
        { t: "p", text: "\u201cYour SFT model started asking itself questions.\u201d The cause is a missing mask, and the symptom is specific: the model generates a plausible answer and then continues with \u201cUser:\u201d and a new question, because that is what it was trained to do after a response." },
        { t: "p", text: "It is easy to misdiagnose as a stopping problem and patch with a stop sequence, which hides it. The model will still be spending part of every update on question generation, so quality suffers in ways a stop token does not address." },
        { t: "p", text: "The quick check is to print the labels for one training example, as \u00a7C does, and confirm the prompt positions are `-100`. It takes a minute and it is the first thing I would look at on any SFT run behaving oddly." }
      ] },

    { t: "viz", title: "Where an unmasked gradient goes", caption: "Prompt tokens are 55% of the sequence and 54\u201389% of the loss, because the template is unfamiliar to a base model.",
      svg: `<svg viewBox="0 0 760 270" width="100%" role="img" aria-label="Prompt share of loss across four examples">
  <text x="16" y="22" class="s-label">PROMPT'S SHARE OF THE UNMASKED LOSS</text>
  <line x1="150" y1="200" x2="700" y2="200" stroke="var(--line)" stroke-width="1.2"/>
  <text x="140" y="60" text-anchor="end" class="s-mono" style="font-size:10px">100%</text>
  <text x="140" y="130" text-anchor="end" class="s-mono" style="font-size:10px">50%</text>
  <text x="140" y="204" text-anchor="end" class="s-mono" style="font-size:10px">0%</text>
  <line x1="150" y1="130" x2="700" y2="130" stroke="var(--line)" stroke-width="0.8" stroke-dasharray="3 3"/>
  <text x="706" y="127" class="s-sub" style="font-size:9px">55% of tokens</text>

  <rect x="186" y="124" width="80" height="76" rx="2" class="s-fill" style="stroke:var(--warn)" stroke-width="1.4"/>
  <text x="226" y="117" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--warn)">54.0%</text>
  <text x="226" y="218" text-anchor="middle" class="s-sub" style="font-size:9px">summarise</text>

  <rect x="310" y="75" width="80" height="125" rx="2" class="s-fill" style="stroke:var(--crit)" stroke-width="1.6"/>
  <text x="350" y="68" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--crit)">89.2%</text>
  <text x="350" y="218" text-anchor="middle" class="s-sub" style="font-size:9px">capital of France</text>

  <rect x="434" y="106" width="80" height="94" rx="2" class="s-fill" style="stroke:var(--warn)" stroke-width="1.4"/>
  <text x="474" y="99" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--warn)">66.5%</text>
  <text x="474" y="218" text-anchor="middle" class="s-sub" style="font-size:9px">apology</text>

  <rect x="558" y="99" width="80" height="101" rx="2" class="s-fill" style="stroke:var(--warn)" stroke-width="1.4"/>
  <text x="598" y="92" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--warn)">71.6%</text>
  <text x="598" y="218" text-anchor="middle" class="s-sub" style="font-size:9px">C to F</text>

  <text x="16" y="244" class="s-mono" style="fill:var(--crit)">the easiest response gives the WORST ratio \u2014 89% of the update teaches the user's turn</text>
  <text x="16" y="262" class="s-sub">so the bug gets more damaging as the base model gets stronger, not less</text>
</svg>` },

    { t: "h2", n: "03", id: "templates", text: "Chat templates",
      sub: "The structure 7.1 showed was missing" },

    { t: "p", text: "7.1 measured a base model putting 33.84% of its next-token mass on a newline after a question \u2014 it had no representation of a turn ending. A chat template is what supplies that representation, which makes it structural rather than cosmetic." },

    { t: "code", lang: "python", title: "always derive the template, never hand-format", code: `messages = [{"role": "user", "content": "Summarise this email."},
            {"role": "assistant", "content": "Here is the summary: ..."}]
text = tokenizer.apply_chat_template(messages, tokenize=False)`,
      hl: [3],
      caption: "Every model family has its own special-token layout. The tokeniser knows it; you do not." },

    { t: "callout", kind: "warn", title: "The wrong template degrades quality silently",
      body: [
        { t: "p", text: "This is the same failure shape as 6.8\u2019s embedding-model mismatch, and it is worth noticing the pattern. Nothing errors \u2014 the tokens are valid, the forward pass succeeds, the model produces fluent text. It is simply never seeing the turn boundaries it was trained on, so it performs worse for no visible reason." },
        { t: "p", text: "Hand-formatting is how it happens. Writing `\"User: ...\\nAssistant: \"` because it looks like what the model expects produces something that is *nearly* right, and nearly right is the dangerous case \u2014 close enough to work, wrong enough to cost quality." },
        { t: "p", text: "`apply_chat_template` reads the layout from the tokeniser configuration, so it is correct by construction for whatever checkpoint you loaded. The one thing to watch is `add_generation_prompt`, which controls whether the assistant turn is opened for the model to continue \u2014 you want it at inference and not when building training targets." }
      ] },

    { t: "h2", n: "04", id: "data", text: "How much data, and of what quality",
      sub: "The one place quantity has a known ceiling" },

    { t: "table",
      head: ["Goal", "Examples needed", "Why this order of magnitude"],
      rows: [
        ["Output format, JSON shape", "100 \u2013 1,000", "You are teaching a surface pattern the model can already produce"],
        ["Domain tone and task behaviour", "1,000 \u2013 10,000", "Behaviour across varied inputs needs coverage of the variation"],
        ["General instruction-following from scratch", "10,000 \u2013 100,000+", "The whole behavioural repertoire, which is what a lab builds"]
      ] },

    { t: "callout", kind: "insight", title: "Quality beats quantity, and the mechanism is the loss",
      body: [
        { t: "p", text: "LIMA is the standard citation \u2014 a thousand carefully curated examples competitive with far larger noisy sets. The reason follows from what SFT is doing: if you are teaching a *shape* rather than facts, a clean demonstration of the shape is worth many muddled ones." },
        { t: "p", text: "And the asymmetry is real: a few hundred bad examples can undo thousands of good ones, because cross-entropy has no notion of an example being wrong. A badly formatted or factually poor response is a target the model is pushed toward with exactly the same force as a good one." },
        { t: "p", text: "Which connects to 7.1\u2019s second asymmetry. SFT trains on one target per prompt and treats every other phrasing as incorrect, so a noisy demonstration does not merely add nothing \u2014 it actively teaches a specific wrong output. Preference methods are more tolerant here, because they only claim one response beats another." }
      ] },

    { t: "exercise", kind: "build", title: "Audit your SFT masking and measure what it saves", difficulty: "core", minutes: 30,
      body: "For your own SFT dataset and base model, verify the mask is applied correctly by printing labels for a few examples, then quantify what the mask is buying: the prompt's share of the unmasked loss, and the prompt's share of the token count. Report both, because they differ.",
      requirements: [
        "Print input_ids beside labels for at least two examples and confirm the boundary",
        "Compute masked loss, full loss and prompt-only loss separately",
        "Report the prompt's share of loss and its share of tokens",
        "Note whether your prompt share of loss exceeds its share of tokens, and explain why",
        "Confirm you build training labels without add_generation_prompt"
      ],
      hint: "If the prompt's loss share is far above its token share, your base model finds the template unfamiliar — which is normal before SFT and means an unmasked run would be dominated by scaffolding.",
      solution: { lang: "python", title: "the audit", code: `IGNORE = -100

def audit(prompt, response, tok, model):
    pid, rid = tok(prompt).input_ids, tok(response).input_ids
    ids = torch.tensor([pid + rid])
    with torch.no_grad():
        lg = model(ids).logits[0, :-1]          # shift for next-token prediction
    tgt = ids[0, 1:]

    lab = torch.tensor([IGNORE] * len(pid) + rid)[1:]
    l_mask = F.cross_entropy(lg, lab, ignore_index=IGNORE).item()
    l_full = F.cross_entropy(lg, tgt).item()

    n_p, n_r = len(pid) - 1, len(rid)
    l_prompt = F.cross_entropy(lg[:n_p], tgt[:n_p]).item()

    loss_share = (n_p * l_prompt) / (n_p * l_prompt + n_r * l_mask)
    tok_share  = n_p / (n_p + n_r)
    return l_mask, l_full, 100 * loss_share, 100 * tok_share

for p, r in EXAMPLES:
    lm, lf, ls, ts = audit(p, r, tok, model)
    print("masked %.4f  full %.4f  loss-share %.1f%%  token-share %.1f%%"
          % (lm, lf, ls, ts))`,
        out: `  masked 4.8048  full 5.0125  loss-share 54.0%  token-share 52.0%
  masked 0.9287  full 3.3418  loss-share 89.2%  token-share 61.1%
  masked 2.7295  full 3.8031  loss-share 66.5%  token-share 53.3%
  masked 2.9160  full 4.3292  loss-share 71.6%  token-share 57.9%`,
        notes: [
          { t: "p", text: "**Loss share exceeds token share in every row**, and that is the finding. Prompt tokens are 52\u201361% of the sequences and 54\u201389% of the loss, so they dominate the gradient by more than their count \u2014 the opposite of what I assumed when writing the script." },
          { t: "p", text: "**The cause is that the template is unfamiliar.** A base model has never seen \u201cUser:\u201d, the newline, \u201cAssistant:\u201d as a turn structure, so those tokens carry high loss. My prediction that prompt tokens would be cheap came from thinking about an already-tuned model, where it would be true." },
          { t: "p", text: "**Row two is the instructive extreme.** Its response loss is 0.9287 \u2014 the easiest of the four, because \u201cThe capital of France is Paris\u201d is near-cliché \u2014 so 89.2% of an unmasked gradient would go to the prompt. The better the model already is at the response, the larger the harmful fraction." },
          { t: "p", text: "**Do not compare masked and full loss as if they were the same metric.** They are means over different token sets, so a run with masking will report a *higher* number here and be strictly better. Mistaking that for a regression is an easy way to \u201cfix\u201d the wrong thing." },
          { t: "p", text: "One caveat on these specific numbers: they are from gpt2 with a hand-written `User:/Assistant:` layout, chosen to make the mechanism visible. A real run uses `apply_chat_template` with the model's own special tokens, and those are single tokens rather than words, so the absolute shares will differ \u2014 the inequality between loss share and token share is the part that generalises." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "SFT is pretraining\u2019s loss on structured data, and the structure is exactly what cross-entropy cannot see. Masking is how you tell it, and `ignore_index` removes those positions from both the gradient and the average." },
        { t: "p", text: "Hold the measured version: prompt tokens were 55% of the sequence and up to 89% of the loss. So an unmasked run is not slightly diluted, it is mostly training the wrong thing \u2014 and it gets worse as the base model gets better at responses." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cWe fine-tuned a model on our support transcripts and now it answers, then invents a follow-up question from the customer. What happened?\u201d**" },
        { t: "p", text: "Almost certainly a missing loss mask. If you train on the concatenated prompt and response without masking, cross-entropy supervises every position, so the model learns to produce the user\u2019s turn as well as the assistant\u2019s \u2014 and after finishing a response, the thing it was trained to emit next is \u201cUser:\u201d and a question." },
        { t: "p", text: "The fix is to set the prompt positions to \u2212100 so `cross_entropy` drops them, and the check is to print labels beside input ids for one example and confirm the boundary. That takes a minute and it is the first thing I would look at." },
        { t: "p", text: "What I would push back on is patching it with a stop sequence. That hides the symptom and leaves the real cost in place, because the model is still spending a large share of every update on the wrong objective. I measured that share on gpt2: prompt tokens were 55% of the sequence but 54 to 89% of the loss." },
        { t: "p", text: "The reason the share exceeds the token count surprised me \u2014 I had assumed prompt tokens would be cheap because templates are formulaic. They are not, for a base model that has never seen the template, so those tokens carry high loss. Which means the bug is worse than the token ratio suggests, and it is worst exactly when the model already answers well: on the example whose response loss was lowest, 89% of the gradient went to the prompt." },
        { t: "p", text: "While I was in there I would also check the template itself came from `apply_chat_template` rather than being hand-written, because the wrong layout degrades quality with nothing erroring \u2014 the same silent shape as using mismatched embedding models for a query and an index." }
      ] }
  ],

  takeaways: [
    "**SFT is pretraining's loss on structured data**, and cross-entropy cannot see the structure \u2014 so masking is how you tell it which positions are output.",
    "**`ignore_index=-100` removes positions from the gradient and from the average**, so masked and unmasked losses are means over different token sets and are not comparable.",
    "**Measured, prompt tokens were 55% of the sequence and 54\u201389% of the loss** \u2014 they dominate an unmasked gradient by more than their count.",
    "**I predicted the unmasked loss would be lower and it was higher** \u2014 4.1217 against 2.8448 \u2014 because a base model has never seen the chat template, so those tokens are hard.",
    "**So the bug is worse than dilution**: the prompt is the largest term in an unmasked objective, and the model is predominantly trained to emit user turns and scaffolding.",
    "**And it worsens as the base model improves.** The example with the lowest response loss gave the worst ratio, 89.2% \u2014 the easier the response, the larger the harmful fraction.",
    "**The symptom is specific**: the model answers, then writes \u201cUser:\u201d and a new question. Patching it with a stop sequence hides the cost without removing it.",
    "**Check by printing labels beside input ids** and confirming the prompt positions are \u2212100 \u2014 a one-minute check and the first thing to look at on an odd SFT run.",
    "**Always use `apply_chat_template`**, because the wrong layout degrades quality with nothing erroring \u2014 the same silent shape as an embedding-model mismatch.",
    "**Watch `add_generation_prompt`**: you want it at inference and not when building training targets.",
    "**Dataset size follows the goal** \u2014 100\u20131,000 for a format, 1,000\u201310,000 for behaviour, 10,000\u2013100,000+ for instruction-following from scratch.",
    "**Quality beats quantity because SFT teaches a shape**, and a few hundred bad examples teach a specific wrong output with exactly the force of a good one."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Measured on gpt2, prompt tokens were 55% of the sequence but 54\u201389% of the unmasked loss. Why does the loss share exceed the token share?",
        options: [
          "Prompt tokens are longer on average, so they carry more probability mass",
          "A base model has never seen the chat template, so \u2018User:\u2019, newlines and \u2018Assistant:\u2019 are hard to predict and carry high loss",
          "Cross-entropy weights earlier positions more heavily than later ones",
          "The response tokens were masked out of the full-loss computation as well"
        ],
        answer: 1,
        why: "The intuition that templates are formulaic and therefore cheap applies to an already-instruction-tuned model, not to the base model SFT starts from \u2014 which has no familiarity with turn scaffolding at all. That makes an unmasked run worse than simple dilution would suggest: the prompt becomes the largest term in the objective, so most of the update teaches the model to emit user turns. Cross-entropy weights all positions equally, and the full loss supervises every position by definition." },

      { stem: "On the example whose response loss was lowest (0.9287, \u201cThe capital of France is Paris\u201d), the prompt's share of unmasked loss was highest at 89.2%. What general pattern does this show?",
        options: [
          "Short responses always produce high prompt loss shares",
          "The better the model already is at the response, the larger the fraction of an unmasked gradient that is actively harmful \u2014 so the bug worsens as the base model improves",
          "Cliché responses should be removed from SFT datasets",
          "The example was mislabelled and its loss should have been higher"
        ],
        answer: 1,
        why: "The prompt's share is a ratio, so when the response term shrinks the prompt term dominates. Here the response is near-cliché for gpt2 \u2014 7.1 measured it ranking \"Paris\" above the alternatives \u2014 so nine tenths of an unmasked update would go to producing \"User:\" and a question. This inverts the usual expectation that bugs matter less on stronger models, and it is a reason to verify masking rather than infer it from training curves." },

      { stem: "A masked SFT run reports a higher loss than an unmasked one. What should you conclude?",
        options: [
          "The mask is implemented incorrectly and is discarding response tokens",
          "Nothing \u2014 the two are means over different token sets, so they are not comparable, and the masked run is the correct one",
          "The learning rate needs lowering to compensate for the reduced token count",
          "The unmasked run is converging faster and should be preferred"
        ],
        answer: 1,
        why: "`ignore_index` removes masked positions from the denominator as well as the numerator, so a masked loss is the mean over response tokens only while an unmasked loss averages over everything. Measured, the masked loss was 2.8448 and the unmasked 4.1217 \u2014 and the masked run is strictly better despite reporting a higher number, because the unmasked objective includes a large term you do not want optimised. Reading the comparison as a regression is a direct route to removing the mask." },

      { stem: "Why should chat formatting come from apply_chat_template rather than being written by hand?",
        options: [
          "Hand-formatting is slower and harder to maintain across datasets",
          "Each model family has its own special-token layout, and the wrong one degrades quality with nothing erroring \u2014 the model never sees the turn boundaries it was trained on",
          "apply_chat_template also applies the loss mask automatically",
          "Hand-written templates cannot represent multi-turn conversations"
        ],
        answer: 1,
        why: "Hand-written formatting that looks right produces something nearly right, which is the dangerous case: valid tokens, a successful forward pass, fluent output, and silently worse performance because the turn structure differs from training. This is the same failure shape as querying an index with a different embedding model \u2014 no error, just degradation. The template is read from the tokeniser configuration, so it is correct by construction; masking remains your responsibility, as does setting add_generation_prompt only at inference." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "The detail that decides whether SFT works",
    questions: [
      { level: "core",
        q: "Walk me through how you would implement SFT.",
        strong: "A strong answer makes masking the centrepiece and knows why.",
        answer: [
          { t: "p", text: "Same loss as pretraining \u2014 cross-entropy on next-token prediction \u2014 on `(prompt, response)` pairs, with the one detail that decides whether it works: compute the loss only on the response tokens. Build labels as `[-100] * len(prompt) + response_ids` and pass `ignore_index=-100`." },
          { t: "p", text: "That removes the prompt positions from the gradient and from the average. Without it you train the model to generate the user\u2019s turn, and the symptom is specific \u2014 it answers, then writes \u201cUser:\u201d and invents a follow-up question." },
          { t: "p", text: "I would quantify why it matters rather than treat it as hygiene. On gpt2 across four instruction pairs, prompt tokens were 55% of the sequence and 54 to 89% of the loss \u2014 so an unmasked run is mostly training the wrong objective. The share exceeds the token count because a base model has never seen the template, so the scaffolding tokens are expensive to predict." },
          { t: "p", text: "The rest is the shift and the template. Labels are offset by one because position t predicts token t+1, which is an easy off-by-one. And the format comes from `apply_chat_template`, with `add_generation_prompt` on at inference and off when building training targets." }
        ] },

      { level: "core",
        q: "How much SFT data do you need, and does quality or quantity matter more?",
        strong: "A strong answer ties the sizing to what SFT is actually teaching.",
        answer: [
          { t: "p", text: "It depends on what you are teaching, and the ranges are roughly: 100 to 1,000 examples for an output format or JSON shape, 1,000 to 10,000 for domain tone and task behaviour, and 10,000 to 100,000 or more for general instruction-following from scratch \u2014 which is lab work rather than product work." },
          { t: "p", text: "Quality dominates, and LIMA is the standard citation \u2014 a thousand curated examples competitive with far larger noisy sets. The mechanism follows from what SFT does: you are teaching a shape rather than facts, since the knowledge came from pretraining, and a clean demonstration of the shape beats many muddled ones." },
          { t: "p", text: "The asymmetry is the part worth stating. A few hundred bad examples can undo thousands of good ones, because cross-entropy has no concept of an example being wrong \u2014 a poor response is a target the model is pushed toward with exactly the force of a good one." },
          { t: "p", text: "That also explains why preference methods are more forgiving here. SFT asserts one response is *the* answer and treats every alternative phrasing as incorrect; a preference pair only asserts that one response beats another, which is a weaker and more defensible claim." }
        ] },

      { level: "advanced",
        q: "What silent failures should you look for in a fine-tuning pipeline?",
        strong: "A strong answer groups them by the fact that nothing errors.",
        answer: [
          { t: "p", text: "The ones where nothing raises an exception, which in my experience is most of the expensive ones. A missing loss mask is first \u2014 training proceeds normally, the loss curve looks fine, and the model learns to write user turns. Checking it is printing labels beside input ids for one example." },
          { t: "p", text: "A mismatched chat template is second, and it is the same shape: valid tokens, successful forward pass, fluent output, quietly worse quality because the model never sees the turn boundaries it was trained on. Hand-formatting is how it happens, because \u201cnearly right\u201d is close enough to look correct." },
          { t: "p", text: "Then the off-by-one in the label shift, which usually shows up as a model that is subtly confused rather than broken, and `add_generation_prompt` left on while building training targets, which trains the model to produce the opening of its own turn." },
          { t: "p", text: "The pattern across all of these is that the loss number alone will not tell you. Masked and unmasked losses are averages over different token sets, so they are not even comparable \u2014 a correctly masked run reports a *higher* loss, which I have seen treated as a regression. So I would rely on inspecting one fully-materialised example rather than on curves." }
        ] }
    ]
  }
});
