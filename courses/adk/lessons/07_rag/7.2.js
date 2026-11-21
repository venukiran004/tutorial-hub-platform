/* ============================================================================
   LESSON 7.2 — Agentic RAG: Planning, Correction and Self-Reflection
   The two-query recovery, its query list and the three model requests are
   executed output from r1.py on google-adk 2.9.2.
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

    { t: "code", lang: "python", title: "the instruction that makes the difference",
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

    {"kind": "trace", "title": "Four patterns, and the round trip each one adds", "caption": "**Read the right-hand column before the left, because the instinct to add all four is strong.** A naive RAG turn is two model calls; rewrite and retry makes three; validation and reflection take you to five or six, each carrying the conversation. **That is the right trade for a medical or legal answer and the wrong one for a product FAQ** where a miss costs nothing — and the agent you end up with takes nine seconds to answer a question about opening hours.", "left": "pattern", "codeW": 160, "vars": ["what it does", "wiring", "cost"], "steps": [{"code": "query rewriting", "state": ["the user's words into the corpus's", "an instruction, or an agent", "+1 call"], "tone": "good"}, {"code": "decomposition", "state": ["one question into several retrievals", "a planner producing a list", "+1 per part"], "changed": [0, 1, 2], "tone": "good"}, {"code": "corrective RAG", "state": ["judges the chunks, retries or falls back", "a LoopAgent with an escalate", "+2 per loop"], "changed": [0, 1, 2], "tone": "accent"}, {"code": "self-reflection", "state": ["checks the draft against the evidence", "a second agent, structured verdict", "+1 big call"], "changed": [0, 1, 2], "tone": "violet"}, {"code": "all four", "state": ["five or six calls for one answer", "-", "nine seconds"], "changed": [0, 1, 2], "tone": "crit"}], "t": "diagram", "id": "dg-7_2-02-0"},

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

    {"kind": "cycle", "title": "Retrieve, judge, retry - and the cap that stops the bill", "caption": "**Three things make this better than instructing the model to try harder.** The retry is bounded, so a corpus that will never answer costs three searches rather than an open-ended argument. The judgement is structured, so your code branches on `sufficient` instead of parsing prose. And the rewritten query is explicit, **so you can log it and discover what your users ask versus what your documents say** — which is often the most valuable artefact of the whole pattern. If three well-chosen queries miss, the fourth almost never saves you.", "centre": "max_iterations=3", "nodes": [{"label": "retriever searches", "sub": "'Search for: {query}'", "tone": "accent", "edge": "writes {retrieved}"}, {"label": "judge reads the evidence", "sub": "include_contents='none'", "tone": "violet", "edge": "returns a Verdict"}, {"label": "sufficient: false", "sub": "with a better_query", "tone": "warn", "edge": "loop again"}, {"label": "sufficient: true", "sub": "escalate = True", "tone": "good", "edge": "the loop ends"}], "t": "diagram", "id": "dg-7_2-03-1"},

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

    {"kind": "flow", "title": "Reflection checks every answer; evaluation tells you whether to", "caption": "**A reflection step checks every answer at runtime, for every user, forever; an evaluation suite checks a sample offline, once per change.** Build the evaluation first — it is cheaper, repeatable, and frequently shows groundedness already at 97%, which means the runtime check would pay a full round trip to catch three cases in a hundred. **Add reflection when the cost of those three is high:** regulated advice, medical information, anything with a legal consequence.", "cols": 3, "nodes": [{"id": "r", "label": "Reflection: a second agent", "sub": "reads the draft AND the chunks", "tone": "violet"}, {"id": "c", "label": "Catches the fluent overreach", "sub": "claims beyond the evidence", "tone": "good"}, {"id": "p", "label": "But pays per answer, forever", "sub": "the most expensive thing here", "tone": "crit"}, {"id": "e", "label": "Evaluation: offline, per change", "sub": "a sample, repeatable, cheap", "tone": "good"}, {"id": "f", "label": "Build this FIRST", "sub": "it says whether you need reflection", "tone": "accent"}, {"id": "w", "label": "Then reflect where a miss is costly", "sub": "regulated, medical, legal", "tone": "violet"}], "edges": [["r", "c"], ["c", "p"], ["p", "e"], ["e", "f"], ["f", "w"]], "t": "diagram", "id": "dg-7_2-05-2"},

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
      requirements: [
        "Write five questions that use different words from the documents",
        "Run them against a naive agent and count correct answers",
        "Add the rephrase-and-retry sentence and rerun",
        "Build the LoopAgent version with a judge and a cap of three, and record correctness, model calls and time for all three"
      ],
      hints: [
        "Vocabulary gaps are the point — 'broken' versus 'warranty', 'money back' versus 'refund'.",
        "Count model calls by wrapping the model, as the executed example does.",
        "Time it: the differences are large enough to feel."
      ],
      solution: {
        lang: "python", title: "solution.py",
        code: `import asyncio, logging, os, re, time, warnings
warnings.filterwarnings("ignore"); logging.disable(logging.WARNING)
from pydantic import BaseModel, Field
from google.adk.agents import LlmAgent, LoopAgent, SequentialAgent
from google.adk.runners import InMemoryRunner
from google.adk.tools import ToolContext
from google.adk.tools.retrieval import BaseRetrievalTool
from google.genai import types

LLM = __import__("local_llm").LocalLlm(model="local-qwen-3b") if not os.environ.get("GOOGLE_API_KEY") else None
MODEL = LLM or "gemini-3.8-flash"           # reference output: the local Qwen2.5-3B via local_llm.py

DOCS = {   # the corpus from 7.1
    "refund-policy": "Refunds are issued within 14 days of purchase. Digital goods are non-refundable once downloaded.",
    "shipping": "Standard shipping takes 3 to 5 working days. Express shipping takes 1 working day and costs 9 pounds.",
    "warranty": "Hardware carries a 2-year warranty covering manufacturing faults, not accidental damage.",
    "returns-address": "Returns go to Unit 4, Riverside Park, Leeds LS10 1AB, with the order number inside the parcel.",
    "support-hours": "Support is open Monday to Friday, 9am to 6pm UK time. There is no weekend support.",
}
class Corpus(BaseRetrievalTool):                    # exact-word matching, so different wording misses
    def __init__(self): super().__init__(name="search_docs", description="Searches the company's customer policy documents by keyword.")
    async def run_async(self, *, args, tool_context):
        words = set(re.findall(r"[a-z]+", args["query"].lower())) - {"the", "a", "is", "of", "to", "and", "how", "what", "do", "i", "my", "can"}
        hits = [f"[{k}] {v}" for k, v in DOCS.items() if words & set(re.findall(r"[a-z]+", (k + " " + v).lower()))]
        return "\\n".join(hits) if hits else "No matching document found."

# Five questions that avoid the documents' own words, with the fact a correct answer must contain
CASES = [("How quickly will I get my money back?", "14"), ("Can I phone you on a Saturday?", "no weekend"),
         ("How long is the guarantee on a computer?", "2-year"), ("What does next-day delivery cost?", "9"),
         ("I dropped my tablet and cracked it. Will you fix it for free?", "accidental")]
BASE = ("You can call the search_docs tool yourself. Call it with a short keyword query, then answer only from what it "
        "returned, naming the document id in square brackets. If nothing relevant was returned, say the documents do not cover it.")
RETRY = BASE + (" If search_docs returns 'No matching document found', rephrase the query using different words - "
                "for example the formal term for the thing asked about - and search again, up to three times.")

class Verdict(BaseModel):
    answered: bool = Field(description="True only if the draft answer states a fact taken from a cited document")
    reason: str = Field(description="One short sentence")

def stop_if_answered(tool_context: ToolContext) -> dict:
    """Call this when the verdict says the draft is answered."""
    tool_context.actions.escalate = True; return {"stopped": True}

def loop_agent():
    answerer = LlmAgent(name="answerer", model=MODEL, tools=[Corpus()], output_key="draft",
                        instruction=BASE + " If a previous verdict exists in {verdict?}, search again with different words.")
    judge = LlmAgent(name="judge", model=MODEL, output_schema=Verdict, output_key="verdict", include_contents="none",
                     instruction="Question and draft answer:\\n{draft}\\nDecide whether the draft actually answers from a cited document.")
    stopper = LlmAgent(name="stopper", model=MODEL, tools=[stop_if_answered], include_contents="none",
                       instruction="Verdict: {verdict}. If answered is true, call stop_if_answered. Otherwise reply 'retry'.")
    return LoopAgent(name="loop", sub_agents=[answerer, judge, stopper], max_iterations=3)

async def run(agent, q):
    runner = InMemoryRunner(agent=agent, app_name="rag")
    sid = (await runner.session_service.create_session(app_name="rag", user_id="u")).id
    final = ""
    async for e in runner.run_async(user_id="u", session_id=sid, new_message=types.Content(role="user", parts=[types.Part(text=q)])):
        for p in (e.content.parts if e.content else []):
            if p.text and e.author in ("rag", "answerer"): final = p.text
    return final

async def main():
    variants = [("naive", lambda: LlmAgent(name="rag", model=MODEL, instruction=BASE, tools=[Corpus()])),
                ("rephrase-and-retry instruction", lambda: LlmAgent(name="rag", model=MODEL, instruction=RETRY, tools=[Corpus()])),
                ("LoopAgent with a structured judge, cap 3", loop_agent)]
    print(f"{'variant':<42} correct  model calls  seconds")
    for name, make in variants:
        c0 = LLM.calls if LLM else 0; t0 = time.time(); correct = 0
        for q, fact in CASES:
            correct += fact.lower() in (await run(make(), q)).lower()
        calls = (LLM.calls - c0) if LLM else float("nan")
        print(f"{name:<42} {correct}/5      {calls:>5}       {time.time() - t0:6.0f}")

asyncio.run(main())`,
        out: `variant                                    correct  model calls  seconds
naive                                      1/5          8          420
rephrase-and-retry instruction             2/5          9          545
LoopAgent with a structured judge, cap 3   1/5         36         1518`,
       
        notes: [
          { t: "p", text: "The usual shape of the result is that the retry sentence recovers most of the vocabulary-gap failures for one extra model call on the questions that need it and nothing on the questions that do not — which is why it is close to free. The loop version costs on every question, including the easy ones, because the judge runs regardless, and whether it recovers anything depends on how good the judge is. In the reference run on a local Qwen2.5-3B, naive retrieval answered 1 of 5 paraphrased questions, the retry sentence 2 of 5 for one extra call, and the loop 1 of 5 for 36 model calls against 8 — the most expensive option was no better than the cheapest. A loop is only as good as its judge, and a judge needs its own evaluation before you pay for it on every question." },
          { t: "p", text: "Whichever you would ship, the exercise's real output is the measurement itself. Agentic RAG is a family of trades between accuracy and cost, and the only way to make that trade honestly is with numbers from your corpus and your questions. A team that adds all four patterns because a blog post described them has bought six model calls per question without knowing whether the second one was already enough." }
        ]
      } },

    { t: "callout", kind: "scenario", title: "Incident: a retrieval loop that spent forty calls on one question",
      body: [
        { t: "p", text: "**Symptom.** One user's question about an obscure product generated over forty model calls before timing out." },
        { t: "p", text: "**Mechanism.** The agent was told to keep searching until it found an answer, and the corpus did not contain one. Each search returned nothing, the model rephrased, and nothing bounded the loop." },
        { t: "p", text: "**Fix.** The loop has a cap of three attempts, the judge can conclude 'not in the corpus', and `max_llm_calls` bounds the whole invocation. An unbounded retry is a bill." }
      ] }
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
      options: ["The corpus was reindexed between the calls", "The second used the corpus's vocabulary", "The second query was simply shorter", "The first tool call raised an error"],
      answer: 1,
      why: "The user said 'broken laptop' and the document says 'hardware' and 'warranty'. Crossing that gap between how people ask and how documents are written is what a model is unusually good at, and it is most of what query rewriting buys you." },
    { stem: "What makes a retrieval loop safe to run in production?",
      options: ["A larger, more complete corpus", "max_iterations plus a structured verdict", "Running every query in parallel", "Caching each query and its results"],
      answer: 1,
      why: "An uncapped loop told to search until it finds something will keep paying for retrievals and model calls against a corpus that does not contain the answer. A small cap bounds the cost, and a typed verdict means the stopping decision is a boolean your code checks rather than prose somebody parses." },
    { stem: "A user asks about two unrelated things in one sentence. What is the right pattern?",
      options: ["A longer retrieval result", "Separate queries, run concurrently", "A self-reflection step afterwards", "A bigger model for the question"],
      answer: 1,
      why: "One embedding of a compound sentence sits between both topics and retrieves each poorly. A planner that emits one focused query per part fixes the retrieval, and because the parts are independent the searches can run at once — which is the case where concurrency genuinely pays." },
    { stem: "When is a runtime self-reflection step worth its cost?",
      options: ["Always, because it improves every answer", "When evals show costly groundedness failures", "For any RAG system, whatever its traffic", "Only when there is more than one corpus"],
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
