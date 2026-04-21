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
// points is an array of { char, vector: [x, y], kind?: "char" | "position" | "final" }
// If kind is present, the point's color/shape is picked accordingly and
// arrows are drawn from the char and position points to the final point.
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

    // Group points by position so we can draw arrows from (char, position) -> final.
    const groups = {};
    for (const p of points) {
        if (p.kind === undefined) continue;
        if (groups[p.position] === undefined) groups[p.position] = {};
        groups[p.position][p.kind] = p;
    }
    for (const pos in groups) {
        const g = groups[pos];
        if (g.final && g.char) {
            const [x1, y1] = toPixel(g.char.vector[0], g.char.vector[1]);
            const [x2, y2] = toPixel(g.final.vector[0], g.final.vector[1]);
            drawArrow(ctx, x1, y1, x2, y2, "#bbb");
        }
        if (g.final && g.position) {
            const [x1, y1] = toPixel(g.position.vector[0], g.position.vector[1]);
            const [x2, y2] = toPixel(g.final.vector[0], g.final.vector[1]);
            drawArrow(ctx, x1, y1, x2, y2, "#bbb");
        }
    }

    // Draw each point.
    for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const [px, py] = toPixel(p.vector[0], p.vector[1]);

        let fill, radius;
        if (p.kind === "position") {
            fill = "#f0ad4e";
            radius = 5;
        } else if (p.kind === "final") {
            fill = "#222";
            radius = 7;
        } else {
            // "char" or untagged vocab plot
            fill = getColor(p.char);
            radius = 6;
        }

        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, 2 * Math.PI);
        ctx.fill();

        ctx.fillStyle = "#222";
        ctx.font = "bold 14px Courier New";
        ctx.textAlign = "center";
        const label = p.char === " " ? "␣" : (p.char || "");
        ctx.fillText(label, px, py - 10);
    }
}

function drawArrow(ctx, x1, y1, x2, y2, color) {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    const angle = Math.atan2(y2 - y1, x2 - x1);
    const headLen = 7;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
}

// Build a list row that mirrors the vocab rows but shows a character's
// position in the typed string and its position embedding.
function renderPositionList(data) {
    const list = document.getElementById("position-list");
    list.innerHTML = "";

    for (let i = 0; i < data.length; i++) {
        const char = idToChar[data[i].id];
        const pos = data[i].position;
        const embedding = data[i].position_embedding;

        const row = document.createElement("div");
        row.className = "vocab-row";

        const card = createCard(char, data[i].id);

        const arrow1 = document.createElement("div");
        arrow1.className = "arrow";
        arrow1.textContent = "→";

        const posBox = document.createElement("div");
        posBox.className = "id-box";
        posBox.textContent = pos;

        const arrow2 = document.createElement("div");
        arrow2.className = "arrow";
        arrow2.textContent = "→";

        const vectorBox = document.createElement("div");
        vectorBox.className = "vector-box";
        const parts = embedding.map(v => v.toFixed(3));
        vectorBox.textContent = `[${parts.join(", ")}]`;

        row.appendChild(card);
        row.appendChild(arrow1);
        row.appendChild(posBox);
        row.appendChild(arrow2);
        row.appendChild(vectorBox);
        list.appendChild(row);
    }
}

function drawPositionPlot(data) {
    const points = [];
    for (let i = 0; i < data.length; i++) {
        points.push({
            char: String(data[i].position),
            vector: data[i].position_embedding,
            kind: "position",
            position: data[i].position,
        });
    }
    drawPlot2D(document.getElementById("position-plot2d"), points);
}

function setupEmbedText() {
    const form = document.getElementById("embed-text-form");
    const input = document.getElementById("embed-text-input");
    const resultDiv = document.getElementById("embed-text-result");
    const plot = document.getElementById("text-plot2d");
    const posList = document.getElementById("position-list");
    const posPlot = document.getElementById("position-plot2d");

    // Hide the position + combined sections until the user submits something.
    posPlot.style.display = "none";
    plot.style.display = "none";

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const text = input.value;
        if (text === "") {
            posList.innerHTML = "";
            posPlot.style.display = "none";
            resultDiv.innerHTML = "";
            plot.style.display = "none";
            return;
        }

        const response = await fetch(
            `/embed_text?text=${encodeURIComponent(text)}`
        );
        const data = await response.json();

        if (data.length === 0) {
            posList.innerHTML = "";
            posPlot.style.display = "none";
            resultDiv.innerHTML = "";
            plot.style.display = "none";
            return;
        }

        // Render the position section (mirror of the vocab section).
        renderPositionList(data);
        posPlot.style.display = "block";
        drawPositionPlot(data);

        const dim = data[0].char_embedding.length;

        // Build a three-column matrix: char embedding | position embedding | sum.
        const table = document.createElement("table");
        table.className = "matrix";

        const headerRow = document.createElement("tr");
        headerRow.appendChild(document.createElement("th"));
        const groupHeaders = ["char embedding", "position embedding", "final (sum)"];
        for (const name of groupHeaders) {
            const th = document.createElement("th");
            th.textContent = name;
            th.colSpan = dim;
            th.className = "matrix-group-header";
            headerRow.appendChild(th);
        }
        table.appendChild(headerRow);

        // Second header row: d0, d1, ... for each of the three groups.
        const dimRow = document.createElement("tr");
        dimRow.appendChild(document.createElement("th"));
        for (let g = 0; g < 3; g++) {
            for (let d = 0; d < dim; d++) {
                const th = document.createElement("th");
                th.textContent = `d${d}`;
                th.className = "matrix-dim-label-header";
                dimRow.appendChild(th);
            }
        }
        table.appendChild(dimRow);

        // One row per character in the (normalized) input.
        for (let i = 0; i < data.length; i++) {
            const char = idToChar[data[i].id];
            const tr = document.createElement("tr");

            const label = document.createElement("td");
            label.className = "matrix-char";
            label.textContent = (char === " " ? "␣" : char) + ` (pos ${data[i].position})`;
            tr.appendChild(label);

            const groups = [
                data[i].char_embedding,
                data[i].position_embedding,
                data[i].final_embedding,
            ];
            for (let g = 0; g < 3; g++) {
                for (let d = 0; d < dim; d++) {
                    const td = document.createElement("td");
                    td.className = "matrix-cell";
                    if (g === 2) td.classList.add("matrix-cell-final");
                    if (d === 0) td.classList.add("matrix-cell-group-start");
                    td.textContent = groups[g][d].toFixed(3);
                    tr.appendChild(td);
                }
            }
            table.appendChild(tr);
        }

        resultDiv.innerHTML = "";
        resultDiv.appendChild(table);

        // Plot all three vectors for every character, with arrows from
        // char and position to the final sum.
        const points = [];
        for (let i = 0; i < data.length; i++) {
            const char = idToChar[data[i].id];
            const pos = data[i].position;
            points.push({ char: char, vector: data[i].char_embedding, kind: "char", position: pos });
            points.push({ char: String(pos), vector: data[i].position_embedding, kind: "position", position: pos });
            points.push({ char: char, vector: data[i].final_embedding, kind: "final", position: pos });
        }
        plot.style.display = "block";
        drawPlot2D(plot, points);
    });
}

init();
