EC.receiveLesson({
  id: "1.6",

  lede: "Five objects are passed around by every other part of the library, and the rest of this course assumes them. A **Document** is text plus metadata, and the metadata half is the one people under-use \u2014 it is how a retriever is stopped from returning a document the user is not allowed to see, which is access control rather than a hint. **Embeddings** has two methods, not one, and calling the wrong one costs accuracy silently because both return a vector of the right shape. A **Retriever** is a Runnable that returns Documents. A **Tool** is a function whose description is prompt. A **Callback** is the only way to see inside a run \u2014 and a two-step chain emits three chain-start events, because the sequence is a chain too.",

  objectives: [
    "Describe what a Document carries and what metadata is for",
    "Explain why Embeddings has separate document and query methods",
    "State the retriever interface and why it composes into a chain",
    "Identify which part of a tool definition the model actually reads",
    "Read a callback event count and account for the nesting"
  ],

  prerequisites: ["1.5"],

  blocks: [

    { t: "h2", n: "01", id: "document", text: "Document",
      sub: "Text, and the metadata that decides who may see it" },

    { t: "code", lang: "python", title: "The shape",
      code: 'from langchain_core.documents import Document\n\nd = Document(\n    page_content="LangChain is a composition framework for LLM applications.",\n    metadata={"source": "docs/intro.md", "page": 1, "team": "platform",\n              "updated": "2026-02-14"})',
      caption: "`page_content` is embedded and reaches the model. `metadata` is what you filter on." },

    { t: "p", text: "Every loader produces Documents, every splitter produces more of them with the same metadata and smaller `page_content`, and every retriever returns a list of them. It is the unit the whole retrieval half of this course moves around." },

    { t: "code", lang: "text", title: "Three filters, no text touched",
      code: 'team == platform    1 hit(s)   [\'The API gateway now supports mTLS.\']\nyear == 2026        2 hit(s)   [\'Quarterly revenue rose 12 percent.\', \'The API gateway now supports mTLS.\']\npublic only         2 hit(s)   [\'The API gateway now supports mTLS.\', \'Revenue guidance for the year was raised.\']',
      caption: "The third filter removed a document marked `public: False`." },

    { t: "callout", kind: "warn", title: "Metadata filtering is access control; a prompt instruction is not",
      body: [
        { t: "p", text: "The `public only` filter is the one that matters. If a document must not reach a particular user, the place to enforce that is a metadata filter on the retrieval call, so the document is never fetched. Telling the model \u201conly use public documents\u201d puts the restricted text into the context window and asks the model to ignore it." },
        { t: "p", text: "That is not a guarantee, it is a request \u2014 the same distinction 1.5 made about schema constraints. And the failure is unrecoverable in a way others are not: once the text is in the prompt, a prompt injection in a different document can ask the model to repeat it." }
      ] },

    { t: "p", text: "The practical habit is to **record metadata at load time**, when you still know where the document came from. Source path, page number, owning team, visibility, last-updated date. Every one of those is cheap to capture then and effectively impossible to reconstruct later from the text alone \u2014 and 7.5 needs the date, 5.5 needs the filters." },

    { t: "h2", n: "02", id: "embeddings", text: "Embeddings",
      sub: "Two methods, and they are not interchangeable" },

    { t: "code", lang: "python", title: "The interface",
      code: 'class Embeddings(ABC):\n    def embed_documents(self, texts: list[str]) -> list[list[float]]: ...\n    def embed_query(self, text: str) -> list[float]: ...',
      out: 'embed_documents([\'a\', \'b\'])  -> 2 vectors of dim 8\nembed_query(\'a\')             -> 1 vector  of dim 8',
      caption: "Separate methods, because some models genuinely do different things in each." },

    { t: "callout", kind: "trap", title: "Asymmetric models, and a silent accuracy loss",
      body: [
        { t: "p", text: "Several widely used embedding models are **asymmetric**: they prepend something like `query:` to a search string and `passage:` to a stored document, because a question and the text that answers it are not the same kind of object. The two methods exist so the model can do that." },
        { t: "p", text: "Call `embed_documents` on a user's query and you get a vector of exactly the right dimension, the search runs, results come back, and nothing fails \u2014 the results are just worse. There is no error to catch, which is why this is worth knowing before 5.4 rather than after a week of tuning a retriever that was never the problem." }
      ] },

    { t: "h2", n: "03", id: "retriever", text: "Retriever",
      sub: "The smallest useful interface in the library" },

    { t: "code", lang: "python", title: "A retriever in six lines",
      code: 'class KeywordRetriever(BaseRetriever):\n    """The smallest honest retriever: substring match."""\n    docs: List[Document] = []\n    k: int = 2\n\n    def _get_relevant_documents(self, query, *, run_manager=None):\n        hits = [d for d in self.docs if query.lower() in d.page_content.lower()]\n        return hits[:self.k]',
      out: 'invoke(\'revenue\') -> [\'Quarterly revenue rose 12 percent.\', \'Revenue guidance for the year was\']\nis a Runnable     -> True',
      caption: "Query in, list of Documents out. One method, and the base class makes it a Runnable." },

    { t: "p", text: "Because a retriever is a Runnable, it pipes into a chain like anything else \u2014 which is why 5.7 can write an entire RAG pipeline as one LCEL expression rather than as a function that calls a retriever and then calls a model. The uniformity from 1.1, again, doing the work." },

    { t: "h2", n: "04", id: "tool", text: "Tool",
      sub: "A function whose description is prompt" },

    { t: "code", lang: "python", title: "What a tool carries",
      code: '@tool\ndef lookup_order(order_id: str) -> str:\n    """Look up an order by its id. Use for questions about a specific order."""\n    return "order %s: shipped" % order_id',
      out: 'name        : lookup_order\ndescription : Look up an order by its id. Use for questions about a specific order.\nargs schema : {\'order_id\': {\'title\': \'Order Id\', \'type\': \'string\'}}\ninvoke      : order A-1: shipped',
      caption: "The docstring became the description, and the description is what the model reads." },

    { t: "p", text: "The name, the description and the argument schema are all sent to the model. The **description decides whether the tool gets called at all**, which makes it prompt rather than documentation \u2014 a distinction 3.1 is entirely about, and the single most common reason an agent ignores a tool that would have answered the question." },

    { t: "h2", n: "05", id: "callback", text: "Callback",
      sub: "And the event count that does not match your code" },

    { t: "code", lang: "python", title: "Counting chain events",
      code: 'class Counter(BaseCallbackHandler):\n    def on_chain_start(self, serialized, inputs, **kw): self.starts += 1\n    def on_chain_end(self, outputs, **kw):             self.ends += 1\n\nchain = RunnableLambda(lambda x: x + 1) | RunnableLambda(lambda x: x * 10)\nchain.invoke(1, config={"callbacks": [c]})',
      out: 'result : 20\nchain starts seen : 3\nchain ends seen   : 3',
      hl: [6],
      caption: "Two steps written, three chain events. The sequence is itself a chain." },

    { t: "callout", kind: "insight", title: "Three events for a two-step chain",
      body: [
        { t: "p", text: "The `RunnableSequence` is a chain, and each `RunnableLambda` inside it is a chain, so an invocation of a two-step pipeline emits three starts and three ends. That nesting is exactly what a trace renders as a span tree." },
        { t: "p", text: "It is worth seeing once because it explains two things later: why a trace of a modest chain has more rows than you expected, and why counting events is not a way to count model calls. 4.1 builds a handler that distinguishes them properly." }
      ] },

    { t: "h2", n: "06", id: "together", text: "How they connect",
      sub: "The whole retrieval half of the course, in seven lines" },

    { t: "code", lang: "text", title: "The pipeline these types make",
      code: 'loader    ->  Document(page_content, metadata)\nsplitter  ->  more Documents, same metadata, smaller page_content   [5.3]\nEmbeddings.embed_documents  ->  vectors                             [5.4]\nvector store holds (vector, Document)                               [5.5]\nRetriever.invoke(query)     ->  List[Document]                      [5.6]\nDocuments formatted into a prompt                                   [5.7]\n\nTool      ->  what the model may call instead of answering          [3.1]\nCallback  ->  what watched all of it happen                         [4.1]',
      caption: "Every arrow is a Runnable boundary, which is why it is an expression rather than a function." },

    { t: "diagram", kind: "matrix", title: "Five objects, and the half of each that people under-use",
      caption: "Every other part of the library passes these around. The right-hand column is where the course's later findings come from — metadata is access control, and `Embeddings` having two methods is a silent accuracy bug.",
      cols: ["what it is", "the half people miss"],
      rows: ["Document", "Embeddings", "Retriever", "Tool", "Callback"],
      cells: [
        ["text plus metadata", { text: "metadata is ACCESS CONTROL", tone: "crit" }],
        ["text → a vector", { text: "TWO methods — wrong one costs accuracy", tone: "crit" }],
        ["a Runnable returning Documents", { text: "so it composes like anything else", tone: "good" }],
        ["a callable the model may invoke", { text: "its description IS prompt", tone: "warn" }],
        ["the only view inside a run", { text: "3 chain events for a 2-step chain", tone: "warn" }]
      ] },
    { t: "exercise", kind: "build", title: "Build one of each",
      difficulty: "core", minutes: 24,
      body: "Construct each of the five core types and show what it carries. Build three Documents with differing metadata and filter them three ways without touching the text. Implement a minimal Embeddings and show the two methods. Implement a keyword retriever and confirm it is a Runnable. Define a tool and print what the model would be shown. Attach a callback handler to a two-step chain and account for the event count.",
      requirements: [
        "A Document with at least four metadata fields including a visibility flag",
        "Three filters over a document set, one of which is the visibility filter",
        "An Embeddings subclass implementing both embed_documents and embed_query",
        "A BaseRetriever subclass implementing _get_relevant_documents, shown to be a Runnable",
        "A tool whose name, description and args schema are printed",
        "A callback handler counting chain starts on a two-step chain, with the count explained"
      ],
      hint: "The embedding can be a hash-based stand-in \u2014 5.4 uses a real encoder. The interesting number in the last part is 3, not 2.",
      solution: { lang: "python", title: "x0106.py \u2014 the five types",
        code: 'from langchain_core.documents import Document\nfrom langchain_core.tools import tool\nfrom langchain_core.embeddings import Embeddings\nfrom langchain_core.retrievers import BaseRetriever\nfrom langchain_core.callbacks import BaseCallbackHandler\nimport hashlib\n\ndocs = [\n    Document(page_content="Quarterly revenue rose 12 percent.",\n             metadata={"team": "finance", "year": 2026, "public": False}),\n    Document(page_content="The API gateway now supports mTLS.",\n             metadata={"team": "platform", "year": 2026, "public": True}),\n    Document(page_content="Revenue guidance for the year was raised.",\n             metadata={"team": "finance", "year": 2025, "public": True}),\n]\n\nclass ToyEmbeddings(Embeddings):\n    """A deterministic stand-in. 5.4 uses a real sentence encoder."""\n    def _vec(self, text):\n        h = hashlib.sha256(text.encode()).digest()\n        return [b / 255.0 for b in h[:8]]\n    def embed_documents(self, texts): return [self._vec(t) for t in texts]\n    def embed_query(self, text):      return self._vec(text)\n\nclass KeywordRetriever(BaseRetriever):\n    docs: list = []\n    k: int = 2\n    def _get_relevant_documents(self, query, *, run_manager=None):\n        return [d for d in self.docs if query.lower() in d.page_content.lower()][:self.k]\n\n@tool\ndef lookup_order(order_id: str) -> str:\n    """Look up an order by its id. Use for questions about a specific order."""\n    return "order %s: shipped" % order_id\n\nclass Counter(BaseCallbackHandler):\n    def __init__(self): self.starts = self.ends = 0\n    def on_chain_start(self, serialized, inputs, **kw): self.starts += 1\n    def on_chain_end(self, outputs, **kw):              self.ends += 1',
        out: '==============================================================================\nPART 1 -- Document: the type that carries metadata\n==============================================================================\n  page_content : \'LangChain is a composition framework for LLM a\'\n  metadata     : {\'source\': \'docs/intro.md\', \'page\': 1, \'team\': \'platform\', \'updated\': \'2026-02-14\'}\n\n  page_content is what gets embedded and what reaches the model.\n  metadata is what you FILTER on, and it is the half people under-use.\n\n  three documents, filtered three ways without touching the text:\n     team == platform   1 hit(s)  [\'The API gateway now supports mTLS.\']\n     year == 2026       2 hit(s)  [\'Quarterly revenue rose 12 percent.\', \'The API gateway now supports mTLS.\']\n     public only        2 hit(s)  [\'The API gateway now supports mTLS.\', \'Revenue guidance for the year was \']\n\n  the \'public only\' filter is the one that matters: a metadata field is\n  how you stop a retriever returning a document the user may not see.\n  doing that in the prompt instead is not access control.\n\n==============================================================================\nPART 2 -- Embeddings: two methods, and they are not the same\n==============================================================================\n  embed_documents([\'a\', \'b\'])  -> 2 vectors of dim 8\n  embed_query(\'a\')             -> 1 vector  of dim 8\n\n  two methods, not one, and some real embedding models genuinely do\n  different things in each -- asymmetric models prepend \'query:\' to one\n  and \'passage:\' to the other. calling the wrong one costs accuracy\n  silently, because both return a vector of the right shape.\n\n==============================================================================\nPART 3 -- Retriever: a Runnable that returns Documents\n==============================================================================\n  invoke(\'revenue\') -> [\'Quarterly revenue rose 12 percent.\', \'Revenue guidance for the year was ra\']\n  is a Runnable     -> True\n\n  that is the whole retriever interface: query in, list of Documents out.\n  because it is a Runnable it pipes into a chain like anything else --\n  which is why 5.7 can write retrieval as one step in an LCEL expression.\n\n==============================================================================\nPART 4 -- Tool: a function the model is allowed to call\n==============================================================================\n  name        : lookup_order\n  description : Look up an order by its id. Use for questions about a specific order.\n  args schema : {\'order_id\': {\'title\': \'Order Id\', \'type\': \'string\'}}\n\n  the DESCRIPTION is the part that decides whether the model calls it.\n  it is prompt, not documentation -- 3.1 is about writing it as such.\n  invoke      : order A-1: shipped\n\n==============================================================================\nPART 5 -- Callback: the only way to see inside a run\n==============================================================================\n  result : 20\n  chain starts seen : 3\n  chain ends seen   : 3\n\n  note the count is higher than the number of steps you wrote: the\n  sequence itself is a chain, and so is each lambda. that nesting is\n  what a trace shows you, and 4.1 builds a real handler on it.\n\n==============================================================================\nHOW THEY CONNECT\n==============================================================================\n  loader   -> Document(page_content, metadata)\n  splitter -> more Documents, same metadata, smaller page_content\n  Embeddings.embed_documents -> vectors         [5.4]\n  vector store holds (vector, Document)         [5.5]\n  Retriever.invoke(query) -> List[Document]     [5.6]\n  Documents formatted into a prompt             [5.7]\n  Tool: what the model may call instead of answering   [3.1]\n  Callback: what watched all of it happen              [4.1]\n\n  every one of these is a Runnable or produces something a Runnable\n  consumes, which is why they compose at all -- 1.1\'s argument again.',
        notes: [
          { t: "p", text: "**The visibility filter is the one that matters.** Filtering on `public` removes the restricted document before retrieval returns \u2014 so it never enters the context window. The alternative, telling the model to ignore non-public documents, puts the text in the prompt and asks nicely, which is a request rather than a guarantee and is defeatable by an injection in a neighbouring document." },
          { t: "p", text: "**Record metadata at load time.** Source, page, owning team, visibility, last-updated \u2014 all cheap to capture when you still know where the text came from, and effectively impossible to reconstruct afterwards. 7.5 needs the date and 5.5 needs the filters." },
          { t: "p", text: "**Embeddings has two methods because some models are asymmetric**, prepending something like `query:` to a search string and `passage:` to a stored document. Call the wrong one and you get a correctly shaped vector, a search that runs, results that are simply worse, and no error anywhere." },
          { t: "p", text: "**A retriever is one method and the base class makes it a Runnable**, which is why 5.7 can express a whole RAG pipeline as an LCEL expression rather than as a function that calls things in order." },
          { t: "p", text: "**A tool's docstring became its description, and the description is prompt.** It is what the model reads when deciding whether to call the tool, which makes it the most common reason an agent ignores a tool that would have answered the question. 3.1 treats it as prompt engineering, which is what it is." },
          { t: "p", text: "**A two-step chain emitted three chain-start events**, because the sequence is a chain and each lambda inside it is a chain. That nesting is what a trace renders as a span tree, and it is why counting callback events is not a way to count model calls." }
        ] } },

    { t: "callout", kind: "scenario", title: "Scenario: the retriever that returned a document it should not have",
      body: [
        { t: "p", text: "A support assistant quotes an internal salary band to an external user. The retrieval set includes HR documents, and the system prompt says \u201conly reference documents marked public\u201d." },
        { t: "p", text: "The instruction was always the wrong mechanism. The document was fetched, embedded in the prompt and read by the model, which then did something the prompt asked it not to \u2014 an outcome no amount of prompt wording makes reliable. The fix is a metadata filter on the retrieval call so the document is never a candidate." },
        { t: "p", text: "The follow-up matters more than the fix. If `public` was not captured at load time, there is nothing to filter on, and recovering it means re-ingesting the corpus with the right metadata \u2014 which is why the habit of recording provenance and visibility during loading is worth more than it looks when you are writing the loader and have no filter in mind yet." }
      ] }
  ],

  takeaways: [
    "**A Document is `page_content` plus `metadata`** \u2014 the text is embedded and reaches the model, the metadata is what you filter on.",
    "**Metadata filtering is access control; a prompt instruction is not** \u2014 a filter means the document is never fetched, an instruction means it is in the context being ignored on request.",
    "**Record metadata at load time**: source, page, team, visibility, updated date. Cheap then, impossible to reconstruct later.",
    "**Embeddings has two methods because some models are asymmetric**, prefixing queries and passages differently.",
    "**Calling the wrong one fails silently** \u2014 right-shaped vector, working search, worse results, no error.",
    "**A retriever is one method**: query in, `List[Document]` out \u2014 and the base class makes it a Runnable, so it pipes into a chain.",
    "**A tool's name, description and argument schema are all sent to the model**, and the description decides whether it gets called.",
    "**So a tool description is prompt, not documentation** \u2014 the commonest reason an agent ignores a usable tool.",
    "**A two-step chain emits three chain-start events**, because the sequence is a chain and each step is a chain.",
    "**That nesting is what a trace renders as a span tree**, and it means event counts are not model-call counts.",
    "**Every one of these types is a Runnable or feeds one**, which is why the retrieval pipeline is an expression rather than a function."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "Restricted documents must not reach external users. Where do you enforce that?",
        options: [
          "In the system prompt, instructing the model to use only public documents",
          "As a metadata filter on the retrieval call, so the document is never fetched",
          "In the output parser, by stripping restricted content from the answer",
          "By embedding restricted documents separately with a different model"
        ],
        answer: 1,
        why: "A filter means the document is never a candidate and never enters the context window. An instruction puts the restricted text into the prompt and asks the model to ignore it, which is a request rather than a guarantee \u2014 and worse, once the text is in the context an injection in a neighbouring document can ask for it back. Stripping at the output is too late for the same reason: the model already read it." },

      { stem: "You call `embed_documents` on a user's search query by mistake. What happens?",
        options: [
          "A dimension mismatch error when the vector is compared against the index",
          "Nothing visible \u2014 a correctly shaped vector, a working search, and worse results",
          "The embedding provider rejects the call as malformed",
          "Nothing at all; the two methods are aliases on every model"
        ],
        answer: 1,
        why: "Both methods return vectors of the same dimension, so every downstream step works. The problem is that asymmetric models prepend different prefixes \u2014 roughly `query:` against `passage:` \u2014 because a question and the text answering it are different kinds of object, and embedding a question as a passage puts it in slightly the wrong place. No exception is raised, which is why it can look like a retrieval-tuning problem for a week." },

      { stem: "A two-step chain with a callback handler emits three `on_chain_start` events. Why?",
        options: [
          "The handler is registered twice, once on the chain and once on the config",
          "The RunnableSequence is itself a chain, and each step inside it is a chain",
          "Retries cause the first step to start twice",
          "One event is the chain and two are the model calls"
        ],
        answer: 1,
        why: "The sequence counts as a chain and so does each RunnableLambda inside it, giving three starts and three ends for two written steps. That nesting is exactly what a trace renders as a span tree, which explains both why a trace of a modest chain has more rows than expected and why callback event counts cannot be used to count model calls." },

      { stem: "Why is a tool's docstring described as prompt rather than documentation?",
        options: [
          "Because LangChain validates it for formatting before sending",
          "Because it becomes the tool description the model reads when deciding whether to call it",
          "Because it is appended to the system message at bind time",
          "It is documentation \u2014 the model only sees the name and argument types"
        ],
        answer: 1,
        why: "The `@tool` decorator turns the docstring into the tool's description, and the name, description and argument schema are all sent to the model. The description is what the model weighs when choosing between tools or deciding to answer directly, which makes a vague docstring the most common reason an agent ignores a tool that would have answered the question perfectly well." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "The core types",
    questions: [
      { level: "core",
        q: "What is a Document and why does it have a metadata field?",
        strong: "A strong answer makes metadata the point, not an afterthought.",
        answer: [
          { t: "p", text: "Text plus a metadata dictionary. The page_content is what gets embedded and what eventually lands in the prompt; the metadata is what you filter on, and it is the half people under-use." },
          { t: "p", text: "The case I would lead with is access control. If a document must not reach a particular user, the place to enforce that is a metadata filter on the retrieval call, so the document is never fetched and never enters the context window. The alternative that people reach for is a system prompt saying only use public documents \u2014 and that is not access control, it is a request. The restricted text is in the context being ignored on request, which is defeatable, including by an injection sitting in a neighbouring retrieved document." },
          { t: "p", text: "The operational habit that follows is to record metadata at load time, while you still know where the text came from: source path, page, owning team, visibility, last-updated date. Each is nearly free to capture then and effectively impossible to reconstruct from the text later." },
          { t: "p", text: "That last point is the one I would press in a design review, because the loader is usually written before anyone has a filter in mind, and the cost of getting it wrong is re-ingesting the whole corpus." }
        ] },

      { level: "advanced",
        q: "Why does the Embeddings interface have two methods?",
        strong: "A strong answer explains asymmetric models and the silent failure.",
        answer: [
          { t: "p", text: "Because a query and a passage are different kinds of object, and several widely used embedding models treat them differently \u2014 they prepend something like query-colon to a search string and passage-colon to a stored document. The two methods exist so the model can apply the right one." },
          { t: "p", text: "What makes it worth knowing rather than trivia is the failure mode. If you call embed_documents on a user's query, you get a vector of exactly the right dimension. The similarity search runs, results come back ranked, nothing raises. The results are just somewhat worse, and there is no signal anywhere that says why." },
          { t: "p", text: "That is the kind of bug that costs a week, because the symptom looks like a retrieval-quality problem. People go and tune k, change the chunk size, try a reranker \u2014 all reasonable moves against the symptom, none of which touch the cause." }
          ,
          { t: "p", text: "So the check I would build into a retrieval setup is to assert that the query path and the index path use the matching methods of the same model instance. It is one assertion and it rules out a failure that is otherwise only findable by suspecting it." }
        ] },

      { level: "core",
        q: "An agent has a tool that would answer the question and does not call it. Where do you look?",
        strong: "A strong answer goes to the description first.",
        answer: [
          { t: "p", text: "The tool's description, before anything else. The decorator turns the docstring into the description, and the name, description and argument schema are all sent to the model \u2014 so the description is prompt, not documentation. It is what the model weighs when choosing between tools or deciding to answer from its own knowledge." },
          { t: "p", text: "The usual problems are mundane. A description that says what the function does rather than when to use it \u2014 'looks up an order' instead of 'use this for any question about a specific order, including status, delivery date or contents'. Two tools with overlapping descriptions so the model cannot tell them apart. Or no description at all, where someone wrote the function without a docstring and the model is choosing on the name." },
          { t: "p", text: "The second thing I would check is what was actually bound, because binding is easy to get wrong silently \u2014 a list that was built conditionally, or a bound model that got rebuilt somewhere and lost its tools." },
          { t: "p", text: "What I would not start with is the system prompt telling the model to use its tools. That is the instinctive fix and it treats a specification problem as a motivation problem. If the model cannot tell from the description that this tool answers this question, telling it to try harder does not supply the missing information." }
        ] }
    ]
  }
});
