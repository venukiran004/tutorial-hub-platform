import io

# ---------------------------------------------------------------- render.js
p = "assets/js/render.js"
s = io.open(p, encoding="utf-8").read()
old = '''    h2: function (b) {
      return "<h2 id=\\"" + (b.id || slug(b.text)) + '"><span class="hn">' + esc(b.n || "") + "</span><span>" + inline(b.text) + "</span></h2>" +
        (b.sub ? '<p class="h2-sub">' + inline(b.sub) + "</p>" : "");'''
new = '''    h2: function (b) {
      var id = b.id || slug(b.text);
      // The anchor is a real link, revealed on hover: deep-linking a section
      // is something readers do, and hunting for a hidden affordance is not.
      return '<h2 id="' + id + '"><span class="hn">' + esc(b.n || "") + '</span><span>' + inline(b.text) +
        '</span><a class="anchor" href="#' + id + '" aria-label="Link to this section">#</a></h2>' +
        (b.sub ? '<p class="h2-sub">' + inline(b.sub) + "</p>" : "");'''
assert old in s
s = s.replace(old, new, 1)

old3 = '''    h3: function (b) { return '<h3 id="' + (b.id || slug(b.text)) + '">' + inline(b.text) + "</h3>"; },'''
new3 = '''    h3: function (b) {
      var id = b.id || slug(b.text);
      return '<h3 id="' + id + '">' + inline(b.text) +
        '<a class="anchor" href="#' + id + '" aria-label="Link to this section">#</a></h3>';
    },'''
assert old3 in s
s = s.replace(old3, new3, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)

# ------------------------------------------------------------------ app.js
p = "assets/js/app.js"
s = io.open(p, encoding="utf-8").read()

anchor = "  /* -------------------------------------------------------------- rail -- */"
assert anchor in s
switcher = '''  /* ------------------------------------------------------ track switch -- */
  /* Two tracks share one rail, so the switch has to be unmissable and cost
     one click. A segmented control does both, and it collapses to nothing
     when a course has only one track. */
  EC.buildTrackSwitch = function (opts) {
    var c = EC.course, el = $("#track-switch");
    if (!el || c.trackOrder.length < 2) { if (el) el.style.display = "none"; return; }
    var base = opts.base || "", active = opts.track || "learn";

    el.innerHTML = c.trackOrder.map(function (t) {
      var tr = c.tracks[t];
      var first = tr.readyLessons[0] || tr.lessons[0];
      var on = t === active;
      return '<a class="tsw' + (on ? " on" : "") + '"' +
        (on ? ' aria-current="true"' : "") +
        ' href="' + (first ? EC.lessonHref(first, base) : base + "index.html") + '">' +
        '<span class="tsw-t">' + EC.esc(tr.label) + "</span>" +
        '<span class="tsw-n">' + tr.readyLessons.length + "</span></a>";
    }).join("");
  };

''' + anchor
s = s.replace(anchor, switcher, 1)

# rail is per-track: only render modules belonging to the current track
old_rail = "    var html = \"\", lastPhase = null;\n    c.modules.forEach(function (m) {"
new_rail = ("    var html = \"\", lastPhase = null;\n"
            "    // Only the current track's modules: mixing sixty language lessons with\n"
            "    // sixty problem sets in one list helps nobody.\n"
            "    var track = (cur && cur.track) || opts.track || c.trackOrder[0];\n"
            "    (c.tracks[track] ? c.tracks[track].modules : c.modules).forEach(function (m) {")
assert old_rail in s
s = s.replace(old_rail, new_rail, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("patched")
