/* ============================================================================
   LESSON 10.6 — Governance, Access and Data Residency
   ========================================================================= */
EC.receiveLesson({
  id: "10.6",

  lede: "An audit of an ML platform asks the same questions every time. Who and what can read the training data, and can you prove it? Is the data encrypted at rest and in transit, and who controls the keys? Does traffic stay on private networks? Is every access logged, and can you trace a model back to the data it learned from? And before any of these: is the data allowed to leave the country it was collected in? This lesson works through the controls behind each answer, with a policy evaluator, real envelope encryption, and a least-privilege policy generated from what a training job actually did.",

  objectives: [
    "Write least-privilege roles for training and serving, and understand how deny, allow and default deny combine",
    "Explain envelope encryption and why key rotation does not re-encrypt data",
    "List the network, logging and lineage controls an audit expects",
    "Generate a policy from access logs and test it against sensitive requests",
    "Treat data residency as a constraint that chooses the region first"
  ],

  prerequisites: ["10.1", "4.5"],

  blocks: [
    { t: "h2",
      n: "01",
      id: "iam",
      text: "Least privilege for a training job",
      sub: "Explicit deny, then allow, then deny by default" },
    { t: "p",
      text: "A training job runs under a role, and the role decides what it can touch. Cloud IAM evaluates every request the same way: an explicit **Deny** in any applicable policy wins; otherwise any **Allow** grants it; otherwise it is denied by default. The script evaluates requests against a narrow training role and against the convenient `s3:*` on `*` role that many teams start with. The evaluator implements only that precedence; real IAM adds conditions, resource policies, permission boundaries and organisation policies." },
    { t: "code",
      lang: "python",
      title: "policy.py — two roles, seven requests",
      code: `from fnmatch import fnmatchcase

# A simplified evaluator with the core rules of AWS IAM: an explicit Deny wins, then any Allow, otherwise deny.
# (Real IAM adds conditions, resource policies, boundaries and SCPs; the precedence below is the part to learn.)
def allowed(policies, action, resource):
    hits = [s for p in policies for s in p["Statement"]
            if any(fnmatchcase(action, a) for a in s["Action"]) and any(fnmatchcase(resource, r) for r in s["Resource"])]
    if any(s["Effect"] == "Deny" for s in hits): return "DENY (explicit)"
    if any(s["Effect"] == "Allow" for s in hits): return "allow"
    return "deny (implicit)"

training_role = [{"Statement": [
    {"Effect": "Allow", "Action": ["s3:GetObject", "s3:ListBucket"], "Resource": ["arn:aws:s3:::ml-data", "arn:aws:s3:::ml-data/train/*"]},
    {"Effect": "Allow", "Action": ["s3:PutObject"], "Resource": ["arn:aws:s3:::ml-models/runs/*"]},
    {"Effect": "Allow", "Action": ["logs:CreateLogStream", "logs:PutLogEvents"], "Resource": ["arn:aws:logs:eu-west-1:*:log-group:/ml/training*"]},
    {"Effect": "Deny", "Action": ["s3:*"], "Resource": ["arn:aws:s3:::ml-data/pii/*"]},
]}]
convenient_role = [{"Statement": [{"Effect": "Allow", "Action": ["s3:*", "logs:*"], "Resource": ["*"]}]}]

checks = [
    ("read training data", "s3:GetObject", "arn:aws:s3:::ml-data/train/part-0001.parquet"),
    ("write the model", "s3:PutObject", "arn:aws:s3:::ml-models/runs/2024-06-01/model.tar.gz"),
    ("write logs", "logs:PutLogEvents", "arn:aws:logs:eu-west-1:123456789012:log-group:/ml/training-ranking"),
    ("read PII", "s3:GetObject", "arn:aws:s3:::ml-data/pii/customers.parquet"),
    ("overwrite production model", "s3:PutObject", "arn:aws:s3:::ml-models/prod/model.tar.gz"),
    ("delete training data", "s3:DeleteObject", "arn:aws:s3:::ml-data/train/part-0001.parquet"),
    ("read another team's bucket", "s3:GetObject", "arn:aws:s3:::finance-reports/q2.xlsx"),
]
print(f"{'request':<30}{'least-privilege role':>22}{'s3:* on * role':>18}")
for label, action, res in checks:
    print(f"{label:<30}{allowed(training_role, action, res):>22}{allowed(convenient_role, action, res):>18}")`,
      out: `request                         least-privilege role    s3:* on * role
read training data                             allow             allow
write the model                                allow             allow
write logs                                     allow             allow
read PII                             DENY (explicit)             allow
overwrite production model           deny (implicit)             allow
delete training data                 deny (implicit)             allow
read another team's bucket           deny (implicit)             allow` },
    { t: "dl",
      items: [
        { term: "What the convenient role allows",
          def: "Everything: reading PII, overwriting the production model, deleting training data and reading another team's finance bucket. A bug or a compromised dependency in the training code inherits all of it." },
        { term: "Explicit deny as a guard rail",
          def: "The narrow role also carries a Deny on the PII prefix, so a later Allow added by mistake cannot open it. Deny statements are the controls that survive policy drift." },
        { term: "Separate roles per stage",
          def: "Training reads data and writes run artefacts; deployment promotes a model to production; serving reads one model. Three roles, so a training job cannot replace the production model." }
      ] },
    { t: "callout",
      kind: "trap",
      title: "One role for the whole pipeline",
      body: [
        { t: "p",
          text: "A single role used by notebooks, training, the pipeline and serving must be allowed everything any of them needs, so each of them can do everything. When it leaks, through a notebook token or a dependency, the blast radius is the whole platform. Roles per stage are cheap to create and the first thing an auditor checks." }
      ] },
    { t: "h2", n: "02", id: "encryption", text: "Encryption and keys", sub: "Envelope encryption, measured" },
    { t: "p",
      text: "Cloud storage encryption is **envelope encryption**. Each object is encrypted with its own data key; the data key is stored alongside the object, encrypted (wrapped) by a key-encryption key held in a key management service that never releases it. Reading an object means asking the KMS to unwrap its data key, which is an authorised, logged call, so the key policy is a second access control on the data." },
    { t: "viz",
      title: "Envelope encryption",
      caption: "The KMS key only ever encrypts small data keys. Rotating it means re-wrapping those keys; the data itself is never re-encrypted.",
      svg: `<svg viewBox="0 0 760 215" width="100%" role="img">
<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--ink-2)"/></marker></defs>
<line x1="170.0" y1="46.0" x2="250.0" y2="46.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<text x="210.0" y="40.0" text-anchor="middle" class="s-sub">encrypts</text>
<line x1="420.0" y1="46.0" x2="500.0" y2="46.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="335.0" y1="145.0" x2="335.0" y2="72.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<line x1="420.0" y1="171.0" x2="500.0" y2="171.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<text x="460.0" y="165.0" text-anchor="middle" class="s-sub">encrypts</text>
<line x1="600.0" y1="145.0" x2="600.0" y2="72.0" style="stroke:var(--ink-2)" stroke-width="1.6" marker-end="url(#ah)"/>
<rect x="10" y="20" width="160" height="52" rx="8" class="s-fill" style="stroke:var(--crit);stroke-width:1.8"/>
<text x="90.0" y="42" text-anchor="middle" class="s-label" style="fill:var(--crit)">KMS key</text>
<text x="90.0" y="60" text-anchor="middle" class="s-sub">never leaves KMS</text>
<rect x="250" y="20" width="170" height="52" rx="8" class="s-fill" style="stroke:var(--violet);stroke-width:1.8"/>
<text x="335.0" y="42" text-anchor="middle" class="s-label" style="fill:var(--violet)">Wrapped data key</text>
<text x="335.0" y="60" text-anchor="middle" class="s-sub">stored with object</text>
<rect x="500" y="20" width="200" height="52" rx="8" class="s-fill" style="stroke:var(--accent);stroke-width:1.8"/>
<text x="600.0" y="42" text-anchor="middle" class="s-label" style="fill:var(--accent)">Object store</text>
<text x="600.0" y="60" text-anchor="middle" class="s-sub">ciphertext + wrapped key</text>
<rect x="250" y="145" width="170" height="52" rx="8" class="s-fill" style="stroke:var(--warn);stroke-width:1.8"/>
<text x="335.0" y="167" text-anchor="middle" class="s-label" style="fill:var(--warn)">Data key</text>
<text x="335.0" y="185" text-anchor="middle" class="s-sub">one per object</text>
<rect x="500" y="145" width="200" height="52" rx="8" class="s-fill" style="stroke:var(--good);stroke-width:1.8"/>
<text x="600.0" y="167" text-anchor="middle" class="s-label" style="fill:var(--good)">Object</text>
<text x="600.0" y="185" text-anchor="middle" class="s-sub">AES-GCM ciphertext</text>
</svg>` },
    { t: "code",
      lang: "python",
      title: "envelope.py — encrypt, rotate, tamper",
      code: `import os, time
from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

# Envelope encryption, the scheme behind cloud KMS-backed storage encryption: each object is encrypted with its
# own data key; the data key is stored encrypted ("wrapped") by a key-encryption key that never leaves the KMS.
kek = AESGCM(AESGCM.generate_key(256))                         # stands in for a KMS key

def encrypt_object(plaintext: bytes, kek: AESGCM) -> dict:
    dk = AESGCM.generate_key(256); n1, n2 = os.urandom(12), os.urandom(12)
    return {"wrapped_key": n1 + kek.encrypt(n1, dk, None), "nonce": n2, "ciphertext": AESGCM(dk).encrypt(n2, plaintext, None)}

def decrypt_object(obj: dict, kek: AESGCM) -> bytes:
    dk = kek.decrypt(obj["wrapped_key"][:12], obj["wrapped_key"][12:], None)
    return AESGCM(dk).decrypt(obj["nonce"], obj["ciphertext"], None)

objects = [encrypt_object(os.urandom(1 << 20), kek) for _ in range(200)]    # 200 objects of 1 MB
print(f"encrypted 200 MB as 200 objects, each with its own data key")

# Rotating the key-encryption key re-wraps 32-byte data keys; the 200 MB of data is not touched.
new_kek = AESGCM(AESGCM.generate_key(256))
t = time.perf_counter()
for o in objects:
    dk = kek.decrypt(o["wrapped_key"][:12], o["wrapped_key"][12:], None); n = os.urandom(12)
    o["wrapped_key"] = n + new_kek.encrypt(n, dk, None)
t_rewrap = time.perf_counter() - t
t = time.perf_counter()
for o in objects: decrypt_object(o, new_kek)
t_read = time.perf_counter() - t
print(f"rotation: re-wrapped 200 data keys in {t_rewrap * 1000:.1f} ms; reading all 200 MB back took {t_read * 1000:.0f} ms")

# GCM authenticates as well as encrypts: one flipped bit is detected, not silently decrypted.
tampered = dict(objects[0]); ct = bytearray(tampered["ciphertext"]); ct[1000] ^= 1; tampered["ciphertext"] = bytes(ct)
try: decrypt_object(tampered, new_kek)
except InvalidTag: print("one flipped bit in the ciphertext: InvalidTag, decryption refused")
try: decrypt_object(objects[1], kek)
except InvalidTag: print("old key after rotation: InvalidTag (the old key-encryption key can be retired)")`,
      out: `encrypted 200 MB as 200 objects, each with its own data key
rotation: re-wrapped 200 data keys in 1.3 ms; reading all 200 MB back took 107 ms
one flipped bit in the ciphertext: InvalidTag, decryption refused
old key after rotation: InvalidTag (the old key-encryption key can be retired)` },
    { t: "dl",
      items: [
        { term: "Rotation is cheap",
          def: "Re-wrapping 200 data keys under a new key-encryption key took 1.3 ms; the 200 MB of data was not touched. That is why rotation can be automatic and frequent." },
        { term: "Authenticated encryption",
          def: "AES-GCM detected a single flipped bit and refused to decrypt. Encryption that only hides data would have returned corrupted plaintext." },
        { term: "Customer-managed keys",
          def: "With a key in your own KMS rather than the provider's default, disabling the key makes the data unreadable everywhere at once, and every use of it appears in your audit log." }
      ] },
    { t: "h2",
      n: "03",
      id: "audit",
      text: "Network, logs, lineage and residency",
      sub: "The rest of the audit checklist" },
    { t: "table",
      head: ["Control", "What it answers", "How"],
      rows: [
        [
          "Private networking",
          "Does data cross the public internet?",
          "VPC endpoints / Private Service Connect / Private Link; no public IPs on training"
        ],
        ["Encryption in transit", "Can traffic be read on the wire?", "TLS everywhere, including inside the VPC"],
        ["Audit logs", "Who did what, when?", "CloudTrail / Cloud Audit Logs / Activity Log, kept immutable"],
        [
          "Lineage",
          "Which data trained this model?",
          "Dataset versions and run IDs recorded with every artefact (lesson 1.3)"
        ],
        [
          "Residency",
          "Did data leave its jurisdiction?",
          "Region choice, organisation policies on allowed regions, transfer monitoring"
        ]
      ] },
    { t: "p",
      text: "Residency comes first because it constrains everything else. If customer data collected in the EU must stay in the EU, the training region, the endpoint region, the backup region, the logging destination and any third-party API that sees the data must all be in the EU. Organisation-level policies can deny creating resources outside approved regions, which turns the requirement into a guard rail instead of a guideline." },
    { t: "exercise",
      kind: "Challenge",
      title: "Least privilege from the access log",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p",
          text: "Given a week of audit-log records for a training job (action, resource, calling region), generate an IAM-style policy: one statement per action, with resources generalised to a common prefix. Prove that every logged request is allowed and that five sensitive requests (PII, deleting data, overwriting the production model, another team's bucket, passing an admin role) are denied. Then check the log for access to EU-only data from outside the EU." }
      ],
      requirements: [
        "A policy generated from the log, one statement per action",
        "Resource patterns generalised by common prefix",
        "A test that all logged requests are allowed",
        "A test that sensitive requests are denied, and a residency report"
      ],
      hint: "os.path.commonprefix on the sorted resource strings, cut back to the last '/', gives a prefix to put a * after.",
      solution: { lang: "python",
        title: "least_privilege.py",
        code: `from collections import defaultdict
from fnmatch import fnmatchcase
from os.path import commonprefix

def allowed(policy, action, resource):
    hits = [s for s in policy["Statement"] if any(fnmatchcase(action, a) for a in s["Action"])
            and any(fnmatchcase(resource, r) for r in s["Resource"])]
    return not any(s["Effect"] == "Deny" for s in hits) and any(s["Effect"] == "Allow" for s in hits)

# What a training job actually did last week, from the audit log (CloudTrail-style records).
log = [("s3:ListBucket", "arn:aws:s3:::ml-data", "eu-west-1")]
log += [("s3:GetObject", f"arn:aws:s3:::ml-data/train/2024-06/part-{i:04d}.parquet", "eu-west-1") for i in range(40)]
log += [("s3:GetObject", f"arn:aws:s3:::ml-data/train/2024-05/part-{i:04d}.parquet", "eu-west-1") for i in range(40)]
log += [("s3:PutObject", "arn:aws:s3:::ml-models/runs/r-831/model.tar.gz", "eu-west-1"),
        ("s3:PutObject", "arn:aws:s3:::ml-models/runs/r-831/metrics.json", "eu-west-1"),
        ("logs:PutLogEvents", "arn:aws:logs:eu-west-1:123456789012:log-group:/ml/training-ranking", "eu-west-1"),
        ("s3:GetObject", "arn:aws:s3:::ml-data/train/2024-06/part-0003.parquet", "us-east-1")]   # a debug run from the US

# 1. Generate a policy: one statement per action, resources generalised to their common prefix plus *.
by_action = defaultdict(set)
for action, res, _ in log: by_action[action].add(res)
statements = []
for action, resources in sorted(by_action.items()):
    resources = sorted(resources)
    if len(resources) == 1: pattern = resources[0]
    else:
        prefix = commonprefix(resources); pattern = prefix[: prefix.rfind("/") + 1] + "*"
    statements.append({"Effect": "Allow", "Action": [action], "Resource": [pattern]})
policy = {"Statement": statements}
for s in statements: print(f"Allow {s['Action'][0]:<20} on {s['Resource'][0]}")

# 2. Prove it: everything the job did is allowed; everything sensitive is not.
print(f"\\nall {len(log)} logged requests allowed: {all(allowed(policy, a, r) for a, r, _ in log)}")
sensitive = [("s3:GetObject", "arn:aws:s3:::ml-data/pii/customers.parquet"), ("s3:DeleteObject", "arn:aws:s3:::ml-data/train/2024-06/part-0001.parquet"),
             ("s3:PutObject", "arn:aws:s3:::ml-models/prod/model.tar.gz"), ("s3:GetObject", "arn:aws:s3:::finance/q2.csv"),
             ("iam:PassRole", "arn:aws:iam::123456789012:role/admin")]
for a, r in sensitive: print(f"  {a:<16} {r.split(':::')[-1].split(':')[-1]:<44} {'ALLOWED' if allowed(policy, a, r) else 'denied'}")

# 3. Residency: ml-data is EU-only. Flag any access from outside the EU.
EU = {"eu-west-1", "eu-central-1", "eu-north-1"}
breaches = [(a, r, reg) for a, r, reg in log if "ml-data" in r and reg not in EU]
print(f"\\nresidency: {len(breaches)} access(es) to EU-only data from outside the EU")
for a, r, reg in breaches: print(f"  {reg}: {a} {r.split(':::')[-1]}")`,
        out: `Allow logs:PutLogEvents    on arn:aws:logs:eu-west-1:123456789012:log-group:/ml/training-ranking
Allow s3:GetObject         on arn:aws:s3:::ml-data/train/*
Allow s3:ListBucket        on arn:aws:s3:::ml-data
Allow s3:PutObject         on arn:aws:s3:::ml-models/runs/r-831/*

all 85 logged requests allowed: True
  s3:GetObject     ml-data/pii/customers.parquet                denied
  s3:DeleteObject  ml-data/train/2024-06/part-0001.parquet      denied
  s3:PutObject     ml-models/prod/model.tar.gz                  denied
  s3:GetObject     finance/q2.csv                               denied
  iam:PassRole     role/admin                                   denied

residency: 1 access(es) to EU-only data from outside the EU
  us-east-1: s3:GetObject ml-data/train/2024-06/part-0003.parquet`,
        notes: [
          { t: "p",
            text: "The generated policy allowed all 85 logged requests and denied all five sensitive ones. It is also too narrow in one place: PutObject on `runs/r-831/*` would block the next run, r-832. Policies generated from logs fit the run they watched; a person has to generalise identifiers to the right level (`runs/*`), and the tests above are what make that edit safe." },
          { t: "p",
            text: "The residency check found one read of EU-only training data from us-east-1, a debugging run. That is the kind of breach logs reveal after the fact; the prevention is an organisation policy that denies the role outside EU regions, so the read fails instead of being reported." }
        ] } },
    { t: "callout",
      kind: "scenario",
      title: "Incident: the training job that could delete production",
      body: [
        { t: "p",
          text: "**Symptom.** A training pipeline's clean-up step, meant to remove temporary files from its own run folder, deleted the production model artefact. The serving fleet failed to start new replicas until the file was restored from a backup." },
        { t: "p",
          text: "**Mechanism.** The clean-up used a prefix built from an environment variable that was empty in one configuration, so it deleted from `ml-models/` instead of `ml-models/runs/<id>/`. The pipeline role had `s3:*` on the whole bucket, so nothing stopped it." },
        { t: "p",
          text: "**Fix.** Separate roles for training and deployment, with training allowed to write and delete only under `runs/*`, an explicit Deny on the production prefix for every role except the deployer, and object versioning on the model bucket so a deletion can be undone in minutes." }
      ] }
  ],

  takeaways: [
    "IAM precedence: **explicit Deny** wins, then any **Allow**, otherwise **deny by default**.",
    "The convenient `s3:*` on `*` role allowed reading PII, deleting data and overwriting production; the narrow role allowed only the job's work.",
    "Use **separate roles** for training, deployment and serving, and explicit Deny statements as guard rails.",
    "Envelope encryption: per-object data keys wrapped by a KMS key; **rotation re-wrapped 200 keys in 1.3 ms** without touching data.",
    "AES-GCM detected a **single flipped bit**: use authenticated encryption.",
    "Private networking, TLS everywhere, immutable audit logs and lineage complete the audit checklist.",
    "**Residency** chooses the region first; enforce it with organisation policies, not guidance.",
    "Policies generated from logs allowed all **85** logged requests and denied all **5** sensitive ones, but fit one run too narrowly: review and generalise.",
    "Version the model bucket so a deletion is recoverable."
  ],

  quiz: { title: "Check yourself",
    questions: [
      { stem: "A role has an Allow for s3:* on a bucket and a Deny for s3:GetObject on its pii/ prefix. Can it read pii/a.csv?",
        options: [
          "Yes, because the broader Allow covers it",
          "No, because an explicit Deny always wins",
          "Yes, if the Allow statement comes later",
          "Only if the object is not encrypted at rest"
        ],
        answer: 1,
        why: "Explicit Deny takes precedence over any Allow, regardless of order or breadth. Encryption is a separate control and does not change IAM's decision." },
      { stem: "Why does rotating a KMS key not require re-encrypting the stored data?",
        options: [
          "The KMS key is never used for encryption",
          "Only the small data keys it wraps are re-wrapped",
          "Rotation simply extends the old key's validity",
          "Cloud storage decrypts and re-encrypts it all lazily later"
        ],
        answer: 1,
        why: "Data is encrypted with per-object data keys; the KMS key encrypts only those keys. Re-wrapping 200 keys took 1.3 ms with the 200 MB untouched. The KMS key does encrypt (the data keys), and rotation replaces it." },
      { stem: "What did AES-GCM do when one bit of the ciphertext was flipped?",
        options: [
          "Decrypted it with one corrupted byte",
          "Refused to decrypt, raising InvalidTag",
          "Repaired the bit using its redundancy",
          "Decrypted it, since only one bit changed"
        ],
        answer: 1,
        why: "GCM authenticates the ciphertext, so any change fails verification. It has no error correction, and a mode without authentication would have returned corrupted plaintext silently." },
      { stem: "EU customer data must stay in the EU. Which control prevents a breach rather than reporting it?",
        options: [
          "A weekly review of the audit logs for regions",
          "An organisation policy denying use outside EU regions",
          "Encrypting all of the data with a customer-managed KMS key",
          "Tagging the dataset with residency=EU everywhere"
        ],
        answer: 1,
        why: "A deny on non-EU regions makes the access fail. Log reviews find it afterwards, encryption does not restrict where authorised code runs, and a tag is only a label until a policy acts on it." }
    ] },

  interview: { title: "In an interview",
    sub: "Governance answers should name controls, not intentions.",
    questions: [
      { level: "core",
        q: "How would you secure an ML training pipeline that uses sensitive data?",
        strong: "A strong answer covers identity, network, encryption, logging, lineage and residency, each with a concrete control.",
        answer: [
          { t: "p",
            text: "Separate least-privilege roles for training, deployment and serving, with explicit denies on sensitive prefixes and production artefacts. Training in private subnets with VPC endpoints and no public IPs. Encryption at rest with customer-managed keys and TLS in transit. Immutable audit logs of data and key access. Lineage recording which dataset versions trained each model. Regions chosen by residency, enforced by organisation policy." },
          { t: "p", text: "And versioning on artefact buckets, so mistakes are recoverable." }
        ] },
      { level: "advanced",
        q: "How do you get to least privilege on an existing platform where every role is admin?",
        strong: "A strong answer uses access logs, generated policies, tests and gradual enforcement.",
        answer: [
          { t: "p",
            text: "Use the audit logs to see what each workload actually does over a few weeks, generate candidate policies from them (cloud providers offer this, and the exercise shows the idea), and generalise identifiers by hand. Test them against the logged requests and a list of requests that must fail. Roll out per workload, first in a mode that logs would-be denials if the platform supports it, and add explicit denies on the most sensitive resources first, since those give the most protection soonest." }
        ] },
      { level: "core",
        q: "What does data residency change in an ML system design?",
        strong: "A strong answer follows the data through every component that touches it.",
        answer: [
          { t: "p",
            text: "Every place the data or anything derived from it goes: training and serving regions, feature stores, backups, logs that may contain inputs, monitoring tools, labelling vendors and third-party model APIs. Some of these are easy to miss, such as prediction logs shipped to a SaaS tool in another region. Residency is enforced with region-restricting policies and checked with transfer monitoring, and it may require separate deployments per jurisdiction." }
        ] }
    ] }
});
