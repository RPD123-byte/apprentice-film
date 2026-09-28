#!/usr/bin/env python3
# lower-body edge points of the source owl per frame, from the silhouette masks: from the body bottom upward, the run
# holding the body, until the wings join (width jump). Measurement only -> s26-fix2-meas/bodyedge.json {F: [[y, xl, xr]]}
import json, numpy as np, cv2
R = '/Users/computer/rootline/apprentice-film/snapshots'
d = json.load(open(f'{R}/s26-fix2-meas/cd0.json'))
def runs(row):
    xs = np.nonzero(row)[0]; out = []
    if len(xs) == 0: return out
    st = pv = xs[0]
    for x in xs[1:]:
        if x != pv + 1: out.append((st, pv)); st = x
        pv = x
    out.append((st, pv)); return out
res = {}
for F in range(2791, 2848):
    m = np.fromfile(f'{R}/s26b-meas/fit/m/{F}.bin', np.uint8).reshape(473, 1103)
    m = cv2.morphologyEx((cv2.resize(m, (2206, 946)) > 100).astype(np.uint8), cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    e = d[str(F)]['eyes']; my = (e[0][1] + e[1][1]) / 2
    B = d[str(F)]['body']; cx = B['x'] + (40 if F <= 2817 else -30)
    # bottom: lowest row with a run of >= 30 px within 150 px of cx
    yb = None
    for y in range(945, int(my), -1):
        rr = [r for r in runs(m[y]) if r[1] - r[0] >= 30 and abs((r[0] + r[1]) / 2 - cx) < 150]
        if rr: yb = y; break
    pts = []; prev = None; c = cx
    for y in range(yb, int(my) + 40, -4):
        rr = [r for r in runs(m[y]) if r[0] - 10 <= c <= r[1] + 10]
        if not rr: break
        r = rr[0]
        lim = 30 if yb - y < 40 else 16
        if prev and (prev[0] - r[0] > lim or r[1] - prev[1] > lim): break
        pts.append([y, int(r[0]), int(r[1])]); prev = r; c = (r[0] + r[1]) / 2
    res[F] = pts
    if F % 4 == 0: print(F, 'yb', yb, 'n', len(pts), pts[::3])
json.dump(res, open(f'{R}/s26-fix2-meas/bodyedge.json', 'w'))
