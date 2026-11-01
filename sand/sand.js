// Falling sand. The screen is a grid of tiny cells, each holding nothing,
// sand, water or wall. Every step, each grain looks just below itself:
//   - sand falls straight down if it can, or else slides down to a side
//   - water does the same, and if it's still stuck, flows left or right
//   - sand is heavier than water, so it slowly sinks through it
//   - walls never move

const canvas = document.getElementById("box");
const ctx = canvas.getContext("2d");
const brushSlider = document.getElementById("brush");
const colorfulToggle = document.getElementById("colorful");
const materialButtons = document.querySelectorAll("[data-material]");

const CELL = 4; // size of one cell, in CSS pixels
const STEP_MS = 1000 / 60; // run the rules 60 times a second, however fast the screen is

const EMPTY = 0;
const SAND = 1;
const WATER = 2;
const WALL = 3;

// [red, green, blue] for each material, in the same order as the numbers above.
const COLORS = [
	[14, 17, 23], // empty
	[219, 184, 92], // sand
	[58, 128, 220], // water
	[120, 120, 132], // wall
];

// The grid is a few long lists, one entry per cell, row after row:
// cell (x, y) lives at index y * cols + x. resize() fills these in.
let cols, rows;
let grid; // what's in each cell
let colors; // each grain's own [r, g, b], picked when it's poured. It travels with the grain.
let moved; // cells that already moved this step, so nothing moves twice
let image; // the picture we draw: one pixel per cell

// --- Grid size ------------------------------------------------------------
// Make an empty grid that covers the screen. Resizing the window starts fresh.
function resize() {
	cols = Math.ceil(window.innerWidth / CELL);
	rows = Math.ceil(window.innerHeight / CELL);
	grid = new Uint8Array(cols * rows);
	colors = new Array(cols * rows);
	moved = new Uint8Array(cols * rows);

	// One real canvas pixel per cell, stretched to CELL CSS pixels each.
	canvas.width = cols;
	canvas.height = rows;
	canvas.style.width = `${cols * CELL}px`;
	canvas.style.height = `${rows * CELL}px`;
	image = ctx.createImageData(cols, rows);
}
window.addEventListener("resize", resize);

// --- The rules ------------------------------------------------------------

// Can a grain of this material move into cell (x, y)? Both can go into empty
// space. Sand can also sink into water, but water slows it down, so it only
// manages that some of the time.
function canEnter(material, x, y) {
	if (x < 0 || x >= cols || y >= rows) return false;
	const target = grid[y * cols + x];
	if (target === EMPTY) return true;
	return material === SAND && target === WATER && Math.random() < 0.2;
}

// Swap two cells, color and all. Whatever was at `to` (empty space, or water
// that sand sank into) ends up where the grain came from.
function move(from, to) {
	[grid[from], grid[to]] = [grid[to], grid[from]];
	[colors[from], colors[to]] = [colors[to], colors[from]];
	moved[to] = 1;
}

function step() {
	moved.fill(0);

	// Work from the bottom row up, so a whole column of sand can fall together.
	for (let y = rows - 1; y >= 0; y--) {
		// Sweep each row in a random direction, so nothing drifts to one side.
		const leftToRight = Math.random() < 0.5;

		for (let k = 0; k < cols; k++) {
			const x = leftToRight ? k : cols - 1 - k;
			const i = y * cols + x;
			const material = grid[i];
			if (material === EMPTY || material === WALL || moved[i]) continue;

			// Which side to try first, picked at random.
			const side = Math.random() < 0.5 ? -1 : 1;

			if (canEnter(material, x, y + 1)) move(i, i + cols); // straight down
			else if (canEnter(material, x + side, y + 1)) move(i, i + cols + side); // down to one side
			else if (canEnter(material, x - side, y + 1)) move(i, i + cols - side); // down to the other
			else if (material === WATER && canEnter(material, x + side, y)) move(i, i + side); // water flows sideways
			else if (material === WATER && canEnter(material, x - side, y)) move(i, i - side);
		}
	}
}

function draw() {
	// image.data is 4 numbers per pixel: red, green, blue, alpha.
	const data = image.data;
	for (let i = 0; i < grid.length; i++) {
		const [r, g, b] = grid[i] === EMPTY ? COLORS[EMPTY] : colors[i];
		data[i * 4] = r;
		data[i * 4 + 1] = g;
		data[i * 4 + 2] = b;
		data[i * 4 + 3] = 255;
	}
	ctx.putImageData(image, 0, 0);
}

// --- Colors ---------------------------------------------------------------
let hue = 0; // how far around the rainbow Colorful sand has got, from 0 to 1

// A color from the rainbow, for h from 0 to 1. Three waves, each a third of
// a turn apart, fade red, green and blue in and out.
function rainbow(h) {
	const angle = h * Math.PI * 2;
	return [128 + 127 * Math.sin(angle), 128 + 127 * Math.sin(angle + 2.1), 128 + 127 * Math.sin(angle + 4.2)];
}

// The color for a newly poured grain: the next bit of rainbow for Colorful
// sand, or the material's own color. Either way it gets a little lighter or
// darker at random, so piles look grainy.
function grainColor() {
	const [r, g, b] = material === SAND && colorfulToggle.checked ? rainbow(hue) : COLORS[material];
	const wobble = Math.random() * 40 - 20;
	return [r + wobble, g + wobble, b + wobble];
}

// --- Painting with the mouse or a finger ----------------------------------
let material = SAND;
const pointer = { down: false, x: 0, y: 0, lastX: 0, lastY: 0 };

// Fill a circle of cells around (cx, cy) with the current material.
function paint(cx, cy) {
	const r = Number(brushSlider.value);
	for (let y = cy - r; y <= cy + r; y++) {
		for (let x = cx - r; x <= cx + r; x++) {
			if (x < 0 || y < 0 || x >= cols || y >= rows) continue;
			if ((x - cx) ** 2 + (y - cy) ** 2 > r * r) continue;
			const i = y * cols + x;

			// Sand and water pour in as a sprinkle, and only into empty cells.
			// Walls and the eraser fill the whole circle.
			if (material === SAND || material === WATER) {
				if (grid[i] !== EMPTY || Math.random() > 0.25) continue;
			}
			grid[i] = material;
			colors[i] = grainColor();
		}
	}
}

// Paint all along the line from where the pointer was to where it is now,
// so a fast swipe doesn't leave gaps.
function paintStroke() {
	const dx = pointer.x - pointer.lastX;
	const dy = pointer.y - pointer.lastY;
	const steps = Math.max(Math.abs(dx), Math.abs(dy), 1);
	for (let s = 0; s <= steps; s++) {
		paint(Math.round(pointer.lastX + (dx * s) / steps), Math.round(pointer.lastY + (dy * s) / steps));
	}
	pointer.lastX = pointer.x;
	pointer.lastY = pointer.y;

	// Move a little further around the rainbow, so Colorful sand comes out in bands.
	hue = (hue + 0.003) % 1;
}

function setPointer(e) {
	pointer.x = Math.floor(e.clientX / CELL);
	pointer.y = Math.floor(e.clientY / CELL);
}
canvas.addEventListener("pointerdown", (e) => {
	setPointer(e);
	pointer.lastX = pointer.x;
	pointer.lastY = pointer.y;
	pointer.down = true;
});
canvas.addEventListener("pointermove", setPointer);
window.addEventListener("pointerup", () => {
	pointer.down = false;
});

// --- Buttons --------------------------------------------------------------
for (const button of materialButtons) {
	button.addEventListener("click", () => {
		material = Number(button.dataset.material);
		for (const other of materialButtons) {
			other.setAttribute("aria-pressed", other === button);
		}
	});
}

document.getElementById("clear").addEventListener("click", () => {
	grid.fill(EMPTY);
});

// --- Main loop ------------------------------------------------------------
let lastTime = performance.now();
let leftover = 0; // time we owe the simulation, in milliseconds

function frame(now) {
	// Run as many 60-per-second steps as the time since the last frame calls
	// for: one per frame on a 60Hz screen, one every other frame on 120Hz.
	// Capped so coming back to a hidden tab doesn't run hundreds at once.
	leftover += Math.min(now - lastTime, 100);
	lastTime = now;
	while (leftover >= STEP_MS) {
		if (pointer.down) paintStroke(); // holding still keeps pouring
		step();
		leftover -= STEP_MS;
	}

	draw();
	requestAnimationFrame(frame);
}

resize();
requestAnimationFrame(frame);
