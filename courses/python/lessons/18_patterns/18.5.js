/* ============================================================================
   DESIGN PATTERNS 18.5 — Architectural Patterns
   ----------------------------------------------------------------------------
   Pattern and SOLID questions, gathered here from the interview sets so the
   subject lives in one place. Coding problems live in Coding Practice.
   ========================================================================= */
EC.receiveLesson({
 "id": "18.5",
 "lede": "**9 interview questions on architectural patterns**, with the answers folded away. Say your answer out loud first — recognising an answer and being able to give one are different skills, and only the second survives a follow-up.",
 "objectives": [
  "Answer 9 questions on architectural patterns without prompting",
  "Name the force each pattern resolves, not only its shape",
  "Say when the pattern is the wrong choice",
  "Give the Python-idiomatic form rather than the textbook one"
 ],
 "prerequisites": [
  "4.11",
  "4.12"
 ],
 "blocks": [
  {
   "t": "callout",
   "kind": "note",
   "title": "How to use this set",
   "body": [
    {
     "t": "ul",
     "items": [
      "**Answer out loud before revealing.** An answer you can only recognise is one you cannot give under pressure.",
      "**Name the force the pattern resolves.** \"It decouples things\" is not an answer; \"it stops the conditional growing every time we add a payment provider\" is.",
      "**Be willing to say \"none of them\".** The strongest answer to a pattern question is often a function, a dict, or a generator."
     ]
    }
   ]
  },
  {
   "t": "drill",
   "n": "1",
   "q": "What is Dependency Injection and how does it improve testability?",
   "terms": [
    "Answer",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "DI means passing collaborators into an object rather than constructing them inside it."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Pipeline:\n    def __init__(self, loader, model): self.loader, self.model = loader, model",
     "numbered": false
    },
    {
     "t": "p",
     "text": "In tests you inject mocks/fakes for `loader` and `model` with no changes to `Pipeline`, isolating the unit under test."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** DI removes hard-coded dependencies, making components swappable and tests fast and deterministic."
    }
   ]
  },
  {
   "t": "drill",
   "n": "2",
   "q": "What is the Repository pattern, and how does Unit of Work extend it?",
   "terms": [
    "Answer",
    "Repository",
    "Unit of Work",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "A **Repository** exposes a collection-like interface (`find_by_id`, `find_all`, `save`, `delete`) over a data store, so business logic never touches SQL/ORM details and can be tested with an in-memory implementation."
    },
    {
     "t": "p",
     "text": "A **Unit of Work** sits alongside it: it tracks new/dirty/removed entities and flushes them in a single atomic `commit()` (or discards via `rollback()`)."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "uow = UnitOfWork()\nuow.register_new(User(name=\"Bob\"))\nuow.register_dirty(existing_user)\nuow.commit()      # one transactional batch: INSERTs then UPDATEs",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Repository decouples domain from persistence; Unit of Work groups multiple repository changes into one transaction."
    }
   ]
  },
  {
   "t": "drill",
   "n": "3",
   "q": "Explain the Circuit Breaker pattern and its three states.",
   "terms": [
    "Answer",
    "CLOSED",
    "OPEN",
    "HALF_OPEN",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "A Circuit Breaker guards calls to a failing dependency. It has three states: - **CLOSED:** calls pass through; failures are counted. - **OPEN:** after `failure_threshold` failures, calls fail fast (no call to the dependency) until `recovery_timeout` elapses. - **HALF_OPEN:** after the timeout, one probe call is allowed; success → CLOSED, failure → OPEN again."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "cb = CircuitBreaker(failure_threshold=3, recovery_timeout=5)\ncb.call(remote_api, payload)   # raises fast if the circuit is OPEN",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** It prevents cascading failures and lets a struggling dependency recover instead of being hammered with retries."
    }
   ]
  },
  {
   "t": "drill",
   "n": "4",
   "q": "What is the Saga pattern and when do you use it?",
   "terms": [
    "Answer",
    "compensating action",
    "in reverse order",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "A Saga manages a distributed transaction as a sequence of local steps, each with a **compensating action**. If a step fails, the saga runs the compensations of the already-completed steps **in reverse order** — there is no global rollback."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "saga.add_step(\"charge\",  charge_fn,  refund_fn)\nsaga.add_step(\"ship\",    ship_fn,    cancel_fn)\nsaga.run(context)   # ship fails → refund runs automatically",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Use it across microservices/aggregates where a single ACID transaction isn't possible; correctness comes from compensations, and the system is eventually consistent."
    }
   ]
  },
  {
   "t": "drill",
   "n": "5",
   "q": "What is CQRS, and how does it relate to Event Sourcing?",
   "terms": [
    "Answer",
    "CQRS",
    "applying/projecting events",
    "Event Sourcing",
    "replaying",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "**CQRS** (Command Query Responsibility Segregation) separates the write side (commands that mutate state, often emitting events) from the read side (a query-optimized model). The read model is built by **applying/projecting events** from the write side."
    },
    {
     "t": "p",
     "text": "**Event Sourcing** persists state as an append-only event log; current state is derived by **replaying** events. They pair naturally: events from event sourcing feed CQRS read models."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "for event in write_model.events:   # project onto the read model\n    read_model.apply(event)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** CQRS optimizes reads and writes independently; Event Sourcing gives a full audit trail and time-travel. Both introduce eventual consistency between write and read."
    }
   ]
  },
  {
   "t": "drill",
   "n": "6",
   "q": "How would you design an extensible Plugin System in Python?",
   "terms": [
    "Answer",
    "registers",
    "hooks",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Define an abstract `Plugin` interface (`name`, `execute`), and a `PluginManager` that **registers** plugins into a dict and invokes them by name — optionally chaining them or firing **hooks** at named extension points. Plugins can be discovered dynamically with `importlib`."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "pm.register(UppercasePlugin())\npm.execute_chain([\"uppercase\", \"reverse\"], \"hello\")",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** It's the Factory/registry idea applied to extensibility — the core fires hooks; third parties add behavior without editing the core (Open/Closed)."
    }
   ]
  },
  {
   "t": "drill",
   "n": "7",
   "q": "What does a Dependency Injection Container add over manual constructor injection?",
   "terms": [
    "Answer",
    "DI container",
    "singletons",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Manual DI (passing collaborators into constructors) is simplest, but with deep graphs the wiring becomes tedious. A **DI container** maps names → factories, **resolves transitive dependencies recursively**, and manages lifetimes (cache **singletons** vs create per-resolve)."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "c.register(\"logger\",   lambda c: Logger(), singleton=True)\nc.register(\"database\", lambda c: Database(c.resolve(\"logger\")), singleton=True)\nc.resolve(\"user_service\")   # wires the whole graph automatically",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** A container automates wiring and lifetime management for large graphs; for small apps, plain constructor injection is preferable."
    }
   ]
  },
  {
   "t": "drill",
   "n": "8",
   "q": "Pipeline vs Chain of Responsibility — how do they differ?",
   "terms": [
    "Answer",
    "Pipeline (pipes & filters)",
    "every",
    "Chain of Responsibility",
    "one handles it",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Pipeline (pipes & filters):** runs **every** step in order, each transforming the data and passing the result on.",
      "**Chain of Responsibility:** passes a request along handlers until **one handles it** (or all decline); not primarily about transforming data."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "pipeline | clean | tokenize | remove_stopwords   # all steps run, data flows\nauth.set_next(validate).set_next(handler)         # stops at first handler",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Pipeline = transform-everything sequence; CoR = first-responsible-handler dispatch."
    }
   ]
  },
  {
   "t": "drill",
   "n": "9",
   "q": "What is a circuit breaker and when would you use one?",
   "terms": [
    "Answer",
    "circuit breaker",
    "Closed",
    "Open",
    "Half-open",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "A **circuit breaker** stops sending requests to a dependency that is clearly failing, instead of retrying into a black hole. Like an electrical breaker it has three states:"
    },
    {
     "t": "ul",
     "items": [
      "**Closed**calls flow normally; failures are counted.",
      "**Open**after too many failures it \"trips\" — calls fail fast immediately (no network call) for a cooldown period.",
      "**Half-open**after cooldown it lets a few trial calls through; success closes the circuit, failure re-opens it."
     ]
    },
    {
     "t": "p",
     "text": "This prevents a failing downstream service from tying up all your workers and gives it room to recover."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Retries handle *transient* blips; circuit breakers handle a dependency that's *down* — fail fast and protect your own service from cascading failure."
    }
   ]
  }
 ],
 "takeaways": []
});
