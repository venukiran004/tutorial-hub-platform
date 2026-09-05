/* ============================================================================
   INTERVIEW: LANGUAGE CORE i1.2 — Strings
   ----------------------------------------------------------------------------
   Theory interview questions: the ones you answer out loud. Anything that
   asks for a program lives in the Coding Practice course instead.
   ========================================================================= */
EC.receiveLesson({
 "id": "i1.2",
 "lede": "**12 interview questions on strings**, with the answers folded away. Say your answer out loud first — recognising an answer and being able to give one are different skills, and only the second survives a follow-up.",
 "objectives": [
  "Answer 12 questions on strings without prompting",
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
   "q": "1. f-strings (Python 3.6+) — Preferred",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "name = \"Alice\"\nf\"Hello, {name}!\"",
     "numbered": false
    },
    {
     "t": "ul",
     "items": [
      "Fastest at runtime (evaluated at compile time).",
      "Most readable — expression is inline.",
      "Supports full Python expressions and format specs."
     ]
    }
   ]
  },
  {
   "t": "drill",
   "n": "2",
   "q": "2. str.format() method",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "\"Hello, {}!\".format(name)\n\"Hello, {name}!\".format(name=\"Alice\")",
     "numbered": false
    },
    {
     "t": "ul",
     "items": [
      "Useful when the format string is stored separately or dynamically constructed.",
      "More verbose than f-strings."
     ]
    }
   ]
  },
  {
   "t": "drill",
   "n": "3",
   "q": "3. %-formatting (legacy)",
   "terms": [
    "Recommendation",
    "Answer",
    "Use str.join()",
    "Why + is slow in loops",
    "new string",
    "Why join() is fast"
   ],
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "\"Hello, %s!\" % name",
     "numbered": false
    },
    {
     "t": "ul",
     "items": [
      "C-style formatting.",
      "Limited functionality (no named args easily, no complex expressions).",
      "Not recommended for new code."
     ]
    },
    {
     "t": "p",
     "text": "**Recommendation:** Use f-strings by default. Use `.format()` when the template is dynamic. Avoid `%`-formatting."
    },
    {
     "t": "hr"
    },
    {
     "t": "p",
     "text": "Q7. How to efficiently concatenate many strings?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "**Use `str.join()`** — not `+` in a loop."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# BAD — O(n²) in worst case\nresult = \"\"\nfor word in words:\n    result += word          # Creates new string each iteration\n\n# GOOD — O(n)\nresult = \"\".join(words)     # Single allocation",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Why `+` is slow in loops:** - Strings are immutable, so `result += word` creates a **new string** every iteration. - Each new string copies all previous characters → quadratic time."
    },
    {
     "t": "p",
     "text": "**Why `join()` is fast:** - It calculates the total length first, allocates memory once, then copies all strings in a single pass."
    },
    {
     "t": "p",
     "text": "CPython has an optimization where `+=` can sometimes modify the string in place if the reference count is 1, but this is an implementation detail and not guaranteed across versions or implementations."
    },
    {
     "t": "hr"
    },
    {
     "t": "p",
     "text": "Q8. What is the difference between encode() and decode()?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Method",
      "Direction",
      "Input → Output",
      "Purpose"
     ],
     "rows": [
      [
       "`encode()`",
       "str → bytes",
       "Text → Binary",
       "Preparing text for I/O"
      ],
      [
       "`decode()`",
       "bytes → str",
       "Binary → Text",
       "Reading binary as text"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "text = \"café\"\nbinary = text.encode(\"utf-8\")       # b'caf\\xc3\\xa9'\ntext_back = binary.decode(\"utf-8\")  # 'café'",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Error handling modes:** - `errors=\"strict\"` (default) — raises `UnicodeEncodeError` / `UnicodeDecodeError` - `errors=\"ignore\"` — silently skips problematic characters - `errors=\"replace\"` — replaces with `?` (encode) or `—` (decode) - `errors=\"backslashreplace\"` — replaces with `\\xNN` escape sequences"
    },
    {
     "t": "hr"
    },
    {
     "t": "p",
     "text": "Q9. How does Python handle Unicode?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "Python 3 strings are **natively Unicode** — every string is a sequence of Unicode code points.",
      "The `str` type supports the full Unicode range (U+0000 to U+10FFFF).",
      "Source files default to **UTF-8** encoding."
     ]
    },
    {
     "t": "p",
     "text": "**Key features:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Unicode literals\ns = \"Hello, 世界! 🌍\"\n\n# Unicode escape sequences\ns = \"\\u0048\\u0065\\u006C\\u006C\\u006F\"    # 'Hello'\ns = \"\\U0001F600\"                         # '😀'\ns = \"\\N{GREEK SMALL LETTER ALPHA}\"       # 'α'\n\n# Unicode normalization\nimport unicodedata\nunicodedata.normalize(\"NFC\", \"café\")     # Composed form\nunicodedata.normalize(\"NFD\", \"café\")     # Decomposed form\n\n# Character info\nunicodedata.name(\"€\")                   # 'EURO SIGN'\nunicodedata.category(\"A\")               # 'Lu' (Letter, uppercase)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Encoding considerations:** - When reading/writing files or network data, you must choose an encoding (UTF-8 is the standard). - `str` → `bytes` requires `encode()`. `bytes` → `str` requires `decode()`."
    },
    {
     "t": "hr"
    },
    {
     "t": "p",
     "text": "Q10. What is the difference between isdigit(), isnumeric(), and isdecimal()?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Method",
      "Scope",
      "Example matches"
     ],
     "rows": [
      [
       "`isdecimal()`",
       "Strictest — Unicode category Nd (decimal)",
       "`0-9`, `٣` (Arabic), `१` (Hindi)"
      ],
      [
       "`isdigit()`",
       "Decimals + superscripts, subscripts",
       "All of isdecimal() + `²`, `³`"
      ],
      [
       "`isnumeric()`",
       "Broadest — any numeric character",
       "All of isdigit() + `½`, `Ⅳ`, `万`"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "char = \"½\"\nchar.isdecimal()    # False\nchar.isdigit()      # False\nchar.isnumeric()    # True\n\nchar = \"²\"\nchar.isdecimal()    # False\nchar.isdigit()      # True\nchar.isnumeric()    # True",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Hierarchy:** `isdecimal() ⊂ isdigit() ⊂ isnumeric()`"
    },
    {
     "t": "p",
     "text": "**Practical tip:** For validating integer input from users, use `isdecimal()` (strictest). Use `isnumeric()` only if you need to recognize a broad range of Unicode numerals."
    },
    {
     "t": "hr"
    },
    {
     "t": "p",
     "text": "Q11. How are strings compared in Python?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Strings are compared **lexicographically** — character by character using their Unicode code points."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "\"apple\" < \"banana\"      # True (a=97 < b=98)\n\"abc\" < \"abd\"            # True (first 2 chars equal, c=99 < d=100)\n\"abc\" < \"abcd\"           # True (shorter prefix is \"less than\")\n\"Z\" < \"a\"                # True (Z=90 < a=97)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Comparison operators and dunder methods:** - `==` → `__eq__` - `<` → `__lt__` - `<=` → `__le__` - `>` → `__gt__` - `>=` → `__ge__` - `!=` → `__ne__`"
    },
    {
     "t": "p",
     "text": "**Key points:** - Uppercase letters have **lower** code points than lowercase (A=65, a=97). - For case-insensitive comparison: `s1.lower() == s2.lower()` (or `casefold()` for Unicode). - `locale.strxfrm()` can be used for locale-aware sorting. - `==` compares values; `is` compares identity — always use `==` for strings."
    },
    {
     "t": "hr"
    },
    {
     "t": "p",
     "text": "Q12. What is the time complexity of string slicing?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "String slicing is **O(k)** where k is the length of the resulting slice."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "s = \"hello world\"    # n = 11\ns[0:5]               # O(5) — copies 5 characters\ns[:]                 # O(n) — full copy\ns[::-1]              # O(n) — reversed copy",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Why O(k) and not O(1)?** - Python strings are immutable, so every slice creates a **new string object**. - The new string must be allocated and the characters copied. - Unlike some languages (e.g., Go's slices), Python does not return a \"view\" into the original string."
    },
    {
     "t": "p",
     "text": "**Implications:** - Repeated slicing in a loop can be expensive. - For large strings, consider using `memoryview` on the encoded bytes, or `io.StringIO` for streaming processing."
    },
    {
     "t": "hr"
    },
    {
     "t": "p",
     "text": "Q13. Can strings be dictionary keys? Why?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "**Yes.** Strings can be dictionary keys because they satisfy the two requirements:"
    },
    {
     "t": "ol",
     "items": [
      "**Hashable:** Strings have a `__hash__()` method that returns a consistent integer.",
      "**Immutable:** The hash value never changes during the object's lifetime."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "d = {\"name\": \"Alice\", \"age\": 30}\nd[\"name\"]     # 'Alice'\n\n# Strings support == and hash consistently\nhash(\"hello\") == hash(\"hello\")    # True (same session)\n\"hello\" == \"hello\"                # True",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Why immutability is critical:** - If a key could change after being inserted, its hash might change, and the dictionary would be unable to locate it. - Lists are **not** hashable (mutable), so they cannot be dict keys."
    },
    {
     "t": "hr"
    },
    {
     "t": "p",
     "text": "Q14. What is the difference between split() with and without arguments?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Feature",
      "`split()`",
      "`split(sep)`"
     ],
     "rows": [
      [
       "Separator",
       "Any whitespace",
       "Exactly `sep`"
      ],
      [
       "Consecutive seps",
       "Merged (no empties)",
       "Produces empty `\"\"`"
      ],
      [
       "Leading/trailing",
       "Ignored",
       "Produces empty `\"\"`"
      ],
      [
       "Max split",
       "`split(maxsplit=n)`",
       "`split(sep, n)`"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "\"  hello   world  \".split()       # ['hello', 'world']\n\"  hello   world  \".split(\" \")    # ['', '', 'hello', '', '', 'world', '', '']\n\n\"a,,b,,c\".split(\",\")              # ['a', '', 'b', '', 'c']",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** `split()` without arguments is almost always what you want for natural text processing. Use `split(sep)` only when you need to preserve the structure (e.g., CSV parsing)."
    },
    {
     "t": "hr"
    },
    {
     "t": "p",
     "text": "Q15. How to check if a string contains only ASCII characters?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Method 1: str.isascii() (Python 3.7+)\n\"hello\".isascii()       # True\n\"café\".isascii()        # False\n\"\".isascii()            # True (empty string)\n\n# Method 2: try encoding\ndef is_ascii(s):\n    try:\n        s.encode(\"ascii\")\n        return True\n    except UnicodeEncodeError:\n        return False\n\n# Method 3: check code points\ndef is_ascii_v2(s):\n    return all(ord(c) < 128 for c in s)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "`str.isascii()` is the most Pythonic and performant approach (Python 3.7+)."
    },
    {
     "t": "hr"
    },
    {
     "t": "p",
     "text": "Q16. What are raw strings and when should you use them?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Raw strings (`r\"...\"`) treat backslashes as **literal characters** — no escape sequence processing."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "normal = \"hello\\nworld\"     # Contains a newline\nraw = r\"hello\\nworld\"       # Contains literal \\n (two chars)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Use cases:** 1. **Regular expressions:** `re.compile(r\"\\d+\\.\\d+\")` — avoids double-escaping. 2. **Windows file paths:** `r\"C:\\Users\\new\\test\"` — backslashes as-is. 3. **LaTeX strings:** `r\"\\frac{1}{2}\"` — preserve backslashes."
    },
    {
     "t": "p",
     "text": "**Limitations:** - Raw strings **cannot** end with an odd number of backslashes: `r\"hello\\\"` is a syntax error. - Raw strings are still `str` objects — the `r` prefix only affects how the literal is parsed."
    },
    {
     "t": "hr"
    },
    {
     "t": "p",
     "text": "Q17. How do f-strings handle expressions compared to .format()?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Feature",
      "f-string",
      "`.format()`"
     ],
     "rows": [
      [
       "Syntax",
       "`f\"{expr}\"`",
       "`\"{0}\".format(value)`"
      ],
      [
       "Expression evaluation",
       "At definition site",
       "At `.format()` call"
      ],
      [
       "Arbitrary expressions",
       "Yes",
       "Limited (attribute/index)"
      ],
      [
       "Performance",
       "Faster (compiled)",
       "Slower (runtime parsing)"
      ],
      [
       "Dynamic templates",
       "No (evaluated immediately)",
       "Yes (store template string)"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# f-strings support arbitrary expressions\nf\"{[x**2 for x in range(5)]}\"      # '[0, 1, 4, 9, 16]'\nf\"{'even' if 4 % 2 == 0 else 'odd'}\"  # 'even'\n\n# .format() is limited in expressions\n\"{0.real}\".format(3+4j)             # '3.0' — attribute access only",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**When to use `.format()`:** - When the template string is **stored** and reused with different data. - When the template comes from an external source (config file, database). - f-strings must be defined where the variables are in scope."
    },
    {
     "t": "hr"
    },
    {
     "t": "p",
     "text": "Q18. What is str.maketrans() used for?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "`str.maketrans()` creates a **translation table** for use with `str.translate()`, enabling efficient character-level substitution or deletion."
    },
    {
     "t": "p",
     "text": "**Three forms:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Form 1: Two equal-length strings (map chars one-to-one)\ntable = str.maketrans(\"aeiou\", \"12345\")\n\"hello\".translate(table)           # 'h2ll4'\n\n# Form 2: Two empty strings + delete string\ntable = str.maketrans(\"\", \"\", \"aeiou\")\n\"hello world\".translate(table)     # 'hll wrld'\n\n# Form 3: Dictionary mapping (most flexible)\ntable = str.maketrans({\"a\": \"1\", \"e\": \"2\", \"o\": None})  # None = delete\n\"hello\".translate(table)           # 'h2ll'",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Use cases:** - Removing punctuation from text. - Simple cipher/substitution encryption (e.g., ROT13). - Normalizing characters (replacing accented characters with ASCII). - Much faster than chained `replace()` calls for multiple character substitutions."
    },
    {
     "t": "hr"
    },
    {
     "t": "p",
     "text": "Q19. How to handle multi-byte character strings?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "In Python 3, you rarely need to worry about multi-byte characters at the `str` level — strings are sequences of **Unicode code points**, not bytes."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "s = \"café\"\nlen(s)          # 4 (characters, not bytes)\ns[3]            # 'é' (one character)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Multi-byte concerns arise with `bytes`:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "b = \"café\".encode(\"utf-8\")\nlen(b)          # 5 bytes (é = 2 bytes in UTF-8)\nb[3]            # 195 (first byte of é)\nb[3:5]          # b'\\xc3\\xa9' (both bytes of é)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Important considerations:** - `len(str)` returns **character count**, not byte count. - `len(bytes)` returns **byte count**. - When slicing `bytes`, you can split a multi-byte character, producing invalid data. - Use `str` for text processing; convert to `bytes` only for I/O."
    },
    {
     "t": "p",
     "text": "**Grapheme clusters (visual characters):**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "s = \"é\"                    # Could be 1 char (U+00E9) or 2 chars (e + combining accent)\nimport unicodedata\nunicodedata.normalize(\"NFC\", s)    # Composed: single char\nunicodedata.normalize(\"NFD\", s)    # Decomposed: two chars",
     "numbered": false
    },
    {
     "t": "hr"
    },
    {
     "t": "p",
     "text": "Q20. What is the memory impact of string concatenation in a loop?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Concatenating strings with `+` in a loop is **O(n²)** in time and creates excessive intermediate objects."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Each iteration creates a new string, copying all previous characters\nresult = \"\"\nfor i in range(n):\n    result += \"a\"    # Copies 1, then 2, then 3, ... then n characters\n# Total copies: 1 + 2 + 3 + ... + n = n(n+1)/2 = O(n²)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Memory impact:** - Each intermediate string is a separate object on the heap. - The garbage collector must free the previous string each iteration. - For n = 1,000,000, this means ~500 billion character copies."
    },
    {
     "t": "p",
     "text": "**Solution:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "result = \"\".join(\"a\" for _ in range(n))    # O(n) time and memory",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**CPython optimization:** If the string has a reference count of 1, `+=` may reuse the buffer. But this is fragile and not guaranteed — don't rely on it."
    },
    {
     "t": "hr"
    },
    {
     "t": "p",
     "text": "Q21. What is the difference between repr() and str()?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Feature",
      "`str()`",
      "`repr()`"
     ],
     "rows": [
      [
       "Purpose",
       "Human-readable output",
       "Unambiguous, developer-facing"
      ],
      [
       "Goal",
       "Readability",
       "Reproducibility"
      ],
      [
       "Dunder",
       "`__str__`",
       "`__repr__`"
      ],
      [
       "Strings",
       "Returns the string as-is",
       "Adds quotes, escapes special chars"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "s = \"hello\\nworld\"\n\nprint(str(s))\n# hello\n# world\n\nprint(repr(s))\n# 'hello\\nworld'\n\n# For objects\nfrom datetime import datetime\nnow = datetime.now()\nprint(str(now))    # 2025-06-03 10:30:00.123456\nprint(repr(now))   # datetime.datetime(2025, 6, 3, 10, 30, 0, 123456)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key rule:** `repr()` should ideally return a string that, when passed to `eval()`, recreates the object. `str()` should return a user-friendly representation."
    },
    {
     "t": "p",
     "text": "In f-strings: `f\"{obj!r}\"` uses `repr()`, `f\"{obj!s}\"` uses `str()`."
    },
    {
     "t": "hr"
    },
    {
     "t": "p",
     "text": "Q22. How does Python's string + operator work internally?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "The `+` operator on strings invokes `str.__add__()`:"
    },
    {
     "t": "ol",
     "items": [
      "**Allocates** new memory large enough for both strings combined.",
      "**Copies** the characters from the left operand into the new buffer.",
      "**Copies** the characters from the right operand after them.",
      "**Returns** the new string object."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "result = \"hello\" + \" \" + \"world\"\n# Step 1: \"hello\" + \" \" → new string \"hello \" (6 chars allocated, 5+1 copied)\n# Step 2: \"hello \" + \"world\" → new string \"hello world\" (11 chars allocated, 6+5 copied)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Performance implications:** - Each `+` creates a new string → O(n) for each concatenation. - Chaining in a loop: O(n²) total. - CPython optimization: if the left operand has refcount 1, it may `realloc()` in place (but not guaranteed)."
    },
    {
     "t": "p",
     "text": "**Alternatives:** - `str.join()` — O(n) total, pre-calculates size. - `io.StringIO` — buffer-based, efficient for streaming writes. - f-strings — compiled to efficient bytecode for fixed concatenations."
    },
    {
     "t": "hr"
    },
    {
     "t": "p",
     "text": "Q23. What are template strings (string.Template)?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "`string.Template` provides a simpler, safer string substitution mechanism."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "from string import Template\n\nt = Template(\"Hello, $name! You are $age years old.\")\nresult = t.substitute(name=\"Alice\", age=30)    # 'Hello, Alice! You are 30 years old.'\nresult = t.safe_substitute(name=\"Alice\")       # 'Hello, Alice! You are $age years old.'",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key features:** - `$identifier` or `${identifier}` syntax for placeholders. - `substitute()` raises `KeyError` for missing keys. - `safe_substitute()` leaves missing placeholders unchanged. - **No expression evaluation** — only simple variable substitution."
    },
    {
     "t": "p",
     "text": "**When to use:** - **User-provided format strings** — f-strings and `.format()` allow arbitrary code execution via attribute access, which is a security risk. - **Internationalization (i18n)** — translators can use `$name` safely. - **Simple templating** where expression evaluation is not needed."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Security comparison\n# DANGEROUS with .format():\n\"{0.__class__.__bases__[0].__subclasses__()}\".format(\"\")  # Can explore Python internals\n\n# SAFE with Template:\nTemplate(\"$name\").substitute(name=\"Alice\")  # Only substitution, no code execution",
     "numbered": false
    },
    {
     "t": "hr"
    },
    {
     "t": "p",
     "text": "Q24. How to convert between different encodings?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Python strings are always Unicode internally. Encoding conversion happens through `bytes`:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# UTF-8 → Latin-1\ntext = \"café\"\nutf8_bytes = text.encode(\"utf-8\")         # b'caf\\xc3\\xa9'\nlatin1_bytes = text.encode(\"latin-1\")     # b'caf\\xe9'\n\n# Read bytes in one encoding, convert to another\ndata = b'\\xc3\\xa9'                        # UTF-8 bytes for é\ntext = data.decode(\"utf-8\")              # 'é'\nlatin1 = text.encode(\"latin-1\")          # b'\\xe9'\n\n# Common encodings\ntext.encode(\"utf-8\")       # Universal, variable-length (1-4 bytes)\ntext.encode(\"utf-16\")      # Used in Windows internally\ntext.encode(\"ascii\")       # 7-bit, raises error on non-ASCII\ntext.encode(\"latin-1\")     # 8-bit, covers U+0000–U+00FF\ntext.encode(\"cp1252\")      # Windows Western European",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**File I/O with encoding:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Writing\nwith open(\"file.txt\", \"w\", encoding=\"utf-8\") as f:\n    f.write(\"café\")\n\n# Reading\nwith open(\"file.txt\", \"r\", encoding=\"utf-8\") as f:\n    content = f.read()\n\n# Converting a file from one encoding to another\nwith open(\"input.txt\", \"r\", encoding=\"latin-1\") as f:\n    content = f.read()\nwith open(\"output.txt\", \"w\", encoding=\"utf-8\") as f:\n    f.write(content)",
     "numbered": false
    },
    {
     "t": "hr"
    },
    {
     "t": "p",
     "text": "Q25. What is the textwrap module used for?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "The `textwrap` module formats text for output in terminals, emails, or constrained-width displays."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import textwrap\n\nlong_text = \"Python is a high-level, general-purpose programming language. Its design philosophy emphasizes code readability with the use of significant indentation.\"\n\n# Wrap to 40 characters wide\nwrapped = textwrap.wrap(long_text, width=40)\nprint(wrapped)\n# ['Python is a high-level, general-', 'purpose programming language. Its', 'design philosophy emphasizes code', 'readability with the use of significant', 'indentation.']\n\n# Fill — wrap + join with newlines\nprint(textwrap.fill(long_text, width=40))\n\n# Shorten — truncate with placeholder\nprint(textwrap.shorten(long_text, width=50))\n# 'Python is a high-level, [...]'\n\n# Dedent — remove common leading whitespace\ncode = \"\"\"\n    def hello():\n        print(\"hi\")\n\"\"\"\nprint(textwrap.dedent(code))\n\n# Indent — add prefix to lines\ntext = \"Line 1\\nLine 2\\nLine 3\"\nprint(textwrap.indent(text, \"  > \"))\n#   > Line 1\n#   > Line 2\n#   > Line 3",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Use cases:** - Formatting help text and docstrings for terminal output. - Wrapping text in emails or reports. - `dedent()` is commonly used with triple-quoted strings to remove unwanted indentation. - `shorten()` is useful for truncating strings to fit display constraints."
    }
   ]
  },
  {
   "t": "drill",
   "n": "4",
   "q": "1. Convert to set — O(1) lookups",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "large_set = set(large_list)   # O(n) one-time cost\n\nif 9_999_999 in large_set:    # O(1) per lookup\n    print(\"Found\")",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Best when you need **multiple lookups**."
    }
   ]
  },
  {
   "t": "drill",
   "n": "5",
   "q": "2. Sort + binary search — O(log n) per lookup",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import bisect\n\nlarge_list.sort()   # O(n log n) one-time cost\n\ndef binary_search(sorted_list, target):\n    i = bisect.bisect_left(sorted_list, target)\n    return i < len(sorted_list) and sorted_list[i] == target\n\nbinary_search(large_list, 9_999_999)   # O(log n)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Best when the **list is already sorted** or you need to maintain order."
    }
   ]
  },
  {
   "t": "drill",
   "n": "6",
   "q": "3. Use a dict for key-value lookups",
   "terms": [
    "O(1)",
    "1 lookup",
    "Multiple lookups",
    "Already sorted + no extra memory",
    "Need associated values"
   ],
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "lookup = {x: True for x in large_list}\nif lookup.get(9_999_999):\n    print(\"Found\")",
     "numbered": false
    },
    {
     "t": "h4",
     "text": "Comparison"
    },
    {
     "t": "table",
     "head": [
      "Method",
      "Build Time",
      "Lookup Time",
      "Extra Memory"
     ],
     "rows": [
      [
       "`x in list`",
       "None",
       "O(n) per lookup",
       "None"
      ],
      [
       "`x in set`",
       "O(n)",
       "**O(1)** per lookup",
       "O(n)"
      ],
      [
       "`bisect` on sorted list",
       "O(n log n)",
       "O(log n) per lookup",
       "None (in-place)"
      ],
      [
       "`x in dict`",
       "O(n)",
       "**O(1)** per lookup",
       "O(n)"
      ]
     ]
    },
    {
     "t": "h4",
     "text": "Rule of Thumb"
    },
    {
     "t": "ul",
     "items": [
      "**1 lookup**Just use `in` on the list",
      "**Multiple lookups**Convert to `set`",
      "**Already sorted + no extra memory**Use `bisect`",
      "**Need associated values**Use `dict`"
     ]
    }
   ]
  },
  {
   "t": "drill",
   "n": "7",
   "q": "Are strings mutable or immutable in Python? Why?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Strings are **immutable**. Once a string object is created, its contents cannot be changed."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "s = \"hello\"\ns[0] = \"H\"   # TypeError: 'str' object does not support item assignment",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Why immutable?**"
    },
    {
     "t": "ol",
     "items": [
      "**Hashability:** Immutable objects can be hashed, making strings usable as dictionary keys and set members.",
      "**Thread Safety:** Immutable objects are inherently thread-safe — no synchronization needed.",
      "**Interning/Caching:** Python can safely share and reuse string objects since they can never change.",
      "**Security:** Strings used as identifiers, file paths, and URLs cannot be altered unexpectedly."
     ]
    },
    {
     "t": "p",
     "text": "To \"modify\" a string, you create a new string:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "s = \"H\" + s[1:]   # Creates a new string 'Hello'",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "8",
   "q": "What is the difference between find() and index()?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Both search for a substring and return the index of the first occurrence."
    },
    {
     "t": "table",
     "head": [
      "Feature",
      "`find()`",
      "`index()`"
     ],
     "rows": [
      [
       "Not found",
       "Returns `-1`",
       "Raises `ValueError`"
      ],
      [
       "Use case",
       "When absence is expected",
       "When absence is an error"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "s = \"hello world\"\ns.find(\"xyz\")     # -1\ns.index(\"xyz\")    # ValueError: substring not found",
     "numbered": false
    },
    {
     "t": "p",
     "text": "Both also have right-searching variants: `rfind()` and `rindex()`."
    },
    {
     "t": "p",
     "text": "**Best Practice:** Use `find()` when you want to check and handle the \"not found\" case gracefully. Use `index()` when the substring should always be present and its absence indicates a bug."
    }
   ]
  },
  {
   "t": "drill",
   "n": "9",
   "q": "How are strings stored internally in Python 3?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Python 3 strings are sequences of **Unicode code points**. Internally, CPython uses a **flexible string representation** (PEP 393, Python 3.3+):"
    },
    {
     "t": "table",
     "head": [
      "Character Range",
      "Encoding Used",
      "Bytes per Char"
     ],
     "rows": [
      [
       "U+0000 – U+00FF",
       "Latin-1",
       "1 byte"
      ],
      [
       "U+0000 – U+FFFF",
       "UCS-2",
       "2 bytes"
      ],
      [
       "U+0000 – U+10FFFF",
       "UCS-4",
       "4 bytes"
      ]
     ]
    },
    {
     "t": "ul",
     "items": [
      "The encoding is chosen based on the **widest character** in the string.",
      "A string containing only ASCII characters uses 1 byte per character.",
      "If even one character requires 4 bytes (e.g., emoji), the entire string uses 4 bytes per character.",
      "This is an internal detail — at the Python level, strings are always sequences of Unicode code points."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import sys\nprint(sys.getsizeof(\"hello\"))      # Small: ASCII-only\nprint(sys.getsizeof(\"héllo\"))      # Latin-1 range\nprint(sys.getsizeof(\"h€llo\"))      # UCS-2 range\nprint(sys.getsizeof(\"h😀llo\"))     # UCS-4 range",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "10",
   "q": "What is string interning and when does it happen?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "**String interning** is an optimization where Python stores only one copy of each distinct immutable string value in memory and reuses it."
    },
    {
     "t": "p",
     "text": "**When CPython automatically interns strings:** - String literals that look like **identifiers** (letters, digits, underscores only) - Strings used as **variable names, attribute names, method names** - **Compile-time constants** that look like identifiers - Strings of length 0 or 1"
    },
    {
     "t": "p",
     "text": "**When interning does NOT happen:** - Strings containing spaces, punctuation, or special characters - Strings created at **runtime** (e.g., via concatenation, user input)"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "a = \"hello\"\nb = \"hello\"\na is b          # True — interned\n\nc = \"hello world\"\nd = \"hello world\"\nc is d          # Unreliable — may or may not be interned",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Manual interning:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import sys\nx = sys.intern(\"hello world\")\ny = sys.intern(\"hello world\")\nx is y          # True — manually interned",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Important:** Never rely on `is` for string comparison in application code. Always use `==`."
    }
   ]
  },
  {
   "t": "drill",
   "n": "11",
   "q": "What is the difference between str and bytes?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Feature",
      "`str`",
      "`bytes`"
     ],
     "rows": [
      [
       "Content",
       "Unicode text (code points)",
       "Raw binary data (0–255)"
      ],
      [
       "Literal",
       "`\"hello\"`",
       "`b\"hello\"`"
      ],
      [
       "Element type",
       "Single character (str)",
       "Integer (0–255)"
      ],
      [
       "Mutability",
       "Immutable",
       "Immutable (`bytearray` is mutable)"
      ],
      [
       "Use case",
       "Text processing",
       "I/O, network, file bytes"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "s = \"café\"\nb = b\"hello\"\n\ns[0]        # 'c' (str)\nb[0]        # 104 (int — ASCII code of 'h')\n\n# Conversion\ns.encode(\"utf-8\")       # str → bytes\nb.decode(\"utf-8\")       # bytes → str",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key rule:** Python 3 enforces a strict separation between text (`str`) and binary data (`bytes`). You cannot mix them without explicit conversion."
    }
   ]
  },
  {
   "t": "drill",
   "n": "12",
   "q": "What are the 3 string formatting approaches in Python? Which is preferred?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    }
   ]
  }
 ],
 "takeaways": []
});
