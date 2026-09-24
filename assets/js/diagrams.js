/* ============================================================================
   TUTORIAL HUB — DATA-DRIVEN DIAGRAMS
   ----------------------------------------------------------------------------
   A `diagram` block describes a picture as data and this file draws it as
   SVG at render time, so a lesson can carry a diagram in six lines instead
   of sixty, and every diagram of a kind looks the same across the site.

     { t: "diagram", kind: "flow",     nodes: [...], edges: [...] }   boxes and arrows, left to right
     { t: "diagram", kind: "steps",    items: [{label, desc}] }        a numbered process, top to bottom
     { t: "diagram", kind: "memory",   names: [...], objects: [...] }  names bound to objects
     { t: "diagram", kind: "cells",    items: [...], highlight: [...] } a sequence with its indices
     { t: "diagram", kind: "tree",     root: {label, children} }       a hierarchy
     { t: "diagram", kind: "layers",   items: [...] }                  a stack, bottom up
     { t: "diagram", kind: "compare",  columns: [{title, items}] }     side by side
     { t: "diagram", kind: "timeline", lanes: [{label, bars}] }        who ran when
     { t: "diagram", kind: "cycle",    nodes: [...] }                  a loop of states
     { t: "diagram", kind: "matrix",   rows, cols, cells }             a grid of verdicts

   Every colour is a CSS token (--accent, --good, --warn, --crit, --violet,
   --teal) so the diagrams re-theme with the page. Text uses the s-label /
   s-sub / s-mono classes the hand-drawn diagrams already use.
   ========================================================================= */
(function () {
  "use strict";

  var TONES = { accent: "--accent", good: "--good", warn: "--warn", crit: "--crit", violet: "--violet", teal: "--teal" };

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function tone(t) { return TONES[t] || null; }
  function boxStyle(t, strong) {
    var v = tone(t);
    if (!v) return 'class="s-fill s-stroke" stroke-width="1.3"';
    return 'style="fill:var(' + v + ');fill-opacity:' + (strong ? ".22" : ".13") + ';stroke:var(' + v + ')" stroke-width="1.4"';
  }
  function marker(id) {
    return '<defs><marker id="' + id + '" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--line)"/></marker></defs>';
  }
  function arrow(id, x1, y1, x2, y2, label, dashed) {
    var s = '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" style="stroke:var(--line)' + (dashed ? ";stroke-dasharray:5 4" : "") + '" stroke-width="1.4" marker-end="url(#' + id + ')"/>';
    if (label) s += '<text x="' + ((x1 + x2) / 2) + '" y="' + ((y1 + y2) / 2 - 7) + '" text-anchor="middle" class="s-sub">' + esc(label) + "</text>";
    return s;
  }
  // Rough text width so boxes fit their labels; the fonts are known.
  function tw(s, size) { return String(s == null ? "" : s).length * (size || 6.6); }
  // Break a string into lines that fit `width` at roughly `cw` px per character.
  function wrapLines(str, width, cw) {
    var max = Math.max(6, Math.floor(width / cw)), words = String(str == null ? "" : str).split(" "), lines = [], cur = "";
    words.forEach(function (w) {
      if ((cur + " " + w).trim().length > max && cur) { lines.push(cur); cur = w; }
      else cur = (cur + " " + w).trim();
    });
    if (cur) lines.push(cur);
    return lines;
  }
  function box(x, y, w, h, label, sub, t, mono) {
    var s = '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="9" ' + boxStyle(t) + "/>";
    var cx = x + w / 2, cy = y + h / 2;
    // A label wider than the box shrinks, then wraps; a wrapped label displaces the sub-line.
    var small = tw(label) > w - 14, lines = wrapLines(label, w - 14, small ? 5.6 : 6.6);
    var subLines = sub ? wrapLines(sub, w - 14, 5.4) : [];
    if (lines.length > 1 && subLines.length > 1) subLines = [subLines[0]];
    var lh = small ? 12 : 14, total = lines.length * lh + subLines.length * 12;
    var y0 = cy - total / 2 + (small ? 9 : 10);
    lines.forEach(function (l, i) {
      s += '<text x="' + cx + '" y="' + (y0 + i * lh) + '" text-anchor="middle" class="' + (mono ? "s-mono" : "s-label") + '"' + (small ? ' style="font-size:10.5px"' : "") + '>' + esc(l) + "</text>";
    });
    subLines.forEach(function (l, i) {
      s += '<text x="' + cx + '" y="' + (y0 + lines.length * lh + i * 12 - 1) + '" text-anchor="middle" class="s-sub">' + esc(l) + "</text>";
    });
    return s;
  }
  function wrap(w, h, inner, label) {
    return '<svg viewBox="0 0 ' + w + " " + h + '" role="img" aria-label="' + esc(label || "diagram") + '">' + inner + "</svg>";
  }

  /* ---------------------------------------------------------------- flow -- */
  function flow(b) {
    var nodes = b.nodes || [], edges = b.edges || [];
    var cols = b.cols || Math.min(nodes.length, 5), rows = Math.ceil(nodes.length / cols);
    var labelled = edges.some(function (e) { return e[2]; });
    var W = 760, gapX = labelled ? 56 : 28, padX = 16;
    var bw = Math.min(200, Math.floor((W - 2 * padX - gapX * (cols - 1)) / cols)), bh = 54, gapY = 44;
    var pos = {}, id = "d" + Math.random().toString(36).slice(2, 7);
    var s = marker(id);
    nodes.forEach(function (n, i) {
      var r = Math.floor(i / cols), c = i % cols;
      var inRow = Math.min(cols, nodes.length - r * cols);
      var rowW = inRow * bw + (inRow - 1) * gapX, x0 = (W - rowW) / 2;
      var x = x0 + c * (bw + gapX), y = (labelled ? 24 : 16) + r * (bh + gapY);
      pos[n.id || String(i)] = { x: x, y: y, w: bw, h: bh };
      s += box(x, y, bw, bh, n.label, n.sub, n.tone);
    });
    edges.forEach(function (e) {
      var a = pos[e[0]], c = pos[e[1]]; if (!a || !c) return;
      var x1, y1, x2, y2;
      if (Math.abs(a.y - c.y) < 1) {          // same row: side to side, label above the boxes
        if (a.x < c.x) { x1 = a.x + a.w; x2 = c.x; } else { x1 = a.x; x2 = c.x + c.w; }
        y1 = y2 = a.y + a.h / 2;
        s += arrow(id, x1, y1, x2, y2, null, e[3] === "dashed");
        if (e[2]) s += '<text x="' + ((x1 + x2) / 2) + '" y="' + (a.y - 5) + '" text-anchor="middle" class="s-sub">' + esc(e[2]) + "</text>";
        return;
      } else if (a.y < c.y) { x1 = a.x + a.w / 2; y1 = a.y + a.h; x2 = c.x + c.w / 2; y2 = c.y; }
      else { x1 = a.x + a.w / 2; y1 = a.y; x2 = c.x + c.w / 2; y2 = c.y + c.h; }
      s += arrow(id, x1, y1, x2, y2, e[2], e[3] === "dashed");
    });
    return wrap(W, (labelled ? 24 : 16) + rows * bh + (rows - 1) * gapY + 16, s, b.title);
  }

  /* --------------------------------------------------------------- steps -- */
  function steps(b) {
    var items = b.items || [], W = 760, rowH = 58, s = "";
    items.forEach(function (it, i) {
      var y = 10 + i * rowH, t = tone(it.tone) || "--accent";
      s += '<circle cx="34" cy="' + (y + 22) + '" r="16" style="fill:var(' + t + ');fill-opacity:.18;stroke:var(' + t + ')" stroke-width="1.4"/>';
      s += '<text x="34" y="' + (y + 27) + '" text-anchor="middle" class="s-mono">' + (i + 1) + "</text>";
      if (i < items.length - 1) s += '<line x1="34" y1="' + (y + 40) + '" x2="34" y2="' + (y + rowH + 4) + '" style="stroke:var(--line)" stroke-width="1.4"/>';
      s += '<text x="64" y="' + (y + 18) + '" class="s-label">' + esc(it.label) + "</text>";
      if (it.desc) s += '<text x="64" y="' + (y + 36) + '" class="s-sub">' + esc(it.desc) + "</text>";
      if (it.code) s += '<text x="' + (W - 12) + '" y="' + (y + 27) + '" text-anchor="end" class="s-mono">' + esc(it.code) + "</text>";
    });
    return wrap(W, 10 + items.length * rowH, s, b.title);
  }

  /* -------------------------------------------------------------- memory -- */
  /* Names on the left, objects on the right, arrows for the bindings. The
     picture of Python's data model: a variable is a name, not a box. */
  function memory(b) {
    var names = b.names || [], objs = b.objects || [], W = 760;
    var rowH = 56, n = Math.max(names.length, objs.length), id = "d" + Math.random().toString(36).slice(2, 7);
    var s = marker(id), ny = {}, oy = {}, ox = {}, hits = {};
    var nameW = Math.min(220, Math.max(120, 24 + names.reduce(function (a, nm) { return Math.max(a, tw(nm.name, 6.8)); }, 0)));
    s += '<text x="' + (20 + nameW / 2) + '" y="16" text-anchor="middle" class="s-sub">' + esc(b.left || "names") + "</text>";
    s += '<text x="' + (330 + 200) + '" y="16" text-anchor="middle" class="s-sub">' + esc(b.right || "objects") + "</text>";
    names.forEach(function (nm, i) {
      var y = 30 + i * rowH; ny[nm.name] = y + 20;
      s += '<rect x="20" y="' + y + '" width="' + nameW + '" height="40" rx="8" class="s-fill s-stroke" stroke-width="1.3"/>';
      s += '<text x="' + (20 + nameW / 2) + '" y="' + (y + 25) + '" text-anchor="middle" class="s-mono">' + esc(nm.name) + "</text>";
    });
    objs.forEach(function (o, i) {
      var y = 30 + i * rowH; oy[o.id] = y;
      var typeW = o.type ? tw(o.type, 6.2) + 10 : 0, valW = tw(o.value, 7.2) + 24;
      var w = Math.max(150, Math.min(400, typeW + valW)); ox[o.id] = w;
      s += '<rect x="330" y="' + y + '" width="' + w + '" height="40" rx="8" ' + boxStyle(o.tone || "accent") + "/>";
      if (o.type) s += '<text x="342" y="' + (y + 25) + '" class="s-sub">' + esc(o.type) + "</text>";
      s += '<text x="' + (342 + typeW) + '" y="' + (y + 25) + '" class="s-mono">' + esc(o.value) + "</text>";
      if (o.note) s += '<text x="' + (330 + w + 12) + '" y="' + (y + 25) + '" class="s-sub">' + esc(o.note) + "</text>";
    });
    names.forEach(function (nm) {
      if (!nm.to || oy[nm.to] == null) return;
      // several names on one object: spread the arrowheads down its left edge
      var k = hits[nm.to] = (hits[nm.to] || 0) + 1;
      var ty = oy[nm.to] + Math.min(32, 8 + (k - 1) * 12);
      s += arrow(id, 20 + nameW, ny[nm.name], 328, ty, nm.label, nm.dashed);
    });
    return wrap(W, 30 + n * rowH, s, b.title);
  }

  /* --------------------------------------------------------------- trace -- */
  /* A program on the left, the state of its names after each line on the
     right — the static form of stepping through code in a debugger. */
  function trace(b) {
    var steps = b.steps || [], vars = b.vars || [], W = 760, rowH = b.rowH || 30, codeW = b.codeW || 330;
    var noteW = steps.some(function (st) { return st.note; }) ? 150 : 0;
    var colW = (W - codeW - 24 - noteW) / Math.max(vars.length, 1), s = "";
    // headers wrap onto two lines when the column is narrow
    var heads = vars.map(function (v) { return tw(v, 6.6) > colW - 8 ? wrapLines(v, colW - 8, 6.2).slice(0, 2) : [v]; });
    var twoLine = heads.some(function (h) { return h.length > 1; });
    var y0 = twoLine ? 38 : 26;
    s += '<text x="20" y="16" class="s-sub">' + esc(b.left || "line executed") + "</text>";
    heads.forEach(function (h, j) {
      h.forEach(function (line, k) {
        s += '<text x="' + (codeW + 12 + j * colW + colW / 2) + '" y="' + (16 + k * 12) + '" text-anchor="middle" class="s-mono" style="font-size:10px;fill:var(--ink)">' + esc(line) + "</text>";
      });
    });
    steps.forEach(function (st, i) {
      var y = y0 + i * rowH, hi = st.tone ? boxStyle(st.tone, true) : (i % 2 ? 'class="s-fill"' : 'class="s-fill-2"');
      s += '<rect x="12" y="' + y + '" width="' + (W - 24) + '" height="' + (rowH - 2) + '" rx="5" ' + hi + (st.tone ? "" : ' style="fill-opacity:.5"') + "/>";
      s += '<text x="20" y="' + (y + rowH / 2 + 4) + '" class="s-mono">' + esc(st.code) + "</text>";
      (st.state || []).forEach(function (val, j) {
        var changed = st.changed && st.changed.indexOf(j) !== -1;
        var fit = tw(String(val == null ? "" : val), 7) > colW - 8 ? "font-size:9.5px;" : "";
        s += '<text x="' + (codeW + 12 + j * colW + colW / 2) + '" y="' + (y + rowH / 2 + 4) + '" text-anchor="middle" class="s-mono" style="' + fit +
          (changed ? 'fill:var(--good);font-weight:600' : (val === "" || val == null ? 'fill:var(--ink-4)' : "")) + '">' + esc(val === "" || val == null ? "—" : val) + "</text>";
      });
      if (st.note) s += '<text x="' + (W - 16) + '" y="' + (y + rowH / 2 + 4) + '" text-anchor="end" class="s-sub">' + esc(st.note) + "</text>";
    });
    return wrap(W, y0 + steps.length * rowH + 4, s, b.title);
  }

  /* --------------------------------------------------------------- cells -- */
  function cells(b) {
    var items = b.items || [], hl = {}; (b.highlight || []).forEach(function (i) { hl[i] = true; });
    var cw = Math.min(64, Math.floor(700 / Math.max(items.length, 1))), ch = 44, x0 = (760 - cw * items.length) / 2, y0 = 30, s = "";
    items.forEach(function (it, i) {
      var x = x0 + i * cw;
      s += '<rect x="' + x + '" y="' + y0 + '" width="' + cw + '" height="' + ch + '" ' + (hl[i] ? boxStyle(b.tone || "accent", true) : 'class="s-fill s-stroke" stroke-width="1.2"') + ' rx="4"/>';
      s += '<text x="' + (x + cw / 2) + '" y="' + (y0 + 27) + '" text-anchor="middle" class="s-mono">' + esc(it) + "</text>";
      s += '<text x="' + (x + cw / 2) + '" y="' + (y0 - 8) + '" text-anchor="middle" class="s-sub">' + i + "</text>";
      if (b.negative !== false) s += '<text x="' + (x + cw / 2) + '" y="' + (y0 + ch + 16) + '" text-anchor="middle" class="s-sub">' + (i - items.length) + "</text>";
    });
    if (b.label) s += '<text x="380" y="' + (y0 + ch + 40) + '" text-anchor="middle" class="s-label">' + esc(b.label) + "</text>";
    return wrap(760, y0 + ch + (b.label ? 52 : 26), s, b.title);
  }

  /* ---------------------------------------------------------------- tree -- */
  function tree(b) {
    var root = b.root || { label: "" }, W = 760, levelH = 74, bh = 44;
    // count leaves to allocate width, then place top-down
    function leaves(n) { return n.children && n.children.length ? n.children.reduce(function (a, c) { return a + leaves(c); }, 0) : 1; }
    var total = leaves(root);
    // A fixed 150px box overflowed the canvas past four leaves and the outer
    // nodes were clipped off both edges. Divide the width instead and let the
    // boxes shrink; box() already shrinks and wraps the label to fit.
    var unit = W / total, bw = Math.max(64, Math.min(150, unit - 12));
    var id = "d" + Math.random().toString(36).slice(2, 7), s = marker(id), depth = 0;
    function place(n, x0, d) {
      depth = Math.max(depth, d);
      var span = leaves(n) * unit, cx = x0 + span / 2, y = 10 + d * levelH;
      var bwn = Math.min(bw, span - 10);
      s += box(cx - bwn / 2, y, bwn, bh, n.label, n.sub, n.tone, n.mono);
      var cx0 = x0;
      (n.children || []).forEach(function (c) {
        var cspan = leaves(c) * unit, ccx = cx0 + cspan / 2;
        s += arrow(id, cx, y + bh, ccx, y + levelH, c.edge);
        place(c, cx0, d + 1); cx0 += cspan;
      });
    }
    var totalW = total * unit, ox = (W - totalW) / 2;
    place(root, ox, 0);
    return wrap(W, 10 + (depth + 1) * levelH - 20, s, b.title);
  }

  /* -------------------------------------------------------------- layers -- */
  function layers(b) {
    var items = b.items || [], W = 760, bh = 46, gap = 8, s = "";
    items.forEach(function (it, i) {
      var y = 10 + i * (bh + gap), w = 560 - i * (b.taper ? 28 : 0), x = (W - w) / 2;
      s += box(x, y, w, bh, it.label, it.sub, it.tone);
      if (it.side) s += '<text x="' + (x + w + 14) + '" y="' + (y + bh / 2 + 4) + '" class="s-sub">' + esc(it.side) + "</text>";
    });
    return wrap(W, 10 + items.length * (bh + gap) + 2, s, b.title);
  }

  /* ------------------------------------------------------------- compare -- */
  function compare(b) {
    var cols = b.columns || [], W = 760, gap = 16, cw = (W - gap * (cols.length + 1)) / cols.length, lineH = 22, s = "";
    var wrapped = cols.map(function (c) {
      var out = [];
      (c.items || []).forEach(function (it) { wrapLines("• " + it, cw - 20, 6.0).forEach(function (l, k) { out.push(k ? "   " + l : l); }); });
      return out;
    });
    var maxItems = wrapped.reduce(function (a, c) { return Math.max(a, c.length); }, 0);
    var H = 44 + maxItems * lineH + 14;
    cols.forEach(function (c, i) {
      var x = gap + i * (cw + gap), t = tone(c.tone) || "--accent";
      var small = tw(c.title) > cw - 12;
      s += '<rect x="' + x + '" y="6" width="' + cw + '" height="' + (H - 12) + '" rx="10" class="s-fill s-stroke" stroke-width="1.2"/>';
      s += '<rect x="' + x + '" y="6" width="' + cw + '" height="34" rx="10" style="fill:var(' + t + ');fill-opacity:.16"/>';
      s += '<text x="' + (x + cw / 2) + '" y="28" text-anchor="middle" class="s-label"' + (small ? ' style="font-size:10px"' : "") + '>' + esc(c.title) + "</text>";
      wrapped[i].forEach(function (it, j) {
        s += '<text x="' + (x + 12) + '" y="' + (58 + j * lineH) + '" class="s-sub" style="fill:var(--ink-2)">' + esc(it) + "</text>";
      });
    });
    return wrap(W, H, s, b.title);
  }

  /* ------------------------------------------------------------ timeline -- */
  function timeline(b) {
    var lanes = b.lanes || [], span = b.span || 10, W = 760, x0 = 130, x1 = 740, laneH = 40, s = "";
    var scale = (x1 - x0) / span;
    for (var t = 0; t <= span; t += (b.tick || 1)) {
      var x = x0 + t * scale;
      s += '<line x1="' + x + '" y1="14" x2="' + x + '" y2="' + (16 + lanes.length * laneH) + '" style="stroke:var(--line);stroke-opacity:.45" stroke-width="1"/>';
      s += '<text x="' + x + '" y="10" text-anchor="middle" class="s-sub">' + t + "</text>";
    }
    lanes.forEach(function (l, i) {
      var y = 20 + i * laneH;
      s += '<text x="' + (x0 - 10) + '" y="' + (y + 20) + '" text-anchor="end" class="s-label">' + esc(l.label) + "</text>";
      (l.bars || []).forEach(function (bar) {
        var bx = x0 + bar[0] * scale, bw = (bar[1] - bar[0]) * scale, tn = tone(bar[3] || l.tone || "accent");
        s += '<rect x="' + bx + '" y="' + (y + 4) + '" width="' + Math.max(bw, 2) + '" height="26" rx="5" style="fill:var(' + tn + ');fill-opacity:.35;stroke:var(' + tn + ')" stroke-width="1.2"/>';
        if (bar[2]) s += '<text x="' + (bx + bw / 2) + '" y="' + (y + 21) + '" text-anchor="middle" class="s-sub" style="fill:var(--ink)">' + esc(bar[2]) + "</text>";
      });
    });
    if (b.unit) s += '<text x="' + x1 + '" y="' + (30 + lanes.length * laneH) + '" text-anchor="end" class="s-sub">' + esc(b.unit) + "</text>";
    return wrap(W, 36 + lanes.length * laneH, s, b.title);
  }

  /* --------------------------------------------------------------- cycle -- */
  function cycle(b) {
    var nodes = b.nodes || [], W = 760, cx = 380, cy = 150, r = 105, bw = 150, bh = 46, id = "d" + Math.random().toString(36).slice(2, 7), s = marker(id);
    var n = nodes.length, pts = nodes.map(function (_, i) {
      var a = -Math.PI / 2 + i * 2 * Math.PI / n; return { x: cx + r * 1.9 * Math.cos(a), y: cy + r * Math.sin(a), a: a };
    });
    pts.forEach(function (p, i) {
      var q = pts[(i + 1) % n];
      var dx = q.x - p.x, dy = q.y - p.y, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
      // shorten to box edges (approximate with a radius)
      var rx = bw / 2 + 6, ry = bh / 2 + 6;
      var k1 = 1 / Math.max(Math.abs(ux) / rx, Math.abs(uy) / ry), k2 = k1;
      s += arrow(id, p.x + ux * k1, p.y + uy * k1, q.x - ux * k2, q.y - uy * k2, nodes[i].edge);
    });
    pts.forEach(function (p, i) { s += box(p.x - bw / 2, p.y - bh / 2, bw, bh, nodes[i].label, nodes[i].sub, nodes[i].tone); });
    if (b.centre) s += '<text x="' + cx + '" y="' + (cy + 4) + '" text-anchor="middle" class="s-label">' + esc(b.centre) + "</text>";
    return wrap(W, 300, s, b.title);
  }

  /* -------------------------------------------------------------- matrix -- */
  function matrix(b) {
    var rows = b.rows || [], cols = b.cols || [], W = 760, rh = 38, labelW = 200, cw = (W - labelW - 16) / Math.max(cols.length, 1), s = "";
    cols.forEach(function (c, j) { s += '<text x="' + (labelW + j * cw + cw / 2) + '" y="18" text-anchor="middle" class="s-label">' + esc(c) + "</text>"; });
    rows.forEach(function (r, i) {
      var y = 28 + i * rh;
      s += '<text x="' + (labelW - 12) + '" y="' + (y + rh / 2 + 4) + '" text-anchor="end" class="s-label">' + esc(r) + "</text>";
      cols.forEach(function (c, j) {
        var v = (b.cells[i] || [])[j], x = labelW + j * cw;
        var t = typeof v === "object" && v ? v.tone : (v === true ? "good" : v === false ? "crit" : v === "warn" ? "warn" : null);
        var txt = typeof v === "object" && v ? v.text : (v === true ? "✓" : v === false ? "✗" : v == null ? "" : String(v));
        s += '<rect x="' + (x + 3) + '" y="' + (y + 3) + '" width="' + (cw - 6) + '" height="' + (rh - 6) + '" rx="6" ' + (t ? boxStyle(t, true) : 'class="s-fill s-stroke" stroke-width="1"') + "/>";
        s += '<text x="' + (x + cw / 2) + '" y="' + (y + rh / 2 + 4) + '" text-anchor="middle" class="s-sub" style="fill:var(--ink)">' + esc(txt) + "</text>";
      });
    });
    return wrap(W, 28 + rows.length * rh + 6, s, b.title);
  }

  var KINDS = { flow: flow, steps: steps, memory: memory, trace: trace, cells: cells, tree: tree, layers: layers, compare: compare, timeline: timeline, cycle: cycle, matrix: matrix };

  EC.diagram = function (b) {
    var fn = KINDS[b.kind];
    if (!fn) { console.warn("unknown diagram kind", b.kind); return ""; }
    var svg;
    try { svg = fn(b); } catch (e) { console.warn("diagram failed", b.kind, e.message); return ""; }
    return '<figure class="viz diagram-' + esc(b.kind) + '">' + svg +
      (b.title || b.caption ? "<figcaption>" + (b.title ? "<b>" + EC.inline(b.title) + "</b>" : "") + (b.caption ? EC.inline(b.caption) : "") + "</figcaption>" : "") +
      "</figure>";
  };
})();
