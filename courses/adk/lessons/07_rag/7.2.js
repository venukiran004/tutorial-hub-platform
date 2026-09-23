/* ============================================================================
   LESSON 7.2 — Agentic RAG: Planning, Correction and Self-Reflection
   The two-query recovery, its query list and the three model requests are
   executed output from scratchpad/adk/r1.py on google-adk 2.9.2.
   ========================================================================= */
EC.receiveLesson({
  id: "7.2",

  lede: "**Naive RAG asks once and hopes. Agentic RAG asks, looks at what came back, and asks again.** That is the entire idea, and it is available to you for free the moment retrieval is a tool rather than a pipeline stage — the model can call it twice. What turns that possibility into behaviour is an instruction that says what to do after a miss, and what turns behaviour into a system you can rely on is structure: a loop with a cap, a validation step, a planner. This lesson runs a retrieval that misses and watches the agent recover, then builds the patterns that make recovery deliberate rather than lucky.",

  objectives: [
    "Explain what agentic RAG adds over a single retrieval, and what it costs",
    "Get an agent to rephrase and retry after a retrieval miss",
    "Build a retrieve-and-validate loop with a `LoopAgent` and a bounded cap",
    "Decompose a multi-part question into several retrievals",
    "Decide how much agency a retrieval system actually needs"
  ],

  prerequisites: ["7.1", "2.3"],

  blocks: [

    { t: "h2", n: "01", text: "A miss, then a recovery", id: "recovery" },

    { t: "p", text: "Same corpus and same tool as the previous lesson. The user's words do not appear in any document — they say \"my laptop broke\" and the document says \"hardware\" and \"warranty\" — so the first query returns nothing." },

    { t: "code", lang: "python", title: "r1.py — the instruction that makes the difference",
      code: `agent = LlmAgent(name="support", model=llm, tools=[tool],
                 instruction="Answer only from the documents. If nothing matches, "
                             "rephrase the query and search again before giving up.")` },

    { t: "out", text: `=== agentic RAG: the model re-queries after a miss ===
  call: {'query': 'broken laptop compensation'}
  -> {'result': 'No matching document found.'}
  call: {'query': 'warranty hardware'}
  -> {'result': '[warranty] Hardware carries a 24-month warranty. Accidental damage is not covered.'}
  answer: Hardware has a 24-month warranty, but accidental damage is not covered.
  queries issued: ['broken laptop compensation', 'warranty hardware']
  model requests made: 3` },

    { t: "p", text: "The second query uses the corpus's vocabulary rather than the user's, which is the whole trick: **the gap that retrieval has to cross is between how people ask and how documents are written**, and a model is unusually good at translating between the two. The price is stated in the last line — three model requests instead of two, and two searches instead of one, for one answer." },

    { t: "callout", kind: "insight", title: "The retry is the cheapest agentic pattern there is",
      body: [{ t: "p", text: "It needs no extra agents, no loop construct and no orchestration — one sentence in the instruction and a tool that returns a miss instead of raising. If you adopt exactly one idea from this lesson, adopt this one, because the alternative is an agent that says \"I could not find anything\" while the answer sits in the corpus under a different word." }] },

    { t: "diagram", kind: "cycle", title: "Search, read, search again",
      caption: "The loop is in the model's head, driven by the instruction. Sections 03 and 04 move it into structure you control.",
      centre: "one turn",
      nodes: [
        { label: "Question", sub: "in the user's words", tone: "accent" },
        { label: "Query", sub: "the model's first attempt" },
        { label: "Result", sub: "hit, or a miss message", tone: "warn" },
        { label: "Judge", sub: "is this enough to answer?", tone: "violet" },
        { label: "Rephrase", sub: "corpus vocabulary, narrower or wider" },
        { label: "Answer", sub: "grounded, or an honest nothing", tone: "good" }
      ] },

    { t: "h2", n: "02", text: "The four patterns", id: "patterns" },

    { t: "table", head: ["Pattern", "What it does", "Wiring"],
      rows: [
        ["**Query rewriting**", "Translates the user's words into the corpus's", "Instruction alone, as above — or a dedicated agent with `output_schema`"],
        ["**Decomposition**", "Splits a multi-part question into separate retrievals", "Instruction, or a planner agent producing a list of queries"],
        ["**Corrective RAG**", "Judges the retrieved chunks and retries or falls back", "A validator agent, or a `LoopAgent` with an escalating check"],
        ["**Self-reflection**", "Checks the drafted answer against the evidence before sending", "A second agent reading both, usually with a structured verdict"]
      ] },

    { t: "callout", kind: "mental", title: "Each one costs a round trip",
      body: [{ t: "p", text: "Every pattern here buys accuracy with latency and tokens. A naive RAG turn is two model calls; a rewrite-and-retry turn is three; add validation and reflection and you are at five or six, each carrying the conversation. That is the right trade for a medical or legal answer and the wrong one for a product FAQ where a miss costs nothing. Decide which you are building before you add layers, because the instinct to add all four is strong and the resulting agent takes nine seconds to answer a question about opening hours." }] },

    { t: "h2", n: "03", text: "Corrective RAG as a loop", id: "loop" },

    { t: "code", lang: "python", title: "Retrieve, judge, retry — with a cap",
      code: `class Verdict(BaseModel):
    """Whether the retrieved text answers the question."""
    sufficient: bool = Field(description="True only if the text fully answers the question")
    better_query: str = Field(description="A rephrased query if not sufficient, else an empty string")

retriever = LlmAgent(name="retriever", model=MODEL, tools=[corpus],
                     instruction="Search for: {query}. Return the retrieved text verbatim.",
                     output_key="retrieved")

judge = LlmAgent(name="judge", model=MODEL, include_contents="none",
                 instruction="Question: {question}\\nRetrieved: {retrieved}\\n"
                             "Decide whether this answers the question.",
                 output_schema=Verdict, output_key="verdict",
                 after_agent_callback=stop_when_sufficient)

search = LoopAgent(name="search", max_iterations=3,
                   sub_agents=[retriever, judge])`,
      caption: "`stop_when_sufficient` sets `callback_context.actions.escalate = True` when the verdict says so — the mechanism from lesson 2.3. Note `include_contents=\"none\"` on the judge: it should read the evidence, not the conversation." },

    { t: "p", text: "Three things make this better than the instruction-only version. The retry is **bounded** — `max_iterations=3` means a corpus that will never answer the question costs three searches rather than an open-ended argument. The judgement is **structured**, so your code can branch on `sufficient` instead of parsing prose. And the rewritten query is **explicit**, which means you can log it and discover what your users ask versus what your documents say." },

    { t: "callout", kind: "trap", title: "An unbounded retrieval loop is a bill",
      body: [{ t: "p", text: "Without `max_iterations`, an agent told to keep searching until it finds an answer will keep searching for an answer that is not there — each iteration a retrieval plus two model calls, each carrying a growing conversation. Always cap it, and make the cap small: if three well-chosen queries miss, the fourth almost never saves you, and the honest answer is that the corpus does not cover it." }] },

    { t: "h2", n: "04", text: "Decomposition", id: "decomposition" },

    { t: "p", text: "\"What is the warranty on the laptop and how fast can you ship a replacement?\" is two questions, and one embedding of the whole sentence retrieves the documents for neither well. A planner agent that emits a list of queries fixes it — and because the sub-queries are independent, the retrievals can run concurrently." },

    { t: "code", lang: "python", title: "A planner with a typed output",
      code: `class Plan(BaseModel):
    """The searches needed to answer a question."""
    queries: list[str] = Field(description="One focused query per distinct thing the user asked, "
                                           "in the vocabulary of policy documents. At most four.")

planner = LlmAgent(name="planner", model=MODEL, include_contents="none",
                   instruction="Plan the searches needed for: {question}",
                   output_schema=Plan, output_key="plan")`,
      caption: "\"At most four\" in the description is a real constraint, not politeness — a planner without a cap will happily emit eleven queries for a compound question." },

    { t: "diagram", kind: "flow", title: "Plan, fan out, answer",
      caption: "This is the shape where ParallelAgent earns its place (lesson 2.3): the searches are independent, so the latency is one search rather than four.",
      cols: 4,
      nodes: [
        { id: "q", label: "Compound question", sub: "two things at once", tone: "accent" },
        { id: "p", label: "Planner", sub: "output_schema → list[str]", tone: "violet" },
        { id: "s", label: "Searches", sub: "concurrent, one per query", tone: "good" },
        { id: "a", label: "Answer", sub: "reads all results from state", tone: "warn" }
      ],
      edges: [["q", "p"], ["p", "s"], ["s", "a"]] },

    { t: "h2", n: "05", text: "Self-reflection", id: "reflection" },

    { t: "p", text: "The last pattern checks the **answer** rather than the retrieval: a second agent reads the draft and the evidence and says whether every claim is supported. It catches the specific failure that matters most — a fluent answer that goes beyond what the documents say — and it is the most expensive thing in this lesson, because it adds a full model call carrying both the draft and the chunks." },

    { t: "callout", kind: "tradeoff", title: "Reflection, or evaluation?",
      body: [{ t: "p", text: "A reflection step checks every answer at runtime, for every user, forever. An evaluation suite (lesson 11.2) checks a sample offline, once per change, and tells you whether you need the reflection step at all. Most teams should build the evaluation first: it is cheaper, it is repeatable, and it frequently shows that groundedness is already at 97% and the runtime check would be paying a round trip to catch three cases in a hundred. Add reflection when the cost of those three is high — regulated advice, medical information, anything with a legal consequence." }] },

    { t: "h2", n: "06", text: "How much agency?", id: "how-much" },

    { t: "diagram", kind: "compare", title: "Four levels, from cheapest to most careful",
      caption: "Move down this list when the evidence says you need to, not by default. Each step adds at least one model round trip to every question.",
      columns: [
        { title: "Naive", tone: "good", items: ["One retrieval, one answer", "2 model calls", "FAQs, internal search", "Fails silently on vocabulary gaps"] },
        { title: "Retry", tone: "accent", items: ["Rephrase after a miss", "3 calls when it triggers", "Almost always worth it", "One sentence of instruction"] },
        { title: "Corrective", tone: "warn", items: ["Judge the chunks, loop with a cap", "4-6 calls", "Heterogeneous corpora", "Needs a bounded loop"] },
        { title: "Reflective", tone: "violet", items: ["Verify the answer against evidence", "6+ calls", "Regulated or high-stakes", "Evaluate before you build it"] }
      ] },

    { t: "exercise", kind: "practice", title: "Make a miss recoverable, then measure it", difficulty: "advanced", minutes: 30,
      prompt: "Take the corpus from 7.1 and write five questions that use different words from the documents. Run them against a naive agent and count how many are answered correctly. Add the rephrase-and-retry sentence to the instruction and run them again. Then build the LoopAgent version with a structured judge and a cap of three, run them a third time, and record correctness, model calls and wall-clock time for all three. Decide which one you would ship.",
      hints: [
        "Vocabulary gaps are the point — 'broken' versus 'warranty', 'money back' versus 'refund'.",
        "Count model calls by wrapping the model, as the executed example does.",
        "Time it: the differences are large enough to feel."
      ],
      solution: {
        notes: [
          { t: "p", text: "The usual shape of the result is that the retry sentence recovers most of the vocabulary-gap failures for one extra model call on the questions that need it and nothing on the questions that do not — which is why it is close to free. The loop version recovers a little more and costs on every question, including the easy ones, because the judge runs regardless." },
          { t: "p", text: "Whichever you would ship, the exercise's real output is the measurement itself. Agentic RAG is a family of trades between accuracy and cost, and the only way to make that trade honestly is with numbers from your corpus and your questions. A team that adds all four patterns because a blog post described them has bought six model calls per question without knowing whether the second one was already enough." }
        ]
      } }

  ],

  takeaways: [
    "Agentic RAG is retrieval the model can repeat, judge and refine — available because retrieval is a tool.",
    "The executed recovery took two queries and three model calls: the model translated the user's words into the corpus's.",
    "Rephrase-and-retry is one sentence of instruction and the best value of any pattern here.",
    "Corrective RAG needs a bounded loop — `max_iterations` and a structured verdict, never an open-ended search.",
    "Decompose compound questions into independent queries and run them concurrently.",
    "Every pattern costs a round trip; measure on your corpus before stacking all four."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "In the executed trace, why did the first query fail and the second succeed?",
      options: ["The corpus was reindexed between calls", "The second used the corpus's vocabulary rather than the user's", "The second query was shorter", "The first tool call errored"],
      answer: 1,
      why: "The user said 'broken laptop' and the document says 'hardware' and 'warranty'. Crossing that gap between how people ask and how documents are written is what a model is unusually good at, and it is most of what query rewriting buys you." },
    { stem: "What makes a retrieval loop safe to run in production?",
      options: ["A larger corpus", "max_iterations plus a structured verdict the code can branch on", "Running it in parallel", "Caching the queries"],
      answer: 1,
      why: "An uncapped loop told to search until it finds something will keep paying for retrievals and model calls against a corpus that does not contain the answer. A small cap bounds the cost, and a typed verdict means the stopping decision is a boolean your code checks rather than prose somebody parses." },
    { stem: "A user asks about two unrelated things in one sentence. What is the right pattern?",
      options: ["A longer retrieval result", "Decomposition into separate queries, run concurrently", "Self-reflection", "A bigger model"],
      answer: 1,
      why: "One embedding of a compound sentence sits between both topics and retrieves each poorly. A planner that emits one focused query per part fixes the retrieval, and because the parts are independent the searches can run at once — which is the case where concurrency genuinely pays." },
    { stem: "When is a runtime self-reflection step worth its cost?",
      options: ["Always — it improves every answer", "When an evaluation shows groundedness failures that matter and the cost of those failures is high", "For any RAG system", "Only with more than one corpus"],
      answer: 1,
      why: "Reflection adds a model call to every answer forever. An offline evaluation costs nothing per user and often shows groundedness is already high enough that the runtime check would catch a few cases in a hundred. Build the measurement first, then decide whether those cases are expensive enough to pay for continuously." }
  ] },

  interview: { title: "Interview", sub: "Agentic RAG questions", questions: [
    { level: "Core", q: "What is agentic RAG?",
      strong: "Retrieval the model can repeat and judge — rewrite after a miss, search several times, check the chunks before answering.",
      answer: [{ t: "p", text: "Naive RAG retrieves once and generates. Agentic RAG treats retrieval as something the agent can do repeatedly and reason about: rephrase when nothing matched, split a compound question into separate searches, judge whether the chunks actually answer the question and go again if not. You get the possibility for free the moment retrieval is a tool rather than a pipeline stage, and I have watched it work — a query in the user's words missed, the model rephrased into the corpus's vocabulary and found the document, at a cost of one extra model call. The judgement to have is that each pattern buys accuracy with latency, so you add them against evidence rather than by default." }] },
    { level: "Core", q: "How do you stop a retrieval loop from running forever?",
      strong: "max_iterations on the LoopAgent, plus a structured verdict that escalates when the evidence is sufficient.",
      answer: [{ t: "p", text: "Two mechanisms together. The loop agent takes `max_iterations`, which is the hard bound and should be small — if three well-chosen queries miss, the fourth almost never saves you. The soft exit is a judging agent with an `output_schema` whose boolean the code reads, escalating to end the loop when the retrieved text is sufficient. Making the verdict typed rather than prose matters more than it sounds: a stopping condition parsed out of a sentence fails in exactly the situation where you most need it to work, and then the cap is all that stands between you and a large bill." }] },
    { level: "Senior", q: "You are asked to build RAG over a legal document set where a wrong answer has consequences. How much agency do you build in?",
      strong: "Retry and decomposition for sure, corrective retrieval probably, reflection only after an evaluation says it is needed — and citations throughout.",
      answer: [{ t: "p", text: "I would start by making the answer attributable rather than accurate, because in this domain an answer nobody can check is not usable regardless of whether it happens to be right: every chunk carries its document id and the agent names its sources. Then rephrase-and-retry, which is one sentence and recovers the vocabulary gap between how a person asks and how a statute is written — a gap that is unusually wide here. Decomposition, because legal questions are routinely compound. Corrective retrieval with a small cap, since the corpus is heterogeneous and a first search landing in the wrong instrument is likely. Reflection I would hold back until I had an evaluation set, because it costs a round trip on every answer forever and the measurement usually tells you whether that is buying three cases in a hundred or thirty. The thing I would not do is present a grounded-looking answer with no route back to the source, and I would push hard on whether this system should be answering at all rather than retrieving passages for a person to read — for high-consequence advice, a very good search tool with citations is often the better product and a much easier one to defend." }] }
  ] }
});
