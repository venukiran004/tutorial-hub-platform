/* ============================================================================
   TUTORIAL HUB — COURSE LANDING PAGE
   ----------------------------------------------------------------------------
   One script for every course's index.html. The page keeps its own hero copy
   and its "fit" lists in markup; everything derived from the curriculum —
   the stats strip, the track tabs, the module cards, the lesson lists, the
   start button — is rendered here so six courses cannot drift apart.

   Usage, at the end of a course index.html:

     EC.renderCoursePage({ icon: I.bulb, badge: "Course 07 · Deep Learning",
                           startLabel: "Start with the perceptron" });
   ========================================================================= */
(function () {
  "use strict";

  // One hue per module, so a section is recognisable by colour before its
  // name is read — the same device the home page uses for topics.
  var MHUES = ["--t-blue", "--t-violet", "--t-cyan", "--t-orange", "--t-green",
               "--t-amber", "--t-pink"];

  EC.renderCoursePage = function (opts) {
    var C = EC.course, I = EC.icons, $ = EC.$, $$ = EC.$$;
    opts = opts || {};

    EC.initTheme();
    EC.initCmdK("");

    var ready = C.readyLessons;
    var totalMin = C.allLessons.reduce(function (a, l) { return a + l.minutes; }, 0);
    var multi = C.trackOrder.length > 1;

    /* ---- hero badge, start button, stats ---- */
    var badge = $("#hero-badge");
    if (badge) badge.innerHTML = (opts.icon || "") + "<span>" + EC.esc(opts.badge || C.title) + "</span>";

    var learn = C.tracks[C.trackOrder[0]];
    var nextLesson = learn.readyLessons[0] || learn.lessons[0];
    var start = $("#start-btn");
    if (start && nextLesson) start.href = EC.lessonHref(nextLesson);
    var startLabel = $("#start-label");
    if (startLabel && opts.startLabel) startLabel.textContent = opts.startLabel;
    var note = $("#cta-note");
    if (note) note.textContent = C.allLessons.length + " lessons · no account, no sign-up.";

    var stats = $("#stats");
    if (stats) {
      var rows = [];
      if (multi) rows.push({ v: C.trackOrder.length, l: "Tracks" });
      rows.push({ v: C.modules.length, l: "Modules" });
      rows.push({ v: C.allLessons.length, l: "Lessons" });
      rows.push({ v: Math.round(totalMin / 60) + " hrs", l: "Guided content" });
      rows.push(ready.length < C.allLessons.length
        ? { v: ready.length, l: "Published so far" }
        : { v: opts.statTail || "Executed", l: opts.statTailLabel || "Every reported number" });
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
            '<span class="ttab-m">' + tr.modules.length + " modules · " + tr.lessons.length + " lessons · " +
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

    /* ---- curriculum, per track ---- */
    function renderTrack(track) {
      var html = "", lastPhase = null, phaseN = 0, modN = 0;
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

        // What is inside, without expanding. Capped so a fourteen-lesson
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
                (m.source ? '<span class="mcard-src">' + I.link + "<span>" + EC.esc(m.source) + "</span></span>" : "") +
                '<span class="mcard-tags">' + tags + "</span>" +
              "</span>" +
              '<span class="mcard-right">' +
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
                  return "<li>" +
                    (soon ? '<a aria-disabled="true">' : '<a href="' + EC.lessonHref(l) + '">') +
                      '<span class="ll-n">' + l.num + "</span>" +
                      '<span class="ll-main"><span class="ll-t">' + EC.esc(l.title) + "</span>" +
                      '<span class="ll-s">' + EC.esc(l.summary) + "</span></span>" +
                      '<span class="ll-right">' +
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
      $("#curriculum-list").innerHTML = html;
      $("#expand-all").textContent = "Expand all";
      expanded = false;

      // Open the module containing the learner's next lesson, so the page
      // lands on something actionable rather than a wall of closed accordions.
      var tr = C.tracks[track];
      var nl = tr.readyLessons[0] || tr.lessons[0];
      var card = nl && $('.mcard[data-m="' + nl.module.id + '"]');
      if (card) { card.classList.add("open"); $(".mcard-body", card).hidden = false; $(".mcard-h", card).setAttribute("aria-expanded", "true"); }
    }

    var expanded = false;
    renderTrack(C.trackOrder[0]);

    $("#curriculum-list").addEventListener("click", function (e) {
      var b = e.target.closest(".mcard-h");
      if (!b) return;
      var card = b.parentElement;
      var open = card.classList.toggle("open");
      $(".mcard-body", card).hidden = !open;
      b.setAttribute("aria-expanded", open ? "true" : "false");
    });

    $("#expand-all").addEventListener("click", function () {
      expanded = !expanded;
      $$(".mcard").forEach(function (c) {
        c.classList.toggle("open", expanded);
        $(".mcard-body", c).hidden = !expanded;
        $(".mcard-h", c).setAttribute("aria-expanded", expanded ? "true" : "false");
      });
      this.textContent = expanded ? "Collapse all" : "Expand all";
    });

    /* ---- fit lists: markup carries the copy, this adds the icons ---- */
    var yes = $("#fit-yes"), no = $("#fit-no");
    if (yes && opts.fitYes) yes.innerHTML = opts.fitYes.map(function (t) { return "<li>" + I.check + "<span>" + t + "</span></li>"; }).join("");
    if (no && opts.fitNo) no.innerHTML = opts.fitNo.map(function (t) { return "<li>" + I.chevron + "<span>" + t + "</span></li>"; }).join("");

    EC.initReveal && EC.initReveal();
  };
})();
