/* ============================================================================
   LESSON 4.4 — Polynomial Regression and the Bias–Variance Dial
   ========================================================================= */
EC.receiveLesson({
  id: "4.4",

  lede: "**Polynomial regression is linear regression on the columns x, x², …, xᵈ — linear in the parameters, curved in the input — and the degree d is the cleanest capacity dial in the course.** This lesson turns it from 1 to 20 on forty noisy points and records what happens: training error falls monotonically, test error bottoms out at degree 5 (0.102, against a noise floor of 0.09) and then climbs to 729 at degree 20, and the largest coefficient grows from 0.6 to 1,910. It shows why the climb is violent (Runge's phenomenon, and a condition number of 10⁴³ when you forget to scale), what tames it (ridge on the polynomial features turns degree 15's 0.244 into 0.119), and what replaces it for real curves — splines, which are piecewise low-degree polynomials with knots, and which extrapolate as a line rather than to −6,649.",

  objectives: [
    "Fit polynomial features through a pipeline and read a degree sweep as a bias–variance curve",
    "Explain Runge's phenomenon, the feature explosion C(p + d, d), and why scaling before powers is mandatory",
    "Tame a high degree with ridge and choose degree and penalty together by cross-validation",
    "Replace a global polynomial with splines, and know when a domain-engineered feature beats both"
  ],

  prerequisites: ["4.1", "4.3", "1.3"],

  blocks: [

    { t: "h2", n: "01", text: "The degree sweep", id: "sweep" },

    { t: "code", lang: "python", title: "y = sin(1.5x) + 0.3x + noise (sd 0.3), forty points on [−3, 3]; a 400-point test set from the same range (executed)",
      hl: [3, 7, 8, 12, 13, 14],
      code: `make_pipeline(StandardScaler(), PolynomialFeatures(d), LinearRegression())      # scale FIRST, then powers, then OLS
# degree   train MSE   test MSE   5-fold CV   max |coef|
#   1        0.559      0.564       0.651        0.58        <- a line through a sine wave: bias
#   2        0.557      0.565       0.679        0.58        <- x² adds nothing to an odd function
#   3        0.163      0.159       0.227        1.84
#   4        0.140      0.178       0.224        1.80
#   5        0.084      0.102       0.107        2.59        <- test minimum; noise floor is 0.09
#   6        0.083      0.105       0.117        2.59
#   8        0.079      0.104       0.169        2.82
#  10        0.071      0.125       0.440        3.66
#  12        0.070      0.124       4.648        6.44        <- CV explodes before the test set does: see below
#  15        0.069      0.244     880.662       13.0
#  20        0.062    728.893   1.8 × 10⁸     1,910         <- training error still falling; the model is now a disaster`,
      caption: "Three columns tell three stories. Training error falls forever — more powers can only fit the forty points better. Test error is the bias–variance curve of 1.3 made concrete: it falls while the added flexibility removes bias (degrees 1–5) and rises when it only fits noise (6 onwards). The coefficients are the variance made visible: a degree-20 fit needs terms of size 1,910 that cancel to within 0.3 of each other, and any new x breaks the cancellation."
    },

    { t: "viz",
      title: "The sweep as a validation curve (log scale on the error axis)",
      caption: "The gap between training and test error opens at degree 5 and never closes. The CV curve rises earlier and more steeply than the test curve because held-out folds contain points at the edges of the range, and that is where a high-degree polynomial swings hardest — cross-validation is measuring a little extrapolation.",
      svg: `<svg viewBox="0 0 880 300" role="img" aria-label="Line chart of training, test and cross-validated mean squared error against polynomial degree from 1 to 20 on a log scale; training error falls steadily, test error bottoms out at degree 5 and climbs off the chart at degree 20, and cross-validation error climbs off the chart from degree 15.">
  <g style="stroke:var(--line)" stroke-width="1"><line x1="70" y1="250" x2="840" y2="250"/><line x1="70" y1="30" x2="70" y2="250"/></g>
  <g class="s-sub">
    <text x="62" y="254" text-anchor="end">0.05</text><text x="62" y="199" text-anchor="end">0.5</text><text x="62" y="144" text-anchor="end">5</text><text x="62" y="89" text-anchor="end">50</text><text x="62" y="34" text-anchor="end">500</text>
    <text x="106" y="270">1</text><text x="220" y="270">4</text><text x="333" y="270">7</text><text x="444" y="270">10</text><text x="596" y="270">14</text><text x="785" y="270">19</text>
    <text x="430" y="292">degree</text>
  </g>
  <line x1="70" y1="236" x2="840" y2="236" style="stroke:var(--good)" stroke-width="1" stroke-dasharray="2 4"/>
  <polyline fill="none" style="stroke:var(--ink-3)" stroke-width="2" points="110,192 148,192 186,222 224,225 262,238 299,238 375,239 451,242 527,242 641,242 830,245"/>
  <polyline fill="none" style="stroke:var(--accent)" stroke-width="2.2" points="110,192 148,192 186,222 224,220 262,233 299,232 375,233 451,228 527,228 641,212 830,30"/>
  <polyline fill="none" style="stroke:var(--warn)" stroke-width="2" stroke-dasharray="5 4" points="110,189 148,188 186,214 224,214 262,232 299,230 375,221 451,198 527,142 641,30"/>
  <circle cx="262" cy="233" r="4.5" style="fill:var(--accent)"/>
  <g class="s-label" style="font-weight:600">
    <text x="690" y="258" style="fill:var(--ink-3)">train</text>
    <text x="690" y="205" style="fill:var(--accent)">test</text>
    <text x="545" y="120" style="fill:var(--warn)">5-fold CV</text>
  </g>
  <text x="272" y="222" class="s-sub" style="fill:var(--accent)">degree 5: test 0.102</text>
  <text x="720" y="232" class="s-sub" style="fill:var(--good)">noise floor 0.09</text>
  <text x="600" y="44" class="s-sub">test 729 and CV 1.8 × 10⁸ at degree 20 are off the chart</text>
</svg>`
    },

    { t: "dl", items: [
      ["Polynomial features", "The columns 1, x, x², …, xᵈ (and for several inputs, every product of total degree ≤ d). `PolynomialFeatures(degree)`; `interaction_only=True` keeps xᵢxⱼ and drops the pure powers."],
      ["Linear in the parameters", "ŷ = Φβ with Φ the expanded matrix; fitted by OLS on Φ, so everything in 4.1 and 4.2 applies to the expanded columns — including the SE, VIF and diagnostics."],
      ["Feature explosion", "p inputs at degree d give C(p + d, d) columns: p = 10, d = 3 → 286; p = 50, d = 3 → 23,426. This, not the maths, is the practical limit."],
      ["Runge's phenomenon", "A high-degree polynomial through equispaced points oscillates wildly near the ends of the range. Degree-15 interpolation of 1/(1 + 25x²) on 16 equispaced points has a maximum error of 2.1; on Chebyshev nodes, 0.083."],
      ["Spline", "A piecewise polynomial of low degree (usually cubic) joined smoothly at knots. Flexible where the data is, stable at the ends. `SplineTransformer(n_knots, degree, extrapolation=)`."],
      ["Validation curve", "Model score against one hyperparameter, train and test on the same axes. The degree sweep is one; `validation_curve` builds it."],
      ["Extrapolation", "Prediction outside the training range. A polynomial of degree d grows like xᵈ; a spline can be told to continue linearly or stay constant."]
    ]},

    { t: "h2", n: "02", text: "Why high degree fails: oscillation and conditioning", id: "failure" },

    { t: "code", lang: "text", title: "Two separate failures, both executed",
      code: `RUNGE (a property of polynomials, present even with zero noise):
  interpolate g(x) = 1 / (1 + 25x²) on [-1, 1] with a degree-15 polynomial
    through 16 equispaced points:   max |error| = 2.107      (the function's range is 0.04 to 1.0)
    through 16 Chebyshev nodes:     max |error| = 0.083      (nodes crowded toward the ends)
  the polynomial is exact at every node and swings by ±2 between the outer ones. More points do not help; a higher degree makes it worse.

CONDITIONING (a property of the columns, and entirely avoidable):
  x in [0, 1000], degree 8:   cond(ΦᵀΦ) on raw x = 3.8 × 10⁴³        x⁸ reaches 10²⁴ while x reaches 10³
                              cond(ΦᵀΦ) on standardised x = 5.4 × 10⁵
  raw fit training MSE 0.0449 vs scaled 0.0069 on the same data: the raw solve is numerically wrong, not merely unstable`,
      caption: "Runge is why 'just use a higher degree' fails even in principle: a single global polynomial cannot be flexible in the middle without swinging at the edges. Conditioning is why it fails in practice before that: powers of an unscaled variable span thirty orders of magnitude and the normal equations lose every digit. Scale first — always — and remember that the numerically clean alternative is an orthogonal polynomial basis, which is what `numpy.polynomial.chebyshev` gives you."
    },

    { t: "code", lang: "python", title: "Ridge tames degree 15 (executed); splines replace it (executed)",
      hl: [3, 5, 12, 13, 14],
      code: `make_pipeline(StandardScaler(), PolynomialFeatures(15), Ridge(alpha))
# alpha     train    test    max |coef|
#   0       0.069   0.244      13.0        <- OLS at degree 15
#   0.001   0.069   0.125       3.98
#   0.01    0.072   0.119       2.75       <- as good as the best degree, with 15 columns instead of 5
#   0.1     0.078   0.120       2.26
#   1       0.115   0.176       1.54
#  10       0.282   0.314       0.68       <- over-shrunk: bias again

make_pipeline(SplineTransformer(n_knots=k, degree=3), LinearRegression())
# knots    train    test    5-fold CV
#   5      0.085   0.105     0.116        <- matches degree 5's test error with no global polynomial at all
#   8      0.079   0.103     0.136
#  12      0.069   0.116     0.361
#  20      0.051   0.181     3,468        <- too many knots overfits exactly like too high a degree
# 20 knots + RidgeCV (alpha 0.23): test 0.128   <- and ridge rescues it exactly the same way`,
      caption: "Ridge on polynomial features is the second dial: the degree sets what the model *could* do, α sets how much of it the data is allowed to use. The two dials are partly interchangeable — a penalised degree 15 and an unpenalised degree 5 land within 0.02 of each other — which is why in practice you set the degree generously and tune α. Splines are the same trade with a better basis: knots instead of degree, local instead of global, and the same cure when overdone."
    },

    { t: "code", lang: "text", title: "Extrapolation: predict at x = 4 and 5 after training on [−3, 3] (truth 0.92 and 2.44; executed)",
      code: `polynomial degree 3:      x=4 -> -5.0       x=5 -> -12.9
polynomial degree 6:      x=4 -> 10.9       x=5 -> 60.7
polynomial degree 10:     x=4 -> -392.1     x=5 -> -6,648.6
cubic spline, 8 knots, extrapolation="linear":   x=4 -> -1.00     x=5 -> -1.79       (wrong, but bounded and continuous with the edge slope)`,
      caption: "Nothing here is right — the training data ends at 3 and the truth beyond it is unknowable to any model — but the polynomials are wrong by amounts that grow like xᵈ, in a direction determined by the sign of the top coefficient. A production model must refuse or clip inputs outside its training range (3.1's range check) and, if it must extrapolate, do so with something that continues linearly or flat: splines, trees (which are flat), or a linear tail."
    },

    { t: "h2", n: "03", text: "Several inputs: interactions, explosion and the spend model", id: "multi" },

    { t: "code", lang: "text", title: "How many columns you are about to create",
      code: `C(p + d, d) columns from p inputs at degree d           |    interaction_only=True at degree 2:  1 + p + C(p, 2)
p= 2  d=2:      6                                          |    p= 5:     16
p= 5  d=2:     21     d=3:     56                          |    p=10:     56
p=10  d=2:     66     d=3:    286                          |    p=20:    211
p=20  d=3:  1,771                                          |    p=50:  1,276
p=50  d=2:  1,326     d=3: 23,426                          |

each column is a coefficient to estimate; 23,426 columns from 863 rows is 4.3's p ≫ n regime, and only a penalty makes it fit at all.`,
      caption: "Degree 2 is affordable on tens of features and is where most of the value lives, because pairwise interactions are what an additive model misses. Degree 3 on fifty features is not a model; it is a memory problem. Above two inputs, a tree ensemble (6.2–6.4) finds interactions without enumerating them, which is why polynomial expansion is a low-p tool."
    },

    { t: "code", lang: "python", title: "The spend model, whose true form is fee × min(tenure, 12) × (1 − discount/100) + noise sd 8 (executed, 5-fold MAE, 863 rows)",
      hl: [2, 4, 6, 9, 10],
      code: `# linear on 5 features                                   20.90 ± 0.97      <- 4.1's model: additive, and the truth is multiplicative
# degree 2, all terms (21 columns)                      15.12 ± 1.00
# degree 2, interactions only                           20.15 ± 1.20      <- the pure square tenure² does most of the degree-2 work: it approximates the min(tenure, 12) bend
# degree 3 + RidgeCV (56 columns, alpha 1.27)           10.04 ± 0.72      <- the three-way product fee·tenure·discount is a degree-3 term
# degree 4 + RidgeCV                                     9.23 ± 1.06
# degree 5 + RidgeCV                                    10.57 ± 0.96      <- past the useful degree
# cubic spline on tenure (6 knots), others additive      9.94 ± 0.39      <- the bend, but not the products
# spline on tenure, then degree 2 + RidgeCV              6.74 ± 0.64      <- the bend AND the products: near the floor
# ONE engineered column fee·min(tenure,12)·(1−disc)      6.34 ± 0.33      <- the noise floor is 8·√(2/π) = 6.38
# largest degree-2 coefficients: monthly_fee 44.5, tenure² −22.0, tenure 18.5, discount −8.5, tenure×fee 5.8`,
      caption: "Read this bottom-up. The right single feature, written from knowledge of the pricing rule, hits the noise floor with one coefficient. A spline for the bend plus degree-2 products gets within 0.4 of it with no knowledge at all. A blind degree-3 polynomial with ridge gets to 10 — half the linear model's error — and needs 56 columns to do it. **Polynomial expansion is what you do when you do not know the functional form; it is never better than knowing it**, and its coefficients (tenure² = −22.0) are a clue to what the form is."
    },

    { t: "callout", kind: "tradeoff", title: "Degree, knots, α: which dial to turn", body: [
      { t: "p", text: "One input, smooth curve: **splines with 5–10 knots**, extrapolation set deliberately; polynomial degree ≤ 5 only if you need the closed form. One input, a bend or kink: **splines or a hand-placed hinge** — a global polynomial cannot make a corner and pays with oscillation. Few inputs, suspected interactions: **degree 2 plus ridge**, and read the interaction coefficients. Many inputs: **do not expand** — use a tree ensemble to find the interactions and, if a linear model is required, engineer the two or three that it finds. In every case scale first, tune degree/knots and α together by CV, and refuse inputs outside the training range." }
    ]},

    { t: "ladder",
      title: "Modelling a dose–response curve from 80 patients",
      rungs: [
        { level: "bad", label: "Degree 9 polynomial on raw dose (mg)", code: `LinearRegression().fit(PolynomialFeatures(9).fit_transform(dose_mg), response)`,
          note: "**Wrong twice**: dose⁹ in milligrams is a condition number of 10⁴⁰, and degree 9 through 80 points oscillates at the low and high doses — exactly the regions a clinician cares about." },
        { level: "ok", label: "Scaled, degree chosen by CV", code: `GridSearchCV(make_pipeline(StandardScaler(), PolynomialFeatures(), LinearRegression()), {"polynomialfeatures__degree": range(1, 8)}, cv=5)`,
          note: "**Numerically sound and honestly chosen**, but a global polynomial still cannot be flat at high doses (saturation) without being wrong somewhere else." },
        { level: "best", label: "Cubic spline with constant extrapolation, knots and α by CV", code: `GridSearchCV(make_pipeline(SplineTransformer(degree=3, extrapolation="constant"), Ridge()),
             {"splinetransformer__n_knots": [4, 6, 8, 12], "ridge__alpha": np.logspace(-3, 1, 9)}, cv=5)`,
          note: "**Local flexibility, a plateau where the biology has one, and a bounded answer above the tested dose** — with the confidence that comes from tuning both dials by CV." }
      ]
    },

    { t: "h2", n: "04", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Investigate",
      title: "A step the polynomial cannot make",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p", text: "Generate 60 points with truth f(x) = sign(x) + 0.2x on [−2, 2] and noise sd 0.3 — a slope with a jump at zero. **(a)** Sweep polynomial degrees 1–15 and cubic splines with 4, 8 and 16 knots; report 5-fold CV MSE and the MSE against the true curve on a fine grid, and explain why the two rankings disagree at high degree. **(b)** Over 200 fresh samples, decompose the error at x = 0.05 (beside the jump) and x = 1.5 (on the smooth part) into bias² and variance for degrees 1, 3, 9, 15 and the 8-knot spline. Which term dominates where, and what does that say about what capacity can and cannot buy? **(c)** Build the validation curve for OLS and for ridge with α = 0.01; report the best degree and the degree-15 CV error for each." }
      ],
      requirements: [
        "(a) the two tables, and the reason CV and grid-truth disagree.",
        "(b) bias² and variance at both points for all five models.",
        "(c) the two validation curves' minima and degree-15 values."
      ],
      hint: "(a) A shuffled fold can hold out the extreme x; the polynomial's error there is extrapolation. (b) Average the 200 predictions at each point: bias² = (mean − truth)², variance = spread. (c) `validation_curve(..., param_name=\"polynomialfeatures__degree\", param_range=range(1, 16))`.",
      solution: {
        lang: "python",
        title: "step_polynomial.py (executed)",
        code: `f = lambda x: np.where(x < 0, -1.0, 1.0) + 0.2 * x
# (a)                            5-fold CV MSE     MSE vs truth on grid
#   degree  1                       0.329               0.252
#   degree  3                       0.244               0.144
#   degree  7                       0.218               0.081       <- CV minimum among polynomials
#   degree  9                       1.570               0.068
#   degree 15                      84.396               0.065       <- grid error still falling, CV catastrophic
#   spline  4 knots                 0.212               0.093
#   spline  8 knots                 0.192               0.055       <- best on both
#   spline 16 knots                 0.264               0.046
# CV and grid-truth disagree because the grid is the interior of the range while shuffled folds hold out edge points:
# a degree-15 fit's interior is fine and its ends are Runge swings, and CV sees the ends. CV is the honest one --
# a deployed model will be asked about the edges.

# (b) 200 resamples                x = 0.05 (beside the jump)        x = 1.5 (smooth part)
#   degree  1                      bias² 0.921  var 0.006            bias² 0.018  var 0.011
#   degree  3                      bias² 0.848  var 0.015            bias² 0.030  var 0.009
#   degree  9                      bias² 0.648  var 0.043            bias² 0.010  var 0.023
#   degree 15                      bias² 0.484  var 0.070            bias² 0.000  var 0.058
#   spline 8 knots                 bias² 0.576  var 0.040            bias² 0.002  var 0.019
# beside the jump, bias² dominates for every model and falls only slowly with degree: a continuous basis cannot make a
# discontinuity, and no amount of capacity buys it -- only a feature that knows where the jump is (a hinge, an indicator x > 0).
# on the smooth part, bias is gone by degree 9 and variance is all that grows: capacity bought exactly what it can buy.

# (c) validation curve          best degree     CV MSE at best     CV MSE at degree 15
#   OLS                             7              0.218              84.396
#   ridge alpha 0.01                7              0.239               0.861
# same optimum; ridge makes the wrong side of it survivable, which is what you want when the degree is chosen automatically.`,
        notes: [
          { t: "p", text: "**(a) is a lesson about the validation set, not the model**: two reasonable ways to measure error rank the models differently because one includes the edges. The edges are real; trust CV." },
          { t: "p", text: "**(b) is the bias–variance trade with the decomposition actually computed**: at the jump, degree 15 has cut bias² from 0.92 to 0.48 and bought 0.07 of variance; a step feature would make bias² zero at no variance cost. Some bias is a *basis* problem, and the fix is a feature (3.4), not a dial." },
          { t: "p", text: "**(c)**: ridge does not move the best degree; it flattens the cliff after it — the argument for always pairing a capacity dial with a penalty." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "Degree 15 has training MSE 0.069 and test MSE 0.244; ridge with α = 0.01 on the same 15 columns gives 0.072 and 0.119. What did the penalty change?",
          options: [
            "It reduced the degree",
            "It capped the coefficients (13.0 → 2.75), which are the variance: the OLS fit needs large cancelling terms to thread the noise, and the penalty forbids them, so the model keeps the degrees of freedom the data supports and gives up the rest",
            "It removed the noise",
            "It scaled the features"
          ],
          answer: 1,
          why: "Degree sets the capacity; α sets how much of it is used. Ridge's effective degrees of freedom Σd²/(d² + α) is the honest count."
        }
      ]
    }
  ],

  takeaways: [
    "**Polynomial regression is OLS on x, x², …, xᵈ — linear in β, curved in x**; everything from 4.1–4.3 applies to the expanded columns.",
    "**The degree sweep is the bias–variance curve**: train 0.559 → 0.062 monotonically; test 0.564 → 0.102 at degree 5 → 729 at degree 20; coefficients 0.6 → 1,910.",
    "**Runge**: a global polynomial through equispaced points swings at the ends (error 2.1 vs 0.083 on Chebyshev nodes); higher degree makes it worse.",
    "**Scale before powers**: cond 10⁴³ raw versus 10⁵ scaled, and a numerically wrong fit.",
    "**Ridge tames degree**: degree 15 test 0.244 → 0.119 at α = 0.01; set the degree generously, tune α.",
    "**Splines are the grown-up polynomial**: piecewise cubic with knots, local flexibility, bounded extrapolation; overdone knots overfit and ridge rescues them the same way.",
    "**Polynomials extrapolate like xᵈ** (−6,649 at x = 5); refuse or clip out-of-range inputs.",
    "**C(p + d, d) columns**: 286 at p = 10, d = 3; 23,426 at p = 50 — degree 2 is where interactions live and the practical limit.",
    "**Spend model**: linear 20.9 → degree 3 + ridge 10.0 → spline + degree 2 6.74 → the one true engineered column 6.34 (floor 6.38). Expansion is what you do when you do not know the form.",
    "**Some bias is a basis problem**: at a jump, degree 15 still has bias² 0.48; a step feature has none."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "Is polynomial regression a linear or a non-linear model?",
        options: [
          "Non-linear: it fits curves",
          "Linear in the parameters and non-linear in the input: ŷ = β₀ + β₁x + β₂x² + … is a linear combination of fixed transformations of x, so it is solved by OLS on the expanded design matrix and inherits OLS's closed form, inference and diagnostics",
          "Non-linear: it uses gradient descent",
          "Linear only at degree 1"
        ],
        answer: 1,
        why: "'Linear model' means linear in β. The same is true of splines, Fourier bases and any fixed feature map."
      },
      {
        stem: "Why did the 5-fold CV error explode at degree 12 (4.6) while the test error was still 0.124?",
        options: [
          "CV is unreliable",
          "Shuffled folds hold out points at the edges of the range, and a degree-12 polynomial fitted without them swings there (Runge); CV is measuring a little extrapolation that the interior-heavy test set averages away. CV is the honest one — a deployed model is asked about the edges",
          "The test set was larger",
          "The folds were not shuffled"
        ],
        answer: 1,
        why: "The exercise shows the same divergence: degree 15's CV MSE of 84 against a grid-truth MSE of 0.065."
      },
      {
        stem: "What does `PolynomialFeatures(3)` produce from 50 inputs, and what follows?",
        options: [
          "150 columns",
          "C(53, 3) = 23,426 columns — far more than the rows, so only a penalised fit exists at all, and each column is a coefficient to estimate; above a handful of inputs, expansion is the wrong tool and a tree ensemble finds interactions without enumerating them",
          "50 columns cubed",
          "2,500 columns"
        ],
        answer: 1,
        why: "Degree 2 on 50 inputs is already 1,326 columns. The combinatorics, not the maths, is the limit."
      },
      {
        stem: "Why did one engineered column beat a 56-column degree-3 polynomial on the spend model (MAE 6.34 versus 10.04)?",
        options: [
          "The polynomial was underfitted",
          "The true form is a product with a kink, fee × min(tenure, 12) × (1 − discount); the engineered column *is* that form, so a single coefficient reaches the noise floor, while a polynomial approximates the kink with a curve and the product with many cross-terms — expansion is what you do when you do not know the form, and it is never better than knowing it",
          "The polynomial needed a higher degree",
          "Ridge shrank it too much"
        ],
        answer: 1,
        why: "The polynomial's coefficients — tenure² at −22, tenure × fee at 5.8 — are the clue to the form, which is their best use."
      },
      {
        stem: "A stakeholder asks for the model's prediction at a dose 40 % above the largest tested. What do you say?",
        options: [
          "Report the polynomial's value",
          "That no model trained on the range can know the answer, that a polynomial's guess grows like xᵈ in an arbitrary direction (degree 10 gave −6,649 two units past the range), and that if an answer must be given it should come from a model with bounded extrapolation — a spline with constant or linear tails — labelled as an extrapolation",
          "That splines extrapolate correctly",
          "Refuse to answer"
        ],
        answer: 1,
        why: "Bounded, labelled and hedged beats confidently absurd; the range check from 3.1 belongs in the serving path."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "How do you choose the degree of a polynomial regression, and why does a high degree overfit?",
        strong: "By cross-validation, reading the validation curve — training error against test error as degree increases. On forty noisy points from a sine wave the training error fell monotonically from 0.56 to 0.06 while the test error bottomed at degree 5, at 0.10 against a noise floor of 0.09, and then rose to 729 at degree 20. High degree overfits because each extra power is another direction the fit can bend to pass through noise; the coefficients grow enormous — 1,910 at degree 20 — and cancel to within the noise on the training points, and any new x breaks the cancellation. There is also a purely mathematical failure, Runge's phenomenon: a global polynomial through equispaced points swings at the edges even with no noise at all. In practice I scale first, set the degree generously, add a ridge penalty and tune α — which turned degree 15's test error from 0.24 to 0.12 — or I use splines, which are local and do not swing.",
        answer: [
          { t: "p", text: "Validation curve with numbers, the coefficient explanation, Runge, and the two practical cures." }
        ]
      },
      {
        level: "core",
        q: "Polynomial regression versus splines — when would you use which?",
        strong: "Both are linear models on a fixed basis. A polynomial is one global curve: every coefficient affects every x, so making it flexible in the middle makes it swing at the ends and extrapolate like xᵈ — degree 10 predicted −6,649 two units past the training range. A spline is piecewise low-degree polynomials joined smoothly at knots, so its flexibility is local and its extrapolation can be set to linear or constant. On a sine wave a five-knot cubic spline matched the best polynomial's test error; on a step function it beat every polynomial because it can bend sharply near a knot. I use a low-degree polynomial when I need the closed form or the interaction terms — degree 2 across several inputs is where pairwise interactions live — and splines for any one-dimensional curve, especially one with a bend, a plateau or a need to extrapolate sanely. And for many inputs I use neither: a tree ensemble finds interactions without the combinatorial expansion.",
        answer: [
          { t: "p", text: "Global versus local, extrapolation, the executed comparisons, and the many-input escape hatch." }
        ]
      },
      {
        level: "advanced",
        q: "You are told a model is 'too biased' at a particular input. When does adding capacity fix it and when does it not?",
        strong: "It fixes it when the bias is a smoothness limitation of the basis at a point the basis can in principle represent. On the smooth part of a step-plus-slope target, degree 9 had bias² of 0.01 and degree 15 of 0.000 — capacity bought exactly what it should. Beside the jump, bias² fell only from 0.92 at degree 1 to 0.48 at degree 15 while variance rose sevenfold, because a continuous basis cannot represent a discontinuity: every polynomial and every spline is smooth, and the residual bias is a property of the basis, not of the degree. The fix there is a feature that knows where the jump is — an indicator for x > 0 or a hinge — which removes the bias at no variance cost. So when I see stubborn bias I ask whether the basis can represent the truth at all, and if not I change the basis, not the dial. The same reasoning says a multiplicative target wants a product feature, not degree 3: on the spend model one engineered column reached the noise floor where 56 polynomial columns did not.",
        answer: [
          { t: "p", text: "Basis bias versus capacity bias, with the decomposition numbers and the feature-engineering resolution." }
        ]
      }
    ]
  }
});
