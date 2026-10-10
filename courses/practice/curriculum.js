/* ==========================================================================
   CODING PRACTICE — CURRICULUM
   --------------------------------------------------------------------------
   Every problem appears exactly once and is numbered once, globally, so
   "Program N" names one thing across the whole course. Sets are grouped
   into modules of one subject each rather than three.
   ====================================================================== */
(function () {
  "use strict";

  EC.defineCourse({
    id: "practice",
    title: "Coding Practice",
    subtitle: "Every problem once, numbered once",
    short: "CP",
    tagline: "2,882 problems with the answers folded away, across 114 sets and 23 modules — deduplicated, so nothing is asked twice.",

    blurb: "A drill ground for Python: write the program, predict the output, then open the answer. 2,882 problems, each appearing exactly once and numbered once across the course, grouped by subject from the first program to production operations.",

    published: ["c1.1", "c1.2", "c1.3", "c2.1", "c2.2", "c2.3", "c2.4", "c2.5", "c2.6", "c3.1", "c3.2", "c3.3", "c3.4", "c3.5", "c3.6", "c4.1", "c4.2", "c4.3", "c4.4", "c4.5", "c4.6", "c4.7", "c5.1", "c5.2", "c5.3", "c5.4", "c6.1", "c6.2", "c6.3", "c6.4", "c7.1", "c7.2", "c7.3", "c7.4", "c7.5", "c7.6", "c8.1", "c8.2", "c8.3", "c8.4", "c8.5", "c9.1", "c9.2", "c9.3", "c9.4", "c9.5", "c10.1", "c10.2", "c10.3", "c10.4", "c10.5", "c10.6", "c11.1", "c11.2", "c11.3", "c12.1", "c12.2", "c12.3", "c12.4", "c13.1", "c13.2", "c13.3", "c13.4", "c13.5", "c14.1", "c14.2", "c14.3", "c14.4", "c15.1", "c15.2", "c15.3", "c15.4", "c16.1", "c16.2", "c16.3", "c16.4", "c17.1", "c17.2", "c17.3", "c17.4", "c18.1", "c18.2", "c18.3", "c18.4", "c18.5", "c18.6", "c18.7", "c19.1", "c19.2", "c19.3", "c19.4", "c20.1", "c20.2", "c20.3", "c20.4", "c20.5", "c20.6", "c21.1", "c21.2", "c21.3", "c21.4", "c21.5", "c22.1", "c22.2", "c22.3", "c22.4", "c22.5", "c23.1", "c23.2", "c23.3", "c23.4", "c23.5", "c23.6", "c23.7"],

    modules: [

      {
        id: "basics", dir: "01_basics", short: "B1",
        phase: "Phase 1 · Language basics",
        title: "Basics, Numbers and Loops",
        blurb: "The first programs, the numeric types that surprise people, and the loop patterns everything else is built from.",
        outcome: "You can write a small program from a one-line description without looking anything up.",
        lessons: [
          { id: "c1.1", title: "Programs 1–20 · first programs: numbers, loops and strings", difficulty: "core", minutes: 20, tier: "should",
            summary: "2,882 problems with the answers folded away — first programs: numbers, loops and strings.",
            keywords: ["first", "programs", "numbers", "loops", "strings"] },
          { id: "c1.2", title: "Programs 21–48 · array tricks and bit manipulation", difficulty: "core", minutes: 28, tier: "should",
            summary: "2,882 problems with the answers folded away — array tricks and bit manipulation.",
            keywords: ["array", "tricks", "manipulation"] },
          { id: "c1.3", title: "Programs 49–77 · buffers, identity and floating point", difficulty: "core", minutes: 29, tier: "should",
            summary: "2,882 problems with the answers folded away — buffers, identity and floating point.",
            keywords: ["buffers", "identity", "floating", "point"] }
        ]
      },

      {
        id: "strings", dir: "02_strings", short: "B2",
        phase: "Phase 1 · Language basics",
        title: "Strings and Text",
        blurb: "A string is immutable and every method returns a new one; these sets drill that until it is reflex, then move to formatting and text processing.",
        outcome: "You can reach for the right string method without a search, and you know which operations copy.",
        lessons: [
          { id: "c2.1", title: "Programs 78–105 · string puzzles and a first generator", difficulty: "core", minutes: 28, tier: "should",
            summary: "2,882 problems with the answers folded away — string puzzles and a first generator.",
            keywords: ["string", "puzzles", "first", "generator"] },
          { id: "c2.2", title: "Predict the Output 106–135 · built-in types and string methods", difficulty: "core", minutes: 30, tier: "should",
            summary: "2,882 problems with the answers folded away — built-in types and string methods.",
            keywords: ["built", "types", "string", "methods"] },
          { id: "c2.3", title: "Predict the Output 136–165 · string formatting and slicing", difficulty: "core", minutes: 30, tier: "should",
            summary: "2,882 problems with the answers folded away — string formatting and slicing.",
            keywords: ["string", "formatting", "slicing"] },
          { id: "c2.4", title: "Predict the Output 166–195 · string methods and identity", difficulty: "core", minutes: 30, tier: "should",
            summary: "2,882 problems with the answers folded away — string methods and identity.",
            keywords: ["string", "methods", "identity"] },
          { id: "c2.5", title: "Programs 196–224 · comprehensions and counting text", difficulty: "core", minutes: 29, tier: "should",
            summary: "2,882 problems with the answers folded away — comprehensions and counting text.",
            keywords: ["comprehensions", "counting", "text"] },
          { id: "c2.6", title: "Programs 225–244 · text processing and dictionary views", difficulty: "core", minutes: 20, tier: "should",
            summary: "2,882 problems with the answers folded away — text processing and dictionary views.",
            keywords: ["text", "processing", "dictionary", "views"] }
        ]
      },

      {
        id: "lists", dir: "03_lists", short: "B3",
        phase: "Phase 1 · Language basics",
        title: "Lists, Slicing and Aliasing",
        blurb: "Indexing, slicing and the fact that assignment never copies - which is where most list bugs come from.",
        outcome: "You can predict whether an operation mutates or copies, and say what a slice costs.",
        lessons: [
          { id: "c3.1", title: "Programs 245–270 · list basics, slicing and flattening", difficulty: "core", minutes: 26, tier: "should",
            summary: "2,882 problems with the answers folded away — list basics, slicing and flattening.",
            keywords: ["list", "basics", "slicing", "flattening"] },
          { id: "c3.2", title: "Programs 271–288 · matrices and range compression", difficulty: "core", minutes: 20, tier: "should",
            summary: "2,882 problems with the answers folded away — matrices and range compression.",
            keywords: ["matrices", "range", "compression"] },
          { id: "c3.3", title: "Programs 289–318 · list gotchas and late binding", difficulty: "core", minutes: 30, tier: "should",
            summary: "2,882 problems with the answers folded away — list gotchas and late binding.",
            keywords: ["list", "gotchas", "late", "binding"] },
          { id: "c3.4", title: "Predict the Output 319–348 · list comprehensions", difficulty: "core", minutes: 30, tier: "should",
            summary: "2,882 problems with the answers folded away — list comprehensions.",
            keywords: ["list", "comprehensions"] },
          { id: "c3.5", title: "Predict the Output 349–378 · slicing and in-place mutation", difficulty: "core", minutes: 30, tier: "should",
            summary: "2,882 problems with the answers folded away — slicing and in-place mutation.",
            keywords: ["slicing", "place", "mutation"] },
          { id: "c3.6", title: "Predict the Output 379–408 · sequences and aliasing", difficulty: "core", minutes: 30, tier: "should",
            summary: "2,882 problems with the answers folded away — sequences and aliasing.",
            keywords: ["sequences", "aliasing"] }
        ]
      },

      {
        id: "list_algos", dir: "04_list_algos", short: "B4",
        phase: "Phase 1 · Language basics",
        title: "List Algorithms",
        blurb: "Chunking, grouping, runs, prefix sums, subarrays and in-place rearrangement - the patterns that keep reappearing in interviews.",
        outcome: "You can recognise a prefix-sum or two-pointer shape in a list problem and write it in one pass.",
        lessons: [
          { id: "c4.1", title: "Programs 409–432 · chunking, grouping and runs", difficulty: "core", minutes: 24, tier: "should",
            summary: "2,882 problems with the answers folded away — chunking, grouping and runs.",
            keywords: ["chunking", "grouping", "runs"] },
          { id: "c4.2", title: "Programs 433–460 · subarrays and dynamic programming", difficulty: "core", minutes: 28, tier: "should",
            summary: "2,882 problems with the answers folded away — subarrays and dynamic programming.",
            keywords: ["subarrays", "dynamic", "programming"] },
          { id: "c4.3", title: "Programs 461–485 · subsequences and rearrangement", difficulty: "core", minutes: 25, tier: "should",
            summary: "2,882 problems with the answers folded away — subsequences and rearrangement.",
            keywords: ["subsequences", "rearrangement"] },
          { id: "c4.4", title: "Programs 486–511 · sorting patterns and prefix sums", difficulty: "core", minutes: 26, tier: "should",
            summary: "2,882 problems with the answers folded away — sorting patterns and prefix sums.",
            keywords: ["sorting", "patterns", "prefix", "sums"] },
          { id: "c4.5", title: "Programs 512–541 · in-place tricks and buffers", difficulty: "core", minutes: 30, tier: "should",
            summary: "2,882 problems with the answers folded away — in-place tricks and buffers.",
            keywords: ["place", "tricks", "buffers"] },
          { id: "c4.6", title: "Programs 542–559 · list fundamentals revisited", difficulty: "core", minutes: 20, tier: "should",
            summary: "2,882 problems with the answers folded away — list fundamentals revisited.",
            keywords: ["list", "fundamentals", "revisited"] },
          { id: "c4.7", title: "Programs 560–566 · arrays, memory and membership", difficulty: "core", minutes: 20, tier: "should",
            summary: "2,882 problems with the answers folded away — arrays, memory and membership.",
            keywords: ["arrays", "memory", "membership"] }
        ]
      },

      {
        id: "dicts", dir: "05_dicts", short: "B5",
        phase: "Phase 1 · Language basics",
        title: "Dictionaries, Sets and Collections",
        blurb: "Hash-backed containers and the four `collections` types that remove most hand-rolled bookkeeping.",
        outcome: "You can pick between dict, set, Counter, defaultdict and deque by what the problem does, not by habit.",
        lessons: [
          { id: "c5.1", title: "Predict the Output 567–596 · dictionary views and Counter", difficulty: "core", minutes: 30, tier: "should",
            summary: "2,882 problems with the answers folded away — dictionary views and Counter.",
            keywords: ["dictionary", "views", "Counter"] },
          { id: "c5.2", title: "Predict the Output 597–626 · Counter and deque", difficulty: "core", minutes: 30, tier: "should",
            summary: "2,882 problems with the answers folded away — Counter and deque.",
            keywords: ["Counter", "deque"] },
          { id: "c5.3", title: "Predict the Output 627–645 · defaultdict and OrderedDict", difficulty: "core", minutes: 20, tier: "should",
            summary: "2,882 problems with the answers folded away — defaultdict and OrderedDict.",
            keywords: ["defaultdict", "OrderedDict"] },
          { id: "c5.4", title: "Programs 646–665 · dictionaries and sets", difficulty: "core", minutes: 20, tier: "should",
            summary: "2,882 problems with the answers folded away — dictionaries and sets.",
            keywords: ["dictionaries", "sets"] }
        ]
      },

      {
        id: "functions", dir: "06_functions", short: "F1",
        phase: "Phase 2 · Functions",
        title: "Functions, Arguments and Scope",
        blurb: "The six kinds of parameter, what a default is bound to and when, and the scope rules behind the commonest surprise in Python.",
        outcome: "You can read any signature and say what may be passed positionally, and explain a mutable default.",
        lessons: [
          { id: "c6.1", title: "Programs 666–686 · functions and classic routines", difficulty: "core", minutes: 21, tier: "should",
            summary: "2,882 problems with the answers folded away — functions and classic routines.",
            keywords: ["functions", "classic", "routines"] },
          { id: "c6.2", title: "Programs 687–706 · argument packing and signatures", difficulty: "core", minutes: 20, tier: "should",
            summary: "2,882 problems with the answers folded away — argument packing and signatures.",
            keywords: ["argument", "packing", "signatures"] },
          { id: "c6.3", title: "Programs 707–724 · lambda in practice", difficulty: "core", minutes: 20, tier: "should",
            summary: "2,882 problems with the answers folded away — lambda in practice.",
            keywords: ["lambda", "practice"] },
          { id: "c6.4", title: "Predict the Output 725–754 · lambdas, reduce and ranges", difficulty: "core", minutes: 30, tier: "should",
            summary: "2,882 problems with the answers folded away — lambdas, reduce and ranges.",
            keywords: ["lambdas", "reduce", "ranges"] }
        ]
      },

      {
        id: "functional", dir: "07_functional", short: "F2",
        phase: "Phase 2 · Functions",
        title: "Functional Python",
        blurb: "map, filter, reduce, comprehensions and composition - with the question of which of them a comprehension replaces.",
        outcome: "You can write a transformation as a comprehension or a pipeline and justify the choice.",
        lessons: [
          { id: "c7.1", title: "Programs 755–776 · sorting and matrix maths", difficulty: "core", minutes: 22, tier: "should",
            summary: "2,882 problems with the answers folded away — sorting and matrix maths.",
            keywords: ["sorting", "matrix", "maths"] },
          { id: "c7.2", title: "Programs 777–800 · numerical helpers and automation", difficulty: "core", minutes: 24, tier: "should",
            summary: "2,882 problems with the answers folded away — numerical helpers and automation.",
            keywords: ["numerical", "helpers", "automation"] },
          { id: "c7.3", title: "Programs 801–829 · ML helpers and parameter kinds", difficulty: "core", minutes: 29, tier: "should",
            summary: "2,882 problems with the answers folded away — ML helpers and parameter kinds.",
            keywords: ["helpers", "parameter", "kinds"] },
          { id: "c7.4", title: "Predict the Output 830–859 · calls, defaults and lambdas", difficulty: "core", minutes: 30, tier: "should",
            summary: "2,882 problems with the answers folded away — calls, defaults and lambdas.",
            keywords: ["calls", "defaults", "lambdas"] },
          { id: "c7.5", title: "Predict the Output 860–889 · decorators and map", difficulty: "core", minutes: 30, tier: "should",
            summary: "2,882 problems with the answers folded away — decorators and map.",
            keywords: ["decorators"] },
          { id: "c7.6", title: "Predict the Output 890–919 · reduce and functional composition", difficulty: "core", minutes: 30, tier: "should",
            summary: "2,882 problems with the answers folded away — reduce and functional composition.",
            keywords: ["reduce", "functional", "composition"] }
        ]
      },

      {
        id: "oop_core", dir: "08_oop_core", short: "O1",
        phase: "Phase 3 · Objects",
        title: "Classes and Protocols",
        blurb: "Classes, inheritance, the attribute lookup rules, and the dunder protocols that make an object behave like a built-in.",
        outcome: "You can implement the protocol a built-in behaviour needs, and trace an attribute lookup through the MRO.",
        lessons: [
          { id: "c8.1", title: "Programs 920–944 · classes, inheritance and testing", difficulty: "core", minutes: 25, tier: "should",
            summary: "2,882 problems with the answers folded away — classes, inheritance and testing.",
            keywords: ["classes", "inheritance", "testing"] },
          { id: "c8.2", title: "Programs 945–967 · attribute semantics and dunder protocols", difficulty: "core", minutes: 23, tier: "should",
            summary: "2,882 problems with the answers folded away — attribute semantics and dunder protocols.",
            keywords: ["attribute", "semantics", "dunder", "protocols"] },
          { id: "c8.3", title: "Predict the Output 968–997 · repr, str and abstract base classes", difficulty: "core", minutes: 30, tier: "should",
            summary: "2,882 problems with the answers folded away — repr, str and abstract base classes.",
            keywords: ["repr", "abstract", "base", "classes"] },
          { id: "c8.4", title: "Predict the Output 998–1027 · equality, hashing and inheritance", difficulty: "core", minutes: 30, tier: "should",
            summary: "2,882 problems with the answers folded away — equality, hashing and inheritance.",
            keywords: ["equality", "hashing", "inheritance"] },
          { id: "c8.5", title: "Predict the Output 1028–1057 · super() and the MRO", difficulty: "core", minutes: 30, tier: "should",
            summary: "2,882 problems with the answers folded away — super() and the MRO.",
            keywords: ["super"] }
        ]
      },

      {
        id: "oop_depth", dir: "09_oop_depth", short: "O2",
        phase: "Phase 3 · Objects",
        title: "Descriptors, Metaclasses and the MRO",
        blurb: "The machinery underneath the class statement: descriptors, `__slots__`, metaclasses, and what cooperative `super()` actually does.",
        outcome: "You can write a descriptor and explain what a metaclass buys over a class decorator.",
        lessons: [
          { id: "c9.1", title: "Programs 1058–1074 · descriptors and a miniature ORM", difficulty: "core", minutes: 20, tier: "should",
            summary: "2,882 problems with the answers folded away — descriptors and a miniature ORM.",
            keywords: ["descriptors", "miniature"] },
          { id: "c9.2", title: "Programs 1075–1100 · behavioural patterns and interfaces", difficulty: "core", minutes: 26, tier: "should",
            summary: "2,882 problems with the answers folded away — behavioural patterns and interfaces.",
            keywords: ["behavioural", "patterns", "interfaces"] },
          { id: "c9.3", title: "Programs 1101–1128 · custom iterators and hashing", difficulty: "core", minutes: 28, tier: "should",
            summary: "2,882 problems with the answers folded away — custom iterators and hashing.",
            keywords: ["custom", "iterators", "hashing"] },
          { id: "c9.4", title: "Programs 1129–1156 · hashing, memory and the MRO", difficulty: "core", minutes: 28, tier: "should",
            summary: "2,882 problems with the answers folded away — hashing, memory and the MRO.",
            keywords: ["hashing", "memory"] },
          { id: "c9.5", title: "Programs 1157–1186 · decorators to async generators", difficulty: "core", minutes: 30, tier: "should",
            summary: "2,882 problems with the answers folded away — decorators to async generators.",
            keywords: ["decorators", "async", "generators"] }
        ]
      },

      {
        id: "patterns", dir: "10_patterns", short: "O3",
        phase: "Phase 3 · Objects",
        title: "Design Patterns in Python",
        blurb: "The classic patterns, several of which collapse into a function or a module here - which is itself the lesson.",
        outcome: "You can name the decision each pattern moves, and say which ones Python makes unnecessary.",
        lessons: [
          { id: "c10.1", title: "Programs 1187–1200 · paths, files and context managers", difficulty: "core", minutes: 20, tier: "should",
            summary: "2,882 problems with the answers folded away — paths, files and context managers.",
            keywords: ["paths", "files", "context", "managers"] },
          { id: "c10.2", title: "Programs 1201–1228 · pattern matching and data structures", difficulty: "core", minutes: 28, tier: "should",
            summary: "2,882 problems with the answers folded away — pattern matching and data structures.",
            keywords: ["pattern", "matching", "data", "structures"] },
          { id: "c10.3", title: "Programs 1229–1244 · parsers and creational patterns", difficulty: "core", minutes: 20, tier: "should",
            summary: "2,882 problems with the answers folded away — parsers and creational patterns.",
            keywords: ["parsers", "creational", "patterns"] },
          { id: "c10.4", title: "Programs 1245–1261 · architectural patterns and plugins", difficulty: "core", minutes: 20, tier: "should",
            summary: "2,882 problems with the answers folded away — architectural patterns and plugins.",
            keywords: ["architectural", "patterns", "plugins"] },
          { id: "c10.5", title: "Programs 1262–1289 · OOP principles and structural patterns", difficulty: "core", minutes: 28, tier: "should",
            summary: "2,882 problems with the answers folded away — OOP principles and structural patterns.",
            keywords: ["principles", "structural", "patterns"] },
          { id: "c10.6", title: "Programs 1290–1298 · plugin architecture and DDD", difficulty: "core", minutes: 20, tier: "should",
            summary: "2,882 problems with the answers folded away — plugin architecture and DDD.",
            keywords: ["plugin", "architecture"] }
        ]
      },

      {
        id: "decorators", dir: "11_decorators", short: "A1",
        phase: "Phase 4 · Advanced",
        title: "Decorators and Closures",
        blurb: "A closure, a decorator, the order they apply in, and why `functools.wraps` is not optional.",
        outcome: "You can write a parameterised decorator and predict the order a stack of them runs in.",
        lessons: [
          { id: "c11.1", title: "Programs 1299–1319 · decorators, properties and pdb", difficulty: "core", minutes: 21, tier: "should",
            summary: "2,882 problems with the answers folded away — decorators, properties and pdb.",
            keywords: ["decorators", "properties"] },
          { id: "c11.2", title: "Predict the Output 1320–1349 · decorator order and exceptions", difficulty: "core", minutes: 30, tier: "should",
            summary: "2,882 problems with the answers folded away — decorator order and exceptions.",
            keywords: ["decorator", "order", "exceptions"] },
          { id: "c11.3", title: "Predict the Output 1350–1379 · parameterised decorators and iterators", difficulty: "core", minutes: 30, tier: "should",
            summary: "2,882 problems with the answers folded away — parameterised decorators and iterators.",
            keywords: ["parameterised", "decorators", "iterators"] }
        ]
      },

      {
        id: "generators", dir: "12_generators", short: "A2",
        phase: "Phase 4 · Advanced",
        title: "Generators and Iterators",
        blurb: "The iterator protocol, laziness, `yield from`, and the itertools recipes worth knowing by name.",
        outcome: "You can build a lazy pipeline and say where it allocates and where it does not.",
        lessons: [
          { id: "c12.1", title: "Predict the Output 1380–1409 · yield from and generator pipelines", difficulty: "core", minutes: 30, tier: "should",
            summary: "2,882 problems with the answers folded away — yield from and generator pipelines.",
            keywords: ["yield", "from", "generator", "pipelines"] },
          { id: "c12.2", title: "Predict the Output 1410–1439 · itertools recipes and dataclasses", difficulty: "core", minutes: 30, tier: "should",
            summary: "2,882 problems with the answers folded away — itertools recipes and dataclasses.",
            keywords: ["itertools", "recipes", "dataclasses"] },
          { id: "c12.3", title: "Predict the Output 1440–1469 · generators and laziness", difficulty: "core", minutes: 30, tier: "should",
            summary: "2,882 problems with the answers folded away — generators and laziness.",
            keywords: ["generators", "laziness"] },
          { id: "c12.4", title: "Predict the Output 1470–1499 · generator expressions and nested dicts", difficulty: "core", minutes: 30, tier: "should",
            summary: "2,882 problems with the answers folded away — generator expressions and nested dicts.",
            keywords: ["generator", "expressions", "nested", "dicts"] }
        ]
      },

      {
        id: "internals", dir: "13_internals", short: "A3",
        phase: "Phase 4 · Advanced",
        title: "Internals, Memory and Performance",
        blurb: "Reference counting, the cycle collector, interning, bytecode, and measuring before optimising.",
        outcome: "You can explain where an object's memory goes and profile a program rather than guess at it.",
        lessons: [
          { id: "c13.1", title: "Programs 1500–1519 · nested data and bit counting", difficulty: "core", minutes: 20, tier: "should",
            summary: "2,882 problems with the answers folded away — nested data and bit counting.",
            keywords: ["nested", "data", "counting"] },
          { id: "c13.2", title: "Predict the Output 1520–1549 · types and class creation", difficulty: "core", minutes: 30, tier: "should",
            summary: "2,882 problems with the answers folded away — types and class creation.",
            keywords: ["types", "class", "creation"] },
          { id: "c13.3", title: "Predict the Output 1550–1569 · attribute lookup and protocols", difficulty: "core", minutes: 20, tier: "should",
            summary: "2,882 problems with the answers folded away — attribute lookup and protocols.",
            keywords: ["attribute", "lookup", "protocols"] },
          { id: "c13.4", title: "Programs 1570–1597 · execution order and interpreter internals", difficulty: "core", minutes: 28, tier: "should",
            summary: "2,882 problems with the answers folded away — execution order and interpreter internals.",
            keywords: ["execution", "order", "interpreter", "internals"] },
          { id: "c13.5", title: "Programs 1598–1606 · profiling and benchmarking", difficulty: "core", minutes: 20, tier: "should",
            summary: "2,882 problems with the answers folded away — profiling and benchmarking.",
            keywords: ["profiling", "benchmarking"] }
        ]
      },

      {
        id: "errors", dir: "14_errors", short: "E1",
        phase: "Phase 5 · Errors and I/O",
        title: "Exceptions and Control Flow",
        blurb: "try, except, else and finally in execution order, custom exception hierarchies, and the `finally` that swallows an error.",
        outcome: "You can design an exception hierarchy and say exactly when each clause runs.",
        lessons: [
          { id: "c14.1", title: "Programs 1607–1630 · context managers to classic algorithms", difficulty: "core", minutes: 24, tier: "should",
            summary: "2,882 problems with the answers folded away — context managers to classic algorithms.",
            keywords: ["context", "managers", "classic", "algorithms"] },
          { id: "c14.2", title: "Programs 1631–1659 · file I/O and exception chaining", difficulty: "core", minutes: 29, tier: "should",
            summary: "2,882 problems with the answers folded away — file I/O and exception chaining.",
            keywords: ["file", "exception", "chaining"] },
          { id: "c14.3", title: "Programs 1660–1688 · error strategy and filesystem work", difficulty: "core", minutes: 29, tier: "should",
            summary: "2,882 problems with the answers folded away — error strategy and filesystem work.",
            keywords: ["error", "strategy", "filesystem", "work"] },
          { id: "c14.4", title: "Programs 1689–1717 · locking and try/finally", difficulty: "core", minutes: 29, tier: "should",
            summary: "2,882 problems with the answers folded away — locking and try/finally.",
            keywords: ["locking", "finally"] }
        ]
      },

      {
        id: "fileio", dir: "15_fileio", short: "E2",
        phase: "Phase 5 · Errors and I/O",
        title: "Files, Paths and Serialisation",
        blurb: "Reading and writing safely, pathlib, CSV, JSON and pickle - and the context manager that guarantees the close.",
        outcome: "You can write file-handling code that survives an exception and choose a serialisation format deliberately.",
        lessons: [
          { id: "c15.1", title: "Predict the Output 1718–1747 · exception flow", difficulty: "core", minutes: 30, tier: "should",
            summary: "2,882 problems with the answers folded away — exception flow.",
            keywords: ["exception", "flow"] },
          { id: "c15.2", title: "Predict the Output 1748–1777 · paths and error handling", difficulty: "core", minutes: 30, tier: "should",
            summary: "2,882 problems with the answers folded away — paths and error handling.",
            keywords: ["paths", "error", "handling"] },
          { id: "c15.3", title: "Programs 1778–1796 · context managers in depth", difficulty: "core", minutes: 20, tier: "should",
            summary: "2,882 problems with the answers folded away — context managers in depth.",
            keywords: ["context", "managers", "depth"] },
          { id: "c15.4", title: "Programs 1797–1820 · threads to async pipelines", difficulty: "core", minutes: 24, tier: "should",
            summary: "2,882 problems with the answers folded away — threads to async pipelines.",
            keywords: ["threads", "async", "pipelines"] }
        ]
      },

      {
        id: "concurrency", dir: "16_concurrency", short: "C1",
        phase: "Phase 6 · Concurrency",
        title: "Threads, Locks and Processes",
        blurb: "What the GIL does and does not prevent, where a lock is needed, and when a process is the only answer.",
        outcome: "You can decide between a thread and a process from whether the work waits or computes.",
        lessons: [
          { id: "c16.1", title: "Programs 1821–1843 · async fundamentals and futures", difficulty: "core", minutes: 23, tier: "should",
            summary: "2,882 problems with the answers folded away — async fundamentals and futures.",
            keywords: ["async", "fundamentals", "futures"] },
          { id: "c16.2", title: "Programs 1844–1868 · timeouts, daemons and multiprocessing", difficulty: "core", minutes: 25, tier: "should",
            summary: "2,882 problems with the answers folded away — timeouts, daemons and multiprocessing.",
            keywords: ["timeouts", "daemons", "multiprocessing"] },
          { id: "c16.3", title: "Predict the Output 1869–1898 · threads and executors", difficulty: "core", minutes: 30, tier: "should",
            summary: "2,882 problems with the answers folded away — threads and executors.",
            keywords: ["threads", "executors"] },
          { id: "c16.4", title: "Predict the Output 1899–1918 · concurrency edge cases", difficulty: "core", minutes: 20, tier: "should",
            summary: "2,882 problems with the answers folded away — concurrency edge cases.",
            keywords: ["concurrency", "edge", "cases"] }
        ]
      },

      {
        id: "async", dir: "17_async", short: "C2",
        phase: "Phase 6 · Concurrency",
        title: "Async and the Event Loop",
        blurb: "Coroutines, gather, timeouts, async iterators, backpressure, and the one blocking call that stalls everything.",
        outcome: "You can write an async pipeline with bounded concurrency and spot what blocks the loop.",
        lessons: [
          { id: "c17.1", title: "Programs 1919–1947 · async iterators and deadlocks", difficulty: "core", minutes: 29, tier: "should",
            summary: "2,882 problems with the answers folded away — async iterators and deadlocks.",
            keywords: ["async", "iterators", "deadlocks"] },
          { id: "c17.2", title: "Programs 1948–1974 · futures, semaphores and async clients", difficulty: "core", minutes: 27, tier: "should",
            summary: "2,882 problems with the answers folded away — futures, semaphores and async clients.",
            keywords: ["futures", "semaphores", "async", "clients"] },
          { id: "c17.3", title: "Programs 1975–1997 · queues, locks and distributed work", difficulty: "core", minutes: 23, tier: "should",
            summary: "2,882 problems with the answers folded away — queues, locks and distributed work.",
            keywords: ["queues", "locks", "distributed", "work"] },
          { id: "c17.4", title: "Programs 1998–2007 · event loop internals and backpressure", difficulty: "core", minutes: 20, tier: "should",
            summary: "2,882 problems with the answers folded away — event loop internals and backpressure.",
            keywords: ["event", "loop", "internals", "backpressure"] }
        ]
      },

      {
        id: "tooling", dir: "18_tooling", short: "T1",
        phase: "Phase 7 · Craft",
        title: "Testing, Packaging and Tooling",
        blurb: "pytest, mocking, logging, packaging, typing and CI - the work that makes code survive other people.",
        outcome: "You can test a unit without reaching for the network, and package something installable.",
        lessons: [
          { id: "c18.1", title: "Programs 2008–2034 · unittest, logging and reporting", difficulty: "core", minutes: 27, tier: "should",
            summary: "2,882 problems with the answers folded away — unittest, logging and reporting.",
            keywords: ["unittest", "logging", "reporting"] },
          { id: "c18.2", title: "Programs 2035–2060 · pytest, profiling and CLIs", difficulty: "core", minutes: 26, tier: "should",
            summary: "2,882 problems with the answers folded away — pytest, profiling and CLIs.",
            keywords: ["pytest", "profiling", "CLIs"] },
          { id: "c18.3", title: "Programs 2061–2089 · mocking, uuid and itertools", difficulty: "core", minutes: 29, tier: "should",
            summary: "2,882 problems with the answers folded away — mocking, uuid and itertools.",
            keywords: ["mocking", "uuid", "itertools"] },
          { id: "c18.4", title: "Predict the Output 2090–2113 · regular expressions, continued", difficulty: "core", minutes: 24, tier: "should",
            summary: "2,882 problems with the answers folded away — regular expressions, continued.",
            keywords: ["regular", "expressions", "continued"] },
          { id: "c18.5", title: "Programs 2114–2137 · packaging and dependency management", difficulty: "core", minutes: 24, tier: "should",
            summary: "2,882 problems with the answers folded away — packaging and dependency management.",
            keywords: ["packaging", "dependency", "management"] },
          { id: "c18.6", title: "Programs 2138–2157 · linting, typing and CI", difficulty: "core", minutes: 20, tier: "should",
            summary: "2,882 problems with the answers folded away — linting, typing and CI.",
            keywords: ["linting", "typing"] },
          { id: "c18.7", title: "Programs 2158–2176 · contract testing and supply-chain checks", difficulty: "core", minutes: 20, tier: "should",
            summary: "2,882 problems with the answers folded away — contract testing and supply-chain checks.",
            keywords: ["contract", "testing", "supply", "chain", "checks"] }
        ]
      },

      {
        id: "regex", dir: "19_regex", short: "T2",
        phase: "Phase 7 · Craft",
        title: "Regex, Parsing and the Import System",
        blurb: "Regular expressions from the four calls people confuse, plus parsing and how an import is actually resolved.",
        outcome: "You can write a regex you can still read next month, and explain what shadows the standard library.",
        lessons: [
          { id: "c19.1", title: "Programs 2177–2206 · parsing, regex and the import system", difficulty: "core", minutes: 30, tier: "should",
            summary: "2,882 problems with the answers folded away — parsing, regex and the import system.",
            keywords: ["parsing", "regex", "import", "system"] },
          { id: "c19.2", title: "Predict the Output 2207–2236 · itertools and string templates", difficulty: "core", minutes: 30, tier: "should",
            summary: "2,882 problems with the answers folded away — itertools and string templates.",
            keywords: ["itertools", "string", "templates"] },
          { id: "c19.3", title: "Predict the Output 2237–2266 · regular expressions", difficulty: "core", minutes: 30, tier: "should",
            summary: "2,882 problems with the answers folded away — regular expressions.",
            keywords: ["regular", "expressions"] },
          { id: "c19.4", title: "Programs 2267–2292 · testing strategy and structured logging", difficulty: "core", minutes: 26, tier: "should",
            summary: "2,882 problems with the answers folded away — testing strategy and structured logging.",
            keywords: ["testing", "strategy", "structured", "logging"] }
        ]
      },

      {
        id: "web", dir: "20_web", short: "W1",
        phase: "Phase 8 · Services",
        title: "Web, APIs and Validation",
        blurb: "Sockets, HTTP clients, URLs and signing, validation, middleware and REST semantics.",
        outcome: "You can consume an API defensively and validate what arrives at a boundary.",
        lessons: [
          { id: "c20.1", title: "Programs 2293–2316 · sockets, DNS and service endpoints", difficulty: "core", minutes: 24, tier: "should",
            summary: "2,882 problems with the answers folded away — sockets, DNS and service endpoints.",
            keywords: ["sockets", "service", "endpoints"] },
          { id: "c20.2", title: "Programs 2317–2341 · websockets, webhooks and routing", difficulty: "core", minutes: 25, tier: "should",
            summary: "2,882 problems with the answers folded away — websockets, webhooks and routing.",
            keywords: ["websockets", "webhooks", "routing"] },
          { id: "c20.3", title: "Programs 2342–2367 · validation and HTTP clients", difficulty: "core", minutes: 26, tier: "should",
            summary: "2,882 problems with the answers folded away — validation and HTTP clients.",
            keywords: ["validation", "HTTP", "clients"] },
          { id: "c20.4", title: "Programs 2368–2396 · URLs, signing and request bodies", difficulty: "core", minutes: 29, tier: "should",
            summary: "2,882 problems with the answers folded away — URLs, signing and request bodies.",
            keywords: ["URLs", "signing", "request", "bodies"] },
          { id: "c20.5", title: "Programs 2397–2418 · serialisation gotchas and REST semantics", difficulty: "core", minutes: 22, tier: "should",
            summary: "2,882 problems with the answers folded away — serialisation gotchas and REST semantics.",
            keywords: ["serialisation", "gotchas", "REST", "semantics"] },
          { id: "c20.6", title: "Programs 2419–2438 · middleware, sessions and uploads", difficulty: "core", minutes: 20, tier: "should",
            summary: "2,882 problems with the answers folded away — middleware, sessions and uploads.",
            keywords: ["middleware", "sessions", "uploads"] }
        ]
      },

      {
        id: "structures", dir: "21_structures", short: "D1",
        phase: "Phase 9 · Algorithms",
        title: "Data Structures and Search",
        blurb: "Linked structures, heaps, tries, caches, cycle detection and the search techniques that go with them.",
        outcome: "You can pick a structure from the operations a problem needs and state what each one costs.",
        lessons: [
          { id: "c21.1", title: "Programs 2439–2462 · combinatorics and linked structures", difficulty: "core", minutes: 24, tier: "should",
            summary: "2,882 problems with the answers folded away — combinatorics and linked structures.",
            keywords: ["combinatorics", "linked", "structures"] },
          { id: "c21.2", title: "Programs 2463–2488 · caches and cycle detection", difficulty: "core", minutes: 26, tier: "should",
            summary: "2,882 problems with the answers folded away — caches and cycle detection.",
            keywords: ["caches", "cycle", "detection"] },
          { id: "c21.3", title: "Programs 2489–2509 · search and advanced structures", difficulty: "core", minutes: 21, tier: "should",
            summary: "2,882 problems with the answers folded away — search and advanced structures.",
            keywords: ["search", "advanced", "structures"] },
          { id: "c21.4", title: "Programs 2510–2538 · in-place rotation and copy semantics", difficulty: "core", minutes: 29, tier: "should",
            summary: "2,882 problems with the answers folded away — in-place rotation and copy semantics.",
            keywords: ["place", "rotation", "copy", "semantics"] },
          { id: "c21.5", title: "Programs 2539–2567 · built-in predicates and sorting", difficulty: "core", minutes: 29, tier: "should",
            summary: "2,882 problems with the answers folded away — built-in predicates and sorting.",
            keywords: ["built", "predicates", "sorting"] }
        ]
      },

      {
        id: "algorithms", dir: "22_algorithms", short: "D2",
        phase: "Phase 9 · Algorithms",
        title: "Graphs, Maths and Strings",
        blurb: "Trees and graphs, sorting and string matching, number theory, matrices, ciphers and dynamic programming - with the complexity argued each time.",
        outcome: "You can write a traversal from memory and take a problem from brute force to a tabulated solution.",
        lessons: [
          { id: "c22.1", title: "Programs 2568–2596 · trees, sorting and string matching", difficulty: "core", minutes: 29, tier: "should",
            summary: "2,882 problems with the answers folded away — trees, sorting and string matching.",
            keywords: ["trees", "sorting", "string", "matching"] },
          { id: "c22.2", title: "Programs 2597–2621 · graphs, LCA and caching", difficulty: "core", minutes: 25, tier: "should",
            summary: "2,882 problems with the answers folded away — graphs, LCA and caching.",
            keywords: ["graphs", "caching"] },
          { id: "c22.3", title: "Programs 2622–2667 · grids, parsing and number theory", difficulty: "core", minutes: 28, tier: "should",
            summary: "2,882 problems with the answers folded away — grids, parsing and number theory.",
            keywords: ["grids", "parsing", "number", "theory"] },
          { id: "c22.4", title: "Programs 2668–2690 · maths, matrices and ciphers", difficulty: "core", minutes: 23, tier: "should",
            summary: "2,882 problems with the answers folded away — maths, matrices and ciphers.",
            keywords: ["maths", "matrices", "ciphers"] },
          { id: "c22.5", title: "Programs 2691–2719 · security primitives and edit distance", difficulty: "core", minutes: 29, tier: "should",
            summary: "2,882 problems with the answers folded away — security primitives and edit distance.",
            keywords: ["security", "primitives", "edit", "distance"] }
        ]
      },

      {
        id: "production", dir: "23_production", short: "P1",
        phase: "Phase 10 · Production",
        title: "Databases, Deployment and Operations",
        blurb: "ORMs and query plans, caching, resilience, containers, observability and the scenario sets that put it together.",
        outcome: "You can reason about a production failure from its symptoms and name what you would measure.",
        lessons: [
          { id: "c23.1", title: "Programs 2720–2741 · databases, ORMs and caching", difficulty: "core", minutes: 22, tier: "should",
            summary: "2,882 problems with the answers folded away — databases, ORMs and caching.",
            keywords: ["databases", "ORMs", "caching"] },
          { id: "c23.2", title: "Programs 2742–2759 · resilience, events and observability", difficulty: "core", minutes: 20, tier: "should",
            summary: "2,882 problems with the answers folded away — resilience, events and observability.",
            keywords: ["resilience", "events", "observability"] },
          { id: "c23.3", title: "Programs 2760–2787 · containers, deploys and production debugging", difficulty: "core", minutes: 28, tier: "should",
            summary: "2,882 problems with the answers folded away — containers, deploys and production debugging.",
            keywords: ["containers", "deploys", "production", "debugging"] },
          { id: "c23.4", title: "Programs 2788–2815 · performance, security and system design", difficulty: "core", minutes: 28, tier: "should",
            summary: "2,882 problems with the answers folded away — performance, security and system design.",
            keywords: ["performance", "security", "system", "design"] },
          { id: "c23.5", title: "Programs 2816–2838 · batch systems, rollout and operations", difficulty: "core", minutes: 23, tier: "should",
            summary: "2,882 problems with the answers folded away — batch systems, rollout and operations.",
            keywords: ["batch", "systems", "rollout", "operations"] },
          { id: "c23.6", title: "Programs 2839–2862 · query plans, CQRS and architecture", difficulty: "core", minutes: 24, tier: "should",
            summary: "2,882 problems with the answers folded away — query plans, CQRS and architecture.",
            keywords: ["query", "plans", "CQRS", "architecture"] },
          { id: "c23.7", title: "Programs 2863–2882 · Topic-wise scenario sets · twenty topics end to end", difficulty: "core", minutes: 20, tier: "should",
            summary: "2,882 problems with the answers folded away — Topic-wise scenario sets · twenty topics end to end.",
            keywords: ["Topic", "wise", "scenario", "sets", "twenty", "topics"] }
        ]
      }
    ]
  });
})();
