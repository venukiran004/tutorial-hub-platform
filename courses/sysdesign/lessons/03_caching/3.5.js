/* ============================================================================
   LESSON 3.5 — CDNs and the Edge
   ========================================================================= */
EC.receiveLesson({
  id: "3.5",

  lede: "A content delivery network is a cache placed in hundreds of cities, so a user's request is answered a few milliseconds away instead of an ocean away (1.2). Two things decide whether it works. The **topology**: forty edge caches each warming separately send the origin far more traffic than people expect, and a shared middle tier fixes it. And the **cache key**: one tracking parameter on a URL makes every request unique and silently turns the CDN into an expensive proxy. Everything else is headers — the origin tells every cache on the path what it may keep and for how long.",

  objectives: [
    "Describe how a request reaches the nearest point of presence and what happens on a miss",
    "Measure the origin offload of edge caching, with and without an origin shield",
    "Design cache keys that do not fragment on irrelevant query parameters or headers",
    "Write Cache-Control headers for static assets, HTML, public APIs and private data",
    "Deploy new assets without purging, using content-hashed file names"
  ],

  prerequisites: ["1.4", "3.1", "3.4"],

  blocks: [

    { t: "h2", n: "01", id: "topology", text: "How a CDN is arranged",
      sub: "Edges near users, a shield near the origin" },

    { t: "viz", title: "Users, points of presence, the shield and the origin",
      caption: "DNS or anycast routes each user to the nearest point of presence (1.1). A miss at the edge goes not to the origin but to a regional shield, which is shared by many edges — so an object is fetched from the origin once per shield, not once per city. The edge also terminates TLS close to the user (1.4).",
      svg: `<svg viewBox="0 0 760 262" width="100%" role="img" aria-label="CDN topology">
  <defs><marker id="cd-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--line)"/></marker></defs>
  <text x="70" y="20" text-anchor="middle" class="s-sub">users</text>
  <text x="250" y="20" text-anchor="middle" class="s-sub">edge PoPs (hundreds)</text>
  <text x="470" y="20" text-anchor="middle" class="s-sub">regional shield</text>
  <text x="660" y="20" text-anchor="middle" class="s-sub">origin</text>
  <circle cx="50" cy="52" r="10" class="s-fill s-stroke"/><circle cx="86" cy="64" r="10" class="s-fill s-stroke"/>
  <circle cx="50" cy="128" r="10" class="s-fill s-stroke"/><circle cx="86" cy="140" r="10" class="s-fill s-stroke"/>
  <circle cx="50" cy="204" r="10" class="s-fill s-stroke"/><circle cx="86" cy="216" r="10" class="s-fill s-stroke"/>
  <rect x="190" y="38" width="120" height="40" rx="8" class="s-fill" style="stroke:var(--good)" stroke-width="1.5"/>
  <text x="250" y="57" text-anchor="middle" class="s-label">Leeds PoP</text><text x="250" y="71" text-anchor="middle" class="s-sub">~8 ms away</text>
  <rect x="190" y="114" width="120" height="40" rx="8" class="s-fill" style="stroke:var(--good)" stroke-width="1.5"/>
  <text x="250" y="133" text-anchor="middle" class="s-label">Paris PoP</text><text x="250" y="147" text-anchor="middle" class="s-sub">~10 ms away</text>
  <rect x="190" y="190" width="120" height="40" rx="8" class="s-fill" style="stroke:var(--good)" stroke-width="1.5"/>
  <text x="250" y="209" text-anchor="middle" class="s-label">Madrid PoP</text><text x="250" y="223" text-anchor="middle" class="s-sub">~12 ms away</text>
  <line x1="98" y1="60" x2="188" y2="58" style="stroke:var(--line)" stroke-width="1.3" marker-end="url(#cd-a)"/>
  <line x1="98" y1="136" x2="188" y2="134" style="stroke:var(--line)" stroke-width="1.3" marker-end="url(#cd-a)"/>
  <line x1="98" y1="212" x2="188" y2="210" style="stroke:var(--line)" stroke-width="1.3" marker-end="url(#cd-a)"/>
  <rect x="410" y="108" width="120" height="52" rx="9" class="s-fill" style="stroke:var(--accent)" stroke-width="1.6"/>
  <text x="470" y="130" text-anchor="middle" class="s-label">EU shield</text><text x="470" y="146" text-anchor="middle" class="s-sub">shared by all EU PoPs</text>
  <line x1="310" y1="58" x2="408" y2="122" style="stroke:var(--line);stroke-dasharray:4 3" stroke-width="1.3" marker-end="url(#cd-a)"/>
  <line x1="310" y1="134" x2="408" y2="134" style="stroke:var(--line);stroke-dasharray:4 3" stroke-width="1.3" marker-end="url(#cd-a)"/>
  <line x1="310" y1="210" x2="408" y2="146" style="stroke:var(--line);stroke-dasharray:4 3" stroke-width="1.3" marker-end="url(#cd-a)"/>
  <text x="358" y="96" text-anchor="middle" class="s-sub">miss</text>
  <rect x="600" y="104" width="120" height="60" rx="9" class="s-fill" style="stroke:var(--warn)" stroke-width="1.6"/>
  <text x="660" y="128" text-anchor="middle" class="s-label">Origin</text><text x="660" y="145" text-anchor="middle" class="s-sub">us-east · 80 ms</text>
  <line x1="530" y1="134" x2="598" y2="134" style="stroke:var(--warn);stroke-dasharray:4 3" stroke-width="1.4" marker-end="url(#cd-a)"/>
  <text x="564" y="126" text-anchor="middle" class="s-sub">rare</text>
  <text x="380" y="254" text-anchor="middle" class="s-sub">hits are answered at the edge · misses collapse at the shield · the origin sees a trickle</text>
</svg>` },

    { t: "p", text: "Forty points of presence of very different sizes, Zipf-distributed objects, a ten-minute TTL. How many requests still reach the origin?" },

    { t: "code", lang: "python", title: "cdn.py — origin offload, shield and cache keys", code: `import bisect, itertools, random

POPS, OBJECTS, REQUESTS, TTL_S, RATE = 40, 20_000, 400_000, 600, 400.0  # req/s overall
rng = random.Random(21)
cum = list(itertools.accumulate(1 / k ** 0.9 for k in range(1, OBJECTS + 1)))
pop_weight = list(itertools.accumulate(1 / (p + 1) for p in range(POPS)))   # big cities, small towns

def run(shield: bool, normalise_keys: bool, utm_share: float):
    edge = [dict() for _ in range(POPS)]          # per-PoP: key -> expiry time
    mid, t, origin = {}, 0.0, 0
    for _ in range(REQUESTS):
        t += rng.expovariate(RATE)
        pop = bisect.bisect(pop_weight, rng.random() * pop_weight[-1])
        obj = bisect.bisect(cum, rng.random() * cum[-1])
        url = f"/img/{obj}.jpg"
        if rng.random() < utm_share:              # marketing links append tracking parameters
            url += f"?utm_source=mail&utm_id={rng.randrange(10**6)}"
        key = url.split("?")[0] if normalise_keys else url
        if edge[pop].get(key, -1) > t: continue   # edge hit
        if shield and mid.get(key, -1) > t:       # regional shield hit
            edge[pop][key] = t + TTL_S; continue
        origin += 1                                # went all the way to the origin
        edge[pop][key] = t + TTL_S
        if shield: mid[key] = t + TTL_S
    return origin

print("%-44s %16s %10s" % ("configuration", "origin requests", "offload"))
for label, sh, norm, utm in (("40 PoPs, clean URLs", False, True, 0.0),
                             ("40 PoPs + origin shield", True, True, 0.0),
                             ("+ 30% of URLs carry utm_* params", True, False, 0.3),
                             ("+ cache key ignores query string", True, True, 0.3)):
    o = run(sh, norm, utm)
    print("%-44s %16s %9.1f%%" % (label, "{:,}".format(o), 100 * (1 - o / REQUESTS)))`,
      out: `configuration                                 origin requests    offload
40 PoPs, clean URLs                                   156,191      61.0%
40 PoPs + origin shield                                32,876      91.8%
+ 30% of URLs carry utm_* params                      150,213      62.4%
+ cache key ignores query string                       32,879      91.8%`,
      hl: [17, 18, 20, 22],
      caption: "Without a shield, **each of forty PoPs warms its own copy** of every object, and the long tail of small PoPs misses constantly — only 61% offload. A shield collapses those misses into one fetch per object per TTL: 92%. Then the trap: tracking parameters on 30% of URLs make those requests unique keys, and offload falls back to where it started. Normalising the key restores it." },

    { t: "callout", kind: "trap", title: "Query strings that fragment the cache",
      body: [
        { t: "p", text: "By default a CDN's cache key is the full URL including the query string. Marketing links add `?utm_source=…&utm_id=…`, analytics adds `?_ga=…`, cache-busting code adds `?t=1727798400` — and every variation is a separate cache entry that misses on first sight. Nothing errors; the CDN bill and the origin load just climb, and the hit-ratio graph, if anyone watches it, sags." },
        { t: "p", text: "Configure the cache key explicitly: **include only the parameters that change the response** (an allow-list such as `page`, `size`, `lang`), drop everything else, and sort the ones you keep so `?a=1&b=2` and `?b=2&a=1` are one entry. The same applies to headers: varying on `User-Agent` creates thousands of entries; vary on a normalised `device=mobile|desktop` instead." }
      ] },

    { t: "h2", n: "02", id: "headers", text: "Cache-Control: the origin's instructions",
      sub: "One header tells browsers and every CDN layer what they may do" },

    { t: "diagram", kind: "matrix", title: "The directives that matter",
      caption: "`max-age` is for every cache, `s-maxage` overrides it for shared caches (CDNs) only, so a page can be cached for a minute at the edge but revalidated by the browser every time. `stale-while-revalidate` and `stale-if-error` are the CDN-level forms of 3.4's stampede protection.",
      cols: ["Meaning", "Typical use"],
      rows: ["max-age=N", "s-maxage=N", "no-cache", "no-store", "private", "immutable", "stale-while-revalidate=N", "stale-if-error=N"],
      cells: [
        [{ text: "fresh for N s in any cache", tone: "accent" }, { text: "everything cacheable" }],
        [{ text: "fresh for N s in shared caches only", tone: "accent" }, { text: "API responses at the edge" }],
        [{ text: "may store, must revalidate each use", tone: "warn" }, { text: "HTML shells" }],
        [{ text: "never store anywhere", tone: "crit" }, { text: "account pages, tokens" }],
        [{ text: "browser only, never a CDN", tone: "crit" }, { text: "per-user responses" }],
        [{ text: "will never change at this URL", tone: "good" }, { text: "content-hashed assets" }],
        [{ text: "serve stale for N s while refreshing", tone: "good" }, { text: "hot API responses" }],
        [{ text: "serve stale for N s if origin fails", tone: "good" }, { text: "resilience (7.5)" }]
      ] },

    { t: "callout", kind: "warn", title: "Never let a CDN cache a personalised response",
      body: [
        { t: "p", text: "A response that depends on the logged-in user — an account page, a basket, `/api/me` — must carry `Cache-Control: private` or `no-store`. If it is cached at the edge under its URL, the next user requesting that URL from the same PoP receives the first user's data. This has happened to large companies more than once, usually after a CDN configuration change that made a default more aggressive. Mark personalised responses explicitly; never rely on a CDN's default." }
      ] },

    { t: "h2", n: "03", id: "deploys", text: "Changing what is cached",
      sub: "Purging, versus never needing to" },

    { t: "diagram", kind: "compare", title: "Two ways to ship a new version of app.js",
      caption: "Content-hashed names make every deploy a new URL, so old and new versions coexist, nothing is purged, and assets can be cached for a year. Only the small HTML file that references them is short-lived.",
      columns: [
        { title: "Same URL, then purge", tone: "warn", items: [
          "/static/app.js changes in place",
          "purge it on every PoP after deploy",
          "purges take seconds to minutes to propagate",
          "browsers still hold the old copy for max-age",
          "HTML and JS can mismatch mid-rollout"
        ] },
        { title: "Content-hashed URL, never purge", tone: "good", items: [
          "/static/app.3f9a1c.js — hash of the contents",
          "Cache-Control: max-age=31536000, immutable",
          "new build → new name → new cache entry",
          "HTML (no-cache) points to the new names",
          "old and new coexist during the rollout"
        ] }
      ] },

    { t: "p", text: "Purge remains necessary for the cases hashing cannot cover — a product image replaced at the same URL, a legal takedown, a mistake that must vanish now. Most CDNs purge a single URL in seconds and support **surrogate keys** (cache tags): tag every response with the product ids it contains, then purge `product-42` to drop every page that mentioned it, the CDN-side equivalent of 3.3's generation numbers." },

    { t: "h2", n: "04", id: "edge", text: "What belongs at the edge",
      sub: "More than images" },

    { t: "table",
      head: ["Content", "At the edge?", "How"],
      rows: [
        ["JS, CSS, fonts, images, video segments", "Always", "Content-hashed, a year, immutable"],
        ["HTML shell of a single-page app", "Yes, briefly", "no-cache, or max-age=60 with revalidation"],
        ["Public API responses (catalogue, prices)", "Often", "s-maxage=30–300 + stale-while-revalidate"],
        ["Personalised responses", "Never cached", "private / no-store — but TLS still terminates at the edge"],
        ["Uploads and downloads of private files", "Through the edge", "Signed URLs with expiry (4.4)"],
        ["Logic: redirects, A/B bucketing, auth checks", "Sometimes", "Edge functions — keep them small and stateless"]
      ],
      caption: "Even an uncacheable request benefits from the edge: TLS terminates close to the user and the edge reuses a warm connection to the origin (1.4's exercise)." },

    { t: "exercise", kind: "Challenge", title: "Write the headers for a storefront",
      difficulty: "core", minutes: 20,
      body: [
        { t: "p", text: "Give the `Cache-Control` header — and any CDN cache-key rule — for each response of an online shop, and justify each choice in one line." },
        { t: "ol", items: [
          "`/static/app.3f9a1c.js` and `/static/styles.81b0e2.css`",
          "`/index.html`, the single-page app's shell",
          "`/api/products/42` — price and description, changes a few times a day",
          "`/api/products?category=kettles&page=2&utm_source=newsletter`",
          "`/api/me` and `/api/basket`",
          "`/media/products/42/main.jpg` — replaced occasionally at the same URL"
        ] }
      ],
      requirements: [
        "A header for each of the six",
        "A cache-key rule for the listing endpoint",
        "Say which responses could be served stale if the origin is down, and for how long",
        "Say how the product image is updated, given its URL does not change"
      ],
      hint: "Sort the responses into: never changes at this URL, changes and is public, and personal. Each group has one shape of header.",
      solution: { lang: "text", title: "headers.txt",
        code: `1  app.3f9a1c.js, styles.81b0e2.css
   Cache-Control: public, max-age=31536000, immutable
   -- the hash changes with the content; this URL will never mean anything else

2  /index.html
   Cache-Control: no-cache
   -- stored, but revalidated (ETag) on every use, so a deploy is visible at once

3  /api/products/42
   Cache-Control: public, max-age=0, s-maxage=60, stale-while-revalidate=300, stale-if-error=86400
   -- browsers always ask; the CDN keeps it 60 s, refreshes in the background,
      and keeps serving it for a day if the origin is down
   Surrogate-Key: product-42      (purge on price change)

4  /api/products?category=kettles&page=2&utm_source=newsletter
   same header as 3, Surrogate-Key: category-kettles
   CDN cache key: path + allow-listed, sorted params {category, page, sort, lang}
   -- utm_*, _ga, fbclid are dropped from the key (and still logged)

5  /api/me, /api/basket
   Cache-Control: private, no-store
   -- personal: never in a shared cache; TLS still terminates at the edge

6  /media/products/42/main.jpg
   Cache-Control: public, max-age=86400
   -- on replacement, purge the URL (or better: store as main.<hash>.jpg and
      point the product record at the new name)`,
        notes: [
          { t: "p", text: "The split into **immutable, public-changing and personal** covers almost every response a web system produces, and each group has one shape of header. Getting group 5 wrong is a data leak; getting group 1 wrong is only a slower site — which is why `private` is stated explicitly rather than assumed." },
          { t: "p", text: "Separating `max-age` from `s-maxage` on the API lets the CDN absorb the load while browsers stay current, and `stale-if-error=86400` quietly turns the CDN into a resilience layer: if the origin is down, the catalogue keeps working for a day on its last good copy (7.5). That one directive is often the cheapest availability improvement in a system." },
          { t: "p", text: "The cache-key allow-list on item 4 is the fix for section 01's trap. Dropping tracking parameters from the key does not drop them from the request — the CDN still forwards them in logs — so marketing keeps its attribution and the cache keeps its hit ratio." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: one customer's account page served to thousands",
      body: [
        { t: "p", text: "**Symptom.** Shortly after a CDN configuration change, customers reported seeing another person's name, address and order history on the account page. It affected only some users, in some regions, for about forty minutes." },
        { t: "p", text: "**Mechanism.** The change enabled caching for \"all API paths\" to reduce origin load on catalogue endpoints. The account endpoint returned no `Cache-Control` header at all, and the new rule treated missing headers as cacheable for five minutes. The first request to each PoP after expiry cached that user's personal response under the shared URL `/api/account`, and everyone else hitting that PoP received it." },
        { t: "p", text: "**Fix.** Caching was disabled within minutes of the first report, the cache purged, and the incident disclosed. Then: every personalised endpoint emits `Cache-Control: private, no-store` explicitly from shared middleware; the CDN rule became an allow-list of cacheable paths rather than a deny-list; and a synthetic test logs in as two users from the same PoP and fails the deploy if either sees the other's data." }
      ] }
  ],

  takeaways: [
    "A CDN is a cache in hundreds of cities: users reach the **nearest PoP** by DNS or anycast, and TLS terminates there.",
    "Measured over 40 PoPs: edge caching alone offloaded **61%**; adding an **origin shield** — a shared middle tier — raised it to **92%**.",
    "Small PoPs miss constantly because each warms its own copy; the shield collapses their misses into one origin fetch per object per TTL.",
    "**Cache keys fragment** on irrelevant query parameters: utm parameters on 30% of URLs dropped offload back to 62%. Allow-list and sort the parameters in the key.",
    "`max-age` is for every cache; **`s-maxage`** is for shared caches only; `stale-while-revalidate` and **`stale-if-error`** add stampede protection and resilience at the edge.",
    "**Personalised responses must say `private` or `no-store` explicitly** — a CDN caching one under a shared URL serves it to everyone.",
    "Ship assets under **content-hashed names** with `max-age=31536000, immutable`; only the HTML that references them is short-lived. No purging.",
    "When you must purge, use **surrogate keys** to drop every response tagged with an id.",
    "Uncacheable traffic still gains from the edge: **near TLS termination and warm origin connections**."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A CDN has 40 PoPs and a 61% offload ratio. Adding a regional origin shield raises it to 92%. Why?",
        options: ["The shield caches longer than the PoPs", "Each PoP was fetching every object from the origin separately; the shield is shared, so the origin sees one fetch per object per TTL", "The shield compresses responses", "The shield blocks bots"],
        answer: 1,
        why: "Without a shield, forty independent caches each miss on every object at least once per TTL, and small PoPs miss on most of the long tail; with a shared shield those misses are satisfied one tier up, so the origin is asked once instead of up to forty times. The TTL in the simulation was the same at both tiers, and compression and bot filtering do not change how often an object is fetched." },

      { stem: "Which header lets a CDN cache an API response for 60 seconds while making browsers revalidate every time?",
        options: ["Cache-Control: max-age=60", "Cache-Control: max-age=0, s-maxage=60", "Cache-Control: private, max-age=60", "Cache-Control: no-store"],
        answer: 1,
        why: "s-maxage applies only to shared caches such as CDNs and overrides max-age there, so the edge keeps the response 60 seconds while browsers, seeing max-age=0, revalidate. max-age=60 alone would let browsers keep it too; private forbids the CDN from caching it at all; and no-store forbids every cache." },

      { stem: "How do content-hashed file names (app.3f9a1c.js) remove the need to purge on deploy?",
        options: ["The CDN detects the hash and purges automatically", "Each new build produces a new URL, so the old cached file is simply never requested again", "Hashes make the file smaller", "Browsers do not cache hashed files"],
        answer: 1,
        why: "Because the name is derived from the contents, a changed file gets a new URL, and the HTML that references it — itself not long-cached — points to the new one; the old entry is orphaned and expires. That is what makes a one-year immutable cache safe. CDNs do not interpret hashes, compression is unrelated, and browsers cache hashed files for exactly as long as the headers allow." },

      { stem: "An endpoint returning the logged-in user's basket has no Cache-Control header, and a CDN rule caches API responses by default. What can happen?",
        options: ["Nothing; CDNs never cache personal data", "The first user's basket is cached under the shared URL and served to other users of that PoP", "The basket is cached in the user's browser only", "The request is blocked"],
        answer: 1,
        why: "A shared cache keys on the URL, so without private or no-store the first response for /api/basket becomes the cached answer for everyone at that PoP until it expires — the data leak in the scenario. CDNs have no way to recognise personal data by themselves, and nothing restricts the response to the browser unless the header says private." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "\"Put a CDN in front\" is the start of the answer, not the end.",
    questions: [
      { level: "core",
        q: "How does a CDN make a site faster, and what goes on it?",
        strong: "A strong answer covers distance, offload and TLS, then classifies content by cacheability.",
        answer: [
          { t: "p", text: "Three ways. Distance: the user talks to a PoP a few milliseconds away instead of an origin across an ocean. Offload: hits never reach the origin, so it handles a fraction of the traffic. And connection set-up: TLS terminates at the edge, so the handshake's round trips are short, and the edge keeps warm connections back to the origin." },
          { t: "p", text: "On it: static assets under content-hashed names with year-long immutable caching; the HTML shell with no-cache so deploys show at once; public API responses with a short s-maxage plus stale-while-revalidate; and personal responses marked private or no-store so they pass through without being cached — they still benefit from the edge TLS." }
        ] },

      { level: "advanced",
        q: "Your CDN hit ratio is 55% and the origin is struggling. Where do you look?",
        strong: "A strong answer checks cache keys, headers, topology and the content mix.",
        answer: [
          { t: "p", text: "The cache key first: query parameters like utm tags or cache-busting timestamps, or varying on User-Agent, can make most requests unique. Then the headers the origin actually sends — missing Cache-Control, short max-age, or Set-Cookie on responses that make the CDN refuse to cache them." },
          { t: "p", text: "Then topology: with many PoPs and no shield, each warms separately and small PoPs miss on most of the tail, so enabling tiered caching or an origin shield often adds tens of points. Finally the content mix — if much of the traffic is personalised or long-tail, the realistic ceiling is lower, and stale-if-error and stale-while-revalidate protect the origin better than a higher hit ratio would." }
        ] },

      { level: "core",
        q: "How do you deploy new front-end code without users getting a mix of old and new files?",
        strong: "A strong answer describes content-hashed assets and a short-lived HTML entry point.",
        answer: [
          { t: "p", text: "Build every asset with a content hash in its file name and serve it with a one-year immutable Cache-Control. The HTML entry point is served with no-cache, so each page load revalidates it and picks up references to the new names." },
          { t: "p", text: "Old and new assets then coexist: a user mid-session keeps the old HTML and its old files, which are still cached and still served; a new page load gets the new HTML and new files. Nothing is purged, nothing mismatches, and rollback is just pointing the HTML back at the previous names." }
        ] }
    ]
  }
});
