import io
p = "courses/python/index.html"
s = io.open(p, encoding="utf-8").read()
if 'id="track-tabs"' in s:
    print("already"); raise SystemExit

s = s.replace('''    <div id="curriculum-list"></div>''',
'''    <div class="track-tabs" id="track-tabs" role="tablist"></div>
    <div id="curriculum-list"></div>''', 1)

s = s.replace('''      Ordered so nothing is used before it is taught. Modules marked <b>soon</b> are written and
      scheduled — the shape of the whole course is visible from day one.''',
'''      Two tracks, taken in any order or in parallel. <b>Python</b> teaches the language;
      <b>Coding Practice</b> builds the reflex on problem sets. Modules marked <b>soon</b> are
      written and scheduled — the shape of the whole course is visible from day one.''', 1)

old = '''  /* ---- curriculum ---- */
  var html = "", lastPhase = null, phaseN = 0;
  C.modules.forEach(function (m) {'''
new = '''  /* ---- curriculum, per track ---- */
  $("#track-tabs").innerHTML = C.trackOrder.map(function (t, i) {
    var tr = C.tracks[t];
    return '<button class="ttab' + (i === 0 ? " on" : "") + '" type="button" role="tab" data-track="' + t + '"' +
      ' aria-selected="' + (i === 0) + '">' +
      '<span class="ttab-t">' + EC.esc(tr.label) + "</span>" +
      '<span class="ttab-m">' + tr.modules.length + " modules · " + tr.lessons.length + " lessons</span>" +
      "</button>";
  }).join("");

  $("#track-tabs").addEventListener("click", function (e) {
    var b = e.target.closest(".ttab");
    if (!b) return;
    EC.$$(".ttab").forEach(function (x) {
      var on = x === b;
      x.classList.toggle("on", on);
      x.setAttribute("aria-selected", String(on));
    });
    renderTrack(b.dataset.track);
  });

  function renderTrack(track) {
  var html = "", lastPhase = null, phaseN = 0;
  C.tracks[track].modules.forEach(function (m) {'''
assert old in s
s = s.replace(old, new, 1)

old2 = '''  $("#curriculum-list").innerHTML = html;'''
new2 = '''  $("#curriculum-list").innerHTML = html;
    $("#expand-all").textContent = "Expand all";
  }

  renderTrack(C.trackOrder[0]);'''
assert old2 in s
s = s.replace(old2, new2, 1)

# stats: report both tracks honestly
s = s.replace('''    { v: C.modules.length, l: "Modules" },''',
              '''    { v: C.trackOrder.length, l: "Tracks" },
    { v: C.modules.length, l: "Modules" },''', 1)

io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("landing patched")
