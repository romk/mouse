#!/usr/bin/env node
// Stock the daily puzzles: node square/gen.js [days] [epoch]
// Writes square/puzzles.json: { epoch, days: [ { t: terms, n: squareCount }, ... ] }, one entry per day from the epoch.
// Existing entries are kept (so published days never change); only missing days are generated and appended.
'use strict';
const fs = require('fs'), path = require('path');
const peg = require('./peg.js');
const OUT = path.join(__dirname, 'puzzles.json');
const want = parseInt(process.argv[2] || '400', 10);
let stock = { epoch: process.argv[3] || '2026-10-10', days: [] };
if (fs.existsSync(OUT)) stock = JSON.parse(fs.readFileSync(OUT, 'utf8'));
const hist = {};
const t0 = Date.now();
for (let day = stock.days.length + 1; day <= want; day++) {
  let pick = null;
  for (let attempt = 0; attempt < 50 && !pick; attempt++) {
    const rng = peg.mulberry32(day * 7919 + attempt * 104729 + 97);
    const terms = peg.randomTerms(rng).map(([k, a, ph]) => [k, +a.toFixed(4), +ph.toFixed(4)]);
    const squares = peg.findSquares(peg.loopFromTerms(terms));
    const n = squares.length;
    if (n < 1 || n > 5 || n % 2 === 0) continue;                       // even counts mean a near-miss the solver is unsure about
    const minSide = Math.min(...squares.map(s => peg.dist(s.pts[0], s.pts[1]))) / peg.bbox(peg.loopFromTerms(terms)).diam;
    if (minSide < 0.12) continue;                                        // no squares too tiny to find by hand
    pick = { t: terms, n };
  }
  if (!pick) throw new Error('no puzzle for day ' + day);
  stock.days.push(pick); hist[pick.n] = (hist[pick.n] || 0) + 1;
}
fs.writeFileSync(OUT, JSON.stringify(stock));
const last = new Date(Date.parse(stock.epoch + 'T00:00:00Z') + (stock.days.length - 1) * 86400000).toISOString().slice(0, 10);
console.log(`stock: ${stock.days.length} days, ${stock.epoch} .. ${last}, generated ${Object.values(hist).reduce((a, b) => a + b, 0)} in ${((Date.now() - t0) / 1000).toFixed(1)} s, counts`, hist, `${(fs.statSync(OUT).size / 1024).toFixed(0)} KB`);
