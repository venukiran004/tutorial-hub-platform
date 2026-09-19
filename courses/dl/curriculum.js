/* ============================================================================
   DEEP LEARNING — CURRICULUM
   ----------------------------------------------------------------------------
   Eleven modules in the order a practitioner needs them: the neuron, the
   gradient and the optimiser; the training loop as a discipline — what goes
   wrong and how you see it; the architectures for images and for sequences;
   attention and the transformer as far as a deep-learning course should take
   them; the generative, self-supervised, reinforcement and graph paradigms;
   audio; and compression, deployment, search and the interview.

   Every derivation is worked on a number. Every reported loss, accuracy,
   gradient norm, latency and parameter count was produced by running the
   code — NumPy from scratch first, then PyTorch on the CPU — on data small
   enough to run in a minute and built so the failure exists: a ReLU that
   dies, a gradient that vanishes at depth 30, a GAN that collapses to one
   mode, a network that memorises a shuffled label. Nothing is quoted from
   memory; anything not executed is marked so.

   Reference coverage (tutorial-hub/05_Deep_Learning):
     01_Neural_Network_Fundamentals → M1 (§1–11), M2 (§12–20), M11.4 (§21)
     02_CNNs                        → M3 (§1–13, 15–16, 18), M6.3 (§17), M11.2 (§14)
     03_Sequence_Models             → M4 (§1–16, 18), M5.3 (§17)
     08_Audio_Speech_Processing     → M10
     30_DL_Training_Instability     → M2.4
     rnn-lstm-gru-transformer-guide → M4, M5; its four projects → 2.2, 4.5, 5.2
     Architectures/ann,cnn,rnn,lstm,gru → M1.1, M3.2, M4.1, M4.3, M4.4
     Practice/00_PyTorch_Programs   → M2.2–2.5 and the PyTorch block of every lesson
     Practice/01 Fundamentals       → M1, M2
     Practice/02 CNNs & CV          → M3
     Practice/03 Sequence & NLP     → M4
     Practice/04 Transformers       → M5
     Practice/05 Generative         → M6
     Practice/06 Transfer/SSL/Meta  → M7
     Practice/07 RL                 → M8
     Practice/08 GNN                → M9
     Practice/09 Compression/NAS    → M11.1–11.3
     Practice/10 Edge cases         → M2.6 and the callouts throughout
     00_Interview_Bank              → the interview block of every lesson; M11.4
   ========================================================================= */
(function () {
  EC.defineCourse({
    id: "dl",
    title: "Deep Learning",
    short: "DL",
    blurb: "From one neuron upward — backpropagation derived and checked numerically, the optimisers raced, then the architectures for images, sequences, graphs and audio, each built by hand before PyTorch, with every failure mode reproduced on purpose.",

    published: ["1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "1.7", "1.8", "2.1", "2.2", "2.3", "2.4", "2.5", "2.6"],

    modules: [

      /* ================================================================
         PHASE 1 · THE NEURON AND THE GRADIENT
         ================================================================ */
      {
        id: "foundations",
        short: "M1",
        dir: "01_foundations",
        phase: "Phase 1 · The neuron and the gradient",
        title: "Neural Network Fundamentals",
        blurb: "The perceptron and why it cannot do XOR, activations and their derivatives, the forward pass and the losses, backpropagation derived and checked against finite differences, the optimisers from SGD to AdamW, initialisation, normalisation, regularisation, and the gradients that vanish or explode.",
        outcome: "You can derive the gradient of a two-layer network on paper, verify it numerically, explain why He initialisation keeps the variance at 1 through thirty layers, and choose an optimiser and a schedule with a reason.",
        lessons: [
          { id: "1.1", title: "From the Perceptron to the MLP", difficulty: "foundation", minutes: 32, tier: "must",
            summary: "Neuron, weights, bias and activation; the perceptron rule and its XOR wall; hidden layers, depth versus width, the universal approximation theorem; deep learning against classical ML and when not to use it.",
            keywords: ["perceptron", "mlp", "xor", "universal approximation", "hidden layer", "depth vs width", "bias", "when not to use deep learning"] },
          { id: "1.2", title: "Activation Functions", difficulty: "foundation", minutes: 30, tier: "must",
            summary: "Sigmoid, tanh, ReLU and its family, ELU, GELU, Swish, softmax — each with its derivative, its range and its failure; the dying ReLU measured; why a linear network of any depth is one matrix.",
            keywords: ["sigmoid", "tanh", "relu", "leaky relu", "elu", "gelu", "swish", "softmax", "dying relu", "non-linearity"] },
          { id: "1.3", title: "Forward Propagation and Loss Functions", difficulty: "foundation", minutes: 32, tier: "must",
            summary: "The forward pass as matrix products with shapes tracked; MSE, MAE, Huber, binary and categorical cross-entropy, focal, KL, contrastive and triplet — each computed on a number; loss versus metric; the wrong loss reproduced.",
            keywords: ["forward propagation", "mse", "huber", "cross-entropy", "focal loss", "kl divergence", "triplet loss", "loss vs metric", "logits"] },
          { id: "1.4", title: "Backpropagation, Derived and Checked", difficulty: "core", minutes: 40, tier: "must",
            summary: "The chain rule through a two-layer network, every partial written out, then implemented in NumPy and checked against finite differences to 1e-7; computational graphs, static versus dynamic; the parameter, the hyperparameter, the epoch, the batch, the iteration.",
            keywords: ["backpropagation", "chain rule", "gradient check", "computational graph", "autograd", "epoch", "batch", "iteration", "delta"] },
          { id: "1.5", title: "Optimisers, SGD to AdamW", difficulty: "core", minutes: 38, tier: "must",
            summary: "Batch, stochastic and mini-batch descent; momentum and Nesterov; Adagrad, RMSProp, Adam with bias correction, AdamW and why decoupled decay differs from L2; LARS, LAMB, SAM; second-order in one paragraph — all raced on the same surface and the same network.",
            keywords: ["sgd", "momentum", "nesterov", "adagrad", "rmsprop", "adam", "adamw", "weight decay", "lars", "lamb", "sam", "second-order"] },
          { id: "1.6", title: "Initialisation and Normalisation", difficulty: "core", minutes: 36, tier: "must",
            summary: "Why zeros and why large constants both fail; Xavier and He derived from the variance of a sum and measured through thirty layers; BatchNorm, LayerNorm, GroupNorm and InstanceNorm — the equations, train against eval mode, batch size 1, and when each is the right choice.",
            keywords: ["weight initialisation", "xavier", "he initialisation", "batch normalisation", "layer normalisation", "group norm", "instance norm", "internal covariate shift", "model.eval"] },
          { id: "1.7", title: "Regularisation", difficulty: "core", minutes: 36, tier: "must",
            summary: "L1 and L2 as penalties and as priors, weight decay per layer; dropout derived with inverted scaling, DropConnect, spatial dropout, stochastic depth; data augmentation, mixup, cutout, cutmix, noise injection, R-Drop; early stopping — each measured on a network built to overfit.",
            keywords: ["l1", "l2", "weight decay", "dropout", "dropconnect", "spatial dropout", "stochastic depth", "mixup", "cutout", "early stopping", "overfitting"] },
          { id: "1.8", title: "Gradients at Depth, Clipping and Schedules", difficulty: "core", minutes: 36, tier: "must",
            summary: "Vanishing and exploding gradients measured layer by layer, the fixes ranked; clipping by norm and by value; step, exponential, cosine, one-cycle, warmup, SGDR and poly schedules run on the same task; the learning-rate finder; the batch-size and learning-rate relationship.",
            keywords: ["vanishing gradient", "exploding gradient", "gradient clipping", "learning rate schedule", "cosine annealing", "one-cycle", "warmup", "sgdr", "lr finder", "batch size"] }
        ]
      },

      {
        id: "training",
        short: "M2",
        dir: "02_training",
        phase: "Phase 1 · The neuron and the gradient",
        title: "Training in Practice",
        blurb: "A network from scratch in NumPy, then the PyTorch contract — tensors, autograd, modules, data — then the toolkit around the loop, the debugging of a run that will not train, precision and distillation, and the theory corner.",
        outcome: "You can write a training loop that is reproducible, resumable and observable, diagnose a NaN or a flat loss from the symptoms alone, and explain double descent, grokking and the lottery ticket without hand-waving.",
        lessons: [
          { id: "2.1", title: "A Network from Scratch in NumPy", difficulty: "core", minutes: 36, tier: "must",
            summary: "Layers, activations, losses and optimiser as small classes; forward, backward and update on a real classification task; the same network in Keras-style pseudocode for comparison; what the framework does for you and what it does not.",
            keywords: ["numpy neural network", "from scratch", "layer class", "training loop", "softmax cross-entropy", "keras"] },
          { id: "2.2", title: "PyTorch: Tensors, Autograd, Modules and Data", difficulty: "core", minutes: 40, tier: "must",
            summary: "Tensor operations and broadcasting, einsum, autograd and the graph, nn.Module and parameters, Dataset and DataLoader with a collate function, the canonical loop, save and load, device management, reproducibility, parameter counts, hooks — and the house-price project.",
            keywords: ["pytorch", "tensor", "autograd", "nn.module", "dataset", "dataloader", "collate", "state_dict", "reproducibility", "einsum", "hooks", "house price"] },
          { id: "2.3", title: "The Loop Toolkit", difficulty: "core", minutes: 36, tier: "must",
            summary: "Schedulers and early stopping done properly, gradient accumulation, EMA of weights, SWA, checkpointing and resuming, activation checkpointing, torch.compile, the profiler and FLOP counting, custom losses, multi-GPU in one page — each shown running.",
            keywords: ["scheduler", "early stopping", "gradient accumulation", "ema", "swa", "checkpoint", "gradient checkpointing", "torch.compile", "profiler", "flops", "dataparallel"] },
          { id: "2.4", title: "Debugging and Training Instability", difficulty: "advanced", minutes: 40, tier: "must",
            summary: "NaN and Inf losses, spikes and divergence, dead ReLUs, the forgotten eval(), the shuffled-label test, the overfit-one-batch test; the failure-mode map, what to monitor, the decision flow and the production checklist — every failure reproduced on purpose.",
            keywords: ["nan loss", "loss spike", "dead relu", "debugging", "overfit one batch", "shuffled labels", "monitoring", "training instability", "checklist"] },
          { id: "2.5", title: "Mixed Precision, Label Smoothing and Distillation", difficulty: "advanced", minutes: 34, tier: "should",
            summary: "FP16, BF16 and loss scaling with the overflow shown; label smoothing derived and its effect on calibration measured; knowledge distillation with temperature, logit against feature distillation, the student that beats its own training.",
            keywords: ["mixed precision", "fp16", "bf16", "loss scaling", "label smoothing", "calibration", "knowledge distillation", "temperature", "soft targets"] },
          { id: "2.6", title: "Neural ODEs and the Theory Corner", difficulty: "advanced", minutes: 38, tier: "should",
            summary: "The residual block as an Euler step and a Neural ODE trained with RK4; then the phenomena — double descent, grokking, the lottery ticket, the neural tangent kernel, the information bottleneck, implicit bias, flat minima, scaling laws, calibration — each with an experiment where one fits in a minute.",
            keywords: ["neural ode", "residual", "double descent", "grokking", "lottery ticket", "ntk", "information bottleneck", "implicit bias", "flat minima", "scaling laws"] }
        ]
      },

      /* ================================================================
         PHASE 2 · IMAGES
         ================================================================ */
      {
        id: "cnn",
        short: "M3",
        dir: "03_cnn",
        phase: "Phase 2 · Images",
        title: "Convolutional Networks",
        blurb: "The convolution as an operation you can do by hand, pooling and the anatomy, a CNN from scratch, the architectures from LeNet to EfficientNet with the reason each one existed, training and transfer in PyTorch, detection, segmentation and Grad-CAM.",
        outcome: "You can compute an output shape and a receptive field without a calculator, explain why a skip connection fixes the degradation problem with a plot you made, implement NMS and mAP from nothing, and read a Grad-CAM heat map critically.",
        lessons: [
          { id: "3.1", title: "The Convolution Operation", difficulty: "core", minutes: 38, tier: "must",
            summary: "Cross-correlation by hand, kernel against feature map, stride, padding and the output-size formula, receptive field, 1×1, depthwise separable, group, dilated and transposed convolution with the checkerboard artefact, 1D and 3D — each verified in PyTorch.",
            keywords: ["convolution", "kernel", "stride", "padding", "output size", "receptive field", "1x1 convolution", "depthwise separable", "dilated", "transposed convolution", "checkerboard"] },
          { id: "3.2", title: "Pooling, Anatomy and a CNN from Scratch", difficulty: "core", minutes: 36, tier: "must",
            summary: "Max, average and global pooling, pooling against strided convolution, translation equivariance and invariance, the parameter and FLOP count of a network, then a CNN written in NumPy with im2col and its backward pass checked numerically.",
            keywords: ["pooling", "global average pooling", "equivariance", "invariance", "parameter count", "flops", "im2col", "cnn from scratch", "classification head"] },
          { id: "3.3", title: "The Architectures and Why Each Existed", difficulty: "core", minutes: 40, tier: "must",
            summary: "LeNet, AlexNet, VGG, Inception, ResNet and its bottleneck, DenseNet, MobileNet, EfficientNet, squeeze-and-excitation, CBAM — the lineage as a sequence of problems solved; the degradation problem reproduced and fixed with a skip connection.",
            keywords: ["lenet", "alexnet", "vgg", "inception", "resnet", "bottleneck", "densenet", "mobilenet", "efficientnet", "squeeze-and-excitation", "cbam", "skip connection"] },
          { id: "3.4", title: "Training a CNN in PyTorch", difficulty: "core", minutes: 36, tier: "must",
            summary: "A CNN on digits end to end: input normalisation, augmentation with torchvision transforms, BatchNorm placement, learning-rate schedule, test-time augmentation, progressive resizing, varying input sizes — and the checklist for a CNN that will not converge.",
            keywords: ["cnn training", "input normalisation", "torchvision transforms", "augmentation", "test-time augmentation", "progressive resizing", "adaptive pooling", "debugging cnn"] },
          { id: "3.5", title: "Transfer Learning for Vision", difficulty: "core", minutes: 34, tier: "must",
            summary: "Feature extraction, fine-tuning and the third strategy; which layers to freeze and why; discriminative learning rates; domain shift and negative transfer measured by pretraining on one task and transferring to another; cutmix and mixup as regularisers.",
            keywords: ["transfer learning", "feature extraction", "fine-tuning", "freeze layers", "discriminative learning rate", "domain shift", "negative transfer", "cutmix", "mixup"] },
          { id: "3.6", title: "Object Detection", difficulty: "advanced", minutes: 40, tier: "should",
            summary: "IoU, anchors and anchor-free, NMS and its variants implemented, mAP computed from scratch; the two-stage family from R-CNN to Faster R-CNN with RoI Align, FPN, the one-stage family from YOLO to RetinaNet with focal loss, DETR and bipartite matching, COCO metrics, 3D and oriented boxes.",
            keywords: ["object detection", "iou", "anchors", "nms", "map", "faster r-cnn", "roi align", "fpn", "yolo", "retinanet", "focal loss", "detr", "coco"] },
          { id: "3.7", title: "Segmentation and Grad-CAM", difficulty: "advanced", minutes: 38, tier: "should",
            summary: "Semantic, instance and panoptic segmentation; FCN, U-Net trained on synthetic masks, DeepLab and atrous pyramids, Mask R-CNN, SegFormer, the Segment Anything Model; Dice loss against cross-entropy; CAM and Grad-CAM implemented with hooks and read critically.",
            keywords: ["segmentation", "fcn", "u-net", "deeplab", "mask r-cnn", "panoptic", "dice loss", "segformer", "segment anything", "grad-cam", "cam", "explainability"] }
        ]
      },

      /* ================================================================
         PHASE 3 · SEQUENCES
         ================================================================ */
      {
        id: "sequence",
        short: "M4",
        dir: "04_sequence",
        phase: "Phase 3 · Sequences",
        title: "Recurrent and Sequence Models",
        blurb: "Why sequences need memory, the vanilla RNN and BPTT derived, the vanishing gradient measured through time, LSTM and GRU derived gate by gate and raced on a long-dependency task, the PyTorch contract with packing and masking, seq2seq with attention and beam search, CTC, and word embeddings trained from nothing.",
        outcome: "You can write the LSTM forward pass from memory and explain which path the gradient takes through the cell, pack a padded batch correctly, implement beam search and CTC's forward algorithm, and choose between an RNN and a transformer with reasons that survive questioning.",
        lessons: [
          { id: "4.1", title: "Sequential Data and the Vanilla RNN", difficulty: "core", minutes: 34, tier: "must",
            summary: "Why an MLP fails on sequences; the recurrence, the shared weights and the parameter count; one-to-many, many-to-one and many-to-many; the RNN forward pass in NumPy on a character task; hidden-state initialisation, stateful against stateless.",
            keywords: ["rnn", "sequential data", "hidden state", "recurrence", "many-to-one", "many-to-many", "parameter sharing", "stateful", "rnn from scratch"] },
          { id: "4.2", title: "Backpropagation Through Time", difficulty: "advanced", minutes: 38, tier: "must",
            summary: "BPTT derived step by step, the product of Jacobians and the bound that makes gradients vanish or explode, measured per time step on a real network; truncated BPTT; clipping; the common RNN training failures and their fixes.",
            keywords: ["bptt", "truncated bptt", "vanishing gradient", "exploding gradient", "jacobian", "gradient clipping", "rnn training"] },
          { id: "4.3", title: "LSTM, Derived", difficulty: "advanced", minutes: 40, tier: "must",
            summary: "Forget, input and output gates and the cell state, each equation with its shape; the additive path that preserves the gradient; the parameter count; peephole and coupled variants; the LSTM forward pass in NumPy and its PyTorch twin producing the same numbers.",
            keywords: ["lstm", "forget gate", "input gate", "output gate", "cell state", "constant error carousel", "peephole", "lstm from scratch", "parameter count"] },
          { id: "4.4", title: "GRU, and the Comparison That Matters", difficulty: "core", minutes: 34, tier: "must",
            summary: "Reset and update gates, GRU against LSTM in parameters and behaviour; RNN, LSTM and GRU raced on the adding problem at lengths 20, 50 and 100; bidirectional and stacked, variational dropout, echo state networks, TCNs and CNN+RNN hybrids.",
            keywords: ["gru", "update gate", "reset gate", "lstm vs gru", "adding problem", "bidirectional", "stacked rnn", "variational dropout", "tcn", "echo state network"] },
          { id: "4.5", title: "Sequence Models in PyTorch", difficulty: "core", minutes: 38, tier: "must",
            summary: "nn.RNN, nn.LSTM, nn.GRU and their output shapes; padding, packing and masking with a collate function; the embedding layer; sequence classification on text (the sentiment project), multi-step forecasting on a series (the stock project) with the naive baseline that is hard to beat.",
            keywords: ["nn.lstm", "pack_padded_sequence", "masking", "collate", "embedding layer", "sequence classification", "sentiment", "time series forecasting", "multi-step", "naive baseline"] },
          { id: "4.6", title: "Seq2Seq, Attention and Beam Search", difficulty: "advanced", minutes: 40, tier: "must",
            summary: "Encoder–decoder with teacher forcing and scheduled sampling; Bahdanau and Luong attention derived and implemented, global against local, hard against soft, the copy mechanism; greedy, beam search and sampling strategies implemented and compared on a translation-style task.",
            keywords: ["seq2seq", "encoder-decoder", "teacher forcing", "scheduled sampling", "bahdanau", "luong", "attention", "copy mechanism", "beam search", "top-k", "nucleus sampling"] },
          { id: "4.7", title: "CTC Loss and Language Modelling", difficulty: "advanced", minutes: 36, tier: "should",
            summary: "The alignment problem, the blank token and the collapse rule; CTC's forward algorithm worked on a three-step example and checked against torch; greedy and prefix decoding; language models, perplexity derived, character against word level, text generation with an RNN, CRF layers for tagging.",
            keywords: ["ctc", "blank token", "forward algorithm", "alignment", "language model", "perplexity", "text generation", "crf", "ner", "sequence labelling"] },
          { id: "4.8", title: "Word Embeddings", difficulty: "core", minutes: 34, tier: "must",
            summary: "One-hot to dense; skip-gram with negative sampling trained from nothing on a small corpus and its analogies checked; CBOW, GloVe, fastText; contextual embeddings and ELMo; tokenisation at word, character and subword level with BPE implemented.",
            keywords: ["word embeddings", "word2vec", "skip-gram", "negative sampling", "cbow", "glove", "fasttext", "elmo", "contextual embeddings", "bpe", "tokenisation"] }
        ]
      },

      {
        id: "attention",
        short: "M5",
        dir: "05_attention",
        phase: "Phase 3 · Sequences",
        title: "Attention and the Transformer",
        blurb: "Self-attention from a dot product upward, the block with every component justified, a small transformer trained and compared with the LSTM on the same task, and the map of the family — as far as a deep-learning course takes it before the NLP course takes over.",
        outcome: "You can implement scaled dot-product and multi-head attention from scratch with masks, explain why the scale is √d and why the positional encoding is needed, and place BERT, GPT, T5, ViT and the efficiency variants on one map.",
        lessons: [
          { id: "5.1", title: "Self-Attention from Scratch", difficulty: "advanced", minutes: 38, tier: "must",
            summary: "Queries, keys and values; the scaled dot product with the √d justified by a variance calculation; softmax and the attention matrix read row by row; multi-head attention implemented and checked against nn.MultiheadAttention; padding and causal masks; cross-attention; the O(n²) cost measured.",
            keywords: ["self-attention", "query key value", "scaled dot-product", "multi-head attention", "causal mask", "padding mask", "cross-attention", "attention complexity"] },
          { id: "5.2", title: "The Transformer Block", difficulty: "advanced", minutes: 40, tier: "must",
            summary: "Sinusoidal, learned, relative, RoPE and ALiBi positions; the feed-forward network; pre-norm against post-norm; encoder, decoder and the KV cache; a small transformer trained on the translation task from 4.6 and compared with the LSTM; the sentiment project with all four models.",
            keywords: ["positional encoding", "rope", "alibi", "feed-forward", "layer norm", "pre-norm", "encoder", "decoder", "kv cache", "transformer training", "machine translation"] },
          { id: "5.3", title: "The Transformer Family, Mapped", difficulty: "advanced", minutes: 36, tier: "should",
            summary: "Encoder-only, decoder-only and encoder–decoder: BERT, GPT, T5; ViT with patch embedding implemented, Swin, CLIP, Whisper; MoE, Flash Attention, MQA and GQA, sliding windows, attention sinks, state-space models; temperature and top-p run; RNN against transformer; the pointers into the NLP and GenAI courses.",
            keywords: ["bert", "gpt", "t5", "vit", "swin", "clip", "mixture of experts", "flash attention", "gqa", "sliding window", "state space model", "temperature", "top-p", "rnn vs transformer"] }
        ]
      },

      /* ================================================================
         PHASE 4 · THE OTHER PARADIGMS
         ================================================================ */
      {
        id: "generative",
        short: "M6",
        dir: "06_generative",
        phase: "Phase 4 · The other paradigms",
        title: "Generative Models",
        blurb: "Autoencoders in their variants, the VAE with the ELBO derived and the reparameterisation trick, GANs with mode collapse reproduced and the fixes applied one at a time, then diffusion, normalising flows and energy-based models on a distribution you can see.",
        outcome: "You can derive the ELBO, explain why the reparameterisation trick is needed, diagnose mode collapse from a plot and name the fix, and choose between a VAE, a GAN and a diffusion model for a stated requirement.",
        lessons: [
          { id: "6.1", title: "Autoencoders", difficulty: "core", minutes: 34, tier: "must",
            summary: "Undercomplete and overcomplete, the bottleneck against PCA measured, denoising, sparse and contractive variants, convolutional autoencoders, anomaly detection by reconstruction error, sequence autoencoders, choosing the latent size, the masked autoencoder.",
            keywords: ["autoencoder", "bottleneck", "pca", "denoising autoencoder", "sparse autoencoder", "contractive", "convolutional autoencoder", "anomaly detection", "latent dimension", "masked autoencoder"] },
          { id: "6.2", title: "Variational Autoencoders", difficulty: "advanced", minutes: 40, tier: "must",
            summary: "The latent-variable model, the ELBO derived line by line, the KL term in closed form, the reparameterisation trick and why the gradient needs it; β-VAE and disentanglement, posterior collapse and KL annealing, conditional VAE, VQ-VAE, the Wasserstein autoencoder.",
            keywords: ["vae", "elbo", "kl divergence", "reparameterisation trick", "beta-vae", "posterior collapse", "kl annealing", "cvae", "vq-vae", "disentanglement"] },
          { id: "6.3", title: "Generative Adversarial Networks", difficulty: "advanced", minutes: 42, tier: "must",
            summary: "The minimax game and its optimum, the non-saturating loss, mode collapse reproduced on eight Gaussians and fixed by WGAN-GP and spectral normalisation; DCGAN, cGAN, LSGAN, TTUR, feature matching, label smoothing for D; FID and IS; the lineage from Pix2Pix to StyleGAN; ethics.",
            keywords: ["gan", "minimax", "mode collapse", "wgan", "gradient penalty", "spectral normalisation", "dcgan", "conditional gan", "fid", "inception score", "pix2pix", "cyclegan", "stylegan"] },
          { id: "6.4", title: "Diffusion, Flows and Energy Models", difficulty: "advanced", minutes: 40, tier: "should",
            summary: "The forward noising process and its closed form, the noise-prediction objective, DDPM trained and sampled on a 2-D distribution; normalising flows with an affine coupling layer implemented, Glow; energy-based models; when to use a VAE, a GAN or a diffusion model.",
            keywords: ["diffusion", "ddpm", "noise schedule", "denoising", "normalising flow", "affine coupling", "glow", "energy-based model", "gan vs diffusion vs vae"] }
        ]
      },

      {
        id: "transfer",
        short: "M7",
        dir: "07_transfer",
        phase: "Phase 4 · The other paradigms",
        title: "Transfer, Self-Supervision and Meta-Learning",
        blurb: "Fine-tuning as a discipline with LoRA and the parameter-efficient family implemented, self-supervised learning with a SimCLR-style loss trained and the collapse problem shown, then few-shot, metric, meta and continual learning with the forgetting measured and fixed.",
        outcome: "You can decide between a linear probe, partial and full fine-tuning from a plot, implement LoRA in twenty lines and say how many parameters it saved, explain why BYOL does not collapse, and measure catastrophic forgetting before applying EWC.",
        lessons: [
          { id: "7.1", title: "Fine-Tuning and Parameter-Efficient Methods", difficulty: "advanced", minutes: 40, tier: "must",
            summary: "Linear probe, partial and full fine-tuning compared; discriminative rates, warmup, ULMFiT; catastrophic forgetting and progressive fine-tuning; model soups and merging; LoRA implemented with its parameter count, QLoRA, adapters, prefix and prompt tuning, BitFit; when fine-tuning fails.",
            keywords: ["fine-tuning", "linear probe", "lora", "qlora", "adapters", "prompt tuning", "prefix tuning", "bitfit", "peft", "ulmfit", "model soups", "catastrophic forgetting"] },
          { id: "7.2", title: "Self-Supervised Learning", difficulty: "advanced", minutes: 40, tier: "must",
            summary: "Pretext tasks; contrastive learning with NT-Xent implemented and trained, the role of augmentations and negatives; MoCo, BYOL, SimSiam, Barlow Twins, VICReg, DINO and the collapse problem; masked modelling with MAE and BEiT; CLIP, data2vec, CPC, I-JEPA; the linear-probing protocol.",
            keywords: ["self-supervised", "contrastive learning", "simclr", "nt-xent", "moco", "byol", "simsiam", "barlow twins", "vicreg", "dino", "mae", "clip", "linear probing", "representation collapse"] },
          { id: "7.3", title: "Few-Shot, Meta and Continual Learning", difficulty: "advanced", minutes: 38, tier: "should",
            summary: "Siamese networks with contrastive and triplet loss, prototypical networks trained episodically, MAML in its inner and outer loop, zero-shot, multi-task and curriculum learning; continual learning with the forgetting measured and EWC applied; the stability–plasticity dilemma; test-time training.",
            keywords: ["few-shot", "siamese", "triplet loss", "prototypical networks", "maml", "meta-learning", "zero-shot", "multi-task", "curriculum learning", "continual learning", "ewc", "stability-plasticity"] }
        ]
      },

      {
        id: "rl",
        short: "M8",
        dir: "08_rl",
        phase: "Phase 4 · The other paradigms",
        title: "Reinforcement Learning",
        blurb: "The MDP and the Bellman equations, tabular Q-learning and DQN on environments written by hand, policy gradients derived from the log-derivative trick, actor–critic, GAE and PPO implemented, and the map of the field from model-based to RLHF.",
        outcome: "You can derive the policy-gradient theorem, explain why DQN needs a replay buffer and a target network with an ablation you ran, implement PPO's clipped objective, and place any named RL method on the on/off-policy and model-free/model-based axes.",
        lessons: [
          { id: "8.1", title: "MDPs, Q-Learning and DQN", difficulty: "advanced", minutes: 40, tier: "must",
            summary: "States, actions, rewards, the discount and the return; value and Q functions and the Bellman equations; TD error; ε-greedy exploration; tabular Q-learning on a grid world, then DQN with experience replay and a target network on a hand-built control task, with each component ablated.",
            keywords: ["mdp", "bellman", "discount factor", "q-learning", "td error", "exploration", "epsilon-greedy", "dqn", "experience replay", "target network"] },
          { id: "8.2", title: "Policy Gradients, Actor–Critic and PPO", difficulty: "advanced", minutes: 40, tier: "must",
            summary: "REINFORCE derived from the log-derivative trick and its variance; baselines and the advantage; actor–critic, A2C and A3C; GAE with λ; PPO's clipped objective implemented and compared with REINFORCE; SAC and entropy; on-policy against off-policy.",
            keywords: ["policy gradient", "reinforce", "baseline", "advantage", "actor-critic", "a2c", "a3c", "gae", "ppo", "clipping", "sac", "on-policy", "off-policy"] },
          { id: "8.3", title: "The RL Landscape", difficulty: "advanced", minutes: 34, tier: "should",
            summary: "Model-based RL, MCTS on a game you can check, world models; imitation and inverse RL; offline RL and the decision transformer; hierarchical, goal-conditioned and multi-agent RL, self-play; reward shaping, sparse rewards, curiosity and reward hacking; safe RL; RLHF, DPO and GRPO as pointers into the GenAI course.",
            keywords: ["model-based", "mcts", "world model", "imitation learning", "inverse rl", "offline rl", "decision transformer", "hierarchical rl", "multi-agent", "self-play", "reward shaping", "reward hacking", "rlhf", "dpo", "grpo"] }
        ]
      },

      {
        id: "gnn",
        short: "M9",
        dir: "09_gnn",
        phase: "Phase 4 · The other paradigms",
        title: "Graph Neural Networks",
        blurb: "Graphs as tensors, message passing, a GCN layer derived and implemented from the normalised adjacency, over-smoothing measured with depth, then GraphSAGE, GAT and GIN with the expressivity argument, pooling, link prediction and the practical questions.",
        outcome: "You can write a GCN layer with nothing but matrix products, explain why sixteen layers make every node look the same with the numbers that show it, and choose between GCN, GraphSAGE, GAT and GIN for a stated graph.",
        lessons: [
          { id: "9.1", title: "Message Passing and the GCN", difficulty: "advanced", minutes: 40, tier: "must",
            summary: "Adjacency, degree and features as tensors; the message-passing paradigm; the GCN propagation rule derived from the spectral view and implemented in plain PyTorch; node classification on a real small graph; over-smoothing measured as depth grows; transductive against inductive; homophily.",
            keywords: ["gnn", "message passing", "gcn", "normalised adjacency", "spectral", "node classification", "over-smoothing", "transductive", "inductive", "homophily", "karate club"] },
          { id: "9.2", title: "GraphSAGE, GAT, GIN and the Rest", difficulty: "advanced", minutes: 40, tier: "should",
            summary: "Neighbourhood sampling and aggregation, attention coefficients computed by hand, the WL test and GIN's expressivity, graph pooling and classification, link prediction, heterogeneous and dynamic graphs, mini-batching, over-squashing, positional encodings, graph transformers, PageRank and node2vec, the frameworks, debugging.",
            keywords: ["graphsage", "gat", "gin", "weisfeiler-lehman", "graph pooling", "graph classification", "link prediction", "heterogeneous graph", "over-squashing", "graph transformer", "node2vec", "pyg", "dgl"] }
        ]
      },

      /* ================================================================
         PHASE 5 · AUDIO, PRODUCTION AND THE INTERVIEW
         ================================================================ */
      {
        id: "audio",
        short: "M10",
        dir: "10_audio",
        phase: "Phase 5 · Audio, production and the interview",
        title: "Audio and Speech",
        blurb: "The signal from sampling to MFCCs computed by hand in NumPy, the three speech-recognition architectures with CTC worked and trained, RNN-T and Whisper, decoding with a language model, text to speech, VAD and diarisation, the metrics and the deployment constraints.",
        outcome: "You can build a mel front end without a library and say what each step throws away, compute WER, explain CTC's forward algorithm and RNN-T's streaming advantage, and describe the pipeline from microphone to transcript with its failure modes.",
        lessons: [
          { id: "10.1", title: "The Audio Front End", difficulty: "core", minutes: 36, tier: "must",
            summary: "Sampling, Nyquist and aliasing shown, bit depth; framing and windowing, the STFT and the spectrogram; the mel scale and the filterbank; MFCCs and whether you still need them; the whole front end in forty lines of NumPy against the library version.",
            keywords: ["sampling rate", "nyquist", "aliasing", "bit depth", "framing", "window", "stft", "spectrogram", "mel scale", "filterbank", "mfcc", "log-mel"] },
          { id: "10.2", title: "Speech Recognition: CTC, RNN-T and Whisper", difficulty: "advanced", minutes: 40, tier: "must",
            summary: "The three ASR architectures; wav2vec 2.0 and HuBERT as pretraining; CTC worked and a CTC model trained on synthetic speech-like sequences; RNN-T and streaming; Whisper's design; greedy, beam and language-model decoding with biasing; WER and CER computed.",
            keywords: ["asr", "ctc", "rnn-t", "streaming", "whisper", "wav2vec", "hubert", "beam search", "language model", "biasing", "wer", "cer"] },
          { id: "10.3", title: "TTS, VAD, Robustness and Deployment", difficulty: "advanced", minutes: 34, tier: "should",
            summary: "Text to speech from text analysis to acoustic model to vocoder; VAD, wake words and diarisation; MOS and real-time factor; noise, reverberation and SpecAugment implemented; on-device constraints and quantised acoustic models; the pitfalls list.",
            keywords: ["tts", "vocoder", "vad", "wake word", "diarisation", "mos", "real-time factor", "specaugment", "noise robustness", "on-device"] }
        ]
      },

      {
        id: "production",
        short: "M11",
        dir: "11_production",
        phase: "Phase 5 · Audio, production and the interview",
        title: "Compression, Deployment, NAS and the Interview",
        blurb: "Pruning and quantisation with the accuracy–size trade-off measured, distillation and efficient architectures with ONNX latency timed, inference optimisation from fusion to batching, neural architecture search and AutoML with a small search run, and the interview — the two hundred questions distilled and the from-scratch implementations.",
        outcome: "You can take a trained network to a quarter of its size and say what it cost in accuracy, export it and measure the latency honestly, explain DARTS and Hyperband, and answer the questions every deep-learning round asks with a derivation or a number.",
        lessons: [
          { id: "11.1", title: "Pruning and Quantisation", difficulty: "advanced", minutes: 38, tier: "must",
            summary: "Magnitude, structured and channel pruning with sparsity against accuracy measured; the lottery ticket reproduced; post-training quantisation with calibration, quantisation-aware training, INT8 and INT4, weight against activation quantisation, activation functions that quantise badly; combining the two.",
            keywords: ["pruning", "structured pruning", "channel pruning", "lottery ticket", "quantisation", "ptq", "qat", "calibration", "int8", "int4", "sparsity"] },
          { id: "11.2", title: "Distillation, Export and Inference Optimisation", difficulty: "advanced", minutes: 38, tier: "must",
            summary: "Logit, feature and progressive distillation; depthwise-separable and other efficient blocks; ONNX export and onnxruntime timed against eager PyTorch; TorchScript, torch.compile, operator fusion; TensorRT, Triton, CoreML; batching and the latency curve; profiling first; CPU against GPU; edge AI; data and model parallelism.",
            keywords: ["knowledge distillation", "feature distillation", "onnx", "onnxruntime", "torchscript", "torch.compile", "operator fusion", "tensorrt", "triton", "coreml", "batching", "latency", "profiling", "edge ai"] },
          { id: "11.3", title: "Neural Architecture Search and AutoML", difficulty: "advanced", minutes: 34, tier: "should",
            summary: "Search spaces, cell against macro; random search, evolution, RL and DARTS; one-shot supernets and weight sharing, Once-for-All, hardware-aware search, zero-cost proxies run on candidate networks; HPO with Bayesian optimisation, Hyperband and PBT; automated augmentation; NAS-Bench.",
            keywords: ["nas", "search space", "darts", "supernet", "one-shot", "once-for-all", "hardware-aware", "zero-cost proxy", "hyperparameter optimisation", "bayesian optimisation", "hyperband", "pbt", "automl"] },
          { id: "11.4", title: "The Deep Learning Interview", difficulty: "advanced", minutes: 44, tier: "must",
            summary: "The two hundred questions distilled to the forty that recur; the from-scratch implementations asked live — backprop, a convolution, attention, an LSTM cell; the scenario rounds from the AI-engineer interviews; the four projects summarised; the edge-case questions and the one piece of advice.",
            keywords: ["interview", "from scratch", "backprop from scratch", "attention from scratch", "convolution from scratch", "lstm from scratch", "scenario", "ai engineer", "edge cases"] }
        ]
      }

    ]
  });
})();
