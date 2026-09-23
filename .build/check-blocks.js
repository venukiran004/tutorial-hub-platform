/* ============================================================================
   check-blocks.js — catches blocks that pass the render test but render empty.

   The render test loads a lesson and checks its shape; it does not know that a
   callout's prose lives under `body` and that a `text` key on one is silently
   dropped by the renderer. That mistake produces a callout with a title and
   nothing under it, which no structural check notices and every reader does.

   Usage:  node .build/check-blocks.js courses/adk/lessons
           node .build/check-blocks.js            # every course
   ========================================================================= */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

let problems = 0;
let checked = 0;

/* Blocks whose prose is a `body` (string or block list), never a `text`. */
const BODY_BLOCKS = new Set(["callout", "exercise"]);

function check(blocks, id, file) {
  (blocks || []).forEach(b => {
    if (!b || typeof b !== "object") return;

    if (b.t === "callout") {
      checked++;
      if (!b.body && !b.blocks) {
        problems++;
        const why = b.text ? "prose is under `text`; the renderer reads `body`" : "no body at all";
        console.log(`  EMPTY CALLOUT  ${file}  ${id}  "${(b.title || "").slice(0, 46)}" — ${why}`);
      } else if (typeof (b.body || b.blocks) === "string") {
        /* render() accepts a bare string, but lesson-page.js walks the block
           tree to count code samples and calls .forEach on it, so a string
           body throws and the whole page renders blank. Always a block list. */
        problems++;
        console.log(`  STRING BODY  ${file}  ${id}  "${(b.title || "").slice(0, 46)}" — use [{ t: "p", text: … }]`);
      }
    }

    if (b.t === "diagram") {
      checked++;
      /* The input key each kind reads, from assets/js/diagrams.js. */
      const KEYS = {
        flow: "nodes", steps: "items", memory: "names", trace: "steps", cells: "items",
        tree: "root", layers: "items", compare: "columns", timeline: "lanes",
        cycle: "nodes", matrix: "rows"
      };
      const key = KEYS[b.kind];
      if (key === "root") {
        if (!b.root || !b.root.label) {
          problems++;
          console.log(`  EMPTY DIAGRAM  ${file}  ${id}  kind="tree" needs a "root" with a label`);
        }
      } else if (!key) {
        problems++;
        console.log(`  UNKNOWN DIAGRAM  ${file}  ${id}  kind="${b.kind}"`);
      } else if (!Array.isArray(b[key]) || !b[key].length) {
        problems++;
        console.log(`  EMPTY DIAGRAM  ${file}  ${id}  kind="${b.kind}" needs a non-empty "${key}"`);
      }
    }

    if (b.blocks) check(b.blocks, id, file);
    if (b.body && Array.isArray(b.body)) check(b.body, id, file);
    if (b.solution && Array.isArray(b.solution.notes)) check(b.solution.notes, id, file);
  });
}

function scan(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) { scan(p); continue; }
    if (!entry.name.endsWith(".js")) continue;
    const ctx = {
      EC: { receiveLesson: L => check(L.blocks, L.id, path.relative(process.cwd(), p)) },
      console
    };
    vm.createContext(ctx);
    try {
      vm.runInContext(fs.readFileSync(p, "utf8"), ctx);
    } catch (err) {
      problems++;
      console.log(`  LOAD FAILED  ${p}  ${err.message}`);
    }
  }
}

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
  console.log(`check-blocks: FAILED — ${problems} problem(s) in ${checked} blocks`);
  process.exit(1);
}
console.log(`check-blocks: ok — ${checked} callouts and diagrams all render`);
