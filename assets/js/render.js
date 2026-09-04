/* ============================================================================
   BLOCK RENDERER
   ----------------------------------------------------------------------------
   Lessons are authored as arrays of typed blocks, not as documents. Each block
   type maps to a component with a specific teaching job — a `trap` callout and
   a `tradeoff` callout are different things and are allowed to look different.

   The only text processing is an inline formatter (`code`, **bold**, *marked*,
   [link](href)). Everything structural is a block, which is what keeps the
   design consistent across a hundred lessons and across future courses.
   ========================================================================= */
(function (global) {
  "use strict";

  var EC = global.EC || (global.EC = {});

  /* ---------------------------------------------------------------- icons -- */
  function ic(d, extra) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' + (extra || "") + ">" + d + "</svg>";
  }
  var I = EC.icons = {
    check:    ic('<polyline points="20 6 9 17 4 12"/>'),
    checkCircle: ic('<circle cx="12" cy="12" r="9"/><polyline points="16 9.5 10.8 15 8 12.2"/>'),
    chevron:  ic('<polyline points="9 18 15 12 9 6"/>'),
    arrowR:   ic('<line x1="4" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/>'),
    arrowL:   ic('<line x1="20" y1="12" x2="5" y2="12"/><polyline points="11 6 5 12 11 18"/>'),
    clock:    ic('<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/>'),
    layers:   ic('<polygon points="12 3 21 8 12 13 3 8 12 3"/><polyline points="3 16 12 21 21 16"/>'),
    target:   ic('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>'),
    link:     ic('<path d="M10 13a4 4 0 0 0 5.7.3l3-3A4 4 0 0 0 13 4.7l-1.4 1.4"/><path d="M14 11a4 4 0 0 0-5.7-.3l-3 3A4 4 0 0 0 11 19.3l1.4-1.4"/>'),
    bulb:     ic('<path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.5.4.9 1 .9 1.7V16h5.4v-.5c0-.7.4-1.3.9-1.7A6 6 0 0 0 12 3z"/>'),
    alert:    ic('<path d="M12 4.5 2.8 20h18.4L12 4.5z"/><line x1="12" y1="10" x2="12" y2="14"/><circle cx="12" cy="17" r=".6" fill="currentColor"/>'),
    scale:    ic('<line x1="12" y1="4" x2="12" y2="20"/><line x1="6" y1="20" x2="18" y2="20"/><path d="M12 7 5 11h6.5"/><path d="M12 7l7 4h-6.5"/><path d="M2.5 11a2.5 2.5 0 0 0 5 0"/><path d="M16.5 11a2.5 2.5 0 0 0 5 0"/>'),
    server:   ic('<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="14" width="18" height="7" rx="2"/><line x1="7" y1="7.5" x2="7.01" y2="7.5"/><line x1="7" y1="17.5" x2="7.01" y2="17.5"/>'),
    code:     ic('<polyline points="9 18 3 12 9 6"/><polyline points="15 6 21 12 15 18"/>'),
    copy:     ic('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>'),
    search:   ic('<circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/>'),
    sun:      ic('<circle cx="12" cy="12" r="4.2"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.2" y1="4.2" x2="5.6" y2="5.6"/><line x1="18.4" y1="18.4" x2="19.8" y2="19.8"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.2" y1="19.8" x2="5.6" y2="18.4"/><line x1="18.4" y1="5.6" x2="19.8" y2="4.2"/>'),
    moon:     ic('<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>'),
    menu:     ic('<line x1="3" y1="7" x2="21" y2="7"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="17" x2="21" y2="17"/>'),
    dumbbell: ic('<path d="M2 12h2m16 0h2"/><rect x="4" y="8" width="3.5" height="8" rx="1"/><rect x="16.5" y="8" width="3.5" height="8" rx="1"/><line x1="7.5" y1="12" x2="16.5" y2="12"/>'),
    brain:    ic('<path d="M9.5 3a3 3 0 0 0-3 3 3 3 0 0 0-2 5.2A3 3 0 0 0 6 16.8 3 3 0 0 0 9.5 21a2.5 2.5 0 0 0 2.5-2.5v-13A2.5 2.5 0 0 0 9.5 3z"/><path d="M14.5 3a3 3 0 0 1 3 3 3 3 0 0 1 2 5.2 3 3 0 0 1-1.5 5.6A3 3 0 0 1 14.5 21 2.5 2.5 0 0 1 12 18.5v-13A2.5 2.5 0 0 1 14.5 3z"/>'),
    mic:      ic('<rect x="9" y="2.5" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0"/><line x1="12" y1="17.5" x2="12" y2="21"/>'),
    key:      ic('<circle cx="7.5" cy="15.5" r="3.5"/><path d="M10 13 20 3"/><path d="M17 6l2.5 2.5"/><path d="M14.5 8.5 17 11"/>'),
    lock:     ic('<rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>'),
    python:   ic('<path d="M12 2.5c-3 0-4.5 1.2-4.5 3.2V8h5v1H6.2C4 9 2.5 10.5 2.5 13.5S4 18 6.2 18H8v-2.6c0-2 1.6-3.4 3.7-3.4h4.6c1.8 0 3.2-1.4 3.2-3.2V5.7c0-2-1.6-3.2-4.5-3.2z"/><circle cx="9.6" cy="5.6" r=".9" fill="currentColor" stroke="none"/>')
  };

  /* ------------------------------------------------------ inline format -- */
  var ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return ESC[c]; }); }
  EC.esc = esc;

  // Order matters: code spans are lifted out first so their contents are never
  // reinterpreted as bold or as a link.
  function inline(s) {
    if (s == null) return "";
    var vault = [];
    var out = String(s).replace(/`([^`]+)`/g, function (_, c) {
      vault.push("<code>" + esc(c) + "</code>");
      return "\u0000" + (vault.length - 1) + "\u0000";
    });
    out = esc(out);
    out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_, t, h) {
      return '<a href="' + esc(h) + '">' + t + "</a>";
    });
    out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    out = out.replace(/(^|\s)\*([^*\n]+)\*/g, "$1<em>$2</em>");
    out = out.replace(/\u0000(\d+)\u0000/g, function (_, i) { return vault[+i]; });
    return out;
  }
  EC.inline = inline;

  function slug(s) {
    return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  }
  EC.slug = slug;

  /* ------------------------------------------------------------- code -- */
  var cbSeq = 0;
  function codeBlock(b) {
    var lang = b.lang || "python";
    var raw = String(b.code || "").replace(/^\n/, "").replace(/\s+$/, "");
    var lines = global.HL.toLines(global.HL.highlight(raw, lang));
    var hlSet = {}; (b.hl || b.highlight || []).forEach(function (n) { hlSet[n] = "hl"; });
    (b.add || []).forEach(function (n) { hlSet[n] = "add"; });
    (b.del || []).forEach(function (n) { hlSet[n] = "del"; });

    // Joined with "", not "\n". Each row is already display:block, and <pre>
    // preserves whitespace — a newline between rows would break the line a
    // second time and double the leading.
    var body = lines.map(function (l, i) {
      var n = i + 1, k = hlSet[n];
      return '<span class="cl' + (k ? " " + k : "") + '" data-n="' + n + '">' + (l || " ") + "</span>";
    }).join("");

    var id = "cb" + (++cbSeq);
    var head = "";
    if (b.title !== false) {
      head = '<div class="cb-head">' +
        '<span class="cb-lang">' + esc(lang) + "</span>" +
        '<span class="cb-title">' + esc(b.title || "") + "</span>" +
        '<button class="cb-copy" type="button" data-copy="' + id + '">' + I.copy + "<span>Copy</span></button>" +
        "</div>";
    }
    var cls = "codeblock" + (b.numbered === false ? "" : " numbered") + (b.flush ? " flush" : "");
    var html = '<div class="' + cls + '">' + head +
      '<pre><code id="' + id + '" data-raw="' + esc(raw) + '">' + body + "</code></pre></div>";
    if (b.out) html += outBlock({ text: b.out, label: b.outLabel });
    if (b.caption) html += '<p class="cb-caption">' + inline(b.caption) + "</p>";
    return html;
  }

  function outBlock(b) {
    return '<div class="output"><div class="output-h">' + esc(b.label || "Output") + "</div><pre>" +
      esc(String(b.text).replace(/^\n/, "").replace(/\s+$/, "")) + "</pre></div>";
  }

  /* --------------------------------------------------------- callouts -- */
  var CALLOUT = {
    insight:    { kind: "Production insight", icon: I.server },
    trap:       { kind: "Common trap",        icon: I.alert },
    tradeoff:   { kind: "Engineering trade-off", icon: I.scale },
    production: { kind: "In production",      icon: I.server },
    scenario:   { kind: "Real-world scenario", icon: I.layers },
    warn:       { kind: "Watch out",          icon: I.alert },
    good:       { kind: "Best practice",      icon: I.checkCircle },
    note:       { kind: "Note",               icon: I.bulb },
    mental:     { kind: "Mental model",       icon: I.brain }
  };
  function callout(b) {
    var meta = CALLOUT[b.kind] || CALLOUT.note;
    var cls = b.kind === "note" || b.kind === "mental" ? "insight" : b.kind;
    var h = '<div class="callout-h"><span class="callout-ic">' + meta.icon + "</span>" +
      '<span class="callout-kind">' + esc(b.label || meta.kind) + "</span>" +
      (b.title ? '<span class="callout-title">' + inline(b.title) + "</span>" : "") + "</div>";
    return '<div class="callout ' + cls + '">' + h + '<div class="callout-body">' + body(b) + "</div></div>";
  }

  /* ------------------------------------------------------------ ladder -- */
  var RUNG = {
    bad:  { label: "Works, but wrong", step: "1" },
    ok:   { label: "Better",           step: "2" },
    best: { label: "Production-grade", step: "3" }
  };
  function ladder(b) {
    var rungs = (b.rungs || []).map(function (r) {
      var m = RUNG[r.level] || RUNG.ok;
      return '<div class="rung ' + r.level + '">' +
        '<div class="rung-h"><span class="rung-step">' + m.step + "</span>" +
        '<span class="rung-label">' + esc(r.label || m.label) + "</span>" +
        (r.why ? '<span class="rung-why">' + inline(r.why) + "</span>" : "") + "</div>" +
        codeBlock({ code: r.code, lang: r.lang || b.lang || "python", title: false, numbered: r.numbered }) +
        (r.note ? '<div class="rung-note">' + inline(r.note) + "</div>" : "") +
        "</div>";
    }).join("");
    return '<div class="ladder">' + (b.title ? '<h4 style="margin:0 0 12px">' + inline(b.title) + "</h4>" : "") +
      '<div class="rungs ladder-rungs' + (b.side ? " side" : "") + '">' + rungs + "</div></div>";
  }

  /* -------------------------------------------------------------- tabs -- */
  var tabSeq = 0;
  function tabs(b) {
    var g = "tabs" + (++tabSeq);
    var strip = (b.items || []).map(function (it, i) {
      return '<button type="button" role="tab" id="' + g + "-t" + i + '" aria-controls="' + g + "-p" + i +
        '" aria-selected="' + (i === 0 ? "true" : "false") + '">' + esc(it.label) + "</button>";
    }).join("");
    var panels = (b.items || []).map(function (it, i) {
      var inner = it.blocks ? body({ body: it.blocks }) : inline(it.text || "");
      var bare = it.blocks && it.blocks.length === 1 && it.blocks[0].t === "code";
      return '<div class="tab-panel' + (bare ? " bare" : "") + '" role="tabpanel" id="' + g + "-p" + i +
        '" aria-labelledby="' + g + "-t" + i + '"' + (i === 0 ? "" : " hidden") + ">" + inner + "</div>";
    }).join("");
    return '<div class="tabs" data-tabs><div class="tabs-strip" role="tablist">' + strip + "</div>" + panels + "</div>";
  }

  /* ------------------------------------------------------------- table -- */
  function table(b) {
    var head = "<tr>" + (b.head || []).map(function (h) { return "<th>" + inline(h) + "</th>"; }).join("") + "</tr>";
    var rows = (b.rows || []).map(function (r) {
      return "<tr>" + r.map(function (c) { return "<td>" + inline(c) + "</td>"; }).join("") + "</tr>";
    }).join("");
    return '<div class="table-wrap"><table class="dt"><thead>' + head + "</thead><tbody>" + rows +
      "</tbody></table></div>" + (b.caption ? '<p class="tbl-caption">' + inline(b.caption) + "</p>" : "");
  }

  /* ------------------------------------------------------------- viz -- */
  function viz(b) {
    var inner = b.scroll === false ? b.svg : '<div class="viz-scroll">' + b.svg + "</div>";
    return '<figure class="viz">' + inner +
      (b.title || b.caption
        ? "<figcaption>" + (b.title ? "<b>" + inline(b.title) + "</b>" : "") + inline(b.caption || "") + "</figcaption>"
        : "") + "</figure>";
  }

  /* --------------------------------------------------------- disclose -- */
  function disclose(b) {
    return '<details class="disclose"' + (b.open ? " open" : "") + "><summary>" +
      '<span class="disclose-chev">' + I.chevron + "</span>" + inline(b.summary) +
      (b.tag ? '<span class="disclose-tag">' + esc(b.tag) + "</span>" : "") +
      '</summary><div class="disclose-body">' + body(b) + "</div></details>";
  }

  /* --------------------------------------------------------- exercise -- */
  var exSeq = 0;
  function exercise(b) {
    var id = "ex" + (++exSeq);
    var reqs = b.requirements
      ? '<ol class="ex-req">' + b.requirements.map(function (r) { return "<li>" + inline(r) + "</li>"; }).join("") + "</ol>"
      : "";
    var sol = "";
    if (b.solution) {
      var s = b.solution;
      sol = '<div class="solution" id="' + id + '-sol" hidden>' +
        '<div class="sol-h">' + I.checkCircle + "<span>Reference solution</span></div>" +
        (s.code ? codeBlock({ code: s.code, lang: s.lang || "python", title: s.title || "solution.py" }) : "") +
        (s.notes ? '<div class="sol-notes">' + body({ body: s.notes }) + "</div>" : "") +
        "</div>";
    }
    return '<div class="exercise">' +
      '<div class="ex-head"><span class="ex-ic">' + I.dumbbell + "</span>" +
      '<span class="ex-kind">' + esc(b.kind || "Challenge") + "</span>" +
      '<span class="ex-title">' + inline(b.title) + "</span>" +
      '<span class="ex-meta">' + (b.difficulty ? '<span class="badge ' + b.difficulty + '"><span class="dot"></span>' + esc(b.difficulty) + "</span>" : "") +
      (b.minutes ? '<span class="badge"><span class="dot"></span>' + b.minutes + " min</span>" : "") + "</span></div>" +
      '<div class="ex-body">' + body(b) + reqs + "</div>" +
      '<div class="ex-foot">' +
      (b.hint ? '<div class="ex-hint">' + disclose({ summary: "Stuck? Open a hint", tag: "hint", body: [{ t: "p", text: b.hint }] }) + "</div>" : "") +
      (b.solution ? '<button class="reveal-btn" type="button" data-reveal="' + id + '-sol">' + I.key + "<span>Reveal solution</span></button>" +
        '<span class="reveal-note">Write your own version first — reading a solution feels like learning and is not.</span>' : "") +
      "</div>" + sol + "</div>";
  }

  /* ------------------------------------------------------------- quiz -- */
  var quizSeq = 0;
  function quiz(b) {
    var g = "qz" + (++quizSeq);
    var qs = (b.questions || []).map(function (q, i) {
      var opts = q.options.map(function (o, j) {
        return '<button class="q-opt" type="button" data-q="' + g + "-" + i + '" data-i="' + j + '">' +
          '<span class="q-key">' + "ABCDE"[j] + "</span><span>" + inline(o) + "</span></button>";
      }).join("");
      return '<div class="q" data-answer="' + q.answer + '" id="' + g + "-" + i + '">' +
        '<div class="q-n">Question ' + (i + 1) + " of " + b.questions.length + "</div>" +
        '<div class="q-stem">' + inline(q.stem) + "</div>" +
        (q.code ? codeBlock({ code: q.code, lang: q.lang || "python", title: false, numbered: false }) : "") +
        '<div class="q-opts">' + opts + "</div>" +
        '<div class="q-fb" hidden><div class="q-fb-h"></div><div class="q-fb-b">' + inline(q.why || "") + "</div></div>" +
        "</div>";
    }).join("");
    return '<div class="quiz" data-quiz="' + g + '" data-total="' + (b.questions || []).length + '">' +
      '<div class="quiz-head"><span class="quiz-ic">' + I.brain + "</span>" +
      '<span class="quiz-title">' + esc(b.title || "Knowledge check") + "</span>" +
      '<span class="quiz-score">0 / ' + (b.questions || []).length + " correct</span></div>" + qs + "</div>";
  }

  /* -------------------------------------------------------- interview -- */
  function interview(b) {
    var qs = (b.questions || []).map(function (q) {
      var ans = "";
      if (q.strong) ans += '<div class="strong-answer"><div class="strong-answer-h">What a strong answer sounds like</div>' + inline(q.strong) + "</div>";
      if (q.answer) ans += body({ body: q.answer });
      if (q.weak) ans += '<div class="weak-answer"><div class="weak-answer-h">What weak answers do</div>' + inline(q.weak) + "</div>";
      return '<details class="iv-q"><summary>' +
        '<span class="iv-lvl badge ' + (q.level || "core") + '"><span class="dot"></span>' + esc(q.level || "core") + "</span>" +
        '<span class="iv-qt">' + inline(q.q) + "</span>" +
        '<span class="iv-chev">' + I.chevron + "</span></summary>" +
        '<div class="iv-a">' + ans + "</div></details>";
    }).join("");
    return '<div class="interview"><div class="iv-head"><span class="iv-ic">' + I.mic + "</span>" +
      '<span class="iv-title">' + esc(b.title || "Interview lens") + "</span>" +
      '<span class="iv-sub">' + esc(b.sub || "Answer out loud before opening") + "</span></div>" + qs + "</div>";
  }

  /* -------------------------------------------------------- takeaways -- */
  function takeaways(b) {
    return '<div class="takeaways"><div class="tk-h">' + I.target + "<span>Key takeaways</span></div><ul>" +
      (b.items || []).map(function (t) { return "<li>" + I.check + "<span>" + inline(t) + "</span></li>"; }).join("") +
      "</ul></div>";
  }

  /* ------------------------------------------------------------- drill -- */
  /* A question whose answer stays hidden until asked for. Deliberately
     lighter than `exercise`: a practice page carries hundreds of these, so
     the chrome has to stay out of the way and the reveal has to be one
     click with no layout jump. */
  function drill(b) {
    var terms = (b.terms || []).length
      ? '<div class="drill-terms">' + b.terms.map(function (t) {
          return '<span class="kt">' + esc(t) + "</span>";
        }).join("") + "</div>"
      : "";

    return '<details class="drill' + (b.kind ? " " + b.kind : "") + '">' +
      "<summary>" +
        '<span class="drill-n">' + esc(b.n || "") + "</span>" +
        '<span class="drill-q">' + inline(b.q) + "</span>" +
        '<span class="drill-cue">Reveal</span>' +
      "</summary>" +
      '<div class="drill-a">' + terms + render(b.body || []) + "</div>" +
      "</details>";
  }

  /* ------------------------------------------------------------ router -- */
  var R = {
    h2: function (b) {
      var id = b.id || slug(b.text);
      // The anchor is a real link, revealed on hover: deep-linking a section
      // is something readers do, and hunting for a hidden affordance is not.
      return '<h2 id="' + id + '"><span class="hn">' + esc(b.n || "") + '</span><span>' + inline(b.text) +
        '</span><a class="anchor" href="#' + id + '" aria-label="Link to this section">#</a></h2>' +
        (b.sub ? '<p class="h2-sub">' + inline(b.sub) + "</p>" : "");
    },
    h3: function (b) {
      var id = b.id || slug(b.text);
      return '<h3 id="' + id + '">' + inline(b.text) +
        '<a class="anchor" href="#' + id + '" aria-label="Link to this section">#</a></h3>';
    },
    h4: function (b) { return "<h4>" + inline(b.text) + "</h4>"; },
    p:  function (b) { return "<p>" + inline(b.text) + "</p>"; },
    ul: function (b) { return '<ul class="' + (b.tight ? "tight" : "") + '">' + b.items.map(function (i) { return "<li>" + inline(i) + "</li>"; }).join("") + "</ul>"; },
    ol: function (b) { return '<ol class="' + (b.tight ? "tight" : "") + '">' + b.items.map(function (i) { return "<li>" + inline(i) + "</li>"; }).join("") + "</ol>"; },
    dl: function (b) { return '<dl class="deflist">' + b.items.map(function (p) { return "<dt>" + inline(p[0]) + "</dt><dd>" + inline(p[1]) + "</dd>"; }).join("") + "</dl>"; },
    quote: function (b) { return "<blockquote>" + inline(b.text) + (b.by ? '<br><span style="font-size:13px;color:var(--ink-3)">— ' + inline(b.by) + "</span>" : "") + "</blockquote>"; },
    pills: function (b) { return '<div class="pill-row">' + b.items.map(function (p) { return '<span class="pill">' + inline(p) + "</span>"; }).join("") + "</div>"; },
    code: codeBlock,
    out: outBlock,
    callout: callout,
    ladder: ladder,
    tabs: tabs,
    table: table,
    viz: viz,
    disclose: disclose,
    drill: drill,
    exercise: exercise,
    quiz: quiz,
    interview: interview,
    takeaways: takeaways,
    hr: function () { return "<hr>"; },
    html: function (b) { return b.html; }
  };

  function body(b) { return render(b.body || b.blocks || []); }

  function render(blocks) {
    if (typeof blocks === "string") return "<p>" + inline(blocks) + "</p>";
    return (blocks || []).map(function (b) {
      var fn = R[b.t];
      if (!fn) { console.warn("Unknown block type:", b.t); return ""; }
      return fn(b);
    }).join("\n");
  }
  EC.render = render;

  /* ----------------------------------------------------------- svg kit -- */
  /* Small helpers so a diagram is written as geometry, not as a wall of
     attribute strings. Every colour goes through a CSS class so diagrams
     re-theme with the page instead of freezing one palette. */
  EC.svg = {
    box: function (x, y, w, h, label, sub, cls) {
      var s = '<g><rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="9" class="' + (cls || "s-fill s-stroke") + '" stroke-width="1"/>';
      s += '<text x="' + (x + w / 2) + '" y="' + (y + (sub ? h / 2 - 4 : h / 2 + 4)) + '" text-anchor="middle" class="s-label">' + esc(label) + "</text>";
      if (sub) s += '<text x="' + (x + w / 2) + '" y="' + (y + h / 2 + 13) + '" text-anchor="middle" class="s-sub">' + esc(sub) + "</text>";
      return s + "</g>";
    },
    arrow: function (x1, y1, x2, y2, label) {
      var s = '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" class="s-stroke" stroke-width="1.4" marker-end="url(#ah)"/>';
      if (label) s += '<text x="' + (x1 + x2) / 2 + '" y="' + ((y1 + y2) / 2 - 7) + '" text-anchor="middle" class="s-sub">' + esc(label) + "</text>";
      return s;
    },
    defs: '<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="currentColor" class="s-stroke" stroke="none" style="fill:var(--border-strong)"/></marker></defs>'
  };
})(window);
