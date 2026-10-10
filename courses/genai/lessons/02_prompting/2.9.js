EC.receiveLesson({
  id: "2.9",

  lede: "Prompting with an image is prompting with a component the model reads differently from text, and the failure mode is specific: a vague instruction over an image produces a description rather than an answer. 1.11 established what an image costs; this lesson is about what to say alongside it — being explicit about *where* to look, asking for structure so the output is usable, and recognising the cases where the picture is the wrong input entirely.",

  objectives: [
    "Write a multimodal prompt that asks a question rather than inviting a description",
    "Order text and images in a request, and say why the order matters",
    "Request structured output from a vision call and validate it against the image",
    "Budget a multimodal request using the token arithmetic from 1.11",
    "Recognise when to preprocess the image instead of prompting harder"
  ],

  prerequisites: ["1.11", "2.1"],

  blocks: [

    /* ============================================================ 01 */
    { t: "h2", n: "01", id: "specific", text: "Ask a question, not for a description",
      sub: "The commonest multimodal prompt failure is an under-specified one" },

    { t: "p", text: "\"What's in this image?\" invites a description, and a description is almost never what a system wants. The four-component check from 2.1 applies exactly as it does to text: the image is the **input**, and the instruction, context and output format still have to be supplied." },

    { t: "code", lang: "python", title: "vision.py — the call shape", code: `response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{
        "role": "user",
        "content": [
            {"type": "text", "text": "What's in this image?"},      # under-specified
            {"type": "image_url", "image_url": {
                "url": "https://example.com/image.jpg",
                "detail": "high",
            }},
        ],
    }],
    max_tokens=300,
)`,
      caption: "The `content` is a list, which is what makes the ordering in §02 a decision rather than an accident." },

    { t: "ladder", title: "From description to answer", rungs: [
      { level: "bad", label: "An open invitation",
        why: "Produces prose about the image; nothing is extractable",
        code: `"What's in this image?"`,
        note: "You get a paragraph. Which fields it mentions, and in what order, varies per call." },
      { level: "ok", label: "A specific question",
        why: "Now there is a task",
        code: `"Read the total amount and the invoice date from this receipt."`,
        note: "Better — but the answer is still prose, and a number embedded in a sentence needs parsing." },
      { level: "best", label: "A question, a region, and a schema",
        why: "Names where to look and what shape to return",
        code: `"""This is a photographed receipt. Read only the printed totals block,
usually at the bottom. Return JSON matching the schema.

If a value is not legible, use null -- do not infer it from other figures."""

# with response_format=ReceiptTotals (1.8)`,
        note: "The region hint reduces confusion with other numbers on the page, the schema removes the parsing, and the null clause is the one from 2.7 that a schema cannot express." }
    ] },

    { t: "callout", kind: "good", title: "Three things worth adding to any vision prompt",
      body: [
        { t: "p", text: "**Say what the image is.** \"This is a photographed receipt\" costs four tokens and rules out a large space of alternative interpretations before the model starts." },
        { t: "p", text: "**Name the region.** \"The totals block, usually at the bottom\" is far more effective than raising `detail` — it is free, where high detail is 9×." },
        { t: "p", text: "**Say what to do when something is illegible.** Photographs are blurry, cropped and badly lit in ways scanned documents are not, and a model asked for a value it cannot read will produce a plausible one. This is the same clause as 2.7's and it matters more here, because illegibility is common rather than exceptional." }
      ] },

    /* ============================================================ 02 */
    { t: "h2", n: "02", id: "ordering", text: "Text before image, image before question",
      sub: "The content list is ordered, and the model reads it in order" },

    { t: "p", text: "The `content` array is a sequence of tokens like everything else. Instructions placed *after* the image are read after it; instructions placed before are conditioning the model as it processes the image. Both orders have a use." },

    { t: "table",
      head: ["Order", "Effect", "Use when"],
      rows: [
        ["Instruction, then image", "The model knows what it is looking for while reading", "You have a specific extraction task — the usual case"],
        ["Image, then question", "The model reads the image, then is asked", "You ask several different questions of one image"],
        ["Instruction, image, restated question", "Both", "Long instructions, where the task risks being forgotten"],
        ["Multiple images with labels between", "Each image is identified", "Comparison — without labels the model conflates them"]
      ],
      caption: "The last row is the one that bites. Two images with no text between them are two images the model may refer to interchangeably." },

    { t: "code", lang: "python", title: "compare.py — labelling multiple images", code: `content = [
    {"type": "text", "text": "Compare these two dashboard screenshots."},
    {"type": "text", "text": "Image A — before the deployment:"},
    {"type": "image_url", "image_url": {"url": before_url, "detail": "high"}},
    {"type": "text", "text": "Image B — after the deployment:"},
    {"type": "image_url", "image_url": {"url": after_url, "detail": "high"}},
    {"type": "text", "text": "Which metrics changed, and in which direction? "
                             "Refer to the images as A and B."},
]`,
      hl: [3, 5, 7],
      caption: "The labels cost about six tokens and remove an entire class of confusion. The closing instruction to use those labels is what makes the answer checkable." },

    { t: "p", text: "Note that prompt caching (1.13) applies here too, and images are large. A request that puts a fixed instruction and a fixed reference image first, with the varying image last, keeps a cacheable prefix — which on a comparison workload is worth more than on a text one, because the prefix contains hundreds of image tokens rather than dozens of text ones." },

    /* ============================================================ 03 */
    { t: "h2", n: "03", id: "budget", text: "Budgeting, with the numbers from 1.11",
      sub: "Images are large, indivisible input blocks" },

    { t: "p", text: "1.11 measured the arithmetic: `detail=\"low\"` is a flat 85 tokens; `detail=\"high\"` is 85 + 170 per 512-pixel tile, which for a square image is 255 up to 512×512 and 765 from 513×513 upward, forever." },

    { t: "code", lang: "python", title: "budget.py", code: `# A comparison prompt with two high-detail images and a 300-token instruction:
#   instruction      300
#   image A          765
#   labels             6
#   image B          765
#   closing question  30
#   -------------------------
#   input          1,866 tokens -- of which 82% is the two images
#
# Dropping to detail="low" on both:
#   input            506 tokens -- a 3.7x reduction
#
# The question to answer before paying 3.7x: does the task need the tiles?
# Reading a number off a chart does. Noticing that a line trends upward does not.`,
      caption: "Images dominate a multimodal prompt's token count, so the `detail` decision is the budget decision — and 1.11's argument stands: test whether `low` changes the answer before assuming `high` is needed." },

    { t: "callout", kind: "trap", title: "You cannot summarise an image to make it fit",
      body: [
        { t: "p", text: "Text that does not fit can be summarised, chunked, or partially dropped. An image is 765 tokens or it is absent — there is no shorter version that keeps the relevant half, and the only lever is a 9× step in `detail`." },
        { t: "p", text: "So a multimodal request has to be planned before it is built (1.5's reservation pattern), and a pipeline processing a variable number of images needs an explicit decision about which to drop rather than a truncation it discovers later." },
        { t: "p", text: "For many images the answer is usually not a bigger prompt. It is a first pass at `detail=\"low\"` to select the two or three that matter, then a second call at `high` on those — which is the routing pattern from 2.8, applied to images." }
      ] },

    /* ============================================================ 04 */
    { t: "h2", n: "04", id: "preprocess", text: "Preprocess instead of prompting harder",
      sub: "Some prompting problems are image problems" },

    { t: "ul", items: [
      "**Crop to the region.** If the answer is always in the top-right quadrant, cropping there before upload removes every distractor and often lets you drop to a smaller image, which is a token saving as well as an accuracy one.",
      "**Rotate and deskew.** A photograph taken at an angle is harder for the model in the same way it is harder for a person, and a deskew step costs nothing at inference.",
      "**Split multi-page documents.** One call per page with a page number in the text beats one call with eight images, both for accuracy and because it gives failures a location (2.8).",
      "**Run OCR alongside.** 1.11's argument: send the extracted text *and* the image. The text gives the model exact strings it would otherwise have to read from pixels; the image gives the layout OCR discarded. Together they beat either alone on forms and invoices."
    ] },

    { t: "p", text: "The general principle is that a vision model is expensive per pixel and cheap to reason with. Anything you can do to the image before it arrives — cropping, rotating, splitting, transcribing — is work done once, cheaply, in code, rather than work the model has to do on every request." },

    /* ============================================================ exercise */
    { t: "exercise", kind: "Challenge", title: "Budget a variable-image pipeline",
      difficulty: "core", minutes: 20,
      body: [
        { t: "p", text: "A document pipeline receives between one and twenty page images per request. Images are indivisible, so a plan is needed before the request rather than a truncation inside it." },
        { t: "p", text: "Build the planner and find where each strategy stops fitting." }
      ],
      requirements: [
        "Use the tiling function from 1.11 to cost pages at both detail settings",
        "For a 128,000-token window with 2,000 reserved for output and a 500-token instruction, find the maximum pages that fit at each detail",
        "Model the two-pass strategy: all pages at low detail, then the top 3 at high",
        "Report the cost of each strategy for 5, 10 and 20 pages at $2.50 per 1M input tokens",
        "State which strategy you would default to and why"
      ],
      hint: "A4 at 150 dpi is roughly 1240×1754, which after the shortest-side resize is 768 wide — work out the tiles from there.",
      solution: { lang: "python", title: "g29_ex.py",
        code: `import math

def img_tokens(w, h, detail="high"):
    if detail == "low":
        return 85
    s = min(2048 / max(w, h), 1.0); w, h = w * s, h * s
    s = min(768 / min(w, h), 1.0);  w, h = w * s, h * s
    return 85 + 170 * (math.ceil(w / 512) * math.ceil(h / 512))

PAGE = (1240, 1754)                      # A4 at 150 dpi
WINDOW, RESERVE, INSTR, RATE = 128_000, 2_000, 500, 2.50

hi, lo = img_tokens(*PAGE, "high"), img_tokens(*PAGE, "low")
room = WINDOW - RESERVE - INSTR
print("one A4 page: %d tokens at high detail, %d at low" % (hi, lo))
print("room for images: %d tokens" % room)
print("  max pages at high detail: %d" % (room // hi))
print("  max pages at low detail : %d" % (room // lo))
print()

print("%6s %14s %14s %16s" % ("pages", "all high", "all low", "two-pass (top 3)"))
for pages in (5, 10, 20):
    c_hi  = (INSTR + pages * hi) * RATE / 1e6
    c_lo  = (INSTR + pages * lo) * RATE / 1e6
    c_two = ((INSTR + pages * lo) + (INSTR + min(3, pages) * hi)) * RATE / 1e6
    print("%6d %14.6f %14.6f %16.6f" % (pages, c_hi, c_lo, c_two))`,
        out: `one A4 page: 1105 tokens at high detail, 85 at low
room for images: 125500 tokens
  max pages at high detail: 113
  max pages at low detail : 1476

 pages       all high        all low two-pass (top 3)
     5       0.015062       0.002312         0.011850
    10       0.028875       0.003375         0.012913
    20       0.056500       0.005500         0.015038`,
        notes: [
          { t: "p", text: "An A4 page at 150 dpi costs **1,105 tokens** at high detail — not the 765 a square image costs, because the portrait aspect ratio survives the resize. 1240×1754 has its shortest side pulled to 768, giving 768×1086, which tiles as 2 columns by 3 rows: 85 + 170×6. Aspect ratio sets the tile count, which is why this is computed rather than assumed." },
          { t: "p", text: "The window is not the constraint anyone expected: **113 pages fit at high detail**, and 1,476 at low. Nobody sends 113 pages, so the planning question is cost and latency rather than capacity — which inverts the usual multimodal worry." },
          { t: "p", text: "Two-pass beats all-high at every size tested and the gap widens fast: 1.3× cheaper at five pages, 2.2× at ten, **3.8× at twenty**. That is because the selection pass costs 85 tokens a page against 1,105, so scanning is almost free and only the pages that matter pay. I would default to it on anything that can exceed about five pages, and reserve all-high for the single-page case where the extra call is not worth the round trip." },
        ] } },

    /* ============================================================ scenario */
    { t: "callout", kind: "scenario", title: "Incident: the ID-verification tool that read the wrong date",
      body: [
        { t: "p", text: "**Symptom.** A tool reading expiry dates from photographed identity documents returned the *issue* date on about 7% of submissions. The failures clustered on one document type that prints both dates in the same block, in the same font, four millimetres apart." },
        { t: "p", text: "**The prompt.** \"Extract the expiry date from this ID document. Return it as YYYY-MM-DD.\" Correct, specific, and it named the output format — three of 2.1's four components present." },
        { t: "p", text: "**Mechanism.** The model was reading the right block and choosing the wrong line within it. Nothing in the prompt said how to tell them apart, because on most document types the distinction is obvious and nobody had looked at the hard one. The model was doing what a model does with an ambiguity: resolving it, consistently, in a way nobody had specified." },
        { t: "p", text: "**Fix.** Two lines added to the prompt for that document type — the expiry date is the later of the two, and it is preceded by a specific label — plus a sanity check in code that the extracted date is in the future, which caught the remaining cases immediately and cost nothing. The general lesson is the one from 2.1 arriving in a visual setting: the prompt was not vague, it was *incomplete about the hard case*, and the hard case was 7% of traffic. Looking at the failures rather than the prompt is what found it." }
      ] }
  ],

  takeaways: [
    "**\"What's in this image?\" invites a description.** The image is the input component; instruction, context and output format still have to be supplied (2.1).",
    "**Naming the region beats raising the detail.** \"The totals block, usually at the bottom\" is free; `detail=\"high\"` is 9× (1.11).",
    "Say what the image is — four tokens ruling out a large space of interpretations — and say what to do when something is illegible, which on photographs is common rather than exceptional.",
    "The `content` array is **ordered**. Instruction-then-image tells the model what it is looking for while it reads; image-then-question suits asking several things of one image.",
    "**Label multiple images with text between them.** Two unlabelled images are two images the model may refer to interchangeably.",
    "Images dominate a multimodal prompt: in a two-image comparison, **82% of input tokens were the images**.",
    "**You cannot summarise an image to make it fit.** There is no shorter version that keeps the relevant half — only a 9× step in `detail`.",
    "For many images, use a low-detail pass to select and a high-detail pass on the survivors — routing (2.8) applied to pixels.",
    "**Preprocess rather than prompt harder**: crop to the region, deskew, split multi-page documents, and run OCR alongside so the model gets exact strings *and* layout.",
    "Measured: an A4 page at 150 dpi is **1,105 tokens** at high detail and 85 at low — more than a square image’s 765, because the portrait ratio tiles 2×3 — and **113 pages fit** in a 128K window",
    "Two-pass beats all-high at every size tested — 1.3× cheaper at five pages, 2.2× at ten, **3.8× at twenty** — because the selection pass costs 85 tokens a page against 1,105.",
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Your vision prompt returns descriptions instead of the field you wanted. What is the first fix?",
        options: ["Raise `detail` to high", "Add the instruction, the region and an output schema — the image is only the input component", "Use a larger model", "Send the image twice"],
        answer: 1,
        why: "A description is what an under-specified prompt produces, and the four-component check applies unchanged: the image supplies input, while instruction, context and output format still have to be written. Raising detail costs 9× and addresses legibility, not ambiguity about the task. A larger model may describe more fluently and will still describe. Sending the image twice doubles the cost for nothing." },

      { stem: "You send two images for comparison with no text between them. What is likely to go wrong?",
        options: ["The second image is ignored", "The model conflates them and cannot reliably say which is which", "Token cost doubles unexpectedly", "The request is rejected"],
        answer: 1,
        why: "Without labels there is nothing in the context distinguishing the images, so references like \"the first one\" become unreliable and the model may attribute a feature of one to the other. Six tokens of `Image A — before:` and `Image B — after:` removes the class of confusion, and asking the model to refer to them by those labels makes the answer checkable. Both images are processed and both are billed, as expected; nothing is rejected." },

      { stem: "A 20-page document pipeline is too expensive at high detail. What is the best change?",
        options: ["Reduce the image resolution before upload", "A low-detail pass over all pages, then high detail on the two or three that matter", "Summarise the images", "Increase max_tokens"],
        answer: 1,
        why: "Measured, two-pass is 3.8× cheaper than all-high at twenty pages, because 85 tokens a page is enough to decide which pages contain the answer and only those pay the 1,105. Reducing resolution before upload saves bandwidth but not tokens above the resize threshold (1.11) — the server shrinks it anyway. Images cannot be summarised; there is no shorter version that keeps the relevant half. `max_tokens` governs output and is unrelated to input cost." },

      { stem: "A model reads the issue date instead of the expiry date from an ID card. What does that tell you?",
        options: ["The image resolution is too low", "The prompt was incomplete about the hard case — it did not say how to distinguish them", "The model cannot read dates", "Temperature is too high"],
        answer: 1,
        why: "The model located the right block and chose the wrong line within it, which is an ambiguity it resolved consistently in a way nobody had specified — so the prompt was not vague in general, it was silent on the one document type where the two dates look alike. The fix is two lines naming the distinguishing feature, plus a code check that the date is in the future. Resolution would produce garbled output rather than a confident wrong field, and the model demonstrably reads dates on the other 93%." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "Multimodal questions are usually cost questions wearing a vision hat, and the second half is about specificity.",
    questions: [
      { level: "core",
        q: "How is prompting with an image different from prompting with text?",
        strong: "A strong answer notes the image is one component of four, and that the usual failure is under-specification.",
        answer: [
          { t: "p", text: "Structurally it is not that different — the image is the input component, and instruction, context and output format still have to be supplied. The characteristic failure is asking \"what's in this image?\", which invites a description, and a description is almost never what a system wants." },
          { t: "p", text: "What is different is that naming the region is unusually effective and unusually cheap. \"The totals block, usually at the bottom\" is free, where raising `detail` to high is 9× — so specificity buys you more than resolution does, which is the opposite of the instinct." },
          { t: "p", text: "And I would always include the clause about illegibility. Photographs are blurry and badly cropped in ways scans are not, and a model asked for a value it cannot read produces a plausible one rather than admitting it." }
        ] },

      { level: "advanced",
        q: "A document pipeline receives up to twenty pages per request. How do you structure it?",
        strong: "A strong answer reaches for a two-pass approach and knows the arithmetic.",
        answer: [
          { t: "p", text: "Two passes. All pages at `detail=\"low\"`, which is 85 tokens each and enough to tell which pages contain what you need, then high detail on the two or three that do. I measured that at 3.8× cheaper than all-high at twenty pages, and it wins at every size I tested because the selection pass is 85 tokens against 1,105 for a full-detail A4 page." },
          { t: "p", text: "The thing that surprised me when I worked it out is that the context window is not the constraint: 113 A4 pages at high detail fit in a 128K window. Nobody sends 113 pages, so the planning question is cost and latency rather than capacity, which inverts the usual multimodal worry." },
          { t: "p", text: "I would also split per page rather than sending eight images in one call — it gives failures a location, which is the same argument as decomposition in 2.8, and it makes retries cheap. And I would run OCR alongside, sending the text and the image together: the text gives exact strings, the image gives the layout OCR threw away." }
        ] },
      { level: "core",
        q: "How would you reduce the cost of a vision-heavy pipeline?",
        strong: "A strong answer knows the detail setting is the dominant lever and that resizing above the threshold saves bandwidth rather than tokens.",
        answer: [
          { t: "p", text: "First, question `detail`. It is 9× between low and high, and it defaults to `auto`, which resolves to high on large images — so a pipeline that never set it is on the expensive branch by accident. I would run fifty real images at both settings and compare answers; for a surprising number of tasks they are identical." },
          { t: "p", text: "Second, a two-pass structure where there are many images: all pages at low detail to find the ones that matter, then high detail on those. Measured on A4 pages that was 3.8× cheaper at twenty pages." },
          { t: "p", text: "Third — and this one saves latency rather than tokens, which people get backwards — resize client-side. A 4K photograph and a 1K one both cost the same after the server shrinks the shortest side to 768, so the extra megabytes buy nothing and cost upload time." },
          { t: "p", text: "And I would preprocess where I can: cropping to the region, deskewing, and running OCR alongside so the model gets exact strings as well as layout. That is work done once in code rather than on every request." }
        ] }
    ]
  }
});
