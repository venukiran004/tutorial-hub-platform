/* ============================================================================
   LESSON 2.10 — A CNN from Scratch in NumPy
   Mirrors 02_CNNs.md · §11. The reference's Conv2D is run and checked against
   nn.Conv2d (exact), and the backward pass it declares but never writes is
   implemented and verified against autograd (scratchpad/dl/d210.py, d210b.py).
   ========================================================================= */
EC.receiveLesson({
  id: "2.10",

  lede: "**Writing a convolution yourself is the fastest way to stop treating `nn.Conv2d` as magic.** Fifty lines of NumPy reproduce PyTorch's forward pass to the last bit — max absolute difference 0.000e+00 — and another twenty give you gradients that match autograd to 1e-14. Along the way the parameter sharing, the receptive field and the shape arithmetic stop being facts you have read and become things you have built.",

  objectives: [
    "Implement a convolution forward pass and verify it against `nn.Conv2d`",
    "Derive and implement the three gradients a convolution needs",
    "Verify hand-written gradients against autograd",
    "Explain He initialisation as the reference specifies it",
    "Judge realistically what a framework buys over a careful NumPy implementation"
  ],

  prerequisites: ["2.9", "2.1"],

  blocks: [

    { t: "h2", n: "01", text: "The forward pass", id: "forward" },

    { t: "code", lang: "python", title: "Conv2D.forward",
      code: `class Conv2D:
    def __init__(self, in_channels, out_channels, kernel_size, stride=1, padding=0):
        self.stride, self.padding, self.k = stride, padding, kernel_size
        scale = np.sqrt(2.0 / (in_channels * kernel_size * kernel_size))   # He init
        self.W = np.random.randn(out_channels, in_channels,
                                 kernel_size, kernel_size) * scale
        self.b = np.zeros((out_channels, 1, 1))

    def forward(self, X):                       # X: (B, C_in, H, W)
        self.X = X
        B, C, H, W = X.shape
        F, C, k, _ = self.W.shape
        Xp = np.pad(X, ((0,0), (0,0), (self.padding,)*2, (self.padding,)*2)) \\
             if self.padding else X
        self.Xp = Xp
        H_out = (H + 2*self.padding - k) // self.stride + 1
        W_out = (W + 2*self.padding - k) // self.stride + 1
        out = np.zeros((B, F, H_out, W_out))

        for i in range(H_out):
            for j in range(W_out):
                hs, ws = i*self.stride, j*self.stride
                rf = Xp[:, :, hs:hs+k, ws:ws+k]           # (B, C, k, k)
                out[:, :, i, j] = np.tensordot(
                    rf, self.W, axes=([1,2,3], [1,2,3])) + self.b.squeeze()
        return out`,
      caption: "The loop runs over output *positions*, not over batch or channels — those are handled by the tensordot in one vectorised contraction." },

    { t: "callout", kind: "mental", title: "Parameter sharing is the loop body",
      body: [{ t: "p", text: "`self.W` is referenced inside the loop and never indexed by `i` or `j`. That one fact *is* parameter sharing — the same weights apply at every position, which is why a convolution has `k²·C_in·C_out` parameters regardless of image size, and why a feature detected during training at the top left is detected at test time in the bottom right. Everything lesson 2.1 said about translation equivariance is a consequence of this line." }] },

    { t: "out", text: `  output shapes   : numpy (2, 4, 8, 8)  torch (2, 4, 8, 8)
  max abs diff    : 0.000e+00
  identical       : True` },

    { t: "p", text: "**Zero difference, not merely small.** With identical weights, biases and inputs in double precision, the two implementations perform the same operations in the same order. That is the strongest possible evidence the implementation is correct." },

    { t: "h2", n: "02", text: "The backward pass the reference omits", id: "backward" },

    { t: "p", text: "The reference declares `self.dW = None` and `self.db = None` and never assigns them, so its layer cannot learn. Three gradients are needed: one for the weights, one for the bias, and one to pass back to the previous layer." },

    { t: "dl", items: [
      ["`db`", "Sum `dout` over batch and both spatial axes. The bias was added identically at every position, so every position contributes."],
      ["`dW`", "For each output position, the outer product of the incoming gradient with the receptive field that produced it, accumulated across all positions."],
      ["`dX`", "Scatter the weights back: each output position's gradient is spread over the input patch it read from, accumulated where patches overlap."]
    ] },

    { t: "code", lang: "python", title: "Conv2D.backward",
      code: `def backward(self, dout):
    B, F, H_out, W_out = dout.shape
    k, s, p = self.k, self.stride, self.padding
    self.dW = np.zeros_like(self.W)
    self.db = dout.sum(axis=(0, 2, 3)).reshape(-1, 1, 1)
    dXp = np.zeros_like(self.Xp)

    for i in range(H_out):
        for j in range(W_out):
            hs, ws = i*s, j*s
            rf = self.Xp[:, :, hs:hs+k, ws:ws+k]              # (B, C, k, k)
            g  = dout[:, :, i, j]                              # (B, F)
            self.dW += np.tensordot(g, rf, axes=([0], [0]))    # (F, C, k, k)
            dXp[:, :, hs:hs+k, ws:ws+k] += np.tensordot(g, self.W, axes=([1], [0]))

    return dXp[:, :, p:dXp.shape[2]-p, p:dXp.shape[3]-p] if p else dXp`,
      caption: "`+=` on both `dW` and `dXp` is essential — gradients accumulate across positions because the same weight was used at all of them." },

    { t: "out", text: `  dW  max abs diff: 1.066e-14  match=True
  db  max abs diff: 7.105e-15  match=True
  dX  max abs diff: 8.882e-16  match=True` },

    { t: "callout", kind: "trap", title: "Assignment instead of accumulation is the classic bug",
      body: [{ t: "p", text: "Writing `self.dW = ...` rather than `self.dW += ...` inside the loop gives you the gradient from the last output position only. The shapes are all correct, nothing raises, and the network still trains — just badly and mysteriously, since it is descending a gradient that is wrong by a factor of roughly `H_out × W_out`. The same applies to `dXp`, where overlapping receptive fields at stride 1 mean most input pixels receive contributions from `k²` output positions. This is precisely the class of bug that gradient checking against autograd exists to catch, and why the verification above is not optional." }] },

    { t: "h2", n: "03", text: "Pooling and initialisation", id: "pool-init" },

    { t: "out", text: `  shapes (2, 3, 4, 4) vs (2, 3, 4, 4), identical: True` },

    { t: "p", text: "The max pool needs no parameters and no initialisation — but it does need to remember *which* element was the max if you want its backward pass, since the gradient flows only to that element and all others receive zero. The reference gives forward only." },

    { t: "out", text: `  Conv2D(  3, 64, 3): target std 0.2722, actual 0.2631, bias all zero = True
  Conv2D( 64, 64, 3): target std 0.0589, actual 0.0589, bias all zero = True
  Conv2D(256, 64, 3): target std 0.0295, actual 0.0295, bias all zero = True` },

    { t: "p", text: "He initialisation with `fan_in = C_in · k²`: each output unit sums that many inputs, so the weight scale must shrink as the square root of the fan-in to keep activation variance stable through depth — exactly the argument from lesson 1.7, with the fan-in redefined for a convolution." },

    { t: "h2", n: "04", text: "What the framework actually buys", id: "speed" },

    { t: "out", text: `  input (8,64,32,32), 3x3 64->64  [0.30 GMAC]
    numpy loop (float64)   :     34.6 ms
    nn.Conv2d  (float32)   :      2.5 ms
    PyTorch is  13.7x faster

  input (16,128,56,56), 3x3 128->128  [7.40 GMAC]
    numpy loop (float64)   :    792.2 ms
    nn.Conv2d  (float32)   :    587.6 ms
    PyTorch is   1.3x faster` },

    { t: "callout", kind: "insight", title: "The reference's implementation is better than 'from scratch' suggests",
      body: [{ t: "p", text: "A 13.7× gap at small sizes narrowing to 1.3× at large ones is not what people expect, and the reason is that this NumPy version is already well vectorised. The Python loop runs `H_out × W_out` times — 1,024 iterations for a 32×32 output — and each iteration is a single large `tensordot` that BLAS executes efficiently across the whole batch and all channels. A genuinely naive implementation with six nested Python loops over batch, channels and kernel positions would be thousands of times slower. So the honest lesson is that the framework's advantage on CPU is real but moderate; the transformative gains come from the GPU, from fused kernels, and from autograd writing the backward pass you just spent twenty lines on." }] },

    { t: "exercise", kind: "practice", title: "Complete the library", difficulty: "advanced", minutes: 50,
      prompt: "Add the backward pass for MaxPool2D — the gradient goes only to the position that was the maximum in each window. Then add a ReLU and a Linear layer, assemble a small network, and train it on a handful of digits to confirm the loss falls. Gradient-check every layer against PyTorch autograd before training anything. Finally, implement the im2col trick: reshape the input so the convolution becomes a single matrix multiply, and measure the speedup against the loop version.",
      hints: [
        "For max pool backward, store the argmax indices during the forward pass.",
        "Gradient-check with a random upstream gradient, not a vector of ones — ones can hide errors that cancel.",
        "im2col builds a (B·H_out·W_out, C·k·k) matrix; the convolution is then that matrix times the reshaped weights."
      ],
      solution: {
        notes: [
          { t: "p", text: "Max pool backward is where routing matters: the gradient reaches exactly one input per window and every other element gets zero. If ties are possible — and with ReLU outputs, zeros make them common — decide deliberately whether to send the gradient to the first maximum or to split it, because frameworks differ and it will cause a mismatch in your gradient check that has nothing to do with a real bug." },
          { t: "p", text: "Gradient-check with random upstream gradients. Using a vector of ones is a genuine trap: several kinds of indexing error produce gradients that are wrong per-element but sum correctly, so the check passes and the bug survives. Random values break that symmetry. I verified the convolution backward this way and got agreement to around 1e-14, which is float64 round-off — anything much larger than that is a real error, not numerical noise." },
          { t: "p", text: "im2col is the trick every real implementation uses. Once the input is unfolded into a matrix, the convolution is one GEMM call, which is the single most heavily optimised routine in numerical computing. The cost is memory: at stride 1 each input pixel appears in up to `k²` rows, so the unfolded matrix is about nine times the size of the input for a 3×3 kernel. That memory-for-speed trade is why frameworks sometimes choose FFT or Winograd algorithms instead for particular kernel sizes." }
        ]
      } }

  ],

  takeaways: [
    "The NumPy forward pass matches `nn.Conv2d` with max absolute difference 0.000e+00 given identical weights.",
    "Parameter sharing is visible as `self.W` being used inside the position loop without being indexed by it.",
    "A convolution needs three gradients: `db` (sum over batch and space), `dW` (outer products accumulated), `dX` (weights scattered back).",
    "Verified against autograd: dW 1.1e-14, db 7.1e-15, dX 8.9e-16 — float64 round-off.",
    "Using `=` instead of `+=` inside the backward loop silently gives the gradient from one position only.",
    "He init uses `fan_in = C_in · k²`; biases start at zero.",
    "PyTorch is 13.7× faster at small sizes but only 1.3× at large ones — the reference's tensordot is already well vectorised."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "In the forward loop, what makes the implementation exhibit parameter sharing?",
      options: ["The padding", "`self.W` is used at every position without being indexed by i or j", "The tensordot", "The stride"],
      answer: 1,
      why: "The same weight array is applied at every output position. That is the definition of parameter sharing, and it is why a convolution's parameter count is independent of image size and why features transfer across positions — the translation equivariance from lesson 2.1 follows directly from this one property of the loop." },
    { stem: "Why must `dW` be accumulated with `+=` rather than assigned?",
      options: ["To avoid a shape error", "Because the same weights are used at every output position, so every position contributes to their gradient", "For numerical stability", "To handle the batch dimension"],
      answer: 1,
      why: "Parameter sharing in the forward pass becomes gradient accumulation in the backward pass. Assigning instead of accumulating keeps only the last position's contribution — no error is raised, shapes stay correct, and the network trains on a gradient wrong by roughly a factor of H_out × W_out." },
    { stem: "You gradient-check a layer using an upstream gradient of all ones and it passes. Is that sufficient?",
      options: ["Yes, ones are a valid gradient", "No — several indexing errors produce per-element errors that still sum correctly", "Yes, if the shapes match", "No, because ones cause overflow"],
      answer: 1,
      why: "A uniform upstream gradient is symmetric, and that symmetry can mask transposed or misrouted indices whose errors cancel in the sum. Random upstream gradients break the symmetry and expose them. With float64 you should see agreement around 1e-14; anything substantially larger is a real bug rather than round-off." },
    { stem: "Why is PyTorch only 1.3× faster than this NumPy version on a large input?",
      options: ["PyTorch is poorly optimised", "The NumPy version is already vectorised — each loop iteration is one large BLAS-backed tensordot", "The input was too small", "NumPy uses the GPU"],
      answer: 1,
      why: "The Python loop runs only over output positions; batch, channels and kernel are all handled inside a single `tensordot` that BLAS executes efficiently. A naive six-loop implementation would be thousands of times slower. The framework's decisive advantages are the GPU, fused kernels and autograd — not raw CPU arithmetic." }
  ] },

  interview: { title: "Interview", sub: "Implementation questions", questions: [
    { level: "Core", q: "Walk me through implementing a convolution forward pass.",
      strong: "Pad, compute output dimensions, loop over output positions, contract each receptive field against the weights.",
      answer: [{ t: "p", text: "Pad the input if needed, then compute the output size as `(H + 2p − k)/s + 1`. Loop over output positions; at each one, slice the receptive field — shape (B, C, k, k) — and contract it against the weights of shape (F, C, k, k) over the channel and both kernel axes, which gives (B, F) values for that position. Add the bias and store. The loop is over positions only; batch and channels are handled inside the contraction, which is what keeps it fast enough to be usable. The key thing to notice is that the weight array is never indexed by position — that is parameter sharing, and it is why the parameter count does not depend on image size." }] },
    { level: "Senior", q: "How do you verify a hand-written backward pass?",
      strong: "Compare against autograd with random upstream gradients, expecting agreement at float64 round-off.",
      answer: [{ t: "p", text: "Build the equivalent layer in PyTorch, copy the weights across, run both forward, then backward with the *same random* upstream gradient, and compare all three gradients. I did exactly this and got dW at 1.1e-14, db at 7.1e-15 and dX at 8.9e-16 — float64 round-off, so the implementation is right. Two details matter. Use random upstream gradients rather than ones, because a uniform gradient is symmetric and can hide indexing errors whose per-element mistakes cancel in the sum. And work in float64, so that round-off sits around 1e-15 and any real bug stands out clearly instead of hiding in float32 noise around 1e-6." }] },
    { level: "Senior", q: "Why do production frameworks use im2col rather than the loop above?",
      strong: "It turns the convolution into a single matrix multiply, the most optimised routine available, at a memory cost.",
      answer: [{ t: "p", text: "im2col unfolds every receptive field into a row, producing a (B·H_out·W_out, C·k·k) matrix; the convolution is then one GEMM against the reshaped weights. That matters because matrix multiply is the single most heavily optimised routine in numerical computing, with decades of cache-blocking and vectorisation work behind it, and on a GPU it maps directly onto tensor cores. The cost is memory — at stride 1 each input pixel is duplicated up to `k²` times, so the unfolded matrix is roughly nine times the input for a 3×3 kernel. That is why frameworks pick between im2col, FFT-based and Winograd algorithms depending on kernel size and available memory. Worth adding that the loop version isn't as bad as people assume: I measured PyTorch only 1.3× faster on a large input, because a tensordot per position is already BLAS-backed. The framework's real wins are the GPU, kernel fusion, and not having to write the backward pass at all." }] }
  ] }
});
