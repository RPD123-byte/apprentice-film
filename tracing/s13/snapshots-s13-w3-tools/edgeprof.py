# edgeprof.py OUT f [f2 ...]: mean value vs signed distance to the source's lit silhouette (outside +)
import cv2, numpy as np, sys
out = sys.argv[1]; fs = [int(x) for x in sys.argv[2:]]
acc = {}
for f in fs:
    r = cv2.imread(f'{out}/r{f}.png', 0).astype(np.float32); s = cv2.imread(f'/Users/computer/rootline/apprentice-film/snapshots/s13-w3-src/f{f}.png', 0).astype(np.float32)
    m = (cv2.GaussianBlur(s, (0, 0), 2) > 70).astype(np.uint8)
    # keep the largest component
    n, lab, st, _ = cv2.connectedComponentsWithStats(m); k = 1 + np.argmax(st[1:, 4]); m = (lab == k).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
    din = cv2.distanceTransform(m, cv2.DIST_L2, 5); dout = cv2.distanceTransform(1 - m, cv2.DIST_L2, 5)
    sd = np.where(m > 0, -din, dout)
    # restrict: y < 930 (bottom edge is the frame), outside the frame border
    valid = np.zeros_like(m, bool); valid[5:930, 5:2200] = True
    for a, b in [(-40, -25), (-25, -15), (-15, -8), (-8, -4), (-4, -2), (-2, 0), (0, 2), (2, 4), (4, 8), (8, 15), (15, 25), (25, 40), (40, 70), (70, 110), (110, 160)]:
        sel = valid & (sd >= a) & (sd < b)
        acc.setdefault((a, b), []).append((r[sel].mean(), s[sel].mean()))
print('dist band      render  source   diff')
for k, v in acc.items():
    v = np.array(v); print(f'{k[0]:4d}..{k[1]:4d}   {v[:,0].mean():6.1f}  {v[:,1].mean():6.1f}  {v[:,0].mean()-v[:,1].mean():+6.2f}')
