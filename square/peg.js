// Square Peg: geometry, solver and loop generator. Shared by index.html and gen.js (Node).
// Frozen: puzzles.json stores loop terms, and the loop and its squares are recomputed from them with this code.
'use strict';
function mulberry32(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// ---------------- geometry ----------------
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
function segNearest(p, a, b){
  const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy;
  const t = L2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2));
  const q = [a[0] + t * dx, a[1] + t * dy];
  return { d: dist(p, q), t, q };
}
function loopNearest(pts, p){            // nearest point on the closed polyline
  let best = { d: Infinity }; const n = pts.length;
  for (let i = 0; i < n; i++){ const r = segNearest(p, pts[i], pts[(i + 1) % n]); if (r.d < best.d){ best = r; best.seg = i; } }
  return best;
}
function posOn(pts, h){ const a = pts[h.seg], b = pts[(h.seg + 1) % pts.length]; return [a[0] + h.t * (b[0] - a[0]), a[1] + h.t * (b[1] - a[1])]; }
function bbox(pts){ let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const p of pts){ x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); } return { x0, y0, x1, y1, diam: Math.hypot(x1 - x0, y1 - y0) }; }
function selfIntersects(pts){
  const n = pts.length;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++){
    if (i === 0 && j === n - 1) continue;
    const a = pts[i], b = pts[(i + 1) % n], c = pts[j], d = pts[(j + 1) % n];
    const d1 = cross(a, b, c), d2 = cross(a, b, d), d3 = cross(c, d, a), d4 = cross(c, d, b);
    if (((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0))) return true;
  }
  return false;
}
function rdp(pts, eps){
  if (pts.length < 3) return pts;
  let maxd = 0, idx = 0; const a = pts[0], b = pts[pts.length - 1];
  for (let i = 1; i < pts.length - 1; i++){ const d = segNearest(pts[i], a, b).d; if (d > maxd){ maxd = d; idx = i; } }
  if (maxd <= eps) return [a, b];
  return rdp(pts.slice(0, idx + 1), eps).slice(0, -1).concat(rdp(pts.slice(idx), eps));
}

// Square from two points. side: P,Q adjacent corners, sigma picks the side. diag: P,Q opposite corners.
function squareFrom(P, Q, mode, sigma){
  const dx = Q[0] - P[0], dy = Q[1] - P[1];
  if (mode === 'side'){ const r = [-sigma * dy, sigma * dx]; return [P, Q, [Q[0] + r[0], Q[1] + r[1]], [P[0] + r[0], P[1] + r[1]]]; }
  const c = [(P[0] + Q[0]) / 2, (P[1] + Q[1]) / 2], r = [-dy / 2, dx / 2];
  return [P, [c[0] + r[0], c[1] + r[1]], Q, [c[0] - r[0], c[1] - r[1]]];
}
function sqKey(sq, diam){
  const cx = (sq[0][0] + sq[1][0] + sq[2][0] + sq[3][0]) / 4, cy = (sq[0][1] + sq[1][1] + sq[2][1] + sq[3][1]) / 4;
  const side = dist(sq[0], sq[1]); let ang = Math.atan2(sq[1][1] - sq[0][1], sq[1][0] - sq[0][0]) % (Math.PI / 2); if (ang < 0) ang += Math.PI / 2;
  return { cx: cx / diam, cy: cy / diam, side: side / diam, ang };
}
function sameSquare(a, b){ // keys
  let da = Math.abs(a.ang - b.ang); da = Math.min(da, Math.PI / 2 - da);
  return Math.abs(a.cx - b.cx) < .03 && Math.abs(a.cy - b.cy) < .03 && Math.abs(a.side - b.side) < .03 && da < .06;
}

// Exact square with P on segment i, Q on segment j, R = Q + sg*rot(Q-P) on line k, S = P + sg*rot(Q-P) on line l.
function exactSquare(pts, i, j, k, l, sg){
  const n = pts.length, A0 = pts[i], A1 = pts[(i + 1) % n], B0 = pts[j], B1 = pts[(j + 1) % n], K0 = pts[k], K1 = pts[(k + 1) % n], L0 = pts[l], L1 = pts[(l + 1) % n];
  const ua = [A1[0] - A0[0], A1[1] - A0[1]], ub = [B1[0] - B0[0], B1[1] - B0[1]];
  const aff = (cP, cQ) => ({
    c: [cP * A0[0] + cQ * B0[0] - sg * (B0[1] - A0[1]), cP * A0[1] + cQ * B0[1] + sg * (B0[0] - A0[0])],
    s: [cP * ua[0] + sg * ua[1], cP * ua[1] - sg * ua[0]],
    t: [cQ * ub[0] - sg * ub[1], cQ * ub[1] + sg * ub[0]],
  });
  const lineEq = (f, P0, P1) => { const dx = P1[0] - P0[0], dy = P1[1] - P0[1]; return [dx * f.s[1] - dy * f.s[0], dx * f.t[1] - dy * f.t[0], -(dx * (f.c[1] - P0[1]) - dy * (f.c[0] - P0[0]))]; };
  const [a1, b1, c1] = lineEq(aff(0, 1), K0, K1), [a2, b2, c2] = lineEq(aff(1, 0), L0, L1);
  const det = a1 * b2 - a2 * b1; if (Math.abs(det) < 1e-12) return null;
  const s = (c1 * b2 - c2 * b1) / det, t = (a1 * c2 - a2 * c1) / det, e = 1e-6;
  if (s < -e || s > 1 + e || t < -e || t > 1 + e) return null;
  const P = [A0[0] + s * ua[0], A0[1] + s * ua[1]], Q = [B0[0] + t * ub[0], B0[1] + t * ub[1]];
  const r = [-sg * (Q[1] - P[1]), sg * (Q[0] - P[0])], R = [Q[0] + r[0], Q[1] + r[1]], S = [P[0] + r[0], P[1] + r[1]];
  const on = (X, P0, P1) => segNearest(X, P0, P1).d < 1e-7 * (1 + dist(P0, P1));
  if (!on(R, K0, K1) || !on(S, L0, L1)) return null;
  return [P, Q, R, S];
}
function sampleLoop(pts, m){
  const n = pts.length, L = pts.map((p, i) => dist(p, pts[(i + 1) % n])), total = L.reduce((a, b) => a + b, 0);
  const out = []; let seg = 0, acc = 0;
  for (let j = 0; j < m; j++){
    const d = total * j / m; while (acc + L[seg] < d){ acc += L[seg]; seg++; }
    const t = L[seg] ? (d - acc) / L[seg] : 0, a = pts[seg], b = pts[(seg + 1) % n];
    out.push({ p: [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])], seg });
  }
  return { samples: out, h: total / m };
}
function findSquares(pts, m = 500, minFrac = 0.05){
  const { samples, h } = sampleLoop(pts, m), n = pts.length, { diam } = bbox(pts);
  const cell = h * 1.5, grid = new Map(), ck = (x, y) => Math.floor(x / cell) * 73856093 ^ Math.floor(y / cell) * 19349663;
  samples.forEach((s, i) => { const k = ck(s.p[0], s.p[1]); (grid.get(k) || grid.set(k, []).get(k)).push(i); });
  const nearest = p => { let best = Infinity, bi = -1; const cx = Math.floor(p[0] / cell), cy = Math.floor(p[1] / cell);
    for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++){ const g = grid.get((cx + ox) * 73856093 ^ (cy + oy) * 19349663); if (!g) continue;
      for (const i of g){ const d = dist(samples[i].p, p); if (d < best){ best = d; bi = i; } } }
    return { d: best, i: bi }; };
  const tol = 1.5 * h, minSide = minFrac * diam, tried = new Set(), found = [];
  for (let a = 0; a < m; a++){ const p = samples[a].p, si = samples[a].seg;
    for (let b = a + 1; b < m; b++){ const q = samples[b].p, sj = samples[b].seg, dx = q[0] - p[0], dy = q[1] - p[1];
      if (Math.hypot(dx, dy) < minSide) continue;
      for (const sg of [1, -1]){
        const rx = -sg * dy, ry = sg * dx;
        const nr = nearest([q[0] + rx, q[1] + ry]); if (nr.d > tol) continue;
        const ns = nearest([p[0] + rx, p[1] + ry]); if (ns.d > tol) continue;
        const sk = samples[nr.i].seg, sl = samples[ns.i].seg;
        for (const k of [sk, (sk + 1) % n, (sk + n - 1) % n]) for (const l of [sl, (sl + 1) % n, (sl + n - 1) % n]){
          const key = (((si * n + sj) * n + k) * n + l) * 2 + (sg > 0 ? 1 : 0); if (tried.has(key)) continue; tried.add(key);
          const sq = exactSquare(pts, si, sj, k, l, sg); if (!sq) continue;
          if (dist(sq[0], sq[1]) < minSide) continue;
          const kk = sqKey(sq, diam); if (!found.some(f => sameSquare(f.key, kk))) found.push({ pts: sq, key: kk });
        }
      }
    }
  }
  return found;
}


// ---------------- loop generator ----------------
// A loop is r(th) = 1 + sum a_k cos(k th + ph_k), sampled at N points. terms = [[k, a, ph], ...]
const LOOP_N = 240;
function loopFromTerms(terms, n = LOOP_N){
  const pts = [];
  for (let i = 0; i < n; i++){ const th = 2 * Math.PI * i / n; let r = 1; for (const [k, a, ph] of terms) r += a * Math.cos(k * th + ph); pts.push([r * Math.cos(th), r * Math.sin(th)]); }
  return pts;
}
function randomTerms(rng){ const t = []; for (let k = 2; k < 8; k++) t.push([k, (0.08 + rng() * 0.42) / Math.pow(k, 0.9), rng() * 2 * Math.PI]); return t; }
// Seeded puzzle for a day number: the fallback when puzzles.json does not cover the day.
function seededPuzzle(day){
  for (let attempt = 0; attempt < 20; attempt++){
    const rng = mulberry32(day * 7919 + attempt * 104729 + 12345);
    const terms = randomTerms(rng), pts = loopFromTerms(terms), squares = findSquares(pts);
    if (squares.length >= 1 && squares.length <= 5) return { terms, pts, squares };
  }
  const terms = randomTerms(mulberry32(day)), pts = loopFromTerms(terms); return { terms, pts, squares: findSquares(pts) };
}

if (typeof module !== 'undefined') module.exports = { mulberry32, dist, segNearest, loopNearest, posOn, bbox, selfIntersects, rdp, squareFrom, sqKey, sameSquare, exactSquare, sampleLoop, findSquares, loopFromTerms, randomTerms, seededPuzzle, LOOP_N };
