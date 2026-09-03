/* ============================================================================
   SYNTAX HIGHLIGHTER
   ----------------------------------------------------------------------------
   Hand-written rather than pulled from a CDN. Three reasons: the page stays
   dependency-free and works from file://, the token set is exactly the one the
   palette in lesson.css was tuned for, and Python-specific niceties (f-string
   interpolation, `self`/`cls` as their own token, def/class binding names) are
   possible without patching someone else's grammar.

   Scanner design: ordered sticky regexes tried at each cursor position. Slower
   than one mega-regex, dramatically easier to reason about and extend.
   ========================================================================= */
(function (global) {
  "use strict";

  function esc(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function span(cls, text) { return '<span class="' + cls + '">' + esc(text) + "</span>"; }

  var PY_KEYWORDS = "False|None|True|and|as|assert|async|await|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|raise|return|try|while|with|yield";
  // Soft keywords: only highlighted where they can actually be one.
  var PY_SOFT = "match|case";
  var PY_BUILTINS = "abs|aiter|anext|all|any|ascii|bin|bool|breakpoint|bytearray|bytes|callable|chr|classmethod|compile|complex|delattr|dict|dir|divmod|enumerate|eval|exec|filter|float|format|frozenset|getattr|globals|hasattr|hash|help|hex|id|input|int|isinstance|issubclass|iter|len|list|locals|map|max|memoryview|min|next|object|oct|open|ord|pow|print|property|range|repr|reversed|round|set|setattr|slice|sorted|staticmethod|str|sum|super|tuple|type|vars|zip";
  var PY_EXC = "BaseException|Exception|ArithmeticError|AssertionError|AttributeError|BlockingIOError|BrokenPipeError|BufferError|ConnectionError|ConnectionRefusedError|ConnectionResetError|EOFError|FileExistsError|FileNotFoundError|FloatingPointError|GeneratorExit|ImportError|IndentationError|IndexError|InterruptedError|IsADirectoryError|KeyError|KeyboardInterrupt|LookupError|MemoryError|ModuleNotFoundError|NameError|NotImplementedError|OSError|OverflowError|PermissionError|RecursionError|ReferenceError|RuntimeError|StopAsyncIteration|StopIteration|SyntaxError|SystemExit|TimeoutError|TypeError|UnboundLocalError|UnicodeDecodeError|UnicodeEncodeError|ValueError|ZeroDivisionError|Warning|DeprecationWarning";

  function rx(src) { return new RegExp(src, "y"); }

  /* -------------------------------------------------------------- python -- */
  var PY_RULES = [
    // A `def`/`class` and the name it binds, captured together so the binding
    // name gets its own colour instead of reading as a call.
    { re: rx("\\b(def|class)([ \\t]+)([A-Za-z_]\\w*)"), emit: function (m) {
        return span("tok-kw", m[1]) + esc(m[2]) + span("tok-def", m[3]); } },

    { re: rx("#[^\\n]*"), cls: "tok-com" },

    // Triple-quoted strings, with an optional prefix. Non-greedy to the first
    // matching fence; unterminated fences fall through to the tail rule.
    { re: rx("(?:[fFrRbBuU]{0,2})(?:\"\"\"[\\s\\S]*?\"\"\"|'''[\\s\\S]*?''')"), fn: pyString },

    { re: rx("(?:[fFrRbBuU]{0,2})(?:\"(?:\\\\.|[^\"\\\\\\n])*\"|'(?:\\\\.|[^'\\\\\\n])*')"), fn: pyString },

    { re: rx("@[A-Za-z_][\\w.]*"), cls: "tok-dec" },

    { re: rx("\\b(?:0[xX][0-9a-fA-F_]+|0[oO][0-7_]+|0[bB][01_]+|(?:\\d[\\d_]*)?\\.\\d[\\d_]*(?:[eE][+-]?\\d+)?[jJ]?|\\d[\\d_]*\\.?(?:[eE][+-]?\\d+)?[jJ]?)\\b"), cls: "tok-num" },

    { re: rx("\\b(?:" + PY_KEYWORDS + ")\\b"), cls: "tok-kw" },
    // `match x:` / `case _:` only at the head of a statement.
    { re: rx("(?<=^[ \\t]*)(?:" + PY_SOFT + ")(?=[ \\t][^=\\n]*:[ \\t]*$)", ), cls: "tok-kw" },

    { re: rx("\\b(?:self|cls)\\b"), cls: "tok-self" },
    { re: rx("\\b(?:" + PY_EXC + ")\\b"), cls: "tok-bi" },
    { re: rx("\\b(?:" + PY_BUILTINS + ")\\b(?=\\s*\\()"), cls: "tok-bi" },
    { re: rx("\\b(?:" + PY_BUILTINS + ")\\b"), cls: "tok-bi" },

    // dunder names read as protocol hooks, so they get the decorator colour
    { re: rx("__\\w+__"), cls: "tok-dec" },

    { re: rx("[A-Za-z_]\\w*(?=\\s*\\()"), cls: "tok-fn" },
    { re: rx("\\b[A-Z][A-Za-z0-9_]*\\b"), cls: "tok-cls" },
    { re: rx("[A-Za-z_]\\w*"), cls: null },
    { re: rx("[+\\-*/%=<>!&|^~:]+|->"), cls: "tok-op" },
    { re: rx("[\\s\\S]"), cls: null }
  ];

  // f-strings: colour the literal text as a string but let `{expr}` bodies
  // read as code, which is how they behave.
  function pyString(text) {
    var isF = /^[rRbBuU]*[fF]/.test(text);
    if (!isF || text.indexOf("{") === -1) return span("tok-str", text);
    var out = "", i = 0;
    while (i < text.length) {
      var open = text.indexOf("{", i);
      if (open === -1) { out += span("tok-str", text.slice(i)); break; }
      if (text[open + 1] === "{") { out += span("tok-str", text.slice(i, open + 2)); i = open + 2; continue; }
      var depth = 1, j = open + 1;
      while (j < text.length && depth > 0) {
        if (text[j] === "{") depth++;
        else if (text[j] === "}") depth--;
        j++;
      }
      out += span("tok-str", text.slice(i, open));
      out += span("tok-op", "{") + hl(text.slice(open + 1, j - 1), "python") + span("tok-op", "}");
      i = j;
    }
    return out;
  }

  /* ---------------------------------------------------------------- bash -- */
  var SH_RULES = [
    { re: rx("#[^\\n]*"), cls: "tok-com" },
    { re: rx("\"(?:\\\\.|[^\"\\\\])*\"|'(?:[^'])*'"), cls: "tok-str" },
    // the prompt marker in a console transcript
    { re: rx("(?<=^)\\$(?=[ \\t])"), cls: "tok-com" },
    { re: rx("\\b(?:sudo|cd|ls|mkdir|rm|cp|mv|cat|echo|export|source|curl|git|docker|make|chmod|grep|python3?|pip3?|uv|pytest|ruff|mypy|black|uvicorn|alembic|psql|poetry|conda|deactivate|activate)\\b"), cls: "tok-bi" },
    { re: rx("\\s--?[A-Za-z][\\w-]*"), cls: "tok-dec" },
    { re: rx("\\$\\{?\\w+\\}?"), cls: "tok-num" },
    { re: rx("[|&><;]+"), cls: "tok-op" },
    { re: rx("[\\s\\S]"), cls: null }
  ];

  /* ----------------------------------------------------------------- sql -- */
  var SQL_KW = "SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|FULL|CROSS|ON|GROUP|BY|ORDER|HAVING|LIMIT|OFFSET|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|INDEX|VIEW|ALTER|DROP|ADD|COLUMN|PRIMARY|KEY|FOREIGN|REFERENCES|UNIQUE|NOT|NULL|DEFAULT|AND|OR|IN|EXISTS|BETWEEN|LIKE|ILIKE|AS|DISTINCT|CASE|WHEN|THEN|ELSE|END|WITH|UNION|ALL|BEGIN|COMMIT|ROLLBACK|TRANSACTION|EXPLAIN|ANALYZE|RETURNING|CONFLICT|DO|NOTHING|CONSTRAINT|CASCADE|ASC|DESC|IS";
  var SQL_RULES = [
    { re: rx("--[^\\n]*"), cls: "tok-com" },
    { re: rx("/\\*[\\s\\S]*?\\*/"), cls: "tok-com" },
    { re: rx("'(?:''|[^'])*'"), cls: "tok-str" },
    { re: rx("\\b(?:" + SQL_KW + ")\\b", "i"), cls: "tok-kw" },
    { re: rx("\\b(?:COUNT|SUM|AVG|MIN|MAX|COALESCE|NULLIF|CAST|NOW|DATE_TRUNC|ROW_NUMBER|RANK|LAG|LEAD|ARRAY_AGG|JSONB_BUILD_OBJECT)\\b", "i"), cls: "tok-bi" },
    { re: rx("\\b\\d+(?:\\.\\d+)?\\b"), cls: "tok-num" },
    { re: rx("[=<>!+\\-*/|]+"), cls: "tok-op" },
    { re: rx("[\\s\\S]"), cls: null }
  ];

  /* ---------------------------------------------------------- toml / ini -- */
  var TOML_RULES = [
    { re: rx("#[^\\n]*"), cls: "tok-com" },
    { re: rx("^\\s*\\[[^\\]\\n]+\\]"), cls: "tok-dec" },
    { re: rx("\"(?:\\\\.|[^\"\\\\])*\"|'[^'\\n]*'"), cls: "tok-str" },
    { re: rx("\\b(?:true|false)\\b"), cls: "tok-kw" },
    { re: rx("\\b\\d[\\d._-]*\\b"), cls: "tok-num" },
    { re: rx("^[ \\t]*[A-Za-z_][\\w.-]*(?=[ \\t]*=)"), cls: "tok-fn" },
    { re: rx("="), cls: "tok-op" },
    { re: rx("[\\s\\S]"), cls: null }
  ];

  /* ---------------------------------------------------------------- json -- */
  var JSON_RULES = [
    { re: rx("\"(?:\\\\.|[^\"\\\\])*\"(?=\\s*:)"), cls: "tok-fn" },
    { re: rx("\"(?:\\\\.|[^\"\\\\])*\""), cls: "tok-str" },
    { re: rx("\\b(?:true|false|null)\\b"), cls: "tok-kw" },
    { re: rx("-?\\b\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?\\b"), cls: "tok-num" },
    { re: rx("[{}\\[\\],:]"), cls: "tok-op" },
    { re: rx("[\\s\\S]"), cls: null }
  ];

  var GRAMMARS = {
    python: PY_RULES, py: PY_RULES,
    bash: SH_RULES, sh: SH_RULES, shell: SH_RULES, console: SH_RULES,
    sql: SQL_RULES,
    toml: TOML_RULES, ini: TOML_RULES, cfg: TOML_RULES,
    json: JSON_RULES
  };

  function hl(src, lang) {
    var rules = GRAMMARS[(lang || "").toLowerCase()];
    if (!rules) return esc(src);
    var out = "", i = 0, guard = 0;
    while (i < src.length && guard++ < 400000) {
      var matched = false;
      for (var r = 0; r < rules.length; r++) {
        var rule = rules[r];
        rule.re.lastIndex = i;
        var m = rule.re.exec(src);
        if (m && m.index === i && m[0].length > 0) {
          if (rule.emit) out += rule.emit(m);
          else if (rule.fn) out += rule.fn(m[0]);
          else if (rule.cls) out += span(rule.cls, m[0]);
          else out += esc(m[0]);
          i += m[0].length;
          matched = true;
          break;
        }
      }
      if (!matched) { out += esc(src[i]); i++; }
    }
    return out;
  }

  /* Split highlighted output back into lines so each line can carry its own
     row classes (highlight / added / removed) and gutter number. Splitting
     after highlighting means multi-line strings and docstrings survive. */
  function toLines(html) {
    var lines = [], depth = [], cur = "", i = 0;
    // Walk the markup, tracking open spans, so a newline inside a span closes
    // and reopens it rather than producing invalid nesting across rows.
    var re = /(<span class="[^"]*">|<\/span>|\n|[^<\n]+|<)/g, m;
    while ((m = re.exec(html)) !== null) {
      var t = m[0];
      if (t === "\n") {
        lines.push(cur + "</span>".repeat(depth.length));
        cur = depth.join("");
      } else if (t.charAt(0) === "<" && t.charAt(1) !== "/") {
        depth.push(t); cur += t;
      } else if (t === "</span>") {
        depth.pop(); cur += t;
      } else { cur += t; }
    }
    lines.push(cur + "</span>".repeat(depth.length));
    return lines;
  }

  global.HL = { highlight: hl, toLines: toLines, escape: esc };
})(window);
