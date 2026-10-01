/* ============================================================================
   LESSON 12.4 — VPCs, Subnets and Cloud-Native Patterns
   ========================================================================= */
EC.receiveLesson({
  id: "12.4",

  lede: "Every service in this course runs inside a network someone had to design. In the cloud that network is software: a **VPC** is your own private address range, **subnets** slice it by tier and availability zone, **route tables** decide which subnets can reach the internet, a **NAT gateway** lets private machines call out without being reachable, and **security groups** say who may talk to whom. The second half is about what runs inside: cloud machines are replaced constantly — by deploys, autoscaling, reclaimed spot capacity and failing hosts — so cloud-native software is built on the assumption that any instance can die at any moment, and measured here, a shutdown done badly fails dozens of requests on every deploy while one done properly fails none.",

  objectives: [
    "Plan a VPC's address space and subnets across zones, and avoid ranges that can never be connected",
    "Explain what makes a subnet public or private, and how a NAT gateway allows outbound calls only",
    "Write security-group rules by role, and contrast stateful security groups with stateless network ACLs",
    "Apply the twelve-factor rules that make an instance safe to replace at any moment",
    "Shut a service down without failing requests, and use sidecars, init containers and operators appropriately"
  ],

  prerequisites: ["2.1", "2.2", "12.3"],

  blocks: [

    { t: "h2", n: "01", id: "vpc", text: "The VPC and its address plan",
      sub: "A private network, and the one decision that is hard to undo" },

    { t: "viz", title: "A production VPC: three tiers, spread across zones",
      caption: "Each tier gets its own subnet in each availability zone (a third zone, omitted here, repeats the pattern). Users come in through the internet gateway to the load balancer's nodes in the public subnets (green). App instances live in private subnets and reach the internet only outwards, through the NAT gateway in their own zone (amber, dashed). The database has no route to the internet at all and accepts connections only from the app tier (violet); a standby in the other zone replicates from it. The three route tables at the bottom are the entire difference between public and private.",
      svg: `<svg viewBox="0 0 760 500" width="100%" role="img" aria-label="A VPC with public, app and data subnets in two availability zones">
<defs><marker id="vp-g" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--good)"/></marker><marker id="vp-w" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--warn)"/></marker><marker id="vp-v" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--violet)"/></marker></defs>
<rect x="305" y="4" width="150" height="28" rx="14" class="s-fill" style="stroke:var(--ink-3)"/><text x="380" y="23" text-anchor="middle" class="s-label">internet</text>
<rect x="16" y="58" width="728" height="364" rx="14" style="fill:var(--accent);fill-opacity:.03;stroke:var(--accent);stroke-width:2"/>
<text x="30" y="80" class="s-label" style="fill:var(--accent)">VPC 10.20.0.0/16</text>
<line x1="380" y1="32" x2="380" y2="45" style="stroke:var(--good)" stroke-width="1.6" marker-end="url(#vp-g)"/>
<rect x="310" y="46" width="140" height="26" rx="6" class="s-fill" style="stroke:var(--good);stroke-width:1.5"/><text x="380" y="63" text-anchor="middle" class="s-sub">internet gateway</text>
<rect x="30" y="90" width="342" height="320" rx="10" style="fill:none;stroke:var(--line);stroke-dasharray:5 4"/>
<rect x="388" y="90" width="342" height="320" rx="10" style="fill:none;stroke:var(--line);stroke-dasharray:5 4"/>
<text x="201" y="400" text-anchor="middle" class="s-sub">availability zone eu-west-1a</text>
<text x="559" y="400" text-anchor="middle" class="s-sub">availability zone eu-west-1b</text>
<rect x="42" y="100" width="318" height="76" rx="8" style="fill:var(--warn);fill-opacity:.06;stroke:var(--warn)"/>
<rect x="400" y="100" width="318" height="76" rx="8" style="fill:var(--warn);fill-opacity:.06;stroke:var(--warn)"/>
<rect x="42" y="186" width="318" height="86" rx="8" style="fill:var(--accent);fill-opacity:.06;stroke:var(--accent)"/>
<rect x="400" y="186" width="318" height="86" rx="8" style="fill:var(--accent);fill-opacity:.06;stroke:var(--accent)"/>
<rect x="42" y="282" width="318" height="86" rx="8" style="fill:var(--violet);fill-opacity:.06;stroke:var(--violet)"/>
<rect x="400" y="282" width="318" height="86" rx="8" style="fill:var(--violet);fill-opacity:.06;stroke:var(--violet)"/>
<text x="52" y="116" class="s-sub" style="fill:var(--warn)">public 10.20.48.0/24</text>
<text x="708" y="116" text-anchor="end" class="s-sub" style="fill:var(--warn)">public 10.20.49.0/24</text>
<rect x="56" y="124" width="110" height="40" rx="7" class="s-fill" style="stroke:var(--warn)"/><text x="111" y="148" text-anchor="middle" class="s-label">NAT gateway</text>
<rect x="230" y="124" width="116" height="40" rx="7" class="s-fill" style="stroke:var(--good)"/><text x="288" y="148" text-anchor="middle" class="s-label">ALB node</text>
<rect x="414" y="124" width="116" height="40" rx="7" class="s-fill" style="stroke:var(--good)"/><text x="472" y="148" text-anchor="middle" class="s-label">ALB node</text>
<rect x="594" y="124" width="110" height="40" rx="7" class="s-fill" style="stroke:var(--warn)"/><text x="649" y="148" text-anchor="middle" class="s-label">NAT gateway</text>
<rect x="56" y="200" width="290" height="58" rx="7" class="s-fill" style="stroke:var(--accent)"/><text x="201" y="224" text-anchor="middle" class="s-label">app instances</text><text x="201" y="244" text-anchor="middle" class="s-sub">private app subnet · 10.20.0.0/20</text>
<rect x="414" y="200" width="290" height="58" rx="7" class="s-fill" style="stroke:var(--accent)"/><text x="559" y="224" text-anchor="middle" class="s-label">app instances</text><text x="559" y="244" text-anchor="middle" class="s-sub">private app subnet · 10.20.16.0/20</text>
<rect x="56" y="296" width="290" height="58" rx="7" class="s-fill" style="stroke:var(--violet)"/><text x="201" y="320" text-anchor="middle" class="s-label">Postgres primary</text><text x="201" y="340" text-anchor="middle" class="s-sub">private data subnet · 10.20.51.0/24</text>
<rect x="414" y="296" width="290" height="58" rx="7" class="s-fill" style="stroke:var(--violet)"/><text x="559" y="320" text-anchor="middle" class="s-label">Postgres standby</text><text x="559" y="340" text-anchor="middle" class="s-sub">private data subnet · 10.20.52.0/24</text>
<line x1="350" y1="72" x2="300" y2="122" style="stroke:var(--good)" stroke-width="1.6" marker-end="url(#vp-g)"/>
<line x1="410" y1="72" x2="460" y2="122" style="stroke:var(--good)" stroke-width="1.6" marker-end="url(#vp-g)"/>
<line x1="288" y1="164" x2="288" y2="198" style="stroke:var(--good)" stroke-width="1.6" marker-end="url(#vp-g)"/>
<line x1="472" y1="164" x2="472" y2="198" style="stroke:var(--good)" stroke-width="1.6" marker-end="url(#vp-g)"/>
<line x1="111" y1="200" x2="111" y2="166" style="stroke:var(--warn);stroke-dasharray:4 3" stroke-width="1.6" marker-end="url(#vp-w)"/>
<line x1="649" y1="200" x2="649" y2="166" style="stroke:var(--warn);stroke-dasharray:4 3" stroke-width="1.6" marker-end="url(#vp-w)"/>
<path d="M166 140 C210 140, 250 70, 308 62" style="fill:none;stroke:var(--warn);stroke-dasharray:4 3" stroke-width="1.6" marker-end="url(#vp-w)"/>
<path d="M594 140 C550 140, 510 70, 452 62" style="fill:none;stroke:var(--warn);stroke-dasharray:4 3" stroke-width="1.6" marker-end="url(#vp-w)"/>
<line x1="201" y1="258" x2="201" y2="294" style="stroke:var(--violet)" stroke-width="1.6" marker-end="url(#vp-v)"/>
<line x1="414" y1="246" x2="349" y2="306" style="stroke:var(--violet)" stroke-width="1.6" marker-end="url(#vp-v)"/>
<line x1="346" y1="336" x2="412" y2="336" style="stroke:var(--violet);stroke-dasharray:3 3" stroke-width="1.6" marker-end="url(#vp-v)"/>
<rect x="30" y="436" width="10" height="10" rx="2" style="fill:var(--warn)"/><text x="48" y="445" class="s-sub"><tspan style="fill:var(--ink)">public route table</tspan><tspan x="170">10.20.0.0/16 → local</tspan><tspan x="310">0.0.0.0/0 → internet gateway</tspan></text>
<rect x="30" y="458" width="10" height="10" rx="2" style="fill:var(--accent)"/><text x="48" y="467" class="s-sub"><tspan style="fill:var(--ink)">app route table</tspan><tspan x="170">10.20.0.0/16 → local</tspan><tspan x="310">0.0.0.0/0 → the NAT gateway in the same zone</tspan></text>
<rect x="30" y="480" width="10" height="10" rx="2" style="fill:var(--violet)"/><text x="48" y="489" class="s-sub"><tspan style="fill:var(--ink)">data route table</tspan><tspan x="170">10.20.0.0/16 → local</tspan><tspan x="310">nothing else: no path to the internet at all</tspan></text>
</svg>` },

    { t: "p", text: "A **VPC** (virtual private cloud; Azure calls it a VNet) is an isolated network carved out of the provider's: other tenants share the hardware but cannot route a packet into it. You give it a private address range in **CIDR** notation — `10.20.0.0/16` means the first 16 bits are fixed, leaving 16 bits, or 65,536 addresses. A **subnet** is a smaller CIDR inside it, and lives in exactly one availability zone, so a highly available tier needs a subnet in each zone. The provider keeps a few addresses in every subnet — five in AWS — which matters for small ones:" },

    { t: "table", head: ["CIDR", "Addresses", "Usable in AWS", "Typical use"],
      rows: [
        ["/16", "65,536", "—", "a whole VPC"],
        ["/20", "4,096", "4,091", "an app or Kubernetes subnet per zone (one IP per pod)"],
        ["/24", "256", "251", "a public or data subnet per zone"],
        ["/28", "16", "11", "the smallest subnet AWS allows; fine for a NAT, fragile for anything that grows"]
      ] },

    { t: "p", text: "Plan the addresses before anything is built, with Python's `ipaddress` module doing the arithmetic. The app tier gets the big blocks because that is where instances and pods multiply; allocating the largest first keeps every block aligned:" },

    { t: "code", lang: "python", title: "cidr_plan.py — carve a VPC into nine subnets, then check who it can ever connect to",
      code: `import ipaddress as ip

RESERVED = 5                    # per subnet in AWS: network, router, DNS, one spare, broadcast
vpc = ip.ip_network("10.20.0.0/16")
AZS = ["eu-west-1a", "eu-west-1b", "eu-west-1c"]
TIERS = {"app": 20, "public": 24, "data": 24}   # prefix length per tier: app is where the IPs go

free = [vpc]
def allocate(prefix):            # first free block that fits; largest requests go first to avoid holes
    for i, block in enumerate(free):
        if block.prefixlen <= prefix:
            sub = next(block.subnets(new_prefix=prefix))
            free[i:i + 1] = sorted(block.address_exclude(sub))
            return sub
    raise ValueError(f"no room for a /{prefix}")

plan = [(tier, az, allocate(p)) for tier, p in sorted(TIERS.items(), key=lambda t: t[1]) for az in AZS]
print(f"{'tier':<8}{'zone':<12}{'CIDR':<16}{'usable':>7}")
for tier, az, net in plan:
    print(f"{tier:<8}{az:<12}{str(net):<16}{net.num_addresses - RESERVED:>7,}")
used = sum(n.num_addresses for _, _, n in plan)
print(f"allocated {used:,} of {vpc.num_addresses:,} addresses; {vpc.num_addresses - used:,} left for growth\\n")

others = {"staging VPC": "10.21.0.0/16", "on-prem data centre": "10.0.0.0/12",
          "acquired company VPC": "10.20.128.0/17", "team B, same template": "10.20.0.0/16"}
for name, cidr in others.items():
    clash = vpc.overlaps(ip.ip_network(cidr))
    print(f"peer with {name:<25}{cidr:<16}{'OVERLAPS - cannot route' if clash else 'ok'}")`,
      hl: [9, 13, 27],
      out: `tier    zone        CIDR             usable
app     eu-west-1a  10.20.0.0/20      4,091
app     eu-west-1b  10.20.16.0/20     4,091
app     eu-west-1c  10.20.32.0/20     4,091
public  eu-west-1a  10.20.48.0/24       251
public  eu-west-1b  10.20.49.0/24       251
public  eu-west-1c  10.20.50.0/24       251
data    eu-west-1a  10.20.51.0/24       251
data    eu-west-1b  10.20.52.0/24       251
data    eu-west-1c  10.20.53.0/24       251
allocated 13,824 of 65,536 addresses; 51,712 left for growth

peer with staging VPC              10.21.0.0/16    ok
peer with on-prem data centre      10.0.0.0/12     ok
peer with acquired company VPC     10.20.128.0/17  OVERLAPS - cannot route
peer with team B, same template    10.20.0.0/16    OVERLAPS - cannot route` },

    { t: "p", text: "Nine subnets use about a fifth of the range, leaving room for a fourth zone or new tiers later. The last four lines are the part people skip. Two networks can be connected — by **VPC peering**, a transit gateway or a VPN to the data centre — only if their ranges do not overlap, because a router cannot send `10.20.5.9` to two places. The company acquired last year used part of the same range, and a second team built its VPC from the same template; neither can ever be routed to this one without renumbering." },

    { t: "callout", kind: "trap", title: "Overlapping ranges are permanent",
      body: [
        { t: "p", text: "Every team that accepts the default or copies the same template ends up with the same `10.0.0.0/16`, and nobody notices until the day two of those networks must talk — after a merger, when a shared service is introduced, or when on-premises systems need access. Renumbering a running VPC means rebuilding it. Allocate ranges centrally, from one register (AWS IPAM, or a spreadsheet the network team owns), with every VPC, region and the data centre in it." }
      ] },

    { t: "h2", n: "02", id: "routing", text: "Public, private, and the NAT gateway",
      sub: "A subnet is public because of its route table, and for no other reason" },

    { t: "p", text: "Every subnet is associated with a **route table**: a list of destination ranges and where to send packets for each. The most specific matching route wins — **longest-prefix match**, the same rule every internet router uses. A subnet whose table sends `0.0.0.0/0` (everything) to the **internet gateway** is public; one that sends it to a **NAT gateway** is private with outbound access; one with no default route at all cannot reach the internet in either direction. The NAT gateway rewrites each outgoing connection's source to its own public address and remembers the connection, so replies find their way back while nothing else can get in:" },

    { t: "code", lang: "python", title: "routes.py — longest-prefix routing for three tiers, and a NAT gateway's connection table",
      code: `import ipaddress as ip, itertools

ROUTE_TABLES = {                  # one per tier; what makes a subnet public is this, nothing else
    "public": [("10.20.0.0/16", "local"), ("0.0.0.0/0", "internet gateway")],
    "app":    [("10.20.0.0/16", "local"), ("10.21.0.0/16", "peering to staging"),
               ("52.218.0.0/17", "S3 gateway endpoint"), ("0.0.0.0/0", "NAT gateway")],
    "data":   [("10.20.0.0/16", "local")],                        # no default route at all
}
def route(table, dst):            # longest prefix wins, exactly as in a real router
    hits = [(ip.ip_network(n), t) for n, t in ROUTE_TABLES[table] if ip.ip_address(dst) in ip.ip_network(n)]
    if not hits: return None
    net, target = max(hits, key=lambda h: h[0].prefixlen)
    return f"{net} -> {target}"

class NatGateway:                 # rewrites the source; remembers each flow so only replies get back in
    def __init__(self, public_ip):
        self.public_ip, self.flows, self.ports = public_ip, {}, itertools.count(1024)
    def outbound(self, src, sport, dst, dport):
        port = next(self.ports)
        self.flows[port] = (src, sport, dst, dport)
        return f"{src}:{sport} rewritten to {self.public_ip}:{port}"
    def inbound(self, src, sport, dport):
        flow = self.flows.get(dport)
        if flow and (flow[2], flow[3]) == (src, sport):
            return f"translated back to {flow[0]}:{flow[1]}, delivered"
        return "dropped: no connection to match"

print("routing decisions")
for tier, dst, what in [("app", "203.0.113.50", "payment provider API"), ("app", "52.218.40.1", "S3"),
                        ("app", "10.21.3.4", "staging service"), ("app", "10.20.51.10", "database"),
                        ("public", "203.0.113.50", "payment provider API"), ("data", "203.0.113.50", "payment provider API")]:
    print(f"  {tier:<7}-> {what:<22}{route(tier, dst) or 'no route: dropped'}")

nat = NatGateway("198.51.100.7")
print("\\nthe NAT gateway")
print("  app 10.20.0.15 calls the API:   ", nat.outbound("10.20.0.15", 40312, "203.0.113.50", 443))
print("  the API replies:                ", nat.inbound("203.0.113.50", 443, 1024))
print("  a scanner probes the same port: ", nat.inbound("192.0.2.66", 443, 1024))
print("  a scanner tries port 22:        ", nat.inbound("192.0.2.66", 51515, 22))`,
      hl: [7, 12, 20, 24],
      out: `routing decisions
  app    -> payment provider API  0.0.0.0/0 -> NAT gateway
  app    -> S3                    52.218.0.0/17 -> S3 gateway endpoint
  app    -> staging service       10.21.0.0/16 -> peering to staging
  app    -> database              10.20.0.0/16 -> local
  public -> payment provider API  0.0.0.0/0 -> internet gateway
  data   -> payment provider API  no route: dropped

the NAT gateway
  app 10.20.0.15 calls the API:    10.20.0.15:40312 rewritten to 198.51.100.7:1024
  the API replies:                 translated back to 10.20.0.15:40312, delivered
  a scanner probes the same port:  dropped: no connection to match
  a scanner tries port 22:         dropped: no connection to match` },

    { t: "p", text: "The app tier's call to S3 matched both `52.218.0.0/17` and `0.0.0.0/0`, and the longer prefix won, sending it through a **gateway endpoint** instead of the NAT. The NAT gateway let the API's reply back in because it matched a connection that went out; a scanner aiming at the same public port from a different address was dropped, as was anything aimed at a port with no connection behind it. That is why private instances need no public address and cannot be reached from outside — and why the data tier, with no default route, cannot leak data to the internet even if compromised." },

    { t: "callout", kind: "tradeoff", title: "NAT gateways cost money and belong to one zone",
      body: [
        { t: "p", text: "A managed NAT gateway charges by the hour and for every gigabyte it processes, so a service pulling terabytes from object storage through it pays for each byte; gateway endpoints for S3 and DynamoDB are free and keep that traffic off the internet, and interface endpoints (PrivateLink) do the same for other services at a smaller charge. A NAT gateway also lives in one zone: share one across zones and losing that zone cuts every zone's outbound access, while sending traffic to it from other zones adds cross-zone transfer charges. Run one per zone, with each zone's app route table pointing at its own." }
      ] },

    { t: "h2", n: "03", id: "filtering", text: "Security groups and network ACLs",
      sub: "Stateful allow-lists by role, and a stateless guard at the subnet's edge" },

    { t: "diagram", kind: "compare", title: "Two filters, at two levels",
      caption: "Security groups do almost all the work: they follow the instance, remember connections, and can name another group as a source. Network ACLs are a coarse second layer at the subnet boundary — useful for blocking an address range outright or enforcing tier edges, unforgiving because they remember nothing.",
      columns: [
        { title: "Security group", tone: "good", items: [
          "attached to an instance's network interface",
          "stateful: replies are allowed automatically",
          "allow rules only; everything else is dropped",
          "a source can be another security group",
          "the main tool: rules by role"
        ] },
        { title: "Network ACL", tone: "warn", items: [
          "attached to a subnet: applies to everything in it",
          "stateless: replies must be allowed explicitly",
          "numbered allow and deny rules, first match wins",
          "sources are address ranges only",
          "a coarse guard: block a range, fence a tier"
        ] }
      ] },

    { t: "p", text: "The three-tier chain written as security groups — the load balancer open to the internet on 443, the app reachable only from the load balancer's group, the database only from the app's group — and then a network ACL on the data subnet, written the way people first write one:" },

    { t: "code", lang: "python", title: "sg.py — security groups that reference each other, and a stateless ACL that forgets replies",
      code: `import ipaddress as ip

HOSTS = {"internet": ("192.0.2.66", None), "alb": ("10.20.48.10", "sg-alb"),
         "app-1": ("10.20.0.21", "sg-app"), "app-9": ("10.20.17.140", "sg-app"),   # app-9: autoscaled a minute ago
         "db": ("10.20.51.10", "sg-db")}
SECURITY_GROUPS = {               # inbound allow rules only; the source may be another group
    "sg-alb": [(443, "0.0.0.0/0")],
    "sg-app": [(8080, "sg-alb")],
    "sg-db":  [(5432, "sg-app")],
}
def sg_allows(src, dst, port):
    src_ip, src_group = HOSTS[src]
    for p, source in SECURITY_GROUPS[HOSTS[dst][1]]:
        if p == port and (source == src_group or (not source.startswith("sg-")
                                                   and ip.ip_address(src_ip) in ip.ip_network(source))):
            return True
    return False                  # no deny rules exist: anything not allowed is dropped

print("security groups (stateful: a reply to an allowed connection always gets out)")
for src, dst, port in [("internet", "alb", 443), ("internet", "app-1", 8080), ("alb", "app-1", 8080),
                       ("alb", "db", 5432), ("app-1", "db", 5432), ("app-9", "db", 5432), ("app-1", "db", 22)]:
    print(f"  {src:>8} -> {dst + ':' + str(port):<12}{'ALLOW' if sg_allows(src, dst, port) else 'deny'}")

def nacl(rules, peer, port):      # stateless: numbered rules, lowest first, first match wins, then deny
    for num, action, cidr, (lo, hi) in sorted(rules):
        if ip.ip_address(peer) in ip.ip_network(cidr) and lo <= port <= hi: return f"rule {num} {action}"
    return "default deny"

DATA_IN = [(100, "allow", "10.20.0.0/18", (5432, 5432))]
DATA_OUT_WRONG = [(100, "allow", "10.20.0.0/18", (5432, 5432))]      # mirrors the inbound rule...
DATA_OUT_RIGHT = [(100, "allow", "10.20.0.0/18", (1024, 65535))]     # ...but replies go to the client's port

print("\\nnetwork ACL on the data subnet (stateless: each direction checked on its own)")
for label, out_rules in [("outbound rule mirrors inbound", DATA_OUT_WRONG), ("outbound allows ephemeral ports", DATA_OUT_RIGHT)]:
    syn = nacl(DATA_IN, "10.20.0.21", 5432)           # app-1:49731 -> db:5432 comes in
    reply = nacl(out_rules, "10.20.0.21", 49731)      # db:5432 -> app-1:49731 goes out
    print(f"  {label}")
    print(f"    request  app-1:49731 -> db:5432   {syn}")
    print(f"    reply    db:5432 -> app-1:49731   {reply:<16}=> "
          + ("connected" if "allow" in reply else "the client hangs until it times out"))`,
      hl: [9, 14, 17, 30, 31],
      out: `security groups (stateful: a reply to an allowed connection always gets out)
  internet -> alb:443     ALLOW
  internet -> app-1:8080  deny
       alb -> app-1:8080  ALLOW
       alb -> db:5432     deny
     app-1 -> db:5432     ALLOW
     app-9 -> db:5432     ALLOW
     app-1 -> db:22       deny

network ACL on the data subnet (stateless: each direction checked on its own)
  outbound rule mirrors inbound
    request  app-1:49731 -> db:5432   rule 100 allow
    reply    db:5432 -> app-1:49731   default deny    => the client hangs until it times out
  outbound allows ephemeral ports
    request  app-1:49731 -> db:5432   rule 100 allow
    reply    db:5432 -> app-1:49731   rule 100 allow  => connected` },

    { t: "p", text: "Every path not in the chain was denied, including the load balancer trying the database directly and the app trying SSH on it. The line to notice is `app-9`: an instance the autoscaler launched a minute ago, with an address nobody wrote down, was allowed to reach the database with no rule change, because the rule names the **role** (`sg-app`), not an address. Rules by address go stale the moment instances are replaced; rules by group never do." },

    { t: "callout", kind: "trap", title: "A stateless ACL fails as a hang, not a refusal",
      body: [
        { t: "p", text: "The client picks a random high **ephemeral port** for each connection (32768–60999 on Linux), and the reply is addressed to it. An ACL whose outbound rule mirrors the inbound one lets the request in and drops the reply, so the client sees neither data nor a refusal — it waits for its connect timeout. When a connection between tiers hangs instead of failing fast, check the ACLs for the return path: outbound to the clients' range on ports 1024–65535." }
      ] },

    { t: "h2", n: "04", id: "disposable", text: "Assume the box will die",
      sub: "Instances are replaced constantly; design so that nobody notices" },

    { t: "p", text: "A cloud instance has a short and uncertain life. Every deploy replaces the whole fleet; autoscaling (11.4) adds and removes instances through the day; spot capacity (11.6) is reclaimed with two minutes' notice; hosts fail and zones go dark (7.5). Software that treats instances as replaceable **cattle** rather than irreplaceable **pets** survives this as routine. The **twelve-factor app**, written at Heroku in 2011, is still the clearest list of what that takes; these are the factors that matter most when instances die:" },

    { t: "table", head: ["Factor", "Rule", "Why it matters when instances are replaced"],
      rows: [
        ["Processes (VI)", "stateless, share nothing", "any instance can serve any request; losing one loses no sessions (2.1)"],
        ["Backing services (IV)", "databases, queues, caches attached by URL", "no data lives on the instance, so none dies with it"],
        ["Config (III)", "in the environment, not in code or image", "the same image runs everywhere; a replacement needs no rebuild"],
        ["Build, release, run (V)", "immutable builds; a release is build plus config", "a rollback is redeploying the previous release, not repairing a box"],
        ["Disposability (IX)", "start fast, stop gracefully on SIGTERM", "replacement is cheap and invisible to users — measured below"],
        ["Concurrency (VIII)", "scale out by running more processes", "capacity is a count the autoscaler can change"],
        ["Logs (XI)", "write to stdout as an event stream", "the platform ships them; nothing is lost on a dead instance's disk"]
      ] },

    { t: "p", text: "Disposability is the one most often half done. Stopping an instance is a race between two things: the orchestrator telling the process to stop (**SIGTERM**), and every load balancer and proxy learning that it should stop sending traffic there — which happens in parallel and takes a moment. A real test: two backends behind a round-robin balancer that learns of the removal one second after SIGTERM, eight clients sending 200 ms requests, and three ways for the old instance to respond to SIGTERM:" },

    { t: "code", lang: "python", title: "drain.py — replace an instance under load, three ways",
      code: `import http.client, itertools, signal, socket, subprocess, sys, threading, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/ready":                        # the load balancer's readiness check
            self.send_response(503 if self.server.draining else 200); self.end_headers(); return
        time.sleep(0.2)                                  # each request takes 200 ms
        self.send_response(200); self.end_headers(); self.wfile.write(b"ok")
    def log_message(self, *args): pass

class Server(ThreadingHTTPServer):
    daemon_threads = False                               # so server_close() waits for in-flight requests
    draining = False

def serve(port, mode):                                   # one instance; mode = what it does on SIGTERM
    srv = Server(("127.0.0.1", port), Handler)
    def on_sigterm(*_):
        def drain():
            srv.draining = True                          # fail readiness so the balancer stops routing here
            if mode == "drain": time.sleep(1.5)          # ...and keep serving until it has noticed
            srv.shutdown()                               # stop accepting new connections
        threading.Thread(target=drain).start()
    if mode != "exit": signal.signal(signal.SIGTERM, on_sigterm)   # "exit": the default, die at once
    srv.serve_forever()
    srv.server_close()                                   # close the listener, finish in-flight requests

def free_port():
    with socket.socket() as s: s.bind(("127.0.0.1", 0)); return s.getsockname()[1]

def get(port, path="/"):
    conn = http.client.HTTPConnection("127.0.0.1", port, timeout=3)
    try: conn.request("GET", path); return conn.getresponse().status
    finally: conn.close()

def trial(mode, lag=1.0):                                # a deploy replaces "old"; "new" stays up
    old, new = free_port(), free_port()
    procs = {p: subprocess.Popen([sys.executable, __file__, "serve", str(p), m]) for p, m in [(old, mode), (new, "drain")]}
    for p in procs:
        while True:
            try: get(p, "/ready"); break
            except OSError: time.sleep(0.05)
    endpoints, rr, results, start = [old, new], itertools.count(), [], time.time()
    def client():
        while time.time() - start < 3.0:
            port = endpoints[next(rr) % len(endpoints)]  # round robin over the balancer's current list
            try: results.append("ok" if get(port) == 200 else "error")
            except ConnectionRefusedError: results.append("refused")
            except (ConnectionResetError, http.client.RemoteDisconnected, BrokenPipeError): results.append("cut off")
    threads = [threading.Thread(target=client) for _ in range(8)]
    for t in threads: t.start()
    time.sleep(1.0); procs[old].send_signal(signal.SIGTERM)   # the orchestrator asks the old instance to stop
    time.sleep(lag); endpoints.remove(old)                     # the balancer learns of it a second later
    for t in threads: t.join()
    procs[old].wait(); procs[new].terminate(); procs[new].wait()
    fails = {k: results.count(k) for k in ("cut off", "refused", "error") if results.count(k)}
    return len(results), sum(fails.values()), ", ".join(f"{n} {k}" for k, n in fails.items())

if sys.argv[1:2] == ["serve"]:
    serve(int(sys.argv[2]), sys.argv[3])
else:
    print(f"{'on SIGTERM the old instance...':<40}{'requests':>8}{'failed':>8}  how")
    for mode, label in [("exit", "exits at once (the default)"), ("close", "stops accepting, finishes in-flight"),
                        ("drain", "fails readiness, serves on, then drains")]:
        n, failed, how = trial(mode)
        print(f"{label:<40}{n:>8}{failed:>8}  {how}".rstrip())`,
      hl: [13, 20, 21, 22, 24, 26],
      out: `on SIGTERM the old instance...          requests  failed  how
exits at once (the default)                  160      44  4 cut off, 40 refused
stops accepting, finishes in-flight          160      40  1 cut off, 39 refused
fails readiness, serves on, then drains      120       0` },

    { t: "viz", title: "Why finishing in-flight work is not enough",
      caption: "The balancer keeps routing to the old instance for a second after SIGTERM. Exiting at once cut off the four requests in flight and had every request routed there in that second refused. Finishing in-flight work saved the first four, but the listener was already closed, so the refusals remained — about forty either way, on every instance of every deploy. Failing readiness and **serving on** until the balancer had moved away, then draining (amber: finishing in-flight requests), failed nothing. (The failing runs show more requests in total only because refusals return instantly.)",
      svg: `<svg viewBox="0 0 760 262" width="100%" role="img" aria-label="Timelines of three shutdown behaviours against the load balancer's routing">
<line x1="230" y1="36" x2="230" y2="232" style="stroke:var(--line);stroke-opacity:.4"/>
<text x="230" y="250" text-anchor="middle" class="s-sub">0 s</text>
<line x1="310" y1="36" x2="310" y2="232" style="stroke:var(--line);stroke-opacity:.4"/>
<text x="310" y="250" text-anchor="middle" class="s-sub">0.5 s</text>
<line x1="390" y1="36" x2="390" y2="232" style="stroke:var(--line);stroke-opacity:.4"/>
<text x="390" y="250" text-anchor="middle" class="s-sub">1 s</text>
<line x1="470" y1="36" x2="470" y2="232" style="stroke:var(--line);stroke-opacity:.4"/>
<text x="470" y="250" text-anchor="middle" class="s-sub">1.5 s</text>
<line x1="550" y1="36" x2="550" y2="232" style="stroke:var(--line);stroke-opacity:.4"/>
<text x="550" y="250" text-anchor="middle" class="s-sub">2 s</text>
<line x1="630" y1="36" x2="630" y2="232" style="stroke:var(--line);stroke-opacity:.4"/>
<text x="630" y="250" text-anchor="middle" class="s-sub">2.5 s</text>
<line x1="710" y1="36" x2="710" y2="232" style="stroke:var(--line);stroke-opacity:.4"/>
<text x="710" y="250" text-anchor="middle" class="s-sub">3 s</text>
<line x1="390" y1="26" x2="390" y2="232" style="stroke:var(--crit);stroke-dasharray:4 3" stroke-width="1.4"/>
<text x="390" y="18" text-anchor="middle" class="s-sub" style="fill:var(--crit)">SIGTERM</text>
<line x1="550" y1="26" x2="550" y2="232" style="stroke:var(--accent);stroke-dasharray:4 3" stroke-width="1.4"/>
<text x="550" y="18" text-anchor="middle" class="s-sub" style="fill:var(--accent)">balancer stops routing</text>
<text x="218" y="57" text-anchor="end" class="s-label">balancer sends to old</text>
<text x="218" y="105" text-anchor="end" class="s-label">exits at once (default)</text>
<text x="218" y="153" text-anchor="end" class="s-label">closes, finishes in-flight</text>
<text x="218" y="201" text-anchor="end" class="s-label">serves on, then drains</text>
<rect x="230.0" y="40" width="320.0" height="26" rx="4" style="fill:var(--accent);fill-opacity:.25;stroke:var(--accent)"/>
<text x="390.0" y="57" text-anchor="middle" class="s-sub" style="fill:var(--ink)">routing to the old instance</text>
<rect x="230.0" y="88" width="160.0" height="26" rx="4" style="fill:var(--good);fill-opacity:.55;stroke:var(--good)"/>
<text x="310.0" y="105" text-anchor="middle" class="s-sub" style="fill:var(--ink)">serving</text>
<rect x="390.0" y="88" width="160.0" height="26" rx="4" style="fill:var(--crit);fill-opacity:.3;stroke:var(--crit)"/>
<text x="470.0" y="105" text-anchor="middle" class="s-sub" style="fill:var(--ink)">refused</text>
<rect x="230.0" y="136" width="160.0" height="26" rx="4" style="fill:var(--good);fill-opacity:.55;stroke:var(--good)"/>
<text x="310.0" y="153" text-anchor="middle" class="s-sub" style="fill:var(--ink)">serving</text>
<rect x="390.0" y="136" width="40.0" height="26" rx="4" style="fill:var(--warn);fill-opacity:.55;stroke:var(--warn)"/>
<rect x="430.0" y="136" width="120.0" height="26" rx="4" style="fill:var(--crit);fill-opacity:.3;stroke:var(--crit)"/>
<text x="490.0" y="153" text-anchor="middle" class="s-sub" style="fill:var(--ink)">refused</text>
<rect x="230.0" y="184" width="160.0" height="26" rx="4" style="fill:var(--good);fill-opacity:.55;stroke:var(--good)"/>
<text x="310.0" y="201" text-anchor="middle" class="s-sub" style="fill:var(--ink)">serving</text>
<rect x="390.0" y="184" width="240.0" height="26" rx="4" style="fill:var(--good);fill-opacity:.25;stroke:var(--good)"/>
<text x="510.0" y="201" text-anchor="middle" class="s-sub" style="fill:var(--ink)">serving, readiness fails</text>
<rect x="630.0" y="184" width="32.0" height="26" rx="4" style="fill:var(--warn);fill-opacity:.55;stroke:var(--warn)"/>
<text x="668.0" y="201" class="s-sub">exit</text>
</svg>` },

    { t: "diagram", kind: "steps", title: "A graceful shutdown in Kubernetes",
      items: [
        { label: "Pod deleted", desc: "A deploy, scale-in or node drain. Endpoint removal and the shutdown sequence start at once.", tone: "accent" },
        { label: "preStop: sleep", desc: "Wait a few seconds so every proxy and balancer drops the pod before it stops accepting.", tone: "violet" },
        { label: "SIGTERM", desc: "Fail readiness, stop accepting new connections, finish the requests in flight.", tone: "warn" },
        { label: "Exit 0", desc: "Close pools, flush buffers, exit well inside the grace period (30 s by default).", tone: "good" },
        { label: "SIGKILL", desc: "Anything still running when the grace period ends is killed, mid-request.", tone: "crit" }
      ] },

    { t: "callout", kind: "trap", title: "Your process may never see SIGTERM",
      body: [
        { t: "p", text: "In a container your program is usually PID 1, and Linux gives PID 1 no default signal actions: a process that has not installed a SIGTERM handler simply ignores it, sits through the grace period, and is killed by SIGKILL with requests in flight. A shell wrapper — the string form of `CMD`, or an entrypoint script without `exec` — can also swallow the signal before it reaches the app. Install a handler, use the exec (JSON array) form of `CMD`, and run a minimal init such as tini when the process spawns children." }
      ] },

    { t: "callout", kind: "note", title: "Probes, briefly",
      body: [
        { t: "p", text: "Lesson 2.2 covered health checks; the rules carry straight over to Kubernetes. A **liveness** probe answers \"restart me?\" and should test only the process itself; a **readiness** probe answers \"send me traffic?\" and is what drain.py failed on purpose; a **startup** probe holds the other two off while a slow service loads. Never put a shared dependency in a liveness probe: when the database blips, every pod fails it at once and the whole fleet restarts together, turning a brief outage into a long one." }
      ] },

    { t: "h2", n: "05", id: "patterns", text: "Container patterns and hardening",
      sub: "Helpers beside the app, work before it, and controllers that run whole systems" },

    { t: "table", head: ["Pattern", "What it is", "Typical use"],
      rows: [
        ["Sidecar", "a helper container in the same pod, sharing its network and volumes", "the mesh proxy of 10.5, a log shipper, a certificate refresher"],
        ["Ambassador", "a sidecar that proxies the app's outbound calls", "a local endpoint that hides a database's failover or sharding"],
        ["Adapter", "a sidecar that converts the app's output to a standard form", "exposing a legacy service's metrics in Prometheus format"],
        ["Init container", "runs to completion before the app starts", "fetching configuration, waiting for a dependency, a one-off setup step"],
        ["Operator", "a controller that reconciles a custom resource with domain knowledge", "running PostgreSQL or Kafka: failover, backups, version upgrades"]
      ] },

    { t: "callout", kind: "good", title: "An image with little to exploit",
      body: [
        { t: "p", text: "Build from a minimal base (distroless or a slim image) so there is no shell or package manager for an intruder; run as a non-root user with a read-only root filesystem and Linux capabilities dropped; scan images for known vulnerabilities in CI (Trivy, Grype) and rebuild when the base is patched; sign images and verify the signature at admission (Sigstore's cosign); set resource limits; and apply Kubernetes **network policies** that deny pod-to-pod traffic by default — the cluster's equivalent of security groups, and the place zero trust (12.3) starts inside it." }
      ] },

    { t: "exercise", kind: "Challenge", title: "An address plan for the whole organisation",
      difficulty: "core", minutes: 30,
      body: [
        { t: "p", text: "Write the allocator a platform team would run before creating any network. Three environments (production, staging, development) each need a VPC in two regions, carved from `10.0.0.0/8` without touching the ranges already in use: the data centre's `10.0.0.0/12` and a legacy VPC at `10.20.0.0/16`. Inside each VPC, size every subnet from what must fit in it rather than by habit — production runs up to 3,000 pods per zone, the others 500, and each pod takes an address — then prove the whole plan is free of overlaps." }
      ],
      requirements: [
        "One /16 per environment and region, skipping any block that overlaps a range in use",
        "Subnet prefixes computed from the hosts needed plus the five reserved addresses, one subnet per tier per zone",
        "Assert that every subnet sits inside its VPC and that each VPC keeps at least half its space free",
        "Check every subnet against every other and against the ranges in use, and report the count of overlaps"
      ],
      hint: "The prefix for n hosts is 32 − ⌈log₂(n + 5)⌉. Allocate each VPC's largest subnets first, splitting free blocks with address_exclude, so smaller ones never leave unaligned holes.",
      solution: { lang: "python", title: "cidr_ex.py",
        code: `import ipaddress as ip, itertools, math

RESERVED = 5
SUPERNET = ip.ip_network("10.0.0.0/8")
IN_USE = {"on-prem": ip.ip_network("10.0.0.0/12"), "legacy VPC": ip.ip_network("10.20.0.0/16")}
ENVS = {"prod": 3000, "staging": 500, "dev": 500}           # pod IPs needed per zone (one IP per pod)
REGIONS = {"eu-west-1": 3, "us-east-1": 3}                   # zones used per region
TIERS = {"public": 40, "data": 40}                           # hosts needed per zone, besides pods

def prefix_for(hosts):                                       # smallest subnet that holds hosts + reserved
    return 32 - math.ceil(math.log2(hosts + RESERVED))

def carve(free, prefix):
    for i, block in enumerate(free):
        if block.prefixlen <= prefix:
            sub = next(block.subnets(new_prefix=prefix))
            free[i:i + 1] = sorted(block.address_exclude(sub)); return sub
    raise ValueError(f"no room for /{prefix}")

vpc_blocks = (n for n in SUPERNET.subnets(new_prefix=16)
              if not any(n.overlaps(u) for u in IN_USE.values()))
plan, every = [], list(IN_USE.items())
for (env, pods), (region, zones) in itertools.product(ENVS.items(), REGIONS.items()):
    vpc = next(vpc_blocks); free = [vpc]
    needs = sorted([("app", prefix_for(pods))] + [(t, prefix_for(h)) for t, h in TIERS.items()], key=lambda t: t[1])
    subnets = [(tier, carve(free, p)) for tier, p in needs for _ in range(zones)]
    used = sum(s.num_addresses for _, s in subnets)
    assert all(s.subnet_of(vpc) for _, s in subnets) and used <= vpc.num_addresses / 2, f"{env} {region} too tight"
    plan.append((env, region, vpc, subnets, used))
    every += [(f"{env}/{region}/{t}", s) for t, s in subnets]

for env, region, vpc, subnets, used in plan:
    shape = ", ".join(f"{t} /{s.prefixlen} x{sum(1 for x, _ in subnets if x == t)}"
                      for t, s in dict(subnets).items())
    print(f"{env:<8}{region:<11}{str(vpc):<14}{shape:<40}free {1 - used / vpc.num_addresses:.0%}")

clashes = [(a, b) for (a, x), (b, y) in itertools.combinations(every, 2) if x.overlaps(y) and not
           (a in IN_USE and b in IN_USE)]
print(f"\\nchecked {len(plan)} VPCs and {len(every) - len(IN_USE)} subnets against each other and "
      f"{', '.join(IN_USE)}: {len(clashes)} overlaps")`,
        out: `prod    eu-west-1  10.16.0.0/16  app /20 x3, public /26 x3, data /26 x3  free 81%
prod    us-east-1  10.17.0.0/16  app /20 x3, public /26 x3, data /26 x3  free 81%
staging eu-west-1  10.18.0.0/16  app /23 x3, public /26 x3, data /26 x3  free 97%
staging us-east-1  10.19.0.0/16  app /23 x3, public /26 x3, data /26 x3  free 97%
dev     eu-west-1  10.21.0.0/16  app /23 x3, public /26 x3, data /26 x3  free 97%
dev     us-east-1  10.22.0.0/16  app /23 x3, public /26 x3, data /26 x3  free 97%

checked 6 VPCs and 54 subnets against each other and on-prem, legacy VPC: 0 overlaps`,
        notes: [
          { t: "p", text: "The generator stepped over `10.20.0.0/16`, so development in eu-west-1 landed on `10.21.0.0/16`; nothing collides with the data centre or the legacy VPC, so any two of these networks can be peered later. Production's app subnets came out at /20 — 3,000 pods plus reserved addresses need 4,096 — while staging and development needed only /23. Data and public tiers holding 40 hosts got /26 rather than the habitual /24." },
          { t: "p", text: "Every VPC still has four-fifths or more of its space free, which is the point: the plan has room for a third zone, a new tier, or a cluster that grows. In practice this register lives in an IPAM tool or in infrastructure-as-code (12.5), and new networks are allocated from it rather than typed by hand." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: the cluster that ran out of addresses on its busiest day",
      body: [
        { t: "p", text: "**Symptom.** During a sale, the cluster autoscaler added nodes as designed, but new pods stayed stuck in `ContainerCreating` with \"failed to assign an IP address\". The nodes had plenty of CPU and memory; the shop's capacity stopped growing at about two-thirds of what the sale needed." },
        { t: "p", text: "**Mechanism.** The Kubernetes network plugin gave every pod a real VPC address, and each node also held a pool of spare addresses ready for new pods. The app subnets were /24s — 251 usable addresses per zone — sized years earlier for a dozen virtual machines. Forty nodes' warm pools plus the running pods used every address in all three zones, so the autoscaler could add nodes that could never run anything." },
        { t: "p", text: "**Fix.** That night: shrink the warm pools to release addresses. That month: add a secondary range from the `100.64.0.0/10` shared address space for pod subnets, assign addresses to nodes in prefixes rather than one at a time, and alert on free addresses per subnet like any other capacity metric. Every new VPC since has been planned as in cidr_plan.py, with /20 app subnets." }
      ] }
  ],

  takeaways: [
    "A **VPC** is your private address range; **subnets** split it by tier and by zone, and each subnet lives in exactly one zone.",
    "Plan addresses centrally: **overlapping ranges can never be connected** — the acquired company's VPC and a copied template both clashed.",
    "A subnet is public **because its route table** sends `0.0.0.0/0` to an internet gateway; routing is **longest-prefix match**.",
    "A **NAT gateway** lets private instances call out and lets only replies back in; run **one per zone**, and use **endpoints** for cloud storage.",
    "**Security groups** are stateful allow-lists; reference **groups, not addresses**, so new instances are covered automatically.",
    "**Network ACLs** are stateless: allow the **ephemeral return ports**, or connections hang instead of failing.",
    "Treat instances as **cattle**: stateless processes, config in the environment, backing services by URL, logs to stdout.",
    "Measured: exiting on SIGTERM, or merely finishing in-flight work, failed about **forty requests per instance per deploy**; failing readiness and serving until deregistered failed **none**.",
    "In containers, make sure SIGTERM **reaches** the process: PID 1 has no default handlers.",
    "Use **sidecars, init containers and operators** for what they fit, and ship minimal, non-root, signed images with default-deny network policies."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "What makes a subnet public?",
        options: ["A \"public\" setting on the subnet", "Its route table sends 0.0.0.0/0 to an internet gateway (and its instances have public addresses)", "It contains a NAT gateway", "Its security groups allow 0.0.0.0/0"],
        answer: 1,
        why: "Public and private are properties of routing. A subnet whose default route points at the internet gateway is public; one pointing at a NAT gateway is private with outbound access; one with no default route is isolated. Security groups filter traffic but cannot create a route." },

      { stem: "An app instance in a private subnet calls an external payment API. How does the request leave, and can the API open a connection to the instance later?",
        options: ["Directly through the internet gateway; yes", "Through the NAT gateway, which rewrites the source address; no — the NAT lets in only replies to connections that went out", "It cannot reach the API at all", "Through VPC peering; yes"],
        answer: 1,
        why: "The app route table sends the default route to the NAT gateway, which tracks each outgoing connection. Replies match a tracked connection and are translated back; anything unsolicited, like routes.py's scanner, is dropped." },

      { stem: "The database's security group allows port 5432 from the app's security group rather than from the app subnets' address range. What does that give you?",
        options: ["Nothing; the two are equivalent", "Access follows role rather than address: newly launched app instances are allowed automatically, and other things in those subnets are not", "Encryption of the traffic", "A stateless rule"],
        answer: 1,
        why: "A group reference matches whatever instances currently carry the group, so app-9 in sg.py was allowed the minute it launched. An address-range rule would also admit anything else placed in those subnets, and an address list would go stale with every replacement." },

      { stem: "During every deploy about forty requests fail, although the old instances finish their in-flight requests before exiting. What is the likely cause?",
        options: ["The new instances start too slowly", "The balancer keeps routing to an old instance for a moment after SIGTERM, and it has already stopped accepting; it should fail readiness and keep serving until deregistered", "SIGTERM is never delivered in containers", "The health check on the new instances is too strict"],
        answer: 1,
        why: "Removal from the balancer and SIGTERM happen in parallel, so for a moment traffic still arrives. drain.py's second mode shows exactly this: in-flight requests were saved but about forty were refused. Serving on while failing readiness (or a preStop sleep) closes the gap." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "Cloud network questions reward a layout drawn tier by tier, with the reasons for each boundary.",
    questions: [
      { level: "advanced",
        q: "Design the network for a three-tier web application in the cloud.",
        strong: "A strong answer covers address planning, tiers and zones, routing, filtering, and private access to cloud services.",
        answer: [
          { t: "p", text: "One VPC per environment, with a range allocated from a central plan so it can later be peered with others and the data centre. Within it, three tiers — public, app and data — each with a subnet in every zone used, sized for growth: the app tier largest because instances and pods multiply. Public subnets route the default route to the internet gateway and hold only the load balancer's nodes and the NAT gateways; app subnets route it to the NAT gateway in their own zone; data subnets have no default route at all." },
          { t: "p", text: "Security groups by role: the load balancer accepts 443 from anywhere, the app accepts its port only from the load balancer's group, the database only from the app's group; network ACLs as a coarse extra fence. Gateway or interface endpoints for object storage and other cloud services so that traffic stays private and off the NAT bill. Administrative access through a session manager or bastion with audited, short-lived credentials rather than open SSH, and flow logs for investigation." }
        ] },

      { level: "core",
        q: "What is the difference between a security group and a network ACL?",
        strong: "A strong answer names stateful against stateless, instance against subnet, and when each is used.",
        answer: [
          { t: "p", text: "A security group attaches to an instance's network interface, is stateful — replies to allowed traffic are allowed automatically — has only allow rules, and can name another security group as a source, which makes role-based rules that survive instance replacement. A network ACL attaches to a subnet, is stateless, has numbered allow and deny rules evaluated in order, and works only on address ranges." },
          { t: "p", text: "Security groups do the real work. ACLs are a coarse second layer — blocking a hostile range, fencing a tier — and their statelessness means the return traffic on ephemeral ports must be allowed explicitly, or connections hang." }
        ] },

      { level: "core",
        q: "How do you make a service safe to kill at any moment?",
        strong: "A strong answer covers state, configuration, graceful shutdown with the load balancer race, and probes.",
        answer: [
          { t: "p", text: "Keep no state on the instance: sessions, files and caches that matter live in backing services, configuration comes from the environment, and logs go to stdout. Make startup fast so replacement is cheap. On SIGTERM, fail readiness, keep serving for a few seconds while load balancers and proxies stop routing to it — in Kubernetes often a preStop sleep — then stop accepting, finish in-flight work, close connections and exit inside the grace period." },
          { t: "p", text: "Make sure the signal reaches the process — PID 1 in a container has no default handlers. Keep liveness probes to the process itself so a dependency outage does not restart the fleet, and prove it all by killing instances under load: a deploy should fail zero requests." }
        ] }
    ]
  }
});
