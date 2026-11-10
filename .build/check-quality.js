/* Content-quality ratchet. Three checks that the render tests cannot see:

   1. Quizzes answerable by length. A question fails outright when the correct
      option is at least 1.3x the mean length of its distractors (AUTHORING.md);
      every question passed this in November 2026, so there is no allowance.
      A softer tell is ratcheted per course: how often the correct option is
      the single longest one. Chance is 1 in 4; the count may only go down.
   2. Prose that argues with a source the learner never sees ("the common
      form gives", "the usual output prints"), left by an automated rewrite.
      Same ratchet.
   3. NumPy APIs removed in 2.x. Any use fails outright.
   4. An exercise with no solution, no hint or no difficulty fails outright.
   5. A definition-list item with no readable term and definition fails outright.
      The renderer accepts [term, def], {term, def} and {k, v}; anything else
      rendered as a blank row in 151 lessons until November 2026.

   Baselines live in .build/quality-baseline.json. When a count falls, run
   `node .build/check-quality.js --update` to lock in the improvement.
   ========================================================================= */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const root = path.join(__dirname, "..");
const BASE = path.join(__dirname, "quality-baseline.json");
const update = process.argv.includes("--update");

const LEAK = /common form gives|[Uu]sual treatment|usual output|reproduces it exactly|[Tt]he reference('s)? (is unambiguous|states|quotes|calls|says|insists|specifies|recommends|notes|gives|lists|warns|claims)|absent from the reference|\bit is commonly (said|called|stated|written) (it|them|this|so plainly)|it is usually put (it|the|real)|the common name is|the common list has|usual advice is (for|as)|quoted figure is is|(containing|reusing|in) the usual phrasing|does the usual advice/gi;
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
  const c = counts[course] = { quizByLength: 0, quizLongest: 0, quizTotal: 0, unseenSource: 0 };
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
      if (String(o[a]).length >= 1.3 * mean) {
        c.quizByLength++;
        hard.push(`${path.relative(root, f)}: quiz "${String(q.stem).slice(0, 60)}" is answerable by length (correct option >= 1.3x mean distractor)`);
      }
      const lens = o.map(x => String(x).length), mx = Math.max(...lens);
      if (lens[a] === mx && lens.filter(x => x === mx).length === 1) c.quizLongest++;
    }
    (function walk(o) {                       // every exercise carries a solution, a hint and a difficulty
      if (Array.isArray(o)) return o.forEach(walk);
      if (!o || typeof o !== "object") return;
      if (o.t === "exercise") {
        const miss = [!(o.solution && (o.solution.code || o.solution.notes)) && "solution",
                      !(o.hint || (o.hints && o.hints.length)) && "hint", !o.difficulty && "difficulty"].filter(Boolean);
        if (miss.length) hard.push(`${path.relative(root, f)}: exercise "${o.title}" has no ${miss.join(", ")}`);
      }
      if (o.t === "dl" && Array.isArray(o.items)) {   // a definition the renderer cannot read shows as a blank row
        const blank = o.items.filter(it => {
          const pair = Array.isArray(it) ? it : it && [it.term !== undefined ? it.term : it.k, it.def !== undefined ? it.def : it.v];
          return !pair || !pair[0] || !pair[1];
        }).length;
        if (blank) hard.push(`${path.relative(root, f)}: definition list has ${blank} item(s) with no readable term and definition`);
      }
      Object.values(o).forEach(walk);
    })(L.blocks);
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
  const b = Object.assign({ quizLongest: Infinity, unseenSource: Infinity }, base[course]);
  for (const k of ["quizLongest", "unseenSource"]) {
    if (c[k] > b[k]) { fail = true; rows.push(`  FAIL ${course} ${k}: ${c[k]} > baseline ${b[k]}`); }
    else if (c[k] < b[k]) improved = true;
  }
}
hard.forEach(h => rows.push("  FAIL " + h));
const tq = Object.values(counts).reduce((s, c) => s + c.quizByLength, 0);
const tt = Object.values(counts).reduce((s, c) => s + c.quizTotal, 0);
const tl = Object.values(counts).reduce((s, c) => s + c.unseenSource, 0);
const tg = Object.values(counts).reduce((s, c) => s + c.quizLongest, 0);
if (update || !fs.existsSync(BASE)) {
  const nb = {};
  for (const [k, c] of Object.entries(counts)) nb[k] = { quizLongest: c.quizLongest, unseenSource: c.unseenSource };
  fs.writeFileSync(BASE, JSON.stringify(nb, null, 1) + "\n");
  console.log("check-quality: baseline written");
}
rows.forEach(r => console.log(r));
console.log(`check-quality: ${fail ? "FAIL" : "ok"} — ${tq} of ${tt} quiz questions answerable by length, ` +
  `${tg} (${(100 * tg / Math.max(tt, 1)).toFixed(1)}%) with the correct option longest, ` +
  `${tl} unseen-source phrases${improved && !update ? " (improved: run with --update to lock it in)" : ""}`);
process.exit(fail ? 1 : 0);
