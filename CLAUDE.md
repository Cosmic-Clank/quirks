# quirks

A public repo of small, fun browser toys and simulations. The point is that anyone can open a quirk, play with it, and read code that is simple and well-commented. README.md covers the layout and the steps for adding a quirk. Follow it.

- Vanilla HTML/CSS/JS only. No frameworks, libraries, CDNs, build step or package.json. Don't add tooling.
- Each quirk is a fully independent folder (`name/index.html` plus optional css/js). It never links to or loads anything outside its folder: no link back home, no shared favicon or fonts.
- A new quirk also needs: a `preview.webp` screenshot (1100 × 688, showing it in a nice state) in its folder; one self-contained `<article class="quirk">` box in `index.html` with the screenshot, name, subtitle, short description, Play and Read more, and the hidden write-up Read more expands in place (the idea and why it is interesting, plus an "Under the hood" box with numbered steps); an entry in both halves of the marquee; and a row in the README table. Never describe a quirk in two separate places on the home page.
- This is a learning project. Always pick the simplest, most readable code over clever or compact code, even if it's a few lines longer. Clean and friendly, never a pile of mess.
- Comments are for beginners: explain the why in plain words. Keep the existing style: tabs in JS, named constants at the top, one script per quirk named after it (e.g. `flock/flock.js`), and a short comment at the top of each script explaining the idea.
- Movement is time-based so it runs the same on any refresh rate (a `dt` multiplier, or fixed-size steps / dots per second from an accumulator), and every quirk works on phones (pointer events, `touch-action: none` where you drag, controls that fold or wrap).
- Check every quirk in a real browser at desktop and phone sizes before calling it done.
- The home page look (dark, dot grid, hard offset shadows, yellow/red/blue accents) lives in the CSS variables in `style.css`.
- Deployed as a static site on Vercel (project `quirks` in team `cosmic-clanks-projects`, live at https://quirks-gamma.vercel.app). Every push to `main` deploys automatically. `vercel.json` sets `trailingSlash`, so links point at folders, e.g. `flock/`.
- Commit as `Cosmic-Clank <77015527+Cosmic-Clank@users.noreply.github.com>` (set in the repo's local git config). Never put the owner's real name or email in commits or files.
