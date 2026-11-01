# quirks.

Little simulations, toys and tools, written in plain HTML, CSS and JavaScript.

No frameworks, no build step, nothing to install. Every quirk is a small page you can open, play with, and read the source of. The code is commented so you can follow along.

| Quirk | What it does |
| --- | --- |
| [Boids](boids/) | A flock of birds following three simple rules. Move your mouse through them. |
| [ASCII video](ascii/) | Turns a video or your camera into moving ASCII art, live in the browser. |

## Running it locally

Serve the folder with any static file server, then open the address it prints:

```sh
pnpm dlx serve
# or
uv run python -m http.server
```

(Opening `index.html` straight from disk mostly works, but links like `boids/` show a folder listing instead of the page, and the camera may be blocked.)

## How it's laid out

```
index.html, style.css   the home page with a card for each quirk
favicon.svg, fonts/      shared by the home page
boids/                   one folder per quirk
ascii/
```

Each quirk folder stands on its own. It has its own `index.html` and its own styles and scripts, and it doesn't depend on anything outside its folder.

## Adding a quirk

1. Make a folder named after it, e.g. `sand/`, with an `index.html` inside. Put the CSS and JS in that page, or next to it as separate files, whichever reads better.
2. Add a way back home somewhere on the page: `<a class="home-link" href="../">← quirks</a>`.
3. On the home page (`index.html`), copy one of the `<article class="card">` blocks. Give it the next number, a label (Simulation, Toy, Tool...), a name, and a sentence or two about it.
4. Add its name to the marquee band too. The text is written out twice, so add it to both halves.

A few rules keep things easy to read:

- **Plain web only.** HTML, CSS and JavaScript the browser runs as-is. No frameworks, libraries, bundlers or `package.json`.
- **Nothing leaves the page.** No CDNs, trackers or uploads. Anything a quirk needs lives in its folder.
- **Comment the why.** Write as if the reader is new to it: what a trick does and why it's needed, not just what the line says.
- **Small and focused.** One idea per quirk. Named constants at the top for the numbers worth tweaking.

## License

The code is dedicated to the public domain under [CC0 1.0](LICENSE). Do whatever you like with it.

The fonts in `fonts/` (Asap and Courier Prime) keep their own [SIL Open Font License](fonts/).
