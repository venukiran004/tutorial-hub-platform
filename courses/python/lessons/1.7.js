/* ============================================================================
   LESSON 1.7 — Operators, Expressions and Truthiness
   ========================================================================= */
EC.receiveLesson({
  id: "1.7",

  lede: "Operators look like the least interesting part of a language. Two things here are not: **`and` and `or` do not return booleans**, and **Python decides what counts as false in a way that quietly breaks validation code**. Both appear in production bugs far more often than their apparent difficulty suggests.",

  objectives: [
    "Predict what `and` and `or` return, and use short-circuiting deliberately",
    "State Python's rules for truthiness and identify where they cause bugs",
    "Read chained comparisons correctly, including the case that catches people",
    "Apply operator precedence without guessing, and know when to parenthesise anyway",
    "Choose the right membership and identity operator for a test"
  ],

  prerequisites: ["1.4", "1.5"],

  blocks: [

    /* ================================================================== */
    { t: "h2", n: "01", text: "and and or return operands, not booleans", id: "and-or" },

    { t: "p", text: "In most languages the logical operators produce `true` or `false`. In Python they produce **one of their operands**. The result is truthy or falsy in the way you expect, but it is not a `bool`." },

    { t: "code", lang: "python", title: "what they actually return", code: `
print("alice" or "bob")      # 'alice'  -- first truthy operand
print("" or "bob")           # 'bob'    -- first was falsy, so the second
print("alice" and "bob")     # 'bob'    -- both truthy, so the last one
print("" and "bob")          # ''       -- first was falsy, stop there

print(type("alice" or "bob"))
`,
      out: `alice
bob
bob

<class 'str'>`
    },

    { t: "dl", items: [
      ["`a or b`", "Evaluates `a`. If truthy, returns it and **never evaluates `b`**. Otherwise returns `b`."],
      ["`a and b`", "Evaluates `a`. If falsy, returns it and **never evaluates `b`**. Otherwise returns `b`."]
    ]},

    { t: "p", text: "Not evaluating the second operand is called **short-circuiting**, and it is a guarantee you can rely on, not an optimisation." },

    { t: "code", lang: "python", title: "short-circuiting as a safety mechanism", code: `
users = []

# Safe: len(users) > 0 is False, so users[0] is never evaluated.
if len(users) > 0 and users[0]["active"]:
    ...

# The idiomatic version relies on the same guarantee:
if users and users[0]["active"]:
    ...

# Also the reason this common guard works:
config = None
timeout = config and config.get("timeout")   # None, not AttributeError
`,
      caption: "Reorder those conditions and you get an `IndexError`. Short-circuiting is why guard conditions can be written left to right in order of increasing risk."
    },

    { t: "callout", kind: "trap", title: "`or` as a default is a bug waiting for a zero", body: [
      { t: "p", text: "`value or default` is a very common idiom and it is wrong whenever `0`, `\"\"`, `[]` or `False` are legitimate values — the same trap as `if not x:` from Lesson 1.5, wearing different syntax." },
      { t: "code", lang: "python", title: "the failure", numbered: false, code: `
def make_request(retries=None, verbose=None):
    retries = retries or 3          # caller asked for 0 -> gets 3
    verbose = verbose or True       # caller asked for False -> gets True
    return retries, verbose


print(make_request(retries=0, verbose=False))`,
      out: `(3, True)`},
      { t: "p", text: "Both arguments were silently ignored. The `verbose` case is worse than it looks: `verbose or True` can **never** return `False`, so that parameter does nothing at all." },
      { t: "code", lang: "python", title: "the fix", numbered: false, code: `
def make_request(retries: int | None = None, verbose: bool | None = None):
    retries = 3 if retries is None else retries
    verbose = True if verbose is None else verbose
    return retries, verbose`,
        hl: [2, 3]},
      { t: "p", text: "`or` as a default is fine when *every* falsy value should genuinely be replaced — `name or \"Anonymous\"` is reasonable, since an empty name and a missing name mean the same thing there. The question is always whether falsy and absent are the same in your domain." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "02", text: "Truthiness", id: "truthiness" },

    { t: "p", text: "Any object can be used where a boolean is expected. Python asks the object what it thinks: it calls `__bool__` if defined, falls back to `__len__` if not, and otherwise treats the object as true." },

    { t: "table",
      head: ["Falsy", "Everything else is truthy"],
      rows: [
        ["`False`, `None`", "`True`, any non-zero number"],
        ["`0`, `0.0`, `0j`, `Decimal(0)`", "any non-empty string, including `\"0\"` and `\"False\"`"],
        ["`\"\"`, `[]`, `()`, `{}`, `set()`, `range(0)`", "any non-empty container"],
        ["objects whose `__bool__` returns `False`", "objects with no `__bool__` and no `__len__` — including every plain class instance"],
        ["objects whose `__len__` returns `0`", "functions, modules, classes"]
      ],
      caption: "`\"0\"` and `\"False\"` are non-empty strings and therefore truthy. This is a recurring bug when reading configuration from environment variables, which are always strings."
    },

    { t: "code", lang: "python", title: "the environment variable trap", code: `
import os

os.environ["DEBUG"] = "False"

if os.environ.get("DEBUG"):          # "False" is a non-empty string
    print("debug mode on")           # this runs

# Parse it properly instead:
def env_flag(name: str, default: bool = False) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


print(env_flag("DEBUG"))
`,
      out: `debug mode on
False`,
      hl: [5, 6],
      caption: "Every environment variable is a string. `\"False\"`, `\"0\"` and `\"no\"` are all truthy strings. Lesson 14.2 covers typed settings, which is the real answer at scale — but the parsing rule is worth knowing by hand."
    },

    { t: "callout", kind: "good", title: "When truthiness is the right tool", body: [
      { t: "p", text: "The idiom is genuinely good for containers, where *empty* and *missing* mean the same thing:" },
      { t: "code", lang: "python", title: "idiomatic", numbered: false, code: `
if not results:
    return "No matches found"

for item in items:      # a for loop over an empty list is already a no-op
    ...

# Prefer this to len(x) == 0 or x == []:
if not queue:
    break`},
      { t: "p", text: "The rule of thumb: **use truthiness for collections and strings when empty is meaningless; use `is None` whenever a falsy value is a legitimate answer.** Quantities, offsets, timeouts, scores, prices and boolean flags almost always fall in the second group." }
    ]},

    /* ================================================================== */
    { t: "h2", n: "03", text: "Comparison chaining", id: "chaining" },

    { t: "p", text: "Python allows mathematical-style comparison chains, and they mean what a mathematician expects — each operand is evaluated once, and adjacent pairs are compared with implicit `and`." },

    { t: "code", lang: "python", title: "chains", code: `
age = 25

print(0 <= age <= 120)               # readable range check
print(0 <= age <= 120 == True)       # chains can mix operators

# Equivalent to (0 <= age) and (age <= 120), but age is evaluated ONCE.
# That matters when the middle term has a side effect or is expensive:
def next_value(): ...
# 0 <= next_value() <= 10     -- calls next_value() exactly once
`,
      out: `True
False`
    },

    { t: "callout", kind: "trap", title: "The chain that surprises everyone", body: [
      { t: "code", lang: "python", title: "read carefully", numbered: false, code: `
a, b, c = 1, 5, 1

print(a == b == c)       # False -- as expected
print(a == c == a)       # True

# But this one:
print(False == False in [False])`,
        out: `False
True
True`},
      { t: "p", text: "`False == False in [False]` expands to `(False == False) and (False in [False])` — both true. Read as a normal expression it looks like it should compare `False` to the result of `False in [False]`, which would be `False == True`, i.e. `False`." },
      { t: "p", text: "You will not write this deliberately. It matters because it explains a real class of bug: **`in`, `is`, `==`, `<` and their relatives all chain**, so an expression mixing them may not group the way it reads. When a comparison expression is doing more than one thing, parenthesise it." }
    ]},

    { t: "code", lang: "python", title: "not in and is not are single operators", code: `
items = [1, 2, 3]

print(4 not in items)        # correct and idiomatic
print(not 4 in items)        # same result, worse style

value = None
print(value is not None)     # correct
print(not value is None)     # same result, harder to read
`,
      caption: "`not in` and `is not` are each one operator, not a negation applied to another. Linters flag the negated forms (`ruff` rules `E713` and `E714`) because the two-token version reads as though `not` binds to something else."
    },

    /* ================================================================== */
    { t: "h2", n: "04", text: "Precedence", id: "precedence" },

    { t: "p", text: "You do not need to memorise the full table. You need to know the handful of places where the answer is not obvious, and to parenthesise there." },

    { t: "table",
      head: ["Tightest to loosest", "Operators"],
      rows: [
        ["1", "`**` — exponentiation (right-associative)"],
        ["2", "`+x`, `-x`, `~x` — unary"],
        ["3", "`*`, `/`, `//`, `%`, `@`"],
        ["4", "`+`, `-`"],
        ["5", "`<<`, `>>`"],
        ["6", "`&` then `^` then `|` — **bitwise, looser than arithmetic, tighter than comparison**"],
        ["7", "`in`, `not in`, `is`, `is not`, `<`, `<=`, `>`, `>=`, `!=`, `==`"],
        ["8", "`not x`"],
        ["9", "`and`"],
        ["10", "`or`"],
        ["11", "`if — else` (conditional expression), then `lambda`"]
      ]
    },

    { t: "code", lang: "python", title: "the four that actually catch people", code: `
# 1. ** binds tighter than unary minus, and is right-associative
print(-2 ** 2)          # -4, not 4   -- it is -(2 ** 2)
print(2 ** 3 ** 2)      # 512, not 64 -- it is 2 ** (3 ** 2)

# 2. 'not' is looser than comparison, tighter than 'and'
print(not 1 == 2)       # True  -- not (1 == 2)

# 3. 'and' binds tighter than 'or' -- this is the one that causes real bugs
print(True or False and False)     # True, because it is True or (False and False)

# 4. Bitwise & is LOOSER than ==, which is why pandas filters need parentheses
#    df[df.a == 1 & df.b == 2]     -> parsed as df.a == (1 & df.b) == 2
#    df[(df.a == 1) & (df.b == 2)] -> correct
`,
      out: `-4
512
True
True`
    },

    { t: "callout", kind: "insight", title: "The pandas parenthesis rule, explained", body: [
      { t: "p", text: "Every pandas user learns to write `df[(df.a == 1) & (df.b == 2)]` and most never learn why. It is precedence line 6 versus line 7: `&` binds **tighter** than `==`, so the unparenthesised version is parsed as `df.a == (1 & df.b) == 2` — a chained comparison over a bitwise AND, which is nonsense." },
      { t: "p", text: "pandas has to use `&` rather than `and` because `and` calls `__bool__` on its operands, and the truth value of a whole Series is ambiguous. So it overloads the bitwise operators — and inherits their precedence. The parentheses are not a pandas quirk; they are Python's grammar. Lesson 15.2 covers this properly." }
    ]},

    { t: "code", lang: "python", title: "conditional expressions", code: `
status = 200

# The ternary reads left-to-right as: value, condition, alternative.
label = "ok" if status < 400 else "error"

# Fine nested once, unreadable beyond that:
tier = "high" if score > 90 else "mid" if score > 50 else "low"

# Past two branches, use a plain if/elif or a lookup table instead.
`,
      caption: "The conditional expression is an *expression*, so it can appear inside a comprehension, an f-string or a function argument where a statement cannot. That is its real purpose — not saving a line."
    },

    /* ================================================================== */
    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "A settings parser that respects false values",
      difficulty: "foundation",
      minutes: 20,
      body: [
        { t: "p", text: "Configuration is where truthiness bugs concentrate, because every source — environment variables, CLI flags, config files — delivers strings, and every layer wants to apply a default." },
        { t: "p", text: "Build a small resolver that merges three sources of configuration correctly. The hard requirement is that a deliberately-set `0`, `False` or `\"\"` must survive." }
      ],
      requirements: [
        "Resolve each setting from, in order of priority: an explicit argument, an environment variable, then a built-in default.",
        "A value explicitly set to `0`, `False` or `\"\"` must **not** fall through to the next source.",
        "Parse boolean environment variables so `\"false\"`, `\"0\"`, `\"no\"` and `\"off\"` become `False`.",
        "Parse integer environment variables, raising a clear error naming the setting and the bad value if parsing fails.",
        "Include a test that would fail under an `or`-based implementation — that test is the point of the exercise."
      ],
      hint: "The whole exercise turns on distinguishing *absent* from *falsy*. Environment lookups return `None` when absent, which is exactly the signal you need — do not collapse it with `or`.",
      solution: {
        lang: "python",
        title: "settings.py",
        code: `"""Resolve settings from explicit args, environment, then defaults."""

from __future__ import annotations

import os
from typing import Any

TRUE_VALUES = {"1", "true", "yes", "on"}
FALSE_VALUES = {"0", "false", "no", "off"}


class SettingError(ValueError):
    """A setting was present but could not be parsed."""


def _from_env_bool(name: str, raw: str) -> bool:
    value = raw.strip().lower()
    if value in TRUE_VALUES:
        return True
    if value in FALSE_VALUES:
        return False
    raise SettingError(
        f"{name}: expected a boolean, got {raw!r}. "
        f"Accepted: {sorted(TRUE_VALUES | FALSE_VALUES)}"
    )


def _from_env_int(name: str, raw: str) -> int:
    try:
        return int(raw.strip())
    except ValueError as exc:
        raise SettingError(f"{name}: expected an integer, got {raw!r}") from exc


def resolve(
    name: str,
    explicit: Any | None,
    default: Any,
    kind: type = str,
) -> Any:
    """Return the first source that actually supplied a value.

    'Supplied' means 'is not None'. A value of 0, False or "" is a real
    answer and stops the search -- which is precisely what an
    "explicit or default" implementation would get wrong.
    """
    if explicit is not None:
        return explicit

    raw = os.environ.get(name)
    if raw is not None:
        if kind is bool:
            return _from_env_bool(name, raw)
        if kind is int:
            return _from_env_int(name, raw)
        return raw

    return default


# --------------------------------------------------------------------------

def test_explicit_false_is_respected() -> None:
    """The test an 'or'-based implementation fails."""
    os.environ["VERBOSE"] = "true"

    # An or-based version would return the env value, then the default.
    assert resolve("VERBOSE", explicit=False, default=True, kind=bool) is False
    assert resolve("RETRIES", explicit=0, default=3, kind=int) == 0
    assert resolve("PREFIX", explicit="", default="app") == ""


def test_env_overrides_default() -> None:
    os.environ["RETRIES"] = "7"
    assert resolve("RETRIES", explicit=None, default=3, kind=int) == 7

    os.environ["DEBUG"] = "False"
    # The string "False" is truthy -- parsing, not truthiness, decides.
    assert resolve("DEBUG", explicit=None, default=True, kind=bool) is False


def test_bad_value_names_the_setting() -> None:
    os.environ["RETRIES"] = "many"
    try:
        resolve("RETRIES", explicit=None, default=3, kind=int)
    except SettingError as exc:
        assert "RETRIES" in str(exc) and "'many'" in str(exc)
    else:
        raise AssertionError("expected SettingError")


if __name__ == "__main__":
    test_explicit_false_is_respected()
    test_env_overrides_default()
    test_bad_value_names_the_setting()
    print("all checks passed")`,
        notes: [
          { t: "p", text: "**`if explicit is not None` is the entire solution.** Everything else is parsing. Written as `explicit or os.environ.get(name) or default`, the function is shorter, reads more elegantly, and is wrong for three of the five test cases." },
          { t: "p", text: "**`test_explicit_false_is_respected` is the exercise.** It is the test nobody writes, because the `or` version passes every test where values are truthy — and truthy values are what you naturally reach for when writing fixtures. The bug ships, and surfaces months later as \"the `--no-cache` flag doesn't work\"." },
          { t: "callout", kind: "insight", title: "The error message design", body: [
            { t: "p", text: "`f\"{name}: expected an integer, got {raw!r}\"` does three things deliberately: it names *which* setting failed, shows the offending value with `!r` so whitespace is visible, and — in the boolean case — lists what would have been accepted." },
            { t: "p", text: "A config error at process start is read by someone who did not write the code, often at an inconvenient hour. The difference between `invalid literal for int()` and `RETRIES: expected an integer, got 'many'` is whether they need to open your source. Lesson 6.3 covers exception design; Lesson 14.2 covers doing this with typed settings instead of by hand." }
          ]}
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team ships a feature flag to disable an expensive cache. Operations set `ENABLE_CACHE=false` in the deployment config, restart, and the cache is still running. The variable is definitely set — they have checked with `env`." },
      { t: "p", text: "**The cause is one line:** `ENABLE_CACHE = bool(os.environ.get(\"ENABLE_CACHE\", \"true\"))`. Every environment variable is a string, and `bool(\"false\")` is `True` because the string is non-empty. `bool()` on a string tests emptiness, never content." },
      { t: "p", text: "**Why it survived review:** the code reads correctly in English, and it works for the *enabled* case, which is what everyone tested. The flag has never actually been able to turn anything off." },
      { t: "p", text: "The systematic fix is to parse rather than coerce, and to stop hand-rolling it — Pydantic Settings and similar libraries do this correctly and fail loudly on an unrecognised value, which is the behaviour you want at process start." }
    ]}
  ],

  /* ==================================================================== */
  takeaways: [
    "**`and` and `or` return one of their operands, not a boolean.** `\"a\" or \"b\"` is `\"a\"`, and its type is `str`.",
    "Short-circuiting is a guarantee, not an optimisation — it is why `if users and users[0]:` is safe.",
    "**`value or default` silently discards a deliberate `0`, `False` or `\"\"`.** Use `default if value is None else value` whenever falsy values are legitimate.",
    "Truthiness asks the object: `__bool__`, else `__len__`, else true. Use it for containers; use `is None` when a falsy value is a real answer.",
    "**Every environment variable is a string, and `\"False\"` is truthy.** `bool(os.environ.get(...))` tests emptiness, never content — parse instead of coercing.",
    "Comparisons chain: `a < b < c` evaluates `b` once. `in`, `is` and `==` chain too, which is why mixed comparison expressions need parentheses.",
    "`not in` and `is not` are single operators. Prefer them to `not x in y` and `not x is y`.",
    "The precedence traps worth memorising: `-2 ** 2` is `-4`; `2 ** 3 ** 2` is `512`; `and` binds tighter than `or`; and **`&` binds tighter than `==`**, which is the whole reason pandas filters need parentheses."
  ],

  /* ==================================================================== */
  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "What is the value and type of `0 or \"\" or [] or \"last\"`?",
        options: [
          "`True`, a bool — `or` always produces a boolean",
          "`\"last\"`, a str — `or` returns the first truthy operand, or the last one if none are truthy",
          "`[]`, a list — evaluation stops at the last falsy value",
          "`0`, an int — `or` returns its first operand"
        ],
        answer: 1,
        why: "`or` evaluates left to right, returning the first truthy operand. `0`, `\"\"` and `[]` are all falsy, so it continues to `\"last\"`, which is truthy and is returned as a `str` — not converted to a bool. This is exactly the mechanism behind the `value or default` idiom, and exactly why that idiom discards a deliberate `0`."
      },
      {
        stem: "A service reads `DEBUG = bool(os.environ.get(\"DEBUG\", \"false\"))`. The operator sets `DEBUG=false`. What is `DEBUG`?",
        options: [
          "`False` — the string is parsed as a boolean",
          "`True` — `bool()` on a string tests whether it is non-empty, and `\"false\"` has five characters",
          "`None` — `bool()` cannot convert an arbitrary string",
          "A `ValueError` is raised for an unrecognised boolean string"
        ],
        answer: 1,
        why: "`bool()` on a string asks only whether it is empty. `\"false\"`, `\"0\"`, `\"no\"` and `\"False\"` are all non-empty and therefore `True`; the only falsy string is `\"\"`. The flag has never been capable of turning anything off, and it passes review because it reads correctly in English and works for the enabled case. Parse the content explicitly, or use a settings library that fails loudly on unrecognised values."
      },
      {
        stem: "What does `print(-2 ** 2, 2 ** 3 ** 2)` output?",
        options: [
          "`4 64` — left to right in both cases",
          "`-4 512` — `**` binds tighter than unary minus, and is right-associative",
          "`-4 64` — `**` binds tighter than minus but associates left",
          "`4 512` — unary minus binds tighter, `**` associates right"
        ],
        answer: 1,
        why: "Two separate rules. `**` binds tighter than unary minus, so `-2 ** 2` is `-(2 ** 2)` = `-4`. And `**` is right-associative — the only common operator that is — so `2 ** 3 ** 2` is `2 ** (3 ** 2)` = `2 ** 9` = `512`. Both match standard mathematical convention, which is why they are correct and still surprising."
      },
      {
        stem: "Why must pandas boolean filters be written `df[(df.a == 1) & (df.b == 2)]` with parentheses?",
        options: [
          "pandas requires parentheses around every filter expression by convention",
          "`&` binds tighter than `==`, so without them the expression parses as `df.a == (1 & df.b) == 2`",
          "`&` and `==` have equal precedence, making the expression ambiguous",
          "The parentheses force evaluation order so the Series comparison returns a bool"
        ],
        answer: 1,
        why: "This is plain Python grammar, not a pandas rule. Bitwise operators sit above comparisons in the precedence table, so `df.a == 1 & df.b == 2` groups as a chained comparison around `1 & df.b`. pandas is forced to overload `&` rather than use `and`, because `and` calls `__bool__` and the truth value of a whole Series is ambiguous — and overloading `&` means inheriting its precedence."
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
        q: "What does `x = a or b` do in Python?",
        strong: "It evaluates `a`; if truthy it returns `a` itself, otherwise it returns `b`. The result is one of the operands, not a boolean — and `b` is never evaluated when `a` is truthy.",
        answer: [
          { t: "p", text: "The follow-up is nearly always about the default-value idiom: *is `retries = retries or 3` safe?*" },
          { t: "p", text: "The answer is no whenever `0` is a legitimate value, and saying so with the concrete failure — the caller passes `0` and gets `3` — is much stronger than saying \"it depends on falsy values\". Offering `3 if retries is None else retries` as the fix completes it." },
          { t: "p", text: "If you want to show range, mention that short-circuiting is a language guarantee rather than an optimisation, which is what makes `if users and users[0]` safe. Interviewers notice when someone distinguishes guaranteed behaviour from incidental behaviour." }
        ]
      },
      {
        level: "core",
        q: "How does Python decide whether an object is truthy?",
        strong: "It calls `__bool__` if the type defines it. Failing that it calls `__len__` and treats zero as false. If neither exists, the object is true — which is why every plain class instance is truthy by default.",
        answer: [
          { t: "p", text: "Knowing the fallback order is what separates a real answer from a memorised list of falsy values. It also explains behaviour people find surprising: a custom class with no `__len__` is always truthy, even when it represents something empty." },
          { t: "p", text: "A good practical close is the environment-variable case: every env var is a string, `\"False\"` is non-empty and therefore truthy, so `bool(os.environ.get(\"DEBUG\"))` is a flag that can never be off. It shows you have met the rule where it actually causes damage." }
        ]
      },
      {
        level: "advanced",
        q: "A feature flag set to `false` in the environment is not taking effect. Walk me through it.",
        strong: "Almost certainly `bool()` applied to the string. Environment variables are always strings, and `bool(\"false\")` is `True` because the string is non-empty. The flag needs parsing — comparing against a set of accepted false values — not coercion.",
        answer: [
          { t: "p", text: "This is a diagnosis question, so narrate the reasoning rather than jumping to the answer: the variable is set, so it is not a deployment problem; the code reads it, so it is not a wiring problem; therefore the value is being interpreted wrongly." },
          { t: "p", text: "The observation that earns the most credit is *why it survived review*: the code reads correctly in English, and it behaves correctly in the enabled case, which is the case everyone tests. A flag that has never been able to turn anything off can sit in a codebase for a long time." },
          { t: "p", text: "Close on prevention rather than the one-line fix. Parse config at startup with something that validates and fails loudly on an unrecognised value — Pydantic Settings, or a hand-rolled parser with an explicit accepted set. Silent misinterpretation at process start is far more expensive than a crash at process start." }
        ],
        weak: "Suggesting `os.environ.get(\"FLAG\") == \"true\"` and stopping. It fixes this one case but breaks on `\"True\"`, `\"1\"`, `\"yes\"` and any trailing whitespace — and the next person hits the same class of bug in a different variable."
      }
    ]
  }
});
