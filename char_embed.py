import torch
import torch.nn as nn
import matplotlib.pyplot as plt

# --- Step 1: Load the cleaned text ---
with open("shakespeare_clean.txt", "r") as f:
    text = f.read()

print(f"Text length: {len(text):,} characters")
print(f"First 200 characters:\n{text[:200]}\n")

# --- Step 2: Build the vocabulary ---
chars = sorted(set(text))
vocab_size = len(chars)
print(f"Vocabulary size: {vocab_size}")
print(f"Vocabulary: {chars}")

# Two lookup dicts: char -> id and id -> char
char_to_id = {c: i for i, c in enumerate(chars)}
id_to_char = {i: c for i, c in enumerate(chars)}

print(f"\nchar_to_id: {char_to_id}")

# --- Step 3: Encode the whole text as a tensor of integer IDs ---
data = torch.tensor([char_to_id[c] for c in text], dtype=torch.long)
print(f"\nEncoded tensor shape: {data.shape}")
print(f"Encoded tensor dtype: {data.dtype}")
print(f"First 20 IDs: {data[:20].tolist()}")

# Sanity check: decode those IDs back to characters
decoded = "".join(id_to_char[int(i)] for i in data[:20])
print(f"Decoded back to text: '{decoded}'")

# --- Step 4: Build (input, target) training pairs ---
# The task: given a character, predict the next character.
inputs = data[:-1]
targets = data[1:]

print(f"\nNumber of training pairs: {len(inputs):,}")
print("First 10 pairs (shown as characters):")
for i in range(10):
    x = id_to_char[int(inputs[i])]
    y = id_to_char[int(targets[i])]
    print(f"  '{x}'  ->  '{y}'")

# --- Step 5: Define the model ---
# Our model is two layers applied in sequence:
#   1. An embedding: character ID -> 2D vector
#   2. A linear layer: 2D vector -> 27 scores (one per possible next character)
embed_dim = 2

model = nn.Sequential(
    nn.Embedding(vocab_size, embed_dim),
    nn.Linear(embed_dim, vocab_size),
)
print(f"\nModel:\n{model}")

# How many parameters does this model have?
n_params = sum(p.numel() for p in model.parameters())
print(f"Total parameters: {n_params}")

# --- Step 6: Try a single forward pass (no training yet) ---
sample_inputs = inputs[:5]
print(f"\nSample input IDs: {sample_inputs.tolist()}")
print(f"Sample input chars: {[id_to_char[int(i)] for i in sample_inputs]}")

logits = model(sample_inputs)
print(f"\nOutput logits shape: {logits.shape}")
print(f"Output logits (first row):\n{logits[0]}")

# --- Step 7: Loss function and optimizer ---
loss_fn = nn.CrossEntropyLoss()
optimizer = torch.optim.Adam(model.parameters(), lr=0.05)

# --- Step 8: Training loop ---
num_steps = 3000
batch_size = 1024

print("\nTraining...")
for step in range(num_steps):
    # Sample a random batch of positions from our training data
    idx = torch.randint(0, len(inputs), (batch_size,))
    batch_inputs = inputs[idx]
    batch_targets = targets[idx]

    # Forward pass: compute predictions and loss
    logits = model(batch_inputs)
    loss = loss_fn(logits, batch_targets)

    # Backward pass: compute gradients and update weights
    optimizer.zero_grad()
    loss.backward()
    optimizer.step()

    if step % 200 == 0 or step == num_steps - 1:
        print(f"  step {step:5d}  |  loss {loss.item():.4f}")

print("Done training.")

# --- Step 9: Extract the learned embeddings and plot them ---
# model[0] is the Embedding layer. Its .weight is the 27x2 lookup table.
embedding_weights = model[0].weight.detach().numpy()
print(f"\nEmbedding weights shape: {embedding_weights.shape}")

# Set up the plot
fig, ax = plt.subplots(figsize=(10, 10))

vowels = set("aeiou")
for i, char in enumerate(chars):
    x, y = embedding_weights[i]

    if char == " ":
        color = "green"
        label = "' '"
    elif char in vowels:
        color = "red"
        label = char
    else:
        color = "steelblue"
        label = char

    ax.scatter(x, y, color=color, s=200, zorder=3)
    ax.annotate(
        label,
        (x, y),
        xytext=(7, 7),
        textcoords="offset points",
        fontsize=16,
        fontweight="bold",
    )

ax.set_title("Learned 2D character embeddings (Shakespeare bigram model)", fontsize=14)
ax.set_xlabel("embedding dimension 0")
ax.set_ylabel("embedding dimension 1")
ax.grid(True, alpha=0.3)
ax.axhline(0, color="black", linewidth=0.5)
ax.axvline(0, color="black", linewidth=0.5)
plt.tight_layout()
plt.savefig("char_embeddings.png", dpi=100)
print("Saved plot to char_embeddings.png")
plt.show()
