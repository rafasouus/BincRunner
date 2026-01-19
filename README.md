# BincRunner

Lightweight endless runner built for GitHub Pages. This repository contains a
pre-built static version (HTML + assets) optimized for quick deployment.

## Features
- Canvas-based endless runner with progressive difficulty.
- Local leaderboard with remote sync fallback.
- Mobile and desktop controls (keyboard, touch, pointer).

## Controls
- Jump: `Space` or `ArrowUp`
- Duck: `ArrowDown`
- Touch/Click: tap or click to jump

## Run Locally
This is a static site. Serve the folder with any local web server:

```bash
python -m http.server
```

Then open:

```
http://localhost:8000/index.html
```

## Deploy on GitHub Pages
The project is already structured for Pages:
- `index.html` in the root
- `assets/` folder with JS/CSS/images
- `.nojekyll` to avoid Jekyll processing

Push to `main` and enable Pages for the repository root.

## Project Structure
```
/
├─ assets/
│  ├─ index-*.js
│  ├─ index-*.css
│  └─ img/
├─ index.html
├─ .nojekyll
└─ git-publicar.txt
```

## Notes
- The game loop and tuning values live inside the bundled file:
  `assets/index-*.js`. This repo does not include source files.
- If you want a source-based workflow (build step), keep a separate repo and
  publish only the build output here.
