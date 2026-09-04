/* ============================================================================
   PRACTICE P1.1 — String Basics Drills
   ========================================================================= */
EC.receiveLesson({
  id: "p1.1",

  lede: "Eight short problems that build the string vocabulary every later set depends on. **Attempt each one before opening the solution** — reading a solution feels like learning and is not. Each comes with a complexity note and the mistake people actually make, which is usually more useful than the answer.",

  objectives: [
    "Reverse, slice and index strings without an off-by-one",
    "Normalise text so a comparison means what you intended",
    "Choose between a loop, a comprehension and a built-in for the same job",
    "State the time and space cost of a string operation before writing it",
    "Recognise when concatenation in a loop is the bug"
  ],

  prerequisites: ["2.2", "2.1"],

  blocks: [

    { t: "h2", n: "01", text: "The toolkit", id: "toolkit",
      sub: "Everything in this set is built from these. Read it once, then start." },

    { t: "code", lang: "python", title: "what you need in scope", code: `
s = "  Hello, World!  "

# Boundaries
s.strip(), s.lstrip(), s.rstrip()      # whitespace by default, or a char set
s.strip(".,!?")                        # strips ANY of those characters

# Case
s.lower(), s.upper(), s.casefold()     # casefold is the aggressive one
s.title(), s.capitalize()

# Testing
s.startswith("He"), s.endswith("!")
"World" in s                           # substring test -- O(n*m) worst case
s.isdigit(), s.isalpha(), s.isalnum(), s.isspace()

# Slicing -- start, stop, step. stop is EXCLUSIVE.
s[2:7]                                 # characters 2,3,4,5,6
s[::-1]                                # reversed
s[::2]                                 # every second character

# Building
"".join(parts)                         # O(n). Concatenating in a loop is O(n^2)
",".join(["a", "b"])
`,
      caption: "**Strings are immutable.** Every method here returns a new string and changes nothing — which is why `s.strip()` on its own line does nothing at all, and why building a string by repeated `+=` is quadratic."
    },

    { t: "callout", kind: "note", title: "How to use this set", body: [
      { t: "ul", items: [
        "**Write the solution before opening the panel.** Even a wrong attempt makes the solution stick; reading first does not.",
        "**Say the complexity out loud** before you look. Getting it wrong is the useful part.",
        "**Read the notes even when you got it right** — they cover the edge case your version probably missed."
      ]}
    ]},

    { t: "h2", n: "02", text: "Warm-ups", id: "warmups" },

    { t: "exercise",
      kind: "Problem 1", title: "Reverse the words, not the letters",
      difficulty: "foundation", minutes: 6,
      body: [
        { t: "p", text: "Given a sentence, return it with the word order reversed but each word intact." },
        { t: "code", lang: "python", numbered: false, code: `
reverse_words("the quick brown fox")   ->  "fox brown quick the"
reverse_words("  hello   world  ")     ->  "world hello"
reverse_words("")                      ->  ""` }
      ],
      requirements: [
        "Collapse runs of whitespace — the output has single spaces.",
        "Leading and trailing whitespace must not appear in the output.",
        "Empty input returns an empty string."
      ],
      hint: "`split()` with no argument does more than `split(\" \")` does. Compare what each returns for `\"  a   b  \"`.",
      solution: {
        lang: "python", title: "solution.py",
        code: `def reverse_words(sentence: str) -> str:
    """Reverse word order, normalising whitespace.

    O(n) time, O(n) space -- split allocates the list of words.
    """
    return " ".join(reversed(sentence.split()))


# Equivalent, and equally fine:
#     return " ".join(sentence.split()[::-1])
#
# split()[::-1] builds a second list; reversed() is a lazy iterator that
# join consumes directly. At this size the difference is noise -- but the
# habit matters when the list is a million items.


assert reverse_words("the quick brown fox") == "fox brown quick the"
assert reverse_words("  hello   world  ") == "world hello"
assert reverse_words("") == ""
assert reverse_words("   ") == ""
assert reverse_words("one") == "one"`,
        notes: [
          { t: "p", text: "**`split()` and `split(\" \")` are different functions.** With no argument, `split` treats any run of whitespace as one separator and discards leading and trailing runs. With `\" \"`, it splits on every single space, so `\"  a  b \".split(\" \")` gives `['', '', 'a', '', 'b', '']` — six items, four of them empty." },
          { t: "p", text: "That distinction is the whole problem. Almost every wrong answer here uses `split(\" \")` and then filters out the empties, which works and is three lines longer than the version that never created them." },
          { t: "p", text: "**Complexity: O(n) time and O(n) space.** There is no way to do better — you must read every character, and strings are immutable so the result is a new allocation." }
        ]
      }
    },

    { t: "exercise",
      kind: "Problem 2", title: "Count vowels, properly",
      difficulty: "foundation", minutes: 6,
      body: [
        { t: "p", text: "Count the vowels in a string, case-insensitively." },
        { t: "code", lang: "python", numbered: false, code: `
count_vowels("Hello World")   ->  3
count_vowels("XYZ")           ->  0
count_vowels("AEIOUaeiou")    ->  10` }
      ],
      requirements: [
        "Case-insensitive.",
        "Do not build an intermediate list of the vowels.",
        "State the complexity of your membership test."
      ],
      hint: "What is the cost of `c in \"aeiou\"` versus `c in {\"a\",\"e\",\"i\",\"o\",\"u\"}`? At this size it does not matter — but say why.",
      solution: {
        lang: "python", title: "solution.py",
        code: `VOWELS = frozenset("aeiou")


def count_vowels(text: str) -> int:
    """O(n) time, O(1) space.

    A generator expression inside sum() -- no intermediate list is built,
    so memory stays constant however long the string is.
    """
    return sum(1 for c in text.lower() if c in VOWELS)


# What NOT to write, and why:
#
#   len([c for c in text.lower() if c in VOWELS])
#       Builds a list of every vowel just to measure it. O(n) space for
#       a number you could have counted.
#
#   sum(text.lower().count(v) for v in "aeiou")
#       Five full passes over the string instead of one. Correct, and
#       five times the work.


assert count_vowels("Hello World") == 3
assert count_vowels("XYZ") == 0
assert count_vowels("AEIOUaeiou") == 10
assert count_vowels("") == 0`,
        notes: [
          { t: "p", text: "**`frozenset` versus a string for the membership test.** `c in \"aeiou\"` scans up to five characters; `c in frozenset(...)` is a single hash lookup. With five items the string is probably faster in practice — the point is knowing which is O(k) and which is O(1), because the same choice with 5,000 items is not close." },
          { t: "p", text: "**Defining `VOWELS` at module level matters more than the type.** Inside the function it would be rebuilt on every call, which is the actual cost people miss." },
          { t: "p", text: "**`sum(1 for ...)` rather than `len([...])`** is the habit worth forming: a generator counts without materialising, so it works unchanged on a million-character string or a stream." }
        ]
      }
    },

    { t: "exercise",
      kind: "Problem 3", title: "Truncate with an ellipsis",
      difficulty: "foundation", minutes: 8,
      body: [
        { t: "p", text: "Shorten a string to at most `limit` characters, appending `…` if anything was cut. The **result** must never exceed `limit`." },
        { t: "code", lang: "python", numbered: false, code: `
truncate("Hello, World!", 8)   ->  "Hello, …"      (8 chars, not 9)
truncate("Short", 10)          ->  "Short"
truncate("Hello", 5)           ->  "Hello"          (exactly at the limit)
truncate("Hello", 1)           ->  "…"` }
      ],
      requirements: [
        "The returned string is never longer than `limit`.",
        "No ellipsis when nothing was removed.",
        "Handle `limit` of 1, and of 0.",
        "Do not leave a trailing space before the ellipsis."
      ],
      hint: "The off-by-one is the whole problem: the ellipsis is a character too. Work out the budget for real text first.",
      solution: {
        lang: "python", title: "solution.py",
        code: `ELLIPSIS = "\\u2026"          # a single character, not three dots


def truncate(text: str, limit: int) -> str:
    """O(n) time, O(n) space.

    The rule that catches everyone: the ellipsis counts toward the limit,
    so the text budget is limit - 1, not limit.
    """
    if limit <= 0:
        return ""
    if len(text) <= limit:
        return text                    # nothing removed -> no ellipsis
    return text[: limit - 1].rstrip() + ELLIPSIS


assert truncate("Hello, World!", 8) == "Hello,\\u2026"    # rstrip removed the space
assert len(truncate("Hello, World!", 8)) <= 8
assert truncate("Short", 10) == "Short"
assert truncate("Hello", 5) == "Hello"                  # boundary: exactly at
assert truncate("Hello", 4) == "Hel\\u2026"
assert truncate("Hello", 1) == "\\u2026"
assert truncate("Hello", 0) == ""
assert truncate("", 5) == ""`,
        notes: [
          { t: "p", text: "**Three separate off-by-ones live in this problem**, and most first attempts hit at least one: using `limit` instead of `limit - 1` for the text budget; using `<` instead of `<=` in the \"nothing removed\" check, which appends an ellipsis to a string that fits exactly; and forgetting that `limit == 1` leaves no room for any text at all." },
          { t: "p", text: "**`rstrip()` before appending** is the detail that separates a correct answer from a tidy one. `\"Hello, World!\"[:7]` is `\"Hello, \"` — with a trailing space — so without it the result reads `\"Hello, …\"` with an awkward gap." },
          { t: "p", text: "**Use `\\u2026`, not `\"...\"`.** Three full stops are three characters, which breaks the length guarantee and looks wrong next to properly typeset text. The test asserting `len(...) <= 8` is the one that catches it." }
        ]
      }
    },

    { t: "h2", n: "03", text: "Core problems", id: "core" },

    { t: "exercise",
      kind: "Problem 4", title: "Capitalise every word, keeping the rest",
      difficulty: "core", minutes: 8,
      body: [
        { t: "p", text: "Upper-case the first letter of each word and leave every other character exactly as it was. `str.title()` does **not** do this — find out why before writing anything." },
        { t: "code", lang: "python", numbered: false, code: `
capitalise_words("hello world")        ->  "Hello World"
capitalise_words("iPhone and macOS")   ->  "IPhone And MacOS"
capitalise_words("it's a test")        ->  "It's A Test"

# For comparison:
"it's a test".title()                  ->  "It'S A Test"      wrong
"iPhone".title()                       ->  "Iphone"           wrong` }
      ],
      requirements: [
        "Characters after the first letter of a word keep their original case.",
        "An apostrophe does not start a new word.",
        "Multiple spaces between words are preserved.",
        "Explain what `str.title()` gets wrong."
      ],
      hint: "`split(\" \")` preserves the empty strings that come from runs of spaces, which is exactly what you want here — the opposite of Problem 1.",
      solution: {
        lang: "python", title: "solution.py",
        code: `def capitalise_words(text: str) -> str:
    """O(n) time, O(n) space.

    Note split(" ") rather than split(): here the runs of whitespace must
    SURVIVE, so the empty strings between consecutive spaces are wanted.
    That is the opposite of Problem 1, and it is why the two forms exist.
    """
    return " ".join(
        word[:1].upper() + word[1:] if word else word
        for word in text.split(" ")
    )


# WHY str.title() IS WRONG
#
# title() capitalises after ANY non-alphabetic character, and lower-cases
# everything else in the word:
#
#     "it's a test".title()  ->  "It'S A Test"     apostrophe starts a word
#     "iPhone".title()       ->  "Iphone"          existing case destroyed
#     "3rd place".title()    ->  "3Rd Place"       digit starts a word
#
# It is right for exactly one use -- a plain lower-case sentence with no
# punctuation inside words -- which is rarely the input you have.


assert capitalise_words("hello world") == "Hello World"
assert capitalise_words("iPhone and macOS") == "IPhone And MacOS"
assert capitalise_words("it's a test") == "It's A Test"
assert capitalise_words("a  b") == "A  B"          # double space survives
assert capitalise_words("") == ""
assert capitalise_words("3rd place") == "3rd Place"`,
        notes: [
          { t: "p", text: "**`word[:1]` rather than `word[0]`** is the small move that removes the empty-string branch entirely. Slicing an empty string gives `\"\"`; indexing it raises `IndexError`. The `if word else word` guard in the solution is therefore belt and braces — `\"\"[:1].upper() + \"\"[1:]` is already `\"\"`." },
          { t: "p", text: "**The `split(\" \")` versus `split()` choice reverses between problems 1 and 4**, and that is the point of putting them in the same set. Problem 1 wanted whitespace collapsed; this one must preserve it exactly. Same function, opposite requirement." },
          { t: "p", text: "**`title()` is one of the most misused methods in the standard library.** It lower-cases the rest of each word and treats every non-alphabetic character as a word boundary, so it mangles apostrophes, digits and any deliberate internal capital. `capwords` from the `string` module has the same apostrophe problem." }
        ]
      }
    },

    { t: "exercise",
      kind: "Problem 5", title: "Longest common prefix",
      difficulty: "core", minutes: 10,
      body: [
        { t: "p", text: "Given a list of strings, return the longest prefix they all share." },
        { t: "code", lang: "python", numbered: false, code: `
common_prefix(["flower", "flow", "flight"])   ->  "fl"
common_prefix(["dog", "racecar", "car"])      ->  ""
common_prefix(["same", "same"])               ->  "same"
common_prefix([])                             ->  ""
common_prefix(["single"])                     ->  "single"` }
      ],
      requirements: [
        "Empty list returns an empty string, not an error.",
        "A single-element list returns that element.",
        "Do not compare every pair of strings.",
        "State your complexity in terms of both the number of strings and their length."
      ],
      hint: "The answer can never be longer than the shortest string — and it can never be longer than the prefix shared by the two most different strings. Sorting gives you those two for free.",
      solution: {
        lang: "python", title: "solution.py",
        code: `from collections.abc import Sequence


def common_prefix(words: Sequence[str]) -> str:
    """O(n * m) time, O(1) extra space, where n is the number of words
    and m is the length of the shortest one.

    Scan character by character across all words at once, stopping at the
    first disagreement. Pairwise comparison would be O(n^2 * m) and is
    the usual first attempt.
    """
    if not words:
        return ""

    shortest = min(words, key=len)       # the answer cannot exceed this

    for i, char in enumerate(shortest):
        for word in words:
            if word[i] != char:
                return shortest[:i]
    return shortest


# A neater variant, same complexity, worth knowing:
#
#     def common_prefix(words):
#         if not words:
#             return ""
#         lo, hi = min(words), max(words)      # lexicographic extremes
#         for i, c in enumerate(lo):
#             if c != hi[i]:
#                 return lo[:i]
#         return lo
#
# If the lexicographically smallest and largest strings agree on a
# prefix, every string between them does too -- so two comparisons
# settle it. min() and max() are O(n * m); the scan is O(m).


assert common_prefix(["flower", "flow", "flight"]) == "fl"
assert common_prefix(["dog", "racecar", "car"]) == ""
assert common_prefix(["same", "same"]) == "same"
assert common_prefix([]) == ""
assert common_prefix(["single"]) == "single"
assert common_prefix(["a", ""]) == ""              # empty string in the list
assert common_prefix(["abc", "abcd"]) == "abc"     # one is a prefix of another`,
        notes: [
          { t: "p", text: "**Bounding the answer by the shortest string is what makes the loop safe.** Iterating over `words[0]` instead risks an `IndexError` the moment a later word is shorter — and that is the most common failure on this problem, usually caught only by the `[\"abc\", \"abcd\"]` case." },
          { t: "p", text: "**The min/max variant is worth understanding even though it is not faster.** Lexicographic ordering means every string sorts between the smallest and the largest, so a prefix shared by those two is shared by all of them. It is the kind of observation that turns a nested loop into two comparisons, and it comes up again in interval problems." },
          { t: "p", text: "**Complexity is O(n·m), not O(n²·m).** Comparing every pair is the intuitive approach and does n² work to learn what one pass already knows. Saying which one you wrote, and why, is most of what an interviewer is listening for here." }
        ]
      }
    },

    { t: "exercise",
      kind: "Problem 6", title: "Compress a run-length string",
      difficulty: "core", minutes: 12,
      body: [
        { t: "p", text: "Replace runs of the same character with the character followed by its count — but only return the compressed form if it is actually shorter." },
        { t: "code", lang: "python", numbered: false, code: `
compress("aaabbc")     ->  "a3b2c1"
compress("abc")        ->  "abc"        (compression would be longer)
compress("aabb")       ->  "aabb"       (same length -- keep the original)
compress("")           ->  ""
compress("aaaaaaaaaaa")  ->  "a11"      (counts above 9 work)` }
      ],
      requirements: [
        "Return the original when compression does not make it shorter.",
        "Handle counts of ten or more.",
        "Build the result in O(n), not by repeated concatenation.",
        "Handle the empty string and a single character."
      ],
      hint: "The last run needs emitting after the loop ends — that is the line people forget. And `+=` on a string inside a loop is the performance bug this problem exists to teach.",
      solution: {
        lang: "python", title: "solution.py",
        code: `def compress(text: str) -> str:
    """O(n) time, O(n) space.

    Build into a LIST and join once. Repeated "result += ..." on a string
    is O(n^2): strings are immutable, so every += copies everything
    accumulated so far.
    """
    if not text:
        return text

    parts: list[str] = []
    current = text[0]
    count = 1

    for char in text[1:]:
        if char == current:
            count += 1
        else:
            parts.append(current + str(count))
            current, count = char, 1

    parts.append(current + str(count))     # THE line people forget:
                                           # the final run never hits the else
    compressed = "".join(parts)
    return compressed if len(compressed) < len(text) else text


# The same thing with itertools.groupby, once you have met it:
#
#     from itertools import groupby
#     compressed = "".join(c + str(len(list(g))) for c, g in groupby(text))
#     return compressed if len(compressed) < len(text) else text
#
# groupby groups CONSECUTIVE runs, which is exactly this problem -- and
# is why it needs sorted input when you want to group by value instead.


assert compress("aaabbc") == "a3b2c1"
assert compress("abc") == "abc"
assert compress("aabb") == "aabb"                  # equal length -> original
assert compress("") == ""
assert compress("a") == "a"
assert compress("aaaaaaaaaaa") == "a11"            # two-digit count
assert compress("aab") == "aab"                    # 3 chars -> 4, keep original`,
        notes: [
          { t: "p", text: "**The forgotten final run is the classic bug here.** The `else` branch only fires when the character changes, so the last run is never emitted inside the loop. Every solution needs one append after it, and the `\"a\"` test case is what catches its absence." },
          { t: "p", text: "**`result += part` in a loop is quadratic.** Strings are immutable, so each `+=` allocates a new string and copies everything so far — 1 + 2 + 3 + … + n character copies. Appending to a list and joining once is O(n), and the difference is measurable well before a string gets large." },
          { t: "p", text: "**`len(compressed) < len(text)`, not `<=`.** Equal length means compression bought nothing, and returning the compressed form would make the output less readable for no gain. The `\"aabb\"` case exists to pin that boundary." },
          { t: "callout", kind: "insight", title: "Why the counts are always emitted", body: [
            { t: "p", text: "A common variation omits the count when it is 1, giving `\"a3b2c\"`. That version is shorter but ambiguous: `\"a3b2c\"` could decompress to `aaabbc` or to `a3b2c` if any input contained digits." },
            { t: "p", text: "Always emitting the count keeps the encoding reversible. Whenever a compression scheme has a special case, ask what happens when the input contains the special case." }
          ]}
        ]
      }
    },

    { t: "h2", n: "04", text: "Stretch", id: "stretch" },

    { t: "exercise",
      kind: "Problem 7", title: "Word wrap to a column width",
      difficulty: "advanced", minutes: 14,
      body: [
        { t: "p", text: "Break a paragraph into lines of at most `width` characters, breaking only at spaces. Words longer than `width` go on their own line, uncut." },
        { t: "code", lang: "python", numbered: false, code: `
wrap("the quick brown fox jumps", 10)
->  ["the quick", "brown fox", "jumps"]

wrap("a bb ccc", 3)
->  ["a", "bb", "ccc"]

wrap("supercalifragilistic is long", 8)
->  ["supercalifragilistic", "is long"]` }
      ],
      requirements: [
        "No line exceeds `width` unless it is a single over-long word.",
        "No line has leading or trailing spaces.",
        "Empty input returns an empty list.",
        "One pass over the words — do not repeatedly measure a growing string."
      ],
      hint: "Track the current line as a list of words plus a running length. The `+ 1` for the joining space is where the off-by-one lives.",
      solution: {
        lang: "python", title: "solution.py",
        code: `def wrap(text: str, width: int) -> list[str]:
    """O(n) time, O(n) space.

    Track the current line's length as an integer rather than joining and
    measuring each time -- that would make it O(n * line length).
    """
    if width <= 0:
        raise ValueError("width must be positive")

    lines: list[str] = []
    line: list[str] = []
    length = 0

    for word in text.split():
        # The " + 1" is the space that would join this word to the line.
        # It applies only when the line is not empty, which is the
        # off-by-one this problem is really about.
        needed = len(word) if not line else length + 1 + len(word)

        if line and needed > width:
            lines.append(" ".join(line))
            line, length = [word], len(word)
        else:
            line.append(word)
            length = needed

    if line:                          # the final line, again
        lines.append(" ".join(line))
    return lines


assert wrap("the quick brown fox jumps", 10) == ["the quick", "brown fox", "jumps"]
assert wrap("a bb ccc", 3) == ["a", "bb", "ccc"]
assert wrap("supercalifragilistic is long", 8) == ["supercalifragilistic", "is long"]
assert wrap("", 10) == []
assert wrap("   ", 10) == []
assert wrap("exact fit", 9) == ["exact fit"]      # boundary: exactly width
assert all(len(l) <= 10 or " " not in l for l in wrap(LOREM, 10))`,
        notes: [
          { t: "p", text: "**Tracking `length` as an integer is the requirement that matters.** Joining the line and calling `len()` on each word makes the loop quadratic in line length — correct, and doing work proportional to the square of the answer." },
          { t: "p", text: "**The `if line` guard on the space is the whole off-by-one.** The first word on a line needs no joining space, so its cost is `len(word)`; every later word costs `len(word) + 1`. Getting this wrong produces lines one character over the limit, which passes casual testing and fails the `\"exact fit\"` case." },
          { t: "p", text: "**The over-long word is deliberately allowed to break the rule.** Any other behaviour means either cutting a word mid-character or looping forever, so the honest answer is to emit it on its own line — which is what `textwrap` does too, unless you ask for `break_long_words`." },
          { t: "p", text: "**In production, use `textwrap.wrap`.** It handles hyphenation, indentation, tabs and Unicode width. This problem exists to make the boundary arithmetic explicit, not to replace a standard library module (Lesson 7.8)." }
        ]
      }
    },

    { t: "exercise",
      kind: "Problem 8", title: "Validate a bracket sequence",
      difficulty: "advanced", minutes: 12,
      body: [
        { t: "p", text: "Return `True` if every bracket in the string is closed by the matching type in the correct order. Ignore every other character." },
        { t: "code", lang: "python", numbered: false, code: `
is_balanced("([]{})")        ->  True
is_balanced("f(x[0]) + 1")   ->  True
is_balanced("(]")            ->  False
is_balanced("([)]")          ->  False      (interleaved, not nested)
is_balanced("(")             ->  False
is_balanced(")(")            ->  False` }
      ],
      requirements: [
        "Handle three bracket types.",
        "Non-bracket characters are ignored entirely.",
        "A closing bracket with nothing open is invalid.",
        "Unclosed brackets at the end are invalid.",
        "One pass, O(n)."
      ],
      hint: "This is the canonical stack problem. The two failure modes are a mismatch mid-string and a non-empty stack at the end — and both need checking.",
      solution: {
        lang: "python", title: "solution.py",
        code: `PAIRS = {")": "(", "]": "[", "}": "{"}
OPENERS = frozenset(PAIRS.values())


def is_balanced(text: str) -> bool:
    """O(n) time, O(n) space -- the stack is the space.

    A stack is the right structure because nesting is last-in-first-out:
    the bracket that must close next is always the most recent one opened.
    """
    stack: list[str] = []

    for char in text:
        if char in OPENERS:
            stack.append(char)
        elif char in PAIRS:
            # Two failures at once: nothing open, or the wrong type open.
            if not stack or stack.pop() != PAIRS[char]:
                return False
        # anything else is ignored

    return not stack          # THE second check: leftovers mean unclosed


assert is_balanced("([]{})") is True
assert is_balanced("f(x[0]) + 1") is True
assert is_balanced("(]") is False
assert is_balanced("([)]") is False        # interleaved, not nested
assert is_balanced("(") is False           # unclosed -- caught by "not stack"
assert is_balanced(")(") is False          # closes before it opens
assert is_balanced("") is True             # vacuously balanced
assert is_balanced("no brackets here") is True`,
        notes: [
          { t: "p", text: "**`return not stack` is the line most first attempts miss.** Returning `True` at the end of the loop passes every test with a mismatch and fails only on `\"(\"` — an input people forget to try because it looks too simple to break anything." },
          { t: "p", text: "**`if not stack or stack.pop() != PAIRS[char]` relies on short-circuiting.** If the stack is empty, `pop()` is never called, so there is no `IndexError`. Reversing the two conditions crashes on `\")\"`." },
          { t: "p", text: "**`([)]` is the case that proves you used a stack.** It has equal counts of every bracket type, so any counting-based solution says `True`. Nesting is an ordering property, and only a stack captures ordering." },
          { t: "callout", kind: "insight", title: "Why this problem appears in every interview set", body: [
            { t: "p", text: "It is the smallest problem where the obvious approach — count the brackets — is wrong for a reason that has to be articulated. The interviewer is listening for \"counting loses the order\", not for the code." },
            { t: "p", text: "It also generalises: the same stack shape solves expression evaluation, HTML tag matching, and the monotonic-stack problems in Practice P8.2." }
          ]}
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Where these show up in real work", body: [
      { t: "p", text: "None of these are puzzles invented for interviews. Problem 1 is normalising user-entered search terms. Problem 3 is every table cell and notification preview you have ever seen truncated. Problem 5 is finding the common root of a set of file paths." },
      { t: "p", text: "**Problem 6's lesson is the one that reaches production most often.** Building a string with `+=` in a loop is quadratic, and it appears in report generators, template engines and log formatters constantly — usually discovered when a report that took two seconds for a thousand rows takes four minutes for ten thousand." },
      { t: "p", text: "**Problem 8 is the shape of every parser.** Matching brackets, tags, quotes or scopes is the same stack, and recognising it is worth more than any individual solution here." },
      { t: "p", text: "The drills exist to make the vocabulary automatic. When a real problem arrives, the useful thing is not remembering these answers — it is that `split()` versus `split(\" \")`, the final-run append and the `+=` trap are already decided, so your attention is free for the part that is actually novel." }
    ]}
  ],

  takeaways: [
    "**`split()` collapses whitespace runs and discards leading and trailing ones; `split(\" \")` does neither.** Problems 1 and 4 need opposite behaviour, and that is why both forms exist.",
    "**Strings are immutable**, so every method returns a new string — `s.strip()` on its own line changes nothing.",
    "**`result += part` in a loop is O(n²).** Append to a list and `join` once.",
    "**`sum(1 for ...)` counts without materialising**, where `len([...])` builds a list to measure it.",
    "**`str.title()` lower-cases the rest of each word and treats punctuation as a boundary**, so it mangles apostrophes, digits and internal capitals.",
    "**Slice rather than index when the string may be empty**: `word[:1]` gives `\"\"`, `word[0]` raises.",
    "**A loop that emits on change must emit once more after it ends** — the final run, the final line, the final batch.",
    "**Bound a scan by the shortest input**, not the first, or a shorter later element causes an `IndexError`.",
    "**Counting loses ordering.** `([)]` has balanced counts and invalid nesting, which is why bracket matching needs a stack.",
    "**Check both stack failure modes**: a mismatch during the scan, and anything left over at the end.",
    "**State complexity in terms of the right variables** — O(n·m) for n strings of length m is a different claim from O(n²).",
    "**Reach for `textwrap`, `str.removeprefix` and the standard library in production.** These drills exist to make the arithmetic explicit, not to replace them."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "What does `\"  a   b  \".split(\" \")` return?",
        options: [
          "`['a', 'b']`",
          "`['', '', 'a', '', '', 'b', '', '']` — splitting on a single space keeps every empty field",
          "`['  a', '  b  ']`",
          "It raises, because the separator appears consecutively"
        ],
        answer: 1,
        why: "With an explicit separator, `split` cuts at every occurrence and preserves the empty strings between consecutive separators and at the ends. With no argument, it treats any run of whitespace as one separator and discards leading and trailing runs, giving `['a', 'b']`. Choosing the wrong one is the single most common string bug in this set."
      },
      {
        stem: "Why is building a string with `result += part` inside a loop a problem?",
        options: [
          "It uses more memory than a list but the same time",
          "Strings are immutable, so every `+=` allocates a new string and copies everything accumulated so far — O(n²) total",
          "It is only a problem for strings longer than 64KB",
          "It prevents the result from being interned"
        ],
        answer: 1,
        why: "Each concatenation copies the whole accumulated result, so the total work is 1 + 2 + 3 + … + n character copies. Appending to a list and calling `\"\".join(parts)` once is O(n), because join computes the final size and allocates once. This is the shape behind report generators that are fine on test data and unusable in production."
      },
      {
        stem: "`is_balanced(\"([)]\")` must return `False`. What does that case prove about your solution?",
        options: [
          "That it handles empty input",
          "That it tracks ordering — the bracket counts are balanced, so any counting-based approach returns `True`",
          "That it ignores non-bracket characters",
          "That it handles more than one bracket type"
        ],
        answer: 1,
        why: "`([)]` has one of each bracket, opened and closed, so counting says it is fine. Nesting is a property of order — the most recently opened bracket must close first — and only a stack captures that. This is the case an interviewer reaches for to find out whether you understood the problem or pattern-matched it."
      },
      {
        stem: "In `truncate(text, limit)`, why is the text budget `limit - 1` rather than `limit`?",
        options: [
          "Python strings are zero-indexed",
          "The ellipsis is itself a character and counts toward the limit, so the result would otherwise be one character too long",
          "`rstrip()` may remove a character",
          "It reserves space for a null terminator"
        ],
        answer: 1,
        why: "The guarantee is about the returned string, and the returned string includes the ellipsis. Using `limit` for the text produces `limit + 1` characters — a bug that passes every eyeball test and fails an assertion on `len()`. The related boundary is `len(text) <= limit`, which must use `<=` so a string that fits exactly gets no ellipsis."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "These come up verbatim. Answer out loud before opening.",
    questions: [
      {
        level: "core",
        q: "Reverse the words in a sentence.",
        strong: "`\" \".join(reversed(s.split()))`. `split()` with no argument collapses whitespace runs and strips the ends, which is almost always what the question wants — and worth stating, because `split(\" \")` behaves differently.",
        answer: [
          { t: "p", text: "Naming the `split()` versus `split(\" \")` distinction unprompted is what turns a one-line answer into a signal — it shows you know why the one-liner is correct rather than that you memorised it." },
          { t: "p", text: "State the complexity without being asked: O(n) time and O(n) space, and there is no better bound since strings are immutable and every character must be read." },
          { t: "p", text: "If asked to do it in place, the honest answer is that Python strings cannot be reversed in place at all — the in-place version is a C or Java question, and saying so is better than pretending." }
        ]
      },
      {
        level: "core",
        q: "How would you build a large string efficiently?",
        strong: "Append the pieces to a list and `\"\".join(parts)` once. Repeated `+=` is O(n²), because strings are immutable and each concatenation copies everything so far.",
        answer: [
          { t: "p", text: "The mechanism matters more than the rule: join computes the total length first and allocates once, where `+=` allocates n times and copies a growing prefix each time." },
          { t: "p", text: "The honest caveat shows depth — CPython has an optimisation that mutates a string in place when the refcount is exactly one, so `+=` in a tight loop is sometimes fast. It is an implementation detail, not something to rely on, and it disappears the moment anything else holds a reference." },
          { t: "p", text: "`io.StringIO` is the third option, and the right one when the pieces are produced by something that wants a file-like object to write to." }
        ]
      },
      {
        level: "core",
        q: "Check whether a string of brackets is balanced.",
        strong: "A stack: push openers, and on a closer check the stack is non-empty and its top matches. Return `not stack` at the end so unclosed brackets fail.",
        answer: [
          { t: "p", text: "Saying why counting fails — `([)]` has balanced counts and invalid nesting — is the part being tested. The code is secondary." },
          { t: "p", text: "Mentioning both failure modes shows completeness: a mismatch during the scan, and leftovers at the end. Most wrong answers handle only the first." },
          { t: "p", text: "The natural follow-up is generalising to HTML tags or expression evaluation, and being ready for it turns a five-minute question into a conversation about parsing." }
        ]
      }
    ]
  }
});
