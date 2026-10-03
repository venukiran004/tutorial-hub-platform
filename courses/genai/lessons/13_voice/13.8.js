EC.receiveLesson({
  id: "13.8",

  lede: "The prompt that produced your best chat answers will produce your worst spoken ones, and the reasons are mechanical rather than stylistic. A speech synthesiser reads markdown emphasis markers out loud. It reads a currency amount digit by digit with the symbol pronounced. A numbered list of six options is a list of one option, because the listener is holding it in working memory. Running a real linter over a good chat answer found **21 separate strings that get read aloud as punctuation**, and the rewrite for the ear was **63.9% shorter** \u2014 which cut delivery time from 26.9 seconds to 9.7, the TTS bill by the same proportion, and the output tokens too. **Response length is a latency control, not a style preference**, and it is the one optimisation in this module where three budgets improve together.",

  objectives: [
    "List the formatting constructs a synthesiser mispronounces and why",
    "Write numbers, currency and dates as they are said rather than written",
    "Structure a spoken answer around working memory rather than around completeness",
    "Explain why response length is simultaneously a latency and a cost control",
    "Write a system prompt that enforces speakability as a hard constraint"
  ],

  prerequisites: ["13.1", "13.7"],

  blocks: [

    { t: "h2", n: "01", id: "markdown", text: "Markdown is read aloud",
      sub: "The first thing anyone discovers, usually in a demo" },

    { t: "p", text: "A language model trained on text emits text conventions, and a synthesiser has no way to know they were meant as formatting. Depending on the engine, emphasis markers become the word \u201casterisk\u201d, a hash becomes \u201cpound\u201d or \u201chash\u201d, and a bullet becomes \u201cdash\u201d or a strange pause. Nothing in the pipeline warns you; the audio is simply wrong." },

    { t: "code", lang: "text", title: "What the synthesiser actually says",
      code: 'MODEL OUTPUT:    Your **current balance** is $412.60 (as of 03/14/2026).\n\nSPOKEN AS:       Your asterisk asterisk current balance asterisk asterisk\n                 is dollar sign four one two point six zero, open paren\n                 as of zero three slash one four slash two zero two six\n                 close paren.\n\nWHAT YOU WANTED: Your current balance is four hundred twelve dollars and\n                 sixty cents, as of March fourteenth.',
      caption: "Three separate failures in one sentence: emphasis markers, currency notation, and a numeric date." },

    { t: "p", text: "The instinct is to strip formatting in post-processing, and that is worth doing as a safety net \u2014 but it is the wrong primary fix, because stripping the markers leaves the structure that the markers were carrying. A six-item list with the bullets removed is still six items the listener cannot hold. The real fix is upstream, in the prompt, so the model never produces the structure in the first place." },

    { t: "callout", kind: "trap", title: "Post-processing hides the symptom and keeps the disease",
      body: [
        { t: "p", text: "A regex that deletes emphasis markers makes the audio stop saying \u201casterisk\u201d, which feels like a fix and gets shipped. What remains is a 377-character answer organised as a numbered list with three lettered sub-options, delivered serially over 27 seconds to someone who cannot skim or re-read it." },
        { t: "p", text: "Keep the regex as a last line of defence, because a model will occasionally emit formatting whatever you ask. But if the regex is doing real work on most responses, the prompt is wrong." }
      ] },

    { t: "h2", n: "02", id: "numbers", text: "Numbers, as they are said",
      sub: "The category that silently corrupts meaning" },

    { t: "p", text: "Formatting errors sound wrong and are therefore caught. Numeric errors sometimes sound plausible and change the meaning, which makes them worse." },

    { t: "table",
      head: ["Written", "Often spoken as", "Say instead"],
      rows: [
        ["$412.60", "dollar sign four one two point six zero", "four hundred twelve dollars and sixty cents"],
        ["03/14/2026", "zero three slash one four slash\u2026", "March fourteenth, twenty twenty-six"],
        ["03/14", "three fourteenths, or a fraction", "March fourteenth"],
        ["2-3 business days", "two minus three business days", "two to three business days"],
        ["ext. 4021", "ext four thousand and twenty-one", "extension four zero two one"],
        ["#4021", "hash four thousand and twenty-one", "number four zero two one"],
        ["9:30am", "nine colon thirty am", "half past nine in the morning"],
        ["AB-7719", "A B dash seven thousand\u2026", "A B, seven seven one nine"]
      ] },

    { t: "callout", kind: "insight", title: "Identifiers are said digit by digit, quantities are not",
      body: [
        { t: "p", text: "The rule that resolves most of these: a number that is a **quantity** is spoken as a quantity \u2014 \u201cfour hundred twelve dollars\u201d. A number that is an **identifier** is spoken digit by digit \u2014 \u201cfour zero two one\u201d, not \u201cfour thousand and twenty-one\u201d. Account numbers, extensions, reference codes and postcodes are identifiers; amounts, counts and durations are quantities." },
        { t: "p", text: "Models get this wrong in both directions without instruction, and it matters more than it looks. \u201cFour thousand and twenty-one\u201d for a reference number is not merely unnatural \u2014 the user cannot write it down reliably, which is the only reason you read them a reference number at all." }
      ] },

    { t: "h2", n: "03", id: "structure", text: "Structure for working memory",
      sub: "Three items, and the answer first" },

    { t: "p", text: "A chat answer is optimised for a reader who can skim, so it front-loads context and offers complete option sets. A spoken answer is consumed serially by someone holding it in working memory, which is good for about three items. The structural rules follow directly." },

    { t: "dl", items: [
      { k: "Answer first, context after", v: "\u201cThe fourteenth of March. That's about three weeks away, and autopay will cover it.\u201d Not the other way round. If the user interrupts after the first clause \u2014 and they will \u2014 they have the answer." },
      { k: "One or two sentences, then stop", v: "Silence invites the user to speak, which is how a conversation works. A spoken answer that keeps going past the point of the question is taking a turn the user wanted." },
      { k: "One question, never three", v: "\u201cWould you like me to change the date?\u201d not \u201cWould you like me to (a) change the date, (b) disable autopay, or (c) set up a plan?\u201d Ask the most likely one; the user will tell you if it is wrong." },
      { k: "At most three list items, and signpost the count", v: "\u201cThere are three options. The first is\u2026\u201d gives the listener a frame to hold. More than three needs to become a conversation across turns rather than one utterance." },
      { k: "No nested structure at all", v: "There is no audio equivalent of indentation. A sub-list is simply a flat list with confusing transitions, so flatten deliberately rather than letting the synthesiser flatten it for you." }
    ] },

    { t: "ladder", title: "The same answer, four ways",
      rungs: [
        { level: "bad", label: "The chat answer, spoken",
          why: "377 characters, 27 seconds, 21 strings read aloud as punctuation, a three-item numbered list and three lettered options. The content is correct and the delivery is unusable.",
          code: "Here's a breakdown of your **current balance** and\nupcoming payments:\n\n1. **Current balance**: $412.60 (as of 03/14/2026)\n2. **Next payment**: $80.00, due 03/14\n3. **Autopay status**: enabled (see settings)\n\nWould you like me to (a) change the payment date,\n(b) disable autopay, or (c) set up a payment plan?",
          note: "Also contains 'see settings', which means nothing on a phone call." },
        { level: "ok", label: "Formatting stripped in post-processing",
          why: "The audio stops saying \u201casterisk\u201d, so it sounds fixed. The structure is untouched: still three items plus three options, still 27 seconds, still unholdable. This is the version that ships.",
          code: "Here's a breakdown of your current balance and\nupcoming payments: 1. Current balance: 412.60 dollars\nas of 03/14/2026. 2. Next payment: 80.00 dollars,\ndue 03/14. 3. Autopay status: enabled.\nWould you like me to a change the payment date, b\ndisable autopay, or c set up a payment plan?",
          note: "The dates are still wrong and the letters now read as stray words." },
        { level: "ok", label: "Rewritten for speech, still complete",
          why: "Numbers and dates said properly, no formatting, no nesting. But it still tries to deliver everything, so it runs long and asks a compound question at the end.",
          code: "Your balance is four hundred twelve dollars and sixty\ncents. Eighty dollars is due on March fourteenth, and\nautopay is on so it'll be taken automatically. Do you\nwant to change the date, turn off autopay, or set up\na payment plan?",
          note: "Much better, and the three-way question at the end is still asking the listener to hold three things." },
        { level: "best", label: "Rewritten for the ear",
          why: "136 characters, 9.7 seconds, zero formatting issues, answer first, one question. Autopay is dropped because it was not asked about \u2014 and if the user wants it they will ask, which costs one cheap turn instead of eight seconds on every call.",
          code: "Your balance is four hundred twelve dollars and sixty\ncents, and eighty dollars is due on March fourteenth.\nWant me to change that date?",
          note: "63.9% shorter: delivery time, TTS cost and output tokens all fall by the same proportion." }
      ] },

    { t: "h2", n: "04", id: "length", text: "Length is a latency control",
      sub: "The one place three budgets improve together" },

    { t: "p", text: "Almost every optimisation in this module trades something. A shorter endpointing threshold buys latency with interruptions. Speculative prefill buys latency with wasted tokens. A smaller model buys latency with accuracy. Shortening the response is the exception: every character removed is TTS cost removed, output tokens removed and delivery time removed, simultaneously, with no counterparty." },

    { t: "viz", title: "What 63.9% shorter actually buys",
      caption: "One change, three budgets, same direction. The only free lunch in the module.",
      svg: '<svg viewBox="0 0 760 290" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Three budgets improving together as response length falls">' +
        '<text x="12" y="18" class="s-label">THE CHAT ANSWER, 377 CHARACTERS</text>' +
        '<rect x="12" y="28" width="700" height="22" fill="var(--crit)" opacity="0.25" stroke="var(--crit)"/>' +
        '<text x="362" y="44" class="s-sub" text-anchor="middle">26.9 s of audio the user cannot skim, skip or re-read</text>' +
        '<text x="12" y="76" class="s-label">THE SPOKEN REWRITE, 136 CHARACTERS</text>' +
        '<rect x="12" y="86" width="253" height="22" fill="var(--good)" opacity="0.3" stroke="var(--good)"/>' +
        '<text x="138" y="102" class="s-sub" text-anchor="middle">9.7 s</text>' +
        '<text x="275" y="102" class="s-mono" fill="var(--good)">\u2212 63.9%</text>' +
        '<line x1="12" y1="126" x2="748" y2="126" class="s-stroke" opacity="0.4"/>' +
        '<text x="12" y="152" class="s-label">AND THE SAME 63.9% COMES OFF EVERY OTHER BUDGET</text>' +
        '<rect x="12" y="166" width="226" height="44" rx="4" fill="var(--good)" opacity="0.12" stroke="var(--good)"/>' +
        '<text x="125" y="186" class="s-sub" text-anchor="middle">TTS cost</text>' +
        '<text x="125" y="204" class="s-mono" text-anchor="middle" fill="var(--good)">$0.00565 \u2192 $0.00204</text>' +
        '<rect x="248" y="166" width="226" height="44" rx="4" fill="var(--good)" opacity="0.12" stroke="var(--good)"/>' +
        '<text x="361" y="186" class="s-sub" text-anchor="middle">LLM output tokens</text>' +
        '<text x="361" y="204" class="s-mono" text-anchor="middle" fill="var(--good)">$0.00141 \u2192 $0.00051</text>' +
        '<rect x="484" y="166" width="228" height="44" rx="4" fill="var(--good)" opacity="0.12" stroke="var(--good)"/>' +
        '<text x="598" y="186" class="s-sub" text-anchor="middle">dead airtime</text>' +
        '<text x="598" y="204" class="s-mono" text-anchor="middle" fill="var(--good)">26.9 s \u2192 9.7 s</text>' +
        '<text x="12" y="240" class="s-sub">every other optimisation in this module has a counterparty: endpointing trades</text>' +
        '<text x="12" y="258" class="s-sub">interruptions, speculation trades wasted tokens, a smaller model trades accuracy.</text>' +
        '<text x="12" y="276" class="s-sub">brevity trades nothing \u2014 which is why it belongs in the prompt as a hard limit.</text>' +
        '</svg>' },

    { t: "code", lang: "text", title: "The speech section of a system prompt",
      code: 'You are speaking out loud on a phone call. Your output is sent\ndirectly to a speech synthesiser.\n\nFORMAT\n- Never use markdown, asterisks, bullets, numbered lists or headings.\n- Write only words and ordinary sentence punctuation.\n\nNUMBERS\n- Write every number as it is spoken.\n  412.60 dollars -> "four hundred twelve dollars and sixty cents"\n  03/14         -> "March fourteenth"\n- Quantities as quantities; identifiers digit by digit.\n  reference 4021 -> "four zero two one", never "four thousand"\n\nLENGTH\n- One or two sentences. Then stop.\n- Answer first, context after, so an interruption still leaves the\n  user with the answer.\n- Ask at most one question per turn.\n- Never list more than three things. If there are more, say how many\n  there are and offer the first; let the caller ask for the rest.\n\nIF YOU NEED TIME\n- Say a short acknowledgement before a slow lookup, and never claim\n  an action succeeded before you have the result.',
      caption: "Specific and mechanical. \u201cBe conversational and concise\u201d produces none of this." },

    { t: "callout", kind: "warn", title: "\u201cBe concise\u201d does not work and \u201ctwo sentences\u201d does",
      body: [
        { t: "p", text: "Vague length instructions are among the least reliably followed things you can put in a prompt, because the model has no shared referent for how long is too long. A countable constraint \u2014 two sentences, one question, at most three items \u2014 is checkable by the model as it generates and auditable by you afterwards." },
        { t: "p", text: "It is also measurable in production. Mean output characters per turn is the metric to alert on, and 12.7's finding applies directly: alert on the token count rather than on the cost, because the count is a property of the model's behaviour and the cost is a property of your prompt." }
      ] },

    { t: "exercise", kind: "build", title: "Build a speakability linter",
      difficulty: "core", minutes: 24,
      body: "Write a linter that takes a response string and reports every construct a speech synthesiser will mishandle, then quantifies delivery time and TTS cost. Run it on a realistic chat answer and on a rewrite for the ear, and report what the rewrite is worth across all three budgets.",
      requirements: [
        "Detect emphasis markers, numbered lists, paragraph breaks and lettered options",
        "Detect currency notation, full numeric dates and short numeric dates",
        "Report delivery time from character count at roughly 14 characters per second",
        "Report TTS cost at $0.015 per 1,000 characters",
        "Compare a chat answer against a spoken rewrite on characters, time, cost and issue count",
        "Show the cost and delivery time at several response lengths"
      ],
      hint: "Regexes are enough. The interesting output is not the issue list but the comparison table at the end \u2014 the three budgets move by an identical percentage, which is the point.",
      solution: { lang: "python", title: "x1308.py \u2014 what the synthesiser will do to your answer",
        code: 'import re\n\nCHAR_PER_SEC, TTS_PER_1K = 14.0, 0.015\n\nMARKDOWN = [\n    (r"\\*\\*", "asterisk", "read aloud as asterisk by most engines"),\n    (r"^\\s*\\d+\\.\\s", "numbered list", "becomes one dot - and is unholdable anyway"),\n    (r"\\n\\n", "paragraph break", "silent; the structure the user needed is gone"),\n    (r"\\([a-c]\\)", "lettered option", "open paren a close paren, or a confusing pause"),\n]\nNUMERIC = [\n    (r"\\$\\d+\\.\\d{2}", "currency", "dollar sign four one two point six zero"),\n    (r"\\d{2}/\\d{2}/\\d{4}", "date", "zero three slash one four slash two zero two six"),\n    (r"\\d{2}/\\d{2}(?!/)", "short date", "read as a fraction by some engines"),\n]\n\ndef lint(name, text):\n    issues = 0\n    for pat, label, why in MARKDOWN + NUMERIC:\n        hits = len(re.findall(pat, text, re.M))\n        if hits:\n            issues += hits\n            print("   %-16s x%-3d %s" % (label, hits, why))\n    secs = len(text) / CHAR_PER_SEC\n    cost = len(text) / 1000.0 * TTS_PER_1K\n    print("   %-30s %6.1f s to speak" % ("delivery time", secs))\n    print("   %-30s $%.5f" % ("TTS cost", cost))\n    return len(text), secs, cost, issues',
        out: '============================================================================================\nTHE CHAT ANSWER, read aloud  (377 chars)\n============================================================================================\n   asterisk         x8   read aloud as \'asterisk asterisk\' by most engines\n   numbered list    x3   becomes \'one dot\' - and the list is unholdable anyway\n   paragraph break  x2   silent; the structure the user needed is simply gone\n   lettered option  x3   \'open paren a close paren\' or a confusing pause\n   currency         x2   \'dollar sign four one two point six zero\'\n   date             x1   \'zero three slash one four slash two zero two six\'\n   short date       x2   read as a fraction by some engines\n   delivery time                    26.9 s to speak\n   TTS cost                       $0.00565\n   issues                         21\n\n============================================================================================\nTHE SPOKEN ANSWER  (136 chars)\n============================================================================================\n   no formatting or numeric issues found\n   delivery time                     9.7 s to speak\n   TTS cost                       $0.00204\n   issues                         0\n\n============================================================================================\nWhat rewriting for the ear is worth\n============================================================================================\n                               chat answer       spoken     change\n   characters                          377          136     -63.9%\n   time to deliver                   26.9s         9.7s     -63.9%\n   TTS cost                       $0.00565     $0.00204     -63.9%\n   things read aloud wrong              21            0        -21\n\nthe chat answer takes 26.9 seconds to deliver. the user cannot skim it, cannot\nre-read it, and is holding a three-item list plus three lettered options in\nworking memory. and 21 separate strings get read out as punctuation.\n\n--------------------------------------------------------------------------------------------\nlength is a latency control, not a style preference\n--------------------------------------------------------------------------------------------\n   answer                       chars   speak time        TTS $      LLM out $\n   chat answer                    377        26.9s     $0.00565       $0.00141\n   25% shorter                    282        20.1s     $0.00423       $0.00106\n   half                           188        13.4s     $0.00282       $0.00071\n   spoken rewrite                 136         9.7s     $0.00204       $0.00051\n\nevery character removed is TTS cost removed, output tokens removed AND\ndelivery time removed. that is three budgets improving together, which almost\nnothing else in this module does -- most optimisations trade one for another.\n\nTHE RULE: in chat, verbosity is mildly annoying. in voice it is dead airtime\nthe user cannot skip, the largest line in the cost model, and the thing that\npushes a turn out of the responsive band. \'be concise\' is an engineering\nrequirement here, and it belongs in the system prompt as a hard limit.',
        notes: [
          { t: "p", text: "**21 separate strings in one good chat answer get read aloud as punctuation or mispronounced.** That is not an unusual answer \u2014 it is what a well-prompted chat model produces when asked about a balance, and every one of those 21 is a defect introduced by the format rather than by the model." },
          { t: "p", text: "**The rewrite is 63.9% shorter and the same 63.9% comes off three separate budgets**: delivery time 26.9 \u2192 9.7 seconds, TTS cost $0.00565 \u2192 $0.00204, output tokens $0.00141 \u2192 $0.00051. Nothing else in this module improves three things at once \u2014 endpointing trades interruptions, speculation trades wasted tokens, a smaller model trades accuracy." },
          { t: "p", text: "**26.9 seconds is the number that should end the argument.** The user cannot skim it, cannot re-read it, and is being asked to hold a three-item list plus three lettered options in a memory good for about three things. The content was correct; the delivery was never going to work." },
          { t: "p", text: "**Note what the best rewrite drops rather than shortens.** The autopay status was not asked about. Removing it costs a cheap extra turn in the minority of calls where the user wants it, and saves eight seconds on every call where they do not \u2014 which is the trade a spoken interface should make and a text one should not." },
          { t: "p", text: "**The linter earns its place in CI, not in the pipeline.** Running it as a post-processor fixes the symptom and leaves the structure, which is the version that ships and does not help. Running it over your golden-set responses on every prompt change catches the regression where someone adds a helpful instruction and the model starts bulleting again." }
        ] } },

    { t: "callout", kind: "scenario", title: "Scenario: the agent that reads out punctuation",
      body: [
        { t: "p", text: "A pilot voice agent is reported as \u201crobotic\u201d. Listening to recordings, it says \u201casterisk asterisk\u201d several times a call and reads dates as sequences of digits and slashes. The quick fix is obvious and someone has already written the regex." },
        { t: "p", text: "Ship the regex as a safety net, then do the real work in the prompt \u2014 because stripping markers leaves the structure, and the structure is the bigger problem. The recordings almost certainly also show 25-second answers containing six-item lists, and no regex addresses that. The prompt needs the mechanical version: no markdown, numbers written as spoken, two sentences, one question, three items maximum." },
        { t: "p", text: "Then put the linter in CI over the golden set, because this regresses. Someone will add a well-meant instruction about being thorough, the model will start bulleting again, and without a check the only detection mechanism is another round of customer complaints. And add mean output characters per turn to the dashboard: it is the leading indicator for all of this, and it is also the largest line in the cost model." }
      ] }
  ],

  takeaways: [
    "**A synthesiser reads markdown aloud** \u2014 emphasis markers become \u201casterisk\u201d, hashes become \u201cpound\u201d, bullets become stray words.",
    "**A real linter found 21 mispronounced strings in one good chat answer**, all introduced by format rather than by the model.",
    "**Stripping formatting in post-processing fixes the symptom and keeps the disease** \u2014 a de-bulleted six-item list is still six items nobody can hold.",
    "**Numeric errors are worse than formatting errors** because they sound plausible and change the meaning.",
    "**Quantities are spoken as quantities, identifiers digit by digit** \u2014 \u201cfour hundred twelve dollars\u201d but \u201cfour zero two one\u201d for a reference.",
    "**Working memory holds about three items**, so answer first, one or two sentences, one question, at most three list items, and no nesting.",
    "**The rewrite for the ear was 63.9% shorter**: 26.9 seconds to 9.7, and the same 63.9% off TTS cost and output tokens.",
    "**Length is the only optimisation in this module with no counterparty** \u2014 three budgets improve together, where everything else trades something.",
    "**\u201cBe concise\u201d does not work; \u201ctwo sentences, one question, three items\u201d does** \u2014 countable constraints are checkable during generation and auditable after.",
    "**The best rewrite drops content rather than compressing it**: autopay was not asked about, so it costs a cheap turn sometimes instead of eight seconds always.",
    "**Put the linter in CI over the golden set, not in the pipeline** \u2014 it catches the regression when a helpful instruction makes the model bullet again.",
    "**Alert on mean output characters per turn**: it is the leading indicator for delivery time, for cost, and for the prompt quietly drifting."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A team adds a regex that strips markdown from responses before synthesis. What problem remains?",
        options: [
          "None \u2014 removing the markers removes the mispronunciation",
          "The structure the markers carried remains, so a six-item list is still six items the listener cannot hold",
          "The regex will also strip legitimate punctuation",
          "Latency increases because of the extra processing step"
        ],
        answer: 1,
        why: "The audio stops saying \u201casterisk\u201d, which feels like a fix and gets shipped, but the response is still a 377-character numbered list with lettered sub-options delivered serially over 27 seconds to someone who cannot skim or re-read. Keep the regex as a last line of defence since a model will occasionally emit formatting anyway \u2014 but if it is doing real work on most responses, the prompt is wrong and the structure is the larger problem." },

      { stem: "How should a voice agent speak the reference number 4021?",
        options: [
          "\u201cFour thousand and twenty-one\u201d, which is how the number is read",
          "\u201cFour zero two one\u201d, because an identifier is spoken digit by digit",
          "\u201cForty twenty-one\u201d, which is shorter and natural",
          "It should be spelled rather than spoken"
        ],
        answer: 1,
        why: "Quantities are spoken as quantities and identifiers digit by digit, and models get this wrong in both directions without explicit instruction. It matters more than it sounds: the only reason to read a caller a reference number is so they can write it down, and \u201cfour thousand and twenty-one\u201d cannot be transcribed reliably \u2014 so the error defeats the entire purpose of the utterance." },

      { stem: "The rewrite for the ear was 63.9% shorter. What did that buy?",
        options: [
          "Lower TTS cost only, since the model still generated the full reasoning",
          "Delivery time, TTS cost and output tokens all fell by the same 63.9%",
          "Lower latency to first audio, since the response is shorter",
          "Reduced ASR load on the following turn"
        ],
        answer: 1,
        why: "Delivery went from 26.9 to 9.7 seconds, TTS from $0.00565 to $0.00204 and output tokens from $0.00141 to $0.00051 \u2014 one change, three budgets, same proportion. That makes brevity unique in this module: endpointing trades interruptions, speculative prefill trades wasted tokens, a smaller model trades accuracy, and shortening the response trades nothing, which is why it belongs in the prompt as a hard limit." },

      { stem: "Why is \u201cone or two sentences, one question, at most three items\u201d better than \u201cbe concise\u201d?",
        options: [
          "It is shorter, so it consumes fewer prompt tokens",
          "Countable constraints are checkable by the model while generating and auditable afterwards",
          "It prevents the model from using markdown",
          "Vague instructions are ignored entirely by most models"
        ],
        answer: 1,
        why: "A vague length instruction gives the model no shared referent for how long is too long, so it is among the least reliably followed things in a prompt. A countable constraint can be checked during generation and audited after, and it makes the production metric obvious \u2014 mean output characters per turn, which is simultaneously the leading indicator for delivery time, for the largest line in the cost model, and for prompt drift." }
    ]
  },

  interview: {
    title: "Interview practice",
    sub: "Prompting for speech",
    questions: [
      { level: "core",
        q: "What changes about prompting when the output will be spoken?",
        strong: "A strong answer covers format, numbers, structure and length as a latency control.",
        answer: [
          { t: "p", text: "Four things, and the fourth is the one people underrate. Format: no markdown at all, because the synthesiser reads emphasis markers out loud as the word \u2018asterisk\u2019. When I ran a linter over a normal, well-written chat answer about an account balance, there were 21 separate strings that got read aloud as punctuation or mispronounced." },
          { t: "p", text: "Numbers, written as they are said. Currency as \u2018four hundred twelve dollars and sixty cents\u2019, dates as \u2018March fourteenth\u2019, and the distinction between quantities and identifiers \u2014 a quantity is spoken as a number, an identifier digit by digit. A reference number read as \u2018four thousand and twenty-one\u2019 cannot be written down, which defeats the only reason you read it out." },
          { t: "p", text: "Structure for working memory, which holds about three items. Answer first and context after, so that an interruption still leaves the user with the answer. One or two sentences, then stop, because silence is how you hand the turn over. One question, not three. And no nesting, because there is no audio equivalent of indentation." },
          { t: "p", text: "And the fourth: length is a latency control, not a style preference. The rewrite for the ear in my example was 63.9% shorter, and the same 63.9% came off delivery time, TTS cost and output tokens together. That makes it the only optimisation in the whole voice stack with no counterparty \u2014 endpointing trades interruptions, speculation trades wasted tokens, a smaller model trades accuracy, and being brief trades nothing." }
        ] },

      { level: "advanced",
        q: "Users say your voice agent sounds robotic and reads out punctuation. Walk me through the fix.",
        strong: "A strong answer rejects the post-processor as the primary fix and adds a CI check.",
        answer: [
          { t: "p", text: "I would ship the regex that strips markdown immediately, because it stops the worst of it today, and then treat it as a safety net rather than the fix. Stripping the markers removes the mispronunciation and leaves the structure, and the structure is the bigger problem \u2014 a six-item list with the bullets deleted is still six items delivered serially to someone who cannot skim or re-read them." },
          { t: "p", text: "The real work is in the prompt, and it has to be mechanical rather than aspirational. \u2018Be conversational and concise\u2019 produces none of what is needed. What works is countable: never use markdown or lists, write every number as it is spoken with examples of both a quantity and an identifier, one or two sentences then stop, answer first and context after, at most one question, never more than three things in a list." },
          { t: "p", text: "I would also expect the recordings to show a second problem nobody has reported yet. If the answers are formatted like chat answers they are probably also 25 seconds long, and no regex addresses that. The linter I would write reports delivery time and TTS cost alongside the formatting issues, precisely so the length problem surfaces in the same report." },
          { t: "p", text: "Then two things to stop it coming back. Put the linter in CI over the golden-set responses, because this regresses the moment someone adds a well-meant instruction about being thorough and the model starts bulleting again \u2014 without a check, the detection mechanism is another round of customer complaints. And put mean output characters per turn on the dashboard, since it is the leading indicator for delivery time, for the largest line in the cost model, and for the prompt drifting." }
        ] },

      { level: "core",
        q: "Why drop information from a spoken answer rather than just shortening it?",
        strong: "A strong answer weighs a cheap extra turn against time spent on every call.",
        answer: [
          { t: "p", text: "Because the economics of an unasked-for detail are completely different in speech. In chat, including the autopay status alongside the balance costs the reader a second of skimming and might save them a follow-up \u2014 that is a good trade. In voice it costs eight seconds of unskippable audio on every single call, and it is competing for a working memory that holds about three things." },
          { t: "p", text: "So the calculation is: how often does the user actually want this, and what does it cost when they do? If one caller in five wants the autopay status, telling everyone costs eight seconds times five calls to save one cheap follow-up turn. Dropping it costs one extra turn in that fifth call and saves eight seconds in the other four. The second option is clearly better, and in chat it would be clearly worse." },
          { t: "p", text: "The structural version of this is answer first, context after. It is partly about interruptions \u2014 if the user cuts in after the first clause they still have the answer \u2014 and partly that it lets you stop early without having buried the thing they asked for behind preamble." },
          { t: "p", text: "The one thing I would be careful about is dropping something the user needs for a decision rather than something merely nice to have. If the next payment is due tomorrow, that is not optional context, it changes what they do. So the rule is to drop unrequested detail, not to drop detail that changes the answer \u2014 and that distinction has to be in the prompt explicitly, because a model told only to be brief will cut either one." }
        ] }
    ]
  }
});
