/* ============================================================================
   INTERVIEW I2.5 — Coding & Algorithms · Machine Learning Theory · Data Structures · Computer Vision & NLP
   ----------------------------------------------------------------------------
   Imported from tutorial-hub/04_Machine_Learning/00_Interview_Bank/02_Glassdoor_DS_and_MLE.md by .build/import-banks.py —
   edit the importer, not this file.
   ========================================================================= */
EC.receiveLesson({
 "id": "i2.5",
 "lede": "**9 questions** from Glassdoor Data Scientist and ML Engineer. Each answer is folded away until you ask for it — attempt it first, because reading an answer feels like learning and is not.",
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
   "text": "Coding & Algorithms · Machine Learning Theory · Data Structures · Computer Vision & NLP",
   "id": "set"
  },
  {
   "t": "drill",
   "n": "1",
   "q": "Compute sum of any rectangle in a matrix â€” Prefix Sum (Meta â€” ML Engineer)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Given a 2D matrix of integers, preprocess it so you can answer any rectangular sub-matrix sum query in O(1)."
    },
    {
     "t": "p",
     "text": "**Solution:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "class MatrixRectangleSum:\n    def __init__(self, matrix):\n        if not matrix or not matrix[0]:\n            self.prefix = []\n            return\n\n        m, n = len(matrix), len(matrix[0])\n        # Build 2D prefix sum\n        self.prefix = [[0] * (n + 1) for _ in range(m + 1)]\n\n        for i in range(1, m + 1):\n            for j in range(1, n + 1):\n                self.prefix[i][j] = (\n                    matrix[i-1][j-1]\n                    + self.prefix[i-1][j]\n                    + self.prefix[i][j-1]\n                    - self.prefix[i-1][j-1]\n                )\n\n    def query(self, r1, c1, r2, c2):\n        \"\"\"Sum of submatrix from (r1,c1) to (r2,c2) inclusive. O(1).\"\"\"\n        return (\n            self.prefix[r2+1][c2+1]\n            - self.prefix[r1][c2+1]\n            - self.prefix[r2+1][c1]\n            + self.prefix[r1][c1]\n        )\n\n# Example\nmatrix = [\n    [1, 2, 3, 4],\n    [5, 6, 7, 8],\n    [9, 10, 11, 12]\n]\n\nsolver = MatrixRectangleSum(matrix)\nprint(solver.query(0, 0, 1, 1))  # 1+2+5+6 = 14\nprint(solver.query(1, 1, 2, 3))  # 6+7+8+10+11+12 = 54"
    },
    {
     "t": "p",
     "text": "**Complexity:**"
    },
    {
     "t": "ul",
     "items": [
      "Preprocessing: O(m Ã— n) time and space",
      "Query: O(1) time"
     ]
    },
    {
     "t": "p",
     "text": "**Key Insight:** This is the 2D extension of prefix sums. Uses inclusion-exclusion principle. Very common at Meta â€” know this cold."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "2",
   "q": "Next Greatest Element to the Right (Meta â€” ML Engineer)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Given an array, for each element find the next greater element to its right. The O(nÂ²) brute force was rejected â€” provide O(n) solution."
    },
    {
     "t": "p",
     "text": "**Solution:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def next_greater_element(arr):\n    \"\"\"O(n) using monotonic stack.\"\"\"\n    n = len(arr)\n    result = [-1] * n\n    stack = []  # Stores indices\n\n    for i in range(n):\n        # Pop all elements smaller than current\n        while stack and arr[stack[-1]] < arr[i]:\n            idx = stack.pop()\n            result[idx] = arr[i]\n        stack.append(i)\n\n    return result\n\n# Example\narr = [4, 5, 2, 25, 7, 8]\nprint(next_greater_element(arr))\n# [5, 25, 25, -1, 8, -1]"
    },
    {
     "t": "p",
     "text": "**Variant â€” Circular array (Next Greater Element II):**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def next_greater_circular(arr):\n    \"\"\"Handle circular array by traversing twice.\"\"\"\n    n = len(arr)\n    result = [-1] * n\n    stack = []\n\n    for i in range(2 * n):\n        idx = i % n\n        while stack and arr[stack[-1]] < arr[idx]:\n            result[stack.pop()] = arr[idx]\n        if i < n:\n            stack.append(i)\n\n    return result"
    },
    {
     "t": "p",
     "text": "**Key Insight:** Monotonic stack pattern â€” O(n) because each element is pushed and popped at most once. Must-know for Meta interviews."
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "3",
   "q": "Sort in O(log n) time (Shopee â€” ML Engineer)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Is it possible to sort an array in O(log n) time?"
    },
    {
     "t": "p",
     "text": "**Answer:**"
    },
    {
     "t": "p",
     "text": "**No, general comparison-based sorting has a lower bound of O(n log n).**"
    },
    {
     "t": "p",
     "text": "This is provable via decision tree argument: any comparison sort must make at least logâ‚‚(n!) â‰ˆ n log n comparisons. However, there are special cases:"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# Case 1: Array is ALREADY sorted except for a few elements\n# â†’ Insertion sort: O(n + k) where k = inversions\ndef insertion_sort(arr):\n    for i in range(1, len(arr)):\n        key = arr[i]\n        j = i - 1\n        while j >= 0 and arr[j] > key:\n            arr[j + 1] = arr[j]\n            j -= 1\n        arr[j + 1] = key\n    return arr\n\n# Case 2: Known small range â†’ Counting Sort O(n + k)\ndef counting_sort(arr, max_val):\n    count = [0] * (max_val + 1)\n    for num in arr:\n        count[num] += 1\n    result = []\n    for val, cnt in enumerate(count):\n        result.extend([val] * cnt)\n    return result\n\n# Case 3: O(log n) is possible if array has O(1) or O(log n) elements!\n# Two elements â†’ one comparison â†’ O(1)"
    },
    {
     "t": "p",
     "text": "**What the interviewer wants to hear:**"
    },
    {
     "t": "ol",
     "items": [
      "Acknowledge the theoretical lower bound",
      "Discuss non-comparison sorts (radix, counting, bucket)",
      "Discuss special structures (nearly sorted, small range)",
      "The O(log n) scenario is possible only for trivially small arrays"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "4",
   "q": "Why does gradient descent sometimes not converge? (Baidu â€” ML Engineer)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** What are the reasons gradient descent might fail to converge?"
    },
    {
     "t": "p",
     "text": "**Comprehensive Answer:**"
    },
    {
     "t": "table",
     "head": [
      "Problem",
      "Cause",
      "Fix"
     ],
     "rows": [
      [
       "**Learning rate too high**",
       "Overshoots minimum, oscillates",
       "Reduce LR, use LR scheduler"
      ],
      [
       "**Learning rate too low**",
       "Gets stuck, extremely slow",
       "Warm-up, adaptive methods"
      ],
      [
       "**Saddle points**",
       "Zero gradient, not a minimum",
       "Momentum, Adam optimizer"
      ],
      [
       "**Local minima**",
       "Non-convex loss landscape",
       "Random restarts, simulated annealing"
      ],
      [
       "**Vanishing gradients**",
       "Deep networks, sigmoid/tanh",
       "ReLU, batch norm, residual connections"
      ],
      [
       "**Exploding gradients**",
       "Very deep networks, RNNs",
       "Gradient clipping, LSTM/GRU"
      ],
      [
       "**Poor initialization**",
       "Symmetric weights, dead neurons",
       "Xavier/He initialization"
      ],
      [
       "**Feature scaling**",
       "Elongated loss contours",
       "StandardScaler, BatchNorm"
      ],
      [
       "**Non-smooth loss**",
       "Discontinuities",
       "Smooth approximations"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import torch\nimport torch.nn as nn\n\n# Demonstration: Learning rate impact\ndef train_with_lr(lr, epochs=100):\n    model = nn.Linear(10, 1)\n    optimizer = torch.optim.SGD(model.parameters(), lr=lr)\n    loss_fn = nn.MSELoss()\n\n    X = torch.randn(100, 10)\n    y = torch.randn(100, 1)\n\n    losses = []\n    for epoch in range(epochs):\n        pred = model(X)\n        loss = loss_fn(pred, y)\n\n        optimizer.zero_grad()\n        loss.backward()\n        optimizer.step()\n\n        losses.append(loss.item())\n\n    return losses\n\n# Compare behaviors\nloss_small = train_with_lr(0.0001)   # Slow convergence\nloss_good = train_with_lr(0.01)      # Good convergence\nloss_large = train_with_lr(1.0)      # Divergence!\n\n# Fix: Use Adam optimizer (adaptive learning rates)\noptimizer = torch.optim.Adam(model.parameters(), lr=0.001)\n\n# Fix: Learning rate scheduler\nscheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(\n    optimizer, mode='min', factor=0.5, patience=5\n)"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "5",
   "q": "Explain the difference between Batch, Mini-batch, and Stochastic GD",
   "body": [
    {
     "t": "table",
     "head": [
      "Feature",
      "Batch GD",
      "Mini-batch GD",
      "Stochastic GD"
     ],
     "rows": [
      [
       "**Batch size**",
       "Full dataset",
       "32-512",
       "1"
      ],
      [
       "**Update frequency**",
       "1 per epoch",
       "n/batch_size per epoch",
       "n per epoch"
      ],
      [
       "**Convergence**",
       "Smooth",
       "Balanced",
       "Very noisy"
      ],
      [
       "**Memory**",
       "Highest",
       "Moderate",
       "Lowest"
      ],
      [
       "**Speed**",
       "Slowest per epoch",
       "Best throughput",
       "Fast updates"
      ],
      [
       "**GPU utilization**",
       "High",
       "Optimal",
       "Poor"
      ]
     ]
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# PyTorch DataLoader handles batching\nfrom torch.utils.data import DataLoader, TensorDataset\n\ndataset = TensorDataset(X_train, y_train)\n\n# Mini-batch (most common)\nloader = DataLoader(dataset, batch_size=64, shuffle=True)\n\nfor epoch in range(num_epochs):\n    for batch_X, batch_y in loader:\n        pred = model(batch_X)\n        loss = loss_fn(pred, batch_y)\n        optimizer.zero_grad()\n        loss.backward()\n        optimizer.step()"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "6",
   "q": "How do you handle class imbalance?",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from sklearn.utils.class_weight import compute_class_weight\nfrom imblearn.over_sampling import SMOTE\nfrom imblearn.under_sampling import RandomUnderSampler\nimport numpy as np\n\n# Method 1: Class weights\nweights = compute_class_weight('balanced', classes=np.unique(y), y=y)\nmodel = LogisticRegression(class_weight='balanced')\n\n# Method 2: SMOTE (Synthetic Minority Over-sampling)\nsmote = SMOTE(random_state=42)\nX_resampled, y_resampled = smote.fit_resample(X_train, y_train)\n\n# Method 3: Threshold tuning\nfrom sklearn.metrics import precision_recall_curve\n\ny_probs = model.predict_proba(X_test)[:, 1]\nprecisions, recalls, thresholds = precision_recall_curve(y_test, y_probs)\n# Choose threshold that optimizes F1 or business metric\n\n# Method 4: Focal Loss (for deep learning)\nclass FocalLoss(nn.Module):\n    def __init__(self, alpha=0.25, gamma=2.0):\n        super().__init__()\n        self.alpha = alpha\n        self.gamma = gamma\n\n    def forward(self, inputs, targets):\n        bce = nn.functional.binary_cross_entropy_with_logits(\n            inputs, targets, reduction='none'\n        )\n        pt = torch.exp(-bce)\n        focal = self.alpha * (1 - pt) ** self.gamma * bce\n        return focal.mean()"
    },
    {
     "t": "table",
     "head": [
      "Method",
      "Best When",
      "Limitation"
     ],
     "rows": [
      [
       "Class weights",
       "Moderate imbalance",
       "Can increase variance"
      ],
      [
       "SMOTE",
       "Tabular data",
       "Creates synthetic noise"
      ],
      [
       "Undersampling",
       "Huge majority class",
       "Loses information"
      ],
      [
       "Focal loss",
       "Deep learning, detection",
       "Needs tuning Î±, Î³"
      ],
      [
       "Threshold tuning",
       "High precision OR recall needed",
       "Metric-specific"
      ]
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "7",
   "q": "Linked List vs Array, Stack vs Queue, Hash Table (Amazon â€” ML Engineer)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Compare these fundamental data structures and their applications."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• LINKED LIST vs ARRAY â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n\n# Array (Python list): Contiguous memory\narr = [1, 2, 3, 4, 5]\narr.append(6)       # O(1) amortized\narr.insert(0, 0)    # O(n) â€” shift all elements\narr.pop()           # O(1)\narr[3]              # O(1) â€” random access\n\n# Linked List: Non-contiguous, node-based\nclass Node:\n    def __init__(self, val, next=None):\n        self.val = val\n        self.next = next\n\n# Insert at head: O(1)\n# Insert at position: O(n) traversal + O(1) insert\n# Access by index: O(n)\n# No random access!\n\n# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• STACK vs QUEUE â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n\nfrom collections import deque\n\n# Stack â€” LIFO (Last In, First Out)\nstack = []\nstack.append(1)  # push\nstack.append(2)\nstack.pop()      # 2 â€” last element\n# Use cases: undo/redo, DFS, expression evaluation, call stack\n\n# Queue â€” FIFO (First In, First Out)\nqueue = deque()\nqueue.append(1)    # enqueue (right)\nqueue.append(2)\nqueue.popleft()    # 1 â€” first element\n# Use cases: BFS, task scheduling, message queues, rate limiting\n\n# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• HASH TABLE â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n\n# Python dict: O(1) average for get/set/delete\nhash_map = {}\nhash_map['key'] = 'value'  # O(1)\nval = hash_map.get('key')  # O(1)\ndel hash_map['key']        # O(1)\n\n# Hash collisions: chaining (linked list) or open addressing (probing)\n# Load factor = n_elements / n_buckets â†’ resize when > 0.75"
    },
    {
     "t": "table",
     "head": [
      "Operation",
      "Array",
      "Linked List",
      "Hash Table"
     ],
     "rows": [
      [
       "Access by index",
       "O(1)",
       "O(n)",
       "N/A"
      ],
      [
       "Search",
       "O(n)",
       "O(n)",
       "O(1) avg"
      ],
      [
       "Insert at end",
       "O(1)†",
       "O(1)‡",
       "O(1) avg"
      ],
      [
       "Insert at start",
       "O(n)",
       "O(1)",
       "N/A"
      ],
      [
       "Delete",
       "O(n)",
       "O(1)‡",
       "O(1) avg"
      ],
      [
       "Memory",
       "Compact",
       "Extra pointers",
       "Extra space"
      ]
     ]
    },
    {
     "t": "p",
     "text": "† amortized; ‡ if pointer to position is known"
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "8",
   "q": "Image IoU Calculation (PathAI â€” ML Engineer)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Calculate the Intersection over Union (IoU) for two bounding boxes or sub-images."
    },
    {
     "t": "p",
     "text": "**Solution:**"
    },
    {
     "t": "code",
     "lang": "python",
     "code": "def calculate_iou(box1, box2):\n    \"\"\"\n    Calculate IoU for two bounding boxes.\n    Each box: [x1, y1, x2, y2] (top-left, bottom-right)\n\n    IoU = Area of Intersection / Area of Union\n    \"\"\"\n    # Intersection coordinates\n    x1_inter = max(box1[0], box2[0])\n    y1_inter = max(box1[1], box2[1])\n    x2_inter = min(box1[2], box2[2])\n    y2_inter = min(box1[3], box2[3])\n\n    # Intersection area\n    inter_width = max(0, x2_inter - x1_inter)\n    inter_height = max(0, y2_inter - y1_inter)\n    intersection = inter_width * inter_height\n\n    # Union area\n    area1 = (box1[2] - box1[0]) * (box1[3] - box1[1])\n    area2 = (box2[2] - box2[0]) * (box2[3] - box2[1])\n    union = area1 + area2 - intersection\n\n    # IoU\n    return intersection / union if union > 0 else 0.0\n\n# Example\nbox1 = [100, 100, 200, 200]  # Ground truth\nbox2 = [150, 150, 250, 250]  # Prediction\n\niou = calculate_iou(box1, box2)\nprint(f\"IoU: {iou:.4f}\")  # 0.1429\n\n# For segmentation masks (pixel-level)\nimport numpy as np\n\ndef mask_iou(mask1, mask2):\n    \"\"\"IoU for binary segmentation masks.\"\"\"\n    intersection = np.logical_and(mask1, mask2).sum()\n    union = np.logical_or(mask1, mask2).sum()\n    return intersection / union if union > 0 else 0.0\n\n# Batch IoU computation (vectorized)\ndef batch_iou(boxes1, boxes2):\n    \"\"\"Compute IoU for all pairs. boxes: [N, 4]\"\"\"\n    x1 = np.maximum(boxes1[:, None, 0], boxes2[None, :, 0])\n    y1 = np.maximum(boxes1[:, None, 1], boxes2[None, :, 1])\n    x2 = np.minimum(boxes1[:, None, 2], boxes2[None, :, 2])\n    y2 = np.minimum(boxes1[:, None, 3], boxes2[None, :, 3])\n\n    inter = np.maximum(0, x2 - x1) * np.maximum(0, y2 - y1)\n\n    area1 = (boxes1[:, 2] - boxes1[:, 0]) * (boxes1[:, 3] - boxes1[:, 1])\n    area2 = (boxes2[:, 2] - boxes2[:, 0]) * (boxes2[:, 3] - boxes2[:, 1])\n\n    union = area1[:, None] + area2[None, :] - inter\n    return inter / np.maximum(union, 1e-6)"
    },
    {
     "t": "p",
     "text": "**IoU thresholds in practice:**"
    },
    {
     "t": "ul",
     "items": [
      "**IoU > 0.5** â†’ PASCAL VOC standard (moderate)",
      "**IoU > 0.75** â†’ COCO \"strict\" evaluation",
      "**mAP@[0.5:0.95]** â†’ COCO primary metric (averaged over thresholds)"
     ]
    }
   ],
   "kind": ""
  },
  {
   "t": "drill",
   "n": "9",
   "q": "Text Analytics Implementation (Cognizant â€” ML Engineer)",
   "body": [
    {
     "t": "p",
     "text": "**Question:** Implement a text analytics pipeline."
    },
    {
     "t": "code",
     "lang": "python",
     "code": "import re\nfrom collections import Counter\nfrom sklearn.feature_extraction.text import TfidfVectorizer\nfrom sklearn.naive_bayes import MultinomialNB\nfrom sklearn.pipeline import Pipeline\n\n# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• TEXT PREPROCESSING â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n\ndef preprocess_text(text):\n    \"\"\"Full text preprocessing pipeline.\"\"\"\n    # Lowercase\n    text = text.lower()\n    # Remove URLs\n    text = re.sub(r'https?://\\S+|www\\.\\S+', '', text)\n    # Remove HTML tags\n    text = re.sub(r'<.*?>', '', text)\n    # Remove special characters (keep alphanumeric + spaces)\n    text = re.sub(r'[^a-zA-Z0-9\\s]', '', text)\n    # Remove extra whitespace\n    text = re.sub(r'\\s+', ' ', text).strip()\n    return text\n\n# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• TF-IDF + CLASSIFIER â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n\npipeline = Pipeline([\n    ('tfidf', TfidfVectorizer(\n        max_features=10000,\n        ngram_range=(1, 2),\n        stop_words='english',\n        min_df=2,\n        max_df=0.95\n    )),\n    ('classifier', MultinomialNB(alpha=0.1))\n])\n\n# Train\npipeline.fit(X_train_texts, y_train)\n\n# Predict\npredictions = pipeline.predict(X_test_texts)\n\n# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• SENTIMENT WITH TRANSFORMERS â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n\nfrom transformers import pipeline as hf_pipeline\n\nsentiment = hf_pipeline(\"sentiment-analysis\")\nresult = sentiment(\"This product is amazing!\")\nprint(result)  # [{'label': 'POSITIVE', 'score': 0.9998}]"
    }
   ],
   "kind": ""
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
