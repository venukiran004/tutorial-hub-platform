EC.receiveLesson({
  id: "4.1",

  lede: "A container is three kernel features and a tarball, and every practical difference from a virtual machine follows from one of them: **namespaces** decide what a process can see, **cgroups** decide what it can consume, and a **shared kernel** decides what it cannot have at all. Getting that straight explains the ML-specific consequences that surprise people — why a GPU needs a runtime shim, why PyTorch's DataLoader dies with a cryptic shared-memory error at default settings, and why your container reads 64 GB of RAM from inside while being killed at 2 GB. **No docker daemon is reachable on this machine**, so this lesson is mechanism and consequence; the measurable parts of module 4 are in 4.2 and 4.5.",

  objectives: [
    "Explain container isolation in terms of namespaces, cgroups and a shared kernel",
    "Derive the practical differences from a VM rather than memorising a table",
    "Name the three ML-specific consequences of a shared kernel: GPU access, shared memory and what the process sees",
    "Decide when a VM is the right answer instead"
  ],

  prerequisites: ["3.6"],

  blocks: [

    { t: "callout", kind: "note", title: "What is executed in this module, and what is not",
      body: [
        { t: "p", text: "There is no docker daemon here — the Python SDK (docker 7.2.0) imports and `from_env()` fails with `CreateFile`. So nothing in module 4 is built or run." },
        { t: "p", text: "Two things in the module **are** measured, because they do not need a daemon: lesson 4.2's build-context and layer-cache arithmetic, computed from the real sizes of the libraries installed here, and lesson 4.5's whiteout demonstration, which reads a secret back out of a real tar stream. Everything else, including this lesson, is mechanism with its consequences named." }
      ] },

    { t: "h2", n: "01", id: "three", text: "Three mechanisms",
      sub: "Everything else is a consequence" },

    { t: "p", text: "The usual container-versus-VM table — *lighter, faster to start, shares the kernel* — is a list of symptoms. The causes are three independent Linux features that predate Docker by years, and Docker's contribution was to make them convenient together." },

    { t: "dl", items: [
      { k: "Namespaces: what it can see", v: "A namespace gives a process a private view of one kind of resource. PID (its own process tree, where your app is pid 1), mount (its own filesystem view), network (its own interfaces and ports), UTS (its own hostname), IPC, and user (uid mapping). Isolation here is about *visibility*." },
      { k: "cgroups: what it can consume", v: "Control groups cap and account CPU, memory, I/O and process count. This is where `--memory=2g` lives, and where the OOM kill comes from. Isolation here is about *quantity*." },
      { k: "A shared kernel: what it cannot have", v: "There is exactly one kernel, and every container uses it. No container has its own kernel version, its own kernel modules, or its own device drivers — which is the single most consequential fact for ML workloads." }
    ] },

    { t: "diagram", kind: "layers", id: "dg-4_1-01-0",
      title: "Where the boundary is, in each case",
      caption: "The difference is which layer is duplicated. **A VM virtualises the hardware and runs its own kernel; a container partitions one kernel's view of itself.** Everything in the comparison table follows from where that line sits.",
      items: [
        { label: "Containers: app + libs, per container", desc: "Each container has its own filesystem and libraries, but they all call the same kernel. Startup is a process start." },
        { label: "One shared kernel, partitioned by namespaces and cgroups", desc: "The boundary. One kernel version, one set of modules, one device layer for everybody." },
        { label: "VMs: app + libs + a full guest kernel, per VM", desc: "Each VM boots its own kernel, so it can differ in version and modules. Startup is a boot." },
        { label: "Hypervisor, then hardware", desc: "A VM's boundary sits here, which is why its isolation is stronger and its overhead larger." }
      ] },

    { t: "h2", n: "02", id: "derive", text: "Deriving the differences",
      sub: "Four claims, each from one mechanism" },

    { t: "p", text: "With the three mechanisms in hand, the comparison stops being a list to memorise." },

    { t: "table",
      head: ["The claim", "Which mechanism explains it"],
      rows: [
        ["Starts in milliseconds, not a boot", "No kernel to boot — `docker run` is a process start with namespaces attached."],
        ["Much smaller on disk", "No guest kernel and no duplicated OS; the image is a tar of userland. Lesson 4.2 measures what that userland actually weighs."],
        ["Weaker isolation than a VM", "Shared kernel: a kernel vulnerability is a shared boundary. A VM's boundary is the hypervisor."],
        ["Cannot run a different kernel version", "Shared kernel, directly. A Linux container cannot run on a Windows kernel — which is why Docker Desktop runs a Linux VM."],
        ["Resource limits are enforced but not virtualised", "cgroups cap consumption; they do not change what `/proc` reports, which is the trap in section 3."]
      ] },

    { t: "callout", kind: "mental", title: "A container is a process, not a machine",
      body: [
        { t: "p", text: "This one sentence resolves most confusion. There is no boot, no init system by default, no syslog, no cron, and your application is **pid 1** — which means it inherits pid 1's signal semantics and is responsible for reaping zombies. A process that ignores SIGTERM because it assumed something else would handle shutdown will be SIGKILLed after the grace period, mid-request." },
        { t: "p", text: "Lesson 8.2 covers the signal distinction properly. The container-specific consequence is that **graceful shutdown is your application's job**, and in Kubernetes the grace period is 30 seconds by default (lesson 5.2)." }
      ] },

    { t: "h2", n: "03", id: "ml", text: "Three consequences for ML specifically",
      sub: "All three follow from the shared kernel" },

    { t: "p", text: "The generic comparison misses the three things that actually bite an ML workload, and all three are the shared kernel presenting its bill." },

    { t: "p", text: "**The GPU is a device, and devices belong to the kernel.** A container has no driver of its own, so using a GPU means the host's driver is exposed into the container and the userland libraries inside must match it. That is what the NVIDIA Container Toolkit does — it injects device nodes and the driver's user-space components at run time. The practical consequence is a version coupling you cannot containerise away: the image carries CUDA userland, the host carries the driver, and they have to be compatible. An image that runs on one node and fails on another with a CUDA initialisation error is almost always this." },

    { t: "p", text: "**Shared memory is namespaced and tiny by default.** Docker gives `/dev/shm` 64 MB. PyTorch's `DataLoader` with `num_workers > 0` passes tensors between worker processes through shared memory, so the default blows up on anything with real batches — the error is a `Bus error` or *DataLoader worker (pid N) is killed by signal*, which names nothing relevant. The fix is `--shm-size` (or a `Memory`-backed `emptyDir` on `/dev/shm` in Kubernetes), and it is the single most common first-day container failure in training." },

    { t: "p", text: "**The process does not see its own limits.** cgroups constrain what a container may consume; they do not rewrite `/proc/meminfo` or the CPU count. So a library that sizes itself from the host — thread pools from `os.cpu_count()`, a cache from total RAM — will size itself for the *node*, inside a container limited to a fraction of it." },

    { t: "callout", kind: "trap", title: "`os.cpu_count()` in a container is the node's CPU count",
      body: [
        { t: "p", text: "A 64-core node running a container limited to 2 CPUs still reports 64 to the process. Every library that defaults its thread pool to the CPU count — numpy's BLAS, torch, joblib, OpenMP — creates 64 threads to share two cores' worth of quota. The result is heavy context switching and *worse* throughput than a single thread, plus latency that looks like the queueing problem from lesson 12.2 without being it." },
        { t: "p", text: "The fix is to set the thread counts explicitly from the cgroup limit rather than letting them default: `OMP_NUM_THREADS`, `torch.set_num_threads`, `joblib`'s `n_jobs`. Lesson 3.4 measured that thread count also changes torch's *results* — three thread counts gave three different prediction digests — so this is a reproducibility input as well as a performance one." }
      ] },

    { t: "diagram", kind: "matrix", id: "dg-4_1-03-0",
      title: "The three ML consequences, and the fix for each",
      caption: "Each row is the shared kernel showing through. **None of them is a Docker bug** — they are the price of not having your own kernel, and all three have a one-line fix that nobody mentions until the first failure.",
      rows: ["GPU access", "Shared memory 64 MB", "Limits not virtualised"],
      cols: ["The symptom", "The fix"],
      cells: [
        [{ text: "CUDA init fails on one node, works on another", tone: "crit" }, { text: "container toolkit; match CUDA to the driver", tone: "good" }],
        [{ text: "DataLoader worker killed by signal", tone: "crit" }, { text: "--shm-size, or a Memory emptyDir on /dev/shm", tone: "good" }],
        [{ text: "64 threads on 2 CPUs of quota", tone: "crit" }, { text: "set OMP_NUM_THREADS explicitly", tone: "good" }]
      ] },

    { t: "h2", n: "04", id: "when", text: "When a VM is the right answer",
      sub: "And the middle ground" },

    { t: "p", text: "The honest cases for a VM over a container follow from the same three mechanisms, read in reverse." },

    { t: "dl", items: [
      { k: "You need a different kernel", v: "A specific kernel version, a custom module, an eBPF program, a filesystem the host does not have. The shared kernel forbids it outright." },
      { k: "The isolation boundary must be stronger", v: "Running untrusted code — a customer's notebook, an arbitrary model artifact. A container escape is a kernel bug away; a VM escape is a hypervisor bug away, and the latter is a much smaller surface." },
      { k: "The workload is the whole machine anyway", v: "A single training job occupying eight GPUs for three days gains nothing from container packing, and a VM image is a simpler artifact to reason about." }
    ] },

    { t: "p", text: "And the middle ground is worth knowing: **gVisor** and **Kata Containers** present a container interface while providing a stronger boundary — gVisor by intercepting syscalls in userspace, Kata by running each container in a lightweight VM. Both cost performance, and both are how multi-tenant notebook platforms run untrusted code without handing out kernel-adjacent trust." },

    { t: "callout", kind: "insight", title: "The real reason containers won for ML is the dependency problem",
      body: [
        { t: "p", text: "Not density, and not startup time. It is that an ML service's behaviour depends on the exact versions of a deep stack — Python, numpy, scikit-learn or torch, CUDA userland — and lesson 1.3 showed a pickle is coupled to those versions, while lesson 3.4 showed library versions can move a metric silently." },
        { t: "p", text: "An image is a **content-addressed snapshot of that entire stack**, which makes the environment fingerprint from lesson 1.2 something you can actually pin and ship rather than merely record. That is the property worth having, and it is why the environment hash in a run record should be an image digest rather than a list of version strings." }
      ] },

    { t: "exercise", kind: "practice", title: "Find your own three", difficulty: "intro", minutes: 20,
      prompt: "For a containerised ML workload you have access to, check the three shared-kernel consequences. Inside the container, print `os.cpu_count()` and the memory your runtime believes it has, then compare both against the container's actual limits — if they differ, find which libraries sized their thread pools from the wrong number. Check what `/dev/shm` is set to and whether any training job uses DataLoader workers. And if there is a GPU, record the host driver version and the CUDA userland version in the image, then say which node images would fail on. Write down the one-line fix for each one you find.",
      hints: [
        "`nproc` and `os.cpu_count()` will both report the node unless something sets the thread counts explicitly.",
        "`df -h /dev/shm` inside the container tells you immediately whether the 64 MB default is still in place.",
        "The GPU version pair is worth writing into the image's labels, so a mismatch is readable without running it."
      ],
      solution: {
        body: [
          { t: "p", text: "The thread-count mismatch is nearly universal and the cheapest to fix. Setting `OMP_NUM_THREADS` to the CPU limit typically improves tail latency measurably, because the contention it removes was never buying any parallelism." },
          { t: "p", text: "The `/dev/shm` check only matters if DataLoader workers are in use, but when it does matter the failure is so cryptic — a bus error naming a worker pid — that recognising it is worth more than most container knowledge." }
        ]
      } }

  ],

  takeaways: [
    "**Three mechanisms explain everything**: namespaces (what it can see), cgroups (what it can consume), a shared kernel (what it cannot have).",
    "**A container is a process, not a machine.** No boot, no init, and your app is pid 1 — so graceful shutdown and signal handling are your application's job.",
    "**Startup is milliseconds because there is no kernel to boot**, and the image is small because there is no guest kernel to carry.",
    "**Isolation is weaker than a VM** because the kernel is the shared boundary; a VM's boundary is the hypervisor, a much smaller surface.",
    "**The GPU is a device and devices belong to the kernel** — hence the container toolkit, and a version coupling between CUDA userland in the image and the host driver that you cannot containerise away.",
    "**`/dev/shm` defaults to 64 MB**, which is why PyTorch DataLoader workers die with a bus error; fix with `--shm-size` or a Memory-backed emptyDir.",
    "**cgroups cap consumption without virtualising it**: a 2-CPU container on a 64-core node still reports 64, so thread pools size themselves 32x too large.",
    "**Set `OMP_NUM_THREADS` and torch's thread count explicitly** — and remember lesson 3.4 measured thread count changing torch's results, not just its speed.",
    "**Use a VM when you need a different kernel, a stronger boundary for untrusted code, or the whole machine anyway**; gVisor and Kata are the middle ground.",
    "**Containers won for ML because of the dependency problem, not density** — an image is a content-addressed snapshot of the whole stack.",
    "**So the environment fingerprint from 1.2 should be an image digest**, which is pinnable and shippable, rather than a list of version strings."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A container is limited to 2 CPUs on a 64-core node. What does `os.cpu_count()` return inside it, and why does that matter?",
        options: [
          "2, because cgroups virtualise the CPU count",
          "64 — cgroups cap consumption without rewriting what the process sees, so every library defaulting its thread pool to the CPU count creates 64 threads for 2 cores of quota",
          "64, but libraries detect the cgroup limit automatically"
        ],
        answer: 1,
        why: "The resulting contention makes throughput worse than a single thread and produces latency that resembles queueing without being it. The fix is to set OMP_NUM_THREADS, torch's thread count and joblib's n_jobs explicitly from the limit."
      },
      {
        stem: "Your PyTorch training job fails with 'DataLoader worker (pid 1234) is killed by signal: Bus error'. What is the most likely cause?",
        options: [
          "The container's memory limit is too low and the OOM killer intervened",
          "/dev/shm is at Docker's 64 MB default, and DataLoader workers pass tensors through shared memory",
          "The dataset is corrupt at the index the worker was reading"
        ],
        answer: 1,
        why: "A bus error from a DataLoader worker is the signature of exhausted shared memory, and the message names nothing relevant. An OOM kill presents differently — SIGKILL with the cgroup's memory events recording it. The fix is --shm-size or a Memory-backed emptyDir on /dev/shm."
      },
      {
        stem: "Why can't a container run a different kernel version from its host?",
        options: [
          "Because the container runtime forbids it for security reasons",
          "Because there is only one kernel and containers are namespaced views of it — the kernel is not part of the image",
          "Because images do not include a bootloader"
        ],
        answer: 1,
        why: "This single fact also explains why a Linux container cannot run on a Windows kernel (Docker Desktop runs a Linux VM), why custom kernel modules and eBPF need a VM, and why the isolation boundary is weaker than a hypervisor's."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "mid",
        q: "Explain the difference between a container and a virtual machine.",
        strong: "A VM virtualises hardware and boots its own kernel; a container is a process on the host kernel with a partitioned view of it. Three mechanisms do the work: namespaces decide what it can see — its own process tree, mounts, network; cgroups decide what it can consume, which is where memory limits and OOM kills come from; and the kernel is shared, which is what it cannot have. Everything in the usual comparison follows: milliseconds to start because there is no boot, small images because there is no guest kernel, weaker isolation because the kernel is the shared boundary, and no ability to run a different kernel version. For ML specifically the shared kernel is the one that bites — GPU access needs the host driver injected, /dev/shm defaults to 64 MB which breaks DataLoader workers, and cgroup limits are not virtualised so os.cpu_count() reports the node.",
        answer: [
          { t: "p", text: "Deriving the comparison from three mechanisms rather than reciting a table is what distinguishes this answer, and it makes the follow-up questions easy to handle." },
          { t: "p", text: "The three ML consequences are the part that signals you have debugged containers rather than read about them, and each one is a concrete first-day failure." }
        ]
      },
      {
        level: "senior",
        q: "When would you not containerise an ML workload?",
        strong: "Three cases, all from the shared kernel. When I need a different kernel — a specific version, a custom module, eBPF — a container cannot provide it. When the isolation boundary has to be stronger than a kernel bug, which is the case for running untrusted code like a customer's notebook or an arbitrary model artifact; there I would use a VM, or gVisor or Kata as the middle ground that keeps the container interface. And when the workload is the whole machine anyway — a training job holding eight GPUs for three days gains nothing from packing, and a VM image is a simpler artifact. I would add that for serving I almost always do containerise, and not for density: it is because an ML service's behaviour depends on an exact deep stack, so an image is a content-addressed snapshot of the environment, which turns the environment fingerprint in a run record into something pinnable rather than merely recorded.",
        answer: [
          { t: "p", text: "Deriving the exceptions from the same mechanism keeps the answer coherent instead of a list of anecdotes, and naming gVisor/Kata shows awareness of the middle ground." },
          { t: "p", text: "The closing point reframes containers as a reproducibility tool rather than a packing tool, which is the more accurate account for ML and connects to the provenance material." }
        ]
      }
    ]
  }
});
