/* ============================================================================
   TUTORIAL HUB — LESSON PAGE
   ----------------------------------------------------------------------------
   One script for every course's lesson.html. The page is a shell — topbar,
   rail, article, contents — and this fills it: resolves the lesson from the
   URL, loads its file, paints the header and the body, wires the blocks,
   builds the rail for the lesson's track, and hands the article to KaTeX
   for any \( \) or \[ \] maths.

   Usage, at the end of a course lesson.html:

     EC.renderLessonPage({ icon: I.bulb, course: "Deep Learning" });
   ========================================================================= */
(function () {
  "use strict";

  EC.renderLessonPage = function (opts) {
    var C = EC.course, I = EC.icons, $ = EC.$;
    opts = opts || {};

    EC.initTheme();
    EC.initCmdK("");
    EC.initRailDrawer();
    EC.initReadingBar();

    var id = new URLSearchParams(location.search).get("id") || C.allLessons[0].id;
    var meta = C.lessonById[id];

    if (!meta) {
      $("#lesson-body").innerHTML =
        '<div class="callout trap"><div class="callout-h"><span class="callout-ic">' + I.alert + '</span>' +
        '<span class="callout-kind">Not found</span></div><div class="callout-body">' +
        "<p>No lesson with id <code>" + EC.esc(id) + "</code>. " +
        '<a href="index.html">Back to the curriculum</a>.</p></div></div>';
      EC.buildRail({ current: null });
      EC.buildTrackSwitch({ track: "learn" });
      return;
    }

    var TR = C.tracks[meta.track];
    $("#rail-mark").innerHTML = opts.icon || I.book || "";
    var name = $(".rail-course-name");
    if (name) name.textContent = C.trackOrder.length > 1 ? TR.label : (opts.course || C.title);
    $("#rail-meta").textContent = TR.readyLessons.length + " of " + TR.lessons.length + " lessons ready";
    EC.buildRail({ current: meta });
    EC.buildTrackSwitch({ track: meta.track });
    $("#crumb-mod").textContent = meta.module.title;
    $("#crumb-lesson").textContent = meta.num + " " + meta.title;
    document.title = meta.num + " " + meta.title + " — " + (opts.course || C.title) + " — Tutorial Hub";

    /* The lesson body lives in its own classic script so the whole site works
       from file:// as well as over HTTP. It self-registers on load. */
    EC.receiveLesson = function (L) { paint(L); };

    var s = document.createElement("script");
    s.src = "lessons/" + EC.lessonDir(meta) + "/" + id + ".js";
    s.onerror = function () {
      $("#lesson-head").innerHTML = header(meta);
      $("#lesson-body").innerHTML = EC.render([
        { t: "callout", kind: "note", title: "This lesson is being written", body: [
          { t: "p", text: "**" + meta.num + " · " + meta.title + "** is scheduled but not yet published." },
          { t: "p", text: meta.summary },
          { t: "p", text: "The curriculum is deliberately visible in full from day one so you can see where the course goes. [Back to the curriculum](index.html#curriculum)." }
        ] }
      ]);
      $("#lesson-foot").innerHTML = pager(meta);
      EC.wireBlocks();
    };
    document.head.appendChild(s);

    /* ------------------------------------------------------------ render -- */
    function header(m, L) {
      L = L || {};
      var prereqs = (L.prerequisites || []).map(function (p) {
        var t = C.lessonById[p];
        return t
          ? "<li>" + I.link + '<a href="' + EC.lessonHref(t) + '">' + t.num + " · " + EC.esc(t.title) + "</a></li>"
          : "<li>" + I.link + "<span>" + EC.esc(p) + "</span></li>";
      }).join("");
      var drills = countDrills(L);
      var code = countCode(L);
      var src = m.module.source || L.source;

      return '<div class="lh-eyebrow">' +
          '<span class="lv">' + EC.esc(m.module.short) + " · " + EC.esc(m.module.title) + "</span>" +
          '<span style="opacity:.4">/</span><span>Lesson ' + m.num + "</span></div>" +
        "<h1>" + EC.esc(m.title) + "</h1>" +
        (L.lede ? '<p class="lh-lede">' + EC.inline(L.lede) + "</p>" : "") +
        '<div class="lh-meta">' +
          '<span class="badge ' + m.difficulty + '"><span class="dot"></span>' + m.difficulty + "</span>" +
          '<span class="meta-row"><span class="mi">' + I.clock + "<b>" + m.minutes + " min</b></span>" +
          '<span class="mi">' + I.layers + "Lesson <b>" + (m.seq + 1) + "</b> of " + m.trackTotal + "</span>" +
          (code ? '<span class="mi">' + I.code + "<b>" + code + "</b> code examples</span>" : "") +
          (drills ? '<span class="mi">' + I.key + "<b>" + drills + "</b> with hidden answers</span>" : "") +
          (src ? '<span class="mi">' + I.link + "<span>from <b>" + EC.esc(src) + "</b></span></span>" : "") +
          "</span></div>" +
        progress(m) +
        (L.objectives && L.objectives.length
          ? '<div class="lh-contract">' +
            '<div class="contract-box obj"><div class="contract-h">' + I.target + "<span>What you will be able to do</span></div><ol>" +
              L.objectives.map(function (o) { return "<li>" + EC.inline(o) + "</li>"; }).join("") +
            "</ol></div>" +
            '<div class="contract-box"><div class="contract-h">' + I.layers + "<span>Prerequisites</span></div><ul>" +
              (prereqs || "<li>" + I.check + "<span>None — this is a starting point.</span></li>") +
            "</ul></div>" +
          "</div>"
          : "");
    }

    /* Where this lesson sits inside its module. Segments rather than a
       percentage, because "4 of 9" is the unit a reader actually wants. */
    function progress(m) {
      var ls = m.module.lessons, i = m.indexInModule;
      var segs = ls.map(function (_, k) {
        return "<i class=\"" + (k < i ? "done" : k === i ? "cur" : "") + "\"></i>";
      }).join("");
      return '<div class="lh-prog"><span class="lh-prog-seg">' + segs + "</span>" +
        '<span class="lh-prog-t"><b>' + (i + 1) + " of " + ls.length + "</b> in " +
        EC.esc(m.module.title) + "</span></div>";
    }

    function walk(bs, fn) {
      (bs || []).forEach(function (b) {
        fn(b);
        if (b.rungs) b.rungs.forEach(function (r) { fn({ t: "code" }); });
        if (b.body) walk(b.body, fn);
        if (b.blocks) walk(b.blocks, fn);
        if (b.items) b.items.forEach(function (i) { if (i && i.blocks) walk(i.blocks, fn); });
      });
    }
    function countCode(L) { var n = 0; walk(L.blocks, function (b) { if (b.t === "code") n++; }); return n; }
    function countDrills(L) { var n = 0; walk(L.blocks, function (b) { if (b.t === "drill") n++; }); return n; }

    function pager(m) {
      function cell(l, dir) {
        var isNext = dir === "next";
        if (!l || l.ready === false) {
          return '<a class="ph ' + (isNext ? "nx" : "") + '"><span class="dir">' +
            (isNext ? "Next" + I.arrowR : I.arrowL + "Previous") + '</span><span class="t">' +
            (l ? "Coming soon" : "End of track") + "</span></a>";
        }
        return '<a class="' + (isNext ? "nx" : "") + '" href="' + EC.lessonHref(l) + '">' +
          '<span class="dir">' + (isNext ? "Next" + I.arrowR : I.arrowL + "Previous") + "</span>" +
          '<span class="t">' + l.num + " · " + EC.esc(l.title) + "</span></a>";
      }
      return '<div class="pager">' + cell(m.prev, "prev") + cell(m.next, "next") + "</div>";
    }

    function paint(L) {
      $("#lesson-head").innerHTML = header(meta, L);

      var blocks = (L.blocks || []).slice();
      if (L.takeaways && L.takeaways.length) blocks.push({ t: "takeaways", items: L.takeaways });
      if (L.quiz) blocks.push({ t: "quiz", title: L.quiz.title, questions: L.quiz.questions });
      if (L.interview) blocks.push({ t: "interview", title: L.interview.title, sub: L.interview.sub, questions: L.interview.questions });

      var body = $("#lesson-body");
      body.innerHTML = EC.render(blocks);
      body.classList.toggle("is-bank", countDrills(L) > 0);
      $("#lesson-foot").innerHTML = pager(meta);

      EC.wireBlocks();
      EC.buildToc();
      EC.initDrills();
      EC.typeset && EC.typeset(body);
      EC.initReveal && EC.initReveal();

      // j / k move through the track, matching the muscle memory of docs sites.
      document.addEventListener("keydown", function (e) {
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        if (/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) return;
        if (e.key === "j" && meta.next && meta.next.ready !== false) location.href = EC.lessonHref(meta.next);
        if (e.key === "k" && meta.prev) location.href = EC.lessonHref(meta.prev);
      });
    }
  };

  /* ------------------------------------------------------------ maths -- */
  /* KaTeX is loaded lazily and only when the page contains a delimiter, so a
     lesson with no maths never pays for the library. Delimiters are \( \)
     and \[ \] only — a dollar sign in prose must stay a dollar sign. */
  var KATEX = "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.11/";
  var loading = null;
  function loadKatex() {
    if (loading) return loading;
    loading = new Promise(function (resolve, reject) {
      var css = document.createElement("link");
      css.rel = "stylesheet"; css.href = KATEX + "katex.min.css";
      document.head.appendChild(css);
      var a = document.createElement("script");
      a.src = KATEX + "katex.min.js";
      a.onload = function () {
        var b = document.createElement("script");
        b.src = KATEX + "contrib/auto-render.min.js";
        b.onload = resolve; b.onerror = reject;
        document.head.appendChild(b);
      };
      a.onerror = reject;
      document.head.appendChild(a);
    });
    return loading;
  }
  EC.typeset = function (root) {
    root = root || document.body;
    if (!/\\[\(\[]/.test(root.textContent)) return;
    loadKatex().then(function () {
      window.renderMathInElement(root, {
        delimiters: [
          { left: "\\[", right: "\\]", display: true },
          { left: "\\(", right: "\\)", display: false }
        ],
        ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code"],
        throwOnError: false
      });
    }).catch(function () { /* the TeX stays readable as text */ });
  };
})();
