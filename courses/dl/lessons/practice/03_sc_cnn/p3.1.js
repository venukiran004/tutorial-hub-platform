/* ============================================================================
   PRACTICE P3.1 — CNNs and Computer Vision · 1
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/05_Deep_Learning/Practice/02_CNNs_and_Computer_Vision.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p3.1",
 "lede": "**25 scenarios** from CNNs and Computer Vision. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
 "objectives": [
  "Answer each scenario out loud before revealing the answer",
  "Give the mechanism, not the slogan — the formula, the failure mode, the fix",
  "Recognise the pattern behind the question so the next variant is easy",
  "Mark the ones you got wrong and return to the lesson that covers them"
 ],
 "prerequisites": [],
 "blocks": [
  {
   "t": "drill",
   "n": "1",
   "q": "What is a convolution operation in the context of CNNs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** A sliding window (kernel/filter) applied across the input, computing element-wise multiplication and sum at each position:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "output[i,j] = Σ Σ input[i+m, j+n] × kernel[m, n]"
    },
    {
     "t": "p",
     "text": "**Explanation:** Convolution detects local patterns (edges, textures) regardless of position (translation equivariance). Each filter learns to detect a specific feature. Multiple filters per layer detect multiple features."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "2",
   "q": "What is the difference between a filter/kernel and a feature map?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Filter/Kernel:** Learnable weight matrix (e.g., 3×3, 5×5) applied across input",
      "**Feature map:** Output produced by applying one filter across the entire input"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** If layer has 64 filters applied to input, it produces 64 feature maps. Early layers detect edges/textures; deeper layers detect complex patterns (faces, objects)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "3",
   "q": "How do you calculate the output size of a convolution layer?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "output_size = (input_size - kernel_size + 2 × padding) / stride + 1"
    },
    {
     "t": "p",
     "text": "**Example:** Input 32×32, kernel 5×5, stride 1, padding 0:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "(32 - 5 + 0) / 1 + 1 = 28×28"
    },
    {
     "t": "p",
     "text": "**Explanation:** Padding='same' keeps output size equal to input. Stride>1 reduces spatial dimensions. Important for designing architectures."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "4",
   "q": "What is padding in CNNs and why is it used?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Valid padding (no padding):** Output smaller than input. Border pixels used less.",
      "**Same padding:** Add zeros around border so output has same spatial dimensions."
     ]
    },
    {
     "t": "p",
     "text": "**Why:** Preserves spatial information at borders. Enables deeper networks without shrinking feature maps too quickly. Allows control over output dimensions."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "5",
   "q": "What is stride in CNNs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** The step size when sliding the filter across the input."
    },
    {
     "t": "ul",
     "items": [
      "**Stride 1:** Filter moves one pixel at a time (preserves spatial resolution)",
      "**Stride 2:** Filter moves two pixels (halves spatial dimensions)"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Stride>1 reduces computation and acts as downsampling — alternative to pooling. Used in modern architectures instead of pooling (all-convolutional networks)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "6",
   "q": "What is pooling and what types exist?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Max pooling:** Takes maximum value in each window. Captures strongest activation.",
      "**Average pooling:** Takes mean value. Smoother representations.",
      "**Global Average Pooling (GAP):** Average over entire feature map → single value per channel."
     ]
    },
    {
     "t": "p",
     "text": "**Purpose:** Downsamples spatial dimensions, reduces computation, provides translation invariance."
    },
    {
     "t": "p",
     "text": "**Explanation:** GAP replaces fully connected layers at the end of CNNs (fewer parameters, less overfitting). Max pooling retains strongest features."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "7",
   "q": "What is the receptive field of a neuron?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** The region of the input that influences a particular neuron's output. Grows with depth:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Layer 1 (3×3 conv): receptive field = 3×3\nLayer 2 (3×3 conv): receptive field = 5×5\nLayer 3 (3×3 conv): receptive field = 7×7"
    },
    {
     "t": "p",
     "text": "**Explanation:** Deeper layers \"see\" larger input regions. Stacking small (3×3) filters creates large receptive fields more efficiently than large filters. VGGNet demonstrated that two 3×3 = one 5×5 with fewer parameters."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "8",
   "q": "What is a 1×1 convolution and when is it used?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Applies a 1×1 filter — no spatial mixing, only channel-wise combination."
    },
    {
     "t": "p",
     "text": "**Uses:**"
    },
    {
     "t": "ol",
     "items": [
      "**Channel reduction:** 256 channels → 64 channels (dimensionality reduction)",
      "**Adding non-linearity:** Linear combination + activation = non-linear transform",
      "**Bottleneck design:** Used in Inception, ResNet bottleneck blocks"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** Like a fully connected layer applied at each spatial position. Reduces computation before expensive 3×3 or 5×5 convolutions."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "9",
   "q": "What is depthwise separable convolution?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Splits standard convolution into two steps:"
    },
    {
     "t": "ol",
     "items": [
      "**Depthwise:** One filter per input channel (spatial filtering)",
      "**Pointwise:** 1×1 convolution across channels (channel mixing)"
     ]
    },
    {
     "t": "p",
     "text": "**Computation:** Standard: K²×C_in×C_out × H×W. Depthwise separable: K²×C_in × H×W + C_in×C_out × H×W"
    },
    {
     "t": "p",
     "text": "**Savings:** ~8-9× fewer operations for 3×3 filters."
    },
    {
     "t": "p",
     "text": "**Explanation:** Used in MobileNet, EfficientNet for mobile/edge deployment. Slight accuracy drop for massive computation savings."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "10",
   "q": "Explain the VGGNet architecture and its contribution.",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Stack of 3×3 convolutions with max pooling, followed by FC layers."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Conv(3,64)×2 → Pool → Conv(3,128)×2 → Pool → Conv(3,256)×3 → Pool → \nConv(3,512)×3 → Pool → Conv(3,512)×3 → Pool → FC → FC → Softmax"
    },
    {
     "t": "p",
     "text": "**Contribution:** Showed that deeper networks with small (3×3) filters outperform shallower ones with large filters. Two 3×3 = one 5×5 receptive field with fewer parameters."
    },
    {
     "t": "p",
     "text": "**Limitation:** 138M parameters, most in FC layers. Memory-intensive."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "11",
   "q": "What is the Inception module?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Applies multiple filter sizes (1×1, 3×3, 5×5) and pooling in parallel, concatenates results:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "branch_1x1 = conv1x1(input)\nbranch_3x3 = conv3x3(conv1x1(input))  # 1×1 reduces channels first\nbranch_5x5 = conv5x5(conv1x1(input))\nbranch_pool = conv1x1(maxpool(input))\noutput = concat([branch_1x1, branch_3x3, branch_5x5, branch_pool])"
    },
    {
     "t": "p",
     "text": "**Explanation:** Lets the network choose which filter size is best for each part. 1×1 convolutions before 3×3 and 5×5 reduce computation. GoogLeNet (Inception v1) won ILSVRC 2014."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "12",
   "q": "What is ResNet and why was it revolutionary?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Introduced skip/residual connections: `y = F(x) + x`"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class ResBlock(nn.Module):\n    def forward(self, x):\n        residual = x\n        out = self.conv1(x)\n        out = self.bn1(out)\n        out = self.relu(out)\n        out = self.conv2(out)\n        out = self.bn2(out)\n        out += residual  # Skip connection\n        out = self.relu(out)\n        return out"
    },
    {
     "t": "p",
     "text": "**Revolution:** Enabled training 152+ layer networks (previously ~20 layers was the limit). Won ILSVRC 2015 with super-human accuracy."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "13",
   "q": "What is the bottleneck design in ResNet?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Uses 1×1 → 3×3 → 1×1 convolution pattern:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "1×1 conv (reduce channels: 256 → 64)\n3×3 conv (expensive operation on 64 channels)\n1×1 conv (restore channels: 64 → 256)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Reduces computation: 3×3 conv on 256 channels is expensive; 3×3 on 64 channels is much cheaper. Same overall transformation with fewer FLOPs. Used in ResNet-50, ResNet-101, ResNet-152."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "14",
   "q": "What is DenseNet and how does it differ from ResNet?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Each layer takes feature maps from ALL preceding layers as input (concatenation, not addition):"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "x₁ = H₁(x₀)\nx₂ = H₂([x₀, x₁])\nx₃ = H₃([x₀, x₁, x₂])"
    },
    {
     "t": "p",
     "text": "**Benefits:** Feature reuse, stronger gradient flow, fewer parameters."
    },
    {
     "t": "p",
     "text": "**vs ResNet:** ResNet adds features (x + F(x)). DenseNet concatenates ([x, F(x)])."
    },
    {
     "t": "p",
     "text": "**Explanation:** More memory-intensive during training due to concatenation. Often better accuracy with fewer parameters."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "15",
   "q": "What is EfficientNet?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Systematically scales network width, depth, and resolution using a compound scaling method:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "depth: d = α^φ\nwidth: w = β^φ\nresolution: r = γ^φ\nsubject to: α × β² × γ² ≈ 2"
    },
    {
     "t": "p",
     "text": "**Explanation:** Previous approaches scaled only one dimension (deeper OR wider). EfficientNet showed balanced scaling significantly improves accuracy/efficiency trade-off. EfficientNet-B7 achieved SOTA with 8.4× fewer parameters than GPipe."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "16",
   "q": "What is the difference between strided convolution and pooling for downsampling?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "ul",
     "items": [
      "**Max pooling:** Retains strongest activation, slight translation invariance",
      "**Strided convolution:** Learned downsampling, more parameters"
     ]
    },
    {
     "t": "p",
     "text": "**Modern trend:** Strided convolutions preferred (learned, end-to-end trainable). All-convolutional networks replace all pooling with strided convs."
    },
    {
     "t": "p",
     "text": "**Explanation:** Pooling loses spatial information (which position had max). Strided conv can learn what to keep. But GAP at the end is still common."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "17",
   "q": "How do CNNs achieve translation equivariance?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Due to weight sharing — same filter applied at every spatial position. If the input shifts, the output shifts by the same amount."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Image of cat at top-left → feature \"cat\" active at top-left\nImage of cat at bottom-right → feature \"cat\" active at bottom-right"
    },
    {
     "t": "p",
     "text": "**Explanation:** This is equivariance, not invariance. Equivariance: output shifts with input. Invariance (classification): output stays same regardless of position. Pooling adds some translation invariance."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "18",
   "q": "What is deconvolution (transposed convolution)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Upsampling operation — increases spatial dimensions:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "output_size = (input_size - 1) × stride - 2×padding + kernel_size"
    },
    {
     "t": "p",
     "text": "**Used in:** Decoder networks, GANs, semantic segmentation (U-Net, FCN)."
    },
    {
     "t": "p",
     "text": "**Issue:** Checkerboard artifacts from uneven overlap of transposed convolution."
    },
    {
     "t": "p",
     "text": "**Alternative:** Nearest-neighbor upsampling + regular convolution (avoids artifacts)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "19",
   "q": "What is dilated (atrous) convolution?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Convolution with gaps between filter elements, expanding receptive field without increasing parameters:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Dilation 1: [x x x]     — standard 3×3, RF = 3\nDilation 2: [x . x . x] — effective 5×5, RF = 5\nDilation 4: [x . . . x . . . x] — effective 9×9, RF = 9"
    },
    {
     "t": "p",
     "text": "**Explanation:** Used in semantic segmentation (DeepLab) to maintain resolution while capturing large context. Stack dilations: 1, 2, 4 for multi-scale features."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "20",
   "q": "What is Group Convolution?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Split input channels into groups, apply separate convolutions to each group:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Standard: C_in × C_out × K² parameters\nGroup (g groups): g × (C_in/g) × (C_out/g) × K² = C_in × C_out × K² / g parameters"
    },
    {
     "t": "p",
     "text": "**Explanation:** Reduces parameters and computation by factor of g. Channel shuffle (ShuffleNet) adds cross-group communication. Depthwise convolution is the extreme case (groups = channels)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "21",
   "q": "What is a Fully Convolutional Network (FCN)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Replace all fully connected layers with convolutional layers → accepts any input size."
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Standard CNN:  Conv → Conv → Pool → Flatten → FC → FC → Output (fixed size)\nFCN:           Conv → Conv → Pool → Conv → Conv → Output (spatial map)"
    },
    {
     "t": "p",
     "text": "**Explanation:** FC layers require fixed input size. FCN can process images of any size, producing spatial output maps. Foundation for dense prediction tasks (segmentation, detection)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "22",
   "q": "What is a U-Net architecture?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Encoder-decoder with skip connections between corresponding encoder and decoder layers:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Encoder: Conv → Pool → Conv → Pool → Conv → Pool → Conv (bottleneck)\nDecoder: UpConv → Concat(skip) → Conv → UpConv → Concat(skip) → Conv → Output"
    },
    {
     "t": "p",
     "text": "**Why skip connections:** Decoder needs fine-grained spatial information lost during downsampling. Skip connections provide it."
    },
    {
     "t": "p",
     "text": "**Explanation:** Dominant architecture for medical image segmentation. Works well with limited training data. Skip connections combine low-level (edges) with high-level (semantic) features."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "23",
   "q": "What is the Feature Pyramid Network (FPN)?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Multi-scale feature extraction by top-down pathway with lateral connections:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "Bottom-up: C1 → C2 → C3 → C4 → C5 (standard CNN)\nTop-down:  P5 → P4 → P3 → P2 (upsampled + lateral from Ci)"
    },
    {
     "t": "p",
     "text": "**Explanation:** Detects objects at multiple scales. Small objects detected in high-resolution feature maps (P2); large objects in low-resolution maps (P5). Standard component in modern detection frameworks (Faster R-CNN, RetinaNet)."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "24",
   "q": "How does data augmentation differ for CNNs vs other models?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** CNN-specific augmentations:"
    },
    {
     "t": "ol",
     "items": [
      "**Geometric:** Rotation, flip, scale, crop, affine transforms",
      "**Color:** Brightness, contrast, saturation, hue jitter",
      "**Cutout:** Random erasing of rectangular patches",
      "**Mixup:** Blend two images and their labels: `x = λx₁ + (1-λ)x₂`",
      "**CutMix:** Replace patch from one image with another",
      "**RandAugment:** Random selection from augmentation pool"
     ]
    },
    {
     "t": "p",
     "text": "**Explanation:** CNNs benefit greatly from augmentation due to spatial structure. Mixup/CutMix improve calibration and robustness."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "25",
   "q": "What is the role of batch normalization in CNNs?",
   "body": [
    {
     "t": "p",
     "text": "**Answer:** Applied after convolution, normalizes across batch and spatial dimensions for each channel:"
    },
    {
     "t": "code",
     "lang": "text",
     "code": "For each channel c:\n    μ = mean over batch and spatial dims\n    σ² = variance over batch and spatial dims\n    x̂ = (x - μ) / √(σ² + ε)\n    y = γ_c × x̂ + β_c"
    },
    {
     "t": "p",
     "text": "**Explanation:** Stabilizes activations across layers, allows higher learning rates. Placed before or after activation (debate exists, but before ReLU is common). Essential for training deep CNNs."
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
