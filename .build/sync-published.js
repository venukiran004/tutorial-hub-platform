/* Regenerates the `published` array in a course's curriculum.js from the files
   actually present in lessons/. Removes the chance of shipping a lesson file
   nobody can reach, or advertising one that does not exist.
   Run: node .build/sync-published.js [courseDir] */
"use strict";
const fs = require("fs");
const path = require("path");

const course = process.argv[2] || "courses/python";
const root = path.join(__dirname, "..", course);
const lessonsDir = path.join(root, "lessons");
const curriculum = path.join(root, "curriculum.js");

// Lessons live one folder per module: lessons/02_core/2.11.js
// Non-default tracks nest one level deeper: lessons/practice/01_p_strings/p1.1.js
function collect(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(d => {
    const full = path.join(dir, d.name);
    if (d.isDirectory()) return collect(full);
    return d.name.endsWith(".js") ? [d.name.slice(0, -3)] : [];
  });
}

// Sort by track prefix first (numeric ids before p-prefixed ones), then
// numerically on module.lesson so 1.10 follows 1.9 rather than 1.1.
function key(id) {
  const m = /^([a-z]*)(\d+)\.(\d+)$/i.exec(id);
  return m ? [m[1].toLowerCase(), Number(m[2]), Number(m[3])] : [id, 0, 0];
}

const ids = collect(lessonsDir).sort((a, b) => {
  const [ap, am, al] = key(a), [bp, bm, bl] = key(b);
  return ap.localeCompare(bp) || am - bm || al - bl;
});

const src = fs.readFileSync(curriculum, "utf8");
const line = `    published: [${ids.map(i => `"${i}"`).join(", ")}],`;
const next = src.replace(/^ {4}published: \[[^\]]*\],$/m, line);

if (next === src && !src.includes(line)) {
  console.error("could not find the published: [...] line to replace");
  process.exit(1);
}
fs.writeFileSync(curriculum, next);
console.log(`${course}: ${ids.length} published — ${ids.join(", ")}`);
