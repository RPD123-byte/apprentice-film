# annotate the long LSD segments of a source frame (ids) for manual association with the card's model lines
import sys, json, numpy as np, cv2
from common import frame
t = float(sys.argv[1]); out = sys.argv[2]; minlen = float(sys.argv[3]) if len(sys.argv) > 3 else 45
box = [int(v) for v in sys.argv[4:8]] if len(sys.argv) > 7 else [0, 0, 2206, 946]
g = frame(int(round(t * 25)))
g8 = np.clip(cv2.GaussianBlur(g, (0, 0), 1.0), 0, 255).astype(np.uint8)
L = cv2.createLineSegmentDetector(0).detect(g8)[0].reshape(-1, 4)
ln = np.hypot(L[:, 2] - L[:, 0], L[:, 3] - L[:, 1])
x0, y0, x1, y1 = box
k = (ln > minlen) & (np.minimum(L[:, 0], L[:, 2]) > x0) & (np.maximum(L[:, 0], L[:, 2]) < x1) & (np.minimum(L[:, 1], L[:, 3]) > y0) & (np.maximum(L[:, 1], L[:, 3]) < y1)
L = L[k]
# keep lines on or bordering the paper: one side must be bright paper (> 170 at 5 px) 
keep = []
for a, b, c, d in L:
    t_ = np.array([c - a, d - b]); t_ /= np.linalg.norm(t_); n_ = np.array([-t_[1], t_[0]])
    us = np.linspace(0.15, 0.85, 7)
    P = np.array([[a + (c - a) * u, b + (d - b) * u] for u in us])
    sa = [g[int(round(p[1] + n_[1] * 5)) % g.shape[0], int(round(p[0] + n_[0] * 5)) % g.shape[1]] for p in P]
    sb = [g[int(round(p[1] - n_[1] * 5)) % g.shape[0], int(round(p[0] - n_[0] * 5)) % g.shape[1]] for p in P]
    keep.append(max(np.median(sa), np.median(sb)) > 170)
L = L[np.array(keep, bool)]
vis = cv2.cvtColor(g8, cv2.COLOR_GRAY2BGR)
vis = (vis * 0.6).astype(np.uint8)
rngc = np.random.RandomState(3)
for i, (a, b, c, d) in enumerate(L):
    col = tuple(int(v) for v in rngc.randint(80, 255, 3))
    cv2.line(vis, (int(a), int(b)), (int(c), int(d)), col, 2)
    cv2.putText(vis, str(i), (int((a + c) / 2) + 3, int((b + d) / 2) - 3), 0, 0.55, col, 2)
cv2.imwrite(out, vis[y0:y1, x0:x1])
json.dump(L.round(1).tolist(), open(out + '.json', 'w'))
print(len(L))
