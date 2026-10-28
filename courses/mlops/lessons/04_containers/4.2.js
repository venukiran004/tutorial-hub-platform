EC.receiveLesson({
  id: "4.2",

  lede: "An image is a stack of content-addressed layers, and one ordering rule follows from that: **install dependencies before copying source**. The cost of getting it wrong is measurable without a daemon, from the real sizes of the libraries installed on this machine. numpy, scipy and scikit-learn together weigh **186.3 MB**; a Dockerfile that copies source before installing re-downloads and rebuilds all of it on every one-line code change, against **0.03 MB** of source for the correct order — **7,346 times more work per edit**. And the build context is the other half: a realistic working tree sends **414.2 MB** to the daemon, or **0.188 MB** with a `.dockerignore`, a factor of **2,209**.",

  objectives: [
    "Explain why an image layer is content-addressed and what that implies for caching",
    "Order Dockerfile instructions from the invalidation rule rather than from habit",
    "Quantify what a cache miss costs using your own dependencies' real sizes",
    "Distinguish the build context from the image, and size both"
  ],

  prerequisites: ["4.1"],

  blocks: [

    { t: "h2", n: "01", id: "layers", text: "Layers, and why they are content-addressed",
      sub: "The same idea as lesson 1.3's cache" },

    { t: "p", text: "An image is an ordered stack of layers. Each layer is a tar of filesystem changes — files added, modified or marked deleted — and each is named by the **hash of its own contents**, exactly like the content-addressed data store built in lesson 1.3. A running container adds one thin writable layer on top and reads everything below it through a union filesystem." },

    { t: "p", text: "Two consequences follow immediately, and they are the whole of layer caching." },

    { t: "p", text: "**Identical layers are stored and transferred once.** Ten images built `FROM python:3.11-slim` share that base: it is pulled once per node and stored once. This is lesson 1.3's deduplication property, and it is why a shared base image across a fleet is worth standardising on." },

    { t: "p", text: "**A layer's identity depends on everything before it.** The cache key for a step is the parent layer's digest plus the instruction plus, for `COPY`, a hash of the files being copied. So invalidating a layer invalidates **every layer after it**, unconditionally. That is the rule the rest of the lesson is about." },

    { t: "diagram", kind: "layers", id: "dg-4_2-01-0",
      title: "A model service image, bottom-up, with what invalidates each layer",
      caption: "Read bottom to top; the cache is checked in the same direction. **The moment one layer's key changes, everything above it is rebuilt** — so the ordering question is simply which layers you want above the ones that change often.",
      items: [
        { label: "Writable container layer (not in the image)", desc: "Created per container, discarded on removal. Anything written here is lost, which is what volumes in 4.4 exist for." },
        { label: "COPY src/ ./src/ — invalidated by any code edit", desc: "Tiny: measured at 0.03 MB. This is the layer that should change on every build, and it should be last." },
        { label: "RUN pip install -r requirements.txt — invalidated when requirements.txt changes", desc: "Expensive: 186.3 MB of numpy, scipy and scikit-learn. Should change only when dependencies change." },
        { label: "COPY requirements.txt . — invalidated when the file changes", desc: "The reason this line exists separately: it is the cheapest possible cache key for the expensive layer above." },
        { label: "FROM python:3.11-slim — shared across every image using it", desc: "Pulled once per node, stored once. Content-addressed deduplication, the same property as lesson 1.3's cache." }
      ] },

    { t: "h2", n: "02", id: "weigh", text: "What the dependencies actually weigh",
      sub: "Measured, because the ratio decides everything" },

    { t: "p", text: "The cost of a cache miss is the size of what gets rebuilt, so the first thing to measure is the libraries themselves. These are the real installed footprints on this machine, read from `site-packages`." },

    { t: "code", lang: "python", title: "m4.py — real package footprints",
      code: `for name, mod in pkgs:
    p = os.path.dirname(mod.__file__)
    s = dirsize(p)`,
      out: `== 1. what a model service's dependencies weigh ==
  numpy                 33.0 MB   2.4.4
  pandas                66.3 MB   2.3.3
  scikit-learn          40.6 MB   1.8.0
  scipy                112.7 MB   1.17.1
  torch                446.7 MB   2.10.0+cpu
  TOTAL                699.4 MB

  a serving image needs numpy + scipy + scikit-learn :     186.3 MB
  torch alone                                        :     446.7 MB
  -> shipping torch in a sklearn serving image costs 446.7 MB
     and 3.4x the dependency footprint.` },

    { t: "p", text: "Two things are worth taking from that table. **scipy is the biggest of the four at 112.7 MB** — bigger than scikit-learn, which depends on it, and bigger than pandas. It is mostly compiled Fortran and BLAS. And **torch at 446.7 MB is 2.4 times the entire scikit-learn serving stack**, which makes it the single largest decision in a serving image." },

    { t: "callout", kind: "insight", title: "The requirements file is the image size",
      body: [
        { t: "p", text: "A serving image for the model in this course needs numpy, scipy and scikit-learn: **186.3 MB** of dependencies. If `requirements.txt` is shared with the training environment and therefore also contains torch, the same image carries **633 MB**, a 3.4x dependency footprint, for a model that never calls torch." },
        { t: "p", text: "Separating training and serving requirements is the single largest lever on image size, and it is free. Lesson 2.3's finding sharpens it further: a 0.7 KB logistic regression beat the gradient-boosted model, and a logistic regression needs numpy and scipy but not scikit-learn at inference time if you export the coefficients." }
      ] },

    { t: "h2", n: "03", id: "ordering", text: "The ordering rule, costed",
      sub: "7,346 times more work per edit" },

    { t: "p", text: "Now the two orderings, with each step's cost taken from the measured sizes. The difference is one line moved." },

    { t: "code", lang: "python", title: "m4.py — the wrong order",
      out: `  COPY before install (the common mistake)
    FROM python:3.11-slim                       0.0 MB  base, cached
    COPY . .                                    0.2 MB  INVALIDATED by any file change
    RUN pip install -r requirements.txt       186.3 MB  re-runs: downloads and builds
    CMD uvicorn app:app                         0.0 MB  re-runs
    ->                                        186.5 MB re-done on a one-line code change` },

    { t: "code", lang: "python", title: "m4.py — the right order",
      out: `  install before COPY (correct)
    FROM python:3.11-slim                       0.0 MB  base, cached
    COPY requirements.txt .                     0.0 MB  cached unless deps change
    RUN pip install -r requirements.txt       186.3 MB  CACHED
    COPY src/ ./src/                            0.0 MB  invalidated, and it is tiny
    CMD uvicorn app:app                         0.0 MB  re-runs
    ->                                          0.0 MB re-done on a one-line code change

  the wrong order re-downloads and rebuilds 186.3 MB of dependencies
  on every code change; the right order re-copies 0.03 MB of source.
  ratio: 7346x more work per edit.` },

    { t: "p", text: "The mechanism is the invalidation rule from section 1. `COPY . .` hashes everything in the context, so **any** change to **any** file — a comment, a README, a test — produces a new layer digest, and the `RUN pip install` above it is rebuilt because its parent changed. The dependency install has nothing to do with your source code and is redone anyway." },

    { t: "p", text: "Moving the install above the source copy breaks that chain. `COPY requirements.txt .` is a deliberately narrow cache key: it changes only when the dependency list changes, which is the only time the install genuinely needs to re-run." },

    { t: "callout", kind: "trap", title: "`COPY . .` also invalidates on files you did not mean to send",
      body: [
        { t: "p", text: "Because the cache key hashes the copied files, a change to anything in the context busts the layer — including a notebook checkpoint rewritten by Jupyter, a `.pyc` file, or a log. Teams see builds that take ten minutes *sometimes*, with no apparent pattern, and the pattern is whichever incidental file was touched." },
        { t: "p", text: "The fix is both halves of this lesson: copy narrowly (`COPY src/ ./src/`, not `COPY . .`) and exclude aggressively with `.dockerignore`, which is the next section." }
      ] },

    { t: "h2", n: "04", id: "context", text: "The build context",
      sub: "2,209 times smaller, and it is not the image" },

    { t: "p", text: "Before any instruction runs, the client sends the **build context** — the directory you pointed at — to the daemon. This is separate from the image and is frequently much larger, because it contains everything in the working tree whether the Dockerfile uses it or not." },

    { t: "code", lang: "python", title: "m4.py — a realistic working tree, with and without excludes",
      code: `layout = [
    ("src/app.py", 8 * 1024), ("src/features.py", 12 * 1024),
    ("models/model.pkl", 164 * 1024),
    ("data/train.parquet", 48 * 1024 * 1024),
    ("data/raw/events.csv", 92 * 1024 * 1024),
    ("notebooks/explore.ipynb", 14 * 1024 * 1024),
    ("notebooks/.ipynb_checkpoints/explore.ipynb", 14 * 1024 * 1024),
    (".git/objects/pack/pack-abc.pack", 36 * 1024 * 1024),
    (".venv/lib/site-packages/placeholder", 210 * 1024 * 1024),
]`,
      out: `== 2. build context: what gets sent to the daemon ==
  the whole working tree                     414.2 MB
  with a .dockerignore excluding ...        0.188 MB
  excluded: .git, .venv, data, notebooks, tests, __pycache__
  -> 2209x smaller context, every build
     and the data, the venv and .git were never needed in the image.` },

    { t: "p", text: "**414.2 MB against 0.188 MB.** The biggest single contributor is `.venv` at 210 MB — the local virtual environment, which is both useless in the image and actively harmful, since `pip install` inside the build would be shadowed by a copied-in environment built for a different platform. Then the training data at 140 MB, then `.git` at 36 MB." },

    { t: "p", text: "That cost is paid on **every build**, before a single instruction executes, and it is invisible in the build log beyond a line about sending the context. On a remote daemon or a CI runner it is a network transfer." },

    { t: "diagram", kind: "compare", id: "dg-4_2-04-0",
      title: "Context against image: two different sizes, often confused",
      caption: "They are measured separately and reduced by different means. **A `.dockerignore` shrinks the context; a multi-stage build and a slim base shrink the image.** Doing one and not the other leaves half the cost in place.",
      columns: [
        { title: "The build context", items: [
          "Everything in the directory you point at",
          "Measured here: 414.2 MB",
          "Sent before any instruction runs",
          "Reduced by .dockerignore: 0.188 MB",
          "Also a cache key for COPY",
          "A network transfer to a remote daemon"
        ] },
        { title: "The image", items: [
          "Only what the instructions put in it",
          "Dependencies measured at 186.3 MB",
          "Built layer by layer, cached",
          "Reduced by multi-stage and a slim base",
          "Pulled by every node that runs it",
          "Shared layers stored once"
        ] }
      ] },

    { t: "callout", kind: "good", title: "Write `.dockerignore` as an allow-list where you can",
      body: [
        { t: "p", text: "A deny-list grows stale: somebody adds a `scratch/` directory and nobody updates the file. Starting with `*` and then un-ignoring what the build needs — `!src/`, `!requirements.txt` — fails closed, which is the behaviour you want for a cost paid on every build." },
        { t: "p", text: "It is also a security control. Lesson 4.5 measures a secret surviving a `RUN rm`; the earlier mistake is sending `.env`, `.aws/` or a key file into the context at all, where a `COPY . .` will faithfully bake it into a layer." }
      ] },

    { t: "h2", n: "05", id: "rules", text: "The rules that follow",
      sub: "In order of how much they save" },

    { t: "diagram", kind: "steps", id: "dg-4_2-05-0",
      title: "Four rules, from the invalidation mechanism",
      caption: "All four are consequences of one fact: **a layer's key depends on everything beneath it.** The measured savings are from this machine's real library sizes and a realistic working tree.",
      items: [
        { label: "Install dependencies before copying source", desc: "Measured: 186.3 MB rebuilt per edit against 0.03 MB. A 7,346x difference from moving one line." },
        { label: "Write a .dockerignore, preferably as an allow-list", desc: "414.2 MB of context down to 0.188 MB, a factor of 2,209, paid on every build." },
        { label: "Copy narrowly: COPY src/ ./src/, never COPY . .", desc: "A broad copy invalidates on any incidental file, giving builds that are slow for no visible reason." },
        { label: "Split training and serving requirements", desc: "torch is 446.7 MB, 2.4x the entire sklearn serving stack, in an image that never calls it." }
      ] },

    { t: "p", text: "Two mechanics worth knowing that the measurement above does not show. **Each `RUN` is its own layer**, so `RUN apt-get update` in one instruction and `RUN apt-get install` in another can produce a stale package index cached separately from the install — they belong in one `RUN`. And **BuildKit's cache mounts** (`RUN --mount=type=cache,target=/root/.cache/pip`) persist the pip download cache *across* builds, which makes even a genuine dependency change much cheaper without putting the cache in a layer." },

    { t: "exercise", kind: "practice", title: "Measure your own two numbers", difficulty: "intro", minutes: 25,
      prompt: "Without building anything, compute both costs for a repository you work on. First, the build context: `du -sh .` for the whole tree, then sum only the paths your Dockerfile actually copies, and take the ratio. Second, the cache miss: sum the `site-packages` footprint of your serving requirements, which is what a mis-ordered Dockerfile rebuilds on every edit, and compare it to the size of the source you copy. Then read your Dockerfile and check three things — is the install above the source copy, is the copy narrow, and does `requirements.txt` contain anything serving does not import.",
      hints: [
        "`du -sh .git .venv node_modules data` usually finds the whole context problem in one command.",
        "For the dependency footprint, `du -sh` each top-level package directory in site-packages rather than trusting the wheel size.",
        "Check for torch, matplotlib or jupyter in a serving requirements file — all three are large and none is usually imported at inference."
      ],
      solution: {
        body: [
          { t: "p", text: "The context ratio is usually dominated by one directory — `.venv`, `node_modules`, `.git` or raw data — and a single `.dockerignore` line fixes most of it. Teams are often surprised that the context is larger than the image." },
          { t: "p", text: "The dependency audit tends to find one large library that serving never imports. Removing it is free, and the measurement here puts torch at 446.7 MB, which is 2.4 times the whole scikit-learn serving stack." }
        ]
      } }

  ],

  takeaways: [
    "**An image is a stack of content-addressed layers**, each a tar of filesystem changes named by its own hash — the same mechanism as lesson 1.3's data cache.",
    "**Identical layers are stored and transferred once**, so a shared base image across a fleet is pulled once per node.",
    "**A layer's cache key depends on everything beneath it**, so invalidating one layer rebuilds every layer above it, unconditionally.",
    "**Real footprints on this machine**: numpy 33.0 MB, pandas 66.3, scikit-learn 40.6, scipy 112.7, torch 446.7. scipy is bigger than the library that depends on it.",
    "**A sklearn serving image needs 186.3 MB of dependencies; torch alone is 446.7 MB**, 2.4x that whole stack, so separating training and serving requirements is the largest free lever.",
    "**The wrong order rebuilds 186.3 MB on every one-line code change**; the right order re-copies 0.03 MB — **7,346x more work per edit** from one misplaced line.",
    "**`COPY requirements.txt .` exists to be a narrow cache key** for the expensive install above it.",
    "**`COPY . .` invalidates on any incidental file** — a notebook checkpoint, a `.pyc` — which is why builds are sometimes slow for no visible reason.",
    "**The build context is not the image**: 414.2 MB sent to the daemon against 0.188 MB with a `.dockerignore`, a factor of **2,209**, paid on every build.",
    "**`.venv` was the largest single contributor at 210 MB** — useless in the image, and harmful if a broad copy shadows the install.",
    "**Write `.dockerignore` as an allow-list** (`*` then `!src/`) so it fails closed, and treat it as a security control as well as a cost one.",
    "**Each `RUN` is its own layer**, so `apt-get update` and `apt-get install` belong in one instruction; BuildKit cache mounts persist the pip cache across builds without baking it into a layer."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A Dockerfile has `COPY . .` followed by `RUN pip install -r requirements.txt`. What happens when you change one line of source?",
        options: [
          "Only the COPY layer rebuilds, since pip has nothing to do with your source",
          "The COPY layer's key changes, which invalidates every layer above it, so pip re-downloads and rebuilds all dependencies — measured here as 186.3 MB against 0.03 MB for the correct order",
          "Nothing rebuilds, because pip detects the packages are already installed"
        ],
        answer: 1,
        why: "A layer's cache key includes its parent's digest, so invalidation always propagates upward. The dependency install has no relationship to your source code and is redone anyway — a 7,346x difference in work per edit, fixed by moving one line."
      },
      {
        stem: "Your image is 200 MB but builds are slow even when nothing has changed. What should you measure?",
        options: [
          "The image's layer count, since more layers means slower pulls",
          "The build context — a realistic working tree measured 414.2 MB here, against 0.188 MB with a .dockerignore, and the context is sent before any instruction runs",
          "The base image's pull time from the registry"
        ],
        answer: 1,
        why: "The context and the image are different sizes and are reduced by different means: .dockerignore shrinks the context, multi-stage and a slim base shrink the image. The context cost is paid on every build and is nearly invisible in the log."
      },
      {
        stem: "Why does `.venv` in the build context cause more than just a size problem?",
        options: [
          "It makes the image larger by 210 MB",
          "A broad `COPY . .` bakes it in and it can shadow the dependencies installed in the image — an environment built for a different platform taking precedence",
          "pip refuses to install when a virtual environment is present"
        ],
        answer: 1,
        why: "It was the largest single context contributor at 210 MB, but the worse failure is a copied-in environment built for the developer's platform shadowing the one the image installed. Excluding it fixes both, and an allow-list .dockerignore prevents the whole class."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "mid",
        q: "How would you make a Docker build faster?",
        strong: "Two numbers, measured rather than guessed. First the layer ordering: install dependencies before copying source, because a layer's cache key includes its parent's digest, so `COPY . .` above a `pip install` invalidates the install on every code edit. I measured that at 186.3 MB of dependencies rebuilt per edit against 0.03 MB of source for the correct order — about 7,000 times the work from one misplaced line. Second the build context, which is separate from the image and sent before any instruction runs: a realistic working tree was 414 MB, or 0.19 MB with a .dockerignore, so a factor of 2,200 paid on every build. After those two, copy narrowly rather than `COPY . .`, and split training requirements from serving requirements — torch was 447 MB in my measurement, more than twice the whole sklearn serving stack.",
        answer: [
          { t: "p", text: "Leading with the two measurements, and distinguishing the context from the image, is what makes this concrete. Most answers give the ordering rule without the mechanism or the magnitude." },
          { t: "p", text: "The requirements split is the one that saves the most in ML specifically, and it is free, so it is worth raising unprompted." }
        ]
      },
      {
        level: "senior",
        q: "Explain Docker's build cache and how it gets invalidated.",
        strong: "Each instruction produces a layer, and a layer is content-addressed — named by the hash of its contents. The cache key for a step is the parent layer's digest plus the instruction text plus, for COPY and ADD, a hash of the files being copied. So invalidation always propagates upward: once one layer's key changes, every layer above it is rebuilt regardless of whether it depends on the change. That is why the ordering rule exists, and it is also why builds appear randomly slow — a broad `COPY . .` hashes incidental files, so a notebook checkpoint or a .pyc rewrite busts the dependency layer. The two mechanics I would add: each RUN is its own layer, so apt-get update and install must be one instruction or you can cache a stale index separately from the install; and BuildKit cache mounts persist the pip download cache across builds without putting it in a layer, which makes a genuine dependency change much cheaper.",
        answer: [
          { t: "p", text: "Stating the cache key precisely — parent digest, instruction, file hash for COPY — is the detail that separates understanding from pattern-matching, and the upward propagation is what makes the ordering rule inevitable rather than conventional." },
          { t: "p", text: "The 'randomly slow builds' diagnosis is a good thing to volunteer because it is a real symptom with a non-obvious cause." }
        ]
      }
    ]
  }
});
