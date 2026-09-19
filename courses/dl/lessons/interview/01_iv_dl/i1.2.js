/* ============================================================================
   INTERVIEW I1.2 — CNNs
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/05_Deep_Learning/00_Interview_Bank/01_DL_Interview.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "i1.2",
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
   "text": "CNNs",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "21",
   "q": "Derive the CNN convolution operation mathematically.",
   "body": [
    {
     "t": "p",
     "text": "For input feature map \\(\\mathbf{X}\\in\\mathbb{R}^{H\\times W\\times C_{in}}\\), filter \\(\\mathbf{K}\\in\\mathbb{R}^{k_h\\times k_w\\times C_{in}\\times C_{out}}\\):"
    },
    {
     "t": "math",
     "tex": "\\mathbf{Y}[i,j,c_{out}] = \\sum_{m=0}^{k_h-1}\\sum_{n=0}^{k_w-1}\\sum_{c_{in}=0}^{C_{in}-1} \\mathbf{K}[m,n,c_{in},c_{out}]\\cdot\\mathbf{X}[i\\cdot s+m,\\ j\\cdot s+n,\\ c_{in}]"
    },
    {
     "t": "p",
     "text": "where \\(s\\) = stride."
    },
    {
     "t": "p",
     "text": "**Output dimensions:**"
    },
    {
     "t": "math",
     "tex": "H_{out} = \\left\\lfloor\\frac{H+2p-k_h}{s}\\right\\rfloor+1, \\quad W_{out} = \\left\\lfloor\\frac{W+2p-k_w}{s}\\right\\rfloor+1"
    },
    {
     "t": "p",
     "text": "**Parameter count for convolutional layer:**"
    },
    {
     "t": "math",
     "tex": "\\underbrace{k_h\\cdot k_w\\cdot C_{in}}_{{\\text{per filter}}}\\cdot C_{out} + C_{out} \\text{ (biases)}"
    },
    {
     "t": "p",
     "text": "vs. fully connected: \\((H\\cdot W\\cdot C_{in})\\cdot(H_{out}\\cdot W_{out}\\cdot C_{out})\\) — exponentially more."
    },
    {
     "t": "p",
     "text": "**FLOPs (multiply-accumulate operations):**"
    },
    {
     "t": "math",
     "tex": "2\\cdot k_h\\cdot k_w\\cdot C_{in}\\cdot H_{out}\\cdot W_{out}\\cdot C_{out}"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "22",
   "q": "What is parameter sharing? Compare to FC layers.",
   "body": [
    {
     "t": "p",
     "text": "In a FC layer: each output neuron has unique weights for every input neuron. In a Conv layer: the same filter \\(\\mathbf{K}[:,:,:,c]\\) is applied at every \\((i,j)\\) position."
    },
    {
     "t": "p",
     "text": "**Consequence:**"
    },
    {
     "t": "ul",
     "items": [
      "FC: \\(H_{out}W_{out}C_{out} \\times H_{in}W_{in}C_{in}\\) parameters",
      "Conv: \\(k_hk_wC_{in}C_{out}\\) parameters — independent of spatial dimensions"
     ]
    },
    {
     "t": "p",
     "text": "**Translation equivariance:** If input shifts by \\((t,s)\\), output also shifts by \\((t/s_{\\text{stride}}, s/s_{\\text{stride}})\\). Formally: \\(f(T_\\mathbf{t}\\mathbf{x}) = T_\\mathbf{t} f(\\mathbf{x})\\)."
    },
    {
     "t": "p",
     "text": "**Pooling creates translation invariance** (shift input → no change in output)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "23",
   "q": "Pooling layers — math and spatial effect.",
   "body": [
    {
     "t": "p",
     "text": "**Max pooling:**"
    },
    {
     "t": "math",
     "tex": "\\mathbf{Y}[i,j,c] = \\max_{0\\leq m<k, 0\\leq n<k} \\mathbf{X}[i\\cdot s+m,\\ j\\cdot s+n,\\ c]"
    },
    {
     "t": "p",
     "text": "No parameters. Spatial dimensions reduced by factor \\(s\\) (stride)."
    },
    {
     "t": "p",
     "text": "**Backward pass of max pool:** Gradient flows only to the max position (others get 0):"
    },
    {
     "t": "math",
     "tex": "\\frac{\\partial\\mathcal{L}}{\\partial\\mathbf{X}[i,j]} = \\frac{\\partial\\mathcal{L}}{\\partial\\mathbf{Y}[i',j']} \\cdot \\mathbf{1}[\\text{X}[i,j]=\\text{max}]"
    },
    {
     "t": "p",
     "text": "**Average pooling:**"
    },
    {
     "t": "math",
     "tex": "\\mathbf{Y}[i,j,c] = \\frac{1}{k^2}\\sum_{m,n}\\mathbf{X}[i\\cdot s+m, j\\cdot s+n, c]"
    },
    {
     "t": "p",
     "text": "Gradient distributes uniformly to all positions."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "24",
   "q": "Stride and padding — derive output dimensions.",
   "body": [
    {
     "t": "p",
     "text": "**Padding \\(p\\) (zeros appended around border):** Without padding: features near borders are used less → losing edge information. \"Same\" padding: \\(p = \\lfloor k/2 \\rfloor\\) (for odd kernel) → \\(H_{out}=H_{in}\\) when \\(s=1\\)."
    },
    {
     "t": "p",
     "text": "**Receptive field growth with depth:** After \\(L\\) convolutional layers with kernel size \\(k\\) and stride 1:"
    },
    {
     "t": "math",
     "tex": "\\text{Receptive field} = 1 + L\\cdot(k-1)"
    },
    {
     "t": "p",
     "text": "With dilation factor \\(d\\): \\(\\text{Receptive field} = 1 + L\\cdot(k-1)\\cdot d\\)"
    },
    {
     "t": "p",
     "text": "Two \\(3\\times 3\\) convolutions have the same receptive field as one \\(5\\times 5\\) with fewer parameters (\\(2\\times9\\) vs \\(25\\) per channel)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "25",
   "q": "Key CNN architectures — innovations and mathematical intuitions.",
   "body": [
    {
     "t": "table",
     "head": [
      "Model",
      "Year",
      "Params",
      "Key Innovation"
     ],
     "rows": [
      [
       "AlexNet",
       "2012",
       "60M",
       "Deep CNN, ReLU, dropout"
      ],
      [
       "VGGNet",
       "2014",
       "138M",
       "Small \\(3\\times3\\) filters stacked"
      ],
      [
       "InceptionV3",
       "2015",
       "24M",
       "Parallel multi-scale convolutions"
      ],
      [
       "ResNet-50",
       "2015",
       "25M",
       "Skip connections: \\(\\mathbf{y}=F(\\mathbf{x})+\\mathbf{x}\\)"
      ],
      [
       "DenseNet",
       "2017",
       "8M",
       "\\(h_l = H_l([h_0, h_1,\\ldots, h_{l-1}])\\)"
      ],
      [
       "EfficientNet-B0",
       "2019",
       "5.3M",
       "Compound scaling"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**VGG rationale:** Stack of \\(n\\) \\((3\\times3)\\) convolutions = receptive field of \\((2n+1)\\times(2n+1)\\) with \\(n\\times 2\\times 9C^2\\) params vs single \\((2n+1)^2 C^2\\) — strictly fewer params."
    },
    {
     "t": "p",
     "text": "**EfficientNet compound scaling:** Scale depth \\(d\\), width \\(w\\), resolution \\(r\\) simultaneously:"
    },
    {
     "t": "math",
     "tex": "d=\\alpha^\\phi, \\quad w=\\beta^\\phi, \\quad r=\\gamma^\\phi, \\quad \\text{s.t. }\\alpha\\beta^2\\gamma^2\\approx2"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "26",
   "q": "Residual connections in ResNet — gradient flow analysis.",
   "body": [
    {
     "t": "p",
     "text": "**Residual block:**"
    },
    {
     "t": "math",
     "tex": "\\mathbf{y} = F(\\mathbf{x}, \\{W_i\\}) + \\mathbf{x}"
    },
    {
     "t": "p",
     "text": "For a network of \\(L\\) residual blocks:"
    },
    {
     "t": "math",
     "tex": "\\mathbf{x}_L = \\mathbf{x}_l + \\sum_{i=l}^{L-1} F(\\mathbf{x}_i, \\{W_i\\})"
    },
    {
     "t": "p",
     "text": "**Gradient through residual path:**"
    },
    {
     "t": "math",
     "tex": "\\frac{\\partial \\mathcal{L}}{\\partial \\mathbf{x}_l} = \\frac{\\partial \\mathcal{L}}{\\partial \\mathbf{x}_L}\\cdot\\frac{\\partial \\mathbf{x}_L}{\\partial \\mathbf{x}_l} = \\frac{\\partial\\mathcal{L}}{\\partial\\mathbf{x}_L}\\left(1 + \\frac{\\partial}{\\partial\\mathbf{x}_l}\\sum_{i=l}^{L-1}F_i\\right)"
    },
    {
     "t": "p",
     "text": "The \"+1\" term ensures gradient flows directly from \\(\\mathbf{x}_L\\) to \\(\\mathbf{x}_l\\) without going through any weights — effectively unlimited depth without vanishing."
    },
    {
     "t": "p",
     "text": "**He et al. interpretation:** ResNet learns residuals \\(F(\\mathbf{x}) = H(\\mathbf{x}) - \\mathbf{x}\\). If optimal function is close to identity (\\(H^*\\approx\\mathbf{x}\\)), it's easier to drive \\(F\\to0\\) than to learn identity from scratch."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "27",
   "q": "Transfer learning in CNNs — feature reuse analysis.",
   "body": [
    {
     "t": "p",
     "text": "CNN layers capture features at different abstraction levels. For a source domain \\(\\mathcal{D}_S\\) (ImageNet) and target \\(\\mathcal{D}_T\\):"
    },
    {
     "t": "p",
     "text": "**Shallow layers** (general): Gabor filters, colour blobs — universally transferable. **Deep layers** (specific): Task-specific patterns — retrain for new task."
    },
    {
     "t": "p",
     "text": "**Strategies:**"
    },
    {
     "t": "table",
     "head": [
      "Strategy",
      "Layers frozen",
      "Labeled data",
      "Use case"
     ],
     "rows": [
      [
       "Feature extraction",
       "All except head",
       "Very few",
       "Similar domain"
      ],
      [
       "Fine-tuning top",
       "Last few + head",
       "Moderate",
       "Moderate similarity"
      ],
      [
       "Full fine-tuning",
       "None",
       "Many",
       "Different domain"
      ],
      [
       "Progressive unfreeze",
       "Gradual unlock",
       "Moderate",
       "Best practice"
      ]
     ]
    },
    {
     "t": "p",
     "text": "**Linear probing** (freeze backbone, train head only): If linear probe achieves high accuracy, features are linearly separable → transfer successful."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "28",
   "q": "Depthwise separable convolution — mathematical parameter reduction.",
   "body": [
    {
     "t": "p",
     "text": "**Standard convolution:** \\(k\\times k\\times C_{in}\\times C_{out}\\) parameters, FLOPs: \\(k^2 C_{in}C_{out}H_{out}W_{out}\\)"
    },
    {
     "t": "p",
     "text": "**Depthwise separable:**"
    },
    {
     "t": "ol",
     "items": [
      "**Depthwise conv:** \\(k\\times k\\times C_{in}\\times 1\\) — each channel independently: \\(k^2 C_{in}\\) params",
      "**Pointwise conv:** \\(1\\times 1\\times C_{in}\\times C_{out}\\): \\(C_{in}C_{out}\\) params"
     ]
    },
    {
     "t": "p",
     "text": "**Reduction ratio:**"
    },
    {
     "t": "math",
     "tex": "\\frac{k^2C_{in} + C_{in}C_{out}}{k^2C_{in}C_{out}} = \\frac{1}{C_{out}} + \\frac{1}{k^2} \\approx \\frac{1}{k^2}"
    },
    {
     "t": "p",
     "text": "For \\(k=3\\): \\(\\approx 8\\times\\) fewer parameters with minimal accuracy drop."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "29",
   "q": "Feature map visualization — methods and interpretability.",
   "body": [
    {
     "t": "p",
     "text": "**Activation maximization:** Find input \\(\\mathbf{x}^*\\) that maximises neuron \\(n_{l,k}\\):"
    },
    {
     "t": "math",
     "tex": "\\mathbf{x}^* = \\arg\\max_\\mathbf{x} h_{l,k}(\\mathbf{x}) - \\lambda||\\mathbf{x}||^2"
    },
    {
     "t": "p",
     "text": "Solved via gradient ascent in input space."
    },
    {
     "t": "p",
     "text": "**Grad-CAM:** Gradient-weighted class activation mapping:"
    },
    {
     "t": "math",
     "tex": "\\alpha_k^c = \\frac{1}{Z}\\sum_{i}\\sum_{j}\\frac{\\partial y^c}{\\partial A_{ij}^k}"
    },
    {
     "t": "math",
     "tex": "L^c_{Grad-CAM} = \\text{ReLU}\\left(\\sum_k\\alpha_k^c A^k\\right)"
    },
    {
     "t": "p",
     "text": "Highlights which regions of the input affect the class score — model-agnostic explanation."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "30",
   "q": "Receptive field calculation in deep CNNs.",
   "body": [
    {
     "t": "p",
     "text": "For stacked convolutional layers with kernel \\(k_l\\) and stride \\(s_l\\) at layer \\(l\\):"
    },
    {
     "t": "math",
     "tex": "RF_l = RF_{l-1} + (k_l-1)\\prod_{i=1}^{l-1}s_i"
    },
    {
     "t": "p",
     "text": "For uniform \\(k=3\\), \\(s=1\\): \\(RF_L = 1 + 2L\\) (linear growth). For \\(s=2\\) every other layer: \\(RF\\) grows exponentially."
    },
    {
     "t": "p",
     "text": "**Dilated convolution:** Kernel with holes — \\(k=3\\), dilation \\(d\\):"
    },
    {
     "t": "math",
     "tex": "\\text{effective }k = k + (k-1)(d-1) = 2d+1"
    },
    {
     "t": "p",
     "text": "WaveNet uses exponentially-increasing dilation: \\(d=1,2,4,8,\\ldots,512\\) → RF = \\(O(1024)\\) with only \\(O(\\log\\text{RF})\\) layers."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "31",
   "q": "Object detection — region-based vs single-shot approaches.",
   "body": [
    {
     "t": "p",
     "text": "**Faster R-CNN:** Two-stage"
    },
    {
     "t": "ol",
     "items": [
      "**Region Proposal Network (RPN):** Slide \\(3\\times3\\) window over feature map, predict objectness score and box offsets for \\(k\\) anchor boxes per position.",
      "**RoI Pooling:** Extract fixed-size features from each proposal → classify + refine."
     ]
    },
    {
     "t": "p",
     "text": "Accuracy: high. Speed: 5 FPS."
    },
    {
     "t": "p",
     "text": "**YOLO:** Single-stage, divide image into \\(S\\times S\\) grid, each cell predicts \\(B\\) boxes and \\(C\\) class probs simultaneously."
    },
    {
     "t": "math",
     "tex": "\\mathcal{L} = \\lambda_{coord}\\mathcal{L}_{loc} + \\mathcal{L}_{conf} + \\mathcal{L}_{cls}"
    },
    {
     "t": "p",
     "text": "Speed: 30+ FPS. Trade-off: lower recall for small objects."
    },
    {
     "t": "p",
     "text": "**IoU (Intersection over Union):**"
    },
    {
     "t": "math",
     "tex": "\\text{IoU} = \\frac{\\text{Area}(A\\cap B)}{\\text{Area}(A\\cup B)}"
    },
    {
     "t": "p",
     "text": "Threshold 0.5 for \"correct\" detection. mAP averages precision@recall over IoU thresholds."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "32",
   "q": "Semantic vs instance segmentation — architectures and losses.",
   "body": [
    {
     "t": "p",
     "text": "**U-Net (semantic segmentation):**"
    },
    {
     "t": "ul",
     "items": [
      "Encoder (contracting path): ResNet backbone → \\(H/32\\times W/32\\) feature map",
      "Decoder (expanding path): transposed convolutions + skip connections from encoder",
      "Skip connections: \\(\\text{concat}([e_l, d_l])\\) preserves spatial detail"
     ]
    },
    {
     "t": "p",
     "text": "**Mask R-CNN (instance segmentation):** Faster R-CNN + parallel mask head:"
    },
    {
     "t": "ul",
     "items": [
      "For each RoI: predict \\(K\\) binary masks (\\(K\\) classes), \\(28\\times28\\) resolution",
      "Loss: \\(\\mathcal{L} = \\mathcal{L}_{cls} + \\mathcal{L}_{bbox} + \\mathcal{L}_{mask}\\)",
      "Mask loss = binary cross-entropy on the predicted mask for the ground-truth class only"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "33",
   "q": "1×1 convolution — Bottleneck design in Inception/ResNet.",
   "body": [
    {
     "t": "p",
     "text": "A \\(1\\times1\\) conv applies a \\(C_{in}\\times C_{out}\\) linear transformation at each spatial location:"
    },
    {
     "t": "ul",
     "items": [
      "No spatial mixing, only channel mixing",
      "If \\(C_{out} < C_{in}\\): **channel-wise compression** (bottleneck)",
      "If \\(C_{out} > C_{in}\\): **channel expansion**"
     ]
    },
    {
     "t": "p",
     "text": "**ResNet bottleneck block:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1x1 conv: 256 → 64   (compress)\n3x3 conv: 64 → 64    (expensive spatial op on small channel)\n1x1 conv: 64 → 256   (expand)"
    },
    {
     "t": "p",
     "text": "vs. naive \\(3\\times 3\\times 256\\times 256\\): \\(4\\times\\) fewer FLOPs."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "34",
   "q": "Global Average Pooling — mathematical effect.",
   "body": [
    {
     "t": "p",
     "text": "Replace the flattened feature map + dense head with:"
    },
    {
     "t": "math",
     "tex": "\\text{GAP}: \\mathbf{f}[c] = \\frac{1}{H_{out}W_{out}}\\sum_{i,j} \\mathbf{A}[i,j,c]"
    },
    {
     "t": "math",
     "tex": "\\hat{y}_k = \\text{softmax}(\\mathbf{w}_k^T\\mathbf{f})"
    },
    {
     "t": "p",
     "text": "Parameters reduced from \\(H_{out}W_{out}C \\times K\\) (FC) to \\(C\\times K\\)."
    },
    {
     "t": "p",
     "text": "**Class Activation Maps (CAM):**"
    },
    {
     "t": "math",
     "tex": "M_k(i,j) = \\sum_c w_k^c \\cdot A^c(i,j)"
    },
    {
     "t": "p",
     "text": "Localises discriminative image regions without spatial supervision — the network learns where the class resides just from image-level labels."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "35",
   "q": "Fully Convolutional Networks (FCN) vs standard CNNs.",
   "body": [
    {
     "t": "p",
     "text": "Standard CNN → FC layers → fixed-size output (classification only). FCN → All FC replaced with \\(1\\times1\\) convolutions → output is a spatial map."
    },
    {
     "t": "p",
     "text": "**Why FCN enables segmentation:** For any input size \\(H\\times W\\), FCN outputs \\(H'\\times W'\\times K\\) probability map. \\(H' = H/\\text{stride}\\), \\(W' = W/\\text{stride}\\)."
    },
    {
     "t": "p",
     "text": "Upsample to original resolution via bilinear interpolation or transposed convolution:"
    },
    {
     "t": "math",
     "tex": "\\mathbf{O}[i,j] = \\sum_{i',j'} k(i-si', j-sj')\\mathbf{X}[i',j']"
    },
    {
     "t": "p",
     "text": "Skip connections (FCN-8s, -16s) add coarse semantic features to fine-grained spatial features."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
