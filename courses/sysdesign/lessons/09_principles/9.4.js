/* ============================================================================
   LESSON 9.4 — Structural Patterns
   ========================================================================= */
EC.receiveLesson({
  id: "9.4",

  lede: "Four structural patterns look alike in code — an object that holds another object and forwards calls to it — and are easy to confuse. They are told apart by **what the wrapper changes**. An **adapter** changes the interface, so two things that do not fit can work together. A **decorator** keeps the interface and adds a behaviour. A **facade** puts one simple interface in front of a whole subsystem. A **proxy** keeps the interface and controls access to the real object — lazily, remotely, with a cache or a check. Each one also exists at the scale of whole services, and each has a characteristic bug.",

  objectives: [
    "Tell adapter, decorator, facade and proxy apart by what each wrapper changes",
    "Write an adapter that translates units and errors, not just method names",
    "Write decorators that preserve the wrapped function's identity",
    "Recognise a remote proxy hiding network calls, and batch them instead",
    "Build a caching proxy that does not stampede its backend"
  ],

  prerequisites: ["9.1", "9.2"],

  blocks: [

    { t: "viz", title: "Four wrappers, told apart by what they change",
      caption: "All four sit between a caller and something else. The adapter's two arrows carry different interfaces; the decorator's carry the same one; the facade turns one call into several; the proxy carries the same interface but decides whether, when and how the real object is reached — here across a network, which is why that arrow is dashed.",
      svg: `<svg viewBox="0 0 760 404" width="100%" role="img" aria-label="Four structural wrappers">
<defs><marker id="wr-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--ink-3)"/></marker></defs>
<rect x="4" y="2" width="362" height="194" rx="12" style="fill:var(--violet);fill-opacity:.04;stroke:var(--line)"/>
<text x="16" y="22" class="s-label" style="fill:var(--violet)">Adapter</text>
<rect x="125" y="30" width="120" height="28" rx="8" class="s-fill" style="stroke:var(--line)" stroke-width="1.5"/><text x="185.0" y="48.0" text-anchor="middle" class="s-label">domain code</text>
<line x1="185" y1="58" x2="185" y2="80" style="stroke:var(--ink-3)" stroke-width="1.4" marker-end="url(#wr-a)"/><text x="193" y="73.0" class="s-mono" style="font-size:10px;fill:var(--ink-3)">charge(Decimal)</text>
<rect x="95" y="82" width="180" height="32" rx="8" class="s-fill" style="stroke:var(--violet)" stroke-width="1.5"/><text x="185.0" y="102.0" text-anchor="middle" class="s-mono">VendorPaymentAdapter</text>
<line x1="185" y1="114" x2="185" y2="136" style="stroke:var(--ink-3)" stroke-width="1.4" marker-end="url(#wr-a)"/><text x="193" y="129.0" class="s-mono" style="font-size:10px;fill:var(--ink-3)">create_charge(int)</text>
<rect x="125" y="138" width="120" height="28" rx="8" class="s-fill" style="stroke:var(--line)" stroke-width="1.5"/><text x="185.0" y="156.0" text-anchor="middle" class="s-mono">vendor API</text>
<text x="185" y="186" text-anchor="middle" class="s-sub">a different interface, translated</text>
<rect x="394" y="2" width="362" height="194" rx="12" style="fill:var(--accent);fill-opacity:.04;stroke:var(--line)"/>
<text x="406" y="22" class="s-label" style="fill:var(--accent)">Decorator</text>
<rect x="515" y="30" width="120" height="28" rx="8" class="s-fill" style="stroke:var(--line)" stroke-width="1.5"/><text x="575.0" y="48.0" text-anchor="middle" class="s-label">caller</text>
<line x1="575" y1="58" x2="575" y2="80" style="stroke:var(--ink-3)" stroke-width="1.4" marker-end="url(#wr-a)"/><text x="583" y="73.0" class="s-mono" style="font-size:10px;fill:var(--ink-3)">fetch(url)</text>
<rect x="485" y="82" width="180" height="32" rx="8" class="s-fill" style="stroke:var(--accent)" stroke-width="1.5"/><text x="575.0" y="102.0" text-anchor="middle" class="s-mono">@timed  @retry</text>
<line x1="575" y1="114" x2="575" y2="136" style="stroke:var(--ink-3)" stroke-width="1.4" marker-end="url(#wr-a)"/><text x="583" y="129.0" class="s-mono" style="font-size:10px;fill:var(--ink-3)">fetch(url)</text>
<rect x="515" y="138" width="120" height="28" rx="8" class="s-fill" style="stroke:var(--line)" stroke-width="1.5"/><text x="575.0" y="156.0" text-anchor="middle" class="s-mono">fetch()</text>
<text x="575" y="186" text-anchor="middle" class="s-sub">the same interface, plus a behaviour</text>
<rect x="4" y="206" width="362" height="194" rx="12" style="fill:var(--teal);fill-opacity:.04;stroke:var(--line)"/>
<text x="16" y="226" class="s-label" style="fill:var(--teal)">Facade</text>
<rect x="125" y="234" width="120" height="28" rx="8" class="s-fill" style="stroke:var(--line)" stroke-width="1.5"/><text x="185.0" y="252.0" text-anchor="middle" class="s-label">mobile app</text>
<line x1="185" y1="262" x2="185" y2="284" style="stroke:var(--ink-3)" stroke-width="1.4" marker-end="url(#wr-a)"/><text x="193" y="277.0" class="s-mono" style="font-size:10px;fill:var(--ink-3)">checkout(cart)</text>
<rect x="95" y="286" width="180" height="32" rx="8" class="s-fill" style="stroke:var(--teal)" stroke-width="1.5"/><text x="185.0" y="306.0" text-anchor="middle" class="s-mono">CheckoutFacade</text>
<line x1="185" y1="318" x2="56" y2="340" style="stroke:var(--ink-3)" stroke-width="1.4" marker-end="url(#wr-a)"/>
<rect x="16" y="342" width="80" height="28" rx="8" class="s-fill" style="stroke:var(--line)" stroke-width="1.5"/><text x="56.0" y="360.0" text-anchor="middle" class="s-mono">inventory</text>
<line x1="185" y1="318" x2="142" y2="340" style="stroke:var(--ink-3)" stroke-width="1.4" marker-end="url(#wr-a)"/>
<rect x="102" y="342" width="80" height="28" rx="8" class="s-fill" style="stroke:var(--line)" stroke-width="1.5"/><text x="142.0" y="360.0" text-anchor="middle" class="s-mono">pricing</text>
<line x1="185" y1="318" x2="228" y2="340" style="stroke:var(--ink-3)" stroke-width="1.4" marker-end="url(#wr-a)"/>
<rect x="188" y="342" width="80" height="28" rx="8" class="s-fill" style="stroke:var(--line)" stroke-width="1.5"/><text x="228.0" y="360.0" text-anchor="middle" class="s-mono">payment</text>
<line x1="185" y1="318" x2="314" y2="340" style="stroke:var(--ink-3)" stroke-width="1.4" marker-end="url(#wr-a)"/>
<rect x="274" y="342" width="80" height="28" rx="8" class="s-fill" style="stroke:var(--line)" stroke-width="1.5"/><text x="314.0" y="360.0" text-anchor="middle" class="s-mono">shipping</text>
<text x="185" y="390" text-anchor="middle" class="s-sub">one simple call in front of many</text>
<rect x="394" y="206" width="362" height="194" rx="12" style="fill:var(--warn);fill-opacity:.04;stroke:var(--line)"/>
<text x="406" y="226" class="s-label" style="fill:var(--warn)">Proxy</text>
<rect x="515" y="234" width="120" height="28" rx="8" class="s-fill" style="stroke:var(--line)" stroke-width="1.5"/><text x="575.0" y="252.0" text-anchor="middle" class="s-label">template</text>
<line x1="575" y1="262" x2="575" y2="284" style="stroke:var(--ink-3)" stroke-width="1.4" marker-end="url(#wr-a)"/><text x="583" y="277.0" class="s-mono" style="font-size:10px;fill:var(--ink-3)">user.name</text>
<rect x="485" y="286" width="180" height="32" rx="8" class="s-fill" style="stroke:var(--warn)" stroke-width="1.5"/><text x="575.0" y="306.0" text-anchor="middle" class="s-mono">CachingRemoteUser</text>
<line x1="575" y1="318" x2="575" y2="340" style="stroke:var(--ink-3);stroke-dasharray:4 3" stroke-width="1.4" marker-end="url(#wr-a)"/><text x="583" y="333.0" class="s-mono" style="font-size:10px;fill:var(--ink-3)">get(uid)</text>
<rect x="515" y="342" width="120" height="28" rx="8" class="s-fill" style="stroke:var(--line)" stroke-width="1.5"/><text x="575.0" y="360.0" text-anchor="middle" class="s-mono">user service</text>
<text x="575" y="390" text-anchor="middle" class="s-sub">the same interface, access controlled</text>
</svg>` },

    { t: "h2", n: "01", id: "adapter", text: "Adapter",
      sub: "Change the interface, and everything the interface implies" },

    { t: "p", text: "An adapter makes an existing component usable through the interface your code expects — a vendor SDK behind 9.1's `PaymentGateway` port, a legacy SOAP service behind a clean client. The method names are the easy part. The hard part is everything else the two interfaces disagree on: **units, error models, time zones, encodings, nullability**. A payment vendor that takes integer amounts in minor units is the classic case, because \"multiply by 100\" is right for pounds and dollars and wrong for currencies with zero or three decimal places:" },

    { t: "code", lang: "python", title: "adapter.py — amounts in minor units, and vendor errors in domain terms", code: `from decimal import Decimal

class VendorError(Exception):
    def __init__(self, code): super().__init__(code); self.code = code

class VendorClient:
    """The vendor's API: integer amounts in MINOR units (cents, pence ... or whole yen), and error codes."""
    def create_charge(self, amount_minor: int, currency: str, card: str):
        if card.endswith("0002"): raise VendorError("card_declined")
        if card.endswith("0119"): raise VendorError("processing_error")
        self.last = {"id": "ch_81", "amount": amount_minor, "currency": currency}
        return self.last

class PaymentDeclined(Exception): pass             # the domain's own vocabulary
class PaymentUnavailable(Exception): pass

MINOR_UNITS = {"GBP": 2, "USD": 2, "EUR": 2, "JPY": 0, "KWD": 3}   # ISO 4217 exponents

class VendorPaymentAdapter:
    """Our port's shape (Decimal amounts, domain exceptions) on top of the vendor's shape."""
    def __init__(self, client): self.client = client
    def charge(self, amount: Decimal, currency: str, card: str) -> str:
        minor = amount.scaleb(MINOR_UNITS[currency])           # 42.50 GBP -> 4250; 5000 JPY -> 5000
        if minor != minor.to_integral_value(): raise ValueError(f"{amount} has too many decimals for {currency}")
        try:
            return self.client.create_charge(int(minor), currency, card)["id"]
        except VendorError as e:
            if e.code == "card_declined": raise PaymentDeclined(card[-4:]) from e
            raise PaymentUnavailable(e.code) from e             # retryable, from the domain's point of view

def assume_two_decimals(amount, currency):                     # the shortcut the adapter replaces
    return int(amount * 100)

def charged(client):                                           # what the vendor will actually take
    return client.last["amount"] / 10 ** MINOR_UNITS[client.last["currency"]]

for amount, cur in ((Decimal("42.50"), "GBP"), (Decimal("5000"), "JPY"), (Decimal("12.345"), "KWD")):
    naive = VendorClient(); naive.create_charge(assume_two_decimals(amount, cur), cur, "4242")
    adapted = VendorClient(); VendorPaymentAdapter(adapted).charge(amount, cur, "4242")
    print(f"{amount:>7} {cur}: 'x 100' sends {naive.last['amount']:>6} -> charged {charged(naive):>9,g} {cur}"
          f"   adapter sends {adapted.last['amount']:>5} -> charged {charged(adapted):>7,g} {cur}")

adapter = VendorPaymentAdapter(VendorClient())
for card in ("4000000000000002", "4000000000000119"):
    try: adapter.charge(Decimal("10.00"), "GBP", card)
    except (PaymentDeclined, PaymentUnavailable) as e: print(f"card ...{card[-4:]}: vendor error became {type(e).__name__}({e})")`,
      hl: [22, 23, 24, 27, 28, 29],
      out: `  42.50 GBP: 'x 100' sends   4250 -> charged      42.5 GBP   adapter sends  4250 -> charged    42.5 GBP
   5000 JPY: 'x 100' sends 500000 -> charged   500,000 JPY   adapter sends  5000 -> charged   5,000 JPY
 12.345 KWD: 'x 100' sends   1234 -> charged     1.234 KWD   adapter sends 12345 -> charged  12.345 KWD
card ...0002: vendor error became PaymentDeclined(0002)
card ...0119: vendor error became PaymentUnavailable(processing_error)` },

    { t: "p", text: "The shortcut charged a ¥5,000 order **¥500,000** — the yen has no minor unit — and charged 1.234 dinars for a 12.345-dinar order, because the Kuwaiti dinar has three. The adapter uses the ISO 4217 exponent for each currency and refuses amounts with more decimals than the currency allows. It also translates the vendor's error codes into the two exceptions the domain cares about: a decline, which must not be retried, and an outage, which may be." },

    { t: "callout", kind: "insight", title: "At system scale: the anti-corruption layer",
      body: [
        { t: "p", text: "Domain-driven design (10.2) calls a service-sized adapter an **anti-corruption layer**: a translation boundary that keeps a legacy system's or a partner's model — its field names, status codes and quirks — from leaking into your own. When migrating off a legacy system (10.6), the adapter is what lets new code be written in the new model from day one." }
      ] },

    { t: "h2", n: "02", id: "decorator", text: "Decorator",
      sub: "Same interface, one more behaviour" },

    { t: "p", text: "A decorator wraps an object or function, keeps its interface, and adds one behaviour — timing, retries, caching, authorisation, logging. 9.2 showed why stacking wrappers beats subclassing, and that their order matters. Python builds the pattern into the language with `@` syntax, which makes one detail easy to miss: the wrapper replaces the original function, **name, docstring and all**, unless you copy them across with `functools.wraps`:" },

    { t: "code", lang: "python", title: "decorator.py — a timing decorator, with and without functools.wraps", code: `import functools, time

ROUTES = {}
def route(path):                                   # like a web framework: endpoints are named after functions
    def register(fn):
        if fn.__name__ in ROUTES: raise ValueError(f"endpoint {fn.__name__!r} is already registered")
        ROUTES[fn.__name__] = path; return fn
    return register

LATENCY = {}
def timed(fn):                                     # a decorator: same call signature, one added behaviour
    @functools.wraps(fn)                           # copy __name__, __doc__ ... from fn onto the wrapper
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        try: return fn(*args, **kwargs)
        finally: LATENCY.setdefault(fn.__name__, []).append(time.perf_counter() - start)
    return wrapper

def timed_without_wraps(fn):
    def wrapper(*args, **kwargs): return fn(*args, **kwargs)
    return wrapper

@route("/orders")
@timed
def list_orders():
    """Return the caller's orders."""
    return ["o-1", "o-2"]

@route("/users")
@timed
def list_users():
    """Return all users (admin only)."""
    return ["asha", "ben"]

list_orders(); list_orders(); list_users()
print("with functools.wraps:   ", ROUTES, "| latency samples:", {k: len(v) for k, v in LATENCY.items()})
print("                         list_users.__doc__ =", repr(list_users.__doc__))

ROUTES.clear()
try:
    @route("/orders")
    @timed_without_wraps
    def list_orders(): return []
    @route("/users")
    @timed_without_wraps
    def list_users(): return []
except ValueError as e:
    print("without functools.wraps:", ROUTES, "|", e)`,
      hl: [12, 13, 16, 19, 20],
      out: `with functools.wraps:    {'list_orders': '/orders', 'list_users': '/users'} | latency samples: {'list_orders': 2, 'list_users': 1}
                         list_users.__doc__ = 'Return all users (admin only).'
without functools.wraps: {'wrapper': '/orders'} | endpoint 'wrapper' is already registered` },

    { t: "p", text: "With `functools.wraps`, each endpoint keeps its own name, latency samples are recorded per endpoint, and the docstring survives for documentation tools. Without it, every decorated function is called `wrapper`: the second registration collides — the same error Flask raises as \"View function mapping is overwriting an existing endpoint function\" — and any metrics or logs keyed by function name silently merge every endpoint into one line." },

    { t: "callout", kind: "trap", title: "Decorators that change the contract",
      body: [
        { t: "p", text: "A decorator is supposed to keep the interface, and some quietly do not. A retry decorator on a non-idempotent call turns one payment into three (7.2). A cache decorator like `functools.lru_cache` on a method keeps every `self` it has seen alive for the life of the process, and returns the same mutable object to every caller. A decorator that swallows exceptions changes what callers can rely on. Review a decorator as you would a subclass: does everything that worked with the original still work, and mean the same thing (9.1's Liskov)?" }
      ] },

    { t: "h2", n: "03", id: "facade", text: "Facade",
      sub: "One simple interface in front of a subsystem" },

    { t: "p", text: "A facade offers one coarse operation that coordinates many fine-grained ones, so callers do not have to know the order, the dependencies or the failure handling. A `CheckoutFacade.checkout(cart)` reserves stock, prices the cart, takes payment and books shipping, compensating if a later step fails (5.4's saga). Inside one process it is a convenience. Across a network it is a **latency** decision, because each fine-grained call the client would otherwise make is a round trip:" },

    { t: "diagram", kind: "timeline", title: "Checkout from a phone: four calls, or one call to a facade",
      caption: "Modelled with a 150 ms mobile round trip and about 5 ms per call inside the data centre. Called from the phone, the four services cost four round trips, and price and payment depend on the previous step so they cannot all overlap. A backend-for-frontend facade turns that into one round trip from the phone, with the four short calls made inside the data centre (the small teal bar).",
      span: 640, tick: 80, unit: "milliseconds",
      lanes: [
        { label: "Direct", bars: [[0, 150, "inventory", "warn"], [150, 300, "pricing", "warn"], [300, 450, "payment", "warn"], [450, 600, "shipping", "warn"]] },
        { label: "Via facade", bars: [[0, 75, "request", "accent"], [75, 97, "", "teal"], [97, 172, "response", "accent"]] }
      ] },

    { t: "callout", kind: "tradeoff", title: "Facades at scale: gateways and BFFs",
      body: [
        { t: "p", text: "An API gateway that aggregates calls, or a **backend for frontend** per client type, is a facade in front of microservices (10.5). The risk is the same as with an in-process facade that grows: business logic accumulates in the coordinator until it becomes a god object — or a god service that every team must change. Keep a facade thin: orchestration and shape conversion, with the rules living in the services behind it." }
      ] },

    { t: "h2", n: "04", id: "proxy", text: "Proxy",
      sub: "Same interface, controlled access" },

    { t: "p", text: "A proxy stands in for the real object with the same interface and decides how the real object is reached. A **virtual proxy** creates it lazily; a **protection proxy** checks permissions first; a **caching proxy** answers repeated requests itself; a **remote proxy** makes an object on another machine look local — which is what ORM lazy relationships and RPC client stubs do. That last one is the dangerous one, because it makes a network call look like an attribute read (8.1's \"latency is zero\"):" },

    { t: "code", lang: "python", title: "proxy.py — a template rendering 50 users through a remote proxy", code: `import time

class UserService:
    """A remote service: every call is a network round trip (5 ms here)."""
    def __init__(self): self.calls = 0
    def get(self, uid):
        self.calls += 1; time.sleep(0.005)
        return {"name": f"user{uid}", "email": f"user{uid}@example.com"}
    def get_many(self, uids):
        self.calls += 1; time.sleep(0.005)
        return {u: {"name": f"user{u}", "email": f"user{u}@example.com"} for u in uids}

class RemoteUser:
    """A proxy that looks like a local object: attribute access quietly calls the service."""
    def __init__(self, service, uid): self._service, self._uid = service, uid
    def __getattr__(self, field): return self._service.get(self._uid)[field]

class CachingRemoteUser(RemoteUser):
    """Same interface; fetches once per object, then answers locally."""
    def __getattr__(self, field):
        if "_data" not in self.__dict__: self._data = self._service.get(self._uid)
        return self._data[field]

def render(users):                                   # template code: it has no idea these are remote
    return [f"{u.name} <{u.email}>" for u in users]

for label, make in (("proxy, a call per attribute", lambda s, ids: [RemoteUser(s, i) for i in ids]),
                    ("caching proxy", lambda s, ids: [CachingRemoteUser(s, i) for i in ids]),
                    ("batch fetch, plain data", None)):
    service, ids = UserService(), range(50)
    start = time.perf_counter()
    if make: rows = render(make(service, ids))
    else:
        data = service.get_many(list(ids))
        rows = [f"{d['name']} <{d['email']}>" for d in data.values()]
    print(f"{label:<28} 50 rows: {service.calls:>3} calls, {(time.perf_counter() - start) * 1000:5.0f} ms")`,
      hl: [16, 20, 21, 24],
      out: `proxy, a call per attribute  50 rows: 100 calls,   517 ms
caching proxy                50 rows:  50 calls,   259 ms
batch fetch, plain data      50 rows:   1 calls,     5 ms` },

    { t: "p", text: "The template looks innocent — two attribute reads per row — and made **100 network calls**, about half a second at 5 ms each. Caching inside the proxy halved that. Fetching all fifty users in **one batch call** took about 5 ms, a hundred times faster. This is 1.2's N+1 problem, and remote proxies are its most common cause: an ORM's lazy-loaded relationship is exactly `RemoteUser`. The cure is to make bulk access explicit — eager loading, a batch endpoint, or a DataLoader that collects keys within a request and fetches them together." },

    { t: "diagram", kind: "matrix", title: "The four wrappers side by side",
      cols: ["Interface to the caller", "What it adds", "At system scale"],
      rows: ["Adapter", "Decorator", "Facade", "Proxy"],
      cells: [
        [{ text: "different: translated", tone: "violet" }, { text: "units, errors, names" }, { text: "anti-corruption layer (10.2)" }],
        [{ text: "identical", tone: "accent" }, { text: "one behaviour; stackable" }, { text: "middleware, sidecars (10.5)" }],
        [{ text: "new and simpler", tone: "teal" }, { text: "orchestration" }, { text: "API gateway, BFF (10.5)" }],
        [{ text: "identical", tone: "warn" }, { text: "control of access" }, { text: "reverse proxy, CDN, RPC stub" }]
      ] },

    { t: "exercise", kind: "Challenge", title: "A caching proxy that does not stampede",
      difficulty: "advanced", minutes: 30,
      body: [
        { t: "p", text: "A price service takes 100 ms per call. Put a caching proxy with a TTL in front of it, then hit it with bursts of 20 concurrent requests for the same product: one while the cache is cold, one while it is warm, and one just after the entry expires. A naive caching proxy sends every concurrent miss to the backend — 3.4's cache stampede. Make it **single-flight**: on a miss, one caller fetches and the others wait for that result." }
      ],
      requirements: [
        "Same price(sku) interface as the real service",
        "A TTL on cached entries",
        "Exactly one backend call per key per miss, however many callers arrive together",
        "Waiting callers get the leader's result; if the fetch fails, they get an error rather than hanging",
        "Count backend calls for the naive and single-flight versions"
      ],
      hint: "Keep a dictionary of in-flight fetches, each with a threading.Event. Under a lock, a caller either finds a fresh cache entry, joins an existing flight, or starts one; the leader fetches outside the lock and sets the event when done.",
      solution: { lang: "python", title: "pricecache_ex.py",
        code: `import threading, time

class PriceService:
    """The real subject: slow, and expensive to call."""
    def __init__(self): self.calls, self.lock = 0, threading.Lock()
    def price(self, sku):
        with self.lock: self.calls += 1
        time.sleep(0.1); return 1999

class NaiveCachingProxy:
    def __init__(self, service, ttl): self.service, self.ttl, self.cache = service, ttl, {}
    def price(self, sku):
        hit = self.cache.get(sku)
        if hit and hit[1] > time.monotonic(): return hit[0]
        value = self.service.price(sku)                          # every concurrent miss goes through
        self.cache[sku] = (value, time.monotonic() + self.ttl); return value

class SingleFlightProxy(NaiveCachingProxy):
    """Same interface. On a miss, the first caller fetches; concurrent callers wait for its result."""
    def __init__(self, service, ttl):
        super().__init__(service, ttl); self.lock, self.inflight = threading.Lock(), {}
    def price(self, sku):
        with self.lock:
            hit = self.cache.get(sku)
            if hit and hit[1] > time.monotonic(): return hit[0]
            flight = self.inflight.get(sku)
            leader = flight is None
            if leader: flight = self.inflight[sku] = {"done": threading.Event()}
        if leader:
            try: flight["value"] = self.service.price(sku)
            finally:
                with self.lock:
                    if "value" in flight: self.cache[sku] = (flight["value"], time.monotonic() + self.ttl)
                    del self.inflight[sku]
                flight["done"].set()
        else:
            flight["done"].wait()
        if "value" not in flight: raise RuntimeError("the fetch this request waited for failed")
        return flight["value"]

def burst(proxy, n=20):
    threads = [threading.Thread(target=proxy.price, args=("sku-42",)) for _ in range(n)]
    for t in threads: t.start()
    for t in threads: t.join()

for cls in (NaiveCachingProxy, SingleFlightProxy):
    service = PriceService(); proxy = cls(service, ttl=0.3)
    burst(proxy)                       # cold cache: 20 requests at once
    burst(proxy)                       # warm: served from cache
    time.sleep(0.35); burst(proxy)     # expired: another burst of 20
    print(f"{cls.__name__:<18} 3 bursts of 20 requests -> {service.calls:>2} calls to the price service")`,
        out: `NaiveCachingProxy  3 bursts of 20 requests -> 40 calls to the price service
SingleFlightProxy  3 bursts of 20 requests ->  2 calls to the price service`,
        notes: [
          { t: "p", text: "The naive proxy sent 20 calls on the cold burst and 20 more when the entry expired — every concurrent miss went through. The single-flight proxy sent one call per miss, two in total, and served the other 58 requests from the cache or from the shared in-flight result." },
          { t: "p", text: "The `finally` block matters: if the fetch raises, the in-flight entry is removed and waiters are released with an error instead of blocking forever. Go's `singleflight` package and request coalescing in CDNs and Varnish are the same pattern. Combined with serving a slightly stale value while refreshing in the background, it removes the expiry spike entirely." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: a ¥500,000 charge for a ¥5,000 order",
      body: [
        { t: "p", text: "**Symptom.** Shortly after launching in Japan, a retailer received chargebacks and angry emails from customers charged a hundred times their order total. Orders in pounds, euros and dollars were all correct." },
        { t: "p", text: "**Mechanism.** The payment integration converted amounts to the vendor's minor units with `int(amount * 100)`, written when every supported currency had two decimal places. The yen has none, so ¥5,000 was sent as 500,000 minor units — ¥500,000. Unit tests covered GBP and USD only, and the vendor accepted the amount because it was a valid integer." },
        { t: "p", text: "**Fix.** All currency handling moved into one adapter using ISO 4217 exponents, rejecting amounts with more precision than the currency allows. A contract test now runs a charge in a zero-decimal, a two-decimal and a three-decimal currency against the vendor's sandbox, and a monitor alerts when any single charge exceeds ten times the average basket in that currency." }
      ] }
  ],

  takeaways: [
    "Adapter, decorator, facade and proxy all wrap something; they differ in **what the wrapper changes**.",
    "An **adapter** changes the interface — including **units and error models**: measured, \"× 100\" charged **¥500,000** for a ¥5,000 order and 1.234 KWD for 12.345.",
    "A service-sized adapter is an **anti-corruption layer**, keeping a partner's or a legacy model out of yours.",
    "A **decorator** keeps the interface and adds one behaviour; without **functools.wraps**, every decorated endpoint is named `wrapper` and route registrations and metrics collide.",
    "A decorator that retries non-idempotent calls, caches mutable results or swallows exceptions **changes the contract**.",
    "A **facade** turns many calls into one; across a network it is a latency decision — a BFF replaces four mobile round trips with one.",
    "A **proxy** keeps the interface and controls access: lazy, protected, cached or remote.",
    "A **remote proxy** hides network calls: measured, 50 template rows made **100 calls (~0.5 s)**; one batch call took **~5 ms**.",
    "A caching proxy must be **single-flight**: measured, three bursts of 20 requests made **40** backend calls naively and **2** with single-flight."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A class wraps a vendor SDK, converts Decimal amounts to integer minor units, and maps vendor error codes to domain exceptions. Which pattern is it?",
        options: ["Decorator", "Adapter", "Proxy", "Facade"],
        answer: 1,
        why: "It changes the interface the caller sees — different types, units and exceptions — to fit the one the domain expects, which is an adapter. A decorator and a proxy keep the interface identical, and a facade simplifies a whole subsystem rather than translating one component." },

      { stem: "Two Flask views are decorated with a timing decorator that does not use functools.wraps. What happens at start-up?",
        options: ["Nothing; decorators never affect registration", "Both views are named 'wrapper', so the second registration collides with the first", "The timing is recorded twice", "The docstrings are merged"],
        answer: 1,
        why: "Without functools.wraps the returned function is the inner wrapper, with its own name. Frameworks that key endpoints by function name see two functions called wrapper and refuse the second. Timing and docstrings are not merged; the docstring is simply lost." },

      { stem: "A page renders 50 users and reads user.name and user.email on ORM objects whose fields are lazy-loaded from another service. What is the problem and the fix?",
        options: ["Too many template variables; use fewer fields", "Each attribute access is a remote call — 100 round trips; fetch the users in one batch or eager-load them", "The ORM caches too aggressively; disable caching", "The service needs more replicas"],
        answer: 1,
        why: "The lazy-loading remote proxy makes network calls look like attribute reads, giving an N+1 pattern. Batching or eager loading turns 100 calls into one. Fewer fields still leaves one call per row, disabling caching makes it worse, and more replicas do not remove the round trips." },

      { stem: "Twenty concurrent requests miss a caching proxy for the same key at the same moment. What does single-flight change?",
        options: ["It rejects nineteen of the requests", "Only the first request calls the backend; the others wait for and share its result", "It serves a default value to the other nineteen", "It lowers the TTL"],
        answer: 1,
        why: "Single-flight coalesces concurrent misses for one key into one backend call whose result every waiter receives, preventing a stampede. Nothing is rejected or defaulted, and the TTL is unchanged." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "The patterns are easy to name; interviewers listen for what each one changes.",
    questions: [
      { level: "core",
        q: "What is the difference between an adapter, a decorator, a facade and a proxy?",
        strong: "A strong answer distinguishes them by what the wrapper changes and gives a system-level example of each.",
        answer: [
          { t: "p", text: "All four wrap something. An adapter changes the interface so an incompatible component fits — a vendor SDK behind my payment port, translating units and errors. A decorator keeps the interface and adds a behaviour — timing, retries, auth — and can be stacked. A facade presents a simpler interface over a subsystem — a checkout call that coordinates four services." },
          { t: "p", text: "A proxy keeps the interface and controls access to the real object: lazily, remotely, with a cache or a permission check. At system scale: an anti-corruption layer is an adapter, middleware and sidecars are decorators, API gateways and BFFs are facades, and reverse proxies, CDNs and RPC stubs are proxies." }
        ] },

      { level: "advanced",
        q: "How can a proxy cause performance problems, and how do you prevent them?",
        strong: "A strong answer names the remote-proxy N+1 and the caching-proxy stampede, with fixes.",
        answer: [
          { t: "p", text: "A remote proxy — an ORM lazy relationship or an RPC stub — makes a network call look like a local attribute access, so innocent-looking loops become N+1 round trips. I prevent that with explicit bulk access: eager loading, batch endpoints, or a DataLoader that coalesces keys per request, and I watch query counts per request in tests and tracing." },
          { t: "p", text: "A caching proxy can stampede its backend when a hot key expires and many concurrent requests miss together. Single-flight coalesces them into one fetch; serving stale while revalidating in the background and adding jitter to TTLs remove the spike entirely." }
        ] },

      { level: "core",
        q: "What should an adapter for a third-party API translate besides method names?",
        strong: "A strong answer lists semantic mismatches and how to test them.",
        answer: [
          { t: "p", text: "Units and precision — amounts in minor units with per-currency exponents, timestamps and time zones. Error models — mapping vendor codes to the domain's retryable and non-retryable cases. Identifiers, pagination, rate-limit signals, nullability and optional fields, and idempotency keys." },
          { t: "p", text: "I keep it the only place that knows the vendor's model, and test it with contract tests against the vendor's sandbox, including edge cases like zero- and three-decimal currencies and every error code we map." }
        ] }
    ]
  }
});
