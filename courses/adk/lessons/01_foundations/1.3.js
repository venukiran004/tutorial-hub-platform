/* ============================================================================
   LESSON 1.3 — Installation, Project Layout and the Dev UI
   CLI output captured from google-adk 2.9.2 on Windows, Python 3.11.
   ========================================================================= */
EC.receiveLesson({
  id: "1.3",

  lede: "**ADK has a convention: a directory is an agent if it contains an `agent.py` that defines `root_agent`, and an `__init__.py` that imports it.** Every command in the CLI — `adk web`, `adk run`, `adk api_server`, `adk eval`, `adk deploy` — takes a directory of such packages and finds the agents by that rule. Learn the rule and the tooling works; ignore it and `adk web` shows an empty dropdown for reasons that are never stated. This lesson is the install, the layout the CLI expects, what `adk create` generates, the eleven CLI commands, and what the dev UI gives you that a `print()` loop does not.",

  objectives: [
    "Install ADK and verify the version, and know which extras exist and what they unlock",
    "Lay out an agent package so the CLI can discover it, including the .env file",
    "Use adk create, adk run, adk web and adk api_server, and say what each is for",
    "Name the deploy targets and the eval and telemetry commands",
    "Describe what the dev UI shows that a print loop does not"
  ],

  prerequisites: ["1.1"],

  blocks: [

    { t: "h2", n: "01", text: "Install", id: "install" },

    { t: "code", lang: "bash", title: "The package and its extras",
      code: `python -m venv .venv && source .venv/bin/activate     # Windows: .venv\\Scripts\\activate
pip install google-adk                                # the framework
pip install "google-adk[extensions]"                  # LiteLLM, CrewAI tools, and other optional adapters
pip install mcp                                       # needed for McpToolset (lesson 8.2)

python -c "import importlib.metadata as m; print(m.version('google-adk'))"`,
      caption: "The base package is deliberately lean. Optional integrations raise a clear ImportError naming the extra to install rather than failing obscurely — `LiteLlm` requires `google-adk[extensions]`, `McpToolset` requires `mcp`." },

    { t: "out", text: `2.9.2` },

    { t: "p", text: "Java has a separate distribution; this course is the Python one. The version matters more than usual: ADK 2.x reorganised parts of the API that 1.x tutorials still describe — an `App` object, a unified `Context`, plugins, and a `Workflow` graph API. When a snippet from a blog post does not import, check which major version it was written for." },

    { t: "h2", n: "02", text: "The layout the CLI expects", id: "layout" },

    { t: "diagram", kind: "tree", title: "What `adk web .` scans for",
      caption: "Every immediate sub-directory of the agents directory that is an importable package with a root_agent becomes an entry in the dev UI's dropdown. Two agents side by side is the normal arrangement.",
      root: { label: "agents/", sub: "you point the CLI here", tone: "accent", children: [
        { label: "my_app/", sub: "one agent = one package", tone: "good", children: [
          { label: "__init__.py", sub: "from . import agent", mono: true },
          { label: "agent.py", sub: "defines root_agent", tone: "warn", mono: true },
          { label: ".env", sub: "keys and project config", mono: true }
        ] },
        { label: "other_app/", sub: "appears in the same dropdown", tone: "good" }
      ] } },

    { t: "code", lang: "bash", title: "adk create, and what it writes",
      code: `adk create --model gemini-2.5-flash --api_key YOUR_KEY my_app`,
      caption: "The generator asks nothing else; the flags it accepts are --model, --api_key, --project and --region (the last two for the Vertex AI backend). It prints a warning that the key lands in .env." },

    { t: "out", text: `my_app/.env
my_app/.gitignore
my_app/agent.py
my_app/__init__.py

⚠️  WARNING: Secrets (like GOOGLE_API_KEY) are stored in .env.` },

    { t: "code", lang: "python", title: "my_app/agent.py — the generated agent, verbatim",
      code: `from google.adk.agents.llm_agent import Agent

root_agent = Agent(
    model='gemini-2.5-flash',
    name='root_agent',
    description='A helpful assistant for user questions.',
    instruction='Answer user questions to the best of your knowledge',
)`,
      caption: "`Agent` is an alias of `LlmAgent`. The name `root_agent` is the contract: the CLI imports the package and looks for exactly that symbol. `__init__.py` contains one line, `from . import agent`, which is what makes the package importable by name." },

    { t: "table", head: ["File", "Purpose", "Note"],
      rows: [
        ["`agent.py`", "Defines `root_agent`", "May import sub-agents and tools from anywhere; only the symbol name is fixed"],
        ["`__init__.py`", "`from . import agent`", "Without it the directory is not a package and the CLI skips it silently"],
        ["`.env`", "`GOOGLE_API_KEY`, or the Vertex AI project and location", "Loaded per agent directory; keep it out of git"],
        ["`.gitignore`", "Generated with `.env` in it", "The one piece of security the scaffold gives you for free"]
      ] },

    { t: "callout", kind: "trap", title: "Two backends, two sets of environment variables",
      body: "`GOOGLE_GENAI_USE_VERTEXAI=FALSE` with a `GOOGLE_API_KEY` uses the Gemini API directly — fastest to start. `GOOGLE_GENAI_USE_VERTEXAI=TRUE` with `GOOGLE_CLOUD_PROJECT` and `GOOGLE_CLOUD_LOCATION` uses Vertex AI with application-default credentials, which is what you need for IAM, VPC controls and the Vertex-backed services. The same agent code runs on both; only the .env changes. A missing variable here produces an authentication error at the first model call, not at import." },

    { t: "h2", n: "03", text: "The CLI", id: "cli" },

    { t: "code", lang: "bash", title: "adk --help, on 2.9.2",
      code: `Commands:
  api_server   Starts a FastAPI server for agents.
  conformance  Conformance testing tools for ADK.
  create       Creates a new app in the current folder with prepopulated...
  deploy       Deploys agent to hosted environments.
  eval         Evaluates an agent given the eval sets.
  eval_set     Manage Eval Sets.
  migrate      ADK migration commands.
  optimize     Optimizes the root agent instructions using the GEPA...
  run          Runs an agent.
  telemetry    Manage telemetry settings.
  test         Runs pytest on agent test JSON files under the specified...
  web          Starts a FastAPI server with Web UI for agents.`,
      caption: "Eleven commands. Four are day-to-day (create, run, web, deploy), three are for quality (eval, eval_set, test), and the rest are occasional." },

    { t: "diagram", kind: "compare", title: "The four you will type most",
      caption: "run and web are for you; api_server is for your application; deploy is for production. All four take the agents directory as their argument.",
      columns: [
        { title: "adk run my_app", tone: "accent", items: ["a terminal conversation", "fastest feedback loop", "no UI, no traces"] },
        { title: "adk web .", tone: "good", items: ["local web UI on :8000", "events, state and traces per turn", "--reload_agents, --a2a, --trace_to_cloud"] },
        { title: "adk api_server .", tone: "warn", items: ["the same FastAPI server without the UI", "REST endpoints for sessions and runs", "what you put behind your own front end"] },
        { title: "adk deploy …", tone: "violet", items: ["agent_engine · cloud_run · gke · docker", "generates the container and config", "lesson 12.1"] }
      ] },

    { t: "code", lang: "bash", title: "Useful flags on adk web",
      code: `adk web .                       # serve every agent package under the current directory
adk web . --port 8080           # somewhere else
adk web . --reload_agents       # re-import the agent on file change: the real dev loop
adk web . --a2a                 # also expose each agent over the A2A protocol (lesson 8.4)
adk web . --trace_to_cloud      # send traces to Cloud Trace instead of only the UI
adk web . --eval_storage_uri …  # keep evalsets somewhere other than the local files`,
      caption: "Captured from `adk web --help`. `--reload_agents` is the one worth remembering: without it, every edit needs a restart." },

    { t: "h2", n: "04", text: "What the dev UI is for", id: "devui" },

    { t: "p", text: "`adk web` is not a chat demo with a logo. It is the local equivalent of the observability you will want in production, and it is where most debugging actually happens:" },

    { t: "diagram", kind: "steps", title: "What each pane answers",
      caption: "The same information is available programmatically — the event stream is the event stream — but having it beside the conversation is what makes the difference between guessing and reading.",
      items: [
        { label: "The conversation", desc: "what the user sees, including streamed partial output", tone: "accent" },
        { label: "Events", desc: "every model call, tool call, tool result and state delta of the turn — the objects from lesson 1.4", tone: "good" },
        { label: "State", desc: "the session's state after the turn, with the app:, user: and temp: scopes visible", tone: "warn" },
        { label: "Trace", desc: "a span per model and tool call with durations — where the latency went", tone: "violet" },
        { label: "Eval", desc: "save a conversation as an eval case and re-run it later (lesson 11.2)", tone: "crit" }
      ] },

    { t: "callout", kind: "insight", title: "Save the failure as a test while you are looking at it",
      body: "The first time an agent calls the wrong tool, the dev UI lets you turn that exact conversation into an eval case. That habit — every bug becomes a case in the evalset before it is fixed — is what stops agent development from being an endless manual re-test, and it is the same discipline as writing a failing test first." },

    { t: "h2", n: "05", text: "The programmatic equivalent", id: "programmatic" },

    { t: "p", text: "The CLI is a convenience over the API. Nothing in it is required: an agent is an object, and a runner executes it. The course uses the programmatic form throughout because it is what a test or a service uses." },

    { t: "code", lang: "python", title: "No CLI, no conventions, same result",
      code: `import asyncio
from google.adk.runners import InMemoryRunner
from google.genai import types
from my_app.agent import root_agent          # any module, any symbol name

async def ask(text: str) -> str:
    runner = InMemoryRunner(root_agent, app_name="my_app")
    await runner.session_service.create_session(app_name="my_app", user_id="u1", session_id="s1")
    msg = types.Content(role="user", parts=[types.Part(text=text)])
    final = ""
    async for event in runner.run_async(user_id="u1", session_id="s1", new_message=msg):
        if event.is_final_response() and event.content and event.content.parts:
            final = event.content.parts[0].text or ""
    return final

print(asyncio.run(ask("hello")))`,
      caption: "The `root_agent` name and the package layout matter only to the CLI. In your own service you import whatever you like — which is also why the testing lesson can swap the model for a scripted one without touching the agent." },

    { t: "exercise", kind: "practice", title: "Scaffold, inspect, run", difficulty: "foundation", minutes: 15,
      body: [{ t: "p", text: "Create an agent with `adk create`, then: (a) list the four files it generated and say what each is for; (b) add a second agent package beside it and confirm both appear in `adk web`; (c) delete the `__init__.py` from one and describe what happens; (d) change the agent's `name` field to something other than `root_agent` and say whether the CLI still finds it." }],
      requirements: ["Run the commands", "Four short answers", "Say precisely which symbol name the CLI depends on"],
      hint: "The `name` field and the module-level symbol are different things.",
      solution: { lang: "text", title: "Solution",
        code: `(a) agent.py defines root_agent; __init__.py makes the directory an importable package;
    .env holds the key or the Vertex project; .gitignore keeps .env out of git.
(b) both directories appear in the dropdown — the CLI scans immediate sub-directories.
(c) the directory is no longer a package, so it is skipped — silently, with no error.
(d) yes: the CLI looks for the module-level symbol root_agent, not the agent's name
    field. The name field is what the model and the transfer machinery use (lesson 2.5).`,
        notes: [{ t: "p", text: "The silent skip in (c) is the single most common 'my agent does not show up' cause, and the reason to run `adk create` once even if you then restructure by hand — it gets the convention right the first time." }] } }
  ],

  takeaways: [
    "pip install google-adk; the extensions extra unlocks LiteLLM and CrewAI, and the mcp package is needed for MCP toolsets.",
    "The CLI discovers an agent by convention: a package with __init__.py importing agent.py, which defines a module-level root_agent.",
    "adk create writes agent.py, __init__.py, .env and .gitignore; .env chooses between the Gemini API key and the Vertex AI backend.",
    "adk run is a terminal conversation, adk web is the local UI with events, state and traces, adk api_server is the same server without the UI, adk deploy targets Agent Engine, Cloud Run, GKE or Docker.",
    "--reload_agents makes the dev loop bearable; --a2a exposes agents over the protocol; --trace_to_cloud sends spans to Cloud Trace.",
    "The dev UI's value is the events, state and trace panes beside the conversation — and turning a failure into an eval case on the spot.",
    "None of the conventions are required programmatically: import any agent object and run it with a Runner."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "Your agent directory does not appear in the `adk web` dropdown. What is the most likely cause?",
      options: ["The model name is wrong", "There is no __init__.py, so the directory is not an importable package and is skipped silently", "The .env file is missing", "adk web only shows one agent at a time"],
      answer: 1,
      why: "The CLI scans immediate sub-directories and imports each as a package to look for root_agent. Without __init__.py the import fails and the directory is skipped with no error message. A missing .env produces an authentication failure at the first model call instead, which at least tells you something." },
    { stem: "Which symbol must exist in agent.py for the CLI to find your agent?",
      options: ["An agent whose `name` field is 'root_agent'", "A module-level variable called `root_agent`", "A function called `get_agent()`", "A class called `RootAgent`"],
      answer: 1,
      why: "The convention is the module-level symbol name: the CLI imports the package and reads `root_agent`. The agent's own `name` field is unrelated — it identifies the agent to the model and to the transfer machinery, and can be anything." },
    { stem: "What does `adk api_server` give you that `adk web` does not?",
      options: ["Traces", "Nothing — it is the same server without the browser UI, for putting behind your own front end", "Evaluation", "Deployment"],
      answer: 1,
      why: "Both start a FastAPI server exposing session and run endpoints; web additionally serves the developer UI. api_server is what you point your own application at during development, and it is close to what a deployed container runs." },
    { stem: "You switch a working agent from the Gemini API to the Vertex AI backend. What changes in your code?",
      options: ["The agent class", "The model object", "Nothing in the code — only the environment variables in .env", "The runner"],
      answer: 2,
      why: "GOOGLE_GENAI_USE_VERTEXAI=TRUE plus GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION switch the backend, and authentication moves from an API key to application-default credentials. The agent, tools and runner are identical, which is what makes the same code runnable locally and on Vertex AI." }
  ] },

  interview: { title: "Interview", sub: "Setup questions that reveal whether you have run it", questions: [
    { level: "Core", q: "How does the ADK CLI know what to run?",
      strong: "Convention: each sub-directory of the agents directory is imported as a package and searched for a module-level root_agent.",
      answer: [{ t: "p", text: "You point a command at a directory of agent packages. Each immediate sub-directory must be an importable Python package — an __init__.py that does `from . import agent` — and agent.py must define a module-level symbol called root_agent. The CLI imports each one and lists the ones that have it; anything that fails to import is skipped, which is why a missing __init__.py produces an empty dropdown rather than an error. The .env in each agent directory is loaded for that agent, which is how two agents in one tree can use different projects or keys. None of this applies when you construct a Runner yourself — the convention exists only for the CLI." }] },
    { level: "Core", q: "What is the developer loop for an ADK agent?",
      strong: "adk web with --reload_agents, read the events and trace panes on every turn, save failures as eval cases, then adk eval in CI.",
      answer: [{ t: "p", text: "Run `adk web . --reload_agents` so edits take effect without a restart, and drive the agent from the UI. For each turn I read three panes: events, to see which tools were called with what arguments; state, to check that scopes are right; and trace, to see where the latency went. When the agent does something wrong I save that conversation as an eval case immediately, so the bug is captured before I change anything. The fix is then verified by re-running the evalset rather than by re-typing the conversation, and the same evalset runs in CI with `adk eval`. For unit-level work I skip the UI and drive the agent with a Runner and a scripted model, which is deterministic and fast." }] },
    { level: "Senior", q: "How would you structure a repository with a dozen agents that share tools?",
      strong: "Shared tools as an installable package, one thin agent package per agent for the CLI, and the App wiring separate from agent definitions.",
      answer: [{ t: "p", text: "The CLI's convention only requires that each agent package expose root_agent, so the agent packages stay thin: a few lines that import a shared library and compose it. I would put the tools, prompts and domain code in one installable package — src layout, tested on its own, no ADK conventions in it — and have each agent package import from it. Configuration lives per environment rather than per agent, with the .env files for local development only and real secrets from a secret manager in deployment. If several agents share a service wiring — session service, memory, plugins — that belongs in a factory function returning an App, not copied into each agent.py. The test suite then targets the shared package with plain unit tests plus a small number of agent-level tests with a scripted model, and the evalsets live beside the agents they exercise." }] }
  ] }
});
