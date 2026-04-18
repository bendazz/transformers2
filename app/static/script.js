const VOWELS = new Set(["a", "e", "i", "o", "u"]);

// Populated once by init() and then reused everywhere.
let vocab = [];
let embeddings = {};
let currentDim = 2;

async function init() {
    const vocabResponse = await fetch("/vocab");
    vocab = await vocabResponse.json();

    await loadEmbeddings(2);
    setupDimPicker();
    setupEncoder();
    setupEmbedText();
}

async function loadEmbeddings(dim) {
    currentDim = dim;
    await fetch(`/set_dim?dim=${dim}`, { method: "POST" });
    const response = await fetch("/embed");
    embeddings = await response.json();

    renderVocabList();

    // Build the points list for the vocab plot.
    const points = [];
    for (let id = 0; id < vocab.length; id++) {
        points.push({ char: vocab[id], vector: embeddings[id] });
    }

    if (dim === 2) {
        document.getElementById("plot2d").style.display = "block";
        document.getElementById("plot3d").style.display = "none";
        drawPlot2D(document.getElementById("plot2d"), points);
    } else {
        document.getElementById("plot2d").style.display = "none";
        document.getElementById("plot3d").style.display = "block";
        drawPlot3D(document.getElementById("plot3d"), points);
    }

    // Hide the text plots when dimension changes.
    document.getElementById("text-plot2d").style.display = "none";
    document.getElementById("text-plot3d").style.display = "none";
}

function setupDimPicker() {
    const select = document.getElementById("dim-select");
    select.addEventListener("change", () => {
        const dim = parseInt(select.value);
        loadEmbeddings(dim);
    });
}

// Build one styled card for a single (char, id) pair.
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
    status.textContent = `Vocabulary size: ${vocab.length}`;
    vocab.forEach((char, id) => {
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

        const vector = embeddings[id];
        const vectorBox = document.createElement("div");
        vectorBox.className = "vector-box";
        const parts = vector.map(v => v.toFixed(3));
        vectorBox.textContent = `[${parts.join(", ")}]`;

        row.appendChild(card);
        row.appendChild(arrow1);
        row.appendChild(idBox);
        row.appendChild(arrow2);
        row.appendChild(vectorBox);
        list.appendChild(row);
    });
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

// Draw a 3D scatter plot in a container div.
// points is an array of { char, vector: [x, y, z] }
function drawPlot3D(container, points) {
    container.innerHTML = "";

    const w = 500;
    const h = 500;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100);
    camera.position.set(4, 3, 4);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    container.appendChild(renderer.domElement);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);

    // Draw axes through the origin.
    const axisLength = 3;
    const axisColors = [0xcc0000, 0x00cc00, 0x0000cc];
    for (let i = 0; i < 3; i++) {
        const pts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0)];
        if (i === 0) pts[1].x = axisLength;
        if (i === 1) pts[1].y = axisLength;
        if (i === 2) pts[1].z = axisLength;
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const mat = new THREE.LineBasicMaterial({ color: axisColors[i], opacity: 0.3, transparent: true });
        scene.add(new THREE.Line(geo, mat));
    }

    // Find the range to scale points nicely.
    let maxAbs = 0;
    for (let i = 0; i < points.length; i++) {
        for (let d = 0; d < 3; d++) {
            maxAbs = Math.max(maxAbs, Math.abs(points[i].vector[d]));
        }
    }
    const scale = 2 / maxAbs;

    // Add a sphere and label for each character.
    for (let i = 0; i < points.length; i++) {
        const char = points[i].char;
        const v = points[i].vector;
        const x = v[0] * scale;
        const y = v[1] * scale;
        const z = v[2] * scale;

        const color = new THREE.Color(getColor(char));

        const sphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.08, 16, 16),
            new THREE.MeshBasicMaterial({ color: color })
        );
        sphere.position.set(x, y, z);
        scene.add(sphere);

        const labelCanvas = document.createElement("canvas");
        labelCanvas.width = 64;
        labelCanvas.height = 64;
        const ctx = labelCanvas.getContext("2d");
        ctx.font = "bold 48px Courier New";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#222";
        ctx.fillText(char === " " ? "␣" : char, 32, 32);

        const texture = new THREE.CanvasTexture(labelCanvas);
        const spriteMat = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.position.set(x, y + 0.15, z);
        sprite.scale.set(0.4, 0.4, 0.4);
        scene.add(sprite);
    }

    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();
}

function setupEncoder() {
    const form = document.getElementById("encode-form");
    const input = document.getElementById("encode-input");
    const result = document.getElementById("encode-result");

    form.addEventListener("submit", async (event) => {
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

function setupEmbedText() {
    const form = document.getElementById("embed-text-form");
    const input = document.getElementById("embed-text-input");
    const resultDiv = document.getElementById("embed-text-result");

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const text = input.value;
        if (text === "") {
            resultDiv.innerHTML = "";
            document.getElementById("text-plot2d").style.display = "none";
            document.getElementById("text-plot3d").style.display = "none";
            return;
        }

        try {
            const response = await fetch(
                `/embed_text?string=${encodeURIComponent(text)}`
            );
            const data = await response.json();

            if (data.length === 0) {
                resultDiv.innerHTML = "";
                document.getElementById("text-plot2d").style.display = "none";
                document.getElementById("text-plot3d").style.display = "none";
                return;
            }

            const dim = data[0].vector.length;

            // Build the matrix table.
            const table = document.createElement("table");
            table.className = "matrix";

            // Header row: dimension labels.
            const headerRow = document.createElement("tr");
            const emptyTh = document.createElement("th");
            headerRow.appendChild(emptyTh);
            for (let d = 0; d < dim; d++) {
                const th = document.createElement("th");
                th.textContent = `d${d}`;
                th.className = "matrix-dim-label-header";
                headerRow.appendChild(th);
            }
            table.appendChild(headerRow);

            // One row per character.
            for (let i = 0; i < data.length; i++) {
                const tr = document.createElement("tr");
                const label = document.createElement("td");
                label.className = "matrix-char";
                label.textContent = data[i].char === " " ? "␣" : data[i].char;
                tr.appendChild(label);
                for (let d = 0; d < dim; d++) {
                    const td = document.createElement("td");
                    td.className = "matrix-cell";
                    td.textContent = data[i].vector[d].toFixed(3);
                    tr.appendChild(td);
                }
                table.appendChild(tr);
            }

            resultDiv.innerHTML = "";
            resultDiv.appendChild(table);

            // Build points for the text plot.
            const points = data.map(d => ({ char: d.char, vector: d.vector }));

            // Show the appropriate plot.
            if (dim === 2) {
                document.getElementById("text-plot2d").style.display = "block";
                document.getElementById("text-plot3d").style.display = "none";
                drawPlot2D(document.getElementById("text-plot2d"), points);
            } else if (dim === 3) {
                document.getElementById("text-plot2d").style.display = "none";
                document.getElementById("text-plot3d").style.display = "block";
                drawPlot3D(document.getElementById("text-plot3d"), points);
            } else {
                document.getElementById("text-plot2d").style.display = "none";
                document.getElementById("text-plot3d").style.display = "none";
            }
        } catch (err) {
            resultDiv.textContent = `Error: ${err.message}`;
        }
    });
}

init();
