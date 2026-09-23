/* ============================================================================
   LESSON 4.6 — OpenAPI, Third-Party and Toolsets
   Constructor signatures introspected from google-adk 2.9.2.
   ========================================================================= */
EC.receiveLesson({
  id: "4.6",

  lede: "**A toolset is one object that expands into many tools, which is how a whole REST API, an MCP server or another framework's library becomes available to an agent without writing fifty functions.** `OpenAPIToolset` reads a spec and generates a tool per operation. `McpToolset` connects to an MCP server and exposes its tools. `LangchainTool` and `CrewaiTool` adapt other ecosystems. Google's own toolsets cover BigQuery, Spanner, Pub/Sub and the Google APIs. This lesson covers the `BaseToolset` contract they all share, the filtering that keeps them from flooding an agent, and when generating fifty tools from a spec is the wrong idea.",

  objectives: [
    "Generate tools from an OpenAPI specification and attach them to an agent",
    "Filter a toolset so only the operations you want reach the model",
    "Adapt a LangChain or CrewAI tool, and know what the wrapper does not fix",
    "Name the BaseToolset contract and why toolsets are resolved per request",
    "Decide between a generated toolset and a hand-written facade"
  ],

  prerequisites: ["4.1", "2.6"],

  blocks: [

    { t: "h2", n: "01", text: "The toolset contract", id: "contract" },

    { t: "code", lang: "python", title: "What every toolset implements",
      code: `from google.adk.tools.base_toolset import BaseToolset
print([n for n in dir(BaseToolset) if not n.startswith("_")])
# ['close', 'from_config', 'get_auth_config', 'get_tools',
#  'get_tools_with_prefix', 'process_llm_request']`,
      caption: "`get_tools` is resolved when the request is built, not at construction — so a toolset can return different tools per user or per state, and a remote one can refresh its list. `close` matters: an MCP toolset holds a connection (lesson 8.2)." },

    { t: "p", text: "`tools=[…]` accepts three kinds of thing: a plain function, a `BaseTool`, or a `BaseToolset` that expands into several. From the model's point of view there is no difference — it sees a flat list of declarations." },

    { t: "h2", n: "02", text: "A REST API as tools", id: "openapi" },

    { t: "code", lang: "python", title: "OpenAPIToolset",
      code: `from google.adk.tools.openapi_tool import OpenAPIToolset

toolset = OpenAPIToolset(
    spec_str=open("petstore.yaml").read(),
    spec_str_type="yaml",                 # or spec_dict=…, or spec_str with json
    auth_scheme=api_key_scheme,           # lesson 4.8
    auth_credential=api_key_credential,
)

agent = LlmAgent(name="store", model=M, instruction="Help with the pet store.",
                 tools=[toolset])`,
      caption: "Signature introspected on 2.9.2: `spec_dict`, `spec_str`, `spec_str_type`, `auth_scheme`, `auth_credential`, `credential_key` and more. Each operation in the spec becomes a tool whose name comes from `operationId` and whose description comes from the operation's `summary` and `description`." },

    { t: "diagram", kind: "flow", title: "From a spec to declarations",
      caption: "The quality of the generated tools is exactly the quality of the specification: a spec with no operationId, no summary and untyped parameters produces tools a model cannot choose between.",
      cols: 4,
      nodes: [
        { id: "s", label: "OpenAPI spec", sub: "paths · operations · schemas", tone: "accent" },
        { id: "t", label: "OpenAPIToolset", sub: "one tool per operation", tone: "good" },
        { id: "d", label: "declarations", sub: "name from operationId", tone: "warn" },
        { id: "m", label: "the model", sub: "sees them like any function tool", tone: "violet" }
      ],
      edges: [["s", "t"], ["t", "d"], ["d", "m"]] },

    { t: "callout", kind: "trap", title: "A 60-operation API is not a 60-tool agent",
      body: [{ t: "p", text: "Generating every operation gives the model sixty near-identical declarations, which is well past the point where tool selection degrades (lesson 2.6), and sends all sixty schemas on every call. Filter to the handful the agent actually needs, or wrap the toolset in a sub-agent exposed as an `AgentTool`. The ease of generating them is exactly what makes this mistake easy." }] },

    { t: "h2", n: "03", text: "Filtering", id: "filtering" },

    { t: "code", lang: "python", title: "Two ways to narrow a toolset",
      code: `# by name
McpToolset(connection_params=params, tool_filter=["read_file", "list_directory"])

# by predicate — decide per tool, with the context available
def only_safe(tool, ctx) -> bool:
    return not tool.name.startswith(("delete_", "drop_", "write_"))

McpToolset(connection_params=params, tool_filter=only_safe)`,
      caption: "`tool_filter` accepts a list of names or a predicate; `tool_name_prefix` namespaces them so two servers with a `search` tool do not collide. The same filtering idea applies to any toolset — and a filter is a security control as much as a usability one (lesson 9.2)." },

    { t: "h2", n: "04", text: "Other ecosystems", id: "adapters" },

    { t: "code", lang: "python", title: "LangChain and CrewAI tools",
      code: `from google.adk.tools.langchain_tool import LangchainTool
from google.adk.tools.crewai_tool import CrewaiTool      # needs google-adk[extensions]

LangchainTool(tool=some_langchain_tool, name=None, description=None)
CrewaiTool(tool=some_crewai_tool, name="…", description="…")`,
      caption: "Signature from 2.9.2: `LangchainTool(tool, name=None, description=None)` — the optional overrides exist because a wrapped tool's own name and description are often poor, and they are what the model reads." },

    { t: "dl", items: [
      ["What the wrapper fixes", "The interface: the other library's tool is adapted to `BaseTool` so ADK can declare and call it."],
      ["What it does not fix", "The description. A LangChain tool written for a different agent loop often has a terse or oddly worded description; override it. Also note the tool runs synchronously unless the underlying one is async — the blocking-tool warning of lesson 4.3 applies."],
      ["Google's own toolsets", "`bigquery`, `spanner`, `bigtable`, `pubsub`, `google_api_tool`, `apihub_tool`, `application_integration_tool`, `toolbox_toolset` — all in `google.adk.tools`, all following the same contract."],
      ["`APIHubToolset`", "Pulls a spec straight from API Hub rather than a local file, which keeps the tools in step with a registry rather than with a copied YAML."]
    ] },

    { t: "h2", n: "05", text: "Generated or hand-written", id: "facade" },

    { t: "diagram", kind: "compare", title: "A generated toolset against a hand-written facade",
      caption: "Generation is the right default for an internal API you control and a small number of operations. A facade is worth writing when the model's job is narrower than the API's surface.",
      columns: [
        { title: "Generate from the spec", tone: "accent", items: ["zero maintenance when the API changes", "every operation available", "descriptions are the spec's", "arguments are the API's shape"] },
        { title: "Hand-written facade", tone: "good", items: ["three tools instead of sixty", "descriptions written for the model", "arguments in the user's vocabulary", "several calls collapsed into one round trip"] }
      ] },

    { t: "code", lang: "python", title: "The facade, in practice",
      code: `# the API has: GET /customers, GET /customers/{id}, GET /customers/{id}/orders,
#              GET /orders/{id}, GET /orders/{id}/shipments  … and 55 more

def find_customer_orders(customer_email: str, since_days: int = 30) -> dict:
    """Finds a customer's recent orders by email address.

    Args:
        customer_email: the customer's email, e.g. 'asha@example.com'.
        since_days: how far back to look, default 30.
    """
    cid = api.customers(email=customer_email)["id"]           # three API calls,
    orders = api.customer_orders(cid, since_days=since_days)  # one tool call,
    return {"status": "ok", "count": len(orders),             # one model round trip
            "orders": [{"id": o["id"], "state": o["state"], "total_paise": o["total"]}
                       for o in orders[:5]]}`,
      caption: "One declaration, in the vocabulary the user actually uses (an email, not a customer id), returning five fields instead of the API's forty — and saving two model round trips that a chain of generated tools would have cost (lesson 4.3)." },

    { t: "exercise", kind: "design", title: "Take a spec down to four tools", difficulty: "core", minutes: 20,
      body: [{ t: "p", text: "You are given an OpenAPI spec for an internal ticketing system with 38 operations. The agent needs to: find a ticket by description, read its comments, add a comment, and close it. Decide how to expose that: generated toolset with a filter, hand-written facade, or a mixture — and justify it. Then say what you would do differently if the requirement were 'the agent should be able to do anything the API can do'." }],
      requirements: ["A decision with reasons", "The four tool signatures you would give the model", "The alternative answer for the 'anything' requirement"],
      hint: "'Find by description' is not an API operation.",
      solution: { lang: "text", title: "Solution",
        code: `Four hand-written tools. Reasons: 'find a ticket by description' maps to a search
operation plus filtering that the spec does not express; 'close it' is usually a PATCH
with a status enum the model would have to guess; and 38 declarations would swamp the
model for a four-verb job. Signatures in the user's vocabulary:

    find_ticket(description: str, project: str = "") -> dict
    read_ticket(ticket_id: str) -> dict            # includes comments, trimmed
    add_comment(ticket_id: str, comment: str) -> dict
    close_ticket(ticket_id: str, resolution: str) -> dict

For 'anything the API can do': generate the full toolset, but put it behind a sub-agent
exposed as an AgentTool, with an instruction explaining the API's model. The caller then
sees one tool; the ticketing sub-agent faces the 38 with a prompt written for them.`,
        notes: [{ t: "p", text: "The general rule: the model's tool list should match the job, not the API. When the job really is 'the whole API', the way to keep tool selection accurate is to give that job its own agent rather than to widen an existing one." }] } }
  ],

  takeaways: [
    "A toolset is one object that expands into many tools; get_tools is resolved per request, so the list can vary by user or state.",
    "OpenAPIToolset generates a tool per operation, taking names from operationId and descriptions from the spec — so the spec's quality becomes the tools' quality.",
    "tool_filter takes a list of names or a predicate, and is a security control as much as a usability one; tool_name_prefix prevents collisions between servers.",
    "LangchainTool and CrewaiTool adapt other ecosystems' tools; override their name and description, because those are what the model reads.",
    "Google ships toolsets for BigQuery, Spanner, Bigtable, Pub/Sub, API Hub and the Google APIs, all on the same contract.",
    "Generating sixty tools from a spec puts the agent well past the tool-count cliff and sends sixty schemas on every call.",
    "A hand-written facade in the user's vocabulary usually beats generated tools: fewer declarations, better descriptions, fewer round trips."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "When are a toolset's tools resolved?",
      options: ["At construction", "When the request is built, via get_tools — so the list can vary per user or per state", "Once per process", "Only when the model calls one"],
      answer: 1,
      why: "BaseToolset exposes get_tools, which ADK calls while assembling the model request. That is what allows a toolset to return different tools for different users, and what lets a remote toolset such as MCP refresh its list — it also means a toolset can hold a connection, which is why close is part of the contract." },
    { stem: "You generate 60 tools from an OpenAPI spec and attach them to one agent. What goes wrong?",
      options: ["Nothing", "Tool selection degrades badly and all 60 schemas are sent on every model call", "ADK refuses more than ten tools", "The spec must be JSON"],
      answer: 1,
      why: "Accuracy falls as the declaration list grows past roughly ten, and every call carries every schema as input tokens. The fixes are a tool_filter down to what the agent needs, or putting the whole toolset behind a sub-agent exposed as an AgentTool so the caller sees one declaration." },
    { stem: "What does LangchainTool not fix about a wrapped LangChain tool?",
      options: ["The calling interface", "Its name and description, which are what the model reads and are often poor", "Its return type", "Its imports"],
      answer: 1,
      why: "The wrapper adapts the interface so ADK can declare and invoke it, but the text the model uses to choose the tool comes from the wrapped object. That is why LangchainTool accepts name and description overrides — and why a wrapped tool that is never called is usually a description problem." },
    { stem: "The agent needs to 'find a ticket by description'. The API has no such operation. What does that tell you?",
      options: ["The API needs changing", "A hand-written facade is the right shape: the tool should speak the user's vocabulary, not the API's", "Use a bigger model", "Generate all operations and let the model work it out"],
      answer: 1,
      why: "Generated tools mirror the API's verbs; the agent's job is expressed in the user's. When those differ — search plus filter plus a status enum to close a ticket — a facade that collapses several calls into one tool is clearer for the model and saves round trips as well." }
  ] },

  interview: { title: "Interview", sub: "Integration questions", questions: [
    { level: "Core", q: "How would you give an agent access to an existing REST API?",
      strong: "OpenAPIToolset if the spec is good and the surface is small; otherwise a hand-written facade of a few tools in the user's vocabulary.",
      answer: [{ t: "p", text: "If there is a decent OpenAPI spec and the agent genuinely needs a handful of operations, OpenAPIToolset generates them directly, with auth configured on the toolset, and stays in step with the spec. Two things decide against that. First, size: a 40-operation API produces 40 declarations, which is past the point where a model picks reliably and adds a large per-call token cost — so I would filter, or put the toolset behind a sub-agent exposed as an AgentTool. Second, vocabulary: the agent's job is usually expressed differently from the API's resources, so a facade that takes an email instead of a customer id, does the two lookups itself and returns five fields is both more accurate and one round trip cheaper. My default is a facade of three to six tools, with generation reserved for genuinely wide access." }] },
    { level: "Core", q: "What is a toolset, and why is get_tools called per request?",
      strong: "One object that expands into many tools, resolved while the request is built so the list can vary by user, by state, or by what a remote server currently offers.",
      answer: [{ t: "p", text: "A toolset implements BaseToolset - get_tools, close, process_llm_request - and ADK calls get_tools while assembling each model request rather than once at construction. That matters for three reasons. A toolset can return different tools for different users, which is how one agent offers read-only tools to most people and write tools to operators. A remote toolset such as an MCP one can refresh its list when the server's tools change, without a redeploy. And because a toolset may own a connection, close is part of the contract - the piece people forget when an MCP server is left holding an open session after the agent shuts down." }] },
    { level: "Senior", q: "Your agents consume tools from three internal APIs and two MCP servers. How do you keep that manageable?",
      strong: "Namespacing and filtering per agent, facades for the common journeys, and one sub-agent per domain rather than one agent with everything.",
      answer: [{ t: "p", text: "The failure mode is one agent accumulating everything, so I would make the boundary explicit: one sub-agent per domain, each holding its own toolset with a filter, each exposed to the coordinator as a single AgentTool. Names get prefixed — MCP toolsets support tool_name_prefix — so two servers offering search do not collide, and filters are applied as a security control, not only for tidiness: no delete or write operations reach an agent that has no business performing them. For the two or three journeys users actually repeat, I would write facades that collapse several calls into one tool, because those save round trips and make the model's job smaller. And because toolsets resolve per request, a filter can depend on the user, which is how the same agent offers read-only tools to most users and write tools to operators." }] }
  ] }
});
