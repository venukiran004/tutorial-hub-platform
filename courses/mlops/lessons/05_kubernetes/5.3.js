EC.receiveLesson({
  id: "5.3",

  lede: "The arithmetic module 5 can actually run. **A 256 MB memory limit OOMKills this course's model service before it serves a request** — the resident floor is 260.9 MB, almost all of it scipy and scikit-learn being imported. Requests and limits together decide a **QoS class** you do not choose directly, and a pod with neither set is the first thing evicted. The HPA formula is simple, but its best-case reaction time is **44.8 seconds** once you add up the scrape interval, the sync period, scheduling, the 2.82-second boot measured in lesson 2.1 and the readiness delay. And the reason CPU is the wrong scaling signal for inference is in the queueing: at 70% utilisation latency is already **3.3× the service time**, at 95% it is **20×**.",

  objectives: [
    "Derive a pod's QoS class from its requests and limits, and say what the class decides",
    "Set a memory limit from measured residency rather than from guesswork",
    "Compute HPA's reaction time and say why it is too slow for a cold model",
    "Explain why queue depth beats CPU utilisation as an inference scaling signal"
  ],

  prerequisites: ["5.2"],

  blocks: [

    { t: "h2", n: "01", id: "two", text: "Requests and limits do different jobs",
      sub: "One is for the scheduler, one is for the kernel" },

    { t: "p", text: "They are written next to each other and are not variations of one idea." },

    { t: "p", text: "**A request is a scheduling claim.** The scheduler sums the requests of all pods on a node and will not place a pod whose request does not fit in what remains. It is a reservation, and nothing enforces it at run time — a pod requesting 500m CPU can use four cores if the node is idle." },

    { t: "p", text: "**A limit is a kernel-enforced cap**, and the two resources behave completely differently at the cap. **CPU is throttled**: exceed it and the cgroup's CPU bandwidth controller simply gives you less, so the process runs slower. **Memory is not throttleable** — you cannot have less of a byte you have already allocated — so exceeding a memory limit means the kernel's OOM killer terminates the process. `OOMKilled`, exit code 137." },

    { t: "callout", kind: "mental", title: "CPU limits throttle, memory limits kill",
      body: [
        { t: "p", text: "This asymmetry is the whole reason memory limits need measuring and CPU limits mostly do not. A CPU limit set too low produces a slow service and a confusing latency graph; a memory limit set too low produces a crash loop, and often one that only appears under load or after a few hours." },
        { t: "p", text: "It also means CPU throttling is invisible unless you look for it: the container is not failing, it is being given less time slice than it asked for, and the metric to watch is `container_cpu_cfs_throttled_seconds_total` rather than CPU usage." }
      ] },

    { t: "h2", n: "02", id: "qos", text: "The QoS class you did not choose",
      sub: "Derived from what you set, and it decides eviction order" },

    { t: "p", text: "Kubernetes assigns every pod one of three quality-of-service classes, derived from the relationship between its requests and its limits. You cannot set it directly." },

    { t: "code", lang: "python", title: "m5.py — deriving the class from the numbers",
      out: `== 1. QoS class, derived from requests and limits ==
  case                 cpu req    cpu lim    mem req    mem lim    QoS
  none set             -          -          -          -          BestEffort
  requests only        500        -          1024       -          Burstable
  limits only          -          1000       -          2048       Guaranteed  (requests defaulted to limits)
  requests < limits    500        1000       1024       2048       Burstable
  requests == limits   1000       1000       2048       2048       Guaranteed

  eviction order under node memory pressure:
    BestEffort first, then Burstable over its request, then Guaranteed
  -> a model server with no requests set is the first thing killed.` },

    { t: "p", text: "The third row is the surprise worth knowing: **setting only limits produces `Guaranteed`**, because Kubernetes defaults the requests to equal the limits. So the laziest complete specification and the most careful one land in the same class, while the apparently reasonable middle — requests below limits — is `Burstable`." },

    { t: "p", text: "What the class decides is the **eviction order when a node runs out of memory**. `BestEffort` pods go first, then `Burstable` pods using more than they requested, and `Guaranteed` pods last. So a model server with no resources specified at all is the first thing the kubelet kills to save a node — and nothing in its manifest hints at that." },

    { t: "diagram", kind: "matrix", id: "dg-5_3-02-0",
      title: "The three classes, and what each one buys",
      caption: "**`Guaranteed` is the right class for a serving pod** and costs you flexibility: requests equal to limits means you reserve your peak, so the node packs less densely. For a latency-sensitive endpoint that is the correct trade.",
      rows: ["BestEffort", "Burstable", "Guaranteed"],
      cols: ["How you get it", "What it means in practice"],
      cells: [
        [{ text: "set nothing", tone: "crit" }, { text: "evicted first; no scheduling claim at all", tone: "crit" }],
        [{ text: "requests < limits", tone: "warn" }, { text: "can burst, evicted when over its request", tone: "warn" }],
        [{ text: "requests == limits, or limits alone", tone: "good" }, { text: "evicted last; reserves peak", tone: "good" }]
      ] },

    { t: "h2", n: "03", id: "memory", text: "What a memory limit has to cover",
      sub: "260.9 MB before the first request" },

    { t: "p", text: "Setting a memory limit by guesswork is how a crash loop is created. Here is the floor for this course's service, built from the real package footprints measured in lesson 4.2." },

    { t: "code", lang: "python", title: "m5.py — the resident floor, and three candidate limits",
      out: `== 2. what a memory limit actually has to cover ==
  component                                MB
  python interpreter + stdlib            45.0
  numpy                                  33.0
  scipy                                 112.7
  scikit-learn                           40.6
  fastapi + uvicorn + pydantic           28.0
  the model artifact, in memory           1.6
  resident floor                        260.9  <- before serving a single request

  limit  256 MB -> headroom     -4.9 MB   OOMKilled on startup
  limit  512 MB -> headroom   +251.1 MB   OK
  limit 1024 MB -> headroom   +763.1 MB   OK` },

    { t: "p", text: "**256 MB — a number that looks generous for a service whose model is 1.6 MB — is 4.9 MB short of being able to start.** The model is 0.6% of the floor; scipy alone is 43% of it. The container is OOMKilled during imports, before any request arrives, and the only symptom is exit code 137 with no application log." },

    { t: "p", text: "The batch arithmetic underneath it makes the point sharper: a batch of a thousand applicants is **0.0305 MB** of array. The variable cost of serving is negligible; essentially all of the memory is the fixed cost of having imported the scientific Python stack." },

    { t: "callout", kind: "trap", title: "Do not derive the limit from package sizes — measure RSS under load",
      body: [
        { t: "p", text: "The table above is an illustration of where the memory goes, not a method. Installed size and resident size are different: not every module is imported, pages are shared copy-on-write between forked workers, and the cgroup counts **page cache** against the limit, so a process that reads files accrues chargeable memory that is not its own heap." },
        { t: "p", text: "The method is to run the container under realistic load and read `container_memory_working_set_bytes`, then set the request at the steady state and the limit with headroom above the peak. Lesson 12.3 measures the leak case, where the peak keeps moving and the limit is eventually reached whatever it was set to." }
      ] },

    { t: "h2", n: "04", id: "hpa", text: "HPA, and the 44.8 seconds nobody budgets",
      sub: "The formula is simple; the latency is not" },

    { t: "p", text: "The HorizontalPodAutoscaler is lesson 5.1's control loop with replicas as the output. The formula is one line." },

    { t: "code", lang: "python", title: "m5.py — the HPA formula",
      out: `  HPA formula: desired = ceil(current_replicas * current / target)

  replicas   metric     target       desired      note
  3          0.90       0.70         4            scale up
  3          0.70       0.70         3            hold
  3          0.35       0.70         2            scale down
  10         0.95       0.70         14           scale up
  10         0.20       0.70         3            scale down` },

    { t: "p", text: "Note the last row: ten replicas at 20% utilisation yields a desired count of **three**, a 70% reduction in one decision. That is why `behavior.scaleDown.stabilizationWindowSeconds` exists and defaults to 300 — without it, a dip in traffic removes most of your capacity immediately and the next spike has nothing to absorb it." },

    { t: "p", text: "The part that is routinely ignored is how long the loop takes to produce a serving pod." },

    { t: "code", lang: "python", title: "m5.py — the reaction time, with lesson 2.1's measured boot",
      out: `  the lag nobody budgets for, using lesson 2.1's measured boot:
    metrics-server scrape interval                 15.0 s
    HPA sync period                                15.0 s
    pod scheduling                                  2.0 s
    image pull (warm node)                          0.0 s
    container start + imports (measured 2.1)        2.8 s
    readiness probe period + success               10.0 s
    -> total, best case                            44.8 s

  a traffic spike is absorbed by the EXISTING replicas for 45 s.` },

    { t: "p", text: "**44.8 seconds, best case** — with a warm image cache, instant scheduling and a fast boot. The application's own startup is **2.8 of those 45 seconds**: six percent. The rest is the platform's observation and decision latency, which no amount of optimising your container will reduce." },

    { t: "callout", kind: "insight", title: "The existing replicas absorb the whole spike",
      body: [
        { t: "p", text: "For 45 seconds, nothing new arrives. If replicas were at 70% utilisation and traffic triples, they are at 210% of capacity for three quarters of a minute — the queue grows for the entire window, and section 5 shows what queueing does to latency." },
        { t: "p", text: "So HPA is for **sustained** changes in load, not for spikes. The things that actually handle a spike are: enough baseline replicas that a burst fits in the headroom, a `minReplicas` floor that never lets you scale to a point where one pod matters, and for expensive models a warm pool. On a cold node, add the image pull — hundreds of megabytes of the dependencies measured in lesson 4.2 — and 45 seconds becomes minutes." }
      ] },

    { t: "p", text: "The other two autoscalers complete the picture. The **VerticalPodAutoscaler** adjusts requests and limits rather than replica count, and in its default mode it must **restart the pod** to apply them — which makes it a recommender for serving and genuinely useful for batch. The **cluster autoscaler** adds nodes when pods are unschedulable, which is a further few minutes on top of everything above, and is why `Pending` pods during a spike are a capacity planning problem rather than an autoscaling one." },

    { t: "h2", n: "05", id: "queue", text: "Why CPU is the wrong signal",
      sub: "Latency against utilisation, from the measured service time" },

    { t: "p", text: "*Scale at 70% CPU* is the conventional target, and the number is not arbitrary — it comes from queueing theory. With the 1.936 ms service time measured in lesson 2.1, an M/M/1 approximation gives the latency multiplier directly." },

    { t: "code", lang: "python", title: "m5.py — W = S / (1 - rho)",
      out: `== 4. CPU utilisation vs queue depth, from Little's law ==
  Service time measured in 2.1: 1.936 ms end to end, of which the
  model is 0.581 ms (30%). One replica sustained 474.2 req/s.

  M/M/1 queue: W = S / (1 - rho). Latency against utilisation:
  rho          wait W (ms)    W / S          verdict
  0.50         3.872          2.0            fine
  0.70         6.453          3.3            fine
  0.80         9.680          5.0            degrading
  0.90         19.360         10.0           degrading
  0.95         38.720         20.0           runaway
  0.99         193.600        100.0          runaway` },

    { t: "p", text: "The curve is the justification for the convention. At 50% utilisation latency is twice the service time; at 70% it is **3.3×**; at 90% **10×**; at 99% **100×**. The knee is between 0.7 and 0.8, so *scale at 70%* means *scale before the knee*, and the apparently wasteful 30% of idle capacity is what buys predictable latency." },

    { t: "p", text: "But **CPU utilisation is a proxy for ρ, and for inference it is a poor one.** Three reasons, all of them measured or established earlier in this course:" },

    { t: "diagram", kind: "steps", id: "dg-5_3-05-0",
      title: "Three ways CPU misrepresents utilisation for inference",
      caption: "In each case ρ is high and CPU is not, so an HPA on CPU does not scale while latency degrades. **In-flight requests or queue depth measure ρ directly** and are available from the metrics lesson 7.1 exposes.",
      items: [
        { label: "A GPU model: 100% GPU, 15% CPU", desc: "The bottleneck is a device the HPA is not looking at. CPU stays low while the GPU queue grows." },
        { label: "A feature fetch: low CPU, high ρ", desc: "The request is blocked on I/O, so it occupies a worker without consuming CPU. Lesson 12.1 decomposes exactly this." },
        { label: "70% of the request is framework, not model", desc: "Measured in 2.1: 1.356 ms of 1.936 is HTTP, validation and JSON — so CPU reflects the framework more than the work." },
        { label: "So scale on in-flight requests or queue depth", desc: "Both measure occupancy directly. Available as a custom or external metric, which is what the HPA's v2 API is for." }
      ] },

    { t: "exercise", kind: "practice", title: "Set your own limits from measurement", difficulty: "core", minutes: 30,
      prompt: "For a model service, produce four numbers rather than four guesses. Run the container under realistic load and record the working-set memory at steady state and at peak — set the request at the former and the limit above the latter, then check which QoS class that gives you. Check `container_cpu_cfs_throttled_seconds_total`: if it is non-zero, your CPU limit is costing you latency invisibly. Compute your own HPA reaction time by adding your scrape interval, sync period, image pull on a cold node, measured boot time and readiness delay. Then ask whether your scaling metric measures occupancy or merely correlates with it, and work out the utilisation your target implies using W = S / (1 − ρ) with your measured service time.",
      hints: [
        "A model whose imports dominate residency — scipy was 43% of the floor here — has a memory profile almost independent of request volume.",
        "If your HPA reaction time exceeds the duration of your typical spike, the HPA is not what is handling your spikes; baseline replicas are.",
        "Non-zero CFS throttling with healthy CPU usage graphs is the signature of a CPU limit set too close to the request."
      ],
      solution: {
        body: [
          { t: "p", text: "The usual findings are a memory limit set to a round number nobody measured and a QoS class nobody knew they had. The round number is often fine and occasionally four megabytes short, which is the 256 MB case here: a crash loop with exit code 137 and no application log." },
          { t: "p", text: "The reaction-time calculation is the one that changes behaviour, because it reframes autoscaling as a tool for sustained load and makes the baseline replica count the thing that actually absorbs bursts." }
        ]
      } }

  ],

  takeaways: [
    "**A request is a scheduling claim, a limit is a kernel cap**, and nothing enforces a request at run time.",
    "**CPU limits throttle; memory limits kill.** You cannot have less of an allocated byte, so exceeding memory means OOMKilled with exit code 137.",
    "**CPU throttling is invisible** in usage graphs — watch `container_cpu_cfs_throttled_seconds_total`.",
    "**QoS is derived, not chosen**: nothing set is BestEffort, requests below limits is Burstable, requests equal to limits is Guaranteed — and **limits alone is also Guaranteed**, because requests default to them.",
    "**A pod with no resources set is the first thing evicted** under node memory pressure, with nothing in its manifest hinting at that.",
    "**The resident floor for this service is 260.9 MB**, so a 256 MB limit OOMKills it before it serves a request — 4.9 MB short.",
    "**scipy was 43% of that floor and the model was 0.6%**; a batch of a thousand rows is 0.0305 MB, so memory is almost entirely the fixed import cost.",
    "**Measure RSS under load rather than summing package sizes** — the cgroup charges page cache too, which is why installed size is not resident size.",
    "**HPA: desired = ceil(replicas × current / target)**, and ten replicas at 20% drops to three in one decision, which is why the scale-down stabilisation window defaults to 300 s.",
    "**Best-case HPA reaction is 44.8 s**, of which the application's 2.8 s boot is only six percent — the rest is platform observation and decision latency.",
    "**The existing replicas absorb the whole spike for those 45 seconds**, so HPA is for sustained load; baseline replicas and a warm pool handle bursts.",
    "**W = S / (1 − ρ)**: at 70% utilisation latency is 3.3× the service time, at 90% it is 10×, at 99% it is 100× — which is what 'scale at 70%' actually means.",
    "**CPU is a poor proxy for ρ in inference**: a GPU model is 100% GPU and 15% CPU, a feature fetch blocks without consuming CPU, and 70% of this request was framework. Scale on in-flight requests."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "A pod specifies only `limits` and no `requests`. What QoS class does it get?",
        options: [
          "Burstable, since requests are unspecified",
          "Guaranteed — Kubernetes defaults the requests to equal the limits",
          "BestEffort, because a request is what the scheduler needs"
        ],
        answer: 1,
        why: "This is the counterintuitive case: the minimal complete specification and the most careful one land in the same class, while the apparently reasonable middle — requests below limits — is Burstable and can be evicted when it exceeds its request."
      },
      {
        stem: "Your model service is OOMKilled at startup with a 256 MB limit, though the model file is only 1.6 MB. Why?",
        options: [
          "The model is decompressed in memory to many times its file size",
          "The resident floor is dominated by imports — measured at 260.9 MB, of which scipy alone was 112.7 MB and the model 1.6 MB — so 256 MB is 4.9 MB short of starting",
          "The limit must account for the image size as well as the process"
        ],
        answer: 1,
        why: "The model is 0.6% of the footprint and a thousand-row batch adds 0.03 MB, so memory is almost entirely the fixed cost of the scientific Python stack. The symptom is exit code 137 with no application log, since the kill happens during imports."
      },
      {
        stem: "Why is CPU utilisation a poor HPA metric for a model service?",
        options: [
          "CPU metrics are scraped too infrequently to be useful",
          "It is a proxy for occupancy and a weak one: a GPU model can be at 100% GPU and 15% CPU, a request blocked on a feature fetch occupies a worker without using CPU, and 70% of the measured request was framework rather than model",
          "CPU limits cause throttling, which makes the metric unreliable"
        ],
        answer: 1,
        why: "The queueing curve is what justifies a utilisation target at all — latency is 3.3x the service time at 70% and 10x at 90% — but the target needs a metric that measures occupancy. In-flight requests or queue depth do; CPU merely correlates, and for inference often does not."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "mid",
        q: "What is the difference between a resource request and a limit?",
        strong: "A request is a scheduling claim — the scheduler sums requests to decide what fits on a node — and nothing enforces it at run time, so a pod can exceed it on an idle node. A limit is a kernel-enforced cap, and the two resources behave completely differently at the cap: CPU is throttled, so the process just runs slower and the symptom is latency with healthy-looking CPU graphs, while memory cannot be throttled, so exceeding it means the OOM killer terminates the process with exit code 137. That asymmetry is why memory limits need measuring and CPU limits mostly do not. The two together also derive the QoS class, which decides eviction order — and a pod with neither set is BestEffort and the first thing killed under node pressure.",
        answer: [
          { t: "p", text: "The throttle-versus-kill asymmetry is the heart of the answer, and naming CFS throttling as the invisible symptom shows operational depth." },
          { t: "p", text: "Bringing QoS in unprompted is good, because it is the consequence most people do not connect to the two fields." }
        ]
      },
      {
        level: "senior",
        q: "How would you size and autoscale a model serving deployment?",
        strong: "Memory from measurement, not arithmetic: run it under realistic load and read the working set, request at steady state and limit above peak. For this kind of service the floor is almost entirely imports — I measured 261 MB resident with a 1.6 MB model, scipy alone being 113 MB — so memory is nearly independent of request volume, and a 256 MB limit OOMKills it before the first request. Requests equal to limits for Guaranteed QoS, because a latency-sensitive endpoint should be evicted last. For autoscaling I would not rely on the HPA for spikes: I computed its best-case reaction at about 45 seconds, of which my container's boot was 2.8 — the rest is scrape interval, sync period, scheduling and readiness, none of which I can optimise. So baseline replicas with headroom absorb bursts and the HPA handles sustained load. And I would scale on in-flight requests rather than CPU, because CPU is a weak proxy for occupancy here: 70% of the measured request was framework, and a GPU model or an I/O-blocked request shows low CPU with high occupancy.",
        answer: [
          { t: "p", text: "The 45-second reaction time with the breakdown is the most valuable number in the answer, because it reframes what the HPA is for and makes the baseline-replica argument inevitable." },
          { t: "p", text: "Choosing Guaranteed QoS deliberately, and saying why, shows the eviction consequence is understood rather than the field being filled in by habit." }
        ]
      }
    ]
  }
});
