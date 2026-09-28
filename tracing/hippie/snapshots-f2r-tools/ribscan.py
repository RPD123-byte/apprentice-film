# Ribbon band measurement: along a hand-given spine (Catmull-Rom through the points), at stations every STEP px,
# scan the normal from -R..+R and report, per station, the runs of palette classes (ink lines <= 5 px merged away).
# Usage: ribscan.py STEP R x,y x,y x,y ...   -> lines: s  x y  nx ny | class:start..end (normal offsets)
import sys, numpy as np
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/f2r-tools')
import cv2
idx = np.load('/Users/computer/rootline/apprentice-film/snapshots/f2r-meas/classidx.npy')
keys = ['cream', 'gold', 'orange', 'magenta', 'indigo', 'sky', 'ink', 'pinkL', 'lav', 'green', 'white', 'skin', 'brown', 'blue', 'teal', 'grey', 'yellow', 'peach', 'jacket']
short = {'cream': 'C', 'gold': 'Y', 'orange': 'O', 'magenta': 'P', 'indigo': 'V', 'sky': '.', 'ink': '_', 'pinkL': 'k', 'lav': 'l', 'green': 'g', 'white': 'W', 'skin': 's',
         'brown': 'b', 'blue': 'B', 'teal': 't', 'grey': 'r', 'yellow': 'y', 'peach': 'p', 'jacket': 'j'}
H, W = idx.shape
STEP = float(sys.argv[1]); R = int(sys.argv[2])
pts = [tuple(float(v) for v in a.split(',')) for a in sys.argv[3:]]
def cr(pts, per=40):
    n = len(pts); out = []
    P = lambda i: pts[max(0, min(n - 1, i))]
    for i in range(n - 1):
        p0, p1, p2, p3 = P(i - 1), P(i), P(i + 1), P(i + 2)
        for j in range(per):
            t = j / per; t2 = t * t; t3 = t2 * t
            out.append([0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3) for k in (0, 1)])
    out.append(list(pts[-1])); return np.array(out)
C = cr(pts)
seg = np.linalg.norm(np.diff(C, axis=0), axis=1); S = np.concatenate([[0], np.cumsum(seg)])
s = 0.0
while s <= S[-1]:
    i = min(len(C) - 2, np.searchsorted(S, s) - 1 if s > 0 else 0)
    u = (s - S[i]) / max(1e-6, seg[i]); p = C[i] + (C[i + 1] - C[i]) * u
    d = C[i + 1] - C[i]; d /= np.linalg.norm(d); n = np.array([-d[1], d[0]])
    seq = []
    for o in range(-R, R + 1):
        q = p + n * o; x, y = int(round(q[0])), int(round(q[1]))
        c = short[keys[idx[y, x]]] if 0 <= x < W and 0 <= y < H else ' '
        seq.append(c)
    # runs, merge short ink/other runs into neighbours
    runs = []; j = 0
    while j < len(seq):
        k = j
        while k < len(seq) and seq[k] == seq[j]: k += 1
        runs.append([seq[j], j - R, k - 1 - R]); j = k
    out = [f"{c}:{a}..{b}" for c, a, b in runs if (b - a + 1) >= 4 and c not in '_ ']
    print(f"s{s:6.1f}  p=({p[0]:.0f},{p[1]:.0f}) n=({n[0]:.2f},{n[1]:.2f}) | " + ' '.join(out))
    s += STEP
