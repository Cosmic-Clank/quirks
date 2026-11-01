// Flock simulation: separation, alignment and cohesion.

// --- Setup (like pygame.display.set_mode) -------------------------------
const canvas = document.getElementById("sky");
const ctx = canvas.getContext("2d"); // the "surface" we draw on

// Screen size in CSS pixels. The rest of the code uses these, not canvas.width.
let width = 0;
let height = 0;

function resize() {
	width = window.innerWidth;
	height = window.innerHeight;

	// Phones and most laptops have 2-3 real pixels per CSS pixel. Give the canvas
	// that many so the birds stay sharp, then scale all drawing up to match.
	const dpr = window.devicePixelRatio || 1;
	canvas.width = width * dpr;
	canvas.height = height * dpr;
	canvas.style.width = `${width}px`;
	canvas.style.height = `${height}px`;
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener("resize", resize);
resize();

const MOUSE_RADIUS = 100;

// --- Settings panel -------------------------------------------------------
// Each slider has a name, like name="speed". readSliders() copies its value
// into settings.speed, so everything else just reads from settings.
const settings = {};
const panel = document.getElementById("panel");
const sliders = panel.querySelectorAll("input");

function readSliders() {
	for (const slider of sliders) {
		settings[slider.name] = Number(slider.value);
		slider.previousElementSibling.textContent = slider.value; // the <output> showing the number
	}
}
for (const slider of sliders) {
	slider.addEventListener("input", readSliders);
}
readSliders();

document.getElementById("reset").addEventListener("click", () => {
	// defaultValue is the value="" written in the HTML
	for (const slider of sliders) {
		slider.value = slider.defaultValue;
	}
	readSliders();
});

// Start with the panel folded away on small screens, so the flock is visible
if (width < 600) panel.open = false;

// --- Mouse tracking -------------------------------------------------------
// Pointer events cover mouse, touch and pen with one set of listeners.
const mouse = { x: 0, y: 0, active: false };
function moveMouse(e) {
	mouse.x = e.clientX;
	mouse.y = e.clientY;
	mouse.active = true;
}
canvas.addEventListener("pointermove", moveMouse);
canvas.addEventListener("pointerdown", moveMouse); // a tap on a touch screen
canvas.addEventListener("pointerleave", () => {
	mouse.active = false;
});

// --- The Bird class -------------------------------------------------------
class Bird {
	constructor() {
		// Random position anywhere on screen
		this.x = Math.random() * width;
		this.y = Math.random() * height;

		// Random direction, fixed speed
		const angle = Math.random() * Math.PI * 2;
		this.vx = Math.cos(angle) * settings.speed;
		this.vy = Math.sin(angle) * settings.speed;

		// Steering pushes collected by the rules this frame, applied in update()
		this.ax = 0;
		this.ay = 0;
	}

	separate(birds) {
		let steerX = 0;
		let steerY = 0;

		for (const other of birds) {
			if (other === this) continue; // Don't compare to self

			const distSq = this.distanceSquared(other);
			if (distSq > 0 && distSq < settings.space * settings.space) {
				// Move away from the other bird
				steerX += (this.x - other.x) / distSq;
				steerY += (this.y - other.y) / distSq;
			}
		}
		this.ax += steerX * settings.separation;
		this.ay += steerY * settings.separation;
	}

	align(birds) {
		let avgVx = 0;
		let avgVy = 0;
		let count = 0;

		for (const other of birds) {
			if (other === this) continue; // Don't compare to self

			const distSq = this.distanceSquared(other);
			if (distSq > 0 && distSq < settings.vision * settings.vision) {
				avgVx += other.vx;
				avgVy += other.vy;
				count++;
			}
		}

		if (count > 0) {
			avgVx /= count;
			avgVy /= count;

			this.ax += (avgVx - this.vx) * settings.alignment;
			this.ay += (avgVy - this.vy) * settings.alignment;
		}
	}

	cohesion(birds) {
		let avgX = 0;
		let avgY = 0;
		let count = 0;

		for (const other of birds) {
			if (other === this) continue; // Don't compare to self

			const distSq = this.distanceSquared(other);
			if (distSq > 0 && distSq < settings.vision * settings.vision) {
				avgX += other.x;
				avgY += other.y;
				count++;
			}
		}

		if (count > 0) {
			avgX /= count;
			avgY /= count;

			this.ax += (avgX - this.x) * settings.cohesion;
			this.ay += (avgY - this.y) * settings.cohesion;
		}
	}

	avoidMouse() {
		if (!mouse.active) return;

		const dx = this.x - mouse.x;
		const dy = this.y - mouse.y;
		const dist = Math.hypot(dx, dy);
		if (dist > 0 && dist < MOUSE_RADIUS) {
			// Full strength right at the cursor, fading to 0 at the edge of the radius.
			// A negative setting flips the direction, so it pulls instead of pushes.
			const push = (1 - dist / MOUSE_RADIUS) * settings.mouse;
			this.ax += (dx / dist) * push;
			this.ay += (dy / dist) * push;
		}
	}

	update(dt) {
		// Apply this frame's steering, then clear it for next frame
		this.vx += this.ax * dt;
		this.vy += this.ay * dt;
		this.ax = 0;
		this.ay = 0;

		const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
		this.vx = (this.vx / speed) * settings.speed;
		this.vy = (this.vy / speed) * settings.speed;

		this.x += this.vx * dt;
		this.y += this.vy * dt;

		// Wrap around edges. % keeps the remainder, so 810 % 800 = 10.
		// Adding width first stops negatives: (-5 + 800) % 800 = 795.
		this.x = (this.x + width) % width;
		this.y = (this.y + height) % height;
	}

	distanceSquared(other) {
		const dx = this.x - other.x;
		const dy = this.y - other.y;
		return dx * dx + dy * dy;
	}

	draw() {
		// Draw a little triangle pointing where the bird is heading.
		// save/translate/rotate/restore = move the "pen" to the bird,
		// turn it to face the velocity, draw, then put the pen back.
		ctx.save();
		ctx.translate(this.x, this.y);
		ctx.rotate(Math.atan2(this.vy, this.vx));

		ctx.beginPath();
		ctx.moveTo(8, 0); // nose
		ctx.lineTo(-5, 4); // back-left
		ctx.lineTo(-5, -4); // back-right
		ctx.closePath();
		ctx.fillStyle = "#7dd3fc";
		ctx.fill();

		ctx.restore();
	}
}

// --- The flock ------------------------------------------------------------
// Starts empty. frame() adds or removes birds to match the Birds slider.
const birds = [];

// --- Game loop (like `while running:` in pygame) --------------------------
let lastTime = performance.now();

function frame(now) {
	// dt = how many 60fps frames' worth of time passed since the last frame:
	// 1 on a 60Hz screen, 0.5 on 120Hz. Movement gets multiplied by it, so the
	// flock flies at the same speed on any display (like pygame's clock.tick).
	// Capped at 3 so coming back to a hidden tab doesn't fling everyone across.
	const dt = Math.min((now - lastTime) / (1000 / 60), 3);
	lastTime = now;

	// Match the flock to the Birds slider
	while (birds.length < settings.count) birds.push(new Bird());
	birds.length = settings.count;

	// Clear the screen (like screen.fill(...))
	ctx.fillStyle = "#0e1117";
	ctx.fillRect(0, 0, width, height);

	// Faint ring showing the mouse's push radius
	if (mouse.active) {
		ctx.beginPath();
		ctx.arc(mouse.x, mouse.y, MOUSE_RADIUS, 0, Math.PI * 2);
		ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
		ctx.stroke();
	}

	// Pass 1: every bird decides how to steer, looking at the same snapshot.
	// Rules only write to ax/ay, so nobody's x/vx changes during this pass.
	for (const bird of birds) {
		bird.separate(birds);
		bird.align(birds);
		bird.cohesion(birds);
		bird.avoidMouse();
	}

	// Pass 2: now that everyone has decided, everyone moves.
	for (const bird of birds) {
		bird.update(dt);
		bird.draw();
	}

	// Ask the browser to call frame() again before the next repaint.
	// This replaces pygame's while-loop + display.flip().
	requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
