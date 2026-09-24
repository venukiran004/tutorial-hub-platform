/* ============================================================================
   LESSON 6.3 — Artifacts: Files an Agent Produces and Reads
   The service contract, the two versions, the artifact_delta and the two-byte
   session state are executed output from scratchpad/adk/c3.py on
   google-adk 2.9.2.
   ========================================================================= */
EC.receiveLesson({
  id: "6.3",

  lede: "**State is for facts; artifacts are for files.** The moment an agent generates a report, receives an upload, renders a chart or downloads a PDF, you have bytes that must not go in session state — because state is loaded and rewritten on every single turn, and a four-megabyte attachment in it taxes every request for the rest of the conversation. The artifact service is a separate store with versioning built in, addressed by filename, and this lesson saves the same file twice to show what versioning gets you and what the session records about it.",

  objectives: [
    "Say what belongs in an artifact rather than in state or in a tool's return value",
    "Save and load artifacts from a tool, and read the version number back",
    "Explain the session-scoped and user-scoped artifact namespaces",
    "Read an `artifact_delta` on an event and say what it is for",
    "Choose an artifact service for a deployment"
  ],

  prerequisites: ["5.2", "4.2"],

  blocks: [

    { t: "h2", n: "01", text: "The service", id: "service" },

    { t: "code", lang: "python", title: "The contract, introspected",
      code: `import inspect
from google.adk.artifacts import BaseArtifactService
for m in ["save_artifact", "load_artifact", "list_artifact_keys", "list_versions", "delete_artifact"]:
    print(m, inspect.signature(getattr(BaseArtifactService, m)))` },

    { t: "out", text: `save_artifact(self, *, app_name, user_id, filename, artifact: types.Part | dict,
              session_id=None, custom_metadata=None) -> int
load_artifact(self, *, app_name, user_id, filename, session_id=None, version=None) -> types.Part | None
list_artifact_keys(self, *, app_name, user_id, session_id=None) -> list[str]
list_versions(self, *, app_name, user_id, filename, session_id=None) -> list[int]
delete_artifact(self, *, app_name, user_id, filename, session_id=None) -> None` },

    { t: "p", text: "Three things are encoded in those signatures. An artifact is a **`types.Part`** — the same object a model message is made of — so an artifact can be handed straight to the model as an image or a document without conversion. **`save_artifact` returns an `int`**: the version, assigned by the service. And **`session_id` is optional everywhere**, which is the whole namespace design, covered in section 03." },

    { t: "h2", n: "02", text: "Saving from a tool", id: "saving" },

    {"kind": "cells", "title": "One filename, versions assigned by the service", "caption": "Executed: the same tool run twice returned 0 and then 1, and list_versions reported both. load_artifact with no version gives the newest; passing a version gives that one.", "items": ["report.md v0", "report.md v1", "report.md v2"], "highlight": [2], "tone": "accent", "negative": false, "t": "diagram", "id": "dg-6_3-02-0"},



    { t: "code", lang: "python", title: "c3.py — a tool that generates a file",
      code: `async def make_report(title: str, tool_context) -> dict:
    """Generates a report and saves it as an artifact."""
    body = f"# {title}\\n\\nGenerated for {tool_context.user_id}.\\n" + ("data line\\n" * 20)
    part = types.Part.from_bytes(data=body.encode(), mime_type="text/markdown")
    version = await tool_context.save_artifact("report.md", part)
    return {"saved": "report.md", "version": version, "bytes": len(body)}`,
      caption: "`save_artifact` on the context is a coroutine — the tool must be `async` and must await it. Forgetting returns a coroutine object into your result, which then fails to serialise in a way that takes a minute to read." },

    { t: "out", text: `  tool -> {'saved': 'report.md', 'version': 0, 'bytes': 224}
  tool -> {'saved': 'report.md', 'version': 1, 'bytes': 224}
  keys: ['report.md']
  versions: [0, 1]
  loaded mime: text/markdown | bytes: 224
  session state size: 2 bytes (the file is NOT in state)
  artifact_delta on an event: {'report.md': 0}
  artifact_delta on an event: {'report.md': 1}` },

    { t: "p", text: "Run the same tool twice and you get **versions 0 and 1 under one filename**. Nothing was overwritten and nothing had to be named `report_v2.md`: `list_versions` returns both, `load_artifact` without a version returns the latest, and `load_artifact(version=0)` returns the original. Meanwhile the session's state serialises to **two bytes** — an empty dictionary — because not one byte of the file went into it." },

    { t: "callout", kind: "insight", title: "The tool returns the filename, not the file",
      body: [{ t: "p", text: "The model receives `{'saved': 'report.md', 'version': 1, 'bytes': 224}`, which is enough for it to tell the user what happened and to load the file later if asked. What it does not receive is 224 bytes of markdown — or, in the real case, four megabytes of PDF — that it would then be carrying in the conversation history for the rest of the session. This is the pattern for every tool that produces something large: do the work, store it, return a reference." }] },

    { t: "h2", n: "03", text: "Two namespaces", id: "namespaces" },

    { t: "table", head: ["Filename", "Scope", "Reachable from"],
      rows: [
        ["`\"report.md\"`", "This session", "Only this conversation — the default"],
        ["`\"user:passport.jpg\"`", "This user", "Every conversation this person ever has"]
      ] },

    { t: "p", text: "The same `user:` prefix as state, doing the same job: a document the user uploaded once should still be there next week, while a chart generated to answer today's question should not clutter next week's conversation. The service-level signatures make the mechanism explicit — `session_id` is optional, and omitting it addresses the user-scoped namespace." },

    { t: "diagram", kind: "layers", title: "Where a file can live, and what it costs",
      caption: "The rule of thumb: if it has a mime type, it is an artifact. If it is a number, a string or a small dictionary, it is state.",
      items: [
        { label: "Session state", sub: "loaded and written every turn — keep it to facts", tone: "warn" },
        { label: "Session artifacts", sub: "this conversation's files, versioned", tone: "accent" },
        { label: "user: artifacts", sub: "this person's files, across every conversation", tone: "violet" },
        { label: "Your own storage", sub: "anything with a lifecycle of its own — invoices, uploads of record", tone: "good" }
      ] },

    { t: "h2", n: "04", text: "artifact_delta", id: "delta" },

    {"kind": "flow", "title": "A save leaves a trail", "caption": "The same mechanism as state_delta, applied to files. This is what makes 'which turn produced the report the user is complaining about' answerable from the transcript alone.", "cols": 4, "nodes": [{"id": "t", "label": "save_artifact(...)", "sub": "await, inside the tool", "tone": "accent"}, {"id": "s", "label": "Artifact store", "sub": "bytes, versioned", "tone": "violet"}, {"id": "d", "label": "artifact_delta", "sub": "{'report.md': 1}", "tone": "good"}, {"id": "e", "label": "On the event", "sub": "in the session, auditable", "tone": "warn"}], "edges": [["t", "s"], ["s", "d"], ["d", "e"]], "t": "diagram", "id": "dg-6_3-04-1"},



    { t: "p", text: "Each save put `{'report.md': 0}` and then `{'report.md': 1}` on the event the tool produced — the same mechanism as `state_delta` in lesson 5.2, applied to files. The event log therefore records not just that a tool ran but which file version it produced, so 'which turn generated the report the user is complaining about' is answerable from the transcript alone." },

    { t: "callout", kind: "good", title: "This is your provenance trail",
      body: [{ t: "p", text: "A user says the figures in their report are wrong. With `artifact_delta` you can find the event that produced version 3, the tool call that preceded it, the arguments it was given, and the state at that moment — the whole causal chain, from the log. Without it you have a file and a shrug. It costs nothing and it is on by default; the only thing you have to do is not throw the events away." }] },

    { t: "h2", n: "05", text: "Choosing a service", id: "choosing" },

    { t: "table", head: ["Service", "Stores", "Use"],
      rows: [
        ["`InMemoryArtifactService`", "A dictionary in the process", "Tests and the dev UI — lost on restart, not shared between replicas"],
        ["`GcsArtifactService`", "A Google Cloud Storage bucket", "Production: durable, cheap per byte, shared across replicas"],
        ["Your own", "Whatever you implement", "Subclass `BaseArtifactService` — five methods, the same shape as a session service"]
      ] },

    { t: "callout", kind: "trap", title: "No artifact service means no artifacts",
      body: [{ t: "p", text: "The runner takes `artifact_service` the same way it takes `session_service`, and if you do not pass one, `save_artifact` has nowhere to go. It is the same class of omission as forgetting the memory service: the agent looks fine until the first tool that saves a file. Wire it in when you wire the session service, not when you write the tool that needs it." }] },

    { t: "callout", kind: "tradeoff", title: "Artifacts or your own object storage?",
      body: [{ t: "p", text: "Artifacts are the right home for files that belong to the conversation — generated charts, intermediate documents, an upload the agent is working on now. They are addressed by conversation and user, versioned, and tied to the event log. They are the wrong home for files with a lifecycle of their own: an invoice your finance system owns, a document under a retention policy, anything another service needs to read directly. For those, write to your own storage and keep the URL in state. The question to ask is who else needs this file, and for how long." }] },

    { t: "exercise", kind: "practice", title: "Generate, version, retrieve", difficulty: "core", minutes: 22,
      prompt: "Write an async tool that renders a small CSV from data in session state and saves it as an artifact, returning only the filename and version. Run it three times with different data. Then write a second tool that loads a named version and returns a summary of it — not its contents. Confirm the session state never grows, list the versions, and find the artifact_delta entries in the event log.",
      hints: [
        "`types.Part.from_bytes(data=..., mime_type=...)` builds the Part.",
        "Both save_artifact and load_artifact on the context are coroutines — await them.",
        "Compare len(json.dumps(dict(session.state))) before and after; it should not move."
      ],
      solution: {
        code: `async def summarise(filename: str, version: int, tool_context) -> dict:
    """Summarises a saved artifact without returning its contents."""
    part = await tool_context.load_artifact(filename, version=version)
    if part is None:
        return {"error": f"no {filename} at version {version}", "retryable": False}
    data = part.inline_data.data
    return {"filename": filename, "version": version,
            "bytes": len(data), "rows": data.count(b"\\n")}`,
        notes: [
          { t: "p", text: "Returning a summary rather than the contents is the discipline the whole lesson turns on. A tool that returns the CSV puts every row into the conversation history, where it is resent on every subsequent turn — so a file the user asked about once is charged for fifty times. Return the shape of the thing and let the model ask for more if it genuinely needs it." },
          { t: "p", text: "Handling the missing version explicitly matters more than it looks: `load_artifact` returns `None` rather than raising, so a tool that goes straight to `part.inline_data` fails with an `AttributeError` that reaches the model as a stack trace instead of as an explanation. A structured error with `retryable: False` tells the model the version does not exist and to stop asking for it." }
        ]
      } }

  ],

  takeaways: [
    "Artifacts are `types.Part` objects stored by filename, with an integer version returned by every save.",
    "Saving the same filename twice produces versions 0 and 1 — `load_artifact` without a version returns the latest.",
    "Files never touch session state: the executed run's state serialised to two bytes with a file saved.",
    "A `user:` prefix on the filename makes the artifact follow the person across conversations.",
    "Each save records an `artifact_delta` on the event, which is your provenance trail.",
    "Tools should return a filename and a version, never the bytes — returned bytes live in the history forever."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "A tool saves report.md twice in one conversation. What does list_versions return?",
      options: ["['report.md']", "[0, 1]", "[1]", "[0]"],
      answer: 1,
      why: "Versioning is automatic and per filename: the executed run returned 0 from the first save and 1 from the second, and `list_versions` reports both. You never need to invent names like report_v2.md, and the earlier version stays retrievable with `load_artifact(version=0)`." },
    { stem: "Why should a tool that generates a PDF return the filename rather than the bytes?",
      options: ["Bytes cannot be serialised in a function response", "Returned values enter the conversation history and are resent every turn", "The model cannot read binary", "Artifacts are faster to load"],
      answer: 1,
      why: "A function response becomes an event, and events are replayed into every subsequent request. Returning four megabytes once means paying for it on every remaining turn of the conversation. The filename and version are enough for the model to describe what happened and to load the file later if it is actually needed." },
    { stem: "You save an artifact named \"user:passport.jpg\". When is it reachable?",
      options: ["Only in the session that saved it", "In every conversation that user has", "By every user of the app", "Until the session is deleted"],
      answer: 1,
      why: "The `user:` prefix works exactly as it does in state — the artifact is keyed by app and user rather than by session, so it survives into future conversations. That is what you want for an uploaded document and what you do not want for a chart generated to answer one question." },
    { stem: "Your tool calls save_artifact and the result contains a coroutine object. What went wrong?",
      options: ["The artifact service was not registered", "The call was not awaited", "The Part had no mime type", "The filename was invalid"],
      answer: 1,
      why: "`save_artifact` on the context is a coroutine, so the tool must be `async` and must await it. Without the await you store nothing and return an unserialisable object into the function response — an error whose message points at serialisation rather than at the missing keyword, which is why it is worth recognising on sight." }
  ] },

  interview: { title: "Interview", sub: "Artifact questions", questions: [
    { level: "Core", q: "When would you use an artifact instead of session state?",
      strong: "Whenever the thing has a mime type — state is reloaded and rewritten every turn, so files there tax every request.",
      answer: [{ t: "p", text: "State is working memory: a handful of facts, read on every turn, and therefore something you keep small. Artifacts are a separate store for bytes — generated reports, uploads, charts, anything with a mime type — addressed by filename and versioned automatically. The proof that they are genuinely separate is that saving a file leaves session state serialising to an empty dictionary. The rule I give people is that if you would not be happy seeing it in every prompt for the rest of the conversation, it is not state." }] },
    { level: "Core", q: "How does versioning work?",
      strong: "Every save of the same filename returns the next integer; loads default to the latest and can ask for any earlier one.",
      answer: [{ t: "p", text: "You do not manage it. The first save of `report.md` returns 0, the second returns 1, and `list_versions` returns both. `load_artifact` with no version gives you the newest, and passing a version gives you that one. The nice consequence is that regenerating a document is not destructive: the user can be shown the new one while the old one remains retrievable, and each save is recorded as an `artifact_delta` on the event that produced it — so you can trace a particular version back to the tool call and the arguments that made it." }] },
    { level: "Senior", q: "An agent handles uploaded invoices and produces summaries. Design the storage.",
      strong: "Uploads as user-scoped artifacts, working files as session artifacts, the invoice of record in your own system, and only ids in state.",
      answer: [{ t: "p", text: "The uploaded file goes to a `user:`-prefixed artifact, because the user will refer to it again next month and a session-scoped copy would be gone. Intermediate work — a cropped page, an extracted table, a draft summary — goes to session artifacts, where versioning means I can keep every attempt without naming them. The extracted fields go into session state, because they are small facts the rest of the conversation reasons about. What does not live in ADK at all is the invoice as a business record: that belongs in the finance system, with its own retention and its own audit, and state holds its id. Two things I would design in from the start. Deletion: a user asking to remove a document has to reach the artifact store as well as the session and the memory bank, which is three deletes, not one. And provenance: keep the events, because `artifact_delta` plus the preceding tool call is the only thing that answers 'where did the number in version 3 come from' when somebody disputes it." }] }
  ] }
});
