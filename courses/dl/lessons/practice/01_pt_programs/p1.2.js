/* ============================================================================
   PRACTICE P1.2 — PyTorch Programs · 2
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/05_Deep_Learning/Practice/00_PyTorch_Programs.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p1.2",
 "lede": "**25 programs** from PyTorch Programs. Read the title, write the program yourself, then open the reference version and what it printed when it was run.",
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
   "n": "26",
   "q": "Early Stopping Implementation",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "class EarlyStopping:\n    def __init__(self, patience=5, min_delta=0.001):\n        self.patience = patience\n        self.min_delta = min_delta\n        self.counter = 0\n        self.best_loss = float('inf')\n        self.should_stop = False\n    \n    def __call__(self, val_loss):\n        if val_loss < self.best_loss - self.min_delta:\n            self.best_loss = val_loss\n            self.counter = 0\n        else:\n            self.counter += 1\n            if self.counter >= self.patience:\n                self.should_stop = True\n        return self.should_stop\n\nes = EarlyStopping(patience=3)\nlosses = [1.0, 0.9, 0.85, 0.86, 0.87, 0.88, 0.89]\nfor epoch, loss in enumerate(losses):\n    stop = es(loss)\n    print(f\"Epoch {epoch}: loss={loss}, counter={es.counter}, stop={stop}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Epoch 0: loss=1.0, counter=0, stop=False\nEpoch 1: loss=0.9, counter=0, stop=False\nEpoch 2: loss=0.85, counter=0, stop=False\nEpoch 3: loss=0.86, counter=1, stop=False\nEpoch 4: loss=0.87, counter=2, stop=False\nEpoch 5: loss=0.88, counter=3, stop=True\nEpoch 6: loss=0.89, counter=4, stop=True"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "27",
   "q": "Data Augmentation with torchvision",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nfrom torchvision import transforms\n\naugmentation = transforms.Compose([\n    transforms.RandomResizedCrop(224),\n    transforms.RandomHorizontalFlip(p=0.5),\n    transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2),\n    transforms.RandomRotation(15),\n    transforms.ToTensor(),\n    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),\n])\n\n# Applied per image during training\nfrom PIL import Image\nimport numpy as np\ndummy_img = Image.fromarray(np.random.randint(0, 255, (256, 256, 3), dtype=np.uint8))\naugmented = augmentation(dummy_img)\nprint(f\"Augmented tensor: {augmented.shape}, range: [{augmented.min():.2f}, {augmented.max():.2f}]\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Augmented tensor: torch.Size([3, 224, 224]), range: [-2.12, 2.54]"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "28",
   "q": "Model Parameter Count",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch.nn as nn\n\ndef count_parameters(model):\n    total = sum(p.numel() for p in model.parameters())\n    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)\n    frozen = total - trainable\n    print(f\"Total: {total:,} | Trainable: {trainable:,} | Frozen: {frozen:,}\")\n    for name, param in model.named_parameters():\n        print(f\"  {name}: {param.numel():,} {'✓' if param.requires_grad else '✗'}\")\n\nmodel = nn.Sequential(nn.Linear(784, 256), nn.ReLU(), nn.Linear(256, 10))\ncount_parameters(model)"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Total: 203,530 | Trainable: 203,530 | Frozen: 0\n  0.weight: 200,704 ✓\n  0.bias: 256 ✓\n  2.weight: 2,560 ✓\n  2.bias: 10 ✓"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "29",
   "q": "Tensor Operations Cheatsheet",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\n\n# Create\na = torch.tensor([1, 2, 3])\nb = torch.zeros(3, 4)\nc = torch.ones(3, 4)\nd = torch.randn(3, 4)\ne = torch.arange(0, 10, 2)\nf = torch.linspace(0, 1, 5)\n\n# Reshape\nx = torch.randn(2, 3, 4)\nprint(f\"view: {x.view(6, 4).shape}\")\nprint(f\"permute: {x.permute(2, 0, 1).shape}\")\nprint(f\"unsqueeze: {x.unsqueeze(0).shape}\")\nprint(f\"squeeze: {x.unsqueeze(0).squeeze(0).shape}\")\nprint(f\"flatten: {x.flatten().shape}\")\n\n# Math\nm = torch.randn(3, 3)\nprint(f\"matmul: {(m @ m.T).shape}\")\nprint(f\"sum: {m.sum():.4f}\")\nprint(f\"mean: {m.mean():.4f}\")\nprint(f\"argmax: {m.argmax()}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "view: torch.Size([6, 4])\npermute: torch.Size([4, 2, 3])\nunsqueeze: torch.Size([1, 2, 3, 4])\nsqueeze: torch.Size([2, 3, 4])\nflatten: torch.Size([24])\nmatmul: torch.Size([3, 3])\nsum: 0.3594\nmean: 0.0399\nargmax: 2"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "30",
   "q": "Gradient Accumulation",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.nn as nn\n\nmodel = nn.Linear(10, 1)\noptimizer = torch.optim.SGD(model.parameters(), lr=0.01)\naccumulation_steps = 4\n\noptimizer.zero_grad()\nfor i in range(8):\n    x = torch.randn(8, 10)\n    y = torch.randn(8, 1)\n    loss = nn.MSELoss()(model(x), y) / accumulation_steps\n    loss.backward()\n    \n    if (i + 1) % accumulation_steps == 0:\n        optimizer.step()\n        optimizer.zero_grad()\n        print(f\"Step {i+1}: Updated weights (effective batch = {8 * accumulation_steps})\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Step 4: Updated weights (effective batch = 32)\nStep 8: Updated weights (effective batch = 32)"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "31",
   "q": "1D Convolution for Time Series",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.nn as nn\n\n# 1D Conv for time series / sequence data\nconv1d = nn.Sequential(\n    nn.Conv1d(in_channels=1, out_channels=32, kernel_size=5, padding=2),\n    nn.ReLU(),\n    nn.MaxPool1d(2),\n    nn.Conv1d(32, 64, 3, padding=1),\n    nn.ReLU(),\n    nn.AdaptiveAvgPool1d(1),\n    nn.Flatten(),\n    nn.Linear(64, 1)\n)\nx = torch.randn(8, 1, 100)  # batch=8, channels=1, seq_len=100\nout = conv1d(x)\nprint(f\"Input: {x.shape} → Output: {out.shape}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Input: torch.Size([8, 1, 100]) → Output: torch.Size([8, 1])"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "32",
   "q": "U-Net Architecture (Simplified)",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.nn as nn\n\nclass UNetBlock(nn.Module):\n    def __init__(self, in_ch, out_ch):\n        super().__init__()\n        self.conv = nn.Sequential(\n            nn.Conv2d(in_ch, out_ch, 3, padding=1), nn.ReLU(),\n            nn.Conv2d(out_ch, out_ch, 3, padding=1), nn.ReLU()\n        )\n    def forward(self, x):\n        return self.conv(x)\n\n# Encoder path\nenc1 = UNetBlock(3, 64)    # 224→224\npool = nn.MaxPool2d(2)\nenc2 = UNetBlock(64, 128)  # 112→112\n# Decoder path\nup = nn.Upsample(scale_factor=2)\ndec1 = UNetBlock(128+64, 64)  # Skip connection\n\nx = torch.randn(1, 3, 224, 224)\ne1 = enc1(x)\ne2 = enc2(pool(e1))\nd1 = dec1(torch.cat([up(e2), e1], dim=1))\nprint(f\"Encoder1: {e1.shape}, Encoder2: {e2.shape}, Decoder1: {d1.shape}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Encoder1: torch.Size([1, 64, 224, 224]), Encoder2: torch.Size([1, 128, 112, 112]), Decoder1: torch.Size([1, 64, 224, 224])"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "33",
   "q": "Weight Decay Comparison",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.nn as nn\n\nmodel = nn.Linear(10, 1)\nx = torch.randn(50, 10)\ny = torch.randn(50, 1)\n\n# Without weight decay\nopt1 = torch.optim.Adam(model.parameters(), lr=0.01, weight_decay=0.0)\n\n# With weight decay (L2 regularization)\nopt2 = torch.optim.AdamW(model.parameters(), lr=0.01, weight_decay=0.01)\n\nprint(f\"Adam (no decay): {type(opt1).__name__}\")\nprint(f\"AdamW (with decay): {type(opt2).__name__}\")\nprint(\"AdamW properly decouples weight decay from gradient update\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Adam (no decay): Adam\nAdamW (with decay): AdamW\nAdamW properly decouples weight decay from gradient update"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "34",
   "q": "Variational Autoencoder (VAE)",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.nn as nn\n\nclass VAE(nn.Module):\n    def __init__(self, input_dim=784, latent_dim=20):\n        super().__init__()\n        self.encoder = nn.Sequential(nn.Linear(input_dim, 256), nn.ReLU())\n        self.mu = nn.Linear(256, latent_dim)\n        self.logvar = nn.Linear(256, latent_dim)\n        self.decoder = nn.Sequential(\n            nn.Linear(latent_dim, 256), nn.ReLU(),\n            nn.Linear(256, input_dim), nn.Sigmoid()\n        )\n    \n    def reparameterize(self, mu, logvar):\n        std = torch.exp(0.5 * logvar)\n        eps = torch.randn_like(std)\n        return mu + eps * std\n    \n    def forward(self, x):\n        h = self.encoder(x)\n        mu, logvar = self.mu(h), self.logvar(h)\n        z = self.reparameterize(mu, logvar)\n        return self.decoder(z), mu, logvar\n\nvae = VAE()\nx = torch.randn(8, 784)\nrecon, mu, logvar = vae(x)\nkl_loss = -0.5 * torch.sum(1 + logvar - mu.pow(2) - logvar.exp())\nprint(f\"Reconstruction: {recon.shape}, KL Loss: {kl_loss.item():.4f}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Reconstruction: torch.Size([8, 784]), KL Loss: 6.0604"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "35",
   "q": "Transformer Encoder",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.nn as nn\n\nencoder_layer = nn.TransformerEncoderLayer(d_model=512, nhead=8, batch_first=True)\ntransformer_encoder = nn.TransformerEncoder(encoder_layer, num_layers=6)\n\nx = torch.randn(4, 20, 512)  # batch=4, seq=20, dim=512\nout = transformer_encoder(x)\nprint(f\"Input: {x.shape}, Output: {out.shape}\")\nprint(f\"Params: {sum(p.numel() for p in transformer_encoder.parameters()):,}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Input: torch.Size([4, 20, 512]), Output: torch.Size([4, 20, 512])\nParams: 18,914,304"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "36",
   "q": "Exponential Moving Average",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.nn as nn\nimport copy\n\ndef update_ema(ema_model, model, decay=0.999):\n    with torch.no_grad():\n        for ema_p, model_p in zip(ema_model.parameters(), model.parameters()):\n            ema_p.data.mul_(decay).add_(model_p.data, alpha=1 - decay)\n\nmodel = nn.Linear(10, 1)\nema_model = copy.deepcopy(model)\n\nfor step in range(10):\n    model.weight.data += torch.randn_like(model.weight) * 0.1\n    update_ema(ema_model, model, decay=0.99)\n\nprint(f\"Model weight mean: {model.weight.mean():.4f}\")\nprint(f\"EMA weight mean: {ema_model.weight.mean():.4f}\")\nprint(\"EMA is smoother — moves slowly toward model weights\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Model weight mean: 0.0311\nEMA weight mean: 0.0495\nEMA is smoother — moves slowly toward model weights"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "37",
   "q": "Squeeze-and-Excitation Block",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.nn as nn\n\nclass SEBlock(nn.Module):\n    def __init__(self, channels, reduction=16):\n        super().__init__()\n        self.se = nn.Sequential(\n            nn.AdaptiveAvgPool2d(1),\n            nn.Flatten(),\n            nn.Linear(channels, channels // reduction),\n            nn.ReLU(),\n            nn.Linear(channels // reduction, channels),\n            nn.Sigmoid()\n        )\n    \n    def forward(self, x):\n        scale = self.se(x).unsqueeze(-1).unsqueeze(-1)\n        return x * scale  # Channel-wise attention\n\nse = SEBlock(64)\nx = torch.randn(4, 64, 16, 16)\nout = se(x)\nprint(f\"Input: {x.shape}, Output: {out.shape}\")  # Same shape, recalibrated"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Input: torch.Size([4, 64, 16, 16]), Output: torch.Size([4, 64, 16, 16])"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "38",
   "q": "Knowledge Distillation Loss",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.nn as nn\nimport torch.nn.functional as F\n\ndef distillation_loss(student_logits, teacher_logits, labels, temp=4.0, alpha=0.7):\n    soft_loss = F.kl_div(\n        F.log_softmax(student_logits / temp, dim=1),\n        F.softmax(teacher_logits / temp, dim=1),\n        reduction='batchmean'\n    ) * (temp ** 2)\n    hard_loss = F.cross_entropy(student_logits, labels)\n    return alpha * soft_loss + (1 - alpha) * hard_loss\n\nstudent_logits = torch.randn(8, 10)\nteacher_logits = torch.randn(8, 10)\nlabels = torch.randint(0, 10, (8,))\nloss = distillation_loss(student_logits, teacher_logits, labels)\nprint(f\"Distillation loss: {loss.item():.4f}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Distillation loss: 1.3225"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "39",
   "q": "Gradient Checkpointing",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.nn as nn\nfrom torch.utils.checkpoint import checkpoint\n\nclass HeavyBlock(nn.Module):\n    def __init__(self, dim):\n        super().__init__()\n        self.layers = nn.Sequential(\n            nn.Linear(dim, dim * 4), nn.GELU(), nn.Linear(dim * 4, dim)\n        )\n    def forward(self, x):\n        return self.layers(x) + x\n\nmodel_dim = 256\nblocks = nn.ModuleList([HeavyBlock(model_dim) for _ in range(12)])\n\nx = torch.randn(4, model_dim, requires_grad=True)\nfor block in blocks:\n    x = checkpoint(block, x, use_reentrant=False)  # Save memory!\nloss = x.sum()\nloss.backward()\nprint(f\"Gradient checkpointing done. Output shape: {x.shape}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Gradient checkpointing done. Output shape: torch.Size([4, 256])"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "40",
   "q": "Spectral Normalization",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.nn as nn\n\n# Regular linear layer\nregular = nn.Linear(64, 32)\n# Spectral normalized (constrains Lipschitz constant)\nspec_norm = nn.utils.spectral_norm(nn.Linear(64, 32))\n\nx = torch.randn(8, 64)\n_ = spec_norm(x)  # Forward pass computes spectral norm\n\nprint(f\"Regular weight norm: {regular.weight.norm():.4f}\")\nprint(f\"Spec norm weight sigma: {spec_norm.weight_orig.norm():.4f}\")\nprint(\"Spectral norm stabilizes GAN training\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Regular weight norm: 3.2203\nSpec norm weight sigma: 3.3097\nSpectral norm stabilizes GAN training"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "41",
   "q": "Layer Normalization vs Batch Normalization",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.nn as nn\n\nbatch, seq, dim = 4, 10, 64\nx = torch.randn(batch, seq, dim)\n\n# LayerNorm: normalizes over last dim (features)\nln = nn.LayerNorm(dim)\nout_ln = ln(x)\nprint(f\"LayerNorm — mean: {out_ln.mean(-1).mean():.4f}, std: {out_ln.std(-1).mean():.4f}\")\n\n# BatchNorm1d: normalizes over batch dimension\nbn = nn.BatchNorm1d(dim)\nx_2d = x.view(batch * seq, dim)\nout_bn = bn(x_2d)\nprint(f\"BatchNorm — mean: {out_bn.mean(0).mean():.4f}, std: {out_bn.std(0).mean():.4f}\")\nprint(\"LayerNorm: used in Transformers (batch-independent)\")\nprint(\"BatchNorm: used in CNNs (channel-wise)\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "LayerNorm — mean: 0.0000, std: 1.0079\nBatchNorm — mean: 0.0000, std: 1.0127\nLayerNorm: used in Transformers (batch-independent)\nBatchNorm: used in CNNs (channel-wise)"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "42",
   "q": "Warmup Learning Rate",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.optim as optim\n\nmodel = torch.nn.Linear(10, 1)\noptimizer = optim.Adam(model.parameters(), lr=0.001)\n\ndef warmup_schedule(step, warmup_steps=1000, d_model=512):\n    return min(step ** -0.5, step * warmup_steps ** -1.5) * d_model ** -0.5\n\nlrs = [warmup_schedule(step+1) for step in range(5000)]\nprint(f\"LR at step 1: {lrs[0]:.6f}\")\nprint(f\"LR at step 500: {lrs[499]:.6f}\")\nprint(f\"LR at step 1000: {lrs[999]:.6f}\")\nprint(f\"LR at step 3000: {lrs[2999]:.6f}\")\nprint(f\"Peak LR at step: {lrs.index(max(lrs))+1}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "LR at step 1: 0.000001\nLR at step 500: 0.000699\nLR at step 1000: 0.001398\nLR at step 3000: 0.000807\nPeak LR at step: 1000"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "43",
   "q": "Model Pruning",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.nn as nn\nimport torch.nn.utils.prune as prune\n\nmodel = nn.Linear(100, 50)\nprint(f\"Before pruning: non-zero = {model.weight.data.nonzero().shape[0]}\")\n\n# Prune 30% of weights (lowest magnitude)\nprune.l1_unstructured(model, name='weight', amount=0.3)\nprint(f\"After 30% pruning: non-zero = {model.weight.data.nonzero().shape[0]}\")\n\n# Prune 50%\nprune.l1_unstructured(model, name='weight', amount=0.5)\nprint(f\"After 50% more: non-zero = {model.weight.data.nonzero().shape[0]}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Before pruning: non-zero = 5000\nAfter 30% pruning: non-zero = 3500\nAfter 50% more: non-zero = 1750"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "44",
   "q": "Contrastive Loss (SimCLR-style)",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.nn.functional as F\n\ndef nt_xent_loss(z1, z2, temperature=0.5):\n    z1 = F.normalize(z1, dim=1)\n    z2 = F.normalize(z2, dim=1)\n    batch_size = z1.size(0)\n    z = torch.cat([z1, z2], dim=0)\n    sim = torch.mm(z, z.T) / temperature\n    # Mask diagonal\n    mask = ~torch.eye(2 * batch_size, dtype=bool)\n    sim = sim[mask].view(2 * batch_size, -1)\n    labels = torch.cat([torch.arange(batch_size) + batch_size - 1,\n                        torch.arange(batch_size)])\n    return F.cross_entropy(sim, labels)\n\nz1 = torch.randn(8, 128)\nz2 = torch.randn(8, 128)\nloss = nt_xent_loss(z1, z2)\nprint(f\"NT-Xent Loss: {loss.item():.4f}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "NT-Xent Loss: 2.7549"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "45",
   "q": "Channel Attention (CBAM-style)",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.nn as nn\n\nclass ChannelAttention(nn.Module):\n    def __init__(self, channels, reduction=16):\n        super().__init__()\n        self.avg_pool = nn.AdaptiveAvgPool2d(1)\n        self.max_pool = nn.AdaptiveMaxPool2d(1)\n        self.fc = nn.Sequential(\n            nn.Linear(channels, channels // reduction), nn.ReLU(),\n            nn.Linear(channels // reduction, channels)\n        )\n    \n    def forward(self, x):\n        avg = self.fc(self.avg_pool(x).flatten(1))\n        mx = self.fc(self.max_pool(x).flatten(1))\n        scale = torch.sigmoid(avg + mx).unsqueeze(-1).unsqueeze(-1)\n        return x * scale\n\nca = ChannelAttention(64)\nx = torch.randn(4, 64, 32, 32)\nout = ca(x)\nprint(f\"Input: {x.shape}, Output: {out.shape}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Input: torch.Size([4, 64, 32, 32]), Output: torch.Size([4, 64, 32, 32])"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "46",
   "q": "Cross-Attention",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.nn as nn\n\ncross_attn = nn.MultiheadAttention(embed_dim=256, num_heads=8, batch_first=True)\n\n# Query from decoder, Key/Value from encoder (cross-attention)\ndecoder_state = torch.randn(4, 10, 256)   # Decoder queries\nencoder_output = torch.randn(4, 50, 256)  # Encoder keys/values\n\noutput, weights = cross_attn(\n    query=decoder_state,\n    key=encoder_output,\n    value=encoder_output\n)\nprint(f\"Query (decoder): {decoder_state.shape}\")\nprint(f\"Key/Value (encoder): {encoder_output.shape}\")\nprint(f\"Cross-attention output: {output.shape}\")\nprint(f\"Attention weights: {weights.shape}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Query (decoder): torch.Size([4, 10, 256])\nKey/Value (encoder): torch.Size([4, 50, 256])\nCross-attention output: torch.Size([4, 10, 256])\nAttention weights: torch.Size([4, 10, 50])"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "47",
   "q": "Torch Compile (PyTorch 2.0+)",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.nn as nn\n\nmodel = nn.Sequential(nn.Linear(100, 256), nn.ReLU(), nn.Linear(256, 10))\nx = torch.randn(32, 100)\n\n# torch.compile optimizes the model graph\ncompiled_model = torch.compile(model)\nout = compiled_model(x)\nprint(f\"Compiled model output: {out.shape}\")\nprint(f\"torch.compile available: {hasattr(torch, 'compile')}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "[did not run here] torch.compile needs a C++ compiler (MSVC on Windows) to build the generated kernels, and this machine has none. On a machine with a compiler the program prints the compiled model's output shape and the speed-up of the second call over the first."
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "48",
   "q": "LoRA Weight Matrix",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.nn as nn\n\nclass LoRALinear(nn.Module):\n    def __init__(self, in_features, out_features, rank=4):\n        super().__init__()\n        self.linear = nn.Linear(in_features, out_features, bias=False)\n        self.linear.weight.requires_grad = False  # Freeze original\n        self.lora_A = nn.Linear(in_features, rank, bias=False)\n        self.lora_B = nn.Linear(rank, out_features, bias=False)\n        nn.init.zeros_(self.lora_B.weight)\n    \n    def forward(self, x):\n        return self.linear(x) + self.lora_B(self.lora_A(x))\n\nlora = LoRALinear(768, 768, rank=4)\norig_params = 768 * 768\nlora_params = 768 * 4 + 4 * 768\nprint(f\"Original params: {orig_params:,}\")\nprint(f\"LoRA params: {lora_params:,} ({lora_params/orig_params:.2%})\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Original params: 589,824\nLoRA params: 6,144 (1.04%)"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "49",
   "q": "Dynamic Padding / Collate Function",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nfrom torch.nn.utils.rnn import pad_sequence\n\ndef custom_collate(batch):\n    sequences, labels = zip(*batch)\n    padded = pad_sequence(sequences, batch_first=True, padding_value=0)\n    lengths = torch.tensor([len(s) for s in sequences])\n    labels = torch.stack(labels)\n    return padded, labels, lengths\n\n# Simulate variable-length sequences\nbatch = [\n    (torch.randn(5, 32), torch.tensor(0)),\n    (torch.randn(10, 32), torch.tensor(1)),\n    (torch.randn(3, 32), torch.tensor(0)),\n]\npadded, labels, lengths = custom_collate(batch)\nprint(f\"Padded: {padded.shape}, Labels: {labels}, Lengths: {lengths}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Padded: torch.Size([3, 10, 32]), Labels: tensor([0, 1, 0]), Lengths: tensor([ 5, 10,  3])"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "50",
   "q": "Simple Diffusion Noise Schedule",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\n\ndef linear_beta_schedule(timesteps):\n    beta_start = 0.0001\n    beta_end = 0.02\n    return torch.linspace(beta_start, beta_end, timesteps)\n\ndef forward_diffusion(x_0, t, betas):\n    alphas = 1.0 - betas\n    alpha_bar = torch.cumprod(alphas, dim=0)\n    sqrt_alpha_bar = torch.sqrt(alpha_bar[t]).unsqueeze(-1)\n    sqrt_one_minus = torch.sqrt(1 - alpha_bar[t]).unsqueeze(-1)\n    noise = torch.randn_like(x_0)\n    x_t = sqrt_alpha_bar * x_0 + sqrt_one_minus * noise\n    return x_t, noise\n\nbetas = linear_beta_schedule(1000)\nx_0 = torch.randn(4, 784)\nt = torch.tensor([0, 250, 500, 999])\nx_noisy, noise = forward_diffusion(x_0, t, betas)\nprint(f\"Original std: {x_0.std():.4f}\")\nfor i, ti in enumerate(t):\n    print(f\"t={ti.item()}: noisy std = {x_noisy[i].std():.4f}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Original std: 0.9940\nt=0: noisy std = 0.9740\nt=250: noisy std = 1.0123\nt=500: noisy std = 0.9831\nt=999: noisy std = 0.9912"
    }
   ],
   "kind": "program"
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
