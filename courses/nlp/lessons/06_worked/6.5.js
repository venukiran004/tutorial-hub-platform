/* ============================================================================
   LESSON 6.5 — The Encoder, Traced
   Mirrors 02c_Transformer_Translation_Step_by_Step.md · §0-2. The encoder
   half of a translation model, computed on real numbers; its output becomes
   the memory every decoder step reads (scratchpad/nlp/n65.py).
   ========================================================================= */
EC.receiveLesson({
  id: "6.5",

  lede: "**The encoder runs once for the whole translation, and its three output vectors are then read by every decoder step, at every layer, for every generated token.** That asymmetry is the defining property of an encoder-decoder model and the reason translation quality holds up: the source is read completely and bidirectionally before a single output word is chosen. This lesson traces the encoder half of a toy English-to-German model — *\"I love AI\"* — with every number computed.",

  objectives: [
    "Set up an encoder-decoder toy model and read its two vocabularies",
    "Trace the encoder's self-attention on real numbers",
    "Explain why encoder attention is bidirectional and unmasked",
    "Produce the encoder memory and say exactly what consumes it",
    "Explain why the encoder runs once rather than per output token"
  ],

  prerequisites: ["6.4", "4.7"],

  blocks: [

    { t: "h2", n: "01", text: "The task and the toy model", id: "setup" },

    { t: "out", text:
"translate  \"I love AI\"  ->  \"ich liebe KI\"\n\n  d_model = 4, one head, one encoder block, one decoder block\n\n  source embeddings          target embeddings\n    I     [ 1, 0,  1,  0]      <bos>   [ 0.0,  0.0,  0.5,  0.5]\n    love  [ 0, 1,  0,  1]      <eos>   [-0.5, -0.5,  0.0,  0.0]\n    AI    [ 1, 1, -1,  0]      ich     [ 1.0,  0.0,  0.5, -0.5]\n                               liebe   [ 0.0,  1.0, -0.5,  0.5]\n                               KI      [ 1.0,  1.0,  0.0, -1.0]\n\n  target vocabulary: [<bos>, <eos>, ich, liebe, KI]" },

    { t: "callout", kind: "insight", title: "Two vocabularies, two embedding tables",
      body: [{ t: "p", text: "The source and target have **separate** embedding tables here, which is the general case — English and German are different vocabularies and a word id means different things in each. Many real translation models share a joint vocabulary across both languages, which lets them share the embedding matrix and helps when the languages have overlapping tokens, but nothing requires it. Note also that the target vocabulary contains `<bos>` and `<eos>`: the decoder needs a token to start from and a token that means *stop*, which lesson 5.1 identified as exactly what an encoder-only model lacks." }] },

    { t: "h2", n: "02", text: "Embedding and position", id: "embed" },

    { t: "out", text:
"X = source embedding + sinusoidal position\n\n  I      [1.000, 1.000,  1.000, 1.000]\n  love   [0.841, 1.540,  0.010, 2.000]\n  AI     [1.909, 0.584, -0.980, 1.000]" },

    { t: "p", text: "The same construction as lesson 6.1 — the positional encoding is identical because it depends only on position and dimension, never on the token. That is worth noticing: the *same* `PE` matrix is reused for source and target, and for every sentence the model ever sees." },

    { t: "h2", n: "03", text: "Encoder self-attention", id: "selfattn" },

    { t: "out", text:
"encoder self-attention weights\n\n           I       love    AI\n  I     [0.286   0.264   0.450]\n  love  [0.176   0.271   0.553]\n  AI    [0.237   0.437   0.326]" },

    { t: "callout", kind: "crit", title: "No zeros anywhere — encoder attention is unmasked",
      body: [{ t: "p", text: "Compare this with every attention matrix so far in the module, which had an upper triangle of exactly zero. Here **row `I` puts 0.450 on `AI`** — a token three positions to its right. The encoder is allowed to look forward because the entire source sentence exists before any processing begins; there is no future to leak. That bidirectionality is the encoder's whole advantage, and it is why *lesson 5.1's* BERT could predict a word from its right context while a causal model could not. In a translation model it matters concretely: German word order differs from English, so deciding how to render the first English word can genuinely require having read the last one." }] },

    { t: "h2", n: "04", text: "The encoder memory", id: "memory" },

    { t: "out", text:
"after self-attention, residual, LayerNorm, FFN, residual, LayerNorm\n\n  memory =\n    I      [ 0.574, 0.465, -1.727, 0.687]\n    love   [-0.178, 0.790, -1.562, 0.951]\n    AI     [ 0.751, 0.366, -1.716, 0.599]" },

    { t: "callout", kind: "insight", title: "One tensor, read by everything downstream",
      body: [{ t: "p", text: "This 3×4 tensor is the **entire** representation of the English sentence that the decoder will ever see. It is computed once. Every decoder layer, at every generation step, for every output token, projects *this same tensor* into keys and values for cross-attention. The decoder never sees the source tokens, the source embeddings or any intermediate encoder state — only this. Two consequences follow. Cross-attention is cheap after the first step, because `memory @ W_K` and `memory @ W_V` can be computed once and cached, which is the encoder-decoder version of the KV cache from lesson 5.2. And anything the encoder failed to represent is unrecoverable, no matter how good the decoder is." }] },

    { t: "h2", n: "05", text: "Why the encoder runs once", id: "once" },

    { t: "diagram", kind: "flow", title: "Encoder once, decoder per token", cols: 3,
      nodes: [
        { id: "s", text: "Source: I love AI", tone: "accent" },
        { id: "e", text: "Encoder block — runs ONCE", tone: "teal" },
        { id: "m", text: "memory (3 x 4) — fixed for the whole translation", tone: "teal" },
        { id: "d1", text: "Decoder step 1: <bos> -> ich", tone: "violet" },
        { id: "d2", text: "Decoder step 2: <bos> ich -> liebe", tone: "violet" },
        { id: "d3", text: "Decoder step 3: <bos> ich liebe -> KI", tone: "violet" }
      ],
      edges: [["s","e"],["e","m"],["m","d1"],["m","d2"],["m","d3"]] },

    { t: "p", text: "The source does not change while the target is being generated, so nothing about `memory` changes either. A decoder-only model has no equivalent saving — its prompt and its output live in one sequence, so every new token extends the same context that attention must run over. This is part of why encoder-decoder models remain competitive for translation and speech, where there is a clearly distinct source." },

    { t: "h2", n: "06", text: "The block, component by component", id: "block" },

    { t: "table",
      head: ["Step", "Operation", "Shape", "What it achieves"],
      rows: [
        ["1", "Embed source tokens", "(3, 4)", "Ids to vectors"],
        ["2", "Add positional encoding", "(3, 4)", "Inject order into an order-blind mechanism"],
        ["3", "Self-attention, unmasked", "(3, 4)", "Each source token mixes in the whole sentence"],
        ["4", "Residual + LayerNorm", "(3, 4)", "Keep the token present; stabilise the scale"],
        ["5", "FFN", "(3, 4)", "Transform each token independently"],
        ["6", "Residual + LayerNorm", "(3, 4)", "The encoder memory"]
      ] },

    { t: "callout", kind: "note", title: "Two sublayers, exactly as in lesson 4.7",
      body: [{ t: "p", text: "Nothing here is specific to translation. This is the same encoder block from lesson 4.7 — two sublayers, two norms, two residuals, shape preserved throughout at (3, 4). A real model stacks six or more of these and the memory is the last one's output. The only thing that makes it an *encoder* rather than a decoder is the absence of a causal mask and the absence of a cross-attention sublayer." }] },

    { t: "exercise", title: "Trace the encoder",
      tasks: [
        "Run the reference's NumPy and confirm the memory matrix to three decimal places.",
        "Add a causal mask to the encoder's self-attention and see how the memory changes.",
        "Extend the source to four words and confirm the memory shape follows the source, not the target.",
        "Compute memory @ W_K and memory @ W_V once, and verify they are what cross-attention needs.",
        "Replace the FFN with an identity and measure how much the memory changes."
      ] }
  ],

  takeaways: [
    "Source and target have separate embedding tables here; the target vocabulary must include <bos> to start from and <eos> to stop at.",
    "The positional encoding depends only on position and dimension, so the same PE matrix serves source, target and every sentence.",
    "Encoder self-attention is unmasked — row 'I' puts 0.450 on 'AI', three positions to its right — because the whole source exists before processing.",
    "That bidirectionality matters for translation specifically, since target word order can require having read the end of the source.",
    "The encoder memory is a single (3, 4) tensor and is the entire representation of the source the decoder will ever see.",
    "It is computed once and read by every decoder layer at every generation step, so its K and V projections can be cached.",
    "Anything the encoder fails to represent is unrecoverable regardless of decoder quality.",
    "The encoder block is structurally identical to lesson 4.7's: two sublayers, two norms, two residuals, shape preserved at (3, 4) throughout."
  ],

  quiz: { title: "Check yourself", questions: [
    { stem: "Why is encoder self-attention unmasked when decoder self-attention is not?",
      options: ["Encoders are shallower", "The entire source exists before processing begins, so there is no future to leak — and bidirectional context is the encoder's advantage", "Masking would break the residual", "Encoders use a different softmax"],
      answer: 1,
      why: "Row 'I' put 0.450 on 'AI', three positions to its right. The decoder must be masked because at inference its own future genuinely does not exist yet. The source does exist, and for translation the bidirectionality is essential — target word order can require having read the end of the source before rendering its beginning." },
    { stem: "What exactly does the decoder receive from the encoder?",
      options: ["The source tokens", "One fixed tensor — the encoder memory — and nothing else", "The encoder's attention weights", "A summary vector"],
      answer: 1,
      why: "The 3x4 memory is the entire representation of the source the decoder ever sees. It never sees source tokens, source embeddings or intermediate encoder states. That means anything the encoder failed to encode is unrecoverable, and it means the memory's K and V projections can be computed once and reused for every generation step." },
    { stem: "Why does the encoder run only once per translation?",
      options: ["To save memory", "The source does not change while the target is generated, so the memory is invariant across all decoder steps", "Because it is bidirectional", "It runs once per output token"],
      answer: 1,
      why: "Nothing about the source changes during generation, so nothing about its representation changes. That is a saving a decoder-only model cannot have, since its prompt and output occupy one sequence that grows with every token — which is part of why encoder-decoder models remain competitive for translation and speech." },
    { stem: "What makes this an encoder block rather than a decoder block?",
      options: ["Fewer parameters", "No causal mask and no cross-attention sublayer — otherwise it is structurally identical", "A different FFN", "It has no residual connections"],
      answer: 1,
      why: "Two sublayers, two norms, two residuals, shape preserved throughout — exactly the block from lesson 4.7. A decoder block adds a third sublayer for cross-attention and masks its self-attention, which is why lesson 4.7 measured it at 1.33x the encoder's parameters." }
  ] },

  interview: { title: "Interview", sub: "Encoder-decoder structure", questions: [
    { level: "Core", q: "What does an encoder produce, and who consumes it?",
      strong: "One fixed tensor of contextualised source vectors, read by every decoder layer at every step.",
      answer: [{ t: "p", text: "The encoder produces one tensor — one contextualised vector per source token — and that's the complete representation of the source that the decoder will ever see. In the toy model I traced it was a 3 by 4 matrix for a three-word English sentence. The decoder never sees the source tokens, the source embeddings, or any intermediate encoder state; it only projects that memory tensor into keys and values for cross-attention. Two consequences matter practically. First, the encoder runs once per translation, not once per output token, because the source doesn't change while the target is being generated — so the memory's K and V projections can be computed once and reused for every decoder step, which is the encoder-decoder analogue of a KV cache. Second, and more importantly, anything the encoder fails to represent is unrecoverable. A perfect decoder can't retrieve information the encoder discarded. That's why encoder quality matters disproportionately, and it's an argument for the encoder being bidirectional — it gets to read the whole source before committing to a representation, which a causal model can't do." }] },
    { level: "Senior", q: "Why has encoder-decoder survived for translation when decoder-only won everywhere else?",
      strong: "A distinct source benefits from a full bidirectional read, and the encoder runs once.",
      answer: [{ t: "p", text: "Because translation has a structure that suits the architecture: a clearly distinct source that is complete before any output begins. Two advantages follow. The encoder reads it bidirectionally, so the representation of the first word can depend on the last — which matters in translation specifically, because word order differs between languages and rendering the beginning of a German sentence can require having read the end of the English one. A decoder-only model processing the prompt causally doesn't get that; its representation of an early prompt token never sees later ones. And the encoder runs once, so its cost is amortised across the whole generation rather than paid per token. A decoder-only model's prompt and output share one sequence that grows with every token generated. Where decoder-only wins is generality — one stack, one objective, in-context learning, and everything composes. But for a fixed input-to-output transformation with a distinct source, the encoder-decoder shape is genuinely better matched, which is why Whisper is encoder-decoder for speech and why dedicated translation models often still are. The honest summary is that decoder-only won the general-purpose model, not every task." }] },
    { level: "Senior", q: "You are debugging a translation model that drops content from long source sentences. Where do you look?",
      strong: "The encoder and the cross-attention alignment — the decoder can only use what the encoder kept.",
      answer: [{ t: "p", text: "I'd look at the encoder side first, because the decoder can only use what the memory contains. The specific artefact to inspect is the cross-attention matrix, which is target length by source length — an alignment map showing which source positions each output token drew from. If content is being dropped, the usual signature is source positions that receive essentially no attention from any output token across the whole generation. Those are the parts the decoder never consulted. That tells you where to look but not why, so then I'd separate two causes. Either the decoder isn't attending to those positions even though the encoder represented them — a decoder or alignment problem, and things like coverage penalties exist precisely for this. Or the encoder didn't represent them usefully in the first place, which I'd probe by checking whether the memory vectors for those positions are distinguishable from each other at all, or whether they've collapsed toward a common value. I'd also check length: if the model was trained mostly on short sentences, long ones are out of distribution for both the positional encoding and the attention patterns, and the failure may be a length-generalisation problem rather than a content one. Cross-attention being a rectangular, inspectable matrix is the biggest debugging advantage an encoder-decoder model has over a decoder-only one." }] }
  ] }
});
