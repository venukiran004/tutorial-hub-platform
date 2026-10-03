EC.receiveLesson({
  id: "13.9",

  lede: "Speech recognition gets 5 to 15% of words wrong, and the errors are not distributed the way a single accuracy number implies. They concentrate on exactly the words that carry the task \u2014 names, amounts, dates, reference codes \u2014 because a recogniser's language model prefers frequent words, and the words that matter are rare. Running both metrics over the same eight transcripts: **word error rate 10.6%, entity error rate 41.2%**, a 3.9x gap. By WER that is a good recogniser. By outcome, **only three of eight turns produced a usable result**. The design conclusion is not to chase a better recogniser; it is to build around the errors \u2014 and to confirm by **consequence** rather than by confidence, which is the usual advice and the wrong axis.",

  objectives: [
    "Explain why entity errors concentrate where word errors do not",
    "Compute word error rate and entity error rate and interpret the gap",
    "Apply contextual biasing, n-best rescoring and constrained slots",
    "Confirm a slot rather than an utterance, and choose which slots to confirm",
    "Design a repair path that never asks the user to repeat a whole sentence"
  ],

  prerequisites: ["13.8", "9.4"],

  blocks: [

    { t: "h2", n: "01", id: "where", text: "Where the errors are",
      sub: "Not uniformly spread, and not where WER suggests" },

    { t: "p", text: "A recogniser combines an acoustic model with a language model, and the language model's job is to resolve acoustic ambiguity toward likely word sequences. That is exactly what you want for ordinary speech and exactly wrong for the informative parts of an utterance. \u201cSiobhan\u201d is acoustically close to \u201cshivon\u201d and vastly less frequent, so the language model resolves against you. The same mechanism turns \u201cNguyen\u201d into \u201cwin\u201d and \u201cAhmed\u201d into \u201cAhmad\u201d." },

    { t: "ul", items: [
      "**Names** are the worst category, and personal names worse than place names. They are rare, they have inconsistent spellings, and many are not in the recogniser's lexicon at all.",
      "**Amounts** fail on acoustically close pairs: fifty and fifteen, sixty and sixteen. A single phoneme changes the transaction by a factor of three.",
      "**Dates** fail the same way: thirtieth and thirteenth, Tuesday and Thursday. These cancel the wrong appointment.",
      "**Alphanumeric codes** fail on letters that rhyme \u2014 B, C, D, E, G, P, T, V \u2014 which is why aviation spells them out as a word each.",
      "**Function words** almost never fail, and they are most of the denominator in WER. \u201cI would like to speak to someone about my\u201d is nine words of free accuracy on every sentence."
    ] },

    { t: "callout", kind: "insight", title: "WER has the wrong denominator for your purposes",
      body: [
        { t: "p", text: "Word error rate averages over all words, and most words in a sentence are easy, frequent and irrelevant to the task. So WER is diluted by precisely the part of the utterance you do not care about, and the one error that matters contributes a tenth of a point." },
        { t: "p", text: "Entity error rate restricts the denominator to the words the task depends on. On the same eight transcripts the two metrics differ by 3.9x \u2014 and the gap is not noise, it is the structural consequence of measuring over a denominator that does not match your product." }
      ] },

    { t: "viz", title: "Same transcripts, two metrics, two conclusions",
      caption: "Word error rate says ship it. Entity error rate says five of eight turns do the wrong thing.",
      svg: '<svg viewBox="0 0 760 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Word error rate compared with entity error rate">' +
        '<text x="12" y="18" class="s-label">WORD ERROR RATE \u2014 85 words, 9 errors</text>' +
        '<rect x="12" y="28" width="700" height="26" fill="var(--good)" opacity="0.18" stroke="var(--good)"/>' +
        '<rect x="12" y="28" width="74" height="26" fill="var(--crit)" opacity="0.35" stroke="var(--crit)"/>' +
        '<text x="49" y="46" class="s-mono" text-anchor="middle" fill="var(--crit)">10.6%</text>' +
        '<text x="400" y="46" class="s-sub" text-anchor="middle">76 words correct \u2014 mostly function words that were never at risk</text>' +
        '<text x="12" y="82" class="s-label">ENTITY ERROR RATE \u2014 17 entities, 7 errors</text>' +
        '<rect x="12" y="92" width="700" height="26" fill="var(--good)" opacity="0.18" stroke="var(--good)"/>' +
        '<rect x="12" y="92" width="288" height="26" fill="var(--crit)" opacity="0.35" stroke="var(--crit)"/>' +
        '<text x="156" y="110" class="s-mono" text-anchor="middle" fill="var(--crit)">41.2%</text>' +
        '<text x="506" y="110" class="s-sub" text-anchor="middle">10 entities correct \u2014 all of them spoken digits</text>' +
        '<text x="12" y="146" class="s-label">WHAT BROKE</text>' +
        '<text x="12" y="168" class="s-mono">siobhan \u2192 shivon      oconnell \u2192 o connell    ahmed \u2192 ahmad</text>' +
        '<text x="12" y="186" class="s-mono">northgate \u2192 north gate  nguyen \u2192 win         fifty \u2192 fifteen</text>' +
        '<text x="12" y="204" class="s-mono">thirtieth \u2192 thirteenth</text>' +
        '<text x="12" y="232" class="s-label">WHAT SURVIVED</text>' +
        '<text x="12" y="254" class="s-mono" fill="var(--good)">eight one three two      c b four four seven alpha</text>' +
        '<text x="12" y="276" class="s-sub">every surviving entity was spoken digit by digit or letter by letter \u2014 the one</text>' +
        '<text x="12" y="294" class="s-sub">input format the recogniser handles perfectly, and the one you can ask for</text>' +
        '</svg>' },

    { t: "h2", n: "02", id: "mitigations", text: "Reducing the errors",
      sub: "Four mechanisms, in order of value" },

    { t: "dl", items: [
      { k: "Contextual biasing (highest value)", v: "Supply the recogniser with a list of expected terms for this call \u2014 the caller's own name, their saved payee names, the product names in your catalogue, the agent names on shift. Most APIs accept a phrase list or boost list per request. It directly counteracts the language model's preference for frequent words, and it is the single cheapest large improvement available." },
      { k: "Constrained slots", v: "When you know the shape of the answer, decode against it. A date slot should not be able to produce a non-date; a yes-or-no slot should not produce a sentence. This converts an open recognition problem into a classification over a small set, which is a fundamentally easier problem." },
      { k: "N-best rescoring", v: "Ask for the top several hypotheses rather than one, and rescore them against what you know. If hypothesis three contains a payee that exists on this account and hypothesis one does not, hypothesis three is right regardless of acoustic score." },
      { k: "Phonetic matching", v: "Match the transcript against your known set by sound rather than by spelling. \u201cShivon\u201d and \u201cSiobhan\u201d are far apart as strings and close phonetically, so a soundex- or metaphone-style comparison against the account's name list recovers it with no model change." }
    ] },

    { t: "callout", kind: "good", title: "Ask for digits, because digits work",
      body: [
        { t: "p", text: "In the measured set, every entity that survived was spoken digit by digit or letter by letter \u2014 ten entities, zero errors, across an account number and an alphanumeric claim code. That is not luck: individually spoken digits are short, acoustically distinct and in a tiny closed vocabulary, which removes almost all of the language model's room to interfere." },
        { t: "p", text: "So the input format is a design lever. \u201cPlease read me the account number one digit at a time\u201d is a slightly awkward prompt that converts your hardest recognition problem into your easiest one, and spelling mode for names does the same thing. Use it for anything consequential." }
      ] },

    { t: "h2", n: "03", id: "confirm", text: "Confirming",
      sub: "By consequence, not by confidence" },

    { t: "p", text: "The standard advice is to confirm when the recogniser's confidence is low. It sounds principled and it is the wrong axis, for two reasons. Confidence is poorly calibrated on exactly the rare words that fail \u2014 a recogniser can be confidently wrong about a name it has never seen. And confidence says nothing about whether being wrong matters." },

    { t: "table",
      head: ["Slot", "Error-prone?", "Consequence of being wrong", "Confirm?"],
      rows: [
        ["caller's name", "very", "mild \u2014 awkward, recoverable", "once, cheaply"],
        ["transfer amount", "yes", "severe \u2014 wrong money moves", "always"],
        ["appointment date", "yes", "severe \u2014 wrong booking cancelled", "always"],
        ["payee name", "very", "severe \u2014 money to the wrong person", "always, against a known list"],
        ["account number, spoken as digits", "no", "severe", "cheap check digit, not a readback"],
        ["\u201cyes\u201d / \u201cno\u201d", "no", "varies with the question", "only before a destructive action"],
        ["free-text problem description", "yes", "low \u2014 the model tolerates noise", "never"]
      ] },

    { t: "p", text: "The column that decides is the third one, and the second refines it. Something error-prone and inconsequential gets confirmed cheaply or not at all. Something consequential gets confirmed even if the recogniser is confident, because a confident error is the expensive kind." },

    { t: "ladder", title: "Repair strategies, worst to best",
      rungs: [
        { level: "bad", label: "\u201cSorry, I didn't catch that. Could you repeat?\u201d",
          why: "Makes the user re-say the entire sentence to fix one word, and the recogniser will fail on the same word again because nothing has changed. The user's third attempt is louder and slower, which often makes recognition worse rather than better.",
          code: "if confidence < 0.6:\n    say(\"Sorry, I didn't catch that. Could you repeat?\")",
          note: "Never make the user repeat a whole sentence. This is the single most common repair bug." },
        { level: "ok", label: "Confirm the whole utterance back",
          why: "\u201cI heard: transfer two hundred and fifteen dollars to savings. Is that right?\u201d The user can say no, which is better than nothing, but they then have to re-say everything and you have spent a long turn to learn one bit.",
          code: "say(\"I heard: %s. Is that right?\" % transcript)",
          note: "Better than a blind retry, and it scales badly with utterance length." },
        { level: "ok", label: "Confirm the slot",
          why: "\u201cTwo hundred and fifteen dollars \u2014 is that the amount?\u201d Short, targeted, and a correction only has to restate the amount. This is the baseline every production agent should have.",
          code: "say(\"%s - is that the amount?\" % spoken(amount))\n# a 'no' re-asks ONLY the amount",
          note: "Reduces the repair to one slot instead of one sentence." },
        { level: "best", label: "Resolve against what you already know, and only confirm what stays ambiguous",
          why: "Before asking anything, check the transcript against the account's own data: the payee list, the saved addresses, the name on file. Phonetic matching recovers \u201cshivon\u201d as \u201cSiobhan\u201d silently. Then confirm only the slots that remain genuinely ambiguous or are destructive.",
          code: "cands = phonetic_match(heard, account.payees)\nif len(cands) == 1:\n    payee = cands[0]                 # silent recovery\nelif cands:\n    say(\"Did you mean %s?\" % cands[0])   # one slot, one bit\nelse:\n    spell_mode(\"payee\")",
          note: "Most errors never reach the user, because you knew the answer set all along." }
      ] },

    { t: "callout", kind: "trap", title: "Spelling mode is a trap if it is the first resort",
      body: [
        { t: "p", text: "\u201cCould you spell that for me?\u201d is a genuinely useful escape hatch and a terrible default. Spelling a name letter by letter is slow, it feels like being processed by a machine, and the rhyming-letter problem means B, C, D, E, G, P, T and V are themselves frequently misheard \u2014 so you can spend eight seconds and still get it wrong." },
        { t: "p", text: "Use it third: after phonetic matching against a known set, and after one targeted confirmation. And when you do use it, confirm the result back as a whole word so the user hears what you landed on." }
      ] },

    { t: "exercise", kind: "analysis", title: "Measure both error rates and design the confirmation policy",
      difficulty: "core", minutes: 26,
      body: "Implement word-level edit distance with substitution, deletion and insertion counts, and compute word error rate over a set of transcript pairs. Then compute entity error rate over the entities each utterance's task actually depends on. Compare the two, count how many turns produced a usable outcome, and price three confirmation policies.",
      requirements: [
        "Implement Levenshtein alignment over word sequences with S/D/I counts",
        "Report per-case WER alongside entity errors and which entity broke",
        "Report corpus WER, corpus entity error rate and the ratio",
        "Count turns with a usable outcome \u2014 zero entity errors",
        "Price confirming nothing, confirming every slot, and confirming only names, amounts and dates",
        "Identify which entity category survived perfectly and explain why"
      ],
      hint: "Entity error rate is simplest as set membership: for each expected entity, is it present in the hypothesis? The confirmation comparison is more interesting once you notice which category has zero errors.",
      solution: { lang: "python", title: "x1309.py \u2014 10.6% or 41.2%, depending on the denominator",
        code: 'def levenshtein_ops(ref, hyp):\n    """Word-level edit distance with S/D/I counts, via DP plus backtrace."""\n    n, m = len(ref), len(hyp)\n    d = [[0] * (m + 1) for _ in range(n + 1)]\n    for i in range(n + 1):\n        d[i][0] = i\n    for j in range(m + 1):\n        d[0][j] = j\n    for i in range(1, n + 1):\n        for j in range(1, m + 1):\n            cost = 0 if ref[i - 1] == hyp[j - 1] else 1\n            d[i][j] = min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)\n    i, j, S, D, I = n, m, 0, 0, 0\n    while i > 0 or j > 0:\n        diag = d[i - 1][j - 1] + (0 if ref[i - 1] == hyp[j - 1] else 1) if i and j else None\n        if i and j and d[i][j] == diag:\n            if ref[i - 1] != hyp[j - 1]:\n                S += 1\n            i, j = i - 1, j - 1\n        elif i and d[i][j] == d[i - 1][j] + 1:\n            D += 1; i -= 1\n        else:\n            I += 1; j -= 1\n    return S, D, I\n\n# (reference, hypothesis, the entities the task actually depends on)\nCASES = [\n    ("my name is siobhan oconnell and my policy is four seven two nine",\n     "my name is shivon o connell and my policy is four seven two nine",\n     ["siobhan", "oconnell"]),\n    ("can you transfer two hundred and fifty dollars to savings",\n     "can you transfer two hundred and fifteen dollars to savings",\n     ["fifty"]),\n    ("the claim number is c b four four seven alpha",\n     "the claim number is c b four four seven alpha",\n     ["c", "b", "four", "four", "seven", "alpha"]),\n    # ... five more in the full script\n]\n\ntw = te = tent = tenterr = 0\nfor ref, hyp, ents in CASES:\n    r, h = ref.split(), hyp.split()\n    S, D, I = levenshtein_ops(r, h)\n    hset = set(h)\n    ent_err = sum(1 for e in ents if e not in hset)\n    tw += len(r); te += S + D + I; tent += len(ents); tenterr += ent_err\n\nprint("corpus WER               %.1f%%" % (100.0 * te / tw))\nprint("corpus entity error rate %.1f%%" % (100.0 * tenterr / tent))',
        out: '================================================================================================\nWord error rate and entity error rate on the same transcripts\n================================================================================================\n#     words   errs    WER entities   ent errs what broke                  \n1        13      3  23.1%        2          2 siobhan,oconnell            \n2        12      0   0.0%        4          0 -                           \n3        10      1  10.0%        1          1 fifty                       \n4        12      3  25.0%        2          2 ahmed,northgate             \n5         9      1  11.1%        1          1 thirtieth                   \n6        10      0   0.0%        6          0 -                           \n7         9      1  11.1%        1          1 nguyen                      \n8        10      0   0.0%        0          0 -                           \n------------------------------------------------------------------------------------------------\nALL      85      9  10.6%       17          7\n\ncorpus WER                10.6%   <- \'that is a good recogniser\'\ncorpus entity error rate  41.2%   <- \'that agent cannot do its job\'\nratio                     3.9x\n\nturns with a usable outcome: 3 of 8 (38%)\n\n================================================================================================\nWhy the two numbers diverge so far\n================================================================================================\n1. entities are rare words, and a recogniser\'s language model is trained to\n   prefer frequent ones. \'siobhan\' loses to \'shivon\', \'nguyen\' loses to \'win\',\n   \'ahmed\' loses to \'ahmad\'. the errors concentrate EXACTLY on the words that\n   carry the task.\n\n2. WER is averaged over a denominator full of function words that are easy and\n   irrelevant. \'i would like to speak to someone about my\' is nine words of free\n   accuracy padding every sentence.\n\n3. the failures are not degradations, they are wrong actions. \'fifty\' heard as\n   \'fifteen\' transfers the wrong amount. \'thirtieth\' heard as \'thirteenth\'\n   cancels the wrong appointment. those are single-word errors contributing\n   10.0% and 11.1% to WER respectively -- and 100% to the outcome.\n\n================================================================================================\nWhat it costs to confirm, and what it is worth\n================================================================================================\nconfirming a slot costs about 2600 ms of extra turn.\n\n   policy                               ent errs     extra ms  wrong actions\n   confirm nothing                             7            0              7\n   confirm every slot                          0        44200              0\n   confirm names + amounts + dates             0        18200              0\n\nacross these 8 utterances, confirming every slot adds 44.2 s (5.5 s per\nutterance), which is unusable. confirming only the slots that are both\nerror-prone and consequential adds 18.2 s (2.3 s per utterance) and\ncatches every error in this set -- because digits spoken individually are the\nONE category the recogniser got perfectly right (cases 2 and 6, 10 entities, 0\nerrors), and names, amounts and dates are where all 7 errors live.\n\nTHE POINT: \'confirm when confidence is low\' is the usual advice and it is the\nwrong axis. confirm by CONSEQUENCE and by error-proneness of the slot TYPE,\nwhich you know before the call starts. and confirm the slot, never the whole\nutterance -- never make the user repeat the entire sentence.',
        notes: [
          { t: "p", text: "**10.6% WER against 41.2% entity error rate \u2014 a 3.9x gap.** By WER this is a good recogniser and nobody would prioritise work on it. By entity error rate it cannot do its job, and only 3 of 8 turns produced a usable outcome." },
          { t: "p", text: "**The gap is structural, not noise.** WER's denominator is full of function words that were never at risk \u2014 \u201ci would like to speak to someone about my\u201d is nine words of free accuracy \u2014 while the recogniser's language model actively resolves rare words toward frequent ones, which is the opposite of what you need on the words carrying the task. The errors concentrate exactly where the meaning is." },
          { t: "p", text: "**Two of the errors are wrong actions rather than degradations.** \u201cfifty\u201d heard as \u201cfifteen\u201d moves the wrong money; \u201cthirtieth\u201d heard as \u201cthirteenth\u201d cancels the wrong appointment. Each is a single-word error contributing 10.0% and 11.1% to its own sentence's WER, and 100% to the outcome." },
          { t: "p", text: "**Every entity that survived was spoken digit by digit or letter by letter** \u2014 ten of them across two cases, zero errors. Individually spoken digits are short, acoustically distinct and in a tiny closed vocabulary, so the language model has almost no room to interfere. That makes the input format a design lever: asking for digits converts your hardest recognition problem into your easiest." },
          { t: "p", text: "**On confirmation policy: confirming every slot adds 44.2 seconds across these eight utterances, 5.5 seconds each, which is unusable.** Confirming only names, amounts and dates adds 2.3 seconds per utterance and catches every error in the set \u2014 because the categories that fail and the categories worth confirming are the same ones, and the digits need no readback at all." },
          { t: "p", text: "**So \u201cconfirm when confidence is low\u201d is the wrong axis.** Confidence is poorly calibrated on exactly the rare words that fail, so a recogniser can be confidently wrong about a name it has never seen. Confirm by consequence and by the error-proneness of the slot *type*, both of which you know before the call starts." }
        ] } },

    { t: "callout", kind: "mental", title: "Mental model: you usually know the answer set",
      body: [
        { t: "p", text: "The most useful habit in this area is to ask, for every slot, what the set of valid values is. A payee is one of the account's payees. A date is probably in the next ninety days. An appointment is one of three on file. A product is in your catalogue. Almost nothing a caller says is genuinely open-ended." },
        { t: "p", text: "Once that set is written down, three of the four mitigations become available at once: bias the recogniser toward it, rescore n-best against it, and phonetically match the transcript to it. Most errors then never reach the user, which is strictly better than any confirmation strategy \u2014 a repair the user never notices costs nothing." }
      ] },

    { t: "callout", kind: "scenario", title: "Scenario: \u201cour WER is 8%, why do customers complain?\u201d",
      body: [
        { t: "p", text: "A team reports 8% WER against an industry benchmark and cannot reconcile it with complaints about the agent mishearing people. The proposed next step is to evaluate a more accurate recogniser." },
        { t: "p", text: "The diagnostic is to recompute the same test set as entity error rate, restricting the denominator to the words each task depends on. The expected result is a figure three to four times higher, because WER is diluted by function words that were never at risk while the recogniser's language model resolves rare words toward frequent ones \u2014 so the errors sit precisely on the names, amounts and dates. A better recogniser will improve both numbers by a similar proportion and will not change the shape of the problem." },
        { t: "p", text: "The cheaper and larger win is contextual biasing: pass the caller's own name, their saved payees and your product names as a per-request phrase list. Then phonetic matching against those same lists to recover silently, then targeted slot confirmation for amounts and dates only. And change the reported metric, because a team that watches WER will keep concluding it is fine \u2014 the metric is not wrong, it is answering a question about words when the product has a question about entities." }
      ] }
  ],

  takeaways: [
    "**Recognition errors concentrate on the words that carry the task**, because the language model resolves rare words toward frequent ones.",
    "**Measured on the same transcripts: WER 10.6%, entity error rate 41.2%** \u2014 a 3.9x gap, and only 3 of 8 turns produced a usable outcome.",
    "**WER has the wrong denominator for a product**: most words in a sentence are easy, frequent and irrelevant.",
    "**Names are the worst category**, then amounts (fifty/fifteen), dates (thirtieth/thirteenth) and alphanumeric codes with rhyming letters.",
    "**Two errors in the set were wrong actions, not degradations** \u2014 the wrong amount moved and the wrong appointment cancelled, at ~10% WER each.",
    "**Every entity spoken digit by digit survived perfectly** \u2014 10 of 10 \u2014 because short, distinct words in a tiny vocabulary leave the language model no room.",
    "**So the input format is a design lever**: asking for digits converts the hardest recognition problem into the easiest.",
    "**Contextual biasing is the highest-value mitigation** \u2014 a per-request phrase list of the caller's own names, payees and your catalogue.",
    "**Then constrained slots, n-best rescoring and phonetic matching** against the set of values you already know to be valid.",
    "**Confirm by consequence, not by confidence** \u2014 confidence is poorly calibrated on exactly the rare words that fail.",
    "**Confirming every slot cost 5.5 s per utterance and was unusable**; confirming only names, amounts and dates cost 2.3 s and caught every error.",
    "**Never make the user repeat a whole sentence** \u2014 confirm the slot, and let a correction restate only that slot.",
    "**Spelling mode is a third resort**, after phonetic matching and one targeted confirmation, because rhyming letters fail too.",
    "**Write down the valid value set for every slot** \u2014 it unlocks three mitigations at once, and a repair the user never notices costs nothing."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "The same eight transcripts give 10.6% WER and 41.2% entity error rate. Why is the gap so large?",
        options: [
          "The entity set is too small for a stable estimate",
          "WER's denominator is mostly easy function words, while the recogniser's language model resolves rare words toward frequent ones",
          "Entity error rate double-counts errors that WER counts once",
          "The transcripts were chosen to contain difficult entities"
        ],
        answer: 1,
        why: "Two effects compound in the same direction. The denominator: a phrase like \u201ci would like to speak to someone about my\u201d is nine words of free accuracy padding every sentence, diluting WER with words that were never at risk. And the mechanism: a recogniser's language model exists to resolve acoustic ambiguity toward likely sequences, which is exactly wrong for names and codes \u2014 so the errors concentrate on the words that carry the task." },

      { stem: "In the measured set, which entities were recognised perfectly and why?",
        options: [
          "Common first names, because they are frequent in training data",
          "Every entity spoken digit by digit or letter by letter \u2014 short, acoustically distinct words in a tiny closed vocabulary",
          "Amounts, because currency has a predictable grammar",
          "Dates, because they can be constrained to a calendar"
        ],
        answer: 1,
        why: "Ten entities across an account number and an alphanumeric claim code came through with zero errors, while names, amounts and dates accounted for all seven failures. Individually spoken digits give the language model almost no room to interfere, which makes the input format a design lever rather than a given \u2014 asking a caller to read a number one digit at a time converts the hardest recognition problem into the easiest one." },

      { stem: "Why is \u201cconfirm when recogniser confidence is low\u201d the wrong policy?",
        options: [
          "Confidence scores are not available from most recognition APIs",
          "Confidence is poorly calibrated on the rare words that fail, and says nothing about whether being wrong matters",
          "It confirms too few slots to be useful",
          "Low confidence correlates with background noise rather than with error"
        ],
        answer: 1,
        why: "A recogniser can be confidently wrong about a name it has never encountered, so the signal is weakest exactly where the errors concentrate. And confidence carries no information about consequence \u2014 a misheard free-text problem description is harmless while a misheard transfer amount moves the wrong money. Confirming by consequence and by the error-proneness of the slot type uses two things you know before the call even starts." },

      { stem: "A user's payee name comes back as \u201cshivon\u201d but the account has a payee called \u201cSiobhan\u201d. What is the best handling?",
        options: [
          "Ask the user to spell the payee name",
          "Ask the user to repeat the whole request more clearly",
          "Phonetically match the transcript against the account's known payee list and recover it silently",
          "Reject the turn and route to a human agent"
        ],
        answer: 2,
        why: "The valid value set is known \u2014 a payee is one of this account's payees \u2014 and the two strings are far apart in spelling but close in sound, so a metaphone-style comparison resolves it with no model change and no user-visible repair. That is strictly better than any confirmation strategy, because a repair the user never notices costs nothing. Spelling mode is a third resort, after matching and one targeted confirmation, since rhyming letters are themselves frequently misheard." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Living with transcription errors",
    questions: [
      { level: "advanced",
        q: "Our WER is 8% but customers say the agent mishears them. Reconcile that.",
        strong: "A strong answer recomputes on the right denominator.",
        answer: [
          { t: "p", text: "Both things are almost certainly true, and the way to show it is to recompute the same test set as an entity error rate \u2014 restricting the denominator to the words each task actually depends on. When I did that on a set with 10.6% WER, the entity error rate was 41.2%, about four times higher, and only three turns in eight produced a usable outcome." },
          { t: "p", text: "The gap is structural rather than bad luck. WER averages over a denominator that is mostly function words, and those are easy, frequent and irrelevant \u2014 \u2018I would like to speak to someone about my\u2019 is nine words of free accuracy on every sentence. Meanwhile the recogniser's language model exists to resolve acoustic ambiguity toward likely word sequences, which is precisely wrong on names and codes. So \u2018Siobhan\u2019 loses to \u2018shivon\u2019, \u2018Nguyen\u2019 to \u2018win\u2019, \u2018fifty\u2019 to \u2018fifteen\u2019. The errors land exactly on the words carrying the task." },
          { t: "p", text: "That also tells you why a better recogniser is the wrong first move. It will improve both numbers by a similar proportion and not change the shape of the problem, because the shape comes from the frequency prior rather than from accuracy." },
          { t: "p", text: "What I would do instead, in order: contextual biasing, passing the caller's own name, their saved payees and our product names as a per-request phrase list, which directly counteracts the frequency prior and is the cheapest large win available. Then phonetic matching against those same lists so most errors are recovered silently and never reach the user. Then targeted slot confirmation for amounts and dates only. And I would change the metric we report, because a team watching WER will keep concluding it is fine \u2014 the metric is not wrong, it is answering a question about words when the product has a question about entities." }
        ] },

      { level: "core",
        q: "A caller's name comes back misheard. What happens next?",
        strong: "A strong answer never asks for a full repeat and uses the known value set.",
        answer: [
          { t: "p", text: "The thing I would not do is ask them to repeat the sentence. That makes the user re-say everything to fix one word, and the recogniser will fail on the same word again because nothing has changed \u2014 and their third attempt is usually louder and slower, which often makes recognition worse. It is the most common repair bug and it is the one users find most insulting." },
          { t: "p", text: "First I would check whether I already know the answer. A name on a call about an existing account is almost never open-ended: it is the name on file, or one of the authorised contacts, or one of the account's payees. Phonetic matching against that list resolves \u2018shivon\u2019 to \u2018Siobhan\u2019 with no model change and no user-visible repair at all, which is strictly better than any confirmation \u2014 a repair the user never notices costs nothing." },
          { t: "p", text: "If matching leaves two candidates I would confirm one slot, not the utterance: \u2018did you mean Siobhan?\u2019, which costs a short turn and buys exactly the bit I need. A correction then only has to restate the name." },
          { t: "p", text: "Spelling mode is the third resort, not the first. Spelling a name letter by letter is slow, it feels like being processed by a machine, and the rhyming letters \u2014 B, C, D, E, G, P, T, V \u2014 are themselves frequently misheard, so you can spend eight seconds and still land on the wrong thing. When I do use it I would confirm the result back as a whole word so the user hears what I settled on." }
        ] },

      { level: "advanced",
        q: "How do you decide which slots to confirm?",
        strong: "A strong answer uses consequence and slot type rather than confidence.",
        answer: [
          { t: "p", text: "By consequence first and error-proneness second, and explicitly not by confidence. Confidence is the standard advice and it fails twice over: it is poorly calibrated on exactly the rare words that break \u2014 a recogniser can be confidently wrong about a name it has never seen \u2014 and it carries no information about whether being wrong matters." },
          { t: "p", text: "Consequence is the deciding column. A misheard free-text problem description is harmless, because the model tolerates noisy input and the user will correct the direction naturally. A misheard transfer amount moves the wrong money. So I confirm an amount even when the recogniser is confident, because a confident error is the expensive kind, and I never confirm a problem description." },
          { t: "p", text: "Error-proneness then refines it, and it is a property of the slot type that I know before the call. Names, amounts, dates and alphanumeric codes fail; digits spoken individually and yes-or-no answers essentially do not. In the set I measured, all seven entity errors were in names, amounts and dates, and all ten entities spoken digit by digit were perfect \u2014 so an account number needs a check digit at most, not a readback." },
          { t: "p", text: "The numbers make the policy concrete. Confirming every slot added about 5.5 seconds per utterance, which is unusable. Confirming only names, amounts and dates added 2.3 seconds and caught every single error in the set \u2014 because the categories that fail and the categories worth confirming turn out to be the same ones. And whatever I confirm, I confirm the slot rather than the sentence." }
        ] }
    ]
  }
});
