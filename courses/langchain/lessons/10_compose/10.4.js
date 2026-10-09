EC.receiveLesson({
  id: "10.4",
  lede: "A node given `retry_policy=RetryPolicy(max_attempts=3)` raised a `RuntimeError` and **did not retry** \u2014 the body ran once. Reading `default_retry_on` explains it: the default is a **deny-list** of deterministic programming errors, and `RuntimeError` is on it. Two edges of that list matter more than the rest. **`TimeoutError` is not retried**, because in Python 3 it subclasses `OSError` which is denied \u2014 so the canonical transient failure is excluded by default. And **`AttributeError` is retried**, because it is not on the list \u2014 so the canonical programming error gets three attempts with backoff. The default is sensible in shape and wrong at both edges that matter.",
  objectives: [
    "Attach a retry policy and find out whether it fires",
    "Read what the default retry_on actually permits",
    "Explain why TimeoutError is excluded and AttributeError is not",
    "Say what a retry policy does and does not do",
    "Place a timeout, and compute the per-node worst case"
  ],
  prerequisites: ["8.9"],
  blocks: [
    { t: "h2", n: "01", id: "doesnot", text: "The default does not retry", sub: "Which is worth finding out first" },

    {"kind": "matrix", "title": "Why max_attempts=3 ran the body once", "caption": "A node with `RetryPolicy(max_attempts=3)` raised a `RuntimeError` and **did not retry**. `default_retry_on` is a **deny list** of deterministic programming errors — so the names mislead in both directions, and the predicate is worth writing rather than taking.", "cols": ["retried by default?", "should it be?"], "rows": ["ConnectionError", "TimeoutError", "RuntimeError", "AttributeError", "ValueError"], "cells": [[{"text": "yes", "tone": "good"}, {"text": "yes", "tone": "good"}], [{"text": "NO — it is an OSError", "tone": "crit"}, {"text": "yes — very", "tone": "crit"}], [{"text": "no", "tone": "warn"}, {"text": "depends", "tone": "warn"}], [{"text": "YES", "tone": "crit"}, {"text": "no — it is a typo", "tone": "crit"}], [{"text": "no", "tone": "good"}, {"text": "no", "tone": "good"}]], "t": "diagram", "id": "dg-10_4-01-0"},




    { t: "code", lang: "python", title: "A node that fails twice then succeeds",
      code: 'g.add_node("flaky", flaky, retry_policy=RetryPolicy(max_attempts=3,\n                                                    initial_interval=0.01))',
      out: "  the node raises RuntimeError twice, then succeeds:\n    RAISED RuntimeError: transient failure 1\n    the node body ran 1 time(s)",
      caption: "It did not retry." },
    { t: "p", text: "Nothing about the configuration suggests it would be ignored \u2014 `max_attempts=3` is present and the policy is attached to the right node. So this is the first thing to verify rather than assume." },
    { t: "h2", n: "02", id: "default", text: "What the default actually retries", sub: "Read the source" },
    { t: "code", lang: "python", title: "default_retry_on",
      code: 'def default_retry_on(exc):\n    if isinstance(exc, ConnectionError):          return True\n    if isinstance(exc, httpx.HTTPStatusError):\n        return 500 <= exc.response.status_code < 600\n    if isinstance(exc, requests.HTTPError):\n        return 500 <= ... < 600 if exc.response else True\n    if isinstance(exc, (ValueError, TypeError, ArithmeticError,\n                        ImportError, LookupError, NameError,\n                        SyntaxError, RuntimeError, ReferenceError,\n                        StopIteration, StopAsyncIteration, OSError)):\n        return False\n    return True',
      caption: "A **deny-list** of deterministic errors, with everything else retried." },
    { t: "code", lang: "text", title: "Measured",
      code: "exception                retried?  why\nConnectionError          True      the one explicit yes\nConnectionResetError     True      a ConnectionError subclass\nMyApiError               True      falls through to the default True\nAttributeError           True      not in the deny-list\nTimeoutError             False     <- a subclass of OSError\nOSError                  False     in the deny-list\nRuntimeError             False     in the deny-list\nValueError               False     in the deny-list\nMyValueError             False     inherits ValueError's deny\nKeyError                 False     a LookupError",
      caption: "A 4xx HTTP error is not retried and a 5xx is, which is correct." },
    { t: "h2", n: "03", id: "edges", text: "The two edges that matter", sub: "And they point opposite ways" },
    { t: "callout", kind: "trap", title: "TimeoutError is not retried", body: [
      { t: "p", text: "In Python 3 `TimeoutError` is a subclass of `OSError`, and `OSError` is in the deny-list. So the single most retryable thing a network call does is excluded by default." },
      { t: "p", text: "That is almost certainly not what you want, and the policy looks configured while silently doing nothing for the case it was most likely added for." }
    ] },
    { t: "callout", kind: "trap", title: "AttributeError is retried", body: [
      { t: "p", text: "It is not on the list, so it falls through to the default `True`. Calling a method that does not exist \u2014 the canonical deterministic programming error \u2014 gets three attempts with exponential backoff before surfacing." },
      { t: "p", text: "Which costs latency for no possible benefit and buries the real error behind a retry-exhaustion message. The same applies to any custom exception your client library raises: it falls through to `True` whether or not it is transient." }
    ] },
    { t: "code", lang: "python", title: "So be explicit",
      code: 'RetryPolicy(max_attempts=3,\n            retry_on=(ConnectionError, TimeoutError, MyApiError))',
      out: "  the same node with retry_on=(RuntimeError,):\n    -> {'trace': ['succeeded on attempt 3']}\n    the node body ran 3 time(s)",
      caption: "Passing a tuple replaces the predicate entirely." },
    { t: "p", text: "Which is usually what you want: the set of retryable errors for **your** dependencies is knowable and short, and writing it down makes the decision reviewable instead of inherited." },
    { t: "h2", n: "04", id: "postpones", text: "A retry postpones a failure", sub: "It does not swallow one" },
    { t: "code", lang: "text", title: "A node that always fails",
      code: "RAISED RuntimeError: permanent\n  ran 3 times, then the exception propagated",
      caption: "After the attempts are exhausted, the graph raises." },
    { t: "p", text: "So a retry policy is **not an error-handling strategy on its own**. Something still has to decide what exhaustion means \u2014 route to a fallback, hand the failure to the model to react to (9.2's `ToolNode` does this), or fail the request. The policy only buys you another chance at the same thing." },
    { t: "h2", n: "05", id: "reexec", text: "The retried node re-runs from the top", sub: "The third time this rule appears" },
    { t: "code", lang: "text", title: "A node that records a side effect, then fails once",
      code: "-> {'trace': ['done']}\n  side effects recorded: 2",
      caption: "The side effect happened twice for one logical execution." },
    { t: "callout", kind: "mental", title: "Interrupts, forks and retries all replay the node", body: [
      { t: "p", text: "9.7 measured it for `interrupt()`, 9.9 for forking, and here for retries. In all three the node body re-executes from its first statement, so everything before the failure or pause point happens again." },
      { t: "p", text: "Which makes retryable nodes want to be **idempotent**, and the cleanest way is a node that is a single call with no preamble. That is the same architecture 9.7 and 9.9 both argued for from their own direction \u2014 three different features pointing at one design rule." }
    ] },
    { t: "h2", n: "06", id: "timeout", text: "Timeouts are not a node setting", sub: "And the worst case is a product" },
    { t: "p", text: "There is no `timeout=` on `add_node`. The options are the client's own timeout inside the node, a wrapper around the node body, or the caller's timeout around `invoke()`." },
    { t: "callout", kind: "warn", title: "The caller's timeout is the weakest", body: [
      { t: "p", text: "It abandons the result without stopping the work, so an abandoned run keeps consuming the provider quota it was spending. The timeout belongs as close to the call as possible \u2014 configured on the HTTP client or SDK you pass to the model or the tool." },
      { t: "p", text: "And note the interaction with retries: a 30-second client timeout with `max_attempts=3` is a **90-second** worst case before the node fails, plus backoff. The per-node bound is the product, not the timeout \u2014 which is easy to miss when the two are configured in different places by different people." }
    ] },
    { t: "exercise", kind: "build", title: "Find out what a retry policy retries",
      difficulty: "core", minutes: 30,
      body: "Attach a RetryPolicy to a node that fails twice then succeeds, and report whether it retried. Then determine what the default retry_on permits by probing a range of exception types, and explain the two surprising cases. Replace the predicate with an explicit tuple and confirm the retry fires. Show that an exhausted policy still raises. Demonstrate that a retried node re-runs from the top. Finally say where a timeout belongs and compute the per-node worst case.",
      requirements: ["Attach a retry policy and report whether it fired",
        "Probe the default retry_on across at least six exception types",
        "Explain why TimeoutError is excluded",
        "Explain why AttributeError and custom exceptions are included",
        "Replace the predicate with an explicit tuple and confirm the retry",
        "Show that an exhausted policy still propagates the exception",
        "Demonstrate that a retried node re-runs from the top",
        "Say where a timeout belongs and compute the per-node worst case"],
      hint: "Before anything else, check whether the retry actually fires. The default's deny-list is not what you would guess.",
      solution: { lang: "python", title: "x1004.py \u2014 RuntimeError is not retried by default",
        code: 'from langgraph.types import RetryPolicy\n\n# the default does NOT retry RuntimeError\ng.add_node("flaky", flaky, retry_policy=RetryPolicy(max_attempts=3))\n\n# probe what it does permit\nfn = RetryPolicy().retry_on\nfor t in (ConnectionError, AttributeError, TimeoutError, OSError,\n          RuntimeError, ValueError, KeyError):\n    print(t.__name__, fn(t("x")))\n\n# so be explicit\nRetryPolicy(max_attempts=3,\n            retry_on=(ConnectionError, TimeoutError, MyApiError))',
        out: "==============================================================================\nPART 1 -- a retry policy is per node -- and the default does not retry\n==============================================================================\n  add_node('flaky', fn, retry_policy=RetryPolicy(max_attempts=3))\n  the node raises RuntimeError twice, then succeeds:\n    RAISED RuntimeError: transient failure 1\n    the node body ran 1 time(s)\n\n  it did NOT retry. which is the thing to find out before relying\n  on a retry policy, because nothing about the configuration\n  suggests it would be ignored.\n==============================================================================\nPART 2 -- what the default actually retries\n==============================================================================\n  RetryPolicy's default retry_on is a function, and reading it\n  explains everything:\n\n    def default_retry_on(exc):\n        if isinstance(exc, ConnectionError):          return True\n        if isinstance(exc, httpx.HTTPStatusError):\n            return 500 <= exc.response.status_code < 600\n        if isinstance(exc, requests.HTTPError):\n            return 500 <= ... < 600 if exc.response else True\n        if isinstance(exc, (ValueError, TypeError, ArithmeticError,\n                            ImportError, LookupError, NameError,\n                            SyntaxError, RuntimeError,\n                            ReferenceError, StopIteration,\n                            StopAsyncIteration, OSError)):\n            return False\n        return True\n\n  so it is a DENY-LIST of deterministic programming errors, with\n  everything else retried. measured:\n\n  exception                retried?  why\n  ConnectionError          True      the one explicit yes\n  ConnectionResetError     True      a ConnectionError subclass\n  MyApiError               True      falls through to the default True\n  AttributeError           True      not in the deny-list\n  TimeoutError             False     <- a subclass of OSError\n  OSError                  False     in the deny-list\n  RuntimeError             False     in the deny-list\n  ValueError               False     in the deny-list\n  MyValueError             False     inherits ValueError's deny\n  KeyError                 False     a LookupError\n\n  two of those deserve attention.\n==============================================================================\nPART 3 -- TimeoutError is not retried, and AttributeError is\n==============================================================================\n  TIMEOUTERROR. in Python 3, TimeoutError is a subclass of OSError,\n  and OSError is in the deny-list. so the canonical transient\n  failure is excluded by default.\n\n  that is almost certainly not what you want. a timeout is the\n  single most retryable thing a network call does, and a policy\n  that looks configured will silently not retry it.\n\n  ATTRIBUTEERROR is retried, because it is not in the list. so the\n  canonical programming error -- calling a method that does not\n  exist -- is retried three times with backoff before surfacing.\n\n  so the default is sensible in shape and wrong at both edges for\n  the cases that matter most. the fix is to be explicit:\n\n    RetryPolicy(max_attempts=3,\n                retry_on=(ConnectionError, TimeoutError, MyApiError))\n\n  passing a tuple replaces the predicate entirely, which is\n  usually what you want -- the set of retryable errors for YOUR\n  dependencies is knowable and short.\n\n  the same node with retry_on=(RuntimeError,):\n    -> {'trace': ['succeeded on attempt 3']}\n    the node body ran 3 time(s)\n==============================================================================\nPART 4 -- a retry postpones a failure, it does not swallow one\n==============================================================================\n  a node that always fails, max_attempts=3:\n    RAISED RuntimeError: permanent\n    ran 3 times, then the exception propagated\n\n  so a retry policy is not an error-handling strategy on its own.\n  after the attempts are exhausted the graph raises, and something\n  still has to decide what that means -- route to a fallback, give\n  the model the failure to react to, or fail the request.\n==============================================================================\nPART 5 -- the retried node re-runs from the top\n==============================================================================\n  same rule as 9.7's interrupt and 9.9's fork:\n\n  a node that records a side effect, then fails once:\n    -> {'trace': ['done']}\n    side effects recorded: 2\n\n  so retries and side effects have the same relationship as\n  interrupts and side effects: everything before the failure point\n  happens again. a node that writes a row and then calls a flaky\n  API writes the row once per attempt.\n\n  which makes retryable nodes want to be IDEMPOTENT, and the\n  cleanest way is a node that is a single call with no preamble.\n  that is the same architecture 9.7 and 9.9 both argued for.\n==============================================================================\nPART 6 -- timeouts are NOT a node-level setting\n==============================================================================\n  there is no timeout= on add_node. the options are:\n\n    1. the client's own timeout -- the HTTP client or SDK call\n       inside the node. this is the one that actually bounds a\n       model call, and it is where a timeout belongs.\n    2. a wrapper around the node body (asyncio.wait_for)\n    3. the caller's timeout around invoke()\n\n  option 3 is the one people reach for and the weakest: it abandons\n  the result without stopping the work, so an abandoned run keeps\n  consuming the provider quota it was spending.\n\n  and note the interaction with retries: a 30-second client timeout\n  with max_attempts=3 is a 90-second worst case before the node\n  fails, plus backoff. the per-node bound is the product, not the\n  timeout -- which is easy to miss when the two are configured in\n  different places by different people.",
        notes: [
          { t: "p", text: "**A `RetryPolicy(max_attempts=3)` did not retry a `RuntimeError`** \u2014 the body ran once, with nothing in the configuration suggesting it would be ignored." },
          { t: "p", text: "**The default is a deny-list of deterministic programming errors**, with `ConnectionError` and 5xx HTTP errors explicitly allowed and everything else falling through to `True`." },
          { t: "p", text: "**`TimeoutError` is NOT retried**, because in Python 3 it subclasses `OSError`, which is on the deny-list \u2014 so the canonical transient failure is excluded." },
          { t: "p", text: "**`AttributeError` IS retried**, because it is not on the list \u2014 so the canonical programming error gets three attempts with backoff, burying the real error." },
          { t: "p", text: "**A custom exception also falls through to `True`**, whether or not it is transient." },
          { t: "p", text: "**So pass an explicit tuple** \u2014 the set of retryable errors for your dependencies is knowable and short, and writing it down makes the decision reviewable." },
          { t: "p", text: "**A retry postpones a failure rather than swallowing one**: after three attempts the exception propagated, so something still has to decide what exhaustion means." },
          { t: "p", text: "**A retried node re-runs from the top** \u2014 the side effect was recorded twice. Same rule as 9.7's interrupt and 9.9's fork, so retryable nodes want to be idempotent." },
          { t: "p", text: "**Timeouts are not a node setting.** The client's own timeout is the right place, and a 30-second timeout with max_attempts=3 is a 90-second per-node worst case plus backoff." }
        ] } },
    { t: "callout", kind: "scenario", title: "Scenario: the retry policy that never fired", body: [
      { t: "p", text: "A team adds `RetryPolicy(max_attempts=3)` to every node that calls an external API, after a week of intermittent failures. The failures continue at exactly the same rate. The policy is attached correctly to the right nodes." },
      { t: "p", text: "Their client raises `TimeoutError` on a slow response, and `TimeoutError` subclasses `OSError`, which is on the default deny-list. So the policy is present, correct-looking, and declines to retry the only error it was added for \u2014 with no indication anywhere that a retry was considered and rejected." },
      { t: "p", text: "The fix is one argument: `retry_on=(ConnectionError, TimeoutError)` plus whatever their client library raises. The habit worth forming is to pass `retry_on` explicitly always, because the default's shape \u2014 deny the deterministic, allow the rest \u2014 is reasonable in general and wrong at precisely the two edges that matter: timeouts excluded, programming errors included." }
    ] }
  ],
  takeaways: [
    "**A `RetryPolicy(max_attempts=3)` did not retry a `RuntimeError`** \u2014 the body ran once.",
    "**The default is a deny-list of deterministic programming errors**, with everything else retried.",
    "**`ConnectionError` and 5xx HTTP errors are explicitly allowed; 4xx is not**, which is correct.",
    "**`TimeoutError` is NOT retried** \u2014 it subclasses `OSError`, which is denied.",
    "**So the canonical transient failure is excluded by default.**",
    "**`AttributeError` IS retried**, as is any custom exception \u2014 falling through to `True`.",
    "**So the canonical programming error gets three attempts with backoff.**",
    "**Pass `retry_on` explicitly** \u2014 your dependencies' retryable errors are knowable and short.",
    "**A retry postpones a failure, it does not swallow one** \u2014 exhaustion still raises.",
    "**So a retry policy is not an error-handling strategy on its own.**",
    "**A retried node re-runs from the top** \u2014 the side effect happened twice.",
    "**Interrupts, forks and retries all replay the node**, so retryable nodes want to be idempotent.",
    "**Timeouts are not a node setting** \u2014 the client's own timeout is the right place.",
    "**The caller's timeout abandons the result without stopping the work.**",
    "**The per-node worst case is the product**: 30 s \u00d7 3 attempts, plus backoff."
  ],
  quiz: { title: "Check yourself", questions: [
    { stem: "A node with RetryPolicy(max_attempts=3) raises TimeoutError and does not retry. Why?",
      options: ["Timeouts are handled by a separate timeout policy",
        "TimeoutError subclasses OSError, which is on the default deny-list",
        "max_attempts counts only successful attempts",
        "The initial_interval had not elapsed"],
      answer: 1,
      why: "The default predicate denies a list of deterministic error types including OSError, and in Python 3 TimeoutError inherits from it. So the policy looks configured and declines to retry the single most retryable failure a network call produces, with nothing indicating that a retry was considered and rejected. An explicit retry_on tuple is the fix." },
    { stem: "Which exception does the default policy retry that it probably should not?",
      options: ["ConnectionError",
        "AttributeError \u2014 it is not on the deny-list, so it falls through to True",
        "ValueError",
        "KeyError"],
      answer: 1,
      why: "Calling a method that does not exist is deterministic, so retrying costs three attempts with exponential backoff for no possible benefit and buries the real error behind a retry-exhaustion message. The same applies to any custom exception a client library defines: it falls through to True regardless of whether it is transient." },
    { stem: "What does an exhausted retry policy do?",
      options: ["Returns an empty update so the graph continues",
        "Propagates the exception \u2014 a retry postpones a failure rather than swallowing it",
        "Routes to END",
        "Retries indefinitely with a longer backoff"],
      answer: 1,
      why: "After the attempts are used the graph raises, so something else must decide what that means: a fallback route, handing the failure to the model as a message, or failing the request. A retry policy buys additional chances at the same operation and makes no decision about what to do when none of them work." },
    { stem: "A node's client has a 30-second timeout and the node has max_attempts=3. What is the per-node worst case?",
      options: ["30 seconds, since the timeout bounds the node",
        "About 90 seconds plus backoff \u2014 the bound is the product, not the timeout",
        "10 seconds, since the timeout is divided across attempts",
        "Unbounded, since there is no node-level timeout"],
      answer: 1,
      why: "Each attempt gets the full client timeout, so three attempts is three times the wait, plus the backoff intervals between them. The two settings are usually configured in different places \u2014 the client in one module, the retry policy at the graph \u2014 which makes the multiplication easy to overlook when reasoning about a latency budget." }
  ] },
  interview: { title: "Interview practice", sub: "Retries and timeouts", questions: [
    { level: "core", q: "How would you configure retries on a graph node?",
      strong: "A strong answer passes retry_on explicitly and says why.",
      answer: [
        { t: "p", text: "With an explicit retry_on tuple, always \u2014 because the default is wrong at the two edges that matter most." },
        { t: "p", text: "I found this by attaching a policy with max_attempts=3 to a node raising RuntimeError and watching it not retry at all. Reading the default predicate explained it: it is a deny-list of deterministic error types, with everything else retried." },
        { t: "p", text: "The shape of that is reasonable. The problem is the edges. TimeoutError subclasses OSError, which is denied \u2014 so the canonical transient failure is excluded by default. And AttributeError is not on the list, so the canonical programming error gets three attempts with exponential backoff before surfacing." },
        { t: "p", text: "So I would name the errors my dependencies actually raise, which is a short and knowable list. That also makes the decision reviewable rather than inherited \u2014 someone reading the node can see which failures are considered transient here." }
      ] },
    { level: "advanced", q: "What else does a retry policy need alongside it?",
      strong: "A strong answer names idempotency, exhaustion handling and timeouts.",
      answer: [
        { t: "p", text: "Three things, and none of them is part of the policy." },
        { t: "p", text: "Idempotency, because a retried node re-runs from the top. I measured a node that recorded a side effect then failed once, and the side effect was recorded twice. That is the same replay rule as resuming from an interrupt and as forking from a checkpoint \u2014 three features pointing at one design rule, which is to keep a retryable node down to a single call with no preamble." },
        { t: "p", text: "A decision about exhaustion, because a retry postpones a failure rather than swallowing it. After the attempts are used the exception propagates, so something has to route to a fallback, hand the failure to the model to react to, or fail the request. A policy on its own is not an error-handling strategy." },
        { t: "p", text: "And a timeout, which is not a node setting at all. There is no timeout argument on add_node, and the caller's timeout around invoke is the weakest option \u2014 it abandons the result without stopping the work, so an abandoned run keeps spending the provider quota." },
        { t: "p", text: "So the timeout belongs on the client inside the node. And it interacts with the retry count: a 30-second client timeout with three attempts is a 90-second per-node worst case plus backoff. Those two numbers usually live in different files, which makes the multiplication easy to miss when someone is reasoning about a latency budget." }
      ] },
    { level: "core", q: "Where would you put retries in a RAG or agent pipeline?",
      strong: "A strong answer puts them at the external calls and nowhere else.",
      answer: [
        { t: "p", text: "On the nodes that make external calls, and nowhere else \u2014 because a retry on a deterministic node is three times the latency for the same outcome." },
        { t: "p", text: "So: the model call, the retrieval call if the vector store is over a network, and each tool that talks to something. Not the formatting node, not the router, not the reducer-heavy gather node." },
        { t: "p", text: "With retry_on named explicitly every time. The default denies a list of deterministic errors and allows the rest, which sounds right and is wrong at both edges: TimeoutError is excluded because it subclasses OSError, and AttributeError is included because it is not on the list. So the canonical transient failure is skipped and the canonical programming error gets three attempts with backoff." },
        { t: "p", text: "I would also check the arithmetic of the per-node bound, because the timeout lives on the client and the attempt count lives on the graph. A 30-second client timeout with three attempts is ninety seconds plus backoff for one node, and those two numbers are usually set in different files by different people." },
        { t: "p", text: "And since a retried node re-runs from the top, each retryable node wants to be a single call with no preamble \u2014 which is the same shape interrupts and forks both argued for." }
      ] }
  ] }
});
