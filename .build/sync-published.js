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
const ids = fs.readdirSync(lessonsDir, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .flatMap(d =>
    fs.readdirSync(path.join(lessonsDir, d.name))
      .filter(f => f.endsWith(".js"))
      .map(f => f.slice(0, -3))
  )
  // numeric sort on module.lesson so 1.10 follows 1.9, not 1.1
  .sort((a, b) => {
    const [am, al] = a.split(".").map(Number);
    const [bm, bl] = b.split(".").map(Number);
    return am - bm || al - bl;
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
