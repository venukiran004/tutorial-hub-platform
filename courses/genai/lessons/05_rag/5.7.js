EC.receiveLesson({
  id: "5.7",

  lede: "The naive pipeline is the one every tutorial shows: embed the query, take the top k, paste them into a prompt, generate. It is worth building properly rather than skipping, because it is the **baseline every later technique has to beat** \u2014 and on the shared corpus it already reaches **95% recall at k=5** for about forty lines of code and 423 context tokens per query. 5.8 through 5.11 are all attempts to improve on that number, and several of them will not. A baseline you have measured is what tells you which.",

  objectives: [
    "Assemble a complete retrieval pipeline from the pieces of 5.3 to 5.6",
    "Write a prompt template that constrains the model to the retrieved context",
    "Attach citations that point at a specific chunk rather than a document",
    "Measure the baseline so later techniques can be judged against it",
    "Recognise the failure modes the naive pipeline has by construction"
  ],

  prerequisites: ["5.4", "5.6"],

  blocks: [

    { t: "h2", n: "01", id: "whole", text: "The whole thing",
      sub: "Index once, then query" },

    { t: "code", lang: "python", title: "the index \u2014 run when the documents change", code: `from sentence_transformers import SentenceTransformer
import numpy as np

enc = SentenceTransformer("all-MiniLM-L6-v2")

chunks, meta = [], []
for name, text in load_corpus():
    for c in chunk_markdown(text, size=500, overlap=50):     # 5.4's winner
        if len(c.strip()) < 40:
            continue
        chunks.append(c)
        meta.append(name)

E = enc.encode(chunks, normalize_embeddings=True, batch_size=64)   # 5.3, 5.6`,
      out: `  12 documents, 359549 characters
  1241 chunks, mean 338 characters
  embedded in 13.2 s, 384 dimensions, 1.82 MB index`,
      caption: "Three decisions already made: the splitter (5.4), the model (5.3) and normalisation so dot product is cosine (5.6)." },

    { t: "code", lang: "python", title: "the query path \u2014 run per request", code: `def retrieve(question, k=5):
    qv = enc.encode([question], normalize_embeddings=True)
    scores = (qv @ E.T)[0]                      # cosine, both normalised
    top = np.argsort(-scores)[:k]
    return [(chunks[i], meta[i], float(scores[i])) for i in top]

def answer(question, k=5):
    hits = retrieve(question, k)
    context = "\n\n".join(
        "[%d] (%s)\n%s" % (n + 1, src, text) for n, (text, src, _) in enumerate(hits))
    prompt = PROMPT.format(context=context, question=question)
    return generate(prompt), hits`,
      hl: [3, 4],
      caption: "Numbering the chunks in the context is what makes a citation possible later \u2014 the model has something to refer to." },

    { t: "h2", n: "02", id: "prompt", text: "The prompt template",
      sub: "Four jobs, and most templates do two" },

    { t: "code", lang: "python", title: "a template that earns its lines", code: `PROMPT = """Answer the question using only the numbered sources below.

Rules:
- Use only information from the sources. Do not add anything you know separately.
- Cite the source number in square brackets after each claim, like [2].
- If the sources do not contain the answer, say "That is not in the sources."
  Do not guess.

Sources:
{context}

Question: {question}
Answer:"""`,
      caption: "The third rule is the one that is usually missing, and it is the one that decides what happens when retrieval fails." },

    { t: "dl", items: [
      { k: "Scope the model to the context", v: "\u201cUsing only the sources\u201d is the instruction that makes this RAG rather than a model answering from memory with some documents nearby. Without it, retrieved text competes with parametric knowledge and you cannot tell which produced the answer." },
      { k: "Define the citation format", v: "The numbering in the context and the bracket format in the rules have to match, or you get citation-shaped text that refers to nothing. 5.13 measures how often that happens anyway." },
      { k: "Say what to do when retrieval fails", v: "Retrieval misses 5% of the time at k=5 on this corpus. That 5% is where hallucination happens, because a model given irrelevant context and no instruction to refuse will answer from somewhere." },
      { k: "Put the question last", v: "5.8's measurement found that question-before-document scored 4 of 4 where question-after scored 2 of 4 at the same token budget \u2014 ordering is not free. Conventions differ, so it is worth testing both on your own set." }
    ] },

    { t: "callout", kind: "insight", title: "The refusal instruction is the one that matters most",
      body: [
        { t: "p", text: "A naive pipeline has one guaranteed failure mode: retrieval returns five chunks that do not contain the answer. On this corpus that is **5% of questions at k=5, and 25% at k=1**." },
        { t: "p", text: "What happens next is entirely determined by the prompt. With no instruction, the model has five passages about roughly the right topic and a question it cannot answer from them \u2014 and the fluent thing to do is produce an answer anyway, drawing on whatever it knows or on something adjacent in the context." },
        { t: "p", text: "The refusal instruction converts that silent failure into a visible one. It does not fix retrieval, and it turns \u201cconfidently wrong\u201d into \u201cI do not have that\u201d, which is a far better outcome and a loggable event \u2014 a refusal rate is a retrieval metric you get for free in production." },
        { t: "p", text: "M6 measures how reliably models actually obey it, which is the part that cannot be assumed." }
      ] },

    { t: "h2", n: "03", id: "baseline", text: "The baseline",
      sub: "What everything after this has to beat" },

    { t: "code", lang: "python", title: "g51.py \u2014 the numbers to beat", code: `for k in (1, 3, 5, 10, 20):
    cr = np.mean([recall_at_k(RANK[i], chunks, meta, *QS[i], k) for i in range(len(QS))])`,
      out: `  k              chunk recall    document recall   context tokens
  1                       75%                85%               90
  3                       90%                95%              230
  5                       95%               100%              423
  10                      95%               100%              737
  20                     100%               100%             ~1500

  retrieval latency: 11.02 ms median over 1,187 chunks
  index build: 13.2 s, 1.82 MB`,
      hl: [4],
      caption: "95% at k=5 for 423 tokens. That is the bar \u2014 and it is high enough that several later techniques will not clear it." },

    { t: "callout", kind: "trap", title: "A strong baseline is the point, not an inconvenience",
      body: [
        { t: "p", text: "It is tempting to pick a weak baseline so that later chapters look impressive. The opposite is more useful: a naive pipeline built with the decisions from 5.3 to 5.6 already made well is **hard to beat**, and knowing that saves you from shipping complexity that buys nothing." },
        { t: "p", text: "Note what is doing the work here. The same corpus with fixed-size 500-character chunks scores 90% at k=5 rather than 95%, and at 2000-character chunks it scores 75%. Most of this baseline\u2019s quality came from the chunking decision, not from anything query-time." },
        { t: "p", text: "So when a later technique shows a 5-point gain over a badly-configured baseline, the honest question is whether it beats a well-configured one. That is the comparison this lesson exists to make available." }
      ] },

    { t: "viz", title: "The naive pipeline, with the measured numbers attached", caption: "Every box is a decision made in an earlier lesson. The failure rate at the end is what the later lessons attack.",
      svg: `<svg viewBox="0 0 760 290" width="100%" role="img" aria-label="The naive RAG pipeline with measurements">
  <text x="16" y="22" class="s-label" style="fill:var(--violet)">INDEX TIME \u2014 13.2 s, once</text>
  <rect x="16" y="34" width="150" height="32" rx="5" class="s-fill-2" style="stroke:var(--violet)" stroke-width="1.2"/>
  <text x="91" y="47" text-anchor="middle" class="s-sub">chunk (5.4)</text>
  <text x="91" y="60" text-anchor="middle" class="s-sub">markdown, 500/50</text>
  <text x="176" y="54" class="s-mono">\u2192</text>
  <rect x="198" y="34" width="150" height="32" rx="5" class="s-fill-2" style="stroke:var(--violet)" stroke-width="1.2"/>
  <text x="273" y="47" text-anchor="middle" class="s-sub">embed (5.3)</text>
  <text x="273" y="60" text-anchor="middle" class="s-sub">384 dims, normalised</text>
  <text x="358" y="54" class="s-mono">\u2192</text>
  <rect x="380" y="34" width="150" height="32" rx="5" class="s-fill-2" style="stroke:var(--violet)" stroke-width="1.2"/>
  <text x="455" y="47" text-anchor="middle" class="s-sub">index (5.5)</text>
  <text x="455" y="60" text-anchor="middle" class="s-sub">1,241 vectors, 1.82 MB</text>

  <line x1="16" y1="86" x2="744" y2="86" stroke="var(--line)" stroke-width="1.2" stroke-dasharray="6 4"/>

  <text x="16" y="112" class="s-label" style="fill:var(--good)">QUERY TIME \u2014 11 ms + generation</text>
  <rect x="16" y="124" width="124" height="32" rx="5" class="s-fill" style="stroke:var(--good)" stroke-width="1.2"/>
  <text x="78" y="144" text-anchor="middle" class="s-sub">embed query</text>
  <text x="150" y="144" class="s-mono">\u2192</text>
  <rect x="172" y="124" width="124" height="32" rx="5" class="s-fill" style="stroke:var(--good)" stroke-width="1.2"/>
  <text x="234" y="137" text-anchor="middle" class="s-sub">top k = 5 (5.6)</text>
  <text x="234" y="150" text-anchor="middle" class="s-sub">cosine</text>
  <text x="306" y="144" class="s-mono">\u2192</text>
  <rect x="328" y="124" width="124" height="32" rx="5" class="s-fill" style="stroke:var(--good)" stroke-width="1.2"/>
  <text x="390" y="137" text-anchor="middle" class="s-sub">build prompt</text>
  <text x="390" y="150" text-anchor="middle" class="s-sub">423 tokens</text>
  <text x="462" y="144" class="s-mono">\u2192</text>
  <rect x="484" y="124" width="124" height="32" rx="5" class="s-fill" style="stroke:var(--accent)" stroke-width="1.4"/>
  <text x="546" y="144" text-anchor="middle" class="s-sub">generate + cite</text>

  <line x1="16" y1="182" x2="744" y2="182" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="208" class="s-label">WHAT THE BASELINE DELIVERS</text>
  <rect x="16" y="220" width="608" height="20" rx="3" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="320" y="235" text-anchor="middle" class="s-mono" style="fill:var(--good)">95% \u2014 the answer reached the prompt</text>
  <rect x="624" y="220" width="32" height="20" rx="3" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.4"/>
  <text x="666" y="235" class="s-mono" style="fill:var(--crit)">5%</text>

  <text x="16" y="266" class="s-mono" style="fill:var(--crit)">that 5% is where hallucination lives \u2014 and the prompt decides whether it is visible</text>
  <text x="16" y="284" class="s-sub">at k=1 the gap is 25%, which is why the refusal instruction is not optional</text>
</svg>` },

    { t: "h2", n: "04", id: "citations", text: "Citations that point at something",
      sub: "The chunk has an address; use it" },

    { t: "p", text: "5.2 made the structural point: a retriever knows which chunk it used, so it can produce a citation that resolves. Making that work requires three things to line up, and most implementations get two." },

    { t: "ol", items: [
      "**Number the chunks in the context** so there is something to refer to. `[1]`, `[2]`, `[3]` in the prompt text itself.",
      "**Keep the mapping** from those numbers back to the chunk, its document, its offset and its retrieval score. The model returns `[2]`; your code has to turn that into a link.",
      "**Verify the citation resolves** before showing it. A model can emit `[7]` when only five sources were provided, and a renderer that silently drops it produces an uncited claim that looks cited."
    ] },

    { t: "callout", kind: "warn", title: "A citation that is present is not a citation that is correct",
      body: [
        { t: "p", text: "The three steps above get you a citation that *resolves* \u2014 `[2]` maps to a real chunk you can show. They do not establish that the claim in the sentence actually came from that chunk, which is a different and much harder property." },
        { t: "p", text: "The model is generating text conditioned on five passages; nothing in the mechanism forces the bracket after a sentence to correspond to the passage that supports it. 5.13 measures this, and M6 takes up faithfulness properly." },
        { t: "p", text: "The practical minimum for the naive pipeline: render the citation as a link to the actual chunk text, not just a document name. A reader who can see the passage can check it; a reader given a filename cannot. That one choice does more for trustworthiness than any amount of prompt instruction." }
      ] },

    { t: "h2", n: "05", id: "failures", text: "What this pipeline cannot do",
      sub: "The list that motivates the rest of the module" },

    { t: "table",
      head: ["Failure", "Measured here", "Addressed by"],
      rows: [
        ["Query and answer share no vocabulary", "\u201cWhy divide alpha by r?\u201d at rank 15", "**5.8** query rewriting, **5.9** keyword retrieval"],
        ["Exact identifiers and rare terms", "Dense search has no notion of exact match", "**5.9** BM25 and hybrid fusion"],
        ["Top-k is right document, wrong passage", "doc recall 100% vs chunk recall 95%", "**5.4** chunking, **5.10** small-to-big"],
        ["Needs facts from several documents", "No mechanism \u2014 k chunks ranked independently", "**5.11** agentic, multi-step retrieval"],
        ["Question needs aggregation", "Retrieval returns a sample, not a population", "**5.12** query the data instead"],
        ["Same question asked repeatedly", "Full cost paid every time", "**5.13** caching, carefully"]
      ] },

    { t: "callout", kind: "note", title: "Build this first anyway",
      body: [
        { t: "p", text: "That list is an argument for reading the rest of the module, not for skipping the naive pipeline. Every row names a *specific* failure, and you can only know which ones you have by running the simple thing and looking at what it gets wrong." },
        { t: "p", text: "A team that starts with hybrid search, re-ranking and query rewriting has four systems, no baseline, and no way to attribute a bad answer to any of them. A team that starts here has one number and a list of the questions that failed." }
      ] },

    { t: "exercise", kind: "lab", title: "Build the baseline end to end", difficulty: "core", minutes: 35,
      body: "Build a complete naive RAG pipeline over your own corpus: chunk, embed, index, retrieve, assemble a prompt with numbered sources, and generate an answer with citations. Measure recall at several k and the context tokens each k costs. Then verify that every citation the model emits resolves to a chunk you actually supplied.",
      requirements: [
        "Use a structure-aware splitter if your documents have structure (5.4)",
        "Normalise the embeddings so dot product is cosine (5.6)",
        "Number the sources in the context and keep the mapping back to chunk, document and score",
        "Include an explicit instruction for what to do when the sources do not contain the answer",
        "Check for citations that refer to source numbers you did not provide"
      ],
      hint: "Keep the retrieval score in the mapping even though the prompt does not show it. It is the first thing you will want when a retrieval looks wrong.",
      solution: { lang: "python", title: "the complete baseline", code: `enc = SentenceTransformer("all-MiniLM-L6-v2")

# --- index time
chunks, meta = [], []
for name, text in load_corpus():
    for c in chunk_markdown(text, size=500, overlap=50):
        if len(c.strip()) >= 40:
            chunks.append(c); meta.append(name)
E = enc.encode(chunks, normalize_embeddings=True, batch_size=64)

# --- query time
PROMPT = """Answer the question using only the numbered sources below.

Rules:
- Use only information from the sources.
- Cite the source number in square brackets after each claim, like [2].
- If the sources do not contain the answer, say "That is not in the sources."

Sources:
{context}

Question: {question}
Answer:"""

def answer(question, k=5):
    qv = enc.encode([question], normalize_embeddings=True)
    scores = (qv @ E.T)[0]
    top = np.argsort(-scores)[:k]
    sources = [{"n": n + 1, "text": chunks[i], "doc": meta[i],
                "score": float(scores[i]), "idx": int(i)}
               for n, i in enumerate(top)]
    context = "\n\n".join("[%d] (%s)\n%s" % (s["n"], s["doc"], s["text"])
                          for s in sources)
    out = generate(PROMPT.format(context=context, question=question))

    # every citation must resolve to a source we actually supplied
    cited = set(int(m) for m in re.findall(r"\[(\d+)\]", out))
    dangling = cited - {s["n"] for s in sources}
    return out, sources, dangling`,
        out: `  index: 1241 chunks, 13.2 s, 1.82 MB

  k              chunk recall    document recall   context tokens
  1                       75%                85%               90
  3                       90%                95%              230
  5                       95%               100%              423
  10                      95%               100%              737

  retrieval: 11.02 ms median
  remaining failure: "Why divide alpha by r?" at rank 15`,
        notes: [
          { t: "p", text: "**95% recall at k=5 for 423 context tokens is the bar.** It is worth sitting with how good that is for forty lines of code \u2014 several techniques in the following lessons will not improve on it, and knowing the baseline is what lets you find that out instead of assuming." },
          { t: "p", text: "**Most of this came from chunking, not from the query path.** The same pipeline with fixed-size 500-character chunks scores 90% at k=5, and 75% at 2000 characters. The query-time code is nearly identical in all three cases." },
          { t: "p", text: "**The dangling-citation check is four lines and catches a real failure.** A model can emit `[7]` when five sources were supplied, and a renderer that drops unresolvable brackets turns that into an uncited claim that looks cited. Catching it needs the mapping you built anyway." },
          { t: "p", text: "**Keep the retrieval score in the source mapping** even though the prompt does not show it. When an answer looks wrong, the first question is whether the retrieved chunk scored 0.58 or 0.21, and that number is gone if you did not keep it." },
          { t: "p", text: "**The refusal instruction is doing work on 5% of queries** at k=5 and 25% at k=1 \u2014 those are the cases where the answer is not in the context and the model must either refuse or invent. A refusal rate in production is a retrieval metric you get for free, which M6 builds on." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "The naive pipeline is not a toy to be replaced \u2014 it is the control group. Everything after it is an intervention, and an intervention without a control is a story." },
        { t: "p", text: "Build it, measure it, write down the questions it fails. That list is the specification for the rest of the module, and most of it will turn out to be shorter than expected." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cWe are starting a RAG project. The team wants to begin with hybrid search, re-ranking and query rewriting so we do not have to retrofit them. Reasonable?\u201d**" },
        { t: "p", text: "No, and not because those techniques are wrong \u2014 they are in the following lessons for good reasons. The problem is that starting with four systems means having no baseline, so when an answer is bad there is no way to attribute it." },
        { t: "p", text: "I would build the naive pipeline first, and I would be specific that this is not a throwaway. On a real corpus, chunking well and retrieving the top five reached 95% recall for about forty lines of code \u2014 that is a genuinely strong baseline, and several of the techniques they want to add will not beat it. Finding that out costs a day; not finding it out costs a permanently more complex system." },
        { t: "p", text: "The thing I would push them to spend effort on instead is the evaluation set \u2014 twenty or thirty real questions with known answers. Without it none of those techniques can be evaluated, so the decision to keep each one becomes a matter of taste. With it, each is an experiment with a number." },
        { t: "p", text: "And I would point out where the quality actually came from in my measurement: chunking. Fixed-size 500-character chunks scored 90% at k=5, markdown-aware chunking scored 95%, and 2000-character chunks scored 75%. The query-time machinery was identical in all three. So the first day is better spent on the splitter than on the retriever." },
        { t: "p", text: "The one thing I would put in from the start, because retrofitting it is genuinely awkward, is the source mapping \u2014 numbered chunks in the context, with the chunk id, document and retrieval score kept alongside. Citations, debugging and every later evaluation depend on it, and adding it later means touching the prompt and the renderer together." }
      ] }
  ],

  takeaways: [
    "**The naive pipeline is the control group**, not a placeholder \u2014 every later technique is an intervention that has to beat it.",
    "**It reaches 95% recall at k=5 on a real corpus** for about forty lines of code, 423 context tokens and 11 ms of retrieval.",
    "**Most of that quality came from chunking**: the same pipeline scores 90% with fixed-size chunks and 75% at 2000 characters, with identical query-time code.",
    "**The prompt template has four jobs** \u2014 scope the model to the context, define the citation format, say what to do when retrieval fails, and place the question deliberately.",
    "**The refusal instruction is the one usually missing**, and it governs the 5% of queries at k=5 where the answer is not in the context at all.",
    "**That 5% is where hallucination lives**, and the prompt decides whether the failure is visible or silent. At k=1 it is 25%.",
    "**Number the sources and keep the mapping** back to chunk, document and score \u2014 citations, debugging and later evaluation all depend on it.",
    "**Check that citations resolve.** A model can emit `[7]` when five sources were supplied, and a renderer that drops it produces an uncited claim that looks cited.",
    "**A resolving citation is not a correct one** \u2014 nothing forces the bracket to match the passage that supports the sentence, which is 5.13's and M6's subject.",
    "**Render citations as links to the chunk text**, not to a filename. A reader who can see the passage can check it; one given a document name cannot."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Why should a RAG prompt include an explicit instruction about what to do when the sources do not contain the answer?",
        options: [
          "Because it improves retrieval recall",
          "Because retrieval misses some fraction of queries \u2014 5% at k=5 here \u2014 and without the instruction the model answers anyway",
          "Because it reduces the number of context tokens needed",
          "Because citation formats require a fallback case"
        ],
        answer: 1,
        why: "A naive pipeline has a guaranteed failure mode: the top-k chunks do not contain the answer, measured at 5% of queries at k=5 and 25% at k=1. Given topically-related passages and no instruction, the fluent thing for a model to do is produce an answer from adjacent context or from memory. The instruction converts a silent wrong answer into a visible refusal, which is also loggable \u2014 a refusal rate becomes a free retrieval metric. It changes nothing about retrieval itself." },

      { stem: "A naive pipeline reaches 95% recall@5. A team proposes adding hybrid search, re-ranking and query rewriting before measuring anything. What is the risk?",
        options: [
          "The techniques are incompatible with each other",
          "Without a baseline there is no way to attribute a bad answer, and some of the additions may not beat a well-configured simple pipeline",
          "The added latency will exceed the generation time",
          "Re-ranking requires a larger evaluation set than hybrid search"
        ],
        answer: 1,
        why: "A well-configured naive pipeline is a strong baseline \u2014 95% at k=5 for forty lines of code \u2014 and several later techniques will not improve on it. Starting with four systems at once means no control group, so each component's value is a matter of taste rather than measurement, and a bad answer cannot be traced to a stage. The techniques compose fine; the problem is epistemic, not technical." },

      { stem: "In the measured pipeline, where did most of the retrieval quality come from?",
        options: [
          "The choice of similarity metric",
          "Chunking \u2014 the same query-time code scores 90% with fixed-size chunks, 95% markdown-aware, and 75% at 2000 characters",
          "The number of dimensions in the embedding model",
          "The value of k"
        ],
        answer: 1,
        why: "The query path was identical across those three configurations; only the splitter changed, and recall@5 moved from 75% to 95%. That is why the first day of a RAG project is better spent on the splitter than on the retriever. Metric choice is nearly irrelevant on normalised vectors (5.6), and k is a cost dial once recall plateaus (5.1)." },

      { stem: "What does checking that a citation \u201cresolves\u201d establish?",
        options: [
          "That the claim it follows is supported by the cited passage",
          "Only that the source number refers to a chunk that was actually supplied \u2014 not that it supports the claim",
          "That the retrieval score for that chunk exceeded a threshold",
          "That the document the chunk came from is authoritative"
        ],
        answer: 1,
        why: "Resolution is a structural check: a model can emit [7] when five sources were given, and a renderer that silently drops unresolvable brackets produces an uncited claim that looks cited. Catching that is worth four lines. Whether the cited passage actually supports the sentence is a separate and much harder property \u2014 nothing in the generation mechanism enforces it \u2014 which 5.13 measures and M6 takes up as faithfulness." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "The pipeline everyone has built, and the parts most people skip",
    questions: [
      { level: "core",
        q: "Walk me through a basic RAG pipeline.",
        strong: "A strong answer separates index time from query time and mentions the prompt's refusal case.",
        answer: [
          { t: "p", text: "Two phases. At index time: load the documents, split them with a structure-aware splitter, embed each chunk with a normalised bi-encoder, and store the vectors. On a 360,000-character corpus that was 1,241 chunks, 13 seconds and a 1.8 MB index." },
          { t: "p", text: "At query time: embed the question, take the top k by cosine, assemble them into a prompt as numbered sources, and generate. Retrieval was 11 ms and k=5 cost 423 context tokens." },
          { t: "p", text: "The prompt is where the thinking is. It has to scope the model to the sources, define the citation format so the numbering in the context matches what the model emits, and \u2014 the part usually missing \u2014 say what to do when the sources do not contain the answer. That last one governs the 5% of queries where retrieval failed, which is exactly where hallucination comes from." },
          { t: "p", text: "I would also keep a mapping from each source number back to the chunk, its document and its retrieval score. Citations need it, debugging needs it, and retrofitting it means touching the prompt and the renderer together." }
        ] },

      { level: "advanced",
        q: "How good is a naive pipeline, really?",
        strong: "A strong answer has measured it and knows where the quality comes from.",
        answer: [
          { t: "p", text: "Better than people expect, if the index-time decisions are made well. On a real corpus with a labelled question set I measured 95% chunk recall at k=5 and 75% at k=1, for about forty lines of code." },
          { t: "p", text: "The important part is where that came from. Chunking, almost entirely \u2014 the identical query path scored 90% at k=5 with fixed-size 500-character chunks, 95% with markdown-aware chunking, and 75% with 2000-character chunks. The retriever, the metric and k were the same in all three." },
          { t: "p", text: "That matters for how you spend the first week. Hybrid search and re-ranking are real techniques with real gains, and they are competing against a 95% baseline, so the headroom is five points. The chunking decision had 20 points in it." },
          { t: "p", text: "It also means a weak baseline makes later techniques look better than they are. If someone reports that re-ranking gained them fifteen points, my first question is what their chunk size was." }
        ] },

      { level: "core",
        q: "How do you handle citations?",
        strong: "A strong answer distinguishes a citation that resolves from one that is correct.",
        answer: [
          { t: "p", text: "Number the chunks in the context, instruct the model to cite those numbers in a fixed format, and keep a mapping from each number back to the chunk text, its document and its retrieval score." },
          { t: "p", text: "Then verify that every citation the model emits resolves to a source you actually supplied. Models emit [7] when five sources were given, and a renderer that silently drops unresolvable brackets turns that into an uncited claim that looks cited. It is four lines of regex against the mapping." },
          { t: "p", text: "What that gives you is a citation that resolves, which is not the same as one that is correct. Nothing in the generation forces the bracket after a sentence to correspond to the passage that supports it \u2014 the model is conditioned on all five at once. Measuring that gap is a separate exercise and it is where the real faithfulness work lives." },
          { t: "p", text: "The cheapest thing that improves trustworthiness is rendering the citation as a link to the chunk text rather than to a document name. A reader who can see the passage can check the claim in a second; a reader given a filename has to go and search the document themselves, and so they will not." }
        ] }
    ]
  }
});
