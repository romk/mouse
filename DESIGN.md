# Schrödinger's Mouse — game design (draft for discussion)

## 1. The puzzle behind it

13 caves in a circle. A thief hides in one, and every night moves exactly one cave left or right.
Two policemen each search one cave per day. How many days until the thief is guaranteed caught?

The useful way to think about it: don't track the thief, track the **set of caves the thief could
be in** given everything the police have seen. Call that set the *cloud*.

- Day: the police open two caves. Those two are removed from the cloud. If nothing is left, the
  thief must have been in one of the opened caves: caught.
- Night: every cave in the cloud spreads to both its neighbours. The cloud grows back.

The police win when they shrink the cloud faster than the night regrows it. The "must move" rule is
what makes this possible: it forces a parity rhythm (odd caves tonight, even caves tomorrow) that
the police can exploit. The odd circle (13) breaks parity only at the seam between cave 13 and
cave 1, and the optimal strategy works that seam.

I brute-forced the answer (BFS over all 2^n clouds). Minimal guaranteed days, two openings per day:

| holes n          | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 |
|------------------|---|---|---|---|---|---|---|---|----|----|----|----|----|----|----|
| circle, must move| 1 | 2 | 2 | 4 | 4 | 6 | 6 | 8 | 8  | 10 | 10 | 12 | 12 | 14 | 14 |
| line, must move  | 1 | 2 | 2 | 2 | 3 | 4 | 4 | 6 | 6  | 6  | 7  | 8  | 8  | 10 | 10 |
| line, may stay   | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9  | 10 | 11 | 12 | 13 | 14 | 15 |
| circle, may stay | 1 | ∞ | ∞ | ∞ | ∞ | ∞ | ∞ | ∞ | ∞  | ∞  | ∞  | ∞  | ∞  | ∞  | ∞  |

So: **13 caves → 12 days.** On the circle the pattern is par = 2·⌊(n−1)/2⌋. If the mouse is allowed
to stay put, the circle becomes impossible for n ≥ 3 (two openings can never outrun the regrowth).
With only one opening per day the circle is impossible for n ≥ 3 as well.

One readable optimal 12-day strategy for 13: the two cats stand one hole apart and leap three holes
a day. Open {1,3} {4,6} {7,9} {10,12} {1,3}, then turn around: {11,13} {8,10} {5,7} {2,4}, then
{8,10} {11,13} {1,3}. Caught on day 12. (There are many optimal strategies; the solver finds them all.)

## 2. Schrödinger's mouse: why it is not cheating

The mouse *is* the cloud. It is in every hole it could be in at once, and only commits to a
position when forced: when the cat has opened every hole in the cloud. The cat is playing against
the worst case, which is exactly what the original puzzle asks for ("how many days to be *sure*").

Two consequences that make this a good game mechanic:

- The game is fully deterministic. Every level has an exact par (the table above), so we can rate
  the player against it, with no luck involved.
- The player's only skill is reasoning about the cloud. If you can keep the cloud in your head, you
  win. If you can't, the game can show it to you (practice mode), which is how you learn.

If the cat catches the Schrödinger mouse in d days, that same sequence of openings catches *any*
real mouse in at most d days. A real mouse can only ever be caught sooner, by luck.

## 3. Rules, formally

Parameters per level: `n` holes, topology (circle by default, line as variant), `k` openings per day
(2 by default), mouse movement rule (must move, by default).

State: cloud ⊆ {1..n}. Start: cloud = all holes (mouse is everywhere). Day counter = 0.

Each round:

1. **Day.** Counter += 1. Cat picks `k` distinct holes and opens them.
   - If cloud ⊆ opened: the mouse collapses into one of the opened holes that was in the cloud
     (chosen at random, purely for show). **Caught on day = counter.**
   - Otherwise cloud := cloud − opened. The mouse "was never there".
2. **Night.** cloud := { neighbours of x : x ∈ cloud }. On a circle, neighbours wrap around.

Edge cases:

- n = 1: the mouse has no legal move, so it stays. Day 1 catch. Pure tutorial level.
- n = 2: left and right are the same hole; works out naturally with set semantics. One day.
- k is capped at n.

## 4. Decisions to discuss (my recommendation first)

**Topology.** Circle is the headline game, as in the puzzle. Line is an easy variant to add later
(it also allows the "may stay" rule, which is a nice twist: a line with a lazy mouse takes n−1 days).
Recommend: ship circle; keep line in the data model so it is a one-line change.

**Must move vs may stay.** Must move. Otherwise the circle is unsolvable (see table), and the parity
rhythm is the whole intellectual content of the puzzle.

**Openings per day.** Fixed at 2. One opening makes the circle impossible; three makes it too easy
to be interesting at small n. Could become a level parameter for large n later (e.g. 25 holes, 3 cats).

**Showing the cloud.** This is the main design lever. Three visibility modes:

- *Ghost mode*: every hole in the cloud shows a translucent mouse. You see exactly what the game
  knows. Perfect for learning; the player discovers the parity trick by watching.
- *Counter mode*: only the cloud size is shown ("the mouse is in 7 places"). Middle ground.
- *Blind mode*: nothing. You track the cloud in your head. The real challenge.

Recommend: level progression starts in ghost mode (n = 1..5), then the player can choose a mode
per level; stars are only awarded at full value in blind mode. A "peek" button in blind mode that
costs a star is a nice compromise.

**Level progression.** n = 1, 2, 3, ... up to 13 as the "boss", then free play with any n up to ~20.
Note from the table: even n has the same par as n−1 on the circle, so n = 4, 6, 8, ... feel like
"consolidation" levels rather than new challenges. We could skip even numbers in the campaign or
keep them as breathers. Recommend keeping them: they are where the player notices the pattern.

**Scoring.** Days taken vs par. 3 stars at par, 2 stars at par+2, 1 star for any catch. Show the
par after the level is finished (or before, as a target?). Recommend: show par before the level,
since the puzzle is "find a strategy that hits this number", not "guess the number".

**Undo.** Recommend no undo within a run (the cloud is the whole state, so undo makes it trivial to
brute-force by hand), but instant restart and a visible log of openings so far.

**Hints.** The solver is cheap enough to run in the browser for n ≤ 16 (2^16 states). Hint = "one of
these openings is optimal right now". Recommend: available, costs a star.

**Catch moment.** The collapse is the payoff and should feel like a measurement: ghosts flicker,
all but one vanish, the mouse appears in an opened hole. When the cat opens holes that were only
partly in the cloud, the ghost in those holes fades out with a message like "it was never here. Or
was it?" That is the moment the player feels the Schrödinger idea.

**Classical mouse (optional later).** A real randomly moving mouse as a contrast mode. It shows
that the Schrödinger mouse is the honest worst case, and lets casual players win by luck. Low priority.

## 5. Interface sketch

Single-page web app, one HTML file, no build step, no backend. Runs from the file system or any
static host, works on phone and desktop.

- Holes arranged on a circle, numbered. Cat sits in the middle. A sun/moon indicator shows day or
  night and the day counter.
- Tap/click two holes to select them (highlighted). Second selection opens them immediately, or there
  is an "Open" button; to be decided. Keyboard: digits (and letters for n > 9) plus Enter.
- Night transition is a short animation (ghosts spreading to neighbours in ghost mode).
- Sidebar: level, day counter, par, cloud size (if counter mode), log of openings, restart.
- Level select screen with stars per level and visibility mode chosen per attempt.

Alternative: a terminal version in Python first. Faster to make, but the ghost animation and
tap-to-open on a phone are where this game will shine, so I would go straight to HTML.

## 6. Proposed MVP

1. Core engine (cloud, day/night, catch) with the brute-force solver for par and hints.
2. Circle, k = 2, must move. Levels n = 1..13, free play to 20.
3. Ghost / counter / blind modes, stars, restart, opening log.
4. Catch and "never here" animations.

Later: line topology, may-stay rule, k as parameter, classical mouse, sharing a replay.

## 7. Questions for you

1. Circle only for now, or line as well from the start?
2. Should ghost mode be the default in early levels, or opt-in from the start?
3. Show par before or after a level?
4. Open on second tap, or an explicit Open button?
5. Any theming wishes? (Cute cartoon vs. minimalist diagram; Dutch or English text.)
6. Name: "Schrödinger's Mouse" / "Schrödingers Muis" / something else?

## 8. Decisions (18 Oct 2026)

Agreed and built into `index.html` (single file, no build step, open it in any browser):

- Circle only, mouse must move, two openings per day. Line topology and "may stay" are not in the
  code; they come back only if we try other shapes.
- Odd sizes only. Tutorial: 1, 3, 5 (random real mouse, ghosts shown), then 5 again with the
  Schrödinger mouse. Levels: 7, 9, 11, 13. Free play: 15, 17, 19, 21.
- Par is the formula 2·⌊(n−1)/2⌋ (n−1 for odd n). Verified by brute force up to 21 (par 20), so the
  solver is not needed in the browser. `solve.py` stays in the repo for later variants.
- Visibility per attempt: Ghosts (practice, no stars saved), Count, Blind. Tutorial is always ghosts.
- Scoring, first attempt: 3 stars at par, 2 at par + 2, 1 for any catch. A level ends in failure
  after twice par days. Best result per level is kept in localStorage.
- No undo, no hints. Restart button and R key. Opening log shown under the board.
- Catch: ghosts flicker and collapse into one hole; opened ghost holes fade with "It was never here.
  Or was it?". Blind and count modes only ever say "Empty." so nothing leaks.
- Open on second tap (no Open button). Keyboard: digits, two digits for n ≥ 10, Enter to commit a
  single digit, Escape to clear.
- English, cute cartoon (emoji cat and mice, day/night sky), name "Schrödinger's Mouse".

## 9. Second round (19 Oct 2026)

- Levels: Learn = 3 (real mouse), 3 (Schrödinger), 4 (Schrödinger), plus a card to the maths page.
  Play = 5, 7, 9, 11, 13 (boss), 15, 17, 19. Five is the first level that counts. 21 dropped so
  everything fits a 4×3 grid.
- Share: a Wordle-style line (one 🌙 per night, 🐭 or 💨 at the end) plus a replay link
  `/?r=<level>.<mode letter>.<openings>`. Opening the link offers "watch the run" (ghosts on,
  nothing saved) or "play it yourself".
- Post-mortem: after any run, "Show the ghosts" steps through the cloud per day. Hints stay out;
  this is only after the run.
- Feel: synthesised sounds (Web Audio, no files) with a mute toggle, vibration on phones that
  support it, the cat gets grumpier past par and panics near the limit, reduced-motion respected.
- Installable: manifest + service worker (network first, cache fallback). No app store involved.
- Backend (optional, degrades gracefully): likes (one per client per day), anonymous feedback
  (rate limited, last 1000 kept), gameplay counters per level/mode/day with a private stats page.
  Vercel Web Analytics for traffic. No per-player data anywhere.
- Preview image and icons for shared links and home screens.
