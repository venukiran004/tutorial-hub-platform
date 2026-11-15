EC.receiveLesson({
  id: "1.11",

  lede: "An image does not arrive at a language model as an image. It arrives as tokens, and the number of them is computable before you send anything — which matters, because **one phone photograph sent with the default settings costs 14,364 input tokens** on a current flagship, as much as forty pages of text. This lesson implements the counting rule, checks it against the provider's own worked figures, shows that the three major providers count the same picture three different ways, and finds the one setting that moves the bill sixty-fold.",

  objectives: [
    "Compute the token cost of an image from its dimensions and the detail setting",
    "Explain what the low, high and original settings each buy and cost",
    "Predict the effect of resizing an image before sending it",
    "Budget a multimodal request the way you would a text one",
    "Recognise when an image is the wrong input entirely"
  ],

  prerequisites: ["1.5"],

  blocks: [

    /* ============================================================ 01 */
    { t: "h2", n: "01", id: "the-formula", text: "Images become tokens, by a rule you can run",
      sub: "Patches of pixels, counted and multiplied" },

    { t: "p", text: "On OpenAI's current models the rule is short: cover the image with 32-pixel squares, count them, and multiply by a per-model factor — 1.2 for the GPT-6 and GPT-5.6 families. What makes it interesting is the resizing that happens first, which depends on a request field called `detail`, and on what that field defaults to." },

    { t: "code", lang: "python", title: "g111.py — the patch rule, implemented", code: `import math

PATCH = 32

def patches(w, h):
    return math.ceil(round(w / PATCH, 6)) * math.ceil(round(h / PATCH, 6))

def img_tokens(w, h, detail="high", multiplier=1.2):
    if detail == "low":                              # fit inside 512 x 512
        s = min(512 / w, 512 / h, 1.0)
        w, h = w * s, h * s
    elif detail == "high" and patches(w, h) > 2500:  # at most 2,500 patches
        r = math.sqrt(PATCH * PATCH * 2500 / (w * h))
        r *= min(math.floor(w * r / PATCH) / (w * r / PATCH),      # land on whole
                 math.floor(h * r / PATCH) / (h * r / PATCH))      # patches
        w, h = w * r, h * r
    # detail == "original": the dimensions are kept as they are
    return math.ceil(round(patches(w, h) * multiplier, 6))`,
      hl: [9, 10, 12, 13, 17],
      caption: "Three branches, three budgets. `low` shrinks the image to fit a 512-pixel square, `high` shrinks it until 2,500 patches cover it, and `original` does not shrink it at all. The budgets are GPT-6 Astra's, as OpenAI's image guide listed them in November 2026." },

    { t: "code", lang: "python", title: "g111.py — checked against the guide, then six images", code: `print("the three worked figures in OpenAI's guide, detail=high:")
for w, h, want in ((1024, 1024, 1229), (2048, 2048, 3000), (4096, 512, 2458)):
    print("  %-10s -> %5d   guide says %d" % ("%dx%d" % (w, h), img_tokens(w, h), want))
print()
print("  %-12s %7s %7s %9s" % ("image", "low", "high", "original"))
for w, h in ((512, 512), (1024, 1024), (1600, 1600), (2048, 2048),
             (4032, 3024), (4096, 4096)):
    print("  %-12s %7d %7d %9d" % ("%dx%d" % (w, h), img_tokens(w, h, "low"),
                                   img_tokens(w, h, "high"), img_tokens(w, h, "original")))`,
      out: `the three worked figures in OpenAI's guide, detail=high:
  1024x1024  ->  1229   guide says 1229
  2048x2048  ->  3000   guide says 3000
  4096x512   ->  2458   guide says 2458

  image            low    high  original
  512x512          308     308       308
  1024x1024        308    1229      1229
  1600x1600        308    3000      3000
  2048x2048        308    3000      4916
  4032x3024        231    2942     14364
  4096x4096        308    3000     19661`,
      hl: [11, 12],
      caption: "The implementation reproduces all three of the guide's worked figures, so the table beneath them can be trusted. Read the last two columns: `high` stops at 3,000 tokens however large the image is, and `original` does not stop." },

    { t: "callout", kind: "trap", title: "The default now charges for every pixel",
      body: [
        { t: "p", text: "`detail` defaults to `auto`, and on GPT-6 Astra `auto` means `original`. So a request that never mentions `detail` sends a 4032×3024 phone photograph at **14,364 tokens**, where `high` would have cost 2,942 and `low` 231." },
        { t: "p", text: "On the models of two years earlier the default went the other way. An image was fitted into a fixed grid of tiles before it was counted, so a 4K upload cost the same 765 tokens as a 1024-pixel one and the extra megapixels were simply discarded. Code and cost estimates written against that rule — and there is a great deal of both — are now wrong by more than an order of magnitude, in the expensive direction." },
        { t: "p", text: "There is a hard edge above it as well: an image needing more than 30,000 patches is **rejected**, not resized. A 6000×6000 scan is 35,344 patches, so the same code that quietly overpaid for a phone photograph fails outright on a flatbed scan." }
      ] },

    { t: "viz", title: "One phone photograph, three settings", caption: "The same 4032×3024 image on GPT-6 Astra. The bar lengths are to scale: `original` is 62 times `low`.",
      svg: `<svg viewBox="0 0 760 196" width="100%" role="img" aria-label="Image token cost of one photograph at three detail settings">
  <text x="20" y="24" class="s-label">input tokens for one 4032x3024 photograph</text>

  <rect x="20" y="40" width="11" height="26" rx="3" style="fill:var(--good)" opacity="0.85"/>
  <text x="40" y="58" class="s-mono">231</text>
  <text x="96" y="58" class="s-sub">detail="low" — shrunk to fit 512x512</text>

  <rect x="20" y="84" width="143" height="26" rx="4" style="fill:var(--warn)" opacity="0.8"/>
  <text x="172" y="102" class="s-mono">2,942</text>
  <text x="236" y="102" class="s-sub">detail="high" — shrunk to 2,500 patches</text>

  <rect x="20" y="128" width="700" height="26" rx="4" style="fill:var(--crit)" opacity="0.75"/>
  <text x="30" y="146" class="s-mono" style="fill:var(--ink)">14,364</text>
  <text x="100" y="146" class="s-sub" style="fill:var(--ink)">detail="original", which is what auto means here — nothing shrunk</text>

  <text x="20" y="182" class="s-sub">At $10 per million input tokens: $0.0023, $0.0294 and $0.1436 per photograph.</text>
</svg>` },

    /* ============================================================ 02 */
    { t: "h2", n: "02", id: "what-detail-buys", text: "What the detail setting is actually choosing",
      sub: "How many pixels survive the trip to the model" },

    {"kind": "trace", "title": "Detail is a price dial, and often buys nothing", "caption": "One 4032×3024 photograph costs $0.1436 at `original`, $0.0294 at `high` and $0.0023 at `low` — **62×** from top to bottom, measured. Whether the top is worth paying turns entirely on whether the question needs resolution. \"Is there a person in this photo?\" is answered by a 512-pixel view, and sixty times the tokens changes nothing. \"What does this sign say?\" is exactly what the pixels are for.", "left": "the question", "codeW": 220, "vars": ["detail", "why"], "steps": [{"code": "Is there a person in this photo?", "state": ["low", "512px answers it"], "tone": "good"}, {"code": "Which of these four layouts?", "state": ["low", "coarse structure"], "tone": "good"}, {"code": "What does this sign say?", "state": ["high", "text needs resolution"], "changed": [0], "tone": "accent"}, {"code": "Read the table in this scan", "state": ["high, or OCR", "see section 05"], "tone": "warn"}, {"code": "Click the button in a screenshot", "state": ["original", "coordinates must hold"], "changed": [0], "tone": "violet"}], "t": "diagram", "id": "dg-1_11-02-0"},

    { t: "p", text: "`detail=\"low\"` gives the model a view of the whole image no larger than 512 pixels on a side. `detail=\"high\"` gives it up to 2,500 patches — a 1600×1600 image passes through untouched and anything larger is shrunk to that budget. `detail=\"original\"` sends the pixels you uploaded. The difference is whether the model can read small text and resolve fine structure, and what it costs is the whole of this table:" },

    { t: "code", lang: "python", title: "g111.py — the price of detail", code: `RATE = 10.00        # dollars per 1M input tokens

W, H = 4032, 3024                                   # a 12-megapixel phone photograph
for detail in ("low", "high", "original"):
    t = img_tokens(W, H, detail)
    print("%-9s %6d tokens  $%.5f per image  $%8.2f per 10,000 images"
          % (detail, t, t * RATE / 1e6, t * RATE / 1e6 * 10000))
print("original / low : %.1fx" % (img_tokens(W, H, "original") / img_tokens(W, H, "low")))
print("original / high: %.1fx" % (img_tokens(W, H, "original") / img_tokens(W, H, "high")))`,
      out: `low          231 tokens  $0.00231 per image  $   23.10 per 10,000 images
high        2942 tokens  $0.02942 per image  $  294.20 per 10,000 images
original   14364 tokens  $0.14364 per image  $ 1436.40 per 10,000 images
original / low : 62.2x
original / high: 4.9x`,
      caption: "At GPT-6 Astra's $10 per million input tokens. Fourteen cents an image sounds like nothing until you multiply by a document pipeline's volume — and it is the price of not setting one field." },

    { t: "table",
      head: ["Task", "Detail", "Why"],
      rows: [
        ["\"Is there a person in this photo?\"", "`low`", "A 512-pixel view answers it; sixty times the tokens changes nothing"],
        ["\"What does this sign say?\"", "`high`", "Text needs resolution — this is what the patches are for"],
        ["\"Which of these four layouts is this?\"", "`low`", "Classification over coarse structure"],
        ["\"Read the table in this scan\"", "`high`, or do not use a vision model", "Dense text is what OCR is for — see §05"],
        ["\"Click the Save button in this screenshot\"", "`original`", "The answer is a pixel coordinate, so the image must not be rescaled"],
        ["\"Describe this image\"", "`low` first", "Measure whether more detail changes the answer before paying for it"]
      ],
      caption: "The default is `auto`, which lets the provider decide — and the provider's decision is the expensive one. For a pipeline processing the same kind of image repeatedly, choosing explicitly is worth the five minutes it takes to test." },

    { t: "callout", kind: "good", title: "Test whether detail changes the answer",
      body: [
        { t: "p", text: "Take 50 real images from your pipeline. Run each at `low` and at `high`. Compare the answers on whatever metric the task has." },
        { t: "p", text: "For a surprising number of tasks the answers are identical, and you have been paying many times over for nothing. For OCR-like tasks the difference is dramatic and obvious. Either way it is a half-hour experiment that settles the question with evidence instead of an assumption." },
        { t: "p", text: "Run the same comparison after any model upgrade. Vision encoders change between versions, the counting rule changed completely between two generations of the same provider's models, and a task that needed `high` on one model may not on the next." }
      ] },

    /* ============================================================ 03 */
    { t: "h2", n: "03", id: "three-providers", text: "The same picture, counted three ways",
      sub: "A cost model written for one provider is wrong on the next" },

    { t: "p", text: "The patch rule above is one provider's. The other two count differently enough that a cost estimate does not survive a migration:" },

    { t: "table",
      head: ["", "OpenAI · GPT-6 family", "Anthropic · current Claude models", "Google · Gemini 3 and 4"],
      rows: [
        ["Unit", "32-pixel patches × 1.2", "28-pixel patches", "a fixed charge per image"],
        ["What sets the cost", "pixel area, after the `detail` resize", "pixel area, up to a ceiling", "the resolution level only"],
        ["The control", "`detail`: `low`, `high`, `original`, `auto`", "resize before you send", "`resolution`: `low` 280, `medium` 560, `high` 1,120, `ultra_high` 2,240"],
        ["Ceiling per image", "none at `original`; rejected above 30,000 patches", "4,784 tokens, 2,576 px on the long edge", "the level you chose"],
        ["Default", "`auto`, which is `original` on Astra", "full size up to the ceiling", "1,120 tokens"]
      ],
      caption: "From each provider's image documentation in November 2026. Anthropic counts ⌈width / 28⌉ × ⌈height / 28⌉ visual tokens; Gemini does not look at the dimensions at all." },

    { t: "code", lang: "python", title: "g111.py — one image, three bills", code: `def claude_tokens(w, h, long_edge=2576, cap=4784):
    s = min(long_edge / max(w, h), 1.0)              # downscaled to the long-edge limit
    w, h = w * s, h * s
    return min(math.ceil(w / 28) * math.ceil(h / 28), cap)   # 28-px patches, capped

GEMINI = {"low": 280, "medium": 560, "high": 1120, "ultra_high": 2240}   # per image, any size

print("  %-12s %16s %12s %14s" % ("image", "OpenAI original", "Claude", "Gemini default"))
for w, h in ((512, 512), (1024, 1024), (2048, 2048), (4032, 3024)):
    print("  %-12s %16d %12d %14d" % ("%dx%d" % (w, h), img_tokens(w, h, "original"),
                                      claude_tokens(w, h), GEMINI["high"]))`,
      out: `  image         OpenAI original       Claude Gemini default
  512x512                   308          361           1120
  1024x1024                1229         1369           1120
  2048x2048                4916         4784           1120
  4032x3024               14364         4784           1120`,
      caption: "A thumbnail is cheapest on OpenAI and dearest on Gemini; a phone photograph is the other way round, by a factor of thirteen. Which provider is cheap for images depends on how big your images are — and that is before the three different prices per token." },

    { t: "callout", kind: "insight", title: "The counting rule is a property of the model, not of the image",
      body: [
        { t: "p", text: "Text has the same problem in miniature — 1.14 measures one sentence at 73 tokens under one encoding and 57 under another. Images have it at full size: the same file is 308, 361 or 1,120 tokens depending only on where it is sent, and 14,364 or 231 depending on one field." },
        { t: "p", text: "The practical consequence is that the image counter belongs with the model configuration, versioned alongside the model id. When the model changes, the counter changes with it, and the cost dashboard does not silently keep applying last year's rule." }
      ] },

    /* ============================================================ 04 */
    { t: "h2", n: "04", id: "budgeting", text: "Budgeting a multimodal request",
      sub: "Images are input tokens and share the window with everything else" },

    {"kind": "flow", "title": "Image tokens are input tokens, and they cannot be truncated", "caption": "Everything from 1.5 applies unchanged — image tokens count against the window and leave less room for output. What is different is that they arrive in **large indivisible blocks**. You can drop a retrieved chunk to make room; you cannot shave 200 tokens off an image. So a multimodal budget has to be computed before the prompt is assembled, not trimmed afterwards.", "cols": 3, "nodes": [{"id": "i", "label": "An image is input tokens", "sub": "2,574 for a scanned page", "tone": "accent"}, {"id": "w", "label": "Counted against the window", "sub": "like any other input", "tone": "accent"}, {"id": "b", "label": "But indivisible", "sub": "no partial image", "tone": "crit"}, {"id": "t", "label": "So text cannot be trimmed to fit", "sub": "the block is all or nothing", "tone": "crit"}, {"id": "c", "label": "Compute the budget first", "sub": "images, then output, then prompt", "tone": "good"}, {"id": "d", "label": "Or decide to send fewer images", "sub": "or smaller ones", "tone": "teal"}], "edges": [["i", "w"], ["w", "b"], ["b", "t"], ["t", "c"], ["c", "d"]], "t": "diagram", "id": "dg-1_11-03-1"},

    { t: "p", text: "Everything from 1.5 applies unchanged: image tokens are input tokens, they count against the context window, and they leave less room for output. What is different is that they arrive in large indivisible blocks — you cannot truncate an image to fit." },

    { t: "code", lang: "python", title: "multimodal_budget.py", code: `def plan(images, prompt, *, window=1_050_000, reserve_output=30_000, detail="high"):
    costs = [img_tokens(w, h, detail) for (w, h) in images]

    text = count_tokens(prompt)                 # the model's own counter (1.14)
    total = text + sum(costs)
    room  = window - reserve_output             # reasoning and answer need the rest (1.10)

    return {
        "text_tokens":  text,
        "image_tokens": sum(costs),
        "per_image":    costs,
        "fits":         total <= room,
        "images_that_fit": next(
            (i for i in range(len(costs), -1, -1)
             if text + sum(costs[:i]) <= room), 0),
    }

# An A4 page scanned at 150 dpi is 1240 x 1754: 39 x 55 patches, 2,574 tokens.
#   40 pages  = 102,960 image tokens -- fits, and costs $1.03 in input on Astra.
#   400 pages = 1,029,600            -- does not fit a 1,050,000 window once the
#                                       output reserve is taken, and there is no
#                                       partial page to drop.`,
      caption: "The `images_that_fit` calculation exists because the failure is all-or-nothing per image. Dropping half a document's pages is a decision, and it should be an explicit one rather than a truncation you discover later. With million-token windows the constraint that binds first is usually the bill rather than the window — and a request above 272,000 input tokens is charged at the higher long-context rate (1.15)." },

    { t: "callout", kind: "warn", title: "Images do not compress like text",
      body: [
        { t: "p", text: "When a text prompt is too long you can summarise, chunk, or drop the least relevant passage. An image is its full token count or it is absent — there is no half-price version that keeps the important half." },
        { t: "p", text: "The levers are `detail` and a resize before upload, and both are steps rather than sliders in what the model can then see. So a multimodal budget is much lumpier than a text one, and the planning has to happen before the request rather than as a graceful degradation inside it." },
        { t: "p", text: "For video the same logic applies with a much worse constant. Sent as frames to a patch-counting model, thirty seconds at one 1280×720 frame per second is 30 images and 33,120 tokens; a five-minute clip is 331,200. Gemini, which takes video natively, charges 70 tokens a frame and 25 a second for the audio — 2,850 tokens for the same thirty seconds. Either way the question is which frames, not whether to send them all." }
      ] },

    /* ============================================================ 05 */
    { t: "h2", n: "05", id: "wrong-tool", text: "When an image is the wrong input",
      sub: "A vision model is not an OCR engine, and is priced accordingly" },

    {"kind": "flow", "title": "Plausible-but-wrong costs more to find than obviously-wrong", "caption": "A vision model will read a scanned document, often well. It will also cost 2,574 tokens a page, take seconds, and occasionally hallucinate a digit — and that is the whole argument. **An OCR engine with low confidence produces garbage that is obviously garbage**; a vision model produces plausible numbers. The first failure is caught by the next person who looks; the second is caught by an audit, months later, if at all.", "cols": 3, "nodes": [{"id": "s", "label": "A scanned table", "sub": "the case that comes up constantly", "tone": "accent"}, {"id": "v", "label": "A vision model reads it", "sub": "2,574 tokens a page, seconds", "tone": "warn"}, {"id": "o", "label": "OCR reads it", "sub": "cheaper, and faster", "tone": "good"}, {"id": "p", "label": "Fails as plausible numbers", "sub": "one digit, quietly wrong", "tone": "crit"}, {"id": "g", "label": "Fails as obvious garbage", "sub": "with a confidence score", "tone": "good"}, {"id": "c", "label": "The second failure is cheaper", "sub": "11.1 is why models produce the first", "tone": "teal"}], "edges": [["s", "v"], ["s", "o"], ["v", "p"], ["o", "g"], ["p", "c"], ["g", "c"]], "t": "diagram", "id": "dg-1_11-04-2"},

    { t: "p", text: "The case that comes up constantly is a scanned document. A vision model will read it, often well. It will also cost 2,574 tokens per page, take seconds, and hallucinate a digit occasionally in a way that a dedicated OCR engine does not." },

    { t: "ul", items: [
      "**Dense text on a page** — an invoice, a form, a contract scan — is what OCR is built for. Run OCR, send the text. A page of extracted text is usually 300–800 tokens rather than 2,574 for its image, and it is greppable, diffable and auditable afterwards.",
      "**Layout and structure** — which box is a total, where the signature block is — is where a vision model beats OCR, because OCR discards the geometry that answers the question.",
      "**Both** is the common real answer: OCR for the text, a vision model for the layout questions, and 6.5's multimodal retrieval when the corpus is large.",
      "**Charts and diagrams** genuinely need vision. There is no text layer that answers \"is this line trending up\"."
    ] },

    { t: "p", text: "The failure mode worth naming is that a vision model reading a scanned table produces plausible numbers. An OCR engine with low confidence produces garbage that is obviously garbage. Plausible-but-wrong is much more expensive to discover than obviously-wrong, and 11.1 is the lesson about why models produce it." },

    /* ============================================================ exercise */
    { t: "exercise", kind: "Challenge", title: "Find the resize that bounds the bill",
      difficulty: "core", minutes: 20,
      body: [
        { t: "p", text: "The measurement showed a 4032×3024 photograph costing 14,364 tokens at the default and 2,942 at `detail=\"high\"`. A client-side resize before upload is a third option, and unlike `detail` it also saves the upload." },
        { t: "p", text: "A receipt-scanning feature receives 56,400 phone photographs a month. Work out what each choice costs, and where `high` and `original` stop being the same thing." }
      ],
      requirements: [
        "Implement the patch rule from §01",
        "For a 4:3 photograph, find the largest long side at which `high` and `original` cost the same",
        "Compute tokens and cost per photograph for: no resize at the default, `high`, client-side resizes to 1568, 1024 and 768 pixels on the long side, and `low`",
        "Report the monthly bill for each at $10 per million input tokens",
        "State which option you would ship, and what it gives up"
      ],
      hint: "`high` and `original` agree exactly while the image needs 2,500 patches or fewer, so sweep the long side and compare the two. The monthly bill is tokens × rate × volume — the interesting part is how far apart the rows are.",
      solution: { lang: "python", title: "g111_ex.py",
        code: `import math

PATCH = 32

def patches(w, h):
    return math.ceil(round(w / PATCH, 6)) * math.ceil(round(h / PATCH, 6))

def img_tokens(w, h, detail="high", multiplier=1.2):
    if detail == "low":
        s = min(512 / w, 512 / h, 1.0); w, h = w * s, h * s
    elif detail == "high" and patches(w, h) > 2500:
        r = math.sqrt(PATCH * PATCH * 2500 / (w * h))
        r *= min(math.floor(w * r / PATCH) / (w * r / PATCH),
                 math.floor(h * r / PATCH) / (h * r / PATCH))
        w, h = w * r, h * r
    return math.ceil(round(patches(w, h) * multiplier, 6))

RATE, PHOTOS = 10.00, 56_400            # dollars per 1M input tokens; photos a month

# 1. where does detail=high start capping a 4:3 photograph?
last_equal = max(L for L in range(256, 4033)
                 if img_tokens(L, L * 3 // 4, "high") == img_tokens(L, L * 3 // 4, "original"))
print("high and original agree up to a long side of %d px (%d tokens)"
      % (last_equal, img_tokens(last_equal, last_equal * 3 // 4, "original")))
print()

# 2. the bill for one month of phone photographs, by what the client does first
print("%-34s %8s %10s %12s" % ("client-side step", "tokens", "per photo", "per month"))
for label, long_side, detail in (("none, detail left at auto", 4032, "original"),
                                 ("none, detail=high",          4032, "high"),
                                 ("resize long side to 1568",   1568, "original"),
                                 ("resize long side to 1024",   1024, "original"),
                                 ("resize long side to 768",     768, "original"),
                                 ("none, detail=low",           4032, "low")):
    t = img_tokens(long_side, long_side * 3 // 4, detail)
    print("%-34s %8d %10.5f %12.2f" % (label, t, t * RATE / 1e6, t * RATE / 1e6 * PHOTOS))`,
        out: `high and original agree up to a long side of 1835 px (2993 tokens)

client-side step                     tokens  per photo    per month
none, detail left at auto             14364    0.14364      8101.30
none, detail=high                      2942    0.02942      1659.29
resize long side to 1568               2176    0.02176      1227.26
resize long side to 1024                922    0.00922       520.01
resize long side to 768                 519    0.00519       292.72
none, detail=low                        231    0.00231       130.28`,
        notes: [
          { t: "p", text: "The top row is the bill for doing nothing: **$8,101 a month**, against $130 at `low` — a 62× spread on identical traffic, decided by a field most code never sets. Setting `detail=\"high\"` alone is a fivefold saving and a one-line change, which makes it the first thing to ship." },
          { t: "p", text: "`high` and `original` are the same thing up to a long side of 1,835 pixels on a 4:3 image, because that is where 2,500 patches run out. So a client-side resize to anything at or below that makes the default harmless: the image arrives small enough that no setting can inflate it. That is a stronger guarantee than setting `detail`, because it survives someone removing the field, a model whose `auto` resolves differently, and a provider that counts pixels with no ceiling at all." },
          { t: "p", text: "What you would ship depends on what the model has to read. A resize to 1,024 pixels is $520 a month and keeps a receipt's total line legible; 768 is $293 and starts to lose small print; `low` at $130 is fine for the merchant's logo and useless for the amounts. The honest answer is the one from §02 — test the two cheapest candidates against 200 real receipts and pick the cheapest that holds accuracy — and the resize also shrinks a multi-megabyte upload to a small fraction of its size, which the user feels directly." }
        ] } },

    /* ============================================================ scenario */
    { t: "callout", kind: "scenario", title: "Incident: the receipt scanner whose bill was 40× the estimate",
      body: [
        { t: "p", text: "**Symptom.** An expense tool let users photograph receipts. The estimate — built from average text-request costs — put it at about $200 a month at the expected volume. The first full month came in at $8,100." },
        { t: "p", text: "**What was happening.** Phones were uploading 4032×3024 photographs. Each one cost 14,364 input tokens, because `detail` had never been set and the default `auto` sent every pixel. Users also, reasonably, photographed a receipt several times when the first attempt looked blurry, so the mean images per expense was 2.7 rather than 1." },
        { t: "p", text: "**Mechanism.** Two multipliers nobody had modelled. The cost estimate had been built from a text-only prototype and never revised when images were added; and the image-cost function in the team's dashboard was the tile rule from the previous model generation, which priced every photograph at a flat 765 tokens. The model had been upgraded, the counting rule had changed underneath it, and the dashboard was reporting a nineteenth of the real figure." },
        { t: "p", text: "**Fix.** A client-side resize to 1,024 pixels on the long side before upload, which bounded each photograph at 922 tokens whatever the default did and cut upload time noticeably — then an A/B on `detail=\"low\"` against the resized image over 200 real receipts, which found the larger image necessary for the total line and unnecessary for the merchant name, so the pipeline now makes two cheap calls instead of one expensive one where it can. The bill settled at about $520 a month. The durable change was that image tokens are now computed client-side with the counter for the model actually deployed, and logged per request beside `usage`, so the two can be reconciled — which is 11.7's whole argument." }
      ] }
  ],

  takeaways: [
    "Images become **input tokens**. On OpenAI's current models: cover the image with 32-pixel patches, count them, multiply by 1.2 — after a resize that depends on `detail`.",
    "`low` fits the image into 512×512, `high` shrinks it to at most 2,500 patches, and `original` sends every pixel. Measured on a 4032×3024 photograph: **231, 2,942 and 14,364 tokens**.",
    "**The default is the expensive branch.** `detail` defaults to `auto`, which on GPT-6 Astra means `original` — and an image above 30,000 patches is rejected rather than resized.",
    "The spread from `low` to `original` is **62×** on a phone photograph: $0.0023 against $0.1436 at $10 per million input tokens.",
    "`high` and `original` agree up to about 1,835 pixels on the long side of a 4:3 image, so **a client-side resize below that makes the default harmless** and saves the upload as well.",
    "**The three providers count the same picture three ways**: 32-pixel patches × 1.2 on OpenAI, 28-pixel patches capped at 4,784 tokens on Claude, and a flat 280 to 2,240 per image on Gemini whatever its size.",
    "The counting rule belongs to the model, not the image. The earlier tile rule priced any large image at a flat 765 tokens, so a cost function that outlives a model upgrade can be wrong by an order of magnitude.",
    "**Images do not compress like text.** There is no half-price version of an image — the levers are `detail` and a resize, so multimodal budgets must be planned before the request.",
    "Video multiplies the constant: thirty seconds at one 720p frame a second is 33,120 tokens as images. Choose frames; do not send them all.",
    "**A vision model is not an OCR engine.** Dense text is cheaper and more auditable through OCR; layout and charts are what vision is for; and a vision model misreading a table produces plausible numbers rather than obvious garbage."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "You send a 4032×3024 phone photograph to GPT-6 Astra without setting `detail`. Roughly how many input tokens does it cost?",
        options: ["About 300, the flat low-detail cost", "About 14,400 — every pixel is billed", "About 3,000, the high-detail ceiling", "It depends on the image content"],
        answer: 1,
        why: "`detail` defaults to `auto`, which on this model means `original`: the image is not resized, so it is 126 × 95 patches of 32 pixels, times 1.2 — 14,364 tokens. The 3,000 figure is what `high` would have cost, because `high` shrinks the image to 2,500 patches first, and roughly 300 is what `low` costs after fitting it into 512×512; neither applies unless you ask for it. Content is irrelevant: the cost is a function of dimensions and the setting alone." },

      { stem: "Your pipeline asks \"is there a person in this photo?\" at the default detail. What is the likely finding if you test `low`?",
        options: ["Accuracy collapses; more pixels always win", "Same answers, at a fraction of the tokens", "Low detail is not supported for photographs", "Latency increases at the low setting"],
        answer: 1,
        why: "Low detail gives the model a 512-pixel view of the whole image, which is ample for coarse recognition — and it costs 231 tokens against 14,364 on a phone photograph, a measured 62× difference. The task that genuinely needs the pixels is reading small text or resolving fine structure, not detecting whether a person is present. The first option assumes more resolution always helps, which is the assumption the half-hour A/B in §02 exists to test. Low detail is supported everywhere, and fewer tokens reduce latency rather than increasing it." },

      { stem: "You need to extract line items from 500 scanned invoices per day. What is the best architecture?",
        options: ["Send each page to a vision model at full detail", "OCR for text; vision only for layout questions", "Send each page at low detail to save tokens", "Send the whole PDF as a single image"],
        answer: 1,
        why: "Dense text on a page is what OCR is built for: it produces greppable, diffable output at typically 300–800 tokens a page, and a low-confidence OCR result is obviously garbage where a vision model's misreading is a plausible wrong number — much more expensive to discover. Vision earns its cost on the geometry OCR discards, such as which box is the total. Full detail on every page is the expensive default the closing incident was built on. Low detail would make the text unreadable, which is the one thing the pixels were for. A whole PDF as one image loses resolution on every page at once." },

      { stem: "Why does resizing a 4032×3024 photograph to 1,024 pixels on the long side before upload help?",
        options: ["It saves bandwidth only; tokens are unchanged", "It cuts tokens about sixteen-fold, at any default", "It changes which model reads the image", "It switches detail from original to low"],
        answer: 1,
        why: "At 1024×768 the image is 768 patches and 922 tokens, against 14,364 for the full-size upload, and because it is already under every resize budget no `detail` setting can make it cost more — the saving does not depend on a default staying put. The first option was true of the previous generation's tile rule, which discarded the extra pixels server-side after charging a flat rate, and is exactly the assumption that now costs money. The resize does not select a model or change `detail`; it changes what there is to count." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "Most candidates know images cost tokens; few can compute how many, and fewer know the rule changed.",
    questions: [
      { level: "core",
        q: "How do multimodal inputs affect token usage?",
        strong: "A strong answer gives a counting rule, a concrete number, and the fact that the rule and its default differ by provider and by model generation.",
        answer: [
          { t: "p", text: "Images are converted to input tokens and billed at the input rate, and the conversion is a function of the image's dimensions that you can compute before sending. On OpenAI's current models it is 32-pixel patches times 1.2, after a resize that depends on `detail`: `low` fits the image into 512 pixels, `high` shrinks it to 2,500 patches, `original` leaves it alone." },
          { t: "p", text: "The part that is usually missed is the default. `detail` is `auto` unless you set it, and on the flagship that means `original` — so a 12-megapixel phone photograph is 14,364 tokens, where `high` would be 2,942 and `low` 231. That is a 62× spread decided by a field most code never sets." },
          { t: "p", text: "And it is provider-specific. Claude counts 28-pixel patches up to a ceiling of a few thousand tokens; Gemini charges a flat amount per image by resolution level regardless of size. So I keep the image counter with the model configuration and reconcile it against `usage`, because the previous generation's rule priced any large image at a flat 765 tokens and a lot of dashboards still apply it." }
        ] },

      { level: "core",
        q: "When would you not use a vision model for a document?",
        strong: "A strong answer separates text from layout and names the failure mode that makes the distinction matter.",
        answer: [
          { t: "p", text: "When the question is about the text rather than the layout. Dense text on a page is what OCR is built for — a page of extracted text is typically 300–800 tokens against roughly 2,600 for the page image, and the output is greppable, diffable and auditable afterwards in a way an image is not." },
          { t: "p", text: "Vision earns its cost on the things OCR discards: which box is the total, where the signature block is, whether this chart is trending up. There is no text layer that answers the last one." },
          { t: "p", text: "The argument I would lead with, though, is the failure mode. An OCR engine reading a bad scan produces garbage that is obviously garbage, with a confidence score. A vision model reading the same scan produces a plausible number. Plausible-but-wrong is far more expensive to find than obviously-wrong, and on financial documents that difference is the whole risk." }
        ] },

      { level: "advanced",
        q: "A receipt-scanning feature costs 40 times its estimate. Where do you look?",
        strong: "A strong answer proposes the multipliers in order of likely size and knows that the detail default is the expensive branch.",
        answer: [
          { t: "p", text: "Three multipliers, and I would check them in this order. First, `detail`: if it was never set it is `auto`, and on a current flagship that sends every pixel. A phone photograph is then about 14,000 tokens rather than a few hundred, and phone photographs are always large." },
          { t: "p", text: "Second, images per transaction. Users photograph a receipt more than once when the first attempt looks blurry, so the real figure is often two or three, not one. That is a multiplier nobody puts in the estimate because it is a behaviour rather than a parameter." },
          { t: "p", text: "Third, the estimate itself. If it came from a cost function written for an earlier model, it may be applying a counting rule that no longer exists — the old tile rule capped a large image at 765 tokens, so a dashboard still using it under-reports by an order of magnitude and nobody is alerted." },
          { t: "p", text: "The fix that generalises is a client-side resize, which bounds the cost whatever the default does, plus computing image tokens with the deployed model's own rule and logging them per request. Then the bill is predictable from the traffic, and a 40× surprise becomes a dashboard rather than an invoice." }
        ] },

      { level: "advanced",
        q: "How would you handle video input?",
        strong: "A strong answer starts from the arithmetic, which rules out the naive approach immediately.",
        answer: [
          { t: "p", text: "Start with the number, because it settles the design. Sent as frames to a model that counts patches, one 720p frame is about 1,100 tokens, so thirty seconds at a frame a second is 33,000 tokens and a five-minute clip is over 330,000 — a third of a million-token window, and a real bill, before anything else is in the request." },
          { t: "p", text: "So the question is never \"send the video\", it is \"which frames\". Key-frame extraction on scene changes rather than a fixed interval, because a static shot contributes thirty near-identical images and one is enough. Then the lowest detail on the frames unless the task needs to read something in them." },
          { t: "p", text: "A model that takes video natively changes the constant rather than the logic: Gemini charges on the order of 70 tokens a frame, so the same thirty seconds is a few thousand tokens — but it is sampling frames for you, and you should know at what rate before trusting it with something brief." },
          { t: "p", text: "For anything where the audio carries the content — a meeting, a lecture, a call — transcribe it and send text. That is orders of magnitude cheaper and usually better, because the model gets the whole thing rather than a sample of frames. 13.9 covers what to expect from the transcription, and 6.5 covers retrieval when the video corpus is large enough that you cannot send any of it directly." }
        ] }
    ]
  }
});
