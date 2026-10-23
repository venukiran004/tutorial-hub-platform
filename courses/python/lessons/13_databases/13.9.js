/* ============================================================================
   LESSON 13.9 — The ORM Landscape: Patterns, Trade-offs and Schema-First
   ========================================================================= */
EC.receiveLesson({
  id: "13.9",

  lede: "Every ORM you will meet is one of **two patterns**, and knowing which one you are holding predicts most of its behaviour: where the save method lives, whether you can test without a database, and what happens when the object model and the schema disagree. This lesson names the patterns, walks the Python landscape, and looks at the schema-first design that Prisma made popular — including the part most write-ups leave out, which is that its Python client is archived.",

  objectives: [
    "State the problem an ORM solves, and the two ways it goes wrong",
    "Distinguish Active Record from Data Mapper, and predict a library's behaviour from which it is",
    "Choose between the main Python ORMs for a given constraint",
    "Explain schema-first modelling and what a generated client buys",
    "Decide when an ORM is the wrong tool and reach for SQL instead"
  ],

  prerequisites: ["13.3", "13.5"],

  blocks: [

    { t: "h2", n: "01", text: "The problem, stated precisely", id: "problem" },

    {"kind": "trace", "title": "Three things that do not survive the crossing", "caption": "**An ORM manages the mismatch; it does not abolish it** — and each row is a place where something was decided on your behalf. Inheritance has three mapping strategies with different costs and no right answer. Identity has to be reconstructed by an identity map, or two loads of one row give you two objects and stale reads. **The last row is the one that becomes a performance bug:** `order.customer.name` is a reference in Python and a join or a second query in SQL, and the Python cannot tell you which.", "left": "in Python", "codeW": 150, "vars": ["in the database", "what the ORM must do"], "steps": [{"code": "a class hierarchy", "state": ["no inheritance in tables", "pick one of three mappings"], "tone": "warn"}, {"code": "identity by reference", "state": ["identity by primary key", "keep an identity map"], "changed": [0, 1], "tone": "accent"}, {"code": "obj.other.field", "state": ["a join, or a second query", "load eagerly, lazily, or raise"], "changed": [0, 1], "tone": "crit"}, {"code": "mutating an attribute", "state": ["an UPDATE statement", "track the change until flush"], "changed": [0, 1], "tone": "good"}, {"code": "and the leak", "state": ["SQL you did not write", "so read the query log"], "changed": [0, 1], "tone": "violet"}], "t": "diagram", "id": "dg-13_9-01-0"},

    { t: "p", text: "A relational database holds rows in tables with foreign keys. A Python program holds objects with references. **Neither can represent the other without loss**, and that mismatch is the problem an ORM exists to manage — not to abolish, because it cannot be abolished." },

    { t: "p", text: "The losses run in both directions. A table has no inheritance, so a class hierarchy has to be flattened into one wide table, several joined tables, or one table per concrete class — three strategies with different costs and no right answer. An object has identity by reference, so two objects loaded from the same row must somehow be the same object or the program sees stale data. A relationship is a reference in Python and a join in SQL, and the Python code that touches `order.customer.name` cannot tell whether that is free or a second query." },

    { t: "dl", items: [
      ["What an ORM genuinely gives you", "Mapping and identity, so a row becomes an object and the same row is the same object. Change tracking, so you describe the end state rather than writing the `UPDATE`. Portable schema definition and migrations. Composable query building in the host language, with its type checking and its refactoring tools."],
      ["What it costs you", "A layer that generates SQL you did not write, which means a performance problem can be invisible in the Python and obvious in the query log. A leaky abstraction — you still have to know SQL to debug it, so you now know two things instead of one. And an object graph that encourages traversal, which is where N+1 comes from (13.6)."]
    ] },

    { t: "callout", kind: "insight", title: "The abstraction that leaks is still worth having",
      body: [
        { t: "p", text: "The standard complaint about ORMs is that you must understand the SQL underneath, so the abstraction has failed. That is true and it is not the argument it sounds like. **A migration tool, an identity map and change tracking are a great deal of code to write correctly**, and none of them is what your application is for. The honest position is that an ORM is a productivity layer rather than an abstraction boundary: use it, and read the query log. The teams that get burned are the ones that treat it as a boundary and never look underneath." }
      ] },

    { t: "h2", n: "02", text: "Active Record against Data Mapper", id: "patterns" },

    {"kind": "compare", "title": "Where the persistence logic lives decides the rest", "caption": "**The absence of a save method is the pattern showing through, not a missing feature** — a session watching the object can derive the write from the mutation, and a model with nothing watching it cannot. **The testability row is the one with consequences:** a plain class can be constructed in a unit test and asserted on, while a model carrying a connection in its ancestry needs a database or its framework's harness. Neither pattern is better; the question is which description matches the system you are building.", "columns": [{"title": "Active Record", "tone": "accent", "items": ["Persistence lives ON the model", "obj.save(), explicitly", "The model depends on the database", "A unit test needs a DB or a harness", "Less ceremony for plain CRUD", "Django ORM, Peewee, Tortoise"]}, {"title": "Data Mapper", "tone": "violet", "items": ["Persistence lives in a session", "Mutate and commit - tracked", "The model is a plain class", "A unit test needs neither", "Keeps domain logic off storage", "SQLAlchemy ORM"]}], "t": "diagram", "id": "dg-13_9-02-1"},

    { t: "p", text: "Martin Fowler named both patterns, and the distinction is simply **where the persistence logic lives**." },

    { t: "p", text: "In **Active Record**, the object persists itself. The class that represents a user also knows how to save a user, so `user.save()` is a method on the model and the model therefore depends on the database." },

    { t: "p", text: "In **Data Mapper**, a separate object moves data between the model and the database. The model is a plain class that knows nothing about storage, and something else — a session, a repository — is responsible for persisting it." },

    { t: "code", lang: "python", title: "the same operation in both patterns",
      code: `# Active Record: the model saves itself.
user = User(email="a@example.com")
user.save()                        # the model knows about the database

user.email = "b@example.com"
user.save()                        # and you say when to write

# Data Mapper: something else persists the model.
user = User(email="a@example.com")
session.add(user)
session.commit()                   # the SESSION knows about the database

user.email = "b@example.com"
session.commit()                   # no save() -- the change was tracked`,
      caption: "**The absence of `save()` in the second block is the whole pattern showing through.** A Data Mapper session tracks what changed, so there is nothing to call; an Active Record model cannot track anything, because the write is a method you invoke." },

    { t: "table",
      head: ["", "Active Record", "Data Mapper"],
      rows: [
        ["Where persistence lives", "On the model", "In a session or repository"],
        ["Writing a change", "`obj.save()`, explicitly", "Mutate and commit — tracked"],
        ["Model depends on the DB", "Yes", "No"],
        ["Unit-testable without a DB", "Awkward — the model needs one", "Yes — the model is a plain class"],
        ["Typical feel", "Quick, obvious, less ceremony", "More setup, more control"],
        ["Where it strains", "Complex domains, many write paths", "Simple CRUD, where it is overhead"],
        ["Python examples", "Django ORM, Peewee, Tortoise", "SQLAlchemy ORM"]
      ] },

    { t: "p", text: "The row that matters most in practice is the testability one, and it is the reason the patterns are not merely a matter of taste. **A Data Mapper model is a plain Python object**, so the logic on it can be tested by constructing one and calling a method. An Active Record model carries a database connection in its ancestry, so the same test either needs a database or needs the framework's test harness to fake one — which is why Django projects end up with a test suite that depends on Django." },

    { t: "callout", kind: "tradeoff", title: "Neither is the better pattern",
      body: [
        { t: "p", text: "For an application whose database is its own, where most operations are create-read-update on a handful of entities, **Active Record is less code and reads more directly** — the ceremony of a session buys nothing you need. For an application with real domain logic, several write paths into the same entity, or a schema it does not exclusively own, **Data Mapper's separation is what keeps the domain code from being shaped by the storage**. Judging an ORM by its pattern rather than by your situation is the mistake; the useful move is to ask which description above matches the system you are actually building." }
      ] },

    { t: "h2", n: "03", text: "The Python landscape", id: "landscape" },

    {"kind": "trace", "title": "Five options, and the column that eliminates fastest", "caption": "**Decide the concurrency model first and let it narrow the list.** The Django ORM is synchronous at its core — its async methods wrap sync calls in a thread pool — and a synchronous driver inside an async handler blocks the whole event loop rather than one request. That is a correctness constraint, not a preference, and it cannot be satisfied after the choice. **Pattern preference can be satisfied within whatever survives.**", "left": "library", "codeW": 130, "vars": ["pattern", "async?", "reach for it when"], "steps": [{"code": "SQLAlchemy", "state": ["Data Mapper", "yes", "the default for a non-Django service"], "tone": "good"}, {"code": "SQLModel", "state": ["Data Mapper", "yes", "FastAPI schema duplication hurts"], "changed": [0, 2], "tone": "good"}, {"code": "Django ORM", "state": ["Active Record", "NO - sync core", "you are already in Django"], "changed": [0, 1, 2], "tone": "crit"}, {"code": "Peewee", "state": ["Active Record", "no", "a script or a small tool"], "changed": [0, 1, 2], "tone": "warn"}, {"code": "Tortoise", "state": ["Active Record", "yes, natively", "async Active Record specifically"], "changed": [0, 1, 2], "tone": "accent"}], "t": "diagram", "id": "dg-13_9-03-2"},

    { t: "p", text: "Five options cover almost every Python project, and they differ along two axes that matter more than feature lists: which pattern they implement, and whether they come with a framework attached." },

    { t: "dl", items: [
      ["SQLAlchemy — Data Mapper, framework-free", "The reference implementation of the pattern in Python, and the most capable query builder of the five (13.5). Two layers, Core and ORM, so you can drop to SQL expressions for a report without leaving the library. The cost is surface area: sessions, identity, flush semantics and loading strategies are all things you must learn. **The default choice for a service that is not a Django application.**"],
      ["Django ORM — Active Record, framework-attached", "Excellent inside Django and not usable in a meaningful sense outside it, because it expects the settings, the app registry and the migration machinery. Migrations are the best in the ecosystem and are generated from model changes automatically. **The right answer when the application is a Django application**, and not an argument for choosing Django."],
      ["SQLModel — SQLAlchemy with Pydantic on top", "One class definition serving as both the table model and the request/response schema, which removes the duplication every FastAPI project otherwise has (12.4). It is SQLAlchemy underneath, so the semantics in 13.5 apply unchanged. **Reach for it when the duplication is the pain**, and know that complex queries drop you back to SQLAlchemy anyway."],
      ["Peewee — Active Record, small", "A small, readable, well-documented library with far less to learn than SQLAlchemy and correspondingly less reach. **A good fit for a script, a small tool or an embedded SQLite database**, and a poor one for a service that will grow."],
      ["Tortoise ORM — Active Record, async-native", "Django-like models with an async API from the start, rather than async bolted on. The ecosystem is much smaller, which shows up as missing adapters and fewer answers when something is wrong. **Consider it only if an async Active Record API is specifically what you want** — SQLAlchemy's async support covers most of the need (13.3)."]
    ] },

    { t: "callout", kind: "warn", title: "Async is the axis that eliminates options fastest",
      body: [
        { t: "p", text: "If the service is async, the question is not which ORM you prefer but which ones work: SQLAlchemy with an async driver, SQLModel on top of it, or Tortoise. **The Django ORM is synchronous at its core** — its async methods wrap sync calls in a thread pool — and a synchronous driver inside an async handler blocks the whole event loop rather than one request (13.8). Decide the concurrency model first and let it narrow the list, rather than choosing an ORM and discovering the constraint afterwards." }
      ] },

    { t: "h2", n: "04", text: "Schema-first, and what a generated client buys", id: "schema-first" },

    {"kind": "trace", "title": "Schema-first against code-first, and the row that settles it for Python", "caption": "**The design is sound and the Python implementation is not current — two separate judgements.** A language-neutral schema generating clients for several languages is the strongest argument for the approach, and it is why the idea came out of a polyglot ecosystem. **But the last row is decisive for new work:** archived April 2025, last release 0.15.0 in August 2024, pinned to engine 5.19.0. Learn the idea; run Prisma from TypeScript if the polyglot schema is the real requirement, and read the database from Python with SQLAlchemy.", "left": "concern", "codeW": 160, "vars": ["schema-first", "code-first"], "steps": [{"code": "source of truth", "state": ["a declarative schema file", "Python classes"], "tone": "accent"}, {"code": "a second language", "state": ["generate another client", "duplicate the definitions"], "changed": [0, 1], "tone": "good"}, {"code": "static checking", "state": ["real symbols, no inference", "Mapped[...] gets close"], "changed": [0, 1], "tone": "good"}, {"code": "migrations", "state": ["diffed from the declaration", "diffed, or hand-written"], "changed": [0, 1], "tone": "accent"}, {"code": "complex queries", "state": ["falls back to raw SQL sooner", "a full expression language"], "changed": [0, 1], "tone": "warn"}, {"code": "build step", "state": ["yes - generate, in CI", "none"], "changed": [0, 1], "tone": "warn"}, {"code": "Python maturity", "state": ["ARCHIVED, unmaintained", "the actively developed mainstream"], "changed": [0, 1], "tone": "crit"}], "t": "diagram", "id": "dg-13_9-04-3"},

    { t: "p", text: "Everything above defines the schema **in Python**: classes are the source of truth and migrations are derived from them. There is another arrangement, and Prisma is the tool that made it popular: the schema is a separate declarative file, and the client is **generated** from it." },

    { t: "code", lang: "text", title: "a schema in Prisma's own language, not in Python",
      code: `datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-py"
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  createdAt DateTime @default(now())
  orders    Order[]
}

model Order {
  id      Int    @id @default(autoincrement())
  total   Decimal
  user    User   @relation(fields: [userId], references: [id])
  userId  Int
}`,
      caption: "One file describing the datasource, the generator and the models. `prisma generate` reads it and writes a typed client; `prisma migrate dev` diffs it against the database and writes the migration SQL." },

    { t: "p", text: "The three consequences are worth understanding independently of the tool, because each one is a genuine design idea." },

    { t: "dl", items: [
      ["The schema is language-neutral", "A Python service and a TypeScript service can generate clients from the same file, which is the strongest argument for the approach and the reason it came from a polyglot ecosystem. With models defined in Python classes, a second language means a second definition that drifts."],
      ["The client is generated, not reflective", "Field names, relations and return types exist as real symbols, so an editor completes them and a type checker rejects a typo at the point of writing rather than at the point of querying. SQLAlchemy's 2.0 typing gets close, but a generated client is checkable without any inference at all."],
      ["Migrations are diffed from a declaration", "You edit the desired state and the tool computes the change, which is the same model as Django's `makemigrations` and the opposite of Alembic's hand-written revisions. It is more convenient and it means you must read what it generated before running it — 13.7's rules about online migrations are not suspended because a tool wrote the SQL."]
    ] },

    { t: "callout", kind: "warn", title: "The Python client is archived — read this before adopting it",
      body: [
        { t: "p", text: "Prisma itself is a TypeScript-first project, and the Python client was a separate community effort. **Its repository was archived in April 2025, its README states plainly that it is no longer maintained, and its last release on PyPI is 0.15.0 from August 2024** — pinned to Prisma engine 5.19.0, while Prisma itself has moved on. The README also never claimed stability." },
        { t: "p", text: "So this section is here for the idea and for the interview question, not as a recommendation: **schema-first modelling with a generated client is a design worth understanding, and prisma-client-py is not a choice for new Python work.** If the polyglot schema is what you need, run Prisma from TypeScript and talk to the database from Python with SQLAlchemy against the schema Prisma migrated. If the typed-client feel is what appeals, SQLAlchemy 2.0 with `Mapped[...]` annotations gets much of it." }
      ] },

    { t: "table",
      head: ["", "Schema-first (generated client)", "Code-first (SQLAlchemy, Django)"],
      rows: [
        ["Source of truth", "A declarative schema file", "Python classes"],
        ["Client code", "Generated — regenerate after a change", "Written once, reflective at runtime"],
        ["Second language", "Generate another client", "Duplicate the definitions"],
        ["Migrations", "Diffed from the declaration", "Diffed (Django) or hand-written (Alembic)"],
        ["Complex queries", "Falls back to raw SQL sooner", "A full expression language"],
        ["Build step", "Yes — a generate step in CI", "None"],
        ["Python maturity", "Archived and unmaintained", "The mainstream, actively developed"]
      ] },

    { t: "h2", n: "05", text: "When the answer is not an ORM", id: "no-orm" },

    {"kind": "tree", "title": "Per query, not per application", "caption": "**The whole-application version of this question has no useful answer; the per-query version does.** And `session.execute(text(...))` is what makes the mixed approach practical rather than theoretical — hand-written SQL runs inside the same transaction as the ORM work around it, so a report query and an entity write are not two infrastructures. **Keep those queries in named functions in one module** rather than inline in handlers, so there is a single place to look when a plan changes.", "root": {"label": "You are about to write a query", "sub": "what does it return, and what owns the schema?", "tone": "accent", "children": [{"label": "Entities, a few rows, through relationships", "sub": "CRUD, and transactional writes", "tone": "good", "children": [{"label": "The ORM", "sub": "most endpoints in a normal service", "tone": "good"}]}, {"label": "Columns, aggregates, window functions", "sub": "or ten thousand rows to update", "tone": "violet", "children": [{"label": "SQL, in the same session", "sub": "session.execute(text(...))", "tone": "violet"}]}, {"label": "Someone else's schema", "sub": "a warehouse, another team's tables", "tone": "teal", "children": [{"label": "No ORM at all", "sub": "mapping an evolving schema buys no safety", "tone": "teal"}]}]}, "t": "diagram", "id": "dg-13_9-05-4"},

    { t: "p", text: "The useful version of this question is not *\"ORM or raw SQL\"* for a whole application — it is which tool for which query, inside one application that already has both." },

    { t: "dl", items: [
      ["Use the ORM for", "Create, read by id, update, delete. Anything touching a handful of rows through a relationship. Writes that must participate in a transaction with other writes. The large majority of endpoints in a normal service."],
      ["Drop to SQL for", "Reports and aggregates, where you want columns rather than entities and the object layer is pure overhead (13.1). Window functions, recursive CTEs, and anything where the SQL *is* the logic. Bulk operations, where constructing ten thousand objects to update them is the slowest possible way. Query shapes you need to tune by hand and keep tuned."],
      ["Skip the ORM entirely when", "The service does one thing to one table — a driver and a few functions is less machinery than a mapping layer. Or the schema is not yours: a reporting database, a warehouse, another team's tables, where mapping someone else's evolving schema into your classes buys you a maintenance task and no safety."]
    ] },

    { t: "callout", kind: "good", title: "One connection, two tools",
      body: [
        { t: "p", text: "SQLAlchemy makes the mixed approach the path of least resistance, which is why it is the recommendation: `session.execute(text(...))` runs hand-written SQL **inside the same transaction** as the ORM work around it, so a report query and an entity write are not two different infrastructures. The pattern worth adopting is to keep hand-written SQL in named functions in one module rather than inline in handlers, so there is a single place to look when a query plan changes." }
      ] },

    { t: "exercise", kind: "practice", title: "Predict the pattern from the behaviour", difficulty: "core", minutes: 20,
      prompt: "Without looking anything up, decide for each: (1) a library where models inherit from a base that needs a configured connection at import time; (2) a library where you can construct a model object in a unit test with no database running and assert on a method; (3) a library where changing an attribute and doing nothing else results in an UPDATE; (4) a library where the same model class validates an HTTP request body. Name the pattern for each and one Python library that fits, then check yourself against section 03. Finally, take a service you know and decide which of section 05's three categories each of its five slowest queries belongs in.",
      hints: [
        "The import-time connection requirement is the tell for one pattern.",
        "Number three is the absence of save(), which only one pattern can offer.",
        "For the last part, look at what the query returns rather than at what it touches — entities or columns."
      ],
      solution: {
        notes: [
          { t: "p", text: "(1) and (3) are the two halves of the same distinction and people often get them backwards: the import-time connection is Active Record, but the attribute change that writes itself is Data Mapper, because tracking requires a session watching the object. Active Record is the pattern that needs the database *earlier* and does *less* for you at write time." },
          { t: "p", text: "The last part is the one worth doing on a real system, because the usual finding is that the slowest queries are reports returning columns through an object-mapping layer that nothing then uses as objects. That is the cheapest performance win in 13.1, and it is invisible until you ask what each query returns rather than how long it takes." }
        ]
      } }

  ],

  takeaways: [
    "**An ORM manages the object-relational mismatch; it does not abolish it.** Inheritance, identity and relationships each lose something in translation, and knowing what was lost is how you debug the layer.",
    "**Active Record puts persistence on the model** — `obj.save()`, and the model depends on the database. Django's ORM, Peewee and Tortoise are Active Record.",
    "**Data Mapper puts it in a session or repository**, so the model is a plain class. SQLAlchemy's ORM is Data Mapper, and the absence of `save()` is the pattern showing through.",
    "**The testability difference is the one with consequences:** a Data Mapper model can be constructed and asserted on with no database; an Active Record model needs one, or needs its framework's harness.",
    "**Choose by the system, not the pattern.** Active Record is less code for CRUD on your own schema; Data Mapper keeps domain logic from being shaped by storage when there is real domain logic.",
    "**Async narrows the list fastest** — SQLAlchemy with an async driver, SQLModel, or Tortoise. The Django ORM is synchronous at its core, and a sync driver in an async handler blocks the loop.",
    "**SQLAlchemy is the default for a non-Django service**, SQLModel when the FastAPI schema duplication is the pain, Peewee for small tools, the Django ORM when you are in Django.",
    "**Schema-first means a declarative schema file and a generated client** — language-neutral, statically checkable, and migrations diffed from the declaration, at the cost of a generate step.",
    "**Prisma Client Python is archived and unmaintained** — last release 0.15.0 in August 2024, repository archived April 2025. Learn the idea; do not adopt the client.",
    "**Decide ORM against SQL per query, not per application.** Entities and transactional writes through the ORM; reports, window functions and bulk operations in SQL, in the same session and the same transaction.",
    "**Skip the ORM when the schema is not yours** — mapping another team's evolving tables into your classes is a maintenance task that buys no safety."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A library requires a configured database connection at import time, and writes happen only when you call `save()`. Which pattern is it, and what follows?",
        options: [
          "Data Mapper — the session tracks changes",
          "Active Record — persistence lives on the model, so the model depends on the database and unit-testing its logic needs one",
          "Neither — this is a query builder",
          "Active Record — and it can therefore track changes automatically"
        ],
        answer: 1,
        why: "The two tells point the same way: a model that needs a connection to be imported is carrying persistence itself, and an explicit `save()` is the consequence of having nothing watching the object. Change tracking is what you give up — only a session observing the instance can turn a mutation into an `UPDATE` with no call."
      },
      {
        stem: "Why is the absence of a `save()` method evidence of Data Mapper rather than a missing feature?",
        options: [
          "Because Data Mapper libraries write immediately on every mutation",
          "Because a separate session tracks the loaded objects, so a mutation is already scheduled and there is nothing for a save method to do",
          "Because Data Mapper does not support updates",
          "Because the model is read-only"
        ],
        answer: 1,
        why: "The session holds an identity map and compares state at flush, which is what makes the write derivable from the mutation. It also explains the surprise in 13.5: autoflush means a query can emit that `UPDATE` before you commit."
      },
      {
        stem: "A new async FastAPI service needs an ORM. Which consideration eliminates the most options first?",
        options: [
          "Which pattern the team prefers",
          "Whether the ORM has a genuinely async driver path — a synchronous driver in an async handler blocks the event loop for every request, not just its own",
          "Whether migrations are auto-generated",
          "The size of the library's documentation"
        ],
        answer: 1,
        why: "It is a correctness and throughput constraint rather than a preference, and it rules out the Django ORM for this shape regardless of its other merits. Pattern preference can be satisfied within the surviving list; the concurrency model cannot be satisfied afterwards."
      },
      {
        stem: "What is the strongest argument for a schema-first ORM with a generated client?",
        options: [
          "Generated clients are faster at runtime",
          "One language-neutral schema can generate clients for several languages, so a polyglot system has one definition instead of several that drift",
          "It removes the need to understand SQL",
          "Migrations become unnecessary"
        ],
        answer: 1,
        why: "That is why the approach came out of a polyglot ecosystem. Static checkability without inference is a real second benefit, but it is one that code-first libraries have been closing — SQLAlchemy 2.0's `Mapped[...]` annotations get much of the way there."
      },
      {
        stem: "A team wants to adopt Prisma for a new Python service because of the schema-first workflow. What is the decisive fact?",
        options: [
          "Prisma does not support PostgreSQL",
          "The Python client is archived and unmaintained — last released August 2024, repository archived April 2025 — so the workflow is available but the client is not a supportable dependency",
          "Schema-first modelling does not work in Python",
          "It would be slower than SQLAlchemy"
        ],
        answer: 1,
        why: "The design is sound and the Python implementation is not current, which are separate judgements. If the polyglot schema is the actual requirement, running Prisma's migrations and reading the database from Python with SQLAlchemy keeps both halves supported."
      },
      {
        stem: "An endpoint returns a 50,000-row monthly aggregate and is the slowest in the service. What is the first thing to change?",
        options: [
          "Add an index on every column in the query",
          "Stop returning mapped entities — the aggregate wants columns, and object construction plus identity bookkeeping is pure overhead for rows nothing treats as objects",
          "Switch ORM",
          "Increase the connection pool size"
        ],
        answer: 1,
        why: "This is 13.1's point arriving as a performance bug: the cost is per row and entirely wasted, because the result is serialised straight to JSON. Run it as a Core select or hand-written SQL in the same session, and the transaction semantics are unchanged."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "mid",
        q: "What is the difference between Active Record and Data Mapper?",
        strong: "Active Record puts persistence on the model — `user.save()` — so the model depends on the database. Data Mapper puts it in a separate session or repository, so the model is a plain class and changes are tracked rather than saved. Django's ORM is the first, SQLAlchemy's ORM the second.",
        answer: [
          { t: "p", text: "Naming a library for each is what makes the answer concrete rather than recited, and it is the part most candidates skip." },
          { t: "p", text: "The testability consequence is the sign of real use: a Data Mapper model can be constructed in a unit test with no database, which is why the pattern tends to win in codebases with domain logic worth testing on its own." },
          { t: "p", text: "The strongest version adds that the missing `save()` is not an omission — change tracking requires a session watching the object, so the two patterns trade explicitness for automation in opposite directions." }
        ]
      },
      {
        level: "mid",
        q: "When would you not use an ORM?",
        strong: "Per query rather than per application. The ORM for entities and transactional writes; raw SQL for reports and aggregates where I want columns, for window functions and recursive CTEs where the SQL is the logic, and for bulk operations. I would skip it entirely for a schema I do not own, like a reporting warehouse.",
        answer: [
          { t: "p", text: "Framing it per query rather than as a whole-application choice is the senior answer, and `session.execute(text(...))` inside the same transaction is the mechanism that makes it practical." },
          { t: "p", text: "The not-my-schema case is the one that distinguishes experience: mapping another team's evolving tables into your classes is ongoing work that buys no safety, and saying so shows you have maintained such a mapping." },
          { t: "p", text: "A good answer resists the dogmatic version in both directions. The complaint that ORMs leak is true and does not follow to abandoning them — identity, change tracking and migrations are a lot of correct code that your application is not about." }
        ]
      },
      {
        level: "advanced",
        q: "Walk me through choosing an ORM for a new async Python service.",
        strong: "Concurrency first: async rules out the Django ORM, because its core is synchronous and a sync driver in an async handler blocks the loop for every request. That leaves SQLAlchemy with an async driver, SQLModel on top of it, or Tortoise. Then: do I own the schema, is there real domain logic, and is FastAPI schema duplication a pain I have?",
        answer: [
          { t: "p", text: "Letting a hard constraint narrow the list before expressing any preference is the structure of the answer, and it is what separates a decision from a favourite." },
          { t: "p", text: "Mentioning that SQLModel is SQLAlchemy underneath — so its session semantics, flush behaviour and loading strategies are SQLAlchemy's — shows you know what you are adopting rather than treating it as a third option." },
          { t: "p", text: "Naming what would change your mind is the strongest finish: an existing Django application makes the Django ORM right despite the async cost, and a genuinely polyglot schema is the one case where a schema-first tool earns its build step." }
        ]
      }
    ]
  }
});
