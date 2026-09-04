import io
p = "courses/python/curriculum.js"
s = io.open(p, encoding="utf-8").read()
if "p_strings" in s:
    print("already merged"); raise SystemExit
add = io.open(".build/practice-modules.txt", encoding="utf-8").read().rstrip("\n")

anchor = '    tagline: "The language, the craft, and the engineering judgement around it.",'
labels = anchor + """

    /* Two tracks. "learn" teaches the language; "practice" builds the reflex.
       They are numbered and navigated independently but share one design
       system, one rail and one search index. */
    trackLabels: { learn: "Python", practice: "Coding Practice" },
    trackBlurbs: {
      learn: "The language itself \u2014 mental models, craft, and the engineering judgement around them.",
      practice: "Problem sets that build fluency \u2014 a pattern briefing, then problems that ramp to interview grade."
    },"""
assert anchor in s
s = s.replace(anchor, labels, 1)

marker = "\n    ]\n  });\n})();\n"
assert s.endswith(marker), repr(s[-50:])
s = s[: -len(marker)] + "\n" + add + marker
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("merged")
