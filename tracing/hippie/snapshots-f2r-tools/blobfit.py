# Fit a union of circles to a class-region mask (measurement of a blobby shape as a few primitives).
# Usage: blobfit.py "classes" x0,y0,x1,y1 [--poly x,y;x,y;...] [--rmin 6] [--cover 0.97] [--close 5] [--max 60]
# classes: comma list of classmap names. Prints JSON [[cx,cy,r],...] and coverage stats.
import sys, json, numpy as np, cv2
keys = ['cream', 'gold', 'orange', 'magenta', 'indigo', 'sky', 'ink', 'pinkL', 'lav', 'green', 'white', 'skin', 'brown', 'blue', 'teal', 'grey', 'yellow', 'peach', 'jacket']
idx = np.load('/Users/computer/rootline/apprentice-film/snapshots/f2r-meas/classidx.npy')
a = sys.argv
cls = [keys.index(c) for c in a[1].split(',')]
x0, y0, x1, y1 = [int(v) for v in a[2].split(',')]
opt = lambda k, d: type(d)(a[a.index(k) + 1]) if k in a else d
rmin = opt('--rmin', 6.0); cover = opt('--cover', 0.97); close = opt('--close', 5); mx = opt('--max', 60)
M = np.isin(idx, cls).astype(np.uint8)
R = np.zeros_like(M); R[y0:y1, x0:x1] = 1
if '--poly' in a:
    P = np.array([[float(v) for v in p.split(',')] for p in a[a.index('--poly') + 1].split(';')], np.int32)
    R[:] = 0; cv2.fillPoly(R, [P], 1)
M = M * R
if close: M = cv2.morphologyEx(M, cv2.MORPH_CLOSE, np.ones((close, close), np.uint8))
M = cv2.morphologyEx(M, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
tot = M.sum(); rem = M.copy(); cov = np.zeros_like(M); circles = []
while len(circles) < mx:
    # largest inscribed circle in the full mask whose centre lies in the remaining area
    dt = cv2.distanceTransform(M, cv2.DIST_L2, 5)
    dt2 = dt * rem
    y, x = np.unravel_index(np.argmax(dt2), dt2.shape); r = dt2[y, x]
    if r < rmin: break
    circles.append([int(x), int(y), round(float(r) + 1.0, 1)])
    cv2.circle(cov, (int(x), int(y)), int(round(r + 1)), 1, -1)
    rem = M * (1 - cov)
    if 1 - rem.sum() / max(1, tot) > cover: break
got = (cov * M).sum() / max(1, tot); spill = (cov * (1 - M)).sum() / max(1, tot)
print(json.dumps(circles)); print(f"// {len(circles)} circles, cover {got:.3f}, spill {spill:.3f}", file=sys.stderr)
cv2.imwrite('/Users/computer/rootline/apprentice-film/snapshots/f2r-fit/blob-dbg.png', np.dstack([M * 120, cov * 200, rem * 255]))
