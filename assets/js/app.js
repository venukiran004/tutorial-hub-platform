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
    // No saved choice: follow the operating system rather than forcing dark.
    var sysLight = false;
    try { sysLight = window.matchMedia && matchMedia("(prefers-color-scheme: light)").matches; } catch (e) {}
    applyTheme(saved || (sysLight ? "light" : "dark"));
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
      if (!t && window.matchMedia && matchMedia("(prefers-color-scheme: light)").matches) t = "light";
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

      // An appendix reads as its own sequence, so a module may restart the
      // numbering with numFrom without its files moving: dir keeps the
      // original folder name. Display order and storage stay independent.
      m.numFrom = m.numFrom != null ? m.numFrom : m.trackIndex + 1;

      m.lessons.forEach(function (l, li) {
        // Readiness is derived from the published list rather than repeated on
        // every lesson, so shipping a lesson is a one-line change.
        if (pub && l.ready === undefined) l.ready = pub.indexOf(l.id) !== -1;
        l.module = m;
        l.track = m.track;
        l.moduleIndex = mi;
        l.indexInModule = li;
        l.num = (m.numPrefix || "") + m.numFrom + "." + (li + 1);
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
    var m = l.module;
    // dir is set when a module's display number no longer matches its
    // position, so renumbering never means moving 35 files.
    var n = m.dir;
    if (!n) {
      n = String(m.trackIndex + 1);
      n = (n.length < 2 ? "0" + n : n) + "_" + m.id;
    }
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
    //
    // Every lesson is a fresh page load, so the rail starts at scrollTop 0 --
    // arriving at 15.9 would otherwise mean scrolling past fourteen modules
    // to find where you are. Measured against the RAIL, which is the scroll
    // container: #rail-nav is the content and spans the full list height, so
    // testing against it never detects anything as out of view.
    var scroller = el.closest(".rail") || el.parentElement;
    var act = $(".lsn.cur", el);
    if (act && scroller) {
      var a = act.getBoundingClientRect(), sc = scroller.getBoundingClientRect();
      if (a.top < sc.top + 60 || a.bottom > sc.bottom - 60) {
        // Centre it. Deriving the target from the live rects plus the current
        // scroll avoids depending on offsetParent, which changes the moment
        // any wrapper becomes positioned.
        scroller.scrollTop += (a.top - sc.top) - sc.height / 2 + a.height / 2;
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

    // Lessons in the other courses, from the generated index. Each becomes a
    // lesson-shaped record with its own href, so scoring and drawing are shared.
    var others = null;
    function otherLessons() {
      if (others) return others;
      var X = EC.searchIndex, here = EC.course && EC.course.id;
      others = !X ? [] : X.lessons.filter(function (r) { return r[0] !== here; }).map(function (r) {
        return { course: r[0], courseShort: (X.courses[r[0]] || {}).short || r[0], id: r[1], num: r[2], title: r[3],
                 module: { title: r[4] }, keywords: r[5] ? r[5].split(" ") : [], ready: r[6] ? undefined : false,
                 href: base + "../" + r[0] + "/lesson.html?id=" + encodeURIComponent(r[1]) };
      });
      return others;
    }

    var nLocal = 0;
    function query(q) {
      q = q.trim().toLowerCase();
      var pool = EC.course.allLessons;
      var rank = function (p, n) {
        return p.map(function (l) { return { l: l, s: score(l, q) }; })
          .filter(function (r) { return r.s > 0; })
          .sort(function (a, b) { return b.s - a.s || (a.l.seq || 0) - (b.l.seq || 0); })
          .slice(0, n).map(function (r) { return r.l; });
      };
      var local = q ? rank(pool, 24) : pool.slice(0, 12);
      nLocal = local.length;
      results = local.concat(q ? rank(otherLessons(), 16) : []);
      sel = 0;
      draw(q);
    }

    function item(l, i) {
      var href = l.ready === false ? "#" : (l.href || EC.lessonHref(l, base));
      return '<a class="cmdk-item" data-i="' + i + '" role="option" aria-selected="' + (i === sel) + '" href="' + href + '">' +
        '<span class="n">' + l.num + '</span><span class="t">' + EC.esc(l.title) + "</span>" +
        '<span class="m">' + (l.course ? EC.esc(l.courseShort) + " · " : "") + EC.esc(l.module.short || l.module.title) +
        (l.ready === false ? " · soon" : "") + "</span></a>";
    }

    function draw(q) {
      if (!results.length) {
        list.innerHTML = '<div class="cmdk-empty">No lesson matches “' + EC.esc(q) + "”</div>";
        return;
      }
      var local = results.slice(0, nLocal), rest = results.slice(nLocal);
      list.innerHTML =
        (local.length ? '<div class="cmdk-grp">' + (q ? "In this course" : "Start here") + "</div>" + local.map(item).join("") : "") +
        (rest.length ? '<div class="cmdk-grp">In other courses</div>' + rest.map(function (l, k) { return item(l, nLocal + k); }).join("") : "");
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
      if (l && l.ready !== false) location.href = l.href || EC.lessonHref(l, base);
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
  /* A heading carries furniture as well as its title: the section number and
     a "#" deep-link. Both are children, so reading textContent -- or the last
     child, which is the anchor -- gives "01Title#" or just "#". Strip the
     furniture by name rather than by position, which is what broke when the
     anchor was added. */
  function headingText(h) {
    var clone = h.cloneNode(true);
    $$(".anchor, .hn", clone).forEach(function (n) { n.remove(); });
    return clone.textContent.trim();
  }

  EC.buildToc = function () {
    var toc = $("#toc-list");
    if (!toc) return;

    var heads = $$(".body > h2, .body > h3");
    var items;

    if (heads.length) {
      items = heads.map(function (h) {
        if (!h.id) h.id = EC.slug(headingText(h));
        return { el: h, cls: h.tagName === "H3" ? "sub" : "",
                 label: headingText(h) };
      });
    } else {
      // A problem set has no headings — its structure is the numbered
      // drills. Listing those turns an empty panel into the navigation the
      // page actually needs: thirty problems are hard to move around
      // otherwise.
      heads = $$(".body > .drill");
      items = heads.map(function (d, i) {
        if (!d.id) d.id = "d" + (i + 1);
        var n = $(".drill-n", d), q = $(".drill-q", d);
        return {
          el: d,
          cls: "drill-item",
          label: (n ? n.textContent.trim() + ". " : "") +
                 (q ? q.textContent.trim() : "")
        };
      });
    }

    // Nothing to navigate by: reclaim the column rather than leaving a
    // heading over empty space.
    if (!items.length) { var w = $(".toc"); if (w) w.style.display = "none"; return; }

    toc.innerHTML = items.map(function (it) {
      return '<li class="' + it.cls + '"><a href="#' + it.el.id + '" title="' +
        EC.esc(it.label) + '">' + EC.esc(it.label) + "</a></li>";
    }).join("");

    var links = $$("a", toc);
    // Scroll-spy: mark the last heading whose top has passed the sticky bar.
    // rAF-throttled so a fast scroll costs one layout read per frame.
    var panel = toc.closest(".toc");
    var ticking = false, lastOn = null;
    function spy() {
      var y = window.scrollY + 110, active = heads[0];
      for (var i = 0; i < heads.length; i++) if (heads[i].offsetTop <= y) active = heads[i];

      var on = null;
      links.forEach(function (a) {
        var is = a.getAttribute("href") === "#" + active.id;
        a.classList.toggle("on", is);
        if (is) on = a;
      });

      // A problem set lists thirty drills, so the marked entry drifts out of
      // the panel long before the page ends. Follow it -- but only when it
      // actually changes, so this costs nothing on an ordinary scroll.
      if (on && on !== lastOn && panel) {
        lastOn = on;
        var a = on.getBoundingClientRect(), pr = panel.getBoundingClientRect();
        if (a.top < pr.top + 40 || a.bottom > pr.bottom - 40) {
          panel.scrollTop += (a.top - pr.top) - pr.height / 2 + a.height / 2;
        }
      }
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

    // Clicking a visible snippet selects text; only the title row reveals.
    root.addEventListener("click", function (e) {
      if (e.target.closest && e.target.closest(".drill-prompt")) e.preventDefault();
    });

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
      b.setAttribute("aria-expanded", String(!box.hidden));
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
      var retry = $("[data-quiz-retry]", quiz);
      if (retry) retry.hidden = false;
      var answered = $$(".q", quiz).every(function (x) { return !$(".q-fb", x).hidden; });
      if (answered) {
        var prev = quizBest(quiz);
        if (prev === null || got > prev) quizBest(quiz, got);
        showBest(quiz);
      }
    });

    // Retake: put every question back to its unanswered state. The best score
    // survives, so revision has something to beat.
    root.addEventListener("click", function (e) {
      var b = e.target.closest("[data-quiz-retry]");
      if (!b) return;
      var quiz = b.closest("[data-quiz]");
      $$(".q", quiz).forEach(function (q) {
        $$(".q-opt", q).forEach(function (x) { x.disabled = false; x.classList.remove("correct", "wrong", "dim"); });
        var fb = $(".q-fb", q);
        fb.hidden = true; fb.classList.remove("right", "nope");
      });
      $(".quiz-score", quiz).innerHTML = "0 / " + quiz.dataset.total + " correct";
      b.hidden = true;
      var first = $(".q-opt", quiz);
      if (first) first.focus();
    });

    // A best score per quiz, per lesson, kept in this browser only.
    function quizKey(quiz) {
      var id = "";
      try { id = new URLSearchParams(location.search).get("id") || ""; } catch (e) {}
      return "th:quiz:" + ((EC.course && EC.course.id) || "") + ":" + id + ":" + quiz.dataset.quiz;
    }
    function quizBest(quiz, v) {
      try {
        if (v === undefined) { var s = localStorage.getItem(quizKey(quiz)); return s === null ? null : +s; }
        localStorage.setItem(quizKey(quiz), String(v));
      } catch (e) { return null; }
      return v;
    }
    function showBest(quiz) {
      var best = quizBest(quiz), el = $(".quiz-best", quiz);
      if (!el || best === null) return;
      el.textContent = "Best " + best + " / " + quiz.dataset.total;
      el.hidden = false;
    }
    $$("[data-quiz]", root).forEach(showBest);
  };

  /* --------------------------------------------------------- rail drawer -- */
  EC.initRailDrawer = function () {
    var rail = $(".rail"), scrim = null, toggles = $$("[data-rail-toggle]");
    if (!rail) return;
    function set(open) {
      rail.classList.toggle("open", open);
      toggles.forEach(function (b) { b.setAttribute("aria-expanded", String(open)); });
      if (open && !scrim) {
        scrim = document.createElement("div");
        scrim.className = "rail-scrim";
        scrim.addEventListener("click", function () { set(false); });
        document.body.appendChild(scrim);
      } else if (!open && scrim) { scrim.remove(); scrim = null; }
    }
    toggles.forEach(function (b) {
      b.setAttribute("aria-expanded", "false");
      b.addEventListener("click", function () { set(!rail.classList.contains("open")); });
    });
    // A drawer that covers the page must close from the keyboard too.
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && rail.classList.contains("open")) {
        set(false);
        if (toggles[0]) toggles[0].focus();
      }
    });
  };

  EC.fmtTime = function (min) {
    if (min < 60) return min + " min";
    var h = Math.floor(min / 60), m = min % 60;
    return h + " hr" + (h > 1 ? "s" : "") + (m ? " " + m + " min" : "");
  };
})(window);
