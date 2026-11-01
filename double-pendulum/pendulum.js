// Double pendulum: a pendulum hanging off the end of another pendulum.
// It follows simple, exact physics, yet it's chaotic: start two of them a
// hair's width apart, and within seconds they do completely different things.
// Here a whole bunch start almost together, each in its own color, so you can
// watch them fan out.

const canvas = document.getElementById("sky");
const ctx = canvas.getContext("2d");
const panel = document.getElementById("panel");
const countSlider = document.getElementById("count");
const countValue = document.getElementById("count-value");
const trailsToggle = document.getElementById("trails");

// Both arms are 1 unit long, so this is like 1-meter arms on Earth.
const GRAVITY = 9.81;
const NUDGE = 0.001; // how far apart the pendulums start, in radians (about 0.06°)
const STEP = 1 / 600; // seconds per physics step. Small steps keep the swinging accurate.
const TRAIL = 120; // how many recent positions of each bottom weight to draw
const BACKGROUND = "#0e1117";

// Screen size, where the pendulums hang from, and how long an arm is on screen.
let width = 0;
let height = 0;
let pivot = { x: 0, y: 0 };
let armLength = 0;

// Each pendulum: angle1, angle2 (radians, 0 = hanging straight down),
// speed1, speed2 (how fast those angles change), its color, and its trail.
let pendulums = [];

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

	// Hang from just above the middle, with room to swing all the way around.
	pivot = { x: width / 2, y: height * 0.45 };
	armLength = Math.min(width, height) * 0.21;
}

// Start them all over from a new random spot, high up so it gets wild.
function restart() {
	const count = Number(countSlider.value);
	const angle1 = Math.PI / 2 + Math.random() * (Math.PI / 2); // between 90° and 180°
	const angle2 = Math.PI / 2 + Math.random() * (Math.PI / 2);

	pendulums = [];
	for (let k = 0; k < count; k++) {
		pendulums.push({
			angle1: angle1 + k * NUDGE, // each one nudged a tiny bit further than the last
			angle2,
			speed1: 0,
			speed2: 0,
			color: `hsl(${(360 * k) / count} 80% 65%)`,
			trail: [],
		});
	}
}

// --- The physics ----------------------------------------------------------

// How everything is changing right now: each angle changes by its speed, and
// each speed by an acceleration. The accelerations are the standard double
// pendulum equations, with both arms and both weights set to 1, which tidies
// them up a lot. They come from balancing the forces on the two weights.
function change(s) {
	const d = s.angle1 - s.angle2;
	const below = 3 - Math.cos(2 * d);
	const acc1 =
		(-3 * GRAVITY * Math.sin(s.angle1) -
			GRAVITY * Math.sin(s.angle1 - 2 * s.angle2) -
			2 * Math.sin(d) * (s.speed2 ** 2 + s.speed1 ** 2 * Math.cos(d))) /
		below;
	const acc2 =
		(2 * Math.sin(d) * (2 * s.speed1 ** 2 + 2 * GRAVITY * Math.cos(s.angle1) + s.speed2 ** 2 * Math.cos(d))) /
		below;
	return { angle1: s.speed1, angle2: s.speed2, speed1: acc1, speed2: acc2 };
}

// A copy of state `s`, moved along `rates` for `time` seconds.
function moved(s, rates, time) {
	return {
		angle1: s.angle1 + rates.angle1 * time,
		angle2: s.angle2 + rates.angle2 * time,
		speed1: s.speed1 + rates.speed1 * time,
		speed2: s.speed2 + rates.speed2 * time,
	};
}

// Move a pendulum forward one small step. Simply adding speed × time drifts
// badly for something this wild (it slowly gains or loses swing). This is
// RK4: check how things are changing at the start of the step, twice in the
// middle, and at the end, then move by a weighted average of the four.
function update(p) {
	const k1 = change(p);
	const k2 = change(moved(p, k1, STEP / 2));
	const k3 = change(moved(p, k2, STEP / 2));
	const k4 = change(moved(p, k3, STEP));
	for (const key of ["angle1", "angle2", "speed1", "speed2"]) {
		p[key] += (STEP / 6) * (k1[key] + 2 * k2[key] + 2 * k3[key] + k4[key]);
	}
}

// Where the two weights are on screen.
function weights(p) {
	const x1 = pivot.x + armLength * Math.sin(p.angle1);
	const y1 = pivot.y + armLength * Math.cos(p.angle1);
	const x2 = x1 + armLength * Math.sin(p.angle2);
	const y2 = y1 + armLength * Math.cos(p.angle2);
	return { x1, y1, x2, y2 };
}

// --- Drawing --------------------------------------------------------------
function draw() {
	ctx.fillStyle = BACKGROUND;
	ctx.fillRect(0, 0, width, height);

	// Trails: a line through the last few places each bottom weight has been.
	if (trailsToggle.checked) {
		ctx.globalAlpha = 0.5;
		ctx.lineWidth = 1.5;
		for (const p of pendulums) {
			ctx.strokeStyle = p.color;
			ctx.beginPath();
			p.trail.forEach((point, i) => (i === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y)));
			ctx.stroke();
		}
		ctx.globalAlpha = 1;
	}

	// Arms and weights, drawn back to front so the first pendulum is on top.
	ctx.lineWidth = 2;
	for (const p of [...pendulums].reverse()) {
		const { x1, y1, x2, y2 } = weights(p);
		ctx.strokeStyle = p.color;
		ctx.fillStyle = p.color;
		ctx.beginPath();
		ctx.moveTo(pivot.x, pivot.y);
		ctx.lineTo(x1, y1);
		ctx.lineTo(x2, y2);
		ctx.stroke();
		ctx.beginPath();
		ctx.arc(x1, y1, 4, 0, Math.PI * 2);
		ctx.arc(x2, y2, 6, 0, Math.PI * 2);
		ctx.fill();
	}

	// The pivot they all hang from
	ctx.fillStyle = "#ffffff";
	ctx.beginPath();
	ctx.arc(pivot.x, pivot.y, 4, 0, Math.PI * 2);
	ctx.fill();
}

// --- Main loop ------------------------------------------------------------
let lastTime = performance.now();
let owed = 0; // seconds of physics we still owe since the last frame

function frame(now) {
	// Run as many small steps as real time calls for, so it swings at the same
	// speed on any screen. Capped so a hidden tab doesn't catch up all at once.
	owed += Math.min(now - lastTime, 100) / 1000;
	lastTime = now;
	while (owed >= STEP) {
		for (const p of pendulums) update(p);
		owed -= STEP;
	}

	// Remember where each bottom weight is, keeping only the last TRAIL spots.
	for (const p of pendulums) {
		const { x2, y2 } = weights(p);
		p.trail.push({ x: x2, y: y2 });
		if (p.trail.length > TRAIL) p.trail.shift();
	}

	draw();
	requestAnimationFrame(frame);
}

// --- Controls -------------------------------------------------------------
countSlider.addEventListener("input", () => {
	countValue.textContent = countSlider.value;
	restart();
});
document.getElementById("restart").addEventListener("click", restart);
window.addEventListener("resize", () => {
	resize();
	for (const p of pendulums) p.trail = []; // old trails were drawn at the old size
});

// --- Start ----------------------------------------------------------------
resize();
restart();
// Start with the panel folded away on small screens, so the pendulums are visible
if (width < 600) panel.open = false;
requestAnimationFrame(frame);
