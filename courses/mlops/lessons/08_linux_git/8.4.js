EC.receiveLesson({
  id: "8.4",

  lede: "Git makes sense once you accept three facts: a commit is a **snapshot** rather than a diff, a branch is a **pointer** rather than a container, and the index is a real third place where files live. Every confusing command follows. The same divergent history was then resolved both ways and both graphs printed: **merge gave six commits with a two-parent merge commit, rebase gave five in a straight line** — and rebase **rewrote** the feature commits, producing new hashes for identical content. That rewriting is the whole of the shared-branch rule, and it is why the next lesson's recovery tools exist.",

  objectives: [
    "State what a commit, a branch and the index actually are",
    "Read a merge graph and a rebased graph, and say what differs besides shape",
    "Explain why rebasing a shared branch is unsafe, in terms of hashes",
    "Choose between merge and rebase from who else has the commits"
  ],

  prerequisites: ["8.3"],

  blocks: [

    { t: "h2", n: "01", id: "three", text: "Three facts",
      sub: "From which every command follows" },

    { t: "p", text: "**A commit is a snapshot, not a diff.** It records the complete tree at a moment, plus a pointer to its parent or parents. The diffs you see are computed on demand by comparing two snapshots — which is why `git show` can display a change for a commit that stores no change at all, and why a commit can be understood without replaying history." },

    { t: "p", text: "Lesson 1.3 measured the consequence: five versions of a 5.6 MB table cost **7.05 MB** of packed history, not 28. Git stores snapshots logically and **deltas them physically** in packfiles, which is why the slogan *git stores every version in full* was false." },

    { t: "p", text: "**A branch is a pointer, nothing more.** `master` is a file containing a forty-character hash. Creating a branch writes 41 bytes; deleting one removes them. Nothing is copied, and a branch does not *contain* commits — it points at one, which points at its parent, and so on. Reachability is the only relationship." },

    { t: "p", text: "**The index is a real place.** Files exist in three states: the working tree, the index (staging area), and the last commit. `git add` copies from the first to the second; `git commit` from the second to the third. Most confusion about `reset` and `checkout` is confusion about which of the three a command touches." },

    { t: "callout", kind: "mental", title: "Commits are content-addressed, like everything else in this course",
      body: [
        { t: "p", text: "A commit's hash is computed from its content: the tree, the parents, the author, the message, the timestamp. So the id **is** the content — two commits with identical everything are the same commit, and changing anything produces a different id." },
        { t: "p", text: "This is the same mechanism as lesson 1.3's content-addressed data store and lesson 4.2's image layers. And it is the fact that makes section 3 inevitable: if a commit's parent changes, its hash changes, because the parent is part of the content." }
      ] },

    { t: "h2", n: "02", id: "graphs", text: "The same history, resolved two ways",
      sub: "Both graphs, from the same starting point" },

    { t: "p", text: "A branch diverged: two commits on `feature`, one on `master`, from a common base of two. Resolved once by merge and once by rebase, with the resulting graphs printed." },

    { t: "code", lang: "python", title: "merge",
      out: `  MERGE:
    *   b69c0c7 (HEAD -> master) Merge branch 'feature'
    |\\
    | * 7218650 (feature) feature: log n_iter_
    | * 933afd3 feature: add early stopping
    * | d0d6cbd main: bump sklearn pin
    |/
    * cf4fd92 base: add evaluation
    * ad79b2e base: training script` },

    { t: "code", lang: "python", title: "rebase, then fast-forward",
      out: `  REBASE then fast-forward:
    * e954b24 (HEAD -> master, feature) feature: log n_iter_
    * 8ea9e02 feature: add early stopping
    * 6332c93 main: bump sklearn pin
    * 43ac0d2 base: add evaluation
    * c4e07ef base: training script

  merge : 6 commits on master, HEAD has 2 parents (a merge commit)
  rebase: 5 commits on master, linear, no merge commit` },

    { t: "p", text: "Three differences, and only the first is the one people discuss." },

    { t: "p", text: "**Shape.** Merge preserves the fork: the graph shows two lines of work and where they rejoined, and the merge commit has **two parents**. Rebase produces a straight line in which the feature commits appear to have been written after `main: bump sklearn pin`, which is not what happened." },

    { t: "p", text: "**Count.** Six commits against five. The merge commit is a real commit that exists only to record the join." },

    { t: "p", text: "**The hashes.** This is the consequential one: the feature commits are `7218650` and `933afd3` after the merge, and `e954b24` and `8ea9e02` after the rebase. **Same content, different ids.**" },

    { t: "h2", n: "03", id: "rewrite", text: "Why rebase rewrites, and why that is the rule",
      sub: "The hashes follow from section 1" },

    { t: "p", text: "The hash change is not a side effect — it is forced by content addressing. A commit's hash includes its parent's hash. Rebase replays each commit onto a new base, so every replayed commit has a different parent, therefore different content, therefore a different id. Git has not modified those commits; it has **created new ones** and moved the branch pointer to the last of them. The originals become unreachable." },

    { t: "callout", kind: "trap", title: "The shared-branch rule, stated precisely",
      body: [
        { t: "p", text: "If a colleague has `7218650` and you rebase it into `e954b24`, their repository and yours now disagree about which commits exist. Their next `git pull` sees your new commits as unrelated to their old ones and merges them in — so **the same change appears twice**, with two hashes, and the history becomes genuinely confusing rather than merely untidy. Pushing the rebase requires `--force`, which is what makes the operation loud." },
        { t: "p", text: "Hence the rule: **rebase commits nobody else has.** Your own unpushed branch, or a pull-request branch your team agrees is yours to rewrite. Never a shared branch, and never `main`." },
        { t: "p", text: "`--force-with-lease` is the safer force: it refuses if the remote has moved since you last fetched, which turns *I overwrote a colleague's work* into a rejected push. There is no reason to use bare `--force` on a shared remote." }
      ] },

    { t: "p", text: "The honest case **for** rebase is that linear history is easier to read and to bisect (lesson 8.5), and that a feature branch rebased onto the latest `main` is tested in the state it will actually be merged into — where a merge tests a combination that has never existed alone. The case **against** is that it discards when the work genuinely happened, and that the rewrite is unsafe the moment anyone else has the commits." },

    { t: "diagram", kind: "matrix", id: "dg-8_4-03-0",
      title: "Merge against rebase, on the axes that matter",
      caption: "**The last row is the decision.** The shape argument is a preference; the hash-rewriting argument is a constraint, and it is the only row that can make one of them wrong rather than merely different.",
      rows: ["History shape", "Commit count", "Hashes", "Conflict resolution", "Safe if others have it"],
      cols: ["Merge", "Rebase"],
      cells: [
        [{ text: "preserves the fork, two parents", tone: "accent" }, { text: "linear; order is fictional", tone: "accent" }],
        [{ text: "6 — an extra merge commit", tone: "warn" }, { text: "5 — no extra commit", tone: "good" }],
        [{ text: "unchanged", tone: "good" }, { text: "rewritten: same content, new ids", tone: "crit" }],
        [{ text: "once, in the merge commit", tone: "good" }, { text: "possibly once per replayed commit", tone: "warn" }],
        [{ text: "yes", tone: "good" }, { text: "no — requires a force push", tone: "crit" }]
      ] },

    { t: "p", text: "The conflict row is a practical consideration people discover mid-rebase: a merge resolves the whole divergence once, while a rebase replays commits one at a time and can present **the same conflict repeatedly**. `git rerere` records resolutions and replays them, which makes a long rebase tolerable; without it, a ten-commit rebase with a recurring conflict is an afternoon." },

    { t: "h2", n: "04", id: "reset", text: "reset, checkout, restore",
      sub: "Which of the three places each one touches" },

    { t: "p", text: "The commands that confuse everyone are clear once you ask which of the working tree, the index and HEAD they move." },

    { t: "table",
      head: ["Command", "Moves HEAD", "Index", "Working tree"],
      rows: [
        ["`git reset --soft <c>`", "yes", "untouched", "untouched"],
        ["`git reset` (mixed, default)", "yes", "reset to <c>", "untouched"],
        ["`git reset --hard <c>`", "yes", "reset to <c>", "**overwritten** — uncommitted work gone"],
        ["`git switch <branch>`", "yes (to a branch)", "updated", "updated, refusing to clobber changes"],
        ["`git restore <path>`", "no", "optionally", "overwrites that path from the index or a commit"]
      ] },

    { t: "p", text: "**`--hard` is the only one of these that destroys work that was never committed**, and that is the distinction worth internalising: committed work is recoverable through the reflog (lesson 8.5 measures it), and uncommitted work in the working tree is not recoverable by any git command, because git never saw it." },

    { t: "p", text: "The modern split is worth adopting: `git switch` for branches and `git restore` for files. The old `git checkout` did both jobs depending on its arguments, which is why `git checkout <path>` silently discarding a file's changes surprised so many people." },

    { t: "h2", n: "05", id: "ml", text: "What this means for an ML repository",
      sub: "Three practices, each from a measurement" },

    { t: "p", text: "**Commit the lockfile, and treat it as part of the result.** Lesson 3.4 measured library versions as a hidden input: the same code, seed and data gave different predictions across thread counts, and lesson 1.2's `env_sha` exists because a minor version can move a metric. A `requirements.txt` with unpinned versions means the commit does not identify the code that ran." },

    { t: "p", text: "**Keep the data out, as lesson 1.3 argued** — but for the right reason. Git handled the storage fine (7.05 MB for five versions); what it cannot do is make history optional, so every clone paid **13.09 MB against 0.03 MB** for the pointer scheme. A pointer file with a content hash is the version; git holds the pointer." },

    { t: "p", text: "**Make the commit message carry the metric when it changes one.** A history of *update model* tells you nothing; *retrain: AUC 0.8491 (+0.0019, CI [+0.0002, +0.0035])* is lesson 3.2's gate output preserved where the next person will look. It also makes lesson 8.5's bisect meaningful, because the log itself shows where to look." },

    { t: "callout", kind: "good", title: "Notebooks are the one genuinely git-hostile artifact",
      body: [
        { t: "p", text: "A `.ipynb` is JSON containing outputs, execution counts and base64 images, so re-running a notebook without changing a line produces a large diff — and lesson 4.2 measured a notebook checkpoint as one of the files whose incidental rewriting busted a Docker build cache." },
        { t: "p", text: "The two fixes that work: a pre-commit hook that strips outputs (`nbstripout`), so the diff is the code; or `jupytext` pairing the notebook with a `.py` file that is the thing committed. Either makes review possible, and both are lesson 8.5's hook mechanism." }
      ] },

    { t: "exercise", kind: "practice", title: "Reproduce both graphs", difficulty: "intro", minutes: 25,
      prompt: "In a throwaway repository, create the same divergence: two commits on a base, two on a feature branch, one on the main branch. Resolve it by merge and print `git log --all --oneline --graph --decorate`. Then reset to the divergent state and resolve it by rebase, and print the graph again. Record the feature commits' hashes in both cases and confirm they differ. Then check two things in a real repository you work on: is the history merge-based or linear, and does your team's convention match who has the commits — specifically, has anyone ever force-pushed a branch somebody else had checked out?",
      requirements: [
        "Create the same divergence in a throwaway repository and resolve it by merge",
        "Reset and resolve it by rebase",
        "Record the feature commits' hashes in both and confirm they differ",
        "Check whether your team's history is merge-based or linear, and whether anyone has force-pushed a shared branch"
      ],
      hints: [
        "`git reflog` gives you the pre-merge hash to reset back to, so you can resolve the same divergence twice.",
        "Compare the hashes directly: identical content with different ids is the whole of the shared-branch rule.",
        "`git config --get pull.rebase` reveals the team's default, which is often set without anyone having decided it."
      ],
      solution: {
        lang: "bash", title: "8.4.sh",
        code: `set -e
cd "$(mktemp -d)" && git init -q -b main && git config user.email you@example.com && git config user.name You && git config core.autocrlf false
c() { echo "$1" > "$1.txt"; git add "$1.txt"; git commit -qm "$1"; }     # one file per commit: no conflicts
c base-1; c base-2
git switch -qc feature; c feature-1; c feature-2
git switch -q main; c main-1
MAIN=$(git rev-parse main); FEAT=$(git rev-parse feature)
before="$(git rev-parse --short feature~1) $(git rev-parse --short feature)"

echo "== resolved by merge"
git merge -q --no-edit feature
git log --all --oneline --graph --decorate | sed 's/^/  /'
echo "  feature commits keep their hashes: $before -> $(git rev-parse --short feature~1) $(git rev-parse --short feature)"

echo "== the same divergence, resolved by rebase"
git reset -q --hard "$MAIN"; git switch -q feature; git reset -q --hard "$FEAT"
git rebase -q main
git log --all --oneline --graph --decorate | sed 's/^/  /'
echo "  feature commits get NEW hashes:    $before -> $(git rev-parse --short feature~1) $(git rev-parse --short feature)"
echo "  anyone who pulled the old feature commits now holds commits that are no longer on the branch"`,
        out: `== resolved by merge
  *   b265f7a (HEAD -> main) Merge branch 'feature'
  |\\  
  | * 746fad0 (feature) feature-2
  | * 0e86426 feature-1
  * | 0c8162d main-1
  |/  
  * 766b49a base-2
  * 3d2bfae base-1
  feature commits keep their hashes: 0e86426 746fad0 -> 0e86426 746fad0
== the same divergence, resolved by rebase
  * 20cd561 (HEAD -> feature) feature-2
  * 8851b37 feature-1
  * 0c8162d (main) main-1
  * 766b49a base-2
  * 3d2bfae base-1
  feature commits get NEW hashes:    0e86426 746fad0 -> 8851b37 20cd561
  anyone who pulled the old feature commits now holds commits that are no longer on the branch`,
       
        notes: [
          { t: "p", text: "Seeing the two graphs side by side from the same starting point makes the trade concrete in a way reading about it does not — and reading the hashes makes the rewriting undeniable rather than a cautionary abstraction." },
          { t: "p", text: "The force-push question usually has a story attached, and the useful follow-up is adopting `--force-with-lease` as the team default: it refuses when the remote has moved since your last fetch, which converts overwriting a colleague's work into a rejected push." }
        ]
      } },

    { t: "callout", kind: "scenario", title: "Incident: the experiment branch rebased under three people",
      body: [
        { t: "p", text: "**Symptom.** Two researchers found that their commits on a shared experiment branch had disappeared from it, and a third found theirs duplicated with different hashes." },
        { t: "p", text: "**Mechanism.** The branch owner rebased the shared branch onto main and force-pushed. Rebase creates new commits with new hashes, so everyone else's local branch now pointed at commits the remote no longer had. Their next pull merged old and new copies, and one push overwrote the other." },
        { t: "p", text: "**Fix.** Shared branches are protected against force-push. Rebasing is reserved for branches only one person has checked out, and the lost commits were recovered from the researchers' reflogs (lesson 8.5)." }
      ] }
  ],

  takeaways: [
    "**A commit is a snapshot plus parent pointers**, not a diff — diffs are computed on demand by comparing two snapshots.",
    "**Git stores snapshots logically and deltas them physically**, which is why lesson 1.3 measured five versions of a 5.6 MB table at 7.05 MB rather than 28.",
    "**A branch is a 41-byte file containing a hash.** It does not contain commits; reachability is the only relationship.",
    "**The index is a real third place** files live, and most confusion about `reset` is confusion about which of the three a command touches.",
    "**A commit's hash is computed from its content, including its parents** — the same content addressing as lesson 1.3's data store and lesson 4.2's layers.",
    "**Measured: merge gave 6 commits with a two-parent merge commit; rebase gave 5 in a straight line.**",
    "**And rebase rewrote the hashes** — the same feature commits were `7218650`/`933afd3` after merging and `e954b24`/`8ea9e02` after rebasing.",
    "**The rewrite is forced by content addressing**: a new parent means new content means a new id. Git creates new commits and abandons the originals.",
    "**So rebase only commits nobody else has.** Otherwise the same change exists under two hashes and a colleague's pull merges both.",
    "**Use `--force-with-lease`, never bare `--force`** — it refuses if the remote moved, turning an overwrite into a rejected push.",
    "**A merge resolves the divergence once; a rebase can present the same conflict per replayed commit** — `git rerere` is what makes a long rebase tolerable.",
    "**`reset --hard` is the only one of these commands that destroys uncommitted work**, and no git command can recover it, because git never saw it.",
    "**Prefer `git switch` and `git restore`** to the overloaded `git checkout`.",
    "**Commit the lockfile**: lesson 3.4 showed library versions are a hidden input, so unpinned requirements mean the commit does not identify what ran.",
    "**Put the metric in the commit message** when a commit changes one — it preserves lesson 3.2's gate output where the next person looks, and makes a bisect log readable.",
    "**Notebooks are genuinely git-hostile**: strip outputs with a hook or pair with jupytext, or every re-run is a large diff."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Why does rebasing change commit hashes even though the file contents are identical?",
        options: [
          "Because rebase resets the timestamp on each commit, and the hash is taken from that alone",
          "Because a commit's hash covers its parent, so a new base means new content and a new id",
          "Because rebase compresses the commits into a smaller packfile with different object ids",
          "Because git adds a random salt whenever it rewrites a commit, to keep the old ids unique"
        ],
        answer: 1,
        why: "Measured: the same feature commits were 7218650/933afd3 after a merge and e954b24/8ea9e02 after a rebase. This is the same content addressing as a data store or an image layer, and it is what makes rebasing shared commits unsafe rather than merely untidy. Hashing is deterministic: there is no salt, and the timestamp is only one of several inputs."
      },
      {
        stem: "A colleague has your feature branch checked out. You rebase it and force-push. What happens to them?",
        options: [
          "Their next pull fast-forwards cleanly on to your rewritten history, and nothing is lost",
          "A pull merges your new commits with their old ones, so each change appears twice",
          "Git refuses the force-push, because the branch is checked out on another machine",
          "Their old commits are deleted from their clone the next time they fetch from the remote"
        ],
        answer: 1,
        why: "This is why the rule is to rebase only commits nobody else has. `--force-with-lease` does not prevent this case — it protects against overwriting commits you have not fetched — so the real control is the convention about which branches are rewritable. Fetching never deletes local commits, and a remote cannot see what anyone has checked out."
      },
      {
        stem: "Which of these can destroy work that no git command can recover?",
        options: [
          "`git reset --hard` on uncommitted changes in the working tree",
          "`git reset --hard` on commits that exist only on a local branch",
          "`git rebase` on commits that have already been pushed to a remote",
          "`git branch -D` on a branch whose commits were never merged anywhere"
        ],
        answer: 0,
        why: "Committed work is reachable through the reflog, which lesson 8.5 measures recovering. Uncommitted changes in the working tree were never stored as objects, so there is nothing to recover — which is the one genuinely irreversible everyday git operation. A deleted branch is recoverable the same way, because its commits stay in the reflog."
      },
      {
        stem: "Why does rebasing change commit hashes even when every file ends up identical?",
        options: [
          "Rebase compresses commits, which changes their encoding",
          "A commit's hash covers its parent, and the parent changed",
          "Git adds a random salt to every rewritten commit",
          "The hash includes the branch name, which rebase updates"
        ],
        answer: 1,
        why: "A commit is content-addressed over its tree, metadata and parent, so a new parent means a new hash; the lesson measured different hashes for the same feature commits. There is no salt, no compression effect, and branch names are not part of the hash."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "mid",
        q: "What is the difference between merge and rebase?",
        strong: "Merge preserves the fork and adds a commit with two parents recording the join; rebase replays your commits onto the new base, giving a straight line. I resolved the same divergence both ways: merge produced six commits with a two-parent merge commit, rebase produced five linear ones. But the difference that matters is not shape — it is that rebase rewrites the hashes. A commit's id is computed from its content including its parent, so replaying onto a new base necessarily produces new ids for identical content; in my case the same two feature commits had completely different hashes afterwards. Git did not modify them, it created new ones and abandoned the originals. So the rule follows: rebase commits nobody else has, because if a colleague holds the old ids their pull will merge both versions and the same change appears twice.",
        answer: [
          { t: "p", text: "Deriving the hash rewriting from content addressing, rather than stating it as a rule, is what makes this a real answer — and it is the same mechanism as a content-addressed artifact store." },
          { t: "p", text: "Having both graphs and both sets of hashes from the same starting point makes the trade concrete instead of a stylistic preference." }
        ]
      },
      {
        level: "senior",
        q: "What would you change about how an ML team uses git?",
        strong: "Three things, each because of something measurable. Commit the lockfile and treat the environment as part of the result — I have measured the same code, seed and data producing different predictions under different thread counts and library versions, so an unpinned requirements file means the commit does not identify what ran. Keep data out, but for the right reason: git actually stores it well, five versions of a 5.6 MB table came to 7 MB of packed history, and the real problem is that history is not optional, so every clone paid 13 MB against 0.03 for a pointer scheme. And put the metric in the commit message when a commit changes one — the gate's interval and verdict, not 'update model' — because that is where the next person looks and it makes a bisect log readable. I would also add a hook stripping notebook outputs, since a .ipynb is JSON with embedded outputs and re-running it produces a large diff that makes review impossible and busts build caches.",
        answer: [
          { t: "p", text: "Each recommendation carrying a measurement is what distinguishes this from a style guide, and the data point about git storing data well — while still recommending against it — shows the reasoning rather than the slogan." },
          { t: "p", text: "The notebook point is the one with the widest effect on day-to-day review quality, and it is a single pre-commit hook." }
        ]
      },
      {
        level: "senior",
        q: "Which git operations can really lose work, and which only look as if they have?",
        strong: "Almost everything that looks destructive is not, because a branch is a pointer and the commits are objects that outlive it. `reset --hard`, a deleted branch, a bad rebase and an amended commit all leave the original commits unreachable rather than gone, and the reflog can find them until garbage collection, about 90 days by default. What actually loses work is anything git never stored: uncommitted changes overwritten by `reset --hard` or `git restore` have no object behind them, so no git command can recover them. The second real loss is on a shared remote, where a bare `--force` can replace a colleague's commits that you never fetched, which is why I use `--force-with-lease`. So my rule is that committed work is safe and uncommitted work is not, and it follows that committing often on a private branch and tidying later is the safer habit, even though the history looks messier for a while.",
        answer: [
          { t: "p", text: "The structure is one principle, stored or never stored, rather than a list of dangerous commands, and every case then follows from it." },
          { t: "p", text: "Keeping the remote case separate shows you know the reflog is local, so it cannot rescue what a force push removed from someone else." }
        ]
      }
    ]
  }
});
