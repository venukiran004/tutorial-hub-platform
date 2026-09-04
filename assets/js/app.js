/* ============================================================================
   APPLICATION RUNTIME
   ----------------------------------------------------------------------------
   No framework, no build step. Classic scripts with a global namespace so the
   whole site opens straight off the filesystem as well as from a web server.

   Owns: theme, the course rail, the command palette, the on-this-page rail
   with scroll-spy, and every interactive behaviour a lesson block can
   declare (copy, tabs, reveal, quiz).
   ========================================================================= */
(function (global) {
  "use strict";

  var EC = global.EC || (global.EC = {});
  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  EC.$ = $; EC.$$ = $$;

  /* --------------------------------------------------------------- theme -- */
  var THEME_KEY = "th:theme";
  function applyTheme(t) {
    if (t === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", t);
    $$("[data-theme-toggle]").forEach(function (b) {
      b.innerHTML = t === "light" ? EC.icons.moon : EC.icons.sun;
      b.setAttribute("aria-label", "Switch to " + (t === "light" ? "dark" : "light") + " theme");
    });
  }
  EC.initTheme = function () {
    var saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch (e) {}
    applyTheme(saved || "dark");
    document.addEventListener("click", function (e) {
      var b = e.target.closest("[data-theme-toggle]");
      if (!b) return;
      var cur = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
      var next = cur === "light" ? "dark" : "light";
      applyTheme(next);
      try { localStorage.setItem(THEME_KEY, next); } catch (err) {}
    });
  };
  // Applied before first paint by an inline script in each page; this is the
  // fallback for anything that loads late.
  (function () {
    try {
      var t = localStorage.getItem(THEME_KEY);
      if (t && t !== "dark") document.documentElement.setAttribute("data-theme", t);
    } catch (e) {}
  })();

  /* ------------------------------------------------------------ course -- */
  /* A curriculum is a list of modules; a module is a list of lessons. Lessons
     with `ready:false` render as "soon" — the shape of the full course is
     visible from day one, which is what makes the roadmap credible. */
  EC.course = null;
  /* One course can carry several TRACKS — Python has "learn" (the language)
     and "practice" (problem sets). A track is an independent spine: its own
     numbering, its own prev/next, its own rail. Modules without a track
     default to "learn", so the original curriculum needed no edits. */
  EC.defineCourse = function (c) {
    EC.course = c;
    c.allLessons = [];
    c.lessonById = {};
    c.tracks = {};
    c.trackOrder = [];
    var pub = c.published || null;

    c.modules.forEach(function (m, mi) {
      m.index = mi;
      m.track = m.track || "learn";

      if (!c.tracks[m.track]) {
        c.tracks[m.track] = {
          id: m.track,
          label: (c.trackLabels || {})[m.track] || m.track,
          blurb: (c.trackBlurbs || {})[m.track] || "",
          modules: [],
          lessons: []
        };
        c.trackOrder.push(m.track);
      }
      var tr = c.tracks[m.track];
      m.trackIndex = tr.modules.length;
      tr.modules.push(m);

      m.lessons.forEach(function (l, li) {
        // Readiness is derived from the published list rather than repeated on
        // every lesson, so shipping a lesson is a one-line change.
        if (pub && l.ready === undefined) l.ready = pub.indexOf(l.id) !== -1;
        l.module = m;
        l.track = m.track;
        l.moduleIndex = mi;
        l.indexInModule = li;
        l.num = (m.numPrefix || "") + (m.trackIndex + 1) + "." + (li + 1);
        c.allLessons.push(l);
        tr.lessons.push(l);
        c.lessonById[l.id] = l;
      });
    });

    // prev / next stay WITHIN a track: finishing the last language lesson
    // should not drop you into a problem set.
    c.trackOrder.forEach(function (t) {
      var ls = c.tracks[t].lessons;
      ls.forEach(function (l, i) {
        l.seq = i;
        l.trackTotal = ls.length;
        l.prev = i > 0 ? ls[i - 1] : null;
        l.next = i < ls.length - 1 ? ls[i + 1] : null;
      });
      c.tracks[t].readyLessons = ls.filter(function (l) { return l.ready !== false; });
    });

    c.readyLessons = c.allLessons.filter(function (l) { return l.ready !== false; });
    return c;
  };

  EC.lessonHref = function (l, base) {
    return (base || "") + "lesson.html?id=" + encodeURIComponent(l.id);
  };

  /* Lesson files live in one folder per module, zero-padded so the
     directory listing matches curriculum order. Defined here so the page,
     the build scripts and the tests all derive the path the same way. */
  EC.lessonDir = function (l) {
    var n = String(l.module.trackIndex + 1);
    n = (n.length < 2 ? "0" + n : n) + "_" + l.module.id;
    // The learn track keeps the original flat layout; every other track gets
    // its own subtree, so lessons/ stays readable as the course grows.
    return (l.track && l.track !== "learn") ? l.track + "/" + n : n;
  };

  /* ------------------------------------------------------ track switch -- */
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

  /* -------------------------------------------------------------- rail -- */
  EC.buildRail = function (opts) {
    var c = EC.course, cur = opts.current, base = opts.base || "";
    var el = $("#rail-nav");
    if (!el) return;

    var html = "", lastPhase = null;
    // Only the current track's modules: mixing sixty language lessons with
    // sixty problem sets in one list helps nobody.
    var track = (cur && cur.track) || opts.track || c.trackOrder[0];
    (c.tracks[track] ? c.tracks[track].modules : c.modules).forEach(function (m) {
      if (m.phase && m.phase !== lastPhase) {
        html += '<div class="rail-phase">' + EC.esc(m.phase) + "</div>";
        lastPhase = m.phase;
      }
      var isCur = cur && cur.module === m;

      html += '<div class="mod' + (isCur ? " open active" : "") + '" data-mod="' + m.id + '">' +
        '<button class="mod-btn" type="button" aria-expanded="' + (isCur ? "true" : "false") + '">' +
        '<span class="mod-chev">' + EC.icons.chevron + "</span>" +
        '<span class="mod-lv">' + EC.esc(m.short || ("L" + (m.index + 1))) + "</span>" +
        '<span class="mod-name">' + EC.esc(m.title) + "</span>" +
        '<span class="mod-count">' + m.lessons.length + "</span></button>" +
        '<ul class="mod-list' + (isCur ? "" : " collapsed") + '">';

      m.lessons.forEach(function (l) {
        var soon = l.ready === false;
        var cls = "lsn" + (cur && cur.id === l.id ? " cur" : "") + (soon ? " locked" : "");
        html += '<li class="' + cls + '">' +
          (soon ? '<a aria-disabled="true">' : '<a href="' + EC.lessonHref(l, base) + '">') +
          '<span class="lsn-n">' + l.num + "</span>" +
          '<span class="lsn-t">' + EC.esc(l.title) + "</span>" +
          (soon ? '<span class="lsn-soon">soon</span>' : "") +
          "</a></li>";
      });
      html += "</ul></div>";
    });
    el.innerHTML = html;

    el.addEventListener("click", function (e) {
      var b = e.target.closest(".mod-btn");
      if (!b) return;
      var mod = b.parentElement;
      var open = mod.classList.toggle("open");
      $(".mod-list", mod).classList.toggle("collapsed", !open);
      b.setAttribute("aria-expanded", open ? "true" : "false");
    });

    // Filter box narrows to matching lessons and auto-opens their modules —
    // typing should never require a second click to see the hit.
    var f = $("#rail-filter");
    if (f) {
      f.addEventListener("input", function () {
        var q = f.value.trim().toLowerCase();
        $$(".mod", el).forEach(function (mod) {
          var hits = 0;
          $$(".lsn", mod).forEach(function (li) {
            var ok = !q || li.textContent.toLowerCase().indexOf(q) !== -1;
            li.style.display = ok ? "" : "none";
            if (ok) hits++;
          });
          mod.style.display = hits ? "" : "none";
          if (q) { mod.classList.add("open"); $(".mod-list", mod).classList.remove("collapsed"); }
          else if (!mod.classList.contains("active")) { mod.classList.remove("open"); $(".mod-list", mod).classList.add("collapsed"); }
        });
      });
    }

    // Keep the active lesson in view on load without yanking the whole page.
    var act = $(".lsn.cur", el);
    if (act) {
      var r = act.getBoundingClientRect(), rr = el.getBoundingClientRect();
      if (r.top < rr.top + 60 || r.bottom > rr.bottom - 60) {
        el.parentElement.scrollTop = act.offsetTop - 200;
      }
    }
  };

  /* ---------------------------------------------------- command palette -- */
  EC.initCmdK = function (base) {
    var open = false, sel = 0, results = [];
    var scrim, input, list;

    function build() {
      scrim = document.createElement("div");
      scrim.className = "cmdk-scrim";
      scrim.innerHTML =
        '<div class="cmdk" role="dialog" aria-modal="true" aria-label="Search lessons">' +
        '<div class="cmdk-in">' + EC.icons.search +
        '<input type="text" placeholder="Search lessons, topics, concepts…" autocomplete="off" spellcheck="false">' +
        "</div><div class=\"cmdk-list\" role=\"listbox\"></div>" +
        '<div class="cmdk-foot"><span><kbd>↑</kbd><kbd>↓</kbd> navigate</span><span><kbd>↵</kbd> open</span><span><kbd>esc</kbd> close</span></div></div>';
      document.body.appendChild(scrim);
      input = $("input", scrim);
      list = $(".cmdk-list", scrim);

      scrim.addEventListener("mousedown", function (e) { if (e.target === scrim) close(); });
      input.addEventListener("input", function () { query(input.value); });
      input.addEventListener("keydown", function (e) {
        if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
        else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
        else if (e.key === "Enter") { e.preventDefault(); go(); }
        else if (e.key === "Escape") { e.preventDefault(); close(); }
      });
      list.addEventListener("click", function (e) {
        var it = e.target.closest(".cmdk-item");
        if (it) { sel = +it.dataset.i; go(); }
      });
    }

    // Scoring: title prefix beats title substring beats keyword/module match,
    // so typing "gen" surfaces "Generators" before "Dependency management".
    function score(l, q) {
      var t = l.title.toLowerCase();
      if (t.indexOf(q) === 0) return 100;
      if (t.indexOf(q) !== -1) return 70;
      if ((l.summary || "").toLowerCase().indexOf(q) !== -1) return 40;
      var kw = (l.keywords || []).join(" ").toLowerCase();
      if (kw.indexOf(q) !== -1) return 35;
      if (l.module.title.toLowerCase().indexOf(q) !== -1) return 20;
      return 0;
    }

    function query(q) {
      q = q.trim().toLowerCase();
      var pool = EC.course.allLessons;
      results = q
        ? pool.map(function (l) { return { l: l, s: score(l, q) }; })
             .filter(function (r) { return r.s > 0; })
             .sort(function (a, b) { return b.s - a.s || a.l.seq - b.l.seq; })
             .slice(0, 24).map(function (r) { return r.l; })
        : pool.slice(0, 12);
      sel = 0;
      draw(q);
    }

    function draw(q) {
      if (!results.length) {
        list.innerHTML = '<div class="cmdk-empty">No lesson matches “' + EC.esc(q) + "”</div>";
        return;
      }
      list.innerHTML = '<div class="cmdk-grp">' + (q ? results.length + " result" + (results.length > 1 ? "s" : "") : "Start here") + "</div>" +
        results.map(function (l, i) {
          return '<a class="cmdk-item" data-i="' + i + '" role="option" aria-selected="' + (i === sel) + '" href="' +
            (l.ready === false ? "#" : EC.lessonHref(l, base)) + '">' +
            '<span class="n">' + l.num + '</span><span class="t">' + EC.esc(l.title) + "</span>" +
            '<span class="m">' + EC.esc(l.module.short || l.module.title) + (l.ready === false ? " · soon" : "") + "</span></a>";
        }).join("");
    }

    function move(d) {
      if (!results.length) return;
      sel = (sel + d + results.length) % results.length;
      $$(".cmdk-item", list).forEach(function (it, i) {
        it.setAttribute("aria-selected", i === sel);
        if (i === sel) it.scrollIntoView({ block: "nearest" });
      });
    }
    function go() {
      var l = results[sel];
      if (l && l.ready !== false) location.href = EC.lessonHref(l, base);
    }
    function show() {
      if (!scrim) build();
      scrim.style.display = "";
      open = true;
      input.value = "";
      query("");
      input.focus();
    }
    function close() { if (scrim) scrim.style.display = "none"; open = false; }

    document.addEventListener("keydown", function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); open ? close() : show(); }
      else if (e.key === "/" && !open && !/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) { e.preventDefault(); show(); }
    });
    $$("[data-cmdk]").forEach(function (b) { b.addEventListener("click", show); });
  };

  /* ------------------------------------------------------------- toc -- */
  EC.buildToc = function () {
    var toc = $("#toc-list");
    if (!toc) return;
    var heads = $$(".body > h2, .body > h3");
    if (!heads.length) { var w = $(".toc"); if (w) w.style.display = "none"; return; }

    toc.innerHTML = heads.map(function (h) {
      if (!h.id) h.id = EC.slug(h.textContent);
      var txt = h.tagName === "H2" ? (h.lastElementChild ? h.lastElementChild.textContent : h.textContent) : h.textContent;
      return '<li class="' + (h.tagName === "H3" ? "sub" : "") + '"><a href="#' + h.id + '">' + EC.esc(txt) + "</a></li>";
    }).join("");

    var links = $$("a", toc);
    // Scroll-spy: mark the last heading whose top has passed the sticky bar.
    // rAF-throttled so a fast scroll costs one layout read per frame.
    var ticking = false;
    function spy() {
      var y = window.scrollY + 110, active = heads[0];
      for (var i = 0; i < heads.length; i++) if (heads[i].offsetTop <= y) active = heads[i];
      links.forEach(function (a) { a.classList.toggle("on", a.getAttribute("href") === "#" + active.id); });
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(spy); }
    }, { passive: true });
    spy();
  };

  /* ------------------------------------------------------- reading bar -- */
  /* ------------------------------------------------------------ drills -- */
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

  EC.initReadingBar = function () {
    var bar = document.createElement("div");
    bar.className = "reading-bar";
    document.body.appendChild(bar);
    var ticking = false;
    function upd() {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (h > 0 ? Math.min(100, (window.scrollY / h) * 100) : 0) + "%";
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(upd); }
    }, { passive: true });
    upd();
  };

  /* --------------------------------------------------- block behaviours -- */
  EC.wireBlocks = function (root) {
    root = root || document;

    // copy
    root.addEventListener("click", function (e) {
      var b = e.target.closest("[data-copy]");
      if (!b) return;
      var code = document.getElementById(b.dataset.copy);
      if (!code) return;
      var txt = code.getAttribute("data-raw") || code.innerText;
      var done = function () {
        b.classList.add("ok");
        var s = $("span", b); var was = s.textContent; s.textContent = "Copied";
        setTimeout(function () { b.classList.remove("ok"); s.textContent = was; }, 1400);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(done, fallback);
      } else fallback();
      function fallback() {
        var ta = document.createElement("textarea");
        ta.value = txt; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); done(); } catch (err) {}
        document.body.removeChild(ta);
      }
    });

    // tabs
    root.addEventListener("click", function (e) {
      var b = e.target.closest('.tabs-strip button');
      if (!b) return;
      var wrap = b.closest("[data-tabs]");
      $$(".tabs-strip button", wrap).forEach(function (x) { x.setAttribute("aria-selected", x === b); });
      $$(".tab-panel", wrap).forEach(function (p) { p.hidden = p.id !== b.getAttribute("aria-controls"); });
    });
    // arrow-key navigation inside a tablist, per WAI-ARIA
    root.addEventListener("keydown", function (e) {
      if (!/^Arrow(Left|Right)$/.test(e.key)) return;
      var b = e.target.closest(".tabs-strip button");
      if (!b) return;
      var all = $$(".tabs-strip button", b.closest("[data-tabs]"));
      var i = all.indexOf(b) + (e.key === "ArrowRight" ? 1 : -1);
      var n = all[(i + all.length) % all.length];
      n.click(); n.focus();
      e.preventDefault();
    });

    // reveal solution
    root.addEventListener("click", function (e) {
      var b = e.target.closest("[data-reveal]");
      if (!b) return;
      var box = document.getElementById(b.dataset.reveal);
      if (!box) return;
      box.hidden = !box.hidden;
      $("span", b).textContent = box.hidden ? "Reveal solution" : "Hide solution";
      if (!box.hidden) box.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });

    // quiz
    root.addEventListener("click", function (e) {
      var o = e.target.closest(".q-opt");
      if (!o || o.disabled) return;
      var q = o.closest(".q");
      var right = +q.dataset.answer, picked = +o.dataset.i;
      var ok = picked === right;

      $$(".q-opt", q).forEach(function (x) {
        x.disabled = true;
        var i = +x.dataset.i;
        if (i === right) x.classList.add("correct");
        else if (i === picked) x.classList.add("wrong");
        else x.classList.add("dim");
      });

      var fb = $(".q-fb", q);
      fb.hidden = false;
      fb.classList.add(ok ? "right" : "nope");
      $(".q-fb-h", fb).textContent = ok ? "Correct" : "Not quite";

      var quiz = q.closest("[data-quiz]");
      var got = $$(".q", quiz).filter(function (x) { return $(".q-opt.correct:not(.dim)", x) && $(".q-fb.right", x); }).length;
      $(".quiz-score", quiz).innerHTML = "<b>" + got + "</b> / " + quiz.dataset.total + " correct";
    });
  };

  /* --------------------------------------------------------- rail drawer -- */
  EC.initRailDrawer = function () {
    var rail = $(".rail"), scrim = null;
    $$("[data-rail-toggle]").forEach(function (b) {
      b.addEventListener("click", function () {
        var open = rail.classList.toggle("open");
        if (open) {
          scrim = document.createElement("div");
          scrim.className = "rail-scrim";
          scrim.addEventListener("click", function () { rail.classList.remove("open"); scrim.remove(); scrim = null; });
          document.body.appendChild(scrim);
        } else if (scrim) { scrim.remove(); scrim = null; }
      });
    });
  };

  EC.fmtTime = function (min) {
    if (min < 60) return min + " min";
    var h = Math.floor(min / 60), m = min % 60;
    return h + " hr" + (h > 1 ? "s" : "") + (m ? " " + m + " min" : "");
  };
})(window);
