# Teaching Transformers in 4 Weeks — Course Plan

**Context:** Intro/intermediate deep learning course. Students are comfortable with FFNs and CNNs in PyTorch, and have worked with MNIST, FashionMNIST, and CIFAR-10. ~4 weeks remaining. Goal: give students a solid working understanding of transformers without getting mired in detail.

---

## Guiding principles

1. **Don't teach RNNs/LSTMs first just to motivate transformers.** A 10-minute "here's what came before and why it was slow" is plenty. Going deep on RNNs eats a week you don't have.
2. **Don't start with the "Attention Is All You Need" paper.** It's dense and was written for researchers who already knew seq2seq. It's a terrible first exposure.
3. **Build a tiny one from scratch in PyTorch.** Transformers feel like magic until you write `Q @ K.T / sqrt(d)` yourself. Then they feel like a surprisingly small amount of code.
4. **Use existing CIFAR-10 familiarity as a bridge.** Vision Transformers (ViT) let students compare directly to the CNN they already trained. A pedagogical win most courses miss.

---

## Week 1 — Attention, demystified

**Goal:** by the end, students understand self-attention as "each token looks at every other token and decides what to pay attention to."

- Motivation: sequence data, why CNNs/FFNs struggle with variable-length order-dependent inputs (1 short lecture segment).
- Tokens and embeddings — do this concretely with characters, not abstract "word vectors". Map `"hello"` → integer IDs → learned embedding vectors.
- Self-attention as a soft dictionary lookup: Q, K, V. Derive the `softmax(QKᵀ/√d)·V` formula slowly on the board with a tiny example (sequence length 3 or 4).
- **Hands-on:** implement a single self-attention head in PyTorch from scratch, pass a toy input through it, visualize the attention matrix as a heatmap.

---

## Week 2 — A full (tiny) transformer

**Goal:** students stack real transformer blocks and train one end-to-end.

- Multi-head attention (why multiple heads — different "relationships" in parallel).
- Positional encoding: motivate it by showing that self-attention is permutation-invariant without it. Sinusoidal vs learned — mention both, use learned (simpler).
- The rest of the block: LayerNorm, residual connections, the MLP sublayer. Emphasize residuals — they're what makes deep stacks trainable.
- **Hands-on:** build a small decoder-only (GPT-style) character-level language model on tiny Shakespeare (~1 MB text file). Train it on a laptop/Colab. Generate samples. The "it learns to spell real words, then produces Shakespeare-ish gibberish" moment is very motivating.

**Best single resource for this week:** Andrej Karpathy's YouTube video *"Let's build GPT: from scratch, in code, spelled out."* ~2 hours, builds exactly this project, clearest transformer exposition that exists. Watch it yourself first — it will probably be enough to teach the material confidently. You can assign pieces of it to students.

---

## Week 3 — Vision Transformers (the bridge to what they know)

**Goal:** connect transformers back to images, contrast with CNNs.

- How do you tokenize an image? Cut it into fixed patches (e.g. 4×4 or 8×8), flatten, linearly project. That's it — each patch is a "token."
- Add a learned positional embedding, prepend a `[CLS]` token, stack transformer blocks, classify from `[CLS]`.
- **Hands-on:** train a small ViT on CIFAR-10 and compare to the CNN they already trained. They'll find that a small ViT from scratch does *worse* than their CNN on CIFAR-10 — this is the real lesson: transformers have weaker inductive biases and need more data. This sets up next week.

---

## Week 4 — Pretraining, fine-tuning, and the modern landscape

**Goal:** students leave understanding *why* everyone uses pretrained transformers and what the big model families are.

- Concept of pretraining + fine-tuning. Why it works: transformers scale beautifully with data, but need a lot of it.
- **Hands-on:** use HuggingFace `transformers` to load a small pretrained model and fine-tune on something tiny. Two good options:
  - Fine-tune pretrained ViT on CIFAR-10 → dramatically beats the from-scratch ViT from week 3. Great payoff.
  - Or fine-tune DistilBERT on a small text classification task (e.g., SST-2 subset) if you want to expose them to NLP.
- Conceptual survey (no math): encoder-only (BERT), decoder-only (GPT), encoder-decoder (T5). One slide each. What each is good at.
- Brief gesture at where the field is now: LLMs, scaling laws, multimodal models. Keep this conceptual — you don't owe the students a complete picture, just a map.

---

## Resources (ranked by usefulness to the instructor)

1. **Karpathy, "Let's build GPT: from scratch, in code, spelled out"** (YouTube). Alone will get you teaching-ready for weeks 1–2.
2. **Jay Alammar, "The Illustrated Transformer"** (blog post). Clearest visual intuition anywhere. Great to assign to students.
3. **3Blue1Brown's attention videos** (recent, part of his neural net series). Good for the geometric intuition of Q/K/V.
4. **Karpathy's `nanoGPT` repo.** The code companion to the video. Very small, very readable.
5. *Skip for now:* The Annotated Transformer, the original paper, and anything HuggingFace-course-length. Good later, too much surface area for a 4-week unit.

---

## What to cut if you run short

If week 3 or 4 gets compressed, drop the from-scratch ViT training and just do the pretrained-ViT fine-tuning in week 4. The "patches as tokens" idea can be communicated in 15 minutes of lecture without a training run.
