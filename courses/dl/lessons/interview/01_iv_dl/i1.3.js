/* ============================================================================
   INTERVIEW I1.3 — RNNs, LSTMs & Sequence Models
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/05_Deep_Learning/00_Interview_Bank/01_DL_Interview.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "i1.3",
 "lede": "**15 questions** from Deep Learning Interview Bank. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
 "objectives": [
  "Answer each question as you would in the interview, then compare against the reference answer",
  "Lead with the definition and the formula, then the trade-off",
  "Follow up on your own answer with the question an interviewer would ask next",
  "Note which questions you could not answer and return to the lesson that covers them"
 ],
 "prerequisites": [],
 "blocks": [
  {
   "t": "h2",
   "n": "01",
   "text": "RNNs, LSTMs & Sequence Models",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "36",
   "q": "Derive the vanilla RNN forward and backward passes.",
   "body": [
    {
     "t": "p",
     "text": "**Forward pass at time step \\(t\\):**"
    },
    {
     "t": "math",
     "tex": "\\mathbf{h}_t = \\tanh(\\mathbf{W}_{hh}\\mathbf{h}_{t-1} + \\mathbf{W}_{xh}\\mathbf{x}_t + \\mathbf{b}_h)"
    },
    {
     "t": "math",
     "tex": "\\hat{\\mathbf{y}}_t = \\text{softmax}(\\mathbf{W}_{hy}\\mathbf{h}_t + \\mathbf{b}_y)"
    },
    {
     "t": "p",
     "text": "**Loss:** \\(\\mathcal{L} = \\sum_t \\mathcal{L}_t\\) (sum over time steps)"
    },
    {
     "t": "p",
     "text": "**Backpropagation Through Time (BPTT):**"
    },
    {
     "t": "math",
     "tex": "\\frac{\\partial\\mathcal{L}}{\\partial\\mathbf{W}_{hh}} = \\sum_{t=1}^T\\sum_{k=1}^t \\frac{\\partial\\mathcal{L}_t}{\\partial\\hat{\\mathbf{y}}_t}\\frac{\\partial\\hat{\\mathbf{y}}_t}{\\partial\\mathbf{h}_t}\\left(\\prod_{j=k+1}^t\\frac{\\partial\\mathbf{h}_j}{\\partial\\mathbf{h}_{j-1}}\\right)\\frac{\\partial\\mathbf{h}_k}{\\partial\\mathbf{W}_{hh}}"
    },
    {
     "t": "p",
     "text": "Each term \\(\\frac{\\partial\\mathbf{h}_j}{\\partial\\mathbf{h}_{j-1}} = \\text{diag}(\\tanh'(\\mathbf{z}_j))\\mathbf{W}_{hh}\\)"
    },
    {
     "t": "p",
     "text": "The product of \\(T-k\\) Jacobians causes vanishing/exploding gradients over long sequences."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "37",
   "q": "Derive LSTM gates mathematically. Show how cell state prevents vanishing gradients.",
   "body": [
    {
     "t": "p",
     "text": "For input \\(\\mathbf{x}_t\\in\\mathbb{R}^d\\), hidden state \\(\\mathbf{h}_{t-1}\\in\\mathbb{R}^h\\), cell state \\(\\mathbf{c}_{t-1}\\in\\mathbb{R}^h\\):"
    },
    {
     "t": "p",
     "text": "**Gate equations:**"
    },
    {
     "t": "math",
     "tex": "\\mathbf{f}_t = \\sigma(\\mathbf{W}_f[\\mathbf{h}_{t-1};\\mathbf{x}_t] + \\mathbf{b}_f) \\quad \\text{[forget gate] — how much to forget}"
    },
    {
     "t": "math",
     "tex": "\\mathbf{i}_t = \\sigma(\\mathbf{W}_i[\\mathbf{h}_{t-1};\\mathbf{x}_t] + \\mathbf{b}_i) \\quad \\text{[input gate] — what to write}"
    },
    {
     "t": "math",
     "tex": "\\tilde{\\mathbf{c}}_t = \\tanh(\\mathbf{W}_c[\\mathbf{h}_{t-1};\\mathbf{x}_t] + \\mathbf{b}_c) \\quad \\text{[cell candidate]}"
    },
    {
     "t": "math",
     "tex": "\\mathbf{o}_t = \\sigma(\\mathbf{W}_o[\\mathbf{h}_{t-1};\\mathbf{x}_t] + \\mathbf{b}_o) \\quad \\text{[output gate] — what to read}"
    },
    {
     "t": "p",
     "text": "**State updates:**"
    },
    {
     "t": "math",
     "tex": "\\mathbf{c}_t = \\mathbf{f}_t \\odot \\mathbf{c}_{t-1} + \\mathbf{i}_t \\odot \\tilde{\\mathbf{c}}_t"
    },
    {
     "t": "math",
     "tex": "\\mathbf{h}_t = \\mathbf{o}_t \\odot \\tanh(\\mathbf{c}_t)"
    },
    {
     "t": "p",
     "text": "**Why does cell state solve vanishing gradients?**"
    },
    {
     "t": "math",
     "tex": "\\frac{\\partial\\mathbf{c}_t}{\\partial\\mathbf{c}_{t-1}} = \\text{diag}(\\mathbf{f}_t)"
    },
    {
     "t": "p",
     "text": "The gradient flows through cell state simply as multiplication by \\(\\mathbf{f}_t\\in[0,1]\\). When forget gate \\(\\approx 1\\) (remember mode), gradient flows without attenuation. The cell state acts as a **gradient highway**."
    },
    {
     "t": "p",
     "text": "**Parameter count:** \\(4\\times h\\times(h+d+1)\\) (4 gates, each a linear layer)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "38",
   "q": "Derive GRU equations. Compare parameter efficiency with LSTM.",
   "body": [
    {
     "t": "math",
     "tex": "\\mathbf{z}_t = \\sigma(\\mathbf{W}_z[\\mathbf{h}_{t-1};\\mathbf{x}_t]) \\quad \\text{[update gate]}"
    },
    {
     "t": "math",
     "tex": "\\mathbf{r}_t = \\sigma(\\mathbf{W}_r[\\mathbf{h}_{t-1};\\mathbf{x}_t]) \\quad \\text{[reset gate]}"
    },
    {
     "t": "math",
     "tex": "\\tilde{\\mathbf{h}}_t = \\tanh(\\mathbf{W}_h[\\mathbf{r}_t\\odot\\mathbf{h}_{t-1};\\mathbf{x}_t]) \\quad \\text{[candidate]}"
    },
    {
     "t": "math",
     "tex": "\\mathbf{h}_t = (1-\\mathbf{z}_t)\\odot\\mathbf{h}_{t-1} + \\mathbf{z}_t\\odot\\tilde{\\mathbf{h}}_t"
    },
    {
     "t": "p",
     "text": "**Interpretation:**"
    },
    {
     "t": "ul",
     "items": [
      "Update gate \\(\\mathbf{z}_t\\): controls interpolation between old and new hidden state (like LSTM's forget+input)",
      "Reset gate \\(\\mathbf{r}_t\\): controls how much past hidden state is used for candidate"
     ]
    },
    {
     "t": "table",
     "head": [
      "Aspect",
      "LSTM",
      "GRU"
     ],
     "rows": [
      [
       "Gates",
       "3 (\\(\\mathbf{f},\\mathbf{i},\\mathbf{o}\\))",
       "2 (\\(\\mathbf{z},\\mathbf{r}\\))"
      ],
      [
       "States",
       "2 (\\(\\mathbf{h},\\mathbf{c}\\))",
       "1 (\\(\\mathbf{h}\\))"
      ],
      [
       "Params",
       "\\(4(h(h+d)+h)\\)",
       "\\(3(h(h+d)+h)\\) — 25% fewer"
      ],
      [
       "Performance",
       "Marginal advantage",
       "Similar"
      ]
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "39",
   "q": "Derive Backpropagation Through Time (BPTT) with time complexity.",
   "body": [
    {
     "t": "p",
     "text": "Unrolled RNN for \\(T\\) steps has \\(T\\times\\) copies of the weight matrices but all share \\(\\mathbf{W}_{hh}\\)."
    },
    {
     "t": "p",
     "text": "**Gradient accumulation:**"
    },
    {
     "t": "math",
     "tex": "\\frac{\\partial\\mathcal{L}}{\\partial\\mathbf{W}_{hh}} = \\sum_{t=1}^T \\sum_{k=1}^t\\frac{\\partial\\mathcal{L}_t}{\\partial\\mathbf{h}_t}\\left(\\prod_{j=k}^{t-1}\\mathbf{W}_{hh}^T\\text{diag}(\\tanh'(\\mathbf{z}_j))\\right)\\mathbf{h}_{k-1}^T"
    },
    {
     "t": "p",
     "text": "**Time complexity:** \\(O(T^2)\\) for full BPTT. Truncated BPTT limits back-propagation to \\(\\tau\\) steps: \\(O(T\\tau)\\)."
    },
    {
     "t": "p",
     "text": "**Memory:** \\(O(T\\cdot h)\\) for storing all hidden states."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "40",
   "q": "Bidirectional RNN — information flow analysis.",
   "body": [
    {
     "t": "p",
     "text": "Forward RNN: \\(\\overrightarrow{\\mathbf{h}}_t = \\text{RNN}_\\text{fwd}(\\mathbf{x}_t, \\overrightarrow{\\mathbf{h}}_{t-1})\\) — sees tokens \\(1,\\ldots,t\\) Backward RNN: \\(\\overleftarrow{\\mathbf{h}}_t = \\text{RNN}_\\text{bwd}(\\mathbf{x}_t, \\overleftarrow{\\mathbf{h}}_{t+1})\\) — sees tokens \\(t,\\ldots,T\\) Combined: \\(\\mathbf{h}_t = [\\overrightarrow{\\mathbf{h}}_t; \\overleftarrow{\\mathbf{h}}_t] \\in \\mathbb{R}^{2h}\\)"
    },
    {
     "t": "p",
     "text": "\\(\\mathbf{h}_t\\) depends on ALL tokens — full-sequence context at every position."
    },
    {
     "t": "p",
     "text": "Limitation: Cannot be used autoregressively (requires full input) → only for encoders (BERT, BiLSTM for NER)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "41",
   "q": "Seq2Seq architecture — bottleneck problem and solution.",
   "body": [
    {
     "t": "p",
     "text": "**Encoder:** \\(\\mathbf{h}_T^{enc} =\\) final hidden state = \"context vector\""
    },
    {
     "t": "p",
     "text": "**Decoder:** \\(\\mathbf{h}_t^{dec} = \\text{RNN}(\\mathbf{h}_{t-1}^{dec}, [\\hat{\\mathbf{y}}_{t-1}; \\mathbf{c}])\\)"
    },
    {
     "t": "p",
     "text": "**Bottleneck:** All source information compressed into fixed-size \\(\\mathbf{c}\\in\\mathbb{R}^h\\) — fails for long sequences."
    },
    {
     "t": "p",
     "text": "**Information theory view:** If source sequence has entropy \\(H\\) bits, and \\(\\mathbf{c}\\) has capacity \\(\\sim h\\log 2\\) bits, long sequences with \\(H \\gg h\\log 2\\) are lossy."
    },
    {
     "t": "p",
     "text": "**Solution: Attention mechanisms** — decoder queries all encoder hidden states dynamically."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "42",
   "q": "Attention mechanism — full mathematical derivation.",
   "body": [
    {
     "t": "p",
     "text": "Given encoder states \\(\\mathbf{H} = [\\mathbf{h}_1^{enc},\\ldots,\\mathbf{h}_S^{enc}]\\) and current decoder state \\(\\mathbf{s}_{t-1}\\):"
    },
    {
     "t": "p",
     "text": "**Alignment scores (Bahdanau additive):**"
    },
    {
     "t": "math",
     "tex": "e_{t,s} = \\mathbf{v}_a^T\\tanh(\\mathbf{W}_a\\mathbf{s}_{t-1} + \\mathbf{U}_a\\mathbf{h}_s^{enc})"
    },
    {
     "t": "p",
     "text": "**Attention weights:**"
    },
    {
     "t": "math",
     "tex": "\\alpha_{t,s} = \\frac{\\exp(e_{t,s})}{\\sum_{s'=1}^S\\exp(e_{t,s'})} \\quad \\text{(softmax)}"
    },
    {
     "t": "p",
     "text": "**Context vector:**"
    },
    {
     "t": "math",
     "tex": "\\mathbf{c}_t = \\sum_{s=1}^S\\alpha_{t,s}\\mathbf{h}_s^{enc}"
    },
    {
     "t": "p",
     "text": "**Use in decoding:**"
    },
    {
     "t": "math",
     "tex": "\\mathbf{s}_t = \\text{RNN}(\\mathbf{s}_{t-1}, [\\hat{\\mathbf{y}}_{t-1}; \\mathbf{c}_t])"
    },
    {
     "t": "p",
     "text": "**Luong multiplicative attention:**"
    },
    {
     "t": "math",
     "tex": "e_{t,s} = \\mathbf{s}_t^T\\mathbf{W}_a\\mathbf{h}_s^{enc}"
    },
    {
     "t": "p",
     "text": "Dot product: \\(\\mathbf{s}_t^T\\mathbf{h}_s^{enc}\\) (no learnable params, simplest form)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "43",
   "q": "Teacher forcing — schedule and exposure bias.",
   "body": [
    {
     "t": "p",
     "text": "**Standard teacher forcing (train):** Feed ground-truth \\(y_{t-1}\\) as decoder input at step \\(t\\)."
    },
    {
     "t": "p",
     "text": "**Inference:** Feed model's own prediction \\(\\hat{y}_{t-1}\\)."
    },
    {
     "t": "p",
     "text": "**Exposure bias:** At inference, model encounters its own errors which were never seen in training. Errors compound over time."
    },
    {
     "t": "p",
     "text": "**Scheduled sampling:** Gradually replace ground-truth with model predictions during training:"
    },
    {
     "t": "math",
     "tex": "P(\\text{use} \\hat{y}) = \\frac{k}{k + e^{i/k}}"
    },
    {
     "t": "p",
     "text": "Schedules: linear, exponential, inverse sigmoid decrease from 0 to 1 as training progresses."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "44",
   "q": "Word2Vec — derive Skip-gram objective and negative sampling.",
   "body": [
    {
     "t": "p",
     "text": "**Skip-gram objective:** Given word \\(w_t\\), maximise probability of context words:"
    },
    {
     "t": "math",
     "tex": "\\mathcal{L} = \\sum_{t=1}^T\\sum_{-c\\leq j\\leq c, j\\neq 0} \\log P(w_{t+j}|w_t)"
    },
    {
     "t": "math",
     "tex": "P(w_O|w_I) = \\frac{\\exp(\\mathbf{v}_{w_O}^T\\mathbf{v}_{w_I})}{\\sum_{w=1}^W\\exp(\\mathbf{v}_w^T\\mathbf{v}_{w_I})}"
    },
    {
     "t": "p",
     "text": "Computing full softmax is \\(O(W)\\) (vocab size) — too expensive."
    },
    {
     "t": "p",
     "text": "**Negative sampling approximation:**"
    },
    {
     "t": "math",
     "tex": "\\log\\sigma(\\mathbf{v}_{w_O}^T\\mathbf{v}_{w_I}) + \\sum_{k=1}^K E_{w_k\\sim P_n}[\\log\\sigma(-\\mathbf{v}_{w_k}^T\\mathbf{v}_{w_I})]"
    },
    {
     "t": "p",
     "text": "Sample \\(K=5\\) negative words from unigram distribution \\(P_n(w)\\propto f(w)^{3/4}\\). Reduces complexity to \\(O(K)\\) instead of \\(O(W)\\)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "45",
   "q": "CBOW vs Skip-gram — trade-offs.",
   "body": [
    {
     "t": "p",
     "text": "**CBOW:** Predict target from context → \\(P(w_t | w_{t-c},\\ldots,w_{t+c})\\)"
    },
    {
     "t": "math",
     "tex": "\\mathbf{v}_{context} = \\frac{1}{2c}\\sum_{j\\neq 0}\\mathbf{v}_{w_{t+j}}, \\quad \\mathcal{L} = -\\log P(w_t|\\mathbf{v}_{context})"
    },
    {
     "t": "p",
     "text": "Averages context → blurs distinctions. Faster, better for frequent words."
    },
    {
     "t": "p",
     "text": "**Skip-gram:** Predict context from target → \\(P(w_{t+j}|w_t)\\) for each \\(j\\) Creates \\(2c\\) training pairs per token. Better for rare words, captures more nuanced semantics."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "46",
   "q": "GloVe — global co-occurrence matrix factorisation.",
   "body": [
    {
     "t": "p",
     "text": "**Co-occurrence matrix:** \\(X_{ij}\\) = number of times word \\(j\\) appears in context of word \\(i\\)."
    },
    {
     "t": "p",
     "text": "**GloVe Objective:**"
    },
    {
     "t": "math",
     "tex": "\\mathcal{L} = \\sum_{i,j=1}^W f(X_{ij})(\\mathbf{w}_i^T\\tilde{\\mathbf{w}}_j + b_i + \\tilde{b}_j - \\log X_{ij})^2"
    },
    {
     "t": "p",
     "text": "where \\(f(x) = (x/x_{max})^\\alpha \\mathbf{1}[x<x_{max}]\\) (clipped power function, \\(\\alpha=3/4\\))."
    },
    {
     "t": "p",
     "text": "**vs Word2Vec:** GloVe leverages global statistics (full co-occurrence); Word2Vec uses local context windows. In practice, comparable performance. GloVe often trains faster."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "47",
   "q": "RNN limitations and why Transformers replace them.",
   "body": [
    {
     "t": "table",
     "head": [
      "Limitation",
      "RNN/LSTM",
      "Transformer"
     ],
     "rows": [
      [
       "Sequential dependency",
       "Cannot parallelize training",
       "Full parallelism"
      ],
      [
       "Long-range dependencies",
       "LSTM helps but still limited by \\(h\\) capacity",
       "Attention spans full \\(T\\)"
      ],
      [
       "Training speed",
       "\\(O(T)\\) sequential steps",
       "\\(O(1)\\) depth (per layer)"
      ],
      [
       "Memory of past",
       "Fixed hidden state \\(\\mathbf{h}\\in\\mathbb{R}^h\\)",
       "KV cache, context window \\(T\\)"
      ]
     ]
    },
    {
     "t": "p",
     "text": "Training FLOPs: RNN \\(O(T\\cdot h^2)\\), Transformer \\(O(T^2\\cdot d)\\) per layer. For \\(T\\ll d\\): Transformer is more efficient."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "48",
   "q": "Language model — likelihood formulation and perplexity.",
   "body": [
    {
     "t": "p",
     "text": "**Autoregressive factorisation:**"
    },
    {
     "t": "math",
     "tex": "P(w_1,\\ldots,w_T) = \\prod_{t=1}^T P(w_t|w_1,\\ldots,w_{t-1})"
    },
    {
     "t": "p",
     "text": "**Training objective:** Minimise negative log-likelihood:"
    },
    {
     "t": "math",
     "tex": "\\mathcal{L} = -\\frac{1}{T}\\sum_{t=1}^T\\log P(w_t|w_{<t})"
    },
    {
     "t": "p",
     "text": "**Perplexity:**"
    },
    {
     "t": "math",
     "tex": "\\text{PPL} = e^{\\mathcal{L}} = \\exp\\left(-\\frac{1}{T}\\sum_t\\log P(w_t|w_{<t})\\right)"
    },
    {
     "t": "p",
     "text": "Interpretation: Perplexity = effective vocabulary size the model is \"choosing from\" at each step. Lower is better (perfect model: PPL = 1)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "49",
   "q": "Beam search — algorithm and complexity.",
   "body": [
    {
     "t": "p",
     "text": "At each decode step \\(t\\), maintain top-\\(k\\) partial sequences:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "beams = [(log_prob=0, tokens=[BOS])]\nfor t in range(max_len):\n    candidates = []\n    for (score, seq) in beams:\n        for each token v in vocab:\n            new_score = score + log P(v | seq)\n            candidates.append((new_score, seq + [v]))\n    beams = top-k(candidates)"
    },
    {
     "t": "p",
     "text": "**Complexity:** \\(O(T\\cdot k\\cdot V)\\) vs greedy \\(O(T\\cdot V)\\)."
    },
    {
     "t": "p",
     "text": "**Length penalty:**"
    },
    {
     "t": "math",
     "tex": "\\hat{y}^* = \\arg\\max_y \\frac{\\log P(y|x)}{|y|^\\alpha}"
    },
    {
     "t": "p",
     "text": "Without penalty, beam search prefers short sequences (log probs are negative)."
    },
    {
     "t": "p",
     "text": "**Diverse beam search, nucleus/top-p sampling:** Address the fluency-diversity tradeoff."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "50",
   "q": "Autoregressive vs masked language models — mathematical comparison.",
   "body": [
    {
     "t": "p",
     "text": "**Autoregressive (GPT):**"
    },
    {
     "t": "math",
     "tex": "P(x) = \\prod_{t=1}^T P(x_t|x_{<t})"
    },
    {
     "t": "p",
     "text": "Causal mask: attention matrix is lower-triangular. Natural for generation."
    },
    {
     "t": "p",
     "text": "**Masked Language Modeling (BERT):** 15% of tokens replaced with [MASK]. Model predicts:"
    },
    {
     "t": "math",
     "tex": "\\mathcal{L}_{MLM} = -\\sum_{i\\in\\mathcal{M}}\\log P(x_i|\\tilde{\\mathbf{x}})"
    },
    {
     "t": "p",
     "text": "Bidirectional — sees full context. Better representations for understanding tasks."
    },
    {
     "t": "p",
     "text": "**XLNet — Permutation LM:** Maximise likelihood over all permutations \\(z\\) of token order:"
    },
    {
     "t": "math",
     "tex": "\\mathcal{L}_{XLNet} = E_{z\\sim\\mathcal{Z}_T}\\left[-\\sum_{t=1}^T\\log P_\\theta(x_{z_t}|x_{z_{<t}})\\right]"
    },
    {
     "t": "p",
     "text": "Achieves bidirectionality without masking artefacts."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
