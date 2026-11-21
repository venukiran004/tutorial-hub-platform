/* ============================================================================
   home-vis.js — the home page's visuals.

   1. The curriculum map in the hero: every course as a node, grouped into the
      five stages of the learning path, with the dependencies between them
      drawn as edges. It is generated from window.HOME_PATH, the same data the
      learning-path section renders, so the picture cannot drift from the list.
   2. A small illustration on every course card, keyed by the course folder.
   3. Stat numbers that count up once, when they scroll into view.

   Everything is inline SVG coloured by theme tokens, so it follows light and
   dark mode and works with the network off. Motion is skipped entirely under
   prefers-reduced-motion.
   ========================================================================= */
(function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  var reduce = !window.matchMedia || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var STAGE_HUES = ["--t-blue", "--t-violet", "--t-cyan", "--t-orange", "--t-green"];

  /* ------------------------------------------------------------ the map -- */
  var SHORT = { python: "Python", sql: "SQL", maths: "Maths", data: "Data", practice: "Practice", dsa: "DSA",
    ml: "ML", dl: "Deep Learning", nlp: "NLP & Transformers", genai: "GenAI", langchain: "LangGraph",
    mcp: "MCP", adk: "ADK", sysdesign: "System Design", mlops: "MLOps", interview: "Interviews" };

  /* What each course builds on. Only edges between consecutive stages are
     drawn straight; the two that skip stages (DSA and Practice feeding the
     interview course) run down the right-hand edge. */
  var EDGES = [
    ["python", "ml"], ["maths", "ml"], ["data", "ml"], ["sql", "ml"], ["python", "dl"], ["maths", "dl"],
    ["ml", "nlp"], ["dl", "nlp"],
    ["nlp", "genai"], ["nlp", "langchain"], ["nlp", "mcp"], ["nlp", "adk"],
    ["genai", "sysdesign"], ["genai", "mlops"], ["langchain", "mlops"], ["adk", "mlops"], ["mcp", "sysdesign"], ["genai", "interview"],
    ["dsa", "interview"], ["practice", "interview"]
  ];

  function el(name, attrs, parent) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  function drawMap(host, path) {
    var W = 600, H = 470, X0 = 96, X1 = 586, PH = 30, ROW0 = 40, STEP = 98;
    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, role: "img",
      "aria-label": "Curriculum map: sixteen courses in five stages, from foundations to shipping, with the dependencies between them" });
    var defs = el("defs", {}, svg);
    var glow = el("filter", { id: "hm-glow", x: "-50%", y: "-50%", width: "200%", height: "200%" }, defs);
    el("feGaussianBlur", { stdDeviation: "2.4" }, glow);
    var grid = el("pattern", { id: "hm-dots", width: "20", height: "20", patternUnits: "userSpaceOnUse" }, defs);
    el("circle", { cx: "1", cy: "1", r: "1", class: "hm-dot" }, grid);
    el("rect", { x: 0, y: 0, width: W, height: H, fill: "url(#hm-dots)", class: "hm-bg" }, svg);

    var pos = {}, edgeLayer = el("g", { class: "hm-edges" }, svg), pulseLayer = el("g", {}, svg), nodeLayer = el("g", {}, svg);

    path.forEach(function (stage, r) {
      var y = ROW0 + r * STEP, n = stage.c.length, gap = 9;
      var w = Math.min(150, (X1 - X0 - gap * (n - 1)) / n);
      var total = n * w + (n - 1) * gap, x = X0 + (X1 - X0 - total) / 2;
      var hue = "var(" + STAGE_HUES[r] + ")";
      var lab = el("text", { x: 14, y: y + 5, class: "hm-stage" }, svg);
      lab.textContent = stage.n;
      var lab2 = el("text", { x: 14, y: y + 19, class: "hm-stage-t" }, svg);
      lab2.textContent = stage.t;
      stage.c.forEach(function (c, i) {
        var key = c[0], cx = x + i * (w + gap) + w / 2;
        pos[key] = { x: cx, y: y, hue: hue };
        var a = el("a", { href: "courses/" + key + "/index.html", class: "hm-node" }, nodeLayer);
        a.style.setProperty("--nc", hue);
        el("title", {}, a).textContent = c[1];
        el("rect", { x: cx - w / 2, y: y - PH / 2, width: w, height: PH, rx: 15, class: "hm-pill" }, a);
        var t = el("text", { x: cx, y: y + 4, "text-anchor": "middle", class: "hm-label" }, a);
        t.textContent = SHORT[key] || c[1];
      });
    });

    EDGES.forEach(function (e, i) {
      var a = pos[e[0]], b = pos[e[1]];
      if (!a || !b) return;
      var y1 = a.y + PH / 2, y2 = b.y - PH / 2, d;
      if (b.y - a.y > STEP * 1.5) {            // skips stages: route down the right-hand edge
        d = "M" + a.x + " " + y1 + " C" + (W - 4) + " " + (y1 + 70) + " " + (W - 4) + " " + (y2 - 70) + " " + b.x + " " + y2;
      } else {
        var m = (y1 + y2) / 2;
        d = "M" + a.x + " " + y1 + " C" + a.x + " " + m + " " + b.x + " " + m + " " + b.x + " " + y2;
      }
      var p = el("path", { id: "hm-e" + i, d: d, class: "hm-edge" }, edgeLayer);
      p.style.setProperty("--ec", a.hue);
      if (reduce) return;
      var dot = el("circle", { r: "2.6", class: "hm-pulse", filter: "url(#hm-glow)" }, pulseLayer);
      dot.style.setProperty("--ec", b.hue);
      var mo = el("animateMotion", { dur: (2.8 + (i * 0.37) % 2.4).toFixed(2) + "s", begin: ((i * 0.53) % 3).toFixed(2) + "s",
        repeatCount: "indefinite", rotate: "auto" }, dot);
      el("mpath", { href: "#hm-e" + i }, mo);
    });
    host.insertBefore(svg, host.firstChild);   // above the caption
  }

  /* ------------------------------------------------- card illustrations -- */
  /* Each is a 240x72 sketch of the course's central idea, stroked in the
     card's own hue (currentColor). */
  function bars(xs) { return xs.join(""); }
  var ART = {
    python: function () {
      return bars([
        '<rect x="22" y="12" width="26" height="7" rx="3.5" class="a-fill"/>', '<rect x="54" y="12" width="64" height="7" rx="3.5" class="a-soft"/>',
        '<rect x="40" y="25" width="22" height="7" rx="3.5" class="a-fill"/>', '<rect x="68" y="25" width="90" height="7" rx="3.5" class="a-soft"/>',
        '<rect x="58" y="38" width="80" height="7" rx="3.5" class="a-soft"/>',
        '<rect x="40" y="51" width="34" height="7" rx="3.5" class="a-fill"/>', '<rect x="80" y="51" width="46" height="7" rx="3.5" class="a-soft"/>',
        '<rect x="132" y="49" width="2" height="11" class="a-fill a-blink"/>']);
    },
    dsa: function () {
      return '<g class="a-line"><path d="M120 14 L80 36 M120 14 L160 36 M80 36 L60 58 M80 36 L100 58 M160 36 L180 58"/></g>' +
        '<path d="M120 14 L160 36 L140 58" class="a-strong"/>' +
        '<circle cx="120" cy="14" r="6" class="a-fill"/><circle cx="80" cy="36" r="5" class="a-ring"/><circle cx="160" cy="36" r="6" class="a-fill"/>' +
        '<circle cx="60" cy="58" r="5" class="a-ring"/><circle cx="100" cy="58" r="5" class="a-ring"/><circle cx="140" cy="58" r="6" class="a-fill"/><circle cx="180" cy="58" r="5" class="a-ring"/>';
    },
    practice: function () {
      var s = "", lv = [0.15, 0.35, 0.6, 0.9];
      for (var r = 0; r < 4; r++) for (var c = 0; c < 14; c++) {
        var v = lv[(c * 7 + r * 3 + (c * r) % 5) % 4];
        s += '<rect x="' + (24 + c * 14) + '" y="' + (9 + r * 14) + '" width="11" height="11" rx="2.5" class="a-fill" opacity="' + v + '"/>';
      }
      return s;
    },
    maths: function () {
      return '<path d="M20 62 H220" class="a-line"/>' +
        '<path d="M150 62 L150 44 C160 54 175 60 200 61.5 L200 62 Z" class="a-area"/>' +
        '<path d="M24 61.5 C70 60 90 12 120 12 C150 12 170 60 216 61.5" class="a-strong"/>' +
        '<path d="M120 12 V62" class="a-dash"/>';
    },
    data: function () {
      var s = "";
      for (var r = 0; r < 4; r++) for (var c = 0; c < 6; c++)
        s += '<rect x="' + (30 + c * 31) + '" y="' + (10 + r * 14) + '" width="27" height="10" rx="2" class="' + (c === 3 ? "a-fill" : r === 0 ? "a-mid" : "a-soft") + '"/>';
      return s;
    },
    sql: function () {
      var s = "";
      for (var r = 0; r < 4; r++) {
        s += '<rect x="26" y="' + (10 + r * 14) + '" width="62" height="10" rx="2" class="' + (r === 0 ? "a-mid" : "a-soft") + '"/>';
        s += '<rect x="152" y="' + (10 + r * 14) + '" width="62" height="10" rx="2" class="' + (r === 0 ? "a-mid" : "a-soft") + '"/>';
      }
      return s + '<path d="M88 29 C120 29 120 43 152 43 M88 43 C120 43 120 29 152 29 M88 57 C120 57 120 57 152 57" class="a-strong"/>';
    },
    ml: function () {
      var a = [[40, 18], [58, 30], [36, 44], [72, 50], [92, 22], [60, 60], [84, 38]], b = [[150, 20], [176, 34], [196, 16], [160, 52], [204, 50], [132, 46], [184, 60]];
      return '<path d="M70 70 L180 2" class="a-dash"/>' +
        a.map(function (p) { return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="4.5" class="a-fill"/>'; }).join("") +
        b.map(function (p) { return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="4.5" class="a-ring"/>'; }).join("");
    },
    dl: function () {
      var L = [[3, 50], [4, 100], [4, 150], [2, 196]], nodes = [], s = "";
      L.forEach(function (l) { var col = []; for (var i = 0; i < l[0]; i++) col.push([l[1], 36 + (i - (l[0] - 1) / 2) * 15]); nodes.push(col); });
      for (var k = 0; k < nodes.length - 1; k++) nodes[k].forEach(function (p) { nodes[k + 1].forEach(function (q) {
        s += '<path d="M' + p[0] + " " + p[1] + " L" + q[0] + " " + q[1] + '" class="a-line"/>'; }); });
      nodes.forEach(function (col, k) { col.forEach(function (p) {
        s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="5" class="' + (k === nodes.length - 1 ? "a-fill" : "a-ring") + '"/>'; }); });
      return s;
    },
    nlp: function () {
      var s = "";
      for (var i = 0; i < 6; i++) s += '<rect x="' + (24 + i * 33) + '" y="50" width="28" height="13" rx="3" class="' + (i === 4 ? "a-fill" : "a-soft") + '"/>';
      return s + '<path d="M38 48 C38 16 166 16 166 48" class="a-strong"/><path d="M71 48 C71 26 166 26 166 48" class="a-line" stroke-width="2.4"/>' +
        '<path d="M137 48 C137 36 166 36 166 48" class="a-line"/><path d="M104 48 C104 30 166 30 166 48" class="a-line" stroke-width="1"/>';
    },
    genai: function () {
      var h = [46, 30, 20, 13, 9, 6, 4, 3, 2], s = '<path d="M24 62 H218" class="a-line"/>';
      h.forEach(function (v, i) { s += '<rect x="' + (30 + i * 21) + '" y="' + (62 - v) + '" width="14" height="' + v + '" rx="2" class="' + (i === 0 ? "a-fill" : "a-mid") + '"/>'; });
      return s + '<path d="M24 26 H218" class="a-dash"/>';
    },
    langchain: function () {
      var xs = [36, 92, 148, 204], s = "";
      for (var i = 0; i < 3; i++) s += '<path d="M' + (xs[i] + 13) + ' 44 L' + (xs[i + 1] - 15) + ' 44" class="a-strong" marker-end="url(#a-arrow)"/>';
      s += '<path d="M148 31 C148 6 92 6 92 31" class="a-dash" marker-end="url(#a-arrow)"/>';
      xs.forEach(function (x, i) { s += '<circle cx="' + x + '" cy="44" r="11" class="' + (i === 2 ? "a-fill" : "a-ring") + '"/>'; });
      return s;
    },
    mcp: function () {
      var t = [[44, 18], [44, 54], [196, 18], [196, 54]], s = "";
      t.forEach(function (p) { s += '<path d="M120 36 L' + p[0] + " " + p[1] + '" class="a-line"/>'; });
      t.forEach(function (p, i) { s += '<rect x="' + (p[0] - 16) + '" y="' + (p[1] - 8) + '" width="32" height="16" rx="4" class="' + (i === 2 ? "a-fill" : "a-ring") + '"/>'; });
      return s + '<circle cx="120" cy="36" r="15" class="a-ring" stroke-width="2.4"/><circle cx="120" cy="36" r="5" class="a-fill"/>';
    },
    mlops: function () {
      var c = [[120, 10], [176, 36], [120, 62], [64, 36]], s = '<ellipse cx="120" cy="36" rx="56" ry="26" class="a-dash"/>';
      c.forEach(function (p, i) { s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="7" class="' + (i === 0 ? "a-fill" : "a-ring") + '"/>'; });
      return s + '<path d="M150 14 L160 18 L152 25" class="a-strong"/><path d="M90 58 L80 54 L88 47" class="a-strong"/>';
    },
    sysdesign: function () {
      var s = '<rect x="22" y="26" width="38" height="20" rx="4" class="a-fill"/>';
      [12, 30, 48].forEach(function (y, i) {
        s += '<path d="M60 36 C88 36 88 ' + (y + 6) + ' 116 ' + (y + 6) + '" class="a-line"/>';
        s += '<rect x="116" y="' + y + '" width="44" height="12" rx="3" class="' + (i === 1 ? "a-mid" : "a-soft") + '"/>';
        s += '<path d="M160 ' + (y + 6) + ' L186 36" class="a-line"/>';
      });
      return s + '<ellipse cx="204" cy="26" rx="16" ry="5" class="a-ring"/><path d="M188 26 V46 A16 5 0 0 0 220 46 V26" class="a-strong"/>';
    },
    adk: function () {
      var t = [[60, 16], [60, 56], [180, 16], [180, 56], [120, 64]], s = "";
      t.forEach(function (p, i) { s += '<path d="M120 34 L' + p[0] + " " + p[1] + '" class="' + (i === 2 ? "a-strong" : "a-dash") + '"/>'; });
      t.forEach(function (p, i) { s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="6" class="' + (i === 2 ? "a-fill" : "a-ring") + '"/>'; });
      return s + '<path d="M120 18 L134 26 L134 42 L120 50 L106 42 L106 26 Z" class="a-ring" stroke-width="2.4"/><circle cx="120" cy="34" r="4" class="a-fill"/>';
    },
    interview: function () {
      return '<path d="M30 12 H118 A6 6 0 0 1 124 18 V38 A6 6 0 0 1 118 44 H52 L40 54 V44 H30 A6 6 0 0 1 24 38 V18 A6 6 0 0 1 30 12 Z" class="a-ring"/>' +
        '<rect x="36" y="22" width="60" height="6" rx="3" class="a-soft"/><rect x="36" y="32" width="40" height="6" rx="3" class="a-soft"/>' +
        '<path d="M122 30 H210 A6 6 0 0 1 216 36 V56 A6 6 0 0 1 210 62 H200 V70 L188 62 H122 A6 6 0 0 1 116 56 V36 A6 6 0 0 1 122 30 Z" class="a-fill-soft"/>' +
        '<rect x="128" y="40" width="70" height="6" rx="3" class="a-fill"/><rect x="128" y="50" width="46" height="6" rx="3" class="a-fill"/>';
    }
  };

  function decorateCards() {
    [].forEach.call(document.querySelectorAll("#topics-grid .topic"), function (card) {
      var m = /courses\/([a-z]+)\//.exec(card.getAttribute("href") || "");
      var draw = m && ART[m[1]];
      if (!draw) return;
      var art = document.createElement("div");
      art.className = "topic-art";
      art.setAttribute("aria-hidden", "true");
      var defs = m[1] === "langchain"     // the only sketch with arrowheads; one definition, so no duplicate ids
        ? '<defs><marker id="a-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L8 4 L0 8 Z" fill="currentColor"/></marker></defs>'
        : "";
      art.innerHTML = '<svg viewBox="0 0 240 72" preserveAspectRatio="xMidYMid meet">' + defs + draw() + "</svg>";
      card.insertBefore(art, card.firstChild);
    });
  }

  /* ------------------------------------------------------ stat count-up -- */
  function countUp() {
    var nums = [].slice.call(document.querySelectorAll(".hp-stat-n"));
    if (reduce || !window.IntersectionObserver) return;
    nums.forEach(function (n) {
      var final = n.textContent, target = parseInt(final.replace(/,/g, ""), 10);
      if (!(target > 0)) return;
      n.dataset.final = final; n.textContent = "0";
      var io = new IntersectionObserver(function (en) {
        if (!en[0].isIntersecting) return;
        io.disconnect();
        var t0 = performance.now(), D = 1100;
        (function tick(now) {
          var k = Math.min(1, (now - t0) / D), v = Math.round(target * (1 - Math.pow(1 - k, 3)));
          n.textContent = k < 1 ? v.toLocaleString("en-GB") : final;
          if (k < 1) requestAnimationFrame(tick);
        })(t0);
      }, { threshold: 0.4 });
      io.observe(n);
    });
  }

  var host = document.getElementById("hero-map");
  if (host && window.HOME_PATH) drawMap(host, window.HOME_PATH);
  decorateCards();
  countUp();
})();
