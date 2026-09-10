/* ============================================================================
   LESSON 3.1 — Axioms, Counting and the Sample Space
   ========================================================================= */
EC.receiveLesson({
  id: "3.1",

  lede: "Probability rests on three axioms, and almost every wrong answer in the subject comes from one of two places: a sample space that was never written down, or a count that double-counted. **Getting the sample space right is most of the work** — the arithmetic afterwards is usually trivial.",

  objectives: [
    "State the three axioms and derive the standard rules from them",
    "Write down a sample space and say whether its outcomes are equally likely",
    "Choose between permutations and combinations without guessing",
    "Apply inclusion–exclusion where naive addition double-counts",
    "Recognise the birthday-problem shape when it appears in engineering"
  ],

  prerequisites: [],

  blocks: [

    { t: "h2", n: "01", text: "Three axioms, and everything else", id: "axioms" },

    { t: "p", text: "Probability is built on three assumptions, and everything else in the subject is derived from them. **They say that probabilities are non-negative, that something certainly happens, and that probabilities of separate outcomes add** — nothing more is assumed." },

    { t: "dl", items: [
      ["Sample space", "Written `S` — the set of every outcome the experiment can produce. Writing it down is most of the work."],
      ["Event", "Any subset of the sample space. \"The die shows an even number\" is the event `{2, 4, 6}`."],
      ["Non-negativity", "`P(A) ≥ 0`. A probability is never negative."],
      ["Normalisation", "`P(S) = 1`. Some outcome occurs with certainty."],
      ["Countable additivity", "For **disjoint** events, `P(A or B) = P(A) + P(B)`. The word *disjoint* is what the union rule later has to repair."],
      ["Equally likely", "A property of the sample space you chose, not a default. `P(A) = |A|/|S|` is valid only when it holds."],
      ["Kolmogorov's axioms", "The three assumptions above, named for their author. Everything else in probability is derived from them rather than assumed alongside."]
    ]},

    { t: "code", lang: "python", title: "the rules are consequences, not extra assumptions", code: `
import numpy as np
from itertools import product, permutations, combinations

# KOLMOGOROV'S THREE AXIOMS:
#
#   1. NON-NEGATIVITY     P(A) >= 0
#   2. NORMALISATION      P(S) = 1        S = the whole sample space
#   3. COUNTABLE ADDITIVITY
#                         P(A or B) = P(A) + P(B)   for DISJOINT A, B
#
# That is the entire foundation. Everything below is derived.

#   COMPLEMENT     P(not A) = 1 - P(A)
#     A and not-A are disjoint and cover S, so by 2 and 3 they sum to 1.
#
#   UNION          P(A or B) = P(A) + P(B) - P(A and B)
#     Axiom 3 applies only to DISJOINT events. When A and B overlap,
#     adding them counts the overlap twice, so subtract it once.
#
#   MONOTONICITY   A subset of B  =>  P(A) <= P(B)
#     B = A or (B without A), disjoint, and the second term is >= 0.
#
#   BOUND          P(A) <= 1
#     Follows from monotonicity with B = S.

# A SAMPLE SPACE is the set of all outcomes. Getting it right is the
# whole game, because "equally likely" is a claim about the space, not
# a fact about the world.

S = list(product([1, 2, 3, 4, 5, 6], repeat=2))       # two dice, ORDERED
len(S)                                                # 36

# THE CLASSIC ERROR: treating the 11 possible SUMS (2..12) as equally
# likely. They are not, because they correspond to different numbers of
# ordered outcomes.
sums = {}
for a, b in S:
    sums[a + b] = sums.get(a + b, 0) + 1

sums[7], sums[2]              # 6 and 1 -- a 7 is six times as likely as a 2
sums[7] / 36                  # 0.1667

# THE ORDERED SPACE IS THE ONE WITH EQUALLY LIKELY OUTCOMES. Whenever
# you are unsure, enumerate the ordered version -- it is almost always
# the space where each element has the same probability.
`,
      hl: [7, 8, 9, 47],
      caption: "**Only three assumptions.** The union rule is not an extra axiom — it is what you get when you apply additivity to events that overlap, and subtract the double count."
    },

    { t: "callout", kind: "mental", title: "The mental model", body: [
      { t: "p", text: "**A probability is a measure on a set, normalised to 1.** Under that view the axioms are just the requirements of a measure: non-negative, total mass one, additive over disjoint pieces." },
      { t: "p", text: "Which makes the practical instruction clear: **write the set down first**. Most probability errors are not arithmetic errors — they are answers to a different question, because the space in the solver's head was not the space in the problem." }
    ]},

    { t: "h2", n: "02", text: "Counting: four cases and nothing else", id: "counting" },

    { t: "p", text: "When outcomes are equally likely, a probability becomes a counting problem — and **every counting problem is one of four cases**, decided by two questions: can an item repeat, and does the order matter?" },

    { t: "dl", items: [
      ["Permutation", "An arrangement where order matters. `n!/(n−k)!` ways to arrange `k` of `n` distinct items."],
      ["Combination", "A selection where order does not matter. `C(n,k) = n!/(k!(n−k)!)`, read as \"n choose k\"."],
      ["With replacement", "Items may repeat. `nᵏ` if order matters — passwords, dice rolls."],
      ["Without replacement", "Each item used once. Cards dealt, people chosen for a committee."],
      ["The bridge", "`C(n,k) = P(n,k)/k!`. Count the ordered arrangements, then divide out the orderings you did not want."],
      ["Combinatorics", "The mathematics of counting arrangements. Under equally likely outcomes, a probability question becomes a combinatorics question and nothing more."]
    ]},

    { t: "table",
      head: ["", "Order matters", "Order does not"],
      rows: [
        ["**With replacement**", "`nᵏ`<br>passwords, dice rolls, IP addresses", "`C(n+k−1, k)`<br>multiset, coin denominations"],
        ["**Without replacement**", "`n!/(n−k)!`<br>podium finishes, rankings", "`C(n,k) = n!/(k!(n−k)!)`<br>committees, hands of cards, subsets"]
      ],
      caption: "**Two questions settle every counting problem**: can an item repeat, and does the arrangement matter? The bottom-right cell — combinations — covers most of what you meet."
    },

    { t: "code", lang: "python", title: "the four cases, verified by enumeration", code: `
from math import comb, perm, factorial

n, k = 5, 3
items = "ABCDE"

# 1. ORDERED, WITH REPLACEMENT -- n^k
len(list(product(items, repeat=k)))          # 125 = 5^3
n**k                                         # 125
#    "How many 3-character passwords from 5 letters?"

# 2. ORDERED, WITHOUT REPLACEMENT -- n!/(n-k)!
len(list(permutations(items, k)))            # 60
perm(n, k)                                   # 60
#    "Gold, silver and bronze from 5 runners?"

# 3. UNORDERED, WITHOUT REPLACEMENT -- C(n,k)
len(list(combinations(items, k)))            # 10
comb(n, k)                                   # 10
#    "A committee of 3 from 5 people?"

# 4. UNORDERED, WITH REPLACEMENT -- C(n+k-1, k)
from itertools import combinations_with_replacement as cwr
len(list(cwr(items, k)))                     # 35
comb(n + k - 1, k)                           # 35
#    "3 scoops from 5 flavours, repeats allowed?"

# THE RELATIONSHIP BETWEEN 2 AND 3 IS THE ONE TO INTERNALISE:
#
#     C(n,k) = P(n,k) / k!
#
# Every unordered selection corresponds to exactly k! ordered ones, so
# dividing by k! removes the ordering. If you can count the ordered
# version, you can always get the unordered one.
perm(n, k) / factorial(k) == comb(n, k)      # True

# SYMMETRY WORTH KNOWING: C(n,k) = C(n, n-k). Choosing 3 to include is
# the same as choosing 2 to exclude, which is why C(50,47) is easy.
comb(50, 47) == comb(50, 3)                  # True, and 19600 either way
`,
      hl: [31, 39],
      caption: "**`C(n,k) = P(n,k)/k!` is the bridge.** Count the ordered arrangements — usually the easier job — then divide out the orderings you did not want."
    },

    { t: "h2", n: "03", text: "Inclusion–exclusion", id: "inclusion-exclusion" },

    { t: "p", text: "The third axiom only permits adding probabilities for **disjoint** events. When events overlap, adding them counts the overlap twice — so **inclusion–exclusion subtracts it back out**, and with more events the corrections alternate in sign." },

    { t: "dl", items: [
      ["Union rule", "`P(A ∪ B) = P(A) + P(B) − P(A ∩ B)`. Not an extra axiom, just additivity with the double count removed."],
      ["Union bound", "`P(any of A₁…Aₘ) ≤ ΣP(Aᵢ)` — the naive sum, kept deliberately as an upper bound. It can exceed 1, which is the giveaway."],
      ["Complement rule", "`P(not A) = 1 − P(A)`. For \"at least one\" questions this turns a sum over every occurrence count into a single term."],
      ["Mutually exclusive", "Events that cannot both occur, so their intersection is empty and they simply add."]
    ]},

    { t: "viz",
      title: "Adding overlapping events counts the overlap twice",
      caption: "P(A ∪ B) = P(A) + P(B) − P(A ∩ B). With three sets the pairwise subtractions remove the centre three times too many, so it goes back in — hence the alternating signs.",
      svg: `<svg viewBox="0 0 880 260" role="img" aria-label="Two-set and three-set Venn diagrams illustrating inclusion-exclusion">
  <g>
    <circle cx="200" cy="130" r="72" style="fill:var(--accent);fill-opacity:.16;stroke:var(--accent)" stroke-width="2"/>
    <circle cx="276" cy="130" r="72" style="fill:var(--warn);fill-opacity:.16;stroke:var(--warn)" stroke-width="2"/>
    <text x="158" y="136" class="s-label" style="fill:var(--accent)">A</text>
    <text x="308" y="136" class="s-label" style="fill:var(--warn)">B</text>
    <text x="222" y="136" class="s-sub" style="fill:var(--crit)">counted</text>
    <text x="230" y="152" class="s-sub" style="fill:var(--crit)">twice</text>
    <text x="120" y="234" class="s-sub" style="fill:var(--ink-3)">P(A) + P(B) - P(A and B)</text>
  </g>

  <g transform="translate(430,0)">
    <circle cx="180" cy="104" r="68" style="fill:var(--accent);fill-opacity:.14;stroke:var(--accent)" stroke-width="2"/>
    <circle cx="252" cy="104" r="68" style="fill:var(--warn);fill-opacity:.14;stroke:var(--warn)" stroke-width="2"/>
    <circle cx="216" cy="164" r="68" style="fill:var(--good);fill-opacity:.14;stroke:var(--good)" stroke-width="2"/>
    <text x="138" y="94"  class="s-label" style="fill:var(--accent)">A</text>
    <text x="288" y="94"  class="s-label" style="fill:var(--warn)">B</text>
    <text x="208" y="222" class="s-label" style="fill:var(--good)">C</text>
    <text x="0" y="248" class="s-sub" style="fill:var(--ink-3)">sum singles - sum pairs + triple</text>
  </g>
</svg>`
    },

    { t: "code", lang: "python", title: "where naive addition goes wrong", code: `
# A SERVICE FAILS IF ANY DEPENDENCY FAILS. Three dependencies, each
# with a 1% failure probability, failing independently.

p = 0.01

# WRONG -- addition assumes the events are disjoint, i.e. that two
# dependencies can never fail at once. They can.
3 * p                                    # 0.03

# RIGHT -- via the complement, which is nearly always easier for "at
# least one" questions.
1 - (1 - p)**3                           # 0.029701

# RIGHT -- via inclusion-exclusion, giving the same answer the long way.
3*p - 3*p**2 + p**3                      # 0.029701

# The gap is small at p = 0.01 and large where it matters:
for p in (0.01, 0.1, 0.3, 0.5):
    print(f"p={p}:  naive {3*p:.3f}   true {1-(1-p)**3:.3f}")

# p=0.01:  naive 0.030   true 0.030
# p=0.1:   naive 0.300   true 0.271
# p=0.3:   naive 0.900   true 0.657
# p=0.5:   naive 1.500   true 0.875     <- a probability above 1

# A "PROBABILITY" OF 1.5 IS THE DIAGNOSTIC. Naive addition is an upper
# bound (the union bound), so it can exceed 1 and never warns you.
# It is still useful precisely BECAUSE it is an upper bound: for rare
# events it is close and always conservative, which is why reliability
# budgets are often computed that way on purpose.

# "AT LEAST ONE" -> COMPLEMENT. Always try this first.
#   P(at least one) = 1 - P(none)
# Counting the ways something can happen at least once means summing
# over 1, 2, 3, ... occurrences. Counting the ways it happens zero
# times is a single term.
`,
      hl: [8, 12, 26],
      caption: "**\"At least one\" almost always means \"one minus none\".** The direct count sums over every number of occurrences; the complement is a single term."
    },

    { t: "h2", n: "04", text: "The birthday problem, and where it shows up", id: "birthday" },

    { t: "p", text: "The birthday problem is the classic demonstration that collision intuition is badly wrong. **With 23 people the chance of a shared birthday is above 50%** — because the question is about *any* pair, and 23 people make 253 pairs." },

    { t: "dl", items: [
      ["Collision", "Two draws producing the same value. In engineering: two records with the same hash, two ids that clash."],
      ["The √N rule", "A collision becomes likely after roughly `√N` draws from `N` possibilities — not `N/2`. Precisely, `1.177√N` for even odds."],
      ["Expected collisions", "`C(n,2)/N ≈ n²/2N`. The most useful form, because it converts directly into \"how many records will I lose\"."],
      ["Birthday attack", "The cryptographic consequence: a hash of `b` bits offers only about `b/2` bits of collision resistance."]
    ]},

    { t: "code", lang: "python", title: "collisions arrive far sooner than intuition says", code: `
def any_collision(n, days=365):
    """P(at least two of n people share a birthday) -- via the
    complement, because 'all distinct' is one product."""
    if n > days:
        return 1.0
    p_distinct = 1.0
    for i in range(n):
        p_distinct *= (days - i) / days
    return 1.0 - p_distinct

any_collision(23)          # 0.5073   <- a coin flip at 23 people
any_collision(50)          # 0.9704
any_collision(70)          # 0.9992

# WHY IT FEELS WRONG: people picture "someone shares MY birthday",
# which needs n ~ 253 for a 50% chance. The question is about ANY pair,
# and there are C(n,2) pairs -- which grows quadratically.
#
#   n = 23  ->  C(23,2) = 253 pairs, each with a 1/365 chance
#
# The two numbers matching is not a coincidence: 253/365 ~ 0.69 is the
# expected number of collisions, and P(at least one) ~ 1 - e^-0.69 ~ 0.5.

# THE GENERAL RULE: a collision becomes likely at about sqrt(N) draws
# from N possibilities, not N/2.
#
#     n ~ 1.177 * sqrt(N)     for a 50% chance
np.sqrt(365) * 1.177                     # 22.5  -- matches the 23

# WHERE THIS BITES IN ENGINEERING:
#
#   32-BIT HASH.  N = 4.3e9, so a collision is even money at ~77,000
#   items -- not two billion. A hash table keyed on a 32-bit hash of a
#   million records is almost certain to collide.
1.177 * np.sqrt(2**32)                   # 77,163

#   RANDOM 8-CHAR IDS from 62 characters. N = 62^8 = 2.2e14, even money
#   at ~17 million ids. Fine for a small service, not for event logging.
1.177 * np.sqrt(62**8)                   # 17.5 million

#   UUID4.  122 random bits, N = 5.3e36, even money at 2.7e18 -- which
#   is why UUIDs are treated as collision-free in practice.
1.177 * np.sqrt(2**122)                  # 2.7e18

# THE PRACTICAL FORM: to keep collision probability below q for n
# items, you need roughly N > n^2 / (2q) possibilities.
def bits_needed(n, q=1e-9):
    return np.log2(n**2 / (2*q))

bits_needed(1e9, 1e-9)                   # 88.7 bits -> use 128
`,
      hl: [15, 24, 29],
      caption: "**Collisions become likely at `√N`, not `N/2`.** A 32-bit hash is even money at 77,000 items — the reason to reach for 128 bits is this line of arithmetic, not caution."
    },

    { t: "callout", kind: "trap", title: "Equally likely is a claim, not a default", body: [
      { t: "p", text: "The formula `P(A) = |A|/|S|` is only valid when every outcome in `S` has the same probability. Applying it to a space where they do not is the single most common error in the subject." },
      { t: "code", lang: "python", numbered: false, title: "the same event, two spaces, two answers", code: `
# TWO CHILDREN, at least one is a girl. What is P(both girls)?
#
# WRONG SPACE: {both girls, one of each, both boys} -- treating three
# outcomes as equally likely gives 1/2 after eliminating "both boys".
#
# RIGHT SPACE: ordered pairs, which ARE equally likely.
S = [("G","G"), ("G","B"), ("B","G"), ("B","B")]

known = [s for s in S if "G" in s]        # 3 outcomes remain
both  = [s for s in known if s == ("G","G")]
len(both) / len(known)                    # 1/3, not 1/2

# "One of each" is TWO of the four ordered outcomes, so it is twice as
# likely as "both girls" -- exactly the dice-sums error from section 1,
# wearing different clothes.`},
      { t: "p", text: "**When in doubt, enumerate the ordered space.** It is nearly always the one whose outcomes are equally likely, and you can collapse it afterwards." }
    ]},

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Build",
      title: "Size an id space against a collision budget",
      difficulty: "core",
      minutes: 26,
      body: [
        { t: "p", text: "You are choosing an id scheme for an event pipeline. The service will emit 50 billion events over five years, and the requirement is that the probability of *any* id collision across the whole period stays below one in a million." },
        { t: "p", text: "Three schemes are on the table." },
        { t: "code", lang: "python", numbered: false, title: "candidates", code: `
# A. 64-bit random integer                    N = 2^64
# B. 16-character id from [a-z0-9]            N = 36^16
# C. UUID4 (122 random bits)                  N = 2^122

N_EVENTS = 50_000_000_000
BUDGET   = 1e-6            # P(any collision) must stay under this`},
        { t: "p", text: "Compute the collision probability for each, recommend one, and give the general formula so the next person does not have to redo it." }
      ],
      requirements: [
        "Derive the collision probability rather than quoting the birthday result.",
        "Compute it for all three schemes, in a way that does not underflow.",
        "Recommend one, with the margin it leaves.",
        "Give a reusable function that answers \"how many bits do I need?\".",
        "Say what changes if ids are sequential rather than random.",
        "Include tests."
      ],
      hint: "The exact product underflows badly at these sizes — use the `n²/2N` approximation and justify why it is safe here.",
      solution: {
        lang: "python",
        title: "id_space.py",
        code: `import numpy as np
from math import log2, exp, expm1

N_EVENTS = 50_000_000_000            # 5e10
BUDGET = 1e-6


# =========================================================================
# THE DERIVATION
# =========================================================================
#
# P(no collision among n draws from N) = prod_{i=0}^{n-1} (N - i)/N
#
# Taking logs and using log(1 - x) ~ -x - x^2/2 for small x:
#
#   log P(none) = sum_{i=0}^{n-1} log(1 - i/N)  ~  -sum i/N
#               = -n(n-1)/(2N)  ~  -n^2/(2N)
#
#   P(collision) = 1 - exp(-n^2 / (2N))
#
# WHEN IS THE APPROXIMATION SAFE? It needs i/N << 1 for every i, i.e.
# n << N. Here n = 5e10 and the smallest N is 2^64 = 1.8e19, so
# n/N = 2.7e-9. The neglected term is of order n^3/N^2 ~ 4e-7 relative
# -- far below anything we care about.
#
# THE EXACT PRODUCT IS NOT AN OPTION: 5e10 factors, each within 1e-9 of
# 1.0. In float64 most of them round to exactly 1.0, so the product
# returns 1.0 and the answer reads as "no collision, ever" -- the
# cancellation failure from lesson 2.6, in a new costume.

def p_collision(n, N):
    """P(at least one collision) for n draws from N possibilities.
    Uses expm1 so the answer stays accurate when it is tiny."""
    if n > N:
        return 1.0
    exponent = -(n * (n - 1)) / (2.0 * N)     # exact n(n-1)/2 pairs
    return -expm1(exponent)                   # 1 - exp(x), stably


# =========================================================================
# THE THREE CANDIDATES
# =========================================================================

schemes = {
    "A. 64-bit random":     2**64,
    "B. 16 chars [a-z0-9]": 36**16,
    "C. UUID4 (122 bits)":  2**122,
}

for name, N in schemes.items():
    p = p_collision(N_EVENTS, N)
    print(f"{name:24s} N=2^{log2(N):6.1f}  P(collision)={p:.3e}  "
          f"{'PASS' if p < BUDGET else 'FAIL'}")

# A. 64-bit random         N=2^  64.0  P(collision)=6.776e-02  FAIL
# B. 16 chars [a-z0-9]     N=2^  82.7  P(collision)=1.549e-07  PASS
# C. UUID4 (122 bits)      N=2^ 122.0  P(collision)=2.351e-19  PASS
#
# SCHEME A FAILS BY FIVE ORDERS OF MAGNITUDE -- a 6.8% chance of at
# least one collision, which over five years is close to a certainty
# of an incident. That is the result people find surprising: 64 bits
# sounds enormous, and 2^64 IS enormous, but the birthday effect means
# the relevant comparison is n^2 = 2.5e21 against N = 1.8e19.


# =========================================================================
# THE RECOMMENDATION
# =========================================================================
#
# SCHEME C, UUID4.
#
# Margin: 2.4e-19 against a budget of 1e-6 -- thirteen orders of
# magnitude of headroom. The event volume could grow by a factor of a
# million and it would still pass.
#
# WHY NOT B, which also passes? Its margin is only 6.5x. Volume
# forecasts are wrong in the growth direction far more often than the
# other way, and a 6.5x margin is one good year away from failing.
# Neither is the deciding argument on its own; together with UUID4
# being a standard with library support everywhere, C is the choice.
#
# WHAT C COSTS: 36 characters as text against 16, and 16 bytes as
# binary against 8. If storage genuinely dominates, scheme B with 20
# characters instead of 16 (N = 36^20 = 2^103) restores the margin at
# a smaller size than a UUID. That is the trade to have explicitly.


# =========================================================================
# THE REUSABLE FORM
# =========================================================================

def bits_needed(n, budget=1e-9):
    """Random bits required to keep P(any collision) below budget for
    n ids. Inverts P ~ n^2/(2N) with the small-P approximation
    1 - exp(-x) ~ x, which is what makes it invertible in closed form."""
    if not 0 < budget < 1:
        raise ValueError(f"budget must be in (0,1), got {budget}")
    return log2(n * n / (2.0 * budget))

bits_needed(5e10, 1e-6)          # 81.4  -> 82 bits, so B is the minimum
bits_needed(5e10, 1e-9)          # 91.4
bits_needed(1e12, 1e-9)          # 100.9
bits_needed(1e15, 1e-12)         # 130.9 -> even a UUID is marginal here

# THE SHAPE TO REMEMBER: bits scale as 2*log2(n). Every 10x growth in
# volume costs ~6.6 more bits, and every 1000x tightening of the budget
# costs ~10 bits. Volume is the expensive term.


# =========================================================================
# IF THE IDS ARE SEQUENTIAL RATHER THAN RANDOM
# =========================================================================
#
# Everything above evaporates. A counter has ZERO collision probability
# by construction -- 64 bits holds 1.8e19 values and 5e10 events use
# 0.0000003% of them.
#
# The birthday problem applies only to INDEPENDENT RANDOM draws. If you
# can coordinate, coordination beats probability every time.
#
# WHAT SEQUENTIAL COSTS INSTEAD:
#   - a single point of allocation, or a per-shard prefix scheme
#   - ids that leak volume (id 4,000,000 tells a competitor your scale)
#   - ids that leak ORDER, which is sometimes a security issue
#   - hot-spotting in range-partitioned stores, since new writes all
#     land in the same partition
#
# THE COMMON MIDDLE GROUND: a timestamp prefix plus random suffix
# (ULID, Snowflake, UUIDv7). Collisions then only need to be avoided
# WITHIN a millisecond, so n drops from 5e10 to whatever arrives in
# 1 ms -- and the required bits fall accordingly.

peak_per_ms = 10_000
bits_needed(peak_per_ms, 1e-9)   # 46.5 bits of randomness per ms
#
# So a 48-bit timestamp plus 64 random bits is comfortable, and sorts
# by time -- which is why UUIDv7 is shaped the way it is.


# =========================================================================
# TESTS
# =========================================================================

def test_matches_the_classic_birthday_problem():
    """The approximation should reproduce the known 23-person answer."""
    assert abs(p_collision(23, 365) - 0.5073) < 0.02


def test_exact_small_case():
    """n=2 from N=365: exactly 1/365."""
    assert abs(p_collision(2, 365) - 1/365) < 1e-9


def test_single_draw_cannot_collide():
    assert p_collision(1, 2**64) == 0.0
    assert p_collision(0, 2**64) == 0.0


def test_more_draws_than_slots_is_certain():
    assert p_collision(366, 365) == 1.0


def test_sixty_four_bits_fails_the_budget():
    """The finding that drives the recommendation."""
    assert p_collision(N_EVENTS, 2**64) > BUDGET


def test_uuid4_passes_with_room():
    p = p_collision(N_EVENTS, 2**122)

    assert p < BUDGET / 1e10          # not merely passing -- vast margin


def test_bits_needed_inverts_p_collision():
    """Round-trip: the bits the formula asks for must actually deliver
    the budget."""
    for n, q in [(1e6, 1e-9), (5e10, 1e-6), (1e12, 1e-12)]:
        b = bits_needed(n, q)

        assert p_collision(int(n), 2**b) <= q * 1.01


def test_tiny_probabilities_do_not_underflow_to_zero():
    """expm1 keeps the answer meaningful where 1-exp(x) would give 0."""
    p = p_collision(1000, 2**122)

    assert 0.0 < p < 1e-30`,
        notes: [
          { t: "p", text: "**The exact product is not an option here.** With 5×10¹⁰ factors each within 10⁻⁹ of 1.0, most round to exactly 1.0 in float64 and the product returns \"no collision, ever\" — the cancellation failure from lesson 2.6 in a new costume. `expm1` keeps the answer meaningful down to 10⁻¹⁹." },
          { t: "p", text: "**64 bits fails by five orders of magnitude**, at a 6.8% chance of at least one collision. That is the surprising result: 2⁶⁴ is enormous, but the birthday effect means the comparison is `n² = 2.5×10²¹` against `N = 1.8×10¹⁹`." },
          { t: "callout", kind: "insight", title: "Scheme B passes too — the margin is the argument", body: [
            { t: "p", text: "B clears the budget with 6.5× headroom; C clears it with 10¹³×. Volume forecasts err on the low side far more often than the high, and a 6.5× margin is one good year from failing. Neither point decides it alone, but together with UUID4 being a standard with library support everywhere, C wins." }
          ]},
          { t: "p", text: "**Bits scale as `2·log₂(n)`.** Every 10× growth in volume costs about 6.6 more bits; every 1000× tightening of the budget costs about 10. Volume is the expensive term, which is worth knowing before a forecast changes." },
          { t: "p", text: "**Sequential ids make all of this evaporate** — a counter has zero collision probability by construction, because the birthday problem applies only to independent random draws. The costs move elsewhere: a coordination point, ids that leak volume and order, and hot-spotting in range-partitioned stores." },
          { t: "p", text: "**The timestamp-plus-random shape is the usual resolution.** Collisions then need avoiding only within a millisecond, so `n` falls from 5×10¹⁰ to peak-per-ms and the required randomness drops to about 47 bits — which is why UUIDv7 and ULID are built the way they are." }
        ]
      }
    },

    { t: "callout", kind: "scenario", title: "Real-world scenario", body: [
      { t: "p", text: "A team deduplicated a 40-million-row dataset by a 32-bit CRC of each row, and the pipeline quietly dropped about 180 legitimate rows per run." },
      { t: "p", text: "**At 40 million items against 2³² slots, the expected number of colliding pairs is `n²/2N ≈ 186`** — the loss was not a bug, it was the design working exactly as the arithmetic says it must." },
      { t: "p", text: "It went unnoticed for months because 180 rows in 40 million is 0.0004%, well inside the noise the team tolerated in every other metric." },
      { t: "p", text: "**Moving to a 128-bit hash made the expected collisions `3×10⁻²³`.** The general check is one line: compute `n²/2N` before choosing a hash width, and read it as \"how many rows am I willing to lose\"." }
    ]}
  ],

  takeaways: [
    "**Three axioms — non-negativity, total mass one, additivity over disjoint events — generate every other rule.**",
    "**The union rule subtracts the overlap** because additivity applies only to disjoint events.",
    "**`P(A) = |A|/|S|` requires equally likely outcomes**, which is a claim about the space you chose, not a default.",
    "**When unsure, enumerate the ordered space** — it is almost always the one with equally likely outcomes.",
    "**Two questions settle any count**: can items repeat, and does order matter.",
    "**`C(n,k) = P(n,k)/k!`** — count the ordered arrangements, then divide out the orderings you did not want.",
    "**\"At least one\" means \"one minus none\"**, which turns a sum over every occurrence count into a single term.",
    "**Naive addition of overlapping events is the union bound** — an upper bound that can exceed 1, and is useful precisely because it is conservative.",
    "**Collisions become likely at `√N` draws, not `N/2`** — 23 people for birthdays, 77,000 items for a 32-bit hash.",
    "**Random bits needed scale as `2·log₂(n)`**: every 10× more items costs about 6.6 more bits.",
    "**Compute `n²/2N` before choosing a hash width**, and read the answer as how many rows you are willing to lose.",
    "**Sequential ids have zero collision probability** — the birthday problem applies only to independent random draws."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "You have 40 million rows and deduplicate on a 32-bit hash. Roughly how many collisions should you expect?",
        options: [
          "Effectively zero — 2³² is four billion",
          "About 186 — the expected pairs is `n²/2N = (4×10⁷)²/(2×4.3×10⁹)`",
          "Exactly one",
          "About 40,000"
        ],
        answer: 1,
        why: "The comparison is `n²` against `N`, not `n` against `N`. At 0.0004% of the data the loss sits inside most teams' noise tolerance, which is why this design survives review and then silently drops rows for months."
      },
      {
        stem: "A family has two children and at least one is a girl. What is the probability both are girls?",
        options: [
          "1/2",
          "1/3 — the equally likely space is the four ordered pairs, of which three remain and one is GG",
          "1/4",
          "2/3"
        ],
        answer: 1,
        why: "\"One of each\" is two of the four ordered outcomes, so it is twice as likely as \"both girls\". Treating the three unordered outcomes as equally likely is the same error as treating dice sums 2 through 12 as equally likely."
      },
      {
        stem: "Three independent dependencies each fail with probability 0.5. What is the probability at least one fails?",
        options: [
          "1.5",
          "0.875 — that is `1 − 0.5³`; the naive sum of 1.5 is the union bound, which can exceed 1",
          "0.5",
          "0.125"
        ],
        answer: 1,
        why: "Adding probabilities assumes disjoint events, which independent failures are not. The union bound is still useful because it is always conservative and close for rare events — but it never warns you when it exceeds 1."
      },
      {
        stem: "How many random bits do you need for 10¹² ids with collision probability below 10⁻⁹?",
        options: [
          "40 bits — 10¹² is about 2⁴⁰",
          "About 101 bits — `log₂(n²/2q)`, roughly `2·log₂(n)` plus the budget term",
          "64 bits is always enough",
          "It depends on the hash function, not the bit count"
        ],
        answer: 1,
        why: "Bits scale as twice the log of the item count, so the space must be about the square of what intuition suggests. Every 10× growth in volume costs a further 6.6 bits — volume is the expensive term, not the budget."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "Why is 23 people enough for a 50% chance of a shared birthday?",
        strong: "Because the question is about any pair, and 23 people make 253 pairs — each with a 1/365 chance, giving an expected 0.69 collisions and so about a 50% chance of at least one. Intuition answers a different question, \"someone shares *my* birthday\", which needs 253 people.",
        answer: [
          { t: "p", text: "Naming the pair count is what makes the answer an explanation rather than a recited fact." },
          { t: "p", text: "Generalising to `√N` and applying it to hash widths shows you would use it, which is the point of asking." }
        ]
      },
      {
        level: "core",
        q: "When can you compute a probability as favourable outcomes over total outcomes?",
        strong: "Only when every outcome in the sample space is equally likely. That is a property of the space you chose, so the first move is to write the space down — usually the ordered version, which is nearly always the equally likely one.",
        answer: [
          { t: "p", text: "Treating \"equally likely\" as a claim to be checked rather than a default is the substance here." },
          { t: "p", text: "The dice-sums example — 7 is six times as likely as 2 — makes it concrete in one line." }
        ]
      },
      {
        level: "advanced",
        q: "How would you choose an id scheme for a high-volume event pipeline?",
        strong: "Compute `n²/2N` against a stated collision budget. For 5×10¹⁰ events, 64 bits gives a 6.8% chance of a collision and fails; 122 bits leaves thirteen orders of magnitude of margin. If ids can be coordinated, a counter has zero collision probability and the trade moves to leaking volume and order.",
        answer: [
          { t: "p", text: "Insisting on a stated budget before choosing a width is the engineering instinct being tested." },
          { t: "p", text: "Knowing that 64 bits actually fails at this volume is the concrete fact that separates a real answer from a plausible one." },
          { t: "p", text: "Raising the timestamp-plus-random shape shows you know why UUIDv7 exists rather than just that it does." }
        ]
      }
    ]
  }
});
