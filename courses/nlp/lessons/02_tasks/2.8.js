/* ============================================================================
   LESSON 2.8 — Question Answering
   Mirrors 01_NLP_Notes.md · §16. deepset/roberta-base-squad2 is run on
   answerable and unanswerable questions, with the span search and the
   no-answer slot both computed explicitly (scratchpad/nlp/n28.py).
   ========================================================================= */
EC.receiveLesson({
  id: "2.8",

  lede: "**Asked \"What is the capital of France?\" against a paragraph about machine learning, the model answered with 0.9981 confidence — that there is no answer.** That is not a failure mode being papered over; SQuAD 2.0 trains an explicit no-answer option and the model routes to it harder than it routes to any real answer in the passage. This lesson runs the span search by hand so you can see where that 0.9981 comes from, and then builds out to open-domain QA, which is RAG under its original name.",

  objectives: [
    "Implement extractive span QA from start and end logits",
    "Explain what SQuAD 2.0 added over SQuAD 1.1 and why it matters",
    "Read a no-answer score and set an abstention threshold",
    "Distinguish extractive, generative and open-domain QA",
    "Describe the retrieve-then-read architecture and where it fails"
  ],

  prerequisites: ["2.7", "2.4"],

  blocks: [

    { t: "h2", n: "01", text: "Three kinds of question answering", id: "kinds" },

    { t: "dl", items: [
      ["Extractive QA", "The answer is a contiguous span of a given passage. The model predicts a start and an end offset. It cannot invent."],
      ["Generative QA", "The model writes an answer. More flexible, can synthesise across sentences, and can hallucinate."],
      ["Open-domain QA", "No passage is given. Retrieve candidate documents from a corpus, then read them. This is RAG."],
      ["Closed-book QA", "No passage and no retrieval — the answer comes from the model's parameters alone. Fast, and unverifiable."]
    ] },

    { t: "diagram", kind: "flow", title: "What each setup is given", cols: 3,
      nodes: [
        { id: "q", text: "Question", tone: "accent" },
        { id: "c", text: "Passage supplied by the caller", tone: "teal" },
        { id: "e", text: "Extractive reader: predict start and end", tone: "good" },
        { id: "r", text: "Retriever over a corpus", tone: "violet" },
        { id: "k", text: "Top-k passages", tone: "violet" },
        { id: "a", text: "Answer span, with its source offset", tone: "good" }
      ],
      edges: [["q","c"],["c","e"],["e","a"],["q","r"],["r","k"],["k","e"]] },

    { t: "h2", n: "02", text: "Extractive QA, unwrapped", id: "extractive" },

    { t: "p", text: "A span QA model is an encoder with two linear heads. Feed it `[CLS] question [SEP] passage [SEP]`; one head scores each token as a possible start, the other as a possible end. The answer is the span maximising the product of the two probabilities, subject to the end not preceding the start." },

    { t: "code", lang: "python", title: "scratchpad/nlp/n28.py — the span search, written out", code:
"import torch\nfrom transformers import AutoTokenizer, AutoModelForQuestionAnswering\n\nname = \"deepset/roberta-base-squad2\"\ntok = AutoTokenizer.from_pretrained(name)\nmod = AutoModelForQuestionAnswering.from_pretrained(name).eval()\n\ndef ask(question, context, max_span=30):\n    enc = tok(question, context, return_tensors=\"pt\",\n              return_offsets_mapping=True)\n    offsets = enc.pop(\"offset_mapping\")[0]\n    with torch.no_grad():\n        out = mod(**enc)\n\n    start = torch.softmax(out.start_logits, -1)[0]\n    end   = torch.softmax(out.end_logits,   -1)[0]\n\n    best, span = -1, (0, 0)\n    for i in range(len(start)):\n        for j in range(i, min(i + max_span, len(end))):   # end >= start\n            p = (start[i] * end[j]).item()\n            if p > best:\n                best, span = p, (i, j)\n\n    a, b = offsets[span[0]][0].item(), offsets[span[1]][1].item()\n    null = (start[0] * end[0]).item()      # index 0 is <s>: the no-answer slot\n    return context[a:b], best, null",
      caption: "The reference calls `pipeline(\"question-answering\", ...)`, removed in transformers 5.x. This is what it did — including the `max_span` cap, without which the model will happily return half the passage." },

    { t: "out", text:
"context: Machine learning is a subset of artificial intelligence that enables\n         systems to automatically learn and improve from experience without\n         being explicitly programmed. It was coined by Arthur Samuel in 1959.\n\nquestion                                   answer                  score    null\nWho coined the term machine learning?      'Arthur Samuel'         0.9768   0.0000\nWhen was the term coined?                  '1959'                  0.9009   0.0007\nWhat is machine learning a subset of?      'artificial intelligen  0.9885   0.0000\nWhat is the capital of France?             ''                      0.9981   0.9981\nWho invented the telephone?                ''                      0.9788   0.9788" },

    { t: "callout", kind: "insight", title: "The no-answer slot is a real prediction",
      body: [{ t: "p", text: "For the two unanswerable questions the winning span is index 0 to index 0 — the `<s>` token, which is not part of the passage at all. Its score **is** the null score, 0.9981 and 0.9788, and both are higher than the model's confidence in any genuine answer it gave. For the three answerable questions the null score is 0.0000, 0.0007 and 0.0000. The separation is four orders of magnitude, which means a threshold here is trivial to set. This is SQuAD 2.0 doing its job." }] },

    { t: "h2", n: "03", text: "What SQuAD 2.0 added", id: "squad2" },

    { t: "p", text: "SQuAD 1.1 guaranteed every question had an answer in its passage. A model trained on it never learns to decline, so at inference it returns its best guess no matter what — and a confident wrong span is far more dangerous than an abstention. SQuAD 2.0 added roughly 50,000 unanswerable questions, deliberately written to look answerable, and scored systems on getting those right too." },

    { t: "table",
      head: ["", "SQuAD 1.1", "SQuAD 2.0"],
      rows: [
        ["Unanswerable questions", "None", "About 50,000, adversarially written"],
        ["Behaviour on a bad question", "Returns its best span regardless", "Can route probability to the null slot"],
        ["What the model must learn", "Where the answer is", "Where the answer is, and whether there is one"],
        ["Deployment consequence", "Needs an external confidence filter", "Abstention is part of the model's output"]
      ] },

    { t: "callout", kind: "trap", title: "Do not threshold on the answer score alone",
      body: [{ t: "p", text: "The natural instinct is to reject answers below some confidence. But the quantity that actually identifies an unanswerable question is the **difference** between the best non-null span score and the null score, not the best score by itself. A genuinely hard but answerable question can have a low best score while the null score is lower still, and thresholding on the best score alone will reject it. Compute `score_best − score_null` and threshold that; tune the cutoff on a validation set against the cost of a wrong answer relative to a refusal." }] },

    { t: "h2", n: "04", text: "Open-domain QA: retrieve, then read", id: "opendomain" },

    { t: "p", text: "Extractive QA needs a passage. Real questions arrive without one, so you retrieve candidates first and read them second. This two-stage architecture predates the name it now travels under: retrieve-then-read is exactly retrieval-augmented generation, with an extractive reader instead of a generative one." },

    { t: "diagram", kind: "steps", title: "The retrieve-then-read pipeline",
      items: [
        { title: "1. Retrieve", text: "BM25 for lexical matching, or a dense bi-encoder for semantic matching. Usually both, fused. Returns top-k passages." },
        { title: "2. Rerank (optional)", text: "A cross-encoder scores each query-passage pair jointly. Far more accurate than the retriever and far too slow to run over the whole corpus." },
        { title: "3. Read", text: "Run the reader over each surviving passage and take the highest-scoring span, or feed all of them to a generator." },
        { title: "4. Attribute", text: "Return the source document and character offsets alongside the answer, so the claim can be checked." }
      ] },

    { t: "code", lang: "python", title: "Haystack — the pipeline assembled", code:
"from haystack import Pipeline\nfrom haystack.components.retrievers import InMemoryBM25Retriever\nfrom haystack.components.readers import ExtractiveReader\nfrom haystack.document_stores.in_memory import InMemoryDocumentStore\n\nstore = InMemoryDocumentStore()\nstore.write_documents(documents)\n\npipe = Pipeline()\npipe.add_component(\"retriever\", InMemoryBM25Retriever(document_store=store))\npipe.add_component(\"reader\", ExtractiveReader(model=\"deepset/roberta-base-squad2\"))\npipe.connect(\"retriever\", \"reader\")\n\nresult = pipe.run({\"retriever\": {\"query\": \"What is gradient descent?\"}})",
      caption: "Swap `ExtractiveReader` for a generator and this is RAG. The architecture is identical; only the last component changes." },

    { t: "callout", kind: "crit", title: "Retrieval sets the ceiling on the whole system",
      body: [{ t: "p", text: "If the passage containing the answer is not in the top-k, no reader can recover it — a perfect reader on 80% retrieval recall gives you at most 80% end-to-end. When an open-domain QA system underperforms, the retriever is the first thing to measure, not the reader, and the measurement is recall@k: what fraction of questions have a passage containing the answer somewhere in the k returned. Teams routinely upgrade the reader while the retriever is quietly capping them, because reader quality is the visible part." }] },

    { t: "h2", n: "05", text: "Extractive or generative", id: "choosing" },

    { t: "diagram", kind: "compare", title: "Which reader",
      columns: [
        { title: "Extractive reader", tone: "good", items: [
          "Answer is a span of the source",
          "Character offsets for free",
          "Cannot hallucinate",
          "Cannot combine two passages",
          "Awkward on yes/no and why questions",
          "~110M params, CPU viable"
        ] },
        { title: "Generative reader", tone: "violet", items: [
          "Answer is written fresh",
          "Attribution must be engineered",
          "Can state what no passage said",
          "Synthesises across passages",
          "Natural on any question form",
          "Billions of params, GPU"
        ] }
      ] },

    { t: "p", text: "The choice follows from the question distribution. If users ask for facts that exist verbatim in documents — a policy number, a date, a named owner — extraction answers them with citation built in and cannot invent. If users ask questions whose answers must be assembled from several places, extraction structurally cannot, and you take on the verification burden that comes with generation." },

    { t: "callout", kind: "tradeoff", title: "Abstention is a product decision, not a model one",
      body: [{ t: "p", text: "The threshold on `score_best − score_null` sets where your system says \"I don't know\", and there is no correct value in the abstract. A support bot that answers wrongly erodes trust faster than one that declines, so it should abstain readily. A research assistant whose users can check the cited source should surface a low-confidence answer with its citation and let the reader judge. Set the threshold from the cost of a wrong answer in your setting, and measure it: report accuracy on answered questions and abstention rate separately, because a single accuracy number hides which one you traded away." }] },

    { t: "exercise", title: "Build and probe a QA system",
      tasks: [
        "Run the span search on a passage of your own and print the top five candidate spans with their scores, not just the best.",
        "Ask five questions the passage cannot answer and record the null score for each. Find the threshold that separates them from your answerable questions.",
        "Remove the `max_span` cap and find a question where the model returns an absurdly long span.",
        "Index 1,000 documents, ask 50 questions, and measure recall@1, recall@5 and recall@20 for the retriever before touching the reader.",
        "Compare extractive and generative readers on the same retrieved passages. Count how many generative answers assert something no retrieved passage contains."
      ] }
  ],

  takeaways: [
    "Extractive QA is two linear heads over an encoder: score every token as a start and as an end, take the best valid span.",
    "On unanswerable questions the model returned the <s> token with scores of 0.9981 and 0.9788 — higher than its confidence in any real answer it gave.",
    "Null scores for answerable questions were 0.0000, 0.0007 and 0.0000, a four-order-of-magnitude separation that makes thresholding easy.",
    "Threshold on score_best minus score_null, never on score_best alone.",
    "SQuAD 2.0's roughly 50,000 adversarial unanswerable questions are what make abstention a model output rather than a bolt-on filter.",
    "Open-domain QA is retrieve-then-read — the same architecture as RAG, with an extractive reader instead of a generative one.",
    "Retriever recall@k is a hard ceiling on end-to-end accuracy; measure it before touching the reader.",
    "Extraction gives citation for free and cannot hallucinate; generation synthesises across passages and makes attribution your problem."
  ],

  quiz: { title: "Check yourself", questions: [
    { stem: "Where does the 0.9981 no-answer score come from?",
      options: ["A separate classifier", "The span from index 0 to index 0 — the <s> token — winning the same argmax as any other span", "A hard-coded threshold", "The tokeniser"],
      answer: 1,
      why: "SQuAD 2.0 models are trained to put probability mass on position 0 when nothing answers the question, so the null option competes in the ordinary span search. For 'What is the capital of France?' it scored 0.9981 against a passage about machine learning, while the three answerable questions had null scores of 0.0000, 0.0007 and 0.0000." },
    { stem: "Why should you threshold on score_best minus score_null rather than score_best?",
      options: ["It is faster", "Because a hard but answerable question can have a low best score while its null score is lower still", "To normalise across models", "Because score_best is unbounded"],
      answer: 1,
      why: "The quantity that identifies unanswerability is the margin between the best real span and the null option, not the absolute confidence in the span. Thresholding on score_best alone rejects genuinely answerable hard questions, which is the wrong error to make when the passage does contain the answer." },
    { stem: "What did SQuAD 2.0 add over SQuAD 1.1?",
      options: ["More passages", "About 50,000 deliberately unanswerable questions, so models learn to decline", "Longer answers", "Multiple languages"],
      answer: 1,
      why: "Every SQuAD 1.1 question had an answer in its passage, so a model trained on it never learns that declining is an option and returns its best guess regardless. The adversarially written unanswerable questions make abstention part of what the model predicts rather than something you bolt on afterwards." },
    { stem: "An open-domain QA system answers poorly. What do you measure first?",
      options: ["Reader accuracy on SQuAD", "Retriever recall@k — whether a passage containing the answer is even reaching the reader", "Model size", "Tokenisation"],
      answer: 1,
      why: "Retrieval sets a hard ceiling: if the answer-bearing passage is not in the top-k, no reader can recover it, so 80% recall@k caps end-to-end accuracy at 80% regardless of reader quality. Reader quality is the visible part, which is exactly why teams upgrade it while a weak retriever is silently capping them." }
  ] },

  interview: { title: "Interview", sub: "Question answering", questions: [
    { level: "Core", q: "How does an extractive QA model produce an answer?",
      strong: "Two heads over the encoder predict start and end distributions; the answer is the best valid span.",
      answer: [{ t: "p", text: "You feed the encoder the question and passage concatenated, and two linear heads produce a start logit and an end logit for every token. Softmax each, then search for the pair maximising the product of start probability at i and end probability at j subject to j being at or after i, usually with a maximum span length — without that cap the model will happily return half the passage. Map the winning token indices back through the offset mapping to get character positions in the original text, which is why you get citation for free. The important detail is index 0: in a SQuAD 2.0 model the `<s>` token is the no-answer option and competes in the same argmax. When I ran 'What is the capital of France?' against a machine-learning passage, that null span won at 0.9981, while the three answerable questions had null scores around 0.0000. The abstention is a prediction, not a filter I added." }] },
    { level: "Core", q: "What is the difference between extractive and generative QA, and when do you pick each?",
      strong: "Extraction cannot hallucinate and cites for free; generation synthesises across passages and needs verification.",
      answer: [{ t: "p", text: "An extractive reader returns a contiguous span of the source, so it physically cannot assert something the passage does not contain, and it hands you the character offsets to cite. A generative reader writes the answer, which means it can combine facts from several passages, handle yes/no and explanatory questions naturally, and also state things no passage said. I pick from the question distribution. If users are asking for facts that appear verbatim somewhere — a policy limit, a date, an owner — extraction answers them with attribution built in, runs on CPU at around 110M parameters, and needs no factuality review. If answers have to be assembled across documents, extraction structurally cannot do it and I take on generation plus a verification step: ground every sentence in a retrieved passage and check entailment, or accept a human in the loop. A reasonable hybrid is to run extraction first and fall back to generation only when the extractive reader abstains." }] },
    { level: "Senior", q: "Your open-domain QA system gives wrong answers. How do you debug it?",
      strong: "Decompose by stage: measure retriever recall@k first, because it caps everything downstream.",
      answer: [{ t: "p", text: "I would split the failures by stage before changing anything, because the two stages fail differently and the fixes do not transfer. First, retriever recall@k: for each failing question, is a passage containing the answer anywhere in the top-k? If it is not, the reader was never given a chance and reader work is wasted — retrieval sets a hard ceiling, so 80% recall@20 caps end-to-end accuracy at 80% no matter how good the reader is. That is the most common cause and the least often checked, because reader quality is the visible part of the system. If retrieval is fine and the reader still fails, I would look at whether the answer-bearing passage is being outranked by a distractor, which points at reranking — a cross-encoder over the top-k is usually the highest-return change available. Then I would look at the abstention threshold, because a system that answers when it should decline produces wrong answers rather than no answers, and those cost more. For fixes on the retrieval side: hybrid BM25 plus dense retrieval fused, since lexical and semantic retrieval fail on disjoint queries, and a hard look at chunking, because answers split across a chunk boundary are unretrievable by construction and that is invisible in every metric until you go looking." }] }
  ] }
});
