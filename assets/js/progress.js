/* ============================================================================
   TUTORIAL HUB — READING PROGRESS
   ----------------------------------------------------------------------------
   Remembers which lessons a reader finished, per course, in localStorage. The
   curriculum map draws from it and the lesson page writes to it.

   Two signals, deliberately kept apart:

     touch(course, id)   the lesson was OPENED. Moves the resume pointer.
     mark(course, id)    the lesson was READ TO THE END. Fills its tile.

   Opening a lesson is not reading it, so a tile only fills once the reader
   reaches the takeaways. That keeps "23 of 141 read" an honest sentence.

   Everything here is a convenience, never a requirement: localStorage throws
   in a private window and can be cleared at any time, so every call is
   wrapped and every failure degrades to "no progress recorded" rather than
   to a broken page. Nothing is sent anywhere — the site has no accounts and
   this does not change that.
   ========================================================================= */
(function () {
  "use strict";

  if (typeof window === "undefined" || !window.EC) return;

  var EC = window.EC;

  /* Bumping this discards older shapes rather than trying to migrate them;
     the data is re-earned by reading, so a reset costs the reader nothing
     they cannot get back. */
  var V = 1;
  var PREFIX = "th:progress:";

  function key(course) { return PREFIX + course; }

  function empty() { return { read: {}, last: null, at: 0 }; }

  function load(course) {
    var st = empty();
    if (!course) return st;
    var raw;
    try { raw = localStorage.getItem(key(course)); } catch (e) { return st; }
    if (!raw) return st;

    var d;
    try { d = JSON.parse(raw); } catch (e) { return st; }
    if (!d || d.v !== V || !Array.isArray(d.read)) return st;

    /* Stored as an array and used as a set: an array keeps the JSON small,
       a set keeps isRead() constant-time on a 179-lesson course. */
    d.read.forEach(function (id) { if (typeof id === "string") st.read[id] = 1; });
    st.last = typeof d.last === "string" ? d.last : null;
    st.at = typeof d.at === "number" ? d.at : 0;
    return st;
  }

  function save(course, st) {
    if (!course) return false;
    try {
      localStorage.setItem(key(course), JSON.stringify({
        v: V, read: Object.keys(st.read), last: st.last, at: st.at
      }));
      return true;
    } catch (e) {
      return false;   // private window, or quota: silently do without
    }
  }

  EC.progress = {

    /* A snapshot. Callers read it freely; it is not live, so re-read after
       any write. */
    state: load,

    isRead: function (course, id) {
      return !!load(course).read[id];
    },

    /* Read to the end. Also moves the resume pointer, because the lesson you
       just finished is the right place to come back to -- the pager at the
       bottom of it points at what is next. */
    mark: function (course, id) {
      if (!id) return false;
      var st = load(course);
      st.read[id] = 1;
      st.last = id;
      st.at = Date.now();
      return save(course, st);
    },

    /* Opened. Moves the pointer without claiming the lesson was read. */
    touch: function (course, id) {
      if (!id) return false;
      var st = load(course);
      st.last = id;
      st.at = Date.now();
      return save(course, st);
    },

    /* Counts against a specific list of lessons, so a course with several
       tracks can report each one separately. "soon" lessons are excluded:
       a denominator that counts unwritten lessons would make full progress
       unreachable. */
    tally: function (course, lessons) {
      var st = load(course), n = 0, total = 0;
      (lessons || []).forEach(function (l) {
        if (l.ready === false) return;
        total++;
        if (st.read[l.id]) n++;
      });
      return { read: n, total: total, pct: total ? Math.round((n / total) * 100) : 0 };
    },

    clear: function (course) {
      try { localStorage.removeItem(key(course)); return true; }
      catch (e) { return false; }
    }
  };

  /* ====================================================== the lesson side ==
     Recording is wired here rather than from lesson-page.js because four
     courses still paint their lessons with an inline copy of that renderer.
     This hooks the page itself, so every lesson records progress no matter
     which renderer drew it, and nothing else needs to know.

     The signal for "read" is the takeaways block coming into view — it sits
     below the whole body, so reaching it means the lesson was scrolled
     through. Opening alone only moves the resume pointer.
     ===================================================================== */

  function initLesson() {
    var body = document.getElementById("lesson-body");
    if (!body || !EC.course || !EC.course.id) return;

    var id;
    try { id = new URLSearchParams(location.search).get("id"); } catch (e) { return; }
    if (!id || !EC.course.lessonById || !EC.course.lessonById[id]) return;

    EC.progress.touch(EC.course.id, id);

    if (EC.progress.isRead(EC.course.id, id)) return;   // already recorded

    function watch(el) {
      if (!window.IntersectionObserver) {
        /* No observer: fall back to recording on the way out, which is a
           weaker signal than reaching the takeaways but better than losing
           the lesson from the count entirely. */
        window.addEventListener("beforeunload", function () {
          EC.progress.mark(EC.course.id, id);
        });
        return;
      }
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          EC.progress.mark(EC.course.id, id);
          io.disconnect();
        });
      }, { threshold: 0.2 });
      io.observe(el);
    }

    var tk = body.querySelector(".takeaways");
    if (tk) { watch(tk); return; }

    /* The body is painted after this script runs, so wait for it. The
       observer disconnects itself the moment the block appears. */
    if (!window.MutationObserver) return;
    var mo = new MutationObserver(function () {
      var el = body.querySelector(".takeaways");
      if (!el) return;
      mo.disconnect();
      watch(el);
    });
    mo.observe(body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initLesson);
  } else {
    initLesson();
  }
})();
