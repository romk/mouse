#!/usr/bin/env node
// Stock the daily puzzles: node square/gen.js [days] [epoch]
// Writes square/puzzles.json: { epoch, days: [ { t: terms, n: squareCount }, ... ] }, one entry per day from the epoch.
// Existing entries are kept (so published days never change); only missing days are generated and appended.
// Generation is deterministic per day (seeded), so it is split over worker processes without changing the result.
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), { spawnSync } = require('child_process');
const peg = require('./peg.js');
const DECOY = 0.05;   // smallest allowed free-corner miss of any near-square, fraction of the diameter (well above the 2.5-3% play tolerance in index.html)
const OUT = path.join(__dirname, 'puzzles.json');

function generate(day){
  for (let attempt = 0; attempt < 400; attempt++) {
    const rng = peg.mulberry32(day * 7919 + attempt * 104729 + 97);
    const terms = peg.randomTerms(rng).map(([k, a, ph]) => [k, +a.toFixed(4), +ph.toFixed(4)]);
    const pts = peg.loopFromTerms(terms), squares = peg.findSquares(pts), n = squares.length;
    if (n < 1 || n > 5 || n % 2 === 0) continue;                       // even counts mean a near-miss the solver is unsure about
    const minSide = Math.min(...squares.map(s => peg.dist(s.pts[0], s.pts[1]))) / peg.bbox(pts).diam;
    if (minSide < 0.12) continue;                                        // no squares too tiny to find by hand
    if (peg.decoyMiss(pts, squares, DECOY) < DECOY) continue;           // no near-squares a player could mistake for a real one
    return { t: terms, n, attempts: attempt + 1 };
  }
  throw new Error('no puzzle for day ' + day);
}

if (process.argv[2] === '--worker') {                                    // node gen.js --worker k jobs from to
  const [k, jobs, from, to] = process.argv.slice(3).map(Number);
  for (let day = from + k; day < to; day += jobs) process.stdout.write(JSON.stringify({ day, pick: generate(day) }) + '\n');
  process.exit(0);
}

const want = parseInt(process.argv[2] || '400', 10);
let stock = { epoch: process.argv[3] || '2026-10-10', days: [] };
if (fs.existsSync(OUT)) stock = JSON.parse(fs.readFileSync(OUT, 'utf8'));
const t0 = Date.now(), from = stock.days.length + 1, jobs = Math.max(1, Math.min(8, os.cpus().length - 1));
const picks = new Map();
if (from <= want) {
  const kids = [];
  for (let k = 0; k < jobs; k++) kids.push(require('child_process').spawn(process.execPath, [__filename, '--worker', k, jobs, from, want + 1], { stdio: ['ignore', 'pipe', 'inherit'] }));
  let pending = kids.length;
  for (const kid of kids) { let buf = '';
    kid.stdout.on('data', d => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { const { day, pick } = JSON.parse(buf.slice(0, i)); buf = buf.slice(i + 1); picks.set(day, pick); } });
    kid.on('exit', code => { if (code) { console.error('worker failed'); process.exit(1); } if (--pending === 0) finish(); }); }
} else finish();

function finish(){
  const hist = {}; let attempts = 0;
  for (let day = from; day <= want; day++) { const p = picks.get(day); if (!p) throw new Error('missing day ' + day); attempts += p.attempts; stock.days.push({ t: p.t, n: p.n }); hist[p.n] = (hist[p.n] || 0) + 1; }
  fs.writeFileSync(OUT, JSON.stringify(stock));
  const last = new Date(Date.parse(stock.epoch + 'T00:00:00Z') + (stock.days.length - 1) * 86400000).toISOString().slice(0, 10);
  const made = Object.values(hist).reduce((a, b) => a + b, 0);
  console.log(`stock: ${stock.days.length} days, ${stock.epoch} .. ${last}, generated ${made} (${made ? (attempts / made).toFixed(1) : 0} tries each) in ${((Date.now() - t0) / 1000).toFixed(1)} s, counts`, hist, `${(fs.statSync(OUT).size / 1024).toFixed(0)} KB`);
}
