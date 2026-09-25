EC.receiveLesson({
  id: "1.11",

  lede: "An image does not arrive at a language model as an image. It arrives as tokens, and the number of them is computable before you send anything — which matters, because a single high-detail photograph costs about the same as three pages of text. This lesson implements the tiling formula, checks the reference's worked figure against it, and finds the resizing step that makes the naive calculation right for the wrong reason.",

  objectives: [
    "Compute the token cost of an image from its dimensions and the detail setting",
    "Explain what the low and high detail settings each buy and cost",
    "Predict the effect of resizing an image before sending it",
    "Budget a multimodal request the way you would a text one",
    "Recognise when an image is the wrong input entirely"
  ],

  prerequisites: ["1.5"],

  blocks: [

    /* ============================================================ 01 */
    { t: "h2", n: "01", id: "the-formula", text: "Images become tokens, by a formula you can run",
      sub: "85 for the base, 170 for every 512-pixel tile" },

    { t: "p", text: "The reference gives the rule in two lines: `detail=\"low\"` is always 85 tokens, and `detail=\"high\"` is `85 + 170 × tiles`, where a tile is a 512-pixel square. What it leaves out is the resizing that happens before the tiling, and that omission is the interesting part." },

    { t: "code", lang: "python", title: "g18.py — the tiling, implemented", code: `import math

def img_tokens(w, h, detail="high"):
    if detail == "low":
        return 85                                  # fixed, regardless of size

    s = min(2048 / max(w, h), 1.0)                 # 1. fit inside 2048x2048
    w, h = w * s, h * s

    s = min(768 / min(w, h), 1.0)                  # 2. shortest side down to 768
    w, h = w * s, h * s

    tiles = math.ceil(w / 512) * math.ceil(h / 512)   # 3. count 512px tiles
    return 85 + 170 * tiles`,
      hl: [6, 9],
      caption: "Two resize steps before any counting. The first bounds the longest side, the second bounds the shortest — and the second is what puts a ceiling on the whole thing." },

    { t: "code", lang: "python", title: "g18.py — six images", code: `for w, h in ((512, 512), (1024, 1024), (1024, 768),
             (2048, 2048), (4096, 4096), (150, 150)):
    hi = img_tokens(w, h)
    print("%-14s %8d %8d %10d" % ("%dx%d" % (w, h), 85, hi, (hi - 85) // 170))`,
      out: `the reference: detail=low is 85; detail=high is 85 + 170 x tiles
it claims 1024x1024 at high detail ~ 765 tokens

  image               low     high      tiles
  512x512              85      255          1
  1024x1024            85      765          4
  1024x768             85      765          4
  2048x2048            85      765          4
  4096x4096            85      765          4
  150x150              85      255          1

naive 1024x1024 -> 2x2 = 4 tiles -> 85 + 680 = 765, which matches the reference.
but the real pipeline shrinks the shortest side to 768 first, giving 765.`,
      hl: [6, 9, 10],
      caption: "The reference's 765 for a 1024×1024 image is correct. It is correct by coincidence: the naive 2×2 tiling gives 765, and so does the real pipeline after shrinking the shortest side to 768 — but for different reasons, and they stop agreeing immediately." },

    { t: "callout", kind: "insight", title: "There is a ceiling, and it arrives sooner than you think",
      body: [
        { t: "p", text: "Look at the last three rows: 1024×1024, 2048×2048 and 4096×4096 all cost **765 tokens**. The shortest-side-to-768 step means any square image above about 768 pixels resizes to the same 768×768 and tiles identically." },
        { t: "p", text: "So sending a 4K photograph costs exactly what sending a 1024-pixel version of it costs, and the extra 15 megabytes buy nothing at all — they are discarded server-side before the model sees anything. Resizing client-side saves upload time and bandwidth for free." },
        { t: "p", text: "The ceiling is not universal: a very wide panorama has a long side that survives the 2048 bound and a short side already under 768, so it tiles into more columns and costs more. Square images hit the ceiling; extreme aspect ratios do not." }
      ] },

    { t: "viz", title: "What the two resize steps do", caption: "Measured with the implementation above. The two bounds mean a square image cannot exceed four tiles however large it starts.",
      svg: `<svg viewBox="0 0 760 220" width="100%" role="img" aria-label="Image token cost against source size">
  <text x="20" y="26" class="s-label">high detail — tokens</text>

  <rect x="20" y="40" width="34" height="26" rx="4" style="fill:var(--good)" opacity="0.8"/>
  <text x="62" y="58" class="s-mono">255</text>
  <text x="120" y="58" class="s-sub">150x150 — one tile after resize</text>

  <rect x="20" y="74" width="34" height="26" rx="4" style="fill:var(--good)" opacity="0.8"/>
  <text x="62" y="92" class="s-mono">255</text>
  <text x="120" y="92" class="s-sub">512x512 — one tile</text>

  <rect x="20" y="108" width="102" height="26" rx="4" style="fill:var(--warn)" opacity="0.8"/>
  <text x="130" y="126" class="s-mono">765</text>
  <text x="188" y="126" class="s-sub">1024x1024 — four tiles</text>

  <rect x="20" y="142" width="102" height="26" rx="4" style="fill:var(--warn)" opacity="0.8"/>
  <text x="130" y="160" class="s-mono">765</text>
  <text x="188" y="160" class="s-sub">4096x4096 — still four tiles, 15 MB discarded before the model sees it</text>

  <rect x="20" y="176" width="11" height="26" rx="3" style="fill:var(--accent)" opacity="0.85"/>
  <text x="40" y="194" class="s-mono">85</text>
  <text x="120" y="194" class="s-sub">any size at detail="low" — 9.0x cheaper than 765</text>
</svg>` },

    /* ============================================================ 02 */
    { t: "h2", n: "02", id: "what-detail-buys", text: "What the detail setting is actually choosing",
      sub: "One tile of context against a grid of tiles" },

    { t: "p", text: "`detail=\"low\"` gives the model a single 512-pixel view of the whole image, for a flat 85 tokens. `detail=\"high\"` gives it that overview *plus* a grid of 512-pixel crops at higher resolution. The difference is whether the model can read small text and resolve fine structure, and it costs 9× on the measured square image." },

    { t: "code", lang: "python", title: "g18.py — the price of detail", code: `print("cost of one high-detail 1024x1024 image at $2.50/1M input: $%.6f"
      % (765 * 2.5 / 1e6))
print("  the same image at detail=low                           : $%.6f"
      % (85 * 2.5 / 1e6))
print("  ratio: %.1fx" % (765 / 85))`,
      out: `cost of one high-detail 1024x1024 image at $2.50/1M input: $0.001912
  the same image at detail=low                           : $0.000212
  ratio: 9.0x`,
      caption: "Using the $2.50 per million input tokens quoted in 01_LLM_Parameters.md §14. Two tenths of a penny per image sounds like nothing until you multiply by a document pipeline's volume." },

    { t: "table",
      head: ["Task", "Detail", "Why"],
      rows: [
        ["\"Is there a person in this photo?\"", "`low`", "A 512-pixel view answers it; 9× more tokens changes nothing"],
        ["\"What does this sign say?\"", "`high`", "Text needs resolution — this is what the tiles are for"],
        ["\"Which of these four layouts is this?\"", "`low`", "Classification over coarse structure"],
        ["\"Read the table in this scan\"", "`high`, or do not use a vision model", "Dense text is what OCR is for — see §04"],
        ["\"Describe this image\"", "`low` first", "Measure whether `high` changes the answer before paying for it"]
      ],
      caption: "The default is `auto`, which lets the provider decide. For a pipeline processing the same kind of image repeatedly, choosing explicitly is worth the five minutes it takes to test." },

    { t: "callout", kind: "good", title: "Test whether detail changes the answer",
      body: [
        { t: "p", text: "Take 50 real images from your pipeline. Run each at `low` and at `high`. Compare the answers on whatever metric the task has." },
        { t: "p", text: "For a surprising number of tasks the answers are identical, and you have been paying 9× for nothing. For OCR-like tasks the difference is dramatic and obvious. Either way it is a half-hour experiment that settles the question with evidence instead of an assumption." },
        { t: "p", text: "Run the same comparison after any model upgrade. Vision encoders change between versions, and a task that needed `high` on one model may not on the next." }
      ] },

    /* ============================================================ 03 */
    { t: "h2", n: "03", id: "budgeting", text: "Budgeting a multimodal request",
      sub: "Images are input tokens and share the window with everything else" },

    { t: "p", text: "Everything from 1.5 applies unchanged: image tokens are input tokens, they count against the context window, and they leave less room for output. What is different is that they arrive in large indivisible blocks — you cannot truncate an image to fit." },

    { t: "code", lang: "python", title: "multimodal_budget.py", code: `def plan(images, prompt, *, window=128_000, reserve_output=2_000, detail="high"):
    per_image = 85 if detail == "low" else None    # per-image cost, computed below
    costs = [img_tokens(w, h, detail) for (w, h) in images]

    text = len(enc.encode(prompt))
    total = text + sum(costs)
    room  = window - reserve_output

    return {
        "text_tokens":  text,
        "image_tokens": sum(costs),
        "per_image":    costs,
        "fits":         total <= room,
        "images_that_fit": next(
            (i for i in range(len(costs), -1, -1)
             if text + sum(costs[:i]) <= room), 0),
    }

# 40 high-detail scans alongside a 2,000-token instruction:
#   40 x 765 = 30,600 image tokens + 2,000 text = 32,600 of 126,000 -- fits.
# The same 40 at 1,445 tokens each (wide scans, more tiles) = 57,800 -- also fits.
# 200 of them does not, and there is no partial image to drop.`,
      caption: "The `images_that_fit` calculation exists because the failure is all-or-nothing per image. Dropping half a document's pages is a decision, and it should be an explicit one rather than a truncation you discover later." },

    { t: "callout", kind: "trap", title: "Images do not compress like text",
      body: [
        { t: "p", text: "When a text prompt is too long you can summarise, chunk, or drop the least relevant passage. An image is 765 tokens or it is absent — there is no 400-token version of it that keeps the important half." },
        { t: "p", text: "The one lever is `detail`, which is a 9× step rather than a slider. So a multimodal budget is much lumpier than a text one, and the planning has to happen before the request rather than as a graceful degradation inside it." },
        { t: "p", text: "For video the same logic applies with a much worse constant: the reference's advice is to extract key frames rather than sending everything, because a 30-second clip at 1 frame per second is 30 images and 22,950 tokens at high detail." }
      ] },

    /* ============================================================ 04 */
    { t: "h2", n: "04", id: "wrong-tool", text: "When an image is the wrong input",
      sub: "A vision model is not an OCR engine, and is priced accordingly" },

    { t: "p", text: "The case that comes up constantly is a scanned document. A vision model will read it, often well. It will also cost 765 tokens per page at high detail, take seconds, and hallucinate a digit occasionally in a way that a dedicated OCR engine does not." },

    { t: "ul", items: [
      "**Dense text on a page** — an invoice, a form, a contract scan — is what OCR is built for. Run OCR, send the text. A page of extracted text is usually 300–800 tokens rather than 765 plus whatever the answer costs, and it is greppable, diffable and auditable afterwards.",
      "**Layout and structure** — which box is a total, where the signature block is — is where a vision model beats OCR, because OCR discards the geometry that answers the question.",
      "**Both** is the common real answer: OCR for the text, a vision model for the layout questions, and 6.5's multimodal retrieval when the corpus is large.",
      "**Charts and diagrams** genuinely need vision. There is no text layer that answers \"is this line trending up\"."
    ] },

    { t: "p", text: "The failure mode worth naming is that a vision model reading a scanned table produces plausible numbers. An OCR engine with low confidence produces garbage that is obviously garbage. Plausible-but-wrong is much more expensive to discover than obviously-wrong, and 11.1 is the lesson about why models produce it." },

    /* ============================================================ exercise */
    { t: "exercise", kind: "Challenge", title: "Find the resize that costs nothing",
      difficulty: "core", minutes: 20,
      body: [
        { t: "p", text: "The measurement showed 1024×1024 and 4096×4096 costing the same 765 tokens, because the pipeline shrinks the shortest side to 768 before tiling. Somewhere below that, resizing starts to save money." },
        { t: "p", text: "Find the boundaries: the largest image you can send without paying more than the minimum, and the smallest resize that changes the cost." }
      ],
      requirements: [
        "Implement the tiling function from §01",
        "Sweep square images from 100 to 4096 pixels and report every size at which the token count changes",
        "Do the same for a 16:9 aspect ratio, and explain why the two differ",
        "Report the largest square image that costs 255 tokens, and the smallest that costs 765",
        "State what this means for a client-side resize step"
      ],
      hint: "The cost only changes at the boundaries where `ceil(w/512)` or `ceil(h/512)` increments, after the two resize steps. Sweep and diff rather than reasoning about it.",
      solution: { lang: "python", title: "g111_ex.py",
        code: `import math

def img_tokens(w, h):
    s = min(2048 / max(w, h), 1.0); w, h = w * s, h * s
    s = min(768 / min(w, h), 1.0);  w, h = w * s, h * s
    return 85 + 170 * (math.ceil(w / 512) * math.ceil(h / 512))

def transitions(ratio_w, ratio_h, label):
    prev, out = None, []
    for side in range(100, 4097):
        w = side; h = int(side * ratio_h / ratio_w)
        t = img_tokens(w, h)
        if t != prev:
            out.append((w, h, t))
            prev = t
    print("%s: %d cost levels" % (label, len(out)))
    for w, h, t in out:
        print("    from %5dx%-5d : %4d tokens" % (w, h, t))

transitions(1, 1, "square")
print()
transitions(16, 9, "16:9")`,
        out: `square: 2 cost levels
    from   100x100   :  255 tokens
    from   513x513   :  765 tokens

16:9: 4 cost levels
    from   100x56    :  255 tokens
    from   513x288   :  425 tokens
    from   912x513   :  765 tokens
    from  1025x576   : 1105 tokens`,
        notes: [
          { t: "p", text: "A square image has exactly two prices, and the boundary is at **513**, not where the resize steps are. Up to 512×512 it is one tile and 255 tokens; from 513×513 it is four tiles and 765, and it stays 765 forever — because the shortest-side shrink to 768 only engages above 768 and always lands back on four tiles. So the only client-side resize that saves tokens on a square image is down to 512." },
          { t: "p", text: "The 16:9 case has four levels and tops out at **1105**, not 765 — a wide image needs three tile columns where a square needs two. It reaches 1105 at 1025×576 and stays there: a 4K widescreen screenshot is fitted to 2048 wide, then shrunk to 1365×768, which is still three columns by two rows. Aspect ratio, not size, is what sets the ceiling." },
          { t: "p", text: "Two separate rules fall out, and they are often confused. **For tokens**, the only lever is dropping below 513 on the long side, which takes a square image from 765 to 255 — a real 3× saving, at the cost of the resolution the tiles existed to capture. **For bandwidth and latency**, resize to 768 on the shortest side: everything above that is discarded server-side, so a 4K upload pays transmission costs for pixels the model never sees. Above 513 pixels the two rules point in different directions, which is why they have to be stated separately." }
        ] } },

    /* ============================================================ scenario */
    { t: "callout", kind: "scenario", title: "Incident: the receipt scanner whose bill was 40× the estimate",
      body: [
        { t: "p", text: "**Symptom.** An expense tool let users photograph receipts. The estimate — built from average text-request costs — put it at about $200 a month at the expected volume. The first full month came in at $8,100." },
        { t: "p", text: "**What was happening.** Phones were uploading 4032×3024 photographs. Each one cost 765 tokens at `detail=\"high\"` — the default `auto` had resolved to high on every image because they were large. Users also, reasonably, photographed a receipt several times when the first attempt looked blurry, so the mean images per expense was 2.7 rather than 1." },
        { t: "p", text: "**Mechanism.** Two multipliers nobody had modelled. The cost estimate had been built from a text-only prototype and never revised when images were added; and `detail` had never been set, so the most expensive branch was taken by default. The 15-megapixel uploads made no difference to quality whatsoever — the measurement in §01 shows 4096×4096 and 1024×1024 both resolving to 765 tokens, so the extra pixels were discarded server-side after being paid for in upload bandwidth and latency." },
        { t: "p", text: "**Fix.** Client-side resize to 768 on the shortest side before upload, which cut upload time noticeably and token cost not at all — then an A/B on `detail=\"low\"` against `high` over 200 real receipts, which found high detail necessary for the total line and unnecessary for the merchant name, so the pipeline now makes two cheap calls instead of one expensive one where it can. Final cost was $940 a month. The durable change was that image tokens are now computed client-side and logged per request, so the bill is predictable from the traffic — which is 11.7's whole argument." }
      ] }
  ],

  takeaways: [
    "Images become **input tokens**: `detail=\"low\"` is a flat **85**, `detail=\"high\"` is **85 + 170 × tiles** where a tile is 512 pixels square.",
    "Before tiling there are two resizes: fit inside 2048×2048, then shrink the **shortest side to 768**. The reference's formula omits both.",
    "That gives a ceiling. Measured: **1024×1024, 2048×2048 and 4096×4096 all cost 765 tokens** — a 4K upload is discarded server-side after you have paid to transmit it.",
    "The reference's figure of 765 for a 1024×1024 image is correct, and correct by coincidence — the naive 2×2 tiling and the real pipeline agree there and diverge immediately after.",
    "High detail costs **9.0×** low detail on a square image: $0.001912 against $0.000212 at $2.50 per million input tokens.",
    "A square image has exactly **two prices**: 255 tokens up to 512×512, and 765 from 513×513 upward, forever. A 16:9 image has four and tops out at **1105**, because a wide image needs three tile columns where a square needs two.",
    "**Two different resize rules.** For tokens, only dropping below 513 on the long side helps (765 → 255). For bandwidth and latency, resize to 768 on the shortest side, since everything above it is discarded server-side.",
    "**Images do not compress like text.** There is no 400-token version of a 765-token image — the only lever is a 9× step in `detail`, so multimodal budgets must be planned before the request.",
    "Video multiplies the constant: 30 seconds at 1 fps is 30 images and 22,950 tokens at high detail. Extract key frames.",
    "**A vision model is not an OCR engine.** Dense text is cheaper and more auditable through OCR; layout and charts are what vision is for; and a vision model misreading a table produces plausible numbers rather than obvious garbage."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "You send a 4096×4096 photograph at `detail=\"high\"`. How many tokens does it cost?",
        options: ["About 12,000, since it is 64 tiles", "765 — the same as a 1024×1024 image", "85, since detail is capped", "It depends on the image content"],
        answer: 1,
        why: "The pipeline fits the image inside 2048×2048 and then shrinks the shortest side to 768, so a large square image always ends up as 768×768 and tiles into four — 85 + 170×4 = 765, measured identically for 1024, 2048 and 4096 pixel squares. The first option applies the tiling to the original dimensions and skips both resize steps. 85 is the flat `low` cost, not a cap on `high`. Content is irrelevant: the cost is a function of dimensions alone." },

      { stem: "Your pipeline asks \"is there a person in this photo?\" at `detail=\"high\"`. What is the likely finding if you test `low`?",
        options: ["Accuracy collapses — high detail is always better", "The answers are likely identical and you are paying 9× for nothing", "Low detail is not supported for photographs", "Latency increases"],
        answer: 1,
        why: "Low detail gives the model a 512-pixel view of the whole image, which is ample for coarse recognition — and it costs 85 tokens against 765, a measured 9.0× difference. The task that genuinely needs the tiles is reading small text or resolving fine structure, not detecting whether a person is present. The first option assumes more resolution always helps, which is the assumption the half-hour A/B in §02 exists to test. Low detail is supported everywhere, and fewer tokens reduce latency rather than increasing it." },

      { stem: "You need to extract line items from 500 scanned invoices per day. What is the best architecture?",
        options: ["Send each page to a vision model at high detail", "OCR for the text, a vision model only for layout questions the text cannot answer", "Send each page at low detail to save tokens", "Send the whole PDF as one image"],
        answer: 1,
        why: "Dense text on a page is what OCR is built for: it produces greppable, diffable output at typically 300–800 tokens a page, and a low-confidence OCR result is obviously garbage where a vision model's misreading is a plausible wrong number — much more expensive to discover. Vision earns its cost on the geometry OCR discards, such as which box is the total. High detail on every page is the expensive default the incident in §04 was built on. Low detail would make the text unreadable, which is the one thing the tiles were for. A whole PDF as one image loses resolution on every page at once." },

      { stem: "Why does resizing a 4000-pixel image to 768 on the shortest side before upload help?",
        options: ["It reduces the token count from 765 to 255", "It does not save tokens at all — it saves upload bandwidth and latency", "It halves the cost", "It changes detail from high to low automatically"],
        answer: 1,
        why: "Both sizes resolve to 765 tokens because the server shrinks the shortest side to 768 before tiling, so the token cost is identical — what the client-side resize saves is transmitting megabytes that are discarded on arrival, which shows up as upload time and latency. Getting to 255 tokens would require going below 513 pixels on the long side, which is a different and lossier decision. Nothing about the upload size changes the `detail` setting, which is an explicit request parameter." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "The reference's Q7. Most candidates know images cost tokens; few can compute how many, and fewer know about the resize.",
    questions: [
      { level: "core",
        q: "How do multimodal inputs affect token usage?",
        strong: "A strong answer gives the formula, a concrete number, and the resize step that the documentation's version leaves out.",
        answer: [
          { t: "p", text: "Images are converted to input tokens and billed at the input rate. `detail=\"low\"` is a flat 85 tokens whatever the image size. `detail=\"high\"` is 85 plus 170 for each 512-pixel tile — a 1024×1024 image is four tiles, so 765 tokens." },
          { t: "p", text: "The part that is usually missed: before tiling, the image is fitted inside 2048×2048 and then its shortest side is shrunk to 768. That puts a ceiling on the cost — I measured 1024×1024, 2048×2048 and 4096×4096 all coming out at exactly 765 tokens. So a 4K upload costs the same as a 1K one and the extra pixels are discarded server-side." },
          { t: "p", text: "Practically: high detail is 9× low detail, which is worth testing rather than assuming. And resizing client-side to 768 on the shortest side saves upload bandwidth and latency even though it saves no tokens." }
        ] },

      { level: "core",
        q: "When would you not use a vision model for a document?",
        strong: "A strong answer separates text from layout and names the failure mode that makes the distinction matter.",
        answer: [
          { t: "p", text: "When the question is about the text rather than the layout. Dense text on a page is what OCR is built for — a page of extracted text is typically 300–800 tokens against 765 for the image plus whatever the answer costs, and the output is greppable, diffable and auditable afterwards in a way an image is not." },
          { t: "p", text: "Vision earns its cost on the things OCR discards: which box is the total, where the signature block is, whether this chart is trending up. There is no text layer that answers the last one." },
          { t: "p", text: "The argument I would lead with, though, is the failure mode. An OCR engine reading a bad scan produces garbage that is obviously garbage, with a confidence score. A vision model reading the same scan produces a plausible number. Plausible-but-wrong is far more expensive to find than obviously-wrong, and on financial documents that difference is the whole risk." }
        ] },

      { level: "advanced",
        q: "A receipt-scanning feature costs 40 times its estimate. Where do you look?",
        strong: "A strong answer proposes the multipliers in order of likely size and knows that `detail` defaults to something expensive.",
        answer: [
          { t: "p", text: "Three multipliers, and I would check them in this order. First, `detail`: if it was never set, it defaults to `auto`, which resolves to high on large images — that is a 9× difference against low, and phone photographs are always large." },
          { t: "p", text: "Second, images per transaction. Users photograph a receipt more than once when the first attempt looks blurry, so the real figure is often two or three, not one. That is a multiplier nobody puts in the estimate because it is a behaviour rather than a parameter." },
          { t: "p", text: "Third — and this one costs bandwidth rather than tokens, but it is worth finding — upload size. A 15-megapixel photograph costs exactly what a 1-megapixel one costs in tokens, because the server shrinks the shortest side to 768 before tiling. So the extra megabytes are pure waste: latency and bandwidth for pixels that are discarded." },
          { t: "p", text: "The fix that generalises is to compute image tokens client-side from the dimensions and log them per request. Then the bill is predictable from the traffic, and a 40× surprise becomes a dashboard rather than an invoice." }
        ] },

      { level: "advanced",
        q: "How would you handle video input?",
        strong: "A strong answer starts from the arithmetic, which rules out the naive approach immediately.",
        answer: [
          { t: "p", text: "Start with the number, because it settles the design. At one frame per second and high detail, thirty seconds of video is thirty images and 22,950 tokens. A five-minute clip is over 200,000 — more than most context windows, before anything else is in the request." },
          { t: "p", text: "So the question is never \"send the video\", it is \"which frames\". Key-frame extraction on scene changes rather than a fixed interval, because a static shot contributes thirty near-identical images and one is enough. Then `detail=\"low\"` on the frames unless the task needs to read something in them, which is another 9×." },
          { t: "p", text: "For anything where the audio carries the content — a meeting, a lecture, a call — transcribe it and send text. That is orders of magnitude cheaper and usually better, because the model gets the whole thing rather than a sample of frames. 13.9 covers what to expect from the transcription, and 6.5 covers retrieval when the video corpus is large enough that you cannot send any of it directly." }
        ] }
    ]
  }
});
