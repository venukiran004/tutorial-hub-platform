/* ============================================================================
   PRACTICE P1.1 — PyTorch Programs · 1
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/05_Deep_Learning/Practice/00_PyTorch_Programs.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "p1.1",
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
   "n": "1",
   "q": "Simple Neural Network in PyTorch",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.nn as nn\n\nmodel = nn.Sequential(\n    nn.Linear(10, 64),\n    nn.ReLU(),\n    nn.Linear(64, 32),\n    nn.ReLU(),\n    nn.Linear(32, 1)\n)\nx = torch.randn(5, 10)\nout = model(x)\nprint(f\"Input: {x.shape}, Output: {out.shape}\")\nprint(f\"Total params: {sum(p.numel() for p in model.parameters())}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Input: torch.Size([5, 10]), Output: torch.Size([5, 1])\nTotal params: 2817"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "2",
   "q": "Training Loop in PyTorch",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.nn as nn\nimport torch.optim as optim\n\ntorch.manual_seed(42)\nX = torch.randn(100, 5)\ny = (X.sum(dim=1) > 0).float().unsqueeze(1)\n\nmodel = nn.Sequential(nn.Linear(5, 16), nn.ReLU(), nn.Linear(16, 1), nn.Sigmoid())\ncriterion = nn.BCELoss()\noptimizer = optim.Adam(model.parameters(), lr=0.01)\n\nfor epoch in range(100):\n    pred = model(X)\n    loss = criterion(pred, y)\n    optimizer.zero_grad()\n    loss.backward()\n    optimizer.step()\n    if (epoch + 1) % 25 == 0:\n        acc = ((pred >= 0.5).float() == y).float().mean()\n        print(f\"Epoch {epoch+1}: Loss={loss.item():.4f}, Acc={acc.item():.4f}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Epoch 25: Loss=0.3363, Acc=0.9400\nEpoch 50: Loss=0.1035, Acc=0.9900\nEpoch 75: Loss=0.0433, Acc=1.0000\nEpoch 100: Loss=0.0272, Acc=1.0000"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "3",
   "q": "Dataset and DataLoader",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nfrom torch.utils.data import Dataset, DataLoader\n\nclass CustomDataset(Dataset):\n    def __init__(self, size=1000):\n        self.X = torch.randn(size, 10)\n        self.y = (self.X.sum(dim=1) > 0).float()\n    def __len__(self):\n        return len(self.X)\n    def __getitem__(self, idx):\n        return self.X[idx], self.y[idx]\n\ndataset = CustomDataset(500)\nloader = DataLoader(dataset, batch_size=32, shuffle=True)\nfor batch_x, batch_y in loader:\n    print(f\"Batch X: {batch_x.shape}, Batch y: {batch_y.shape}\")\n    break\nprint(f\"Total batches: {len(loader)}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Batch X: torch.Size([32, 10]), Batch y: torch.Size([32])\nTotal batches: 16"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "4",
   "q": "CNN for Image Classification",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.nn as nn\n\nclass SimpleCNN(nn.Module):\n    def __init__(self, num_classes=10):\n        super().__init__()\n        self.features = nn.Sequential(\n            nn.Conv2d(3, 32, 3, padding=1), nn.ReLU(), nn.MaxPool2d(2),\n            nn.Conv2d(32, 64, 3, padding=1), nn.ReLU(), nn.MaxPool2d(2),\n            nn.Conv2d(64, 128, 3, padding=1), nn.ReLU(), nn.AdaptiveAvgPool2d(1)\n        )\n        self.classifier = nn.Linear(128, num_classes)\n    \n    def forward(self, x):\n        x = self.features(x)\n        x = x.view(x.size(0), -1)\n        return self.classifier(x)\n\nmodel = SimpleCNN()\nx = torch.randn(4, 3, 32, 32)\nout = model(x)\nprint(f\"Input: {x.shape}, Output: {out.shape}\")\nprint(f\"Params: {sum(p.numel() for p in model.parameters()):,}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Input: torch.Size([4, 3, 32, 32]), Output: torch.Size([4, 10])\nParams: 94,538"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "5",
   "q": "LSTM for Sequence Classification",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.nn as nn\n\nclass LSTMClassifier(nn.Module):\n    def __init__(self, vocab_size=1000, embed_dim=64, hidden_dim=128, num_classes=2):\n        super().__init__()\n        self.embedding = nn.Embedding(vocab_size, embed_dim)\n        self.lstm = nn.LSTM(embed_dim, hidden_dim, batch_first=True, bidirectional=True)\n        self.fc = nn.Linear(hidden_dim * 2, num_classes)\n    \n    def forward(self, x):\n        emb = self.embedding(x)\n        _, (hidden, _) = self.lstm(emb)\n        hidden = torch.cat([hidden[-2], hidden[-1]], dim=1)\n        return self.fc(hidden)\n\nmodel = LSTMClassifier()\nx = torch.randint(0, 1000, (4, 50))\nout = model(x)\nprint(f\"Input: {x.shape}, Output: {out.shape}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Input: torch.Size([4, 50]), Output: torch.Size([4, 2])"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "6",
   "q": "Transfer Learning with Pretrained Model",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.nn as nn\nfrom torchvision import models\n\n# Load pretrained ResNet18, replace classifier\nmodel = models.resnet18(weights='IMAGENET1K_V1')\nfor param in model.parameters():\n    param.requires_grad = False  # Freeze all layers\n\nmodel.fc = nn.Linear(model.fc.in_features, 5)  # 5 classes\ntrainable = sum(p.numel() for p in model.parameters() if p.requires_grad)\ntotal = sum(p.numel() for p in model.parameters())\nprint(f\"Trainable: {trainable:,} / {total:,} ({trainable/total:.1%})\")\n\nx = torch.randn(2, 3, 224, 224)\nout = model(x)\nprint(f\"Output: {out.shape}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Trainable: 2,565 / 11,179,077 (0.0%)\nOutput: torch.Size([2, 5])"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "7",
   "q": "Learning Rate Scheduler",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.optim as optim\n\nmodel = torch.nn.Linear(10, 1)\noptimizer = optim.Adam(model.parameters(), lr=0.01)\n\n# Cosine annealing\nscheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=50)\n\nlrs = []\nfor epoch in range(50):\n    lrs.append(optimizer.param_groups[0]['lr'])\n    optimizer.step()\n    scheduler.step()\n\nprint(f\"LR at epoch 0: {lrs[0]:.6f}\")\nprint(f\"LR at epoch 25: {lrs[25]:.6f}\")\nprint(f\"LR at epoch 49: {lrs[49]:.6f}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "LR at epoch 0: 0.010000\nLR at epoch 25: 0.005000\nLR at epoch 49: 0.000010"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "8",
   "q": "Batch Normalization Effect",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.nn as nn\n\n# Without BatchNorm\nmodel_no_bn = nn.Sequential(nn.Linear(100, 256), nn.ReLU(), nn.Linear(256, 128), nn.ReLU(), nn.Linear(128, 10))\n\n# With BatchNorm\nmodel_bn = nn.Sequential(\n    nn.Linear(100, 256), nn.BatchNorm1d(256), nn.ReLU(),\n    nn.Linear(256, 128), nn.BatchNorm1d(128), nn.ReLU(),\n    nn.Linear(128, 10)\n)\n\nx = torch.randn(32, 100)\nout_no_bn = model_no_bn(x)\nout_bn = model_bn(x)\nprint(f\"Without BN — Mean: {out_no_bn.mean():.4f}, Std: {out_no_bn.std():.4f}\")\nprint(f\"With BN    — Mean: {out_bn.mean():.4f}, Std: {out_bn.std():.4f}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Without BN — Mean: -0.0062, Std: 0.0908\nWith BN    — Mean: 0.1210, Std: 0.3467"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "9",
   "q": "Dropout Regularization",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.nn as nn\n\nmodel = nn.Sequential(\n    nn.Linear(10, 64), nn.ReLU(), nn.Dropout(0.5),\n    nn.Linear(64, 32), nn.ReLU(), nn.Dropout(0.3),\n    nn.Linear(32, 1)\n)\nx = torch.randn(5, 10)\n\nmodel.train()\nout_train = model(x)\nprint(f\"Train mode output: {out_train.flatten()}\")\n\nmodel.eval()\nout_eval = model(x)\nprint(f\"Eval mode output: {out_eval.flatten()}\")\n# Eval mode: No dropout, deterministic output"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Train mode output: tensor([ 0.1155,  0.0544, -0.0496,  0.2441,  0.0806], grad_fn=<ViewBackward0>)\nEval mode output: tensor([ 0.0704,  0.1579, -0.0205,  0.2373, -0.1730], grad_fn=<ViewBackward0>)"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "10",
   "q": "Save and Load Model",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.nn as nn\n\nmodel = nn.Sequential(nn.Linear(10, 32), nn.ReLU(), nn.Linear(32, 1))\noptimizer = torch.optim.Adam(model.parameters(), lr=0.001)\n\n# Save checkpoint\ncheckpoint = {\n    'model_state': model.state_dict(),\n    'optimizer_state': optimizer.state_dict(),\n    'epoch': 50\n}\ntorch.save(checkpoint, 'checkpoint.pth')\n\n# Load checkpoint\nloaded = torch.load('checkpoint.pth', weights_only=False)\nmodel.load_state_dict(loaded['model_state'])\noptimizer.load_state_dict(loaded['optimizer_state'])\nprint(f\"Resumed from epoch {loaded['epoch']}\")\n\nimport os; os.remove('checkpoint.pth')"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Resumed from epoch 50"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "11",
   "q": "Autoencoder",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.nn as nn\n\nclass Autoencoder(nn.Module):\n    def __init__(self, input_dim=784, latent_dim=32):\n        super().__init__()\n        self.encoder = nn.Sequential(\n            nn.Linear(input_dim, 256), nn.ReLU(),\n            nn.Linear(256, 64), nn.ReLU(),\n            nn.Linear(64, latent_dim)\n        )\n        self.decoder = nn.Sequential(\n            nn.Linear(latent_dim, 64), nn.ReLU(),\n            nn.Linear(64, 256), nn.ReLU(),\n            nn.Linear(256, input_dim), nn.Sigmoid()\n        )\n    def forward(self, x):\n        z = self.encoder(x)\n        return self.decoder(z), z\n\nae = Autoencoder()\nx = torch.randn(8, 784)\nreconstructed, latent = ae(x)\nprint(f\"Input: {x.shape}, Latent: {latent.shape}, Reconstructed: {reconstructed.shape}\")\nprint(f\"Reconstruction error: {nn.MSELoss()(reconstructed, x).item():.4f}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Input: torch.Size([8, 784]), Latent: torch.Size([8, 32]), Reconstructed: torch.Size([8, 784])\nReconstruction error: 1.2350"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "12",
   "q": "Attention Mechanism",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.nn as nn\nimport math\n\ndef scaled_dot_product_attention(Q, K, V):\n    d_k = Q.size(-1)\n    scores = torch.matmul(Q, K.transpose(-2, -1)) / math.sqrt(d_k)\n    weights = torch.softmax(scores, dim=-1)\n    output = torch.matmul(weights, V)\n    return output, weights\n\nbatch, seq_len, d_model = 2, 10, 64\nQ = K = V = torch.randn(batch, seq_len, d_model)\noutput, attn_weights = scaled_dot_product_attention(Q, K, V)\nprint(f\"Output: {output.shape}, Attention: {attn_weights.shape}\")\nprint(f\"Attention sum per query (should be 1): {attn_weights[0][0].sum():.4f}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Output: torch.Size([2, 10, 64]), Attention: torch.Size([2, 10, 10])\nAttention sum per query (should be 1): 1.0000"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "13",
   "q": "Multi-Head Attention",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.nn as nn\n\nmha = nn.MultiheadAttention(embed_dim=64, num_heads=8, batch_first=True)\nx = torch.randn(4, 20, 64)  # batch=4, seq=20, dim=64\noutput, attn_weights = mha(x, x, x)\nprint(f\"Input: {x.shape}\")\nprint(f\"Output: {output.shape}\")\nprint(f\"Attention weights: {attn_weights.shape}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Input: torch.Size([4, 20, 64])\nOutput: torch.Size([4, 20, 64])\nAttention weights: torch.Size([4, 20, 20])"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "14",
   "q": "Positional Encoding",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport math\n\ndef positional_encoding(max_len, d_model):\n    pe = torch.zeros(max_len, d_model)\n    position = torch.arange(0, max_len).unsqueeze(1).float()\n    div_term = torch.exp(torch.arange(0, d_model, 2).float() * -(math.log(10000.0) / d_model))\n    pe[:, 0::2] = torch.sin(position * div_term)\n    pe[:, 1::2] = torch.cos(position * div_term)\n    return pe\n\npe = positional_encoding(100, 64)\nprint(f\"PE shape: {pe.shape}\")\nprint(f\"Position 0: {pe[0, :6].tolist()}\")\nprint(f\"Position 50: {pe[50, :6].tolist()}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "PE shape: torch.Size([100, 64])\nPosition 0: [0.0, 1.0, 0.0, 1.0, 0.0, 1.0]\nPosition 50: [-0.2623748481273651, 0.9649660587310791, -0.20298245549201965, 0.9791823625564575, 0.15661907196044922, -0.9876590967178345]"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "15",
   "q": "GAN Generator and Discriminator",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.nn as nn\n\ndef make_generator(latent_dim=100, output_dim=784):\n    return nn.Sequential(\n        nn.Linear(latent_dim, 256), nn.LeakyReLU(0.2),\n        nn.Linear(256, 512), nn.LeakyReLU(0.2),\n        nn.Linear(512, output_dim), nn.Tanh()\n    )\n\ndef make_discriminator(input_dim=784):\n    return nn.Sequential(\n        nn.Linear(input_dim, 512), nn.LeakyReLU(0.2), nn.Dropout(0.3),\n        nn.Linear(512, 256), nn.LeakyReLU(0.2), nn.Dropout(0.3),\n        nn.Linear(256, 1), nn.Sigmoid()\n    )\n\nG = make_generator()\nD = make_discriminator()\nz = torch.randn(8, 100)\nfake = G(z)\nvalidity = D(fake)\nprint(f\"Noise: {z.shape} → Fake: {fake.shape} → Valid: {validity.shape}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Noise: torch.Size([8, 100]) → Fake: torch.Size([8, 784]) → Valid: torch.Size([8, 1])"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "16",
   "q": "Weight Initialization",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.nn as nn\n\ndef init_weights(module):\n    if isinstance(module, nn.Linear):\n        nn.init.kaiming_normal_(module.weight, mode='fan_out', nonlinearity='relu')\n        if module.bias is not None:\n            nn.init.zeros_(module.bias)\n    elif isinstance(module, nn.Conv2d):\n        nn.init.kaiming_normal_(module.weight, mode='fan_out', nonlinearity='relu')\n\nmodel = nn.Sequential(nn.Linear(100, 256), nn.ReLU(), nn.Linear(256, 10))\nmodel.apply(init_weights)\nfor name, param in model.named_parameters():\n    if 'weight' in name:\n        print(f\"{name}: mean={param.data.mean():.4f}, std={param.data.std():.4f}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "0.weight: mean=0.0000, std=0.0879\n2.weight: mean=0.0034, std=0.4433"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "17",
   "q": "Gradient Clipping",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.nn as nn\n\nmodel = nn.Linear(10, 1)\nx = torch.randn(5, 10) * 100  # Large inputs\ny = torch.randn(5, 1)\nloss = nn.MSELoss()(model(x), y)\nloss.backward()\n\n# Before clipping\ngrad_norm_before = torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=float('inf'))\n\n# Apply clipping\nloss = nn.MSELoss()(model(x), y)\nmodel.zero_grad()\nloss.backward()\ngrad_norm_after = torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)\n\nprint(f\"Grad norm before clip: {grad_norm_before:.4f}\")\nprint(f\"Grad norm after clip: {grad_norm_after:.4f}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Grad norm before clip: 16486.7617\nGrad norm after clip: 16486.7617"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "18",
   "q": "Mixed Precision Training",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.nn as nn\n\nmodel = nn.Sequential(nn.Linear(100, 256), nn.ReLU(), nn.Linear(256, 10))\noptimizer = torch.optim.Adam(model.parameters())\nscaler = torch.amp.GradScaler('cuda') if torch.cuda.is_available() else None\n\nx = torch.randn(32, 100)\ny = torch.randint(0, 10, (32,))\ncriterion = nn.CrossEntropyLoss()\n\n# Simulated mixed precision step\ndevice = 'cuda' if torch.cuda.is_available() else 'cpu'\nmodel = model.to(device)\nx, y = x.to(device), y.to(device)\n\nif device == 'cuda':\n    with torch.amp.autocast('cuda'):\n        out = model(x)\n        loss = criterion(out, y)\n    scaler.scale(loss).backward()\n    scaler.step(optimizer)\n    scaler.update()\nelse:\n    out = model(x)\n    loss = criterion(out, y)\n    loss.backward()\n    optimizer.step()\nprint(f\"Loss: {loss.item():.4f}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Loss: 2.2651"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "19",
   "q": "Embedding Layer",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.nn as nn\n\nembed = nn.Embedding(num_embeddings=10000, embedding_dim=64, padding_idx=0)\ninput_ids = torch.tensor([[1, 42, 567, 0, 0], [23, 89, 0, 0, 0]])\nembeddings = embed(input_ids)\nprint(f\"Input: {input_ids.shape}\")\nprint(f\"Embeddings: {embeddings.shape}\")\nprint(f\"Padding vector (should be zeros): {embeddings[0, 3].sum().item()}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Input: torch.Size([2, 5])\nEmbeddings: torch.Size([2, 5, 64])\nPadding vector (should be zeros): 0.0"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "20",
   "q": "ResNet Block",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.nn as nn\n\nclass ResidualBlock(nn.Module):\n    def __init__(self, channels):\n        super().__init__()\n        self.block = nn.Sequential(\n            nn.Conv2d(channels, channels, 3, padding=1),\n            nn.BatchNorm2d(channels),\n            nn.ReLU(),\n            nn.Conv2d(channels, channels, 3, padding=1),\n            nn.BatchNorm2d(channels)\n        )\n        self.relu = nn.ReLU()\n    \n    def forward(self, x):\n        return self.relu(self.block(x) + x)  # Skip connection!\n\nblock = ResidualBlock(64)\nx = torch.randn(4, 64, 16, 16)\nout = block(x)\nprint(f\"Input: {x.shape}, Output: {out.shape}\")  # Same shape!"
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
   "n": "21",
   "q": "Depthwise Separable Convolution",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.nn as nn\n\nclass DepthwiseSeparable(nn.Module):\n    def __init__(self, in_ch, out_ch):\n        super().__init__()\n        self.depthwise = nn.Conv2d(in_ch, in_ch, 3, padding=1, groups=in_ch)\n        self.pointwise = nn.Conv2d(in_ch, out_ch, 1)\n    \n    def forward(self, x):\n        return self.pointwise(self.depthwise(x))\n\nstd_conv = nn.Conv2d(64, 128, 3, padding=1)\ndw_conv = DepthwiseSeparable(64, 128)\nx = torch.randn(1, 64, 32, 32)\nprint(f\"Standard conv params: {sum(p.numel() for p in std_conv.parameters()):,}\")\nprint(f\"Depthwise sep params: {sum(p.numel() for p in dw_conv.parameters()):,}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Standard conv params: 73,856\nDepthwise sep params: 8,960"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "22",
   "q": "Global Average Pooling",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.nn as nn\n\ngap = nn.AdaptiveAvgPool2d(1)\nx = torch.randn(4, 512, 7, 7)\nout = gap(x)\nprint(f\"Before GAP: {x.shape}\")\nprint(f\"After GAP: {out.shape}\")\nprint(f\"Flattened: {out.view(4, -1).shape}\")\n# Replaces large FC layers — 512*7*7 = 25088 params → 512 params"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Before GAP: torch.Size([4, 512, 7, 7])\nAfter GAP: torch.Size([4, 512, 1, 1])\nFlattened: torch.Size([4, 512])"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "23",
   "q": "Label Smoothing Loss",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.nn as nn\n\nclass LabelSmoothingLoss(nn.Module):\n    def __init__(self, num_classes, smoothing=0.1):\n        super().__init__()\n        self.smoothing = smoothing\n        self.num_classes = num_classes\n    \n    def forward(self, pred, target):\n        confidence = 1.0 - self.smoothing\n        smooth_val = self.smoothing / (self.num_classes - 1)\n        true_dist = torch.full_like(pred, smooth_val)\n        true_dist.scatter_(1, target.unsqueeze(1), confidence)\n        return (-true_dist * torch.log_softmax(pred, dim=1)).sum(dim=1).mean()\n\ncriterion = LabelSmoothingLoss(num_classes=10, smoothing=0.1)\nlogits = torch.randn(8, 10)\ntargets = torch.randint(0, 10, (8,))\nloss = criterion(logits, targets)\nprint(f\"Label smoothing loss: {loss.item():.4f}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Label smoothing loss: 2.7455"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "24",
   "q": "Cosine Similarity Loss",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.nn as nn\n\ncos_sim = nn.CosineSimilarity(dim=1)\na = torch.randn(5, 128)\nb = torch.randn(5, 128)\nsimilarity = cos_sim(a, b)\nprint(f\"Cosine similarities: {similarity}\")\n\n# Contrastive-like: similar pairs should have high cosine sim\npositive_pair = (torch.randn(1, 128), torch.randn(1, 128) + 0.1)\nnegative_pair = (torch.randn(1, 128), torch.randn(1, 128) * -1)\nprint(f\"Positive: {cos_sim(*positive_pair).item():.4f}\")\nprint(f\"Negative: {cos_sim(*negative_pair).item():.4f}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Cosine similarities: tensor([ 0.1029, -0.0412, -0.1402, -0.0378, -0.1580])\nPositive: -0.0560\nNegative: 0.1261"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "25",
   "q": "Focal Loss for Imbalanced Data",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.nn as nn\nimport torch.nn.functional as F\n\ndef focal_loss(pred, target, gamma=2.0, alpha=0.25):\n    ce = F.cross_entropy(pred, target, reduction='none')\n    pt = torch.exp(-ce)\n    loss = alpha * (1 - pt) ** gamma * ce\n    return loss.mean()\n\nlogits = torch.randn(16, 5)\ntargets = torch.randint(0, 5, (16,))\nfl = focal_loss(logits, targets)\nce = F.cross_entropy(logits, targets)\nprint(f\"Focal Loss: {fl.item():.4f}\")\nprint(f\"Cross Entropy: {ce.item():.4f}\")"
    },
    {
     "t": "out",
     "label": "Output when run",
     "text": "Focal Loss: 0.4345\nCross Entropy: 2.1700"
    }
   ],
   "kind": "program"
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
