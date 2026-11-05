EC.receiveLesson({
  id: "8.1",

  lede: "The parts of the filesystem that come up in an ML incident, and they are not the parts a general Linux tutorial emphasises. Permissions matter because lesson 4.3's image runs as uid 10001 and lesson 4.4 measured a bind mount's host ownership colliding with it — `Permission denied` with no mention of uid mapping. Disk matters because the thing that fills a node is almost always checkpoints or image layers, and `du` on the wrong directory finds neither. And the single most useful fact about disk is that **deleting a file an open process still holds does not free the space** — which is why `df` and `du` disagree during exactly the incident where you need them to agree.",

  objectives: [
    "Read and set a permission string, and explain the ownership collision with a container's non-root user",
    "Find what filled a disk, including the cases `du` cannot see",
    "Explain why deleted-but-open files make `df` and `du` disagree",
    "Name the directories that fill on an ML node and how to bound them"
  ],

  prerequisites: ["7.4"],

  blocks: [

    { t: "h2", n: "01", id: "perms", text: "Permissions, and the collision that matters",
      sub: "uid 10001 against a host directory owned by 1000" },

    { t: "p", text: "The triple is read/write/execute for owner, group and others, as three octal digits. The two values worth knowing by sight: **755** is `rwxr-xr-x` — owner can write, everyone can read and execute, correct for a directory or a script — and **644** is `rw-r--r--`, correct for a file nobody needs to execute. A model artifact is **644**, not 755; it is data, and marking data executable is noise that obscures the files that genuinely are." },

    { t: "p", text: "On a directory, **execute means *traverse*** rather than run. A directory with `r--` can have its names listed and nothing inside it opened, which is the cause of a specific confusing failure: `ls` works and every path under it fails." },

    { t: "callout", kind: "trap", title: "The ownership collision from lesson 4.4, in detail",
      body: [
        { t: "p", text: "Lesson 4.3's image creates `appuser` with uid **10001**. Lesson 4.4 bind-mounted a host directory owned by the developer's uid **1000**. The container's process cannot write to it, and the error is a bare `Permission denied` that mentions neither uid." },
        { t: "p", text: "The reason is that **the kernel compares numbers, not names.** A uid is an integer; the mapping to a name comes from `/etc/passwd`, which the container and the host each have their own copy of. So `appuser` inside and `venuk` outside are the same entity if and only if their numbers match — and nothing warns you when they do not." },
        { t: "p", text: "Which is why lesson 5.4's `fsGroup: 10001` exists: it tells Kubernetes to set group ownership of mounted volumes to that gid, so the container's user can write. A named volume (lesson 4.4) avoids the problem because the daemon initialises ownership from the image." }
      ] },

    { t: "p", text: "Two further mechanics come up in ML specifically. **`umask`** subtracts from the default permissions of newly created files, so a training job writing checkpoints under a umask of 077 produces files only its own user can read — which breaks the next job that runs as someone else. And **the sticky bit** on `/tmp` (`1777`, shown as `drwxrwxrwt`) is why a shared `/tmp` works at all: anyone may create a file there, and only its owner may delete it." },

    { t: "h2", n: "02", id: "df", text: "Why `df` and `du` disagree",
      sub: "The most useful disk fact there is" },

    { t: "p", text: "`df` asks the filesystem how many blocks are allocated. `du` walks the directory tree and adds up the files it can see. They answer different questions, and during an incident the gap between them is the answer." },

    { t: "p", text: "The mechanism: on Linux, **deleting a file only removes the directory entry.** The data is freed when the last reference is dropped — and an open file descriptor is a reference. So a process holding a deleted 40 GB log file keeps 40 GB allocated, while `du` cannot see it because there is no longer a name pointing at it." },

    { t: "code", lang: "bash", title: "The diagnosis, in two commands",
      code: `# df says the disk is full; du says the files total far less.
$ df -h /var/lib/docker
Filesystem      Size  Used Avail Use% Mounted on
/dev/nvme0n1p1  200G  198G  2.0G  99% /var/lib/docker
$ du -sh /var/lib/docker
61G     /var/lib/docker

# the 137 GB difference is held open by a process:
$ lsof +L1          # files with a link count of zero -- deleted, still open
COMMAND   PID  USER  FD   TYPE  SIZE/OFF  NLINK  NODE NAME
python   4411  app    7w   REG  147G      0      983 /var/log/train.log (deleted)

# the fix is to restart the holder; rm will not help, the name is gone` },

    { t: "callout", kind: "insight", title: "Rotating a log the wrong way is how this happens",
      body: [
        { t: "p", text: "The classic cause is a rotation that moves or deletes the file without telling the writer. The process still holds its descriptor and keeps appending — to a file with no name — so the disk fills invisibly and the new log file stays empty, which makes it look as though logging stopped." },
        { t: "p", text: "`logrotate` has `copytruncate` for writers that cannot be signalled, and the correct pattern otherwise is to signal the process to reopen. A training job writing its own log and a rotation policy that does not know about it is a common ML version of this." }
      ] },

    { t: "p", text: "The other invisibility is the mirror image: **a filesystem mounted over a non-empty directory hides what is beneath it.** If `/data` had 80 GB in it and then a volume was mounted at `/data`, that 80 GB is still allocated and `du /data` shows only the volume. Unmounting reveals it." },

    { t: "p", text: "And the failure that is not about space at all: **inode exhaustion.** `df -i` reports inode usage, and a filesystem with free bytes and no free inodes refuses to create files with `No space left on device` — a message that sends everyone to look at `df -h`, which shows space available. The ML cause is a directory of millions of tiny files: one per image, one per shard, one per cached feature." },

    { t: "h2", n: "03", id: "whatfills", text: "What actually fills an ML node",
      sub: "Four directories, in order of likelihood" },

    { t: "p", text: "`du -sh /*` is the reflex and it misses the usual culprits, because they are not in the places a general guide lists." },

    { t: "diagram", kind: "matrix", id: "dg-8_1-03-0",
      title: "The four directories that fill, and what bounds each",
      caption: "The first two are the ML-specific ones and neither is bounded by default. **A checkpoint directory grows at a rate you chose when you set the save frequency** — lesson 10.3's spot-instance checkpointing makes it worse, deliberately.",
      rows: ["Checkpoint / artifact dirs", "Container image layers", "Logs", "Caches: HF, pip, dataset"],
      cols: ["Why it grows", "What bounds it"],
      cells: [
        [{ text: "every epoch, and nothing prunes", tone: "crit" }, { text: "keep-last-N, and a retention job", tone: "good" }],
        [{ text: "every build and pull, never GC'd", tone: "crit" }, { text: "image GC thresholds on the kubelet", tone: "good" }],
        [{ text: "unbounded by default", tone: "warn" }, { text: "rotation that the writer knows about", tone: "good" }],
        [{ text: "model weights, wheels, datasets", tone: "warn" }, { text: "an emptyDir, so it dies with the pod", tone: "good" }]
      ] },

    { t: "p", text: "**Checkpoints are the first thing to check and the easiest to fix.** A training run saving every epoch for a hundred epochs keeps a hundred copies of the model, and PyTorch's `state_dict` for a large model is gigabytes each. `save_total_limit`, or an explicit keep-last-N, is the fix, and it has to be set because the default is to keep everything." },

    { t: "p", text: "**Image layers are the commonest cause of a full Kubernetes node**, and they are not in a directory anyone thinks to inspect — `/var/lib/containerd` or `/var/lib/docker`. Lesson 4.2 measured a serving stack at 186 MB of dependencies and torch at 446.7 MB; a node that has pulled thirty versions of such an image over a month is carrying tens of gigabytes of layers that nothing is running. The kubelet's image garbage collection handles it, triggered by disk-usage thresholds, and the thing to know is that **it only collects unused images** — so a node pinned above the threshold by running images will not recover." },

    { t: "p", text: "**Caches are the ML-specific surprise**: `~/.cache/huggingface` holding model weights, `~/.cache/pip` holding wheels, a dataset cache holding a decompressed copy of everything. In a container these belong in an `emptyDir` (lesson 5.4) so they vanish with the pod — and if they are on the image's writable layer instead, they count against the node's disk and against `ephemeral-storage` limits." },

    { t: "h2", n: "04", id: "ephemeral", text: "Ephemeral storage, and the eviction nobody expects",
      sub: "Where lesson 5.3's limits meet the disk" },

    { t: "p", text: "Lesson 5.3 covered CPU and memory limits and what each does at the cap. There is a third resource with its own behaviour: **ephemeral-storage**, which covers the container's writable layer, its logs and any `emptyDir`." },

    { t: "p", text: "Exceeding it does not throttle and does not OOMKill — **the pod is evicted**, which is a different event with a different message, and the pod is rescheduled, possibly onto a node where it does the same thing. A training job writing checkpoints to an `emptyDir` with no `ephemeral-storage` limit set will happily fill the node and take other pods down with it, because the kubelet evicts to protect the node." },

    { t: "code", lang: "yaml", title: "The limit that is usually omitted",
      code: `resources:
  requests:
    cpu: "2"
    memory: 512Mi
    ephemeral-storage: 2Gi      # almost always absent
  limits:
    cpu: "2"
    memory: 512Mi
    ephemeral-storage: 8Gi      # checkpoints + logs + emptyDir, bounded` },

    { t: "callout", kind: "good", title: "Set it, and know that `medium: Memory` moves the cost",
      body: [
        { t: "p", text: "Lesson 5.4 noted that an `emptyDir` with `medium: Memory` is a tmpfs — which is the fix for lesson 4.1's 64 MB `/dev/shm` problem. The consequence here is that its contents then count against the **memory** limit rather than ephemeral storage, and lesson 5.3 measured this service's resident floor at 260.9 MB, so a 2 GB tmpfs needs the memory limit to accommodate it." },
        { t: "p", text: "Two resources, one directory, and which one you are spending depends on a single field." }
      ] },

    { t: "h2", n: "05", id: "find", text: "The commands worth memorising",
      sub: "Six, in the order an incident uses them" },

    { t: "diagram", kind: "steps", id: "dg-8_1-05-0",
      title: "A disk-full investigation, in order",
      caption: "**The first two steps catch the two invisible cases** that `du` cannot see, which is why they come before walking the tree. Most guides start at step three and miss both.",
      items: [
        { label: "df -h and df -i together", desc: "Space and inodes. Free bytes with no free inodes gives 'No space left on device' while df -h looks fine." },
        { label: "Compare df against du -sh on the same path", desc: "A large gap means deleted-but-open files: lsof +L1 names the holder, and only a restart frees them." },
        { label: "du -x -d1 /path | sort -h, descending", desc: "-x stays on one filesystem, so a mounted volume is not walked. -d1, then descend: a full du on a big tree is slow." },
        { label: "Check the ML-specific directories by name", desc: "/var/lib/containerd, checkpoint dirs, ~/.cache/huggingface, ~/.cache/pip. None appears in a generic guide." },
        { label: "find for the biggest files, not the biggest dirs", desc: "find /path -xdev -type f -size +1G -exec ls -lh {} + finds the single 40 GB file a directory summary averages away." }
      ] },

    { t: "p", text: "One note on `du -x`: without it, `du` crosses mount points and walks the network volume or the tmpfs you mounted, which both takes a long time and attributes space to the wrong place. With it, `du` measures the filesystem `df` was talking about, which is the comparison in step two." },

    { t: "exercise", kind: "practice", title: "Reproduce the invisible disk", difficulty: "intro", minutes: 25,
      prompt: "On any Linux machine or container, create the deleted-but-open case deliberately: write a large file from a process you keep running, delete the file while the process holds it, then compare `df -h` and `du -sh` on that filesystem and confirm the gap. Use `lsof +L1` to find the holder. Then check two things on a real ML node or container: run `df -i` and see how close the inode usage is to the limit, and locate your checkpoint directory and container image directory and measure both. Finally, check whether any pod spec you own sets an `ephemeral-storage` limit.",
      hints: [
        "`python -c \"f=open('big','wb'); f.write(b'0'*(2*10**9)); import os; os.remove('big'); input()\"` holds the descriptor open while you look.",
        "`du -x` matters: without it you may be measuring a different filesystem from the one `df` reported on.",
        "The ephemeral-storage limit is almost always absent, and its absence is how a training job evicts its neighbours."
      ],
      solution: {
        notes: [
          { t: "p", text: "Doing the deleted-but-open case by hand is what makes it recognisable later, and it is the single most useful disk diagnosis there is — because the symptom (df full, du small) sends people looking for files that do not exist while the space is held by a process nobody suspects." },
          { t: "p", text: "The ephemeral-storage check usually finds nothing set, which means a checkpoint directory is bounded only by the node's disk. A job that fills it is evicted, which looks like a scheduling problem rather than a storage one — and it takes its neighbours with it, because the kubelet evicts to protect the node." }
        ]
      } }

  ],

  takeaways: [
    "**755 is `rwxr-xr-x`, 644 is `rw-r--r--`**, and a model artifact is 644 — it is data, and marking data executable obscures the files that genuinely are.",
    "**On a directory, execute means traverse**, so `r--` lets you list names and open nothing — `ls` works and every path under it fails.",
    "**The kernel compares uid numbers, not names.** A container's `appuser` at 10001 and a host user at 1000 are different entities, which is lesson 4.4's bare `Permission denied`.",
    "**`fsGroup` exists for exactly that**, and a named volume avoids it because the daemon initialises ownership from the image.",
    "**`umask` on a training job's checkpoints can make them unreadable to the next job**, which runs as a different user.",
    "**Deleting a file an open process holds does not free the space** — the data goes when the last descriptor closes, so `df` is full and `du` is small.",
    "**`lsof +L1` names the holder, and only a restart frees it.** `rm` cannot help: the name is already gone.",
    "**A bad log rotation is the usual cause**: the writer keeps appending to a nameless file while the new log stays empty, so it looks as though logging stopped.",
    "**A mount over a non-empty directory hides what is beneath it**, still allocated and invisible to `du` until unmounted.",
    "**Inode exhaustion reports `No space left on device` with free bytes** — `df -i` is the check, and millions of tiny files is the ML cause.",
    "**Checkpoints are unbounded by default.** Keep-last-N is the fix, and lesson 10.3's spot checkpointing makes the growth deliberate.",
    "**Container image layers are the commonest full Kubernetes node**, in `/var/lib/containerd`, and the kubelet's image GC only collects *unused* images.",
    "**Exceeding `ephemeral-storage` evicts the pod** — not throttled, not OOMKilled — and the limit is almost always omitted, so a checkpoint directory is bounded by the node's disk.",
    "**`emptyDir` with `medium: Memory` moves the cost to the memory limit**, which matters against lesson 5.3's 260.9 MB floor.",
    "**Start a disk investigation with `df` vs `du` and `df -i`**, not with `du -sh /*`, because the two invisible cases are invisible to `du` by construction."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "`df -h` reports a filesystem 99% full. `du -sh` on the same path totals less than a third of that. What is happening?",
        options: [
          "`du` is excluding hidden files and needs `-a`",
          "Files have been deleted while a process still holds them open — the space stays allocated until the descriptor closes, and `du` cannot see them because the names are gone",
          "The filesystem needs an fsck to reclaim orphaned blocks"
        ],
        answer: 1,
        why: "`lsof +L1` lists files with a link count of zero and names the holding process. `rm` cannot help because there is no longer a name to remove — only closing the descriptor, usually by restarting the process, frees the space. A bad log rotation is the classic cause."
      },
      {
        stem: "Your container runs as uid 10001 and cannot write to a bind-mounted host directory owned by uid 1000. Why does the error say only 'Permission denied'?",
        options: [
          "The mount is read-only and the error is misleading",
          "The kernel compares uid numbers rather than names, and the container and host each have their own /etc/passwd — so nothing in the error can mention a mapping that does not exist",
          "Bind mounts require the container to run as root"
        ],
        answer: 1,
        why: "A uid is an integer; the name is a userspace lookup. `appuser` inside and a developer's account outside are the same entity only if the numbers match. `fsGroup` in a pod spec sets group ownership of the mount to a gid the container's user has, and a named volume avoids the issue entirely."
      },
      {
        stem: "A training pod writes checkpoints to an emptyDir with no `ephemeral-storage` limit. It fills the node's disk. What happens?",
        options: [
          "Writes begin to fail with ENOSPC but the pod keeps running",
          "The kubelet evicts the pod to protect the node — not throttled like CPU, not OOMKilled like memory — and it may be rescheduled onto another node to do the same thing",
          "The emptyDir is automatically capped at the node's available disk"
        ],
        answer: 1,
        why: "Ephemeral storage is the third resource with its own failure mode: eviction. Because the limit is usually omitted, the checkpoint directory is bounded only by the node's disk, and the eviction takes neighbouring pods' stability with it — which looks like a scheduling problem rather than a storage one."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "mid",
        q: "A node's disk is full. How do you investigate?",
        strong: "I would start with the two checks that find the cases `du` cannot see. First `df -h` against `du -sh` on the same path: if `df` says full and `du` says much less, files have been deleted while a process holds them open, so the space is allocated with no name pointing at it — `lsof +L1` names the holder and only a restart frees it, which is usually a log rotation that did not tell the writer. Second `df -i`, because free bytes with no free inodes reports 'No space left on device' while `df -h` looks fine, and millions of tiny files is a common ML cause. Then `du -x -d1` descending, with `-x` so I do not walk a mounted volume. And I would check the ML-specific directories by name, because they are not in a generic guide: container image layers under /var/lib/containerd, checkpoint directories, and the Hugging Face and pip caches.",
        answer: [
          { t: "p", text: "Leading with the two invisible cases is what distinguishes this from reciting `du -sh /*`, and both have a distinctive symptom worth naming." },
          { t: "p", text: "The ML-specific directory list is the domain knowledge: image layers and checkpoints are the usual answers and neither is where a general guide points." }
        ]
      },
      {
        level: "senior",
        q: "What resource limits would you set on a training job, and what happens at each cap?",
        strong: "CPU, memory and ephemeral-storage, and the three behave completely differently at the limit, which is the reason to set all three deliberately. CPU throttles, so the job just runs slower and the symptom is invisible in usage graphs — CFS throttling is the metric. Memory cannot be throttled, so exceeding it is an OOMKill with exit 137, and for this kind of service the floor is almost entirely imports: I measured 261 MB resident with a 1.6 MB model. Ephemeral-storage is the one people omit, and exceeding it evicts the pod rather than throttling or killing it — so a training job writing checkpoints to an emptyDir with no limit is bounded only by the node's disk, and when it fills the node the kubelet evicts to protect it, taking neighbouring pods' stability with it. I would also bound the checkpoints themselves with a keep-last-N, because the default is to keep every epoch and a large model's state_dict is gigabytes each.",
        answer: [
          { t: "p", text: "Three resources with three distinct failure modes — throttle, kill, evict — is the structure, and the eviction one is the gap in most answers." },
          { t: "p", text: "Bounding the checkpoints as well as the storage shows the cause is being addressed rather than the symptom, and it connects to the spot-instance checkpointing trade-off." }
        ]
      },
      {
        level: "mid",
        q: "A container gets 'Permission denied' writing to a directory that looks writable. Why, and what are the fixes?",
        strong: "The kernel compares numbers, not names. The image runs as uid 10001, the bind-mounted host directory belongs to uid 1000, and the two /etc/passwd files never meet, so the error cannot mention a mapping that does not exist. I would confirm it with `id` inside the container and `ls -ln` on the mount, which prints the numbers rather than the names. Then the fix depends on where it runs. In Kubernetes, `fsGroup` sets group ownership of the volume to a gid the process has. In Docker, a named volume takes its ownership from the image, so the collision never arises. Running the container as root also makes the error go away, and it is the fix I would refuse, because it trades a permissions bug for a security one. I would also check `umask` if a job writes files that the next job cannot read, which is the same class of failure one step later.",
        answer: [
          { t: "p", text: "`ls -ln` is the detail worth saying aloud: `ls -l` translates through the local passwd file and hides the very numbers the kernel is comparing." },
          { t: "p", text: "Rejecting root explicitly matters, because it is the fix that appears to work, and an interviewer is listening for whether you stop there." }
        ]
      }
    ]
  }
});
