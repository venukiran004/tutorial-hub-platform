/* ============================================================================
   LESSON 5.3 — The Transformer Family, Mapped
   ========================================================================= */
EC.receiveLesson({
  id: "5.3",

  lede: "**Every transformer variant is the same block with one of four things changed: which positions may attend to which, how the position is encoded, how keys and values are shared or cached, and what the training objective is.** This lesson is the map, with one executed measurement per branch: a Vision Transformer on 28 × 28 digits (49 patch tokens, 0.865 in three epochs against a CNN's 0.988 — the inductive-bias story), the KV cache of a 7-billion-parameter model (2.15 GB per 4,096-token sequence, 0.07 GB with multi-query attention), a sliding-window mask, a mixture-of-experts router, and a linear recurrence shown to be a convolution — the idea state-space models are built on. It ends where this course hands over to the NLP and GenAI courses: BERT, GPT and T5 as objectives; LoRA and RLHF as pointers.",

  objectives: [
    "Classify encoder-only, decoder-only and encoder–decoder transformers by their masks and objectives (BERT, GPT, T5)",
    "Build a ViT from patches and read its result against a CNN on little data",
    "Compute KV-cache memory and explain MQA/GQA, Flash Attention, sliding windows and attention sinks as responses to it",
    "Explain mixture-of-experts routing and state-space models with a small executed example each",
    "Place the RNN against the transformer on four axes using the course's own measurements, and know what the next courses cover"
  ],

  prerequisites: ["5.2"],

  blocks: [

    { t: "h2", n: "01", text: "Three shapes, three objectives", id: "shapes" },

    { t: "table", head: ["Family", "Attention", "Pretraining objective", "Examples", "Used for"],
      rows: [
        ["Encoder-only", "Bidirectional self-attention, no mask", "Masked language modelling: predict 15 % hidden tokens from both sides (+ next-sentence prediction in the original)", "BERT, RoBERTa (more data, no NSP), ALBERT (shared weights), DeBERTa", "Classification, tagging, retrieval embeddings — anything that reads"],
        ["Decoder-only", "Causal self-attention", "Next-token prediction (causal language modelling)", "GPT-1/2/3/4, LLaMA, Mistral, Claude", "Generation, and via prompting, everything"],
        ["Encoder–decoder", "Encoder unmasked; decoder causal + cross-attention", "Span corruption (T5), denoising (BART): map corrupted input to the original", "T5, BART, mT5, the original Transformer, Whisper", "Translation, summarisation, speech-to-text — sequence-to-sequence"]
      ] },

    { t: "p", text: "The block is the one from 5.2 in all three; what differs is the mask (5.1) and the training signal. BERT sees the whole sentence and predicts hidden words, which makes it a strong reader and a poor generator (it never learned to produce text left to right). GPT sees only the past and predicts the next token, which makes it a generator — and, at scale, a reader too, because predicting the next token of enough text requires understanding it. T5 recast every task as text-to-text with an encoder–decoder. The NLP course takes each of these apart; the GenAI course takes the decoder-only line to its present state." },

    { t: "dl", items: [
      ["Pre-training, fine-tuning, instruction tuning, RLHF", "Pre-train on the objective above at scale; fine-tune the whole model on a labelled task (7.1's recipe with warm-up and small rates); instruction-tune on (prompt, response) pairs so the model follows requests; align with reinforcement learning from human feedback (a reward model on preference pairs, then PPO or DPO — module 8.3 for the RL, GenAI for the practice)."],
      ["Parameter-efficient fine-tuning", "LoRA adds a low-rank update ΔW = BA to frozen weights (7.1 implements it); adapters insert small bottleneck layers; prefix and prompt tuning learn virtual tokens. Fine-tune a 7B model on one GPU."],
      ["Scaling laws", "Loss falls as a power law in parameters, data and compute (2.6 measured the data exponent on MNIST); Chinchilla's finding that tokens should scale with parameters set the modern recipe."],
      ["Chain-of-thought, in-context learning", "Emergent uses of a decoder-only model: worked reasoning in the prompt improves answers; examples in the prompt teach a task without gradient steps. GenAI course."]
    ] },

    { t: "h2", n: "02", text: "Vision Transformer", id: "vit" },

    { t: "code", lang: "text", title: "ViT on MNIST: patches as tokens (executed)",
      code: `28 × 28 image -> 4 × 4 patches -> 49 tokens, each embedded to d = 64 by one strided convolution; a learned [CLS] token and learned positions
4 pre-norm encoder blocks, 4 heads, FFN 128;  139,018 parameters; classify from the [CLS] output

20,000 training images, 3 epochs, AdamW + one-cycle:
  ViT      test acc per epoch  0.674   0.842   0.865      (219 s)
  CNN      test acc per epoch  0.955   0.985   0.988      (173 s;  140,458 parameters)`,
      caption: "Same parameter count, same data, same epochs: the CNN wins by twelve points. A convolution knows that nearby pixels matter and that a pattern is the same anywhere; a transformer must learn locality and translation equivariance from data, and 20,000 images are not enough. Dosovitskiy et al. showed ViT overtaking convolutional networks only with pretraining on 300 million images — at that scale the weaker inductive bias becomes an advantage, because the model is not constrained by assumptions the data can teach it better." },

    { t: "dl", items: [
      ["Swin", "Attention within local windows that shift between layers, with patch merging to build a hierarchy — a transformer with a convolutional network's shape, and a backbone for detection and segmentation (3.6, 3.7)."],
      ["CLIP", "An image encoder and a text encoder trained contrastively (7.2) on 400 million image–caption pairs so that matching pairs have high cosine similarity; zero-shot classification by comparing an image with 'a photo of a {class}'."],
      ["Whisper", "An encoder–decoder transformer on log-mel spectrograms (10.1) trained on 680,000 hours of weakly labelled audio; transcription and translation as text generation (10.2)."],
      ["DETR, SegFormer, SAM", "Transformers in detection and segmentation, met in 3.6 and 3.7."]
    ] },

    { t: "h2", n: "03", text: "The cost of decoding: the KV cache and its diets", id: "cache" },

    { t: "code", lang: "text", title: "KV cache for a 7B-class decoder (32 layers, 32 heads of 128) at 4,096 tokens, fp16 (executed arithmetic)",
      code: `K and V:  2 · layers · kv_heads · d_head · seq_len · 2 bytes
multi-head attention (32 KV heads)      2.15 GB per sequence
grouped-query attention (8 KV heads)    0.54 GB
multi-query attention (1 KV head)       0.07 GB

generation without a cache (5.2): the work per sequence grows as T², recomputing every prefix; with the cache, each new token attends to the stored keys and values`,
      caption: "The cache is what a decoder must hold per sequence to generate without recomputation, and it — not the weights — bounds how many sequences fit on a GPU at once. MQA (Shazeer, 2019) shares one K/V head across all query heads; GQA (Llama 2, Mistral) shares within groups of 4–8; both cut the cache by that factor with little accuracy loss. The projections for K and V shrink too, so the models are also smaller." },

    { t: "dl", items: [
      ["Flash Attention", "Computes exact attention without materialising the n × n matrix, by tiling the computation so that each tile of scores is softmaxed and multiplied with values while it is still in fast on-chip memory. Same result as 5.1's attention, memory linear in n, 2–4× faster on GPUs because attention is memory-bound. Not a different model; a different kernel."],
      ["Sliding-window attention", "Each position attends to the previous w tokens only (the mask below); cost linear in n, receptive field w × layers like a dilated convolution. Mistral's window is 4,096 over 32 layers. Longformer and BigBird add global tokens and random links."],
      ["Attention sinks and StreamingLLM", "Softmax must put its mass somewhere; models learn to park it on the first token, so keeping the first few tokens visible alongside a sliding window lets a model run on unbounded streams without collapsing."],
      ["Sparse and linear attention", "Fixed sparse patterns (Sparse Transformer), kernel approximations that replace softmax(QKᵀ)V with φ(Q)(φ(K)ᵀV) at linear cost (Performer, linear attention). Trade exactness for length."],
      ["Speculative decoding", "A small draft model proposes several tokens; the large model verifies them in one parallel pass and accepts the prefix that matches its own distribution. Same output distribution, 2–3× faster decoding. 11.2 for inference engineering."],
      ["Quantisation of transformers", "Weights in 8 or 4 bits (11.1); activations are harder because of outlier channels; KV cache quantisation is the newest lever on the table above."]
    ] },

    { t: "code", lang: "text", title: "Sliding-window causal mask, window 3, 8 positions (executed)",
      code: `1 0 0 0 0 0 0 0
1 1 0 0 0 0 0 0
1 1 1 0 0 0 0 0
0 1 1 1 0 0 0 0
0 0 1 1 1 0 0 0
0 0 0 1 1 1 0 0
0 0 0 0 1 1 1 0
0 0 0 0 0 1 1 1        each layer sees 3 tokens; L layers reach 3·L`,
      caption: "A band instead of a triangle. Information still travels the whole sequence through depth, as in a dilated convolution (3.1), but no single layer pays the n² cost." },

    { t: "h2", n: "04", text: "Mixture of experts and state-space models", id: "moe" },

    { t: "code", lang: "text", title: "A mixture-of-experts layer: top-2 routing over 4 expert FFNs (executed)",
      code: `router: a linear layer scores each token against E experts; softmax over the top-k scores; the token's output is the weighted sum of its k experts
6 tokens routed -> expert loads [4, 3, 4, 1];  each token runs 2 of the 4 experts
parameters in the layer 4,288; used per token 2,144       -- parameters scale with E, compute per token does not
a load-balancing auxiliary loss keeps the router from sending everything to one expert`,
      caption: "The FFN is two thirds of a block's parameters (5.2); MoE replaces it with E FFNs and a router, so a model can have eight times the parameters at the same per-token compute. Switch Transformer, Mixtral and most frontier models use it. The costs are memory (all experts must be resident), communication (tokens are shuffled between devices), and the balancing loss's tuning." },

    { t: "code", lang: "text", title: "A linear recurrence is a convolution — the state-space idea (executed)",
      code: `h_t = a·h_{t−1} + b·x_t,  y_t = c·h_t   with a = 0.9:
sequential output vs convolution of x with the kernel [cb, cab, ca²b, ca³b, …]:  max |diff| 4.8e-07

-> train as a convolution (parallel over time, like attention), run as a recurrence (constant memory per step, like an RNN)`,
      caption: "A tanh RNN cannot be unrolled this way because the non-linearity sits inside the recurrence. Structured state-space models (S4) make the recurrence linear with carefully parameterised a, b, c; Mamba makes a, b, c depend on the input (selective) and uses a parallel scan instead of a convolution. The result is a sequence model with the transformer's training parallelism and an RNN's O(1) inference state — the current challenger to attention at long context." },

    { t: "h2", n: "05", text: "RNN against transformer, from this course's own runs", id: "rnn-vs" },

    { t: "table", head: ["Axis", "RNN / LSTM", "Transformer", "Measured in"],
      rows: [
        ["Long dependencies", "Gradient through 50 steps 4 × 10⁻¹⁵ at radius 0.5; LSTM cell path ≈ constant with f ≈ 0.95", "Any distance in one attention step", "1.8, 4.2, 4.3, 5.1"],
        ["Training parallelism", "Sequential in T", "Parallel over T; O(T²) memory (268 MB at 8k tokens)", "5.1"],
        ["Inductive bias", "Order and (with CNNs) locality built in — won with little data (CNN 0.988 vs ViT 0.865)", "Learns them — wins at scale", "5.3"],
        ["Inference state", "Fixed-size hidden state per sequence", "KV cache growing with T (2.15 GB at 4k tokens for 7B)", "5.3"],
        ["Where each remains", "Small-data sequence tasks, on-device, streaming with tight memory", "Everything at scale; the default for text, vision, audio, structure", "—"]
      ] },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "A ViT and a CNN with the same 140k parameters trained on 20,000 MNIST images: 0.865 against 0.988. What is the right conclusion?",
          options: [
            "Transformers are worse than CNNs for images",
            "With little data, the CNN's built-in locality and translation equivariance are worth twelve points because the transformer has to learn those regularities from examples; the ViT paper's advantage appeared only after pretraining on hundreds of millions of images, where the weaker prior stops being a handicap",
            "The ViT needed more heads",
            "Patch size 4 was too small"
          ],
          answer: 1,
          why: "Inductive bias is data you do not have to collect. The same trade appears in 4.1 (the RNN's order bias) and 1.1 (the tabular regime): the more data, the less a prior is worth, and eventually it constrains."
        },
        {
          stem: "Why does multi-query attention cut the KV cache from 2.15 GB to 0.07 GB, and what does it cost?",
          options: [
            "It stores the cache in 4 bits",
            "It uses one key and one value head shared across all 32 query heads, so the cache holds 1/32 of the K/V tensors; the cost is some representational capacity in the keys and values (grouped-query attention with 8 KV heads is the usual compromise at 0.54 GB) and, for pretrained MHA models, a conversion step",
            "It truncates the context to 128 tokens",
            "It removes the value projection"
          ],
          answer: 1,
          why: "The cache — not the weights — limits how many sequences a GPU can serve at once, so its size is the lever on serving throughput. The arithmetic is 2 · layers · kv_heads · d_head · seq · bytes, and kv_heads is the term these methods shrink."
        },
        {
          stem: "A linear recurrence h_t = a·h_{t−1} + b·x_t produced the same outputs as a convolution with kernel [cb, cab, ca²b, …] to 5 × 10⁻⁷. Why does this matter for sequence modelling?",
          options: [
            "It shows RNNs are convolutions",
            "It means a linear-recurrence model can be trained as a convolution — parallel over time, like a transformer — and run as a recurrence with a fixed-size state at inference, like an RNN; state-space models (S4, Mamba) build on exactly this to get the transformer's training efficiency without its growing KV cache",
            "It means convolutions have infinite receptive fields",
            "It only holds for a = 0.9"
          ],
          answer: 1,
          why: "A tanh inside the recurrence breaks the equivalence, which is why classical RNNs could not be parallelised. Making the recurrence linear (and gating the inputs instead) recovers both properties, and the kernel's length is the whole sequence."
        }
      ] },

    { t: "exercise",
      kind: "Implement",
      title: "A ViT on digits, the cache arithmetic, a router, and the recurrence-as-convolution",
      difficulty: "advanced",
      minutes: 30,
      body: [
        { t: "p", text: "**(a)** Build a ViT for 28 × 28 images: a 4 × 4 strided convolution as patch embedding (49 tokens, d = 64), a learned [CLS] token and positional embeddings, four pre-norm encoder blocks, and a head on [CLS]. Train it and the CNN of 3.4 for three epochs on 20,000 MNIST images with AdamW and one-cycle; report accuracy per epoch, parameters and time." },
        { t: "p", text: "**(b)** Compute the fp16 KV-cache size per 4,096-token sequence for a 32-layer, 32-head, d_head 128 model with 32, 8 and 1 KV heads." },
        { t: "p", text: "**(c)** Implement a top-2 mixture-of-experts layer with four expert FFNs and a linear router; route six random tokens and report the expert loads and the parameters used per token against the layer's total." },
        { t: "p", text: "**(d)** For h_t = 0.9·h_{t−1} + x_t, y_t = h_t on 12 random inputs, compute the outputs sequentially and by convolution with the kernel [0.9ʲ] and report the maximum difference." }
      ],
      requirements: [
        "(a) two accuracy sequences with parameter counts and times.",
        "(b) three sizes in GB.",
        "(c) the loads and two parameter counts.",
        "(d) one maximum difference."
      ],
      hint: "(a) nn.Conv2d(1, d, 4, 4) then flatten(2).transpose(1, 2) gives the patch tokens; prepend the [CLS] token before adding positions. (c) Gather the top-2 router scores, softmax them, and accumulate each expert's output for the tokens that chose it. (d) The causal convolution at step t is Σ_{j≤t} 0.9^(t−j) x_j.",
      solution: {
        lang: "python",
        title: "Executed solution",
        code: `# (a) ViT (139,018 params):  0.674  0.842  0.865   (219 s)      CNN (140,458 params):  0.955  0.985  0.988   (173 s)

# (b) MHA 32 KV heads 2.15 GB;  GQA 8 KV heads 0.54 GB;  MQA 1 KV head 0.07 GB   (2 · 32 · kv_heads · 128 · 4096 · 2 bytes)

# (c) expert loads [4, 3, 4, 1] for 6 tokens with top-2;  4,288 params in the layer, 2,144 used per token

# (d) sequential vs convolution: max |diff| 4.8e-07`,
        notes: [
          { t: "p", text: "(a) is the inductive-bias experiment: at this data scale, the prior wins." },
          { t: "p", text: "(b) is the number that decides serving batch size; (c) is why frontier models have far more parameters than they use per token." },
          { t: "p", text: "(d) is the observation state-space models are built on, in one line of NumPy." }
        ]
      }
    }
  ],

  takeaways: [
    "Three shapes: encoder-only (BERT: masked LM, bidirectional, for reading), decoder-only (GPT: next token, causal, for generating and — at scale — everything), encoder–decoder (T5, BART, Whisper: sequence to sequence). Same block, different mask and objective.",
    "A ViT treats 4 × 4 patches as tokens; with 140k parameters on 20,000 digits it reached 0.865 against a CNN's 0.988 — inductive bias wins at small data, and ViT's advantage needed 300 M pretraining images. Swin, CLIP and Whisper are transformers with vision and audio front ends.",
    "The KV cache — 2 · layers · kv_heads · d_head · seq · bytes — is 2.15 GB per 4k-token sequence for a 7B model and bounds serving batch size; MQA (1 KV head) cuts it to 0.07 GB, GQA (8) to 0.54 GB. Flash Attention removes the n² memory of exact attention; sliding windows, sinks, sparse and linear attention change what is computed.",
    "Mixture of experts replaces the FFN with E experts and a top-k router: parameters scale with E, per-token compute does not (2,144 of 4,288 used per token here), at the cost of memory, communication and a balancing loss.",
    "A linear recurrence equals a convolution (max diff 5 × 10⁻⁷): state-space models train in parallel like transformers and run with a fixed state like RNNs — the current alternative to attention at long context.",
    "RNN vs transformer on the course's numbers: dependencies (10⁻¹⁵ through 50 RNN steps vs one attention step), parallelism (sequential vs O(T²)), inductive bias (wins small, loses at scale), inference state (fixed vs growing). LoRA, RLHF, instruction tuning and scaling laws are the handover to the NLP and GenAI courses."
  ],

  quiz: {
    title: "The Transformer Family — Knowledge Check",
    questions: [
      {
        stem: "What is the difference between BERT and GPT?",
        options: [
          "BERT is larger",
          "BERT is an encoder trained with masked language modelling — it sees a whole sentence with 15 % of tokens hidden and predicts them from both sides, which makes it a reader used for classification, tagging and embeddings; GPT is a causal decoder trained to predict the next token from the left context only, which makes it a generator, and at scale a reader through prompting",
          "GPT uses convolutions",
          "BERT cannot be fine-tuned"
        ],
        answer: 1,
        why: "The mask decides the objective and the objective decides the use. BERT-style models cannot generate fluently because they never trained left to right; GPT-style models turned out to subsume most reading tasks once large enough, which is why the field moved to decoder-only."
      },
      {
        stem: "What does the KV cache store and why does it grow with sequence length?",
        options: [
          "The model's weights for each layer",
          "For every generated token, every layer's key and value vectors for every head, so that the next token can attend to the whole prefix without recomputing it; each new token appends one more entry per layer and head, so the cache grows linearly with the sequence — 2.15 GB at 4,096 tokens for a 7B model in fp16",
          "The attention matrices",
          "The tokeniser's vocabulary"
        ],
        answer: 1,
        why: "Without the cache, generating T tokens recomputes every prefix and costs T² work (5.2 measured it). With it, decoding is linear but memory-bound, which is why MQA/GQA, quantised caches and paged attention are inference's main levers."
      },
      {
        stem: "How does Flash Attention differ from sparse or linear attention?",
        options: [
          "It approximates the softmax",
          "It computes exactly the same attention as the standard formula but tiles the computation so the n × n score matrix is never written to slow memory — a kernel-level change with linear memory and large speedups on memory-bound GPUs; sparse and linear attention change what is computed to reduce the n² cost, trading exactness for length",
          "It attends only to a window",
          "It removes the value projection"
        ],
        answer: 1,
        why: "Flash Attention is why 5.1's 268 MB attention matrix at 8k tokens is not a problem on modern GPUs; the model is unchanged. The approximations are a separate family with their own accuracy trade-offs."
      },
      {
        stem: "Why does a mixture-of-experts model have far more parameters than it uses per token, and what does that buy?",
        options: [
          "Because most experts are never trained",
          "Because the router sends each token to only k of E expert FFNs (2 of 4 here: 2,144 of 4,288 parameters used), so total capacity scales with E while per-token compute stays that of a dense model of k experts; it buys accuracy per FLOP at the cost of memory to hold every expert, cross-device communication, and a load-balancing loss",
          "Because the experts share weights",
          "Because routing is done by the tokeniser"
        ],
        answer: 1,
        why: "The FFN is two thirds of a block's parameters, so replacing it with a routed set is the natural place to add capacity. Mixtral's 8 × 7B uses 2 experts per token; frontier models follow the same design."
      },
      {
        stem: "State-space models are described as having the best of both RNNs and transformers. In what sense?",
        options: [
          "They have attention and recurrence in every layer",
          "Their recurrence is linear, so it can be computed as a convolution or a parallel scan during training (parallel over time, like attention) and run as a recurrence at inference (a fixed-size state per sequence, like an RNN, instead of a growing KV cache); the executed identity between the recurrence and its kernel is the mechanism",
          "They are trained with reinforcement learning",
          "They use no positional information"
        ],
        answer: 1,
        why: "The non-linearity inside a classical RNN's recurrence is what prevented parallel training; moving the non-linearity outside the recurrence and gating the inputs (Mamba's selectivity) restored it. Whether they match attention on the hardest tasks is the open question the field is working on."
      }
    ]
  },

  interview: {
    title: "Interview Questions — The Transformer Family",
    sub: "The three shapes, ViT against CNN, the KV cache and its remedies, MoE and SSMs, and RNN against transformer.",
    questions: [
      {
        level: "Core",
        q: "Compare encoder-only, decoder-only and encoder–decoder transformers.",
        strong: "They share the block of 5.2 and differ in mask and objective. Encoder-only models — BERT and its descendants — use unmasked bidirectional self-attention and are pretrained by masked language modelling: hide 15 % of the tokens and predict them from both sides. That produces excellent representations for reading tasks (classification, tagging, retrieval embeddings) and a model that cannot generate, because it never learned to produce text left to right. Decoder-only models — the GPT line — use causal self-attention and predict the next token; they generate, and at scale they read too, because predicting the next token of enough text requires understanding it, which is why prompting turned them into general-purpose systems and why the field converged on this shape. Encoder–decoder models — the original Transformer, T5, BART, Whisper — read the source with an unmasked encoder and generate with a causal decoder that cross-attends to it; they are the natural fit for translation, summarisation and speech-to-text, and T5's span-corruption objective recast every task as text-to-text. The practical rule: an encoder for representations you will classify or search, a decoder for anything you will generate or prompt, an encoder–decoder when input and output are different sequences and the input is long.",
        answer: [
          { t: "p", text: "The shared block, each family's mask and objective with examples, what each is good for, and why decoder-only won." }
        ]
      },
      {
        level: "Advanced",
        q: "What limits transformer inference and what are the remedies?",
        strong: "Memory, more than compute. Decoding is one token at a time, and to avoid recomputing the prefix each step keeps a KV cache: every layer's keys and values for every head and every token — 2 · layers · kv_heads · d_head · seq · bytes, which is 2.15 GB per 4,096-token sequence for a 7B model in fp16. The cache, not the weights, bounds how many sequences fit on a GPU, and each decode step is memory-bound, streaming the weights and cache through the chip for a single token's arithmetic. The remedies attack the cache size, the memory traffic, and the number of steps. Multi-query and grouped-query attention share K/V heads across query heads — 0.07 GB with one KV head, 0.54 GB with eight — with little accuracy loss. Flash Attention tiles the attention computation so the n × n matrix never touches slow memory: exact, linear in memory, and faster because the operation is memory-bound. Sliding-window attention bounds the cache to the window, with attention sinks keeping the first tokens visible so the softmax has somewhere to put its mass. Quantising weights and cache to 8 or 4 bits shrinks both. Speculative decoding uses a small draft model to propose several tokens that the large model verifies in one parallel pass, cutting steps two- or threefold at the same output distribution. And beyond attention, state-space models replace the growing cache with a fixed recurrent state.",
        answer: [
          { t: "p", text: "The cache arithmetic and the memory-bound step, then the remedies grouped by what they attack, with the executed sizes." }
        ]
      },
      {
        level: "Core",
        q: "When would you still choose an RNN over a transformer?",
        strong: "When the data are small, the sequences are streams, or the memory is tight. The course's measurements give the reasons. Inductive bias: a convolution or recurrence builds in locality and order, and with 20,000 images a 140k-parameter CNN reached 0.988 where a same-size ViT reached 0.865 — a transformer must learn those regularities from data, and on small datasets it does not. Inference state: an RNN or LSTM carries a fixed-size hidden state per sequence, so it runs on an unbounded stream in constant memory, where a transformer's KV cache grows with every token (2.15 GB per 4k tokens for a 7B model) — for on-device, real-time or embedded sequence processing that matters. Simplicity: a GRU with 13k parameters solved the adding problem at length 100; the transformer's advantages are about scale and parallel training. Where the transformer wins — and it wins almost everywhere at scale — is long dependencies (one attention step against a gradient of 10⁻¹⁵ through fifty recurrent steps), training parallelism, and the ability to absorb enormous data without a constraining prior. State-space models are the attempt to keep the RNN's inference profile with the transformer's training profile, and if they succeed the question changes.",
        answer: [
          { t: "p", text: "Three situations with the course's executed evidence, the transformer's advantages, and the SSM prospect." }
        ]
      }
    ]
  }
});
