const fileInput = document.getElementById("file-input");
const cameraButton = document.getElementById("camera-button");
const pauseButton = document.getElementById("pause-button");
const widthSlider = document.getElementById("width-slider");
const widthValue = document.getElementById("width-value");
const colorToggle = document.getElementById("color-toggle");
const message = document.getElementById("message");
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const display = document.getElementById("display");
const main = document.querySelector("main");

// willReadFrequently tells the browser we'll read pixels back every frame,
// so it keeps the canvas in regular memory instead of on the GPU.
const ctx = canvas.getContext("2d", { willReadFrequently: true });

// The visible canvas. We only draw onto this one, never read from it.
const displayCtx = display.getContext("2d");

const FONT = '"Courier New", Consolas, monospace';

// Text color in monochrome mode.
const MONO_COLOR = "#eee";

// Our "ramp": characters ordered from darkest to brightest. On a black
// background a space is darkest (nothing drawn) and '$' is brightest (lots of ink).
// This is Paul Bourke's well-known 70-character ramp, flipped to go dark-to-bright.
// More steps means smoother shading. If it looks too noisy, try the short one:
// const RAMP = " .:-=+*#%@";
const RAMP = " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";

// <main> has 16px padding on each side, so we lose 32px of space in each direction.
const MAIN_PADDING = 32;

// Characters are taller than they are wide. Instead of guessing the ratio,
// we ask the browser: draw 'M' at 100px and see how wide it comes out.
// In a monospace font every character has this same width.
displayCtx.font = `100px ${FONT}`;
const CHAR_ASPECT = displayCtx.measureText("M").width / 100;

// How many characters across each ASCII frame is. Controlled by the slider.
let columns = Number(widthSlider.value);

// Size of one character "cell" on the display canvas, in CSS pixels.
// resize() works these out.
let cellWidth = 0;
let cellHeight = 0;

// Draw each character in its pixel's real color?
let colorMode = colorToggle.checked;

// The live camera stream, when the camera is on. null otherwise.
let stream = null;

// Flip the picture left-to-right? We do this for the camera so it acts like a
// mirror. Without it, raising your right hand looks like raising your left.
let mirrored = false;

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

// Size both canvases for the current column count and video shape, so the
// whole ASCII picture fits on screen.
function resize() {
	// No video loaded yet, so we don't know its shape.
	if (!video.videoWidth) return;

	// The small source canvas: one pixel per character. Fewer rows than a
	// square-pixel image would have, because each character is tall and thin.
	canvas.width = columns;
	canvas.height = Math.max(1, Math.round(columns * (video.videoHeight / video.videoWidth) * CHAR_ASPECT));

	// Biggest font size where all columns fit across AND all rows fit down.
	const availableWidth = main.clientWidth - MAIN_PADDING;
	const availableHeight = main.clientHeight - MAIN_PADDING;
	const fontSize = Math.min(availableWidth / (canvas.width * CHAR_ASPECT), availableHeight / canvas.height);
	cellWidth = fontSize * CHAR_ASPECT;
	cellHeight = fontSize;

	// A canvas has two sizes: how big it looks on the page (CSS size) and how
	// many real pixels it has inside. On a high-DPI screen (most laptops and
	// phones) 1 CSS pixel = 2+ real pixels, so we give the canvas extra pixels
	// or the text comes out blurry.
	const cssWidth = canvas.width * cellWidth;
	const cssHeight = canvas.height * cellHeight;
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

fileInput.addEventListener("change", () => {
	const file = fileInput.files[0];
	if (!file) return;

	stopCamera();
	stopFile();
	message.textContent = "";

	// Turn the picked file into a temporary URL the <video> element can play.
	video.src = URL.createObjectURL(file);
	mirrored = false;
	video.play();
});

cameraButton.addEventListener("click", async () => {
	try {
		// Asks the user for permission the first time. `await` pauses here until
		// they answer. If they say no (or there's no camera), it throws.
		const newStream = await navigator.mediaDevices.getUserMedia({ video: true });

		stopCamera();
		stopFile();
		message.textContent = "";

		// A live stream goes in srcObject, not src: it isn't a file with a URL.
		stream = newStream;
		video.srcObject = stream;
		mirrored = true;
		video.play();
	} catch (err) {
		message.textContent = `Couldn't open the camera: ${err.message}`;
	}
});

pauseButton.addEventListener("click", () => {
	if (video.paused) {
		video.play();
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

// 'input' fires continuously while dragging; 'change' only fires on release.
widthSlider.addEventListener("input", () => {
	columns = Number(widthSlider.value);
	widthValue.textContent = columns;
	resize();
});

colorToggle.addEventListener("change", () => {
	colorMode = colorToggle.checked;
	drawFrame();
});

window.addEventListener("resize", resize);

// Once the video knows its real size we can lay everything out.
// This fires for both files and the camera.
video.addEventListener("loadedmetadata", () => {
	pauseButton.disabled = false;
	resize();
});

// Read the small canvas's pixels and draw them as characters on the display.
function drawAscii() {
	const { width, height } = canvas;

	// data is a flat array of numbers: [r, g, b, a, r, g, b, a, ...],
	// 4 entries per pixel, row by row from the top-left corner.
	const { data } = ctx.getImageData(0, 0, width, height);

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
			const brightness = 0.299 * r + 0.587 * g + 0.114 * b; // 0..255

			// Map 0..255 onto 0..RAMP.length-1 and pick that character.
			const index = Math.round((brightness / 255) * (RAMP.length - 1));
			const char = RAMP[index];

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
	ctx.save();
	if (mirrored) {
		ctx.translate(canvas.width, 0);
		ctx.scale(-1, 1);
	}
	ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
	ctx.restore();

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

// Jumping to a new spot while paused doesn't trigger the callback above
// (our video is hidden, so the browser never "presents" that frame), so
// redraw by hand once the jump finishes.
video.addEventListener("seeked", drawFrame);
