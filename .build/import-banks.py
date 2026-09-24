#!/usr/bin/env python
"""Import the Practice and Interview banks of a tutorial-hub domain folder
(04_Machine_Learning, 05_Deep_Learning) into Tutorial Hub lesson files.

The source is markdown: programs under "### Program N: title", scenarios
under "### Scenario N. question", interview questions under "### Qn." or
"**Qn. ...**" or "#### Qn.", grouped by "##"/"###" section headings. Each
question maps onto the `drill` block (question shown, answer folded), so the
conversion is structural: the content is the author's, the presentation is
the design system's. Nothing is added and nothing is dropped; the run prints
the count per file so the totals can be checked against the source READMEs.

Two tracks are produced per course:

    practice   programs + scenario banks       ids p<module>.<n>
    interview  the interview bank + Glassdoor  ids i<module>.<n>

Lessons are emitted as JSON (as import-practice.py does): a backtick inside
machine-generated code would otherwise end a JS template literal.

Programs are runnable; when a captured output exists at
.build/outputs/<course>/programs/<N>.txt it is shown under the code as an
`out` block, so the reader sees what the program printed when it was run.

Run: python .build/import-banks.py dl
     python .build/import-banks.py ml
"""
import io
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
HUB = os.path.join(os.path.expanduser("~"), "Desktop", "CLAUDE LEARNING", "tutorial-hub")

MAX = 25          # drills per lesson, cut on a section boundary when one exists
MIN_TAIL = 8      # a final chunk smaller than this is folded into the previous one

# ---------------------------------------------------------------- specs -----
# (file, kind, module id, short, title, blurb, outcome, difficulty)
SPECS = {
  "dl": {
    "src": "05_Deep_Learning",
    "practice": [
      ("Practice/00_PyTorch_Programs.md", "programs", "pt_programs", "P1", "PyTorch Programs",
       "Sixty-seven short PyTorch programs — models, training loops, layers and techniques — each run, with what it printed.",
       "You can write the PyTorch for any standard layer, loss or training trick from memory.", "core"),
      ("Practice/01_Fundamentals_and_Optimization.md", "scenarios", "sc_fund", "P2", "Fundamentals and Optimisation",
       "Scenario questions on the neuron, the gradient, the optimiser and regularisation.",
       "You can answer a fundamentals question with the mechanism, not the slogan.", "foundation"),
      ("Practice/02_CNNs_and_Computer_Vision.md", "scenarios", "sc_cnn", "P3", "CNNs and Computer Vision",
       "Convolution arithmetic, the architectures, detection, segmentation and the vision applications.",
       "You can reason about receptive fields, parameter counts and architecture choices under questioning.", "core"),
      ("Practice/03_Sequence_Models_and_NLP.md", "scenarios", "sc_seq", "P4", "Sequence Models and NLP",
       "RNNs, LSTMs, GRUs, embeddings, language models and the NLP tasks built on them.",
       "You can explain gating, BPTT and sequence decoding from the equations.", "core"),
      ("Practice/04_Transformers_and_Attention.md", "scenarios", "sc_tf", "P5", "Transformers and Attention",
       "Self-attention, the transformer blocks, BERT and GPT, and the modern efficiency tricks.",
       "You can derive scaled dot-product attention and say why each transformer component exists.", "advanced"),
      ("Practice/05_Generative_Models.md", "scenarios", "sc_gen", "P6", "Generative Models",
       "GANs and their failure modes, autoencoders and VAEs, diffusion, and how generation is evaluated.",
       "You can compare the generative families and diagnose a collapsing GAN.", "advanced"),
      ("Practice/06_Transfer_SelfSupervised_MetaLearning.md", "scenarios", "sc_transfer", "P7", "Transfer, Self-Supervised and Meta-Learning",
       "Fine-tuning strategy, parameter-efficient adaptation, contrastive pretraining, few-shot and meta-learning.",
       "You can plan a transfer-learning approach for a small dataset and defend it.", "advanced"),
      ("Practice/07_Reinforcement_Learning.md", "scenarios", "sc_rl", "P8", "Reinforcement Learning",
       "Value and policy methods, DQN to PPO, exploration, reward design and RLHF.",
       "You can explain the RL loop and the difference between on- and off-policy learning.", "advanced"),
      ("Practice/08_Graph_Neural_Networks.md", "scenarios", "sc_gnn", "P9", "Graph Neural Networks",
       "Message passing, GCN, GraphSAGE and GAT, over-smoothing and the graph tasks.",
       "You can describe a GNN layer as an aggregate-then-update step and name its limits.", "advanced"),
      ("Practice/09_Compression_Deployment_and_Production.md", "scenarios", "sc_prod", "P10", "Compression, Deployment and Production",
       "Pruning, quantisation, distillation, serving, NAS and the production questions.",
       "You can shrink a model for a latency budget and explain what was traded away.", "advanced"),
      ("Practice/10_Advanced_Edge_Cases.md", "scenarios", "sc_edge", "P11", "Advanced and Edge Cases",
       "The behaviours that surprise: dying ReLUs, double descent, grokking, checkerboards and forgotten eval().",
       "You recognise the odd training curve and know the experiment that explains it.", "expert"),
    ],
    "interview": [
      ("00_Interview_Bank/01_DL_Interview.md", "iv_h3", "iv_dl", "I1", "Deep Learning Interview Bank",
       "Two hundred senior-level questions across fundamentals, CNNs, sequence models, transformers, training, architectures, regularisation, NLP and production.",
       "You can answer a senior deep-learning interview question with the derivation.", "advanced"),
      ("00_Interview_Bank/02_Glassdoor_AI_Engineer.md", "glassdoor", "iv_glass", "I2", "Glassdoor AI Engineer",
       "Real AI Engineer interview questions reported on Glassdoor — algorithms, ML, deep learning, NLP and GenAI, vision, system design, ethics, data and behavioural.",
       "You have seen the question before it is asked.", "advanced"),
    ],
  },
  "maths": {
    "src": "02_Mathematics_and_Statistics",
    "practice": [
      ("Practice/01_Math_and_Stats_Scenarios.md", "scenarios_sec", "sc_math", "P1",
       "Mathematics and Statistics Scenarios",
       "Fifty situations where the mathematics decides the answer — A/B tests that mislead, models that will not converge, distributions that break an assumption.",
       "You can say what a number means, and what it does not, before anyone ships a decision on it.", "advanced"),
    ],
    "interview": [
      ("00_Interview_Bank/01_Math_and_Stats_Interview.md", "iv_h3", "iv_math", "I1",
       "Mathematics and Statistics Interview Bank",
       "One hundred questions across linear algebra, calculus and optimisation, probability, statistics, A/B testing and the applied mathematics of ML.",
       "You can answer a maths or statistics question with the definition, the formula and the reason it matters.", "advanced"),
      (["02_Descriptive_Stats_and_Probability.md", "03_Inference_and_Testing.md"], "deepdive",
       "iv_deep", "I2", "Deep Dive: The Questions Asked Most",
       "The eleven questions the reference singles out at the end of the statistics chapters — population versus sample, Bayes, MLE, the CLT, designing an A/B test, and reading a confidence interval against a p-value.",
       "You can give the long answer to the questions that come up in almost every interview.", "advanced"),
    ],
  },
  "ml": {
    "src": "04_Machine_Learning",
    "practice": [
      ("Practice/01_Fundamentals.md", "mixed", "sc_fund", "P1", "Fundamentals: Programs and Scenarios",
       "One hundred scikit-learn sample programs, then the fundamentals and cross-topic scenarios.",
       "You can write the scikit-learn for any standard step from memory and answer the basics with the mechanism.", "foundation"),
      ("Practice/02_Preprocessing_and_Feature_Engineering.md", "scenarios", "sc_prep", "P2", "Preprocessing and Feature Engineering",
       "Scaling, encoding, missing data, feature construction and selection.",
       "You can prepare a table for a model without leaking the answer into it.", "core"),
      ("Practice/03_Regression.md", "scenarios", "sc_reg", "P3", "Regression and Classification",
       "Linear and logistic regression, gradient descent and the classification questions.",
       "You can explain a coefficient, a loss and an optimiser step on a number.", "core"),
      ("Practice/04_Trees_and_Ensembles.md", "scenarios", "sc_trees", "P4", "Trees and Ensembles",
       "Decision trees, random forests and boosting.",
       "You can say why a forest and a boosted model fail differently.", "core"),
      ("Practice/05_SVM_KNN_NaiveBayes.md", "scenarios", "sc_svm", "P5", "SVM, KNN and Naive Bayes",
       "Margins and kernels, distance and neighbours, and the Bayes classifiers.",
       "You can pick between the three on a description of the data.", "core"),
      ("Practice/06_Clustering_and_DimReduction.md", "scenarios", "sc_cluster", "P6", "Clustering and Dimensionality Reduction",
       "K-means, hierarchical and density clustering, PCA and the manifold methods.",
       "You can choose k, judge a clustering and explain what PCA keeps.", "core"),
      ("Practice/07_Model_Evaluation_and_Tuning.md", "scenarios", "sc_eval", "P7", "Model Evaluation and Tuning",
       "Metrics, cross-validation and hyperparameter search.",
       "You can defend a metric choice and a validation scheme.", "core"),
      ("Practice/08_Imbalanced_TimeSeries_Recommenders.md", "scenarios", "sc_imb", "P8", "Imbalanced Data, Time Series and Recommenders",
       "Resampling and cost-sensitive learning, forecasting, and recommendation.",
       "You can handle a 3 % class, a seasonal series and a cold-start user.", "advanced"),
      ("Practice/09_NLP_and_Neural_Networks.md", "scenarios", "sc_nlp", "P9", "NLP and Neural Networks",
       "Text features and the neural-network fundamentals seen from the ML side.",
       "You can vectorise text and explain a small network's training.", "core"),
      ("Practice/10_Pipelines_Deployment_and_Advanced.md", "scenarios", "sc_pipe", "P10", "Pipelines, Deployment and Advanced",
       "Pipelines, persistence, serving, monitoring and the advanced edge cases.",
       "You can ship a model and know what will go wrong first.", "advanced"),
    ],
    "interview": [
      ("00_Interview_Bank/01_ML_Core_Interview.md", "iv_bold", "iv_ml", "I1", "Core ML Interview Bank",
       "Core machine-learning concept questions plus the scikit-learn API questions.",
       "You can answer a core ML question with the definition, the formula and the trade-off.", "advanced"),
      ("00_Interview_Bank/02_Glassdoor_DS_and_MLE.md", "glassdoor", "iv_glass", "I2", "Glassdoor Data Scientist and ML Engineer",
       "Real Glassdoor questions for Data Scientist and ML Engineer roles: SQL, statistics, coding, ML theory, product sense, A/B testing, system design, MLOps and behavioural.",
       "You have seen the question before it is asked.", "advanced"),
    ],
  },
}

PHASE = {"practice": "Practice · Programs and scenarios", "interview": "Interview · Question banks"}


# ------------------------------------------------------------- markdown -----

def inline_md(s):
    """Source markdown line -> the light markdown our inline() speaks.
    Inline maths $...$ becomes \\(...\\) so KaTeX can find it and a dollar
    amount in prose cannot be mistaken for it."""
    s = re.sub(r"<sub>.*?</sub>", "", s)
    s = re.sub(r"</?(?:b|strong|i|em|u|sup|sub|br|span|div|details|summary|kbd)[^>]*>", "", s)
    # $$...$$ inline (rare) then $...$
    s = re.sub(r"\$\$(.+?)\$\$", lambda m: "\\(" + m.group(1).strip() + "\\)", s)
    s = re.sub(r"(?<![\\$\w])\$([^$\n]+?)\$(?!\w)", lambda m: "\\(" + m.group(1).strip() + "\\)", s)
    s = re.sub(r"!\[[^\]]*\]\([^)]*\)", "", s)                 # images
    s = re.sub(r"\[([^\]]+)\]\(#[^)]*\)", r"\1", s)              # in-page anchors
    return s.strip()


def split_table_row(line):
    line = line.strip()
    if line.startswith("|"): line = line[1:]
    if line.endswith("|"): line = line[:-1]
    # a \| inside a cell is an escaped pipe
    cells = re.split(r"(?<!\\)\|", line)
    return [inline_md(c.replace("\\|", "|")) for c in cells]


def md_blocks(lines):
    """Markdown body lines -> Tutorial Hub blocks."""
    out = []
    i, n = 0, len(lines)
    para = []

    def flush():
        if para:
            text = " ".join(inline_md(x) for x in para).strip()
            if text:
                out.append({"t": "p", "text": text})
            del para[:]

    while i < n:
        l = lines[i]
        s = l.strip()
        # fenced code
        if s.startswith("```"):
            flush()
            lang = s[3:].strip().lower() or "text"
            lang = {"py": "python", "python3": "python", "sh": "bash", "shell": "bash", "console": "bash",
                    "text": "text", "txt": "text", "plaintext": "text", "output": "text", "yaml": "text",
                    "json": "text", "sql": "sql", "bash": "bash", "python": "python"}.get(lang, "text")
            j = i + 1
            buf = []
            while j < n and not lines[j].strip().startswith("```"):
                buf.append(lines[j]); j += 1
            code = "\n".join(buf).rstrip()
            if code.strip():
                out.append({"t": "code", "lang": lang, "code": code})
            i = j + 1
            continue
        # display maths
        if s.startswith("$$"):
            flush()
            if s.endswith("$$") and len(s) > 4:
                out.append({"t": "math", "tex": s[2:-2].strip()}); i += 1; continue
            j = i + 1; buf = [s[2:]]
            while j < n and not lines[j].strip().endswith("$$"):
                buf.append(lines[j]); j += 1
            if j < n: buf.append(lines[j].strip()[:-2])
            out.append({"t": "math", "tex": " ".join(x.strip() for x in buf).strip()})
            i = j + 1
            continue
        # table
        if s.startswith("|") and i + 1 < n and re.match(r"^\s*\|?\s*:?-{2,}", lines[i + 1]):
            flush()
            head = split_table_row(s)
            j = i + 2; rows = []
            while j < n and lines[j].strip().startswith("|"):
                r = split_table_row(lines[j])
                r = (r + [""] * len(head))[:len(head)]
                rows.append(r); j += 1
            out.append({"t": "table", "head": head, "rows": rows})
            i = j
            continue
        # lists
        m = re.match(r"^(\s*)([-*+]|\d+[.)])\s+(.*)$", l)
        if m:
            flush()
            ordered = m.group(2)[0].isdigit()
            items = []
            j = i
            while j < n:
                mm = re.match(r"^(\s*)([-*+]|\d+[.)])\s+(.*)$", lines[j])
                if mm:
                    depth = len(mm.group(1).replace("\t", "    ")) // 2
                    txt = inline_md(mm.group(3))
                    items.append(("— " * min(depth, 2)) + txt if depth else txt)
                    j += 1
                elif lines[j].strip() and (lines[j].startswith("  ") or lines[j].startswith("\t")) and items and not lines[j].strip().startswith("```"):
                    items[-1] += " " + inline_md(lines[j])       # continuation line
                    j += 1
                else:
                    break
            out.append({"t": "ol" if ordered else "ul", "items": items})
            i = j
            continue
        # headings inside an answer
        if re.match(r"^#{3,6}\s", s):
            flush()
            out.append({"t": "h4", "text": inline_md(re.sub(r"^#+\s*", "", s))})
            i += 1; continue
        # quotes
        if s.startswith(">"):
            flush()
            j = i; buf = []
            while j < n and lines[j].strip().startswith(">"):
                buf.append(lines[j].strip()[1:].strip()); j += 1
            text = inline_md(" ".join(x for x in buf if x))
            if text:
                out.append({"t": "quote", "text": text})
            i = j; continue
        # rules, html, blanks
        if s in ("---", "***", "___") or s.startswith("<") or not s:
            flush(); i += 1; continue
        # a "**Label:** ..." line opens its own paragraph even with no blank line before it
        if para and re.match(r"^\*\*[^*]{1,40}:\*\*", s):
            flush()
        para.append(l)
        i += 1
    flush()
    return out


# ----------------------------------------------------------------- parse ----

def read(path):
    txt = io.open(path, encoding="utf-8").read()
    return txt.replace("\r\n", "\n").split("\n")


def body_until(lines, start, stop_re):
    j = start
    fence = False
    while j < len(lines):
        s = lines[j]
        if s.strip().startswith("```"): fence = not fence
        if not fence and re.match(stop_re, s): break
        j += 1
    return lines[start:j], j


def parse_programs(lines):
    """### Program N: Title -> (n, title, blocks). Scoped to the Programs section
    when the file also carries scenarios."""
    items = []
    for i, l in enumerate(lines):
        m = re.match(r"^### Program (\d+)[:.]\s*(.*)$", l)
        if m:
            body, _ = body_until(lines, i + 1, r"^#{2,3} ")
            items.append((m.group(1), inline_md(m.group(2)), md_blocks(body), None))
    return items


def parse_scenarios(lines):
    items = []
    for i, l in enumerate(lines):
        m = re.match(r"^### Scenario (\d+)[.:]\s*(.*)$", l)
        if m:
            body, _ = body_until(lines, i + 1, r"^#{2,3} ")
            items.append((m.group(1), inline_md(m.group(2)), md_blocks(body), None))
    return items


def parse_scenarios_sec(lines):
    """Like parse_scenarios, but records the enclosing "## Part ..." heading so
    each part of the bank becomes its own lesson instead of an unnamed chunk."""
    items = []; section = None
    for i, l in enumerate(lines):
        if l.startswith("## ") and not l.startswith("## Contents"):
            section = re.sub(r"\s*\(Scenarios? \d+[–-]\d+\)\s*$", "", l[3:].strip())
            section = re.sub(r"^Part [A-Z]:\s*", "", section)
        m = re.match(r"^### Scenario (\d+)[.:]\s*(.*)$", l)
        if m:
            body, _ = body_until(lines, i + 1, r"^#{2,3} ")
            items.append((m.group(1), inline_md(m.group(2)), md_blocks(body), section))
    return items


def parse_deepdive(lines):
    """The "## N. Interview Deep Dive" sections inside the learn reference
    files: ### Q1: question, with the answer in the body. Several files may be
    concatenated, so every such section is collected, not just the first."""
    items = []
    spans = []
    open_at = None
    for i, l in enumerate(lines):
        if re.match(r"^## (?:\d+\. )?Interview Deep Dive\s*$", l):
            if open_at is not None:
                spans.append((open_at, i))
            open_at = i
        elif open_at is not None and l.startswith("## "):
            spans.append((open_at, i))
            open_at = None
    if open_at is not None:
        spans.append((open_at, len(lines)))
    for a, b in spans:
        body = lines[a:b]
        for i, l in enumerate(body):
            m = re.match(r"^### Q(\d+)[:.]\s*(.*)$", l)
            if m:
                blk, _ = body_until(body, i + 1, r"^#{2,3} ")
                items.append((str(len(items) + 1), inline_md(m.group(2)),
                              md_blocks(blk), "Deep Dive"))
    return items


def parse_iv_h3(lines):
    """## Section / ### Qn. question  (DL interview bank)."""
    items = []; section = None
    for i, l in enumerate(lines):
        if l.startswith("## ") and not l.startswith("## Contents"):
            section = re.sub(r"\s*\(Q\d+[–-]Q?\d+\)\s*$", "", l[3:].strip())
        m = re.match(r"^### Q(\d+)[.:]\s*(.*)$", l)
        if m and section:
            body, _ = body_until(lines, i + 1, r"^#{2,3} ")
            items.append((m.group(1), inline_md(m.group(2)), md_blocks(body), section))
    return items


def parse_iv_bold(lines):
    """## Part / ### Section (Qa–Qb) / **Qn. question**  (ML core bank), and the
    scikit-learn half whose questions are ### headings."""
    items = []; section = None; part = None
    i = 0
    while i < len(lines):
        l = lines[i]
        if l.startswith("## ") and not l.startswith("## Contents"):
            part = l[3:].strip(); section = part; i += 1; continue
        if l.startswith("### "):
            h = l[4:].strip()
            m = re.match(r"^Q?(\d+)[.:]\s*(.*)$", h)
            if m and part and "Scikit" in part:
                body, j = body_until(lines, i + 1, r"^#{2,3} |^\*\*Q\d+\.")
                items.append((m.group(1), inline_md(m.group(2)), md_blocks(body), section))
                i = j; continue
            section = re.sub(r"\s*\(Q\d+[–-]Q?\d+\)\s*$", "", h)
            i += 1; continue
        m = re.match(r"^\*\*Q(\d+)[.:]\s*(.*?)\*\*\s*$", l)
        if m:
            body, j = body_until(lines, i + 1, r"^#{2,3} |^\*\*Q\d+[.:]")
            items.append((m.group(1), inline_md(m.group(2)), md_blocks(body), section))
            i = j; continue
        i += 1
    return items


def parse_glassdoor(lines):
    """## Part / ### N. Category / #### Qn. title (Company — Role)."""
    items = []; section = None
    for i, l in enumerate(lines):
        if l.startswith("### "):
            h = l[4:].strip()
            if h.startswith("Continue to") or h.startswith("🎯"):
                section = None; continue
            section = re.sub(r"^\d+\.\s*", "", h)
        m = re.match(r"^#### Q?(\d+)[.:]\s*(.*)$", l)
        if m and section:
            body, _ = body_until(lines, i + 1, r"^#{2,4} ")
            items.append((m.group(1), inline_md(m.group(2)), md_blocks(body), section))
    return items


PARSERS = {"programs": parse_programs, "scenarios": parse_scenarios,
           "scenarios_sec": parse_scenarios_sec,
           "deepdive": parse_deepdive,
           "iv_h3": parse_iv_h3, "iv_bold": parse_iv_bold, "glassdoor": parse_glassdoor}


# ----------------------------------------------------------------- chunk ----

def chunk(items, kind):
    """Cut a bank into lessons of at most MAX drills, on section boundaries
    when the bank has sections, folding a tiny tail into its predecessor."""
    if kind in ("iv_h3", "iv_bold", "glassdoor", "scenarios_sec", "deepdive"):
        groups = []
        for it in items:
            if not groups or groups[-1][0] != it[3]:
                groups.append((it[3], []))
            groups[-1][1].append(it)
        lessons = []
        for sec, its in groups:
            parts = [its[k:k + MAX] for k in range(0, len(its), MAX)]
            if len(parts) > 1 and len(parts[-1]) < MIN_TAIL:
                parts[-2].extend(parts.pop())
            for pi, p in enumerate(parts):
                lessons.append((sec + (" · %d" % (pi + 1) if len(parts) > 1 else ""), p))
        # merge very small consecutive sections so a lesson is not three questions
        merged = []
        for title, p in lessons:
            if merged and len(merged[-1][1]) + len(p) <= MAX and len(merged[-1][1]) < MIN_TAIL:
                merged[-1] = (merged[-1][0] + " · " + title, merged[-1][1] + p)
            else:
                merged.append((title, p))
        return merged
    parts = [items[k:k + MAX] for k in range(0, len(items), MAX)]
    if len(parts) > 1 and len(parts[-1]) < MIN_TAIL:
        parts[-2].extend(parts.pop())
    return [(None, p) for p in parts]


# ------------------------------------------------------------------ emit ----

def program_output(course, n):
    p = os.path.join(HERE, "outputs", course, "programs", "%s.txt" % n)
    if os.path.exists(p):
        return io.open(p, encoding="utf-8").read().rstrip()
    return None


def lesson_json(course, track, lid, mod, title, sub, items, kind, seq, total):
    drills = []
    for n, q, blocks, section in items:
        body = list(blocks)
        if kind == "programs":
            o = program_output(course, n)
            if o is not None:
                body.append({"t": "out", "label": "Output when run", "text": o})
        drills.append({"t": "drill", "n": n, "q": q, "body": body,
                       "kind": "program" if kind == "programs" else ""})
    noun = {"programs": "programs", "scenarios": "scenarios"}.get(kind, "questions")
    lede = ("**%d %s** from %s." % (len(items), noun, mod[4]) +
            (" Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not."
             if kind != "programs" else
             " Read the title, write the program yourself, then open the reference version and what it printed when it was run."))
    ob = {
        "programs": ["Write each program from its title before opening the reference version",
                     "Predict the printed shapes and numbers before revealing the output",
                     "Say which layer, loss or trick each program demonstrates and when you would reach for it",
                     "Change one thing in each program — a shape, a hyperparameter — and predict what the output becomes"],
        "scenarios": ["Answer each scenario out loud before revealing the answer",
                      "Give the mechanism, not the slogan — the formula, the failure mode, the fix",
                      "Recognise the pattern behind the question so the next variant is easy",
                      "Mark the ones you got wrong and return to the lesson that covers them"],
    }.get(kind, ["Answer each question as you would in the interview, then compare against the reference answer",
                 "Lead with the definition and the formula, then the trade-off",
                 "Follow up on your own answer with the question an interviewer would ask next",
                 "Note which questions you could not answer and return to the lesson that covers them"])
    return {
        "id": lid,
        "lede": lede,
        "objectives": ob,
        "prerequisites": [],
        "blocks": ([{"t": "h2", "n": "01", "text": sub, "id": "set"}] if sub else []) + drills,
        "takeaways": [],
        "quiz": None,
        "interview": None,
    }


def emit(course):
    spec = SPECS[course]
    src = os.path.join(HUB, spec["src"])
    modules = {"practice": [], "interview": []}
    counts = []
    for track in ("practice", "interview"):
        for mi, (fname, kind, mid, short, title, blurb, outcome, diff) in enumerate(spec[track]):
            if isinstance(fname, (list, tuple)):
                lines = []
                for one in fname:
                    lines.extend(read(os.path.join(src, one)))
                fname = " + ".join(fname)
            else:
                lines = read(os.path.join(src, fname))
            if kind == "mixed":
                items = [(n, q, b, "Programs") for n, q, b, _ in parse_programs(lines)]
                scen = [(n, q, b, "Scenarios") for n, q, b, _ in parse_scenarios(lines)]
                chunks = [("Programs · %d" % (k + 1), c) for k, (_, c) in enumerate(chunk(items, "programs"))]
                chunks += [("Scenarios · %d" % (k + 1), c) for k, (_, c) in enumerate(chunk(scen, "scenarios"))]
                per_kind = {"Programs": "programs", "Scenarios": "scenarios"}
            else:
                items = PARSERS[kind](lines)
                chunks = chunk(items, kind)
                per_kind = None
            counts.append((fname, len(items) if kind != "mixed" else len(items) + len(scen)))
            prefix = "p" if track == "practice" else "i"
            dirn = "%02d_%s" % (mi + 1, mid)
            outdir = os.path.join(ROOT, "courses", course, "lessons", track, dirn)
            os.makedirs(outdir, exist_ok=True)
            for f in os.listdir(outdir):
                os.remove(os.path.join(outdir, f))
            lessons = []
            for li, (sub, its) in enumerate(chunks):
                lid = "%s%d.%d" % (prefix, mi + 1, li + 1)
                k = per_kind[its[0][3]] if per_kind else kind
                noun = {"programs": "programs", "scenarios": "scenarios"}.get(k, "questions")
                ltitle = sub if sub else ("%s · %d" % (title, li + 1))
                data = lesson_json(course, track, lid, (fname, kind, mid, short, title), ltitle, sub, its, k, li, len(chunks))
                lessons.append({
                    "id": lid, "title": ltitle, "difficulty": diff,
                    "minutes": max(20, min(60, 2 * len(its))), "tier": "should",
                    "summary": "%d %s with hidden answers%s." % (len(its), noun, (", from " + title.lower()) if sub else ""),
                    "keywords": [w.lower() for w in re.findall(r"[A-Za-z][A-Za-z-]{3,}", title)][:6],
                    "n": len(its),
                })
                header = ("/* ============================================================================\n"
                          "   %s %s — %s\n"
                          "   ----------------------------------------------------------------------------\n"
                          "   Imported from tutorial-hub/%s/%s by .build/import-banks.py —\n"
                          "   edit the importer, not this file.\n"
                          "   ========================================================================= */\n"
                          % (track.upper(), lid.upper(), ltitle, spec["src"], fname))
                js = header + "EC.receiveLesson(" + json.dumps(data, ensure_ascii=False, indent=1) + ");\n"
                io.open(os.path.join(outdir, lid + ".js"), "w", encoding="utf-8", newline="\n").write(js)
            modules[track].append({
                "id": mid, "short": short, "dir": dirn, "track": track, "numPrefix": prefix.upper(),
                "phase": PHASE[track], "title": title, "blurb": blurb, "outcome": outcome,
                "lessons": lessons, "source": fname,
            })
    # the module list for curriculum.js, as JS
    out = []
    for track in ("practice", "interview"):
        for m in modules[track]:
            ls = ",\n".join(
                '          { id: %s, title: %s, difficulty: %s, minutes: %d, tier: "should",\n'
                '            summary: %s,\n            keywords: %s }' % (
                    json.dumps(l["id"]), json.dumps(l["title"], ensure_ascii=False), json.dumps(l["difficulty"]),
                    l["minutes"], json.dumps(l["summary"], ensure_ascii=False), json.dumps(l["keywords"]))
                for l in m["lessons"])
            out.append(
                "      {\n"
                "        id: %s, short: %s, dir: %s, track: %s, numPrefix: %s,\n"
                "        phase: %s,\n"
                "        title: %s,\n"
                "        blurb: %s,\n"
                "        outcome: %s,\n"
                "        source: %s,\n"
                "        lessons: [\n%s\n        ]\n"
                "      }" % (json.dumps(m["id"]), json.dumps(m["short"]), json.dumps(m["dir"]), json.dumps(m["track"]),
                             json.dumps(m["numPrefix"]), json.dumps(m["phase"]), json.dumps(m["title"], ensure_ascii=False),
                             json.dumps(m["blurb"], ensure_ascii=False), json.dumps(m["outcome"], ensure_ascii=False),
                             json.dumps(m["source"]), ls))
    io.open(os.path.join(HERE, "banks-%s.txt" % course), "w", encoding="utf-8", newline="\n").write(",\n".join(out) + "\n")
    total = 0
    for f, c in counts:
        print("%5d  %s" % (c, f)); total += c
    print("%5d  total items" % total)
    print("modules: practice %d, interview %d; lessons: %d" % (
        len(modules["practice"]), len(modules["interview"]),
        sum(len(m["lessons"]) for t in modules.values() for m in t)))


if __name__ == "__main__":
    course = sys.argv[1] if len(sys.argv) > 1 else "dl"
    emit(course)
