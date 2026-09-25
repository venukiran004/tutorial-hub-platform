/* ============================================================================
   check-emphasis.js — catches markdown emphasis that never becomes emphasis.

   A bold span that the renderer cannot match leaves literal asterisks on the
   page. Nothing else catches it: the lesson loads, the block shape is valid,
   and the render test passes. It is otherwise only visible in a screenshot.

   This does not reimplement the renderer. It loads the real runtime, renders
   every published lesson exactly as the browser does, removes the places
   where a literal ** is correct — code spans, code blocks and the raw text
   of a diagram, none of which run markdown — and reports whatever ** is left
   sitting in prose.

   Usage:  node .build/check-emphasis.js nlp maths
           node .build/check-emphasis.js            # every course
   ========================================================================= */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const noop = () => {};
const el = {
  setAttribute: noop, removeAttribute: noop, addEventListener: noop,
  appendChild: noop, style: {}, classList: { toggle: noop, add: noop, remove: noop }
};

/* app.js owns defineCourse and touches the document at load time; these stubs
   are the same ones rendertest.js uses. */
function runtime() {
  const sb = {
    console: { log: noop, warn: noop, error: noop },
    setTimeout, requestAnimationFrame: noop,
    document: {
      documentElement: el, body: el, head: el,
      querySelector: () => null, querySelectorAll: () => [],
      createElement: () => el, addEventListener: noop, getElementById: () => null
    },
    localStorage: { getItem: () => null, setItem: noop, removeItem: noop },
    navigator: {}, location: { search: "", href: "" },
    URLSearchParams: class { get() { return null; } }
  };
  sb.window = sb;
  vm.createContext(sb);
  for (const rel of ["assets/js/highlight.js", "assets/js/render.js",
                     "assets/js/diagrams.js", "assets/js/app.js"]) {
    vm.runInContext(fs.readFileSync(path.join(root, rel), "utf8"), sb, { filename: rel });
  }
  return sb;
}

/* Everywhere a literal asterisk is the author's intent rather than a failed
   span: highlighted source, inline code, and the text inside a diagram, which
   is drawn straight into the SVG and never sees the markdown pass. */
function prose(html) {
  return html
    .replace(/<pre[\s\S]*?<\/pre>/g, "")
    .replace(/<code>[\s\S]*?<\/code>/g, "")
    .replace(/<svg[\s\S]*?<\/svg>/g, "")
    .replace(/<span class="rung-label">[\s\S]*?<\/span>/g, "");
}

let problems = 0;
let lessons = 0;

function checkCourse(course) {
  const sb = runtime();
  vm.runInContext(fs.readFileSync(path.join(root, "courses", course, "curriculum.js"), "utf8"),
    sb, { filename: course });
  const EC = sb.EC, C = EC.course;
  for (const id of (C.published || [])) {
    let L = null;
    EC.receiveLesson = l => { L = l; };
    const rel = `courses/${course}/lessons/${EC.lessonDir(C.lessonById[id])}/${id}.js`;
    try {
      vm.runInContext(fs.readFileSync(path.join(root, rel), "utf8"), sb, { filename: rel });
    } catch (err) {
      problems++;
      console.log(`  LOAD FAILED  ${rel}  ${err.message}`);
      continue;
    }
    if (!L) continue;
    lessons++;
    let html;
    try {
      html = EC.render((L.blocks || []).concat([
        { t: "takeaways", items: L.takeaways || [] },
        { t: "quiz", questions: (L.quiz || {}).questions || [] },
        { t: "interview", questions: (L.interview || {}).questions || [] }
      ]));
    } catch (err) {
      problems++;
      console.log(`  RENDER FAILED  ${rel}  ${err.message}`);
      continue;
    }
    for (const m of prose(html).matchAll(/\*\*/g)) {
      problems++;
      const from = Math.max(0, m.index - 60);
      const snippet = prose(html).slice(from, m.index + 60).replace(/\s+/g, " ");
      console.log(`  LITERAL **  ${course}/${id}  ...${snippet}...`);
    }
  }
}

const named = process.argv.slice(2);
const courses = named.length ? named
  : fs.readdirSync(path.join(root, "courses"))
      .filter(c => fs.existsSync(path.join(root, "courses", c, "curriculum.js")));
courses.forEach(checkCourse);

if (problems) {
  console.log(`check-emphasis: FAILED — ${problems} literal ** in prose, across ${lessons} lessons`);
  process.exit(1);
}
console.log(`check-emphasis: ok — ${lessons} lessons, no markdown emphasis left unrendered`);
