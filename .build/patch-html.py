import io, re

def rd(p): return io.open(p, encoding="utf-8").read()
def wr(p, s): io.open(p, "w", encoding="utf-8", newline="\n").write(s)

# ---- load refine.css everywhere ----------------------------------------
for p, pre in (("index.html", "assets/css/"),
               ("courses/python/index.html", "../../assets/css/"),
               ("courses/python/lesson.html", "../../assets/css/")):
    s = rd(p)
    if "refine.css" in s:
        continue
    last = '<link rel="stylesheet" href="%scourse.css">' % pre
    lastl = '<link rel="stylesheet" href="%slesson.css">' % pre
    anchor = lastl if lastl in s else last
    s = s.replace(anchor, anchor + '\n<link rel="stylesheet" href="%srefine.css">' % pre, 1)
    wr(p, s)

# ---- lesson.html: track switcher in the rail ---------------------------
p = "courses/python/lesson.html"
s = rd(p)
old = '''    <div class="rail-filter">'''
new = '''    <div class="track-switch" id="track-switch"></div>
    <div class="rail-filter">'''
if 'id="track-switch"' not in s:
    assert old in s
    s = s.replace(old, new, 1)

s = s.replace('EC.buildRail({ current: meta });',
              'EC.buildTrackSwitch({ track: meta.track });\n  EC.buildRail({ current: meta });', 1)
s = s.replace('EC.buildRail({ current: null });',
              'EC.buildTrackSwitch({ track: "learn" });\n    EC.buildRail({ current: null });', 1)

# rail head reflects the track
s = s.replace('$("#rail-meta").textContent = C.readyLessons.length + " lessons available";',
              'var TR = C.tracks[meta.track];\n  $(".rail-course-name").textContent = TR.label;\n'
              '  $("#rail-meta").textContent = TR.readyLessons.length + " of " + TR.lessons.length + " lessons ready";', 1)

# lesson counter should be per-track
s = s.replace('"Lesson <b>" + (m.seq + 1) + "</b> of " + C.allLessons.length',
              '"Lesson <b>" + (m.seq + 1) + "</b> of " + m.trackTotal', 1)

# module progress strip, appended after the meta row
old_meta = '''        "</span></div>" +
      '<div class="lh-contract">' +'''
new_meta = '''        "</span></div>" +
      progress(m) +
      '<div class="lh-contract">' +'''
if "progress(m)" not in s:
    assert old_meta in s
    s = s.replace(old_meta, new_meta, 1)

    s = s.replace('''  function countCode(L) {''', '''  /* Where this lesson sits inside its module. Segments rather than a
     percentage, because "4 of 9" is the unit a reader actually wants. */
  function progress(m) {
    var ls = m.module.lessons, i = m.indexInModule;
    var segs = ls.map(function (_, k) {
      return "<i class=\\"" + (k < i ? "done" : k === i ? "cur" : "") + "\\"></i>";
    }).join("");
    return '<div class="lh-prog"><span class="lh-prog-seg">' + segs + "</span>" +
      '<span class="lh-prog-t"><b>' + (i + 1) + " of " + ls.length + "</b> in " +
      EC.esc(m.module.title) + "</span></div>";
  }

  function countCode(L) {''', 1)

wr(p, s)
print("html patched")
