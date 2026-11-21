/* ============================================================================
   LESSON 2.10 — A CNN from Scratch in NumPy
   ========================================================================= */
EC.receiveLesson({
  id: "2.10",

  lede: "**Writing a convolution yourself is the fastest way to stop treating `nn.Conv2d` as magic.** Fifty lines of NumPy reproduce PyTorch's forward pass to the last bit — max absolute difference 0.000e+00 — and another twenty give you gradients that match autograd to 1e-14. Along the way the parameter sharing, the receptive field and the shape arithmetic stop being facts you have read and become things you have built.",

  objectives: [
    "Implement a convolution forward pass and verify it against `nn.Conv2d`",
    "Derive and implement the three gradients a convolution needs",
    "Verify hand-written gradients against autograd",
    "Explain He initialisation as it is usually specified",
    "Judge realistically what a framework buys over a careful NumPy implementation"
  ],

  prerequisites: ["2.9", "2.1"],

  blocks: [

    { t: "h2", n: "01", text: "The forward pass", id: "forward" },

    {"kind": "flow", "title": "A convolution from scratch: the forward pass as a loop nest", "caption": "Six nested loops — batch, output channel, output row, output column, input channel, kernel position — and the innermost line is a multiply-accumulate. Writing it once makes the shapes concrete; it is also roughly a thousand times slower than the library, which is the next section's subject.", "cols": 3, "nodes": [{"id": "b", "label": "for each image in the batch", "sub": "N", "tone": "accent"}, {"id": "o", "label": "for each output channel", "sub": "C_out", "tone": "accent"}, {"id": "p", "label": "for each output position", "sub": "H_out x W_out", "tone": "accent"}, {"id": "i", "label": "for each input channel", "sub": "C_in", "tone": "good"}, {"id": "k", "label": "for each kernel position", "sub": "k x k", "tone": "good"}, {"id": "m", "label": "out += in * weight", "sub": "the whole computation", "tone": "violet"}], "edges": [["b", "o"], ["o", "p"], ["p", "i"], ["i", "k"], ["k", "m"]], "t": "diagram", "id": "dg-2_10-01-0"},









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

    { t: "h2", n: "02", text: "The backward pass most treatments omit", id: "backward" },

    {"kind": "flow", "title": "The backward pass most treatments omit", "caption": "A convolution's backward pass is **three** computations, not one, and the third is the one that is usually skipped. The gradient with respect to the input is a convolution with the flipped kernel; the gradient with respect to the weights is a convolution of the input with the output gradient; and the bias gradient is a sum over everything but the channel axis.", "cols": 3, "nodes": [{"id": "g", "label": "dL/d(output)", "sub": "arrives from above", "tone": "violet"}, {"id": "i", "label": "dL/d(input)", "sub": "convolve with the flipped kernel", "tone": "accent"}, {"id": "w", "label": "dL/d(weights)", "sub": "convolve input with dL/d(output)", "tone": "accent"}, {"id": "b", "label": "dL/d(bias)", "sub": "sum over batch, height, width", "tone": "accent"}, {"id": "p", "label": "Pass dL/d(input) down", "sub": "to the previous layer", "tone": "good"}, {"id": "u", "label": "Use the other two to update", "sub": "this layer's parameters", "tone": "good"}], "edges": [["g", "i"], ["g", "w"], ["g", "b"], ["i", "p"], ["w", "u"], ["b", "u"]], "t": "diagram", "id": "dg-2_10-02-1"},









    { t: "p", text: "A common skeleton declares `self.dW = None` and `self.db = None` and never assigns them, so the layer cannot learn. Three gradients are needed: one for the weights, one for the bias, and one to pass back to the previous layer." },

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

    {"kind": "flow", "title": "Pooling's backward pass routes rather than spreads", "caption": "Max-pooling's backward pass sends the whole gradient to the **one** input that was the maximum and zero to the rest — which means it must have remembered which that was during the forward pass. Average pooling divides the gradient evenly, and so needs to remember nothing. That asymmetry is why max-pool layers hold an index buffer and average-pool layers do not.", "cols": 3, "nodes": [{"id": "m", "label": "Max-pool forward", "sub": "takes the largest of the window", "tone": "accent"}, {"id": "r", "label": "Remembers which it was", "sub": "an index buffer", "tone": "warn"}, {"id": "g", "label": "Backward: all to that one", "sub": "zero to the others", "tone": "good"}, {"id": "a", "label": "Average-pool forward", "sub": "the mean of the window", "tone": "accent"}, {"id": "n", "label": "Remembers nothing", "sub": "no buffer needed", "tone": "good"}, {"id": "e", "label": "Backward: divided evenly", "sub": "1/n to each", "tone": "good"}], "edges": [["m", "r"], ["r", "g"], ["a", "n"], ["n", "e"]], "t": "diagram", "id": "dg-2_10-03-2"},









    { t: "out", text: `  shapes (2, 3, 4, 4) vs (2, 3, 4, 4), identical: True` },

    { t: "p", text: "The max pool needs no parameters and no initialisation — but it does need to remember *which* element was the max if you want its backward pass, since the gradient flows only to that element and all others receive zero. Most treatments give the forward pass only." },

    { t: "out", text: `  Conv2D(  3, 64, 3): target std 0.2722, actual 0.2631, bias all zero = True
  Conv2D( 64, 64, 3): target std 0.0589, actual 0.0589, bias all zero = True
  Conv2D(256, 64, 3): target std 0.0295, actual 0.0295, bias all zero = True` },

    { t: "p", text: "He initialisation with `fan_in = C_in · k²`: each output unit sums that many inputs, so the weight scale must shrink as the square root of the fan-in to keep activation variance stable through depth — exactly the argument from lesson 1.7, with the fan-in redefined for a convolution." },

    { t: "h2", n: "04", text: "What the framework actually buys", id: "speed" },

    {"kind": "matrix", "title": "What the framework actually buys over the loop nest", "caption": "Not autograd — you can write that. The gap is in the four rows below, and it is a factor of hundreds to thousands. im2col turns the convolution into one large matrix multiply so it can reach a tuned GEMM kernel; cuDNN then picks among several algorithms per shape; and fusion removes the memory traffic between the convolution, the bias and the activation.", "cols": ["What it does", "Why the loop cannot"], "rows": ["im2col + GEMM", "cuDNN algorithm choice", "Kernel fusion", "Autograd", "Mixed precision"], "cells": [[{"text": "one big matrix multiply", "tone": "good"}, "a tuned GEMM is decades of work"], [{"text": "picks per shape", "tone": "good"}, "FFT, Winograd or direct, measured"], [{"text": "conv + bias + ReLU in one pass", "tone": "good"}, "it avoids three round trips to memory"], [{"text": "the easy part", "tone": "accent"}, "a few hundred lines; you can write it"], [{"text": "tensor cores", "tone": "good"}, "the hardware path is not reachable"]], "t": "diagram", "id": "dg-2_10-04-3"},









    { t: "out", text: `  input (8,64,32,32), 3x3 64->64  [0.30 GMAC]
    numpy loop (float64)   :     34.6 ms
    nn.Conv2d  (float32)   :      2.5 ms
    PyTorch is  13.7x faster

  input (16,128,56,56), 3x3 128->128  [7.40 GMAC]
    numpy loop (float64)   :    792.2 ms
    nn.Conv2d  (float32)   :    587.6 ms
    PyTorch is   1.3x faster` },

    { t: "callout", kind: "insight", title: "The implementation is better than 'from scratch' suggests",
      body: [{ t: "p", text: "A 13.7× gap at small sizes narrowing to 1.3× at large ones is not what people expect, and the reason is that this NumPy version is already well vectorised. The Python loop runs `H_out × W_out` times — 1,024 iterations for a 32×32 output — and each iteration is a single large `tensordot` that BLAS executes efficiently across the whole batch and all channels. A genuinely naive implementation with six nested Python loops over batch, channels and kernel positions would be thousands of times slower. So the honest lesson is that the framework's advantage on CPU is real but moderate; the transformative gains come from the GPU, from fused kernels, and from autograd writing the backward pass you just spent twenty lines on." }] },

    { t: "exercise", kind: "practice", title: "Complete the library", difficulty: "advanced", minutes: 50,
      prompt: "Add the backward pass for MaxPool2D — the gradient goes only to the position that was the maximum in each window. Then add a ReLU and a Linear layer, assemble a small network, and train it on a handful of digits to confirm the loss falls. Gradient-check every layer against PyTorch autograd before training anything. Finally, implement the im2col trick: reshape the input so the convolution becomes a single matrix multiply, and measure the speedup against the loop version.",
      requirements: [
        "Add the MaxPool2D backward pass",
        "Add ReLU and Linear layers and train a small network on digits",
        "Gradient-check every layer against autograd first",
        "Implement im2col and measure the speedup over the loop version"
      ],
      hints: [
        "For max pool backward, store the argmax indices during the forward pass.",
        "Gradient-check with a random upstream gradient, not a vector of ones — ones can hide errors that cancel.",
        "im2col builds a (B·H_out·W_out, C·k·k) matrix; the convolution is then that matrix times the reshaped weights."
      ],
      solution: {
        lang: "python", title: "solution.py",
        code: `import time
import numpy as np
import torch
from sklearn.datasets import load_digits
rng = np.random.default_rng(0)

class Conv2D:
    def __init__(self, cin, cout, k):
        self.W = rng.standard_normal((cout, cin, k, k)) * np.sqrt(2 / (cin * k * k)); self.b = np.zeros(cout); self.k = k
    def forward(self, x):                          # loop version, valid padding, stride 1
        self.x = x; N, C, H, W = x.shape; k = self.k; Ho, Wo = H - k + 1, W - k + 1
        out = np.zeros((N, self.W.shape[0], Ho, Wo))
        for i in range(Ho):
            for j in range(Wo):
                out[:, :, i, j] = np.tensordot(x[:, :, i:i+k, j:j+k], self.W, axes=([1, 2, 3], [1, 2, 3]))
        return out + self.b[None, :, None, None]
    def forward_im2col(self, x):
        self.x = x; N, C, H, W = x.shape; k = self.k; Ho, Wo = H - k + 1, W - k + 1
        cols = np.lib.stride_tricks.sliding_window_view(x, (k, k), axis=(2, 3))     # N,C,Ho,Wo,k,k
        cols = cols.transpose(0, 2, 3, 1, 4, 5).reshape(N * Ho * Wo, C * k * k)
        out = cols @ self.W.reshape(self.W.shape[0], -1).T + self.b
        return out.reshape(N, Ho, Wo, -1).transpose(0, 3, 1, 2)
    def backward(self, g):
        x, k = self.x, self.k; dx = np.zeros_like(x); self.dW = np.zeros_like(self.W); self.db = g.sum((0, 2, 3))
        for i in range(g.shape[2]):
            for j in range(g.shape[3]):
                patch = x[:, :, i:i+k, j:j+k]
                self.dW += np.tensordot(g[:, :, i, j], patch, axes=([0], [0]))
                dx[:, :, i:i+k, j:j+k] += np.tensordot(g[:, :, i, j], self.W, axes=([1], [0]))
        return dx

class MaxPool2D:                                   # 2x2, stride 2; ties route to the first maximum
    def forward(self, x):
        N, C, H, W = x.shape; xr = x.reshape(N, C, H // 2, 2, W // 2, 2).transpose(0, 1, 2, 4, 3, 5).reshape(N, C, H // 2, W // 2, 4)
        self.idx, self.shape = xr.argmax(-1), x.shape
        return xr.max(-1)
    def backward(self, g):
        N, C, H, W = self.shape; d = np.zeros((N, C, H // 2, W // 2, 4))
        np.put_along_axis(d, self.idx[..., None], g[..., None], -1)
        return d.reshape(N, C, H // 2, W // 2, 2, 2).transpose(0, 1, 2, 4, 3, 5).reshape(N, C, H, W)

class ReLU:
    def forward(self, x): self.m = x > 0; return x * self.m
    def backward(self, g): return g * self.m

class Linear:
    def __init__(self, i, o): self.W = rng.standard_normal((i, o)) * np.sqrt(2 / i); self.b = np.zeros(o)
    def forward(self, x): self.shape = x.shape; self.x = x.reshape(len(x), -1); return self.x @ self.W + self.b
    def backward(self, g): self.dW, self.db = self.x.T @ g, g.sum(0); return (g @ self.W.T).reshape(self.shape)

# Gradient checks against autograd, with a RANDOM upstream gradient
def check(name, layer, x, torch_fn):
    up = rng.standard_normal(layer.forward(x).shape)
    dx = layer.backward(up)
    xt = torch.tensor(x, requires_grad=True); (torch_fn(xt) * torch.tensor(up)).sum().backward()
    print(f"{name:<10} max |dx - autograd| = {np.abs(dx - xt.grad.numpy()).max():.1e}")
x = rng.standard_normal((2, 3, 8, 8))
conv = Conv2D(3, 4, 3)
check("Conv2D", conv, x, lambda t: torch.nn.functional.conv2d(t, torch.tensor(conv.W), torch.tensor(conv.b)))
check("MaxPool2D", MaxPool2D(), x, lambda t: torch.nn.functional.max_pool2d(t, 2))
check("ReLU", ReLU(), x, torch.relu)
lin = Linear(192, 5)
check("Linear", lin, x, lambda t: t.reshape(2, -1) @ torch.tensor(lin.W) + torch.tensor(lin.b))

# Train conv -> relu -> pool -> linear on 8x8 digits
X, y = load_digits(return_X_y=True); X = (X / 16.0).reshape(-1, 1, 8, 8)
net = [Conv2D(1, 8, 3), ReLU(), MaxPool2D(), Linear(8 * 3 * 3, 10)]
for epoch in range(6):
    perm = rng.permutation(1500); tot = 0
    for s in range(0, 1500, 50):
        xb, yb = X[perm[s:s+50]], y[perm[s:s+50]]
        h = xb
        for L in net: h = L.forward(h)
        p = np.exp(h - h.max(1, keepdims=True)); p /= p.sum(1, keepdims=True)
        tot += -np.log(p[np.arange(len(yb)), yb]).sum()
        g = p; g[np.arange(len(yb)), yb] -= 1; g /= len(yb)
        for L in reversed(net): g = L.backward(g)
        for L in net:
            if hasattr(L, "dW"): L.W -= 0.1 * L.dW; L.b -= 0.1 * L.db
    print(f"epoch {epoch}: mean loss {tot / 1500:.3f}")
h = X[1500:]
for L in net: h = L.forward(h)
print(f"held-out accuracy: {(h.argmax(1) == y[1500:]).mean():.3f}")

big = rng.standard_normal((16, 16, 32, 32)); c = Conv2D(16, 32, 3)
t0 = time.perf_counter(); a = c.forward(big); t1 = time.perf_counter(); b = c.forward_im2col(big); t2 = time.perf_counter()
print(f"\\nloop {1000 * (t1 - t0):.0f} ms   im2col {1000 * (t2 - t1):.0f} ms   speed-up {(t1 - t0) / (t2 - t1):.1f}x   max diff {np.abs(a - b).max():.1e}")`,
        out: `Conv2D     max |dx - autograd| = 8.9e-16
MaxPool2D  max |dx - autograd| = 0.0e+00
ReLU       max |dx - autograd| = 0.0e+00
Linear     max |dx - autograd| = 1.4e-16
epoch 0: mean loss 2.055
epoch 1: mean loss 1.244
epoch 2: mean loss 0.759
epoch 3: mean loss 0.521
epoch 4: mean loss 0.408
epoch 5: mean loss 0.331
held-out accuracy: 0.791

loop 23 ms   im2col 13 ms   speed-up 1.8x   max diff 6.2e-15`,
       
        notes: [
          { t: "p", text: "Max pool backward is where routing matters: the gradient reaches exactly one input per window and every other element gets zero. If ties are possible — and with ReLU outputs, zeros make them common — decide deliberately whether to send the gradient to the first maximum or to split it, because frameworks differ and it will cause a mismatch in your gradient check that has nothing to do with a real bug." },
          { t: "p", text: "Gradient-check with random upstream gradients. Using a vector of ones is a genuine trap: several kinds of indexing error produce gradients that are wrong per-element but sum correctly, so the check passes and the bug survives. Random values break that symmetry. I verified the convolution backward this way and got agreement to around 1e-14, which is float64 round-off — anything much larger than that is a real error, not numerical noise." },
          { t: "p", text: "im2col is the trick every real implementation uses. Once the input is unfolded into a matrix, the convolution is one GEMM call, which is the single most heavily optimised routine in numerical computing. The cost is memory: at stride 1 each input pixel appears in up to `k²` rows, so the unfolded matrix is about nine times the size of the input for a 3×3 kernel. That memory-for-speed trade is why frameworks sometimes choose FFT or Winograd algorithms instead for particular kernel sizes." }
        ]
      } },

    { t: "callout", kind: "scenario", title: "Incident: a pooling layer whose gradient went everywhere",
      body: [
        { t: "p", text: "**Symptom.** A from-scratch CNN trained more slowly than its framework equivalent and its gradient check failed only on the pooling layer." },
        { t: "p", text: "**Mechanism.** The max-pool backward pass spread the gradient over every position in each window instead of sending it only to the position that was the maximum." },
        { t: "p", text: "**Fix.** The backward pass routes each window's gradient to the argmax position, and every layer is gradient-checked before training." }
      ] }
  ],

  takeaways: [
    "The NumPy forward pass matches `nn.Conv2d` with max absolute difference 0.000e+00 given identical weights.",
    "Parameter sharing is visible as `self.W` being used inside the position loop without being indexed by it.",
    "A convolution needs three gradients: `db` (sum over batch and space), `dW` (outer products accumulated), `dX` (weights scattered back).",
    "Verified against autograd: dW 1.1e-14, db 7.1e-15, dX 8.9e-16 — float64 round-off.",
    "Using `=` instead of `+=` inside the backward loop silently gives the gradient from one position only.",
    "He init uses `fan_in = C_in · k²`; biases start at zero.",
    "PyTorch is 13.7× faster at small sizes but only 1.3× at large ones — the tensordot is already well vectorised."
  ],

  quiz: { title: "Check your understanding", questions: [
    { stem: "In the forward loop, what makes the implementation exhibit parameter sharing?",
      options: ["The padding on the input", "W reused at every position", "The single tensordot call", "The stride between steps"],
      answer: 1,
      why: "The same weight array is applied at every output position. That is the definition of parameter sharing, and it is why a convolution's parameter count is independent of image size and why features transfer across positions — the translation equivariance from lesson 2.1 follows directly from this one property of the loop." },
    { stem: "Why must `dW` be accumulated with `+=` rather than assigned?",
      options: ["To avoid a shape error", "Every position contributes to dW", "For numerical stability", "To handle the batch dimension"],
      answer: 1,
      why: "Parameter sharing in the forward pass becomes gradient accumulation in the backward pass. Assigning instead of accumulating keeps only the last position's contribution — no error is raised, shapes stay correct, and the network trains on a gradient wrong by roughly a factor of H_out × W_out." },
    { stem: "You gradient-check a layer using an upstream gradient of all ones and it passes. Is that sufficient?",
      options: ["Yes, ones are a valid gradient", "No: errors can cancel in the sum", "Yes, if the shapes match", "No, ones cause overflow"],
      answer: 1,
      why: "A uniform upstream gradient is symmetric, and that symmetry can mask transposed or misrouted indices whose errors cancel in the sum. Random upstream gradients break the symmetry and expose them. With float64 you should see agreement around 1e-14; anything substantially larger is a real bug rather than round-off." },
    { stem: "Why is PyTorch only 1.3× faster than this NumPy version on a large input?",
      options: ["PyTorch is poorly optimised", "NumPy is already vectorised", "The input was too small", "NumPy uses the GPU"],
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
