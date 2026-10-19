"""Square Peg prototype: find all squares inscribed in a closed polyline.

Hybrid: sample the loop, try every sample pair as a square side, keep near hits,
then solve the exact 2x2 linear system on the four segments. Same algorithm as index.html.
Run: python3 solve.py [count] -> prints square counts for random loops and writes out/loops.svg
"""
import math, random, sys, os

# ---------- generator ----------
def loop_radial(rng, n=200):
    """Smooth star-shaped loop: r(th) = 1 + sum a_k cos(k th + ph_k)."""
    terms = [(k, rng.uniform(0.05, 0.22) / (k ** 0.7), rng.uniform(0, 2 * math.pi)) for k in range(2, 7)]
    pts = []
    for i in range(n):
        th = 2 * math.pi * i / n
        r = 1 + sum(a * math.cos(k * th + ph) for k, a, ph in terms)
        pts.append((r * math.cos(th), r * math.sin(th)))
    return pts

# ---------- geometry ----------
def seg_nearest(p, a, b):
    ax, ay = a; bx, by = b; px, py = p
    dx, dy = bx - ax, by - ay
    L2 = dx * dx + dy * dy
    t = 0 if L2 == 0 else max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / L2))
    qx, qy = ax + t * dx, ay + t * dy
    return math.hypot(px - qx, py - qy), t

class Grid:
    def __init__(self, samples, cell):
        self.cell = cell; self.g = {}
        for i, (x, y) in enumerate(samples):
            self.g.setdefault((int(x // cell), int(y // cell)), []).append(i)
        self.s = samples
    def nearest(self, p):
        cx, cy = int(p[0] // self.cell), int(p[1] // self.cell)
        best, bi = 1e9, -1
        for ox in (-1, 0, 1):
            for oy in (-1, 0, 1):
                for i in self.g.get((cx + ox, cy + oy), ()):
                    d = math.hypot(self.s[i][0] - p[0], self.s[i][1] - p[1])
                    if d < best: best, bi = d, i
        return best, bi

def sample_loop(pts, m):
    n = len(pts); L = [math.dist(pts[i], pts[(i + 1) % n]) for i in range(n)]
    total = sum(L); out = []; seg = 0; acc = 0.0
    for j in range(m):
        d = total * j / m
        while acc + L[seg] < d: acc += L[seg]; seg += 1
        t = (d - acc) / L[seg] if L[seg] else 0
        a, b = pts[seg], pts[(seg + 1) % n]
        out.append(((a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])), seg))
    return out, total / m

def exact_square(pts, i, j, k, l, sigma):
    """P on seg i (param s), Q on seg j (param t). R = Q + sigma*rot(Q-P) on line k, S = P + sigma*rot(Q-P) on line l.
    rot(x,y) = (-y, x). Returns (P,Q,R,S) or None."""
    n = len(pts)
    def seg(a): return pts[a], pts[(a + 1) % n]
    (A0, A1), (B0, B1), (K0, K1), (L0, L1) = seg(i), seg(j), seg(k), seg(l)
    ua = (A1[0] - A0[0], A1[1] - A0[1]); ub = (B1[0] - B0[0], B1[1] - B0[1])
    # D = Q - P = (B0 - A0) + t*ub - s*ua ; rot(D) = (-Dy, Dx)
    # R = Q + sg*rot(D): affine in (s,t): R = R0 + s*Rs + t*Rt
    def aff(base_const, cP, cQ):
        # point = cP*P + cQ*Q + sg*rot(Q-P) where P = A0 + s ua, Q = B0 + t ub
        sg = sigma
        c = (cP * A0[0] + cQ * B0[0] + sg * (-(B0[1] - A0[1])), cP * A0[1] + cQ * B0[1] + sg * (B0[0] - A0[0]))
        cs = (cP * ua[0] + sg * (ua[1]), cP * ua[1] + sg * (-ua[0]))     # d/ds: cP*ua + sg*rot(-ua) = cP*ua + sg*(ua_y, -ua_x)
        ct = (cQ * ub[0] + sg * (-ub[1]), cQ * ub[1] + sg * (ub[0]))      # d/dt: cQ*ub + sg*rot(ub)
        return c, cs, ct
    R = aff(0, 0, 1); S = aff(0, 1, 0)
    def line_eq(aff3, P0, P1):
        c, cs, ct = aff3; dx, dy = P1[0] - P0[0], P1[1] - P0[1]
        # cross(d, X - P0) = dx*(Xy-P0y) - dy*(Xx-P0x) = 0
        return (dx * cs[1] - dy * cs[0], dx * ct[1] - dy * ct[0], -(dx * (c[1] - P0[1]) - dy * (c[0] - P0[0])))
    a1, b1, c1 = line_eq(R, K0, K1); a2, b2, c2 = line_eq(S, L0, L1)
    det = a1 * b2 - a2 * b1
    if abs(det) < 1e-12: return None
    s = (c1 * b2 - c2 * b1) / det; t = (a1 * c2 - a2 * c1) / det
    eps = 1e-6
    if not (-eps <= s <= 1 + eps and -eps <= t <= 1 + eps): return None
    P = (A0[0] + s * ua[0], A0[1] + s * ua[1]); Q = (B0[0] + t * ub[0], B0[1] + t * ub[1])
    D = (Q[0] - P[0], Q[1] - P[1]); rot = (-sigma * D[1], sigma * D[0])
    Rp = (Q[0] + rot[0], Q[1] + rot[1]); Sp = (P[0] + rot[0], P[1] + rot[1])
    def on_seg(X, P0, P1):
        d, u = seg_nearest(X, P0, P1); return d < 1e-7 * (1 + math.dist(P0, P1))
    if not (on_seg(Rp, K0, K1) and on_seg(Sp, L0, L1)): return None
    return (P, Q, Rp, Sp)

def find_squares(pts, m=500, min_frac=0.05):
    samples, h = sample_loop(pts, m)
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    diam = math.hypot(max(xs) - min(xs), max(ys) - min(ys))
    grid = Grid([s for s, _ in samples], max(h * 1.5, 1e-9))
    tol = 1.5 * h; n = len(pts); found = {}; tried = set()
    for a in range(m):
        p, si = samples[a]
        for b in range(a + 1, m):
            q, sj = samples[b]
            dx, dy = q[0] - p[0], q[1] - p[1]
            if math.hypot(dx, dy) < min_frac * diam: continue
            for sigma in (1, -1):
                rx, ry = -sigma * dy, sigma * dx
                r = (q[0] + rx, q[1] + ry); s_ = (p[0] + rx, p[1] + ry)
                dr, ir = grid.nearest(r)
                if dr > tol: continue
                ds, is_ = grid.nearest(s_)
                if ds > tol: continue
                sk, sl = samples[ir][1], samples[is_][1]
                for k in (sk, (sk + 1) % n, (sk - 1) % n):
                    for l in (sl, (sl + 1) % n, (sl - 1) % n):
                        key = (si, sj, k, l, sigma)
                        if key in tried: continue
                        tried.add(key)
                        sq = exact_square(pts, si, sj, k, l, sigma)
                        if sq is None: continue
                        cx = sum(v[0] for v in sq) / 4; cy = sum(v[1] for v in sq) / 4
                        side = math.dist(sq[0], sq[1])
                        if side < min_frac * diam: continue
                        ang = (math.atan2(sq[1][1] - sq[0][1], sq[1][0] - sq[0][0]) % (math.pi / 2))
                        kk = (round(cx / diam, 3), round(cy / diam, 3), round(side / diam, 3), round(ang, 2))
                        found.setdefault(kk, sq)
    return list(found.values())

# ---------- output ----------
def svg(loops, path):
    W = 260; cols = 4; rows = (len(loops) + cols - 1) // cols
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W*cols}" height="{W*rows}" style="background:#fff7e6">']
    for idx, (pts, sqs) in enumerate(loops):
        ox, oy = (idx % cols) * W + W / 2, (idx // cols) * W + W / 2; sc = W / 3.2
        tr = lambda p: f'{ox + p[0]*sc:.1f},{oy - p[1]*sc:.1f}'
        out.append(f'<polygon points="{" ".join(tr(p) for p in pts)}" fill="none" stroke="#3a2a1a" stroke-width="2"/>')
        for c, sq in zip(['#ff8c42', '#2b8a3e', '#1971c2', '#e5484d', '#862e9c', '#f5b301', '#0ca678'], sqs):
            out.append(f'<polygon points="{" ".join(tr(p) for p in sq)}" fill="none" stroke="{c}" stroke-width="1.5"/>')
        out.append(f'<text x="{ox - W/2 + 8}" y="{oy - W/2 + 18}" font-family="sans-serif" font-size="14" fill="#8a7256">{len(sqs)} square{"s" if len(sqs)!=1 else ""}</text>')
    out.append('</svg>'); os.makedirs(os.path.dirname(path), exist_ok=True); open(path, 'w').write('\n'.join(out))

if __name__ == '__main__':
    N = int(sys.argv[1]) if len(sys.argv) > 1 else 40
    rng = random.Random(1); hist = {}; loops = []
    for i in range(N):
        pts = loop_radial(rng); sqs = find_squares(pts)
        hist[len(sqs)] = hist.get(len(sqs), 0) + 1
        if len(loops) < 12: loops.append((pts, sqs))
    print('count histogram:', dict(sorted(hist.items())))
    even = sum(v for k, v in hist.items() if k % 2 == 0)
    print(f'even counts: {even}/{N} (should be 0 or nearly so)')
    svg(loops, 'out/loops.svg'); print('wrote out/loops.svg')
