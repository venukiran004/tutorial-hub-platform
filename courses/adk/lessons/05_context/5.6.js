/* ============================================================================
   LESSON 5.6 — Context Window: Compaction, Caching and Long Conversations
   The growth numbers and the compaction sawtooth are executed output from
   scratchpad/adk/s6.py on google-adk 2.9.2; the configs are introspected.
   ========================================================================= */
EC.receiveLesson({
  id: "5.6",

  lede: "**Every turn resends the whole conversation, so the tenth turn costs ten times the first.** That is not a flaw in ADK; it is what statelessness costs, and it is why a demo that felt fast becomes a product with a latency complaint and a bill. The fixes are all forms of sending less or paying less for the same bytes: compact old events into a summary, cache the stable prefix, drop history for agents that do not need it, or end the conversation. This lesson measures the growth, turns compaction on, and measures it again.",

  objectives: [
    "Explain what ADK sends the model on turn fifty and why it grows",
    "Measure context growth and read a compaction trace",
    "Configure `EventsCompactionConfig` and describe each of its knobs",
    "Decide when to use context caching, `include_contents=\"none\"`, or a new session",
    "Recognise the failure modes compaction introduces"
  ],

  prerequisites: ["5.1", "2.6"],

  blocks: [

    { t: "h2", n: "01", text: "The growth, measured", id: "growth" },

    { t: "p", text: "Five turns of pure conversation — no tools — against a scripted model, printing how many `contents` the framework put in each request." },

    { t: "code", lang: "python", title: "s6.py — counting what gets sent",
      code: `for i in range(1, 6):
    await talk(runner, s.id, f"message {i}")
print("contents sent per request:", [len(r.contents) for r in llm.seen])` },

    { t: "out", text: "no compaction - contents sent per request: [1, 3, 5, 7, 9]" },

    { t: "p", text: "Two contents per turn — the user's message and the model's reply — added to everything before it. It is arithmetic rather than a surprise, but the shape matters: **cost and latency grow linearly with turn number, so the total cost of a conversation grows quadratically with its length.** A fifty-turn support conversation does not cost fifty times a one-turn conversation; it costs about twelve hundred times the first turn's contents." },

    { t: "diagram", kind: "cells", title: "Contents in each request, turns 1–5",
      caption: "A tool-using turn adds four contents instead of two, so agentic conversations grow roughly twice as fast as chat.",
      items: ["1", "3", "5", "7", "9"], highlight: [4], tone: "warn", negative: false },

    { t: "callout", kind: "insight", title: "Three separate problems, often confused",
      text: "**Cost** is tokens billed per request, and it grows first. **Latency** grows with input length too, though more gently. **Quality** degrades last and least predictably: a model given forty thousand tokens of history attends less reliably to any particular fact in it, which is why a long conversation starts 'forgetting' things that are demonstrably still in the context. Compaction helps all three; caching helps only the first two." },

    { t: "h2", n: "02", text: "Compaction", id: "compaction" },

    { t: "p", text: "Compaction periodically replaces a window of old events with a model-written summary. It is configured on the `App`, not the agent, because it is a property of the conversation rather than of any one participant." },

    { t: "code", lang: "python", title: "Turning it on",
      code: `from google.adk.apps import App
from google.adk.apps.app import EventsCompactionConfig

app = App(name="support", root_agent=agent,
          events_compaction_config=EventsCompactionConfig(
              compaction_interval=2,     # compact every 2 events
              overlap_size=1))           # windows overlap by 1, so nothing falls in a gap
runner = Runner(app=app, session_service=svc)` },

    { t: "out", text: `with compaction  - contents sent per request: [1, 3, 1, 1, 1, 2, 4, 1]
events stored: 14
  compaction event by user: window 1790169029->1790169029 summary='reply 3'
  compaction event by user: window 1790169029->1790169029 summary='reply 8'` },

    { t: "p", text: "The sawtooth is compaction working. Instead of `[1, 3, 5, 7, 9, 11]` the request sizes stay near the floor, rising a little and dropping back each time a window is folded up. Two other details are visible. **There were eight model requests for six turns** — the extras are the summariser, which is itself a model call, so compaction trades a smaller prompt for an occasional additional round trip. And **the summaries are stored as events**, carrying `compaction` on their actions with the timestamp window they cover, so the log still tells you exactly what was replaced and when." },

    { t: "table", head: ["Field", "Meaning", "How to choose"],
      rows: [
        ["`compaction_interval`", "How many events between compactions", "Small values compact constantly and cost summariser calls; large values let the prompt grow between them"],
        ["`overlap_size`", "Events shared by consecutive windows", "At least 1, so a fact mentioned at a boundary is not lost between two summaries"],
        ["`token_threshold`", "Compact when the context passes this many tokens", "More principled than counting events, since events vary wildly in size"],
        ["`event_retention_size`", "Recent events kept verbatim, never summarised", "The last few turns should always be exact; summarised recent history reads as an agent with concussion"],
        ["`summarizer`", "A `BaseEventsSummarizer`", "Default uses the model. Supply your own to control the prompt — or to keep specific fields verbatim"]
      ] },

    { t: "callout", kind: "trap", title: "Compaction is lossy, and the loss is chosen by a model",
      text: "A summariser writing 'the user discussed their booking' has silently discarded the booking reference. Anything that must survive the whole conversation should be in **state**, not left in the transcript hoping a summary preserves it — state is never compacted. Write the identifiers, the decisions and the constraints to state as they are established, and let compaction take the prose." },

    { t: "diagram", kind: "timeline", title: "What the model sees on turn 12, with and without compaction",
      caption: "Compaction keeps the recent turns exact and replaces the distant past with prose. The choice is not whether to lose detail — a long prompt loses it too, by dilution — but whether you control which detail.",
      span: 12, tick: 2,
      lanes: [
        { label: "No compaction", bars: [[0, 12, "all twelve turns, verbatim", "warn"]] },
        { label: "Compacted", bars: [[0, 6, "summary A", "violet"], [6, 9, "summary B", "violet"], [9, 12, "verbatim", "good"]] },
        { label: "State", bars: [[0, 12, "exact — never compacted", "accent"]] }
      ] },

    { t: "h2", n: "03", text: "Context caching", id: "caching" },

    { t: "p", text: "Caching attacks the same bill from the other side. The stable prefix of a request — the system instruction, the tool declarations, the older turns — is identical call after call, and providers will charge less for a cached prefix than for fresh input tokens." },

    { t: "code", lang: "python", title: "The config, introspected",
      code: `from google.adk.agents.context_cache_config import ContextCacheConfig
print({k: (str(v.annotation), v.default) for k, v in ContextCacheConfig.model_fields.items()})` },

    { t: "out", text: `{'cache_intervals': ("<class 'int'>", 10),
 'ttl_seconds': ("<class 'int'>", 1800),
 'min_tokens': ("<class 'int'>", 0),
 'create_http_options': ('google.genai.types.HttpOptions | None', None)}` },

    { t: "dl", items: [
      ["cache_intervals", "How many requests reuse one cache entry before it is rebuilt. Higher means fewer cache writes and a staler prefix."],
      ["ttl_seconds", "Thirty minutes by default. A conversation idle longer than this pays full price on its next turn — which is why caching helps active conversations and does nothing for sporadic ones."],
      ["min_tokens", "Do not cache below this size. Caching a short prompt can cost more than it saves, since writing the cache is not free."]
    ] },

    { t: "callout", kind: "tradeoff", title: "Caching and compaction pull in opposite directions",
      text: "Caching rewards a prefix that does not change; compaction rewrites the prefix every time it runs. Used together with an aggressive `compaction_interval`, you invalidate the cache constantly and pay for both. Prefer caching when conversations are long-running and active with a large stable instruction and tool set; prefer compaction when they run long enough that the window itself is the problem. If you use both, compact rarely." },

    { t: "h2", n: "04", text: "Sending nothing at all", id: "none" },

    { t: "code", lang: "python", title: "include_contents=\"none\"",
      code: `classifier = LlmAgent(
    name="classifier", model=MODEL,
    include_contents="none",                       # no conversation history at all
    instruction="Classify the request in state as billing, technical or other. "
                "Request: {request_text}",
    output_key="category")`,
      caption: "Executed in lesson 2.3 as part of a SequentialAgent. The agent gets its input from state, not from history." },

    { t: "p", text: "This is the cheapest option available and it is badly underused. A classifier, an extractor, a formatter, a guardrail check — none of these need the conversation. Giving them history costs tokens on every call and actively hurts: a classifier that can see the user arguing about a refund three turns ago is more likely to be talked out of its category than one that sees only the sentence it was asked to classify." },

    { t: "h2", n: "05", text: "The decision", id: "decision" },

    { t: "diagram", kind: "flow", title: "Which lever to pull",
      caption: "In that order. The first two are free and are usually enough; compaction is the one that changes behaviour, so it comes last.",
      cols: 3,
      nodes: [
        { id: "a", label: "Does this agent need history?", sub: "no → include_contents=\"none\"", tone: "good" },
        { id: "b", label: "Is the subject still the same?", sub: "no → start a new session", tone: "good" },
        { id: "c", label: "Long, active conversations?", sub: "yes → context caching", tone: "accent" },
        { id: "d", label: "Still too big?", sub: "→ compaction, generously configured", tone: "warn" },
        { id: "e", label: "Facts that must not be lost?", sub: "→ write them to state", tone: "violet" }
      ],
      edges: [["a", "b"], ["b", "c"], ["c", "d"], ["d", "e"]] },

    { t: "callout", kind: "good", title: "The cheapest context management is a new session",
      text: "When the user changes subject, the previous forty turns are not context — they are noise you are paying to send. A product that quietly starts a new session at a natural boundary, carrying the durable facts in `user:` state, outperforms one that maintains a single endless thread on cost, latency and answer quality at once. The transcript is not sacred; the facts are." },

    { t: "exercise", kind: "practice", title: "Measure the sawtooth yourself", difficulty: "advanced", minutes: 24,
      prompt: "Run ten turns through a scripted model with no compaction and record the contents count per request. Turn on compaction with an interval of 3 and an overlap of 1 and run the same ten turns. Plot both. Then count how many model requests each run made, and explain the difference. Finally, set event_retention_size to 4 and describe what changes about the last few turns.",
      hints: [
        "`FakeLlm.seen` holds every LlmRequest, so `[len(r.contents) for r in llm.seen]` is the whole measurement.",
        "The compacted run makes more requests than turns — find the extras.",
        "Summaries appear in the session as events carrying `actions.compaction`."
      ],
      solution: {
        notes: [
          { t: "p", text: "Uncompacted you get the arithmetic sequence 1, 3, 5, 7 and so on. Compacted you get a sawtooth that rises for a few turns and drops back, and the peak is bounded by the interval rather than by the conversation length — which is the whole point: cost per turn becomes roughly constant instead of linear." },
          { t: "p", text: "The compacted run makes more model requests than there were turns, because each compaction is itself a model call to write the summary. That is the trade being made: an occasional extra round trip in exchange for every subsequent request being smaller. With a large interval the extra calls are rare and the saving compounds; with a tiny interval you can spend more on summarising than you save." },
          { t: "p", text: "With `event_retention_size=4` the most recent four events are never summarised. This matters more than it sounds: summarised recent history produces an agent that cannot quote what the user said two messages ago, which users read as not listening. Keep the near past exact and compact only the distant past." }
        ]
      } }

  ],

  takeaways: [
    "Contents grow by two per chat turn and four per tool-using turn — measured as [1, 3, 5, 7, 9].",
    "Cost per turn grows linearly with length, so total conversation cost grows quadratically.",
    "Compaction replaces windows of old events with model-written summaries, stored as events with a timestamp window.",
    "Each compaction is itself a model call: smaller prompts in exchange for occasional extra round trips.",
    "Caching rewards a stable prefix; compaction rewrites it — use both only with infrequent compaction.",
    "Anything that must survive a long conversation belongs in state, which is never compacted."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "A conversation reaches turn 20 with no tools. Roughly how many contents does the request carry?",
      options: ["20", "39", "40", "2 — only the last exchange"],
      answer: 1,
      why: "Two per completed turn plus the new message: the measured sequence is 1, 3, 5, 7, 9, so turn 20 carries 39. A tool-using conversation grows about twice as fast, because a call event and a response event join each pair." },
    { stem: "Compaction is configured with a small interval. Model calls per turn go up. Why?",
      options: ["Compaction retries failed summaries", "Each compaction is itself a model call to write the summary", "Smaller prompts make the model call tools more often", "The cache is rebuilt on each compaction"],
      answer: 1,
      why: "The executed run made eight requests for six turns, and the two extras were summariser calls. Compaction buys smaller prompts with occasional extra round trips, so an aggressive interval can cost more than it saves." },
    { stem: "Your classifier agent reads its input from state and does not need the conversation. What is the right setting?",
      options: ["A short compaction interval", "`include_contents=\"none\"`", "Context caching with a low ttl", "A separate session per classification"],
      answer: 1,
      why: "It sends no history at all, which is cheaper than any amount of compaction and also improves the classifier — a model that cannot see the user arguing three turns ago is harder to talk out of its category. Its input arrives through state, interpolated into the instruction." },
    { stem: "After enabling compaction, the agent starts losing booking reference numbers mentioned early in long conversations. What is the fix?",
      options: ["Increase compaction_interval", "Write the reference to state when it is established", "Disable compaction", "Increase the model's context window"],
      answer: 1,
      why: "Summarisation is lossy by design and a model chose what to drop. State is never compacted, so a fact written to state is exact on turn fifty and is restated in the instruction on every request. Raising the interval only delays the loss; the durable answer is to stop relying on the transcript to carry identifiers." }
  ] },

  interview: { title: "Interview", sub: "Context window questions", questions: [
    { level: "Core", q: "Why does turn fifty cost more than turn one?",
      strong: "Because the whole transcript is resent every turn — the model is stateless and the runner rebuilds the conversation each time.",
      answer: [{ t: "p", text: "Each request carries the entire history as contents, so input tokens grow with the turn number and the cost of a conversation grows quadratically with its length. I measured it on a plain chat: 1, 3, 5, 7, 9 contents over five turns, doubling that rate once tools are involved. This is also where quality starts to slip, because a model attends less reliably to any one fact in a very long prompt — which is why 'it forgot' in a long conversation is usually dilution rather than truncation." }] },
    { level: "Core", q: "What does compaction actually do to the session?",
      strong: "It replaces windows of old events with model-written summaries, stored as events so the log still explains itself.",
      answer: [{ t: "p", text: "Configured on the App, it periodically takes a window of events, asks the model to summarise them, and stores that summary as an event carrying the timestamp range it covers. Subsequent requests carry the summary instead of the raw events, which is why the measured request sizes turn from a rising line into a sawtooth. The original events are still in the session — compaction changes what is sent, not what is stored — so you can still audit what really happened. What you lose is detail in the prompt, chosen by a model, which is why identifiers and decisions belong in state rather than in prose the summariser may drop." }] },
    { level: "Senior", q: "A support agent's conversations run to a hundred turns and the bill is unacceptable. Walk me through your fixes.",
      strong: "In order: stop sending history where it is not needed, break the session at subject boundaries, cache the prefix, and only then compact.",
      answer: [{ t: "p", text: "First I would look for agents in the system that do not need history at all — classifiers, extractors, guardrail checks — and set `include_contents=\"none\"` on them. That is free, it often removes a surprising share of the tokens, and it usually improves those agents' accuracy. Second, I would question the hundred-turn session itself: if the subject changed four times, that is four conversations sharing a transcript, and starting a new session at a natural boundary while carrying durable facts in `user:` state is cheaper than any compression scheme. Third, context caching, because a support agent has a large stable system instruction and tool set and those bytes are identical on every call; the thirty-minute default TTL suits an active conversation. Only then compaction, configured generously — a token threshold rather than an event count, a healthy `event_retention_size` so the recent turns stay verbatim, and the important identifiers written to state so that nothing critical depends on the summariser's judgement. And I would measure after each step rather than turning everything on at once, because caching and aggressive compaction actively fight each other." }] }
  ] }
});
