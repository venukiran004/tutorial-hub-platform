/* ============================================================================
   INTERVIEW 17.25 — FastAPI
   ----------------------------------------------------------------------------
   Theory interview questions: the ones you answer out loud. Anything that
   asks for a program lives in the Coding Practice course instead.
   ========================================================================= */
EC.receiveLesson({
 "id": "17.25",
 "lede": "**39 interview questions on fastapi**, with the answers folded away. Say your answer out loud first — recognising an answer and being able to give one are different skills, and only the second survives a follow-up.",
 "objectives": [
  "Answer 39 questions on fastapi without prompting",
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
   "q": "What is FastAPI and why is it \"fast\"?",
   "terms": [
    "Answer",
    "Starlette",
    "Pydantic",
    "Runtime performance",
    "Developer speed",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "FastAPI is a modern Python web framework for building APIs, built on **Starlette** (ASGI) and **Pydantic**. It is \"fast\" in two senses:"
    },
    {
     "t": "ol",
     "items": [
      "**Runtime performance**async-native on ASGI, it reaches throughput comparable to Node.js and Go.",
      "**Developer speed**type hints + Pydantic auto-generate validation, serialization, and OpenAPI docs, removing large amounts of boilerplate."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from fastapi import FastAPI\n\napp = FastAPI()\n\n@app.get(\"/\")\nasync def root():\n    return {\"message\": \"Hello\"}\n# uvicorn main:app --reload  ->  interactive docs at /docs",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** A single type-annotated function gives you validation, serialization, and documentation for free."
    }
   ]
  },
  {
   "t": "drill",
   "n": "2",
   "q": "What is ASGI and how does it differ from WSGI?",
   "terms": [
    "Answer",
    "WSGI",
    "ASGI",
    "Uvicorn",
    "Hypercorn",
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
      "**WSGI** (Flask/Django classic) is synchronous — one request at a time per worker, no native WebSockets.",
      "**ASGI** is asynchronous — supports `async`/`await`, concurrent requests, WebSockets, HTTP/2, and long-lived connections."
     ]
    },
    {
     "t": "p",
     "text": "FastAPI runs on ASGI servers like **Uvicorn** or **Hypercorn**."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** ASGI is what lets FastAPI handle many concurrent I/O-bound requests on a single worker without blocking."
    }
   ]
  },
  {
   "t": "drill",
   "n": "3",
   "q": "How does FastAPI decide if a parameter is a path, query, or body parameter?",
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
      "Declaration",
      "Treated as"
     ],
     "rows": [
      [
       "Name appears in the path string `/items/{id}`",
       "Path parameter"
      ],
      [
       "Simple type (`int`, `str`, `float`, `bool`) not in the path",
       "Query parameter"
      ],
      [
       "A Pydantic model",
       "Request body"
      ]
     ]
    },
    {
     "t": "p",
     "text": "You can override defaults with `Path()`, `Query()`, and `Body()`."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "@app.get(\"/items/{item_id}\")\nasync def read(item_id: int, q: str | None = None):\n    # item_id = path param, q = query param\n    return {\"item_id\": item_id, \"q\": q}",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** The framework infers source from the signature; explicit `Path/Query/Body` only needed for constraints or to override."
    }
   ]
  },
  {
   "t": "drill",
   "n": "4",
   "q": "What happens when you use `def` vs `async def` for an endpoint?",
   "terms": [
    "Answer",
    "external thread pool",
    "Common mistake",
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
      "`async def` runs directly on the event loop. Use it for I/O-bound work with awaitable libraries (async DB/HTTP clients).",
      "`def` is run in an **external thread pool** so it doesn't block the event loop. Use it for CPU-bound work or blocking synchronous libraries."
     ]
    },
    {
     "t": "p",
     "text": "**Common mistake:** calling a blocking library (e.g., `requests`, sync DB driver) inside an `async def` endpoint blocks the whole event loop. Either use `def`, or use an async client."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Pick `async def` only when the work inside is actually awaitable; otherwise plain `def` is safer."
    }
   ]
  },
  {
   "t": "drill",
   "n": "5",
   "q": "What is the role of Pydantic in FastAPI?",
   "terms": [
    "Answer",
    "Validation",
    "Parsing/coercion",
    "Serialization",
    "Schema generation",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Pydantic handles: - **Validation** — incoming JSON is validated against model types/constraints; failures return 422. - **Parsing/coercion** — JSON → typed Python objects. - **Serialization** — Python/ORM objects → JSON via `response_model`. - **Schema generation** — produces the JSON Schema that powers `/docs` and `/openapi.json`."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Item(BaseModel):\n    name: str\n    price: float = Field(gt=0)\n\n@app.post(\"/items\")\nasync def create(item: Item):   # validated automatically\n    return item",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Pydantic is the validation + serialization engine; FastAPI is the routing/HTTP layer that wires it to requests."
    }
   ]
  },
  {
   "t": "drill",
   "n": "6",
   "q": "Explain dependency injection in FastAPI.",
   "terms": [
    "Answer",
    "caches each per request",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "`Depends()` declares a dependency that FastAPI resolves and injects. Dependencies can be: - functions returning a value, - generator functions (`yield`) for setup/teardown, - classes (callable objects)."
    },
    {
     "t": "p",
     "text": "They can depend on other dependencies (sub-dependencies); FastAPI resolves the whole tree, **caches each per request**, and runs teardown after the response."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def get_db():\n    db = SessionLocal()\n    try:\n        yield db\n    finally:\n        db.close()\n\n@app.get(\"/items\")\ndef items(db=Depends(get_db)):\n    return db.query(Item).all()",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** DI gives reusable, composable, easily-overridable building blocks (DB sessions, auth, pagination)."
    }
   ]
  },
  {
   "t": "drill",
   "n": "7",
   "q": "What is `yield` in a dependency and when is it useful?",
   "terms": [
    "Answer",
    "before",
    "after",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "A `yield` dependency runs code **before** the yield (setup) and **after** it (teardown), even if the endpoint raises."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def get_db():\n    db = SessionLocal()\n    try:\n        yield db       # provided to the endpoint\n    finally:\n        db.close()     # always runs after the response",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Perfect for resource lifecycle management — DB sessions, file handles, locks, network clients."
    }
   ]
  },
  {
   "t": "drill",
   "n": "8",
   "q": "How do you implement JWT authentication in FastAPI?",
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
     "t": "ol",
     "items": [
      "Create a `/token` endpoint accepting `OAuth2PasswordRequestForm`; validate credentials and return a signed JWT.",
      "Declare `oauth2_scheme = OAuth2PasswordBearer(tokenUrl=\"token\")`.",
      "Write a `get_current_user` dependency that decodes/verifies the JWT.",
      "Add `Depends(get_current_user)` to protected endpoints."
     ]
    },
    {
     "t": "p",
     "text": "Libraries: `python-jose` (JWT), `passlib[bcrypt]` (password hashing)."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "@app.post(\"/token\")\nasync def login(form: OAuth2PasswordRequestForm = Depends()):\n    user = authenticate(form.username, form.password)\n    if not user:\n        raise HTTPException(400, \"Incorrect credentials\")\n    return {\"access_token\": create_token({\"sub\": user.username}), \"token_type\": \"bearer\"}",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** A JWT is signed, not encrypted — never store secrets in the payload, always use HTTPS, and prefer short expiry + refresh tokens."
    }
   ]
  },
  {
   "t": "drill",
   "n": "9",
   "q": "What is the difference between HTTP 401 and 403?",
   "terms": [
    "Answer",
    "401 Unauthorized",
    "403 Forbidden",
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
      "**401 Unauthorized**authentication is missing or invalid: \"who are you?\" (no token, expired token, bad API key).",
      "**403 Forbidden**authentication succeeded but the user lacks permission: \"I know who you are, but you can't do this\"."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "raise HTTPException(401, \"Invalid token\")          # not logged in\nraise HTTPException(403, \"Insufficient permissions\") # logged in, not allowed",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** 401 = not authenticated; 403 = authenticated but not authorized."
    }
   ]
  },
  {
   "t": "drill",
   "n": "10",
   "q": "How do you handle role-based authorization?",
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
     "text": "Use a dependency factory that returns a checker depending on `get_current_user`."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def require_role(role: str):\n    def checker(user=Depends(get_current_user)):\n        if user.role != role:\n            raise HTTPException(403, \"Forbidden\")\n        return user\n    return checker\n\n@app.get(\"/admin\", dependencies=[Depends(require_role(\"admin\"))])\ndef admin_panel():\n    ...",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Dependency factories let you parametrize authorization while keeping endpoints declarative."
    }
   ]
  },
  {
   "t": "drill",
   "n": "11",
   "q": "What is middleware and how do you add it?",
   "terms": [
    "Answer",
    "every",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Middleware wraps **every** request and response — used for logging, timing, headers, compression, CORS. It runs in registration order inbound and reverse order outbound."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "@app.middleware(\"http\")\nasync def add_timing(request, call_next):\n    start = time.perf_counter()\n    response = await call_next(request)\n    response.headers[\"X-Process-Time\"] = str(time.perf_counter() - start)\n    return response",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Use middleware for cross-cutting request-level concerns; use dependencies for per-endpoint logic."
    }
   ]
  },
  {
   "t": "drill",
   "n": "12",
   "q": "How do you enable CORS, and why is it needed?",
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
     "text": "CORS (Cross-Origin Resource Sharing) controls which browser origins may call your API. Without it, browser requests from another domain are blocked."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from fastapi.middleware.cors import CORSMiddleware\n\napp.add_middleware(\n    CORSMiddleware,\n    allow_origins=[\"https://mysite.com\"],\n    allow_methods=[\"*\"],\n    allow_headers=[\"*\"],\n    allow_credentials=True,\n)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Never combine `allow_origins=[\"*\"]` with `allow_credentials=True` in production — list explicit origins instead."
    }
   ]
  },
  {
   "t": "drill",
   "n": "13",
   "q": "How do you customize error handling?",
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
      "Raise `HTTPException(status_code, detail)` for expected errors.",
      "Register `@app.exception_handler(MyException)` for custom exceptions.",
      "Override `RequestValidationError` to reshape the default 422 body."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "@app.exception_handler(ItemNotFound)\nasync def handler(request, exc):\n    return JSONResponse(status_code=404, content={\"detail\": str(exc)})",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** `HTTPException` for one-off errors; exception handlers for app-wide, reusable error shapes."
    }
   ]
  },
  {
   "t": "drill",
   "n": "14",
   "q": "When should you use `BackgroundTasks` vs Celery?",
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
      "",
      "BackgroundTasks",
      "Celery"
     ],
     "rows": [
      [
       "Runs in",
       "Same process, after response",
       "Separate workers"
      ],
      [
       "Broker",
       "None (in-process)",
       "Redis / RabbitMQ"
      ],
      [
       "Retries",
       "None",
       "Built-in"
      ],
      [
       "Monitoring",
       "None",
       "Flower dashboard"
      ],
      [
       "Best for",
       "Email, logging, light cleanup",
       "Heavy/long jobs, scheduling, reliability"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Key takeaway:** `BackgroundTasks` is lost on crash and has no retries — use Celery/ARQ when durability or heavy processing matters."
    }
   ]
  },
  {
   "t": "drill",
   "n": "15",
   "q": "How do you implement real-time streaming in FastAPI?",
   "terms": [
    "Answer",
    "WebSocket",
    "SSE (Server-Sent Events)",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**WebSocket**bidirectional, persistent. Use for chat and live updates: `@app.websocket(\"/ws\")` with `accept()`, `receive_text()`, `send_text()`, handling `WebSocketDisconnect`.",
      "**SSE (Server-Sent Events)**server-to-client only, over plain HTTP via `StreamingResponse(media_type=\"text/event-stream\")`, yielding `f\"data: {chunk}\\n\\n\"`. Ideal for LLM token streaming."
     ]
    },
    {
     "t": "p",
     "text": "**Key takeaway:** SSE is simpler and one-directional; WebSocket is more powerful but heavier — pick by whether you need client→server messages."
    }
   ]
  },
  {
   "t": "drill",
   "n": "16",
   "q": "How do you handle file uploads?",
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
     "text": "Use `UploadFile = File(...)`. It provides `.filename`, `.content_type`, and async `.read()`/`.write()`/`.seek()`/`.close()`. Internally it uses a `SpooledTemporaryFile` (small files in memory, large files on disk)."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "@app.post(\"/upload\")\nasync def upload(file: UploadFile = File(...)):\n    while chunk := await file.read(1024 * 1024):  # stream large files\n        ...\n    return {\"filename\": file.filename}",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Form/file endpoints require `python-multipart` installed."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Stream large uploads in chunks rather than `await file.read()` of the whole body."
    }
   ]
  },
  {
   "t": "drill",
   "n": "17",
   "q": "How do you integrate SQLAlchemy with FastAPI?",
   "terms": [
    "Answer",
    "models",
    "schemas",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Create the engine + `SessionLocal` in `database.py`.",
      "Define SQLAlchemy **models** (tables).",
      "Define Pydantic **schemas** (API contracts) with `model_config = {\"from_attributes\": True}`.",
      "Provide a `get_db()` `yield` dependency.",
      "Inject `db: Session = Depends(get_db)` into endpoints."
     ]
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Keep ORM models and Pydantic schemas separate; `from_attributes=True` lets a response model read ORM object attributes."
    }
   ]
  },
  {
   "t": "drill",
   "n": "18",
   "q": "What is `from_attributes=True` (formerly `orm_mode`)?",
   "terms": [
    "Answer",
    "attributes",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "It tells a Pydantic model to read data from object **attributes** (`obj.name`) instead of dict keys (`obj[\"name\"]`). This is required when returning SQLAlchemy ORM instances directly as a `response_model`."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class ItemResponse(BaseModel):\n    id: int\n    name: str\n    model_config = {\"from_attributes\": True}",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Without it, returning an ORM object as a Pydantic response model raises a validation error."
    }
   ]
  },
  {
   "t": "drill",
   "n": "19",
   "q": "How do you test a FastAPI application?",
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
     "text": "Use `TestClient` (sync) or `httpx.AsyncClient` + `ASGITransport` (async). Override dependencies with `app.dependency_overrides` to inject test DBs/mocks. Cover happy paths, validation (422), auth (401/403), and not-found (404)."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "client = TestClient(app)\nassert client.get(\"/\").status_code == 200\napp.dependency_overrides[get_db] = override_get_db",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** `dependency_overrides` is the central mechanism for isolating tests from real databases and external services; clear it afterward."
    }
   ]
  },
  {
   "t": "drill",
   "n": "20",
   "q": "What are Lifespan events and why use them?",
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
     "text": "Lifespan replaces the deprecated `on_event(\"startup\"/\"shutdown\")`. It is an async context manager: code before `yield` runs at startup, code after at shutdown."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "@asynccontextmanager\nasync def lifespan(app: FastAPI):\n    app.state.model = load_model()   # startup\n    yield\n    await cleanup()                  # shutdown\n\napp = FastAPI(lifespan=lifespan)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Load expensive resources (ML models, DB pools) once at startup and release them gracefully at shutdown."
    }
   ]
  },
  {
   "t": "drill",
   "n": "21",
   "q": "What is `APIRouter` and why use it?",
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
     "text": "`APIRouter` groups related endpoints into a module (like Flask Blueprints) with a shared `prefix`, `tags`, and dependencies. The main app composes them via `app.include_router()`."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "router = APIRouter(prefix=\"/items\", tags=[\"items\"])\n@router.get(\"/\")\ndef list_items(): ...\napp.include_router(router)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Routers keep large apps modular and independently testable."
    }
   ]
  },
  {
   "t": "drill",
   "n": "22",
   "q": "How do you version an API?",
   "terms": [
    "Answer",
    "URL prefix",
    "Sub-apps",
    "Header-based",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**URL prefix:** `APIRouter(prefix=\"/v1\")`, `APIRouter(prefix=\"/v2\")`.",
      "**Sub-apps:** `app.mount(\"/v2\", v2_app)`.",
      "**Header-based:** inspect an `Accept-Version` header in middleware."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "app.include_router(v1_router)\napp.include_router(v2_router)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** URL-prefix versioning is the most common and discoverable; mount sub-apps when versions diverge heavily."
    }
   ]
  },
  {
   "t": "drill",
   "n": "23",
   "q": "What is `response_model_exclude_unset` and when is it used?",
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
     "text": "When `True`, the response includes only fields the client explicitly set, omitting unchanged defaults. It is especially useful for `PATCH` responses where you don't want to echo back default values."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "@app.get(\"/items/{id}\", response_model=Item, response_model_exclude_unset=True)\ndef read(id: int): ...",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Trims payloads to \"what was actually provided\"; pairs well with `model_dump(exclude_unset=True)` for partial updates."
    }
   ]
  },
  {
   "t": "drill",
   "n": "24",
   "q": "What is the difference between PUT and PATCH?",
   "terms": [
    "Answer",
    "PUT",
    "entire",
    "PATCH",
    "partial",
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
      "**PUT** replaces the **entire** resource — fields omitted in the body may be removed/reset. Idempotent.",
      "**PATCH** applies a **partial** update — only provided fields change. Usually idempotent."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# PATCH pattern:\nupdate_data = payload.model_dump(exclude_unset=True)\nfor k, v in update_data.items():\n    setattr(stored, k, v)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** PUT = full replace, PATCH = partial update; use `exclude_unset=True` to implement PATCH correctly."
    }
   ]
  },
  {
   "t": "drill",
   "n": "25",
   "q": "Offset vs cursor pagination — when to use which?",
   "terms": [
    "Answer",
    "Offset",
    "Cursor",
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
      "**Offset** (`?page=5&size=20`): lets users jump to arbitrary pages (admin tables), but `OFFSET 100000` scans 100k rows and results shift when rows are inserted.",
      "**Cursor** (`?cursor=abc&size=20`): always fast (indexed `WHERE id > ?`), consistent under inserts, ideal for infinite scroll — but can't jump to an arbitrary page."
     ]
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Cursor pagination scales to large datasets; offset is fine for small/bounded data where page-jumping matters."
    }
   ]
  },
  {
   "t": "drill",
   "n": "26",
   "q": "How does FastAPI auto-generate documentation?",
   "terms": [
    "Answer",
    "OpenAPI 3.x schema",
    "Swagger UI",
    "ReDoc",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "At runtime FastAPI builds an **OpenAPI 3.x schema** from type hints + Pydantic models, served at `/openapi.json`. **Swagger UI** (`/docs`) and **ReDoc** (`/redoc`) render that schema interactively."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Docs are derived from your code, so they stay in sync automatically — no separate documentation step."
    }
   ]
  },
  {
   "t": "drill",
   "n": "27",
   "q": "Explain the FastAPI request lifecycle.",
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
     "t": "code",
     "lang": "text",
     "code": "Client request\n  -> ASGI server (Uvicorn)\n  -> Middleware stack (in order)\n  -> Route matching\n  -> Dependency resolution (+ sub-dependencies, cached per request)\n  -> Request validation (Pydantic)\n  -> Endpoint function\n  -> Response serialization (response_model)\n  -> Middleware stack (reverse order)\n  -> Client response",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Dependencies and validation run before your handler; middleware brackets the entire flow on both sides."
    }
   ]
  },
  {
   "t": "drill",
   "n": "28",
   "q": "What is rate limiting and how do you implement it?",
   "terms": [
    "Answer",
    "Redis",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Rate limiting caps requests per client per window (returning 429), preventing abuse, brute force, and resource exhaustion. Common algorithms: fixed window, sliding window, token bucket (allows bursts; used by AWS/Stripe), leaky bucket (smooths; used by Nginx)."
    },
    {
     "t": "p",
     "text": "In FastAPI, use `slowapi` for single-instance, or a **Redis** counter (`INCR` + `EXPIRE`) for distributed limits across multiple app instances."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** In-memory limiters don't work across multiple workers/instances — use a shared store like Redis for distributed enforcement."
    }
   ]
  },
  {
   "t": "drill",
   "n": "29",
   "q": "How do you handle environment-specific configuration?",
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
     "text": "Use `pydantic-settings` `BaseSettings`, which resolves values in priority: constructor args > environment variables > `.env` file > field defaults. Supports nested config via `env_nested_delimiter` and secrets from files."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class Settings(BaseSettings):\n    database_url: str\n    debug: bool = False\n    model_config = SettingsConfigDict(env_file=\".env\")",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Keep secrets and environment differences out of code; let `BaseSettings` layer env vars over typed defaults."
    }
   ]
  },
  {
   "t": "drill",
   "n": "30",
   "q": "How do you serve an ML model with FastAPI?",
   "terms": [
    "Answer",
    "once",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "Load the model **once** at startup via `lifespan` (not per request).",
      "Define Pydantic request/response schemas for typed I/O.",
      "Use async endpoints or background tasks for inference; SSE/`StreamingResponse` for LLM token streaming.",
      "Add health checks, rate limiting, and a batch endpoint for throughput.",
      "For GPU models, prefer a single worker with an async queue rather than many workers competing for the GPU."
     ]
    },
    {
     "t": "p",
     "text": "**Key takeaway:** \"Load once, serve many\" — startup loading plus validated schemas and streaming responses make FastAPI a strong model-serving layer."
    }
   ]
  },
  {
   "t": "drill",
   "n": "31",
   "q": "What deployment setup do you use in production?",
   "terms": [
    "Answer",
    "Gunicorn",
    "Uvicorn workers",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Run **Gunicorn** managing **Uvicorn workers** (`gunicorn -k uvicorn.workers.UvicornWorker -w <2*cores+1>`), packaged in a slim multi-stage Docker image with a non-root user, fronted by Nginx/Traefik for HTTPS and load balancing. Add health checks, env-based config, structured JSON logging, and graceful shutdown via lifespan."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Uvicorn for the ASGI loop, Gunicorn for process management, reverse proxy for TLS/load balancing — that is the canonical production stack."
    }
   ]
  },
  {
   "t": "drill",
   "n": "32",
   "q": "REST vs gRPC — when would you choose gRPC?",
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
     "text": "gRPC uses Protocol Buffers (binary) over HTTP/2 with strict `.proto` contracts and built-in code generation; it is far faster than JSON/REST and supports four streaming patterns (unary, server, client, bidirectional). Use it for internal microservice-to-microservice traffic and low-latency streaming. Use REST for public APIs, browser clients, and quick prototyping. A common hybrid: FastAPI as the external REST gateway calling internal gRPC services."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** REST for public/browser-facing APIs; gRPC for high-performance internal service communication."
    }
   ]
  },
  {
   "t": "drill",
   "n": "33",
   "q": "Why FastAPI over Flask or Django?",
   "terms": [
    "Answer",
    "FastAPI",
    "Django",
    "Flask",
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
      "Aspect",
      "Flask",
      "Django (REST)",
      "FastAPI"
     ],
     "rows": [
      [
       "Server model",
       "WSGI (sync)",
       "WSGI (sync; async since 4.1)",
       "ASGI (async-native)"
      ],
      [
       "Validation",
       "None built-in",
       "DRF serializers",
       "Pydantic + type hints"
      ],
      [
       "Auto docs",
       "Via extensions",
       "DRF browsable API",
       "OpenAPI `/docs` + `/redoc`"
      ],
      [
       "DI",
       "None",
       "None",
       "Built-in `Depends()`"
      ],
      [
       "Best for",
       "Simple apps, existing code",
       "Full web apps (ORM, admin, auth)",
       "APIs, microservices, ML serving"
      ]
     ]
    },
    {
     "t": "p",
     "text": "Choose **FastAPI** for APIs and ML serving, **Django** for batteries-included full web apps with an admin panel, **Flask** for tiny projects or existing Flask codebases."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** FastAPI wins on async performance, automatic validation, and free interactive docs; Django wins on batteries-included breadth."
    }
   ]
  },
  {
   "t": "drill",
   "n": "34",
   "q": "What are the four gRPC communication patterns?",
   "terms": [
    "Answer",
    "Unary",
    "Server streaming",
    "Client streaming",
    "Bidirectional streaming",
    "Key takeaway"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ol",
     "items": [
      "**Unary**single request → single response (like REST).",
      "**Server streaming**single request → a stream of responses.",
      "**Client streaming**a stream of requests → single response.",
      "**Bidirectional streaming**streams in both directions simultaneously over one HTTP/2 connection."
     ]
    },
    {
     "t": "p",
     "text": "**Key takeaway:** gRPC's streaming patterns (built on HTTP/2 multiplexing) are its key advantage over plain request/response REST."
    }
   ]
  },
  {
   "t": "drill",
   "n": "35",
   "q": "What HTTP headers should a rate-limited API return?",
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
     "t": "code",
     "lang": "text",
     "code": "X-RateLimit-Limit: 100          # max requests allowed in the window\nX-RateLimit-Remaining: 42       # requests left in the current window\nX-RateLimit-Reset: 1625478900   # Unix timestamp when the window resets\nRetry-After: 30                 # seconds to wait (sent on a 429 response)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Surface the quota, remaining budget, and reset time so well-behaved clients can self-throttle instead of hammering into 429s."
    }
   ]
  },
  {
   "t": "drill",
   "n": "36",
   "q": "Rate limiting vs throttling — what's the difference?",
   "terms": [
    "Answer",
    "Rate limiting",
    "rejects",
    "Throttling",
    "slows or queues",
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
      "**Rate limiting** enforces a hard quota and **rejects** excess requests with `429 Too Many Requests`. Goal: abuse prevention and fair usage.",
      "**Throttling** **slows or queues** requests so processing stays under a target rate (delayed, not rejected). Goal: traffic smoothing."
     ]
    },
    {
     "t": "p",
     "text": "API gateways (AWS API Gateway, Kong, NGINX, Apigee) commonly implement both at the edge."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Rate limiting says \"no\" (429); throttling says \"wait.\""
    }
   ]
  },
  {
   "t": "drill",
   "n": "37",
   "q": "What performance optimizations apply to a FastAPI app?",
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
     "t": "ol",
     "items": [
      "Use `async def` for I/O-bound endpoints with awaitable libraries (async DB/HTTP).",
      "Use database connection pooling (SQLAlchemy `pool_size` / `max_overflow`).",
      "Cache expensive results (Redis, or in-process TTL cache) and add ETags.",
      "Trim payloads with `response_model_exclude_unset=True`.",
      "Enable `GZipMiddleware` for large responses.",
      "Run multiple workers (`--workers N`, typically `2 x cores + 1`).",
      "Profile with a timing-header middleware; load expensive resources once via `lifespan`."
     ]
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Most wins come from correct async usage, connection pooling, caching, and right-sized worker counts — not micro-optimizing handler code."
    }
   ]
  },
  {
   "t": "drill",
   "n": "38",
   "q": "How do you handle graceful shutdown?",
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
     "text": "Use `lifespan` (the async context manager): code before `yield` runs at startup, code after `yield` runs at shutdown. On shutdown, close DB connections/pools, flush caches, and let in-flight background tasks finish."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "@asynccontextmanager\nasync def lifespan(app: FastAPI):\n    await database.connect()\n    yield\n    await database.disconnect()\n\napp = FastAPI(lifespan=lifespan)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Behind Gunicorn/Uvicorn, SIGTERM triggers a graceful drain so the shutdown code runs before the process exits."
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Put startup/teardown of expensive resources in `lifespan` so shutdown cleanly releases connections instead of dropping them."
    }
   ]
  },
  {
   "t": "drill",
   "n": "39",
   "q": "PUT vs PATCH, and URL vs URI?",
   "terms": [
    "Answer",
    "PUT",
    "entire",
    "PATCH",
    "only",
    "URI"
   ],
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**PUT** replaces the **entire** resource (omitted fields may be removed); **PATCH** updates **only** the provided fields. Implement PATCH with `payload.model_dump(exclude_unset=True)`. Both are (usually) idempotent.",
      "**URI** *identifies* a resource (`/user/123`, `urn:isbn:...`); a **URL** is a URI that also specifies *how/where* to reach it (`https://host/users/123`). Every URL is a URI, not vice versa."
     ]
    },
    {
     "t": "p",
     "text": "**Key takeaway:** PUT = full replace, PATCH = partial update; every URL is a URI but a URI need not be a URL."
    }
   ]
  }
 ],
 "takeaways": []
});
