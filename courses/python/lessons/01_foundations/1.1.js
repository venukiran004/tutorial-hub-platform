/* ============================================================================
   LESSON 1.1 — How Python Actually Runs Your Code
   ========================================================================= */
EC.receiveLesson({
  id: "1.1",

  lede: "Almost every confusing thing about Python — why it is slower than C, why a typo only fails on the line that runs it, why threads do not speed up a calculation, why a `__pycache__` folder keeps appearing — has the same explanation. **One pipeline, four stages.** Learn it once, on the first day, and the rest of the language stops being a list of exceptions to memorise.",

  objectives: [
    "Explain the four stages Python puts your source through before anything executes",
    "Use `dis` to read the bytecode your code compiles to, and predict its behaviour",
    "Distinguish *the Python language* from *CPython*, and say why that distinction matters when choosing a runtime",
    "Trace three well-known Python behaviours back to a specific stage of the pipeline",
    "Explain what `__pycache__` caches, what it does not, and when it can mislead you"
  ],

  prerequisites: [],

  blocks: [

    /* ================================================================== */
    { t: "h2", n: "01", text: "The question this lesson answers", id: "the-question" },

    { t: "p", text: "Here is a piece of Python that behaves in a way beginners find arbitrary and experienced developers stop questioning. Read it and predict the output before you scroll." },

    { t: "code", lang: "python", title: "surprise.py", code: `
def process(records):
    total = 0
    for r in records:
        total += r["amount"]
    return totl          # <- deliberate typo


print("starting")
print(process([]))       # empty list: the loop body never runs
`},

    { t: "p", text: "It prints `starting`, then raises `NameError: name 'totl' is not defined`. Two things are worth noticing, and neither is obvious." },

    { t: "ol", items: [
      "The typo on line 5 did **not** stop the file from loading. `print(\"starting\")` ran first.",
      "Passing a non-empty list would have raised the same error, but passing an empty list *still* raised it — even though the misspelled line is inside no branch that was skipped."
    ]},

    { t: "p", text: "A compiled language like Java or Rust would have refused to build this file at all. Python ran most of it happily and failed at the exact moment it needed a name that did not exist. That is not sloppiness — it is a direct, predictable consequence of how Python turns your text into behaviour." },

    { t: "callout", kind: "mental", title: "The one-sentence model", body: [
      { t: "p", text: "Python **compiles your whole file up front** into an instruction format called bytecode, then **executes those instructions one at a time**. Compilation checks that your code is grammatically valid. It does not check that your names exist, that your types match, or that your logic is sound — all of that is discovered while running." }
    ]},

    { t: "p", text: "That single sentence resolves the puzzle above. The typo `totl` is grammatically fine — it is a perfectly legal name. Compilation had no objection. Only when the interpreter reached the `return` instruction and tried to look the name up did it fail. And it reached that instruction on the empty list too, because a `for` loop over an empty sequence still falls through to the code after it." },

    /* ================================================================== */
    { t: "h2", n: "02", text: "Python is a language. CPython is a program.", id: "language-vs-implementation",
      sub: "The distinction that most tutorials skip, and that decides which runtime you deploy on." },

    { t: "p", text: "\"Python\" names two different things, and conflating them causes real confusion later." },

    { t: "dl", items: [
      ["The language", "A specification: the grammar, the semantics, what `for` means, what a `dict` guarantees. It is a document, not software."],
      ["An implementation", "An actual program that reads Python source and does what the specification says. When you type `python`, you are almost certainly running **CPython**, the reference implementation written in C."]
    ]},

    { t: "p", text: "This matters because the implementations differ in exactly the places engineers care about: speed, memory, concurrency and C-library compatibility. The language does not mandate a Global Interpreter Lock — CPython has one. The language does not mandate reference counting — CPython uses it." },

    { t: "table",
      head: ["Implementation", "Written in", "What it is for", "The catch"],
      rows: [
        ["**CPython**", "C", "The default. Maximum library compatibility — every C extension targets it.", "The slowest of the mainstream options for pure-Python compute."],
        ["**PyPy**", "RPython", "Long-running pure-Python workloads. A JIT compiler makes hot loops dramatically faster.", "Slower startup; some C extensions are unsupported or slow."],
        ["**Jython / IronPython**", "Java / C#", "Embedding Python inside a JVM or .NET application.", "Lag well behind the current language version."],
        ["**MicroPython**", "C", "Microcontrollers and constrained devices.", "A deliberate subset — no full standard library."]
      ],
      caption: "You will use CPython. Knowing the others exist is what lets you answer *\"could we just make this faster by switching runtime?\"* with something better than a shrug."
    },

    { t: "callout", kind: "trap", title: "\"Python is an interpreted language\" is half-true", body: [
      { t: "p", text: "It is repeated everywhere and it causes a specific misunderstanding: that Python reads and executes your source line by line, like a shell script. It does not. Your file is **fully compiled to bytecode before a single statement runs** — that is why a syntax error on the last line prevents the first line from executing." },
      { t: "code", lang: "python", title: "syntax_error.py", numbered: false, code: `
print("does this print?")

def broken(:          # SyntaxError — invalid grammar
    pass
`, out: `File "syntax_error.py", line 3
    def broken(:
               ^
SyntaxError: invalid syntax`},
      { t: "p", text: "Nothing printed. Compare that with the `NameError` example at the top of this lesson, which printed first. **Grammar is checked ahead of time; meaning is checked as you go.** That is the line, and it is the whole distinction." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "03", text: "The pipeline", id: "the-pipeline",
      sub: "Four transformations between the text you write and the effects you observe." },

    {"kind": "flow", "title": "The CPython pipeline", "caption": "Source text is tokenised, parsed into an AST, compiled to bytecode, and only then executed by the evaluation loop. Every performance, GIL and typing question in the course traces back to one of these five stages.", "cols": 5, "nodes": [{"id": "src", "label": "source .py"}, {"id": "tok", "label": "tokens", "sub": "tokenizer", "tone": "accent"}, {"id": "ast", "label": "AST", "sub": "parser", "tone": "accent"}, {"id": "bc", "label": "bytecode", "sub": "compiler · .pyc", "tone": "good"}, {"id": "vm", "label": "eval loop", "sub": "the PVM", "tone": "warn"}], "edges": [["src", "tok"], ["tok", "ast"], ["ast", "bc"], ["bc", "vm"]], "t": "diagram", "id": "dg-1_1-03-0"},



    { t: "viz",
      title: "Source to execution in CPython",
      caption: "Stages 1–3 happen once, up front, for the entire file. Stage 4 is a loop that runs until your program ends. The dashed path is the bytecode cache — written for imported modules, skipped for the script you launch directly.",
      svg: `<svg viewBox="0 0 920 300" role="img" aria-label="Diagram: Python source is tokenised, parsed into an AST, compiled to bytecode, then executed by the evaluation loop">
  <defs>
    <marker id="a1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
      <path d="M0 1 L9 5 L0 9 z" style="fill:var(--border-strong)"/>
    </marker>
  </defs>

  <text x="20" y="26" class="s-sub" style="font-weight:700;letter-spacing:.08em">COMPILE TIME — ONCE, FOR THE WHOLE FILE</text>
  <text x="700" y="26" class="s-sub" style="font-weight:700;letter-spacing:.08em">RUNTIME — REPEATEDLY</text>
  <line x1="20" y1="34" x2="660" y2="34" style="stroke:var(--border)" stroke-width="1"/>
  <line x1="700" y1="34" x2="900" y2="34" style="stroke:var(--accent-line)" stroke-width="1"/>

  <!-- stage boxes -->
  <g>
    <rect x="20" y="62" width="108" height="66" rx="9" class="s-fill s-stroke" stroke-width="1"/>
    <text x="74" y="88" text-anchor="middle" class="s-label">Source</text>
    <text x="74" y="105" text-anchor="middle" class="s-sub">your .py file</text>
    <text x="74" y="119" text-anchor="middle" class="s-sub">plain text</text>
  </g>
  <g>
    <rect x="172" y="62" width="108" height="66" rx="9" class="s-fill s-stroke" stroke-width="1"/>
    <text x="226" y="88" text-anchor="middle" class="s-label">Tokeniser</text>
    <text x="226" y="105" text-anchor="middle" class="s-sub">splits text into</text>
    <text x="226" y="119" text-anchor="middle" class="s-sub">meaningful atoms</text>
  </g>
  <g>
    <rect x="324" y="62" width="108" height="66" rx="9" class="s-fill s-stroke" stroke-width="1"/>
    <text x="378" y="88" text-anchor="middle" class="s-label">Parser</text>
    <text x="378" y="105" text-anchor="middle" class="s-sub">builds a tree of</text>
    <text x="378" y="119" text-anchor="middle" class="s-sub">what it means</text>
  </g>
  <g>
    <rect x="476" y="62" width="108" height="66" rx="9" class="s-fill s-stroke" stroke-width="1"/>
    <text x="530" y="88" text-anchor="middle" class="s-label">Compiler</text>
    <text x="530" y="105" text-anchor="middle" class="s-sub">flattens tree into</text>
    <text x="530" y="119" text-anchor="middle" class="s-sub">instructions</text>
  </g>
  <g>
    <rect x="628" y="62" width="108" height="66" rx="9" class="s-fill s-stroke" stroke-width="1"/>
    <text x="682" y="88" text-anchor="middle" class="s-label">Code object</text>
    <text x="682" y="105" text-anchor="middle" class="s-sub">bytecode +</text>
    <text x="682" y="119" text-anchor="middle" class="s-sub">constants + names</text>
  </g>
  <g>
    <rect x="780" y="62" width="120" height="66" rx="9" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1"/>
    <text x="840" y="88" text-anchor="middle" class="s-label">Eval loop</text>
    <text x="840" y="105" text-anchor="middle" class="s-sub">the virtual machine</text>
    <text x="840" y="119" text-anchor="middle" class="s-sub">executes, one at a time</text>
  </g>

  <!-- arrows + artefact labels -->
  <line x1="128" y1="95" x2="166" y2="95" style="stroke:var(--border-strong)" stroke-width="1.4" marker-end="url(#a1)"/>
  <text x="147" y="86" text-anchor="middle" class="s-sub">text</text>
  <line x1="280" y1="95" x2="318" y2="95" style="stroke:var(--border-strong)" stroke-width="1.4" marker-end="url(#a1)"/>
  <text x="299" y="86" text-anchor="middle" class="s-sub">tokens</text>
  <line x1="432" y1="95" x2="470" y2="95" style="stroke:var(--border-strong)" stroke-width="1.4" marker-end="url(#a1)"/>
  <text x="451" y="86" text-anchor="middle" class="s-sub">AST</text>
  <line x1="584" y1="95" x2="622" y2="95" style="stroke:var(--border-strong)" stroke-width="1.4" marker-end="url(#a1)"/>
  <text x="603" y="86" text-anchor="middle" class="s-sub">ops</text>
  <line x1="736" y1="95" x2="774" y2="95" style="stroke:var(--accent)" stroke-width="1.6" marker-end="url(#a1)"/>

  <!-- what each stage catches -->
  <text x="226" y="152" text-anchor="middle" class="s-sub" style="fill:var(--crit)">catches: bad characters</text>
  <text x="378" y="152" text-anchor="middle" class="s-sub" style="fill:var(--crit)">catches: SyntaxError</text>
  <text x="530" y="152" text-anchor="middle" class="s-sub" style="fill:var(--crit)">catches: bad scope use</text>
  <text x="840" y="152" text-anchor="middle" class="s-sub" style="fill:var(--crit)">catches: everything else</text>

  <!-- pycache -->
  <rect x="600" y="196" width="164" height="56" rx="9" class="s-fill-2 s-stroke" stroke-width="1" stroke-dasharray="4 3"/>
  <text x="682" y="219" text-anchor="middle" class="s-mono">__pycache__/*.pyc</text>
  <text x="682" y="238" text-anchor="middle" class="s-sub">imported modules only</text>
  <line x1="682" y1="130" x2="682" y2="192" style="stroke:var(--border-strong)" stroke-width="1.2" stroke-dasharray="4 3" marker-end="url(#a1)"/>
  <text x="694" y="166" class="s-sub">cached</text>

  <path d="M600 224 L520 224 L520 140" style="stroke:var(--border-strong);fill:none" stroke-width="1.2" stroke-dasharray="4 3" marker-end="url(#a1)"/>
  <text x="470" y="196" class="s-sub">next run: skip stages 1–3</text>
</svg>`
    },

    { t: "p", text: "You can watch each stage happen. The standard library exposes all four, which is unusual and genuinely useful — most languages hide their compiler." },

    { t: "tabs", items: [
      { label: "1 · Tokenise", blocks: [
        { t: "code", lang: "python", title: "stage 1 — text becomes atoms", code: `
import io
import tokenize

source = "total = price * 1.08\\n"

for tok in tokenize.generate_tokens(io.StringIO(source).readline):
    if tok.string.strip():
        print(f"{tokenize.tok_name[tok.type]:<10} {tok.string!r}")
`, out: `NAME       'total'
OP         '='
NAME       'price'
OP         '*'
NUMBER     '1.08'
NEWLINE    '\\n'`},
        { t: "p", text: "The tokeniser has no idea what `price` is or whether multiplication makes sense here. It only knows it found a name, an operator, a name, an operator and a number. This stage is also where Python's famous indentation handling happens — it emits invisible `INDENT` and `DEDENT` tokens that other languages get from braces." }
      ]},
      { label: "2 · Parse", blocks: [
        { t: "code", lang: "python", title: "stage 2 — atoms become structure", code: `
import ast

tree = ast.parse("total = price * 1.08")
print(ast.dump(tree, indent=2))
`, out: `Module(
  body=[
    Assign(
      targets=[
        Name(id='total', ctx=Store())],
      value=BinOp(
        left=Name(id='price', ctx=Load()),
        op=Mult(),
        right=Constant(value=1.08)))],
  type_ignores=[])`},
        { t: "p", text: "Now there is meaning. The parser has worked out that this is an assignment, that its right-hand side is a binary operation, and — importantly — that `total` is being **stored** while `price` is being **loaded**. That `ctx=Store()` versus `ctx=Load()` distinction is decided here, at compile time, and it is what makes Python's scoping rules work the way they do." },
        { t: "p", text: "This stage is where `SyntaxError` comes from. The grammar either accepts your token sequence or it does not." }
      ]},
      { label: "3 · Compile", blocks: [
        { t: "code", lang: "python", title: "stage 3 — structure becomes instructions", code: `
code = compile("total = price * 1.08", filename="<demo>", mode="exec")

print(type(code))
print("constants:", code.co_names)
print("names:    ", code.co_consts)
print("bytes:    ", len(code.co_code), "bytes of bytecode")
`, out: `<class 'code'>
constants: ('price', 'total')
names:     (1.08, None)
bytes:     ... bytes of bytecode`},
        { t: "p", text: "The tree has been flattened into a **code object** — a container holding the raw bytecode plus everything the instructions refer to: constant values, names, argument counts, the filename and a line-number table for tracebacks. Code objects are ordinary Python objects. You can inspect them, pass them around, and store them." }
      ]},
      { label: "4 · Execute", blocks: [
        { t: "code", lang: "python", title: "stage 4 — instructions become effects", code: `
code = compile("total = price * 1.08", "<demo>", "exec")

namespace = {"price": 250.0}
exec(code, namespace)

print(namespace["total"])
`, out: `270.0`},
        { t: "p", text: "The evaluation loop walks the instructions in order against a namespace. Note what had to be true only *now*: `price` had to exist. Compilation happily produced an instruction saying \"load the name price\" without caring whether anything by that name would be there." }
      ]}
    ]},

    /* ================================================================== */
    { t: "h2", n: "04", text: "Reading the bytecode", id: "reading-bytecode",
      sub: "The single most useful debugging tool nobody teaches beginners." },

    { t: "p", text: "The `dis` module disassembles a code object into something readable. This is not an academic exercise — it is how you settle arguments about what Python is really doing." },

    { t: "code", lang: "python", title: "disassemble.py", code: `
import dis


def apply_tax(price: float, rate: float) -> float:
    return price * (1 + rate)


dis.dis(apply_tax)
`, out: `  4           RESUME                   0

  5           LOAD_FAST                0 (price)
              LOAD_CONST               1 (1)
              LOAD_FAST                1 (rate)
              BINARY_OP                0 (+)
              BINARY_OP                5 (*)
              RETURN_VALUE`,
      outLabel: "Output (CPython 3.12 — opcodes vary between versions)"
    },

    { t: "p", text: "Six instructions. Read them as commands to a machine that has one working surface — a stack you push values onto and pop them off of." },

    { t: "viz",
      title: "The value stack, instruction by instruction",
      caption: "CPython's evaluation loop is a stack machine. Every operation takes its inputs from the top of the stack and pushes its result back. This is why `dis` output reads backwards from the expression you wrote — operands must be on the stack before the operator can consume them.",
      svg: `<svg viewBox="0 0 900 250" role="img" aria-label="Diagram: the value stack after each bytecode instruction for price times one plus rate">
  <g>
    <text x="70" y="22" text-anchor="middle" class="s-mono" style="font-size:10.5px">LOAD_FAST price</text>
    <rect x="20" y="150" width="100" height="30" rx="5" class="s-fill-2 s-stroke" stroke-width="1"/>
    <text x="70" y="170" text-anchor="middle" class="s-mono">price</text>
    <line x1="20" y1="196" x2="120" y2="196" style="stroke:var(--border-strong)" stroke-width="1.5"/>
    <text x="70" y="214" text-anchor="middle" class="s-sub">1 value</text>
  </g>

  <g>
    <text x="235" y="22" text-anchor="middle" class="s-mono" style="font-size:10.5px">LOAD_CONST 1</text>
    <rect x="185" y="114" width="100" height="30" rx="5" class="s-fill-2 s-stroke" stroke-width="1"/>
    <text x="235" y="134" text-anchor="middle" class="s-mono">1</text>
    <rect x="185" y="150" width="100" height="30" rx="5" class="s-fill-2 s-stroke" stroke-width="1"/>
    <text x="235" y="170" text-anchor="middle" class="s-mono">price</text>
    <line x1="185" y1="196" x2="285" y2="196" style="stroke:var(--border-strong)" stroke-width="1.5"/>
    <text x="235" y="214" text-anchor="middle" class="s-sub">2 values</text>
  </g>

  <g>
    <text x="400" y="22" text-anchor="middle" class="s-mono" style="font-size:10.5px">LOAD_FAST rate</text>
    <rect x="350" y="78" width="100" height="30" rx="5" class="s-fill-2 s-stroke" stroke-width="1"/>
    <text x="400" y="98" text-anchor="middle" class="s-mono">rate</text>
    <rect x="350" y="114" width="100" height="30" rx="5" class="s-fill-2 s-stroke" stroke-width="1"/>
    <text x="400" y="134" text-anchor="middle" class="s-mono">1</text>
    <rect x="350" y="150" width="100" height="30" rx="5" class="s-fill-2 s-stroke" stroke-width="1"/>
    <text x="400" y="170" text-anchor="middle" class="s-mono">price</text>
    <line x1="350" y1="196" x2="450" y2="196" style="stroke:var(--border-strong)" stroke-width="1.5"/>
    <text x="400" y="214" text-anchor="middle" class="s-sub">3 values</text>
  </g>

  <g>
    <text x="565" y="22" text-anchor="middle" class="s-mono" style="font-size:10.5px">BINARY_OP +</text>
    <rect x="515" y="114" width="100" height="30" rx="5" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1"/>
    <text x="565" y="134" text-anchor="middle" class="s-mono">1 + rate</text>
    <rect x="515" y="150" width="100" height="30" rx="5" class="s-fill-2 s-stroke" stroke-width="1"/>
    <text x="565" y="170" text-anchor="middle" class="s-mono">price</text>
    <line x1="515" y1="196" x2="615" y2="196" style="stroke:var(--border-strong)" stroke-width="1.5"/>
    <text x="565" y="214" text-anchor="middle" class="s-sub">pops 2, pushes 1</text>
  </g>

  <g>
    <text x="730" y="22" text-anchor="middle" class="s-mono" style="font-size:10.5px">BINARY_OP *</text>
    <rect x="680" y="150" width="100" height="30" rx="5" style="fill:var(--accent-soft);stroke:var(--accent-line)" stroke-width="1"/>
    <text x="730" y="170" text-anchor="middle" class="s-mono">result</text>
    <line x1="680" y1="196" x2="780" y2="196" style="stroke:var(--border-strong)" stroke-width="1.5"/>
    <text x="730" y="214" text-anchor="middle" class="s-sub">pops 2, pushes 1</text>
  </g>

  <g>
    <text x="850" y="22" text-anchor="middle" class="s-mono" style="font-size:10.5px">RETURN_VALUE</text>
    <line x1="810" y1="196" x2="890" y2="196" style="stroke:var(--border-strong)" stroke-width="1.5"/>
    <text x="850" y="170" text-anchor="middle" class="s-sub" style="fill:var(--good)">popped &amp; returned</text>
    <text x="850" y="214" text-anchor="middle" class="s-sub">empty</text>
  </g>
</svg>`
    },

    { t: "callout", kind: "insight", title: "Where this pays off at work", body: [
      { t: "p", text: "Three situations where reaching for `dis` is faster than arguing:" },
      { t: "ul", items: [
        "**\"Is this comprehension actually faster than the loop?\"** — disassemble both. You will see the comprehension building its result with a dedicated opcode instead of resolving `.append` on every pass.",
        "**\"Does this f-string do anything expensive?\"** — disassemble it. You will see it does not; it is not string concatenation in disguise.",
        "**\"Why did upgrading Python change our benchmark?\"** — disassemble on both versions. Bytecode changes between releases, and this shows you exactly what changed."
      ]},
      { t: "p", text: "You are not expected to memorise opcodes. You are expected to know that this window exists and to open it when a question is genuinely about mechanism rather than opinion." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "05", text: "Local names are fast because the compiler counted them", id: "load-fast",
      sub: "A concrete demonstration that the model is real, not a metaphor." },

    { t: "p", text: "Notice the instruction `LOAD_FAST 0 (price)` above. The `0` is not decoration — it is an **array index**. The compiler knew at compile time that `price` is the function's first local, so at runtime the interpreter fetches slot 0 of an array. No lookup, no hashing, no searching." },

    { t: "p", text: "Names the compiler cannot resolve to a slot get a different instruction, `LOAD_GLOBAL`, which does a dictionary lookup in the module namespace and then possibly a second one in builtins. Same-looking Python, materially different work." },

    { t: "ladder",
      title: "The same function, written three ways",
      rungs: [
        { level: "bad", label: "Global lookup in the hot loop", why: "LOAD_GLOBAL every iteration",
          code: `import math

def normalise(values):
    out = []
    for v in values:
        out.append(v / math.sqrt(len(values)))
    return out`,
          note: "Every single iteration re-resolves `math` in the module dict, then `.sqrt` on it, then `len` in globals **and** builtins — and recomputes `len(values)`, which never changes. The bytecode makes all of this visible as repeated `LOAD_GLOBAL` instructions inside the loop body." },

        { level: "ok", label: "Hoist what does not change", why: "loop-invariant work moved out",
          code: `import math

def normalise(values):
    scale = math.sqrt(len(values))
    out = []
    for v in values:
        out.append(v / scale)
    return out`,
          note: "`scale` is now a local, so the loop body uses `LOAD_FAST`. The expensive part was never the division — it was doing setup work n times instead of once. This is the fix that actually matters, and it is a readability improvement as well as a speed one." },

        { level: "best", label: "Say what you mean", why: "clearer, and the fast path falls out",
          code: `import math


def normalise(values: list[float]) -> list[float]:
    """Scale each value by the square root of the sample size."""
    if not values:
        return []

    scale = math.sqrt(len(values))
    return [v / scale for v in values]`,
          note: "The comprehension expresses *build a new list from these* rather than *create an empty list and repeatedly append*. The empty-input guard removes a `ZeroDivisionError` that the previous two versions both had. Faster is a side effect; **correct and obvious** was the goal." }
      ]
    },

    { t: "callout", kind: "tradeoff", title: "Do not turn this into a habit of micro-optimising", body: [
      { t: "p", text: "The lesson here is *not* \"hoist every global into a local\". Written as a rule, that produces cluttered code for gains you cannot measure. The lesson is that **the pipeline is real and observable**, so when performance genuinely matters you have a way to reason about it instead of guessing." },
      { t: "p", text: "The honest ordering: get it correct, get it readable, measure, then fix what the measurement points at. Level 10 of this course covers profiling properly. Until then, treat `dis` as an explanation tool, not an optimisation tool." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "06", text: "__pycache__, and the caching that trips people up", id: "pycache" },

    {"kind": "steps", "title": "What happens on import", "caption": "The cache is keyed on the source's modification time and size; a stale or missing .pyc is recompiled transparently, which is why deleting __pycache__ is never a fix.", "items": [{"label": "Find the module on sys.path", "code": "import mymod"}, {"label": "Look for __pycache__/mymod.cpython-312.pyc", "desc": "compare the header's mtime and size with the .py file"}, {"label": "Cache hit → load the code object", "desc": "skips tokenising, parsing and compiling", "tone": "good"}, {"label": "Cache miss → compile and write the .pyc", "desc": "then execute the module body once", "tone": "warn"}], "t": "diagram", "id": "dg-1_1-06-1"},



    { t: "p", text: "Stages 1–3 are deterministic: the same source always produces the same bytecode. Redoing that work on every run would be waste, so CPython caches the result — but only in one specific case." },

    { t: "code", lang: "bash", title: "terminal", code: `
$ ls
app.py  helpers.py

$ python app.py          # app.py imports helpers
$ ls
app.py  helpers.py  __pycache__

$ ls __pycache__
helpers.cpython-312.pyc
`,
      caption: "`helpers.py` was cached. `app.py` was **not** — the script you launch directly is never cached, because there is nothing to reuse it for."
    },

    { t: "dl", items: [
      ["What is in a .pyc", "A small header plus the marshalled code object. It is compiled bytecode, not machine code, and not encryption. It is trivially decompiled."],
      ["How staleness is detected", "By default, the source file's modification time and size are recorded in the header. If either differs, the cache is discarded and the module is recompiled."],
      ["Why the interpreter version is in the filename", "Bytecode is not stable across Python versions. Tagging the filename lets several interpreters share a directory without corrupting each other's caches."]
    ]},

    { t: "callout", kind: "trap", title: "The stale-bytecode incident", body: [
      { t: "p", text: "Timestamp-based invalidation has a specific failure mode, and it reliably costs someone an afternoon:" },
      { t: "ol", items: [
        "A build system, `git checkout`, or a Docker `COPY` writes source files with timestamps that do not advance — or writes `.pyc` files *newer* than the source they came from.",
        "Python compares mtimes, concludes the cache is current, and loads bytecode that does not match the source on disk.",
        "You are now debugging code that is not running. Print statements do not appear. Fixes have no effect."
      ]},
      { t: "p", text: "**The fix takes seconds once you suspect it:**" },
      { t: "code", lang: "bash", title: "terminal", numbered: false, code: `
# nuke every cache under the current tree
$ find . -name "__pycache__" -type d -exec rm -rf {} +

# or ignore caches entirely for one run
$ python -B app.py`},
      { t: "p", text: "**The durable fix**, and what production images should do, is hash-based invalidation — the cache records a hash of the source instead of a timestamp, so it cannot be fooled by clock or filesystem behaviour:" },
      { t: "code", lang: "bash", title: "Dockerfile step", numbered: false, code: `
# compile everything up front, keyed by content hash, not mtime
RUN python -m compileall --invalidation-mode checked-hash /app`,
        caption: "This also moves compilation into image build rather than first request, which measurably improves cold-start latency on serverless and autoscaled deployments." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "07", text: "Three famous behaviours, one explanation each", id: "consequences" },

    { t: "p", text: "You now have enough of the model to derive things that are usually presented as trivia. Try to answer each before opening it." },

    { t: "disclose", summary: "Why is Python slower than C for tight numeric loops?", tag: "performance", body: [
      { t: "p", text: "Because of what `BINARY_OP` has to do. In C, `a + b` on two integers compiles to a single machine instruction, because the compiler knew the types. In Python, the same expression compiles to an opcode that at runtime must: read both operands off the stack, inspect their types, look up the appropriate addition implementation for that type pair, call it, allocate a **new** object for the result, and manage reference counts on everything involved." },
      { t: "p", text: "That is dozens of machine instructions where C used one — and none of it is waste, it is the price of not having to declare types. This is also why NumPy is fast: it does not make Python's loop faster, it moves the loop out of Python entirely into compiled code that already knows the types (Level 15.1)." },
      { t: "p", text: "Modern CPython narrows the gap. Since 3.11 the interpreter is *adaptive*: it observes that a given `BINARY_OP` keeps seeing two ints and rewrites that instruction in place to a specialised int-only version, skipping the type dispatch. It is a real speedup and it is still not C." }
    ]},

    { t: "disclose", summary: "Why does a typo in a rarely-taken branch reach production?", tag: "correctness", body: [
      { t: "p", text: "Because the compiler validated your **grammar**, not your **names**. `if user.is_admin: delete_evrything()` is a grammatically perfect function call. The compiler emits an instruction to load a global named `delete_evrything`. Nothing checks whether it exists until that branch actually runs — possibly months later, in front of a customer." },
      { t: "p", text: "This is the strongest practical argument for the two things Level 9 and Level 14 spend real time on: **tests that execute your branches**, and a **static type checker** that reads your code without running it. Neither is optional discipline in a language that defers this much to runtime — they are how you buy back the safety a compiler would have given you." }
    ]},

    { t: "disclose", summary: "Why do threads not speed up pure-Python computation?", tag: "concurrency", body: [
      { t: "p", text: "Because the evaluation loop and the memory it touches are not safe for two threads to run at once, so CPython guards them with a single lock — the Global Interpreter Lock. Only one thread may be executing bytecode at any instant. Two threads running a numeric loop take turns; they do not run in parallel." },
      { t: "p", text: "The lock is released around I/O — while a thread waits on a socket, a file or a database, another thread runs. That is precisely why threads help enormously for network-bound work and not at all for computation." },
      { t: "p", text: "Level 11 covers this properly, including the free-threaded builds that remove the GIL and what they cost. The point for now is that this is not an arbitrary limitation — it is a consequence of the same eval loop you just disassembled." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "08", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Settle an argument with evidence",
      difficulty: "foundation",
      minutes: 20,
      body: [
        { t: "p", text: "A colleague claims that building a string with `+=` in a loop is \"basically the same\" as `\"\".join(...)` because \"Python optimises that internally\". You suspect they are wrong, but you want evidence rather than an opinion." },
        { t: "p", text: "Write a script that answers the question using the tools from this lesson." }
      ],
      requirements: [
        "Define two functions that produce the identical string: one using `+=` in a loop, one using `str.join`.",
        "Disassemble both with `dis.dis` and identify the instruction that runs once per iteration in the first but not the second.",
        "Assert the two functions return equal output, so you are comparing like with like.",
        "Time both with `timeit` at a large enough input that the difference is unambiguous.",
        "Write one sentence, in a comment, explaining the difference in terms of what the bytecode does."
      ],
      hint: "Strings are immutable. Ask yourself what `s += x` must therefore do to the object `s` referred to — and how many times a loop of n iterations does it.",
      solution: {
        lang: "python",
        title: "string_building.py",
        code: `"""Evidence that += in a loop and str.join are not equivalent."""

import dis
import timeit

WORDS = [f"item-{i}" for i in range(1_000)]


def build_with_concat(words: list[str]) -> str:
    result = ""
    for w in words:
        result += w
    return result


def build_with_join(words: list[str]) -> str:
    return "".join(words)


assert build_with_concat(WORDS) == build_with_join(WORDS)

print("=== build_with_concat ===")
dis.dis(build_with_concat)
print("=== build_with_join ===")
dis.dis(build_with_join)

n = 200
concat = timeit.timeit(lambda: build_with_concat(WORDS), number=n)
join = timeit.timeit(lambda: build_with_join(WORDS), number=n)

print(f"concat: {concat:.4f}s")
print(f"join:   {join:.4f}s")
print(f"join is {concat / join:.1f}x faster")

# build_with_concat runs BINARY_OP (+=) once per iteration, and because str is
# immutable each one allocates a brand-new string and copies every character
# accumulated so far -- O(n^2) total copying. build_with_join has no loop in
# bytecode at all: it hands the whole list to one C-level routine that sizes the
# buffer once and fills it, which is O(n).`,
        notes: [
          { t: "p", text: "**What you should see:** the concatenating version contains a loop whose body includes a `BINARY_OP` for the `+=`. The join version has no loop in its bytecode whatsoever — a single call does the work in C." },
          { t: "callout", kind: "note", title: "Two honest caveats worth knowing", body: [
            { t: "ul", items: [
              "CPython has an optimisation that can mutate a string in place when the interpreter can prove there is exactly one reference to it. It sometimes fires here, which is probably what your colleague half-remembered. It is an implementation detail, it is not guaranteed, and it disappears the moment anything else holds a reference — you cannot design around it.",
              "For three or four fragments the difference is irrelevant and `+` is clearer. The rule is about loops with unbounded iteration counts, which is where an O(n²) copy becomes an incident."
            ]}
          ]},
          { t: "p", text: "The transferable skill is not the string result — it is the **method**: form a hypothesis, disassemble to see the mechanism, assert equivalence, then measure. That sequence works on any performance argument you will ever have." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A teammate reports that a deployed job \"ignores\" a bug fix. The fix is definitely in the container image — they have checked the file with `cat`. Logs still show the old behaviour. They are about to rebuild the base image from scratch." },
      { t: "p", text: "**What is the fastest thing to check first, and why?** Whether the image contains `.pyc` files that are newer than the sources they were built from. A `COPY` in a Dockerfile can preserve or reset timestamps in ways that defeat mtime-based cache validation, and Python will then load stale bytecode that does not match the source you just `cat`-ed." },
      { t: "p", text: "One command distinguishes the two hypotheses in seconds: run the entrypoint with `python -B`. If the bug disappears, it was the cache — and the durable fix is `compileall --invalidation-mode checked-hash` at build time, not a base-image rebuild." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "09", text: "Version awareness", id: "versions" },

    { t: "p", text: "One caution before you go and disassemble everything. **Bytecode is an implementation detail with no stability guarantee.** Opcodes are added, removed and renamed between minor versions — 3.11 rewrote large parts of the interpreter, and 3.12 and 3.13 changed opcodes again." },

    { t: "table",
      head: ["Depends on", "Stable?", "Safe to rely on"],
      rows: [
        ["Language semantics — what `for` and `+` mean", "Yes, across versions and implementations", "Always"],
        ["The existence of the pipeline and of `dis`", "Yes", "Always"],
        ["Specific opcode names and numbers", "**No** — changes between minor versions", "Never in shipped code"],
        [".pyc file format", "**No** — versioned in the filename for exactly this reason", "Never"]
      ],
      caption: "Use `dis` to understand and to explain. Never write production code whose correctness depends on a particular opcode existing."
    }
  ],

  /* ==================================================================== */
  takeaways: [
    "Python **compiles the whole file to bytecode first**, then executes it. Grammar errors are caught ahead of time; everything else — undefined names, wrong types, bad logic — is discovered at runtime.",
    "\"Python\" is a language; **CPython** is the C program that implements it. The GIL, reference counting and bytecode belong to CPython, not to the language.",
    "The pipeline is **tokenise → parse → compile → execute**, and the standard library exposes every stage: `tokenize`, `ast`, `compile`, `dis`.",
    "The evaluation loop is a **stack machine**. Reading `dis` output means tracking what is pushed and popped, which is why the instructions look reversed relative to your expression.",
    "`LOAD_FAST` is an array index the compiler assigned; `LOAD_GLOBAL` is a dictionary lookup at runtime. Same syntax, different work — this is the seed of most Python performance intuition.",
    "`__pycache__` stores compiled bytecode for **imported modules only**, invalidated by timestamp by default. When a fix appears not to apply, suspect it — and prefer `checked-hash` invalidation in built images.",
    "Because so much is deferred to runtime, **tests and static type checking are not optional extras** in Python. They buy back the guarantees a compiler would otherwise give you."
  ],

  /* ==================================================================== */
  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "What does this file print?",
        lang: "python",
        code: `print("A")

def f():
    return undefined_name

print("B")`,
        options: [
          "`A` then `B` — the function body is never executed, so the name is never looked up",
          "`A`, then a `NameError`",
          "A `NameError` before anything prints",
          "`A` then `B`, then a `NameError` when the file finishes"
        ],
        answer: 0,
        why: "Compilation only checks grammar, and `return undefined_name` is grammatically valid — so the file compiles cleanly and both prints run. The lookup instruction for `undefined_name` exists in `f`'s bytecode, but nothing executes it because `f` is never called. Define a function that references a nonexistent name and Python will not complain until you call it."
      },
      {
        stem: "You add a `print()` to a helper module, redeploy, and the new output does not appear — but the source in the container is definitely updated. Which explanation should you check first?",
        options: [
          "The module was imported before your change and Python caches imports in memory",
          "A stale `.pyc` in `__pycache__` is being loaded because its recorded timestamp still looks current",
          "The bytecode compiler optimised the `print` away because its result is unused",
          "`print` output is buffered and will appear when the process exits"
        ],
        answer: 1,
        why: "Timestamp-based cache invalidation is defeated when a build step produces `.pyc` files that look newer than their sources, so Python loads bytecode that no longer matches the code you can see. `python -B` confirms it in one run. Option D is a real phenomenon in some setups but would not survive a redeploy, and option C is not something CPython does — it never removes a call, because any call may have side effects."
      },
      {
        stem: "In `LOAD_FAST 0 (price)`, what is the `0`?",
        options: [
          "The line number the instruction came from",
          "A slot index into the frame's array of local variables, assigned by the compiler",
          "The number of arguments the instruction consumes from the stack",
          "A key into the module's global namespace dictionary"
        ],
        answer: 1,
        why: "The compiler knows every local name in a function at compile time, so it assigns each one a numbered slot. At runtime the interpreter indexes an array — no name lookup at all. `LOAD_GLOBAL` is the contrasting case: the name genuinely has to be looked up in a dictionary, and possibly a second one for builtins, every time."
      },
      {
        stem: "Which statement about Python bytecode is safe to rely on in production code?",
        options: [
          "The opcode names emitted for a given construct stay the same across minor versions",
          "A `.pyc` compiled by one Python version can be executed by the next",
          "Nothing about specific bytecode is guaranteed — it is an implementation detail that changes between releases",
          "Bytecode is portable across implementations, so PyPy runs CPython `.pyc` files"
        ],
        answer: 2,
        why: "Bytecode carries no stability guarantee. Opcodes changed substantially in 3.11, 3.12 and 3.13, and `.pyc` filenames embed the interpreter version precisely because the format is not portable across them — or across implementations. `dis` is a tool for understanding and explaining; correctness must never depend on a particular opcode existing."
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
        q: "Is Python compiled or interpreted?",
        strong: "Both, and the question is slightly false. Python compiles source to bytecode ahead of execution — that is why a syntax error anywhere stops the whole file — and then an interpreter loop executes that bytecode. It is not compiled to machine code, and it is not interpreted line by line from source.",
        answer: [
          { t: "p", text: "This is a screening question. Interviewers ask it to find out whether you have a model or a slogan. The word \"both\" is the start of a good answer; what earns the rest is naming the mechanism." },
          { t: "p", text: "Strong candidates volunteer the evidence unprompted: a `SyntaxError` on the last line prevents the first line from running, which is only possible if the whole file was compiled first. That single example demonstrates the model better than any definition." },
          { t: "p", text: "If you have room, add the distinction between the language and the implementation — that CPython compiles to bytecode while PyPy adds a JIT that compiles hot paths to machine code. That signals you know Python is a specification with multiple runtimes." }
        ],
        weak: "Answering \"interpreted\" flatly, or describing Python as executing your source line by line. It is the answer that suggests everything you know about the runtime came from a tutorial's first paragraph."
      },
      {
        level: "core",
        q: "Why does Python catch some errors before running and others only at runtime?",
        strong: "Compilation validates grammar and a small number of scope rules. Everything semantic — whether a name exists, whether a type supports an operation — is resolved by the evaluation loop when it reaches that instruction. So `SyntaxError` is compile time; `NameError`, `TypeError` and `AttributeError` are runtime.",
        answer: [
          { t: "p", text: "The follow-up is almost always the practical one: *given that, how do you stop a typo in an uncommon branch from reaching production?*" },
          { t: "p", text: "Answer with the two mechanisms, not with \"be careful\": a static type checker such as mypy reads the code without running it and catches undefined names and type mismatches; tests that actually execute the branch catch the rest. Mentioning that this is *why* the Python ecosystem invests so heavily in both tools shows you understand the trade-off the language made rather than just reciting best practice." }
        ]
      },
      {
        level: "advanced",
        q: "What is a code object, and what is inside one?",
        strong: "The compiled unit CPython produces for a module, function, class body or comprehension. It holds the bytecode itself plus everything the instructions reference: constants, names, argument counts and flags, the number of local slots, the filename, and a table mapping instructions back to line numbers so tracebacks can be built.",
        answer: [
          { t: "p", text: "Two details separate a real answer from a memorised one." },
          { t: "p", text: "First, the line-number table is what makes tracebacks possible — bytecode has no inherent notion of source lines, so the mapping is stored alongside. Second, a function object and its code object are different things: the code object is the immutable compiled body, while the function object wraps it with the mutable context — defaults, closure cells, `__globals__`. This is exactly why two functions can share one code object and behave differently, and it is the mechanism decorators and closures are built on." }
        ]
      },
      {
        level: "advanced",
        q: "A junior engineer says they are going to rewrite a data-processing service in Go because \"Python is slow\". How do you respond?",
        strong: "Ask what the profile says. \"Python is slow\" is only actionable if the bottleneck is actually Python-level compute — and in a data-processing service it is usually I/O, database queries, serialisation or an accidental O(n²), none of which a rewrite fixes.",
        answer: [
          { t: "p", text: "This is a judgement question wearing a technical costume. The interviewer wants to see whether you reach for evidence before architecture." },
          { t: "p", text: "A strong response has a shape: **measure first** — profile and find where the time actually goes. **Then match the fix to the cause** — an N+1 query is a query fix, a tight numeric loop is a NumPy or Cython fix, provider-bound latency is a concurrency fix. **Only then consider the runtime** — PyPy for pure-Python compute, or a targeted rewrite of the one hot component rather than the whole service." },
          { t: "p", text: "Close by naming the cost honestly: a rewrite spends months of team time, discards battle-tested behaviour, and splits the stack in two. It is occasionally the right call. It is very rarely the *first* call, and \"Python is slow\" is a hypothesis, not a measurement." }
        ],
        weak: "Either defending Python reflexively, or agreeing immediately. Both skip the step the question is actually testing — did you ask what the data says before choosing a solution?"
      }
    ]
  }
});
