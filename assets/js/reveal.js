/* ============================================================================
   TUTORIAL HUB — SCROLL REVEAL
   ----------------------------------------------------------------------------
   Defines EC.initReveal, which course-page.js and lesson-page.js have always
   called behind a `&&` guard and which nothing ever supplied. Loading this
   file turns the hook on; not loading it leaves those call sites as no-ops,
   which is why they were written that way.

   It is progressive in both directions: without IntersectionObserver, or
   under prefers-reduced-motion, no class is added and every element renders
   in its final state. The CSS that animates it only ever applies to elements
   this script has marked.
   ========================================================================= */
(function () {
  "use strict";

  if (typeof window === "undefined" || !window.EC) return;

  /* Elements worth revealing: the ones that arrive as a group and read as a
     sequence. Prose is deliberately absent -- animating a paragraph the
     reader is trying to read is a cost with no benefit. */
  var SELECTOR = ".stat, .ls-step, .mcard, .split-box, .feat";

  /* Per-item stagger, capped so a long list does not end up waiting on a
     delay longer than the animation itself. */
  var STEP_MS = 40;
  var MAX_STEPS = 5;

  EC.initReveal = function (root) {
    var scope = root || document;

    if (!window.IntersectionObserver) return;
    if (window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    var targets = [].slice.call(scope.querySelectorAll(SELECTOR))
      .filter(function (el) { return !el.classList.contains("cp-reveal"); });

    if (!targets.length) return;

    targets.forEach(function (el, i) {
      el.classList.add("cp-reveal");
      el.style.transitionDelay = Math.min(i % (MAX_STEPS + 1), MAX_STEPS) * STEP_MS + "ms";
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("cp-in");
        /* Once shown, stop watching: the reveal is a one-way transition and
           re-animating on scroll-up is a distraction. */
        io.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.06 });

    targets.forEach(function (el) { io.observe(el); });
  };
})();
