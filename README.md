# Math puzzles

Small puzzle games with a bit of maths behind them, deployed together as one Vercel project.

- `puzzle/index.html`: the overview page, served at the root (`romke.com`). `puzzle/stats.html` is the
  private stats page for all games, served at `/stats` (needs the `STATS_TOKEN`), one tab per game.
- `mouse/`: **Schrödinger's Mouse**. A mouse hides in a ring of holes and moves to a neighbouring hole
  every night. Each day you open two holes. How quickly can you be *sure* to catch it?
  `index.html` is the whole game, `maths.html` the explainer, `DESIGN.md` the design notes,
  `solve.py` the brute-force par solver,
  plus the manifest, service worker and icons that make it installable and offline.
  Also served at `mouse.romke.com` (a host rewrite in `vercel.json` maps that domain onto `/mouse/`).
- `square/`: **Square Peg**. Every loop hides a square (Toeplitz' inscribed square problem). A loop a
  day, find its squares; or draw your own loop in the Lab. `index.html` is the page, `peg.js` the
  solver and loop generator shared with `gen.js`, which stocks `puzzles.json` with a loop per day
  (`node square/gen.js 400` tops the stock up to 400 days; existing days are never changed).
  `DESIGN.md` has the theorem and the design, `solve.py` a Python prototype of the solver.
- `pi/`: **Where π hides**. Ten small experiments where π turns up: a rolling wheel, Archimedes'
  polygons, squares filling a circle, darts, Buffon's needle, Galperin's bouncing blocks, coprime
  pairs, the Basel sum, the Leibniz series, the Mandelbrot neck and a pendulum. `index.html` is the whole page.
  Counters: a `start` per page view (level `p0`) and a `replay` the first time a tile is animated
  (level `p1`..`p11`, the tile's number).
- `api/`: four small Vercel functions shared by the games: likes, feedback, gameplay counters,
  stats. They take a `game` field (`mouse` by default, `square` or `pi`); the mouse keeps its original
  Redis keys, other games get a `:game` suffix. `lib/kv.js` talks to the Redis store.
- `vercel.json`: the rewrites. `mouse.romke.com/*` → `/mouse/*` (except `/api/`), and `/` → `/puzzle/`.

All pages reference their own files relatively, so each game works at its folder and, for the
mouse, at the root of its own domain.

## Running locally

Games only (no likes, feedback or counters, no host rewrites):

    python3 -m http.server 8000      # then open /mouse/ or /square/

Everything, including the API functions, against an in-memory fake store:

    node scripts/fakekv.js &          # Upstash-compatible fake Redis on port 8799
    vercel dev --listen 127.0.0.1:3000

with a `.env` file (ignored by git) containing:

    KV_REST_API_URL=http://127.0.0.1:8799
    KV_REST_API_TOKEN=local
    STATS_TOKEN=localtest

## Production configuration (Vercel)

- Domains: `romke.com` (the overview and every game under its folder) and `mouse.romke.com`
  (the mouse at the root, via the host rewrite). Adding a game needs no DNS: a new folder, a card on
  the overview page, and `api/event.js` and `lib/kv.js` told about its name.

- Storage: Upstash for Redis from the Vercel Marketplace, connected to the project. It sets
  `KV_REST_API_URL` and `KV_REST_API_TOKEN`. Without them the API answers 503 and the game still works.
- `STATS_TOKEN`: any long secret; it unlocks `/stats`.
- Web Analytics: enable it in the project's Analytics tab. The page only loads the script on
  `*.romke.com` and `*.vercel.app`.


## Credits

### Schrödinger's Mouse

The game is a playable version of the classic "13 Caves and a Thief" brain teaser, a puzzle widely
reported as a Google interview question: a thief hides in one of thirteen caves arranged in a circle
and moves to a neighbouring cave every night; two police officers can search two caves a day. How
many days until they are sure to catch him? The idea came from the reel
["Can You Solve This Google Puzzle?"](https://www.instagram.com/reel/Dem9An-N2OU/) by
[@piratecodeofficial](https://www.instagram.com/piratecodeofficial/) on Instagram. Write-ups of the original: [AfterAcademy](https://afteracademy.com/puzzle/13-caves-and-a-thief),
[CrazyForCode](http://www.crazyforcode.com/13-caves-thief-puzzle/).

### Square Peg

Toeplitz' conjecture (1911): every simple closed curve contains four points that form a square.
Open in general, proven for every curve you can draw. See `square/DESIGN.md` for references.
