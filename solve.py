import itertools, sys
from collections import deque

def neighbors(x, n, circle, may_stay):
    out = set()
    if may_stay: out.add(x)
    if circle:
        out.add((x-1) % n); out.add((x+1) % n)
    else:
        if x-1 >= 0: out.add(x-1)
        if x+1 < n: out.add(x+1)
    return out

def solve(n, k, circle=True, may_stay=False):
    """Min worst-case days to catch; state = bitmask of possible mouse positions (cloud) at start of day."""
    full = (1 << n) - 1
    nb = [0]*n
    for x in range(n):
        m = 0
        for y in neighbors(x, n, circle, may_stay): m |= 1 << y
        nb[x] = m
    def night(mask):
        out = 0
        for x in range(n):
            if mask >> x & 1: out |= nb[x]
        return out
    checks = [sum(1 << c for c in combo) for combo in itertools.combinations(range(n), k)]
    # BFS from full cloud; a day is: remove checked; if empty -> caught (that day counts). else night.
    dist = {full: 0}
    parent = {}
    q = deque([full])
    while q:
        s = q.popleft()
        d = dist[s]
        for c in checks:
            rest = s & ~c
            if rest == 0:
                return d + 1, reconstruct(parent, s, full) + [c]
            nxt = night(rest)
            if nxt not in dist:
                dist[nxt] = d + 1
                parent[nxt] = (s, c)
                q.append(nxt)
    return None, None

def reconstruct(parent, s, full):
    path = []
    while s != full:
        s, c = parent[s]
        path.append(c)
    return path[::-1]

def fmt(c, n):
    return "{" + ",".join(str(i+1) for i in range(n) if c >> i & 1) + "}"

if __name__ == "__main__":
    for circle in (True, False):
        for may_stay in (False, True):
            print(f"\n== {'circle' if circle else 'line'}, mouse {'may stay' if may_stay else 'must move'} ==")
            for k in (1, 2):
                row = []
                for n in range(1, 17):
                    if k > n: row.append("-"); continue
                    d, _ = solve(n, k, circle, may_stay)
                    row.append(str(d) if d is not None else "x")
                print(f"k={k}: n=1..16 -> " + " ".join(f"{r:>3}" for r in row))
    print("\nOptimal line for 13 caves, circle, k=2, must move:")
    d, path = solve(13, 2, True, False)
    print(d, [fmt(c, 13) for c in path] if path else None)
    print("\nOptimal for 13 caves, circle, k=2, may stay:")
    d, path = solve(13, 2, True, True)
    print(d, [fmt(c, 13) for c in path] if path else None)
