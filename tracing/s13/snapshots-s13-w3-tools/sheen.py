# sheen.py : the wing's bright vane streaks on the C hold (median 891-898, sigma 1.5 > THR inside the wing silhouette),
# each fitted as a tapered centre-line: points along its principal axis with the measured half-widths either side.
# Writes control points only (x, y, w per point + the streak's mean value).  -> data/sheen.json + dbg image
import cv2, numpy as np, json, sys
THRS = [float(x) for x in sys.argv[1].split(',')] if len(sys.argv) > 1 else [230, 226, 222]
S = np.median(np.stack([cv2.imread(f'/Users/computer/rootline/apprentice-film/snapshots/s13-w3-src/f{f}.png', 0) for f in range(891, 899)]), 0).astype(np.float32)
s = cv2.GaussianBlur(S, (0, 0), 1.5)
sil = json.load(open('/Users/computer/rootline/apprentice-film/snapshots/s13-w3-tools/data/silC.json'))
def mask(rings):
    m = np.zeros((946, 2206), np.uint8)
    for r in rings:
        t = np.zeros_like(m); p = np.array(r, np.float32).reshape(-1, 2); cv2.fillPoly(t, [np.round(p * 16).astype(np.int32)], 1, shift=4); m ^= t
    return m
wing = cv2.erode(mask(sil['wing']), np.ones((7, 7), np.uint8))
out = []; dbg = cv2.cvtColor((s * 0.6).astype(np.uint8), cv2.COLOR_GRAY2BGR); taken = np.zeros((946, 2206), np.uint8)
for THR in THRS:
  m = ((s > THR) & (wing > 0)).astype(np.uint8)
  m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
  n, lab, st, cen = cv2.connectedComponentsWithStats(m)
  for i in range(1, n):
    a = st[i, 4]
    if a < 35 or a > 4000: continue
    comp = lab == i
    if (taken[comp] > 0).mean() > 0.3: continue
    ys, xs = np.where(comp); P = np.stack([xs, ys], 1).astype(np.float64) + 0.5
    c = P.mean(0); U, Sv, Vt = np.linalg.svd(P - c, full_matrices=False); d = Vt[0]
    if d[0] < 0: d = -d
    nrm = np.array([-d[1], d[0]])
    t = (P - c) @ d; q = (P - c) @ nrm
    L = t.max() - t.min(); W = q.max() - q.min()
    if L < 14 or L / max(W, 1) < 2.2: continue
    K = 7; pts = []
    for k in range(K):
        u = t.min() + L * k / (K - 1); sel = np.abs(t - u) < max(2.0, L / (2 * (K - 1)))
        if sel.sum() == 0: continue
        lo, hi = q[sel].min() - 0.5, q[sel].max() + 0.5
        mid = (lo + hi) / 2; w = hi - lo
        if k in (0, K - 1): w = 0.6
        p = c + d * u + nrm * mid; pts.append([round(float(p[0]), 1), round(float(p[1]), 1), round(float(w), 1)])
    v = float(S[comp].mean())
    out.append({'pts': pts, 'v': round(v, 1), 'area': int(a), 'thr': THR})
    taken[cv2.dilate(comp.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0] = 1
    for (x, y, w) in pts: cv2.circle(dbg, (int(x), int(y)), max(1, int(w / 2)), (0, 255, 255) if THR == THRS[0] else (0, 200, 0), 1)
json.dump(out, open('/Users/computer/rootline/apprentice-film/snapshots/s13-w3-tools/data/sheen.json', 'w'))
cv2.imwrite('/Users/computer/rootline/apprentice-film/snapshots/s13-w3-tools/sheen_dbg.jpg', dbg[220:760, 1480:2160])
print(len(out), 'streaks; total area', sum(o['area'] for o in out), 'mean v', np.mean([o['v'] for o in out]))
