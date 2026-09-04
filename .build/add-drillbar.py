import io
p = "assets/js/app.js"
s = io.open(p, encoding="utf-8").read()
if "EC.initDrills" in s:
    print("already"); raise SystemExit

anchor = "  EC.initReadingBar = function () {"
assert anchor in s
fn = '''  /* ------------------------------------------------------------ drills -- */
  /* A practice page carries up to thirty hidden answers. Opening them one at
     a time is right for study and wrong for revision, so the page gets a
     sticky bar with bulk controls and a key for each. */
  EC.initDrills = function (root) {
    root = root || document;
    var drills = $$(".drill", root);
    if (!drills.length) return;

    var bar = document.createElement("div");
    bar.className = "drill-bar";
    bar.innerHTML =
      '<span class="drill-bar-c"><b>' + drills.length + "</b> problems</span>" +
      '<span class="drill-bar-c" id="drill-open">0 revealed</span>' +
      '<span class="sp"></span>' +
      '<button class="drill-btn" data-drill="all" type="button">Reveal all <kbd>a</kbd></button>' +
      '<button class="drill-btn" data-drill="none" type="button">Hide all <kbd>h</kbd></button>';

    var body = $("#lesson-body");
    var first = drills[0];
    // Sit above the first drill rather than at the top of the page: the
    // briefing above it should be read before anything is revealed.
    first.parentNode.insertBefore(bar, first);

    var count = $("#drill-open", bar);
    function tally() {
      var n = drills.filter(function (d) { return d.open; }).length;
      count.textContent = n + " revealed";
    }

    function setAll(open) {
      drills.forEach(function (d) { d.open = open; });
      tally();
    }

    bar.addEventListener("click", function (e) {
      var b = e.target.closest("[data-drill]");
      if (b) setAll(b.dataset.drill === "all");
    });
    if (body) body.addEventListener("toggle", tally, true);

    document.addEventListener("keydown", function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) return;
      if (e.key === "a") setAll(true);
      if (e.key === "h") setAll(false);
    });

    tally();
  };

''' + anchor
s = s.replace(anchor, fn, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)

# call it after the lesson paints
p2 = "courses/python/lesson.html"
h = io.open(p2, encoding="utf-8").read()
h = h.replace("    EC.wireBlocks();\n    EC.buildToc();",
              "    EC.wireBlocks();\n    EC.buildToc();\n    EC.initDrills();", 1)
io.open(p2, "w", encoding="utf-8", newline="\n").write(h)
print("ok")
