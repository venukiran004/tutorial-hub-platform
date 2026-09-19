/* ============================================================================
   DEEP LEARNING — CURRICULUM
   ----------------------------------------------------------------------------
   The course mirrors the reference folder tutorial-hub/05_Deep_Learning file
   for file and section for section, in the reference's own order, rewritten
   in this site's voice. Nothing is added to the topic list and nothing in
   the reference is left out:

     LEARN track (one module per reference file, one lesson per section or
     per run of short adjacent sections; each file's interview section is
     folded into the interview block of the lesson it belongs to)

       M1  01_Neural_Network_Fundamentals.md   §1–20 → 1.1–1.14, §21 → interview blocks
       M2  02_CNNs.md                          §1–18 → 2.1–2.13, §19 → interview blocks
       M3  03_Sequence_Models.md               §1–18 → 3.1–3.13, §19 → interview blocks
       M4  rnn-lstm-gru-transformer-guide.md   §1–11 → 4.1–4.10, §12 → interview blocks
       M5  Architectures/{ann,cnn,rnn,lstm,gru}.md → 5.1–5.5
       M6  08_Audio_Speech_Processing.md       §1–18 → 6.1–6.9, §19 → interview blocks
       M7  30_DL_Training_Instability.md       → 7.1–7.4

     PRACTICE track (Practice/00–10, imported by .build/import-banks.py:
       67 PyTorch programs run with their output, 1,000 scenarios)

     INTERVIEW track (00_Interview_Bank: 200 questions + Glassdoor, imported)

   Every program in the learn track is the reference's own, run on this
   machine (CPU, PyTorch 2.10, TensorFlow 2.21); the printed output beneath
   a program is what it printed. Where a program could not run here — a
   missing library, a dataset that is not local — the lesson says so.
   ========================================================================= */
(function () {
  EC.defineCourse({
    id: "dl",
    title: "Deep Learning",
    short: "DL",
    blurb: "Neural-network fundamentals, CNNs, sequence models, the ANN-to-transformer guide with its four projects, the five architectures worked by hand, audio and speech, training instability — then a thousand scenarios, sixty-seven PyTorch programs and the interview banks.",

    trackLabels: { learn: "Deep Learning", practice: "Practice", interview: "Interview" },
    trackBlurbs: {
      learn: "The reference notes, section by section — every formula worked on a number, every program run.",
      practice: "Sixty-seven PyTorch programs with their output, and a thousand scenario questions with the answers folded away.",
      interview: "Two hundred senior-level questions and the real Glassdoor AI Engineer questions, answers hidden until you ask."
    },

    published: ["1.1", "i1.1", "i1.2", "i1.3", "i1.4", "i1.5", "i1.6", "i1.7", "i1.8", "i1.9", "i1.10", "i2.1", "i2.2", "i2.3", "p1.1", "p1.2", "p1.3", "p2.1", "p2.2", "p2.3", "p2.4", "p3.1", "p3.2", "p3.3", "p3.4", "p3.5", "p3.6", "p4.1", "p4.2", "p4.3", "p4.4", "p5.1", "p5.2", "p6.1", "p6.2", "p6.3", "p6.4", "p6.5", "p6.6", "p7.1", "p7.2", "p7.3", "p7.4", "p7.5", "p7.6", "p8.1", "p8.2", "p9.1", "p9.2", "p10.1", "p10.2", "p10.3", "p10.4", "p10.5", "p10.6", "p11.1", "p11.2"],

    modules: [

      /* ================================================================
         M1 · 01_Neural_Network_Fundamentals.md
         ================================================================ */
      {
        id: "fundamentals",
        short: "M1",
        dir: "01_fundamentals",
        phase: "Phase 1 · Neural network fundamentals",
        title: "Neural Network Fundamentals",
        blurb: "The perceptron and the MLP, activations, forward propagation and the losses, backpropagation derived in full, the optimisers from SGD to AdamW, initialisation, regularisation, the normalisations, gradients that vanish or explode, schedules — then the network built in NumPy, Keras and PyTorch, debugged, and taken as far as Neural ODEs.",
        outcome: "You can derive and run a neural network from the neuron up, name what each training technique changes, and explain it in an interview.",
        source: "01_Neural_Network_Fundamentals.md",
        lessons: [
          { id: "1.1", title: "Neural Network Architecture", difficulty: "foundation", minutes: 30, tier: "must",
            summary: "The perceptron and why it cannot learn XOR, the multi-layer perceptron, the universal approximation theorem and what it does not promise, and counting parameters.",
            keywords: ["perceptron", "mlp", "xor", "universal approximation", "parameter count", "depth", "width"] },
          { id: "1.2", title: "Activation Functions", difficulty: "foundation", minutes: 30, tier: "must",
            summary: "Sigmoid, tanh, ReLU and its variants, GELU and SiLU — formula, range, derivative and failure mode — with the rule for which to use where and the dead-neuron problem.",
            keywords: ["activation", "relu", "sigmoid", "tanh", "gelu", "swish", "dead neuron", "leaky relu"] },
          { id: "1.3", title: "Forward Propagation and Loss Functions", difficulty: "foundation", minutes: 32, tier: "must",
            summary: "The forward pass in matrix form with a numerical example, then the losses: cross-entropy and its binary form, MSE, MAE and Huber, focal loss and hinge loss.",
            keywords: ["forward propagation", "matrix", "cross-entropy", "mse", "huber", "focal loss", "hinge"] },
          { id: "1.4", title: "Backpropagation, Derived in Full", difficulty: "core", minutes: 38, tier: "must",
            summary: "The chain rule, the complete derivation for a two-layer network, and the computational-graph view that makes automatic differentiation mechanical.",
            keywords: ["backpropagation", "chain rule", "gradient", "computational graph", "autograd", "delta"] },
          { id: "1.5", title: "Optimisers: SGD to AdamW", difficulty: "core", minutes: 34, tier: "must",
            summary: "SGD with momentum, Nesterov, RMSprop, Adam with its bias correction, and AdamW's decoupled weight decay — each update rule written out and compared.",
            keywords: ["sgd", "momentum", "nesterov", "rmsprop", "adam", "adamw", "weight decay", "optimizer"] },
          { id: "1.6", title: "Weight Initialisation", difficulty: "core", minutes: 26, tier: "must",
            summary: "Why the starting weights decide whether signals and gradients survive depth; Xavier and He initialisation derived from the variance argument.",
            keywords: ["initialization", "xavier", "glorot", "he", "kaiming", "variance", "symmetry"] },
          { id: "1.7", title: "Regularisation", difficulty: "core", minutes: 34, tier: "must",
            summary: "L2 weight decay, dropout and its inverted form, Monte Carlo dropout for uncertainty, and early stopping — what each does to the weights and when to use it.",
            keywords: ["regularization", "l2", "weight decay", "dropout", "mc dropout", "early stopping", "overfitting"] },
          { id: "1.8", title: "Batch Norm, Layer Norm, and the Gradients that Vanish or Explode", difficulty: "core", minutes: 34, tier: "must",
            summary: "Batch normalisation and layer normalisation — the forward pass, the learned scale and shift, train versus eval — then why gradients shrink or blow up through depth and every fix.",
            keywords: ["batch norm", "layer norm", "normalization", "vanishing gradient", "exploding gradient", "residual"] },
          { id: "1.9", title: "Learning-Rate Schedules", difficulty: "core", minutes: 26, tier: "must",
            summary: "Step decay, exponential, cosine annealing, warm-up, one-cycle and reduce-on-plateau — the schedule shapes, the PyTorch schedulers, and the rule for picking one.",
            keywords: ["learning rate", "schedule", "cosine", "warmup", "one cycle", "step decay", "plateau"] },
          { id: "1.10", title: "A Neural Network from Scratch in NumPy", difficulty: "core", minutes: 36, tier: "must",
            summary: "The reference's NumPy network — forward pass, cross-entropy, backward pass and the update — run on XOR, with what it printed.",
            keywords: ["numpy", "from scratch", "forward", "backward", "xor", "training loop"] },
          { id: "1.11", title: "The Same Network in Keras and PyTorch", difficulty: "core", minutes: 34, tier: "must",
            summary: "The reference's Keras model and PyTorch module side by side: the layers, the compile and fit calls, the explicit PyTorch training loop, and what each printed when run.",
            keywords: ["keras", "pytorch", "nn.module", "training loop", "compile", "fit", "dataloader"] },
          { id: "1.12", title: "Debugging Neural Networks and Gradient Clipping", difficulty: "core", minutes: 30, tier: "must",
            summary: "The symptom-to-cause table for a run that will not train, the overfit-one-batch test, gradient monitoring, and gradient clipping by norm and by value.",
            keywords: ["debugging", "overfit one batch", "gradient clipping", "clip_grad_norm", "nan", "loss not decreasing"] },
          { id: "1.13", title: "Label Smoothing, Knowledge Distillation and Mixed Precision", difficulty: "advanced", minutes: 30, tier: "should",
            summary: "Three training techniques the reference collects: soft targets, a student learning from a teacher's temperature-scaled logits, and float16 training with loss scaling.",
            keywords: ["label smoothing", "knowledge distillation", "temperature", "mixed precision", "autocast", "grad scaler"] },
          { id: "1.14", title: "Neural ODEs", difficulty: "advanced", minutes: 34, tier: "should",
            summary: "ResNets as Euler steps, the continuous-depth network, the adjoint method for memory-efficient backpropagation, and continuous normalising flows.",
            keywords: ["neural ode", "residual", "euler", "adjoint", "continuous depth", "normalizing flow", "ffjord"] }
        ]
      },

      /* ================================================================
         M2 · 02_CNNs.md
         ================================================================ */
      {
        id: "cnns",
        short: "M2",
        dir: "02_cnns",
        phase: "Phase 2 · Images and sequences",
        title: "Convolutional Neural Networks",
        blurb: "The convolution operation and its arithmetic, pooling and receptive fields, the architectures from LeNet to ConvNeXt, the innovations that made them work, transfer learning and augmentation, detection, segmentation and Grad-CAM — then a CNN in NumPy, PyTorch and Keras, deployed, plus transposed and dilated convolutions and GANs in overview.",
        outcome: "You can compute any convolution's output size and parameter count, explain each landmark architecture's contribution, and build, train and explain a CNN.",
        source: "02_CNNs.md",
        lessons: [
          { id: "2.1", title: "The Convolution Operation", difficulty: "foundation", minutes: 32, tier: "must",
            summary: "What a convolution computes, the output-size formula worked on numbers, the parameter count, and why local connectivity and weight sharing suit images.",
            keywords: ["convolution", "kernel", "stride", "padding", "output size", "parameter sharing", "feature map"] },
          { id: "2.2", title: "Pooling and the Anatomy of a CNN", difficulty: "foundation", minutes: 28, tier: "must",
            summary: "Max, average and global average pooling, the conv–norm–activation–pool block, and the receptive field computed layer by layer.",
            keywords: ["pooling", "max pool", "global average pooling", "receptive field", "architecture", "block"] },
          { id: "2.3", title: "Famous Architectures: LeNet to ConvNeXt", difficulty: "core", minutes: 38, tier: "must",
            summary: "The evolution — LeNet, AlexNet, VGG, Inception, ResNet, DenseNet, EfficientNet, ConvNeXt — with the residual block derived and compound scaling explained.",
            keywords: ["lenet", "alexnet", "vgg", "inception", "resnet", "densenet", "efficientnet", "convnext"] },
          { id: "2.4", title: "Key Architectural Innovations", difficulty: "core", minutes: 30, tier: "must",
            summary: "1×1 convolutions, depthwise-separable convolutions and their cost saving worked out, and attention inside CNNs with the squeeze-and-excitation block.",
            keywords: ["1x1 convolution", "depthwise separable", "mobilenet", "squeeze excitation", "channel attention", "bottleneck"] },
          { id: "2.5", title: "Transfer Learning", difficulty: "core", minutes: 30, tier: "must",
            summary: "Feature extraction versus fine-tuning, which layers to freeze, discriminative learning rates, and the PyTorch pattern for a pretrained backbone.",
            keywords: ["transfer learning", "fine-tuning", "feature extraction", "freeze", "pretrained", "imagenet"] },
          { id: "2.6", title: "Data Augmentation", difficulty: "core", minutes: 24, tier: "must",
            summary: "The geometric and photometric transforms, Mixup, CutMix and Cutout, the torchvision pipeline, and which augmentations are wrong for which task.",
            keywords: ["augmentation", "flip", "crop", "mixup", "cutmix", "cutout", "torchvision transforms"] },
          { id: "2.7", title: "Object Detection and Non-Maximum Suppression", difficulty: "advanced", minutes: 34, tier: "must",
            summary: "Two-stage and one-stage detectors, anchors, IoU computed by hand, the detection losses, and NMS as the reference implements it.",
            keywords: ["object detection", "yolo", "faster r-cnn", "iou", "anchor", "nms", "non-maximum suppression"] },
          { id: "2.8", title: "Image Segmentation", difficulty: "advanced", minutes: 26, tier: "should",
            summary: "Semantic, instance and panoptic segmentation, the encoder–decoder with skip connections, U-Net, and the Dice and IoU losses.",
            keywords: ["segmentation", "u-net", "fcn", "dice", "semantic", "instance", "mask r-cnn"] },
          { id: "2.9", title: "Grad-CAM", difficulty: "advanced", minutes: 28, tier: "should",
            summary: "Visual explanation from the gradients of a class score with respect to the last convolutional feature maps — the formula, the hooks, the heat map.",
            keywords: ["grad-cam", "explainability", "saliency", "hooks", "feature map", "heatmap"] },
          { id: "2.10", title: "A CNN from Scratch in NumPy", difficulty: "core", minutes: 34, tier: "must",
            summary: "The reference's NumPy convolution, max pool and their backward passes, run on a small input with the shapes and values checked.",
            keywords: ["numpy", "convolution forward", "convolution backward", "max pool", "from scratch"] },
          { id: "2.11", title: "CNNs in PyTorch and Keras", difficulty: "core", minutes: 34, tier: "must",
            summary: "The reference's PyTorch CNN with its training loop and the Keras equivalent, run on the data at hand, with the printed results.",
            keywords: ["pytorch", "keras", "conv2d", "training loop", "cifar", "mnist", "model"] },
          { id: "2.12", title: "Production Deployment", difficulty: "advanced", minutes: 24, tier: "should",
            summary: "TorchScript and ONNX export, quantisation for inference, and the serving considerations the reference lists.",
            keywords: ["deployment", "torchscript", "onnx", "quantization", "inference", "serving"] },
          { id: "2.13", title: "Transposed and Dilated Convolutions, and GANs in Overview", difficulty: "advanced", minutes: 30, tier: "should",
            summary: "Upsampling with transposed convolutions and their checkerboard risk, dilated convolutions for a larger receptive field at no cost, and the GAN as the reference introduces it.",
            keywords: ["transposed convolution", "deconvolution", "dilated", "atrous", "gan", "generator", "discriminator"] }
        ]
      },

      /* ================================================================
         M3 · 03_Sequence_Models.md
         ================================================================ */
      {
        id: "sequence",
        short: "M3",
        dir: "03_sequence",
        phase: "Phase 2 · Images and sequences",
        title: "Sequence Models: RNN, LSTM, GRU",
        blurb: "The vanilla RNN and its task shapes, BPTT and the vanishing gradient, the LSTM gate by gate, the GRU and the comparison, bidirectional and stacked models, seq2seq, attention from Bahdanau to self-attention, beam search, CTC, padding and packing — then RNN and LSTM in NumPy, four PyTorch tasks, Keras, RNN versus transformer, and word embeddings.",
        outcome: "You can write the recurrence, the gates and the attention scores, run each in NumPy and PyTorch, and choose the sequence model for a task.",
        source: "03_Sequence_Models.md",
        lessons: [
          { id: "3.1", title: "The Vanilla RNN", difficulty: "foundation", minutes: 28, tier: "must",
            summary: "The recurrence h_t = tanh(W_hh h_{t-1} + W_xh x_t + b), the unrolled view, the parameter count, and the one-to-many, many-to-one and many-to-many shapes.",
            keywords: ["rnn", "recurrence", "hidden state", "unrolled", "many-to-one", "sequence"] },
          { id: "3.2", title: "BPTT and the Vanishing Gradient in RNNs", difficulty: "core", minutes: 32, tier: "must",
            summary: "Backpropagation through time in full and truncated, the product of Jacobians that shrinks or explodes, and what each remedy addresses.",
            keywords: ["bptt", "truncated bptt", "vanishing gradient", "exploding gradient", "jacobian", "clipping"] },
          { id: "3.3", title: "LSTM", difficulty: "core", minutes: 38, tier: "must",
            summary: "The forget, input and output gates and the cell state — equations, gate-by-gate intuition, why the additive cell path keeps gradients alive, and the parameter count.",
            keywords: ["lstm", "forget gate", "input gate", "output gate", "cell state", "gradient highway"] },
          { id: "3.4", title: "GRU, and LSTM versus GRU", difficulty: "core", minutes: 28, tier: "must",
            summary: "The reset and update gates, the GRU equations against the LSTM's, and the comparison that decides between them.",
            keywords: ["gru", "reset gate", "update gate", "lstm vs gru", "parameters"] },
          { id: "3.5", title: "Bidirectional and Stacked Architectures", difficulty: "core", minutes: 24, tier: "must",
            summary: "Reading a sequence both ways and stacking recurrent layers — the shapes, the doubled hidden size, and when each helps.",
            keywords: ["bidirectional", "stacked", "deep rnn", "num_layers", "hidden size"] },
          { id: "3.6", title: "Sequence-to-Sequence", difficulty: "core", minutes: 28, tier: "must",
            summary: "The encoder–decoder architecture, the context vector bottleneck, and teacher forcing with its exposure-bias cost.",
            keywords: ["seq2seq", "encoder", "decoder", "context vector", "teacher forcing", "exposure bias"] },
          { id: "3.7", title: "The Attention Mechanism", difficulty: "advanced", minutes: 40, tier: "must",
            summary: "Bahdanau's additive and Luong's multiplicative attention, attention written from scratch, self-attention, and positional encoding.",
            keywords: ["attention", "bahdanau", "luong", "self-attention", "positional encoding", "alignment"] },
          { id: "3.8", title: "Beam Search and CTC Loss", difficulty: "advanced", minutes: 30, tier: "should",
            summary: "Decoding with a beam rather than greedily, length normalisation, and the connectionist temporal classification loss for unaligned sequences.",
            keywords: ["beam search", "decoding", "ctc", "blank", "alignment", "greedy"] },
          { id: "3.9", title: "Padding, Packing and Masking", difficulty: "core", minutes: 26, tier: "must",
            summary: "Variable-length batches in PyTorch: pad_sequence, pack_padded_sequence, the mask in the loss, and the mistakes that silently train on padding.",
            keywords: ["padding", "packing", "pack_padded_sequence", "mask", "variable length", "batch"] },
          { id: "3.10", title: "An RNN from Scratch in NumPy", difficulty: "core", minutes: 34, tier: "must",
            summary: "The reference's NumPy RNN with forward pass, BPTT and gradient clipping, run and checked.",
            keywords: ["numpy", "rnn", "bptt", "from scratch", "character model"] },
          { id: "3.11", title: "An LSTM from Scratch in NumPy", difficulty: "advanced", minutes: 34, tier: "must",
            summary: "The reference's NumPy LSTM cell — gates, cell state and the backward pass through them — run with shapes and values checked.",
            keywords: ["numpy", "lstm", "gates", "backward", "from scratch"] },
          { id: "3.12", title: "PyTorch Implementations: Four Tasks", difficulty: "core", minutes: 40, tier: "must",
            summary: "The reference's sentiment classifier (many-to-one), sequence labeller (many-to-many), time-series forecaster and seq2seq with attention, each run.",
            keywords: ["pytorch", "sentiment", "ner", "time series", "seq2seq", "attention", "nn.lstm"] },
          { id: "3.13", title: "Keras, RNN versus Transformer, and Word Embeddings", difficulty: "core", minutes: 30, tier: "should",
            summary: "The Keras recurrent models, the head-to-head that explains why transformers replaced RNNs for most tasks, and word embeddings from one-hot to Word2Vec.",
            keywords: ["keras", "transformer", "rnn vs transformer", "embedding", "word2vec", "glove"] }
        ]
      },

      /* ================================================================
         M4 · rnn-lstm-gru-transformer-guide.md
         ================================================================ */
      {
        id: "guide",
        short: "M4",
        dir: "04_guide",
        phase: "Phase 3 · The guide and its projects",
        title: "ANN to Transformer: The Guide and Its Projects",
        blurb: "The reference's end-to-end guide: the sequential-data problem, the ANN, RNN, LSTM and GRU each with a real-time example, the transformer from motivation to multi-head attention, the comparison — and four projects run end to end: house prices, sentiment with all four models, stock prices, machine translation.",
        outcome: "You can build each of the five model families in PyTorch on a real task and say, from the comparison, which one a new task needs.",
        source: "rnn-lstm-gru-transformer-guide.md",
        lessons: [
          { id: "4.1", title: "The Sequential-Data Problem and the ANN", difficulty: "foundation", minutes: 34, tier: "must",
            summary: "Why sequences need their own architectures, then the ANN as the guide presents it — neuron, activations, forward pass, loss, backprop, optimiser — in PyTorch.",
            keywords: ["sequential data", "ann", "neuron", "activation", "backpropagation", "pytorch"] },
          { id: "4.2", title: "RNN", difficulty: "core", minutes: 30, tier: "must",
            summary: "The recurrence, the next-character example worked step by step, the problems with the vanilla RNN, and the guide's PyTorch RNN with its task shapes.",
            keywords: ["rnn", "next character", "hidden state", "nn.rnn", "vanishing gradient"] },
          { id: "4.3", title: "LSTM", difficulty: "core", minutes: 32, tier: "must",
            summary: "Motivation, the architecture, the three gates and the cell state, the sentiment-analysis walkthrough, and the guide's PyTorch LSTM.",
            keywords: ["lstm", "gates", "cell state", "sentiment", "nn.lstm"] },
          { id: "4.4", title: "GRU", difficulty: "core", minutes: 28, tier: "must",
            summary: "Motivation, the two gates and their equations, the comparison with the LSTM, the weather-prediction example, and the guide's PyTorch GRU.",
            keywords: ["gru", "reset gate", "update gate", "weather", "nn.gru"] },
          { id: "4.5", title: "The Transformer", difficulty: "advanced", minutes: 44, tier: "must",
            summary: "The problems with recurrence, the high-level architecture, self-attention as the core innovation, multi-head attention, positional encoding, the encoder and decoder blocks, and the guide's PyTorch transformer.",
            keywords: ["transformer", "self-attention", "multi-head", "positional encoding", "encoder", "decoder", "nn.transformer"] },
          { id: "4.6", title: "Comparison Summary", difficulty: "core", minutes: 22, tier: "must",
            summary: "The five architectures side by side — memory, parallelism, long-range dependence, parameter count at hidden size 256 — and the when-to-use-what table.",
            keywords: ["comparison", "when to use", "parameter count", "parallel", "long-range"] },
          { id: "4.7", title: "Project: House-Price Prediction with an ANN", difficulty: "core", minutes: 34, tier: "must",
            summary: "The guide's first real-time project, run end to end: data, scaling, the network, training, evaluation and the printed metrics.",
            keywords: ["project", "house price", "regression", "ann", "california housing", "mse"] },
          { id: "4.8", title: "Project: Sentiment Analysis with All Four Models", difficulty: "advanced", minutes: 40, tier: "must",
            summary: "One dataset, four models — ANN, RNN, LSTM, GRU — trained and compared as the guide does it, with what each printed.",
            keywords: ["project", "sentiment", "ann", "rnn", "lstm", "gru", "comparison"] },
          { id: "4.9", title: "Project: Stock-Price Prediction with RNN, LSTM and GRU", difficulty: "advanced", minutes: 36, tier: "must",
            summary: "Windowed time series, the three recurrent models trained and compared, and the caveats the guide attaches to forecasting prices.",
            keywords: ["project", "stock price", "time series", "window", "rnn", "lstm", "gru"] },
          { id: "4.10", title: "Project: Machine Translation with a Transformer", difficulty: "advanced", minutes: 40, tier: "must",
            summary: "Tokens, masks, the encoder–decoder transformer, teacher-forced training and greedy decoding, run on the guide's example pairs.",
            keywords: ["project", "translation", "transformer", "mask", "greedy decoding", "tokens"] }
        ]
      },

      /* ================================================================
         M5 · Architectures/ (one deep file each)
         ================================================================ */
      {
        id: "architectures",
        short: "M5",
        dir: "05_architectures",
        phase: "Phase 3 · The guide and its projects",
        title: "The Five Architectures, Worked by Hand",
        blurb: "The reference's one-file-per-architecture deep dives — ANN, CNN, RNN, LSTM, GRU — each in the same shape: TL;DR, definition, intuition, the maths with a worked numeric calculation, variants, failure modes and fixes, complexity, hyperparameters, PyTorch, comparison, interview drill and mistakes.",
        outcome: "You can carry a forward pass, a backward step and a gate update through by hand for each architecture and say what breaks it.",
        source: "Architectures/",
        lessons: [
          { id: "5.1", title: "ANN: Perceptron to MLP, by Hand", difficulty: "core", minutes: 36, tier: "must",
            summary: "One backprop step worked with numbers on a two-layer network, the universal approximation theorem, the failure modes, and the interview drill.",
            keywords: ["ann", "worked backprop", "mlp", "failure modes", "hyperparameters", "interview"] },
          { id: "5.2", title: "CNN, by Hand", difficulty: "core", minutes: 34, tier: "must",
            summary: "A convolution and a pooling step computed on a small grid, the output-size formula, channels and receptive field, the lineage, and the drill.",
            keywords: ["cnn", "worked convolution", "cross-correlation", "output size", "receptive field", "interview"] },
          { id: "5.3", title: "RNN, by Hand", difficulty: "core", minutes: 32, tier: "must",
            summary: "A forward pass through three steps with numbers, BPTT, the derivation of why gradients vanish or explode, the variants, and the drill.",
            keywords: ["rnn", "worked forward pass", "bptt", "vanishing", "variants", "interview"] },
          { id: "5.4", title: "LSTM, by Hand", difficulty: "advanced", minutes: 34, tier: "must",
            summary: "One LSTM step worked gate by gate with numbers, why the cell state beats vanishing gradients, the variants, and the drill.",
            keywords: ["lstm", "worked step", "gates", "cell state", "peephole", "interview"] },
          { id: "5.5", title: "GRU, by Hand", difficulty: "advanced", minutes: 30, tier: "must",
            summary: "One GRU step worked with numbers, the canonical GRU-versus-LSTM comparison, why it avoids vanishing gradients, and the drill.",
            keywords: ["gru", "worked step", "update gate", "reset gate", "gru vs lstm", "interview"] }
        ]
      },

      /* ================================================================
         M6 · 08_Audio_Speech_Processing.md
         ================================================================ */
      {
        id: "audio",
        short: "M6",
        dir: "06_audio",
        phase: "Phase 4 · Audio, and training that goes wrong",
        title: "Audio and Speech Processing",
        blurb: "From the sampled signal to frames, the mel scale and MFCCs, the whole front end in forty lines, self-supervised speech, the three ASR architectures, CTC worked and programmed, RNN-T and streaming, Whisper, decoding and language models, text to speech, VAD and diarisation, evaluation, robustness, deployment and pitfalls.",
        outcome: "You can turn a waveform into features, explain and run CTC, choose an ASR architecture, and evaluate a speech system with WER, CER, MOS and RTF.",
        source: "08_Audio_Speech_Processing.md",
        lessons: [
          { id: "6.1", title: "The Signal, and From Waveform to Frames", difficulty: "foundation", minutes: 30, tier: "must",
            summary: "Sampling, Nyquist and bit depth, then framing, windowing and the short-time Fourier transform — with the reference's code run on a synthetic tone.",
            keywords: ["sampling", "nyquist", "bit depth", "frame", "window", "stft", "spectrogram"] },
          { id: "6.2", title: "The Mel Scale and MFCCs", difficulty: "core", minutes: 28, tier: "must",
            summary: "Why the mel scale is not linear, the filterbank, log-mel features, and MFCCs with the DCT — and whether a modern model still needs them.",
            keywords: ["mel", "filterbank", "log-mel", "mfcc", "dct", "features"] },
          { id: "6.3", title: "The Whole Front End in Forty Lines", difficulty: "core", minutes: 30, tier: "must",
            summary: "The reference's complete feature pipeline — load, resample, STFT, mel, log, normalise — run, with the shapes at every stage.",
            keywords: ["front end", "torchaudio", "librosa", "pipeline", "resample", "normalise"] },
          { id: "6.4", title: "Self-Supervised Speech and the Three ASR Architectures", difficulty: "advanced", minutes: 28, tier: "should",
            summary: "wav2vec 2.0 and HuBERT — what they pretrain on and how — then CTC, attention encoder–decoder and RNN-T compared as the three ways to build a recogniser.",
            keywords: ["wav2vec", "hubert", "self-supervised", "asr", "ctc", "encoder-decoder", "rnn-t"] },
          { id: "6.5", title: "CTC, Worked and Programmed", difficulty: "advanced", minutes: 40, tier: "must",
            summary: "The alignment lattice, the collapse rule and the forward algorithm worked on a tiny example by hand, then the reference's CTC program run in PyTorch.",
            keywords: ["ctc", "blank", "alignment", "forward algorithm", "ctc loss", "greedy decoding"] },
          { id: "6.6", title: "RNN-T, Streaming, and Whisper", difficulty: "advanced", minutes: 30, tier: "should",
            summary: "The transducer's joint network and why it streams, latency versus accuracy, and Whisper's architecture, training data and use.",
            keywords: ["rnn-t", "transducer", "streaming", "whisper", "latency", "multilingual"] },
          { id: "6.7", title: "Decoding, Text to Speech, and VAD, Wake Words and Diarisation", difficulty: "advanced", minutes: 30, tier: "should",
            summary: "Beam search with a language model and biasing, the TTS pipeline from text to mel to vocoder, and the small models around a speech system.",
            keywords: ["decoding", "language model", "biasing", "tts", "vocoder", "vad", "wake word", "diarization"] },
          { id: "6.8", title: "Evaluation: WER, CER, MOS and RTF", difficulty: "core", minutes: 28, tier: "must",
            summary: "Word and character error rate computed by edit distance on an example, mean opinion score, real-time factor, and the reference's evaluation code run.",
            keywords: ["wer", "cer", "edit distance", "mos", "rtf", "evaluation"] },
          { id: "6.9", title: "Robustness, Deployment and Pitfalls", difficulty: "advanced", minutes: 26, tier: "should",
            summary: "Noise and augmentation, on-device constraints and quantisation, and the pitfalls the reference collects from real speech systems.",
            keywords: ["robustness", "augmentation", "specaugment", "on-device", "deployment", "pitfalls"] }
        ]
      },

      /* ================================================================
         M7 · 30_DL_Training_Instability.md
         ================================================================ */
      {
        id: "instability",
        short: "M7",
        dir: "07_instability",
        phase: "Phase 4 · Audio, and training that goes wrong",
        title: "Training Instability in Production",
        blurb: "The production issue the reference documents: why runs go unstable, the failure-mode map, NaN and Inf losses, exploding and vanishing gradients, loss spikes and divergence, dead ReLUs, mixed-precision pitfalls, distributed failures — with the monitoring, the decision flow and the checklist.",
        outcome: "You can name the cause of an unstable run from its symptoms and apply the fix the reference prescribes, in the order it prescribes it.",
        source: "30_DL_Training_Instability.md",
        lessons: [
          { id: "7.1", title: "Why Training Goes Unstable, and the Failure-Mode Map", difficulty: "core", minutes: 26, tier: "must",
            summary: "The definitions, the intuition for why deep training is a dynamical system that can leave its stable region, and the map from symptom to failure mode.",
            keywords: ["instability", "failure mode", "symptom", "dynamics", "learning rate"] },
          { id: "7.2", title: "NaN and Inf Losses, and Exploding or Vanishing Gradients", difficulty: "core", minutes: 30, tier: "must",
            summary: "Where a NaN comes from and how to trap it, then the gradient norms that explode or vanish, with the reference's diagnostics and fixes run.",
            keywords: ["nan", "inf", "anomaly detection", "gradient norm", "clipping", "log of zero"] },
          { id: "7.3", title: "Loss Spikes, Divergence, Dead ReLUs and Mixed-Precision Pitfalls", difficulty: "advanced", minutes: 30, tier: "must",
            summary: "Spikes and divergence and their causes, dead neurons measured and revived, and the float16 overflow and underflow traps with loss scaling.",
            keywords: ["loss spike", "divergence", "dead relu", "mixed precision", "loss scaling", "overflow"] },
          { id: "7.4", title: "Distributed Failures, Monitoring, the Decision Flow and the Checklist", difficulty: "advanced", minutes: 28, tier: "should",
            summary: "NCCL hangs, stragglers, sharded checkpoints and starved dataloaders; what to log on every run; the decision flow; and the production checklist.",
            keywords: ["distributed", "nccl", "straggler", "checkpoint", "dataloader", "monitoring", "checklist"] }
        ]
      },

      /* ================================================================
         PRACTICE and INTERVIEW tracks — generated by .build/import-banks.py
         from tutorial-hub/05_Deep_Learning/Practice and 00_Interview_Bank.
         ================================================================ */
      {
        id: "pt_programs", short: "P1", dir: "01_pt_programs", track: "practice", numPrefix: "P",
        phase: "Practice \u00b7 Programs and scenarios",
        title: "PyTorch Programs",
        blurb: "Sixty-seven short PyTorch programs — models, training loops, layers and techniques — each run, with what it printed.",
        outcome: "You can write the PyTorch for any standard layer, loss or training trick from memory.",
        source: "Practice/00_PyTorch_Programs.md",
        lessons: [
          { id: "p1.1", title: "PyTorch Programs · 1", difficulty: "core", minutes: 50, tier: "should",
            summary: "25 programs with hidden answers.",
            keywords: ["pytorch", "programs"] },
          { id: "p1.2", title: "PyTorch Programs · 2", difficulty: "core", minutes: 50, tier: "should",
            summary: "25 programs with hidden answers.",
            keywords: ["pytorch", "programs"] },
          { id: "p1.3", title: "PyTorch Programs · 3", difficulty: "core", minutes: 34, tier: "should",
            summary: "17 programs with hidden answers.",
            keywords: ["pytorch", "programs"] }
        ]
      },
      {
        id: "sc_fund", short: "P2", dir: "02_sc_fund", track: "practice", numPrefix: "P",
        phase: "Practice \u00b7 Programs and scenarios",
        title: "Fundamentals and Optimisation",
        blurb: "Scenario questions on the neuron, the gradient, the optimiser and regularisation.",
        outcome: "You can answer a fundamentals question with the mechanism, not the slogan.",
        source: "Practice/01_Fundamentals_and_Optimization.md",
        lessons: [
          { id: "p2.1", title: "Fundamentals and Optimisation · 1", difficulty: "foundation", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["fundamentals", "optimisation"] },
          { id: "p2.2", title: "Fundamentals and Optimisation · 2", difficulty: "foundation", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["fundamentals", "optimisation"] },
          { id: "p2.3", title: "Fundamentals and Optimisation · 3", difficulty: "foundation", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["fundamentals", "optimisation"] },
          { id: "p2.4", title: "Fundamentals and Optimisation · 4", difficulty: "foundation", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["fundamentals", "optimisation"] }
        ]
      },
      {
        id: "sc_cnn", short: "P3", dir: "03_sc_cnn", track: "practice", numPrefix: "P",
        phase: "Practice \u00b7 Programs and scenarios",
        title: "CNNs and Computer Vision",
        blurb: "Convolution arithmetic, the architectures, detection, segmentation and the vision applications.",
        outcome: "You can reason about receptive fields, parameter counts and architecture choices under questioning.",
        source: "Practice/02_CNNs_and_Computer_Vision.md",
        lessons: [
          { id: "p3.1", title: "CNNs and Computer Vision · 1", difficulty: "core", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["cnns", "computer", "vision"] },
          { id: "p3.2", title: "CNNs and Computer Vision · 2", difficulty: "core", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["cnns", "computer", "vision"] },
          { id: "p3.3", title: "CNNs and Computer Vision · 3", difficulty: "core", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["cnns", "computer", "vision"] },
          { id: "p3.4", title: "CNNs and Computer Vision · 4", difficulty: "core", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["cnns", "computer", "vision"] },
          { id: "p3.5", title: "CNNs and Computer Vision · 5", difficulty: "core", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["cnns", "computer", "vision"] },
          { id: "p3.6", title: "CNNs and Computer Vision · 6", difficulty: "core", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["cnns", "computer", "vision"] }
        ]
      },
      {
        id: "sc_seq", short: "P4", dir: "04_sc_seq", track: "practice", numPrefix: "P",
        phase: "Practice \u00b7 Programs and scenarios",
        title: "Sequence Models and NLP",
        blurb: "RNNs, LSTMs, GRUs, embeddings, language models and the NLP tasks built on them.",
        outcome: "You can explain gating, BPTT and sequence decoding from the equations.",
        source: "Practice/03_Sequence_Models_and_NLP.md",
        lessons: [
          { id: "p4.1", title: "Sequence Models and NLP · 1", difficulty: "core", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["sequence", "models"] },
          { id: "p4.2", title: "Sequence Models and NLP · 2", difficulty: "core", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["sequence", "models"] },
          { id: "p4.3", title: "Sequence Models and NLP · 3", difficulty: "core", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["sequence", "models"] },
          { id: "p4.4", title: "Sequence Models and NLP · 4", difficulty: "core", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["sequence", "models"] }
        ]
      },
      {
        id: "sc_tf", short: "P5", dir: "05_sc_tf", track: "practice", numPrefix: "P",
        phase: "Practice \u00b7 Programs and scenarios",
        title: "Transformers and Attention",
        blurb: "Self-attention, the transformer blocks, BERT and GPT, and the modern efficiency tricks.",
        outcome: "You can derive scaled dot-product attention and say why each transformer component exists.",
        source: "Practice/04_Transformers_and_Attention.md",
        lessons: [
          { id: "p5.1", title: "Transformers and Attention · 1", difficulty: "advanced", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["transformers", "attention"] },
          { id: "p5.2", title: "Transformers and Attention · 2", difficulty: "advanced", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["transformers", "attention"] }
        ]
      },
      {
        id: "sc_gen", short: "P6", dir: "06_sc_gen", track: "practice", numPrefix: "P",
        phase: "Practice \u00b7 Programs and scenarios",
        title: "Generative Models",
        blurb: "GANs and their failure modes, autoencoders and VAEs, diffusion, and how generation is evaluated.",
        outcome: "You can compare the generative families and diagnose a collapsing GAN.",
        source: "Practice/05_Generative_Models.md",
        lessons: [
          { id: "p6.1", title: "Generative Models · 1", difficulty: "advanced", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["generative", "models"] },
          { id: "p6.2", title: "Generative Models · 2", difficulty: "advanced", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["generative", "models"] },
          { id: "p6.3", title: "Generative Models · 3", difficulty: "advanced", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["generative", "models"] },
          { id: "p6.4", title: "Generative Models · 4", difficulty: "advanced", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["generative", "models"] },
          { id: "p6.5", title: "Generative Models · 5", difficulty: "advanced", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["generative", "models"] },
          { id: "p6.6", title: "Generative Models · 6", difficulty: "advanced", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["generative", "models"] }
        ]
      },
      {
        id: "sc_transfer", short: "P7", dir: "07_sc_transfer", track: "practice", numPrefix: "P",
        phase: "Practice \u00b7 Programs and scenarios",
        title: "Transfer, Self-Supervised and Meta-Learning",
        blurb: "Fine-tuning strategy, parameter-efficient adaptation, contrastive pretraining, few-shot and meta-learning.",
        outcome: "You can plan a transfer-learning approach for a small dataset and defend it.",
        source: "Practice/06_Transfer_SelfSupervised_MetaLearning.md",
        lessons: [
          { id: "p7.1", title: "Transfer, Self-Supervised and Meta-Learning · 1", difficulty: "advanced", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["transfer", "self-supervised", "meta-learning"] },
          { id: "p7.2", title: "Transfer, Self-Supervised and Meta-Learning · 2", difficulty: "advanced", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["transfer", "self-supervised", "meta-learning"] },
          { id: "p7.3", title: "Transfer, Self-Supervised and Meta-Learning · 3", difficulty: "advanced", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["transfer", "self-supervised", "meta-learning"] },
          { id: "p7.4", title: "Transfer, Self-Supervised and Meta-Learning · 4", difficulty: "advanced", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["transfer", "self-supervised", "meta-learning"] },
          { id: "p7.5", title: "Transfer, Self-Supervised and Meta-Learning · 5", difficulty: "advanced", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["transfer", "self-supervised", "meta-learning"] },
          { id: "p7.6", title: "Transfer, Self-Supervised and Meta-Learning · 6", difficulty: "advanced", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["transfer", "self-supervised", "meta-learning"] }
        ]
      },
      {
        id: "sc_rl", short: "P8", dir: "08_sc_rl", track: "practice", numPrefix: "P",
        phase: "Practice \u00b7 Programs and scenarios",
        title: "Reinforcement Learning",
        blurb: "Value and policy methods, DQN to PPO, exploration, reward design and RLHF.",
        outcome: "You can explain the RL loop and the difference between on- and off-policy learning.",
        source: "Practice/07_Reinforcement_Learning.md",
        lessons: [
          { id: "p8.1", title: "Reinforcement Learning · 1", difficulty: "advanced", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["reinforcement", "learning"] },
          { id: "p8.2", title: "Reinforcement Learning · 2", difficulty: "advanced", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["reinforcement", "learning"] }
        ]
      },
      {
        id: "sc_gnn", short: "P9", dir: "09_sc_gnn", track: "practice", numPrefix: "P",
        phase: "Practice \u00b7 Programs and scenarios",
        title: "Graph Neural Networks",
        blurb: "Message passing, GCN, GraphSAGE and GAT, over-smoothing and the graph tasks.",
        outcome: "You can describe a GNN layer as an aggregate-then-update step and name its limits.",
        source: "Practice/08_Graph_Neural_Networks.md",
        lessons: [
          { id: "p9.1", title: "Graph Neural Networks · 1", difficulty: "advanced", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["graph", "neural", "networks"] },
          { id: "p9.2", title: "Graph Neural Networks · 2", difficulty: "advanced", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["graph", "neural", "networks"] }
        ]
      },
      {
        id: "sc_prod", short: "P10", dir: "10_sc_prod", track: "practice", numPrefix: "P",
        phase: "Practice \u00b7 Programs and scenarios",
        title: "Compression, Deployment and Production",
        blurb: "Pruning, quantisation, distillation, serving, NAS and the production questions.",
        outcome: "You can shrink a model for a latency budget and explain what was traded away.",
        source: "Practice/09_Compression_Deployment_and_Production.md",
        lessons: [
          { id: "p10.1", title: "Compression, Deployment and Production · 1", difficulty: "advanced", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["compression", "deployment", "production"] },
          { id: "p10.2", title: "Compression, Deployment and Production · 2", difficulty: "advanced", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["compression", "deployment", "production"] },
          { id: "p10.3", title: "Compression, Deployment and Production · 3", difficulty: "advanced", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["compression", "deployment", "production"] },
          { id: "p10.4", title: "Compression, Deployment and Production · 4", difficulty: "advanced", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["compression", "deployment", "production"] },
          { id: "p10.5", title: "Compression, Deployment and Production · 5", difficulty: "advanced", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["compression", "deployment", "production"] },
          { id: "p10.6", title: "Compression, Deployment and Production · 6", difficulty: "advanced", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["compression", "deployment", "production"] }
        ]
      },
      {
        id: "sc_edge", short: "P11", dir: "11_sc_edge", track: "practice", numPrefix: "P",
        phase: "Practice \u00b7 Programs and scenarios",
        title: "Advanced and Edge Cases",
        blurb: "The behaviours that surprise: dying ReLUs, double descent, grokking, checkerboards and forgotten eval().",
        outcome: "You recognise the odd training curve and know the experiment that explains it.",
        source: "Practice/10_Advanced_Edge_Cases.md",
        lessons: [
          { id: "p11.1", title: "Advanced and Edge Cases · 1", difficulty: "expert", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["advanced", "edge", "cases"] },
          { id: "p11.2", title: "Advanced and Edge Cases · 2", difficulty: "expert", minutes: 50, tier: "should",
            summary: "25 scenarios with hidden answers.",
            keywords: ["advanced", "edge", "cases"] }
        ]
      },
      {
        id: "iv_dl", short: "I1", dir: "01_iv_dl", track: "interview", numPrefix: "I",
        phase: "Interview \u00b7 Question banks",
        title: "Deep Learning Interview Bank",
        blurb: "Two hundred senior-level questions across fundamentals, CNNs, sequence models, transformers, training, architectures, regularisation, NLP and production.",
        outcome: "You can answer a senior deep-learning interview question with the derivation.",
        source: "00_Interview_Bank/01_DL_Interview.md",
        lessons: [
          { id: "i1.1", title: "Fundamentals", difficulty: "advanced", minutes: 40, tier: "should",
            summary: "20 questions with hidden answers, from deep learning interview bank.",
            keywords: ["deep", "learning", "interview", "bank"] },
          { id: "i1.2", title: "CNNs", difficulty: "advanced", minutes: 30, tier: "should",
            summary: "15 questions with hidden answers, from deep learning interview bank.",
            keywords: ["deep", "learning", "interview", "bank"] },
          { id: "i1.3", title: "RNNs, LSTMs & Sequence Models", difficulty: "advanced", minutes: 30, tier: "should",
            summary: "15 questions with hidden answers, from deep learning interview bank.",
            keywords: ["deep", "learning", "interview", "bank"] },
          { id: "i1.4", title: "Transformers", difficulty: "advanced", minutes: 40, tier: "should",
            summary: "20 questions with hidden answers, from deep learning interview bank.",
            keywords: ["deep", "learning", "interview", "bank"] },
          { id: "i1.5", title: "Advanced Training & Deployment", difficulty: "advanced", minutes: 60, tier: "should",
            summary: "30 questions with hidden answers, from deep learning interview bank.",
            keywords: ["deep", "learning", "interview", "bank"] },
          { id: "i1.6", title: "Advanced Architectures", difficulty: "advanced", minutes: 40, tier: "should",
            summary: "20 questions with hidden answers, from deep learning interview bank.",
            keywords: ["deep", "learning", "interview", "bank"] },
          { id: "i1.7", title: "Training Techniques & Regularization", difficulty: "advanced", minutes: 40, tier: "should",
            summary: "20 questions with hidden answers, from deep learning interview bank.",
            keywords: ["deep", "learning", "interview", "bank"] },
          { id: "i1.8", title: "NLP & Sequence Models", difficulty: "advanced", minutes: 40, tier: "should",
            summary: "20 questions with hidden answers, from deep learning interview bank.",
            keywords: ["deep", "learning", "interview", "bank"] },
          { id: "i1.9", title: "Production Deep Learning · 1", difficulty: "advanced", minutes: 50, tier: "should",
            summary: "25 questions with hidden answers, from deep learning interview bank.",
            keywords: ["deep", "learning", "interview", "bank"] },
          { id: "i1.10", title: "Production Deep Learning · 2", difficulty: "advanced", minutes: 30, tier: "should",
            summary: "15 questions with hidden answers, from deep learning interview bank.",
            keywords: ["deep", "learning", "interview", "bank"] }
        ]
      },
      {
        id: "iv_glass", short: "I2", dir: "02_iv_glass", track: "interview", numPrefix: "I",
        phase: "Interview \u00b7 Question banks",
        title: "Glassdoor AI Engineer",
        blurb: "Real AI Engineer interview questions reported on Glassdoor — algorithms, ML, deep learning, NLP and GenAI, vision, system design, ethics, data and behavioural.",
        outcome: "You have seen the question before it is asked.",
        source: "00_Interview_Bank/02_Glassdoor_AI_Engineer.md",
        lessons: [
          { id: "i2.1", title: "Algorithms & Coding · Machine Learning Fundamentals · Deep Learning & Neural Networks", difficulty: "advanced", minutes: 20, tier: "should",
            summary: "9 questions with hidden answers, from glassdoor ai engineer.",
            keywords: ["glassdoor", "engineer"] },
          { id: "i2.2", title: "NLP & Generative AI · Computer Vision · System Design for AI · AI Ethics & Responsible AI · Data Preprocessing & Engineering · Projects & Behavioral · Additional Algorithms & Coding", difficulty: "advanced", minutes: 20, tier: "should",
            summary: "10 questions with hidden answers, from glassdoor ai engineer.",
            keywords: ["glassdoor", "engineer"] },
          { id: "i2.3", title: "Additional Deep Learning · Additional NLP & GenAI · Additional System Design & Production AI · Additional Ethics & Responsible AI · Additional Behavioral & Projects · Additional NLP & Text Processing", difficulty: "advanced", minutes: 20, tier: "should",
            summary: "10 questions with hidden answers, from glassdoor ai engineer.",
            keywords: ["glassdoor", "engineer"] }
        ]
      }
    ]
  });
})();
