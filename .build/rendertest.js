/* Headless smoke test. Loads the real runtime, defines the course, then renders
   every published lesson and asserts the output is structurally sound.

   This catches the failure modes that are invisible in source review:
     - a lesson file whose Python code contains an unescaped backtick, which
       silently terminates the JS template literal it lives in
     - an unknown block type (renders as nothing, raises no error)
     - a quiz whose answer index is out of range
     - a prerequisite pointing at a lesson id that does not exist
     - unbalanced markup after a renderer change

   Run: node .build/rendertest.js
*/
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");

// Minimal DOM stubs: app.js owns defineCourse and touches documentElement and
// localStorage at load time. Enough to exercise the data and render layers.
const noop = () => {};
const el = {
  setAttribute: noop, removeAttribute: noop, addEventListener: noop,
  appendChild: noop, style: {}, classList: { toggle: noop, add: noop, remove: noop }
};
const sandbox = {
  console, setTimeout, requestAnimationFrame: noop,
  document: {
    documentElement: el, body: el, head: el,
    querySelector: () => null, querySelectorAll: () => [],
    createElement: () => el, addEventListener: noop, getElementById: () => null
  },
  localStorage: { getItem: () => null, setItem: noop, removeItem: noop },
  navigator: {}, location: { search: "", href: "" },
  URLSearchParams: class { get() { return null; } }
};
sandbox.window = sandbox;
vm.createContext(sandbox);

function load(rel) {
  const src = fs.readFileSync(path.join(root, rel), "utf8");
  try {
    vm.runInContext(src, sandbox, { filename: rel });
  } catch (e) {
    console.error(`\nFAIL  ${rel}\n      ${e.message}\n`);
    process.exit(1);
  }
}

let fails = 0;
function check(name, cond, detail) {
  if (cond) console.log(`  ok   ${name}`);
  else { console.log(`  FAIL ${name}${detail ? " — " + detail : ""}`); fails++; }
}

console.log("loading runtime...");
load("assets/js/highlight.js");
load("assets/js/render.js");
load("assets/js/app.js");
const COURSE = process.env.TH_COURSE || "python";
load(`courses/${COURSE}/curriculum.js`);

const EC = sandbox.EC;
const C = EC.course;

/* ------------------------------------------------------------- curriculum */
console.log("\ncurriculum");
check("course defined", !!C);
check("modules present", C.modules.length >= 10, `got ${C.modules.length}`);
check("lessons indexed", C.allLessons.length > 100, `got ${C.allLessons.length}`);
check("lesson ids unique", new Set(C.allLessons.map(l => l.id)).size === C.allLessons.length);
// The practice track numbers as P1.1 while its ids stay lowercase p1.1,
// so the comparison is case-insensitive.
// Practice ids carry a "c" prefix that the generated numbering does not.
check("numbering matches ids", C.allLessons.every(l =>
  l.id.replace(/^[a-z]+/i, "") === l.num.replace(/^[A-Z]*/, "")),
  C.allLessons.filter(l => l.id !== l.num).slice(0, 3).map(l => `${l.id}!=${l.num}`).join(", "));
check("prev/next linked", C.allLessons[0].prev === null &&
  C.allLessons[0].next === C.allLessons[1] &&
  C.allLessons[C.allLessons.length - 1].next === null);
check("every lesson has summary", C.allLessons.every(l => l.summary && l.summary.length > 20));
check("every lesson has difficulty",
  C.allLessons.every(l => ["foundation", "core", "advanced", "expert"].includes(l.difficulty)));
check("every lesson has minutes", C.allLessons.every(l => l.minutes >= 12 && l.minutes <= 60));
check("every module has blurb + outcome", C.modules.every(m => m.outcome && m.blurb));
check("published ids all exist", (C.published || []).every(id => !!C.lessonById[id]),
  (C.published || []).filter(id => !C.lessonById[id]).join(", "));

/* -------------------------------------------------------- inline formatter */
console.log("\ninline formatter");
const inl = EC.inline;
check("code span", inl("use `dict.get()` here").includes("<code>dict.get()</code>"));
check("bold", inl("**strong** text").includes("<strong>strong</strong>"));
check("link", inl("see [docs](a.html)").includes('<a href="a.html">docs</a>'));
check("escapes html", inl("a < b & c").includes("&lt;") && inl("a < b & c").includes("&amp;"));
check("no false placeholder match",
  inl("`x` costs 3 units and 7 more") === "<code>x</code> costs 3 units and 7 more",
  JSON.stringify(inl("`x` costs 3 units and 7 more")));
check("code span not re-formatted", inl("`a ** b`").includes("a ** b"));

/* -------------------------------------------------------------- highlighter */
console.log("\nhighlighter");
const hl = sandbox.HL.highlight;
check("keyword", hl("def f():", "python").includes('class="tok-kw">def'));
check("def name", hl("def apply_tax():", "python").includes('class="tok-def">apply_tax'));
check("string", hl('x = "hi"', "python").includes('class="tok-str">"hi"'));
check("number", hl("x = 1.08", "python").includes('class="tok-num">1.08'));
check("comment", hl("x = 1  # note", "python").includes('class="tok-com"># note'));
check("self", hl("self.x", "python").includes('class="tok-self">self'));
check("builtin", hl("len(x)", "python").includes('class="tok-bi">len'));
check("decorator", hl("@property", "python").includes('class="tok-dec">@property'));
check("f-string interpolation", hl('f"a{b}c"', "python").includes("tok-op"));
check("escapes source", hl("a < b", "python").includes("&lt;"));
check("bash", hl("$ pip install x", "bash").includes("tok-bi"));
check("json key vs value", hl('{"a": "b"}', "json").includes("tok-fn"));

console.log("\nline splitting");
const lines = sandbox.HL.toLines(hl('x = """a\nb"""\ny = 1', "python"));
check("multiline string split into rows", lines.length === 3, `got ${lines.length}`);
check("spans balanced per row", lines.every(l => {
  const o = (l.match(/<span/g) || []).length, c = (l.match(/<\/span>/g) || []).length;
  return o === c;
}));

/* ------------------------------------------------------------ every lesson */
const published = C.published || [];
console.log(`\nlessons (${published.length} published)`);

for (const id of published) {
  let L = null;
  EC.receiveLesson = (lesson) => { L = lesson; };
  load(`courses/${COURSE}/lessons/${EC.lessonDir(C.lessonById[id])}/${id}.js`);

  const p = (name, cond, detail) => check(`${id}  ${name}`, cond, detail);

  if (!L) { p("registered", false); continue; }
  const quizQs = (L.quiz || {}).questions || [];
  const ivQs = (L.interview || {}).questions || [];

  // A question set is judged on its questions, not on the essay furniture
  // a taught lesson carries. Detected from the blocks so it applies to
  // Python's imported interview sets as well as the Practice course.
  const drillBlocks = (L.blocks || []).filter(b => b.t === "drill");
  const isPractice = drillBlocks.length >= 5;

  p("id matches filename", L.id === id, `declares ${L.id}`);
  p("lede", !!L.lede && L.lede.length > 80);
  p("objectives >= 4", (L.objectives || []).length >= 4);
  p("prereqs resolve", (L.prerequisites || []).every(x => !!C.lessonById[x]),
    (L.prerequisites || []).filter(x => !C.lessonById[x]).join(", "));

  // A problem set is judged on its problems, not on the essay furniture a
  // language lesson carries. Gating it on takeaways and a quiz would only
  // teach the importer to emit filler.
  if (!isPractice) {
    p("takeaways >= 5", (L.takeaways || []).length >= 5);
    p("quiz >= 3", quizQs.length >= 3);
    p("quiz answers in range", quizQs.every(q => q.answer >= 0 && q.answer < q.options.length));
    p("quiz explains why", quizQs.every(q => q.why && q.why.length > 60));
    p("interview >= 3", ivQs.length >= 3);
  } else {
    const drills = drillBlocks;
    p("drills >= 5", drills.length >= 5, `${drills.length}`);
    p("every drill has a question", drills.every(d => d.q && d.q.length > 3));
    if (COURSE === "practice") {
      p("every drill has code", drills.every(d => (d.body || []).some(x => x.t === "code")),
        drills.filter(d => !(d.body || []).some(x => x.t === "code")).map(d => d.q).slice(0, 2).join(" | "));
    } else {
      p("every drill has an answer", drills.every(d => (d.body || []).length > 0));
    }
    p("drill numbering is sequential",
      drills.every((d, i) => Number(d.n) === i + 1));
  }

  const warned = [];
  const origWarn = console.warn;
  console.warn = (...a) => warned.push(a.join(" "));
  let html = "";
  let threw = null;
  try {
    html = EC.render((L.blocks || []).concat([
      { t: "takeaways", items: L.takeaways || [] },
      { t: "quiz", questions: quizQs },
      { t: "interview", questions: ivQs }
    ]));
  } catch (e) { threw = e.message; }
  console.warn = origWarn;

  if (threw) { p("renders", false, threw); continue; }

  p("no unknown block types", warned.length === 0, warned.join("; "));
  p("substantial", html.length > (isPractice ? 6000 : 25000), `${html.length} chars`);
  if (isPractice) {
    p("every drill closed by default", !/<details class="drill[^"]*" open/.test(html));
    p("no markup in questions",
      (L.blocks || []).filter(b => b.t === "drill")
        .every(d => !/<[a-z/]/i.test(d.q)));
  } else {
    p("has an exercise", html.includes('class="exercise"'));
  }
  p("solution hidden by default",
    !html.includes('class="solution"') || /class="solution" id="[^"]*" hidden/.test(html));
  p("no undefined leaked", !/>undefined<|="undefined"/.test(html));
  p("no unresolved placeholder", !html.includes(" "));
  p("divs balanced",
    (html.match(/<div/g) || []).length === (html.match(/<\/div>/g) || []).length,
    `${(html.match(/<div/g) || []).length} open vs ${(html.match(/<\/div>/g) || []).length} close`);
}

console.log(`\n${fails === 0 ? "PASS - all checks green" : "FAILED - " + fails + " check(s)"}`);
process.exit(fails === 0 ? 0 : 1);
