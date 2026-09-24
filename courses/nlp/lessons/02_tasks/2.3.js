/* ============================================================================
   LESSON 2.3 — Topic Modelling
   Mirrors 01_NLP_Notes.md · §11. LDA is fitted on real 20-newsgroups data and
   its topics checked against the categories it was never shown; perplexity is
   swept over k and found not to select it (scratchpad/nlp/n22.py).
   ========================================================================= */
EC.receiveLesson({
  id: "2.3",

  lede: "**LDA found hockey with 93 % purity, merged computer graphics with space, and invented a topic made entirely of box-score numbers.** That is a realistic picture of what unsupervised topic modelling gives you: genuine structure, some of it useful, some of it an artefact of the corpus, and no way for the algorithm to tell you which is which. This lesson fits it on real documents, checks the topics against labels it never saw, and shows why perplexity cannot choose the number of topics.",

  objectives: [
    "Describe LDA's generative story and what a topic actually is",
    "Fit LDA and read the top words per topic",
    "Evaluate topics against known categories",
    "Explain why perplexity does not select the number of topics",
    "Choose between LDA, NMF and embedding-based clustering"
  ],

  prerequisites: ["2.2", "1.4"],

  blocks: [

    { t: "h2", n: "01", text: "What a topic is", id: "definition" },

    { t: "callout", kind: "mental", title: "A topic is a probability distribution over the vocabulary",
      body: [{ t: "p", text: "Not a label, not a cluster of documents — a **distribution over words**. The topic you would call *hockey* is simply one where `game`, `team`, `hockey` and `nhl` have high probability and everything else has low probability. LDA's generative story is that each document is a mixture of topics, and each word in it was produced by first picking a topic from that document's mixture and then picking a word from that topic's distribution. Fitting the model means running that story backwards: given the words, infer the mixtures and the distributions. Nothing in it knows what a topic *means* — the interpretation is yours, and it is done by reading the top words." }] },

    { t: "math", tex: "\\theta_d \\sim \\text{Dir}(\\alpha), \\quad \\phi_k \\sim \\text{Dir}(\\beta), \\quad z_{dn} \\sim \\text{Cat}(\\theta_d), \\quad w_{dn} \\sim \\text{Cat}(\\phi_{z_{dn}})" },

    { t: "p", text: "The two Dirichlet priors are what put the *latent Dirichlet* in the name. `α` controls how concentrated each document's topic mixture is — low `α` means each document is about one or two topics, high `α` means documents blend many. `β` does the same for how concentrated each topic is over words." },

    { t: "h2", n: "02", text: "Fitting it", id: "fitting" },

    { t: "code", lang: "python", title: "The reference's setup",
      code: `vectorizer = CountVectorizer(max_df=0.95, min_df=2, stop_words="english")
dtm = vectorizer.fit_transform(documents)

lda = LatentDirichletAllocation(
    n_components=5, max_iter=20,
    learning_method="online", random_state=42)
lda.fit(dtm)`,
      caption: "LDA takes raw **counts**, not TF-IDF — the generative story is about drawing words, and a fractional weight has no interpretation in it. `max_df=0.95` and `stop_words` do the job idf would have done." },

    { t: "out", text: `  2323 documents, 14444 terms after max_df/min_df filtering
  (the real categories, which LDA is NOT told:
   ['comp.graphics', 'rec.sport.hockey', 'sci.space', 'talk.politics.guns'])

  topic 0: space data image graphics edu nasa use program
            -> comp.graphics        532/910 = 58% pure
  topic 1: game team hockey season play games players nhl
            -> rec.sport.hockey     490/525 = 93% pure
  topic 2: pts la pt 16 10 vs 25 11
            -> rec.sport.hockey     39/48 = 81% pure
  topic 3: people gun don just like think guns time
            -> talk.politics.guns   509/840 = 61% pure` },

    { t: "callout", kind: "insight", title: "Three outcomes in one run",
      body: [{ t: "p", text: "**Topic 1 is a clean success**: `game team hockey season nhl` at 93 % purity, discovered with no labels from word co-occurrence alone. **Topic 0 is a merge**: `space data image graphics nasa` combines two of the real categories, because computer graphics and space documents share a technical register and LDA had no reason to separate them. **Topic 2 is an artefact**: `pts la pt 16 10 vs 25 11` is not a topic in any human sense — it is the vocabulary of hockey box scores, which co-occur strongly and so form a perfectly valid statistical topic. All three are correct behaviour from the algorithm's point of view, and only a human reading the words can tell them apart." }] },

    { t: "h2", n: "03", text: "Choosing the number of topics", id: "k" },

    { t: "out", text: `  k= 2  perplexity 4889.2
  k= 4  perplexity 4350.7
  k= 6  perplexity 4098.4
  k=10  perplexity 3969.7` },

    { t: "callout", kind: "crit", title: "Perplexity improves monotonically, so it cannot pick k",
      body: [{ t: "p", text: "Every increase in `k` lowers perplexity, because more topics always fit the data better — exactly as more parameters always fit better. Following the metric leads you to as many topics as you can afford, which produces fragments rather than themes. **Perplexity is not the selection criterion**, which is a genuinely common mistake. Use **topic coherence**, which scores whether the top words of a topic actually co-occur in documents and correlates far better with human judgement; or accept that this is a human decision, fit several values of `k`, read the top words for each, and pick the one where the topics are interpretable. That is less satisfying and it is what practitioners do." }] },

    { t: "h2", n: "04", text: "The alternatives", id: "alternatives" },

    { t: "table", head: ["Method", "How it works", "When"],
      rows: [
        ["**LDA**", "Probabilistic generative model over counts", "The default; gives per-document topic proportions"],
        ["**NMF**", "Factorise the TF-IDF matrix into non-negative parts", "Faster, deterministic, often more coherent on short text"],
        ["**Embedding clustering**", "Embed documents, then cluster (BERTopic, top2vec)", "Best topic quality now, but needs an embedding model"],
        ["**Just read them**", "Sample a few hundred documents", "Under about 1,000 documents, honestly the best option"]
      ] },

    { t: "callout", kind: "good", title: "NMF is worth trying first on short text",
      body: [{ t: "p", text: "NMF factorises the TF-IDF matrix directly rather than modelling a generative process, so it is faster, deterministic — no random seed to worry about — and on short documents like tweets or headlines it often produces more coherent topics than LDA, because LDA's assumption that each document mixes several topics is wrong when a document is twelve words long. It gives you no probabilistic interpretation, which matters if you wanted per-document topic proportions with a meaning attached, and does not matter at all if you just wanted to know what the corpus is about." }] },

    { t: "h2", n: "05", text: "Reading the output honestly", id: "honest" },

    { t: "dl", items: [
      ["Topics are not categories", "They are word distributions that a human labels. Two runs with different seeds give different topics, and both can be defensible."],
      ["Junk topics are normal", "Numbers, boilerplate, mailing-list headers and OCR noise all co-occur strongly and form topics. Filter the vocabulary rather than the topics."],
      ["Merging and splitting are both common", "Related categories merge at low `k` and fragment at high `k`; there is no value of `k` where every topic is clean."],
      ["Stability is a check worth running", "Fit several times with different seeds and see which topics recur. The stable ones are the real structure."]
    ] },

    { t: "callout", kind: "warn", title: "Topic modelling is exploratory, not a classifier",
      body: [{ t: "p", text: "It is tempting to use topic assignments as labels and build on them, and the purity numbers above are the reason not to: 58 % and 61 % on two of four topics means nearly half those assignments disagree with the real category. If you know what the categories are, label a few hundred documents and train a classifier — lesson 2.1 measured 0.89 accuracy on exactly this data. Topic modelling is for when you *do not* know what the categories are and want a first look at a corpus, which is a real and useful job, and it is a different one." }] },

    { t: "exercise", kind: "practice", title: "Fit topics and test them", difficulty: "core", minutes: 40,
      prompt: "Fit LDA on a corpus at k = 3, 5, 10 and 20, and read the top ten words for each topic at each setting. Record which are interpretable, which are merges, and which are artefacts. Then fit the same k five times with different random seeds and measure which topics recur — stable topics are real structure. Compare against NMF on the same data. Finally, if you have labels, measure topic purity as done here.",
      hints: [
        "Use raw counts for LDA and TF-IDF for NMF — they expect different inputs.",
        "Match topics across seeds by the overlap of their top-20 word lists.",
        "Junk topics usually come from vocabulary you should have filtered."
      ],
      solution: {
        notes: [
          { t: "p", text: "The stability check across seeds is the most useful thing here and it is rarely done. Some topics appear in every run with almost the same top words — those are genuine structure in the corpus. Others shift completely between runs, which means they are artefacts of the initialisation rather than of the data, and any conclusion drawn from them is not reproducible. Reporting only the stable topics is more honest and usually more interesting." },
          { t: "p", text: "Junk topics like the box-score one I measured — `pts la pt 16 10 vs` — are a vocabulary problem rather than a model problem. Numbers, mailing-list artefacts and boilerplate co-occur strongly and so form statistically valid topics. Filtering them out of the vocabulary before fitting is more effective than trying to ignore the topic afterwards, because the junk vocabulary is also diluting the real topics." },
          { t: "p", text: "On purity: I measured 93 % for a clean topic and 58 % for a merged one on the same run. That spread is the honest summary of topic modelling — it finds real structure and it finds it unevenly, and there is no k at which every topic is clean. If you need reliable assignments, label a sample and train a classifier instead." }
        ]
      } }

  ],

  takeaways: [
    "A topic is a probability distribution over the vocabulary, not a label — the interpretation is human.",
    "LDA takes raw counts, not TF-IDF; `max_df` and stopwords do what idf would have done.",
    "Measured on real data: topic 1 was 93 % pure hockey, discovered with no labels.",
    "Topic 0 merged computer graphics with space — related registers, no reason to separate them.",
    "Topic 2 was `pts la pt 16 10 vs` — a statistically valid topic made of box-score vocabulary.",
    "Perplexity improved monotonically with k (4889 → 3970), so it cannot select k.",
    "Use topic coherence, or fit several k and read the words — it is a human decision.",
    "NMF is faster, deterministic and often more coherent on short text.",
    "Topic assignments are not labels: 58 % and 61 % purity on two of four topics."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "What is a topic in LDA?",
      options: ["A cluster of documents", "A probability distribution over the vocabulary", "A label assigned to each document", "A set of keywords chosen in advance"],
      answer: 1,
      why: "Each topic is a distribution over words — the one you would call *hockey* simply gives high probability to `game`, `team` and `nhl`. Documents are mixtures of topics. Nothing in the model knows what a topic means; the interpretation comes from a human reading the top words." },
    { stem: "Can perplexity be used to choose the number of topics?",
      options: ["Yes, pick the minimum", "No — it improves monotonically with k, so it always favours more topics", "Yes, pick the elbow", "Only for NMF"],
      answer: 1,
      why: "Measured: perplexity fell from 4889 at k=2 to 3970 at k=10 and keeps falling, because more topics always fit better. Following it leads to fragments rather than themes. Use topic coherence, which correlates with human judgement, or fit several k and read the top words." },
    { stem: "LDA produced a topic whose top words are `pts la pt 16 10 vs 25 11`. What is this?",
      options: ["A model failure", "A statistically valid topic formed from box-score vocabulary that co-occurs strongly", "Evidence that k is too small", "A tokenization bug"],
      answer: 1,
      why: "Those tokens genuinely do co-occur — they are the vocabulary of sports score tables — so the model is behaving correctly. It is a junk topic from a human perspective only. The fix is to filter that vocabulary before fitting, since it is also diluting the real topics." },
    { stem: "Should topic assignments be used as classification labels?",
      options: ["Yes, they are unsupervised labels", "No — measured purity was 58 % and 61 % on two of four topics", "Only with more than 10 topics", "Only with NMF"],
      answer: 1,
      why: "Nearly half those assignments disagreed with the real category. Topic modelling is exploratory — it is for finding out what a corpus contains when you do not already know. If you know the categories, label a few hundred documents and train a classifier, which reached 0.89 accuracy on the same data in lesson 2.1." }
  ] },

  interview: { title: "Interview", sub: "Topic modelling", questions: [
    { level: "Core", q: "How does LDA work and how do you choose the number of topics?",
      strong: "A generative mixture model over word distributions; k is chosen by coherence or by reading, not by perplexity.",
      answer: [{ t: "p", text: "LDA assumes each document is a mixture of topics and each topic is a distribution over the vocabulary, so every word was produced by picking a topic from the document's mixture and then a word from that topic. Fitting runs that story backwards to infer both sets of distributions from the observed words. For choosing k, the important negative result is that perplexity does not work — it improves monotonically as you add topics, because more parameters always fit better, so following it gives you fragments. I measured it falling from 4889 at k=2 to 3970 at k=10 with no sign of turning. What is used instead is topic coherence, which scores whether a topic's top words genuinely co-occur and tracks human judgement much better, or simply fitting several values and reading the top words to see which is interpretable. I would also fit each k several times with different seeds and keep the topics that recur, since unstable topics are artefacts of initialisation." }] },
    { level: "Senior", q: "How would you present topic-modelling results to a stakeholder?",
      strong: "Only the stable topics, labelled by a human, with the junk and merges disclosed.",
      answer: [{ t: "p", text: "First I would fit the same k several times with different seeds and keep only the topics that recur, because topics that shift between runs are artefacts of initialisation and any conclusion drawn from them is not reproducible. Then I would label the surviving topics myself by reading their top words, since the model produces distributions and not names, and present those labels as my interpretation rather than as output. I would show the junk topics too rather than quietly dropping them — on real data I got one whose top words were `pts la pt 16 10 vs`, which is box-score vocabulary and a perfectly valid statistical topic that means nothing to a person. Showing it makes clear what the method does and does not do. And I would state the purity honestly where labels exist: I measured 93 per cent on one topic and 58 per cent on another in the same run, which is the real character of the technique. The framing I would use throughout is that this is a map of an unfamiliar corpus, not a classifier, and that if they now know which categories they care about, the next step is to label a few hundred documents and train one." }] },
    { level: "Senior", q: "When would you use topic modelling, and when not?",
      strong: "For exploring an unlabelled corpus; not as a classifier, and not when you already know the categories.",
      answer: [{ t: "p", text: "For exploration, when I have a large corpus and genuinely do not know what is in it — support tickets, survey responses, a document archive — and want a first map before deciding what to build. It is good at that and it costs very little. What I would not do is treat the assignments as labels. On real data I measured one topic at 93 per cent purity against its true category and two others at 58 and 61 per cent, so nearly half those assignments disagree with the truth. If the categories are known, labelling a few hundred documents and training a classifier gets close to 0.90 accuracy on the same data, which is a different league. I would also be honest about the failure modes when presenting results: topics merge related categories, fragment at higher k, and frequently include junk formed from numbers or boilerplate that co-occur strongly. And for short text I would try NMF first, since LDA's mixture assumption is wrong when a document is a dozen words long." }] }
  ] }
});
