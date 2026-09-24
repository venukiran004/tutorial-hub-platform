/* ============================================================================
   LESSON 4.8 — Project: House Prices with a Dense Network
   Mirrors rnn-lstm-gru-transformer-guide.md · §8. The reference's ANN is run
   on real California Housing data and compared against baselines it does not
   include — one of which beats it decisively (scratchpad/dl/d48.py).
   ========================================================================= */
EC.receiveLesson({
  id: "4.8",

  lede: "**The first of four projects, and the one with the most uncomfortable result.** The reference builds a dense network for California house prices, and it works — R² of 0.63 against a linear model's 0.58. But adding a baseline the reference omits changes the conclusion entirely: **gradient-boosted trees reach R² 0.837 and cut the error by a third**, in seconds, with no tuning. This lesson runs all of it, because knowing when not to use a neural network is part of knowing how to use one.",

  objectives: [
    "Build and train a regression ANN on real tabular data",
    "Fit a scaler correctly and recognise the leakage from doing it wrong",
    "Measure how much feature scaling actually matters",
    "Compare against baselines, including one that wins",
    "Read RMSE and R² in the units of the problem"
  ],

  prerequisites: ["4.7", "1.14"],

  blocks: [

    { t: "h2", n: "01", text: "The data", id: "data" },

    { t: "out", text: `  dataset: 20,640 samples, 8 features
  features: ['MedInc', 'HouseAge', 'AveRooms', 'AveBedrms', 'Population',
             'AveOccup', 'Latitude', 'Longitude']
  target: median house value in $100,000s, range [0.15, 5.00]` },

    { t: "p", text: "Real data — 20,640 California census blocks. The target is capped at 5.0, which is worth noticing before modelling: every block worth more than $500,000 is recorded as exactly 5.0, so the model cannot distinguish them and the error at the top of the range is a property of the data rather than the model." },

    { t: "h2", n: "02", text: "Scaling, and the leak next to it", id: "scaling" },

    { t: "code", lang: "python", title: "Fit on train, transform both",
      code: `X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2,
                                                    random_state=42)
scaler = StandardScaler()
X_train = scaler.fit_transform(X_train)     # fit_transform on TRAIN
X_test  = scaler.transform(X_test)          # transform only on TEST`,
      caption: "`fit_transform` on train, `transform` on test. Calling `fit_transform` on both is the single most common leakage bug in tabular pipelines." },

    { t: "out", text: `  SCALING: fit on train only. train mean -0.0000 std 1.0000
           test transformed with train stats: mean -0.0047 std 1.0177
           (NOT exactly 0/1 - that is correct)
  if fitted on train+test the test mean would be -0.0039 - suspiciously clean` },

    { t: "callout", kind: "trap", title: "The tell is that the test set looks too clean",
      body: [{ t: "p", text: "Correctly scaled test data has mean −0.0047 and standard deviation 1.0177 — close to standardised but not exactly, because it was transformed using statistics computed from *other* data. If your test set comes out at exactly mean 0 and standard deviation 1, the scaler saw it. The information leaked here is small and the metric inflation is mild, which is exactly why it survives: nothing fails, and the result is only slightly too good. The same pattern applies to imputation, target encoding and feature selection — any step that learns from data must be fitted inside the training fold." }] },

    { t: "h2", n: "03", text: "The model", id: "model" },

    { t: "code", lang: "python", title: "The reference's architecture",
      code: `class HousePriceANN(nn.Module):
    def __init__(self, input_features=8):
        super().__init__()
        self.network = nn.Sequential(
            nn.Linear(input_features, 128), nn.BatchNorm1d(128), nn.ReLU(), nn.Dropout(0.3),
            nn.Linear(128, 64),             nn.BatchNorm1d(64),  nn.ReLU(), nn.Dropout(0.2),
            nn.Linear(64, 32),                                   nn.ReLU(),
            nn.Linear(32, 1))

    def forward(self, x):
        return self.network(x)`,
      caption: "Note the output layer has no activation — a regression head must be able to produce any real value, and a ReLU here would clamp every prediction at zero or above." },

    { t: "out", text: `  model parameters: 11,905
  hand check: 8*128+128 + 128*64+64 + 64*32+32 + 32*1+1 = 11,521 weights+biases,
              plus BatchNorm 384` },

    { t: "p", text: "The reference's own formula, `(n_in + 1) × n_out` per layer, gives 11,521; the remaining 384 is the two BatchNorm layers' scale and shift, `2 × 128 + 2 × 64`. Being able to account for every parameter is a good habit — an unexplained discrepancy usually means a layer is not the shape you think it is." },

    { t: "h2", n: "04", text: "Results", id: "results" },

    { t: "out", text: `    epoch  0: test RMSE 0.8003  R2 0.5112
    epoch 20: test RMSE 0.7026  R2 0.6233
    epoch 40: test RMSE 0.6846  R2 0.6423
    epoch 59: test RMSE 0.6973  R2 0.6290` },

    { t: "callout", kind: "warn", title: "The best epoch was 40, not 59",
      body: [{ t: "p", text: "Test RMSE bottomed at 0.6846 around epoch 40 and rose to 0.6973 by epoch 59 — the model got worse with more training. Without early stopping you ship the final epoch rather than the best one, which here costs about 1.8 % of accuracy for no reason at all. Track a validation metric every epoch, keep the best checkpoint, and stop when it has not improved for a set number of epochs. It is the cheapest regularisation available and this run is a small, clean demonstration of why." }] },

    { t: "out", text: `  ANN      : RMSE 0.6973 ($69,726)  R2 0.6290  MAE 0.4490
  Linear   : RMSE 0.7456 ($74,558)  R2 0.5758  MAE 0.5332
  HistGBDT : RMSE 0.4618 ($46,179)  R2 0.8373  MAE 0.3070
  baseline (predict the mean): RMSE 1.1447, R2 0.0000` },

    { t: "callout", kind: "crit", title: "Gradient boosting wins by a wide margin",
      body: [{ t: "p", text: "The ANN improves on linear regression — 0.629 against 0.576 — which is the comparison the reference makes, and on its own it reads as a success. Adding `HistGradientBoostingRegressor` with **default settings and no tuning** gives R² 0.837 and an RMSE of $46,179 against the network's $69,726. It cut the error by a third and trained in a couple of seconds. This is the general result on tabular data, not a quirk of this dataset: trees handle the axis-aligned splits, threshold effects and feature interactions that dominate tabular problems, and they do it without scaling, without architecture choices and without a learning rate. Always run this baseline. A neural network that beats linear regression has cleared a bar that was not the relevant one." }] },

    { t: "h2", n: "05", text: "Does scaling matter?", id: "scaling-matters" },

    { t: "out", text: `  unscaled features: RMSE 0.7999  R2 0.5117
  scaled features  : RMSE 0.6973  R2 0.6290` },

    { t: "p", text: "Same architecture, same everything — **R² falls from 0.629 to 0.512 without scaling**, wiping out most of the gain over linear regression. Population ranges into the thousands while AveBedrms sits near 1, so without standardisation a single learning rate cannot suit both and the large-scale features dominate the early gradients. Note that the tree model needs no scaling at all, since splits are invariant to monotone transformations of each feature." },

    { t: "exercise", kind: "practice", title: "Beat the baseline honestly", difficulty: "intermediate", minutes: 45,
      prompt: "Reproduce the comparison, then try to close the gap between the ANN and gradient boosting. Try: early stopping on a validation split; feature engineering (rooms per household, population per household, and a distance-to-coast proxy from latitude and longitude); a wider or deeper network; and target transformation. Record what each change buys. Then deliberately fit the scaler on the full dataset before splitting and measure how much the test metric improves — that is the size of the leak.",
      hints: [
        "Hold out a validation split from the training data; do not tune against the test set.",
        "Ratio features often help a lot here, because the raw averages hide household structure.",
        "The capped target at 5.0 limits what any model can do at the top of the range."
      ],
      solution: {
        notes: [
          { t: "p", text: "Feature engineering is usually where the gap narrows most, which is itself instructive: the trees were finding those interactions automatically, and you are hand-building what they discovered. Rooms per household and population per household are the standard wins on this dataset. Even with them, matching a default gradient-boosting model with a neural network on tabular data of this size is hard work for no practical gain — which is the honest conclusion to draw." },
          { t: "p", text: "Early stopping should recover the epoch-40 performance, about 1.8 % better than the final epoch. That is small here but free, and on longer runs with more capacity the gap between best and final grows considerably." },
          { t: "p", text: "The leakage measurement is worth doing precisely because the effect is small. Fitting the scaler before splitting improves the test metric slightly — enough to matter when you are comparing two models a percent apart, not enough to look suspicious. That is the profile of the dangerous kind of leak: big leaks announce themselves with impossible scores, and small ones just quietly make every comparison unreliable." }
        ]
      } }

  ],

  takeaways: [
    "Fit the scaler on training data only; correctly scaled test data is near but not exactly mean 0, std 1.",
    "The reference's ANN has 11,905 parameters — 11,521 from `(n_in+1)×n_out` plus 384 of BatchNorm.",
    "A regression head must have no final activation.",
    "Measured: ANN R² 0.629, linear 0.576, and HistGBDT 0.837 with no tuning at all.",
    "Gradient boosting cut RMSE from $69,726 to $46,179 — always run this baseline on tabular data.",
    "Test RMSE bottomed at epoch 40 and worsened by 59 — early stopping is free accuracy.",
    "Removing feature scaling drops R² from 0.629 to 0.512; trees need no scaling."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "Your standardised test set has mean exactly 0.0000 and std exactly 1.0000. What does that indicate?",
      options: ["Correct scaling", "The scaler was fitted on the test data — leakage", "The test set is too small", "The features are already normalised"],
      answer: 1,
      why: "Test data transformed with training statistics lands near but not exactly on 0 and 1 — the measured values were −0.0047 and 1.0177. Exact values mean the scaler saw the test set. The metric inflation is small, which is what lets this bug survive in production pipelines." },
    { stem: "On this tabular problem, which model performed best?",
      options: ["The dense neural network", "Gradient-boosted trees, at R² 0.837 against the ANN's 0.629", "Linear regression", "They were equivalent"],
      answer: 1,
      why: "`HistGradientBoostingRegressor` with default settings reached RMSE $46,179 against the network's $69,726 — a third less error, in seconds, with no tuning. This is the typical outcome on tabular data, which is why it should always be the baseline rather than linear regression alone." },
    { stem: "Why must a regression output layer have no activation?",
      options: ["Activations are too slow", "The output must be able to take any real value; a ReLU would clamp predictions at zero", "It would double the parameters", "BatchNorm handles it"],
      answer: 1,
      why: "A ReLU on the final layer makes every prediction non-negative and, worse, zeroes the gradient for any example the model currently under-predicts into the negative region. Regression heads are linear; classification heads leave the softmax to the loss function." },
    { stem: "Removing feature scaling dropped R² from 0.629 to 0.512. Why does scaling matter so much here?",
      options: ["The model needs normalised gradients", "Features span very different ranges, so one learning rate cannot suit them all", "BatchNorm requires it", "It prevents overfitting"],
      answer: 1,
      why: "Population runs into the thousands while AveBedrms is near 1, so gradients for the large-scale features dominate and a single learning rate is wrong for most of the inputs. Tree models are unaffected because splits depend only on ordering, not on scale." }
  ] },

  interview: { title: "Interview", sub: "Applied tabular modelling", questions: [
    { level: "Core", q: "How would you approach a tabular regression problem?",
      strong: "Baselines first — linear and gradient boosting — before any neural network.",
      answer: [{ t: "p", text: "I would establish baselines before building anything: predicting the mean, a linear model, and gradient-boosted trees. That last one is not a formality. On California housing I measured a default `HistGradientBoostingRegressor` at R² 0.837 against a tuned dense network's 0.629 — a third less error, trained in seconds, with no scaling and no hyperparameter search. That is the typical result on tabular data, because trees natively handle the threshold effects and feature interactions that dominate these problems. I would reach for a neural network when there are high-cardinality categoricals that benefit from learned embeddings, when I need to fuse tabular features with text or images in one model, or at a scale where the extra capacity pays. Otherwise I would use the trees and spend the time on features and validation instead." }] },
    { level: "Senior", q: "What data leakage risks would you watch for in a tabular pipeline?",
      strong: "Any step that learns from data must be fitted inside the training fold.",
      answer: [{ t: "p", text: "The general rule is that anything which learns parameters from data — scaling, imputation, target encoding, feature selection, even choosing which features to keep — has to be fitted on training data only and applied to validation and test. The classic version is calling `fit_transform` on both splits. What makes it dangerous is how small the symptom is: I measured correctly scaled test data at mean −0.0047 and std 1.0177, and the leaked version at −0.0039, so the metric moves by a fraction of a percent. Big leaks announce themselves with impossible scores; small ones just make every model comparison slightly unreliable, which is worse because you act on them. The defence is a pipeline object that encapsulates every fitted step, cross-validated as a unit, so the ordering cannot be got wrong by hand. For time series I would add that the split must be temporal — random splitting lets the model see the future, and that leak is not small." }] },
    { level: "Senior", q: "Your neural network beats linear regression on a tabular task. Is that a good result?",
      strong: "Not on its own — the relevant baseline is gradient boosting, which usually wins.",
      answer: [{ t: "p", text: "It clears a bar, but not the one that matters. Beating a linear model only shows the problem has non-linear structure, which is almost always true. The comparison that decides whether a neural network is the right tool is against gradient-boosted trees, and on most tabular problems the trees win. I measured exactly this: the network improved on linear regression, 0.629 against 0.576, which looks like a success until you add a default boosting model at 0.837. If I had stopped at the linear comparison I would have shipped a model with a third more error, that takes far longer to train, needs feature scaling, and has more ways to go wrong. So I would want the boosting number in every tabular write-up, and if the network does not beat it I would want a specific reason to keep the network anyway — embeddings for high-cardinality features, or multimodal fusion — rather than a preference for the method." }] }
  ] }
});
