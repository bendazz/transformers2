const VOWELS = new Set(["a", "e", "i", "o", "u"]);

// Populated once by init() and then reused for both the vocab grid
// and the live encoder display.
let vocab = [];

async function init() {
    const response = await fetch("/vocab");
    vocab = await response.json();

    renderVocabGrid();
    setupEncoder();
}

// Build one styled card for a single (char, id) pair.
// Shared by the vocab grid and the encoder result display so the
// two views look exactly the same.
function createCard(char, id) {
    const card = document.createElement("div");
    card.className = "vocab-card";

    if (char === " ") {
        card.classList.add("space");
    } else if (VOWELS.has(char)) {
        card.classList.add("vowel");
    } else {
        card.classList.add("consonant");
    }

    const charDiv = document.createElement("div");
    charDiv.className = "char";
    // Show space as the visible "open box" symbol.
    charDiv.textContent = char === " " ? "\u2423" : char;

    const idDiv = document.createElement("div");
    idDiv.className = "id";
    idDiv.textContent = `id: ${id}`;

    card.appendChild(charDiv);
    card.appendChild(idDiv);
    return card;
}

function renderVocabGrid() {
    const grid = document.getElementById("vocab-grid");
    const status = document.getElementById("status");

    status.textContent = `Vocabulary size: ${vocab.length}`;
    vocab.forEach((char, id) => {
        grid.appendChild(createCard(char, id));
    });
}

function setupEncoder() {
    const form = document.getElementById("encode-form");
    const input = document.getElementById("encode-input");
    const result = document.getElementById("encode-result");

    form.addEventListener("submit", async (event) => {
        // Stop the browser from reloading the page on form submit.
        event.preventDefault();

        const text = input.value;

        if (text === "") {
            result.textContent = "";
            return;
        }

        try {
            const response = await fetch(
                `/encode?string=${encodeURIComponent(text)}`
            );
            const ids = await response.json();
            result.textContent = `[${ids.join(", ")}]`;
        } catch (err) {
            result.textContent = `Error: ${err.message}`;
        }
    });
}

init();
