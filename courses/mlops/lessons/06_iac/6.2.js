EC.receiveLesson({
  id: "6.2",

  lede: "Ansible and Terraform are compared constantly and model different things: Terraform owns **whether a resource exists**, Ansible owns **what is true inside one that does**. The distinction has a precise test — if deleting the declaration should delete the thing, it is Terraform's. Ansible's genuinely interesting property is that it is **agentless**: it works over SSH against anything with Python, which is why it survives on GPU boxes under someone's desk and bare-metal training clusters that no cloud API describes. For containerised ML it is mostly the wrong tool, and this lesson says where the exceptions are.",

  objectives: [
    "State the boundary between provisioning and configuration management with a usable test",
    "Explain what agentless means and when it is the deciding property",
    "Recognise Ansible's idempotency model and how a playbook loses it",
    "Decide honestly whether an ML platform needs Ansible at all"
  ],

  prerequisites: ["6.1"],

  blocks: [

    { t: "callout", kind: "note", title: "Presented, not executed",
      body: [
        { t: "p", text: "Ansible is not installed on this machine and there is no host to configure, so nothing here is run. The playbooks are the interface; lesson 6.1's state-file failures were executed because they are algorithmic, and this lesson's claims are not of that kind." }
      ] },

    { t: "h2", n: "01", id: "boundary", text: "Two different questions",
      sub: "And a test that settles which tool" },

    { t: "p", text: "The two tools sound alike — both declarative, both YAML-ish, both idempotent — and they answer different questions." },

    { t: "p", text: "**Terraform: does this resource exist, and with what shape?** Its unit is a cloud resource, its memory is the state file from lesson 6.1, and its characteristic action is create or destroy." },

    { t: "p", text: "**Ansible: given a machine, is the following true of it?** Its unit is a host, it has **no state file at all**, and its characteristic action is *converge this host toward the described condition*." },

    { t: "callout", kind: "mental", title: "The test: should deleting the declaration delete the thing?",
      body: [
        { t: "p", text: "If removing a block from your configuration should **destroy** a real resource, that is Terraform — and lesson 6.1 showed exactly that mechanism: in state, absent from config, therefore destroyed." },
        { t: "p", text: "If removing a task should just mean *we no longer assert this*, leaving the host as it is, that is Ansible. A playbook has no record of what it previously did, so it cannot un-apply anything. That is a limitation and also the thing that makes it safe on hosts it does not own." }
      ] },

    { t: "p", text: "The consequence worth internalising: **Ansible cannot clean up after itself.** Delete a task that installed a package and the package stays installed on every host that ran the old playbook. There is no `ansible destroy`, because there is nothing recording that the task ever ran." },

    { t: "h2", n: "02", id: "agentless", text: "Agentless, and why it matters for ML",
      sub: "The property that decides the remaining cases" },

    { t: "p", text: "Ansible needs no daemon on the target. It opens an SSH connection, copies a small Python module across, runs it, collects the result, deletes it. The target needs SSH and a Python interpreter, and nothing else." },

    { t: "p", text: "For cloud-native work that is unremarkable. For ML infrastructure it is sometimes the deciding property, because ML has more machines-that-are-not-cloud-resources than most disciplines:" },

    { t: "dl", items: [
      { k: "On-premise GPU boxes", v: "The workstation with four GPUs that the research team bought. No cloud API describes it, so Terraform has nothing to manage — but driver versions, CUDA, and the shared `/data` mount all need to be consistent with the cluster, and lesson 4.1 established that a CUDA userland mismatch against the host driver is a real failure." },
      { k: "Bare-metal training clusters", v: "Owned hardware for cost reasons. Node provisioning is a hardware process; everything above the OS is configuration management." },
      { k: "Driver and kernel-module installation", v: "Specifically the thing a container cannot do for itself. Lesson 4.1: there is one kernel, and the NVIDIA driver belongs to it, not to an image." },
      { k: "A bootstrap on a VM that will not be rebuilt", v: "A jump host, a long-lived notebook server, a licence server. Terraform creates the instance; something has to configure it." }
    ] },

    { t: "code", lang: "yaml", title: "A GPU node playbook (presented, not executed)",
      code: `- hosts: gpu_nodes
  become: true
  vars:
    driver_version: "550.90.07"
  tasks:
    - name: the driver version the cluster's CUDA images expect
      ansible.builtin.apt:
        name: "nvidia-driver-{{ driver_version }}"
        state: present
      notify: reboot if the driver changed

    - name: nvidia container toolkit, so pods can see the device
      ansible.builtin.apt:
        name: nvidia-container-toolkit
        state: present

    - name: /dev/shm large enough for DataLoader workers (lesson 4.1)
      ansible.builtin.lineinfile:
        path: /etc/docker/daemon.json
        regexp: '"default-shm-size"'
        line: '  "default-shm-size": "2G",'
      notify: restart docker

    - name: record what was converged, for the host inventory
      ansible.builtin.copy:
        dest: /etc/ml-node-version
        content: "driver={{ driver_version }} converged={{ ansible_date_time.iso8601 }}\\n"` },

    { t: "p", text: "Three things in that playbook are the point. The driver version is **pinned to what the cluster's images expect**, which is lesson 4.1's coupling made explicit in one place. `/dev/shm` is raised from the 64 MB default that kills DataLoader workers. And the last task writes a file recording what was converged and when — because Ansible keeps no state, so if you want to know a host's configuration later, the host has to carry it." },

    { t: "h2", n: "03", id: "idempotent", text: "Idempotency is per-module, not free",
      sub: "And `shell` is where it is lost" },

    { t: "p", text: "Ansible's idempotency is a property of each module rather than of the framework. `apt: state=present` checks whether the package is installed and does nothing if it is — that is the module's implementation, not magic." },

    { t: "p", text: "Which means the escape hatch breaks it:" },

    { t: "code", lang: "yaml", title: "Where idempotency goes",
      code: `# NOT idempotent: appends every run, so the file grows for ever
- shell: echo "export CUDA_HOME=/usr/local/cuda" >> /etc/profile

# idempotent: the module checks before writing
- ansible.builtin.lineinfile:
    path: /etc/profile
    line: 'export CUDA_HOME=/usr/local/cuda'

# a shell command made idempotent by hand
- shell: /opt/setup-cluster.sh
  args:
    creates: /opt/.cluster-configured      # skip if this path exists` },

    { t: "p", text: "`creates` and `removes` are the manual version of lesson 3.1's marker file, and the resemblance is exact: a sentinel path standing in for *this has already been done*. Lesson 3.1 also gave the rule that applies here — write the marker **after** the work, or a crash mid-task makes the step permanently skipped." },

    { t: "callout", kind: "good", title: "`--check --diff` is the plan, and it is weaker than Terraform's",
      body: [
        { t: "p", text: "`ansible-playbook --check --diff` reports what would change without changing it, which is the closest equivalent to `terraform plan`. It is genuinely useful and it is not as reliable: modules implement check mode themselves, a `shell` task cannot predict its own effect, and a task whose behaviour depends on an earlier task's result may report wrongly because that earlier task did not run." },
        { t: "p", text: "So a clean `--check` is reassurance rather than a guarantee, where a Terraform plan file is the exact set of API calls that will be made. That difference is a good reason to prefer Terraform for anything it can express." }
      ] },

    { t: "h2", n: "04", id: "compare", text: "The honest comparison",
      sub: "Including the case for both" },

    { t: "diagram", kind: "matrix", id: "dg-6_2-04-0",
      title: "Terraform against Ansible, on the axes that decide",
      caption: "The first two rows are the real distinction. **Terraform knows what it made and can destroy it; Ansible knows nothing and therefore cannot** — which is why one is for resources and the other for hosts.",
      rows: ["Unit", "Memory", "Can it clean up?", "Target needs", "Plan quality"],
      cols: ["Terraform", "Ansible"],
      cells: [
        [{ text: "a cloud resource", tone: "accent" }, { text: "a host", tone: "accent" }],
        [{ text: "a state file", tone: "good" }, { text: "none", tone: "warn" }],
        [{ text: "yes — destroy is a first-class action", tone: "good" }, { text: "no — a removed task is simply not asserted", tone: "warn" }],
        [{ text: "an API and credentials", tone: "good" }, { text: "SSH and Python; no agent", tone: "good" }],
        [{ text: "exact: a saved plan is the API calls", tone: "good" }, { text: "approximate: --check is per-module", tone: "warn" }]
      ] },

    { t: "p", text: "And the combination, which is the common real answer: **Terraform creates the machine, Ansible configures it.** Terraform provisions a GPU node pool and outputs the instance addresses; an Ansible playbook converges driver versions, the container toolkit and the shared mounts on them. Each tool is used for the question it answers." },

    { t: "p", text: "The modern alternative is worth stating, because it often wins: **build the configuration into the image** instead of converging a running host. Packer or a Dockerfile produces an immutable artifact, Terraform launches it, and nothing is configured in place at all. That removes configuration drift as a category — there is no long-lived host to drift — and it is why containerised ML platforms mostly do not need Ansible." },

    { t: "h2", n: "05", id: "verdict", text: "Does an ML platform need it?",
      sub: "Usually not, and here is when it does" },

    { t: "diagram", kind: "steps", id: "dg-6_2-05-0",
      title: "The decision, in the order the questions arrive",
      caption: "The first question eliminates Ansible for most container-native teams. **Its remaining territory is real and narrow**: hardware you own, and the kernel-adjacent things a container cannot do for itself.",
      items: [
        { label: "Is every host disposable and image-built?", desc: "Then you need neither: bake it into the image, let Terraform launch it, and drift has nowhere to accumulate." },
        { label: "Do you own physical machines or long-lived VMs?", desc: "On-prem GPU boxes, bare metal, a jump host. No cloud API describes them, so Terraform has nothing to manage." },
        { label: "Does something kernel-adjacent need installing?", desc: "GPU drivers, kernel modules, the container toolkit, shm defaults. One kernel, and no image changes it." },
        { label: "Otherwise: Terraform plus images", desc: "And if you adopt it anyway: it cannot clean up, so a removed task leaves the package installed." }
      ] },

    { t: "exercise", kind: "practice", title: "Classify your own infrastructure", difficulty: "intro", minutes: 20,
      prompt: "List every machine your ML workloads touch — cloud instances, cluster nodes, on-prem GPU boxes, notebook servers, jump hosts — and for each one answer two questions. Is it disposable and rebuilt from an image, or is it long-lived and configured in place? And is anything kernel-adjacent installed on it: a GPU driver, a kernel module, a container runtime setting such as the shm default? Then apply the deletion test to three things in your Terraform configuration: if you removed the block, should the real resource be destroyed? Any that should not is in the wrong tool or needs `ignore_changes`.",
      hints: [
        "The machine nobody lists is usually the one that matters: an on-prem GPU box, or a notebook server someone set up by hand two years ago.",
        "A host configured in place with no record of what was done to it is the case Ansible's final 'record what was converged' task addresses.",
        "If everything is disposable and image-built, the honest conclusion is that you need neither Ansible nor a configuration-management strategy."
      ],
      solution: {
        body: [
          { t: "p", text: "Most container-native teams find every host is disposable and the answer is Terraform plus images, which is a legitimate conclusion rather than a gap. The exception is almost always GPU hardware: drivers are kernel-adjacent, so an image cannot supply them, and the version has to match what the containers' CUDA userland expects." },
          { t: "p", text: "The deletion test usually finds one resource that should not be destroyed if its block disappears — frequently a bucket holding data or a long-lived database. Those want `prevent_destroy` in their lifecycle block, which is the guardrail lesson 6.1 named." }
        ]
      } }

  ],

  takeaways: [
    "**Terraform owns whether a resource exists; Ansible owns what is true inside one that does.** Different questions, not competing answers.",
    "**The test: should deleting the declaration delete the thing?** If yes it is Terraform's — in state, absent from config, therefore destroyed.",
    "**Ansible has no state file, so it cannot clean up after itself.** Remove a task and the package stays installed on every host that ran the old playbook.",
    "**Agentless means SSH plus Python and nothing else** — no daemon on the target, which is why it reaches machines no cloud API describes.",
    "**That property decides the ML cases**: on-prem GPU boxes, bare-metal training clusters, and anything kernel-adjacent.",
    "**GPU drivers are the clearest example.** Lesson 4.1: there is one kernel, so an image cannot supply a driver, and the version must match the containers' CUDA userland.",
    "**Pin the driver version in one place** and raise `/dev/shm` above the 64 MB default that kills DataLoader workers.",
    "**Have the playbook write what it converged onto the host**, because Ansible keeps no record and the host is the only place that can carry it.",
    "**Idempotency is per-module, not a framework property.** `shell: echo >> file` appends every run; `lineinfile` checks first.",
    "**`creates:` is lesson 3.1's marker file by another name**, with the same rule — write it after the work, not before.",
    "**`--check --diff` is weaker than `terraform plan`**: modules implement check mode themselves and a `shell` task cannot predict its effect, so a clean check is reassurance rather than a guarantee.",
    "**The common real answer is both**: Terraform creates the machine, Ansible converges it.",
    "**The modern answer is often neither** — bake the configuration into an image, launch it with Terraform, and configuration drift has nowhere to accumulate."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "You delete a task from an Ansible playbook that installed a package. What happens on the next run?",
        options: [
          "The package is removed, since it is no longer declared",
          "Nothing — Ansible has no state file, so it has no record that the task ever ran and cannot un-apply it; the package stays installed everywhere",
          "The run fails because the host no longer matches the playbook"
        ],
        answer: 1,
        why: "This is the sharpest difference from Terraform, where in-state-and-absent-from-config means destroy. Ansible asserts conditions rather than owning resources, which is a limitation and also what makes it safe to run against hosts it does not own."
      },
      {
        stem: "Which of these is a genuine reason an ML platform might need Ansible?",
        options: [
          "To deploy model serving containers to the cluster",
          "To install and pin GPU drivers on nodes — a container cannot supply a kernel driver, and the version must match the CUDA userland in the images",
          "To create the cloud instances the nodes run on"
        ],
        answer: 1,
        why: "The first is Kubernetes' job and the third is Terraform's. The driver case is genuine because of lesson 4.1's shared kernel: the driver belongs to the kernel, not to an image, so something has to configure the host — and that version coupling is a real source of nodes where images fail."
      },
      {
        stem: "Why is `ansible-playbook --check` less trustworthy than `terraform plan`?",
        options: [
          "It runs more slowly and times out on large inventories",
          "Check mode is implemented per module, a `shell` task cannot predict its own effect, and a task depending on an earlier task's result may report wrongly because that task did not run",
          "It cannot connect to hosts without making changes"
        ],
        answer: 1,
        why: "A Terraform plan file is the exact set of API calls that will be made. A clean Ansible check is reassurance rather than a guarantee, which is a good reason to prefer Terraform for anything it can express and to keep `shell` tasks to a minimum."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "mid",
        q: "What is the difference between Terraform and Ansible?",
        strong: "They answer different questions. Terraform owns whether a resource exists and with what shape; its unit is a cloud resource and it keeps a state file, so it can destroy what it made. Ansible asks, given a machine, whether a set of conditions is true of it; its unit is a host and it keeps no state, so it cannot clean up — delete a task that installed a package and the package stays installed on every host that ran the old playbook. The test I use is whether deleting the declaration should delete the thing: if yes it is Terraform's. Ansible's distinguishing property is being agentless, just SSH and Python, which is why it still matters for machines no cloud API describes — on-prem GPU boxes, bare metal, and anything kernel-adjacent like a GPU driver, which a container cannot supply.",
        answer: [
          { t: "p", text: "The deletion test is a compact, memorable way to state the boundary, and the no-cleanup consequence is the detail that shows the state difference has been thought through." },
          { t: "p", text: "Bringing it to the ML-specific case — drivers, because of the shared kernel — makes the answer about this domain rather than generic DevOps." }
        ]
      },
      {
        level: "senior",
        q: "Would you use Ansible on a containerised ML platform?",
        strong: "Mostly not, and I would say what replaces it. If every host is disposable and built from an image, the configuration belongs in the image — Packer or a Dockerfile produces an immutable artifact, Terraform launches it, and configuration drift has nowhere to accumulate because there is no long-lived host. That removes a whole category of problem rather than managing it. Where I would still reach for Ansible is the narrow set that is genuinely not a cloud resource: on-prem GPU workstations, bare-metal training nodes, and kernel-adjacent installation — the NVIDIA driver and container toolkit, and host settings like the /dev/shm default that breaks DataLoader workers at 64 MB. In those cases agentless matters, because there is no API and no agent to install. And I would have the playbook write a file recording what it converged, since Ansible keeps no state and the host is the only thing that can carry it.",
        answer: [
          { t: "p", text: "Arguing for immutable images over configuration management, and framing it as eliminating a category rather than managing one, is the senior position." },
          { t: "p", text: "Naming the narrow remaining territory precisely — and the record-what-converged habit — keeps it from sounding dismissive of a tool that still has real uses." }
        ]
      }
    ]
  }
});
