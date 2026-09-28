# dustfit.py: the dust cloud per source frame (58.16–58.92) as a few circles (greedy largest inscribed circles on the
# cloud's measured region), printed as a JS table. Only centres and radii are kept.
import re, json, numpy as np, cv2
src = open('../../src/shots/s19/dustdata.js').read()
D = {}
for m in re.finditer(r'"([\d.]+)": (\[\[.*?\]\])', src): D[m.group(1)] = json.loads(m.group(2))
out = {}
for k, pieces in D.items():
    M = np.zeros((946, 2206), np.uint8)
    for p in pieces:
        a = np.array(p, np.int32).reshape(-1, 2); cv2.fillPoly(M, [a], 1)
    area = M.sum(); circles = []; cov = np.zeros_like(M)
    R = M.copy()
    for it in range(9):
        dt = cv2.distanceTransform(R, cv2.DIST_L2, 5)
        y, x = np.unravel_index(np.argmax(dt), dt.shape); r = dt[y, x]
        if r < 9: break
        circles.append([int(x), int(y), round(float(r) * 1.08, 1)])
        cv2.circle(cov, (int(x), int(y)), int(r * 1.08), 1, -1)
        cv2.circle(R, (int(x), int(y)), int(r * 0.85), 0, -1)
        if (cov & M).sum() > 0.9 * area: break
    iou = (cov & M).sum() / max(1, (cov | M).sum())
    out[k] = circles
    print(k, len(circles), 'IoU %.2f' % iou)
print('export const PUFFS = {')
for k, c in out.items(): print(f'  "{k}": {json.dumps(c)},')
print('};')
