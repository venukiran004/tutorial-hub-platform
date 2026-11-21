/* ============================================================================
   LESSON 12.8 — The EU AI Act for the Engineer Who Ships
   Facts as of November 2026, from the European Commission's AI Act page
   (updated 19 October 2026) and the text of Regulation (EU) 2024/1689 as
   amended by the AI Omnibus. Every code block was run.
   ========================================================================= */
EC.receiveLesson({
  id: "12.8",

  lede: "Most of the EU AI Act is a lawyer's problem, but four parts of it land in your code: **telling people they are talking to an AI, marking synthetic output in a machine-readable way, the compute threshold that turns a model provider's duties up, and the dated obligations your system inventory has to track**. As of November 2026 the first two are already in force, the high-risk rules were moved to December 2027, and the cheapest compliance measure people reach for — metadata on generated images — is removed by a single JPEG re-encode, which this lesson measures.",

  objectives: [
    "Classify a system you build as provider or deployer, and name the obligations that attach to each role",
    "Place each obligation on the application timeline as amended by the AI Omnibus",
    "Estimate a model's training compute and decide whether the systemic-risk presumption applies",
    "Implement machine-readable marking of generated media and test whether it survives the pipeline",
    "Build a dated obligations check into a system inventory so that deadlines are visible before they pass"
  ],

  prerequisites: ["11.13", "12.6"],

  blocks: [

    { t: "callout", kind: "warn", title: "This lesson is engineering guidance, not legal advice",
      body: [{ t: "p", text: "The dates and article numbers below were checked against the European Commission's AI Act page (last updated 19 October 2026) and the article text on 21 November 2026. Regulations get amended — the AI Omnibus already moved two of the original dates — so treat this as a map of where the law touches code, and check the current text on EUR-Lex before you rely on a date for a decision." }] },

    { t: "h2", n: "01", id: "roles", text: "Provider or deployer",
      sub: "Your obligations follow your role, not your model" },

    { t: "p", text: "The Act assigns duties by role. A **provider** develops an AI system or a general-purpose AI (GPAI) model and places it on the market or puts it into service under its own name. A **deployer** uses an AI system under its own authority in a professional capacity. The same company is usually both: you deploy a vendor's model inside a product you provide to customers." },

    { t: "table", head: ["You build…", "Your role", "What attaches first"],
      rows: [
        ["A support chatbot on top of a vendor's API", "Provider of the chatbot system", "Telling users they are talking to an AI (Art. 50(1))"],
        ["An image or text generator offered to customers", "Provider of a generative system", "Machine-readable marking of the output (Art. 50(2))"],
        ["A CV-screening ranker bought from a vendor and used in hiring", "Deployer of a high-risk (Annex III) system", "Human oversight, monitoring and informing workers (Art. 26), from 2 December 2027"],
        ["A model you publish with open weights", "Provider of a GPAI model", "Copyright policy and a public training-content summary (Art. 53)"]
      ],
      caption: "Employment is one of the Annex III high-risk areas, alongside biometrics, critical infrastructure, education, migration and the administration of justice." },

    { t: "callout", kind: "trap", title: "Assuming the vendor carries the obligations",
      body: [{ t: "p", text: "A team wraps a vendor's model in a customer-facing assistant and assumes the model provider's compliance covers them. It covers the model. The assistant is a system **you** provide, so the Article 50(1) disclosure is yours to implement, and if you put the system to a high-risk use, the deployer duties are yours too. The vendor's documentation is an input to your obligations, not a substitute for them." }] },

    { t: "h2", n: "02", id: "timeline", text: "What applies when",
      sub: "Two dates moved; several are already behind you" },

    { t: "viz", title: "The application timeline, as amended",
      caption: "Entry into force 1 August 2024. Prohibited practices and AI literacy from 2 February 2025; GPAI obligations from 2 August 2025; transparency (Article 50) from 2 August 2026. The AI Omnibus, in force since 27 July 2026, moved Annex III high-risk obligations from August 2026 to 2 December 2027 and Annex I (AI in regulated products) from August 2027 to 2 August 2028.",
      svg: `<svg viewBox="0 0 900 250" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="AI Act timeline">
  <line x1="40" y1="120" x2="870" y2="120" class="s-stroke" stroke-width="2"/>
  <g>
    <circle cx="60" cy="120" r="7" fill="var(--accent)"/>
    <text x="60" y="95" text-anchor="middle" class="s-label">1 Aug 2024</text>
    <text x="60" y="150" text-anchor="middle" class="s-sub">in force</text>
  </g>
  <g>
    <circle cx="180" cy="120" r="7" fill="var(--crit)"/>
    <text x="180" y="95" text-anchor="middle" class="s-label">2 Feb 2025</text>
    <text x="180" y="150" text-anchor="middle" class="s-sub">prohibitions,</text>
    <text x="180" y="166" text-anchor="middle" class="s-sub">AI literacy</text>
  </g>
  <g>
    <circle cx="300" cy="120" r="7" fill="var(--accent)"/>
    <text x="300" y="95" text-anchor="middle" class="s-label">2 Aug 2025</text>
    <text x="300" y="150" text-anchor="middle" class="s-sub">GPAI model</text>
    <text x="300" y="166" text-anchor="middle" class="s-sub">obligations</text>
  </g>
  <g>
    <circle cx="430" cy="120" r="7" fill="var(--warn)"/>
    <text x="430" y="95" text-anchor="middle" class="s-label">2 Aug 2026</text>
    <text x="430" y="150" text-anchor="middle" class="s-sub">transparency</text>
    <text x="430" y="166" text-anchor="middle" class="s-sub">(Article 50)</text>
  </g>
  <g>
    <circle cx="530" cy="120" r="5" class="s-fill-2"/>
    <text x="530" y="60" text-anchor="middle" class="s-mono">21 Nov 2026</text>
    <line x1="530" y1="66" x2="530" y2="112" stroke="var(--good)" stroke-width="2" stroke-dasharray="4 3"/>
    <text x="530" y="200" text-anchor="middle" class="s-sub">today</text>
  </g>
  <g>
    <circle cx="660" cy="120" r="7" fill="var(--crit)"/>
    <text x="660" y="95" text-anchor="middle" class="s-label">2 Dec 2027</text>
    <text x="660" y="150" text-anchor="middle" class="s-sub">high-risk</text>
    <text x="660" y="166" text-anchor="middle" class="s-sub">(Annex III)</text>
  </g>
  <g>
    <circle cx="800" cy="120" r="7" fill="var(--crit)"/>
    <text x="800" y="95" text-anchor="middle" class="s-label">2 Aug 2028</text>
    <text x="800" y="150" text-anchor="middle" class="s-sub">high-risk in</text>
    <text x="800" y="166" text-anchor="middle" class="s-sub">products (Annex I)</text>
  </g>
</svg>` },

    { t: "p", text: "Two near-term dates are easy to miss. The Article 50(2) marking duty has a grace period for generative systems already on the market before 2 August 2026: they must comply by **2 December 2026**. The same date brings in the prohibitions the Omnibus added on non-consensual intimate imagery and child sexual abuse material. GPAI models already on the market before 2 August 2025 have until 2 August 2027." },

    { t: "callout", kind: "insight", title: "The delay moved dates, not duties",
      body: [{ t: "p", text: "The Omnibus pushed the high-risk start dates back by sixteen and twelve months; it did not remove the requirements. For a hiring or credit-scoring system, the human-oversight, monitoring and logging duties still arrive — in December 2027 rather than August 2026 — and building them into a system already in production is more expensive than designing them in now." }] },

    { t: "h2", n: "03", id: "compute", text: "The compute threshold",
      sub: "When a general-purpose model's provider gets extra duties" },

    { t: "p", text: "Every provider of a GPAI model must keep technical documentation for the AI Office and downstream providers, have a policy for complying with EU copyright law (including honouring text-and-data-mining opt-outs), and publish a sufficiently detailed summary of the content used for training (Article 53). Open-weight models published under a free licence are exempt from the two documentation duties, but not from the copyright policy or the training summary." },

    { t: "p", text: "A model is **presumed to have systemic risk** when its cumulative training compute exceeds **10²⁵ floating-point operations** (Article 51). Its provider then must also evaluate the model with state-of-the-art protocols including documented adversarial testing, assess and mitigate systemic risks, track and report serious incidents to the AI Office, and ensure adequate cybersecurity for the model and its infrastructure (Article 55) — and the open-weight exemption does not apply. The standard estimate of dense-transformer training compute is about six FLOPs per parameter per training token." },

    { t: "code", lang: "python", title: "where common model sizes land",
      code: `for name, params, tokens in [("7B on 2T tokens", 7e9, 2e12), ("70B on 15T tokens", 70e9, 15e12),
                             ("405B on 15.6T tokens", 405e9, 15.6e12), ("1T on 20T tokens", 1e12, 20e12)]:
    flops = 6 * params * tokens
    print(f"  {name:<22} {flops:9.2e} FLOPs   {'PRESUMED SYSTEMIC RISK' if flops > 1e25 else 'below threshold'}")`,
      out: `  7B on 2T tokens         8.40e+22 FLOPs   below threshold
  70B on 15T tokens       6.30e+24 FLOPs   below threshold
  405B on 15.6T tokens    3.79e+25 FLOPs   PRESUMED SYSTEMIC RISK
  1T on 20T tokens        1.20e+26 FLOPs   PRESUMED SYSTEMIC RISK`,
      caption: "A 70B model trained on 15 trillion tokens sits a factor of 1.6 below the line; a 405B model on a similar dataset is nearly four times over. The Commission can move the threshold by delegated act, so read it from the current text rather than hard-coding it." },

    { t: "h2", n: "04", id: "marking", text: "Marking synthetic output",
      sub: "The duty is machine-readable and detectable — and metadata alone does not survive" },

    { t: "p", text: "Article 50(2) requires providers of systems that generate synthetic audio, images, video or text to mark the outputs in a machine-readable format so that they are detectable as artificially generated. The cheapest implementation is a metadata field: IPTC defines a digital-source-type value, `trainedAlgorithmicMedia`, for exactly this. The question that matters is whether the mark is still there when the image reaches someone else." },

    { t: "code", lang: "python", title: "metadata, then one re-encode",
      code: `import io
import numpy as np
from PIL import Image, PngImagePlugin

img = (np.random.default_rng(0).random((256, 256, 3)) * 255).astype(np.uint8)   # stands in for a generated image
meta = PngImagePlugin.PngInfo()
meta.add_text("DigitalSourceType", "http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia")
png = io.BytesIO(); Image.fromarray(img).save(png, "PNG", pnginfo=meta)
print("PNG metadata after saving :", Image.open(io.BytesIO(png.getvalue())).text.get("DigitalSourceType", "MISSING").rsplit("/", 1)[-1])

jpg = io.BytesIO(); Image.open(io.BytesIO(png.getvalue())).convert("RGB").save(jpg, "JPEG", quality=80)
print("after a JPEG re-encode    :", getattr(Image.open(io.BytesIO(jpg.getvalue())), "text", {}).get("DigitalSourceType", "MISSING"))`,
      out: `PNG metadata after saving : trainedAlgorithmicMedia
after a JPEG re-encode    : MISSING`,
      caption: "Every upload pipeline that resizes, recompresses or strips EXIF — most social platforms and many CMSs — does this to your mark without anyone deciding to remove it." },

    { t: "p", text: "The robust layer is a watermark in the content itself. The simplest version adds a faint ±1 pattern generated from a secret key and detects it by correlation: an unmarked image correlates with the key pattern at about zero, with a standard deviation of one over the square root of the pixel count." },

    { t: "code", lang: "python", title: "a keyed watermark, detected by correlation",
      code: `KEY = 1234
def pattern(shape): return np.random.default_rng(KEY).choice([-1.0, 1.0], size=shape[:2])
def embed(a, strength=3.0): return np.clip(a + strength * pattern(a.shape)[..., None], 0, 255).astype(np.uint8)
def score(a):
    g = a.astype(float).mean(axis=2); g = g - g.mean(); p = pattern(a.shape)
    return float((g * p).sum() / np.sqrt((g ** 2).sum() * (p ** 2).sum()))
def jpeg(a, q):
    b = io.BytesIO(); Image.fromarray(a).save(b, "JPEG", quality=q); return np.array(Image.open(b))

marked = embed(img)
sigma = 1 / np.sqrt(img.shape[0] * img.shape[1])
for label, a in [("unmarked", img), ("marked", marked), ("marked, JPEG q80", jpeg(marked, 80)), ("marked, JPEG q50", jpeg(marked, 50))]:
    print(f"{label:<17} {score(a) / sigma:+6.1f} sigma   {'DETECTED' if score(a) > 5 * sigma else 'not detected'}")`,
      out: `unmarked            -0.0 sigma   not detected
marked             +18.0 sigma   DETECTED
marked, JPEG q80   +15.6 sigma   DETECTED
marked, JPEG q50   +14.8 sigma   DETECTED`,
      caption: "A change of at most three grey levels per pixel, invisible to a viewer, is fifteen standard deviations above chance after aggressive JPEG compression. The exercise finds the attack this naive version does not survive." },

    { t: "ladder", title: "Marking generated images",
      rungs: [
        { level: "bad", label: "A sentence in the terms of service", why: "Not machine-readable, not attached to the output",
          code: `# "Images produced by this service may be AI-generated."`,
          note: "Meets neither half of the duty: nothing in the file says it is synthetic, and nothing can detect it." },
        { level: "ok", label: "Provenance metadata on every output", why: "Machine-readable until the first re-encode",
          code: `meta.add_text("DigitalSourceType", ".../trainedAlgorithmicMedia")`,
          note: "Necessary, cheap and interoperable — and measured above as gone after one JPEG save. Use a signed provenance manifest (the C2PA standard) rather than a bare field, so a stripped or altered record is detectable." },
        { level: "best", label: "Signed provenance plus a robust watermark, tested against your own pipeline", why: "Two independent layers with a detector",
          code: `out = add_signed_manifest(embed_watermark(image, key), signer)
assert detect(recompress(resize(out))) and verify_manifest(out)`,
          note: "The metadata carries the details; the watermark survives when the metadata is stripped; and a test in CI proves both against the transformations your own delivery path applies." }
      ] },

    { t: "callout", kind: "good", title: "Disclosure for a chatbot is one line, so write the test",
      body: [{ t: "p", text: "Article 50(1) requires people to be told they are interacting with an AI unless it is obvious from the context, at the latest at the first interaction. Put the notice in the first assistant turn or the interface itself, and add a test that the first response of every new session carries it — the failure mode is a redesign that drops the banner, not a deliberate decision." }] },

    { t: "h2", n: "05", id: "inventory", text: "Dates in the inventory",
      sub: "Turn the timeline into a check that runs" },

    { t: "p", text: "Obligations attach per system and per role, and they start on fixed dates, so the useful artefact is an inventory that knows both. It does not replace legal review; it makes the next deadline visible to the people who own each system." },

    { t: "code", lang: "python", title: "obligations by system, role and date",
      code: `from datetime import date

OBLIGATIONS = [  # (applies to, condition, obligation, from)
    ("all", lambda s: True, "AI literacy of staff (Art. 4)", date(2025, 2, 2)),
    ("all", lambda s: s.get("prohibited"), "STOP: prohibited practice (Art. 5)", date(2025, 2, 2)),
    ("provider", lambda s: s.get("gpai") and not s.get("open_weights"), "GPAI technical documentation (Art. 53(1)(a)-(b))", date(2025, 8, 2)),
    ("provider", lambda s: s.get("gpai"), "copyright policy and public training-content summary (Art. 53(1)(c)-(d))", date(2025, 8, 2)),
    ("provider", lambda s: s.get("gpai") and s.get("train_flops", 0) > 1e25, "systemic-risk duties (Art. 55)", date(2025, 8, 2)),
    ("provider", lambda s: s.get("interacts_with_people"), "tell people they are talking to an AI (Art. 50(1))", date(2026, 8, 2)),
    ("provider", lambda s: s.get("generates_media"), "machine-readable marking of synthetic output (Art. 50(2))", date(2026, 8, 2)),
    ("deployer", lambda s: s.get("annex_iii"), "high-risk deployer duties (Art. 26)", date(2027, 12, 2)),
]
INVENTORY = [
    {"name": "support chatbot", "role": "provider", "interacts_with_people": True},
    {"name": "CV screening ranker", "role": "deployer", "annex_iii": True},
    {"name": "marketing image generator", "role": "provider", "generates_media": True},
    {"name": "7B model you publish with open weights", "role": "provider", "gpai": True, "open_weights": True, "train_flops": 8.4e22},
]
today = date(2026, 11, 21)
for s in INVENTORY:
    print(s["name"])
    for who, cond, text, start in OBLIGATIONS:
        if who in ("all", s["role"]) and cond(s):
            print(f"    {'in force' if start <= today else 'from ' + start.isoformat():<16} {text}")`,
      out: `support chatbot
    in force         AI literacy of staff (Art. 4)
    in force         tell people they are talking to an AI (Art. 50(1))
CV screening ranker
    in force         AI literacy of staff (Art. 4)
    from 2027-12-02  high-risk deployer duties (Art. 26)
marketing image generator
    in force         AI literacy of staff (Art. 4)
    in force         machine-readable marking of synthetic output (Art. 50(2))
7B model you publish with open weights
    in force         AI literacy of staff (Art. 4)
    in force         copyright policy and public training-content summary (Art. 53(1)(c)-(d))`,
      caption: "The open-weight model escapes the documentation duties and not the copyright and training-summary ones; above 10²⁵ FLOPs it would escape neither. The table of conditions is the part to review with your legal team; the code just makes it run." },

    { t: "callout", kind: "tradeoff", title: "How much to build before December 2027",
      body: [{ t: "p", text: "For a system that will be high-risk, the logging, human-oversight and monitoring hooks cost little to add while the system is being designed and a great deal to retrofit, and they are good engineering regardless. Formal conformity work — risk-management documentation, quality management, registration — tracks the legal deadline. Build the hooks now; schedule the paperwork." }] },

    { t: "callout", kind: "crit", title: "Fines are set on worldwide turnover",
      body: [{ t: "p", text: "Prohibited practices: up to €35 million or 7 % of total worldwide annual turnover, whichever is higher. Most other breaches, including the Article 50 transparency duties and deployer duties: up to €15 million or 3 %. Supplying incorrect or misleading information to authorities: up to €7.5 million or 1 %. For SMEs and start-ups the lower of the two amounts applies (Article 99)." }] },

    { t: "exercise", kind: "Challenge", title: "Break the watermark, then extend the inventory", difficulty: "core", minutes: 30,
      body: [{ t: "p", text: "The watermark above survived JPEG at quality 50. Attack it the way real delivery paths do — cropping and resizing — and find which transformations defeat it. Then add two systems from your own work to the inventory, decide each one's role and conditions, and print the obligations with their dates." }],
      requirements: [
        "Test the watermark against a small crop from the left, a crop from the bottom-right, a downscale-and-upscale, and a 90% resize like a screenshot",
        "Report each result in standard deviations above chance and say which attacks it survives",
        "Explain from the detector's design why the surviving and failing attacks differ",
        "Add two of your own systems to the inventory and print their obligations and dates"
      ],
      hint: "The detector compares pixel (i, j) with key-pattern cell (i, j). Ask which transformations keep each pixel at the same coordinates.",
      solution: {
        lang: "python", title: "watermark_attacks.py",
        code: `import io
import numpy as np
from PIL import Image

KEY = 1234
def pattern(h, w): return np.random.default_rng(KEY).choice([-1.0, 1.0], size=(h, w))
def embed(a, strength=3.0): return np.clip(a + strength * pattern(*a.shape[:2])[..., None], 0, 255).astype(np.uint8)
def score(a, h=256, w=256):
    """Correlate against the key pattern on the original grid; returns sigmas above chance."""
    g = np.zeros((h, w)); src = a.astype(float).mean(axis=2)[:h, :w]; g[:src.shape[0], :src.shape[1]] = src
    g = g - g.mean(); p = pattern(h, w)
    return float((g * p).sum() / np.sqrt((g ** 2).sum() * (p ** 2).sum())) * np.sqrt(h * w)

img = (np.random.default_rng(0).random((256, 256, 3)) * 255).astype(np.uint8)
m = embed(img)
def jpeg(a, q=80):
    b = io.BytesIO(); Image.fromarray(a).save(b, "JPEG", quality=q); return np.array(Image.open(b))
attacks = {
    "none": m,
    "JPEG q80": jpeg(m),
    "crop 8 px from the left": m[:, 8:],
    "crop from the bottom-right only": m[:200, :200],
    "resize to 50% and back": np.array(Image.fromarray(m).resize((128, 128)).resize((256, 256))),
    "screenshot-like: resize to 90%": np.array(Image.fromarray(m).resize((230, 230))),
}
for name, a in attacks.items():
    s = score(a); print(f"{name:<32} {s:+6.1f} sigma  {'DETECTED' if s > 5 else 'lost'}")`,
        out: `none                              +18.0 sigma  DETECTED
JPEG q80                          +15.6 sigma  DETECTED
crop 8 px from the left            -1.1 sigma  lost
crop from the bottom-right only    +5.6 sigma  DETECTED
resize to 50% and back             +6.1 sigma  DETECTED
screenshot-like: resize to 90%     +0.0 sigma  lost`,
        notes: [
          { t: "p", text: "The pattern is matched cell by cell, so what matters is whether each surviving pixel stays at its original coordinates. Cropping from the bottom-right and resizing back to the original size both keep the grid aligned — the score falls only because fewer pixels or a blurred signal remain. Cropping eight pixels from the left shifts every pixel by eight columns, and a 90 % resize puts every pixel on a different grid: the correlation collapses to chance although the image looks identical." },
          { t: "p", text: "That is the property production watermarking schemes are built around — synchronisation marks or transform domains that survive shifts and scaling — and it is why the detector must be tested against your own delivery path rather than against a standard benchmark. A mark that survives your pipeline but not a screenshot meets the letter of 'detectable' only until someone takes a screenshot." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: the marks disappeared at the CDN",
      body: [
        { t: "p", text: "**Symptom.** A media company's generative image feature had shipped with provenance metadata on every output, and a compliance review in October 2026 found that none of the images on its public site carried it." },
        { t: "p", text: "**Mechanism.** The generator wrote the metadata correctly. The image CDN, configured years earlier to shrink pages, re-encoded every upload to WebP and stripped metadata by default. The mark existed for exactly as long as the file stayed inside the generation service — the same loss this lesson measured with a single JPEG save." },
        { t: "p", text: "**Fix.** The team added a pixel-domain watermark alongside a signed provenance manifest, configured the CDN to preserve the manifest, and added an end-to-end test that fetches a freshly generated image from the public URL and runs both detectors. The test now runs on every CDN or image-pipeline change, ahead of the 2 December 2026 deadline for systems already on the market." }
      ] }
  ],

  takeaways: [
    "Obligations attach by role: a company that wraps a vendor's model in a customer-facing product is the provider of that product and owns its Article 50 duties.",
    "Prohibitions and AI literacy applied from 2 February 2025, GPAI model obligations from 2 August 2025 and the Article 50 transparency duties from 2 August 2026.",
    "The AI Omnibus moved Annex III high-risk obligations to 2 December 2027 and Annex I to 2 August 2028; it moved the dates, not the requirements.",
    "Generative systems already on the market before 2 August 2026 must meet the Article 50(2) marking duty by 2 December 2026.",
    "Training compute above 10^25 FLOPs presumes systemic risk; at about 6 FLOPs per parameter per token a 70B model on 15T tokens is below it and a 405B model on 15.6T tokens is above it.",
    "Open-weight GPAI models are exempt from the documentation duties but not from the copyright policy, the training-content summary, or any systemic-risk duty.",
    "Provenance metadata is removed by a single re-encode, measured here; a pixel-domain watermark survived JPEG at quality 50 at 15 standard deviations.",
    "A naive watermark fails on an 8-pixel shift or a 90% resize because detection depends on pixel alignment; test marks against your own delivery path.",
    "An inventory that maps each system's role and conditions to dated obligations makes the next deadline visible to the team that owns the system.",
    "Fines reach €35 million or 7% of worldwide turnover for prohibited practices and €15 million or 3% for most other breaches, with the lower figure for SMEs."
  ],

  quiz: { title: "Knowledge check", questions: [
    { stem: "You build a customer-support assistant on a third-party model's API. Who must tell users they are talking to an AI?",
      options: ["You, as the provider of the assistant system", "The model vendor, as provider of the GPAI model", "Nobody, because chatbots are not high-risk", "The end user's employer, as the deployer"],
      answer: 0,
      why: "Article 50(1) is a duty on the provider of the system that interacts with people, which is you. The vendor provides the model, not your assistant; chatbots need not be high-risk to fall under Article 50; and the employer framing confuses deployer duties for high-risk systems with the transparency duty." },
    { stem: "On 21 November 2026, do the Annex III high-risk obligations apply to a CV-screening system you deploy?",
      options: ["Not yet: the AI Omnibus moved them to 2 December 2027", "Yes: they applied from 2 August 2026 as originally scheduled", "Yes: all obligations applied when the Act entered into force", "Never: hiring systems are excluded from high-risk"],
      answer: 0,
      why: "The Omnibus, in force since 27 July 2026, moved Annex III from 2 August 2026 to 2 December 2027. The original date no longer applies, the Act was always phased rather than immediate, and employment is explicitly one of the Annex III areas rather than an exclusion." },
    { stem: "Your generator writes IPTC provenance metadata into every PNG. What did this lesson measure when one was saved as JPEG?",
      options: ["The metadata was gone after a single re-encode", "The metadata survived at quality 80 but not 50", "The metadata survived and was moved into EXIF", "The JPEG save failed because of the metadata"],
      answer: 0,
      why: "The re-encoded file carried no DigitalSourceType at all, which is why metadata alone is a weak mark. Quality did not matter for metadata — the pixel watermark is what degraded with quality — nothing was carried into EXIF, and the save succeeded silently." },
    { stem: "A model has 70 billion parameters trained on 15 trillion tokens. Is it presumed to have systemic risk?",
      options: ["No: about 6.3e24 FLOPs is below 1e25", "Yes: anything over 50 billion parameters is", "Yes: 70e9 times 15e12 is above 1e25", "No: only open-weight models can be"],
      answer: 0,
      why: "The presumption is about training compute above 10^25 FLOPs, about 6 x 7e10 x 1.5e13 = 6.3e24 here. There is no parameter-count rule, the product without the factor of six still ignores how compute is estimated, and open weights neither trigger nor prevent the presumption." }
  ] },

  interview: { title: "Interview lens", sub: "Answer out loud before opening", questions: [
    { q: "Your team is shipping a generative image feature to EU users. What do you build for the AI Act, and how do you know it works?", level: "advanced",
      strong: "Machine-readable marking under Article 50(2), in two layers — signed provenance metadata and a robust watermark — plus a test that fetches a published image through the real delivery path and runs both detectors.",
      answer: [{ t: "p", text: "I would treat the marking duty as a pipeline property rather than a generator property. The generator adds a signed provenance manifest and a pixel-domain watermark; then I test what reaches users, because CDNs, resizers and recompression strip metadata — I have measured a single JPEG save removing it — and naive watermarks fail on shifts and resizes. The acceptance test fetches a freshly generated image from the public URL and checks both. I would also note the date: systems already on the market before August 2026 have until 2 December 2026." }] },
    { q: "The high-risk obligations were delayed to December 2027. Why not wait?", level: "core",
      strong: "Because the delay moved the dates and not the requirements, and the engineering parts — logging, human oversight hooks, monitoring — are cheap at design time and expensive to retrofit.",
      answer: [{ t: "p", text: "I would split the work. Logging decisions with their inputs and model version, a way for a person to review and override, and monitoring for drift and errors are good engineering whatever the law says, and retrofitting them into a production hiring or credit system is painful. Those go in now. The formal conformity work — documentation, quality management, registration — I would schedule against the legal date, with the date tracked in our system inventory so it does not arrive as a surprise." }] },
    { q: "We fine-tuned an open-weight model and want to publish it. What changes for us?", level: "expert",
      strong: "You may become the provider of a GPAI model: open weights exempt you from the documentation duties but not from a copyright policy and a public training-content summary, and above 10^25 FLOPs from nothing; check the Commission's GPAI guidelines on when a modification makes you a provider.",
      answer: [{ t: "p", text: "Publishing means placing a model on the market, so the first question is whether our modification makes us the provider of a GPAI model — the Commission's guidelines on GPAI scope address exactly that, and I would read them with legal rather than guess. If we are, the open-source exemption covers the technical documentation duties but not the copyright policy or the training-content summary. I would also estimate the total compute: the presumption of systemic risk is about cumulative training compute above 10^25 FLOPs, and for a systemic-risk model the open-weight exemption does not apply at all." }] }
  ] }
});
