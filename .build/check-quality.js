/* Content-quality ratchet. Three checks that the render tests cannot see:

   1. Quizzes answerable by length. A question counts when the correct option
      is at least 1.5x the mean length of its distractors. AUTHORING.md forbids
      this; thousands of older questions break it. The count per course may
      only go down: a course that adds one fails the gate.
   2. Prose that argues with a source the learner never sees ("the common
      form gives", "the usual output prints"), left by an automated rewrite.
      Same ratchet.
   3. NumPy APIs removed in 2.x. Any use fails outright.

   Baselines live in .build/quality-baseline.json. When a count falls, run
   `node .build/check-quality.js --update` to lock in the improvement.
   ========================================================================= */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const root = path.join(__dirname, "..");
const BASE = path.join(__dirname, "quality-baseline.json");
const update = process.argv.includes("--update");

const LEAK = /common form gives|[Uu]sual treatment|usual output|reproduces it exactly/g;
const NUMPY_GONE = /\bnp\.(in1d|trapz|row_stack|product|cumproduct|alltrue|sometrue|NaN|Inf|infty|float_|complex_|round_|asfarray|msort)\b(?!\s+(was|is|before|in older))/;

function lessonFiles(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...lessonFiles(p));
    else if (e.name.endsWith(".js")) out.push(p);
  }
  return out;
}
function codeOf(bs, acc) {
  (Array.isArray(bs) ? bs : []).forEach(b => {
    if (!b || typeof b !== "object") return;
    if (b.code) acc.push(b.code);
    if (b.solution && b.solution.code) acc.push(b.solution.code);
    (b.rungs || []).forEach(r => r.code && acc.push(r.code));
    codeOf(b.body, acc); codeOf(b.blocks, acc); codeOf(b.prompt, acc);
    if (Array.isArray(b.items)) b.items.forEach(i => i && codeOf(i.blocks, acc));
    if (b.solution) codeOf(b.solution.notes, acc);
  });
  return acc;
}

const counts = {}, hard = [];
for (const course of fs.readdirSync(path.join(root, "courses")).sort()) {
  const c = counts[course] = { quizByLength: 0, quizTotal: 0, unseenSource: 0 };
  const dir = path.join(root, "courses", course, "lessons");
  if (!fs.existsSync(dir)) continue;
  for (const f of lessonFiles(dir)) {
    const src = fs.readFileSync(f, "utf8");
    let L = null;
    const sb = { EC: { receiveLesson: x => { L = x; } } };
    vm.createContext(sb);
    try { vm.runInContext(src, sb); } catch (e) { continue; }   // rendertest reports parse errors
    if (!L) continue;
    for (const q of (L.quiz && L.quiz.questions) || []) {
      const o = q.options || [], a = q.answer;
      if (!(o.length > 1 && a >= 0 && a < o.length)) continue;
      c.quizTotal++;
      const others = o.filter((_, i) => i !== a).map(x => String(x).length);
      const mean = others.reduce((s, x) => s + x, 0) / others.length;
      if (String(o[a]).length >= 1.5 * mean) c.quizByLength++;
    }
    const prose = JSON.stringify(L, (k, v) => (k === "code" || k === "svg" || k === "out") ? undefined : v);
    c.unseenSource += (prose.match(LEAK) || []).length;
    for (const code of codeOf(L.blocks, [])) {
      const m = NUMPY_GONE.exec(code);
      if (m) hard.push(`${path.relative(root, f)}: ${m[0]} was removed in NumPy 2.x`);
    }
  }
}

const base = fs.existsSync(BASE) ? JSON.parse(fs.readFileSync(BASE, "utf8")) : {};
let fail = hard.length > 0, improved = false;
const rows = [];
for (const [course, c] of Object.entries(counts)) {
  const b = base[course] || { quizByLength: Infinity, unseenSource: Infinity };
  for (const k of ["quizByLength", "unseenSource"]) {
    if (c[k] > b[k]) { fail = true; rows.push(`  FAIL ${course} ${k}: ${c[k]} > baseline ${b[k]}`); }
    else if (c[k] < b[k]) improved = true;
  }
}
hard.forEach(h => rows.push("  FAIL " + h));
const tq = Object.values(counts).reduce((s, c) => s + c.quizByLength, 0);
const tt = Object.values(counts).reduce((s, c) => s + c.quizTotal, 0);
const tl = Object.values(counts).reduce((s, c) => s + c.unseenSource, 0);
if (update || !fs.existsSync(BASE)) {
  const nb = {};
  for (const [k, c] of Object.entries(counts)) nb[k] = { quizByLength: c.quizByLength, unseenSource: c.unseenSource };
  fs.writeFileSync(BASE, JSON.stringify(nb, null, 1) + "\n");
  console.log("check-quality: baseline written");
}
rows.forEach(r => console.log(r));
console.log(`check-quality: ${fail ? "FAIL" : "ok"} — ${tq} of ${tt} quiz questions answerable by length, ` +
  `${tl} unseen-source phrases${improved && !update ? " (improved: run with --update to lock it in)" : ""}`);
process.exit(fail ? 1 : 0);
