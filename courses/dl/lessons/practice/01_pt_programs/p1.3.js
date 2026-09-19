/* ============================================================================
   PRACTICE P1.3 — PyTorch Programs · 3
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/05_Deep_Learning/Practice/00_PyTorch_Programs.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p1.3",
 "lede": "**17 programs** from PyTorch Programs. Read the title, write the program yourself, then open the reference version and what it printed when it was run.",
 "objectives": [
  "Write each program from its title before opening the reference version",
  "Predict the printed shapes and numbers before revealing the output",
  "Say which layer, loss or trick each program demonstrates and when you would reach for it",
  "Change one thing in each program — a shape, a hyperparameter — and predict what the output becomes"
 ],
 "prerequisites": [],
 "blocks": [
  {
   "t": "drill",
   "n": "51",
   "q": "Quick Reference Programs",
   "body": [
    {
     "t": "p",
     "text": "Small PyTorch utilities you reach for on every project: devices, seeding, profiling and sizing."
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Device: cpu, Tensor device: cpu"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "52",
   "q": "Torch Device Management",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\ndevice = torch.device('cuda' if torch.cuda.is_available() else 'cpu')\nx = torch.randn(3, 3).to(device)\nprint(f\"Device: {device}, Tensor device: {x.device}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Device: cpu, Tensor device: cpu"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "53",
   "q": "Reproducibility Setup",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch, numpy as np, random\ndef set_seed(seed=42):\n    torch.manual_seed(seed)\n    np.random.seed(seed)\n    random.seed(seed)\n    if torch.cuda.is_available():\n        torch.cuda.manual_seed_all(seed)\n        torch.backends.cudnn.deterministic = True\nset_seed(42)\nprint(f\"Seed set. Random: {torch.randn(3)}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Seed set. Random: tensor([0.3367, 0.1288, 0.2345])"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "54",
   "q": "Softmax Temperature",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.nn.functional as F\nlogits = torch.tensor([2.0, 1.0, 0.5, 0.1])\nfor temp in [0.1, 0.5, 1.0, 2.0, 10.0]:\n    probs = F.softmax(logits / temp, dim=0)\n    print(f\"T={temp:4.1f}: {probs.numpy().round(3)}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "T= 0.1: [1. 0. 0. 0.]\nT= 0.5: [0.828 0.112 0.041 0.019]\nT= 1.0: [0.575 0.211 0.128 0.086]\nT= 2.0: [0.406 0.246 0.192 0.157]\nT=10.0: [0.278 0.252 0.24  0.23 ]"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "55",
   "q": "Model FLOPs Estimation",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\ndef estimate_flops(model, input_shape):\n    total_flops = 0\n    for name, module in model.named_modules():\n        if isinstance(module, torch.nn.Linear):\n            total_flops += module.in_features * module.out_features * 2\n        elif isinstance(module, torch.nn.Conv2d):\n            total_flops += (module.in_channels * module.kernel_size[0] * module.kernel_size[1] *\n                          module.out_channels * input_shape[-1] * input_shape[-2] * 2)\n    return total_flops\nmodel = torch.nn.Sequential(torch.nn.Linear(784, 256), torch.nn.Linear(256, 10))\nprint(f\"Estimated FLOPs: {estimate_flops(model, (1, 784)):,}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Estimated FLOPs: 406,528"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "56",
   "q": "Torch Profiler",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nmodel = torch.nn.Linear(1000, 1000)\nx = torch.randn(64, 1000)\nwith torch.autograd.profiler.profile() as prof:\n    for _ in range(10):\n        _ = model(x)\nprint(prof.key_averages().table(sort_by=\"cpu_time_total\", row_limit=5))"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "----------------------  ------------  ------------  ------------  ------------  ------------  ------------  \n                  Name    Self CPU %      Self CPU   CPU total %     CPU total  CPU time avg    # of Calls  \n----------------------  ------------  ------------  ------------  ------------  ------------  ------------  \n          aten::linear         3.40%     324.497us       100.00%       9.531ms     953.103us            10  \n           aten::addmm        78.55%       7.487ms        84.23%       8.028ms     802.794us            10  \n               aten::t         4.46%     424.895us        12.37%       1.179ms     117.859us            10  \n       aten::transpose         7.59%     723.395us         7.91%     753.695us      75.370us            10  \n           aten::copy_         5.21%     496.796us         5.21%     496.796us      49.680us            10  \n----------------------  ------------  ------------  ------------  ------------  ------------  ------------  \nSelf CPU time total: 9.531ms"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "57",
   "q": "Custom Loss Function",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.nn as nn\nclass DiceLoss(nn.Module):\n    def forward(self, pred, target, smooth=1.0):\n        pred = torch.sigmoid(pred)\n        intersection = (pred * target).sum()\n        return 1 - (2 * intersection + smooth) / (pred.sum() + target.sum() + smooth)\npred = torch.randn(8, 1, 32, 32)\ntarget = torch.randint(0, 2, (8, 1, 32, 32)).float()\nprint(f\"Dice Loss: {DiceLoss()(pred, target).item():.4f}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Dice Loss: 0.4989"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "58",
   "q": "Hook for Feature Extraction",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.nn as nn\nfeatures = {}\ndef hook_fn(name):\n    def hook(module, input, output):\n        features[name] = output.detach()\n    return hook\nmodel = nn.Sequential(nn.Linear(10, 64), nn.ReLU(), nn.Linear(64, 32), nn.ReLU(), nn.Linear(32, 1))\nmodel[0].register_forward_hook(hook_fn('layer1'))\nmodel[2].register_forward_hook(hook_fn('layer2'))\n_ = model(torch.randn(4, 10))\nprint(f\"Layer1 features: {features['layer1'].shape}\")\nprint(f\"Layer2 features: {features['layer2'].shape}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Layer1 features: torch.Size([4, 64])\nLayer2 features: torch.Size([4, 32])"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "59",
   "q": "Kaiming vs Xavier Init",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch.nn as nn\nlin = nn.Linear(256, 256)\nnn.init.kaiming_normal_(lin.weight, mode='fan_in', nonlinearity='relu')\nprint(f\"Kaiming: mean={lin.weight.mean():.4f}, std={lin.weight.std():.4f}\")\nnn.init.xavier_uniform_(lin.weight)\nprint(f\"Xavier:  mean={lin.weight.mean():.4f}, std={lin.weight.std():.4f}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Kaiming: mean=-0.0002, std=0.0886\nXavier:  mean=0.0001, std=0.0627"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "60",
   "q": "Gradient Penalty (WGAN-GP)",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\ndef gradient_penalty(D, real, fake):\n    alpha = torch.rand(real.size(0), 1)\n    interpolated = (alpha * real + (1 - alpha) * fake).requires_grad_(True)\n    d_interpolated = D(interpolated)\n    gradients = torch.autograd.grad(d_interpolated, interpolated,\n                                     grad_outputs=torch.ones_like(d_interpolated),\n                                     create_graph=True)[0]\n    gp = ((gradients.norm(2, dim=1) - 1) ** 2).mean()\n    return gp\nD = torch.nn.Sequential(torch.nn.Linear(10, 32), torch.nn.ReLU(), torch.nn.Linear(32, 1))\ngp = gradient_penalty(D, torch.randn(8, 10), torch.randn(8, 10))\nprint(f\"Gradient penalty: {gp.item():.4f}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Gradient penalty: 0.6568"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "61",
   "q": "Torch JIT Script",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\n@torch.jit.script\ndef fused_relu_add(x: torch.Tensor, y: torch.Tensor) -> torch.Tensor:\n    return torch.relu(x + y)\na = torch.randn(3, 3)\nb = torch.randn(3, 3)\nresult = fused_relu_add(a, b)\nprint(f\"JIT result: {result}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "JIT result: tensor([[0.0000, 0.6398, 0.8598],\n        [0.0000, 1.8648, 0.0000],\n        [0.3891, 0.0000, 0.0000]])"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "62",
   "q": "Multi-GPU DataParallel",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.nn as nn\nmodel = nn.Sequential(nn.Linear(100, 256), nn.ReLU(), nn.Linear(256, 10))\nif torch.cuda.device_count() > 1:\n    model = nn.DataParallel(model)\n    print(f\"Using {torch.cuda.device_count()} GPUs\")\nelse:\n    print(f\"Single device: {next(model.parameters()).device}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Single device: cpu"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "63",
   "q": "Tokenizer Basics",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from collections import Counter\ndef simple_tokenizer(texts, vocab_size=100):\n    all_words = ' '.join(texts).split()\n    word_counts = Counter(all_words)\n    vocab = {w: i+2 for i, (w, _) in enumerate(word_counts.most_common(vocab_size-2))}\n    vocab['<pad>'] = 0\n    vocab['<unk>'] = 1\n    return vocab\ntexts = [\"hello world\", \"hello python\", \"machine learning world\"]\nvocab = simple_tokenizer(texts)\nprint(f\"Vocab size: {len(vocab)}\")\nprint(f\"Vocab: {vocab}\")\nencoded = [vocab.get(w, 1) for w in \"hello machine\".split()]\nprint(f\"Encoded: {encoded}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Vocab size: 7\nVocab: {'hello': 2, 'world': 3, 'python': 4, 'machine': 5, 'learning': 6, '<pad>': 0, '<unk>': 1}\nEncoded: [2, 5]"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "64",
   "q": "Quantization Basics",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nmodel = torch.nn.Sequential(torch.nn.Linear(100, 256), torch.nn.ReLU(), torch.nn.Linear(256, 10))\nsize_fp32 = sum(p.numel() * 4 for p in model.parameters())\nquantized = torch.ao.quantization.quantize_dynamic(model, {torch.nn.Linear}, dtype=torch.qint8)\nx = torch.randn(1, 100)\nout = quantized(x)\nprint(f\"FP32 size: {size_fp32:,} bytes\")\nprint(f\"Output: {out.shape}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "FP32 size: 113,704 bytes\nOutput: torch.Size([1, 10])"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "65",
   "q": "Torch Einsum",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\na = torch.randn(3, 4)\nb = torch.randn(4, 5)\n# Matrix multiply\nc = torch.einsum('ij,jk->ik', a, b)\nprint(f\"Matmul: {c.shape}\")\n# Batch matmul\na = torch.randn(2, 3, 4)\nb = torch.randn(2, 4, 5)\nc = torch.einsum('bij,bjk->bik', a, b)\nprint(f\"Batch matmul: {c.shape}\")\n# Trace\nm = torch.randn(4, 4)\ntrace = torch.einsum('ii->', m)\nprint(f\"Trace: {trace.item():.4f}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Matmul: torch.Size([3, 5])\nBatch matmul: torch.Size([2, 3, 5])\nTrace: -1.3690"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "66",
   "q": "Model Interpretability — GradCAM",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.nn as nn\nclass GradCAM:\n    def __init__(self, model, target_layer):\n        self.model = model\n        self.gradients = None\n        self.activations = None\n        target_layer.register_forward_hook(self._save_activation)\n        target_layer.register_full_backward_hook(self._save_gradient)\n    def _save_activation(self, module, input, output):\n        self.activations = output.detach()\n    def _save_gradient(self, module, grad_input, grad_output):\n        self.gradients = grad_output[0].detach()\n    def generate(self, x, target_class):\n        output = self.model(x)\n        self.model.zero_grad()\n        output[0, target_class].backward()\n        weights = self.gradients.mean(dim=[2, 3], keepdim=True)\n        cam = (weights * self.activations).sum(dim=1, keepdim=True)\n        return torch.relu(cam)\n\nmodel = nn.Sequential(\n    nn.Conv2d(3, 16, 3, padding=1), nn.ReLU(), nn.AdaptiveAvgPool2d(4),\n    nn.Flatten(), nn.Linear(16*4*4, 10)\n)\ncam = GradCAM(model, model[0])\nx = torch.randn(1, 3, 32, 32)\nheatmap = cam.generate(x, target_class=5)\nprint(f\"GradCAM heatmap: {heatmap.shape}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "GradCAM heatmap: torch.Size([1, 1, 32, 32])"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "67",
   "q": "Quick PyTorch Snippets",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "# 666: Tensor indexing\nx = torch.randn(5, 10)\nprint(f\"Fancy index: {x[[0, 2, 4], :3].shape}\")\n\n# 667: Boolean masking\nmask = x > 0\nprint(f\"Positive values: {x[mask].shape}\")\n\n# 668: In-place operations\nx = torch.zeros(3); x.add_(1); print(f\"In-place add: {x}\")\n\n# 669: Detach for inference\nx = torch.randn(3, requires_grad=True)\ny = x * 2\nz = y.detach()  # Stops gradient tracking\nprint(f\"z requires_grad: {z.requires_grad}\")\n\n# 670: Torch where\nx = torch.randn(5)\nresult = torch.where(x > 0, x, torch.zeros_like(x))\nprint(f\"ReLU via where: {result}\")\n\n# 671: Scatter (one-hot)\nlabels = torch.tensor([0, 2, 1, 3])\none_hot = torch.zeros(4, 4).scatter_(1, labels.unsqueeze(1), 1)\nprint(f\"One-hot:\\n{one_hot}\")\n\n# 672: Torch clamp\nx = torch.randn(5) * 3\nclamped = x.clamp(-1, 1)\nprint(f\"Original: {x}, Clamped: {clamped}\")\n\n# 673: Concatenate vs Stack\na, b = torch.randn(3, 4), torch.randn(3, 4)\nprint(f\"Cat: {torch.cat([a, b], dim=0).shape}\")    # (6, 4)\nprint(f\"Stack: {torch.stack([a, b], dim=0).shape}\") # (2, 3, 4)\n\n# 674: Repeat and expand\nx = torch.tensor([1, 2, 3])\nprint(f\"Repeat: {x.repeat(3)}\")\nprint(f\"Expand: {x.unsqueeze(0).expand(3, -1)}\")\n\n# 675: Torch no_grad\nmodel = torch.nn.Linear(5, 1)\nx = torch.randn(3, 5)\nwith torch.no_grad():\n    out = model(x)\nprint(f\"No grad output: {out.shape}, requires_grad: {out.requires_grad}\")\n\n# 676: Named tensors\nx = torch.randn(2, 3, 4, names=('batch', 'channel', 'width'))\nprint(f\"Named: {x.names}\")\n\n# 677: Convolution output size calculator\ndef conv_output_size(input_size, kernel, stride=1, padding=0, dilation=1):\n    return (input_size + 2*padding - dilation*(kernel-1) - 1) // stride + 1\nprint(f\"Conv output: {conv_output_size(224, 7, 2, 3)}\")  # 112\n\n# 678: Model summary\ndef model_summary(model):\n    for name, param in model.named_parameters():\n        print(f\"{name:30s} {str(list(param.shape)):20s} {param.numel():>10,}\")\nmodel_summary(torch.nn.Sequential(torch.nn.Linear(784, 256), torch.nn.Linear(256, 10)))\n\n# 679: Geometric augmentation\nx = torch.randn(1, 3, 32, 32)\nprint(f\"Flip H: {torch.flip(x, [3]).shape}\")\nprint(f\"Flip V: {torch.flip(x, [2]).shape}\")\nprint(f\"Rot 90: {torch.rot90(x, 1, [2, 3]).shape}\")\n\n# 680: Torch topk\nx = torch.randn(100)\nvalues, indices = torch.topk(x, k=5)\nprint(f\"Top 5 values: {values}\")\nprint(f\"Top 5 indices: {indices}\")\n\n# 681: Cosine similarity batch\na = torch.randn(8, 128)\nb = torch.randn(8, 128)\nsim = torch.nn.functional.cosine_similarity(a, b)\nprint(f\"Batch cosine sim: {sim.shape}\")\n\n# 682: Padding sequences\nfrom torch.nn.utils.rnn import pad_sequence\nseqs = [torch.randn(3, 10), torch.randn(5, 10), torch.randn(2, 10)]\npadded = pad_sequence(seqs, batch_first=True)\nprint(f\"Padded: {padded.shape}\")  # (3, 5, 10) — max length 5\n\n# 683: Packing sequences\nfrom torch.nn.utils.rnn import pack_padded_sequence, pad_packed_sequence\nlengths = torch.tensor([5, 3, 2])\npacked = pack_padded_sequence(padded, lengths, batch_first=True, enforce_sorted=True)\nprint(f\"Packed data: {packed.data.shape}\")\n\n# 684: Torch gather\nx = torch.tensor([[1, 2, 3], [4, 5, 6]])\nidx = torch.tensor([[0, 2], [1, 0]])\nresult = torch.gather(x, 1, idx)\nprint(f\"Gathered: {result}\")\n\n# 685: Weighted loss\ncriterion = torch.nn.CrossEntropyLoss(weight=torch.tensor([1.0, 2.0, 0.5]))\nlogits = torch.randn(4, 3)\ntargets = torch.tensor([0, 1, 2, 1])\nprint(f\"Weighted CE: {criterion(logits, targets).item():.4f}\")\n\n# 686: Multi-head self-attention manual\ndef multi_head_attn(x, num_heads=4, d_model=64):\n    B, S, D = x.shape\n    head_dim = D // num_heads\n    q = k = v = x.view(B, S, num_heads, head_dim).permute(0, 2, 1, 3)\n    scores = (q @ k.transpose(-2, -1)) / head_dim**0.5\n    attn = torch.softmax(scores, dim=-1)\n    return (attn @ v).permute(0, 2, 1, 3).reshape(B, S, D)\nout = multi_head_attn(torch.randn(2, 10, 64))\nprint(f\"Multi-head output: {out.shape}\")\n\n# 687: Torch autograd\nx = torch.tensor(3.0, requires_grad=True)\ny = x**2 + 2*x + 1\ny.backward()\nprint(f\"dy/dx at x=3: {x.grad}\")  # 2*3 + 2 = 8\n\n# 688: Hinge loss\ndef hinge_loss(pred, target):\n    return torch.clamp(1 - target * pred, min=0).mean()\npred = torch.tensor([0.8, -0.5, 1.2, -0.9])\ntarget = torch.tensor([1.0, -1.0, 1.0, -1.0])\nprint(f\"Hinge loss: {hinge_loss(pred, target).item():.4f}\")\n\n# 689: Adaptive pooling\nx = torch.randn(1, 64, 13, 17)  # Odd spatial dims\npool = torch.nn.AdaptiveAvgPool2d((7, 7))\nprint(f\"Adaptive pool: {x.shape} → {pool(x).shape}\")\n\n# 690: Register buffer (non-parameter state)\nclass ModelWithBuffer(torch.nn.Module):\n    def __init__(self):\n        super().__init__()\n        self.register_buffer('running_mean', torch.zeros(10))\n        self.linear = torch.nn.Linear(10, 5)\n    def forward(self, x):\n        self.running_mean = 0.9 * self.running_mean + 0.1 * x.mean(0)\n        return self.linear(x)\nm = ModelWithBuffer()\n_ = m(torch.randn(4, 10))\nprint(f\"Buffer: {m.running_mean[:5]}\")\n\n# 691: Group Normalization\ngn = torch.nn.GroupNorm(num_groups=8, num_channels=64)\nx = torch.randn(4, 64, 16, 16)\nprint(f\"GroupNorm: {gn(x).shape}\")\n\n# 692: Pixel shuffle (sub-pixel conv)\nps = torch.nn.PixelShuffle(upscale_factor=2)\nx = torch.randn(1, 64, 8, 8)\nprint(f\"PixelShuffle: {x.shape} → {ps(x).shape}\")  # 16×16, 16 channels\n\n# 693: Smooth L1 loss\npred = torch.randn(10)\ntarget = torch.randn(10)\nl1 = torch.nn.SmoothL1Loss()(pred, target)\nprint(f\"Smooth L1: {l1.item():.4f}\")\n\n# 694: Torch cumsum\nx = torch.tensor([1.0, 2.0, 3.0, 4.0])\nprint(f\"Cumsum: {torch.cumsum(x, dim=0)}\")  # [1, 3, 6, 10]\n\n# 695: Torch meshgrid\nx = torch.arange(3)\ny = torch.arange(4)\ngx, gy = torch.meshgrid(x, y, indexing='ij')\nprint(f\"Grid X:\\n{gx}\\nGrid Y:\\n{gy}\")\n\n# 696: Parameter groups for different learning rates\nmodel = torch.nn.Sequential(torch.nn.Linear(10, 64), torch.nn.Linear(64, 1))\noptimizer = torch.optim.Adam([\n    {'params': model[0].parameters(), 'lr': 0.01},\n    {'params': model[1].parameters(), 'lr': 0.001}\n])\nprint(f\"LR group 1: {optimizer.param_groups[0]['lr']}\")\nprint(f\"LR group 2: {optimizer.param_groups[1]['lr']}\")\n\n# 697: Torch distributions\nfrom torch.distributions import Normal\ndist = Normal(loc=0.0, scale=1.0)\nsamples = dist.sample((1000,))\nlog_probs = dist.log_prob(samples)\nprint(f\"Mean: {samples.mean():.4f}, Std: {samples.std():.4f}\")\n\n# 698: Custom activation\nclass Mish(torch.nn.Module):\n    def forward(self, x):\n        return x * torch.tanh(torch.nn.functional.softplus(x))\nmish = Mish()\nx = torch.linspace(-5, 5, 11)\nprint(f\"Mish: {mish(x)}\")\n\n# 699: Torch solve linear system\nA = torch.tensor([[3.0, 1.0], [1.0, 2.0]])\nb = torch.tensor([[9.0], [8.0]])\nx = torch.linalg.solve(A, b)\nprint(f\"Solution: {x.flatten()}\")  # [2, 3]\n\n# 700: Memory usage\nimport torch\nt = torch.randn(1000, 1000)\nprint(f\"Tensor memory: {t.element_size() * t.nelement() / 1024**2:.2f} MB\")\nprint(f\"dtype: {t.dtype}, element_size: {t.element_size()} bytes\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Fancy index: torch.Size([3, 3])\nPositive values: torch.Size([21])\nIn-place add: tensor([1., 1., 1.])\nz requires_grad: False\nReLU via where: tensor([1.3138, 0.0000, 0.0000, 0.0000, 0.0000])\nOne-hot:\ntensor([[1., 0., 0., 0.],\n        [0., 0., 1., 0.],\n        [0., 1., 0., 0.],\n        [0., 0., 0., 1.]])\nOriginal: tensor([ 1.1921, -1.6063,  1.0030,  3.3324,  1.4384]), Clamped: tensor([ 1., -1.,  1.,  1.,  1.])\nCat: torch.Size([6, 4])\nStack: torch.Size([2, 3, 4])\nRepeat: tensor([1, 2, 3, 1, 2, 3, 1, 2, 3])\nExpand: tensor([[1, 2, 3],\n        [1, 2, 3],\n        [1, 2, 3]])\nNo grad output: torch.Size([3, 1]), requires_grad: False\nNamed: ('batch', 'channel', 'width')\nConv output: 112\n0.weight                       [256, 784]              200,704\n0.bias                         [256]                       256\n1.weight                       [10, 256]                 2,560\n1.bias                         [10]                         10\nFlip H: torch.Size([1, 3, 32, 32])\nFlip V: torch.Size([1, 3, 32, 32])\nRot 90: torch.Size([1, 3, 32, 32])\nTop 5 values: tensor([2.3274, 2.1885, 2.1683, 2.1249, 2.0967])\nTop 5 indices: tensor([37, 88, 38, 66, 14])\nBatch cosine sim: torch.Size([8])\nPadded: torch.Size([3, 5, 10])\nPacked data: torch.Size([10, 10])\nGathered: tensor([[1, 3],\n        [5, 4]])\nWeighted CE: 1.3034\nMulti-head output: torch.Size([2, 10, 64])\ndy/dx at x=3: 8.0\nHinge loss: 0.2000\nAdaptive pool: torch.Size([1, 64, 13, 17]) → torch.Size([1, 64, 7, 7])\nBuffer: tensor([ 0.0310, -0.1287,  0.1400,  0.0719, -0.0586])\nGroupNorm: torch.Size([4, 64, 16, 16])\nPixelShuffle: torch.Size([1, 64, 8, 8]) → torch.Size([1, 16, 16, 16])\nSmooth L1: 1.0307\nCumsum: tensor([ 1.,  3.,  6., 10.])\nGrid X:\ntensor([[0, 0, 0, 0],\n        [1, 1, 1, 1],\n        [2, 2, 2, 2]])\nGrid Y:\ntensor([[0, 1, 2, 3],\n        [0, 1, 2, 3],\n        [0, 1, 2, 3]])\nLR group 1: 0.01\nLR group 2: 0.001\nMean: 0.0166, Std: 0.9544\nMish: tensor([-0.0336, -0.0726, -0.1456, -0.2525, -0.3034,  0.0000,  0.8651,  1.9440,\n         2.9865,  3.9974,  4.9996])\nSolution: tensor([2., 3.])\nTensor memory: 3.81 MB\ndtype: torch.float32, element_size: 4 bytes"
    }
   ],
   "kind": "program"
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
