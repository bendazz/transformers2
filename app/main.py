from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
import re

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


print(normalize('1234 hi Hello'))

@app.get('/vocab')
def get_vocab():
    return vocab

@app.get('/encode')
def encode(string: str):
    encoded = []
    for c in normalize(string):
        encoded.append(char_to_id[c])
    return encoded





app.mount("/", StaticFiles(directory="static", html=True), name="static")