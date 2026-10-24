/* ============================================================================
   TUTORIAL HUB — COURSE LANDING PAGE
   ----------------------------------------------------------------------------
   One script for every course's index.html. The page keeps its own hero copy
   and its "fit" lists in markup; everything derived from the curriculum —
   the stats strip, the track tabs, the curriculum, the start button — is
   rendered here so fifteen courses cannot drift apart.

   The curriculum has two views of the same data:

     Map        one row per module, one tile per lesson. A 179-lesson course
                fits on a screen, so the shape of the whole thing is visible
                at once. A tile carries difficulty as its height and colour
                and progress as its fill, which makes each row a small
                difficulty profile and the page a map of where it gets hard.

     Detailed   the module accordion, with blurbs, outcomes and summaries.

   Map opens first on a course too tall to take in at a glance; after that the
   reader's choice is remembered per course.

   Usage, at the end of a course index.html:

     EC.renderCoursePage({ icon: I.bulb, badge: "Course 07 · Deep Learning",
                           startLabel: "Start with the perceptron" });
   ========================================================================= */
(function () {
  "use strict";

  /* "1 module" rather than "1 modules" — a single-module track is common now
     that the practice and interview banks import as one module each. */
  function plural(n, word) { return n + " " + word + (n === 1 ? "" : "s"); }

  // One hue per module, so a section is recognisable by colour before its
  // name is read — the same device the home page uses for topics.
  var MHUES = ["--t-blue", "--t-violet", "--t-cyan", "--t-orange", "--t-green",
               "--t-amber", "--t-pink"];

  /* Above this many lessons in a track the accordion is too tall to take in,
     so the map opens first. Below it the blurbs are the better default,
     because the whole list already fits on a screen or two. */
  var MAP_FROM = 40;

  var VIEW_KEY = "th:cview:";

  function prefGet(k, d) {
    try { var v = localStorage.getItem(k); return v == null ? d : v; }
    catch (e) { return d; }
  }
  function prefSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  /* ----------------------------------------------------- lesson tooltip ---
     One shared element, positioned on hover and on keyboard focus. A `title`
     attribute would say the same thing but arrives after a delay and cannot
     be styled, and across a row of nineteen tiles that delay is the whole
     cost of the map. */
  var tip = null;

  function showTip(el) {
    var html = el.getAttribute("data-tip");
    if (!html) return;
    if (!tip) {
      tip = document.createElement("div");
      tip.className = "cmap-tip";
      tip.setAttribute("aria-hidden", "true");
      document.body.appendChild(tip);
    }
    tip.innerHTML = html;
    tip.classList.add("on");

    /* position: fixed, so these are viewport coordinates and no scroll maths
       is needed. Clamped horizontally, and flipped below the tile when it
       would otherwise clip off the top of the window. */
    var r = el.getBoundingClientRect();
    var t = tip.getBoundingClientRect();
    var vw = document.documentElement.clientWidth;
    var x = Math.max(8, Math.min(r.left + r.width / 2 - t.width / 2, vw - t.width - 8));
    var y = r.top - t.height - 9;
    if (y < 6) y = r.bottom + 9;
    tip.style.left = Math.round(x) + "px";
    tip.style.top = Math.round(y) + "px";
  }

  function hideTip() { if (tip) tip.classList.remove("on"); }

  /* ======================================================= the map markup ==
     A pure function of the curriculum and the reader's progress, so the test
     harness can call it with the real courses and count what comes back.

       course   the defined course object
       track    which track to draw
       read     { lessonId: 1 } for lessons read; {} is a valid first visit
       nextId   the lesson to ring as "you are here", or null

     Height in px per difficulty, bottom-aligned, so the tops of a module's
     tiles trace its difficulty profile. */
  var DH = { foundation: 13, core: 18, advanced: 24, expert: 29 };

  function tile(l, read, isNext) {
    var h = DH[l.difficulty] || DH.core;
    var soon = l.ready === false;
    var cls = "cmap-tile d-" + (l.difficulty || "core") +
      (soon ? " is-soon" : (read ? " is-read" : " is-open")) +
      (isNext ? " is-next" : "");

    /* Built from escaped text, so a lesson title containing < or & cannot
       inject markup into the tooltip. */
    var inner = "<b>" + EC.esc(l.num + " \u00b7 " + l.title) + "</b><i>" +
      EC.esc((l.difficulty || "core") + " \u00b7 " + l.minutes + " min" +
             (soon ? " \u00b7 coming soon" : (read ? " \u00b7 read" : ""))) + "</i>";
    var label = l.num + " " + l.title + ", " + (l.difficulty || "core") +
      (soon ? ", coming soon" : (read ? ", read" : ""));

    var attrs = ' class="' + cls + '" style="--h:' + h + 'px"' +
      ' data-tip="' + EC.esc(inner) + '"' +
      ' aria-label="' + EC.esc(label) + '"';

    return soon
      ? "<span" + attrs + "></span>"
      : '<a href="' + EC.lessonHref(l) + '"' + attrs + "></a>";
  }

  function keyTile(d, h, state) {
    return '<span class="cmap-tile d-' + d + " " + state + '" style="--h:' + h + 'px"></span>';
  }

  EC.curriculumMapHTML = function (course, track, read, nextId) {
    read = read || {};
    var tr = course.tracks[track];
    var html = "", lastPhase = null, phaseN = 0, modN = 0;

    tr.modules.forEach(function (m) {
      if (m.phase !== lastPhase) {
        phaseN++;
        html += '<div class="phase-h"><span class="phase-n">' + String(phaseN).padStart(2, "0") + "</span>" +
          '<span class="phase-t">' + EC.esc(m.phase) + '</span><span class="rule"></span></div>';
        lastPhase = m.phase;
      }
      modN++;

      var rd = 0, pub = 0;
      m.lessons.forEach(function (l) {
        if (l.ready === false) return;
        pub++;
        if (read[l.id]) rd++;
      });
      var mins = m.lessons.reduce(function (a, l) { return a + l.minutes; }, 0);
      var done = pub > 0 && rd === pub;

      html +=
        '<div class="cmap-row' + (done ? " is-done" : "") + '" data-m="' + m.id +
            '" style="--tc:var(' + MHUES[(modN - 1) % MHUES.length] + ')">' +
          '<button class="cmap-lab" type="button" data-m="' + m.id + '">' +
            '<span class="cmap-n">' + modN + "</span>" +
            '<span class="cmap-t">' + EC.esc(m.title) + "</span>" +
          "</button>" +
          '<div class="cmap-tiles">' +
            m.lessons.map(function (l) {
              return tile(l, !!read[l.id], !!nextId && l.id === nextId);
            }).join("") +
          "</div>" +
          '<div class="cmap-meta">' +
            (rd > 0 ? '<span class="cmap-rd">' + rd + "/" + pub + "</span>"
                    : '<span class="cmap-ct">' + plural(pub, "lesson") + "</span>") +
            '<span class="cmap-tm">' + EC.fmtTime(mins) + "</span>" +
          "</div>" +
        "</div>";
    });

    return html +
      '<div class="cmap-key">' +
        '<span class="cmap-key-g">' +
          keyTile("foundation", 13, "is-open") + keyTile("core", 18, "is-open") +
          keyTile("advanced", 24, "is-open") + keyTile("expert", 29, "is-open") +
          "<i>foundation to expert \u2014 taller is harder</i></span>" +
        '<span class="cmap-key-g">' + keyTile("core", 18, "is-read") + "<i>read</i></span>" +
        '<span class="cmap-key-g">' + keyTile("core", 18, "is-open") + "<i>not yet</i></span>" +
        '<span class="cmap-key-g">' + keyTile("core", 18, "is-soon") + "<i>coming soon</i></span>" +
        '<span class="cmap-key-h">hover a tile for its lesson \u00b7 click to open \u00b7 a module name opens its detail</span>' +
      "</div>";
  };

  EC.renderCoursePage = function (opts) {
    var C = EC.course, I = EC.icons, $ = EC.$, $$ = EC.$$;
    opts = opts || {};

    EC.initTheme();
    EC.initCmdK("");

    var ready = C.readyLessons;
    var totalMin = C.allLessons.reduce(function (a, l) { return a + l.minutes; }, 0);
    var multi = C.trackOrder.length > 1;
    var P = EC.progress;

    /* ---- hero badge, start button, stats ---- */
    var badge = $("#hero-badge");
    if (badge) badge.innerHTML = (opts.icon || "") + "<span>" + EC.esc(opts.badge || C.title) + "</span>";

    var learn = C.tracks[C.trackOrder[0]];
    var nextLesson = learn.readyLessons[0] || learn.lessons[0];
    var start = $("#start-btn");
    var startLabel = $("#start-label");

    /* If the reader has been here before, the primary button resumes instead
       of starting over. The label changes only when there is somewhere to
       resume to, so a first visit reads exactly as it always did. */
    var resumeLesson = null;
    if (P) {
      var lastId = P.state(C.id).last;
      var cand = lastId && C.lessonById[lastId];
      if (cand && cand.ready !== false) resumeLesson = cand;
    }

    if (start) start.href = EC.lessonHref(resumeLesson || nextLesson);
    if (startLabel) {
      if (resumeLesson) startLabel.textContent = "Resume " + resumeLesson.num + " · " + resumeLesson.title;
      else if (opts.startLabel) startLabel.textContent = opts.startLabel;
    }

    var note = $("#cta-note");
    if (note) note.textContent = C.allLessons.length + " lessons · no account, no sign-up.";

    var stats = $("#stats");
    if (stats) {
      /* A course whose unit is not a lesson says so: the practice bank counts
         problem sets and problems, so it passes its own rows rather than
         having "Lessons" imposed on it. */
      var rows = [];
      if (opts.stats) rows = opts.stats.slice();
      else {
        if (multi) rows.push({ v: C.trackOrder.length, l: "Tracks" });
        rows.push({ v: C.modules.length, l: "Modules" });
        rows.push({ v: C.allLessons.length, l: "Lessons" });
        rows.push({ v: Math.round(totalMin / 60) + " hrs", l: "Guided content" });
        rows.push(ready.length < C.allLessons.length
          ? { v: ready.length, l: "Published so far" }
          : { v: opts.statTail || "Executed", l: opts.statTailLabel || "Every reported number" });
      }
      stats.innerHTML = rows.map(function (s) {
        return '<div class="stat"><div class="stat-v">' + s.v + '</div><div class="stat-l">' + s.l + "</div></div>";
      }).join("");
    }

    /* ---- track tabs ---- */
    var tabs = $("#track-tabs");
    if (tabs) {
      if (!multi) { tabs.style.display = "none"; }
      else {
        tabs.innerHTML = C.trackOrder.map(function (t, i) {
          var tr = C.tracks[t];
          var mins = tr.lessons.reduce(function (a, l) { return a + l.minutes; }, 0);
          return '<button class="ttab' + (i === 0 ? " on" : "") + '" type="button" data-track="' + t + '">' +
            '<span class="ttab-t">' + EC.esc(tr.label) + "</span>" +
            '<span class="ttab-m">' + plural(tr.modules.length, "module") + " · " + plural(tr.lessons.length, "lesson") + " · " +
              EC.fmtTime(mins) + "</span>" +
            (tr.blurb ? '<span class="ttab-b">' + EC.esc(tr.blurb) + "</span>" : "") +
            "</button>";
        }).join("");
        tabs.addEventListener("click", function (e) {
          var b = e.target.closest(".ttab");
          if (!b) return;
          $$(".ttab", tabs).forEach(function (x) { x.classList.toggle("on", x === b); });
          renderTrack(b.getAttribute("data-track"));
        });
      }
    }

    /* ------------------------------------------------- the two containers ---
       Injected rather than written into fifteen pages, so a page still needs
       only the #curriculum-list it already has. */
    var host = $("#curriculum-list");
    host.innerHTML = '<div class="cmap" id="cmap"></div><div class="clist" id="clist"></div>';
    var mapEl = $("#cmap"), listEl = $("#clist");

    /* The view switch sits beside "Expand all", which means nothing in the
       map and is hidden there. */
    var expandBtn = $("#expand-all");
    var switcher = document.createElement("div");
    switcher.className = "cview";
    switcher.setAttribute("role", "group");
    switcher.setAttribute("aria-label", "Curriculum view");
    switcher.innerHTML =
      '<button class="cview-b" type="button" data-v="map" aria-pressed="false">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
        '<rect x="3" y="4" width="7" height="4" rx="1"/><rect x="3" y="14" width="7" height="4" rx="1"/>' +
        '<rect x="14" y="4" width="7" height="4" rx="1"/><rect x="14" y="14" width="7" height="4" rx="1"/></svg>' +
        "<span>Map</span></button>" +
      '<button class="cview-b" type="button" data-v="list" aria-pressed="false">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
        '<line x1="8" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="20" y2="12"/><line x1="8" y1="18" x2="20" y2="18"/>' +
        '<circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></svg>' +
        "<span>Detailed</span></button>";
    if (expandBtn && expandBtn.parentNode) expandBtn.parentNode.insertBefore(switcher, expandBtn);

    /* The resume strip goes directly above the curriculum, where it is the
       first thing in reach once a reader has history. */
    var resumeEl = document.createElement("div");
    resumeEl.className = "cresume";
    resumeEl.hidden = true;
    host.parentNode.insertBefore(resumeEl, multi && tabs ? tabs : host);

    /* -------------------------------------------------------- the map ----- */

    function renderMap(track) {
      var st = P ? P.state(C.id) : { read: {} };
      var tr = C.tracks[track];
      var nl = (resumeLesson && resumeLesson.track === track ? resumeLesson : null) ||
               tr.readyLessons[0] || tr.lessons[0];
      mapEl.innerHTML = EC.curriculumMapHTML(C, track, st.read, nl && nl.id);
    }

    /* ---------------------------------------------------- the accordion --- */

    function renderList(track) {
      var html = "", lastPhase = null, phaseN = 0, modN = 0;
      var st = P ? P.state(C.id) : { read: {} };

      C.tracks[track].modules.forEach(function (m) {
        if (m.phase !== lastPhase) {
          phaseN++;
          html += '<div class="phase-h"><span class="phase-n">' + String(phaseN).padStart(2, "0") + "</span>" +
            '<span class="phase-t">' + EC.esc(m.phase) + '</span><span class="rule"></span></div>';
          lastPhase = m.phase;
        }
        var rd = m.lessons.filter(function (l) { return l.ready !== false; });
        var mins = m.lessons.reduce(function (a, l) { return a + l.minutes; }, 0);
        modN++;

        var readN = m.lessons.filter(function (l) { return l.ready !== false && st.read[l.id]; }).length;

        // What is inside, without expanding. Capped so a nineteen-lesson
        // module does not turn the card into a wall of chips.
        var SHOWN = 7;
        var tags = m.lessons.slice(0, SHOWN).map(function (l) {
          return '<span class="mtag" title="' + EC.esc(l.title) + '">' + EC.esc(l.title) + "</span>";
        }).join("") + (m.lessons.length > SHOWN
          ? '<span class="mtag more">+' + (m.lessons.length - SHOWN) + " more</span>" : "");

        html +=
          '<div class="mcard" data-m="' + m.id + '" style="--tc:var(' + MHUES[(modN - 1) % MHUES.length] + ')">' +
            '<button class="mcard-h" type="button" aria-expanded="false">' +
              '<span class="mcard-lv">' + EC.esc(m.short) + "</span>" +
              '<span class="mcard-main">' +
                '<span class="mcard-t"><span class="mcard-num">' + modN + ".</span>" + EC.esc(m.title) + "</span>" +
                '<span class="mcard-b">' + EC.esc(m.blurb) + "</span>" +
                '<span class="mcard-tags">' + tags + "</span>" +
              "</span>" +
              '<span class="mcard-right">' +
                (readN > 0
                  ? '<span class="mcard-rd' + (readN === rd.length ? " all" : "") + '">' +
                      readN + "/" + rd.length + " read</span>"
                  : "") +
                '<span class="mcard-count">' + m.lessons.length + " lessons</span>" +
                '<span class="mcard-time">' + EC.fmtTime(mins) + "</span>" +
                (rd.length < m.lessons.length
                  ? '<span class="mcard-soon">' + (m.lessons.length - rd.length) + " soon</span>" : "") +
                '<span class="mcard-chev">' + I.chevron + "</span>" +
              "</span>" +
            "</button>" +
            '<div class="mcard-body" hidden>' +
              (m.outcome ? '<div class="mcard-outcome">' + I.target + "<span>" + EC.esc(m.outcome) + "</span></div>" : "") +
              '<ul class="llist">' +
                m.lessons.map(function (l) {
                  var soon = l.ready === false;
                  var read = !soon && !!st.read[l.id];
                  return '<li class="' + (read ? "is-read" : "") + '">' +
                    (soon ? '<a aria-disabled="true">' : '<a href="' + EC.lessonHref(l) + '">') +
                      '<span class="ll-n">' + l.num + "</span>" +
                      '<span class="ll-main"><span class="ll-t">' + EC.esc(l.title) + "</span>" +
                      '<span class="ll-s">' + EC.esc(l.summary) + "</span></span>" +
                      '<span class="ll-right">' +
                        (read ? '<span class="ll-read" aria-label="Read">' + I.check + "</span>" : "") +
                        '<span class="badge ' + l.difficulty + '"><span class="dot"></span>' + l.difficulty + "</span>" +
                        '<span class="ll-time">' + l.minutes + " min</span>" +
                        (soon ? '<span class="lsn-soon">soon</span>' : "") +
                      "</span>" +
                    "</a></li>";
                }).join("") +
              "</ul>" +
            "</div>" +
          "</div>";
      });

      listEl.innerHTML = html;
      if (expandBtn) expandBtn.textContent = "Expand all";
      expanded = false;

      // Open the module holding the reader's next lesson, so the page lands on
      // something actionable rather than a wall of closed accordions.
      var tr = C.tracks[track];
      var nl = (resumeLesson && resumeLesson.track === track ? resumeLesson : null) ||
               tr.readyLessons[0] || tr.lessons[0];
      openModule(nl && nl.module.id);
    }

    function openModule(id) {
      if (!id) return null;
      var card = $('.mcard[data-m="' + id + '"]', listEl);
      if (!card) return null;
      card.classList.add("open");
      $(".mcard-body", card).hidden = false;
      $(".mcard-h", card).setAttribute("aria-expanded", "true");
      return card;
    }

    /* -------------------------------------------------- the resume strip -- */

    function renderResume(track) {
      if (!P) { resumeEl.hidden = true; return; }
      var tr = C.tracks[track];
      var t = P.tally(C.id, tr.lessons);
      if (!t.read) { resumeEl.hidden = true; return; }

      /* Where to go back to: the lesson last opened if it belongs to this
         track, otherwise the first one in it still unread. */
      var go = (resumeLesson && resumeLesson.track === track ? resumeLesson : null) ||
        tr.readyLessons.filter(function (l) { return !P.isRead(C.id, l.id); })[0] ||
        tr.readyLessons[0];

      resumeEl.hidden = false;
      resumeEl.innerHTML =
        '<div class="cresume-main">' +
          '<span class="cresume-k">Pick up where you left off</span>' +
          (go ? '<a class="cresume-go" href="' + EC.lessonHref(go) + '"><b>' +
                  EC.esc(go.num + " · " + go.title) + "</b>" + I.arrowR + "</a>"
              : '<span class="cresume-done">Every published lesson in this track is read.</span>') +
        "</div>" +
        '<div class="cresume-side">' +
          '<span class="cresume-n">' + t.read + " of " + t.total + " read · " + t.pct + "%</span>" +
          '<span class="cbar"><span style="width:' + t.pct + '%"></span></span>' +
          '<button class="cresume-rs" type="button">Reset</button>' +
        "</div>";
    }

    resumeEl.addEventListener("click", function (e) {
      if (!e.target.closest(".cresume-rs")) return;
      if (!window.confirm("Forget which lessons of " + C.title + " you have read?\n\n" +
                          "This clears it in this browser only — nothing is stored anywhere else.")) return;
      P && P.clear(C.id);
      resumeLesson = null;
      if (startLabel && opts.startLabel) startLabel.textContent = opts.startLabel;
      if (start) start.href = EC.lessonHref(nextLesson);
      renderTrack(curTrack);
    });

    /* ----------------------------------------------------- view plumbing -- */

    var curTrack = C.trackOrder[0];
    var expanded = false;
    var view = prefGet(VIEW_KEY + C.id, learn.lessons.length >= MAP_FROM ? "map" : "list");
    if (view !== "map" && view !== "list") view = "list";

    function applyView() {
      mapEl.hidden = view !== "map";
      listEl.hidden = view !== "list";
      if (expandBtn) expandBtn.hidden = view !== "list";
      $$(".cview-b", switcher).forEach(function (b) {
        var on = b.getAttribute("data-v") === view;
        b.classList.toggle("on", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });
      hideTip();
      EC.initReveal && EC.initReveal(view === "map" ? mapEl : listEl);
    }

    function renderTrack(track) {
      curTrack = track;
      renderResume(track);
      renderMap(track);
      renderList(track);
      applyView();
    }

    switcher.addEventListener("click", function (e) {
      var b = e.target.closest(".cview-b");
      if (!b) return;
      view = b.getAttribute("data-v");
      prefSet(VIEW_KEY + C.id, view);
      applyView();
    });

    /* A module name in the map opens that module in the detailed view: the map
       answers "what is in this course", the accordion answers "what is in this
       module", and this is the door between them. */
    mapEl.addEventListener("click", function (e) {
      var lab = e.target.closest(".cmap-lab");
      if (!lab) return;
      view = "list";
      prefSet(VIEW_KEY + C.id, view);
      applyView();
      var card = openModule(lab.getAttribute("data-m"));
      if (card) card.scrollIntoView({ block: "center", behavior: "smooth" });
    });

    mapEl.addEventListener("pointerover", function (e) {
      var t = e.target.closest(".cmap-tile");
      if (t && !t.closest(".cmap-key")) showTip(t);
    });
    mapEl.addEventListener("pointerout", function (e) {
      if (e.target.closest(".cmap-tile")) hideTip();
    });
    mapEl.addEventListener("focusin", function (e) {
      var t = e.target.closest(".cmap-tile");
      if (t) showTip(t);
    });
    mapEl.addEventListener("focusout", hideTip);
    window.addEventListener("scroll", hideTip, { passive: true });

    listEl.addEventListener("click", function (e) {
      var b = e.target.closest(".mcard-h");
      if (!b) return;
      var card = b.parentElement;
      var open = card.classList.toggle("open");
      $(".mcard-body", card).hidden = !open;
      b.setAttribute("aria-expanded", open ? "true" : "false");
    });

    if (expandBtn) expandBtn.addEventListener("click", function () {
      expanded = !expanded;
      $$(".mcard", listEl).forEach(function (c) {
        c.classList.toggle("open", expanded);
        $(".mcard-body", c).hidden = !expanded;
        $(".mcard-h", c).setAttribute("aria-expanded", expanded ? "true" : "false");
      });
      this.textContent = expanded ? "Collapse all" : "Expand all";
    });

    renderTrack(curTrack);

    /* ---- fit lists: markup carries the copy, this adds the icons ---- */
    var yes = $("#fit-yes"), no = $("#fit-no");
    if (yes && opts.fitYes) yes.innerHTML = opts.fitYes.map(function (t) { return "<li>" + I.check + "<span>" + t + "</span></li>"; }).join("");
    if (no && opts.fitNo) no.innerHTML = opts.fitNo.map(function (t) { return "<li>" + I.chevron + "<span>" + t + "</span></li>"; }).join("");

    EC.initReveal && EC.initReveal();
  };
})();
