/* ============================================================================
   DEEP LEARNING — CURRICULUM
   ----------------------------------------------------------------------------
   Where a program could not run here — a missing library, a dataset that is
   not local — the lesson says so.
   ========================================================================= */
(function () {
  EC.defineCourse({
    id: "dl",
    title: "Deep Learning",
    short: "DL",
    blurb: "Neural-network fundamentals, CNNs, sequence models, the ANN-to-transformer guide with its four projects, the five architectures worked by hand, audio and speech, training instability — then a thousand scenarios, sixty-seven PyTorch programs and the interview banks.",

    trackLabels: { learn: "Deep Learning", practice: "Practice", interview: "Interview" },
    trackBlurbs: {
      learn: "The usual treatment, section by section — every formula worked on a number, every program run.",
      practice: "Sixty-seven PyTorch programs with their output, and a thousand scenario questions with the answers folded away.",
      interview: "Two hundred senior-level questions and the real Glassdoor AI Engineer questions, answers hidden until you ask."
    },

    published: ["1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "1.7", "1.8", "1.9", "1.10", "1.11", "1.12", "1.13", "1.14", "2.1", "2.2", "2.3", "2.4", "2.5", "2.6", "2.7", "2.8", "2.9", "2.10", "2.11", "2.12", "2.13", "3.1", "3.2", "3.3", "3.4", "3.5", "3.6", "3.7", "3.8", "3.9", "3.10", "3.11", "3.12", "3.13", "4.1", "4.2", "4.3", "4.4", "4.5", "4.6", "4.7", "4.8", "4.9", "4.10", "5.1", "5.2", "5.3", "5.4", "5.5", "6.1", "6.2", "6.3", "6.4", "6.5", "6.6", "6.7", "6.8", "6.9", "7.1", "7.2", "7.3", "7.4", "i1.1", "i1.2", "i1.3", "i1.4", "i1.5", "i1.6", "i1.7", "i1.8", "i1.9", "i1.10", "i2.1", "i2.2", "i2.3", "p1.1", "p1.2", "p1.3", "p2.1", "p2.2", "p2.3", "p2.4", "p3.1", "p3.2", "p3.3", "p3.4", "p3.5", "p3.6", "p4.1", "p4.2", "p4.3", "p4.4", "p5.1", "p5.2", "p6.1", "p6.2", "p6.3", "p6.4", "p6.5", "p6.6", "p7.1", "p7.2", "p7.3", "p7.4", "p7.5", "p7.6", "p8.1", "p8.2", "p9.1", "p9.2", "p10.1", "p10.2", "p10.3", "p10.4", "p10.5", "p10.6", "p11.1", "p11.2"],

    modules: [

      /* ================================================================
  M1 ·
         ================================================================ */
      {
        id: "fundamentals",
        short: "M1",
        dir: "01_fundamentals",
        phase: "Phase 1 · Neural network fundamentals",
        title: "Neural Network Fundamentals",
        blurb: "The perceptron and the MLP, activations, forward propagation and the losses, backpropagation derived in full, the optimisers from SGD to AdamW, initialisation, regularisation, the normalisations, gradients that vanish or explode, schedules — then the network built in NumPy, Keras and PyTorch, debugged, and taken as far as Neural ODEs.",
        outcome: "You can derive and run a neural network from the neuron up, name what each training technique changes, and explain it in an interview.",
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
            summary: "The NumPy network — forward pass, cross-entropy, backward pass and the update — run on XOR, with what it printed.",
            keywords: ["numpy", "from scratch", "forward", "backward", "xor", "training loop"] },
          { id: "1.11", title: "The Same Network in Keras and PyTorch", difficulty: "core", minutes: 34, tier: "must",
            summary: "The Keras model and PyTorch module side by side: the layers, the compile and fit calls, the explicit PyTorch training loop, and what each printed when run.",
            keywords: ["keras", "pytorch", "nn.module", "training loop", "compile", "fit", "dataloader"] },
          { id: "1.12", title: "Debugging Neural Networks and Gradient Clipping", difficulty: "core", minutes: 30, tier: "must",
            summary: "The symptom-to-cause table for a run that will not train, the overfit-one-batch test, gradient monitoring, and gradient clipping by norm and by value.",
            keywords: ["debugging", "overfit one batch", "gradient clipping", "clip_grad_norm", "nan", "loss not decreasing"] },
          { id: "1.13", title: "Label Smoothing, Knowledge Distillation and Mixed Precision", difficulty: "advanced", minutes: 30, tier: "should",
            summary: "Three training techniques: soft targets, a student learning from a teacher's temperature-scaled logits, and float16 training with loss scaling.",
            keywords: ["label smoothing", "knowledge distillation", "temperature", "mixed precision", "autocast", "grad scaler"] },
          { id: "1.14", title: "Neural ODEs", difficulty: "advanced", minutes: 34, tier: "should",
            summary: "ResNets as Euler steps, the continuous-depth network, the adjoint method for memory-efficient backpropagation, and continuous normalising flows.",
            keywords: ["neural ode", "residual", "euler", "adjoint", "continuous depth", "normalizing flow", "ffjord"] }
        ]
      },

      /* ================================================================
  M2 ·
         ================================================================ */
      {
        id: "cnns",
        short: "M2",
        dir: "02_cnns",
        phase: "Phase 2 · Images and sequences",
        title: "Convolutional Neural Networks",
        blurb: "The convolution operation and its arithmetic, pooling and receptive fields, the architectures from LeNet to ConvNeXt, the innovations that made them work, transfer learning and augmentation, detection, segmentation and Grad-CAM — then a CNN in NumPy, PyTorch and Keras, deployed, plus transposed and dilated convolutions and GANs in overview.",
        outcome: "You can compute any convolution's output size and parameter count, explain each landmark architecture's contribution, and build, train and explain a CNN.",
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
            summary: "Two-stage and one-stage detectors, anchors, IoU computed by hand, the detection losses, and NMS as it is usually implemented.",
            keywords: ["object detection", "yolo", "faster r-cnn", "iou", "anchor", "nms", "non-maximum suppression"] },
          { id: "2.8", title: "Image Segmentation", difficulty: "advanced", minutes: 26, tier: "should",
            summary: "Semantic, instance and panoptic segmentation, the encoder–decoder with skip connections, U-Net, and the Dice and IoU losses.",
            keywords: ["segmentation", "u-net", "fcn", "dice", "semantic", "instance", "mask r-cnn"] },
          { id: "2.9", title: "Grad-CAM", difficulty: "advanced", minutes: 28, tier: "should",
            summary: "Visual explanation from the gradients of a class score with respect to the last convolutional feature maps — the formula, the hooks, the heat map.",
            keywords: ["grad-cam", "explainability", "saliency", "hooks", "feature map", "heatmap"] },
          { id: "2.10", title: "A CNN from Scratch in NumPy", difficulty: "core", minutes: 34, tier: "must",
            summary: "The NumPy convolution, max pool and their backward passes, run on a small input with the shapes and values checked.",
            keywords: ["numpy", "convolution forward", "convolution backward", "max pool", "from scratch"] },
          { id: "2.11", title: "CNNs in PyTorch and Keras", difficulty: "core", minutes: 34, tier: "must",
            summary: "The PyTorch CNN with its training loop and the Keras equivalent, run on the data at hand, with the printed results.",
            keywords: ["pytorch", "keras", "conv2d", "training loop", "cifar", "mnist", "model"] },
          { id: "2.12", title: "Production Deployment", difficulty: "advanced", minutes: 24, tier: "should",
            summary: "TorchScript and ONNX export, quantisation for inference, and the serving considerations the common list has.",
            keywords: ["deployment", "torchscript", "onnx", "quantization", "inference", "serving"] },
          { id: "2.13", title: "GANs: The Adversarial Game and Why It Is Hard to Train", difficulty: "advanced", minutes: 30, tier: "should",
            summary: "A generator against a discriminator, the DCGAN generator and its tanh output range, the training loop, the equilibrium that does not arrive, and mode collapse diagnosed from samples rather than losses.",
            keywords: ["gan", "generator", "discriminator", "dcgan", "mode collapse", "adversarial training"] }
        ]
      },

      /* ================================================================
  M3 ·
         ================================================================ */
      {
        id: "sequence",
        short: "M3",
        dir: "03_sequence",
        phase: "Phase 2 · Images and sequences",
        title: "Sequence Models: RNN, LSTM, GRU",
        blurb: "The vanilla RNN and its task shapes, BPTT and the vanishing gradient, the LSTM gate by gate, the GRU and the comparison, bidirectional and stacked models, seq2seq, attention from Bahdanau to self-attention, beam search, CTC, padding and packing — then RNN and LSTM in NumPy, Keras, RNN versus transformer, and word embeddings.",
        outcome: "You can write the recurrence, the gates and the attention scores, run each in NumPy and PyTorch, and choose the sequence model for a task.",
        lessons: [
          { id: "3.1", title: "The Vanilla RNN", difficulty: "foundation", minutes: 28, tier: "must",
            summary: "The recurrence h_t = tanh(W_hh h_{t-1} + W_xh x_t + b), the unrolled view, the parameter count, and the one-to-many, many-to-one and many-to-many shapes.",
            keywords: ["rnn", "recurrence", "hidden state", "unrolled", "many-to-one", "sequence"] },
          { id: "3.2", title: "BPTT and the Vanishing Gradient in RNNs", difficulty: "core", minutes: 32, tier: "must",
            summary: "Backpropagation through time in full and truncated, the product of Jacobians that shrinks or explodes, and what each remedy addresses.",
            keywords: ["bptt", "truncated bptt", "vanishing gradient", "exploding gradient", "jacobian", "clipping"] },
          { id: "3.3", title: "Long-Range Dependencies, Measured", difficulty: "core", minutes: 38, tier: "must",
            summary: "A task with a controlled dependency length, the gradient each position receives, why a default LSTM lost to a vanilla RNN, the one-line forget-gate fix, and the four families of remedy.",
            keywords: ["long-range dependency", "vanishing gradient", "forget gate bias", "lstm", "rnn", "initialisation"] },
          { id: "3.4", title: "LSTM", difficulty: "core", minutes: 28, tier: "must",
            summary: "The six LSTM equations, what each gate does, the additive cell path that keeps gradients alive, initialising the forget gate, and what the extra gates cost.",
            keywords: ["lstm", "forget gate", "input gate", "output gate", "cell state", "gradient highway"] },
          { id: "3.5", title: "GRU, and LSTM versus GRU", difficulty: "core", minutes: 24, tier: "must",
            summary: "The four GRU equations, the coupled update gate, the parameter and speed comparison with the LSTM measured on torch 2.10, and how to choose between them.",
            keywords: ["gru", "reset gate", "update gate", "lstm vs gru", "parameters", "speed"] },
          { id: "3.6", title: "Bidirectional and Stacked Architectures", difficulty: "core", minutes: 28, tier: "must",
            summary: "Reading a sequence both ways and the causality it costs, indexing the final states correctly, stacking layers, and where dropout actually applies.",
            keywords: ["bidirectional", "stacked", "causality", "h_n", "num_layers", "dropout"] },
          { id: "3.7", title: "Sequence-to-Sequence", difficulty: "advanced", minutes: 40, tier: "must",
            summary: "The encoder–decoder architecture, the fixed-size bottleneck, teacher forcing, exposure bias and scheduled sampling.",
            keywords: ["seq2seq", "encoder", "decoder", "context vector", "teacher forcing", "exposure bias", "scheduled sampling"] },
          { id: "3.8", title: "The Attention Mechanism", difficulty: "advanced", minutes: 30, tier: "should",
            summary: "Score, softmax, weighted sum: Bahdanau and Luong attention, why scores are divided by the square root of d_k, self-attention and position, and multi-head attention.",
            keywords: ["attention", "bahdanau", "luong", "scaled dot product", "self-attention", "multi-head"] },
          { id: "3.9", title: "Beam Search", difficulty: "core", minutes: 26, tier: "must",
            summary: "Why greedy decoding is not the most likely sequence, beam search, the length bias and length normalisation, and when sampling is the better choice.",
            keywords: ["beam search", "greedy decoding", "length normalisation", "length bias", "sampling"] },
          { id: "3.10", title: "CTC Loss", difficulty: "core", minutes: 34, tier: "must",
            summary: "Learning without frame-level alignment: the blank symbol, collapsing, marginalising over alignments, CTCLoss's time-first shapes, and where CTC fits.",
            keywords: ["ctc", "blank", "alignment", "speech", "ctcloss", "unaligned sequences"] },
          { id: "3.11", title: "Padding, Packing and Masking", difficulty: "advanced", minutes: 34, tier: "must",
            summary: "Variable-length batches in PyTorch: what padding does to an RNN's final state, packing, masking attention, and masking the loss.",
            keywords: ["padding", "packing", "pack_padded_sequence", "attention mask", "ignore_index", "variable length"] },
          { id: "3.12", title: "RNN and LSTM from Scratch in NumPy", difficulty: "core", minutes: 40, tier: "must",
            summary: "The RNN forward pass and BPTT written out and checked against nn.RNN, then the LSTM cell and what its cell path delivers to the gradient.",
            keywords: ["numpy", "rnn", "bptt", "lstm", "from scratch", "gradient check"] },
          { id: "3.13", title: "Keras, RNN versus Transformer, and Word Embeddings", difficulty: "core", minutes: 30, tier: "should",
            summary: "The Keras recurrent models, the head-to-head that explains why transformers replaced RNNs for most tasks, and word embeddings from one-hot to Word2Vec.",
            keywords: ["keras", "transformer", "rnn vs transformer", "embedding", "word2vec", "glove"] }
        ]
      },

      /* ================================================================
  M4 ·
         ================================================================ */
      {
        id: "guide",
        short: "M4",
        dir: "04_guide",
        phase: "Phase 3 · The guide and its projects",
        title: "ANN to Transformer: The Guide and Its Projects",
        blurb: "From recurrence to the transformer, built piece by piece — self-attention, multi-head attention and position, the encoder and decoder blocks — assembled and trained, compared with the earlier architectures, then three projects run end to end against honest baselines: house prices, text classification with four models, and stock prices.",
        outcome: "You can build each of the five model families in PyTorch on a real task and say, from the comparison, which one a new task needs.",
        lessons: [
          { id: "4.1", title: "From Recurrence to the Transformer", difficulty: "foundation", minutes: 34, tier: "must",
            summary: "What recurrence costs, the parallelism attention buys, the overall shape of a transformer, and the road map for building one piece by piece.",
            keywords: ["recurrence", "parallelism", "transformer", "sequence length", "architecture"] },
          { id: "4.2", title: "Self-Attention", difficulty: "core", minutes: 30, tier: "must",
            summary: "Queries, keys and values, scaled dot-product attention run and verified, the convex-hull property of its output, and the cost of the T × T matrix.",
            keywords: ["self-attention", "query", "key", "value", "scaled dot product", "quadratic cost"] },
          { id: "4.3", title: "Multi-Head Attention and Positional Encoding", difficulty: "core", minutes: 32, tier: "must",
            summary: "Several attentions at once at no extra parameter cost, and how position is put back into a mechanism that has none.",
            keywords: ["multi-head attention", "heads", "positional encoding", "sinusoidal", "position"] },
          { id: "4.4", title: "The Encoder Block", difficulty: "core", minutes: 28, tier: "must",
            summary: "Attention, the position-wise feed-forward network, residuals and LayerNorm — where the parameters sit, and why pre-norm is what you build.",
            keywords: ["encoder block", "feed-forward", "residual", "layernorm", "pre-norm", "post-norm"] },
          { id: "4.5", title: "The Decoder, Causal Masking and Generation", difficulty: "advanced", minutes: 44, tier: "must",
            summary: "The causal mask, the decoder block with cross-attention, and generation with a KV cache.",
            keywords: ["decoder", "causal mask", "cross-attention", "kv cache", "generation"] },
          { id: "4.6", title: "A Complete Transformer, Trained", difficulty: "core", minutes: 22, tier: "must",
            summary: "The full encoder–decoder assembled in PyTorch and trained on sequence reversal to 99.4%, generation, reading the cross-attention, and what to check when it will not train.",
            keywords: ["transformer", "pytorch", "sequence reversal", "cross-attention", "training", "debugging"] },
          { id: "4.7", title: "Comparison Summary: Four Architectures", difficulty: "core", minutes: 34, tier: "must",
            summary: "Dense networks, RNNs, LSTM and GRU, and transformers side by side — what each assumes, what it costs in parameters, and how to choose.",
            keywords: ["comparison", "when to use", "parameter count", "inductive bias", "architecture choice"] },
          { id: "4.8", title: "Project: House-Price Prediction with an ANN", difficulty: "advanced", minutes: 40, tier: "must",
            summary: "A dense network on California housing against linear and gradient-boosted baselines, the scaling leak beside the model, and an honest result.",
            keywords: ["project", "house price", "regression", "ann", "california housing", "gradient boosting"] },
          { id: "4.9", title: "Project: Sentiment with Four Models", difficulty: "advanced", minutes: 36, tier: "must",
            summary: "ANN, RNN, LSTM, GRU and a transformer compared on 20 newsgroups — and the empty-document bug that made the transformer score exactly the baseline.",
            keywords: ["project", "text classification", "comparison", "transformer", "bug", "baseline"] },
          { id: "4.10", title: "Project: Stock-Price Prediction with RNN, LSTM and GRU", difficulty: "advanced", minutes: 40, tier: "must",
            summary: "Windowed forecasting with the three recurrent models, the persistence baseline that embarrasses them, and the leaks specific to time series.",
            keywords: ["project", "stock price", "time series", "persistence baseline", "leakage", "forecasting"] }
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
        blurb: "The one-file-per-architecture deep dives — ANN, CNN, RNN, LSTM, GRU — each in the same shape: TL;DR, definition, intuition, the maths with a worked numeric calculation, variants, failure modes and fixes, complexity, hyperparameters, PyTorch, comparison, interview drill and mistakes.",
        outcome: "You can carry a forward pass, a backward step and a gate update through by hand for each architecture and say what breaks it.",
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
  M6 ·
         ================================================================ */
      {
        id: "audio",
        short: "M6",
        dir: "06_audio",
        phase: "Phase 4 · Audio, and training that goes wrong",
        title: "Audio and Speech Processing",
        blurb: "From the sampled signal to frames, the mel scale and MFCCs, the whole front end in forty lines, self-supervised speech, the three ASR architectures, CTC worked and programmed, RNN-T and streaming, Whisper, decoding and language models, text to speech, VAD and diarisation, evaluation, robustness, deployment and pitfalls.",
        outcome: "You can turn a waveform into features, explain and run CTC, choose an ASR architecture, and evaluate a speech system with WER, CER, MOS and RTF.",
        lessons: [
          { id: "6.1", title: "The Signal: Sampling, Nyquist and Bit Depth", difficulty: "foundation", minutes: 30, tier: "must",
            summary: "Sample rate and why speech uses 16 kHz, aliasing, what audio costs to store, what lives where in the spectrum, and what bit depth decides.",
            keywords: ["sampling", "nyquist", "16 khz", "aliasing", "bit depth", "spectrum"] },
          { id: "6.2", title: "Framing, Windowing and the Mel Filterbank", difficulty: "core", minutes: 28, tier: "must",
            summary: "Why speech is framed at 25 ms, windowing and the time–frequency resolution trade-off, the mel scale, the filterbank, and why the log.",
            keywords: ["frame", "window", "stft", "mel", "filterbank", "log-mel"] },
          { id: "6.3", title: "MFCCs: The Whole Front End and What the DCT Buys", difficulty: "core", minutes: 30, tier: "must",
            summary: "The full feature pipeline run end to end, the redundancy between adjacent log-mel bands that the DCT removes, energy compaction, and why modern models no longer need it.",
            keywords: ["mfcc", "dct", "front end", "log-mel", "decorrelation", "energy compaction"] },
          { id: "6.4", title: "Self-Supervised Speech and the Three ASR Architectures", difficulty: "advanced", minutes: 28, tier: "should",
            summary: "wav2vec 2.0 and HuBERT — what they pretrain on and how — then CTC, attention encoder–decoder and RNN-T compared as the three ways to build a recogniser.",
            keywords: ["wav2vec", "hubert", "self-supervised", "asr", "ctc", "encoder-decoder", "rnn-t"] },
          { id: "6.5", title: "CTC, Worked and Programmed", difficulty: "advanced", minutes: 40, tier: "must",
            summary: "The alignment lattice, the collapse rule and the forward algorithm worked on a tiny example by hand, then the CTC program run in PyTorch.",
            keywords: ["ctc", "blank", "alignment", "forward algorithm", "ctc loss", "greedy decoding"] },
          { id: "6.6", title: "RNN-T, Streaming, and Whisper", difficulty: "advanced", minutes: 30, tier: "should",
            summary: "The transducer's joint network and why it streams, latency versus accuracy, and Whisper's architecture, training data and use.",
            keywords: ["rnn-t", "transducer", "streaming", "whisper", "latency", "multilingual"] },
          { id: "6.7", title: "Decoding, Contextual Biasing and Text to Speech", difficulty: "advanced", minutes: 30, tier: "should",
            summary: "Turning acoustic probabilities into text, contextual biasing as the highest-value trick in commercial ASR, the TTS pipeline, and autoregressive against parallel synthesis.",
            keywords: ["decoding", "language model", "contextual biasing", "tts", "vocoder", "autoregressive"] },
          { id: "6.8", title: "VAD, Wake Words and Evaluation: WER, CER, MOS and RTF", difficulty: "core", minutes: 28, tier: "must",
            summary: "The small models around a recogniser — voice activity detection and wake words with their operating points — then word error rate, how normalisation decides it, and MOS and RTF.",
            keywords: ["vad", "wake word", "wer", "cer", "normalisation", "mos", "rtf"] },
          { id: "6.9", title: "Robustness, Deployment and Pitfalls", difficulty: "advanced", minutes: 26, tier: "should",
            summary: "Noise and augmentation, on-device constraints and quantisation, and the pitfalls that recur from real speech systems.",
            keywords: ["robustness", "augmentation", "specaugment", "on-device", "deployment", "pitfalls"] }
        ]
      },

      /* ================================================================
  M7 ·
         ================================================================ */
      {
        id: "instability",
        short: "M7",
        dir: "07_instability",
        phase: "Phase 4 · Audio, and training that goes wrong",
        title: "Training Instability in Production",
        blurb: "Why runs go unstable and how to tell which way: depth and the gradient norm, NaN and its sources, loss spikes and warm-up, dead ReLUs, mixed-precision ranges and loss scaling, distributed hangs and stragglers — then what to monitor, the decision flow from symptom to cause, and the pre-flight checklist.",
        outcome: "You can name the cause of an unstable run from its symptoms, apply the fix for that cause, and set up the logging that shows it coming.",
        lessons: [
          { id: "7.1", title: "Why Training Goes Unstable: Depth, NaN and the Gradient Norm", difficulty: "core", minutes: 26, tier: "must",
            summary: "Why depth multiplies small drifts into instability, the drift measured across thirty layers, where NaN comes from, unnormalised inputs, and the gradient norm as the first signal.",
            keywords: ["instability", "depth", "nan", "gradient norm", "normalisation", "initialisation"] },
          { id: "7.2", title: "Loss Spikes, Warm-up and Dead ReLUs", difficulty: "core", minutes: 30, tier: "must",
            summary: "Two failures with a shared cause: a loss spike and how warm-up and decay prevent it, and dead ReLUs measured and revived.",
            keywords: ["loss spike", "divergence", "warm-up", "learning rate decay", "dead relu", "leaky relu"] },
          { id: "7.3", title: "Mixed-Precision Pitfalls and Distributed Failures", difficulty: "advanced", minutes: 30, tier: "must",
            summary: "Float16, bfloat16 and float32 ranges, loss scaling, then the distributed failures: the collective that hangs, stragglers and starved data loaders, and sharded checkpoints.",
            keywords: ["mixed precision", "float16", "bfloat16", "loss scaling", "nccl", "straggler", "checkpoint"] },
          { id: "7.4", title: "Monitoring, the Decision Flow and the Checklist", difficulty: "advanced", minutes: 28, tier: "should",
            summary: "The eight numbers to log on every run, the path from a symptom to its cause, and the pre-flight checklist.",
            keywords: ["monitoring", "logging", "decision flow", "symptom", "checklist"] }
        ]
      },

      /* ================================================================
         PRACTICE and INTERVIEW tracks
         ================================================================ */
      {
        id: "pt_programs", short: "P1", dir: "01_pt_programs", track: "practice", numPrefix: "P",
        phase: "Practice \u00b7 Programs and scenarios",
        title: "PyTorch Programs",
        blurb: "Sixty-seven short PyTorch programs — models, training loops, layers and techniques — each run, with what it printed.",
        outcome: "You can write the PyTorch for any standard layer, loss or training trick from memory.",
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
          { id: "i1.7", title: "Training Techniques & Regularisation", difficulty: "advanced", minutes: 40, tier: "should",
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
        lessons: [
          { id: "i2.1", title: "Algorithms & Coding · Machine Learning Fundamentals · Deep Learning & Neural Networks", difficulty: "advanced", minutes: 20, tier: "should",
            summary: "9 questions with hidden answers, from glassdoor ai engineer.",
            keywords: ["glassdoor", "engineer"] },
          { id: "i2.2", title: "NLP & Generative AI · Computer Vision · System Design for AI · AI Ethics & Responsible AI · Data Preprocessing & Engineering · Projects & Behavioural · Additional Algorithms & Coding", difficulty: "advanced", minutes: 20, tier: "should",
            summary: "10 questions with hidden answers, from glassdoor ai engineer.",
            keywords: ["glassdoor", "engineer"] },
          { id: "i2.3", title: "Additional Deep Learning · Additional NLP & GenAI · Additional System Design & Production AI · Additional Ethics & Responsible AI · Additional Behavioural & Projects · Additional NLP & Text Processing", difficulty: "advanced", minutes: 20, tier: "should",
            summary: "10 questions with hidden answers, from glassdoor ai engineer.",
            keywords: ["glassdoor", "engineer"] }
        ]
      }
    ]
  });
})();
