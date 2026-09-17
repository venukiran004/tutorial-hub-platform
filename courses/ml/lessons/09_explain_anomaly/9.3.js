/* ============================================================================
   LESSON 9.3 — Explaining Deep Models and Serving Explanations
   ========================================================================= */
EC.receiveLesson({
  id: "9.3",

  lede: "**A deep network has no coefficients, no splits and no coalitions cheap enough to enumerate — what it has is a gradient, and every explanation method for deep models is a way of turning gradients into an attribution over the input.** This lesson builds the classic failure these methods exist to catch: a small CNN trained on handwritten digits where every '3' in training carries a bright corner patch. The model scores 79 % on clean digits, recognises 0 % of unmarked threes, and calls 42 % of *any* image a '3' once the patch is added — a shortcut, learned perfectly. Grad-CAM puts 11 % of its heat next to the patch on a marked three and 0 % on a clean one; integrated gradients, which satisfy a completeness check to 0.06, put 29 % of the attribution mass on the four patch pixels. Retraining with the patch decorrelated from the label brings the shortcut down to 0.9 %. Attention weights are shown *not* to be attributions on a four-token example (85 % of the attention on a token whose contribution is negative), and the lesson closes with explanations as a service: 0.25 ms per TreeSHAP request, a 70 % cache hit rate, and a SHAP-drift monitor that catches a halved feature before anyone reads a dashboard.",

  objectives: [
    "Explain Grad-CAM, integrated gradients and LRP as ways of attributing a deep model's output to its input, and state what each guarantees",
    "Use explanations to find a spurious correlation, and verify the fix with the same tools",
    "Explain why attention weights are not attributions",
    "Design an explanation API with batching, caching and drift monitoring on the explanations themselves"
  ],

  prerequisites: ["9.2", "11.6", "8.5"],

  blocks: [

    { t: "h2", n: "01", text: "Gradients as explanations", id: "gradients" },

    { t: "code", lang: "text", title: "Three gradient-based attributions",
      code: `SALIENCY / GRADIENT × INPUT      attribution_i = x_i · ∂F/∂x_i          one backward pass; the local slope. Cheap, noisy, and blind to saturation:
                                 a ReLU unit the model has already 'used' can have zero local gradient although the feature drove the output.

INTEGRATED GRADIENTS (IG)        IG_i = (x_i − x'_i) ∫₀¹ ∂F(x' + α(x − x')) / ∂x_i dα        the gradient accumulated along a straight path from a baseline x' to x
                                 completeness: Σ IG_i = F(x) − F(x')            the attributions add up to the change in output from the baseline -- the axiom SHAP has (9.2)
                                 in practice a Riemann sum over 50-300 steps; the baseline (black image, zero vector, a blurred input) is a choice, as in SHAP.

GRAD-CAM (convolutional nets)    for the class score y^c and the last convolutional feature maps A^k (k channels):
                                 α_k = mean over positions of ∂y^c / ∂A^k         (how much each channel matters for the class)
                                 L = ReLU( Σ_k α_k A^k )                            (a coarse map at the feature-map resolution, upsampled onto the image)
                                 answers 'where in the image is the evidence for class c'; nothing about which pixels within the region.

LRP                              propagate the output backward layer by layer with conservation: Σ relevance in = Σ relevance out at every layer;
                                 rules (LRP-0, ε, γ) decide how a neuron's relevance is split among its inputs. Exact conservation, rule-dependent results.

ATTENTION WEIGHTS                what a transformer 'looks at' when forming a representation. Not an attribution: no completeness, no sensitivity guarantee.`,
      caption: "The gradient is the one thing every differentiable model gives for free, and the methods differ in how they tame it: IG integrates it along a path so saturation cannot hide a feature and the attributions add up; Grad-CAM averages it over space to weight feature maps, giving a coarse 'where'; LRP replaces gradients with conservation rules. All are model-specific, all need a backward pass or a few hundred, and all explain the model."
    },

    { t: "dl", items: [
      ["Baseline", "The reference input from which attribution is measured (zeros, a blank image, a mean). IG and SHAP values are relative to it; a different baseline is a different explanation."],
      ["Completeness", "Σ attributions = F(x) − F(baseline). IG and SHAP satisfy it (IG: 11.561 against 11.624 with 200 steps); plain gradients and Grad-CAM do not."],
      ["Saturation", "A ReLU network's local gradient is zero for units that are off and constant for units that are on; a feature that pushed a unit into saturation can show no gradient at all. Path methods (IG) avoid it."],
      ["Spurious correlation", "A feature that predicts the label in the training data for reasons that will not hold elsewhere — a watermark, a hospital's scanner tag, a background. The model learns it because it is easier than the real signal."],
      ["Shortcut learning", "The model's preference for the spurious feature over the intended one when both predict the label; detected by explanations and by tests where the shortcut is removed or added."],
      ["Explanation drift", "A change over time in the distribution of attributions — mean SHAP per feature, the share of predictions where each feature is the top contributor — that signals input drift or a broken feature before accuracy can be measured."]
    ]},

    { t: "h2", n: "02", text: "A shortcut, found and fixed", id: "shortcut" },

    { t: "code", lang: "python", title: "A CNN on 8 × 8 digits, with a 2 × 2 corner patch on every training '3' (executed)",
      hl: [3, 4, 5, 9, 10, 11, 14, 15, 16],
      code: `# conv(1->16) -> ReLU -> conv(16->32) -> ReLU -> global average pool -> linear(32->10);  40 epochs of Adam on 1,257 images
# the patch: pixels [0:2, 6:8] set to 1.0 on all 128 training threes, and on 2 % of the other classes
#   clean test accuracy                                     0.793
#   true threes WITHOUT the patch classified as '3'          0.000     <- the model has no other way of recognising a three
#   the patch added to EVERY test image: predicted '3' for  42.4 %     (true share of threes 10.2 %)

# Grad-CAM for class 3, last conv layer (8 × 8 map)
#   a marked three:   10.7 % of the map's mass in the top-right 2 × 2;  27 % in the central 4 × 4      <- heat next to the patch AND on the digit
#   the same three, clean:   0.0 % top-right;  30 % central
#   a SEVEN with the patch, asked about class 3: predicted class 3; 7.8 % of the heat top-right       <- the patch alone earns the class

# integrated gradients for class 3 on the marked three (baseline: black image, 200 steps)
#   completeness: Σ IG = 11.561  vs  F(x) − F(baseline) = 11.624
#   28.6 % of the total |IG| sits on the four patch pixels; the two largest attributions are pixels (0, 6) and (1, 6) -- inside the patch
#   gradient × input (one backward pass): 26.5 % on the patch -- agrees here; it would not on a saturated unit`,
      caption: "The accuracy alone would have shipped this model: 79 % on clean digits is poor but plausible for a tiny network. The two tests that reveal the shortcut are behavioural — remove the cue and threes vanish, add it and everything becomes a three — and the two attributions point at the same four pixels from different directions: Grad-CAM's heat leans toward the corner on marked images and not on clean ones, and IG assigns the corner nearly a third of the output. An explanation is a hypothesis generator; the behavioural test is the proof."
    },

    { t: "code", lang: "python", title: "The fix, and the check (executed)",
      code: `# retrain with the patch placed on 8 % of images of EVERY class -- present in the data, uncorrelated with the label
#   the patch added to every test image: predicted '3' for 0.9 %      (was 42.4 %)
#   Grad-CAM for class 3 on a marked three: 27 % of the heat top-right, 3 % central
#   -- the retrained model still 'sees' a bright patch as salient input; it no longer decides on it. Saliency is not reliance: the behavioural
#      test says the shortcut is gone, the map says the pixels are still conspicuous. Read them together.`,
      caption: "The cure for a shortcut is data in which the shortcut does not predict the label — augmentation, collection, or explicit decorrelation — and the same explanation and behaviour tests then confirm the cure. The last line is a caution about reading heatmaps: a bright patch is a strong input to any convolution, and a map can light it up without the decision depending on it. The behavioural test (0.9 %) is what says the model has stopped using it."
    },

    { t: "callout", kind: "insight", title: "Where shortcuts come from, and the tests that find them", body: [
      { t: "p", text: "Every real version of the corner patch: a hospital's pen mark on X-rays of the sicker ward; a photographer's watermark on one class of stock image; the word 'not' in reviews collected from one site; the background (snow for huskies, grass for wolves); the acquisition channel encoded in a customer id. The tests are the same every time — **remove** the suspected cue and watch the class disappear; **add** it and watch the class appear; **attribute** with Grad-CAM or IG and see where the mass sits; **slice** the evaluation by the cue's presence. And the detector that runs without a hypothesis is a per-slice error analysis (2.6) that flags any slice the model is suspiciously good at." }
    ]},

    { t: "h2", n: "03", text: "Attention is not attribution", id: "attention" },

    { t: "code", lang: "python", title: "Four tokens, one attention head, one linear readout (executed)",
      hl: [3, 4, 5],
      code: `# one-hot token embeddings; query q = (3, 0, 0.5, 0) favours token 0; the readout h = (0, 0, 2, 1) reads dimensions 2 and 3 only
# output = h · Σ_t attention_t · embedding_t
#   attention weights:      token 0: 0.846    token 1: 0.042    token 2: 0.069    token 3: 0.042
#   gradient × input:       token 0: −0.460   token 1: 0.000    token 2: +0.202   token 3: +0.042
#   the model 'looks at' token 0 with 85 % of its attention; token 0's own value contributes nothing through the readout (h has zero weight
#   on its dimension), and raising it only starves the tokens that do contribute -- its attribution is NEGATIVE. Token 2, with 7 % of the
#   attention, carries the output.`,
      caption: "Attention weights say where the model gathered its representation from; the output depends on what it did with what it gathered, which the weights do not encode. Attention maps are useful for reading a transformer's mechanics and useless as a statement of which tokens drove a prediction — for that, use gradient-based attribution (IG over the embeddings, or attention rollout combined with gradients), which passes the completeness check attention never took."
    },

    { t: "h2", n: "04", text: "Explanations as a service", id: "serving" },

    { t: "code", lang: "python", title: "Latency, batching, caching (executed; the churn TreeSHAP explainer)",
      hl: [2, 3, 5, 6],
      code: `# TreeSHAP on one row per request:  0.25 ms / row            batch of 297 rows: 7.2 ms = 0.024 ms / row      <- 10× cheaper per row in batches
# the explainer is built once at start-up (TreeExplainer(model)); rebuilding it per request would dominate
# cache keyed on a hash of the (rounded) feature vector:  200 requests over 60 distinct rows -> 140 hits (70 %), 60 explanations computed
# response = {prediction, base_value, contributions: {feature: φ}, model_version, explainer_version, baseline_id}      <- the baseline is part of the contract`,
      caption: "TreeSHAP is cheap enough to serve synchronously; KernelSHAP (hundreds of model calls per row) and IG (hundreds of backward passes) are not, and belong in a batch job or an asynchronous endpoint with a cache in front. Whatever the method, the response must say which model, which explainer and which baseline produced it, because a SHAP value without its baseline is a number without units — and the next model version will change every one."
    },

    { t: "code", lang: "python", title: "Monitoring the explanations, not just the predictions (executed)",
      hl: [3, 4, 5, 7, 8],
      code: `# mean SHAP per feature, training slice vs a new batch (the test slice):   logins −0.011 -> −0.041     tenure +0.001 -> +0.001     fee +0.011 -> −0.010      (ordinary noise)
# a simulated upstream fault: the logins feature arrives HALVED (a tracking bug, or a real change in behaviour)
#   mean SHAP(logins)              −0.041  ->  +0.714
#   mean predicted P(churn)         0.153  ->   0.250
#   share of rows where logins is the top contributor    0.46  ->  0.62
# the explanation drift fires immediately; the accuracy alarm cannot fire until labels arrive, weeks later`,
      caption: "Prediction monitoring (11.1) watches the score distribution; explanation monitoring watches *why* the scores moved, and it localises the cause to a feature the moment the batch is scored. Track per feature: the mean and spread of its SHAP values, and how often it is the top contributor; alert on shifts relative to the training slice; and keep the base value across retrains as a check that the reference point has not silently moved. The same dashboard answers the audit question 'has the model started relying on something new'."
    },

    { t: "table",
      head: ["Method", "Model", "Guarantee", "Cost", "Answers", "Beware"],
      rows: [
        ["Gradient × input", "Any differentiable", "None", "1 backward pass", "Local sensitivity per input", "Saturation; noise"],
        ["Integrated gradients", "Any differentiable", "Completeness, sensitivity", "50–300 backward passes", "Per-input attribution relative to a baseline", "Baseline choice; straight-path artefacts"],
        ["Grad-CAM", "CNNs (last conv layer)", "None", "1 backward pass", "Where in the image the class evidence is", "Coarse; a bright input can be salient without being used"],
        ["LRP", "Layered nets with suitable rules", "Conservation per layer", "1 modified backward pass", "Per-input relevance", "Rule-dependent; implementation effort"],
        ["Attention", "Transformers", "None", "Free", "Where the representation was gathered from", "Not an attribution (85 % attention, negative contribution)"],
        ["DeepSHAP / KernelSHAP", "Any", "Shapley axioms (approx.)", "Hundreds of forward passes", "Shapley attribution", "Cost; background choice"]
      ]
    },

    { t: "ladder",
      title: "Shipping a medical-image classifier with explanations",
      rungs: [
        { level: "bad", label: "Report AUC; show a Grad-CAM for the demo", code: `cam = GradCAM(model, target_layers=[model.layer4[-1]])(input_tensor)      # one pretty heatmap`,
          note: "**The AUC would have passed the corner-patch model too.** One heatmap on one image proves nothing about what the model relies on across the dataset." },
        { level: "ok", label: "Grad-CAM and IG on a sample; slice evaluation by scanner, site and marking", code: `attributions for 200 images per class; mean attribution mass outside the anatomical region; AUC per site and per scanner (2.6)`,
          note: "**A hypothesis generator and a per-slice test.** If the mass sits on a corner or a caption, or one site is suspiciously easy, the shortcut is found before deployment." },
        { level: "best", label: "Behavioural tests in CI, decorrelated training data, explanation monitoring in production", code: `# CI: remove-the-cue and add-the-cue tests for every known artefact (site tags, markers, borders); attribution-mass-outside-region threshold
# data: augmentation and collection that break the artefact-label correlation (0.9 % vs 42.4 %)
# production: per-site attribution drift; base-value stability across retrains; explanations logged with model and baseline version`,
          note: "**The shortcut is tested for, trained against, and watched for** — which is the only combination that keeps a deep model honest after the demo." }
      ]
    },

    { t: "h2", n: "05", text: "Practice", id: "practice" },

    { t: "exercise",
      kind: "Investigate",
      title: "Plant a shortcut, find it two ways, fix it, and design the monitor",
      difficulty: "advanced",
      minutes: 34,
      body: [
        { t: "p", text: "**(a)** Reproduce the corner-patch experiment with the patch on 50 % rather than 100 % of training threes; report clean accuracy, accuracy on unmarked threes, the add-the-patch rate, and the IG mass on the patch — and explain the pattern relative to the 100 % case. **(b)** Compute integrated gradients for the marked three with two baselines — a black image and the mean training image — and report the completeness check and the patch's attribution share for each. **(c)** Write the monitoring specification for the churn explanation service: which statistics per feature, computed on what window, compared with what reference, with what alert rule; and state what the alert would have said when logins halved." }
      ],
      requirements: [
        "(a) four numbers and the explanation.",
        "(b) two completeness checks and two patch shares.",
        "(c) a specification with statistics, window, reference, rule, and the worked alert."
      ],
      hint: "(a) A weaker shortcut leaves room for the shape; the model may learn both. (b) IG's baseline is x′ in the formula; the mean image is a common alternative to black. (c) Use the executed numbers: −0.041 → +0.714, 0.46 → 0.62.",
      solution: {
        lang: "python",
        title: "deep_explanation_practice.py",
        code: `# (a) executed, patch on 50 % of training threes:
#   clean test accuracy 0.885 (100 % cue: 0.793);  unmarked threes recognised 0.727 (was 0.000);  add-the-patch rate 21.1 % (was 42.4 %);
#   IG mass on the patch 19.8 % (was 28.6 %); Grad-CAM top-right share on a marked three 17.9 %, and a marked SEVEN is now predicted 7.
#   with the patch predicting the label only half the time, the shape is worth learning too, so the network learns both: the shortcut is
#   weaker on every measure and harder to see -- a shortcut's strength is relative to the intended signal, and partial cues are the real kind.

# (b) executed, the same marked three, 200 steps:
#   black baseline:       Σ IG = −1.522  vs  F(x) − F(black) = −1.529;   patch share 19.8 %      (the class-3 logit at an all-black image is
#                         HIGHER than at this image, so the attribution sums to a negative change -- completeness holds regardless of sign)
#   mean-image baseline:  Σ IG = 9.422   vs  F(x) − F(mean)  = 9.438;    patch share 25.5 %
#   two baselines, two attributions of the same prediction: 'this pixel vs off' against 'this pixel vs typical'. Both complete; both must
#   state the baseline. The mean image has ≈ 0 in the corner, so the patch's share moves less than the stroke pixels' shares do.

# (c) specification
#   statistics per feature, per scoring batch (hourly, or per 1,000 rows):  mean SHAP, sd of SHAP, share of rows where the feature is the top |SHAP|;
#   plus the base value and the mean prediction.
#   reference: the same statistics on the training slice (or the last validated week), refreshed at each retrain.
#   alert rule: |mean SHAP − reference| > 3 × the reference's batch-to-batch sd for that feature, OR top-contributor share moves by > 0.10,
#   OR mean prediction moves by > 0.05 absolute -- any one fires; two together page.
#   the worked alert when logins halved:  'logins_30d: mean SHAP +0.714 vs reference −0.041 (batch sd ≈ 0.03: 25 sd); top-contributor share
#   0.62 vs 0.46; mean P(churn) 0.250 vs 0.153. Cause localised to logins_30d; check the upstream feature pipeline before trusting the batch.'`,
        notes: [
          { t: "p", text: "**(a)** shows that shortcut strength is relative, which is why real shortcuts — partial, mixed with true signal — are harder to find than the planted one." },
          { t: "p", text: "**(b)** is the baseline lesson again: completeness holds for any baseline, and the numbers are meaningful only with the baseline attached." },
          { t: "p", text: "**(c)** turns a demonstration into an operating rule; the halved-logins case is the template for every alert the monitor will raise." }
        ]
      }
    },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "The model scored 79 % on clean digits and 0 % on unmarked threes. Which explanation method proved the shortcut, and which test?",
          options: [
            "Grad-CAM proved it by itself",
            "No explanation method proved it; they pointed at it — Grad-CAM put heat next to the patch on marked threes and none on clean ones, IG put 29 % of the attribution on the four patch pixels. The proof was behavioural: removing the patch made threes unrecognisable and adding it made 42 % of all images 'threes'. Explanations generate the hypothesis; the remove/add test confirms it",
            "Integrated gradients proved it via completeness",
            "Accuracy on the clean test set proved it"
          ],
          answer: 1,
          why: "After the fix the heatmap still lit the patch while the behaviour showed the model no longer decided on it — saliency and reliance are different things."
        }
      ]
    }
  ],

  takeaways: [
    "**Deep explanations are gradients, tamed**: gradient × input (cheap, saturates), integrated gradients (path from a baseline; completeness Σ IG = F(x) − F(x′), 11.561 vs 11.624), Grad-CAM (channel weights from mean gradients: a coarse 'where'), LRP (conservation rules).",
    "**A planted shortcut**: patch on every training three → 79 % clean accuracy, 0 % of unmarked threes recognised, 42 % of any image called a three with the patch.",
    "**Explanations point, tests prove**: Grad-CAM 10.7 % heat by the patch (marked) vs 0 % (clean); IG 29 % of mass on the patch; the remove/add behavioural tests are the evidence.",
    "**The fix is decorrelated data** (patch on 8 % of all classes → 0.9 %); re-check with both explanations and behaviour, because a bright input can stay salient without being used.",
    "**Attention is not attribution**: 85 % of the attention on a token with a negative contribution; use gradient methods over embeddings for 'which tokens mattered'.",
    "**Baselines are part of the explanation** for IG as for SHAP; report them.",
    "**Serve explanations with the explainer built once, batched (0.25 → 0.024 ms/row), cached (70 % hits), and versioned** with model, explainer and baseline ids.",
    "**Monitor the explanations**: mean and spread of SHAP per feature, top-contributor share, base value across retrains — a halved feature moved its mean SHAP from −0.04 to +0.71 and its top-share from 0.46 to 0.62 immediately, weeks before labels could.",
    "**Shortcuts come from artefacts correlated with labels** — marks, watermarks, sites, backgrounds — and per-slice evaluation finds them without a hypothesis.",
    "**Every method explains the model**; the world is a separate question."
  ],

  quiz: {
    title: "Knowledge check",
    questions: [
      {
        stem: "How does integrated gradients work, and what does completeness guarantee?",
        options: [
          "It averages the gradient over random noise; completeness means the sum is one",
          "It integrates the gradient of the output with respect to each input along a straight path from a baseline x′ to the input x, and scales by (x − x′); in practice a Riemann sum over a few hundred steps. Completeness guarantees the attributions sum to F(x) − F(x′) (11.561 vs 11.624 at 200 steps), so no contribution is lost to saturation as it can be for a single local gradient — and every value is relative to the chosen baseline",
          "It multiplies the gradient by the input; completeness means it is exact",
          "It backpropagates relevance with conservation; completeness is the conservation rule"
        ],
        answer: 1,
        why: "The path is what defeats saturation: a unit that is flat at x may have had a gradient somewhere along the way from the baseline."
      },
      {
        stem: "What does Grad-CAM show, and what does it not show?",
        options: [
          "Which pixels drove the prediction, exactly",
          "A coarse map at the last convolutional layer's resolution of where the evidence for a class lies: channel maps weighted by the mean gradient of the class score and passed through a ReLU. It does not attribute to individual pixels, has no completeness guarantee, and can light up a conspicuous input the model no longer decides on — after the fix the patch still drew 27 % of the heat while the behavioural test showed 0.9 % reliance",
          "The attention weights of a CNN",
          "The pixels whose removal changes the class"
        ],
        answer: 1,
        why: "Grad-CAM is the fast 'where' for images; IG or occlusion tests supply the 'which' and the 'how much'."
      },
      {
        stem: "Why are attention weights not a valid explanation of a transformer's prediction?",
        options: [
          "Because they are not normalised",
          "Because they describe where the representation was gathered from, not how the gathered content affected the output; a token can receive most of the attention while its value contributes nothing or negatively through the readout — 85 % attention and a −0.46 contribution in the four-token example, with the output carried by a token at 7 %. Attention has no completeness or sensitivity guarantee; gradient-based attribution over the embeddings does",
          "Because attention is computed before the softmax",
          "Because multiple heads disagree"
        ],
        answer: 1,
        why: "Attention rollout with gradients, or IG over embeddings, answers the attribution question attention weights cannot."
      },
      {
        stem: "How would you detect a spurious correlation in an image classifier before deployment?",
        options: [
          "By checking that test accuracy is high",
          "By attributing (Grad-CAM, IG) on a sample per class and measuring the attribution mass outside the region that should matter; by slicing evaluation by site, scanner, marker or any artefact the pipeline knows about; and by behavioural tests — remove the suspected cue and see the class vanish (0 % on unmarked threes), add it and see the class appear (42 %). Explanations generate the hypothesis; the behavioural test and the slice analysis confirm it",
          "By training longer",
          "By adding dropout"
        ],
        answer: 1,
        why: "The corner-patch model had a plausible test accuracy; only the tests that manipulated the cue revealed it."
      },
      {
        stem: "Why monitor explanations in production, and what would you track?",
        options: [
          "To display them on a dashboard",
          "Because attribution drift localises a change to a feature the moment a batch is scored, while accuracy cannot be measured until labels arrive: when logins halved, its mean SHAP moved −0.04 → +0.71 and its top-contributor share 0.46 → 0.62 immediately. Track per feature the mean and spread of SHAP and the top-contributor share against the training reference; track the base value across retrains; alert on shifts of several reference sds; and version every served explanation with its model and baseline",
          "To reduce latency",
          "To retrain the model automatically"
        ],
        answer: 1,
        why: "Prediction monitoring says the scores moved; explanation monitoring says which input moved them."
      }
    ]
  },

  interview: {
    title: "Interview lens",
    sub: "Answer out loud before opening",
    questions: [
      {
        level: "core",
        q: "How do you explain a convolutional network's prediction, and what are the limits of each method?",
        strong: "With gradient-based attribution, choosing the method by the question. For 'where in the image is the evidence', Grad-CAM: weight the last convolutional layer's feature maps by the mean gradient of the class score and apply a ReLU — one backward pass, a coarse heatmap; on a digit classifier with a planted corner patch it put heat next to the patch on marked images and none on clean ones. Its limits are resolution and the absence of any guarantee: after I removed the shortcut by retraining, the patch still drew a quarter of the heat while a behavioural test showed the model no longer used it — a conspicuous input is salient to a convolution whether or not the decision depends on it. For 'how much did each pixel contribute', integrated gradients: accumulate the gradient along a path from a baseline to the image, scaled by the difference; the attributions sum to the change in output — 11.56 against 11.62 at 200 steps — so saturation cannot hide a feature, and on the shortcut model 29 % of the mass sat on the four patch pixels. Its limits are the baseline choice and a few hundred backward passes. Plain gradient × input is a one-pass approximation that saturation can zero out; LRP gives conservation with rule-dependent results. And in every case the explanation is a hypothesis: the proof that the corner patch was a shortcut was removing it (threes unrecognised) and adding it (42 % of images became threes).",
        answer: [
          { t: "p", text: "Grad-CAM and IG with mechanism, guarantee and numbers, the saliency-versus-reliance caveat, and the behavioural test as proof." }
        ]
      },
      {
        level: "core",
        q: "A colleague uses a transformer's attention weights to explain which words drove a classification. Advise.",
        strong: "Attention weights tell you where the model gathered its representation from, not which inputs changed the output, and the two can disagree completely. In a four-token example with one attention head and a linear readout, the token with 85 % of the attention had a negative contribution to the output because the readout ignored its dimension and raising it only starved the others, while a token with 7 % of the attention carried the prediction. Attention has none of the properties an attribution needs — no completeness, no sensitivity — and empirical work has shown attention distributions can be replaced by very different ones without changing the output. For 'which words drove this', I would use integrated gradients over the token embeddings, which sum to the change in output from a baseline of padding tokens, or attention rollout combined with gradients; and I would validate the explanation behaviourally, by deleting the top-attributed tokens and measuring the change in the prediction. Attention maps remain useful for understanding the model's mechanics — what a head does — which is a different question.",
        answer: [
          { t: "p", text: "Why attention fails as attribution with the executed example, the alternatives, and the behavioural validation." }
        ]
      },
      {
        level: "advanced",
        q: "Design the explanation component of a production scoring service and its monitoring.",
        strong: "The explainer is built once at start-up and versioned together with the model and its baseline, because a SHAP or IG value is meaningless without the reference it is measured from and every retrain changes all of them. For tree models TreeSHAP is served synchronously — a quarter of a millisecond a row, and ten times cheaper per row in batches — with a cache keyed on a hash of the rounded feature vector that hit 70 % of requests in my test; for KernelSHAP or integrated gradients, which need hundreds of model evaluations, the explanation is asynchronous or precomputed for the rows that will be reviewed. The response carries the prediction, the base value, the contributions, and the model, explainer and baseline identifiers. Monitoring watches the explanations as a signal in their own right: per feature, the mean and spread of the attributions and the share of rows in which it is the top contributor, per scoring batch, compared against the training slice with an alert on shifts of several reference standard deviations; and the base value across retrains as a check that the reference point has not moved. That signal localises a fault to a feature the moment a batch is scored — when I halved the logins feature, its mean SHAP jumped from −0.04 to +0.71 and its top-contributor share from 0.46 to 0.62 — weeks before any label-based metric could move, and it doubles as the audit trail for 'has the model started relying on something new'.",
        answer: [
          { t: "p", text: "Explainer lifecycle and versioning, sync/async by cost, caching, the response contract, and explanation-drift monitoring with the executed fault." }
        ]
      }
    ]
  }
});
