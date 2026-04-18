from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
import re
import torch
import torch.nn as nn

app = FastAPI()

vocab = [" ", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"]

char_to_id = {}
for i,c in enumerate(vocab):
    char_to_id[c] = i


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
    return vocab

@app.get('/encode')
def encode(string: str):
    encoded = []
    for c in normalize(string):
        encoded.append(char_to_id[c])
    return encoded





embedding = nn.Embedding(len(vocab), 2)

@app.post('/set_dim')
def set_dim(dim: int):
    global embedding
    embedding = nn.Embedding(len(vocab), dim)
    return {"dim": dim}

@app.get('/embed')
def embed():
    result = {}
    for id in range(len(vocab)):
        vector = embedding.weight[id]
        result[id] = vector.tolist()
    return result

@app.get('/embed_text')
def embed_text(string: str):
    text = normalize(string)
    result = []
    for c in text:
        id = char_to_id[c]
        vector = embedding.weight[id]
        result.append({"char": c, "id": id, "vector": vector.tolist()})
    return result


app.mount("/", StaticFiles(directory="static", html=True), name="static")