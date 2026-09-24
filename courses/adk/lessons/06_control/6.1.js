/* ============================================================================
   LESSON 6.1 — Callbacks: The Eight Hooks
   The field list, the firing order, the blocked tool and the zero-model-call
   short circuit are all executed output from scratchpad/adk/c1.py on
   google-adk 2.9.2.
   ========================================================================= */
EC.receiveLesson({
  id: "6.1",

  lede: "**Callbacks are where your policy goes.** An agent is a loop you do not control — the model decides, the framework dispatches — and callbacks are the six points at which you get to look at what is about to happen and change your mind. Logging, caching, redaction, guardrails, rate limits, per-user restrictions and the entire class of \"never let it do X\" requirements are all callbacks. This lesson runs an agent with every hook attached and prints the exact order they fire, then uses two of them to block a tool and to answer without calling the model at all.",

  objectives: [
    "Name all eight callback fields and say when each one fires",
    "Predict the firing order for a turn with one tool call",
    "Short-circuit the model or a tool by returning a value from a before hook",
    "Rewrite a result by returning a value from an after hook",
    "Choose between a callback, a plugin and a tool for a given requirement"
  ],

  prerequisites: ["4.3", "5.5"],

  blocks: [

    { t: "h2", n: "01", text: "The eight fields", id: "fields" },

    { t: "code", lang: "python", title: "Straight off the class",
      code: `from google.adk.agents import LlmAgent
for f in LlmAgent.model_fields:
    if "callback" in f:
        print(f)` },

    { t: "out", text: `before_agent_callback
after_agent_callback
before_model_callback
after_model_callback
on_model_error_callback
before_tool_callback
after_tool_callback
on_tool_error_callback` },

    { t: "p", text: "Three pairs and two error hooks. The **agent** pair wraps the whole invocation of that agent. The **model** pair wraps each request to the model. The **tool** pair wraps each tool call. The two `on_*_error` hooks fire when the thing they name raises, and they are the reason lesson 10.3 has anything to work with." },

    { t: "diagram", kind: "layers", title: "Three nested scopes",
      caption: "Nesting tells you where a requirement belongs. \"Log every turn\" is agent-level. \"Cap tokens\" is model-level. \"Never delete production data\" is tool-level.",
      items: [
        { label: "before_agent … after_agent", sub: "once per agent per invocation", tone: "violet" },
        { label: "before_model … after_model", sub: "once per model request — several per turn", tone: "accent" },
        { label: "before_tool … after_tool", sub: "once per tool call", tone: "good" }
      ] },

    { t: "h2", n: "02", text: "The order, measured", id: "order" },

    { t: "p", text: "Every hook below appends its name to a list. One turn, one tool call, a scripted model — the output is the framework's own sequencing, not a diagram drawn from the documentation." },

    { t: "code", lang: "python", title: "c1.py — attach everything, run one turn",
      code: `agent = LlmAgent(
    name="a", model=llm, tools=[weather],
    before_agent_callback=rec("before_agent"),
    after_agent_callback=rec("after_agent"),
    before_model_callback=rec("  before_model"),
    after_model_callback=rec("  after_model"),
    before_tool_callback=rec("    before_tool"),
    after_tool_callback=rec("    after_tool"),
)` },

    { t: "out", text: `firing order for one tool-using turn:
   1  before_agent
   2    before_model
   3    after_model
   4      before_tool
   5          TOOL BODY
   6      after_tool
   7    before_model
   8    after_model
   9  after_agent` },

    { t: "p", text: "Read the repetition: **the model pair fires twice**, because the turn made two requests — one that chose the tool and one that produced the answer. The agent pair fires once. If you put a counter in `before_model` expecting it to count turns, it counts model calls, and the two differ by however many tools the model decided to use." },

    { t: "diagram", kind: "trace", title: "The nine steps, and what each one can see",
      caption: "A before hook sees the input and can replace the output. An after hook sees the output and can replace it. That symmetry is the whole design.",
      left: "hook", codeW: 260,
      vars: ["sees", "can return"],
      steps: [
        { code: "before_agent", state: ["the session, the user message", "content → skip the agent"], tone: "violet" },
        { code: "  before_model", state: ["the assembled LlmRequest", "LlmResponse → skip the model"], tone: "accent" },
        { code: "  after_model", state: ["the LlmResponse", "LlmResponse → replace it"], tone: "accent" },
        { code: "    before_tool", state: ["tool, args, context", "dict → skip the tool"], tone: "good" },
        { code: "    TOOL BODY", state: ["its arguments", "its return value"], changed: [1] },
        { code: "    after_tool", state: ["the tool's result", "dict → replace it"], tone: "good" },
        { code: "  before_model / after_model", state: ["the second request", "same powers again"], note: "fires once per request" },
        { code: "after_agent", state: ["everything the agent produced", "content → replace the answer"], tone: "violet" }
      ] },

    { t: "h2", n: "03", text: "Returning None versus returning a value", id: "returning" },

    {"kind": "flow", "title": "The one rule", "caption": "There is no third mechanism — no raise Skip, no boolean flag. Once you have this, every one of the eight hooks reads the same way.", "cols": 3, "nodes": [{"id": "h", "label": "Your hook runs", "sub": "before_* or after_*", "tone": "accent"}, {"id": "n", "label": "return None", "sub": "the framework carries on", "tone": "good"}, {"id": "v", "label": "return a value", "sub": "yours is used instead", "tone": "warn"}, {"id": "w", "label": "The work", "sub": "model call or tool call"}, {"id": "r", "label": "Result", "sub": "either way, the turn continues", "tone": "violet"}], "edges": [["h", "n"], ["h", "v"], ["n", "w"], ["w", "r"], ["v", "r", "skipped"]], "t": "diagram", "id": "dg-6_1-03-0"},


    { t: "callout", kind: "mental", title: "The one rule that makes callbacks make sense",
      body: [{ t: "p", text: "**Return `None` and the framework carries on. Return a value and the framework uses yours instead of doing the work.** A `before_tool_callback` returning a dict means the tool never runs and your dict is the result. A `before_model_callback` returning an `LlmResponse` means no request is sent and your response is the answer. An after hook returning a value replaces what actually happened. There is no third mechanism — no `raise Skip`, no boolean flag — and once you have this, every hook reads the same way." }] },

    { t: "h2", n: "04", text: "Blocking a tool", id: "blocking" },

    { t: "code", lang: "python", title: "A before_tool_callback that refuses",
      code: `def block(tool, args, tool_context):
    if args.get("city") == "Pyongyang":
        return {"error": "that city is not supported", "retryable": False}
    return None

agent = LlmAgent(name="b", model=llm, tools=[weather2], before_tool_callback=block)` },

    { t: "out", text: `  tool response event: {'error': 'that city is not supported', 'retryable': False}
  model says: Sorry, not supported.
  before_tool saw: ['weather2']` },

    { t: "p", text: "The tool body never printed, which is the proof: it did not run. What the model received was the callback's dict, presented as an ordinary function response — so the model relayed it in its own words, and the refusal reached the user as a sentence rather than as a stack trace. The `retryable: False` key is a convention worth adopting: it tells the model not to try the same call again, which an unadorned error message does not." },

    { t: "callout", kind: "good", title: "Refuse with a reason, in the result",
      body: [{ t: "p", text: "A blocked call that returns `{\"error\": \"…\"}` produces a cooperative agent: it explains, it offers alternatives, it moves on. A blocked call that raises produces an agent that either apologises vaguely or retries the same thing. The callback is the right place for policy precisely because it can express the refusal in the vocabulary the model already understands." }] },

    { t: "h2", n: "05", text: "Answering without the model", id: "short-circuit" },

    { t: "code", lang: "python", title: "before_model_callback returning an LlmResponse",
      code: `def guard(callback_context, llm_request):
    last = llm_request.contents[-1].parts[0].text if llm_request.contents else ""
    if "password" in (last or "").lower():
        return LlmResponse(content=types.Content(role="model",
            parts=[types.Part(text="I cannot help with that.")]))
    return None` },

    { t: "out", text: `  answer: I cannot help with that.
  model calls made: 0` },

    { t: "p", text: "Zero model calls — counted by a subclass that increments on every `generate_content_async`. This is the shape of an input guardrail (lesson 9.2) and of a cache: check, and if you already know the answer, return it. The saving is real, because the request that was never sent was the whole conversation." },

    { t: "callout", kind: "trap", title: "A keyword check is not a guardrail",
      body: [{ t: "p", text: "The example blocks the word 'password', which stops exactly one phrasing and nothing else — any user who writes 'admin credentials' walks straight through, and any user who mentions passwords innocently is refused. It demonstrates the mechanism, not the policy. Real input guardrails classify with a model or a trained classifier and are evaluated like any other component; lesson 9.2 builds one properly. What this example does show correctly is *where* such a check belongs and what it costs: nothing, because it runs before the expensive call." }] },

    { t: "h2", n: "06", text: "Which hook for which job", id: "which" },

    { t: "table", head: ["Requirement", "Hook", "Why there"],
      rows: [
        ["Log every turn with its user and invocation id", "`before_agent` / `after_agent`", "Once per turn, and it can see the whole session"],
        ["Redact card numbers before they reach the model", "`before_model`", "Sees the assembled request, including the history"],
        ["Cap the conversation, cache an answer", "`before_model`", "Can return a response and skip the call entirely"],
        ["Strip a field from a model response", "`after_model`", "Sees what came back; can replace it"],
        ["Refuse a tool call for this user", "`before_tool`", "Sees the tool, the arguments and the user"],
        ["Truncate a tool result before the model reads it", "`after_tool`", "Sees the result; can replace it"],
        ["Retry a flaky upstream", "`on_tool_error`", "Fires only on the failure path"],
        ["Fall back to a cheaper model", "`on_model_error`", "Fires when the request itself fails"]
      ] },

    { t: "callout", kind: "tradeoff", title: "Callback, plugin or tool?",
      body: [{ t: "p", text: "A **callback** is per agent: this agent, this policy. A **plugin** is per app: every agent, one implementation, which is the next lesson. A **tool** is a capability rather than a policy — if the model should be able to choose it, it is a tool; if it must happen whether the model likes it or not, it is a callback. The failure mode worth naming is putting policy in the instruction and hoping: an instruction is a request, a callback is a control." }] },

    { t: "exercise", kind: "practice", title: "Instrument a turn, then intervene", difficulty: "core", minutes: 22,
      prompt: "Attach all six ordinary hooks to a tool-using agent and print the firing order, with the tool body printing too. Confirm you get nine lines for one tool call. Then (a) make before_tool return a dict for one particular argument value and confirm the tool body does not print, and (b) make after_tool wrap every result in {\"data\": …, \"checked_at\": …} and confirm the model sees your version.",
      hints: [
        "Append to a module-level list rather than printing, so the order is readable at the end.",
        "The tool body printing is the only proof that a block really blocked.",
        "after_tool receives the result; returning a new dict replaces it."
      ],
      solution: {
        code: `def after_tool(tool, args, tool_context, tool_response):
    return {"data": tool_response, "checked_at": datetime.now(timezone.utc).isoformat()}`,
        notes: [
          { t: "p", text: "Nine lines: the agent pair once, the model pair twice, the tool pair once around the body. If you see the model pair three times, the model made a second tool call — which is a useful way to notice loops you did not intend." },
          { t: "p", text: "Wrapping in `after_tool` is how you add provenance without touching a single tool, and it is worth doing deliberately rather than reflexively: every key you add is tokens in the next request, on every call, for the whole conversation. Add the timestamp when something downstream reads it, not because it looks tidy." }
        ]
      } }

  ],

  takeaways: [
    "Eight fields: agent, model and tool pairs, plus `on_model_error` and `on_tool_error`.",
    "One tool-using turn fires nine hooks — the model pair runs once per request, not once per turn.",
    "Return `None` to continue; return a value to replace the work entirely.",
    "A blocked tool returning `{\"error\": …, \"retryable\": False}` reaches the user as an explanation.",
    "`before_model` returning an `LlmResponse` answers with zero model calls — the basis of caches and guardrails.",
    "Callbacks are per agent, plugins are per app, and an instruction is a request rather than a control."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "An agent makes two tool calls in one turn. How many times does before_model_callback fire?",
      options: ["Once", "Twice", "Three times", "Four times"],
      answer: 2,
      why: "One request chooses the first tool, one chooses the second, one produces the final answer — three model requests, so three firings. The executed trace shows exactly this pattern with one tool call producing two. Counting turns in `before_model` is therefore a common and quiet bug." },
    { stem: "Your before_tool_callback returns a dict. What happens?",
      options: ["The tool runs and your dict is discarded", "The tool does not run and your dict becomes the result", "The tool runs and its result is merged with your dict", "The framework raises"],
      answer: 1,
      why: "Returning a value from a before hook replaces the work. The executed run proves it: the tool body's print never appeared, and the model received the callback's dict as an ordinary function response, which it then relayed in its own words." },
    { stem: "You want to strip a secret field from a tool's result before the model sees it. Which hook?",
      options: ["before_tool_callback", "after_tool_callback", "after_model_callback", "before_agent_callback"],
      answer: 1,
      why: "`after_tool` receives the result and can return a replacement, which is exactly the seam between the tool running and the model reading it. `before_tool` is too early — the result does not exist yet — and `after_model` is too late, since the model has already seen it." },
    { stem: "Which of these genuinely cannot be enforced with an instruction?",
      options: ["Being polite", "Preferring British spelling", "Never calling the refund tool for accounts under 30 days old", "Keeping answers short"],
      answer: 2,
      why: "The first three are style preferences a model will usually honour and where a lapse is cheap. The fourth is a rule with consequences, and a model can be talked out of a preference by a sufficiently persuasive message. A `before_tool_callback` that checks the account age cannot be argued with, which is the whole reason the hook exists." }
  ] },

  interview: { title: "Interview", sub: "Callback questions", questions: [
    { level: "Core", q: "What are the callback hooks in ADK and what are they for?",
      strong: "Three nested pairs — agent, model, tool — plus two error hooks; they are where policy that must not be optional lives.",
      answer: [{ t: "p", text: "Around the whole invocation, around each model request, and around each tool call, with `on_model_error` and `on_tool_error` on the failure paths. The nesting tells you where a requirement belongs: per-turn logging at the agent level, redaction and caching at the model level, permission checks at the tool level. The single rule is that returning `None` continues and returning a value replaces the work — so a before hook can refuse or answer, and an after hook can rewrite. I reach for them whenever a requirement is not negotiable, because the alternative people try first is putting it in the instruction, and an instruction is a request." }] },
    { level: "Core", q: "How would you add caching to an agent?",
      strong: "A before_model_callback that returns a stored LlmResponse on a hit, and an after_model_callback that stores one on a miss.",
      answer: [{ t: "p", text: "`before_model` sees the fully assembled request, so it can hash whatever part of it identifies the query and look it up; returning an `LlmResponse` means no request is sent at all, which I verified by counting calls into the model and getting zero. `after_model` stores the result. The hard part is not the mechanism but the key: the request contains the whole conversation, so hashing all of it almost never hits. In practice you cache narrowly — a classifier with `include_contents=\"none\"`, a specific extraction step — rather than trying to cache general chat, where a hit would usually be wrong anyway." }] },
    { level: "Senior", q: "A requirement says the agent must never issue a refund over £500 without approval. Where does that live?",
      strong: "In the tool and a before_tool_callback, never in the instruction — and the approval itself is a long-running tool.",
      answer: [{ t: "p", text: "The instruction is the wrong place because it is advisory: a model can be talked out of a preference, and this is a rule with money attached. The check belongs in a `before_tool_callback` on the refund tool, which sees the arguments before anything happens and can refuse with a structured error the model relays to the user. Defence in depth says it also belongs inside the tool itself, because the tool is what a future caller reaches directly. For amounts over the threshold I would not simply refuse — I would route to human approval via a long-running tool or `request_confirmation`, so the legitimate case has a path rather than a wall. And I would log the attempt with the invocation and function-call ids, because 'how often does the agent try this' is a question somebody will ask within a week of launch." }] }
  ] }
});
