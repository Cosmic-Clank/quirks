// Rain: drops falling at different depths. Far-away drops are short, faint
// and slow, close ones are long, bold and fast. That difference alone makes
// a flat screen feel deep (it's called parallax).

const canvas = document.getElementById("sky");
const ctx = canvas.getContext("2d");
const panel = document.getElementById("panel");
const themeSelect = document.getElementById("theme");

// The background and the rain color for each option in the Colors menu.
const THEMES = {
	purple: { sky: "#e6e6fa", rain: "#8a2be2" },
	ocean: { sky: "#d6ecfa", rain: "#1e5aa8" },
	midnight: { sky: "#0f0f12", rain: "#f5c518" },
	ink: { sky: "#f4f1ea", rain: "#1c1c1c" },
};

// Screen size in CSS pixels.
let width = 0;
let height = 0;

function resize() {
	width = window.innerWidth;
	height = window.innerHeight;

	// Phones and most laptops have 2-3 real pixels per CSS pixel. Give the canvas
	// that many so the drops stay sharp, then scale all drawing up to match.
	const dpr = window.devicePixelRatio || 1;
	canvas.width = width * dpr;
	canvas.height = height * dpr;
	canvas.style.width = `${width}px`;
	canvas.style.height = `${height}px`;
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener("resize", resize);
resize();

// --- Settings panel -------------------------------------------------------
// Each slider has a name, like name="speed". readSliders() copies its value
// into settings.speed, so everything else just reads from settings.
const settings = {};
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

// Start with the panel folded away on small screens, so the rain is visible
if (width < 600) panel.open = false;

// --- Drops ----------------------------------------------------------------
// A drop is just three numbers. z is its depth: 0 = far back, 1 = right in front.
function newDrop(anywhere) {
	return {
		x: Math.random() * width,
		// At the very start, scatter drops over the whole screen. After that,
		// new drops start a little above the top edge, out of sight.
		y: anywhere ? Math.random() * height : -Math.random() * 100,
		z: Math.random(),
	};
}

// Starts empty. frame() adds or removes drops to match the Amount slider.
const drops = [];

// --- Main loop ------------------------------------------------------------
let lastTime = performance.now();

function frame(now) {
	// dt = how many 60fps frames' worth of time passed since the last frame:
	// 1 on a 60Hz screen, 0.5 on 120Hz. Movement gets multiplied by it, so the
	// rain falls at the same speed on any display.
	const dt = Math.min((now - lastTime) / (1000 / 60), 3);
	lastTime = now;

	// Match the number of drops to the Amount slider
	while (drops.length < settings.amount) drops.push(newDrop(true));
	drops.length = settings.amount;

	const theme = THEMES[themeSelect.value];
	ctx.fillStyle = theme.sky;
	ctx.fillRect(0, 0, width, height);
	ctx.strokeStyle = theme.rain;
	ctx.lineCap = "round";

	for (let i = 0; i < drops.length; i++) {
		const drop = drops[i];

		// Depth decides everything: closer drops are longer and faster.
		const length = 8 + drop.z * 22;
		const speed = (3 + drop.z * 9) * settings.speed;

		// Fall down, and drift sideways with the wind
		drop.y += speed * dt;
		drop.x += speed * settings.wind * dt;

		// Fell off the bottom? Start a fresh drop at the top instead.
		if (drop.y - length > height) {
			drops[i] = newDrop(false);
			continue;
		}
		// Blown off a side? Wrap around to the other one.
		drop.x = (drop.x + width) % width;

		// Closer drops are also thicker and less see-through.
		ctx.globalAlpha = 0.3 + drop.z * 0.7;
		ctx.lineWidth = 1 + drop.z * 2;

		// A line from the drop's head back up along the way it's falling,
		// so the wind tilts it too.
		ctx.beginPath();
		ctx.moveTo(drop.x, drop.y);
		ctx.lineTo(drop.x - settings.wind * length, drop.y - length);
		ctx.stroke();
	}
	ctx.globalAlpha = 1;

	requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
