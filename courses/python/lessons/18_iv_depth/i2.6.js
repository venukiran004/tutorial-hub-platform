/* ============================================================================
   INTERVIEW: LANGUAGE DEPTH i2.6 — Regular Expressions
   ----------------------------------------------------------------------------
   Theory interview questions: the ones you answer out loud. Anything that
   asks for a program lives in the Coding Practice course instead.
   ========================================================================= */
EC.receiveLesson({
 "id": "i2.6",
 "lede": "**20 interview questions on regular expressions**, with the answers folded away. Say your answer out loud first — recognising an answer and being able to give one are different skills, and only the second survives a follow-up.",
 "objectives": [
  "Answer 20 questions on regular expressions without prompting",
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
   "q": "What is the difference between `re.match()` and `re.search()`?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Feature",
      "`re.match()`",
      "`re.search()`"
     ],
     "rows": [
      [
       "Where it checks",
       "**Beginning** of the string only",
       "**Anywhere** in the string"
      ],
      [
       "Equivalent to",
       "`^pattern`",
       "No implicit anchor"
      ],
      [
       "Returns",
       "Match object or `None`",
       "Match object or `None`"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import re\n\ntext = \"Hello World 123\"\n\nprint(re.match(r\"\\d+\", text))     # None — no digits at start\nprint(re.search(r\"\\d+\", text))    # <re.Match object; span=(12, 15), match='123'>\n\nprint(re.match(r\"Hello\", text))   # <re.Match object; span=(0, 5), match='Hello'>\nprint(re.search(r\"Hello\", text))  # <re.Match object; span=(0, 5), match='Hello'>",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Use `re.match()` when you know the pattern must appear at the start. Use `re.search()` to find the pattern anywhere. If you need to match the **entire** string, use `re.fullmatch()`."
    }
   ]
  },
  {
   "t": "drill",
   "n": "2",
   "q": "What is the purpose of raw strings (`r\"...\"`) in regex?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Raw strings prevent Python from interpreting backslash sequences, so `\\n` stays as a literal backslash + `n` rather than a newline character."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Without raw string — \\b is interpreted as backspace (ASCII 8)\npattern1 = \"\\bword\\b\"\nprint(repr(pattern1))   # '\\x08word\\x08'\n\n# With raw string — \\b stays as literal \\b (word boundary in regex)\npattern2 = r\"\\bword\\b\"\nprint(repr(pattern2))   # '\\\\bword\\\\b'\n\ntext = \"a word here\"\nprint(re.search(pattern1, text))   # None (looking for backspace)\nprint(re.search(pattern2, text))   # <re.Match object; match='word'>",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key takeaway:** Always use raw strings for regex patterns. Common escapes that break without `r`: `\\b`, `\\d`, `\\w`, `\\s`, `\\n`, `\\t`."
    }
   ]
  },
  {
   "t": "drill",
   "n": "3",
   "q": "Explain greedy vs non-greedy (lazy) matching with an example.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Greedy** (default): Matches as much text as possible.",
      "**Non-greedy/Lazy**Matches as little text as possible. Add `?` after the quantifier."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "html = \"<b>Bold</b> and <i>Italic</i>\"\n\n# Greedy: .* grabs everything between first < and LAST >\ngreedy = re.findall(r\"<.*>\", html)\nprint(greedy)    # ['<b>Bold</b> and <i>Italic</i>']\n\n# Non-greedy: .*? stops at the nearest >\nlazy = re.findall(r\"<.*?>\", html)\nprint(lazy)      # ['<b>', '</b>', '<i>', '</i>']",
     "numbered": false
    },
    {
     "t": "table",
     "head": [
      "Quantifier",
      "Greedy",
      "Lazy"
     ],
     "rows": [
      [
       "0 or more",
       "`*`",
       "`*?`"
      ],
      [
       "1 or more",
       "`+`",
       "`+?`"
      ],
      [
       "0 or 1",
       "`?`",
       "`??`"
      ],
      [
       "n to m",
       "`{n,m}`",
       "`{n,m}?`"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**When to use lazy:** Extracting content between delimiters (HTML tags, quotes, brackets)."
    }
   ]
  },
  {
   "t": "drill",
   "n": "4",
   "q": "What are named groups and why are they useful?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Named groups use `(?P<name>...)` syntax to label captured groups, making patterns self-documenting and results easier to access."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "log = '2025-06-01 10:30:15 [ERROR] Connection timeout'\n\n# Without named groups — positional access\nm1 = re.search(r\"(\\d{4}-\\d{2}-\\d{2}) (\\d{2}:\\d{2}:\\d{2}) \\[(\\w+)\\] (.+)\", log)\nprint(m1.group(1))   # 2025-06-01 — which group is this? Unclear.\n\n# With named groups — self-documenting\nm2 = re.search(\n    r\"(?P<date>\\d{4}-\\d{2}-\\d{2}) (?P<time>\\d{2}:\\d{2}:\\d{2}) \\[(?P<level>\\w+)\\] (?P<msg>.+)\",\n    log\n)\nprint(m2.group(\"date\"))    # 2025-06-01\nprint(m2.group(\"level\"))   # ERROR\nprint(m2.groupdict())\n# {'date': '2025-06-01', 'time': '10:30:15', 'level': 'ERROR', 'msg': 'Connection timeout'}",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Benefits:** 1. **Readability** — Pattern documents itself. 2. **Maintainability** — Adding/removing groups doesn't break access by name. 3. **Dict output** — `.groupdict()` returns a dictionary, perfect for structured data. 4. **Backreferences** — Use `(?P=name)` to reference the named group later in the pattern."
    }
   ]
  },
  {
   "t": "drill",
   "n": "5",
   "q": "Explain lookahead and lookbehind assertions. When would you use them?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Lookahead and lookbehind are **zero-width assertions** — they check for a pattern's presence without consuming characters."
    },
    {
     "t": "table",
     "head": [
      "Type",
      "Syntax",
      "Meaning"
     ],
     "rows": [
      [
       "Positive lookahead",
       "`(?=...)`",
       "Must be followed by ..."
      ],
      [
       "Negative lookahead",
       "`(?!...)`",
       "Must NOT be followed by ..."
      ],
      [
       "Positive lookbehind",
       "`(?<=...)`",
       "Must be preceded by ..."
      ],
      [
       "Negative lookbehind",
       "`(?<!...)`",
       "Must NOT be preceded by ..."
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "text = \"Price: $100, €200, $350\"\n\n# Extract numbers preceded by $\nprint(re.findall(r\"(?<=\\$)\\d+\", text))     # ['100', '350']\n\n# Extract numbers NOT preceded by $\nprint(re.findall(r\"(?<!\\$)\\b\\d+\", text))   # ['200']\n\n# Extract numbers followed by specific text\ntext2 = \"100 USD, 200 EUR, 300 USD\"\nprint(re.findall(r\"\\d+(?= USD)\", text2))   # ['100', '300']",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Use cases:** - Password validation (must contain uppercase, digit, special char) - Extracting values next to specific delimiters without including the delimiter - Finding patterns in specific contexts without consuming context characters"
    },
    {
     "t": "p",
     "text": "**Limitation:** In Python's `re` module, lookbehind must be **fixed-width** (no `*`, `+`, `?`). The `regex` third-party module supports variable-width lookbehind."
    }
   ]
  },
  {
   "t": "drill",
   "n": "6",
   "q": "How would you validate an email address using regex?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def validate_email(email):\n    \"\"\"Basic email validation.\"\"\"\n    pattern = r\"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$\"\n    return bool(re.match(pattern, email))\n\ntest_emails = [\n    \"user@example.com\",       # True\n    \"first.last@corp.co.uk\",  # True\n    \"user+tag@gmail.com\",     # True\n    \"user@.com\",              # False\n    \"@example.com\",           # False\n    \"user@com\",               # False\n    \"user name@example.com\",  # False\n]\n\nfor email in test_emails:\n    print(f\"{email:30s} → {validate_email(email)}\")",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Pattern breakdown:** - `^[a-zA-Z0-9._%+-]+` — local part: letters, digits, dots, underscores, etc. - `@` — literal at sign - `[a-zA-Z0-9.-]+` — domain name - `\\.[a-zA-Z]{2,}$` — TLD (at least 2 letters)"
    },
    {
     "t": "p",
     "text": "**Important caveat:** Email validation with regex is inherently imprecise. The actual RFC 5322 spec is extremely complex. For production, use libraries like `email-validator` or simply send a verification email."
    }
   ]
  },
  {
   "t": "drill",
   "n": "7",
   "q": "What are the benefits of `re.compile()`?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "`re.compile()` pre-compiles a regex pattern into a reusable pattern object."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Without compile — pattern is compiled every iteration\nfor line in large_file:\n    if re.search(r\"\\b\\d{3}-\\d{4}\\b\", line):\n        process(line)\n\n# With compile — pattern compiled ONCE\nphone_re = re.compile(r\"\\b\\d{3}-\\d{4}\\b\")\nfor line in large_file:\n    if phone_re.search(line):\n        process(line)",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Benefits:**"
    },
    {
     "t": "ol",
     "items": [
      "**Performance**Pattern is compiled once, not on every call. Significant for loops.",
      "**Readability**Name the pattern object descriptively (`email_re`, `phone_re`).",
      "**Separation of concerns**Define patterns at module level, use them anywhere.",
      "**Method access**Pattern objects have `.search()`, `.findall()`, `.sub()`, etc."
     ]
    },
    {
     "t": "p",
     "text": "**Note:** Python internally caches the most recently used patterns (up to ~512), so for one-off usage, `re.compile()` offers little performance gain. The real benefit is for patterns used repeatedly or when you want cleaner code."
    }
   ]
  },
  {
   "t": "drill",
   "n": "8",
   "q": "What are character classes and how do they work?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Character classes `[...]` match any **single character** from the specified set."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Basic character class\nprint(re.findall(r\"[aeiou]\", \"Hello World\"))   # ['e', 'o', 'o']\n\n# Range\nprint(re.findall(r\"[a-z]\", \"Hello 123\"))       # ['e', 'l', 'l', 'o']\nprint(re.findall(r\"[A-Za-z]\", \"Hello 123\"))    # ['H', 'e', 'l', 'l', 'o']\n\n# Negation with ^\nprint(re.findall(r\"[^a-zA-Z\\s]\", \"Hello World! 123\"))  # ['!', '1', '2', '3']\n\n# Special characters are literal inside []\nprint(re.findall(r\"[.+*?]\", \"a.b+c*d?e\"))     # ['.', '+', '*', '?']",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Key rules:** - `[abc]` — matches `a`, `b`, or `c` - `[a-z]` — range: any lowercase letter - `[^abc]` — negated: any char EXCEPT `a`, `b`, `c` - `[-]` or `[a-]` — literal hyphen (at start or end) - `[\\]]` — literal `]` (escaped) - Most special regex characters lose their meaning inside `[]` (`.`, `*`, `+`, `?`) - Exceptions: `\\`, `^` (at start), `-` (in middle), `]`"
    },
    {
     "t": "p",
     "text": "**Shorthand equivalents:** - `\\d` = `[0-9]` - `\\w` = `[a-zA-Z0-9_]` - `\\s` = `[ \\t\\n\\r\\f\\v]`"
    }
   ]
  },
  {
   "t": "drill",
   "n": "9",
   "q": "How does `re.sub()` work with a callable (function) replacement?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "When the second argument to `re.sub()` is a **function**, it is called for each match. The function receives a Match object and must return a replacement string."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Double every number in the text\ntext = \"item1: 5 units, item2: 10 units\"\n\ndef double_number(match):\n    return str(int(match.group()) * 2)\n\nresult = re.sub(r\"\\b\\d+\\b\", double_number, text)\nprint(result)   # item1: 10 units, item2: 20 units",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**More complex example — title case specific words:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "important = {\"python\", \"machine\", \"learning\", \"deep\"}\n\ndef smart_capitalize(match):\n    word = match.group()\n    if word.lower() in important:\n        return word.upper()\n    return word.lower()\n\ntext = \"introduction to PYTHON and MACHINE learning basics\"\nresult = re.sub(r\"\\b\\w+\\b\", smart_capitalize, text)\nprint(result)   # introduction to PYTHON and MACHINE LEARNING basics",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**When to use callable `re.sub()`:** - Conditional replacements based on matched content - Mathematical transformations on matched numbers - Context-dependent substitutions - Template rendering"
    }
   ]
  },
  {
   "t": "drill",
   "n": "10",
   "q": "What are common pitfalls when using regex in Python?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "h4",
     "text": "1. Forgetting Raw Strings"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# BUG: \\b is interpreted as backspace\nre.search(\"\\bword\\b\", \"a word here\")    # None!\n\n# FIX: Use raw string\nre.search(r\"\\bword\\b\", \"a word here\")   # Match!",
     "numbered": false
    },
    {
     "t": "h4",
     "text": "2. Greedy Matching Surprises"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Captures too much\nre.search(r\"\\\"(.*)\\\"\", '\"a\" and \"b\"').group(1)    # 'a\" and \"b'\n\n# Fix with lazy quantifier\nre.search(r\"\\\"(.*?)\\\"\", '\"a\" and \"b\"').group(1)   # 'a'",
     "numbered": false
    },
    {
     "t": "h4",
     "text": "3. `re.match()` vs `re.search()` Confusion"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "re.match(r\"world\", \"hello world\")    # None! (match checks start only)\nre.search(r\"world\", \"hello world\")   # Match!",
     "numbered": false
    },
    {
     "t": "h4",
     "text": "4. `findall()` with Groups Returns Group Content, Not Full Match"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "re.findall(r\"(\\d+)-(\\d+)\", \"12-34 56-78\")\n# [('12', '34'), ('56', '78')]  — not ['12-34', '56-78']\n\n# Fix: Use non-capturing groups if you want full match\nre.findall(r\"\\d+-\\d+\", \"12-34 56-78\")\n# ['12-34', '56-78']",
     "numbered": false
    },
    {
     "t": "h4",
     "text": "5. Catastrophic Backtracking"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# This pattern can be extremely slow on certain inputs\n# re.match(r\"(a+)+b\", \"a\" * 30 + \"c\")  # DON'T — exponential time!\n\n# Fix: Simplify the pattern\nre.match(r\"a+b\", \"a\" * 30 + \"c\")  # Fast",
     "numbered": false
    },
    {
     "t": "h4",
     "text": "6. Not Escaping Special Characters"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "re.search(r\"file.txt\", \"file_txt\")   # Matches! . is any char\n\n# Fix: Escape the dot\nre.search(r\"file\\.txt\", \"file_txt\")   # None (correct)\n\n# Or use re.escape()\nre.search(re.escape(\"file.txt\"), \"file_txt\")   # None",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "11",
   "q": "Explain the `re.VERBOSE` flag with an example.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "`re.VERBOSE` (or `re.X`) allows you to write regex patterns with **whitespace and comments**, making complex patterns readable."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Without VERBOSE — hard to read\npattern_compact = r\"^(?:\\+\\d{1,3})?[-.\\s]?\\(?\\d{3}\\)?[-.\\s]?\\d{3}[-.\\s]?\\d{4}$\"\n\n# With VERBOSE — same pattern, but readable\npattern_verbose = re.compile(r\"\"\"\n    ^                     # start of string\n    (?:\\+\\d{1,3})?        # optional country code (+1, +91, +44)\n    [-.\\s]?               # optional separator\n    \\(?                   # optional opening paren\n    \\d{3}                 # area code (3 digits)\n    \\)?                   # optional closing paren\n    [-.\\s]?               # optional separator\n    \\d{3}                 # exchange (3 digits)\n    [-.\\s]?               # optional separator\n    \\d{4}                 # subscriber (4 digits)\n    $                     # end of string\n\"\"\", re.VERBOSE)\n\ntest = \"+1-800-555-1234\"\nprint(bool(pattern_verbose.match(test)))   # True",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Rules under `re.VERBOSE`:** - Whitespace is ignored (use `\\` or `[ ]` for literal space) - `#` starts a comment to end of line - Pattern is functionally identical to the compact version - Often combined with triple-quoted strings for multi-line layout"
    }
   ]
  },
  {
   "t": "drill",
   "n": "12",
   "q": "What is the difference between `re.findall()` and `re.finditer()`?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Feature",
      "`re.findall()`",
      "`re.finditer()`"
     ],
     "rows": [
      [
       "Returns",
       "List of strings (or tuples)",
       "Iterator of Match objects"
      ],
      [
       "Memory",
       "Loads all matches into memory",
       "Lazy — one match at a time"
      ],
      [
       "Position info",
       "No (just strings)",
       "Yes (.start(), .end(), .span())"
      ],
      [
       "Best for",
       "Small text, simple extraction",
       "Large text, need match details"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "text = \"Errors at line 10, line 25, and line 100\"\n\n# findall — just the strings\nprint(re.findall(r\"line (\\d+)\", text))\n# ['10', '25', '100']\n\n# finditer — full Match objects\nfor m in re.finditer(r\"line (\\d+)\", text):\n    print(f\"Found '{m.group()}' at position {m.span()}, line number: {m.group(1)}\")\n# Found 'line 10' at position (10, 17), line number: 10\n# Found 'line 25' at position (19, 26), line number: 25\n# Found 'line 100' at position (32, 40), line number: 100",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**When to use `finditer()`:** - Processing large files (memory efficient) - You need position/span of each match - You need the full Match object (groups, groupdict)"
    }
   ]
  },
  {
   "t": "drill",
   "n": "13",
   "q": "What are backreferences and how are they used?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Backreferences refer back to a previously captured group within the same pattern. They match the **exact same text** that the group matched."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# \\1 refers to what group 1 matched\n# Find repeated words\ntext = \"the the quick brown fox fox jumped\"\ndupes = re.findall(r\"\\b(\\w+)\\s+\\1\\b\", text)\nprint(dupes)   # ['the', 'fox']\n\n# Named backreference with (?P=name)\ndupes2 = re.findall(r\"\\b(?P<word>\\w+)\\s+(?P=word)\\b\", text)\nprint(dupes2)  # ['the', 'fox']",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**In `re.sub()` — use `\\1`, `\\2`, or `\\g<name>`:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Swap first and last name\ntext = \"Doe, John\"\nswapped = re.sub(r\"(\\w+), (\\w+)\", r\"\\2 \\1\", text)\nprint(swapped)   # John Doe\n\n# With named groups\nswapped2 = re.sub(r\"(?P<last>\\w+), (?P<first>\\w+)\", r\"\\g<first> \\g<last>\", text)\nprint(swapped2)  # John Doe",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Use cases:** - Finding duplicate/repeated words - Matching opening and closing HTML tags: `<(\\w+)>.*?<!--\\1-->` - Reformatting text (swapping parts)"
    }
   ]
  },
  {
   "t": "drill",
   "n": "14",
   "q": "How would you extract data from HTML using regex? Is it recommended?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "html = \"\"\"\n<div class=\"product\">\n    <span class=\"name\">Widget A</span>\n    <span class=\"price\">$29.99</span>\n</div>\n<div class=\"product\">\n    <span class=\"name\">Widget B</span>\n    <span class=\"price\">$49.99</span>\n</div>\n\"\"\"\n\nnames = re.findall(r'class=\"name\">(.*?)</span>', html)\nprices = re.findall(r'class=\"price\">\\$([\\d.]+)</span>', html)\nprint(list(zip(names, prices)))\n# [('Widget A', '29.99'), ('Widget B', '49.99')]",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Is it recommended? NO, for production code.**"
    },
    {
     "t": "p",
     "text": "**Why regex is bad for HTML:** 1. HTML is not a regular language — regex cannot handle nested structures. 2. Breaks on edge cases: self-closing tags, attributes with quotes, comments, CDATA. 3. Fragile — minor HTML changes break the pattern."
    },
    {
     "t": "p",
     "text": "**What to use instead:** - `BeautifulSoup` — simple, Pythonic API - `lxml` — fast, supports XPath - `html.parser` — standard library"
    },
    {
     "t": "p",
     "text": "**When regex is acceptable for HTML:** - Quick one-off scripts - Very simple, controlled HTML snippets - When you can't install third-party libraries"
    }
   ]
  },
  {
   "t": "drill",
   "n": "15",
   "q": "How do you handle multiline text with regex?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "Two flags control multiline behavior:"
    },
    {
     "t": "h4",
     "text": "`re.MULTILINE` (re.M)"
    },
    {
     "t": "p",
     "text": "Makes `^` and `$` match at **each line boundary**, not just start/end of string."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "text = \"\"\"Line 1: Hello\nLine 2: World\nLine 3: Python\"\"\"\n\n# Without MULTILINE\nprint(re.findall(r\"^Line \\d\", text))         # ['Line 1']\n\n# With MULTILINE\nprint(re.findall(r\"^Line \\d\", text, re.M))   # ['Line 1', 'Line 2', 'Line 3']\n\n# Match lines ending with specific word\nprint(re.findall(r\"^.*Python$\", text, re.M))  # ['Line 3: Python']",
     "numbered": false
    },
    {
     "t": "h4",
     "text": "`re.DOTALL` (re.S)"
    },
    {
     "t": "p",
     "text": "Makes `.` match **newline characters** too (normally `.` matches anything except `\\n`)."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "text = \"<div>\\nContent here\\n</div>\"\n\n# Without DOTALL — . doesn't match \\n\nprint(re.search(r\"<div>(.+)</div>\", text))           # None\n\n# With DOTALL — . matches \\n\nprint(re.search(r\"<div>(.+)</div>\", text, re.S).group(1))  # \\nContent here\\n",
     "numbered": false
    },
    {
     "t": "h4",
     "text": "Combining Both"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "text = \"\"\"START\nBlock 1 content\nmore content\nEND\nSTART\nBlock 2 content\nEND\"\"\"\n\n# Extract content between START and END across multiple lines\nblocks = re.findall(r\"^START\\n(.*?)^END\", text, re.M | re.S)\nprint(blocks)   # ['Block 1 content\\nmore content\\n', 'Block 2 content\\n']",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "16",
   "q": "What is `re.escape()` and when would you use it?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "`re.escape()` adds backslashes before all special regex characters in a string, making it safe to use as a literal pattern."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Problem: Special characters in user input\nuser_input = \"price is $10.00 (USD)\"\n# This fails — $, ., (, ) are special\nprint(re.search(user_input, \"The price is $10.00 (USD) today\"))  # Error or wrong match\n\n# Solution: Escape the input\nsafe_pattern = re.escape(user_input)\nprint(repr(safe_pattern))   # 'price\\\\ is\\\\ \\\\$10\\\\.00\\\\ \\\\(USD\\\\)'\nprint(re.search(safe_pattern, \"The price is $10.00 (USD) today\"))  # Match!",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**When to use `re.escape()`:** - When building patterns from **user-supplied strings** - When searching for **literal strings** that contain special characters - When constructing patterns programmatically"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Build pattern from list of literal strings\nkeywords = [\"C++\", \"C#\", \".NET\", \"Node.js\"]\npattern = \"|\".join(re.escape(k) for k in keywords)\nprint(pattern)   # C\\+\\+|C\\#|\\.NET|Node\\.js\n\ntext = \"I know C++, C#, and Node.js\"\nprint(re.findall(pattern, text))   # ['C++', 'C#', 'Node.js']",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "17",
   "q": "How would you use regex for text preprocessing in an NLP/ML pipeline?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def preprocess_text(text):\n    \"\"\"Standard NLP text preprocessing pipeline using regex.\"\"\"\n    # 1. Lowercase\n    text = text.lower()\n    \n    # 2. Remove URLs\n    text = re.sub(r\"https?://\\S+|www\\.\\S+\", \"\", text)\n    \n    # 3. Remove HTML tags\n    text = re.sub(r\"<[^>]+>\", \"\", text)\n    \n    # 4. Remove email addresses\n    text = re.sub(r\"\\S+@\\S+\\.\\S+\", \"\", text)\n    \n    # 5. Remove mentions and hashtags\n    text = re.sub(r\"[@#]\\w+\", \"\", text)\n    \n    # 6. Remove punctuation (keep apostrophes for contractions)\n    text = re.sub(r\"[^\\w\\s']\", \"\", text)\n    \n    # 7. Normalize whitespace\n    text = re.sub(r\"\\s+\", \" \", text).strip()\n    \n    return text\n\nraw = \"Check https://example.com! Contact @admin or user@test.com #ML <b>Great</b> isn't it???\"\nprint(preprocess_text(raw))\n# check  contact  or   great isn't it",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Common regex operations in ML/DS:**"
    },
    {
     "t": "table",
     "head": [
      "Task",
      "Pattern"
     ],
     "rows": [
      [
       "Remove punctuation",
       "`[^\\w\\s]`"
      ],
      [
       "Normalize whitespace",
       "`\\s+` → `\" \"`"
      ],
      [
       "Extract numbers",
       "`-?\\d+\\.?\\d*`"
      ],
      [
       "Remove digits",
       "`\\d+`"
      ],
      [
       "Remove non-ASCII",
       "`[^\\x00-\\x7F]+`"
      ],
      [
       "Extract words",
       "`\\b\\w+\\b`"
      ],
      [
       "Remove stopwords (simple)",
       "`\\b(the\\|is\\|and\\|a)\\b`"
      ]
     ]
    }
   ]
  },
  {
   "t": "drill",
   "n": "18",
   "q": "What is the difference between `\\b` and `\\B`? Give practical examples.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "`\\b` — **Word boundary**: the position between a word character (`\\w`) and a non-word character (`\\W`), or at the start/end of the string.",
      "`\\B` — **Non-word boundary**: any position that is NOT a word boundary."
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "text = \"cat concatenate category caterpillar\"\n\n# \\b — match 'cat' as a whole word only\nprint(re.findall(r\"\\bcat\\b\", text))     # ['cat']\n\n# \\B — match 'cat' NOT at a word boundary (inside words)\nprint(re.findall(r\"\\Bcat\\B\", text))     # ['cat']  (from 'concatenate')\n\n# Match 'cat' at the START of a word (but not the whole word)\nprint(re.findall(r\"\\bcat\\B\", text))     # ['cat', 'cat', 'cat'] — category, caterpillar, concatenate start\n# Actually:\nfor m in re.finditer(r\"\\bcat\\B\", text):\n    # Find the full word containing this match\n    word_match = re.search(r\"\\S+\", text[m.start():])\n    print(f\"  '{m.group()}' in word starting at {m.start()}: {word_match.group()}\")",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Practical uses:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Find whole words only\nre.sub(r\"\\bclass\\b\", \"category\", \"class in subclass is classified\")\n# 'category in subclass is classified'\n\n# Find words starting with 'pre'\nprint(re.findall(r\"\\bpre\\w+\", \"prefix preview preprocess represent\"))\n# ['prefix', 'preview', 'preprocess']\n\n# Find words ending with 'ing'\nprint(re.findall(r\"\\w+ing\\b\", \"running singing string thing\"))\n# ['running', 'singing', 'string', 'thing']",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "19",
   "q": "How do you handle Unicode text in Python regex?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "By default, Python 3 regex operates on Unicode strings, so `\\w`, `\\d`, `\\s`, `\\b` match Unicode characters."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "text = \"Hello こんにちは Привет café naïve\"\n\n# \\w matches Unicode word characters by default\nprint(re.findall(r\"\\w+\", text))\n# ['Hello', 'こんにちは', 'Привет', 'café', 'naïve']\n\n# Use re.ASCII to restrict to ASCII only\nprint(re.findall(r\"\\w+\", text, re.ASCII))\n# ['Hello', 'caf', 'na', 've']",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Unicode categories with `\\p{}`** (requires `regex` module, not `re`):"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Standard re module — use character ranges\ncjk = re.findall(r\"[\\u4e00-\\u9fff]+\", \"Hello 你好世界 test\")\nprint(cjk)   # ['你好世界']\n\n# Match accented characters\naccented = re.findall(r\"[À-ÿ]\", \"café résumé naïve\")\nprint(accented)   # ['é', 'é', 'é', 'ï']",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Practical tip for ML/NLP:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Remove non-Latin characters (keep ASCII + accented Latin)\ntext = \"café 你好 hello мир\"\nlatin_only = re.sub(r\"[^\\x00-\\x7F\\u00C0-\\u024F\\s]\", \"\", text).strip()\nlatin_only = re.sub(r\"\\s+\", \" \", latin_only)\nprint(latin_only)   # café  hello",
     "numbered": false
    }
   ]
  },
  {
   "t": "drill",
   "n": "20",
   "q": "Write a regex to validate and parse a URL into its components.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "url_pattern = re.compile(r\"\"\"\n    ^\n    (?P<scheme>https?|ftp)://          # scheme\n    (?P<host>                           # host\n        (?:[\\w-]+\\.)+                   # subdomain(s) + domain\n        [a-zA-Z]{2,}                    # TLD\n    )\n    (?::(?P<port>\\d{1,5}))?            # optional port\n    (?P<path>/[^\\s?#]*)?               # optional path\n    (?:\\?(?P<query>[^\\s#]*))?          # optional query string\n    (?:\\#(?P<fragment>[^\\s]*))?        # optional fragment\n    $\n\"\"\", re.VERBOSE)\n\ntest_urls = [\n    \"https://www.example.com/path/to/page?q=search&lang=en#section1\",\n    \"http://api.service.com:8080/v2/data\",\n    \"https://example.com\",\n    \"ftp://files.server.org/pub/docs\",\n]\n\nfor url in test_urls:\n    m = url_pattern.match(url)\n    if m:\n        print(f\"URL: {url}\")\n        for key, value in m.groupdict().items():\n            if value:\n                print(f\"  {key:10s}: {value}\")\n        print()",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Output:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "URL: https://www.example.com/path/to/page?q=search&lang=en#section1\n  scheme    : https\n  host      : www.example.com\n  path      : /path/to/page\n  query     : q=search&lang=en\n  fragment  : section1\n\nURL: http://api.service.com:8080/v2/data\n  scheme    : http\n  host      : api.service.com\n  port      : 8080\n  path      : /v2/data\n\nURL: https://example.com\n  scheme    : https\n  host      : example.com\n\nURL: ftp://files.server.org/pub/docs\n  scheme    : ftp\n  host      : files.server.org\n  path      : /pub/docs",
     "numbered": false
    },
    {
     "t": "p",
     "text": "**Production note:** For real URL parsing, use Python's `urllib.parse.urlparse()`. Regex is useful when you need to extract URLs from unstructured text or enforce specific URL formats."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Standard library approach\nfrom urllib.parse import urlparse\n\nparsed = urlparse(\"https://www.example.com/path?q=1#frag\")\nprint(parsed.scheme)    # https\nprint(parsed.netloc)    # www.example.com\nprint(parsed.path)      # /path\nprint(parsed.query)     # q=1\nprint(parsed.fragment)  # frag",
     "numbered": false
    }
   ]
  }
 ],
 "takeaways": []
});
