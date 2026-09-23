/* ============================================================================
   LESSON 4.4 — Built-in Tools: Search, Code Execution and Vertex AI Search
   Tool classes and executor list introspected from google-adk 2.9.2. The
   tools themselves call Google services and were not executed here.
   ========================================================================= */
EC.receiveLesson({
  id: "4.4",

  lede: "**Some tools do not run in your process at all.** `google_search`, `url_context` and built-in code execution are executed on the model's side of the API: you attach them, the model uses them, and the results arrive with grounding metadata rather than as function responses you produced. That gives you web knowledge, page fetching and a Python sandbox for nothing — and it comes with restrictions that catch people out, including where these tools can be combined and which providers have them at all. This lesson covers the built-ins ADK ships, the five code executors, and what grounding metadata gives you that a text answer does not.",

  objectives: [
    "List the built-in tools ADK exposes and say which run server-side",
    "Explain what grounding metadata is and why an answer with citations needs it",
    "Choose between built-in code execution and a container or Vertex AI executor",
    "Configure Vertex AI Search or Discovery Engine as a retrieval tool",
    "Say what you lose by depending on built-in tools, and the portable alternative"
  ],

  prerequisites: ["4.1"],

  blocks: [

    { t: "h2", n: "01", text: "The built-ins", id: "builtins" },

    { t: "code", lang: "python", title: "What they are, from the package",
      code: `from google.adk.tools import (google_search, url_context, enterprise_web_search,
                             google_maps_grounding, load_memory, preload_memory,
                             exit_loop, get_user_choice, transfer_to_agent,
                             VertexAiSearchTool, DiscoveryEngineSearchTool)

# printed on 2.9.2:
#   GoogleSearchTool          name=google_search
#   UrlContextTool            name=url_context
#   EnterpriseWebSearchTool   name=enterprise_web_search
#   GoogleMapsGroundingTool   name=google_maps
#   LoadMemoryTool            name=load_memory
#   PreloadMemoryTool         name=preload_memory`,
      caption: "They are instances, not classes — `tools=[google_search]`, no parentheses. The memory tools are covered in lesson 5.4, `exit_loop` in 2.3, `get_user_choice` in 9.3 and `transfer_to_agent` in 2.5." },

    { t: "diagram", kind: "compare", title: "Where a tool actually executes",
      caption: "The distinction matters for latency, for what can be logged, for what a callback can intercept, and for whether the tool exists at all on another provider.",
      columns: [
        { title: "Server-side (model side)", tone: "warn", items: ["google_search", "url_context", "built-in code execution", "google_maps grounding", "no function_response you control", "results arrive as grounding metadata", "Gemini only"] },
        { title: "Your process", tone: "good", items: ["every function tool you write", "AgentTool, OpenAPI, MCP toolsets", "Vertex AI Search tool", "you see the arguments and the result", "callbacks can block or rewrite it", "portable across providers"] }
      ] },

    { t: "h2", n: "02", text: "Search and grounding", id: "search" },

    { t: "code", lang: "python", title: "An agent that can look things up",
      code: `from google.adk.agents import LlmAgent
from google.adk.tools import google_search

agent = LlmAgent(
    name="researcher",
    model="gemini-2.5-flash",
    instruction="Answer using Google Search. Always say where the information came from.",
    tools=[google_search],
)`,
      caption: "No API key for a search provider, no HTTP client, no rate-limit handling: the model performs the search. The cost is that you cannot see or intercept the query it issued from a `before_tool_callback`, because your process never ran it." },

    { t: "p", text: "The valuable part is not the answer but the **grounding metadata**: `event.grounding_metadata` carries the sources the model used, with the spans of the answer each one supports. That is what lets a UI show citations, and what a groundedness evaluation checks against (lesson 11.2). An answer without it is a claim; an answer with it is a claim with evidence." },

    { t: "dl", items: [
      ["`google_search`", "Web search performed by the model. Grounding metadata comes back with the response."],
      ["`url_context`", "Fetches specific URLs the model decides to read. Useful when the user names a page: *summarise this link*."],
      ["`enterprise_web_search`", "The enterprise-compliance variant of web search on Vertex AI."],
      ["`google_maps_grounding`", "Grounding against Maps data for place and route questions."],
      ["`VertexAiSearchTool(data_store_id=… | search_engine_id=…, filter=…, max_results=…)`", "Your own corpus indexed in Vertex AI Search, queried as a tool. This is the managed RAG path (lesson 7.1)."],
      ["`DiscoveryEngineSearchTool`", "The Discovery Engine equivalent for existing search apps."]
    ] },

    { t: "callout", kind: "trap", title: "Built-in tools have combination limits",
      body: [{ t: "p", text: "Server-side tools have historically come with restrictions on being combined with each other or with function tools in a single agent, and the rules differ by model version. The robust pattern when you hit one is the same as for tool-count problems: put the built-in tool on its own small agent and expose that agent to the parent as an `AgentTool` (lesson 2.6). The parent then sees one ordinary tool, and the restriction applies only inside the child." }] },

    { t: "h2", n: "03", text: "Code execution", id: "code" },

    { t: "code", lang: "python", title: "Five executors, one field",
      code: `from google.adk.code_executors import (
    BuiltInCodeExecutor,        # runs on the model's side — Gemini's own sandbox
    VertexAiCodeExecutor,       # a managed sandbox on Vertex AI
    ContainerCodeExecutor,      # a container you specify
    GkeCodeExecutor,            # a pod on your GKE cluster
    UnsafeLocalCodeExecutor,    # in this process. The name is the documentation.
)

analyst = LlmAgent(name="analyst", model="gemini-2.5-pro",
                   instruction="Use Python to compute answers. Show your working.",
                   code_executor=BuiltInCodeExecutor())`,
      caption: "Attached with `code_executor=`, not as a tool. The model writes Python, the executor runs it, and the output comes back to the model — so an arithmetic or data-manipulation answer is computed rather than predicted." },

    { t: "diagram", kind: "matrix", title: "Choosing an executor",
      caption: "The question is whose machine runs model-written code and what that code can reach. UnsafeLocalCodeExecutor gives a model arbitrary execution inside your service, with your credentials and your network.",
      rows: ["BuiltInCodeExecutor", "VertexAiCodeExecutor", "ContainerCodeExecutor", "GkeCodeExecutor", "UnsafeLocalCodeExecutor"],
      cols: ["runs where", "isolation", "can reach your data?"],
      cells: [
        [{ text: "model side", tone: "accent" }, { text: "Google's sandbox", tone: "good" }, { text: "no", tone: "good" }],
        [{ text: "Vertex AI", tone: "accent" }, { text: "managed sandbox", tone: "good" }, { text: "what you grant", tone: "warn" }],
        [{ text: "a container", tone: "warn" }, { text: "container boundary", tone: "warn" }, { text: "what you mount", tone: "warn" }],
        [{ text: "your GKE cluster", tone: "warn" }, { text: "pod", tone: "warn" }, { text: "cluster network", tone: "crit" }],
        [{ text: "your process", tone: "crit" }, { text: "none", tone: "crit" }, { text: "everything", tone: "crit" }]
      ] },

    { t: "callout", kind: "trap", title: "UnsafeLocalCodeExecutor in production is a remote-code-execution vulnerability",
      body: [{ t: "p", text: "It executes model-generated Python in your server process. Anyone who can influence the model's input — that is, any user — can influence what runs, with your service's credentials and network access. It exists for local experiments. The safe choices are the built-in or Vertex AI sandboxes; a container or GKE executor is acceptable when the pod has no credentials and no egress (lesson 9.2)." }] },

    { t: "h2", n: "04", text: "What you lose with server-side tools", id: "tradeoffs" },

    { t: "table", head: ["You lose", "Because", "Mitigation"],
      rows: [
        ["Interception", "No `before_tool_callback` fires for a tool your process never ran", "Validate the *answer* in an `after_model_callback` instead (lesson 6.1)"],
        ["Observability", "No function-call span with arguments in your trace", "Use the grounding metadata, which records the sources actually used"],
        ["Portability", "These are Gemini-side features with no LiteLLM equivalent", "A function tool calling a search API, if a second provider is on the roadmap (lesson 3.2)"],
        ["Control of cost", "The model decides how many searches to run", "Instruction limits, and evaluation on the number of calls per answer"],
        ["Combinability", "Restrictions on mixing with other tools in one agent", "Isolate on a sub-agent behind an `AgentTool`"]
      ] },

    { t: "p", text: "None of that argues against using them. `google_search` is one line against a search integration you would otherwise build, maintain and pay for separately, and the grounding metadata is better than what most home-made pipelines produce. The argument is for knowing which tools are yours and which are the model's, because the two behave differently when something goes wrong." },

    { t: "exercise", kind: "design", title: "Pick an executor and defend it", difficulty: "core", minutes: 15,
      body: [{ t: "p", text: "For each case, choose one of the five code executors and justify it in two sentences: (a) a data analyst agent that computes statistics over a CSV the user uploaded; (b) an internal agent that must query the company's private data warehouse from generated SQL-and-Python; (c) a public demo on a laptop; (d) a customer-facing agent that draws charts from figures in the conversation." }],
      requirements: ["Four choices", "Two sentences each", "Name the blast radius you accepted in each"],
      hint: "(b) is the one where the answer is probably not a code executor at all.",
      solution: { lang: "text", title: "Solution",
        code: `(a) BuiltInCodeExecutor — the data comes in with the request and the computation is
    self-contained; Google's sandbox has no access to anything of yours. Blast radius: none.

(b) None of them. Generated code with warehouse credentials is arbitrary access to the
    warehouse. Give the agent a parameterised query tool instead, with an allow-list of
    tables and a row cap. Blast radius: bounded by the tool, not by the model.

(c) UnsafeLocalCodeExecutor is acceptable only here, and only because the laptop has
    nothing to lose. It must not survive into a deployed configuration.

(d) BuiltInCodeExecutor or VertexAiCodeExecutor: chart code is self-contained and the
    inputs are already in the conversation. Blast radius: the sandbox.`,
        notes: [{ t: "p", text: "The pattern in (b) is the general rule: when model-written code would need credentials, the right design is a tool with a narrow interface rather than an executor with broad access. The model's flexibility is exactly what makes credentialed execution unsafe." }] } }
  ],

  takeaways: [
    "google_search, url_context, enterprise_web_search and google_maps_grounding execute on the model's side; you attach them as instances with no parentheses.",
    "Server-side results arrive with grounding metadata naming the sources, which is what citations and groundedness evaluation are built on.",
    "Vertex AI Search and Discovery Engine tools query your own indexed corpus and run through your request — the managed RAG path.",
    "Code execution is attached with code_executor=, and the five executors differ in whose machine runs model-written code and what it can reach.",
    "UnsafeLocalCodeExecutor runs generated Python in your process with your credentials: a local-experiment tool only.",
    "Server-side tools cannot be intercepted by tool callbacks, do not appear as tool spans, and have no equivalent on other providers.",
    "When a built-in tool cannot be combined with your other tools, isolate it on a sub-agent and expose that agent as an AgentTool."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "Why does a before_tool_callback not fire for google_search?",
      options: ["Callbacks are disabled for built-ins", "The search executes on the model's side of the API, so your process never runs a tool", "google_search is not a tool", "It fires but is ignored"],
      answer: 1,
      why: "Server-side tools are performed by the model service; there is no function call for your code to intercept and no function response you produced. To validate what came back, use an after_model_callback on the response, and use the grounding metadata to see which sources were actually used." },
    { stem: "What is grounding metadata for?",
      options: ["Debugging the model's temperature", "It names the sources behind the answer, with the spans they support — the basis for citations and groundedness checks", "It counts tokens", "It stores the search query"],
      answer: 1,
      why: "An answer produced with google_search comes back with metadata describing which sources supported which parts of it. That is what a UI needs to show citations and what an evaluation needs to score whether the answer is actually supported by retrieved evidence rather than invented." },
    { stem: "Which code executor should never be used in a deployed service?",
      options: ["BuiltInCodeExecutor", "VertexAiCodeExecutor", "UnsafeLocalCodeExecutor", "ContainerCodeExecutor"],
      answer: 2,
      why: "It runs model-generated Python inside your own process, with your service's credentials and network access. Since any user can influence the model's input, that is remote code execution by design. Its name is the documentation; use the sandboxes for anything deployed." },
    { stem: "An agent needs both google_search and three of your own tools, and hits a combination restriction. What is the robust fix?",
      options: ["Remove your tools", "Put google_search on its own sub-agent and expose it to the parent as an AgentTool", "Switch models until it works", "Call the search API directly from an instruction"],
      answer: 1,
      why: "Wrapping the search-capable agent as an AgentTool gives the parent one ordinary function tool, and the restriction then applies only inside the child agent where the built-in lives. It is the same encapsulation that keeps tool lists short in lesson 2.6." }
  ] },

  interview: { title: "Interview", sub: "Built-in tool questions", questions: [
    { level: "Core", q: "What is the difference between google_search and a function tool that calls a search API?",
      strong: "Where it runs: server-side with grounding metadata and no interception, versus your process with full control and portability.",
      answer: [{ t: "p", text: "google_search is executed by the model service. You attach it in one line, you pay nothing extra to integrate, and the response comes back with grounding metadata naming the sources — which is better provenance than most hand-built integrations produce. What you give up is control: no before_tool_callback fires, the query is not in your trace as a tool call with arguments, you cannot cap the number of searches directly, and the tool does not exist on another provider. A function tool calling a search API is the opposite on every count: more work, fully intercepted, fully logged, portable. I would use the built-in unless a specific requirement — auditing the queries, a different search backend, provider portability — forces the other." }] },
    { level: "Core", q: "What is grounding metadata and why does it matter?",
      strong: "It names the sources behind an answer and which spans they support - the basis for citations and for checking groundedness.",
      answer: [{ t: "p", text: "When an agent answers using a server-side search or grounding tool, the response carries grounding metadata: the sources consulted and, for each supported span of the answer, which source backs it. That is what a user interface needs to render citations, and it is what an evaluation needs in order to decide whether an answer was actually supported by retrieved evidence rather than produced from the model's own weights. Without it you have a fluent claim and no way to check it, which is precisely the failure mode retrieval is supposed to fix. It is also the strongest argument for preferring a grounded built-in over a hand-rolled search tool that returns bare text." }] },
    { level: "Senior", q: "A team wants an agent that runs generated Python against the production data warehouse. What do you say?",
      strong: "No — replace the executor with a narrow query tool; generated code with credentials is arbitrary access.",
      answer: [{ t: "p", text: "Code execution with credentials is not a sandboxing problem you can solve by choosing a better executor, because the whole point of the executor is to run whatever the model wrote. If the code can reach the warehouse, then anyone who can phrase a message can reach the warehouse. The right design is a tool with a narrow interface: a parameterised query function with an allow-list of tables and columns, a row limit, a statement timeout, and a read-only role that has access to nothing else. The model then composes questions rather than SQL, and the blast radius is the tool's signature rather than the model's imagination. If truly ad-hoc analysis is required, run it against a sanitised copy in an isolated sandbox with no network egress, and treat its output as untrusted input." }] }
  ] }
});
