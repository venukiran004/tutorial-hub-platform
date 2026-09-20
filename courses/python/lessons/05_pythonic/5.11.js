/* ============================================================================
   LESSON 5.11 — Regular Expressions, Used Responsibly
   ========================================================================= */
EC.receiveLesson({
  id: "5.11",

  lede: "A regex is a tiny program with no names, no tests and no stack trace. It is the right tool for a narrow class of problems — **matching a pattern in flat text** — and the wrong tool for most of what people reach for it with. This lesson covers the syntax worth memorising, the flags that stop you nesting quantifiers, and the failure mode that has taken down production systems.",

  objectives: [
    "Name three problems where a string method or a parser beats a regex outright",
    "Read and write the syntax that covers 95% of real patterns",
    "Use named groups and verbose mode to make a pattern reviewable",
    "Explain catastrophic backtracking and recognise the shapes that cause it",
    "Choose between `match`, `search`, `fullmatch`, `finditer` and `sub`"
  ],

  prerequisites: ["2.2", "5.1"],

  blocks: [

    { t: "h2", n: "01", text: "First, do not use a regex", id: "dont",
      sub: "The most valuable regex skill is recognising when something else is correct" },

    {"kind": "steps", "title": "Before reaching for a regex", "caption": "Most string questions have a method that is faster, clearer and impossible to get catastrophically wrong. The regex is the fourth option, not the first.", "items": [{"label": "str methods", "desc": "startswith, endswith, split, partition, strip, isdigit", "tone": "good"}, {"label": "in and find", "desc": "substring tests and positions", "tone": "good"}, {"label": "a real parser", "desc": "json, csv, urllib.parse, email — structured formats have libraries", "tone": "accent"}, {"label": "re — a compiled, commented, tested pattern", "desc": "when the shape is genuinely a pattern", "tone": "warn"}], "t": "diagram", "id": "dg-5_11-01-0"},



    { t: "table",
      head: ["You want to", "Reach for", "Not"],
      rows: [
        ["Check a prefix or suffix", "`s.startswith(\"http\")`, `s.endswith(\".csv\")`", "`re.match(r\"^http\", s)`"],
        ["Split on a fixed delimiter", "`s.split(\",\")`", "`re.split(r\",\", s)`"],
        ["Replace a fixed substring", "`s.replace(\"old\", \"new\")`", "`re.sub(\"old\", \"new\", s)`"],
        ["Pull apart a URL", "`urllib.parse.urlparse`", "A 200-character pattern"],
        ["Read CSV", "`csv.reader`", "Anything — quoted fields with embedded commas defeat every regex"],
        ["Parse HTML or XML", "`lxml`, `BeautifulSoup`", "A regex, ever"],
        ["Parse JSON, TOML, YAML", "The matching parser", "A regex"],
        ["Validate an email address", "Check for `@`, then send a confirmation", "RFC 5322 as a pattern"]
      ],
      caption: "The str methods are faster as well as clearer — no pattern compilation, no backtracking engine. **The regex is only ahead when the shape genuinely varies.**"
    },

    { t: "callout", kind: "trap", title: "Email validation is the canonical mistake", body: [
      { t: "p", text: "The \"correct\" RFC 5322 regex is roughly 6,000 characters long. Nobody reviews it, nobody tests it, and it still rejects valid addresses while accepting deliverable-looking ones that bounce." },
      { t: "code", lang: "python", title: "what to do instead", numbered: false, code: `
def looks_like_email(value: str) -> bool:
    """Cheap sanity check. NOT validation -- that is what the
    confirmation email is for."""
    local, sep, domain = value.rpartition("@")
    return bool(local and sep and "." in domain and " " not in value)`},
      { t: "p", text: "**Only one thing proves an address is valid: sending to it.** A syntactic check exists to catch typos before the user leaves the form, so make it permissive, then confirm out of band. A stricter pattern rejects real customers and still cannot tell you the mailbox exists." }
    ]},

    { t: "h2", n: "02", text: "The syntax that covers 95%", id: "syntax" },

    { t: "table",
      head: ["Pattern", "Matches", "Note"],
      rows: [
        ["`.`", "Any character except newline", "`re.DOTALL` includes newlines"],
        ["`\\d` `\\w` `\\s`", "Digit, word character, whitespace", "Capitals negate: `\\D` `\\W` `\\S`"],
        ["`[abc]` `[^abc]`", "One of; none of", "Inside a class, most metacharacters are literal"],
        ["`*` `+` `?`", "0+, 1+, 0 or 1", "Greedy — they take as much as possible"],
        ["`{2,5}`", "Between 2 and 5", "`{2,}` is 2 or more"],
        ["`*?` `+?` `??`", "The lazy versions", "Take as little as possible"],
        ["`^` `$`", "Start and end of string", "Of each **line** under `re.MULTILINE`"],
        ["`\\b`", "Word boundary", "The fix for matching `cat` inside `category`"],
        ["`(...)`", "Capture group", "Numbered from 1"],
        ["`(?:...)`", "Group without capturing", "Use it whenever you only need the grouping"],
        ["`(?P<name>...)`", "Named group", "Read it back with `m[\"name\"]`"],
        ["`a|b`", "Alternation", "Tries left to right, first match wins"]
      ]
    },

    { t: "code", lang: "python", title: "greedy versus lazy is the one that bites", code: `
import re

html = "<b>bold</b> and <i>italic</i>"

# Greedy: .* takes everything it can, then backs off to find >
print(re.findall(r"<(.*)>", html))

# Lazy: .*? takes as little as possible
print(re.findall(r"<(.*?)>", html))

# Better still: say what you mean -- "not a closing bracket"
print(re.findall(r"<([^>]*)>", html))
`,
      out: `['b>bold</b> and <i>italic</i']
['b', '/b', 'i', '/i']
['b', '/b', 'i', '/i']`,
      caption: "`[^>]*` is both clearer and faster than `.*?` — it cannot overrun, so the engine never has to backtrack. **Prefer a negated character class to a lazy quantifier** wherever you can express the stopping condition."
    },

    { t: "h2", n: "03", text: "Making a pattern reviewable", id: "reviewable" },

    { t: "ladder",
      title: "Parsing a log line",
      rungs: [
        { level: "bad", label: "Positional groups, no comments",
          why: "`m.group(4)` tells a reviewer nothing. Adding a field at the front renumbers everything below it, silently. And this will be pasted into a code review as one unreadable line.",
          code: `import re

m = re.match(r"(\\d{4}-\\d{2}-\\d{2}) (\\d{2}:\\d{2}:\\d{2}) (\\w+) \\[(\\w+)\\] (.*)", line)
if m:
    date, time, level, service, message = m.groups()` },
        { level: "ok", label: "Named groups",
          why: "Fields are named, so reordering the pattern cannot break the reader, and `m[\"level\"]` documents itself. Still a single dense line nobody will check character by character.",
          code: `PATTERN = re.compile(
    r"(?P<date>\\d{4}-\\d{2}-\\d{2}) (?P<time>\\d{2}:\\d{2}:\\d{2}) "
    r"(?P<level>\\w+) \\[(?P<service>\\w+)\\] (?P<message>.*)"
)

m = PATTERN.match(line)
if m:
    level = m["level"]` },
        { level: "best", label: "Verbose mode, one field per line",
          why: "Every component sits on its own line with a comment. A reviewer can check the timestamp rule without reading the message rule, and a diff touching one field shows one changed line.",
          code: `PATTERN = re.compile(
    r"""
    (?P<timestamp> \\d{4}-\\d{2}-\\d{2} [ ] \\d{2}:\\d{2}:\\d{2} )  # ISO-ish
    \\s+
    (?P<level>     DEBUG|INFO|WARNING|ERROR|CRITICAL )            # closed set
    \\s+
    \\[ (?P<service> [\\w-]+ ) \\]                                  # in brackets
    \\s+
    (?P<message>   .* )                                           # rest of line
    """,
    re.VERBOSE,
)`,
          note: "Under `re.VERBOSE`, unescaped whitespace and `#` comments are ignored — so a literal space must be written `[ ]` or `\\s`. That one rule is the entire cost of readable patterns." }
      ]
    },

    { t: "code", lang: "python", title: "the five entry points", code: `
import re

text = "order 42 shipped, order 43 pending"

print(re.match(r"order", text))                 # anchored at position 0
print(re.search(r"\\d+", text).group())          # first match anywhere
print(re.fullmatch(r"order.*", text) is None)   # must consume the WHOLE string
print(re.findall(r"order (\\d+)", text))         # all matches, as a list
print([m["id"] for m in re.finditer(r"order (?P<id>\\d+)", text)])
`,
      out: `<re.Match object; span=(0, 5), match='order'>
42
False
['42', '43']
['42', '43']`,
      caption: "**`match` is anchored at the start but not the end** — the most common misunderstanding in the module. Use `fullmatch` when the whole string must conform, which is almost always what validation means."
    },

    { t: "callout", kind: "insight", title: "`sub` takes a function, not just a string", body: [
      { t: "code", lang: "python", title: "redacting with logic", numbered: false, code: `
import re

CARD = re.compile(r"\\b(?:\\d[ -]?){13,19}\\b")

def mask(m: re.Match) -> str:
    digits = re.sub(r"\\D", "", m.group())
    return "*" * (len(digits) - 4) + digits[-4:]

print(CARD.sub(mask, "paid with 4111 1111 1111 1111 today"))`,
        out: `paid with ************1111 today`},
      { t: "p", text: "The callable receives the `Match` object, so the replacement can depend on what matched. This removes the usual reason people write a loop around `finditer` and rebuild the string by hand." },
      { t: "p", text: "`re.sub` also supports backreferences in the replacement string — `r\"\\g<name>\"` — which covers the simpler reordering cases without a function." }
    ]},

    { t: "h2", n: "04", text: "Catastrophic backtracking", id: "redos" },

    {"kind": "tree", "title": "Catastrophic backtracking", "caption": "(a+)+ against 'aaaa…b' tries every way of splitting the a's between the inner and outer groups before failing — 2ⁿ attempts. Possessive quantifiers, atomic groups or a rewritten pattern remove the ambiguity.", "root": {"label": "(a+)+ on 'aaab'", "tone": "crit", "children": [{"label": "(aaa)", "children": [{"label": "fail at b", "tone": "warn"}]}, {"label": "(aa)(a)", "children": [{"label": "fail at b", "tone": "warn"}]}, {"label": "(a)(aa)", "children": [{"label": "fail", "tone": "warn"}]}, {"label": "(a)(a)(a)", "children": [{"label": "fail", "tone": "warn"}]}]}, "t": "diagram", "id": "dg-5_11-04-1"},



    { t: "p", text: "Python's `re` is a **backtracking** engine. When a match fails, it retreats to the last choice point and tries the next alternative. For most patterns that costs a few extra steps. For a few shapes it costs an exponential number, and a 40-character input hangs a CPU core for minutes." },

    { t: "viz",
      title: "Why a nested quantifier explodes",
      caption: "Against 'aaaa!', the inner + and the outer + can split the four a's in many ways, and every split must be tried before the engine concludes the pattern cannot match. Each extra 'a' doubles the work.",
      svg: `<svg viewBox="0 0 900 300" role="img" aria-label="Diagram showing the number of ways a nested quantifier can partition a string, doubling with each additional character">
  <text x="20" y="26" class="s-label">PATTERN</text>
  <text x="120" y="26" class="s-mono" style="font-size:12px;fill:var(--crit)">(a+)+$</text>
  <text x="240" y="26" class="s-sub">— an outer quantifier over an already-quantified group</text>

  <text x="20" y="62" class="s-label">INPUT</text>
  <text x="120" y="62" class="s-mono" style="font-size:12px">aaaa!</text>
  <text x="240" y="62" class="s-sub">— cannot match, because $ never meets the '!'</text>

  <line x1="20" y1="82" x2="880" y2="82" class="s-stroke" stroke-width="1"/>

  <text x="20" y="112" class="s-sub">The engine must try every way of splitting the a's between the groups:</text>

  <g class="s-mono" style="font-size:11px">
    <rect x="20" y="126" width="180" height="26" rx="5" class="s-fill s-stroke" stroke-width="1"/>
    <text x="34" y="144">(aaaa)</text>
    <rect x="212" y="126" width="180" height="26" rx="5" class="s-fill s-stroke" stroke-width="1"/>
    <text x="226" y="144">(aaa)(a)</text>
    <rect x="404" y="126" width="180" height="26" rx="5" class="s-fill s-stroke" stroke-width="1"/>
    <text x="418" y="144">(aa)(aa)</text>
    <rect x="596" y="126" width="180" height="26" rx="5" class="s-fill s-stroke" stroke-width="1"/>
    <text x="610" y="144">(a)(aaa)</text>

    <rect x="20" y="158" width="180" height="26" rx="5" class="s-fill s-stroke" stroke-width="1"/>
    <text x="34" y="176">(aa)(a)(a)</text>
    <rect x="212" y="158" width="180" height="26" rx="5" class="s-fill s-stroke" stroke-width="1"/>
    <text x="226" y="176">(a)(aa)(a)</text>
    <rect x="404" y="158" width="180" height="26" rx="5" class="s-fill s-stroke" stroke-width="1"/>
    <text x="418" y="176">(a)(a)(aa)</text>
    <rect x="596" y="158" width="180" height="26" rx="5" class="s-fill s-stroke" stroke-width="1"/>
    <text x="610" y="176">(a)(a)(a)(a)</text>
  </g>

  <text x="20" y="212" class="s-sub">2^(n-1) partitions for n characters — and every one of them fails at the '!'</text>

  <rect x="20" y="228" width="270" height="56" rx="8" style="fill:none;stroke:var(--border-strong)" stroke-width="1.2"/>
  <text x="36" y="250" class="s-mono" style="font-size:11px">n = 20</text>
  <text x="150" y="250" class="s-mono" style="font-size:11px">about 0.5 M steps</text>
  <text x="36" y="272" class="s-mono" style="font-size:11px">n = 30</text>
  <text x="150" y="272" class="s-mono" style="font-size:11px">about 0.5 G steps</text>

  <rect x="310" y="228" width="570" height="56" rx="8" style="fill:none;stroke:var(--good)" stroke-width="1.4"/>
  <text x="330" y="250" class="s-sub" style="fill:var(--good)">THE FIX: remove the ambiguity — a+$ matches exactly the same strings</text>
  <text x="330" y="272" class="s-sub" style="fill:var(--good)">with one way to match each, so a failure is detected in linear time.</text>
</svg>`
    },

    { t: "code", lang: "python", title: "measure it yourself", code: `
import re
import time

evil = re.compile(r"^(a+)+$")

for n in (18, 20, 22, 24):
    start = time.perf_counter()
    evil.match("a" * n + "!")
    print(f"n={n}: {time.perf_counter() - start:.3f}s")
`,
      out: `n=18: 0.081s
n=20: 0.324s
n=22: 1.297s
n=24: 5.190s`,
      caption: "Each pair of characters quadruples the time. At n=40 this runs for roughly a year — from a 41-byte input, on one pattern, in one request handler."
    },

    { t: "callout", kind: "warn", title: "The shapes to look for in review", body: [
      { t: "ul", items: [
        "**A quantifier applied to a quantified group** — `(a+)+`, `(a*)*`, `(\\d+)*`.",
        "**Alternation where the branches can match the same text** — `(a|a)+`, `(\\w|\\d)+`, `(.|\\s)*`.",
        "**Two adjacent open-ended quantifiers** — `\\s*\\s*`, `.*.*`, `[\\w\\s]+[\\w\\s]+`.",
        "**`.*` on either side of something optional** — `.*foo?.*bar`."
      ]},
      { t: "p", text: "All four have the same root cause: **more than one way for the pattern to match the same input**. A failure then forces the engine to try all of them." },
      { t: "code", lang: "python", title: "the usual rewrites", numbered: false, code: `
# ambiguous                    unambiguous
r"^(a+)+$"                     r"^a+$"
r"(\\s|\\t)+"                    r"[ \\t]+"
r"^(\\w+\\s?)*$"                 r"^\\w+(?: \\w+)*$"
r"<(.*?)>"                     r"<([^>]*)>"`},
      { t: "p", text: "**Defences beyond rewriting:** cap the input length before matching (a username field does not need 10,000 characters); never build a pattern from user input; and if you must run untrusted patterns, use the third-party `regex` module, which supports a `timeout` argument — `re` does not." }
    ]},

    { t: "callout", kind: "note", title: "Compilation is cached, but naming is still better", body: [
      { t: "p", text: "`re` keeps an internal cache of the last 512 compiled patterns, so `re.search(pattern, s)` in a loop is not recompiling every iteration. The cache is cleared wholesale when it fills, and it is keyed on the pattern string — so a pattern built by f-string in a loop defeats it entirely." },
      { t: "p", text: "Compile at module level anyway. The gain is not speed: it gives the pattern **a name**, one place to change it, and access to the method forms (`PATTERN.finditer(...)`), which read better than passing the pattern to every call." }
    ]},

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Fix a log parser that hangs",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p", text: "A log-ingestion service parses lines with the pattern below. It ran fine for months, then a service began emitting a line with a long run of spaces and the ingester pinned a CPU at 100% and stopped consuming its queue." },
        { t: "code", lang: "python", title: "the pattern in production", numbered: false, code: `
LINE = re.compile(
    r"^(\\d+-\\d+-\\d+)\\s+(\\d+:\\d+:\\d+)\\s*(\\s*)(\\w+|\\d+)+\\s+(.*)$"
)`},
        { t: "p", text: "Find every problem, rewrite it, and prove the rewrite is both correct and fast." }
      ],
      requirements: [
        "Identify the two constructs that make this pattern exponential.",
        "Rewrite it as an unambiguous verbose pattern with named groups.",
        "Restrict `level` to the values that actually occur, so a malformed line fails fast.",
        "Return a typed result rather than a tuple of strings, with the timestamp parsed.",
        "Reject rather than hang: cap input length, and return `None` for a line that does not match.",
        "Write a test that fails on the original pattern and passes on the rewrite — one that finishes in under a second either way."
      ],
      hint: "`(\\w+|\\d+)+` is the classic shape: `\\d` is a subset of `\\w`, so both branches match the same text, and the outer `+` multiplies the ways. Look separately at what `\\s*(\\s*)` can do.",
      solution: {
        lang: "python",
        title: "parse_line.py",
        code: `from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime

# ---- what was wrong ------------------------------------------------------
#
#   r"^(\\d+-\\d+-\\d+)\\s+(\\d+:\\d+:\\d+)\\s*(\\s*)(\\w+|\\d+)+\\s+(.*)$"
#                                          ^^^^^^^^^ ^^^^^^^^^^^^^^
#
# 1. \\s*(\\s*)  -- two adjacent open-ended whitespace quantifiers. For a run
#    of n spaces there are n+1 ways to split them between the two, and the
#    engine tries every one before it can fail. This is what the long run
#    of spaces triggered.
#
# 2. (\\w+|\\d+)+ -- an outer quantifier over an alternation whose branches
#    OVERLAP: \\d is a subset of \\w, so "42" can be matched by either side.
#    That is 2^n ways to partition a run of digits. It is also pointless:
#    the whole group means exactly the same as \\w+.
#
# Two smaller problems, no less real:
#
# 3. \\d+-\\d+-\\d+ accepts "1-2-3" and "99999-1-1" as dates, so garbage
#    reaches the datetime parser instead of failing at the pattern.
#
# 4. Five positional groups. Inserting a field renumbers every caller.


LOG_LINE = re.compile(
    r"""
    ^
    (?P<date>  \\d{4}-\\d{2}-\\d{2} )               # fixed widths, not \\d+
    [ ]
    (?P<time>  \\d{2}:\\d{2}:\\d{2} )
    [ ]+                                          # ONE quantifier, not two
    (?P<level> DEBUG|INFO|WARNING|ERROR|CRITICAL )  # a closed set
    [ ]+
    (?P<service> [\\w.-]+ )                         # no alternation at all
    [ ]+
    (?P<message> .* )
    $
    """,
    re.VERBOSE,
)

MAX_LINE = 8 * 1024


@dataclass(frozen=True, slots=True)
class LogLine:
    at: datetime
    level: str
    service: str
    message: str


def parse_line(line: str) -> LogLine | None:
    """Parse one log line, or return None if it is malformed.

    Returns None rather than raising: a single bad line in a stream of
    millions is data, not an exception (Lesson 6.2). The caller counts
    them and alerts on the rate.
    """
    # Cap first. Even an unambiguous pattern is linear in the input, and
    # a megabyte-long "line" from a broken producer is not worth scanning.
    if len(line) > MAX_LINE:
        return None

    m = LOG_LINE.match(line.rstrip("\\n"))
    if m is None:
        return None

    try:
        at = datetime.strptime(f"{m['date']} {m['time']}", "%Y-%m-%d %H:%M:%S")
    except ValueError:
        # The pattern accepts 2026-13-45; strptime is the real validator.
        return None

    return LogLine(
        at=at,
        level=m["level"],
        service=m["service"],
        message=m["message"],
    )


# ---- tests --------------------------------------------------------------

import time

GOOD = "2026-01-15 09:30:00 ERROR billing-api  payment declined: card expired"


def test_parses_a_good_line() -> None:
    parsed = parse_line(GOOD)

    assert parsed is not None
    assert parsed.at == datetime(2026, 1, 15, 9, 30, 0)
    assert parsed.level == "ERROR"
    assert parsed.service == "billing-api"
    assert parsed.message == " payment declined: card expired"


def test_the_pathological_line_is_fast() -> None:
    """THE regression test.

    The original pattern takes minutes on this input; the rewrite is
    linear. The assertion is on TIME, because both patterns return the
    same answer -- eventually.
    """
    hostile = "2026-01-15 09:30:00" + " " * 60 + "!"

    start = time.perf_counter()
    assert parse_line(hostile) is None
    assert time.perf_counter() - start < 0.05


def test_unknown_level_is_rejected_by_the_pattern() -> None:
    """A closed set means a typo fails here rather than reaching a
    downstream system as a level nobody handles."""
    assert parse_line("2026-01-15 09:30:00 TRACE api hello") is None


def test_impossible_date_is_rejected_by_strptime() -> None:
    """The pattern only checks SHAPE. Semantics are strptime's job --
    trying to express "valid month" in a regex is how patterns become
    unreviewable."""
    assert parse_line("2026-13-45 09:30:00 INFO api hello") is None


def test_oversized_input_is_dropped_without_scanning() -> None:
    start = time.perf_counter()
    assert parse_line("x" * (MAX_LINE + 1)) is None
    assert time.perf_counter() - start < 0.01


def test_message_may_be_empty() -> None:
    parsed = parse_line("2026-01-15 09:30:00 INFO api ")
    assert parsed is not None and parsed.message == ""


if __name__ == "__main__":
    for t in (
        test_parses_a_good_line,
        test_the_pathological_line_is_fast,
        test_unknown_level_is_rejected_by_the_pattern,
        test_impossible_date_is_rejected_by_strptime,
        test_oversized_input_is_dropped_without_scanning,
        test_message_may_be_empty,
    ):
        t()
    print("unambiguous, named, capped, and linear")`,
        notes: [
          { t: "p", text: "**Both bugs are the same bug.** `\\s*(\\s*)` and `(\\w+|\\d+)+` each give the engine more than one way to match the same characters, so a failure forces it to try them all. Once you learn to see ambiguity rather than memorise a list of bad patterns, you catch these in review without running anything." },
          { t: "p", text: "**The alternation was not just slow, it was redundant.** `(\\w+|\\d+)+` matches exactly what `\\w+` matches, because `\\d` is a subset of `\\w`. Almost every catastrophic pattern in the wild is like this — the expensive construct was never doing any work." },
          { t: "p", text: "**The timing assertion is the only honest test.** Both patterns return `None` for the hostile line, so a correctness assertion passes on the broken version too. Asserting on elapsed time is unusual and here it is the entire point: the regression is performance, so the test must measure performance." },
          { t: "callout", kind: "insight", title: "Where the pattern stops and the parser starts", body: [
            { t: "p", text: "`\\d{4}-\\d{2}-\\d{2}` checks shape. `strptime` checks meaning. Trying to express \"months are 1 to 12, and February has 29 days in a leap year\" as a regex produces something nobody can review, and it would still not catch `2026-02-30`." },
            { t: "p", text: "The division generalises: **let the regex find and split, let real code validate.** A pattern that is trying to be a validator is a pattern on its way to 200 characters." }
          ]},
          { t: "p", text: "**Capping the input is a defence the pattern cannot provide.** Even a linear pattern scans a megabyte in milliseconds you did not budget for, and the cap turns an unbounded cost into a bounded one. It belongs in front of every regex that touches data you did not produce." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "In July 2019 Cloudflare deployed a WAF rule containing `(?:.*(?:\\\"|'|\\\\]|\\\\}|...))` — an unbounded quantifier inside another unbounded quantifier. It went out globally in one push and CPU on every machine in the edge fleet went to 100%. HTTP traffic across a significant share of the internet stopped for 27 minutes." },
      { t: "p", text: "**The pattern had passed review and testing.** It was correct — it matched what it was supposed to match. What nobody tested was how it behaved on input it *failed* to match, which is the only case where backtracking explodes." },
      { t: "p", text: "**Their remedies are worth copying.** Cap the work a pattern may do rather than trusting the pattern; stage deployments so a global change is never one push; and treat regexes in a hot path as code that needs a performance test, not just a correctness one." },
      { t: "p", text: "The transferable rule is small: **a regex has a worst case, and it is never the input you tested with.** Ask what a hostile or malformed input costs, cap the length before matching, and prefer an unambiguous pattern even when the ambiguous one is shorter." }
    ]}
  ],

  takeaways: [
    "**Most regex uses should be string methods.** `startswith`, `split`, `replace`, `in` and `urlparse` are clearer and faster; a regex earns its place only when the shape genuinely varies.",
    "**Never validate an email address with a pattern.** Check for an `@`, then send a confirmation — sending is the only thing that proves the mailbox exists.",
    "**Prefer a negated character class to a lazy quantifier**: `[^>]*` cannot overrun, so the engine never backtracks, where `.*?` must retry at every position.",
    "**`re.match` is anchored at the start but not the end.** Use `fullmatch` when the whole string must conform, which is what validation nearly always means.",
    "Named groups plus `re.VERBOSE` turn a pattern into something reviewable — one field per line with a comment. The cost is writing a literal space as `[ ]`.",
    "**`re.sub` accepts a function** that receives the `Match`, so a replacement can depend on what matched — no loop over `finditer` needed.",
    "**Catastrophic backtracking comes from ambiguity**: more than one way to match the same text. Nested quantifiers, overlapping alternation branches and adjacent open-ended quantifiers are the four shapes.",
    "The cost is exponential — `^(a+)+$` against 24 characters takes seconds, and against 40 takes roughly a year. It only appears on input that **fails** to match.",
    "**`re` has no timeout.** Cap input length before matching, never build a pattern from user input, and use the third-party `regex` module if you must run untrusted patterns.",
    "**Let the regex find and split; let real code validate.** `\\d{4}-\\d{2}-\\d{2}` checks shape, `strptime` checks meaning — a pattern trying to be a validator is on its way to 200 characters."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why does `^(a+)+$` take seconds against `\"a\" * 24 + \"!\"` but microseconds against `\"a\" * 24`?",
        options: [
          "Failure triggers a slower fallback engine",
          "The `!` makes the match fail, and only then must the engine try all 2^n ways the nested quantifiers could split the a's",
          "The `$` anchor forces a scan from every position",
          "The pattern is recompiled when a match fails"
        ],
        answer: 1,
        why: "A successful match stops at the first way that works, so the ambiguity costs nothing. A failure requires the engine to prove **no** way works — and with a quantifier over a quantified group there are exponentially many. This is why catastrophic backtracking survives testing: it appears only on input you did not intend to match. The fix is to remove the ambiguity: `^a+$` accepts the same strings with one way to match each."
      },
      {
        stem: "Which is the better pattern for the contents of an HTML-ish tag, and why?",
        options: [
          "`<(.*)>` — greedy is faster because it matches in one pass",
          "`<([^>]*)>` — a negated class cannot overrun, so the engine never backtracks; `.*?` retries at every position",
          "`<(.*?)>` — lazy quantifiers are always preferable to negated classes",
          "They are equivalent; the choice is stylistic"
        ],
        answer: 1,
        why: "`.*` is greedy and swallows the rest of the line before backing off, so one pattern spans from the first `<` to the last `>`. `.*?` gives the right answer but works by advancing one character at a time and retrying. `[^>]*` states the stopping condition directly — it physically cannot pass a `>` — so it is both clearer and faster. Prefer a negated class whenever you can name what should stop the match."
      },
      {
        stem: "You are validating that a whole string is a postcode. Which entry point is correct?",
        options: [
          "`re.match(pattern, s)`",
          "`re.fullmatch(pattern, s)`",
          "`re.search(pattern, s)`",
          "`re.findall(pattern, s)`"
        ],
        answer: 1,
        why: "`re.match` anchors at position 0 but not at the end, so it happily accepts `\"SW1A 1AA; DROP TABLE\"` — the trailing text is simply not examined. `search` is unanchored at both ends and worse. `fullmatch` requires the pattern to consume the entire string, which is what validation means. If you are stuck on an older idiom, `re.match(pattern + r\"$\", s)` is the equivalent."
      },
      {
        stem: "A WAF rule with `.*` inside another unbounded quantifier took a global CDN offline. What made it pass review and testing?",
        options: [
          "The pattern was syntactically invalid on some engines",
          "It was correct — it matched what it was meant to match; the explosion only occurs on input that fails to match, which nobody tested",
          "The deployment tool corrupted the pattern",
          "It only misbehaved under high concurrency"
        ],
        answer: 1,
        why: "Correctness tests exercise inputs the pattern should match, and those terminate at the first success. Backtracking blows up on the complement — input that ALMOST matches and then fails — so a pattern can be fully correct and still be a denial-of-service vector. Treat regexes in a hot path as needing a performance test with hostile input, cap the input length, and stage deployments so one push cannot reach an entire fleet."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "When would you not use a regex?",
        strong: "When a string method does the job — prefix, suffix, fixed split, fixed replace — and whenever a real parser exists: `urlparse` for URLs, `csv` for CSV, an HTML parser for HTML, `strptime` for dates. A regex is for finding a varying pattern in flat text.",
        answer: [
          { t: "p", text: "Leading with the alternatives rather than the syntax is the signal — it says you have maintained regexes rather than only written them." },
          { t: "p", text: "Email is the example worth naming because it is so common: the RFC-correct pattern is thousands of characters, and sending a confirmation is the only thing that actually proves an address works." },
          { t: "p", text: "The general principle behind all of it — let the regex find and split, let real code validate — is what stops patterns growing to 200 characters as requirements accumulate." }
        ]
      },
      {
        level: "advanced",
        q: "What is catastrophic backtracking, and how do you avoid it?",
        strong: "Python's engine backtracks on failure. If a pattern can match the same text in more than one way, a failing input forces it to try all of them — exponentially many when a quantifier wraps a quantified group. The fix is to remove the ambiguity.",
        answer: [
          { t: "p", text: "Naming the four shapes concretely — nested quantifiers, overlapping alternation branches, adjacent open-ended quantifiers, `.*` around something optional — turns an abstract answer into something you could apply in a review." },
          { t: "p", text: "The point that it only fires on **failing** input is the one interviewers listen for: it explains why these patterns pass tests and reach production, and it is the reason the Cloudflare outage happened at all." },
          { t: "p", text: "Defences beyond rewriting show operational thinking: cap input length, never interpolate user input into a pattern, and use the third-party `regex` module when a timeout is genuinely needed, since `re` has none." }
        ]
      },
      {
        level: "core",
        q: "`re.match`, `re.search` or `re.fullmatch`?",
        strong: "`match` anchors at the start only, `search` scans anywhere, `fullmatch` requires the whole string. Validation almost always means `fullmatch` — `match` accepting trailing garbage is one of the most common bugs in the module.",
        answer: [
          { t: "p", text: "The trailing-garbage failure is worth stating as a concrete example: a postcode check with `match` accepts `\"SW1A 1AA\"` followed by anything at all, because the rest is simply never examined." },
          { t: "p", text: "Adding `finditer` over `findall` shows you think about volume: `findall` builds a list of every match, while `finditer` yields `Match` objects lazily and gives access to named groups and spans." },
          { t: "p", text: "Mentioning that `sub` accepts a callable rounds it out — it is the feature that removes most hand-written loops over matches." }
        ]
      }
    ]
  }
});
