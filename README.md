# Schrödinger's Mouse

A mouse hides in a ring of holes and moves to a neighbouring hole every night.
Each day you open two holes. How quickly can you be *sure* to catch it?

Play it: https://mouse-alpha.vercel.app

- `index.html`: the whole game, one file, no build step.
- `maths.html`: the explainer (the cloud, parity, the par table, an optimal 13-hole run).
- `stats.html`: private stats page, needs the `STATS_TOKEN`.
- `api/`: four small Vercel functions: likes, feedback, gameplay counters, stats. `lib/kv.js` talks to the Redis store.
- `manifest.webmanifest`, `sw.js`, icons: installable as an app, works offline.
- `DESIGN.md`: the puzzle, the rules, and the design decisions.
- `solve.py`: brute-force solver used to verify par for each board size.

## Running locally

Game only (no likes, feedback or counters):

    python3 -m http.server 8000

Everything, including the API functions, against an in-memory fake store:

    node scripts/fakekv.js &          # Upstash-compatible fake Redis on port 8799
    vercel dev --listen 127.0.0.1:3000

with a `.env` file (ignored by git) containing:

    KV_REST_API_URL=http://127.0.0.1:8799
    KV_REST_API_TOKEN=local
    STATS_TOKEN=localtest

## Production configuration (Vercel)

- Storage: Upstash for Redis from the Vercel Marketplace, connected to the project. It sets
  `KV_REST_API_URL` and `KV_REST_API_TOKEN`. Without them the API answers 503 and the game still works.
- `STATS_TOKEN`: any long secret; it unlocks `/stats.html`.
- Web Analytics: enable it in the project's Analytics tab. The page only loads the script on
  `mouse.jnkr.nl` and `*.vercel.app`.


## Credits

The game is a playable version of the classic "13 Caves and a Thief" brain teaser, a puzzle widely
reported as a Google interview question: a thief hides in one of thirteen caves arranged in a circle
and moves to a neighbouring cave every night; two police officers can search two caves a day. How
many days until they are sure to catch him? The idea came from the reel
["Can You Solve This Google Puzzle?"](https://www.instagram.com/reel/Dem9An-N2OU/) by
[@piratecodeofficial](https://www.instagram.com/piratecodeofficial/) on Instagram. Write-ups of the original: [AfterAcademy](https://afteracademy.com/puzzle/13-caves-and-a-thief),
[CrazyForCode](http://www.crazyforcode.com/13-caves-thief-puzzle/).
