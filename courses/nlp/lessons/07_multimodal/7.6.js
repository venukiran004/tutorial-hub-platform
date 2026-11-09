/* ============================================================================
   LESSON 7.6 — Multimodal Embeddings and RAG
   Cross-modal retrieval is run (3/3), and text-to-text similarity is shown
   to work despite never being a training objective — while absolute scores
   prove uncomparable across pairs (§03) (n71.py).
   ========================================================================= */
EC.receiveLesson({
  id: "7.6",

  lede: "**CLIP's loss only ever compared images against text, yet text-to-text similarity orders correctly: `dog`/`puppy` 0.9594 against `dog`/`engine` 0.8323.** Alignment transfers to pairings the objective never touched. That transfer is the entire bet behind ImageBind, which uses images as an anchor to bind six modalities without ever training most of the pairs. But look at the second number — 0.8323 for *dog* and *engine* is higher than 0.6762 for a red circle and a blue square. The ordering is reliable; the absolute scale is not, and that distinction decides how you build retrieval on top.",

  objectives: [
    "Explain what a unified embedding space enables",
    "Run cross-modal retrieval and read the similarity structure",
    "Describe ImageBind's anchor strategy and why it works",
    "Design a multimodal RAG pipeline and choose an indexing strategy",
    "Recognise why absolute similarity scores cannot be compared across pairs"
  ],

  prerequisites: ["7.5", "2.4"],

  blocks: [

    { t: "h2", n: "01", text: "One space, many modalities", id: "space" },

    {"kind": "flow", "title": "One space, and the queries can cross", "caption": "The mechanism is just §02's shared space with more encoders attached — **and what it buys is that a query in one modality retrieves in another: text finds images, an image finds descriptions, audio finds video clips.** The models differ only in how many towers they bind: **CLIP two, CLAP two, ImageBind six — image, text, audio, depth, thermal and IMU.** Which raises the question §04 answers: **you cannot have paired data for all fifteen modality pairs, so how is six achieved?**", "cols": 3, "nodes": [{"id": "e", "label": "One encoder per modality", "sub": "image, text, audio, ...", "tone": "good"}, {"id": "s", "label": "All outputs in ONE space", "sub": "comparable by cosine", "tone": "violet"}, {"id": "c", "label": "So a query can cross modalities", "sub": "text -> image, audio -> video", "tone": "good"}, {"id": "n", "label": "CLIP 2, CLAP 2, ImageBind 6", "sub": "the only difference is the count", "tone": "accent"}, {"id": "q", "label": "But 6 modalities is 15 pairs", "sub": "which section 04 answers", "tone": "warn"}], "edges": [["e", "s"], ["s", "c"], ["c", "n"], ["n", "q"]], "t": "diagram", "id": "dg-7_6-01-0"},


    { t: "out", text:
"Image -> image encoder -> embedding\nText  -> text encoder  -> embedding      all in the SAME space\nAudio -> audio encoder -> embedding\n\nwhich enables:\n  text query   -> find matching images\n  image query  -> find matching descriptions\n  audio query  -> find matching video clips" },

    { t: "table",
      head: ["Model", "Modalities", "Use"],
      rows: [
        ["CLIP", "Image + text", "Image-text retrieval, zero-shot classification"],
        ["CLAP", "Audio + text", "Audio-text retrieval"],
        ["ImageBind", "Image, text, audio, depth, thermal, IMU", "Universal binding across six modalities"],
        ["ONE-PEACE", "Vision, language, audio", "Unified embedding"]
      ] },

    { t: "h2", n: "02", text: "Cross-modal retrieval, run", id: "retrieval" },

    {"kind": "trace", "title": "Three of three, on a margin of 0.03 to 0.10", "caption": "**Every query retrieves the right image — and the diagonal values are 0.2857, 0.3191 and 0.3493 against off-diagonals in the 0.21–0.25 range.** So the retrieval works on **a margin of about 0.03 to 0.10, with every absolute value in a narrow band**, which is 3.6's anisotropy appearing a third time. **Read the gap, not the score: 0.2857 sounds like weak evidence and it is the strongest cell in its row.**", "left": "query", "codeW": 170, "vars": ["-> circle", "-> square", "-> triangle"], "steps": [{"code": "'a photo of a red circle'", "state": ["0.2857", "0.2219", "0.2102"], "tone": "good"}, {"code": "'a photo of a blue square'", "state": ["0.2248", "0.3191", "0.2406"], "changed": [0, 1, 2], "tone": "good"}, {"code": "'a photo of a green triangle'", "state": ["0.2115", "0.2495", "0.3493"], "changed": [0, 1, 2], "tone": "good"}, {"code": "margin", "state": ["0.03 to 0.10", "in a narrow band", "3/3 correct"], "changed": [0, 1, 2], "tone": "violet"}], "t": "diagram", "id": "dg-7_6-02-1"},


    { t: "out", text:
"text queries against three generated images\n\n  query                          circle      square      triangle\n  a photo of a red circle        0.2857      0.2219      0.2102\n  a photo of a blue square       0.2248      0.3191      0.2406\n  a photo of a green triangle    0.2115      0.2495      0.3493\n\n  retrieval correct: 3/3" },

    { t: "callout", kind: "insight", title: "Correct ranking, compressed range",
      body: [{ t: "p", text: "Every query retrieves its image — but the correct score is 0.2857 and the worst distractor is 0.2102, a gap of only 0.0755 on an absolute scale where 1.0 is identity. That narrow band is the **anisotropy** lesson 3.6 measured in BERT's final layer and lesson 5.9 noted in CLIP's text space: embeddings occupy a narrow cone, so cosines cluster high and close. It does not harm retrieval, which only needs the ranking, and it does mean a similarity threshold chosen on one dataset will not transfer to another." }] },

    { t: "h2", n: "03", text: "Transfer to untrained pairings", id: "transfer" },

    {"kind": "trace", "title": "Text-to-text similarity works, on a pairing the loss never compared", "caption": "**CLIP's contrastive loss only ever compares images against texts — it never scores two texts against each other. And yet: `'a red circle'` against `'a crimson round shape'` is 0.8064, while against `'a blue square'` it is 0.6762.** Which is the property that makes a shared space more than a lookup table: **aligning both towers to each other forces structure *within* each tower**, so relationships the training objective never mentioned are nonetheless preserved. The dog/puppy pair at **0.9594 against 0.8323** shows it again.", "left": "pair (text vs text)", "codeW": 200, "vars": ["similarity", "compared in training?"], "steps": [{"code": "'red circle' / 'crimson round shape'", "state": ["0.8064", "never"], "tone": "good"}, {"code": "'red circle' / 'blue square'", "state": ["0.6762", "never"], "changed": [0], "tone": "warn"}, {"code": "'a dog' / 'a puppy'", "state": ["0.9594", "never"], "changed": [0], "tone": "good"}, {"code": "'a dog' / 'an engine'", "state": ["0.8323", "never"], "changed": [0], "tone": "warn", "note": "structure, not luck"}], "t": "diagram", "id": "dg-7_6-03-2"},


    { t: "out", text:
"text-to-text similarity — a pairing CLIP's loss NEVER compared\n\n  0.8064   'a photo of a red circle' / 'a photo of a crimson round shape'\n  0.6762   'a photo of a red circle' / 'a photo of a blue square'\n\n  0.9594   'a photo of a dog'        / 'a photo of a puppy'\n  0.8323   'a photo of a dog'        / 'a photo of an engine'" },

    { t: "callout", kind: "insight", title: "Within each pair the ordering is right; across pairs it is meaningless",
      body: [{ t: "p", text: "Paraphrase beats contrast in both cases — 0.8064 over 0.6762, and 0.9594 over 0.8323. CLIP was never trained to compare two texts, only text against images, so this is **emergent transfer**: forcing both modalities into one space aligns text with text as a side effect. But notice that *dog*/*engine*, two completely unrelated concepts, scores **0.8323** — higher than *red circle*/*blue square* at 0.6762, which are at least both simple coloured shapes. The absolute value carries almost no information across different comparisons. Use these scores to **rank within a query** and never to threshold across queries, which is a standing rule for embedding retrieval and the reason recall@k is the metric rather than a similarity cutoff." }] },

    { t: "h2", n: "04", text: "ImageBind's anchor", id: "imagebind" },

    {"kind": "trace", "title": "Bind everything to images and six modalities share one space from five pair types", "caption": "**The observation is that images appear in all the natural pairings — captions give image-text, video with sound gives image-audio, RGBD cameras give image-depth, thermal cameras give image-thermal, video with motion sensors gives image-IMU.** So **you never need an audio-thermal dataset: bind each modality to images and all six end up in one space**, with the cross-pairs emerging the way §03's text-to-text similarity did. **Five pair types instead of fifteen**, and images are the only modality that could have served as the anchor.", "left": "pairing", "codeW": 150, "vars": ["data source", "needs a new dataset?"], "steps": [{"code": "image <-> text", "state": ["caption pairs", "no - CLIP-style"], "tone": "good"}, {"code": "image <-> audio", "state": ["video with sound", "no"], "changed": [0, 1], "tone": "good"}, {"code": "image <-> depth", "state": ["RGBD cameras", "no"], "changed": [0, 1], "tone": "good"}, {"code": "image <-> thermal / IMU", "state": ["thermal cameras, motion sensors", "no"], "changed": [0, 1], "tone": "good"}, {"code": "audio <-> thermal", "state": ["nothing - and not needed", "emerges"], "changed": [0, 1], "tone": "violet"}], "t": "diagram", "id": "dg-7_6-04-3"},


    { t: "out", text:
"the key observation: images appear in all the natural pairings\n\n  image <-> text       from CLIP-style caption pairs\n  image <-> audio      from video with sound\n  image <-> depth      from RGBD cameras\n  image <-> thermal    from thermal cameras\n  image <-> IMU        from video with motion sensors\n\nbind each modality to IMAGES, and all six share one space" },

    { t: "callout", kind: "crit", title: "Audio can retrieve images from a pairing never trained",
      body: [{ t: "p", text: "ImageBind never trains audio against text. It trains audio against images, and text against images, and the shared anchor makes audio-to-text work anyway — the same emergent transfer just measured for text-to-text in CLIP, scaled up. This matters because **paired data is the binding constraint in multimodal learning**. Image-text pairs exist in enormous quantity as web alt-text; audio-text pairs are far scarcer; thermal-text pairs essentially do not exist. Routing everything through the one modality that co-occurs with everything else turns an impossible data problem into a tractable one. The cost is that quality degrades for pairs mediated through the anchor rather than trained directly." }] },

    { t: "h2", n: "05", text: "Multimodal RAG", id: "rag" },

    { t: "diagram", kind: "flow", title: "Retrieve across modalities, then generate", cols: 3,
      nodes: [
        { id: "q", text: "Query: text, optionally with an image", tone: "accent" },
        { id: "t", text: "Text chunks -> text embeddings", tone: "teal" },
        { id: "i", text: "Images -> CLIP embeddings, or VLM descriptions", tone: "teal" },
        { id: "b", text: "Tables -> structured extraction", tone: "teal" },
        { id: "c", text: "Retrieved context: text, images, tables", tone: "violet" },
        { id: "v", text: "VLM generates a grounded answer", tone: "good" }
      ],
      edges: [["q","t"],["q","i"],["q","b"],["t","c"],["i","c"],["b","c"],["c","v"]] },

    { t: "dl", items: [
      ["Describe then embed", "Caption each image with a VLM and index the caption as text. Uses your existing text pipeline, and inherits the VLM's hallucinations — lesson 7.3 showed all three captions of simple shapes were wrong."],
      ["Embed directly with CLIP", "Index image embeddings and search them with the text query. No captioning step and no hallucination, but limited by CLIP's weak spots: counting, spatial relations, text in images."],
      ["Hybrid", "Do both and fuse the results. More storage and more complexity; usually the best recall."],
      ["Page-as-image (ColPali)", "Skip parsing entirely — embed the rendered page with a vision model. Preserves layout, tables and figures that text extraction destroys."]
    ] },

    { t: "callout", kind: "tradeoff", title: "The describe-then-embed trap",
      body: [{ t: "p", text: "Captioning images with a VLM and indexing the captions is the most common approach because it reuses everything you already have. It also inserts a **lossy, hallucinating** step at index time, and the errors are permanent — lesson 7.3's model captioned a red circle as *\"a white circle with a black dot\"*, and once that is in the index the image is unfindable by anyone searching for a red circle and wrongly findable by someone searching for a black dot. Direct CLIP embedding has no such step. If you use captions, evaluate them: sample a hundred and count how many are accurate before building an index on them." }] },

    { t: "h2", n: "06", text: "ColPali: retrieval without parsing", id: "colpali" },

    {"kind": "flow", "title": "Skip the parsing entirely: render the page and embed the image", "caption": "**PDF text extraction destroys exactly what makes documents comprehensible — table structure becomes a jumble of cells, figures vanish, column layout interleaves, and a chart's meaning disappears entirely.** ColPali's answer is to not do it: **render the page as an image and embed it with a vision model, so the document is preserved as the thing it actually is.** Which is 7.7's “position is semantics” argument taken to its conclusion — **if the layout carries the meaning, do not project it to one dimension at all.**", "cols": 3, "nodes": [{"id": "t", "label": "PDF -> parse -> text -> embed", "sub": "the traditional pipeline", "tone": "crit"}, {"id": "l", "label": "Tables jumble, figures vanish", "sub": "columns interleave", "tone": "crit"}, {"id": "c", "label": "ColPali: render the page as an image", "sub": "then embed it", "tone": "good"}, {"id": "p", "label": "The document is preserved", "sub": "as what it is", "tone": "violet"}, {"id": "s", "label": "7.7's argument, concluded", "sub": "do not flatten 2-D to 1-D", "tone": "teal"}], "edges": [["t", "l"], ["l", "c"], ["c", "p"], ["p", "s"]], "t": "diagram", "id": "dg-7_6-06-4"},


    { t: "out", text:
"traditional:  PDF -> parse -> extract text -> embed text -> retrieve\nColPali:      PDF -> render page as image -> embed with a vision model" },

    { t: "callout", kind: "insight", title: "Parsing is where the information is lost",
      body: [{ t: "p", text: "PDF text extraction destroys exactly what makes documents comprehensible: table structure becomes a jumble of cells, figures vanish, column layout interleaves, and a chart's meaning disappears entirely. ColPali skips it — render the page, embed the image, retrieve on that. The document is preserved as it appears. This inverts the usual instinct that text is the canonical representation and images are a degraded form; for documents, **the rendered page is the canonical form** and the extracted text is the degradation. The cost is storage and compute per page, and that the retrieval model must be strong at reading text in images — which lesson 7.2 identified as one of CLIP's weakest areas, hence the specialised models." }] },

    { t: "exercise", kind: "Challenge", title: "Build and probe an index", difficulty: "core", minutes: 40,
      requirements: [
        "Run cross-modal retrieval on your own images and check the gap between the correct match and the best distractor.",
        "Compute text-to-text similarity for pairs you understand, and confirm the ordering holds while absolute values do not compare across pairs.",
        "Caption 100 images with a VLM and count how many captions are accurate enough to index.",
        "Build both a caption index and a CLIP index over the same images, and compare recall@5.",
        "Take a PDF with tables and figures, extract it as text, and list what was lost."
      ],
      hint: "Normalise every embedding before taking dot products, and report the margin between the correct match and the best distractor, not just whether the correct one ranked first.",
      solution: {
        lang: "python", title: "build_index.py",
        code: `"""Synthetic test images with known content: counts, colours, shapes and positions are exact by construction."""
import random
from PIL import Image, ImageDraw, ImageFont
COLOURS = {"red": (220, 30, 30), "blue": (30, 60, 220), "green": (30, 160, 60), "yellow": (240, 200, 20)}

def scene(objects, size=224, bg=(245, 245, 245)):
    """objects: list of (shape, colour, (cx, cy)) with centres in 0-1 coordinates."""
    img = Image.new("RGB", (size, size), bg); d = ImageDraw.Draw(img); r = size // 10
    for shape, colour, (cx, cy) in objects:
        x, y = int(cx * size), int(cy * size); box = [x - r, y - r, x + r, y + r]
        fill = COLOURS[colour]
        if shape == "circle": d.ellipse(box, fill=fill)
        elif shape == "square": d.rectangle(box, fill=fill)
        else: d.polygon([(x, y - r), (x - r, y + r), (x + r, y + r)], fill=fill)
    return img

def count_scene(n, shape="circle", colour="red", seed=0):
    rng = random.Random(seed); spots = [(0.2 + 0.3 * (i % 3), 0.2 + 0.3 * (i // 3)) for i in range(9)]
    rng.shuffle(spots)
    return scene([(shape, colour, spots[i]) for i in range(n)])

def text_image(text, size=(448, 120)):
    img = Image.new("RGB", size, "white"); d = ImageDraw.Draw(img)
    try: font = ImageFont.truetype("arial.ttf", 40)
    except OSError: font = ImageFont.load_default()
    d.text((20, 35), text, fill="black", font=font)
    return img

# ---- the exercise ----
import os
os.environ["HF_HUB_OFFLINE"] = "1"
import torch, torch.nn.functional as F
from transformers import CLIPModel, CLIPProcessor, BlipForConditionalGeneration, BlipProcessor

clip = CLIPModel.from_pretrained("openai/clip-vit-base-patch32").eval(); cp = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
bp = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base"); blip = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base").eval()
def feats(x):
    return getattr(x, "pooler_output", x)
def img_emb(imgs):
    with torch.no_grad(): return F.normalize(feats(clip.get_image_features(**cp(images=imgs, return_tensors="pt"))), dim=-1)
def txt_emb(txts):
    with torch.no_grad(): return F.normalize(feats(clip.get_text_features(**cp(text=txts, return_tensors="pt", padding=True))), dim=-1)

# A 16-image collection with known content.
items = []
for c in ("red", "blue", "green", "yellow"):
    for s in ("circle", "square", "triangle"): items.append((f"a {c} {s}", scene([(s, c, (0.5, 0.5))])))
for n, w in ((2, "two"), (3, "three"), (4, "four"), (5, "five")): items.append((f"{w} red circles", count_scene(n)))
texts, imgs = [t for t, _ in items], [i for _, i in items]
I = img_emb(imgs)

# 1. Cross-modal retrieval: correct match against the best distractor.
T = txt_emb(texts); S = T @ I.T
gaps = [(S[i, i] - torch.cat([S[i, :i], S[i, i + 1:]]).max()).item() for i in range(len(items))]
print(f"text->image recall@1 {sum(int(S[i].argmax()) == i for i in range(len(items)))}/{len(items)}; "
      f"margin over best distractor: min {min(gaps):+.4f}, median {sorted(gaps)[len(gaps) // 2]:+.4f}")

# 2. Text-text similarity: ordering holds, absolute values do not compare across pairs.
pairs = [("a red circle", "a red disc"), ("a red circle", "a blue square"), ("an invoice total", "the amount due"), ("an invoice total", "a red circle")]
for a, b in pairs: print(f"  sim({a!r}, {b!r}) = {(txt_emb([a]) @ txt_emb([b]).T).item():.3f}")

# 3-4. Caption index (BLIP captions embedded as text) against the CLIP image index, recall@5.
def caption(img):
    with torch.no_grad(): return bp.decode(blip.generate(**bp(images=img, return_tensors="pt"), max_new_tokens=20)[0], skip_special_tokens=True)
caps = [caption(i) for i in imgs]
exact = sum(t.split()[-1].rstrip("s") in c and t.split()[-2] in c for t, c in zip(texts, caps))
print(f"\\ncaptions mentioning both the colour/count word and the shape: {exact}/{len(caps)}; e.g. {caps[12]!r} for {texts[12]!r}")
C = txt_emb(caps)
for name, index in (("CLIP image index", I), ("caption index", C)):
    hits = sum(i in (T[i] @ index.T).topk(5).indices.tolist() for i in range(len(items)))
    print(f"{name:17} recall@5 {hits}/{len(items)}")
`,
        out: `text->image recall@1 9/16; margin over best distractor: min -0.0292, median +0.0119
  sim('a red circle', 'a red disc') = 0.869
  sim('a red circle', 'a blue square') = 0.749
  sim('an invoice total', 'the amount due') = 0.883
  sim('an invoice total', 'a red circle') = 0.760

captions mentioning both the colour/count word and the shape: 9/16; e.g. 'a red dot on a white background' for 'two red circles'
CLIP image index  recall@5 16/16
caption index     recall@5 16/16`,
        notes: [
          { t: "p", text: "Text-to-image recall@1 was 9 of 16. The median margin over the best distractor was only +0.012, and the worst was negative. CLIP's similarities sit in a narrow band (anisotropy), so 'ranked first' can hang on the third decimal, and a fixed similarity threshold will not separate matches from near-misses." },
          { t: "p", text: "Text-to-text similarities kept the right order within each pair, 'red disc' above 'blue square' for 'red circle', but the values do not compare across pairs. The unrelated pair ('invoice total', 'red circle') scored 0.76, higher than the related 'red circle' / 'blue square' pair at 0.75. Rank within a query; never threshold across queries." },
          { t: "p", text: "BLIP's captions named both the colour (or count) and the shape for 9 of 16 images; 'two red circles' became 'a red dot on a white background'. At recall@5 both the image index and the caption index found all 16, because 16 images is too few to separate them. On a real collection, captions lose counts and relations, and the CLIP index keeps more visual detail. The PDF-extraction step needs a PDF parser and a real document, and is not run here." },
          { t: "p", text: "The images are drawn with PIL so their content is known exactly: counts, colours and positions are ground truth, which makes failures unambiguous. Synthetic flat shapes are easier than photographs in some ways and harder in others, so repeat the probes on your own images." }
        ]
      } }
  ],

  takeaways: [
    "A unified embedding space lets any modality query any other, provided all encoders project into it.",
    "Cross-modal retrieval scored 3/3, but the correct match at 0.2857 beat the best distractor at 0.2102 by only 0.0755 — anisotropy compresses the range.",
    "CLIP's loss never compared text to text, yet dog/puppy scores 0.9594 against dog/engine's 0.8323 — alignment transfers to untrained pairings.",
    "But dog/engine at 0.8323 exceeds red-circle/blue-square at 0.6762, so absolute scores are meaningless across different comparisons.",
    "Rank within a query; never threshold across queries. That is why recall@k is the metric rather than a similarity cutoff.",
    "ImageBind binds six modalities through images, because images co-occur with everything and paired data is the real constraint.",
    "Audio-to-text retrieval works in ImageBind without ever being trained — the same transfer, scaled.",
    "Describe-then-embed inserts a hallucinating step at index time whose errors are permanent; evaluate captions before indexing them.",
    "ColPali treats the rendered page as canonical and skips parsing, which is where table structure, figures and layout are destroyed."
  ],

  quiz: { title: "Check yourself", questions: [
    { stem: "CLIP was never trained on text-to-text pairs. Why does text-to-text similarity work?",
      options: ["It was secretly trained on text pairs", "One shared space aligns text with text", "Its text encoder is a general LM", "It does not actually work in practice"],
      answer: 1,
      why: "dog/puppy scores 0.9594 against dog/engine's 0.8323 — the ordering is correct. This transfer is exactly ImageBind's bet, scaled: bind every modality to images and pairings that were never trained together still align, because they share one space." },
    { stem: "dog/engine scores 0.8323 while red-circle/blue-square scores 0.6762. What follows?",
      options: ["The model thinks dogs and engines relate", "Raw values do not compare across queries", "The embeddings are broken", "The prompts were poorly chosen"],
      answer: 1,
      why: "Two unrelated concepts outscore two simple coloured shapes. Within each pair the ordering is correct, but the absolute scale carries almost no cross-comparison information. That is a standing rule for embedding retrieval and the reason evaluation uses recall@k rather than a similarity cutoff." },
    { stem: "Why does ImageBind use images as the anchor modality?",
      options: ["Images are the richest modality", "Images pair naturally with all others", "Image encoders are the most accurate", "It reduces the parameter count"],
      answer: 1,
      why: "Image-text pairs exist as web alt-text in enormous quantity; audio-text pairs are scarce and thermal-text pairs essentially do not exist. But images pair naturally with audio through video, with depth through RGBD, with motion through IMU. Routing everything through the one universally co-occurring modality makes the data problem tractable." },
    { stem: "What is the risk of captioning images with a VLM and indexing the captions?",
      options: ["It is too slow to run at scale", "Hallucinations become index entries", "The captions are far too short", "It needs more storage than CLIP"],
      answer: 1,
      why: "Lesson 7.3 measured a VLM captioning a red circle as 'a white circle with a black dot'. Indexed, that image is unfindable by anyone searching for a red circle and wrongly findable for a black dot. Direct CLIP embedding has no such step — if you do use captions, sample and measure their accuracy before building on them." }
  ] },

  interview: { title: "Interview", sub: "Multimodal retrieval", questions: [
    { level: "Core", q: "How would you build search over a corpus of images?",
      strong: "Embed images with CLIP, index with ANN, and search with the text query directly.",
      answer: [{ t: "p", text: "Embed every image once with CLIP, index the embeddings with approximate nearest neighbours — HNSW or IVF — and at query time embed the text and search. That works because CLIP's two towers never interact, so each image embedding depends only on that image and can be computed offline. Serving cost is one text encoding plus a sublinear search regardless of corpus size. Two things I'd do carefully. First, prompting: I measured 'a photo of a red circle' scoring 0.9951 against bare 'circle' at 0.7440 on the identical image, because CLIP's text tower was trained on web alt-text. Applying the template to queries is free accuracy. Second, I would not threshold on similarity. I measured 'dog' and 'engine' — completely unrelated — scoring 0.8323, while 'red circle' and 'blue square' scored 0.6762. The absolute values aren't comparable across queries, so a cutoff tuned on one set of queries will fail on another. Rank within a query and use recall@k to evaluate. The alternative approach, captioning each image with a VLM and indexing the text, reuses your existing pipeline but inserts a hallucinating step whose errors become permanent — I'd measure caption accuracy on a sample before committing to it." }] },
    { level: "Senior", q: "What is ImageBind's insight and why does it matter?",
      strong: "Bind every modality to images, because images co-occur with everything and paired data is the constraint.",
      answer: [{ t: "p", text: "The insight is that images appear in all the natural pairings, so you can use them as an anchor. Train image-to-text from captions, image-to-audio from video soundtracks, image-to-depth from RGBD cameras, image-to-IMU from video with motion sensors — and all six modalities end up in one shared space, so audio can retrieve text even though that pair was never trained. That matters because paired data, not compute or architecture, is the real constraint in multimodal learning. Image-text pairs exist in the hundreds of millions as web alt-text. Audio-text pairs are far scarcer. Thermal-text pairs essentially don't exist at all. Training every pair directly would need data that isn't there. Routing through the one modality that co-occurs with everything turns an impossible problem into a tractable one. I can show a small version of why it works: CLIP's loss only ever compared images against text, never text against text, and yet text-to-text similarity still orders sensibly — dog/puppy at 0.9594 against dog/engine at 0.8323. Alignment transfers to pairings the objective never touched. The honest caveat is that quality is lower for pairs mediated through the anchor than for pairs trained directly, so I'd evaluate the specific pairing I depend on rather than assuming uniform quality across the six." }] },
    { level: "Senior", q: "You need RAG over PDFs with tables and charts. How do you approach it?",
      strong: "Consider page-as-image retrieval, because parsing is where the information is lost.",
      answer: [{ t: "p", text: "I'd start by questioning the parsing step, because that's usually where the failure originates. Standard PDF text extraction destroys exactly what makes a document comprehensible — table structure becomes a jumble of cells in reading order, column layout interleaves, figures disappear, and a chart's meaning is simply gone. If the answers live in tables and charts, a text-only index cannot retrieve them regardless of how good the embeddings are. So the ColPali approach is worth serious consideration: render each page as an image and embed it with a vision retrieval model. The document is preserved as it appears, layout and all. It inverts the usual instinct that text is canonical — for documents the rendered page is canonical and the extracted text is the degradation. The costs are real: storage and compute per page are higher, and the retrieval model has to be genuinely good at reading text in images, which is one of CLIP's weakest areas, so you need a model specialised for it. If I stayed with a parse-based pipeline, I'd extract tables as structured data rather than flattened text, keep figures as images indexed separately, and use a hybrid index. And either way I'd evaluate on questions whose answers are only in tables or charts, because those are the ones a text pipeline silently fails on while the aggregate metric looks fine." }] }
  ] }
});
