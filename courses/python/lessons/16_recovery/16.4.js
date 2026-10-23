/* ============================================================================
   LESSON 16.4 — Recovery for Agentic Systems, Stage by Stage
   ========================================================================= */
EC.receiveLesson({
  id: "16.4",

  lede: "An agent loop has six stages, and one of them changes the world. **That single fact makes agentic recovery different from everything else in this module: restoring the state is easy, and restoring it without performing the side effects a second time is the whole problem.** A checkpointer puts the graph back at a node. It does not un-send the email, un-charge the card, or un-file the ticket.",

  objectives: [
    "Separate the stages that are safe to replay from the one that is not",
    "Make a side-effecting node idempotent with a key derived from the run, not the attempt",
    "Decide the fate of in-flight runs by kind, before an incident rather than during one",
    "Set an RPO for approval state, which is a system of record rather than a cache",
    "Detect a stuck or looping agent, which fails by continuing rather than by stopping"
  ],

  prerequisites: ["16.1", "15.8"],

  blocks: [

    { t: "h2", n: "01", text: "Six stages, and the one that cannot be replayed", id: "stages" },

    {"kind": "trace", "title": "Five stages replay freely; the sixth changes the world", "caption": "**One row says no, and it makes agentic recovery a different problem from everything else in this module.** Planning, model calls and read-only tools cost tokens and change nothing, so replaying them is a billing question. A side-effecting tool call has already happened in a system you do not control. **And the state write is why it matters: the checkpoint is persisted after the action**, so a crash in between leaves a world that has changed and a state that does not know it.", "left": "stage", "codeW": 190, "vars": ["safe to replay?", "why"], "steps": [{"code": "1 plan", "state": ["YES", "costs tokens, changes nothing"], "tone": "good"}, {"code": "2 model call", "state": ["YES", "idempotent by nature"], "tone": "good"}, {"code": "3 tool call, read-only", "state": ["YES", "costs money and nothing else"], "tone": "good"}, {"code": "4 tool call, side-effecting", "state": ["NO", "it already happened, elsewhere"], "changed": [0, 1], "tone": "crit"}, {"code": "5 state write", "state": ["yes", "but it happens AFTER stage 4"], "changed": [0, 1], "tone": "warn"}, {"code": "6 handoff / completion", "state": ["YES", "control movement only"], "changed": [0, 1], "tone": "good"}], "t": "diagram", "id": "dg-16_4-01-0"},

    { t: "p", text: "The loop runs plan, call, act, write, repeat. **Read the last column: five of the six stages are free to replay, and the sixth makes the entire recovery conversation different.**" },

    { t: "table",
      head: ["Stage", "What happens", "Safe to replay?", "Characteristic failure"],
      rows: [
        ["**1 Plan**", "The model decides what to do next", "**Yes** — costs tokens, changes nothing", "It loops, or plans a step it cannot perform"],
        ["**2 Model call**", "A provider request", "**Yes** — idempotent by nature", "Provider outage, rate limit, timeout"],
        ["**3 Tool call, read-only**", "Retrieve, search, compute", "**Yes** — costs money and nothing else", "A tool returns an error the model treats as data"],
        ["**4 Tool call, side-effecting**", "Email, charge, ticket, write", "**NO**", "**Replay performs it twice, silently**"],
        ["**5 State write**", "The checkpoint is persisted", "Yes — idempotent per step", "It is written *after* stage 4, which is the whole problem"],
        ["**6 Handoff / completion**", "Control moves, or the run ends", "Yes", "A handoff loop, or a run that never terminates"]
      ],
      caption: "**Stage 4 is the only row that says no, and stage 5 is why it matters.** The checkpoint is written after the action, so a crash in between leaves a world that has changed and a state that does not know it — and resumption is then indistinguishable from a first attempt." },

    { t: "code", lang: "python", title: "The window, drawn out",
      code: `# THE ORDERING THAT MAKES RECOVERY DANGEROUS:
#
#   t0   node charge_card starts
#   t1   provider confirms: money has moved          <- the world changed
#   t2   process is killed                            <- nothing recorded
#   --   last checkpoint is from BEFORE t0
#   t3   run resumes from the checkpoint
#   t4   charge_card executes again                   <- charged twice
#
# At t4 nothing is wrong by the graph's own reasoning. The state said the
# node had not run. The node ran. No exception, no warning, no log line
# that looks unusual -- the second charge is a normal, successful charge.

# AND IT IS NOT FIXED BY WRITING THE CHECKPOINT FIRST:
#
#   t0   checkpoint written: "charge_card done"
#   t1   process killed BEFORE the provider call
#   t2   resume: the graph skips charge_card
#   --   the customer was never charged, and the order ships
#
# RECORD-THEN-ACT loses actions. ACT-THEN-RECORD duplicates them. There is
# no ordering of two separate writes that is atomic, which is why the answer
# is not an ordering -- it is making the action itself safe to repeat.`,
      caption: "**Neither ordering is correct, and recognising that is the point.** Record-then-act loses the action; act-then-record repeats it. Two non-atomic writes cannot be made atomic by reordering them, so the fix has to live in the action rather than in the sequence." },

    { t: "h2", n: "02", text: "Stage 4: making the action safe to repeat", id: "idempotency" },

    {"kind": "trace", "title": "Three mechanisms, and the one-character difference that breaks the first", "caption": "**Row two is the most common way idempotency is implemented wrongly, and it passes review because the argument is present and correctly named.** A key generated per attempt is indistinguishable from a genuinely new request, so the provider deduplicates nothing — and the defect only appears when a process dies, which is not a thing tests do. **Row four is the cleanest mechanism where it is available:** a unique reference in the target system means the second attempt fails on a constraint you catch and treat as success, with no extra state of your own.", "left": "mechanism", "codeW": 210, "vars": ["on replay", "needs"], "steps": [{"code": "key = run_id + ':' + node", "state": ["provider returns the SAME result", "provider support"], "tone": "good"}, {"code": "key = str(uuid4())", "state": ["a new request - charged twice", "nothing, and it is wrong"], "changed": [0, 1], "tone": "crit"}, {"code": "ledger row claimed before acting", "state": ["skipped - already recorded", "a table you own"], "changed": [0, 1], "tone": "good"}, {"code": "unique external_ref in the target", "state": ["409, caught as success", "nothing extra"], "changed": [0, 1], "tone": "violet"}, {"code": "no mechanism available", "state": ["duplicated, silently", "dead-letter it instead"], "changed": [0, 1], "tone": "crit"}], "t": "diagram", "id": "dg-16_4-02-1"},

    { t: "p", text: "The mitigation is prevention, and it is the strongest available anywhere in this module: **an action that is safe to perform twice removes the entire failure class**, rather than detecting or recovering from it." },

    { t: "code", lang: "python", title: "Three mechanisms, in order of preference",
      code: `# 1. THE PROVIDER'S OWN IDEMPOTENCY KEY -- best, when it exists.
#    The key must be derived from the RUN, not from the attempt.
def charge(state: State) -> dict:
    key = f"{state['run_id']}:charge"          # stable across every retry
    receipt = payments.charge(amount=state["total"], idempotency_key=key)
    return {"receipt_id": receipt.id}

# A FRESH KEY PER ATTEMPT DEFEATS THE MECHANISM ENTIRELY:
#    key = str(uuid4())            # <- a new key is a NEW request
# This is the single most common way idempotency is implemented wrongly,
# because the code looks correct and the tests pass -- a retry only happens
# in production.

# 2. A LEDGER YOU OWN -- when the provider has no idempotency support.
def send_notice(state: State) -> dict:
    key = f"{state['run_id']}:notice"
    with db.begin():                            # the check and the claim are
        if db.execute(                          # one transaction, so two
            insert(Ledger).values(key=key)      # concurrent resumes cannot
            .on_conflict_do_nothing()           # both win
        ).rowcount == 0:
            return {}                           # already sent before the crash
    email.send(state["address"], render(state))
    return {}

#    NOTE: the ledger row is claimed BEFORE the send, so a crash between them
#    LOSES the email rather than duplicating it. That is the deliberate
#    choice: for a notification, one missing is better than two sent. For a
#    charge, use mechanism 1 and avoid the choice.

# 3. A NATURAL IDEMPOTENCY KEY IN THE TARGET SYSTEM -- the cleanest of all.
#    "Create a ticket with external_ref = <run_id>" where external_ref is
#    unique: the second attempt fails on the constraint, which you catch and
#    treat as success. No extra table, no extra write.
try:
    tickets.create(external_ref=state["run_id"], **payload)
except UniqueViolation:
    pass                                        # already filed; this is fine`,
      caption: "**Deriving the key from the run id is the whole mechanism**, and a fresh key per attempt is the most common way it is broken — the code reads correctly, the tests pass, and the defect only appears on a retry in production. Mechanism 3 is the cleanest where the target system allows it, because it needs no extra state of your own." },

    { t: "callout", kind: "trap", title: "The tool that cannot be made idempotent", body: [
      { t: "p", text: "Some internal APIs offer no idempotency key, no natural unique reference and no way to query whether an action already happened. **A workflow containing such a tool cannot be safely replayed, and no amount of checkpointing changes that.**" },
      { t: "p", text: "**The honest options are three, and \"replay and hope\" is not one of them:** put a ledger in front of it and accept losing an action rather than duplicating it; route interrupted runs of that workflow to a dead-letter queue for a human to resolve; or build the idempotency layer yourself — a table keyed on run and node, written before the call — which does not need the owning team's cooperation." },
      { t: "p", text: "**Write down which workflows are in this category.** During an incident, \"can we replay the queue?\" is a question somebody will answer quickly and from memory, and the answer differs per workflow." }
    ]},

    { t: "h2", n: "03", text: "Stage 5: the checkpointer, and what its RPO really is", id: "checkpointer" },

    {"kind": "trace", "title": "What the checkpointer holds decides its RPO", "caption": "**The worst case sets the number, and it is row four.** A run paused awaiting approval may have been created on Monday and approved on Thursday; losing it loses a request the user believes they made, and there is no source to re-derive it from. **That makes the database a system of record rather than a cache**, however temporary its contents look — so point-in-time recovery in minutes, not a nightly dump. And the ledger belongs in the same instance, or a restore can put the two at different timestamps and reintroduce the duplicate-action bug.", "left": "what it holds", "codeW": 210, "vars": ["reconstructible from", "RPO it needs"], "steps": [{"code": "an in-progress chat turn", "state": ["nothing, and nobody minds", "minutes, losing it is fine"], "tone": "good"}, {"code": "a read-only workflow", "state": ["its input - replay is free", "hours"], "changed": [0, 1], "tone": "good"}, {"code": "a side-effecting workflow", "state": ["its input plus the ledger", "minutes - they must not diverge"], "changed": [0, 1], "tone": "warn"}, {"code": "a run awaiting approval", "state": ["NOTHING - the state is the request", "minutes, point-in-time"], "changed": [0, 1], "tone": "crit"}, {"code": "long-term memory / the store", "state": ["maybe a source, maybe nothing", "treat as a database"], "changed": [0, 1], "tone": "accent"}], "t": "diagram", "id": "dg-16_4-03-2"},

    { t: "p", text: "The checkpointer looks like infrastructure, so it inherits an infrastructure RPO — nightly, perhaps hourly. **For a system with human-in-the-loop approvals that is wrong by an order of magnitude**, because some of what it holds exists nowhere else and may be days old." },

    { t: "table",
      head: ["What the checkpointer holds", "Reconstructible from", "RPO it needs"],
      rows: [
        ["An in-progress chat turn", "Nothing, and nobody cares — the user retried", "Minutes, and losing it is fine"],
        ["A read-only workflow part-way through", "Its input; replay is free", "Hours"],
        ["A side-effecting workflow part-way through", "Its input *plus* the ledger of what was done", "**Minutes** — the two must not diverge"],
        ["**A run paused awaiting human approval**", "**Nothing. The state is the request**", "**Minutes, point-in-time** — this is a system of record"],
        ["Long-term memory / the store", "Possibly a source system, possibly nothing", "Treat as a database until proven otherwise"]
      ],
      caption: "**Row four is what sets the number.** An approval-pending run may have been created on Monday and be approved on Thursday; losing it loses a request the user believes they made, and there is no source to re-derive it from. A system with approvals needs point-in-time recovery on that database, not a nightly dump." },

    { t: "code", lang: "python", title: "Keeping the ledger and the checkpoint in the same recovery point",
      code: `# THE SUBTLE FAILURE: the checkpointer and the side-effect ledger are
# restored to DIFFERENT points in time.
#
#   checkpointer restored to 14:00
#   ledger       restored to 13:45
#   -> the graph resumes a node whose ledger entry was rolled away
#   -> the action is performed a second time
#
# Restoring them inconsistently reintroduces exactly the bug the ledger was
# built to prevent.

# THE FIX IS BORING AND IMPORTANT: put them in the same database, so one
# point-in-time restore covers both.
#
#   checkpoints  ->  postgres://app/agent
#   ledger       ->  postgres://app/agent        <- same instance, same PITR
#
# If they must be separate, the recovery procedure has to restore both to
# the SAME timestamp and verify it:
assert ledger_db.recovery_target == checkpoint_db.recovery_target, (
    "ledger and checkpoints restored to different points -- replay is unsafe")

# AND IF THEY CANNOT BE ALIGNED, bias the ledger EARLIER than the
# checkpointer, never later. An earlier ledger means a few actions look
# un-done and may be repeated; a later one means actions look done that were
# rolled back and will be skipped. Repeating an idempotent action is safe;
# skipping a required one is not.`,
      caption: "**Restoring the checkpointer and the ledger to different timestamps reintroduces the duplicate-action bug the ledger exists to prevent.** The simplest answer is one database so one point-in-time restore covers both; where that is impossible, bias the ledger earlier, because repeating an idempotent action is recoverable and skipping a required one is not." },

    { t: "h2", n: "04", text: "In-flight work: deciding by kind, in advance", id: "in-flight" },

    {"kind": "trace", "title": "Six kinds of in-flight work, decided before the incident", "caption": "**Row four is the one that has to be written down in advance**, because it is a per-workflow fact nobody can recall at three in the morning: which workflows contain a side effect with no idempotency mechanism. A ten-line list turns “can we replay the queue?” from an unanswerable question into a lookup. **And the sweep should report counts** — resumed, dropped, dead-lettered — because a recovery that cannot say how many runs need human attention has stopped rather than finished.", "left": "in-flight work", "codeW": 200, "vars": ["on recovery", "why"], "steps": [{"code": "an interactive chat turn", "state": ["DROP", "the user retried or left"], "tone": "good"}, {"code": "a read-only workflow", "state": ["REPLAY freely", "repetition costs only money"], "changed": [0, 1], "tone": "good"}, {"code": "side-effecting, all nodes keyed", "state": ["REPLAY", "the repeat is a no-op"], "changed": [0, 1], "tone": "good"}, {"code": "side-effecting, one node unkeyed", "state": ["DEAD-LETTER", "a human decides, with the ledger"], "changed": [0, 1], "tone": "crit"}, {"code": "awaiting human approval", "state": ["NEVER drop - resume", "the state is the request"], "changed": [0, 1], "tone": "crit"}, {"code": "a scheduled batch run", "state": ["re-run from its checkpoint", "lateness is the only cost"], "changed": [0, 1], "tone": "accent"}], "t": "diagram", "id": "dg-16_4-04-3"},

    { t: "p", text: "When the system comes back, there is a set of runs that were part-way through. **Somebody is about to decide whether to replay them, under pressure, probably at night.** That decision should already exist, in the runbook, per kind of work." },

    { t: "table",
      head: ["In-flight work", "On recovery", "Why"],
      rows: [
        ["An interactive chat turn", "**Drop it**", "The user retried or left. An answer to an abandoned question costs tokens and confuses whoever sees it"],
        ["A read-only workflow", "**Replay freely**", "No side effects, so repetition costs money and nothing else"],
        ["A side-effecting workflow, all nodes keyed", "**Replay**", "Idempotency makes the repeat a no-op; this is what the keys were for"],
        ["A side-effecting workflow with one unkeyed node", "**Dead-letter it**", "Replay duplicates that action. A human decides, with the ledger in front of them"],
        ["**A run awaiting approval**", "**Never drop. Restore and resume**", "The state is a request somebody made and is reconstructible from nothing"],
        ["A scheduled batch run", "**Re-run from its own checkpoint**", "No user is waiting; lateness is the only cost"]
      ],
      caption: "**The fourth row is the one that needs writing down before the incident**, because it is a per-workflow fact that nobody can recall at 3am. A list of which workflows contain an unkeyed side effect is a ten-line document that turns an unanswerable question into a lookup." },

    { t: "code", lang: "python", title: "A recovery sweep that applies the policy instead of guessing",
      code: `from enum import Enum

class Policy(Enum):
    DROP = "drop"
    REPLAY = "replay"
    DEAD_LETTER = "dead_letter"
    RESUME = "resume"

# THE POLICY IS DATA, declared next to the graph rather than decided live:
POLICY = {
    "chat":            Policy.DROP,
    "policy_lookup":   Policy.REPLAY,       # read-only
    "refund":          Policy.REPLAY,       # every side effect is keyed
    "file_ticket":     Policy.DEAD_LETTER,  # internal API has no idempotency
    "approval":        Policy.RESUME,       # never dropped
}

async def recovery_sweep(checkpointer, cutoff):
    """Run once after recovery, before reopening traffic."""
    for run in await checkpointer.list_interrupted(before=cutoff):
        policy = POLICY[run.workflow]

        if policy is Policy.DROP:
            await checkpointer.abandon(run.thread_id, reason="recovery:dropped")

        elif policy in (Policy.REPLAY, Policy.RESUME):
            await queue.enqueue(run.thread_id)          # resumes from state

        elif policy is Policy.DEAD_LETTER:
            await dlq.put({"thread_id": run.thread_id,
                           "workflow": run.workflow,
                           "last_node": run.last_node,
                           "ledger": await ledger.entries(run.run_id)})
            # a human sees what was already done and decides

    log.info("sweep complete", extra=counts_by_policy)

# AND REPORT THE COUNTS. "We resumed 412, dropped 1,840, dead-lettered 7"
# is the line that makes the recovery auditable -- and the 7 is the number
# somebody must now work through.`,
      caption: "**The policy is data declared beside the graph, so the sweep applies a decision rather than making one.** The counts matter as much as the actions: a recovery that cannot say how many runs it dropped and how many need human attention has not finished, it has stopped." },

    { t: "h2", n: "05", text: "Stages 1 and 6: the failures that look like working", id: "loops" },

    {"kind": "trace", "title": "Four limits, and the one that catches the worst case soonest", "caption": "**An agent can take twenty-four steps, stay under budget, never hand off, and make no progress at all** — retrying the same failing tool call with the same arguments. The step and budget caps are both eventually-correct and expensive: they let it happen two dozen times first. **Hashing the relevant state and comparing between iterations stops it on the second one.** And every halt needs a metric per reason, because a rising stuck count is a tool failing in a way the model cannot interpret, which is a bug report rather than a capacity problem.", "left": "limit", "codeW": 180, "vars": ["catches", "how soon"], "steps": [{"code": "steps >= 25", "state": ["a plan that will not converge", "after 25 steps"], "tone": "warn"}, {"code": "spend >= 2.00 USD", "state": ["runaway cost", "after the money is spent"], "changed": [0, 1], "tone": "warn"}, {"code": "handoffs >= 6", "state": ["two agents ping-ponging", "after 6 hops"], "changed": [0, 1], "tone": "accent"}, {"code": "state hash unchanged", "state": ["alive and not moving", "ON THE SECOND ITERATION"], "changed": [0, 1], "tone": "good"}, {"code": "and a metric per halt reason", "state": ["which tool is uninterpretable", "continuously"], "changed": [0, 1], "tone": "violet"}], "t": "diagram", "id": "dg-16_4-05-4"},

    { t: "p", text: "Planning and handoff do not crash. **They fail by continuing** — a loop that never converges, two agents handing work back and forth, a run that is alive and making no progress. These are the agentic failures with no equivalent in a request-response system, and they need limits rather than retries." },

    { t: "code", lang: "python", title: "Four limits, each catching a different kind of not-finishing",
      code: `from langgraph.graph import StateGraph, END

class State(TypedDict):
    messages: list
    steps: int                    # 1. step count
    spend_usd: float              # 2. budget
    handoffs: int                 # 3. handoff depth
    last_progress_hash: str       # 4. progress

def guard(state: State) -> str:
    if state["steps"] >= 25:
        return "halt_steps"                   # a plan that will not converge
    if state["spend_usd"] >= 2.00:
        return "halt_budget"                  # the limit that bounds cost
    if state["handoffs"] >= 6:
        return "halt_handoffs"                # two agents ping-ponging
    if state_hash(state) == state["last_progress_hash"]:
        return "halt_stuck"                   # alive, and not moving
    return "continue"

builder.add_conditional_edges("agent", guard, {
    "continue": "tools", "halt_steps": END, "halt_budget": END,
    "halt_handoffs": END, "halt_stuck": END,
})

# THE FOURTH IS THE ONE PEOPLE OMIT AND THE ONE THAT CATCHES THE WORST CASE.
# An agent can take 24 steps, stay under budget, never hand off, and make no
# progress at all -- retrying the same failing tool call with the same
# arguments. Step and budget limits eventually stop it; a progress check
# stops it on the second iteration.

# AND HALTING MUST BE OBSERVABLE, not silent:
#   emit a metric per halt reason -- halt_stuck rising is a tool that is
#   failing in a way the model cannot interpret, which is a bug report
#   rather than a capacity problem.`,
      caption: "**The progress check is the limit that is usually missing and catches the worst case:** an agent that stays under every other limit while retrying the same failing call with the same arguments. Step and budget caps stop it eventually; comparing a state hash between iterations stops it on the second one." },

    { t: "table",
      head: ["Stage", "Prevent", "Detect", "Contain", "Recover", "Verify"],
      rows: [
        ["**1 Plan**", "A tool allowlist per agent; a system prompt that bounds scope", "Step-count and progress-hash halts, with a metric per reason", "Hard caps on steps, spend and wall-clock", "Replay freely — planning has no side effects", "The halt-reason distribution matches the baseline"],
        ["**2 Model call**", "Timeouts that free the worker; a budget per run", "Provider error and latency alarms", "**Degrade or queue; fail over only with recorded evals**", "Replay — model calls are idempotent", "Output-format validity rate"],
        ["**3 Tool, read-only**", "Return typed errors the model can act on, not stack traces", "Per-tool error rate and latency", "Circuit-break a failing tool and tell the model it is unavailable", "Replay freely", "Per-tool success rate"],
        ["**4 Tool, side-effecting**", "**Run-scoped idempotency keys, or a ledger, or a natural unique reference**", "Duplicate-action alarms on the target system", "Dead-letter rather than replay when a node is unkeyed", "Replay only where keyed", "Reconcile counts against the target system"],
        ["**5 State write**", "Checkpointer and ledger in one database", "Checkpoint write-failure alarms; approval-queue age", "Refuse to accept new runs if the checkpointer is unavailable", "**Point-in-time, minutes — approvals are a system of record**", "Approval count before and after"],
        ["**6 Handoff**", "A handoff-depth cap; an explicit terminal agent", "Handoff-depth histogram; runs with no terminal state", "Cap depth and end the run with an explanation", "Replay freely", "No run exceeds the depth cap"]
      ],
      caption: "**Stage 4 is the only row whose prevention column is mandatory rather than advisable.** Everything else degrades, retries or replays; an unkeyed side effect simply cannot be recovered from, and the three mechanisms in that cell are the whole of the available answer." },

    { t: "h2", n: "06", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Challenge",
      title: "Make a workflow replayable",
      difficulty: "expert",
      minutes: 38,
      body: [
        { t: "p", text: "A refund workflow runs as a four-node graph. The process was killed during a deploy and 61 runs were interrupted. You have the checkpointer and no ledger. Decide what to do with the 61 runs, then change the workflow so the next incident is a replay rather than an investigation." },
        { t: "code", lang: "python", numbered: false, title: "graph.py — as it stands", code: `
builder.add_node("validate",   validate_claim)      # read-only
builder.add_node("refund",     issue_refund)        # Stripe
builder.add_node("notify",     email_customer)      # SendGrid
builder.add_node("close",      close_ticket)        # internal API

builder.add_edge(START, "validate")
builder.add_edge("validate", "refund")
builder.add_edge("refund", "notify")
builder.add_edge("notify", "close")
builder.add_edge("close", END)

def issue_refund(state):
    r = stripe.Refund.create(charge=state["charge_id"],
                             amount=state["amount"])
    return {"refund_id": r.id}

def email_customer(state):
    sendgrid.send(to=state["email"], template="refund_issued",
                  data={"amount": state["amount"]})
    return {"notified": True}

def close_ticket(state):
    internal.tickets.close(state["ticket_id"], note="refunded")
    return {"closed": True}
` },
        { t: "p", text: "Facts: Stripe supports an idempotency key. SendGrid does not, but duplicate emails are embarrassing rather than harmful. The internal ticket API has no idempotency support and closing an already-closed ticket returns 409. The checkpointer is managed Postgres with point-in-time recovery." }
      ],
      requirements: [
        "A decision for the 61 interrupted runs, given that no ledger exists",
        "A changed `issue_refund` that is safe to replay",
        "A changed `email_customer`, stating which failure you are choosing to accept",
        "A plan for `close_ticket` that does not require the owning team",
        "The recovery policy you would declare for this workflow afterwards"
      ],
      hint: "The 409 from the ticket API is not an obstacle — it is the idempotency signal you were missing, and it is free.",
      solution: {
        lang: "python",
        title: "Solution",
        code: `# ---- THE 61 RUNS --------------------------------------------------------
# With no ledger, the only record of what happened is in the external
# systems. So reconcile rather than replay:
#
#   1. For each interrupted run, read state: which node was last completed?
#   2. For runs interrupted BEFORE "refund": replay freely. Nothing happened.
#   3. For runs interrupted AT or AFTER "refund": query Stripe by charge_id
#      to see whether a refund exists. Stripe is the ledger we did not build.
#   4. For runs where a refund exists: resume from AFTER the refund node.
#   5. For "notify" and "close": a duplicate email is acceptable, and a
#      double close returns 409, so both are safe to repeat.
#
# DO NOT blind-replay all 61: that issues up to 61 duplicate refunds, and
# Stripe will accept every one of them.

# ---- 1. REFUND: the provider's own key, derived from the run ------------
def issue_refund(state):
    r = stripe.Refund.create(
        charge=state["charge_id"],
        amount=state["amount"],
        idempotency_key=f"{state['run_id']}:refund",     # run, not attempt
    )
    return {"refund_id": r.id}
# A replay now returns the SAME refund object instead of creating a second.

# ---- 2. NOTIFY: a ledger, claiming before sending ----------------------
def email_customer(state):
    key = f"{state['run_id']}:notify"
    with db.begin():
        claimed = db.execute(
            insert(Ledger).values(key=key).on_conflict_do_nothing()
        ).rowcount
    if not claimed:
        return {"notified": True}        # already sent before the crash
    sendgrid.send(to=state["email"], template="refund_issued",
                  data={"amount": state["amount"]})
    return {"notified": True}
#
# THE FAILURE I AM CHOOSING: claiming before sending means a crash between
# the two LOSES the email. For a refund notification that is better than
# sending it twice -- the refund itself is already correct, and a missing
# email is a support question rather than a duplicate-payment panic.

# ---- 3. CLOSE: the 409 IS the idempotency signal ------------------------
def close_ticket(state):
    try:
        internal.tickets.close(state["ticket_id"], note="refunded")
    except Conflict:                     # 409: already closed
        pass                             # treat as success -- it IS success
    return {"closed": True}
#
# No cooperation from the owning team required, no extra table. The API
# already tells us the action was unnecessary; we were treating that as an
# error.

# ---- 4. AND PUT THE LEDGER WITH THE CHECKPOINTS -------------------------
# Same Postgres instance, so one point-in-time restore covers both and they
# cannot be restored to different timestamps (section 03).

# ---- 5. THE POLICY -----------------------------------------------------
POLICY["refund"] = Policy.REPLAY
#
# Justified now, and it was not before: every side-effecting node is either
# keyed at the provider (refund), ledgered (notify), or naturally idempotent
# via the 409 (close). That is what "replay" requires -- not optimism.`,
        notes: [
          { t: "p", text: "**The 409 is the point of the exercise.** An API that rejects a repeated action is already idempotent; treating its rejection as an error rather than as confirmation is what made the workflow unreplayable, and the fix is a `try/except` rather than a negotiation with another team." },
          { t: "p", text: "**Stripe being the ledger we did not build** is the other lesson: for the 61 existing runs there is no local record, but the external system has one and can be queried by charge id. Reconciling against the target system is the recovery available when your own ledger does not exist yet — and it is the reason to record external ids in state as the workflow goes." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A deploy restarted the pods running an agentic order-processing workflow. The checkpointer was healthy, so the team resumed the 340 interrupted runs — the documented procedure, and it completed in four minutes." },
      { t: "p", text: "**Eleven of those runs had already charged a card before the restart.** The charge node used `idempotency_key=str(uuid4())`, generated inside the function, so each replay was a new key and therefore a new charge. Eleven customers were charged twice, and the refunds and apologies took three weeks." },
      { t: "p", text: "**The code had an idempotency key and no idempotency.** It passed review, because the argument was present and correctly named; it passed every test, because a retry only happens when a process dies." },
      { t: "p", text: "**Two changes followed:** the key is derived from the run id, and a test kills the process between the provider call and the checkpoint and asserts that a resume produces exactly one charge. The second is what makes the first stay true." }
    ]}
  ],

  takeaways: [
    "**Five of the six stages are free to replay; the sixth changes the world.** Agentic recovery is entirely about that one stage.",
    "**The checkpoint is written after the action**, so a crash between them leaves a changed world and a state that does not know it — and resumption is indistinguishable from a first attempt.",
    "**Neither ordering fixes it.** Record-then-act loses actions, act-then-record duplicates them; two non-atomic writes cannot be reordered into atomicity.",
    "**So the fix lives in the action: make it safe to repeat.** A provider idempotency key, a ledger you own, or a natural unique reference in the target system.",
    "**Derive the key from the run id, never per attempt.** A fresh key is a new request — this is the most common way idempotency is implemented wrongly, and it passes review and tests.",
    "**A 409 from a target system is an idempotency signal, not an error.** Catching it is often the whole fix, and needs nobody else's cooperation.",
    "**Claiming a ledger row before acting loses actions; claiming after duplicates them.** Choose per action: a missing email beats a double email, and a charge should use the provider's key instead.",
    "**Restore the checkpointer and the ledger to the same point in time**, ideally by keeping them in one database — otherwise the restore reintroduces the bug the ledger prevents.",
    "**If they cannot be aligned, bias the ledger earlier.** Repeating an idempotent action is recoverable; skipping a required one is not.",
    "**Approval-pending runs are a system of record, not a cache.** They may be days old, are reconstructible from nothing, and set the RPO for that database at minutes.",
    "**Decide the fate of in-flight work by kind, in advance**, and keep the list of workflows containing an unkeyed side effect — that is the question nobody can answer at 3am.",
    "**A recovery sweep should report counts:** resumed, dropped, dead-lettered. The dead-letter count is work somebody now owns.",
    "**Planning and handoff fail by continuing, not by crashing.** Cap steps, spend and handoff depth — and add a progress check, which catches the agent that stays under every other limit while making no progress.",
    "**Make halting observable.** A rising stuck-halt metric is a tool failing in a way the model cannot interpret, which is a bug report rather than a capacity problem."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A run crashed after its tool charged a card and before the checkpoint was written. Why does writing the checkpoint first not fix this?",
        options: [
          "It does fix it — the graph then knows the node completed",
          "Because a crash between the checkpoint and the call then loses the action entirely: record-then-act drops actions, act-then-record duplicates them, and neither is atomic",
          "Because checkpoints are written asynchronously",
          "Because the provider may be slow to confirm"
        ],
        answer: 1,
        why: "Two separate non-atomic writes cannot be ordered into atomicity — one order loses work and the other repeats it. That is why the mitigation is not an ordering but a property of the action: make it safe to perform twice, and the ordering stops mattering."
      },
      {
        stem: "A charge node passes `idempotency_key=str(uuid4())`. What happens on replay?",
        options: [
          "The provider deduplicates it, because the amount and charge id match",
          "A new key means a new request, so the customer is charged a second time",
          "The call fails because the key was already used",
          "The graph skips the node, since the key is present"
        ],
        answer: 1,
        why: "An idempotency key only deduplicates attempts that share it, so a key generated per attempt is indistinguishable from a genuinely new request. The key must be derived from something stable — the run id plus the node name — and this defect passes review and every test, because retries only happen when a process dies."
      },
      {
        stem: "Your internal ticket API returns 409 when closing an already-closed ticket. What is that?",
        options: [
          "An error to retry with backoff",
          "An error to log and escalate to the owning team",
          "An idempotency signal: catching it and treating it as success makes the node safe to replay, at no cost",
          "A reason to dead-letter the run"
        ],
        answer: 2,
        why: "The API is telling you the action was unnecessary because it already happened, which is exactly what an idempotency check would have told you. Treating the 409 as a failure is what makes the workflow unreplayable; a `try/except` is the whole fix and needs nobody else's cooperation."
      },
      {
        stem: "Which in-flight work must never be dropped during an agentic recovery?",
        options: [
          "Interactive chat turns, because a user is waiting",
          "Read-only workflows, because they are cheap to finish",
          "Runs awaiting human approval, because the state is a request that exists nowhere else and may be days old",
          "Scheduled batch runs, because they have a deadline"
        ],
        answer: 2,
        why: "A chat turn has been retried or abandoned, read-only work replays freely, and a batch job re-runs from its own checkpoint. An approval-pending run holds a request somebody made, is reconstructible from nothing, and is the reason the checkpointer database needs point-in-time recovery rather than a nightly dump."
      },
      {
        stem: "An agent has taken 24 steps, is under budget, has not handed off, and is making no progress. Which limit catches it soonest?",
        options: [
          "The step cap, at 25",
          "The budget cap, once spend accumulates",
          "A progress check comparing a state hash between iterations, which catches it on the second iteration",
          "The handoff-depth cap"
        ],
        answer: 2,
        why: "The step and budget caps are both eventually-correct and expensive: they let the agent retry the same failing call two dozen times first. Hashing the state and comparing it between iterations detects the absence of progress immediately, and a rising stuck-halt metric then points at the tool that is failing uninterpretably."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "expert",
        q: "How do you recover an agentic workflow that was interrupted mid-run?",
        strong: "It depends entirely on whether the completed nodes had side effects, because the checkpointer restores the graph and knows nothing about what a node did to the world — the checkpoint is written after the action, so a crash between them means resumption looks like a first attempt. I would make every side-effecting node safe to repeat: the provider's idempotency key derived from the run id, a ledger where there is no key, or a natural unique reference in the target system. Then declare a recovery policy per workflow — drop chat, replay read-only, replay keyed workflows, dead-letter anything with an unkeyed node, never drop an approval — and have the sweep report counts.",
        answer: [
          { t: "p", text: "The checkpointer-restores-the-graph-not-the-world framing is the whole answer in one sentence, and leading with it is right." },
          { t: "p", text: "Saying that neither ordering of the two writes fixes it shows the problem is understood rather than memorised." },
          { t: "p", text: "A declared per-workflow policy with reported counts is what makes this sound like something operated rather than designed on a whiteboard." }
        ]
      },
      {
        level: "advanced",
        q: "What RPO would you set for a LangGraph checkpointer?",
        strong: "It depends on what the graph holds, and the answer is set by the worst case rather than the average. In-progress chat turns can be lost freely — the user retried. Read-only workflows replay from their input. But a run paused awaiting human approval is a request somebody made, it may be days old, and it is reconstructible from nothing — that makes the database a system of record and the RPO minutes, with point-in-time recovery rather than a nightly dump. I would also keep the side-effect ledger in the same instance so one restore covers both.",
        answer: [
          { t: "p", text: "Answering per content rather than giving a single number is the discriminating move here." },
          { t: "p", text: "Calling the approval state a system of record is the phrase that lands — it reframes the database from cache to primary data." },
          { t: "p", text: "Co-locating the ledger is the detail that shows the inconsistent-restore failure has been thought about." }
        ]
      },
      {
        level: "advanced",
        q: "An agent is alive and not finishing. How do you stop it, and how would you have prevented it?",
        strong: "Cap steps, spend and wall-clock as the backstop, and cap handoff depth for the multi-agent case. But the limit that actually catches this is a progress check — hash the relevant state between iterations and halt when it does not change, because an agent can sit under every other cap while retrying the same failing tool call with identical arguments. Prevention is mostly in the tool layer: return typed, actionable errors rather than stack traces, so the model can change its approach instead of repeating it. And emit a metric per halt reason, because a rising stuck count is a tool bug report.",
        answer: [
          { t: "p", text: "Distinguishing the eventually-correct caps from the immediately-correct progress check is the substance of the answer." },
          { t: "p", text: "Locating the prevention in the tool's error messages is a strong point — it is where the loop is usually caused and rarely looked for." },
          { t: "p", text: "A metric per halt reason turns an incident into a signal, which is the operational detail that distinguishes experience here." }
        ]
      }
    ]
  }
});
