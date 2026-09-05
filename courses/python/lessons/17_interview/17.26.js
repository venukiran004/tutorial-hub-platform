/* ============================================================================
   INTERVIEW 17.26 — Task Queues & Background Jobs
   ----------------------------------------------------------------------------
   Theory interview questions: the ones you answer out loud. Anything that
   asks for a program lives in the Coding Practice course instead.
   ========================================================================= */
EC.receiveLesson({
 "id": "17.26",
 "lede": "**15 interview questions on task queues & background jobs**, with the answers folded away. Say your answer out loud first — recognising an answer and being able to give one are different skills, and only the second survives a follow-up.",
 "objectives": [
  "Answer 15 questions on task queues & background jobs without prompting",
  "State the trade-off behind each answer, not only the definition",
  "Recognise the follow-up each question is setting up",
  "Notice which answers you can recognise but not produce"
 ],
 "prerequisites": [],
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
      "**Say the trade-off, not just the definition.** Interviewers are listening for judgement, and the follow-up is where it shows.",
      "Coding problems live in the **Coding Practice** course — these are the ones you answer in conversation."
     ]
    }
   ]
  },
  {
   "t": "drill",
   "n": "1",
   "q": "Why do we need task queues / background jobs at all?",
   "terms": [
    "Answer",
    "inside",
    "task queue",
    "workers",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Web requests must return quickly (ideally < a few hundred ms). Heavy work done **inside** the request — sending email, resizing video, calling slow third-party APIs, generating reports — blocks the worker and risks client timeouts. Under load, blocked workers pile up and the whole service stalls."
    },
    {
     "t": "p",
     "text": "A **task queue** offloads that work: the web process enqueues a job and returns immediately, while a separate pool of **workers** processes jobs in the background."
    },
    {
     "t": "p",
     "text": "Client→API→[Broker/Queue]→Workerdoes the heavy work"
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Task queues decouple slow work from the request/response cycle, keeping APIs fast and scalable."
    }
   ]
  },
  {
   "t": "drill",
   "n": "2",
   "q": "What is a message broker and what role does it play?",
   "terms": [
    "Answer",
    "broker",
    "Redis",
    "RabbitMQ",
    "Amazon SQS / GCP Pub/Sub",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "A **broker** is the intermediary store that holds tasks between the producer (your web app) and the consumer (the worker). The producer pushes a message; the broker persists/queues it; a worker pulls it when free."
    },
    {
     "t": "p",
     "text": "Common brokers: - **Redis** — in-memory, extremely fast, simple; can lose data on crash unless persistence is configured. - **RabbitMQ** — full AMQP broker, robust routing, acknowledgements, durability. - **Amazon SQS / GCP Pub/Sub** — managed, cloud-native, scales automatically."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** The broker is the buffer that lets producers and workers run independently and at different speeds — Redis for speed/simplicity, RabbitMQ/SQS for durability and routing."
    }
   ]
  },
  {
   "t": "drill",
   "n": "3",
   "q": "What is the difference between a broker and a result backend in Celery?",
   "terms": [
    "Answer",
    "Broker",
    "Result backend",
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
      "**Broker**the queue that *delivers tasks* from your app to workers (Redis, RabbitMQ).",
      "**Result backend**optional storage where Celery *saves the return value / state* of a task so you can later query `task.status` / `task.get()` (Redis, a database, etc.)."
     ]
    },
    {
     "t": "p",
     "text": "You always need a broker; the result backend is only needed if you care about task results or status. Storing every result can bloat the backend, so disable it when you don't need outcomes (`ignore_result=True`)."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Broker = how tasks get to workers; result backend = where their results are stored. Separate concerns, can use different stores."
    }
   ]
  },
  {
   "t": "drill",
   "n": "4",
   "q": "Compare Celery vs RQ vs FastAPI BackgroundTasks. When do you use each?",
   "terms": [
    "Answer",
    "FastAPI BackgroundTasks",
    "Celery",
    "same",
    "separate",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Tool",
      "Broker",
      "Strengths",
      "Use when"
     ],
     "rows": [
      [
       "**FastAPI `BackgroundTasks`**",
       "None (same process)",
       "Zero infra, dead simple",
       "Light I/O after a response (send one email, write a log)"
      ],
      [
       "**RQ**",
       "Redis only",
       "Simple, easy to read/debug",
       "Straightforward background jobs, small/medium scale"
      ],
      [
       "**Celery**",
       "Redis, RabbitMQ, SQS",
       "Retries, scheduling (beat), routing, chains/groups, huge ecosystem",
       "Complex/large-scale workflows, scheduling, multiple queues"
      ]
     ]
    },
    {
     "t": "p",
     "text": "`BackgroundTasks` runs in the **same** process, so it dies if the server restarts and doesn't help with CPU-bound work. RQ and Celery run in **separate** worker processes, surviving restarts and scaling horizontally."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** `BackgroundTasks` for trivial fire-and-forget I/O, RQ for simple durable jobs, Celery when you need retries, scheduling, and complex workflows."
    }
   ]
  },
  {
   "t": "drill",
   "n": "5",
   "q": "Why must background tasks be idempotent?",
   "terms": [
    "Answer",
    "at-least-once",
    "again",
    "UPSERTs",
    "idempotency key",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Queues guarantee **at-least-once** delivery. If a worker crashes after doing the work but before acknowledging the message, the broker re-queues it and another worker runs it **again**. A non-idempotent task then double-charges a card or sends two emails."
    },
    {
     "t": "p",
     "text": "Make tasks idempotent so running them N times equals running once: - Use database **UPSERTs** instead of blind INSERTs. - Dedupe on a unique job/event key (\"have I already processed `order_123`?\"). - Make external calls with an **idempotency key** when the provider supports it."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** At-least-once delivery means tasks *will* sometimes run twice — design them to be safe under re-execution (same model as webhook delivery)."
    }
   ]
  },
  {
   "t": "drill",
   "n": "6",
   "q": "How do retries work and what is the danger of naive retries?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "When a task fails (e.g. a flaky network call), the queue can re-run it. In Celery:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "@app.task(bind=True, max_retries=3, default_retry_delay=60)\ndef call_api(self, ...):\n    try:\n        ...\n    except Exception as exc:\n        raise self.retry(exc=exc, countdown=2 ** self.request.retries)  # backoff",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Dangers of naive retries: - **No backoff** → you hammer an already-failing dependency. - **No max** → a permanently-broken task retries forever (poison message). - **Non-idempotent task** → each retry causes duplicate side effects."
    },
    {
     "t": "p",
     "text": "Use exponential backoff, a retry cap, and route exhausted tasks to a dead-letter queue."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Retries need backoff, a maximum attempt count, and idempotent tasks — otherwise they amplify failures."
    }
   ]
  },
  {
   "t": "drill",
   "n": "7",
   "q": "What is a dead-letter queue (DLQ)?",
   "terms": [
    "Answer",
    "dead-letter queue",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "A **dead-letter queue** is where messages go when they can't be processed successfully after all retries (a \"poison message\" — malformed data, a permanent bug). Instead of blocking the main queue or looping forever, the failed message is parked in the DLQ for inspection, alerting, and manual replay."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** A DLQ isolates permanently-failing messages so one bad job doesn't clog the pipeline, and gives you a place to debug and replay them."
    }
   ]
  },
  {
   "t": "drill",
   "n": "8",
   "q": "What's the difference between `.delay()` and `.apply_async()` in Celery?",
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
     "t": "ul",
     "items": [
      "`task.delay(arg1, arg2)` — shorthand to enqueue with default options.",
      "`task.apply_async(args=[...], kwargs={...}, countdown=10, queue=\"high\", retry=True, eta=...)` — full control: scheduling (`countdown`/`eta`), target `queue`, priority, retries, etc."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "process_video.delay(123)\nprocess_video.apply_async(args=[123], countdown=30, queue=\"video\")",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** `delay()` is the convenient default; `apply_async()` is the same thing with knobs for delay, routing, and priority."
    }
   ]
  },
  {
   "t": "drill",
   "n": "9",
   "q": "How do you schedule periodic/recurring tasks?",
   "terms": [
    "Answer",
    "Celery Beat",
    "APScheduler",
    "cron",
    "one",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Use a scheduler that enqueues tasks on a clock: - **Celery Beat** — a scheduler process that triggers tasks on intervals or crontab schedules. - **APScheduler** — in-process scheduling for simpler setups. - System **cron** calling a management command (lowest-tech option)."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "app.conf.beat_schedule = {\n    \"nightly-report\": {\n        \"task\": \"tasks.generate_report\",\n        \"schedule\": crontab(hour=2, minute=0),  # 2 AM daily\n    }\n}",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Run **one** Beat process (multiple would double-fire schedules)."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Celery Beat (or APScheduler/cron) provides the timer; keep a single scheduler instance to avoid duplicate triggers."
    }
   ]
  },
  {
   "t": "drill",
   "n": "10",
   "q": "How do task queues let you scale, and what is a concurrency model?",
   "terms": [
    "Answer",
    "more workers",
    "prefork",
    "CPU-bound",
    "eventlet/gevent",
    "I/O-bound"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "You scale by running **more workers** (and more processes/threads per worker) — horizontally across machines. The broker distributes jobs among all available workers."
    },
    {
     "t": "p",
     "text": "Celery worker concurrency models: - **prefork** (default): multiple OS processes — best for **CPU-bound** work, sidesteps the GIL. - **eventlet/gevent**: green threads — best for **I/O-bound** work (many concurrent network calls). - **solo**: single process — debugging only."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Scale by adding workers; pick prefork for CPU-bound tasks and gevent/eventlet for I/O-bound tasks to match the workload."
    }
   ]
  },
  {
   "t": "drill",
   "n": "11",
   "q": "What is task acknowledgement, and what does `acks_late` do?",
   "terms": [
    "Answer",
    "acknowledges",
    "Default (early ack)",
    "lost",
    "acks_late=True",
    "after"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "A worker **acknowledges** (acks) a message to tell the broker \"processed — you can delete it.\""
    },
    {
     "t": "ul",
     "items": [
      "**Default (early ack)**the message is acked as soon as the worker *picks it up*. If the worker then crashes mid-task, the message is **lost**.",
      "**`acks_late=True`**the message is acked only **after** the task finishes. If the worker crashes mid-task, the message is redelivered and runs again — safer, but requires idempotent tasks."
     ]
    },
    {
     "t": "p",
     "text": "**Key takeaway:** `acks_late` trades possible double-execution for guaranteed at-least-once processing; combine it with idempotent tasks for reliability."
    }
   ]
  },
  {
   "t": "drill",
   "n": "12",
   "q": "What data should you pass to a task — the whole object or just an ID?",
   "terms": [
    "Answer",
    "lightweight identifiers (IDs)",
    "staleness",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Pass **lightweight identifiers (IDs)**, not large objects. Messages are serialized (usually JSON) and stored in the broker. Passing a fat object: - Bloats the broker and slows serialization. - Risks **staleness** — by the time the worker runs, the data may have changed."
    },
    {
     "t": "p",
     "text": "Instead, pass the primary key and re-fetch fresh data inside the task:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "@app.task\ndef send_invoice(order_id):          # not the whole Order object\n    order = db.get(Order, order_id)  # fetch current state\n    ...",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Send IDs and re-load inside the worker — smaller messages, always-fresh data, no serialization headaches."
    }
   ]
  },
  {
   "t": "drill",
   "n": "13",
   "q": "How do you monitor and observe task queues in production?",
   "terms": [
    "Answer",
    "Flower",
    "Queue depth",
    "Task latency & failure rate",
    "Structured logging",
    "Alerts"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Flower**web dashboard for Celery (tasks, workers, rates, failures).",
      "**Queue depth** metrics — a growing backlog means workers can't keep up (scale out).",
      "**Task latency & failure rate**exported to Prometheus/Grafana.",
      "**Structured logging** with the task ID for tracing.",
      "**Alerts** on DLQ size, retry spikes, and worker liveness."
     ]
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Watch queue depth, failure/retry rates, and worker health — a silently growing backlog is the classic early warning of an overloaded system."
    }
   ]
  },
  {
   "t": "drill",
   "n": "14",
   "q": "What serialization format should tasks use, and why not `pickle`?",
   "terms": [
    "Answer",
    "JSON",
    "pickle",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Celery's default and recommended serializer is **JSON**. Avoid **`pickle`**: it can execute arbitrary code on deserialization, so a compromised or spoofed broker message becomes remote code execution. JSON is safe and language-agnostic (workers in other languages can read it) but only supports basic types — another reason to pass simple IDs/dicts, not rich objects."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Use JSON serialization for safety and interoperability; never accept `pickle` from an untrusted broker."
    }
   ]
  },
  {
   "t": "drill",
   "n": "15",
   "q": "What happens if the broker (e.g. Redis) goes down?",
   "terms": [
    "Answer",
    "Producers",
    "Workers",
    "In-flight tasks",
    "persistence",
    "lost"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Producers** can't enqueue — calls to `.delay()` fail; your app should degrade gracefully (queue locally, return an error, or retry).",
      "**Workers** can't fetch new tasks and sit idle.",
      "**In-flight tasks** already pulled may finish, but results can't be stored if the backend is also down.",
      "If Redis isn't configured for **persistence** (RDB/AOF), queued-but-unprocessed tasks can be **lost** on restart."
     ]
    },
    {
     "t": "p",
     "text": "Mitigate with broker high-availability (Redis Sentinel/Cluster, RabbitMQ mirroring), persistence, and producer-side error handling."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** The broker is a single point of failure — make it durable and highly available, and handle enqueue failures in the producer."
    }
   ]
  }
 ],
 "takeaways": []
});
