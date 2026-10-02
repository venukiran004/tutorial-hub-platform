EC.receiveLesson({
  id: "5.13",

  lede: "This lesson contains the only place in the course where two of my own measurements reach opposite conclusions. In 3.10 I tested a semantic cache on support queries and found **no threshold could separate** true paraphrases from near-misses \u2014 the worst genuine pair scored 0.3975 while \u201cchange my password\u201d matched \u201creset my password\u201d at 0.8741. Here, on this module\u2019s question set, the classes separate **cleanly**: worst true paraphrase 0.8905, best false pair 0.4222, and a threshold of 0.85 gives 4 of 4 true hits and 0 false. Both measurements are correct. The difference between them is the thing worth knowing.",

  objectives: [
    "Design a semantic cache test set whose negatives are adversarial rather than convenient",
    "Explain why cache safety is a property of your traffic, not of the embedding model",
    "Distinguish a citation that resolves from one that is supported",
    "Choose what to log so a retrieval failure can be diagnosed after the fact",
    "Decide when a semantic cache is safe to deploy at all"
  ],

  prerequisites: ["5.7", "3.10"],

  blocks: [

    { t: "h2", n: "01", id: "contradiction", text: "Two measurements, opposite answers",
      sub: "And neither of them is wrong" },

    { t: "code", lang: "python", title: "g510.py \u2014 the cache test on this module's questions", code: `keys = [q for q, _, _ in QS]
KV = enc.encode(keys, normalize_embeddings=True)

# true paraphrases of stored questions -- these should hit
# plus pairs of DIFFERENT stored questions -- these must not`,
      out: `  TRUE paraphrases -- these should hit:
  stored question                        paraphrase                       cosine
  What is speculative decoding?          Explain speculative decoding     0.9108
  What is continuous batching?           How does continuous batching w   0.9559
  What is QLoRA?                         Tell me about QLoRA              0.8905
  What is catastrophic forgetting?       What does catastrophic forgett   0.9783

  DIFFERENT questions that look similar -- these must NOT hit:
  What is speculative decoding?          What is continuous batching?     0.2133
  What rank should I use for LoRA?       How many epochs should I fine-   0.1724
  What does top_p do?                    What is the frequency penalty    0.0690
  What is few-shot prompting?            What is chain-of-thought promp   0.4222

  worst true paraphrase 0.8905, best false pair 0.4222 -> separable

  threshold       true hits   false hits
  0.90                   3/4           0/4
  0.85                   4/4           0/4
  0.80                   4/4           0/4`,
      hl: [12],
      caption: "A clean gap between 0.4222 and 0.8905. Any threshold in between is perfect on this set." },

    { t: "callout", kind: "warn", title: "3.10 measured the same thing and found the opposite",
      body: [
        { t: "p", text: "In 3.10 the same model on support queries gave: worst true paraphrase **0.3975**, best false pair **0.8741** \u2014 overlapping ranges, no separating threshold, and 80% precision at the commonly recommended 0.85." },
        { t: "p", text: "Here: worst true **0.8905**, best false **0.4222** \u2014 a clean gap, perfect classification. **The same embedding model, the same metric, the same kind of test. Opposite conclusions.**" },
        { t: "p", text: "The difference is entirely in the negatives. 3.10\u2019s false pairs were *adjacent operations on the same object*: cancel against renew, change against reset, export against delete. Mine here are different topics: speculative decoding against continuous batching, top-p against frequency penalty." },
        { t: "p", text: "So my test set here is **easy**, and it is easy in exactly the way a test set assembled casually would be. I did not construct adversarial negatives \u2014 I took pairs of questions that happened to be in my evaluation set, which are about different subjects because an evaluation set is designed to cover ground." }
      ] },

    { t: "callout", kind: "trap", title: "The result you get is decided by how you choose the negatives",
      body: [
        { t: "p", text: "This is the practical content of the contradiction. A semantic cache evaluated against *randomly different* questions will report that it is safe. The same cache evaluated against *adjacent operations* will report that it is not. Neither measurement is wrong; they are measuring different traffic." },
        { t: "p", text: "And real traffic contains both. Users ask the same question in different words, and they also ask the neighbouring question \u2014 because adjacent operations on the same object are exactly what people get confused about and write in to ask." },
        { t: "p", text: "So the design rule is: **the negatives have to be the hardest pairs your product contains, not a convenience sample.** Enumerate the operations on each object \u2014 create, read, update, delete, renew, cancel, export, import \u2014 and use those as the negative set. If you cannot think of adversarial negatives, that is a reason to doubt the test rather than to trust the cache." },
        { t: "p", text: "Which also means a published threshold is meaningless. 0.85 was 80% precision on one of my sets and 100% on the other." }
      ] },

    { t: "viz", title: "The same cache test on two question sets", caption: "The separability of a semantic cache is a property of the question pairs your traffic contains.",
      svg: `<svg viewBox="0 0 760 290" width="100%" role="img" aria-label="Semantic cache separability on two different question sets">
  <text x="16" y="22" class="s-label" style="fill:var(--good)">THIS MODULE'S QUESTIONS \u2014 negatives are different topics</text>
  <text x="16" y="48" class="s-sub">false pairs</text>
  <rect x="120" y="36" width="130" height="16" rx="3" class="s-fill-bg" style="stroke:var(--line)" stroke-width="1.2"/>
  <text x="258" y="48" class="s-mono">0.07 \u2013 0.42</text>
  <text x="16" y="74" class="s-sub">true pairs</text>
  <rect x="470" y="62" width="150" height="16" rx="3" class="s-fill" style="stroke:var(--good)" stroke-width="1.4"/>
  <text x="628" y="74" class="s-mono" style="fill:var(--good)">0.89 \u2013 0.98</text>
  <line x1="340" y1="30" x2="340" y2="86" stroke="var(--good)" stroke-width="1.4" stroke-dasharray="4 3"/>
  <text x="348" y="92" class="s-mono" style="fill:var(--good)">a clean gap \u2014 any threshold here is perfect</text>

  <line x1="16" y1="112" x2="744" y2="112" stroke="var(--line)" stroke-width="1"/>

  <text x="16" y="140" class="s-label" style="fill:var(--crit)">3.10's SUPPORT QUERIES \u2014 negatives are adjacent operations</text>
  <text x="16" y="166" class="s-sub">false pairs</text>
  <rect x="120" y="154" width="500" height="16" rx="3" class="s-fill-bg" style="stroke:var(--crit)" stroke-width="1.4"/>
  <text x="628" y="166" class="s-mono" style="fill:var(--crit)">up to 0.87</text>
  <text x="16" y="192" class="s-sub">true pairs</text>
  <rect x="190" y="180" width="430" height="16" rx="3" class="s-fill" style="stroke:var(--warn)" stroke-width="1.4"/>
  <text x="628" y="192" class="s-mono" style="fill:var(--warn)">from 0.40</text>
  <text x="16" y="220" class="s-mono" style="fill:var(--crit)">the ranges overlap \u2014 no threshold separates them</text>
  <text x="16" y="240" class="s-sub">\u201cHow do I change my password?\u201d vs \u201cHow do I reset my password?\u201d scored 0.8741</text>

  <line x1="16" y1="258" x2="744" y2="258" stroke="var(--line)" stroke-width="1"/>
  <text x="16" y="282" class="s-mono" style="fill:var(--warn)">same model, same metric, opposite verdicts \u2014 the negatives decided the result</text>
</svg>` },

    { t: "callout", kind: "good", title: "What follows for deploying one",
      body: [
        { t: "p", text: "**Build the negative set adversarially or do not run the test.** List the operations on each object in your product and pair them. If the resulting worst-case false similarity sits above your best-case true similarity, no threshold is safe and the cache needs a verifier in front of each hit (3.10\u2019s conclusion)." },
        { t: "p", text: "**Scope the cache to intents where a wrong answer is cheap.** Opening hours, definitions, \u201cwhat is X\u201d \u2014 those cluster well and the cost of a near-miss is low. Anything destructive, billing-related or account-specific should not be semantically cached at all." },
        { t: "p", text: "**And remember what it is for.** 3.10\u2019s arithmetic put the compute saving at about $0.11 per thousand requests, against a latency improvement that is real and user-visible. It is a latency feature; the threshold should be set from the error cost alone." }
      ] },

    { t: "h2", n: "02", id: "citations", text: "Citations that survive review",
      sub: "Three properties, and only the first is automatic" },

    { t: "p", text: "5.7 built the mechanism: number the sources in the context, keep a mapping back to chunk, document and score, and check that every emitted citation resolves. That gives a citation that *points at something*. Two harder properties remain." },

    { t: "dl", items: [
      { k: "It resolves", v: "`[2]` maps to a chunk that was actually supplied. Four lines of regex against the mapping, and it catches a model emitting `[7]` when five sources were given \u2014 which a renderer that drops unresolvable brackets turns into an uncited claim that looks cited." },
      { k: "It is supported", v: "The claim in the sentence is actually in the cited chunk. Nothing in the generation mechanism enforces this \u2014 the model is conditioned on all five passages at once and the bracket is just text it produced. This is faithfulness, and M6 takes it up properly." },
      { k: "It is checkable", v: "A reader can verify it in seconds. This is a product decision rather than a modelling one, and it is the cheapest of the three to get right." }
    ] },

    { t: "callout", kind: "insight", title: "Render the chunk, not the filename",
      body: [
        { t: "p", text: "A citation that reads *\u201cSource: 02_LLM_Inference_Optimization.md\u201d* asks the reader to open a 30,000-character document and find the relevant passage themselves. They will not. The citation is decorative." },
        { t: "p", text: "A citation that expands to show the retrieved chunk \u2014 the exact 400 characters the model was given \u2014 can be checked at a glance. That single choice does more for trustworthiness than any prompt instruction about citing carefully, because it converts an appeal to authority into something falsifiable." },
        { t: "p", text: "It also changes the economics of the unsupported-citation problem. You cannot reliably stop a model citing a chunk that does not support its claim, and you can make that mismatch visible to the one person motivated to notice it." }
      ] },

    { t: "h2", n: "03", id: "observability", text: "What to log",
      sub: "Enough to diagnose a bad answer a week later" },

    { t: "p", text: "A RAG failure arrives as \u201cthe answer was wrong\u201d, and 5.1 established that the two causes \u2014 retrieval missed it, or the model misread it \u2014 are indistinguishable from the output. Separating them after the fact requires having logged the middle of the pipeline." },

    { t: "ol", items: [
      "**The query, and any transformed version of it.** If HyDE or a rewrite ran (5.8), the text that was actually embedded is not the text the user typed, and that is the first thing to check.",
      "**The retrieved chunk ids with their scores.** Not the text \u2014 the ids and scores, so you can tell whether the right chunk was at rank 6 or absent entirely. 5.1's whole diagnostic method depends on this.",
      "**Which pipeline stages ran.** Cache hit or miss, which route was taken (5.11), whether re-ranking fired. A bad answer from a cache hit is a completely different investigation.",
      "**The assembled context length and the generated citations.** So an unsupported citation can be traced to what was actually in the prompt.",
      "**Whether the model refused.** 5.7's refusal instruction turns retrieval failure into a visible event, and a refusal rate is a free retrieval metric \u2014 but only if it is logged as a distinct outcome rather than as an ordinary answer."
    ] },

    { t: "callout", kind: "note", title: "Scores, not just ids",
      body: [
        { t: "p", text: "The retrieval score is the cheapest diagnostic in the system and the one most often dropped. A chunk retrieved at 0.58 and a chunk retrieved at 0.21 are completely different situations \u2014 the first is a confident match, the second is the best of a bad set \u2014 and the answer text looks the same either way." },
        { t: "p", text: "A distribution of top-1 scores over production traffic is also an early warning: if it shifts downward after a corpus update, retrieval has degraded before anyone has filed a complaint. That is the closest thing to a retrieval health metric available without labels." }
      ] },

    { t: "exercise", kind: "lab", title: "Build an adversarial cache test", difficulty: "advanced", minutes: 30,
      body: "Build a semantic cache test with two negative sets: one of randomly different questions, and one of adjacent operations on the same object \u2014 cancel against renew, change against reset, export against delete. Measure the similarity distributions and the precision at several thresholds for each negative set. Then state what each set would have told you about deploying the cache.",
      requirements: [
        "Include at least four genuine paraphrase pairs as the positive set",
        "Build two negative sets: convenient (different topics) and adversarial (adjacent operations)",
        "Report the worst true similarity and the best false similarity for each negative set",
        "Report precision at 0.95, 0.90, 0.85 and 0.80 under both",
        "State the deployment decision each negative set supports"
      ],
      hint: "Write the adversarial negatives by listing the verbs your product supports for one object. If every negative you can think of is about a different subject, you have not found the hard cases yet.",
      solution: { lang: "python", title: "g510.py \u2014 the convenient negative set, and 3.10's adversarial one", code: `# the convenient negatives: pairs of different questions from the eval set
NEAR = [("What is speculative decoding?", "What is continuous batching?"),
        ("What rank should I use for LoRA?", "How many epochs should I fine-tune for?"),
        ("What does top_p do?", "What is the frequency penalty for?"),
        ("What is few-shot prompting?", "What is chain-of-thought prompting?")]

true_sims  = [float(v @ KV[keys.index(q)]) for q, v in zip(para_q, para_v)]
false_sims = [float(KV[keys.index(a)] @ KV[keys.index(b)]) for a, b in NEAR]

print(min(true_sims), max(false_sims),
      "separable" if min(true_sims) > max(false_sims) else "NOT separable")

for th in (0.95, 0.90, 0.85, 0.80):
    print(th, sum(s >= th for s in true_sims), sum(s >= th for s in false_sims))

# compare with 3.10's adversarial negatives on support queries:
#   "How do I change my password?" vs "How do I reset my password?"  -> 0.8741
#   "How do I renew my subscription?" vs "How do I cancel..."        -> 0.7767
#   worst true paraphrase there: 0.3975`,
        out: `  THIS MODULE'S SET (negatives = different topics)
  worst true paraphrase 0.8905, best false pair 0.4222 -> separable

  threshold       true hits   false hits
  0.95                   2/4           0/4
  0.90                   3/4           0/4
  0.85                   4/4           0/4
  0.80                   4/4           0/4

  3.10's SET (negatives = adjacent operations)
  worst true pair 0.3975, best false pair 0.8741 -> NOT separable
  at threshold 0.85: 22% hit rate, 80% precision`,
        notes: [
          { t: "p", text: "**The same model and metric give opposite verdicts, and the negatives decided it.** My convenient negatives here are different subjects \u2014 speculative decoding against continuous batching \u2014 and they score 0.07 to 0.42. 3.10's adversarial negatives are adjacent operations on one object and reach 0.8741, above every genuine paraphrase in that set." },
          { t: "p", text: "**A convenient negative set will tell you the cache is safe.** That is the trap: assembling negatives from an existing evaluation set gives you different-topic pairs, because evaluation sets are designed to cover ground rather than to probe boundaries." },
          { t: "p", text: "**The rule that follows: enumerate the operations on each object and pair them.** Create, read, update, delete, renew, cancel, export, import. Those are the pairs users confuse, which is why they write in about them, which is why they are in your traffic." },
          { t: "p", text: "**A published threshold is therefore meaningless.** 0.85 was 100% precision on this set and 80% on 3.10's \u2014 and 80% means one cache hit in five answers a different question, confidently and faster than any correct answer." },
          { t: "p", text: "**If the ranges overlap, no threshold is safe** and the cache needs a verifier gating each hit, or should be scoped to intents where a near-miss is cheap. That is a design decision the measurement makes for you \u2014 provided the negatives were honest." }
        ] } },

    { t: "callout", kind: "mental", title: "The model to keep",
      body: [
        { t: "p", text: "An evaluation tells you about the examples you chose. A cache test with easy negatives proves the cache can tell apart things that were never going to be confused." },
        { t: "p", text: "The useful version of any safety measurement is the adversarial one: find the hardest case your product actually contains, and measure that. If you cannot think of a hard case, that is information about your test, not about your system." }
      ] },

    { t: "callout", kind: "scenario", title: "Interview scenario",
      body: [
        { t: "p", text: "**\u201cWe tested our semantic cache and it classified every query correctly at a 0.85 threshold. Ship it?\u201d**" },
        { t: "p", text: "Not on that evidence \u2014 I would want to see the negative set before the result means anything." },
        { t: "p", text: "I have run this test twice with the same model and metric and got opposite answers. On one set the classes separated cleanly \u2014 worst true paraphrase 0.8905, best false pair 0.4222, perfect classification at 0.85. On another, the worst true pair was 0.3975 and the best false pair 0.8741, so no threshold worked at all and 0.85 gave 80% precision." },
        { t: "p", text: "The difference was entirely the negatives. The clean result used pairs of questions about different subjects. The failing one used adjacent operations on the same object \u2014 \u2018how do I change my password\u2019 against \u2018how do I reset my password\u2019, which scored 0.8741 and are different support flows with different answers." },
        { t: "p", text: "So the question I would ask is how they built the negatives. If they came from an existing evaluation set, they are almost certainly different-topic pairs, because evaluation sets are built to cover ground rather than to probe boundaries \u2014 and that test will tell you the cache is safe regardless of whether it is." },
        { t: "p", text: "The rework is specific: list the verbs the product supports for each object \u2014 create, cancel, renew, change, reset, export, delete \u2014 and pair them. If the worst false similarity then sits above the best true one, no threshold is safe, and the options are a verifier in front of each hit or scoping the cache to intents where a near-miss is cheap." },
        { t: "p", text: "And I would check what they expect it to buy. The compute saving on a measurement I ran was about eleven cents per thousand requests, against a latency improvement that is real. It is a latency feature, so the threshold should be set from the cost of a wrong answer alone \u2014 which makes the negative set the entire decision." }
      ] }
  ],

  takeaways: [
    "**Two of my own measurements of semantic caching reach opposite conclusions**, with the same model and metric \u2014 and the difference is entirely in how the negatives were chosen.",
    "**On this module's questions the classes separate cleanly**: worst true 0.8905, best false 0.4222, and 0.85 gives 4 of 4 true hits with 0 false.",
    "**On 3.10's support queries they do not**: worst true 0.3975, best false 0.8741, and 0.85 gives 80% precision \u2014 one cache hit in five answering a different question.",
    "**The negatives decided the result.** Different-subject pairs score 0.07\u20130.42; adjacent operations on the same object reach 0.87.",
    "**A convenient negative set will tell you the cache is safe**, because evaluation sets are built to cover ground rather than to probe boundaries.",
    "**Build negatives by enumerating the operations on each object** \u2014 create, cancel, renew, change, reset, export, delete \u2014 since those are the pairs users confuse and therefore ask about.",
    "**A published threshold is meaningless**: 0.85 was 100% precision on one set and 80% on the other.",
    "**A citation that resolves is not a citation that is supported.** Resolution is four lines of regex; support is faithfulness, which nothing in the generation mechanism enforces.",
    "**Render the chunk, not the filename.** A reader given 400 characters can check a claim in seconds; a reader given a document name will not check at all.",
    "**Log retrieval scores, not just chunk ids.** A chunk retrieved at 0.58 and one at 0.21 are different situations that produce identical-looking answers, and the score distribution is an early warning when a corpus update degrades retrieval."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "The same semantic cache test on two question sets gave 100% precision and 80% precision at the same 0.85 threshold. What explains the difference?",
        options: [
          "The embedding model was updated between the two measurements",
          "The negative sets differed \u2014 one used pairs about different subjects, the other used adjacent operations on the same object",
          "The second set used a different similarity metric",
          "The first set had too few positive examples to be reliable"
        ],
        answer: 1,
        why: "Same model, same metric, opposite verdicts. Different-subject pairs like \u201cspeculative decoding\u201d against \u201ccontinuous batching\u201d score 0.07\u20130.42; adjacent operations like \u201cchange my password\u201d against \u201creset my password\u201d reach 0.8741, above every genuine paraphrase in that set. Since evaluation sets are built to cover ground rather than probe boundaries, a negative set assembled from one will be the easy kind \u2014 and will report that the cache is safe regardless." },

      { stem: "How should the negative set for a semantic cache test be constructed?",
        options: [
          "By sampling randomly from production query logs",
          "By enumerating the operations the product supports on each object and pairing them \u2014 cancel against renew, change against reset",
          "By using the questions from the existing retrieval evaluation set",
          "By generating paraphrases and inverting their labels"
        ],
        answer: 1,
        why: "The failure mode a cache test exists to detect is a near-miss being served as a hit, and near-misses are structurally adjacent operations on the same object \u2014 which is also what users confuse and write in about. Random sampling and reuse of a retrieval evaluation set both produce different-topic pairs that were never going to be confused, so the test passes without evidence. If no adversarial negative comes to mind, that is information about the test rather than the system." },

      { stem: "What does verifying that a citation \u201cresolves\u201d establish?",
        options: [
          "That the cited passage supports the claim it follows",
          "Only that the source number refers to a chunk that was actually supplied in the context",
          "That the retrieval score for that chunk was above threshold",
          "That the chunk came from an authoritative document"
        ],
        answer: 1,
        why: "Resolution is a structural check against the source mapping, and it catches a model emitting [7] when five sources were provided \u2014 which a renderer that silently drops unresolvable brackets converts into an uncited claim that looks cited. Whether the passage supports the sentence is faithfulness, and nothing in generation enforces it, since the model is conditioned on all the passages at once. Rendering the chunk text rather than a filename is what makes the difference checkable by a reader." },

      { stem: "Why log retrieval scores alongside chunk ids?",
        options: [
          "To allow the index to be rebuilt from the logs",
          "Because a chunk retrieved at 0.58 and one at 0.21 are different situations that produce identical-looking answers, and the score distribution warns when retrieval degrades",
          "Because scores are required to reconstruct the ranking order",
          "To detect duplicate chunks in the index"
        ],
        answer: 1,
        why: "A confident match and the best of a bad set are indistinguishable from the generated text, so without the score a post-hoc investigation cannot tell which happened. Aggregated, the distribution of top-1 scores is the closest thing to a retrieval health metric available without labels \u2014 a downward shift after a corpus update signals degradation before any complaint arrives. The ids alone preserve the ranking order, so that is not the reason." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "The lesson where the honest answer is \u201cmy two measurements disagreed\u201d",
    questions: [
      { level: "advanced",
        q: "How would you decide whether a semantic cache is safe to deploy?",
        strong: "A strong answer makes the negative set the centre of the decision.",
        answer: [
          { t: "p", text: "By building the negative set adversarially, because that is what decides the answer. I have run this test twice with the same model and metric and got opposite verdicts." },
          { t: "p", text: "On one question set the classes separated cleanly \u2014 worst true paraphrase 0.8905, best false pair 0.4222, perfect classification at a 0.85 threshold. On another, the worst true pair was 0.3975 and the best false pair 0.8741, so the ranges overlapped and no threshold worked; 0.85 gave 80% precision, meaning one hit in five answered a different question." },
          { t: "p", text: "The difference was the negatives. The clean set paired questions about different subjects. The failing one paired adjacent operations on the same object \u2014 \u2018change my password\u2019 against \u2018reset my password\u2019 \u2014 which are different support flows with different answers and score 0.8741." },
          { t: "p", text: "So the method is to enumerate the verbs your product supports for each object and pair them: create, cancel, renew, change, reset, export, delete. If the worst false similarity exceeds the best true one, no threshold is safe and you need a verifier in front of each hit, or you scope the cache to intents where a near-miss is cheap." },
          { t: "p", text: "And the decision should be made knowing what the cache buys. The compute saving I measured was around eleven cents per thousand requests against a real latency improvement \u2014 so it is a latency feature, and the threshold should come from the cost of a wrong answer alone." }
        ] },

      { level: "core",
        q: "How do you make RAG citations trustworthy?",
        strong: "A strong answer separates three properties and knows which are achievable.",
        answer: [
          { t: "p", text: "Three properties, and only one of them is cheap. A citation that *resolves* \u2014 the number maps to a chunk that was actually supplied \u2014 is four lines of regex against the source mapping, and it catches a model emitting [7] when five sources were given, which a renderer that drops unresolvable brackets turns into an uncited claim that looks cited." },
          { t: "p", text: "A citation that is *supported* \u2014 the cited passage actually contains the claim \u2014 is much harder, because nothing in generation enforces it. The model is conditioned on all the passages at once and the bracket is text it produced. That is faithfulness and it needs its own evaluation." },
          { t: "p", text: "A citation that is *checkable* is the one I would prioritise, because it is a product decision and it is cheap. Render the retrieved chunk inline rather than a filename \u2014 a reader given 400 characters verifies a claim in seconds, a reader given a 30,000-character document name does not check at all." },
          { t: "p", text: "That last choice also changes the economics of the second property. You cannot reliably prevent an unsupported citation, and you can make it visible to the one person motivated to notice." }
        ] },

      { level: "core",
        q: "What would you log in a production RAG system?",
        strong: "A strong answer logs enough to separate the two failure causes after the fact.",
        answer: [
          { t: "p", text: "Enough to tell, a week later, whether a bad answer came from retrieval missing the text or the model misreading it \u2014 because those are indistinguishable from the output and have completely different fixes." },
          { t: "p", text: "Concretely: the query and any transformed version of it, since with HyDE or a rewrite the embedded text is not what the user typed. The retrieved chunk ids *with their scores*. Which stages ran \u2014 cache hit or miss, which route, whether re-ranking fired. The assembled context length and the emitted citations." },
          { t: "p", text: "Scores rather than just ids is the detail people drop and the one I would insist on. A chunk retrieved at 0.58 and one at 0.21 are a confident match and the best of a bad set, and the answer looks identical. Aggregated, the top-1 score distribution is the nearest thing to a retrieval health metric that needs no labels \u2014 it shifts downward when a corpus update degrades things, before anyone complains." },
          { t: "p", text: "And refusals logged as a distinct outcome. If the prompt instructs the model to say when the sources do not contain the answer, the refusal rate becomes a free retrieval metric in production \u2014 but only if it is not recorded as an ordinary response." }
        ] }
    ]
  }
});
