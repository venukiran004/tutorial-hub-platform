import io
p = "assets/js/render.js"
s = io.open(p, encoding="utf-8").read()
if "function drill(" in s:
    print("already"); raise SystemExit

anchor = "  /* ------------------------------------------------------------ router -- */"
assert anchor in s

fn = '''  /* ------------------------------------------------------------- drill -- */
  /* A question whose answer stays hidden until asked for. Deliberately
     lighter than `exercise`: a practice page carries hundreds of these, so
     the chrome has to stay out of the way and the reveal has to be one
     click with no layout jump. */
  function drill(b) {
    var terms = (b.terms || []).length
      ? '<div class="drill-terms">' + b.terms.map(function (t) {
          return '<span class="kt">' + esc(t) + "</span>";
        }).join("") + "</div>"
      : "";

    return '<details class="drill' + (b.kind ? " " + b.kind : "") + '">' +
      "<summary>" +
        '<span class="drill-n">' + esc(b.n || "") + "</span>" +
        '<span class="drill-q">' + inline(b.q) + "</span>" +
        '<span class="drill-cue">Reveal</span>' +
      "</summary>" +
      '<div class="drill-a">' + terms + render(b.body || []) + "</div>" +
      "</details>";
  }

''' + anchor
s = s.replace(anchor, fn, 1)
s = s.replace("    disclose: disclose,", "    disclose: disclose,\n    drill: drill,", 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("ok")
