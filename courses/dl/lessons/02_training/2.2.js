/* ============================================================================
   LESSON 2.2 — PyTorch: Tensors, Autograd, Modules and Data
   ========================================================================= */
EC.receiveLesson({
  id: "2.2",

  lede: "**PyTorch is four contracts: a tensor that broadcasts and shares memory, an autograd that records what you did and differentiates it, a Module that owns parameters and knows how to save them, and a Dataset/DataLoader pair that turns anything into batches.** Each contract has two or three rules that cause every bug when broken — a view that aliases, a gradient that accumulates, a dropout left on at inference, a collate that cannot stack. This lesson states the rules, runs each one, and ends with the house-price project: a network that reaches an RMSE of 0.53 on 20,640 Californian districts, against 0.73 for a linear model and 0.46 for gradient boosting.",

  objectives: [
    "Use tensor creation, views, broadcasting, dtype promotion, in-place ops and einsum with their semantics verified",
    "Explain requires_grad, .grad accumulation, detach, no_grad, retain_graph, higher-order gradients and custom autograd Functions",
    "Write an nn.Module, count and freeze parameters, save and load a state_dict, use hooks and apply for initialisation",
    "Build a Dataset and a collate function for variable-length data, and know when a DataLoader is the wrong tool",
    "Train a regression network end to end on real data with a validation-selected checkpoint, against the baselines that must be beaten"
  ],

  prerequisites: ["2.1"],

  blocks: [

    { t: "h2", n: "01", text: "Tensors", id: "tensors" },

    { t: "code", lang: "python", title: "Shapes, views, broadcasting (executed; torch 2.10, CPU)",
      code: `a = torch.arange(6.).reshape(2, 3)            # [[0,1,2],[3,4,5]]  shape (2, 3)  dtype float32
a.view(3, 2).data_ptr() == a.data_ptr()       # True  -- a view shares memory; reshape may copy if it must
a.T.contiguous().data_ptr() != a.data_ptr()   # True  -- a transpose is a view; .contiguous() copies

a + torch.tensor([10., 20., 30.])             # (2,3) + (3,)   -> [[10,21,32],[13,24,35]]   trailing dims align
a * torch.tensor([[1.], [2.]])                # (2,3) * (2,1)  -> [[0,1,2],[6,8,10]]        a size-1 dim stretches
a + torch.ones(2)                             # (2,3) + (2,)   -> RuntimeError: size of tensor a (3) must match b (2)

a.sum(0)  -> [3, 5, 7]     a.sum(1) -> [3, 12]     a.sum(1, keepdim=True).shape -> (2, 1)
n = a.numpy(); n[0, 0] = 99.                  # a[0, 0] is now 99: numpy() shares memory with a CPU tensor
torch.tensor([1, 2]) / 2                      # float32 -- true division promotes
torch.ones(1) * torch.ones(1, dtype=float64)  # float64 -- the wider type wins
t.add_(1)                                     # trailing underscore = in place; forbidden on tensors autograd needs`,
      caption: "Broadcasting aligns shapes from the right and stretches size-1 dimensions; a mismatch on any aligned dimension is an error, which is why (2, 3) + (2,) fails and (2, 3) + (2, 1) works. Views share storage, so an in-place edit through a view or a NumPy alias changes the original." },

    { t: "code", lang: "python", title: "einsum: index notation for any contraction (executed)",
      code: `torch.einsum("bi,ij->bj", x, W)          == x @ W                       # batched matrix product
torch.einsum("bqd,bkd->bqk", Q, K)       == Q @ K.transpose(-1, -2)     # attention scores, shape (2, 4, 6)
torch.einsum("bqk,bkv->bqv", A, V)       == A @ V                       # attention output
torch.einsum("ii", M)                     # trace;      "i,j->ij" outer product;   "bi,ij,bj->b" a bilinear form per row`,
      caption: "Every letter is an index; repeated letters are summed; the letters after -> are what survives. Attention (5.1) is two einsums, and the exercise verifies both against the matmul form." },

    { t: "dl", items: [
      ["Device", "tensor.to('cuda') moves data; a model.to(device) moves its parameters. Every tensor in an operation must be on the same device. cuda.is_available() is False here; the code is identical either way, which is the point."],
      ["dtype", "float32 by default; float64 for gradient checks; float16/bfloat16 for mixed precision (2.5); int64 for class indices and embeddings. CrossEntropyLoss wants int64 targets and float logits."],
      ["Useful calls", "stack (new dim) against cat (existing dim); squeeze/unsqueeze; argmax, topk, where, clamp; .item() for a Python scalar; .tolist() for nested lists; .detach().cpu().numpy() to leave the graph and the device."]
    ] },

    { t: "h2", n: "02", text: "Autograd", id: "autograd" },

    { t: "code", lang: "python", title: "The rules of the graph (executed)",
      code: `w = torch.tensor(3.0, requires_grad=True); x = torch.tensor(2.0)
y = w**2 * x + 1;  y.backward();  w.grad            # 12.0  = 2wx
w.grad = None                                        # or optimizer.zero_grad(): .grad accumulates otherwise (1.4)

g,  = torch.autograd.grad(w**3, w, create_graph=True)   # 27  -- create_graph keeps the graph of the gradient
g2, = torch.autograd.grad(g, w)                           # 18  -- so you can differentiate it again

z = w * 2
z.requires_grad, z.detach().requires_grad        # True, False  -- detach() returns a tensor cut from the graph
with torch.no_grad(): q = w * 2                  # q.requires_grad False: nothing recorded; use for inference
y = w * 2; y.backward(); y.backward()            # RuntimeError: trying to backward through the graph a second time
                                                 #   -- buffers are freed after backward; retain_graph=True keeps them
w.is_leaf, (w*2).is_leaf, (w*2).grad_fn          # True, False, MulBackward0  -- only leaves get .grad by default`,
      caption: "Three of these are the source of most autograd bugs: forgetting to zero .grad; calling .numpy() or .item() on something that still needs a gradient (detach first); and computing a validation loss without no_grad, which builds a graph nobody frees." },

    { t: "code", lang: "python", title: "A custom autograd Function (executed)",
      code: `class MyReLU(torch.autograd.Function):
    @staticmethod
    def forward(ctx, x):  ctx.save_for_backward(x); return x.clamp(min=0)
    @staticmethod
    def backward(ctx, g):  x, = ctx.saved_tensors; return g * (x > 0)

x = torch.tensor([-1., 2., 3.], requires_grad=True)
MyReLU.apply(x).sum().backward();  x.grad          # [0, 1, 1]
torch.autograd.gradcheck(LeakyReLU01.apply, (x64,))  # True  -- the finite-difference check of 1.4, built in`,
      caption: "A Function is the unit autograd is made of — every built-in operator is one. You write your own when an operation has no autograd support or when a numerically better backward exists than the one autograd would compose. gradcheck is the same central-difference test you wrote in 1.4." },

    { t: "h2", n: "03", text: "nn.Module", id: "module" },

    { t: "code", lang: "python", title: "A module and its contract (executed)",
      code: `class MLP(nn.Module):
    def __init__(self, d_in, h, d_out, p=0.1):
        super().__init__()
        self.net = nn.Sequential(nn.Linear(d_in, h), nn.ReLU(), nn.Dropout(p), nn.Linear(h, d_out))
    def forward(self, x):  return self.net(x)

m = MLP(8, 32, 1)
named_parameters:  net.0.weight (32, 8)   net.0.bias (32,)   net.3.weight (1, 32)   net.3.bias (1,)      -- 321 parameters
state_dict keys:   the same four -- and buffers such as BatchNorm's running statistics, which are not parameters

torch.save(m.state_dict(), path);  m2.load_state_dict(torch.load(path))   -> identical outputs: True
m.train():  two calls on the same input equal?  False      (dropout)
m.eval():   two calls equal?                    True

hook = m.net[1].register_forward_hook(lambda mod, inp, out: feats.__setitem__("relu", out.detach()))
m(x); hook.remove()             -> captured hidden activations of shape (3, 32), 46 % of units active

m.apply(init_fn)                -> first-layer weight std 0.511, expected sqrt(2/8) = 0.5     (He init via apply)
for p in m.net[0].parameters(): p.requires_grad = False     -> trainable parameters 33 (of 321)`,
      caption: "Save the state_dict, not the module: it is a plain dict of tensors that survives refactors of the class. Hooks are how you read intermediate activations without editing forward — Grad-CAM (3.7) and feature extraction (7.1) are hooks. Freezing is requires_grad = False on the parameters, and the optimiser should be built from the trainable ones." },

    { t: "dl", items: [
      ["Parameters vs buffers", "nn.Parameter is learned and appears in parameters(); register_buffer holds state that is saved but not trained (running statistics, positional encodings). Both move with .to(device)."],
      ["Submodules", "Assigning a Module as an attribute registers it; nn.ModuleList and nn.ModuleDict register lists and dicts. A plain Python list of modules is invisible to parameters() — a classic silent bug."],
      ["train() / eval()", "Recursive flags on every submodule. Dropout and BatchNorm read it (1.6, 1.7); nothing else does, so forgetting it in a model without them is harmless, and in a model with them it is 2.4's most common failure."],
      ["Reproducibility", "torch.manual_seed(s) at the start (plus numpy and random if used); the same seed twice gave identical weights after twenty steps and different seeds did not. Full determinism on a GPU additionally needs torch.use_deterministic_algorithms(True) and a cuBLAS workspace setting; some ops have no deterministic kernel."]
    ] },

    { t: "h2", n: "04", text: "Dataset, DataLoader, collate", id: "data" },

    { t: "code", lang: "python", title: "Variable-length sequences: a Dataset and a collate function (executed)",
      code: `class SeqDataset(Dataset):
    def __len__(self):  return len(self.seqs)
    def __getitem__(self, i):  return self.seqs[i], self.y[i]          # one example, any Python objects

def collate(batch):                                                     # list of examples -> one batch
    seqs, ys = zip(*batch)
    lengths = torch.tensor([len(s) for s in seqs]); T = lengths.max()
    padded = torch.zeros(len(seqs), T, dtype=torch.long)
    for i, s in enumerate(seqs): padded[i, :len(s)] = s
    return padded, lengths, torch.stack(ys)

DataLoader(ds, batch_size=4, shuffle=True, collate_fn=collate)
-> padded (4, 6), lengths [4, 6, 4, 3]
   [[18, 9, 7, 17, 0, 0],
    [ 8, 7, 16, 14, 8, 14], ...]`,
      caption: "The default collate stacks tensors of equal shape; anything else — sequences, images of different sizes, dicts — needs a collate function that decides how to pad and what to return. The lengths travel with the batch so that packing and masking (4.5) can ignore the zeros." },

    { t: "code", lang: "text", title: "When a DataLoader is the wrong tool (executed)",
      code: `DataLoader over 20,000 in-memory rows, batch 32:    625 batches in 0.18 s
DataLoader, batch 256:                              79 batches in 0.17 s
manual permutation + tensor slicing, batch 32:                  0.011 s     -- 16× faster`,
      caption: "A DataLoader calls __getitem__ once per example and collates; for tensors already in memory that is pure overhead, and every module-1 experiment used slicing instead. The DataLoader earns its cost when examples are loaded from disk, decoded, augmented, or produced by num_workers > 0 processes in parallel with the GPU — module 3's image pipeline." },

    { t: "h2", n: "05", text: "The house-price project", id: "project" },

    { t: "p", text: "The reference's first project: predict house prices with a network. California housing — 20,640 census districts, eight numeric features (median income, house age, rooms, bedrooms, population, occupancy, latitude, longitude), target the median value in units of $100,000, capped at 5.0. Split 80/20, standardise on the training split, and establish the baselines first, as lesson 1.1 insists:" },

    { t: "code", lang: "text", title: "Baselines, then the network (executed)",
      code: `predict the training mean      RMSE 1.1421
linear regression              RMSE 0.7273
HistGradientBoosting           RMSE 0.4595

MLP 8-128-128-1, AdamW 1e-3 (wd 1e-4), cosine over 60 epochs, batch 128, 2,000 rows held out for validation:
  epoch  1  val RMSE 0.7316        epoch 20  0.5108
  epoch  5           0.5629        epoch 40  0.4895
  epoch 10           0.5280        epoch 60  0.4881
best validation at epoch 52  ->  test RMSE 0.5285           (26 s)
same network with Huber loss  ->  test RMSE 0.5225, MAE 0.3516`,
      caption: "The network beats the linear model by twenty points of RMSE and loses to gradient boosting by seven: the tabular verdict of lesson 1.1, on a real dataset. Huber helps slightly because the capped target at 5.0 creates a cluster of residuals the squared loss over-weights. The exercise adds a log target and three ratio features and closes the gap to 0.5175 — still behind the trees." },

    { t: "code", lang: "python", title: "The loop with a validation-selected checkpoint",
      code: `best = (float("inf"), None)
for ep in range(60):
    net.train(); perm = torch.randperm(len(Xtr))
    for i in range(0, len(Xtr), 128):
        idx = perm[i:i+128]
        opt.zero_grad(); F.mse_loss(net(Xtr[idx]), ytr[idx]).backward(); opt.step()
    sched.step()
    net.eval()
    with torch.no_grad(): v = F.mse_loss(net(Xval), yval).sqrt().item()
    if v < best[0]: best = (v, {k: t.clone() for k, t in net.state_dict().items()})
net.load_state_dict(best[1])          # the weights from the best validation epoch, not the last`,
      caption: "Six things, each of which has a lesson behind it: zero_grad (1.4), the scheduler stepped once per epoch (1.8), eval() and no_grad() for validation (1.6, this lesson), cloning the state_dict (a reference would follow the live weights), and loading the best rather than the last (1.7). The test set is touched once, after the loop." },

    { t: "table", head: ["Rule", "Break it and you get"],
      rows: [
        ["Zero the gradients each step", "An effective learning rate that grows with the step count (1.4)"],
        ["Validate under eval() and no_grad()", "Dropout noise in the metric, BatchNorm using batch statistics, and a graph that eats memory"],
        ["Detach before .numpy()/.item() on graph tensors", "RuntimeError, or a graph kept alive by a logged loss tensor (log loss.item(), never loss)"],
        ["Register submodules in ModuleList, not a list", "Parameters invisible to the optimiser and to state_dict — the layer never trains and never saves"],
        ["Build the optimiser from trainable parameters after freezing", "Frozen parameters still receive weight decay from AdamW, which shrinks them"],
        ["Same device, same dtype", "RuntimeError on the first forward; the usual culprit is a target tensor left on the CPU or an int target for MSE"],
        ["Seed everything, and know a GPU is not deterministic by default", "Runs that differ by a few tenths and cannot be compared"]
      ] },

    { t: "quiz",
      inline: true,
      title: "Quick check",
      questions: [
        {
          stem: "You log the training loss with losses.append(loss) inside the loop and memory grows every step. Why?",
          options: [
            "Python lists are slow",
            "Each loss tensor holds a reference to the whole autograd graph that produced it, so appending the tensor keeps every step's graph alive; append loss.item() (or loss.detach()) instead",
            "The DataLoader is caching batches",
            "The optimiser stores the losses"
          ],
          answer: 1,
          why: "A tensor with a grad_fn is the root of a graph; keeping it keeps the graph and every saved activation in it. .item() returns a Python float and releases the reference, which is why every loop in this course logs .item()."
        },
        {
          stem: "a.view(3, 2) shares memory with a, and a.numpy() shares memory with a. What follows for in-place edits?",
          options: [
            "Nothing; views are copies",
            "An edit through the view or the NumPy array changes the original tensor — measured: n[0, 0] = 99 made a[0, 0] = 99 — so aliased tensors must be cloned before modification if the original is still needed",
            "Views are read-only",
            "NumPy arrays cannot be edited"
          ],
          answer: 1,
          why: "Views and CPU-side NumPy conversions are zero-copy by design, which is efficient and also the reason for surprising mutations. .clone() is the copy; .contiguous() copies only when the layout requires it."
        },
        {
          stem: "The house-price MLP scored RMSE 0.5285 against 0.4595 for gradient boosting. What is the right response?",
          options: [
            "Train the network longer until it wins",
            "Report the network honestly as second: on eight engineered numeric columns the trees are the better tool, as lesson 1.1 predicted; the exercise's log target and ratio features narrow the gap to 0.5175 but do not close it",
            "The comparison is invalid because the trees were not standardised",
            "Use a larger batch size"
          ],
          answer: 1,
          why: "Baselines exist to be reported, not beaten by force. A twenty-point win over the linear model shows the network learned real non-linearity; the seven-point loss to boosting shows where the regime boundary is."
        }
      ] },

    { t: "exercise",
      kind: "Implement",
      title: "einsum attention, a checked Function, and the house-price gap",
      difficulty: "core",
      minutes: 26,
      body: [
        { t: "p", text: "**(a)** Write scaled dot-product attention as two einsums — scores 'bqd,bkd->bqk' divided by √d, softmax over k, output 'bqk,bkv->bqv' — and verify against the matmul form on random Q (2, 4, 8), K (2, 6, 8), V (2, 6, 16). Also verify 'bi,ij,bj->b' against a loop of xᵢᵀWxᵢ." },
        { t: "p", text: "**(b)** Write a custom autograd Function for a leaky ReLU with slope 0.1 and pass it through torch.autograd.gradcheck in float64." },
        { t: "p", text: "**(c)** Re-run the house-price MLP three ways — raw target; log target with the prediction exponentiated; log target plus three ratio features (rooms per household, bedrooms per room, population per household) — and report test RMSE on the original scale for each." }
      ],
      requirements: [
        "(a) two True results and the output shape.",
        "(b) gradcheck True.",
        "(c) three RMSEs next to the boosting baseline."
      ],
      hint: "(a) Softmax over the last axis of the scores; the rows of A should sum to 1. (b) gradcheck needs float64 inputs with requires_grad=True. (c) Fit the scaler on the training split only; select the checkpoint on validation MSE in log space, then exponentiate predictions before computing RMSE.",
      solution: {
        lang: "python",
        title: "Executed solution",
        code: `# (a) einsum attention == matmul attention: True   output shape (2, 4, 16)   rows of A sum to 1: True
#     bilinear form 'bi,ij,bj->b' == loop: True

# (b) torch.autograd.gradcheck on the custom Function: True

# (c) raw target, 8 features:              test RMSE 0.5285
#     log target, 8 features:              test RMSE 0.5256
#     log target, 8 + 3 ratio features:    test RMSE 0.5175
#     HistGradientBoosting (lesson):                 0.4595`,
        notes: [
          { t: "p", text: "(a) is attention before lesson 5.1 makes anything of it: two contractions and a softmax." },
          { t: "p", text: "(b) is how you make a new operator trustworthy in one line." },
          { t: "p", text: "(c) is the tabular regime again — feature engineering the trees do implicitly gains the network a point, and the trees still win." }
        ]
      }
    }
  ],

  takeaways: [
    "Tensors broadcast from the right, stretching size-1 dimensions ((2, 3) + (3,) works, + (2,) fails); views and numpy() share memory, so in-place edits propagate; dtype promotion follows the wider type; einsum expresses any contraction and attention is two of them.",
    "Autograd records operations on tensors with requires_grad; .grad accumulates (zero it), backward frees the graph (retain_graph to keep it), detach() and no_grad() leave the graph, create_graph enables second derivatives (d²w³/dw² = 18), and a custom Function with gradcheck adds an operator safely.",
    "nn.Module owns parameters (321 in the example; 33 trainable after freezing layer 0), saves them as a state_dict that survived a round trip, switches dropout with train()/eval() (two calls unequal in train mode, equal in eval), and exposes activations through hooks (46 % of units active).",
    "A Dataset returns one example, a collate function turns a list into a batch — padding variable-length sequences to (4, 6) with their lengths — and a DataLoader is 16× slower than slicing for in-memory tensors, earning its cost only for disk, decoding, augmentation or worker processes.",
    "The house-price MLP reached test RMSE 0.5285 (0.5225 with Huber) against 0.7273 for linear regression and 0.4595 for gradient boosting; with a log target and three ratio features, 0.5175. The trees win the tabular regime, as predicted.",
    "The loop's rules: zero_grad, scheduler once per epoch, eval() + no_grad() for validation, log .item() not the tensor, clone the best state_dict and load it at the end, touch the test set once."
  ],

  quiz: {
    title: "PyTorch — Knowledge Check",
    questions: [
      {
        stem: "What is the difference between detach() and no_grad()?",
        options: [
          "They are the same",
          "detach() returns a tensor cut from the graph so later operations on it are not tracked, while the original stays attached; no_grad() is a context in which no operations are recorded at all — use detach for a single tensor you want to log or feed elsewhere, no_grad for a whole inference pass",
          "no_grad() deletes the gradients",
          "detach() zeroes the gradient"
        ],
        answer: 1,
        why: "Both stop tracking; they differ in scope. A validation pass under no_grad builds no graph and uses far less memory; a target computed from the model (a teacher's output in distillation, 2.5) is detached so the gradient does not flow into it."
      },
      {
        stem: "A model stores its layers in a plain Python list, self.layers = [nn.Linear(8, 8) for _ in range(3)], and training does nothing. Why?",
        options: [
          "Lists cannot hold modules",
          "Modules in a plain list are not registered as submodules, so parameters() and state_dict() do not see them — the optimiser was built with no parameters and the checkpoint is empty; nn.ModuleList registers them",
          "The layers need a ReLU between them",
          "The learning rate is zero"
        ],
        answer: 1,
        why: "Registration happens through attribute assignment of a Module, ModuleList or ModuleDict. The symptom — a loss that never moves and a state_dict with no keys for those layers — is silent, which is why it belongs on the rules table."
      },
      {
        stem: "Why should a validation-selected checkpoint clone the state_dict rather than store a reference to it?",
        options: [
          "Cloning is faster",
          "The state_dict's tensors are the live parameters; a reference would follow every subsequent update and 'the best weights' would silently become the last weights — cloning freezes a copy at that epoch",
          "References cannot be saved",
          "There is no difference for small models"
        ],
        answer: 1,
        why: "state_dict() returns references to the module's own tensors, not copies. The project loop clones each tensor; torch.save to disk at the best epoch is the other correct approach and the one used in 2.3's checkpointing."
      },
      {
        stem: "What does a collate function do, and when do you need to write one?",
        options: [
          "It shuffles the dataset",
          "It turns the list of examples a DataLoader gathers into one batch; the default stacks equal-shaped tensors, so you write your own whenever examples differ in shape — padding sequences and returning their lengths, resizing images, or batching dicts",
          "It moves data to the GPU",
          "It applies augmentation"
        ],
        answer: 1,
        why: "The DataLoader's job is gathering and parallelism; the collate function decides what a batch is. Variable-length sequences are the canonical case, and the lengths it returns are what packing and masking need in module 4."
      },
      {
        stem: "Which is correct about reproducibility in PyTorch?",
        options: [
          "torch.manual_seed makes every run bit-identical on any hardware",
          "torch.manual_seed fixes the CPU random streams — two runs with the same seed matched exactly here — but GPU kernels can be non-deterministic unless deterministic algorithms are enabled, and some operations have no deterministic implementation",
          "Seeds are unnecessary if the data are shuffled",
          "Only NumPy needs seeding"
        ],
        answer: 1,
        why: "Reproducibility is layered: the seed controls initialisation, shuffling and dropout; determinism of the kernels is a separate switch with a speed cost. Report which you set, and compare runs across several seeds rather than trusting one."
      }
    ]
  },

  interview: {
    title: "Interview Questions — PyTorch",
    sub: "Tensor semantics, the autograd contract, the Module contract, data loading, and the project's verdict.",
    questions: [
      {
        level: "Core",
        q: "Explain how autograd works in PyTorch and the mistakes people make with it.",
        strong: "Every operation on a tensor with requires_grad=True is recorded as a node with a grad_fn; loss.backward() walks that graph in reverse applying each node's backward, accumulating results into the .grad of the leaf tensors — the parameters. Three consequences cause most bugs. Gradients accumulate, so the loop must zero them each step or the effective learning rate grows. The graph's saved buffers are freed by backward, so a second backward raises unless retain_graph=True, and a logged loss tensor keeps its whole graph alive — log loss.item(). And anything computed under no_grad or after detach() is outside the graph: validation should run under no_grad to save memory, and a tensor fed to NumPy must be detached. Beyond that, create_graph=True keeps the gradient's own graph so you can differentiate again — d²(w³)/dw² = 18 — and a custom autograd.Function with a forward and backward lets you add an operator, verified with gradcheck, which is the finite-difference test built in.",
        answer: [
          { t: "p", text: "The recording mechanism, the three consequences with their bugs, and the two advanced facilities with executed examples." }
        ]
      },
      {
        level: "Core",
        q: "What is the difference between model.parameters(), state_dict() and buffers?",
        strong: "parameters() yields the nn.Parameter tensors that the optimiser updates — the four weight and bias tensors of the small MLP, 321 numbers. state_dict() is an ordered dict of every persistent tensor by name: the parameters plus buffers such as BatchNorm's running mean and variance, which are saved and moved with the model but not trained. That is what you save and load — a plain dict that survives changes to the class — and a round trip reproduced the outputs exactly. Buffers are registered with register_buffer; parameters by assignment of an nn.Parameter or a Linear-style submodule. Two related traps: a submodule in a plain Python list is registered by neither, so it neither trains nor saves; and freezing a layer with requires_grad = False leaves it in parameters(), so the optimiser should be built from the trainable subset — measured, 33 of 321 after freezing the first layer.",
        answer: [
          { t: "p", text: "The three collections, what each is for, the round-trip check, and the two registration traps." }
        ]
      },
      {
        level: "Core",
        q: "When do you need a DataLoader and when is it overhead?",
        strong: "A DataLoader gathers examples from a Dataset's __getitem__, collates them into a batch, shuffles, and — with num_workers — does it in parallel processes so decoding and augmentation overlap with training. That is essential when each example is loaded from disk, decoded from JPEG, augmented, or varies in shape and needs a collate function: padding variable-length sequences to (batch, max_len) with their lengths is the canonical example. For tensors already in memory it is pure overhead: over 20,000 rows at batch 32 a DataLoader took 0.18 s per epoch and a permutation with tensor slicing 0.011 s, sixteen times faster. Every small experiment in this course slices; the image pipelines in module 3 use a DataLoader with workers because the transforms are the bottleneck.",
        answer: [
          { t: "p", text: "What the loader does, when each feature matters, the executed timing, and the practical split." }
        ]
      },
      {
        level: "Advanced",
        q: "Walk me through the house-price project and what you concluded.",
        strong: "California housing: 20,640 districts, eight numeric features, target the median value in $100k capped at 5. Split 80/20, standardise on the training split only. Baselines first: predicting the mean gives RMSE 1.14, linear regression 0.73, gradient boosting 0.46. Then an 8-128-128-1 MLP with AdamW at 10⁻³ and cosine annealing over sixty epochs, batch 128, 2,000 training rows held out for validation, the checkpoint chosen at the best validation epoch (52): test RMSE 0.5285, or 0.5225 with a Huber loss, which helps because the capped target produces a cluster of residuals that squared error over-weights. A log target and three ratio features — rooms per household, bedrooms per room, people per household — bring it to 0.5175. So the network beats the linear model by twenty points, showing it learned genuine non-linearity, and trails boosting by six to seven: on eight engineered columns the trees are the right tool, which lesson 1.1 predicted and the project confirms. I would ship the boosting model and keep the network as evidence of the regime boundary.",
        answer: [
          { t: "p", text: "Data, split, baselines, the network with every setting justified, the executed numbers, the feature-engineering follow-up, and the honest verdict." }
        ]
      }
    ]
  }
});
