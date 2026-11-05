EC.receiveLesson({
  id: "8.5",

  lede: "Three recoveries, each executed. **Bisect found the commit that broke accuracy in 3 steps across 16 commits** against up to 16 for a linear search — and because the test is a script, `git bisect run` did it unattended. **The reflog recovered a branch destroyed by `reset --hard`**: the log showed one commit where there had been three, and the two \"lost\" commits were still there, because reset moves a pointer and the objects survive until garbage collection. And a **pre-commit hook refused a 2 MB binary and an `AKIA…` key** while letting ordinary source through — which matters because lesson 4.5's finding applies to git too: once it is committed, deleting it later does not remove it.",

  objectives: [
    "Use bisect with a script to find a regression in logarithmic rather than linear time",
    "Recover commits from the reflog, and say why they were never gone",
    "Choose between revert and reset from whether the history is shared",
    "Write a pre-commit hook that keeps large files and credentials out of history"
  ],

  prerequisites: ["8.4"],

  blocks: [

    { t: "h2", n: "01", id: "bisect", text: "Bisect, with a script",
      sub: "Three steps instead of sixteen" },

    { t: "p", text: "A metric has regressed and nobody knows which change did it. Reading sixteen diffs is slow and the answer is often not visible in a diff at all — lesson 1.1's whole point was that a model can degrade with no code change, and lesson 3.4's that a library version can move a metric silently." },

    { t: "p", text: "Bisect turns it into a binary search over history. The repository here has sixteen commits with the break introduced at change nine, and a test script that exits 0 when accuracy is acceptable." },

    { t: "code", lang: "python", title: "the test, and the search",
      code: `# check.py -- the whole test. Exit 0 = good, non-zero = bad.
import json, sys
acc = json.load(open("metrics.json"))["accuracy"]
sys.exit(0 if acc >= 0.80 else 1)

# and then, unattended:
#   git bisect start
#   git bisect bad HEAD
#   git bisect good <first commit>
#   git bisect run python check.py`,
      out: `== 3. bisect: find the commit that broke accuracy ==
  16 commits in history, the break introduced at change 9
  06a0331b377a8763f35e633af058ea927b7e57d8 is the first bad commit
  bisect steps taken: 3   (log2(16) = 4.0)
  linear search would have taken up to 16 checkouts
  ` },

    { t: "p", text: "**Three steps.** Each one halves the remaining range, so the cost is logarithmic — about log₂(n) checkouts rather than n. On a realistic history the difference is the point: a thousand commits is ten steps, not a thousand." },

    { t: "callout", kind: "insight", title: "`bisect run` is what makes it worth setting up",
      body: [
            { t: "p", text: "Manual bisect means marking each checkout good or bad by hand, which is tedious enough that people read diffs instead. `git bisect run <command>` automates it entirely: git checks out a commit, runs your command, reads its exit code, and continues — so the whole search is one command and three minutes of waiting." },
        { t: "p", text: "The script is the investment. For an ML regression it is usually *train on a fixed small sample and assert the metric exceeds a threshold* — a few lines, and the same shape as lesson 3.2's quality gate. The threshold wants to sit clear of lesson 3.2's measured **0.17 AUC-point noise floor**, or the bisect will follow seed noise and converge on an innocent commit." }
      ] },

    { t: "p", text: "Two mechanics worth knowing. **Exit code 125 means *skip this commit*** — for a revision that cannot be built or tested at all, which is how you avoid marking an untestable commit bad and sending the search the wrong way. And bisect assumes the property is **monotonic**: good before a point, bad after. A flaky test, or a metric that crosses the threshold back and forth, breaks the assumption and the result is meaningless — which is another reason the threshold must clear the noise." },

    { t: "h2", n: "02", id: "reflog", text: "The reflog, and why nothing was lost",
      sub: "reset --hard, then recovery" },

    { t: "p", text: "Lesson 8.4 established that a branch is a pointer. The consequence is that `reset --hard` does not delete commits — it moves the pointer, and the commits become unreachable. Unreachable is not gone." },

    { t: "code", lang: "python", title: "destroy and recover",
      out: `== 4. reflog: recovering a branch destroyed by a hard reset ==
  experiment tip before the mistake: 664ec22
  after \`git reset --hard HEAD~2\`, tip is: 42e5fd9
  log now shows 1 commit(s)
  reflog still holds:
    42e5fd9 reset: moving to HEAD~2
    664ec22 commit: experiment: and the fix that made it work
    fdd0b9e commit: experiment: three days of work
    42e5fd9 checkout: moving from master to experiment
  after \`git reset --hard 664ec22\`: tip is 664ec22, 3 commits` },

    { t: "p", text: "`git log` showed **one commit** where there had been three. The reflog showed all of it, including the reset that caused the problem, and `reset --hard 664ec22` restored the branch exactly." },

    { t: "p", text: "The reflog is a local record of **everywhere HEAD and each branch has pointed**, with the operation that moved it. It is per-repository and never pushed, which is the first thing to know about it: a colleague's reflog cannot help you, and a fresh clone has none." },

    { t: "callout", kind: "good", title: "What the reflog can and cannot recover",
      body: [
        { t: "p", text: "**It can recover anything that was ever committed**: a hard reset, a deleted branch, a bad rebase, an amended commit's original. Unreachable objects survive until `git gc` prunes them, with a default grace period of about **90 days** — so the window is long." },
        { t: "p", text: "**It cannot recover what was never committed.** Lesson 8.4's table identified `reset --hard` as the one everyday command that destroys uncommitted working-tree changes, and there is nothing to recover because git never created an object. That is the argument for committing often on a private branch and tidying later, rather than keeping hours of work unstaged." }
      ] },

    { t: "p", text: "A faster route when the reflog is noisy: `git fsck --lost-found` lists dangling commits directly, which is useful when you know something was committed and cannot find the reflog entry — a detached-HEAD commit, for instance, which leaves no branch behind." },

    { t: "h2", n: "03", id: "revert", text: "revert against reset",
      sub: "Decided by who else has the commits" },

    { t: "p", text: "Both undo a change and they are not interchangeable. The question is the same one lesson 8.4's rebase rule turned on: **does anyone else have this history?**" },

    { t: "p", text: "**`git revert <c>`** creates a **new** commit whose content is the inverse of `<c>`. History grows, nothing is rewritten, and the revert is itself a reviewable change. Safe on a shared branch, always." },

    { t: "p", text: "**`git reset <c>`** moves the branch pointer backwards, so the commits after it become unreachable. History shrinks, and publishing that requires a force push — with every consequence lesson 8.4 measured." },

    { t: "diagram", kind: "matrix", id: "dg-8_5-03-0",
      title: "Four undo operations, and when each is correct",
      caption: "**The second column is the whole decision.** `revert` is the only one of these that is safe on history others have, which is why it is the right answer for `main` even though it leaves the mistake visible.",
      rows: ["revert", "reset --soft", "reset --hard", "rebase -i / amend"],
      cols: ["What it does", "Safe on shared history?"],
      cells: [
        [{ text: "a new inverse commit", tone: "good" }, { text: "yes, always", tone: "good" }],
        [{ text: "moves HEAD, keeps the work staged", tone: "good" }, { text: "no — rewrites", tone: "crit" }],
        [{ text: "moves HEAD, discards the work", tone: "crit" }, { text: "no — and destroys uncommitted changes", tone: "crit" }],
        [{ text: "rewrites commits in place", tone: "warn" }, { text: "no — new hashes, force push", tone: "crit" }]
      ] },

    { t: "p", text: "Two wrinkles that come up in practice. **Reverting a merge commit needs `-m 1`**, because git cannot know which parent you meant to keep — and the result reverts the whole merged branch, which is usually what you want during an incident and rarely what you want afterwards. And **`cherry-pick`** is the complement: taking one commit from elsewhere onto the current branch, which is the mechanism behind a hotfix applied to a release branch and then separately to `main`." },

    { t: "h2", n: "04", id: "hooks", text: "A hook that refuses what must never enter history",
      sub: "Because removing it later does not remove it" },

    { t: "p", text: "Lesson 4.5 measured a credential surviving `RUN rm` in a Docker image, because an earlier layer is immutable. **Git has the same property**: a committed secret is in a commit object, and deleting the file in a later commit leaves the object reachable from history. Rewriting it out means `filter-repo` across every branch and tag, force-pushing, and every clone still holding it." },

    { t: "p", text: "So the control is at the boundary, which is a `pre-commit` hook — the same *fail at the edge where it is cheap* argument as lesson 1.5's data validation." },

    { t: "code", lang: "bash", title: "m8.py wrote this hook, and it was executed",
      code: `#!/bin/sh
# Refuse what must never enter history, because lesson 4.5's lesson applies
# to git too: once it is committed, removing it later does not remove it.
MAX=1048576
fail=0
for f in $(git diff --cached --name-only --diff-filter=AM); do
  [ -f "$f" ] || continue
  size=$(wc -c < "$f")
  if [ "$size" -gt "$MAX" ]; then
    echo "REJECT $f: \${size} bytes exceeds \${MAX}"
    fail=1
  fi
  if git show ":$f" | grep -qE 'AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY'; then
    echo "REJECT $f: looks like a credential"
    fail=1
  fi
done
exit $fail`,
      out: `== 5. a pre-commit hook that refuses a big file and a key ==
  file           what it is         commit result
  small.py       ordinary source    COMMITTED
  data.npy       2 MB binary        REJECT data.npy: 2097152 bytes exceeds 1048576
  conf.py        an access key      REJECT conf.py: looks like a credential` },

    { t: "p", text: "Two details in that script are the ones that make a hook correct rather than approximately correct. **`--diff-filter=AM`** restricts it to files being added or modified, so a deletion is not inspected. And **`git show \":$f\"`** reads the file **from the index**, not from the working tree — which matters because `git add -p` can stage a subset of a file's changes, and the staged version is what is about to be committed." },

    { t: "callout", kind: "trap", title: "A local hook is advisory, not a control",
      body: [
        { t: "p", text: "`.git/hooks/` is not version-controlled and not distributed, so a new clone has no hooks, and `git commit --no-verify` bypasses them. A local hook is a helpful guard for the person who installed it and nothing more." },
        { t: "p", text: "The enforcement has to be server-side — a CI job on every pull request running the same checks, or a provider's push protection. The **pre-commit** framework is the usual way to make the local half shareable: a `.pre-commit-config.yaml` in the repository, installed once per clone, which also runs the notebook-output stripping from lesson 8.4 and the lint from lesson 6.3's PR pipeline." }
      ] },

    { t: "p", text: "And when something does get committed: **rotate the credential first.** Rewriting history is slow, incomplete and visible; a rotated key is immediately worthless. The history cleanup matters, and it is the second priority rather than the first." },

    { t: "h2", n: "05", id: "order", text: "The incident order",
      sub: "What to reach for, in sequence" },

    { t: "diagram", kind: "steps", id: "dg-8_5-05-0",
      title: "Four recoveries, in the order they are usually needed",
      caption: "**The first question is always whether anyone else has the history**, because it eliminates half the options immediately — and the last one is the only irreversible case.",
      items: [
        { label: "A metric regressed, cause unknown: bisect run", desc: "3 steps over 16 commits here, log2(n) in general. Needs a script and a threshold clear of 3.2's 0.17-point noise." },
        { label: "Something was committed that should not be: rotate, then rewrite", desc: "A committed secret stays in an object, as in a Docker layer. Rotation is immediate; filter-repo is the slow step." },
        { label: "Commits appear lost: reflog, then fsck --lost-found", desc: "reset moves a pointer; objects survive about 90 days until gc. The reflog is local and never pushed." },
        { label: "Uncommitted work discarded by reset --hard: nothing", desc: "The one irreversible everyday operation — git never created an object, so there is nothing to recover." }
      ] },

    { t: "exercise", kind: "practice", title: "Run all three recoveries once", difficulty: "core", minutes: 30,
      prompt: "In a throwaway repository, do each of the three measured things so they are familiar before you need them. Create a history of a dozen commits where one breaks a scripted check, then find it with `git bisect run` and count the steps. Commit twice on a branch, destroy it with `reset --hard HEAD~2`, and recover it from the reflog. Write the pre-commit hook from section 4 and confirm it rejects a large file and an `AKIA…` string while passing ordinary source. Then, in a repository you actually use, check two things: is there a server-side equivalent of that hook in CI, and if a secret were committed today, who would rotate it and how long would that take?",
      hints: [
        "Make the bisect check script deterministic — a flaky test breaks bisect's monotonicity assumption and converges on an innocent commit.",
        "`git reflog` before and after the reset makes it obvious that nothing was ever deleted.",
        "The rotation question is the one worth escalating: if the answer is 'nobody knows', that is the finding."
      ],
      solution: {
        notes: [
          { t: "p", text: "Bisect is the one most people have read about and never run, and `bisect run` is what makes it practical — three minutes unattended against an afternoon of reading diffs, and it finds causes that are not visible in a diff at all, like a dependency bump moving a metric." },
          { t: "p", text: "The rotation question usually has no owner, which matters more than the history rewriting. A committed key is live until somebody revokes it, and rewriting history does not revoke anything — every existing clone still has the object." }
        ]
      } }

  ],

  takeaways: [
    "**Bisect found the breaking commit in 3 steps over 16**, against up to 16 for a linear search — log₂(n), so a thousand commits is ten steps.",
    "**`git bisect run <command>` does it unattended**, which is what makes it worth the script; manual marking is why people read diffs instead.",
    "**The bisect threshold must clear the noise floor** — lesson 3.2 measured 0.17 AUC points — or the search follows seed noise to an innocent commit.",
    "**Exit code 125 means skip**, for a commit that cannot be built; and bisect assumes monotonicity, so a flaky test makes the result meaningless.",
    "**`reset --hard` moves a pointer; it does not delete commits.** The log showed 1 commit where there had been 3, and the reflog held all of it.",
    "**The reflog records everywhere HEAD and each branch has pointed**, is per-repository, and is never pushed — so a colleague's cannot help and a fresh clone has none.",
    "**Unreachable objects survive about 90 days until `git gc`**, so the recovery window is long; `git fsck --lost-found` finds dangling commits the reflog misses.",
    "**It cannot recover what was never committed** — `reset --hard` on uncommitted changes is the one irreversible everyday operation.",
    "**`revert` creates an inverse commit and is always safe on shared history**; `reset` rewrites and needs a force push.",
    "**Reverting a merge needs `-m 1`**, and it reverts the whole merged branch — usually right during an incident, rarely right afterwards.",
    "**A committed secret is in an object for ever**, exactly as in a Docker layer: deleting the file later does not remove it, and every existing clone keeps it.",
    "**The hook was executed**: ordinary source committed, a 2 MB binary and an `AKIA…` key both rejected.",
    "**Read staged content with `git show \":$f\"`**, not the working tree, because `add -p` can stage a subset — and filter with `--diff-filter=AM`.",
    "**A local hook is advisory**: `.git/hooks` is not distributed and `--no-verify` bypasses it, so enforcement is a CI job or push protection.",
    "**If a secret is committed, rotate first and rewrite second.** Rotation is immediate; history rewriting is slow, incomplete and does not revoke anything."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "You accidentally run `git reset --hard HEAD~2` on a branch with two commits of work. Is it recoverable?",
        options: [
          "No: a hard reset deletes the commits from the object store, so they are gone for good",
          "Yes: reset only moves the branch pointer, and the reflog still holds both hashes",
          "Only if the branch was pushed to a remote first, since that holds the only other copy",
          "Only if you stop work at once, because the next commit overwrites the orphaned objects"
        ],
        answer: 1,
        why: "Measured: the log showed one commit where there had been three, the reflog held both 'lost' hashes, and `reset --hard 664ec22` restored the branch exactly. What is *not* recoverable is uncommitted working-tree work, because git never created an object for it. New commits overwrite nothing: objects are removed only by garbage collection."
      },
      {
        stem: "A bad commit is on `main`, which several people have pulled. How do you undo it?",
        options: [
          "`git reset --hard` to the previous commit, then a force-push to update the remote",
          "`git revert` it, which adds an inverse commit and leaves the existing history alone",
          "`git rebase -i` to drop the commit, then a force-push with lease to protect others",
          "`git commit --amend` with the fix, then a force-push so that the bad commit disappears"
        ],
        answer: 1,
        why: "The first, third and fourth all rewrite history, so colleagues' repositories disagree with the remote about which commits exist and the same change can end up applied twice. Revert grows history instead, leaves the mistake visible — which is honest — and is itself a reviewable change."
      },
      {
        stem: "Your pre-commit hook rejects files containing AWS keys. Is that sufficient protection?",
        options: [
          "Yes: the hook runs before every commit, so a key can never reach the repository",
          "No: hooks are not cloned and `--no-verify` skips them, so enforce it server-side",
          "No, because a hook can only see file names and cannot read staged file contents",
          "Yes, as long as the hook script itself is committed to the repository's `.git` folder"
        ],
        answer: 1,
        why: "A local hook helps the person who installed it. The pre-commit framework makes the local half shareable via a committed config, but the enforcement has to be server-side. And once a secret is committed it is in an object for ever, so the response is rotate first, rewrite second. Nothing under `.git` is ever committed, and section 4's hook reads staged content with `git show`."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "mid",
        q: "A model's accuracy regressed and nobody knows which change caused it. What do you do?",
        strong: "Bisect, with a script. I write a check that trains on a fixed small sample and exits zero if the metric clears a threshold, then `git bisect run` it — git checks out commits, reads exit codes and converges by binary search. I measured it finding the break in three steps across sixteen commits, where a linear search would have been up to sixteen checkouts, and it scales as log n, so a thousand commits is ten steps. Two cautions. The threshold has to sit clear of the noise: I measured a 0.17 AUC-point floor from reseeding alone, so a tighter threshold makes bisect follow noise and convict an innocent commit. And bisect assumes the property is monotonic, so a flaky test makes the answer meaningless. Exit code 125 skips a commit that cannot be built, which stops an untestable revision sending the search the wrong way.",
        answer: [
          { t: "p", text: "`bisect run` plus a scripted check is the answer; manual bisect is why most people have read about it and never used it." },
          { t: "p", text: "The noise-floor caution is the ML-specific insight and shows the statistics and the tooling are being thought about together." }
        ]
      },
      {
        level: "senior",
        q: "Someone committed an AWS key to the repository. What do you do, in order?",
        strong: "Rotate the key first, before touching git. Rewriting history is slow, incomplete and does not revoke anything — the key stays live until somebody revokes it, and every existing clone and every CI cache still holds the object. So rotation is minutes and it makes the leaked value worthless, which is the actual risk reduction. Then the history: `git filter-repo` across all branches and tags, force-push, and tell everyone to re-clone, accepting that forks and anyone's local copy may still have it. Then the control, because this will happen again: a pre-commit hook is advisory — `.git/hooks` is not distributed and `--no-verify` bypasses it — so the enforcement is a CI check on every pull request plus the provider's push protection, with the pre-commit framework making the local half shareable through a committed config. It is the same property as a secret in a Docker layer: once it is in an immutable object, deleting the file later does not remove it.",
        answer: [
          { t: "p", text: "Rotation before rewriting is the whole answer and the most common ordering mistake; everything else is cleanup of something already compromised." },
          { t: "p", text: "Distinguishing advisory local hooks from server-side enforcement, and drawing the parallel to the image layer, shows the immutability property is understood rather than the tool list memorised." }
        ]
      },
      {
        level: "mid",
        q: "A bad commit is on main. What is the difference between revert and reset, and which do you use?",
        strong: "`revert` adds a new commit whose content is the inverse of the bad one, so history grows and nothing is rewritten. `reset` moves the branch pointer backwards, so history shrinks, and publishing that needs a force push. The question that decides it is whether anyone else has the commits. On main they do, so it is `revert`: colleagues' repositories stay consistent, the fix is itself a reviewable change, and the mistake stays visible, which is honest. `reset` is for commits nobody else has, like tidying a local branch. If the bad commit is a merge I need `revert -m 1` to say which parent to keep, and that reverts the whole merged branch, so re-merging that work later needs care. And for a release branch, the same fix goes across with `cherry-pick`.",
        answer: [
          { t: "p", text: "The same question, who else has this history, decided rebase in lesson 8.4, so one rule covers both choices." },
          { t: "p", text: "The `-m 1` wrinkle is what separates having done this during an incident from having read about it." }
        ]
      }
    ]
  }
});
