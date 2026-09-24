/* ============================================================================
   LESSON 1.2 — Text Preprocessing
   Mirrors 01_NLP_Notes.md · §2. The reference's own pipeline is run; its
   worked example's output does not match what it claims, and its elongation
   regex over-collapses. Both reported (scratchpad/nlp/n12.py).
   ========================================================================= */
EC.receiveLesson({
  id: "1.2",

  lede: "**Preprocessing is a sequence of regular expressions, and every one of them is a decision about text you have not seen yet.** Running the reference's own pipeline on the reference's own example produces something different from what it claims — the emoji survive, because `string.punctuation` is ASCII-only. That is not a criticism so much as the point of the lesson: these rules are easy to write, easy to get subtly wrong, and applied to millions of documents nobody reads.",

  objectives: [
    "Build a preprocessing pipeline and measure what each flag removes",
    "Explain why the order of the stages matters",
    "Distinguish stemming from lemmatisation on real outputs",
    "Supply a POS tag to a lemmatiser and see what happens without one",
    "Recognise the failure modes of cleaning regexes"
  ],

  prerequisites: ["1.1"],

  blocks: [

    { t: "h2", n: "01", text: "The pipeline", id: "pipeline" },

    { t: "code", lang: "python", title: "The reference's preprocessing function",
      code: `def preprocess_text(text, lowercase=True, remove_html=True, remove_urls=True,
                    remove_emails=True, remove_numbers=False,
                    remove_punctuation=True, remove_extra_spaces=True,
                    fix_unicode=True):
    if fix_unicode:      text = unicodedata.normalize("NFKD", text)
    if remove_html:      text = re.sub(r"<[^>]+>", " ", text)
    if remove_urls:      text = re.sub(r"https?://\\S+|www\\.\\S+", " ", text)
    if remove_emails:    text = re.sub(r"\\S+@\\S+\\.\\S+", " ", text)
    if lowercase:        text = text.lower()
    if remove_numbers:   text = re.sub(r"\\d+", " ", text)
    if remove_punctuation:
        text = text.translate(str.maketrans("", "", string.punctuation))
    if remove_extra_spaces:
        text = re.sub(r"\\s+", " ", text).strip()
    return text`,
      caption: "Note `remove_numbers` defaults to False — numbers are signal in most tasks and noise in a few, so it is opt-in rather than opt-out." },

    { t: "out", text: `  input    : "<p>Check out https://example.com! It's AMAZING... 🎉🎉🎉</p>"
  output   : 'check out its amazing 🎉🎉🎉'
  reference says: 'check out its amazing'
  match    : False` },

    { t: "callout", kind: "trap", title: "`string.punctuation` is ASCII-only, so the emoji survive",
      body: [{ t: "p", text: "The reference states the output is `check out its amazing`. Run, it is `check out its amazing 🎉🎉🎉`. `string.punctuation` contains exactly 32 ASCII characters and knows nothing about emoji, and `NFKD` normalisation decomposes accented characters but does not touch them either. This matters well beyond the example: a pipeline that looks like it strips non-word characters will happily leave emoji, CJK punctuation, mathematical symbols and box-drawing characters in your vocabulary. If you want them gone, match on Unicode categories with `unicodedata.category(c).startswith('P')` or use an explicit allow-list of what you keep." }] },

    { t: "h2", n: "02", text: "What each flag removes", id: "stages" },

    { t: "out", text: `  raw            '<b>Email</b> me at a@b.com or see https://x.co -- costs $30.50! Great…'
  +unicode NFKD  '<b>Email</b> me at a@b.com or see https://x.co -- costs $30.50! Great...'
  +html          ' Email  me at a@b.com or see https://x.co -- costs $30.50! Great...'
  +urls          ' Email  me at a@b.com or see   -- costs $30.50! Great...'
  +emails        ' Email  me at   or see   -- costs $30.50! Great...'
  +lowercase     ' email  me at   or see   -- costs $30.50! great...'
  +punctuation   ' email  me at   or see    costs 3050 great'
  +whitespace    'email me at or see costs 3050 great'` },

    { t: "callout", kind: "crit", title: "`$30.50` became `3050`",
      body: [{ t: "p", text: "Stripping punctuation removed the decimal point, so a price of thirty dollars fifty is now the number **3050** — off by a factor of a hundred, and indistinguishable from a genuine 3050. The same happens to dates (`2024-01-15` → `20240115`), version numbers, IP addresses and phone numbers. If numbers carry meaning in your corpus, either replace them with a placeholder token before stripping punctuation, or exclude `.` and `,` from the removal set. This is the sort of corruption that never raises an error and shows up as a model that is inexplicably bad at anything numeric." }] },

    { t: "p", text: "The ellipsis is worth noting too: NFKD turned `…` into three full stops, which is usually what you want — but it means a Unicode normalisation step silently changed the character count, which matters if you are tracking spans or offsets into the original text." },

    { t: "h2", n: "03", text: "Order matters", id: "order" },

    { t: "p", text: "The stages are not commutative. Removing HTML before URLs means an `href` attribute's URL is already gone; doing it the other way leaves fragments. Removing emails before lowercasing works, and so does the reverse here — but a case-sensitive pattern would break if you lowercased first." },

    { t: "dl", items: [
      ["HTML before URLs", "Otherwise the URL regex eats attribute values and leaves broken tags behind."],
      ["URLs before emails", "`https://user@host/path` contains an `@`; the email pattern would butcher it."],
      ["Lowercase after any case-sensitive pattern", "Acronym detection, proper-noun heuristics and `RT` stripping all stop working once everything is lowercase."],
      ["Punctuation last, before whitespace", "Removing punctuation creates gaps; collapsing whitespace afterwards tidies them."]
    ] },

    { t: "h2", n: "04", text: "Stemming", id: "stemming" },

    { t: "out", text: `  word         porter     snowball
  running      run        run
  studies      studi      studi
  better       better     better
  generously   gener      generous
  children     children   children
  was          wa         was
  mice         mice       mice` },

    { t: "callout", kind: "insight", title: "A stemmer does not know any words",
      body: [{ t: "p", text: "`studies → studi` and `was → wa` are not words in any language — a stemmer chops suffixes by rule and has no dictionary to check against. That is fine if the only thing you need is for `studies` and `studying` to land on the same key, which is exactly what a search index needs. It is useless if a human will read the output. Two other failures are visible above: **irregular forms are untouched** (`children`, `mice`, `better` all pass through unchanged, because there is no suffix to strip), and Porter over-stems `generously` to `gener` where the newer Snowball correctly gives `generous`." }] },

    { t: "h2", n: "05", text: "Lemmatisation", id: "lemmatisation" },

    { t: "out", text: `  better     pos=a -> good
  running    pos=v -> run
  studies    pos=v -> study
  children   pos=n -> child
  mice       pos=n -> mouse
  was        pos=v -> be
  running    pos=n -> running   <- WRONG pos, wrong lemma
  better     (no pos) -> better  <- defaults to noun` },

    { t: "p", text: "A lemmatiser has a dictionary, so it handles the irregulars a stemmer cannot: `children → child`, `mice → mouse`, `was → be`, and `better → good` when told it is an adjective. Every output is a real word." },

    { t: "callout", kind: "trap", title: "Without a POS tag you get the wrong lemma, silently",
      body: [{ t: "p", text: "`WordNetLemmatizer` defaults to treating everything as a noun. `lemmatize(\"better\")` therefore returns `better` rather than `good`, and `lemmatize(\"running\")` returns `running` rather than `run`. It does not warn you — it returns a plausible string. So NLTK lemmatisation is only correct if you POS-tag first and map those tags onto WordNet's four categories, which is an extra model and an extra failure mode. spaCy does the tagging as part of its pipeline, which is why `nlp(text)` and reading `token.lemma_` is both simpler and more reliable." }] },

    { t: "table", head: ["", "Stemming", "Lemmatisation"],
      rows: [
        ["Method", "Rule-based suffix stripping", "Dictionary plus morphology"],
        ["Speed", "Fast", "Slower — needs a POS tag"],
        ["Output", "May not be a real word", "Always a real word"],
        ["Irregulars", "Untouched — `mice`, `children`, `was`", "Handled — `mouse`, `child`, `be`"],
        ["Use when", "Speed matters; search and IR", "Accuracy matters; NLU, chatbots"]
      ] },

    { t: "h2", n: "06", text: "Format-specific cleaning", id: "formats" },

    { t: "code", lang: "python", title: "Social media",
      code: `def clean_social_media(text):
    text = re.sub(r"@\\w+", "", text)          # remove @mentions
    text = re.sub(r"#(\\w+)", r"\\1", text)      # remove # but keep the word
    text = re.sub(r"RT\\s+", "", text)          # remove retweet marker
    text = re.sub(r"[^\\w\\s]", "", text)        # remove special characters
    text = re.sub(r"(.)\\1{2,}", r"\\1", text)   # "sooooo" -> "so"
    return text.strip()`,
      caption: "Keeping the hashtag's word while dropping the `#` is the right call — `#NLP` carries the same meaning as `NLP` and splitting them would lose it." },

    { t: "out", text: `  'RT @user This is sooooo #awesome!!!'
    -> 'This is so awesome'
  '@a @b heyyyy #NLP #ML cooool'
    -> 'hey NLP ML col'` },

    { t: "callout", kind: "warn", title: "The elongation regex turns `cooool` into `col`",
      body: [{ t: "p", text: "`(.)\\1{2,}` matches a character followed by two or more of itself — a run of three or more — and replaces the whole run with one. So `sooooo` correctly becomes `so`, and `heyyyy` correctly becomes `hey`. But `cooool` has four `o`s, which is a run of four, so it collapses to a single `o` and you get **`col`** — not a word, and not `cool`. The fix is to collapse to *two* rather than one, `r\"\\1\\1\"`, since English has plenty of legitimate doubled letters and almost no legitimate tripled ones. It is a one-character change and the difference between `cool` and `col` in your vocabulary." }] },

    { t: "exercise", kind: "practice", title: "Break your own cleaner", difficulty: "foundation", minutes: 30,
      prompt: "Take the reference's preprocessing function and run it over a corpus containing emoji, prices, dates, URLs with `@` in them, and elongated words. For each, record what came out and decide whether it is what you wanted. Then fix the three problems this lesson names: make punctuation removal Unicode-aware, protect numeric punctuation, and change the elongation regex to collapse to two characters. Re-run and compare vocabulary sizes.",
      hints: [
        "`unicodedata.category(c)[0] == 'P'` identifies punctuation across Unicode.",
        "Substitute a placeholder like `<NUM>` before stripping punctuation, or exclude `.` and `,`.",
        "`re.sub(r\"(.)\\1{2,}\", r\"\\1\\1\", text)` keeps doubled letters."
      ],
      solution: {
        notes: [
          { t: "p", text: "The Unicode fix usually shrinks the vocabulary noticeably on any corpus with emoji or non-English punctuation, because every distinct emoji was previously its own type. That is a real saving and also a real decision — for sentiment on social media, emoji are among the strongest signals available, so removing them may cost you more than the vocabulary reduction gains." },
          { t: "p", text: "The numeric fix is the one that matters most for correctness rather than size. `$30.50` becoming `3050` is not noise, it is a wrong value that looks like a right one, and the same applies to dates and version numbers. Replacing numbers with a `<NUM>` placeholder before stripping is usually better than protecting the punctuation, because most models do not benefit from the specific value anyway." },
          { t: "p", text: "For elongation, collapsing to two rather than one is a single character in the replacement string and fixes `cooool → col` without breaking `sooooo → soo`. Worth checking your own data for how common the pattern is before deciding it matters at all — on formal text it never fires, and on social media it fires constantly." }
        ]
      } }

  ],

  takeaways: [
    "The reference's worked example does not reproduce: `string.punctuation` is ASCII-only, so emoji survive.",
    "Stripping punctuation turned `$30.50` into `3050` — a wrong number that looks like a right one.",
    "Stage order is not commutative: HTML before URLs, URLs before emails, lowercase after any case-sensitive pattern.",
    "A stemmer has no dictionary: `studies → studi`, `was → wa`, and irregulars like `mice` and `children` pass through untouched.",
    "Porter over-stems `generously → gener`; Snowball gives `generous`.",
    "A lemmatiser handles irregulars — `mice → mouse`, `was → be`, `better → good` — but only with the right POS tag.",
    "`WordNetLemmatizer` defaults to noun, so `lemmatize(\"better\")` silently returns `better`.",
    "The elongation regex `(.)\\1{2,}` → `\\1` turns `cooool` into `col`; collapse to two instead."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "Why do emoji survive `text.translate(str.maketrans(\"\", \"\", string.punctuation))`?",
      options: ["They are letters", "`string.punctuation` contains only 32 ASCII characters", "The translate call is wrong", "NFKD removed them already"],
      answer: 1,
      why: "`string.punctuation` is an ASCII constant and knows nothing about emoji, CJK punctuation or mathematical symbols. Running the reference's own example gives `check out its amazing 🎉🎉🎉`, not the `check out its amazing` it claims. Unicode-aware removal needs `unicodedata.category`." },
    { stem: "Your preprocessed corpus contains the token `3050` where the original said `$30.50`. What happened?",
      options: ["The tokenizer merged two numbers", "Punctuation removal deleted the decimal point", "NFKD normalisation", "Number removal was enabled"],
      answer: 1,
      why: "Stripping punctuation takes the `.` with it, so the price becomes a number a hundred times too large and indistinguishable from a real 3050. The same corrupts dates, versions and IP addresses. Replace numbers with a placeholder before stripping, or exclude `.` and `,`." },
    { stem: "`WordNetLemmatizer().lemmatize(\"better\")` returns `better`, not `good`. Why?",
      options: ["WordNet has no entry for 'better'", "It defaults to noun, and `better` only lemmatises to `good` as an adjective", "The corpus is not downloaded", "Lemmatisation cannot handle comparatives"],
      answer: 1,
      why: "The default POS is noun. Passing `pos='a'` gives `good`; passing nothing silently gives back the input. NLTK lemmatisation is therefore only correct if you POS-tag first and map to WordNet's categories — which is why spaCy, where tagging is part of the pipeline, is more reliable in practice." },
    { stem: "The elongation regex `(.)\\1{2,}` → `\\1` is applied to `cooool`. What is the result?",
      options: ["cool", "col", "cooool", "co"],
      answer: 1,
      why: "The pattern matches a run of three or more identical characters and replaces the entire run with one, so four `o`s become one and you get `col`. Replacing with `\\1\\1` collapses to two instead, preserving legitimate doubled letters while still fixing `sooooo`." }
  ] },

  interview: { title: "Interview", sub: "Preprocessing", questions: [
    { level: "Core", q: "Stemming or lemmatisation — when do you use which?",
      strong: "Stemming for speed in search; lemmatisation for accuracy in NLU, and it needs a POS tag.",
      answer: [{ t: "p", text: "Stemming chops suffixes by rule, so it is fast and its output is often not a real word — `studies` becomes `studi` and `was` becomes `wa`. That is fine for a search index, where the only requirement is that related forms hash to the same key and no human reads them. It also cannot touch irregulars, since there is no suffix to strip: `children`, `mice` and `better` all pass through unchanged. Lemmatisation uses a dictionary, so it gives real words and handles irregulars — `mice` to `mouse`, `was` to `be`, `better` to `good`. The cost is speed and a dependency: WordNet's lemmatiser needs a POS tag, and it defaults to noun, so `lemmatize(\"better\")` silently returns `better` rather than `good`. That silent wrongness is why I would use spaCy, which tags as part of its pipeline, rather than NLTK's lemmatiser called directly. And for a transformer I would do neither — subword tokenization handles morphology and the model learns the relationships." }] },
    { level: "Senior", q: "What would you check in an inherited preprocessing pipeline?",
      strong: "Stage order, Unicode handling, numeric corruption, and whether the stages suit the task at all.",
      answer: [{ t: "p", text: "Four things, and I would run the pipeline over real documents rather than read it. First, whether punctuation removal is Unicode-aware — `string.punctuation` is 32 ASCII characters, so emoji and non-English punctuation survive and become vocabulary entries. Second, numeric corruption: stripping punctuation turns `$30.50` into `3050`, and dates and version numbers the same way, which never errors and shows up as a model that is oddly bad with numbers. Third, stage order, since the stages are not commutative — HTML has to go before URLs, URLs before emails because a URL can contain an `@`, and anything case-sensitive before lowercasing. Fourth, and most important, whether the stages suit the task: stopword removal destroys sentiment and question answering, and for a transformer most of the pipeline is harmful because it removes signal the model would have used. I would also diff the vocabulary before and after each stage, because that shows you what was actually destroyed rather than what was intended." }] },
    { level: "Senior", q: "How much preprocessing would you do for a transformer model?",
      strong: "Almost none — fix encoding, strip markup, and leave the rest to the tokenizer.",
      answer: [{ t: "p", text: "Very little, and for a specific reason: every classical stage exists to help a model that cannot learn morphology or handle a large vocabulary, and a transformer with subword tokenization does both. Lowercasing throws away a real signal — `Apple` against `apple` — and modern tokenizers are cased for exactly that reason. Stemming and lemmatisation destroy distinctions the model would have used, and stopword removal is actively damaging for anything involving negation or function words. What I would still do is fix encoding problems, normalise Unicode so the same character is always the same codepoint, strip markup if the source is HTML, and handle whatever is genuinely noise in my domain — boilerplate footers, OCR artefacts, log timestamps. The test I would apply to any proposed step is whether a fluent reader would consider the removed thing meaningless. If they would not, the model probably wants it." }] }
  ] }
});
