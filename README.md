# quirks.

Little simulations, toys and tools, written in plain HTML, CSS and JavaScript.

**Play with them at [quirks-gamma.vercel.app](https://quirks-gamma.vercel.app).**

No frameworks, no build step, nothing to install. Every quirk is a small page you can open, play with, and read the source of. The code is commented so you can follow along.

This is a just-for-fun project where I learn by building. It's part handwritten, part vibe coded, with AI helping me understand things, fill in gaps and figure out how stuff works. Whenever something clicks, it becomes a quirk and goes up here. Don't expect polish, just curiosity.

| Quirk | What it does |
| --- | --- |
| [Flock simulation](flock/) | A flock of birds following three simple rules. Move your mouse through them, or tweak the rules with the sliders. |
| [ASCII video](ascii-video/) | Turns a video or your camera into moving ASCII art, live in the browser. Pick a character set, add color, save a frame. |
| [Game of Life](game-of-life/) | Cells live or die by counting their neighbours. Draw your own patterns and watch them grow. |
| [Rain](rain/) | Drops falling at different depths, in purple, blue, or black and yellow. Change the amount, speed and wind. |
| [Falling sand](sand/) | Pour sand and water, draw walls, and watch it all pile up and slosh around. Turn on Colorful for rainbow sand. |
| [Chaos game](chaos-game/) | Jump halfway toward a random corner, over and over, and a fractal appears out of the noise. |
| [Cloth](cloth/) | Pull, cut and tear a sheet of fabric made of points and little sticks. |

## Running it locally

Serve the folder with any static file server, then open the address it prints:

```sh
pnpm dlx serve
# or
uv run python -m http.server
```

(Opening `index.html` straight from disk mostly works, but links like `flock/` show a folder listing instead of the page, and the camera may be blocked.)

## How it's laid out

```
index.html, style.css   the home page, with a box for each quirk
favicon.svg, fonts/      shared by the home page
flock/                   one folder per quirk
ascii-video/
game-of-life/
rain/
sand/
chaos-game/
cloth/
```

Each quirk folder stands on its own. It has its own `index.html` and its own styles and scripts, and it doesn't depend on or link to anything outside its folder. The `preview.webp` inside is only for the home page.

## Adding a quirk

1. Make a folder named after it, e.g. `sand/`, with an `index.html` inside. Put the CSS and JS in that page, or next to it as separate files, whichever reads better.
2. Take a screenshot of it doing something nice, at 1100 × 688, and save it in the folder as `preview.webp`.
3. On the home page (`index.html`), copy one of the `<article class="quirk">` boxes and fill it in: the next number, a label (Simulation, Toy, Tool...), the screenshot, a name and subtitle, and a short description. Underneath goes the longer write-up that "Read more" opens: the idea and why it's interesting on the left, and how it works "under the hood" on the right. Give the write-up its own `id`, and put that id in the button's `aria-controls`.
4. Add its name to the marquee band too. The text is written out twice, so add it to both halves.

A few rules keep things easy to read:

- **Plain web only.** HTML, CSS and JavaScript the browser runs as-is. No frameworks, libraries, bundlers or `package.json`.
- **Nothing leaves the page.** No CDNs, trackers or uploads. Anything a quirk needs lives in its folder.
- **Comment the why.** Write as if the reader is new to it: what a trick does and why it's needed, not just what the line says.
- **Small and focused.** One idea per quirk. Named constants at the top for the numbers worth tweaking.

## License

The code is dedicated to the public domain under [CC0 1.0](LICENSE). Do whatever you like with it.

The fonts in `fonts/` (Asap and Courier Prime) keep their own [SIL Open Font License](fonts/).
