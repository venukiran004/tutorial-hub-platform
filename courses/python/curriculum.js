/* ============================================================================
   PYTHON — CURRICULUM
   ----------------------------------------------------------------------------
   The spine of the course: what is taught, in what order, and why that order.

   Ordering rules this sequence follows:
     1. Nothing is used before it is taught. Comprehensions come after loops
        and after functions-as-values, not in the "syntax" chapter.
     2. Mental model before syntax. How Python binds names is taught before
        mutability, because mutability bugs are name-binding bugs.
     3. Craft before depth. A learner writes clean, idiomatic Python (L5-L7)
        before meeting descriptors and metaclasses (L8) — otherwise the
        advanced material becomes trivia instead of judgement.
     4. Testing before performance and concurrency. You cannot safely optimise
        or parallelise code you cannot verify.
     5. Applied tracks last. FastAPI, databases and the AI/ML stack are taught
        as applications of the language, not as replacements for it.

   `tier` marks how much of a working engineer's day a topic really occupies:
     must   — you cannot ship Python without it
     should — expected of a mid-level engineer
     adv    — reached for deliberately, a few times a year
     expert — library-author and framework-internals territory
   ========================================================================= */
(function () {
  "use strict";

  EC.defineCourse({
    id: "python",
    title: "Python",
    subtitle: "From syntax to production systems",
    short: "PY",
    tagline: "The language, the craft, and the engineering judgement around it.",

    /* Two tracks. "learn" teaches the language; "practice" builds the reflex.
       They are numbered and navigated independently but share one design
       system, one rail and one search index. */
    trackLabels: { learn: "Python", practice: "Coding Practice" },
    trackBlurbs: {
      learn: "The language itself — mental models, craft, and the engineering judgement around them.",
      practice: "Problem sets that build fluency — a pattern briefing, then problems that ramp to interview grade."
    },

    /* Lessons with an authored file in lessons/. Everything else renders as
       "soon" in the rail and the curriculum, so the roadmap is visible in full
       without ever promising content that is not there yet. Add an id here the
       moment its lesson file lands — this is the single switch. */
    published: ["1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "1.7", "1.8", "1.9", "2.1", "2.2", "2.3", "2.4", "2.5", "2.6", "2.7", "2.8", "2.9", "2.10", "2.11", "3.1", "3.2", "3.3", "3.4", "3.5", "3.6", "3.7", "3.8", "3.9", "4.1", "4.2", "4.3", "4.4", "4.5", "4.6", "4.7", "4.8", "4.9", "4.10", "4.11", "4.12", "5.1", "5.2", "5.3", "5.4", "5.5", "5.6", "5.7", "5.8", "5.9", "5.10", "5.11", "5.12", "6.1", "6.2", "6.3", "6.4", "6.5", "6.6", "7.1", "7.2", "7.3", "7.4", "7.5", "7.6", "7.7", "7.8", "8.1", "8.2", "8.3", "8.4", "8.5", "8.6", "8.7", "8.8", "8.9", "9.1", "9.2", "9.3", "9.4", "9.5", "9.6", "10.1", "10.2", "p1.1"],

    modules: [

      /* ==================================================================
         PHASE 1 — FUNDAMENTALS
         ================================================================== */
      {
        id: "foundations",
        short: "L1",
        phase: "Phase 1 · Fundamentals",
        title: "Python Foundations",
        blurb: "How Python actually executes code, and the value model everything else is built on.",
        outcome: "You can read a piece of Python and predict what it does — including the parts that surprise people.",
        lessons: [
          { id: "1.1", title: "How Python Actually Runs Your Code", difficulty: "foundation", minutes: 32, tier: "must",
            summary: "Source to tokens to AST to bytecode to the evaluation loop — and why every performance, GIL and typing question traces back to this pipeline.",
            keywords: ["cpython", "bytecode", "interpreter", "pvm", "dis", "compile", "pyc"] },
          { id: "1.2", title: "The Python Ecosystem and Which Python You Are Running", difficulty: "foundation", minutes: 26, tier: "must",
            summary: "CPython vs PyPy vs the rest, version policy, release cadence, and why 'it works on my machine' is almost always this lesson.",
            keywords: ["cpython", "pypy", "versions", "3.12", "3.13", "release"] },
          { id: "1.3", title: "A Professional Local Setup", difficulty: "foundation", minutes: 30, tier: "must",
            summary: "Interpreter management, virtual environments from first principles, VS Code and Jupyter configured the way a team would expect.",
            keywords: ["install", "venv", "uv", "pyenv", "vscode", "jupyter", "repl"] },
          { id: "1.4", title: "Names, Objects and References", difficulty: "foundation", minutes: 34, tier: "must",
            summary: "Assignment binds names to objects; it does not copy values. The single most load-bearing idea in the language.",
            keywords: ["variables", "id", "reference", "binding", "identity", "is", "aliasing"] },
          { id: "1.5", title: "Numbers, Booleans and None", difficulty: "foundation", minutes: 28, tier: "must",
            summary: "Arbitrary-precision ints, IEEE-754 floats and the money bug, bool as an int subclass, and what None actually signals.",
            keywords: ["int", "float", "decimal", "bool", "none", "precision", "rounding"] },
          { id: "1.6", title: "Strings and Text", difficulty: "foundation", minutes: 38, tier: "must",
            summary: "Unicode vs bytes, encoding boundaries, f-strings and format specs, and the string methods worth memorising.",
            keywords: ["str", "unicode", "encode", "decode", "f-string", "format", "bytes"] },
          { id: "1.7", title: "Operators, Expressions and Truthiness", difficulty: "foundation", minutes: 24, tier: "must",
            summary: "Precedence, short-circuiting, chained comparisons, identity vs equality, and what Python considers false.",
            keywords: ["operators", "truthiness", "precedence", "is", "==", "short-circuit"] },
          { id: "1.8", title: "Type Conversion and the Dynamic Type System", difficulty: "foundation", minutes: 26, tier: "must",
            summary: "Explicit conversion, implicit coercion, type vs isinstance, and the first sighting of duck typing.",
            keywords: ["cast", "isinstance", "type", "duck typing", "coercion"] },
          { id: "1.9", title: "Input, Output and Reading a Traceback", difficulty: "foundation", minutes: 26, tier: "must",
            summary: "print beyond the basics, stdin, and the skill nobody teaches: reading a traceback from the bottom up.",
            keywords: ["print", "input", "traceback", "stderr", "breakpoint", "debug"] }
        ]
      },

      {
        id: "core",
        short: "L2",
        phase: "Phase 1 · Fundamentals",
        title: "Core Data Structures & Control Flow",
        blurb: "The four containers you will use every day, and the cost of choosing the wrong one.",
        outcome: "You pick the right container by reflex and can defend the choice with complexity, not vibes.",
        lessons: [
          { id: "2.1", title: "Lists", difficulty: "foundation", minutes: 34, tier: "must",
            summary: "Dynamic arrays: growth strategy, why append is amortised O(1) and insert(0) is a trap.",
            keywords: ["list", "append", "insert", "amortised", "dynamic array"] },
          { id: "2.2", title: "Tuples, Sets and Frozensets", difficulty: "foundation", minutes: 30, tier: "must",
            summary: "Tuples as records not frozen lists; sets as hash-backed membership; when frozenset earns its place.",
            keywords: ["tuple", "set", "frozenset", "hashable", "membership"] },
          { id: "2.3", title: "Dictionaries", difficulty: "foundation", minutes: 36, tier: "must",
            summary: "The data structure Python is built out of — hashing, insertion order, views, and the dict methods that replace whole loops.",
            keywords: ["dict", "hash", "get", "setdefault", "views", "ordered"] },
          { id: "2.4", title: "Indexing, Slicing and Copying", difficulty: "foundation", minutes: 30, tier: "must",
            summary: "Slice semantics, negative indices, and the shallow-vs-deep copy bug that reaches production more than any other.",
            keywords: ["slice", "index", "copy", "deepcopy", "shallow", "mutation"] },
          { id: "2.5", title: "Mutability: The Rules That Actually Apply", difficulty: "core", minutes: 30, tier: "must",
            summary: "Which objects mutate, what that does to arguments, defaults and class attributes, and how to design around it.",
            keywords: ["mutable", "immutable", "default argument", "shared state"] },
          { id: "2.6", title: "Conditionals and Branching", difficulty: "foundation", minutes: 24, tier: "must",
            summary: "if/elif/else, the conditional expression, guard clauses, and flattening the arrow anti-pattern.",
            keywords: ["if", "elif", "ternary", "guard clause", "branching"] },
          { id: "2.7", title: "Loops: for, while, break, continue, else", difficulty: "foundation", minutes: 30, tier: "must",
            summary: "Iteration over iterables rather than indices, loop-else (and when it is genuinely useful), and infinite-loop discipline.",
            keywords: ["for", "while", "break", "continue", "pass", "loop else"] },
          { id: "2.8", title: "Choosing the Right Data Structure", difficulty: "core", minutes: 28, tier: "must",
            summary: "One decision table, backed by real complexity, that resolves most 'list or dict or set' arguments.",
            keywords: ["complexity", "big-o", "lookup", "decision", "performance"] },
          { id: "2.9", title: "Nested Data and Real-World Shapes", difficulty: "core", minutes: 30, tier: "must",
            summary: "Working with the JSON-shaped data that arrives from every API, safely and without twelve levels of indexing.",
            keywords: ["nested", "json", "traversal", "get", "flatten"] },
          { id: "2.10", title: "The Built-ins That Replace Loops", difficulty: "core", minutes: 32, tier: "must",
            summary: "enumerate, zip, sorted with keys, any, all, min/max, sum, reversed — the ones that make code shorter and clearer at once.",
            keywords: ["enumerate", "zip", "sorted", "any", "all", "min", "max", "sum"] },
          { id: "2.11", title: "Comprehensions", difficulty: "core", minutes: 32, tier: "must",
            summary: "List, dict and set comprehensions; nesting and conditions; and the line past which a comprehension becomes unreadable.",
            keywords: ["comprehension", "listcomp", "dictcomp", "generator expression"] }
        ]
      },

      {
        id: "functions",
        short: "L3",
        phase: "Phase 1 · Fundamentals",
        title: "Functions",
        blurb: "The unit of design in Python — signatures, scope, and functions as values.",
        outcome: "You design function signatures other engineers can use correctly without reading the body.",
        lessons: [
          { id: "3.1", title: "Defining Functions and Returning Values", difficulty: "foundation", minutes: 28, tier: "must",
            summary: "Single responsibility, explicit returns, why a function that returns None sometimes and a value other times is a bug factory.",
            keywords: ["def", "return", "docstring", "single responsibility"] },
          { id: "3.2", title: "Parameters and Arguments in Depth", difficulty: "core", minutes: 40, tier: "must",
            summary: "Positional, keyword, defaults, *args, **kwargs, and the positional-only / keyword-only markers most Python developers cannot explain.",
            keywords: ["args", "kwargs", "keyword-only", "positional-only", "defaults", "signature"] },
          { id: "3.3", title: "Scope and the LEGB Rule", difficulty: "core", minutes: 32, tier: "must",
            summary: "How name resolution works, why global is almost always the wrong answer, and what nonlocal is really for.",
            keywords: ["scope", "legb", "global", "nonlocal", "namespace", "closure"] },
          { id: "3.4", title: "Functions as Values", difficulty: "core", minutes: 28, tier: "must",
            summary: "First-class functions, passing behaviour as an argument, and the callback patterns that show up in every framework.",
            keywords: ["first-class", "higher-order", "callback", "callable"] },
          { id: "3.5", title: "Lambda, map, filter — and When Not To", difficulty: "core", minutes: 26, tier: "should",
            summary: "What lambda is genuinely for, why a comprehension usually wins, and the two cases where map/filter are still the better call.",
            keywords: ["lambda", "map", "filter", "reduce", "functional"] },
          { id: "3.6", title: "Closures", difficulty: "core", minutes: 32, tier: "should",
            summary: "How a function captures its enclosing scope, the late-binding loop trap, and closures as lightweight objects.",
            keywords: ["closure", "cell", "late binding", "capture", "factory"] },
          { id: "3.7", title: "Decorators", difficulty: "core", minutes: 44, tier: "must",
            summary: "Built from closures step by step, then functools.wraps, arguments, stacking, and the decorators you will actually write at work.",
            keywords: ["decorator", "wraps", "retry", "timing", "cache", "logging"] },
          { id: "3.8", title: "Recursion — and Its Limits in Python", difficulty: "core", minutes: 30, tier: "should",
            summary: "Base cases, the call stack, the recursion limit, no tail-call optimisation, and when iteration is simply correct.",
            keywords: ["recursion", "stack", "recursion limit", "memoization", "tail call"] },
          { id: "3.9", title: "Designing Function Signatures", difficulty: "core", minutes: 30, tier: "should",
            summary: "Type hints as documentation, sentinel defaults, boolean-trap parameters, and API surfaces that resist misuse.",
            keywords: ["type hints", "sentinel", "api design", "boolean trap", "docstring"] }
        ]
      },

      {
        id: "oop",
        short: "L4",
        phase: "Phase 1 · Fundamentals",
        title: "Object-Oriented Python",
        blurb: "Classes as a modelling tool — including the discipline of not reaching for one.",
        outcome: "You model a domain with classes when that helps, and recognise the many cases where a function or a dataclass is the better answer.",
        lessons: [
          { id: "4.1", title: "Classes, Instances and __init__", difficulty: "core", minutes: 34, tier: "must",
            summary: "What actually happens on instantiation, why self is explicit, and the difference between initialising and constructing.",
            keywords: ["class", "instance", "init", "new", "self", "constructor"] },
          { id: "4.2", title: "Instance vs Class Attributes", difficulty: "core", minutes: 28, tier: "must",
            summary: "Attribute lookup order, the shared-mutable-class-attribute bug, and when a class attribute is the right tool.",
            keywords: ["class attribute", "instance attribute", "shared state", "mro lookup"] },
          { id: "4.3", title: "Instance, Class and Static Methods", difficulty: "core", minutes: 28, tier: "must",
            summary: "What each binds to, classmethod as an alternative constructor, and why most staticmethods want to be module functions.",
            keywords: ["classmethod", "staticmethod", "alternative constructor", "factory"] },
          { id: "4.4", title: "Encapsulation and Properties", difficulty: "core", minutes: 32, tier: "must",
            summary: "Python has no private; it has conventions that work. Properties, validation, and not writing Java getters.",
            keywords: ["property", "setter", "private", "underscore", "validation", "encapsulation"] },
          { id: "4.5", title: "Inheritance, super() and the MRO", difficulty: "core", minutes: 38, tier: "should",
            summary: "How method resolution really works, cooperative super(), the diamond problem, and mixins that behave.",
            keywords: ["inheritance", "super", "mro", "c3", "diamond", "mixin"] },
          { id: "4.6", title: "Polymorphism and Duck Typing", difficulty: "core", minutes: 28, tier: "must",
            summary: "Behaviour over hierarchy — how Python does polymorphism without interfaces, and where that bites.",
            keywords: ["polymorphism", "duck typing", "interface", "substitution"] },
          { id: "4.7", title: "Composition Over Inheritance", difficulty: "core", minutes: 32, tier: "must",
            summary: "The default answer for code reuse, with a refactor of a real inheritance hierarchy that had gone wrong.",
            keywords: ["composition", "has-a", "delegation", "refactor", "coupling"] },
          { id: "4.8", title: "Abstraction and Abstract Base Classes", difficulty: "advanced", minutes: 30, tier: "should",
            summary: "abc, abstractmethod, and the honest question of whether you need an ABC or just a Protocol.",
            keywords: ["abc", "abstractmethod", "interface", "contract"] },
          { id: "4.9", title: "Dunder Methods", difficulty: "advanced", minutes: 40, tier: "should",
            summary: "__repr__ and __str__ done properly, __eq__ and __hash__ as a pair, comparison, container and callable protocols.",
            keywords: ["dunder", "repr", "str", "eq", "hash", "len", "getitem", "magic method"] },
          { id: "4.10", title: "Dataclasses", difficulty: "core", minutes: 32, tier: "must",
            summary: "The modern default for data-carrying classes: frozen, slots, field factories, and where dataclasses stop being enough.",
            keywords: ["dataclass", "frozen", "slots", "field", "post_init", "namedtuple"] },
          { id: "4.11", title: "SOLID Principles, Read Pythonically", difficulty: "advanced", minutes: 36, tier: "should",
            summary: "What each principle means in a duck-typed language with first-class functions — and which ones change shape entirely.",
            keywords: ["solid", "srp", "open closed", "liskov", "dependency inversion"] },
          { id: "4.12", title: "Design Patterns That Survive in Python", difficulty: "advanced", minutes: 38, tier: "adv",
            summary: "Strategy is a function. Singleton is a module. The patterns that remain useful, and the ones the language already solved.",
            keywords: ["design pattern", "strategy", "factory", "singleton", "observer", "adapter"] }
        ]
      },

      /* ==================================================================
         PHASE 2 — CRAFT
         ================================================================== */
      {
        id: "pythonic",
        short: "L5",
        phase: "Phase 2 · Craft",
        title: "Pythonic Programming",
        blurb: "How experienced Python engineers actually write Python — and why.",
        outcome: "Your code reads as though a senior Python engineer wrote it, because the idioms are choices you can justify.",
        lessons: [
          { id: "5.1", title: "What 'Pythonic' Actually Means", difficulty: "core", minutes: 28, tier: "must",
            summary: "Not a style preference — a set of decisions about readability, and a working definition you can apply in review.",
            keywords: ["pythonic", "zen", "readability", "idiom"] },
          { id: "5.2", title: "PEP 8, Naming and Layout", difficulty: "foundation", minutes: 26, tier: "must",
            summary: "The rules that matter, the ones your formatter handles, and naming as the highest-leverage readability tool you have.",
            keywords: ["pep8", "naming", "style", "line length", "imports"] },
          { id: "5.3", title: "EAFP vs LBYL", difficulty: "core", minutes: 26, tier: "must",
            summary: "Why Python prefers try/except to pre-checking, where that flips, and the race condition LBYL hides.",
            keywords: ["eafp", "lbyl", "try", "hasattr", "race condition", "toctou"] },
          { id: "5.4", title: "Unpacking and the Walrus Operator", difficulty: "core", minutes: 28, tier: "should",
            summary: "Star-unpacking, swapping, ignoring with _, and the narrow set of cases where := genuinely improves a line.",
            keywords: ["unpacking", "star", "walrus", "assignment expression", "swap"] },
          { id: "5.5", title: "Structural Pattern Matching", difficulty: "advanced", minutes: 34, tier: "should",
            summary: "match/case as destructuring, not as a switch statement — with the API-response example it was designed for.",
            keywords: ["match", "case", "pattern matching", "destructuring", "guard"] },
          { id: "5.6", title: "Iterators and the Iteration Protocol", difficulty: "core", minutes: 34, tier: "must",
            summary: "What `for` really does, __iter__ and __next__, and writing an iterable that behaves like a built-in.",
            keywords: ["iterator", "iterable", "iter", "next", "stopiteration", "protocol"] },
          { id: "5.7", title: "Generators", difficulty: "core", minutes: 40, tier: "must",
            summary: "Lazy evaluation, generator functions and expressions, yield from, and streaming a file too large for memory.",
            keywords: ["generator", "yield", "lazy", "yield from", "memory", "pipeline"] },
          { id: "5.8", title: "Context Managers", difficulty: "core", minutes: 34, tier: "must",
            summary: "with as a resource guarantee, writing them two ways, and the cleanup bugs they eliminate.",
            keywords: ["context manager", "with", "enter", "exit", "contextlib", "cleanup"] },
          { id: "5.9", title: "The collections Module", difficulty: "core", minutes: 30, tier: "must",
            summary: "defaultdict, Counter, deque, namedtuple and ChainMap — each replacing a chunk of hand-written code.",
            keywords: ["collections", "defaultdict", "counter", "deque", "namedtuple", "chainmap"] },
          { id: "5.10", title: "itertools and functools in Practice", difficulty: "advanced", minutes: 34, tier: "should",
            summary: "The dozen callables that genuinely earn their place, shown on problems you would otherwise loop through.",
            keywords: ["itertools", "functools", "partial", "reduce", "chain", "groupby", "batched"] },
          { id: "5.11", title: "Regular Expressions, Used Responsibly", difficulty: "core", minutes: 34, tier: "should",
            summary: "The syntax worth knowing, compiled patterns, named groups, catastrophic backtracking, and when not to use regex at all.",
            keywords: ["regex", "re", "pattern", "group", "backtracking", "redos"] },
          { id: "5.12", title: "Refactoring: Bad → Better → Production", difficulty: "advanced", minutes: 40, tier: "must",
            summary: "One realistic 60-line script taken through three full rewrites, with every decision explained.",
            keywords: ["refactor", "clean code", "review", "readability", "production"] }
        ]
      },

      {
        id: "errors",
        short: "L6",
        phase: "Phase 2 · Craft",
        title: "Errors, Logging & Debugging",
        blurb: "What separates a script from software: behaving sensibly when things go wrong.",
        outcome: "Your failures are diagnosable from logs alone, and your error handling makes incidents shorter.",
        lessons: [
          { id: "6.1", title: "Exceptions and the Exception Hierarchy", difficulty: "core", minutes: 30, tier: "must",
            summary: "How exceptions propagate, the built-in tree, and why catching Exception is a decision not a default.",
            keywords: ["exception", "hierarchy", "baseexception", "propagation"] },
          { id: "6.2", title: "try / except / else / finally", difficulty: "core", minutes: 30, tier: "must",
            summary: "The full statement including the two clauses most people skip, and the narrowest-possible-try discipline.",
            keywords: ["try", "except", "else", "finally", "cleanup"] },
          { id: "6.3", title: "raise, Chaining and Custom Exceptions", difficulty: "core", minutes: 32, tier: "must",
            summary: "raise from, preserving context, and designing an exception hierarchy your callers can actually handle.",
            keywords: ["raise", "from", "chaining", "custom exception", "hierarchy", "context"] },
          { id: "6.4", title: "Logging That Survives Production", difficulty: "core", minutes: 38, tier: "must",
            summary: "The logging module's real model, levels that mean something, structured JSON logs, and never logging a secret.",
            keywords: ["logging", "logger", "handler", "level", "structured", "json", "correlation id"] },
          { id: "6.5", title: "Defensive Programming and Error Strategy", difficulty: "advanced", minutes: 34, tier: "should",
            summary: "Fail fast vs degrade gracefully, retries and idempotency, timeouts, and where to put the boundary.",
            keywords: ["defensive", "fail fast", "retry", "timeout", "idempotent", "circuit breaker"] },
          { id: "6.6", title: "Debugging Beyond print()", difficulty: "core", minutes: 32, tier: "must",
            summary: "pdb and breakpoint(), post-mortem debugging, bisecting a bug, and reading a traceback under pressure.",
            keywords: ["pdb", "breakpoint", "debugger", "post-mortem", "traceback", "bisect"] }
        ]
      },

      {
        id: "modules",
        short: "L7",
        phase: "Phase 2 · Craft",
        title: "Files, Modules & Packaging",
        blurb: "Getting data in and out, and turning a folder of scripts into an installable project.",
        outcome: "You can lay out, package and pin a Python project the way a team would expect to receive it.",
        lessons: [
          { id: "7.1", title: "File I/O and pathlib", difficulty: "foundation", minutes: 32, tier: "must",
            summary: "Paths as objects, text vs binary, encodings, atomic writes, and never building a path with string concatenation.",
            keywords: ["file", "open", "pathlib", "encoding", "atomic write", "binary"] },
          { id: "7.2", title: "CSV, JSON and Structured Text", difficulty: "core", minutes: 32, tier: "must",
            summary: "The stdlib readers, streaming large files, and the serialisation edge cases that corrupt data quietly.",
            keywords: ["csv", "json", "serialise", "dictreader", "streaming", "datetime"] },
          { id: "7.3", title: "Pickle and Why It Is a Security Boundary", difficulty: "core", minutes: 24, tier: "should",
            summary: "What pickle is for, what it costs, and why 'never unpickle untrusted data' is a hard rule.",
            keywords: ["pickle", "serialisation", "security", "rce", "joblib", "model artifact"] },
          { id: "7.4", title: "Modules and the Import System", difficulty: "core", minutes: 36, tier: "must",
            summary: "How import resolves, sys.path, absolute vs relative, circular imports, and the module cache.",
            keywords: ["import", "module", "sys.path", "circular import", "namespace", "cache"] },
          { id: "7.5", title: "Packages, __init__.py and __main__", difficulty: "core", minutes: 30, tier: "must",
            summary: "Package layout, controlling the public surface, and what `if __name__ == '__main__'` is really doing.",
            keywords: ["package", "init", "main", "all", "entry point", "python -m"] },
          { id: "7.6", title: "Virtual Environments and Dependency Management", difficulty: "core", minutes: 36, tier: "must",
            summary: "Isolation from first principles, pip vs uv, pinning and lockfiles, and reproducible installs.",
            keywords: ["venv", "pip", "uv", "requirements", "lockfile", "pinning", "reproducible"] },
          { id: "7.7", title: "pyproject.toml and Publishable Projects", difficulty: "advanced", minutes: 32, tier: "should",
            summary: "The modern project file, src layout, extras, entry points, and building a wheel.",
            keywords: ["pyproject", "build", "wheel", "src layout", "extras", "setuptools", "hatch"] },
          { id: "7.8", title: "A Standard Library Tour Worth Taking", difficulty: "core", minutes: 34, tier: "should",
            summary: "datetime and timezones, uuid, secrets, subprocess, tempfile, argparse — the modules that stop you adding a dependency.",
            keywords: ["stdlib", "datetime", "timezone", "uuid", "secrets", "subprocess", "argparse", "tempfile"] }
        ]
      },

      /* ==================================================================
         PHASE 3 — DEPTH
         ================================================================== */
      {
        id: "advanced",
        short: "L8",
        phase: "Phase 3 · Depth",
        title: "Advanced Python",
        blurb: "The machinery underneath the language, tiered honestly so you know what to skip.",
        outcome: "You can read framework source code and understand why it works, not just that it does.",
        lessons: [
          { id: "8.1", title: "Generator Pipelines and Coroutine Mechanics", difficulty: "advanced", minutes: 36, tier: "should",
            summary: "Composing generators into streaming pipelines; send, throw and close; and where generators became async.",
            keywords: ["generator", "pipeline", "send", "coroutine", "streaming", "backpressure"] },
          { id: "8.2", title: "Advanced Decorators", difficulty: "advanced", minutes: 38, tier: "should",
            summary: "Class decorators, decorators with optional arguments, decorating methods, and preserving signatures properly.",
            keywords: ["decorator", "class decorator", "signature", "wraps", "parametrised"] },
          { id: "8.3", title: "Type Hints in Depth", difficulty: "advanced", minutes: 40, tier: "must",
            summary: "Beyond int and str: Optional, Union, literals, aliases, and hints that catch real bugs instead of decorating code.",
            keywords: ["typing", "optional", "union", "literal", "alias", "mypy", "annotations"] },
          { id: "8.4", title: "Generics, Protocols and TypedDict", difficulty: "expert", minutes: 40, tier: "adv",
            summary: "Structural typing that matches how Python is actually written, plus generics in the post-3.12 syntax.",
            keywords: ["generic", "typevar", "protocol", "typeddict", "structural typing", "variance"] },
          { id: "8.5", title: "Descriptors", difficulty: "expert", minutes: 36, tier: "adv",
            summary: "The protocol behind property, methods and ORM fields — taught once so the rest of the language stops looking like magic.",
            keywords: ["descriptor", "get", "set", "set_name", "property", "orm field"] },
          { id: "8.6", title: "Metaclasses and __init_subclass__", difficulty: "expert", minutes: 36, tier: "expert",
            summary: "What they do, the far simpler hooks that replaced most uses, and an honest answer on when you need one.",
            keywords: ["metaclass", "type", "init_subclass", "class creation", "registry"] },
          { id: "8.7", title: "Introspection with inspect", difficulty: "advanced", minutes: 28, tier: "adv",
            summary: "Signatures, source, stack frames, and the introspection that powers dependency injection frameworks.",
            keywords: ["inspect", "signature", "getattr", "reflection", "stack", "annotations"] },
          { id: "8.8", title: "Memory, Reference Counting and the GC", difficulty: "advanced", minutes: 38, tier: "should",
            summary: "How CPython manages memory, reference cycles, weak references, __slots__, and where the memory actually went.",
            keywords: ["memory", "refcount", "gc", "cycle", "weakref", "slots", "arena"] },
          { id: "8.9", title: "Diagnosing a Memory Leak", difficulty: "expert", minutes: 34, tier: "adv",
            summary: "A worked investigation: symptoms, tracemalloc, the usual suspects, and the fix.",
            keywords: ["memory leak", "tracemalloc", "rss", "objgraph", "cache", "diagnosis"] }
        ]
      },

      {
        id: "testing",
        short: "L9",
        phase: "Phase 3 · Depth",
        title: "Testing",
        blurb: "Tests as a design tool, not a compliance exercise.",
        outcome: "You write tests that fail for the right reasons and keep failing until the bug is actually fixed.",
        lessons: [
          { id: "9.1", title: "What to Test, and What Not To", difficulty: "core", minutes: 30, tier: "must",
            summary: "A testing strategy that fits the risk: the pyramid, what coverage does and does not tell you, and tests worth deleting.",
            keywords: ["strategy", "pyramid", "coverage", "risk", "unit", "integration"] },
          { id: "9.2", title: "pytest Fundamentals", difficulty: "core", minutes: 34, tier: "must",
            summary: "Plain assert, discovery, structuring a suite, and reading a pytest failure report properly.",
            keywords: ["pytest", "assert", "discovery", "test layout", "conftest"] },
          { id: "9.3", title: "Fixtures", difficulty: "core", minutes: 34, tier: "must",
            summary: "Setup as a dependency graph, scopes, factory fixtures, and fixtures that quietly couple your tests together.",
            keywords: ["fixture", "scope", "conftest", "yield fixture", "factory"] },
          { id: "9.4", title: "Parameterisation", difficulty: "core", minutes: 28, tier: "must",
            summary: "Table-driven tests, ids that make failures readable, and turning a bug report into a regression case.",
            keywords: ["parametrize", "table driven", "regression", "ids", "edge case"] },
          { id: "9.5", title: "Mocking and Monkeypatching", difficulty: "advanced", minutes: 38, tier: "must",
            summary: "Patch where it is looked up, not where it is defined; fakes vs mocks; and the over-mocked test that verifies nothing.",
            keywords: ["mock", "patch", "monkeypatch", "fake", "stub", "autospec"] },
          { id: "9.6", title: "Designing for Testability", difficulty: "advanced", minutes: 34, tier: "should",
            summary: "Dependency injection without a framework, isolating I/O and time, and why hard-to-test code is usually badly designed code.",
            keywords: ["testability", "dependency injection", "seam", "freeze time", "pure function"] },
          { id: "9.7", title: "Integration Tests and Test Data", difficulty: "advanced", minutes: 34, tier: "should",
            summary: "Testing against a real database and real HTTP, containers in tests, and keeping the suite fast enough to run.",
            keywords: ["integration", "testcontainers", "database", "httpx", "responses", "fixtures"] },
          { id: "9.8", title: "Coverage and Testing in CI", difficulty: "core", minutes: 28, tier: "should",
            summary: "Running the suite on every push, matrix builds, flaky-test policy, and coverage gates that are not theatre.",
            keywords: ["coverage", "ci", "github actions", "matrix", "flaky", "gate"] }
        ]
      },

      {
        id: "performance",
        short: "L10",
        phase: "Phase 3 · Depth",
        title: "Performance",
        blurb: "Measure, then fix the thing that is actually slow.",
        outcome: "You can find the real bottleneck in an unfamiliar codebase and judge whether it is worth fixing.",
        lessons: [
          { id: "10.1", title: "Complexity, Practically", difficulty: "core", minutes: 32, tier: "must",
            summary: "Big-O without the maths degree: the growth classes that matter and the accidental O(n²) in everyday code.",
            keywords: ["big-o", "complexity", "time", "space", "quadratic", "growth"] },
          { id: "10.2", title: "Profiling Before Optimising", difficulty: "core", minutes: 34, tier: "must",
            summary: "timeit, cProfile, line-level profiling and flame graphs — plus why your intuition about the hot path is usually wrong.",
            keywords: ["profile", "cprofile", "timeit", "flame graph", "hotspot", "benchmark"] },
          { id: "10.3", title: "Measuring and Reducing Memory", difficulty: "advanced", minutes: 30, tier: "should",
            summary: "Where memory goes, measuring it honestly, and the generator-vs-list decision at scale.",
            keywords: ["memory", "tracemalloc", "sys.getsizeof", "streaming", "slots"] },
          { id: "10.4", title: "Caching and functools.lru_cache", difficulty: "core", minutes: 32, tier: "must",
            summary: "Memoisation, cache keys, invalidation, TTLs, and the unbounded cache that becomes a memory leak.",
            keywords: ["cache", "lru_cache", "memoize", "invalidation", "ttl", "cached_property"] },
          { id: "10.5", title: "Performance Anti-Patterns", difficulty: "core", minutes: 30, tier: "must",
            summary: "String concatenation in loops, repeated lookups, wrong container, N+1 queries — ranked by how often they appear.",
            keywords: ["anti-pattern", "concatenation", "n+1", "lookup", "loop", "premature"] },
          { id: "10.6", title: "When Python Is Not the Answer", difficulty: "advanced", minutes: 30, tier: "should",
            summary: "Vectorisation, C extensions, Rust bindings, and deciding honestly whether to optimise, rewrite or scale out.",
            keywords: ["numpy", "vectorisation", "cython", "rust", "pyo3", "scale out"] }
        ]
      },

      {
        id: "concurrency",
        short: "L11",
        phase: "Phase 3 · Depth",
        title: "Concurrency & Parallelism",
        blurb: "The GIL, honestly explained, and how to pick a model that fits the workload.",
        outcome: "You choose threads, processes or async for the right reason and can explain the choice to a sceptical reviewer.",
        lessons: [
          { id: "11.1", title: "Concurrency vs Parallelism, I/O vs CPU", difficulty: "core", minutes: 30, tier: "must",
            summary: "The distinction that decides everything else, with a benchmark that makes it concrete.",
            keywords: ["concurrency", "parallelism", "io-bound", "cpu-bound", "latency", "throughput"] },
          { id: "11.2", title: "The GIL", difficulty: "advanced", minutes: 34, tier: "must",
            summary: "What it actually locks, when it is released, why it exists, and what free-threaded Python changes.",
            keywords: ["gil", "global interpreter lock", "free-threaded", "3.13", "nogil"] },
          { id: "11.3", title: "Threading", difficulty: "advanced", minutes: 36, tier: "should",
            summary: "Threads for I/O, locks and the races they prevent, deadlock, and thread-safe queues.",
            keywords: ["thread", "lock", "race condition", "deadlock", "queue", "daemon"] },
          { id: "11.4", title: "Multiprocessing", difficulty: "advanced", minutes: 36, tier: "should",
            summary: "Real parallelism, the pickling constraint, start methods, shared memory, and the cost of every process boundary.",
            keywords: ["multiprocessing", "process", "pool", "fork", "spawn", "pickle", "shared memory"] },
          { id: "11.5", title: "concurrent.futures", difficulty: "core", minutes: 30, tier: "must",
            summary: "One API over threads and processes — the level of abstraction most production code should sit at.",
            keywords: ["concurrent.futures", "executor", "future", "map", "as_completed"] },
          { id: "11.6", title: "asyncio and the Event Loop", difficulty: "advanced", minutes: 42, tier: "must",
            summary: "The event loop as a mental model, coroutines vs functions, await points, and the blocking call that stalls everything.",
            keywords: ["asyncio", "event loop", "coroutine", "await", "task", "blocking"] },
          { id: "11.7", title: "Async Patterns That Hold Up", difficulty: "advanced", minutes: 38, tier: "should",
            summary: "gather vs TaskGroup, cancellation, timeouts, semaphores for rate limits, and bridging sync and async code.",
            keywords: ["gather", "taskgroup", "cancellation", "timeout", "semaphore", "to_thread"] },
          { id: "11.8", title: "Choosing a Concurrency Model", difficulty: "advanced", minutes: 30, tier: "must",
            summary: "A decision procedure with worked examples: web scraper, image pipeline, API gateway, batch ETL.",
            keywords: ["decision", "architecture", "workload", "scaling", "trade-off"] }
        ]
      },

      /* ==================================================================
         PHASE 4 — BUILDING SYSTEMS
         ================================================================== */
      {
        id: "apis",
        short: "L12",
        phase: "Phase 4 · Building systems",
        title: "APIs & Backend Python",
        blurb: "HTTP fundamentals through a production FastAPI service.",
        outcome: "You can design, build, validate and secure an HTTP API that another team would be willing to depend on.",
        lessons: [
          { id: "12.1", title: "HTTP, Honestly", difficulty: "core", minutes: 34, tier: "must",
            summary: "Methods, status codes, headers, idempotency, caching and connection reuse — the model every API sits on.",
            keywords: ["http", "status code", "header", "idempotent", "rest", "cache", "keep-alive"] },
          { id: "12.2", title: "Consuming APIs Well", difficulty: "core", minutes: 36, tier: "must",
            summary: "requests and httpx, sessions, timeouts that are never optional, retries with backoff, and pagination.",
            keywords: ["requests", "httpx", "timeout", "retry", "backoff", "pagination", "session"] },
          { id: "12.3", title: "Pydantic: Validation as a Boundary", difficulty: "core", minutes: 38, tier: "must",
            summary: "Models, validators, settings, and treating parsing as the place where untrusted data becomes trusted.",
            keywords: ["pydantic", "validation", "model", "settings", "parse", "v2", "serialisation"] },
          { id: "12.4", title: "FastAPI Fundamentals", difficulty: "core", minutes: 40, tier: "must",
            summary: "Routing, request and response models, status codes, and the generated OpenAPI contract.",
            keywords: ["fastapi", "route", "response model", "openapi", "path", "query", "body"] },
          { id: "12.5", title: "Dependencies, Middleware and Errors", difficulty: "advanced", minutes: 38, tier: "must",
            summary: "FastAPI's dependency injection, request lifecycle, exception handlers, and a consistent error contract.",
            keywords: ["depends", "middleware", "exception handler", "lifespan", "error contract"] },
          { id: "12.6", title: "API Design That Ages Well", difficulty: "advanced", minutes: 34, tier: "should",
            summary: "Resource modelling, versioning, pagination, partial responses, and the breaking change you did not realise you shipped.",
            keywords: ["api design", "versioning", "pagination", "contract", "breaking change", "rest"] },
          { id: "12.7", title: "Async APIs and Background Work", difficulty: "advanced", minutes: 36, tier: "should",
            summary: "When async endpoints help, background tasks, queues and workers, and long-running jobs done properly.",
            keywords: ["async", "background task", "celery", "queue", "worker", "webhook"] },
          { id: "12.8", title: "Authentication, Authorisation and Secrets", difficulty: "advanced", minutes: 40, tier: "must",
            summary: "Password hashing, sessions vs JWT, OAuth2 flows, scopes, and the security mistakes that show up in code review.",
            keywords: ["auth", "jwt", "oauth2", "hashing", "bcrypt", "scope", "csrf", "secrets"] }
        ]
      },

      {
        id: "databases",
        short: "L13",
        phase: "Phase 4 · Building systems",
        title: "Databases",
        blurb: "SQL you can defend, and an ORM you can debug.",
        outcome: "You can model a schema, write correct queries, and explain why a page got slow.",
        lessons: [
          { id: "13.1", title: "SQL Fundamentals for Python Engineers", difficulty: "core", minutes: 40, tier: "must",
            summary: "Joins, grouping, subqueries and window functions — the SQL that removes most Python data-munging code.",
            keywords: ["sql", "join", "group by", "window function", "cte", "subquery"] },
          { id: "13.2", title: "Schema Design and Constraints", difficulty: "core", minutes: 34, tier: "must",
            summary: "Types, keys, normalisation to the point it helps, and constraints as the last line of data integrity.",
            keywords: ["schema", "normalisation", "primary key", "foreign key", "constraint", "index"] },
          { id: "13.3", title: "Connecting Python to PostgreSQL", difficulty: "core", minutes: 32, tier: "must",
            summary: "DB-API, psycopg, parameterised queries, and the SQL injection you will never write again.",
            keywords: ["psycopg", "db-api", "cursor", "parameterised", "sql injection", "postgres"] },
          { id: "13.4", title: "Transactions and Isolation", difficulty: "advanced", minutes: 34, tier: "must",
            summary: "ACID in practice, isolation levels, deadlocks, and where to put the transaction boundary.",
            keywords: ["transaction", "acid", "isolation", "commit", "rollback", "deadlock", "locking"] },
          { id: "13.5", title: "SQLAlchemy: Core and ORM", difficulty: "advanced", minutes: 42, tier: "must",
            summary: "The two layers, sessions and the unit of work, relationships, and the ORM's real cost model.",
            keywords: ["sqlalchemy", "orm", "session", "unit of work", "relationship", "core"] },
          { id: "13.6", title: "The N+1 Problem and Query Optimisation", difficulty: "advanced", minutes: 36, tier: "must",
            summary: "Reading EXPLAIN, indexing that helps, eager loading strategies, and finding the N+1 before your users do.",
            keywords: ["n+1", "explain", "index", "eager loading", "selectinload", "query plan"] },
          { id: "13.7", title: "Migrations and Connection Pooling", difficulty: "advanced", minutes: 34, tier: "should",
            summary: "Alembic, zero-downtime schema changes, pool sizing, and the connection exhaustion incident.",
            keywords: ["alembic", "migration", "zero downtime", "pool", "pgbouncer", "connection"] }
        ]
      },

      {
        id: "production",
        short: "L14",
        phase: "Phase 4 · Building systems",
        title: "Production Python",
        blurb: "Everything between 'it works' and 'it runs, and we can fix it at 3am'.",
        outcome: "You can take a working Python service and make it deployable, observable and maintainable by a team.",
        lessons: [
          { id: "14.1", title: "Project Structure That Scales", difficulty: "core", minutes: 34, tier: "must",
            summary: "src layout, module boundaries, where business logic lives, and the structure that survives ten contributors.",
            keywords: ["structure", "src layout", "layering", "boundary", "monorepo", "architecture"] },
          { id: "14.2", title: "Configuration, Environments and Secrets", difficulty: "core", minutes: 34, tier: "must",
            summary: "Twelve-factor config, typed settings, per-environment overrides, and secrets that never touch git.",
            keywords: ["config", "env var", "dotenv", "settings", "secrets", "twelve factor", "vault"] },
          { id: "14.3", title: "Observability: Logs, Metrics, Traces", difficulty: "advanced", minutes: 38, tier: "must",
            summary: "The three signals, what each answers, correlation IDs, OpenTelemetry, and health checks that mean something.",
            keywords: ["observability", "metrics", "tracing", "opentelemetry", "prometheus", "health check", "slo"] },
          { id: "14.4", title: "Code Quality Tooling", difficulty: "core", minutes: 32, tier: "must",
            summary: "ruff, formatting, mypy in strict-enough mode, pre-commit hooks, and adopting all of it on a legacy codebase.",
            keywords: ["ruff", "black", "mypy", "lint", "format", "pre-commit", "static analysis"] },
          { id: "14.5", title: "Packaging Python into Docker", difficulty: "advanced", minutes: 38, tier: "must",
            summary: "Multi-stage builds, layer caching, non-root users, small images, and the signal handling that makes shutdown clean.",
            keywords: ["docker", "container", "multi-stage", "image", "entrypoint", "sigterm", "healthcheck"] },
          { id: "14.6", title: "CI/CD for Python Services", difficulty: "advanced", minutes: 36, tier: "must",
            summary: "A pipeline worth having: lint, type-check, test, build, scan, deploy — with the gates that catch real problems.",
            keywords: ["ci", "cd", "github actions", "pipeline", "artifact", "deploy", "rollback"] },
          { id: "14.7", title: "Dependency and Supply-Chain Security", difficulty: "advanced", minutes: 32, tier: "should",
            summary: "Pinning, hashes, vulnerability scanning, typosquatting, and evaluating whether to add a dependency at all.",
            keywords: ["security", "cve", "pip-audit", "sbom", "pinning", "typosquat", "supply chain"] },
          { id: "14.8", title: "Deployment and Runtime", difficulty: "advanced", minutes: 36, tier: "should",
            summary: "WSGI vs ASGI, gunicorn and uvicorn workers, sizing, graceful restarts, and zero-downtime deploys.",
            keywords: ["deploy", "gunicorn", "uvicorn", "asgi", "wsgi", "worker", "graceful", "rolling"] },
          { id: "14.9", title: "Debugging Production", difficulty: "expert", minutes: 38, tier: "should",
            summary: "A real incident, worked end to end: symptom, hypothesis, evidence, fix, and the postmortem that prevents the repeat.",
            keywords: ["incident", "postmortem", "production", "diagnosis", "py-spy", "profiling", "oncall"] },
          { id: "14.10", title: "Designing for Maintainability", difficulty: "expert", minutes: 36, tier: "should",
            summary: "Coupling and cohesion in real terms, seams for change, documenting decisions, and paying down debt deliberately.",
            keywords: ["maintainability", "coupling", "cohesion", "adr", "tech debt", "refactor", "architecture"] }
        ]
      },

      /* ==================================================================
         PHASE 5 — APPLIED
         ================================================================== */
      {
        id: "aiml",
        short: "L15",
        phase: "Phase 5 · Applied",
        title: "Python for Data, ML & AI Engineering",
        blurb: "The applied stack, taught as engineering rather than as notebook recipes.",
        outcome: "You can build a data or ML pipeline that runs on a schedule, in production, without you watching it.",
        lessons: [
          { id: "15.1", title: "NumPy and the Vectorised Mindset", difficulty: "core", minutes: 40, tier: "must",
            summary: "ndarray, dtypes, broadcasting, views vs copies, and why the loop you removed was the whole speedup.",
            keywords: ["numpy", "ndarray", "broadcasting", "vectorise", "dtype", "view", "axis"] },
          { id: "15.2", title: "Pandas That Does Not Fall Over", difficulty: "core", minutes: 44, tier: "must",
            summary: "Selection that is unambiguous, the SettingWithCopy warning explained properly, groupby, joins and memory control.",
            keywords: ["pandas", "dataframe", "loc", "iloc", "groupby", "merge", "settingwithcopy", "dtype"] },
          { id: "15.3", title: "Data Pipelines and Validation", difficulty: "advanced", minutes: 38, tier: "should",
            summary: "Idempotent transforms, schema contracts on data, partial failure, and pipelines that can be safely re-run.",
            keywords: ["pipeline", "etl", "idempotent", "schema", "validation", "great expectations", "backfill"] },
          { id: "15.4", title: "Jupyter for Professionals", difficulty: "core", minutes: 26, tier: "should",
            summary: "Notebooks that are reproducible and reviewable, and the discipline of graduating code out of them.",
            keywords: ["jupyter", "notebook", "reproducible", "nbstripout", "papermill", "kernel"] },
          { id: "15.5", title: "scikit-learn as an Engineering API", difficulty: "core", minutes: 38, tier: "should",
            summary: "The estimator contract, Pipeline and ColumnTransformer, leakage-free cross-validation, and custom transformers.",
            keywords: ["sklearn", "estimator", "pipeline", "columntransformer", "leakage", "cross validation"] },
          { id: "15.6", title: "Model Artifacts and Reproducibility", difficulty: "advanced", minutes: 34, tier: "should",
            summary: "Serialising models safely, versioning data and code together, seeds, and making a result reproducible six months later.",
            keywords: ["artifact", "joblib", "onnx", "versioning", "reproducibility", "seed", "mlflow"] },
          { id: "15.7", title: "Serving a Model with FastAPI", difficulty: "advanced", minutes: 40, tier: "must",
            summary: "Loading at startup, input validation, batching, latency budgets, warm-up and the failure modes unique to inference.",
            keywords: ["serving", "inference", "fastapi", "batching", "latency", "warmup", "gpu"] },
          { id: "15.8", title: "Python in GenAI Applications", difficulty: "advanced", minutes: 40, tier: "should",
            summary: "Streaming responses, token budgets, structured output with Pydantic, retries on flaky providers, and cost control.",
            keywords: ["llm", "genai", "streaming", "structured output", "tokens", "retry", "cost", "rag"] },
          { id: "15.9", title: "Async and Batching for LLM Workloads", difficulty: "expert", minutes: 36, tier: "adv",
            summary: "Concurrency limits, request batching, backpressure, caching and timeouts for provider-bound workloads.",
            keywords: ["async", "batching", "rate limit", "backpressure", "semaphore", "cache", "timeout"] }
        ]
      },

      /* ==================================================================
         APPENDIX
         ================================================================== */
      {
        id: "dsa",
        short: "A1",
        phase: "Appendix · Practice",
        title: "Data Structures & Algorithms in Python",
        blurb: "The interview track, taught with Python's actual data structures.",
        outcome: "You can solve a standard algorithmic problem in idiomatic Python and analyse it out loud.",
        lessons: [
          { id: "16.1", title: "Arrays, Strings and Two Pointers", difficulty: "core", minutes: 38, tier: "should",
            summary: "The pattern behind a third of interview questions, with Python-specific pitfalls around slicing cost.",
            keywords: ["two pointer", "sliding window", "array", "string", "in-place"] },
          { id: "16.2", title: "Hash Maps, Sets and Counting", difficulty: "core", minutes: 34, tier: "should",
            summary: "Trading space for time, Counter as a weapon, and the problems that collapse to one dict pass.",
            keywords: ["hash map", "counter", "frequency", "set", "lookup"] },
          { id: "16.3", title: "Stacks, Queues and Heaps", difficulty: "core", minutes: 36, tier: "should",
            summary: "deque and heapq in anger — monotonic stacks, top-k, and scheduling problems.",
            keywords: ["stack", "queue", "deque", "heapq", "priority queue", "monotonic", "top-k"] },
          { id: "16.4", title: "Trees, Graphs and Traversal", difficulty: "advanced", minutes: 42, tier: "should",
            summary: "BFS and DFS as one template each, recursion vs explicit stack, and cycle detection.",
            keywords: ["tree", "graph", "bfs", "dfs", "traversal", "topological", "cycle"] },
          { id: "16.5", title: "Sorting, Searching and Binary Search", difficulty: "core", minutes: 34, tier: "should",
            summary: "Timsort, sort keys, bisect, and binary search on the answer rather than on an array.",
            keywords: ["sort", "timsort", "binary search", "bisect", "key", "search space"] },
          { id: "16.6", title: "Recursion, Backtracking and Dynamic Programming", difficulty: "advanced", minutes: 44, tier: "adv",
            summary: "From brute force to memoised to tabulated, with a repeatable method rather than pattern recognition.",
            keywords: ["backtracking", "dp", "memoization", "tabulation", "state", "subproblem"] }
        ]
      },

      {
        id: "interview",
        short: "A2",
        phase: "Appendix · Practice",
        title: "Interview Preparation",
        blurb: "What Python interviews actually probe, at each level.",
        outcome: "You can answer the standard questions with the depth of someone who has shipped Python, not revised it.",
        lessons: [
          { id: "17.1", title: "Core Language Questions", difficulty: "core", minutes: 40, tier: "should",
            summary: "Mutability, scope, copies, truthiness, equality — with the follow-up questions that separate answers.",
            keywords: ["interview", "mutability", "scope", "copy", "equality", "fundamentals"] },
          { id: "17.2", title: "OOP and Design Questions", difficulty: "advanced", minutes: 38, tier: "should",
            summary: "MRO, dunder methods, composition vs inheritance, and small design exercises done out loud.",
            keywords: ["interview", "oop", "mro", "design", "solid", "patterns"] },
          { id: "17.3", title: "Internals and Advanced Questions", difficulty: "expert", minutes: 40, tier: "adv",
            summary: "GIL, memory model, generators, decorators, descriptors — answered at the depth interviewers are testing for.",
            keywords: ["interview", "gil", "memory", "generator", "decorator", "internals"] },
          { id: "17.4", title: "System and Scenario Questions", difficulty: "expert", minutes: 42, tier: "should",
            summary: "'This endpoint got slow', 'this job runs out of memory', 'design this pipeline' — structured ways to answer.",
            keywords: ["interview", "scenario", "system design", "debugging", "architecture", "trade-off"] }
        ]
      }
,

      /* ==================================================================
         TRACK 2 — CODING PRACTICE
         ------------------------------------------------------------------
         The learn track teaches the language. This one builds the reflex.
         Every lesson is a problem set: a short pattern briefing, then
         problems that ramp from warm-up to interview grade, each with a
         hidden solution, a complexity note and the mistakes people make.

         Ordering mirrors the learn track so the two can be taken in
         parallel: by the time a practice module needs dictionaries, the
         learn track has taught them.
         ================================================================== */

      {
        id: "p_strings", short: "P1", track: "practice", numPrefix: "P",
        phase: "Practice · Core data",
        title: "Strings and Text",
        blurb: "The problems that come up constantly: parsing, cleaning, formatting, searching.",
        outcome: "You can take any text-shaped problem apart without reaching for a regex first.",
        lessons: [
          { id: "p1.1", title: "String Basics Drills", difficulty: "foundation", minutes: 30, tier: "must",
            summary: "Reversing, casing, trimming, counting — eight warm-ups that build the vocabulary everything else uses.",
            keywords: ["string", "slice", "reverse", "case", "strip", "count"] },
          { id: "p1.2", title: "Palindromes and Anagrams", difficulty: "foundation", minutes: 32, tier: "must",
            summary: "The classic pair, done properly: normalisation, two-pointer checks, and why sorting is not the best answer.",
            keywords: ["palindrome", "anagram", "two pointer", "normalise", "counter"] },
          { id: "p1.3", title: "Splitting, Joining and Parsing", difficulty: "foundation", minutes: 32, tier: "must",
            summary: "Turning messy lines into structured data, and the split() edge cases that bite in production.",
            keywords: ["split", "join", "parse", "partition", "maxsplit", "whitespace"] },
          { id: "p1.4", title: "Searching and Replacing", difficulty: "core", minutes: 32, tier: "must",
            summary: "find vs index vs in, replacing with counts, and building a small template engine by hand.",
            keywords: ["find", "index", "replace", "startswith", "template", "substring"] },
          { id: "p1.5", title: "Formatting and Alignment", difficulty: "core", minutes: 28, tier: "should",
            summary: "f-string mini-language problems: tables, currency, percentages, padding and truncation.",
            keywords: ["format", "f-string", "align", "padding", "precision", "table"] },
          { id: "p1.6", title: "Character Frequency Problems", difficulty: "core", minutes: 32, tier: "must",
            summary: "First unique character, most common word, ransom notes — the Counter family of problems.",
            keywords: ["counter", "frequency", "unique", "histogram", "most common"] },
          { id: "p1.7", title: "Sliding Window on Strings", difficulty: "advanced", minutes: 36, tier: "should",
            summary: "Longest substring without repeats, anagram windows, minimum window — one pattern, four problems.",
            keywords: ["sliding window", "substring", "two pointer", "set", "optimal"] },
          { id: "p1.8", title: "Text Challenge Set", difficulty: "advanced", minutes: 40, tier: "should",
            summary: "A timed set combining everything: log parsing, word wrap, a diff, and a tokeniser.",
            keywords: ["challenge", "parsing", "wrap", "diff", "tokenise", "timed"] }
        ]
      },

      {
        id: "p_lists", short: "P2", track: "practice", numPrefix: "P",
        phase: "Practice · Core data",
        title: "Lists, Slicing and Arrays",
        blurb: "Indexing, in-place work, and the array problems every interview reaches for.",
        outcome: "You reach for the right traversal instead of nesting two loops by reflex.",
        lessons: [
          { id: "p2.1", title: "Indexing and Slicing Drills", difficulty: "foundation", minutes: 30, tier: "must",
            summary: "Every slice form, negative steps, copies vs views, and rotating a list four ways.",
            keywords: ["slice", "index", "negative", "step", "rotate", "copy"] },
          { id: "p2.2", title: "Building and Transforming Lists", difficulty: "foundation", minutes: 30, tier: "must",
            summary: "Map, filter and flatten by hand, then as comprehensions, then measured against each other.",
            keywords: ["comprehension", "map", "filter", "flatten", "transform"] },
          { id: "p2.3", title: "Searching and Sorting Problems", difficulty: "core", minutes: 34, tier: "must",
            summary: "Custom sort keys, stable sorting, binary search with bisect, and finding the k largest.",
            keywords: ["sort", "key", "bisect", "binary search", "heapq", "top k"] },
          { id: "p2.4", title: "Two Pointers", difficulty: "core", minutes: 34, tier: "must",
            summary: "Pair sums, dedupe in place, merging sorted lists, container with most water — the whole pattern.",
            keywords: ["two pointer", "in place", "merge", "sorted", "pair sum"] },
          { id: "p2.5", title: "Prefix Sums and Running State", difficulty: "core", minutes: 32, tier: "should",
            summary: "Range sums, equilibrium index, maximum subarray — replacing a nested loop with one pass.",
            keywords: ["prefix sum", "kadane", "running total", "subarray", "accumulate"] },
          { id: "p2.6", title: "Matrix Problems", difficulty: "core", minutes: 34, tier: "should",
            summary: "Transpose, rotate, spiral order and neighbour walks, with the index arithmetic made explicit.",
            keywords: ["matrix", "2d", "rotate", "spiral", "transpose", "grid"] },
          { id: "p2.7", title: "In-Place Modification", difficulty: "advanced", minutes: 32, tier: "should",
            summary: "Removing while iterating, partitioning, the Dutch national flag — and the aliasing bugs they cause.",
            keywords: ["in place", "mutate", "partition", "aliasing", "swap"] },
          { id: "p2.8", title: "Array Challenge Set", difficulty: "advanced", minutes: 40, tier: "should",
            summary: "A timed set: stock profits, product except self, trapping rain water, and a merge-intervals problem.",
            keywords: ["challenge", "intervals", "greedy", "timed", "optimal"] }
        ]
      },

      {
        id: "p_dicts", short: "P3", track: "practice", numPrefix: "P",
        phase: "Practice · Core data",
        title: "Dictionaries, Sets and Grouping",
        blurb: "Hash-based problems: counting, grouping, deduplicating, indexing.",
        outcome: "You recognise the problems where a dict turns quadratic work into linear.",
        lessons: [
          { id: "p3.1", title: "Dictionary Drills", difficulty: "foundation", minutes: 30, tier: "must",
            summary: "Building, inverting, merging and safely reading dicts, with get, setdefault and defaultdict compared.",
            keywords: ["dict", "get", "setdefault", "invert", "merge", "defaultdict"] },
          { id: "p3.2", title: "Grouping and Bucketing", difficulty: "foundation", minutes: 32, tier: "must",
            summary: "Group anagrams, bucket by property, index by key — the pattern behind half of all data wrangling.",
            keywords: ["group", "bucket", "defaultdict", "index", "key function"] },
          { id: "p3.3", title: "Sets and Membership", difficulty: "foundation", minutes: 28, tier: "must",
            summary: "Dedupe preserving order, intersections, the hashability rules, and set arithmetic problems.",
            keywords: ["set", "dedupe", "intersection", "union", "hashable", "membership"] },
          { id: "p3.4", title: "Counting Problems", difficulty: "core", minutes: 32, tier: "must",
            summary: "Two sum, majority element, frequency ranking and duplicate detection — all one idea.",
            keywords: ["two sum", "counter", "frequency", "majority", "duplicate"] },
          { id: "p3.5", title: "Caching and Memoisation by Hand", difficulty: "core", minutes: 30, tier: "should",
            summary: "Building a memo dict, then an LRU, then measuring both against lru_cache.",
            keywords: ["memo", "cache", "lru", "fibonacci", "hit rate"] },
          { id: "p3.6", title: "Nested Data Problems", difficulty: "core", minutes: 34, tier: "must",
            summary: "Walking, flattening, searching and safely reading deeply nested JSON without a KeyError.",
            keywords: ["nested", "json", "recursion", "flatten", "path", "deep get"] },
          { id: "p3.7", title: "Hashing Challenge Set", difficulty: "advanced", minutes: 38, tier: "should",
            summary: "A timed set: longest consecutive sequence, subarray sum equals k, and an isomorphic-strings problem.",
            keywords: ["challenge", "hash map", "consecutive", "prefix", "timed"] }
        ]
      },

      {
        id: "p_control", short: "P4", track: "practice", numPrefix: "P",
        phase: "Practice · Logic",
        title: "Loops, Conditions and Numbers",
        blurb: "Control-flow reasoning and the number problems that test it.",
        outcome: "You can write a loop with the right invariant and prove it terminates.",
        lessons: [
          { id: "p4.1", title: "Loop Construction Drills", difficulty: "foundation", minutes: 30, tier: "must",
            summary: "range arithmetic, enumerate, zip, while with a sentinel, and the off-by-one taxonomy.",
            keywords: ["loop", "range", "enumerate", "zip", "off by one", "invariant"] },
          { id: "p4.2", title: "Conditional Logic Problems", difficulty: "foundation", minutes: 28, tier: "must",
            summary: "FizzBuzz done four ways, leap years, grade boundaries, and flattening nested ifs.",
            keywords: ["conditional", "fizzbuzz", "boundary", "guard clause", "boolean"] },
          { id: "p4.3", title: "Number Theory Basics", difficulty: "core", minutes: 32, tier: "should",
            summary: "Primes, factors, GCD, digit manipulation and base conversion, with the naive version measured.",
            keywords: ["prime", "gcd", "factor", "digits", "base", "sieve"] },
          { id: "p4.4", title: "Accumulator Patterns", difficulty: "foundation", minutes: 28, tier: "must",
            summary: "Running totals, min and max tracking, streak detection, and why sum() is not always the answer.",
            keywords: ["accumulator", "running", "streak", "min max", "reduce"] },
          { id: "p4.5", title: "Simulation Problems", difficulty: "core", minutes: 34, tier: "should",
            summary: "Game of life, robot on a grid, a vending machine — turning rules into a loop that terminates.",
            keywords: ["simulation", "state machine", "grid", "rules", "step"] },
          { id: "p4.6", title: "Loop Optimisation Drills", difficulty: "core", minutes: 30, tier: "should",
            summary: "Six nested loops rewritten to single passes, each with the measurement that justifies it.",
            keywords: ["optimise", "nested loop", "complexity", "single pass", "measure"] },
          { id: "p4.7", title: "Logic Challenge Set", difficulty: "advanced", minutes: 36, tier: "should",
            summary: "A timed set: a calculator, Roman numerals both directions, and a valid-parentheses family.",
            keywords: ["challenge", "parser", "stack", "roman", "timed"] }
        ]
      },

      {
        id: "p_functions", short: "P5", track: "practice", numPrefix: "P",
        phase: "Practice · Logic",
        title: "Functions and Recursion",
        blurb: "Decomposition, recursion, closures and higher-order functions, as problems.",
        outcome: "You can turn a recursive idea into working code and then into an iterative one.",
        lessons: [
          { id: "p5.1", title: "Function Design Drills", difficulty: "foundation", minutes: 30, tier: "must",
            summary: "Splitting a long function, choosing parameters, defaults and returns — six refactors.",
            keywords: ["function", "parameters", "return", "decompose", "default"] },
          { id: "p5.2", title: "Recursion Fundamentals", difficulty: "core", minutes: 34, tier: "must",
            summary: "Base cases, the call stack drawn out, factorial through tree traversal, and when it blows up.",
            keywords: ["recursion", "base case", "call stack", "tree", "depth"] },
          { id: "p5.3", title: "Recursion to Iteration", difficulty: "advanced", minutes: 34, tier: "should",
            summary: "Converting four recursive solutions to explicit stacks, and deciding which version to ship.",
            keywords: ["iteration", "stack", "convert", "tail call", "depth limit"] },
          { id: "p5.4", title: "Higher-Order Function Problems", difficulty: "core", minutes: 30, tier: "should",
            summary: "Functions as arguments and returns: pipelines, key functions, partial application, a retry wrapper.",
            keywords: ["higher order", "callback", "pipeline", "partial", "closure"] },
          { id: "p5.5", title: "Closures and State", difficulty: "advanced", minutes: 30, tier: "should",
            summary: "Counters, accumulators, rate limiters and the late-binding bug, built as exercises.",
            keywords: ["closure", "state", "late binding", "nonlocal", "counter"] },
          { id: "p5.6", title: "Backtracking Problems", difficulty: "advanced", minutes: 40, tier: "adv",
            summary: "Permutations, subsets, n-queens and a sudoku solver — one template applied four times.",
            keywords: ["backtracking", "permutation", "subset", "n-queens", "prune"] }
        ]
      },

      {
        id: "p_data", short: "P6", track: "practice", numPrefix: "P",
        phase: "Practice · Applied",
        title: "Files and Real Data",
        blurb: "Problems using data that is messy, large, or both.",
        outcome: "You can take a real file and produce a correct answer without loading all of it.",
        lessons: [
          { id: "p6.1", title: "Reading and Writing Files", difficulty: "foundation", minutes: 30, tier: "must",
            summary: "Line counting, filtering, appending and atomic writes, with encodings that go wrong on purpose.",
            keywords: ["file", "read", "write", "encoding", "atomic", "lines"] },
          { id: "p6.2", title: "CSV Problems", difficulty: "core", minutes: 32, tier: "must",
            summary: "Aggregating a sales file, joining two files, and the quoting cases that break a naive split.",
            keywords: ["csv", "dictreader", "aggregate", "join", "quoting"] },
          { id: "p6.3", title: "JSON Problems", difficulty: "core", minutes: 32, tier: "must",
            summary: "Reshaping an API response, validating a payload, and serialising types json cannot handle.",
            keywords: ["json", "reshape", "validate", "custom encoder", "nested"] },
          { id: "p6.4", title: "Log Analysis", difficulty: "core", minutes: 34, tier: "should",
            summary: "Parsing, counting by field, finding error bursts and building a top-N report from a large file.",
            keywords: ["log", "parse", "aggregate", "top n", "streaming"] },
          { id: "p6.5", title: "Streaming Large Files", difficulty: "advanced", minutes: 34, tier: "should",
            summary: "Solving four problems in constant memory, and proving the solutions actually stream.",
            keywords: ["generator", "streaming", "memory", "chunk", "large file"] },
          { id: "p6.6", title: "Data Challenge Set", difficulty: "advanced", minutes: 40, tier: "should",
            summary: "A timed set: reconcile two exports, detect duplicates fuzzily, and build a summary report.",
            keywords: ["challenge", "reconcile", "duplicate", "report", "timed"] }
        ]
      },

      {
        id: "p_oop", short: "P7", track: "practice", numPrefix: "P",
        phase: "Practice · Applied",
        title: "Classes and Object Design",
        blurb: "Design exercises rather than syntax drills: model something, then defend the model.",
        outcome: "You can turn a paragraph of requirements into classes that survive the next requirement.",
        lessons: [
          { id: "p7.1", title: "Modelling Drills", difficulty: "core", minutes: 32, tier: "must",
            summary: "Six short briefs turned into classes, each with the alternative design and why it lost.",
            keywords: ["model", "class", "design", "attributes", "responsibility"] },
          { id: "p7.2", title: "Dunder Method Problems", difficulty: "core", minutes: 32, tier: "should",
            summary: "Building a Vector, a Money type and a Matrix — equality, ordering, arithmetic and repr.",
            keywords: ["dunder", "operator", "eq", "repr", "vector", "money"] },
          { id: "p7.3", title: "Inheritance and Composition Exercises", difficulty: "advanced", minutes: 34, tier: "should",
            summary: "The same problem solved both ways, with the maintenance cost of each made explicit.",
            keywords: ["inheritance", "composition", "refactor", "protocol", "trade-off"] },
          { id: "p7.4", title: "Building a Small Library", difficulty: "advanced", minutes: 40, tier: "should",
            summary: "A retry decorator, a cache, a config loader and a result type — written as a real package.",
            keywords: ["library", "api design", "decorator", "package", "public surface"] },
          { id: "p7.5", title: "State Machines and Workflows", difficulty: "advanced", minutes: 34, tier: "adv",
            summary: "Order lifecycles and approval flows, with illegal transitions made impossible rather than checked.",
            keywords: ["state machine", "enum", "transition", "workflow", "invariant"] },
          { id: "p7.6", title: "Design Challenge Set", difficulty: "expert", minutes: 42, tier: "should",
            summary: "A timed set: design a parking lot, a rate limiter and an event bus, then critique your own answer.",
            keywords: ["challenge", "design", "rate limiter", "event bus", "timed"] }
        ]
      },

      {
        id: "p_patterns", short: "P8", track: "practice", numPrefix: "P",
        phase: "Practice · Interview",
        title: "Algorithmic Patterns",
        blurb: "The eight shapes that cover most interview questions, taught as recognisable patterns.",
        outcome: "You can name the pattern a problem belongs to before you write a line.",
        lessons: [
          { id: "p8.1", title: "Recognising the Pattern", difficulty: "core", minutes: 32, tier: "must",
            summary: "A decision procedure: what the constraints tell you, and which pattern each signal points at.",
            keywords: ["pattern", "constraints", "recognise", "approach", "signals"] },
          { id: "p8.2", title: "Stack and Queue Problems", difficulty: "core", minutes: 34, tier: "must",
            summary: "Bracket matching, next greater element, monotonic stacks and a queue from two stacks.",
            keywords: ["stack", "queue", "monotonic", "brackets", "deque"] },
          { id: "p8.3", title: "Linked Structures", difficulty: "advanced", minutes: 36, tier: "should",
            summary: "Building a linked list, reversing it, cycle detection and merging — pointer discipline in Python.",
            keywords: ["linked list", "pointer", "cycle", "reverse", "merge"] },
          { id: "p8.4", title: "Trees and Traversals", difficulty: "advanced", minutes: 38, tier: "should",
            summary: "Depth-first and breadth-first, recursive and iterative, plus the five most common tree questions.",
            keywords: ["tree", "dfs", "bfs", "traversal", "binary tree", "depth"] },
          { id: "p8.5", title: "Graphs Without the Theory", difficulty: "advanced", minutes: 38, tier: "adv",
            summary: "Representing a graph, flood fill, shortest path on a grid and cycle detection in a dependency list.",
            keywords: ["graph", "bfs", "adjacency", "topological", "flood fill"] },
          { id: "p8.6", title: "Greedy and Interval Problems", difficulty: "advanced", minutes: 34, tier: "should",
            summary: "Meeting rooms, interval merging, activity selection — and how to tell greedy will actually work.",
            keywords: ["greedy", "interval", "schedule", "sort", "proof"] },
          { id: "p8.7", title: "Dynamic Programming, Gently", difficulty: "expert", minutes: 42, tier: "adv",
            summary: "Climbing stairs to coin change to edit distance, using one repeatable method rather than intuition.",
            keywords: ["dp", "memo", "tabulation", "subproblem", "state", "transition"] },
          { id: "p8.8", title: "Pattern Challenge Set", difficulty: "expert", minutes: 44, tier: "should",
            summary: "Twelve problems with the pattern hidden — the point is choosing, not implementing.",
            keywords: ["challenge", "mixed", "recognise", "timed", "choose"] }
        ]
      },

      {
        id: "p_sets", short: "P9", track: "practice", numPrefix: "P",
        phase: "Practice · Interview",
        title: "Timed Problem Sets",
        blurb: "Full sets under time pressure, with a worked commentary on how to attack each one.",
        outcome: "You can start a problem you have never seen without freezing.",
        lessons: [
          { id: "p9.1", title: "Warm-Up Set — 30 Minutes", difficulty: "core", minutes: 30, tier: "should",
            summary: "Five approachable problems, with a method for the first sixty seconds of any question.",
            keywords: ["timed", "warm up", "method", "approach", "clarify"] },
          { id: "p9.2", title: "Core Set — 45 Minutes", difficulty: "advanced", minutes: 45, tier: "should",
            summary: "Four medium problems spanning strings, hashing and two pointers, with commentary throughout.",
            keywords: ["timed", "medium", "mixed", "commentary", "practice"] },
          { id: "p9.3", title: "Hard Set — 60 Minutes", difficulty: "expert", minutes: 60, tier: "adv",
            summary: "Three hard problems, including one deliberately underspecified so you must ask the right questions.",
            keywords: ["timed", "hard", "ambiguous", "clarify", "trade-off"] },
          { id: "p9.4", title: "Debugging Under Pressure", difficulty: "advanced", minutes: 36, tier: "should",
            summary: "Six almost-correct solutions to fix, which is what a live interview usually turns into.",
            keywords: ["debug", "off by one", "edge case", "fix", "pressure"] },
          { id: "p9.5", title: "Explaining Your Solution", difficulty: "advanced", minutes: 32, tier: "must",
            summary: "Complexity out loud, trade-offs, and what to say when your first approach is the wrong one.",
            keywords: ["communication", "complexity", "trade-off", "explain", "interview"] }
        ]
      }
    ]
  });
})();
