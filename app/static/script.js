const VOWELS = new Set(["a", "e", "i", "o", "u"]);

// The backend's vocab_lookup: { char: { id, embedding } }
let vocabLookup = {};
// Reverse lookup built from vocabLookup: { id: char }
let idToChar = {};

async function init() {
    const response = await fetch("/vocab");
    vocabLookup = await response.json();

    for (const char in vocabLookup) {
        idToChar[vocabLookup[char].id] = char;
    }

    renderVocabList();
    drawVocabPlot();
    setupEmbedText();
}

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
    charDiv.textContent = char === " " ? "\u2423" : char;

    const idDiv = document.createElement("div");
    idDiv.className = "id";
    idDiv.textContent = `id: ${id}`;

    card.appendChild(charDiv);
    card.appendChild(idDiv);
    return card;
}

function getColor(char) {
    if (char === " ") return "#66bb6a";
    if (VOWELS.has(char)) return "#e57373";
    return "#5b8fd9";
}

function renderVocabList() {
    const list = document.getElementById("vocab-list");
    const status = document.getElementById("status");

    list.innerHTML = "";

    // Sort chars by their id so rows appear in vocab order.
    const chars = Object.keys(vocabLookup);
    chars.sort((a, b) => vocabLookup[a].id - vocabLookup[b].id);

    status.textContent = `Vocabulary size: ${chars.length}`;

    for (const char of chars) {
        const id = vocabLookup[char].id;
        const embedding = vocabLookup[char].embedding;

        const row = document.createElement("div");
        row.className = "vocab-row";

        const card = createCard(char, id);

        const arrow1 = document.createElement("div");
        arrow1.className = "arrow";
        arrow1.textContent = "→";

        const idBox = document.createElement("div");
        idBox.className = "id-box";
        idBox.textContent = id;

        const arrow2 = document.createElement("div");
        arrow2.className = "arrow";
        arrow2.textContent = "→";

        const vectorBox = document.createElement("div");
        vectorBox.className = "vector-box";
        const parts = embedding.map(v => v.toFixed(3));
        vectorBox.textContent = `[${parts.join(", ")}]`;

        row.appendChild(card);
        row.appendChild(arrow1);
        row.appendChild(idBox);
        row.appendChild(arrow2);
        row.appendChild(vectorBox);
        list.appendChild(row);
    }
}

function drawVocabPlot() {
    const points = [];
    for (const char in vocabLookup) {
        points.push({ char: char, vector: vocabLookup[char].embedding });
    }
    drawPlot2D(document.getElementById("plot2d"), points);
}

// Draw a 2D scatter plot on a canvas element.
// points is an array of { char, vector: [x, y] }
function drawPlot2D(canvas, points) {
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;

    const xs = points.map(p => p.vector[0]);
    const ys = points.map(p => p.vector[1]);
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    const yMin = Math.min(...ys);
    const yMax = Math.max(...ys);

    const pad = 40;

    function toPixel(x, y) {
        const px = pad + ((x - xMin) / (xMax - xMin)) * (w - 2 * pad);
        const py = pad + ((y - yMin) / (yMax - yMin)) * (h - 2 * pad);
        return [px, py];
    }

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, w, h);

    // Draw axes through the origin.
    const [ox, oy] = toPixel(0, 0);
    ctx.strokeStyle = "#ccc";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, oy);
    ctx.lineTo(w, oy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ox, 0);
    ctx.lineTo(ox, h);
    ctx.stroke();
    ctx.fillStyle = "#aaa";
    ctx.font = "12px Courier New";
    ctx.textAlign = "left";
    ctx.fillText("(0, 0)", ox + 4, oy - 4);

    // Draw each point.
    for (let i = 0; i < points.length; i++) {
        const char = points[i].char;
        const [px, py] = toPixel(points[i].vector[0], points[i].vector[1]);

        ctx.fillStyle = getColor(char);
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, 2 * Math.PI);
        ctx.fill();

        ctx.fillStyle = "#222";
        ctx.font = "bold 14px Courier New";
        ctx.textAlign = "center";
        ctx.fillText(char === " " ? "␣" : char, px, py - 10);
    }
}

function setupEmbedText() {
    const form = document.getElementById("embed-text-form");
    const input = document.getElementById("embed-text-input");
    const resultDiv = document.getElementById("embed-text-result");
    const plot = document.getElementById("text-plot2d");

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const text = input.value;
        if (text === "") {
            resultDiv.innerHTML = "";
            plot.style.display = "none";
            return;
        }

        const response = await fetch(
            `/embed_text?text=${encodeURIComponent(text)}`
        );
        const data = await response.json();

        if (data.length === 0) {
            resultDiv.innerHTML = "";
            plot.style.display = "none";
            return;
        }

        const dim = data[0].embedding.length;

        // Build the matrix table.
        const table = document.createElement("table");
        table.className = "matrix";

        const headerRow = document.createElement("tr");
        headerRow.appendChild(document.createElement("th"));
        for (let d = 0; d < dim; d++) {
            const th = document.createElement("th");
            th.textContent = `d${d}`;
            th.className = "matrix-dim-label-header";
            headerRow.appendChild(th);
        }
        table.appendChild(headerRow);

        // One row per character in the (normalized) input.
        for (let i = 0; i < data.length; i++) {
            const char = idToChar[data[i].id];
            const tr = document.createElement("tr");

            const label = document.createElement("td");
            label.className = "matrix-char";
            label.textContent = char === " " ? "␣" : char;
            tr.appendChild(label);

            for (let d = 0; d < dim; d++) {
                const td = document.createElement("td");
                td.className = "matrix-cell";
                td.textContent = data[i].embedding[d].toFixed(3);
                tr.appendChild(td);
            }
            table.appendChild(tr);
        }

        resultDiv.innerHTML = "";
        resultDiv.appendChild(table);

        // Plot the embedded characters on the 2D canvas.
        const points = data.map(d => ({
            char: idToChar[d.id],
            vector: d.embedding,
        }));
        plot.style.display = "block";
        drawPlot2D(plot, points);
    });
}

init();
