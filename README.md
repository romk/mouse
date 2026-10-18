# Schrödinger's Mouse

A mouse hides in a ring of holes and moves to a neighbouring hole every night.
Each day you open two holes. How quickly can you be *sure* to catch it?

Play it: https://mouse-alpha.vercel.app

- `index.html`: the whole game, one file, no build step.
- `DESIGN.md`: the puzzle, the rules, and the design decisions.
- `solve.py`: brute-force solver used to verify par for each board size.

## Credits

The game is a playable version of the classic "13 Caves and a Thief" brain teaser, a puzzle widely
reported as a Google interview question: a thief hides in one of thirteen caves arranged in a circle
and moves to a neighbouring cave every night; two police officers can search two caves a day. How
many days until they are sure to catch him? The idea came from an Instagram reel explaining that
puzzle. Write-ups of the original: [AfterAcademy](https://afteracademy.com/puzzle/13-caves-and-a-thief),
[CrazyForCode](http://www.crazyforcode.com/13-caves-thief-puzzle/).
