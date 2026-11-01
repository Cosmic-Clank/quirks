# quirks

A public repo of small, fun browser toys and simulations. The point is that anyone can open a quirk, play with it, and read code that is simple and well-commented. README.md covers the layout and the steps for adding a quirk. Follow it.

- Vanilla HTML/CSS/JS only. No frameworks, libraries, CDNs, build step or package.json. Don't add tooling.
- Each quirk is a fully independent folder (`name/index.html` plus optional css/js). It never links to or loads anything outside its folder: no link back home, no shared favicon or fonts.
- A new quirk also needs a numbered card in `index.html` and an entry in both halves of the marquee, plus a row in the README table.
- Comments are for beginners: explain the why in plain words. Keep the existing style (tabs in JS, named constants at the top).
- The home page look (dark, dot grid, hard offset shadows, yellow/red/blue accents) lives in the CSS variables in `style.css`.
- Deployed as a static site on Vercel (`vercel.json` sets `trailingSlash`), so links point at folders, e.g. `boids/`.
- Commit as `Cosmic-Clank <77015527+Cosmic-Clank@users.noreply.github.com>` (set in the repo's local git config). Never put the owner's real name or email in commits or files.
