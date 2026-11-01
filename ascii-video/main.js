// ASCII video: turns a video or your camera into moving text art.

const fileInput = document.getElementById("file-input");
const cameraButton = document.getElementById("camera-button");
const pauseButton = document.getElementById("pause-button");
const saveButton = document.getElementById("save-button");
const charsetSelect = document.getElementById("charset-select");
const detailSlider = document.getElementById("detail-slider");
const detailValue = document.getElementById("detail-value");
const colorToggle = document.getElementById("color-toggle");
const invertToggle = document.getElementById("invert-toggle");
const message = document.getElementById("message");
const hint = document.getElementById("hint");
const video = document.getElementById("video");
const tiny = document.getElementById("tiny");
const display = document.getElementById("display");
const main = document.querySelector("main");

// willReadFrequently tells the browser we'll read pixels back every frame,
// so it keeps the canvas in regular memory instead of on the GPU.
const tinyCtx = tiny.getContext("2d", { willReadFrequently: true });

// The visible canvas. We only draw onto this one, never read from it.
const displayCtx = display.getContext("2d");

const FONT = '"Courier New", Consolas, monospace';

// Text color in monochrome mode.
const MONO_COLOR = "#eee";

// Character sets, ordered from darkest to brightest. On a black background a
// space is darkest (nothing drawn) and the last character is brightest (lots of ink).
const CHARSETS = {
	// Paul Bourke's well-known 70-character ramp, flipped to go dark-to-bright.
	detailed: " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
	simple: " .:-=+*#%@",
	binary: " 01",
};

// <main> has 16px padding on each side, so we lose 32px of space in each direction.
const MAIN_PADDING = 32;

// Characters are taller than they are wide. Instead of guessing the ratio,
// we ask the browser: draw 'M' at 100px and see how wide it comes out.
// In a monospace font every character has this same width.
displayCtx.font = `100px ${FONT}`;
const CHAR_ASPECT = displayCtx.measureText("M").width / 100;

// Size of one character "cell" on the display canvas, in CSS pixels.
// resize() works these out.
let cellWidth = 0;
let cellHeight = 0;

// The live camera stream, when the camera is on. null otherwise.
let stream = null;

// Flip the picture left-to-right? We do this for the camera so it acts like a
// mirror. Without it, raising your right hand looks like raising your left.
let mirrored = false;

// --- Video sources --------------------------------------------------------

// Turn off the camera (its light goes off too) and detach it from the video.
function stopCamera() {
	if (!stream) return;
	stream.getTracks().forEach((track) => track.stop());
	stream = null;
	video.srcObject = null;
}

// Forget the current video file and free its temporary URL.
function stopFile() {
	if (!video.src) return;
	URL.revokeObjectURL(video.src);
	video.removeAttribute("src");
}

// Some browsers block playing a video with sound until you press something.
// If that happens, play() fails, the video waits paused, and Play starts it.
function play() {
	video.play().catch(() => {});
}

fileInput.addEventListener("change", () => {
	const file = fileInput.files[0];
	if (!file) return;

	stopCamera();
	stopFile();
	message.textContent = "";

	// Turn the picked file into a temporary URL the <video> element can play.
	video.src = URL.createObjectURL(file);
	mirrored = false;
	play();

	// Clear the picker, so choosing the same file again still counts as a change.
	fileInput.value = "";
});

cameraButton.addEventListener("click", async () => {
	try {
		// Asks the user for permission the first time. `await` pauses here until
		// they answer. If they say no (or there's no camera), it throws.
		// facingMode "user" means the front camera on phones.
		const newStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });

		stopCamera();
		stopFile();
		message.textContent = "";

		// A live stream goes in srcObject, not src: it isn't a file with a URL.
		stream = newStream;
		video.srcObject = stream;
		mirrored = true;
		play();
	} catch (err) {
		message.textContent = `Couldn't open the camera: ${err.message}`;
	}
});

video.addEventListener("error", () => {
	message.textContent = "Couldn't play that video. Try a different file.";
});

// --- Buttons and settings -------------------------------------------------

pauseButton.addEventListener("click", () => {
	if (video.paused) {
		play();
	} else {
		video.pause();
	}
});

// Keep the button label in sync with what the video is actually doing,
// rather than flipping it in the click handler. That way it stays right even
// when something else pauses or plays the video.
video.addEventListener("play", () => {
	pauseButton.textContent = "Pause";
});
video.addEventListener("pause", () => {
	pauseButton.textContent = "Play";
});

saveButton.addEventListener("click", () => {
	// A link with a download attribute saves what it points at instead of
	// opening it. toDataURL turns the canvas into a PNG the link can point at.
	const link = document.createElement("a");
	link.href = display.toDataURL("image/png");
	link.download = "ascii-video.png";
	link.click();
});

// Phones have less room, so start them with fewer, bigger characters.
if (window.innerWidth < 600) {
	detailSlider.value = 70;
	detailValue.textContent = 70;
}

// 'input' fires continuously while dragging; 'change' only fires on release.
detailSlider.addEventListener("input", () => {
	detailValue.textContent = detailSlider.value;
	resize();
});

// The rest of the settings are read fresh every frame, so all a change needs
// is a redraw (in case the video is paused and no new frame is coming).
charsetSelect.addEventListener("change", drawFrame);
colorToggle.addEventListener("change", drawFrame);
invertToggle.addEventListener("change", drawFrame);

// --- Layout ---------------------------------------------------------------

// Size both canvases for the current detail and video shape, so the whole
// ASCII picture fits on screen.
function resize() {
	// No video loaded yet, so we don't know its shape.
	if (!video.videoWidth) return;

	// The tiny source canvas: one pixel per character. Fewer rows than a
	// square-pixel image would have, because each character is tall and thin.
	const columns = Number(detailSlider.value);
	tiny.width = columns;
	tiny.height = Math.max(1, Math.round(columns * (video.videoHeight / video.videoWidth) * CHAR_ASPECT));

	// Biggest font size where all columns fit across AND all rows fit down.
	const availableWidth = main.clientWidth - MAIN_PADDING;
	const availableHeight = main.clientHeight - MAIN_PADDING;
	const fontSize = Math.min(availableWidth / (tiny.width * CHAR_ASPECT), availableHeight / tiny.height);
	cellWidth = fontSize * CHAR_ASPECT;
	cellHeight = fontSize;

	// A canvas has two sizes: how big it looks on the page (CSS size) and how
	// many real pixels it has inside. On a high-DPI screen (most laptops and
	// phones) 1 CSS pixel = 2+ real pixels, so we give the canvas extra pixels
	// or the text comes out blurry.
	const cssWidth = tiny.width * cellWidth;
	const cssHeight = tiny.height * cellHeight;
	const dpr = window.devicePixelRatio || 1;
	display.style.width = `${cssWidth}px`;
	display.style.height = `${cssHeight}px`;
	display.width = Math.round(cssWidth * dpr);
	display.height = Math.round(cssHeight * dpr);

	// Resizing a canvas resets all its settings, so set them again here.
	// The transform scales everything by dpr, so the rest of our code can keep
	// thinking in CSS pixels.
	displayCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
	displayCtx.font = `${fontSize}px ${FONT}`;
	// Position text by its top edge (the default is the baseline, near the bottom).
	displayCtx.textBaseline = "top";

	// Changing a canvas's size wipes it. If the video is paused, no new frame
	// is coming to redraw it for us, so redraw right now.
	drawFrame();
}

window.addEventListener("resize", resize);

// Once the video knows its real size we can lay everything out.
// This fires for both files and the camera.
video.addEventListener("loadedmetadata", () => {
	hint.hidden = true;
	display.hidden = false;
	pauseButton.disabled = false;
	saveButton.disabled = false;
	resize();
});

// The video's shape can change while it plays, e.g. turning a phone
// sideways with the camera on.
video.addEventListener("resize", resize);

// --- Drawing --------------------------------------------------------------

// Read the tiny canvas's pixels and draw them as characters on the display.
function drawAscii() {
	const { width, height } = tiny;
	const ramp = CHARSETS[charsetSelect.value];
	const colorMode = colorToggle.checked;
	const inverted = invertToggle.checked;

	// data is a flat array of numbers: [r, g, b, a, r, g, b, a, ...],
	// 4 entries per pixel, row by row from the top-left corner.
	const { data } = tinyCtx.getImageData(0, 0, width, height);

	// Clear last frame by painting the background black.
	displayCtx.fillStyle = "#000";
	displayCtx.fillRect(0, 0, width * cellWidth, height * cellHeight);

	// In monochrome every character is the same color, so set it once.
	if (!colorMode) displayCtx.fillStyle = MONO_COLOR;

	for (let y = 0; y < height; y++) {
		let row = "";
		for (let x = 0; x < width; x++) {
			// Where this pixel's red value lives in the flat array.
			const i = (y * width + x) * 4;
			const r = data[i];
			const g = data[i + 1];
			const b = data[i + 2];

			// Our eyes are most sensitive to green and least to blue, so a plain
			// average looks wrong. These weights are the standard "luma" formula.
			let brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255; // 0..1
			if (inverted) brightness = 1 - brightness;

			// Map 0..1 onto the ramp and pick that character.
			const char = ramp[Math.round(brightness * (ramp.length - 1))];

			if (colorMode) {
				// Each character gets its own color, so each needs its own fillText.
				// Spaces draw nothing, so skip them for free speed.
				if (char !== " ") {
					displayCtx.fillStyle = `rgb(${r} ${g} ${b})`;
					displayCtx.fillText(char, x * cellWidth, y * cellHeight);
				}
			} else {
				row += char;
			}
		}

		// In monochrome, draw the whole row in one call: far fewer fillText calls
		// (one per row instead of one per character), which is much faster.
		if (!colorMode) displayCtx.fillText(row, 0, y * cellHeight);
	}
}

// Convert the frame the video is showing right now into ASCII.
function drawFrame() {
	// readyState >= 2 means there's an actual frame available to draw.
	if (video.readyState < 2) return;

	// Draw the full-size frame squashed down into our tiny canvas.
	// For a mirror image: move the origin to the right edge, then flip the
	// x-axis so drawing goes right-to-left. save/restore undoes it afterwards.
	tinyCtx.save();
	if (mirrored) {
		tinyCtx.translate(tiny.width, 0);
		tinyCtx.scale(-1, 1);
	}
	tinyCtx.drawImage(video, 0, 0, tiny.width, tiny.height);
	tinyCtx.restore();

	drawAscii();
}

// The browser calls this once each time the video has a genuinely new frame:
// 30 times a second for a 30fps video, and not at all while paused.
function onVideoFrame() {
	drawFrame();

	// Like requestAnimationFrame, it only fires once, so ask again for the next frame.
	video.requestVideoFrameCallback(onVideoFrame);
}

video.requestVideoFrameCallback(onVideoFrame);
