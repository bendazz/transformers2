const VOWELS = new Set(["a", "e", "i", "o", "u"]);

// The backend's vocab_lookup: { char: { id, embedding } }
let vocabLookup = {};

// The backend's position_lookup: { i: { position, embedding } }
let positionLookup = {};

async function init() {
    const vocabResponse = await fetch("/vocab");
    vocabLookup = await vocabResponse.json();

    const positionResponse = await fetch("/positions");
    positionLookup = await positionResponse.json();

    renderVocabList();
    drawVocabPlot();
    renderPositionList();
    drawPositionPlot();
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

function renderPositionList() {
    const list = document.getElementById("position-list");
    list.innerHTML = "";

    const positions = Object.keys(positionLookup);
    positions.sort((a, b) => Number(a) - Number(b));

    for (const i of positions) {
        const pos = positionLookup[i].position;
        const embedding = positionLookup[i].embedding;

        const row = document.createElement("div");
        row.className = "vocab-row";

        const card = document.createElement("div");
        card.className = "vocab-card";
        const numDiv = document.createElement("div");
        numDiv.className = "char";
        numDiv.textContent = pos;
        card.appendChild(numDiv);

        const arrow = document.createElement("div");
        arrow.className = "arrow";
        arrow.textContent = "→";

        const vectorBox = document.createElement("div");
        vectorBox.className = "vector-box";
        const parts = embedding.map(v => v.toFixed(3));
        vectorBox.textContent = `[${parts.join(", ")}]`;

        row.appendChild(card);
        row.appendChild(arrow);
        row.appendChild(vectorBox);
        list.appendChild(row);
    }
}

function drawPositionPlot() {
    const points = [];
    for (const i in positionLookup) {
        points.push({
            char: String(positionLookup[i].position),
            vector: positionLookup[i].embedding,
        });
    }
    drawPlot2D(document.getElementById("position-plot2d"), points);
}

// Draw a 2D scatter plot on a canvas element.
// points is an array of { char, vector: [x, y], kind?: "position" | "final" }
// Each vector is drawn as an arrow from the origin to its tip, with the
// label drawn just above the tip. If `bounds` is provided, the axis range
// is fixed instead of auto-fit to the points (used during animation so
// the camera does not jump while points move).
function drawPlot2D(canvas, points, bounds = null) {
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;

    let xMin, xMax, yMin, yMax;
    if (bounds) {
        ({ xMin, xMax, yMin, yMax } = bounds);
    } else {
        const xs = points.map(p => p.vector[0]);
        const ys = points.map(p => p.vector[1]);
        xMin = Math.min(...xs);
        xMax = Math.max(...xs);
        yMin = Math.min(...ys);
        yMax = Math.max(...ys);
    }

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

    // Draw an arrow from the origin to each vector. This makes the
    // "vector" interpretation literal: every point is the tip of an arrow.
    const [originX, originY] = toPixel(0, 0);
    for (const p of points) {
        const [px, py] = toPixel(p.vector[0], p.vector[1]);
        let color;
        if (p.kind === "position") {
            color = "#f0ad4e";
        } else if (p.char && p.char.length === 1) {
            color = getColor(p.char);
        } else {
            color = "#999";
        }
        drawArrow(ctx, originX, originY, px, py, color);
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

function renderEmbedTextResult(data) {
    const resultDiv = document.getElementById("embed-text-result");
    resultDiv.innerHTML = "";

    for (let i = 0; i < data.tokens.length; i++) {
        const token = data.tokens[i];
        const char = Object.keys(vocabLookup).find(
            c => vocabLookup[c].id === token.id
        );

        const row = document.createElement("div");
        row.className = "vocab-row";
        if (i === targetIdx) row.classList.add("target");

        const card = createCard(char, token.id);

        const arrow1 = document.createElement("div");
        arrow1.className = "arrow";
        arrow1.textContent = "→";

        const charBox = document.createElement("div");
        charBox.className = "vector-box";
        charBox.textContent = `[${token.char_embedding.map(v => v.toFixed(3)).join(", ")}]`;

        const plus = document.createElement("div");
        plus.className = "arrow";
        plus.textContent = "+";

        const posBox = document.createElement("div");
        posBox.className = "vector-box";
        posBox.textContent = `[${token.position_embedding.map(v => v.toFixed(3)).join(", ")}]`;

        const eq = document.createElement("div");
        eq.className = "arrow";
        eq.textContent = "=";

        const finalBox = document.createElement("div");
        finalBox.className = "vector-box";
        finalBox.textContent = `[${token.final_embedding.map(v => v.toFixed(3)).join(", ")}]`;

        const targetRadio = document.createElement("input");
        targetRadio.type = "radio";
        targetRadio.name = "target-position";
        targetRadio.className = "target-radio";
        targetRadio.checked = (i === targetIdx);
        targetRadio.addEventListener("change", () => {
            targetIdx = i;
            setIdentityWeights(data.tokens.length, i);
            renderEmbedTextResult(data);
            drawFinalPlot(data);
        });

        const weightInput = document.createElement("input");
        weightInput.type = "number";
        weightInput.step = "0.1";
        weightInput.className = "weight-input";
        weightInput.value = weights[i];
        weightInput.addEventListener("input", (e) => {
            const v = parseFloat(e.target.value);
            weights[i] = isNaN(v) ? 0 : v;
        });

        row.appendChild(card);
        row.appendChild(arrow1);
        row.appendChild(charBox);
        row.appendChild(plus);
        row.appendChild(posBox);
        row.appendChild(eq);
        row.appendChild(finalBox);
        row.appendChild(targetRadio);
        row.appendChild(weightInput);
        resultDiv.appendChild(row);
    }
}

// Module-level state for the attention step.
// `lastEmbedData` holds the most recent /embed_text response.
// `weights` is one number per token (identity defaults: 1 for the target,
// 0 for everyone else). `targetIdx` is which token will be updated.
// `animationId` lets us cancel an in-flight animation when state changes.
let lastEmbedData = null;
let weights = [];
let targetIdx = 0;
let animationId = null;

function setIdentityWeights(n, target) {
    weights = new Array(n).fill(0);
    weights[target] = 1;
}

function drawFinalPlot(data) {
    const plot = document.getElementById("final-plot2d");
    const points = [];
    for (const token of data.tokens) {
        const char = Object.keys(vocabLookup).find(
            c => vocabLookup[c].id === token.id
        );
        points.push({ char: char, vector: token.final_embedding });
    }
    plot.style.display = "block";
    drawPlot2D(plot, points);
}

async function applyAttention(data) {
    const sumW = weights.reduce((a, b) => a + b, 0);
    if (sumW === 0) return;

    const vectors = data.tokens.map(t => t.final_embedding);

    const response = await fetch("/weighted_blend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vectors: vectors, weights: weights }),
    });

    if (!response.ok) return;

    const result = await response.json();
    const fromVec = data.tokens[targetIdx].final_embedding;
    animateTargetUpdate(data, fromVec, result.blend);
}

function animateTargetUpdate(data, fromVec, toVec) {
    if (animationId !== null) cancelAnimationFrame(animationId);

    const plot = document.getElementById("final-plot2d");

    // Bounds include all original arrows plus the target's destination,
    // so the camera never reframes during the animation.
    const xs = data.tokens.map(t => t.final_embedding[0]).concat(toVec[0]);
    const ys = data.tokens.map(t => t.final_embedding[1]).concat(toVec[1]);
    const bounds = {
        xMin: Math.min(...xs),
        xMax: Math.max(...xs),
        yMin: Math.min(...ys),
        yMax: Math.max(...ys),
    };

    const duration = 1500;
    const start = performance.now();

    function frame(now) {
        let t = (now - start) / duration;
        if (t > 1) t = 1;

        const points = [];
        for (let i = 0; i < data.tokens.length; i++) {
            const token = data.tokens[i];
            const char = Object.keys(vocabLookup).find(
                c => vocabLookup[c].id === token.id
            );
            let vec;
            if (i === targetIdx) {
                vec = [
                    fromVec[0] * (1 - t) + toVec[0] * t,
                    fromVec[1] * (1 - t) + toVec[1] * t,
                ];
            } else {
                vec = token.final_embedding;
            }
            points.push({ char: char, vector: vec });
        }

        drawPlot2D(plot, points, bounds);

        if (t < 1) {
            animationId = requestAnimationFrame(frame);
        } else {
            animationId = null;
        }
    }
    animationId = requestAnimationFrame(frame);
}

function setupEmbedText() {
    const form = document.getElementById("embed-text-form");
    const input = document.getElementById("embed-text-input");
    const applyBtn = document.getElementById("apply-attention-btn");
    const hint = document.getElementById("weights-hint");

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const resultDiv = document.getElementById("embed-text-result");
        const plot = document.getElementById("final-plot2d");
        resultDiv.innerHTML = "";
        plot.style.display = "none";
        applyBtn.style.display = "none";
        hint.style.display = "none";
        if (animationId !== null) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }

        const text = input.value;
        if (text === "") return;

        const response = await fetch(
            `/embed_text?text=${encodeURIComponent(text)}`
        );

        if (!response.ok) {
            resultDiv.textContent =
                `Error ${response.status}: text may be longer than max_length (${20}).`;
            return;
        }

        const data = await response.json();
        lastEmbedData = data;
        targetIdx = 0;
        setIdentityWeights(data.tokens.length, 0);

        renderEmbedTextResult(data);
        drawFinalPlot(data);
        hint.style.display = "block";
        applyBtn.style.display = "block";
    });

    applyBtn.addEventListener("click", () => {
        if (lastEmbedData) applyAttention(lastEmbedData);
    });
}

init();
