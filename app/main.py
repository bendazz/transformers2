from fastapi import FastAPI, Query
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import re
import torch
import torch.nn as nn

app = FastAPI()

vocab = [" ", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"]
max_length = 20

embedding = nn.Embedding(len(vocab), 2)
position_embedding = nn.Embedding(max_length, 2)


vocab_lookup = {}
for i,c in enumerate(vocab):
    dictionary = {
        "id": i,
        "embedding": embedding(torch.tensor(i)).tolist()
    }
    vocab_lookup[c] = dictionary


position_lookup = {}
for i in range(max_length):
    position_lookup[i] = {
        "position": i,
        "embedding": position_embedding(torch.tensor(i)).tolist()
    }


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


@app.get('/positions')
def get_positions():
    return position_lookup


@app.get('/embed_text')
def embed_text(text:str):
    result = []
    for i, c in enumerate(normalize(text)):
        char_vec = vocab_lookup[c]["embedding"]
        pos_vec = position_lookup[i]["embedding"]

        final_vec = (torch.tensor(char_vec) + torch.tensor(pos_vec)).tolist()

        result.append({
            "id": vocab_lookup[c]["id"],
            "char_embedding": char_vec,
            "position": i,
            "position_embedding": pos_vec,
            "final_embedding": final_vec,
        })

    return {
        "text": normalize(text),
        "tokens": result,
    }


class BlendRequest(BaseModel):
    vectors: list[list[float]]
    weights: list[float]


@app.post('/weighted_blend')
def weighted_blend(req: BlendRequest):
    V = torch.tensor(req.vectors)
    w = torch.tensor(req.weights)

    w = w / w.sum()

    blend = torch.zeros(V.shape[1])
    for i in range(V.shape[0]):
        blend = blend + w[i] * V[i]

    return {"blend": blend.tolist()}




app.mount("/", StaticFiles(directory="static", html=True), name="static")