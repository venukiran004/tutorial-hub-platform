/* fitcheck.js — flags diagram text that will overflow its container.
   check-blocks catches invalid kinds and markdown-in-SVG. It does not catch a
   matrix cell or a timeline lane label that is simply too wide, because those
   two kinds do not wrap or shrink their text. Those render as overlapping
   characters, which no structural check notices and every reader does. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const W = 760;
/* from assets/css/lesson.css: s-label is 12px/600 sans, s-sub 10.5px sans. */
const label = s => String(s || "").length * 6.7;
const sub = s => String(s || "").length * 5.6;

let problems = 0, checked = 0;

function check(b, id, file) {
  if (!b || typeof b !== "object") return;
  (Object.values(b) || []).forEach(v => {
    if (Array.isArray(v)) v.forEach(x => check(x, id, file));
    else if (v && typeof v === "object" && v.t) check(v, id, file);
  });
  if (b.t !== "diagram") return;
  checked++;
  const say = (what, got, cap, text) => {
    problems++;
    console.log(`  OVERFLOW  ${file}  ${id}  ${b.kind}  ${what}: ` +
                `"${String(text).slice(0, 40)}" needs ${Math.round(got)}px of ${Math.round(cap)}px`);
  };

  if (b.kind === "matrix") {
    const cols = b.cols || [], rows = b.rows || [], labelW = 200;
    const cw = (W - labelW - 16) / Math.max(cols.length, 1);
    cols.forEach(c => { if (label(c) > cw - 6) say("header", label(c), cw - 6, c); });
    rows.forEach(r => { if (label(r) > labelW - 14) say("row label", label(r), labelW - 14, r); });
    (b.cells || []).forEach(row => (row || []).forEach(v => {
      const txt = v && typeof v === "object" ? v.text
                : v === true ? "✓" : v === false ? "✗" : v == null ? "" : String(v);
      if (sub(txt) > cw - 10) say("cell", sub(txt), cw - 10, txt);
    }));
  }

  if (b.kind === "timeline") {
    const x0 = 130;
    (b.lanes || []).forEach(l => {
      if (label(l.label) > x0 - 16) say("lane label", label(l.label), x0 - 16, l.label);
      (l.bars || []).forEach(bar => {
        const scale = (740 - x0) / (b.span || 10);
        const bw = (bar[1] - bar[0]) * scale;
        if (bar[2] && sub(bar[2]) > bw - 4) say("bar label", sub(bar[2]), bw - 4, bar[2]);
      });
    });
  }

  if (b.kind === "steps") {
    (b.items || []).forEach(it => {
      if (label(it.label) > W - 76) say("step label", label(it.label), W - 76, it.label);
      if (it.desc && sub(it.desc) > W - 90) say("step desc", sub(it.desc), W - 90, it.desc);
    });
  }

  if (b.kind === "layers") {
    (b.items || []).forEach(it => {
      /* box() shrinks and wraps the label, but `side` text is drawn raw to the
         right of a 560px box centred in 760 — so it has 86px before clipping. */
      if (it.side && sub(it.side) > 86) say("side note", sub(it.side), 86, it.side);
    });
  }

  if (b.kind === "cells") {
    const cw = Math.min(64, Math.floor(700 / Math.max((b.items || []).length, 1)));
    (b.items || []).forEach(it => {
      if (String(it).length * 6.0 > cw - 6) say("cell", String(it).length * 6.0, cw - 6, it);
    });
  }
}

const roots = process.argv[2] ? [process.argv[2]] : ["courses"];
function walk(d) {
  fs.readdirSync(d, { withFileTypes: true }).forEach(e => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith(".js") && /[\\/]lessons[\\/]/.test(p)) {
      let lesson = null;
      const ctx = { EC: { receiveLesson: l => { lesson = l; } }, console };
      try { vm.runInNewContext(fs.readFileSync(p, "utf8"), ctx); } catch (e) { return; }
      if (lesson) (lesson.blocks || []).forEach(b => check(b, lesson.id, path.basename(p)));
    }
  });
}
roots.forEach(walk);
console.log(problems
  ? `\nfitcheck: ${problems} overflow(s) in ${checked} diagrams`
  : `fitcheck: ok — ${checked} diagrams, all text fits`);
process.exit(problems ? 1 : 0);
