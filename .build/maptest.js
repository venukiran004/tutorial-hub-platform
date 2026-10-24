/* Headless test for the curriculum map.

   The map is the densest markup on the site — one element per lesson, 179 of
   them on the biggest course — and all of it is built by string concatenation,
   which is exactly where a missing quote or a stale field name hides. So this
   runs the real builder over the real curricula and counts what comes back,
   rather than trusting a reading of the source.

   What it asserts, per course and per track:
     - one row per module, in curriculum order
     - one tile per lesson, and the row's own tile count matches its module
     - a "soon" lesson renders as a <span>, never as a link to a missing page
     - every link resolves through EC.lessonHref, with the id encoded
     - seeded progress fills exactly the tiles it should, and the read count
       on each row agrees with the tiles in it
     - the "you are here" ring appears exactly once
     - no "undefined", "NaN" or "null" reaches the markup
     - tags balance, and every attribute value is quoted

   Run: node .build/maptest.js
*/
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");

const noop = () => {};

/* The same shape of stub rendertest.js uses: course-page.js only defines
   functions at load time, so nothing here needs to behave like a real DOM. */
function sandboxFor() {
  const el = {
    setAttribute: noop, removeAttribute: noop, addEventListener: noop,
    appendChild: noop, insertBefore: noop, style: {},
    classList: { toggle: noop, add: noop, remove: noop, contains: () => false },
    querySelector: () => null, querySelectorAll: () => []
  };
  const sb = {
    console,
    setTimeout,
    requestAnimationFrame: noop,
    document: {
      documentElement: el,
      body: el,
      createElement: () => el,
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
      addEventListener: noop,
      readyState: "complete"
    },
    localStorage: { getItem: () => null, setItem: noop, removeItem: noop },
    location: { search: "" },
    matchMedia: () => ({ matches: false }),
    navigator: { userAgent: "node" },
    URLSearchParams: typeof URLSearchParams !== "undefined" ? URLSearchParams : undefined
  };
  sb.window = sb;
  sb.globalThis = sb;
  return sb;
}

function load(ctx, rel) {
  const src = fs.readFileSync(path.join(root, rel), "utf8");
  vm.runInContext(src, ctx, { filename: rel });
}

let failures = 0;
let checked = 0;
let tilesSeen = 0;

function fail(course, msg) {
  console.log("  FAIL  " + course.padEnd(11) + " " + msg);
  failures++;
}

const courses = fs.readdirSync(path.join(root, "courses")).filter(c =>
  fs.existsSync(path.join(root, "courses", c, "curriculum.js")));

for (const course of courses) {
  const sb = sandboxFor();
  const ctx = vm.createContext(sb);

  try {
    load(ctx, "assets/js/render.js");
    load(ctx, "assets/js/app.js");
    load(ctx, "assets/js/progress.js");
    load(ctx, path.join("courses", course, "curriculum.js"));
    load(ctx, "assets/js/course-page.js");
  } catch (e) {
    fail(course, "loading the runtime threw: " + e.message);
    continue;
  }

  const EC = sb.EC;
  const C = EC.course;

  if (typeof EC.curriculumMapHTML !== "function") {
    fail(course, "EC.curriculumMapHTML is not defined");
    continue;
  }

  for (const track of C.trackOrder) {
    const tr = C.tracks[track];
    const label = course + "/" + track;

    /* Seed progress: every other published lesson read, so the test
       distinguishes read from unread rather than checking an empty state. */
    const read = {};
    const pub = tr.lessons.filter(l => l.ready !== false);
    pub.forEach((l, i) => { if (i % 2 === 0) read[l.id] = 1; });
    const nextId = pub.length ? pub[Math.min(1, pub.length - 1)].id : null;

    let html;
    try {
      html = EC.curriculumMapHTML(C, track, read, nextId);
    } catch (e) {
      fail(label, "builder threw: " + e.message);
      continue;
    }
    checked++;

    /* ---- rows and tiles ----------------------------------------------
       The legend is appended after the rows and uses the same tile classes,
       so it is cut off before anything is counted. */
    const cut = html.indexOf('<div class="cmap-key">');
    if (cut === -1) { fail(label, "the legend is missing"); continue; }
    const body = html.slice(0, cut);
    const legend = html.slice(cut);
    if ((legend.match(/class="cmap-tile /g) || []).length !== 7) {
      fail(label, "the legend no longer carries its seven sample tiles");
    }

    const rows = body.match(/<div class="cmap-row[^"]*" data-m="[^"]*"/g) || [];
    if (rows.length !== tr.modules.length) {
      fail(label, `${rows.length} rows for ${tr.modules.length} modules`);
    }

    // Tiles outside the key: the key's four samples carry no data-tip.
    const tiles = body.match(/class="cmap-tile [^"]*"[^>]*data-tip=/g) || [];
    if (tiles.length !== tr.lessons.length) {
      fail(label, `${tiles.length} tiles for ${tr.lessons.length} lessons`);
    }
    tilesSeen += tiles.length;

    /* Per-row: the tile count and the read count must match the module. The
       split is on the row opener, so each chunk holds exactly one row. */
    const chunks = body.split('<div class="cmap-row').slice(1);
    if (chunks.length === tr.modules.length) {
      tr.modules.forEach((m, i) => {
        const chunk = chunks[i];
        const n = (chunk.match(/class="cmap-tile [^"]*"[^>]*data-tip=/g) || []).length;
        if (n !== m.lessons.length) {
          fail(label, `module ${m.id}: ${n} tiles for ${m.lessons.length} lessons`);
        }
        const rd = m.lessons.filter(l => l.ready !== false && read[l.id]).length;
        const pubN = m.lessons.filter(l => l.ready !== false).length;
        if (rd > 0) {
          const want = `<span class="cmap-rd">${rd}/${pubN}</span>`;
          if (chunk.indexOf(want) === -1) {
            fail(label, `module ${m.id}: read count ${rd}/${pubN} missing from the row`);
          }
        }
        const isRead = (chunk.match(/is-read/g) || []).length;
        if (isRead !== rd) {
          fail(label, `module ${m.id}: ${isRead} filled tiles for ${rd} read lessons`);
        }
      });
    }

    /* ---- soon lessons must not be links ------------------------------ */
    const soon = tr.lessons.filter(l => l.ready === false);
    const soonSpans = (body.match(/<span class="cmap-tile [^"]*is-soon/g) || []).length;
    if (soonSpans !== soon.length) {
      fail(label, `${soonSpans} soon tiles for ${soon.length} unpublished lessons`);
    }
    for (const l of soon) {
      if (body.indexOf('href="' + EC.lessonHref(l) + '"') !== -1) {
        fail(label, `unpublished lesson ${l.id} is linked`);
      }
    }

    /* ---- published lessons must be linked, by the shared href ------- */
    for (const l of pub) {
      if (body.indexOf('href="' + EC.lessonHref(l) + '"') === -1) {
        fail(label, `published lesson ${l.id} has no link in the map`);
      }
    }

    /* ---- the "you are here" ring, exactly once --------------------- */
    const rings = (body.match(/is-next/g) || []).length;
    if (nextId && rings !== 1) fail(label, `${rings} tiles ringed as next, expected 1`);

    /* ---- nothing leaked -------------------------------------------
       Tooltips and labels quote lesson titles verbatim, and one lesson is
       called "NaN and Inf Losses", so those two attributes come out before
       the scan. A leak anywhere else is the builder's. */
    const scan = body.replace(/ data-tip="[^"]*"/g, "").replace(/ aria-label="[^"]*"/g, "");
    for (const bad of ["undefined", "NaN", ">null<", "[object"]) {
      const at = scan.indexOf(bad);
      if (at !== -1) {
        fail(label, `markup contains ${bad}: ...${scan.slice(Math.max(0, at - 60), at + 20)}...`);
      }
    }

    /* ---- structure ------------------------------------------------ */
    const open = (html.match(/<(div|span|a|button|i|b)\b/g) || []).length;
    const close = (html.match(/<\/(div|span|a|button|i|b)>/g) || []).length;
    if (open !== close) fail(label, `${open} opening tags against ${close} closing tags`);

    /* A tag with an odd number of quotes lost one in a concatenation, which
       is the failure that silently swallows the rest of the attributes. */
    for (const tag of html.match(/<[a-z][^>]*>/g) || []) {
      if ((tag.match(/"/g) || []).length % 2 !== 0) {
        fail(label, "unbalanced quotes in: " + tag.slice(0, 90));
        break;
      }
    }
  }
}

console.log(`maptest: ${failures ? failures + " FAILURE(S)" : "ok"} — ` +
            `${courses.length} courses, ${checked} tracks, ${tilesSeen} tiles`);
process.exit(failures ? 1 : 0);
