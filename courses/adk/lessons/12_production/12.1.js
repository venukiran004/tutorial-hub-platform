/* ============================================================================
   LESSON 12.1 — Deployment: Local, Container, Cloud Run, Agent Engine
   The CLI subcommands and their flags are taken from `adk deploy --help` and
   `adk api_server --help` on google-adk 2.9.2.
   ========================================================================= */
EC.receiveLesson({
  id: "12.1",

  lede: "**The agent does not change when you deploy it; everything around it does.** `adk web` gave you a dev UI with an in-memory store and a single process. Production means a session database, several replicas, a real identity for the service, secrets that are not in a file, and something answering HTTP that you did not write by hand. ADK ships four deployment targets and generates most of that for you — and the interesting part of this lesson is not the commands but the four decisions they encode, because those are what you will be asked about in review.",

  objectives: [
    "Name the four deploy targets and what each generates",
    "Choose between Cloud Run and Agent Engine with reasons on both sides",
    "Configure services, secrets and identity per environment",
    "Deploy with the dev UI, A2A or CORS enabled when you need them",
    "List what must be true before an agent takes real traffic"
  ],

  prerequisites: ["5.3", "1.3"],

  blocks: [

    { t: "h2", n: "01", text: "Four targets", id: "targets" },

    { t: "code", lang: "bash", title: "adk deploy --help",
      code: `Commands:
  agent_engine  Deploys an agent to Agent Engine.
  cloud_run     Deploys an agent to Cloud Run.
  docker        Deploys an agent to a local Docker container.
  gke           Deploys an agent to GKE.` },

    { t: "diagram", kind: "compare", title: "What you own in each",
      caption: "Left to right, you take on more and get more control. The agent code is identical in all four.",
      columns: [
        { title: "Agent Engine", tone: "violet", items: ["Managed runtime", "Sessions and memory included", "IAM, no URL of your own", "Lessons 12.2–12.3"] },
        { title: "Cloud Run", tone: "accent", items: ["A container Google runs", "Your endpoint and your gateway", "You bring a session database", "Scales to zero"] },
        { title: "GKE", tone: "good", items: ["Your cluster", "Your networking and policy", "Everything is yours", "Worth it if you already run one"] },
        { title: "Docker", tone: "warn", items: ["A local container", "For testing the image", "Not a production target", "Catches packaging bugs early"] }
      ] },

    { t: "h2", n: "02", text: "What gets generated", id: "generated" },

    { t: "p", text: "For the container targets, ADK writes a Dockerfile and a FastAPI application around the same server `adk api_server` runs locally. That is worth knowing because it tells you what your production surface actually is: HTTP endpoints for running an agent, managing sessions, and — if you ask for them — the dev UI and an A2A endpoint." },

    { t: "code", lang: "bash", title: "A Cloud Run deploy with the options that matter",
      code: `adk deploy cloud_run \\
  --project=my-project \\
  --region=europe-west2 \\
  --service_name=support-agent \\
  --session_service_uri="postgresql+asyncpg://…" \\
  --artifact_service_uri="gs://my-agent-artifacts" \\
  --trace_to_cloud \\
  --allow_origins="https://app.example.com" \\
  --env GEMINI_MODEL=gemini-2.5-pro \\
  my_agent`,
      caption: "`my_agent` is the agent directory — the same layout `adk web` takes. Everything else is the environment around it." },

    { t: "table", head: ["Flag", "Why it matters"],
      rows: [
        ["`--session_service_uri`", "Without it you get in-memory sessions, which break the moment there are two replicas (lesson 5.3)"],
        ["`--artifact_service_uri`", "Same for files. A GCS bucket rather than a process dictionary (lesson 6.3)"],
        ["`--trace_to_cloud`", "Traces you will want during the first incident (lesson 11.1)"],
        ["`--allow_origins`", "CORS. A browser calling the agent directly needs it — and think about whether a browser should"],
        ["`--with_ui`", "Deploys the dev UI alongside. Excellent for an internal tool, alarming on the public internet"],
        ["`--a2a`", "Exposes an A2A endpoint so other agents can call this one (lesson 8.4)"],
        ["`--env`", "Environment variables, repeated per pair. Secrets belong in a secret manager, not here"]
      ] },

    { t: "callout", kind: "trap", title: "The default services are the in-memory ones",
      body: [{ t: "p", text: "Deploy without `--session_service_uri` and the command succeeds, the service starts, and a single user testing it sees nothing wrong. The failure appears when traffic arrives on two replicas and conversations start losing their history at random. This is the most common way an agent reaches production broken, and it produces no error anywhere — just an agent that seems forgetful." }] },

    { t: "h2", n: "03", text: "The local ladder", id: "local" },

    { t: "table", head: ["Command", "What it is for"],
      rows: [
        ["`adk run my_agent`", "A terminal conversation. Fastest loop for instruction and tool work"],
        ["`adk web`", "The dev UI — events, state, traces, the evaluation tab (lesson 1.3)"],
        ["`adk api_server`", "The HTTP server without the UI. What your client code should develop against"],
        ["`adk deploy docker`", "The real image, locally. Catches missing dependencies before a cloud build does"]
      ] },

    { t: "callout", kind: "good", title: "Develop clients against api_server, not the UI",
      body: [{ t: "p", text: "The dev UI is a consumer of the same API your application will use, so building your client against `adk api_server` means you are integrating with production shapes from day one — and you find out early if your interface needs something the API does not offer. Both take `--allow_origins`, which is usually what a browser client needs locally." }] },

    { t: "h2", n: "04", text: "Choosing between Cloud Run and Agent Engine", id: "choosing" },

    { t: "diagram", kind: "flow", title: "The decision, honestly",
      caption: "Latency is not on this diagram because both run the same agent and the model dominates. Anyone choosing on performance is choosing on the wrong axis.",
      cols: 3,
      nodes: [
        { id: "a", label: "Do you have a platform?", sub: "Kubernetes, gateway, on-call", tone: "accent" },
        { id: "b", label: "No → Agent Engine", sub: "managed sessions, memory, scaling", tone: "violet" },
        { id: "c", label: "Yes → Cloud Run or GKE", sub: "your endpoint, your database", tone: "good" },
        { id: "d", label: "Need conversations in your own SQL?", sub: "→ Cloud Run, definitively", tone: "warn" }
      ],
      edges: [["a", "b", "no"], ["a", "c", "yes"], ["c", "d"]] },

    { t: "callout", kind: "tradeoff", title: "The question that actually decides it",
      body: [{ t: "p", text: "Do you need to join conversations against your own business data? If someone will ask \"which conversations preceded a refund\", a session database you own makes that a SQL join and Agent Engine makes it an export pipeline. If nobody will ask, the managed runtime removes a database, a scaling configuration and a patching obligation, which is a great deal of work for a small team." }] },

    { t: "h2", n: "05", text: "Per environment", id: "environments" },

    { t: "dl", items: [
      ["Session and artifact stores", "A real database in staging as well as production — in-memory in staging hides exactly the bugs staging exists to find."],
      ["Model", "Often a cheaper model in development. Remember that evaluation results do not transfer between models (lesson 11.2)."],
      ["Secrets", "A secret manager, referenced rather than copied. An API key in `--env` is readable by anyone with console access."],
      ["Identity", "A dedicated service account per environment, scoped to what the tools need. Never the default compute account (lesson 9.1)."],
      ["Tracing and log level", "On everywhere; `--log_level debug` in development only, because debug logs contain prompts."],
      ["CORS and the UI", "`--with_ui` and broad `--allow_origins` are development conveniences. Decide deliberately for production."]
    ] },

    { t: "h2", n: "06", text: "The pre-flight list", id: "preflight" },

    { t: "ladder", title: "Three deployments of the same agent", rungs: [
      { level: "bad", label: "It runs",
        why: "Works for one user; fails confusingly for two.",
        code: `adk deploy cloud_run --project=p --region=r my_agent`,
        lang: "bash",
        note: "In-memory sessions and artifacts, the default service account, no tracing, no retention policy." },
      { level: "ok", label: "It survives traffic",
        why: "Shared state, a real identity, and turns that cannot run away.",
        code: `adk deploy cloud_run --project=p --region=r \
  --session_service_uri="postgresql+asyncpg://…" \
  --artifact_service_uri="gs://agent-artifacts" \
  --trace_to_cloud my_agent`,
        lang: "bash",
        note: "Plus a dedicated service account, secrets from a manager, `max_llm_calls` lowered, and timeouts on every tool's HTTP client." },
      { level: "best", label: "It survives a year",
        why: "Everything above, plus the things somebody asks for in month three.",
        code: `# in CI, on every change to an instruction, tool or model
pytest tests/            # fake-model unit tests   (11.3)
python -m evals.run      # AgentEvaluator suite    (11.2)`,
        lang: "bash",
        note: "Plus a retention policy for events; deletion that reaches sessions, artifacts **and** memory; alerts on tail model calls, tool errors and stale approvals; a rollback that is a config change; and a written note of what the agent is permitted to do." }
    ] },

    { t: "exercise", kind: "practice", title: "Deploy the same agent three ways", difficulty: "advanced", minutes: 30,
      prompt: "Take an agent with one tool. Run it with adk api_server and drive it from curl. Build the image with adk deploy docker and run the same curl against the container. Then write out — without running it — the full cloud_run command you would use for production, naming every flag and why. Finally, list what breaks if you omit --session_service_uri and how you would notice.",
      hints: [
        "Driving the API with curl shows you the surface your client will use.",
        "The Docker step catches a missing dependency in seconds rather than in a cloud build.",
        "The last question is the point of the exercise."
      ],
      solution: {
        notes: [
          { t: "p", text: "Curl against `api_server` is worth the ten minutes because it makes the deployment concrete: you see the session endpoints, the run endpoint and the event stream, and you stop thinking of the agent as a Python object and start thinking of it as a service with an interface." },
          { t: "p", text: "Omitting the session service is the interesting answer. Nothing errors. One replica works perfectly. With two, a user's second message may land on a pod that has never heard of them, so history disappears intermittently — and because it is intermittent, the first three bug reports will be about the model being forgetful. You would notice it in a load test with more than one instance, or in production, which is why it belongs on a pre-flight list rather than in your memory." }
        ]
      } }

  ],

  takeaways: [
    "Four targets: `agent_engine`, `cloud_run`, `gke` and `docker` — the agent code is identical in all of them.",
    "Container deploys generate a Dockerfile and the same FastAPI server `adk api_server` runs locally.",
    "Without `--session_service_uri` you get in-memory sessions, which fail silently across replicas.",
    "`--with_ui`, `--a2a` and `--allow_origins` are deliberate exposure decisions, not conveniences.",
    "Choose Agent Engine when you have no platform; choose Cloud Run when conversations must join your own data.",
    "Per environment: real stores, a scoped service account, secrets by reference, tracing on, debug logs off."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "You deploy to Cloud Run without --session_service_uri and scale to three instances. What do users see?",
      options: ["An error on startup", "Conversations losing history intermittently", "Slower responses", "Sessions shared correctly"],
      answer: 1,
      why: "The default is an in-memory service, one dictionary per process. A follow-up message routed to another instance finds no session, so history vanishes at random — with no error anywhere, which is why it usually arrives as a bug report about the agent being forgetful." },
    { stem: "What does `adk deploy cloud_run` generate?",
      options: ["A Kubernetes manifest", "A Dockerfile and a FastAPI app around the same server adk api_server runs", "A Terraform module", "An Agent Engine resource"],
      answer: 1,
      why: "The container targets wrap your agent directory in the server you have already been using locally, which is why developing your client against `adk api_server` means integrating with the production surface from the start." },
    { stem: "Which flag would you think hardest about before using in production?",
      options: ["--trace_to_cloud", "--with_ui", "--region", "--service_name"],
      answer: 1,
      why: "It deploys the dev UI alongside the agent — an interface for inspecting sessions, state and traces. Excellent for an internal tool behind your own auth, and an alarming amount of visibility to expose publicly. Tracing, by contrast, you want on everywhere." },
    { stem: "What is the strongest reason to prefer Cloud Run over Agent Engine?",
      options: ["Better latency", "You need conversation data in a database you can join against your own tables", "It supports more tools", "It is cheaper at every scale"],
      answer: 1,
      why: "Both run the same agent and latency is dominated by the model, so speed is not the differentiator. The real trade is ownership: your own endpoint and your own session database against not having to operate either of them." }
  ] },

  interview: { title: "Interview", sub: "Deployment questions", questions: [
    { level: "Core", q: "What changes when you move an ADK agent from the dev UI to production?",
      strong: "Everything around the agent: persistent shared services, a real identity, secrets, tracing and an endpoint — the agent code itself does not.",
      answer: [{ t: "p", text: "The agent, its tools and its instructions are unchanged, which is the point of ADK's separation. What changes is the environment: a database session service and a bucket for artifacts instead of in-memory ones, a dedicated service account instead of whatever was on the developer's laptop, secrets from a manager rather than a .env file, tracing enabled, and an HTTP surface — which `adk deploy` generates around the same server `adk api_server` runs locally. The one I check first in any review is the session service, because the default is in-memory and it fails silently the moment there is more than one replica." }] },
    { level: "Core", q: "Cloud Run or Agent Engine?",
      strong: "Agent Engine if you have no platform team; Cloud Run if you need your own endpoint or your conversations in your own database.",
      answer: [{ t: "p", text: "Agent Engine removes the container, the session database, the scaling config and the patching, and gives you managed memory and tracing — which is a large fraction of the work of shipping an agent, and worth a lot to a small team. Cloud Run gives you a URL you own behind your own gateway, a session database you can query alongside your business tables, and portability. The question that usually decides it is whether anyone will want to join conversations against business data: if yes, that is a SQL join on Cloud Run and an export pipeline on Agent Engine. What should not decide it is performance, since both run the same agent and the model dominates." }] },
    { level: "Senior", q: "What is on your checklist before an agent takes real traffic?",
      strong: "Shared persistent services, scoped identity, secrets by reference, bounded turns, tracing and alerts, evaluation in CI, and a deletion story.",
      answer: [{ t: "p", text: "First the things that fail silently: a database session service and a real artifact store, because in-memory defaults work perfectly with one replica and break at random with two. Then identity and secrets — a dedicated service account scoped to what the tools actually need, never the default compute account, and secrets referenced from a manager rather than sitting readable in the deployment's environment. Then bounding: `max_llm_calls` lowered to something plausible, loop caps set, timeouts on every tool's HTTP client, because a runaway turn is both a bill and a user waiting. Then operations: tracing on, alerts on tail model calls per turn, tool error rate by tool and stale approvals, and an evaluation suite running in CI so an instruction edit cannot silently regress routing. Then the ones people leave until someone asks: a retention policy for events, and a deletion path that reaches sessions, artifacts and memory, which is three deletes rather than one. And a written note of what the agent is permitted to do — which tools, whose authority — because that is the document the security review will want and the thing that keeps scope from drifting quietly." }] }
  ] }
});
