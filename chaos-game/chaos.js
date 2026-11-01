// The chaos game. Put a few corners on the screen and start anywhere.
// Then, over and over: pick a random corner, jump part of the way toward it,
// and leave a dot. You'd expect a random smudge. With three corners and
// halfway jumps, you get the Sierpinski triangle every single time.

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const panel = document.getElementById("panel");
const jumpSlider = document.getElementById("jump");
const jumpValue = document.getElementById("jump-value");
const speedSlider = document.getElementById("speed");
const speedValue = document.getElementById("speed-value");
const noRepeatToggle = document.getElementById("no-repeat");

// One color per corner. Each dot takes the color of the corner it jumped toward.
const COLORS = ["#f5c84c", "#ec7a74", "#80b3e8", "#8ef0a7", "#c792ea", "#f0a35e", "#5ee0e0", "#f27ac0"];
const BACKGROUND = "#0e1117";

// Screen size in CSS pixels.
let width = 0;
let height = 0;

let corners = []; // the corners, as { x, y }
let point = { x: 0, y: 0 }; // where we are right now
let lastCorner = -1; // which corner we jumped toward last time
let jumps = 0; // how many jumps since the last restart

// --- Setting up -----------------------------------------------------------
function resize() {
	width = window.innerWidth;
	height = window.innerHeight;

	// Phones and most laptops have 2-3 real pixels per CSS pixel. Give the canvas
	// that many so the dots stay sharp, then scale all drawing up to match.
	const dpr = window.devicePixelRatio || 1;
	canvas.width = width * dpr;
	canvas.height = height * dpr;
	canvas.style.width = `${width}px`;
	canvas.style.height = `${height}px`;
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

	restart(); // resizing a canvas wipes it, so start the drawing over
}

// Wipe the screen and start again from a random spot.
function restart() {
	ctx.fillStyle = BACKGROUND;
	ctx.fillRect(0, 0, width, height);
	point = { x: Math.random() * width, y: Math.random() * height };
	jumps = 0;
}

// Place the corners of a regular shape with this many sides, centered on screen.
function makeShape(sides) {
	const radius = Math.min(width, height) * 0.42;
	corners = [];
	for (let k = 0; k < sides; k++) {
		// Go around the circle in equal steps, starting just right of the bottom
		// so every shape sits on a flat edge (a square, not a diamond).
		const angle = Math.PI / 2 + Math.PI / sides + (k / sides) * Math.PI * 2;
		corners.push({
			x: width / 2 + radius * Math.cos(angle),
			y: height / 2 + radius * Math.sin(angle),
		});
	}
	restart();
}

// --- The game -------------------------------------------------------------
function jump(distance) {
	// Pick a random corner. With the rule on, never the same one twice in a row.
	let k;
	do {
		k = Math.floor(Math.random() * corners.length);
	} while (noRepeatToggle.checked && k === lastCorner);
	lastCorner = k;

	// Move part of the way toward it. At 0.5 that's exactly halfway.
	const corner = corners[k];
	point.x += (corner.x - point.x) * distance;
	point.y += (corner.y - point.y) * distance;

	// The first few jumps are still on their way in from the random start,
	// so they'd leave stray dots. Skip drawing those.
	jumps++;
	if (jumps < 20) return;

	ctx.fillStyle = COLORS[k % COLORS.length];
	ctx.fillRect(point.x, point.y, 1, 1);
}

// Little rings marking the corners, drawn over the dots.
function drawCorners() {
	ctx.lineWidth = 2;
	corners.forEach((corner, k) => {
		ctx.beginPath();
		ctx.arc(corner.x, corner.y, 6, 0, Math.PI * 2);
		ctx.fillStyle = BACKGROUND;
		ctx.fill();
		ctx.strokeStyle = COLORS[k % COLORS.length];
		ctx.stroke();
	});
}

// --- Main loop ------------------------------------------------------------
let lastTime = performance.now();
let owed = 0; // dots we still owe since the last frame

function frame(now) {
	// Speed is in dots per second, so it's the same on any screen. The slider
	// is the number of zeros: 2 means 100 dots a second, 5 means 100,000.
	const dotsPerSecond = 10 ** Number(speedSlider.value);
	owed += (dotsPerSecond * Math.min(now - lastTime, 100)) / 1000;
	lastTime = now;

	// It takes at least two corners to jump between.
	if (corners.length >= 2) {
		const distance = Number(jumpSlider.value);
		while (owed >= 1) {
			jump(distance);
			owed--;
		}
	} else {
		owed = 0;
	}

	drawCorners();
	requestAnimationFrame(frame);
}

// --- Controls -------------------------------------------------------------
canvas.addEventListener("pointerdown", (e) => {
	corners.push({ x: e.clientX, y: e.clientY });
	restart();
});

for (const button of document.querySelectorAll("[data-sides]")) {
	button.addEventListener("click", () => makeShape(Number(button.dataset.sides)));
}

document.getElementById("clear").addEventListener("click", () => {
	corners = [];
	restart();
});

// A new jump size or rule makes a different picture, so start it over.
jumpSlider.addEventListener("input", () => {
	jumpValue.textContent = jumpSlider.value;
	restart();
});
noRepeatToggle.addEventListener("change", restart);

function showSpeed() {
	speedValue.textContent = `${(10 ** Number(speedSlider.value)).toLocaleString("en")}/s`;
}
speedSlider.addEventListener("input", showSpeed);

// A new screen size starts over with a triangle in the new middle.
window.addEventListener("resize", () => {
	resize();
	makeShape(3);
});

// --- Start ----------------------------------------------------------------
resize();
showSpeed();
makeShape(3);
// Start with the panel folded away on small screens, so the picture is visible
if (width < 600) panel.open = false;
requestAnimationFrame(frame);
