# Square Peg — analysis for a second game (draft for discussion)

## 1. The theorem behind it

**Toeplitz' conjecture (1911), a.k.a. the inscribed square problem or square peg problem:**
every simple closed curve in the plane (a loop that does not cross itself) contains four points
that are the corners of a square.

Status, which matters a lot for the game design:

- **Open in general.** Nobody has proven it for arbitrary continuous loops. That is the headline
  that makes it attractive: "an unsolved problem you can play with".
- **Proven for every loop you can actually draw.** Convex curves (Emch, 1913–16), smooth curves
  and "locally monotone" curves (Stromquist, 1989), piecewise analytic curves, and simple
  polygons. Anything drawn with a finger or mouse and stored as a polyline is a simple polygon,
  so the theorem holds for it. The open case is wild, fractal-like curves nobody can draw.
- **Counting.** For a generic smooth curve the number of inscribed squares is odd (the proof is a
  parity argument), so there is at least one and typically a few. Special curves break genericity:
  a circle has infinitely many, a square has a continuum of them.
- **The "simple" condition is essential.** A loop that goes out along a line segment and comes
  straight back along the same segment is a closed curve with no inscribed square at all (all its
  points are collinear). So "no crossing, no retracing" is not a technicality; it is the whole
  theorem.
- Related results worth a line in an explainer: Greene & Lobb (2020) proved that every smooth
  loop contains a rectangle of *every* aspect ratio. Tao (2017) proved a special case for squares.
  The 3Blue1Brown video "Who cares about topology? (Inscribed rectangle problem)" is the
  popular treatment most people know; it is about rectangles, not squares. Survey: Matschke,
  "A survey on the square peg problem", Notices of the AMS, 2014.

## 2. The two directions

### a. Player draws the loop, computer finds the square ("try to break it")

- The player draws a loop, the computer immediately shows the square(s).
- Honest framing: since the theorem is proven for drawn loops, **the player can never win**.
  The computer will always find a square, and "disproving" is theatre. That is fine for a toy or
  demo (it is genuinely delightful to draw an absurd shape and watch the square appear), but it is
  not a game: there is no score, no progression, no failure.
- Ways to turn it into a game anyway, all weaker than (b):
  - "Draw a loop with exactly one square" / "with as many squares as possible". Scoring is the
    square count, which the solver gives for free. Mildly interesting; most doodles have 1–5.
  - "Draw a loop whose smallest square is as small as possible relative to the loop". Encourages
    thin spiky shapes. Niche.
  - Allow self-crossing loops and ask "can you draw a *crossing* loop with no square?" Here the
    theorem gives no guarantee, so the exploration is real. The degenerate answer (retrace a
    line) exists; whether a non-degenerate one does is a nice open-ended hunt. Risky as a core
    loop, good as a lab experiment.
- What (a) is good for: it is the fastest way to test the solver, it is the obvious **sandbox /
  lab tab** inside the game, and it is the explainer: "see for yourself, every loop has one".

### b. Computer draws the loop, player finds the square ("keep up with the theorem")

- The computer generates a loop, counts its squares with the solver, and tells the player "this
  loop hides 3 squares. Find them."
- The player's input is the interesting design problem. Four points on a one-dimensional curve is
  a four-parameter search, but **two points determine the square**: pick two points on the loop as
  a side and the other two corners are fixed (two choices, one on each side of the chord). Or pick
  two points as a diagonal and the other two are fixed (one choice). So the natural controls are:
  drag two handles along the loop, and the computer completes the square as a ghost. The player
  sees how far the two free corners miss the curve and closes in. When both are within a
  tolerance, the game snaps to the exact square (refined by the solver) and celebrates.
- Difficulty is a dial on how much the computer helps, analogous to ghost / counter / blind in the
  mouse:
  - *Ghost*: the completed square is drawn live while dragging. Finding a square takes maybe
    15–40 seconds; relaxing, good for learning what inscribed squares look like.
  - *Probe*: the square is only shown after the player releases; each release is a probe and the
    score is the number of probes. Feels like hot-and-cold.
  - *Blind*: only a number ("the free corners miss by 23 and 41") or just hot/cold. Hard.
  - *Full*: the player places all four points, the computer only says how square it is.
- Content: a seeded random loop per day ("Square Peg #37") makes it a daily puzzle with a
  shareable result ("3/3 squares, 7 probes, 2:14"), which matches the Wordle habit the mouse's
  share feature already assumes. Seeded generation also gives unlimited free play by number.
- Why (b) is the game and (a) is not: (b) has a goal with a known finish (all N squares), failure
  (give up / probe limit), a difficulty dial, scoring, and a daily rhythm. It also uses the theorem
  rather than fighting it: the count is *known*, so the player is never searching for something
  that is not there.

### Recommendation

Build the solver first (shared by both), then (a) as the lab tab, since it is the quickest way
to see what squares look like on real shapes and to tune the tolerance and the generator, then
(b) as the game. Ship both in one page: Daily (b) + Lab (a) + an explainer page like
`maths.html`.

## 3. The solver

Input: a closed polyline with `n` segments (hand-drawn or generated). Output: all inscribed
squares above a minimum size, each as four curve parameters.

**Preprocessing**

- Hand-drawn stroke → polyline. Simplify with Ramer–Douglas–Peucker (ε ≈ 2 px) to 30–150
  segments, close the loop, optionally smooth with a couple of Chaikin passes so the shape is
  generic (no long straight runs, which can produce continua of squares).
- Reject self-intersections (O(n²) segment-pair test, trivial at this size) with "your loop
  crosses itself, try again". Also reject near-retracing (two long nearly coincident runs), which
  is the degenerate counterexample.

**Finding squares: hybrid discrete search + exact refinement**

1. Sample `m ≈ 400–800` points evenly along the loop. For every pair (p, q) compute the two
   squares with pq as a side and check how far the other two corners are from the polyline
   (nearest-point query, with a uniform grid so each query is O(1)). O(m²) ≈ a few hundred
   thousand checks, well under 100 ms in JS. Keep pairs where both corners are within a few
   sample spacings.
2. Each candidate names four segments (i, j, k, l). On a polyline a square with corners on those
   four segments is a **linear problem**: put P(s) on segment i and Q(t) on segment j, then the
   other corners R = Q + rot90(Q−P) and S = P + rot90(Q−P) are affine in (s, t), and requiring R
   on line k and S on line l gives two linear equations in two unknowns. Solve, check that all
   four parameters lie in [0, 1]. This gives the exact square (up to floating point), not a sample
   approximation.
3. Dedupe: the same square is found from each of its four sides and both orientations, and from
   neighbouring sample pairs. Merge by centre, size, and angle mod 90°.
4. Drop squares smaller than, say, 5 % of the loop's diameter; they come from sampling noise at
   sharp corners, not from the shape.

The fully exact alternative (try all segment quadruples) is O(n⁴): 10⁸ for n = 100, about a
second in JS. Not needed for play, but useful as a reference implementation in a Python prototype
to check the hybrid misses nothing.

**Sanity check that catches most solver bugs:** on random smooth loops the count must be odd. An
even count means a missed square or a failed dedupe.

**Generator for (b):** radial Fourier `r(θ) = 1 + Σ a_k cos(kθ + φ_k)` for k = 2..6 with small
random amplitudes gives smooth, star-shaped, never self-crossing loops. A periodic spline
through 6–10 jittered points around a circle gives more character (dents, lobes) and needs the
self-intersection check with a retry. Seed with the day number (mulberry32 or similar) so
everyone gets the same loop; reject loops with 1 square (too easy) or more than ~5 (tedious), or
use the count to set the day's difficulty.

**Player interaction:** dragging a handle = project the pointer onto the polyline (nearest point),
move along it. Completing the square from two handles is a few lines. Snap when both free corners
are within ~2 % of the diameter; then run step 2 above to land on the exact square.

## 4. Where does it live: new folder or rename mouse to a container?

**Recommendation: new folder, new repo, new Vercel project, own subdomain** (e.g.
`square.romke.com`, following the `mouse.romke.com` pattern, and the local convention
`project/private/<name>/git/<name>`). Do the "container" at the landing-page level later, not at
the repo level.

Why:

- **Zero risk to the live game.** `main` auto-deploys mouse. Turning the repo into a container
  means moving `index.html` to `/mouse/`, adding host-based rewrites in `vercel.json` to keep
  `mouse.romke.com` working, re-scoping the service worker (it caches from the root and would
  cache the other game's files), splitting the manifest, and re-testing the installed PWA. All
  doable, all for no gain the player sees.
- **The shared code is small and stable.** What would be shared: `lib/kv.js`, `api/like.js`,
  `api/feedback.js`, `api/event.js`, `api/stats.js`, `scripts/fakekv.js`, `stats.html`, the
  manifest/SW/icon pattern: about 300 lines that have not changed in shape since they worked.
  Copy them; `event.js` needs its own whitelist of event names anyway.
- **Redis keys are not prefixed.** `ev:*`, `runs`, likes, feedback all assume one game. Sharing the
  store would mean a key migration or prefixing in the live game. A new project gets its own
  Upstash database from the marketplace and avoids this.
- **The one-file-no-build philosophy is per game.** Each game's `index.html` is self-contained;
  a shared build or shared JS module would be the first build step, which the mouse deliberately
  avoids.
- **Metadata is per game.** OG image, title, canonical URL, manifest, icons, analytics host check:
  all of it is game-specific already.

When to revisit: at game three, or when a change to the API has to be made in two places and it
annoys. Then extract `lib/` + `api/` into a tiny shared package or a monorepo with two Vercel
projects pointing at subfolders (Vercel supports a root directory per project, so a monorepo does
not force one deployment). A `romke.com` games index page linking both is the user-facing
"container" and costs nothing now.

What does carry over from mouse as a pattern: the DESIGN.md-first process, level/mode structure
(ghost / probe / blind), the maths explainer page, likes + feedback + counters, the stats page,
the installable PWA, the share text.

## 5. Proposed MVP

1. Python prototype (like `solve.py`): polyline solver, generator, odd-count check, a PNG or two
   of random loops with their squares. Half a day, and it settles tolerance and size thresholds.
2. `index.html` with the Lab: draw a loop, see the squares. Tests the solver on real strokes and
   touch input.
3. Daily: seeded loop, square count shown, two draggable handles, ghost mode, snap and celebrate,
   "found k of N", timer and probe count, share text.
4. Probe and blind modes, free play by number, likes/feedback/counters copied from mouse.
5. `maths.html`-style explainer: the theorem, what is proven, the retraced-segment
   counterexample, why the count is odd.

## 6. Questions for you

1. Daily loop as the core, or levels like the mouse (loops of increasing square count /
   decreasing help)?
2. Side-based handles (two points as a side, two ghost squares) or diagonal-based (two points as a
   diagonal, one ghost square)? Side-based gives two candidates per drag, which is more to look
   at but doubles the chance of a near miss; diagonal-based is cleaner. Prototype both in the Lab.
3. Should the Lab allow self-crossing loops with a warning, so the "crossing loop with no
   square" hunt is possible?
4. Name. "Square Peg" is the problem's nickname; alternatives: "Four Corners", "Inscribed",
   "Toeplitz". The URL and the icon (a wobbly loop with a square inside) follow from it.

## 7. Decisions (19 Oct 2026)

1. Daily loop is the core, with history: any earlier day can be opened and solved too.
2. Side-based vs diagonal-based handles: both implemented as a toggle, decide after playing.
3. Lab allows self-crossing loops with a warning, for exploration.
4. Name: **Square Peg**. Folder `project/private/squarepeg/git/squarepeg`.
