// Boids: separation, alignment and cohesion.

// --- Setup (like pygame.display.set_mode) -------------------------------
const canvas = document.getElementById("sky");
const ctx = canvas.getContext("2d"); // the "surface" we draw on

function resize() {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

const NUM_BOIDS = 200;
const MAX_SPEED = 1.5;
const SEPARATION_RADIUS = 25;
const SEPARATION_STRENGTH = 0.5;
const ALIGNMENT_RADIUS = 100;
const ALIGNMENT_STRENGTH = 0.05;
const COHESION_RADIUS = 100;
const COHESION_STRENGTH = 0.0005;
const MOUSE_RADIUS = 100;
const MOUSE_STRENGTH = 0.3;

// --- Mouse tracking -------------------------------------------------------
// Pointer events cover mouse, touch and pen with one set of listeners.
const mouse = { x: 0, y: 0, active: false };
canvas.addEventListener("pointermove", (e) => {
	mouse.x = e.clientX;
	mouse.y = e.clientY;
	mouse.active = true;
});
canvas.addEventListener("pointerleave", () => {
	mouse.active = false;
});
// --- The Boid class -------------------------------------------------------
class Boid {
	constructor() {
		// Random position anywhere on screen
		this.x = Math.random() * canvas.width;
		this.y = Math.random() * canvas.height;

		// Random direction, fixed speed
		const angle = Math.random() * Math.PI * 2;
		this.vx = Math.cos(angle) * MAX_SPEED;
		this.vy = Math.sin(angle) * MAX_SPEED;

		// Steering pushes collected by the rules this frame, applied in update()
		this.ax = 0;
		this.ay = 0;
	}

	separate(boids) {
		let steerX = 0;
		let steerY = 0;

		for (const other of boids) {
			if (other === this) continue; // Don't compare to self

			const distSq = this.distanceSquared(other);
			if (distSq > 0 && distSq < SEPARATION_RADIUS * SEPARATION_RADIUS) {
				// Move away from the other boid
				steerX += (this.x - other.x) / distSq;
				steerY += (this.y - other.y) / distSq;
			}
		}
		this.ax += steerX * SEPARATION_STRENGTH;
		this.ay += steerY * SEPARATION_STRENGTH;
	}

	align(boids) {
		let avgVx = 0;
		let avgVy = 0;
		let count = 0;

		for (const other of boids) {
			if (other === this) continue; // Don't compare to self

			const distSq = this.distanceSquared(other);
			if (distSq > 0 && distSq < ALIGNMENT_RADIUS * ALIGNMENT_RADIUS) {
				avgVx += other.vx;
				avgVy += other.vy;
				count++;
			}
		}

		if (count > 0) {
			avgVx /= count;
			avgVy /= count;

			this.ax += (avgVx - this.vx) * ALIGNMENT_STRENGTH;
			this.ay += (avgVy - this.vy) * ALIGNMENT_STRENGTH;
		}
	}

	cohesion(boids) {
		let avgX = 0;
		let avgY = 0;
		let count = 0;

		for (const other of boids) {
			if (other === this) continue; // Don't compare to self

			const distSq = this.distanceSquared(other);
			if (distSq > 0 && distSq < COHESION_RADIUS * COHESION_RADIUS) {
				avgX += other.x;
				avgY += other.y;
				count++;
			}
		}

		if (count > 0) {
			avgX /= count;
			avgY /= count;

			this.ax += (avgX - this.x) * COHESION_STRENGTH;
			this.ay += (avgY - this.y) * COHESION_STRENGTH;
		}
	}

	avoidMouse() {
		if (!mouse.active) return;

		const dx = this.x - mouse.x;
		const dy = this.y - mouse.y;
		const dist = Math.hypot(dx, dy);
		if (dist > 0 && dist < MOUSE_RADIUS) {
			// Full strength right at the cursor, fading to 0 at the edge of the radius
			const push = (1 - dist / MOUSE_RADIUS) * MOUSE_STRENGTH;
			this.ax += (dx / dist) * push;
			this.ay += (dy / dist) * push;
		}
	}

	update() {
		// Apply this frame's steering, then clear it for next frame
		this.vx += this.ax;
		this.vy += this.ay;
		this.ax = 0;
		this.ay = 0;

		const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
		this.vx = (this.vx / speed) * MAX_SPEED;
		this.vy = (this.vy / speed) * MAX_SPEED;

		this.x += this.vx;
		this.y += this.vy;

		// Wrap around edges
		if (this.x < 0) this.x += canvas.width;
		if (this.x > canvas.width) this.x -= canvas.width;
		if (this.y < 0) this.y += canvas.height;
		if (this.y > canvas.height) this.y -= canvas.height;
	}

	distanceSquared(other) {
		const dx = this.x - other.x;
		const dy = this.y - other.y;
		return dx * dx + dy * dy;
	}

	draw() {
		// Draw a little triangle pointing where the boid is heading.
		// save/translate/rotate/restore = move the "pen" to the boid,
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

// --- Create the flock -----------------------------------------------------
const boids = [];
for (let i = 0; i < NUM_BOIDS; i++) {
	boids.push(new Boid());
}

// --- Game loop (like `while running:` in pygame) --------------------------
function frame() {
	// Clear the screen (like screen.fill(...))
	ctx.fillStyle = "#0e1117";
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	// Faint ring showing the mouse's push radius
	if (mouse.active) {
		ctx.beginPath();
		ctx.arc(mouse.x, mouse.y, MOUSE_RADIUS, 0, Math.PI * 2);
		ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
		ctx.stroke();
	}

	// Pass 1: every boid decides how to steer, looking at the same snapshot.
	// Rules only write to ax/ay, so nobody's x/vx changes during this pass.
	for (const boid of boids) {
		boid.separate(boids);
		boid.align(boids);
		boid.cohesion(boids);
		boid.avoidMouse();
	}

	// Pass 2: now that everyone has decided, everyone moves.
	for (const boid of boids) {
		boid.update();
		boid.draw();
	}

	// Ask the browser to call frame() again before the next repaint (~60fps).
	// This replaces pygame's while-loop + display.flip() + clock.tick(60).
	requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
