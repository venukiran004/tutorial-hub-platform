/* ============================================================================
   MACHINE LEARNING — CURRICULUM
   ----------------------------------------------------------------------------
   Eleven modules in the order a practitioner needs them: how learning works
   and how it is measured; the features and the scikit-learn contract; the
   algorithms, family by family, each derived and then run; the disciplines
   that make a model good — tuning, imbalance, explanation, anomaly; the
   specialised domain of time series; and production, the Bayesian and online
   views, recommenders, text, neural nets from the ML side, and the interview.

   Every formula is worked on a number. Every reported score, coefficient,
   split, importance and forecast was produced by running the code on a
   small dataset built so the traps exist — a leaking feature, a tied rank,
   a class at 3 %, a seasonal series with one outlier. Nothing here is
   quoted from memory.

   Reference coverage (tutorial-hub/04_Machine_Learning):
     01_ML_Fundamentals        → M1 (all 25 sections + case study), M11.1–11.3
     02_Evaluation_Metrics     → M2
     03_Choosing_Metrics       → M2.3, M2.4
     04_Feature_Scaling        → M3.1
     07_Ensemble_and_Tuning    → M6.5, M8.1–8.4, M3.5
     Algorithms/* (29 files)   → M4, M5, M6, M7, M9.5, M10.5, M8.2 (adasyn)
     10_Time_Series            → M10
     12_Model_Interpretability → M9.1–9.3
     14_Anomaly_Detection      → M9.4–9.5
     15/16_Scikit_Learn        → M3.6, M8.5 and the sklearn block of every algorithm lesson
     17_Client_Round_Fraud     → M9.5, M11.8
     Practice/01–10            → exercises and scenario blocks throughout; 09 → M11.5–11.6
     00_Interview_Bank         → the interview block of every lesson; M11.7–11.8
   ========================================================================= */
(function () {
  EC.defineCourse({
    id: "ml",
    title: "Machine Learning",
    short: "ML",
    blurb: "Algorithm by algorithm — derived, worked on a number, then run — with the evaluation you can trust, the leakage you can detect, and the baseline you cannot beat.",

    /* Three tracks. "learn" is the course; "practice" and "interview" are the
       reference's own banks — Practice/01–10 and 00_Interview_Bank — imported
       by .build/import-banks.py with every answer folded away. */
    trackLabels: { learn: "Machine Learning", practice: "Practice", interview: "Interview" },
    trackBlurbs: {
      learn: "Eleven modules — every algorithm derived, worked on a number, then run.",
      practice: "One hundred scikit-learn programs and over a thousand scenario questions with the answers folded away.",
      interview: "The core ML and scikit-learn interview bank and the real Glassdoor Data Scientist and ML Engineer questions."
    },

    published: ["1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "1.7", "1.8", "2.1", "2.2", "2.3", "2.4", "2.5", "2.6", "2.7", "3.1", "3.2", "3.3", "3.4", "3.5", "3.6", "4.1", "4.2", "4.3", "4.4", "4.5", "4.6", "5.1", "5.2", "5.3", "6.1", "6.2", "6.3", "6.4", "6.5", "7.1", "7.2", "7.3", "7.4", "7.5", "8.1", "8.2", "8.3", "8.4", "8.5", "9.1", "9.2", "9.3", "9.4", "9.5", "10.1", "10.2", "10.3", "10.4", "10.5", "10.6", "10.7", "10.8", "10.9", "11.1", "11.2", "11.3", "11.4", "11.5", "11.6", "11.7", "11.8", "i1.1", "i1.2", "i1.3", "i1.4", "i1.5", "i1.6", "i1.7", "i1.8", "i1.9", "i1.10", "i1.11", "i1.12", "i2.1", "i2.2", "i2.3", "i2.4", "i2.5", "i2.6", "i2.7", "i2.8", "p1.1", "p1.2", "p1.3", "p1.4", "p1.5", "p1.6", "p1.7", "p1.8", "p2.1", "p2.2", "p2.3", "p2.4", "p3.1", "p3.2", "p3.3", "p3.4", "p4.1", "p4.2", "p4.3", "p4.4", "p5.1", "p5.2", "p5.3", "p5.4", "p6.1", "p6.2", "p6.3", "p6.4", "p7.1", "p7.2", "p7.3", "p7.4", "p8.1", "p8.2", "p8.3", "p8.4", "p8.5", "p8.6", "p9.1", "p9.2", "p9.3", "p9.4", "p10.1", "p10.2", "p10.3", "p10.4"],

    modules: [

      /* ================================================================
         PHASE 1 · HOW LEARNING WORKS
         ================================================================ */
      {
        id: "foundations",
        short: "M1",
        dir: "01_foundations",
        phase: "Phase 1 · How learning works",
        title: "Foundations",
        blurb: "What a model is, how error decomposes, why it overfits, how to measure it honestly, what leaks, and the optimisation underneath every fit.",
        outcome: "You can explain bias and variance with a derivation and a simulation, choose a cross-validation scheme that matches deployment, and name the leak before the score is reported.",
        lessons: [
          { id: "1.1", title: "What a Model Learns", difficulty: "foundation", minutes: 30, tier: "must",
            summary: "Supervised, unsupervised, semi- and self-supervised, reinforcement; ML against rules, statistics and deep learning; the function, the loss and the data as the three ingredients.",
            keywords: ["supervised", "unsupervised", "reinforcement", "self-supervised", "semi-supervised", "ml vs statistics", "hypothesis", "loss"] },
          { id: "1.2", title: "The Pipeline, End to End", difficulty: "foundation", minutes: 34, tier: "must",
            summary: "Problem framing to monitoring: the production-grade sequence, what each step produces, the mistakes that survive to deployment, and a churn case study run through every stage.",
            keywords: ["pipeline", "problem framing", "train test split", "baseline", "deployment", "monitoring", "churn case study"] },
          { id: "1.3", title: "Bias and Variance, Derived and Simulated", difficulty: "core", minutes: 38, tier: "must",
            summary: "The expected-squared-error decomposition proved line by line, then measured by fitting a thousand models to resampled data — bias, variance and noise as three numbers.",
            keywords: ["bias-variance", "decomposition", "irreducible error", "simulation", "model complexity", "double descent"] },
          { id: "1.4", title: "Overfitting, Regularisation and Early Stopping", difficulty: "core", minutes: 34, tier: "must",
            summary: "Detecting the gap, the solutions ranked by cost, L1 and L2 as priors, early stopping as regularisation, and the learning curve that says whether more data would help.",
            keywords: ["overfitting", "underfitting", "regularisation", "l1", "l2", "early stopping", "learning curve", "map"] },
          { id: "1.5", title: "Cross-Validation That Matches Deployment", difficulty: "core", minutes: 36, tier: "must",
            summary: "K-fold, stratified, group, time-series, leave-one-out and repeated; nested CV for honest selection; the variance of a CV estimate; the six mistakes that inflate it.",
            keywords: ["cross-validation", "k-fold", "stratified", "group k-fold", "time series split", "nested cv", "hold-out"] },
          { id: "1.6", title: "Data Leakage", difficulty: "core", minutes: 32, tier: "must",
            summary: "Target, train-test, temporal and preprocessing leakage; how each shows up in a score; the detection tests and the prevention checklist, with a leak planted and found.",
            keywords: ["data leakage", "target leakage", "temporal leakage", "preprocessing leakage", "detection", "checklist"] },
          { id: "1.7", title: "Learning Theory and the Shape of Models", difficulty: "advanced", minutes: 36, tier: "should",
            summary: "PAC learning, VC dimension, ERM, Rademacher; no free lunch and Occam; inductive bias; generative vs discriminative, parametric vs non-parametric, lazy vs eager; the curse of dimensionality in numbers.",
            keywords: ["pac learning", "vc dimension", "erm", "no free lunch", "inductive bias", "generative", "discriminative", "parametric", "curse of dimensionality"] },
          { id: "1.8", title: "Optimisation and Loss Functions", difficulty: "core", minutes: 38, tier: "must",
            summary: "Gradient descent and its three flavours, the learning rate, momentum, Adam, schedules, convexity and saddles; the regression and classification losses; loss versus metric.",
            keywords: ["gradient descent", "sgd", "mini-batch", "learning rate", "momentum", "adam", "convex", "loss function", "cross-entropy", "huber"] }
        ]
      },

      {
        id: "evaluation",
        short: "M2",
        dir: "02_evaluation",
        phase: "Phase 1 · How learning works",
        title: "Evaluation",
        blurb: "Every metric defined from the confusion matrix or the residuals, the curves behind AUC, the threshold as a business decision, calibration, and the metrics for ranking, clustering and fairness.",
        outcome: "You can pick the metric that matches the base rate and the cost, compute it by hand from a confusion matrix, and say why two models with the same AUC deploy differently.",
        lessons: [
          { id: "2.1", title: "The Confusion Matrix and Everything Built on It", difficulty: "foundation", minutes: 34, tier: "must",
            summary: "TP, FP, FN, TN and the twelve metrics that follow — precision, recall, specificity, F1 and F-beta, kappa, MCC, balanced accuracy — with multi-class averaging computed three ways.",
            keywords: ["confusion matrix", "precision", "recall", "f1", "specificity", "mcc", "kappa", "macro", "micro", "weighted"] },
          { id: "2.2", title: "ROC, Precision–Recall and Proper Scoring", difficulty: "core", minutes: 36, tier: "must",
            summary: "The ROC curve built point by point, AUC as a ranking probability, why PR-AUC moves when the base rate does, log loss and the Brier score as scores for probabilities.",
            keywords: ["roc", "auc", "precision-recall curve", "pr-auc", "log loss", "brier score", "base rate"] },
          { id: "2.3", title: "Thresholds, Costs and the Business Decision", difficulty: "core", minutes: 34, tier: "must",
            summary: "The same model at three thresholds, when precision matters and when recall does, why F1 can pick the most expensive threshold, and the cost-weighted choice worked on a fraud example.",
            keywords: ["threshold", "cost-sensitive", "expected cost", "precision vs recall", "fraud", "f1 trap", "youden"] },
          { id: "2.4", title: "Regression Metrics", difficulty: "core", minutes: 32, tier: "must",
            summary: "MAE, MSE, RMSE, R² and adjusted R², MAPE and its trap, MSLE and Huber — the same five errors under each, what one outlier does, and the RMSE-over-MAE diagnostic.",
            keywords: ["mae", "mse", "rmse", "r2", "adjusted r2", "mape", "msle", "outlier", "residuals"] },
          { id: "2.5", title: "Calibration", difficulty: "advanced", minutes: 32, tier: "should",
            summary: "Reliability diagrams, expected calibration error, which models are calibrated and which are not, Platt scaling and isotonic regression, and when calibration matters more than discrimination.",
            keywords: ["calibration", "reliability diagram", "ece", "platt scaling", "isotonic", "predict_proba", "discrimination"] },
          { id: "2.6", title: "Ranking, Clustering and Fairness Metrics", difficulty: "advanced", minutes: 34, tier: "should",
            summary: "MRR, NDCG, MAP and recall@k; silhouette, Davies–Bouldin, Calinski–Harabasz, ARI and NMI; demographic parity, equalised odds and the impossibility result; gain, lift and the C-index.",
            keywords: ["ndcg", "mrr", "map", "silhouette", "davies-bouldin", "adjusted rand", "fairness", "equalised odds", "lift", "gain chart", "c-index"] },
          { id: "2.7", title: "Comparing Models Honestly", difficulty: "advanced", minutes: 32, tier: "should",
            summary: "The spread of CV scores, confidence intervals by bootstrap, paired tests on folds, slice-based evaluation, offline versus online metrics, and the report that survives a sceptical reviewer.",
            keywords: ["confidence interval", "bootstrap", "paired t-test", "statistical significance", "slice evaluation", "offline vs online", "model comparison"] }
        ]
      },

      /* ================================================================
         PHASE 2 · FEATURES AND THE SCIKIT-LEARN CONTRACT
         ================================================================ */
      {
        id: "features",
        short: "M3",
        dir: "03_features",
        phase: "Phase 2 · Features and the scikit-learn contract",
        title: "Preprocessing and Features",
        blurb: "Scaling, encoding, imputation, transformation and selection — each fitted on the training fold only — and the Pipeline and ColumnTransformer that make that rule automatic.",
        outcome: "You can build a preprocessing pipeline that cannot leak, choose the encoder for a 50,000-level category, and defend every feature you kept.",
        lessons: [
          { id: "3.1", title: "Scaling: Standardise, Normalise, Robust", difficulty: "foundation", minutes: 30, tier: "must",
            summary: "z-score, min-max and robust scaling side by side on the same column with one outlier, which algorithms need scaling and which are indifferent, and fit-on-train-only demonstrated.",
            keywords: ["standardisation", "normalisation", "min-max", "robust scaler", "z-score", "outlier", "fit on train"] },
          { id: "3.2", title: "Encoding Categoricals", difficulty: "core", minutes: 34, tier: "must",
            summary: "One-hot and the dummy trap, ordinal, target encoding with its leak and the fix, hashing, frequency and embeddings for high cardinality; what trees and linear models each need.",
            keywords: ["one-hot", "ordinal encoding", "target encoding", "hashing trick", "high cardinality", "dummy variable trap", "label encoder"] },
          { id: "3.3", title: "Missing Data", difficulty: "core", minutes: 32, tier: "must",
            summary: "MCAR, MAR and MNAR with a test for each, simple, KNN and iterative imputation compared on a planted gap, missingness indicators, and the models that handle NaN natively.",
            keywords: ["missing data", "mcar", "mar", "mnar", "simple imputer", "knn imputer", "iterative imputer", "missing indicator"] },
          { id: "3.4", title: "Transforms, Interactions and Outliers", difficulty: "core", minutes: 34, tier: "should",
            summary: "Log, Box-Cox and Yeo-Johnson, quantile transforms, binning, polynomial and interaction features, cyclical encoding, winsorisation, and outlier detection before a linear fit.",
            keywords: ["log transform", "box-cox", "yeo-johnson", "quantile transform", "binning", "polynomial features", "interactions", "cyclical", "winsorisation"] },
          { id: "3.5", title: "Feature Selection", difficulty: "core", minutes: 34, tier: "must",
            summary: "Filter methods (correlation, chi², ANOVA F, mutual information), wrappers (RFE, sequential), embedded (L1, tree importance), VIF for multicollinearity, and selection inside the fold.",
            keywords: ["feature selection", "filter", "wrapper", "embedded", "rfe", "mutual information", "chi-squared", "vif", "multicollinearity"] },
          { id: "3.6", title: "The scikit-learn Contract: Pipelines and ColumnTransformer", difficulty: "core", minutes: 36, tier: "must",
            summary: "fit, transform, predict and their guarantees; Pipeline and ColumnTransformer wired for mixed data; custom transformers; get_feature_names_out; persistence; the production template.",
            keywords: ["estimator api", "fit transform", "pipeline", "columntransformer", "custom transformer", "joblib", "set_output", "production template"] }
        ]
      },

      /* ================================================================
         PHASE 3 · THE ALGORITHMS
         ================================================================ */
      {
        id: "linear",
        short: "M4",
        dir: "04_linear",
        phase: "Phase 3 · The algorithms",
        title: "Linear Models",
        blurb: "Least squares derived three ways, its assumptions and their diagnostics, ridge and lasso as geometry, logistic regression from odds to cross-entropy, and the GLM family beyond.",
        outcome: "You can fit a line by hand and by the normal equation, say what each coefficient means and when it lies, and explain why lasso zeros a weight while ridge only shrinks it.",
        lessons: [
          { id: "4.1", title: "Linear Regression: Three Derivations", difficulty: "core", minutes: 40, tier: "must",
            summary: "Slope and intercept by calculus on five points, the normal equation by matrix calculus, the projection view, OLS as maximum likelihood under Gaussian noise, and gradient descent when the matrix is too big.",
            keywords: ["linear regression", "ordinary least squares", "normal equation", "projection", "maximum likelihood", "gradient descent", "coefficient"] },
          { id: "4.2", title: "Assumptions, Diagnostics and Inference", difficulty: "core", minutes: 36, tier: "must",
            summary: "Linearity, independence, normality, equal variance and no collinearity — each violated on purpose and diagnosed; Gauss–Markov; leverage, Cook's distance, p-values, weighted least squares.",
            keywords: ["assumptions", "residual plot", "heteroscedasticity", "multicollinearity", "gauss-markov", "cook's distance", "leverage", "p-value", "weighted least squares"] },
          { id: "4.3", title: "Ridge, Lasso and Elastic Net", difficulty: "core", minutes: 38, tier: "must",
            summary: "The L2 closed form and its SVD shrinkage, L1's subgradient and soft-thresholding, the diamond and the circle, the regularisation path, Bayesian priors, and choosing alpha by CV.",
            keywords: ["ridge", "lasso", "elastic net", "l1", "l2", "soft-thresholding", "regularisation path", "shrinkage", "alpha"] },
          { id: "4.4", title: "Polynomial Regression and the Bias–Variance Dial", difficulty: "core", minutes: 30, tier: "should",
            summary: "Degree as a capacity knob, the same data under degrees 1 to 15 with train and test error, Runge's phenomenon, scaling and ridge for high degrees, and splines as the grown-up alternative.",
            keywords: ["polynomial regression", "degree", "overfitting", "runge", "splines", "capacity"] },
          { id: "4.5", title: "Logistic Regression", difficulty: "core", minutes: 40, tier: "must",
            summary: "From odds to the logit, the sigmoid and its derivative, cross-entropy from maximum likelihood, the gradient derived on the whiteboard, softmax for many classes, C, coefficients as odds ratios.",
            keywords: ["logistic regression", "sigmoid", "logit", "odds ratio", "cross-entropy", "gradient", "softmax", "multinomial", "regularisation c"] },
          { id: "4.6", title: "Generalised Linear Models and Robust Losses", difficulty: "advanced", minutes: 34, tier: "should",
            summary: "Link functions and exponential-family responses, Poisson regression with exposure worked on counts, deviance, overdispersion; Huber and quantile regression for when squared error is wrong.",
            keywords: ["glm", "link function", "poisson regression", "exposure", "deviance", "huber", "quantile regression", "tweedie"] }
        ]
      },

      {
        id: "neighbours",
        short: "M5",
        dir: "05_neighbours",
        phase: "Phase 3 · The algorithms",
        title: "Neighbours, Bayes and Margins",
        blurb: "Three models that think differently: by distance, by probability, and by the widest street between classes.",
        outcome: "You can compute a KNN vote and a Naive Bayes posterior by hand, derive the SVM dual to where the kernel enters, and say which of the three suits a text problem, a low-data problem, or a noisy one.",
        lessons: [
          { id: "5.1", title: "K-Nearest Neighbours and Distance", difficulty: "core", minutes: 36, tier: "must",
            summary: "The Minkowski family, cosine and Mahalanobis; the vote for k = 3 and k = 5 worked; k as a bias–variance dial; the curse of dimensionality with numbers; scaling, weighting, KD-trees and when KNN is right.",
            keywords: ["knn", "euclidean", "manhattan", "cosine", "mahalanobis", "curse of dimensionality", "lazy learning", "kd-tree", "distance metrics"] },
          { id: "5.2", title: "Naive Bayes", difficulty: "core", minutes: 34, tier: "must",
            summary: "Bayes' theorem to a classifier, the independence assumption and why it works anyway, Gaussian, multinomial and Bernoulli variants, Laplace smoothing, log-space arithmetic, and a spam filter computed by hand.",
            keywords: ["naive bayes", "bayes theorem", "prior", "likelihood", "posterior", "laplace smoothing", "multinomial", "gaussian nb", "text classification"] },
          { id: "5.3", title: "Support Vector Machines", difficulty: "advanced", minutes: 44, tier: "must",
            summary: "Margin geometry, the soft-margin primal and C, hinge loss, the Lagrangian dual and KKT, the kernel trick with RBF and gamma, Mercer, SMO, SVR and epsilon, multi-class, probabilities, and why scaling is not optional.",
            keywords: ["svm", "margin", "support vectors", "hinge loss", "dual", "kkt", "kernel trick", "rbf", "gamma", "svr", "one-class svm"] }
        ]
      },

      {
        id: "trees",
        short: "M6",
        dir: "06_trees",
        phase: "Phase 3 · The algorithms",
        title: "Trees and Ensembles",
        blurb: "The greedy split, the forest that averages it, the boosters that correct it, and the meta-learner that stacks them — the models that win on tables.",
        outcome: "You can compute a Gini split by hand, explain why a forest has lower variance than a tree with the formula, derive gradient boosting as gradient descent in function space, and choose between XGBoost, LightGBM and CatBoost with reasons.",
        lessons: [
          { id: "6.1", title: "Decision Trees", difficulty: "core", minutes: 40, tier: "must",
            summary: "Entropy, information gain, gain ratio and Gini computed on a node; ID3, C4.5 and CART; regression trees by variance reduction; continuous features, missing values, cost-complexity pruning, and the XOR a tree can and cannot see.",
            keywords: ["decision tree", "gini", "entropy", "information gain", "gain ratio", "cart", "id3", "c4.5", "pruning", "ccp_alpha", "regression tree"] },
          { id: "6.2", title: "Bagging and Random Forests", difficulty: "core", minutes: 38, tier: "must",
            summary: "Bootstrap sampling, the variance formula that explains averaging, random feature subsets and decorrelation, OOB error, MDI importance and its bias against permutation importance, Extra Trees, proximity, tuning.",
            keywords: ["random forest", "bagging", "bootstrap", "oob", "feature importance", "mdi", "permutation importance", "extra trees", "max_features"] },
          { id: "6.3", title: "Boosting: AdaBoost and Gradient Boosting", difficulty: "advanced", minutes: 42, tier: "must",
            summary: "AdaBoost's weight update derived and run for three rounds by hand; gradient boosting as functional gradient descent with residuals as gradients; learning rate against n_estimators, subsampling, early stopping.",
            keywords: ["adaboost", "gradient boosting", "residuals", "learning rate", "n_estimators", "shrinkage", "subsample", "early stopping", "functional gradient descent"] },
          { id: "6.4", title: "XGBoost, LightGBM and CatBoost", difficulty: "advanced", minutes: 40, tier: "must",
            summary: "The second-order objective and the split-gain formula, regularised leaves, histogram binning, leaf-wise growth, GOSS and EFB, ordered boosting and ordered target statistics, DART; the three run on the same data and compared.",
            keywords: ["xgboost", "lightgbm", "catboost", "second-order", "split gain", "histogram", "leaf-wise", "goss", "efb", "ordered boosting", "dart", "histgradientboosting"] },
          { id: "6.5", title: "Stacking, Voting and Ensemble Design", difficulty: "advanced", minutes: 34, tier: "should",
            summary: "Condorcet and why diversity matters, hard and soft voting, stacking with out-of-fold predictions, blending, random subspaces, when an ensemble does not help, and the bias–variance view of each family.",
            keywords: ["stacking", "voting", "blending", "condorcet", "diversity", "meta-learner", "out-of-fold", "ensemble design"] }
        ]
      },

      {
        id: "unsupervised",
        short: "M7",
        dir: "07_unsupervised",
        phase: "Phase 3 · The algorithms",
        title: "Clustering and Dimensionality Reduction",
        blurb: "Finding structure without labels: centroids, densities, hierarchies and mixtures; then the projections that compress, separate and visualise.",
        outcome: "You can run Lloyd's algorithm by hand, choose k with three methods and say why they disagree, pick DBSCAN's eps from a k-distance plot, derive PCA from variance maximisation, and explain why t-SNE output is not a feature.",
        lessons: [
          { id: "7.1", title: "K-Means and Choosing k", difficulty: "core", minutes: 38, tier: "must",
            summary: "Lloyd's algorithm iterated by hand, the objective and its EM reading, k-means++, elbow, silhouette and gap statistic on the same data, mini-batch, and the shapes k-means cannot find.",
            keywords: ["k-means", "lloyd", "inertia", "k-means++", "elbow", "silhouette", "gap statistic", "mini-batch", "customer segmentation"] },
          { id: "7.2", title: "Hierarchical, Density and Mixture Clustering", difficulty: "advanced", minutes: 40, tier: "must",
            summary: "Agglomerative linkages and Ward, reading a dendrogram; DBSCAN's eps and min_samples from a k-distance plot, HDBSCAN and OPTICS; Gaussian mixtures fitted by EM with the update equations; mean shift, affinity propagation, spectral.",
            keywords: ["hierarchical clustering", "linkage", "ward", "dendrogram", "dbscan", "eps", "min_samples", "hdbscan", "gmm", "em algorithm", "spectral clustering"] },
          { id: "7.3", title: "Evaluating and Using Clusters", difficulty: "core", minutes: 30, tier: "should",
            summary: "Silhouette, Davies–Bouldin and Calinski–Harabasz computed; ARI and NMI against known labels; distances for documents and time series; clusters as features and the stability check.",
            keywords: ["silhouette", "davies-bouldin", "calinski-harabasz", "ari", "nmi", "cluster stability", "cluster features", "document clustering"] },
          { id: "7.4", title: "PCA", difficulty: "core", minutes: 40, tier: "must",
            summary: "Variance maximisation to the eigenproblem, the SVD route, explained variance and choosing components, whitening, scaling first, reconstruction error, incremental and kernel PCA, random projections and NMF.",
            keywords: ["pca", "eigenvectors", "svd", "explained variance", "n_components", "whitening", "kernel pca", "incremental pca", "nmf", "random projection"] },
          { id: "7.5", title: "LDA, t-SNE and UMAP", difficulty: "advanced", minutes: 36, tier: "should",
            summary: "LDA as supervised projection with the Fisher criterion worked; t-SNE's objective, perplexity and what its plots do and do not show; UMAP's assumptions; manifold learning; why none of them are input features.",
            keywords: ["lda", "fisher criterion", "t-sne", "perplexity", "umap", "manifold learning", "lle", "visualisation"] }
        ]
      },

      /* ================================================================
         PHASE 4 · MAKING MODELS GOOD
         ================================================================ */
      {
        id: "tuning",
        short: "M8",
        dir: "08_tuning",
        phase: "Phase 4 · Making models good",
        title: "Tuning, Imbalance and Selection",
        blurb: "Searching hyperparameters without fooling yourself, handling a class at 2 %, reading learning curves, and choosing a model with a framework instead of a habit.",
        outcome: "You can run a random search that beats a grid, apply SMOTE without leaking it into validation, read a learning curve for the next action, and justify a model choice against a comparison table.",
        lessons: [
          { id: "8.1", title: "Hyperparameter Search", difficulty: "core", minutes: 38, tier: "must",
            summary: "Grid, random (and the probability argument for why it wins), Bayesian optimisation with TPE and expected improvement, successive halving and Hyperband, nested CV, refit, reproducibility and warm starts.",
            keywords: ["grid search", "random search", "bayesian optimisation", "optuna", "expected improvement", "successive halving", "hyperband", "nested cv", "refit"] },
          { id: "8.2", title: "Imbalanced Data", difficulty: "core", minutes: 40, tier: "must",
            summary: "Why accuracy lies at 2 %, random and SMOTE oversampling with the interpolation worked, ADASYN, Tomek and ENN cleaning, class weights, threshold moving, cost-sensitive learning, resampling inside the fold, and when not to resample.",
            keywords: ["imbalanced", "smote", "adasyn", "undersampling", "tomek", "class_weight", "scale_pos_weight", "threshold", "balanced accuracy", "imblearn pipeline"] },
          { id: "8.3", title: "Learning and Validation Curves", difficulty: "core", minutes: 28, tier: "should",
            summary: "Training and validation error against data size and against a hyperparameter; the four shapes and the action each implies — more data, more capacity, more regularisation, or stop.",
            keywords: ["learning curve", "validation curve", "high bias", "high variance", "more data", "diagnosis"] },
          { id: "8.4", title: "Choosing a Model, and AutoML", difficulty: "core", minutes: 32, tier: "should",
            summary: "The comparison table — data size, feature types, interpretability, latency, scaling needs — as a decision framework; an automated comparison harness; FLAML and H2O; when AutoML is the right first move.",
            keywords: ["model selection", "comparison table", "decision framework", "automl", "flaml", "h2o", "baseline"] },
          { id: "8.5", title: "Custom Estimators, Persistence and the Production Template", difficulty: "advanced", minutes: 32, tier: "should",
            summary: "Writing a transformer and an estimator that pass check_estimator, cloning and parameters, joblib and version pinning, ONNX, and the end-to-end template with CV, tuning, calibration and a saved artefact.",
            keywords: ["custom estimator", "baseestimator", "transformermixin", "check_estimator", "joblib", "onnx", "model persistence", "production template"] }
        ]
      },

      {
        id: "explain",
        short: "M9",
        dir: "09_explain_anomaly",
        phase: "Phase 4 · Making models good",
        title: "Interpretability and Anomaly Detection",
        blurb: "What a model is actually using, from permutation importance to Shapley values, and the methods that find the rows that do not belong.",
        outcome: "You can compute a Shapley value by hand for three features, choose between SHAP, LIME and PDP for a question, and build an anomaly detector that is evaluated without labels.",
        lessons: [
          { id: "9.1", title: "Global Explanations: Importance, PDP and ALE", difficulty: "core", minutes: 34, tier: "must",
            summary: "The interpretability taxonomy; permutation importance computed and its correlated-feature trap; partial dependence and why ALE fixes its extrapolation; the H-statistic for interactions.",
            keywords: ["interpretability", "explainability", "permutation importance", "partial dependence", "ale", "h-statistic", "global vs local"] },
          { id: "9.2", title: "SHAP, LIME, Anchors and Counterfactuals", difficulty: "advanced", minutes: 42, tier: "must",
            summary: "Shapley values from the axioms, worked for three features; TreeSHAP and KernelSHAP; the plots; LIME's local surrogate and its instability; anchors; counterfactuals with DiCE; SHAP against LIME.",
            keywords: ["shap", "shapley values", "treeshap", "kernelshap", "lime", "anchors", "counterfactual", "dice", "local explanation"] },
          { id: "9.3", title: "Explaining Deep Models and Serving Explanations", difficulty: "advanced", minutes: 30, tier: "should",
            summary: "Grad-CAM, integrated gradients, LRP and attention maps; spurious correlations found by explanation; the explanation API, caching, monitoring explanations in production.",
            keywords: ["grad-cam", "integrated gradients", "lrp", "attention", "spurious correlation", "explanation api", "monitoring explanations"] },
          { id: "9.4", title: "Anomaly Detection: Statistical and Distance Methods", difficulty: "core", minutes: 36, tier: "must",
            summary: "Outliers versus novelties; z-score, modified z-score, IQR, Grubbs and Mahalanobis worked; KNN distance, DBSCAN noise and the Local Outlier Factor with its ratio computed.",
            keywords: ["anomaly detection", "outlier", "novelty", "z-score", "iqr", "grubbs", "mahalanobis", "lof", "local outlier factor"] },
          { id: "9.5", title: "Isolation Forest, One-Class SVM, Autoencoders and Fraud", difficulty: "advanced", minutes: 40, tier: "must",
            summary: "Path length and the anomaly score, extended isolation forest, One-Class SVM, autoencoder reconstruction error, COPOD and ECOD, PyOD, evaluation without labels, the contamination parameter, streaming and drift, and a fraud system end to end.",
            keywords: ["isolation forest", "contamination", "one-class svm", "autoencoder", "reconstruction error", "pyod", "copod", "streaming", "fraud detection"] }
        ]
      },

      /* ================================================================
         PHASE 5 · TIME SERIES
         ================================================================ */
      {
        id: "timeseries",
        short: "M10",
        dir: "10_time_series",
        phase: "Phase 5 · Time series",
        title: "Time Series Forecasting",
        blurb: "The whole job on one series: hygiene, decomposition, stationarity, ACF and PACF by hand, baselines, ETS and ARIMA, the machine-learning route, intervals, backtesting and production.",
        outcome: "You can decompose a series by hand, read an ACF/PACF pair into an ARIMA order, beat a seasonal-naive baseline with a backtest that does not leak, and ship a forecast with an interval that means what it says.",
        lessons: [
          { id: "10.1", title: "Why Time Breaks Ordinary ML, and Getting the Data Right", difficulty: "foundation", minutes: 34, tier: "must",
            summary: "Autocorrelation, non-stationarity, the random split that lies; the seven hygiene checks in order, missing values and outliers versus events; classical decomposition worked on twelve numbers, STL and when multiplicative.",
            keywords: ["time series", "autocorrelation", "random split", "data hygiene", "decomposition", "trend", "seasonality", "stl", "multiplicative"] },
          { id: "10.2", title: "Stationarity, ACF and PACF by Hand", difficulty: "core", minutes: 40, tier: "must",
            summary: "The transformation ladder, differencing worked, ADF and KPSS and why you run both, the ADF regression from scratch; the ACF from its definition, the PACF and why it differs, and the table that reads the plots into a model.",
            keywords: ["stationarity", "differencing", "adf", "kpss", "unit root", "acf", "pacf", "ljung-box"] },
          { id: "10.3", title: "Baselines, Backtesting and Forecast Metrics", difficulty: "core", minutes: 36, tier: "must",
            summary: "Naive, seasonal naive, drift and mean; rolling-origin backtesting drawn and coded, the gap, refitting; MAE, RMSE, MAPE and its trap, sMAPE and MASE worked; the time-series leakage catalogue.",
            keywords: ["seasonal naive", "baseline", "backtesting", "rolling origin", "mase", "smape", "mape trap", "leakage"] },
          { id: "10.4", title: "Exponential Smoothing and ETS", difficulty: "core", minutes: 34, tier: "must",
            summary: "Simple exponential smoothing, Holt's trend and Holt–Winters, each iterated by hand on the series, the ETS taxonomy, damping, and the statsmodels forms.",
            keywords: ["exponential smoothing", "holt", "holt-winters", "ets", "damped trend", "level", "smoothing parameter"] },
          { id: "10.5", title: "ARIMA, SARIMA and SARIMAX", difficulty: "advanced", minutes: 42, tier: "must",
            summary: "AR, I and MA one at a time, a one-step forecast computed by hand, seasonal orders, AIC/BIC and auto_arima, exogenous regressors you know in advance, and the residual diagnostics people skip.",
            keywords: ["arima", "sarima", "sarimax", "ar", "ma", "aic", "bic", "auto_arima", "residual diagnostics", "exogenous"] },
          { id: "10.6", title: "The Machine-Learning Route and Multi-Step Strategies", difficulty: "advanced", minutes: 40, tier: "must",
            summary: "Reshaping a series into a supervised table, lag, rolling, calendar and cyclical features, gradient boosting done without leaking, recursive, direct and MIMO horizons, and when deep learning or a foundation model earns its cost.",
            keywords: ["lag features", "rolling features", "cyclical encoding", "gradient boosting", "recursive", "direct", "mimo", "lstm", "foundation model"] },
          { id: "10.7", title: "Intervals, Conformal Prediction and Probabilistic Forecasts", difficulty: "advanced", minutes: 34, tier: "should",
            summary: "Why the interval widens, four ways to get one, the pinball loss worked, conformal prediction with coverage guaranteed, and scoring a whole distribution with CRPS.",
            keywords: ["prediction interval", "quantile", "pinball loss", "conformal prediction", "coverage", "crps", "probabilistic forecast"] },
          { id: "10.8", title: "Multivariate, Hierarchical, Intermittent and Volatile Series", difficulty: "advanced", minutes: 36, tier: "should",
            summary: "VAR and Granger causality with their limits, cointegration; hierarchical reconciliation worked; Croston for intermittent demand; ARCH and GARCH; anomaly and changepoint detection with CUSUM from scratch.",
            keywords: ["var", "granger causality", "cointegration", "hierarchical forecasting", "reconciliation", "croston", "garch", "cusum", "changepoint"] },
          { id: "10.9", title: "Forecasting in Production: The Store-Sales Case", difficulty: "advanced", minutes: 36, tier: "must",
            summary: "Serving shapes, retraining cadence, what to monitor, the forecast-value-added review, the model chooser, and daily store sales taken from raw data to the result table that ends the review.",
            keywords: ["production forecasting", "retraining", "monitoring", "forecast value added", "model chooser", "case study", "prophet"] }
        ]
      },

      /* ================================================================
         PHASE 6 · PRODUCTION AND BEYOND
         ================================================================ */
      {
        id: "beyond",
        short: "M11",
        dir: "11_beyond",
        phase: "Phase 6 · Production and beyond",
        title: "Production, Probability and the Wider Field",
        blurb: "Serving and monitoring, the Bayesian and online views, recommenders, text with classical models, neural nets from the ML side, fairness and causality, ML system design, and the interview.",
        outcome: "You can design the serving and monitoring for a model, explain MAP against MLE and what a Gaussian process gives you, build a matrix-factorisation recommender, and answer the system-design round with a structure.",
        lessons: [
          { id: "11.1", title: "Serving, Monitoring and Drift", difficulty: "core", minutes: 38, tier: "must",
            summary: "Batch, real-time and streaming inference, a FastAPI service, training–serving skew, data and concept drift with two-sample tests and ADWIN, shadow and canary deployment, A/B tests for models, rollback, model cards and registries.",
            keywords: ["model serving", "batch inference", "real-time", "fastapi", "training-serving skew", "concept drift", "data drift", "shadow deployment", "canary", "model registry", "feature store"] },
          { id: "11.2", title: "Bayesian Machine Learning and Gaussian Processes", difficulty: "advanced", minutes: 40, tier: "should",
            summary: "Bayes against frequentist, MLE and MAP, Bayesian linear regression with a posterior worked, Gaussian processes and kernels with a posterior drawn, variational inference and MCMC in outline, PyMC, Bayesian optimisation's acquisition, Thompson sampling.",
            keywords: ["bayesian", "map", "prior", "posterior", "bayesian linear regression", "gaussian process", "kernel", "variational inference", "mcmc", "pymc", "thompson sampling"] },
          { id: "11.3", title: "Online and Federated Learning", difficulty: "advanced", minutes: 32, tier: "should",
            summary: "Online versus batch, partial_fit and River, regret, concept drift detection, then FedAvg worked on two clients, non-IID data, differential privacy and secure aggregation, Flower.",
            keywords: ["online learning", "partial_fit", "river", "regret", "federated learning", "fedavg", "differential privacy", "non-iid", "flower"] },
          { id: "11.4", title: "Recommender Systems", difficulty: "advanced", minutes: 38, tier: "should",
            summary: "User- and item-based collaborative filtering computed on a small matrix, matrix factorisation by ALS and SGD, implicit feedback and BPR, content-based and hybrid, cold start, NDCG and MAP for evaluation, explore–exploit.",
            keywords: ["recommender", "collaborative filtering", "matrix factorisation", "als", "implicit feedback", "bpr", "content-based", "cold start", "ndcg", "bandit"] },
          { id: "11.5", title: "Text with Classical Models", difficulty: "core", minutes: 34, tier: "should",
            summary: "Tokenising, stemming and lemmatising; bag of words, TF-IDF worked, the hashing trick; Naive Bayes and linear SVM for text; cosine similarity and BM25; topic models with LDA; the text pipeline in sklearn.",
            keywords: ["tf-idf", "bag of words", "tokenisation", "lemmatisation", "hashing vectorizer", "linear svm", "cosine similarity", "bm25", "lda topic model"] },
          { id: "11.6", title: "Neural Networks from the ML Side", difficulty: "core", minutes: 36, tier: "should",
            summary: "The perceptron and the MLP, activations, forward pass and backpropagation worked on two weights, learning rate and batch size, weight decay and dropout, MLPClassifier, and when a network beats gradient boosting on tables.",
            keywords: ["mlp", "perceptron", "activation", "backpropagation", "batch size", "weight decay", "dropout", "mlpclassifier", "tabular"] },
          { id: "11.7", title: "Fairness, Causality and ML System Design", difficulty: "advanced", minutes: 38, tier: "should",
            summary: "Bias measurement and the impossibility theorem; DAGs, potential outcomes, propensity scores and uplift; then the system-design round — feature stores, labelling systems, scaling training, a recommendation or fraud system — with a structure to answer it.",
            keywords: ["fairness", "algorithmic bias", "causal inference", "dag", "propensity score", "uplift", "ml system design", "feature store", "labelling system", "scalability"] },
          { id: "11.8", title: "The Interview: Classics and Cases", difficulty: "advanced", minutes: 44, tier: "must",
            summary: "The questions every round asks — bias–variance, L1 vs L2, precision–recall, gradient boosting internals, class imbalance, from-scratch implementations — and the cases: telecom churn, real-time fraud, drift monitoring, a new problem from nothing.",
            keywords: ["interview", "from scratch", "gradient descent from scratch", "k-means from scratch", "auc from scratch", "churn", "fraud", "case study", "new problem"] }
        ]
      }
,

      /* ================================================================
         PRACTICE and INTERVIEW tracks — generated by .build/import-banks.py
         from tutorial-hub/04_Machine_Learning/Practice and 00_Interview_Bank.
         ================================================================ */
      {
        id: "sc_fund", short: "P1", dir: "01_sc_fund", track: "practice", numPrefix: "P",
        phase: "Practice \u00b7 Programs and scenarios",
        title: "Fundamentals: Programs and Scenarios",
        blurb: "One hundred scikit-learn sample programs, then the fundamentals and cross-topic scenarios.",
        outcome: "You can write the scikit-learn for any standard step from memory and answer the basics with the mechanism.",
        source: "Practice/01_Fundamentals.md",
        lessons: [
          { id: "p1.1", title: "Programs · 1", difficulty: "foundation", minutes: 50, tier: "should",
            summary: "25 programs with hidden answers, from fundamentals: programs and scenarios.",
            keywords: ["fundamentals", "programs", "scenarios"] },
          { id: "p1.2", title: "Programs · 2", difficulty: "foundation", minutes: 50, tier: "should",
            summary: "25 programs with hidden answers, from fundamentals: programs and scenarios.",
            keywords: ["fundamentals", "programs", "scenarios"] },
          { id: "p1.3", title: "Programs · 3", difficulty: "foundation", minutes: 50, tier: "should",
            summary: "25 programs with hidden answers, from fundamentals: programs and scenarios.",
            keywords: ["fundamentals", "programs", "scenarios"] },
          { id: "p1.4", title: "Programs · 4", difficulty: "foundation", minutes: 50, tier: "should",
            summary: "25 programs with hidden answers, from fundamentals: programs and scenarios.",
            keywords: ["fundamentals", "programs", "scenarios"] },
          { id: "p1.5", title: "Scenarios · 1", difficulty: "foundation", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers, from fundamentals: programs and scenarios.",
            keywords: ["fundamentals", "programs", "scenarios"] },
          { id: "p1.6", title: "Scenarios · 2", difficulty: "foundation", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers, from fundamentals: programs and scenarios.",
            keywords: ["fundamentals", "programs", "scenarios"] },
          { id: "p1.7", title: "Scenarios · 3", difficulty: "foundation", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers, from fundamentals: programs and scenarios.",
            keywords: ["fundamentals", "programs", "scenarios"] },
          { id: "p1.8", title: "Scenarios · 4", difficulty: "foundation", minutes: 44, tier: "should",
            summary: "22 scenarios with hidden answers, from fundamentals: programs and scenarios.",
            keywords: ["fundamentals", "programs", "scenarios"] }
        ]
      },
      {
        id: "sc_prep", short: "P2", dir: "02_sc_prep", track: "practice", numPrefix: "P",
        phase: "Practice \u00b7 Programs and scenarios",
        title: "Preprocessing and Feature Engineering",
        blurb: "Scaling, encoding, missing data, feature construction and selection.",
        outcome: "You can prepare a table for a model without leaking the answer into it.",
        source: "Practice/02_Preprocessing_and_Feature_Engineering.md",
        lessons: [
          { id: "p2.1", title: "Preprocessing and Feature Engineering · 1", difficulty: "core", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["preprocessing", "feature", "engineering"] },
          { id: "p2.2", title: "Preprocessing and Feature Engineering · 2", difficulty: "core", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["preprocessing", "feature", "engineering"] },
          { id: "p2.3", title: "Preprocessing and Feature Engineering · 3", difficulty: "core", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["preprocessing", "feature", "engineering"] },
          { id: "p2.4", title: "Preprocessing and Feature Engineering · 4", difficulty: "core", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["preprocessing", "feature", "engineering"] }
        ]
      },
      {
        id: "sc_reg", short: "P3", dir: "03_sc_reg", track: "practice", numPrefix: "P",
        phase: "Practice \u00b7 Programs and scenarios",
        title: "Regression and Classification",
        blurb: "Linear and logistic regression, gradient descent and the classification questions.",
        outcome: "You can explain a coefficient, a loss and an optimiser step on a number.",
        source: "Practice/03_Regression.md",
        lessons: [
          { id: "p3.1", title: "Regression and Classification · 1", difficulty: "core", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["regression", "classification"] },
          { id: "p3.2", title: "Regression and Classification · 2", difficulty: "core", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["regression", "classification"] },
          { id: "p3.3", title: "Regression and Classification · 3", difficulty: "core", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["regression", "classification"] },
          { id: "p3.4", title: "Regression and Classification · 4", difficulty: "core", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["regression", "classification"] }
        ]
      },
      {
        id: "sc_trees", short: "P4", dir: "04_sc_trees", track: "practice", numPrefix: "P",
        phase: "Practice \u00b7 Programs and scenarios",
        title: "Trees and Ensembles",
        blurb: "Decision trees, random forests and boosting.",
        outcome: "You can say why a forest and a boosted model fail differently.",
        source: "Practice/04_Trees_and_Ensembles.md",
        lessons: [
          { id: "p4.1", title: "Trees and Ensembles · 1", difficulty: "core", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["trees", "ensembles"] },
          { id: "p4.2", title: "Trees and Ensembles · 2", difficulty: "core", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["trees", "ensembles"] },
          { id: "p4.3", title: "Trees and Ensembles · 3", difficulty: "core", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["trees", "ensembles"] },
          { id: "p4.4", title: "Trees and Ensembles · 4", difficulty: "core", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["trees", "ensembles"] }
        ]
      },
      {
        id: "sc_svm", short: "P5", dir: "05_sc_svm", track: "practice", numPrefix: "P",
        phase: "Practice \u00b7 Programs and scenarios",
        title: "SVM, KNN and Naive Bayes",
        blurb: "Margins and kernels, distance and neighbours, and the Bayes classifiers.",
        outcome: "You can pick between the three on a description of the data.",
        source: "Practice/05_SVM_KNN_NaiveBayes.md",
        lessons: [
          { id: "p5.1", title: "SVM, KNN and Naive Bayes · 1", difficulty: "core", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["naive", "bayes"] },
          { id: "p5.2", title: "SVM, KNN and Naive Bayes · 2", difficulty: "core", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["naive", "bayes"] },
          { id: "p5.3", title: "SVM, KNN and Naive Bayes · 3", difficulty: "core", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["naive", "bayes"] },
          { id: "p5.4", title: "SVM, KNN and Naive Bayes · 4", difficulty: "core", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["naive", "bayes"] }
        ]
      },
      {
        id: "sc_cluster", short: "P6", dir: "06_sc_cluster", track: "practice", numPrefix: "P",
        phase: "Practice \u00b7 Programs and scenarios",
        title: "Clustering and Dimensionality Reduction",
        blurb: "K-means, hierarchical and density clustering, PCA and the manifold methods.",
        outcome: "You can choose k, judge a clustering and explain what PCA keeps.",
        source: "Practice/06_Clustering_and_DimReduction.md",
        lessons: [
          { id: "p6.1", title: "Clustering and Dimensionality Reduction · 1", difficulty: "core", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["clustering", "dimensionality", "reduction"] },
          { id: "p6.2", title: "Clustering and Dimensionality Reduction · 2", difficulty: "core", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["clustering", "dimensionality", "reduction"] },
          { id: "p6.3", title: "Clustering and Dimensionality Reduction · 3", difficulty: "core", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["clustering", "dimensionality", "reduction"] },
          { id: "p6.4", title: "Clustering and Dimensionality Reduction · 4", difficulty: "core", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["clustering", "dimensionality", "reduction"] }
        ]
      },
      {
        id: "sc_eval", short: "P7", dir: "07_sc_eval", track: "practice", numPrefix: "P",
        phase: "Practice \u00b7 Programs and scenarios",
        title: "Model Evaluation and Tuning",
        blurb: "Metrics, cross-validation and hyperparameter search.",
        outcome: "You can defend a metric choice and a validation scheme.",
        source: "Practice/07_Model_Evaluation_and_Tuning.md",
        lessons: [
          { id: "p7.1", title: "Model Evaluation and Tuning · 1", difficulty: "core", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["model", "evaluation", "tuning"] },
          { id: "p7.2", title: "Model Evaluation and Tuning · 2", difficulty: "core", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["model", "evaluation", "tuning"] },
          { id: "p7.3", title: "Model Evaluation and Tuning · 3", difficulty: "core", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["model", "evaluation", "tuning"] },
          { id: "p7.4", title: "Model Evaluation and Tuning · 4", difficulty: "core", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["model", "evaluation", "tuning"] }
        ]
      },
      {
        id: "sc_imb", short: "P8", dir: "08_sc_imb", track: "practice", numPrefix: "P",
        phase: "Practice \u00b7 Programs and scenarios",
        title: "Imbalanced Data, Time Series and Recommenders",
        blurb: "Resampling and cost-sensitive learning, forecasting, and recommendation.",
        outcome: "You can handle a 3 % class, a seasonal series and a cold-start user.",
        source: "Practice/08_Imbalanced_TimeSeries_Recommenders.md",
        lessons: [
          { id: "p8.1", title: "Imbalanced Data, Time Series and Recommenders · 1", difficulty: "advanced", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["imbalanced", "data", "time", "series", "recommenders"] },
          { id: "p8.2", title: "Imbalanced Data, Time Series and Recommenders · 2", difficulty: "advanced", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["imbalanced", "data", "time", "series", "recommenders"] },
          { id: "p8.3", title: "Imbalanced Data, Time Series and Recommenders · 3", difficulty: "advanced", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["imbalanced", "data", "time", "series", "recommenders"] },
          { id: "p8.4", title: "Imbalanced Data, Time Series and Recommenders · 4", difficulty: "advanced", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["imbalanced", "data", "time", "series", "recommenders"] },
          { id: "p8.5", title: "Imbalanced Data, Time Series and Recommenders · 5", difficulty: "advanced", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["imbalanced", "data", "time", "series", "recommenders"] },
          { id: "p8.6", title: "Imbalanced Data, Time Series and Recommenders · 6", difficulty: "advanced", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["imbalanced", "data", "time", "series", "recommenders"] }
        ]
      },
      {
        id: "sc_nlp", short: "P9", dir: "09_sc_nlp", track: "practice", numPrefix: "P",
        phase: "Practice \u00b7 Programs and scenarios",
        title: "NLP and Neural Networks",
        blurb: "Text features and the neural-network fundamentals seen from the ML side.",
        outcome: "You can vectorise text and explain a small network's training.",
        source: "Practice/09_NLP_and_Neural_Networks.md",
        lessons: [
          { id: "p9.1", title: "NLP and Neural Networks · 1", difficulty: "core", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["neural", "networks"] },
          { id: "p9.2", title: "NLP and Neural Networks · 2", difficulty: "core", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["neural", "networks"] },
          { id: "p9.3", title: "NLP and Neural Networks · 3", difficulty: "core", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["neural", "networks"] },
          { id: "p9.4", title: "NLP and Neural Networks · 4", difficulty: "core", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["neural", "networks"] }
        ]
      },
      {
        id: "sc_pipe", short: "P10", dir: "10_sc_pipe", track: "practice", numPrefix: "P",
        phase: "Practice \u00b7 Programs and scenarios",
        title: "Pipelines, Deployment and Advanced",
        blurb: "Pipelines, persistence, serving, monitoring and the advanced edge cases.",
        outcome: "You can ship a model and know what will go wrong first.",
        source: "Practice/10_Pipelines_Deployment_and_Advanced.md",
        lessons: [
          { id: "p10.1", title: "Pipelines, Deployment and Advanced · 1", difficulty: "advanced", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["pipelines", "deployment", "advanced"] },
          { id: "p10.2", title: "Pipelines, Deployment and Advanced · 2", difficulty: "advanced", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["pipelines", "deployment", "advanced"] },
          { id: "p10.3", title: "Pipelines, Deployment and Advanced · 3", difficulty: "advanced", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["pipelines", "deployment", "advanced"] },
          { id: "p10.4", title: "Pipelines, Deployment and Advanced · 4", difficulty: "advanced", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["pipelines", "deployment", "advanced"] }
        ]
      },
      {
        id: "iv_ml", short: "I1", dir: "01_iv_ml", track: "interview", numPrefix: "I",
        phase: "Interview \u00b7 Question banks",
        title: "Core ML Interview Bank",
        blurb: "Core machine-learning concept questions plus the scikit-learn API questions.",
        outcome: "You can answer a core ML question with the definition, the formula and the trade-off.",
        source: "00_Interview_Bank/01_ML_Core_Interview.md",
        lessons: [
          { id: "i1.1", title: "Basics & Fundamentals", difficulty: "advanced", minutes: 40, tier: "should",
            summary: "20 questions with hidden answers, from core ml interview bank.",
            keywords: ["core", "interview", "bank"] },
          { id: "i1.2", title: "Algorithms", difficulty: "advanced", minutes: 60, tier: "should",
            summary: "30 questions with hidden answers, from core ml interview bank.",
            keywords: ["core", "interview", "bank"] },
          { id: "i1.3", title: "Feature Engineering & Data", difficulty: "advanced", minutes: 30, tier: "should",
            summary: "15 questions with hidden answers, from core ml interview bank.",
            keywords: ["core", "interview", "bank"] },
          { id: "i1.4", title: "Model Evaluation & Deployment", difficulty: "advanced", minutes: 30, tier: "should",
            summary: "15 questions with hidden answers, from core ml interview bank.",
            keywords: ["core", "interview", "bank"] },
          { id: "i1.5", title: "Advanced Topics", difficulty: "advanced", minutes: 40, tier: "should",
            summary: "20 questions with hidden answers, from core ml interview bank.",
            keywords: ["core", "interview", "bank"] },
          { id: "i1.6", title: "Ensemble Methods & Boosting — Advanced", difficulty: "advanced", minutes: 40, tier: "should",
            summary: "20 questions with hidden answers, from core ml interview bank.",
            keywords: ["core", "interview", "bank"] },
          { id: "i1.7", title: "Optimization & Training Dynamics", difficulty: "advanced", minutes: 40, tier: "should",
            summary: "20 questions with hidden answers, from core ml interview bank.",
            keywords: ["core", "interview", "bank"] },
          { id: "i1.8", title: "Bayesian & Probabilistic ML", difficulty: "advanced", minutes: 30, tier: "should",
            summary: "15 questions with hidden answers, from core ml interview bank.",
            keywords: ["core", "interview", "bank"] },
          { id: "i1.9", title: "ML System Design & Scalability", difficulty: "advanced", minutes: 40, tier: "should",
            summary: "20 questions with hidden answers, from core ml interview bank.",
            keywords: ["core", "interview", "bank"] },
          { id: "i1.10", title: "Fairness, Causality & Advanced Topics", difficulty: "advanced", minutes: 52, tier: "should",
            summary: "26 questions with hidden answers, from core ml interview bank.",
            keywords: ["core", "interview", "bank"] },
          { id: "i1.11", title: "Scikit-Learn Q&A · 1", difficulty: "advanced", minutes: 50, tier: "should",
            summary: "25 questions with hidden answers, from core ml interview bank.",
            keywords: ["core", "interview", "bank"] },
          { id: "i1.12", title: "Scikit-Learn Q&A · 2", difficulty: "advanced", minutes: 38, tier: "should",
            summary: "19 questions with hidden answers, from core ml interview bank.",
            keywords: ["core", "interview", "bank"] }
        ]
      },
      {
        id: "iv_glass", short: "I2", dir: "02_iv_glass", track: "interview", numPrefix: "I",
        phase: "Interview \u00b7 Question banks",
        title: "Glassdoor Data Scientist and ML Engineer",
        blurb: "Real Glassdoor questions for Data Scientist and ML Engineer roles: SQL, statistics, coding, ML theory, product sense, A/B testing, system design, MLOps and behavioural.",
        outcome: "You have seen the question before it is asked.",
        source: "00_Interview_Bank/02_Glassdoor_DS_and_MLE.md",
        lessons: [
          { id: "i2.1", title: "SQL & Database · Probability & Statistics · Coding & Algorithms", difficulty: "advanced", minutes: 20, tier: "should",
            summary: "9 questions with hidden answers, from glassdoor data scientist and ml engineer.",
            keywords: ["glassdoor", "data", "scientist", "engineer"] },
          { id: "i2.2", title: "Machine Learning Concepts · Product & Business Sense · A/B Testing & Experimentation · System Design for DS · Behavioral · Additional SQL & Data Analysis", difficulty: "advanced", minutes: 24, tier: "should",
            summary: "12 questions with hidden answers, from glassdoor data scientist and ml engineer.",
            keywords: ["glassdoor", "data", "scientist", "engineer"] },
          { id: "i2.3", title: "Additional Probability & Statistics · Additional Machine Learning", difficulty: "advanced", minutes: 20, tier: "should",
            summary: "8 questions with hidden answers, from glassdoor data scientist and ml engineer.",
            keywords: ["glassdoor", "data", "scientist", "engineer"] },
          { id: "i2.4", title: "Additional Product & Business Sense · Additional A/B Testing · Additional System Design for Data Science · Additional Behavioral & Scenarios · Additional Statistics & Probability", difficulty: "advanced", minutes: 22, tier: "should",
            summary: "11 questions with hidden answers, from glassdoor data scientist and ml engineer.",
            keywords: ["glassdoor", "data", "scientist", "engineer"] },
          { id: "i2.5", title: "Coding & Algorithms · Machine Learning Theory · Data Structures · Computer Vision & NLP", difficulty: "advanced", minutes: 20, tier: "should",
            summary: "9 questions with hidden answers, from glassdoor data scientist and ml engineer.",
            keywords: ["glassdoor", "data", "scientist", "engineer"] },
          { id: "i2.6", title: "System Design for ML · MLOps & Production · Math & Optimization · Behavioral & Projects · Additional Coding & ML Implementation", difficulty: "advanced", minutes: 26, tier: "should",
            summary: "13 questions with hidden answers, from glassdoor data scientist and ml engineer.",
            keywords: ["glassdoor", "data", "scientist", "engineer"] },
          { id: "i2.7", title: "Additional ML Theory & Depth · Additional System Design for ML · Additional MLOps & Production", difficulty: "advanced", minutes: 20, tier: "should",
            summary: "8 questions with hidden answers, from glassdoor data scientist and ml engineer.",
            keywords: ["glassdoor", "data", "scientist", "engineer"] },
          { id: "i2.8", title: "Additional Math & Optimization · Additional Behavioral & ML Projects · Additional Model Deployment & Serving", difficulty: "advanced", minutes: 20, tier: "should",
            summary: "5 questions with hidden answers, from glassdoor data scientist and ml engineer.",
            keywords: ["glassdoor", "data", "scientist", "engineer"] }
        ]
      }
    ]
  });
})();
