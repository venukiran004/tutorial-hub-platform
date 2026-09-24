/* ============================================================================
   GOOGLE ADK — CURRICULUM
   ----------------------------------------------------------------------------
   Twelve modules covering the Agent Development Kit end to end, in the order
   an engineer needs them: the four objects the framework is built from, the
   agents and the models behind them, tools (the largest surface by far),
   the state/memory/context triangle, the control hooks, retrieval, the two
   interoperability protocols — MCP and A2A — then safety, the runtime,
   operations and production.

   Every API in this course was introspected from the installed package and
   every event trace was produced by running the code. The model is a
   scripted BaseLlm, so the traces are the real framework's events without
   needing an API key; anything that requires Google Cloud is marked as not
   run here.

     Version pinned at authoring: google-adk 2.9.2, a2a-sdk 1.1.5,
     google-genai 2.25.0, Python 3.11.

   Syllabus coverage (the thirty sections of the study plan, plus A2A):
      1 ADK fundamentals ................ M1
      2 Agents ........................... M2.1, M2.4, M2.5
      3 Models .......................... M3
      4 Tools ........................... M4.1–4.2, M4.4–4.8
      5 Agent-tool interaction ........... M4.3
      6 Sessions ........................ M5.1–5.3
      7 Memory .......................... M5.4
      8 Context management ............... M5.5–5.6
      9 Workflow agents .................. M2.3
     10 Multi-agent architecture ......... M2.6
     11 Callbacks ....................... M6.1–6.2
     12 Artifacts ....................... M6.3
     13 Structured output ............... M6.4
     14 Prompting and instructions ....... M2.2
     15 MCP ............................. M8.1–8.2
     16 RAG with ADK .................... M7.1
     17 Agentic RAG ..................... M7.2
     18 Authentication and security ...... M4.8, M9.1
     19 Guardrails and responsible AI .... M9.2
     20 Human in the loop ............... M9.3
     21 Error handling .................. M10.3
     22 Streaming ....................... M10.2
     23 Async programming ............... M10.1
     24 Observability ................... M11.1
     25 Evaluation ...................... M11.2
     26 Testing ......................... M11.3
     27 Deployment ...................... M12.1
     28 Agent Engine .................... M12.2 (deploy), M12.3 (invoke)
     29 Gemini + ADK .................... M12.4
     30 Production architecture .......... M12.5
        A2A protocol .................... M8.3–8.4
   ========================================================================= */
(function () {
  "use strict";

  EC.defineCourse({
    id: "adk",
    title: "Google ADK",
    subtitle: "Agents, tools and the runtime that ships them",
    short: "ADK",
    tagline: "The Agent Development Kit from the four objects it is built on to a production architecture — every API introspected, every event trace executed.",

    blurb: "Google's Agent Development Kit, taken apart: agents, models and tools; the state, memory and context triangle; callbacks, artifacts and structured output; RAG and agentic RAG; MCP and A2A; guardrails, human approval, streaming, observability, evaluation and deployment to Agent Engine.",

    published: ["1.1", "1.2", "1.3", "1.4", "1.5", "2.1", "2.2", "2.3", "2.4", "2.5", "2.6", "3.1", "3.2", "4.1", "4.2", "4.3", "4.4", "4.5", "4.6", "4.7", "4.8", "5.1", "5.2", "5.3", "5.4", "5.5", "5.6", "6.1", "6.2", "6.3", "6.4", "7.1", "7.2", "8.1", "8.2", "8.3", "8.4", "12.2", "12.3"],

    modules: [

      /* ================================================================
         PHASE 1 · THE FRAMEWORK
         ================================================================ */
      {
        id: "foundations",
        short: "A1",
        dir: "01_foundations",
        phase: "Phase 1 · The framework",
        title: "ADK Fundamentals",
        blurb: "What the Agent Development Kit is and what problem it solves, how it compares with LangChain, LangGraph and Agent Engine, the project layout and the dev UI, and the four objects — Agent, Runner, Session, Event — that everything else is assembled from.",
        outcome: "You can install ADK, scaffold an agent, run it, and explain what happened in terms of the framework's own objects.",
        lessons: [
          { id: "1.1", title: "What ADK Is, and Why It Exists", difficulty: "foundation", minutes: 30, tier: "must",
            summary: "An agent runtime rather than a prompt library: the problem ADK solves, the pieces it ships, and the design decisions visible in its API.",
            keywords: ["adk", "agent development kit", "google", "runtime", "why adk", "architecture", "gemini"] },
          { id: "1.2", title: "ADK Against LangChain, LangGraph and Agent Engine", difficulty: "foundation", minutes: 28, tier: "must",
            summary: "Four things that are often compared and only two of which are alternatives — with the axis each one actually competes on.",
            keywords: ["langchain", "langgraph", "agent engine", "comparison", "vertex ai", "framework choice"] },
          { id: "1.3", title: "Installation, Project Layout and the Dev UI", difficulty: "foundation", minutes: 28, tier: "must",
            summary: "pip install google-adk, the agent package layout the CLI expects, and adk web, adk run, adk api_server and adk deploy.",
            keywords: ["install", "adk web", "adk run", "project structure", "agent.py", ".env", "cli"] },
          { id: "1.4", title: "The Four Objects: Agent, Runner, Session, Event", difficulty: "foundation", minutes: 34, tier: "must",
            summary: "The agent decides, the runner executes, the session remembers and the event is the unit of record — with each one's fields read off the installed classes.",
            keywords: ["agent", "runner", "session", "event", "eventactions", "app", "services"] },
          { id: "1.5", title: "One Invocation, Traced End to End", difficulty: "core", minutes: 32, tier: "must",
            summary: "A single question through a tool-using agent, with every event, every state delta and exactly what the model was sent on each call.",
            keywords: ["invocation", "run_async", "event loop", "function call", "trace", "invocation_id"] }
        ]
      },

      /* ================================================================
         PHASE 2 · AGENTS AND MODELS
         ================================================================ */
      {
        id: "agents",
        short: "A2",
        dir: "02_agents",
        phase: "Phase 2 · Agents and models",
        title: "Agents",
        blurb: "The LlmAgent's configuration surface field by field, instructions as the contract, the three workflow agents, custom agents and the workflow graph, delegation and transfer, and the multi-agent architectures built from them.",
        outcome: "You can choose between an LLM agent, a workflow agent and a custom one, and wire several into a system that routes work correctly.",
        lessons: [
          { id: "2.1", title: "LlmAgent: The Configuration Surface", difficulty: "core", minutes: 36, tier: "must",
            summary: "Every field on LlmAgent — model, instruction, tools, schemas, output_key, transfer flags, planner, callbacks — and what each one changes at run time.",
            keywords: ["llmagent", "agent", "output_key", "input_schema", "output_schema", "planner", "include_contents"] },
          { id: "2.2", title: "Instructions and Prompting", difficulty: "core", minutes: 32, tier: "must",
            summary: "instruction, global_instruction and static_instruction; state templating; dynamic instruction providers; tool descriptions as prompt surface; few-shot examples.",
            keywords: ["instruction", "global_instruction", "static_instruction", "prompt", "templating", "few-shot", "description"] },
          { id: "2.3", title: "Sequential, Parallel and Loop Agents", difficulty: "core", minutes: 36, tier: "must",
            summary: "The three workflow agents, what each does to the invocation, how state passes between steps, and how a loop terminates.",
            keywords: ["sequentialagent", "parallelagent", "loopagent", "workflow", "exit_loop", "escalate", "branch"] },
          { id: "2.4", title: "Custom Agents and the Workflow Graph", difficulty: "advanced", minutes: 36, tier: "should",
            summary: "Subclassing BaseAgent for control the workflow agents cannot express, and the 2.x Workflow, Node and Edge graph API beside it.",
            keywords: ["baseagent", "_run_async_impl", "custom agent", "workflow", "node", "edge", "graph"] },
          { id: "2.5", title: "Hierarchy, Delegation and Transfer", difficulty: "core", minutes: 34, tier: "must",
            summary: "parent_agent and sub_agents, the transfer_to_agent tool, the two disallow flags, and how an LLM decides to hand the conversation on.",
            keywords: ["sub_agents", "transfer_to_agent", "delegation", "hierarchy", "disallow_transfer", "routing"] },
          { id: "2.6", title: "Multi-Agent Architectures", difficulty: "advanced", minutes: 38, tier: "must",
            summary: "Coordinator, supervisor, planner-executor, specialists and hierarchies — each as a concrete ADK wiring, with the failure mode each one has.",
            keywords: ["multi-agent", "coordinator", "supervisor", "planner", "executor", "specialist", "architecture"] }
        ]
      },
      {
        id: "models",
        short: "A3",
        dir: "03_models",
        phase: "Phase 2 · Agents and models",
        title: "Models",
        blurb: "The Gemini models behind an agent, the generation config that shapes every call, multimodal input, and the other providers ADK can drive through LiteLLM and the registry.",
        outcome: "You can pick a model and a generation config for a given agent and justify both.",
        lessons: [
          { id: "3.1", title: "Gemini, Generation Config and Model Choice", difficulty: "core", minutes: 32, tier: "must",
            summary: "Model ids and what they cost you, temperature, token limits, safety settings and thinking config — set where ADK actually reads them.",
            keywords: ["gemini", "model", "temperature", "max_output_tokens", "generate_content_config", "thinking", "safety"] },
          { id: "3.2", title: "Multimodal, Other Providers and Fallbacks", difficulty: "core", minutes: 30, tier: "should",
            summary: "Images, audio, documents and video as input; Claude, Ollama and anything LiteLLM drives; the LLM registry and the fallback model.",
            keywords: ["multimodal", "litellm", "claude", "ollama", "llmregistry", "fallbackmodel", "vision"] }
        ]
      },

      /* ================================================================
         PHASE 3 · TOOLS
         ================================================================ */
      {
        id: "tools",
        short: "A4",
        dir: "04_tools",
        phase: "Phase 3 · Tools",
        title: "Tools",
        blurb: "The largest surface in ADK: function tools and the declaration the model actually sees, ToolContext, the agent-tool loop traced call by call, the built-in tools, agents as tools, long-running and confirmed tools, OpenAPI and third-party toolsets, errors and authentication.",
        outcome: "You can give an agent a tool the model calls correctly, handle its failures, and know exactly what the model was told about it.",
        lessons: [
          { id: "4.1", title: "Function Tools and the Declaration the Model Sees", difficulty: "core", minutes: 36, tier: "must",
            summary: "A Python function becomes a tool: how the signature, type hints and docstring become the JSON schema sent to the model, and what to do about the parts that do not translate.",
            keywords: ["functiontool", "tool", "declaration", "schema", "docstring", "type hints", "automatic function calling"] },
          { id: "4.2", title: "ToolContext: State, Artifacts, Actions and Auth", difficulty: "core", minutes: 34, tier: "must",
            summary: "The object a tool receives beside its arguments — session state, artifacts, memory search, actions, credentials — and what each one lets a tool change.",
            keywords: ["toolcontext", "state", "actions", "artifacts", "credentials", "skip_summarization", "escalate"] },
          { id: "4.3", title: "The Agent–Tool Loop, Traced", difficulty: "core", minutes: 34, tier: "must",
            summary: "User to agent to model to tool selection to execution to result to model to answer — every hop shown as a real event, including parallel calls.",
            keywords: ["function calling", "tool selection", "tool execution", "loop", "parallel calls", "events", "trace"] },
          { id: "4.4", title: "Built-in Tools: Search, Code Execution and Vertex AI Search", difficulty: "core", minutes: 32, tier: "must",
            summary: "google_search, code execution, url_context, Vertex AI Search and the enterprise tools — what runs server-side, and the restrictions that come with them.",
            keywords: ["google_search", "code execution", "built-in tools", "vertexaisearchtool", "url_context", "grounding"] },
          { id: "4.5", title: "Agents as Tools, Long-Running Tools and Confirmation", difficulty: "advanced", minutes: 34, tier: "must",
            summary: "AgentTool for calling an agent without handing over the conversation, LongRunningFunctionTool for work that outlives a turn, and require_confirmation for the actions that need a human.",
            keywords: ["agenttool", "longrunningfunctiontool", "require_confirmation", "tool_confirmation", "sub-agent", "async work"] },
          { id: "4.6", title: "OpenAPI, Third-Party and Toolsets", difficulty: "advanced", minutes: 32, tier: "should",
            summary: "A whole REST API as tools from its OpenAPI spec, LangChain and CrewAI tools, BigQuery and the Google API toolsets, and the BaseToolset contract behind them.",
            keywords: ["openapitoolset", "toolset", "langchain tool", "crewai", "bigquery", "apihub", "rest"] },
          { id: "4.7", title: "Tool Errors, Retries and Restrictions", difficulty: "core", minutes: 30, tier: "must",
            summary: "What an exception in a tool does to the invocation, returning errors as data, the retry plugins, and restricting which tools an agent may use when.",
            keywords: ["tool error", "retry", "on_tool_error_callback", "reflectandretry", "restriction", "failure"] },
          { id: "4.8", title: "Tool Authentication", difficulty: "advanced", minutes: 34, tier: "should",
            summary: "AuthConfig, AuthCredential and the credential service; API keys, service accounts and the OAuth flow that pauses an agent mid-tool to ask the user.",
            keywords: ["authconfig", "authcredential", "oauth", "api key", "service account", "credential service", "request_credential"] }
        ]
      },

      /* ================================================================
         PHASE 4 · STATE, MEMORY AND CONTEXT
         ================================================================ */
      {
        id: "context",
        short: "A5",
        dir: "05_context",
        phase: "Phase 4 · State, memory and context",
        title: "Sessions, State, Memory and Context",
        blurb: "Where an agent's knowledge lives: the session and its events, state with its three scopes, the session services that persist them, memory as recall across sessions, the four context objects, and what to do when the conversation outgrows the window.",
        outcome: "You can decide, for any piece of information, whether it belongs in state, in memory, in an artifact or nowhere.",
        lessons: [
          { id: "5.1", title: "Sessions: App, User, Session, Event", difficulty: "core", minutes: 32, tier: "must",
            summary: "The container hierarchy, what a session actually stores, the event list as the transcript, and the lifecycle from create to delete.",
            keywords: ["session", "app_name", "user_id", "session_id", "events", "lifecycle", "sessionservice"] },
          { id: "5.2", title: "State: Scopes, Prefixes and the Event Delta", difficulty: "core", minutes: 34, tier: "must",
            summary: "app:, user:, temp: and the unprefixed session scope; why state changes travel as event deltas; and the three ways to write it.",
            keywords: ["state", "state_delta", "app:", "user:", "temp:", "output_key", "scopes"] },
          { id: "5.3", title: "Session Services: In-Memory, Database and Vertex AI", difficulty: "core", minutes: 30, tier: "must",
            summary: "The three implementations, what each one costs, and what changes about your code when you move from memory to a database.",
            keywords: ["inmemorysessionservice", "databasesessionservice", "vertexaisessionservice", "persistence", "sqlite", "postgres"] },
          { id: "5.4", title: "Memory: Recall Across Sessions", difficulty: "advanced", minutes: 34, tier: "must",
            summary: "State is this conversation; memory is everything the user ever said. The memory services, load_memory and preload_memory, and when to use which.",
            keywords: ["memory", "memoryservice", "load_memory", "preload_memory", "memory bank", "rag memory", "long-term"] },
          { id: "5.5", title: "The Context Objects", difficulty: "core", minutes: 30, tier: "must",
            summary: "ReadonlyContext, CallbackContext, ToolContext and InvocationContext — which one you get where, and what each one is allowed to do.",
            keywords: ["context", "readonlycontext", "callbackcontext", "toolcontext", "invocationcontext", "propagation"] },
          { id: "5.6", title: "Context Window: Compaction, Caching and Long Conversations", difficulty: "advanced", minutes: 32, tier: "should",
            summary: "What ADK sends the model on turn fifty, the events compaction config, context caching, include_contents and the strategies for a conversation that will not fit.",
            keywords: ["context window", "compaction", "context cache", "include_contents", "summarisation", "tokens", "long conversation"] }
        ]
      },

      /* ================================================================
         PHASE 5 · CONTROL AND STRUCTURE
         ================================================================ */
      {
        id: "control",
        short: "A6",
        dir: "06_control",
        phase: "Phase 5 · Control and structure",
        title: "Callbacks, Plugins, Artifacts and Structured Output",
        blurb: "The hooks that let you inspect, change or block what an agent does; plugins that apply them app-wide; artifacts for the files an agent produces or reads; and schemas that make an agent's output a typed object rather than prose.",
        outcome: "You can intercept any step of an agent's run, return files from it, and get validated structured data out of it.",
        lessons: [
          { id: "6.1", title: "Callbacks: The Eight Hooks", difficulty: "core", minutes: 36, tier: "must",
            summary: "before and after agent, model and tool, plus the two error hooks — when each fires, what it receives, and what returning a value does.",
            keywords: ["callbacks", "before_model_callback", "after_tool_callback", "on_model_error_callback", "guardrail", "short-circuit"] },
          { id: "6.2", title: "Plugins: Callbacks for the Whole App", difficulty: "advanced", minutes: 30, tier: "should",
            summary: "BasePlugin's hooks run for every agent and tool in an App — logging, retries, metrics and policy in one place instead of on every agent.",
            keywords: ["plugin", "baseplugin", "loggingplugin", "reflectandretry", "app", "cross-cutting"] },
          { id: "6.3", title: "Artifacts: Files, Versions and the Artifact Service", difficulty: "core", minutes: 30, tier: "should",
            summary: "Saving and loading binary data by filename with automatic versioning, the user: namespace, and the three artifact services.",
            keywords: ["artifacts", "save_artifact", "load_artifact", "versions", "gcs", "files", "artifact_delta"] },
          { id: "6.4", title: "Structured Output: Schemas and Validation", difficulty: "core", minutes: 32, tier: "must",
            summary: "output_schema and input_schema with Pydantic models, what they cost (no tools, no transfer), and the alternatives when you need both.",
            keywords: ["output_schema", "input_schema", "pydantic", "structured output", "json", "validation", "output_key"] }
        ]
      },

      /* ================================================================
         PHASE 6 · RETRIEVAL AND INTEROPERABILITY
         ================================================================ */
      {
        id: "rag",
        short: "A7",
        dir: "07_rag",
        phase: "Phase 6 · Retrieval and interoperability",
        title: "RAG and Agentic RAG",
        blurb: "Retrieval as a tool rather than a pipeline stage: ingestion, chunking, embeddings and vector search behind a retrieval tool; grounding with Google Search and Vertex AI Search; then the agentic patterns — query planning, multi-step retrieval, correction and self-reflection.",
        outcome: "You can build an agent that retrieves, cites and checks its own answer instead of one that pastes chunks into a prompt.",
        lessons: [
          { id: "7.1", title: "RAG in ADK: Ingestion to Grounded Answer", difficulty: "advanced", minutes: 36, tier: "must",
            summary: "The classic pipeline expressed as ADK components, a retrieval tool built and run, and grounding metadata that turns an answer into a cited one.",
            keywords: ["rag", "retrieval", "embeddings", "chunking", "vector search", "grounding", "citations"] },
          { id: "7.2", title: "Agentic RAG: Planning, Correction and Self-Reflection", difficulty: "advanced", minutes: 36, tier: "should",
            summary: "Query rewriting, multiple retrieval calls, search-reason-search loops, corrective RAG and retrieval validation — each as an agent wiring.",
            keywords: ["agentic rag", "query rewriting", "corrective rag", "self-reflection", "multi-step", "validation", "loopagent"] }
        ]
      },
      {
        id: "interop",
        short: "A8",
        dir: "08_interop",
        phase: "Phase 6 · Retrieval and interoperability",
        title: "MCP and A2A",
        blurb: "The two protocols an agent speaks to the outside world: the Model Context Protocol for tools, resources and prompts from any server, and the Agent2Agent protocol for talking to agents you did not write and did not deploy.",
        outcome: "You can consume an MCP server's tools from an agent, expose your own agent over A2A, and say which protocol a given integration needs.",
        lessons: [
          { id: "8.1", title: "MCP: The Protocol and Its Architecture", difficulty: "advanced", minutes: 34, tier: "must",
            summary: "Hosts, clients and servers; tools, resources and prompts; stdio and HTTP transports; the JSON-RPC messages underneath, and the security model.",
            keywords: ["mcp", "model context protocol", "server", "client", "stdio", "resources", "prompts", "json-rpc"] },
          { id: "8.2", title: "ADK as MCP Client; ADK as MCP Server", difficulty: "advanced", minutes: 34, tier: "must",
            summary: "McpToolset pointed at a server, tool filtering and auth, then the other direction — exposing ADK tools to Claude or any MCP host.",
            keywords: ["mcptoolset", "stdio", "streamable http", "tool filter", "mcp server", "expose tools"] },
          { id: "8.3", title: "A2A: The Agent-to-Agent Protocol", difficulty: "advanced", minutes: 36, tier: "must",
            summary: "Agent cards, tasks and their lifecycle, messages, parts and artifacts, streaming and push notifications — the protocol read off the a2a-sdk types.",
            keywords: ["a2a", "agent card", "task", "artifact", "jsonrpc", "agent2agent", "discovery", "streaming"] },
          { id: "8.4", title: "A2A in ADK: Serving and Consuming Remote Agents", difficulty: "advanced", minutes: 34, tier: "must",
            summary: "to_a2a() to publish an agent with a generated card, RemoteA2aAgent to use someone else's as a sub-agent, and what crosses the wire between them.",
            keywords: ["to_a2a", "remotea2aagent", "agent card", "a2a server", "remote agent", "interop", "uvicorn"] }
        ]
      },

      /* ================================================================
         PHASE 7 · SAFETY AND THE RUNTIME
         ================================================================ */
      {
        id: "safety",
        short: "A9",
        dir: "09_safety",
        phase: "Phase 7 · Safety and the runtime",
        title: "Security, Guardrails and Human Approval",
        blurb: "Everything between an agent and an incident: identity and least privilege, input and output validation, prompt-injection and jailbreak defence, PII handling, and the approval step that keeps a human on the sensitive actions.",
        outcome: "You can state what your agent is allowed to do, enforce it in code, and stop it before it does the one thing it must not.",
        lessons: [
          { id: "9.1", title: "Authentication, Secrets and Least Privilege", difficulty: "advanced", minutes: 32, tier: "must",
            summary: "Who the agent is, who the user is, and which of the two a tool acts as — with API keys, service accounts, IAM and the credential service.",
            keywords: ["authentication", "iam", "service account", "secrets", "least privilege", "api key", "identity"] },
          { id: "9.2", title: "Guardrails and Responsible AI", difficulty: "advanced", minutes: 36, tier: "must",
            summary: "Input and output validation as callbacks, prompt injection and jailbreaks, PII, tool allow-lists, safety settings and a policy you can point at.",
            keywords: ["guardrails", "prompt injection", "jailbreak", "pii", "safety settings", "validation", "responsible ai"] },
          { id: "9.3", title: "Human in the Loop", difficulty: "advanced", minutes: 32, tier: "must",
            summary: "Pausing an agent for approval: require_confirmation, request_confirmation, long-running tools, resumability, and the approval workflow around them.",
            keywords: ["human in the loop", "approval", "confirmation", "resumability", "pause", "interrupt", "long running"] }
        ]
      },
      {
        id: "runtime",
        short: "A10",
        dir: "10_runtime",
        phase: "Phase 7 · Safety and the runtime",
        title: "Async, Streaming and Failure",
        blurb: "How the runtime actually executes: the async event loop the whole framework is built on, streaming in its three modes including live audio and video, and what happens when a model, a tool or an agent fails mid-invocation.",
        outcome: "You can stream an agent's output to a user, run tools concurrently, and make a failure recoverable rather than fatal.",
        lessons: [
          { id: "10.1", title: "Async, the Event Loop and Concurrency", difficulty: "core", minutes: 32, tier: "must",
            summary: "Why run_async is an async generator, what runs concurrently and what does not, sync wrappers, and the rules for writing an async tool.",
            keywords: ["async", "await", "asyncio", "generator", "concurrency", "parallelagent", "run_async"] },
          { id: "10.2", title: "Streaming: SSE, Partial Events and Bidi", difficulty: "advanced", minutes: 34, tier: "must",
            summary: "StreamingMode.NONE, SSE and BIDI; partial events and turn_complete; token-by-token output to a browser; and the live audio and video path.",
            keywords: ["streaming", "sse", "bidi", "partial", "turn_complete", "live", "audio", "run_live"] },
          { id: "10.3", title: "Errors, Retries and Resumability", difficulty: "advanced", minutes: 32, tier: "must",
            summary: "Model errors, tool errors and agent errors; max_llm_calls and timeouts; the retry config; and resuming an invocation that was interrupted.",
            keywords: ["error handling", "retry", "timeout", "max_llm_calls", "resumability", "rewind", "failure"] }
        ]
      },

      /* ================================================================
         PHASE 8 · PRODUCTION
         ================================================================ */
      {
        id: "ops",
        short: "A11",
        dir: "11_ops",
        phase: "Phase 8 · Production",
        title: "Observability, Evaluation and Testing",
        blurb: "The three ways you find out whether an agent works: traces and metrics from a running one, evaluation against a golden set of trajectories, and tests that fail in CI before anything ships.",
        outcome: "You can debug an agent from its trace, measure it against a dataset, and keep a regression from reaching production.",
        lessons: [
          { id: "11.1", title: "Observability: Traces, Logs and Metrics", difficulty: "advanced", minutes: 34, tier: "must",
            summary: "The OpenTelemetry spans ADK emits, token usage per call, what to log and what never to, and reading a trace of a multi-agent run.",
            keywords: ["observability", "opentelemetry", "tracing", "spans", "logging", "token usage", "latency", "metrics"] },
          { id: "11.2", title: "Evaluation: Trajectories and Golden Sets", difficulty: "advanced", minutes: 34, tier: "must",
            summary: "AgentEvaluator, evalset files, tool-trajectory scoring against response scoring, the metrics that matter, and where human judgement is unavoidable.",
            keywords: ["evaluation", "agentevaluator", "evalset", "trajectory", "groundedness", "adk eval", "golden dataset"] },
          { id: "11.3", title: "Testing Agents", difficulty: "core", minutes: 32, tier: "must",
            summary: "Unit-testing tools as functions, a scripted model for deterministic agent tests, integration tests with real services, and what to assert on.",
            keywords: ["testing", "pytest", "mock", "fake model", "integration test", "regression", "deterministic"] }
        ]
      },
      {
        id: "production",
        short: "A12",
        dir: "12_production",
        phase: "Phase 8 · Production",
        title: "Deployment and Production Architecture",
        blurb: "From a local dev UI to a running service: containers and Cloud Run, deploying to Vertex AI Agent Engine and calling the deployed agent, the Gemini capabilities worth building on, and the reference architecture that puts every previous module in one picture.",
        outcome: "You can deploy an agent to Agent Engine, invoke it from an application, choose between Cloud Run and Agent Engine with reasons, and draw the production architecture it belongs in.",
        lessons: [
          { id: "12.1", title: "Deployment: Local, Container, Cloud Run, Agent Engine", difficulty: "advanced", minutes: 34, tier: "must",
            summary: "The four deployment targets, what adk deploy generates, configuration and secrets per environment, and how sessions survive a restart.",
            keywords: ["deployment", "cloud run", "docker", "adk deploy", "agent engine", "api_server", "scaling"] },
          { id: "12.2", title: "Vertex AI Agent Engine: Deploying an Agent", difficulty: "advanced", minutes: 36, tier: "must",
            summary: "The managed runtime end to end: what AdkApp wraps, agent_engines.create and adk deploy agent_engine, requirements and extra packages, service accounts, scaling and what it gives you for free.",
            keywords: ["agent engine", "vertex ai", "adkapp", "agent_engines.create", "adk deploy", "reasoning engine", "managed runtime", "deployment"] },
          { id: "12.3", title: "Invoking a Deployed Agent", difficulty: "advanced", minutes: 34, tier: "must",
            summary: "Calling the deployed engine: the Python SDK, stream_query and async_stream_query, remote sessions, the REST surface, IAM and auth, and calling it from another agent.",
            keywords: ["stream_query", "invoke", "agent_engines.get", "resource name", "rest", "streamQuery", "iam", "remote sessions", "client"] },
          { id: "12.4", title: "Gemini + ADK: The Capabilities That Matter", difficulty: "core", minutes: 30, tier: "should",
            summary: "Function calling, structured output, long context, multimodal understanding, grounding, code execution and thinking — from the agent's point of view.",
            keywords: ["gemini", "function calling", "long context", "multimodal", "grounding", "code execution", "thinking"] },
          { id: "12.5", title: "Production Architecture, End to End", difficulty: "expert", minutes: 40, tier: "must",
            summary: "Client, API layer, root agent, specialists, retrieval, tools, guardrails, approval, observability and evaluation — one architecture with every choice named.",
            keywords: ["architecture", "production", "reference architecture", "scaling", "cost", "guardrails", "design"] }
        ]
      }
    ]
  });
})();
