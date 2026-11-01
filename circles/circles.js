// Drawing with circles. Any closed drawing can be rebuilt by stacking spinning
// circles: each one rides on the edge of the one before it, and each spins at
// a different whole-number speed. A pen on the edge of the last circle traces
// out the drawing. Working out the size and starting angle of every circle is
// called a Fourier transform.

const canvas = document.getElementById("sky");
const ctx = canvas.getContext("2d");
const circlesSlider = document.getElementById("circles");
const circlesValue = document.getElementById("circles-value");

const LOOP_SECONDS = 10; // how long one full trip around the drawing takes
const MAX_POINTS = 400; // longer drawings get thinned out to about this many points
const BACKGROUND = "#0e1117";
const PEN_COLOR = "#f5c84c";
const CIRCLE_COLOR = "rgba(255, 255, 255, 0.3)";
const ORIGINAL_COLOR = "rgba(255, 255, 255, 0.12)";

// Screen size in CSS pixels. The circles all stack up from the middle.
let width = 0;
let height = 0;

let drawing = []; // the drawing being redrawn, as { x, y } relative to the middle of the screen
let circles = []; // { speed, radius, angle } for each circle, biggest first
let traced = []; // where the pen has been on this trip around
let time = 0; // how far through one trip we are, from 0 to 1
let stroke = null; // the line you're drawing right now, while your finger is down

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

// The classic heart curve, sized to fit the screen.
function heart() {
	const size = Math.min(width, height) / 45;
	const points = [];
	for (let i = 0; i < 300; i++) {
		const t = (i / 300) * Math.PI * 2;
		points.push({
			x: size * 16 * Math.sin(t) ** 3,
			y: -size * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)),
		});
	}
	return points;
}

// --- The Fourier transform ------------------------------------------------

// For each spinning speed, work out how big that circle is and where it starts.
// For speed k: turn every point of the drawing backwards by k full turns over
// the course of the drawing, and average them. Everything that isn't spinning
// at speed k cancels itself out, and what's left is that circle.
function fourier(points) {
	const n = points.length;
	const result = [];
	for (let k = 0; k < n; k++) {
		// Speeds go 0, 1, 2, ... up to halfway, then -..., -2, -1 (spinning the other way).
		const speed = k <= n / 2 ? k : k - n;
		let x = 0;
		let y = 0;
		points.forEach((p, i) => {
			const turn = (-2 * Math.PI * speed * i) / n;
			x += p.x * Math.cos(turn) - p.y * Math.sin(turn);
			y += p.x * Math.sin(turn) + p.y * Math.cos(turn);
		});
		x /= n;
		y /= n;
		result.push({ speed, radius: Math.hypot(x, y), angle: Math.atan2(y, x) });
	}
	// Drop circles too tiny to see (a heart only needs 8!), and put the biggest
	// first: they matter most, so they go at the bottom of the stack.
	return result.filter((c) => c.radius > 0.01).sort((a, b) => b.radius - a.radius);
}

// Start redrawing these points with circles.
function useDrawing(points) {
	// Very long drawings are slow to transform, so keep only every few points.
	const every = Math.ceil(points.length / MAX_POINTS);
	drawing = points.filter((_, i) => i % every === 0);
	circles = fourier(drawing);

	circlesSlider.max = circles.length;
	circlesSlider.value = circles.length;
	showCount();
	traced = [];
	time = 0;
}

// --- Drawing --------------------------------------------------------------

// A line through a list of points, offset to the middle of the screen.
function drawPath(points, color, lineWidth) {
	ctx.strokeStyle = color;
	ctx.lineWidth = lineWidth;
	ctx.beginPath();
	points.forEach((p, i) => {
		if (i === 0) ctx.moveTo(width / 2 + p.x, height / 2 + p.y);
		else ctx.lineTo(width / 2 + p.x, height / 2 + p.y);
	});
	ctx.stroke();
}

let lastTime = performance.now();

function frame(now) {
	const seconds = Math.min(now - lastTime, 100) / 1000;
	lastTime = now;

	ctx.fillStyle = BACKGROUND;
	ctx.fillRect(0, 0, width, height);

	// While you're drawing, just show your line.
	if (stroke) {
		drawPath(stroke, PEN_COLOR, 2);
		requestAnimationFrame(frame);
		return;
	}

	// The original drawing, faintly, to compare against.
	drawPath(drawing, ORIGINAL_COLOR, 2);

	// Move along. After a full trip, start a fresh trace.
	time += seconds / LOOP_SECONDS;
	if (time >= 1) {
		time -= 1;
		traced = [];
	}

	// Stack the circles. Each one is centered on the pen point of the one
	// before, and has turned `speed` full turns per trip.
	let x = 0;
	let y = 0;
	ctx.strokeStyle = CIRCLE_COLOR;
	ctx.lineWidth = 1;
	for (const circle of circles.slice(0, Number(circlesSlider.value))) {
		const angle = circle.angle + 2 * Math.PI * circle.speed * time;
		const nextX = x + circle.radius * Math.cos(angle);
		const nextY = y + circle.radius * Math.sin(angle);

		ctx.beginPath();
		ctx.arc(width / 2 + x, height / 2 + y, circle.radius, 0, Math.PI * 2);
		ctx.moveTo(width / 2 + x, height / 2 + y);
		ctx.lineTo(width / 2 + nextX, height / 2 + nextY);
		ctx.stroke();

		x = nextX;
		y = nextY;
	}

	// The pen is at the edge of the last circle.
	traced.push({ x, y });
	drawPath(traced, PEN_COLOR, 2);

	requestAnimationFrame(frame);
}

// --- Drawing your own -----------------------------------------------------
function pointFrom(e) {
	return { x: e.clientX - width / 2, y: e.clientY - height / 2 };
}

canvas.addEventListener("pointerdown", (e) => {
	stroke = [pointFrom(e)];
});
canvas.addEventListener("pointermove", (e) => {
	if (stroke) stroke.push(pointFrom(e));
});
window.addEventListener("pointerup", () => {
	if (!stroke) return;
	// A quick tap isn't a drawing, so keep the old one.
	if (stroke.length > 10) useDrawing(stroke);
	stroke = null;
});

// --- Controls -------------------------------------------------------------
function showCount() {
	circlesValue.textContent = circlesSlider.value;
}
circlesSlider.addEventListener("input", () => {
	showCount();
	traced = []; // a different number of circles draws a different line
});

document.getElementById("heart").addEventListener("click", () => useDrawing(heart()));

window.addEventListener("resize", () => {
	resize();
	useDrawing(heart());
});

// --- Start ----------------------------------------------------------------
resize();
useDrawing(heart());
requestAnimationFrame(frame);
