EC.receiveLesson({
  id: "9.6",
  lede: "The Store is keyed by a **namespace tuple** rather than by a thread, which is the design decision everything else follows from: a tuple is a path, so it supports prefix search. `search((\"users\", \"alice\", \"prefs\"))` returns alice's two preferences; the same data in a flat namespace returns all three users' and needs filtering in Python. The hierarchical layout is also the one you can **delete per user**, which is a GDPR requirement rather than a convenience. And the hard part is not the API \u2014 it is four methods. It is deciding what to remember, where the failure modes are *remember everything*, *remember nothing*, and the one that argues for conservatism: **remember wrong**.",
  objectives: [
    "Use the Store's namespace-and-key API",
    "Say why the Store is not graph state with extra steps",
    "Distinguish semantic, episodic and procedural memory by retrieval pattern",
    "Design a namespace that supports search and deletion",
    "Name the three failure modes of memory writing"
  ],
  prerequisites: ["9.5"],
  blocks: [
    { t: "h2", n: "01", id: "api", text: "Namespace and key", sub: "Four methods" },
    { t: "code", lang: "python", title: "put, get, search",
      code: 'store.put(("users", "alice"), "prefs", {"tone": "brief", "lang": "en"})\nstore.put(("users", "alice"), "facts", {"team": "platform"})\nstore.put(("users", "bob"),   "prefs", {"tone": "detailed"})\n\nstore.get(("users", "alice"), "prefs").value\nstore.search(("users", "alice"))',
      out: "  alice prefs : {'tone': 'brief', 'lang': 'en'}\n  bob   prefs : {'tone': 'detailed'}\n\n  everything under ('users','alice'):\n    prefs    {'tone': 'brief', 'lang': 'en'}\n    facts    {'team': 'platform'}",
      caption: "The namespace is a **tuple**, which is the decision that matters." },
    { t: "h2", n: "02", id: "why", text: "Why not just use graph state?", sub: "Five properties differ" },
    { t: "table", head: ["property", "graph state", "store"], rows: [
      ["scope", "one thread", "any namespace you choose"],
      ["lifetime", "the thread", "independent of threads"],
      ["written", "**every superstep**", "when you call `put`"],
      ["read", "automatically", "explicitly, by key"],
      ["size cost", "serialised per step", "paid once"]
    ] },
    { t: "callout", kind: "insight", title: "The last row decides borderline cases", body: [
      { t: "p", text: "9.4 measured the state being serialised on every superstep. So a user's preferences in graph state are re-written on every step of every conversation forever; in the store they are written once and read when needed." },
      { t: "p", text: "The scope row is the one that makes it necessary rather than merely cheaper: 9.5 showed the whole state is thread-scoped, so anything a *second* conversation should know cannot live there at all." }
    ] },
    { t: "h2", n: "03", id: "kinds", text: "Three kinds of memory", sub: "Distinguished by retrieval pattern" },
    { t: "dl", items: [
      ["semantic \u2014 facts", "`(\"users\",\"alice\"), \"facts\" \u2192 {\"team\": \"platform\"}`. Retrieved by key, or by embedding search over the values."],
      ["episodic \u2014 what happened", "`(\"users\",\"alice\",\"episodes\"), \"2024-03-11\" \u2192 {\u2026}`. Retrieved by recency, or by similarity to the current situation."],
      ["procedural \u2014 how to behave", "`(\"agent\",\"instructions\"), \"tone\" \u2192 \"be brief with alice\"`. Always loaded, injected into the system prompt."]
    ] },
    { t: "callout", kind: "mental", title: "The distinction is the retrieval pattern, not the content", body: [
      { t: "p", text: "It is not an academic taxonomy \u2014 each kind has a different retrieval pattern, and that is what the namespace design has to support." },
      { t: "p", text: "Procedural memory is always loaded, so a flat namespace is fine. Episodic memory is **searched**, so it needs a namespace you can prefix-scan and a value you can embed. Getting the namespace wrong for the kind means the memory exists and cannot be found \u2014 which is 7.8's summary problem in a new place." }
    ] },
    { t: "h2", n: "04", id: "namespace", text: "Namespace design decides retrievability", sub: "And deletability" },
    { t: "code", lang: "text", title: "The same data, two layouts",
      code: "A: ('memories',)              key='alice:pref:tone'\nB: ('users','alice','prefs')  key='tone'\n\nlayout A, everything in one namespace:\n  search(('memories',)) returns 3 items -- all users\n  getting just alice's means filtering keys by prefix in Python\n\nlayout B, hierarchical:\n  search(('users','alice','prefs')) returns 2 items -- just alice",
      caption: "A tuple namespace is a path, so B gets prefix search for free." },
    { t: "callout", kind: "warn", title: "And B is the one you can delete per user", body: [
      { t: "p", text: "*\u201cDelete everything about alice\u201d* is a namespace prefix in layout B and a full scan with string matching in layout A. That is a **GDPR requirement** rather than a convenience, and it is not the kind of thing you want to discover you cannot do." },
      { t: "p", text: "So the namespace is a schema decision with the same weight as 5.2's metadata: cheap to get right now, a migration later. And like 5.2, the cost of over-structuring is nearly zero while the cost of under-structuring is a data-rewrite." }
    ] },
    { t: "h2", n: "05", id: "writing", text: "The hard part is writing", sub: "And nothing in the API helps" },
    { t: "p", text: "The store API is four methods. What makes long-term memory hard is deciding **what is worth remembering**, and no part of the interface addresses that \u2014 it is a product and prompt-design problem that happens to have a storage layer." },
    { t: "table", head: ["failure", "what happens"], rows: [
      ["remember everything", "the store fills with noise and retrieval returns irrelevant memories \u2014 6.6's near-duplicate problem, with no relevance labels to tune against"],
      ["remember nothing", "a \u201cmemory\u201d feature nobody notices"],
      ["remember wrong", "a mistaken fact persists across every future conversation"]
    ] },
    { t: "callout", kind: "trap", title: "The third one argues for a conservative policy", body: [
      { t: "p", text: "A bad retrieval affects one answer. A bad **memory** affects every answer until someone finds it \u2014 and nobody is looking, because the memory is doing exactly what it was asked to do." },
      { t: "p", text: "So writes want to be explicit, attributable and easy to delete: written in response to something specific rather than as a background summarisation pass, recorded with where they came from, and removable per user. All three are easier in layout B, which is another argument for the hierarchical namespace." }
    ] },
    { t: "exercise", kind: "build", title: "Design a memory namespace",
      difficulty: "advanced", minutes: 32,
      body: "Use the Store's put, get and search to hold per-user data and show that search scopes to a namespace. Compare the Store against graph state on scope, lifetime, write frequency and cost, and say which property makes it necessary rather than merely cheaper. Distinguish the three kinds of memory by their retrieval patterns. Then compare a flat namespace against a hierarchical one for both search and per-user deletion. Finally name the three failure modes of memory writing and say which argues for conservatism.",
      requirements: ["Use put, get and search with a tuple namespace",
        "Show search scoping to a namespace prefix",
        "Compare store against graph state on at least four properties",
        "Identify which property makes the store necessary rather than cheaper",
        "Distinguish three kinds of memory by retrieval pattern",
        "Compare a flat and a hierarchical namespace on search and deletion",
        "Explain why per-user deletion is a requirement rather than a convenience",
        "Name three memory-writing failures and say which is worst"],
      hint: "Try retrieving one user's data from both namespace layouts. The difference in effort is the whole design argument.",
      solution: { lang: "python", title: "x0906.py \u2014 layout B scopes and deletes",
        code: 'from langgraph.store.memory import InMemoryStore\n\nstore = InMemoryStore()\nstore.put(("users", "alice"), "prefs", {"tone": "brief", "lang": "en"})\nstore.put(("users", "alice"), "facts", {"team": "platform"})\nstore.put(("users", "bob"), "prefs", {"tone": "detailed"})\n\nfor item in store.search(("users", "alice")):\n    print(item.key, item.value)\n\n# flat against hierarchical\nflat = InMemoryStore()\nflat.put(("memories",), "alice:pref:tone", {"v": "brief"})\nflat.put(("memories",), "bob:pref:tone", {"v": "detailed"})\nprint(len(flat.search(("memories",))))          # all users\n\nnested = InMemoryStore()\nnested.put(("users", "alice", "prefs"), "tone", {"v": "brief"})\nnested.put(("users", "bob", "prefs"), "tone", {"v": "detailed"})\nprint(len(nested.search(("users", "alice", "prefs"))))   # just alice',
        out: "==============================================================================\nPART 1 -- the Store is keyed by namespace, not by thread\n==============================================================================\n  store.put((namespace...), key, value)\n\n  alice prefs : {'tone': 'brief', 'lang': 'en'}\n  bob   prefs : {'tone': 'detailed'}\n\n  everything under ('users','alice'):\n    prefs    {'tone': 'brief', 'lang': 'en'}\n    facts    {'team': 'platform'}\n\n  the namespace is a TUPLE, which is the design decision that\n  matters: it is a path, so it supports prefix search.\n==============================================================================\nPART 2 -- why that is not just graph state with extra steps\n==============================================================================\n  9.5 showed the whole graph state is scoped to one thread_id. so\n  anything a second conversation should know cannot live there.\n\n  property            graph state           store\n  scope               one thread            any namespace you choose\n  lifetime            the thread            independent of threads\n  written             every superstep       when you call put\n  read                automatically         explicitly, by key\n  size cost           serialised per step   paid once\n\n  the last row is the one that decides borderline cases. a user's\n  preferences in graph state are re-serialised on every superstep of\n  every conversation forever (9.4); in the store they are written\n  once and read when needed.\n==============================================================================\nPART 3 -- the three kinds, and what each is for\n==============================================================================\n  SEMANTIC   facts about the user or the world\n    ('users','alice'), 'facts' -> {'team': 'platform'}\n    retrieval: by key, or by embedding search over values\n\n  EPISODIC   what happened before -- past interactions\n    ('users','alice','episodes'), '2024-03-11' -> {...}\n    retrieval: by recency, or by similarity to the current situation\n\n  PROCEDURAL how to behave -- learned instructions\n    ('agent','instructions'), 'tone' -> 'be brief with alice'\n    retrieval: always loaded, injected into the system prompt\n\n  the distinction is not academic: each has a different RETRIEVAL\n  pattern, and that is what the namespace design has to support.\n  procedural memory is always loaded, so a flat namespace is fine.\n  episodic memory is searched, so it needs a namespace you can\n  prefix-scan and a value you can embed.\n==============================================================================\nPART 4 -- namespace design decides what you can retrieve\n==============================================================================\n  compare two layouts for the same data:\n\n    A: ('memories',)            key='alice:pref:tone'\n    B: ('users','alice','prefs') key='tone'\n\n  layout A, everything in one namespace:\n    search(('memories',)) returns 3 items -- all users\n    getting just alice's means filtering keys by prefix in Python\n\n  layout B, hierarchical:\n    search(('users','alice','prefs')) returns 2 items -- just alice\n\n  B is also the one that can be deleted per user, which is a GDPR\n  requirement rather than a convenience: 'delete everything about\n  alice' is a namespace prefix in B and a scan in A.\n\n  so the namespace is a schema decision with the same weight as\n  5.2's metadata -- cheap now, a migration later.\n==============================================================================\nPART 5 -- the hard part is not storage, it is WRITING\n==============================================================================\n  the store API is four methods. what makes long-term memory hard is\n  deciding what is worth remembering, and nothing in the API helps.\n\n  the failure modes, in the order teams hit them:\n\n    remember everything   the store fills with noise and retrieval\n                          returns irrelevant memories (6.6's\n                          near-duplicate problem, with no labels)\n    remember nothing      a 'memory' feature nobody notices\n    remember wrong        a mistaken fact persists across every\n                          future conversation and is harder to\n                          correct than a wrong retrieval\n\n  the third is the one that argues for a conservative policy. a bad\n  retrieval affects one answer; a bad memory affects every answer\n  until someone finds it. so writes want to be explicit, attributable\n  and easy to delete -- which is another argument for layout B.",
        notes: [
          { t: "p", text: "**The namespace is a tuple, which is a path** \u2014 so it supports prefix search, and that is the decision everything else follows from." },
          { t: "p", text: "**The store is scoped by namespace rather than by thread**, which is what makes it necessary: 9.5 showed the whole graph state is thread-scoped, so anything a second conversation needs cannot live there." },
          { t: "p", text: "**And it is written when you call `put`**, not on every superstep \u2014 so a preference costs one write rather than one per step of every conversation (9.4)." },
          { t: "p", text: "**The three kinds differ by retrieval pattern**: semantic by key or embedding, episodic by recency or similarity, procedural always loaded into the prompt." },
          { t: "p", text: "**So the namespace must support the kind's retrieval pattern** \u2014 get it wrong and the memory exists but cannot be found." },
          { t: "p", text: "**A flat namespace returns every user's data** and needs Python-side filtering; a hierarchical one scopes to one user with a prefix." },
          { t: "p", text: "**And the hierarchical layout is the one you can delete per user**, which is a GDPR requirement rather than a convenience." },
          { t: "p", text: "**Three writing failures**: remember everything (noise), remember nothing (a feature nobody notices), and remember wrong \u2014 which affects every future answer until someone finds it, and nobody is looking." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the memory that could not be deleted", body: [
      { t: "p", text: "An assistant stores learned facts under a single namespace with composite string keys like `alice:fact:team`. A deletion request arrives and there is no way to remove one user's memories without scanning every key in the store and matching a prefix in application code." },
      { t: "p", text: "The namespace was treated as a bucket rather than a path, so the structure that would have made the question answerable lives inside the key strings \u2014 where the store cannot use it. Nothing was wrong until the requirement arrived, and by then the data is written." },
      { t: "p", text: "The design that avoids it is to put every dimension you might need to scope by into the **namespace tuple** rather than the key: user, then memory kind, then the identifier. That gives per-user search and per-user deletion for free, and it is the same lesson as 5.2's metadata \u2014 capture the structure while it is free, because reconstructing it later means rewriting the data." }
    ] }
  ],
  takeaways: [
    "**The namespace is a tuple, which is a path** \u2014 so it supports prefix search.",
    "**`put(namespace, key, value)`, `get`, `search`** \u2014 the API is four methods.",
    "**The store is scoped by namespace, not by thread**, which is what makes it necessary.",
    "**Because the whole graph state is thread-scoped** (9.5), so cross-conversation data cannot live there.",
    "**And it is written on `put`, not every superstep** \u2014 one write rather than one per step forever.",
    "**Semantic memory is facts**, retrieved by key or by embedding search.",
    "**Episodic memory is what happened**, retrieved by recency or similarity.",
    "**Procedural memory is how to behave**, always loaded into the system prompt.",
    "**The distinction is the retrieval pattern**, which is what the namespace must support.",
    "**A flat namespace returns every user's data**; a hierarchical one scopes with a prefix.",
    "**And only the hierarchical one can be deleted per user** \u2014 a GDPR requirement.",
    "**Put every dimension you might scope by into the namespace, not the key.**",
    "**The hard part is writing, not storage** \u2014 the API does not help you decide.",
    "**Remember everything gives noise; remember nothing gives an unnoticed feature.**",
    "**Remember wrong affects every future answer until someone finds it**, and nobody is looking.",
    "**So make writes explicit, attributable and deletable.**"
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "Why is the Store's namespace a tuple rather than a string?",
      options: ["To allow non-string keys",
        "Because a tuple is a path, which gives prefix search and prefix deletion",
        "To support concurrent writes",
        "To keep keys shorter"],
      answer: 1,
      why: "A tuple namespace lets search scope to a prefix, so ('users','alice','prefs') returns one user's data while a flat ('memories',) namespace returns everyone's and needs filtering in application code. The same property makes per-user deletion a prefix operation rather than a full scan \u2014 which matters because that is a compliance requirement, not a convenience." },
    { stem: "Which property makes the Store necessary rather than just cheaper than graph state?",
      options: ["It is written only when you call put",
        "It is scoped by namespace rather than by thread, so data can outlive one conversation",
        "It supports embedding search over values",
        "Its values are not serialised on every superstep"],
      answer: 1,
      why: "The write-frequency and cost differences make it cheaper, and they would not make it necessary. The scope difference does: the entire graph state is scoped to one thread_id, so anything a second conversation needs to know cannot be stored there at all. The test is whether you would read the key while serving a different thread." },
    { stem: "What distinguishes semantic, episodic and procedural memory in practice?",
      options: ["Their storage backends",
        "Their retrieval patterns \u2014 by key or embedding, by recency or similarity, and always-loaded \u2014 which is what the namespace must support",
        "How long each is retained",
        "Whether the model or the developer writes them"],
      answer: 1,
      why: "The taxonomy earns its keep by telling you how each kind gets found. Procedural memory is always loaded into the prompt, so a flat namespace suffices; episodic memory is searched, so it needs a prefix-scannable namespace and an embeddable value. Choosing the wrong layout for the kind leaves the memory present and unretrievable." },
    { stem: "Which memory-writing failure is the most dangerous?",
      options: ["Remembering too much, producing noisy retrieval",
        "Remembering something wrong \u2014 it affects every future answer until someone finds it, and nobody is looking",
        "Remembering nothing, so the feature goes unnoticed",
        "Remembering duplicates of the same fact"],
      answer: 1,
      why: "A bad retrieval degrades one answer and the next request starts fresh. A bad memory is applied to every subsequent conversation, and because the system is behaving exactly as instructed there is no error to investigate. That asymmetry argues for conservative, explicit writes that record their provenance and can be deleted per user." }
  ] },
  interview: { title: "Interview practice", sub: "Long-term memory", questions: [
    { level: "core", q: "When would you use the Store rather than graph state?",
      strong: "A strong answer leads with scope and gives a concrete test.",
      answer: [
        { t: "p", text: "Whenever the data should outlive one conversation, and the test I use is: would I ever want to read this key while serving a different thread? If yes, graph state is the wrong place." },
        { t: "p", text: "The reason is that the entire graph state is scoped to one thread_id. So a user's preferences stored there are forgotten the moment a new conversation starts \u2014 not degraded, simply absent." },
        { t: "p", text: "There is a cost argument too. The checkpointer serialises the whole state on every superstep, so a preference in graph state is re-written on every step of every conversation forever. In the store it is written once by an explicit put." },
        { t: "p", text: "What the store gives up is automatic reading. Graph state arrives in every node; store values have to be fetched by key, which means a node that needs them has to know to ask. That is usually the right trade, and it does mean memory retrieval becomes something you design rather than something you get." }
      ] },
    { level: "advanced", q: "How would you design the namespace for a memory store?",
      strong: "A strong answer puts scoping dimensions in the namespace, not the key.",
      answer: [
        { t: "p", text: "Every dimension I might need to scope by goes into the namespace tuple, not into the key. So user, then memory kind, then the identifier \u2014 ('users', user_id, 'prefs') with 'tone' as the key, rather than a single namespace with 'alice:pref:tone' as the key." },
        { t: "p", text: "The namespace is a path, so that gives prefix search for free. I measured both layouts: searching the hierarchical one returns just that user's items, while the flat one returns every user's and needs filtering in application code." },
        { t: "p", text: "The argument that settles it is deletion. 'Delete everything about this user' is a namespace prefix in the hierarchical layout and a full scan with string matching in the flat one. That is a compliance requirement rather than a convenience, and it is a bad thing to discover you cannot do after the data is written." },
        { t: "p", text: "I would also let the namespace reflect the kind of memory, because the kinds have different retrieval patterns. Procedural memory is always loaded into the prompt so a flat layout is fine; episodic memory is searched, so it needs to be prefix-scannable and its values need to be embeddable." },
        { t: "p", text: "It is the same lesson as capturing document metadata at ingest: the structure is nearly free while you are writing, and reconstructing it afterwards means rewriting the data." }
      ] },
    { level: "core", q: "How would you decide what an agent should remember?",
      strong: "A strong answer is conservative because of the asymmetry.",
      answer: [
        { t: "p", text: "Conservatively, and explicitly rather than as a background summarisation pass \u2014 because the failure modes are not symmetric." },
        { t: "p", text: "A bad retrieval degrades one answer and the next request starts fresh. A bad memory is applied to every future conversation, and because the system is doing exactly what it was told there is no error to investigate and nobody is looking. So remembering something wrong is much worse than remembering too little." },
        { t: "p", text: "Which means I would rather write on an explicit signal than infer. A user stating a preference, correcting the assistant, or supplying a durable fact like a team or a timezone \u2014 those are events I can point at. Summarising every conversation into facts produces noise, and retrieval over noisy memories has the near-duplicate problem with no relevance labels to tune against." },
        { t: "p", text: "I would also record provenance with each memory: when it was written and what prompted it. That is what makes a wrong memory findable later, and it costs a couple of fields." },
        { t: "p", text: "And I would make every memory deletable per user, which means putting the user in the namespace tuple rather than in the key \u2014 so 'forget everything about this person' is a prefix operation. That is a compliance requirement, and it is also the mechanism you need when a memory turns out to be wrong." }
      ] }
  ] }
});
