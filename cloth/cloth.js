// Cloth: a grid of points joined by little sticks, hanging from a few pins.
// Every step, each point keeps moving the way it was going (plus gravity).
// Then every stick pulls its two ends back to its proper length. Do that a
// few times over and the grid starts to behave like fabric.

const canvas = document.getElementById("sky");
const ctx = canvas.getContext("2d");
const gravitySlider = document.getElementById("gravity");
const windSlider = document.getElementById("wind");
const toolButtons = document.querySelectorAll("[data-tool]");

const SPACING = 12; // distance between neighbouring points, in pixels
const MAX_COLS = 51; // at most this many points across (fewer on narrow screens)
const MAX_ROWS = 30; // at most this many points down
const PIN_EVERY = 5; // pin every 5th point along the top edge
const STIFFNESS = 15; // how many times per step the sticks fix their lengths. More = stiffer.
const TEAR = 3; // a stick rips once it's stretched to 3 times its length
const FRICTION = 0.99; // a little air resistance, so the cloth settles down
const GRAB_RADIUS = 25; // you grab every point within this distance of the pointer
const CUT_RADIUS = 8; // how close to a stick the Cut tool needs to pass
const STEP_MS = 1000 / 60; // run the physics 60 times a second, however fast the screen is
const BACKGROUND = "#0e1117";

// Screen size in CSS pixels.
let width = 0;
let height = 0;

let points = []; // { x, y, oldX, oldY, pinned }
let sticks = []; // { a, b, length }: joins point a to point b

// --- Setting up -----------------------------------------------------------
function resize() {
	width = window.innerWidth;
	height = window.innerHeight;

	// Phones and most laptops have 2-3 real pixels per CSS pixel. Give the canvas
	// that many so the lines stay sharp, then scale all drawing up to match.
	const dpr = window.devicePixelRatio || 1;
	canvas.width = width * dpr;
	canvas.height = height * dpr;
	canvas.style.width = `${width}px`;
	canvas.style.height = `${height}px`;
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function makeStick(a, b) {
	return { a, b, length: Math.hypot(b.x - a.x, b.y - a.y) };
}

// A fresh sheet of cloth, centered near the top of the screen. The spacing
// stays the same on every screen, so the cloth behaves the same everywhere.
// A narrow screen just gets a smaller sheet.
function makeCloth() {
	// Columns: as many as fit, rounded so the last one lands on a pin.
	const fit = Math.floor((width * 0.85) / SPACING / PIN_EVERY) * PIN_EVERY + 1;
	const cols = Math.min(MAX_COLS, fit);
	const rows = Math.min(MAX_ROWS, Math.floor((height * 0.6) / SPACING));
	const left = (width - SPACING * (cols - 1)) / 2;
	const top = height * 0.08;

	points = [];
	sticks = [];
	for (let row = 0; row < rows; row++) {
		for (let col = 0; col < cols; col++) {
			const x = left + col * SPACING;
			const y = top + row * SPACING;
			const pinned = row === 0 && col % PIN_EVERY === 0; // pins along the top edge
			const point = { x, y, oldX: x, oldY: y, pinned };
			points.push(point);

			// Join each point to its neighbour on the left and the one above it.
			if (col > 0) sticks.push(makeStick(points[points.length - 2], point));
			if (row > 0) sticks.push(makeStick(points[points.length - 1 - cols], point));
		}
	}
}

// --- The physics ----------------------------------------------------------
function step() {
	const gravity = Number(gravitySlider.value);
	const wind = Number(windSlider.value);

	// 1. Move every point. Its speed is simply how far it moved last step
	//    (this trick is called Verlet integration).
	for (const p of points) {
		if (p.pinned) continue;
		const vx = (p.x - p.oldX) * FRICTION;
		const vy = (p.y - p.oldY) * FRICTION;
		p.oldX = p.x;
		p.oldY = p.y;
		p.x += vx + wind * Math.random(); // gusty: a random amount of wind each time
		p.y += vy + gravity;
	}

	// The points you're holding follow the pointer, keeping their spots in the patch.
	for (const hold of held) {
		hold.point.x = hold.point.oldX = pointer.x + hold.offsetX;
		hold.point.y = hold.point.oldY = pointer.y + hold.offsetY;
	}
	if (pointer.down && tool === "cut") cutStroke();

	// 2. Every stick pulls its two ends back to its proper length. Fixing one
	//    stick knocks its neighbours out a little, so go over them a few times.
	for (let i = 0; i < STIFFNESS; i++) {
		for (const stick of sticks) {
			const dx = stick.b.x - stick.a.x;
			const dy = stick.b.y - stick.a.y;
			const distance = Math.hypot(dx, dy);
			if (distance === 0) continue;

			// How far off it is, shared between the two ends.
			const fix = (stick.length - distance) / distance / 2;
			if (!stick.a.pinned) {
				stick.a.x -= dx * fix;
				stick.a.y -= dy * fix;
			}
			if (!stick.b.pinned) {
				stick.b.x += dx * fix;
				stick.b.y += dy * fix;
			}
		}
	}

	// 3. Any stick stretched too far rips.
	sticks = sticks.filter((s) => Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y) < s.length * TEAR);
}

// --- Drawing --------------------------------------------------------------
function draw() {
	ctx.fillStyle = BACKGROUND;
	ctx.fillRect(0, 0, width, height);

	ctx.lineWidth = 1.5;
	for (const stick of sticks) {
		// Color each stick by how close it is to ripping: blue when relaxed,
		// through green and yellow, to red right before it tears.
		const stretch = Math.hypot(stick.b.x - stick.a.x, stick.b.y - stick.a.y) / stick.length;
		const closeToTearing = (stretch - 1) / (TEAR - 1); // 0 = relaxed, 1 = rips now
		const hue = Math.max(0, 210 * (1 - closeToTearing));
		ctx.strokeStyle = `hsl(${hue} 80% 65%)`;
		ctx.beginPath();
		ctx.moveTo(stick.a.x, stick.a.y);
		ctx.lineTo(stick.b.x, stick.b.y);
		ctx.stroke();
	}

	// Little dots on the pins
	ctx.fillStyle = "#ffffff";
	for (const p of points) {
		if (p.pinned && !held.some((hold) => hold.point === p)) ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
	}
}

// --- Pulling and cutting --------------------------------------------------
let tool = "pull";
// The points you're holding, as { point, offsetX, offsetY, wasPinned }. Grabbing
// a little patch instead of one point spreads the pull over many sticks, like
// grabbing a handful of real fabric.
let held = [];
const pointer = { down: false, x: 0, y: 0, lastX: 0, lastY: 0 };

// Remove every stick whose middle is near (x, y).
function cut(x, y) {
	sticks = sticks.filter((s) => Math.hypot((s.a.x + s.b.x) / 2 - x, (s.a.y + s.b.y) / 2 - y) > CUT_RADIUS);
}

// Cut all along the line from where the pointer was to where it is now,
// so a fast swipe doesn't skip over any sticks.
function cutStroke() {
	const dx = pointer.x - pointer.lastX;
	const dy = pointer.y - pointer.lastY;
	const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / CUT_RADIUS));
	for (let s = 0; s <= steps; s++) {
		cut(pointer.lastX + (dx * s) / steps, pointer.lastY + (dy * s) / steps);
	}
	pointer.lastX = pointer.x;
	pointer.lastY = pointer.y;
}

canvas.addEventListener("pointerdown", (e) => {
	pointer.x = pointer.lastX = e.clientX;
	pointer.y = pointer.lastY = e.clientY;
	pointer.down = true;

	if (tool === "pull") {
		for (const p of points) {
			if (Math.hypot(p.x - e.clientX, p.y - e.clientY) > GRAB_RADIUS) continue;
			held.push({ point: p, offsetX: p.x - e.clientX, offsetY: p.y - e.clientY, wasPinned: p.pinned });
			p.pinned = true; // pinned for now, so the physics doesn't move it while you hold it
		}
	}
});
canvas.addEventListener("pointermove", (e) => {
	pointer.x = e.clientX;
	pointer.y = e.clientY;
});
window.addEventListener("pointerup", () => {
	pointer.down = false;
	// Let go. A pin you dragged stays where you left it.
	for (const hold of held) hold.point.pinned = hold.wasPinned;
	held = [];
});

// --- Buttons --------------------------------------------------------------
for (const button of toolButtons) {
	button.addEventListener("click", () => {
		tool = button.dataset.tool;
		canvas.style.cursor = tool === "cut" ? "crosshair" : "grab";
		for (const other of toolButtons) {
			other.setAttribute("aria-pressed", other === button);
		}
	});
}

document.getElementById("reset").addEventListener("click", makeCloth);

window.addEventListener("resize", () => {
	resize();
	makeCloth();
});

// --- Main loop ------------------------------------------------------------
let lastTime = performance.now();
let leftover = 0; // time we owe the physics, in milliseconds

function frame(now) {
	// Run as many 60-per-second steps as the time since the last frame calls
	// for: one per frame on a 60Hz screen, one every other frame on 120Hz.
	// Capped so coming back to a hidden tab doesn't run hundreds at once.
	leftover += Math.min(now - lastTime, 100);
	lastTime = now;
	while (leftover >= STEP_MS) {
		step();
		leftover -= STEP_MS;
	}

	draw();
	requestAnimationFrame(frame);
}

resize();
makeCloth();
requestAnimationFrame(frame);
