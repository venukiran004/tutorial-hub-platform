/* ============================================================================
   LESSON 11.3 — Testing
   The FakeLlm pattern below is the one every executed trace in this course was
   produced with (scratchpad/adk/fake.py), running against google-adk 2.9.2
   with no API key.
   ========================================================================= */
EC.receiveLesson({
  id: "11.3",

  lede: "**Every trace in this course was produced without an API key, and that is not a trick — it is how agents should be tested.** A test that calls a real model is slow, costs money, and fails intermittently for reasons that have nothing to do with your code. Replace the model with one that replays a script and everything around it stays real: the runner, the events, the state deltas, the tool dispatch, the callbacks. You get deterministic tests of the part you actually wrote, which is everything except the model's judgement — and that part belongs in an evaluation suite instead.",

  objectives: [
    "Write a fake model that replays scripted responses",
    "Test tools, callbacks, state and routing deterministically",
    "Assert on events rather than on final text",
    "Divide work between unit tests, evaluation and manual review",
    "Keep tests fast enough that they run on every change"
  ],

  prerequisites: ["11.2", "1.5"],

  blocks: [

    { t: "h2", n: "01", text: "The fake model", id: "fake" },

    { t: "code", lang: "python", title: "fake.py — sixty lines that make agents testable",
      code: `from google.adk.models import BaseLlm
from google.adk.models.llm_response import LlmResponse
from google.genai import types


def text(s: str) -> LlmResponse:
    return LlmResponse(content=types.Content(role="model", parts=[types.Part(text=s)]))


def call(name: str, **args) -> LlmResponse:
    return LlmResponse(content=types.Content(role="model", parts=[
        types.Part(function_call=types.FunctionCall(name=name, args=args))]))


class FakeLlm(BaseLlm):
    """Replays a script. \`seen\` records what the framework actually sent."""

    model: str = "fake-model"
    script: list = []
    seen: list = []

    async def generate_content_async(self, llm_request, stream=False):
        self.seen.append(llm_request)
        i = len(self.seen) - 1
        yield self.script[i] if i < len(self.script) else text("(script exhausted)")

    @staticmethod
    def supported_models() -> list[str]:
        return [r"fake-.*"]`,
      caption: "Subclassing `BaseLlm` means ADK treats it as a model in every respect. Nothing else in the framework is stubbed." },

    { t: "callout", kind: "insight", title: "`seen` is half the value",
      body: [{ t: "p", text: "Recording the requests lets you assert on what the framework *sent*, which is where most interesting behaviour lives: did the instruction interpolate state correctly, was the tool declared, did history grow the way you expected, did `include_contents=\"none\"` really send nothing. Several findings in this course came from reading `seen` rather than the output — including the measurement that a long conversation resends everything." }] },

    { t: "h2", n: "02", text: "What is real and what is not", id: "real" },

    { t: "diagram", kind: "compare", title: "The boundary a fake model draws",
      caption: "Everything in the left column is your code plus the framework, and it is deterministic. The right column is the part evaluation exists for.",
      columns: [
        { title: "Still real — test it here", tone: "good", items: ["Tool dispatch and your tool code", "State deltas and scopes", "Callbacks and plugins", "Events and their ordering", "Transfers and workflow agents", "Artifacts and sessions"] },
        { title: "Faked — evaluate it instead", tone: "warn", items: ["Whether the model picks the right tool", "Whether the answer is good", "Whether it follows the instruction", "Whether a prompt edit helped"] }
      ] },

    { t: "h2", n: "03", text: "A test that is worth having", id: "test" },

    {"kind": "matrix", "title": "Assert on the things with consequences", "caption": "The text is a string you scripted yourself, so asserting on it tests nothing and breaks on rewording. Everything else here stays true when someone improves the phrasing.", "cols": ["Worth asserting", "Why"], "rows": ["Tool called + args", "state delta", "is_final_response()", "The assembled instruction", "The answer's wording"], "cells": [[true, {"text": "what actually happened", "tone": "good"}], [true, {"text": "what persisted", "tone": "good"}], [true, {"text": "what a client renders", "tone": "good"}], [true, {"text": "catches a renamed state key", "tone": "accent"}], [false, {"text": "you wrote the script", "tone": "crit"}]], "t": "diagram", "id": "dg-11_3-03-0"},



    { t: "code", lang: "python", title: "pytest, no network",
      code: `import pytest
from google.genai import types

@pytest.mark.asyncio
async def test_refund_tool_writes_state_and_is_blocked_over_limit():
    llm = FakeLlm(script=[call("refund", order_id="A-77", amount=250.0),
                          text("That needs approval.")])
    agent = LlmAgent(name="support", model=llm, tools=[refund],
                     before_tool_callback=enforce_limit)
    svc = InMemorySessionService()
    runner = Runner(app_name="t", agent=agent, session_service=svc)
    s = await svc.create_session(app_name="t", user_id="u1")

    events = [e async for e in runner.run_async(
        user_id="u1", session_id=s.id,
        new_message=types.Content(role="user", parts=[types.Part(text="refund A-77")]))]

    responses = [p.function_response.response
                 for e in events for p in (e.content.parts if e.content else [])
                 if p.function_response]
    assert responses == [{"error": "refunds over 100 need human approval",
                          "retryable": False}]

    back = await svc.get_session(app_name="t", user_id="u1", session_id=s.id)
    assert "refunded" not in back.state`,
      caption: "Two assertions, both about behaviour that has consequences: the callback refused, and nothing was recorded as refunded. No model was called and the test takes milliseconds." },

    { t: "callout", kind: "good", title: "Assert on events, not on prose",
      body: [{ t: "p", text: "`assert \"approval\" in final_text` is a test of a scripted string you wrote yourself — it proves nothing and it breaks when you reword. Assert on the things with consequences: which tools were called with which arguments, what the state delta was, whether an event was final, whether a confirmation was requested. Those are the facts your system depends on, and they do not change when someone improves the wording." }] },

    { t: "h2", n: "04", text: "What to test", id: "what" },

    { t: "table", head: ["Test", "How"],
      rows: [
        ["A tool's own logic", "Call the function directly — it is a plain function, no agent needed"],
        ["A guardrail blocks", "Script the model to call the forbidden tool; assert the result and that the body did not run"],
        ["State scopes behave", "Run turns across two sessions and one user; assert what persisted (lesson 5.2)"],
        ["A pipeline passes data", "Script each agent's output; assert the later agent's request contains it"],
        ["Routing", "Script a transfer; assert which agent authored the final event"],
        ["Error handling", "A tool that raises; assert the converted result and that the turn completed"],
        ["Approvals", "Assert the confirmation request, then send the approval and assert the tool ran (lesson 9.3)"]
      ] },

    { t: "callout", kind: "trap", title: "The script index is per model call, not per turn",
      body: [{ t: "p", text: "A turn with one tool call consumes two entries: the response that requests the tool and the response that answers. Give a script too few entries and later calls fall off the end — mine returns \"(script exhausted)\", which shows up as an agent saying something nonsensical rather than as a clean failure. When a test behaves strangely, count the model calls first." }] },

    { t: "h2", n: "05", text: "The three layers", id: "layers" },

    { t: "diagram", kind: "layers", title: "What each layer can tell you",
      caption: "The mistake is expecting one layer to do another's job — usually unit tests being asked to prove the agent gives good answers.",
      items: [
        { label: "Unit tests — a fake model", sub: "your code and the framework, deterministic, milliseconds, every commit", tone: "good" },
        { label: "Evaluation — a real model", sub: "does it choose and answer well; stochastic, costs money, on changes (11.2)", tone: "accent" },
        { label: "Manual review", sub: "is this actually any good; slow, irreplaceable, before a release", tone: "violet" }
      ] },

    { t: "callout", kind: "tradeoff", title: "A little integration, sparingly",
      body: [{ t: "p", text: "One or two tests against a real model catch the things a fake cannot: a model that rejects your schema, a provider change, a tool declaration that generates but does not work. Keep them few, keep them out of the fast suite, and accept that they will occasionally fail for reasons you did not cause. What you must not do is write your whole suite that way — a test that is flaky and slow gets skipped, and a skipped test protects nothing." }] },

    { t: "h2", n: "06", text: "Fixtures worth writing once", id: "fixtures" },

    { t: "code", lang: "python", title: "conftest.py",
      code: `@pytest.fixture
def make_runner():
    """Builds a runner over a scripted model, returning the fake for assertions."""
    async def _make(script, tools=(), **agent_kwargs):
        llm = FakeLlm(script=list(script), seen=[])
        agent = LlmAgent(name="test", model=llm, tools=list(tools), **agent_kwargs)
        svc = InMemorySessionService()
        runner = Runner(app_name="t", agent=agent, session_service=svc)
        session = await svc.create_session(app_name="t", user_id="u1")
        return runner, svc, session, llm
    return _make


async def turn(runner, session, text_in):
    """Runs one turn and returns its events."""
    return [e async for e in runner.run_async(
        user_id="u1", session_id=session.id,
        new_message=types.Content(role="user", parts=[types.Part(text=text_in)]))]`,
      caption: "Fresh `script` and `seen` lists per fake: they are class attributes on the model, so a shared default would leak state between tests in a way that is genuinely confusing to debug." },

    { t: "exercise", kind: "practice", title: "Test the thing you would otherwise hope about", difficulty: "advanced", minutes: 30,
      prompt: "Write a test suite for an agent with a guarded tool: (1) a permitted call runs and writes state; (2) a forbidden call is blocked, the body does not run, and the state is unchanged; (3) a raising tool is converted by on_tool_error and the turn still completes; (4) a user-scoped state write is visible in a second session; (5) the instruction actually contains an interpolated state value — assert on `llm.seen[0].config.system_instruction`. Time the suite.",
      hints: [
        "Prove the body did not run with a module-level flag the tool sets.",
        "Test 5 is the one that catches a renamed state key before production does.",
        "The whole suite should finish in well under a second."
      ],
      solution: {
        notes: [
          { t: "p", text: "Test 5 is the one people never write and the one that pays off. Renaming a state key or removing the callback that sets it leaves `{user_tier}` unfilled or raising, and nothing else in your suite notices — the agent just starts behaving generically. Asserting on the assembled system instruction catches it at the point of change." },
          { t: "p", text: "The timing matters as much as the assertions. A suite that finishes in under a second gets run on every save; one that takes two minutes because it calls a real model gets run before a release, which is to say after the mistake has been built on. Speed is what makes a test suite a design tool rather than a gate." }
        ]
      } }

  ],

  takeaways: [
    "A `BaseLlm` subclass replaying scripted responses makes agent tests deterministic and free.",
    "Everything except the model stays real: tools, state, callbacks, events, transfers, artifacts.",
    "Record the requests — asserting on what the framework sent is where most behaviour is visible.",
    "Assert on events, tool calls and state deltas, never on prose you scripted yourself.",
    "One script entry per model call, not per turn — a tool-using turn consumes two.",
    "Three layers: fast unit tests on every commit, evaluation on changes, manual review before release."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "With a fake model, what is still real in the test?",
      options: ["Nothing — it is all mocked", "Everything except the model: tools, state, events, callbacks", "Only the tools", "Only the session service"],
      answer: 1,
      why: "The fake is a `BaseLlm` subclass, so the runner, the event flow, the state deltas, the tool dispatch and the callbacks all execute normally. That is what makes the traces in this course trustworthy — only the model's judgement was replaced, and that is the part evaluation covers." },
    { stem: "Your test scripts one response but the turn makes a tool call. What happens?",
      options: ["The test passes", "The second model call falls off the end of the script", "ADK raises immediately", "The tool is skipped"],
      answer: 1,
      why: "A tool-using turn needs two entries: one response requesting the tool, one answering afterwards. With a short script the later call gets whatever your fake does when it runs out — in this course's version, a placeholder string — which looks like an agent saying something odd rather than a clean failure." },
    { stem: "Which assertion is worth writing?",
      options: ["The final text contains 'approval'", "The function response was {'error': …, 'retryable': False} and state has no 'refunded' key", "The agent replied within two seconds", "The model was called twice"],
      answer: 1,
      why: "The text is a string you scripted yourself, so asserting on it tests nothing and breaks on rewording. Tool results and state changes are the facts the rest of the system depends on, and they stay stable when someone improves the phrasing." },
    { stem: "What should a fake-model test NOT be used to check?",
      options: ["That a guardrail blocks a tool", "That state scopes persist correctly", "That the model chooses the right tool for an ambiguous question", "That errors are converted into results"],
      answer: 2,
      why: "The script decides what the fake model does, so a test of tool choice would be asserting your own script back to you. Whether a real model routes correctly is a stochastic question that belongs in an evaluation set with trajectory metrics." }
  ] },

  interview: { title: "Interview", sub: "Testing questions", questions: [
    { level: "Core", q: "How do you unit test an agent?",
      strong: "Replace the model with a BaseLlm subclass that replays scripted responses; everything else stays real.",
      answer: [{ t: "p", text: "Sixty lines: a subclass whose `generate_content_async` yields the next entry from a list, plus helpers for a text response and a function call. ADK treats it as a model, so the runner, event flow, state deltas, tool dispatch and callbacks all run for real — the tests are deterministic, need no API key, and finish in milliseconds. I also have it record the requests it received, because asserting on what the framework *sent* is where a lot of the interesting behaviour is: whether state interpolated into the instruction, whether a tool was declared, how much history was replayed." }] },
    { level: "Core", q: "What should you assert on?",
      strong: "Events, tool calls with their arguments, and state changes — not the model's text.",
      answer: [{ t: "p", text: "Asserting that the answer contains a particular word is asserting a string you scripted, which proves nothing and breaks the moment anyone rewords it. What has consequences is which tools were called with which arguments, what the state delta was, whether an event was final, whether a confirmation was requested. Those are the facts the rest of the system depends on. The test I would single out as underrated is asserting on the assembled system instruction — it catches a renamed state key or a removed callback at the point of change, and nothing else in a suite notices that the agent quietly stopped being personalised." }] },
    { level: "Senior", q: "How do you divide testing between unit tests, evaluation and manual review?",
      strong: "Unit tests for your code, evaluation for the model's judgement, manual review for whether it is any good — and never ask one to do another's job.",
      answer: [{ t: "p", text: "Unit tests with a fake model cover everything deterministic: tool logic, guardrails blocking, state scopes, error conversion, routing wiring, approvals. They run on every commit because they take under a second, and speed is what makes them useful rather than ceremonial. Evaluation with a real model covers what the fake deliberately removed — whether the model picks the right tool and answers acceptably — and it runs on changes to instructions, tool descriptions or model versions, because those edits have no other safety net. Manual review covers the thing neither measures: whether the agent is actually pleasant and useful to interact with, which no metric I trust captures. I would also keep one or two genuine integration tests against a real provider, outside the fast suite, because a fake cannot catch a schema the provider rejects. The failure I have seen most often is a team writing their whole suite against a live model: it is slow and flaky, so it gets skipped, and then nothing is protecting anything." }] }
  ] }
});
