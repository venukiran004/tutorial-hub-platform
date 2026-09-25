/* ============================================================================
   check-emphasis.js — catches **bold** that never becomes bold.

   render.js matches bold with a pattern whose inner class excludes asterisks,
   so a bold span may not contain one. A nested italic — "**the *best* rank-k
   approximation**" — therefore fails to match and the reader sees literal
   asterisks on the page. Put another way: bold and italic do not nest.

   Nothing else catches it: the lesson loads, the block shape is valid, and
   the render test passes. It is otherwise only visible in a screenshot.

   This runs render.js's own inline() over every markdown-bearing string and
   reports any that still contain ** afterwards. Code spans are vaulted first,
   exactly as the renderer does, so `a ** b` inside backticks is not a finding.

   Usage:  node .build/check-emphasis.js courses/nlp/lessons
           node .build/check-emphasis.js            # every course
   ========================================================================= */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

let problems = 0;
let checked = 0;

/* The inline formatter, lifted from assets/js/render.js. Kept in sync by the
   self-test below, which fails if render.js's bold rule stops matching. */
const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, c => ESC[c]); }

function inline(s) {
  if (s == null) return "";
  const vault = [];
  let out = String(s).replace(/`([^`]+)`/g, (_, c) => {
    vault.push("<code>" + esc(c) + "</code>");
    return "\u0000" + (vault.length - 1) + "\u0000";
  });
  out = esc(out);
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, h) => '<a href="' + esc(h) + '">' + t + "</a>");
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|\s)\*([^*\n]+)\*/g, "$1<em>$2</em>");
  out = out.replace(/\u0000(\d+)\u0000/g, (_, i) => vault[+i]);
  return out;
}

/* Keys whose values the renderer passes through inline(). `code` and `out`
   are raw and must never be scanned — ** there is Python exponentiation. */
const RAW = new Set(["code", "out", "tex", "lang", "id", "t", "kind"]);

function walk(node, id, file, key) {
  if (typeof node === "string") {
    if (RAW.has(key)) return;
    checked++;
    /* A surviving PAIR of ** means a bold span failed to match — almost always
       an asterisk inside it, from a nested italic or from COUNT(*). A single
       surviving ** is unpaired: Python's **kwargs written in prose, which is
       meant to read literally. Only the pair is a bug. */
    const left = (inline(node).match(/\*\*/g) || []).length;
    if (left >= 2) {
      problems++;
      const span = (node.match(/\*\*[^\n]{0,86}?\*\*/) || node.match(/\*\*[^\n]{0,90}/) || [node])[0];
      console.log(`  BOLD NEVER RENDERS  ${file}  ${id}  [${key}] ${JSON.stringify(span).slice(0, 100)}`);
    }
    return;
  }
  if (Array.isArray(node)) { node.forEach(n => walk(n, id, file, key)); return; }
  if (node && typeof node === "object") {
    for (const k of Object.keys(node)) walk(node[k], id, file, k);
  }
}

function scan(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) { scan(p); continue; }
    if (!entry.name.endsWith(".js")) continue;
    const rel = path.relative(process.cwd(), p).replace(/\\/g, "/");
    const ctx = { EC: { receiveLesson: L => walk(L, L.id, rel, "lesson") }, console };
    vm.createContext(ctx);
    try {
      vm.runInContext(fs.readFileSync(p, "utf8"), ctx);
    } catch (err) {
      problems++;
      console.log(`  LOAD FAILED  ${rel}  ${err.message}`);
    }
  }
}

/* Self-test: if render.js ever allows asterisks inside bold, this checker is
   reporting findings that are no longer real. Fail loudly rather than lie. */
(function checkRuleInSync() {
  const src = fs.readFileSync(path.join("assets", "js", "render.js"), "utf8");
  if (src.indexOf("replace(/\\*\\*([^*]+)\\*\\*/g") === -1) {
    problems++;
    console.log("  RENDERER  render.js's bold rule changed — re-check this script's copy of inline()");
  }
})();

const roots = process.argv.slice(2);
if (roots.length) {
  roots.forEach(scan);
} else {
  for (const c of fs.readdirSync("courses", { withFileTypes: true })) {
    const lessons = path.join("courses", c.name, "lessons");
    if (c.isDirectory() && fs.existsSync(lessons)) scan(lessons);
  }
}

if (problems) {
  console.log(`check-emphasis: FAILED — ${problems} span(s) render as literal asterisks, in ${checked} strings`);
  process.exit(1);
}
console.log(`check-emphasis: ok — ${checked} strings, every ** resolves to bold`);
