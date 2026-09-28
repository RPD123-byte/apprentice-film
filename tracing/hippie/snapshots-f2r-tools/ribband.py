# Ribbon band edges at sparse stations (measurement): along a hand-given spine, every STEP px, find each wanted
# band's run (>= 4 px) along the normal within [lo, hi] and output its two edge points (page px, rounded).
# Usage: ribband.py STEP lo hi BANDS x,y x,y ...    BANDS e.g. VPOYC  -> JSON {band: [[x_a,y_a,x_b,y_b], ...]}
import sys, json, numpy as np
idx = np.load('/Users/computer/rootline/apprentice-film/snapshots/f2r-meas/classidx.npy')
keys = ['cream', 'gold', 'orange', 'magenta', 'indigo', 'sky', 'ink', 'pinkL', 'lav', 'green', 'white', 'skin', 'brown', 'blue', 'teal', 'grey', 'yellow', 'peach', 'jacket']
short = dict(zip(keys, 'CYOPV._klgWsbBtrypj'))
alias = {'s': 'C', 'W': 'C', 'y': 'Y', 'p': 'O'}   # near classes that are the same ribbon ink here
H, W = idx.shape
STEP = float(sys.argv[1]); LO = int(sys.argv[2]); HI = int(sys.argv[3]); BANDS = sys.argv[4]
pts = [tuple(float(v) for v in a.split(',')) for a in sys.argv[5:]]
def cr(pts, per=40):
    n = len(pts); out = []
    P = lambda i: pts[max(0, min(n - 1, i))]
    for i in range(n - 1):
        p0, p1, p2, p3 = P(i - 1), P(i), P(i + 1), P(i + 2)
        for j in range(per):
            t = j / per; t2 = t * t; t3 = t2 * t
            out.append([0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3) for k in (0, 1)])
    out.append(list(pts[-1])); return np.array(out)
C = cr(pts); seg = np.linalg.norm(np.diff(C, axis=0), axis=1); S = np.concatenate([[0], np.cumsum(seg)])
res = {b: [] for b in BANDS}
s = 0.0
while s <= S[-1] + 1e-6:
    i = int(min(len(C) - 2, max(0, np.searchsorted(S, s) - 1)))
    u = (s - S[i]) / max(1e-6, seg[i]); p = C[i] + (C[i + 1] - C[i]) * u
    d = C[i + 1] - C[i]; d /= np.linalg.norm(d); n = np.array([-d[1], d[0]])
    seq = []
    for o in range(LO, HI + 1):
        q = p + n * o; x, y = int(round(q[0])), int(round(q[1]))
        c = short[keys[idx[y, x]]] if 0 <= x < W and 0 <= y < H else ' '
        seq.append(alias.get(c, c))
    j = 0; runs = []
    while j < len(seq):
        k = j
        while k < len(seq) and seq[k] == seq[j]: k += 1
        runs.append((seq[j], j + LO, k - 1 + LO)); j = k
    for b in BANDS:
        rr = [(a0, a1) for c, a0, a1 in runs if c == b and a1 - a0 + 1 >= 4]
        if rr:
            a0, a1 = max(rr, key=lambda r: r[1] - r[0])
            A = p + n * (a0 - 1.5); B = p + n * (a1 + 1.5)     # edges at the ink line centres
            res[b].append([round(s), round(A[0]), round(A[1]), round(B[0]), round(B[1])])
    s += STEP
print(json.dumps(res))
