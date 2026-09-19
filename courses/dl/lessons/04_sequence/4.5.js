/* ============================================================================
   LESSON 4.5 — Sequence Models in PyTorch
   ========================================================================= */
EC.receiveLesson({
  id: "4.5",

  lede: "**Three sequences of lengths 5, 3 and 7 padded to length 7 and run through an LSTM give the wrong final state for the short one — it was computed after four steps of padding — and packing fixes that exactly.** This lesson is the PyTorch contract for sequences: what nn.RNN, nn.LSTM and nn.GRU return, how padding, packing and masking work and what each gets wrong, what an embedding layer is, and then the two projects from the reference: sentiment on a corpus built to punish bag-of-words models (0.63 for the mean-embedding baseline, 1.00 for the recurrent models, decided by the word 'not'), and a 14-day sales forecast where an LSTM beats the seasonal-naive baseline by four units of MAE and loses to the ML course's SARIMAX by a point and a half of WAPE.",

  objectives: [
    "Read the output and state shapes of nn.RNN, nn.LSTM and nn.GRU, including layers and directions",
    "Pad, pack and mask variable-length batches and show what padding without packing does to the final state",
    "Explain nn.Embedding as a lookup and its padding index",
    "Train a sequence classifier (the sentiment project) and read where bag-of-words fails",
    "Build a windowed multi-step forecaster (the stock-price project on real sales data), with the naive baselines that must be beaten"
  ],

  prerequisites: ["4.4", "2.2"],

  blocks: [

    { t: "h2", n: "01", text: "Shapes", id: "shapes" },

    { t: "code", lang: "text", title: "What the three modules return for a (batch 4, T 10, features 8) input with hidden 16 (executed)",
      code: `nn.RNN                        output (4, 10, 16)   h_n (1, 4, 16)                        (layers × directions, batch, hidden)
nn.LSTM, num_layers=2         output (4, 10, 16)   h_n (2, 4, 16)   c_n (2, 4, 16)       one state per layer
nn.GRU, bidirectional         output (4, 10, 32)   h_n (2, 4, 16)                        output is forward ‖ backward; one state per direction

output[:, -1] is the top layer's state at the last step; h_n[-1] is the same for a unidirectional network — not for a bidirectional one,
whose h_n[-1] is the backward direction's state at step 0`,
      caption: "output holds every step of the *last* layer; h_n holds the *final* state of every layer and direction. For classification take h_n[-1] (unidirectional) or concatenate h_n[-2] and h_n[-1] (bidirectional); for tagging use output. The bidirectional output doubles the feature size because the two directions are concatenated at each step." },

    { t: "h2", n: "02", text: "Padding, packing, masking", id: "packing" },

    { t: "p", text: "Sequences in a batch have different lengths and a tensor cannot. pad_sequence fills the short ones with zeros; but an RNN run on the padded tensor keeps stepping through the zeros, and the final state it reports for a short sequence is not the state at that sequence's end:" },

    { t: "code", lang: "text", title: "Three sequences of lengths 5, 3, 7 (executed)",
      code: `padded shape (3, 7, 8)
packed data shape (15, 8) = (sum of lengths, features);  batch_sizes per step [3, 3, 3, 2, 2, 1, 1]

final state for sequence 1 (length 3):
  from the padded run:   [−0.059, 0.059, 0.102]      -- computed after four extra steps of zeros: wrong
  from the packed run:   [−0.214, 0.032, 0.182]      == the padded run's output at its true last step (t = 2)
padded outputs beyond each length are zero after pad_packed_sequence: True
masked mean-pooling over the valid steps: (out · mask).sum(1) / lengths -> (3, 16)`,
      caption: "pack_padded_sequence reorders the data so that at each time step only the sequences still alive are processed — the batch_sizes list is the schedule — and h_n is then each sequence's state at its own last step. The alternative is to gather output[i, lengths[i] − 1] by hand, which works for a unidirectional network; for a bidirectional one the backward direction would still start from the padding, so packing is the only correct route." },

    { t: "code", lang: "python", title: "The pattern",
      code: `packed = pack_padded_sequence(emb(ids), lengths.cpu(), batch_first=True, enforce_sorted=False)
out_packed, (h_n, c_n) = lstm(packed)
out, lens = pad_packed_sequence(out_packed, batch_first=True)      # back to (B, T, H), zeros beyond each length
mask = torch.arange(T)[None] < lengths[:, None]                     # (B, T) True where valid -- for pooling and for attention (5.1)`,
      caption: "lengths must be on the CPU; enforce_sorted=False lets you skip sorting the batch by length. Masks are the same idea for anything that is not a recurrence: pooling, attention, and losses (ignore_index for padded targets)." },

    { t: "code", lang: "text", title: "nn.Embedding (executed)",
      code: `nn.Embedding(1000, 32):  a lookup table of shape (1000, 32) = 32,000 parameters
ids (2, 4) -> vectors (2, 4, 32)
padding_idx=0:  row 0 is all zeros and receives no gradient: True
emb(ids) == one_hot(ids) @ weight: True     -- the lookup is a matrix product with a one-hot, done without the multiply`,
      caption: "An embedding layer is the first weight matrix of a network whose input is one-hot, indexed instead of multiplied. Lesson 4.8 is about what those rows learn; here they are trained with the task." },

    { t: "h2", n: "03", text: "The sentiment project", id: "sentiment" },

    { t: "p", text: "The reference's second project is sentiment with all four families (the transformer arrives in 5.2). No review dataset is available offline, so the corpus is generated from templates with two devices that separate models: negation ('the cast was very not good' → negative) in 35 % of sentences, and a distractor clause with its own adjective ('… and the plot was boring') in 30 %. A model that averages word vectors cannot handle either:" },

    { t: "code", lang: "text", title: "6,000 sentences, 32-word vocabulary, 5,000 train / 1,000 test, 8 epochs (executed)",
      code: `bag of words (mean embedding + linear)     test acc 0.630     on negated sentences 0.064
vanilla RNN                                test acc 1.000     on negated sentences 1.000
LSTM                                       test acc 1.000     on negated sentences 1.000
bidirectional LSTM                         test acc 1.000     on negated sentences 1.000`,
      caption: "The bag-of-words model gets negated sentences wrong 94 % of the time — it sees 'good' and votes positive, and 'not' is a word like any other. The recurrent models read 'not' before 'good' and flip. On a corpus this regular the three recurrent models tie at 100 %; on real reviews the LSTM's margin over the vanilla RNN is the vanishing-gradient story of 4.2, and the bidirectional model's margin is context from both sides." },

    { t: "code", lang: "python", title: "The classifier",
      code: `class RNNClf(nn.Module):
    def __init__(self, kind="lstm", bidir=False):
        self.emb = nn.Embedding(V, 32, padding_idx=0)
        self.rnn = nn.LSTM(32, 32, batch_first=True, bidirectional=bidir)
        self.out = nn.Linear(32 * (2 if bidir else 1), 2)
    def forward(self, ids, lens):
        packed = pack_padded_sequence(self.emb(ids), lens.cpu(), batch_first=True, enforce_sorted=False)
        _, (h, c) = self.rnn(packed)                                     # h: (directions, B, 32)
        return self.out(torch.cat([h[-2], h[-1]], 1) if bidir else h[-1])`,
      caption: "Embedding, packed recurrence, final state, linear. The whole model is 3,400 parameters at this vocabulary; a real one differs in the embedding table's size and in the pretrained vectors it starts from (4.8)." },

    { t: "h2", n: "04", text: "The forecasting project", id: "forecast" },

    { t: "p", text: "The reference's third project predicts stock prices with RNN, LSTM and GRU. Stock prices are the wrong dataset for a lesson — a random walk's best forecast is its last value and any model that appears to beat it is fitting noise — so the project runs on the store-sales series from the ML course, which has weekly seasonality, promotions and holidays worth modelling. The task: from 56 days of daily sales, predict the next 14. Baselines first, as always:" },

    { t: "code", lang: "text", title: "Store A, 912 days, windows of 56 → 14, the last 120 days held out (executed)",
      code: `723 training windows, 107 test windows;  sales mean 228.7, std 54.3

baselines, MAE over the 14-day horizon:
  last value repeated                       53.64
  seasonal naive (same weekday last week)   25.54

LSTM, 2 layers, direct 14-step output, 40 epochs:                    MAE 21.22        by horizon day 1 / 7 / 14: 19.36 / 20.57 / 21.96
LSTM + weekday one-hot and known-future promo / holiday flags:       MAE 21.03
WAPE:  7.8 % (with features), 7.9 % (without);  the ML course's SARIMAX on this series family: ~6.3 %`,
      caption: "The LSTM beats the seasonal-naive baseline by four units and the last-value baseline by thirty, and the error grows only gently across the horizon because the output head predicts all fourteen days at once (direct strategy) rather than feeding predictions back (recursive, which compounds errors). The calendar features helped little because the weekly pattern is already visible in a 56-day window. And the honest comparison: the ML course's SARIMAX, which models the seasonality explicitly, is still a point and a half better — on a single clean series with 900 points, a statistical model with the right structure beats a network that has to discover it." },

    { t: "dl", items: [
      ["Windowing", "Standardise with the training split's statistics; slide a window of L inputs and H targets over the series; the test windows come from the held-out tail only. Never shuffle across the split boundary."],
      ["Direct vs recursive multi-step", "Direct: one head predicts all H steps (used here; errors do not compound, but each horizon is a separate output). Recursive: predict one step, append, repeat (compounds errors; one model for any horizon). Seq2seq (4.6) is the third option."],
      ["Known-future covariates", "Calendar, promotions and holidays are known for the forecast horizon; append their future rows to the input so the model can see a promotion before it happens. The sales series here needed little help because the window already showed the weekly cycle."],
      ["Multivariate series", "Stack the stores or the sensors as input channels; a shared model learns cross-series structure (a global model, as in the ML course's boosting forecaster)."],
      ["Irregular series", "Add the time gap as an input feature, or use a continuous-time model (2.6's Neural ODE as a latent ODE)."],
      ["The baselines", "Last value and seasonal naive are the floor; a model that cannot beat them has learned nothing, and on random-walk data — stock prices — nothing beats them, which is why that project's usual demo is an illusion."]
    ] },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "Why was the final state of the length-3 sequence wrong when the padded batch was run without packing?",
          options: [
            "Because padding uses NaN",
            "Because the recurrence kept stepping through the four padding zeros after the sequence ended, so h_n reported the state after seven steps rather than three; packing processes only the live sequences at each step and returns each one's state at its own last step, equal to output[1, 2] of the padded run",
            "Because the LSTM was not bidirectional",
            "Because the batch was not sorted by length"
          ],
          answer: 1,
          why: "Zeros are still inputs, and the state keeps evolving. For a unidirectional network one can gather output[i, len_i − 1] instead; for bidirectional networks the backward pass would start in the padding, so packing (or masking every step) is the only correct route."
        },
        {
          stem: "The bag-of-words model scored 0.063 on negated sentences and the RNN 1.000. What is the mechanism?",
          options: [
            "The RNN has more parameters",
            "Averaging word vectors discards order, so 'not good' and 'good' produce nearly the same vector and the model votes on the adjective; a recurrent model reads 'not' into its state before 'good' arrives and can flip the meaning — order is exactly what the bag of words throws away",
            "The bag-of-words model was under-trained",
            "Negated sentences are shorter"
          ],
          answer: 1,
          why: "The ML course's classical text models (11.5) handle negation only through n-gram features; the recurrent model handles it by construction. The distractor clause is the same lesson: which adjective governs the sentence is a matter of position."
        },
        {
          stem: "Why does the lesson forecast store sales rather than stock prices, as the reference project does?",
          options: [
            "Because stock data are not available",
            "Because a stock price is close to a random walk, whose best forecast is the last value; a network that appears to beat it is fitting noise, and the result cannot be distinguished from luck. Sales have weekly seasonality, promotions and holidays — structure a model can learn, and baselines (seasonal naive 25.5) that it must beat honestly (LSTM 21.2)",
            "Because sales series are longer",
            "Because the LSTM cannot handle prices"
          ],
          answer: 1,
          why: "The naive baseline is the test of whether a forecaster has learned anything. On the sales series the LSTM passes it and still loses to a SARIMAX that encodes the seasonality directly — the honest ranking on one clean series."
        }
      ] },

    { t: "exercise",
      kind: "Implement",
      title: "Packing, the sentiment classifier, and the forecaster with its baselines",
      difficulty: "core",
      minutes: 30,
      body: [
        { t: "p", text: "**(a)** Pad three random sequences of lengths 5, 3, 7 (8 features), run an LSTM on the padded tensor and on the packed version, and show that the packed final state of the short sequence equals the padded run's output at its true last step." },
        { t: "p", text: "**(b)** Generate a templated sentiment corpus with negation and a distractor clause; train a mean-embedding baseline, a vanilla RNN, an LSTM and a bidirectional LSTM (8 epochs) and report overall and negated-sentence accuracy." },
        { t: "p", text: "**(c)** Load the store-sales series (store A), build 56 → 14 windows with the last 120 days held out, compute the last-value and seasonal-naive MAE, train a two-layer LSTM with a direct 14-step head, and report its MAE overall and at horizons 1, 7 and 14." }
      ],
      requirements: [
        "(a) the two final states and the equality.",
        "(b) four rows of two accuracies.",
        "(c) two baselines and four LSTM numbers."
      ],
      hint: "(a) pack_padded_sequence(..., enforce_sorted=False); compare h_n[0, 1] with out_padded[1, 2]. (b) Track which test sentences contain 'not' for the second metric. (c) Standardise with the training split's mean and std and report MAE in original units.",
      solution: {
        lang: "python",
        title: "Executed solution",
        code: `# (a) padded run, sequence 1 final state:  [−0.059, 0.059, 0.102]
#     packed run:                            [−0.214, 0.032, 0.182]  == padded output at t = 2  [−0.214, 0.032, 0.182]

# (b) bag of words 0.630 / negated 0.064;  vanilla RNN 1.000 / 1.000;  LSTM 1.000 / 1.000;  BiLSTM 1.000 / 1.000

# (c) baselines: last value MAE 53.64, seasonal naive 25.54
#     LSTM (2 layers, direct 14-step): MAE 21.22;  day 1 / 7 / 14: 19.36 / 20.57 / 21.96;  with calendar and promo features 21.03`,
        notes: [
          { t: "p", text: "(a) is the bug that produces silently degraded sequence classifiers; the equality is the test that catches it." },
          { t: "p", text: "(b) shows what order buys, on a corpus built to make the difference visible." },
          { t: "p", text: "(c) is the forecasting discipline of the ML course applied to a network: baselines, a held-out tail, and an honest comparison with the statistical model." }
        ]
      }
    }
  ],

  takeaways: [
    "output is every step of the last layer, (B, T, H·directions); h_n (and c_n) is the final state of every layer and direction, (layers·directions, B, H); h_n[-1] equals output[:, -1] only for a unidirectional network.",
    "Padded sequences keep stepping through their zeros: the length-3 sequence's padded final state was [−0.059, 0.059, 0.102] against the correct [−0.214, 0.032, 0.182] from packing, which processes only live sequences at each step (batch_sizes [3, 3, 3, 2, 2, 1, 1]).",
    "nn.Embedding is a lookup into a (V, d) table, equal to a one-hot matrix product; padding_idx keeps a zero row that receives no gradient.",
    "Sentiment on a corpus with negation and distractor clauses: mean-embedding 0.630 (0.064 on negated sentences), every recurrent model 1.000 — order is what the bag of words discards.",
    "Sales forecasting, 56 → 14 days: last value MAE 53.6, seasonal naive 25.5, LSTM with a direct multi-step head 21.2 (19.4 at day 1, 22.0 at day 14), 21.0 with calendar and promo features; WAPE 7.8 % against the ML course's SARIMAX at 6.3 %.",
    "Stock prices are a random walk whose best forecast is the last value; the reference's stock project is replaced by a series with structure, and the baselines are what make any result meaningful."
  ],

  quiz: {
    title: "Sequence Models in PyTorch — Knowledge Check",
    questions: [
      {
        stem: "For a two-layer bidirectional LSTM with hidden 16 on a (4, 10, 8) input, what are the shapes of output and h_n, and which entries give the sentence representation for classification?",
        options: [
          "output (4, 10, 16), h_n (2, 4, 16); use h_n[-1]",
          "output (4, 10, 32), h_n (4, 4, 16) — layers × directions = 4; concatenate h_n[-2] (top layer, forward) and h_n[-1] (top layer, backward) for a 32-dimensional representation",
          "output (4, 10, 32), h_n (2, 4, 32); use output[:, -1]",
          "output (10, 4, 32), h_n (4, 4, 16); use output[-1]"
        ],
        answer: 1,
        why: "h_n stacks (layer, direction) pairs in order; the last two are the top layer's forward and backward final states. output[:, -1] would give the forward state at the end and the backward state at its *start*, which is not the representation you want."
      },
      {
        stem: "What does pack_padded_sequence's batch_sizes = [3, 3, 3, 2, 2, 1, 1] mean?",
        options: [
          "The batch is split into seven mini-batches",
          "At time steps 0–2 all three sequences are processed, at steps 3–4 only the two with length ≥ 5, and at steps 5–6 only the one of length 7 — the recurrence runs on exactly the live sequences at each step, so each sequence's final state is taken at its own end",
          "The sequences are padded to lengths 3, 2 and 1",
          "The batch is sorted by length in descending order"
        ],
        answer: 1,
        why: "Packing reorders the data time-major with a shrinking batch; cuDNN executes it as a sequence of smaller steps. It is why the packed final state matched the padded run's output at the true last step exactly."
      },
      {
        stem: "Why does the direct multi-step strategy produce an error that grows only from 19.4 to 22.0 across a 14-day horizon?",
        options: [
          "Because sales are easy to predict",
          "Because all fourteen outputs are predicted from the input window at once, so no prediction is fed back as an input; the recursive strategy would feed day 1's forecast in to predict day 2, and its errors compound along the horizon",
          "Because the LSTM has two layers",
          "Because of the calendar features"
        ],
        answer: 1,
        why: "Direct forecasting trades compounding error for a fixed horizon and separate output heads; seq2seq decoding (4.6) is the middle path. The ML course's forecasting module compared the same strategies for statistical models."
      },
      {
        stem: "The LSTM forecaster's WAPE was 7.8 % and the ML course's SARIMAX's about 6.3 %. What is the fair reading?",
        options: [
          "The LSTM is broken",
          "On a single clean series with ~900 points and known weekly seasonality, a statistical model that encodes the structure directly can beat a network that must learn it from windows; networks earn their place with many series, rich covariates or non-linear interactions — the regime argument of 1.1 again",
          "SARIMAX cannot use covariates",
          "WAPE is not comparable across models"
        ],
        answer: 1,
        why: "Both beat the seasonal-naive baseline; the ranking between them is a property of the data's size and structure. The honest comparison is the one to report, and it is why the ML course keeps classical forecasters in the toolbox."
      },
      {
        stem: "Which change turns the sentiment classifier into a tagger (one label per token)?",
        options: [
          "Use h_n instead of output",
          "Apply the output linear layer to every step of output (B, T, H) instead of to the final state, mask or ignore_index the padded positions in the loss, and optionally add a CRF over the label sequence (4.7)",
          "Remove the embedding layer",
          "Use a unidirectional LSTM"
        ],
        answer: 1,
        why: "Many-to-one against one-to-one in 4.1's taxonomy: the same recurrence, a different read-out. The mask keeps padded steps out of the loss, and a bidirectional encoder is the usual choice since every tag can use both contexts."
      }
    ]
  },

  interview: {
    title: "Interview Questions — Sequence Models in PyTorch",
    sub: "Shapes, padding and packing, embeddings, the sentiment and forecasting projects with their baselines.",
    questions: [
      {
        level: "Core",
        q: "How do you handle variable-length sequences in an RNN?",
        strong: "Pad the batch to the longest sequence, then pack it. Padding alone is wrong: the recurrence keeps stepping through the padding zeros, so for a length-3 sequence in a batch padded to 7 the final state h_n was [−0.059, 0.059, 0.102] instead of the correct [−0.214, 0.032, 0.182]. pack_padded_sequence reorders the data so that at each time step only the still-live sequences are processed — batch_sizes [3, 3, 3, 2, 2, 1, 1] for lengths 5, 3, 7 — and the returned h_n is each sequence's state at its own last step, which I verified equals the padded run's output at t = 2. pad_packed_sequence restores a (B, T, H) tensor with zeros beyond each length for tagging or pooling. For a unidirectional network one can instead gather output[i, len_i − 1]; for a bidirectional one the backward direction would start inside the padding, so packing is the correct route. Lengths go on the CPU, enforce_sorted=False avoids sorting, and a (B, T) mask built from the lengths handles pooling, attention and the loss (ignore_index on padded targets).",
        answer: [
          { t: "p", text: "Pad then pack, the executed wrong and right states, the batch_sizes schedule, the bidirectional case, and masks." }
        ]
      },
      {
        level: "Core",
        q: "Walk me through a sentiment classifier and why a bag of words fails.",
        strong: "Tokenise, map words to ids with 0 reserved for padding, and embed them with nn.Embedding(V, d, padding_idx=0) — a lookup table that is the first weight matrix of a one-hot network. Pack the embedded batch, run an LSTM, take the final hidden state (the concatenated top-layer forward and backward states if bidirectional), and apply a linear layer to two logits. On a corpus built with negation in 35 % of sentences and a distractor clause in 30 %, a mean-embedding baseline scored 0.630 overall and 0.064 on negated sentences, while the vanilla RNN, LSTM and bidirectional LSTM all scored 1.000. The baseline fails because averaging discards order: 'not good' and 'good' give nearly the same vector, so the model votes on the adjective it sees; the recurrent models read 'not' into their state before 'good' arrives and flip. On real reviews the models would separate further — the LSTM over the RNN through longer dependencies, the bidirectional model through right-hand context — and pretrained embeddings (4.8) would matter with a real vocabulary.",
        answer: [
          { t: "p", text: "The pipeline, the executed comparison, the order argument, and what changes on real data." }
        ]
      },
      {
        level: "Advanced",
        q: "How would you forecast a time series with an LSTM, and how do you know it worked?",
        strong: "Standardise with the training split's statistics, slide a window of L inputs and H targets over the series — I used 56 days in and 14 out on daily store sales — and hold out the tail for testing so no window crosses the boundary. Compute the baselines before any model: repeating the last value gave MAE 53.6 and the seasonal naive (same weekday last week) 25.5. Then a two-layer LSTM reading the window and a linear head predicting all 14 days at once — the direct strategy, so errors do not compound — with clipping and early evaluation on the held-out windows: MAE 21.2, from 19.4 at day 1 to 22.0 at day 14. Known-future covariates (weekday one-hots, promotion and holiday flags for the horizon) appended to the input gave 21.0 — little, because the window already shows the weekly cycle. It worked in the sense that matters: it beat the seasonal-naive baseline. It did not beat the ML course's SARIMAX on the same series (WAPE 7.8 % against 6.3 %), which encodes the seasonality directly, and I would report that rather than hide it — on one clean series a structured statistical model wins; the network's case is many series, rich covariates and non-linear effects. And I would not run the reference's stock-price version, because a random walk's best forecast is its last value and any apparent win is noise.",
        answer: [
          { t: "p", text: "Windowing and the split, the baselines, the model and strategy, the executed numbers, the honest comparison, and the random-walk caveat." }
        ]
      }
    ]
  }
});
