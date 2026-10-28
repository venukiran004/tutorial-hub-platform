EC.receiveLesson({
  id: "4.4",

  lede: "Two containers on the same user-defined network find each other by **service name**, because the daemon runs a DNS resolver — which is the whole of container service discovery and the reason `localhost` is the commonest first-day mistake. Then storage: a **bind mount** is a development tool, a **named volume** is a production one, and the difference is who owns the lifecycle. And Compose's `depends_on` does something narrower than almost everyone assumes — it waits for the container to be **started**, not for the service inside it to be **ready**, which is why a model service that connects to Postgres at import time crashes on the first `compose up` and works on the second.",

  objectives: [
    "Explain how containers resolve each other and why `localhost` fails between them",
    "Choose between a bind mount and a named volume from who owns the data's lifecycle",
    "State precisely what `depends_on` waits for, and what makes it wait for readiness",
    "Write a Compose file for a model service's local dependencies"
  ],

  prerequisites: ["4.3"],

  blocks: [

    { t: "h2", n: "01", id: "dns", text: "How one container finds another",
      sub: "A DNS server you did not configure" },

    { t: "p", text: "Lesson 4.1 established that a container has its own **network namespace**: its own interfaces, its own routing table, its own view of ports. The consequence is immediate and catches everybody once." },

    { t: "p", text: "`localhost` inside a container means **that container**. A model service trying to reach its database at `localhost:5432` is looking for a Postgres listening inside its own namespace, and there is none. The connection is refused instantly, which at least produces a clear error — the version of this mistake that reaches `127.0.0.1` on the *host* is worse, because on Docker Desktop `host.docker.internal` sometimes makes it work locally and never in production." },

    { t: "p", text: "What does work is a **user-defined bridge network**, on which the daemon runs an embedded DNS resolver. Every container on that network is resolvable by its service name." },

    { t: "diagram", kind: "flow", id: "dg-4_4-01-0",
      title: "Name resolution on a user-defined network",
      caption: "The resolver is why `db:5432` works and `localhost:5432` does not. **It exists only on user-defined networks** — the default bridge has no DNS, which is why the documentation tells you to create one and why Compose does it for you automatically.",
      cols: 3,
      nodes: [
        { id: "a", label: "api container", sub: "connects to db:5432", tone: "accent" },
        { id: "r", label: "embedded DNS, 127.0.0.11", sub: "per user-defined network", tone: "violet" },
        { id: "d", label: "db container", sub: "listening on 5432", tone: "good" },
        { id: "l", label: "localhost:5432", sub: "its own namespace", tone: "crit" },
        { id: "x", label: "connection refused", sub: "nothing is listening there", tone: "crit" }
      ],
      edges: [["a", "r"], ["r", "d"], ["a", "l"], ["l", "x"]] },

    { t: "callout", kind: "trap", title: "The port you publish is not the port they talk on",
      body: [
        { t: "p", text: "`ports: [\"8000:8000\"]` publishes a container port to the host so *you* can reach it from a browser. Containers on the same network reach each other on the **container** port directly, with no publishing needed at all." },
        { t: "p", text: "So a database that other containers use should not publish its port, and a service reachable at `db:5432` internally may have nothing published. Publishing a database port to the host is a common and unnecessary exposure — on many setups it bypasses the host firewall, because the daemon writes its own iptables rules." }
      ] },

    { t: "h2", n: "02", id: "storage", text: "Bind mounts and volumes",
      sub: "The difference is who owns the lifecycle" },

    { t: "p", text: "A container's writable layer is discarded when the container is removed (lesson 4.2). So anything that must survive needs to live outside it, and there are two mechanisms that are routinely treated as interchangeable and are not." },

    { t: "table",
      head: ["", "Bind mount", "Named volume"],
      rows: [
        ["What it is", "A host path mapped into the container", "Storage the daemon creates and owns"],
        ["You specify", "An exact host path — so it is machine-specific", "A name — portable across machines"],
        ["Lifecycle", "Yours; the host directory exists independently", "The daemon's; `docker volume rm` removes it"],
        ["Permissions", "Host uid/gid, which collide with a non-root container user", "Initialised from the image, so ownership usually just works"],
        ["Performance", "Native on Linux; slow on macOS/Windows via the VM", "Native, since it is on the daemon's filesystem"],
        ["Use for", "Source code during development, live-reload", "Database data, model caches, anything production keeps"]
      ] },

    { t: "p", text: "The permissions row is the one that produces the most confusion. Lesson 4.3's image runs as `appuser` with uid 10001. Bind-mount a host directory owned by your uid 1000 and the container user cannot write to it; the error is a bare `Permission denied` with no indication that a uid mapping is involved. A named volume avoids this because the daemon initialises its ownership from the image's content." },

    { t: "callout", kind: "good", title: "Bind-mount source in development, and nothing in production",
      body: [
        { t: "p", text: "The development pattern is genuinely useful: bind-mount `src/` into the container and run uvicorn with `--reload`, and you edit on the host while the process restarts inside. That removes the rebuild from the inner loop entirely, which given lesson 4.2's numbers is the difference between a two-second edit cycle and a rebuild." },
        { t: "p", text: "In production a bind mount is a dependency on a specific host's filesystem layout, which is exactly what a container was supposed to remove — and for a model artifact it is the unversioned-mutable-state problem from lesson 4.3. Model caches and database data get named volumes; source gets baked in." }
      ] },

    { t: "h2", n: "03", id: "compose", text: "A Compose file for the local stack",
      sub: "The dependencies a model service needs to run at all" },

    { t: "p", text: "Compose is a local-development and single-host tool: one file describing several containers, one network created automatically, one command to bring it up. For an ML service the usual shape is the API, a database for features or logs, and a cache." },

    { t: "code", lang: "yaml", title: "docker-compose.yml — the stack from lesson 4.3's image",
      code: `services:
  api:
    build: .
    ports: ["8000:8000"]          # published for YOU, not for the other services
    environment:
      DATABASE_URL: postgresql://app:app@db:5432/app   # service name, not localhost
      REDIS_URL: redis://cache:6379/0
      MODEL_VERSION: loan-approval:4d8e8c10a2bb
      OMP_NUM_THREADS: "2"
    depends_on:
      db:    { condition: service_healthy }   # waits for the healthcheck
      cache: { condition: service_started }
    develop:
      watch:
        - { action: sync, path: ./src, target: /src }   # the dev inner loop

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: app
      POSTGRES_DB: app
    volumes: ["pgdata:/var/lib/postgresql/data"]        # named, not a bind mount
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app"]
      interval: 5s
      timeout: 3s
      retries: 10

  cache:
    image: redis:7-alpine
    command: ["redis-server", "--save", "", "--appendonly", "no"]

volumes:
  pgdata:` },

    { t: "p", text: "Note that `db` and `cache` publish no ports. They are reachable at `db:5432` and `cache:6379` from the `api` container and from nowhere else, which is both simpler and safer than the usual habit of publishing everything." },

    { t: "h2", n: "04", id: "dependson", text: "What `depends_on` actually waits for",
      sub: "Started, not ready — unless you say otherwise" },

    { t: "p", text: "This is the most consequential misunderstanding in Compose, and it produces a specific, memorable symptom." },

    { t: "p", text: "Plain `depends_on: [db]` waits for the db **container to have been started**. Not for Postgres to have finished initialising, not for it to be accepting connections — just for the container process to exist. Postgres takes a second or two to be ready on first boot, and considerably longer when it is initialising a fresh data directory." },

    { t: "p", text: "So a model service that opens a database connection at import time — to load a feature table, say — crashes on the first `docker compose up` and then works on the second, because by then the volume is initialised and the database starts quickly. That *works on the second try* signature is the fingerprint of this bug." },

    { t: "code", lang: "yaml", title: "The two conditions, and what each one means",
      code: `depends_on:
  db:    { condition: service_healthy }   # waits for the db's healthcheck to pass
  cache: { condition: service_started }   # waits only for the container to start

# service_healthy requires the dependency to DEFINE a healthcheck -- which is
# why db has one above and cache does not need one (redis is ready instantly).` },

    { t: "callout", kind: "insight", title: "`service_healthy` is not a substitute for retrying",
      body: [
        { t: "p", text: "`condition: service_healthy` fixes the startup race locally, and it is worth setting. It does not make your application correct, because in production there is no Compose: in Kubernetes the pods start in whatever order the scheduler chooses, and a dependency can disappear and return at any point in a service's life." },
        { t: "p", text: "So the durable fix is in the application — **connect lazily and retry with backoff**, rather than at import. That also removes the readiness problem from lesson 2.1: a service that connects lazily can report itself unready until its dependency answers, instead of crash-looping. Lesson 14.2 covers retries and circuit breakers properly." }
      ] },

    { t: "h2", n: "05", id: "env", text: "Configuration and profiles",
      sub: "One file, several environments, no secrets" },

    { t: "p", text: "Two smaller mechanics that matter in practice. **Profiles** let one file describe optional services — a training container, a Jupyter instance, a load generator — that only start when asked: `docker compose --profile train up`. That keeps the everyday `up` fast while the heavyweight pieces stay described rather than deleted." },

    { t: "p", text: "And **environment values are not secrets**. Everything in the `environment:` block is visible in `docker inspect`, in the Compose file, and typically in version control. A database password in a local Compose file is acceptable because it is a throwaway local database; the same pattern with a real credential is how credentials leak. Lesson 4.5 covers the build-time version of the same mistake, which is worse because it is permanent." },

    { t: "diagram", kind: "steps", id: "dg-4_4-05-0",
      title: "The four things to get right",
      caption: "In the order they bite a new service. **The first two are a five-minute fix and the third is an application change** — which is why `depends_on` gets over-trusted.",
      items: [
        { label: "Use service names, not localhost", desc: "localhost is that container's own namespace. The daemon's DNS on a user-defined network resolves db:5432." },
        { label: "Publish only what a human needs", desc: "Containers use the container port with no publishing. A published database port is needless exposure." },
        { label: "depends_on waits for started, not ready", desc: "Add condition: service_healthy, and still retry in the application — in Kubernetes there is no depends_on at all." },
        { label: "Named volumes for data, bind mounts for dev source", desc: "A bind mount's host uid collides with a non-root container user, and in production it reintroduces host coupling." }
      ] },

    { t: "exercise", kind: "practice", title: "Break and fix a startup race", difficulty: "intro", minutes: 25,
      prompt: "Write a two-service Compose file where the application connects to a database at import time, with a plain `depends_on`. Run `docker compose down -v` to remove the volume, then `up`, and observe the crash. Run `up` again and observe it working — that difference is the bug's signature. Now fix it twice: add a healthcheck to the database and `condition: service_healthy`, confirming the first-run crash disappears; then change the application to connect lazily with backoff, and confirm it survives `docker compose restart db` while running. Note which of the two fixes would also work in Kubernetes.",
      hints: [
        "`down -v` is the important part — without removing the volume the database starts too fast to lose the race.",
        "`pg_isready -U <user>` is the standard Postgres healthcheck and takes a second to start passing on a fresh volume.",
        "Restarting the dependency mid-run is the test that distinguishes the two fixes; only the application-level retry survives it."
      ],
      solution: {
        body: [
          { t: "p", text: "The point of doing both fixes is that they solve different problems. `service_healthy` solves the startup ordering, which is a Compose-only concern. The lazy connect with retry solves the dependency being unavailable at any point in the service's life, which is the only version of the problem that exists in production." },
          { t: "p", text: "The `restart db` test makes that concrete: a service that connected at import is dead afterwards even though the database came back, while one that connects lazily recovers on the next request. That is also what lets it report unready rather than crash-loop, which is lesson 5.2's readiness gate." }
        ]
      } }

  ],

  takeaways: [
    "**`localhost` inside a container is that container's own network namespace**, so reaching a database there finds nothing listening.",
    "**A user-defined bridge network gives you an embedded DNS resolver**, which is why `db:5432` resolves; the default bridge has no DNS, and Compose creates a user-defined network for you.",
    "**Publishing a port is for humans.** Containers on the same network use the container port directly, so a database other services use should publish nothing.",
    "**A published database port can bypass the host firewall**, because the daemon writes its own iptables rules.",
    "**Bind mount versus named volume is about who owns the lifecycle**: a host path you manage, against storage the daemon creates and can remove.",
    "**A bind mount's host uid collides with a non-root container user** — lesson 4.3's uid 10001 cannot write to a directory owned by uid 1000, and the error is a bare Permission denied.",
    "**Bind-mount source in development** for a live-reload inner loop; use named volumes for database data and model caches, and bake source into the image for production.",
    "**`depends_on` waits for the container to be started, not for the service to be ready** — which is why a service connecting at import crashes on the first `compose up` and works on the second.",
    "**`condition: service_healthy` fixes the local race** and requires the dependency to define a healthcheck.",
    "**It is not a substitute for retrying.** In Kubernetes there is no `depends_on`, and a dependency can vanish and return at any time — so connect lazily with backoff.",
    "**Lazy connection also fixes readiness**: the service can report itself unready instead of crash-looping, which is lesson 5.2's gate.",
    "**Profiles keep optional services described rather than deleted** — a training container or Jupyter that starts only with `--profile`.",
    "**Values in `environment:` are not secrets**: they are visible in `docker inspect`, in the file, and usually in version control."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Your API container cannot reach its database at `localhost:5432`, though both are in the same Compose file. Why?",
        options: [
          "The database has not published port 5432 to the host",
          "Each container has its own network namespace, so `localhost` means that container — the database is reachable by its service name, `db:5432`, via the network's embedded DNS",
          "Compose requires an explicit `links` entry between the two services"
        ],
        answer: 1,
        why: "Publishing is irrelevant here: containers on the same user-defined network reach each other on the container port with nothing published. The first option describes a different problem — reaching the database from the host — and `links` has been superseded by user-defined networks and their DNS."
      },
      {
        stem: "A service with `depends_on: [db]` crashes on the first `docker compose up` and works on the second. What is happening?",
        options: [
          "The image is not fully built on the first run",
          "`depends_on` waits only for the db container to start, not for Postgres to accept connections — and on the first run the fresh volume makes initialisation slow enough to lose the race",
          "The network is created after the containers, so DNS is not ready initially"
        ],
        answer: 1,
        why: "The works-on-the-second-try signature is the fingerprint: by then the volume is initialised and the database starts quickly enough. `condition: service_healthy` fixes the local case; connecting lazily with retry is the fix that also holds in production, where there is no depends_on."
      },
      {
        stem: "Why does a bind mount often fail with 'Permission denied' in a container that runs as a non-root user?",
        options: [
          "Bind mounts are always read-only unless explicitly marked writable",
          "The host directory's uid/gid comes through unchanged, so a directory owned by host uid 1000 is not writable by the container's uid 10001",
          "The daemon drops write capabilities for bind-mounted paths"
        ],
        answer: 1,
        why: "A named volume avoids this because the daemon initialises its ownership from the image's content. The error message mentions nothing about uid mapping, which is why this is a disproportionately long debugging session the first time."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "mid",
        q: "How do containers communicate with each other?",
        strong: "By service name, on a user-defined network, via an embedded DNS resolver the daemon runs. So the API connects to `db:5432` — not `localhost:5432`, because each container has its own network namespace and localhost means that container, where nothing is listening. Publishing a port is a separate thing: it maps a container port to the host so a human can reach it, and containers on the same network do not need it at all. Which means a database that only other services use should publish nothing — and publishing it is not just unnecessary but can bypass the host firewall, since the daemon writes its own iptables rules.",
        answer: [
          { t: "p", text: "The namespace explanation for why localhost fails is what makes this more than a syntax answer, and it connects back to the three mechanisms from 4.1." },
          { t: "p", text: "The publishing distinction is worth volunteering: it corrects a widespread habit and has a security consequence." }
        ]
      },
      {
        level: "senior",
        q: "Does `depends_on` guarantee your dependency is ready?",
        strong: "No — plain `depends_on` waits for the container to be started, not for the process inside to be accepting connections. The symptom is memorable: a service that connects at import time crashes on the first `compose up` and works on the second, because the first run is initialising a fresh volume and loses the race. Compose's fix is `condition: service_healthy`, which requires the dependency to define a healthcheck, and it is worth setting. But it is not the real fix, because in production there is no Compose: in Kubernetes pods start in whatever order the scheduler picks, and a dependency can disappear and come back at any point. So the durable fix is in the application — connect lazily and retry with backoff — which also lets the service report itself unready instead of crash-looping, rather than failing a readiness probe for a reason the probe cannot describe.",
        answer: [
          { t: "p", text: "Knowing the precise semantics plus the works-on-second-try signature shows this has been debugged. The key move is treating Compose's fix as local-only and naming the application change as the durable one." },
          { t: "p", text: "Connecting it to readiness is the senior addition: the lazy-connect pattern is what makes a correct readiness probe possible at all." }
        ]
      }
    ]
  }
});
