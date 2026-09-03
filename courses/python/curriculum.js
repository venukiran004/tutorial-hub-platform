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

    /* Lessons with an authored file in lessons/. Everything else renders as
       "soon" in the rail and the curriculum, so the roadmap is visible in full
       without ever promising content that is not there yet. Add an id here the
       moment its lesson file lands — this is the single switch. */
    published: ["1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "1.7", "1.8", "1.9", "2.1", "2.2", "2.3", "2.4", "2.5", "2.6", "2.7", "2.8", "2.9", "2.10", "2.11", "3.1", "3.2", "3.3", "3.4", "3.5", "3.6", "3.7", "3.8", "3.9", "4.1", "4.2", "4.3", "4.4", "4.5", "5.1", "5.2", "6.1", "6.2", "7.1", "7.2", "7.3", "9.1", "9.2", "10.1", "10.2"],

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
    ]
  });
})();
