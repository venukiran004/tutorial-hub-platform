/* ============================================================================
   INTERVIEW 17.29 — API Consumption & Webhooks
   ----------------------------------------------------------------------------
   Theory interview questions: the ones you answer out loud. Anything that
   asks for a program lives in the Coding Practice course instead.
   ========================================================================= */
EC.receiveLesson({
 "id": "17.29",
 "lede": "**15 interview questions on api consumption & webhooks**, with the answers folded away. Say your answer out loud first — recognising an answer and being able to give one are different skills, and only the second survives a follow-up.",
 "objectives": [
  "Answer 15 questions on api consumption & webhooks without prompting",
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
   "q": "What is the difference between consuming an API and building one?",
   "terms": [
    "Answer",
    "Building",
    "Consuming",
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
      "**Building** an API (server side) means exposing endpoints that accept requests and return responses — the job of frameworks like FastAPI or Flask.",
      "**Consuming** an API (client side) means acting as the client that *calls* someone else's endpoints over HTTP and processes the response."
     ]
    },
    {
     "t": "p",
     "text": "A single service is usually both: a FastAPI backend (server) that calls a payment provider's REST API (client) to charge a card."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** \"Consuming\" puts you on the client side of HTTP — you make the request and handle the response, retries, auth, and failures."
    }
   ]
  },
  {
   "t": "drill",
   "n": "2",
   "q": "Why use `requests.Session()` instead of calling `requests.get()` directly?",
   "terms": [
    "Answer",
    "Reuses connections",
    "Persists state",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "A bare `requests.get()` opens a brand-new TCP (and TLS) connection every call and throws it away. A `Session`:"
    },
    {
     "t": "ol",
     "items": [
      "**Reuses connections** via an underlying `urllib3` connection pool — big latency win when hitting the same host repeatedly.",
      "**Persists state**headers, cookies, and auth across requests.",
      "Lets you set defaults once (base headers, timeouts via adapters)."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "with requests.Session() as s:\n    s.headers.update({\"Authorization\": \"Bearer TOKEN\"})\n    s.get(\"https://api.example.com/v1/user\")     # connection opened\n    s.get(\"https://api.example.com/v1/profile\")  # connection reused",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Use a `Session` whenever you make more than one request to the same host — it pools connections and persists auth."
    }
   ]
  },
  {
   "t": "drill",
   "n": "3",
   "q": "When should you use `httpx` instead of `requests`?",
   "terms": [
    "Answer",
    "async",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Use `httpx` when you need **async** I/O (e.g. inside FastAPI, an asyncio app, or to fire many requests concurrently). `requests` is synchronous and blocking — calling it inside an `async def` blocks the event loop and destroys concurrency."
    },
    {
     "t": "p",
     "text": "`httpx` offers: - A near-identical sync API to `requests` (easy migration). - A true async client (`httpx.AsyncClient`). - HTTP/2 support, built-in timeouts, and connection pooling."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "async with httpx.AsyncClient(timeout=10.0) as client:\n    responses = await asyncio.gather(\n        client.get(\"https://api.example.com/a\"),\n        client.get(\"https://api.example.com/b\"),\n    )",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** `requests` for simple sync scripts; `httpx` when you're in an async context or need concurrency/HTTP-2."
    }
   ]
  },
  {
   "t": "drill",
   "n": "4",
   "q": "Why must you always set a timeout on outgoing requests?",
   "terms": [
    "Answer",
    "forever",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "By default `requests` waits **forever** for a response. If the remote server hangs (slow, overloaded, or malicious), your thread/worker is blocked indefinitely. Under load this exhausts your worker pool and cascades into a full outage — your service goes down because a *dependency* went down."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "requests.get(url, timeout=5)          # total timeout\nrequests.get(url, timeout=(3, 10))    # (connect timeout, read timeout)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** A missing timeout is one of the most common production outages. Always set one; consider separate connect/read timeouts."
    }
   ]
  },
  {
   "t": "drill",
   "n": "5",
   "q": "What is the difference between `response.raise_for_status()` and checking `status_code`?",
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
      "`response.status_code` lets you branch manually (`if response.status_code == 404: ...`).",
      "`response.raise_for_status()` raises an `HTTPError` automatically for any 4xx/5xx response, so you can rely on `try/except` instead of remembering to check."
     ]
    },
    {
     "t": "p",
     "text": "Note: `requests` only raises for HTTP *error statuses* when you ask it to. A connection failure or timeout raises a different exception (`ConnectionError`, `Timeout`) regardless."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "try:\n    r = requests.get(url, timeout=5)\n    r.raise_for_status()\n    data = r.json()\nexcept requests.HTTPError as e:        # 4xx / 5xx\n    ...\nexcept requests.RequestException as e: # network/timeout/DNS\n    ...",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** `raise_for_status()` converts bad HTTP statuses into exceptions; network-level failures raise separately, so catch `RequestException` as the base."
    }
   ]
  },
  {
   "t": "drill",
   "n": "6",
   "q": "What are common HTTP status codes a client should handle?",
   "terms": [
    "Answer",
    "not",
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
      "Code",
      "Meaning",
      "Client action"
     ],
     "rows": [
      [
       "200 / 201",
       "OK / Created",
       "Success"
      ],
      [
       "204",
       "No Content",
       "Success, no body to parse"
      ],
      [
       "301 / 302",
       "Redirect",
       "Usually followed automatically"
      ],
      [
       "400",
       "Bad Request",
       "Fix the payload; do **not** retry blindly"
      ],
      [
       "401",
       "Unauthorized",
       "Refresh/supply credentials"
      ],
      [
       "403",
       "Forbidden",
       "Permission issue — not retryable"
      ],
      [
       "404",
       "Not Found",
       "Resource missing"
      ],
      [
       "422",
       "Unprocessable Entity",
       "Validation error (common with FastAPI)"
      ],
      [
       "429",
       "Too Many Requests",
       "Back off, honor `Retry-After`"
      ],
      [
       "5xx",
       "Server error",
       "Retry with backoff (often transient)"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Retry only *transient* failures (429, 5xx, network errors). Retrying a 400/401/403 just wastes calls — fix the request instead."
    }
   ]
  },
  {
   "t": "drill",
   "n": "7",
   "q": "How do you implement retries with exponential backoff, and why \"exponential\"?",
   "terms": [
    "Answer",
    "Exponential",
    "jitter",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Retry transient failures with increasing delays so you don't hammer a struggling server. **Exponential** backoff (1s, 2s, 4s, 8s…) spreads load far better than fixed delays. Add **jitter** (randomness) so many clients don't retry in lockstep and create a thundering herd."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from tenacity import retry, stop_after_attempt, wait_exponential\n\n@retry(stop=stop_after_attempt(5),\n       wait=wait_exponential(multiplier=1, min=2, max=30))\ndef fetch():\n    r = requests.get(url, timeout=5)\n    r.raise_for_status()\n    return r.json()",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Exponential backoff + jitter avoids overwhelming a recovering service and prevents synchronized retry storms."
    }
   ]
  },
  {
   "t": "drill",
   "n": "8",
   "q": "What is the difference between polling and webhooks?",
   "terms": [
    "Answer",
    "Polling",
    "Webhooks",
    "pushes",
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
      "**Polling**the client repeatedly asks the server \"is it done yet?\" on a schedule. Simple but wasteful — most calls return \"no change,\" and you trade latency (poll interval) for load.",
      "**Webhooks**the client registers a callback URL once; the server **pushes** an HTTP POST to that URL when an event happens. Near-real-time and far fewer wasted calls."
     ]
    },
    {
     "t": "p",
     "text": "Polling is \"pull\"; webhooks are \"push.\" Webhooks invert the relationship — your app becomes a *server* receiving the provider's request."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Webhooks replace inefficient \"are we there yet?\" polling with event-driven push, at the cost of needing a publicly reachable, secured endpoint."
    }
   ]
  },
  {
   "t": "drill",
   "n": "9",
   "q": "How do you secure a webhook endpoint?",
   "terms": [
    "Answer",
    "Verify the signature",
    "raw bytes",
    "Use the raw body",
    "Check timestamps",
    "Return 2xx fast"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Your webhook URL is public, so anyone could POST fake events. Defenses:"
    },
    {
     "t": "ol",
     "items": [
      "**Verify the signature.** Providers sign the raw request body with a shared secret (usually HMAC-SHA256) and send it in a header (e.g. `Stripe-Signature`). Recompute the HMAC over the **raw bytes** and compare with a constant-time check.",
      "**Use the raw body**, not the parsed JSON — re-serializing changes bytes and breaks the signature.",
      "**Check timestamps** to reject replayed old events.",
      "**Return 2xx fast**, then process asynchronously (offload to a task queue) so the provider doesn't time out and retry."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import hmac, hashlib\n\ndef verify(payload: bytes, signature: str, secret: str) -> bool:\n    expected = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()\n    return hmac.compare_digest(expected, signature)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Always verify the HMAC signature over the raw body with `hmac.compare_digest`, and acknowledge quickly while processing in the background."
    }
   ]
  },
  {
   "t": "drill",
   "n": "10",
   "q": "Why must webhook handlers be idempotent?",
   "terms": [
    "Answer",
    "at-least-once",
    "retry",
    "event ID",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Providers guarantee **at-least-once** delivery: if your endpoint is slow or returns a non-2xx, they **retry**, so the same event can arrive multiple times. If your handler isn't idempotent, you double-charge, double-email, or double-insert."
    },
    {
     "t": "p",
     "text": "Make it idempotent by deduplicating on the provider's **event ID**:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "if already_processed(event[\"id\"]):   # e.g. row in a \"seen_events\" table\n    return {\"status\": \"ok\"}          # ack, do nothing\nprocess(event)\nmark_processed(event[\"id\"])",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Webhooks (and most distributed messaging) are at-least-once — dedupe on a unique event ID so re-delivery is harmless. See [[task-queues-idempotency]]."
    }
   ]
  },
  {
   "t": "drill",
   "n": "11",
   "q": "How do you handle pagination when consuming a large API?",
   "terms": [
    "Answer",
    "Offset/limit",
    "Page number",
    "Cursor / keyset",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "APIs page large result sets. Three common styles:"
    },
    {
     "t": "ul",
     "items": [
      "**Offset/limit**`?limit=100&offset=200` — simple but slow and inconsistent on changing data.",
      "**Page number**`?page=3` — convenient, same drawbacks as offset.",
      "**Cursor / keyset**response returns a `next_cursor` token you pass back — stable and efficient for large/streaming data."
     ]
    },
    {
     "t": "p",
     "text": "Iterate until there's no next page; a generator keeps memory flat:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def fetch_all(url, params):\n    while url:\n        r = requests.get(url, params=params, timeout=10)\n        r.raise_for_status()\n        data = r.json()\n        yield from data[\"items\"]\n        url = data.get(\"next\")     # follow the cursor/next-link\n        params = None",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Detect the pagination style, loop until exhausted, and prefer cursor-based pagination for large datasets; stream with a generator to avoid loading everything in memory."
    }
   ]
  },
  {
   "t": "drill",
   "n": "12",
   "q": "What is rate limiting and how do you respect it as a client?",
   "terms": [
    "Answer",
    "429 Too Many Requests",
    "Retry-After",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "APIs cap how many requests you may send per window (e.g. 100/min). Exceed it and you get **429 Too Many Requests**. To be a good client:"
    },
    {
     "t": "ol",
     "items": [
      "Read rate-limit headers (`X-RateLimit-Remaining`, `X-RateLimit-Reset`).",
      "On a 429, honor the **`Retry-After`** header instead of guessing.",
      "Throttle proactively (token-bucket / leaky-bucket) so you stay under the limit."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "if r.status_code == 429:\n    wait = int(r.headers.get(\"Retry-After\", 1))\n    time.sleep(wait)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Treat 429 as \"slow down,\" obey `Retry-After`, and throttle client-side so you rarely hit the limit at all."
    }
   ]
  },
  {
   "t": "drill",
   "n": "13",
   "q": "What are the common API authentication schemes you'll encounter as a client?",
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
     "t": "table",
     "head": [
      "Scheme",
      "How you send it",
      "Notes"
     ],
     "rows": [
      [
       "API key",
       "Header or query param",
       "Simplest; keep it secret"
      ],
      [
       "Bearer token (OAuth2/JWT)",
       "`Authorization: Bearer <token>`",
       "Tokens expire → refresh them"
      ],
      [
       "Basic auth",
       "`Authorization: Basic base64(user:pass)`",
       "Only over HTTPS"
      ],
      [
       "HMAC signing",
       "Sign request with secret",
       "Used by AWS, some webhooks"
      ],
      [
       "mTLS",
       "Client TLS certificate",
       "High-security, service-to-service"
      ]
     ]
    },
    {
     "t": "p",
     "text": "For OAuth2 you typically exchange credentials for a short-lived access token, send it as a Bearer header, and refresh when it expires (401)."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Most public APIs use API keys or OAuth2 Bearer tokens; store secrets in env/config (never in code), and handle token refresh on 401."
    }
   ]
  },
  {
   "t": "drill",
   "n": "14",
   "q": "How should you store and manage API keys and secrets?",
   "terms": [
    "Answer",
    "Never",
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
      "**Never** commit secrets to source control or hard-code them.",
      "Load from environment variables, a `.env` file (via `python-dotenv` or `pydantic-settings`), or a secrets manager (AWS Secrets Manager, Vault).",
      "Rotate keys periodically and scope them to least privilege.",
      "Add `.env` to `.gitignore`."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from pydantic_settings import BaseSettings\n\nclass Settings(BaseSettings):\n    api_key: str\n    class Config:\n        env_file = \".env\"\n\nsettings = Settings()",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Secrets come from the environment/secret store, never the codebase — `pydantic-settings` gives you typed, validated config loading. See [[best-practices-security]]."
    }
   ]
  },
  {
   "t": "drill",
   "n": "15",
   "q": "What's the difference between connect timeout and read timeout?",
   "terms": [
    "Answer",
    "Connect timeout",
    "Read timeout",
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
      "**Connect timeout**max time to establish the TCP/TLS connection to the server. A short value (2–3s) catches unreachable hosts quickly.",
      "**Read timeout**max time to wait *between bytes* of the response once connected. Set higher for slow but valid endpoints."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "requests.get(url, timeout=(3, 30))  # 3s to connect, 30s to read",
     "numbered": false
    },
    {
     "t": "p",
     "text": "A total/overall timeout (single number) covers both phases combined."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Separate connect and read timeouts let you fail fast on dead hosts while still allowing legitimately slow responses to complete."
    }
   ]
  }
 ],
 "takeaways": []
});
