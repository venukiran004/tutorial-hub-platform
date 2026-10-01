/* ============================================================================
   LESSON 12.3 — Zero Trust, API Security, Encryption and Secrets
   ========================================================================= */
EC.receiveLesson({
  id: "12.3",

  lede: "The old model of security was a castle: a hard perimeter, and everything inside trusted. Breaches routinely start inside — a phished laptop, a compromised dependency, a leaked credential — so **zero trust** removes the idea of a trusted network: every call between services is authenticated with **mutual TLS**, authorised against a policy, and encrypted. Inside that frame, this lesson works through the API flaws that cause most real breaches (OWASP's top one is simply forgetting to check *whose* object it is), encryption at rest done with **envelope encryption** so keys can rotate and data can be destroyed on demand, and the life cycle of the secrets that hold all of it together.",

  objectives: [
    "Explain zero trust and implement service identity with mutual TLS",
    "Recognise and fix broken object-level authorisation and excessive data exposure",
    "Map the OWASP API Security Top 10 to concrete controls",
    "Use envelope encryption for cheap key rotation and crypto-shredding",
    "Manage secrets across their life cycle, and catch them before they reach a repository"
  ],

  prerequisites: ["12.1", "12.2", "10.5"],

  blocks: [

    { t: "h2", n: "01", id: "zero-trust", text: "Zero trust",
      sub: "Never trust the network; verify every call" },

    { t: "viz", title: "Castle and moat, and zero trust",
      caption: "Left: the firewall is the only control, so anything that gets inside — a compromised web server, a malicious insider — can reach payments and admin freely. Right: each service has its own identity and its own boundary; every call is authenticated and authorised against a policy, so a compromised web server can call what web is allowed to call and nothing else.",
      svg: `<svg viewBox="0 0 760 250" width="100%" role="img" aria-label="Castle and moat against zero trust">
<defs><marker id="zt-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--ink-3)"/></marker></defs>
<text x="185" y="18" text-anchor="middle" class="s-label" style="fill:var(--crit)">Castle and moat</text>
<rect x="30" y="34" width="310" height="170" rx="16" style="fill:var(--crit);fill-opacity:.05;stroke:var(--crit);stroke-width:3"/>
<text x="44" y="54" class="s-sub" style="fill:var(--crit)">"inside the firewall = trusted"</text>
<rect x="60" y="70" width="110" height="40" rx="8" class="s-fill" style="stroke:var(--line)" stroke-width="1.5"/><text x="115.0" y="94.0" text-anchor="middle" class="s-label">web</text>
<rect x="200" y="70" width="110" height="40" rx="8" class="s-fill" style="stroke:var(--line)" stroke-width="1.5"/><text x="255.0" y="94.0" text-anchor="middle" class="s-label">orders</text>
<rect x="60" y="140" width="110" height="40" rx="8" class="s-fill" style="stroke:var(--line)" stroke-width="1.5"/><text x="115.0" y="164.0" text-anchor="middle" class="s-label">payments</text>
<rect x="200" y="140" width="110" height="40" rx="8" class="s-fill" style="stroke:var(--line)" stroke-width="1.5"/><text x="255.0" y="164.0" text-anchor="middle" class="s-label">admin</text>
<line x1="170" y1="90" x2="198" y2="90" style="stroke:var(--ink-3)" stroke-width="1.2" marker-end="url(#zt-a)"/>
<line x1="115" y1="110" x2="115" y2="138" style="stroke:var(--ink-3)" stroke-width="1.2" marker-end="url(#zt-a)"/>
<line x1="170" y1="160" x2="198" y2="160" style="stroke:var(--crit)" stroke-width="1.6" marker-end="url(#zt-a)"/>
<text x="185" y="228" text-anchor="middle" class="s-sub" style="fill:var(--crit)">one foothold inside reaches everything</text>
<line x1="380" y1="28" x2="380" y2="236" style="stroke:var(--line);stroke-dasharray:4 4"/>
<text x="575" y="18" text-anchor="middle" class="s-label" style="fill:var(--good)">Zero trust</text>
<rect x="422" y="52" width="126" height="56" rx="12" style="fill:var(--good);fill-opacity:.06;stroke:var(--good);stroke-dasharray:4 3"/>
<rect x="430" y="60" width="110" height="40" rx="8" class="s-fill" style="stroke:var(--good)" stroke-width="1.5"/><text x="485.0" y="84.0" text-anchor="middle" class="s-label">web</text>
<rect x="592" y="52" width="126" height="56" rx="12" style="fill:var(--good);fill-opacity:.06;stroke:var(--good);stroke-dasharray:4 3"/>
<rect x="600" y="60" width="110" height="40" rx="8" class="s-fill" style="stroke:var(--good)" stroke-width="1.5"/><text x="655.0" y="84.0" text-anchor="middle" class="s-label">orders</text>
<rect x="422" y="132" width="126" height="56" rx="12" style="fill:var(--good);fill-opacity:.06;stroke:var(--good);stroke-dasharray:4 3"/>
<rect x="430" y="140" width="110" height="40" rx="8" class="s-fill" style="stroke:var(--good)" stroke-width="1.5"/><text x="485.0" y="164.0" text-anchor="middle" class="s-label">payments</text>
<rect x="592" y="132" width="126" height="56" rx="12" style="fill:var(--good);fill-opacity:.06;stroke:var(--good);stroke-dasharray:4 3"/>
<rect x="600" y="140" width="110" height="40" rx="8" class="s-fill" style="stroke:var(--good)" stroke-width="1.5"/><text x="655.0" y="164.0" text-anchor="middle" class="s-label">admin</text>
<line x1="548" y1="80" x2="590" y2="80" style="stroke:var(--good)" stroke-width="1.4" marker-end="url(#zt-a)"/>
<text x="569" y="72" text-anchor="middle" class="s-sub" style="fill:var(--good)">mTLS + policy</text>
<line x1="485" y1="108" x2="485" y2="130" style="stroke:var(--good)" stroke-width="1.4" marker-end="url(#zt-a)"/>
<line x1="548" y1="160" x2="590" y2="160" style="stroke:var(--crit);stroke-dasharray:3 3" stroke-width="1.4"/>
<text x="569" y="152" text-anchor="middle" class="s-sub" style="fill:var(--crit)">✕ denied</text>
<text x="575" y="228" text-anchor="middle" class="s-sub" style="fill:var(--good)">every call authenticated, authorised, encrypted</text>
</svg>` },

    { t: "dl", items: [
      { term: "Verify explicitly", def: "Authenticate and authorise every request — user and service — on identity, not network location. Google's BeyondCorp removed the corporate VPN this way: internal apps are reached through an access proxy that checks user and device on each request." },
      { term: "Least privilege", def: "Each identity may do only what it needs, granted just in time where possible, denied by default." },
      { term: "Assume breach", def: "Segment so a compromise stays small (10.6's cells), encrypt internal traffic, and log enough to reconstruct what an intruder did." }
    ] },

    { t: "p", text: "For service-to-service calls, identity is a certificate. In **mutual TLS** both sides present certificates issued by a common authority — usually the service mesh's (10.5) — and each verifies the other. The SPIFFE standard puts the workload's identity in the certificate as a URI, such as `spiffe://shop/ns/prod/sa/checkout`, which policies can then refer to. A real handshake, with a private CA, a payments service that requires client certificates, and four callers:" },

    { t: "code", lang: "python", title: "mtls.py — a mesh CA, mutual TLS, and an authorisation policy on SPIFFE IDs", code: `import datetime, os, socket, ssl, tempfile, threading
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec

tmp = tempfile.mkdtemp()
def pem(name, obj):
    path = os.path.join(tmp, name)
    data = obj.public_bytes(serialization.Encoding.PEM) if isinstance(obj, x509.Certificate) else \\
        obj.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption())
    open(path, "wb").write(data); return path

def cert(subject_cn, key, issuer_cert=None, issuer_key=None, spiffe=None, ca=False, hours=24):
    now = datetime.datetime.now(datetime.timezone.utc)
    issuer = issuer_cert.subject if issuer_cert else x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, subject_cn)])
    b = (x509.CertificateBuilder().subject_name(x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, subject_cn)]))
         .issuer_name(issuer).public_key(key.public_key()).serial_number(x509.random_serial_number())
         .not_valid_before(now).not_valid_after(now + datetime.timedelta(hours=hours))
         .add_extension(x509.BasicConstraints(ca=ca, path_length=None), critical=True))
    sans = [x509.DNSName("localhost")] + ([x509.UniformResourceIdentifier(spiffe)] if spiffe else [])
    if not ca: b = b.add_extension(x509.SubjectAlternativeName(sans), critical=False)
    return b.sign(issuer_key or key, hashes.SHA256())

new_key = lambda: ec.generate_private_key(ec.SECP256R1())
ca_key = new_key(); ca = cert("mesh CA", ca_key, ca=True)                       # the mesh's certificate authority
srv_key = new_key(); srv = cert("payments", srv_key, ca, ca_key, "spiffe://shop/ns/prod/sa/payments")
cli_key = new_key(); cli = cert("checkout", cli_key, ca, ca_key, "spiffe://shop/ns/prod/sa/checkout")
rec_key = new_key(); rec = cert("recommendations", rec_key, ca, ca_key, "spiffe://shop/ns/prod/sa/recommendations")
rogue_ca_key = new_key(); rogue_ca = cert("someone else's CA", rogue_ca_key, ca=True)
rogue_key = new_key(); rogue = cert("checkout", rogue_key, rogue_ca, rogue_ca_key, "spiffe://shop/ns/prod/sa/checkout")
ALLOWED = {"spiffe://shop/ns/prod/sa/checkout"}                                  # who may call payments

server_ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
server_ctx.load_cert_chain(pem("srv.pem", srv), pem("srv.key", srv_key))
server_ctx.load_verify_locations(pem("ca.pem", ca))
server_ctx.verify_mode = ssl.CERT_REQUIRED                                      # mutual: the client must prove itself

listener = socket.create_server(("127.0.0.1", 0)); port = listener.getsockname()[1]
def serve():
    while True:
        raw, _ = listener.accept()
        try:
            with server_ctx.wrap_socket(raw, server_side=True) as s:
                peer = dict(x[0] for x in s.getpeercert()["subject"])["commonName"]
                uri = [v for k, v in s.getpeercert()["subjectAltName"] if k == "URI"][0]
                s.sendall((f"200 hello {peer}" if uri in ALLOWED else f"403 {uri} may not call payments").encode())
        except (ssl.SSLError, OSError): pass
threading.Thread(target=serve, daemon=True).start()

def call(label, cert_pair):
    ctx = ssl.create_default_context(cafile=pem("ca.pem", ca))
    if cert_pair: ctx.load_cert_chain(*cert_pair)
    try:
        with socket.create_connection(("127.0.0.1", port)) as raw, ctx.wrap_socket(raw, server_hostname="localhost") as s:
            reply = s.recv(100).decode() or "connection closed by server"
    except (ssl.SSLError, OSError) as e: reply = f"handshake failed: {type(e).__name__}"
    print(f"{label:<44} -> {reply}")

call("checkout, certificate from the mesh CA", (pem("cli.pem", cli), pem("cli.key", cli_key)))
call("recommendations, also from the mesh CA", (pem("rec.pem", rec), pem("rec.key", rec_key)))
call("a client with no certificate", None)
call("'checkout' signed by another CA", (pem("rog.pem", rogue), pem("rog.key", rogue_key)))`,
      hl: [32, 37, 46, 47],
      out: `checkout, certificate from the mesh CA       -> 200 hello checkout
recommendations, also from the mesh CA       -> 403 spiffe://shop/ns/prod/sa/recommendations may not call payments
a client with no certificate                 -> handshake failed: SSLError
'checkout' signed by another CA              -> handshake failed: SSLError` },

    { t: "viz", title: "Mutual TLS between two services",
      caption: "Both services hold short-lived certificates from the mesh's CA. In the handshake, the server proves its identity, asks for the client's, and verifies that it chains to the same CA; then the payments service checks the caller's SPIFFE ID against its policy. Authentication and authorisation are separate steps: recommendations completed the handshake but was refused by policy.",
      svg: `<svg viewBox="0 0 760 293.5" width="100%" role="img"><defs><marker id="q373701accent" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--accent)"/></marker><marker id="q373701good" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--good)"/></marker><marker id="q373701warn" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--warn)"/></marker><marker id="q373701crit" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--crit)"/></marker><marker id="q373701violet" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--violet)"/></marker><marker id="q373701teal" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--teal)"/></marker><marker id="q373701line" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--line)"/></marker></defs>
<rect x="54.0" y="14" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="110.0" y="32" text-anchor="middle" class="s-label">mesh CA</text>
<rect x="319.0" y="14" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="375.0" y="32" text-anchor="middle" class="s-label">checkout</text>
<rect x="584.0" y="14" width="112" height="28" rx="7" class="s-fill s-stroke"/>
<text x="640.0" y="32" text-anchor="middle" class="s-label">payments</text>
<line x1="110.0" y1="42" x2="110.0" y2="281.5" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="375.0" y1="42" x2="375.0" y2="281.5" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="640.0" y1="42" x2="640.0" y2="281.5" style="stroke:var(--line);stroke-dasharray:3 4"/>
<line x1="110.0" y1="60" x2="371.0" y2="60" style="stroke:var(--violet);stroke-dasharray:5 4" stroke-width="1.6" marker-end="url(#q373701violet)"/>
<text x="242.5" y="54" text-anchor="middle" class="s-sub" style="fill:var(--violet)">(cert: spiffe://shop/…/checkout, 24 h)</text>
<line x1="110.0" y1="89" x2="636.0" y2="89" style="stroke:var(--violet);stroke-dasharray:5 4" stroke-width="1.6" marker-end="url(#q373701violet)"/>
<text x="375.0" y="83" text-anchor="middle" class="s-sub" style="fill:var(--violet)">(cert: spiffe://shop/…/payments, 24 h)</text>
<line x1="375.0" y1="118" x2="636.0" y2="118" style="stroke:var(--accent)" stroke-width="1.6" marker-end="url(#q373701accent)"/>
<text x="507.5" y="112" text-anchor="middle" class="s-sub" style="fill:var(--accent)">ClientHello</text>
<line x1="640.0" y1="147" x2="379.0" y2="147" style="stroke:var(--good);stroke-dasharray:5 4" stroke-width="1.6" marker-end="url(#q373701good)"/>
<text x="507.5" y="141" text-anchor="middle" class="s-sub" style="fill:var(--good)">(server cert + 'send yours')</text>
<rect x="289.5" y="164" width="171.0" height="20" rx="5" style="fill:var(--teal);fill-opacity:.16;stroke:var(--teal)"/>
<text x="375.0" y="178" text-anchor="middle" class="s-sub" style="fill:var(--ink)">server chains to mesh CA?</text>
<line x1="375.0" y1="205" x2="636.0" y2="205" style="stroke:var(--accent)" stroke-width="1.6" marker-end="url(#q373701accent)"/>
<text x="507.5" y="199" text-anchor="middle" class="s-sub" style="fill:var(--accent)">client cert + signature</text>
<rect x="539.0" y="222" width="202.0" height="20" rx="5" style="fill:var(--warn);fill-opacity:.16;stroke:var(--warn)"/>
<text x="640.0" y="236" text-anchor="middle" class="s-sub" style="fill:var(--ink)">chains to mesh CA? ID allowed?</text>
<line x1="640.0" y1="263" x2="379.0" y2="263" style="stroke:var(--good);stroke-dasharray:5 4" stroke-width="1.6" marker-end="url(#q373701good)"/>
<text x="507.5" y="257" text-anchor="middle" class="s-sub" style="fill:var(--good)">(200 hello checkout)</text></svg>` },

    { t: "p", text: "The four results separate the two questions of 12.1. A client with no certificate, or with one from a different CA claiming to be checkout, never completed the handshake: **authentication failed**. Recommendations authenticated perfectly and was still refused, because the policy allows only checkout to call payments: **authorisation**. In a mesh, the sidecars do the handshake and enforce the policy, and certificates live for hours and rotate automatically, so a stolen one is soon worthless." },

    { t: "h2", n: "02", id: "api", text: "API security",
      sub: "Most breaches are a missing check, not a broken cipher" },

    { t: "p", text: "OWASP's API Security Top 10 is headed by **broken object-level authorisation** (BOLA): an endpoint checks that the caller is logged in, but not that the object belongs to them. Change the ID in `/orders/1042` and you see someone else's order. Its neighbour, **broken object property-level authorisation**, returns more fields than the caller should see — commonly by serialising the database row:" },

    { t: "code", lang: "python", title: "bola.py — the same endpoint without and with object and property checks", code: `ORDERS = {
    1041: {"id": 1041, "owner": "user-7",  "total": 4200, "card_last4": "4242", "fraud_score": 0.02, "internal_note": ""},
    1042: {"id": 1042, "owner": "user-81", "total": 1999, "card_last4": "1881", "fraud_score": 0.91, "internal_note": "chargeback risk"},
    1043: {"id": 1043, "owner": "user-7",  "total": 650,  "card_last4": "4242", "fraud_score": 0.01, "internal_note": ""},
}

def get_order_v1(caller, order_id):                    # authenticated, but never asks whose order it is
    order = ORDERS.get(order_id)
    return (200, order) if order else (404, None)

PUBLIC_FIELDS = ("id", "total", "card_last4")           # what a customer may see of their own order

def get_order_v2(caller, order_id):
    order = ORDERS.get(order_id)
    if order is None or order["owner"] != caller:      # object-level check; same answer as "does not exist"
        return 404, None
    return 200, {k: order[k] for k in PUBLIC_FIELDS}    # property-level allow-list: never the raw row

for name, handler in (("v1", get_order_v1), ("v2", get_order_v2)):
    print(f"{name}: user-7 walks the order IDs 1040-1044")
    for oid in range(1040, 1045):
        status, body = handler("user-7", oid)
        print(f"    GET /orders/{oid} -> {status} {body if body else ''}")`,
      hl: [7, 8, 15, 17],
      out: `v1: user-7 walks the order IDs 1040-1044
    GET /orders/1040 -> 404 
    GET /orders/1041 -> 200 {'id': 1041, 'owner': 'user-7', 'total': 4200, 'card_last4': '4242', 'fraud_score': 0.02, 'internal_note': ''}
    GET /orders/1042 -> 200 {'id': 1042, 'owner': 'user-81', 'total': 1999, 'card_last4': '1881', 'fraud_score': 0.91, 'internal_note': 'chargeback risk'}
    GET /orders/1043 -> 200 {'id': 1043, 'owner': 'user-7', 'total': 650, 'card_last4': '4242', 'fraud_score': 0.01, 'internal_note': ''}
    GET /orders/1044 -> 404 
v2: user-7 walks the order IDs 1040-1044
    GET /orders/1040 -> 404 
    GET /orders/1041 -> 200 {'id': 1041, 'total': 4200, 'card_last4': '4242'}
    GET /orders/1042 -> 404 
    GET /orders/1043 -> 200 {'id': 1043, 'total': 650, 'card_last4': '4242'}
    GET /orders/1044 -> 404 ` },

    { t: "p", text: "Version 1 handed user-7 another customer's order — and with it an internal fraud score and a staff note, because it returned the whole row. Version 2 checks ownership on every object and returns only an allow-list of fields. It also answers **404** rather than 403 for someone else's order, so the endpoint does not confirm which IDs exist. Unguessable IDs (UUIDs) reduce enumeration but are not a substitute for the check." },

    { t: "table", head: ["OWASP API Top 10 (2023)", "Control"], rows: [
      ["1. Broken object-level authorisation", "check ownership or permission for every object, in one place"],
      ["2. Broken authentication", "an identity provider, MFA, strict token validation (12.1, 12.2)"],
      ["3. Broken object property-level authorisation", "response schemas with allow-listed fields; reject unknown input fields"],
      ["4. Unrestricted resource consumption", "rate limits, quotas, pagination, size and time limits (7.3)"],
      ["5. Broken function-level authorisation", "deny by default; separate admin APIs with their own audience"],
      ["6. Unrestricted access to sensitive business flows", "abuse limits per account and device, bot detection"],
      ["7. Server-side request forgery", "allow-list outbound destinations; block metadata and internal addresses"],
      ["8. Security misconfiguration", "hardened defaults, no debug in production, configuration scanning"],
      ["9. Improper inventory management", "a catalogue of every API and version; retire old ones"],
      ["10. Unsafe consumption of APIs", "validate third-party responses like user input"]
    ] },

    { t: "h2", n: "03", id: "encryption", text: "Encryption at rest",
      sub: "Envelope encryption, rotation and crypto-shredding" },

    { t: "p", text: "Encrypting data at rest raises two practical problems: rotating a key should not mean re-encrypting petabytes, and the key must be protected better than the data. **Envelope encryption** solves both. Each record is encrypted with its own **data key** (DEK); the DEK is encrypted — wrapped — by a **key-encryption key** (KEK) that never leaves a key management service or hardware security module; the wrapped DEK is stored beside the data." },

    { t: "viz", title: "Envelope encryption",
      caption: "The KMS holds the KEKs and only ever wraps or unwraps 32-byte data keys, so it handles tiny requests, logs every use, and can enforce who may decrypt what. Each stored record carries its own wrapped data key. Rotating a KEK means re-wrapping data keys; deleting a KEK makes every record — and every backup of it — unreadable.",
      svg: `<svg viewBox="0 0 760 210" width="100%" role="img" aria-label="Envelope encryption">
<defs><marker id="ev-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--ink-3)"/></marker></defs>
<rect x="20" y="30" width="190" height="130" rx="14" style="fill:var(--violet);fill-opacity:.06;stroke:var(--violet)" stroke-width="1.6"/>
<text x="115" y="52" text-anchor="middle" class="s-label" style="fill:var(--violet)">KMS / HSM</text>
<rect x="45" y="66" width="140" height="40" rx="8" class="s-fill" style="stroke:var(--violet)" stroke-width="1.5"/><text x="115.0" y="90.0" text-anchor="middle" class="s-label">KEK per customer</text>
<text x="115" y="130" text-anchor="middle" class="s-sub">never leaves; wraps and</text><text x="115" y="146" text-anchor="middle" class="s-sub">unwraps 32-byte keys only</text>
<line x1="210" y1="86" x2="300" y2="86" style="stroke:var(--violet)" stroke-width="1.5" marker-end="url(#ev-a)"/>
<text x="255" y="78" text-anchor="middle" class="s-sub" style="fill:var(--violet)">wraps</text>
<rect x="302" y="30" width="438" height="130" rx="14" class="s-fill s-stroke" stroke-width="1.4"/>
<text x="316" y="52" class="s-label">one stored record</text>
<rect x="320" y="66" width="140" height="40" rx="8" class="s-fill" style="stroke:var(--warn)" stroke-width="1.5"/><text x="390.0" y="90.0" text-anchor="middle" class="s-label">wrapped DEK</text>
<rect x="480" y="66" width="240" height="40" rx="8" class="s-fill" style="stroke:var(--accent)" stroke-width="1.5"/><text x="600.0" y="90.0" text-anchor="middle" class="s-label">data, encrypted with the DEK</text>
<text x="521" y="130" text-anchor="middle" class="s-sub">a fresh data key per record; the plaintext DEK exists only in memory</text>
<text x="380" y="190" text-anchor="middle" class="s-sub">rotate the KEK: re-wrap small keys, not the data · delete the KEK: every copy of that data is unreadable</text>
</svg>` },

    { t: "code", lang: "python", title: "envelope.py — per-customer KEKs, rotation, and erasing one customer", code: `import os, time
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

class KMS:
    """Holds key-encryption keys (KEKs). They never leave it; it only wraps and unwraps small data keys."""
    def __init__(self): self.keys = {}
    def create(self, kek_id): self.keys[kek_id] = AESGCM.generate_key(256)
    def wrap(self, kek_id, dek): n = os.urandom(12); return n + AESGCM(self.keys[kek_id]).encrypt(n, dek, None)
    def unwrap(self, kek_id, blob): return AESGCM(self.keys[kek_id]).decrypt(blob[:12], blob[12:], None)
    def delete(self, kek_id): del self.keys[kek_id]

kms, store = KMS(), {}
def put(record_id, kek_id, plaintext):            # envelope encryption: a fresh data key (DEK) per record
    dek = AESGCM.generate_key(256); n = os.urandom(12)
    store[record_id] = {"kek": kek_id, "dek": kms.wrap(kek_id, dek), "data": n + AESGCM(dek).encrypt(n, plaintext, None)}
def get(record_id):
    r = store[record_id]; dek = kms.unwrap(r["kek"], r["dek"])
    return AESGCM(dek).decrypt(r["data"][:12], r["data"][12:], None)

blob = os.urandom(256_000)
for user in range(20):                             # one KEK per customer, 100 records each
    kms.create(f"kek-user-{user}-v1")
    for i in range(100): put(f"user-{user}/doc-{i}", f"kek-user-{user}-v1", blob)
print(f"{len(store):,} records, {len(store) * len(blob) / 1e6:,.0f} MB encrypted under {len(kms.keys)} KEKs")

start = time.perf_counter()                        # rotate every KEK: re-wrap 32-byte data keys, never the data
for r in store.values():
    new = r["kek"].replace("-v1", "-v2")
    if new not in kms.keys: kms.create(new)
    r["dek"], r["kek"] = kms.wrap(new, kms.unwrap(r["kek"], r["dek"])), new
print(f"all KEKs rotated: {len(store):,} data keys re-wrapped in {(time.perf_counter() - start) * 1000:.0f} ms; no data re-encrypted")

kms.delete("kek-user-7-v2"); kms.delete("kek-user-7-v1")          # crypto-shredding: erase customer 7
for rid in ("user-7/doc-3", "user-8/doc-3"):
    try: print(f"{rid}: readable = {get(rid) == blob}")
    except KeyError: print(f"{rid}: its KEK no longer exists - unreadable here and in every backup")`,
      hl: [13, 15, 30, 33],
      out: `2,000 records, 512 MB encrypted under 20 KEKs
all KEKs rotated: 2,000 data keys re-wrapped in 9 ms; no data re-encrypted
user-7/doc-3: its KEK no longer exists - unreadable here and in every backup
user-8/doc-3: readable = True` },

    { t: "p", text: "Rotating every KEK re-wrapped 2,000 data keys in a few milliseconds without reading or rewriting 512 MB of data. Deleting customer 7's KEKs made their records unreadable while customer 8's stayed intact: **crypto-shredding**, which satisfies erasure requests even for data in immutable logs (10.4) and old backups that cannot practically be edited." },

    { t: "callout", kind: "tradeoff", title: "Three levels of encryption at rest",
      body: [
        { t: "p", text: "Disk or volume encryption protects against stolen drives and is close to free; turn it on everywhere. Database-level transparent encryption protects data files and backups. Application-level, field-by-field encryption protects specific values — card numbers, health data — even from database administrators and SQL injection, at the cost of losing queries on those fields. Encryption in transit is simpler: TLS 1.3 on every connection, internal ones included." }
      ] },

    { t: "h2", n: "04", id: "secrets", text: "Secrets",
      sub: "Credentials have a life cycle" },

    { t: "diagram", kind: "steps", title: "The life of a secret",
      items: [
        { label: "Create", desc: "Generated by a machine, with enough entropy; never chosen by a person.", tone: "accent" },
        { label: "Store", desc: "In a secrets manager (Vault, AWS Secrets Manager), encrypted, with access policies and audit logs.", tone: "violet" },
        { label: "Deliver", desc: "Injected at run time to the workload's identity; never baked into images or committed to code.", tone: "teal" },
        { label: "Rotate", desc: "Automatically and often; better still, short-lived dynamic credentials issued per workload.", tone: "warn" },
        { label: "Revoke", desc: "Immediately on suspicion of leakage, and expire by default.", tone: "crit" }
      ] },

    { t: "callout", kind: "trap", title: "Secrets leak through the side doors",
      body: [
        { t: "p", text: "Committed to a repository and \"removed\" in the next commit (it is still in the history); printed in logs and error messages; passed as command-line arguments visible in process listings; stored in environment variables that crash reports dump; shared in chat. The strongest fix is to need fewer secrets: workload identity (cloud IAM roles, SPIFFE) lets services authenticate without a stored credential at all." }
      ] },

    { t: "exercise", kind: "Challenge", title: "Catch secrets before they are pushed",
      difficulty: "core", minutes: 25,
      body: [
        { t: "p", text: "Write a scanner for the added lines of a diff, of the kind run as a pre-commit hook and in CI (gitleaks, trufflehog and GitHub's push protection do this). Flag known secret formats, credentials embedded in URLs, private key blocks, and suspicious assignments — using Shannon entropy to separate random keys from ordinary words — while leaving configuration values, environment-variable lookups, hashes and IDs alone. Never print a secret in full." }
      ],
      requirements: [
        "Patterns for known formats: cloud access key IDs, vendor API keys, private keys, passwords in URLs",
        "Assignments to secret-like names flagged when the value has high entropy or is a short literal password",
        "No findings for numbers, os.environ lookups, commit hashes or UUIDs",
        "Redact findings in the output"
      ],
      hint: "Shannon entropy is −Σ p·log₂p over the characters' frequencies: random base64 keys score above about 4 bits per character, English words much lower.",
      solution: { lang: "python", title: "secrets_ex.py",
        code: `import math, re

# The sample secrets are assembled from pieces so that this course's own repository
# does not trip the secret scanners it is teaching about.
AKIA, PRIV = "AKIA" + "IOSFODNN7EXAMPLE", "-----BEGIN OPENSSH " + "PRIVATE KEY-----"
DIFF = f'''+++ b/config/settings.py
+DATABASE_URL = "postgres://app:Wq8#vL2pZ9!rT4@db.internal:5432/shop"
+AWS_ACCESS_KEY_ID = "{AKIA}"
+AWS_SECRET_ACCESS_KEY = "{"wJalrXUtnFEMI/K7MDENG" + "/bPxRfiCYEXAMPLEKEY"}"
+PAYCO_KEY = "{"payco_live_" + "51HxQ2bLkj8Zq0YtR9vNc4mW7"}"
+TIMEOUT_SECONDS = 30
+password = "changeme"
+api_key = os.environ["PAYMENTS_API_KEY"]
+COMMIT = "9f8e7d6c5b4a39281706f5e4d3c2b1a0f9e8d7c6"
+{PRIV}
+REQUEST_ID = "3f2a9c1e-7b4d-4e8a-9c2f-1a2b3c4d5e6f"
'''

PATTERNS = {                                       # formats that are secrets wherever they appear
    "AWS access key ID":  r"\\bAKIA[0-9A-Z]{16}\\b",
    "payment provider key": r"\\bpayco_live_[0-9a-zA-Z]{20,}\\b",     # one rule per vendor format
    "private key block":  r"-----BEGIN [A-Z ]*PRIVATE KEY-----",
    "password in a URL":  r"://[^/\\s:]+:[^@\\s]+@",
}
ASSIGNMENT = re.compile(r"(?i)(secret|password|passwd|token|api_key|key)\\w*\\s*[:=]\\s*[\\"']([^\\"']+)[\\"']")

def entropy(s):                                    # bits per character: random keys score high, words low
    counts = {c: s.count(c) for c in set(s)}
    return -sum(n / len(s) * math.log2(n / len(s)) for n in counts.values())

findings = []
for lineno, line in enumerate(DIFF.splitlines(), 1):
    if not line.startswith("+") or line.startswith("+++"): continue
    hit = next((name for name, rx in PATTERNS.items() if re.search(rx, line)), None)
    if hit: findings.append((lineno, hit, line)); continue
    m = ASSIGNMENT.search(line)
    if m:
        value = m.group(2)
        if entropy(value) >= 3.5 and len(value) >= 16: findings.append((lineno, f"high-entropy {m.group(1)} ({entropy(value):.1f} bits/char)", line))
        elif len(value) < 16: findings.append((lineno, "hard-coded credential (weak, but still a secret)", line))

redact = lambda line: re.sub(r'"([^"]{4})[^"]{8,}"', r'"\\1…"', line)    # never echo a secret in full
for lineno, why, line in findings:
    print(f"line {lineno:>2}: {why:<50} {redact(line[1:])[:48]}")
print(f"\\n{len(findings)} findings; not flagged: the timeout, the env-var lookup, the commit hash, the request UUID")`,
        out: `line  2: password in a URL                                  DATABASE_URL = "post…"
line  3: AWS access key ID                                  AWS_ACCESS_KEY_ID = "AKIA…"
line  4: high-entropy SECRET (4.7 bits/char)                AWS_SECRET_ACCESS_KEY = "wJal…"
line  5: payment provider key                               PAYCO_KEY = "payc…"
line  7: hard-coded credential (weak, but still a secret)   password = "changeme"
line 10: private key block                                  -----BEGIN OPENSSH PRIVATE KEY-----

6 findings; not flagged: the timeout, the env-var lookup, the commit hash, the request UUID`,
        notes: [
          { t: "p", text: "Format rules caught the keys whose shape is distinctive; the entropy rule caught the cloud secret key, which has no fixed prefix; the literal \"changeme\" password was flagged because hard-coded credentials are a finding whatever their strength. The commit hash and UUID were left alone because they are not assigned to secret-like names, and the environment lookup is the correct pattern." },
          { t: "p", text: "Two details are worth copying. The sample secrets are assembled from pieces, because this course's repository is itself scanned — a real scanner would block the push otherwise. And findings are redacted, because scanner output ends up in CI logs. When a real secret is found after a push, rotate it first; removing it from history comes second." }
        ] } },

    { t: "callout", kind: "scenario", title: "Incident: an order API that anyone could read",
      body: [
        { t: "p", text: "**Symptom.** A security researcher reported that changing the number in a delivery-tracking URL showed other customers' names, addresses and order contents. The API had passed a penetration test the previous year." },
        { t: "p", text: "**Mechanism.** The endpoint required a valid login and fetched the order by ID — bola.py's version 1. Sequential order numbers made enumeration trivial, and the response included fields the app never displayed, among them the customer's phone number. A new mobile endpoint had copied an old handler that predated the shared authorisation middleware." },
        { t: "p", text: "**Fix.** Object-level checks moved into the data-access layer, so every query for an order is scoped to the caller unless an explicit admin permission is present; responses use per-audience schemas; public order references became random; and an automated test calls every endpoint with a second user's object IDs and fails the build on any 200." }
      ] }
  ],

  takeaways: [
    "**Zero trust**: no trusted network; every call authenticated, authorised and encrypted, with **least privilege** and **assumed breach**.",
    "**Mutual TLS** gives services identities: measured, no certificate and a foreign CA failed the handshake, while a valid mesh identity not in the policy got **403** — authentication and authorisation are separate.",
    "Use short-lived, automatically rotated certificates and SPIFFE IDs; let the mesh's sidecars do the work.",
    "**BOLA** is the top API flaw: check ownership of every object, and answer **404** for objects that are not the caller's.",
    "Return **allow-listed fields**, never the raw row: version 1 leaked a fraud score and a staff note.",
    "Map the **OWASP API Top 10** to controls, especially rate limits, function-level authorisation and SSRF protection.",
    "**Envelope encryption**: per-record data keys wrapped by KEKs in a KMS — measured, rotating every KEK re-wrapped **2,000 keys in milliseconds** without touching **512 MB** of data.",
    "**Crypto-shredding**: deleting a customer's KEK made their data unreadable everywhere, backups included.",
    "Secrets have a **life cycle** — create, store, deliver, rotate, revoke; prefer **workload identity** to stored secrets.",
    "Scan for secrets **before** they are pushed, redact findings, and **rotate first** when one leaks."
  ],

  quiz: {
    title: "Check yourself",
    questions: [
      { stem: "A service presents a valid certificate from the mesh CA, but payments refuses its call with 403. What happened?",
        options: ["The TLS handshake failed", "Authentication succeeded — its identity was proven — but the authorisation policy does not allow that identity to call payments", "Its certificate expired", "The mesh CA is compromised"],
        answer: 1,
        why: "A completed handshake with a valid certificate proves who the caller is. The 403 is a separate policy decision about what that identity may do, as with the recommendations service in mtls.py. Expired or untrusted certificates fail the handshake instead." },

      { stem: "GET /orders/{id} checks that the user is logged in and returns the order. What is missing?",
        options: ["Nothing", "An object-level check that the order belongs to the caller (or that they have permission), plus an allow-list of returned fields", "HTTPS", "A longer ID"],
        answer: 1,
        why: "Authentication is not authorisation for a specific object — that gap is BOLA, OWASP's top API risk. Returning only permitted fields addresses the property-level variant. HTTPS and longer IDs do not stop a logged-in user from reading others' objects." },

      { stem: "Why does envelope encryption make key rotation cheap?",
        options: ["It uses weaker encryption", "Rotating the key-encryption key only re-wraps the small per-record data keys; the data itself stays encrypted under unchanged data keys", "It skips encryption for old data", "It stores keys next to the data in plaintext"],
        answer: 1,
        why: "Data is encrypted under data keys; only those keys are encrypted under the KEK. Changing the KEK means unwrapping and re-wrapping 32-byte keys — 2,000 of them in milliseconds — not re-encrypting the data." },

      { stem: "A developer commits an API key and removes it in the next commit. What should happen first?",
        options: ["Rewrite git history to remove it", "Rotate (revoke and replace) the key, because it must be assumed compromised; clean history afterwards", "Nothing, since the latest commit is clean", "Make the repository private"],
        answer: 1,
        why: "The key remains in the history and may already have been copied by scanners that watch public repositories within minutes. Revoking it removes the risk; history cleaning and visibility changes only reduce future exposure." }
    ]
  },

  interview: {
    title: "In an interview",
    sub: "Security design questions want layered controls and specific mechanisms.",
    questions: [
      { level: "advanced",
        q: "How would you secure a microservices architecture?",
        strong: "A strong answer layers identity, transport, authorisation, data protection, secrets and detection.",
        answer: [
          { t: "p", text: "At the edge: an API gateway terminating TLS, validating tokens from an identity provider, rate limiting, and a WAF. Between services: zero trust — mutual TLS with short-lived certificates and SPIFFE identities from the mesh, and authorisation policies saying which service may call which; user context passed as a token with its own audience, checked again by each service for object-level permissions." },
          { t: "p", text: "Data: encryption in transit everywhere, encryption at rest with KMS-managed envelope keys, field-level encryption for the most sensitive fields. Secrets in a secrets manager or replaced by workload identity, rotated automatically, scanned for in CI. And detection: audit logs, anomaly alerts, and regular tests of authorisation with a second user's object IDs." }
        ] },

      { level: "core",
        q: "What is broken object-level authorisation and how do you prevent it systematically?",
        strong: "A strong answer defines it and makes the check structural rather than per-endpoint.",
        answer: [
          { t: "p", text: "An endpoint authenticates the caller but does not verify that the requested object belongs to them, so changing an ID exposes other users' data. It is the most common serious API flaw because it is easy to forget in one handler." },
          { t: "p", text: "Prevent it structurally: scope data access to the caller by default in the repository layer, centralise permission checks in one authorisation component, return 404 for objects the caller may not see, use random public identifiers to slow enumeration, and test every endpoint automatically with a second user's object IDs." }
        ] },

      { level: "core",
        q: "How would you design a secrets management strategy?",
        strong: "A strong answer covers the life cycle, delivery, rotation and the move to identity-based access.",
        answer: [
          { t: "p", text: "A central secrets manager with fine-grained access policies and audit logs. Workloads authenticate to it with their platform identity — cloud IAM role, Kubernetes service account, SPIFFE ID — and receive secrets at run time; nothing in images, repositories or plain environment files. Prefer dynamic, short-lived credentials, such as database users generated per workload with a lease." },
          { t: "p", text: "Automate rotation and test it, alert on unusual access, scan code and CI logs for secrets before merge, and have a revocation runbook. Where possible remove the secret entirely, using workload identity for cloud APIs and mTLS between services." }
        ] }
    ]
  }
});
