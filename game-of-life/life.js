// Conway's Game of Life. Every cell looks at its 8 neighbours each turn:
//   - a live cell with 2 or 3 live neighbours survives
//   - a dead cell with exactly 3 live neighbours comes alive
//   - every other cell dies, or stays dead

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const playButton = document.getElementById("play");
const speedSlider = document.getElementById("speed");
const generationLabel = document.getElementById("generation");

const CELL = 10; // size of one cell, in CSS pixels
const ALIVE_COLOR = "#f5c84c";
const BACKGROUND = "#0e1117";

// The grid is one long list of numbers, row after row: 1 = alive, 0 = dead.
// Cell (x, y) lives at index y * cols + x. A flat Uint8Array is much faster
// than an array of arrays.
let cols = 0;
let rows = 0;
let cells = new Uint8Array(0);
let next = new Uint8Array(0); // the next generation is written here, then the two swap

let running = true;
let generation = 0;

// --- Grid size ------------------------------------------------------------
function resize() {
	// Give the canvas extra pixels on high-DPI screens so it stays sharp,
	// then scale drawing up so the rest of the code thinks in CSS pixels.
	const dpr = window.devicePixelRatio || 1;
	canvas.width = window.innerWidth * dpr;
	canvas.height = window.innerHeight * dpr;
	canvas.style.width = `${window.innerWidth}px`;
	canvas.style.height = `${window.innerHeight}px`;
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

	// Make a grid that covers the new screen, keeping the cells that still fit.
	const newCols = Math.ceil(window.innerWidth / CELL);
	const newRows = Math.ceil(window.innerHeight / CELL);
	const resized = new Uint8Array(newCols * newRows);
	for (let y = 0; y < Math.min(rows, newRows); y++) {
		for (let x = 0; x < Math.min(cols, newCols); x++) {
			resized[y * newCols + x] = cells[y * cols + x];
		}
	}
	cols = newCols;
	rows = newRows;
	cells = resized;
	next = new Uint8Array(cells.length);
	draw();
}
window.addEventListener("resize", resize);

// --- The rules ------------------------------------------------------------
function step() {
	for (let y = 0; y < rows; y++) {
		// Where the rows above and below start. % wraps around the edges,
		// so the top row's neighbours are on the bottom row.
		const up = ((y - 1 + rows) % rows) * cols;
		const row = y * cols;
		const down = ((y + 1) % rows) * cols;

		for (let x = 0; x < cols; x++) {
			const left = (x - 1 + cols) % cols;
			const right = (x + 1) % cols;

			const neighbours =
				cells[up + left] + cells[up + x] + cells[up + right] +
				cells[row + left] + cells[row + right] +
				cells[down + left] + cells[down + x] + cells[down + right];

			// Alive next turn with exactly 3 neighbours, or 2 if it's alive already.
			next[row + x] = neighbours === 3 || (neighbours === 2 && cells[row + x]) ? 1 : 0;
		}
	}

	// Every cell had to look at the old grid, so we couldn't overwrite it while
	// working. Now the new one becomes current, and the old one gets reused.
	[cells, next] = [next, cells];
	generation++;
}

function draw() {
	ctx.fillStyle = BACKGROUND;
	ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

	// Only live cells get drawn. CELL - 1 leaves a 1px gap, so you see a grid.
	ctx.fillStyle = ALIVE_COLOR;
	for (let i = 0; i < cells.length; i++) {
		if (cells[i]) ctx.fillRect((i % cols) * CELL, Math.floor(i / cols) * CELL, CELL - 1, CELL - 1);
	}

	generationLabel.textContent = `Gen ${generation}`;
}

// --- Main loop ------------------------------------------------------------
let lastStep = 0;

function frame(now) {
	// Step at the slider's speed (generations per second), however fast the
	// screen refreshes: only step once enough time has passed.
	if (running && now - lastStep >= 1000 / speedSlider.value) {
		step();
		draw();
		lastStep = now;
	}
	requestAnimationFrame(frame);
}

// --- Drawing cells with the mouse or a finger -----------------------------
let painting = false;
let paintValue = 1;

function paint(e) {
	const x = Math.floor(e.clientX / CELL);
	const y = Math.floor(e.clientY / CELL);
	cells[y * cols + x] = paintValue;
	draw();
}

canvas.addEventListener("pointerdown", (e) => {
	// Start on a dead cell to draw, or on a live one to erase.
	const x = Math.floor(e.clientX / CELL);
	const y = Math.floor(e.clientY / CELL);
	paintValue = cells[y * cols + x] ? 0 : 1;
	painting = true;
	paint(e);
});
canvas.addEventListener("pointermove", (e) => {
	if (painting) paint(e);
});
window.addEventListener("pointerup", () => {
	painting = false;
});

// --- Buttons --------------------------------------------------------------
function setRunning(value) {
	running = value;
	playButton.textContent = running ? "Pause" : "Play";
}

playButton.addEventListener("click", () => setRunning(!running));

document.getElementById("step").addEventListener("click", () => {
	setRunning(false);
	step();
	draw();
});

function randomize() {
	for (let i = 0; i < cells.length; i++) {
		cells[i] = Math.random() < 0.25 ? 1 : 0; // about 1 in 4 cells start alive
	}
	generation = 0;
	draw();
}
document.getElementById("random").addEventListener("click", randomize);

document.getElementById("clear").addEventListener("click", () => {
	cells.fill(0);
	generation = 0;
	setRunning(false);
	draw();
});

// Space pauses, unless a button has focus (then Space already clicks it).
window.addEventListener("keydown", (e) => {
	if (e.code !== "Space" || e.target.tagName === "BUTTON") return;
	e.preventDefault();
	setRunning(!running);
});

// --- Start ----------------------------------------------------------------
resize();
randomize();
requestAnimationFrame(frame);
