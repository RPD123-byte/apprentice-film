# H beat glints (k54, 57, 58, 59): what is brighter than the glint-free H plate near the upright blade's tips,
# minus that frame's traced speed lines, traced as a small tone object. Measurement only.
import sys, json; sys.path.insert(0, '.')
from common import *
from tone import trace, npts
from track_lines import render_tracked
P = np.load('plateH.npy')
for k in (54, 57, 58, 59):
    u = U(k)
    d = json.load(open(f'out/lines_k{k:02d}.json'))
    ln = render_tracked([c[:5] + [c[5]] for c in d['lines']], soft=0) if d['lines'] else np.zeros_like(u)
    m = ((cv2.GaussianBlur(u, (0, 0), 1) - cv2.GaussianBlur(P, (0, 0), 1) > 30) & (ln < 20)).astype(np.uint8)
    box = np.zeros_like(m); cv2.circle(box, (600, 150), 130, 1, -1); m &= box
    n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    keep = np.zeros_like(m)
    for i in range(1, n):
        if st[i, 4] >= 25: keep[lab == i] = 1
    keep = cv2.dilate(keep, np.ones((3, 3), np.uint8))
    L = trace(u, keep, [30, 90, 160, 215], sigma=0.8, eps=0.5, min_area=3.0)
    json.dump([{'t': l['t'], 'v': l['v'], 'paths': [p.round(2).tolist() for p in l['paths']]} for l in L], open(f'out/glintH_k{k:02d}.json', 'w'))
    print(k, 'glint px', keep.sum(), 'pts', npts(L))
