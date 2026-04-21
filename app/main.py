from fastapi import FastAPI, Query
from fastapi.staticfiles import StaticFiles
import re
import torch
import torch.nn as nn

app = FastAPI()

vocab = [" ", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"]
embedding = nn.Embedding(len(vocab), 2)


vocab_lookup = {}
for i,c in enumerate(vocab):
    dictionary = {
        "id": i,
        "embedding": embedding(torch.tensor(i)).tolist()
    }
    vocab_lookup[c] = dictionary


def normalize(text):
    text = text.lower()
    new_text = ""
    for c in text:
        if c in vocab:
            new_text = new_text + c
        else:
            new_text = new_text + " "
    new_text = re.sub(r'\s+', ' ', new_text)
    return new_text


@app.get('/vocab')
def get_vocab():
    return vocab_lookup


@app.get('/embed_text')
def embed_text(text:str):
    embedding = []
    for c in normalize(text):
        embedding.append(vocab_lookup[c])
    return embedding






app.mount("/", StaticFiles(directory="static", html=True), name="static")